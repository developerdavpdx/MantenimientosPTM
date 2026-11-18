# Bitácora de migraciones aplicadas

Última actualización: 17/11/2026
Responsable de la reorganización: sesión OpenCode
Nota: “Aplicado/validado” significa que el usuario confirmó su ejecución/validación en el ambiente correspondiente.

> **Regla de sintaxis on-premise:** en `TEST_JUNIO_2026` y `PTM_2022_FINAL` usar siempre **`ALTER PROCEDURE`**. **`CREATE OR REPLACE PROCEDURE` no funciona en on-premise**; solo se usa en HANA Cloud (`DBADMIN`).

## Resumen

| Fecha | Ambiente | Script / cambio | Estado | Notas |
|---|---|---|---|---|
| 05/11/2026 | TEST_JUNIO_2026 | `MIGRACION_TEST_JUNIO_2026.sql` | Aplicado/validado | 11 SPs + columna `TIEMPO_MUERTO_HERRAMENTALES` |
| 05/11/2026 | PTM_2022_FINAL | `MIGRACION_PTM_2022_FINAL.sql` | Aplicado/validado | 11 SPs + columna `TIEMPO_MUERTO_HERRAMENTALES` |
| 05/11/2026 | TEST/PTM | `MIGRACION_CALENDARIO_FILTROS_*` | Aplicado/validado | Filtros de Calendario |
| 05/11/2026 | TEST/PTM | `MIGRACION_PREVENTIVOS_REPROGRAMACION_*` | Aplicado/validado | Versión anterior del SP de rango; hoy en `OBSOLETO/` |
| 05/11/2026 | TEST/PTM | `MIGRACION_COMENTARIOS_CORRUGADO_*` | Aplicado/validado | Comentarios en Corrugado |
| 05/11/2026 | TEST/PTM | `MIGRACION_ELIMINAR_TIEMPOS_MUERTOS_*` | Aplicado/validado | SPs de eliminación |
| 05/11/2026 | TEST/PTM | `MIGRACION_NORMALIZAR_OT_TIEMPOS_MUERTOS_*` | Aplicado/validado | Normalización de OTMC/OTMP/ID_PARO |
| 09/11/2026 | DBADMIN/TEST/PTM | `MIGRACION_BAJA_MOTIVO_NULL_*` | Aplicado/validado | `MOTIVO_BAJA` nullable |
| 10/11/2026 | DBADMIN | `MIGRACION_ALMACEN_TABLAS*.sql` | Aplicado/validado | 15 tablas de Almacén |
| 10/11/2026 | DBADMIN | `MIGRACION_ALMACEN_SP*.sql` | Aplicado/validado | 42 SPs de Almacén |
| 10/11/2026 | DBADMIN | `SEED_OPRC_REAL.sql`, `SEED_OUBR_REAL.sql` | Aplicado/validado | Catálogos reales TEST_JUNIO_2026 |
| 10/11/2026 | DBADMIN | `SEED_ALMACEN_PRUEBA_REAL.sql` | Aplicado/validado | Seed multi-artículo |
| 10/11/2026 | DBADMIN/TEST/PTM | `MIGRACION_PREVENTIVOS_SP_RANGO.sql` | Aplicado/validado | Versión corregida: fechas reales siempre, sin colchón y sin duplicados |
| 10/11/2026 | DBADMIN/TEST/PTM | `MIGRACION_PREVENTIVOS_SP_SOLICITAR_REPROGRAMACION.sql` | Aplicado/validado | Si ID=0, actualiza la última solicitud de la OT; si no existe, inserta |
| 10/11/2026 | — | Columna `TIEMPO_MUERTO_HERRAMENTALES` | Validado | Ya no es pendiente |
| 10/11/2026 | — | Código app Preventivos (JS/CSHTML/CSS/Controller) | Desplegado | Publicado en pruebas/producción (confirmado 11/11/2026) |
| 11/11/2026 | DBADMIN | `MIGRACION_ALMACEN_DEVOLUCION_COSTO_PROMEDIO.sql` | Aplicado/validado | SPs de salida y detalle devuelven `CostoPromedio` (`OITM.AvgPrice`); modal con costo y valor |
| 11/11/2026 | TEST/PTM | `MIGRACION_DEVOLUCION_COSTO_PROMEDIO_*.sql` | **Pendiente** | Aplicar en servidor antes de probar devoluciones |
| 11/11/2026 | DBADMIN | `FIX_CLASIFICACION_ABOCINADORES_DBADMIN.sql` | Aplicado/validado | 6 Abocinadores de planta 2: HERRAMENTALES → MANTENIMIENTO |
| 12/11/2026 | TEST/PTM | Clasificación de Abocinadores | Aplicado/validado | Confirmado por el usuario (12/11/2026) |
| 17/11/2026 | DBADMIN | Tiempos Muertos / NWSCALE (4 procesos) | Aplicado/validado | Columnas, claves, índices únicos, 4 SPs de consulta y 4 de guardado |
| 17/11/2026 | PTM_2022_FINAL | Tiempos Muertos / NWSCALE (4 procesos) | Aplicado/validado | 0 duplicados y 0 sin token en las 4 tablas; 4 índices únicos; 4 SPs de guardado con 4 parámetros nuevos. DLL + JS + vistas publicados 18/11/2026 |
| 18/11/2026 | TEST_JUNIO_2026 | Tiempos Muertos / NWSCALE (4 procesos) | **Pendiente** | Paquete en `PENDIENTES/TEST_JUNIO_2026/PRODUCCION/TIEMPOS_MUERTOS_NWSCALE/` (aplicar 18/11/2026) |
| 18/11/2026 | DBADMIN | Correctivos: índices únicos + token de versión | Aplicado/validado | `APLICADOS/DBADMIN/CORRECTIVOS/20261118_CORRECTIVO_INDICES_Y_TOKEN_DBADMIN.sql` |
| 18/11/2026 | PTM_2022_FINAL | Correctivos: índices únicos + token de versión | Aplicado/validado | OT_MC_DUPS 0, MCG_DUPS 0, 2 índices, 1 validador. `APLICADOS/PTM_2022_FINAL/PRODUCCION/CORRECTIVOS/` |
| 18/11/2026 | TEST_JUNIO_2026 | Correctivos: índices únicos + token de versión | **Pendiente** | `PENDIENTES/TEST_JUNIO_2026/PRODUCCION/CORRECTIVOS/` |

