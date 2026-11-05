/* ============================================================================
   MIGRACION DE BASE DE DATOS - MantenimientosPTM
   Destino: schema "PTM_2022_FINAL"
   Fecha: 05/11/2026

   IMPORTANTE
   - Hacer respaldo/snapshot del schema antes de ejecutar.
   - Ejecutar con un usuario con privilegios ALTER en el schema destino.
   - Este script usa ALTER PROCEDURE: los 11 SPs deben existir previamente.
   - El ALTER TABLE solo se ejecuta si la columna no existe.
   - NO incluye datos de prueba. Solo estructura (columna) y stored procedures.
   - La app debe apuntar el appSetting "Database" a este mismo schema.
   - Orden: columna Corrugado -> equipos -> preventivos -> correctivos -> metricas -> corrugado SPs.
   ============================================================================ */

SET SCHEMA "PTM_2022_FINAL";

-- ----------------------------------------------------------------------------
-- 1) Columna TIEMPO_MUERTO_HERRAMENTALES en la bitacora de Corrugado
-- ----------------------------------------------------------------------------
DO BEGIN
    DECLARE v_count INTEGER;
    SELECT COUNT(*) INTO v_count
    FROM SYS.TABLE_COLUMNS
    WHERE SCHEMA_NAME = 'PTM_2022_FINAL'
      AND TABLE_NAME = 'PdxMTTOTiemposMuertosProduccionCorrugado'
      AND COLUMN_NAME = 'TIEMPO_MUERTO_HERRAMENTALES';
    IF v_count = 0 THEN
        EXEC 'ALTER TABLE "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionCorrugado" ADD ("TIEMPO_MUERTO_HERRAMENTALES" DECIMAL(10,2) DEFAULT 0)';
    END IF;
END;

