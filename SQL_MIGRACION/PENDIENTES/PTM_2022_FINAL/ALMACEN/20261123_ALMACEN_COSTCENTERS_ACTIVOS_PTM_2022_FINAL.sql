-- Fix 2026-11-23: los dropdowns de centros de costos solo deben ofrecer
-- centros ACTIVOS en SAP; antes incluian centros con Active = 'N'
-- (p. ej. PPEA "CODIGO ERRONEO" en la dimension 2).
ALTER PROCEDURE "PTM_2022_FINAL"."SpPdxMTTOGetCostCenters"(
    IN P_DIMCODE INT
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN
    SELECT "PrcCode", "PrcName", "DimCode"
    FROM "OPRC"
    WHERE "DimCode" = :P_DIMCODE
      AND "Active" = 'Y'
    ORDER BY "PrcCode";
END;
