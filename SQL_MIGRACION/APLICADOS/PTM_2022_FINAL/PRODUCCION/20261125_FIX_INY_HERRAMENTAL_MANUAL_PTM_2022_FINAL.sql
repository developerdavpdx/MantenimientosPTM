-- ============================================================================
-- 2026-11-25 | Schema: PTM_2022_FINAL | PENDIENTE DE APLICAR
-- Limpieza de las horas de HERRAMENTAL capturadas a mano en la bitacora de INY
-- (planta 2, noviembre 2026): 12 filas, 61 h, sin OT, sin paro y sin producto.
--
-- Causa: en INY la columna TIEMPO MUERTO HERRAMENTALES era editable
-- (produccion_iny_refactor.js) y esas horas se teclearon directo. El codigo ya
-- se corrigio (columna bloqueada y paros manuales de mantenimiento sin mapeo);
-- este script limpia lo ya guardado.
--
-- NO toca filas que tengan OTMP, OTMC, ID_PARO o producto terminado.
-- Recalcula TIEMPO_DISPONIBLE / TIEMPO_PRODUCTIVO y los KPI derivados con las
-- mismas formulas del saneo del 24/11.
--
-- Antes: herramental 61.00 h -> MTTR "Todas" = 61.32 h con 1 parada.
-- Despues: herramental 0.00 h -> MTTR "Todas" = 0.32 h con 1 parada.
-- ============================================================================


-- ============================================================================
-- 1) PREVIEW: filas que se van a corregir (debe dar 12 filas / 61 h)
-- ============================================================================
SELECT
    "ID_REGISTRO",
    CAST("FECHA" AS DATE)                       AS FECHA,
    "LINEA",
    TO_NVARCHAR("PLANTA")                       AS PLANTA,
    ROUND("TIEMPO_MUERTO_HERRAMENTALES", 2)     AS HERRAMENTAL_ANTES,
    "ID_PARO",
    "OTMC",
    "OTMP",
    "USUARIO",
    "FECHA_ACTUALIZACION"
FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY"
WHERE IFNULL("ESTATUS", 'A') = 'A'
  AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30'
  AND TO_NVARCHAR("PLANTA") = '2'
  AND IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0) > 0
  AND IFNULL(TO_NVARCHAR("OTMC"), '') IN ('', '[]')
  AND IFNULL(TO_NVARCHAR("OTMP"), '') IN ('', '[]')
  AND IFNULL(LENGTH(TO_NVARCHAR("ID_PARO")), 0) = 0
  AND "ID_PRODUCTO_TERMINADO" IS NULL
ORDER BY "FECHA", "LINEA";


-- ============================================================================
-- 2) RESPALDO de las filas afectadas
-- ============================================================================
CREATE COLUMN TABLE "PTM_2022_FINAL"."TMP_BAK_INY_HERR_20261125" AS (
    SELECT *
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY"
    WHERE IFNULL("ESTATUS", 'A') = 'A'
      AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30'
      AND TO_NVARCHAR("PLANTA") = '2'
      AND IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0) > 0
      AND IFNULL(TO_NVARCHAR("OTMC"), '') IN ('', '[]')
      AND IFNULL(TO_NVARCHAR("OTMP"), '') IN ('', '[]')
      AND IFNULL(LENGTH(TO_NVARCHAR("ID_PARO")), 0) = 0
      AND "ID_PRODUCTO_TERMINADO" IS NULL
);


