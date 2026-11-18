-- ============================================================================
-- 06 - SPs de GUARDADO de Tiempos Muertos (upsert por CLAVE_SYNC, dedupe, rango y token)
-- Schema: PTM_2022_FINAL (HANA on-premise)
-- Fecha: 2026-11-17
--
-- Generado desde las definiciones vivas de DBADMIN (las ya probadas).
-- Los 8 SPs YA EXISTEN en PTM_2022_FINAL: se usa ALTER PROCEDURE (permite
-- cambiar la firma agregando P_MODO / rango / P_TOKEN).
-- ============================================================================

SET SCHEMA "PTM_2022_FINAL";


-- ============================================================================
-- SpPdxMTTOGuardarTiemposMuertosPVC
-- ============================================================================
ALTER PROCEDURE "PTM_2022_FINAL"."SpPdxMTTOGuardarTiemposMuertosPVC" (
    IN P_ID_REGISTRO INT,
    IN P_FECHA DATE,
    IN P_LINEA NVARCHAR(20),
    IN P_PRODUCTO NVARCHAR(100),
    IN P_TURNO NVARCHAR(10),
    IN P_TRIP NVARCHAR(10),
    IN P_OTMC NCLOB,                      -- JSON array, ej. ["OT001","OT002"]
    IN P_OTMP NCLOB,                      -- CAMBIO: JSON array, ej. ["OP001","OP002"]
    IN P_ID_PRODUCTO_TERMINADO INTEGER,

    IN P_MES NVARCHAR(20),
    IN P_PESO_MINIMO DECIMAL(10,2),
    IN P_TR_FABRICADOS DECIMAL(10,2),
    IN P_PRODUCCION_NETA_REAL DECIMAL(10,2),
    IN P_PESO_ESTANDAR DECIMAL(10,2),
    IN P_PORCENTAJE_SOBREPESO DECIMAL(10,2),
    IN P_TOTAL_SCRAP_KG DECIMAL(10,2),
    IN P_PORCENTAJE_SCRAP DECIMAL(10,2),
    IN P_HORAS_PROGRAMADAS DECIMAL(10,2),

    IN P_MANTENIMIENTO_PREVENTIVO DECIMAL(10,2),
    IN P_CONTROL_INVENTARIOS DECIMAL(10,2),
    IN P_FALTA_MATERIA_INSUMOS DECIMAL(10,2),
    IN P_CAMBIO_MOLDE_HR DECIMAL(10,2),
    IN P_CALENTAMIENTO_HR DECIMAL(10,2),
    IN P_PARO_ARRANQUE_NO_PROGRAMADO DECIMAL(10,2),
    IN P_ARRANQUE_ESTABILIZACION_HR DECIMAL(10,2),

    IN P_MTTO_CORRECTIVOS DECIMAL(10,2),
    IN P_FALLA_ELECTRICA DECIMAL(10,2),
    IN P_SERVICIOS DECIMAL(10,2),
    IN P_CAMBIO_MOLDE_SETUP_EXCESOS DECIMAL(10,2),
    IN P_HERRAMENTAL DECIMAL(10,2),
    IN P_FALLA_OPERACION DECIMAL(10,2),
    IN P_LIMPIEZA_TANQUE DECIMAL(10,2),
    IN P_FALTA_MATERIAL DECIMAL(10,2),
    IN P_FALTA_PERSONAL DECIMAL(10,2),
    IN P_FALTA_REFACCIONES DECIMAL(10,2),

    IN P_TIEMPO_DISPONIBLE DECIMAL(10,2),
    IN P_TIEMPO_PRODUCTIVO DECIMAL(10,2),

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
    IN P_USUARIO NVARCHAR(50),
    IN P_PLANTA NVARCHAR(20),
    IN P_ID_PARO NCLOB,                   -- CAMBIO: JSON array, ej. [12, 15, 20]
    IN P_COMENTARIOS NVARCHAR(500),
    IN P_MODO NVARCHAR(10) DEFAULT NULL,
    IN P_FECHA_INICIO_RANGO DATE DEFAULT NULL,
    IN P_FECHA_FIN_RANGO DATE DEFAULT NULL,
    IN P_TOKEN NVARCHAR(50) DEFAULT NULL

)

LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER

