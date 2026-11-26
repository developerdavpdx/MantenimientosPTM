-- ============================================================================
-- 2026-11-25 | Schema: PTM_2022_FINAL | PENDIENTE DE APLICAR
-- Fix del filtro de Linea en el tablero de Metricas (OEE).
--
-- Causa: en las bitacoras conviven dos nombres para la misma linea:
--   "Linea 1 PVC"   (filas historicas)
--   "LÍNEA 1 PVC"   (nombre actual del catalogo PdxMTTOLineasxPlanta)
-- y el filtro comparaba texto exacto ("LINEA" = :P_LINEA), por lo que al
-- elegir una linea solo traia las filas con el nombre nuevo (y el KPI salia
-- en 0). Con "Todas las lineas" si traia todo.
--
-- Cambio: la comparacion de P_LINEA ignora mayusculas, acentos y espacios
-- (UPPER + TRIM + sustitucion de Á É Í Ó Ú). Aplica a las 2 comparaciones
-- por procedimiento:
--   1) WHERE de la bitacora        ("LINEA")
--   2) cumplimiento PM             (LE."LINEA" del catalogo)
--
-- No cambia calculos, formulas, datos ni CLAVE_SYNC.
-- Solo se alteran los 4 SP: SpPdxMTTOMetricasOEE_{PVC,PeadLiso,Corrugado,INY}.
-- ============================================================================

-- Fix 2: N° de paradas no cuenta filas sin horas de paro cuando P_CLASIFICACION = NULL.
-- Antes, la salvaguarda (tiempo muerto = 0 => no cuenta) solo se activaba filtrando
-- Clasificacion = MANTENIMIENTO/HERRAMENTALES; con "Todas" contaba todas las OTMC del
-- string aunque la fila tuviera 0 horas (caso OTMC-113/OTMC-037).
-- No cambia horas, OEE ni disponibilidad; solo el conteo de paradas.

