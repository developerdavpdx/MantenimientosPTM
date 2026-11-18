-- ============================================================================
-- 03 - LIMPIEZA DE DUPLICADOS Y FILAS VACIAS
-- Schema: TEST_JUNIO_2026 (HANA on-premise)
-- Fecha: 2026-11-18
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

SET SCHEMA "TEST_JUNIO_2026";

-- ============================================================================
-- 1) PVC
-- ============================================================================
MERGE INTO "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPVC" T
USING (
    SELECT K."ID_SURVIVOR",
           '["' || STRING_AGG(K.V, '","' ORDER BY K.V) || '"]' AS OTMC_NEW
    FROM (
        SELECT DISTINCT D."ID_SURVIVOR",
               REPLACE(TRIM(SUBSTRING_REGEXPR('"[^"]+"' IN X."OTMC" OCCURRENCE S.ELEMENT_NUMBER)), '"', '') AS V
        FROM (
            SELECT "CLAVE_SYNC", MIN("ID_REGISTRO") AS "ID_SURVIVOR"
            FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPVC"
            WHERE "CLAVE_SYNC" IS NOT NULL AND "CLAVE_SYNC" <> ''
            GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
        ) D
        JOIN "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPVC" X ON X."CLAVE_SYNC" = D."CLAVE_SYNC"
        CROSS JOIN SERIES_GENERATE_INTEGER(1, 1, 500) S
        WHERE X."OTMC" IS NOT NULL
          AND S.ELEMENT_NUMBER <= OCCURRENCES_REGEXPR('"[^"]+"' IN X."OTMC")
    ) K
    GROUP BY K."ID_SURVIVOR"
) M
ON T."ID_REGISTRO" = M."ID_SURVIVOR"
WHEN MATCHED THEN UPDATE SET T."OTMC" = M.OTMC_NEW;

MERGE INTO "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPVC" T
USING (
    SELECT K."ID_SURVIVOR",
           '["' || STRING_AGG(K.V, '","' ORDER BY K.V) || '"]' AS OTMP_NEW
    FROM (
        SELECT DISTINCT D."ID_SURVIVOR",
               REPLACE(TRIM(SUBSTRING_REGEXPR('"[^"]+"' IN X."OTMP" OCCURRENCE S.ELEMENT_NUMBER)), '"', '') AS V
        FROM (
            SELECT "CLAVE_SYNC", MIN("ID_REGISTRO") AS "ID_SURVIVOR"
            FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPVC"
            WHERE "CLAVE_SYNC" IS NOT NULL AND "CLAVE_SYNC" <> ''
            GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
        ) D
        JOIN "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPVC" X ON X."CLAVE_SYNC" = D."CLAVE_SYNC"
        CROSS JOIN SERIES_GENERATE_INTEGER(1, 1, 500) S
        WHERE X."OTMP" IS NOT NULL
          AND S.ELEMENT_NUMBER <= OCCURRENCES_REGEXPR('"[^"]+"' IN X."OTMP")
    ) K
    GROUP BY K."ID_SURVIVOR"
) M
ON T."ID_REGISTRO" = M."ID_SURVIVOR"
WHEN MATCHED THEN UPDATE SET T."OTMP" = M.OTMP_NEW;

MERGE INTO "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPVC" T
USING (
    SELECT K."ID_SURVIVOR",
           STRING_AGG(K.V, '|' ORDER BY K.V) AS PARO_NEW
    FROM (
        SELECT DISTINCT D."ID_SURVIVOR",
               TRIM(SUBSTRING_REGEXPR('[^|]+' IN X."ID_PARO" OCCURRENCE S.ELEMENT_NUMBER)) AS V
        FROM (
            SELECT "CLAVE_SYNC", MIN("ID_REGISTRO") AS "ID_SURVIVOR"
            FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPVC"
            WHERE "CLAVE_SYNC" IS NOT NULL AND "CLAVE_SYNC" <> ''
            GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
        ) D
        JOIN "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPVC" X ON X."CLAVE_SYNC" = D."CLAVE_SYNC"
        CROSS JOIN SERIES_GENERATE_INTEGER(1, 1, 500) S
        WHERE X."ID_PARO" IS NOT NULL
          AND S.ELEMENT_NUMBER <= OCCURRENCES_REGEXPR('[^|]+' IN X."ID_PARO")
    ) K
    GROUP BY K."ID_SURVIVOR"
) M
ON T."ID_REGISTRO" = M."ID_SURVIVOR"
WHEN MATCHED THEN UPDATE SET T."ID_PARO" = M.PARO_NEW;

