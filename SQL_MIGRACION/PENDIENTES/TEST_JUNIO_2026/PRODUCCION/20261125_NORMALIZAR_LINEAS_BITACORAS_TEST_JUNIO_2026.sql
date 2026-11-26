-- ============================================================================
-- 2026-11-25 | Schema: TEST_JUNIO_2026 | PENDIENTE DE APLICAR
-- Normalizacion de nombres de linea en las 4 bitacoras de Tiempos Muertos.
--
-- Problema: conviven "Linea 5 PVC" (historico) y "LÍNEA 5 PVC" (catalogo).
-- El grid filtra por texto exacto y solo ve las filas nuevas; las Metricas ya
-- comparan normalizado y suman las dos -> los numeros no cuadran.
--
-- Este script:
--   1) respalda las 4 tablas completas,
--   2) corrige el catalogo (LINEA 13/14/15 PVC -> con acento),
--   3) renombra LINEA y CLAVE_SYNC al nombre del catalogo,
--   4) NO borra filas (la fila vacia del 22/11 se conserva),
--   5) reporta renombradas, omitidas por colision y totales antes/despues.
--
-- No cambia horas, produccion ni KPI: solo el nombre de la linea y la clave.
-- Actualiza FECHA_ACTUALIZACION para invalidar tokens viejos: pedir a los
-- usuarios recargar el portal despues de aplicarlo.
-- ============================================================================


-- ============================================================================
-- 0) RE-EJECUCION (descomentar solo si hay que correrlo otra vez)
-- ============================================================================
-- DROP TABLE "TEST_JUNIO_2026"."TMP_BAK_NORM_PVC_20261125";
-- DROP TABLE "TEST_JUNIO_2026"."TMP_NORM_PVC_20261125";
-- DROP TABLE "TEST_JUNIO_2026"."TMP_NORM_PVC_SKIP_20261125";
-- DROP TABLE "TEST_JUNIO_2026"."TMP_BAK_NORM_PEAD_20261125";
-- DROP TABLE "TEST_JUNIO_2026"."TMP_NORM_PEAD_20261125";
-- DROP TABLE "TEST_JUNIO_2026"."TMP_NORM_PEAD_SKIP_20261125";
-- DROP TABLE "TEST_JUNIO_2026"."TMP_BAK_NORM_CORR_20261125";
-- DROP TABLE "TEST_JUNIO_2026"."TMP_NORM_CORR_20261125";
-- DROP TABLE "TEST_JUNIO_2026"."TMP_NORM_CORR_SKIP_20261125";
-- DROP TABLE "TEST_JUNIO_2026"."TMP_BAK_NORM_INY_20261125";
-- DROP TABLE "TEST_JUNIO_2026"."TMP_NORM_INY_20261125";
-- DROP TABLE "TEST_JUNIO_2026"."TMP_NORM_INY_SKIP_20261125";
-- DROP TABLE "TEST_JUNIO_2026"."TMP_CAT_L13_20261125";

-- ============================================================================
-- 1) RESPALDO COMPLETO DE LAS 4 TABLAS
-- ============================================================================
CREATE COLUMN TABLE "TEST_JUNIO_2026"."TMP_BAK_NORM_PVC_20261125" AS (
    SELECT * FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPVC"
);

CREATE COLUMN TABLE "TEST_JUNIO_2026"."TMP_BAK_NORM_PEAD_20261125" AS (
    SELECT * FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPeadLiso"
);

CREATE COLUMN TABLE "TEST_JUNIO_2026"."TMP_BAK_NORM_CORR_20261125" AS (
    SELECT * FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionCorrugado"
);

CREATE COLUMN TABLE "TEST_JUNIO_2026"."TMP_BAK_NORM_INY_20261125" AS (
    SELECT * FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionINY"
);

