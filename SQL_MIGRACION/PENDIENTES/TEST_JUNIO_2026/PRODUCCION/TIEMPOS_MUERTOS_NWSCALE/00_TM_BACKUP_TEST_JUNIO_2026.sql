-- ============================================================================
-- 00 - RESPALDO de las 4 tablas de Tiempos Muertos
-- Schema: TEST_JUNIO_2026 (HANA on-premise)
-- Fecha: 2026-11-18
--
-- EJECUTAR PRIMERO Y UNA SOLA VEZ.
-- Crea una copia completa (estructura + datos) de cada tabla.
-- Si el script se vuelve a ejecutar, fallara con "table already exists":
-- eso significa que el respaldo ya existe, continuar con el paso 01.
--
-- ROLLBACK (restaurar una tabla desde su respaldo):
--   DROP TABLE "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPVC";
--   RENAME TABLE "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPVC_BAK_20261118"
--        TO "PdxMTTOTiemposMuertosProduccionPVC";
-- (repetir por tabla)
-- ============================================================================

SET SCHEMA "TEST_JUNIO_2026";

CREATE TABLE "PdxMTTOTiemposMuertosProduccionPVC_BAK_20261118"
AS (SELECT * FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPVC");

CREATE TABLE "PdxMTTOTiemposMuertosProduccionINY_BAK_20261118"
AS (SELECT * FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionINY");

CREATE TABLE "PdxMTTOTiemposMuertosProduccionCorrugado_BAK_20261118"
AS (SELECT * FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionCorrugado");

CREATE TABLE "PdxMTTOTiemposMuertosProduccionPeadLiso_BAK_20261118"
AS (SELECT * FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPeadLiso");

-- ============================================================================
-- VERIFICACION: los conteos deben coincidir con las tablas originales
-- ============================================================================
SELECT 'PVC_BAK'       AS TABLA, COUNT(*) AS REGS FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPVC_BAK_20261118"
UNION ALL
SELECT 'INY_BAK',       COUNT(*) FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionINY_BAK_20261118"
UNION ALL
SELECT 'CORRUGADO_BAK', COUNT(*) FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionCorrugado_BAK_20261118"
UNION ALL
SELECT 'PEADLISO_BAK',  COUNT(*) FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPeadLiso_BAK_20261118";
