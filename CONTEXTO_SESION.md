# Contexto de sesión — MantenimientosPTM

**Fecha:** 18/11/2026  
**Repositorio:** `C:\Paradox\DEVELOPMENT\MantenimientosPTM`

---

## 0. Estado al 18/11/2026 (resumen)

- **Tiempos Muertos / NWSCALE (4 procesos):**
  - `DBADMIN`: aplicado y probado completo (upsert, dedupe, token/conflicto, NWSCALE día y rango, unificación correctivo+preventivo+paro).
  - `PTM_2022_FINAL`: **aplicado/validado** (07: 0 duplicados, 0 sin token, 4 índices, 4 SPs) y **código publicado** (DLL + 5 JS + 4 vistas + Paros). Paquete en `APLICADOS/PTM_2022_FINAL/PRODUCCION/TIEMPOS_MUERTOS_NWSCALE/`.
  - `TEST_JUNIO_2026`: **pendiente** (paquete 00 a 07 en `PENDIENTES/TEST_JUNIO_2026/PRODUCCION/TIEMPOS_MUERTOS_NWSCALE/`).
- **Correctivos (igual que Preventivos):** índices únicos por `NUMERO_ORDEN`, `SpPdxMTTOValidarTokenOTCorrectivo`, `TOKEN` en el GET, `CONFLICTO` en controller/JS.
  - `DBADMIN`: aplicado y probado en portal (borrador, segundo guardado y conflicto simulado).
  - `PTM_2022_FINAL`: **aplicado/validado** (`OT_MC_DUPS 0`, `MCG_DUPS 0`, `INDICES 2`, `VALIDADOR 1`). Script en `APLICADOS/PTM_2022_FINAL/PRODUCCION/CORRECTIVOS/`.
  - `TEST_JUNIO_2026`: **pendiente** en `PENDIENTES/TEST_JUNIO_2026/PRODUCCION/CORRECTIVOS/`.
- **Verificación de SPs/índices:** `SQL_MIGRACION/VERIFICACION/CHECK_TM_SP_PTM_2022_FINAL.sql` y `..._TEST_JUNIO_2026.sql`.
  - PTM: **31/31 OK**.
  - TEST: **14/31 (faltan 17)** = TM (SPs/índices/firmas) + Correctivos (validador, GET con TOKEN e índices). Preventivos ya estaba aplicado.
- **Plan inmediato (19/11/2026):** aplicar en TEST el paquete TM (00→07) + script de Correctivos, re-correr el check (debe dar 31/31) y publicar DLL/JS/vistas; luego mover los paquetes a `APLICADOS/TEST_JUNIO_2026/`.
- **Git:** rama `david_reyes`, todo commiteado y pusheado.

---

## 1. Estado actual

- **Regla de pruebas (17/11/2026):** todas las pruebas funcionales se hacen **siempre en el portal**, simulando al usuario (login por rol, formularios, modales, guardado). Ver `AGENTS.md`. La API/SQL solo se usa para verificar debajo (conteos, claves, duplicados) o para preparar datos cuando el módulo no lo permita; los datos de prueba se limpian al terminar.
- **Desarrollo:** HANA Cloud, schema `DBADMIN`. El `Web.config` activo apunta a `DBADMIN`.
- **Producción/Test destino:** `TEST_JUNIO_2026` y `PTM_2022_FINAL`.
- **Migración base BD (05/11/2026):** los scripts `MIGRACION_TEST_JUNIO_2026.sql` y `MIGRACION_PTM_2022_FINAL.sql` ya se ejecutaron en ambos schemas. Los 11 SPs y la columna `TIEMPO_MUERTO_HERRAMENTALES` de Corrugado quedaron validados por el usuario.
- **Incrementales BD (05/11/2026):** los scripts de Calendario y Reprogramación también quedaron aplicados y validados en `TEST_JUNIO_2026` y `PTM_2022_FINAL`. No quedan pendientes de base de datos.
- **App publicada (11/11/2026):** pruebas `http://129.80.97.150:8081` y producción `http://129.80.97.150:8083`. La publicación actual incluye filtros, Calendario, el hardening de Equipos/Preventivos/Baja y la corrección de reprogramación (validada por el usuario en el portal). **Sin pendientes de despliegue.**
- **Correo:** configuración única `SMTP_*` con Office365 (`smtp.office365.com`, `notificaciones@ptmexico.com`). Probado con envío real desde desarrollo.
- **Datos manuales OTMP-011:** insertados en `DBADMIN` en 5 tablas (ver sección 2.1).
- **Git (12/11/2026):** `origin/david_reyes` en `386fa35`; hay commits locales pendientes de push (documentación y corrección de rutinas). **No hacer push sin autorización del usuario.**
- **Datos de prueba:** se quedan en `DBADMIN` (NO migrar).
- **Credenciales de prueba (solo DBADMIN):** `adminmantenimiento@ptmexico.com` / `AdminMTTO` (administrador de mantenimiento). No usar en TEST/PTM ni producción.
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

- `SQL_MIGRACION/APLICADOS/TEST_JUNIO_2026/MIGRACION_TEST_JUNIO_2026.sql` — **aplicado en `TEST_JUNIO_2026`**.
- `SQL_MIGRACION/APLICADOS/PTM_2022_FINAL/MIGRACION_PTM_2022_FINAL.sql` — **aplicado en `PTM_2022_FINAL`**.
- Usan **`ALTER PROCEDURE`** (los 11 SPs deben existir previamente).
- Incluyen `ALTER TABLE` condicional para la columna de Corrugado.
- UTF-8 con BOM, sin emojis, con acentos en comentarios.
- El filtro de INY usa `LIKE 'INYECCI%'` para evitar depender del acento de `INYECCIÓN`.
- **Nota:** los maestros se actualizaron con el fix de reprogramación de Preventivos. Para ambientes ya migrados, usar los **incrementales** listados abajo.
- **Regla on-premise:** en `TEST_JUNIO_2026` y `PTM_2022_FINAL` **`CREATE OR REPLACE PROCEDURE` no funciona**; todos los scripts de SP deben usar **`ALTER PROCEDURE`** (el SP ya existe). `CREATE OR REPLACE` solo se usa en HANA Cloud (`DBADMIN`).

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

- `SQL_MIGRACION/APLICADOS/TEST_JUNIO_2026/MIGRACION_CALENDARIO_FILTROS_TEST_JUNIO_2026.sql`
- `SQL_MIGRACION/APLICADOS/PTM_2022_FINAL/MIGRACION_CALENDARIO_FILTROS_PTM_2022_FINAL.sql`
- `SQL_MIGRACION/OBSOLETO/MIGRACION_PREVENTIVOS_REPROGRAMACION_TEST_JUNIO_2026.sql`
- `SQL_MIGRACION/OBSOLETO/MIGRACION_PREVENTIVOS_REPROGRAMACION_PTM_2022_FINAL.sql`

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

- [x] Commit/push de la actualización final de esta documentación (incluye la mejora de regex de los scripts de normalización) — 09/11/2026.

> Las migraciones anteriores quedaron completadas y validadas en `TEST_JUNIO_2026` y `PTM_2022_FINAL` el 05/11/2026. Los cambios de Tiempos Muertos quedaron aplicados en `DBADMIN`, `TEST_JUNIO_2026` y `PTM_2022_FINAL`, y la app fue desplegada.

## 5. Archivos clave

- `RESUMEN_AJUSTES.txt` — resumen de cambios funcionales.
- `SQL_MIGRACION/` — scripts organizados por ciclo de vida. Ver `SQL_MIGRACION/README.md`.
  - `PENDIENTES/` — solo scripts por aplicar (sin scripts SQL = al día).
  - `APLICADOS/DBADMIN/` — aplicados en DBADMIN (incluye `ALMACEN/` y `DEV/`).
  - `APLICADOS/TEST_JUNIO_2026/` — aplicados en TEST_JUNIO_2026.
  - `APLICADOS/PTM_2022_FINAL/` — aplicados en PTM_2022_FINAL.
  - `APLICADOS/COMUN/` — scripts canónicos que se adaptan por schema.
  - `SEEDS/DBADMIN/` — seeds y datos de prueba.
  - `OBSOLETO/` — versiones viejas que NO se deben ejecutar.
  - `HISTORIAL/` — notas de sesión y pendientes resueltos.
  - `MIGRACIONES_APLICADAS.md` — bitácora de migraciones.
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
6. Credenciales de prueba (solo DBADMIN): `adminmantenimiento@ptmexico.com` / `AdminMTTO`.
7. La corrección de reprogramación **ya está publicada y funcionando** en el portal (validada 11/11/2026).
8. **No hacer `git push` sin autorización explícita del usuario.** Se puede hacer `commit` local, pero el push se ejecuta **solo** cuando el usuario lo indique.

## 7. Manuales técnicos

- Ruta: `C:\Paradox\PTM\DEVELOPMENT\RECORRIDO PORTAL MANTENIMIENTOS\MANUALES`.
- Versión actualizada: `MANUALES\ACTUALIZADOS_20261106\`.
- Manuales actualizados: Gestión de Equipos, Mantenimientos Correctivos & Almacén, Métricas, Planeación, Causas/Tiempos Muertos (PVC, Corrugado, PEAD Liso, INY) y Reporte de Paros.
- Manual nuevo: `Manual_Tecnico_Mantenimientos_Preventivos_Almacen.docx` — cubre Mantenimientos Preventivos (MPSINOT, rutinas, registro, firmas) y reutiliza la sección de Almacén del manual de Correctivos.
- Aprobación de Solicitud de Compra y Reporte de Stock dependen de SAP on-premise; en HANA Cloud pueden no estar disponibles y quedaron documentadas con nota.
- **Manual Preventivos actualizado (07/11/2026):** la sección 4 (antes MPSINOT, vista legacy/mock) ya documenta el flujo real "Generar Órdenes" de `MantenimientoPreventivo`: permisos, selección de equipos, generación y resultado. También se ajustaron el índice, el alcance, el menú, el glosario, la tabla de mensajes y la figura 2 (captura `11_principal_generar_ordenes.jpeg`). Se agregó la sección **3.5 Solicitar y aceptar reprogramación** (solicitud del SupervisorPlaneacion, fechas reales, enviar al siguiente mes y aceptación/rechazo del administrador). Respaldo del `.docx` previo en `MANUALES\.work\backup\`.
- **Vistas legacy/mock:** `MPSINOT`, `SolicitudOC` y `SolicitudRefacciones` de `MantenimientosPreventivos` no están en el menú; las reales son `MantenimientoPreventivo`, `Almacen/SolicitudRefacciones` y `Almacen/SolicitudOC`.

## 8. Sesión 07/11/2026 — Revisión de manuales y fixes

**Manuales técnicos (7) revisados y corregidos a versión 1.1:**

| Manual | Páginas | Correcciones principales |
|---|---:|---|
| Preventivos & Almacén | 20 | Contenido depurado, TOC automático, secciones 5.4/5.5, botones y mensajes reales |
| Causas y Tiempos Muertos | 25 | Filtros, columnas por proceso, TND/TNP, mensajes y estilos |
| Gestión de Equipos | 20 | Filtros, columnas de pausa, botones reales, estilos 3.3/4 y mensajes |
| Correctivos & Almacén | 19 | Columnas completas, estatus, 5.4/5.5 nuevas, fórmulas y estilos |
| Métricas | 12 | Filtros, fórmulas MTBF/MTTR corregidas y sección 5 |
| Planeación & Producción | 26 | Mensajes, paro activo/detalle, estatus, estilos 7.2/7.3/7.6 |
| Reporte de Paros | 17 | Fecha Registro, ventana de eliminación y mensajes |

- Todos con **índice automático de Word**, números de página correctos y **respaldo del original** en `MANUALES\.work\backup\`.
- Los archivos finales están en `MANUALES\ACTUALIZADOS_20261106\`.

**Fixes de código aplicados:**

- `MantenimientosPTM/Scripts/mantenimientos_preventivos_refactor.js` — columna **Comentarios**: ahora muestra `row.ComentariosRutina` (escapado, truncado a 80 caracteres y con tooltip). Antes devolvía `""`.
- `MantenimientosPTM/Scripts/mantenimientos_correctivos_refactor.js` — columna **Comentarios / Actividad realizada**: ahora muestra `row.TextoSecuencia` (escapado, truncado y con tooltip). Correctivos no tiene un campo propio de comentarios; se usó la actividad realizada como texto libre real.
- Ambos archivos pasaron `node --check`.

**Pendientes:**

- [x] Commit/push de `CONTEXTO_SESION.md` y de los dos archivos JS (09/11/2026).
- [ ] Opcional: capturas de **Solicitud de Compra** y **Aprobación de Solicitud de Compra** cuando haya acceso al servidor.

---

## 9. Sesión 09/11/2026 — Revisión y hardening de Gestión de Equipos

**Alcance:** revisión módulo por módulo (iniciando por Gestión de Equipos) para detectar bugs potenciales antes de seguir en productivo. Se atendieron los puntos 2 al 12 del análisis. El punto 1 (autenticación/autorización del lado del servidor) se dejó **sin cambios** por decisión del usuario.

### 9.1 Cambios de código

**`MantenimientosPTM/Controllers/EquiposController.cs`**
- Helpers `EsErrorHana()` / `EsDuplicadoHana()`: detección de errores de SP sin depender de mayúsculas/minúsculas en todo el módulo.
- `HanaTransactionScope` para alta/edición de equipo y para la solicitud de baja:
  - `InsertaEquiposProduccion`: equipo + todas sus periodicidades en una sola transacción.
  - `AcualizaEquiposProduccion`: update + insertar/desactivar periodicidades en una sola transacción.
  - `InsertaSolicitudBajaEquipoProduccion`: solicitud + cambio de estatus en una sola transacción.
- Validaciones: al menos una periodicidad, `IdEquipo` obligatorio, lista nula, consulta de periodicidades con `try/catch` y sin `.Value` sobre nulos.
- Archivos:
  - Validación de extensión, MIME y tamaño máximo 5 MB para imágenes y PDF.
  - Solo se rastrean/borran los archivos **nuevos** de la solicitud (antes se borraban también los anteriores).
  - El correo adjunta únicamente los archivos de esa solicitud.
  - La carpeta `SolicitudesBaja/{ID}` se crea solo cuando realmente hay una imagen que guardar.
  - `GuardarBaja` valida PDF, MIME, tamaño e ID.

**`MantenimientosPTM/Models/GlobalCommands.cs`**
- Nuevo `GlobalCommands.HanaTransactionScope` (conexión + transacción HANA, `Execute`, `Commit`, `Rollback` y rollback automático en `Dispose`).
- Helpers privados `AddHanaParameters` y `ReadResultJson` para reutilizar el binding/lectura de resultados.

**`MantenimientosPTM/Scripts/gestion_equipos_refactor.js`**
- `escapeHtml()` aplicado a tabla, periodicidades, estatus, comentarios, listados de tipos/áreas/líneas, correos, confirmaciones y resultados de eliminación.
- `normalizarEstatus()` y `esEnProcesoDeBaja()`: manejo robusto de estatus (texto o número) y badge “En Proceso de Baja”.
- Botón Pausar solo cuando aplica; aviso si el estatus no permite pausar/reanudar.
- Pausa, Rutina Online y `abrirModalMP` ahora usan `data('equipo-completo')` / `data('periodicidad')` en vez de `td:eq()`.
- `JSON.parse(response.Data)` protegido en `InsertarLinea` e `InsertarArea`.
- Corregido `new MantenimientoManager("Rutinas", ...)` (antes asignaba `this.URLBase`).
- Exportar Excel: botón correcto, descarga todos los registros filtrados desde el servidor y sin duplicar el No. Doc en la columna Equipo.
- Al agregar tipo/área se refrescan los catálogos del formulario y del filtro.

### 9.2 Pruebas realizadas (DBADMIN y IIS Express)

Entorno: HANA Cloud `DBADMIN` + IIS Express local (`http://localhost:54321`). **No se tocó TEST_JUNIO_2026 ni PTM_2022_FINAL.**

| Prueba | Resultado |
|---|---|
| Conexión HANA Cloud | OK |
| Alta + periodicidad con rollback | 0 equipos / 0 periodicidades (correcto) |
| Alta + periodicidad con commit | 1 / 1 y limpieza posterior a 0 / 0 |
| Update + rollback | Descripción original intacta |
| Forma de respuesta `SpPdxMTTOActualizaEstatusEquipo` | `[{"Estatus":"OK"}]` |
| Reactivación de periodicidad | SP responde “Periodicidad reactivada correctamente.” |
| `InsertaEquiposProduccion` HTTP | `SI`, aparece en `GetEquipos` |
| `AcualizaEquiposProduccion` HTTP (quitar/agregar periodicidad) | Correcto; `ESTATUS` 0 al quitar y 1 al reactivar |
| Pausar / reanudar HTTP | “En Pausa” con comentarios y fecha; luego “Activo” |
| Alta sin periodicidades | `NO` con mensaje de validación |
| Edición con error (nombre > 100 chars) | `ERROR` y sin cambios persistidos |
| Subida .txt como PDF | `ERROR`, sin solicitud y sin carpeta creada |
| Subida PDF + PNG válidos | `SI`, 1 solicitud, estatus 2, archivos creados |

**Conclusión:** los SPs no hacen COMMIT interno; el manejo transaccional funciona. Los datos de prueba (IDs 1608-1616) se eliminaron y se verificó: 0 equipos `ZZ_`, 0 periodicidades huérfanas, 0 solicitudes huérfanas y total de equipos sin cambios (1592).

### 9.3 Notas y pendientes

