# Contexto de sesión — MantenimientosPTM

**Fecha:** 05/11/2026  
**Repositorio:** `C:\Paradox\DEVELOPMENT\MantenimientosPTM`

---

## 1. Estado actual

- **Desarrollo:** HANA Cloud, schema `DBADMIN`. El `Web.config` activo apunta a `DBADMIN`.
- **Producción/Test destino:** `TEST_JUNIO_2026` y `PTM_2022_FINAL`.
- **Migración base BD (05/11/2026):** los scripts `MIGRACION_TEST_JUNIO_2026.sql` y `MIGRACION_PTM_2022_FINAL.sql` ya se ejecutaron en ambos schemas. Los 11 SPs y la columna `TIEMPO_MUERTO_HERRAMENTALES` de Corrugado quedaron validados por el usuario.
- **Incrementales BD (05/11/2026):** los scripts de Calendario y Reprogramación también quedaron aplicados y validados en `TEST_JUNIO_2026` y `PTM_2022_FINAL`. No quedan pendientes de base de datos.
- **App publicada (05/11/2026):** notificada en pruebas `http://129.80.97.150:8081` y producción `http://129.80.97.150:8083`. Esa publicación incluye los filtros y el Calendario, **NO** la corrección de reprogramación.
- **Correo:** configuración única `SMTP_*` con Office365 (`smtp.office365.com`, `notificaciones@ptmexico.com`). Probado con envío real desde desarrollo.
- **Datos manuales OTMP-011:** insertados en `DBADMIN` en 5 tablas (ver sección 2.1).
- **Commits recientes:** `3cb8cf9` (correo) y `c7e7ef8` (Calendario + reprogramación), rama `david_reyes`.
- **Datos de prueba:** se quedan en `DBADMIN` (NO migrar).
- **Firmas de prueba:** fuera del índice de Git (`git rm --cached`), siguen en disco y `.gitignore` las excluye.
- **Equipo BCP03:** restaurado a `FECHA_INICIO_MANT = 2026-01-01`.

## 2. Prueba funcional completa (DBADMIN)

| OT | Tipo | Equipo | Clasificación | Técnico | Máq. detenida | Duración |
|---|---|---|---|---|---|---|
| OTMP-001 | Preventivo | BCP03 A 1-4 | HERRAMENTALES | Mario (7756) | — | 1.15 h |
| OTMP-002 | Preventivo | L1 PVC- Impresora | MANTENIMIENTO | Víctor (2644) | — | 0.90 h |
| OTMC-001 | Correctivo | L1 PVC- Extrusor Linea | MANTENIMIENTO | Víctor (2644) | Sí | 1.47 h |
| OTMC-002 | Correctivo | BCP03 A 1-4 | HERRAMENTALES | Mario (7756) | Sí | 1.87 h |

**Bitácora PVC guardada (05/11/2026, LÍNEA 1 PVC):**

| ID | OTMP | OTMC | Preventivo | Mtto. Correctivos | Herramental |
|---|---|---|---|---|---|
| 1 | — | OTMC-001 | 0.00 | **1.28** | 0.00 |
| 2 | — | OTMC-002 | 0.00 | 0.00 | **1.52** |
| 3 | OTMP-001 + OTMP-002 | — | **2.05** | 0.00 | 0.00 |

**Métricas (LÍNEA 1 PVC, noviembre 2026):**

| Filtro | Correctivos | Horas paro | MTTR | Cumplimiento PM |
|---|---|---|---|---|
| Todas | 2 | 2.80 h | 1.40 h | 2/2 = 100 % |
| MANTENIMIENTO | 1 | 1.28 h | 1.28 h | 1/1 = 100 % |
| HERRAMENTALES | 1 | 1.52 h | 1.52 h | 1/1 = 100 % |

> MTBF sale negativo en la prueba porque `TIEMPO_DISPONIBLE = 0` (no hay horas de producción capturadas). Con datos reales será positivo.

### 2.1 Datos manuales de prueba — OTMP-011

Equipo: **233 — L4 CORR BOMBA DE VACÍO A** (`MANTENIMIENTO`, planta 1)  
Periodicidad: **4 (cuatrimestral)**, fecha inicio mantenimiento `2026-02-01`.

