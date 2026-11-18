CREATE OR REPLACE PROCEDURE "DBADMIN"."SpPdxMTTOBuscarArticulosBatch" (
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