- El punto 1 (auth del lado del servidor) se deja **sin cambios por decisión del usuario**: es un desarrollo interno y la sesión vive en el navegador (`SessionStorage`), lo que permite publicar una nueva versión en IIS sin expulsar a los usuarios; el cambio se refleja al instante. **No se considera pendiente.**
- La numeración identity avanzó (gaps 1608-1616); es normal y no afecta.
- IIS Express mostró un warning preexistente de `log4net` (`RollingFileAppender` no encontrado), ajeno a estos cambios.
- **Desplegado en pruebas y producción (11/11/2026), sin pendientes de publicación.**
- **Pendiente opcional (requiere SP):** paginación real en `SpPdxMTTOConsultaEquipos`, filtro `P_USUARIO` (hoy comentado) y revisión de límites de tamaño en servidor.

---

## 10. Sesión 09/11/2026 — Revisión y hardening de Mantenimientos Preventivos

**Alcance:** revisión del módulo de Mantenimientos Preventivos y de `RutinasController` (usado por Preventivos para rutinas, evidencias y PDFs). El punto 1 de auth del lado del servidor sigue **sin cambios** por decisión del usuario.

### 10.1 Hallazgos críticos corregidos (confirmados con pruebas)

- **Borrado arbitrario en `GuardarRutinaBorrador`:** `imagenesEliminadas` se usaba directo en `Server.MapPath` + `File.Delete`; se confirmó borrando un archivo del app root. Ahora solo acepta rutas dentro de `~/EvidenciaRutinas` (contención canónica) y borra **después** de guardar correctamente.
- **Escritura arbitraria / path traversal en `GuardarRutina` y `GuardarRutinaBorrador`:** `Planta` y `OrdenTrabajo` se usaban sin sanitizar; se confirmó escribiendo un archivo en el app root con `Planta=".."`. Ahora se sanitizan, se valida la contención en `EvidenciaRutinas`, se usan nombres únicos y se validan extensión/MIME/tamaño (5 MB). La carpeta se crea solo cuando hay una imagen válida.
- **Borrado arbitrario en `RutinasController.EliminarImagen`:** `nombreArchivo` se concatenaba sin sanitizar; se confirmó borrando un archivo del app root. Ahora se usa `Path.GetFileName` y se valida que el archivo esté dentro de `~/ImagenesRutinas/{planta}/Rutina_{id}`.
- **XSS almacenado en plantillas de rutina:** `Rutinas/GuardarRutina` guardaba `ContenidoHTML` tal cual y `ObtenerRutinaCompleta`/`Default` lo devolvían crudo; el front lo inyecta con `.html()`. Se agregó `SanitizarHtmlRutina` (elimina scripts, iframes, objects, embeds, forms, base/link/meta/svg/math, `on*`, `javascript:`/`vbscript:`/`data:text/html`) y se aplica al guardar y al leer. `Views/web.config` bloquea el acceso directo a `.cshtml`, así que el riesgo era XSS almacenado, no RCE directo.
- **Uploads sin validación:** `GuardarRutina` aceptaba cualquier extensión. Ahora solo imágenes JPG/JPEG/PNG/GIF/WEBP/BMP con MIME y tamaño; `GuardarImagenes` y `GuardarPdfRutina` también validan tamaño/MIME.

### 10.2 Firmas (sin romper el flujo de borrador)

- OT **definitiva**: se exige la firma del rol, igual que el front: TecnicoMtto → Realizó, SupervisorProduccion → Supervisó, AdminMtto/Administrador → Mantenimiento.
- OT **borrador** (`TipoOperacion = "BORRADOR"`): **no exige firma**, conservando la lógica actual.
- `GuardarFirmaDigital` ahora escribe de forma atómica (no borra la firma anterior antes de escribir) y sanitiza el nombre de la carpeta de la orden.

### 10.3 Manejo de errores y limpieza

- `EsErrorHana` (case-insensitive) en los endpoints de Preventivos.
- `InsertarMP`: `try/catch` por equipo; un equipo inválido no tumba el lote completo.
- `InsertarSolicitudRefaccion`: solo actualiza el estatus si al menos un artículo se insertó; reporta si la actualización de estatus falla.
- `GuardarRutina`: si la validación posterior de finalización falla, la rutina ya guardada se reporta como éxito con advertencia.
- `ObtenerPeriodicidadesEquipo`: manejo de error del SP y deserialización segura.
- Evidencias nuevas se eliminan si el SP falla; las imágenes marcadas para borrar no se eliminan si el guardado falla.
- JS: `guardarRutina` respeta `response.Status`; el borrador sigue siendo best-effort; los comentarios ya no se envían como `"undefined"`; `escapeHtml` en listado, detalles, confirmaciones y data-attributes.

### 10.4 Pruebas realizadas

Entorno: HANA Cloud `DBADMIN` + IIS Express local. No se tocó `TEST_JUNIO_2026` ni `PTM_2022_FINAL`.

| Prueba | Resultado |
|---|---|
| Borrado traversal en `GuardarRutinaBorrador` | Bloqueado; archivo intacto |
| Borrado traversal en `Rutinas/EliminarImagen` | Bloqueado |
| Escritura con `Planta`/`Orden` manipulados | No escribió en app root; usó carpeta segura |
| Subida `.aspx` | Rechazada, sin carpeta |
| Sanitización HTML (`<script>`, `onerror`) | Eliminados; HTML legítimo conservado |
| OT definitiva sin firma | Rechazada con mensaje |
| **OT borrador sin firma** | Guardada correctamente |
| Borrado válido en `ImagenesRutinas` | Funciona |
| Build Debug + `node --check` | OK |

- Datos de prueba eliminados: rutina ID 7, OT `ZZ_DRAFT_TEST`, 0 actividades huérfanas, 0 archivos `__opencode*` y carpetas de prueba.

### 10.5 Notas y pendientes

