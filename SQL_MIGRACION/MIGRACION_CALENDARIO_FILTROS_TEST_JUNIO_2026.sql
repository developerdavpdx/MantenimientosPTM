-- ============================================================================
-- MIGRACION: FILTROS DEL CALENDARIO + FUE_REPROGRAMADO
-- Schema: TEST_JUNIO_2026
-- Fecha: 05/11/2026
-- Objeto: SpPdxMTTOObtenerMantenimientosCompletados
--
-- Cambios:
--   + p_ORDEN_TRABAJO NVARCHAR(100)  -> filtro por orden de trabajo (LIKE)
--   + p_CLASIFICACION NVARCHAR(50)   -> MANTENIMIENTO | HERRAMENTALES
--   + p_EQUIPO NVARCHAR(100)         -> filtro por nombre de equipo (LIKE)
--   + FUE_REPROGRAMADO = 'SI' tambien cuando la solicitud esta en estatus NA
--
-- IMPORTANTE: usa ALTER PROCEDURE, el SP debe existir previamente en el schema.
-- ============================================================================
ALTER PROCEDURE "TEST_JUNIO_2026"."SpPdxMTTOObtenerMantenimientosCompletados"(

    IN p_TIPOMANT NVARCHAR(255),

    IN p_PROCESO INT,

    IN p_LINEAPROD INT,

    IN p_FECHA_INICIO DATE,

    IN p_FECHA_FIN DATE,

    IN p_PLANTA INT,

    -- Filtros nuevos (Calendario de Mantenimientos)
    IN p_ORDEN_TRABAJO NVARCHAR(100) DEFAULT NULL,

    IN p_CLASIFICACION NVARCHAR(50) DEFAULT NULL,

    IN p_EQUIPO NVARCHAR(100) DEFAULT NULL

)

LANGUAGE SQLSCRIPT

SQL SECURITY INVOKER

AS