-- ============================================================================
-- 2) CATALOGO: LINEA 13/14/15 PVC con acento (como las demas lineas PVC)
--    Si ya estan con acento, la tabla temporal queda vacia y no cambia nada.
-- ============================================================================
CREATE COLUMN TABLE "TEST_JUNIO_2026"."TMP_CAT_L13_20261125" AS (
    SELECT L."ID_LINEA",
           L."LINEA" AS "LINEA_ANTES",
           CASE UPPER(TRIM(L."LINEA"))
             WHEN 'LINEA 13 PVC' THEN 'LÍNEA 13 PVC'
             WHEN 'LINEA 14 PVC' THEN 'LÍNEA 14 PVC'
             WHEN 'LINEA 15 PVC' THEN 'LÍNEA 15 PVC'
           END AS "LINEA_NUEVA"
    FROM "TEST_JUNIO_2026"."PdxMTTOLineasxPlanta" L
    WHERE TO_NVARCHAR(L."PLANTA") = '2'
      AND UPPER(TRIM(L."LINEA")) IN ('LINEA 13 PVC','LINEA 14 PVC','LINEA 15 PVC')
      AND NOT EXISTS (
          SELECT 1 FROM "TEST_JUNIO_2026"."PdxMTTOLineasxPlanta" X
          WHERE TO_NVARCHAR(X."PLANTA") = TO_NVARCHAR(L."PLANTA")
            AND X."LINEA" = CASE UPPER(TRIM(L."LINEA"))
                              WHEN 'LINEA 13 PVC' THEN 'LÍNEA 13 PVC'
                              WHEN 'LINEA 14 PVC' THEN 'LÍNEA 14 PVC'
                              WHEN 'LINEA 15 PVC' THEN 'LÍNEA 15 PVC'
                            END
      )
);

-- ============================================================================
-- 2c) CHEQUEO: nombres de linea repetidos en el catalogo (debe salir vacio)
-- ============================================================================
SELECT TO_NVARCHAR("PLANTA") AS PLANTA,
       REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM("LINEA")),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U') AS LINEA_NORMALIZADA,
       COUNT(*) AS NOMBRES
FROM "TEST_JUNIO_2026"."PdxMTTOLineasxPlanta"
GROUP BY TO_NVARCHAR("PLANTA"), REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM("LINEA")),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U')
HAVING COUNT(*) > 1;


-- ============================================================================
MERGE INTO "TEST_JUNIO_2026"."PdxMTTOLineasxPlanta" C
USING "TEST_JUNIO_2026"."TMP_CAT_L13_20261125" S
ON C."ID_LINEA" = S."ID_LINEA"
WHEN MATCHED THEN UPDATE SET C."LINEA" = S."LINEA_NUEVA";


-- ============================================================================
-- 2b) VERIFICAR LINEA 9 INY (debe existir en el catalogo)
--     Si no aparece, darla de alta desde el portal o con:
--     CALL "SpPdxMTTOInsertarLinea"(2, 'LÍNEA 9 INY', 0);
-- ============================================================================
SELECT "ID_LINEA", "LINEA", TO_NVARCHAR("PLANTA") AS PLANTA, "PRODUCCION"
FROM "TEST_JUNIO_2026"."PdxMTTOLineasxPlanta"
WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM("LINEA")),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U') = 'LINEA 9 INY'
  AND TO_NVARCHAR("PLANTA") = '2';


