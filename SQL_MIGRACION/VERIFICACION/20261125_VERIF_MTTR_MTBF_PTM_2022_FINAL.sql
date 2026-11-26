-- ============================================================================
-- 2026-11-25 | Schema: PTM_2022_FINAL | SOLO LECTURA (no escribe nada)
-- Diagnostico de MTTR / MTBF del tablero de Metricas (OEE).
--
-- REGLA DE NEGOCIO (usuario): MTTR y MTBF solo deben tomar las ordenes de
-- trabajo CORRECTIVAS que detuvieron la linea (MAQUINA_DETENIDA = 1) y que
-- esten cerradas con las 2 firmas (tecnico + supervisor).
--
-- COMO LO CALCULA HOY EL PORTAL (SpPdxMTTOMetricasOEE_<proceso>):
--   HORAS_PARO = suma de la COLUMNA de correctivos de la bitacora
--                (PVC: MTTO_CORRECTIVOS + HERRAMENTAL
--                 PEAD/INY/CORR: TIEMPO_MUERTO_CORRECTIVOS + TIEMPO_MUERTO_HERRAMENTALES)
--   N_OTMC     = ocurrencias de "OTMC-" en el JSON de la columna OTMC
--   MTTR       = HORAS_PARO / N_OTMC
--   MTBF       = (SUM(TIEMPO_DISPONIBLE) - HORAS_PARO) / N_OTMC
--
-- El problema: el NUMERADOR sale de una columna que tambien recibe capturas
-- manuales de paro (categoria "MTTO CORRECTIVOS") y horas historicas
-- acumuladas, mientras el DENOMINADOR solo cuenta las OTMC del JSON.
-- Resultado: MTTR/MTBF se inflan con horas que no corresponden a ninguna OT.
--
-- Este script:
--   1) reproduce el KPI actual (para confirmar el numero del tablero),
--   2) desglosa fila por fila: horas de la columna vs horas reales de las OT,
--   3) resume por proceso: horas con OT, horas sin OT (manuales/legacy),
--   4) calcula el KPI con la regla del usuario desde el catalogo de OT,
--   5) audita duplicados y OT sin paro / sin firmas.
--
-- PARAMETROS A EDITAR (estan repetidos en cada bloque, buscar "PARAM"):
--   FECHA INICIO : 2026-11-01
--   FECHA FIN    : 2026-11-30
--   PLANTA       : 2
--   LINEA        : NULL (NULL = todas)  -> para filtrar: "LINEA" = 'LÍNEA 1 PVC'
-- ============================================================================


-- ============================================================================
-- 0) KPI tal como lo devuelve el SP (descomentar y ajustar parametros)
-- ============================================================================
-- CALL "PTM_2022_FINAL"."SpPdxMTTOMetricasOEE_PVC"
--      ('2026-11-01', '2026-11-30', NULL, 1, NULL);


-- ============================================================================
-- 1) REPLICA DEL KPI ACTUAL POR PROCESO (sin joins: formula exacta del SP)
--    Debe coincidir con el tablero (ej. MTTR 61.32, paradas 1).
-- ============================================================================
WITH BITACORA AS (
    SELECT 'PVC' AS PROCESO,
           IFNULL("TIEMPO_DISPONIBLE", 0) AS TD,
           IFNULL("MTTO_CORRECTIVOS", 0) + IFNULL("HERRAMENTAL", 0) AS H_PARO,
           CASE WHEN IFNULL("MTTO_CORRECTIVOS", 0) + IFNULL("HERRAMENTAL", 0) = 0 THEN 0
                ELSE IFNULL(OCCURRENCES_REGEXPR('OTMC-' IN TO_NVARCHAR("OTMC")), 0) END AS N_OTMC
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC"
    WHERE IFNULL("ESTATUS", 'A') = 'A'
      AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30'          -- PARAM
      AND "PLANTA" = '2'                                          -- PARAM (PVC: NVARCHAR)
    UNION ALL
    SELECT 'PEAD LISO',
           IFNULL("TIEMPO_DISPONIBLE", 0),
           IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0) + IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0),
           CASE WHEN IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0) + IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0) = 0 THEN 0
                ELSE IFNULL(OCCURRENCES_REGEXPR('OTMC-' IN TO_NVARCHAR("OTMC")), 0) END
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPeadLiso"
    WHERE IFNULL("ESTATUS", 'A') = 'A'
      AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30'          -- PARAM
      AND "PLANTA" = '2'                                          -- PARAM (NVARCHAR)
    UNION ALL
    SELECT 'CORRUGADO',
           IFNULL("TIEMPO_DISPONIBLE", 0),
           IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0) + IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0),
           CASE WHEN IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0) + IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0) = 0 THEN 0
                ELSE IFNULL(OCCURRENCES_REGEXPR('OTMC-' IN TO_NVARCHAR("OTMC")), 0) END
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionCorrugado"
    WHERE IFNULL("ESTATUS", 'A') = 'A'
      AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30'          -- PARAM
      AND "PLANTA" = 2                                            -- PARAM (INT en Corrugado)
    UNION ALL
    SELECT 'INY',
           IFNULL("TIEMPO_DISPONIBLE", 0),
           IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0) + IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0),
           CASE WHEN IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0) + IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0) = 0 THEN 0
                ELSE IFNULL(OCCURRENCES_REGEXPR('OTMC-' IN TO_NVARCHAR("OTMC")), 0) END
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY"
    WHERE IFNULL("ESTATUS", 'A') = 'A'
      AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30'          -- PARAM
      AND "PLANTA" = '2'                                          -- PARAM (NVARCHAR)
)
SELECT
    CASE WHEN PROCESO IS NULL THEN 'TODOS (suma de procesos)' ELSE PROCESO END AS PROCESO,
    ROUND(SUM(TD), 2)                                          AS TIEMPO_DISPONIBLE,
    ROUND(SUM(H_PARO), 2)                                      AS HORAS_PARO_COLUMNA,
    SUM(N_OTMC)                                                AS N_OTMC_JSON,
    ROUND(SUM(H_PARO) / NULLIF(SUM(N_OTMC), 0), 2)             AS MTTR_ACTUAL,
    ROUND((SUM(TD) - SUM(H_PARO)) / NULLIF(SUM(N_OTMC), 0), 2) AS MTBF_ACTUAL
