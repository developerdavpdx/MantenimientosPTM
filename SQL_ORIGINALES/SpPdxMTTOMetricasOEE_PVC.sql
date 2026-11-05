CREATE PROCEDURE "DBADMIN"."SpPdxMTTOMetricasOEE_PVC" (
    IN P_FECHA_INICIO DATE,
    IN P_FECHA_FIN    DATE,
    IN P_LINEA        NVARCHAR(50),
    IN P_PLANTA       INT
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN
WITH

-- ----------------------------------------------------------------------------
-- NOTA DE DISEÑO (DT vs DISPONIBILIDAD)
-- MTTR y MTBF salen del mismo universo de paros (las 10 columnas de "Tiempo
-- no productivo"). Con eso:
--   MTBF + MTTR = TIEMPO_DISPONIBLE / N° de paradas
--   DT = MTBF / (MTBF + MTTR) = (TIEMPO_DISPONIBLE - HORAS_PARO) / TIEMPO_DISPONIBLE
--
-- La Disponibilidad del OEE usa la MISMA definicion que el front (por fila):
--   Disponibilidad = TIEMPO_PRODUCTIVO / TIEMPO_DISPONIBLE
-- En el resumen del periodo se pondera por capacidad (kg) para que
--   Disponibilidad x Rendimiento x Calidad = OEE del periodo (ver PROMEDIOS).
-- Por eso Disponibilidad (capacidad) y DT (horas) pueden diferir ligeramente
-- (validado sept 2026 PVC: Disponibilidad ~57.53 vs DT ~55.78).
--
-- Si el usuario espera un DT basado solo en paros técnicos, restringir
-- HORAS_PARO a (MTTO_CORRECTIVOS, FALLA_ELECTRICA, SERVICIOS, HERRAMENTAL,
-- FALLA_OPERACION, FALTA_REFACCIONES) y ajustar el denominador de paradas
-- en consecuencia (ID_PARO no indica a qué columna pertenece cada paro).
--
-- NOTA: MTTR, MTBF, DT y OEE salen de la bitácora (fuente única). Se eliminó
-- P_AREA como parámetro (cada proceso tiene su tabla), MTTA y FPY (no están
-- en los KPIs solicitados). El único KPI que consulta fuera de la bitácora es
-- % Cumplimiento PM, porque la bitácora no trae los PM programados.
-- La bitácora garantiza que una OT no se sincroniza dos veces (sin DISTINCT).
--
-- NOTA: SIN REDONDEO. Los KPIs se devuelven con la máxima precisión (DOUBLE).
-- Las divisiones parten de TO_DOUBLE para evitar que la aritmética DECIMAL de
-- HANA trunque la escala. El formato de presentación es responsabilidad del
-- front.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- BITACORA_FILTRADA
-- Fuente única. Trae todo lo capturado en el rango/línea/planta.
-- HORAS_PARO       = Σ de las 10 columnas de "Tiempo no productivo"
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
          IFNULL("MTTO_CORRECTIVOS", 0)
        --+ IFNULL("FALLA_ELECTRICA", 0)
        --+ IFNULL("SERVICIOS", 0)
        --+ IFNULL("CAMBIO_MOLDE_SETUP_EXCESOS", 0)
        + IFNULL("HERRAMENTAL", 0) AS HORAS_PARO,
        --+ IFNULL("FALLA_OPERACION", 0)
        --+ IFNULL("LIMPIEZA_TANQUE", 0)
        --+ IFNULL("FALTA_MATERIAL", 0)
        --+ IFNULL("FALTA_PERSONAL", 0)
        --+ IFNULL("FALTA_REFACCIONES", 0)                                  
        IFNULL(OCCURRENCES_REGEXPR('OTMC-' IN TO_NVARCHAR("OTMC")), 0)    AS N_OTMC,
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
--   Disponibilidad = TiempoProductivo / TiempoDisponible
--   Rendimiento    = ((Prod + Scrap) / TiempoProductivo) / KgHrProducto
--   Calidad        = Prod / (Prod + Scrap)
--   OEE            = D x R x C  =  Prod / (TiempoDisponible x KgHrProducto)
-- Al multiplicarlas se cancelan los terminos, asi que para el periodo se
-- suman las capacidades (kg) y se calcula:
--   CAP_DISPONIBLE = Σ KG_POR_TIEMPO_DISPONIBLE   (TiempoDisponible x KgHrProducto)
--   CAP_PRODUCTIVA = Σ TIEMPO_PRODUCTIVO x KG_HR_PRODUCTO
--   KG_BRUTOS      = Σ (Produccion neta + Scrap)
--   KG_NETOS       = Σ Produccion neta
--   Disponibilidad = CAP_PRODUCTIVA / CAP_DISPONIBLE
--   Rendimiento    = KG_BRUTOS / CAP_PRODUCTIVA
--   Calidad        = KG_NETOS / KG_BRUTOS
--   OEE            = KG_NETOS / CAP_DISPONIBLE  (= D x R x C exacto)
-- Se excluyen filas sin KG_HR_PRODUCTO (sin capacidad definida); un turno
-- con OEE real de 0 SI cuenta en el periodo.
-- Validado (valores redondeados a 2 dec.): septiembre 2026, PVC, todas las
-- líneas -> Disponibilidad 57.53, Rendimiento 34.16, Calidad 80.26, OEE 15.77
-- Validado: LÍNEA 1 PVC ->
--   Disponibilidad 41.74, Rendimiento 52.29, Calidad 80.00, OEE 17.46
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
-- MTTR = Σ horas de paro / N° de paradas (OTMC + paros manuales) se quitaron los paros manuales
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
-- DT_TOTAL (Disponibilidad Técnica) = MTBF / (MTBF + MTTR) * 100
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
-- Único bloque que consulta fuera de la bitácora: la bitácora solo trae los
-- PM ejecutados (OTMP), no los programados, por eso sale de PdxMTTOMPGenerados.
-- Nace con HORA_APERTURA (PdxMTTOMPGenerados).
-- REGLA: cumplido = ESTATUS 4 (Cerrado, incluye "En proceso de firmas").
-- Cualquier otro estatus (ej. 2 = Liberado) cuenta como programado pero NO
-- cumplido.
-- ÁREA: PdxMTTOGestionEquipos mezcla equipos de todos los procesos y guarda
-- el ID_AREA numérico. El ID de "PVC" no es fijo entre plantas (1 en planta 1,
-- 14 en planta 2), por eso se filtra por NOMBRE de área contra el catálogo
-- PdxMTTOAreasxPlanta en vez de hardcodear un ID.
-- Validado: septiembre 2026, PVC -> 6 programados, 3 cerrados, 50 %
-- (LÍNEA 4 PVC: 4 / 3 / 75 %; LÍNEA 6 PVC: 2 / 0 / 0 %)
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

    -- Disponibilidad Técnica
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