-- 3) STAGE POR TABLA: filas a renombrar (con proteccion de colisiones)
-- ============================================================================
-- ----------------------------------------------------------------------------
-- PVC
-- ----------------------------------------------------------------------------
CREATE COLUMN TABLE "TEST_JUNIO_2026"."TMP_NORM_PVC_20261125" AS (
    SELECT DISTINCT
           T."ID_REGISTRO",
           C."LINEA" AS "LINEA_NUEVA",
           REPLACE(T."CLAVE_SYNC", T."LINEA", C."LINEA") AS "CLAVE_NUEVA"
    FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPVC" T
    INNER JOIN (
        SELECT TO_NVARCHAR("PLANTA") AS "PLANTA",
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM("LINEA")),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U') AS "LINEA_NORM",
               MIN("ID_LINEA") AS "ID_LINEA"
        FROM "TEST_JUNIO_2026"."PdxMTTOLineasxPlanta"
        GROUP BY TO_NVARCHAR("PLANTA"), REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM("LINEA")),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U')
    ) CM
      ON CM."PLANTA" = TO_NVARCHAR(T."PLANTA")
     AND CM."LINEA_NORM" = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM(T."LINEA")),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U')
    INNER JOIN "TEST_JUNIO_2026"."PdxMTTOLineasxPlanta" C
      ON C."ID_LINEA" = CM."ID_LINEA"
    LEFT JOIN "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPVC" T2
      ON T2."ID_REGISTRO" <> T."ID_REGISTRO"
     AND T2."CLAVE_SYNC" = REPLACE(T."CLAVE_SYNC", T."LINEA", C."LINEA")
    WHERE T."LINEA" <> C."LINEA"
      AND T2."ID_REGISTRO" IS NULL
);

CREATE COLUMN TABLE "TEST_JUNIO_2026"."TMP_NORM_PVC_SKIP_20261125" AS (
    SELECT DISTINCT
           T."ID_REGISTRO",
           T."LINEA" AS "LINEA_ACTUAL",
           C."LINEA" AS "LINEA_NUEVA",
           T."CLAVE_SYNC" AS "CLAVE_ACTUAL",
           REPLACE(T."CLAVE_SYNC", T."LINEA", C."LINEA") AS "CLAVE_NUEVA"
    FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPVC" T
    INNER JOIN (
        SELECT TO_NVARCHAR("PLANTA") AS "PLANTA",
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM("LINEA")),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U') AS "LINEA_NORM",
               MIN("ID_LINEA") AS "ID_LINEA"
        FROM "TEST_JUNIO_2026"."PdxMTTOLineasxPlanta"
        GROUP BY TO_NVARCHAR("PLANTA"), REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM("LINEA")),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U')
    ) CM
      ON CM."PLANTA" = TO_NVARCHAR(T."PLANTA")
     AND CM."LINEA_NORM" = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM(T."LINEA")),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U')
    INNER JOIN "TEST_JUNIO_2026"."PdxMTTOLineasxPlanta" C
      ON C."ID_LINEA" = CM."ID_LINEA"
    INNER JOIN "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPVC" T2
      ON T2."ID_REGISTRO" <> T."ID_REGISTRO"
     AND T2."CLAVE_SYNC" = REPLACE(T."CLAVE_SYNC", T."LINEA", C."LINEA")
    WHERE T."LINEA" <> C."LINEA"
);

-- ----------------------------------------------------------------------------
-- PEAD
-- ----------------------------------------------------------------------------
CREATE COLUMN TABLE "TEST_JUNIO_2026"."TMP_NORM_PEAD_20261125" AS (
    SELECT DISTINCT
           T."ID_REGISTRO",
           C."LINEA" AS "LINEA_NUEVA",
           REPLACE(T."CLAVE_SYNC", T."LINEA", C."LINEA") AS "CLAVE_NUEVA"
    FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPeadLiso" T
    INNER JOIN (
        SELECT TO_NVARCHAR("PLANTA") AS "PLANTA",
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM("LINEA")),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U') AS "LINEA_NORM",
               MIN("ID_LINEA") AS "ID_LINEA"
        FROM "TEST_JUNIO_2026"."PdxMTTOLineasxPlanta"
        GROUP BY TO_NVARCHAR("PLANTA"), REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM("LINEA")),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U')
    ) CM
      ON CM."PLANTA" = TO_NVARCHAR(T."PLANTA")
     AND CM."LINEA_NORM" = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM(T."LINEA")),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U')
    INNER JOIN "TEST_JUNIO_2026"."PdxMTTOLineasxPlanta" C
      ON C."ID_LINEA" = CM."ID_LINEA"
    LEFT JOIN "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPeadLiso" T2
      ON T2."ID_REGISTRO" <> T."ID_REGISTRO"
     AND T2."CLAVE_SYNC" = REPLACE(T."CLAVE_SYNC", T."LINEA", C."LINEA")
    WHERE T."LINEA" <> C."LINEA"
      AND T2."ID_REGISTRO" IS NULL
);

