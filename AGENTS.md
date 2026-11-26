# Reglas del proyecto — MantenimientosPTM

## Pruebas funcionales

- **Todas las pruebas funcionales se hacen SIEMPRE en el portal (navegador)**, simulando la interacción real del usuario (login, clics, formularios, modales, guardado).
- **No usar llamadas directas a la API como sustituto** de una prueba funcional. La API/SQL solo sirve para verificar el resultado por debajo (conteos, claves, duplicados) o para preparar datos cuando el flujo del módulo no lo permita.
- Cuando el flujo lo requiera, usar **usuarios reales por rol** (ambiente de pruebas DBADMIN / TEST_JUNIO_2026):
  - Administrador de mantenimiento: `adminmantenimiento@ptmexico.com` / `AdminMTTO`
  - Técnico de mantenimiento: `p1tecmantto1@ptm.com` / `12345` (planta 1) y `p2tecmantto1@ptm.com` / `12345` (planta 2)
  - Supervisor de producción: `hernandezmj@ptmexico.com`
  - Supervisor (planta 1): `gonzalezuc@ptmexico.com` / `12345`; (planta 2): `gualitosa@ptmexico.com` / `Ptm120625Z`
  - El resto de las contraseñas de prueba están en `CONTEXTO_SESION.md` (§34.F).
- **Uso en producción:** estas cuentas **sí se pueden usar en `PTM_2022_FINAL` / producción SOLO en modo consulta** (navegar, filtrar, abrir modales y leer datos). **Nunca** ejecutar acciones que guarden, autoricen, firmen, cierren, eliminen o generen documentos en producción con ellas.
- **Limpiar los datos de prueba** al terminar (filas de tiempos muertos, OTs, paros, etc.).
- Para Tiempos Muertos, validar el ciclo completo cuando aplique:
  1. Generar/liberar la orden (correctivo o preventivo) con el rol correspondiente.
  2. Atender/cerrar la orden con el técnico.
  3. Registrar el paro manual si aplica.
  4. Abrir el portal de Producción y verificar que **todo se unifica en una sola fila manual** por fecha + línea.
  5. Guardar dos veces y confirmar que **no se duplica**.
  6. Validar el producto terminado (NWSCALE) en modo día y en modo rango.

## Comunicación con usuarios

- Los mensajes para usuarios finales (WhatsApp, correo, Teams) van **breves, claros y SIN emojis**.
- Un mensaje por tema reportado; si varios temas son de la misma persona, se pueden unir, pero sin mezclar módulos.
- Nada de tecnicismos (SP, ALTER, tabla, commit): decir qué quedó resuelto y cómo se comporta ahora.

## Base de Datos SAP HANA Cloud
- Esquema activo local: `DBADMIN`
- Esquema pruebas (QA): `TEST_JUNIO_2026`
- Esquema producción: `PTM_2022_FINAL`

## Mapa Rápido de Módulos
> Referencia para agentes: ruta → vista → JS → controller → SP → tabla.
> Verificado el 2026-11-18 contra el repo y el schema `DBADMIN`. Actualizar al crear o mover módulos.

