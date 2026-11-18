-- ============================================================================
-- 04 - INDICES UNICOS por CLAVE_SYNC
-- Schema: PTM_2022_FINAL (HANA on-premise)
-- Fecha: 2026-11-17
--
-- REQUISITO: 03 ya se ejecuto y la verificacion final dio 0 duplicados.
-- Si un indice ya existe, el CREATE falla con "index already exists":
-- en ese caso ignorar y continuar.
--
-- ROLLBACK:
--   DROP INDEX "PTM_2022_FINAL"."UX_TM_PVC_CLAVE_SYNC";
--   DROP INDEX "PTM_2022_FINAL"."UX_TM_INY_CLAVE_SYNC";
--   DROP INDEX "PTM_2022_FINAL"."UX_TM_CORRUGADO_CLAVE_SYNC";
--   DROP INDEX "PTM_2022_FINAL"."UX_TM_PEAD_CLAVE_SYNC";
-- ============================================================================

SET SCHEMA "PTM_2022_FINAL";

-- ----------------------------------------------------------------------------
-- Verificacion previa: las 4 consultas deben devolver 0
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Creacion de indices
-- ----------------------------------------------------------------------------
CREATE UNIQUE INDEX "UX_TM_PVC_CLAVE_SYNC"
    ON "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC" ("CLAVE_SYNC");

CREATE UNIQUE INDEX "UX_TM_INY_CLAVE_SYNC"
    ON "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY" ("CLAVE_SYNC");

CREATE UNIQUE INDEX "UX_TM_CORRUGADO_CLAVE_SYNC"
    ON "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionCorrugado" ("CLAVE_SYNC");

CREATE UNIQUE INDEX "UX_TM_PEAD_CLAVE_SYNC"
    ON "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPeadLiso" ("CLAVE_SYNC");

-- ----------------------------------------------------------------------------
-- Verificacion final
-- ----------------------------------------------------------------------------
SELECT TABLE_NAME, INDEX_NAME, INDEX_TYPE
FROM SYS.INDEXES
WHERE SCHEMA_NAME = 'PTM_2022_FINAL'
  AND TABLE_NAME LIKE 'PdxMTTOTiemposMuertosProduccion%'
  AND INDEX_NAME LIKE 'UX_TM%'
ORDER BY TABLE_NAME;
