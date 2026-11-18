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
- `PTM_2022_FINAL/PRODUCCION/SpPdxMTTOBuscarArticulosBatch_CREATE.sql`
- `PTM_2022_FINAL/PRODUCCION/SpPdxMTTOBuscarArticulosBatch_ALTER.sql`
- `NWSCALE/20261117_INDICES_NWSCALE.sql`
- `NWSCALE/PRUEBAS/20261117_TEST_DATA_NWSCALE.sql`
- `PTM_2022_FINAL/PRODUCCION/TIEMPOS_MUERTOS_NWSCALE/` (paquete 00 a 06 + README)

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

### On-premise (`PTM_2022_FINAL`)

- `PTM_2022_FINAL/PRODUCCION/SpPdxMTTOBuscarArticulosBatch_CREATE.sql`
  - Primera creación del SP en on-premise.
- `PTM_2022_FINAL/PRODUCCION/SpPdxMTTOBuscarArticulosBatch_ALTER.sql`
  - Usar si el SP ya existe (re-aplicación). En on-premise `CREATE OR REPLACE` no funciona; usar `ALTER PROCEDURE`.
- Verificación: `CALL "PTM_2022_FINAL"."SpPdxMTTOBuscarArticulosBatch"('1');`
- **Importante:** el C# resuelve el schema desde `AppSettings["Database"]`. El SP debe existir en el schema al que apunta el portal: `DBADMIN` (cloud) o `PTM_2022_FINAL` (on-premise).

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


## Pendientes 2026-11-17 — Tiempos Muertos / NWSCALE (PTM_2022_FINAL)

Paquete: `PTM_2022_FINAL/PRODUCCION/TIEMPOS_MUERTOS_NWSCALE/`

- `00_TM_BACKUP_PTM_2022_FINAL.sql` — respaldo de las 4 tablas **antes** de borrar.
- `01_TM_COLUMNAS_Y_CLAVES_PTM_2022_FINAL.sql` — columnas `ORIGEN`, `CLAVE_SYNC`, `MODO`, rango; backfill.
- `02_TM_REPORTE_DUPLICADOS_PTM_2022_FINAL.sql` — reporte (solo lectura) para autorizar la limpieza.
- `03A_TM_PREVIEW_LIMPIEZA_PTM_2022_FINAL.sql` — preview (solo lectura) de lo que borraría el 03.
- `03_TM_LIMPIEZA_DUPLICADOS_PTM_2022_FINAL.sql` — conserva el ID menor, fusiona `OTMC`/`OTMP`/`ID_PARO`, borra duplicados y vacías.
- `04_TM_INDICES_UNICOS_PTM_2022_FINAL.sql` — 4 índices únicos `UX_TM_*_CLAVE_SYNC`.
- `05_TM_SP_CONSULTA_PTM_2022_FINAL.sql` — `ALTER` de los 4 SPs de consulta.
- `06_TM_SP_GUARDADO_PTM_2022_FINAL.sql` — `ALTER` de los 4 SPs de guardado.
- `07_TM_VERIFICACION_PTM_2022_FINAL.sql` — verificación final (solo lectura).
- **Estado:** pendiente de aplicar en el servidor on-premise (no alcanzable desde desarrollo).
- **Orden:** 00 → 01 → 02 (revisar) → 03 → 04 → 05 → 06 → 07.
- **Después:** publicar DLL + 5 JS + 4 vistas (`?v=20261113-13`).

## Aplicados recientes

- **2026-11-17 - PREVENTIVOS:** indices unicos, SP de rutina atomico y control de concurrencia aplicados en `DBADMIN`, `PTM_2022_FINAL` y `TEST_JUNIO_2026`.
  Scripts en `APLICADOS/DBADMIN/PREVENTIVOS/`, `APLICADOS/PTM_2022_FINAL/PREVENTIVOS/` y `APLICADOS/TEST_JUNIO_2026/PREVENTIVOS/`.
  Detalle en `MIGRACIONES_APLICADAS.md`.

