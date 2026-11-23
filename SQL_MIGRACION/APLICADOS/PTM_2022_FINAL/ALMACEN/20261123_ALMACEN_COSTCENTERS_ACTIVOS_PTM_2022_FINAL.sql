-- Fix 2026-11-23: los dropdowns de centros de costos solo deben ofrecer
-- centros ACTIVOS en SAP; antes incluian centros con Active = 'N'
-- (p. ej. PPEA "CODIGO ERRONEO" en la dimension 2).
-- La tabla OPRC va CALIFICADA con el schema para que el ALTER no dependa del
-- currentSchema del usuario que lo ejecuta.
ALTER PROCEDURE "PTM_2022_FINAL"."SpPdxMTTOGetCostCenters"(
    IN P_DIMCODE INT
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN
    SELECT "PrcCode", "PrcName", "DimCode"
    FROM "PTM_2022_FINAL"."OPRC"
    WHERE "DimCode" = :P_DIMCODE
      AND "Active" = 'Y'
    ORDER BY "PrcCode";
END;
