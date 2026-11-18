CREATE PROCEDURE "DBADMIN"."SpPdxMTTOBuscarArticulos"(
    IN P_QUERY           NVARCHAR(100),
    IN P_USUARIO         NVARCHAR(100),
    IN P_PLANTA          NVARCHAR(50),
    IN P_LINEA           NVARCHAR(10),
    IN P_GRUPO_ART       SMALLINT,
    IN P_VALIDAR_CAP     SMALLINT,
    IN P_ITEMCODE        NVARCHAR(50),
    IN P_FABRICANTES     NVARCHAR(200) DEFAULT NULL
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
    -- OBTENER ALMACÉN
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
        
		A."validFor"												 AS "Estatus",
		
		A."FirmCode"												 AS "Fabricante",
		
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
    -- STOCK POR ALMACÉN
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
    -- FILTRO GRUPO ARTÍCULO
    ----------------------------------------------------------------
    AND
    (
        :P_GRUPO_ART IS NULL OR A."ItmsGrpCod" = :P_GRUPO_ART
    )
    
     ----------------------------------------------------------------
    -- FILTRO  ARTÍCULO
    ----------------------------------------------------------------
    AND
    (
        :P_ITEMCODE IS NULL OR A."ItemCode" = :P_ITEMCODE
    )
    
    ----------------------------------------------------------------
    -- FILTRO ARTÍCULOS ACTIVOS
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
    -- ORDENAMIENTO
    ----------------------------------------------------------------
    ORDER BY

        -- Mayor stock disponible primero
        (
            IFNULL(W."OnHand", 0)
            - IFNULL(W."IsCommited", 0)
        ) DESC,

        CASE
            WHEN UPPER(A."ItemName")
                LIKE UPPER(:P_QUERY) || '%'
            THEN 0
            ELSE 1
        END,

        CASE
            WHEN UPPER(A."ItemCode")
                LIKE UPPER(:P_QUERY) || '%'
            THEN 0
            ELSE 1
        END,

        A."ItemName",

        A."ItemCode"

    LIMIT 400;

END