-- ============================================================================
-- VERIFICACION POST-MIGRACION - Preventivos / Corrugado / Baja
-- Fecha: 10/11/2026
--
-- Ejecutar en HANA con un usuario que pueda leer SYS.TABLE_COLUMNS y
-- SYS.PROCEDURES.
-- ============================================================================

-- 1) Columna TIEMPO_MUERTO_HERRAMENTALES (Corrugado)
SELECT
    "SCHEMA_NAME",
    "TABLE_NAME",
    "COLUMN_NAME",
    "DATA_TYPE_NAME",
    "LENGTH",
    "SCALE",
    "DEFAULT_VALUE",
    "IS_NULLABLE"
FROM SYS.TABLE_COLUMNS
WHERE "SCHEMA_NAME" IN ('DBADMIN','TEST_JUNIO_2026','PTM_2022_FINAL')
  AND "TABLE_NAME" = 'PdxMTTOTiemposMuertosProduccionCorrugado'
  AND "COLUMN_NAME" = 'TIEMPO_MUERTO_HERRAMENTALES'
ORDER BY "SCHEMA_NAME";

-- 2) MOTIVO_BAJA nullable (Baja de equipos)
SELECT
    "SCHEMA_NAME",
    "TABLE_NAME",
    "COLUMN_NAME",
    "DATA_TYPE_NAME",
    "LENGTH",
    "IS_NULLABLE"
FROM SYS.TABLE_COLUMNS
WHERE "SCHEMA_NAME" IN ('DBADMIN','TEST_JUNIO_2026','PTM_2022_FINAL')
  AND "TABLE_NAME" = 'PdxMTTOSolicitudesBajaEquipos'
  AND "COLUMN_NAME" = 'MOTIVO_BAJA'
ORDER BY "SCHEMA_NAME";

-- 3) SP SpPdxMTTOObtenerMantenimientosPorRango sin colchón de fechas
SELECT
    "SCHEMA_NAME",
    "PROCEDURE_NAME",
    CASE
        WHEN "DEFINITION" LIKE '%P_FECHA_INICIO, -1%'
          OR "DEFINITION" LIKE '%INCREMENTO_MESES + 1%'
        THEN 'CON COLCHON (REVISAR)'
        ELSE 'SIN COLCHON (OK)'
    END AS "ESTADO_COLCHON"
FROM SYS.PROCEDURES
WHERE "SCHEMA_NAME" IN ('DBADMIN','TEST_JUNIO_2026','PTM_2022_FINAL')
  AND "PROCEDURE_NAME" = 'SpPdxMTTOObtenerMantenimientosPorRango'
ORDER BY "SCHEMA_NAME";

-- 4) Conteo de SPs por schema (referencia)
SELECT
    "SCHEMA_NAME",
    COUNT(*) AS "TOTAL_PROCEDIMIENTOS"
FROM SYS.PROCEDURES
WHERE "SCHEMA_NAME" IN ('DBADMIN','TEST_JUNIO_2026','PTM_2022_FINAL')
GROUP BY "SCHEMA_NAME"
ORDER BY "SCHEMA_NAME";