| Módulo | Ruta / URL | Vista (.cshtml) | JS principal | Controller | SP(s) en DBADMIN | Tabla(s) principal(es) |
| --- | --- | --- | --- | --- | --- | --- |
| Login | `/Login/Login` (y `/` por ruta default) | `MantenimientosPTM/Views/Login/Login.cshtml` | `Scripts/Login.js` (+ `Global.js`) | `MantenimientosPTM/Controllers/LoginController.cs` | `SPPDX_LOGIN` | `OHEM`, `OHPS` (valida contra usuarios SAP) |
| Fin de sesión | `/Login/Ended` | `MantenimientosPTM/Views/Login/Ended.cshtml` | — | `MantenimientosPTM/Controllers/LoginController.cs` | — (solo cierra sesión) | — |
| Equipos (Gestión de Equipos) | `/Equipos/GestionEquipos` | `MantenimientosPTM/Views/Equipos/GestionEquipos.cshtml` (+ `_ModalAgregarEditarEquipos`, `_ModalGestionLineasProduccion`, `_ModalGestionAreas`, `_ModalRutinaMantenimiento`, `_ModalPausarEquipo`, `_ModalSolicitudBajaEquipo`, `_ModalVerImagenAmpliada`, `_ModalAgregarTipoEquipo`) | `Scripts/gestion_equipos_refactor.js` (+ `FileUpload.js`) | `MantenimientosPTM/Controllers/EquiposController.cs` | `SpPdxMTTOConsultaEquipos`, `SpPdxMTTOInsertaEquipo`, `SpPdxMTTOActualizaEquipo`, `SpPdxMTTOInsertarPeriodicidadEquipo`, `SpPdxMTTOConsultarLineasPorPlanta`, `SpPdxMTTOInsertaSolicitudBaja`, … | `PdxMTTOGestionEquipos`, `PdxMTTOEquiposPeriodicidad`, `PdxMTTOPeriodicidadMant`, `PdxMTTOTiposEquipo`, `PdxMTTOLineasxPlanta`, `PdxMTTOAreasxPlanta`, `PdxMTTOAreaLinea`, `PdxMTTOEstatusEquipos`, `PdxMTTOSolicitudesBajaEquipos` |
| Rutinas de equipo (editor) | `/Rutinas/Default?idEquipo=…&Planta=…` | `MantenimientosPTM/Views/Rutinas/Default.cshtml` + `MantenimientosPTM/Views/Rutinas/{1,2}/Rutina_{idEquipo}.cshtml` (contenido generado) | Sin JS externo (HTML generado en servidor) | `MantenimientosPTM/Controllers/RutinasController.cs` | `SpPdxMTTOConsultarPeriodicidadesXEquipo` | `PdxMTTOEquiposPeriodicidad`, `PdxMTTOPeriodicidadMant` — la rutina se guarda como archivo `.cshtml` en `Views/Rutinas/{planta}/`, no en tabla |
| Mantenimientos Correctivos (OT) | `/MantenimientosCorrectivos/MantenimientoCorrectivo` | `MantenimientosPTM/Views/MantenimientosCorrectivos/MantenimientoCorrectivo.cshtml` | `Scripts/mantenimientos_correctivos_refactor.js` (+ `FileUpload.js`) | `MantenimientosPTM/Controllers/MantenimientosCorrectivosController.cs` | `SpPdxMTTOObtenerMantenimientosCorrectivos`, `SpPdxMTTOInsertarMC`, `SpPdxMTTOInsertaOrdenTrabajoMC`, `SpPdxMTTOActualizaMC`, `SpPdxMTTOInsertarSolicitudRefaccion`, `SpPdxMTTOObtenerTecnicosOT` | `PdxMTTOMCGenerados`, `PdxMTTOOrdenesTrabajoMC`, `PdxMTTOEstatusOT`, `PdxMTTOMCSolicitudRefacciones` |
| Solicitud de MC (PROGMC) | `/MantenimientosCorrectivos/PROGMC` | `MantenimientosPTM/Views/MantenimientosCorrectivos/PROGMC.cshtml` | `Scripts/solicitud_mantenimiento_correctivo_refactor.js` | `MantenimientosPTM/Controllers/MantenimientosCorrectivosController.cs` | `SpPdxMTTOInsertarSolicitudMC` (usa `SpPdxMTTOGenerarFolioMC` de forma interna) | `PdxMTTOSolicitudMC` |
| Mantenimientos Preventivos (OT) | `/MantenimientosPreventivos/MantenimientoPreventivo` | `MantenimientosPTM/Views/MantenimientosPreventivos/MantenimientoPreventivo.cshtml` | `Scripts/mantenimientos_preventivos_refactor.js` (+ `FileUpload.js`) | `MantenimientosPTM/Controllers/MantenimientosPreventivosController.cs` | `SpPdxMTTOObtenerMantenimientosPorRango`, `SpPdxMTTOInsertarMP`, `SpPdxMTTOInsertaOrdenTrabajoMP`, `SpPdxMTTOObtenerActividadesPorOTMP`, `SpPdxMTTOValidarTokenGuardado`, `SpPdxMTTOSolicitarReprogramacion` | `PdxMTTOMPGenerados`, `PdxMTTOOrdenesTrabajoMP`, `PdxMTTORutinasMP`, `PdxMTTOActividadesRutinasMP`, `PdxMTTOSolicitudesReprogramacion` |
| Calendario de mantenimientos | `/Calendario/CalendarioMantenimientos` | `MantenimientosPTM/Views/Calendario/CalendarioMantenimientos.cshtml` | `Scripts/calendario_mantenimientos_refactor.js` (+ `index.global.min.js`) | `MantenimientosPTM/Controllers/CalendarioController.cs` | `SpPdxMTTOObtenerMantenimientosCompletados`, `SpPdxMTTOCalcularMantenimientoAnual` | `PdxMTTOMPGenerados`, `PdxMTTOMCGenerados`, `PdxMTTOOrdenesTrabajoMP`, `PdxMTTOOrdenesTrabajoMC`, `PdxMTTORutinasMP`, `PdxMTTOSolicitudesReprogramacion`, `PdxMTTOGestionEquipos` |
| Almacén — Solicitud de Refacciones | `/Almacen/SolicitudRefacciones` | `MantenimientosPTM/Views/Almacen/SolicitudRefacciones.cshtml` | `Scripts/solicitud_refacciones_refactor.js` (+ `FileUpload.js`) | `MantenimientosPTM/Controllers/AlmacenController.cs` | `SpPdxMTTOConsultaSolicitudesRefaccionesMP`, `SpPdxMTTOInsertarSolicitudRefaccion`, `SpPdxMTTOActualizarSolicitudRefaccion`, `SpPdxMTTOUpdateEstatusSolicitud`, `SpPdxMTTOConsultaDatosSolicitante` | `PdxMTTOMPSolicitudRefacciones`, `PdxMTTOMovimientosAlmacen`, `OITM`, `OITW` |
| Almacén — Solicitud de Compra (OC) | `/Almacen/SolicitudOC` | `MantenimientosPTM/Views/Almacen/SolicitudOC.cshtml` (+ `_ModalSolicitudCompra.cshtml`, `_ModalRequisionCompra.cshtml`) | `Scripts/solicitud_ordenes_compra_refactor.js` (+ `solicitud_ordenes_compra_ui_refactor.js`) | `MantenimientosPTM/Controllers/AlmacenController.cs` | `SpPdxMTTOInsertarSolicitudCompraMP`, `SpPdxMTTOInsertarSolicitudCompraDetalleMP`, `SpPdxMTTOGetSolicitudesCompraMP`, `SpPdxMTTOGetProveedorArticulo`, `SpPdxMTTOUpdateEstatusAuthSC`, `SpPdxMTTOGenerarFolioSCMP` | `PdxMTTOMPSolicitudCompra`, `PdxMTTOMPSolicitudCompraDetalle`, `OITM`, `OCRD`, `OPRC` |
| Almacén — Aprobación por correo | `/Almacen/AprobarSolicitudCompra?id=…&token=…` | `MantenimientosPTM/Views/Almacen/AprobacionSolicitud.cshtml` | Sin JS propio (solo Bootstrap) | `MantenimientosPTM/Controllers/AlmacenController.cs` | `SpPdxMTTOGetEstautsAuthSC`, `SpPdxMTTOUpdateEstatusAuthSC`, `SpPdxMTTOUpdateEstatusComAuthSC` | `PdxMTTOMPSolicitudCompra` |
| Almacén — Entradas / Salidas / Devoluciones | `/Almacen/EntradasMercancia` | `MantenimientosPTM/Views/Almacen/EntradasMercancia.cshtml` | `Scripts/entrada_mercancia_refactor.js` | `MantenimientosPTM/Controllers/AlmacenController.cs` | `SpPdxMTTOInsertMovimientoAlmacen`, `SpPdxMTTOGetBalanceOT`, `SpPdxMTTOGetLastSalidaInventario`, `SpPdxMTTOGetDevolucionesPorOT`, `SpPdxMTTOUpdateUDFEntrada`, `SpPdxMTTOUpdateUDFSalida`, `SpPdxMTTOInsertRechazoDevolucion` | `PdxMTTOMovimientosAlmacen`, `PdxMTTORechazoDevolucion`, `OIGN`/`IGN1`, `OIGE`/`IGE1`, `OITM`, `OITW`, `NNM1` |
| Almacén — Reporte de Stock | `/Almacen/ReporteStock` | `MantenimientosPTM/Views/Almacen/ReporteStock.cshtml` | `Scripts/reporte_stock_refactor.js` (+ `solicitud_ordenes_compra_refactor.js`) | `MantenimientosPTM/Controllers/AlmacenController.cs` | `SpPdxMTTOCantidadesRequisicionXAlmacen` (expuesto como `GCConsultaStockAlmacen`) | `OITM`, `OITW`, `OITB`, `OPOR`/`POR1`, `OPRQ`/`PRQ1`, `OIGE`/`IGE1` |
| Métricas (OEE) | `/Metricas/MetricasMtto` | `MantenimientosPTM/Views/Metricas/MetricasMtto.cshtml` | `Scripts/metricas_mannto_refactor.js` | `MantenimientosPTM/Controllers/MetricasController.cs` | `SpPdxMTTOMetricasOEE_PVC`, `SpPdxMTTOMetricasOEE_PeadLiso`, `SpPdxMTTOMetricasOEE_Corrugado`, `SpPdxMTTOMetricasOEE_INY` | `PdxMTTOOrdenesTrabajoMP`, `PdxMTTOMPGenerados`, `PdxMTTOTiemposMuertosProduccionPVC`, `…PeadLiso`, `…Corrugado`, `PdxMTTOGestionEquipos`, `PdxMTTOLineasxPlanta`, `PdxMTTOAreasxPlanta` |
| Planeación | `/Planeacion/Planeacion` | `MantenimientosPTM/Views/Planeacion/Planeacion.cshtml` | `Scripts/planeacion_refactor.js` | `MantenimientosPTM/Controllers/PlaneacionController.cs` | `SpPdxMTTOObtenerPlanesProduccion`, `SpPdxMTTOInsertarPlanProduccion`, `SpPdxMTTOActualizarPlanProduccion`, `SpPdxMTTOConsultaOrdenesFabricacion`, `SpPdxMTTOBuscarArticulos` | `PdxMTTOTPlanProduccion`, `PdxMTTOTBitacoraPlanProduccion`, `@PDX_CAPPROD`, `OWOR`, `OITM` |
| Calendario de Planeación | `/Planeacion/CalendarioPlaneacion` | `MantenimientosPTM/Views/Planeacion/CalendarioPlaneacion.cshtml` | `Scripts/calendario_planeacion_refactor.js` (+ `index.global.min.js`) | `MantenimientosPTM/Controllers/PlaneacionController.cs` | `SpPdxMTTOObtenerPlanesProduccion`, `SpPdxMTTOObtenerMantenimientosPorRango`, `SpPdxMTTOObtenerParosProduccion` | `PdxMTTOTPlanProduccion`, `PdxMTTOMPGenerados`, `PdxMTTOTParoProduccion` |
| Calendario de Producción | `/Planeacion/CalendarioProduccion` | `MantenimientosPTM/Views/Planeacion/CalendarioProduccion.cshtml` | `Scripts/calendario_produccion_refactor.js` | `MantenimientosPTM/Controllers/PlaneacionController.cs` | `SpPdxMTTOObtenerPlanesProduccion` | `PdxMTTOTPlanProduccion`, `@PDX_CAPPROD`, `OWOR` |
| Producción — Paros | `/Produccion/ParosProduccion` | `MantenimientosPTM/Views/Produccion/ParosProduccion.cshtml` (+ `_ModalActualizacionDatosBitacora.cshtml`) | `Scripts/paros_produccion_refactor.js` | `MantenimientosPTM/Controllers/ProduccionController.cs` | `SpPdxMTTOObtenerParosProduccion`, `SpPdxMTTOInsertarParoProduccion`, `SpPdxMTTOReanudarParoProduccion`, `SpPdxMTTOGetCategoriasParo`, `SpPdxMTTOEliminaParoProduccion` | `PdxMTTOTParoProduccion`, `PdxMTTOCategoriasParo`, `PdxMTTOEstatusOT` |
| Producción — Tiempos Muertos PVC | `/Produccion/Produccion_pvc` | `MantenimientosPTM/Views/Produccion/Produccion_pvc.cshtml` | `Scripts/produccion_pvc_refactor.js` (+ `ProductosTerminadosHelper.js`, `produccion_pvc_tour.config.js`) | `MantenimientosPTM/Controllers/ProduccionController.cs` | `SpPdxMTTOGuardarTiemposMuertosPVC`, `SpPdxMTTOConsultarTiemposMuertosPVC`, `SpPdxMTTOEliminarTiemposMuertosPVC`, `SpPdxMTTOValidarProductosTerminadosExistentes` | `PdxMTTOTiemposMuertosProduccionPVC` |
| Producción — Tiempos Muertos PEAD Liso | `/Produccion/Produccion_peadliso` | `MantenimientosPTM/Views/Produccion/Produccion_peadliso.cshtml` | `Scripts/produccion_peadliso_refactor.js` (+ `ProductosTerminadosHelper.js`, `produccion_peadliso_tour.config.js`) | `MantenimientosPTM/Controllers/ProduccionController.cs` | `SpPdxMTTOGuardarTiemposMuertosPeadLiso`, `SpPdxMTTOConsultarTiemposMuertosPeadLiso`, `SpPdxMTTOEliminarTiemposMuertosPeadLiso`, `SpPdxMTTOValidarProductosTerminadosExistentes` | `PdxMTTOTiemposMuertosProduccionPeadLiso` |
| Producción — Tiempos Muertos INY | `/Produccion/Produccion_iny` | `MantenimientosPTM/Views/Produccion/Produccion_iny.cshtml` | `Scripts/produccion_iny_refactor.js` (+ `ProductosTerminadosHelper.js`, `produccion_iny_tour.config.js`) | `MantenimientosPTM/Controllers/ProduccionController.cs` | `SpPdxMTTOGuardarTiemposMuertosINY`, `SpPdxMTTOConsultarTiemposMuertosINY`, `SpPdxMTTOEliminarTiemposMuertosINY`, `SpPdxMTTOValidarProductosTerminadosExistentes` | `PdxMTTOTiemposMuertosProduccionINY` |
| Producción — Tiempos Muertos Corrugado | `/Produccion/Produccion_corrugado` | `MantenimientosPTM/Views/Produccion/Produccion_corrugado.cshtml` | `Scripts/produccion_corrugado_refactor.js` (+ `ProductosTerminadosHelper.js`, `produccion_corrugado_tour.config.js`) | `MantenimientosPTM/Controllers/ProduccionController.cs` | `SpPdxMTTOGuardarTiemposMuertosCorrugado`, `SpPdxMTTOConsultarTiemposMuertosCorrugado`, `SpPdxMTTOEliminarTiemposMuertosCorrugado`, `SpPdxMTTOValidarProductosTerminadosExistentes` | `PdxMTTOTiemposMuertosProduccionCorrugado` |
| Producción — NWSCALE (producto terminado) | Endpoints dentro del módulo Producción: `/Produccion/GetProductoTerminadoNewScale`, `/Produccion/EnviarExcelProduccionPorCorreo` | — (consumido por los `Produccion_*.cshtml`) | `Scripts/ProductosTerminadosHelper.js` | `MantenimientosPTM/Controllers/ProduccionController.cs` | ⚠️ **No está en DBADMIN**: SQL Server `PtmNwScale2` → SP `Sppdx_FiltradoProductosTerminados` (cadena `connectionStrings["SQLConnection"]`) | Tablas NWSCALE en SQL Server (no en HANA) |