- Auth del lado del servidor (#1) sin cambios por decisión del usuario (desarrollo interno; sesión en `SessionStorage` para publicar sin expulsar usuarios).
- No se envolvieron los flujos multi-paso en una sola transacción: se priorizó no perder el trabajo ya capturado (rutina, artículos, OT) y reportar advertencias. Si se requiere atomicidad estricta, se puede agregar.
- El saneador HTML es una mitigación por lista negra; para endurecimiento adicional conviene una librería de sanitización/CSP.
- `InsertarSolicitudRefaccion` y `SolicitarReprogramacion` funcionan por binding posicional de HANA (incluido el typo `p_ID_SOLIICTUD`); es frágil si cambia el orden de parámetros.
- `GCAceptarReprogramacion` apunta a un SP que no existe (constante muerta); `AceptarReprogramacion` usa correctamente `GCSolicitarReprogramacion`.
- **Desplegado en pruebas y producción (11/11/2026), sin pendientes de publicación.**

### 10.6 Archivos modificados

- `MantenimientosPTM/Controllers/MantenimientosPreventivosController.cs`
- `MantenimientosPTM/Controllers/RutinasController.cs`
- `MantenimientosPTM/Scripts/mantenimientos_preventivos_refactor.js`

---

## 11. Sesión 09/11/2026 — Revisión y ajustes del Calendario de Mantenimientos

**Alcance:** `CalendarioController.cs`, `calendario_mantenimientos_refactor.js` y `Views/Calendario/CalendarioMantenimientos.cshtml`. **No se alteró ningún stored procedure ni dato.**

### 11.1 Correcciones aplicadas

- **Fechas incompletas:** si solo venía `fechaInicio` o `fechaFin`, el controlador usaba el año completo. Ahora completa únicamente el límite faltante. Probado: solo inicio 01/12/2026 → 0; solo fin 31/01/2026 → 0; solo inicio 01/11/2026 → 5.
- **Validación de fechas:** rango invertido y formatos inválidos devuelven `Status=NO` con mensaje; también se valida en el front.
- **Parseo de fechas** con `TryParseExact("yyyy-MM-dd")` + fallback, sin depender de la cultura del servidor.
- **Parámetro `p_TIPOMANT`** corregido (antes `p_TIPOMANTENIMIENTO`), que funcionaba por posición pero era frágil.
- **Errores del SP** case-insensitive (`EsErrorHana`).
- **Tooltips:** se confirmó que funcionan; se mantuvieron y solo se escaparon los datos dinámicos para evitar XSS.
- **XSS:** tooltip y título del modal ahora usan `escapeHtml`.
- **Fechas en JS:** helpers `soloFecha`, `fechaLocal`, `sumarDiasISO` para evitar corrimientos por zona horaria (se eliminó `toISOString` del cálculo).
- **Estatus unificado** con `obtenerEstadoEvento` (Programado, Liberado, En espera de refacción, En proceso de firmas, Terminado).
- **IDs de evento** prefijados `P-` / `C-` para evitar colisiones.
- **Carrera AJAX:** token `_requestId`; las respuestas viejas se descartan y el loader solo se oculta con la petición vigente.
- **Ruido:** se quitó la alerta “Se cargaron N mantenimientos” en cada carga.
- **Limpieza:** se eliminaron `todosLosEventos` y `ContarRegistros` sin uso.
- **CSS:** cache-busting en `CalendarioMantenimientoPreventivo.css`.

### 11.2 Decisiones respetadas

- El filtro del SP por `HORA_APERTURA` y el pintado por fechas reales/siguiente mes **se dejaron como están** por decisión del usuario.
- Correctivos siguen requiriendo **2 firmas** (regla confirmada).
- El plugin/funcionamiento de tooltips se mantuvo intacto.

### 11.3 Pruebas realizadas

| Caso | Resultado |
|---|---|
| Noviembre completo | 5 registros |
| Solo inicio 01/12/2026 | 0 (antes devolvía todo el año) |
| Solo fin 31/01/2026 | 0 (antes devolvía todo el año) |
| Solo inicio 01/11/2026 | 5 |
| Rango invertido | `NO` con mensaje |
| Fecha inválida | `NO` con mensaje |
| Preventivo / Correctivo | 3 / 2 |
| HERRAMENTALES | 2 |
| Equipo BCP03 | 2 |
| Orden OTMP-011 | 1 |
| Build Debug + `node --check` | OK |

### 11.4 Notas y pendientes

- **Stored procedures alterados en esta ronda: 0.** Solo se modificó C#/JS/vista.
- `LEFT JOIN` del SP contra reprogramaciones: latente si algún día hay más de una solicitud por orden; hoy no hay duplicados. Se puede blindar con migración si se requiere.
- `addEventModal` / `guardarEvento` / `handleDateClick` quedan como código dormido (no se abren porque `dateClick` está comentado).
- Auth del lado del servidor (#1) sin cambios por decisión del usuario (desarrollo interno; sesión en `SessionStorage`).
- **Desplegado en pruebas y producción (11/11/2026), sin pendientes de publicación.**

### 11.5 Archivos modificados

- `MantenimientosPTM/Controllers/CalendarioController.cs`
- `MantenimientosPTM/Scripts/calendario_mantenimientos_refactor.js`
- `MantenimientosPTM/Views/Calendario/CalendarioMantenimientos.cshtml`

---

## 12. Sesión 09/11/2026 — Baja de equipos: borrador flexible

**Problema reportado:** al guardar la solicitud de baja como borrador aparecía:
`cannot insert NULL or update to NULL: "DBADMIN"."SpPdxMTTOInsertaSolicitudBaja": line 32 col 5`.

**Causa:** el SP hace `MERGE` y `MOTIVO_BAJA` era `NOT NULL`. El formulario no marcaba el motivo como obligatorio; al dejarlo vacío, `ConvertToHanaParameters` lo enviaba como `DBNull` y HANA rechazaba el `INSERT/UPDATE`. Los cambios previos de la sesión de Equipos (transacción, archivos, estatus) **no** modificaron los parámetros ni el SP.

### 12.1 Cambios aplicados

- **BD (DBADMIN):** se aplicó
  `ALTER TABLE "DBADMIN"."PdxMTTOSolicitudesBajaEquipos" ALTER ("MOTIVO_BAJA" NVARCHAR(500) NULL);`
- **Scripts nuevos en `SQL_MIGRACION/`:**
  - `MIGRACION_BAJA_MOTIVO_NULL_DBADMIN.sql`
  - `MIGRACION_BAJA_MOTIVO_NULL_TEST_JUNIO_2026.sql`
  - `MIGRACION_BAJA_MOTIVO_NULL_PTM_2022_FINAL.sql`
- **`EquiposController.InsertaSolicitudBajaEquipoProduccion`:**
  - Borrador (sin PDF): solo exige el equipo; si faltan, completa `FechaSolicitud` con hoy, `CodigoActivo` con el ID del equipo y `DescripcionActivo` con "Pendiente de capturar". `MOTIVO_BAJA` puede quedar `NULL`.
  - Solicitud final (con PDF): exige fecha, motivo, código y descripción; valida **antes** de escribir archivos o tocar la BD.
- **`_ModalSolicitudBajaEquipo.cshtml`:**
  - `MotivoBaja` ya no es `required`; se indica “Opcional en borrador; obligatorio al adjuntar el PDF”.
  - `CodigoActivo` y `DescripcionActivo` (readonly) dejaron de ser `required`; el servidor los completa en borrador y los valida en la solicitud final.

### 12.2 Pruebas realizadas

| Caso | Resultado |
|---|---|
| Borrador con motivo vacío | `SI`; `MOTIVO_BAJA = NULL`, código `6`, descripción “Pendiente de capturar”, estatus 4 |
| Solicitud final con PDF y motivo vacío | `NO` con “complete: el motivo de baja”; sin fila, sin archivos y equipo intacto |
| Limpieza | Solicitud de prueba eliminada y estatus del equipo restaurado (1) |

### 12.3 Notas

- **Stored procedures alterados en esta corrección: 0.** Solo hubo **1 `ALTER TABLE`** (DBADMIN).
- Scripts de TEST_JUNIO_2026 y PTM_2022_FINAL ejecutados y código desplegado en pruebas/producción (11/11/2026).
- Los cambios de esta corrección están en `EquiposController.cs`, `_ModalSolicitudBajaEquipo.cshtml` y los 3 scripts de migración.

---

## 13. Sesión 09/11/2026 — Correctivos: limpieza y endurecimiento

**Objetivo:** eliminar código muerto y aplicar protecciones/bugs potenciales **sin cambiar la lógica funcional** de Correctivos.

### 13.1 Código muerto eliminado

- Se eliminó el endpoint `GuardarRutina` de `MantenimientosCorrectivosController.cs` y los bindings `#btnGuardarRutina` / `#btnGuardarEstatus` del JS, además de las referencias a `#rutinaNombreEquipo` / `#rutinaProceso`.
- Correctivos **no guarda rutina**: la vista no tiene el botón/modal y el JS nunca definió `guardarRutina()`. El endpoint quedaba accesible por POST directo y escribía archivos antes de fallar; con su eliminación desaparece esa superficie.
- `POST /MantenimientosCorrectivos/GuardarRutina` ahora responde **404** (verificado).

### 13.2 Protecciones aplicadas

- **Firmas (`PrepararFirmaDigital` / `ConfirmarFirma` / `DescartarFirma`):**
  - Sanitización de `NumeroOrden` para evitar path traversal.
  - Validación de PNG (cabecera), tamaño máximo 2 MB y tipo de firma permitido.
  - Escritura a archivo temporal y reemplazo atómico; si la BD falla, se descartan los temporales.
  - `FIRMA_MANTENIMIENTO` / `NOMBRE_MANTENIMIENTO` se envían `NULL` para que el SP conserve lo existente y no intente guardar base64 en `NVARCHAR(500)`.
- **`InsertarOrdenTrabajoMC` y `InsertarOrdenTrabajoMCBorrador`:** null-safe en firmas, mismo comportamiento de validación (el borrador sigue sin exigir firmas), limpieza de archivos si falla la BD y registro del resultado de `GCActualizaMC` (el estatus 4 se conserva: es intencional).
- **XSS:** `escapeHtml` en listado, refacciones, carátula/impresión y PDF; `#tipoSOM` pasó de `.html()` a `.text()`; `buildDataAttributes` escapa todos los valores.
- **Fechas:** `TryParseExact("yyyy-MM-dd")` con `TryParse` de respaldo; si solo viene una fecha se completa el mes; error claro si el formato es inválido.
- **Filtros:** si el usuario capturó fechas, se envían siempre al SP (área/línea/orden ya no las anulan). Sin fechas y con filtro adicional se conserva la búsqueda en todo el historial.
- **`InsertarMC`:** error case-insensitive, `TryParse` de la solicitud y `try/catch` por equipo.
- **`InsertarSolicitudRefaccion`:** null-check, error case-insensitive y actualización de estatus solo si se insertó al menos un artículo.
- **`InsertarSolicitudMC`:** null-check y error case-insensitive.
- **Búsquedas:** los errores de `GetMantenimientoCorrectivo`, `BuscarEmpleados` y `ObtenerTecnicosOT` se registran con `Trace.TraceError`; se mantiene el contrato actual (`[]`) para no romper los llamadores.
- **Orden de trabajo:** placeholder cambiado a "Orden exacta (ej. OTMC-001)" para reflejar que el SP usa `=`.

### 13.3 Lo que NO se cambió

- Borrador: sigue sin exigir firmas y sin cambiar estatus a 4.
- OT final: mismas validaciones; **no** se agregaron firmas obligatorias.
- Estatus 4 al guardar OT: intencional, sin cambios.
- Fórmula de `calcularTiemposCierreOT`: sin cambios (queda como observación).
- Filtros de estatus/área/línea ya funcionaban: sin cambios.
- Tooltips y autenticación del servidor: sin cambios.
- **0 stored procedures alterados; 0 cambios de esquema.**

### 13.4 Pruebas

| Caso | Resultado |
|---|---|
| `POST /GuardarRutina` | 404 (endpoint eliminado) |
| Compilación | OK |
| `node --check` del JS | OK |
| `escapeHtml` (unitario) | OK (`<script>`, comillas, `&`, null, número) |
| Filtros: sin fechas / NOV+área / OCT+área / NOV+orden | 2 / 2 / **0** / 1 |
| Una sola fecha (inicio o fin) | 2 y 2 (completa el mes de la fecha enviada) |
| Fecha inválida (`abc`) | mensaje claro, sin consultar el SP |
| Orden exacta `OTMC-001` / parcial `OTMC` | 1 / 0 (exacta, como se definió) |
| OT final con 2 firmas PNG | `SI`; `FIRMA_REALIZO=SI`, `FIRMA_SUPERVISO=SI`, `FIRMA_MANTENIMIENTO=NULL`; archivos creados |
| Borrador sin firmas | `SI`; fila creada y **0** archivos |
| Firma inválida (no PNG) | `NO`; sin fila y sin archivos |
| Path traversal `../../evil` | sin archivos fuera de `FirmasOTCorrectivo`; carpeta sanitizada |
| Re-guardado de OT existente | `FIRMA_MANTENIMIENTO` se conserva (`MANT-OLD`); 2 PNG y 0 `.tmp` |

### 13.5 Archivos

- `MantenimientosPTM/Controllers/MantenimientosCorrectivosController.cs`
- `MantenimientosPTM/Scripts/mantenimientos_correctivos_refactor.js`
- `MantenimientosPTM/Views/MantenimientosCorrectivos/MantenimientoCorrectivo.cshtml`

---

## 14. Sesión 10/11/2026 — Almacén: migración de tablas y SPs desde on-premise

**Objetivo:** alinear HANA Cloud (`DBADMIN`) con on-premise para el módulo Almacén, sin tocar los SPs que ya estaban iguales.

### 14.1 Comparación de SPs (127 exportados)

| Estado | Cantidad |
|---|---|
| Iguales / solo cosméticos | 110 |
| Diferencias funcionales reales | 15 |
| Faltaban en cloud | 2 |

- Los 2 SPs de Calendario/Preventivos (`SpPdxMTTOObtenerMantenimientosCompletados`, `SpPdxMTTOObtenerMantenimientosPorRango`) resultaron **iguales**: no hay conflicto.
- Los 2 SPs de Almacén adaptados (`SpPdxMTTOGetSolicitudesCompra_filtradas`, `SpPdxMTTOConsultaSolicitudesCompraMP`) se conservaron como están.

### 14.2 Tablas creadas (15)

**Parte 1 (5):** `PdxMTTORechazoDevolucion`, `OBTN`, `OBTQ`, `NNM1`, `OPOR`.

**Parte 2 (10):** `OIGE`, `IGE1`, `OPRQ`, `PRQ1`, `OPRC`, `OUBR`, `OUSR`, `OWHS`, `PdxMTTOMCSolicitudRefacciones`, `@PDX_NOTIFICACIONES`.

- `OWHS` se creó **sin** los 3 triggers ETL (`OWHS_tracking`, `ETL_S`).
- `OUSR.UserPrefs` quedó como `BLOB`.
- Se normalizaron las DDLs con `CS_*`, `LONGDATE`, `DAYDATE`, `UNLOAD`, `WITH PARAMETERS` y `;` faltantes.

### 14.3 Columnas agregadas a tablas existentes

- `PdxMTTOMovimientosAlmacen`: `ESTATUS INTEGER`, `COMENTARIOS NVARCHAR(1000)`.
- `PdxMTTOMPSolicitudCompra`: `PLANTA NVARCHAR(10)`, `FECHA_REQUERIDA DATE`.
- `PdxMTTOMPSolicitudRefacciones`: `ACEPTADA_MANTENIMIENTO NVARCHAR(10)`.
- `PdxMTTOMPSolicitudCompraDetalle`: `CODIGO_ARTICULO NVARCHAR(50)`.

**Notas de tipo:** on-premise usa `PLANTA INT` y `ACEPTADA_MANTENIMIENTO BOOLEAN`; en cloud se dejaron como `NVARCHAR(10)` para no romper el contrato string del front-end y porque HANA convierte `BOOLEAN` a `'true'/'false'`. `FECHA_REQUERIDA` quedó como `DATE` (equivalente a `DAYDATE`).

### 14.4 SPs migrados

- **9 SPs de Almacén** creados en la primera tanda (incluye los 2 adaptados).
- **15 SPs** migrados/creados en la segunda tanda:
  - `SpPdxMTTOGetSalidasPorOT`, `GetBalanceOT`, `ConsultaArticulosPorOT`, `GetSolicitudesCompraMP`, `InsertarSolicitudCompraMP`, `GetUsuariosXPlanta`, `GetDetallesSolicitudCompraMP`, `InsertarSolicitudCompraDetalleMP`, `ActualizarSolicitudRefaccion`, `ActualizarCabeceraSolicitudCompraMP`, `ValidarProductosTerminadosExistentes`, `UpdateUDFSalida`, `CantidadesRequisicionXAlmacen`, `ConsultaOrdenesFabricacion`, `InsertarSolicitudRefaccionCorrectivo`.
- Los 110 SPs iguales/cosméticos **no se tocaron**.

### 14.5 Validación

- Compilación en staging (`ZZ_`): **19/19 OK**.
- Ejecución directa: lecturas y 2 inserts con limpieza **OK**.
- Comparación de las 30 tablas propias: **sin columnas faltantes**; solo diferencias de tipo/default/identidad.
- Scripts: `MIGRACION_ALMACEN_TABLAS.sql`, `MIGRACION_ALMACEN_TABLAS_2.sql`, `MIGRACION_ALMACEN_SP.sql`, `MIGRACION_ALMACEN_SP_FIX.sql`, `MIGRACION_ALMACEN_SP_2.sql`.
- Reportes: `REPORTE_FALTANTES_ALMACEN.md`, `SQL_ORIGEN_ALMACEN/REPORTE_DEPENDENCIAS.md`.

### 14.6 Archivos

- `SQL_MIGRACION/APLICADOS/DBADMIN/ALMACEN/MIGRACION_ALMACEN_*.sql`
- `REPORTE_FALTANTES_ALMACEN.md`
- `SQL_ORIGEN_ALMACEN/` (definiciones, DDLs, reportes)
- `SQL_ORIGEN_GENERAL/README.txt`

---

## 15. Limitación del ambiente cloud (10/11/2026)

- En **HANA Cloud no se usará SAP Service Layer** para crear documentos SAP (salidas, entradas, devoluciones, órdenes de compra, etc.).
- Solo se migraron las **tablas SAP** a `DBADMIN` para poder probar el **flujo normal del portal**.
- La **creación de movimientos en SAP no estará disponible** en cloud; es una limitación aceptada.
- Lo que **sí** se puede probar: navegación, listados, solicitudes, autorizaciones, firmas, estatus y movimientos internos del portal.
- Las tablas SAP nuevas (`OIGE`, `IGE1`, `OPRQ`, `PRQ1`, `OPRC`, `OUBR`, `OUSR`, `OWHS`, etc.) están **vacías**; se pueden poblar con un **seed de datos de ejemplo** para pruebas.
- El seed debe usar claves prefijadas (por ejemplo `ZZTEST`) para poder limpiarlo sin afectar datos reales.

---

## 16. Seed de prueba de Almacén con varios artículos reales (10/11/2026)

- **Seed principal:** `SQL_MIGRACION/SEEDS/DBADMIN/SEED_ALMACEN_PRUEBA_REAL.sql`
- **Limpieza:** `SQL_MIGRACION/SEEDS/DBADMIN/CLEANUP_ALMACEN_PRUEBA.sql`
- **No inserta** en `OITM`/`OITW`/`OITB`; usa 13 artículos reales con stock. Como es ambiente de pruebas, actualiza solo el `OITW.ExpensesAc` de esos 13 artículos (almacenes `COR040`/`P2040`) a `5-101-001-005` para que `CuentaContable` salga en el portal.
  - **Planta 1 / COR040:** `42000000001` (29/30/60), `42000000006` (4/2/4), `42000000008` (8/5/10), `42000000010` (25/5/25), `42000000018` (212/0/0), `42000000051` (269/462/923, queda pendiente).
  - **Planta 2 / P2040:** `42000000474` (484/100/200), `45000000006` (416/208/416), `42000000465` (5591/0/0), `42000002418` (1315/0/0), `42000000472` (1113/0/0), `42000000477` (1045/0/0), `45000000001` (406/208/416).
- **Datos:** 13 refacciones (12 atendidas + 1 pendiente), 2 solicitudes de compra (planta 1 y 2), 12 detalles, OC con 12 líneas, salida con 12 líneas, 12 movimientos SALIDA, 4 DEVOLUCIONES, 2 rechazos y 4 solicitudes de refacción de Correctivos.
- **Catálogos `OPRC` reales (crítico para los combos):** `SpPdxMTTOGetCostCenters` lee `OPRC` por `DimCode`: `1`=Departamento, `2`=Proceso, `3`=Gastos, `4`=Cedis.
  - Script: `SQL_MIGRACION/SEEDS/DBADMIN/SEED_OPRC_REAL.sql` — **416 filas** del export on-premise `TEST_JUNIO_2026` (DimCode 1=14, 2=11, 3=9, 4=14, 5=368).
  - Origen: `SQL_MIGRACION/SEEDS/DBADMIN/ORIGEN_OPRC_TEST_JUNIO_2026.csv`.
  - El seed de Almacén **ya no toca `OPRC`**; primero se carga el de OPRC y luego el de Almacén.
  - Valores clave que preselecciona el front: Proceso `PPVC`, Gastos `GIF`, Cedis `CCOR` (planta 1) / `PLANTA2` (planta 2), Departamento `DMAN` (MANTENIMIENTO).
  - Sin estas filas los combos muestran **“Sin opciones”** aunque el SP funcione.
- **Catálogo `OUBR` real (sucursales):** `SQL_MIGRACION/SEEDS/DBADMIN/SEED_OUBR_REAL.sql` — **14 sucursales** del export `TEST_JUNIO_2026` (origen `SQL_MIGRACION/SEEDS/DBADMIN/ORIGEN_OUBR_TEST_JUNIO_2026.csv`). El seed de Almacén ya no toca `OUBR`.
  - `SpPdxMTTOGetDepSucursal` cruza `OHEM.branch` con `OUBR.Code`; el solicitante de prueba (`branch=1`) ahora devuelve `Sucursal=CORP`.
- **Pruebas (ejecutadas en HANA Cloud):** `ConsultaArticulos` devuelve 6 filas para `OTMC-001` y 7 para `OTMC-002`; solicitudes 2 (planta 1/2 filtra 1 cada una); detalles 5/7; líneas OC/PRQ/OIGE 12/12/12; salidas 5/7; devoluciones 2/2; `GetArticuloSalidaM` devuelve `CuentaContable=5-101-001-005`. Los 4 combos de centros de costo devuelven 14/11/9/14 filas reales.
- **Nota:** el cleanup borra solo los datos transaccionales/de prueba (`ID 900001-900099`, `ZZTEST`); no revierte el `ExpensesAc` de los 13 artículos ni borra `OPRC`.
- **Seed fake opcional:** `SEED_ALMACEN_PRUEBA.sql` (artículo `ZZTEST01`) ya fue limpiado; no usar si se quieren artículos reales.

---

## 17. Preventivos: reprogramación libre, filtro de líneas y fixes finales (10-11/11/2026)

### Reprogramación
- **Se quitó** el checkbox “Enviar al siguiente mes” del modal. Ahora solo se eligen **Fecha Inicio real** y **Fecha Fin real**.
- **Rango permitido:** del **primer día del mes actual** al **último día del mes siguiente**. Si el periodo original del MP termina después, se respeta ese fin.
- **No se permiten** fechas anteriores al mes actual.
- Las fechas se comparan como texto `YYYY-MM-DD` (sin `new Date('YYYY-MM-DD')`) para evitar el corrimiento UTC.
- Al guardar, el SP `SpPdxMTTOSolicitarReprogramacion` registra las fechas reales con estatus `NA` y se aplican **de inmediato**.
- **Corrección clave:** `AceptarReprogramacion` ahora manda `p_ENVIAR_SIGUIENTE_MES = NULL`; antes mandaba `TRUE` y el SP borraba `FECHA_REAL_INICIO`/`FECHA_REAL_FIN`, provocando que el MP se fuera al siguiente mes.
- **Validación backend:** `SolicitarReprogramacion` valida el mismo rango (mes actual → mes siguiente o fin del periodo).

### Tooltip de reprogramación
- Ya **no depende** de `ENVIAR_SIGUIENTE_MES`. Se calcula comparando `FechaRealInicio` contra `FechaInicioPeriodo` (fallback `FechaInicioMantenimiento`):
  - Mismo mes → `✅ REPROGRAMADO`
  - +1 mes → `✅ SE ENVIÓ AL SIGUIENTE MES`
  - +2 meses o más → `✅ REPROGRAMADO A N MESES`
  - Mes anterior → `✅ REPROGRAMADO A N MESES ANTES`
- El texto se guarda en `data-repro-tooltip` y el CSS lo pinta con `content: attr(data-repro-tooltip)`.
- Registros viejos sin fecha real pero con bandera `ENVIAR_SIGUIENTE_MES = TRUE` conservan el badge “SE ENVIÓ AL SIGUIENTE MES”.

### Filtro de líneas
- En `mantenimientos_preventivos_refactor.js` se cambió `llenarLineas(planta, Area, 1, ...)` por `llenarLineas(planta, Area, null, ...)`.
- No se agregaron filtros nuevos.
- Ahora el combo incluye servicios y líneas auxiliares: `SERVICIOS`, `SERVICIOS EXTERNOS`, `MOLINO PEAD`, `SILOS`, `SILOS PEAD LISO`, `SILOS PEAD CORR`, `CALIDAD`, `MEZCLADO`, `FFCC`, `OTROS`.
- **Pruebas:** PEAD LISO devuelve 12 líneas; PVC devuelve 21 líneas.

### Flujo legacy de aceptar/rechazar oculto
- Se eliminó el botón `btn-aceptar-reprogramacion` del render de acciones.
- Se quitó el bloqueo de botones y el pintado amarillo (`solicitud-pendiente`) para solicitudes pendientes.
- El endpoint `AceptarReprogramacion` y sus funciones quedan por compatibilidad, pero ya no se muestran en la UI.
- Todo el flujo nuevo se aplica con estatus `NA` (inmediato), sin aprobación.

### Columnas de `PdxMTTOAreasxPlanta` (filtro Proceso)
- `STATUS`: **1 = producción, 0 = no producción**.
- `ACTIVE`: **1 = área activa, 0 = inactiva**.
- `SpPdxMTTOConsultarProcesosPorPlanta` filtra:
  ```sql
  WHERE "PLANTA" = :P_PLANTA
    AND (:P_PRODUCCION IS NULL OR "STATUS" = :P_PRODUCCION)
    AND "ACTIVE" = 1
  ```
- Si se manda `P_PRODUCCION = NULL`, solo aparecen las áreas con `ACTIVE = 1`. Las áreas de `SERVICIOS`, `MOLINO PEAD`, `CALIDAD`, `MEZCLADO`, `SILOS`, etc. tienen `ACTIVE = 0`, por eso no salen.
- Además, esas áreas **no tienen equipos asignados**: los equipos de servicios están en áreas productivas (PVC/PEAD LISO) con una **línea** cuyo `PRODUCCION = 0`. Por eso el filtro correcto para servicios es el de **Línea de Producción**, no el de Proceso.
- Recomendación: dejar `llenarProcesos(..., 1, ...)` (solo procesos productivos) y usar el filtro de líneas con `null`. Si se quisiera “SERVICIOS” como proceso, habría que asignar equipos a esa área y poner `ACTIVE = 1`.

### SP principal de rango (versión final)
- **Problema 1:** al mover un MP a +2 meses (octubre → diciembre), el colchón ±1 mes de `MANTENIMIENTOS_CALCULADOS` lo ocultaba.
- **Problema 2:** el SP solo usaba las fechas reales si `ENVIAR_SIGUIENTE_MES = FALSE`; con la bandera histórica en `TRUE` las ignoraba.
- **Problema 3:** si había varias solicitudes por `NUMERO_ORDEN`, la CTE `ESTATUS_REPROGRAMACION` duplicaba la OT en la tabla.
- **Solución final:**
  - Se quitó el colchón de fechas de `MANTENIMIENTOS_CALCULADOS`.
  - Las fechas reales mandan siempre que existan, sin importar `ENVIAR_SIGUIENTE_MES`.
  - `ESTATUS_REPROGRAMACION` toma **una sola solicitud por orden** (prioriza NA/Aceptada con fechas reales).
- **Script vigente:** `SQL_MIGRACION/APLICADOS/COMUN/MIGRACION_PREVENTIVOS_SP_RANGO.sql`.
- **Versión anterior (revertida en producción):** `SQL_MIGRACION/OBSOLETO/MIGRACION_PREVENTIVOS_SP_RANGO_VERSION_ANTERIOR.sql`.
- **Validado en DBADMIN:** con `ENVIAR_SIGUIENTE_MES=TRUE` y fechas reales, `OTMP-011` aparece en diciembre con las fechas reales; con una solicitud duplicada, aparece una sola vez.

### Safeguard de `SpPdxMTTOSolicitarReprogramacion`
- Si `P_ID_SOLICITUD` viene en 0/null, busca la última solicitud no rechazada del mismo `NUMERO_ORDEN` y la actualiza.
- Si no existe ninguna, inserta una nueva.
- Evita filas duplicadas cuando el front no manda el ID.
- Script: `SQL_MIGRACION/APLICADOS/COMUN/MIGRACION_PREVENTIVOS_SP_SOLICITAR_REPROGRAMACION.sql`.
- También se corrigió el typo `p_ID_SOLIICTUD` → `p_ID_SOLICITUD` en el controller.

### Estado final (11/11/2026)
- Correcciones aplicadas/validadas en DBADMIN, TEST_JUNIO_2026 y PTM_2022_FINAL.
- **Reprogramación de Preventivos: funcionando en el portal publicado (validado por el usuario 11/11/2026). Se marca como completada.**
- `SQL_MIGRACION/PENDIENTES/` contiene solo los 2 scripts de costo promedio de devoluciones (TEST_JUNIO_2026 y PTM_2022_FINAL), pendientes de aplicar en servidor.
- Bitácora: `SQL_MIGRACION/MIGRACIONES_APLICADAS.md`.
- Verificación: `SQL_MIGRACION/VERIFICACION/CHECK_REPROGRAMACION_FECHAS_REALES.sql`.

### Prueba E2E en portal (usuario SupervisorPlaneacion)
- Usuario: `bravoaj@ptmexico.com` (JORGE LUIS BRAVO ACOSTA, PLANEADOR PROD P1).
- Se validó:
  - Modal sin checkbox de “siguiente mes”.
  - `min=2026-11-01`, `max=2026-12-31` para un MP de noviembre.
  - Octubre rechazado con mensaje de rango permitido.
  - `OTMP-012` reprogramado a `10-12/11/2026`: guardado con `ESTATUS=NA`, fila con `✅ REPROGRAMADO`.
  - `OTMP-011` reprogramado de octubre a `10-12/12/2026`: fila con `✅ REPROGRAMADO A 2 MESES`.
  - `OTMP-011` (octubre → noviembre) mostró `✅ SE ENVIÓ AL SIGUIENTE MES`.
  - Filtro de líneas PEAD LISO mostró servicios, molino, silos, FFCC y otros.

### Archivos tocados
- `MantenimientosPTM/Views/MantenimientosPreventivos/MantenimientoPreventivo.cshtml`
- `MantenimientosPTM/Scripts/mantenimientos_preventivos_refactor.js`
- `MantenimientosPTM/Controllers/MantenimientosPreventivosController.cs`
- `MantenimientosPTM/Content/MantenimientosPreventivos.css`

---

## 18. Sesión 11/11/2026 — Devolución de refacciones con costo promedio

**Requerimiento:** al generar la devolución a SAP, el costo debe ser el **costo promedio del artículo al momento de la devolución** (`OITM.AvgPrice`).

### Situación encontrada

- `LogicaAlmacen.CrearEntradaDevolucionAsync` construía `InventoryGenEntries` **sin enviar costo** (`Price`), por lo que SAP aplicaba su valoración por defecto.
- `OITW.AvgPrice` está en **0** en DBADMIN; el costo real vive en `OITM.AvgPrice` (`EvalSystem = A`, promedio móvil).
- `SpPdxMTTOGetArticuloSalidaM` no devolvía el costo.

### Cambios aplicados

- SP `SpPdxMTTOGetArticuloSalidaM`: agrega `T1."AvgPrice" AS "CostoPromedio"`.
- SP `SpPdxMTTOGetSalidasPorOT`: agrega `I."AvgPrice" AS "CostoPromedio"` para que el modal de devolución muestre el costo antes de confirmar.
- `CrearEntradaDevolucionAsync`: lee `CostoPromedio` y lo envía en `DocumentLines[].Price`.
  - Si el costo es 0/null, registra warning y deja que SAP use su valoración por defecto.
  - Se usa `Convert.ToString(..., InvariantCulture)` + `decimal.TryParse` para evitar problemas de cultura.
- Se usa `OITM.AvgPrice` (no `OITW.AvgPrice`, que está en 0 en este ambiente).
- **UI del modal de devolución** (`SolicitudRefacciones.cshtml` + `solicitud_refacciones_refactor.js`):
  - Nuevas columnas **Costo Prom.** y **Valor**.
  - Total **Valor a devolver** en la cabecera de la tabla.
  - **Tooltip en la celda Valor** y en el icono de información del encabezado, explicando que es cantidad × costo promedio y que representa el costo de inventario para SAP.
  - El valor se recalcula al cambiar la cantidad y al seleccionar/deseleccionar filas.
  - Las columnas se leen por `data-*`, ya no por índice de `td`, para evitar rupturas si cambia el orden.

### Scripts

- `SQL_MIGRACION/APLICADOS/DBADMIN/ALMACEN/MIGRACION_ALMACEN_DEVOLUCION_COSTO_PROMEDIO.sql` — **aplicado en DBADMIN**.
- `SQL_MIGRACION/PENDIENTES/MIGRACION_DEVOLUCION_COSTO_PROMEDIO_TEST_JUNIO_2026.sql` — pendiente (usa `ALTER PROCEDURE`).
- `SQL_MIGRACION/PENDIENTES/MIGRACION_DEVOLUCION_COSTO_PROMEDIO_PTM_2022_FINAL.sql` — pendiente (usa `ALTER PROCEDURE`).
- **On-premise no soporta `CREATE OR REPLACE PROCEDURE`**: en TEST_JUNIO_2026 y PTM_2022_FINAL siempre se usa `ALTER PROCEDURE` porque el SP ya existe. `CREATE OR REPLACE` solo se usó en DBADMIN (cloud).

### Validación

- SP probado en DBADMIN con las solicitudes 900003 y 900007: devuelve `CostoPromedio` 9.8589 y 4.6748, igual a `OITM.AvgPrice`.
- `GetSalidasPorOrdenTrabajo` devuelve `CostoPromedio` por fila (verificado: 10.1774, 14.0663, 9.8589, 12.3111, 27.6218).
- Prueba de UI en navegador (OTMC-001): modal con 16 columnas, costo por artículo y total **$151.13**; al bajar una cantidad de 3 a 1 el valor de la fila pasó a **$9.86** y el total a **$131.41**.
- `node --check` del JS OK; sin errores de JS propios (solo el aviso de WebSocket de SignalR, que cae a long polling).
- El POST a SAP no se puede probar en cloud (`saphaplastic:50000` inaccesible); queda pendiente validar en el servidor con Service Layer.
- Build Debug OK (solo warning preexistente de `EmailService`).

### Notas

- Si en el futuro se poblara la valuación por almacén, habría que evaluar `OITW.AvgPrice` en lugar de `OITM.AvgPrice`.
- El campo de Service Layer usado es `DocumentLines[].Price` (documento `InventoryGenEntries`).
- Archivos tocados: `LogicaAlmacen.cs`, `SolicitudRefacciones.cshtml`, `solicitud_refacciones_refactor.js` y los 3 scripts SQL de la migración.

---

## 19. Sesión 11/11/2026 — Clasificación de Abocinadores (planta 2)

**Estado:** **RESUELTO** por el usuario (confirmado 12/11/2026).

**Problema:** el técnico MIGUEL ÁNGEL MEDINA PÉREZ (posición 3, `TecnicoMtto`, planta 2) no veía la **OTMP-014** en Preventivos.

**Causa:** el equipo **Abocinador 9** (ID 435) estaba clasificado como `HERRAMENTALES`. La regla de posiciones del SP de rango solo muestra equipos `MANTENIMIENTO` a los técnicos TEC MTTO (posiciones `44,3,82,100`); los HERRAMENTALES (posiciones `8,95,101`) no le aparecen.

**Cambio en DBADMIN:** los 6 equipos `Abocinador N` de planta 2 pasaron de `HERRAMENTALES` a `MANTENIMIENTO`:

- IDs: 377, 391, 435, 465, 473, 481.

**Script aplicado:** `SQL_MIGRACION/APLICADOS/DBADMIN/FIX_CLASIFICACION_ABOCINADORES_DBADMIN.sql`.

**Validación:** con el usuario de Miguel, el listado de Preventivos ahora devuelve **OTMP-014, OTMP-015, OTMP-016 y OTMP-017**.

**Estado:** **RESUELTO** por el usuario (confirmado 12/11/2026). Se aplicó el `UPDATE` equivalente en `TEST_JUNIO_2026` (y `PTM_2022_FINAL` si aplicaba). La clasificación es un campo del portal (`PdxMTTOGestionEquipos`), no de SAP, así que no la sobrescribe la sincronización.

---

## 20. Sesión 11/11/2026 — Salida de mercancía a SAP: “Failed to initialize object data”

**Estado:** **RESUELTO** por el usuario (confirmado 12/11/2026). Se conserva el diagnóstico como referencia.

**Contexto:** Almacén → Solicitud de Refacciones → Generar Salida de Mercancía.

Flujo:
`solicitud_refacciones_refactor.js` → `POST /Almacen/GenerarSalidaMercancia` (`AlmacenController.cs:1851`) → `LogicaAlmacen.CrearSalidaMercanciaAsync` (`LogicaAlmacen.cs:325`).

### Dónde quedan los logs

- Logger: `AlmacenSolicitudCompra`.
- Appender: `AppenderAlmacenSolicitudCompra` en `Web.config`.
- Archivo: `Logs\Almacen\SolicitudCompra\LogSolicitudCompra.txtYYYYMMDD.log` (relativo a la carpeta publicada).
- Nivel `DEBUG`: incluye el JSON enviado y el body de respuesta de SAP.

### Respuesta observada

- Login a SAP **OK**.
- POST a `https://saphaplastic:50000/b1s/v1/InventoryGenExits`.
- SAP responde **HTTP 400**:

```json
{
  "error": {
    "code": -1,
    "message": {
      "lang": "en-us",
      "value": "Failed to initialize object data"
    }
  }
}
```

- Ocurrió con **OTMC-021** (items `42000000540` y `42000001604`) y **OTMP-156** (item `44000000218`), siempre con la misma respuesta.

Payload enviado (resumen):
`Series: 263`, `CostingCode: DMAN`, `CostingCode2: PPVC`, `CostingCode3: GIF`, `CostingCode4: CCOR`, `U_EMPLEADO: MPVCC`, `U_ALMACENISTA: ATA1`, `U_U_PDX_SOLICITANTE: 1606/3334`.

### Verificado que NO es la causa

- Los artículos existen, son inventariables (`InvntItem='Y'`) y su almacén es `COR040`.
- `OPRC`: `DMAN` DimCode 1, `PPVC` DimCode 2, `GIF` DimCode 3, `CCOR` DimCode 4.
- Las UDFs están en la tabla correcta según los DDLs:
  - `OIGE.U_U_PDX_SOLICITANTE` (encabezado)
  - `IGE1.U_EMPLEADO` y `IGE1.U_ALMACENISTA` (líneas)
- Login y logout de SAP funcionan.

### Sospechosos / pendiente de diagnosticar en el servidor

1. **Serie 263** en `NNM1`: debe existir en la **misma compañía** a la que se conecta el Service Layer, con `ObjectCode='60'` y `Locked='N'`.
2. **UDFs**: revisar `CUFD` / `OUFV` para `OIGE` e `IGE1`; que `U_EMPLEADO`, `U_ALMACENISTA` y `U_U_PDX_SOLICITANTE` tengan valores válidos (`MPVCC`, `ATA1`, `1606`, `3334`).
3. **`DocDueDate`**: es válido, pero se puede descartar en la prueba mínima.
4. Confirmar que el `Database` del portal y el `SapDatabase` del Service Layer apunten a la misma compañía.

### Prueba rápida para aislar el campo

POST mínimo a `InventoryGenExits` con solo:

```json
{
  "DocDate": "2026-11-11",
  "DocumentLines": [
    { "ItemCode": "44000000218", "Quantity": 1, "WarehouseCode": "COR040" }
  ]
}
```

Si funciona, agregar en este orden hasta que falle:

1. `Series: 263`
2. `CostingCode` / `CostingCode2` / `CostingCode3` / `CostingCode4`
3. `U_EMPLEADO` / `U_ALMACENISTA`
4. `U_U_PDX_SOLICITANTE`

### Hallazgo de código

`LogicaAlmacen.cs:454` lee:

```csharp
ConfigurationManager.AppSettings["ObjectTypeSalida"]
```

Pero en `Web.config` la llave es **`ObjectTypeSalidas`** (plural). Hoy no rompe porque el SP `SpPdxMTTOGetSeriesByName` asume `ObjectCode = '60'`, pero conviene corregirlo para pedir la serie explícita de Goods Issue.

### Estado

- **RESUELTO por el usuario (12/11/2026).**
- No se modificó código por este tema en la sesión; el usuario aplicó la corrección en SAP/servidor.
- Se conserva el diagnóstico de arriba como referencia.

---

## 21. Sesión 12/11/2026 — Revisión de rutinas de planta 2 y mapeo real de IDs

### Archivos y rutas

- **Excel reales (finales):**
  - `C:\Paradox\PTM\DEVELOPMENT\RutinasMantenimiento\TemplateRutinasPlanta2 27-03-2026 Herramentales.xlsx` — hoja `rutinasherr`, 68 rutinas.
  - `C:\Paradox\PTM\DEVELOPMENT\RutinasMantenimiento\TemplateRutinasPlanta2 27-03-2026 Mantenimiento.xlsx` — hoja `rutinas2`, 146 rutinas.
- **Rutinas del servidor (`.cshtml`):**
  - `C:\Paradox\PTM\DEVELOPMENT\DOCUMENTOS_DESARROLLO\RUTINAS_SERVER\Rutinas\2` — 228 archivos.
- **Backup de rutinas:**
  - `...\RUTINAS_SERVER\Rutinas_BACKUP_20261112_175135`
- **Backups de Excel:**
  - `...\RutinasMantenimiento\TemplateRutinasPlanta2 27-03-2026 Herramentales_BACKUP_20261112.xlsx`
  - `...\DOCUMENTOS_DESARROLLO\PLANTA 2\TemplateRutinasPlanta2 27-03-2026_BACKUP_20261112.xlsx`
- **Mapeos:**
  - `...\DOCUMENTOS_DESARROLLO\PERIODICIDADES_PTM_2022_FINAL.csv` — 68 herramentales, delimitador `;`.
  - `...\RUTINAS_SERVER\MAPEO_REAL_RUTINAS2_20261112.csv` — 146 filas, mapeo real de `rutinas2`.
  - `...\Views\Rutinas\PeriodicidadesEquiposPII.csv` — **desfasado**, no usar para planta 2 general.

### Corrección de rutinas

**Herramentales (`rutinasherr`):**
- 68 rutinas; **57 archivos corregidos**.
- **117 cambios de notas:** 57 nota 2 + 57 nota 4 + 3 nota 1.
- Nota 3 correcta en todas; nota 5 vacía.
- Actividades: **0 diferencias**.
- Validación final: **0 diferencias** en notas 1–4 y actividades.

**Planta 2 general (`rutinas2`):**
- 146 rutinas; notas 1–3 correctas; nota 4 no aplica (esos archivos no tienen la sección).
- **1 actividad corregida:** `Rutina_610.cshtml` (Recibidor 1, actividad 18; se quitaron los `....`).
- Actividades: **0 diferencias** después de la corrección.
- Servicios especiales: **Molino Zerma → `Rutina_277`**, **Pulverizador Zerma → `Rutina_281`**.
- Validación final: **0 diferencias** en notas y actividades.

### Desfase real de IDs en el Excel

La columna `IdEquipo` estaba mal: **144 de 146 IDs diferentes**. La llave correcta es **`NotaEncabezado2` = `NUMERO_DOC_PM_CALIDAD`**.

Ejemplos reales:

| Equipo | Excel | Real | PID | Archivo |
|---|---:|---:|---:|---|
| Recibidor 1 | 377 | **371** | **610** | `Rutina_610` |
| Recibidor 2 | 384 | **378** | **152** | `Rutina_152` |
| Recibidor 3 | 391 | **385** | **582** | `Rutina_582` |
| Recibidor 4 | 398 | **392** | **120** | `Rutina_120` |
| Recibidor 5 | 404 | **398** | **447** | `Rutina_447` |
| Tenso 2 | 387 | **381** | **159** | `Rutina_159` |
| Molino Zerma | 507 | **501** | **277** | `Rutina_277` |
| Pulverizador Zerma | 509 | **503** | **281** | `Rutina_281` |

Casos con código distinto al maestro:
- **Tenso 2:** maestro `PL2-PVC-TV2`; archivo/Excel `PL2-PVC-T2`.
- **Molino Zerma:** maestro `PL2-SER-MZ1`; archivo/Excel `PL2-SER-PULVZ`.

### Estado de los Excel

- `Herramentales.xlsx`: **68/68 IDs** llenados (ME1=518, Codo 1=548, Yee 1=564).
- `Mantenimiento.xlsx`: **145/146 IDs** correctos.
- **Pendiente: Inyectora 9** (fila 123), sin ID real. Celda vacía con comentario:
  > “Revisar ID real en el portal (Inyectora 9)”
  
  DBADMIN no tiene ese equipo; validar en `PTM_2022_FINAL`.
- El archivo combinado `...\DOCUMENTOS_DESARROLLO\PLANTA 2\TemplateRutinasPlanta2 27-03-2026.xlsx` quedó como copia de trabajo; los finales reales son los de `RutinasMantenimiento`.

### Pendiente / siguiente

- [ ] Confirmar ID real de **Inyectora 9** y llenar la fila 123 de `Mantenimiento.xlsx`.
- [ ] Copiar los **228 `.cshtml`** de `RUTINAS_SERVER\Rutinas\2` al servidor en `Views/Rutinas/2` (el usuario iba a hacerlo el 12/11/2026). Validar en portal y reciclar App Pool si no se refleja.
- [ ] Validar en portal: Yee 1, Codo 1, ME3, Recibidor 1 (actividad 18), Molino/Pulverizador.
- Sin cambios de BD ni de código por esta revisión; solo archivos `.cshtml` y Excel.

### Repo vs servidor (`Rutina_610`)

- El repo `Views/Rutinas/2` quedó con **57 archivos** de notas corregidas (commit local `d0c50c9`).
- `Rutina_610.cshtml` se **restauró a HEAD** en el repo para conservar la sección `seccion-upload-imagenes` que el archivo del servidor no trae (el servidor tiene una versión más antigua sin esa sección).
- El archivo del servidor `RUTINAS_SERVER\...\Rutina_610.cshtml` sí tiene la corrección de la actividad 18 (sin `....`), pero no la sección de upload.
- Si se vuelve a copiar el `Rutina_610` del servidor al repo, se perdería esa sección; el repo ya tiene la actividad correcta.

### Git

- `origin/david_reyes` en `386fa35`.
- Commits locales pendientes de push: `b761d4f` (documentación), `d0c50c9` (rutinas) y el commit de este contexto.
- **No hacer push sin autorización del usuario.**

---

## 22. Sesión 12/11/2026 — Planta 1: validación de rutinas y corrección de IDs

### Archivos y rutas

- **Excel reales (planta 1)** en `C:\Paradox\PTM\DEVELOPMENT\RutinasMantenimiento`:
  - `TemplateRutinasPlanta1_PVC.xlsx` — hoja `rutinas_PVC` (195 filas de datos).
  - `TemplateRutinasPlanta1_PEAD LISO AND CORR.xlsx` — hoja `rutinas` (185 filas).
  - `TemplateRutinasPlanta1_PEAD LISO AND CORR  RESTANTES.xlsx` — hoja `Hoja1` (20 filas).
- **Rutinas del servidor:** `...\DOCUMENTOS_DESARROLLO\RUTINAS_SERVER\Rutinas\1` (1341 archivos).
- **Export real:** `...\DOCUMENTOS_DESARROLLO\PERIODICIDADES_PTM_2022_FINAL_P1.csv` (1,384 filas, delimitador `;`).
- **Reportes:**
  - `...\RUTINAS_SERVER\MAPEO_REAL_PLANTA1_20261112.csv`
  - `...\RUTINAS_SERVER\VALIDACION_PLANTA1_20261112.csv`
  - `...\RUTINAS_SERVER\VALIDACION_ACTIVIDADES_SUBSET_PLANTA1_20261112.csv`
- **Backups de Excel:**
  - `...\RutinasMantenimiento\TemplateRutinasPlanta1_PVC_BACKUP_20261112.xlsx`
  - `...\TemplateRutinasPlanta1_PEAD LISO AND CORR_BACKUP_20261112.xlsx`
  - `...\TemplateRutinasPlanta1_PEAD LISO AND CORR  RESTANTES_BACKUP_20261112.xlsx`

### Resultado

- **401 filas** revisadas.
- **Notas 1–3:** coinciden en todas las filas con archivo.
- **Actividades:** los archivos son un **subconjunto en orden** del Excel. Las “extra” son encabezados de sección (`Alimentador:`, `Transmisión potencia:`, etc.) y las 3 notas de pie (residuos, químicos, MasterWeb). **0 rutinas con contenido diferente.**
- **IDs:** 360 filas con `IdEquipo` desfasado; se corrigieron **400 filas** con el ID real. `LISTA_PLANTA1` actualizada en **362 filas** (PVC y PEAD).
- Ejemplos:
  - L1 PVC- Recibidor: 7 → **1**, PID **239**.
  - L1 PVC- Extrusor Linea: 8 → **2**, PID **242**.
  - L1 PVC- Tanque de vacío: 9 → **3**, PID **246**.
  - L2 PVC- Recibidor: 15 → **9**, PID **160**.
  - L1 CORR MEZCLADOR A: 201 → **195**, PID **122**.
  - Bomba Chiller 6: 361 → **361** ✅, PID **222**.
- Duplicados resueltos por nombre exacto:
  - `Servicios- Compresor 1` (135) vs `Servicios COMPRESOR 1` (350).
  - `Servicios- Chiller 1` (138) vs `Servicios CHILLER 1` (352).

### Casos especiales / faltantes

- **Silo 2/3/4 LISO:** IDs reales **347/348/349**, PIDs **142/144/440**; **archivos de rutina faltantes** en `Rutinas/1`. Se marcaron con comentario en el Excel.
- **ALUMBRADO PLANTA:** ID **369**, PID **243**; **archivo faltante** y el Excel no trae nota 1. Marcado con comentario.
- **Hidrotester:** sin match en el export del servidor; `IdEquipo` vacío y comentario “Sin match en servidor; revisar equipo”.
- **Silo 1 LISO:** ID **346**, PID **140**; `Rutina_140` existe y coincide.

### Pendiente

- [ ] Generar/cargar las rutinas faltantes de **Silo 2–4** y **ALUMBRADO** (PIDs 142/144/440/243).
- [ ] Confirmar el equipo **Hidrotester** en el servidor.
- [ ] Copiar los Excel corregidos al servidor si aplica (los reales son los de `RutinasMantenimiento`).
- Sin cambios de BD ni de código; solo Excel de planta 1 y reportes. Las rutinas `.cshtml` no se modificaron.

### Git

- `origin/david_reyes` en `386fa35`.
- Se agrega commit local de documentación; **sin push**.

## 23. Sesión 13/11/2026 — Migración PTM_2022_FINAL → DBADMIN (HANA Cloud) y ajustes de Tiempos Muertos

### Objetivo

Dejar `DBADMIN` (HANA Cloud) como copia de `PTM_2022_FINAL` (on-premise) para las tablas del portal y sus stored procedures, y corregir dos temas de Tiempos Muertos (filtro de turno y export de comentarios).

### Migración de tablas

- **Fuente:** `...\ONPREMISE\TABLES\export\PTM_2022_FINAL` (30 tablas) + `...\ONPREMISE\TABLES\index\PTM_2022_FINAL` (4 tablas).
- **Tablas migradas:** 34 (incluye `PdxMTTOEquiposPeriodicidad` con 1,608 filas, `PdxMTTOMovimientosAlmacen` 13, `PdxMTTORechazoDevolucion` 0 y `PdxMTTOTiemposMuertosProduccionPVC_BACKUP` 0).
- **Filas cargadas:** 4,938. **Diferencias de conteo:** 0. **Checksums:** OK.
- Se normalizó el DDL: `CS_*` fuera, `DAYDATE`→`DATE`, `LONGDATE`→`TIMESTAMP`, `GENERATED ALWAYS`→`BY DEFAULT`, `NVARCHAR` sin longitud→`(1)`, schema `DBADMIN`.
- Las tablas SAP (`OITM`, `OITW`, `OCRD`, etc.) y las `@PDX_*` **no se tocaron**.

### Stored procedures

- **125 SPs on-premise** aplicados con `CREATE OR REPLACE`.
- **4 correcciones:**
  - `SpPdxMTTOCalcularMantenimientoAnual`: el `CASE` comparaba una columna INT contra textos (`'mensual'`); se normalizó a los IDs 1–7 de `PdxMTTOPeriodicidadMant`.
  - `SpPdxMTTOGetEmailsEmpleadosXModulo`: usaba `OHEM.U_PDX_MODULO`; se agregó la columna `NVARCHAR(100)`.
  - `SpPdxMTTOConsultaSolicitudesCompraMP` y `SpPdxMTTOGetSolicitudesCompra_filtradas`: se eliminaron por ser código muerto, junto con la tabla legacy `PdxMTTOMPSolicitudCompraMP`.
- **Total en DBADMIN:** 152 SPs (123 on-premise + 29 cloud-only).
- **Índices únicos:** `IDX_UQ_AREA_LINEA`, `UQ_PdxMTTOCategoriasParo_Nombre`, `UK_EQUIPO_PERIODICIDAD`.

### Respaldo y rollback

- Respaldo previo de las 30 tablas cloud: `...\EXPORT DBADMIN 2026-11-13\PORTAL_TABLES_BACKUP`.
- 33 tablas `*_BAK_20261113` conservadas para rollback.
- Limpieza posterior: `...\MIGRATION\_drop_backups.ps1 -Confirm`.

### Artefactos de la migración

Todo en `...\EXPORT DBADMIN 2026-11-13\MIGRATION\`:
- `MIGRATION_LOG.txt`, `SP_LOG.txt`, `SP_FIX_LOG.txt`.
- `PLAN.csv`, `MIGRATION_RESULTS.csv`.
- `01_TABLES.sql`, `02_INDEXES.sql`, `03_PROCEDURES.sql` (123 SPs).
- Scripts reproducibles: `_build_migration.ps1`, `_apply_migration.ps1`, `_apply_sps.ps1`, `_verify_migration.ps1`, `_verify_deep.ps1`, `_drop_backups.ps1`.
- El export completo de DBADMIN quedó incompleto (se atascó en `OIGN`); el respaldo dirigido de las 30 tablas sí está completo.

### Ajustes de frontend (Tiempos Muertos)

- **Export:** `Comentarios` no estaba en los campos de texto del exportador; se agregó en PVC, INY, Corrugado y Pead Liso. Ahora sí se descarga.
- **Filtro de turno:** los “productos terminados” de NWSCALE se mezclaban sin respetar el turno; se agregó un guard en `agregarProductosTerminadosAlGrid`. Turno “Todos” se mapea a `0` para NWSCALE.
- **Filtros unificados:** se eliminó el segundo panel de NWSCALE y se agregó el checkbox `#chkIncluirNWSCALE` en el panel de datos salvados (marcado por defecto). La búsqueda de NWSCALE usa el mismo rango y turno.
- **Fechas:** cambiar Fecha Inicio/Fin ya no dispara la búsqueda; solo valida y actualiza el título. La consulta se ejecuta con **Buscar**.
- **Limpiar:** también desmarca el checkbox.
- **Código muerto:** se eliminaron `GetDetalleSolicitudesCompra` (`AlmacenController`) y las propiedades `GCConsultaSolicitudesCompraMP` / `GCGetSolicitudesCompraFiltradoMP` (`AccesoDatosAlmacen`).
- **Archivos del último ajuste:** 8 JS (`produccion_*_refactor.js` y `produccion_*_tour.config.js`) + 4 vistas (`Views/Produccion/Produccion_*.cshtml`), con `?v=20261113-3`.

### Git

- `origin/david_reyes` actualizado con:
  - `ecff81c` — ajustes de filtros TM.
  - `c10e07d` — versiones de vistas.
  - `d279c6d` — fechas sin auto-búsqueda.
  - `37d99ac` — limpieza de código muerto (C#).
  - `0efd302` — unificación de filtros NWSCALE.
  - `807c473` — Limpiar desmarca checkbox.
  - `4f2ae3a` — checkbox marcado por defecto.

### Pendiente

- [ ] Borrar las tablas `*_BAK_20261113` después de validar (`_drop_backups.ps1 -Confirm`).
- [ ] Copiar los valores de `OHEM.U_PDX_MODULO` desde on-premise si se usa el filtro de correos por módulo.
- [ ] Ajustar el endpoint de NWSCALE para que recorra todo el rango de fechas (hoy solo usa la Fecha Inicio).
- [ ] En on-premise siguen existiendo los 2 SPs y la tabla legacy eliminados en cloud (opcional limpiarlos también).

## 24. Sesión 17/11/2026 — Actualización de OHEM y tablas @PDX_* desde on-premise

### Objetivo

Refrescar en `DBADMIN` las tablas SAP de empleados (`OHEM`) y las tablas de notificaciones/artículos (`@PDX_NOTIFICACIONES`, `@PDX_CAPPROD`) con el DDL y datos actuales de `PTM_2022_FINAL`.

### OHEM

- Recreada desde el DDL on-prem: **145 columnas**, **445 filas** (antes 448 filas / 146 columnas).
- Se eliminó la columna `U_PDX_MODULO` (ya no existe en on-prem).
- Índices recreados: `OHEM_OUSR`, `OHEM_OSLP`, `OHEM_NAME`.
- Validación: `SPPDX_LOGIN` con usuario real → status 200; `SpPdxMTTOBuscarEmpleados` → 88 filas.
- Respaldo previo: `OHEM_BACKUP_20261117\OHEM_DATA_BACKUP.csv` (448 filas).

### @PDX_NOTIFICACIONES

- Recreada desde on-prem: **6 columnas** (incluye `U_PDX_ORDEN_TRABAJO`) y **21 filas** (antes 1 fila / 5 columnas).
- Índice único `KPDX_NOTIFICACIONES_NAME`.
- Validación: `SpPdxMTTOGetUsuariosXPlanta(1, NULL, 334)` → 1 fila (MARIA SAAVEDRA SEGURA).

### @PDX_CAPPROD

- Recreada desde on-prem: **7 columnas** (`U_PDX_CODART` ahora `NVARCHAR(30)`) y **3,218 filas** (antes 2,561).
- Índice único `KPDX_CAPPROD_NAME`.
- Validación: `SpPdxMTTOBuscarArticulos` → 400 filas; `SpPdxGetCapacidadPorArticulo('5P11S10X10')` → 2 filas.

### Limpieza de código muerto

- Se eliminó el SP `SpPdxMTTOGetEmailsEmpleadosXModulo` (usaba `U_PDX_MODULO`).
- Se eliminó la propiedad `GCGetEmailsEmpleadosXModulo` y el bloque comentado en `AlmacenController`.
- Commit `ebd9a7d`.

### Respaldos y rollback

- Respaldos de datos en:
  - `MIGRATION\OHEM_BACKUP_20261117\OHEM_DATA_BACKUP.csv`
  - `MIGRATION\PDX_TABLES_BACKUP_20261117\PDX_NOTIFICACIONES_DATA_BACKUP.csv`
  - `MIGRATION\PDX_TABLES_BACKUP_20261117\PDX_CAPPROD_DATA_BACKUP.csv`
- Instrucciones de rollback en los `ROLLBACK.txt` de cada carpeta.
- Tablas `_BAK_20261117` eliminadas después de validar (0 restantes).

### Pendiente

- [ ] Publicar el DLL actualizado (commit `ebd9a7d`).

## 25. Sesión 17/11/2026 — NWSCALE: soporte de rangos multi-día y optimización

### Problema

El endpoint `GetProductoTerminadoNewScale` solo usaba `FechaInicio` y armaba una ventana de un día. Para rangos multi-día solo traía el primer día.

### Cambios

- `ProduccionController.GetProductoTerminadoNewScale`:
  - Si `FechaFin > FechaInicio` y el rango inicia antes de hoy, usa `@Corte = 4` y manda el rango completo:
    - `TurnoStar = FechaInicio 04:30:01`
    - `TurnoEnd = FechaFin + 1 día 04:30`
    - Scrap: `FechaInicio 05:45:01` → `FechaFin + 1 día 05:45`
  - `turno = NULL` para todos, o 1/2 para turno específico.
  - Se mantiene la lógica de un día para rangos de un solo día o que inician hoy.
- Se creó el SP cloud-only `SpPdxMTTOBuscarArticulosBatch(P_PLANTA)` que devuelve en una sola llamada `Codigo`, `Linea`, `KgsDia`, `PesoMinimo`.
- Se reemplazaron las llamadas a `SpPdxMTTOBuscarArticulos` por fila por un diccionario en memoria (una sola llamada batch).
- Se agregó `GCBuscarArticulosBatch` en `AccesoDatosPlaneacion`.

### Índices SQL Server (`PtmNwScale2`)

- `IX_PT_Fecha_Planta_Linea`
- `IX_PT_Linea_Fecha`
- `IX_PT_Turno_Fecha_Planta_Linea`
- `IX_EnvioScraps_Fecha_Planta_Linea`

Script: `MIGRATION\SQLSERVER_INDEXES_NWSCALE.sql`.

### Resultado medido

| Rango | Turno 0 | Turno 1 | Turno 2 |
|---|---|---|---|
| 1 día | 1.27 s | - | - |
| 5 días | 1.07 s | - | - |
| 15 días | 1.43 s | - | - |
| 31 días | 1.51 s | 1.11 s | 1.04 s |

Antes: 31 días ~14–23 s (y sin índices el SP solo tomaba 16.6 s).

### Notas

- Los índices son en SQL Server (NWSCALE), no en HANA Cloud.
- El SP batch está en `SQL_MIGRACION\PENDIENTES\DBADMIN` (cloud) y `PTM_2022_FINAL` (on-premise). `SpPdxMTTOBuscarArticulos` se conserva para el autocompletado.
- Si el rango inicia hoy, se usa la lógica de un día (el `@Corte = 4` del SP solo aplica a fechas pasadas).
- El `@Corte = 4` devuelve un **resumen por producto/línea para todo el rango**; es el comportamiento esperado del portal NWSCALE.

## 26. Sesión 18/11/2026 — Métricas: cumplimiento de PM exige las 3 firmas

**Estado:** **COMPLETADO** — aplicado en `DBADMIN`, validado en portal (QA) y auditado en rendimiento.

### Solicitud

El KPI **Cumplimiento de Mantenimiento Preventivo** tomaba como cumplido cualquier PM en `ESTATUS = 4` ("Cerrado", que incluye "En proceso de firmas" y se alcanza con solo la firma del técnico). Ahora debe contar **únicamente** los preventivos terminados con las **3 firmas requeridas**.

### Cambio aplicado (solo SQL — 0 cambios en C#/JS)

En los 4 SP `SpPdxMTTOMetricasOEE_PVC / _PeadLiso / _Corrugado / _INY` de `DBADMIN`:

- CTE `CUMPLIMIENTO_PM_FILTRADO`: nueva columna calculada `CUMPLIDO = 1` solo si `ESTATUS = 4` **y** `FIRMA_REALIZO` + `FIRMA_SUPERVISO` + `FIRMA_MANTENIMIENTO` = `'SI'`.
- `LEFT JOIN` a `PdxMTTOOrdenesTrabajoMP` agrupado por `ID_MANTENIMIENTO` con `MAX(...)` → `TIENE_3_FIRMAS` (evita inflar filas). `IFNULL` cubre PM sin OT y firmas `NULL` (139 de 174 PM de nov-2026 no tienen fila en esa tabla).
- Numerador y porcentaje usan `SUM("CUMPLIDO")`. **`TOTAL_PM_PROGRAMADOS` no cambia** por diseño: la regla redefine *qué cuenta como cumplido*, no *cuántos se programaron*.

### Impacto medido (portal, 01–30/11/2026, Planta 1)

| Filtro | Antes | Después | Programados | Cerrados |
|---|---|---|---|---|
| Todos los procesos | 23.44 % | **16.41 %** | 128 | 30 → 21 |
| PVC | 35.06 % | **27.27 %** | 77 | 27 → 21 |
| PEAD LISO | 3.45 % | **0 %** | 29 | 1 → 0 |
| PEAD CORR | 9.09 % | **0 %** | 22 | 2 → 0 |

OEE, Disponibilidad, Rendimiento, Calidad, DT, MTTR y MTBF permanecen idénticos.

### Artefactos

- **Respaldos previos:** `SQL_ORIGINALES/SpPdxMTTOMetricasOEE_{PVC,PeadLiso,Corrugado,INY}_ANTES_3_FIRMAS_20261118.sql` (+ sección nueva en `SQL_ORIGINALES/README.txt`). No se sobrescribieron los `.sql` del 04/11/2026.
- **Script aplicado:** `SQL_MIGRACION/APLICADOS/DBADMIN/METRICAS/20261118_METRICAS_OEE_CUMPLIMIENTO_PM_3_FIRMAS_DBADMIN.sql`.
- **Pendientes on-premise** (`ALTER PROCEDURE`): `SQL_MIGRACION/PENDIENTES/TEST_JUNIO_2026/METRICAS/` y `SQL_MIGRACION/PENDIENTES/PTM_2022_FINAL/METRICAS/`.
- **Bitácoras:** `SQL_MIGRACION/MIGRACIONES_APLICADAS.md` (sección 9) y `RESUMEN_AJUSTES.txt` (sección 26).

### QA (portal, `adminmantenimiento@ptmexico.com`)

**APROBADO.** Valores exactos confirmados en los 4 procesos; 0 errores de consola y 0 respuestas 4xx/5xx en `GetMetricasOEE_*`. Verificación cruzada en Preventivos: de 30 órdenes en estatus 4, las 9 con solo firma del técnico (OTMP-011, 063, 068, 157, 160, 161, 162, 173, 174) quedaron fuera del numerador. La OTMP-162 (realizó + mantenimiento, sin supervisó) también se excluye, lo que confirma que se exigen las 3 y no 2.

### Rendimiento

**Sin cuello de botella crítico.** El `LEFT JOIN` nuevo cuesta **≤ 3 ms (1.2–1.9 %)** del endpoint. El piso de cualquier llamada a HANA Cloud es ~157 ms (RTT), por lo que el 98 % del tiempo es red preexistente. `TodosLosProcesos` = 478 ms ≈ 3 × 160 ms (apilado de round trips, no cómputo). Volumen: `PdxMTTOMPGenerados` ~5.4k filas; existe índice único en `ID_MANTENIMIENTO`. **No se crearon índices.**

### Observaciones abiertas (no bloqueantes, fuera del alcance)

- **RESUELTO (18/11/2026):** `GetMetricasOEE_INY` enviaba un parámetro fantasma `"P_AREA"` (`MetricasController.cs:232`) que el SP no acepta → el endpoint devolvía `ERROR` siempre y rompía el tablero al seleccionar **INY solo** en planta 2. Corregido: ver sección 27.
- `MantenimientosPreventivos/GetMantenimientosPorRango` tarda **6.1–6.9 s** (otro módulo): candidato a optimización.
- Polling del tablero: `setInterval` de 60 s sin pausa en pestaña oculta (`metricas_mannto_refactor.js:54`).
- Filtro de área en INY: `DBADMIN` usa `A."AREA" LIKE 'INYECCI%'` (tolerante al acento). Los scripts on-premise generados preservan esa misma forma; conviene confirmarla contra la definición viva de cada schema antes de aplicar.

## 27. Sesión 18/11/2026 — Fix: `GetMetricasOEE_INY` enviaba un parámetro fantasma

**Estado:** **COMPLETADO** — corregido, compilado, validado en portal y auditado en rendimiento.

### Problema

`MetricasController.GetMetricasOEE_INY` armaba el diccionario de parámetros con **6 entradas**, incluyendo `"P_AREA"`. El SP `SpPdxMTTOMetricasOEE_INY` declara **solo 5** (`P_FECHA_INICIO`, `P_FECHA_FIN`, `P_LINEA`, `P_PLANTA`, `P_CLASIFICACION`), porque el filtro de INY es interno (`A."AREA" LIKE 'INYECCI%'`). Resultado:

```
Status: ERROR | Error: wrong number or types of parameters in call:
                too many arguments: line 1 col 57 (at pos 56)
```

El endpoint fallaba **siempre**; dentro de `TodosLosProcesos` el error se absorbía, pero el tablero se rompía al seleccionar **INY solo** en planta 2. Los otros 3 métodos (`PVC`, `PeadLiso`, `Corrugado`) ya tenían esa línea **comentada**; solo INY la tenía activa.

### Cambio aplicado (solo C# — 0 cambios en BD, JS, vistas)

`MantenimientosPTM/Controllers/MetricasController.cs` → `GetMetricasOEE_INY` (l.231-232): se comentó `P_AREA` y se quitó la coma sobrante, dejando 5 parámetros (mismo patrón que los otros 3 métodos). **Ningún SP fue alterado.**

### Verificación

| Prueba | Resultado |
|---|---|
| Firma real del SP (`SYS.PROCEDURE_PARAMETERS`) | 5 parámetros, sin `P_AREA` |
| Endpoint antes | HTTP 200, `Status: ERROR` (`too many arguments`), 176 ms |
| Endpoint después | HTTP 200, `Status: OK`, **150 ms** (media de 10 muestras) |
| Build Debug | 0 errores |
| Portal: Planta 2 + INY, 01–30/11/2026 | 108 hr, MTTR 0, 0 paradas, DT 100 %, PM **0/5**, OEE 0 % (sin producción) |
| Regla de 3 firmas en INY | Vigente: 1 PM en estatus 4 con firmas incompletas → **0** cerrados |
| Consolidado planta 2 | 293 ms (2 SP), aritméticamente consistente con PVC + INY, sin duplicar |
| Regresión planta 1 | Idéntica al baseline: PM 16.41 % (21/128), OEE 97.83 %, DT 97.72 %, MTTR 5.18 h, MTBF 221.88 h |
| Consola / red | 0 errores JS; 0 respuestas 4xx/5xx; sin reintentos ni duplicados |

**Rendimiento:** el fix no añadió costo material (≈ +13 ms en el consolidado de planta 2, +4.6 %). INY queda en **150 ms**, en línea con los otros endpoints individuales (~149 ms) y con el piso de RTT a HANA Cloud (~146 ms/SP). Sin cuello de botella crítico.

### Observaciones que quedan abiertas (nuevas, no bloqueantes)

- **El combo "Planta" es cosmético en este módulo:** `obtenerFiltros()` y `cargarMetricasPorProceso()` usan `sessionStorage.userData[0].PLANTA`; cambiar el combo no cambia la planta consultada y repuebla Proceso con las áreas de la planta del **usuario**. Solo se ve el tablero completo de planta 2 con un usuario de planta 2. Candidato a ticket aparte.
- `GetMetricasOEE_TodosLosProcesos` ejecuta los SP **en serie**: P1 442 ms (3 SP), P2 293 ms (2 SP). Paralelizarlos bajaría a ~150 ms sin tocar SQL.
- `OEE > 100 %` en varios procesos (Rendimiento > 100 %) y `MTBF = N/A` cuando no hay paradas: presentación, preexistentes.
- Desviación de dato: planta 2 "Todos" = 408 hr (PVC 300 + INY 108), no 432. El consolidado es consistente; el descuadre apunta a `SpPdxMTTOMetricasOEE_PVC`/datos de planta 2, no al fix.

## 28. Sesión 18/11/2026 — Correctivos: habilitar generación de solicitudes para SupervisorMantenimiento

**Estado:** **COMPLETADO** — cambio aplicado, validado en portal (QA) y sin impacto en rendimiento.

### Solicitud

Habilitar la **generación de solicitudes de mantenimientos correctivos** para el perfil `SupervisorMantenimiento`.

### Diagnóstico

El bloqueo era **exclusivo de UI (menú lateral)**. En `Scripts/Global.js:3143` el bloque de rol ocultaba la entrada:

```js
if (tipoUsuario === "SupervisorMantenimiento") {
    $("#GestionEquiposURL").addClass("d-none");
    $("#AlmacenURL").addClass("d-none");
    $("#PlaneacionURL").addClass("d-none");
    $("#ProduccionURL").addClass("d-none");
    $("#MCProgramarURL").addClass("d-none"); //SOLICITUD MTTO CORRECTIVO  ← bloqueo
}
```

Verificado en vivo antes del cambio: `#MCProgramarURL` tenía `d-none` / `display:none`, mientras `#MCProgramadoURL` (OT Pendientes) sí se mostraba. Es decir, el perfil **ya veía** el módulo de Correctivos, pero no la entrada de generación.

**Descartados con evidencia:** `PROGMC()` no tiene `Authorize` ni validación de rol; `InsertarSolicitudMC` / `InsertarMC` no leen `TIPOUSUARIO`; `SpPdxMTTOInsertarSolicitudMC` y `SpPdxMTTOInsertarMC` no filtran por rol ni posición. El módulo ya trataba al rol como admin (`mantenimientos_correctivos_refactor.js:422, 616, 735`). El rol se define en `OHEM."U_Pbx_Nw_TipoUsuario"` vía `SPPDX_LOGIN`.

### Cambio aplicado

`MantenimientosPTM/Scripts/Global.js:3143` — se eliminó la ocultación de `#MCProgramarURL` del bloque de `SupervisorMantenimiento`:

- **Antes:** `$("#MCProgramarURL").addClass("d-none"); //SOLICITUD MTTO CORRECTIVO`
- **Después:** `//SOLICITUD MTTO CORRECTIVO: habilitada para este perfil (genera solicitudes de correctivo)`

**Único archivo tocado. Sin cambios en BD, C#, vistas ni CSS.**

### Verificación

| Prueba | Resultado |
|---|---|
| Build Debug | 0 errores |
| `node --check Scripts/Global.js` | OK |
| Menú visible para el perfil | ✅ "Solicitud Mtto. Correctivo" → `/MantenimientosCorrectivos/PROGMC` |
| Flujo completo de alta | `InsertarSolicitudMC` 200 → `InsertarMC` 200 → `GetMantenimientoCorrectivo` 200 |
| OT generada | `OTMC-045`, estatus **Liberado**, solicitante y equipo correctos |
| Listado OT Pendientes | 1 registro |
| Consola / red | 0 errores en el módulo; 0 respuestas 4xx/5xx |
| Datos de prueba | Limpiados (`PdxMTTOSolicitudMC` 46 y `PdxMTTOMCGenerados` OTMC-045 → 0 filas) |

**Rendimiento:** no aplica auditoría. El cambio no modifica Stored Procedures, consultas SQL ni cargas de datos; es una sola línea de visibilidad en JS.

### Usuario de prueba

`supervisormantpl2@ptmexico.com` / `12345` → `SupervisorMantenimiento`, posición `SUP DE MANTENIMIENTO`, planta 2. Alterno: `p2techerramentales5@ptm.com` / `12345`.

### Observaciones abiertas (no bloqueantes, preexistentes)

- **No hay autorización por rol en servidor** para `PROGMC` / `InsertarSolicitudMC`: cualquier sesión puede invocar los endpoints. Deuda de seguridad preexistente, no se añadió validación para no inventar un patrón que el repo no usa.
- El autocomplete de **Solicitante** devuelve al mismo empleado duplicado (nómina 2388), probablemente por join con posiciones/áreas.
- La cabecera de impresión de `PROGMC` muestra fecha/hora **estáticas y obsoletas** (`26/09/2025 13:39`).
- Tras generar, el botón base cambia de "Generar Solicitud" a "Guardar", lo que puede sugerir un guardado adicional que ya ocurrió.
- El perfil sigue sin acceso a Gestión de Equipos, Almacén, Planeación y Producción (sin cambios).

## 29. Sesión 18/11/2026 — Refacciones: la búsqueda de artículos incluye INSUMOS (102)

**Estado:** **COMPLETADO** — aplicado en `DBADMIN` y validado en el portal (QA APROBADO).

### Solicitud

Al capturar una solicitud de refacción, el buscador de artículos solo filtraba el grupo **104 (REFACCIONES)**. Debe buscar también los artículos que en `OITM` tengan `ItmsGrpCod` de **INSUMOS**.

**Código confirmado en `OITB`:** `INSUMOS = 102`, `REFACCIONES = 104`.

### Diagnóstico

`SpPdxMTTOBuscarArticulos` usaba igualdad exacta:

```sql
AND ( :P_GRUPO_ART IS NULL OR A."ItmsGrpCod" = :P_GRUPO_ART )
```

El valor `104` se pasaba desde `GestionArticulosCustom` (`Scripts/Global.js:3929-3947`) instanciado en 3 sitios: Preventivos (`:84-95`), Correctivos (`:81-92`) y Almacén/SolicitudRefacciones (`:24-35`).

**Consumidores del SP:** un solo caller C# (`PlaneacionController.BuscarArticulo` → `GCBuscarArticulos`). Ese endpoint lo usan `GestionArticulosCustom` (MP/MC/Almacén, grupo 104) y `GestionArticulos` (Planeación y Paros, grupo 110 con `RestringirFabricante=true` y `ValidarCap=1`).

**Datos reales (activos, `validFor='Y'`):** INSUMOS 74 · REFACCIONES 3840 · universo `IN (102,104)` = **3914**.

### Cambio aplicado

**Opción elegida (retrocompatible):** nuevo parámetro al final de la firma, en lugar de cambiar el `SMALLINT` existente.

- **SP** `DBADMIN.SpPdxMTTOBuscarArticulos`: `IN P_GRUPOS_ART NVARCHAR(100) DEFAULT NULL` + filtro `LIKE '%,<grupo>,%'` (mismo patrón que ya usaba `P_FABRICANTES`). Las llamadas de 8 parámetros siguen funcionando por el `DEFAULT NULL`.
- **`Controllers/PlaneacionController.cs`** (`BuscarArticulo`): `int? GrupoArticulos` → `string`, con normalización (`','` `';'` `' '` `'|'`, solo valores `>0`, `Distinct`). Un valor → `P_GRUPO_ART`; varios → `P_GRUPOS_ART`; vacío/0 → ambos `NULL`.
- **JS** (3 archivos): `104` → `'102,104'` en `mantenimientos_preventivos_refactor.js:92`, `mantenimientos_correctivos_refactor.js:89` y `solicitud_refacciones_refactor.js:32`.
- `Global.js`: **sin cambios** (reenvía el valor tal cual).

**Descartadas:** dos llamadas + merge en JS (rompe el `ORDER BY stock DESC … LIMIT 400` y mueve la regla al cliente); grupo 100/"todos" (mete empaque, materias primas y producto terminado); cambiar `P_GRUPO_ART` a CSV (rompe la firma `SMALLINT` de los consumidores on-premise).

### Artefactos

- **Respaldo previo:** `SQL_ORIGINALES/SpPdxMTTOBuscarArticulos_ANTES_INSUMOS_20261118.sql` (+ sección en `SQL_ORIGINALES/README.txt`).
- **Aplicado en `DBADMIN`:** `SQL_MIGRACION/APLICADOS/DBADMIN/PLANEACION/SpPdxMTTOBuscarArticulos_INSUMOS_20261118.sql`.
- **Pendientes on-premise** (`ALTER PROCEDURE`): `SQL_MIGRACION/PENDIENTES/TEST_JUNIO_2026/PLANEACION/` y `.../PTM_2022_FINAL/PLANEACION/`. El encabezado advierte comparar contra `SYS.PROCEDURES` del schema destino y portar solo el bloque del filtro si la versión difiere.
- **Bitácoras:** `SQL_MIGRACION/MIGRACIONES_APLICADAS.md`, `SQL_MIGRACION/PENDIENTES/README.md`.

### Verificación

| Prueba | Resultado |
|---|---|
| Build Debug | 0 errores (warning preexistente `CS0168` en `EmailService.cs`) |
| `node --check` (4 JS) | OK |
| Retrocompatibilidad | 8 parámetros, `P_GRUPO_ART=110` → solo 110 ✔ |
| Endpoint `104` | 76 resultados, todos 104 |
| Endpoint `110` | 1 resultado, solo 110 |
| Endpoint `102,104` | solo grupos 102 y 104 (nunca 110, 103, 101) |
| Portal Preventivos | `COPLE PT CORR` → 5 INSUMOS `2INSUMO00*`; `RODAMIENTO 6302` → `42000002638` (104) |
| Portal Correctivos | idéntico |
| Portal Almacén | insumo seleccionable en el detalle |
| Consola / red | 0 errores nuevos; `BuscarArticulo` 200 en ~150–250 ms |

**Limpieza:** no se guardó ninguna solicitud; no hubo datos de prueba que borrar.

### Corrección posterior — `ORDER BY` por relevancia (misma fecha)

QA y la auditoría de rendimiento detectaron que con `LIMIT 400` + `ORDER BY stock DESC` los INSUMOS quedaban **fuera** en búsquedas genéricas (todos tienen `StockTotal = 0`, las refacciones tienen 12–1446). Medido antes del fix: `12` → 0 de 2 insumos; `A` → 0 de 67.

**Cambio aplicado en `DBADMIN.SpPdxMTTOBuscarArticulos`** (solo el `ORDER BY`; filtros, parámetros y `LIMIT 400` intactos):

1. Coincidencia **exacta** de `ItemCode` o `ItemName`
2. Coincidencia por **prefijo**
3. `RANK() OVER (PARTITION BY ItmsGrpCod ORDER BY stock DESC, ItemName, ItemCode)` — **intercalado por grupo**
4. Stock disponible DESC
5. `ItemName`, `ItemCode`

> El punto 3 es imprescindible: la variante sin `RANK()` (exacto → prefijo → stock) **no** rescataba los insumos (`12` seguía en 0/2, `A` en 5/67). El intercalado reparte los 400 lugares entre 102 y 104 sin quitarle lugares a nadie.

**Resultado verificado:** `12` → **2 de 2** insumos (posiciones 2 y 4); `A` → **67 de 67**; `BOL` y `COP` sin cambio. Retrocompatibilidad intacta: `GrupoArticulos=104` → solo 104; `=110` → solo 110 (Planeación/Paros conservan su conjunto de resultados, `RANK()` es no-op con un solo grupo).

**Verificado en portal** (Preventivos y Correctivos): `12` → `2INSUMO0064` TAPA 12" RD-11 en posición 2 y `2INSUMO0069` TAPA 12" RD-7 en posición 4; `AD` → `2INSUMO0005` ADITIVO 8188-4 en posición 1, con 12 insumos intercalados. 398 de 400 resultados siguen siendo refacciones; 0 grupos ajenos. Endpoint 200 en 323–415 ms.

**Artefactos:** respaldo `SQL_ORIGINALES/SpPdxMTTOBuscarArticulos_ANTES_ORDERBY_20261118.sql`; aplicado `SQL_MIGRACION/APLICADOS/DBADMIN/PLANEACION/SpPdxMTTOBuscarArticulos_ORDERBY_RELEVANCIA_20261118.sql`; los 2 pendientes on-premise se regeneraron como **un solo pase** con ambos cambios (`..._INSUMOS_Y_ORDERBY_20261118_ALTER.sql`) y se eliminaron los `..._INSUMOS_..._ALTER.sql` anteriores.

**Nota:** el portal exige **mínimo 2 caracteres** (`mantenimientos_preventivos_refactor.js:138`, `mantenimientos_correctivos_refactor.js:181`), así que `A` no es reproducible desde la UI; se validó con `AD`.

### Observaciones abiertas (no bloqueantes)

- ~~`LIMIT 400` + `ORDER BY stock DESC` ocultaba los INSUMOS~~ → **RESUELTO** con el `ORDER BY` por relevancia (ver arriba).
- Los 5 INSUMOS de `COPLE PT CORR` tienen **stock 0** y aun así se pueden agregar a la solicitud (cantidad 1 por defecto). Es razonable para una *solicitud*; confirmar si negocio exige bloquearlos.
- En `/Almacen/SolicitudRefacciones` el modal se titula **"Cambiar Refacción"** y **no tiene disparador visible** en pantalla; el endpoint y los resultados son correctos, pero ese flujo parece huérfano de UI.
- Warning preexistente en Almacén: `Elementos de autocomplete no encontrados` (`solicitud_refacciones_refactor.js:3507`) al cargar.
- Con rol **SupervisorMantenimiento** el botón "Solicitar Refacción" aparece **deshabilitado** en todas las OT; con AdminMtto se habilita. Comportamiento por permisos, ajeno a estos cambios.
- Si `GrupoArticulos` llega con tokens **no numéricos** (ej. `abc`), el controller cae a "sin filtro de grupo" y devuelve grupos no deseados, sin log ni error. Preexistente.
- El autocomplete no aborta el XHR en vuelo (`Global.js:3929-3947`): con latencias variables una respuesta vieja puede pintarse después de una nueva. El debounce de 300 ms sí funciona.

## 30. Sesión 18/11/2026 — Almacén/Correctivos: 3 ajustes de UI y permisos

**Estado:** **COMPLETADO** — aplicado y validado en portal (QA APROBADO).

### A. Cache-busting real en `SolicitudRefacciones`

`Views/Almacen/SolicitudRefacciones.cshtml:1166` cargaba el JS con `?v1.0.7` **hardcodeado**, así que al desplegar el navegador servía la versión vieja desde caché. Ahora usa el mismo patrón que Correctivos/Preventivos:

```cshtml
?solicitud_refacciones_refactor.js?v=@System.IO.File.GetLastWriteTime(HttpContext.Current.Server.MapPath("~/Scripts/solicitud_refacciones_refactor.js")).Ticks
```

Render verificado: `?v=639306178875326195`. `FileUpload.js` se dejó sin versión, igual que en las otras vistas.

### B. `SupervisorMantenimiento` puede solicitar refacciones

El botón `.btn-solicitar-refaccion` se deshabilitaba por rol en `Scripts/mantenimientos_preventivos_refactor.js:1823`:

- **Antes:** `if (estatusOrden == 4 || esSupMantenimiento || esSupProduccion || ordenFinalizada === "SI")`
- **Después:** `if (estatusOrden == 4 || esSupProduccion || ordenFinalizada === "SI")`

Se eliminó también la declaración ya sin uso `esSupMantenimiento` (l.1756).

**`mantenimientos_correctivos_refactor.js:1216` no requirió cambios:** su condición ya era `estatusOrden == 4 || ordenFinalizada === "SI" || esSupProduccion`, sin restringir a `SupervisorMantenimiento`.

**Sin validación de rol en servidor:** `InsertarSolicitudRefaccion` (ambos controllers) solo deserializa, inserta y actualiza estatus. `SupervisorProduccion` sigue bloqueado y las OT en estatus 4 / finalizadas siguen deshabilitadas.

### C. Warning de autocomplete eliminado

Causa raíz: `configurarAutoCompletados()` llamaba `UIManager.createAutoComplete($("#nombre"), $("#acNombre"), …)`, pero **`#nombre` no existe** en `SolicitudRefacciones` (solo `#acNombre`). Se condicionó la llamada (`solicitud_refacciones_refactor.js:1123-1132`). El guard de `createAutoComplete` se conserva.

### Verificación

| Prueba | Resultado |
|---|---|
| Build Debug | 0 errores, 0 warnings |
| `node --check` (2 JS) | OK |
| `?v=` del script | **numérico** `639306178875326195` (sin rastro de `1.0.7`) |
| Consola en Almacén | **0 warnings** de autocomplete |
| Preventivos (01–30/11) | **42 de 43** botones habilitados; solo `OTMP-172` ("En proceso de firmas") deshabilitada |
| Correctivos | `OTMC-019` y `OTMC-020` habilitadas; `OTMC-041` (en firmas) deshabilitada |
| Flujo completo | `OTMP-112` + `2INSUMO0063` → `POST InsertarSolicitudRefaccion` 200 `Status: SI` |

**Limpieza verificada:** `PdxMTTOMPSolicitudRefacciones` ID 32 eliminada (0 filas para `OTMP-112`) y `PdxMTTOMPGenerados.ESTATUS` de `OTMP-112` devuelto a **2 (Liberado)**.

> Nota: en la prueba se tocó temporalmente `PdxMTTOMPGenerados.USUARIO_ACTUALIZA` de `OTMP-112`; se dejó en vacío (patrón de sus vecinas).

### Observaciones abiertas (preexistentes, no bloqueantes)

- El banner "Se detectaron cambios en los datos… ¿Deseas recargar?" se renderiza **sin botones de acción**: pregunta algo que el usuario no puede responder (los botones existen en el DOM pero no se muestran).
- Inconsistencia de urgencia para la misma solicitud: el historial de la OT muestra **"Critico"** y Almacén muestra **"Urgente"**.
- El botón deshabilitado pierde `data-numeroorden` y demás `data-*` (conviven dos plantillas de render del botón).
- `data-tienesolicitudpendiente="NO"` con `data-idsolicitudpendiente="57"` en `OTMP-112`: valor stale.
- `OTMP-155` ("En espera de refacción") conserva el botón habilitado — confirmar si es intencional.
- El **modal "Cambiar Refacción"** (`#solicitarRefAlmModal`) **no está huérfano**: su disparador es `.btn-change-ref`, un botón **por fila** de la tabla (`solicitud_refacciones_refactor.js:1738-1749`) que solo existe cuando hay solicitudes cargadas y se deshabilita si la refacción ya se surtió parcialmente.
- El `console.error` de SignalR (`ws://…/signalr/connect` → 500) es preexistente; cae a longPolling y no afecta.

## 31. Sesión 19/11/2026 — 7 correcciones de OT/bitácoras, SP de acentos y cierre de PENDIENTES

**Estado:** **COMPLETADO** en código; **desplegado en TEST** (faltan 4 verificaciones en vivo).

### A. Ciclo completo probado en TEST_JUNIO_2026 (18/11)

| Fase | Resultado |
|---|---|
| **Preventivo** | **OTMP-089** cerrada con las **3 firmas** · Métricas **0 % → 50 %** (el denominador son MP **liberadas**) |
| **Correctivo** | **OTMC-011** cerrada con 2 firmas; paro `COR-17` |
| **Tiempos muertos** | Guardar 2× **no duplica** · OT unificadas en la fila manual |

### B. 7 correcciones aplicadas (probadas en local, `DBADMIN`)

| # | Fix | Archivos |
|---|---|---|
| **1** | **Borrador ya no oculta los botones.** Nueva política `_aplicarVisibilidadBotones` basada solo en **estatus + rol** (nunca en la firma), re-aplicada al abrir y después de guardar. Se **revirtió** el candado que bloqueaba guardar borrador con firma | `mantenimientos_preventivos_refactor.js`, `MantenimientosPreventivosController.cs` |
| **6** | **"Asignar Técnicos" solo en guardado definitivo**, con aviso visible + `is-invalid`; el borrador no valida | `mantenimientos_correctivos_refactor.js`, `Global.js` |
| **9** | **Búsqueda sin acentos** (SP + respaldo en C# `BusquedaEmpleadosAcentos`) | SP, 2 controllers, `Global.js` |
| **10** | **Asterisco en Scrap Real** | `MantenimientoCorrectivo.cshtml` |
| **14** | **Layout TM**: anchos compactos < 1440 px (área central 15 px → ~300 px) | `Global.js`, 4 JS de Producción |
| **6b** | **Toggle "Máquina detenida" persiste**: el JS solo marcaba el switch si `estatus != 4` y enviaba `null` al guardar. Ahora se pinta siempre y se reenvía el valor real. `TIEMPO ESPERA/REPARACIÓN/MUERTO` muestran `N/A` en vez de `null HRS` | `mantenimientos_correctivos_refactor.js` |
| **13** | **Aviso SignalR ya no cierra modales**: encola el aviso si hay captura o cambios sin guardar y **filtra por rol** | 4 JS de Producción |

**Verificación:** 7/7 en portal local · build 0 errores · `node --check` OK.

### C. SP de empleados sin acentos — aplicado en los 3 esquemas

`SpPdxMTTOBuscarEmpleados` normaliza acentos **en ambos lados** del `LIKE`.
Antes: `VICTOR` → 0 filas. Ahora: `VICTOR`, `victor` y `AGUILERA` → empleado encontrado.

- DBADMIN: `APLICADOS/DBADMIN/SpPdxMTTOBuscarEmpleados_ACENTOS_20261118.sql`
- On-premise: `APLICADOS/<schema>/EMPLEADOS/..._ALTER.sql`
- Respaldo: `SQL_ORIGINALES/SpPdxMTTOBuscarEmpleados_ANTES_ACENTOS_20261118.sql`

### D. `PENDIENTES/` cerrado

- Se agregó a **TEST_JUNIO_2026** el SP que faltaba: `SpPdxMTTOBuscarArticulosBatch` (NWSCALE).
- **`PENDIENTES/` ya no tiene scripts SQL.** Los 3 esquemas tienen el mismo conjunto.
- Único faltante en los 3: `SpPdxMTTOAceptarReprogramacion` → **código muerto** (el flujo se retiró de la UI).
- Verificador nuevo: `SQL_MIGRACION/VERIFICACION/CHECK_SP_FALTANTES.sql` (una sentencia por schema, sin tablas temporales).

### E. Hallazgos DESCARTADOS (no eran bugs)

| Hallazgo inicial | Realidad |
|---|---|
| "El paro COR no se integra a la bitácora" | Los **correctivos llegan por la ruta de la OT**; `FiltroIncluirCorrectivo=null` es **intencional** para evitar doble conteo |
| "Backfill de MAQUINA_DETENIDA" | **Premisa inválida**: `PdxMTTOTParoProduccion` no tiene vínculo con las OT y sus paros `COR` se registran **a mano**. Script eliminado |
| "Filas manual vs NWSCALE" | El paro se captura en la fila del producto/turno; el total de línea es la suma (decisión A) |
| "Métricas no cuenta el correctivo" | Depende de **guardar la bitácora** de tiempos muertos |
| Hora sobrescrita por el servidor | Así lo pidieron |

### F. Contexto para agentes (mejora de proceso)

- `AGENTS.md` → nueva sección **"Flujos esperados por módulo"** (reglas de negocio que distinguen bug de diseño).
- `qa-explorador` ya **no** tiene la regla "cero exploración": ahora abre primero y consulta mapa + flujos. Se agregó la **"regla de oro"**: no declarar un bug sin una regla de negocio que lo sustente; si no está documentada → *"requiere confirmación"*.
- `dev-ajustes` y `analista-flujo` apuntan a ambas secciones.

### G. Despliegue y pendientes

- **DLL publicada en `:8081`** por el usuario. Confirmado: cache-busting nuevo y **2 de 6** verificaciones aprobadas (asterisco Scrap Real, toggle Máquina detenida con `0.00 HRS`).
- **Verificaciones en vivo: 6/6 COMPLETADAS.** El usuario confirmó (19/11/2026) que las 4 restantes —búsqueda sin acentos en portal, borrador sin ocultar botones, layout a 1034 px y aviso SignalR— **ya quedaron validadas**. No son pendientes.
- **Pendiente único de despliegue:** ✅ **COMPLETADO el 19/11/2026.** El usuario publicó los archivos en `:8081` y `:8083`. Verificado en `:8081`: `mantenimientos_preventivos_refactor.js` servido con **308,183 bytes** (idéntico al local), `?v=639307065844169879` y contiene el fix `$('#alertOrdenContainer').empty()`.
- **⚠️ Cadena de conexión:** el `Web.config` del repo apunta a **`DBADMIN`** (sin commitear). El `:8081` debe usar **`TEST_JUNIO_2026`** y el `:8083` **`PTM_2022_FINAL`**. **No publicar el `Web.config` del repo tal cual en producción.**
- `:8083` (producción) **no se tocó** en toda la sesión.
- Conexión a HANA Cloud **intermitente** (`Cannot create SSL engine`): falla el almacén de credenciales del cliente SAP; requiere regenerar el PSE.

### H. Ajustes de UX detectados en la validación del 19/11 — ✅ TODOS RESUELTOS

> Los 3 se implementaron, validaron en portal y commitearon en **`5359bea`**. Detalle en la **sección 32**.

1. ~~**`#Comentarios` es `required` nativo en Preventivos.**~~ → **RESUELTO.** Ahora es validación del portal al finalizar (mensaje visible + `is-invalid` + foco).
2. ~~**La etiqueta del botón no se restaura tras una validación fallida.**~~ → **RESUELTO.** Helper `_restaurarBotonGuardarOT()`; el botón siempre vuelve a "Finalizar".
3. ~~**El aviso "Debe asignar al menos un técnico" se autodestruye a los 4 s.**~~ → **RESUELTO.** `AlertManager.mostrar` acepta `duracionMs` opcional; ese aviso es ahora persistente.

**Dato a limpiar en TEST:** ✅ **RESUELTO el 19/11/2026.** `OTMP-009` quedó en **estatus 4** con `Tiempo Invertido = 981.55 HRS` tras la prueba de la botonera. Se revirtió:
- `PdxMTTOOrdenesTrabajoMP` → **0** filas (DELETE).
- `PdxMTTOMPGenerados` → **ESTATUS = 2**, `HORA_CIERRE = NULL`.
- `PdxMTTORutinasMP` (ID_RUTINA **33**, comentario `QA 2026-11-19`) → **eliminada**.
- `PdxMTTOActividadesRutinasMP` (16 filas de esa rutina) → **eliminadas**.
- Verificado por el usuario: **0 y 0**.

> No se hicieron tablas de respaldo (era dato de prueba). `ID_MANTENIMIENTO = 48` **no se tocó**: es el MP de OTMP-009 y ya existía.

### I. Almacén — columnas de costo ocultas en "Artículos a Devolver"

En el modal **Artículos a Devolver** de `Almacen/SolicitudRefacciones` se quitaron de la UI (a petición del usuario):

- El resumen **"Artículos seleccionados"** y **"Valor a devolver"**.
- Las columnas **"Costo Prom."** y **"Valor"** (incluido su icono de tooltip).
- El JS asociado: render de las dos celdas, `_formatearCosto`, `_formatearMoneda`, `_inicializarTooltipsValor` y el recálculo por `input` → **−86 líneas** de código muerto.

**Se conserva intacta la lógica de negocio:** el costo promedio se sigue leyendo y enviando a SAP en `DocumentLines[].Price` al generar la devolución. Solo se ocultó en pantalla.

- Tabla resultante: **14 columnas** (`colspan` de la fila vacía coherente).
- **Se conserva** el badge de conteo `📦 Artículos a Devolver (N)` — decisión del usuario.
- Archivos: `Views/Almacen/SolicitudRefacciones.cshtml`, `Scripts/solicitud_refacciones_refactor.js`.
- Validado: `node --check` OK y build 0 errores.
- Commit `40dc7f6`.

## 32. Sesión 19/11/2026 — Preventivos: 3 ajustes de UX (comentarios y botonera)

**Estado:** ✅ **COMPLETADO Y DESPLEGADO** — implementado, validado en código (MSBuild + `node --check`), **QA en portal APROBADO (3/3)** y **publicado** en `:8081` y `:8083` (verificado en `:8081` el 19/11/2026).

### Solicitud

Cerrar los 3 ajustes de UX pendientes que quedaron abiertos en la sección 31.H.

### Cambios aplicados

**`MantenimientosPTM/Scripts/mantenimientos_preventivos_refactor.js`**

1. **Comentarios de la rutina sin `required` nativo** (vista técnico y vista readonly). La obligatoriedad se valida **en el portal** y **solo al finalizar**, dentro de `guardarRutina` (después de los dos early-return `esRutinaDefault && tienePdf` y `EstatusOrden == "Cerrado"`, junto a la validación de `sinResponder`):
   - mensaje `Captura los comentarios de la rutina antes de finalizar la orden de trabajo`;
   - `is-invalid` + `scrollIntoView` + `focus` sobre `#ComentariosRutina`;
   - el `is-invalid` se limpia al escribir (`input`/`keyup`);
   - `guardarRutinaParaBorrador` **intacto** → el borrador sigue sin exigir comentarios.
2. **Helper `_restaurarBotonGuardarOT()`**: captura el HTML original del botón una sola vez en el constructor (fallback `<i class="bi bi-floppy-fill me-1"></i> Finalizar`) y lo restaura en las **10** salidas tempranas. Ninguna validación fallida deja ya el botón como "Guardar".
3. **`#btnGuardarBorrador` alineado** a su icono original (`bi-cloud-upload`); una restauración usaba `bi-pencil-square`.

**`MantenimientosPTM/Scripts/Global.js`**

4. **`AlertManager.mostrar` acepta un 4º parámetro opcional `duracionMs`** (default `4000`, retrocompatible con los ~40 llamadores). Con `null`/`0`/negativo la alerta **no se autocierra**. El aviso *"Debe asignar al menos un técnico a la orden de trabajo"* pasa `null` → queda hasta que el usuario la cierre. Blindaje: el `setTimeout` verifica que la alerta siga en el DOM.

**`AGENTS.md`** — 2 reglas nuevas en "Flujos esperados → Mantenimientos Preventivos".

Sin cambios en BD, SPs, vistas ni `Web.config`.### Corrección de diagnóstico

El `<form id="formOrdenMantenimiento">` tiene **`novalidate`**, así que **el globo nativo del navegador nunca aparecía**. Lo que el usuario veía era: `required` → `ValidationManager.validarFormulario` falla → mensaje genérico *"Por favor, complete correctamente todos los campos"* → `return false` sin petición. El síntoma reportado era real, solo que enmascarado.

### QA en portal (DBADMIN, técnico `p1tecmantto1@ptm.com`, OTMP-100 estatus 2)

| Caso | Resultado |
|---|---|
| **A** — comentarios vacíos al finalizar (20 actividades marcadas + firma) | Alerta correcta, `is-invalid`, foco en el textarea, botón "Finalizar", **0 POST** a `GuardarRutina`/`InsertarOrdenTrabajoMP` |
| **B** — Hora Fin vacía | "Por favor, complete correctamente todos los campos" y el botón **sigue** en "Finalizar" |
| **C** — sin técnicos | El aviso **persistió más de 12 s**; una alerta de contraste sí se cerró a los ~4 s |

**Limpieza:** no se guardó nada (los 3 casos fallan antes de cualquier POST). Solo hubo 2 POST de `GetMantenimientosPorRango` (consulta del grid).

**Código 0 POST verificado** en Network; 0 errores de consola propios (solo el WebSocket de SignalR preexistente).

### QA en el servidor de pruebas (`:8081`, TEST_JUNIO_2026)

Validado por `@qa-explorador` tras el despliegue, con el técnico `p1tecmantto1@ptm.com` sobre **OTMP-007** (Liberado, 13 actividades).

| Caso | Resultado |
|---|---|
| **A** — comentarios vacíos | **APROBADO.** Alerta exacta, `is-invalid` + borde `rgb(220,53,69)`, foco, botón "Finalizar", **0 POST**, sin mensaje genérico |
| **B** — etiqueta del botón | **APROBADO** con Hora Fin vacía **y** con firma borrada |
| **C** — aviso de técnicos | **APROBADO.** Visible a **24.3 s**; la alerta de contraste se cerró a **5.0 s** |

0 errores de consola, todas las respuestas 200. Sin escrituras en BD (verificado reabriendo la OT).

### Fix posterior — la alerta persistente se "fugaba" a otra OT

**Problema detectado por el QA:** al abrir otra OT, la alerta *"Debe asignar al menos un técnico…"* seguía visible (consecuencia de hacerla persistente: antes se autodestruía a los 4 s y nadie lo notaba).

**Corrección:** en `abrirModalCaratulaOnline`, bloque **RESET** (junto a `formOrdenMantenimiento.reset()` y `ValidationManager.limpiarValidacion`), se agregó `$('#alertOrdenContainer').empty();`.

- Se limpia **al abrir**, nunca al cerrar → el usuario alcanza a leer el aviso de la OT que está trabajando.
- Verificado en local: tras Finalizar sin técnicos hay 1 alerta; tras Cancelar sigue; **al abrir OTMP-002 el contenedor queda en 0**.

### Nota de entorno

El arranque local del módulo requiere IIS Express con el `applicationhost.config` de `.vs\MantenimientosPTM\config` (sitio `MantenimientosPTM`, puerto **52538**). El `Web.config` se mantiene en `DBADMIN` y **no se commitea** (se cambia a mano al publicar, por decisión del usuario).

### Archivos a publicar — ✅ PUBLICADOS (19/11/2026)

Todo lo demás está validado. Los archivos se copiaron al servidor; los del repo son del **HEAD** (`1ed89d8`). Se conserva la lista como referencia de qué se publicó.

**Requieren compilar/publicar DLL** (cambios C# de `1893c14`):
- `bin\MantenimientosPTM.dll`

**Copiar tal cual (no requieren build):**

| Archivo | Último commit |
|---|---|
| `MantenimientosPTM\Scripts\Global.js` | `5359bea` (2026-11-19) |
| `MantenimientosPTM\Scripts\mantenimientos_preventivos_refactor.js` | `5359bea` (2026-11-19) |
| `MantenimientosPTM\Scripts\solicitud_refacciones_refactor.js` | `40dc7f6` (2026-11-19) |
| `MantenimientosPTM\Views\Almacen\SolicitudRefacciones.cshtml` | `40dc7f6` (2026-11-19) |
| `MantenimientosPTM\Scripts\mantenimientos_correctivos_refactor.js` | `1893c14` (2026-11-18) |
| `MantenimientosPTM\Scripts\produccion_pvc_refactor.js` | `1893c14` (2026-11-18) |
| `MantenimientosPTM\Scripts\produccion_peadliso_refactor.js` | `1893c14` (2026-11-18) |
| `MantenimientosPTM\Scripts\produccion_iny_refactor.js` | `1893c14` (2026-11-18) |
| `MantenimientosPTM\Scripts\produccion_corrugado_refactor.js` | `1893c14` (2026-11-18) |
| `MantenimientosPTM\Views\MantenimientosCorrectivos\MantenimientoCorrectivo.cshtml` | `1893c14` (2026-11-18) |

**⚠️ NO publicar:**
- `Web.config` del repo → apunta a `DBADMIN`. En el servidor debe quedar `TEST_JUNIO_2026` (`:8081`) y `PTM_2022_FINAL` (`:8083`).
- `AGENTS.md`, `CONTEXTO_SESION.md`, `RESUMEN_AJUSTES.txt` → documentación, no se sirven.

Después de copiar los `.js`, basta con **Ctrl+F5**: el cache-busting usa los ticks de `GetLastWriteTime`, así que el navegador pedirá la versión nueva automáticamente.

---

## 33. Sesión 20/11/2026 — Hallazgos abiertos (sin cambios aplicados)

### A. Correctivos — "Jesús Alamilla no aparece en Solicitante"

**Estado:** diagnóstico, pendiente confirmar con datos.

El autocomplete `#Solicitante` (`Global.js:723` → `GET /MantenimientosCorrectivos/BuscarEmpleados`) usa el SP **`SpPdxMTTOBuscarEmpleados`**, que **no** lista a todos los empleados. Filtra por:

```sql
E."Active" = 'Y'
AND E."U_Pdx_Nw_Planta" = :P_PLANTA
AND (:P_USUARIOWEB IS NULL OR E."U_Pbx_Nw_Usuario" = :P_USUARIOWEB)
```

El JS (`Global.js:770-778`) envía `planta` y **`usuarioWeb`**; en cambio `posicionId` y `tipoUsuario` fueron deshabilitados a propósito. El único filtro "raro" que sobrevive es `usuarioWeb`.

**Sospechoso principal:** `OHEM.U_Pbx_Nw_Usuario` inconsistente. En la captura de SAP el empleado **109 — JESUS ALAMILLA GUERRE** tiene **Usuario = `Si`**, mientras que el portal recibe `USUARIOWEB = "s"` (verificado en logins de DBADMIN: admin y técnico). Una diferencia `Si` vs `s` lo excluye por igualdad exacta y deja pasar al resto.

**Consultas de confirmación (pendientes):**

```sql
SELECT "Code","firstName","lastName","U_Pdx_Nw_Planta","U_Pbx_Nw_Usuario","Active"
FROM "PTM_2022_FINAL"."OHEM" WHERE "Code" = 109;

SELECT "U_Pbx_Nw_Usuario", COUNT(*) FROM "PTM_2022_FINAL"."OHEM"
WHERE "Active"='Y' AND "U_Pdx_Nw_Planta"=1 GROUP BY "U_Pbx_Nw_Usuario";
```

Y en el navegador: `JSON.parse(sessionStorage.getItem('userData'))[0].USUARIOWEB`.

**Datos del empleado:** código 109, posición `COOR DE PRO P`, depto `PRODUCCION P1`, sucursal `CORP`, correo `alamillag@ptmexico.com`, `SupervisorProduccion`, planta 1.

### B. Producción / Tiempos Muertos — NWSCALE sobreescribe lo guardado

**Estado:** causa raíz identificada; **pendiente decisión de negocio**.

**Síntoma reportado (Esthela Martínez):** al actualizar datos desde el 01/11 en el módulo de TM, al guardar no respeta **TR Fabricados, Producción Neta Real, Scrap y Horas Programadas**.

**Causa raíz confirmada** (`consultarDatos()` en los 4 procesos):

1. `GET /Produccion/GetTiemposMuertos*` → se pintan las filas de **BD** (`setRowData`).
2. **Inmediatamente después** se llama `agregarProductosTerminadosAlGrid(...)` (NWSCALE).
3. En la fusión, si la fila ya existe, **sobrescribe**:

```js
dataActualizada.TRFabricados       = parseFloat(item.NumTubos) || 0;
dataActualizada.ProduccionNetaReal = parseFloat(item.PesoTotal) || 0;
dataActualizada.TotalScrapKg       = parseFloat(item.ScrapTotal) || 0;
```

Ubicaciones: PVC `1360`, PEAD Liso `2157`, INY `1443`, Corrugado `1681`.

Como el guardado termina con `await this.consultarDatos()` (PVC `2889`), la tabla se repinta con los valores de NWSCALE **justo después de guardar** → el usuario percibe que "no guardó".

**Dato de BD (`DBADMIN`, 2026-11-01):** las filas son `ORIGEN = NWSCALE` con `HORAS_PROGRAMADAS = 12.00`. `HORAS_PROGRAMADAS` **no** la pisa esta fusión → si tampoco se respeta, hay que revisar si la fila no empata por clave y se recrea.

**Decisión pendiente (3 opciones):**

1. Lo guardado manda; NWSCALE solo rellena filas nuevas/vacías. *(1 línea × 4 archivos, sin BD)*
2. Igual, pero NWSCALE rellena solo si el valor está en 0/vacío.
3. Columna `EDITADO_MANUAL`: NWSCALE refresca lo automático y nunca pisa lo tocado por una persona. *(requiere migración en los 3 esquemas + SPs)*

**Pregunta abierta para negocio:** ¿las 4 columnas deben ser editables, o NWSCALE es la única fuente y deberían ser de solo lectura?

### C. NWSCALE — cómo entrega los datos ✅ RESUELTO

**Estado:** investigado a fondo (definición real del SP + datos). Conclusión: **NWSCALE es la fuente oficial para producto terminado**.

#### C.1 Tabla base: una fila por pesaje

`PtmNwScale2.dbo.ProductoTerminados` guarda **una fila por cada pesaje**:

```
Id | Id_Linea | Codigo | FechaPesaje | NumTubos | PesoTotal | TurnoPT | Planta | Desactivado
```

Evidencia real (planta 1) — sí hay muchos pesajes por producto/línea en un mismo día:

| Fecha | Línea | Código | Turno | Pesajes | TR | Kg |
|---|---|---|---|---|---|---|
| 2026-09-14 | 14 | 1MT50800 | 1 | **35** | 35 | 10,841 |
| 2026-10-01 | 14 | 1MT50800 | 2 | **34** | 34 | 10,660 |
| 2026-09-25 | 11 | 1MT50500 | 2 | **32** | 126 | 16,126 |

#### C.2 El SP SÍ fusiona: una fila por Línea + Código

`Sppdx_FiltradoProductosTerminados` (SQL Server, `PtmNwScale2`):

1. Filtra `FechaPesaje BETWEEN @FechaTurnoInicio AND @FechaTurnoFin`, `Planta`, `TurnoPT` (o ambos si `@turno` es NULL) y `Desactivado = 0 OR NULL`.
2. Calcula **agregados sobre todos los pesajes de la ventana**:
   - `SUM(NumTubos)` → **TR Fabricados**
   - `SUM(PesoTotal)` → **Producción Neta**
   - `SUM(PesoTotal)/SUM(NumTubos)` → peso unitario real
   - `COUNT(Codigo)` → atados/tarimas
   - Scrap desde `ScrapMolinos` y `EnvioScraps`
   - `SUM(PesoTotal)/(KgxHrbyPt * @Horas) * 100` → eficiencia
3. Colapsa al final:

```sql
ROW_NUMBER() OVER (PARTITION BY Id_Linea, Codigo ORDER BY FechaPesaje DESC) ... WHERE rn = 1
```

> **Resultado: una fila por Línea + Código.** Los números son la **suma de todos los pesajes** del turno; los metadatos (`Id`, `FechaPesaje`) son del **pesaje más reciente**.

#### C.3 ¿Es confiable al final del turno?

**Sí, al cerrar el turno la suma es definitiva.** Matices importantes:

| Matiz | Efecto |
|---|---|
| Durante el turno el valor es **parcial y creciente** | Cada pesaje nuevo aumenta TR y kg; la fila "se mueve" hasta que cierra el turno |
| `@Horas` usa `GETDATE()` | Para el día en curso la eficiencia se calcula con horas transcurridas; para días pasados usa el turno completo (11.5 h / 12 h) |
| `Desactivado = 1` | Desactivar un pesaje **cambia la suma retroactivamente**, incluso en días cerrados |
| El `Id` devuelto es el del **último pesaje** | Cambia durante el día; el portal lo usa como `ID_PRODUCTO_TERMINADO`, así que deja de empatar por Id y cae al emparejamiento por clave |

#### C.4 Decisión tomada (2026-11-20)

**Para producto terminado, NWSCALE manda.** Por lo tanto, en las filas de producto terminado (`ORIGEN = 'NWSCALE'` o `_origen = 'PRODUCTO_TERMINADO'`) los campos que NWSCALE alimenta dejan de ser capturables a mano:

| Módulo | Campos que NWSCALE escribe | Se bloquean |
|---|---|---|
| PVC | `TRFabricados`, `ProduccionNetaReal`, `TotalScrapKg` | los 3 |
| PEAD Liso | `TRLiberados`, `ProduccionNeta`, `TotalScrap` | los 3 |
| INY | `TRLiberados`, `ProduccionNeta`, `ScrapSinColada`, `ScrapColada` | TR y Prod. Neta (ver nota) |
| Corrugado | `TRLiberados`, `ProduccionNeta`, `ScrapSinCorteSierra`, `ScrapCorteSierra` | TR y Prod. Neta (ver nota) |

> **Nota scrape en INY/Corrugado:** NWSCALE solo aporta el total en `ScrapSinColada` / `ScrapSinCorteSierra` y pone `0` en `ScrapColada` / `ScrapCorteSierra`. Esas dos últimas son captura manual legítima y **se dejan editables**.
>
> **`HorasProgramadas` NO lo toca NWSCALE** y el usuario confirmó que **sí guarda correctamente** → se queda editable.

**Esto sustituye las 3 opciones de la sección B:** no se implementa "respetar lo capturado" ni `EDITADO_MANUAL`; se bloquea la captura y NWSCALE queda como única fuente.

**Implementación:** helper `esFilaProductoTerminado(data)` + `editable`/`cellClass` condicionales por fila.
- ✅ PVC, PEAD Liso, INY y Corrugado (`produccion_*_refactor.js`), `node --check` OK en los 4.
- ✅ Verificado en portal (DBADMIN, `:52538`):
  - PVC 01/11/2026 (11 filas `ORIGEN = NWSCALE`): TR, Prod. Neta y Scrap en **`celda-gris`**; doble clic en Scrap **no abre editor**; Horas Programadas **abre editor**.
  - Corrugado 05/11/2026 (11 filas no-producto-terminado): TR **`celda-blanca`** y editable.
  - 0 errores de JavaScript en ambos módulos.

### D. Entorno

- La conexión a **HANA Cloud ya responde** (`SELECT 1` OK) tras el ajuste del PSE.
- `hdbsql` requiere SQL por archivo (`-I`) porque PowerShell se come las comillas dobles de los identificadores.
- `SQLConnection` apunta a **`DEVELOPER-FER\MSSQLSERVER2022` / `PtmNwScale2`** (la de `SAP-PLASTIC-INT` está comentada).
- IIS Express corriendo en `:52538` con `Database = DBADMIN`.
