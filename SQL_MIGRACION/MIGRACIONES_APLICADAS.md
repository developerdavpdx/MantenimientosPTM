# Bitácora de migraciones aplicadas

Última actualización: 24/11/2026
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
| 11/11/2026 | TEST/PTM | `MIGRACION_DEVOLUCION_COSTO_PROMEDIO_*.sql` | Aplicado/validado | DBADMIN, TEST_JUNIO_2026 y PTM_2022_FINAL aplicados (18/11/2026). Scripts en `APLICADOS/<schema>/ALMACEN/` |
| 11/11/2026 | DBADMIN | `FIX_CLASIFICACION_ABOCINADORES_DBADMIN.sql` | Aplicado/validado | 6 Abocinadores de planta 2: HERRAMENTALES → MANTENIMIENTO |
| 12/11/2026 | TEST/PTM | Clasificación de Abocinadores | Aplicado/validado | Confirmado por el usuario (12/11/2026) |
| 17/11/2026 | DBADMIN | Tiempos Muertos / NWSCALE (4 procesos) | Aplicado/validado | Columnas, claves, índices únicos, 4 SPs de consulta y 4 de guardado |
| 17/11/2026 | PTM_2022_FINAL | Tiempos Muertos / NWSCALE (4 procesos) | Aplicado/validado | 0 duplicados y 0 sin token en las 4 tablas; 4 índices únicos; 4 SPs de guardado con 4 parámetros nuevos. DLL + JS + vistas publicados 18/11/2026 |
| 18/11/2026 | TEST_JUNIO_2026 | Tiempos Muertos / NWSCALE (4 procesos) | Aplicado/validado | Confirmado por el usuario el 18/11/2026. Scripts en `APLICADOS/TEST_JUNIO_2026/PRODUCCION/BITACORAS_TIEMPOS_MUERTOS/` |
| 18/11/2026 | DBADMIN | Correctivos: índices únicos + token de versión | Aplicado/validado | `APLICADOS/DBADMIN/CORRECTIVOS/20261118_CORRECTIVO_INDICES_Y_TOKEN_DBADMIN.sql` |
| 18/11/2026 | PTM_2022_FINAL | Correctivos: índices únicos + token de versión | Aplicado/validado | OT_MC_DUPS 0, MCG_DUPS 0, 2 índices, 1 validador. `APLICADOS/PTM_2022_FINAL/PRODUCCION/CORRECTIVOS/` |
| 18/11/2026 | TEST_JUNIO_2026 | Correctivos: indices unicos + token de version | Aplicado/validado | OT_MC_DUPS 0, MCG_DUPS 0, INDICES 2, VALIDADOR 1. `APLICADOS/TEST_JUNIO_2026/PRODUCCION/CORRECTIVOS/` |
| 18/11/2026 | DBADMIN | Métricas OEE: cumplimiento PM con las 3 firmas | Aplicado/validado | 4 SP `SpPdxMTTOMetricasOEE_*`; el numerador solo cuenta PM cerrados con 3 firmas. `APLICADOS/DBADMIN/METRICAS/20261118_METRICAS_OEE_CUMPLIMIENTO_PM_3_FIRMAS_DBADMIN.sql` |
| 18/11/2026 | TEST_JUNIO_2026 | Metricas OEE: cumplimiento PM con las 3 firmas | Aplicado/validado | 4 ALTER PROCEDURE aplicados el 18/11/2026. `APLICADOS/TEST_JUNIO_2026/METRICAS/` |
| 18/11/2026 | PTM_2022_FINAL | Metricas OEE: cumplimiento PM con las 3 firmas | Aplicado/validado | 4 ALTER PROCEDURE aplicados el 18/11/2026. `APLICADOS/PTM_2022_FINAL/METRICAS/` |
| 23/11/2026 | DBADMIN | Correctivos: bitácoras excluyen OTs con máquina operando | Aplicado/validado en portal | `P_LINEA_PROD=1` requiere `MAQUINA_DETENIDA=1`; la pantalla Correctivos no cambia. `APLICADOS/DBADMIN/CORRECTIVOS/20261123_CORRECTIVOS_SOLO_MAQUINA_DETENIDA_DBADMIN.sql` |
| 23/11/2026 | DBADMIN | Métricas: N° de paradas no cuenta filas con 0 horas y clasificación NULL | Aplicado/validado en portal | Rama `P_CLASIFICACION IS NULL` en los 4 SPs; solo cambia el conteo, no horas/OEE. `APLICADOS/DBADMIN/METRICAS/20261123_METRICAS_NPARADAS_NULL_DBADMIN.sql` |
| 23/11/2026 | DBADMIN | Saneamiento de bitácoras (Fix 3 opción B) | Aplicado/validado en portal | Filas con OTs sin paro quedan con OTMC NULL; horas recalculadas inicio→fin técnico; derivados recalculados. Rollback en `TMP_BAK_*_20261123`. `APLICADOS/DBADMIN/PRODUCCION/20261123_SANEAMIENTO_BITACORAS_OTMC_MAQUINA_DETENIDA_DBADMIN.sql` |
| 23/11/2026 | TEST_JUNIO_2026 | Correctivos: bitácoras excluyen OTs con máquina operando | Aplicado/validado en portal (8081) | Endpoint solo devolvió OTMC-012 (con paro); cálculo 15.3667 h decimales; carátula con estado derivado; INY sin [ERROR]. `APLICADOS/TEST_JUNIO_2026/PRODUCCION/CORRECTIVOS/20261123_CORRECTIVOS_SOLO_MAQUINA_DETENIDA_TEST_JUNIO_2026.sql` |
| 23/11/2026 | PTM_2022_FINAL | Correctivos: bitácoras excluyen OTs con máquina operando | Aplicado | Respaldo previo de tablas+SPs del usuario. `APLICADOS/PTM_2022_FINAL/PRODUCCION/CORRECTIVOS/20261123_CORRECTIVOS_SOLO_MAQUINA_DETENIDA_PTM_2022_FINAL.sql` |
| 23/11/2026 | TEST_JUNIO_2026 | Métricas: N° de paradas no cuenta filas con 0 horas y clasificación NULL | Aplicado/validado en portal (8081) | `APLICADOS/TEST_JUNIO_2026/METRICAS/20261123_METRICAS_NPARADAS_NULL_TEST_JUNIO_2026.sql` |
| 23/11/2026 | PTM_2022_FINAL | Métricas: N° de paradas no cuenta filas con 0 horas y clasificación NULL | Aplicado | `APLICADOS/PTM_2022_FINAL/METRICAS/20261123_METRICAS_NPARADAS_NULL_PTM_2022_FINAL.sql` |
| 23/11/2026 | TEST_JUNIO_2026 | Saneamiento de bitácoras (Fix 3 opción B) | Aplicado | PVC 29 filas saneadas, paradas 0 (sin OTs con paro guardadas). `APLICADOS/TEST_JUNIO_2026/PRODUCCION/20261123_SANEAMIENTO_BITACORAS_OTMC_MAQUINA_DETENIDA_TEST_JUNIO_2026.sql` |
| 23/11/2026 | PTM_2022_FINAL | Saneamiento de bitácoras (Fix 3 opción B) | Aplicado | De 32 OTs en bitácora PVC, 3 con paro real. Rollback: respaldo externo + `TMP_BAK_*_20261123` del schema. `APLICADOS/PTM_2022_FINAL/PRODUCCION/20261123_SANEAMIENTO_BITACORAS_OTMC_MAQUINA_DETENIDA_PTM_2022_FINAL.sql` |
| 23/11/2026 | DBADMIN | Almacén: dropdowns de centros de costos solo activos | Aplicado/validado en portal | `SpPdxMTTOGetCostCenters` filtra `Active = 'Y'` (antes ofrecía PPEA "CODIGO ERRONEO"). Junto con el JS que bloquea salidas sin las 4 dimensiones de costeo. `APLICADOS/DBADMIN/ALMACEN/20261123_ALMACEN_COSTCENTERS_ACTIVOS_DBADMIN.sql` |
| 23/11/2026 | TEST_JUNIO_2026 | Almacén: dropdowns de centros de costos solo activos | Aplicado/validado (8081) | Se requirió re-aplicar con la tabla `OPRC` calificada (ver nota del fix). El catálogo dim 2 ya no devuelve PPEA. `APLICADOS/TEST_JUNIO_2026/ALMACEN/20261123_ALMACEN_COSTCENTERS_ACTIVOS_TEST_JUNIO_2026.sql` |
| 23/11/2026 | PTM_2022_FINAL | Almacén: dropdowns de centros de costos solo activos | Aplicado/validado (`CALL` dim 2 = 10 centros sin PPEA) | `APLICADOS/PTM_2022_FINAL/ALMACEN/20261123_ALMACEN_COSTCENTERS_ACTIVOS_PTM_2022_FINAL.sql` |
| 24/11/2026 | DBADMIN | Paros: el filtro Proceso aplica a los correctivos (`COR-xx`) y solo se muestran líneas de producción | Aplicado/validado en portal | `SpPdxMTTOObtenerParosProduccion`: rama de correctivos con `E.AREA = :p_ID_AREA` + `LE.PRODUCCION = 1`; rama manual con `LIN.PRODUCCION = 1` solo cuando llama el reporte. Pruebas P1 04–17/11: Proceso PVC 24 filas, PEAD LISO 2, sin proceso 28, Línea 6 PVC 6. `APLICADOS/DBADMIN/PAROS/20261124_PAROS_FILTROS_Y_DURACION_TECNICO_DBADMIN.sql` |
| 24/11/2026 | DBADMIN | Paros: categorías de mantenimiento del modal "Registrar Paro" | **Revertido el mismo día** | Se apagaron (`STATUS = 0`) `CORRECTIVO`, `MANTENIMIENTO PREVENTIVO` y `MTTO CORRECTIVOS`, pero el usuario confirmó que también son categorías de **producción** y deben seguir disponibles: se reactivaron (`STATUS = 1`). `APLICADOS/DBADMIN/PRODUCCION/20261124_PAROS_CATEGORIAS_MANTENIMIENTO_REACTIVADAS_DBADMIN.sql`; el apagado quedó en `OBSOLETO/20261124_PAROS_CATEGORIAS_MANTENIMIENTO_OFF_DBADMIN_REVERTIDO.sql` |
| 24/11/2026 | App (JS) | Refacciones de la OT: autorizar/rechazar/cerrar ya no cierra el modal | Aplicado en portal | `mantenimientos_correctivos_refactor.js` y `mantenimientos_preventivos_refactor.js`: se quitó el `modal.hide()` posterior a cada acción; el botón de la fila cambia de estado y se puede seguir con las demás refacciones. Probado en portal con `OTMC-021` (2 refacciones) y `OTMP-157`. Publicar los 2 JS en TEST/PTM (sin DLL). |
| 24/11/2026 | DBADMIN | Refacciones de la OT: la orden regresa a **Liberado** cuando ya no queda ninguna refacción pendiente | Aplicado/validado en portal | `SpPdxMTTOGetBalanceOT` ya no cuenta como bloqueantes las solicitudes `Cerrada`/`ELIMINADA`; `SpPdxMTTOActualizarSolicitudRefaccion` y `SpPdxMTTOUpdateEstatusSolicitud` reevalúan y liberan; `SpPdxMTTOActualizaMC`/`MP` no bajan a 2 con refacciones pendientes. Prueba `OTMC-028`: 1 de 3 cerrada → sigue en 3; las 3 cerradas → pasa a 2. `APLICADOS/DBADMIN/ALMACEN/20261124_REFACCIONES_LIBERAR_OT_AL_RESOLVER_DBADMIN.sql` |
| 24/11/2026 | DBADMIN | Refacciones: barrido de OT atoradas en "En espera de refacción" | Aplicado (0 casos en DBADMIN) | Libera a 2 las OT en `ESTATUS = 3` sin solicitudes bloqueantes (incluye sin solicitudes). Re-ejecutable. `APLICADOS/DBADMIN/ALMACEN/20261124_REFACCIONES_BARRIDO_OT_EN_ESPERA_DBADMIN.sql`; verificación por OT en `VERIFICACION/20261124_VERIF_REFACCIONES_ESTATUS_OT.sql` |
| 24/11/2026 | DBADMIN | Paros: `SERVICIOS` de planta 2 estaba como línea de producción | Aplicado | `PdxMTTOLineasxPlanta(PLANTA 2, SERVICIOS)` pasa a `PRODUCCION = 0` (respaldo `PdxMTTOLineasxPlanta_BAK_20261124`); además el SP del reporte excluye por nombre las líneas no productivas. `APLICADOS/DBADMIN/PAROS/20261124_PAROS_LINEA_SERVICIOS_P2_NO_PRODUCCION_DBADMIN.sql` |
| 24/11/2026 | PTM_2022_FINAL | Paquete 24/11: Paros (filtros + duración), `SERVICIOS` P2 a `PRODUCCION = 0`, Refacciones (5 SP) y barrido de OTs en espera | Aplicado/validado en portal (P1 y P2) | Reporte P1: 66 PVC / 4 PEAD CORR / 7 PEAD LISO, 0 líneas no productivas. P2: 33 (32 PVC + 1 INY), antes 42 con 9 de `SERVICIOS`. `OTMC-028` (DBADMIN) y `OTMC-072` (PTM, liberada con el barrido) pasan a Liberado. Incluye el SP de bitácora de preventivos (fecha de ejecución). Pendiente solo `TEST_JUNIO_2026`. |

