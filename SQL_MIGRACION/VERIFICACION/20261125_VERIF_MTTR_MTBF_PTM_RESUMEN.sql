-- ============================================================================
-- 2026-11-25 | Schema: PTM_2022_FINAL | SOLO LECTURA
-- RESUMEN EN UNA FILA de MTTR / MTBF (reproduce la captura del tablero:
-- Planta 2, 01-30/11/2026, todos los procesos, todas las lineas).
--
-- Devuelve:
--   TIEMPO_DISPONIBLE          = T. disponible del tablero
--   HORAS_PARO_COLUMNA         = T. de inactividad / T. total de reparacion (lo que usa hoy el SP)
--   N_OTMC                     = N de paradas que muestra el tablero
--   MTTR_ACTUAL / MTBF_ACTUAL  = lo que muestra el tablero hoy (debe dar 61.32 / 7606.18)
--   N_OT_CON_PARO_Y_FIRMAS     = ordenes que SI deberian contar (paro + 2 firmas)
--   HORAS_OT_CON_PARO_Y_FIRMAS = horas de esas ordenes (ventana del tecnico)
--   MTTR_REGLA / MTBF_REGLA    = lo que deberia mostrar con la regla del usuario
--   HORAS_INFLADAS             = horas de mas que hoy entran al numerador
--   FILAS_SIN_OT / HORAS_SIN_OT= filas con horas de correctivo y ninguna OT (captura manual)
--   FILAS_CON_DIFERENCIA       = filas donde la columna no cuadra con las OT del JSON
--
-- Para planta 1: cambiar PLANTA = '2' por '1' (y 2 por 1 en Corrugado).
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
      AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30'
      AND "PLANTA" = '2'
    UNION ALL
    SELECT 'PEAD LISO', 'PEAD' || '|' || TO_NVARCHAR("ID_REGISTRO"),
           IFNULL("TIEMPO_DISPONIBLE", 0),
           IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0) + IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0),
           TO_NVARCHAR("OTMC"),
           IFNULL(OCCURRENCES_REGEXPR('OTMC-' IN TO_NVARCHAR("OTMC")), 0)
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPeadLiso"
    WHERE IFNULL("ESTATUS", 'A') = 'A'
      AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30'
      AND "PLANTA" = '2'
    UNION ALL
    SELECT 'CORRUGADO', 'CORR' || '|' || TO_NVARCHAR("ID_REGISTRO"),
           IFNULL("TIEMPO_DISPONIBLE", 0),
           IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0) + IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0),
           TO_NVARCHAR("OTMC"),
           IFNULL(OCCURRENCES_REGEXPR('OTMC-' IN TO_NVARCHAR("OTMC")), 0)
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionCorrugado"
    WHERE IFNULL("ESTATUS", 'A') = 'A'
      AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30'
      AND "PLANTA" = 2
    UNION ALL
    SELECT 'INY', 'INY' || '|' || TO_NVARCHAR("ID_REGISTRO"),
           IFNULL("TIEMPO_DISPONIBLE", 0),
           IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0) + IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0),
           TO_NVARCHAR("OTMC"),
           IFNULL(OCCURRENCES_REGEXPR('OTMC-' IN TO_NVARCHAR("OTMC")), 0)
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY"
    WHERE IFNULL("ESTATUS", 'A') = 'A'
      AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30'
      AND "PLANTA" = '2'
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
)
SELECT
    ROUND(SUM(B.TD), 2)                                                  AS TIEMPO_DISPONIBLE,
    ROUND(SUM(B.H_COLUMNA), 2)                                           AS HORAS_PARO_COLUMNA,
    SUM(CASE WHEN B.H_COLUMNA = 0 THEN 0 ELSE B.N_OTMC_JSON END)          AS N_OTMC,
    ROUND(SUM(B.H_COLUMNA)
          / NULLIF(SUM(CASE WHEN B.H_COLUMNA = 0 THEN 0 ELSE B.N_OTMC_JSON END), 0), 2) AS MTTR_ACTUAL,
    ROUND((SUM(B.TD) - SUM(B.H_COLUMNA))
          / NULLIF(SUM(CASE WHEN B.H_COLUMNA = 0 THEN 0 ELSE B.N_OTMC_JSON END), 0), 2) AS MTBF_ACTUAL,

    SUM(IFNULL(A.N_OT_VALIDAS, 0))                                       AS N_OT_CON_PARO_Y_FIRMAS,
    ROUND(SUM(IFNULL(A.HORAS_OT_VALIDAS, 0)), 2)                         AS HORAS_OT_CON_PARO_Y_FIRMAS,
    ROUND(SUM(IFNULL(A.HORAS_OT_VALIDAS, 0))
          / NULLIF(SUM(IFNULL(A.N_OT_VALIDAS, 0)), 0), 2)                AS MTTR_REGLA,
    ROUND((SUM(B.TD) - SUM(IFNULL(A.HORAS_OT_VALIDAS, 0)))
          / NULLIF(SUM(IFNULL(A.N_OT_VALIDAS, 0)), 0), 2)                AS MTBF_REGLA,

    ROUND(SUM(B.H_COLUMNA) - SUM(IFNULL(A.HORAS_OT_VALIDAS, 0)), 2)      AS HORAS_INFLADAS,
    SUM(CASE WHEN B.H_COLUMNA > 0 AND IFNULL(A.N_OT, 0) = 0 THEN 1 ELSE 0 END)   AS FILAS_SIN_OT,
    ROUND(SUM(CASE WHEN IFNULL(A.N_OT, 0) = 0 THEN B.H_COLUMNA ELSE 0 END), 2)   AS HORAS_SIN_OT,
    SUM(CASE WHEN B.H_COLUMNA - IFNULL(A.HORAS_OT, 0) <> 0 THEN 1 ELSE 0 END)    AS FILAS_CON_DIFERENCIA,
    ROUND(SUM(B.H_COLUMNA) - SUM(IFNULL(A.HORAS_OT, 0)), 2)              AS DIFERENCIA_TOTAL_COLUMNA_VS_OT
FROM BITACORA B
LEFT JOIN OT_AGG A ON A.ID_FILA = B.ID_FILA;
