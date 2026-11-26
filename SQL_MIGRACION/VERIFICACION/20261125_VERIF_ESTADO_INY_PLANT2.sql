-- ============================================================================
-- 2026-11-25 | Schema: PTM_2022_FINAL | SOLO LECTURA
-- Estado ACTUAL de las horas de correctivos/herramental en planta 2, noviembre.
-- Sirve para ver que filas quedaron despues de la limpieza (13.00 h) y por que
-- el script no las tomo (tienen OT, paro o producto, o se capturaron despues).
-- ============================================================================


-- ============================================================================
-- 1) RESUMEN POR PROCESO (debe dar 0.32 + 13.00 = 13.32)
-- ============================================================================
WITH BITACORA AS (
    SELECT 'PVC' AS PROCESO,
           IFNULL("TIEMPO_DISPONIBLE", 0) AS TD,
           IFNULL("MTTO_CORRECTIVOS", 0) + IFNULL("HERRAMENTAL", 0) AS H_PARO,
           CASE WHEN IFNULL("MTTO_CORRECTIVOS", 0) + IFNULL("HERRAMENTAL", 0) = 0 THEN 0
                ELSE IFNULL(OCCURRENCES_REGEXPR('OTMC-' IN TO_NVARCHAR("OTMC")), 0) END AS N_OTMC
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC"
    WHERE IFNULL("ESTATUS", 'A') = 'A'
      AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30'
      AND "PLANTA" = '2'
    UNION ALL
    SELECT 'PEAD LISO',
           IFNULL("TIEMPO_DISPONIBLE", 0),
           IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0) + IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0),
           CASE WHEN IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0) + IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0) = 0 THEN 0
                ELSE IFNULL(OCCURRENCES_REGEXPR('OTMC-' IN TO_NVARCHAR("OTMC")), 0) END
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPeadLiso"
    WHERE IFNULL("ESTATUS", 'A') = 'A'
      AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30'
      AND "PLANTA" = '2'
    UNION ALL
    SELECT 'CORRUGADO',
           IFNULL("TIEMPO_DISPONIBLE", 0),
           IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0) + IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0),
           CASE WHEN IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0) + IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0) = 0 THEN 0
                ELSE IFNULL(OCCURRENCES_REGEXPR('OTMC-' IN TO_NVARCHAR("OTMC")), 0) END
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionCorrugado"
    WHERE IFNULL("ESTATUS", 'A') = 'A'
      AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30'
      AND "PLANTA" = 2
    UNION ALL
    SELECT 'INY',
           IFNULL("TIEMPO_DISPONIBLE", 0),
           IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0) + IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0),
           CASE WHEN IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0) + IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0) = 0 THEN 0
                ELSE IFNULL(OCCURRENCES_REGEXPR('OTMC-' IN TO_NVARCHAR("OTMC")), 0) END
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY"
    WHERE IFNULL("ESTATUS", 'A') = 'A'
      AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30'
      AND "PLANTA" = '2'
)
SELECT
    CASE WHEN PROCESO IS NULL THEN 'TODOS' ELSE PROCESO END AS PROCESO,
    ROUND(SUM(TD), 2)                                           AS TIEMPO_DISPONIBLE,
    ROUND(SUM(H_PARO), 2)                                       AS HORAS_COLUMNA,
    SUM(N_OTMC)                                                 AS N_OTMC,
    ROUND(SUM(H_PARO) / NULLIF(SUM(N_OTMC), 0), 2)              AS MTTR,
    ROUND((SUM(TD) - SUM(H_PARO)) / NULLIF(SUM(N_OTMC), 0), 2)  AS MTBF
FROM BITACORA
GROUP BY GROUPING SETS ((PROCESO), ())
ORDER BY CASE WHEN PROCESO IS NULL THEN 1 ELSE 0 END, PROCESO;