-- Referencia: version previa en 20261118_METRICAS_OEE_CUMPLIMIENTO_PM_3_FIRMAS_DBADMIN.sql

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
            WHEN :P_CLASIFICACION IS NULL
                 AND IFNULL("MTTO_CORRECTIVOS", 0) + IFNULL("HERRAMENTAL", 0) = 0 THEN 0
            ELSE IFNULL(OCCURRENCES_REGEXPR('OTMC-' IN TO_NVARCHAR("OTMC")), 0)
        END AS N_OTMC,
        IFNULL(OCCURRENCES_REGEXPR('[^|]+' IN TO_NVARCHAR("ID_PARO")), 0) AS N_PAROS_MANUALES
    FROM "PdxMTTOTiemposMuertosProduccionPVC"
    WHERE "ESTATUS" = 'A'
      AND ((:P_FECHA_INICIO IS NULL OR :P_FECHA_FIN IS NULL)
           OR ("FECHA" BETWEEN :P_FECHA_INICIO AND :P_FECHA_FIN))
      AND (:P_LINEA IS NULL OR
           REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM("LINEA")),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U')
           =
           REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM(:P_LINEA)),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U'))
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
        IFNULL(SUM(N_OTMC), 0)  AS TOTAL_PARADAS,
        CASE WHEN SUM(N_OTMC) > 0
             THEN TO_DOUBLE(SUM(HORAS_PARO)) / SUM(N_OTMC)
        END                                        AS MTTR_HRS_EXACTO,
        CASE WHEN SUM(N_OTMC) > 0
             THEN TO_DOUBLE(SUM(HORAS_PARO)) / SUM(N_OTMC)
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
        CASE WHEN SUM(N_OTMC) > 0
             THEN TO_DOUBLE(SUM(IFNULL("TIEMPO_DISPONIBLE", 0)) - SUM(HORAS_PARO))
                  / SUM(N_OTMC)
        END AS MTBF_HRS_EXACTO,
        CASE WHEN SUM(N_OTMC) > 0
             THEN TO_DOUBLE(SUM(IFNULL("TIEMPO_DISPONIBLE", 0)) - SUM(HORAS_PARO))
                  / SUM(N_OTMC)
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
-- REGLA (2026-11-18): cumplido = ESTATUS 4 (Cerrado) Y las 3 firmas capturadas
-- (FIRMA_REALIZO / FIRMA_SUPERVISO / FIRMA_MANTENIMIENTO = 'SI').
-- Antes bastaba ESTATUS 4, que se alcanza con solo la firma del tecnico, por lo
-- que se contaban PM sin firma del supervisor de produccion ni del
-- administrador de mantenimiento.
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
        MP."ESTATUS",
        -- Cumplido = PM cerrado (ESTATUS 4) y con las 3 firmas requeridas.
        -- IFNULL cubre PM sin fila en PdxMTTOOrdenesTrabajoMP y firmas NULL.
        CASE WHEN MP."ESTATUS" = 4
                  AND IFNULL(F."TIENE_3_FIRMAS", 0) = 1
             THEN 1 ELSE 0 END AS CUMPLIDO
    FROM "PdxMTTOMPGenerados" MP
    INNER JOIN "PdxMTTOGestionEquipos" E
        ON MP."ID_EQUIPO" = E."ID_EQUIPO"
    INNER JOIN "PdxMTTOAreasxPlanta" A
        ON E."AREA" = A."ID_AREA"
       AND A."AREA" = 'PVC'
    LEFT JOIN "PdxMTTOLineasxPlanta" LE
        ON E."LINEA_PRODUCCION" = LE."ID_LINEA"
    -- Una fila por PM: MAX evita inflar el denominador si un PM tuviera mas de
    -- una OT detalle en PdxMTTOOrdenesTrabajoMP.
    LEFT JOIN (
        SELECT "ID_MANTENIMIENTO",
               MAX(CASE WHEN "FIRMA_REALIZO" = 'SI'
                         AND "FIRMA_SUPERVISO" = 'SI'
                         AND "FIRMA_MANTENIMIENTO" = 'SI'
                        THEN 1 ELSE 0 END) AS TIENE_3_FIRMAS
        FROM "PdxMTTOOrdenesTrabajoMP"
        GROUP BY "ID_MANTENIMIENTO"
    ) F
        ON MP."ID_MANTENIMIENTO" = F."ID_MANTENIMIENTO"
    WHERE
        MP."HORA_APERTURA" IS NOT NULL
        AND ((:P_FECHA_INICIO IS NULL OR :P_FECHA_FIN IS NULL)
             OR (MP."HORA_APERTURA" >= :P_FECHA_INICIO
                 AND MP."HORA_APERTURA" < ADD_DAYS(:P_FECHA_FIN, 1)))
        AND (:P_LINEA IS NULL OR
             REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM(LE."LINEA")),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U')
             =
             REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM(:P_LINEA)),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U'))
        AND (:P_PLANTA IS NULL OR E."PLANTA" = TO_INT(:P_PLANTA))
        AND (:P_CLASIFICACION IS NULL OR E."CLASIFICACION" = :P_CLASIFICACION)
),
CUMPLIMIENTO_PM_TOTAL AS (
    SELECT
        COUNT(*) AS TOTAL_PM_PROGRAMADOS,
        IFNULL(SUM("CUMPLIDO"), 0) AS TOTAL_PM_CERRADOS,
        CASE WHEN COUNT(*) > 0
             THEN TO_DOUBLE(SUM("CUMPLIDO")) * 100.0 / COUNT(*)
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
END;
-- @@
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
-- NOTA DE DISEÑO (DT vs DISPONIBILIDAD)
-- MTTR y MTBF salen de la bitácora. HORAS_PARO solo suma los paros técnicos
-- (TIEMPO_MUERTO_CORRECTIVOS + TIEMPO_MUERTO_HERRAMENTALES) y el N° de
-- paradas son SOLO las OT correctivas (OTMC); los paros manuales ya no
-- cuentan como parada.
-- Con eso:
--   MTBF + MTTR = TIEMPO_DISPONIBLE / N° de paradas
--   DT = MTBF / (MTBF + MTTR) = (TIEMPO_DISPONIBLE - HORAS_PARO) / TIEMPO_DISPONIBLE
--
-- La Disponibilidad del OEE usa la MISMA definicion que el front (por fila):
--   Disponibilidad = TIEMPO_PRODUCTIVO / TIEMPO_DISPONIBLE
-- En el resumen del periodo se pondera por capacidad (kg) para que
--   Disponibilidad x Rendimiento x Calidad = OEE del periodo (ver PROMEDIOS).
-- Por eso Disponibilidad (capacidad) y DT (horas) pueden diferir ligeramente.
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
-- HORAS_PARO       = TIEMPO_MUERTO_CORRECTIVOS + TIEMPO_MUERTO_HERRAMENTALES
--                    (las otras 3 columnas de "Tiempo no productivo" quedan
--                     comentadas: CAMBIO_MOLDE_SETUP_EXCESOS, FALTA_PERSONAL,
--                     TIEMPO_MUERTO_PROCESO)
-- N_OTMC           = OT correctivas del JSON: ["OTMC-004","OTMC-007"] -> 2
-- N_PAROS_MANUALES = IDs separados por pipe: 1|14|17 -> 3 (solo informativo,
--                    ya no se usa para MTTR/MTBF)
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
            WHEN :P_CLASIFICACION IS NULL
                 AND IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0) + IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0) = 0 THEN 0
            ELSE IFNULL(OCCURRENCES_REGEXPR('OTMC-' IN TO_NVARCHAR("OTMC")), 0)
        END AS N_OTMC,
        IFNULL(OCCURRENCES_REGEXPR('[^|]+' IN TO_NVARCHAR("ID_PARO")), 0) AS N_PAROS_MANUALES
    FROM "PdxMTTOTiemposMuertosProduccionPeadLiso"
    WHERE "ESTATUS" = 'A'
      AND ((:P_FECHA_INICIO IS NULL OR :P_FECHA_FIN IS NULL)
           OR ("FECHA" BETWEEN :P_FECHA_INICIO AND :P_FECHA_FIN))
      AND (:P_LINEA IS NULL OR
           REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM("LINEA")),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U')
           =
           REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM(:P_LINEA)),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U'))
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
-- Validado (valores redondeados a 2 dec.): pendiente, llenar al probar
--   PEAD LISO, todas las líneas -> Disponibilidad __, Rendimiento __, Calidad __, OEE __
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
-- MTTR = Σ horas de paro / N° de paradas (solo OTMC; se quitaron los paros
-- manuales)
-- ----------------------------------------------------------------------------
MTTR_TOTAL AS (
    SELECT
        IFNULL(SUM(HORAS_PARO), 0)                 AS TIEMPO_REPARACION_TOTAL_HRS,
        IFNULL(SUM(N_OTMC), 0)                     AS TOTAL_OTMC,
        IFNULL(SUM(N_PAROS_MANUALES), 0)           AS TOTAL_PAROS_MANUALES,
        IFNULL(SUM(N_OTMC), 0)  AS TOTAL_PARADAS,
        CASE WHEN SUM(N_OTMC) > 0
             THEN TO_DOUBLE(SUM(HORAS_PARO)) / SUM(N_OTMC)
        END                                        AS MTTR_HRS_EXACTO,
        CASE WHEN SUM(N_OTMC) > 0
             THEN TO_DOUBLE(SUM(HORAS_PARO)) / SUM(N_OTMC)
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
        CASE WHEN SUM(N_OTMC) > 0
             THEN TO_DOUBLE(SUM(IFNULL("TIEMPO_DISPONIBLE", 0)) - SUM(HORAS_PARO))
                  / SUM(N_OTMC)
        END AS MTBF_HRS_EXACTO,
        CASE WHEN SUM(N_OTMC) > 0
             THEN TO_DOUBLE(SUM(IFNULL("TIEMPO_DISPONIBLE", 0)) - SUM(HORAS_PARO))
                  / SUM(N_OTMC)
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
-- REGLA (2026-11-18): cumplido = ESTATUS 4 (Cerrado) Y las 3 firmas capturadas
-- (FIRMA_REALIZO / FIRMA_SUPERVISO / FIRMA_MANTENIMIENTO = 'SI').
-- Antes bastaba ESTATUS 4, que se alcanza con solo la firma del tecnico, por lo
-- que se contaban PM sin firma del supervisor de produccion ni del
-- administrador de mantenimiento.
-- Cualquier otro estatus (ej. 2 = Liberado) cuenta como programado pero NO
-- cumplido.
-- ÁREA: PdxMTTOGestionEquipos mezcla equipos de todos los procesos y guarda
-- el ID_AREA numérico. El ID no es fijo entre plantas, por eso se filtra por
-- NOMBRE de área contra el catálogo PdxMTTOAreasxPlanta en vez de hardcodear
-- un ID.
-- Validado: pendiente, llenar al probar
-- ----------------------------------------------------------------------------
CUMPLIMIENTO_PM_FILTRADO AS (
    SELECT
        MP."ID_MANTENIMIENTO",
        MP."ESTATUS",
        -- Cumplido = PM cerrado (ESTATUS 4) y con las 3 firmas requeridas.
        -- IFNULL cubre PM sin fila en PdxMTTOOrdenesTrabajoMP y firmas NULL.
        CASE WHEN MP."ESTATUS" = 4
                  AND IFNULL(F."TIENE_3_FIRMAS", 0) = 1
             THEN 1 ELSE 0 END AS CUMPLIDO
    FROM "PdxMTTOMPGenerados" MP
    INNER JOIN "PdxMTTOGestionEquipos" E
        ON MP."ID_EQUIPO" = E."ID_EQUIPO"
    INNER JOIN "PdxMTTOAreasxPlanta" A
        ON E."AREA" = A."ID_AREA"
       AND A."AREA" = 'PEAD LISO'          -- confirmar nombre exacto en PdxMTTOAreasxPlanta
    LEFT JOIN "PdxMTTOLineasxPlanta" LE
        ON E."LINEA_PRODUCCION" = LE."ID_LINEA"
    -- Una fila por PM: MAX evita inflar el denominador si un PM tuviera mas de
    -- una OT detalle en PdxMTTOOrdenesTrabajoMP.
    LEFT JOIN (
        SELECT "ID_MANTENIMIENTO",
               MAX(CASE WHEN "FIRMA_REALIZO" = 'SI'
                         AND "FIRMA_SUPERVISO" = 'SI'
                         AND "FIRMA_MANTENIMIENTO" = 'SI'
                        THEN 1 ELSE 0 END) AS TIENE_3_FIRMAS
        FROM "PdxMTTOOrdenesTrabajoMP"
        GROUP BY "ID_MANTENIMIENTO"
    ) F
        ON MP."ID_MANTENIMIENTO" = F."ID_MANTENIMIENTO"
    WHERE
        MP."HORA_APERTURA" IS NOT NULL
        AND ((:P_FECHA_INICIO IS NULL OR :P_FECHA_FIN IS NULL)
             OR (MP."HORA_APERTURA" >= :P_FECHA_INICIO
                 AND MP."HORA_APERTURA" < ADD_DAYS(:P_FECHA_FIN, 1)))
        AND (:P_LINEA IS NULL OR
             REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM(LE."LINEA")),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U')
             =
             REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM(:P_LINEA)),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U'))
        AND (:P_PLANTA IS NULL OR E."PLANTA" = TO_INT(:P_PLANTA))
        AND (:P_CLASIFICACION IS NULL OR E."CLASIFICACION" = :P_CLASIFICACION)
),
CUMPLIMIENTO_PM_TOTAL AS (
    SELECT
        COUNT(*) AS TOTAL_PM_PROGRAMADOS,
        IFNULL(SUM("CUMPLIDO"), 0) AS TOTAL_PM_CERRADOS,
        CASE WHEN COUNT(*) > 0
             THEN TO_DOUBLE(SUM("CUMPLIDO")) * 100.0 / COUNT(*)
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
END;
-- @@
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
-- NOTA DE DISEÑO (DT vs DISPONIBILIDAD)
-- Las paradas se cuentan SOLO con OTMC (los paros manuales ya no entran).
-- HORAS_PARO solo suma TIEMPO_MUERTO_CORRECTIVOS (las demás columnas de
-- "Tiempo no productivo" de Corrugado quedaron comentadas).
-- Con eso:
--   MTTR = HORAS_PARO / N° de OTMC
--   MTBF = (TIEMPO_DISPONIBLE - HORAS_PARO) / N° de OTMC
--   MTBF + MTTR = TIEMPO_DISPONIBLE / N° de OTMC
--   DT = MTBF / (MTBF + MTTR) = (TIEMPO_DISPONIBLE - HORAS_PARO) / TIEMPO_DISPONIBLE
--
-- La Disponibilidad del OEE usa la MISMA definicion que el front (por fila):
--   Disponibilidad = TIEMPO_PRODUCTIVO / TIEMPO_DISPONIBLE
-- En el resumen del periodo se pondera por capacidad (kg) para que
--   Disponibilidad x Rendimiento x Calidad = OEE del periodo (ver PROMEDIOS).
-- Por eso Disponibilidad (capacidad) y DT (horas) pueden diferir ligeramente.
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
-- HORAS_PARO       = TIEMPO_MUERTO_CORRECTIVOS
-- N_OTMC           = OT correctivas del JSON: ["OTMC-004","OTMC-007"] -> 2
-- N_PAROS_MANUALES = IDs separados por pipe: 1|14|17 -> 3 (solo informativo,
--                    ya no se usa para MTTR/MTBF)
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
            WHEN :P_CLASIFICACION IS NULL
                 AND IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0) + IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0) = 0 THEN 0
            ELSE IFNULL(OCCURRENCES_REGEXPR('OTMC-' IN TO_NVARCHAR("OTMC")), 0)
        END AS N_OTMC,
        IFNULL(OCCURRENCES_REGEXPR('[^|]+' IN TO_NVARCHAR("ID_PARO")), 0) AS N_PAROS_MANUALES
    FROM "PdxMTTOTiemposMuertosProduccionCorrugado"
    WHERE "ESTATUS" = 'A'
      AND ((:P_FECHA_INICIO IS NULL OR :P_FECHA_FIN IS NULL)
           OR ("FECHA" BETWEEN :P_FECHA_INICIO AND :P_FECHA_FIN))
      AND (:P_LINEA IS NULL OR
           REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM("LINEA")),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U')
           =
           REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM(:P_LINEA)),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U'))
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
-- Validado (valores redondeados a 2 dec.): -- PENDIENTE, llenar al probar
--   CORRUGADO, todas las líneas -> Disponibilidad __, Rendimiento __, Calidad __, OEE __
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
-- MTTR = Σ horas de paro / N° de OTMC (se quitaron los paros manuales)
-- ----------------------------------------------------------------------------
MTTR_TOTAL AS (
    SELECT
        IFNULL(SUM(HORAS_PARO), 0)                 AS TIEMPO_REPARACION_TOTAL_HRS,
        IFNULL(SUM(N_OTMC), 0)                     AS TOTAL_OTMC,
        IFNULL(SUM(N_PAROS_MANUALES), 0)           AS TOTAL_PAROS_MANUALES,
        IFNULL(SUM(N_OTMC), 0)  AS TOTAL_PARADAS,
        CASE WHEN SUM(N_OTMC) > 0
             THEN TO_DOUBLE(SUM(HORAS_PARO)) / SUM(N_OTMC)
        END                                        AS MTTR_HRS_EXACTO,
        CASE WHEN SUM(N_OTMC) > 0
             THEN TO_DOUBLE(SUM(HORAS_PARO)) / SUM(N_OTMC)
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
        CASE WHEN SUM(N_OTMC) > 0
             THEN TO_DOUBLE(SUM(IFNULL("TIEMPO_DISPONIBLE", 0)) - SUM(HORAS_PARO))
                  / SUM(N_OTMC)
        END AS MTBF_HRS_EXACTO,
        CASE WHEN SUM(N_OTMC) > 0
             THEN TO_DOUBLE(SUM(IFNULL("TIEMPO_DISPONIBLE", 0)) - SUM(HORAS_PARO))
                  / SUM(N_OTMC)
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
-- REGLA (2026-11-18): cumplido = ESTATUS 4 (Cerrado) Y las 3 firmas capturadas
-- (FIRMA_REALIZO / FIRMA_SUPERVISO / FIRMA_MANTENIMIENTO = 'SI').
-- Antes bastaba ESTATUS 4, que se alcanza con solo la firma del tecnico, por lo
-- que se contaban PM sin firma del supervisor de produccion ni del
-- administrador de mantenimiento.
-- Cualquier otro estatus (ej. 2 = Liberado) cuenta como programado pero NO
-- cumplido.
-- ÁREA: PdxMTTOGestionEquipos mezcla equipos de todos los procesos y guarda
-- el ID_AREA numérico. El ID no es fijo entre plantas, por eso se filtra por
-- NOMBRE de área contra el catálogo PdxMTTOAreasxPlanta en vez de hardcodear
-- un ID.
-- Validado: -- PENDIENTE, llenar al probar
-- ----------------------------------------------------------------------------
CUMPLIMIENTO_PM_FILTRADO AS (
    SELECT
        MP."ID_MANTENIMIENTO",
        MP."ESTATUS",
        -- Cumplido = PM cerrado (ESTATUS 4) y con las 3 firmas requeridas.
        -- IFNULL cubre PM sin fila en PdxMTTOOrdenesTrabajoMP y firmas NULL.
        CASE WHEN MP."ESTATUS" = 4
                  AND IFNULL(F."TIENE_3_FIRMAS", 0) = 1
             THEN 1 ELSE 0 END AS CUMPLIDO
    FROM "PdxMTTOMPGenerados" MP
    INNER JOIN "PdxMTTOGestionEquipos" E
        ON MP."ID_EQUIPO" = E."ID_EQUIPO"
    INNER JOIN "PdxMTTOAreasxPlanta" A
        ON E."AREA" = A."ID_AREA"
       AND A."AREA" = 'PEAD CORR'          -- confirmar nombre exacto en PdxMTTOAreasxPlanta
    LEFT JOIN "PdxMTTOLineasxPlanta" LE
        ON E."LINEA_PRODUCCION" = LE."ID_LINEA"
    -- Una fila por PM: MAX evita inflar el denominador si un PM tuviera mas de
    -- una OT detalle en PdxMTTOOrdenesTrabajoMP.
    LEFT JOIN (
        SELECT "ID_MANTENIMIENTO",
               MAX(CASE WHEN "FIRMA_REALIZO" = 'SI'
                         AND "FIRMA_SUPERVISO" = 'SI'
                         AND "FIRMA_MANTENIMIENTO" = 'SI'
                        THEN 1 ELSE 0 END) AS TIENE_3_FIRMAS
        FROM "PdxMTTOOrdenesTrabajoMP"
        GROUP BY "ID_MANTENIMIENTO"
    ) F
        ON MP."ID_MANTENIMIENTO" = F."ID_MANTENIMIENTO"
    WHERE
        MP."HORA_APERTURA" IS NOT NULL
        AND ((:P_FECHA_INICIO IS NULL OR :P_FECHA_FIN IS NULL)
             OR (MP."HORA_APERTURA" >= :P_FECHA_INICIO
                 AND MP."HORA_APERTURA" < ADD_DAYS(:P_FECHA_FIN, 1)))
        AND (:P_LINEA IS NULL OR
             REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM(LE."LINEA")),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U')
             =
             REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM(:P_LINEA)),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U'))
        AND (:P_PLANTA IS NULL OR E."PLANTA" = TO_INT(:P_PLANTA))
        AND (:P_CLASIFICACION IS NULL OR E."CLASIFICACION" = :P_CLASIFICACION)
),
CUMPLIMIENTO_PM_TOTAL AS (
    SELECT
        COUNT(*) AS TOTAL_PM_PROGRAMADOS,
        IFNULL(SUM("CUMPLIDO"), 0) AS TOTAL_PM_CERRADOS,
        CASE WHEN COUNT(*) > 0
             THEN TO_DOUBLE(SUM("CUMPLIDO")) * 100.0 / COUNT(*)
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
END;
-- @@
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
-- NOTA DE DISEÑO (DT vs DISPONIBILIDAD)
-- Las paradas se cuentan SOLO con OTMC (los paros manuales ya no entran).
-- HORAS_PARO solo suma TIEMPO_MUERTO_CORRECTIVOS + TIEMPO_MUERTO_HERRAMENTALES
-- (las demás columnas de "Tiempo no productivo" de INY quedaron comentadas).
-- Con eso:
--   MTTR = HORAS_PARO / N° de OTMC
--   MTBF = (TIEMPO_DISPONIBLE - HORAS_PARO) / N° de OTMC
--   MTBF + MTTR = TIEMPO_DISPONIBLE / N° de OTMC
--   DT = MTBF / (MTBF + MTTR) = (TIEMPO_DISPONIBLE - HORAS_PARO) / TIEMPO_DISPONIBLE
--
-- La Disponibilidad del OEE usa la MISMA definicion que el front (por fila):
--   Disponibilidad = TIEMPO_PRODUCTIVO / TIEMPO_DISPONIBLE
-- En el resumen del periodo se pondera por capacidad (kg) para que
--   Disponibilidad x Rendimiento x Calidad = OEE del periodo (ver PROMEDIOS).
-- Por eso Disponibilidad (capacidad) y DT (horas) pueden diferir ligeramente.
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
-- HORAS_PARO       = TIEMPO_MUERTO_CORRECTIVOS + TIEMPO_MUERTO_HERRAMENTALES
-- N_OTMC           = OT correctivas del JSON: ["OTMC-004","OTMC-007"] -> 2
-- N_PAROS_MANUALES = IDs separados por pipe: 1|14|17 -> 3 (solo informativo,
--                    ya no se usa para MTTR/MTBF)
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
            WHEN :P_CLASIFICACION IS NULL
                 AND IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0) + IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0) = 0 THEN 0
            ELSE IFNULL(OCCURRENCES_REGEXPR('OTMC-' IN TO_NVARCHAR("OTMC")), 0)
        END AS N_OTMC,
        IFNULL(OCCURRENCES_REGEXPR('[^|]+' IN TO_NVARCHAR("ID_PARO")), 0) AS N_PAROS_MANUALES
    FROM "PdxMTTOTiemposMuertosProduccionINY"
    WHERE "ESTATUS" = 'A'
      AND ((:P_FECHA_INICIO IS NULL OR :P_FECHA_FIN IS NULL)
           OR ("FECHA" BETWEEN :P_FECHA_INICIO AND :P_FECHA_FIN))
      AND (:P_LINEA IS NULL OR
           REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM("LINEA")),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U')
           =
           REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM(:P_LINEA)),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U'))
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
-- Validado (valores redondeados a 2 dec.): -- PENDIENTE, llenar al probar
--   INYECCIÓN, todas las líneas -> Disponibilidad __, Rendimiento __, Calidad __, OEE __
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
-- MTTR = Σ horas de paro / N° de OTMC (se quitaron los paros manuales)
-- ----------------------------------------------------------------------------
MTTR_TOTAL AS (
    SELECT
        IFNULL(SUM(HORAS_PARO), 0)                 AS TIEMPO_REPARACION_TOTAL_HRS,
        IFNULL(SUM(N_OTMC), 0)                     AS TOTAL_OTMC,
        IFNULL(SUM(N_PAROS_MANUALES), 0)           AS TOTAL_PAROS_MANUALES,
        IFNULL(SUM(N_OTMC), 0)  AS TOTAL_PARADAS,
        CASE WHEN SUM(N_OTMC) > 0
             THEN TO_DOUBLE(SUM(HORAS_PARO)) / SUM(N_OTMC)
        END                                        AS MTTR_HRS_EXACTO,
        CASE WHEN SUM(N_OTMC) > 0
             THEN TO_DOUBLE(SUM(HORAS_PARO)) / SUM(N_OTMC)
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
        CASE WHEN SUM(N_OTMC) > 0
             THEN TO_DOUBLE(SUM(IFNULL("TIEMPO_DISPONIBLE", 0)) - SUM(HORAS_PARO))
                  / SUM(N_OTMC)
        END AS MTBF_HRS_EXACTO,
        CASE WHEN SUM(N_OTMC) > 0
             THEN TO_DOUBLE(SUM(IFNULL("TIEMPO_DISPONIBLE", 0)) - SUM(HORAS_PARO))
                  / SUM(N_OTMC)
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
-- REGLA (2026-11-18): cumplido = ESTATUS 4 (Cerrado) Y las 3 firmas capturadas
-- (FIRMA_REALIZO / FIRMA_SUPERVISO / FIRMA_MANTENIMIENTO = 'SI').
-- Antes bastaba ESTATUS 4, que se alcanza con solo la firma del tecnico, por lo
-- que se contaban PM sin firma del supervisor de produccion ni del
-- administrador de mantenimiento.
-- Cualquier otro estatus (ej. 2 = Liberado) cuenta como programado pero NO
-- cumplido.
-- ÁREA: PdxMTTOGestionEquipos mezcla equipos de todos los procesos y guarda
-- el ID_AREA numérico. El ID no es fijo entre plantas, por eso se filtra por
-- NOMBRE de área contra el catálogo PdxMTTOAreasxPlanta en vez de hardcodear
-- un ID.
-- Validado: -- PENDIENTE, llenar al probar
-- ----------------------------------------------------------------------------
CUMPLIMIENTO_PM_FILTRADO AS (
    SELECT
        MP."ID_MANTENIMIENTO",
        MP."ESTATUS",
        -- Cumplido = PM cerrado (ESTATUS 4) y con las 3 firmas requeridas.
        -- IFNULL cubre PM sin fila en PdxMTTOOrdenesTrabajoMP y firmas NULL.
        CASE WHEN MP."ESTATUS" = 4
                  AND IFNULL(F."TIENE_3_FIRMAS", 0) = 1
             THEN 1 ELSE 0 END AS CUMPLIDO
    FROM "PdxMTTOMPGenerados" MP
    INNER JOIN "PdxMTTOGestionEquipos" E
        ON MP."ID_EQUIPO" = E."ID_EQUIPO"
    INNER JOIN "PdxMTTOAreasxPlanta" A
        ON E."AREA" = A."ID_AREA"
       AND A."AREA" LIKE 'INYECCI%'          -- nombre con acento en PdxMTTOAreasxPlanta
    LEFT JOIN "PdxMTTOLineasxPlanta" LE
        ON E."LINEA_PRODUCCION" = LE."ID_LINEA"
    -- Una fila por PM: MAX evita inflar el denominador si un PM tuviera mas de
    -- una OT detalle en PdxMTTOOrdenesTrabajoMP.
    LEFT JOIN (
        SELECT "ID_MANTENIMIENTO",
               MAX(CASE WHEN "FIRMA_REALIZO" = 'SI'
                         AND "FIRMA_SUPERVISO" = 'SI'
                         AND "FIRMA_MANTENIMIENTO" = 'SI'
                        THEN 1 ELSE 0 END) AS TIENE_3_FIRMAS
        FROM "PdxMTTOOrdenesTrabajoMP"
        GROUP BY "ID_MANTENIMIENTO"
    ) F
        ON MP."ID_MANTENIMIENTO" = F."ID_MANTENIMIENTO"
    WHERE
        MP."HORA_APERTURA" IS NOT NULL
        AND ((:P_FECHA_INICIO IS NULL OR :P_FECHA_FIN IS NULL)
             OR (MP."HORA_APERTURA" >= :P_FECHA_INICIO
                 AND MP."HORA_APERTURA" < ADD_DAYS(:P_FECHA_FIN, 1)))
        AND (:P_LINEA IS NULL OR
             REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM(LE."LINEA")),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U')
             =
             REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM(:P_LINEA)),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U'))
        AND (:P_PLANTA IS NULL OR E."PLANTA" = TO_INT(:P_PLANTA))
        AND (:P_CLASIFICACION IS NULL OR E."CLASIFICACION" = :P_CLASIFICACION)
),
CUMPLIMIENTO_PM_TOTAL AS (
    SELECT
        COUNT(*) AS TOTAL_PM_PROGRAMADOS,
        IFNULL(SUM("CUMPLIDO"), 0) AS TOTAL_PM_CERRADOS,
        CASE WHEN COUNT(*) > 0
             THEN TO_DOUBLE(SUM("CUMPLIDO")) * 100.0 / COUNT(*)
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
END;

