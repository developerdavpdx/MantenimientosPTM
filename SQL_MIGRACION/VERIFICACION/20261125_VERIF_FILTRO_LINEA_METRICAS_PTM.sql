-- ============================================================================
-- 2026-11-25 | Schema: PTM_2022_FINAL | SOLO LECTURA
-- Por que el filtro de Linea del tablero de Metricas no devuelve datos
-- (planta 2, noviembre 2026), salvo una linea.
--
-- El front manda el TEXTO visible del combo (metricas_mannto_refactor.js:153,
-- $('#FiltroLinea option:selected').text()) y el SP compara exacto:
--     (:P_LINEA IS NULL OR "LINEA" = :P_LINEA)
-- Si el nombre del catalogo (PdxMTTOLineasxPlanta.LINEA) no es identico al
-- texto guardado en la bitacora, el filtro devuelve 0 filas.
-- ============================================================================


-- ============================================================================
-- 1) LINEAS DISTINTAS GUARDADAS EN LAS BITACORAS (planta 2, noviembre)
--    Revisar LARGO vs LARGO_SIN_ESPACIOS: si difieren, hay espacios de mas.
-- ============================================================================
SELECT 'PVC' AS PROCESO, "LINEA", COUNT(*) AS FILAS,
       LENGTH("LINEA") AS LARGO, LENGTH(TRIM("LINEA")) AS LARGO_SIN_ESPACIOS,
       MIN(CAST("FECHA" AS DATE)) AS DESDE, MAX(CAST("FECHA" AS DATE)) AS HASTA
FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC"
WHERE IFNULL("ESTATUS", 'A') = 'A' AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30' AND "PLANTA" = '2'
GROUP BY "LINEA"
UNION ALL
SELECT 'PEAD LISO', "LINEA", COUNT(*), LENGTH("LINEA"), LENGTH(TRIM("LINEA")),
       MIN(CAST("FECHA" AS DATE)), MAX(CAST("FECHA" AS DATE))
FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPeadLiso"
WHERE IFNULL("ESTATUS", 'A') = 'A' AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30' AND "PLANTA" = '2'
GROUP BY "LINEA"
UNION ALL
SELECT 'CORRUGADO', "LINEA", COUNT(*), LENGTH("LINEA"), LENGTH(TRIM("LINEA")),
       MIN(CAST("FECHA" AS DATE)), MAX(CAST("FECHA" AS DATE))
FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionCorrugado"
WHERE IFNULL("ESTATUS", 'A') = 'A' AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30' AND "PLANTA" = 2
GROUP BY "LINEA"
UNION ALL
SELECT 'INY', "LINEA", COUNT(*), LENGTH("LINEA"), LENGTH(TRIM("LINEA")),
       MIN(CAST("FECHA" AS DATE)), MAX(CAST("FECHA" AS DATE))
FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY"
WHERE IFNULL("ESTATUS", 'A') = 'A' AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30' AND "PLANTA" = '2'
GROUP BY "LINEA"
ORDER BY PROCESO, "LINEA";


-- ============================================================================
-- 2) CATALOGO DE LINEAS DE PLANTA 2 (lo que muestra el combo)
-- ============================================================================
SELECT "ID_LINEA", "LINEA", TO_NVARCHAR("PLANTA") AS PLANTA, "PRODUCCION",
       LENGTH("LINEA") AS LARGO, LENGTH(TRIM("LINEA")) AS LARGO_SIN_ESPACIOS
FROM "PTM_2022_FINAL"."PdxMTTOLineasxPlanta"
WHERE TO_NVARCHAR("PLANTA") = '2'
ORDER BY "LINEA";


