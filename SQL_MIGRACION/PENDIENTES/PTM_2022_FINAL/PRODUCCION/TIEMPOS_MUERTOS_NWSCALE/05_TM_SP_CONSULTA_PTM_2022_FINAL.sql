-- ============================================================================
-- 05 - SPs de CONSULTA de Tiempos Muertos (agregan CLAVE_SYNC, ORIGEN, MODO, rango y TOKEN)
-- Schema: PTM_2022_FINAL (HANA on-premise)
-- Fecha: 2026-11-17
--
-- IMPORTANTE:
--   Los 8 SPs YA EXISTEN en PTM_2022_FINAL, por eso se usa ALTER PROCEDURE.
--   Si alguno NO existiera, cambiar ALTER por CREATE en ese bloque.
--   Se pueden ejecutar por separado; el orden no importa.
-- ============================================================================

SET SCHEMA "PTM_2022_FINAL";


-- ============================================================================
-- SpPdxMTTOConsultarTiemposMuertosPVC
-- ============================================================================
ALTER PROCEDURE "PTM_2022_FINAL"."SpPdxMTTOConsultarTiemposMuertosPVC"(
    IN p_FECHA_INICIO DATE,
    IN p_FECHA_FIN DATE,
    IN p_LINEA NVARCHAR(20),
    IN p_PLANTA NVARCHAR(20),
    IN p_TURNO NVARCHAR(5),       -- ï¿½ï¿½ NUEVO
    IN p_PRODUCTO NVARCHAR(50)    -- ï¿½ï¿½ NUEVO
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN
SELECT
    "ID_REGISTRO",
    "CLAVE_SYNC",
    "ORIGEN",
    "MODO",
    "FECHA_INICIO_RANGO",
    "FECHA_FIN_RANGO",
    "MES",
    "FECHA",
    "LINEA",
    "PRODUCTO",
    "TURNO",
    "TRIP",
    "OTMP",
    "OTMC",
    "ID_PRODUCTO_TERMINADO",
    "ID_PARO",
    "COMENTARIOS",
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
    "FECHA_CREACION",
    "FECHA_ACTUALIZACION",
    TO_VARCHAR("FECHA_ACTUALIZACION",'YYYYMMDDHH24MISSFF6') AS "TOKEN"
FROM "PdxMTTOTiemposMuertosProduccionPVC"
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
        OR :p_PLANTA = ''
        OR "PLANTA" = :p_PLANTA
    )
    -- ï¿½ï¿½ NUEVO: Filtro Turno
    AND (
        :p_TURNO IS NULL
        OR :p_TURNO = ''
        OR "TURNO" = :p_TURNO
    )
    -- ï¿½ï¿½ NUEVO: Filtro Producto con LIKE
    AND (
        :p_PRODUCTO IS NULL
        OR :p_PRODUCTO = ''
        OR "PRODUCTO" LIKE '%' || :p_PRODUCTO || '%'
    )
    AND IFNULL("ESTATUS", 'A') = 'A'
ORDER BY
    TO_INT(SUBSTRING_REGEXPR('\d+' IN "LINEA")),
    "FECHA",
    "TURNO",
    "TRIP";
END


