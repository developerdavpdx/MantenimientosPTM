-- ============================================================================
-- SpPdxMTTOBuscarArticulos  -  MIGRACION ON-PREMISE
-- Schema destino: TEST_JUNIO_2026
-- Fecha: 2026-11-18
--
-- ESTE SCRIPT INCLUYE LOS DOS CAMBIOS (aplicar UNA sola vez):
--   [1] INSUMOS      -> parametro P_GRUPOS_ART + filtro LIKE '%,<grupo>,%'
--   [2] ORDER BY     -> relevancia del texto por encima del stock (LIMIT 400 igual)
--
-- IMPORTANTE - LEER ANTES DE APLICAR
--   1. En on-premise NO existe CREATE OR REPLACE PROCEDURE: este script usa
--      ALTER PROCEDURE y reemplaza la definicion completa del objeto.
--   2. Antes de ejecutarlo, comparar el cuerpo de abajo contra la definicion
--      actual del schema destino:
--        SELECT DEFINITION FROM SYS.PROCEDURES
--         WHERE SCHEMA_NAME = 'TEST_JUNIO_2026'
--           AND PROCEDURE_NAME = 'SpPdxMTTOBuscarArticulos';
--      Si el on-premise trae logica adicional (columnas, joins o filtros que
--      no estan aqui), portar SOLO estos bloques:
--        - el parametro P_GRUPOS_ART,
--        - el bloque "FILTRO GRUPO(S) DE ARTICULO",
--        - el bloque "ORDENAMIENTO".
--   3. Si el SP no existiera en el schema destino, cambiar
--      ALTER PROCEDURE por CREATE PROCEDURE.
--
-- Cambio [1] INSUMOS:
--   + Nuevo parametro P_GRUPOS_ART NVARCHAR(100) DEFAULT NULL
--     Recibe una lista de grupos separada por comas, por ejemplo '102,104'.
--   * Retrocompatible: si P_GRUPOS_ART es NULL o cadena vacia, el filtro se
--     comporta EXACTAMENTE como antes (P_GRUPO_ART con "=" o sin filtro si
--     P_GRUPO_ART es NULL).
--
-- Cambio [2] ORDER BY / relevancia:
--   * Antes: stock DESC -> prefijo ItemName -> prefijo ItemCode -> nombre -> codigo.
--     Los INSUMOS (grupo 102) tienen StockTotal = 0 y quedaban fuera del LIMIT 400
--     (medido en DBADMIN: '12' -> 0 de 2 insumos; 'A' -> 0 de 67).
--   * Ahora: 1) coincidencia EXACTA de ItemCode/ItemName
--            2) coincidencia por PREFIJO de ItemCode/ItemName
--            3) intercalado por grupo (rank de stock dentro de su grupo)
--            4) stock disponible DESC
--            5) ItemName, ItemCode (desempate estable)
--     LIMIT 400 sin cambios.
--   * Sin cambios: parametros, filtros de grupo, joins y LIMIT.
--
-- Grupos (OITB): 101 MATERIAS PRIMAS, 102 INSUMOS, 103 EMPAQUE,
--                104 REFACCIONES, 105 EQUIPO PP, 107 HERRAMIENTAS
--
-- Rollback:
--   Estado previo al cambio [2]: SQL_ORIGINALES/SpPdxMTTOBuscarArticulos_ANTES_ORDERBY_20261118.sql
--   Estado previo al cambio [1]: SQL_ORIGINALES/SpPdxMTTOBuscarArticulos_ANTES_INSUMOS_20261118.sql
--   (ambos estan en schema DBADMIN; sustituir el nombre del schema al ejecutar)
-- ============================================================================
ALTER PROCEDURE "TEST_JUNIO_2026"."SpPdxMTTOBuscarArticulos"(
    IN P_QUERY           NVARCHAR(100),
    IN P_USUARIO         NVARCHAR(100),
    IN P_PLANTA          NVARCHAR(50),
    IN P_LINEA           NVARCHAR(10),
    IN P_GRUPO_ART       SMALLINT,
    IN P_VALIDAR_CAP     SMALLINT,
    IN P_ITEMCODE        NVARCHAR(50),
    IN P_FABRICANTES     NVARCHAR(200) DEFAULT NULL,
    IN P_GRUPOS_ART      NVARCHAR(100) DEFAULT NULL
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN

    DECLARE V_PLANTA_CAP NVARCHAR(2);
    DECLARE V_LINEA_CAP  NVARCHAR(2);
    DECLARE V_WHSCODE    NVARCHAR(10);

    ----------------------------------------------------------------
    -- NORMALIZAR PLANTA
    ----------------------------------------------------------------
    V_PLANTA_CAP := CASE
                        WHEN :P_PLANTA IS NULL
                          OR :P_PLANTA = ''
                            THEN NULL
                        ELSE LPAD(:P_PLANTA, 2, '0')
                    END;

    ----------------------------------------------------------------
    -- NORMALIZAR LINEA
    ----------------------------------------------------------------
    V_LINEA_CAP := CASE
                        WHEN :P_LINEA IS NULL
                          OR :P_LINEA = ''
                            THEN NULL
                        ELSE LPAD(:P_LINEA, 2, '0')
                   END;

    ----------------------------------------------------------------
    -- OBTENER ALMACEN
    ----------------------------------------------------------------
    V_WHSCODE := CASE :V_PLANTA_CAP
                    WHEN '01' THEN 'COR040'
                    WHEN '02' THEN 'P2040'
                    ELSE NULL
                 END;

    ----------------------------------------------------------------
    -- CONSULTA PRINCIPAL
    ----------------------------------------------------------------
    SELECT

        A."ItemCode"                                                 AS "CodigoArticulo",

        A."ItemName"                                                 AS "DescripcionArticulo",

        A."validFor"                                                 AS "Estatus",

        A."FirmCode"                                                 AS "Fabricante",

        CAP."U_PDX_PLANTA"                                           AS "Planta",

        CAP."U_PDX_LINEA"                                            AS "Linea",

        CAST(IFNULL(CAP."U_PDX_PZSXDIA", 0) AS DECIMAL(19,6))        AS "PzsDia",

        CAST(IFNULL(CAP."U_PDX_KGSXDIA", 0) AS DECIMAL(19,6))        AS "KgsDia",

        A."ItmsGrpCod"                                               AS "GrupoArt",

        CAST(IFNULL(A."U_PESO_MIN", 0) AS DECIMAL(19,6))             AS "PesoMinimo",

        CAST(IFNULL(A."U_PESO_MAX", 0) AS DECIMAL(19,6))             AS "PesoMaximo",

        IFNULL(W."OnHand", 0)                                        AS "StockTotal",

        IFNULL(W."IsCommited", 0)                                    AS "Comprometido",

        IFNULL(W."OnHand", 0)
        - IFNULL(W."IsCommited", 0)                                  AS "StockDisponible",

        W."WhsCode"

    FROM "OITM" A

    ----------------------------------------------------------------
    -- CAPACIDAD POR PLANTA / LINEA
    ----------------------------------------------------------------
    LEFT JOIN (

        SELECT *
        FROM (

            SELECT

                CAP.*,

                ROW_NUMBER() OVER(
                    PARTITION BY
                        CAP."U_PDX_CODART",
                        CAP."U_PDX_PLANTA",
                        CAP."U_PDX_LINEA"
                    ORDER BY CAP."Code"
                ) AS RN

            FROM "@PDX_CAPPROD" CAP

            WHERE
                (
                    :V_PLANTA_CAP IS NULL
                    OR CAP."U_PDX_PLANTA" = :V_PLANTA_CAP
                )
                AND (
                    :V_LINEA_CAP IS NULL
                    OR CAP."U_PDX_LINEA" = :V_LINEA_CAP
                )

        )

        WHERE RN = 1

    ) CAP
        ON TRIM(CAP."U_PDX_CODART")
           = TRIM(A."ItemCode")

    ----------------------------------------------------------------
    -- STOCK POR ALMACEN
    ----------------------------------------------------------------
    LEFT JOIN "OITW" W
        ON  W."ItemCode" = A."ItemCode"
        AND W."WhsCode"  = :V_WHSCODE

    ----------------------------------------------------------------
    -- FILTROS
    ----------------------------------------------------------------
    WHERE
    (
        :P_QUERY IS NULL
        OR :P_QUERY = ''
        OR UPPER(A."ItemCode")
            LIKE '%' || UPPER(:P_QUERY) || '%'
        OR UPPER(A."ItemName")
            LIKE '%' || UPPER(:P_QUERY) || '%'
    )

    ----------------------------------------------------------------
    -- FILTRO GRUPO(S) DE ARTICULO
    --   P_GRUPOS_ART (lista '102,104') tiene prioridad.
    --   Si viene vacia se usa P_GRUPO_ART (=) como antes.
    ----------------------------------------------------------------
    AND
    (
        (
            :P_GRUPOS_ART IS NOT NULL
            AND :P_GRUPOS_ART <> ''
            AND ',' || :P_GRUPOS_ART || ','
                LIKE '%,' || CAST(A."ItmsGrpCod" AS NVARCHAR(10)) || ',%'
        )
        OR
        (
            (
                :P_GRUPOS_ART IS NULL
                OR :P_GRUPOS_ART = ''
            )
            AND (
                :P_GRUPO_ART IS NULL
                OR A."ItmsGrpCod" = :P_GRUPO_ART
            )
        )
    )

     ----------------------------------------------------------------
    -- FILTRO  ARTICULO
    ----------------------------------------------------------------
    AND
    (
        :P_ITEMCODE IS NULL OR A."ItemCode" = :P_ITEMCODE
    )

    ----------------------------------------------------------------
    -- FILTRO ARTICULOS ACTIVOS
    ----------------------------------------------------------------
    AND A."validFor" = 'Y'

    ----------------------------------------------------------------
    -- FILTRO FABRICANTES (lista separada por comas desde WebConfig)
    ----------------------------------------------------------------
    AND
    (
        :P_FABRICANTES IS NULL
        OR :P_FABRICANTES = ''
        OR ',' || :P_FABRICANTES || ','
           LIKE '%,' || CAST(A."FirmCode" AS NVARCHAR(20)) || ',%'
    )
    ----------------------------------------------------------------
    -- ORDENAMIENTO  (relevancia del texto por encima del stock)
    --   1) Coincidencia EXACTA de ItemCode o ItemName
    --   2) Coincidencia por PREFIJO de ItemCode o ItemName
    --   3) Intercalado por grupo (stock rank dentro de su propio grupo)
    --   4) Stock disponible DESC
    --   5) Desempate estable: ItemName, ItemCode
    ----------------------------------------------------------------
    ORDER BY

        -- 1) Coincidencia exacta de codigo o descripcion
        CASE
            WHEN UPPER(A."ItemCode") = UPPER(:P_QUERY)
              OR UPPER(A."ItemName") = UPPER(:P_QUERY)
            THEN 0
            ELSE 1
        END,

        -- 2) Coincidencia por prefijo de codigo o descripcion
        CASE
            WHEN UPPER(A."ItemCode")
                LIKE UPPER(:P_QUERY) || '%'
              OR UPPER(A."ItemName")
                LIKE UPPER(:P_QUERY) || '%'
            THEN 0
            ELSE 1
        END,

        -- 3) Intercalado por grupo: mejor stock del grupo A, mejor del grupo B,
        --    2do del grupo A, 2do del grupo B, ...
        --    Evita que el grupo con stock (104) desplace al grupo sin stock (102).
        RANK() OVER (
            PARTITION BY A."ItmsGrpCod"
            ORDER BY
                (
                    IFNULL(W."OnHand", 0)
                    - IFNULL(W."IsCommited", 0)
                ) DESC,
                A."ItemName",
                A."ItemCode"
        ),

        -- 4) Mayor stock disponible primero (dentro del intercalado)
        (
            IFNULL(W."OnHand", 0)
            - IFNULL(W."IsCommited", 0)
        ) DESC,

        -- 5) Desempate estable
        A."ItemName",

        A."ItemCode"

    LIMIT 400;

END;
