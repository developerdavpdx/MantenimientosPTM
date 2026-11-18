-- ============================================================================
-- 02 - REPORTE PREVIO A LA LIMPIEZA (solo lectura)
-- Schema: TEST_JUNIO_2026 (HANA on-premise)
-- Fecha: 2026-11-18
--
-- Ejecutar DESPUES de 01 (columnas + backfill) y ANTES de 03.
-- NO modifica datos. Sirve para autorizar la limpieza.
-- ============================================================================

SET SCHEMA "TEST_JUNIO_2026";

-- ============================================================================
-- 1) RESUMEN POR ORIGEN
-- ============================================================================
SELECT 'PVC' AS TABLA, "ORIGEN", COUNT(*) AS REGS
FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPVC"
GROUP BY "ORIGEN"
UNION ALL
SELECT 'INY', "ORIGEN", COUNT(*)
FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionINY"
GROUP BY "ORIGEN"
UNION ALL
SELECT 'CORRUGADO', "ORIGEN", COUNT(*)
FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionCorrugado"
GROUP BY "ORIGEN"
UNION ALL
SELECT 'PEADLISO', "ORIGEN", COUNT(*)
FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPeadLiso"
GROUP BY "ORIGEN"
ORDER BY TABLA, "ORIGEN";

-- ============================================================================
-- 2) GRUPOS DUPLICADOS (CLAVE_SYNC con mas de una fila)
-- ID_SURVIVOR = el ID_REGISTRO menor: ese se conserva.
-- ============================================================================
SELECT 'PVC' AS TABLA, "CLAVE_SYNC", COUNT(*) AS REGS,
       MIN("ID_REGISTRO") AS ID_SURVIVOR
FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPVC"
GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
UNION ALL
SELECT 'INY', "CLAVE_SYNC", COUNT(*), MIN("ID_REGISTRO")
FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionINY"
GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
UNION ALL
SELECT 'CORRUGADO', "CLAVE_SYNC", COUNT(*), MIN("ID_REGISTRO")
FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionCorrugado"
GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
UNION ALL
SELECT 'PEADLISO', "CLAVE_SYNC", COUNT(*), MIN("ID_REGISTRO")
FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPeadLiso"
GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
ORDER BY TABLA, "CLAVE_SYNC";

-- ============================================================================
-- 3) DETALLE DE FILAS DUPLICADAS (para revisar que se conserva y que se borra)
-- ============================================================================
SELECT 'PVC' AS TABLA, "ID_REGISTRO", "CLAVE_SYNC", "ORIGEN", "FECHA", "LINEA",
       "PRODUCTO", "TURNO", "OTMC", "OTMP", "ID_PARO"
FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPVC"
WHERE "CLAVE_SYNC" IN (
    SELECT "CLAVE_SYNC" FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPVC"
    GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
)
ORDER BY "CLAVE_SYNC", "ID_REGISTRO";

SELECT 'INY' AS TABLA, "ID_REGISTRO", "CLAVE_SYNC", "ORIGEN", "FECHA", "LINEA",
       "PRODUCTO", "TURNO", "OTMC", "OTMP", "ID_PARO"
FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionINY"
WHERE "CLAVE_SYNC" IN (
    SELECT "CLAVE_SYNC" FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionINY"
    GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
)
ORDER BY "CLAVE_SYNC", "ID_REGISTRO";

SELECT 'CORRUGADO' AS TABLA, "ID_REGISTRO", "CLAVE_SYNC", "ORIGEN", "FECHA", "LINEA",
       "PRODUCTO", "TURNO", "OTMC", "OTMP", "ID_PARO"
FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionCorrugado"
WHERE "CLAVE_SYNC" IN (
    SELECT "CLAVE_SYNC" FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionCorrugado"
    GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
)
ORDER BY "CLAVE_SYNC", "ID_REGISTRO";

SELECT 'PEADLISO' AS TABLA, "ID_REGISTRO", "CLAVE_SYNC", "ORIGEN", "FECHA", "LINEA",
       "PRODUCTO", "TURNO", "OTMC", "OTMP", "ID_PARO"
FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPeadLiso"
WHERE "CLAVE_SYNC" IN (
    SELECT "CLAVE_SYNC" FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPeadLiso"
    GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
)
ORDER BY "CLAVE_SYNC", "ID_REGISTRO";

-- ============================================================================
-- 4) FILAS VACIAS (ORIGEN = SIN_ORIGEN)
-- IMPORTANTE: si alguna trae horas capturadas, NO borrarla: revisarla a mano
-- y ajustar el paso 03.
-- ============================================================================
SELECT 'PVC' AS TABLA, "ID_REGISTRO", "FECHA", "LINEA", "PRODUCTO", "TURNO",
       "OTMC", "OTMP", "ID_PARO", "USUARIO", "FECHA_CREACION"
FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPVC"
WHERE "ORIGEN" = 'SIN_ORIGEN'
UNION ALL
SELECT 'INY', "ID_REGISTRO", "FECHA", "LINEA", "PRODUCTO", "TURNO",
       "OTMC", "OTMP", "ID_PARO", "USUARIO", "FECHA_CREACION"
FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionINY"
WHERE "ORIGEN" = 'SIN_ORIGEN'
UNION ALL
SELECT 'CORRUGADO', "ID_REGISTRO", "FECHA", "LINEA", "PRODUCTO", "TURNO",
       "OTMC", "OTMP", "ID_PARO", "USUARIO", "FECHA_CREACION"
FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionCorrugado"
WHERE "ORIGEN" = 'SIN_ORIGEN'
UNION ALL
SELECT 'PEADLISO', "ID_REGISTRO", "FECHA", "LINEA", "PRODUCTO", "TURNO",
       "OTMC", "OTMP", "ID_PARO", "USUARIO", "FECHA_CREACION"
FROM "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionPeadLiso"
WHERE "ORIGEN" = 'SIN_ORIGEN'
ORDER BY TABLA, "ID_REGISTRO";