DELETE FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPVC"
WHERE "ID_REGISTRO" IN (
    SELECT X."ID_REGISTRO"
    FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPVC" X
    WHERE X."CLAVE_SYNC" IN (
        SELECT "CLAVE_SYNC" FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPVC"
        GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
    )
    AND X."ID_REGISTRO" <> (
        SELECT MIN(Y."ID_REGISTRO")
        FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPVC" Y
        WHERE Y."CLAVE_SYNC" = X."CLAVE_SYNC"
    )
);

-- ============================================================================
-- 2) INY
-- ============================================================================
MERGE INTO "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionINY" T
USING (
    SELECT K."ID_SURVIVOR",
           '["' || STRING_AGG(K.V, '","' ORDER BY K.V) || '"]' AS OTMC_NEW
    FROM (
        SELECT DISTINCT D."ID_SURVIVOR",
               REPLACE(TRIM(SUBSTRING_REGEXPR('"[^"]+"' IN X."OTMC" OCCURRENCE S.ELEMENT_NUMBER)), '"', '') AS V
        FROM (
            SELECT "CLAVE_SYNC", MIN("ID_REGISTRO") AS "ID_SURVIVOR"
            FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionINY"
            WHERE "CLAVE_SYNC" IS NOT NULL AND "CLAVE_SYNC" <> ''
            GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
        ) D
        JOIN "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionINY" X ON X."CLAVE_SYNC" = D."CLAVE_SYNC"
        CROSS JOIN SERIES_GENERATE_INTEGER(1, 1, 500) S
        WHERE X."OTMC" IS NOT NULL
          AND S.ELEMENT_NUMBER <= OCCURRENCES_REGEXPR('"[^"]+"' IN X."OTMC")
    ) K
    GROUP BY K."ID_SURVIVOR"
) M
ON T."ID_REGISTRO" = M."ID_SURVIVOR"
WHEN MATCHED THEN UPDATE SET T."OTMC" = M.OTMC_NEW;

MERGE INTO "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionINY" T
USING (
    SELECT K."ID_SURVIVOR",
           '["' || STRING_AGG(K.V, '","' ORDER BY K.V) || '"]' AS OTMP_NEW
    FROM (
        SELECT DISTINCT D."ID_SURVIVOR",
               REPLACE(TRIM(SUBSTRING_REGEXPR('"[^"]+"' IN X."OTMP" OCCURRENCE S.ELEMENT_NUMBER)), '"', '') AS V
        FROM (
            SELECT "CLAVE_SYNC", MIN("ID_REGISTRO") AS "ID_SURVIVOR"
            FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionINY"
            WHERE "CLAVE_SYNC" IS NOT NULL AND "CLAVE_SYNC" <> ''
            GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
        ) D
        JOIN "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionINY" X ON X."CLAVE_SYNC" = D."CLAVE_SYNC"
        CROSS JOIN SERIES_GENERATE_INTEGER(1, 1, 500) S
        WHERE X."OTMP" IS NOT NULL
          AND S.ELEMENT_NUMBER <= OCCURRENCES_REGEXPR('"[^"]+"' IN X."OTMP")
    ) K
    GROUP BY K."ID_SURVIVOR"
) M
ON T."ID_REGISTRO" = M."ID_SURVIVOR"
WHEN MATCHED THEN UPDATE SET T."OTMP" = M.OTMP_NEW;