| Tabla | Clave | Datos principales |
|---|---|---|
| `PdxMTTOMPGenerados` | `ID_MANTENIMIENTO = 11` | `OTMP-011`, periodo 01/10–31/10/2026, apertura 02/11 13:38, cierre 05/11 10:25, estatus 4 |
| `PdxMTTOOrdenesTrabajoMP` | `ID_OT_DETALLE = 5` | `ID_MANTENIMIENTO = 11`, `OTMP-011`, técnicos `3472,2502`, duración 6.42, `FIRMA_REALIZO = SI` |
| `PdxMTTORutinasMP` | `ID_RUTINA = 5` | `ID_MANTENIMIENTO = 11`, `ID_OT_DETALLE = OTMP-011`, comentario BUSCH |
| `PdxMTTOActividadesRutinasMP` | `ID_ACTIVIDAD = 39 a 52` | `ID_RUTINA = 5`, 14 actividades, todas `COMPLETADA = SI` |
| `PdxMTTOSolicitudesReprogramacion` | `ID_SOLICITUD = 1` | `OTMP-011`, estatus `NA`, fechas reales 04/11/2026, `ENVIAR_SIGUIENTE_MES = FALSE` |

> Los IDs 3 de `PdxMTTOOrdenesTrabajoMP` y `PdxMTTORutinasMP` ya estaban ocupados por OTMP-002; por eso se usaron 5.  
> `ID_SOLICITUD` es identity `GENERATED ALWAYS`: HANA no permite insertar un ID explícito. Se generó el 1 (la tabla estaba vacía).

## 3. Cambios aplicados en DBADMIN

### Stored procedures (11)

- `SpPdxMTTOConsultaEquipos` — filtro por `P_CLASIFICACION`.
- `SpPdxMTTOInsertaEquipo` — guarda `CLASIFICACION`.
- `SpPdxMTTOActualizaEquipo` — actualiza `CLASIFICACION`.
- `SpPdxMTTOObtenerMantenimientosPorRango` — filtros de clasificación/equipo y **filtro por posición por clasificación**:
  - TEC HERR (8, 95, 101) → `CLASIFICACION = 'HERRAMENTALES'`
  - TEC MTTO (44, 3, 82, 100) → `CLASIFICACION = 'MANTENIMIENTO'`
  - Otras posiciones → sin restricción
- `SpPdxMTTOObtenerMantenimientosCorrectivos` — filtros de clasificación/equipo + `CLASIFICACION` en el result.
- `SpPdxMTTOMetricasOEE_PVC / _PeadLiso / _Corrugado / _INY`:
  - `P_CLASIFICACION`.
  - `HORAS_PARO` según columna de la clasificación.
  - **Fix `N_OTMC`**: el divisor de MTTR/MTBF también se filtra por clasificación.
- `SpPdxMTTOGuardarTiemposMuertosCorrugado` / `SpPdxMTTOConsultarTiemposMuertosCorrugado` — columna `TIEMPO_MUERTO_HERRAMENTALES`.

### Scripts de migración

- `SQL_MIGRACION/MIGRACION_TEST_JUNIO_2026.sql` — **aplicado en `TEST_JUNIO_2026`**.
- `SQL_MIGRACION/MIGRACION_PTM_2022_FINAL.sql` — **aplicado en `PTM_2022_FINAL`**.
- Usan **`ALTER PROCEDURE`** (los 11 SPs deben existir previamente).
- Incluyen `ALTER TABLE` condicional para la columna de Corrugado.
- UTF-8 con BOM, sin emojis, con acentos en comentarios.
- El filtro de INY usa `LIKE 'INYECCI%'` para evitar depender del acento de `INYECCIÓN`.
- **Nota:** los maestros se actualizaron con el fix de reprogramación de Preventivos. Para ambientes ya migrados, usar los **incrementales** listados abajo.

### Cambios de la sesión 05/11/2026 (posteriores a la migración base)

**Calendario de Mantenimientos**

- `SpPdxMTTOObtenerMantenimientosCompletados`:
  - Parámetros nuevos: `p_ORDEN_TRABAJO`, `p_CLASIFICACION`, `p_EQUIPO`.
  - Filtros por orden (LIKE), clasificación y nombre de equipo.
  - `FUE_REPROGRAMADO = 'SI'` también cuando la solicitud está en estatus `NA`.
- App: `CalendarioController.cs`, `calendario_mantenimientos_refactor.js`, `CalendarioMantenimientos.cshtml` (filtros + cache-busting).

