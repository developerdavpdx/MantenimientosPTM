using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Sap.Data.Hana;
using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Web.Mvc;
using static MantenimientosPTM.AccesoDatosProduccion;
using static MantenimientosPTM.EmailNotificationService;

namespace MantenimientosPTM.Controllers
{
    public class ProduccionController : Controller
    {
        readonly LogicaProduccion Logic = new LogicaProduccion();

        #region Views
        public ActionResult Planeacion()
        {
            return View();
        }
        public ActionResult MetricasMtto()
        {
            return View();
        }
        public ActionResult Produccion_peadliso()
        {
            return View();
        }
        public ActionResult Produccion_corrugado()
        {
            return View();
        }
        public ActionResult Produccion_pvc()
        {
            return View();
        }
        public ActionResult ParosProduccion()
        {
            return View();
        }
        public ActionResult CalendarioPlaneacion()
        {
            return View();
        }
        #endregion

        #region Endpoints
        [HttpGet]
        public JsonResult GetCategoriasParo()
        {
            GlobalCommands.JsonResponseMtto jsonResponse;

            try
            {
                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                    Logic.AD.GCGetCategoriasParo,
                    null
                );

                if (resultHana.JsonResult == "[]")
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {
                        Status = "NO",
                        Message = "No fue posible obtener el listado de categorías de paro. No se encontró información.",
                        Data = string.Empty
                    };
                }
                else if (resultHana.JsonResult.Contains("Error"))
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {
                        Status = "ERROR",
                        Message = "No fue posible obtener las categorías de paro: " + resultHana.JsonResult,
                        Data = string.Empty
                    };
                }
                else
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {
                        Status = "OK",
                        Message = "Listado de categorías de paro correctamente.",
                        Data = resultHana.JsonResult
                    };
                }

                return Json(jsonResponse, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                jsonResponse = new GlobalCommands.JsonResponseMtto()
                {
                    Status = "ERROR",
                    Message = "No fue posible obtener las categorías de paro: " + ex.ToString(),
                    Data = string.Empty
                };

                return Json(jsonResponse);
            }
        }

        [HttpPost]
        public JsonResult obtenerParosProduccion()
        {
            GlobalCommands.JsonResponseMtto jsonResponse;

            try
            {

                // ✅ Parámetros de filtros
                string FiltroPlanta = Request.Form["FiltroPlanta"];
                string FiltroFechaInicio = Request.Form["FiltroFechaInicio"];
                string FiltroFechaFin = Request.Form["FiltroFechaFin"];
                string FiltroLinea = Request.Form["FiltroLinea"];
                string FiltroEstatus = Request.Form["FiltroEstatus"];

                // Convertir modelo a parámetros HANA
                // ✅ Preparar parámetros para el SP
                var parameters = new Dictionary<string, (object value, ParameterDirection direction, HanaDbType type)>
                {
                    { "P_PLANTA", (string.IsNullOrEmpty(FiltroPlanta) ? (object)null : FiltroPlanta, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_FECHA_INICIO", (string.IsNullOrEmpty(FiltroFechaInicio) ? (object)null : FiltroFechaInicio, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_FECHA_FIN", (string.IsNullOrEmpty(FiltroFechaFin) ? (object)null : FiltroFechaFin, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_LINEA_PRODUCCION", (string.IsNullOrEmpty(FiltroLinea) ? (object)null : FiltroLinea, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_ESTATUS", (string.IsNullOrEmpty(FiltroEstatus) ? (object)null : FiltroEstatus, ParameterDirection.Input, HanaDbType.NVarChar) },
                };

                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(Logic.AD.GCObtenerParosProduccion, parameters);

                if (resultHana.JsonResult.Contains("Error"))
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {
                        Status = "ERROR",
                        Message = "No fue posible obtener el listado de paros de producción: " + resultHana.JsonResult,
                        Data = string.Empty
                    };
                }
                else
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {

                        Status = "OK",
                        Message = "Listado de paros obtenido correctamente.",
                        Data = resultHana.JsonResult
                    };
                }


                return Json(jsonResponse, JsonRequestBehavior.AllowGet);

            }
            catch (Exception ex)
            {
                jsonResponse = new GlobalCommands.JsonResponseMtto()
                {

                    Status = "ERROR",
                    Message = "No fue posible obtener el listado de paros de producción: " + ex.ToString(),
                    Data = string.Empty
                };

                return Json(jsonResponse);
            }
        }

        [HttpPost]
        public JsonResult obtenerParosProduccionSS()
        {
            try
            {
                // ── Parámetros DataTables ─────────────────────────────────────────────
                string draw = Request.Form["draw"];
                int NroPeticion = !string.IsNullOrEmpty(draw) ? Convert.ToInt32(draw) : 0;

                string length = Request.Form["length"];
                int CantidadRegistros = !string.IsNullOrEmpty(length) ? Convert.ToInt32(length) : 10;

                string start = Request.Form["start"];
                int OmitirRegistros = !string.IsNullOrEmpty(start) ? Convert.ToInt32(start) : 0;

                // ── Filtros del formulario ────────────────────────────────────────────
                string FiltroPlanta = Request.Form["FiltroPlanta"];
                string FiltroFechaInicio = Request.Form["FiltroFechaInicio"];
                string FiltroFechaFin = Request.Form["FiltroFechaFin"];
                string FiltroLinea = Request.Form["FiltroLinea"];
                string FiltroEstatus = Request.Form["FiltroEstatus"];

                // ── Fechas: si no vienen, default al mes actual ───────────────────────
                DateTime dtFechaInicio;
                DateTime dtFechaFin;

                if (string.IsNullOrEmpty(FiltroFechaInicio) || string.IsNullOrEmpty(FiltroFechaFin))
                {
                    DateTime hoy = DateTime.Now;
                    dtFechaInicio = new DateTime(hoy.Year, hoy.Month, 1);
                    dtFechaFin = dtFechaInicio.AddMonths(1).AddDays(-1);
                }
                else
                {
                    dtFechaInicio = DateTime.Parse(FiltroFechaInicio);
                    dtFechaFin = DateTime.Parse(FiltroFechaFin);
                }

                // ── Parámetros para el SP ─────────────────────────────────────────────
                var parametros = new Dictionary<string, (object Value, ParameterDirection Direction, HanaDbType Type)>
                {
                    { "p_PLANTA",            (string.IsNullOrEmpty(FiltroPlanta)  ? (object)null : Convert.ToInt32(FiltroPlanta), ParameterDirection.Input, HanaDbType.Integer) },
                    { "p_FECHA_INICIO",      (dtFechaInicio,                                                                      ParameterDirection.Input, HanaDbType.Date)    },
                    { "p_FECHA_FIN",         (dtFechaFin,                                                                         ParameterDirection.Input, HanaDbType.Date)    },
                    { "p_LINEA_PRODUCCION",  (string.IsNullOrEmpty(FiltroLinea)   ? (object)null : Convert.ToInt32(FiltroLinea),  ParameterDirection.Input, HanaDbType.Integer) },
                    { "p_ESTATUS",           (string.IsNullOrEmpty(FiltroEstatus) ? (object)null : FiltroEstatus,                 ParameterDirection.Input, HanaDbType.VarChar) },
                };

                // ── Ejecutar SP ───────────────────────────────────────────────────────
                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                    Logic.AD.GCObtenerParosProduccion,
                    parametros
                );

                // ── Deserializar resultado ────────────────────────────────────────────
                List<AccesoDatosProduccion.ParoProduccionSS> filas = new List<AccesoDatosProduccion.ParoProduccionSS>();

                if (!string.IsNullOrEmpty(resultHana.JsonResult) && resultHana.JsonResult != "[]")
                {
                    filas = JsonConvert.DeserializeObject<List<AccesoDatosProduccion.ParoProduccionSS>>(resultHana.JsonResult);
                }

                // ── Paginación ────────────────────────────────────────────────────────
                int totalRegistros = filas.Count;

                var filasPaginadas = filas
                    .Skip(OmitirRegistros)
                    .Take(CantidadRegistros)
                    .ToList();

                // ── Respuesta ─────────────────────────────────────────────────────────
                var resultado = Json(new
                {
                    draw = NroPeticion,
                    recordsTotal = totalRegistros,
                    recordsFiltered = totalRegistros,
                    data = filasPaginadas,
                    fechaInicio = dtFechaInicio.ToString("dd/MM/yyyy"),
                    fechaFin = dtFechaFin.ToString("dd/MM/yyyy"),
                    Status = "OK"
                }, JsonRequestBehavior.AllowGet);

                resultado.MaxJsonLength = 2147483644;
                return resultado;
            }
            catch (Exception ex)
            {
                string MethodName = MethodBase.GetCurrentMethod().Name;
                string ControllerName = this.ControllerContext.RouteData.Values["controller"].ToString();

                return Json(new
                {
                    draw = 0,
                    recordsTotal = 0,
                    recordsFiltered = 0,
                    data = new List<object>(),
                    error = $"No es posible obtener los paros de producción. Error: {ex.Message}"
                }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpPost]
        public JsonResult ReanudarParoProduccion()
        {
            var jsonResponse = new GlobalCommands.JsonResponseMtto();
            AccesoDatosProduccion.ReanudarParo RequestData;

            try
            {
                // Leer JSON
                Request.InputStream.Position = 0;
                using (var reader = new StreamReader(Request.InputStream))
                {
                    string jsonData = reader.ReadToEnd();

                    if (string.IsNullOrEmpty(jsonData))
                        throw new Exception("No se recibió información.");

                    RequestData = JsonConvert.DeserializeObject<AccesoDatosProduccion.ReanudarParo>(jsonData);
                }

                // Validar ID
                if (RequestData.ID_PARO == 0)
                    throw new Exception("No se recibió el ID del paro.");


                // Convertir a parámetros HANA
                var allparameters = Logic.GlobalCommands.ConvertToHanaParameters(RequestData, true, null);


                // Ejecutar Stored
                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                    Logic.AD.GCReanudarParoProduccion,
                    allparameters
                );

                if (resultHana.JsonResult.Contains("ERROR") || resultHana.JsonResult.Contains("Error"))
                {
                    jsonResponse.Status = "NO";
                    jsonResponse.Message = $"No fue posible reanudar el paro: {resultHana.JsonResult}";
                    jsonResponse.Data = string.Empty;

                    return Json(jsonResponse);
                }

                var resultado = JArray.Parse(resultHana.JsonResult);

                string estatus = (string)resultado[0]["ESTATUS"];
                string mensaje = (string)resultado[0]["MENSAJE"];

                jsonResponse.Status = (estatus == "OK") ? "SI" : "NO";
                jsonResponse.Message = mensaje;
                jsonResponse.Data = resultHana.JsonResult;

                return Json(jsonResponse);
            }
            catch (Exception ex)
            {
                jsonResponse.Status = "ERROR";
                jsonResponse.Message = "No fue posible reanudar el paro: " + ex.Message;
                jsonResponse.Data = string.Empty;

                return Json(jsonResponse);
            }
        }

        [HttpPost]
        public JsonResult InsertarParoProduccion()
        {
            var jsonResponse = new GlobalCommands.JsonResponseMtto();
            List<AccesoDatosProduccion.ParoProduccion> RequestData;

            try
            {
                Request.InputStream.Position = 0;

                using (var reader = new StreamReader(Request.InputStream))
                {
                    string jsonData = reader.ReadToEnd();

                    if (string.IsNullOrEmpty(jsonData))
                        throw new Exception("No se recibió información.");

                    RequestData = JsonConvert.DeserializeObject<List<AccesoDatosProduccion.ParoProduccion>>(jsonData);
                }

                foreach (var paro in RequestData)
                {
                    var allparameters = Logic.GlobalCommands.ConvertToHanaParameters(paro, true, null);

                    var excludedParams = new[]
                    {
                        "P_ID_PARO",
                        "P_FECHA_PARO",
                        "P_FECHA_REANUDACION",
                        "P_ESTATUS"
                    };

                    var parameters = allparameters
                        .Where(p => !excludedParams.Contains(p.Key))
                        .ToDictionary(p => p.Key, p => p.Value);

                    var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                        Logic.AD.GCInsertarParoProduccion,
                        parameters
                    );

                    if (resultHana.JsonResult.Contains("ERROR") || resultHana.JsonResult.Contains("Error"))
                    {
                        jsonResponse.Status = "NO";
                        jsonResponse.Message = $"No fue posible insertar los paros: {resultHana.JsonResult}";
                        jsonResponse.Data = string.Empty;

                        return Json(jsonResponse);
                    }
                }

                jsonResponse.Status = "SI";
                jsonResponse.Message = "Paros de producción registrados correctamente.";
                jsonResponse.Data = string.Empty;

                return Json(jsonResponse);
            }
            catch (Exception ex)
            {
                jsonResponse.Status = "ERROR";
                jsonResponse.Message = "No fue posible insertar los paros de producción: " + ex.Message;
                jsonResponse.Data = string.Empty;

                return Json(jsonResponse);
            }
        }

        [HttpPost]
        public JsonResult GuardarTiemposMuertosPVC()
        {
            var jsonResponse = new GlobalCommands.JsonResponseMtto();
            List<AccesoDatosProduccion.TiemposMuertosProduccionPVC> RequestData;

            try
            {
                Request.InputStream.Position = 0;

                using (var reader = new StreamReader(Request.InputStream))
                {
                    string jsonData = reader.ReadToEnd();

                    if (string.IsNullOrEmpty(jsonData))
                        throw new Exception("No se recibió información.");

                    RequestData = JsonConvert.DeserializeObject<List<AccesoDatosProduccion.TiemposMuertosProduccionPVC>>(jsonData);
                }

                foreach (var registro in RequestData)
                {
                    var allparameters = Logic.GlobalCommands.ConvertToHanaParameters(registro, true, null);

                    var parameters = allparameters.ToDictionary(p => p.Key, p => p.Value);

                    var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                        Logic.AD.GCGuardarTiemposMuertosPVC,
                        parameters
                    );

                    if (resultHana.JsonResult.Contains("ERROR") || resultHana.JsonResult.Contains("Error"))
                    {
                        jsonResponse.Status = "NO";
                        jsonResponse.Message = $"Error al guardar registros: {resultHana.JsonResult}";
                        jsonResponse.Data = string.Empty;

                        return Json(jsonResponse);
                    }
                }

                jsonResponse.Status = "SI";
                jsonResponse.Message = "Registros guardados correctamente.";
                jsonResponse.Data = string.Empty;

                return Json(jsonResponse);
            }
            catch (Exception ex)
            {
                jsonResponse.Status = "ERROR";
                jsonResponse.Message = "Error al guardar: " + ex.Message;
                jsonResponse.Data = string.Empty;

                return Json(jsonResponse);
            }
        }

        [HttpGet]
        public JsonResult GetTiemposMuertosPVC(
        string FiltroFechaInicio,
        string FiltroFechaFin,
        string FiltroLinea)
        {
            GlobalCommands.JsonResponseMtto jsonResponse;

            try
            {

                // ── Fechas: si no vienen, default al mes actual ───────────────────────
                DateTime dtFechaInicio;
                DateTime dtFechaFin;

                if (string.IsNullOrEmpty(FiltroFechaInicio) || string.IsNullOrEmpty(FiltroFechaFin))
                {
                    DateTime hoy = DateTime.Now;
                    dtFechaInicio = new DateTime(hoy.Year, hoy.Month, 1);
                    dtFechaFin = dtFechaInicio.AddMonths(1).AddDays(-1);
                }
                else
                {
                    dtFechaInicio = DateTime.Parse(FiltroFechaInicio);
                    dtFechaFin = DateTime.Parse(FiltroFechaFin);
                }

                // ✅ Preparar parámetros para el SP
                var parameters = new Dictionary<string, (object value, ParameterDirection direction, HanaDbType type)>
                {
                    { "P_FECHA_INICIO", (string.IsNullOrEmpty(dtFechaInicio.ToString("yyyy-MM-dd")) ? (object)null : dtFechaInicio.ToString("yyyy-MM-dd"), ParameterDirection.Input, HanaDbType.Date) },
                    { "P_FECHA_FIN", (string.IsNullOrEmpty(dtFechaFin.ToString("yyyy-MM-dd")) ? (object)null : dtFechaFin.ToString("yyyy-MM-dd"), ParameterDirection.Input, HanaDbType.Date) },
                    { "P_LINEA", (string.IsNullOrEmpty(FiltroLinea) ? (object)null : FiltroLinea, ParameterDirection.Input, HanaDbType.NVarChar) }
                };

                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                    Logic.AD.GCConsultarTiemposMuertosPVC,
                    parameters
                );

                if (resultHana.JsonResult == "[]")
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {
                        Status = "NO",
                        Message = "No se encontraron registros de tiempos muertos, se mostrará la plantilla por default.",
                        Data = string.Empty
                    };
                }
                else if (resultHana.JsonResult.Contains("Error"))
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {
                        Status = "ERROR",
                        Message = "Error al consultar tiempos muertos: " + resultHana.JsonResult,
                        Data = string.Empty
                    };
                }
                else
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {
                        Status = "OK",
                        Message = "Datos obtenidos correctamente.",
                        Data = resultHana.JsonResult
                    };
                }

                return Json(jsonResponse, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                jsonResponse = new GlobalCommands.JsonResponseMtto()
                {
                    Status = "ERROR",
                    Message = "Error al consultar tiempos muertos: " + ex.ToString(),
                    Data = string.Empty
                };

                return Json(jsonResponse, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpGet]
        public JsonResult GetTiemposMuertosCorrugado(
        string FiltroFechaInicio,
        string FiltroFechaFin,
        string FiltroLinea)
        {
            GlobalCommands.JsonResponseMtto jsonResponse;

            try
            {

                DateTime dtFechaInicio;
                DateTime dtFechaFin;

                if (string.IsNullOrEmpty(FiltroFechaInicio) || string.IsNullOrEmpty(FiltroFechaFin))
                {
                    DateTime hoy = DateTime.Now;
                    dtFechaInicio = new DateTime(hoy.Year, hoy.Month, 1);
                    dtFechaFin = dtFechaInicio.AddMonths(1).AddDays(-1);
                }
                else
                {
                    dtFechaInicio = DateTime.Parse(FiltroFechaInicio);
                    dtFechaFin = DateTime.Parse(FiltroFechaFin);
                }

                var parameters = new Dictionary<string, (object value, ParameterDirection direction, HanaDbType type)>
                {
                    { "P_FECHA_INICIO", (string.IsNullOrEmpty(dtFechaInicio.ToString("yyyy-MM-dd")) ? (object)null : dtFechaInicio.ToString("yyyy-MM-dd"), ParameterDirection.Input, HanaDbType.Date) },
                    { "P_FECHA_FIN", (string.IsNullOrEmpty(dtFechaFin.ToString("yyyy-MM-dd")) ? (object)null : dtFechaFin.ToString("yyyy-MM-dd"), ParameterDirection.Input, HanaDbType.Date) },
                    { "P_LINEA", (string.IsNullOrEmpty(FiltroLinea) ? (object)null : FiltroLinea, ParameterDirection.Input, HanaDbType.NVarChar) }
                };

                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                    Logic.AD.GCConsultarTiemposMuertosCorrugado,
                    parameters
                );

                if (resultHana.JsonResult == "[]")
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {
                        Status = "NO",
                        Message = "No se encontraron registros, se mostrará la plantilla por default.",
                        Data = string.Empty
                    };
                }
                else if (resultHana.JsonResult.Contains("Error"))
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {
                        Status = "ERROR",
                        Message = "Error al consultar: " + resultHana.JsonResult,
                        Data = string.Empty
                    };
                }
                else
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {
                        Status = "OK",
                        Message = "Datos obtenidos correctamente.",
                        Data = resultHana.JsonResult
                    };
                }

                return Json(jsonResponse, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                jsonResponse = new GlobalCommands.JsonResponseMtto()
                {
                    Status = "ERROR",
                    Message = "Error al consultar: " + ex.ToString(),
                    Data = string.Empty
                };

                return Json(jsonResponse, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpPost]
        public JsonResult GuardarTiemposMuertosCorrugado()
        {
            var jsonResponse = new GlobalCommands.JsonResponseMtto();
            List<TiemposMuertosProduccionCorrugado> RequestData;

            try
            {
                Request.InputStream.Position = 0;

                using (var reader = new StreamReader(Request.InputStream))
                {
                    string jsonData = reader.ReadToEnd();

                    if (string.IsNullOrEmpty(jsonData))
                        throw new Exception("No se recibió información.");

                    RequestData = JsonConvert.DeserializeObject<List<TiemposMuertosProduccionCorrugado>>(jsonData);
                }

                foreach (var registro in RequestData)
                {
                    var allparameters = Logic.GlobalCommands.ConvertToHanaParameters(registro, true, null);

                    var parameters = allparameters.ToDictionary(p => p.Key, p => p.Value);

                    var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                        Logic.AD.GCGuardarTiemposMuertosCorrugado,
                        parameters
                    );

                    if (resultHana.JsonResult.Contains("ERROR") || resultHana.JsonResult.Contains("Error"))
                    {
                        jsonResponse.Status = "NO";
                        jsonResponse.Message = $"Error al guardar registros: {resultHana.JsonResult}";
                        jsonResponse.Data = string.Empty;

                        return Json(jsonResponse);
                    }
                }

                jsonResponse.Status = "SI";
                jsonResponse.Message = "Registros guardados correctamente.";
                jsonResponse.Data = string.Empty;

                return Json(jsonResponse);
            }
            catch (Exception ex)
            {
                jsonResponse.Status = "ERROR";
                jsonResponse.Message = "Error al guardar: " + ex.Message;
                jsonResponse.Data = string.Empty;

                return Json(jsonResponse);
            }
        }

        [HttpGet]
        public JsonResult GetTiemposMuertosPeadLiso(
        string FiltroFechaInicio,
        string FiltroFechaFin,
        string FiltroLinea)
        {
            GlobalCommands.JsonResponseMtto jsonResponse;

            try
            {

                DateTime dtFechaInicio;
                DateTime dtFechaFin;

                if (string.IsNullOrEmpty(FiltroFechaInicio) || string.IsNullOrEmpty(FiltroFechaFin))
                {
                    DateTime hoy = DateTime.Now;
                    dtFechaInicio = new DateTime(hoy.Year, hoy.Month, 1);
                    dtFechaFin = dtFechaInicio.AddMonths(1).AddDays(-1);
                }
                else
                {
                    dtFechaInicio = DateTime.Parse(FiltroFechaInicio);
                    dtFechaFin = DateTime.Parse(FiltroFechaFin);
                }

                var parameters = new Dictionary<string, (object value, ParameterDirection direction, HanaDbType type)>
        {
            { "P_FECHA_INICIO", (string.IsNullOrEmpty(dtFechaInicio.ToString("yyyy-MM-dd")) ? (object)null : dtFechaInicio.ToString("yyyy-MM-dd"), ParameterDirection.Input, HanaDbType.Date) },
            { "P_FECHA_FIN", (string.IsNullOrEmpty(dtFechaFin.ToString("yyyy-MM-dd")) ? (object)null : dtFechaFin.ToString("yyyy-MM-dd"), ParameterDirection.Input, HanaDbType.Date) },
            { "P_LINEA", (string.IsNullOrEmpty(FiltroLinea) ? (object)null : FiltroLinea, ParameterDirection.Input, HanaDbType.NVarChar) }
        };

                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                    Logic.AD.GCConsultarTiemposMuertosPeadLiso,
                    parameters
                );

                if (resultHana.JsonResult == "[]")
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {
                        Status = "NO",
                        Message = "No se encontraron registros, se mostrará la plantilla por default.",
                        Data = string.Empty
                    };
                }
                else if (resultHana.JsonResult.Contains("Error"))
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {
                        Status = "ERROR",
                        Message = "Error al consultar: " + resultHana.JsonResult,
                        Data = string.Empty
                    };
                }
                else
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {
                        Status = "OK",
                        Message = "Datos obtenidos correctamente.",
                        Data = resultHana.JsonResult
                    };
                }

                return Json(jsonResponse, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                jsonResponse = new GlobalCommands.JsonResponseMtto()
                {
                    Status = "ERROR",
                    Message = "Error al consultar: " + ex.ToString(),
                    Data = string.Empty
                };

                return Json(jsonResponse, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpPost]
        public JsonResult GuardarTiemposMuertosPeadLiso()
        {
            var jsonResponse = new GlobalCommands.JsonResponseMtto();
            List<AccesoDatosProduccion.TiemposMuertosProduccionPeadLiso> RequestData;

            try
            {
                Request.InputStream.Position = 0;

                using (var reader = new StreamReader(Request.InputStream))
                {
                    string jsonData = reader.ReadToEnd();

                    if (string.IsNullOrEmpty(jsonData))
                        throw new Exception("No se recibió información.");

                    RequestData = JsonConvert.DeserializeObject<List<AccesoDatosProduccion.TiemposMuertosProduccionPeadLiso>>(jsonData);
                }

                foreach (var registro in RequestData)
                {
                    var allparameters = Logic.GlobalCommands.ConvertToHanaParameters(registro, true, null);

                    var parameters = allparameters.ToDictionary(p => p.Key, p => p.Value);

                    var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                        Logic.AD.GCGuardarTiemposMuertosPeadLiso,
                        parameters
                    );

                    if (resultHana.JsonResult.Contains("ERROR") || resultHana.JsonResult.Contains("Error"))
                    {
                        jsonResponse.Status = "NO";
                        jsonResponse.Message = $"Error al guardar registros: {resultHana.JsonResult}";
                        jsonResponse.Data = string.Empty;

                        return Json(jsonResponse);
                    }
                }

                jsonResponse.Status = "SI";
                jsonResponse.Message = "Registros guardados correctamente.";
                jsonResponse.Data = string.Empty;

                return Json(jsonResponse);
            }
            catch (Exception ex)
            {
                jsonResponse.Status = "ERROR";
                jsonResponse.Message = "Error al guardar: " + ex.Message;
                jsonResponse.Data = string.Empty;

                return Json(jsonResponse);
            }
        }

        [HttpPost]
        public JsonResult AgregarTipoParoProduccion()
        {
            var jsonResponse = new GlobalCommands.JsonResponseMtto();
            AccesoDatosProduccion.NuevaCategoriaParo RequestData;

            try
            {
                Request.InputStream.Position = 0;

                using (var reader = new StreamReader(Request.InputStream))
                {
                    string jsonData = reader.ReadToEnd();

                    if (string.IsNullOrEmpty(jsonData))
                        throw new Exception("No se recibió información.");

                    RequestData = JsonConvert.DeserializeObject<AccesoDatosProduccion.NuevaCategoriaParo>(jsonData);
                }

                var parameters = new Dictionary<string, (object value, ParameterDirection direction, HanaDbType type)>
                {
                    { "P_NOMBRE",(RequestData.Nombre , ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_PLANTA", (RequestData.Planta, ParameterDirection.Input, HanaDbType.NVarChar) },
                };


                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                        Logic.AD.GCIntertarCategoriaParo,
                        parameters
                    );

                    if (resultHana.JsonResult.Contains("ERROR") || resultHana.JsonResult.Contains("Error"))
                    {
                        jsonResponse.Status = "Error";
                        jsonResponse.Message = $"No fue posible insertar la neuva categoria de paro: {resultHana.JsonResult}";
                        jsonResponse.Data = string.Empty;

                        return Json(jsonResponse);
                    }
                

                jsonResponse.Status = "OK";
                jsonResponse.Message = "Categoria de paro de producción registrada correctamente.";
                jsonResponse.Data = string.Empty;

                return Json(jsonResponse);
            }
            catch (Exception ex)
            {
                jsonResponse.Status = "ERROR";
                jsonResponse.Message = "No fue posible insertar la nueva categoria de paro de producción: " + ex.Message;
                jsonResponse.Data = string.Empty;

                return Json(jsonResponse);
            }
        }

        #endregion
    }
}