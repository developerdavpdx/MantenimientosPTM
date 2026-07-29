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

                // Convertir modelo a parámetros HANA
                var allparameters = Logic.GlobalCommands.ConvertToHanaParameters(RequestData, false, null);
                var excludedParams = new[] { "IdSolicitud", "FechaCreacion", "ClaseMantenimiento", "FechaActualizacion" };
                var parameters = allparameters
                    .Where(p => !excludedParams.Contains(p.Key))
                    .ToDictionary(p => p.Key, p => p.Value);
                // Ejecutar stored procedure para insertar equipo
                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(Logic.AD.GCInsertarSolicitudMC, parameters);

                // Obtener ID generado si existe
                var nuevoId = resultHana.JsonResult;

                // Construir respuesta JSON
                jsonResponse.Status = nuevoId.Contains("ERROR") ? "NO" : "SI";
                jsonResponse.Message = nuevoId.Contains("ERROR") ? "No fue posible insertar la solicitud de mantenimiento correctivo." : "Solicitud de mantenimiento correctivo insertada correctamente.";
                jsonResponse.Data = nuevoId;

                //NOTIFICAR EN LA WEB SOBRE ACTUALIZACIONES (SIGNAL R)
                if (jsonResponse.Status == "SI")
                {
                    string rolQueCambio = Request.Headers["X-Rol-Usuario"] ?? "Desconocido";
                    var context = GlobalHost.ConnectionManager.GetHubContext<MantenimientoHub>();
                    context.Clients.All.actualizarTablaMantenimientosCorrectivos(rolQueCambio);
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
                string FiltroPosicionId = Request.Form["FiltroPosicionId"];

                // Leer desde config las restricciones a las posiciones que se le aplicara
                string IdsHerr = System.Configuration.ConfigurationManager.AppSettings["PosicionesHerr"];
                string IdsMtto = System.Configuration.ConfigurationManager.AppSettings["PosicionesMtto"];


                if (FiltroArea != string.Empty || FiltroLinea != string.Empty || FiltroOrdenTrabajo != string.Empty)
                    AditionalFilter = true;

                // ✅ Si no vienen fechas, usar el mes actual
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
                    { "P_ID_SOLICITUD", (string.IsNullOrEmpty(FiltroIDSolicitud) ? (object)null : FiltroIDSolicitud, ParameterDirection.Input, HanaDbType.Integer) },
                    { "P_FECHA_INICIO", (AditionalFilter ? (object)null : dtFechaInicio, ParameterDirection.Input, HanaDbType.Date) },
                    { "P_FECHA_FIN", (AditionalFilter ? (object)null : dtFechaFin, ParameterDirection.Input, HanaDbType.Date) },
                    { "P_FILTRO_AREA", (string.IsNullOrEmpty(FiltroArea) ? (object)null : FiltroArea, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_FILTRO_LINEA", (string.IsNullOrEmpty(FiltroLinea) ? (object)null : FiltroLinea, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_FILTRO_ORDEN", (string.IsNullOrEmpty(FiltroOrdenTrabajo) ? (object)null : FiltroOrdenTrabajo, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_FILTRO_PLANTA", (string.IsNullOrEmpty(FiltroPlanta) ? (object)null : FiltroPlanta, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_FILTRO_ESTATUS", (string.IsNullOrEmpty(FiltroEstatusOT) ? (object)null : FiltroEstatusOT, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_FILTRO_BUSQUEDA", (string.IsNullOrEmpty(FiltroBusqueda) ? (object)null : FiltroBusqueda, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_EXCLUIR_SINCRONIZADOS_PVC", (string.IsNullOrEmpty(FiltroExcluirSincronizadosPVC) ? (object)null : FiltroExcluirSincronizadosPVC, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_EXCLUIR_SINCRONIZADOS_PEADLISO", (string.IsNullOrEmpty(FiltroExcluirSincronizadosPEADLISO) ? (object)null : FiltroExcluirSincronizadosPEADLISO, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_EXCLUIR_SINCRONIZADOS_CORRUGADO ", (string.IsNullOrEmpty(FiltroExcluirSincronizadosPEADCORR) ? (object)null : FiltroExcluirSincronizadosPEADCORR, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_FILTRO_POSICION_ID", (string.IsNullOrEmpty(FiltroPosicionId) ? (object)null : FiltroPosicionId, ParameterDirection.Input, HanaDbType.Integer) },
                    { "P_IDS_HERR", (string.IsNullOrEmpty(IdsHerr) ? (object)null : IdsHerr, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_IDS_MTTO", (string.IsNullOrEmpty(IdsMtto) ? (object)null : IdsMtto, ParameterDirection.Input, HanaDbType.NVarChar) }
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


                    // Crear objeto con las fechas convertidas
                    var parametrosEquipo = new
                    {
                        p_ID_SOLICITUD = int.Parse(equipo.IdSolicitud),
                        p_USUARIO = equipo.Usuario
                    };

                    // Convertir a parámetros HANA usando tu método existente
                    var allparameters = Logic.GlobalCommands.ConvertToHanaParameters(parametrosEquipo, false, null);

                    // Ejecutar stored procedure para insertar equipo
                    var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(Logic.AD.GCInsertarMC, allparameters);

                    // Obtener ID generado si existe
                    OT = resultHana.JsonResult;

                    if (OT.Contains("ERROR"))
                    {
                        OTsinGenerar.AppendLine($"Solicitud {equipo.IdSolicitud} - {equipo.NombreEquipo}");
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

                // 🔥 PROCESAR Y GUARDAR FIRMAS DIGITALES
                bool rutaFirmaRealizo = GuardarFirmaDigital(
                    datos.FirmaRealizo,
                    datos.NumeroOrden,
                    "Realizo"
                );

                //Solo guardar la bandera
                datos.FirmaRealizo = rutaFirmaRealizo && datos.FirmaRealizo.Length > 0 ? "SI" : "";

                bool rutaFirmaSuperviso = GuardarFirmaDigital(
                    datos.FirmaSuperviso,
                    datos.NumeroOrden,
                    "Superviso"
                );


                //Solo guardar la bandera
                datos.FirmaSuperviso = rutaFirmaSuperviso && datos.FirmaSuperviso.Length > 0 ? "SI" : "";

                // Nota: Por petición temporal, la firma de "Mantenimiento" ya no es requerida
                // y no se guarda ni se envía al stored procedure. Se deja el helper disponible
                // por si en el futuro se necesita reactivar.

                if (!rutaFirmaRealizo || !rutaFirmaSuperviso)
                {
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

                if (resultHana.JsonResult.ToUpper().Contains("ERROR"))
                {
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

        // 🔥 GUARDAR BORRADOR DE ORDEN DE TRABAJO CORRECTIVO
        [HttpPost]
        public JsonResult InsertarOrdenTrabajoMCBorrador()
        {
            var jsonResponse = new GlobalCommands.JsonResponseMtto();
            AccesoDatosMantenimientosCorrectivos.OrdenTrabajoMCDTO datos;

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

                // 🔥 PROCESAR Y GUARDAR FIRMAS DIGITALES (sin validar para borrador)
                bool rutaFirmaRealizo = true;
                bool rutaFirmaSuperviso = true;

                if (!string.IsNullOrEmpty(datos.FirmaRealizo) && datos.FirmaRealizo.Length > 0)
                {
                    rutaFirmaRealizo = GuardarFirmaDigital(
                        datos.FirmaRealizo,
                        datos.NumeroOrden,
                        "Realizo"
                    );
                }

                datos.FirmaRealizo = rutaFirmaRealizo && datos.FirmaRealizo != null && datos.FirmaRealizo.Length > 0 ? "SI" : "";

                if (!string.IsNullOrEmpty(datos.FirmaSuperviso) && datos.FirmaSuperviso.Length > 0)
                {
                    rutaFirmaSuperviso = GuardarFirmaDigital(
                        datos.FirmaSuperviso,
                        datos.NumeroOrden,
                        "Superviso"
                    );
                }

                datos.FirmaSuperviso = rutaFirmaSuperviso && datos.FirmaSuperviso != null && datos.FirmaSuperviso.Length > 0 ? "SI" : "";

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

                if (resultHana.JsonResult.ToUpper().Contains("ERROR"))
                {
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

                return Json(jsonResponse, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                string MethodName = MethodBase.GetCurrentMethod().Name;
                string ControllerName = this.ControllerContext.RouteData.Values["controller"].ToString();

                jsonResponse.Status = "NO";
                jsonResponse.Message = $"No fue posible guardar el borrador en {MethodName} de {ControllerName}: {ex.Message}";
                jsonResponse.Data = string.Empty;

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
                    P_ESTATUS = RequestData.Estatus,
                    P_USUARIO_ACTUALIZA = RequestData.UsuarioSolicita
                };

                var allparametersOT = Logic.GlobalCommands.ConvertToHanaParameters(parametrosOT, false, null);
                var ActualizaOT = Logic.GlobalCommands.ExecuteProcedureHanaAuto(Logic.AD.GCActualizaMC, allparametersOT);

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
                // Logger.Error(msg);

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
                    string carpetaDestino = Server.MapPath($"~/EvidenciaRutinas/{idMantenimiento}");
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
                            string nombreArchivo = $"{DateTime.Now:yyyyMMddHHmmss}_{i}_{Path.GetFileName(archivo.FileName)}";
                            string rutaCompleta = Path.Combine(carpetaDestino, nombreArchivo);
                            archivo.SaveAs(rutaCompleta);
                            rutasImagenes.Add($"/EvicenciaRutinas/{idMantenimiento}/{nombreArchivo}");
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
                    P_NUMERO_ORDEN = idMantenimiento
                };

                allparameters = Logic.GlobalCommands.ConvertToHanaParameters(parametrosMantenimeinto, false, null);

                // ✅ Ejecutar stored procedure
                var CaratulaRutinaCompleta = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                    Logic.AD.GCValidarOTCorrectivoFinalizada,
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
                    var ActualizaOT = Logic.GlobalCommands.ExecuteProcedureHanaAuto(Logic.AD.GCActualizaMC, allparameters);
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
                string carpetaBase = Server.MapPath("~/FirmasOTCorrectivo/");
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
                string rutaRelativa = $"/FirmasOTCorrectivo/{ordenLimpia}/{nombreArchivo}";

                return true;
            }
            catch (Exception ex)
            {
                // Log del error pero no detener el proceso
                System.Diagnostics.Debug.WriteLine($"Error al guardar firma {tipoFirma}: {ex.Message}");
                return false;
            }
        }
        #endregion

    }
}