AS
BEGIN

    DECLARE V_FECHA LONGDATE;
    DECLARE V_ID_REGISTRO INT;
    DECLARE V_ID_EXISTENTE INT;
    DECLARE V_ORIGEN NVARCHAR(20);
    DECLARE V_CLAVE_SYNC NVARCHAR(300);
    DECLARE V_TOKEN_ACTUAL NVARCHAR(50);
    DECLARE V_CONFLICTO BOOLEAN := FALSE;
    DECLARE V_OTMC_DEDUP NCLOB;
    DECLARE V_OTMP_DEDUP NCLOB;
    DECLARE V_ID_PARO_DEDUP NCLOB;

    SELECT ADD_SECONDS(CURRENT_UTCTIMESTAMP, -6*3600)
    INTO V_FECHA
    FROM DUMMY;

    -- ============================
    -- ORIGEN / CLAVE DE SINCRONIZACION
    -- ============================
    V_ID_REGISTRO := :P_ID_REGISTRO;

    IF :P_ID_PRODUCTO_TERMINADO IS NOT NULL THEN
        V_ORIGEN := 'NWSCALE';
        IF UPPER(COALESCE(:P_MODO,'')) = 'RANGO'
           AND :P_FECHA_INICIO_RANGO IS NOT NULL
           AND :P_FECHA_FIN_RANGO IS NOT NULL THEN
            V_CLAVE_SYNC := 'N|' || COALESCE(:P_PLANTA,'') || '|RANGO|' || TO_VARCHAR(:P_FECHA_INICIO_RANGO,'YYYYMMDD') || '|' || TO_VARCHAR(:P_FECHA_FIN_RANGO,'YYYYMMDD') || '|' || COALESCE(:P_LINEA,'') || '|' || COALESCE(:P_PRODUCTO,'');
        ELSE
            V_CLAVE_SYNC := 'N|' || COALESCE(:P_PLANTA,'') || '|DIA|' || COALESCE(TO_VARCHAR(:P_FECHA,'YYYYMMDD'),'') || '|' || COALESCE(:P_LINEA,'') || '|' || COALESCE(:P_PRODUCTO,'') || '|' || COALESCE(:P_TURNO,'');
        END IF;
    ELSEIF LENGTH(COALESCE(:P_OTMC,'')) > 2
        OR LENGTH(COALESCE(:P_OTMP,'')) > 2
        OR LENGTH(COALESCE(:P_ID_PARO,'')) > 0 THEN
        V_ORIGEN := 'MANUAL';
        V_CLAVE_SYNC := 'M|' || COALESCE(:P_PLANTA,'') || '|' || COALESCE(TO_VARCHAR(:P_FECHA,'YYYYMMDD'),'') || '|' || COALESCE(:P_LINEA,'');
    ELSEIF :P_PRODUCTO IS NOT NULL OR :P_TURNO IS NOT NULL THEN
        V_ORIGEN := 'LEGACY';
        V_CLAVE_SYNC := 'N|' || COALESCE(:P_PLANTA,'') || '|DIA|' || COALESCE(TO_VARCHAR(:P_FECHA,'YYYYMMDD'),'') || '|' || COALESCE(:P_LINEA,'') || '|' || COALESCE(:P_PRODUCTO,'') || '|' || COALESCE(:P_TURNO,'');
    ELSE
        V_ORIGEN := 'SIN_ORIGEN';
        V_CLAVE_SYNC := 'X|' || TO_VARCHAR(CURRENT_UTCTIMESTAMP,'YYYYMMDDHH24MISSFF6');
    END IF;

    -- Si no viene ID, buscar la fila por CLAVE_SYNC (upsert idempotente)
    IF :V_ID_REGISTRO IS NULL THEN
        SELECT MAX("ID_REGISTRO")
        INTO V_ID_EXISTENTE
        FROM "PdxMTTOTiemposMuertosProduccionPVC"
        WHERE "CLAVE_SYNC" = :V_CLAVE_SYNC;

        V_ID_REGISTRO := V_ID_EXISTENTE;
    END IF;

    -- ============================
    -- DEDUPE DE LISTAS
    -- ============================
    IF :P_OTMC IS NOT NULL AND LENGTH(:P_OTMC) > 2 THEN
        SELECT '[' || STRING_AGG('"' || V || '"', ',') || ']'
        INTO V_OTMC_DEDUP
        FROM (
            SELECT DISTINCT "value" AS V
            FROM JSON_TABLE(:P_OTMC, '$[*]' COLUMNS("value" NVARCHAR(100) PATH '$'))
        );
    ELSE
        V_OTMC_DEDUP := :P_OTMC;
    END IF;

    IF :P_OTMP IS NOT NULL AND LENGTH(:P_OTMP) > 2 THEN
        SELECT '[' || STRING_AGG('"' || V || '"', ',') || ']'
        INTO V_OTMP_DEDUP
        FROM (
            SELECT DISTINCT "value" AS V
            FROM JSON_TABLE(:P_OTMP, '$[*]' COLUMNS("value" NVARCHAR(100) PATH '$'))
        );
    ELSE
        V_OTMP_DEDUP := :P_OTMP;
    END IF;

    IF :P_ID_PARO IS NOT NULL AND LENGTH(:P_ID_PARO) > 0 THEN
        SELECT STRING_AGG(V, '|')
        INTO V_ID_PARO_DEDUP
        FROM (
            SELECT DISTINCT TRIM(SUBSTRING_REGEXPR('[^|]+' IN TO_NVARCHAR(:P_ID_PARO) OCCURRENCE N.ELEMENT_NUMBER)) AS V
            FROM SERIES_GENERATE_INTEGER(1, 1, 1000) AS N
            WHERE N.ELEMENT_NUMBER <= OCCURRENCES_REGEXPR('[^|]+' IN TO_NVARCHAR(:P_ID_PARO))
        );
    ELSE
        V_ID_PARO_DEDUP := :P_ID_PARO;
    END IF;

    -- ============================
    -- TOKEN DE VERSION
    -- ============================
    IF :V_ID_REGISTRO IS NOT NULL AND :P_TOKEN IS NOT NULL THEN
        SELECT MAX(TO_VARCHAR("FECHA_ACTUALIZACION",'YYYYMMDDHH24MISSFF6'))
        INTO V_TOKEN_ACTUAL
        FROM "PdxMTTOTiemposMuertosProduccionPVC"
        WHERE "ID_REGISTRO" = :V_ID_REGISTRO;

        IF V_TOKEN_ACTUAL IS NOT NULL AND V_TOKEN_ACTUAL <> :P_TOKEN THEN
            V_CONFLICTO := TRUE;
        END IF;
    END IF;

    -- ============================
    -- UPDATE / INSERT (con control de conflicto)
    -- ============================
    IF :V_CONFLICTO = TRUE THEN

        SELECT 'CONFLICTO' AS "Estatus",
               'La fila fue modificada por otro usuario. Recarga antes de guardar.' AS "Mensaje"
        FROM DUMMY;

    ELSE

    IF :V_ID_REGISTRO IS NOT NULL THEN

        UPDATE "PdxMTTOTiemposMuertosProduccionPVC"
        SET
            "FECHA" = :P_FECHA,
            "LINEA" = :P_LINEA,
            "PRODUCTO" = :P_PRODUCTO,
            "TURNO" = :P_TURNO,
            "TRIP" = :P_TRIP,
            "OTMC" = :V_OTMC_DEDUP,
            "OTMP" = :V_OTMP_DEDUP,
            "ID_PRODUCTO_TERMINADO" = :P_ID_PRODUCTO_TERMINADO,
            "MES" = :P_MES,
            "PESO_MINIMO" = :P_PESO_MINIMO,
            "TR_FABRICADOS" = :P_TR_FABRICADOS,
            "PRODUCCION_NETA_REAL" = :P_PRODUCCION_NETA_REAL,
            "PESO_ESTANDAR" = :P_PESO_ESTANDAR,
            "PORCENTAJE_SOBREPESO" = :P_PORCENTAJE_SOBREPESO,
            "TOTAL_SCRAP_KG" = :P_TOTAL_SCRAP_KG,
            "PORCENTAJE_SCRAP" = :P_PORCENTAJE_SCRAP,

            "HORAS_PROGRAMADAS" = :P_HORAS_PROGRAMADAS,

            "MANTENIMIENTO_PREVENTIVO" = :P_MANTENIMIENTO_PREVENTIVO,
            "CONTROL_INVENTARIOS" = :P_CONTROL_INVENTARIOS,
            "FALTA_MATERIA_INSUMOS" = :P_FALTA_MATERIA_INSUMOS,
            "CAMBIO_MOLDE_HR" = :P_CAMBIO_MOLDE_HR,
            "CALENTAMIENTO_HR" = :P_CALENTAMIENTO_HR,
            "PARO_ARRANQUE_NO_PROGRAMADO" = :P_PARO_ARRANQUE_NO_PROGRAMADO,
            "ARRANQUE_ESTABILIZACION_HR" = :P_ARRANQUE_ESTABILIZACION_HR,

            "MTTO_CORRECTIVOS" = :P_MTTO_CORRECTIVOS,
            "FALLA_ELECTRICA" = :P_FALLA_ELECTRICA,
            "SERVICIOS" = :P_SERVICIOS,
            "CAMBIO_MOLDE_SETUP_EXCESOS" = :P_CAMBIO_MOLDE_SETUP_EXCESOS,
            "HERRAMENTAL" = :P_HERRAMENTAL,
            "FALLA_OPERACION" = :P_FALLA_OPERACION,
            "LIMPIEZA_TANQUE" = :P_LIMPIEZA_TANQUE,
            "FALTA_MATERIAL" = :P_FALTA_MATERIAL,
            "FALTA_PERSONAL" = :P_FALTA_PERSONAL,
            "FALTA_REFACCIONES" = :P_FALTA_REFACCIONES,

            "TIEMPO_DISPONIBLE" = :P_TIEMPO_DISPONIBLE,
            "TIEMPO_PRODUCTIVO" = :P_TIEMPO_PRODUCTIVO,

            "KG_HR_LINEA" = :P_KG_HR_LINEA,
            "KG_HR_PRODUCTO" = :P_KG_HR_PRODUCTO,
            "OBJETIVO_EFICIENCIA" = :P_OBJETIVO_EFICIENCIA,
            "DISPONIBILIDAD_PORCENTAJE" = :P_DISPONIBILIDAD_PORCENTAJE,
            "KG_POR_TIEMPO_DISPONIBLE" = :P_KG_POR_TIEMPO_DISPONIBLE,
            "KG_NETOS_HR_REALES" = :P_KG_NETOS_HR_REALES,
            "PORCENTAJE_RENDIMIENTO" = :P_PORCENTAJE_RENDIMIENTO,
            "PORCENTAJE_CALIDAD" = :P_PORCENTAJE_CALIDAD,
            "PORCENTAJE_OEE" = :P_PORCENTAJE_OEE,
            "PORCENTAJE_EFICIENCIA_PRODUCTO" = :P_PORCENTAJE_EFICIENCIA_PRODUCTO,
            "EFICIENCIA_OPERATIVA" = :P_EFICIENCIA_OPERATIVA,
            "USUARIO" = :P_USUARIO,
            "PLANTA" = :P_PLANTA,
            "ID_PARO" = :V_ID_PARO_DEDUP,
            "COMENTARIOS" = :P_COMENTARIOS,
            "MODO" = :P_MODO,
            "FECHA_INICIO_RANGO" = :P_FECHA_INICIO_RANGO,
            "FECHA_FIN_RANGO" = :P_FECHA_FIN_RANGO,
            "ORIGEN" = :V_ORIGEN,
            "CLAVE_SYNC" = :V_CLAVE_SYNC,
            "FECHA_ACTUALIZACION" = :V_FECHA

        WHERE "ID_REGISTRO" = :V_ID_REGISTRO;

    ELSE

    -- ============================
    -- INSERT
    -- ============================

        INSERT INTO "PdxMTTOTiemposMuertosProduccionPVC" (

            "FECHA",
            "LINEA",
            "PRODUCTO",
            "TURNO",
            "TRIP",
            "OTMC",
            "OTMP",
            "ID_PRODUCTO_TERMINADO",

            "MES",

            "PESO_MINIMO",
            "TR_FABRICADOS",
            "PRODUCCION_NETA_REAL",
            "PESO_ESTANDAR",
            "PORCENTAJE_SOBREPESO",
            "TOTAL_SCRAP_KG",
            "PORCENTAJE_SCRAP",

            "HORAS_PROGRAMADAS",

            "MANTENIMIENTO_PREVENTIVO",
            "CONTROL_INVENTARIOS",
            "FALTA_MATERIA_INSUMOS",
            "CAMBIO_MOLDE_HR",
            "CALENTAMIENTO_HR",
            "PARO_ARRANQUE_NO_PROGRAMADO",
            "ARRANQUE_ESTABILIZACION_HR",

            "MTTO_CORRECTIVOS",
            "FALLA_ELECTRICA",
            "SERVICIOS",
            "CAMBIO_MOLDE_SETUP_EXCESOS",
            "HERRAMENTAL",
            "FALLA_OPERACION",
            "LIMPIEZA_TANQUE",
            "FALTA_MATERIAL",
            "FALTA_PERSONAL",
            "FALTA_REFACCIONES",

            "TIEMPO_DISPONIBLE",
            "TIEMPO_PRODUCTIVO",

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
            "MODO",
            "FECHA_INICIO_RANGO",
            "FECHA_FIN_RANGO",
            "ORIGEN",
            "CLAVE_SYNC",
            "FECHA_CREACION",
            "FECHA_ACTUALIZACION"

        )

        VALUES (
            :P_FECHA,
            :P_LINEA,
            :P_PRODUCTO,
            :P_TURNO,
            :P_TRIP,
            :V_OTMC_DEDUP,
            :V_OTMP_DEDUP,
            :P_ID_PRODUCTO_TERMINADO,

            :P_MES,

            :P_PESO_MINIMO,
            :P_TR_FABRICADOS,
            :P_PRODUCCION_NETA_REAL,
            :P_PESO_ESTANDAR,
            :P_PORCENTAJE_SOBREPESO,
            :P_TOTAL_SCRAP_KG,
            :P_PORCENTAJE_SCRAP,

            :P_HORAS_PROGRAMADAS,

            :P_MANTENIMIENTO_PREVENTIVO,
            :P_CONTROL_INVENTARIOS,
            :P_FALTA_MATERIA_INSUMOS,
            :P_CAMBIO_MOLDE_HR,
            :P_CALENTAMIENTO_HR,
            :P_PARO_ARRANQUE_NO_PROGRAMADO,
            :P_ARRANQUE_ESTABILIZACION_HR,

            :P_MTTO_CORRECTIVOS,
            :P_FALLA_ELECTRICA,
            :P_SERVICIOS,
            :P_CAMBIO_MOLDE_SETUP_EXCESOS,
            :P_HERRAMENTAL,
            :P_FALLA_OPERACION,
            :P_LIMPIEZA_TANQUE,
            :P_FALTA_MATERIAL,
            :P_FALTA_PERSONAL,
            :P_FALTA_REFACCIONES,

            :P_TIEMPO_DISPONIBLE,
            :P_TIEMPO_PRODUCTIVO,

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
            :V_ID_PARO_DEDUP,
            :P_COMENTARIOS,
            :P_MODO,
            :P_FECHA_INICIO_RANGO,
            :P_FECHA_FIN_RANGO,
            :V_ORIGEN,
            :V_CLAVE_SYNC,
            :V_FECHA,
            :V_FECHA
        );

    END IF;

        SELECT 'OK' AS "Estatus", 'Guardado' AS "Mensaje" FROM DUMMY;

    END IF;

