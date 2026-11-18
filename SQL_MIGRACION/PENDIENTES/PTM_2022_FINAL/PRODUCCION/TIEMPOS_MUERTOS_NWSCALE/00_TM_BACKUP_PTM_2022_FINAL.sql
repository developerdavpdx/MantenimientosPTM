-- ============================================================================
-- 00 - RESPALDO de las 4 tablas de Tiempos Muertos
-- Schema: PTM_2022_FINAL (HANA on-premise)
-- Fecha: 2026-11-17
--
-- EJECUTAR PRIMERO Y UNA SOLA VEZ.
-- Crea una copia completa (estructura + datos) de cada tabla.
-- Si el script se vuelve a ejecutar, fallara con "table already exists":
-- eso significa que el respaldo ya existe, continuar con el paso 01.
--
-- ROLLBACK (restaurar una tabla desde su respaldo):
--   DROP TABLE "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC";
--   RENAME TABLE "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC_BAK_20261117"
--        TO "PdxMTTOTiemposMuertosProduccionPVC";
-- (repetir por tabla)
-- ============================================================================

SET SCHEMA "PTM_2022_FINAL";

CREATE TABLE "PdxMTTOTiemposMuertosProduccionPVC_BAK_20261117"
AS (SELECT * FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC");

CREATE TABLE "PdxMTTOTiemposMuertosProduccionINY_BAK_20261117"
AS (SELECT * FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY");

CREATE TABLE "PdxMTTOTiemposMuertosProduccionCorrugado_BAK_20261117"
AS (SELECT * FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionCorrugado");

CREATE TABLE "PdxMTTOTiemposMuertosProduccionPeadLiso_BAK_20261117"
AS (SELECT * FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPeadLiso");

-- ============================================================================
-- VERIFICACION: los conteos deben coincidir con las tablas originales
-- ============================================================================
SELECT 'PVC_BAK'       AS TABLA, COUNT(*) AS REGS FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC_BAK_20261117"
UNION ALL
SELECT 'INY_BAK',       COUNT(*) FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY_BAK_20261117"
UNION ALL
SELECT 'CORRUGADO_BAK', COUNT(*) FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionCorrugado_BAK_20261117"
UNION ALL
SELECT 'PEADLISO_BAK',  COUNT(*) FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPeadLiso_BAK_20261117";