### Convenciones de navegación
- **URL:** `MantenimientosPTM/App_Start/RouteConfig.cs` define una sola ruta `{controller}/{action}/{id}` con default `Login/Login`; no hay atributos `[Route]`, así que la URL es literalmente `/<Controlador sin el sufijo "Controller">/<Acción>`.
- **Menú:** vive en `MantenimientosPTM/Views/Shared/_Layout.cshtml` (bloque de navegación, aprox. líneas 182-330) y todos los enlaces usan `@Url.Action("Accion","Controlador")`. Un módulo nuevo solo es visible si se agrega ahí.
- **Carga de JS:** cada vista declara sus `<script>` al final. El cache-busting es `?v=@System.IO.File.GetLastWriteTime(HttpContext.Current.Server.MapPath("~/Scripts/x.js")).Ticks` y hoy se aplica a `Global.js`, `Content/Custom.css` y al JS principal del módulo (Equipos, Correctivos, Preventivos, PROGMC, Calendario, Métricas, Login); los auxiliares (`FileUpload.js`, `ProductosTerminadosHelper.js`, tour configs) se cargan sin versión.
- **Ambiente/BD activo:** `MantenimientosPTM/Web.config` → `appSettings["Database"]` (hoy `DBADMIN`; alternativas comentadas `PTM_2022_FINAL` y `TEST_JUNIO_2026`), más `connectionStrings["HANAConnection"]` (SAP HANA Cloud) y `connectionStrings["SQLConnection"]` (NWSCALE en SQL Server).
- **Publicación rápida:** cada archivo modificado se copia a su bandeja local (`.gitignore`), por schema: `SCRIPTJS_MIGRACION_RAPIDA/<schema>/` para JS, `VIEWS_MIGRACION_RAPIDA/<schema>/` para vistas `.cshtml` y `CSS_MIGRACION_RAPIDA/<schema>/` para CSS. La fuente es `MantenimientosPTM/Scripts`, `MantenimientosPTM/Views` y `MantenimientosPTM/Content`; las bandejas sirven para copiar al IIS. No se publica el `Web.config` del repo.
- **Resolución de SPs:** las clases `MantenimientosPTM/Models/AccesoDatos/AccesoDatos*.cs` exponen propiedades `GC*` que interpolan `AppSettings["Database"]` + nombre del SP; se ejecutan con `GlobalCommands.ExecuteProcedureHanaAuto` (`Models/GlobalCommands.cs`). Las reglas de negocio intermedias están en `Models/LogicaNegocio/Logica*.cs`.