END


-- ============================================================================
-- SpPdxMTTOGuardarTiemposMuertosINY
-- ============================================================================


-- ============================================================================
-- SpPdxMTTOGuardarTiemposMuertosINY
-- ============================================================================
ALTER PROCEDURE "PTM_2022_FINAL"."SpPdxMTTOGuardarTiemposMuertosINY" (

    IN P_ID_REGISTRO INT,

    IN P_FECHA DATE,
    IN P_LINEA NVARCHAR(20),
    IN P_INYECTORA NVARCHAR(50),
    IN P_PRODUCTO NVARCHAR(100),
    IN P_DESCRIPCION NVARCHAR(200),
    IN P_OP NVARCHAR(50),
    IN P_TURNO NVARCHAR(10),
    IN P_GRUPO NVARCHAR(10),

    IN P_OTMC NCLOB,      -- CAMBIO: JSON array, ej. ["OT001","OT002"]
	IN P_OTMP NCLOB,      -- CAMBIO: JSON array, ej. ["OP001","OP002"]
    IN P_ID_PRODUCTO_TERMINADO INTEGER,

    IN P_MES NVARCHAR(20),

    IN P_PESO_MINIMO DECIMAL(10,2),
    IN P_TR_LIBERADOS DECIMAL(10,2),
    IN P_PRODUCCION_NETA DECIMAL(10,2),
    IN P_SCRAP_SIN_COLADA DECIMAL(10,2),
    IN P_SCRAP_COLADA DECIMAL(10,2),
    IN P_TOTAL_SCRAP DECIMAL(10,2),

    IN P_HORAS_PROGRAMADAS DECIMAL(10,2),

    IN P_PREVENTIVO DECIMAL(10,2),
    IN P_CONTROL_INVENTARIOS DECIMAL(10,2),
    IN P_FALTA_MATERIA_PRIMA DECIMAL(10,2),
    IN P_PREPARACION_LINEA DECIMAL(10,2),

    IN P_TIEMPO_MUERTO_CORRECTIVOS DECIMAL(10,2),
    IN P_TIEMPO_MUERTO_HERRAMENTALES DECIMAL(10,2),
    IN P_TIEMPO_MUERTO_ARRANQUES DECIMAL(10,2),
    IN P_FALLA_MATERIAL DECIMAL(10,2),
    IN P_FALTA_PERSONAL DECIMAL(10,2),
    IN P_FALLA_ELECTRICA DECIMAL(10,2),
    IN P_TIEMPO_MUERTO_PROCESO DECIMAL(10,2),

    IN P_TIEMPO_DISPONIBLE DECIMAL(10,2),
    IN P_TIEMPO_PRODUCTIVO DECIMAL(10,2),

    -- ========================================
    -- KPIs
    -- ========================================
    IN P_KG_HR_LINEA DECIMAL(10,2),
    IN P_KG_HR_PRODUCTO DECIMAL(10,2),
    IN P_OBJETIVO_EFICIENCIA DECIMAL(10,2),
    IN P_PORCENTAJE_DISPONIBILIDAD DECIMAL(10,2),
    IN P_KG_POR_TIEMPO_DISPONIBLE DECIMAL(10,2),
    IN P_KG_NETOS_HR_REALES DECIMAL(10,2),
    IN P_PORCENTAJE_RENDIMIENTO DECIMAL(10,2),
    IN P_PORCENTAJE_CALIDAD DECIMAL(10,2),
    IN P_PORCENTAJE_OEE DECIMAL(10,2),
    IN P_PORCENTAJE_EFICIENCIA_PRODUCTO DECIMAL(10,2),
    IN P_EFICIENCIA_OPERATIVA DECIMAL(10,2),

    IN P_USUARIO NVARCHAR(50),
    IN P_PLANTA NVARCHAR(20),
    IN P_ID_PARO NCLOB,   -- CAMBIO: JSON array de strings, ej. ["12","15"]
    IN P_COMENTARIOS NVARCHAR(500)
,
    IN P_MODO NVARCHAR(10) DEFAULT NULL,
    IN P_FECHA_INICIO_RANGO DATE DEFAULT NULL,
    IN P_FECHA_FIN_RANGO DATE DEFAULT NULL,
    IN P_TOKEN NVARCHAR(50) DEFAULT NULL
)

LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER

AS
BEGIN

        DECLARE V_FECHA LONGDATE;
    DECLARE V_ID_REGISTRO INT;
    DECLARE V_ID_EXISTENTE INT;
    DECLARE V_ORIGEN NVARCHAR(20);
    DECLARE V_CLAVE_SYNC NVARCHAR(300);
    DECLARE V_TOKEN_ACTUAL NVARCHAR(50);
    DECLARE V_CONFLICTO BOOLEAN := FALSE;
    DECLARE V_OTMC_DEDUP NCLOB;
    DECLARE V_OTMP_DEDUP NCLOB;
    DECLARE V_ID_PARO_DEDUP NCLOB;

    SELECT ADD_SECONDS(CURRENT_UTCTIMESTAMP, -6*3600)
    INTO V_FECHA
    FROM DUMMY;
    -- ============================
    -- ORIGEN / CLAVE DE SINCRONIZACION
    -- ============================
    V_ID_REGISTRO := :P_ID_REGISTRO;

    IF :P_ID_PRODUCTO_TERMINADO IS NOT NULL THEN
        V_ORIGEN := 'NWSCALE';
        IF UPPER(COALESCE(:P_MODO,'')) = 'RANGO'
           AND :P_FECHA_INICIO_RANGO IS NOT NULL
           AND :P_FECHA_FIN_RANGO IS NOT NULL THEN
            V_CLAVE_SYNC := 'N|' || COALESCE(TO_NVARCHAR(:P_PLANTA),'') || '|RANGO|' || TO_VARCHAR(:P_FECHA_INICIO_RANGO,'YYYYMMDD') || '|' || TO_VARCHAR(:P_FECHA_FIN_RANGO,'YYYYMMDD') || '|' || COALESCE(:P_LINEA,'') || '|' || COALESCE(:P_PRODUCTO,'');
        ELSE
            V_CLAVE_SYNC := 'N|' || COALESCE(TO_NVARCHAR(:P_PLANTA),'') || '|DIA|' || COALESCE(TO_VARCHAR(:P_FECHA,'YYYYMMDD'),'') || '|' || COALESCE(:P_LINEA,'') || '|' || COALESCE(:P_PRODUCTO,'') || '|' || COALESCE(:P_TURNO,'');
        END IF;
    ELSEIF LENGTH(COALESCE(:P_OTMC,'')) > 2
        OR LENGTH(COALESCE(:P_OTMP,'')) > 2
        OR LENGTH(COALESCE(:P_ID_PARO,'')) > 0 THEN
        V_ORIGEN := 'MANUAL';
        V_CLAVE_SYNC := 'M|' || COALESCE(TO_NVARCHAR(:P_PLANTA),'') || '|' || COALESCE(TO_VARCHAR(:P_FECHA,'YYYYMMDD'),'') || '|' || COALESCE(:P_LINEA,'');
    ELSEIF :P_PRODUCTO IS NOT NULL OR :P_TURNO IS NOT NULL THEN
        V_ORIGEN := 'LEGACY';
        V_CLAVE_SYNC := 'N|' || COALESCE(TO_NVARCHAR(:P_PLANTA),'') || '|DIA|' || COALESCE(TO_VARCHAR(:P_FECHA,'YYYYMMDD'),'') || '|' || COALESCE(:P_LINEA,'') || '|' || COALESCE(:P_PRODUCTO,'') || '|' || COALESCE(:P_TURNO,'');
    ELSE
        V_ORIGEN := 'SIN_ORIGEN';
        V_CLAVE_SYNC := 'X|' || TO_VARCHAR(CURRENT_UTCTIMESTAMP,'YYYYMMDDHH24MISSFF6');
    END IF;

    -- Si no viene ID, buscar la fila por CLAVE_SYNC (upsert idempotente)
    IF :V_ID_REGISTRO IS NULL THEN
        SELECT MAX("ID_REGISTRO")
        INTO V_ID_EXISTENTE
        FROM "PdxMTTOTiemposMuertosProduccionINY"
        WHERE "CLAVE_SYNC" = :V_CLAVE_SYNC;

        V_ID_REGISTRO := V_ID_EXISTENTE;
    END IF;

    -- ============================
    -- DEDUPE DE LISTAS
    -- ============================
    IF :P_OTMC IS NOT NULL AND LENGTH(:P_OTMC) > 2 THEN
        SELECT '[' || STRING_AGG('"' || V || '"', ',') || ']'
        INTO V_OTMC_DEDUP
        FROM (
            SELECT DISTINCT "value" AS V
            FROM JSON_TABLE(:P_OTMC, '$[*]' COLUMNS("value" NVARCHAR(100) PATH '$'))
        );
    ELSE
        V_OTMC_DEDUP := :P_OTMC;
    END IF;

    IF :P_OTMP IS NOT NULL AND LENGTH(:P_OTMP) > 2 THEN
        SELECT '[' || STRING_AGG('"' || V || '"', ',') || ']'
        INTO V_OTMP_DEDUP
        FROM (
            SELECT DISTINCT "value" AS V
            FROM JSON_TABLE(:P_OTMP, '$[*]' COLUMNS("value" NVARCHAR(100) PATH '$'))
        );
    ELSE
        V_OTMP_DEDUP := :P_OTMP;
    END IF;

    IF :P_ID_PARO IS NOT NULL AND LENGTH(:P_ID_PARO) > 0 THEN
        SELECT STRING_AGG(V, '|')
        INTO V_ID_PARO_DEDUP
        FROM (
            SELECT DISTINCT TRIM(SUBSTRING_REGEXPR('[^|]+' IN TO_NVARCHAR(:P_ID_PARO) OCCURRENCE N.ELEMENT_NUMBER)) AS V
            FROM SERIES_GENERATE_INTEGER(1, 1, 1000) AS N
            WHERE N.ELEMENT_NUMBER <= OCCURRENCES_REGEXPR('[^|]+' IN TO_NVARCHAR(:P_ID_PARO))
        );
    ELSE
        V_ID_PARO_DEDUP := :P_ID_PARO;
    END IF;

    -- ============================
    -- TOKEN DE VERSION
    -- ============================
    IF :V_ID_REGISTRO IS NOT NULL AND :P_TOKEN IS NOT NULL THEN
        SELECT MAX(TO_VARCHAR("FECHA_ACTUALIZACION",'YYYYMMDDHH24MISSFF6'))
        INTO V_TOKEN_ACTUAL
        FROM "PdxMTTOTiemposMuertosProduccionINY"
        WHERE "ID_REGISTRO" = :V_ID_REGISTRO;

        IF V_TOKEN_ACTUAL IS NOT NULL AND V_TOKEN_ACTUAL <> :P_TOKEN THEN
            V_CONFLICTO := TRUE;
        END IF;
    END IF;



    -- ========================================
    -- UPDATE
    -- ========================================
    IF :V_CONFLICTO = TRUE THEN

        SELECT 'CONFLICTO' AS "Estatus",
               'La fila fue modificada por otro usuario. Recarga antes de guardar.' AS "Mensaje"
        FROM DUMMY;

    ELSE

    IF :V_ID_REGISTRO IS NOT NULL THEN

        UPDATE "PdxMTTOTiemposMuertosProduccionINY"
        SET

            "FECHA" = :P_FECHA,
            "LINEA" = :P_LINEA,
            "INYECTORA" = :P_INYECTORA,
            "PRODUCTO" = :P_PRODUCTO,
            "DESCRIPCION" = :P_DESCRIPCION,
            "OP" = :P_OP,
            "TURNO" = :P_TURNO,
            "GRUPO" = :P_GRUPO,

            "OTMC" = :V_OTMC_DEDUP,
            "OTMP" = :V_OTMP_DEDUP,
            "ID_PRODUCTO_TERMINADO" = :P_ID_PRODUCTO_TERMINADO,

            "MES" = :P_MES,

            -- PRODUCCION
            "PESO_MINIMO" = :P_PESO_MINIMO,
            "TR_LIBERADOS" = :P_TR_LIBERADOS,
            "PRODUCCION_NETA" = :P_PRODUCCION_NETA,
            "SCRAP_SIN_COLADA" = :P_SCRAP_SIN_COLADA,
            "SCRAP_COLADA" = :P_SCRAP_COLADA,
            "TOTAL_SCRAP" = :P_TOTAL_SCRAP,

            -- DISPONIBILIDAD
            "HORAS_PROGRAMADAS" = :P_HORAS_PROGRAMADAS,

            -- TIEMPO NO DISPONIBLE
            "PREVENTIVO" = :P_PREVENTIVO,
            "CONTROL_INVENTARIOS" = :P_CONTROL_INVENTARIOS,
            "FALTA_MATERIA_PRIMA" = :P_FALTA_MATERIA_PRIMA,
            "PREPARACION_LINEA" = :P_PREPARACION_LINEA,

            -- TIEMPO NO PRODUCTIVO
            "TIEMPO_MUERTO_CORRECTIVOS" = :P_TIEMPO_MUERTO_CORRECTIVOS,
            "TIEMPO_MUERTO_HERRAMENTALES" = :P_TIEMPO_MUERTO_HERRAMENTALES,
            "TIEMPO_MUERTO_ARRANQUES" = :P_TIEMPO_MUERTO_ARRANQUES,
            "FALLA_MATERIAL" = :P_FALLA_MATERIAL,
            "FALTA_PERSONAL" = :P_FALTA_PERSONAL,
            "FALLA_ELECTRICA" = :P_FALLA_ELECTRICA,
            "TIEMPO_MUERTO_PROCESO" = :P_TIEMPO_MUERTO_PROCESO,

            -- TIEMPOS
            "TIEMPO_DISPONIBLE" = :P_TIEMPO_DISPONIBLE,
            "TIEMPO_PRODUCTIVO" = :P_TIEMPO_PRODUCTIVO,

            -- KPIs
            "KG_HR_LINEA" = :P_KG_HR_LINEA,
            "KG_HR_PRODUCTO" = :P_KG_HR_PRODUCTO,
            "OBJETIVO_EFICIENCIA" = :P_OBJETIVO_EFICIENCIA,
            "PORCENTAJE_DISPONIBILIDAD" = :P_PORCENTAJE_DISPONIBILIDAD,
            "KG_POR_TIEMPO_DISPONIBLE" = :P_KG_POR_TIEMPO_DISPONIBLE,
            "KG_NETOS_HR_REALES" = :P_KG_NETOS_HR_REALES,
            "PORCENTAJE_RENDIMIENTO" = :P_PORCENTAJE_RENDIMIENTO,
            "PORCENTAJE_CALIDAD" = :P_PORCENTAJE_CALIDAD,
            "PORCENTAJE_OEE" = :P_PORCENTAJE_OEE,
            "PORCENTAJE_EFICIENCIA_PRODUCTO" = :P_PORCENTAJE_EFICIENCIA_PRODUCTO,
            "EFICIENCIA_OPERATIVA" = :P_EFICIENCIA_OPERATIVA,

            -- AUDITORIA
            "USUARIO" = :P_USUARIO,
            "PLANTA" = :P_PLANTA,
            "ID_PARO" = :V_ID_PARO_DEDUP,
            "COMENTARIOS" = :P_COMENTARIOS,
            "MODO" = :P_MODO,
            "FECHA_INICIO_RANGO" = :P_FECHA_INICIO_RANGO,
            "FECHA_FIN_RANGO" = :P_FECHA_FIN_RANGO,
            "ORIGEN" = :V_ORIGEN,
            "CLAVE_SYNC" = :V_CLAVE_SYNC,
            "FECHA_ACTUALIZACION" = :V_FECHA

        WHERE "ID_REGISTRO" = :V_ID_REGISTRO;


    ELSE

        -- ========================================
        -- INSERT
        -- ========================================

        INSERT INTO "PdxMTTOTiemposMuertosProduccionINY" (

            "FECHA",
            "LINEA",
            "INYECTORA",
            "PRODUCTO",
            "DESCRIPCION",
            "OP",
            "TURNO",
            "GRUPO",

            "OTMC",
            "OTMP",
            "ID_PRODUCTO_TERMINADO",

            "MES",

            -- PRODUCCION
            "PESO_MINIMO",
            "TR_LIBERADOS",
            "PRODUCCION_NETA",
            "SCRAP_SIN_COLADA",
            "SCRAP_COLADA",
            "TOTAL_SCRAP",

            -- DISPONIBILIDAD
            "HORAS_PROGRAMADAS",

            -- TIEMPO NO DISPONIBLE
            "PREVENTIVO",
            "CONTROL_INVENTARIOS",
            "FALTA_MATERIA_PRIMA",
            "PREPARACION_LINEA",

            -- TIEMPO NO PRODUCTIVO
            "TIEMPO_MUERTO_CORRECTIVOS",
            "TIEMPO_MUERTO_HERRAMENTALES",
            "TIEMPO_MUERTO_ARRANQUES",
            "FALLA_MATERIAL",
            "FALTA_PERSONAL",
            "FALLA_ELECTRICA",
            "TIEMPO_MUERTO_PROCESO",

            -- TIEMPOS
            "TIEMPO_DISPONIBLE",
            "TIEMPO_PRODUCTIVO",

            -- KPIs
            "KG_HR_LINEA",
            "KG_HR_PRODUCTO",
            "OBJETIVO_EFICIENCIA",
            "PORCENTAJE_DISPONIBILIDAD",
            "KG_POR_TIEMPO_DISPONIBLE",
            "KG_NETOS_HR_REALES",
            "PORCENTAJE_RENDIMIENTO",
            "PORCENTAJE_CALIDAD",
            "PORCENTAJE_OEE",
            "PORCENTAJE_EFICIENCIA_PRODUCTO",
            "EFICIENCIA_OPERATIVA",

            -- AUDITORIA
            "USUARIO",
            "PLANTA",
            "ID_PARO",
            "COMENTARIOS",
            "MODO",
            "FECHA_INICIO_RANGO",
            "FECHA_FIN_RANGO",
            "ORIGEN",
            "CLAVE_SYNC",
            "FECHA_CREACION",
            "FECHA_ACTUALIZACION"

        )

        VALUES (

            :P_FECHA,
            :P_LINEA,
            :P_INYECTORA,
            :P_PRODUCTO,
            :P_DESCRIPCION,
            :P_OP,
            :P_TURNO,
            :P_GRUPO,

            :V_OTMC_DEDUP,
            :V_OTMP_DEDUP,
            :P_ID_PRODUCTO_TERMINADO,

            :P_MES,

            -- PRODUCCION
            :P_PESO_MINIMO,
            :P_TR_LIBERADOS,
            :P_PRODUCCION_NETA,
            :P_SCRAP_SIN_COLADA,
            :P_SCRAP_COLADA,
            :P_TOTAL_SCRAP,

            -- DISPONIBILIDAD
            :P_HORAS_PROGRAMADAS,

            -- TIEMPO NO DISPONIBLE
            :P_PREVENTIVO,
            :P_CONTROL_INVENTARIOS,
            :P_FALTA_MATERIA_PRIMA,
            :P_PREPARACION_LINEA,

            -- TIEMPO NO PRODUCTIVO
            :P_TIEMPO_MUERTO_CORRECTIVOS,
            :P_TIEMPO_MUERTO_HERRAMENTALES,
            :P_TIEMPO_MUERTO_ARRANQUES,
            :P_FALLA_MATERIAL,
            :P_FALTA_PERSONAL,
            :P_FALLA_ELECTRICA,
            :P_TIEMPO_MUERTO_PROCESO,

            -- TIEMPOS
            :P_TIEMPO_DISPONIBLE,
            :P_TIEMPO_PRODUCTIVO,

            -- KPIs
            :P_KG_HR_LINEA,
            :P_KG_HR_PRODUCTO,
            :P_OBJETIVO_EFICIENCIA,
            :P_PORCENTAJE_DISPONIBILIDAD,
            :P_KG_POR_TIEMPO_DISPONIBLE,
            :P_KG_NETOS_HR_REALES,
            :P_PORCENTAJE_RENDIMIENTO,
            :P_PORCENTAJE_CALIDAD,
            :P_PORCENTAJE_OEE,
            :P_PORCENTAJE_EFICIENCIA_PRODUCTO,
            :P_EFICIENCIA_OPERATIVA,

            -- AUDITORIA
            :P_USUARIO,
            :P_PLANTA,
            :V_ID_PARO_DEDUP,
            :P_COMENTARIOS,
            :P_MODO,
            :P_FECHA_INICIO_RANGO,
            :P_FECHA_FIN_RANGO,
            :V_ORIGEN,
            :V_CLAVE_SYNC,
            :V_FECHA,
            :V_FECHA

        );

    END IF;

        SELECT 'OK' AS "Estatus", 'Guardado' AS "Mensaje" FROM DUMMY;

    END IF;