-- ----------------------------------------------------------------------------
-- 2) SpPdxMTTOConsultaEquipos
-- ----------------------------------------------------------------------------
-- ----------------------------------------------------------------------------
-- 2) SpPdxMTTOConsultaEquipos
-- ----------------------------------------------------------------------------
ALTER PROCEDURE "PTM_2022_FINAL"."SpPdxMTTOConsultaEquipos" (
    IN P_ID_EQUIPO                      INTEGER,
    IN P_NOMBRE                         NVARCHAR(100),
    IN P_PLANTA                         NVARCHAR(50),
    IN P_USUARIO                        NVARCHAR(100),
    IN P_AREA                           NVARCHAR(50),
    IN P_LINEA_PRODUCCION               NVARCHAR(50),
    IN P_ORDEN_TRABAJO                  NVARCHAR(50),
    IN P_FECHA_INICIO_MANTENIMIENTO     DATE,
    IN P_QUERY                          NVARCHAR(100),
    IN P_TOP                            INTEGER,
    IN P_MODO                           NVARCHAR(20),
    IN P_ESTATUS                        NVARCHAR(50),
    IN P_CLASIFICACION                  NVARCHAR(20)
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN

    IF :P_MODO = 'SELECT' THEN

        SELECT
            E."ID_EQUIPO",
            E."NOMBRE_EQUIPO"
        FROM "PdxMTTOGestionEquipos" E
        WHERE E."ESTATUS" = 1
          AND (:P_PLANTA IS NULL OR E."PLANTA" = :P_PLANTA)
          AND (:P_AREA IS NULL OR E."AREA" = :P_AREA)
        ORDER BY E."NOMBRE_EQUIPO";

    ELSEIF UPPER(:P_MODO) = 'SEARCH' THEN

        SELECT
            E."ID_EQUIPO",
            E."NOMBRE_EQUIPO",
            E."DESCRIPCION_EQUIPO",
            E."CENTRO_COSTOS",
            E."NUMERO_DOC_PM_CALIDAD",
            E."CLASIFICACION",
            LE."LINEA" AS "LINEA_PRODUCCION"
        FROM "PdxMTTOGestionEquipos" E
        LEFT JOIN "PdxMTTOLineasxPlanta" LE
               ON TO_INT(E."LINEA_PRODUCCION") = LE."ID_LINEA"
        WHERE E."ESTATUS" = 1
          AND (
                :P_QUERY IS NULL
                OR UPPER(E."NOMBRE_EQUIPO") LIKE '%' || UPPER(:P_QUERY) || '%'
                OR UPPER(E."DESCRIPCION_EQUIPO") LIKE '%' || UPPER(:P_QUERY) || '%'
                OR UPPER(E."CENTRO_COSTOS") LIKE '%' || UPPER(:P_QUERY) || '%'
                OR UPPER(E."NUMERO_DOC_PM_CALIDAD") LIKE '%' || UPPER(:P_QUERY) || '%'
                OR UPPER(LE."LINEA") LIKE '%' || UPPER(:P_QUERY) || '%'
              )
          AND (:P_PLANTA IS NULL OR E."PLANTA" = :P_PLANTA)
          AND (:P_CLASIFICACION IS NULL OR E."CLASIFICACION" = :P_CLASIFICACION)
          --AND (:P_USUARIO IS NULL OR E."USUARIO" = :P_USUARIO)
        ORDER BY E."NOMBRE_EQUIPO"
        LIMIT :P_TOP;

    ELSE
        SELECT
            E."ID_EQUIPO",
            E."PLANTA",
            E."TIPO_EQUIPO",
            TE."DESCRIPCION" AS "TIPO_EQUIPO_DESC",
            E."NUMERO_DOC_PM_CALIDAD",
            E."NOMBRE_EQUIPO",
            E."DESCRIPCION_EQUIPO",
            E."AREA" AS "IDAREA",
            AE."AREA",
            E."LINEA_PRODUCCION" AS "ID_LINEA_PRODUCCION",
            LE."LINEA" AS "LINEA_PRODUCCION",
            E."CENTRO_COSTOS",
			E."CLASIFICACION",
            PER."PERIODICIDADES" AS "PERIODICIDAD_MANTENIMIENTO",
            PER."IDS_PERIODICIDADES" AS "ID_PERIODICIDAD_MANTENIMIENTO",
            E."DIA_INICIO_MANT",
            E."DIA_FIN_MANT",
            TO_VARCHAR(E."FECHA_INICIO_MANT", 'DD/MM/YYYY') AS "FECHA_INICIO_MANT",
            S."DESCRIPCION" AS "ESTATUS",
            E."COMENTARIOS",
            TO_VARCHAR(E."FECHA_PAUSA", 'DD/MM/YYYY HH24:MI:SS') AS "FECHA_PAUSA",
            TO_VARCHAR(E."FECHA_CREACION", 'DD/MM/YYYY') AS "FECHA_CREACION",
            E."FECHA_BAJA",
            TO_VARCHAR(E."FECHA_ULT_MOD", 'DD/MM/YYYY') AS "FECHA_ULT_MOD"
        FROM "PdxMTTOGestionEquipos" E

        LEFT JOIN "PdxMTTOEstatusEquipos" S
            ON E."ESTATUS" = S."ID_ESTATUS"

        LEFT JOIN "PdxMTTOTiposEquipo" TE
            ON E."TIPO_EQUIPO" = TE."ID_TIPO_EQUIPO"

        LEFT JOIN "PdxMTTOLineasxPlanta" LE
            ON TO_INT(E."LINEA_PRODUCCION") = LE."ID_LINEA"

        LEFT JOIN "PdxMTTOAreasxPlanta" AE
            ON TO_INT(E."AREA") = AE."ID_AREA"

        LEFT JOIN (
            SELECT
                EP."ID_EQUIPO",

                STRING_AGG(
                    TO_VARCHAR(EP."ID_PERIODICIDAD"),
                    ','
                ) AS "IDS_PERIODICIDADES",

                STRING_AGG(
                    PM."DESCRIPCION",
                    ', '
                ) AS "PERIODICIDADES"

            FROM "PdxMTTOEquiposPeriodicidad" EP

            INNER JOIN "PdxMTTOPeriodicidadMant" PM
                ON EP."ID_PERIODICIDAD" = PM."ID_PERIODICIDAD"

            WHERE EP."ESTATUS" = 1

            GROUP BY EP."ID_EQUIPO"

        ) PER
            ON E."ID_EQUIPO" = PER."ID_EQUIPO"

        WHERE
            (
                :P_ESTATUS IS NULL
                OR :P_ESTATUS = ''
                OR LOCATE(',' || :P_ESTATUS || ',', ',' || TO_VARCHAR(E."ESTATUS") || ',') > 0
            )

            AND (:P_ID_EQUIPO IS NULL OR E."ID_EQUIPO" = :P_ID_EQUIPO)
            AND (:P_PLANTA IS NULL OR E."PLANTA" = :P_PLANTA)
            --AND (:P_USUARIO IS NULL OR E."USUARIO" = :P_USUARIO)
            AND (:P_AREA IS NULL OR E."AREA" = :P_AREA)
            AND (:P_LINEA_PRODUCCION IS NULL OR E."LINEA_PRODUCCION" = :P_LINEA_PRODUCCION)

            AND (
                :P_NOMBRE IS NULL
                OR E."NOMBRE_EQUIPO" LIKE '%' || :P_NOMBRE || '%'
                OR E."DESCRIPCION_EQUIPO" LIKE '%' || :P_NOMBRE || '%'
            )

            AND (
                :P_FECHA_INICIO_MANTENIMIENTO IS NULL
                OR E."FECHA_INICIO_MANT" = :P_FECHA_INICIO_MANTENIMIENTO
            )

            AND (
                :P_ORDEN_TRABAJO IS NULL
                OR EXISTS (
                    SELECT 1
                    FROM "PdxMTTOMPGenerados" MP
                    WHERE MP."ID_EQUIPO" = E."ID_EQUIPO"
                      AND MP."NUMERO_ORDEN" = :P_ORDEN_TRABAJO
                )
            )
			AND (:P_CLASIFICACION IS NULL OR E."CLASIFICACION" = :P_CLASIFICACION)

        ORDER BY E."ID_EQUIPO" ASC;

    END IF;

END
;

-- ----------------------------------------------------------------------------
-- 3) SpPdxMTTOInsertaEquipo
-- ----------------------------------------------------------------------------
-- ----------------------------------------------------------------------------
-- 3) SpPdxMTTOInsertaEquipo
-- ----------------------------------------------------------------------------
ALTER PROCEDURE "PTM_2022_FINAL"."SpPdxMTTOInsertaEquipo" (
    IN P_PLANTA                     INTEGER,        -- v2: era NVARCHAR(10)
    IN P_TIPO_EQUIPO                INTEGER,        -- v2: era NVARCHAR(50)
    IN P_NOMBRE_EQUIPO              NVARCHAR(100),
    IN P_DESCRIPCION_EQUIPO         NVARCHAR(100),
    IN P_AREA                       INTEGER,        -- v2: era NVARCHAR(50)
    IN P_LINEA_PRODUCCION           INTEGER,        -- v2: era NVARCHAR(50)
    IN P_CENTRO_COSTOS              NVARCHAR(50),
    IN P_NUMERO_DOC_PM_CALIDAD      NVARCHAR(50),
    IN P_PERIODICIDAD_MANTENIMIENTO INTEGER,        -- v2: era NVARCHAR(20)
    IN P_DIA_INICIO_MANT            INTEGER,
    IN P_DIA_FIN_MANT               INTEGER,
    IN P_FECHA_INICIO_MANT          DATE,
    IN P_ESTATUS                    TINYINT,        -- v2: era NVARCHAR(20)
    IN P_COMENTARIOS                NVARCHAR(500),
    IN P_USUARIO                    NVARCHAR(100),
    IN P_FECHA_PAUSA                LONGDATE,
    IN P_FECHA_BAJA                 LONGDATE,
    IN P_CLASIFICACION              NVARCHAR(50)
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN
    DECLARE V_FECHA_MEXICO LONGDATE;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SELECT 'ERROR' AS "Estatus", ::SQL_ERROR_MESSAGE AS "Mensaje" FROM DUMMY;
    END;

    -- Obtener fecha/hora de M-xico (UTC-6)
    SELECT ADD_SECONDS(CURRENT_UTCTIMESTAMP, -6*3600) INTO V_FECHA_MEXICO FROM DUMMY;

    INSERT INTO "PTM_2022_FINAL"."PdxMTTOGestionEquipos" (
        "PLANTA",
        "TIPO_EQUIPO",
        "NOMBRE_EQUIPO",
        "DESCRIPCION_EQUIPO",
        "AREA",
        "LINEA_PRODUCCION",
        "CENTRO_COSTOS",
        "NUMERO_DOC_PM_CALIDAD",
        "PERIODICIDAD_MANTENIMIENTO",
        "DIA_INICIO_MANT",
        "DIA_FIN_MANT",
        "FECHA_INICIO_MANT",
        "ESTATUS",
        "COMENTARIOS",
        "FECHA_PAUSA",
        "FECHA_CREACION",
        "FECHA_BAJA",
        "FECHA_ULT_MOD",
        "USUARIO",
        "CLASIFICACION"
    )
    VALUES (
        :P_PLANTA,
        :P_TIPO_EQUIPO,
        :P_NOMBRE_EQUIPO,
        :P_DESCRIPCION_EQUIPO,
        :P_AREA,
        :P_LINEA_PRODUCCION,
        :P_CENTRO_COSTOS,
        :P_NUMERO_DOC_PM_CALIDAD,
        :P_PERIODICIDAD_MANTENIMIENTO,
        :P_DIA_INICIO_MANT,
        :P_DIA_FIN_MANT,
        :P_FECHA_INICIO_MANT,
        :P_ESTATUS,
        :P_COMENTARIOS,
        :P_FECHA_PAUSA,
        :V_FECHA_MEXICO,
        :P_FECHA_BAJA,
        :V_FECHA_MEXICO,
        :P_USUARIO,
        :P_CLASIFICACION
    );

    -- Recuperar el ID reci-n insertado
    SELECT CURRENT_IDENTITY_VALUE() AS "ID_EQUIPO" FROM DUMMY;

END
;

-- ----------------------------------------------------------------------------
-- 4) SpPdxMTTOActualizaEquipo
-- ----------------------------------------------------------------------------
-- ----------------------------------------------------------------------------
-- 4) SpPdxMTTOActualizaEquipo
-- ----------------------------------------------------------------------------
ALTER PROCEDURE "PTM_2022_FINAL"."SpPdxMTTOActualizaEquipo" (
    IN P_IDEQUIPO                   INTEGER,
    IN P_PLANTA                     INTEGER,        -- v2: era NVARCHAR(10)
    IN P_TIPOEQUIPO                 INTEGER,        -- v2: era NVARCHAR(50)
    IN P_NOMBREEQUIPO               NVARCHAR(100),
    IN P_DESCRIPCIONEQUIPO          NVARCHAR(100),
    IN P_AREA                       INTEGER,        -- v2: era NVARCHAR(50)
    IN P_LINEAPRODUCCION            INTEGER,        -- v2: era NVARCHAR(50)
    IN P_CENTROCOSTOS               NVARCHAR(50),
    IN P_NUMERODOCPMCALIDAD         NVARCHAR(50),
    IN P_PERIODICIDADMANTENIMIENTO  INTEGER,        -- v2: era NVARCHAR(20)
    IN P_DIAINICIOMANT              INTEGER,
    IN P_DIAFINMANT                 INTEGER,
    IN P_FECHAINICIOMANT            DATE,
    IN P_COMENTARIOS                NVARCHAR(500),
    IN P_CLASIFICACION              NVARCHAR(50)
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN
    DECLARE V_FECHA_MEXICO LONGDATE;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SELECT 'ERROR' AS "Estatus", ::SQL_ERROR_MESSAGE AS "Mensaje" FROM DUMMY;
    END;

    -- Obtener fecha/hora de M-xico (UTC-6)
    SELECT ADD_SECONDS(CURRENT_UTCTIMESTAMP, -6*3600) INTO V_FECHA_MEXICO FROM DUMMY;

    -- Actualizar los datos generales
    UPDATE "PTM_2022_FINAL"."PdxMTTOGestionEquipos"
    SET
        "PLANTA"                      = :P_PLANTA,
        "TIPO_EQUIPO"                 = :P_TIPOEQUIPO,
        "NOMBRE_EQUIPO"               = :P_NOMBREEQUIPO,
        "DESCRIPCION_EQUIPO"          = :P_DESCRIPCIONEQUIPO,
        "AREA"                        = :P_AREA,
        "LINEA_PRODUCCION"            = :P_LINEAPRODUCCION,
        "CENTRO_COSTOS"               = :P_CENTROCOSTOS,
        "NUMERO_DOC_PM_CALIDAD"       = :P_NUMERODOCPMCALIDAD,
        "PERIODICIDAD_MANTENIMIENTO"  = :P_PERIODICIDADMANTENIMIENTO,
        "DIA_INICIO_MANT"             = :P_DIAINICIOMANT,
        "DIA_FIN_MANT"                = :P_DIAFINMANT,
        "FECHA_INICIO_MANT"           = :P_FECHAINICIOMANT,
        "COMENTARIOS"                 = :P_COMENTARIOS,
        "CLASIFICACION"               = :P_CLASIFICACION,
        "FECHA_ULT_MOD"               = :V_FECHA_MEXICO
    WHERE "ID_EQUIPO" = :P_IDEQUIPO;

    SELECT 'OK' AS "Estatus" FROM DUMMY;
END
;

-- ----------------------------------------------------------------------------
-- 5) SpPdxMTTOObtenerMantenimientosPorRango
-- ----------------------------------------------------------------------------
-- ----------------------------------------------------------------------------
-- 5) SpPdxMTTOObtenerMantenimientosPorRango
-- ----------------------------------------------------------------------------
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
        TIEMPO_ARRANQUE             NVARCHAR(5000),        --    aqu-
		TIEMPO_LIBERACION_LINEA     NVARCHAR(5000),        --    aqu-
        FIRMA_REALIZO               NVARCHAR(5000),
        NOMBRE_REALIZO              NVARCHAR(200),
        FIRMA_SUPERVISO             NVARCHAR(5000),
        NOMBRE_SUPERVISO            NVARCHAR(200),
        FIRMA_MANTENIMIENTO         NVARCHAR(5000),
        NOMBRE_MANTENIMIENTO        NVARCHAR(200),
        TIENE_REFACCIONES           NVARCHAR(2),
        USUARIO                     NVARCHAR(50),
        FUE_REPROGRAMADO            NVARCHAR(2),   -- v3: ya se aplicó una reprogramación aceptada
        TIENE_SOLICITUD_PENDIENTE   NVARCHAR(2),    -- v3: hay una solicitud esperando aprobación
        ID_SOLICITUD_PENDIENTE      INT,            -- v4: para poder aceptar/rechazar desde el front
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
    -- Fechas BASE de cada ocurrencia, sin reprogramación aún
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
            ) <= ADD_MONTHS(:P_FECHA_FIN, E.INCREMENTO_MESES + 1)  -- v3: colchón +1 mes por posible reprogramación
            AND
            CASE
                WHEN E.DIA_FIN_MANT > DAYOFMONTH(LAST_DAY(ADD_MONTHS(E.FECHA_INICIO_MANT_DATE, S.NUM * E.INCREMENTO_MESES))) THEN
                    LAST_DAY(ADD_MONTHS(E.FECHA_INICIO_MANT_DATE, S.NUM * E.INCREMENTO_MESES))
                ELSE
                    ADD_DAYS(
                        ADD_MONTHS(E.FECHA_INICIO_MANT_DATE, S.NUM * E.INCREMENTO_MESES),
                        E.DIA_FIN_MANT - DAYOFMONTH(E.FECHA_INICIO_MANT_DATE)
                    )
            END >= ADD_MONTHS(:P_FECHA_INICIO, -1)  -- v3: colchón -1 mes por posible reprogramación
    ),
    -- v3: cruzamos con las OT ya generadas para conocer el NUMERO_ORDEN base de cada ocurrencia
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
    -- v3: resumen de solicitudes de reprogramación por NUMERO_ORDEN (aceptada / pendiente)
    ESTATUS_REPROGRAMACION AS (
        SELECT
            "NUMERO_ORDEN",
            "FECHA_REAL_INICIO",
            "FECHA_REAL_FIN",
            "ENVIAR_SIGUIENTE_MES",
            "MOTIVO",
            MAX(CASE WHEN "ESTATUS" = 'Aceptada'  THEN 1 ELSE 0 END) AS TIENE_ACEPTADA,
            MAX(CASE WHEN "ESTATUS" = 'Pendiente' THEN 1 ELSE 0 END) AS TIENE_PENDIENTE,
            -- v4: como solo puede haber 1 pendiente por orden (ya lo validamos en el stored de solicitud), tomamos ese ID
            MAX(CASE WHEN "ESTATUS" IN ('Aceptada', 'Pendiente', 'NA') THEN "ID_SOLICITUD" ELSE NULL END) AS ID_SOLICITUD_PENDIENTE,
            "ESTATUS"
        FROM "PdxMTTOSolicitudesReprogramacion"
        GROUP BY "NUMERO_ORDEN", "FECHA_REAL_INICIO", "FECHA_REAL_FIN", "ENVIAR_SIGUIENTE_MES", "MOTIVO", "ESTATUS"
    ),
    -- v3: aqu- se decide la fecha FINAL de cada ocurrencia (base o corrida +1 mes)
    MANTENIMIENTOS_AJUSTADOS AS (
        SELECT
            MC.*,
            CASE
                WHEN RA.TIENE_ACEPTADA = 1 OR RA."ESTATUS" = 'NA' THEN 'SI'
                ELSE 'NO'
            END AS FUE_REPROGRAMADO,
            CASE WHEN RA.TIENE_PENDIENTE = 1 THEN 'SI' ELSE 'NO' END AS TIENE_SOLICITUD_PENDIENTE,
            RA.ID_SOLICITUD_PENDIENTE AS ID_SOLICITUD_PENDIENTE,   -- v4
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
        -- agrega aqu-:
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
        COALESCE(M.ID_SOLICITUD_PENDIENTE, 0) AS ID_SOLICITUD_PENDIENTE,   -- v4
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
;

-- ----------------------------------------------------------------------------
-- 6) SpPdxMTTOObtenerMantenimientosCorrectivos
-- ----------------------------------------------------------------------------
-- ----------------------------------------------------------------------------
-- 6) SpPdxMTTOObtenerMantenimientosCorrectivos
-- ----------------------------------------------------------------------------
ALTER PROCEDURE "PTM_2022_FINAL"."SpPdxMTTOObtenerMantenimientosCorrectivos" (
    IN P_ID_SOLICITUD    INT,
    IN P_FECHA_INICIO    DATE,
    IN P_FECHA_FIN       DATE,
    IN P_FILTRO_AREA     INTEGER,
    IN P_FILTRO_LINEA    INTEGER,
    IN P_FILTRO_ORDEN    NVARCHAR(5000),
    IN P_FILTRO_PLANTA   INTEGER,
    IN P_FILTRO_ESTATUS  NVARCHAR(500),
    IN P_FILTRO_BUSQUEDA NVARCHAR(500),
    IN P_EXCLUIR_SINCRONIZADOS_PVC       NVARCHAR(1) DEFAULT NULL,
    IN P_EXCLUIR_SINCRONIZADOS_PEADLISO  NVARCHAR(1) DEFAULT NULL,
    IN P_EXCLUIR_SINCRONIZADOS_CORRUGADO NVARCHAR(1) DEFAULT NULL,
    IN P_EXCLUIR_SINCRONIZADOS_INYECCION NVARCHAR(1) DEFAULT NULL,
    IN P_FILTRO_POSICION_ID INTEGER  DEFAULT NULL,
    IN P_IDS_HERR NVARCHAR(500) DEFAULT NULL,
    IN P_IDS_MTTO NVARCHAR(500) DEFAULT NULL,
    IN P_LINEA_PROD INT DEFAULT NULL,
    IN P_FILTRO_CLASIFICACION NVARCHAR(50) DEFAULT NULL,
    IN P_FILTRO_EQUIPO        NVARCHAR(100) DEFAULT NULL
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN

    DECLARE lt_result TABLE (
        ID_SOLICITUD             INT,
        ID_EQUIPO                INT,
        PLANTA                   NVARCHAR(10),
        NUMERO_DOC_PM_CALIDAD    NVARCHAR(5000),
        NOMBRE_EQUIPO            NVARCHAR(5000),
        DESCRIPCION_EQUIPO       NVARCHAR(5000),
        IDAREA                   NVARCHAR(5000),
        AREA                     NVARCHAR(5000),
        ID_LINEA_PRODUCCION      NVARCHAR(5000),
        LINEA_PRODUCCION         NVARCHAR(5000),
        CENTRO_COSTOS            NVARCHAR(50),
        TIPO_MANTENIMIENTO       NVARCHAR(50),
        SOLICITANTE              NVARCHAR(100),
        NOMINA_SOLICITANTE       NVARCHAR(20),
        CLASE_MANTENIMIENTO      NVARCHAR(10),
        TEXTO_CORTO              NVARCHAR(500),
        AREA_TECNICA             NVARCHAR(255),
        CLASIFICACION            NVARCHAR(50),
        SCRAP                    NVARCHAR(20),
        HORA_CIERRE_MAN          NVARCHAR(5000),
        FECHA_CREACION           NVARCHAR(5000),
        NUMERO_ORDEN             NVARCHAR(5000),
        HORA_APERTURA            NVARCHAR(5000),
        HORA_CIERRE              NVARCHAR(5000),
        TIEMPO_INVERTIDO         NVARCHAR(5000),
        ESTATUS_ORDEN            INT,
        DESC_ESTATUS_ORDEN       NVARCHAR(100),
        ID_MANTENIMIENTO         INT,
        ORDEN_TRABAJO_FINALIZADA NVARCHAR(2),
        HORA_INICIO              NVARCHAR(5000),
        HORA_FIN                 NVARCHAR(5000),
        HORA_INICIO_TIME         NVARCHAR(5000),
        HORA_FIN_TIME            NVARCHAR(5000),
        TEXTO_SECUENCIA          NVARCHAR(1000),
        DURACION_HRS             NVARCHAR(50),
        FIRMA_REALIZO            NVARCHAR(5000),
        NOMBRE_REALIZO           NVARCHAR(200),
        FIRMA_SUPERVISO          NVARCHAR(5000),
        NOMBRE_SUPERVISO         NVARCHAR(200),
        FIRMA_MANTENIMIENTO      NVARCHAR(5000),
        NOMBRE_MANTENIMIENTO     NVARCHAR(200),
        MAQUINA_DETENIDA         TINYINT,
        TIENE_REFACCIONES        NVARCHAR(2)   -- nuevo
    );

    IF :P_FECHA_INICIO IS NULL THEN
        P_FECHA_INICIO := '1900-01-01';
    END IF;

    IF :P_FECHA_FIN IS NULL THEN
        P_FECHA_FIN := '2099-12-31';
    END IF;

    lt_result =
    SELECT
        S."ID_SOLICITUD",
        E."ID_EQUIPO",
        E."PLANTA",
        E."NUMERO_DOC_PM_CALIDAD",
        E."NOMBRE_EQUIPO",
        E."DESCRIPCION_EQUIPO",
        E."AREA"                    AS IDAREA,
        COALESCE(AE."AREA",   '')   AS AREA,
        E."LINEA_PRODUCCION"        AS ID_LINEA_PRODUCCION,
        COALESCE(LE."LINEA",  '')   AS LINEA_PRODUCCION,
        E."CENTRO_COSTOS",
        'Z10'                       AS TIPO_MANTENIMIENTO,
        S."SOLICITANTE",
        S."NOMINA_SOLICITANTE",
        S."CLASE_MANTENIMIENTO",
        S."TEXTO_CORTO",
        S."AREA_TECNICA",
        E."CLASIFICACION",
        COALESCE(OT."SCRAP", '')    AS SCRAP,
		CASE
		    WHEN OT."HORA_CIERRE_MAN" IS NULL THEN ''
		    ELSE TO_VARCHAR(OT."HORA_CIERRE_MAN", 'YYYY-MM-DD"T"HH24:MI:SS')  --
		END AS HORA_CIERRE_MAN,
        CASE
            WHEN S."FECHA_CREACION" IS NULL THEN ''
            ELSE TO_VARCHAR(S."FECHA_CREACION", 'DD/MM/YYYY HH24:MI:SS')
        END AS FECHA_CREACION,
        COALESCE(MCG."NUMERO_ORDEN", '') AS NUMERO_ORDEN,
        CASE
            WHEN MCG."HORA_APERTURA" IS NULL THEN ''
            ELSE TO_VARCHAR(MCG."HORA_APERTURA", 'DD/MM/YYYY HH24:MI:SS')
        END AS HORA_APERTURA,
        CASE
            WHEN MCG."HORA_CIERRE" IS NULL THEN ''
            ELSE TO_VARCHAR(MCG."HORA_CIERRE", 'DD/MM/YYYY HH24:MI:SS')
        END AS HORA_CIERRE,
        CASE
            WHEN MCG."ESTATUS" = 4
                 AND MCG."HORA_APERTURA" IS NOT NULL
                 AND MCG."HORA_CIERRE"   IS NOT NULL
            THEN TO_VARCHAR(
                    TO_DECIMAL(
                        SECONDS_BETWEEN(MCG."HORA_APERTURA", MCG."HORA_CIERRE") / 3600,
                        10, 2
                    )
                 )
            ELSE ''
        END AS TIEMPO_INVERTIDO,
        COALESCE(MCG."ESTATUS", 0)          AS ESTATUS_ORDEN,
        COALESCE(ESOT."DESCRIPCION", '')    AS DESC_ESTATUS_ORDEN,
        COALESCE(MCG."ID_MANTENIMIENTO", 0) AS ID_MANTENIMIENTO,
        CASE
            WHEN OT."ID_OT_DETALLE" IS NOT NULL
                AND LENGTH(TRIM(OT."FIRMA_REALIZO"))   > 0
                AND LENGTH(TRIM(OT."FIRMA_SUPERVISO")) > 0
            THEN 'SI'
            ELSE 'NO'
        END AS ORDEN_TRABAJO_FINALIZADA,
        CASE
		    WHEN OT."HORA_INICIO" IS NULL THEN ''
		    ELSE TO_VARCHAR(OT."HORA_INICIO", 'YYYY-MM-DD"T"HH24:MI:SS')
		END AS HORA_INICIO,
        CASE
		    WHEN OT."HORA_FIN" IS NULL THEN ''
		    ELSE TO_VARCHAR(OT."HORA_FIN", 'YYYY-MM-DD"T"HH24:MI:SS')
		END AS HORA_FIN,
        CASE
            WHEN OT."HORA_INICIO" IS NULL THEN ''
            ELSE TO_VARCHAR(OT."HORA_INICIO", 'HH24:MI:SS')
        END AS HORA_INICIO_TIME,
        CASE
            WHEN OT."HORA_FIN" IS NULL THEN ''
            ELSE TO_VARCHAR(OT."HORA_FIN", 'HH24:MI:SS')
        END AS HORA_FIN_TIME,
        COALESCE(OT."TEXTO_SECUENCIA", '') AS TEXTO_SECUENCIA,
        CASE
            WHEN OT."DURACION_HRS" IS NULL THEN ''
            ELSE CAST(OT."DURACION_HRS" AS NVARCHAR(50))
        END AS DURACION_HRS,
        CASE
            WHEN OT."FIRMA_REALIZO" IS NOT NULL AND LENGTH(TRIM(OT."FIRMA_REALIZO")) > 0
            THEN '/FirmasOTCorrectivo/' || MCG."NUMERO_ORDEN" || '/Firma_Realizo.png'
            ELSE ''
        END AS FIRMA_REALIZO,
        COALESCE(OT."NOMBRE_REALIZO", '') AS NOMBRE_REALIZO,
        CASE
            WHEN OT."FIRMA_SUPERVISO" IS NOT NULL AND LENGTH(TRIM(OT."FIRMA_SUPERVISO")) > 0
            THEN '/FirmasOTCorrectivo/' || MCG."NUMERO_ORDEN" || '/Firma_Superviso.png'
            ELSE ''
        END AS FIRMA_SUPERVISO,
        COALESCE(OT."NOMBRE_SUPERVISO", '') AS NOMBRE_SUPERVISO,
        CASE
            WHEN OT."FIRMA_MANTENIMIENTO" IS NOT NULL AND LENGTH(TRIM(OT."FIRMA_MANTENIMIENTO")) > 0
            THEN '/FirmasOTCorrectivo/' || MCG."NUMERO_ORDEN" || '/Firma_Mantenimiento.png'
            ELSE ''
        END AS FIRMA_MANTENIMIENTO,
        COALESCE(OT."NOMBRE_MANTENIMIENTO", '') AS NOMBRE_MANTENIMIENTO,
        COALESCE(OT."MAQUINA_DETENIDA", CAST(0 AS TINYINT)) AS MAQUINA_DETENIDA,
        -- nuevo: misma l--gica que preventivos, aplica para OTMC tambi-n
        CASE
            WHEN EXISTS (
                SELECT 1
                FROM "PdxMTTOMPSolicitudRefacciones" SR2
                WHERE SR2."ORDEN_TRABAJO" = MCG."NUMERO_ORDEN"
            ) THEN 'SI'
            ELSE 'NO'
        END AS TIENE_REFACCIONES

    FROM "PdxMTTOSolicitudMC" S
    INNER JOIN "PdxMTTOGestionEquipos" E
        ON S."ID_EQUIPO" = E."ID_EQUIPO"
    LEFT JOIN "PdxMTTOLineasxPlanta" LE
        ON E."LINEA_PRODUCCION" = LE."ID_LINEA"
    LEFT JOIN "PdxMTTOAreasxPlanta" AE
        ON E."AREA" = AE."ID_AREA"
    LEFT JOIN "PdxMTTOMCGenerados" MCG
        ON S."ID_SOLICITUD" = MCG."ID_SOLICITUD"
    LEFT JOIN "PdxMTTOEstatusOT" ESOT
        ON MCG."ESTATUS" = ESOT."ID_ESTATUS"
    LEFT JOIN "PdxMTTOOrdenesTrabajoMC" OT
        ON MCG."NUMERO_ORDEN" = OT."NUMERO_ORDEN"
    WHERE
        S."FECHA_CREACION" >= :P_FECHA_INICIO
        AND S."FECHA_CREACION" < ADD_DAYS(:P_FECHA_FIN, 1)
        AND (:P_ID_SOLICITUD IS NULL OR S."ID_SOLICITUD" = :P_ID_SOLICITUD)
        AND (:P_FILTRO_AREA IS NULL OR E."AREA" = :P_FILTRO_AREA)
        AND (:P_FILTRO_LINEA IS NULL OR E."LINEA_PRODUCCION" = :P_FILTRO_LINEA)
        AND (:P_FILTRO_ORDEN IS NULL OR MCG."NUMERO_ORDEN" = :P_FILTRO_ORDEN)
        AND (:P_FILTRO_PLANTA IS NULL OR E."PLANTA" = :P_FILTRO_PLANTA)
        AND (:P_LINEA_PROD IS NULL OR LE."PRODUCCION" = :P_LINEA_PROD)
        AND (
            :P_FILTRO_ESTATUS IS NULL
            OR LOCATE(:P_FILTRO_ESTATUS, CAST(MCG."ESTATUS" AS NVARCHAR)) > 0
        )
        AND (
            :P_FILTRO_BUSQUEDA IS NULL
            OR UPPER(E."NOMBRE_EQUIPO")        LIKE '%' || UPPER(:P_FILTRO_BUSQUEDA) || '%'
            OR UPPER(E."DESCRIPCION_EQUIPO")   LIKE '%' || UPPER(:P_FILTRO_BUSQUEDA) || '%'
            OR UPPER(COALESCE(AE."AREA", ''))  LIKE '%' || UPPER(:P_FILTRO_BUSQUEDA) || '%'
            OR UPPER(COALESCE(LE."LINEA", '')) LIKE '%' || UPPER(:P_FILTRO_BUSQUEDA) || '%'
        )
        AND (:P_FILTRO_CLASIFICACION IS NULL OR UPPER(COALESCE(E."CLASIFICACION",'')) = UPPER(:P_FILTRO_CLASIFICACION))
        AND (:P_FILTRO_EQUIPO IS NULL OR UPPER(E."NOMBRE_EQUIPO") LIKE '%' || UPPER(:P_FILTRO_EQUIPO) || '%')
         AND (
            :P_EXCLUIR_SINCRONIZADOS_PVC IS NULL
            OR :P_EXCLUIR_SINCRONIZADOS_PVC <> 'S'
            OR NOT EXISTS (
                SELECT 1 FROM "PdxMTTOTiemposMuertosProduccionPVC" TM
                WHERE TM."OTMC" LIKE '%"' || MCG."NUMERO_ORDEN" || '"%'
                  AND IFNULL(TM."ESTATUS", 'A') = 'A'
            )
        )
        AND (
            :P_EXCLUIR_SINCRONIZADOS_PEADLISO IS NULL
            OR :P_EXCLUIR_SINCRONIZADOS_PEADLISO <> 'S'
            OR NOT EXISTS (
              SELECT 1 FROM "PdxMTTOTiemposMuertosProduccionPeadLiso" TM
                WHERE TM."OTMC" LIKE '%"' || MCG."NUMERO_ORDEN" || '"%'
                  AND IFNULL(TM."ESTATUS", 'A') = 'A'
            )
        )
        AND (
            :P_EXCLUIR_SINCRONIZADOS_CORRUGADO IS NULL
            OR :P_EXCLUIR_SINCRONIZADOS_CORRUGADO <> 'S'
            OR NOT EXISTS (
            SELECT 1 FROM "PdxMTTOTiemposMuertosProduccionCorrugado" TM
                WHERE TM."OTMC" LIKE '%"' || MCG."NUMERO_ORDEN" || '"%'
                  AND IFNULL(TM."ESTATUS", 'A') = 'A'
            )
        )
        AND (
            :P_EXCLUIR_SINCRONIZADOS_INYECCION IS NULL
            OR :P_EXCLUIR_SINCRONIZADOS_INYECCION <> 'S'
            OR NOT EXISTS (
            SELECT 1 FROM "PdxMTTOTiemposMuertosProduccionINY" TM
                WHERE TM."OTMC" LIKE '%"' || MCG."NUMERO_ORDEN" || '"%'
                  AND IFNULL(TM."ESTATUS", 'A') = 'A'
            )
        )
        AND (
            :P_FILTRO_POSICION_ID IS NULL
            OR :P_IDS_HERR IS NULL
            OR :P_IDS_MTTO IS NULL
            OR (
                LOCATE(',' || :P_IDS_HERR || ',', ',' || CAST(:P_FILTRO_POSICION_ID AS NVARCHAR) || ',') > 0
                AND UPPER(COALESCE(S."AREA_TECNICA", '')) LIKE '%HERRAMENTAL%'
            )
            OR (
                LOCATE(',' || :P_IDS_MTTO || ',', ',' || CAST(:P_FILTRO_POSICION_ID AS NVARCHAR) || ',') > 0
                AND (S."AREA_TECNICA" IS NULL OR UPPER(S."AREA_TECNICA") NOT LIKE '%HERRAMENTAL%')
            )
            OR (
                LOCATE(',' || :P_IDS_HERR || ',', ',' || CAST(:P_FILTRO_POSICION_ID AS NVARCHAR) || ',') = 0
                AND LOCATE(',' || :P_IDS_MTTO || ',', ',' || CAST(:P_FILTRO_POSICION_ID AS NVARCHAR) || ',') = 0
            )
        )
    ORDER BY
    	CASE WHEN :P_LINEA_PROD IS NOT NULL THEN E."LINEA_PRODUCCION" ELSE NULL END ASC,
        MCG."NUMERO_ORDEN",
        MCG."HORA_APERTURA" DESC,
        S."FECHA_CREACION" DESC;

    SELECT * FROM :lt_result;

END
;

-- ----------------------------------------------------------------------------
-- 7) SpPdxMTTOMetricasOEE_PVC
-- ----------------------------------------------------------------------------
-- ----------------------------------------------------------------------------
-- 7) SpPdxMTTOMetricasOEE_PVC
-- ----------------------------------------------------------------------------
ALTER PROCEDURE "PTM_2022_FINAL"."SpPdxMTTOMetricasOEE_PVC" (
    IN P_FECHA_INICIO DATE,
    IN P_FECHA_FIN    DATE,
    IN P_LINEA        NVARCHAR(50),
    IN P_PLANTA       INT,
    IN P_CLASIFICACION NVARCHAR(50) DEFAULT NULL
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN
WITH

-- ----------------------------------------------------------------------------
-- NOTA DE DISE-O (DT vs DISPONIBILIDAD)
-- MTTR y MTBF salen del mismo universo de paros (las 10 columnas de "Tiempo
-- no productivo"). Con eso:
-- MTBF + MTTR = TIEMPO_DISPONIBLE / N° de paradas
-- DT = MTBF / (MTBF + MTTR) = (TIEMPO_DISPONIBLE - HORAS_PARO) / TIEMPO_DISPONIBLE
--
-- La Disponibilidad del OEE usa la MISMA definicion que el front (por fila):
-- Disponibilidad = TIEMPO_PRODUCTIVO / TIEMPO_DISPONIBLE
-- En el resumen del periodo se pondera por capacidad (kg) para que
-- Disponibilidad x Rendimiento x Calidad = OEE del periodo (ver PROMEDIOS).
-- Por eso Disponibilidad (capacidad) y DT (horas) pueden diferir ligeramente
-- (validado sept 2026 PVC: Disponibilidad ~57.53 vs DT ~55.78).
--
-- Si el usuario espera un DT basado solo en paros t-cnicos, restringir
-- HORAS_PARO a (MTTO_CORRECTIVOS, FALLA_ELECTRICA, SERVICIOS, HERRAMENTAL,
-- FALLA_OPERACION, FALTA_REFACCIONES) y ajustar el denominador de paradas
-- en consecuencia (ID_PARO no indica a qu- columna pertenece cada paro).
--
-- NOTA: MTTR, MTBF, DT y OEE salen de la bit-cora (fuente nica). Se elimin
-- P_AREA como par-metro (cada proceso tiene su tabla), MTTA y FPY (no est-n
-- en los KPIs solicitados). El nico KPI que consulta fuera de la bit-cora es
-- % Cumplimiento PM, porque la bit-cora no trae los PM programados.
-- La bit-cora garantiza que una OT no se sincroniza dos veces (sin DISTINCT).
--
-- NOTA: SIN REDONDEO. Los KPIs se devuelven con la m-xima precisin (DOUBLE).
-- Las divisiones parten de TO_DOUBLE para evitar que la aritm-tica DECIMAL de
-- HANA trunque la escala. El formato de presentación es responsabilidad del
-- front.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- BITACORA_FILTRADA
-- Fuente nica. Trae todo lo capturado en el rango/l-nea/planta.
-- HORAS_PARO       = -- de las 10 columnas de "Tiempo no productivo"
-- N_OTMC           = OT correctivas del JSON: ["OTMC-004","OTMC-007"] -> 2
-- N_PAROS_MANUALES = IDs separados por pipe: 1|14|17 -> 3
-- ----------------------------------------------------------------------------
BITACORA_FILTRADA AS (
    SELECT
        "DISPONIBILIDAD_PORCENTAJE",
        "PORCENTAJE_RENDIMIENTO",
        "PORCENTAJE_CALIDAD",
        "PORCENTAJE_OEE",
        "HORAS_PROGRAMADAS",
        "TIEMPO_DISPONIBLE",
        "TIEMPO_PRODUCTIVO",
        "PRODUCCION_NETA_REAL",
        "TOTAL_SCRAP_KG",
        "KG_HR_PRODUCTO",
        "KG_POR_TIEMPO_DISPONIBLE",
          CASE
            WHEN :P_CLASIFICACION = 'MANTENIMIENTO' THEN IFNULL("MTTO_CORRECTIVOS", 0)
            WHEN :P_CLASIFICACION = 'HERRAMENTALES' THEN IFNULL("HERRAMENTAL", 0)
            ELSE IFNULL("MTTO_CORRECTIVOS", 0) + IFNULL("HERRAMENTAL", 0)
        END AS HORAS_PARO,
        --+ IFNULL("FALLA_OPERACION", 0)
        --+ IFNULL("LIMPIEZA_TANQUE", 0)
        --+ IFNULL("FALTA_MATERIAL", 0)
        --+ IFNULL("FALTA_PERSONAL", 0)
        --+ IFNULL("FALTA_REFACCIONES", 0)
        CASE
            WHEN :P_CLASIFICACION = 'MANTENIMIENTO'
                 AND IFNULL("MTTO_CORRECTIVOS", 0) = 0 THEN 0
            WHEN :P_CLASIFICACION = 'HERRAMENTALES'
                 AND IFNULL("HERRAMENTAL", 0) = 0 THEN 0
            ELSE IFNULL(OCCURRENCES_REGEXPR('OTMC-' IN TO_NVARCHAR("OTMC")), 0)
        END AS N_OTMC,
        IFNULL(OCCURRENCES_REGEXPR('[^|]+' IN TO_NVARCHAR("ID_PARO")), 0) AS N_PAROS_MANUALES
    FROM "PdxMTTOTiemposMuertosProduccionPVC"
    WHERE "ESTATUS" = 'A'
      AND ((:P_FECHA_INICIO IS NULL OR :P_FECHA_FIN IS NULL)
           OR ("FECHA" BETWEEN :P_FECHA_INICIO AND :P_FECHA_FIN))
      AND (:P_LINEA  IS NULL OR "LINEA"  = :P_LINEA)
      AND (:P_PLANTA IS NULL OR "PLANTA" = TO_NVARCHAR(:P_PLANTA))
),

-- ----------------------------------------------------------------------------
-- TOTALES: sumatorias sobre TODAS las filas del rango
-- ----------------------------------------------------------------------------
TOTALES AS (
    SELECT
        IFNULL(SUM("HORAS_PROGRAMADAS"), 0) AS TOTAL_HORAS,
        IFNULL(SUM("TIEMPO_DISPONIBLE"), 0) AS TOTAL_DISPONIBLE,
        IFNULL(SUM("TIEMPO_PRODUCTIVO"), 0) AS TOTAL_PRODUCTIVO,
        COUNT(*)                            AS TOTAL_FILAS
    FROM BITACORA_FILTRADA
),

-- ----------------------------------------------------------------------------
-- PROMEDIOS (OEE del periodo ponderado por capacidad en kg)
-- Formulas por fila (iguales al front, GestionProduccionPVC.js):
-- Disponibilidad = TiempoProductivo / TiempoDisponible
-- Rendimiento    = ((Prod + Scrap) / TiempoProductivo) / KgHrProducto
-- Calidad        = Prod / (Prod + Scrap)
-- OEE            = D x R x C  =  Prod / (TiempoDisponible x KgHrProducto)
-- Al multiplicarlas se cancelan los terminos, asi que para el periodo se
-- suman las capacidades (kg) y se calcula:
-- CAP_DISPONIBLE = -- KG_POR_TIEMPO_DISPONIBLE   (TiempoDisponible x KgHrProducto)
-- CAP_PRODUCTIVA = -- TIEMPO_PRODUCTIVO x KG_HR_PRODUCTO
-- KG_BRUTOS      = -- (Produccion neta + Scrap)
-- KG_NETOS       = -- Produccion neta
-- Disponibilidad = CAP_PRODUCTIVA / CAP_DISPONIBLE
-- Rendimiento    = KG_BRUTOS / CAP_PRODUCTIVA
-- Calidad        = KG_NETOS / KG_BRUTOS
-- OEE            = KG_NETOS / CAP_DISPONIBLE  (= D x R x C exacto)
-- Se excluyen filas sin KG_HR_PRODUCTO (sin capacidad definida); un turno
-- con OEE real de 0 SI cuenta en el periodo.
-- Validado (valores redondeados a 2 dec.): septiembre 2026, PVC, todas las
-- l-neas -> Disponibilidad 57.53, Rendimiento 34.16, Calidad 80.26, OEE 15.77
-- Validado: L-NEA 1 PVC ->
-- Disponibilidad 41.74, Rendimiento 52.29, Calidad 80.00, OEE 17.46
-- ----------------------------------------------------------------------------
PROMEDIOS_BASE AS (
    SELECT
        IFNULL(SUM("KG_POR_TIEMPO_DISPONIBLE"), 0)                        AS CAP_DISPONIBLE,
        IFNULL(SUM("TIEMPO_PRODUCTIVO" * "KG_HR_PRODUCTO"), 0)            AS CAP_PRODUCTIVA,
        IFNULL(SUM(IFNULL("PRODUCCION_NETA_REAL", 0)
                 + IFNULL("TOTAL_SCRAP_KG", 0)), 0)                       AS KG_BRUTOS,
        IFNULL(SUM(IFNULL("PRODUCCION_NETA_REAL", 0)), 0)                 AS KG_NETOS
    FROM BITACORA_FILTRADA
    WHERE IFNULL("KG_HR_PRODUCTO", 0) > 0
),
PROMEDIOS AS (
    SELECT
        TO_DOUBLE(CAP_PRODUCTIVA) / NULLIF(CAP_DISPONIBLE, 0) * 100 AS AVG_DISPONIBILIDAD,
        TO_DOUBLE(KG_BRUTOS)      / NULLIF(CAP_PRODUCTIVA, 0) * 100 AS AVG_RENDIMIENTO,
        TO_DOUBLE(KG_NETOS)       / NULLIF(KG_BRUTOS, 0)      * 100 AS AVG_CALIDAD,
        TO_DOUBLE(KG_NETOS)       / NULLIF(CAP_DISPONIBLE, 0) * 100 AS OEE_CALCULADO
    FROM PROMEDIOS_BASE
),

-- ----------------------------------------------------------------------------
-- MTTR_TOTAL
-- MTTR = -- horas de paro / N de paradas (OTMC + paros manuales) se quitaron los paros manuales
-- ----------------------------------------------------------------------------
MTTR_TOTAL AS (
    SELECT
        IFNULL(SUM(HORAS_PARO), 0)                 AS TIEMPO_REPARACION_TOTAL_HRS,
        IFNULL(SUM(N_OTMC), 0)                     AS TOTAL_OTMC,
        IFNULL(SUM(N_PAROS_MANUALES), 0)           AS TOTAL_PAROS_MANUALES,
        IFNULL(SUM(N_OTMC /*+ N_PAROS_MANUALES*/), 0)  AS TOTAL_PARADAS,
        CASE WHEN SUM(N_OTMC /*+ N_PAROS_MANUALES*/) > 0
             THEN TO_DOUBLE(SUM(HORAS_PARO)) / SUM(N_OTMC /*+ N_PAROS_MANUALES*/)
        END                                        AS MTTR_HRS_EXACTO,
        CASE WHEN SUM(N_OTMC /*+ N_PAROS_MANUALES*/) > 0
             THEN TO_DOUBLE(SUM(HORAS_PARO)) / SUM(N_OTMC /*+ N_PAROS_MANUALES*/)
             ELSE 0
        END                                        AS MTTR_HRS
    FROM BITACORA_FILTRADA
),

-- ----------------------------------------------------------------------------
-- MTBF_TOTAL
-- MTBF = (Tiempo disponible - Tiempo de inactividad) / N° de paradas
-- Sin paradas -> NULL (el front debe manejarlo; DT lo trata como 100).
-- ----------------------------------------------------------------------------
MTBF_TOTAL AS (
    SELECT
        CASE WHEN SUM(N_OTMC /*+ N_PAROS_MANUALES*/) > 0
             THEN TO_DOUBLE(SUM(IFNULL("TIEMPO_DISPONIBLE", 0)) - SUM(HORAS_PARO))
                  / SUM(N_OTMC /*+ N_PAROS_MANUALES*/)
        END AS MTBF_HRS_EXACTO,
        CASE WHEN SUM(N_OTMC /*+ N_PAROS_MANUALES*/) > 0
             THEN TO_DOUBLE(SUM(IFNULL("TIEMPO_DISPONIBLE", 0)) - SUM(HORAS_PARO))
                  / SUM(N_OTMC /*+ N_PAROS_MANUALES*/)
        END AS MTBF_HRS
    FROM BITACORA_FILTRADA
),

-- ----------------------------------------------------------------------------
-- DT_TOTAL (Disponibilidad T-cnica) = MTBF / (MTBF + MTTR) * 100
-- Sin paradas -> 100.
-- ----------------------------------------------------------------------------
DT_TOTAL AS (
    SELECT
        CASE
            WHEN M.TOTAL_PARADAS = 0 THEN 100
            WHEN (MB.MTBF_HRS_EXACTO + M.MTTR_HRS_EXACTO) > 0
                 THEN MB.MTBF_HRS_EXACTO / (MB.MTBF_HRS_EXACTO + M.MTTR_HRS_EXACTO) * 100
            ELSE NULL
        END AS DT_PORCENTAJE
    FROM MTBF_TOTAL MB
    CROSS JOIN MTTR_TOTAL M
),

-- ----------------------------------------------------------------------------
-- CUMPLIMIENTO_PM_FILTRADO / CUMPLIMIENTO_PM_TOTAL  (% PM)
-- -nico bloque que consulta fuera de la bit-cora: la bit-cora solo trae los
-- PM ejecutados (OTMP), no los programados, por eso sale de PdxMTTOMPGenerados.
-- Nace con HORA_APERTURA (PdxMTTOMPGenerados).
-- REGLA: cumplido = ESTATUS 4 (Cerrado, incluye "En proceso de firmas").
-- Cualquier otro estatus (ej. 2 = Liberado) cuenta como programado pero NO
-- cumplido.
-- --REA: PdxMTTOGestionEquipos mezcla equipos de todos los procesos y guarda
-- el ID_AREA num-rico. El ID de "PVC" no es fijo entre plantas (1 en planta 1,
-- 14 en planta 2), por eso se filtra por NOMBRE de -rea contra el cat-logo
-- PdxMTTOAreasxPlanta en vez de hardcodear un ID.
-- Validado: septiembre 2026, PVC -> 6 programados, 3 cerrados, 50 %
-- (L-NEA 4 PVC: 4 / 3 / 75 %; L-NEA 6 PVC: 2 / 0 / 0 %)
-- ----------------------------------------------------------------------------
CUMPLIMIENTO_PM_FILTRADO AS (
    SELECT
        MP."ID_MANTENIMIENTO",
        MP."ESTATUS"
    FROM "PdxMTTOMPGenerados" MP
    INNER JOIN "PdxMTTOGestionEquipos" E
        ON MP."ID_EQUIPO" = E."ID_EQUIPO"
    INNER JOIN "PdxMTTOAreasxPlanta" A
        ON E."AREA" = A."ID_AREA"
       AND A."AREA" = 'PVC'
    LEFT JOIN "PdxMTTOLineasxPlanta" LE
        ON E."LINEA_PRODUCCION" = LE."ID_LINEA"
    WHERE
        MP."HORA_APERTURA" IS NOT NULL
        AND ((:P_FECHA_INICIO IS NULL OR :P_FECHA_FIN IS NULL)
             OR (MP."HORA_APERTURA" >= :P_FECHA_INICIO
                 AND MP."HORA_APERTURA" < ADD_DAYS(:P_FECHA_FIN, 1)))
        AND (:P_LINEA  IS NULL OR LE."LINEA" = :P_LINEA)
        AND (:P_PLANTA IS NULL OR E."PLANTA" = TO_INT(:P_PLANTA))
        AND (:P_CLASIFICACION IS NULL OR E."CLASIFICACION" = :P_CLASIFICACION)
),
CUMPLIMIENTO_PM_TOTAL AS (
    SELECT
        COUNT(*) AS TOTAL_PM_PROGRAMADOS,
        IFNULL(SUM(CASE WHEN "ESTATUS" = 4 THEN 1 ELSE 0 END), 0) AS TOTAL_PM_CERRADOS,
        CASE WHEN COUNT(*) > 0
             THEN TO_DOUBLE(SUM(CASE WHEN "ESTATUS" = 4 THEN 1 ELSE 0 END)) * 100.0 / COUNT(*)
             ELSE TO_DOUBLE(0)
        END AS PORCENTAJE_CUMPLIMIENTO_PM
    FROM CUMPLIMIENTO_PM_FILTRADO
)

-- ----------------------------------------------------------------------------
-- SELECT FINAL
-- ----------------------------------------------------------------------------
SELECT
    -- Base / OEE
    T.TOTAL_HORAS,
    T.TOTAL_DISPONIBLE,
    T.TOTAL_PRODUCTIVO,
    T.TOTAL_FILAS,
    (T.TOTAL_HORAS - T.TOTAL_PRODUCTIVO) AS TIEMPO_MUERTO,
    P.AVG_DISPONIBILIDAD AS DISPONIBILIDAD,
    P.AVG_RENDIMIENTO    AS RENDIMIENTO,
    P.AVG_CALIDAD        AS CALIDAD,
    P.OEE_CALCULADO      AS OEE,
    PB.CAP_DISPONIBLE,
    PB.CAP_PRODUCTIVA,
    PB.KG_BRUTOS,
    PB.KG_NETOS,


    -- MTTR
    M.TIEMPO_REPARACION_TOTAL_HRS,
    M.TOTAL_OTMC,
    M.TOTAL_PAROS_MANUALES,
    M.TOTAL_PARADAS,
    M.MTTR_HRS,

    -- MTBF
    MB.MTBF_HRS,

    -- Disponibilidad T-cnica
    DT.DT_PORCENTAJE,

    -- % Cumplimiento PM
    PM.TOTAL_PM_PROGRAMADOS,
    PM.TOTAL_PM_CERRADOS,
    PM.PORCENTAJE_CUMPLIMIENTO_PM
FROM TOTALES T
LEFT JOIN PROMEDIOS   P  ON 1=1
LEFT JOIN PROMEDIOS_BASE PB ON 1=1
LEFT JOIN MTTR_TOTAL  M  ON 1=1
LEFT JOIN MTBF_TOTAL  MB ON 1=1
LEFT JOIN DT_TOTAL    DT ON 1=1
LEFT JOIN CUMPLIMIENTO_PM_TOTAL PM ON 1=1;
END
;

-- ----------------------------------------------------------------------------
-- 8) SpPdxMTTOMetricasOEE_PeadLiso
-- ----------------------------------------------------------------------------
-- ----------------------------------------------------------------------------
-- 8) SpPdxMTTOMetricasOEE_PeadLiso
-- ----------------------------------------------------------------------------
ALTER PROCEDURE "PTM_2022_FINAL"."SpPdxMTTOMetricasOEE_PeadLiso" (
    IN P_FECHA_INICIO DATE,
    IN P_FECHA_FIN    DATE,
    IN P_LINEA        NVARCHAR(50),
    IN P_PLANTA       INT,
    IN P_CLASIFICACION NVARCHAR(50) DEFAULT NULL
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN
WITH

-- ----------------------------------------------------------------------------
-- NOTA DE DISE-O (DT vs DISPONIBILIDAD)
-- MTTR y MTBF salen de la bit-cora. HORAS_PARO solo suma los paros t-cnicos
-- (TIEMPO_MUERTO_CORRECTIVOS + TIEMPO_MUERTO_HERRAMENTALES) y el N° de
-- paradas son SOLO las OT correctivas (OTMC); los paros manuales ya no
-- cuentan como parada.
-- Con eso:
-- MTBF + MTTR = TIEMPO_DISPONIBLE / N° de paradas
-- DT = MTBF / (MTBF + MTTR) = (TIEMPO_DISPONIBLE - HORAS_PARO) / TIEMPO_DISPONIBLE
--
-- La Disponibilidad del OEE usa la MISMA definicion que el front (por fila):
-- Disponibilidad = TIEMPO_PRODUCTIVO / TIEMPO_DISPONIBLE
-- En el resumen del periodo se pondera por capacidad (kg) para que
-- Disponibilidad x Rendimiento x Calidad = OEE del periodo (ver PROMEDIOS).
-- Por eso Disponibilidad (capacidad) y DT (horas) pueden diferir ligeramente.
--
-- NOTA: MTTR, MTBF, DT y OEE salen de la bit-cora (fuente nica). Se elimin
-- P_AREA como par-metro (cada proceso tiene su tabla), MTTA y FPY (no est-n
-- en los KPIs solicitados). El nico KPI que consulta fuera de la bit-cora es
-- % Cumplimiento PM, porque la bit-cora no trae los PM programados.
-- La bit-cora garantiza que una OT no se sincroniza dos veces (sin DISTINCT).
--
-- NOTA: SIN REDONDEO. Los KPIs se devuelven con la m-xima precisin (DOUBLE).
-- Las divisiones parten de TO_DOUBLE para evitar que la aritm-tica DECIMAL de
-- HANA trunque la escala. El formato de presentación es responsabilidad del
-- front.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- BITACORA_FILTRADA
-- Fuente nica. Trae todo lo capturado en el rango/l-nea/planta.
-- HORAS_PARO       = TIEMPO_MUERTO_CORRECTIVOS + TIEMPO_MUERTO_HERRAMENTALES
-- (las otras 3 columnas de "Tiempo no productivo" quedan
-- comentadas: CAMBIO_MOLDE_SETUP_EXCESOS, FALTA_PERSONAL,
-- TIEMPO_MUERTO_PROCESO)
-- N_OTMC           = OT correctivas del JSON: ["OTMC-004","OTMC-007"] -> 2
-- N_PAROS_MANUALES = IDs separados por pipe: 1|14|17 -> 3 (solo informativo,
-- ya no se usa para MTTR/MTBF)
-- ----------------------------------------------------------------------------
BITACORA_FILTRADA AS (
    SELECT
        "DISPONIBILIDAD_PORCENTAJE",
        "PORCENTAJE_RENDIMIENTO",
        "PORCENTAJE_CALIDAD",
        "PORCENTAJE_OEE",
        "HORAS_PROGRAMADAS",
        "TIEMPO_DISPONIBLE",
        "TIEMPO_PRODUCTIVO",
        "PRODUCCION_NETA"  AS "PRODUCCION_NETA_REAL",   -- alias: en PeadLiso no existe _REAL
        "TOTAL_SCRAP"      AS "TOTAL_SCRAP_KG",         -- alias: en PeadLiso no existe _KG
        "KG_HR_PRODUCTO",
        "KG_POR_TIEMPO_DISPONIBLE",
          CASE
            WHEN :P_CLASIFICACION = 'MANTENIMIENTO' THEN IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0)
            WHEN :P_CLASIFICACION = 'HERRAMENTALES' THEN IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0)
            ELSE IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0) + IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0)
        END AS HORAS_PARO,
        --+ IFNULL("CAMBIO_MOLDE_SETUP_EXCESOS", 0)
        --+ IFNULL("FALTA_PERSONAL", 0)
        --+ IFNULL("TIEMPO_MUERTO_PROCESO", 0)
        CASE
            WHEN :P_CLASIFICACION = 'MANTENIMIENTO'
                 AND IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0) = 0 THEN 0
            WHEN :P_CLASIFICACION = 'HERRAMENTALES'
                 AND IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0) = 0 THEN 0
            ELSE IFNULL(OCCURRENCES_REGEXPR('OTMC-' IN TO_NVARCHAR("OTMC")), 0)
        END AS N_OTMC,
        IFNULL(OCCURRENCES_REGEXPR('[^|]+' IN TO_NVARCHAR("ID_PARO")), 0) AS N_PAROS_MANUALES
    FROM "PdxMTTOTiemposMuertosProduccionPeadLiso"
    WHERE "ESTATUS" = 'A'
      AND ((:P_FECHA_INICIO IS NULL OR :P_FECHA_FIN IS NULL)
           OR ("FECHA" BETWEEN :P_FECHA_INICIO AND :P_FECHA_FIN))
      AND (:P_LINEA  IS NULL OR "LINEA"  = :P_LINEA)
      AND (:P_PLANTA IS NULL OR "PLANTA" = TO_NVARCHAR(:P_PLANTA))
),