MERGE INTO "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionINY" T
USING (
    SELECT K."ID_SURVIVOR",
           STRING_AGG(K.V, '|' ORDER BY K.V) AS PARO_NEW
    FROM (
        SELECT DISTINCT D."ID_SURVIVOR",
               TRIM(SUBSTRING_REGEXPR('[^|]+' IN X."ID_PARO" OCCURRENCE S.ELEMENT_NUMBER)) AS V
        FROM (
            SELECT "CLAVE_SYNC", MIN("ID_REGISTRO") AS "ID_SURVIVOR"
            FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionINY"
            WHERE "CLAVE_SYNC" IS NOT NULL AND "CLAVE_SYNC" <> ''
            GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
        ) D
        JOIN "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionINY" X ON X."CLAVE_SYNC" = D."CLAVE_SYNC"
        CROSS JOIN SERIES_GENERATE_INTEGER(1, 1, 500) S
        WHERE X."ID_PARO" IS NOT NULL
          AND S.ELEMENT_NUMBER <= OCCURRENCES_REGEXPR('[^|]+' IN X."ID_PARO")
    ) K
    GROUP BY K."ID_SURVIVOR"
) M
ON T."ID_REGISTRO" = M."ID_SURVIVOR"
WHEN MATCHED THEN UPDATE SET T."ID_PARO" = M.PARO_NEW;

DELETE FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionINY"
WHERE "ID_REGISTRO" IN (
    SELECT X."ID_REGISTRO"
    FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionINY" X
    WHERE X."CLAVE_SYNC" IN (
        SELECT "CLAVE_SYNC" FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionINY"
        GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
    )
    AND X."ID_REGISTRO" <> (
        SELECT MIN(Y."ID_REGISTRO")
        FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionINY" Y
        WHERE Y."CLAVE_SYNC" = X."CLAVE_SYNC"
    )
);

-- ============================================================================
-- 3) CORRUGADO
-- ============================================================================
MERGE INTO "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionCorrugado" T
USING (
    SELECT K."ID_SURVIVOR",
           '["' || STRING_AGG(K.V, '","' ORDER BY K.V) || '"]' AS OTMC_NEW
    FROM (
        SELECT DISTINCT D."ID_SURVIVOR",
               REPLACE(TRIM(SUBSTRING_REGEXPR('"[^"]+"' IN X."OTMC" OCCURRENCE S.ELEMENT_NUMBER)), '"', '') AS V
        FROM (
            SELECT "CLAVE_SYNC", MIN("ID_REGISTRO") AS "ID_SURVIVOR"
            FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionCorrugado"
            WHERE "CLAVE_SYNC" IS NOT NULL AND "CLAVE_SYNC" <> ''
            GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
        ) D
        JOIN "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionCorrugado" X ON X."CLAVE_SYNC" = D."CLAVE_SYNC"
        CROSS JOIN SERIES_GENERATE_INTEGER(1, 1, 500) S
        WHERE X."OTMC" IS NOT NULL
          AND S.ELEMENT_NUMBER <= OCCURRENCES_REGEXPR('"[^"]+"' IN X."OTMC")
    ) K
    GROUP BY K."ID_SURVIVOR"
) M
ON T."ID_REGISTRO" = M."ID_SURVIVOR"
WHEN MATCHED THEN UPDATE SET T."OTMC" = M.OTMC_NEW;

MERGE INTO "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionCorrugado" T
USING (
    SELECT K."ID_SURVIVOR",
           '["' || STRING_AGG(K.V, '","' ORDER BY K.V) || '"]' AS OTMP_NEW
    FROM (
        SELECT DISTINCT D."ID_SURVIVOR",
               REPLACE(TRIM(SUBSTRING_REGEXPR('"[^"]+"' IN X."OTMP" OCCURRENCE S.ELEMENT_NUMBER)), '"', '') AS V
        FROM (
            SELECT "CLAVE_SYNC", MIN("ID_REGISTRO") AS "ID_SURVIVOR"
            FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionCorrugado"
            WHERE "CLAVE_SYNC" IS NOT NULL AND "CLAVE_SYNC" <> ''
            GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
        ) D
        JOIN "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionCorrugado" X ON X."CLAVE_SYNC" = D."CLAVE_SYNC"
        CROSS JOIN SERIES_GENERATE_INTEGER(1, 1, 500) S
        WHERE X."OTMP" IS NOT NULL
          AND S.ELEMENT_NUMBER <= OCCURRENCES_REGEXPR('"[^"]+"' IN X."OTMP")
    ) K
    GROUP BY K."ID_SURVIVOR"
) M
ON T."ID_REGISTRO" = M."ID_SURVIVOR"
WHEN MATCHED THEN UPDATE SET T."OTMP" = M.OTMP_NEW;

