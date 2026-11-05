-- ============================================================================
-- MIGRACION: REPROGRAMACION EN MANTENIMIENTOS PREVENTIVOS
-- Schema: PTM_2022_FINAL
-- Fecha: 05/11/2026
-- Objeto: SpPdxMTTOObtenerMantenimientosPorRango
--
-- Cambios:
--   + FECHA_INICIO_FINAL / FECHA_FIN_FINAL usan FECHA_REAL_INICIO / FECHA_REAL_FIN
--     cuando existe reprogramacion NA o Aceptada y NO es "enviar al siguiente mes".
--   + FUE_REPROGRAMADO = 'SI' tambien cuando la solicitud esta en estatus NA.
--   + Sin reprogramacion se conserva la fecha calculada por periodicidad.
--
-- IMPORTANTE: usa ALTER PROCEDURE, el SP debe existir previamente en el schema.
-- ============================================================================
ALTER PROCEDURE "PTM_2022_FINAL"."SpPdxMTTOObtenerMantenimientosPorRango" (
    IN P_FECHA_INICIO        DATE,
    IN P_FECHA_FIN           DATE,
    IN P_FILTRO_AREA         NVARCHAR(5000),
    IN P_FILTRO_LINEA        NVARCHAR(5000),
    IN P_FILTRO_ORDEN        NVARCHAR(5000),
    IN P_FILTRO_PERIODICIDAD INTEGER,
    IN P_FILTRO_PLANTA       NVARCHAR(10),
    IN P_FILTRO_ESTATUS      NVARCHAR(500),
    IN P_FILTRO_BUSQUEDA     NVARCHAR(500),
    IN P_USUARIO             NVARCHAR(50),
    IN P_EXCLUIR_SINCRONIZADOS_PVC       NVARCHAR(1) DEFAULT NULL,
    IN P_EXCLUIR_SINCRONIZADOS_PEADLISO  NVARCHAR(1) DEFAULT NULL,
    IN P_EXCLUIR_SINCRONIZADOS_CORRUGADO NVARCHAR(1) DEFAULT NULL,
    IN P_EXCLUIR_SINCRONIZADOS_INYECCION NVARCHAR(1) DEFAULT NULL,
    IN P_FILTRO_POSICION_ID              INTEGER      DEFAULT NULL,
	IN P_IDS_HERR                        NVARCHAR(500) DEFAULT NULL,
	IN P_IDS_MTTO                        NVARCHAR(500) DEFAULT NULL,
	IN P_LINEA_PROD 					 INT DEFAULT NULL,
    IN P_FILTRO_CLASIFICACION NVARCHAR(50) DEFAULT NULL,
    IN P_FILTRO_EQUIPO        NVARCHAR(100) DEFAULT NULL
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN

    DECLARE lt_result TABLE (
        ID_EQUIPO                   INT,
        ID_PERIODICIDAD             INT,
        ID_EQUIPO_PERIODICIDAD      INT,
        PLANTA                      NVARCHAR(10),
        NUMERO_DOC_PM_CALIDAD       NVARCHAR(5000),
        NOMBRE_EQUIPO               NVARCHAR(5000),
        DESCRIPCION_EQUIPO          NVARCHAR(5000),
        IDAREA                      NVARCHAR(5000),
        AREA                        NVARCHAR(5000),
        ID_LINEA_PRODUCCION         NVARCHAR(5000),
        LINEA_PRODUCCION            NVARCHAR(5000),
        CENTRO_COSTOS               NVARCHAR(50),
        PERIODICIDAD_MANTENIMIENTO  NVARCHAR(5000),
        FECHA_REAL_INICIO			NVARCHAR(5000),
        FECHA_REAL_FIN				NVARCHAR(5000),
        FECHA_INICIO_PERIODO		NVARCHAR(5000),
        FECHA_FIN_PERIODO			NVARCHAR(5000),
        MOTIVO						NVARCHAR(5000),
        ENVIAR_SIGUIENTE_MES		BOOLEAN,
        DIA_INICIO_MANT             INT,
        DIA_FIN_MANT                INT,
        FECHA_INICIO_MANT           NVARCHAR(5000),
        MES_MANTENIMIENTO           NVARCHAR(5000),
        FECHA_INICIO_MANTENIMIENTO  NVARCHAR(5000),
        FECHA_FIN_MANTENIMIENTO     NVARCHAR(5000),
        FECHA_REFERENCIA            NVARCHAR(5000),
        TIPO_MANTENIMIENTO          NVARCHAR(50),
        NUMERO_ORDEN                NVARCHAR(5000),
        HORA_APERTURA               NVARCHAR(5000),
        HORA_CIERRE                 NVARCHAR(5000),
        TIEMPO_INVERTIDO            NVARCHAR(50),
        ESTATUS_ORDEN               INT,
        DESC_ESTATUS_ORDEN          NVARCHAR(100),
        ID_MANTENIMIENTO            INT,
        ORDEN_TRABAJO_FINALIZADA    NVARCHAR(2),
        RUTINA_COMPLETADA           NVARCHAR(2),
        COMENTARIOS_RUTINA          NVARCHAR(5000),
        HORA_INICIO                 NVARCHAR(5000),
        HORA_FIN                    NVARCHAR(5000),
        TEXTO_SECUENCIA             NVARCHAR(1000),
        DURACION_HRS                NVARCHAR(50),
        TIEMPO_ARRANQUE             NVARCHAR(5000),        --    aqu├¡
		TIEMPO_LIBERACION_LINEA     NVARCHAR(5000),        --    aqu├¡
        FIRMA_REALIZO               NVARCHAR(5000),
        NOMBRE_REALIZO              NVARCHAR(200),
        FIRMA_SUPERVISO             NVARCHAR(5000),
        NOMBRE_SUPERVISO            NVARCHAR(200),
        FIRMA_MANTENIMIENTO         NVARCHAR(5000),
        NOMBRE_MANTENIMIENTO        NVARCHAR(200),
        TIENE_REFACCIONES           NVARCHAR(2),
        USUARIO                     NVARCHAR(50),
        FUE_REPROGRAMADO            NVARCHAR(2),   -- Ô£à v3: ya se aplic├│ una reprogramaci├│n aceptada
        TIENE_SOLICITUD_PENDIENTE   NVARCHAR(2),    -- Ô£à v3: hay una solicitud esperando aprobaci├│n
        ID_SOLICITUD_PENDIENTE      INT,            -- Ô£à v4: para poder aceptar/rechazar desde el front
		ESTATUS                    NVARCHAR(50)
    );

    IF :P_FECHA_INICIO IS NULL THEN
        P_FECHA_INICIO := '1900-01-01';
    END IF;

    IF :P_FECHA_FIN IS NULL THEN
        P_FECHA_FIN := '2099-12-31';
    END IF;

    lt_result =
    WITH
    SERIES AS (
        SELECT ELEMENT_NUMBER - 1 AS NUM
        FROM SERIES_GENERATE_INTEGER(1, 1, 602)
    ),
    EQUIPOS_CONFIG AS (
        SELECT
            E.ID_EQUIPO,
            E.PLANTA,
            E.NUMERO_DOC_PM_CALIDAD,
            E.NOMBRE_EQUIPO,
            E.DESCRIPCION_EQUIPO,
            E.AREA         AS IDAREA,
            AE.AREA,
            E.LINEA_PRODUCCION AS ID_LINEA_PRODUCCION,
            LE.LINEA       AS LINEA_PRODUCCION,
            E.CENTRO_COSTOS,
            EP.ID_PERIODICIDAD AS ID_PERIODICIDAD,
            EP.ID_EQUIPO_PERIODICIDAD,
            PM.DESCRIPCION                              AS PERIODICIDAD_MANTENIMIENTO,
            E.DIA_INICIO_MANT,
            E.DIA_FIN_MANT,
            TO_VARCHAR(E.FECHA_INICIO_MANT, 'DD/MM/YYYY') AS FECHA_INICIO_MANT,
            CAST(E.FECHA_INICIO_MANT AS DATE)           AS FECHA_INICIO_MANT_DATE,
            CASE EP.ID_PERIODICIDAD
                WHEN 1 THEN 1
                WHEN 2 THEN 2
                WHEN 3 THEN 3
                WHEN 4 THEN 4
                WHEN 5 THEN 5
                WHEN 6 THEN 6
                WHEN 7 THEN 12
                ELSE 1
            END AS INCREMENTO_MESES
        FROM "PdxMTTOGestionEquipos" E
		INNER JOIN "PdxMTTOEquiposPeriodicidad" EP
		    ON E.ID_EQUIPO = EP.ID_EQUIPO
		    AND EP.ESTATUS = 1
        LEFT JOIN "PdxMTTOLineasxPlanta"    LE ON E.LINEA_PRODUCCION        = LE.ID_LINEA
        LEFT JOIN "PdxMTTOAreasxPlanta"     AE ON E.AREA                    = AE.ID_AREA
        LEFT JOIN "PdxMTTOPeriodicidadMant" PM ON EP.ID_PERIODICIDAD = PM.ID_PERIODICIDAD
        WHERE E.ESTATUS = 1
            AND (:P_FILTRO_AREA         IS NULL OR E.AREA              = :P_FILTRO_AREA)
            AND (:P_FILTRO_LINEA        IS NULL OR E.LINEA_PRODUCCION  = :P_FILTRO_LINEA)
            AND (:P_FILTRO_PLANTA       IS NULL OR UPPER(TO_NVARCHAR(E.PLANTA)) = UPPER(:P_FILTRO_PLANTA))
            AND (:P_FILTRO_PERIODICIDAD IS NULL OR EP.ID_PERIODICIDAD = :P_FILTRO_PERIODICIDAD)
            AND (:P_LINEA_PROD IS NULL OR LE."PRODUCCION" = :P_LINEA_PROD)
            AND (
                :P_FILTRO_BUSQUEDA IS NULL
                OR UPPER(E.NOMBRE_EQUIPO)              LIKE '%' || UPPER(:P_FILTRO_BUSQUEDA) || '%'
                OR UPPER(E.DESCRIPCION_EQUIPO)         LIKE '%' || UPPER(:P_FILTRO_BUSQUEDA) || '%'
                OR UPPER(COALESCE(AE.AREA,   ''))      LIKE '%' || UPPER(:P_FILTRO_BUSQUEDA) || '%'
                OR UPPER(COALESCE(LE.LINEA,  ''))      LIKE '%' || UPPER(:P_FILTRO_BUSQUEDA) || '%'
            )
            AND (:P_FILTRO_CLASIFICACION IS NULL OR UPPER(COALESCE(E.CLASIFICACION,'')) = UPPER(:P_FILTRO_CLASIFICACION))
            AND (
                :P_FILTRO_EQUIPO IS NULL
                OR UPPER(E.NOMBRE_EQUIPO) LIKE '%' || UPPER(:P_FILTRO_EQUIPO) || '%'
            )
    ),
    -- Fechas BASE de cada ocurrencia, sin reprogramaci├│n a├║n
    MANTENIMIENTOS_CALCULADOS AS (
        SELECT
            E.ID_EQUIPO,
            E.PLANTA,
            E.NUMERO_DOC_PM_CALIDAD,
            E.NOMBRE_EQUIPO,
            E.DESCRIPCION_EQUIPO,
            E.IDAREA,
            E.AREA,
            E.ID_LINEA_PRODUCCION,
            E.LINEA_PRODUCCION,
            E.CENTRO_COSTOS,
            E.ID_PERIODICIDAD,
            E.ID_EQUIPO_PERIODICIDAD,
            E.PERIODICIDAD_MANTENIMIENTO,
            E.DIA_INICIO_MANT,
            E.DIA_FIN_MANT,
            E.FECHA_INICIO_MANT,
            S.NUM + 1 AS NUMERO_OCURRENCIA,

            ADD_DAYS(
                ADD_MONTHS(E.FECHA_INICIO_MANT_DATE, S.NUM * E.INCREMENTO_MESES),
                E.DIA_INICIO_MANT - DAYOFMONTH(E.FECHA_INICIO_MANT_DATE)
            ) AS FECHA_INICIO_MANTENIMIENTO_DATE,

            CASE
                WHEN E.DIA_FIN_MANT > DAYOFMONTH(LAST_DAY(ADD_MONTHS(E.FECHA_INICIO_MANT_DATE, S.NUM * E.INCREMENTO_MESES))) THEN
                    LAST_DAY(ADD_MONTHS(E.FECHA_INICIO_MANT_DATE, S.NUM * E.INCREMENTO_MESES))
                ELSE
                    ADD_DAYS(
                        ADD_MONTHS(E.FECHA_INICIO_MANT_DATE, S.NUM * E.INCREMENTO_MESES),
                        E.DIA_FIN_MANT - DAYOFMONTH(E.FECHA_INICIO_MANT_DATE)
                    )
            END AS FECHA_FIN_MANTENIMIENTO_DATE

        FROM EQUIPOS_CONFIG E
        CROSS JOIN SERIES S
        WHERE
            ADD_DAYS(
                ADD_MONTHS(E.FECHA_INICIO_MANT_DATE, S.NUM * E.INCREMENTO_MESES),
                E.DIA_INICIO_MANT - DAYOFMONTH(E.FECHA_INICIO_MANT_DATE)
            ) <= ADD_MONTHS(:P_FECHA_FIN, E.INCREMENTO_MESES + 1)  -- Ô£à v3: colch├│n +1 mes por posible reprogramaci├│n
            AND
            CASE
                WHEN E.DIA_FIN_MANT > DAYOFMONTH(LAST_DAY(ADD_MONTHS(E.FECHA_INICIO_MANT_DATE, S.NUM * E.INCREMENTO_MESES))) THEN
                    LAST_DAY(ADD_MONTHS(E.FECHA_INICIO_MANT_DATE, S.NUM * E.INCREMENTO_MESES))
                ELSE
                    ADD_DAYS(
                        ADD_MONTHS(E.FECHA_INICIO_MANT_DATE, S.NUM * E.INCREMENTO_MESES),
                        E.DIA_FIN_MANT - DAYOFMONTH(E.FECHA_INICIO_MANT_DATE)
                    )
            END >= ADD_MONTHS(:P_FECHA_INICIO, -1)  -- Ô£à v3: colch├│n -1 mes por posible reprogramaci├│n
    ),
    -- Ô£à v3: cruzamos con las OT ya generadas para conocer el NUMERO_ORDEN base de cada ocurrencia
    MANTENIMIENTOS_CON_ORDEN AS (
        SELECT
            M.*,
            MPG.NUMERO_ORDEN     AS NUMERO_ORDEN_BASE,
            MPG.ID_MANTENIMIENTO AS ID_MANTENIMIENTO_BASE,
            MPG.ESTATUS          AS ESTATUS_ORDEN_BASE,
            MPG.HORA_APERTURA    AS HORA_APERTURA_BASE,
            MPG.HORA_CIERRE      AS HORA_CIERRE_BASE,
            MPG.USUARIO          AS USUARIO_BASE,
            MPG.FECHA_INICIO_PERIODO,
            MPG.FECHA_FIN_PERIODO
        FROM MANTENIMIENTOS_CALCULADOS M
        LEFT JOIN "PdxMTTOMPGenerados" MPG
            ON M.ID_EQUIPO             = MPG.ID_EQUIPO
            AND M.ID_PERIODICIDAD       = MPG.ID_PERIODICIDAD
            AND MPG.FECHA_INICIO_PERIODO = M.FECHA_INICIO_MANTENIMIENTO_DATE
            AND MPG.FECHA_FIN_PERIODO    = M.FECHA_FIN_MANTENIMIENTO_DATE
    ),
    -- Ô£à v3: resumen de solicitudes de reprogramaci├│n por NUMERO_ORDEN (aceptada / pendiente)
    ESTATUS_REPROGRAMACION AS (
        SELECT
            "NUMERO_ORDEN",
            "FECHA_REAL_INICIO",
            "FECHA_REAL_FIN",
            "ENVIAR_SIGUIENTE_MES",
            "MOTIVO",
            MAX(CASE WHEN "ESTATUS" = 'Aceptada'  THEN 1 ELSE 0 END) AS TIENE_ACEPTADA,
            MAX(CASE WHEN "ESTATUS" = 'Pendiente' THEN 1 ELSE 0 END) AS TIENE_PENDIENTE,
            -- Ô£à v4: como solo puede haber 1 pendiente por orden (ya lo validamos en el stored de solicitud), tomamos ese ID
            MAX(CASE WHEN "ESTATUS" IN ('Aceptada', 'Pendiente', 'NA') THEN "ID_SOLICITUD" ELSE NULL END) AS ID_SOLICITUD_PENDIENTE,
            "ESTATUS"
        FROM "PdxMTTOSolicitudesReprogramacion"
        GROUP BY "NUMERO_ORDEN", "FECHA_REAL_INICIO", "FECHA_REAL_FIN", "ENVIAR_SIGUIENTE_MES", "MOTIVO", "ESTATUS"
    ),
    -- Ô£à v3: aqu├¡ se decide la fecha FINAL de cada ocurrencia (base o corrida +1 mes)
    MANTENIMIENTOS_AJUSTADOS AS (
        SELECT
            MC.*,
            CASE
                WHEN RA.TIENE_ACEPTADA = 1 OR RA."ESTATUS" = 'NA' THEN 'SI'
                ELSE 'NO'
            END AS FUE_REPROGRAMADO,
            CASE WHEN RA.TIENE_PENDIENTE = 1 THEN 'SI' ELSE 'NO' END AS TIENE_SOLICITUD_PENDIENTE,
            RA.ID_SOLICITUD_PENDIENTE AS ID_SOLICITUD_PENDIENTE,   -- Ô£à v4
            CASE
                -- Reprogramacion con fechas reales (NA o Aceptada, sin "siguiente mes")
                WHEN RA."ESTATUS" IN ('NA', 'Aceptada')
                     AND RA."FECHA_REAL_INICIO" IS NOT NULL
                     AND RA."FECHA_REAL_FIN"     IS NOT NULL
                     AND IFNULL(RA."ENVIAR_SIGUIENTE_MES", FALSE) = FALSE
                THEN CAST(RA."FECHA_REAL_INICIO" AS DATE)
                -- Reprogramacion "enviar al siguiente mes"
                WHEN RA.TIENE_ACEPTADA = 1
                THEN ADD_MONTHS(MC.FECHA_INICIO_MANTENIMIENTO_DATE, 1)
                ELSE MC.FECHA_INICIO_MANTENIMIENTO_DATE
            END AS FECHA_INICIO_FINAL,
            CASE
                -- Reprogramacion con fechas reales (NA o Aceptada, sin "siguiente mes")
                WHEN RA."ESTATUS" IN ('NA', 'Aceptada')
                     AND RA."FECHA_REAL_INICIO" IS NOT NULL
                     AND RA."FECHA_REAL_FIN"     IS NOT NULL
                     AND IFNULL(RA."ENVIAR_SIGUIENTE_MES", FALSE) = FALSE
                THEN CAST(RA."FECHA_REAL_FIN" AS DATE)
                -- Reprogramacion "enviar al siguiente mes"
                WHEN RA.TIENE_ACEPTADA = 1
                THEN ADD_MONTHS(MC.FECHA_FIN_MANTENIMIENTO_DATE, 1)
                ELSE MC.FECHA_FIN_MANTENIMIENTO_DATE
            END AS FECHA_FIN_FINAL,
			RA."FECHA_REAL_INICIO",
            RA."FECHA_REAL_FIN",
            RA."ENVIAR_SIGUIENTE_MES",
            RA."MOTIVO",
            RA."ESTATUS"
        FROM MANTENIMIENTOS_CON_ORDEN MC
        LEFT JOIN ESTATUS_REPROGRAMACION RA
            ON MC.NUMERO_ORDEN_BASE = RA."NUMERO_ORDEN"
            AND RA."ESTATUS" != 'Rechazada'
    )
    SELECT
        M.ID_EQUIPO,
        M.ID_PERIODICIDAD,
        M.ID_EQUIPO_PERIODICIDAD,
        M.PLANTA,
        M.NUMERO_DOC_PM_CALIDAD,
        M.NOMBRE_EQUIPO,
        M.DESCRIPCION_EQUIPO,
        M.IDAREA,
        M.AREA,
        M.ID_LINEA_PRODUCCION,
        M.LINEA_PRODUCCION,
        M.CENTRO_COSTOS,
        M.PERIODICIDAD_MANTENIMIENTO,
        M."FECHA_REAL_INICIO",
        M."FECHA_REAL_FIN",
        M.FECHA_INICIO_PERIODO,
        M.FECHA_FIN_PERIODO,
        M."MOTIVO",
        M."ENVIAR_SIGUIENTE_MES",
        M.DIA_INICIO_MANT,
        M.DIA_FIN_MANT,
        M.FECHA_INICIO_MANT,
        'Del ' || TO_VARCHAR(M.FECHA_INICIO_FINAL, 'DD/MM/YYYY') || ' Al ' || TO_VARCHAR(M.FECHA_FIN_FINAL, 'DD/MM/YYYY') AS MES_MANTENIMIENTO,
        TO_VARCHAR(M.FECHA_INICIO_FINAL, 'DD/MM/YYYY') AS FECHA_INICIO_MANTENIMIENTO,
        TO_VARCHAR(M.FECHA_FIN_FINAL,    'DD/MM/YYYY') AS FECHA_FIN_MANTENIMIENTO,
        TO_VARCHAR(M.FECHA_INICIO_FINAL, 'DD/MM/YYYY') AS FECHA_REFERENCIA,
        'Z20' AS TIPO_MANTENIMIENTO,
        COALESCE(M.NUMERO_ORDEN_BASE, '')  AS NUMERO_ORDEN,
        CASE WHEN M.HORA_APERTURA_BASE IS NULL THEN '' ELSE TO_VARCHAR(M.HORA_APERTURA_BASE, 'DD/MM/YYYY HH24:MI:SS') END AS HORA_APERTURA,
        CASE WHEN M.HORA_CIERRE_BASE   IS NULL THEN '' ELSE TO_VARCHAR(M.HORA_CIERRE_BASE,   'DD/MM/YYYY HH24:MI:SS') END AS HORA_CIERRE,
        CASE
            WHEN M.ESTATUS_ORDEN_BASE = 4 AND M.HORA_APERTURA_BASE IS NOT NULL AND M.HORA_CIERRE_BASE IS NOT NULL THEN
                CAST(ROUND(SECONDS_BETWEEN(M.HORA_APERTURA_BASE, M.HORA_CIERRE_BASE) / 3600.0, 2) AS NVARCHAR(50))
            ELSE ''
        END AS TIEMPO_INVERTIDO,
        COALESCE(M.ESTATUS_ORDEN_BASE, 0)        AS ESTATUS_ORDEN,
        COALESCE(ESOT.DESCRIPCION, '')  AS DESC_ESTATUS_ORDEN,
        COALESCE(M.ID_MANTENIMIENTO_BASE, 0) AS ID_MANTENIMIENTO,
        CASE
            WHEN OT.ID_OT_DETALLE IS NOT NULL
                AND OT.FIRMA_REALIZO       IS NOT NULL AND LENGTH(TRIM(OT.FIRMA_REALIZO))       > 0
                AND OT.FIRMA_SUPERVISO     IS NOT NULL AND LENGTH(TRIM(OT.FIRMA_SUPERVISO))     > 0
                AND OT.FIRMA_MANTENIMIENTO IS NOT NULL AND LENGTH(TRIM(OT.FIRMA_MANTENIMIENTO)) > 0
            THEN 'SI'
            ELSE 'NO'
        END AS ORDEN_TRABAJO_FINALIZADA,
        CASE WHEN RUT.ID_RUTINA IS NOT NULL THEN 'SI' ELSE 'NO' END AS RUTINA_COMPLETADA,
        RUT.COMENTARIOS AS COMENTARIOS_RUTINA,
        CASE WHEN OT.HORA_INICIO IS NULL THEN '' ELSE TO_VARCHAR(OT.HORA_INICIO, 'DD/MM/YYYY HH24:MI:SS') END AS HORA_INICIO,
		CASE WHEN OT.HORA_FIN    IS NULL THEN '' ELSE TO_VARCHAR(OT.HORA_FIN,    'DD/MM/YYYY HH24:MI:SS') END AS HORA_FIN,
        COALESCE(OT.TEXTO_SECUENCIA, '') AS TEXTO_SECUENCIA,
        CASE WHEN OT.DURACION_HRS IS NULL THEN '' ELSE CAST(OT.DURACION_HRS AS NVARCHAR(50)) END AS DURACION_HRS,
        --    agrega aqu├¡:
		CASE WHEN OT.TIEMPO_ARRANQUE IS NULL THEN '' ELSE TO_VARCHAR(OT.TIEMPO_ARRANQUE, 'DD/MM/YYYY HH24:MI:SS') END AS TIEMPO_ARRANQUE,
		CASE WHEN OT.TIEMPO_LIBERACION_LINEA IS NULL THEN '' ELSE TO_VARCHAR(OT.TIEMPO_LIBERACION_LINEA, 'DD/MM/YYYY HH24:MI:SS') END AS TIEMPO_LIBERACION_LINEA,
        CASE
            WHEN OT.FIRMA_REALIZO IS NOT NULL AND LENGTH(TRIM(OT.FIRMA_REALIZO)) > 0
            THEN '/FirmasOTPreventivo/' || M.NUMERO_ORDEN_BASE || '/Firma_Realizo.png'
            ELSE ''
        END AS FIRMA_REALIZO,
        COALESCE(OT.NOMBRE_REALIZO,       '') AS NOMBRE_REALIZO,
        CASE
            WHEN OT.FIRMA_SUPERVISO IS NOT NULL AND LENGTH(TRIM(OT.FIRMA_SUPERVISO)) > 0
            THEN '/FirmasOTPreventivo/' || M.NUMERO_ORDEN_BASE || '/Firma_Superviso.png'
            ELSE ''
        END AS FIRMA_SUPERVISO,
        COALESCE(OT.NOMBRE_SUPERVISO,     '') AS NOMBRE_SUPERVISO,
        CASE
            WHEN OT.FIRMA_MANTENIMIENTO IS NOT NULL AND LENGTH(TRIM(OT.FIRMA_MANTENIMIENTO)) > 0
            THEN '/FirmasOTPreventivo/' || M.NUMERO_ORDEN_BASE || '/Firma_Mantenimiento.png'
            ELSE ''
        END AS FIRMA_MANTENIMIENTO,
        COALESCE(OT.NOMBRE_MANTENIMIENTO, '') AS NOMBRE_MANTENIMIENTO,
        CASE
            WHEN EXISTS (
                SELECT 1
                FROM "PdxMTTOMPSolicitudRefacciones" SR2
                WHERE SR2.ORDEN_TRABAJO = M.NUMERO_ORDEN_BASE
            ) THEN 'SI'
            ELSE 'NO'
        END AS TIENE_REFACCIONES,
        COALESCE(M.USUARIO_BASE, :P_USUARIO) AS USUARIO,
        M.FUE_REPROGRAMADO,
        M.TIENE_SOLICITUD_PENDIENTE,
        COALESCE(M.ID_SOLICITUD_PENDIENTE, 0) AS ID_SOLICITUD_PENDIENTE,   -- Ô£à v4
		M.ESTATUS

    FROM MANTENIMIENTOS_AJUSTADOS M
    LEFT JOIN "PdxMTTOEstatusOT"     ESOT ON M.ESTATUS_ORDEN_BASE = ESOT.ID_ESTATUS
    LEFT JOIN "PdxMTTOOrdenesTrabajoMP" OT ON M.NUMERO_ORDEN_BASE = OT.NUMERO_ORDEN
    LEFT JOIN "PdxMTTORutinasMP"     RUT  ON M.NUMERO_ORDEN_BASE  = RUT.ID_OT_DETALLE
    WHERE
        (
            (M.FECHA_INICIO_FINAL BETWEEN :P_FECHA_INICIO AND :P_FECHA_FIN)
            OR (M.FECHA_FIN_FINAL BETWEEN :P_FECHA_INICIO AND :P_FECHA_FIN)
            OR (M.FECHA_INICIO_FINAL <= :P_FECHA_INICIO AND M.FECHA_FIN_FINAL >= :P_FECHA_FIN)
        )
        AND (:P_FILTRO_ORDEN IS NULL OR M.NUMERO_ORDEN_BASE = :P_FILTRO_ORDEN)
        AND (
            :P_FILTRO_ESTATUS IS NULL
            OR LOCATE(:P_FILTRO_ESTATUS, CAST(M.ESTATUS_ORDEN_BASE AS NVARCHAR)) > 0
        )
        
        AND (
		    :P_EXCLUIR_SINCRONIZADOS_PVC IS NULL
		    OR :P_EXCLUIR_SINCRONIZADOS_PVC <> 'S'
		    OR NOT EXISTS (
		        SELECT 1
		        FROM "PdxMTTOTiemposMuertosProduccionPVC" TM
		        WHERE TM."OTMP" LIKE '%"' || M.NUMERO_ORDEN_BASE || '"%'
		          AND IFNULL(TM."ESTATUS", 'A') = 'A'
		    )
	    )
	    
    AND (
        :P_EXCLUIR_SINCRONIZADOS_PEADLISO IS NULL
        OR :P_EXCLUIR_SINCRONIZADOS_PEADLISO <> 'S'
        OR NOT EXISTS (
            SELECT 1
            FROM "PdxMTTOTiemposMuertosProduccionPeadLiso" TM
            WHERE TM."OTMP" LIKE '%"' || M.NUMERO_ORDEN_BASE || '"%'
              AND IFNULL(TM."ESTATUS", 'A') = 'A'
        )
    )
    AND (
        :P_EXCLUIR_SINCRONIZADOS_CORRUGADO IS NULL
        OR :P_EXCLUIR_SINCRONIZADOS_CORRUGADO <> 'S'
        OR NOT EXISTS (
            SELECT 1
        FROM "PdxMTTOTiemposMuertosProduccionCorrugado" TM
            WHERE TM."OTMP" LIKE '%"' || M.NUMERO_ORDEN_BASE || '"%'
              AND IFNULL(TM."ESTATUS", 'A') = 'A'
        )
    )
    AND (
        :P_EXCLUIR_SINCRONIZADOS_INYECCION IS NULL
        OR :P_EXCLUIR_SINCRONIZADOS_INYECCION <> 'S'
        OR NOT EXISTS (
            SELECT 1
        FROM "PdxMTTOTiemposMuertosProduccionINY" TM
            WHERE TM."OTMP" LIKE '%"' || M.NUMERO_ORDEN_BASE || '"%'
              AND IFNULL(TM."ESTATUS", 'A') = 'A'
        )
    )
    -- Filtro por posicion del tecnico usando la CLASIFICACION del equipo
    AND (
        :P_FILTRO_POSICION_ID IS NULL
        OR :P_IDS_HERR IS NULL
        OR :P_IDS_MTTO IS NULL

        -- TEC HERR: equipos HERRAMENTALES
        OR (
            LOCATE(',' || :P_IDS_HERR || ',', ',' || CAST(:P_FILTRO_POSICION_ID AS NVARCHAR) || ',') > 0
            AND EXISTS (
                SELECT 1
                FROM "PdxMTTOGestionEquipos" EQ
                WHERE EQ."ID_EQUIPO" = M.ID_EQUIPO
                  AND UPPER(COALESCE(EQ."CLASIFICACION", '')) = 'HERRAMENTALES'
            )
        )

        -- TEC MTO: equipos MANTENIMIENTO
        OR (
            LOCATE(',' || :P_IDS_MTTO || ',', ',' || CAST(:P_FILTRO_POSICION_ID AS NVARCHAR) || ',') > 0
            AND EXISTS (
                SELECT 1
                FROM "PdxMTTOGestionEquipos" EQ
                WHERE EQ."ID_EQUIPO" = M.ID_EQUIPO
                  AND UPPER(COALESCE(EQ."CLASIFICACION", '')) = 'MANTENIMIENTO'
            )
        )

        -- Cualquier otra posicion no listada: sin restriccion
        OR (
            LOCATE(',' || :P_IDS_HERR || ',', ',' || CAST(:P_FILTRO_POSICION_ID AS NVARCHAR) || ',') = 0
            AND LOCATE(',' || :P_IDS_MTTO || ',', ',' || CAST(:P_FILTRO_POSICION_ID AS NVARCHAR) || ',') = 0
        )
    )
   ORDER BY
	CASE WHEN :P_LINEA_PROD IS NOT NULL THEN M.ID_LINEA_PRODUCCION ELSE NULL END ASC,
    CASE
        WHEN M.NUMERO_ORDEN_BASE IS NOT NULL
         AND M.NUMERO_ORDEN_BASE <> ''
        THEN 0
        ELSE 1
    END ASC,

    CASE
        WHEN M.NUMERO_ORDEN_BASE IS NOT NULL
         AND M.NUMERO_ORDEN_BASE <> ''
        THEN CAST(REPLACE(M.NUMERO_ORDEN_BASE, 'OTMP-', '') AS INT)
        ELSE 999999
    END ASC,

    M.FECHA_INICIO_FINAL ASC,

    M.NOMBRE_EQUIPO ASC,

    M.ID_PERIODICIDAD ASC;

    SELECT * FROM :lt_result;

END