FROM BITACORA
GROUP BY GROUPING SETS ((PROCESO), ())
ORDER BY CASE WHEN PROCESO IS NULL THEN 1 ELSE 0 END, PROCESO;


-- ============================================================================
-- 2) DESGLOSE FILA POR FILA: horas de la columna vs horas reales de las OT
--    DIFERENCIA > 0  => horas que NO corresponden a ninguna OT
--                       (captura manual de "MTTO CORRECTIVOS" o acumulado viejo)
--    N_OTMC_JSON < N_OT_ENCONTRADAS => hay ordenes en el JSON sin catalogo
-- ============================================================================
WITH BITACORA AS (
    SELECT 'PVC' AS PROCESO,
           'PVC' || '|' || TO_NVARCHAR("ID_REGISTRO") AS ID_FILA,
           CAST("FECHA" AS DATE) AS FECHA,
           "LINEA",
           TO_NVARCHAR("PLANTA") AS PLANTA,
           IFNULL("MTTO_CORRECTIVOS", 0) AS H_MTTO,
           IFNULL("HERRAMENTAL", 0) AS H_HERR,
           IFNULL("MTTO_CORRECTIVOS", 0) + IFNULL("HERRAMENTAL", 0) AS H_COLUMNA,
           TO_NVARCHAR("OTMC") AS OTMC_TXT,
           TO_NVARCHAR("ID_PARO") AS ID_PARO_TXT,
           IFNULL(OCCURRENCES_REGEXPR('OTMC-' IN TO_NVARCHAR("OTMC")), 0) AS N_OTMC_JSON
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC"
    WHERE IFNULL("ESTATUS", 'A') = 'A'
      AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30'          -- PARAM
      AND "PLANTA" = '2'                                          -- PARAM
    UNION ALL
    SELECT 'PEAD LISO',
           'PEAD' || '|' || TO_NVARCHAR("ID_REGISTRO"),
           CAST("FECHA" AS DATE), "LINEA", TO_NVARCHAR("PLANTA"),
           IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0),
           IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0),
           IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0) + IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0),
           TO_NVARCHAR("OTMC"), TO_NVARCHAR("ID_PARO"),
           IFNULL(OCCURRENCES_REGEXPR('OTMC-' IN TO_NVARCHAR("OTMC")), 0)
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPeadLiso"
    WHERE IFNULL("ESTATUS", 'A') = 'A'
      AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30'          -- PARAM
      AND "PLANTA" = '2'                                          -- PARAM
    UNION ALL
    SELECT 'CORRUGADO',
           'CORR' || '|' || TO_NVARCHAR("ID_REGISTRO"),
           CAST("FECHA" AS DATE), "LINEA", TO_NVARCHAR("PLANTA"),
           IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0),
           IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0),
           IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0) + IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0),
           TO_NVARCHAR("OTMC"), TO_NVARCHAR("ID_PARO"),
           IFNULL(OCCURRENCES_REGEXPR('OTMC-' IN TO_NVARCHAR("OTMC")), 0)
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionCorrugado"
    WHERE IFNULL("ESTATUS", 'A') = 'A'
      AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30'          -- PARAM
      AND "PLANTA" = 2                                            -- PARAM
    UNION ALL
    SELECT 'INY',
           'INY' || '|' || TO_NVARCHAR("ID_REGISTRO"),
           CAST("FECHA" AS DATE), "LINEA", TO_NVARCHAR("PLANTA"),
           IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0),
           IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0),
           IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0) + IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0),
           TO_NVARCHAR("OTMC"), TO_NVARCHAR("ID_PARO"),
           IFNULL(OCCURRENCES_REGEXPR('OTMC-' IN TO_NVARCHAR("OTMC")), 0)
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY"
    WHERE IFNULL("ESTATUS", 'A') = 'A'
      AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30'          -- PARAM
      AND "PLANTA" = '2'                                          -- PARAM
),
-- OT citadas en cada fila (misma tecnica que el saneo: LOCATE sobre el JSON)
OT_FILA AS (
    SELECT
        B.ID_FILA,
        TRIM(MCG."NUMERO_ORDEN") AS ORDEN,
        IFNULL(OT."MAQUINA_DETENIDA", 0) AS MAQUINA_DETENIDA,
        CASE WHEN LENGTH(TRIM(IFNULL(OT."FIRMA_REALIZO", '')))   > 0
              AND LENGTH(TRIM(IFNULL(OT."FIRMA_SUPERVISO", ''))) > 0
             THEN 1 ELSE 0 END AS DOS_FIRMAS,
        CASE WHEN UPPER(IFNULL(S."AREA_TECNICA", '')) LIKE '%HERRAMENTAL%'
             THEN 1 ELSE 0 END AS ES_HERR,
        -- Horas igual que el front (GlobalUtil.calcularDiferenciaHoras):
        -- minutos redondeados, luego a horas decimales.
        ROUND(CASE WHEN OT."HORA_FIN" IS NOT NULL
                    AND OT."HORA_FIN" >= IFNULL(OT."HORA_INICIO", MCG."HORA_APERTURA")
                   THEN ROUND(SECONDS_BETWEEN(IFNULL(OT."HORA_INICIO", MCG."HORA_APERTURA"),
                                              OT."HORA_FIN") / 60) / 60
                   ELSE 0 END, 4) AS HORAS
    FROM BITACORA B
    JOIN "PTM_2022_FINAL"."PdxMTTOMCGenerados" MCG
      ON LOCATE(B.OTMC_TXT, '"' || TRIM(MCG."NUMERO_ORDEN") || '"') > 0
    LEFT JOIN "PTM_2022_FINAL"."PdxMTTOOrdenesTrabajoMC" OT
      ON OT."NUMERO_ORDEN" = MCG."NUMERO_ORDEN"
    LEFT JOIN "PTM_2022_FINAL"."PdxMTTOSolicitudMC" S
      ON S."ID_SOLICITUD" = MCG."ID_SOLICITUD"
),
OT_UNI AS (
    SELECT ID_FILA, ORDEN,
           MAX(MAQUINA_DETENIDA) AS MAQUINA_DETENIDA,
           MAX(DOS_FIRMAS)       AS DOS_FIRMAS,
           MAX(ES_HERR)          AS ES_HERR,
           MAX(HORAS)            AS HORAS
    FROM OT_FILA
    GROUP BY ID_FILA, ORDEN
),
OT_AGG AS (
    SELECT ID_FILA,
           COUNT(*)                                                                 AS N_OT_ENCONTRADAS,
           SUM(CASE WHEN MAQUINA_DETENIDA = 1 AND DOS_FIRMAS = 1 THEN 1 ELSE 0 END) AS N_OT_VALIDAS,
           ROUND(SUM(HORAS), 4)                                                     AS HORAS_OT,
           ROUND(SUM(CASE WHEN MAQUINA_DETENIDA = 1 AND DOS_FIRMAS = 1
                          THEN HORAS ELSE 0 END), 4)                                AS HORAS_OT_VALIDAS,
           ROUND(SUM(CASE WHEN ES_HERR = 0 THEN HORAS ELSE 0 END), 4)               AS HORAS_MTTO,
           ROUND(SUM(CASE WHEN ES_HERR = 1 THEN HORAS ELSE 0 END), 4)               AS HORAS_HERR
    FROM OT_UNI
    GROUP BY ID_FILA
)
SELECT
    B.PROCESO, B.FECHA, B.LINEA,
    ROUND(B.H_MTTO, 2)                                  AS COL_MTTO_CORRECTIVOS,
    ROUND(B.H_HERR, 2)                                  AS COL_HERRAMENTAL,
    ROUND(B.H_COLUMNA, 2)                               AS HORAS_COLUMNA,
    B.N_OTMC_JSON,
    IFNULL(A.N_OT_ENCONTRADAS, 0)                       AS N_OT_CATALOGO,
    IFNULL(A.N_OT_VALIDAS, 0)                           AS N_OT_CON_PARO_Y_FIRMAS,
    ROUND(IFNULL(A.HORAS_OT, 0), 2)                     AS HORAS_OT_TODAS,
    ROUND(IFNULL(A.HORAS_OT_VALIDAS, 0), 2)             AS HORAS_OT_CON_PARO_Y_FIRMAS,
    ROUND(B.H_COLUMNA - IFNULL(A.HORAS_OT, 0), 2)       AS DIFERENCIA_COLUMNA_MENOS_OT,
    B.ID_PARO_TXT,
    B.OTMC_TXT