MERGE INTO "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionCorrugado" T
USING (
    SELECT K."ID_SURVIVOR",
           STRING_AGG(K.V, '|' ORDER BY K.V) AS PARO_NEW
    FROM (
        SELECT DISTINCT D."ID_SURVIVOR",
               TRIM(SUBSTRING_REGEXPR('[^|]+' IN X."ID_PARO" OCCURRENCE S.ELEMENT_NUMBER)) AS V
        FROM (
            SELECT "CLAVE_SYNC", MIN("ID_REGISTRO") AS "ID_SURVIVOR"
            FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionCorrugado"
            WHERE "CLAVE_SYNC" IS NOT NULL AND "CLAVE_SYNC" <> ''
            GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
        ) D
        JOIN "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionCorrugado" X ON X."CLAVE_SYNC" = D."CLAVE_SYNC"
        CROSS JOIN SERIES_GENERATE_INTEGER(1, 1, 500) S
        WHERE X."ID_PARO" IS NOT NULL
          AND S.ELEMENT_NUMBER <= OCCURRENCES_REGEXPR('[^|]+' IN X."ID_PARO")
    ) K
    GROUP BY K."ID_SURVIVOR"
) M
ON T."ID_REGISTRO" = M."ID_SURVIVOR"
WHEN MATCHED THEN UPDATE SET T."ID_PARO" = M.PARO_NEW;

DELETE FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionCorrugado"
WHERE "ID_REGISTRO" IN (
    SELECT X."ID_REGISTRO"
    FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionCorrugado" X
    WHERE X."CLAVE_SYNC" IN (
        SELECT "CLAVE_SYNC" FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionCorrugado"
        GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
    )
    AND X."ID_REGISTRO" <> (
        SELECT MIN(Y."ID_REGISTRO")
        FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionCorrugado" Y
        WHERE Y."CLAVE_SYNC" = X."CLAVE_SYNC"
    )
);

-- ============================================================================
-- 4) PEAD LISO
-- ============================================================================
MERGE INTO "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPeadLiso" T
USING (
    SELECT K."ID_SURVIVOR",
           '["' || STRING_AGG(K.V, '","' ORDER BY K.V) || '"]' AS OTMC_NEW
    FROM (
        SELECT DISTINCT D."ID_SURVIVOR",
               REPLACE(TRIM(SUBSTRING_REGEXPR('"[^"]+"' IN X."OTMC" OCCURRENCE S.ELEMENT_NUMBER)), '"', '') AS V
        FROM (
            SELECT "CLAVE_SYNC", MIN("ID_REGISTRO") AS "ID_SURVIVOR"
            FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPeadLiso"
            WHERE "CLAVE_SYNC" IS NOT NULL AND "CLAVE_SYNC" <> ''
            GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
        ) D
        JOIN "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPeadLiso" X ON X."CLAVE_SYNC" = D."CLAVE_SYNC"
        CROSS JOIN SERIES_GENERATE_INTEGER(1, 1, 500) S
        WHERE X."OTMC" IS NOT NULL
          AND S.ELEMENT_NUMBER <= OCCURRENCES_REGEXPR('"[^"]+"' IN X."OTMC")
    ) K
    GROUP BY K."ID_SURVIVOR"
) M
ON T."ID_REGISTRO" = M."ID_SURVIVOR"
WHEN MATCHED THEN UPDATE SET T."OTMC" = M.OTMC_NEW;