## Detalle de los cambios clave

### Correctivos - filtrar OTs sin paro al alimentar bitácoras (2026-11-23)
- El SP `SpPdxMTTOObtenerMantenimientosCorrectivos` ahora requiere `OT.MAQUINA_DETENIDA = 1` cuando `P_LINEA_PROD` no es NULL. El controller manda `P_LINEA_PROD = 1` solo para llamadas desde bitácoras.
- La consulta de la pantalla de Correctivos manda `P_LINEA_PROD = NULL`, por lo que conserva las OTs donde la máquina operó normalmente.
- DBADMIN: aplicado y validado desde el portal (la OT QA con `MAQUINA_DETENIDA=0` no entra a bitácora; la de `=1` sí; la pantalla normal sigue mostrando la OT sin paro). Seeds temporales limpiados.
- Aplicado el 23/11 en TEST_JUNIO_2026 y PTM_2022_FINAL: `APLICADOS/<schema>/PRODUCCION/CORRECTIVOS/20261123_CORRECTIVOS_SOLO_MAQUINA_DETENIDA_<schema>.sql`.

### Métricas - N° de paradas sin horas no cuenta (2026-11-23)
- Los 4 SPs `SpPdxMTTOMetricasOEE_*` agregaron la rama `WHEN :P_CLASIFICACION IS NULL AND (suma de horas de paro) = 0 THEN 0` en el CASE de `N_OTMC`. Antes, con "Todas las clasificaciones", el ELSE contaba todas las `OTMC-` del string aunque la fila tuviera 0 horas (caso OTMC-113/OTMC-037).
- Solo cambia el conteo: horas de paro, OEE y disponibilidad no se tocan.
- Validación funcional: dos filas sembradas (0.00 h y 0.75 h) en PVC 21/11 → antes 2 paradas / MTTR 0.38 / MTBF 7.63; después 1 parada / MTTR 0.75 / MTBF 15.25. `CALL` a los 4 SPs OK; `MANTENIMIENTO` → 1 y `HERRAMENTALES` → 0 (ramas previas intactas). Seeds limpiados.
- Aplicado el 23/11 en ambos schemas: `APLICADOS/<schema>/METRICAS/20261123_METRICAS_NPARADAS_NULL_<schema>.sql`.
- Pendiente conocido: filas históricas con horas > 0 provenientes de OTs que no pararon (p. ej. 21.55 h) siguen contando 1 parada; eso lo resuelve el saneamiento (Fix 3).