FROM BITACORA B
LEFT JOIN OT_AGG A ON A.ID_FILA = B.ID_FILA
WHERE B.H_COLUMNA > 0 OR B.N_OTMC_JSON > 0
ORDER BY B.PROCESO, B.FECHA, B.LINEA;


-- ============================================================================
-- 3) RESUMEN POR PROCESO: de donde salen las horas del numerador
--    HORAS_SIN_OT = horas en la columna que no pertenecen a ninguna OT
--                   (captura manual / acumulado) -> contaminan MTTR y MTBF
--    MTTR_REGLA   = horas SOLO de OT con paro y 2 firmas / N de esas OT
-- ============================================================================
WITH BITACORA AS (
    SELECT 'PVC' AS PROCESO,
           'PVC' || '|' || TO_NVARCHAR("ID_REGISTRO") AS ID_FILA,
           IFNULL("TIEMPO_DISPONIBLE", 0) AS TD,
           IFNULL("MTTO_CORRECTIVOS", 0) + IFNULL("HERRAMENTAL", 0) AS H_COLUMNA,
           TO_NVARCHAR("OTMC") AS OTMC_TXT,
           IFNULL(OCCURRENCES_REGEXPR('OTMC-' IN TO_NVARCHAR("OTMC")), 0) AS N_OTMC_JSON
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC"
    WHERE IFNULL("ESTATUS", 'A') = 'A'
      AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30'          -- PARAM
      AND "PLANTA" = '2'                                          -- PARAM
    UNION ALL
    SELECT 'PEAD LISO', 'PEAD' || '|' || TO_NVARCHAR("ID_REGISTRO"),
           IFNULL("TIEMPO_DISPONIBLE", 0),
           IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0) + IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0),
           TO_NVARCHAR("OTMC"),
           IFNULL(OCCURRENCES_REGEXPR('OTMC-' IN TO_NVARCHAR("OTMC")), 0)
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPeadLiso"
    WHERE IFNULL("ESTATUS", 'A') = 'A'
      AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30'          -- PARAM
      AND "PLANTA" = '2'                                          -- PARAM
    UNION ALL
    SELECT 'CORRUGADO', 'CORR' || '|' || TO_NVARCHAR("ID_REGISTRO"),
           IFNULL("TIEMPO_DISPONIBLE", 0),
           IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0) + IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0),
           TO_NVARCHAR("OTMC"),
           IFNULL(OCCURRENCES_REGEXPR('OTMC-' IN TO_NVARCHAR("OTMC")), 0)
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionCorrugado"
    WHERE IFNULL("ESTATUS", 'A') = 'A'
      AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30'          -- PARAM
      AND "PLANTA" = 2                                            -- PARAM
    UNION ALL
    SELECT 'INY', 'INY' || '|' || TO_NVARCHAR("ID_REGISTRO"),
           IFNULL("TIEMPO_DISPONIBLE", 0),
           IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0) + IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0),
           TO_NVARCHAR("OTMC"),
           IFNULL(OCCURRENCES_REGEXPR('OTMC-' IN TO_NVARCHAR("OTMC")), 0)
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY"
    WHERE IFNULL("ESTATUS", 'A') = 'A'
      AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30'          -- PARAM
      AND "PLANTA" = '2'                                          -- PARAM
),
OT_FILA AS (
    SELECT
        B.ID_FILA,
        TRIM(MCG."NUMERO_ORDEN") AS ORDEN,
        IFNULL(OT."MAQUINA_DETENIDA", 0) AS MAQUINA_DETENIDA,
        CASE WHEN LENGTH(TRIM(IFNULL(OT."FIRMA_REALIZO", '')))   > 0
              AND LENGTH(TRIM(IFNULL(OT."FIRMA_SUPERVISO", ''))) > 0
             THEN 1 ELSE 0 END AS DOS_FIRMAS,
        ROUND(CASE WHEN OT."HORA_FIN" IS NOT NULL
                    AND OT."HORA_FIN" >= IFNULL(OT."HORA_INICIO", MCG."HORA_APERTURA")
                   THEN ROUND(SECONDS_BETWEEN(IFNULL(OT."HORA_INICIO", MCG."HORA_APERTURA"),
                                              OT."HORA_FIN") / 60) / 60
                   ELSE 0 END, 4) AS HORAS
    FROM BITACORA B
    JOIN "PTM_2022_FINAL"."PdxMTTOMCGenerados" MCG
      ON LOCATE(B.OTMC_TXT, '"' || TRIM(MCG."NUMERO_ORDEN") || '"') > 0
    LEFT JOIN "PTM_2022_FINAL"."PdxMTTOOrdenesTrabajoMC" OT
      ON OT."NUMERO_ORDEN" = MCG."NUMERO_ORDEN"
),
OT_UNI AS (
    SELECT ID_FILA, ORDEN,
           MAX(MAQUINA_DETENIDA) AS MAQUINA_DETENIDA,
           MAX(DOS_FIRMAS)       AS DOS_FIRMAS,
           MAX(HORAS)            AS HORAS
    FROM OT_FILA
    GROUP BY ID_FILA, ORDEN
),
OT_AGG AS (
    SELECT ID_FILA,
           COUNT(*)                                                                 AS N_OT,
           SUM(CASE WHEN MAQUINA_DETENIDA = 1 AND DOS_FIRMAS = 1 THEN 1 ELSE 0 END) AS N_OT_VALIDAS,
           ROUND(SUM(HORAS), 4)                                                     AS HORAS_OT,
           ROUND(SUM(CASE WHEN MAQUINA_DETENIDA = 1 AND DOS_FIRMAS = 1
                          THEN HORAS ELSE 0 END), 4)                                AS HORAS_OT_VALIDAS
    FROM OT_UNI
    GROUP BY ID_FILA
),
RESUMEN AS (
    SELECT
        B.PROCESO,
        ROUND(SUM(B.H_COLUMNA), 4)                                AS HORAS_COLUMNA,
        ROUND(SUM(IFNULL(A.HORAS_OT, 0)), 4)                      AS HORAS_CON_OT,
        ROUND(SUM(B.H_COLUMNA - IFNULL(A.HORAS_OT, 0)), 4)        AS HORAS_SIN_OT,
        SUM(B.N_OTMC_JSON)                                        AS N_OTMC_JSON,
        -- El SP no cuenta la OT cuando la fila tiene 0 horas de paro (fix 2026-11-23)
        SUM(CASE WHEN B.H_COLUMNA = 0 THEN 0 ELSE B.N_OTMC_JSON END) AS N_OTMC_SP,
        SUM(IFNULL(A.N_OT, 0))                                    AS N_OT_CATALOGO,
        SUM(IFNULL(A.N_OT_VALIDAS, 0))                            AS N_OT_VALIDAS,
        ROUND(SUM(IFNULL(A.HORAS_OT_VALIDAS, 0)), 4)              AS HORAS_OT_VALIDAS,
        ROUND(SUM(B.TD), 4)                                       AS TIEMPO_DISPONIBLE
    FROM BITACORA B
    LEFT JOIN OT_AGG A ON A.ID_FILA = B.ID_FILA
    GROUP BY B.PROCESO
)
SELECT
    PROCESO,
    TIEMPO_DISPONIBLE,
    HORAS_COLUMNA,
    HORAS_CON_OT,
    HORAS_SIN_OT,
    N_OTMC_JSON,
    N_OTMC_SP,
    N_OT_CATALOGO,
    N_OT_VALIDAS,
    HORAS_OT_VALIDAS,
    -- KPI actual (como el SP)
    ROUND(HORAS_COLUMNA / NULLIF(N_OTMC_SP, 0), 2)                                     AS MTTR_ACTUAL,
    ROUND((TIEMPO_DISPONIBLE - HORAS_COLUMNA) / NULLIF(N_OTMC_SP, 0), 2)               AS MTBF_ACTUAL,
    -- KPI con la regla del usuario (solo OT con paro y 2 firmas)
    ROUND(HORAS_OT_VALIDAS / NULLIF(N_OT_VALIDAS, 0), 2)                               AS MTTR_REGLA,
    ROUND((TIEMPO_DISPONIBLE - HORAS_OT_VALIDAS) / NULLIF(N_OT_VALIDAS, 0), 2)         AS MTBF_REGLA,
    -- Diferencia que explica el reporte del usuario
    ROUND(HORAS_COLUMNA - HORAS_OT_VALIDAS, 2)                                         AS HORAS_INFLADAS