CREATE COLUMN TABLE "TEST_JUNIO_2026"."TMP_NORM_PEAD_SKIP_20261125" AS (
    SELECT DISTINCT
           T."ID_REGISTRO",
           T."LINEA" AS "LINEA_ACTUAL",
           C."LINEA" AS "LINEA_NUEVA",
           T."CLAVE_SYNC" AS "CLAVE_ACTUAL",
           REPLACE(T."CLAVE_SYNC", T."LINEA", C."LINEA") AS "CLAVE_NUEVA"
    FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPeadLiso" T
    INNER JOIN (
        SELECT TO_NVARCHAR("PLANTA") AS "PLANTA",
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM("LINEA")),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U') AS "LINEA_NORM",
               MIN("ID_LINEA") AS "ID_LINEA"
        FROM "TEST_JUNIO_2026"."PdxMTTOLineasxPlanta"
        GROUP BY TO_NVARCHAR("PLANTA"), REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM("LINEA")),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U')
    ) CM
      ON CM."PLANTA" = TO_NVARCHAR(T."PLANTA")
     AND CM."LINEA_NORM" = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM(T."LINEA")),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U')
    INNER JOIN "TEST_JUNIO_2026"."PdxMTTOLineasxPlanta" C
      ON C."ID_LINEA" = CM."ID_LINEA"
    INNER JOIN "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPeadLiso" T2
      ON T2."ID_REGISTRO" <> T."ID_REGISTRO"
     AND T2."CLAVE_SYNC" = REPLACE(T."CLAVE_SYNC", T."LINEA", C."LINEA")
    WHERE T."LINEA" <> C."LINEA"
);

-- ----------------------------------------------------------------------------
-- CORR
-- ----------------------------------------------------------------------------
CREATE COLUMN TABLE "TEST_JUNIO_2026"."TMP_NORM_CORR_20261125" AS (
    SELECT DISTINCT
           T."ID_REGISTRO",
           C."LINEA" AS "LINEA_NUEVA",
           REPLACE(T."CLAVE_SYNC", T."LINEA", C."LINEA") AS "CLAVE_NUEVA"
    FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionCorrugado" T
    INNER JOIN (
        SELECT TO_NVARCHAR("PLANTA") AS "PLANTA",
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM("LINEA")),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U') AS "LINEA_NORM",
               MIN("ID_LINEA") AS "ID_LINEA"
        FROM "TEST_JUNIO_2026"."PdxMTTOLineasxPlanta"
        GROUP BY TO_NVARCHAR("PLANTA"), REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM("LINEA")),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U')
    ) CM
      ON CM."PLANTA" = TO_NVARCHAR(T."PLANTA")
     AND CM."LINEA_NORM" = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM(T."LINEA")),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U')
    INNER JOIN "TEST_JUNIO_2026"."PdxMTTOLineasxPlanta" C
      ON C."ID_LINEA" = CM."ID_LINEA"
    LEFT JOIN "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionCorrugado" T2
      ON T2."ID_REGISTRO" <> T."ID_REGISTRO"
     AND T2."CLAVE_SYNC" = REPLACE(T."CLAVE_SYNC", T."LINEA", C."LINEA")
    WHERE T."LINEA" <> C."LINEA"
      AND T2."ID_REGISTRO" IS NULL
);