## Detalle de los cambios clave

### 1. Columna `TIEMPO_MUERTO_HERRAMENTALES`
- Tabla: `PdxMTTOTiemposMuertosProduccionCorrugado`
- Tipo: `DECIMAL(10,2) DEFAULT 0`
- Estado: **validado por el usuario**.
- Scripts: `APLICADOS/TEST_JUNIO_2026/MIGRACION_TEST_JUNIO_2026.sql` y `APLICADOS/PTM_2022_FINAL/MIGRACION_PTM_2022_FINAL.sql` (históricos).

### 2. `MOTIVO_BAJA` nullable
- Tabla: `PdxMTTOSolicitudesBajaEquipos`
- Cambio: `NVARCHAR(500) NULL`
- Estado: **aplicado/validado**.
- Scripts:
  - `APLICADOS/DBADMIN/MIGRACION_BAJA_MOTIVO_NULL_DBADMIN.sql`
  - `APLICADOS/TEST_JUNIO_2026/MIGRACION_BAJA_MOTIVO_NULL_TEST_JUNIO_2026.sql`
  - `APLICADOS/PTM_2022_FINAL/MIGRACION_BAJA_MOTIVO_NULL_PTM_2022_FINAL.sql`

### 3. SP `SpPdxMTTOObtenerMantenimientosPorRango` - fechas reales
- **Versión vigente:** `APLICADOS/COMUN/MIGRACION_PREVENTIVOS_SP_RANGO.sql`
  - Prioriza `FECHA_REAL_INICIO` / `FECHA_REAL_FIN` **siempre que existan**, sin importar `ENVIAR_SIGUIENTE_MES`.
  - Mantiene el no-colchón para reprogramaciones a +2 meses.
  - Toma **una sola solicitud por `NUMERO_ORDEN`** para evitar duplicados.
  - **Aplicada/validada** en DBADMIN, TEST_JUNIO_2026 y PTM_2022_FINAL.
