# Contexto de sesión — MantenimientosPTM

**Fecha:** 11/11/2026  
**Repositorio:** `C:\Paradox\DEVELOPMENT\MantenimientosPTM`

---

## 1. Estado actual

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
