-- ============================================================================
-- Migracion: permitir NULL en MOTIVO_BAJA de solicitudes de baja
-- Ambiente: TEST_JUNIO_2026
-- Fecha: 09/11/2026
-- Permite guardar borradores de solicitud de baja sin capturar el motivo.
-- ============================================================================

ALTER TABLE "TEST_JUNIO_2026"."PdxMTTOSolicitudesBajaEquipos"
    ALTER ("MOTIVO_BAJA" NVARCHAR(500) NULL);

-- Verificacion
SELECT COLUMN_NAME, DATA_TYPE_NAME, LENGTH, IS_NULLABLE
FROM SYS.TABLE_COLUMNS
WHERE SCHEMA_NAME = 'TEST_JUNIO_2026'
  AND TABLE_NAME = 'PdxMTTOSolicitudesBajaEquipos'
  AND COLUMN_NAME = 'MOTIVO_BAJA';