END


-- ============================================================================
-- SpPdxMTTOGuardarTiemposMuertosCorrugado
-- ============================================================================


-- ============================================================================
-- SpPdxMTTOGuardarTiemposMuertosCorrugado
-- ============================================================================
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

    -- AUDITORIA
    IN P_USUARIO NVARCHAR(50),
    IN P_PLANTA INT,
    IN P_ID_PARO NCLOB,   -- CAMBIO: JSON array de strings, ej. ["12","15"]
    IN P_COMENTARIOS NVARCHAR(500),
    IN P_TIEMPO_MUERTO_HERRAMENTALES DECIMAL(10,2),
    IN P_MODO NVARCHAR(10) DEFAULT NULL,
    IN P_FECHA_INICIO_RANGO DATE DEFAULT NULL,
    IN P_FECHA_FIN_RANGO DATE DEFAULT NULL,
    IN P_TOKEN NVARCHAR(50) DEFAULT NULL
)

LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER

AS
BEGIN

        DECLARE V_FECHA LONGDATE;
    DECLARE V_ID_REGISTRO INT;
    DECLARE V_ID_EXISTENTE INT;
    DECLARE V_ORIGEN NVARCHAR(20);
    DECLARE V_CLAVE_SYNC NVARCHAR(300);
    DECLARE V_TOKEN_ACTUAL NVARCHAR(50);
    DECLARE V_CONFLICTO BOOLEAN := FALSE;
    DECLARE V_OTMC_DEDUP NCLOB;
    DECLARE V_OTMP_DEDUP NCLOB;
    DECLARE V_ID_PARO_DEDUP NCLOB;

    SELECT ADD_SECONDS(CURRENT_UTCTIMESTAMP, -6 * 3600)
    INTO V_FECHA
    FROM DUMMY;
    -- ============================
    -- ORIGEN / CLAVE DE SINCRONIZACION
    -- ============================
    V_ID_REGISTRO := :P_ID_REGISTRO;

    IF :P_ID_PRODUCTO_TERMINADO IS NOT NULL THEN
        V_ORIGEN := 'NWSCALE';
        IF UPPER(COALESCE(:P_MODO,'')) = 'RANGO'
           AND :P_FECHA_INICIO_RANGO IS NOT NULL
           AND :P_FECHA_FIN_RANGO IS NOT NULL THEN
            V_CLAVE_SYNC := 'N|' || COALESCE(TO_NVARCHAR(:P_PLANTA),'') || '|RANGO|' || TO_VARCHAR(:P_FECHA_INICIO_RANGO,'YYYYMMDD') || '|' || TO_VARCHAR(:P_FECHA_FIN_RANGO,'YYYYMMDD') || '|' || COALESCE(:P_LINEA,'') || '|' || COALESCE(:P_PRODUCTO,'');
        ELSE
            V_CLAVE_SYNC := 'N|' || COALESCE(TO_NVARCHAR(:P_PLANTA),'') || '|DIA|' || COALESCE(TO_VARCHAR(:P_FECHA,'YYYYMMDD'),'') || '|' || COALESCE(:P_LINEA,'') || '|' || COALESCE(:P_PRODUCTO,'') || '|' || COALESCE(:P_TURNO,'');
        END IF;
    ELSEIF LENGTH(COALESCE(:P_OTMC,'')) > 2
        OR LENGTH(COALESCE(:P_OTMP,'')) > 2
        OR LENGTH(COALESCE(:P_ID_PARO,'')) > 0 THEN
        V_ORIGEN := 'MANUAL';
        V_CLAVE_SYNC := 'M|' || COALESCE(TO_NVARCHAR(:P_PLANTA),'') || '|' || COALESCE(TO_VARCHAR(:P_FECHA,'YYYYMMDD'),'') || '|' || COALESCE(:P_LINEA,'');
    ELSEIF :P_PRODUCTO IS NOT NULL OR :P_TURNO IS NOT NULL THEN
        V_ORIGEN := 'LEGACY';
        V_CLAVE_SYNC := 'N|' || COALESCE(TO_NVARCHAR(:P_PLANTA),'') || '|DIA|' || COALESCE(TO_VARCHAR(:P_FECHA,'YYYYMMDD'),'') || '|' || COALESCE(:P_LINEA,'') || '|' || COALESCE(:P_PRODUCTO,'') || '|' || COALESCE(:P_TURNO,'');
    ELSE
        V_ORIGEN := 'SIN_ORIGEN';
        V_CLAVE_SYNC := 'X|' || TO_VARCHAR(CURRENT_UTCTIMESTAMP,'YYYYMMDDHH24MISSFF6');
    END IF;

    -- Si no viene ID, buscar la fila por CLAVE_SYNC (upsert idempotente)
    IF :V_ID_REGISTRO IS NULL THEN
        SELECT MAX("ID_REGISTRO")
        INTO V_ID_EXISTENTE
        FROM "PdxMTTOTiemposMuertosProduccionCorrugado"
        WHERE "CLAVE_SYNC" = :V_CLAVE_SYNC;

        V_ID_REGISTRO := V_ID_EXISTENTE;
    END IF;

    -- ============================
    -- DEDUPE DE LISTAS
    -- ============================
    IF :P_OTMC IS NOT NULL AND LENGTH(:P_OTMC) > 2 THEN
        SELECT '[' || STRING_AGG('"' || V || '"', ',') || ']'
        INTO V_OTMC_DEDUP
        FROM (
            SELECT DISTINCT "value" AS V
            FROM JSON_TABLE(:P_OTMC, '$[*]' COLUMNS("value" NVARCHAR(100) PATH '$'))
        );
    ELSE
        V_OTMC_DEDUP := :P_OTMC;
    END IF;

    IF :P_OTMP IS NOT NULL AND LENGTH(:P_OTMP) > 2 THEN
        SELECT '[' || STRING_AGG('"' || V || '"', ',') || ']'
        INTO V_OTMP_DEDUP
        FROM (
            SELECT DISTINCT "value" AS V
            FROM JSON_TABLE(:P_OTMP, '$[*]' COLUMNS("value" NVARCHAR(100) PATH '$'))
        );
    ELSE
        V_OTMP_DEDUP := :P_OTMP;
    END IF;

    IF :P_ID_PARO IS NOT NULL AND LENGTH(:P_ID_PARO) > 0 THEN
        SELECT STRING_AGG(V, '|')
        INTO V_ID_PARO_DEDUP
        FROM (
            SELECT DISTINCT TRIM(SUBSTRING_REGEXPR('[^|]+' IN TO_NVARCHAR(:P_ID_PARO) OCCURRENCE N.ELEMENT_NUMBER)) AS V
            FROM SERIES_GENERATE_INTEGER(1, 1, 1000) AS N
            WHERE N.ELEMENT_NUMBER <= OCCURRENCES_REGEXPR('[^|]+' IN TO_NVARCHAR(:P_ID_PARO))
        );
    ELSE
        V_ID_PARO_DEDUP := :P_ID_PARO;
    END IF;

    -- ============================
    -- TOKEN DE VERSION
    -- ============================
    IF :V_ID_REGISTRO IS NOT NULL AND :P_TOKEN IS NOT NULL THEN
        SELECT MAX(TO_VARCHAR("FECHA_ACTUALIZACION",'YYYYMMDDHH24MISSFF6'))
        INTO V_TOKEN_ACTUAL
        FROM "PdxMTTOTiemposMuertosProduccionCorrugado"
        WHERE "ID_REGISTRO" = :V_ID_REGISTRO;

        IF V_TOKEN_ACTUAL IS NOT NULL AND V_TOKEN_ACTUAL <> :P_TOKEN THEN
            V_CONFLICTO := TRUE;
        END IF;
    END IF;


    -- ========================================
    -- UPDATE
    -- ========================================

    IF :V_CONFLICTO = TRUE THEN

        SELECT 'CONFLICTO' AS "Estatus",
               'La fila fue modificada por otro usuario. Recarga antes de guardar.' AS "Mensaje"
        FROM DUMMY;

    ELSE

    IF :V_ID_REGISTRO IS NOT NULL THEN

        UPDATE "PdxMTTOTiemposMuertosProduccionCorrugado"
        SET
            "OTMC"                             = :V_OTMC_DEDUP,
            "OTMP"                             = :V_OTMP_DEDUP,
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
            "ID_PARO"                          = :V_ID_PARO_DEDUP,
            "COMENTARIOS" = :P_COMENTARIOS,
            "MODO" = :P_MODO,
            "FECHA_INICIO_RANGO" = :P_FECHA_INICIO_RANGO,
            "FECHA_FIN_RANGO" = :P_FECHA_FIN_RANGO,
            "ORIGEN" = :V_ORIGEN,
            "CLAVE_SYNC" = :V_CLAVE_SYNC,
            "FECHA_ACTUALIZACION"              = :V_FECHA

        WHERE "ID_REGISTRO" = :V_ID_REGISTRO;

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
            "MODO",
            "FECHA_INICIO_RANGO",
            "FECHA_FIN_RANGO",
            "ORIGEN",
            "CLAVE_SYNC",
            "FECHA_CREACION",
            "FECHA_ACTUALIZACION"
        )
        VALUES (
            :V_OTMC_DEDUP,
            :V_OTMP_DEDUP,
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
            :V_ID_PARO_DEDUP,
            :P_COMENTARIOS,
            :P_MODO,
            :P_FECHA_INICIO_RANGO,
            :P_FECHA_FIN_RANGO,
            :V_ORIGEN,
            :V_CLAVE_SYNC,
            :V_FECHA,
            :V_FECHA
        );

    END IF;

        SELECT 'OK' AS "Estatus", 'Guardado' AS "Mensaje" FROM DUMMY;

    END IF;

