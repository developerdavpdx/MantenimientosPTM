# Pendientes de revisión - RESUELTO

Fecha de nota: 10/11/2026
Estado: **RESUELTO**. El usuario aplicó/validó los pendientes.
Este archivo se conserva solo como historial.

## 1. MOTIVO_BAJA nullable - RESUELTO
- Tabla: `PdxMTTOSolicitudesBajaEquipos`
- Cambio: `MOTIVO_BAJA` `NVARCHAR(500) NULL`
- Estado: **aplicado/validado** en TEST_JUNIO_2026 y PTM_2022_FINAL.
- Scripts: `APLICADOS/DBADMIN/MIGRACION_BAJA_MOTIVO_NULL_DBADMIN.sql`,
  `APLICADOS/TEST_JUNIO_2026/MIGRACION_BAJA_MOTIVO_NULL_TEST_JUNIO_2026.sql`,
  `APLICADOS/PTM_2022_FINAL/MIGRACION_BAJA_MOTIVO_NULL_PTM_2022_FINAL.sql`.

## 2. SP SpPdxMTTOObtenerMantenimientosPorRango - RESUELTO
- Script canónico: `APLICADOS/COMUN/MIGRACION_PREVENTIVOS_SP_RANGO.sql`
- Estado: **aplicado/validado** en DBADMIN, TEST_JUNIO_2026 y PTM_2022_FINAL.
- Se quitó el colchón de fechas de `MANTENIMIENTOS_CALCULADOS`.
- Los scripts grandes `MIGRACION_TEST_JUNIO_2026.sql` y
  `MIGRACION_PTM_2022_FINAL.sql` quedan como históricos y no deben
  re-ejecutarse completos sin aplicar después el script canónico.

## Historial
- `TIEMPO_MUERTO_HERRAMENTALES` en
  `PdxMTTOTiemposMuertosProduccionCorrugado`: validado por el usuario,
  ya no es pendiente.

## Estado de la carpeta PENDIENTES
- `SQL_MIGRACION/PENDIENTES/` debe quedar sin scripts SQL (solo su README).