-- ----------------------------------------------------------------------------
-- TOTALES: sumatorias sobre TODAS las filas del rango
-- ----------------------------------------------------------------------------
TOTALES AS (
    SELECT
        IFNULL(SUM("HORAS_PROGRAMADAS"), 0) AS TOTAL_HORAS,
        IFNULL(SUM("TIEMPO_DISPONIBLE"), 0) AS TOTAL_DISPONIBLE,
        IFNULL(SUM("TIEMPO_PRODUCTIVO"), 0) AS TOTAL_PRODUCTIVO,
        COUNT(*)                            AS TOTAL_FILAS
    FROM BITACORA_FILTRADA
),

-- ----------------------------------------------------------------------------
-- PROMEDIOS (OEE del periodo ponderado por capacidad en kg)
-- Formulas por fila (iguales al front):
-- Disponibilidad = TiempoProductivo / TiempoDisponible
-- Rendimiento    = ((Prod + Scrap) / TiempoProductivo) / KgHrProducto
-- Calidad        = Prod / (Prod + Scrap)
-- OEE            = D x R x C  =  Prod / (TiempoDisponible x KgHrProducto)
-- Al multiplicarlas se cancelan los terminos, asi que para el periodo se
-- suman las capacidades (kg) y se calcula:
-- CAP_DISPONIBLE = -- KG_POR_TIEMPO_DISPONIBLE   (TiempoDisponible x KgHrProducto)
-- CAP_PRODUCTIVA = -- TIEMPO_PRODUCTIVO x KG_HR_PRODUCTO
-- KG_BRUTOS      = -- (Produccion neta + Scrap)
-- KG_NETOS       = -- Produccion neta
-- Disponibilidad = CAP_PRODUCTIVA / CAP_DISPONIBLE
-- Rendimiento    = KG_BRUTOS / CAP_PRODUCTIVA
-- Calidad        = KG_NETOS / KG_BRUTOS
-- OEE            = KG_NETOS / CAP_DISPONIBLE  (= D x R x C exacto)
-- Se excluyen filas sin KG_HR_PRODUCTO (sin capacidad definida); un turno
-- con OEE real de 0 SI cuenta en el periodo.
-- Validado (valores redondeados a 2 dec.): pendiente, llenar al probar
-- PEAD LISO, todas las l-neas -> Disponibilidad __, Rendimiento __, Calidad __, OEE __
-- ----------------------------------------------------------------------------
PROMEDIOS_BASE AS (
    SELECT
        IFNULL(SUM("KG_POR_TIEMPO_DISPONIBLE"), 0)                        AS CAP_DISPONIBLE,
        IFNULL(SUM("TIEMPO_PRODUCTIVO" * "KG_HR_PRODUCTO"), 0)            AS CAP_PRODUCTIVA,
        IFNULL(SUM(IFNULL("PRODUCCION_NETA_REAL", 0)
                 + IFNULL("TOTAL_SCRAP_KG", 0)), 0)                       AS KG_BRUTOS,
        IFNULL(SUM(IFNULL("PRODUCCION_NETA_REAL", 0)), 0)                 AS KG_NETOS
    FROM BITACORA_FILTRADA
    WHERE IFNULL("KG_HR_PRODUCTO", 0) > 0
),
PROMEDIOS AS (
    SELECT
        TO_DOUBLE(CAP_PRODUCTIVA) / NULLIF(CAP_DISPONIBLE, 0) * 100 AS AVG_DISPONIBILIDAD,
        TO_DOUBLE(KG_BRUTOS)      / NULLIF(CAP_PRODUCTIVA, 0) * 100 AS AVG_RENDIMIENTO,
        TO_DOUBLE(KG_NETOS)       / NULLIF(KG_BRUTOS, 0)      * 100 AS AVG_CALIDAD,
        TO_DOUBLE(KG_NETOS)       / NULLIF(CAP_DISPONIBLE, 0) * 100 AS OEE_CALCULADO
    FROM PROMEDIOS_BASE
),