MERGE INTO "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPeadLiso" T
USING (
    SELECT K."ID_SURVIVOR",
           '["' || STRING_AGG(K.V, '","' ORDER BY K.V) || '"]' AS OTMP_NEW
    FROM (
        SELECT DISTINCT D."ID_SURVIVOR",
               REPLACE(TRIM(SUBSTRING_REGEXPR('"[^"]+"' IN X."OTMP" OCCURRENCE S.ELEMENT_NUMBER)), '"', '') AS V
        FROM (
            SELECT "CLAVE_SYNC", MIN("ID_REGISTRO") AS "ID_SURVIVOR"
            FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPeadLiso"
            WHERE "CLAVE_SYNC" IS NOT NULL AND "CLAVE_SYNC" <> ''
            GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
        ) D
        JOIN "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPeadLiso" X ON X."CLAVE_SYNC" = D."CLAVE_SYNC"
        CROSS JOIN SERIES_GENERATE_INTEGER(1, 1, 500) S
        WHERE X."OTMP" IS NOT NULL
          AND S.ELEMENT_NUMBER <= OCCURRENCES_REGEXPR('"[^"]+"' IN X."OTMP")
    ) K
    GROUP BY K."ID_SURVIVOR"
) M
ON T."ID_REGISTRO" = M."ID_SURVIVOR"
WHEN MATCHED THEN UPDATE SET T."OTMP" = M.OTMP_NEW;

MERGE INTO "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPeadLiso" T
USING (
    SELECT K."ID_SURVIVOR",
           STRING_AGG(K.V, '|' ORDER BY K.V) AS PARO_NEW
    FROM (
        SELECT DISTINCT D."ID_SURVIVOR",
               TRIM(SUBSTRING_REGEXPR('[^|]+' IN X."ID_PARO" OCCURRENCE S.ELEMENT_NUMBER)) AS V
        FROM (
            SELECT "CLAVE_SYNC", MIN("ID_REGISTRO") AS "ID_SURVIVOR"
            FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPeadLiso"
            WHERE "CLAVE_SYNC" IS NOT NULL AND "CLAVE_SYNC" <> ''
            GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
        ) D
        JOIN "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPeadLiso" X ON X."CLAVE_SYNC" = D."CLAVE_SYNC"
        CROSS JOIN SERIES_GENERATE_INTEGER(1, 1, 500) S
        WHERE X."ID_PARO" IS NOT NULL
          AND S.ELEMENT_NUMBER <= OCCURRENCES_REGEXPR('[^|]+' IN X."ID_PARO")
    ) K
    GROUP BY K."ID_SURVIVOR"
) M
ON T."ID_REGISTRO" = M."ID_SURVIVOR"
WHEN MATCHED THEN UPDATE SET T."ID_PARO" = M.PARO_NEW;

DELETE FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPeadLiso"
WHERE "ID_REGISTRO" IN (
    SELECT X."ID_REGISTRO"
    FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPeadLiso" X
    WHERE X."CLAVE_SYNC" IN (
        SELECT "CLAVE_SYNC" FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPeadLiso"
        GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
    )
    AND X."ID_REGISTRO" <> (
        SELECT MIN(Y."ID_REGISTRO")
        FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPeadLiso" Y
        WHERE Y."CLAVE_SYNC" = X."CLAVE_SYNC"
    )
);

-- ============================================================================
-- 5) FILAS VACIAS (SIN_ORIGEN)
-- OJO: Revisar la seccion 4 del reporte 02 antes de ejecutar esto.
-- ============================================================================
DELETE FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPVC"
WHERE "ORIGEN" = 'SIN_ORIGEN';

DELETE FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionINY"
WHERE "ORIGEN" = 'SIN_ORIGEN';

DELETE FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionCorrugado"
WHERE "ORIGEN" = 'SIN_ORIGEN';

DELETE FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPeadLiso"
WHERE "ORIGEN" = 'SIN_ORIGEN';

-- ============================================================================
-- 6) VERIFICACION FINAL: debe devolver 0 duplicados en las 4 tablas
-- ============================================================================
SELECT 'PVC' AS TABLA, COUNT(*) AS DUPLICADOS FROM (
    SELECT "CLAVE_SYNC" FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPVC"
    GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
)
UNION ALL
SELECT 'INY', COUNT(*) FROM (
    SELECT "CLAVE_SYNC" FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionINY"
    GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
)
UNION ALL
SELECT 'CORRUGADO', COUNT(*) FROM (
    SELECT "CLAVE_SYNC" FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionCorrugado"
    GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
)
UNION ALL
SELECT 'PEADLISO', COUNT(*) FROM (
    SELECT "CLAVE_SYNC" FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPeadLiso"
    GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
);
