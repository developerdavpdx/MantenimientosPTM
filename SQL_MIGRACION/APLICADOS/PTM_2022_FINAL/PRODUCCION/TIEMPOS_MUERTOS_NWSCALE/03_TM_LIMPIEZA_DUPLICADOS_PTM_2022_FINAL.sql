-- ============================================================================
-- 03 - LIMPIEZA DE DUPLICADOS Y FILAS VACIAS
-- Schema: PTM_2022_FINAL (HANA on-premise)
-- Fecha: 2026-11-17
--
-- REQUISITO: haber ejecutado 00 (respaldo), 01 (columnas/backfill) y revisado
--            02 (reporte).
--
-- REGLA:
--   * Se conserva la fila con el ID_REGISTRO MENOR de cada CLAVE_SYNC.
--   * Antes de borrar, se FUSIONAN las listas OTMC / OTMP / ID_PARO
--     (distintas) dentro de la fila que se conserva. Asi no se pierde nada.
--   * Las horas y demas campos numericos se conservan tal como estan en la
--     fila superviviente (no se suman).
--   * Las filas SIN_ORIGEN (vacias) se eliminan en la seccion final.
--
-- OJO: Si en el reporte (02) una fila SIN_ORIGEN trae horas capturadas,
--   NO ejecutar la ultima seccion y revisarla manualmente.
-- ============================================================================

SET SCHEMA "PTM_2022_FINAL";

-- ============================================================================
-- 1) PVC
-- ============================================================================
MERGE INTO "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC" T
USING (
    SELECT K."ID_SURVIVOR",
           '["' || STRING_AGG(K.V, '","' ORDER BY K.V) || '"]' AS OTMC_NEW
    FROM (
        SELECT DISTINCT D."ID_SURVIVOR",
               REPLACE(TRIM(SUBSTRING_REGEXPR('"[^"]+"' IN X."OTMC" OCCURRENCE S.ELEMENT_NUMBER)), '"', '') AS V
        FROM (
            SELECT "CLAVE_SYNC", MIN("ID_REGISTRO") AS "ID_SURVIVOR"
            FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC"
            WHERE "CLAVE_SYNC" IS NOT NULL AND "CLAVE_SYNC" <> ''
            GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
        ) D
        JOIN "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC" X ON X."CLAVE_SYNC" = D."CLAVE_SYNC"
        CROSS JOIN SERIES_GENERATE_INTEGER(1, 1, 500) S
        WHERE X."OTMC" IS NOT NULL
          AND S.ELEMENT_NUMBER <= OCCURRENCES_REGEXPR('"[^"]+"' IN X."OTMC")
    ) K
    GROUP BY K."ID_SURVIVOR"
) M
ON T."ID_REGISTRO" = M."ID_SURVIVOR"
WHEN MATCHED THEN UPDATE SET T."OTMC" = M.OTMC_NEW;

MERGE INTO "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC" T
USING (
    SELECT K."ID_SURVIVOR",
           '["' || STRING_AGG(K.V, '","' ORDER BY K.V) || '"]' AS OTMP_NEW
    FROM (
        SELECT DISTINCT D."ID_SURVIVOR",
               REPLACE(TRIM(SUBSTRING_REGEXPR('"[^"]+"' IN X."OTMP" OCCURRENCE S.ELEMENT_NUMBER)), '"', '') AS V
        FROM (
            SELECT "CLAVE_SYNC", MIN("ID_REGISTRO") AS "ID_SURVIVOR"
            FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC"
            WHERE "CLAVE_SYNC" IS NOT NULL AND "CLAVE_SYNC" <> ''
            GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
        ) D
        JOIN "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC" X ON X."CLAVE_SYNC" = D."CLAVE_SYNC"
        CROSS JOIN SERIES_GENERATE_INTEGER(1, 1, 500) S
        WHERE X."OTMP" IS NOT NULL
          AND S.ELEMENT_NUMBER <= OCCURRENCES_REGEXPR('"[^"]+"' IN X."OTMP")
    ) K
    GROUP BY K."ID_SURVIVOR"
) M
ON T."ID_REGISTRO" = M."ID_SURVIVOR"
WHEN MATCHED THEN UPDATE SET T."OTMP" = M.OTMP_NEW;