CREATE COLUMN TABLE "TEST_JUNIO_2026"."TMP_NORM_CORR_SKIP_20261125" AS (
    SELECT DISTINCT
           T."ID_REGISTRO",
           T."LINEA" AS "LINEA_ACTUAL",
           C."LINEA" AS "LINEA_NUEVA",
           T."CLAVE_SYNC" AS "CLAVE_ACTUAL",
           REPLACE(T."CLAVE_SYNC", T."LINEA", C."LINEA") AS "CLAVE_NUEVA"
    FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionCorrugado" T
    INNER JOIN (
        SELECT TO_NVARCHAR("PLANTA") AS "PLANTA",
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM("LINEA")),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U') AS "LINEA_NORM",
               MIN("ID_LINEA") AS "ID_LINEA"
        FROM "TEST_JUNIO_2026"."PdxMTTOLineasxPlanta"
        GROUP BY TO_NVARCHAR("PLANTA"), REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM("LINEA")),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U')
    ) CM
      ON CM."PLANTA" = TO_NVARCHAR(T."PLANTA")
     AND CM."LINEA_NORM" = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM(T."LINEA")),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U')
    INNER JOIN "TEST_JUNIO_2026"."PdxMTTOLineasxPlanta" C
      ON C."ID_LINEA" = CM."ID_LINEA"
    INNER JOIN "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionCorrugado" T2
      ON T2."ID_REGISTRO" <> T."ID_REGISTRO"
     AND T2."CLAVE_SYNC" = REPLACE(T."CLAVE_SYNC", T."LINEA", C."LINEA")
    WHERE T."LINEA" <> C."LINEA"
);

-- ----------------------------------------------------------------------------
-- INY
-- ----------------------------------------------------------------------------
CREATE COLUMN TABLE "TEST_JUNIO_2026"."TMP_NORM_INY_20261125" AS (
    SELECT DISTINCT
           T."ID_REGISTRO",
           C."LINEA" AS "LINEA_NUEVA",
           REPLACE(T."CLAVE_SYNC", T."LINEA", C."LINEA") AS "CLAVE_NUEVA"
    FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionINY" T
    INNER JOIN (
        SELECT TO_NVARCHAR("PLANTA") AS "PLANTA",
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM("LINEA")),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U') AS "LINEA_NORM",
               MIN("ID_LINEA") AS "ID_LINEA"
        FROM "TEST_JUNIO_2026"."PdxMTTOLineasxPlanta"
        GROUP BY TO_NVARCHAR("PLANTA"), REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM("LINEA")),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U')
    ) CM
      ON CM."PLANTA" = TO_NVARCHAR(T."PLANTA")
     AND CM."LINEA_NORM" = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM(T."LINEA")),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U')
    INNER JOIN "TEST_JUNIO_2026"."PdxMTTOLineasxPlanta" C
      ON C."ID_LINEA" = CM."ID_LINEA"
    LEFT JOIN "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionINY" T2
      ON T2."ID_REGISTRO" <> T."ID_REGISTRO"
     AND T2."CLAVE_SYNC" = REPLACE(T."CLAVE_SYNC", T."LINEA", C."LINEA")
    WHERE T."LINEA" <> C."LINEA"
      AND T2."ID_REGISTRO" IS NULL
);

CREATE COLUMN TABLE "TEST_JUNIO_2026"."TMP_NORM_INY_SKIP_20261125" AS (
    SELECT DISTINCT
           T."ID_REGISTRO",
           T."LINEA" AS "LINEA_ACTUAL",
           C."LINEA" AS "LINEA_NUEVA",
           T."CLAVE_SYNC" AS "CLAVE_ACTUAL",
           REPLACE(T."CLAVE_SYNC", T."LINEA", C."LINEA") AS "CLAVE_NUEVA"
    FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionINY" T
    INNER JOIN (
        SELECT TO_NVARCHAR("PLANTA") AS "PLANTA",
               REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM("LINEA")),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U') AS "LINEA_NORM",
               MIN("ID_LINEA") AS "ID_LINEA"
        FROM "TEST_JUNIO_2026"."PdxMTTOLineasxPlanta"
        GROUP BY TO_NVARCHAR("PLANTA"), REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM("LINEA")),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U')
    ) CM
      ON CM."PLANTA" = TO_NVARCHAR(T."PLANTA")
     AND CM."LINEA_NORM" = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM(T."LINEA")),'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U')
    INNER JOIN "TEST_JUNIO_2026"."PdxMTTOLineasxPlanta" C
      ON C."ID_LINEA" = CM."ID_LINEA"
    INNER JOIN "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionINY" T2
      ON T2."ID_REGISTRO" <> T."ID_REGISTRO"
     AND T2."CLAVE_SYNC" = REPLACE(T."CLAVE_SYNC", T."LINEA", C."LINEA")
    WHERE T."LINEA" <> C."LINEA"
);