- **Versión anterior:** `OBSOLETO/MIGRACION_PREVENTIVOS_SP_RANGO_VERSION_ANTERIOR.sql`
  - Ignoraba las fechas reales cuando `ENVIAR_SIGUIENTE_MES = TRUE`; se revirtió en producción.
- **Safeguard de solicitud:** `APLICADOS/COMUN/MIGRACION_PREVENTIVOS_SP_SOLICITAR_REPROGRAMACION.sql`
  - Si `P_ID_SOLICITUD` viene en 0/null, actualiza la última solicitud no rechazada del mismo `NUMERO_ORDEN`; si no existe, inserta una nueva.
  - **Aplicado/validado** en DBADMIN, TEST_JUNIO_2026 y PTM_2022_FINAL.
- **Cuidado:** los scripts grandes `MIGRACION_TEST_JUNIO_2026.sql` y `MIGRACION_PTM_2022_FINAL.sql` contienen la versión vieja con colchón ±1 mes; no re-ejecutarlos completos.

### 4. Costo promedio en devoluciones (`SpPdxMTTOGetArticuloSalidaM` y `SpPdxMTTOGetSalidasPorOT`)
- **Requerimiento:** la entrada por devolución (`InventoryGenEntries`) debe valuarse con el costo promedio del artículo al momento de la devolución.
- **SPs:** agregan `T1."AvgPrice"` / `I."AvgPrice"` como `"CostoPromedio"` (se usa `OITM.AvgPrice`; `OITW.AvgPrice` está en 0).
- **C#:** `LogicaAlmacen.CrearEntradaDevolucionAsync` envía ese valor en `DocumentLines[].Price`.
- **UI:** el modal de devolución muestra **Costo Prom.**, **Valor** por fila y el total **Valor a devolver**, recalculado al cambiar cantidades o selección.
- **DBADMIN:** `APLICADOS/DBADMIN/ALMACEN/MIGRACION_ALMACEN_DEVOLUCION_COSTO_PROMEDIO.sql` — **aplicado**.
- **TEST/PTM:** `PENDIENTES/MIGRACION_DEVOLUCION_COSTO_PROMEDIO_TEST_JUNIO_2026.sql` y `..._PTM_2022_FINAL.sql` — **pendientes de aplicar en servidor** (usan `ALTER PROCEDURE`; on-premise no soporta `CREATE OR REPLACE`).
- **Validación local:** SP probado con solicitudes 900003 (9.8589) y 900007 (4.6748); UI probada con OTMC-001 (total $151.13 y recálculo a $131.41 al cambiar una cantidad). El POST a SAP no se pudo probar en cloud (Service Layer inaccesible).

### 5. Clasificación de Abocinadores (planta 2)
- **Problema:** el técnico Miguel Medina (posición 3, TEC MTTO) no veía la OTMP-014.
- **Causa:** el equipo Abocinador 9 estaba como `HERRAMENTALES`; la regla de posiciones del SP solo muestra `MANTENIMIENTO` a TEC MTTO.
- **Cambio DBADMIN:** 6 equipos `Abocinador N` (IDs 377, 391, 435, 465, 473, 481) pasaron de `HERRAMENTALES` a `MANTENIMIENTO`.
- **Script:** `APLICADOS/DBADMIN/FIX_CLASIFICACION_ABOCINADORES_DBADMIN.sql` — **aplicado/validado**.
- **Validación:** el usuario de Miguel ahora ve OTMP-014, 015, 016 y 017.
- **Estado:** **resuelto/aplicado** en TEST_JUNIO_2026 (y PTM_2022_FINAL si aplicaba), confirmado por el usuario el 12/11/2026.

### 6. Preventivos - rutinas duplicadas y edicion concurrente (2026-11-17)
- **Problema:** `PdxMTTORutinasMP` tenia 2 filas con el mismo `ID_MANTENIMIENTO`; el `LEFT JOIN` del SP de rango duplicaba la OT en el grid. Ademas, dos tecnicos podian guardar la misma OT y el segundo pisaba al primero.
- **Solucion:**
  - Indices `UNIQUE` en `ID_MANTENIMIENTO` de `PdxMTTORutinasMP` y `PdxMTTOOrdenesTrabajoMP`.
  - `SpPdxMTTOGuardarRutinaMP` con `MERGE` atomico (ya no `IF EXISTS/INSERT/UPDATE`).
  - Control de concurrencia optimista con `FECHA_ULT_MOD`: `SpPdxMTTOObtenerTokensOT` + `SpPdxMTTOValidarTokenGuardado`.
  - Portal: candado por mantenimiento, validacion dentro del candado y respuesta `CONFLICTO` sin sobrescribir.
