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

                //Limpiar para tecnico
                if (FiltroTipoUsuario == "TecnicoMtto")
                    FiltroUsuario = string.Empty;

                if (FiltroArea != string.Empty || FiltroLinea != string.Empty || FiltroOrdenTrabajo != string.Empty)
                    AditionalFilter = true;

                //OMITIR PARA DEMO
                if (FiltroTipoUsuario == "Produccion")
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
                    { "P_FECHA_INICIO", (AditionalFilter ? (object)null : dtFechaInicio, ParameterDirection.Input, HanaDbType.Date) },
                    { "P_FECHA_FIN", (AditionalFilter ? (object)null : dtFechaFin, ParameterDirection.Input, HanaDbType.Date) },
                    { "P_FILTRO_AREA", (string.IsNullOrEmpty(FiltroArea) ? (object)null : FiltroArea, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_FILTRO_LINEA", (string.IsNullOrEmpty(FiltroLinea) ? (object)null : FiltroLinea, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_FILTRO_ORDEN", (string.IsNullOrEmpty(FiltroOrdenTrabajo) ? (object)null : FiltroOrdenTrabajo, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_FILTRO_PERIODICIDAD", (string.IsNullOrEmpty(FiltroPeriodicidad) ? (object)null : FiltroPeriodicidad, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_FILTRO_PLANTA", (string.IsNullOrEmpty(FiltroPlanta) ? (object)null : FiltroPlanta, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_FILTRO_ESTATUS", (string.IsNullOrEmpty(FiltroEstatusOT) ? (object)null : FiltroEstatusOT, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_FILTRO_BUSQUEDA", (string.IsNullOrEmpty(FiltroBusqueda) ? (object)null : FiltroBusqueda, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_USUARIO", (string.IsNullOrEmpty(FiltroUsuario) ? (object)null : FiltroUsuario, ParameterDirection.Input, HanaDbType.NVarChar) }
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
                        p_FECHA_INICIO_PERIODO = fechaInicio,  // ✅ Ya es DateTime
                        p_FECHA_FIN_PERIODO = fechaFin,          // ✅ Ya es DateTime
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

                bool rutaFirmaMantenimiento = GuardarFirmaDigital(
                    datos.FirmaMantenimiento,
                    datos.NumeroOrden,
                    "Mantenimiento"
                );

                //Solo guardar la bandera
                datos.FirmaMantenimiento = rutaFirmaMantenimiento && datos.FirmaMantenimiento.Length > 0 ? "SI" : "";

                if (!rutaFirmaRealizo || !rutaFirmaSuperviso || !rutaFirmaMantenimiento)
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

                var parametrosFinOT = new
                {
                    P_ID_MANTENIMIENTO = datos.IdMantenimiento,
                    P_ESTATUS = 4,
                    P_USUARIO_ACTUALIZA = datos.Solicitante
                };

                allparameters = Logic.GlobalCommands.ConvertToHanaParameters(parametrosFinOT, false, null);
                var ActualizaOT = Logic.GlobalCommands.ExecuteProcedureHanaAuto(Logic.AD.GCActualizaMP, allparameters);


                //NOTIFICAR EN LA WEB SOBRE ACTUALIZACIONES (SIGNAL R)
                var context = GlobalHost.ConnectionManager.GetHubContext<MantenimientoHub>();
                context.Clients.All.actualizarTablaMantenimientosPreventivos();

                // Validar si ya se completó la CARÁTULA Y LA RUTINA ONLINE
                //var parametrosMantenimiento = new
                //{
                //    P_ID_MANTENIMIENTO = datos.IdMantenimiento
                //};

                //allparameters = Logic.GlobalCommands.ConvertToHanaParameters(parametrosMantenimiento, false, null);

                //var CaratulaRutinaCompleta = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                //    Logic.AD.GCValidarOTFinalizada,
                //    allparameters
                //);

                //// Si ya está finalizada en conjunto con la rutina online actualizar estatus de mantenimiento
                //JArray CARRUT = JArray.Parse(CaratulaRutinaCompleta.JsonResult);
                //string OT = CARRUT[0]["ORDEN_TRABAJO_FINALIZADA"].ToString();
                //string RUTINA = CARRUT[0]["RUTINA_COMPLETADA"].ToString();

                //if (OT == "SI" && RUTINA == "SI")
                //{
                //    var parametrosFinOT = new
                //    {
                //        P_ID_MANTENIMIENTO = datos.IdMantenimiento,
                //        P_ESTATUS = 4,
                //        P_USUARIO_ACTUALIZA = datos.Solicitante
                //    };

                //    allparameters = Logic.GlobalCommands.ConvertToHanaParameters(parametrosFinOT, false, null);
                //    var ActualizaOT = Logic.GlobalCommands.ExecuteProcedureHanaAuto(Logic.AD.GCActualizaMP, allparameters);
                //}

                // ✅ Verificar resultado
                if (!string.IsNullOrEmpty(resultHana.JsonResult) && resultHana.JsonResult != "[]")
                {
                    var resultado = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(resultHana.JsonResult);
                    var idOtDetalle = resultado[0]["ID_OT_DETALLE"].ToString();

                    jsonResponse.Status = "SI";
                    jsonResponse.Message = "Orden de trabajo guardada correctamente con firmas digitales";
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
                    // Crear modelo individual para cada artículo
                    //var solicitudIndividual = new AccesoDatosMantenimientosPreventivos.SolicitudRefaccion
                    //{
                    //    OrdenTrabajo = RequestData.OrdenTrabajo,
                    //    IdEquipo = RequestData.IdEquipo,
                    //    RefaccionSolicitada = articulo.RefaccionSolicitada,
                    //    Cantidad = articulo.Cantidad,
                    //    NivelUrgencia = RequestData.NivelUrgencia,
                    //    DescripcionNecesidad = RequestData.DescripcionNecesidad,
                    //    UsuarioSolicita = RequestData.UsuarioSolicita,
                    //    Estatus = RequestData.Estatus,
                    //    IdMantenimiento = RequestData.IdMantenimiento,
                    //    Planta = RequestData.Planta
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
                    P_ESTATUS = RequestData.Estatus,
                    P_USUARIO_ACTUALIZA = RequestData.UsuarioSolicita
                };

                var allparametersOT = Logic.GlobalCommands.ConvertToHanaParameters(parametrosOT, false, null);
                var ActualizaOT = Logic.GlobalCommands.ExecuteProcedureHanaAuto(Logic.AD.GCActualizaMP, allparametersOT);

                // Notificar a los clientes
                var context = GlobalHost.ConnectionManager.GetHubContext<MantenimientoHub>();
                context.Clients.All.actualizarTablaSolicitudRefacciones();

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
        public JsonResult BuscarEmpleados(string query)
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
                    { "P_QUERY", (query, ParameterDirection.Input, HanaDbType.NVarChar) }
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
        #endregion
    }
}