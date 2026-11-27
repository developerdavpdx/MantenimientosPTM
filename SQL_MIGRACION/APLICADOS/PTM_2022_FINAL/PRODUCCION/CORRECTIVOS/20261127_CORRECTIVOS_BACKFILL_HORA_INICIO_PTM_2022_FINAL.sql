-- ============================================================================
-- 2026-11-27 | Schema: PTM_2022_FINAL
-- Backfill de HORA_INICIO en correctivos capturados antes del fix del 20/11/2026.
--
-- Causa: el defecto guardaba HORA_INICIO en NULL. La duracion y la hora fin si
-- se guardaron. El portal calcula DURACION_HRS = HORA_FIN - HORA_INICIO (campo
-- de solo lectura), por lo que el inicio se puede reconstruir:
--
--     HORA_INICIO = HORA_FIN - DURACION_HRS
--
-- Alcance: todas las OT de PdxMTTOOrdenesTrabajoMC con HORA_INICIO nula y
-- HORA_FIN capturada. En PTM son 46; 44 tienen duracion y se reconstruyen.
-- Las 2 sin duracion (OTMC-074 y OTMC-081) NO se tocan: no hay de donde
-- reconstruir (el bloque 5 trae la opcion manual, comentada).
-- ============================================================================

-- 1) Respaldo de las filas afectadas (antes de tocar nada).
CREATE TABLE "PTM_2022_FINAL"."TMP_BAK_HORA_INICIO_20261127" AS (
    SELECT * FROM "PTM_2022_FINAL"."PdxMTTOOrdenesTrabajoMC"
     WHERE "HORA_INICIO" IS NULL
       AND "HORA_FIN" IS NOT NULL
);

-- 2) Antes: esperado 46.
SELECT COUNT(*) AS SIN_INICIO_CON_FIN
  FROM "PTM_2022_FINAL"."PdxMTTOOrdenesTrabajoMC"
 WHERE "HORA_INICIO" IS NULL
   AND "HORA_FIN" IS NOT NULL;

-- 3) Backfill: solo las que tienen duracion (esperado 44 filas).
UPDATE "PTM_2022_FINAL"."PdxMTTOOrdenesTrabajoMC"
   SET "HORA_INICIO" = ADD_SECONDS(
           "HORA_FIN",
           -TO_INTEGER(ROUND(IFNULL("DURACION_HRS", 0) * 3600))
       )
 WHERE "HORA_INICIO" IS NULL
   AND "HORA_FIN" IS NOT NULL
   AND "DURACION_HRS" IS NOT NULL;

-- 4) Despues: esperado 2 (OTMC-074 y OTMC-081, sin duracion).
SELECT COUNT(*) AS SIN_INICIO_CON_FIN
  FROM "PTM_2022_FINAL"."PdxMTTOOrdenesTrabajoMC"
 WHERE "HORA_INICIO" IS NULL
   AND "HORA_FIN" IS NOT NULL;

-- 4.1) Detalle de las que quedaron pendientes (sin duracion).
SELECT "NUMERO_ORDEN",
       TO_VARCHAR("HORA_FIN", 'YYYY-MM-DD HH24:MI') AS HORA_FIN,
       "DURACION_HRS"
  FROM "PTM_2022_FINAL"."PdxMTTOOrdenesTrabajoMC"
 WHERE "HORA_INICIO" IS NULL
   AND "HORA_FIN" IS NOT NULL
 ORDER BY "NUMERO_ORDEN";

-- 4.2) Muestra del resultado (inicio reconstruido vs fin y duracion).
SELECT "NUMERO_ORDEN",
       TO_VARCHAR("HORA_INICIO", 'YYYY-MM-DD HH24:MI') AS INICIO_RECONSTRUIDO,
       TO_VARCHAR("HORA_FIN",    'YYYY-MM-DD HH24:MI') AS HORA_FIN,
       "DURACION_HRS",
       "FIRMA_REALIZO",
       "FIRMA_SUPERVISO"
  FROM "PTM_2022_FINAL"."PdxMTTOOrdenesTrabajoMC"
 WHERE "ID_OT_DETALLE" IN (
       SELECT "ID_OT_DETALLE"
         FROM "PTM_2022_FINAL"."TMP_BAK_HORA_INICIO_20261127"
 )
 ORDER BY "HORA_INICIO";

-- 5) OPCION MANUAL (NO EJECUTAR sin autorizacion): las 2 sin duracion.
--    No hay forma de reconstruir el inicio; lo unico disponible es la hora de
--    apertura del sistema. Si negocio lo aprueba, se puede usar como referencia:
--
-- UPDATE "PTM_2022_FINAL"."PdxMTTOOrdenesTrabajoMC" OT
--    SET "HORA_INICIO" = (
--        SELECT MCG."HORA_APERTURA"
--          FROM "PTM_2022_FINAL"."PdxMTTOMCGenerados" MCG
--         WHERE MCG."NUMERO_ORDEN" = OT."NUMERO_ORDEN"
--    )
--  WHERE OT."HORA_INICIO" IS NULL
--    AND OT."HORA_FIN" IS NOT NULL
--    AND OT."DURACION_HRS" IS NULL;

-- 6) ROLLBACK (si algo sale mal): regresa a NULL solo las filas respaldadas.
-- UPDATE "PTM_2022_FINAL"."PdxMTTOOrdenesTrabajoMC"
--    SET "HORA_INICIO" = NULL
--  WHERE "ID_OT_DETALLE" IN (
--        SELECT "ID_OT_DETALLE"
--          FROM "PTM_2022_FINAL"."TMP_BAK_HORA_INICIO_20261127"
--  );
