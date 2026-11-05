CREATE PROCEDURE "DBADMIN"."SpPdxMTTOObtenerMantenimientosCorrectivos" (
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
    IN P_LINEA_PROD INT DEFAULT NULL
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
        TIENE_REFACCIONES        NVARCHAR(2)   -- ✅ nuevo
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
        -- ✅ nuevo: misma lógica que preventivos, aplica para OTMC también
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