FROM RESUMEN
ORDER BY PROCESO;


-- ============================================================================
-- 4) UNIVERSO DIRECTO DEL CATALOGO DE OT (independiente de la bitacora)
--    OTs con paro de linea y 2 firmas, por fecha de cierre del tecnico.
--    Este es el N y las horas que deberia usar MTTR segun la regla.
-- ============================================================================
WITH OTS AS (
    SELECT
        TRIM(MCG."NUMERO_ORDEN") AS ORDEN,
        E."PLANTA",
        E."LINEA_PRODUCCION" AS ID_LINEA,
        E."NOMBRE_EQUIPO",
        UPPER(IFNULL(S."AREA_TECNICA", '')) AS AREA_TECNICA,
        IFNULL(OT."MAQUINA_DETENIDA", 0) AS MAQUINA_DETENIDA,
        OT."HORA_INICIO",
        OT."HORA_FIN",
        MCG."HORA_APERTURA",
        IFNULL(MCG."ESTATUS", 0) AS ESTATUS,
        CASE WHEN LENGTH(TRIM(IFNULL(OT."FIRMA_REALIZO", '')))   > 0 THEN 'SI' ELSE 'NO' END AS FIRMA_REALIZO,
        CASE WHEN LENGTH(TRIM(IFNULL(OT."FIRMA_SUPERVISO", ''))) > 0 THEN 'SI' ELSE 'NO' END AS FIRMA_SUPERVISO,
        ROUND(CASE WHEN OT."HORA_FIN" IS NOT NULL
                    AND OT."HORA_FIN" >= IFNULL(OT."HORA_INICIO", MCG."HORA_APERTURA")
                   THEN ROUND(SECONDS_BETWEEN(IFNULL(OT."HORA_INICIO", MCG."HORA_APERTURA"),
                                              OT."HORA_FIN") / 60) / 60
                   ELSE 0 END, 4) AS HORAS
    FROM "PTM_2022_FINAL"."PdxMTTOOrdenesTrabajoMC" OT
    INNER JOIN "PTM_2022_FINAL"."PdxMTTOMCGenerados" MCG
        ON MCG."NUMERO_ORDEN" = OT."NUMERO_ORDEN"
    INNER JOIN "PTM_2022_FINAL"."PdxMTTOSolicitudMC" S
        ON S."ID_SOLICITUD" = MCG."ID_SOLICITUD"
    INNER JOIN "PTM_2022_FINAL"."PdxMTTOGestionEquipos" E
        ON E."ID_EQUIPO" = S."ID_EQUIPO"
    WHERE OT."HORA_FIN" IS NOT NULL
      AND CAST(OT."HORA_FIN" AS DATE) BETWEEN '2026-11-01' AND '2026-11-30'   -- PARAM
      AND TO_INT(E."PLANTA") = 2                                                       -- PARAM
)
SELECT
    COUNT(*)                                                          AS OTS_CERRADAS_EN_RANGO,
    SUM(CASE WHEN MAQUINA_DETENIDA = 1 THEN 1 ELSE 0 END)             AS CON_PARO,
    SUM(CASE WHEN MAQUINA_DETENIDA = 0 THEN 1 ELSE 0 END)             AS SIN_PARO,
    SUM(CASE WHEN MAQUINA_DETENIDA = 1 AND FIRMA_REALIZO = 'SI'
                  AND FIRMA_SUPERVISO = 'SI' THEN 1 ELSE 0 END)       AS CON_PARO_Y_2_FIRMAS,
    ROUND(SUM(CASE WHEN MAQUINA_DETENIDA = 1 AND FIRMA_REALIZO = 'SI'
                        AND FIRMA_SUPERVISO = 'SI' THEN HORAS ELSE 0 END), 4) AS HORAS_REPARACION,
    ROUND(SUM(CASE WHEN MAQUINA_DETENIDA = 1 AND FIRMA_REALIZO = 'SI'
                        AND FIRMA_SUPERVISO = 'SI' THEN HORAS ELSE 0 END)
          / NULLIF(SUM(CASE WHEN MAQUINA_DETENIDA = 1 AND FIRMA_REALIZO = 'SI'
                                 AND FIRMA_SUPERVISO = 'SI' THEN 1 ELSE 0 END), 0), 2) AS MTTR_REGLA