-- ----------------------------------------------------------------------------
-- MTTR_TOTAL
-- MTTR = -- horas de paro / N de paradas (solo OTMC; se quitaron los paros
-- manuales)
-- ----------------------------------------------------------------------------
MTTR_TOTAL AS (
    SELECT
        IFNULL(SUM(HORAS_PARO), 0)                 AS TIEMPO_REPARACION_TOTAL_HRS,
        IFNULL(SUM(N_OTMC), 0)                     AS TOTAL_OTMC,
        IFNULL(SUM(N_PAROS_MANUALES), 0)           AS TOTAL_PAROS_MANUALES,
        IFNULL(SUM(N_OTMC /*+ N_PAROS_MANUALES*/), 0)  AS TOTAL_PARADAS,
        CASE WHEN SUM(N_OTMC /*+ N_PAROS_MANUALES*/) > 0
             THEN TO_DOUBLE(SUM(HORAS_PARO)) / SUM(N_OTMC /*+ N_PAROS_MANUALES*/)
        END                                        AS MTTR_HRS_EXACTO,
        CASE WHEN SUM(N_OTMC /*+ N_PAROS_MANUALES*/) > 0
             THEN TO_DOUBLE(SUM(HORAS_PARO)) / SUM(N_OTMC /*+ N_PAROS_MANUALES*/)
             ELSE 0
        END                                        AS MTTR_HRS
    FROM BITACORA_FILTRADA
),