MERGE INTO "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC" T
USING (
    SELECT K."ID_SURVIVOR",
           STRING_AGG(K.V, '|' ORDER BY K.V) AS PARO_NEW
    FROM (
        SELECT DISTINCT D."ID_SURVIVOR",
               TRIM(SUBSTRING_REGEXPR('[^|]+' IN X."ID_PARO" OCCURRENCE S.ELEMENT_NUMBER)) AS V
        FROM (
            SELECT "CLAVE_SYNC", MIN("ID_REGISTRO") AS "ID_SURVIVOR"
            FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC"
            WHERE "CLAVE_SYNC" IS NOT NULL AND "CLAVE_SYNC" <> ''
            GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
        ) D
        JOIN "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC" X ON X."CLAVE_SYNC" = D."CLAVE_SYNC"
        CROSS JOIN SERIES_GENERATE_INTEGER(1, 1, 500) S
        WHERE X."ID_PARO" IS NOT NULL
          AND S.ELEMENT_NUMBER <= OCCURRENCES_REGEXPR('[^|]+' IN X."ID_PARO")
    ) K
    GROUP BY K."ID_SURVIVOR"
) M
ON T."ID_REGISTRO" = M."ID_SURVIVOR"
WHEN MATCHED THEN UPDATE SET T."ID_PARO" = M.PARO_NEW;

DELETE FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC"
WHERE "ID_REGISTRO" IN (
    SELECT X."ID_REGISTRO"
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC" X
    WHERE X."CLAVE_SYNC" IN (
        SELECT "CLAVE_SYNC" FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC"
        GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
    )
    AND X."ID_REGISTRO" <> (
        SELECT MIN(Y."ID_REGISTRO")
        FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC" Y
        WHERE Y."CLAVE_SYNC" = X."CLAVE_SYNC"
    )
);

-- ============================================================================
-- 2) INY
-- ============================================================================
MERGE INTO "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY" T
USING (
    SELECT K."ID_SURVIVOR",
           '["' || STRING_AGG(K.V, '","' ORDER BY K.V) || '"]' AS OTMC_NEW
    FROM (
        SELECT DISTINCT D."ID_SURVIVOR",
               REPLACE(TRIM(SUBSTRING_REGEXPR('"[^"]+"' IN X."OTMC" OCCURRENCE S.ELEMENT_NUMBER)), '"', '') AS V
        FROM (
            SELECT "CLAVE_SYNC", MIN("ID_REGISTRO") AS "ID_SURVIVOR"
            FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY"
            WHERE "CLAVE_SYNC" IS NOT NULL AND "CLAVE_SYNC" <> ''
            GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
        ) D
        JOIN "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY" X ON X."CLAVE_SYNC" = D."CLAVE_SYNC"
        CROSS JOIN SERIES_GENERATE_INTEGER(1, 1, 500) S
        WHERE X."OTMC" IS NOT NULL
          AND S.ELEMENT_NUMBER <= OCCURRENCES_REGEXPR('"[^"]+"' IN X."OTMC")
    ) K
    GROUP BY K."ID_SURVIVOR"
) M
ON T."ID_REGISTRO" = M."ID_SURVIVOR"
WHEN MATCHED THEN UPDATE SET T."OTMC" = M.OTMC_NEW;

MERGE INTO "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY" T
USING (
    SELECT K."ID_SURVIVOR",
           '["' || STRING_AGG(K.V, '","' ORDER BY K.V) || '"]' AS OTMP_NEW
    FROM (
        SELECT DISTINCT D."ID_SURVIVOR",
               REPLACE(TRIM(SUBSTRING_REGEXPR('"[^"]+"' IN X."OTMP" OCCURRENCE S.ELEMENT_NUMBER)), '"', '') AS V
        FROM (
            SELECT "CLAVE_SYNC", MIN("ID_REGISTRO") AS "ID_SURVIVOR"
            FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY"
            WHERE "CLAVE_SYNC" IS NOT NULL AND "CLAVE_SYNC" <> ''
            GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
        ) D
        JOIN "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY" X ON X."CLAVE_SYNC" = D."CLAVE_SYNC"
        CROSS JOIN SERIES_GENERATE_INTEGER(1, 1, 500) S
        WHERE X."OTMP" IS NOT NULL
          AND S.ELEMENT_NUMBER <= OCCURRENCES_REGEXPR('"[^"]+"' IN X."OTMP")
    ) K
    GROUP BY K."ID_SURVIVOR"
) M
ON T."ID_REGISTRO" = M."ID_SURVIVOR"
WHEN MATCHED THEN UPDATE SET T."OTMP" = M.OTMP_NEW;