-- ============================================================================
-- SpPdxMTTOConsultarTiemposMuertosINY
-- ============================================================================
ALTER PROCEDURE "PTM_2022_FINAL"."SpPdxMTTOConsultarTiemposMuertosINY"(
    IN p_FECHA_INICIO DATE,
    IN p_FECHA_FIN DATE,
    IN p_LINEA NVARCHAR(20),
    IN p_PLANTA NVARCHAR(20),
    IN p_TURNO NVARCHAR(5),       -- ï¿½ï¿½ NUEVO
    IN p_PRODUCTO NVARCHAR(50)    -- ï¿½ï¿½ NUEVO
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN

    SELECT

        -- ========================================
        -- GENERALES
        -- ========================================
        "ID_REGISTRO",
    "CLAVE_SYNC",
    "ORIGEN",
    "MODO",
    "FECHA_INICIO_RANGO",
    "FECHA_FIN_RANGO",
        "MES",
        "FECHA",
        "LINEA",
        "INYECTORA",
        "PRODUCTO",
        "DESCRIPCION",
        "OP",
        "TURNO",
        "GRUPO",

        -- ========================================
        -- RELACIONES / ORIGEN
        -- ========================================
        "OTMC",
        "OTMP",
        "ID_PRODUCTO_TERMINADO",
        "ID_PARO",
        "COMENTARIOS",
        -- ========================================
        -- PRODUCCIÃ“N
        -- ========================================
        "PESO_MINIMO",
        "TR_LIBERADOS",
        "PRODUCCION_NETA",
        "SCRAP_SIN_COLADA",
        "SCRAP_COLADA",
        "TOTAL_SCRAP",

        -- ========================================
        -- DISPONIBILIDAD
        -- ========================================
        "HORAS_PROGRAMADAS",

        -- ========================================
        -- TIEMPO NO DISPONIBLE
        -- ========================================
        "PREVENTIVO",
        "CONTROL_INVENTARIOS",
        "FALTA_MATERIA_PRIMA",
        "PREPARACION_LINEA",

        -- ========================================
        -- TIEMPO NO PRODUCTIVO
        -- ========================================
        "TIEMPO_MUERTO_CORRECTIVOS",
        "TIEMPO_MUERTO_HERRAMENTALES",
        "TIEMPO_MUERTO_ARRANQUES",
        "FALLA_MATERIAL",
        "FALTA_PERSONAL",
        "FALLA_ELECTRICA",
        "TIEMPO_MUERTO_PROCESO",

        -- ========================================
        -- KPIs
        -- ========================================
        "TIEMPO_DISPONIBLE",
        "TIEMPO_PRODUCTIVO",
        "PORCENTAJE_DISPONIBILIDAD",

        -- ========================================
        -- RENDIMIENTO Y OEE
        -- ========================================
        "KG_HR_LINEA",
        "KG_HR_PRODUCTO",
        "OBJETIVO_EFICIENCIA",
        "KG_POR_TIEMPO_DISPONIBLE",
        "KG_NETOS_HR_REALES",
        "PORCENTAJE_RENDIMIENTO",
        "PORCENTAJE_CALIDAD",
        "PORCENTAJE_OEE",
        "PORCENTAJE_EFICIENCIA_PRODUCTO",
        "EFICIENCIA_OPERATIVA",

        -- ========================================
        -- AUDITORÃA
        -- ========================================
        "USUARIO",
        "PLANTA",
        "FECHA_CREACION",
        "FECHA_ACTUALIZACION",
    TO_VARCHAR("FECHA_ACTUALIZACION",'YYYYMMDDHH24MISSFF6') AS "TOKEN"

    FROM "PdxMTTOTiemposMuertosProduccionINY"

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
            OR :p_PLANTA = ''
            OR "PLANTA" = :p_PLANTA
        )

        -- ï¿½ï¿½ NUEVO: Filtro Turno
        AND (
            :p_TURNO IS NULL
            OR :p_TURNO = ''
            OR "TURNO" = :p_TURNO
        )

        -- ï¿½ï¿½ NUEVO: Filtro Producto con LIKE
        AND (
            :p_PRODUCTO IS NULL
            OR :p_PRODUCTO = ''
            OR "PRODUCTO" LIKE '%' || :p_PRODUCTO || '%'
        )

        AND IFNULL("ESTATUS", 'A') = 'A'

    ORDER BY
    	TO_INT(SUBSTRING_REGEXPR('\d+' IN "LINEA")),
        "FECHA",
        "LINEA",
        "TURNO";

END


-- ============================================================================
-- SpPdxMTTOConsultarTiemposMuertosCorrugado
-- ============================================================================
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
    "CLAVE_SYNC",
    "ORIGEN",
    "MODO",
    "FECHA_INICIO_RANGO",
    "FECHA_FIN_RANGO",
    -- DATOS GENERALES
    "MES",
    "FECHA",
    "LINEA",
    "CORRUGADOR",
    "PRODUCTO",
    "TURNO",
    "GRUPO",
    "COMENTARIOS",
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
    "FECHA_ACTUALIZACION",
    TO_VARCHAR("FECHA_ACTUALIZACION",'YYYYMMDDHH24MISSFF6') AS "TOKEN"
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
    TO_INT(SUBSTRING_REGEXPR('[0-9]+' IN "LINEA")),
    "FECHA",
    "TURNO",
    "GRUPO";
