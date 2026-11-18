-- ============================================================================
-- 03A - PREVIEW DE LA LIMPIEZA (SOLO LECTURA, NO BORRA NADA)
-- Schema: PTM_2022_FINAL (HANA on-premise)
-- Fecha: 2026-11-17
--
-- Ejecutar DESPUES de 01 y ANTES de 03.
-- Sirve para ver exactamente que se conservaria y que se borraria.
-- Si los numeros cuadran con el reporte 02, entonces 03 es seguro.
-- ============================================================================

SET SCHEMA "PTM_2022_FINAL";

-- ============================================================================
-- 1) GRUPOS DUPLICADOS: clave, filas, ID que se conserva y cuantas se borran
-- ============================================================================
SELECT 'PVC' AS TABLA, "CLAVE_SYNC", COUNT(*) AS REGS,
       MIN("ID_REGISTRO") AS ID_SURVIVOR,
       COUNT(*) - 1 AS SE_BORRARIAN
FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC"
GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
UNION ALL
SELECT 'INY', "CLAVE_SYNC", COUNT(*), MIN("ID_REGISTRO"), COUNT(*) - 1
FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY"
GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
UNION ALL
SELECT 'CORRUGADO', "CLAVE_SYNC", COUNT(*), MIN("ID_REGISTRO"), COUNT(*) - 1
FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionCorrugado"
GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
UNION ALL
SELECT 'PEADLISO', "CLAVE_SYNC", COUNT(*), MIN("ID_REGISTRO"), COUNT(*) - 1
FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPeadLiso"
GROUP BY "CLAVE_SYNC" HAVING COUNT(*) > 1
ORDER BY TABLA, "CLAVE_SYNC";

-- ============================================================================
-- 2) TOTAL DE FILAS QUE SE BORRARIAN POR DUPLICADOS (por tabla)
-- ============================================================================
SELECT 'PVC' AS TABLA, COUNT(*) AS TOTAL_A_BORRAR FROM (
    SELECT "ID_REGISTRO"
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
)
UNION ALL
SELECT 'INY', COUNT(*) FROM (
    SELECT "ID_REGISTRO"
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
)
UNION ALL
SELECT 'CORRUGADO', COUNT(*) FROM (
    SELECT "ID_REGISTRO"
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
)
UNION ALL
SELECT 'PEADLISO', COUNT(*) FROM (
    SELECT "ID_REGISTRO"
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
-- 3) FILAS VACIAS QUE SE BORRARIAN (SIN_ORIGEN) — revisar que no tengan horas
-- ============================================================================
SELECT 'PVC' AS TABLA, "ID_REGISTRO", "FECHA", "LINEA", "PRODUCTO", "TURNO",
       "OTMC", "OTMP", "ID_PARO",
       "TIEMPO_DISPONIBLE", "TIEMPO_PRODUCTIVO"
FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC"
WHERE "ORIGEN" = 'SIN_ORIGEN'
UNION ALL
SELECT 'INY', "ID_REGISTRO", "FECHA", "LINEA", "PRODUCTO", "TURNO",
       "OTMC", "OTMP", "ID_PARO",
       "TIEMPO_DISPONIBLE", "TIEMPO_PRODUCTIVO"
FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY"
WHERE "ORIGEN" = 'SIN_ORIGEN'
UNION ALL
SELECT 'CORRUGADO', "ID_REGISTRO", "FECHA", "LINEA", "PRODUCTO", "TURNO",
       "OTMC", "OTMP", "ID_PARO",
       "TIEMPO_DISPONIBLE", "TIEMPO_PRODUCTIVO"
FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionCorrugado"
WHERE "ORIGEN" = 'SIN_ORIGEN'
UNION ALL
SELECT 'PEADLISO', "ID_REGISTRO", "FECHA", "LINEA", "PRODUCTO", "TURNO",
       "OTMC", "OTMP", "ID_PARO",
       "TIEMPO_DISPONIBLE", "TIEMPO_PRODUCTIVO"
FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPeadLiso"
WHERE "ORIGEN" = 'SIN_ORIGEN'
ORDER BY TABLA, "ID_REGISTRO";

-- ============================================================================
-- 4) CHEQUEO DE SEGURIDAD: filas sin CLAVE_SYNC (deberia ser 0)
--    Si hay > 0, NO ejecutar 03: falta el backfill del 01.
-- ============================================================================
SELECT 'PVC' AS TABLA, COUNT(*) AS SIN_CLAVE FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC"
WHERE "CLAVE_SYNC" IS NULL OR "CLAVE_SYNC" = ''
UNION ALL
SELECT 'INY', COUNT(*) FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY"
WHERE "CLAVE_SYNC" IS NULL OR "CLAVE_SYNC" = ''
UNION ALL
SELECT 'CORRUGADO', COUNT(*) FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionCorrugado"
WHERE "CLAVE_SYNC" IS NULL OR "CLAVE_SYNC" = ''
UNION ALL
SELECT 'PEADLISO', COUNT(*) FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPeadLiso"
WHERE "CLAVE_SYNC" IS NULL OR "CLAVE_SYNC" = '';