### Vistas legacy / código muerto conocidas
> **No son la ruta viva.** Se listan para no rastrear por ellas.
- `MantenimientosPTM/Views/MantenimientosPreventivos/SolicitudOC.cshtml` (con `Scripts/SOC.js`) y `MantenimientosPTM/Views/MantenimientosPreventivos/SolicitudRefacciones.cshtml` (con `Scripts/SR.js`): duplican los flujos de Almacén y no están enlazadas al menú. Las rutas vivas son `/Almacen/SolicitudOC` y `/Almacen/SolicitudRefacciones`.
- `MantenimientosPTM/Views/MantenimientosPreventivos/MPSINOT.cshtml` + `Scripts/MPSINOT.js`: accesible solo por URL directa (`/MantenimientosPreventivos/MPSINOT`), sin enlace en el menú.
- `MantenimientosPreventivosController.MCOT()` no tiene vista (`Views/MantenimientosPreventivos/MCOT.cshtml` no existe) → acción muerta. `Scripts/MCOT.js` y `Scripts/PROGMC.js` no los referencia ninguna vista.
- `ProduccionController.Planeacion()`, `ProduccionController.MetricasMtto()` y `ProduccionController.CalendarioPlaneacion()` hacen `return View()` pero no existen `Views/Produccion/Planeacion.cshtml`, `Views/Produccion/MetricasMtto.cshtml` ni `Views/Produccion/CalendarioPlaneacion.cshtml` → acciones muertas (vivas: `/Planeacion/Planeacion`, `/Metricas/MetricasMtto`, `/Planeacion/CalendarioPlaneacion`).
- `Scripts/PlaneacionOld.js`, `Scripts/Produccion.js` y `Scripts/dashboard.js`: sin referencias en ninguna vista.
- `MantenimientosPTM/Views/Rutinas/Rutina_611.cshtml` y `Rutina_612.cshtml` en la raíz de `Views/Rutinas`: el controlador solo resuelve `Views/Rutinas/{Planta}/Rutina_{idEquipo}.cshtml`, así que no se sirven.
- SPs existentes en `DBADMIN` **sin referencia** en el código C#: `SpPdxMTTOMetricasOEE` (versión genérica, sustituida por las `_PVC` / `_PeadLiso` / `_Corrugado` / `_INY`), `SpPdxMTTOInsertaMantenimientosCorrectivosPro`, `SpPdxMTTOConsultaMantenimientosCorrectivosPro`, `SpPdxMTTOActualizaMantenimientosCorrectivosPro` (la tabla `PdxMTTOMantenimientosCorrectivosPro` tiene 0 filas), `SpPdxMTTOInsertarSolicitudRefaccionCorrectivo`, `SpPdxMTTOConsultaSRByOT`, `SpPdxMTTOConsultarRefaccionesPorOTMP`, `SpPdxMTTOCantidadesRequisicion`, `SpPdxMTTOGetInfoArticulo`, `SpPdxMTTOObtenerNombresTecnicos`, `SpPdxMTTOGetOrdenProduccionPorFolio`, `SpPdxGetOrdenProduccionPorFolio`, `SpPdxGetCapacidadPorArticulo`, `SpPdxTotalProducidoPorArticulo`.
- Archivos con extensión `~` (`Controllers/4mcrsyan.yvq~`, `Scripts/5kykdirt.1bg~`, etc.) son copias temporales del editor: no compilan ni se sirven.
- ⚠️ `SpPdxMTTOAceptarReprogramacion` lo invoca `MantenimientosPreventivosController.AceptarReprogramacion` pero **no existe en `DBADMIN`** (verificado en `SYS.PROCEDURES`); ese flujo de aceptación de reprogramación fallaría en este esquema.