FROM OTS;


-- ============================================================================
-- 4b) LISTADO DE LAS OT DEL RANGO (para revisar una por una)
--     ORDEN | PARO | FIRMAS | HORAS | ESTATUS | EQUIPO
-- ============================================================================
WITH OTS AS (
    SELECT
        TRIM(MCG."NUMERO_ORDEN") AS ORDEN,
        E."NOMBRE_EQUIPO",
        E."PLANTA",
        IFNULL(OT."MAQUINA_DETENIDA", 0) AS MAQUINA_DETENIDA,
        CASE WHEN LENGTH(TRIM(IFNULL(OT."FIRMA_REALIZO", '')))   > 0 THEN 'SI' ELSE 'NO' END AS F_REALIZO,
        CASE WHEN LENGTH(TRIM(IFNULL(OT."FIRMA_SUPERVISO", ''))) > 0 THEN 'SI' ELSE 'NO' END AS F_SUPERVISO,
        IFNULL(MCG."ESTATUS", 0) AS ESTATUS,
        OT."HORA_INICIO",
        OT."HORA_FIN",
        ROUND(CASE WHEN OT."HORA_FIN" IS NOT NULL
                    AND OT."HORA_FIN" >= IFNULL(OT."HORA_INICIO", MCG."HORA_APERTURA")
                   THEN ROUND(SECONDS_BETWEEN(IFNULL(OT."HORA_INICIO", MCG."HORA_APERTURA"),
                                              OT."HORA_FIN") / 60) / 60
                   ELSE 0 END, 4) AS HORAS
    FROM "PTM_2022_FINAL"."PdxMTTOOrdenesTrabajoMC" OT
    INNER JOIN "PTM_2022_FINAL"."PdxMTTOMCGenerados" MCG
        ON MCG."NUMERO_ORDEN" = OT."NUMERO_ORDEN"
    INNER JOIN "PTM_2022_FINAL"."PdxMTTOSolicitudMC" S
        ON S."ID_SOLICITUD" = MCG."ID_SOLICITUD"
    INNER JOIN "PTM_2022_FINAL"."PdxMTTOGestionEquipos" E
        ON E."ID_EQUIPO" = S."ID_EQUIPO"
    WHERE OT."HORA_FIN" IS NOT NULL
      AND CAST(OT."HORA_FIN" AS DATE) BETWEEN '2026-11-01' AND '2026-11-30'   -- PARAM
      AND TO_INT(E."PLANTA") = 2                                                       -- PARAM
)
SELECT *
FROM OTS
ORDER BY HORA_FIN, ORDEN;


