using MantenimientosPTM.Hubs;
using Microsoft.AspNet.SignalR;
using Newtonsoft.Json;
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
using static MantenimientosPTM.AccesoDatosEquipos;

namespace MantenimientosPTM.Controllers
{
    public class MantenimientosCorrectivosController : Controller
    {

        readonly LogicaMantenimientosCorrectivos Logic = new LogicaMantenimientosCorrectivos();

        // GET: MantCorrectivo

        #region Views
        public ActionResult PROGMC()
        {
            return View();
        }
        public ActionResult MantenimientoCorrectivo()
        {
            return View();
        }
        #endregion

        #region Endpoints
        [HttpPost]
        public JsonResult InsertarSolicitudMC()
        {
            var jsonResponse = new GlobalCommands.JsonResponseMtto();
            AccesoDatosMantenimientosCorrectivos.SolicitudMantenimientoMC RequestData;

            try
            {
                // Leer el cuerpo de la solicitud JSON
                Request.InputStream.Position = 0;
                using (var reader = new StreamReader(Request.InputStream))
                {
                    string jsonData = reader.ReadToEnd();
                    if (string.IsNullOrEmpty(jsonData))
                        throw new Exception("No se recibió información.");

                    // Deserializar JSON al modelo EquipoMTTO
                    RequestData = JsonConvert.DeserializeObject<AccesoDatosMantenimientosCorrectivos.SolicitudMantenimientoMC>(jsonData);
                }

                if (RequestData == null)
                    throw new Exception("No se recibieron datos válidos.");

                // Convertir modelo a parámetros HANA
                var allparameters = Logic.GlobalCommands.ConvertToHanaParameters(RequestData, false, null);
                var excludedParams = new[] { "IdSolicitud", "FechaCreacion", "ClaseMantenimiento", "FechaActualizacion" };
                var parameters = allparameters
                    .Where(p => !excludedParams.Contains(p.Key))
                    .ToDictionary(p => p.Key, p => p.Value);
                // Ejecutar stored procedure para insertar equipo
                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(Logic.AD.GCInsertarSolicitudMC, parameters);

                // Obtener ID generado si existe
                var nuevoId = resultHana == null ? string.Empty : (resultHana.JsonResult ?? string.Empty);
                bool tuvoError = nuevoId.IndexOf("ERROR", StringComparison.OrdinalIgnoreCase) >= 0;

                // Construir respuesta JSON
                jsonResponse.Status = tuvoError ? "NO" : "SI";
                jsonResponse.Message = tuvoError ? "No fue posible insertar la solicitud de mantenimiento correctivo." : "Solicitud de mantenimiento correctivo insertada correctamente.";
                jsonResponse.Data = nuevoId;

                //NOTIFICAR EN LA WEB SOBRE ACTUALIZACIONES (SIGNAL R)
                if (jsonResponse.Status == "SI")
                {
                    string rolQueCambio = Request.Headers["X-Rol-Usuario"] ?? "Desconocido";
                    var context = GlobalHost.ConnectionManager.GetHubContext<MantenimientoHub>();
                    context.Clients.All.actualizarTablaMantenimientosCorrectivos(rolQueCambio);
                    context.Clients.All.actualizarCalendarioMantenimientos();
                    context.Clients.All.actualizarTablaParos(rolQueCambio);
                }

                return Json(jsonResponse);
            }
            catch (Exception ex)
            {
                jsonResponse.Status = "ERROR";
                jsonResponse.Message = "No fue posible insertar la solicitud de mantenimiento correctivo: " + ex.Message;
                jsonResponse.Data = string.Empty;

                return Json(jsonResponse);
            }
        }