- **Scripts aplicados:**
  - `APLICADOS/DBADMIN/PREVENTIVOS/` (4 scripts).
  - `APLICADOS/PTM_2022_FINAL/PREVENTIVOS/` (4 scripts).
  - `APLICADOS/TEST_JUNIO_2026/PREVENTIVOS/` (4 scripts).
- **C# / JS:** `MantenimientosPreventivosController.cs`, `AccesoDatosMantenimientosPreventivos.cs`, `GlobalCommands.cs`, `mantenimientos_preventivos_refactor.js`.
- **Estado:** aplicado/validado en DBADMIN, PTM_2022_FINAL y TEST_JUNIO_2026 el 17/11/2026. DLL + JS publicados en `MantenimientosRelease` y `MantenimientosTest` (publicacion en caliente) el 17/11/2026.

### 7. Tiempos Muertos / NWSCALE - duplicados y edicion concurrente (2026-11-17)
- **Problema:** NWSCALE insertaba una fila por producto/turno en cada consulta y las filas manuales se duplicaban por fecha+línea. Además, dos usuarios podían guardar la misma fila y el segundo pisaba al primero.
- **Diseño:**
  - Una sola fila por `CLAVE_SYNC`: `N|PLANTA|RANGO|FECHA_INI|FECHA_FIN|LINEA|PRODUCTO` (rango), `N|PLANTA|DIA|FECHA|LINEA|PRODUCTO|TURNO` (día), `M|PLANTA|FECHA|LINEA` (manual).
  - NWSCALE se mantiene como **resumen por rango** con clave de rango estable.
  - Upsert por clave en el servidor, dedupe de `OTMC`/`OTMP`/`ID_PARO` y token de versión (`TO_VARCHAR(FECHA_ACTUALIZACION,'YYYYMMDDHH24MISSFF6')`).
  - Índices únicos `UX_TM_{PVC|INY|CORRUGADO|PEAD}_CLAVE_SYNC`.
  - En duplicados manuales se conserva el `ID_REGISTRO` menor.
- **DBADMIN (aplicado 17/11/2026):**
  - Columnas `ORIGEN`, `CLAVE_SYNC`, `MODO`, `FECHA_INICIO_RANGO`, `FECHA_FIN_RANGO`.
  - Limpieza: PVC 235 → 220 filas; 0 duplicados en las 4 tablas.
  - 4 SPs de consulta y 4 de guardado con upsert/dedupe/token.
  - Respaldo: `PdxMTTOTiemposMuertosProduccionPVC_BAK_20261117`.
  - Prueba end-to-end en INY: insert con token, segundo guardado actualiza la misma fila; token viejo → `CONFLICTO`.
- **Código:** `ProduccionController.cs`, `AccesoDatosProduccion.cs`, `Global.js`, los 4 `produccion_*_refactor.js` y las 4 vistas (`?v=20261113-13`).
- **Filtro inicial:** los 4 procesos abren con la fecha del día (`DateUtils.obtenerFechaActual()`).
- **Pruebas en portal (17/11/2026):** ciclo completo con admin + técnico + supervisor en los 4 procesos. Correctivo + preventivo + paro unificados en una fila; doble guardado sin duplicar; NWSCALE día y rango probado en PVC e INY (y con semilla de prueba también en Corrugado y PEAD).
- **Correcciones derivadas de las pruebas:**
  - Preventivos ahora usan `FechaRealInicio` (antes `HoraApertura`/`FechaInicioMantenimiento`, ignorando la reprogramación). Commit `b558f05`.
  - INY: el parser de fecha de preventivos no quitaba la hora y rompía el guardado. Commit `125309a`.
  - Paros: se conserva el área al buscar líneas y se valida antes de agregar (evita `ID_AREA=0`). Commit `12811fc`.
  - Corrugado/PEAD: etiquetas del mapa de respaldo alineadas al catálogo (`LÍNEA ...`). Commit `fc7dc8e`.