MERGE INTO "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY" T
USING (
    SELECT K."ID_SURVIVOR",
           STRING_AGG(K.V, '|' ORDER BY K.V) AS PARO_NEW
    FROM (
        SELECT DISTINCT D."ID_SURVIVOR",
               TRIM(SUBSTRING_REGEXPR('[^|]+' IN X."ID_PARO" OCCURRENCE S.ELEMENT_NUMBER)) AS V
        FROM (
            SELECT "CLAVE_SYNC", MIN("ID_REGISTRO") AS "ID_SURVIVOR"
            FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY"
            WHERE "CLAVE_SYNC" IS NOT NULL AND "CLAVE_SYNC" <> ''
            GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
        ) D
        JOIN "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY" X ON X."CLAVE_SYNC" = D."CLAVE_SYNC"
        CROSS JOIN SERIES_GENERATE_INTEGER(1, 1, 500) S
        WHERE X."ID_PARO" IS NOT NULL
          AND S.ELEMENT_NUMBER <= OCCURRENCES_REGEXPR('[^|]+' IN X."ID_PARO")
    ) K
    GROUP BY K."ID_SURVIVOR"
) M
ON T."ID_REGISTRO" = M."ID_SURVIVOR"
WHEN MATCHED THEN UPDATE SET T."ID_PARO" = M.PARO_NEW;

DELETE FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY"
WHERE "ID_REGISTRO" IN (
    SELECT X."ID_REGISTRO"
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY" X
    WHERE X."CLAVE_SYNC" IN (
        SELECT "CLAVE_SYNC" FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY"
        GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
    )
    AND X."ID_REGISTRO" <> (
        SELECT MIN(Y."ID_REGISTRO")
        FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY" Y
        WHERE Y."CLAVE_SYNC" = X."CLAVE_SYNC"
    )
);

-- ============================================================================
-- 3) CORRUGADO
-- ============================================================================
MERGE INTO "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionCorrugado" T
USING (
    SELECT K."ID_SURVIVOR",
           '["' || STRING_AGG(K.V, '","' ORDER BY K.V) || '"]' AS OTMC_NEW
    FROM (
        SELECT DISTINCT D."ID_SURVIVOR",
               REPLACE(TRIM(SUBSTRING_REGEXPR('"[^"]+"' IN X."OTMC" OCCURRENCE S.ELEMENT_NUMBER)), '"', '') AS V
        FROM (
            SELECT "CLAVE_SYNC", MIN("ID_REGISTRO") AS "ID_SURVIVOR"
            FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionCorrugado"
            WHERE "CLAVE_SYNC" IS NOT NULL AND "CLAVE_SYNC" <> ''
            GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
        ) D
        JOIN "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionCorrugado" X ON X."CLAVE_SYNC" = D."CLAVE_SYNC"
        CROSS JOIN SERIES_GENERATE_INTEGER(1, 1, 500) S
        WHERE X."OTMC" IS NOT NULL
          AND S.ELEMENT_NUMBER <= OCCURRENCES_REGEXPR('"[^"]+"' IN X."OTMC")
    ) K
    GROUP BY K."ID_SURVIVOR"
) M
ON T."ID_REGISTRO" = M."ID_SURVIVOR"
WHEN MATCHED THEN UPDATE SET T."OTMC" = M.OTMC_NEW;

MERGE INTO "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionCorrugado" T
USING (
    SELECT K."ID_SURVIVOR",
           '["' || STRING_AGG(K.V, '","' ORDER BY K.V) || '"]' AS OTMP_NEW
    FROM (
        SELECT DISTINCT D."ID_SURVIVOR",
               REPLACE(TRIM(SUBSTRING_REGEXPR('"[^"]+"' IN X."OTMP" OCCURRENCE S.ELEMENT_NUMBER)), '"', '') AS V
        FROM (
            SELECT "CLAVE_SYNC", MIN("ID_REGISTRO") AS "ID_SURVIVOR"
            FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionCorrugado"
            WHERE "CLAVE_SYNC" IS NOT NULL AND "CLAVE_SYNC" <> ''
            GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
        ) D
        JOIN "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionCorrugado" X ON X."CLAVE_SYNC" = D."CLAVE_SYNC"
        CROSS JOIN SERIES_GENERATE_INTEGER(1, 1, 500) S
        WHERE X."OTMP" IS NOT NULL
          AND S.ELEMENT_NUMBER <= OCCURRENCES_REGEXPR('"[^"]+"' IN X."OTMP")
    ) K
    GROUP BY K."ID_SURVIVOR"
) M
ON T."ID_REGISTRO" = M."ID_SURVIVOR"
WHEN MATCHED THEN UPDATE SET T."OTMP" = M.OTMP_NEW;

