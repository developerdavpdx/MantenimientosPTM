# Bitácora de migraciones aplicadas

Última actualización: 11/11/2026
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
| 11/11/2026 | TEST/PTM | Clasificación de Abocinadores | **Pendiente** | Replicar el `UPDATE` en TEST_JUNIO_2026 (y PTM si aplica) |

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
- **Pendiente:** replicar el `UPDATE` en TEST_JUNIO_2026 (y PTM_2022_FINAL si aplica).

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