-- ============================================================================
-- 5) AUDITORIA: OT que estan en la bitacora pero no cumplen la regla
--    (sin paro, sin firmas completas o repetidas en varias filas).
-- ============================================================================
WITH BITACORA AS (
    SELECT 'PVC' AS PROCESO,
           'PVC' || '|' || TO_NVARCHAR("ID_REGISTRO") AS ID_FILA,
           CAST("FECHA" AS DATE) AS FECHA,
           "LINEA",
           IFNULL("MTTO_CORRECTIVOS", 0) + IFNULL("HERRAMENTAL", 0) AS H_COLUMNA,
           TO_NVARCHAR("OTMC") AS OTMC_TXT
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC"
    WHERE IFNULL("ESTATUS", 'A') = 'A'
      AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30'          -- PARAM
      AND "PLANTA" = '2'                                          -- PARAM
    UNION ALL
    SELECT 'PEAD LISO', 'PEAD' || '|' || TO_NVARCHAR("ID_REGISTRO"), CAST("FECHA" AS DATE), "LINEA",
           IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0) + IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0),
           TO_NVARCHAR("OTMC")
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPeadLiso"
    WHERE IFNULL("ESTATUS", 'A') = 'A'
      AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30'          -- PARAM
      AND "PLANTA" = '2'                                          -- PARAM
    UNION ALL
    SELECT 'CORRUGADO', 'CORR' || '|' || TO_NVARCHAR("ID_REGISTRO"), CAST("FECHA" AS DATE), "LINEA",
           IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0) + IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0),
           TO_NVARCHAR("OTMC")
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionCorrugado"
    WHERE IFNULL("ESTATUS", 'A') = 'A'
      AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30'          -- PARAM
      AND "PLANTA" = 2                                            -- PARAM
    UNION ALL
    SELECT 'INY', 'INY' || '|' || TO_NVARCHAR("ID_REGISTRO"), CAST("FECHA" AS DATE), "LINEA",
           IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0) + IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0),
           TO_NVARCHAR("OTMC")
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY"
    WHERE IFNULL("ESTATUS", 'A') = 'A'
      AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30'          -- PARAM
      AND "PLANTA" = '2'                                          -- PARAM
),
OT_FILA AS (
    SELECT
        B.PROCESO, B.FECHA, B.LINEA, B.ID_FILA, B.H_COLUMNA,
        TRIM(MCG."NUMERO_ORDEN") AS ORDEN,
        IFNULL(OT."MAQUINA_DETENIDA", 0) AS MAQUINA_DETENIDA,
        CASE WHEN LENGTH(TRIM(IFNULL(OT."FIRMA_REALIZO", '')))   > 0 THEN 1 ELSE 0 END AS F_REALIZO,
        CASE WHEN LENGTH(TRIM(IFNULL(OT."FIRMA_SUPERVISO", ''))) > 0 THEN 1 ELSE 0 END AS F_SUPERVISO,
        OT."HORA_FIN"
    FROM BITACORA B
    JOIN "PTM_2022_FINAL"."PdxMTTOMCGenerados" MCG
      ON LOCATE(B.OTMC_TXT, '"' || TRIM(MCG."NUMERO_ORDEN") || '"') > 0
    LEFT JOIN "PTM_2022_FINAL"."PdxMTTOOrdenesTrabajoMC" OT
      ON OT."NUMERO_ORDEN" = MCG."NUMERO_ORDEN"
)
SELECT
    PROCESO, FECHA, LINEA, ID_FILA, ORDEN,
    MAQUINA_DETENIDA, F_REALIZO, F_SUPERVISO, HORA_FIN,
    ROUND(H_COLUMNA, 2) AS HORAS_COLUMNA,
    CASE WHEN MAQUINA_DETENIDA = 0 THEN 'SIN PARO DE LINEA'
         WHEN F_REALIZO = 0 OR F_SUPERVISO = 0 THEN 'SIN 2 FIRMAS'
         WHEN HORA_FIN IS NULL THEN 'SIN HORA FIN DEL TECNICO'
         ELSE 'OK' END AS MOTIVO
