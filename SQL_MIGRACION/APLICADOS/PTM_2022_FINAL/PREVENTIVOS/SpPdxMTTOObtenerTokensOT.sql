SET SCHEMA "PTM_2022_FINAL";

-- ============================================================
-- PREVENTIVOS - TOKENS DE VERSION (on-premise)
-- Schema: PTM_2022_FINAL
-- Fecha: 2026-11-17
--
-- Este SP es NUEVO. Si ya existe, cambiar CREATE por ALTER.
-- ============================================================

CREATE PROCEDURE "PTM_2022_FINAL"."SpPdxMTTOObtenerTokensOT" (
    IN P_ID_MANTENIMIENTO INTEGER
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN

    SELECT
        (SELECT TO_VARCHAR("FECHA_ULT_MOD", 'YYYYMMDDHH24MISSFF6')
           FROM "PdxMTTOOrdenesTrabajoMP"
          WHERE "ID_MANTENIMIENTO" = :P_ID_MANTENIMIENTO) AS "TOKEN_OT",

        (SELECT TO_VARCHAR("FECHA_ULT_MOD", 'YYYYMMDDHH24MISSFF6')
           FROM "PdxMTTORutinasMP"
          WHERE "ID_MANTENIMIENTO" = :P_ID_MANTENIMIENTO) AS "TOKEN_RUTINA",

        (SELECT COUNT(*)
           FROM "PdxMTTORutinasMP"
          WHERE "ID_MANTENIMIENTO" = :P_ID_MANTENIMIENTO) AS "RUTINA_EXISTE"

    FROM DUMMY;

END;
