# PENDIENTES

Esta carpeta debe estar **sin scripts SQL** en estado normal. Este README es solo una referencia.

- Aquí solo deben vivir scripts SQL **por aplicar**.
- Al aplicarse en TEST_JUNIO_2026 y PTM_2022_FINAL, se mueven a `../APLICADOS/<schema>/`.
- Se registran en `../MIGRACIONES_APLICADAS.md`.
- Si un script se reemplaza, se mueve a `../OBSOLETO/` con encabezado `OBSOLETO - NO EJECUTAR`.

Regla: si hay algo aquí, es porque falta aplicarlo. Si no hay nada, todo está al día.

## Contenido actual

- `PTM_2022_FINAL/ALMACEN/MIGRACION_DEVOLUCION_COSTO_PROMEDIO_PTM_2022_FINAL.sql`
- `DBADMIN/PRODUCCION/SpPdxMTTOBuscarArticulosBatch.sql`
- `PTM_2022_FINAL/PRODUCCION/SpPdxMTTOBuscarArticulosBatch_CREATE.sql`
- `PTM_2022_FINAL/PRODUCCION/SpPdxMTTOBuscarArticulosBatch_ALTER.sql`
- `NWSCALE/20261117_INDICES_NWSCALE.sql`
- `NWSCALE/PRUEBAS/20261117_TEST_DATA_NWSCALE.sql`
- `PTM_2022_FINAL/METRICAS/20261118_METRICAS_OEE_CUMPLIMIENTO_PM_3_FIRMAS_PTM_2022_FINAL.sql`
- `PTM_2022_FINAL/PLANEACION/SpPdxMTTOBuscarArticulos_INSUMOS_Y_ORDERBY_20261118_ALTER.sql`

> **TEST_JUNIO_2026: al dia (sin scripts).** Todo lo de ese schema se aplico el
> 2026-11-18 y se movio a `../APLICADOS/TEST_JUNIO_2026/`.

> Los dos scripts de `PLANEACION` llevan **ambos cambios** del SP
> `SpPdxMTTOBuscarArticulos`: (1) INSUMOS via `P_GRUPOS_ART` y (2) el nuevo
> `ORDER BY` por relevancia. Se aplican en **un solo pase**; ya no existe la
> version `..._INSUMOS_20261118_ALTER.sql` (se renombro para evitar aplicar
> dos migraciones encadenadas sobre el mismo objeto).

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


## Pendientes 2026-11-18 — Tiempos Muertos / NWSCALE (TEST_JUNIO_2026)

**APLICADO en TEST_JUNIO_2026 el 2026-11-18.** Paquete movido a
`APLICADOS/TEST_JUNIO_2026/PRODUCCION/BITACORAS_TIEMPOS_MUERTOS/` (antes
`TIEMPOS_MUERTOS_NWSCALE/`).

- `00` respaldo (`*_BAK_20261118`), `01` columnas/backfill, `02` reporte, `03A` preview, `03` limpieza, `04` indices, `05`/`06` SPs, `07` verificacion.
- **Orden:** 00 -> 01 -> 02 -> 03A -> 03 -> 04 -> 05 -> 06 -> 07.
- **Antes del 03:** revisar 02 y 03A (0 filas sin `CLAVE_SYNC`; `SIN_ORIGEN` sin horas).
- **Despues:** publicar DLL + 5 JS + 4 vistas + `ParosProduccion` y probar en el portal.
- Es el mismo paquete ya aplicado/validado en `PTM_2022_FINAL` el 2026-11-17.

## Aplicados recientes

- **2026-11-17 - TIEMPOS MUERTOS / NWSCALE:** aplicado en `DBADMIN` y `PTM_2022_FINAL` (4 procesos).
  - Scripts en `APLICADOS/PTM_2022_FINAL/PRODUCCION/TIEMPOS_MUERTOS_NWSCALE/` (00 a 07).
  - Resultado 07 en PTM: 0 duplicados, 0 filas sin token, 4 indices unicos y 4 SPs de guardado con 4 parametros nuevos.
  - Filas PTM: PVC 251 (190 NWSCALE / 17 MANUAL / 44 LEGACY), INY 10, Corrugado 87, PEAD Liso 197.
  - **Código publicado en PTM el 18/11/2026:** DLL + 5 JS + 4 vistas + Paros.
- **2026-11-18 - CORRECTIVOS:** índices únicos por `NUMERO_ORDEN` + token de versión + `CONFLICTO`.
  - DBADMIN aplicado/validado en portal (borrador, segundo guardado y conflicto simulado).
  - PTM_2022_FINAL aplicado/validado el 18/11/2026: 0 duplicados, 2 índices y 1 validador.
  - TEST_JUNIO_2026 aplicado/validado el 18/11/2026: OT_MC_DUPS 0, MCG_DUPS 0, INDICES 2, VALIDADOR 1.
  - Scripts movidos a `APLICADOS/TEST_JUNIO_2026/PRODUCCION/CORRECTIVOS/`.
  - Detalle en `MIGRACIONES_APLICADAS.md`.

- **2026-11-17 - PREVENTIVOS:** indices unicos, SP de rutina atomico y control de concurrencia aplicados en `DBADMIN`, `PTM_2022_FINAL` y `TEST_JUNIO_2026`.
  Scripts en `APLICADOS/DBADMIN/PREVENTIVOS/`, `APLICADOS/PTM_2022_FINAL/PREVENTIVOS/` y `APLICADOS/TEST_JUNIO_2026/PREVENTIVOS/`.
  Detalle en `MIGRACIONES_APLICADAS.md`.

## Pendientes 2026-11-18 - METRICAS (Cumplimiento PM con las 3 firmas)

Aplicado en `DBADMIN` y en `TEST_JUNIO_2026` (2026-11-18). Falta solo
`PTM_2022_FINAL`, con `ALTER PROCEDURE`.

- TEST_JUNIO_2026: **aplicado** -> `APLICADOS/TEST_JUNIO_2026/METRICAS/`
  (4 `ALTER PROCEDURE "TEST_JUNIO_2026".SpPdxMTTOMetricasOEE_{PVC,PeadLiso,Corrugado,INY}`).
- `PTM_2022_FINAL/METRICAS/20261118_METRICAS_OEE_CUMPLIMIENTO_PM_3_FIRMAS_PTM_2022_FINAL.sql`
  - 4 `ALTER PROCEDURE "PTM_2022_FINAL".SpPdxMTTOMetricasOEE_{PVC,PeadLiso,Corrugado,INY}`.
- Verificacion: `SELECT PROCEDURE_NAME FROM SYS.PROCEDURES WHERE SCHEMA_NAME = '<schema>' AND PROCEDURE_NAME LIKE 'SpPdxMTTOMetricasOEE%' AND DEFINITION LIKE '%TIENE_3_FIRMAS%';` debe devolver 4 filas.
- Antes de aplicar, respaldar `SYS.PROCEDURES.DEFINITION` de los 4 SP (la consulta viene incluida en el script).
- Version previa respaldada en `../../SQL_ORIGINALES/SpPdxMTTOMetricasOEE_*_ANTES_3_FIRMAS_20261118.sql`.
- Detalle en `../MIGRACIONES_APLICADAS.md` (seccion 9).