FROM OT_FILA
WHERE MAQUINA_DETENIDA = 0
   OR F_REALIZO = 0
   OR F_SUPERVISO = 0
   OR HORA_FIN IS NULL
ORDER BY PROCESO, FECHA, ORDEN;


-- ============================================================================
-- 5b) OT REPETIDAS EN MAS DE UNA FILA (se cuentan doble en el denominador)
-- ============================================================================
WITH BITACORA AS (
    SELECT 'PVC' AS PROCESO, CAST("FECHA" AS DATE) AS FECHA, "LINEA", TO_NVARCHAR("OTMC") AS OTMC_TXT
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC"
    WHERE IFNULL("ESTATUS", 'A') = 'A' AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30' AND "PLANTA" = '2'   -- PARAM
    UNION ALL
    SELECT 'PEAD LISO', CAST("FECHA" AS DATE), "LINEA", TO_NVARCHAR("OTMC")
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPeadLiso"
    WHERE IFNULL("ESTATUS", 'A') = 'A' AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30' AND "PLANTA" = '2'   -- PARAM
    UNION ALL
    SELECT 'CORRUGADO', CAST("FECHA" AS DATE), "LINEA", TO_NVARCHAR("OTMC")
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionCorrugado"
    WHERE IFNULL("ESTATUS", 'A') = 'A' AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30' AND "PLANTA" = 2     -- PARAM
    UNION ALL
    SELECT 'INY', CAST("FECHA" AS DATE), "LINEA", TO_NVARCHAR("OTMC")
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY"
    WHERE IFNULL("ESTATUS", 'A') = 'A' AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30' AND "PLANTA" = '2'   -- PARAM
)
SELECT
    B.PROCESO,
    TRIM(MCG."NUMERO_ORDEN") AS ORDEN,
    COUNT(*) AS VECES_EN_BITACORA,
    MIN(B.FECHA) AS PRIMERA_FECHA,
    MAX(B.FECHA) AS ULTIMA_FECHA
