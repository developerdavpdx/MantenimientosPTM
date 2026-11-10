-- ============================================================================
-- Migracion: permitir NULL en MOTIVO_BAJA de solicitudes de baja
-- Ambiente: DBADMIN
-- Fecha: 09/11/2026
-- Permite guardar borradores de solicitud de baja sin capturar el motivo.
-- ============================================================================

ALTER TABLE "DBADMIN"."PdxMTTOSolicitudesBajaEquipos"
    ALTER ("MOTIVO_BAJA" NVARCHAR(500) NULL);

-- Verificacion
SELECT COLUMN_NAME, DATA_TYPE_NAME, LENGTH, IS_NULLABLE
FROM SYS.TABLE_COLUMNS
WHERE SCHEMA_NAME = 'DBADMIN'
  AND TABLE_NAME = 'PdxMTTOSolicitudesBajaEquipos'
  AND COLUMN_NAME = 'MOTIVO_BAJA';
