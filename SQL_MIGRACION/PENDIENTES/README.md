# PENDIENTES

Esta carpeta debe estar **sin scripts SQL** en estado normal. Este README es solo una referencia.

- Aquí solo deben vivir scripts SQL **por aplicar**.
- Al aplicarse en TEST_JUNIO_2026 y PTM_2022_FINAL, se mueven a `../APLICADOS/<schema>/`.
- Se registran en `../MIGRACIONES_APLICADAS.md`.
- Si un script se reemplaza, se mueve a `../OBSOLETO/` con encabezado `OBSOLETO - NO EJECUTAR`.

Regla: si hay algo aquí, es porque falta aplicarlo. Si no hay nada, todo está al día.

## Contenido actual

- `MIGRACION_DEVOLUCION_COSTO_PROMEDIO_TEST_JUNIO_2026.sql`
- `MIGRACION_DEVOLUCION_COSTO_PROMEDIO_PTM_2022_FINAL.sql`
- `DBADMIN/PRODUCCION/SpPdxMTTOBuscarArticulosBatch.sql`
- `NWSCALE/20261117_INDICES_NWSCALE.sql`
- `NWSCALE/PRUEBAS/20261117_TEST_DATA_NWSCALE.sql`

Motivo: los SPs `SpPdxMTTOGetArticuloSalidaM` y `SpPdxMTTOGetSalidasPorOT`
deben devolver `CostoPromedio` (`OITM.AvgPrice`) para que la devolución a SAP
se valore con el costo promedio del artículo al momento de la devolución y el
modal lo muestre antes de confirmar.

## Regla on-premise

- En **TEST_JUNIO_2026** y **PTM_2022_FINAL** usar siempre **`ALTER PROCEDURE`**.
- **`CREATE OR REPLACE PROCEDURE` no funciona en on-premise**; solo se usa en HANA Cloud (`DBADMIN`).

## Pendientes 2026-11-17 — NWSCALE / DBADMIN (Tiempos Muertos)

### HANA Cloud (`DBADMIN`)

- `DBADMIN/PRODUCCION/SpPdxMTTOBuscarArticulosBatch.sql`
  - Crea/reemplaza el SP batch de artículos (una sola llamada para `KgsDia`/`PesoMinimo`).
  - Verificación: `CALL "DBADMIN"."SpPdxMTTOBuscarArticulosBatch"('1');`

### SQL Server NWSCALE (`PtmNwScale2`)

- `NWSCALE/20261117_INDICES_NWSCALE.sql`
  - Crea los índices de `ProductoTerminados` y `EnvioScraps`. Incluye rollback al final.
  - Índices: `IX_PT_Fecha_Planta_Linea`, `IX_PT_Linea_Fecha`, `IX_PT_Turno_Fecha_Planta_Linea`, `IX_EnvioScraps_Fecha_Planta_Linea`.
- `NWSCALE/PRUEBAS/20261117_TEST_DATA_NWSCALE.sql`
  - **Solo pruebas.** Inserta 15 registros del 15–17/11/2026 en `ProductoTerminados`.
  - Borrar: `DELETE FROM dbo.ProductoTerminados WHERE OrdenFabricacion = 'TEST-NWSCALE-20261117';`

### Código

- Publicar el DLL con los cambios de `ProduccionController` y `AccesoDatosPlaneacion` (commit `6e23f34`).

### Orden de aplicación

1. HANA Cloud: `SpPdxMTTOBuscarArticulosBatch.sql`.
2. SQL Server: `20261117_INDICES_NWSCALE.sql`.
3. (Opcional, solo pruebas) `20261117_TEST_DATA_NWSCALE.sql`.
4. Publicar el DLL.

### Verificación

- `CALL "DBADMIN"."SpPdxMTTOBuscarArticulosBatch"('1');` devuelve datos.
- Endpoint `GetProductoTerminadoNewScale` en ~1–2 s para un rango de 31 días.
- El grid muestra los pendientes de NWSCALE.

### Comportamiento esperado

- `@Corte = 4` devuelve un **resumen por producto/línea para todo el rango** (totales sumados y fecha más reciente). **Este es el comportamiento esperado**: el portal de NWSCALE muestra el resumen del rango así.
- Si en el futuro se requiere una fila por día, se puede cambiar a la estrategia día por día (con los índices nuevos, cada día tarda ~0.1–0.6 s).