### Cómo mantenerlo
- Al crear, mover o eliminar un módulo (vista / acción / JS principal / SP / tabla), actualizar esta tabla y la lista de legacy en el mismo commit.

---

## Flujos esperados por módulo

> Reglas de negocio de referencia. Sirven para distinguir un **bug** de un **comportamiento diseñado**.
> Si un resultado no cuadra con lo que dice aquí, es candidato a defecto; si el caso no está documentado, requiere **confirmación de negocio** antes de reportarse como bug.

### Sesión y login
- **No hay sesión de servidor**: el usuario vive en `sessionStorage` (`userData`, `Login.js:91`). No existe timeout ni expiración por inactividad; los POST AJAX nunca "expiran".
- Si se pierde `sessionStorage` (pestaña nueva, restauración del navegador, logout), el guard de `Global.js:3090` redirige a la raíz (`/Login/Login`).
- **`/Login/Ended` significa "licencia vencida"** (`appSettings["FechaVencimiento"]`), **no** sesión expirada. No confundir ambos casos.

### Mantenimientos Preventivos
- **Generar Órdenes** crea la OT directamente en **Liberado (2)**; **no** existe un paso manual de liberación.
- El **técnico se autoasigna**; la sección "Asignar Técnicos" está oculta para el Administrador (así está diseñado).
- **Secuencia real de firmas:** técnico firma → pulsa **Finalizar** → la OT pasa a **estatus 4** → **supervisor de producción** firma → **administrador de mantenimiento** firma → queda cerrada.
  - Supervisor y administrador **solo** pueden firmar cuando la OT está en estatus 4.