**Reprogramación de Preventivos**

- `SpPdxMTTOObtenerMantenimientosPorRango`:
  - `FECHA_INICIO_FINAL` / `FECHA_FIN_FINAL` usan `FECHA_REAL_INICIO` / `FECHA_REAL_FIN` cuando hay reprogramación `NA` o `Aceptada` y **no** es "enviar al siguiente mes".
  - `FUE_REPROGRAMADO = 'SI'` también cuando la solicitud está en estatus `NA`.
  - Sin reprogramación se conserva la fecha calculada por periodicidad.
- Sin cambios de app: el front ya mostraba las fechas reales.

**Correo**

- `Web.config`: un solo bloque `SMTP_*` (Office365 / `notificaciones@ptmexico.com`).
- `EmailNotificationService` y `EmailService` leen las mismas llaves `SMTP_*`.

**Scripts nuevos (incrementales)**

- `SQL_MIGRACION/MIGRACION_CALENDARIO_FILTROS_TEST_JUNIO_2026.sql`
- `SQL_MIGRACION/MIGRACION_CALENDARIO_FILTROS_PTM_2022_FINAL.sql`
- `SQL_MIGRACION/MIGRACION_PREVENTIVOS_REPROGRAMACION_TEST_JUNIO_2026.sql`
- `SQL_MIGRACION/MIGRACION_PREVENTIVOS_REPROGRAMACION_PTM_2022_FINAL.sql`

### Segunda parte de la sesión 05/11/2026 — Registro de Tiempos Muertos

- **Fecha editable** en los 4 procesos (PVC, PEAD LISO, INY, CORRUGADO), incluidos los registros ya guardados. Se normaliza a `YYYY-MM-DD` al cargar y se usa `agDateStringCellEditor`.
- **Comentarios:** se validó guardar y actualizar en los 4 procesos. En Corrugado el SP de consulta no devolvía `COMENTARIOS`; ya se corrigió.
- **Duplicación al editar Fecha (corregida):** `OTMC` / `OTMP` / `ID_PARO` se normalizan al cargar y al guardar con `GestionProduccionBase.normalizarListaOT`. La unificación de OT ahora reconoce las órdenes ya presentes aunque la fecha de la fila cambie, por lo que no vuelve a crear la fila automática. Se agregó limpieza SQL para los datos ya corrompidos.
- **Eliminación desde menú contextual:**
  - Fila nueva sin `ID_REGISTRO`: se elimina al instante.
  - Registro guardado: se pide confirmación y se elimina de la BD.
- **Nuevos endpoints:** `EliminarTiempoMuertoPVC / PeadLiso / INY / Corrugado` en `ProduccionController`.
- **Nuevos SPs:** `SpPdxMTTOEliminarTiemposMuertosPVC / PeadLiso / INY / Corrugado`.
- **Scripts incrementales nuevos:**
  - `MIGRACION_COMENTARIOS_CORRUGADO_*.sql`
  - `MIGRACION_ELIMINAR_TIEMPOS_MUERTOS_*.sql`
  - `MIGRACION_NORMALIZAR_OT_TIEMPOS_MUERTOS_*.sql`
- **Estado:** aplicado y probado end-to-end en `DBADMIN`; incrementales aplicados en `TEST_JUNIO_2026` y `PTM_2022_FINAL`; app desplegada (confirmado por el usuario, 05/11/2026).

**Datos de prueba de Tiempos Muertos (DBADMIN, 05/11/2026):**

- PVC: `ID_REGISTRO` 9 (`OTMC-001`) y 10 (`OTMP-002`).
- PEAD LISO / INY / CORRUGADO: `ID_REGISTRO` 2 cada uno (`OTMC-001`).
- Comentarios `PRUEBA-VALIDACION-...`; se dejaron para validación visual.
- La columna `LINEA` se corrigió con `NCHAR(205)` porque la inserción por script había perdido el acento (`U+FFFD`).

## 4. Estado de la migración y pendientes

**Migración base (aplicada y validada):**

- [x] `TEST_JUNIO_2026` — 11 SPs + columna `TIEMPO_MUERTO_HERRAMENTALES`.
- [x] `PTM_2022_FINAL` — 11 SPs + columna `TIEMPO_MUERTO_HERRAMENTALES`.