-- ============================================================================
-- 3c) CHEQUEO: claves nuevas repetidas dentro del stage (debe salir vacio).
--     Si salen filas, NO ejecutar el MERGE: habria dos filas con la misma clave.
-- ============================================================================
SELECT 'PVC' AS PROCESO, "CLAVE_NUEVA", COUNT(*) AS VECES
FROM "TEST_JUNIO_2026"."TMP_NORM_PVC_20261125"
GROUP BY "CLAVE_NUEVA"
HAVING COUNT(*) > 1
UNION ALL
SELECT 'PEAD' AS PROCESO, "CLAVE_NUEVA", COUNT(*) AS VECES
FROM "TEST_JUNIO_2026"."TMP_NORM_PEAD_20261125"
GROUP BY "CLAVE_NUEVA"
HAVING COUNT(*) > 1
UNION ALL
SELECT 'CORR' AS PROCESO, "CLAVE_NUEVA", COUNT(*) AS VECES
FROM "TEST_JUNIO_2026"."TMP_NORM_CORR_20261125"
GROUP BY "CLAVE_NUEVA"
HAVING COUNT(*) > 1
UNION ALL
SELECT 'INY' AS PROCESO, "CLAVE_NUEVA", COUNT(*) AS VECES
FROM "TEST_JUNIO_2026"."TMP_NORM_INY_20261125"
GROUP BY "CLAVE_NUEVA"
HAVING COUNT(*) > 1
ORDER BY PROCESO;


-- ============================================================================
-- 4) MERGE: renombrar LINEA y CLAVE_SYNC
-- ============================================================================
MERGE INTO "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPVC" T
USING "TEST_JUNIO_2026"."TMP_NORM_PVC_20261125" S
ON T."ID_REGISTRO" = S."ID_REGISTRO"
WHEN MATCHED THEN UPDATE SET
    T."LINEA"               = S."LINEA_NUEVA",
    T."CLAVE_SYNC"          = S."CLAVE_NUEVA",
    T."FECHA_ACTUALIZACION" = CURRENT_TIMESTAMP;

MERGE INTO "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPeadLiso" T
USING "TEST_JUNIO_2026"."TMP_NORM_PEAD_20261125" S
ON T."ID_REGISTRO" = S."ID_REGISTRO"
WHEN MATCHED THEN UPDATE SET
    T."LINEA"               = S."LINEA_NUEVA",
    T."CLAVE_SYNC"          = S."CLAVE_NUEVA",
    T."FECHA_ACTUALIZACION" = CURRENT_TIMESTAMP;

MERGE INTO "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionCorrugado" T
USING "TEST_JUNIO_2026"."TMP_NORM_CORR_20261125" S
ON T."ID_REGISTRO" = S."ID_REGISTRO"
WHEN MATCHED THEN UPDATE SET
    T."LINEA"               = S."LINEA_NUEVA",
    T."CLAVE_SYNC"          = S."CLAVE_NUEVA",
    T."FECHA_ACTUALIZACION" = CURRENT_TIMESTAMP;

MERGE INTO "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionINY" T
USING "TEST_JUNIO_2026"."TMP_NORM_INY_20261125" S
ON T."ID_REGISTRO" = S."ID_REGISTRO"
WHEN MATCHED THEN UPDATE SET
    T."LINEA"               = S."LINEA_NUEVA",
    T."CLAVE_SYNC"          = S."CLAVE_NUEVA",
    T."FECHA_ACTUALIZACION" = CURRENT_TIMESTAMP;

