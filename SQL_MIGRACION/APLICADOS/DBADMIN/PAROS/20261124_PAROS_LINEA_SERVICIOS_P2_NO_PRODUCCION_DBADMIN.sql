-- 2026-11-24: catalogo de lineas, planta 2 -> la linea SERVICIOS estaba marcada
-- como PRODUCCION = 1, por eso seguia apareciendo en el reporte de Paros de
-- Produccion (el SP filtra por PdxMTTOLineasxPlanta.PRODUCCION = 1).
--
-- Cambios:
--   1) Respaldo del catalogo antes de tocar nada.
--   2) SERVICIOS (planta 2) pasa a PRODUCCION = 0.
--   3) Se dejan igual las lineas de produccion (LINEA n ...).
--
-- Rollback:
--   UPDATE "PdxMTTOLineasxPlanta" SET "PRODUCCION" = 1
--    WHERE "ID_LINEA" IN (SELECT "ID_LINEA" FROM "PdxMTTOLineasxPlanta_BAK_20261124");

CREATE TABLE "PdxMTTOLineasxPlanta_BAK_20261124" AS (
    SELECT * FROM "PdxMTTOLineasxPlanta" WHERE "PLANTA" = 2
);

-- @@

UPDATE "PdxMTTOLineasxPlanta"
   SET "PRODUCCION" = 0
 WHERE "PLANTA" = 2
   AND UPPER(TRIM("LINEA")) = 'SERVICIOS'
   AND "PRODUCCION" <> 0;

-- @@

-- Verificacion: lineas de planta 2 y su bandera
SELECT "ID_LINEA", "LINEA", "PRODUCCION", "STATUS"
  FROM "PdxMTTOLineasxPlanta"
 WHERE "PLANTA" = 2
 ORDER BY "ID_LINEA";