END;


-- ============================================================================
-- SpPdxMTTOConsultarTiemposMuertosPeadLiso
-- ============================================================================
ALTER PROCEDURE "PTM_2022_FINAL"."SpPdxMTTOConsultarTiemposMuertosPeadLiso"(
    IN p_FECHA_INICIO DATE,
    IN p_FECHA_FIN DATE,
    IN p_LINEA NVARCHAR(20),
    IN p_PLANTA NVARCHAR(20),
    IN p_TURNO NVARCHAR(5),       -- ï¿½ï¿½ NUEVO
    IN p_PRODUCTO NVARCHAR(50)    -- ï¿½ï¿½ NUEVO
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN
SELECT
    -- ========================================
    -- GENERALES
    -- ========================================
    "ID_REGISTRO",
    "CLAVE_SYNC",
    "ORIGEN",
    "MODO",
    "FECHA_INICIO_RANGO",
    "FECHA_FIN_RANGO",
    "MES",
    "FECHA",
    "LINEA",
    "PRODUCTO",
    "TURNO",
    "GRUPO",
    "OTMC",
    "OTMP",
    "ID_PRODUCTO_TERMINADO",
    "ID_PARO",
    "COMENTARIOS",
    -- PRODUCCIÃ“N
    -- ========================================
    "PESO_MINIMO",
    "TRLIBERADOS",
    "PRODUCCION_NETA",
    "PESO_ESTANDAR",
    "PORCENTAJE_SOBREPESO",
    "TOTAL_SCRAP",
    "PORCENTAJE_TOTAL_SCRAP",
    -- ========================================
    -- DISPONIBILIDAD
    -- ========================================
    "HORAS_PROGRAMADAS",
    -- ========================================
    -- TIEMPO NO DISPONIBLE
    -- ========================================
    "PREVENTIVO",
    "CONTROL_INVENTARIOS",
    "FALTA_ENERGIA_ELECTRICA",
    "FALTA_MATERIA_PRIMA_INSUMOS",
    "TIEMPO_CALENTAMIENTO_CI",
    "PREPARACION_LINEA_CAMBIO_HERRAMENTAL",
    "TIEMPO_CALENTAMIENTO_HERRAMENTAL",
    "ARRANQUE_ESTABILIZACION_LINEA",
    -- ========================================
    -- TIEMPO NO PRODUCTIVO
    -- ========================================
    "TIEMPO_MUERTO_CORRECTIVOS",
    "TIEMPO_MUERTO_HERRAMENTALES",
    "CAMBIO_MOLDE_SETUP_EXCESOS",
    "FALTA_PERSONAL",
    "TIEMPO_MUERTO_PROCESO",
    -- ========================================
    -- KPI
    -- ========================================
    "TIEMPO_DISPONIBLE",
    "TIEMPO_PRODUCTIVO",
    -- ï¿½ï¿½ NUEVO
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
    -- ========================================
    -- AUDITORÃA
    -- ========================================
    "USUARIO",
    "PLANTA",
    "FECHA_CREACION",
    "FECHA_ACTUALIZACION",
    TO_VARCHAR("FECHA_ACTUALIZACION",'YYYYMMDDHH24MISSFF6') AS "TOKEN"
FROM "PdxMTTOTiemposMuertosProduccionPeadLiso"
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
        OR :p_PLANTA = ''
        OR "PLANTA" = :p_PLANTA
    )
     -- ï¿½ï¿½ NUEVO: Filtro Turno
    AND (
        :p_TURNO IS NULL
        OR :p_TURNO = ''
        OR "TURNO" = :p_TURNO
    )
    -- ï¿½ï¿½ NUEVO: Filtro Producto con LIKE
    AND (
        :p_PRODUCTO IS NULL
        OR :p_PRODUCTO = ''
        OR "PRODUCTO" LIKE '%' || :p_PRODUCTO || '%'
    )
    AND IFNULL("ESTATUS",'A') = 'A'
ORDER BY
    TO_INT(SUBSTRING_REGEXPR('\d+' IN "LINEA")),
    "FECHA",
    "TURNO",
    "GRUPO";
END