### Saneamiento de bitácoras - Fix 3 opción B (2026-11-23)
- Reescribió `OTMC`/horas de paro/derivados de las filas con OTMC en las 4 tablas: se conservan solo las OTs con `MAQUINA_DETENIDA = 1` (las sin paro y las órdenes sin fila de OT quedan fuera); horas con el criterio nuevo inicio→fin técnico; `TIEMPO_PRODUCTIVO`, `KG_NETOS_HR_REALES`, `Rendimiento`, `EficienciaProducto`, `Disponibilidad` y `OEE` recalculados con las fórmulas del front. `FECHA_ACTUALIZACION` refrescada para invalidar tokens viejos.
- **INY usa `PORCENTAJE_DISPONIBILIDAD`** (invertido respecto a `DISPONIBILIDAD_PORCENTAJE` de las otras 3 tablas), igual que su mapeo en `produccion_iny_refactor.js`.
- Resultado DBADMIN: PVC 10 filas saneadas, horas de paro 71.87 → 2.59 (solo OTMC-001 y OTMC-017); PeadLiso 1 fila (0.20→0); Corrugado 1 fila (0.13→0); INY 0 filas. Métricas P1 noviembre en portal: paradas 13→2, T. inactividad 72.5→2.89 h (2.59 de OTs + 0.30 de una captura manual legítima sin OT, que se respeta), MTTR 5.58→1.45, MTBF 238.95→1587.96. OEE sin cambio en DBADMIN porque las filas saneadas no tenían producción; en PTM (filas mixtas) el OEE histórico sí se moverá — es el objetivo de la opción B.
- Rollback: filas en `TMP_BAK_{PVC|PEADLISO|CORRUGADO|INY}_20261123` (se conservan).
- Aplicado el 23/11 en ambos schemas: `APLICADOS/<schema>/PRODUCCION/20261123_SANEAMIENTO_BITACORAS_OTMC_MAQUINA_DETENIDA_<schema>.sql` (MERGE INTO + CREATE ... AS (SELECT)), ejecutado tras el respaldo de tablas/SPs.

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
- **TEST/PTM:** `MIGRACION_DEVOLUCION_COSTO_PROMEDIO_*.sql` aplicados el 18/11/2026 (usan `ALTER PROCEDURE`; on-premise no soporta `CREATE OR REPLACE`).
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
- **TEST_JUNIO_2026:** aplicado/validado el 18/11/2026 (OT_MC_DUPS 0, MCG_DUPS 0, INDICES 2, VALIDADOR 1) -> `APLICADOS/TEST_JUNIO_2026/PRODUCCION/CORRECTIVOS/`.
- **Orden de despliegue:** aplicar SQL primero, luego publicar DLL + `mantenimientos_correctivos_refactor.js`.

