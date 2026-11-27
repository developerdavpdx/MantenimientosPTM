-- ============================================================================
-- 2026-11-27 | Schema: PTM_2022_FINAL
-- Caso especial: OTMC-074 quedo sin HORA_INICIO y sin DURACION_HRS.
--
-- El backfill general (20261127_CORRECTIVOS_BACKFILL_HORA_INICIO_*) no la pudo
-- tocar: sin duracion no hay ventana que reconstruir. La caratula muestra
-- 12:33 porque, cuando HORA_INICIO viene vacia, el portal precarga la HORA DE
-- APERTURA como valor por defecto (no es la hora capturada por el tecnico).
--
-- Referencia disponible: apertura 20/11/2026 12:33:14 y fin 12:46 -> 13 min.
-- La regla del portal compara en minutos, por lo que la duracion es 0.22 h.
-- La OT esta cerrada con las 2 firmas, asi que el portal no permite editarla.
--
-- Aplicado por el usuario el 2026-11-27. Resultado: 1 fila (12:33 -> 12:46,
-- 0.22 h).
-- ============================================================================

-- 1) Respaldo de la fila.
CREATE TABLE "PTM_2022_FINAL"."TMP_BAK_OTMC074_20261127" AS (
    SELECT * FROM "PTM_2022_FINAL"."PdxMTTOOrdenesTrabajoMC"
     WHERE "NUMERO_ORDEN" = 'OTMC-074'
);

-- 2) Correccion.
UPDATE "PTM_2022_FINAL"."PdxMTTOOrdenesTrabajoMC" OT
   SET "HORA_INICIO" = (
           SELECT MCG."HORA_APERTURA"
             FROM "PTM_2022_FINAL"."PdxMTTOMCGenerados" MCG
            WHERE MCG."NUMERO_ORDEN" = OT."NUMERO_ORDEN"
       ),
       "DURACION_HRS" = 0.22   -- 12:33 -> 12:46 (13 min), regla del portal
 WHERE OT."NUMERO_ORDEN" = 'OTMC-074'
   AND OT."HORA_INICIO" IS NULL
   AND OT."DURACION_HRS" IS NULL;

-- 3) Verificacion.
SELECT "NUMERO_ORDEN",
       TO_VARCHAR("HORA_INICIO", 'YYYY-MM-DD HH24:MI') AS INICIO,
       TO_VARCHAR("HORA_FIN",    'YYYY-MM-DD HH24:MI') AS FIN,
       "DURACION_HRS"
  FROM "PTM_2022_FINAL"."PdxMTTOOrdenesTrabajoMC"
 WHERE "NUMERO_ORDEN" = 'OTMC-074';

-- 4) ROLLBACK (si hiciera falta).
-- UPDATE "PTM_2022_FINAL"."PdxMTTOOrdenesTrabajoMC"
--    SET "HORA_INICIO" = NULL, "DURACION_HRS" = NULL
--  WHERE "NUMERO_ORDEN" = 'OTMC-074';