**Cambios de esta sesión (aplicados y probados en `DBADMIN`):**

- [x] Filtros del Calendario (`SpPdxMTTOObtenerMantenimientosCompletados`).
- [x] Fechas reales de reprogramación en Preventivos (`SpPdxMTTOObtenerMantenimientosPorRango`).
- [x] `FUE_REPROGRAMADO = 'SI'` para estatus `NA` en ambos SPs.

**Incrementales aplicados en el servidor (05/11/2026):**

- [x] `MIGRACION_CALENDARIO_FILTROS_TEST_JUNIO_2026.sql` — aplicado y validado.
- [x] `MIGRACION_CALENDARIO_FILTROS_PTM_2022_FINAL.sql` — aplicado y validado.
- [x] `MIGRACION_PREVENTIVOS_REPROGRAMACION_TEST_JUNIO_2026.sql` — aplicado y validado.
- [x] `MIGRACION_PREVENTIVOS_REPROGRAMACION_PTM_2022_FINAL.sql` — aplicado y validado.

**Validación en productivo (confirmada por el usuario):**

- [x] Filtro de octubre sin OTMP-011.
- [x] Filtro de noviembre con OTMP-011.
- [x] `FUE_REPROGRAMADO = 'SI'` para la reprogramación.

**Nuevos cambios de Tiempos Muertos (05/11/2026, segunda parte):**

- [x] Aplicado y probado end-to-end en `DBADMIN`.
- [x] `MIGRACION_COMENTARIOS_CORRUGADO_*.sql` — aplicado en TEST/PTM.
- [x] `MIGRACION_ELIMINAR_TIEMPOS_MUERTOS_*.sql` — aplicado en TEST/PTM.
- [x] `MIGRACION_NORMALIZAR_OT_TIEMPOS_MUERTOS_*.sql` — aplicado en TEST/PTM.
- [x] App desplegada con los cambios de Tiempos Muertos (confirmado por el usuario).

**Pendiente (solo documentación):**

- [ ] Commit/push de la actualización final de esta documentación (incluye la mejora de regex de los scripts de normalización).

> Las migraciones anteriores quedaron completadas y validadas en `TEST_JUNIO_2026` y `PTM_2022_FINAL` el 05/11/2026. Los cambios de Tiempos Muertos quedaron aplicados en `DBADMIN`, `TEST_JUNIO_2026` y `PTM_2022_FINAL`, y la app fue desplegada.

## 5. Archivos clave

- `RESUMEN_AJUSTES.txt` — resumen de cambios funcionales.
- `SQL_MIGRACION/` — scripts ejecutables + README.
  - Maestros: `MIGRACION_TEST_JUNIO_2026.sql`, `MIGRACION_PTM_2022_FINAL.sql`.
  - Incrementales: `MIGRACION_CALENDARIO_FILTROS_*.sql`, `MIGRACION_PREVENTIVOS_REPROGRAMACION_*.sql`.
- `SQL_APLICADOS_DEV/` — definiciones aplicadas en DBADMIN:
  - `SpPdxMTTOObtenerMantenimientosCompletados.sql`
  - `SpPdxMTTOObtenerMantenimientosPorRango.sql`
  - `SpPdxMTTOConsultarTiemposMuertosCorrugado.sql`
  - `SpPdxMTTOEliminarTiemposMuertosPVC / PeadLiso / INY / Corrugado.sql`
- `SQL_ORIGINALES/` — versiones originales para comparar.
- `MantenimientosPTM/Web.config` — configuración SMTP única de Office365.
- `MantenimientosPTM/Models/LogicaNegocio/EmailNotificationService.cs` — lee `SMTP_*`.
- `.codegraph/` — índice de CodeGraph del proyecto.

## 6. Cómo retomar en una nueva sesión

1. Abrir el repo en `C:\Paradox\DEVELOPMENT\MantenimientosPTM`.
2. Leer este archivo.
3. Usar CodeGraph (`codegraph_explore` o `codegraph explore`) para mapear código antes de editar.
4. No truncar tablas ni tocar producción sin confirmar.
5. Recordar: datos de prueba en DBADMIN; migración base y cambios de Calendario/Reprogramación aplicados en TEST/PTM.
6. Credenciales de prueba: no se guardan en el repo; solicitarlas al usuario.
7. El fix de reprogramación todavía **no** está en la versión publicada; va en la siguiente.
