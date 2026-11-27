-- ============================================================================
-- 2026-11-27 | Schema: TEST_JUNIO_2026
-- Backfill de HORA_INICIO en correctivos capturados antes del fix del 20/11/2026.
--
-- Causa: el defecto guardaba HORA_INICIO en NULL. La duracion y la hora fin si
-- se guardaron. El portal calcula DURACION_HRS = HORA_FIN - HORA_INICIO (campo
-- de solo lectura), por lo que el inicio se puede reconstruir:
--
--     HORA_INICIO = HORA_FIN - DURACION_HRS
--
-- Alcance: OT de PdxMTTOOrdenesTrabajoMC con HORA_INICIO nula y HORA_FIN
-- capturada. En TEST el volumen es menor: confirmar con el bloque 2 antes de
-- aplicar. Las que no tengan duracion no se tocan (no hay de donde reconstruir).
-- ============================================================================

-- 1) Respaldo de las filas afectadas (antes de tocar nada).
CREATE TABLE "TEST_JUNIO_2026"."TMP_BAK_HORA_INICIO_20261127" AS (
    SELECT * FROM "TEST_JUNIO_2026"."PdxMTTOOrdenesTrabajoMC"
     WHERE "HORA_INICIO" IS NULL
       AND "HORA_FIN" IS NOT NULL
);

-- 2) Antes.
SELECT COUNT(*) AS SIN_INICIO_CON_FIN
  FROM "TEST_JUNIO_2026"."PdxMTTOOrdenesTrabajoMC"
 WHERE "HORA_INICIO" IS NULL
   AND "HORA_FIN" IS NOT NULL;

-- 3) Backfill: solo las que tienen duracion.
UPDATE "TEST_JUNIO_2026"."PdxMTTOOrdenesTrabajoMC"
   SET "HORA_INICIO" = ADD_SECONDS(
           "HORA_FIN",
           -TO_INTEGER(ROUND(IFNULL("DURACION_HRS", 0) * 3600))
       )
 WHERE "HORA_INICIO" IS NULL
   AND "HORA_FIN" IS NOT NULL
   AND "DURACION_HRS" IS NOT NULL;

-- 4) Despues: solo deberian quedar las que no tienen duracion.
SELECT COUNT(*) AS SIN_INICIO_CON_FIN
  FROM "TEST_JUNIO_2026"."PdxMTTOOrdenesTrabajoMC"
 WHERE "HORA_INICIO" IS NULL
   AND "HORA_FIN" IS NOT NULL;

-- 4.1) Detalle de las que quedaron pendientes (sin duracion).
SELECT "NUMERO_ORDEN",
       TO_VARCHAR("HORA_FIN", 'YYYY-MM-DD HH24:MI') AS HORA_FIN,
       "DURACION_HRS"
  FROM "TEST_JUNIO_2026"."PdxMTTOOrdenesTrabajoMC"
 WHERE "HORA_INICIO" IS NULL
   AND "HORA_FIN" IS NOT NULL
 ORDER BY "NUMERO_ORDEN";

-- 4.2) Muestra del resultado.
SELECT "NUMERO_ORDEN",
       TO_VARCHAR("HORA_INICIO", 'YYYY-MM-DD HH24:MI') AS INICIO_RECONSTRUIDO,
       TO_VARCHAR("HORA_FIN",    'YYYY-MM-DD HH24:MI') AS HORA_FIN,
       "DURACION_HRS",
       "FIRMA_REALIZO",
       "FIRMA_SUPERVISO"
  FROM "TEST_JUNIO_2026"."PdxMTTOOrdenesTrabajoMC"
 WHERE "ID_OT_DETALLE" IN (
       SELECT "ID_OT_DETALLE"
         FROM "TEST_JUNIO_2026"."TMP_BAK_HORA_INICIO_20261127"
 )
 ORDER BY "HORA_INICIO";

-- 5) OPCION MANUAL (NO EJECUTAR sin autorizacion): las que no tienen duracion.
-- UPDATE "TEST_JUNIO_2026"."PdxMTTOOrdenesTrabajoMC" OT
--    SET "HORA_INICIO" = (
--        SELECT MCG."HORA_APERTURA"
--          FROM "TEST_JUNIO_2026"."PdxMTTOMCGenerados" MCG
--         WHERE MCG."NUMERO_ORDEN" = OT."NUMERO_ORDEN"
--    )
--  WHERE OT."HORA_INICIO" IS NULL
--    AND OT."HORA_FIN" IS NOT NULL
--    AND OT."DURACION_HRS" IS NULL;

-- 6) ROLLBACK.
-- UPDATE "TEST_JUNIO_2026"."PdxMTTOOrdenesTrabajoMC"
--    SET "HORA_INICIO" = NULL
--  WHERE "ID_OT_DETALLE" IN (
--        SELECT "ID_OT_DETALLE"
--          FROM "TEST_JUNIO_2026"."TMP_BAK_HORA_INICIO_20261127"
--  );