END
;


-- ============================================================================
-- SpPdxMTTOGuardarTiemposMuertosPeadLiso
-- ============================================================================


-- ============================================================================
-- SpPdxMTTOGuardarTiemposMuertosPeadLiso
-- ============================================================================
ALTER PROCEDURE "PTM_2022_FINAL"."SpPdxMTTOGuardarTiemposMuertosPeadLiso"(

    IN P_ID_REGISTRO INT,
    IN P_OTMC NCLOB,      -- CAMBIO: JSON array, ej. ["OT001","OT002"]
	IN P_OTMP NCLOB,      -- CAMBIO: JSON array, ej. ["OP001","OP002"]
    IN P_ID_PRODUCTO_TERMINADO INTEGER,
    -- GENERALES
    IN P_MES NVARCHAR(20),
    IN P_FECHA DATE,
    IN P_LINEA NVARCHAR(20),
    IN P_PRODUCTO NVARCHAR(100),
    IN P_TURNO NVARCHAR(10),
    IN P_GRUPO NVARCHAR(10),

    -- PRODUCCION
    IN P_PESO_MINIMO DECIMAL(18,6),
    IN P_TRLIBERADOS DECIMAL(18,2),
    IN P_PRODUCCION_NETA DECIMAL(18,2),
    IN P_PESO_ESTANDAR DECIMAL(18,6),
    IN P_PORCENTAJE_SOBREPESO DECIMAL(18,6),
    IN P_TOTAL_SCRAP DECIMAL(18,2),
    IN P_PORCENTAJE_TOTAL_SCRAP DECIMAL(18,6),

    -- DISPONIBILIDAD
    IN P_HORAS_PROGRAMADAS DECIMAL(10,2),

    -- TIEMPO NO DISPONIBLE
    IN P_PREVENTIVO DECIMAL(10,2),
    IN P_CONTROL_INVENTARIOS DECIMAL(10,2),
    IN P_FALTA_ENERGIA_ELECTRICA DECIMAL(10,2),
    IN P_FALTA_MATERIA_PRIMA_INSUMOS DECIMAL(10,2),
    IN P_TIEMPO_CALENTAMIENTO_CI DECIMAL(10,2),
    IN P_PREPARACION_LINEA_CAMBIO_HERRAMENTAL DECIMAL(10,2),
    IN P_TIEMPO_CALENTAMIENTO_HERRAMENTAL DECIMAL(10,2),
    IN P_ARRANQUE_ESTABILIZACION_LINEA DECIMAL(10,2),

    -- TIEMPO NO PRODUCTIVO
    IN P_TIEMPO_MUERTO_CORRECTIVOS DECIMAL(10,2),
    IN P_TIEMPO_MUERTO_HERRAMENTALES DECIMAL(10,2),
    IN P_CAMBIO_MOLDE_SETUP_EXCESOS DECIMAL(10,2),
    IN P_FALTA_PERSONAL DECIMAL(10,2),
    IN P_TIEMPO_MUERTO_PROCESO DECIMAL(10,2),

    -- KPI
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
    -- AUDITORIA
    IN P_USUARIO NVARCHAR(50),
    IN P_PLANTA NVARCHAR(20),
    IN P_ID_PARO NCLOB,   -- CAMBIO: JSON array de strings, ej. ["12","15"]
    IN P_COMENTARIOS NVARCHAR(500)
,
    IN P_MODO NVARCHAR(10) DEFAULT NULL,
    IN P_FECHA_INICIO_RANGO DATE DEFAULT NULL,
    IN P_FECHA_FIN_RANGO DATE DEFAULT NULL,
    IN P_TOKEN NVARCHAR(50) DEFAULT NULL
)

LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER

AS
BEGIN

        DECLARE V_FECHA LONGDATE;
    DECLARE V_ID_REGISTRO INT;
    DECLARE V_ID_EXISTENTE INT;
    DECLARE V_ORIGEN NVARCHAR(20);
    DECLARE V_CLAVE_SYNC NVARCHAR(300);
    DECLARE V_TOKEN_ACTUAL NVARCHAR(50);
    DECLARE V_CONFLICTO BOOLEAN := FALSE;
    DECLARE V_OTMC_DEDUP NCLOB;
    DECLARE V_OTMP_DEDUP NCLOB;
    DECLARE V_ID_PARO_DEDUP NCLOB;

    SELECT ADD_SECONDS(CURRENT_UTCTIMESTAMP, -6 * 3600)
    INTO V_FECHA
    FROM DUMMY;
    -- ============================
    -- ORIGEN / CLAVE DE SINCRONIZACION
    -- ============================
    V_ID_REGISTRO := :P_ID_REGISTRO;

    IF :P_ID_PRODUCTO_TERMINADO IS NOT NULL THEN
        V_ORIGEN := 'NWSCALE';
        IF UPPER(COALESCE(:P_MODO,'')) = 'RANGO'
           AND :P_FECHA_INICIO_RANGO IS NOT NULL
           AND :P_FECHA_FIN_RANGO IS NOT NULL THEN
            V_CLAVE_SYNC := 'N|' || COALESCE(TO_NVARCHAR(:P_PLANTA),'') || '|RANGO|' || TO_VARCHAR(:P_FECHA_INICIO_RANGO,'YYYYMMDD') || '|' || TO_VARCHAR(:P_FECHA_FIN_RANGO,'YYYYMMDD') || '|' || COALESCE(:P_LINEA,'') || '|' || COALESCE(:P_PRODUCTO,'');
        ELSE
            V_CLAVE_SYNC := 'N|' || COALESCE(TO_NVARCHAR(:P_PLANTA),'') || '|DIA|' || COALESCE(TO_VARCHAR(:P_FECHA,'YYYYMMDD'),'') || '|' || COALESCE(:P_LINEA,'') || '|' || COALESCE(:P_PRODUCTO,'') || '|' || COALESCE(:P_TURNO,'');
        END IF;
    ELSEIF LENGTH(COALESCE(:P_OTMC,'')) > 2
        OR LENGTH(COALESCE(:P_OTMP,'')) > 2
        OR LENGTH(COALESCE(:P_ID_PARO,'')) > 0 THEN
        V_ORIGEN := 'MANUAL';
        V_CLAVE_SYNC := 'M|' || COALESCE(TO_NVARCHAR(:P_PLANTA),'') || '|' || COALESCE(TO_VARCHAR(:P_FECHA,'YYYYMMDD'),'') || '|' || COALESCE(:P_LINEA,'');
    ELSEIF :P_PRODUCTO IS NOT NULL OR :P_TURNO IS NOT NULL THEN
        V_ORIGEN := 'LEGACY';
        V_CLAVE_SYNC := 'N|' || COALESCE(TO_NVARCHAR(:P_PLANTA),'') || '|DIA|' || COALESCE(TO_VARCHAR(:P_FECHA,'YYYYMMDD'),'') || '|' || COALESCE(:P_LINEA,'') || '|' || COALESCE(:P_PRODUCTO,'') || '|' || COALESCE(:P_TURNO,'');
    ELSE
        V_ORIGEN := 'SIN_ORIGEN';
        V_CLAVE_SYNC := 'X|' || TO_VARCHAR(CURRENT_UTCTIMESTAMP,'YYYYMMDDHH24MISSFF6');
    END IF;

    -- Si no viene ID, buscar la fila por CLAVE_SYNC (upsert idempotente)
    IF :V_ID_REGISTRO IS NULL THEN
        SELECT MAX("ID_REGISTRO")
        INTO V_ID_EXISTENTE
        FROM "PdxMTTOTiemposMuertosProduccionPeadLiso"
        WHERE "CLAVE_SYNC" = :V_CLAVE_SYNC;

        V_ID_REGISTRO := V_ID_EXISTENTE;
    END IF;

    -- ============================
    -- DEDUPE DE LISTAS
    -- ============================
    IF :P_OTMC IS NOT NULL AND LENGTH(:P_OTMC) > 2 THEN
        SELECT '[' || STRING_AGG('"' || V || '"', ',') || ']'
        INTO V_OTMC_DEDUP
        FROM (
            SELECT DISTINCT "value" AS V
            FROM JSON_TABLE(:P_OTMC, '$[*]' COLUMNS("value" NVARCHAR(100) PATH '$'))
        );
    ELSE
        V_OTMC_DEDUP := :P_OTMC;
    END IF;

    IF :P_OTMP IS NOT NULL AND LENGTH(:P_OTMP) > 2 THEN
        SELECT '[' || STRING_AGG('"' || V || '"', ',') || ']'
        INTO V_OTMP_DEDUP
        FROM (
            SELECT DISTINCT "value" AS V
            FROM JSON_TABLE(:P_OTMP, '$[*]' COLUMNS("value" NVARCHAR(100) PATH '$'))
        );
    ELSE
        V_OTMP_DEDUP := :P_OTMP;
    END IF;

    IF :P_ID_PARO IS NOT NULL AND LENGTH(:P_ID_PARO) > 0 THEN
        SELECT STRING_AGG(V, '|')
        INTO V_ID_PARO_DEDUP
        FROM (
            SELECT DISTINCT TRIM(SUBSTRING_REGEXPR('[^|]+' IN TO_NVARCHAR(:P_ID_PARO) OCCURRENCE N.ELEMENT_NUMBER)) AS V
            FROM SERIES_GENERATE_INTEGER(1, 1, 1000) AS N
            WHERE N.ELEMENT_NUMBER <= OCCURRENCES_REGEXPR('[^|]+' IN TO_NVARCHAR(:P_ID_PARO))
        );
    ELSE
        V_ID_PARO_DEDUP := :P_ID_PARO;
    END IF;

    -- ============================
    -- TOKEN DE VERSION
    -- ============================
    IF :V_ID_REGISTRO IS NOT NULL AND :P_TOKEN IS NOT NULL THEN
        SELECT MAX(TO_VARCHAR("FECHA_ACTUALIZACION",'YYYYMMDDHH24MISSFF6'))
        INTO V_TOKEN_ACTUAL
        FROM "PdxMTTOTiemposMuertosProduccionPeadLiso"
        WHERE "ID_REGISTRO" = :V_ID_REGISTRO;

        IF V_TOKEN_ACTUAL IS NOT NULL AND V_TOKEN_ACTUAL <> :P_TOKEN THEN
            V_CONFLICTO := TRUE;
        END IF;
    END IF;


    -- ==========================================
    -- UPDATE
    -- ==========================================

    IF :V_CONFLICTO = TRUE THEN

        SELECT 'CONFLICTO' AS "Estatus",
               'La fila fue modificada por otro usuario. Recarga antes de guardar.' AS "Mensaje"
        FROM DUMMY;

    ELSE

    IF :V_ID_REGISTRO IS NOT NULL THEN

        UPDATE "PdxMTTOTiemposMuertosProduccionPeadLiso"
        SET
            "OTMC"                                 = :V_OTMC_DEDUP,
            "OTMP"                                 = :V_OTMP_DEDUP,
            "ID_PRODUCTO_TERMINADO"                = :P_ID_PRODUCTO_TERMINADO,
            "MES"                                  = :P_MES,
            "FECHA"                                = :P_FECHA,
            "LINEA"                                = :P_LINEA,
            "PRODUCTO"                             = :P_PRODUCTO,
            "TURNO"                                = :P_TURNO,
            "GRUPO"                                = :P_GRUPO,

            "PESO_MINIMO"                          = :P_PESO_MINIMO,
            "TRLIBERADOS"                          = :P_TRLIBERADOS,
            "PRODUCCION_NETA"                      = :P_PRODUCCION_NETA,
            "PESO_ESTANDAR"                        = :P_PESO_ESTANDAR,
            "PORCENTAJE_SOBREPESO"                 = :P_PORCENTAJE_SOBREPESO,
            "TOTAL_SCRAP"                          = :P_TOTAL_SCRAP,
            "PORCENTAJE_TOTAL_SCRAP"               = :P_PORCENTAJE_TOTAL_SCRAP,

            "HORAS_PROGRAMADAS"                    = :P_HORAS_PROGRAMADAS,

            "PREVENTIVO"                           = :P_PREVENTIVO,
            "CONTROL_INVENTARIOS"                  = :P_CONTROL_INVENTARIOS,
            "FALTA_ENERGIA_ELECTRICA"              = :P_FALTA_ENERGIA_ELECTRICA,
            "FALTA_MATERIA_PRIMA_INSUMOS"          = :P_FALTA_MATERIA_PRIMA_INSUMOS,
            "TIEMPO_CALENTAMIENTO_CI"              = :P_TIEMPO_CALENTAMIENTO_CI,
            "PREPARACION_LINEA_CAMBIO_HERRAMENTAL" = :P_PREPARACION_LINEA_CAMBIO_HERRAMENTAL,
            "TIEMPO_CALENTAMIENTO_HERRAMENTAL"     = :P_TIEMPO_CALENTAMIENTO_HERRAMENTAL,
            "ARRANQUE_ESTABILIZACION_LINEA"        = :P_ARRANQUE_ESTABILIZACION_LINEA,

            "TIEMPO_MUERTO_CORRECTIVOS"            = :P_TIEMPO_MUERTO_CORRECTIVOS,
            "TIEMPO_MUERTO_HERRAMENTALES"          = :P_TIEMPO_MUERTO_HERRAMENTALES,
            "CAMBIO_MOLDE_SETUP_EXCESOS"           = :P_CAMBIO_MOLDE_SETUP_EXCESOS,
            "FALTA_PERSONAL"                       = :P_FALTA_PERSONAL,
            "TIEMPO_MUERTO_PROCESO"                = :P_TIEMPO_MUERTO_PROCESO,

            "TIEMPO_DISPONIBLE"                    = :P_TIEMPO_DISPONIBLE,
            "TIEMPO_PRODUCTIVO"                    = :P_TIEMPO_PRODUCTIVO,
            -- NUEVO
            "KG_HR_LINEA"                          = :P_KG_HR_LINEA,
            "KG_HR_PRODUCTO"                       = :P_KG_HR_PRODUCTO,
            "OBJETIVO_EFICIENCIA"                  = :P_OBJETIVO_EFICIENCIA,
            "DISPONIBILIDAD_PORCENTAJE"            = :P_DISPONIBILIDAD_PORCENTAJE,
            "KG_POR_TIEMPO_DISPONIBLE"             = :P_KG_POR_TIEMPO_DISPONIBLE,
            "KG_NETOS_HR_REALES"                   = :P_KG_NETOS_HR_REALES,
            "PORCENTAJE_RENDIMIENTO"               = :P_PORCENTAJE_RENDIMIENTO,
            "PORCENTAJE_CALIDAD"                   = :P_PORCENTAJE_CALIDAD,
            "PORCENTAJE_OEE"                       = :P_PORCENTAJE_OEE,
            "PORCENTAJE_EFICIENCIA_PRODUCTO"       = :P_PORCENTAJE_EFICIENCIA_PRODUCTO,
            "EFICIENCIA_OPERATIVA"                 = :P_EFICIENCIA_OPERATIVA,
            "USUARIO"                              = :P_USUARIO,
            "PLANTA"                               = :P_PLANTA,
            "ID_PARO"                              = :V_ID_PARO_DEDUP,
            "COMENTARIOS" = :P_COMENTARIOS,
            "MODO" = :P_MODO,
            "FECHA_INICIO_RANGO" = :P_FECHA_INICIO_RANGO,
            "FECHA_FIN_RANGO" = :P_FECHA_FIN_RANGO,
            "ORIGEN" = :V_ORIGEN,
            "CLAVE_SYNC" = :V_CLAVE_SYNC,
            "FECHA_ACTUALIZACION"                  = :V_FECHA

        WHERE "ID_REGISTRO" = :V_ID_REGISTRO;

    ELSE

        -- ==========================================
        -- INSERT
        -- ==========================================

        INSERT INTO "PdxMTTOTiemposMuertosProduccionPeadLiso" (

            "OTMC",
            "OTMP",
            "ID_PRODUCTO_TERMINADO",
            "MES",
            "FECHA",
            "LINEA",
            "PRODUCTO",
            "TURNO",
            "GRUPO",

            "PESO_MINIMO",
            "TRLIBERADOS",
            "PRODUCCION_NETA",
            "PESO_ESTANDAR",
            "PORCENTAJE_SOBREPESO",
            "TOTAL_SCRAP",
            "PORCENTAJE_TOTAL_SCRAP",

            "HORAS_PROGRAMADAS",

            "PREVENTIVO",
            "CONTROL_INVENTARIOS",
            "FALTA_ENERGIA_ELECTRICA",
            "FALTA_MATERIA_PRIMA_INSUMOS",
            "TIEMPO_CALENTAMIENTO_CI",
            "PREPARACION_LINEA_CAMBIO_HERRAMENTAL",
            "TIEMPO_CALENTAMIENTO_HERRAMENTAL",
            "ARRANQUE_ESTABILIZACION_LINEA",

            "TIEMPO_MUERTO_CORRECTIVOS",
            "TIEMPO_MUERTO_HERRAMENTALES",
            "CAMBIO_MOLDE_SETUP_EXCESOS",
            "FALTA_PERSONAL",
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
            "MODO",
            "FECHA_INICIO_RANGO",
            "FECHA_FIN_RANGO",
            "ORIGEN",
            "CLAVE_SYNC",
            "FECHA_CREACION",
            "FECHA_ACTUALIZACION"
        )
        VALUES (

            :V_OTMC_DEDUP,
            :V_OTMP_DEDUP,
            :P_ID_PRODUCTO_TERMINADO,
            :P_MES,
            :P_FECHA,
            :P_LINEA,
            :P_PRODUCTO,
            :P_TURNO,
            :P_GRUPO,

            :P_PESO_MINIMO,
            :P_TRLIBERADOS,
            :P_PRODUCCION_NETA,
            :P_PESO_ESTANDAR,
            :P_PORCENTAJE_SOBREPESO,
            :P_TOTAL_SCRAP,
            :P_PORCENTAJE_TOTAL_SCRAP,

            :P_HORAS_PROGRAMADAS,

            :P_PREVENTIVO,
            :P_CONTROL_INVENTARIOS,
            :P_FALTA_ENERGIA_ELECTRICA,
            :P_FALTA_MATERIA_PRIMA_INSUMOS,
            :P_TIEMPO_CALENTAMIENTO_CI,
            :P_PREPARACION_LINEA_CAMBIO_HERRAMENTAL,
            :P_TIEMPO_CALENTAMIENTO_HERRAMENTAL,
            :P_ARRANQUE_ESTABILIZACION_LINEA,

            :P_TIEMPO_MUERTO_CORRECTIVOS,
            :P_TIEMPO_MUERTO_HERRAMENTALES,
            :P_CAMBIO_MOLDE_SETUP_EXCESOS,
            :P_FALTA_PERSONAL,
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
            :V_ID_PARO_DEDUP,
            :P_COMENTARIOS,
            :P_MODO,
            :P_FECHA_INICIO_RANGO,
            :P_FECHA_FIN_RANGO,
            :V_ORIGEN,
            :V_CLAVE_SYNC,
            :V_FECHA,
            :V_FECHA
        );

    END IF;

        SELECT 'OK' AS "Estatus", 'Guardado' AS "Mensaje" FROM DUMMY;

    END IF;

END