FROM BITACORA B
JOIN "PTM_2022_FINAL"."PdxMTTOMCGenerados" MCG
  ON LOCATE(B.OTMC_TXT, '"' || TRIM(MCG."NUMERO_ORDEN") || '"') > 0
GROUP BY B.PROCESO, TRIM(MCG."NUMERO_ORDEN")
HAVING COUNT(*) > 1
ORDER BY B.PROCESO, ORDEN;


-- ============================================================================
-- 6) FILAS CON HORAS DE CORRECTIVO PERO SIN NINGUNA OT
--    Estas filas son las que meten horas al numerador sin sumar paradas.
-- ============================================================================
WITH BITACORA AS (
    SELECT 'PVC' AS PROCESO, 'PVC' || '|' || TO_NVARCHAR("ID_REGISTRO") AS ID_FILA,
           CAST("FECHA" AS DATE) AS FECHA, "LINEA", TO_NVARCHAR("PLANTA") AS PLANTA,
           IFNULL("MTTO_CORRECTIVOS", 0) + IFNULL("HERRAMENTAL", 0) AS H_COLUMNA,
           TO_NVARCHAR("OTMC") AS OTMC_TXT,
           TO_NVARCHAR("ID_PARO") AS ID_PARO_TXT
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC"
    WHERE IFNULL("ESTATUS", 'A') = 'A' AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30' AND "PLANTA" = '2'   -- PARAM
    UNION ALL
    SELECT 'PEAD LISO', 'PEAD' || '|' || TO_NVARCHAR("ID_REGISTRO"), CAST("FECHA" AS DATE), "LINEA", TO_NVARCHAR("PLANTA"),
           IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0) + IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0),
           TO_NVARCHAR("OTMC"), TO_NVARCHAR("ID_PARO")
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPeadLiso"
    WHERE IFNULL("ESTATUS", 'A') = 'A' AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30' AND "PLANTA" = '2'   -- PARAM
    UNION ALL
    SELECT 'CORRUGADO', 'CORR' || '|' || TO_NVARCHAR("ID_REGISTRO"), CAST("FECHA" AS DATE), "LINEA", TO_NVARCHAR("PLANTA"),
           IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0) + IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0),
           TO_NVARCHAR("OTMC"), TO_NVARCHAR("ID_PARO")
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionCorrugado"
    WHERE IFNULL("ESTATUS", 'A') = 'A' AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30' AND "PLANTA" = 2     -- PARAM
    UNION ALL
    SELECT 'INY', 'INY' || '|' || TO_NVARCHAR("ID_REGISTRO"), CAST("FECHA" AS DATE), "LINEA", TO_NVARCHAR("PLANTA"),
           IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0) + IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0),
           TO_NVARCHAR("OTMC"), TO_NVARCHAR("ID_PARO")
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY"
    WHERE IFNULL("ESTATUS", 'A') = 'A' AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30' AND "PLANTA" = '2'   -- PARAM
)
SELECT PROCESO, ID_FILA, FECHA, LINEA, PLANTA,
       ROUND(H_COLUMNA, 2) AS HORAS_COLUMNA,
       ID_PARO_TXT,
       OTMC_TXT
FROM BITACORA
WHERE H_COLUMNA > 0
  AND IFNULL(OTMC_TXT, '') NOT LIKE '%OTMC-%'
ORDER BY PROCESO, FECHA, LINEA;