-- ============================================================================
-- 3) STAGE con los valores recalculados (herramental = 0)
--    Formulas identicas al saneo 20261124 (bloque INY).
-- ============================================================================
CREATE COLUMN TABLE "PTM_2022_FINAL"."TMP_FIX_INY_HERR_STAGE_20261125" AS (
SELECT
    S."ID_REGISTRO",
    S.HERR_ANTES,
    S.TD_EXACTO,
    S.TP_EXACTO,
    ROUND(S.TD_EXACTO, 2)                                        AS TD,
    ROUND(S.TP_EXACTO, 2)                                        AS TP,
    ROUND(CASE WHEN S.TP_EXACTO > 0
               THEN (S.PROD + S.SCRAP) / S.TP_EXACTO ELSE 0 END, 2) AS KGNETOS,
    ROUND(S.TD_EXACTO * S.KG_HR, 2)                              AS KG_POR_TD,
    ROUND(CASE WHEN S.TP_EXACTO > 0 AND S.KG_HR > 0
               THEN ((S.PROD + S.SCRAP) / S.TP_EXACTO) / S.KG_HR * 100 ELSE 0 END, 2) AS REND,
    ROUND(CASE WHEN S.TD_EXACTO > 0
               THEN S.TP_EXACTO / S.TD_EXACTO * 100 ELSE 0 END, 2) AS DISP,
    ROUND(CASE WHEN S.TD_EXACTO > 0
               THEN S.TP_EXACTO / S.TD_EXACTO ELSE 0 END, 4)       AS DISP_F,
    ROUND(CASE WHEN S.TP_EXACTO > 0 AND S.KG_HR > 0
               THEN ((S.PROD + S.SCRAP) / S.TP_EXACTO) / S.KG_HR ELSE 0 END, 4) AS REND_F,
    ROUND(IFNULL(S.CALIDAD, 0) / 100, 4)                          AS CAL_F,
    ROUND(CASE WHEN S.TD_EXACTO * S.KG_HR > 0
               THEN S.PROD / (S.TD_EXACTO * S.KG_HR) * 100 ELSE 0 END, 2) AS EFICIENCIA
FROM (
    SELECT
        T."ID_REGISTRO",
        ROUND(IFNULL(T."TIEMPO_MUERTO_HERRAMENTALES", 0), 4) AS HERR_ANTES,
        GREATEST(IFNULL(T."HORAS_PROGRAMADAS", 0)
              - (IFNULL(T."PREVENTIVO", 0) + IFNULL(T."CONTROL_INVENTARIOS", 0)
                 + IFNULL(T."FALTA_MATERIA_PRIMA", 0) + IFNULL(T."PREPARACION_LINEA", 0)), 0) AS TD_EXACTO,
        GREATEST(IFNULL(T."HORAS_PROGRAMADAS", 0)
              - (IFNULL(T."PREVENTIVO", 0) + IFNULL(T."CONTROL_INVENTARIOS", 0)
                 + IFNULL(T."FALTA_MATERIA_PRIMA", 0) + IFNULL(T."PREPARACION_LINEA", 0))
              - (IFNULL(T."TIEMPO_MUERTO_CORRECTIVOS", 0)
                 + IFNULL(T."TIEMPO_MUERTO_ARRANQUES", 0) + IFNULL(T."FALLA_MATERIAL", 0)
                 + IFNULL(T."FALTA_PERSONAL", 0) + IFNULL(T."FALLA_ELECTRICA", 0)
                 + IFNULL(T."TIEMPO_MUERTO_PROCESO", 0)), 0) AS TP_EXACTO,
        IFNULL(T."PRODUCCION_NETA", 0) AS PROD,
        IFNULL(T."TOTAL_SCRAP", 0)     AS SCRAP,
        IFNULL(T."KG_HR_PRODUCTO", 0)  AS KG_HR,
        T."PORCENTAJE_CALIDAD"         AS CALIDAD
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY" T
    WHERE IFNULL(T."ESTATUS", 'A') = 'A'
      AND T."FECHA" BETWEEN '2026-11-01' AND '2026-11-30'
      AND TO_NVARCHAR(T."PLANTA") = '2'
      AND IFNULL(T."TIEMPO_MUERTO_HERRAMENTALES", 0) > 0
      AND IFNULL(TO_NVARCHAR(T."OTMC"), '') IN ('', '[]')
      AND IFNULL(TO_NVARCHAR(T."OTMP"), '') IN ('', '[]')
      AND IFNULL(LENGTH(TO_NVARCHAR(T."ID_PARO")), 0) = 0
      AND T."ID_PRODUCTO_TERMINADO" IS NULL
) S
);


