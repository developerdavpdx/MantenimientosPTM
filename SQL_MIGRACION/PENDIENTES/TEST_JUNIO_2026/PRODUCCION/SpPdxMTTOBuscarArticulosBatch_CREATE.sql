-- ============================================================================
--  SpPdxMTTOBuscarArticulosBatch  -  TEST_JUNIO_2026
--  Fecha: 2026-11-19
--
--  SP batch que usa el modulo de Produccion (Tiempos Muertos / NWSCALE) para
--  resolver de una sola llamada: Codigo -> Linea, KgsDia y PesoMinimo.
--  Evita una llamada por fila a SpPdxMTTOBuscarArticulos.
--
--  IMPORTANTE: en TEST_JUNIO_2026 el SP NO existe (verificado con
--  SQL_MIGRACION/VERIFICACION/CHECK_SP_FALTANTES.sql), por eso se usa
--  CREATE PROCEDURE. En PTM_2022_FINAL y DBADMIN ya esta aplicado.
--
--  Ejecutar por bloques o con hdbsql (una sola sentencia).
-- ============================================================================

CREATE PROCEDURE "TEST_JUNIO_2026"."SpPdxMTTOBuscarArticulosBatch" (
    IN P_PLANTA NVARCHAR(50)
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN
    DECLARE V_PLANTA_CAP NVARCHAR(2);
    V_PLANTA_CAP := CASE
                        WHEN :P_PLANTA IS NULL OR :P_PLANTA = ''
                            THEN NULL
                        ELSE LPAD(:P_PLANTA, 2, '0')
                    END;

    SELECT "Codigo", "Linea", "KgsDia", "PesoMinimo"
    FROM (
        SELECT
            TRIM(CAP."U_PDX_CODART") AS "Codigo",
            CAP."U_PDX_LINEA" AS "Linea",
            CAST(IFNULL(CAP."U_PDX_KGSXDIA", 0) AS DECIMAL(19,6)) AS "KgsDia",
            CAST(IFNULL(A."U_PESO_MIN", 0) AS DECIMAL(19,6)) AS "PesoMinimo",
            ROW_NUMBER() OVER (
                PARTITION BY TRIM(CAP."U_PDX_CODART"), CAP."U_PDX_LINEA"
                ORDER BY CAP."Code"
            ) AS RN
        FROM "@PDX_CAPPROD" CAP
        INNER JOIN "OITM" A
            ON TRIM(CAP."U_PDX_CODART") = TRIM(A."ItemCode")
        WHERE (:V_PLANTA_CAP IS NULL OR CAP."U_PDX_PLANTA" = :V_PLANTA_CAP)
          AND A."validFor" = 'Y'
          AND CAP."U_PDX_CODART" IS NOT NULL
    )
    WHERE RN = 1;
END;

-- ============================================================================
--  VERIFICACION (opcional)
-- ============================================================================
-- CALL "TEST_JUNIO_2026"."SpPdxMTTOBuscarArticulosBatch"('1');
