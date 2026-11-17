SET SCHEMA "TEST_JUNIO_2026";

-- ============================================================
-- PREVENTIVOS - GUARDADO DE RUTINA ATOMICO (TEST)
-- Schema: TEST_JUNIO_2026
-- Fecha: 2026-11-17
--
-- IMPORTANTE:
--   En on-premise CREATE OR REPLACE PROCEDURE no funciona.
--   Si el SP ya existe (caso normal), usar este ALTER PROCEDURE.
--   Si NO existiera, quitar la palabra ALTER y usar CREATE PROCEDURE.
--
-- Cambios vs version anterior:
--   * El header ya no usa IF EXISTS / INSERT / UPDATE.
--   * Ahora usa un solo MERGE por ID_MANTENIMIENTO.
--   * El contrato del SP (parametros y resultado) no cambia.
-- ============================================================

ALTER PROCEDURE "TEST_JUNIO_2026"."SpPdxMTTOGuardarRutinaMP" (
    IN P_ID_MANTENIMIENTO INTEGER,
    IN P_ID_EQUIPO INTEGER,
    IN P_COMENTARIOS NVARCHAR(2000),
    IN P_USUARIO_REGISTRO NVARCHAR(100),
    IN P_ID_OT_DETALLE NVARCHAR(50),
    IN P_ACTIVIDADES_JSON NCLOB
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN

    DECLARE V_ID_RUTINA INTEGER;
    DECLARE V_FECHA_MEXICO LONGDATE;

    DECLARE LT_ACTIVIDADES TABLE (
        ROWNUM      BIGINT,
        DESCRIPCION NVARCHAR(2000),
        COMPLETADA  NVARCHAR(2),
        ORDEN       INTEGER
    );

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SELECT
            'ERROR' AS "Estatus",
            ::SQL_ERROR_MESSAGE AS "Mensaje"
        FROM DUMMY;
    END;

    -- Fecha Mexico (UTC-6)
    SELECT ADD_SECONDS(CURRENT_UTCTIMESTAMP, -6*3600)
    INTO V_FECHA_MEXICO
    FROM DUMMY;

    -- ========================================
    -- 1) HEADER - MERGE atomico por ID_MANTENIMIENTO
    -- ========================================
    MERGE INTO "PdxMTTORutinasMP" AS T
    USING (
        SELECT :P_ID_MANTENIMIENTO AS ID_MANTENIMIENTO FROM DUMMY
    ) AS S
    ON T."ID_MANTENIMIENTO" = S.ID_MANTENIMIENTO

    WHEN MATCHED THEN
        UPDATE SET
            "ID_EQUIPO"        = :P_ID_EQUIPO,
            "COMENTARIOS"      = :P_COMENTARIOS,
            "USUARIO_REGISTRO" = :P_USUARIO_REGISTRO,
            "FECHA_ULT_MOD"    = :V_FECHA_MEXICO,
            "ID_OT_DETALLE"    = :P_ID_OT_DETALLE

    WHEN NOT MATCHED THEN
        INSERT (
            "ID_MANTENIMIENTO",
            "ID_EQUIPO",
            "COMENTARIOS",
            "USUARIO_REGISTRO",
            "FECHA_REALIZACION",
            "FECHA_CREACION",
            "FECHA_ULT_MOD",
            "ID_OT_DETALLE"
        )
        VALUES (
            :P_ID_MANTENIMIENTO,
            :P_ID_EQUIPO,
            :P_COMENTARIOS,
            :P_USUARIO_REGISTRO,
            :V_FECHA_MEXICO,
            :V_FECHA_MEXICO,
            :V_FECHA_MEXICO,
            :P_ID_OT_DETALLE
        );

    SELECT "ID_RUTINA"
    INTO V_ID_RUTINA
    FROM "PdxMTTORutinasMP"
    WHERE "ID_MANTENIMIENTO" = :P_ID_MANTENIMIENTO;

    -- ========================================
    -- 2) PARSEAR JSON
    -- ========================================
    LT_ACTIVIDADES = SELECT
        ROW_NUMBER() OVER (ORDER BY "numero") AS ROWNUM,
        "descripcion" AS DESCRIPCION,
        CASE
            WHEN "estado" = 'realizado'    THEN 'SI'
            WHEN "estado" = 'no_realizado' THEN 'NO'
            ELSE ''
        END AS COMPLETADA,
        "numero" AS ORDEN
    FROM JSON_TABLE(
        :P_ACTIVIDADES_JSON, '$[*]'
        COLUMNS(
            "numero"      INTEGER        PATH '$.numero',
            "descripcion" NVARCHAR(2000) PATH '$.descripcion',
            "estado"      NVARCHAR(50)   PATH '$.estado'
        )
    );

    -- ========================================
    -- 3) ACTIVIDADES - MERGE (INSERT o UPDATE)
    -- ========================================
    MERGE INTO "PdxMTTOActividadesRutinasMP" AS target
    USING (
        SELECT
            :V_ID_RUTINA           AS ID_RUTINA,
            ORDEN,
            LEFT(DESCRIPCION, 100) AS NOMBRE_ACTIVIDAD,
            DESCRIPCION,
            COMPLETADA
        FROM :LT_ACTIVIDADES
    ) AS source
    ON (
        target."ID_RUTINA" = source.ID_RUTINA
        AND target."ORDEN" = source.ORDEN
    )
    WHEN MATCHED THEN
        UPDATE SET
            target."NOMBRE_ACTIVIDAD" = source.NOMBRE_ACTIVIDAD,
            target."DESCRIPCION"      = source.DESCRIPCION,
            target."COMPLETADA"       = source.COMPLETADA
    WHEN NOT MATCHED THEN
        INSERT (
            "ID_RUTINA",
            "NOMBRE_ACTIVIDAD",
            "DESCRIPCION",
            "COMPLETADA",
            "OBSERVACIONES",
            "ORDEN",
            "FECHA_CREACION"
        )
        VALUES (
            source.ID_RUTINA,
            source.NOMBRE_ACTIVIDAD,
            source.DESCRIPCION,
            source.COMPLETADA,
            NULL,
            source.ORDEN,
            :V_FECHA_MEXICO
        );

    -- ========================================
    -- 4) RESPUESTA
    -- ========================================
    SELECT
        :V_ID_RUTINA AS "ID_RUTINA",
        'OK'         AS "Estatus",
        'Rutina guardada correctamente' AS "Mensaje"
    FROM DUMMY;

END;