-- ============================================================================
-- 4) MERGE: herramental a 0 y recalculo de TD/TP/KPI
-- ============================================================================
MERGE INTO "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY" T
USING "PTM_2022_FINAL"."TMP_FIX_INY_HERR_STAGE_20261125" S
ON T."ID_REGISTRO" = S."ID_REGISTRO"
WHEN MATCHED THEN UPDATE SET
    T."TIEMPO_MUERTO_HERRAMENTALES"     = 0,
    T."TIEMPO_DISPONIBLE"               = S.TD,
    T."TIEMPO_PRODUCTIVO"               = S.TP,
    T."KG_NETOS_HR_REALES"              = S.KGNETOS,
    T."KG_POR_TIEMPO_DISPONIBLE"        = S.KG_POR_TD,
    T."PORCENTAJE_RENDIMIENTO"          = S.REND,
    T."PORCENTAJE_EFICIENCIA_PRODUCTO"  = S.REND,
    T."PORCENTAJE_DISPONIBILIDAD"       = S.DISP,
    T."PORCENTAJE_OEE"                  = ROUND(S.DISP_F * S.REND_F * S.CAL_F * 100, 2),
    T."EFICIENCIA_OPERATIVA"            = S.EFICIENCIA,
    T."FECHA_ACTUALIZACION"             = CURRENT_TIMESTAMP;


-- ============================================================================
-- 5) VERIFICACION DESPUES (planta 2, noviembre 2026)
--    Esperado: HORAS_COLUMNA = 0.32, N_OTMC = 1, MTTR = 0.32, MTBF = 7667.18
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
    ROUND(SUM(TD), 2)                                           AS TIEMPO_DISPONIBLE,
    ROUND(SUM(H_PARO), 2)                                       AS HORAS_COLUMNA,
    SUM(N_OTMC)                                                 AS N_OTMC,
    ROUND(SUM(H_PARO) / NULLIF(SUM(N_OTMC), 0), 2)              AS MTTR,
    ROUND((SUM(TD) - SUM(H_PARO)) / NULLIF(SUM(N_OTMC), 0), 2)  AS MTBF
FROM BITACORA;


-- ============================================================================
-- 6) RESUMEN DE LA LIMPIEZA
-- ============================================================================
SELECT
    COUNT(*)                                       AS FILAS_CORREGIDAS,
    ROUND(SUM(HERR_ANTES), 2)                      AS HORAS_QUITADAS,
    ROUND(SUM(TD), 2)                              AS TD_TOTAL_RECALCULADO,
    ROUND(SUM(TP), 2)                              AS TP_TOTAL_RECALCULADO
FROM "PTM_2022_FINAL"."TMP_FIX_INY_HERR_STAGE_20261125";


-- ============================================================================
-- ROLLBACK (si hiciera falta):
--   UPDATE "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY" T
--   SET ("TIEMPO_MUERTO_HERRAMENTALES", "TIEMPO_DISPONIBLE", "TIEMPO_PRODUCTIVO",
--        "KG_NETOS_HR_REALES", "KG_POR_TIEMPO_DISPONIBLE", "PORCENTAJE_RENDIMIENTO",
--        "PORCENTAJE_EFICIENCIA_PRODUCTO", "PORCENTAJE_DISPONIBILIDAD",
--        "PORCENTAJE_OEE", "EFICIENCIA_OPERATIVA", "FECHA_ACTUALIZACION") =
--       (SELECT B."TIEMPO_MUERTO_HERRAMENTALES", B."TIEMPO_DISPONIBLE", B."TIEMPO_PRODUCTIVO",
--               B."KG_NETOS_HR_REALES", B."KG_POR_TIEMPO_DISPONIBLE", B."PORCENTAJE_RENDIMIENTO",
--               B."PORCENTAJE_EFICIENCIA_PRODUCTO", B."PORCENTAJE_DISPONIBILIDAD",
--               B."PORCENTAJE_OEE", B."EFICIENCIA_OPERATIVA", B."FECHA_ACTUALIZACION"
--        FROM "PTM_2022_FINAL"."TMP_BAK_INY_HERR_20261125" B
--        WHERE B."ID_REGISTRO" = T."ID_REGISTRO")
--   WHERE T."ID_REGISTRO" IN (SELECT "ID_REGISTRO" FROM "PTM_2022_FINAL"."TMP_BAK_INY_HERR_20261125");
--
--   DROP TABLE "PTM_2022_FINAL"."TMP_FIX_INY_HERR_STAGE_20261125";
--   DROP TABLE "PTM_2022_FINAL"."TMP_BAK_INY_HERR_20261125";
-- ============================================================================