### 9. Métricas OEE - cumplimiento de PM con las 3 firmas (2026-11-18)
- **Problema:** el `% Cumplimiento de Mantenimientos Preventivos` contaba como cumplido cualquier PM con `ESTATUS = 4` (Cerrado), que se alcanza con la firma del técnico. Se reportaban PM "cumplidos" sin la firma del Supervisor de Producción ni la del Administrador de Mantenimiento.
- **Regla nueva:** un PM cuenta como cumplido **solo si** `ESTATUS = 4` **y** `FIRMA_REALIZO = 'SI'` **y** `FIRMA_SUPERVISO = 'SI'` **y** `FIRMA_MANTENIMIENTO = 'SI'`.
- **Implementación (4 SPs):** `SpPdxMTTOMetricasOEE_PVC`, `_PeadLiso`, `_Corrugado`, `_INY`.
  - `CUMPLIMIENTO_PM_FILTRADO` agrega la columna calculada `CUMPLIDO` y un `LEFT JOIN` con `PdxMTTOOrdenesTrabajoMP` agrupado por `ID_MANTENIMIENTO` (`MAX(...)` para no inflar filas; `IFNULL` para PM sin fila de OT o firmas `NULL`).
  - `CUMPLIMIENTO_PM_TOTAL` usa `SUM("CUMPLIDO")` en `TOTAL_PM_CERRADOS` y en `PORCENTAJE_CUMPLIMIENTO_PM`.
  - `TOTAL_PM_PROGRAMADOS` (denominador) **no cambia**: la regla define qué PM cuenta como cumplido, no cuántos se programaron.
  - OEE, Disponibilidad, Rendimiento, Calidad, DT, MTTR, MTBF y paros **no se tocan** (salen de la bitácora).
- **C# / JS:** sin cambios (los nombres de columna del resultset no cambian; `LogicaMetricas.ConsolidarMetricas` suma `TOTAL_PM_CERRADOS` y recalcula el %).
- **DBADMIN:** aplicado y verificado el 18/11/2026 (los 4 SP contienen `TIENE_3_FIRMAS` y `SUM("CUMPLIDO")`, 0 objetos inválidos). Script en `APLICADOS/DBADMIN/METRICAS/20261118_METRICAS_OEE_CUMPLIMIENTO_PM_3_FIRMAS_DBADMIN.sql`.
- **TEST_JUNIO_2026 y PTM_2022_FINAL:** aplicados el 18/11/2026 -> `APLICADOS/<schema>/METRICAS/` (4 `ALTER PROCEDURE` cada uno).
- **Respaldo previo:** `SQL_ORIGINALES/SpPdxMTTOMetricasOEE_{PVC,PeadLiso,Corrugado,INY}_ANTES_3_FIRMAS_20261118.sql` (ver sección nueva del `SQL_ORIGINALES/README.txt`).

## 2026-11-18 - Busqueda de articulos: REFACCIONES + INSUMOS

- **Problema:** en Mantenimientos Preventivos, Mantenimientos Correctivos y Solicitud de Refacciones el buscador de articulos solo filtraba el grupo 104 (REFACCIONES). Los INSUMOS (`OITM.ItmsGrpCod = 102`) nunca aparecian.
- **Grupos confirmados en `OITB`:** 101 MATERIAS PRIMAS, 102 INSUMOS, 103 EMPAQUE, 104 REFACCIONES, 105 EQUIPO PP, 107 HERRAMIENTAS.
- **Regla nueva:** la busqueda devuelve REFACCIONES (104) + INSUMOS (102).
- **SP `SpPdxMTTOBuscarArticulos`:** nuevo parametro `IN P_GRUPOS_ART NVARCHAR(100) DEFAULT NULL` (lista separada por comas). El filtro previo (`A."ItmsGrpCod" = :P_GRUPO_ART`) se conserva intacto y solo se aplica cuando `P_GRUPOS_ART` viene NULL/vacio, por lo que el cambio es retrocompatible.
- **C#:** `PlaneacionController.BuscarArticulo` recibe `GrupoArticulos` como string, lo normaliza a `102,104` y manda `P_GRUPOS_ART`.
- **JS:** `GestionArticulosCustom` se instancia con `'102,104'` en `mantenimientos_preventivos_refactor.js`, `mantenimientos_correctivos_refactor.js` y `solicitud_refacciones_refactor.js`.
- **DBADMIN:** aplicado y verificado el 18/11/2026. Script en `APLICADOS/DBADMIN/PLANEACION/SpPdxMTTOBuscarArticulos_INSUMOS_20261118.sql`.
- **TEST_JUNIO_2026 y PTM_2022_FINAL:** aplicados el 18/11/2026 (incluye INSUMOS + `ORDER BY`) -> `APLICADOS/<schema>/PLANEACION/`.
- **Respaldo previo:** `SQL_ORIGINALES/SpPdxMTTOBuscarArticulos_ANTES_INSUMOS_20261118.sql`.

