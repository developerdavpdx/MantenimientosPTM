-- ============================================================================
-- 2026-11-25 | Schema: PTM_2022_FINAL | SOLO LECTURA
-- Cuadre de la bitacora PVC, LINEA 5, 01-25/11/2026.
--
-- Contexto: en la bitacora conviven "Linea 5 PVC" (historico) y "LÍNEA 5 PVC"
-- (nombre nuevo). El grid de Tiempos Muertos filtra por texto EXACTO y solo
-- muestra las filas nuevas; las Metricas ya comparan normalizado y suman las
-- dos. Este query lista todas las filas y detecta dias con las dos versiones
-- (posible doble conteo de TIEMPO_DISPONIBLE).
-- ============================================================================


-- ============================================================================
-- 1) TODAS LAS FILAS DE LINEA 5 PVC (las dos variantes), 01-25/11
--    Revisar HORAS_PROGRAMADAS y TIEMPO_DISPONIBLE por dia.
-- ============================================================================
SELECT
    "ID_REGISTRO",
    CAST("FECHA" AS DATE)                       AS FECHA,
    "LINEA",
    "HORAS_PROGRAMADAS",
    "TIEMPO_DISPONIBLE",
    "TIEMPO_PRODUCTIVO",
    "MTTO_CORRECTIVOS",
    "HERRAMENTAL",
    "PRODUCTO",
    "TURNO",
    "ID_PRODUCTO_TERMINADO",
    "OTMC",
    "OTMP",
    "ID_PARO",
    "ORIGEN",
    "USUARIO",
    "FECHA_ACTUALIZACION"
FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC"
WHERE IFNULL("ESTATUS", 'A') = 'A'
  AND CAST("FECHA" AS DATE) BETWEEN '2026-11-01' AND '2026-11-25'
  AND TO_NVARCHAR("PLANTA") = '2'
  AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM("LINEA")),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U') = 'LINEA 5 PVC'
ORDER BY CAST("FECHA" AS DATE), "LINEA", "ID_REGISTRO";


-- ============================================================================
-- 2) DIAS CON MAS DE UNA FILA PARA LA MISMA LINEA (posible doble conteo)
--    Si FILAS > 1, revisar si ambas tienen HORAS_PROGRAMADAS/TIEMPO_DISPONIBLE.
-- ============================================================================
SELECT
    CAST("FECHA" AS DATE)                       AS FECHA,
    COUNT(*)                                    AS FILAS,
    SUM(IFNULL("HORAS_PROGRAMADAS", 0))         AS HORAS_PROGRAMADAS,
    SUM(IFNULL("TIEMPO_DISPONIBLE", 0))         AS TIEMPO_DISPONIBLE,
    STRING_AGG("LINEA", ' | ' ORDER BY "LINEA") AS NOMBRES_LINEA
FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC"
WHERE IFNULL("ESTATUS", 'A') = 'A'
  AND CAST("FECHA" AS DATE) BETWEEN '2026-11-01' AND '2026-11-25'
  AND TO_NVARCHAR("PLANTA") = '2'
  AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM("LINEA")),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U') = 'LINEA 5 PVC'
GROUP BY CAST("FECHA" AS DATE)
HAVING COUNT(*) > 1
ORDER BY FECHA;


-- ============================================================================
-- 3) RESUMEN POR NOMBRE: cuanto aporta cada variante
-- ============================================================================
SELECT
    "LINEA",
    COUNT(*)                                AS FILAS,
    ROUND(SUM(IFNULL("HORAS_PROGRAMADAS", 0)), 2) AS HORAS_PROGRAMADAS,
    ROUND(SUM(IFNULL("TIEMPO_DISPONIBLE", 0)), 2) AS TIEMPO_DISPONIBLE,
    ROUND(SUM(IFNULL("TIEMPO_PRODUCTIVO", 0)), 2) AS TIEMPO_PRODUCTIVO,
    ROUND(SUM(IFNULL("MTTO_CORRECTIVOS", 0)), 2)  AS MTTO_CORRECTIVOS,
    ROUND(SUM(IFNULL("HERRAMENTAL", 0)), 2)       AS HERRAMENTAL
FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC"
WHERE IFNULL("ESTATUS", 'A') = 'A'
  AND CAST("FECHA" AS DATE) BETWEEN '2026-11-01' AND '2026-11-25'
  AND TO_NVARCHAR("PLANTA") = '2'
  AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM("LINEA")),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U') = 'LINEA 5 PVC'
GROUP BY "LINEA"
ORDER BY "LINEA";