- **Guardar Borrador NO cambia el estatus** y **no debe ocultar los botones**: el usuario debe poder seguir avanzando después de guardar un borrador.
- **Comentarios de la rutina: obligatorios SOLO al finalizar la OT** (validación del portal en `guardarRutina`, mensaje *"Captura los comentarios de la rutina antes de finalizar la orden de trabajo"*). En **borrador** siguen siendo opcionales (`guardarRutinaParaBorrador`). **No** se usa `required` nativo en el `textarea` `#ComentariosRutina`.
- El botón `#btnGuardarOT` se etiqueta **"Finalizar"**; ninguna validación fallida debe dejarlo como "Guardar" (helper `_restaurarBotonGuardarOT`).
- **Cumplimiento PM** = MP **liberadas** con las **3 firmas** ÷ MP **liberadas** del periodo. Una MP sin las 3 firmas **no** cuenta.
- Las marcas de "Realizado" de la rutina solo se ven en la vista del técnico mientras la OT está en captura; en las vistas de supervisor/admin la rutina se muestra como texto.
- **Corrección del administrador:** con estatus 4 y **al menos una de las 3 firmas pendiente**, el administrador puede editar **Hora Inicio, Hora Fin y Texto de Secuencia** y guardarlos con el botón **"Solo actualizar datos"** (exclusivo de `AdminMtto`/`Administrador`). Ese botón viaja como `TipoOperacion = "BORRADOR"`: el servidor **no exige firma** y **no cambia el estatus**; se envían las firmas en blanco y el SP conserva las existentes (no se reescriben los PNG). Con las **3 firmas** la OT queda **bloqueada**. El botón **"Finalizar"** no cambió: el administrador sigue pudiendo firmar "Mantenimiento" (Coordinador de Mantenimiento) cuando esa firma falte.

### Mantenimientos Correctivos
- **PROGMC** genera la solicitud **y** la OT en un solo paso, con estatus **Liberado**.
- Requiere **2 firmas**: técnico (Realizó) + supervisor de producción (Supervisó).
- **Solo se envía al servidor la firma del rol que guarda.** Las demás viajan vacías para que el SP conserve su PNG (si se reenviaran, el servidor las recodificaría). Aplica a Correctivos y Preventivos (`_firmaSoloDelRol`).
- **Si "Máquina detenida" está encendido** al cerrar, se genera un **paro `COR-xx`** (`TIPO_PARO = CORRECTIVO`) en `PdxMTTOTParoProduccion`.
- **Si está apagado**, no debería generar paro.
- **Bitácoras de tiempos muertos** solo incorporan OTs correctivas con `MAQUINA_DETENIDA = 1` **y las 2 firmas** (técnico + supervisor). La búsqueda común distingue la llamada de bitácora por `P_LINEA_PROD = 1`; las pantallas de Correctivos no aplican ese filtro y siguen mostrando todas las OTs.
- **Fecha de la fila del correctivo:** la fila se pinta con **`HoraFin` del técnico** (el día en que se cerró el trabajo), igual que en preventivos; `FechaCreacion` queda solo de respaldo cuando la OT no trae hora fin. El front además **descarta las OTMC cuya fecha de fila cae fuera del rango consultado**, y el SP `SpPdxMTTOObtenerMantenimientosCorrectivos` incluye, **solo cuando `P_LINEA_PROD = 1`**, las OT cuyo `CAST(OT.HORA_FIN AS DATE)` cae en el rango aunque la solicitud se haya creado antes. El listado de Correctivos (`P_LINEA_PROD = NULL`) conserva el filtro por `FECHA_CREACION`.
- **Preventivos en bitácora:** solo se sincronizan los que tienen las **3 firmas** (`OrdenTrabajoFinalizada='SI'`; estatus 4 se alcanza con la firma del técnico). El filtro de firmas se aplica **en el front** (`traerPreventivosCerrados`). La fila se pinta con **`HoraFin` del técnico primero** (día en que se finalizó el trabajo) → `FechaRealInicio` (reprogramación) → apertura; además el front **descarta las OTMP cuya fecha de fila cae fuera del rango consultado** (el SP devuelve todo el periodo programado cuando el rango cae dentro). En bitácora (`P_LINEA_PROD = 1`) el SP también incluye la ocurrencia por `CAST(OT.HORA_FIN AS DATE) BETWEEN rango`, para que se vea el día de ejecución aunque la reprogramación diga otra fecha; el listado de Preventivos y el Calendario no cambian.
- La hora de cierre se toma del **reloj del servidor** (decisión de negocio); la hora capturada por el técnico puede diferir del `TIEMPO INVERTIDO`.
- **Corrección del administrador:** con estatus 4 y `FIRMA_SUPERVISO` vacía, el administrador (`AdminMtto`/`Administrador`) puede editar **Hora Inicio/Fin, Hora Cierre OT, Texto de Secuencia y Scrap Real** y guardar con **"Guardar"**. No reenvía firmas: el SP conserva `FIRMA_REALIZO` y su PNG. Con `FIRMA_SUPERVISO = 'SI'` la OT queda **bloqueada** (solo lectura). El administrador **no firma** en Correctivos.
- **Etiqueta de estatus (listado y carátula deben coincidir):** el listado y el modal muestran el **estado derivado**: con `ESTATUS = 4` y `OrdenTrabajoFinalizada = 'NO'` (falta la firma del supervisor) se muestra **"En proceso de firmas (falta supervisor)"**; **"Cerrado"** solo con las 2 firmas completas. El botón de la carátula viaja con `data-ordenfinalizada`.