-- ----------------------------------------------------------------------------
-- MTBF_TOTAL
-- MTBF = (Tiempo disponible - Tiempo de inactividad) / N° de paradas (OTMC)
-- Sin paradas -> NULL (el front debe manejarlo; DT lo trata como 100).
-- ----------------------------------------------------------------------------
MTBF_TOTAL AS (
    SELECT
        CASE WHEN SUM(N_OTMC /*+ N_PAROS_MANUALES*/) > 0
             THEN TO_DOUBLE(SUM(IFNULL("TIEMPO_DISPONIBLE", 0)) - SUM(HORAS_PARO))
                  / SUM(N_OTMC /*+ N_PAROS_MANUALES*/)
        END AS MTBF_HRS_EXACTO,
        CASE WHEN SUM(N_OTMC /*+ N_PAROS_MANUALES*/) > 0
             THEN TO_DOUBLE(SUM(IFNULL("TIEMPO_DISPONIBLE", 0)) - SUM(HORAS_PARO))
                  / SUM(N_OTMC /*+ N_PAROS_MANUALES*/)
        END AS MTBF_HRS
    FROM BITACORA_FILTRADA
),

-- ----------------------------------------------------------------------------
-- DT_TOTAL (Disponibilidad T-cnica) = MTBF / (MTBF + MTTR) * 100
-- Sin paradas -> 100.
-- ----------------------------------------------------------------------------
DT_TOTAL AS (
    SELECT
        CASE
            WHEN M.TOTAL_PARADAS = 0 THEN 100
            WHEN (MB.MTBF_HRS_EXACTO + M.MTTR_HRS_EXACTO) > 0
                 THEN MB.MTBF_HRS_EXACTO / (MB.MTBF_HRS_EXACTO + M.MTTR_HRS_EXACTO) * 100
            ELSE NULL
        END AS DT_PORCENTAJE
    FROM MTBF_TOTAL MB
    CROSS JOIN MTTR_TOTAL M
),

-- ----------------------------------------------------------------------------
-- CUMPLIMIENTO_PM_FILTRADO / CUMPLIMIENTO_PM_TOTAL  (% PM)
-- -nico bloque que consulta fuera de la bit-cora: la bit-cora solo trae los
-- PM ejecutados (OTMP), no los programados, por eso sale de PdxMTTOMPGenerados.
-- Nace con HORA_APERTURA (PdxMTTOMPGenerados).
-- REGLA: cumplido = ESTATUS 4 (Cerrado, incluye "En proceso de firmas").
-- Cualquier otro estatus (ej. 2 = Liberado) cuenta como programado pero NO
-- cumplido.
-- --REA: PdxMTTOGestionEquipos mezcla equipos de todos los procesos y guarda
-- el ID_AREA num-rico. El ID no es fijo entre plantas, por eso se filtra por
-- NOMBRE de -rea contra el cat-logo PdxMTTOAreasxPlanta en vez de hardcodear
-- un ID.
-- Validado: pendiente, llenar al probar
-- ----------------------------------------------------------------------------
CUMPLIMIENTO_PM_FILTRADO AS (
    SELECT
        MP."ID_MANTENIMIENTO",
        MP."ESTATUS"
    FROM "PdxMTTOMPGenerados" MP
    INNER JOIN "PdxMTTOGestionEquipos" E
        ON MP."ID_EQUIPO" = E."ID_EQUIPO"
    INNER JOIN "PdxMTTOAreasxPlanta" A
        ON E."AREA" = A."ID_AREA"
       AND A."AREA" = 'PEAD LISO'          -- confirmar nombre exacto en PdxMTTOAreasxPlanta
    LEFT JOIN "PdxMTTOLineasxPlanta" LE
        ON E."LINEA_PRODUCCION" = LE."ID_LINEA"
    WHERE
        MP."HORA_APERTURA" IS NOT NULL
        AND ((:P_FECHA_INICIO IS NULL OR :P_FECHA_FIN IS NULL)
             OR (MP."HORA_APERTURA" >= :P_FECHA_INICIO
                 AND MP."HORA_APERTURA" < ADD_DAYS(:P_FECHA_FIN, 1)))
        AND (:P_LINEA  IS NULL OR LE."LINEA" = :P_LINEA)
        AND (:P_PLANTA IS NULL OR E."PLANTA" = TO_INT(:P_PLANTA))
        AND (:P_CLASIFICACION IS NULL OR E."CLASIFICACION" = :P_CLASIFICACION)
),
CUMPLIMIENTO_PM_TOTAL AS (
    SELECT
        COUNT(*) AS TOTAL_PM_PROGRAMADOS,
        IFNULL(SUM(CASE WHEN "ESTATUS" = 4 THEN 1 ELSE 0 END), 0) AS TOTAL_PM_CERRADOS,
        CASE WHEN COUNT(*) > 0
             THEN TO_DOUBLE(SUM(CASE WHEN "ESTATUS" = 4 THEN 1 ELSE 0 END)) * 100.0 / COUNT(*)
             ELSE TO_DOUBLE(0)
        END AS PORCENTAJE_CUMPLIMIENTO_PM
    FROM CUMPLIMIENTO_PM_FILTRADO
)

-- ----------------------------------------------------------------------------
-- SELECT FINAL
-- ----------------------------------------------------------------------------
SELECT
    -- Base / OEE
    T.TOTAL_HORAS,
    T.TOTAL_DISPONIBLE,
    T.TOTAL_PRODUCTIVO,
    T.TOTAL_FILAS,
    (T.TOTAL_HORAS - T.TOTAL_PRODUCTIVO) AS TIEMPO_MUERTO,
    P.AVG_DISPONIBILIDAD AS DISPONIBILIDAD,
    P.AVG_RENDIMIENTO    AS RENDIMIENTO,
    P.AVG_CALIDAD        AS CALIDAD,
    P.OEE_CALCULADO      AS OEE,
    PB.CAP_DISPONIBLE,
    PB.CAP_PRODUCTIVA,
    PB.KG_BRUTOS,
    PB.KG_NETOS,

    -- MTTR
    M.TIEMPO_REPARACION_TOTAL_HRS,
    M.TOTAL_OTMC,
    M.TOTAL_PAROS_MANUALES,
    M.TOTAL_PARADAS,
    M.MTTR_HRS,

    -- MTBF
    MB.MTBF_HRS,

    -- Disponibilidad T-cnica
    DT.DT_PORCENTAJE,

    -- % Cumplimiento PM
    PM.TOTAL_PM_PROGRAMADOS,
    PM.TOTAL_PM_CERRADOS,
    PM.PORCENTAJE_CUMPLIMIENTO_PM
FROM TOTALES T
LEFT JOIN PROMEDIOS   P  ON 1=1
LEFT JOIN PROMEDIOS_BASE PB ON 1=1
LEFT JOIN MTTR_TOTAL  M  ON 1=1
LEFT JOIN MTBF_TOTAL  MB ON 1=1
LEFT JOIN DT_TOTAL    DT ON 1=1
LEFT JOIN CUMPLIMIENTO_PM_TOTAL PM ON 1=1;
END
;

-- ----------------------------------------------------------------------------
-- 9) SpPdxMTTOMetricasOEE_Corrugado
-- ----------------------------------------------------------------------------
-- ----------------------------------------------------------------------------
-- 9) SpPdxMTTOMetricasOEE_Corrugado
-- ----------------------------------------------------------------------------
ALTER PROCEDURE "PTM_2022_FINAL"."SpPdxMTTOMetricasOEE_Corrugado" (
    IN P_FECHA_INICIO DATE,
    IN P_FECHA_FIN    DATE,
    IN P_LINEA        NVARCHAR(50),
    IN P_PLANTA       INT,
    IN P_CLASIFICACION NVARCHAR(50) DEFAULT NULL
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN
WITH

-- ----------------------------------------------------------------------------
-- NOTA DE DISE-O (DT vs DISPONIBILIDAD)
-- Las paradas se cuentan SOLO con OTMC (los paros manuales ya no entran).
-- HORAS_PARO solo suma TIEMPO_MUERTO_CORRECTIVOS (las dem-s columnas de
-- "Tiempo no productivo" de Corrugado quedaron comentadas).
-- Con eso:
-- MTTR = HORAS_PARO / N° de OTMC
-- MTBF = (TIEMPO_DISPONIBLE - HORAS_PARO) / N° de OTMC
-- MTBF + MTTR = TIEMPO_DISPONIBLE / N° de OTMC
-- DT = MTBF / (MTBF + MTTR) = (TIEMPO_DISPONIBLE - HORAS_PARO) / TIEMPO_DISPONIBLE
--
-- La Disponibilidad del OEE usa la MISMA definicion que el front (por fila):
-- Disponibilidad = TIEMPO_PRODUCTIVO / TIEMPO_DISPONIBLE
-- En el resumen del periodo se pondera por capacidad (kg) para que
-- Disponibilidad x Rendimiento x Calidad = OEE del periodo (ver PROMEDIOS).
-- Por eso Disponibilidad (capacidad) y DT (horas) pueden diferir ligeramente.
--
-- NOTA: MTTR, MTBF, DT y OEE salen de la bit-cora (fuente nica). Se elimin
-- P_AREA como par-metro (cada proceso tiene su tabla), MTTA y FPY (no est-n
-- en los KPIs solicitados). El nico KPI que consulta fuera de la bit-cora es
-- % Cumplimiento PM, porque la bit-cora no trae los PM programados.
-- La bit-cora garantiza que una OT no se sincroniza dos veces (sin DISTINCT).
--
-- NOTA: SIN REDONDEO. Los KPIs se devuelven con la m-xima precisin (DOUBLE).
-- Las divisiones parten de TO_DOUBLE para evitar que la aritm-tica DECIMAL de
-- HANA trunque la escala. El formato de presentación es responsabilidad del
-- front.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- BITACORA_FILTRADA
-- Fuente nica. Trae todo lo capturado en el rango/l-nea/planta.
-- HORAS_PARO       = TIEMPO_MUERTO_CORRECTIVOS
-- N_OTMC           = OT correctivas del JSON: ["OTMC-004","OTMC-007"] -> 2
-- N_PAROS_MANUALES = IDs separados por pipe: 1|14|17 -> 3 (solo informativo,
-- ya no se usa para MTTR/MTBF)
-- Alias: en Corrugado PRODUCCION_NETA y SCRAP_TOTAL no llevan _REAL ni _KG.
-- ----------------------------------------------------------------------------
BITACORA_FILTRADA AS (
    SELECT
        "DISPONIBILIDAD_PORCENTAJE",
        "PORCENTAJE_RENDIMIENTO",
        "PORCENTAJE_CALIDAD",
        "PORCENTAJE_OEE",
        "HORAS_PROGRAMADAS",
        "TIEMPO_DISPONIBLE",
        "TIEMPO_PRODUCTIVO",
        "PRODUCCION_NETA"  AS "PRODUCCION_NETA_REAL",
        "SCRAP_TOTAL"      AS "TOTAL_SCRAP_KG",
        "KG_HR_PRODUCTO",
        "KG_POR_TIEMPO_DISPONIBLE",
          CASE
            WHEN :P_CLASIFICACION = 'MANTENIMIENTO' THEN IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0)
            WHEN :P_CLASIFICACION = 'HERRAMENTALES' THEN IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0)
            ELSE IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0) + IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0)
        END AS HORAS_PARO,
        --+ IFNULL("CAMBIO_MOLDE_SETUP_EXCESOS", 0)
        --+ IFNULL("TIEMPO_MUERTO_ARRANCAR", 0)
        --+ IFNULL("TIEMPO_MUERTO_PROCESO", 0)
        CASE
            WHEN :P_CLASIFICACION = 'MANTENIMIENTO'
                 AND IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0) = 0 THEN 0
            WHEN :P_CLASIFICACION = 'HERRAMENTALES'
                 AND IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0) = 0 THEN 0
            ELSE IFNULL(OCCURRENCES_REGEXPR('OTMC-' IN TO_NVARCHAR("OTMC")), 0)
        END AS N_OTMC,
        IFNULL(OCCURRENCES_REGEXPR('[^|]+' IN TO_NVARCHAR("ID_PARO")), 0) AS N_PAROS_MANUALES
    FROM "PdxMTTOTiemposMuertosProduccionCorrugado"
    WHERE "ESTATUS" = 'A'
      AND ((:P_FECHA_INICIO IS NULL OR :P_FECHA_FIN IS NULL)
           OR ("FECHA" BETWEEN :P_FECHA_INICIO AND :P_FECHA_FIN))
      AND (:P_LINEA  IS NULL OR "LINEA"  = :P_LINEA)
      AND (:P_PLANTA IS NULL OR "PLANTA" = :P_PLANTA)   -- PLANTA es INT en Corrugado
),

-- ----------------------------------------------------------------------------
-- TOTALES: sumatorias sobre TODAS las filas del rango
-- ----------------------------------------------------------------------------
TOTALES AS (
    SELECT
        IFNULL(SUM("HORAS_PROGRAMADAS"), 0) AS TOTAL_HORAS,
        IFNULL(SUM("TIEMPO_DISPONIBLE"), 0) AS TOTAL_DISPONIBLE,
        IFNULL(SUM("TIEMPO_PRODUCTIVO"), 0) AS TOTAL_PRODUCTIVO,
        COUNT(*)                            AS TOTAL_FILAS
    FROM BITACORA_FILTRADA
),

