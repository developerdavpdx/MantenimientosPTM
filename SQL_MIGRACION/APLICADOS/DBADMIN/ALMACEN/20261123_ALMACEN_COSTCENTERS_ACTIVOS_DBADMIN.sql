-- Almacén: los dropdowns de centros de costos solo ofrecen centros ACTIVOS.
-- Causa: SpPdxMTTOGetCostCenters devolvia tambien centros con Active = 'N'
-- (p. ej. PPEA "CODIGO ERRONEO" en la dimension 2).
-- Validado en portal (DBADMIN): el select de Proceso ya no lista PPEA.
CREATE OR REPLACE PROCEDURE "DBADMIN"."SpPdxMTTOGetCostCenters"(
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