-- ============================================================================
-- 5) REPORTE: renombradas y omitidas por colision
-- ============================================================================
SELECT 'PVC'  AS PROCESO, COUNT(*) AS RENOMBRADAS FROM "TEST_JUNIO_2026"."TMP_NORM_PVC_20261125"
UNION ALL
SELECT 'PEAD', COUNT(*) FROM "TEST_JUNIO_2026"."TMP_NORM_PEAD_20261125"
UNION ALL
SELECT 'CORR', COUNT(*) FROM "TEST_JUNIO_2026"."TMP_NORM_CORR_20261125"
UNION ALL
SELECT 'INY',  COUNT(*) FROM "TEST_JUNIO_2026"."TMP_NORM_INY_20261125"
ORDER BY PROCESO;

SELECT 'PVC'  AS PROCESO, COUNT(*) AS OMITIDAS FROM "TEST_JUNIO_2026"."TMP_NORM_PVC_SKIP_20261125"
UNION ALL
SELECT 'PEAD', COUNT(*) FROM "TEST_JUNIO_2026"."TMP_NORM_PEAD_SKIP_20261125"
UNION ALL
SELECT 'CORR', COUNT(*) FROM "TEST_JUNIO_2026"."TMP_NORM_CORR_SKIP_20261125"
UNION ALL
SELECT 'INY',  COUNT(*) FROM "TEST_JUNIO_2026"."TMP_NORM_INY_SKIP_20261125"
ORDER BY PROCESO;


-- ============================================================================
-- 6) ANTES (respaldo) vs DESPUES (tabla) por nombre de linea
-- ============================================================================
SELECT 'PVC' AS PROCESO, 'ANTES' AS MOMENTO, "LINEA", COUNT(*) AS FILAS,
       ROUND(SUM(IFNULL("HORAS_PROGRAMADAS", 0)), 2) AS HORAS_PROGRAMADAS,
       ROUND(SUM(IFNULL("TIEMPO_DISPONIBLE", 0)), 2) AS TIEMPO_DISPONIBLE
FROM "TEST_JUNIO_2026"."TMP_BAK_NORM_PVC_20261125"
GROUP BY "LINEA"
UNION ALL
SELECT 'PVC', 'DESPUES', "LINEA", COUNT(*),
       ROUND(SUM(IFNULL("HORAS_PROGRAMADAS", 0)), 2),
       ROUND(SUM(IFNULL("TIEMPO_DISPONIBLE", 0)), 2)
FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPVC"
GROUP BY "LINEA"
ORDER BY MOMENTO, "LINEA";

SELECT 'PEAD' AS PROCESO, 'ANTES' AS MOMENTO, "LINEA", COUNT(*) AS FILAS,
       ROUND(SUM(IFNULL("HORAS_PROGRAMADAS", 0)), 2) AS HORAS_PROGRAMADAS,
       ROUND(SUM(IFNULL("TIEMPO_DISPONIBLE", 0)), 2) AS TIEMPO_DISPONIBLE
FROM "TEST_JUNIO_2026"."TMP_BAK_NORM_PEAD_20261125"
GROUP BY "LINEA"
UNION ALL
SELECT 'PEAD', 'DESPUES', "LINEA", COUNT(*),
       ROUND(SUM(IFNULL("HORAS_PROGRAMADAS", 0)), 2),
       ROUND(SUM(IFNULL("TIEMPO_DISPONIBLE", 0)), 2)
FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPeadLiso"
GROUP BY "LINEA"
ORDER BY MOMENTO, "LINEA";

SELECT 'CORR' AS PROCESO, 'ANTES' AS MOMENTO, "LINEA", COUNT(*) AS FILAS,
       ROUND(SUM(IFNULL("HORAS_PROGRAMADAS", 0)), 2) AS HORAS_PROGRAMADAS,
       ROUND(SUM(IFNULL("TIEMPO_DISPONIBLE", 0)), 2) AS TIEMPO_DISPONIBLE
