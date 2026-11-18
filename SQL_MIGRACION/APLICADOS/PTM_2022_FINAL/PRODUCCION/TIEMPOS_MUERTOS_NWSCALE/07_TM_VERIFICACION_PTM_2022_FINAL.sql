-- ============================================================================
-- 07 - VERIFICACION FINAL (solo lectura)
-- Schema: PTM_2022_FINAL (HANA on-premise)
-- Fecha: 2026-11-17
--
-- Ejecutar al terminar 00 -> 06. Todos los resultados deben ser los esperados.
-- ============================================================================

SET SCHEMA "PTM_2022_FINAL";

-- ============================================================================
-- 1) COLUMNAS NUEVAS: se esperan 7 columnas por tabla (28 filas)
-- ============================================================================
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE_NAME
FROM SYS.TABLE_COLUMNS
WHERE SCHEMA_NAME = 'PTM_2022_FINAL'
  AND TABLE_NAME LIKE 'PdxMTTOTiemposMuertosProduccion%'
  AND TABLE_NAME NOT LIKE '%BAK%'
  AND TABLE_NAME NOT LIKE '%BACKUP%'
  AND COLUMN_NAME IN (
      'FECHA_CREACION', 'FECHA_ACTUALIZACION',
      'ORIGEN', 'CLAVE_SYNC', 'MODO',
      'FECHA_INICIO_RANGO', 'FECHA_FIN_RANGO'
  )
ORDER BY TABLE_NAME, "POSITION";

-- ============================================================================
-- 2) INDICES UNICOS: se esperan 4 (UX_TM_*_CLAVE_SYNC, CPBTREE UNIQUE)
-- ============================================================================
SELECT TABLE_NAME, INDEX_NAME, INDEX_TYPE
FROM SYS.INDEXES
WHERE SCHEMA_NAME = 'PTM_2022_FINAL'
  AND TABLE_NAME LIKE 'PdxMTTOTiemposMuertosProduccion%'
  AND INDEX_NAME LIKE 'UX_TM%'
ORDER BY TABLE_NAME;

-- ============================================================================
-- 3) DUPLICADOS POR CLAVE_SYNC: todos deben dar 0
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

-- ============================================================================
-- 4) FILAS SIN TOKEN: todas deben dar 0
-- ============================================================================
SELECT 'PVC' AS TABLA, COUNT(*) AS SIN_TOKEN FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC"
WHERE "FECHA_ACTUALIZACION" IS NULL
UNION ALL
SELECT 'INY', COUNT(*) FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY"
WHERE "FECHA_ACTUALIZACION" IS NULL
UNION ALL
SELECT 'CORRUGADO', COUNT(*) FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionCorrugado"
WHERE "FECHA_ACTUALIZACION" IS NULL
UNION ALL
SELECT 'PEADLISO', COUNT(*) FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPeadLiso"
WHERE "FECHA_ACTUALIZACION" IS NULL;

-- ============================================================================
-- 5) SPs DE GUARDADO ACTUALIZADOS: los 4 deben mostrar 4 parametros nuevos
--    (P_MODO, P_FECHA_INICIO_RANGO, P_FECHA_FIN_RANGO, P_TOKEN)
-- ============================================================================
SELECT PROCEDURE_NAME, COUNT(*) AS PARAMS_NUEVOS
FROM SYS.PROCEDURE_PARAMETERS
WHERE SCHEMA_NAME = 'PTM_2022_FINAL'
  AND PROCEDURE_NAME LIKE 'SpPdxMTTO%TiemposMuertos%'
  AND PARAMETER_NAME IN ('P_MODO', 'P_FECHA_INICIO_RANGO', 'P_FECHA_FIN_RANGO', 'P_TOKEN')
GROUP BY PROCEDURE_NAME
ORDER BY PROCEDURE_NAME;

-- ============================================================================
-- 6) RESUMEN POR ORIGEN (referencia)
-- ============================================================================
SELECT 'PVC' AS TABLA, "ORIGEN", COUNT(*) AS REGS
FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC" GROUP BY "ORIGEN"
UNION ALL
SELECT 'INY', "ORIGEN", COUNT(*) FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY" GROUP BY "ORIGEN"
UNION ALL
SELECT 'CORRUGADO', "ORIGEN", COUNT(*) FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionCorrugado" GROUP BY "ORIGEN"
UNION ALL
SELECT 'PEADLISO', "ORIGEN", COUNT(*) FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPeadLiso" GROUP BY "ORIGEN"
ORDER BY TABLA, "ORIGEN";