-- ----------------------------------------------------------------------------
-- PROMEDIOS (OEE del periodo ponderado por capacidad en kg)
-- Formulas por fila (iguales al front):
-- Disponibilidad = TiempoProductivo / TiempoDisponible
-- Rendimiento    = ((Prod + Scrap) / TiempoProductivo) / KgHrProducto
-- Calidad        = Prod / (Prod + Scrap)
-- OEE            = D x R x C  =  Prod / (TiempoDisponible x KgHrProducto)
-- Al multiplicarlas se cancelan los terminos, asi que para el periodo se
-- suman las capacidades (kg) y se calcula:
-- CAP_DISPONIBLE = -- KG_POR_TIEMPO_DISPONIBLE   (TiempoDisponible x KgHrProducto)
-- CAP_PRODUCTIVA = -- TIEMPO_PRODUCTIVO x KG_HR_PRODUCTO
-- KG_BRUTOS      = -- (Produccion neta + Scrap)
-- KG_NETOS       = -- Produccion neta
-- Disponibilidad = CAP_PRODUCTIVA / CAP_DISPONIBLE
-- Rendimiento    = KG_BRUTOS / CAP_PRODUCTIVA
-- Calidad        = KG_NETOS / KG_BRUTOS
-- OEE            = KG_NETOS / CAP_DISPONIBLE  (= D x R x C exacto)
-- Se excluyen filas sin KG_HR_PRODUCTO (sin capacidad definida); un turno
-- con OEE real de 0 SI cuenta en el periodo.
-- Validado (valores redondeados a 2 dec.): -- PENDIENTE, llenar al probar
-- CORRUGADO, todas las l-neas -> Disponibilidad __, Rendimiento __, Calidad __, OEE __
-- ----------------------------------------------------------------------------
PROMEDIOS_BASE AS (
    SELECT
        IFNULL(SUM("KG_POR_TIEMPO_DISPONIBLE"), 0)                        AS CAP_DISPONIBLE,
        IFNULL(SUM("TIEMPO_PRODUCTIVO" * "KG_HR_PRODUCTO"), 0)            AS CAP_PRODUCTIVA,
        IFNULL(SUM(IFNULL("PRODUCCION_NETA_REAL", 0)
                 + IFNULL("TOTAL_SCRAP_KG", 0)), 0)                       AS KG_BRUTOS,
        IFNULL(SUM(IFNULL("PRODUCCION_NETA_REAL", 0)), 0)                 AS KG_NETOS
    FROM BITACORA_FILTRADA
    WHERE IFNULL("KG_HR_PRODUCTO", 0) > 0
),
PROMEDIOS AS (
    SELECT
        TO_DOUBLE(CAP_PRODUCTIVA) / NULLIF(CAP_DISPONIBLE, 0) * 100 AS AVG_DISPONIBILIDAD,
        TO_DOUBLE(KG_BRUTOS)      / NULLIF(CAP_PRODUCTIVA, 0) * 100 AS AVG_RENDIMIENTO,
        TO_DOUBLE(KG_NETOS)       / NULLIF(KG_BRUTOS, 0)      * 100 AS AVG_CALIDAD,
        TO_DOUBLE(KG_NETOS)       / NULLIF(CAP_DISPONIBLE, 0) * 100 AS OEE_CALCULADO
    FROM PROMEDIOS_BASE
),

-- ----------------------------------------------------------------------------
-- MTTR_TOTAL
-- MTTR = -- horas de paro / N de OTMC (se quitaron los paros manuales)
-- ----------------------------------------------------------------------------
MTTR_TOTAL AS (
    SELECT
        IFNULL(SUM(HORAS_PARO), 0)                 AS TIEMPO_REPARACION_TOTAL_HRS,
        IFNULL(SUM(N_OTMC), 0)                     AS TOTAL_OTMC,
        IFNULL(SUM(N_PAROS_MANUALES), 0)           AS TOTAL_PAROS_MANUALES,
        IFNULL(SUM(N_OTMC /*+ N_PAROS_MANUALES*/), 0)  AS TOTAL_PARADAS,
        CASE WHEN SUM(N_OTMC /*+ N_PAROS_MANUALES*/) > 0
             THEN TO_DOUBLE(SUM(HORAS_PARO)) / SUM(N_OTMC /*+ N_PAROS_MANUALES*/)
        END                                        AS MTTR_HRS_EXACTO,
        CASE WHEN SUM(N_OTMC /*+ N_PAROS_MANUALES*/) > 0
             THEN TO_DOUBLE(SUM(HORAS_PARO)) / SUM(N_OTMC /*+ N_PAROS_MANUALES*/)
             ELSE 0
        END                                        AS MTTR_HRS
    FROM BITACORA_FILTRADA
),

-- ----------------------------------------------------------------------------
-- MTBF_TOTAL
-- MTBF = (Tiempo disponible - Tiempo de inactividad) / N° de OTMC
-- Sin paradas -> NULL (el front debe manejarlo; DT lo trata como 100).
-- ----------------------------------------------------------------------------
MTBF_TOTAL AS (
    SELECT
        CASE WHEN SUM(N_OTMC /*+ N_PAROS_MANUALES*/) > 0
             THEN TO_DOUBLE(SUM(IFNULL("TIEMPO_DISPONIBLE", 0)) - SUM(HORAS_PARO))
                  / SUM(N_OTMC /*+ N_PAROS_MANUALES*/)
        END AS MTBF_HRS_EXACTO,
        CASE WHEN SUM(N_OTMC /*+ N_PAROS_MANUALES*/) > 0
             THEN TO_DOUBLE(SUM(IFNULL("TIEMPO_DISPONIBLE", 0)) - SUM(HORAS_PARO))
                  / SUM(N_OTMC /*+ N_PAROS_MANUALES*/)
        END AS MTBF_HRS
    FROM BITACORA_FILTRADA
),

-- ----------------------------------------------------------------------------
-- DT_TOTAL (Disponibilidad T-cnica) = MTBF / (MTBF + MTTR) * 100
-- Sin paradas -> 100.
-- ----------------------------------------------------------------------------
DT_TOTAL AS (
    SELECT
        CASE
            WHEN M.TOTAL_PARADAS = 0 THEN 100
            WHEN (MB.MTBF_HRS_EXACTO + M.MTTR_HRS_EXACTO) > 0
                 THEN MB.MTBF_HRS_EXACTO / (MB.MTBF_HRS_EXACTO + M.MTTR_HRS_EXACTO) * 100
            ELSE NULL
        END AS DT_PORCENTAJE
    FROM MTBF_TOTAL MB
    CROSS JOIN MTTR_TOTAL M
),

-- ----------------------------------------------------------------------------
-- CUMPLIMIENTO_PM_FILTRADO / CUMPLIMIENTO_PM_TOTAL  (% PM)
-- -nico bloque que consulta fuera de la bit-cora: la bit-cora solo trae los
-- PM ejecutados (OTMP), no los programados, por eso sale de PdxMTTOMPGenerados.
-- Nace con HORA_APERTURA (PdxMTTOMPGenerados).
-- REGLA: cumplido = ESTATUS 4 (Cerrado, incluye "En proceso de firmas").
-- Cualquier otro estatus (ej. 2 = Liberado) cuenta como programado pero NO
-- cumplido.
-- --REA: PdxMTTOGestionEquipos mezcla equipos de todos los procesos y guarda
-- el ID_AREA num-rico. El ID no es fijo entre plantas, por eso se filtra por
-- NOMBRE de -rea contra el cat-logo PdxMTTOAreasxPlanta en vez de hardcodear
-- un ID.
-- Validado: -- PENDIENTE, llenar al probar
-- ----------------------------------------------------------------------------
CUMPLIMIENTO_PM_FILTRADO AS (
    SELECT
        MP."ID_MANTENIMIENTO",
        MP."ESTATUS"
    FROM "PdxMTTOMPGenerados" MP
    INNER JOIN "PdxMTTOGestionEquipos" E
        ON MP."ID_EQUIPO" = E."ID_EQUIPO"
    INNER JOIN "PdxMTTOAreasxPlanta" A
        ON E."AREA" = A."ID_AREA"
       AND A."AREA" = 'PEAD CORR'          -- confirmar nombre exacto en PdxMTTOAreasxPlanta
    LEFT JOIN "PdxMTTOLineasxPlanta" LE
        ON E."LINEA_PRODUCCION" = LE."ID_LINEA"
    WHERE
        MP."HORA_APERTURA" IS NOT NULL
        AND ((:P_FECHA_INICIO IS NULL OR :P_FECHA_FIN IS NULL)
             OR (MP."HORA_APERTURA" >= :P_FECHA_INICIO
                 AND MP."HORA_APERTURA" < ADD_DAYS(:P_FECHA_FIN, 1)))
        AND (:P_LINEA  IS NULL OR LE."LINEA" = :P_LINEA)
        AND (:P_PLANTA IS NULL OR E."PLANTA" = TO_INT(:P_PLANTA))
        AND (:P_CLASIFICACION IS NULL OR E."CLASIFICACION" = :P_CLASIFICACION)
),
CUMPLIMIENTO_PM_TOTAL AS (
    SELECT
        COUNT(*) AS TOTAL_PM_PROGRAMADOS,
        IFNULL(SUM(CASE WHEN "ESTATUS" = 4 THEN 1 ELSE 0 END), 0) AS TOTAL_PM_CERRADOS,
        CASE WHEN COUNT(*) > 0
             THEN TO_DOUBLE(SUM(CASE WHEN "ESTATUS" = 4 THEN 1 ELSE 0 END)) * 100.0 / COUNT(*)
             ELSE TO_DOUBLE(0)
        END AS PORCENTAJE_CUMPLIMIENTO_PM
    FROM CUMPLIMIENTO_PM_FILTRADO
)

-- ----------------------------------------------------------------------------
-- SELECT FINAL
-- ----------------------------------------------------------------------------
SELECT
    -- Base / OEE
    T.TOTAL_HORAS,
    T.TOTAL_DISPONIBLE,
    T.TOTAL_PRODUCTIVO,
    T.TOTAL_FILAS,
    (T.TOTAL_HORAS - T.TOTAL_PRODUCTIVO) AS TIEMPO_MUERTO,
    P.AVG_DISPONIBILIDAD AS DISPONIBILIDAD,
    P.AVG_RENDIMIENTO    AS RENDIMIENTO,
    P.AVG_CALIDAD        AS CALIDAD,
    P.OEE_CALCULADO      AS OEE,
    PB.CAP_DISPONIBLE,
    PB.CAP_PRODUCTIVA,
    PB.KG_BRUTOS,
    PB.KG_NETOS,

    -- MTTR
    M.TIEMPO_REPARACION_TOTAL_HRS,
    M.TOTAL_OTMC,
    M.TOTAL_PAROS_MANUALES,   -- se sigue devolviendo para no romper el front
    M.TOTAL_PARADAS,
    M.MTTR_HRS,

    -- MTBF
    MB.MTBF_HRS,

    -- Disponibilidad T-cnica
    DT.DT_PORCENTAJE,

    -- % Cumplimiento PM
    PM.TOTAL_PM_PROGRAMADOS,
    PM.TOTAL_PM_CERRADOS,
    PM.PORCENTAJE_CUMPLIMIENTO_PM
FROM TOTALES T
LEFT JOIN PROMEDIOS   P  ON 1=1
LEFT JOIN PROMEDIOS_BASE PB ON 1=1
LEFT JOIN MTTR_TOTAL  M  ON 1=1
LEFT JOIN MTBF_TOTAL  MB ON 1=1
LEFT JOIN DT_TOTAL    DT ON 1=1
LEFT JOIN CUMPLIMIENTO_PM_TOTAL PM ON 1=1;
END
;

-- ----------------------------------------------------------------------------
-- 10) SpPdxMTTOMetricasOEE_INY
-- ----------------------------------------------------------------------------
-- ----------------------------------------------------------------------------
-- 10) SpPdxMTTOMetricasOEE_INY
-- ----------------------------------------------------------------------------
ALTER PROCEDURE "PTM_2022_FINAL"."SpPdxMTTOMetricasOEE_INY" (
    IN P_FECHA_INICIO DATE,
    IN P_FECHA_FIN    DATE,
    IN P_LINEA        NVARCHAR(50),
    IN P_PLANTA       INT,
    IN P_CLASIFICACION NVARCHAR(50) DEFAULT NULL
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN
WITH

-- ----------------------------------------------------------------------------
-- NOTA DE DISE-O (DT vs DISPONIBILIDAD)
-- Las paradas se cuentan SOLO con OTMC (los paros manuales ya no entran).
-- HORAS_PARO solo suma TIEMPO_MUERTO_CORRECTIVOS + TIEMPO_MUERTO_HERRAMENTALES
-- (las dem-s columnas de "Tiempo no productivo" de INY quedaron comentadas).
-- Con eso:
-- MTTR = HORAS_PARO / N° de OTMC
-- MTBF = (TIEMPO_DISPONIBLE - HORAS_PARO) / N° de OTMC
-- MTBF + MTTR = TIEMPO_DISPONIBLE / N° de OTMC
-- DT = MTBF / (MTBF + MTTR) = (TIEMPO_DISPONIBLE - HORAS_PARO) / TIEMPO_DISPONIBLE
--
-- La Disponibilidad del OEE usa la MISMA definicion que el front (por fila):
-- Disponibilidad = TIEMPO_PRODUCTIVO / TIEMPO_DISPONIBLE
-- En el resumen del periodo se pondera por capacidad (kg) para que
-- Disponibilidad x Rendimiento x Calidad = OEE del periodo (ver PROMEDIOS).
-- Por eso Disponibilidad (capacidad) y DT (horas) pueden diferir ligeramente.
--
-- NOTA: MTTR, MTBF, DT y OEE salen de la bit-cora (fuente nica). Se elimin
-- P_AREA como par-metro (cada proceso tiene su tabla), MTTA y FPY (no est-n
-- en los KPIs solicitados). El nico KPI que consulta fuera de la bit-cora es
-- % Cumplimiento PM, porque la bit-cora no trae los PM programados.
-- La bit-cora garantiza que una OT no se sincroniza dos veces (sin DISTINCT).
--
-- NOTA: SIN REDONDEO. Los KPIs se devuelven con la m-xima precisin (DOUBLE).
-- Las divisiones parten de TO_DOUBLE para evitar que la aritm-tica DECIMAL de
-- HANA trunque la escala. El formato de presentación es responsabilidad del
-- front.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- BITACORA_FILTRADA
-- Fuente nica. Trae todo lo capturado en el rango/l-nea/planta.
-- HORAS_PARO       = TIEMPO_MUERTO_CORRECTIVOS + TIEMPO_MUERTO_HERRAMENTALES
-- N_OTMC           = OT correctivas del JSON: ["OTMC-004","OTMC-007"] -> 2
-- N_PAROS_MANUALES = IDs separados por pipe: 1|14|17 -> 3 (solo informativo,
-- ya no se usa para MTTR/MTBF)
-- Alias: en INY la disponibilidad se llama PORCENTAJE_DISPONIBILIDAD, y
-- PRODUCCION_NETA / TOTAL_SCRAP no llevan _REAL ni _KG.
-- ----------------------------------------------------------------------------
BITACORA_FILTRADA AS (
    SELECT
        "PORCENTAJE_DISPONIBILIDAD" AS "DISPONIBILIDAD_PORCENTAJE",
        "PORCENTAJE_RENDIMIENTO",
        "PORCENTAJE_CALIDAD",
        "PORCENTAJE_OEE",
        "HORAS_PROGRAMADAS",
        "TIEMPO_DISPONIBLE",
        "TIEMPO_PRODUCTIVO",
        "PRODUCCION_NETA"  AS "PRODUCCION_NETA_REAL",
        "TOTAL_SCRAP"      AS "TOTAL_SCRAP_KG",
        "KG_HR_PRODUCTO",
        "KG_POR_TIEMPO_DISPONIBLE",
          CASE
            WHEN :P_CLASIFICACION = 'MANTENIMIENTO' THEN IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0)
            WHEN :P_CLASIFICACION = 'HERRAMENTALES' THEN IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0)
            ELSE IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0) + IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0)
        END AS HORAS_PARO,
        --+ IFNULL("TIEMPO_MUERTO_ARRANQUES", 0)
        --+ IFNULL("FALLA_MATERIAL", 0)
        --+ IFNULL("FALTA_PERSONAL", 0)
        --+ IFNULL("FALLA_ELECTRICA", 0)
        --+ IFNULL("TIEMPO_MUERTO_PROCESO", 0)
        CASE
            WHEN :P_CLASIFICACION = 'MANTENIMIENTO'
                 AND IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0) = 0 THEN 0
            WHEN :P_CLASIFICACION = 'HERRAMENTALES'
                 AND IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0) = 0 THEN 0
            ELSE IFNULL(OCCURRENCES_REGEXPR('OTMC-' IN TO_NVARCHAR("OTMC")), 0)
        END AS N_OTMC,
        IFNULL(OCCURRENCES_REGEXPR('[^|]+' IN TO_NVARCHAR("ID_PARO")), 0) AS N_PAROS_MANUALES
    FROM "PdxMTTOTiemposMuertosProduccionINY"
    WHERE "ESTATUS" = 'A'
      AND ((:P_FECHA_INICIO IS NULL OR :P_FECHA_FIN IS NULL)
           OR ("FECHA" BETWEEN :P_FECHA_INICIO AND :P_FECHA_FIN))
      AND (:P_LINEA  IS NULL OR "LINEA"  = :P_LINEA)
      AND (:P_PLANTA IS NULL OR "PLANTA" = TO_NVARCHAR(:P_PLANTA))   -- PLANTA es NVARCHAR en INY
),

