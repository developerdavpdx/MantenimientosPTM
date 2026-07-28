using MantenimientosPTM.Hubs;
using Microsoft.AspNet.SignalR;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Sap.Data.Hana;
using System;
using System.Collections.Generic;
using System.Data;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Web.Mvc;

namespace MantenimientosPTM.Controllers
{
    public class MantenimientosPreventivosController : Controller
    {
        readonly LogicaMantenimientosPreventivos Logic = new LogicaMantenimientosPreventivos();

        #region Views
        public ActionResult MantenimientoPreventivo()
        {
            return View();
        }
        public ActionResult MPSINOT()
        {
            return View();
        }
        public ActionResult MCOT()
        {
            return View();
        }
        public ActionResult SolicitudRefacciones()
        {
            return View();
        }
        public ActionResult SolicitudOC()
        {
            return View();
        }
        #endregion

        #region Endpoints
        [HttpPost]
        public JsonResult GetMantenimientosPorRango()
        {
            try
            {
                bool AditionalFilter = false;
                // ✅ Parámetros de DataTables
                string draw = Request.Form["draw"];
                string drawValue = !string.IsNullOrEmpty(draw) ? draw : "0";
                int NroPeticion = Convert.ToInt32(drawValue);

                string lenght = Request.Form["length"];
                string lenghtValue = !string.IsNullOrEmpty(lenght) ? lenght : "10";
                int CantidadRegistros = Convert.ToInt32(lenghtValue);

                string start = Request.Form["start"];
                string startValue = !string.IsNullOrEmpty(start) ? start : "0";
                int OmitirRegistros = Convert.ToInt32(startValue);

                string search = Request.Form["search[value]"];
                string searchValue = !string.IsNullOrEmpty(search) ? search : "";
                string FiltroBusqueda = searchValue;

                // ✅ Parámetros de filtros
                string FiltroFechaInicio = Request.Form["FiltroFechaInicio"];
                string FiltroFechaFin = Request.Form["FiltroFechaFin"];
                string FiltroArea = Request.Form["FiltroArea"];
                string FiltroLinea = Request.Form["FiltroLinea"];
                string FiltroOrdenTrabajo = Request.Form["FiltroOrdenTrabajo"];
                string FiltroPeriodicidad = Request.Form["FiltroPeriodicidad"];
                string FiltroPlanta = Request.Form["FiltroPlanta"];
                string FiltroEstatusOT = Request.Form["FiltroEstatusOT"];
                string FiltroUsuario = Request.Form["FiltroUsuario"];
                string FiltroTipoUsuario = Request.Form["FiltroTipoUsuario"];
                string FiltroExcluirSincronizadosPVC = Request.Form["FiltroExcluirSincronizadosPVC"];
                string FiltroExcluirSincronizadosPEADLISO = Request.Form["FiltroExcluirSincronizadosPEADLISO"];
                string FiltroExcluirSincronizadosPEADCORR = Request.Form["FiltroExcluirSincronizadosPEADCORR"];

                //Limpiar para tecnico
                if (FiltroTipoUsuario == "TecnicoMtto")
                    FiltroUsuario = string.Empty;

                if (FiltroArea != string.Empty || FiltroLinea != string.Empty || FiltroOrdenTrabajo != string.Empty)
                    AditionalFilter = true;

                //OMITIR PARA DEMO
                if (FiltroTipoUsuario == "Produccion" || FiltroTipoUsuario == "SupervisorProduccion" || FiltroTipoUsuario == "SupervisorMantenimiento")
                {
                    FiltroUsuario = "";
                    FiltroEstatusOT = "2,3,4";
                }

                // ✅ Si no vienen fechas, usar el año 2026
                DateTime dtFechaInicio;
                DateTime dtFechaFin;

                if (string.IsNullOrEmpty(FiltroFechaInicio) || string.IsNullOrEmpty(FiltroFechaFin))
                {
                    DateTime hoy = DateTime.Now;
                    dtFechaInicio = new DateTime(hoy.Year, hoy.Month, 1); // ✅ Primer día del mes actual
                    dtFechaFin = dtFechaInicio.AddMonths(1).AddDays(-1); // ✅ Último día del mes actual
                }
                else
                {
                    dtFechaInicio = DateTime.Parse(FiltroFechaInicio);
                    dtFechaFin = DateTime.Parse(FiltroFechaFin);
                }


                //=================================OBTENER DATOS===========================//
                // ✅ TODOS LOS FILTROS SE ENVÍAN A HANA
                var parameters = new Dictionary<string, (object value, ParameterDirection direction, HanaDbType type)>
                {
                    { "P_FECHA_INICIO", (dtFechaInicio, ParameterDirection.Input, HanaDbType.Date) },
                    { "P_FECHA_FIN", (dtFechaFin, ParameterDirection.Input, HanaDbType.Date) },
                    { "P_FILTRO_AREA", (string.IsNullOrEmpty(FiltroArea) ? (object)null : FiltroArea, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_FILTRO_LINEA", (string.IsNullOrEmpty(FiltroLinea) ? (object)null : FiltroLinea, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_FILTRO_ORDEN", (string.IsNullOrEmpty(FiltroOrdenTrabajo) ? (object)null : FiltroOrdenTrabajo, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_FILTRO_PERIODICIDAD", (string.IsNullOrEmpty(FiltroPeriodicidad) ? (object)null : FiltroPeriodicidad, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_FILTRO_PLANTA", (string.IsNullOrEmpty(FiltroPlanta) ? (object)null : FiltroPlanta, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_FILTRO_ESTATUS", (string.IsNullOrEmpty(FiltroEstatusOT) ? (object)null : FiltroEstatusOT, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_FILTRO_BUSQUEDA", (string.IsNullOrEmpty(FiltroBusqueda) ? (object)null : FiltroBusqueda, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_USUARIO", (string.IsNullOrEmpty(FiltroUsuario) ? (object)null : FiltroUsuario, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_EXCLUIR_SINCRONIZADOS_PVC", (string.IsNullOrEmpty(FiltroExcluirSincronizadosPVC) ? (object)null : FiltroExcluirSincronizadosPVC, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_EXCLUIR_SINCRONIZADOS_PEADLISO", (string.IsNullOrEmpty(FiltroExcluirSincronizadosPEADLISO) ? (object)null : FiltroExcluirSincronizadosPEADLISO, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_EXCLUIR_SINCRONIZADOS_CORRUGADO ", (string.IsNullOrEmpty(FiltroExcluirSincronizadosPEADCORR) ? (object)null : FiltroExcluirSincronizadosPEADCORR, ParameterDirection.Input, HanaDbType.NVarChar) }
                };

                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                    Logic.AD.GCObtenerMantenimientosPorRango,
                    parameters
                );

                // ✅ Obtener los datos YA FILTRADOS desde HANA
                List<AccesoDatosMantenimientosPreventivos.MantenimientoRangoLIST> mantenimientos = new List<AccesoDatosMantenimientosPreventivos.MantenimientoRangoLIST>();

                if (!string.IsNullOrEmpty(resultHana.JsonResult) && resultHana.JsonResult != "[]")
                {
                    mantenimientos = JsonConvert.DeserializeObject<List<AccesoDatosMantenimientosPreventivos.MantenimientoRangoLIST>>(resultHana.JsonResult);
                }

                var pendientes = mantenimientos
                    .Where(m => m.FueReprogramado == "SI")
                    .ToList();
                // ✅ Total de registros (ya vienen filtrados desde HANA)
                int totalRegistrosFiltrados = mantenimientos.Count();

                // ✅ Aplicar solo la paginación (el filtrado ya lo hizo HANA)
                var mantenimientosPaginados = mantenimientos.Skip(OmitirRegistros).Take(CantidadRegistros).ToList();

                // ✅ RETORNAR formato DataTables
                var resultado = Json(new
                {
                    draw = NroPeticion,
                    recordsTotal = totalRegistrosFiltrados,
                    recordsFiltered = totalRegistrosFiltrados,
                    data = mantenimientosPaginados,
                    fechaInicio = dtFechaInicio.ToString("dd/MM/yyyy"),
                    fechaFin = dtFechaFin.ToString("dd/MM/yyyy")
                }, JsonRequestBehavior.AllowGet);

                resultado.MaxJsonLength = 2147483644;

                return resultado;
            }
            catch (Exception ex)
            {
                string MethodName = MethodBase.GetCurrentMethod().Name;
                string ControllerName = this.ControllerContext.RouteData.Values["controller"].ToString();
                string msg = $"No es posible obtener los mantenimientos en {MethodName} de {ControllerName}. Error: ";

                return Json(new
                {
                    draw = 0,
                    recordsTotal = 0,
                    recordsFiltered = 0,
                    data = new List<object>(),
                    error = msg + ex.Message
                }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpPost]
        public JsonResult InsertarMP()
        {
            var jsonResponse = new GlobalCommands.JsonResponseMtto();
            List<AccesoDatosMantenimientosCorrectivos.MantenimientoPreventivoGenerado> Equipos; // CAMBIO: Lista en lugar de objeto único
            try
            {
                // Leer el cuerpo de la solicitud JSON
                Request.InputStream.Position = 0;
                string OT = string.Empty;
                StringBuilder OTsinGenerar = new StringBuilder();

                using (var reader = new StreamReader(Request.InputStream))
                {
                    string jsonData = reader.ReadToEnd();
                    if (string.IsNullOrEmpty(jsonData))
                        throw new Exception("No se recibió información.");

                    // CAMBIO: Deserializar a LISTA de objetos
                    Equipos = JsonConvert.DeserializeObject<List<AccesoDatosMantenimientosCorrectivos.MantenimientoPreventivoGenerado>>(jsonData);

                    if (Equipos == null || Equipos.Count == 0)
                        throw new Exception("No se recibieron equipos válidos.");
                }

                int ordenesGeneradas = 0;

                // Ahora sí puedes iterar sobre los equipos
                foreach (var equipo in Equipos)
                {

                    // ✅ Convertir fechas de string a DateTime
                    DateTime fechaInicio = DateTime.ParseExact(
                        equipo.FechaInicioMantenimiento,
                        "dd/MM/yyyy",
                        CultureInfo.InvariantCulture
                    );

                    DateTime fechaFin = DateTime.ParseExact(
                        equipo.FechaFinMantenimiento,
                        "dd/MM/yyyy",
                        CultureInfo.InvariantCulture
                    );
                    // Crear objeto con las fechas convertidas
                    var parametrosEquipo = new
                    {
                        p_ID_EQUIPO = int.Parse(equipo.IdEquipo),
                        p_ID_PERIODICIDAD = int.Parse(equipo.IdPeriodicidad),
                        p_FECHA_INICIO_PERIODO = fechaInicio,
                        p_FECHA_FIN_PERIODO = fechaFin,
                        p_USUARIO = equipo.Usuario
                    };

                    // Convertir a parámetros HANA usando tu método existente
                    var allparameters = Logic.GlobalCommands.ConvertToHanaParameters(parametrosEquipo, false, null);

                    // Ejecutar stored procedure para insertar equipo
                    var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(Logic.AD.GCInsertarMP, allparameters);

                    // Obtener ID generado si existe
                    OT = resultHana.JsonResult;

                    if (OT.Contains("ERROR"))
                    {
                        OTsinGenerar.AppendLine($"Equipo {equipo.IdEquipo} - {equipo.NombreEquipo}");
                    }
                    else
                    {
                        ordenesGeneradas++;
                    }
                }

                // Construir respuesta JSON
                jsonResponse.Status = "SI";
                jsonResponse.Message = OTsinGenerar.Length == 0
                    ? $"{ordenesGeneradas} órdenes de trabajo generadas correctamente."
                    : $"{ordenesGeneradas} órdenes generadas. Algunas no pudieron ser procesadas:\n{OTsinGenerar.ToString()}, intente de nuevo más tarde.";
                jsonResponse.Data = OT; // o el dato que necesites retornar

                //NOTIFICAR EN LA WEB SOBRE ACTUALIZACIONES (SIGNAL R)
                string rolQueCambio = Request.Headers["X-Rol-Usuario"] ?? "Desconocido";
                var context = GlobalHost.ConnectionManager.GetHubContext<MantenimientoHub>();
                context.Clients.All.actualizarTablaMantenimientosPreventivos(rolQueCambio);

                return Json(jsonResponse);
            }
            catch (Exception ex)
            {
                jsonResponse.Status = "ERROR";
                jsonResponse.Message = "No fue posible generar las órdenes de trabajo: " + ex.Message;
                jsonResponse.Data = string.Empty;
                return Json(jsonResponse);
            }
        }

        [HttpPost]
        public JsonResult InsertarOrdenTrabajoMP()
        {
            var jsonResponse = new GlobalCommands.JsonResponseMtto();
            AccesoDatosMantenimientosPreventivos.OrdenTrabajoMPDTO datos;

            try
            {
                // ✅ Leer el cuerpo de la solicitud JSON
                Request.InputStream.Position = 0;

                using (var reader = new StreamReader(Request.InputStream))
                {
                    string jsonData = reader.ReadToEnd();

                    if (string.IsNullOrEmpty(jsonData))
                        throw new Exception("No se recibió información.");

                    // ✅ Deserializar a objeto OrdenTrabajoMPDTO
                    datos = JsonConvert.DeserializeObject<AccesoDatosMantenimientosPreventivos.OrdenTrabajoMPDTO>(jsonData);

                    if (datos == null)
                        throw new Exception("No se recibieron datos válidos.");
                }

                // 🔥 DETECTAR SI ES BORRADOR
                bool esBorrador = !string.IsNullOrEmpty(datos.TipoOperacion) && datos.TipoOperacion.ToUpper() == "BORRADOR";

                // 🔥 PROCESAR Y GUARDAR FIRMAS DIGITALES
                // Si es borrador: solo Realizo es obligatoria, Superviso y Mantenimiento son opcionales
                // Si no es borrador: todas son obligatorias

                bool rutaFirmaRealizo = GuardarFirmaDigital(
                    datos.FirmaRealizo,
                    datos.NumeroOrden,
                    "Realizo"
                );

                //Solo guardar la bandera
                datos.FirmaRealizo = rutaFirmaRealizo && datos.FirmaRealizo?.Length > 0 ? "SI" : "";

                bool rutaFirmaSuperviso = GuardarFirmaDigital(
                    datos.FirmaSuperviso,
                    datos.NumeroOrden,
                    "Superviso"
                );

                //Solo guardar la bandera
                datos.FirmaSuperviso = rutaFirmaSuperviso && datos.FirmaSuperviso?.Length > 0 ? "SI" : "";

                bool rutaFirmaMantenimiento = GuardarFirmaDigital(
                    datos.FirmaMantenimiento,
                    datos.NumeroOrden,
                    "Mantenimiento"
                );

                //Solo guardar la bandera
                datos.FirmaMantenimiento = rutaFirmaMantenimiento && datos.FirmaMantenimiento?.Length > 0 ? "SI" : "";

                // 🔥 VALIDACIÓN DE FIRMAS (todas obligatorias - como estaba)
                if (!rutaFirmaRealizo || !rutaFirmaSuperviso || !rutaFirmaMantenimiento)
                {
                    jsonResponse.Status = "NO";
                    jsonResponse.Message = $"No fue posible actualizar la solicitud, no fue posible guardar las firmas, intenta de nuevo más tarde.";
                    jsonResponse.Data = string.Empty;

                    return Json(jsonResponse, JsonRequestBehavior.AllowGet);
                }

                string[] excludedParams = null;
                // ✅ Convertir a parámetros HANA
                var allparameters = Logic.GlobalCommands.ConvertToHanaParameters(datos, true, null);
                excludedParams = new[]
                    {
                    "P_USUARIO",
                    "P_TIPOOPERACION"
                    };


                var parameters = allparameters
                    .Where(p => !excludedParams.Contains(p.Key))
                    .ToDictionary(p => p.Key, p => p.Value);
                // ✅ Ejecutar stored procedure
                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                    Logic.AD.GCInsertaOrdenTrabajoMP,
                    parameters
                );

                if (resultHana.JsonResult.ToUpper().Contains("ERROR"))
                {
                    // Construir respuesta JSON
                    jsonResponse.Status = "NO";
                    jsonResponse.Message = $"No fue posible actualizar la solicitud,intenta de nuevo más tarde.";
                    jsonResponse.Data = string.Empty;

                    return Json(jsonResponse, JsonRequestBehavior.AllowGet);
                }

                // 🔥 ACTUALIZAR ESTATUS SOLO SI NO ES BORRADOR
                if (!esBorrador)
                {
                    var parametrosFinOT = new
                    {
                        P_ID_MANTENIMIENTO = datos.IdMantenimiento,
                        P_ORDENTRABAJO = string.Empty,
                        P_ESTATUS = 4,
                        P_USUARIOACTUALIZA = datos.Solicitante
                    };

                    allparameters = Logic.GlobalCommands.ConvertToHanaParameters(parametrosFinOT, false, null);
                    var ActualizaOT = Logic.GlobalCommands.ExecuteProcedureHanaAuto(Logic.AD.GCActualizaMP, allparameters);
                }
                else
                {
                    // En borrador, solo logged
                    System.Diagnostics.Debug.WriteLine($"📝 Borrador guardado sin cambiar estatus para OT {datos.NumeroOrden}");
                }

                //NOTIFICAR EN LA WEB SOBRE ACTUALIZACIONES (SIGNAL R)
                string rolQueCambio = Request.Headers["X-Rol-Usuario"] ?? "Desconocido";
                var context = GlobalHost.ConnectionManager.GetHubContext<MantenimientoHub>();
                context.Clients.All.actualizarTablaMantenimientosPreventivos(rolQueCambio);

                // ✅ Verificar resultado
                if (!string.IsNullOrEmpty(resultHana.JsonResult) && resultHana.JsonResult != "[]")
                {
                    var resultado = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(resultHana.JsonResult);
                    var idOtDetalle = resultado[0]["ID_OT_DETALLE"].ToString();

                    string mensaje = esBorrador
                        ? "Borrador de orden de trabajo guardado correctamente"
                        : "Orden de trabajo guardada correctamente con firmas digitales";

                    jsonResponse.Status = "SI";
                    jsonResponse.Message = mensaje;
                    jsonResponse.Data = idOtDetalle;
                }
                else
                {
                    throw new Exception("Error al guardar la orden de trabajo en la base de datos");
                }

                return Json(jsonResponse, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                string MethodName = MethodBase.GetCurrentMethod().Name;
                string ControllerName = this.ControllerContext.RouteData.Values["controller"].ToString();

                jsonResponse.Status = "NO";
                jsonResponse.Message = $"No fue posible guardar la orden de trabajo en {MethodName} de {ControllerName}: {ex.Message}";
                jsonResponse.Data = string.Empty;

                return Json(jsonResponse, JsonRequestBehavior.AllowGet);
            }
        }

        // 🔥 MÉTODO HELPER PARA GUARDAR FIRMAS DIGITALES
        private bool GuardarFirmaDigital(string firmaBase64, string numeroOrden, string tipoFirma)
        {
            try
            {
                // Si no hay firma, retornar null
                if (string.IsNullOrEmpty(firmaBase64))
                    return true;

                // Remover el prefijo "data:image/png;base64," si existe
                string base64Clean = firmaBase64.Contains(",")
                    ? firmaBase64.Split(',')[1]
                    : firmaBase64;

                // Convertir de Base64 a bytes
                byte[] imageBytes = Convert.FromBase64String(base64Clean);

                // Limpiar el número de orden para usarlo como nombre de carpeta
                string ordenLimpia = numeroOrden.Replace("/", "_").Replace("\\", "_").Replace(":", "_");

                // Crear nombre del archivo con fecha
                string timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
                string nombreArchivo = $"Firma_{tipoFirma}.png";

                // Ruta de la carpeta
                string carpetaBase = Server.MapPath("~/FirmasOTPreventivo/");
                string carpetaOrden = Path.Combine(carpetaBase, ordenLimpia);

                // Crear directorios si no existen
                if (!Directory.Exists(carpetaBase))
                    Directory.CreateDirectory(carpetaBase);

                if (!Directory.Exists(carpetaOrden))
                    Directory.CreateDirectory(carpetaOrden);

                // Ruta completa del archivo
                string rutaCompleta = Path.Combine(carpetaOrden, nombreArchivo);

                if (System.IO.File.Exists(rutaCompleta))
                    System.IO.File.Delete(rutaCompleta);

                if (!System.IO.File.Exists(rutaCompleta))
                {
                    // 🔥 GUARDAR EL ARCHIVO (Esta es la línea correcta)
                    System.IO.File.WriteAllBytes(rutaCompleta, imageBytes);
                }

                // Retornar ruta relativa para guardar en BD
                string rutaRelativa = $"/FirmasOTPreventivo/{ordenLimpia}/{nombreArchivo}";

                return true;
            }
            catch (Exception ex)
            {
                // Log del error pero no detener el proceso
                System.Diagnostics.Debug.WriteLine($"Error al guardar firma {tipoFirma}: {ex.Message}");
                return false;
            }
        }

        [HttpPost]
        public JsonResult InsertarSolicitudRefaccion()
        {
            var jsonResponse = new GlobalCommands.JsonResponseMtto();
            AccesoDatosMantenimientosPreventivos.SolicitudRefaccionMultiple RequestData;

            try
            {
                // Leer el cuerpo de la solicitud JSON
                Request.InputStream.Position = 0;
                using (var reader = new StreamReader(Request.InputStream))
                {
                    string jsonData = reader.ReadToEnd();
                    if (string.IsNullOrEmpty(jsonData))
                        throw new Exception("No se recibió información.");

                    // Deserializar JSON al modelo con múltiples artículos
                    RequestData = JsonConvert.DeserializeObject<AccesoDatosMantenimientosPreventivos.SolicitudRefaccionMultiple>(jsonData);
                }

                if (RequestData.Articulos == null || RequestData.Articulos.Count == 0)
                    throw new Exception("No se recibieron artículos.");

                var insertados = 0;
                var errores = new List<string>();

                // ✅ Insertar cada artículo por separado
                foreach (var articulo in RequestData.Articulos)
                {
                    var solicitudIndividual = new AccesoDatosMantenimientosPreventivos.SolicitudRefaccion
                    {
                        OrdenTrabajo = RequestData.OrdenTrabajo,
                        IdEquipo = RequestData.IdEquipo,
                        RefaccionSolicitada = articulo.RefaccionSolicitada,
                        Cantidad = articulo.Cantidad,
                        NivelUrgencia = RequestData.NivelUrgencia,
                        DescripcionNecesidad = RequestData.DescripcionNecesidad,
                        UsuarioSolicita = RequestData.UsuarioSolicita,
                        Estatus = RequestData.Estatus,
                        IdMantenimiento = RequestData.IdMantenimiento,
                        Planta = RequestData.Planta,
                        Tipo = "1"
                    };


                    // Convertir modelo a parámetros HANA
                    var allparameters = Logic.GlobalCommands.ConvertToHanaParameters(solicitudIndividual, false, null);
                    var excludedParams = new[] { "Estatus", "IdMantenimiento" };
                    var parameters = allparameters
                        .Where(p => !excludedParams.Contains(p.Key))
                        .ToDictionary(p => p.Key, p => p.Value);

                    // Ejecutar stored procedure para insertar artículo
                    var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(Logic.AD.GCInsertarSolicitudRefaccion, parameters);

                    var nuevoId = resultHana.JsonResult;
                    if (!nuevoId.Contains("ERROR"))
                    {
                        insertados++;
                    }
                    else
                    {
                        errores.Add($"{articulo.RefaccionSolicitada}: {nuevoId}");
                    }
                }

                // ✅ Actualizar estatus del mantenimiento (solo una vez)
                var parametrosOT = new
                {
                    P_ID_MANTENIMIENTO = RequestData.IdMantenimiento,
                    ORDENTRABAJO = (string)null,
                    P_ESTATUS = RequestData.Estatus,
                    P_USUARIOACTUALIZA = RequestData.UsuarioSolicita
                };

                var allparametersOT = Logic.GlobalCommands.ConvertToHanaParameters(parametrosOT, false, null);
                var ActualizaOT = Logic.GlobalCommands.ExecuteProcedureHanaAuto(Logic.AD.GCActualizaMP, allparametersOT);

                // Construir respuesta
                if (errores.Count > 0 && insertados == 0)
                {
                    jsonResponse.Status = "NO";
                    jsonResponse.Message = "No fue posible insertar las solicitudes de refacción.";
                    jsonResponse.Data = string.Join(" | ", errores);
                }
                else if (errores.Count > 0)
                {
                    jsonResponse.Status = "PARCIAL";
                    jsonResponse.Message = $"{insertados} artículo(s) insertado(s), {errores.Count} con error.";
                    jsonResponse.Data = string.Join(" | ", errores);
                }
                else
                {
                    jsonResponse.Status = "SI";
                    jsonResponse.Message = $"Solicitud(es) de refacción insertada(s) correctamente. ({insertados} artículo(s))";
                    jsonResponse.Data = "";

                    //NOTIFICAR EN LA WEB SOBRE ACTUALIZACIONES (SIGNAL R)
                    string rolQueCambio = Request.Headers["X-Rol-Usuario"] ?? "Desconocido";
                    var context = GlobalHost.ConnectionManager.GetHubContext<MantenimientoHub>();
                    context.Clients.All.actualizarTablaMantenimientosPreventivos(rolQueCambio);
                    context.Clients.All.actualizarTablaSolicitudRefacciones(rolQueCambio);
                }

                return Json(jsonResponse);
            }
            catch (Exception ex)
            {
                jsonResponse.Status = "ERROR";
                jsonResponse.Message = "No fue posible insertar la solicitud de refacción: " + ex.Message;
                jsonResponse.Data = string.Empty;
                return Json(jsonResponse);
            }
        }

        [HttpGet]
        public JsonResult BuscarEmpleados(int? planta,string query, string posicion, string usuarioWeb, string tipoUsuario)
        {
            try
            {
                // ✅ Validar que venga el parámetro
                if (string.IsNullOrEmpty(query))
                {
                    return Json(new List<object>(), JsonRequestBehavior.AllowGet);
                }

                // ✅ Preparar parámetros para el SP
                var parameters = new Dictionary<string, (object value, ParameterDirection direction, HanaDbType type)>
                {
                    { "P_QUERY", (query, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_PLANTA", (planta, ParameterDirection.Input, HanaDbType.Integer) },
                    { "P_POSICION", (posicion, ParameterDirection.Input, HanaDbType.Integer) },
                    { "P_USUARIOWEB", (usuarioWeb, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_TIPOUSUARIO", (tipoUsuario, ParameterDirection.Input, HanaDbType.NVarChar) }
                };

                // ✅ Ejecutar el Stored Procedure
                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                    Logic.AD.GCBuscarEmpleados, // ⬅️ Nombre de tu SP
                    parameters
                );

                // ✅ Deserializar resultado
                List<AccesoDatosMantenimientosPreventivos.EmpleadoDTO> empleados = new List<AccesoDatosMantenimientosPreventivos.EmpleadoDTO>();

                if (!string.IsNullOrEmpty(resultHana.JsonResult) && resultHana.JsonResult != "[]")
                {
                    empleados = JsonConvert.DeserializeObject<List<AccesoDatosMantenimientosPreventivos.EmpleadoDTO>>(resultHana.JsonResult);
                }

                // ✅ Retornar JSON
                return Json(empleados, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                string MethodName = MethodBase.GetCurrentMethod().Name;
                string ControllerName = this.ControllerContext.RouteData.Values["controller"].ToString();
                string msg = $"Error al buscar empleados en {MethodName} de {ControllerName}. Error: {ex.Message}";

                // ✅ Log del error (si tienes sistema de logs)
                // Logger.Error(msg);

                // ✅ Retornar lista vacía en caso de error
                return Json(new List<object>(), JsonRequestBehavior.AllowGet);
            }
        }

        [HttpGet]
        public JsonResult ObtenerActividadesPorOTMP(string numeroOrden, DateTime? fechaInicio = null, DateTime? fechaFin = null)
        {
            try
            {
                // ✅ Validación mínima
                if (string.IsNullOrEmpty(numeroOrden))
                {
                    return Json(new List<object>(), JsonRequestBehavior.AllowGet);
                }

                // ✅ Parámetros del SP
                var parameters = new Dictionary<string, (object value, ParameterDirection direction, HanaDbType type)>
                {
                    { "P_NUMERO_ORDEN", (numeroOrden, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_FECHA_INICIO", (fechaInicio ?? (object)DBNull.Value, ParameterDirection.Input, HanaDbType.TimeStamp) },
                    { "P_FECHA_FIN", (fechaFin ?? (object)DBNull.Value, ParameterDirection.Input, HanaDbType.TimeStamp) }
                };

                // ✅ Ejecutar SP
                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                    Logic.AD.GCObtenerActividadesPorOTMP, // 👈 constante con el nombre del SP
                    parameters
                );

                // ✅ Deserializar
                List<AccesoDatosMantenimientosPreventivos.ActividadPorOTDTO> actividades =
                    new List<AccesoDatosMantenimientosPreventivos.ActividadPorOTDTO>();

                if (!string.IsNullOrEmpty(resultHana.JsonResult) && resultHana.JsonResult != "[]")
                {
                    actividades = JsonConvert.DeserializeObject<List<AccesoDatosMantenimientosPreventivos.ActividadPorOTDTO>>(resultHana.JsonResult);
                }

                // ✅ Return limpio
                return Json(actividades, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                string MethodName = MethodBase.GetCurrentMethod().Name;
                string ControllerName = this.ControllerContext.RouteData.Values["controller"].ToString();
                string msg = $"Error al obtener actividades por OT en {MethodName} de {ControllerName}. Error: {ex.Message}";

                // Logger.Error(msg);

                return Json(new List<object>(), JsonRequestBehavior.AllowGet);
            }
        }

        [HttpPost]
        public JsonResult GuardarRutina()
        {
            var jsonResponse = new GlobalCommands.JsonResponseMtto();
            try
            {
                // Obtener datos básicos
                var idMantenimiento = Request.Form["idMantenimiento"];
                var idEquipo = Request.Form["idEquipo"];
                var comentarios = Request.Form["comentarios"];
                var usuarioRegistro = Request.Form["usuarioRegistro"]; // Asegúrate de enviarlo desde el front
                var IdOtDetalle = Request.Form["OrdenTrabajo"]; // Asegúrate de enviarlo desde el front
                var Planta = Request.Form["Planta"]; // Asegúrate de enviarlo desde el front
                var actividadesJson = Request.Form["actividades"];

                // Validar datos básicos
                if (string.IsNullOrEmpty(idMantenimiento) || string.IsNullOrEmpty(actividadesJson))
                {
                    throw new Exception("Faltan datos obligatorios (idMantenimiento o actividades).");
                }

                // 🔥 OBTENER Y GUARDAR LAS IMÁGENES (solo en servidor, no en BD)
                var imagenes = Request.Files;
                List<string> rutasImagenes = new List<string>();

                if (imagenes.Count > 0)
                {
                    // Crear carpeta si no existe
                    string carpetaDestino = Server.MapPath($"~/EvidenciaRutinas/{Planta}/{IdOtDetalle}");
                    if (!Directory.Exists(carpetaDestino))
                    {
                        Directory.CreateDirectory(carpetaDestino);
                    }

                    // Guardar cada imagen
                    for (int i = 0; i < imagenes.Count; i++)
                    {
                        var archivo = imagenes[i];
                        if (archivo != null && archivo.ContentLength > 0)
                        {
                            string nombreArchivo = $"{Path.GetFileName(archivo.FileName)}";
                            string rutaCompleta = Path.Combine(carpetaDestino, nombreArchivo);
                            archivo.SaveAs(rutaCompleta);
                            rutasImagenes.Add($"/EvidenciaRutinas/{Planta}/{IdOtDetalle}/{nombreArchivo}");
                        }
                    }
                }

                // 🔥 PREPARAR PARÁMETROS PARA BASE DE DATOS
                var parametrosRutina = new
                {
                    P_ID_MANTENIMIENTO = idMantenimiento,
                    P_ID_EQUIPO = idEquipo,
                    P_COMENTARIOS = comentarios,
                    P_USUARIO_REGISTRO = usuarioRegistro,
                    P_ID_OT_DETALLE = IdOtDetalle,
                    P_ACTIVIDADES_JSON = actividadesJson
                };

                // Convertir a parámetros HANA
                var allparameters = Logic.GlobalCommands.ConvertToHanaParameters(parametrosRutina, false, null);

                // 🔥 EJECUTAR STORED PROCEDURE
                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                    Logic.AD.GCGuardarRutinaMP, // Nombre de tu constante para el SP
                    allparameters
                );

                //Validar si ya se completo la CARATULA Y LA RUTINA ONLINE
                var parametrosMantenimeinto = new
                {
                    P_ID_MANTENIMIENTO = idMantenimiento
                };

                allparameters = Logic.GlobalCommands.ConvertToHanaParameters(parametrosMantenimeinto, false, null);

                // ✅ Ejecutar stored procedure
                var CaratulaRutinaCompleta = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                    Logic.AD.GCValidarOTFinalizada,
                    allparameters
                );


                //Si ya esta finalizada en conjunto con la rutina online actualizar estatus de mantenimiento
                JArray CARRUT = JArray.Parse(CaratulaRutinaCompleta.JsonResult);
                string OT = CARRUT[0]["ORDEN_TRABAJO_FINALIZADA"].ToString();
                string RUTINA = CARRUT[0]["RUTINA_COMPLETADA"].ToString();

                if (OT == "SI" && RUTINA == "SI")
                {

                    // Crear objeto con las fechas convertidas
                    var parametrosFinOT = new
                    {
                        P_ID_MANTENIMIENTO = idMantenimiento,
                        P_ESTATUS = 4,
                        P_USUARIO_ACTUALIZA = usuarioRegistro
                    };

                    // Convertir a parámetros HANA usando tu método existente
                    allparameters = Logic.GlobalCommands.ConvertToHanaParameters(parametrosFinOT, false, null);
                    //Actualizar estatus de OT
                    var ActualizaOT = Logic.GlobalCommands.ExecuteProcedureHanaAuto(Logic.AD.GCActualizaMP, allparameters);
                }


                // Construir respuesta JSON
                jsonResponse.Status = resultHana.JsonResult.Contains("ERROR") ? "NO" : "SI";
                jsonResponse.Message = resultHana.JsonResult.Contains("ERROR")
                    ? "No fue posible guardar la rutina."
                    : $"Rutina guardada correctamente. {rutasImagenes.Count} imagen(es) guardada(s).";
                jsonResponse.Data = string.Empty;

                return Json(jsonResponse);
            }
            catch (Exception ex)
            {
                jsonResponse.Status = "ERROR";
                jsonResponse.Message = "No fue posible guardar la rutina: " + ex.Message;
                jsonResponse.Data = string.Empty;
                return Json(jsonResponse);
            }
        }

        // 🔥 NUEVO: Método para guardar rutina en BORRADOR (validación relajada)
        [HttpPost]
        public JsonResult GuardarRutinaBorrador()
        {
            var jsonResponse = new GlobalCommands.JsonResponseMtto();
            try
            {
                // Obtener datos básicos
                var idMantenimiento = Request.Form["idMantenimiento"];
                var idEquipo = Request.Form["idEquipo"];
                var comentarios = Request.Form["comentarios"];
                var usuarioRegistro = Request.Form["usuarioRegistro"];
                var IdOtDetalle = Request.Form["OrdenTrabajo"];
                var Planta = Request.Form["Planta"];
                var actividadesJson = Request.Form["actividades"];
                var esBorrador = Request.Form["esBorrador"]; // 🔥 Flag para indicar borrador
                var imagenesEliminadasJson = Request.Form["imagenesEliminadas"]; // 🔥 NUEVO: Lista de imágenes eliminadas

                // Validar datos básicos (menos estricto que GuardarRutina)
                if (string.IsNullOrEmpty(idMantenimiento) || string.IsNullOrEmpty(actividadesJson))
                {
                    throw new Exception("Faltan datos obligatorios (idMantenimiento o actividades).");
                }

                // 🔥 PROCESAR IMÁGENES ELIMINADAS (borrar archivos físicos)
                int imagenesEliminadasCount = 0;
                if (!string.IsNullOrEmpty(imagenesEliminadasJson))
                {
                    try
                    {
                        var imagenesEliminadas = JsonConvert.DeserializeObject<List<string>>(imagenesEliminadasJson);
                        if (imagenesEliminadas != null && imagenesEliminadas.Count > 0)
                        {
                            foreach (var urlEliminada in imagenesEliminadas)
                            {
                                // Convertir URL a ruta física
                                // Ej: /EvidenciaRutinas/PLANTA/OT/imagen.jpg → C:\...\EvidenciaRutinas\PLANTA\OT\imagen.jpg
                                string rutaFisica = Server.MapPath($"~{urlEliminada}");

                                if (System.IO.File.Exists(rutaFisica))
                                {
                                    System.IO.File.Delete(rutaFisica);
                                    imagenesEliminadasCount++;
                                    System.Diagnostics.Debug.WriteLine($"✅ Imagen eliminada: {rutaFisica}");
                                }
                            }
                        }
                    }
                    catch (Exception exDelete)
                    {
                        // No fallar si hay error al eliminar - solo loguear
                        System.Diagnostics.Debug.WriteLine($"⚠️ Error al eliminar imágenes: {exDelete.Message}");
                    }
                }

                // 🔥 OBTENER Y GUARDAR LAS IMÁGENES NUEVAS (solo en servidor, no en BD)
                var imagenes = Request.Files;
                List<string> rutasImagenes = new List<string>();

                if (imagenes.Count > 0)
                {
                    // Crear carpeta si no existe
                    string carpetaDestino = Server.MapPath($"~/EvidenciaRutinas/{Planta}/{IdOtDetalle}");
                    if (!Directory.Exists(carpetaDestino))
                    {
                        Directory.CreateDirectory(carpetaDestino);
                    }

                    // Guardar cada imagen
                    for (int i = 0; i < imagenes.Count; i++)
                    {
                        var archivo = imagenes[i];
                        if (archivo != null && archivo.ContentLength > 0)
                        {
                            string nombreArchivo = $"{Path.GetFileName(archivo.FileName)}";
                            string rutaCompleta = Path.Combine(carpetaDestino, nombreArchivo);
                            archivo.SaveAs(rutaCompleta);
                            rutasImagenes.Add($"/EvidenciaRutinas/{Planta}/{IdOtDetalle}/{nombreArchivo}");
                        }
                    }
                }

                // 🔥 PREPARAR PARÁMETROS PARA BASE DE DATOS (con flag de borrador)
                var parametrosRutina = new
                {
                    P_ID_MANTENIMIENTO = idMantenimiento,
                    P_ID_EQUIPO = idEquipo,
                    P_COMENTARIOS = comentarios,
                    P_USUARIO_REGISTRO = usuarioRegistro,
                    P_ID_OT_DETALLE = IdOtDetalle,
                    P_ACTIVIDADES_JSON = actividadesJson
                };

                // Convertir a parámetros HANA
                var allparameters = Logic.GlobalCommands.ConvertToHanaParameters(parametrosRutina, false, null);

                // 🔥 EJECUTAR STORED PROCEDURE PARA BORRADOR (usamos el mismo SP existente)
                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                    Logic.AD.GCGuardarRutinaMP, // 🔥 Mismo SP, el parámetro P_ES_BORRADOR lo maneja
                    allparameters
                );

                // Construir respuesta JSON
                jsonResponse.Status = resultHana.JsonResult.Contains("ERROR") ? "NO" : "SI";
                jsonResponse.Message = resultHana.JsonResult.Contains("ERROR")
                    ? "No fue posible guardar el borrador de la rutina."
                    : $"Borrador de rutina guardado correctamente. {rutasImagenes.Count} imagen(es) nueva(s) guardada(s). {imagenesEliminadasCount} imagen(es) eliminada(s).";
                jsonResponse.Data = string.Empty;

                return Json(jsonResponse);
            }
            catch (Exception ex)
            {
                jsonResponse.Status = "ERROR";
                jsonResponse.Message = "No fue posible guardar el borrador de la rutina: " + ex.Message;
                jsonResponse.Data = string.Empty;
                return Json(jsonResponse);
            }
        }

        [HttpPost]
        public JsonResult SolicitarReprogramacion()
        {
            var jsonResponse = new GlobalCommands.JsonResponseMtto();

            try
            {
                // Leer el cuerpo de la solicitud JSON
                Request.InputStream.Position = 0;

                using (var reader = new StreamReader(Request.InputStream))
                {
                    string jsonData = reader.ReadToEnd();
                    if (string.IsNullOrEmpty(jsonData))
                        throw new Exception("No se recibió información.");

                    // Deserializar datos de reprogramación usando DTO
                    var datos = JsonConvert.DeserializeObject<AccesoDatosMantenimientosPreventivos.SolicitarReprogramacionDTO>(jsonData);

                    // Validar campos requeridos
                    if (datos == null || 
                        datos.IdEquipo <= 0 ||
                        string.IsNullOrEmpty(datos.FechaActualInicio) ||
                        string.IsNullOrEmpty(datos.FechaActualFin) ||
                        string.IsNullOrEmpty(datos.Motivo) ||
                        string.IsNullOrEmpty(datos.UsuarioSolicita) ||
                        datos.IdPeriodicidad <= 0 ||
                        !datos.Planta.HasValue || datos.Planta <= 0)
                    {
                        throw new Exception("Por favor, complete correctamente todos los campos requeridos.");
                    }

                    // Convertir fechas
                    DateTime fechaInicio;
                    DateTime fechaFin;

                    if (!DateTime.TryParse(datos.FechaActualInicio, out fechaInicio))
                        throw new Exception("Formato de fecha de inicio inválido.");

                    if (!DateTime.TryParse(datos.FechaActualFin, out fechaFin))
                        throw new Exception("Formato de fecha de fin inválido.");

                    if (fechaInicio >= fechaFin)
                        throw new Exception("La fecha de inicio no puede ser mayor o igual a la fecha de fin.");

                    // Construir parámetros para el stored procedure
                    var parametros = new
                    {
                        p_ID_SOLIICTUD = datos.IdSolicitud,
                        p_ID_EQUIPO = datos.IdEquipo,
                        p_NUMERO_ORDEN = string.IsNullOrEmpty(datos.NumeroOrden) ? (object)DBNull.Value : datos.NumeroOrden,
                        p_MOTIVO = datos.Motivo,
                        p_USUARIO_SOLICITA = datos.UsuarioSolicita,
                        p_ID_PERIODICIDAD = datos.IdPeriodicidad,
                        p_PLANTA = datos.Planta.Value,
                        p_ESTATUS = "Creada"
                    };

                    // Convertir a parámetros HANA
                    var hanaParameters = Logic.GlobalCommands.ConvertToHanaParameters(parametros, false, null);

                    // Ejecutar stored procedure
                    var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                        Logic.AD.GCSolicitarReprogramacion,
                        hanaParameters
                    );

                    // Evaluar resultado deserializando la respuesta JSON del stored
                    if (resultHana.JsonResult != null && !string.IsNullOrEmpty(resultHana.JsonResult))
                    {
                        try
                        {
                            // Parsear como JArray ya que viene en formato: [{"ID_SOLICITUD":3,"ESTATUS":"SI"}]
                            var jsonArray = JArray.Parse(resultHana.JsonResult);

                            if (jsonArray != null && jsonArray.Count > 0)
                            {
                                var firstItem = jsonArray[0];
                                string estatus = firstItem["ESTATUS_ACTUAL"]?.ToString();
                                int idSolicitud = Convert.ToInt32(firstItem["ID_SOLICITUD"]?.ToString() ?? "0");

                                if (estatus == "SI" || estatus == "Pendiente")
                                {
                                    jsonResponse.Status = "SI";
                                    jsonResponse.Message = $"Solicitud de reprogramación registrada correctamente. ID: {idSolicitud}";
                                    jsonResponse.Data = idSolicitud.ToString();

                                    // Notificar cambios en tiempo real (SignalR)
                                    string rolQueCambio = Request.Headers["X-Rol-Usuario"] ?? "Desconocido";
                                    var context = GlobalHost.ConnectionManager.GetHubContext<MantenimientoHub>();
                                    context.Clients.All.actualizarTablaMantenimientosPreventivos(rolQueCambio);
                                }
                                else
                                {
                                    jsonResponse.Status = "NO";
                                    jsonResponse.Message = "No fue posible registrar la solicitud de reprogramación.";
                                    jsonResponse.Data = string.Empty;
                                }
                            }
                            else
                            {
                                jsonResponse.Status = "NO";
                                jsonResponse.Message = "No se recibieron datos de la solicitud.";
                                jsonResponse.Data = string.Empty;
                            }
                        }
                        catch (Exception exJson)
                        {
                            jsonResponse.Status = "NO";
                            jsonResponse.Message = $"Error al procesar la respuesta del servidor: {exJson.Message}";
                            jsonResponse.Data = string.Empty;
                        }
                    }
                    else
                    {
                        jsonResponse.Status = "NO";
                        jsonResponse.Message = "No se obtuvo respuesta del servidor.";
                        jsonResponse.Data = string.Empty;
                    }
                }

                return Json(jsonResponse);
            }
            catch (Exception ex)
            {
                jsonResponse.Status = "ERROR";
                jsonResponse.Message = "Error al procesar la solicitud de reprogramación: " + ex.Message;
                jsonResponse.Data = string.Empty;
                return Json(jsonResponse);
            }
        }

        [HttpPost]
        public JsonResult AceptarReprogramacion()
        {
            var jsonResponse = new GlobalCommands.JsonResponseMtto();

            try
            {
                Request.InputStream.Position = 0;

                using (var reader = new StreamReader(Request.InputStream))
                {
                    string jsonData = reader.ReadToEnd();
                    if (string.IsNullOrEmpty(jsonData))
                        throw new Exception("No se recibió información.");

                    var datos = JsonConvert.DeserializeObject<AccesoDatosMantenimientosPreventivos.AceptarReprogramacionDTO>(jsonData);

                    if (datos == null ||
                        datos.IdSolicitudPendiente <= 0 ||
                        string.IsNullOrEmpty(datos.UsuarioAcepta) ||
                        string.IsNullOrEmpty(datos.Accion))
                    {
                        throw new Exception("Por favor, complete correctamente todos los campos requeridos.");
                    }

                    if (datos.Accion != "ACEPTAR" && datos.Accion != "RECHAZAR")
                        throw new Exception("Acción no válida. Debe ser 'ACEPTAR' o 'RECHAZAR'.");

                    string nuevoEstatus = datos.Accion == "ACEPTAR" ? "Aceptada" : "Rechazada";

                    // ✅ Solo mandamos lo necesario para resolver: ID_SOLICITUD + ESTATUS.
                    // El resto va en null para que el MERGE no toque esos campos.
                    var parametros = new
                    {
                        p_ID_SOLICITUD = datos.IdSolicitudPendiente,
                        p_ID_EQUIPO = (int?)null,
                        p_NUMERO_ORDEN = (string)null,
                        p_MOTIVO = (string)null,
                        p_USUARIO_SOLICITA = (string)null,
                        p_ID_PERIODICIDAD = (int?)null,
                        p_PLANTA = (int?)null,
                        p_ESTATUS = nuevoEstatus
                    };

                    var hanaParameters = Logic.GlobalCommands.ConvertToHanaParameters(parametros, false, null);

                    var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                        Logic.AD.GCSolicitarReprogramacion,   // ✅ mismo stored que usas para crear/editar
                        hanaParameters
                    );

                    if (resultHana.JsonResult != null && !string.IsNullOrEmpty(resultHana.JsonResult))
                    {
                        try
                        {
                            var jsonArray = JArray.Parse(resultHana.JsonResult);

                            if (jsonArray != null && jsonArray.Count > 0)
                            {
                                var firstItem = jsonArray[0];
                                string estatusActual = firstItem["ESTATUS_ACTUAL"]?.ToString();

                                // ✅ Validamos que el estatus en BD realmente quedó como lo pedimos.
                                // Si ya estaba resuelta (Aceptada/Rechazada previamente), el MERGE no la tocó
                                // y ESTATUS_ACTUAL no va a coincidir con nuevoEstatus.
                                if (estatusActual == nuevoEstatus)
                                {
                                    jsonResponse.Status = "SI";
                                    jsonResponse.Message = datos.Accion == "ACEPTAR"
                                        ? "Reprogramación aceptada correctamente."
                                        : "Reprogramación rechazada correctamente.";
                                    jsonResponse.Data = string.Empty;

                                    string rolQueCambio = Request.Headers["X-Rol-Usuario"] ?? "Desconocido";
                                    var context = GlobalHost.ConnectionManager.GetHubContext<MantenimientoHub>();
                                    context.Clients.All.actualizarTablaMantenimientosPreventivos(rolQueCambio);
                                }
                                else
                                {
                                    jsonResponse.Status = "NO";
                                    jsonResponse.Message = "No fue posible procesar la solicitud. Es posible que ya haya sido resuelta previamente.";
                                    jsonResponse.Data = string.Empty;
                                }
                            }
                            else
                            {
                                jsonResponse.Status = "NO";
                                jsonResponse.Message = "No se recibieron datos de la respuesta.";
                                jsonResponse.Data = string.Empty;
                            }
                        }
                        catch (Exception exJson)
                        {
                            jsonResponse.Status = "NO";
                            jsonResponse.Message = $"Error al procesar la respuesta del servidor: {exJson.Message}";
                            jsonResponse.Data = string.Empty;
                        }
                    }
                    else
                    {
                        jsonResponse.Status = "NO";
                        jsonResponse.Message = "No se obtuvo respuesta del servidor.";
                        jsonResponse.Data = string.Empty;
                    }
                }

                return Json(jsonResponse);
            }
            catch (Exception ex)
            {
                jsonResponse.Status = "ERROR";
                jsonResponse.Message = "Error al procesar la solicitud de aceptación/rechazo: " + ex.Message;
                jsonResponse.Data = string.Empty;
                return Json(jsonResponse);
            }
        }

        // 🔥 NUEVO: 
        #endregion
    }
}