-- ============================================================================
-- 3) COMPARACION: por cada linea del catalogo, cuantas filas de bitacora
--    empatan EXACTO y cuantas empatan NORMALIZADO (sin espacios, mayusculas).
--    Si EXACTO = 0 y NORMALIZADO > 0 -> es espacio/acento/mayuscula.
-- ============================================================================
WITH B AS (
    SELECT 'PVC' AS PROCESO, "LINEA", COUNT(*) AS FILAS
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC"
    WHERE IFNULL("ESTATUS", 'A') = 'A' AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30' AND "PLANTA" = '2'
    GROUP BY "LINEA"
    UNION ALL
    SELECT 'PEAD LISO', "LINEA", COUNT(*)
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPeadLiso"
    WHERE IFNULL("ESTATUS", 'A') = 'A' AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30' AND "PLANTA" = '2'
    GROUP BY "LINEA"
    UNION ALL
    SELECT 'CORRUGADO', "LINEA", COUNT(*)
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionCorrugado"
    WHERE IFNULL("ESTATUS", 'A') = 'A' AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30' AND "PLANTA" = 2
    GROUP BY "LINEA"
    UNION ALL
    SELECT 'INY', "LINEA", COUNT(*)
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY"
    WHERE IFNULL("ESTATUS", 'A') = 'A' AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30' AND "PLANTA" = '2'
    GROUP BY "LINEA"
),
C AS (
    SELECT "ID_LINEA", "LINEA"
    FROM "PTM_2022_FINAL"."PdxMTTOLineasxPlanta"
    WHERE TO_NVARCHAR("PLANTA") = '2'
)
SELECT
    C."ID_LINEA",
    C."LINEA"                                                              AS LINEA_CATALOGO,
    MAX(B.PROCESO)                                                         AS PROCESO,
    SUM(CASE WHEN B."LINEA" = C."LINEA" THEN B.FILAS ELSE 0 END)           AS FILAS_EXACTO,
    SUM(CASE WHEN UPPER(TRIM(B."LINEA")) = UPPER(TRIM(C."LINEA"))
             THEN B.FILAS ELSE 0 END)                                      AS FILAS_NORMALIZADO,
    MAX(B."LINEA")                                                         AS LINEA_EN_BITACORA
FROM C
LEFT JOIN B
    ON UPPER(TRIM(B."LINEA")) = UPPER(TRIM(C."LINEA"))
GROUP BY C."ID_LINEA", C."LINEA"
ORDER BY C."LINEA";


-- ============================================================================
-- 4) LINEAS QUE ESTAN EN LA BITACORA PERO NO EN EL CATALOGO (renombradas)
-- ============================================================================
WITH B AS (
    SELECT 'PVC' AS PROCESO, "LINEA", COUNT(*) AS FILAS
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC"
    WHERE IFNULL("ESTATUS", 'A') = 'A' AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30' AND "PLANTA" = '2'
    GROUP BY "LINEA"
    UNION ALL
    SELECT 'PEAD LISO', "LINEA", COUNT(*)
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPeadLiso"
    WHERE IFNULL("ESTATUS", 'A') = 'A' AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30' AND "PLANTA" = '2'
    GROUP BY "LINEA"
    UNION ALL
    SELECT 'CORRUGADO', "LINEA", COUNT(*)
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionCorrugado"
    WHERE IFNULL("ESTATUS", 'A') = 'A' AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30' AND "PLANTA" = 2
    GROUP BY "LINEA"
    UNION ALL
    SELECT 'INY', "LINEA", COUNT(*)
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY"
    WHERE IFNULL("ESTATUS", 'A') = 'A' AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30' AND "PLANTA" = '2'
    GROUP BY "LINEA"
)
SELECT B.PROCESO, B."LINEA" AS LINEA_EN_BITACORA, B.FILAS
FROM B
LEFT JOIN "PTM_2022_FINAL"."PdxMTTOLineasxPlanta" C
    ON TO_NVARCHAR(C."PLANTA") = '2'
   AND UPPER(TRIM(C."LINEA")) = UPPER(TRIM(B."LINEA"))
WHERE C."ID_LINEA" IS NULL
ORDER BY B.PROCESO, B."LINEA";