## 2026-11-18 - Busqueda de articulos: ORDER BY por relevancia (INSUMOS visibles)

- **Problema medido:** con el `ORDER BY` por stock, los INSUMOS (grupo 102) tienen `StockTotal = 0` mientras REFACCIONES (104) trae 12..1446, asi que caian al final y el `LIMIT 400` los recortaba. En `DBADMIN` (grupos 102+104, `validFor='Y'`): `'12'` -> 2 insumos, **0** visibles en el top 400; `'A'` -> 67 insumos, **0** visibles. `'BOL'` y `'COP'` si los mostraban.
- **SP `SpPdxMTTOBuscarArticulos`:** se reemplaza **solo** el bloque `ORDER BY`. No se tocan parametros, filtros de grupo, joins ni el `LIMIT 400`.
  - Antes: `stock DESC -> prefijo ItemName -> prefijo ItemCode -> ItemName -> ItemCode`.
  - Ahora: `exacto (ItemCode|ItemName) -> prefijo (ItemCode|ItemName) -> rank de stock dentro de su grupo (intercalado) -> stock DESC -> ItemName -> ItemCode`.
  - El intercalado por grupo es necesario: el orden exacto/prefijo por si solo seguia dejando `'12'` en 0 de 2 insumos y `'A'` en 5 de 67.
- **DBADMIN:** aplicado y verificado el 18/11/2026. Script en `APLICADOS/DBADMIN/PLANEACION/SpPdxMTTOBuscarArticulos_ORDERBY_RELEVANCIA_20261118.sql`.
- **TEST_JUNIO_2026:** aplicado el 18/11/2026 -> `APLICADOS/TEST_JUNIO_2026/PLANEACION/SpPdxMTTOBuscarArticulos_INSUMOS_Y_ORDERBY_20261118_ALTER.sql`.
- **Respaldo previo:** `SQL_ORIGINALES/SpPdxMTTOBuscarArticulos_ANTES_ORDERBY_20261118.sql`.
- **Retrocompatibilidad verificada:** `GrupoArticulos=104` -> solo 104; `GrupoArticulos=110` -> solo 110.

## 2026-11-24 - Paros de Producción: filtro Proceso en correctivos y solo líneas de producción

- **Reporte del usuario:** con **Proceso = PVC** el reporte seguía mostrando paros `COR-xx` de otros procesos, y además aparecían líneas que no son de producción (`SERVICIOS`, `MEZCLADO`).
- **Causa 1 (Proceso):** `SpPdxMTTOObtenerParosProduccion` tiene dos ramas en un `UNION ALL`. La de paros manuales ya filtraba (`PAR.ID_AREA = :p_ID_AREA`); la de correctivos (`PdxMTTOSolicitudMC` + `PdxMTTOMCGenerados`) solo filtraba planta/línea/fecha/estatus y devolvía `CAST(NULL AS INT) AS ID_AREA`.
- **Causa 2 (líneas):** la rama de correctivos no revisaba `PdxMTTOLineasxPlanta.PRODUCCION`, así que entraban equipos cuya línea es de servicio (`SERVICIOS`, `MEZCLADO`).
- **Cambios en el SP:**
  1. Rama correctivos: `AND (:p_ID_AREA IS NULL OR E.AREA = :p_ID_AREA)` (área del **equipo** de la OT) y `E.AREA AS ID_AREA` en lugar de `CAST(NULL AS INT)`.
  2. Rama correctivos: `AND LE.PRODUCCION = 1` (solo líneas de producción).
  3. Rama manual: `AND (:p_INCLUIR_CORRECTIVO IS NULL OR LIN.PRODUCCION = 1)` — el filtro solo aplica cuando llama el reporte (`'S'`); las bitácoras de tiempos muertos llaman con `NULL` y no cambian.
- **No se tocó el front:** `paros_produccion_refactor.js` ya enviaba `FiltroArea = $("#FiltroProceso").val()`.
- **Pruebas (portal, DBADMIN, Planta 1, 04–17/11/2026):** Proceso **PVC** → 24 filas (antes 43, se van los 4 de PEAD y los 15 de SERVICIOS/MEZCLADO); **PEAD LISO** → 2; **sin proceso** → 28; **Línea 6 PVC + Proceso PVC** → 6. Aplicar un filtro no acumula resultados del anterior. Los 2 paros manuales (`PAR-1`, `PAR-2`) siguen visibles con su categoría.
- **Categorías del modal (revertido):** se apagaron (`STATUS = 0`) `CORRECTIVO` (29), `MANTENIMIENTO PREVENTIVO` (1) y `MTTO CORRECTIVOS` (8), pero el usuario confirmó que **también son categorías de producción** y que se quedan como estaban: se reactivaron con `STATUS = 1` (`APLICADOS/DBADMIN/PRODUCCION/20261124_PAROS_CATEGORIAS_MANTENIMIENTO_REACTIVADAS_DBADMIN.sql`). El script del apagado quedó en `OBSOLETO/` y no se generó paquete para TEST/PTM.
- **Pendiente:** `ALTER` del SP en `TEST_JUNIO_2026` y `PTM_2022_FINAL` (`PENDIENTES/<schema>/PAROS/`).
## 2026-11-24 - Refacciones: la OT regresa a Liberado al resolverse todas