BEGIN

    -- ========================================
    -- MANTENIMIENTOS PREVENTIVOS COMPLETADOS
    -- ========================================

    lt_preventivos_base =
        SELECT
            MP.ID_MANTENIMIENTO,
            MP.NUMERO_ORDEN,
            EQ.ID_EQUIPO,
            EQ.NOMBRE_EQUIPO,
            EQ.DESCRIPCION_EQUIPO,
            EQ.AREA,
            AP.AREA AS AREA_DESCRIPCION,
            EQ.LINEA_PRODUCCION,
            LP.LINEA AS LINEA_DESCRIPCION,
            'Preventivo' AS TIPO_MANTENIMIENTO,
            MP."HORA_APERTURA",
            MP.FECHA_INICIO_PERIODO AS FECHA_INICIO,
            MP.FECHA_FIN_PERIODO AS FECHA_FIN,
            CAST(MP.HORA_CIERRE AS DATE) AS FECHA_COMPLETADO,
            SR."FECHA_REAL_INICIO",
            SR."FECHA_REAL_FIN",
            SR."ENVIAR_SIGUIENTE_MES",
            SR."ESTATUS" AS ESTATUS_SOLICITUD,
            MP.ESTATUS AS ID_ESTATUS,
            CASE MP.ESTATUS
                WHEN 1 THEN 'Programado'
                WHEN 2 THEN 'En Proceso'
                WHEN 3 THEN 'Pausado'
                WHEN 4 THEN 'Terminado'
                ELSE 'Otro'
            END AS ESTATUS,
            CASE
                WHEN OT.ID_OT_DETALLE IS NOT NULL
                    AND OT.FIRMA_REALIZO       IS NOT NULL AND LENGTH(TRIM(OT.FIRMA_REALIZO))       > 0
                    AND OT.FIRMA_SUPERVISO     IS NOT NULL AND LENGTH(TRIM(OT.FIRMA_SUPERVISO))     > 0
                    AND OT.FIRMA_MANTENIMIENTO IS NOT NULL AND LENGTH(TRIM(OT.FIRMA_MANTENIMIENTO)) > 0
                THEN 'SI'
                ELSE 'NO'
            END AS ORDEN_TRABAJO_FINALIZADA,
            COALESCE(OT.SOLICITANTE, MP.USUARIO) AS SOLICITANTE,
            OT.UBICACION_TECNICA,
            OT.DURACION_HRS,
            '' AS TEXTO_CORTO,
            OT.TEXTO_SECUENCIA,
            IFNULL(OT.TECNICOS_ASIGNADOS, '') AS TECNICOS_IDS,
            CASE WHEN EXISTS (
                SELECT 1
                FROM "PdxMTTOSolicitudesReprogramacion" SR_REP
                WHERE SR_REP."NUMERO_ORDEN" = MP.NUMERO_ORDEN
                  AND SR_REP."ESTATUS" IN ('Aceptada', 'NA')
            ) THEN 'SI' ELSE 'NO' END AS FUE_REPROGRAMADO
        FROM "PdxMTTOMPGenerados" MP
        LEFT JOIN "PdxMTTOSolicitudesReprogramacion" SR
            ON SR.NUMERO_ORDEN = MP.NUMERO_ORDEN
        LEFT JOIN "PdxMTTOGestionEquipos" EQ
            ON EQ.ID_EQUIPO = MP.ID_EQUIPO
        LEFT JOIN "PdxMTTOOrdenesTrabajoMP" OT
            ON OT.ID_MANTENIMIENTO = MP.ID_MANTENIMIENTO
        LEFT JOIN "PdxMTTORutinasMP" RUT
            ON RUT.ID_MANTENIMIENTO = MP.ID_MANTENIMIENTO
        LEFT JOIN "PdxMTTOAreasxPlanta" AP
            ON AP.ID_AREA = EQ.AREA
        LEFT JOIN "PdxMTTOLineasxPlanta" LP
            ON LP.ID_LINEA = EQ.LINEA_PRODUCCION
        WHERE EQ."PLANTA" = :p_PLANTA
        AND (:p_PROCESO IS NULL OR EQ.Area = :p_PROCESO)
        AND (:p_LINEAPROD IS NULL OR EQ.LINEA_PRODUCCION = :p_LINEAPROD)
        AND (:p_FECHA_INICIO IS NULL
            OR :p_FECHA_FIN IS NULL
            OR (MP."HORA_APERTURA" BETWEEN :p_FECHA_INICIO AND :p_FECHA_FIN))
        -- Filtros nuevos
        AND (:p_ORDEN_TRABAJO IS NULL
            OR TRIM(:p_ORDEN_TRABAJO) = ''
            OR UPPER(MP.NUMERO_ORDEN) LIKE '%' || UPPER(TRIM(:p_ORDEN_TRABAJO)) || '%')
        AND (:p_CLASIFICACION IS NULL
            OR TRIM(:p_CLASIFICACION) = ''
            OR UPPER(TRIM(COALESCE(EQ.CLASIFICACION, ''))) = UPPER(TRIM(:p_CLASIFICACION)))
        AND (:p_EQUIPO IS NULL
            OR TRIM(:p_EQUIPO) = ''
            OR UPPER(EQ.NOMBRE_EQUIPO) LIKE '%' || UPPER(TRIM(:p_EQUIPO)) || '%');

    -- ========================================
    -- MANTENIMIENTOS CORRECTIVOS COMPLETADOS
    -- ========================================

    lt_correctivos_base =
        SELECT
            MCG.ID_MANTENIMIENTO,
            MCG.NUMERO_ORDEN,
            EQ.ID_EQUIPO,
            EQ.NOMBRE_EQUIPO,
            EQ.DESCRIPCION_EQUIPO,
            EQ.AREA,
            AP.AREA AS AREA_DESCRIPCION,
            EQ.LINEA_PRODUCCION,
            LP.LINEA AS LINEA_DESCRIPCION,
            'Correctivo' AS TIPO_MANTENIMIENTO,
            MCG."HORA_APERTURA",
            CAST(MCG.HORA_CIERRE AS DATE) AS FECHA_INICIO,
            CAST(MCG.HORA_CIERRE AS DATE) AS FECHA_FIN,
            CAST(MCG.HORA_CIERRE AS DATE) AS FECHA_COMPLETADO,
            SR."FECHA_REAL_INICIO",
            SR."FECHA_REAL_FIN",
            SR."ENVIAR_SIGUIENTE_MES",
            SR."ESTATUS" AS ESTATUS_SOLICITUD,
            MCG.ESTATUS AS ID_ESTATUS,
            CASE MCG.ESTATUS
                WHEN 1 THEN 'Programado'
                WHEN 2 THEN 'En Proceso'
                WHEN 3 THEN 'Pausado'
                WHEN 4 THEN 'Terminado'
                ELSE 'Otro'
            END AS ESTATUS,
            CASE
                WHEN OT.ID_OT_DETALLE IS NOT NULL
                    AND OT.FIRMA_REALIZO       IS NOT NULL AND LENGTH(TRIM(OT.FIRMA_REALIZO))       > 0
                    AND OT.FIRMA_SUPERVISO     IS NOT NULL AND LENGTH(TRIM(OT.FIRMA_SUPERVISO))     > 0
                THEN 'SI'
                ELSE 'NO'
            END AS ORDEN_TRABAJO_FINALIZADA,
            SOL.SOLICITANTE,
            OT.UBICACION_TECNICA,
            OT.DURACION_HRS,
            SOL.TEXTO_CORTO,
            OT.TEXTO_SECUENCIA,
            IFNULL(OT.TECNICOS_ASIGNADOS, '') AS TECNICOS_IDS,
            CASE WHEN EXISTS (
                SELECT 1
                FROM "PdxMTTOSolicitudesReprogramacion" SR_REP
                WHERE SR_REP."NUMERO_ORDEN" = MCG.NUMERO_ORDEN
                  AND SR_REP."ESTATUS" IN ('Aceptada', 'NA')
            ) THEN 'SI' ELSE 'NO' END AS FUE_REPROGRAMADO
        FROM "PdxMTTOMCGenerados" MCG
        LEFT JOIN "PdxMTTOSolicitudesReprogramacion" SR
            ON SR.NUMERO_ORDEN = MCG.NUMERO_ORDEN
        LEFT JOIN "PdxMTTOSolicitudMC" SOL
            ON SOL.ID_SOLICITUD = MCG.ID_SOLICITUD
        LEFT JOIN "PdxMTTOGestionEquipos" EQ
            ON EQ.ID_EQUIPO = SOL.ID_EQUIPO
        LEFT JOIN "PdxMTTOOrdenesTrabajoMC" OT
            ON OT.NUMERO_ORDEN = MCG.NUMERO_ORDEN
        LEFT JOIN "PdxMTTOAreasxPlanta" AP
            ON AP.ID_AREA = EQ.AREA
        LEFT JOIN "PdxMTTOLineasxPlanta" LP
            ON LP.ID_LINEA = EQ.LINEA_PRODUCCION
        WHERE EQ."PLANTA" = :p_PLANTA
        AND (:p_PROCESO IS NULL OR EQ.Area = :p_PROCESO)
        AND (:p_LINEAPROD IS NULL OR EQ.LINEA_PRODUCCION = :p_LINEAPROD)
        AND (:p_FECHA_INICIO IS NULL
            OR :p_FECHA_FIN IS NULL
            OR (MCG."HORA_APERTURA" BETWEEN :p_FECHA_INICIO AND :p_FECHA_FIN))
        -- Filtros nuevos
        AND (:p_ORDEN_TRABAJO IS NULL
            OR TRIM(:p_ORDEN_TRABAJO) = ''
            OR UPPER(MCG.NUMERO_ORDEN) LIKE '%' || UPPER(TRIM(:p_ORDEN_TRABAJO)) || '%')
        AND (:p_CLASIFICACION IS NULL
            OR TRIM(:p_CLASIFICACION) = ''
            OR UPPER(TRIM(COALESCE(EQ.CLASIFICACION, ''))) = UPPER(TRIM(:p_CLASIFICACION)))
        AND (:p_EQUIPO IS NULL
            OR TRIM(:p_EQUIPO) = ''
            OR UPPER(EQ.NOMBRE_EQUIPO) LIKE '%' || UPPER(TRIM(:p_EQUIPO)) || '%');

    -- ========================================
    -- UNION DE PREVENTIVOS Y CORRECTIVOS
    -- ========================================

    lt_union =
        SELECT * FROM :lt_preventivos_base
        UNION ALL
        SELECT * FROM :lt_correctivos_base;

    -- ========================================
    -- OBTENER NOMBRES DIRECTAMENTE DESDE OHEM
    -- ========================================

    lt_result =
        SELECT
            U.ID_MANTENIMIENTO,
            U.NUMERO_ORDEN,
            U.ID_EQUIPO,
            U.NOMBRE_EQUIPO,
            U.DESCRIPCION_EQUIPO,
            U.AREA,
            U.AREA_DESCRIPCION,
            U.LINEA_PRODUCCION,
            U.LINEA_DESCRIPCION,
            U.TIPO_MANTENIMIENTO,
            U.HORA_APERTURA,
            U.FECHA_INICIO,
            U.FECHA_FIN,
            U.FECHA_COMPLETADO,
            U.FECHA_REAL_INICIO,
            U.FECHA_REAL_FIN,
            U.ENVIAR_SIGUIENTE_MES,
            U.ESTATUS_SOLICITUD,
            U.ID_ESTATUS,
            U.ESTATUS,
            U.ORDEN_TRABAJO_FINALIZADA,
            U.SOLICITANTE,
            U.UBICACION_TECNICA,
            U.DURACION_HRS,
            U.TEXTO_CORTO,
            U.TEXTO_SECUENCIA,
            U.TECNICOS_IDS AS TECNICOS_ASIGNADOS_IDS,
            U.FUE_REPROGRAMADO,
            -- Procesar nombres directamente con subconsulta
            (
                SELECT STRING_AGG(
                    TRIM(IFNULL(E."firstName", '') || ' ' || IFNULL(E."lastName", ''))
                    || ' (' || E."ExtEmpNo" || ')',
                    ', '
                )
                FROM OHEM E
                WHERE E."Active" = 'Y'
                    AND LOCATE(',' || REPLACE(REPLACE(U.TECNICOS_IDS, ' ', ''), ',,', ',') || ',',
                               ',' || E."ExtEmpNo" || ',') > 0
            ) AS TECNICOS_ASIGNADOS_NOMBRES
        FROM :lt_union U
        WHERE :p_TIPOMANT IS NULL OR U.TIPO_MANTENIMIENTO = :p_TIPOMANT
        ORDER BY U.FECHA_COMPLETADO DESC, U.TIPO_MANTENIMIENTO, U.NUMERO_ORDEN;

    -- Retornar resultados
    SELECT * FROM :lt_result;

    END

-- ============================================================================
-- VALIDACION
-- ============================================================================
SELECT POSITION, PARAMETER_NAME, DATA_TYPE_NAME, LENGTH
FROM SYS.PROCEDURE_PARAMETERS
WHERE SCHEMA_NAME = 'TEST_JUNIO_2026'
  AND PROCEDURE_NAME = 'SpPdxMTTOObtenerMantenimientosCompletados'
ORDER BY POSITION;