- **PTM_2022_FINAL:** **aplicado/validado el 17/11/2026**. Paquete en `APLICADOS/PTM_2022_FINAL/PRODUCCION/TIEMPOS_MUERTOS_NWSCALE/` (scripts 00 a 07, respaldo antes de borrar).
  - Resultado del 07: 7 columnas por tabla, 4 índices `CPBTREE UNIQUE`, **0 duplicados**, **0 filas sin token**, y los 4 SPs de guardado con 4 parámetros nuevos.
  - Filas: PVC 251 (190 NWSCALE / 17 MANUAL / 44 LEGACY), INY 10 (9 / 0 / 1), Corrugado 87 (0 / 1 / 86), PEAD Liso 197 (0 / 0 / 197).
  - **Código publicado en PTM_2022_FINAL el 18/11/2026:** `MantenimientosPTM.dll`, `Global.js`, los 4 `produccion_*_refactor.js` (PVC `?v=20261113-14`; INY/Corrugado/PEAD `?v=20261113-15`), las 4 vistas `Produccion_*.cshtml`, `ParosProduccion.cshtml` y `paros_produccion_refactor.js?v=20261117-2`.

### 8. Correctivos - guardado blindado (2026-11-18)
- **Problema:** la OT de correctivo no tenía token de versión. Borrador y firma ya usaban `MERGE` por `NUMERO_ORDEN` (no duplicaban la OT), pero sin índice único ni aviso de conflicto: dos usuarios podían pisarse (last write wins).
- **Solución (mismo patrón que Preventivos):**
  - Índices `UNIQUE` `UX_PdxMTTOOrdenesTrabajoMC_NUMORDEN` y `UX_PdxMTTOMCGenerados_NUMORDEN` (con limpieza previa de duplicados).
  - `SpPdxMTTOValidarTokenOTCorrectivo` (devuelve `OK` / `CONFLICTO`).
  - `SpPdxMTTOObtenerMantenimientosCorrectivos` devuelve `TOKEN` (`FECHA_ULT_MOD`).
  - `MantenimientosCorrectivosController`: valida el token antes de guardar borrador/firma y responde `CONFLICTO`; después de guardar devuelve el token nuevo.
  - `mantenimientos_correctivos_refactor.js`: envía `TOKEN`, maneja `CONFLICTO` y actualiza el token tras guardar.
- **DBADMIN:** aplicado y probado en portal (borrador, segundo guardado sin conflicto y conflicto simulado con token viejo).
- **PTM_2022_FINAL:** **aplicado/validado el 18/11/2026**. Resultado: `OT_MC_DUPS 0`, `MCG_DUPS 0`, `INDICES 2`, `VALIDADOR 1`. Script en `APLICADOS/PTM_2022_FINAL/PRODUCCION/CORRECTIVOS/`.
- **TEST_JUNIO_2026:** script pendiente en `PENDIENTES/TEST_JUNIO_2026/PRODUCCION/CORRECTIVOS/`.
- **Orden de despliegue:** aplicar SQL primero, luego publicar DLL + `mantenimientos_correctivos_refactor.js`.

## Obsoletos

En `OBSOLETO/`:
- `MIGRACION_PREVENTIVOS_REPROGRAMACION_TEST_JUNIO_2026.sql`
- `MIGRACION_PREVENTIVOS_REPROGRAMACION_PTM_2022_FINAL.sql`
- `MIGRACION_PREVENTIVOS_SP_RANGO_VERSION_ANTERIOR.sql`
- `SQL_APLICADOS_DEV_SpPdxMTTOObtenerMantenimientosPorRango.sql`

Motivo: contienen versiones anteriores del SP de rango. La versión vigente está en `APLICADOS/COMUN/MIGRACION_PREVENTIVOS_SP_RANGO.sql`.

## Pendientes SQL
- `PENDIENTES/` contiene actualmente:
  - `MIGRACION_DEVOLUCION_COSTO_PROMEDIO_TEST_JUNIO_2026.sql`
  - `MIGRACION_DEVOLUCION_COSTO_PROMEDIO_PTM_2022_FINAL.sql`
- Al aplicarse en el servidor, moverlos a `APLICADOS/<schema>/` y actualizar esta bitácora.
- Regla general: si `PENDIENTES/` no tiene scripts SQL, todo está al día.