### Refacciones desde la OT (Preventivos y Correctivos)
- En el modal **"Refacciones de la Orden de Trabajo"** las acciones **Autorizar**, **Rechazar** y **Cerrar solicitud** ya **no cierran el modal**: el botón de la fila cambia de estado (`Autorizada` / `Rechazada` / `Cerrada`) y se puede seguir con las demás refacciones de la misma OT. El usuario cierra con el botón **Cerrar**.
- Antes cada acción cerraba el modal a los 2 s (había que volver a abrirlo desde el listado por cada refacción).
- La autorización no toca la sesión: `POST /Almacen/AutorizarRefaccion` responde JSON y solo dispara el aviso SignalR a los demás roles.

### Estatus de la OT y refacciones
- Una OT pasa a **"En espera de refacción" (ESTATUS = 3)** cuando el técnico solicita refacciones y **regresa a "Liberado" (2)** cuando ya **no queda ninguna refacción que la bloquee**.
- "Bloquea" = la solicitud **no** está `ELIMINADA` (cancelada por almacén) ni `Cerrada` (cancelada por el técnico) **y** además no está completamente surtida (salida ≥ solicitada), ni devuelta completa, ni con rechazo de devolución. Es el mismo criterio de `SpPdxMTTOGetBalanceOT`.
- La liberación la decide el **servidor** (no el front): `SpPdxMTTOActualizarSolicitudRefaccion` y `SpPdxMTTOUpdateEstatusSolicitud` reevalúan la OT al terminar, y `SpPdxMTTOActualizaMC` / `SpPdxMTTOActualizaMP` **no dejan bajar a 2** si todavía hay refacciones bloqueantes. Por eso la antigua llamada del controller que forzaba `ESTATUS = 2` al cerrar una solicitud ya no puede liberar antes de tiempo.
- Un paro/OT nunca debe quedar en 3 con todas sus refacciones resueltas: si pasa, es defecto (revisar el estatus de cada `PdxMTTOMPSolicitudRefacciones` de la OT).

### Tiempos Muertos / Bitácoras
- El grid mezcla **dos tipos de fila**:
  - **MANUAL** — clave `M|planta|fecha|línea`: concentra las **OT** del día (correctivos y preventivos).
  - **NWSCALE** — clave `N|planta|DIA|fecha|línea|producto|turno`: una por producto y turno con producción real.
- Las **OT se unifican** en la fila MANUAL por fecha + línea (no una fila por OT).
- **La fecha de la fila es la del cierre del técnico** (`HORA_FIN`), no la apertura ni la programación: preventivos usan `HoraFin → FechaRealInicio → apertura` y correctivos `HoraFin → FechaCreacion`. Una OT que se cierra otro día **no** se queda en la fila del día en que se abrió.
- **Iconos de la columna `Mes`:** una fila puede traer preventivos y correctivos a la vez y se muestran **ambos** tooltips (🔧 correctivo, 🛠️ preventivo, 🚫 paro manual, 📦 producto terminado). Antes el marcador era excluyente y se perdía el de menor prioridad.
- **Datos históricos:** las bitácoras anteriores al 24/11/2026 se corrigieron con `SQL_MIGRACION/APLICADOS/DBADMIN/PRODUCCION/20261124_SANEO_BITACORAS_FECHA_TECNICO_NOV_DBADMIN.sql` (solo noviembre 2026). El script reubica las OT por `HORA_FIN`, quita las que no tienen firmas completas, recalcula horas y KPI, crea la fila destino si falta y borra las filas que quedan vacías. Es re-ejecutable y deja respaldo en `TMP_BAK_SANEO_<PROCESO>_20261124`.
- **Los correctivos llegan por la ruta de la OT** (`GetMantenimientosCorrectivosPendientes`), **no** por el endpoint de paros. Por eso `FiltroIncluirCorrectivo` se envía en `null` en los 4 procesos: incluirlos ahí **duplicaría** las horas en la misma columna (`MttoCorrectivos`).
- Los **paros manuales** (`PAR-xx`) sí llegan por `obtenerParosProduccionSS`.
- El paro se captura en la **fila del producto/turno** que se detuvo; el total de la línea es la suma de sus filas.
- **Guardar dos veces no debe duplicar**: mismo `CLAVE_SYNC` ⇒ actualiza el mismo registro.

### Paros de Producción (reporte)
- El combo **Planta** está **deshabilitado a propósito**: el reporte siempre envía la planta del usuario (`this.PLANTA`), no el valor del combo. El combo **Proceso** sí es filtro real.
- El combo **Proceso** viaja como `FiltroArea` → `p_ID_AREA` y aplica a **las dos ramas** del SP `SpPdxMTTOObtenerParosProduccion`: paros manuales (`PAR.ID_AREA`) y paros de correctivo (`COR-xx`, por `PdxMTTOGestionEquipos.AREA` del equipo de la OT).
- Para los `COR-xx` el proceso es el **área del equipo**, no el texto de la línea (varios equipos de `SERVICIOS`/`MEZCLADO` están capturados con `AREA = PVC` en `PdxMTTOGestionEquipos`).
- **Solo líneas de producción:** el reporte no muestra filas cuya línea tenga `PdxMTTOLineasxPlanta.PRODUCCION = 0` (`SERVICIOS`, `MEZCLADO`, `CALIDAD`, `SILOS`, ...) **ni** las que se llamen `SERVICIOS*`, `CALIDAD*`, `MEZCLADO*`, `SILOS*`, `MOLINO*`, `FFCC*`, `OTROS*` o contengan `PRUEBA` (blindaje por si la bandera `PRODUCCION` está mal capturada). En planta 2 la línea `SERVICIOS` estaba con `PRODUCCION = 1` y se corrigió a 0 (24/11/2026). En la rama de correctivos es fijo (`LE.PRODUCCION = 1`); en la manual aplica **solo cuando llama el reporte** (`p_INCLUIR_CORRECTIVO = 'S'`), porque las bitácoras de tiempos muertos llaman con `NULL` y conservan su comportamiento.
- **Duración de los `COR-xx`:** se calcula con la ventana del **técnico** (`PdxMTTOOrdenesTrabajoMC.HORA_INICIO` → `HORA_FIN`), no con `HORA_APERTURA` → `HORA_CIERRE` de la OT (esa incluye los días que la orden tardó en cerrarse). Si falta una de las dos horas del técnico se completa con la del sistema; si el fin queda antes del inicio se usa la ventana del sistema completa.
- Los paros manuales (`PAR-xx`) se excluyen de la vista cuando ya están capturados en la bitácora del tipo de línea (`p_TIPO_LINEA`).
- La bitácora de tiempos muertos **no se ve afectada** por el filtro: llama a `obtenerParosProduccionSS` con `FiltroIncluirCorrectivo = null`, por lo que la rama de correctivos no se ejecuta.