-- ============================================================================
-- 2) DETALLE: TODAS las filas con horas de correctivo/herramental
--    LIMPIABLE = 'SI' si el script de limpieza la habria tomado
--    (sin OTMP, sin OTMC, sin ID_PARO y sin producto terminado).
--    Si LIMPIABLE = 'NO', revisar el MOTIVO.
-- ============================================================================
WITH BITACORA AS (
    SELECT 'PVC' AS PROCESO,
           'PVC' || '|' || TO_NVARCHAR("ID_REGISTRO") AS ID_FILA,
           CAST("FECHA" AS DATE) AS FECHA,
           "LINEA",
           IFNULL("MTTO_CORRECTIVOS", 0) AS H_CORR,
           IFNULL("HERRAMENTAL", 0) AS H_HERR,
           TO_NVARCHAR("OTMC") AS OTMC_TXT,
           TO_NVARCHAR("OTMP") AS OTMP_TXT,
           TO_NVARCHAR("ID_PARO") AS ID_PARO_TXT,
           "ID_PRODUCTO_TERMINADO",
           "PRODUCTO",
           "TURNO",
           "USUARIO",
           "FECHA_ACTUALIZACION"
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC"
    WHERE IFNULL("ESTATUS", 'A') = 'A' AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30' AND "PLANTA" = '2'
    UNION ALL
    SELECT 'PEAD LISO', 'PEAD' || '|' || TO_NVARCHAR("ID_REGISTRO"), CAST("FECHA" AS DATE), "LINEA",
           IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0), IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0),
           TO_NVARCHAR("OTMC"), TO_NVARCHAR("OTMP"), TO_NVARCHAR("ID_PARO"),
           "ID_PRODUCTO_TERMINADO", "PRODUCTO", "TURNO", "USUARIO", "FECHA_ACTUALIZACION"
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPeadLiso"
    WHERE IFNULL("ESTATUS", 'A') = 'A' AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30' AND "PLANTA" = '2'
    UNION ALL
    SELECT 'CORRUGADO', 'CORR' || '|' || TO_NVARCHAR("ID_REGISTRO"), CAST("FECHA" AS DATE), "LINEA",
           IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0), IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0),
           TO_NVARCHAR("OTMC"), TO_NVARCHAR("OTMP"), TO_NVARCHAR("ID_PARO"),
           "ID_PRODUCTO_TERMINADO", "PRODUCTO", "TURNO", "USUARIO", "FECHA_ACTUALIZACION"
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionCorrugado"
    WHERE IFNULL("ESTATUS", 'A') = 'A' AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30' AND "PLANTA" = 2
    UNION ALL
    SELECT 'INY', 'INY' || '|' || TO_NVARCHAR("ID_REGISTRO"), CAST("FECHA" AS DATE), "LINEA",
           IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0), IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0),
           TO_NVARCHAR("OTMC"), TO_NVARCHAR("OTMP"), TO_NVARCHAR("ID_PARO"),
           "ID_PRODUCTO_TERMINADO", "PRODUCTO", "TURNO", "USUARIO", "FECHA_ACTUALIZACION"
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY"
    WHERE IFNULL("ESTATUS", 'A') = 'A' AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30' AND "PLANTA" = '2'
)
SELECT
    PROCESO, FECHA, LINEA, ID_FILA,
    ROUND(H_CORR, 2) AS H_CORRECTIVOS,
    ROUND(H_HERR, 2) AS H_HERRAMENTAL,
    ROUND(H_CORR + H_HERR, 2) AS H_TOTAL,
    OTMC_TXT, OTMP_TXT, ID_PARO_TXT,
    ID_PRODUCTO_TERMINADO, PRODUCTO, TURNO,
    "USUARIO", FECHA_ACTUALIZACION,
    CASE WHEN IFNULL(OTMC_TXT, '') IN ('', '[]')
              AND IFNULL(OTMP_TXT, '') IN ('', '[]')
              AND IFNULL(LENGTH(ID_PARO_TXT), 0) = 0
              AND ID_PRODUCTO_TERMINADO IS NULL
         THEN 'SI' ELSE 'NO' END AS LIMPIABLE,
    CASE WHEN IFNULL(OTMC_TXT, '') NOT IN ('', '[]') THEN 'TIENE OTMC'
         WHEN IFNULL(OTMP_TXT, '') NOT IN ('', '[]') THEN 'TIENE OTMP'
         WHEN IFNULL(LENGTH(ID_PARO_TXT), 0) > 0 THEN 'TIENE PARO'
         WHEN ID_PRODUCTO_TERMINADO IS NOT NULL THEN 'TIENE PRODUCTO'
         ELSE 'SIN OBSTACULO' END AS MOTIVO
FROM BITACORA
WHERE IFNULL(H_CORR, 0) + IFNULL(H_HERR, 0) > 0
ORDER BY PROCESO, FECHA, LINEA;
