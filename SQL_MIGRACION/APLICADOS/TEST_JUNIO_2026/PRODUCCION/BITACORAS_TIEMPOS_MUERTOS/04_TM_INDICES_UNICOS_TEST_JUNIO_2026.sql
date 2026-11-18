-- ============================================================================
-- 04 - INDICES UNICOS por CLAVE_SYNC
-- Schema: TEST_JUNIO_2026 (HANA on-premise)
-- Fecha: 2026-11-18
--
-- REQUISITO: 03 ya se ejecuto y la verificacion final dio 0 duplicados.
-- Si un indice ya existe, el CREATE falla con "index already exists":
-- en ese caso ignorar y continuar.
--
-- ROLLBACK:
--   DROP INDEX "TEST_JUNIO_2026"."UX_TM_PVC_CLAVE_SYNC";
--   DROP INDEX "TEST_JUNIO_2026"."UX_TM_INY_CLAVE_SYNC";
--   DROP INDEX "TEST_JUNIO_2026"."UX_TM_CORRUGADO_CLAVE_SYNC";
--   DROP INDEX "TEST_JUNIO_2026"."UX_TM_PEAD_CLAVE_SYNC";
-- ============================================================================

SET SCHEMA "TEST_JUNIO_2026";

-- ----------------------------------------------------------------------------
-- Verificacion previa: las 4 consultas deben devolver 0
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Creacion de indices
-- ----------------------------------------------------------------------------
CREATE UNIQUE INDEX "UX_TM_PVC_CLAVE_SYNC"
    ON "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPVC" ("CLAVE_SYNC");

CREATE UNIQUE INDEX "UX_TM_INY_CLAVE_SYNC"
    ON "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionINY" ("CLAVE_SYNC");

CREATE UNIQUE INDEX "UX_TM_CORRUGADO_CLAVE_SYNC"
    ON "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionCorrugado" ("CLAVE_SYNC");

CREATE UNIQUE INDEX "UX_TM_PEAD_CLAVE_SYNC"
    ON "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPeadLiso" ("CLAVE_SYNC");

-- ----------------------------------------------------------------------------
-- Verificacion final
-- ----------------------------------------------------------------------------
SELECT TABLE_NAME, INDEX_NAME, INDEX_TYPE
FROM SYS.INDEXES
WHERE SCHEMA_NAME = 'TEST_JUNIO_2026'
  AND TABLE_NAME LIKE 'PdxMTTOTiemposMuertosProduccion%'
  AND INDEX_NAME LIKE 'UX_TM%'
ORDER BY TABLE_NAME;