### Métricas (OEE)
- **Cumplimiento PM** solo cuenta las MP cerradas con **las 3 firmas**.
- **N° de paradas** cuenta solo filas de bitácora **con horas de paro**. Con clasificación "Todas" (`NULL`), una fila con `MTTO_CORRECTIVOS + HERRAMENTAL = 0` (o su equivalente `TIEMPO_MUERTO_*` según proceso) no aporta paradas; lo mismo aplicaba ya con los filtros por clasificación.
- El **denominador** son las MP **liberadas** del periodo, no el total de equipos programados.
- `HORAS_PARO` / **MTTR** dependen de la **bitácora de tiempos muertos guardada**, no solo del cierre de la OT: si no se guarda la bitácora, el indicador no se mueve.
- La **planta** se toma de `sessionStorage.userData[0].PLANTA`, **no** del combo "Planta" (que es cosmético en este módulo).
- `TodosLosProcesos` ejecuta los SP **en serie** (~150 ms por SP, latencia de red a HANA Cloud).
- **MTTR** = Σ horas de la columna de correctivos/herramental (según Clasificación) / Σ `OTMC` de las filas con horas. Solo entran **correctivos con paro (`MAQUINA_DETENIDA = 1`) y las 2 firmas**; preventivos y paros manuales no cuentan.
- **Clasificación:** `MANTENIMIENTO` usa `MTTO_CORRECTIVOS`; `HERRAMENTALES` usa `HERRAMENTAL`; `Todas` suma las dos.
- **MTBF** = (Σ `TIEMPO_DISPONIBLE` − Σ horas de reparación) / Σ `OTMC`; **sin paradas → N/A**. El `T. disponible` es la suma de **todas las líneas del filtro** (incluye filas de producto terminado NWSCALE); con una línea es solo esa línea y no se compara con el total.
- `TIEMPO_DISPONIBLE` = `HORAS_PROGRAMADAS` − los paros programados del proceso (PVC: MTTO. PREVENTIVO, CONTROL INVENTARIOS, FALTA MATERIA PRIMA E INSUMOS, CAMBIO MOLDE, CALENTAMIENTO, PARO Y ARRANQUE NO PROG., ARRANQUE Y ESTABILIZACIÓN; INY: PREVENTIVO, CONTROL DE INVENTARIOS, FALTA DE MATERIA PRIMA E INSUMOS, PREPARACIÓN DE LÍNEA).
- **Filtro de línea:** comparación **normalizada** (UPPER/TRIM + acentos) porque en la bitácora conviven `Linea N PVC` y `LÍNEA N PVC`. La bitácora debe estar normalizada al nombre de `PdxMTTOLineasxPlanta`; el front busca la fila por **nombre**, no por ID, y si no coincide crea una fila nueva.
- **Horas de correctivo/herramental:** solo se llenan desde OT. La celda de Herramental **no es editable** y los paros manuales de `MTTO CORRECTIVOS`/`HERRAMENTAL` **no suman** a la bitácora (sí quedan en el reporte de Paros).

### Almacén
- Las refacciones solicitadas desde una OT se consultan en **Almacén → Solicitud de Refacciones**, no dentro de la OT.
- El modal **"Cambiar Refacción"** (`#solicitarRefAlmModal`) es una acción **por fila** (`.btn-change-ref`): necesita registros cargados y se deshabilita si la refacción ya se surtió parcialmente.
- **Salidas de mercancía — centros de costeo:** el guardado se **bloquea si falta alguna de las 4 dimensiones** (Departamento/Proceso/Gastos/Cedis); SAP rechaza el documento si viaja una vacía. El Departamento se preselecciona con el del **solicitante** (`SpPdxMTTOGetDepSucursal` por email; join `OUDP.Name = OPRC.PrcName`, hoy solo coinciden MANTENIMIENTO/HERRAMENTAL/CALIDAD — 20 de 23 departamentos resuelven NULL). Si el solicitante no tiene centro, el select arranca vacío con "— Elija el centro de costos —" y se elige a mano. Los dropdowns solo ofrecen centros **activos** (`SpPdxMTTOGetCostCenters` filtra `Active='Y'`). Proceso ('PPVC') y Gastos ('GIF') siguen preseleccionados fijos y Cedis por planta del conectado ('CCOR'/'PLANTA2') hasta que negocio defina el mapeo.
- La búsqueda de artículos del módulo de refacciones incluye **REFACCIONES (104) + INSUMOS (102)**.

### Cómo mantener esta sección
- Al cambiar una regla de negocio (flujo de firmas, cálculo de un KPI, origen de un dato), actualizar aquí en el mismo commit. **Esta sección es la que usan los agentes de QA para decidir si algo es un bug.**











