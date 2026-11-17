SET SCHEMA "DBADMIN";

-- ============================================================
-- PREVENTIVOS - TOKENS DE VERSION (HANA Cloud)
-- Schema: DBADMIN
-- Fecha: 2026-11-17
--
-- Devuelve el token (FECHA_ULT_MOD) de la OT y de su rutina.
-- El front lo guarda al abrir la OT y lo manda al guardar para
-- detectar si otro usuario modifico el registro mientras editaba.
-- ============================================================

CREATE OR REPLACE PROCEDURE "DBADMIN"."SpPdxMTTOObtenerTokensOT" (
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
