-- ============================================================
-- PREVENTIVOS - BLINDAJE DE GUARDADO DE RUTINA (on-premise)
-- Schema: PTM_2022_FINAL
-- Fecha: 2026-11-17
--
-- Objetivo:
--   1) Eliminar rutinas duplicadas existentes (conserva la de menor ID_RUTINA)
--   2) Crear indices UNIQUE que impiden fisicamente el duplicado
--   3) El SP SpPdxMTTOGuardarRutinaMP se reemplaza aparte (MERGE atomico)
--
-- Aplicar en este orden:
--   a) Este script
--   b) PTM_2022_FINAL/SpPdxMTTOGuardarRutinaMP_ALTER.sql
--
-- NOTA: ejecutar UNA sola vez. Si los indices ya existen, CREATE UNIQUE INDEX fallara.
-- El bloque de limpieza es idempotente: si no hay duplicados no hace nada.
-- ============================================================

-- 1) Limpieza de rutinas duplicadas (header + actividades)
DO BEGIN
    DECLARE CURSOR C_DUP FOR
        SELECT "ID_RUTINA"
        FROM (
            SELECT "ID_RUTINA",
                   ROW_NUMBER() OVER (
                       PARTITION BY "ID_MANTENIMIENTO"
                       ORDER BY "ID_RUTINA" ASC
                   ) AS RN
            FROM "PTM_2022_FINAL"."PdxMTTORutinasMP"
        )
        WHERE RN > 1;

    FOR R AS C_DUP DO
        DELETE FROM "PTM_2022_FINAL"."PdxMTTOActividadesRutinasMP"
        WHERE "ID_RUTINA" = R."ID_RUTINA";

        DELETE FROM "PTM_2022_FINAL"."PdxMTTORutinasMP"
        WHERE "ID_RUTINA" = R."ID_RUTINA";
    END FOR;
END;

-- 2) Una sola rutina por mantenimiento
CREATE UNIQUE INDEX "UX_PdxMTTORutinasMP_IDMANT"
ON "PTM_2022_FINAL"."PdxMTTORutinasMP" ("ID_MANTENIMIENTO");

-- 3) Una sola OT (header) por mantenimiento.
--    El SP SpPdxMTTOInsertaOrdenTrabajoMP ya usa MERGE por ID_MANTENIMIENTO;
--    este indice cierra la carrera ante dos guardados simultaneos.
CREATE UNIQUE INDEX "UX_PdxMTTOOrdenesTrabajoMP_IDMANT"
ON "PTM_2022_FINAL"."PdxMTTOOrdenesTrabajoMP" ("ID_MANTENIMIENTO");

-- Verificacion:
-- SELECT "ID_MANTENIMIENTO", COUNT(*) FROM "PTM_2022_FINAL"."PdxMTTORutinasMP"
-- GROUP BY "ID_MANTENIMIENTO" HAVING COUNT(*) > 1;   -- debe devolver 0 filas
--
-- SELECT INDEX_NAME, INDEX_TYPE FROM SYS.INDEXES
-- WHERE SCHEMA_NAME = 'PTM_2022_FINAL'
--   AND INDEX_NAME IN ('UX_PdxMTTORutinasMP_IDMANT','UX_PdxMTTOOrdenesTrabajoMP_IDMANT');
