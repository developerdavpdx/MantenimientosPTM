-- ============================================================================
-- 2026-11-25 | Schema: PTM_2022_FINAL | SOLO LECTURA
-- De donde sale el TIEMPO DISPONIBLE que usa MTBF (planta 2, noviembre 2026).
--
-- Formula por fila (igual que el portal):
--   TIEMPO_DISPONIBLE = HORAS_PROGRAMADAS - paros PROGRAMADOS (no disponibles)
--
--   PVC: MANTENIMIENTO_PREVENTIVO + CONTROL_INVENTARIOS + FALTA_MATERIA_INSUMOS
--        + CAMBIO_MOLDE_HR + CALENTAMIENTO_HR + PARO_ARRANQUE_NO_PROGRAMADO
--        + ARRANQUE_ESTABILIZACION_HR
--   INY: PREVENTIVO + CONTROL_INVENTARIOS + FALTA_MATERIA_PRIMA + PREPARACION_LINEA
--
-- Los correctivos, herramental, fallas, etc. NO se restan del tiempo disponible:
-- se restan del TIEMPO PRODUCTIVO (y de ahi salen OEE/Disponibilidad).
--
-- OJO: HORAS_PROGRAMADAS la captura produccion (es editable en los 4 procesos).
-- Es la suma de TODAS las lineas de la planta, no de una maquina sola.
-- ============================================================================

WITH FILAS AS (
    SELECT 'PVC' AS PROCESO,
           "LINEA",
           IFNULL("HORAS_PROGRAMADAS", 0) AS HP,
           IFNULL("MANTENIMIENTO_PREVENTIVO", 0) + IFNULL("CONTROL_INVENTARIOS", 0)
         + IFNULL("FALTA_MATERIA_INSUMOS", 0) + IFNULL("CAMBIO_MOLDE_HR", 0)
         + IFNULL("CALENTAMIENTO_HR", 0) + IFNULL("PARO_ARRANQUE_NO_PROGRAMADO", 0)
         + IFNULL("ARRANQUE_ESTABILIZACION_HR", 0) AS NO_DISP,
           IFNULL("TIEMPO_DISPONIBLE", 0) AS TD,
           "ID_PRODUCTO_TERMINADO"
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC"
    WHERE IFNULL("ESTATUS", 'A') = 'A'
      AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30'
      AND "PLANTA" = '2'
    UNION ALL
    SELECT 'INY',
           "LINEA",
           IFNULL("HORAS_PROGRAMADAS", 0),
           IFNULL("PREVENTIVO", 0) + IFNULL("CONTROL_INVENTARIOS", 0)
         + IFNULL("FALTA_MATERIA_PRIMA", 0) + IFNULL("PREPARACION_LINEA", 0),
           IFNULL("TIEMPO_DISPONIBLE", 0),
           "ID_PRODUCTO_TERMINADO"
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY"
    WHERE IFNULL("ESTATUS", 'A') = 'A'
      AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30'
      AND "PLANTA" = '2'
)
SELECT
    PROCESO,
    LINEA,
    COUNT(*)                                                        AS FILAS,
    SUM(CASE WHEN ID_PRODUCTO_TERMINADO IS NOT NULL THEN 1 ELSE 0 END) AS FILAS_PRODUCTO,
    ROUND(SUM(HP), 2)                                               AS HORAS_PROGRAMADAS,
    ROUND(SUM(NO_DISP), 2)                                          AS PAROS_PROGRAMADOS,
    ROUND(SUM(TD), 2)                                               AS TIEMPO_DISPONIBLE,
    ROUND(SUM(TD) / 720, 2)                                         AS DIAS_EQUIV_24H,
    ROUND(SUM(TD) / 12, 2)                                          AS TURNOS_EQUIV_12H
FROM FILAS
GROUP BY PROCESO, LINEA

UNION ALL

SELECT
    'TOTAL',
    NULL,
    COUNT(*),
    SUM(CASE WHEN ID_PRODUCTO_TERMINADO IS NOT NULL THEN 1 ELSE 0 END),
    ROUND(SUM(HP), 2),
    ROUND(SUM(NO_DISP), 2),
    ROUND(SUM(TD), 2),
    ROUND(SUM(TD) / 720, 2),
    ROUND(SUM(TD) / 12, 2)
FROM FILAS
ORDER BY PROCESO, LINEA;