MERGE INTO "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionCorrugado" T
USING (
    SELECT K."ID_SURVIVOR",
           STRING_AGG(K.V, '|' ORDER BY K.V) AS PARO_NEW
    FROM (
        SELECT DISTINCT D."ID_SURVIVOR",
               TRIM(SUBSTRING_REGEXPR('[^|]+' IN X."ID_PARO" OCCURRENCE S.ELEMENT_NUMBER)) AS V
        FROM (
            SELECT "CLAVE_SYNC", MIN("ID_REGISTRO") AS "ID_SURVIVOR"
            FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionCorrugado"
            WHERE "CLAVE_SYNC" IS NOT NULL AND "CLAVE_SYNC" <> ''
            GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
        ) D
        JOIN "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionCorrugado" X ON X."CLAVE_SYNC" = D."CLAVE_SYNC"
        CROSS JOIN SERIES_GENERATE_INTEGER(1, 1, 500) S
        WHERE X."ID_PARO" IS NOT NULL
          AND S.ELEMENT_NUMBER <= OCCURRENCES_REGEXPR('[^|]+' IN X."ID_PARO")
    ) K
    GROUP BY K."ID_SURVIVOR"
) M
ON T."ID_REGISTRO" = M."ID_SURVIVOR"
WHEN MATCHED THEN UPDATE SET T."ID_PARO" = M.PARO_NEW;

DELETE FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionCorrugado"
WHERE "ID_REGISTRO" IN (
    SELECT X."ID_REGISTRO"
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionCorrugado" X
    WHERE X."CLAVE_SYNC" IN (
        SELECT "CLAVE_SYNC" FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionCorrugado"
        GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
    )
    AND X."ID_REGISTRO" <> (
        SELECT MIN(Y."ID_REGISTRO")
        FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionCorrugado" Y
        WHERE Y."CLAVE_SYNC" = X."CLAVE_SYNC"
    )
);

-- ============================================================================
-- 4) PEAD LISO
-- ============================================================================
MERGE INTO "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPeadLiso" T
USING (
    SELECT K."ID_SURVIVOR",
           '["' || STRING_AGG(K.V, '","' ORDER BY K.V) || '"]' AS OTMC_NEW
    FROM (
        SELECT DISTINCT D."ID_SURVIVOR",
               REPLACE(TRIM(SUBSTRING_REGEXPR('"[^"]+"' IN X."OTMC" OCCURRENCE S.ELEMENT_NUMBER)), '"', '') AS V
        FROM (
            SELECT "CLAVE_SYNC", MIN("ID_REGISTRO") AS "ID_SURVIVOR"
            FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPeadLiso"
            WHERE "CLAVE_SYNC" IS NOT NULL AND "CLAVE_SYNC" <> ''
            GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
        ) D
        JOIN "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPeadLiso" X ON X."CLAVE_SYNC" = D."CLAVE_SYNC"
        CROSS JOIN SERIES_GENERATE_INTEGER(1, 1, 500) S
        WHERE X."OTMC" IS NOT NULL
          AND S.ELEMENT_NUMBER <= OCCURRENCES_REGEXPR('"[^"]+"' IN X."OTMC")
    ) K
    GROUP BY K."ID_SURVIVOR"
) M
ON T."ID_REGISTRO" = M."ID_SURVIVOR"
WHEN MATCHED THEN UPDATE SET T."OTMC" = M.OTMC_NEW;