- **Reporte del usuario:** `OTMC-072` quedó en **"En espera de refacción"** aunque una refacción se surtió (1) y la otra se canceló; debía pasar a **Liberado**.
- **Causa 1:** `SpPdxMTTOGetBalanceOT` solo excluía `ELIMINADA`; una solicitud `Cerrada` (cancelada por el técnico) seguía contando como bloqueante, así que `OT_LIBERADA = 0`.
- **Causa 2:** la liberación solo se ejecutaba después de una **salida de mercancía**. Al cerrar/eliminar la última refacción sin salida, nadie reevaluaba.
- **Causa 3 (adicional):** el endpoint que cierra la solicitud desde la OT forzaba `ESTATUS = 2` sin revisar pendientes (liberaba antes de tiempo); y el JS de Correctivos mandaba `TipoMantenimiento: "Preventivo"`, así que el servidor actualizaba la tabla de preventivos con un ID de correctivo y no pasaba nada.
- **Cambios (BD; sin DLL):**
  1. `SpPdxMTTOGetBalanceOT`: `Cerrada`/`ELIMINADA` cuentan como liberadas (en el detalle y en el resumen).
  2. `SpPdxMTTOActualizarSolicitudRefaccion`: al terminar cuenta los bloqueantes y libera la OT (solo si estaba en 3). Devuelve `ORDEN_TRABAJO` y `OT_LIBERADA`.
  3. `SpPdxMTTOUpdateEstatusSolicitud`: mismo reevaluado (cubre `Atendida`/`ELIMINADA`).
  4. `SpPdxMTTOActualizaMC` / `SpPdxMTTOActualizaMP`: si piden `ESTATUS = 2` y hay refacciones bloqueantes, **conservan** el estatus (no liberan antes de tiempo).
- **JS:** `mantenimientos_correctivos_refactor.js` manda `TipoMantenimiento: "Correctivo"` al cerrar la solicitud.
- **Pruebas (portal, DBADMIN, `OTMC-028` con 3 refacciones pendientes):** cerrar 1 → la OT **sigue en 3**; cerrar las 3 → pasa a **2 (Liberado)**. Datos restaurados al terminar.
- **Barrido del histórico:** los SP nuevos solo actúan en transiciones nuevas, así que las OT que ya estaban atoradas en 3 se liberan con `APLICADOS/DBADMIN/ALMACEN/20261124_REFACCIONES_BARRIDO_OT_EN_ESPERA_DBADMIN.sql` (re-ejecutable; no toca estatus 1, 2 ni 4). Diagnóstico por OT: `VERIFICACION/20261124_VERIF_REFACCIONES_ESTATUS_OT.sql`.- **Pendiente:** `ALTER` de los 5 SP en `TEST_JUNIO_2026` y `PTM_2022_FINAL` → `PENDIENTES/<schema>/ALMACEN/20261124_REFACCIONES_LIBERAR_OT_AL_RESOLVER_<schema>.sql`.
## Obsoletos

En `OBSOLETO/`:
- `MIGRACION_PREVENTIVOS_REPROGRAMACION_TEST_JUNIO_2026.sql`
- `MIGRACION_PREVENTIVOS_REPROGRAMACION_PTM_2022_FINAL.sql`
- `MIGRACION_PREVENTIVOS_SP_RANGO_VERSION_ANTERIOR.sql`
- `SQL_APLICADOS_DEV_SpPdxMTTOObtenerMantenimientosPorRango.sql`

Motivo: contienen versiones anteriores del SP de rango. La versión vigente está en `APLICADOS/COMUN/MIGRACION_PREVENTIVOS_SP_RANGO.sql`.

## 2026-11-24/25 - Bitacoras: correctivos por fecha del tecnico + saneo de noviembre

- **Reporte del usuario:** la fila del 06/11 en PVC traia `OTMP-157/160/161/162/163`, pero el tecnico cerro la 157 el 11/11 (apertura 06/11, cierre del sistema 20/11). La regla nueva ya no las vuelve a poner ahi, pero lo ya sincronizado no se mueve solo (el SP de rango excluye las OT ya sincronizadas).
- **Regla:** la fila de bitacora se pinta con `HORA_FIN` del tecnico, tambien en correctivos (`HoraFin` -> `FechaCreacion`). Preventivos: `HoraFin` -> `FechaRealInicio` -> apertura. Solo entran las OT con firmas completas (preventivos 3, correctivos 2 + `MAQUINA_DETENIDA = 1`).
- **Cambios de codigo (4 JS, sin DLL):** `agruparCorrectivos` usa `HoraFin || FechaCreacion`; `traerCorrectivosCerrados` descarta las OTMC fuera del rango; `parsearFechaCorrectivo` acepta ISO (el SP manda `HORA_FIN` en ISO).
- **SP `SpPdxMTTOObtenerMantenimientosCorrectivos`:** en bitacora (`P_LINEA_PROD = 1`) el rango tambien incluye `CAST(OT.HORA_FIN AS DATE) BETWEEN rango`. El listado de Correctivos no cambia.
- **Tooltip mixto (4 JS):** la columna `Mes` muestra una marca por tipo (correctivo / preventivo / paro / producto) en vez de una sola; antes se perdia el tooltip de menor prioridad.
- **Saneo de noviembre:** `APLICADOS/<schema>/PRODUCCION/20261124_SANEO_BITACORAS_FECHA_TECNICO_NOV_<schema>.sql` (4 procesos). Reubica por `HORA_FIN`, quita las OT sin firmas completas, recalcula horas y KPI, crea la fila destino y borra las que quedan vacias. Respaldo del mes en `TMP_BAK_SANEO_<PROCESO>_20261124`.
- **Aplicado y validado:**
  - `DBADMIN`: aplicado y probado con datos sembrados (31 OT movidas / 6 quitadas por proceso en el set de prueba).
  - `PTM_2022_FINAL`: SP + 4 JS publicados; saneo corrido. PVC **31 movidas / 0 quitadas**, horario de preventivo 667.34 -> 667.34; CORRUGADO 1 quitada (`OTMP-011`, solo firma del tecnico; la fila tenia la OT sumada 17 veces: 6.42 x 17 = 109.14); 4 filas nuevas (`SANEAMIENTO`), 3 borradas. Correctivos: 5 filas con +/-2 min corregidas (ediciones del admin que no se habian reflejado).
  - `TEST_JUNIO_2026`: SP + saneo (no habia OT en bitacora de noviembre: 29 filas intactas; la unica OT, `OTMP-089`, ya estaba en su dia).
