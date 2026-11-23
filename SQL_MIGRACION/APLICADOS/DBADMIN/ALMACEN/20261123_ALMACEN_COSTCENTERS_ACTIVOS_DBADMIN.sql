-- Almacén: los dropdowns de centros de costos solo ofrecen centros ACTIVOS.
-- Causa: SpPdxMTTOGetCostCenters devolvia tambien centros con Active = 'N'
-- (p. ej. PPEA "CODIGO ERRONEO" en la dimension 2).
-- NOTA: la tabla OPRC va CALIFICADA con el schema para que el ALTER no dependa
-- del currentSchema del usuario que lo ejecuta (en on-premise fallaba con
-- "invalid table name: OPRC" y el SP se quedaba sin cambios).
CREATE OR REPLACE PROCEDURE "DBADMIN"."SpPdxMTTOGetCostCenters"(
    IN P_DIMCODE INT
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN
    SELECT "PrcCode", "PrcName", "DimCode"
    FROM "DBADMIN"."OPRC"
    WHERE "DimCode" = :P_DIMCODE
      AND "Active" = 'Y'
    ORDER BY "PrcCode";
END;