        [HttpPost]
        public JsonResult GetMantenimientosCorrectivosPendientes()
        {
            try
            {
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
                string FiltroIDSolicitud = Request.Form["FiltroSolicitud"];
                string FiltroFechaInicio = Request.Form["FiltroFechaInicio"];
                string FiltroFechaFin = Request.Form["FiltroFechaFin"];
                string FiltroArea = Request.Form["FiltroArea"];
                string FiltroLinea = Request.Form["FiltroLinea"];
                string FiltroOrdenTrabajo = Request.Form["FiltroOrdenTrabajo"];
                string FiltroPlanta = Request.Form["FiltroPlanta"];
                string FiltroEstatusOT = Request.Form["FiltroEstatusOT"];
                string FiltroExcluirSincronizadosPVC = Request.Form["FiltroExcluirSincronizadosPVC"];
                string FiltroExcluirSincronizadosPEADLISO = Request.Form["FiltroExcluirSincronizadosPEADLISO"];
                string FiltroExcluirSincronizadosPEADCORR = Request.Form["FiltroExcluirSincronizadosPEADCORR"];
                string FiltroExcluirSincronizadosINY = Request.Form["FiltroExcluirSincronizadosINY"];
                string FiltroPosicionId = Request.Form["FiltroPosicionId"];
                string FiltroClasificacion = Request.Form["FiltroClasificacion"];
                string FiltroNombreEquipo = Request.Form["FiltroNombreEquipo"];

                // Leer desde config las restricciones a las posiciones que se le aplicara
                string IdsHerr = System.Configuration.ConfigurationManager.AppSettings["PosicionesHerr"];
                string IdsMtto = System.Configuration.ConfigurationManager.AppSettings["PosicionesMtto"];


                bool hayFiltroAdicional =
                    !string.IsNullOrWhiteSpace(FiltroArea) ||
                    !string.IsNullOrWhiteSpace(FiltroLinea) ||
                    !string.IsNullOrWhiteSpace(FiltroOrdenTrabajo);

                // ✅ Detectar si viene de Bitácora (algún filtro de exclusión activo)
                bool esDesdeBitacora =
                    FiltroExcluirSincronizadosPVC == "S" ||
                    FiltroExcluirSincronizadosPEADLISO == "S" ||
                    FiltroExcluirSincronizadosPEADCORR == "S" ||
                    FiltroExcluirSincronizadosINY == "S";

                // ✅ Fechas: se parsean de forma independiente. Si solo viene una,
                // se completa el rango con el mes de la fecha enviada.
                DateTime dtFechaInicio = default(DateTime);
                DateTime dtFechaFin = default(DateTime);

                bool hayFechaInicio = !string.IsNullOrWhiteSpace(FiltroFechaInicio);
                bool hayFechaFin = !string.IsNullOrWhiteSpace(FiltroFechaFin);
                bool hayFechas = hayFechaInicio || hayFechaFin;

                if (hayFechas)
                {
                    if (hayFechaInicio && !TryParseFecha(FiltroFechaInicio, out dtFechaInicio))
                        throw new Exception("La fecha de inicio no es válida. Use el formato AAAA-MM-DD.");

                    if (hayFechaFin && !TryParseFecha(FiltroFechaFin, out dtFechaFin))
                        throw new Exception("La fecha de fin no es válida. Use el formato AAAA-MM-DD.");

                    if (hayFechaInicio && !hayFechaFin)
                        dtFechaFin = new DateTime(dtFechaInicio.Year, dtFechaInicio.Month, 1).AddMonths(1).AddDays(-1);
                    else if (!hayFechaInicio && hayFechaFin)
                        dtFechaInicio = new DateTime(dtFechaFin.Year, dtFechaFin.Month, 1);

                    if (dtFechaInicio > dtFechaFin)
                        throw new Exception("La fecha de inicio no puede ser mayor que la fecha de fin.");
                }
                else
                {
                    DateTime hoy = DateTime.Now;
                    dtFechaInicio = new DateTime(hoy.Year, hoy.Month, 1); // ✅ Primer día del mes actual
                    dtFechaFin = dtFechaInicio.AddMonths(1).AddDays(-1); // ✅ Último día del mes actual
                }

                // ✅ Se envían fechas al SP cuando el usuario las capturó, cuando no hay
                // filtro adicional o cuando viene de Bitácora. Si no hay fechas y hay
                // filtro adicional se mantiene la búsqueda en todo el historial.
                bool enviarFechas = hayFechas || !hayFiltroAdicional || esDesdeBitacora;

                //=================================OBTENER DATOS===========================//
                // ✅ TODOS LOS FILTROS SE ENVÍAN A HANA
                var parameters = new Dictionary<string, (object value, ParameterDirection direction, HanaDbType type)>
                {
                    { "P_ID_SOLICITUD", (string.IsNullOrEmpty(FiltroIDSolicitud) ? (object)null : FiltroIDSolicitud, ParameterDirection.Input, HanaDbType.Integer) },
                    { "P_FECHA_INICIO", (enviarFechas ? (object)dtFechaInicio : null, ParameterDirection.Input, HanaDbType.Date) },
                    { "P_FECHA_FIN", (enviarFechas ? (object)dtFechaFin : null, ParameterDirection.Input, HanaDbType.Date) },
                    { "P_FILTRO_AREA", (string.IsNullOrEmpty(FiltroArea) ? (object)null : FiltroArea, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_FILTRO_LINEA", (string.IsNullOrEmpty(FiltroLinea) ? (object)null : FiltroLinea, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_FILTRO_ORDEN", (string.IsNullOrEmpty(FiltroOrdenTrabajo) ? (object)null : FiltroOrdenTrabajo, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_FILTRO_PLANTA", (string.IsNullOrEmpty(FiltroPlanta) ? (object)null : FiltroPlanta, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_FILTRO_ESTATUS", (string.IsNullOrEmpty(FiltroEstatusOT) ? (object)null : FiltroEstatusOT, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_FILTRO_BUSQUEDA", (string.IsNullOrEmpty(FiltroBusqueda) ? (object)null : FiltroBusqueda, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_EXCLUIR_SINCRONIZADOS_PVC", (string.IsNullOrEmpty(FiltroExcluirSincronizadosPVC) ? (object)null : FiltroExcluirSincronizadosPVC, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_EXCLUIR_SINCRONIZADOS_PEADLISO", (string.IsNullOrEmpty(FiltroExcluirSincronizadosPEADLISO) ? (object)null : FiltroExcluirSincronizadosPEADLISO, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_EXCLUIR_SINCRONIZADOS_CORRUGADO", (string.IsNullOrEmpty(FiltroExcluirSincronizadosPEADCORR) ? (object)null : FiltroExcluirSincronizadosPEADCORR, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_EXCLUIR_SINCRONIZADOS_INYECCION", (string.IsNullOrEmpty(FiltroExcluirSincronizadosINY) ? (object)null : FiltroExcluirSincronizadosINY, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_FILTRO_POSICION_ID", (string.IsNullOrEmpty(FiltroPosicionId) ? (object)null : FiltroPosicionId, ParameterDirection.Input, HanaDbType.Integer) },
                    { "P_IDS_HERR", (string.IsNullOrEmpty(IdsHerr) ? (object)null : IdsHerr, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_IDS_MTTO", (string.IsNullOrEmpty(IdsMtto) ? (object)null : IdsMtto, ParameterDirection.Input, HanaDbType.NVarChar) },

                    // ✅ Solo se manda 1 si viene de Bitácora, null en caso contrario
                    { "P_LINEA_PROD", (esDesdeBitacora ? (object)1 : null, ParameterDirection.Input, HanaDbType.Integer) },
                    // Filtros nuevos (al final para respetar el orden de parametros del SP)
                    { "P_FILTRO_CLASIFICACION", (string.IsNullOrEmpty(FiltroClasificacion) ? (object)null : FiltroClasificacion, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_FILTRO_EQUIPO", (string.IsNullOrEmpty(FiltroNombreEquipo) ? (object)null : FiltroNombreEquipo, ParameterDirection.Input, HanaDbType.NVarChar) }
                };

                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                    Logic.AD.GCObtenerMantenimientosCorrectivos,
                    parameters
                );

                // ✅ Obtener los datos YA FILTRADOS desde HANA
                List<AccesoDatosMantenimientosCorrectivos.MantenimientoCorrectivoRangoLIST> mantenimientos = new List<AccesoDatosMantenimientosCorrectivos.MantenimientoCorrectivoRangoLIST>();

                if (!string.IsNullOrEmpty(resultHana.JsonResult) && resultHana.JsonResult != "[]")
                {
                    mantenimientos = JsonConvert.DeserializeObject<List<AccesoDatosMantenimientosCorrectivos.MantenimientoCorrectivoRangoLIST>>(resultHana.JsonResult);
                }

                // ✅ Total de registros (ya vienen filtrados desde HANA)
                int totalRegistrosFiltrados = mantenimientos.Count();

                // ✅ Aplicar solo la paginación (el filtrado ya lo hizo HANA)
                var mantenimientosPaginados = mantenimientos.Skip(OmitirRegistros).Take(CantidadRegistros).ToList();

                // ✅ RETORNAR formato DataTables
                var resultado = Json(new
                {
                    draw = NroPeticion,
                    recordsTotal = totalRegistrosFiltrados, // Total ya filtrado por HANA
                    recordsFiltered = totalRegistrosFiltrados, // Mismo valor porque no hay filtrado adicional
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

                // ✅ En error también devolver formato DataTables
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

        [HttpGet]
        public JsonResult GetMantenimientoCorrectivo(string ID_SOLICITUD)
        {

            try
            {
                // ✅ Validar que venga el parámetro
                if (string.IsNullOrEmpty(ID_SOLICITUD))
                {
                    return Json(new List<object>(), JsonRequestBehavior.AllowGet);
                }

                //=================================OBTENER DATOS===========================//
                // ✅ TODOS LOS FILTROS SE ENVÍAN A HANA
                var parameters = new Dictionary<string, (object value, ParameterDirection direction, HanaDbType type)>
                {
                    { "P_ID_SOLICITUD", (string.IsNullOrEmpty(ID_SOLICITUD) ? (object)null : ID_SOLICITUD, ParameterDirection.Input, HanaDbType.Integer) },
                    { "P_FECHA_INICIO", (null, ParameterDirection.Input, HanaDbType.Date) },
                    { "P_FECHA_FIN", (null, ParameterDirection.Input, HanaDbType.Date) },
                    { "P_FILTRO_AREA", (null, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_FILTRO_LINEA", (null, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_FILTRO_ORDEN", (null, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_FILTRO_PLANTA", (null, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_FILTRO_ESTATUS", (null, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_FILTRO_BUSQUEDA", (null, ParameterDirection.Input, HanaDbType.NVarChar) }
                };

                // ✅ Ejecutar el Stored Procedure
                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                    Logic.AD.GCObtenerMantenimientosCorrectivos, // ⬅️ Nombre de tu SP
                    parameters
                );

                // ✅ Deserializar resultado
                // ✅ Obtener los datos YA FILTRADOS desde HANA
                List<AccesoDatosMantenimientosCorrectivos.MantenimientoCorrectivoRangoLIST> mantenimientos = new List<AccesoDatosMantenimientosCorrectivos.MantenimientoCorrectivoRangoLIST>();

                if (!string.IsNullOrEmpty(resultHana.JsonResult) && resultHana.JsonResult != "[]")
                {
                    mantenimientos = JsonConvert.DeserializeObject<List<AccesoDatosMantenimientosCorrectivos.MantenimientoCorrectivoRangoLIST>>(resultHana.JsonResult);
                }

                // ✅ Retornar JSON
                return Json(mantenimientos, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                string MethodName = MethodBase.GetCurrentMethod().Name;
                string ControllerName = this.ControllerContext.RouteData.Values["controller"].ToString();
                string msg = $"Error al buscar la soliictud de correctivo en {MethodName} de {ControllerName}. Error: {ex.Message}";

                System.Diagnostics.Trace.TraceError(msg);


                // ✅ Retornar lista vacía en caso de error
                return Json(new List<object>(), JsonRequestBehavior.AllowGet);
            }
        }

        [HttpPost]
        public JsonResult InsertarMC()
        {
            var jsonResponse = new GlobalCommands.JsonResponseMtto();
            List<AccesoDatosMantenimientosPreventivos.MantenimientoCorrectivoGenerado> Equipos; // CAMBIO: Lista en lugar de objeto único
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
                    Equipos = JsonConvert.DeserializeObject<List<AccesoDatosMantenimientosPreventivos.MantenimientoCorrectivoGenerado>>(jsonData);

                    if (Equipos == null || Equipos.Count == 0)
                        throw new Exception("No se recibieron equipos válidos.");
                }

                int ordenesGeneradas = 0;

                // Ahora sí puedes iterar sobre los equipos
                foreach (var equipo in Equipos)
                {
                    try
                    {
                        if (equipo == null || !int.TryParse(equipo.IdSolicitud, out int idSolicitud))
                        {
                            OTsinGenerar.AppendLine($"Solicitud {equipo?.IdSolicitud} - {equipo?.NombreEquipo}: identificador inválido");
                            continue;
                        }

                        // Crear objeto con las fechas convertidas
                        var parametrosEquipo = new
                        {
                            p_ID_SOLICITUD = idSolicitud,
                            p_USUARIO = equipo.Usuario
                        };

                        // Convertir a parámetros HANA usando tu método existente
                        var allparameters = Logic.GlobalCommands.ConvertToHanaParameters(parametrosEquipo, false, null);

                        // Ejecutar stored procedure para insertar equipo
                        var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(Logic.AD.GCInsertarMC, allparameters);

                        // Obtener ID generado si existe
                        OT = resultHana == null ? string.Empty : (resultHana.JsonResult ?? string.Empty);

                        if (OT.IndexOf("ERROR", StringComparison.OrdinalIgnoreCase) >= 0)
                        {
                            OTsinGenerar.AppendLine($"Solicitud {equipo.IdSolicitud} - {equipo.NombreEquipo}");
                        }
                        else
                        {
                            ordenesGeneradas++;
                        }
                    }
                    catch (Exception exEquipo)
                    {
                        OTsinGenerar.AppendLine($"Solicitud {equipo?.IdSolicitud} - {equipo?.NombreEquipo}: {exEquipo.Message}");
                    }
                }

                // Construir respuesta JSON
                jsonResponse.Status = "SI";
                jsonResponse.Message = OTsinGenerar.Length == 0
                    ? $"{ordenesGeneradas} órdenes de trabajo generadas correctamente."
                    : $"{ordenesGeneradas} órdenes generadas. Algunas no pudieron ser procesadas:\n{OTsinGenerar.ToString()}, intente de nuevo más tarde.";
                jsonResponse.Data = OT; // o el dato que necesites retornar

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
        public JsonResult InsertarOrdenTrabajoMC()
        {
            var jsonResponse = new GlobalCommands.JsonResponseMtto();
            AccesoDatosMantenimientosCorrectivos.OrdenTrabajoMCDTO datos;
            FirmaPendiente firmaRealizo = null;
            FirmaPendiente firmaSuperviso = null;

            try
            {
                // ✅ Leer el cuerpo de la solicitud JSON
                Request.InputStream.Position = 0;

                using (var reader = new StreamReader(Request.InputStream))
                {
                    string jsonData = reader.ReadToEnd();

                    if (string.IsNullOrEmpty(jsonData))
                        throw new Exception("No se recibió información.");

                    // ✅ Deserializar a objeto OrdenTrabajoDetalleDTO
                    datos = JsonConvert.DeserializeObject<AccesoDatosMantenimientosCorrectivos.OrdenTrabajoMCDTO>(jsonData);

                    if (datos == null)
                        throw new Exception("No se recibieron datos válidos.");
                }

                // 🔥 PREPARAR FIRMAS DIGITALES (se confirman solo si la BD guarda bien)
                bool okFirmaRealizo = PrepararFirmaDigital(
                    datos.FirmaRealizo,
                    datos.NumeroOrden,
                    "Realizo",
                    out firmaRealizo
                );

                bool okFirmaSuperviso = PrepararFirmaDigital(
                    datos.FirmaSuperviso,
                    datos.NumeroOrden,
                    "Superviso",
                    out firmaSuperviso
                );

                //Solo guardar la bandera
                datos.FirmaRealizo = okFirmaRealizo && firmaRealizo != null ? "SI" : "";
                datos.FirmaSuperviso = okFirmaSuperviso && firmaSuperviso != null ? "SI" : "";

                // Nota: Por petición temporal, la firma de "Mantenimiento" ya no es requerida
                // y no se guarda ni se envía al stored procedure. Se deja el helper disponible
                // por si en el futuro se necesita reactivar.
                // Se envían NULL para que el SP conserve la firma existente y no intente
                // almacenar el base64 en una columna NVARCHAR(500).
                datos.FirmaMantenimiento = null;
                datos.NombreMantenimiento = null;

                if (!okFirmaRealizo || !okFirmaSuperviso)
                {
                    DescartarFirma(firmaRealizo);
                    DescartarFirma(firmaSuperviso);

                    // Construir respuesta JSON
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
                    "P_IDMANTENIMIENTO",
                    "P_SOLICITANTE",
                    "P_USUARIO",
                    "P_TIPOOPERACION"
                    // Excluir temporalmente la firma de Mantenimiento del SP porque ya no es requerida
                    };


                var parameters = allparameters
                    .Where(p => !excludedParams.Contains(p.Key))
                    .ToDictionary(p => p.Key, p => p.Value);
                // ✅ Ejecutar stored procedure
                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                    Logic.AD.GCInsertaOrdenTrabajoMC,
                    parameters
                );

                if ((resultHana.JsonResult ?? string.Empty).IndexOf("ERROR", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    DescartarFirma(firmaRealizo);
                    DescartarFirma(firmaSuperviso);

                    // Construir respuesta JSON
                    jsonResponse.Status = "NO";
                    jsonResponse.Message = $"No fue posible actualizar la solicitud,intenta de nuevo más tarde.";
                    jsonResponse.Data = string.Empty;

                    return Json(jsonResponse, JsonRequestBehavior.AllowGet);
                }
                else
                {
                    //NOTIFICAR EN LA WEB SOBRE ACTUALIZACIONES (SIGNAL R)
                    string rolQueCambio = Request.Headers["X-Rol-Usuario"] ?? "Desconocido";
                    var context = GlobalHost.ConnectionManager.GetHubContext<MantenimientoHub>();
                    context.Clients.All.actualizarTablaMantenimientosCorrectivos(rolQueCambio);
                    context.Clients.All.actualizarCalendarioMantenimientos();
                    // ✅ NUEVO: Notificar actualización de bitácoras con tipo de actualización
                    if(datos.MaquinaDetenida == 1)
                        context.Clients.All.actualizarTablaBitacoras(rolQueCambio, "CORRECTIVOS");
                }
                //ACTUALIZAR STATUS A FINALIZADO DE TODAS FORMAS Y LA LOGICA ADICIONAL SE MANEJA EN EL FRONT
                var parametrosFinOT = new
                {
                    P_ID_MANTENIMIENTO = datos.IdMantenimiento,
                    P_ESTATUS = 4,
                    P_USUARIO_ACTUALIZA = datos.Usuario
                };

                // Convertir a parámetros HANA usando tu método existente
                allparameters = Logic.GlobalCommands.ConvertToHanaParameters(parametrosFinOT, false, null);
                //Actualizar estatus de OT
                var ActualizaOT = Logic.GlobalCommands.ExecuteProcedureHanaAuto(Logic.AD.GCActualizaMC, allparameters);

                // Se registra el resultado, pero no se cambia el flujo: el estatus 4 es intencional.
                if (ActualizaOT == null || (ActualizaOT.JsonResult ?? string.Empty).IndexOf("ERROR", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    System.Diagnostics.Trace.TraceError($"No fue posible actualizar el estatus de la OT {datos.NumeroOrden}.");
                }




                //Validar si ya se completo la CARATULA Y LA RUTINA ONLINE (SE CAMBIO LA LOGICA DE ACTUALIZACION)
                //var parametrosMantenimeinto = new
                //{
                //    P_NUMERO_ORDEN = datos.NumeroOrden
                //};

                //allparameters = Logic.GlobalCommands.ConvertToHanaParameters(parametrosMantenimeinto, false, null);

                //// ✅ Ejecutar stored procedure
                //var CaratulaRutinaCompleta = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                //    Logic.AD.GCValidarOTCorrectivoFinalizada,
                //    allparameters
                //);


                ////Si ya esta finalizada en conjunto con la rutina online actualizar estatus de mantenimiento
                //JArray CARRUT = JArray.Parse(CaratulaRutinaCompleta.JsonResult);
                //string OT = CARRUT[0]["ORDEN_TRABAJO_FINALIZADA"].ToString();

                //if (OT == "SI")
                //{

                //    // Crear objeto con las fechas convertidas
                //    var parametrosFinOT = new
                //    {
                //        P_ID_MANTENIMIENTO = datos.IdMantenimiento,
                //        P_ESTATUS = 4,
                //        P_USUARIO_ACTUALIZA = datos.Usuario
                //    };

                //    // Convertir a parámetros HANA usando tu método existente
                //    allparameters = Logic.GlobalCommands.ConvertToHanaParameters(parametrosFinOT, false, null);
                //    //Actualizar estatus de OT
                //    var ActualizaOT = Logic.GlobalCommands.ExecuteProcedureHanaAuto(Logic.AD.GCActualizaMC, allparameters);
                //}

                // ✅ Verificar resultado
                if (!string.IsNullOrEmpty(resultHana.JsonResult) && resultHana.JsonResult != "[]")
                {
                    var resultado = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(resultHana.JsonResult);
                    var idOtDetalle = resultado[0]["ID_OT_DETALLE"].ToString();

                    jsonResponse.Status = "SI";
                    jsonResponse.Message = "Orden de trabajo guardada correctamente";
                    jsonResponse.Data = idOtDetalle;
                }
                else
                {
                    throw new Exception("No fue posible guardar la orden de trabajo");
                }

                ConfirmarFirma(firmaRealizo);
                ConfirmarFirma(firmaSuperviso);

                return Json(jsonResponse, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                string MethodName = MethodBase.GetCurrentMethod().Name;
                string ControllerName = this.ControllerContext.RouteData.Values["controller"].ToString();

                jsonResponse.Status = "NO";
                jsonResponse.Message = $"No fue posible guardar la orden de trabajo en {MethodName} de {ControllerName}: {ex.Message}";
                jsonResponse.Data = string.Empty;

                DescartarFirma(firmaRealizo);
                DescartarFirma(firmaSuperviso);

                return Json(jsonResponse, JsonRequestBehavior.AllowGet);
            }
        }

        // 🔥 GUARDAR BORRADOR DE ORDEN DE TRABAJO CORRECTIVO
        [HttpPost]
        public JsonResult InsertarOrdenTrabajoMCBorrador()
        {
            var jsonResponse = new GlobalCommands.JsonResponseMtto();
            AccesoDatosMantenimientosCorrectivos.OrdenTrabajoMCDTO datos;
            FirmaPendiente firmaRealizo = null;
            FirmaPendiente firmaSuperviso = null;

            try
            {
                // Leer el cuerpo de la solicitud JSON
                Request.InputStream.Position = 0;

                using (var reader = new StreamReader(Request.InputStream))
                {
                    string jsonData = reader.ReadToEnd();

                    if (string.IsNullOrEmpty(jsonData))
                        throw new Exception("No se recibió información.");

                    // Deserializar a objeto OrdenTrabajoMCDTO
                    datos = JsonConvert.DeserializeObject<AccesoDatosMantenimientosCorrectivos.OrdenTrabajoMCDTO>(jsonData);

                    if (datos == null)
                        throw new Exception("No se recibieron datos válidos.");
                }

                // 🔥 PREPARAR FIRMAS DIGITALES (sin validar para borrador)
                // Si una firma no se puede guardar, el borrador continúa sin ella (mismo comportamiento actual).
                bool okFirmaRealizo = PrepararFirmaDigital(datos.FirmaRealizo, datos.NumeroOrden, "Realizo", out firmaRealizo);
                if (!okFirmaRealizo)
                {
                    DescartarFirma(firmaRealizo);
                    firmaRealizo = null;
                }

                bool okFirmaSuperviso = PrepararFirmaDigital(datos.FirmaSuperviso, datos.NumeroOrden, "Superviso", out firmaSuperviso);
                if (!okFirmaSuperviso)
                {
                    DescartarFirma(firmaSuperviso);
                    firmaSuperviso = null;
                }

                datos.FirmaRealizo = firmaRealizo != null ? "SI" : "";
                datos.FirmaSuperviso = firmaSuperviso != null ? "SI" : "";

                // Se envían NULL para que el SP conserve la firma existente y no intente
                // almacenar el base64 en una columna NVARCHAR(500).
                datos.FirmaMantenimiento = null;
                datos.NombreMantenimiento = null;

                string[] excludedParams = null;
                // Convertir a parámetros HANA
                var allparameters = Logic.GlobalCommands.ConvertToHanaParameters(datos, true, null);

                excludedParams = new[]
                    {
                    "P_IDMANTENIMIENTO",
                    "P_SOLICITANTE",
                    "P_USUARIO",
                    "P_TIPOOPERACION"
                    };

                var parameters = allparameters
                    .Where(p => !excludedParams.Contains(p.Key))
                    .ToDictionary(p => p.Key, p => p.Value);

                // 🔥 EJECUTAR STORED PROCEDURE (pero SIN cambiar el estatus)
                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                    Logic.AD.GCInsertaOrdenTrabajoMC,
                    parameters
                );

                if ((resultHana.JsonResult ?? string.Empty).IndexOf("ERROR", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    DescartarFirma(firmaRealizo);
                    DescartarFirma(firmaSuperviso);

                    jsonResponse.Status = "NO";
                    jsonResponse.Message = "No fue posible guardar el borrador, intenta de nuevo más tarde.";
                    jsonResponse.Data = string.Empty;

                    return Json(jsonResponse, JsonRequestBehavior.AllowGet);
                }
                else
                {
                    // NOTIFICAR EN LA WEB SOBRE ACTUALIZACIONES (SIGNAL R)
                    string rolQueCambio = Request.Headers["X-Rol-Usuario"] ?? "Desconocido";
                    var context = GlobalHost.ConnectionManager.GetHubContext<MantenimientoHub>();
                    context.Clients.All.actualizarTablaMantenimientosCorrectivos(rolQueCambio);
                    context.Clients.All.actualizarCalendarioMantenimientos();
                }

                // 🔥 NOTA: No cambiamos el estatus a 4 para el borrador
                // El estatus permanece como 2 (borrador/draft)

                // Verificar resultado
                if (!string.IsNullOrEmpty(resultHana.JsonResult) && resultHana.JsonResult != "[]")
                {
                    var resultado = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(resultHana.JsonResult);
                    var idOtDetalle = resultado[0]["ID_OT_DETALLE"].ToString();

                    jsonResponse.Status = "SI";
                    jsonResponse.Message = "Borrador guardado correctamente";
                    jsonResponse.Data = idOtDetalle;
                }
                else
                {
                    throw new Exception("No fue posible guardar el borrador");
                }

                ConfirmarFirma(firmaRealizo);
                ConfirmarFirma(firmaSuperviso);

                return Json(jsonResponse, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                string MethodName = MethodBase.GetCurrentMethod().Name;
                string ControllerName = this.ControllerContext.RouteData.Values["controller"].ToString();

                jsonResponse.Status = "NO";
                jsonResponse.Message = $"No fue posible guardar el borrador en {MethodName} de {ControllerName}: {ex.Message}";
                jsonResponse.Data = string.Empty;

                DescartarFirma(firmaRealizo);
                DescartarFirma(firmaSuperviso);

                return Json(jsonResponse, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpPost]
        public JsonResult InsertarSolicitudRefaccion()
        {
            var jsonResponse = new GlobalCommands.JsonResponseMtto();
            AccesoDatosMantenimientosCorrectivos.SolicitudRefaccionMultiple RequestData;

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
                    RequestData = JsonConvert.DeserializeObject<AccesoDatosMantenimientosCorrectivos.SolicitudRefaccionMultiple>(jsonData);
                }

                if (RequestData == null)
                    throw new Exception("No se recibieron datos válidos.");

                if (RequestData.Articulos == null || RequestData.Articulos.Count == 0)
                    throw new Exception("No se recibieron artículos.");

                var insertados = 0;
                var errores = new List<string>();

                // ✅ Insertar cada artículo por separado
                foreach (var articulo in RequestData.Articulos)
                {
                    // Crear modelo individual para cada artículo
                    //var solicitudIndividual = new AccesoDatosMantenimientosCorrectivos.SolicitudRefaccion
                    //{
                    //    OrdenTrabajo = RequestData.OrdenTrabajo,
                    //    IdEquipo = RequestData.IdEquipo,
                    //    RefaccionSolicitada = articulo.RefaccionSolicitada,
                    //    Cantidad = articulo.Cantidad,
                    //    NivelUrgencia = RequestData.NivelUrgencia,
                    //    DescripcionNecesidad = RequestData.DescripcionNecesidad,
                    //    UsuarioSolicita = RequestData.UsuarioSolicita,
                    //    Estatus = RequestData.Estatus,
                    //    IdMantenimiento = RequestData.IdMantenimiento
                    //};

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
                        Tipo = "2"
                    };

                    // Convertir modelo a parámetros HANA
                    var allparameters = Logic.GlobalCommands.ConvertToHanaParameters(solicitudIndividual, false, null);
                    var excludedParams = new[] { "Estatus", "IdMantenimiento" };
                    var parameters = allparameters
                        .Where(p => !excludedParams.Contains(p.Key))
                        .ToDictionary(p => p.Key, p => p.Value);

                    // Ejecutar stored procedure para insertar artículo
                    var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(Logic.AD.GCInsertarSolicitudRefaccionCorrectivo, parameters);

                    var nuevoId = resultHana == null ? string.Empty : (resultHana.JsonResult ?? string.Empty);
                    if (nuevoId.IndexOf("ERROR", StringComparison.OrdinalIgnoreCase) < 0)
                    {
                        insertados++;
                    }
                    else
                    {
                        errores.Add($"{articulo.RefaccionSolicitada}: {nuevoId}");
                    }
                }

                // ✅ Actualizar estatus del mantenimiento solo si al menos un artículo se insertó
                // (antes se actualizaba incluso cuando todos fallaban).
                if (insertados > 0)
                {
                    var parametrosOT = new
                    {
                        P_ID_MANTENIMIENTO = RequestData.IdMantenimiento,
                        P_ESTATUS = RequestData.Estatus,
                        P_USUARIO_ACTUALIZA = RequestData.UsuarioSolicita
                    };

                    var allparametersOT = Logic.GlobalCommands.ConvertToHanaParameters(parametrosOT, false, null);
                    var ActualizaOT = Logic.GlobalCommands.ExecuteProcedureHanaAuto(Logic.AD.GCActualizaMC, allparametersOT);

                    if (ActualizaOT == null || (ActualizaOT.JsonResult ?? string.Empty).IndexOf("ERROR", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        System.Diagnostics.Trace.TraceError($"No fue posible actualizar el estatus del mantenimiento {RequestData.IdMantenimiento} al solicitar refacciones.");
                    }
                }

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
                    context.Clients.All.actualizarTablaMantenimientosCorrectivos(rolQueCambio);
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
        public JsonResult BuscarEmpleados(int? planta, string query, string posicionId, string usuarioWeb, string tipoUsuario)
        {
            try
            {
                // ✅ Validar que venga el parámetro
                if (string.IsNullOrEmpty(query))
                {
                    return Json(new List<object>(), JsonRequestBehavior.AllowGet);
                }

                string posicionIdFinal = string.IsNullOrEmpty(posicionId) ? null : posicionId;
                string usuarioWebFinal = string.IsNullOrEmpty(usuarioWeb) ? null : usuarioWeb;
                string tipoUsuarioFinal = string.IsNullOrEmpty(tipoUsuario) ? null : tipoUsuario;

                // ✅ Preparar parámetros para el SP
                var parameters = new Dictionary<string, (object value, ParameterDirection direction, HanaDbType type)>
                {
                    { "P_QUERY", (query, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_PLANTA", (planta, ParameterDirection.Input, HanaDbType.Integer) },
                    { "P_POSICION",(posicionIdFinal,  ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_USUARIOWEB",(usuarioWebFinal,  ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_TIPOUSUARIO",(tipoUsuarioFinal, ParameterDirection.Input, HanaDbType.NVarChar) },
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
                System.Diagnostics.Trace.TraceError(msg);

                // ✅ Retornar lista vacía en caso de error
                return Json(new List<object>(), JsonRequestBehavior.AllowGet);
            }
        }

        [HttpGet]
        public JsonResult ObtenerTecnicosOT(string numeroOrden, string tipo)
        {
            try
            {
                // ✅ Validación básica
                if (string.IsNullOrEmpty(numeroOrden) || string.IsNullOrEmpty(tipo))
                {
                    return Json(new List<object>(), JsonRequestBehavior.AllowGet);
                }

                // ✅ Parámetros SP
                var parameters = new Dictionary<string, (object value, ParameterDirection direction, HanaDbType type)>
                {
                    { "P_NUMERO_ORDEN", (numeroOrden, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_TIPO", (tipo, ParameterDirection.Input, HanaDbType.NVarChar) }
                };

                // ✅ Ejecutar SP
                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                    Logic.AD.GCObtenerTecnicosOT,
                    parameters
                );

                // ✅ Deserializar
                List<AccesoDatosMantenimientosCorrectivos.TecnicoDTO> tecnicos = new List<AccesoDatosMantenimientosCorrectivos.TecnicoDTO>();

                if (!string.IsNullOrEmpty(resultHana.JsonResult) && resultHana.JsonResult != "[]")
                {
                    tecnicos = JsonConvert.DeserializeObject<List<AccesoDatosMantenimientosCorrectivos.TecnicoDTO>>(resultHana.JsonResult);
                }

                return Json(tecnicos, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                string MethodName = MethodBase.GetCurrentMethod().Name;
                string ControllerName = this.ControllerContext.RouteData.Values["controller"].ToString();
                string msg = $"Error al obtener técnicos en {MethodName} de {ControllerName}. Error: {ex.Message}";

                System.Diagnostics.Trace.TraceError(msg);

                return Json(new List<object>(), JsonRequestBehavior.AllowGet);
            }
        }

        // 🔥 MÉTODO HELPER PARA GUARDAR FIRMAS DIGITALES (PREPARAR / CONFIRMAR / DESCARTAR)
        private sealed class FirmaPendiente
        {
            public string RutaTemporal { get; set; }
            public string RutaFinal { get; set; }
            public string RutaRelativa { get; set; }
        }

        private const int MaxFirmaBytes = 2 * 1024 * 1024; // 2 MB

        private bool PrepararFirmaDigital(string firmaBase64, string numeroOrden, string tipoFirma, out FirmaPendiente firmaPendiente)
        {
            firmaPendiente = null;

            try
            {
                // Si no hay firma, no es un error: simplemente no se genera archivo.
                if (string.IsNullOrWhiteSpace(firmaBase64))
                    return true;

                // Solo se permiten las firmas que maneja Correctivos.
                if (tipoFirma != "Realizo" && tipoFirma != "Superviso")
                    return false;

                string ordenLimpia = LimpiarNombreCarpeta(numeroOrden);
                if (string.IsNullOrEmpty(ordenLimpia))
                    return false;

                // Remover el prefijo "data:image/png;base64," si existe.
                string base64Clean = firmaBase64;
                int indiceComa = firmaBase64.IndexOf(',');
                if (indiceComa >= 0)
                    base64Clean = firmaBase64.Substring(indiceComa + 1);

                if (string.IsNullOrWhiteSpace(base64Clean))
                    return false;

                byte[] imageBytes;
                try
                {
                    imageBytes = Convert.FromBase64String(base64Clean);
                }
                catch (FormatException)
                {
                    return false;
                }

                if (imageBytes.Length == 0 || imageBytes.Length > MaxFirmaBytes)
                    return false;

                // Validar firma PNG (89 50 4E 47 0D 0A 1A 0A).
                byte[] pngHeader = { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A };
                if (imageBytes.Length < pngHeader.Length || !pngHeader.SequenceEqual(imageBytes.Take(pngHeader.Length)))
                    return false;

                string carpetaBase = Server.MapPath("~/FirmasOTCorrectivo/");
                string carpetaBaseFull = Path.GetFullPath(carpetaBase);
                string carpetaOrdenFull = Path.GetFullPath(Path.Combine(carpetaBaseFull, ordenLimpia));

                // La carpeta final debe quedar dentro de la carpeta base (evita path traversal).
                if (!carpetaOrdenFull.StartsWith(carpetaBaseFull.TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
                    return false;

                if (!Directory.Exists(carpetaBaseFull))
                    Directory.CreateDirectory(carpetaBaseFull);

                if (!Directory.Exists(carpetaOrdenFull))
                    Directory.CreateDirectory(carpetaOrdenFull);

                string nombreArchivo = $"Firma_{tipoFirma}.png";
                string rutaFinal = Path.Combine(carpetaOrdenFull, nombreArchivo);
                string rutaTemporal = Path.Combine(carpetaOrdenFull, $".{nombreArchivo}.{Guid.NewGuid():N}.tmp");

                System.IO.File.WriteAllBytes(rutaTemporal, imageBytes);

                firmaPendiente = new FirmaPendiente
                {
                    RutaTemporal = rutaTemporal,
                    RutaFinal = rutaFinal,
                    RutaRelativa = $"/FirmasOTCorrectivo/{ordenLimpia}/{nombreArchivo}"
                };

                return true;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error al preparar firma {tipoFirma}: {ex.Message}");
                DescartarFirma(firmaPendiente);
                firmaPendiente = null;
                return false;
            }
        }

        private static void ConfirmarFirma(FirmaPendiente firmaPendiente)
        {
            if (firmaPendiente == null || string.IsNullOrEmpty(firmaPendiente.RutaTemporal))
                return;

            try
            {
                if (System.IO.File.Exists(firmaPendiente.RutaFinal))
                {
                    // Reemplazo atómico dentro de la misma carpeta.
                    System.IO.File.Replace(firmaPendiente.RutaTemporal, firmaPendiente.RutaFinal, null);
                }
                else
                {
                    System.IO.File.Move(firmaPendiente.RutaTemporal, firmaPendiente.RutaFinal);
                }
            }
            catch (Exception ex)
            {
                // La BD ya se guardó: no se debe fallar la respuesta por el archivo.
                System.Diagnostics.Debug.WriteLine($"No fue posible confirmar la firma {firmaPendiente.RutaFinal}: {ex.Message}");
            }
            finally
            {
                try
                {
                    if (System.IO.File.Exists(firmaPendiente.RutaTemporal))
                        System.IO.File.Delete(firmaPendiente.RutaTemporal);
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine($"No fue posible limpiar la firma temporal: {ex.Message}");
                }
            }
        }

        private static void DescartarFirma(FirmaPendiente firmaPendiente)
        {
            if (firmaPendiente == null || string.IsNullOrEmpty(firmaPendiente.RutaTemporal))
                return;

            try
            {
                if (System.IO.File.Exists(firmaPendiente.RutaTemporal))
                    System.IO.File.Delete(firmaPendiente.RutaTemporal);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"No fue posible descartar la firma temporal: {ex.Message}");
            }
        }

        private static string LimpiarNombreCarpeta(string valor)
        {
            if (string.IsNullOrWhiteSpace(valor))
                return string.Empty;

            var limpio = new StringBuilder();
            foreach (char c in valor.Trim())
            {
                if (char.IsLetterOrDigit(c) || c == '-' || c == '_' || c == '.')
                    limpio.Append(c);
                else
                    limpio.Append('_');
            }

            string resultado = limpio.ToString().Trim('.', ' ');

            if (resultado == "." || resultado == "..")
                return string.Empty;

            if (resultado.Contains(".."))
                resultado = resultado.Replace("..", "_");

            return resultado;
        }

        private static bool TryParseFecha(string valor, out DateTime fecha)
        {
            fecha = default(DateTime);
            if (string.IsNullOrWhiteSpace(valor))
                return false;

            if (DateTime.TryParseExact(valor, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out fecha))
                return true;

            return DateTime.TryParse(valor, out fecha);
        }
        #endregion

    }
}