- **Validacion en el portal (`:8083`, solo lectura):** planta 1 -> 06/11 L6 sin la 070 y 06/11 L6 manual con 52.33; L16 sin fila el 06/11, 11/11 con 137.54 y 12/11 con 32.00. Planta 2 -> L7 05/11 75.50 y 06/11 10.02; L8 06/11 81.20.
- **Decisiones:** `OTMP-011` no se borra (sigue en Preventivos, solo deja de salir en bitacora); las filas `CLAVE_SYNC = 'X|...'` se **conservan** (son filas manuales creadas por usuarios) y su script quedo en `OBSOLETO/` como no aplicable; el acumulamiento de meses anteriores no se toca.
- **Pendiente de esta sesion:** nada.
- **Git:** `975b0b3` (feat), `2f1070b` (chore), `f3ef0af` (docs) en `david_reyes`, pusheados el 25/11/2026.

## 2026-11-25 - Metricas: filtro de linea, normalizacion de bitacoras y limpieza de herramental en INY (PTM)

- **Reportes:** (1) el filtro de Linea del tablero no devolvia datos salvo una linea; (2) el MTTR/MTBF tomaba horas de paros manuales y de capturas en la celda de Herramental; (3) el grid de bitacora y las metricas no cuadraban por dos nombres de linea.
- **SP de metricas (4, PTM):** comparacion de `P_LINEA` normalizada (UPPER/TRIM + acentos) en la bitacora y en el cumplimiento PM. Script: `APLICADOS/PTM_2022_FINAL/METRICAS/20261125_METRICAS_FILTRO_LINEA_NORMALIZADO_PTM_2022_FINAL.sql`. **TEST aplicado el 2026-11-26; DBADMIN pendiente.**
- **Bitacoras (PTM):** normalizacion `Linea N PVC` -> `LÍNEA N PVC` y `CLAVE_SYNC` actualizada en las 4 tablas, sin borrar filas (la fila vacia del 22/11 se conserva). Respaldo `TMP_BAK_NORM_<PROC>_20261125`. Catalogo: `LÍNEA 13/14/15 PVC` con acento y alta de `LÍNEA 9 INY`. Script: `APLICADOS/PTM_2022_FINAL/PRODUCCION/20261125_NORMALIZAR_LINEAS_BITACORAS_PTM_2022_FINAL.sql`.
- **Herramental manual en INY:** 61 h capturadas a mano (12 filas, incluidas producto terminado) puestas en 0 y KPI recalculados en 2 pasadas. Scripts en `APLICADOS/PTM_2022_FINAL/PRODUCCION/20261125_FIX_INY_HERRAMENTAL_MANUAL_*.sql`.
- **JS (4) publicados en `:8083`:** los paros manuales de `MTTO CORRECTIVOS`/`HERRAMENTAL` ya no suman a la bitacora y la celda de Herramental queda bloqueada en INY y PEAD (PVC/Corrugado ya lo estaban). Vistas de Produccion con cache-busting por ticks.
- **Validacion (portal `:8083`):** L1/L3/L10/L13 ya devuelven su tiempo disponible (antes 0 o solo las filas nuevas); L5 muestra 49 registros / 540 h programadas / 495 h disponibles / 0.32 h de reparacion / 1 parada -> **MTTR 0.32 h y MTBF 494.68 h**.

## 2026-11-26 - Aplicado en TEST_JUNIO_2026 (paquete del 25/11)

- **Scripts aplicados por el usuario y movidos a `APLICADOS/TEST_JUNIO_2026/`:** `METRICAS/20261125_METRICAS_FILTRO_LINEA_NORMALIZADO_TEST_JUNIO_2026.sql` y `PRODUCCION/20261125_{CATALOGO_LINEA_9_INY,NORMALIZAR_LINEAS_BITACORAS,FIX_INY_HERRAMENTAL_MANUAL}_TEST_JUNIO_2026.sql`.
- **Publicacion verificada en `:8081` (solo lectura):**
  - 6 JS servidos identicos byte a byte al repo: `mantenimientos_correctivos_refactor.js`, `mantenimientos_preventivos_refactor.js` y los 4 `produccion_*_refactor.js`.
  - Las 4 vistas de Produccion usan cache-busting por ticks; las 6 vistas de `VIEWS_MIGRACION_RAPIDA/TEST_JUNIO_2026/` coinciden con el repo.
  - Correctivos: boton **Exportar** y columna **"Paro de linea"** presentes. Preventivos: encabezados **"Hora Inicio" / "Hora Fin"**.
  - Bitacora PVC de noviembre: todas las lineas con acento (`LÍNEA N PVC`), ninguna `Linea N PVC`.
  - Catalogo: `LÍNEA 13/14/15 PVC` con acento.