-- ----------------------------------------------------------------------------
-- TOTALES: sumatorias sobre TODAS las filas del rango
-- ----------------------------------------------------------------------------
TOTALES AS (
    SELECT
        IFNULL(SUM("HORAS_PROGRAMADAS"), 0) AS TOTAL_HORAS,
        IFNULL(SUM("TIEMPO_DISPONIBLE"), 0) AS TOTAL_DISPONIBLE,
        IFNULL(SUM("TIEMPO_PRODUCTIVO"), 0) AS TOTAL_PRODUCTIVO,
        COUNT(*)                            AS TOTAL_FILAS
    FROM BITACORA_FILTRADA
),

-- ----------------------------------------------------------------------------
-- PROMEDIOS (OEE del periodo ponderado por capacidad en kg)
-- Formulas por fila (iguales al front):
-- Disponibilidad = TiempoProductivo / TiempoDisponible
-- Rendimiento    = ((Prod + Scrap) / TiempoProductivo) / KgHrProducto
-- Calidad        = Prod / (Prod + Scrap)
-- OEE            = D x R x C  =  Prod / (TiempoDisponible x KgHrProducto)
-- Al multiplicarlas se cancelan los terminos, asi que para el periodo se
-- suman las capacidades (kg) y se calcula:
-- CAP_DISPONIBLE = -- KG_POR_TIEMPO_DISPONIBLE   (TiempoDisponible x KgHrProducto)
-- CAP_PRODUCTIVA = -- TIEMPO_PRODUCTIVO x KG_HR_PRODUCTO
-- KG_BRUTOS      = -- (Produccion neta + Scrap)
-- KG_NETOS       = -- Produccion neta
-- Disponibilidad = CAP_PRODUCTIVA / CAP_DISPONIBLE
-- Rendimiento    = KG_BRUTOS / CAP_PRODUCTIVA
-- Calidad        = KG_NETOS / KG_BRUTOS
-- OEE            = KG_NETOS / CAP_DISPONIBLE  (= D x R x C exacto)
-- Se excluyen filas sin KG_HR_PRODUCTO (sin capacidad definida); un turno
-- con OEE real de 0 SI cuenta en el periodo.
-- Validado (valores redondeados a 2 dec.): -- PENDIENTE, llenar al probar
-- INYECCI--N, todas las l-neas -> Disponibilidad __, Rendimiento __, Calidad __, OEE __
-- ----------------------------------------------------------------------------
PROMEDIOS_BASE AS (
    SELECT
        IFNULL(SUM("KG_POR_TIEMPO_DISPONIBLE"), 0)                        AS CAP_DISPONIBLE,
        IFNULL(SUM("TIEMPO_PRODUCTIVO" * "KG_HR_PRODUCTO"), 0)            AS CAP_PRODUCTIVA,
        IFNULL(SUM(IFNULL("PRODUCCION_NETA_REAL", 0)
                 + IFNULL("TOTAL_SCRAP_KG", 0)), 0)                       AS KG_BRUTOS,
        IFNULL(SUM(IFNULL("PRODUCCION_NETA_REAL", 0)), 0)                 AS KG_NETOS
    FROM BITACORA_FILTRADA
    WHERE IFNULL("KG_HR_PRODUCTO", 0) > 0
),
PROMEDIOS AS (
    SELECT
        TO_DOUBLE(CAP_PRODUCTIVA) / NULLIF(CAP_DISPONIBLE, 0) * 100 AS AVG_DISPONIBILIDAD,
        TO_DOUBLE(KG_BRUTOS)      / NULLIF(CAP_PRODUCTIVA, 0) * 100 AS AVG_RENDIMIENTO,
        TO_DOUBLE(KG_NETOS)       / NULLIF(KG_BRUTOS, 0)      * 100 AS AVG_CALIDAD,
        TO_DOUBLE(KG_NETOS)       / NULLIF(CAP_DISPONIBLE, 0) * 100 AS OEE_CALCULADO
    FROM PROMEDIOS_BASE
),

-- ----------------------------------------------------------------------------
-- MTTR_TOTAL
-- MTTR = -- horas de paro / N de OTMC (se quitaron los paros manuales)
-- ----------------------------------------------------------------------------
MTTR_TOTAL AS (
    SELECT
        IFNULL(SUM(HORAS_PARO), 0)                 AS TIEMPO_REPARACION_TOTAL_HRS,
        IFNULL(SUM(N_OTMC), 0)                     AS TOTAL_OTMC,
        IFNULL(SUM(N_PAROS_MANUALES), 0)           AS TOTAL_PAROS_MANUALES,
        IFNULL(SUM(N_OTMC /*+ N_PAROS_MANUALES*/), 0)  AS TOTAL_PARADAS,
        CASE WHEN SUM(N_OTMC /*+ N_PAROS_MANUALES*/) > 0
             THEN TO_DOUBLE(SUM(HORAS_PARO)) / SUM(N_OTMC /*+ N_PAROS_MANUALES*/)
        END                                        AS MTTR_HRS_EXACTO,
        CASE WHEN SUM(N_OTMC /*+ N_PAROS_MANUALES*/) > 0
             THEN TO_DOUBLE(SUM(HORAS_PARO)) / SUM(N_OTMC /*+ N_PAROS_MANUALES*/)
             ELSE 0
        END                                        AS MTTR_HRS
    FROM BITACORA_FILTRADA
),

-- ----------------------------------------------------------------------------
-- MTBF_TOTAL
-- MTBF = (Tiempo disponible - Tiempo de inactividad) / N° de OTMC
-- Sin paradas -> NULL (el front debe manejarlo; DT lo trata como 100).
-- ----------------------------------------------------------------------------
MTBF_TOTAL AS (
    SELECT
        CASE WHEN SUM(N_OTMC /*+ N_PAROS_MANUALES*/) > 0
             THEN TO_DOUBLE(SUM(IFNULL("TIEMPO_DISPONIBLE", 0)) - SUM(HORAS_PARO))
                  / SUM(N_OTMC /*+ N_PAROS_MANUALES*/)
        END AS MTBF_HRS_EXACTO,
        CASE WHEN SUM(N_OTMC /*+ N_PAROS_MANUALES*/) > 0
             THEN TO_DOUBLE(SUM(IFNULL("TIEMPO_DISPONIBLE", 0)) - SUM(HORAS_PARO))
                  / SUM(N_OTMC /*+ N_PAROS_MANUALES*/)
        END AS MTBF_HRS
    FROM BITACORA_FILTRADA
),

-- ----------------------------------------------------------------------------
-- DT_TOTAL (Disponibilidad T-cnica) = MTBF / (MTBF + MTTR) * 100
-- Sin paradas -> 100.
-- ----------------------------------------------------------------------------
DT_TOTAL AS (
    SELECT
        CASE
            WHEN M.TOTAL_PARADAS = 0 THEN 100
            WHEN (MB.MTBF_HRS_EXACTO + M.MTTR_HRS_EXACTO) > 0
                 THEN MB.MTBF_HRS_EXACTO / (MB.MTBF_HRS_EXACTO + M.MTTR_HRS_EXACTO) * 100
            ELSE NULL
        END AS DT_PORCENTAJE
    FROM MTBF_TOTAL MB
    CROSS JOIN MTTR_TOTAL M
),

-- ----------------------------------------------------------------------------
-- CUMPLIMIENTO_PM_FILTRADO / CUMPLIMIENTO_PM_TOTAL  (% PM)
-- -nico bloque que consulta fuera de la bit-cora: la bit-cora solo trae los
-- PM ejecutados (OTMP), no los programados, por eso sale de PdxMTTOMPGenerados.
-- Nace con HORA_APERTURA (PdxMTTOMPGenerados).
-- REGLA: cumplido = ESTATUS 4 (Cerrado, incluye "En proceso de firmas").
-- Cualquier otro estatus (ej. 2 = Liberado) cuenta como programado pero NO
-- cumplido.
-- --REA: PdxMTTOGestionEquipos mezcla equipos de todos los procesos y guarda
-- el ID_AREA num-rico. El ID no es fijo entre plantas, por eso se filtra por
-- NOMBRE de -rea contra el cat-logo PdxMTTOAreasxPlanta en vez de hardcodear
-- un ID.
-- Validado: -- PENDIENTE, llenar al probar
-- ----------------------------------------------------------------------------
CUMPLIMIENTO_PM_FILTRADO AS (
    SELECT
        MP."ID_MANTENIMIENTO",
        MP."ESTATUS"
    FROM "PdxMTTOMPGenerados" MP
    INNER JOIN "PdxMTTOGestionEquipos" E
        ON MP."ID_EQUIPO" = E."ID_EQUIPO"
    INNER JOIN "PdxMTTOAreasxPlanta" A
        ON E."AREA" = A."ID_AREA"
       AND A."AREA" LIKE 'INYECCI%'          -- confirmar nombre exacto (con acento) en PdxMTTOAreasxPlanta
    LEFT JOIN "PdxMTTOLineasxPlanta" LE
        ON E."LINEA_PRODUCCION" = LE."ID_LINEA"
    WHERE
        MP."HORA_APERTURA" IS NOT NULL
        AND ((:P_FECHA_INICIO IS NULL OR :P_FECHA_FIN IS NULL)
             OR (MP."HORA_APERTURA" >= :P_FECHA_INICIO
                 AND MP."HORA_APERTURA" < ADD_DAYS(:P_FECHA_FIN, 1)))
        AND (:P_LINEA  IS NULL OR LE."LINEA" = :P_LINEA)
        AND (:P_PLANTA IS NULL OR E."PLANTA" = TO_INT(:P_PLANTA))
        AND (:P_CLASIFICACION IS NULL OR E."CLASIFICACION" = :P_CLASIFICACION)
),
CUMPLIMIENTO_PM_TOTAL AS (
    SELECT
        COUNT(*) AS TOTAL_PM_PROGRAMADOS,
        IFNULL(SUM(CASE WHEN "ESTATUS" = 4 THEN 1 ELSE 0 END), 0) AS TOTAL_PM_CERRADOS,
        CASE WHEN COUNT(*) > 0
             THEN TO_DOUBLE(SUM(CASE WHEN "ESTATUS" = 4 THEN 1 ELSE 0 END)) * 100.0 / COUNT(*)
             ELSE TO_DOUBLE(0)
        END AS PORCENTAJE_CUMPLIMIENTO_PM
    FROM CUMPLIMIENTO_PM_FILTRADO
)

-- ----------------------------------------------------------------------------
-- SELECT FINAL
-- ----------------------------------------------------------------------------
SELECT
    -- Base / OEE
    T.TOTAL_HORAS,
    T.TOTAL_DISPONIBLE,
    T.TOTAL_PRODUCTIVO,
    T.TOTAL_FILAS,
    (T.TOTAL_HORAS - T.TOTAL_PRODUCTIVO) AS TIEMPO_MUERTO,
    P.AVG_DISPONIBILIDAD AS DISPONIBILIDAD,
    P.AVG_RENDIMIENTO    AS RENDIMIENTO,
    P.AVG_CALIDAD        AS CALIDAD,
    P.OEE_CALCULADO      AS OEE,
    PB.CAP_DISPONIBLE,
    PB.CAP_PRODUCTIVA,
    PB.KG_BRUTOS,
    PB.KG_NETOS,

    -- MTTR
    M.TIEMPO_REPARACION_TOTAL_HRS,
    M.TOTAL_OTMC,
    M.TOTAL_PAROS_MANUALES,   -- se sigue devolviendo para no romper el front
    M.TOTAL_PARADAS,
    M.MTTR_HRS,

    -- MTBF
    MB.MTBF_HRS,

    -- Disponibilidad T-cnica
    DT.DT_PORCENTAJE,

    -- % Cumplimiento PM
    PM.TOTAL_PM_PROGRAMADOS,
    PM.TOTAL_PM_CERRADOS,
    PM.PORCENTAJE_CUMPLIMIENTO_PM
FROM TOTALES T
LEFT JOIN PROMEDIOS   P  ON 1=1
LEFT JOIN PROMEDIOS_BASE PB ON 1=1
LEFT JOIN MTTR_TOTAL  M  ON 1=1
LEFT JOIN MTBF_TOTAL  MB ON 1=1
LEFT JOIN DT_TOTAL    DT ON 1=1
LEFT JOIN CUMPLIMIENTO_PM_TOTAL PM ON 1=1;
END
;

-- ----------------------------------------------------------------------------
-- 11) SpPdxMTTOGuardarTiemposMuertosCorrugado
-- ----------------------------------------------------------------------------
-- ----------------------------------------------------------------------------
-- 11) SpPdxMTTOGuardarTiemposMuertosCorrugado
-- ----------------------------------------------------------------------------
ALTER PROCEDURE "PTM_2022_FINAL"."SpPdxMTTOGuardarTiemposMuertosCorrugado"(

    IN P_ID_REGISTRO INT,
    IN P_OTMC NCLOB,      -- CAMBIO: JSON array, ej. ["OT001","OT002"]
	IN P_OTMP NCLOB,      -- CAMBIO: JSON array, ej. ["OP001","OP002"]
    IN P_ID_PRODUCTO_TERMINADO INTEGER,
    IN P_MES NVARCHAR(20),
    IN P_FECHA DATE,
    IN P_LINEA NVARCHAR(20),
    IN P_CORRUGADOR NVARCHAR(20),
    IN P_PRODUCTO NVARCHAR(100),
    IN P_TURNO NVARCHAR(10),
    IN P_GRUPO NVARCHAR(10),

    IN P_PESO_MINIMO DECIMAL(10,2),
    IN P_TRLIBERADOS DECIMAL(10,2),
    IN P_PRODUCCION_NETA DECIMAL(10,2),
    IN P_PESO_ESTANDAR DECIMAL(10,2),
    IN P_PORCENTAJE_SOBREPESO DECIMAL(10,2),
    IN P_SCRAP_SIN_CORTE_SIERRA DECIMAL(10,2),
    IN P_SCRAP_CORTE_SIERRA DECIMAL(10,2),
    IN P_SCRAP_TOTAL DECIMAL(10,2),
    IN P_PORCENTAJE_SCRAP_SIN_CORTE DECIMAL(10,2),
    IN P_PORCENTAJE_SCRAP_CORTE DECIMAL(10,2),
    IN P_KG_REPROCESO DECIMAL(10,2),
    IN P_CARBONATO DECIMAL(10,2),
    IN P_HORAS_PROGRAMADAS DECIMAL(10,2),

    -- TIEMPO NO DISPONIBLE
    IN P_MANTENIMIENTO_PREVENTIVO DECIMAL(10,2),
    IN P_CONTROL_INVENTARIOS DECIMAL(10,2),
    IN P_FALTA_ENERGIA DECIMAL(10,2),
    IN P_FALTA_MATERIA_PRIMA DECIMAL(10,2),
    IN P_PREPARACION_CAMBIO DECIMAL(10,2),
    IN P_ARRANQUE_ESTABILIZACION DECIMAL(10,2),
    IN P_TIEMPO_MTTO_CORRECTIVOS_ARRANQUE DECIMAL(10,2),

    -- TIEMPO NO PRODUCTIVO
    IN P_TIEMPO_MUERTO_CORRECTIVOS DECIMAL(10,2),
    IN P_CAMBIO_MOLDE_SETUP_EXCESOS DECIMAL(10,2),
    IN P_TIEMPO_MUERTO_ARRANCAR DECIMAL(10,2),
    IN P_TIEMPO_MUERTO_PROCESO DECIMAL(10,2),

    -- KPIs
    IN P_TIEMPO_DISPONIBLE DECIMAL(10,2),
    IN P_TIEMPO_PRODUCTIVO DECIMAL(10,2),
    -- NUEVO - KPIs calculados
    IN P_KG_HR_LINEA DECIMAL(10,2),
    IN P_KG_HR_PRODUCTO DECIMAL(10,2),
    IN P_OBJETIVO_EFICIENCIA DECIMAL(10,2),
    IN P_DISPONIBILIDAD_PORCENTAJE DECIMAL(10,2),
    IN P_KG_POR_TIEMPO_DISPONIBLE DECIMAL(10,2),
    IN P_KG_NETOS_HR_REALES DECIMAL(10,2),
    IN P_PORCENTAJE_RENDIMIENTO DECIMAL(10,2),
    IN P_PORCENTAJE_CALIDAD DECIMAL(10,2),
    IN P_PORCENTAJE_OEE DECIMAL(10,2),
    IN P_PORCENTAJE_EFICIENCIA_PRODUCTO DECIMAL(10,2),
    IN P_EFICIENCIA_OPERATIVA DECIMAL(10,2),

    -- AUDITOR-A
    IN P_USUARIO NVARCHAR(50),
    IN P_PLANTA INT,
    IN P_ID_PARO NCLOB,   -- CAMBIO: JSON array de strings, ej. ["12","15"]
    IN P_COMENTARIOS NVARCHAR(500),
    IN P_TIEMPO_MUERTO_HERRAMENTALES DECIMAL(10,2)
)

LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER

AS
BEGIN

    DECLARE V_FECHA LONGDATE;

    SELECT ADD_SECONDS(CURRENT_UTCTIMESTAMP, -6 * 3600)
    INTO V_FECHA
    FROM DUMMY;

    -- ========================================
    -- UPDATE
    -- ========================================

    IF :P_ID_REGISTRO IS NOT NULL THEN

        UPDATE "PdxMTTOTiemposMuertosProduccionCorrugado"
        SET
            "OTMC"                             = :P_OTMC,
            "OTMP"                             = :P_OTMP,
            "ID_PRODUCTO_TERMINADO"            = :P_ID_PRODUCTO_TERMINADO,
            "MES"                              = :P_MES,
            "FECHA"                            = :P_FECHA,
            "LINEA"                            = :P_LINEA,
            "CORRUGADOR"                       = :P_CORRUGADOR,
            "PRODUCTO"                         = :P_PRODUCTO,
            "TURNO"                            = :P_TURNO,
            "GRUPO"                            = :P_GRUPO,

            "PESO_MINIMO"                      = :P_PESO_MINIMO,
            "TRLIBERADOS"                      = :P_TRLIBERADOS,
            "PRODUCCION_NETA"                  = :P_PRODUCCION_NETA,
            "PESO_ESTANDAR"                    = :P_PESO_ESTANDAR,
            "PORCENTAJE_SOBREPESO"             = :P_PORCENTAJE_SOBREPESO,
            "SCRAP_SIN_CORTE_SIERRA"           = :P_SCRAP_SIN_CORTE_SIERRA,
            "SCRAP_CORTE_SIERRA"               = :P_SCRAP_CORTE_SIERRA,
            "SCRAP_TOTAL"                      = :P_SCRAP_TOTAL,
            "PORCENTAJE_SCRAP_SIN_CORTE"       = :P_PORCENTAJE_SCRAP_SIN_CORTE,
            "PORCENTAJE_SCRAP_CORTE"           = :P_PORCENTAJE_SCRAP_CORTE,
            "KG_REPROCESO"                     = :P_KG_REPROCESO,
            "CARBONATO"                        = :P_CARBONATO,
            "HORAS_PROGRAMADAS"                = :P_HORAS_PROGRAMADAS,

            "MANTENIMIENTO_PREVENTIVO"         = :P_MANTENIMIENTO_PREVENTIVO,
            "CONTROL_INVENTARIOS"              = :P_CONTROL_INVENTARIOS,
            "FALTA_ENERGIA"                    = :P_FALTA_ENERGIA,
            "FALTA_MATERIA_PRIMA"              = :P_FALTA_MATERIA_PRIMA,
            "PREPARACION_CAMBIO"               = :P_PREPARACION_CAMBIO,
            "ARRANQUE_ESTABILIZACION"          = :P_ARRANQUE_ESTABILIZACION,
            "TIEMPO_MTTO_CORRECTIVOS_ARRANQUE" = :P_TIEMPO_MTTO_CORRECTIVOS_ARRANQUE,

            "TIEMPO_MUERTO_CORRECTIVOS"        = :P_TIEMPO_MUERTO_CORRECTIVOS,
        "TIEMPO_MUERTO_HERRAMENTALES"      = :P_TIEMPO_MUERTO_HERRAMENTALES,
            "CAMBIO_MOLDE_SETUP_EXCESOS"       = :P_CAMBIO_MOLDE_SETUP_EXCESOS,
            "TIEMPO_MUERTO_ARRANCAR"           = :P_TIEMPO_MUERTO_ARRANCAR,
            "TIEMPO_MUERTO_PROCESO"            = :P_TIEMPO_MUERTO_PROCESO,

            "TIEMPO_DISPONIBLE"                = :P_TIEMPO_DISPONIBLE,
            "TIEMPO_PRODUCTIVO"                = :P_TIEMPO_PRODUCTIVO,
            -- NUEVO
            "KG_HR_LINEA"                      = :P_KG_HR_LINEA,
            "KG_HR_PRODUCTO"                   = :P_KG_HR_PRODUCTO,
            "OBJETIVO_EFICIENCIA"              = :P_OBJETIVO_EFICIENCIA,
            "DISPONIBILIDAD_PORCENTAJE"        = :P_DISPONIBILIDAD_PORCENTAJE,
            "KG_POR_TIEMPO_DISPONIBLE"         = :P_KG_POR_TIEMPO_DISPONIBLE,
            "KG_NETOS_HR_REALES"               = :P_KG_NETOS_HR_REALES,
            "PORCENTAJE_RENDIMIENTO"           = :P_PORCENTAJE_RENDIMIENTO,
            "PORCENTAJE_CALIDAD"               = :P_PORCENTAJE_CALIDAD,
            "PORCENTAJE_OEE"                   = :P_PORCENTAJE_OEE,
            "PORCENTAJE_EFICIENCIA_PRODUCTO"   = :P_PORCENTAJE_EFICIENCIA_PRODUCTO,
            "EFICIENCIA_OPERATIVA"             = :P_EFICIENCIA_OPERATIVA,

            "USUARIO"                          = :P_USUARIO,
            "PLANTA"                           = :P_PLANTA,
            "ID_PARO"                          = :P_ID_PARO,
            "COMENTARIOS" = :P_COMENTARIOS,
            "FECHA_ACTUALIZACION"              = :V_FECHA

        WHERE "ID_REGISTRO" = :P_ID_REGISTRO;

    ELSE

    -- ========================================
    -- INSERT
    -- ========================================

        INSERT INTO "PdxMTTOTiemposMuertosProduccionCorrugado" (
            "OTMC",
            "OTMP",
            "ID_PRODUCTO_TERMINADO",
            "MES",
            "FECHA",
            "LINEA",
            "CORRUGADOR",
            "PRODUCTO",
            "TURNO",
            "GRUPO",

            "PESO_MINIMO",
            "TRLIBERADOS",
            "PRODUCCION_NETA",
            "PESO_ESTANDAR",
            "PORCENTAJE_SOBREPESO",
            "SCRAP_SIN_CORTE_SIERRA",
            "SCRAP_CORTE_SIERRA",
            "SCRAP_TOTAL",
            "PORCENTAJE_SCRAP_SIN_CORTE",
            "PORCENTAJE_SCRAP_CORTE",
            "KG_REPROCESO",
            "CARBONATO",
            "HORAS_PROGRAMADAS",

            "MANTENIMIENTO_PREVENTIVO",
            "CONTROL_INVENTARIOS",
            "FALTA_ENERGIA",
            "FALTA_MATERIA_PRIMA",
            "PREPARACION_CAMBIO",
            "ARRANQUE_ESTABILIZACION",
            "TIEMPO_MTTO_CORRECTIVOS_ARRANQUE",

            "TIEMPO_MUERTO_CORRECTIVOS",
        "TIEMPO_MUERTO_HERRAMENTALES",
            "CAMBIO_MOLDE_SETUP_EXCESOS",
            "TIEMPO_MUERTO_ARRANCAR",
            "TIEMPO_MUERTO_PROCESO",

            "TIEMPO_DISPONIBLE",
            "TIEMPO_PRODUCTIVO",
             -- NUEVO
            "KG_HR_LINEA",
            "KG_HR_PRODUCTO",
            "OBJETIVO_EFICIENCIA",
            "DISPONIBILIDAD_PORCENTAJE",
            "KG_POR_TIEMPO_DISPONIBLE",
            "KG_NETOS_HR_REALES",
            "PORCENTAJE_RENDIMIENTO",
            "PORCENTAJE_CALIDAD",
            "PORCENTAJE_OEE",
            "PORCENTAJE_EFICIENCIA_PRODUCTO",
            "EFICIENCIA_OPERATIVA",

            "USUARIO",
            "PLANTA",
            "ID_PARO",
            "COMENTARIOS",
            "FECHA_CREACION"
        )
        VALUES (
            :P_OTMC,
            :P_OTMP,
            :P_ID_PRODUCTO_TERMINADO,
            :P_MES,
            :P_FECHA,
            :P_LINEA,
            :P_CORRUGADOR,
            :P_PRODUCTO,
            :P_TURNO,
            :P_GRUPO,

            :P_PESO_MINIMO,
            :P_TRLIBERADOS,
            :P_PRODUCCION_NETA,
            :P_PESO_ESTANDAR,
            :P_PORCENTAJE_SOBREPESO,
            :P_SCRAP_SIN_CORTE_SIERRA,
            :P_SCRAP_CORTE_SIERRA,
            :P_SCRAP_TOTAL,
            :P_PORCENTAJE_SCRAP_SIN_CORTE,
            :P_PORCENTAJE_SCRAP_CORTE,
            :P_KG_REPROCESO,
            :P_CARBONATO,
            :P_HORAS_PROGRAMADAS,

            :P_MANTENIMIENTO_PREVENTIVO,
            :P_CONTROL_INVENTARIOS,
            :P_FALTA_ENERGIA,
            :P_FALTA_MATERIA_PRIMA,
            :P_PREPARACION_CAMBIO,
            :P_ARRANQUE_ESTABILIZACION,
            :P_TIEMPO_MTTO_CORRECTIVOS_ARRANQUE,

            :P_TIEMPO_MUERTO_CORRECTIVOS,
        :P_TIEMPO_MUERTO_HERRAMENTALES,
            :P_CAMBIO_MOLDE_SETUP_EXCESOS,
            :P_TIEMPO_MUERTO_ARRANCAR,
            :P_TIEMPO_MUERTO_PROCESO,

            :P_TIEMPO_DISPONIBLE,
            :P_TIEMPO_PRODUCTIVO,
            -- NUEVO
            :P_KG_HR_LINEA,
            :P_KG_HR_PRODUCTO,
            :P_OBJETIVO_EFICIENCIA,
            :P_DISPONIBILIDAD_PORCENTAJE,
            :P_KG_POR_TIEMPO_DISPONIBLE,
            :P_KG_NETOS_HR_REALES,
            :P_PORCENTAJE_RENDIMIENTO,
            :P_PORCENTAJE_CALIDAD,
            :P_PORCENTAJE_OEE,
            :P_PORCENTAJE_EFICIENCIA_PRODUCTO,
            :P_EFICIENCIA_OPERATIVA,

            :P_USUARIO,
            :P_PLANTA,
            :P_ID_PARO,
            :P_COMENTARIOS,
            :V_FECHA
        );

    END IF;

END
;

-- ----------------------------------------------------------------------------
-- 12) SpPdxMTTOConsultarTiemposMuertosCorrugado
-- ----------------------------------------------------------------------------
-- ----------------------------------------------------------------------------
-- 12) SpPdxMTTOConsultarTiemposMuertosCorrugado
-- ----------------------------------------------------------------------------
ALTER PROCEDURE "PTM_2022_FINAL"."SpPdxMTTOConsultarTiemposMuertosCorrugado"(
    IN p_FECHA_INICIO DATE,
    IN p_FECHA_FIN DATE,
    IN p_LINEA NVARCHAR(20),
    IN p_PLANTA INT,
    IN p_TURNO NVARCHAR(5),       --    NUEVO
    IN p_PRODUCTO NVARCHAR(50)    --    NUEVO
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN
SELECT
    "ID_REGISTRO",
    -- DATOS GENERALES
    "MES",
    "FECHA",
    "LINEA",
    "CORRUGADOR",
    "PRODUCTO",
    "TURNO",
    "GRUPO",
    "OTMC",
    "OTMP",
    "ID_PRODUCTO_TERMINADO",
    "PESO_MINIMO",
    "TRLIBERADOS",
    "PRODUCCION_NETA",
    "PESO_ESTANDAR",
    "PORCENTAJE_SOBREPESO",
    "SCRAP_SIN_CORTE_SIERRA",
    "SCRAP_CORTE_SIERRA",
    "SCRAP_TOTAL",
    "PORCENTAJE_SCRAP_SIN_CORTE",
    "PORCENTAJE_SCRAP_CORTE",
    "KG_REPROCESO",
    "CARBONATO",
    "HORAS_PROGRAMADAS",
    -- TIEMPO NO DISPONIBLE
    "MANTENIMIENTO_PREVENTIVO",
    "CONTROL_INVENTARIOS",
    "FALTA_ENERGIA",
    "FALTA_MATERIA_PRIMA",
    "PREPARACION_CAMBIO",
    "ARRANQUE_ESTABILIZACION",
    "TIEMPO_MTTO_CORRECTIVOS_ARRANQUE",
    -- TIEMPO NO PRODUCTIVO
    "TIEMPO_MUERTO_CORRECTIVOS",
    "TIEMPO_MUERTO_HERRAMENTALES",
    "CAMBIO_MOLDE_SETUP_EXCESOS",
    "TIEMPO_MUERTO_ARRANCAR",
    "TIEMPO_MUERTO_PROCESO",
    -- KPIs
    "TIEMPO_DISPONIBLE",
    "TIEMPO_PRODUCTIVO",
        -- NUEVO
    "KG_HR_LINEA",
    "KG_HR_PRODUCTO",
    "OBJETIVO_EFICIENCIA",
    "DISPONIBILIDAD_PORCENTAJE",
    "KG_POR_TIEMPO_DISPONIBLE",
    "KG_NETOS_HR_REALES",
    "PORCENTAJE_RENDIMIENTO",
    "PORCENTAJE_CALIDAD",
    "PORCENTAJE_OEE",
    "PORCENTAJE_EFICIENCIA_PRODUCTO",
    "EFICIENCIA_OPERATIVA",
    -- AUDITOR-A
    "USUARIO",
    "PLANTA",
    "FECHA_CREACION",
    "FECHA_ACTUALIZACION"
FROM "PdxMTTOTiemposMuertosProduccionCorrugado"
WHERE
    (
        :p_FECHA_INICIO IS NULL
        OR :p_FECHA_FIN IS NULL
        OR CAST("FECHA" AS DATE)
           BETWEEN :p_FECHA_INICIO AND :p_FECHA_FIN
    )
    AND (
        :p_LINEA IS NULL
        OR :p_LINEA = ''
        OR "LINEA" = :p_LINEA
    )
    AND (
        :p_PLANTA IS NULL
        OR "PLANTA" = :p_PLANTA
    )
    -- NUEVO: Filtro Turno
    AND (
        :p_TURNO IS NULL
        OR :p_TURNO = ''
        OR "TURNO" = :p_TURNO
    )
    -- NUEVO: Filtro Producto con LIKE
    AND (
        :p_PRODUCTO IS NULL
        OR :p_PRODUCTO = ''
        OR "PRODUCTO" LIKE '%' || :p_PRODUCTO || '%'
    )
    AND IFNULL("ESTATUS", 'A') = 'A'
ORDER BY
    TO_INT(SUBSTRING_REGEXPR('\\d+' IN "LINEA")),
    "FECHA",
    "TURNO",
    "GRUPO";
END
;

-- ============================================================================
-- VALIDACION
-- ============================================================================
SELECT PROCEDURE_NAME
FROM SYS.PROCEDURES
WHERE SCHEMA_NAME = 'PTM_2022_FINAL'
  AND PROCEDURE_NAME IN (
    'SpPdxMTTOConsultaEquipos','SpPdxMTTOInsertaEquipo','SpPdxMTTOActualizaEquipo',
    'SpPdxMTTOObtenerMantenimientosPorRango','SpPdxMTTOObtenerMantenimientosCorrectivos',
    'SpPdxMTTOMetricasOEE_PVC','SpPdxMTTOMetricasOEE_PeadLiso','SpPdxMTTOMetricasOEE_Corrugado','SpPdxMTTOMetricasOEE_INY',
    'SpPdxMTTOGuardarTiemposMuertosCorrugado','SpPdxMTTOConsultarTiemposMuertosCorrugado'
  )
ORDER BY PROCEDURE_NAME;

SELECT COLUMN_NAME, DATA_TYPE_NAME, LENGTH, SCALE
FROM SYS.TABLE_COLUMNS
WHERE SCHEMA_NAME = 'PTM_2022_FINAL'
  AND TABLE_NAME = 'PdxMTTOTiemposMuertosProduccionCorrugado'
  AND COLUMN_NAME = 'TIEMPO_MUERTO_HERRAMENTALES';