MERGE INTO "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPeadLiso" T
USING (
    SELECT K."ID_SURVIVOR",
           '["' || STRING_AGG(K.V, '","' ORDER BY K.V) || '"]' AS OTMP_NEW
    FROM (
        SELECT DISTINCT D."ID_SURVIVOR",
               REPLACE(TRIM(SUBSTRING_REGEXPR('"[^"]+"' IN X."OTMP" OCCURRENCE S.ELEMENT_NUMBER)), '"', '') AS V
        FROM (
            SELECT "CLAVE_SYNC", MIN("ID_REGISTRO") AS "ID_SURVIVOR"
            FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPeadLiso"
            WHERE "CLAVE_SYNC" IS NOT NULL AND "CLAVE_SYNC" <> ''
            GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
        ) D
        JOIN "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPeadLiso" X ON X."CLAVE_SYNC" = D."CLAVE_SYNC"
        CROSS JOIN SERIES_GENERATE_INTEGER(1, 1, 500) S
        WHERE X."OTMP" IS NOT NULL
          AND S.ELEMENT_NUMBER <= OCCURRENCES_REGEXPR('"[^"]+"' IN X."OTMP")
    ) K
    GROUP BY K."ID_SURVIVOR"
) M
ON T."ID_REGISTRO" = M."ID_SURVIVOR"
WHEN MATCHED THEN UPDATE SET T."OTMP" = M.OTMP_NEW;

MERGE INTO "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPeadLiso" T
USING (
    SELECT K."ID_SURVIVOR",
           STRING_AGG(K.V, '|' ORDER BY K.V) AS PARO_NEW
    FROM (
        SELECT DISTINCT D."ID_SURVIVOR",
               TRIM(SUBSTRING_REGEXPR('[^|]+' IN X."ID_PARO" OCCURRENCE S.ELEMENT_NUMBER)) AS V
        FROM (
            SELECT "CLAVE_SYNC", MIN("ID_REGISTRO") AS "ID_SURVIVOR"
            FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPeadLiso"
            WHERE "CLAVE_SYNC" IS NOT NULL AND "CLAVE_SYNC" <> ''
            GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
        ) D
        JOIN "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPeadLiso" X ON X."CLAVE_SYNC" = D."CLAVE_SYNC"
        CROSS JOIN SERIES_GENERATE_INTEGER(1, 1, 500) S
        WHERE X."ID_PARO" IS NOT NULL
          AND S.ELEMENT_NUMBER <= OCCURRENCES_REGEXPR('[^|]+' IN X."ID_PARO")
    ) K
    GROUP BY K."ID_SURVIVOR"
) M
ON T."ID_REGISTRO" = M."ID_SURVIVOR"
WHEN MATCHED THEN UPDATE SET T."ID_PARO" = M.PARO_NEW;

DELETE FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPeadLiso"
WHERE "ID_REGISTRO" IN (
    SELECT X."ID_REGISTRO"
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPeadLiso" X
    WHERE X."CLAVE_SYNC" IN (
        SELECT "CLAVE_SYNC" FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPeadLiso"
        GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
    )
    AND X."ID_REGISTRO" <> (
        SELECT MIN(Y."ID_REGISTRO")
        FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPeadLiso" Y
        WHERE Y."CLAVE_SYNC" = X."CLAVE_SYNC"
    )
);

-- ============================================================================
-- 5) FILAS VACIAS (SIN_ORIGEN)
-- OJO: Revisar la seccion 4 del reporte 02 antes de ejecutar esto.
-- ============================================================================
DELETE FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC"
WHERE "ORIGEN" = 'SIN_ORIGEN';

DELETE FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY"
WHERE "ORIGEN" = 'SIN_ORIGEN';

DELETE FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionCorrugado"
WHERE "ORIGEN" = 'SIN_ORIGEN';

DELETE FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPeadLiso"
WHERE "ORIGEN" = 'SIN_ORIGEN';

-- ============================================================================
-- 6) VERIFICACION FINAL: debe devolver 0 duplicados en las 4 tablas
-- ============================================================================
SELECT 'PVC' AS TABLA, COUNT(*) AS DUPLICADOS FROM (
    SELECT "CLAVE_SYNC" FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC"
    GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
)
UNION ALL
SELECT 'INY', COUNT(*) FROM (
    SELECT "CLAVE_SYNC" FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY"
    GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
)
UNION ALL
SELECT 'CORRUGADO', COUNT(*) FROM (
    SELECT "CLAVE_SYNC" FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionCorrugado"
    GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
)
UNION ALL
SELECT 'PEADLISO', COUNT(*) FROM (
    SELECT "CLAVE_SYNC" FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPeadLiso"
    GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
);