- **No verificable con datos en TEST:** el filtro normalizado de Metricas (TEST no tiene `HORAS_PROGRAMADAS` en noviembre: TD = 0 y MTBF N/A), `LÍNEA 9 INY` (el modulo INY no expone filtro de linea y no hay filas INY en noviembre) y la limpieza de Herramental manual en INY (0 filas). En PTM ya quedaron validados el 25/11.
- **DBADMIN:** pendiente; el trial de HANA Cloud esta offline ("trial environment is temporarily offline"), sin dependencia con TEST ni con la publicacion.

## 2026-11-27 - Correctivos: backfill de HORA_INICIO (PTM) y columna Scrap en el Excel

- **Reporte del usuario:** el Excel de Correctivos no traia el Scrap y varias OT cerradas mostraban "Hora inicio (tecnico) = N/A".
- **Scrap:** el SP ya devolvia `SCRAP` y el grid lo traia (109 de 130 filas con valor en planta 1), pero el Excel tenia 16 columnas y no lo incluia. Se agrego la columna **"Scrap real"** (numerica, 2 decimales) en `mantenimientos_correctivos_refactor.js`, con los merges del encabezado/totales/pie ajustados a 17 columnas. Publicado en `:8081` y `:8083` (hash identico al repo) y validado en TEST generando el Excel real: 17 columnas y valores 0 / 100 / 12.
- **HORA_INICIO nula:** 46 OT con `HORA_INICIO` NULL y `HORA_FIN` capturada: 42 cerradas con las 2 firmas y 4 en proceso de firmas. Todas de **planta 1** y del **07 al 20/11/2026** (ventana del defecto corregido el 20/11). Planta 2: 0 casos (67 correctivos, 50 cerrados, todos con inicio).
- **Backfill:** `HORA_INICIO = HORA_FIN - DURACION_HRS`, porque el portal calcula `DURACION_HRS` con la ventana del tecnico (campo de solo lectura) y el defecto solo perdio la columna de inicio. Script `APLICADOS/PTM_2022_FINAL/PRODUCCION/CORRECTIVOS/20261127_CORRECTIVOS_BACKFILL_HORA_INICIO_PTM_2022_FINAL.sql` (respaldo `TMP_BAK_HORA_INICIO_20261127`). Ejecutado por el usuario el 27/11: **44 filas** actualizadas.
- **Casos sin duracion:** `OTMC-081` y `OTMC-079` los corrigio el usuario en el portal (17:29-17:51 = 0.37 h y 09:45-17:27 = 7.70 h). `OTMC-074` estaba cerrada con 2 firmas (bloqueada en el portal) y sin duracion: se corrigio con `APLICADOS/PTM_2022_FINAL/PRODUCCION/CORRECTIVOS/20261127_CORRECTIVOS_FIX_OTMC-074_PTM_2022_FINAL.sql`, tomando la **hora de apertura** (12:33) y calculando 13 min = **0.22 h**.
- **Validacion en el portal (`:8083`, planta 1):** cerradas sin inicio **42 -> 0**; filas con fin y sin inicio **46 -> 0**; en el Excel, "N/A" en hora inicio 65 -> **20** (solo las OT que siguen en captura).
- **Hallazgo aparte:** `OTMC-079` tiene inicio 17:27 y fin 09:45 (ventana invertida, ajena al backfill; la puede corregir el administrador con "Guardar").
- **TEST:** script listo en `APLICADOS/TEST_JUNIO_2026/PRODUCCION/CORRECTIVOS/20261127_CORRECTIVOS_BACKFILL_HORA_INICIO_TEST_JUNIO_2026.sql` (pendiente de ejecutar; ahi esta al menos `OTMC-011`).

## Pendientes SQL

- **PTM_2022_FINAL: al dia.** Los 5 scripts del 2026-11-25 se aplicaron y movieron a `APLICADOS/PTM_2022_FINAL/{METRICAS,PRODUCCION}/`.
- **TEST_JUNIO_2026: al dia.** Los 4 scripts del 2026-11-25 se aplicaron el 2026-11-26 y quedaron en `APLICADOS/TEST_JUNIO_2026/{METRICAS,PRODUCCION}/`.
- **Pendiente solo DBADMIN** (bloqueado por el trial de HANA Cloud offline): filtro de linea normalizado de Metricas y normalizacion de lineas de las bitacoras, en `PENDIENTES/DBADMIN/{METRICAS,PRODUCCION}/`.
- **Correctivos 2026-11-27:** backfill de `HORA_INICIO` aplicado en PTM (44 filas + `OTMC-074`). **Sin pendientes en PTM**; el script de TEST sigue por ejecutar.
- **Sin pendientes** de los paquetes anteriores (24/11 y previos).
- `PENDIENTES/` solo deberia conservar el bloque de DBADMIN y su `README.md`.
- JS: las copias de `SCRIPTJS_MIGRACION_RAPIDA/` se eliminaron; la fuente es `MantenimientosPTM/Scripts/` (publicado en `:8083` y `:8081`).

## Tareas menores abiertas

- **Borrar las temporales del saneo en `PTM_2022_FINAL`** (`TMP_SANEO_*_20261124` x16) cuando ya no se necesiten para comparar. **Conservar** `TMP_BAK_SANEO_{PVC,PEAD,CORR,INY}_20261124` (respaldo del mes) unas semanas. Acordado con el usuario: se borran el 25/11/2026 o despues.