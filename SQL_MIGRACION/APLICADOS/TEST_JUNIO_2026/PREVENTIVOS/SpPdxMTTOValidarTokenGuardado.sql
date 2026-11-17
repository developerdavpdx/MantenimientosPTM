SET SCHEMA "TEST_JUNIO_2026";

-- ============================================================
-- PREVENTIVOS - VALIDACION DE TOKEN (TEST)
-- Schema: TEST_JUNIO_2026
-- Fecha: 2026-11-17
--
-- P_TIPO: 'RUTINA' | 'OT'
-- P_TOKEN:
--   NULL / ''  -> no valida (compatibilidad)
--   'NUEVO'    -> se espera que el registro NO exista
--   otro       -> token exacto devuelto por SpPdxMTTOObtenerTokensOT
--
-- Este SP es NUEVO. Si ya existe, cambiar CREATE por ALTER.
-- ============================================================

CREATE PROCEDURE "TEST_JUNIO_2026"."SpPdxMTTOValidarTokenGuardado" (
    IN P_ID_MANTENIMIENTO INTEGER,
    IN P_TIPO NVARCHAR(10),
    IN P_TOKEN NVARCHAR(50)
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN

    DECLARE V_TOKEN_ACTUAL NVARCHAR(50) = NULL;

    -- MAX(...) garantiza una fila aunque el registro no exista (devuelve NULL).
    IF UPPER(:P_TIPO) = 'RUTINA' THEN
        SELECT MAX(TO_VARCHAR("FECHA_ULT_MOD", 'YYYYMMDDHH24MISSFF6'))
        INTO V_TOKEN_ACTUAL
        FROM "PdxMTTORutinasMP"
        WHERE "ID_MANTENIMIENTO" = :P_ID_MANTENIMIENTO;
    ELSE
        SELECT MAX(TO_VARCHAR("FECHA_ULT_MOD", 'YYYYMMDDHH24MISSFF6'))
        INTO V_TOKEN_ACTUAL
        FROM "PdxMTTOOrdenesTrabajoMP"
        WHERE "ID_MANTENIMIENTO" = :P_ID_MANTENIMIENTO;
    END IF;

    IF :P_TOKEN IS NULL OR :P_TOKEN = '' THEN
        SELECT 'OK' AS "Estatus",
               V_TOKEN_ACTUAL AS "TOKEN_ACTUAL"
        FROM DUMMY;
    ELSE
        IF (:P_TOKEN = 'NUEVO' AND V_TOKEN_ACTUAL IS NOT NULL)
           OR (:P_TOKEN <> 'NUEVO' AND IFNULL(V_TOKEN_ACTUAL, '') <> :P_TOKEN) THEN
            SELECT 'CONFLICTO' AS "Estatus",
                   'La OT fue modificada por otro usuario. Cierra y vuelve a abrir la OT para ver los cambios mas recientes.' AS "Mensaje",
                   V_TOKEN_ACTUAL AS "TOKEN_ACTUAL"
            FROM DUMMY;
        ELSE
            SELECT 'OK' AS "Estatus",
                   V_TOKEN_ACTUAL AS "TOKEN_ACTUAL"
            FROM DUMMY;
        END IF;
    END IF;

END;
