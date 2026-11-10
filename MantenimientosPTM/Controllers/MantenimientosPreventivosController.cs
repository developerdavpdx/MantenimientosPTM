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
using System.Web;
using System.Web.Mvc;

namespace MantenimientosPTM.Controllers
{
    public class MantenimientosPreventivosController : Controller
    {
        readonly LogicaMantenimientosPreventivos Logic = new LogicaMantenimientosPreventivos();

        private const int MaxEvidenciaSize = 5 * 1024 * 1024; // 5 MB
        private static readonly string[] ExtensionesImagen = { ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp" };
        private static readonly string[] MimesImagen = { "image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp" };

        #region Helpers

        /// <summary>
        /// Detecta errores devueltos por los SPs sin depender de mayúsculas/minúsculas.
        /// </summary>
        private static bool EsErrorHana(string jsonResult)
        {
            return !string.IsNullOrEmpty(jsonResult) &&
                   jsonResult.IndexOf("ERROR", StringComparison.OrdinalIgnoreCase) >= 0;
        }

        /// <summary>
        /// Limpia un valor para usarlo como segmento de ruta (planta, orden, carpeta).
        /// Evita path traversal y caracteres inválidos.
        /// </summary>
        private static string SanitizarSegmentoRuta(string valor, string fallback)
        {
            if (string.IsNullOrWhiteSpace(valor))
                return fallback;

            var sb = new StringBuilder();
            foreach (char c in valor.Trim())
            {
                if (char.IsLetterOrDigit(c) || c == '-' || c == '_' || c == '.')
                    sb.Append(c);
                else
                    sb.Append('_');
            }

            string limpio = sb.ToString().Replace("..", "_").Trim('.', '_', '-');
            if (string.IsNullOrWhiteSpace(limpio))
                return fallback;

            return limpio.Length > 50 ? limpio.Substring(0, 50) : limpio;
        }

        /// <summary>
        /// Devuelve la carpeta física de evidencia validando que quede dentro de ~/EvidenciaRutinas.
        /// </summary>
        private string ObtenerCarpetaEvidencia(string planta, string orden)
        {
            string baseEvidencia = Path.GetFullPath(Server.MapPath("~/EvidenciaRutinas"));
            string plantaSegura = SanitizarSegmentoRuta(planta, "SIN_PLANTA");
            string ordenSegura = SanitizarSegmentoRuta(orden, "SIN_ORDEN");
            string carpeta = Path.GetFullPath(Path.Combine(baseEvidencia, plantaSegura, ordenSegura));

            if (!carpeta.StartsWith(baseEvidencia + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
                throw new Exception("La ruta de evidencia no es válida.");

            return carpeta;
        }

        /// <summary>
        /// Valida que una URL de evidencia apunte a un archivo dentro de ~/EvidenciaRutinas.
        /// </summary>
        private bool EsRutaEvidenciaValida(string url, out string rutaFisica)
        {
            rutaFisica = null;

            if (string.IsNullOrWhiteSpace(url))
                return false;

            string normalizada = url.Replace("\\", "/");
            if (!normalizada.StartsWith("/EvidenciaRutinas/", StringComparison.OrdinalIgnoreCase))
                return false;

            try
            {
                string baseEvidencia = Path.GetFullPath(Server.MapPath("~/EvidenciaRutinas"));
                string candidata = Path.GetFullPath(Server.MapPath("~" + normalizada));

                if (!candidata.StartsWith(baseEvidencia + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
                    return false;

                rutaFisica = candidata;
                return true;
            }
            catch
            {
                return false;
            }
        }

        private static void EliminarArchivosFisicos(IEnumerable<string> rutasFisicas)
        {
            if (rutasFisicas == null) return;

            foreach (var ruta in rutasFisicas)
            {
                try
                {
                    if (!string.IsNullOrEmpty(ruta) && System.IO.File.Exists(ruta))
                        System.IO.File.Delete(ruta);
                }
                catch
                {
                    // No interrumpir el flujo por un archivo que no se pudo borrar.
                }
            }
        }

        private static bool EsImagenValida(HttpPostedFileBase archivo, out string extension)
        {
            extension = Path.GetExtension(archivo.FileName ?? string.Empty).ToLower();
            if (!ExtensionesImagen.Contains(extension)) return false;
            if (!MimesImagen.Contains((archivo.ContentType ?? string.Empty).ToLower())) return false;
            if (archivo.ContentLength > MaxEvidenciaSize) return false;
            return true;
        }

        #endregion

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
                string FiltroExcluirSincronizadosINY = Request.Form["FiltroExcluirSincronizadosINY"];
                string FiltroPosicionId = Request.Form["FiltroPosicionId"];
                string FiltroClasificacion = Request.Form["FiltroClasificacion"];
                string FiltroNombreEquipo = Request.Form["FiltroNombreEquipo"];

                // Leer desde config las restricciones a las posiciones que se le aplicara
                string IdsHerr = System.Configuration.ConfigurationManager.AppSettings["PosicionesHerr"];
                string IdsMtto = System.Configuration.ConfigurationManager.AppSettings["PosicionesMtto"];


                //Limpiar para tecnico
                if (FiltroTipoUsuario == "TecnicoMtto")
                    FiltroUsuario = string.Empty;

                //if (FiltroArea != string.Empty || FiltroLinea != string.Empty || FiltroOrdenTrabajo != string.Empty)
                //    AditionalFilter = true;

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

                // ✅ Detectar si viene de Bitácora (algún filtro de exclusión activo)
                bool esDesdeBitacora =
                    FiltroExcluirSincronizadosPVC == "S" ||
                    FiltroExcluirSincronizadosPEADLISO == "S" ||
                    FiltroExcluirSincronizadosPEADCORR == "S" ||
                    FiltroExcluirSincronizadosINY == "S";


                //if (esDesdeBitacora)
                //    AditionalFilter = false;

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
                    { "P_EXCLUIR_SINCRONIZADOS_CORRUGADO", (string.IsNullOrEmpty(FiltroExcluirSincronizadosPEADCORR) ? (object)null : FiltroExcluirSincronizadosPEADCORR, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_EXCLUIR_SINCRONIZADOS_INY", (string.IsNullOrEmpty(FiltroExcluirSincronizadosINY) ? (object)null : FiltroExcluirSincronizadosINY, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_FILTRO_POSICION_ID", (string.IsNullOrEmpty(FiltroPosicionId) ? (object)null : FiltroPosicionId, ParameterDirection.Input, HanaDbType.Integer) },
                    { "P_IDS_HERR", (string.IsNullOrEmpty(IdsHerr) ? (object)null : IdsHerr, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_IDS_MTTO", (string.IsNullOrEmpty(IdsMtto) ? (object)null : IdsMtto, ParameterDirection.Input, HanaDbType.NVarChar) },
                    // ✅ Solo se manda 1 si viene de Bitácora, null en caso contrario
                    { "P_LINEA_PROD", (esDesdeBitacora ? (object)1 : null, ParameterDirection.Input, HanaDbType.Integer) },
                    // Filtros nuevos (deben ir al final para respetar el orden de parametros del SP)
                    { "P_FILTRO_CLASIFICACION", (string.IsNullOrEmpty(FiltroClasificacion) ? (object)null : FiltroClasificacion, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_FILTRO_EQUIPO", (string.IsNullOrEmpty(FiltroNombreEquipo) ? (object)null : FiltroNombreEquipo, ParameterDirection.Input, HanaDbType.NVarChar) }
                };

                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                    Logic.AD.GCObtenerMantenimientosPorRango,
                    parameters
                );

                // Si HANA devolvio un error en texto plano, propagarlo con su mensaje real
                if (!string.IsNullOrEmpty(resultHana.JsonResult) &&
                    resultHana.JsonResult.TrimStart().StartsWith("Error", StringComparison.OrdinalIgnoreCase))
                {
                    throw new Exception(resultHana.JsonResult);
                }

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
                    try
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

                        if (EsErrorHana(OT))
                        {
                            OTsinGenerar.AppendLine($"Equipo {equipo.IdEquipo} - {equipo.NombreEquipo}");
                        }
                        else
                        {
                            ordenesGeneradas++;
                        }
                    }
                    catch (Exception exItem)
                    {
                        // Un equipo con datos inválidos no debe tumbar el lote completo.
                        OTsinGenerar.AppendLine($"Equipo {equipo?.IdEquipo} - {equipo?.NombreEquipo}: {exItem.Message}");
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
                context.Clients.All.actualizarCalendarioMantenimientos();

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

                // 🔥 VALIDACIÓN DE FIRMA REQUERIDA (solo para OT definitivas; el borrador NO exige firma)
                if (!esBorrador)
                {
                    string rolActual = (Request.Headers["X-Rol-Usuario"] ?? string.Empty).Trim();
                    string firmaRequerida = null;

                    if (string.Equals(rolActual, "TecnicoMtto", StringComparison.OrdinalIgnoreCase))
                        firmaRequerida = "Realizo";
                    else if (string.Equals(rolActual, "SupervisorProduccion", StringComparison.OrdinalIgnoreCase))
                        firmaRequerida = "Superviso";
                    else if (string.Equals(rolActual, "AdminMtto", StringComparison.OrdinalIgnoreCase) ||
                             string.Equals(rolActual, "Administrador", StringComparison.OrdinalIgnoreCase))
                        firmaRequerida = "Mantenimiento";

                    bool tieneRealizo = datos.FirmaRealizo == "SI";
                    bool tieneSuperviso = datos.FirmaSuperviso == "SI";
                    bool tieneMantenimiento = datos.FirmaMantenimiento == "SI";

                    string faltante = null;
                    if (firmaRequerida == "Realizo" && !tieneRealizo) faltante = "Realizó";
                    else if (firmaRequerida == "Superviso" && !tieneSuperviso) faltante = "Supervisó";
                    else if (firmaRequerida == "Mantenimiento" && !tieneMantenimiento) faltante = "Mantenimiento";

                    if (faltante != null)
                    {
                        jsonResponse.Status = "NO";
                        jsonResponse.Message = $"Falta la firma de {faltante}. Capture la firma antes de guardar la orden de trabajo.";
                        jsonResponse.Data = string.Empty;
                        return Json(jsonResponse, JsonRequestBehavior.AllowGet);
                    }

                    // Para roles no mapeados se conserva el comportamiento actual (no se exige firma aquí;
                    // el front ya controla qué firma corresponde a cada rol).
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

                var context = GlobalHost.ConnectionManager.GetHubContext<MantenimientoHub>();
                //NOTIFICAR EN LA WEB SOBRE ACTUALIZACIONES (SIGNAL R)
                string rolQueCambio = Request.Headers["X-Rol-Usuario"] ?? "Desconocido";

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

                    context.Clients.All.actualizarTablaBitacoras(rolQueCambio, "PREVENTIVOS");
                }
                else
                {
                    // En borrador, solo logged
                    System.Diagnostics.Debug.WriteLine($"📝 Borrador guardado sin cambiar estatus para OT {datos.NumeroOrden}");
                }

                context.Clients.All.actualizarTablaMantenimientosPreventivos(rolQueCambio);
                context.Clients.All.actualizarCalendarioMantenimientos();

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
                string ordenLimpia = SanitizarSegmentoRuta(numeroOrden, "SIN_ORDEN");

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

                // Escribir de forma atómica para no perder la firma anterior si algo falla
                string rutaTemporal = rutaCompleta + ".tmp";
                System.IO.File.WriteAllBytes(rutaTemporal, imageBytes);

                if (System.IO.File.Exists(rutaCompleta))
                    System.IO.File.Replace(rutaTemporal, rutaCompleta, null);
                else
                    System.IO.File.Move(rutaTemporal, rutaCompleta);

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
                    if (!EsErrorHana(nuevoId))
                    {
                        insertados++;
                    }
                    else
                    {
                        errores.Add($"{articulo.RefaccionSolicitada}: {nuevoId}");
                    }
                }

                // ✅ Actualizar estatus del mantenimiento SOLO si al menos un artículo se insertó.
                // (Antes se actualizaba incluso cuando todos fallaban y no se revisaba el resultado.)
                string advertenciaEstatus = string.Empty;
                if (insertados > 0)
                {
                    var parametrosOT = new
                    {
                        P_ID_MANTENIMIENTO = RequestData.IdMantenimiento,
                        ORDENTRABAJO = (string)null,
                        P_ESTATUS = RequestData.Estatus,
                        P_USUARIOACTUALIZA = RequestData.UsuarioSolicita
                    };

                    var allparametersOT = Logic.GlobalCommands.ConvertToHanaParameters(parametrosOT, false, null);
                    var ActualizaOT = Logic.GlobalCommands.ExecuteProcedureHanaAuto(Logic.AD.GCActualizaMP, allparametersOT);

                    if (EsErrorHana(ActualizaOT.JsonResult))
                        advertenciaEstatus = " No se pudo actualizar el estatus del mantenimiento.";
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
                    jsonResponse.Message = $"{insertados} artículo(s) insertado(s), {errores.Count} con error." + advertenciaEstatus;
                    jsonResponse.Data = string.Join(" | ", errores);
                }
                else
                {
                    jsonResponse.Status = "SI";
                    jsonResponse.Message = $"Solicitud(es) de refacción insertada(s) correctamente. ({insertados} artículo(s))" + advertenciaEstatus;
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
            var rutasFisicasNuevas = new List<string>();
            bool rutinaGuardada = false;

            try
            {
                // Obtener datos básicos
                var idMantenimiento = Request.Form["idMantenimiento"];
                var idEquipo = Request.Form["idEquipo"];
                var comentarios = Request.Form["comentarios"] ?? string.Empty;
                var usuarioRegistro = Request.Form["usuarioRegistro"]; // Asegúrate de enviarlo desde el front
                var IdOtDetalle = Request.Form["OrdenTrabajo"]; // Asegúrate de enviarlo desde el front
                var Planta = Request.Form["Planta"]; // Asegúrate de enviarlo desde el front
                var actividadesJson = Request.Form["actividades"];

                // Validar datos básicos
                if (string.IsNullOrEmpty(idMantenimiento) || string.IsNullOrEmpty(actividadesJson))
                {
                    throw new Exception("Faltan datos obligatorios (idMantenimiento o actividades).");
                }

                if (string.IsNullOrWhiteSpace(Planta) || string.IsNullOrWhiteSpace(IdOtDetalle))
                {
                    throw new Exception("Faltan datos de planta u orden de trabajo.");
                }

                // 🔥 OBTENER Y GUARDAR LAS IMÁGENES (solo en servidor, no en BD)
                var imagenes = Request.Files;
                List<string> rutasImagenes = new List<string>();
                string plantaSegura = SanitizarSegmentoRuta(Planta, "SIN_PLANTA");
                string ordenSegura = SanitizarSegmentoRuta(IdOtDetalle, "SIN_ORDEN");

                if (imagenes.Count > 0)
                {
                    // Guardar cada imagen
                    for (int i = 0; i < imagenes.Count; i++)
                    {
                        var archivo = imagenes[i];
                        if (archivo == null || archivo.ContentLength <= 0) continue;

                        if (!EsImagenValida(archivo, out string extension))
                            throw new Exception("Solo se permiten imágenes JPG, JPEG, PNG, GIF, WEBP o BMP de máximo 5 MB.");

                        // La carpeta se resuelve y valida dentro de ~/EvidenciaRutinas
                        string carpetaDestino = ObtenerCarpetaEvidencia(Planta, IdOtDetalle);
                        if (!Directory.Exists(carpetaDestino))
                            Directory.CreateDirectory(carpetaDestino);

                        string nombreBase = SanitizarSegmentoRuta(Path.GetFileNameWithoutExtension(archivo.FileName), "evidencia");
                        string nombreArchivo = $"{DateTime.Now:yyyyMMddHHmmss}_{i}_{nombreBase}{extension}";
                        string rutaCompleta = Path.Combine(carpetaDestino, nombreArchivo);
                        archivo.SaveAs(rutaCompleta);

                        rutasFisicasNuevas.Add(rutaCompleta);
                        rutasImagenes.Add($"/EvidenciaRutinas/{plantaSegura}/{ordenSegura}/{nombreArchivo}");
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

                if (EsErrorHana(resultHana.JsonResult))
                {
                    EliminarArchivosFisicos(rutasFisicasNuevas);
                    jsonResponse.Status = "NO";
                    jsonResponse.Message = "No fue posible guardar la rutina.";
                    jsonResponse.Data = string.Empty;
                    return Json(jsonResponse);
                }

                rutinaGuardada = true;

                // Validar si ya se completó la CARÁTULA Y LA RUTINA ONLINE.
                // Si esta validación falla, la rutina ya quedó guardada: se devuelve éxito con advertencia.
                string advertencia = string.Empty;
                try
                {
                    var parametrosMantenimiento = new
                    {
                        P_ID_MANTENIMIENTO = idMantenimiento
                    };

                    var allparametersValidar = Logic.GlobalCommands.ConvertToHanaParameters(parametrosMantenimiento, false, null);

                    var caratulaRutinaCompleta = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                        Logic.AD.GCValidarOTFinalizada,
                        allparametersValidar
                    );

                    if (EsErrorHana(caratulaRutinaCompleta.JsonResult))
                    {
                        advertencia = " No se pudo validar si la OT quedó finalizada.";
                    }
                    else if (!string.IsNullOrEmpty(caratulaRutinaCompleta.JsonResult) && caratulaRutinaCompleta.JsonResult != "[]")
                    {
                        JArray carrut = JArray.Parse(caratulaRutinaCompleta.JsonResult);
                        if (carrut.Count > 0)
                        {
                            string otFinalizada = carrut[0]["ORDEN_TRABAJO_FINALIZADA"]?.ToString();
                            string rutinaCompletada = carrut[0]["RUTINA_COMPLETADA"]?.ToString();

                            if (otFinalizada == "SI" && rutinaCompletada == "SI")
                            {
                                var parametrosFinOT = new
                                {
                                    P_ID_MANTENIMIENTO = idMantenimiento,
                                    P_ESTATUS = 4,
                                    P_USUARIO_ACTUALIZA = usuarioRegistro
                                };

                                var allparametersFin = Logic.GlobalCommands.ConvertToHanaParameters(parametrosFinOT, false, null);
                                var actualizaOT = Logic.GlobalCommands.ExecuteProcedureHanaAuto(Logic.AD.GCActualizaMP, allparametersFin);

                                if (EsErrorHana(actualizaOT.JsonResult))
                                    advertencia = " No se pudo actualizar el estatus de la OT.";
                            }
                        }
                    }
                }
                catch (Exception exValidacion)
                {
                    System.Diagnostics.Debug.WriteLine("No se pudo validar la finalización de la OT: " + exValidacion.Message);
                    advertencia = " No se pudo validar si la OT quedó finalizada.";
                }

                // Construir respuesta JSON
                jsonResponse.Status = "SI";
                jsonResponse.Message = $"Rutina guardada correctamente. {rutasImagenes.Count} imagen(es) guardada(s)." + advertencia;
                jsonResponse.Data = string.Empty;

                return Json(jsonResponse);
            }
            catch (Exception ex)
            {
                if (!rutinaGuardada)
                    EliminarArchivosFisicos(rutasFisicasNuevas);

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
            var rutasFisicasNuevas = new List<string>();
            var rutasEliminar = new List<string>();
            bool rutinaGuardada = false;

            try
            {
                // Obtener datos básicos
                var idMantenimiento = Request.Form["idMantenimiento"];
                var idEquipo = Request.Form["idEquipo"];
                var comentarios = Request.Form["comentarios"] ?? string.Empty;
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

                if (string.IsNullOrWhiteSpace(Planta) || string.IsNullOrWhiteSpace(IdOtDetalle))
                {
                    throw new Exception("Faltan datos de planta u orden de trabajo.");
                }

                string plantaSegura = SanitizarSegmentoRuta(Planta, "SIN_PLANTA");
                string ordenSegura = SanitizarSegmentoRuta(IdOtDetalle, "SIN_ORDEN");

                // 🔥 VALIDAR IMÁGENES A ELIMINAR (no se borran hasta que el guardado sea exitoso)
                if (!string.IsNullOrEmpty(imagenesEliminadasJson))
                {
                    try
                    {
                        var imagenesEliminadas = JsonConvert.DeserializeObject<List<string>>(imagenesEliminadasJson);
                        if (imagenesEliminadas != null)
                        {
                            foreach (var urlEliminada in imagenesEliminadas)
                            {
                                if (EsRutaEvidenciaValida(urlEliminada, out string rutaFisica))
                                    rutasEliminar.Add(rutaFisica);
                                else
                                    System.Diagnostics.Debug.WriteLine($"Ruta de evidencia rechazada: {urlEliminada}");
                            }
                        }
                    }
                    catch (Exception exDelete)
                    {
                        // No fallar si hay error al interpretar la lista - solo loguear
                        System.Diagnostics.Debug.WriteLine($"⚠️ Error al interpretar imágenes eliminadas: {exDelete.Message}");
                    }
                }

                // 🔥 OBTENER Y GUARDAR LAS IMÁGENES NUEVAS (solo en servidor, no en BD)
                var imagenes = Request.Files;
                List<string> rutasImagenes = new List<string>();

                if (imagenes.Count > 0)
                {
                    // Guardar cada imagen
                    for (int i = 0; i < imagenes.Count; i++)
                    {
                        var archivo = imagenes[i];
                        if (archivo == null || archivo.ContentLength <= 0) continue;

                        if (!EsImagenValida(archivo, out string extension))
                            throw new Exception("Solo se permiten imágenes JPG, JPEG, PNG, GIF, WEBP o BMP de máximo 5 MB.");

                        // La carpeta se resuelve y valida dentro de ~/EvidenciaRutinas
                        string carpetaDestino = ObtenerCarpetaEvidencia(Planta, IdOtDetalle);
                        if (!Directory.Exists(carpetaDestino))
                            Directory.CreateDirectory(carpetaDestino);

                        string nombreBase = SanitizarSegmentoRuta(Path.GetFileNameWithoutExtension(archivo.FileName), "evidencia");
                        string nombreArchivo = $"{DateTime.Now:yyyyMMddHHmmss}_{i}_{nombreBase}{extension}";
                        string rutaCompleta = Path.Combine(carpetaDestino, nombreArchivo);
                        archivo.SaveAs(rutaCompleta);

                        rutasFisicasNuevas.Add(rutaCompleta);
                        rutasImagenes.Add($"/EvidenciaRutinas/{plantaSegura}/{ordenSegura}/{nombreArchivo}");
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

                // 🔥 EJECUTAR STORED PROCEDURE PARA BORRADOR (mismo SP existente)
                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                    Logic.AD.GCGuardarRutinaMP,
                    allparameters
                );

                if (EsErrorHana(resultHana.JsonResult))
                {
                    EliminarArchivosFisicos(rutasFisicasNuevas);
                    jsonResponse.Status = "NO";
                    jsonResponse.Message = "No fue posible guardar el borrador de la rutina.";
                    jsonResponse.Data = string.Empty;
                    return Json(jsonResponse);
                }

                rutinaGuardada = true;

                // Solo después de guardar correctamente se eliminan las imágenes marcadas
                int imagenesEliminadasCount = 0;
                foreach (var rutaFisica in rutasEliminar)
                {
                    try
                    {
                        if (System.IO.File.Exists(rutaFisica))
                        {
                            System.IO.File.Delete(rutaFisica);
                            imagenesEliminadasCount++;
                        }
                    }
                    catch (Exception exDelete)
                    {
                        System.Diagnostics.Debug.WriteLine($"⚠️ Error al eliminar imagen: {exDelete.Message}");
                    }
                }

                // Construir respuesta JSON
                jsonResponse.Status = "SI";
                jsonResponse.Message = $"Borrador de rutina guardado correctamente. {rutasImagenes.Count} imagen(es) nueva(s) guardada(s). {imagenesEliminadasCount} imagen(es) eliminada(s).";
                jsonResponse.Data = string.Empty;

                return Json(jsonResponse);
            }
            catch (Exception ex)
            {
                if (!rutinaGuardada)
                    EliminarArchivosFisicos(rutasFisicasNuevas);

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

                    // ── Fechas de reprogramación (solo si NO es siguiente mes) ───────
                    DateTime fechaRepInicio = DateTime.MinValue;
                    DateTime fechaRepFin = DateTime.MinValue;

                    if (!datos.EnviarSiguienteMes)
                    {
                        if (string.IsNullOrEmpty(datos.FechaRepInicio) || string.IsNullOrEmpty(datos.FechaRepFin))
                            throw new Exception("Ingrese las fechas de reprogramación.");

                        if (!DateTime.TryParse(datos.FechaRepInicio, out fechaRepInicio))
                            throw new Exception("Formato de fecha de reprogramación inicio inválido.");

                        if (!DateTime.TryParse(datos.FechaRepFin, out fechaRepFin))
                            throw new Exception("Formato de fecha de reprogramación fin inválido.");

                        if (fechaRepFin < fechaRepInicio)
                            throw new Exception("La fecha fin de reprogramación no puede ser anterior a la fecha inicio.");
                    }
                    // ─────────────────────────────────────────────────────────────

                    // Construir parámetros para el stored procedure
                    var parametros = new
                    {
                        p_ID_SOLIICTUD = datos.IdSolicitud,
                        p_ID_EQUIPO = datos.IdEquipo,
                        p_NUMERO_ORDEN = string.IsNullOrEmpty(datos.NumeroOrden) ? (object)DBNull.Value : datos.NumeroOrden,
                        p_FECHA_REP_INICIO = datos.EnviarSiguienteMes ? (object)DBNull.Value : fechaRepInicio,
                        p_FECHA_REP_FIN = datos.EnviarSiguienteMes ? (object)DBNull.Value : fechaRepFin,
                        P_ENVIAR_SIGUIENTE_MES = datos.EnviarSiguienteMes,
                        p_MOTIVO = datos.Motivo,
                        p_USUARIO_SOLICITA = datos.UsuarioSolicita,
                        p_ID_PERIODICIDAD = datos.IdPeriodicidad,
                        p_PLANTA = datos.Planta.Value,
                        p_ESTATUS = datos.FueReprogramado == "SI" ? null : "Creada"
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

                                if (estatus == "Aceptada" || estatus == "SI" || estatus == "Pendiente" || estatus == "NA")
                                {
                                    jsonResponse.Status = "SI";
                                    jsonResponse.Message = $"Solicitud de reprogramación registrada correctamente. ID: {idSolicitud}";
                                    jsonResponse.Data = idSolicitud.ToString();

                                    // Notificar cambios en tiempo real (SignalR)
                                    string rolQueCambio = Request.Headers["X-Rol-Usuario"] ?? "Desconocido";
                                    var context = GlobalHost.ConnectionManager.GetHubContext<MantenimientoHub>();
                                    context.Clients.All.actualizarTablaMantenimientosPreventivos(rolQueCambio);
                                    context.Clients.All.actualizarCalendarioMantenimientos();
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
                        p_FECHA_REP_INICIO = (DateTime?)null,
                        p_FECHA_REP_FIN = (DateTime?)null,
                        p_ENVIAR_SIGUIENTE_MES = true,
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