FROM "TEST_JUNIO_2026"."TMP_BAK_NORM_CORR_20261125"
GROUP BY "LINEA"
UNION ALL
SELECT 'CORR', 'DESPUES', "LINEA", COUNT(*),
       ROUND(SUM(IFNULL("HORAS_PROGRAMADAS", 0)), 2),
       ROUND(SUM(IFNULL("TIEMPO_DISPONIBLE", 0)), 2)
FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionCorrugado"
GROUP BY "LINEA"
ORDER BY MOMENTO, "LINEA";

SELECT 'INY' AS PROCESO, 'ANTES' AS MOMENTO, "LINEA", COUNT(*) AS FILAS,
       ROUND(SUM(IFNULL("HORAS_PROGRAMADAS", 0)), 2) AS HORAS_PROGRAMADAS,
       ROUND(SUM(IFNULL("TIEMPO_DISPONIBLE", 0)), 2) AS TIEMPO_DISPONIBLE
FROM "TEST_JUNIO_2026"."TMP_BAK_NORM_INY_20261125"
GROUP BY "LINEA"
UNION ALL
SELECT 'INY', 'DESPUES', "LINEA", COUNT(*),
       ROUND(SUM(IFNULL("HORAS_PROGRAMADAS", 0)), 2),
       ROUND(SUM(IFNULL("TIEMPO_DISPONIBLE", 0)), 2)
FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionINY"
GROUP BY "LINEA"
ORDER BY MOMENTO, "LINEA";

-- ============================================================================
-- 7) VERIFICACION FINAL: lineas distintas por tabla (deben coincidir con el catalogo)
-- ============================================================================
SELECT 'PVC' AS PROCESO, "LINEA", COUNT(*) AS FILAS
FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPVC"
GROUP BY "LINEA"
ORDER BY "LINEA";

SELECT 'PEAD' AS PROCESO, "LINEA", COUNT(*) AS FILAS
FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPeadLiso"
GROUP BY "LINEA"
ORDER BY "LINEA";

SELECT 'CORR' AS PROCESO, "LINEA", COUNT(*) AS FILAS
FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionCorrugado"
GROUP BY "LINEA"
ORDER BY "LINEA";

SELECT 'INY' AS PROCESO, "LINEA", COUNT(*) AS FILAS
FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionINY"
GROUP BY "LINEA"
ORDER BY "LINEA";

-- ============================================================================
-- 8) CHEQUEO: claves que no contienen el nombre de la linea (debe salir 0)
--    Si alguna no lo contiene, revisarla antes de seguir.
-- ============================================================================
SELECT 'PVC' AS PROCESO, COUNT(*) AS CLAVES_SIN_LINEA
FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPVC"
WHERE "CLAVE_SYNC" IS NOT NULL
  AND LOCATE("LINEA", "CLAVE_SYNC") = 0
UNION ALL
SELECT 'PEAD' AS PROCESO, COUNT(*) AS CLAVES_SIN_LINEA
FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPeadLiso"
WHERE "CLAVE_SYNC" IS NOT NULL
  AND LOCATE("LINEA", "CLAVE_SYNC") = 0
UNION ALL
SELECT 'CORR' AS PROCESO, COUNT(*) AS CLAVES_SIN_LINEA
FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionCorrugado"
WHERE "CLAVE_SYNC" IS NOT NULL
  AND LOCATE("LINEA", "CLAVE_SYNC") = 0
UNION ALL
SELECT 'INY' AS PROCESO, COUNT(*) AS CLAVES_SIN_LINEA
FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionINY"
WHERE "CLAVE_SYNC" IS NOT NULL
  AND LOCATE("LINEA", "CLAVE_SYNC") = 0
ORDER BY PROCESO;


-- ============================================================================
-- NOTAS
-- - La fila vacia del 22/11 se conserva (no se borra nada).
-- - Si la tabla *_SKIP trae filas, NO se renombraron por colision de CLAVE_SYNC:
--   revisarlas antes de cualquier accion manual.
-- - Despues de aplicar, pedir a los usuarios recargar el portal (Ctrl+F5).
-- ============================================================================
