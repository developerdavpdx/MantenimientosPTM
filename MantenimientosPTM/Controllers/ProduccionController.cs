using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Sap.Data.Hana;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Mail;
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
        string FiltroLinea, string FiltroPlanta)
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
                    { "P_LINEA", (string.IsNullOrEmpty(FiltroLinea) ? (object)null : FiltroLinea, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_PLANTA", (string.IsNullOrEmpty(FiltroPlanta) ? (object)null : FiltroPlanta, ParameterDirection.Input, HanaDbType.NVarChar) }
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
        string FiltroLinea,
        string FiltroPlanta)
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
                    { "P_LINEA", (string.IsNullOrEmpty(FiltroLinea) ? (object)null : FiltroLinea, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_PLANTA", (string.IsNullOrEmpty(FiltroPlanta) ? (object)null : FiltroPlanta, ParameterDirection.Input, HanaDbType.NVarChar) }
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
        string FiltroLinea,
        string FiltroPlanta)
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

                    { "P_LINEA", (string.IsNullOrEmpty(FiltroLinea) ? (object)null : FiltroLinea, ParameterDirection.Input, HanaDbType.NVarChar) },

                    { "P_PLANTA", (string.IsNullOrEmpty(FiltroPlanta) ? (object)null : FiltroPlanta, ParameterDirection.Input, HanaDbType.NVarChar) }
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
            List<TiemposMuertosProduccionPeadLiso> RequestData;

            try
            {
                Request.InputStream.Position = 0;

                using (var reader = new StreamReader(Request.InputStream))
                {
                    string jsonData = reader.ReadToEnd();

                    if (string.IsNullOrEmpty(jsonData))
                        throw new Exception("No se recibió información.");

                    RequestData = JsonConvert.DeserializeObject<List<TiemposMuertosProduccionPeadLiso>>(jsonData);
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

        // ========================================
        // 📧 ENVIAR EXCEL POR CORREO
        // ========================================
        [HttpPost]
        public JsonResult EnviarExcelProduccionPorCorreo()
        {
            GlobalCommands.JsonResponseMtto jsonResponse = new GlobalCommands.JsonResponseMtto();

            try
            {
                // Leer el request body como JSON
                using (StreamReader reader = new StreamReader(Request.InputStream))
                {
                    reader.BaseStream.Position = 0;
                    string json = reader.ReadToEnd();

                    dynamic requestData = JsonConvert.DeserializeObject(json);
                    List<string> correos = JsonConvert.DeserializeObject<List<string>>(requestData["correos"].ToString());
                    string archivoExcelBase64 = requestData["archivoExcelBase64"];
                    string usuario = requestData["usuario"];
                    string planta = requestData["planta"];
                    string tipoReporte = requestData["tipoReporte"] != null ? requestData["tipoReporte"].ToString() : "PVC";

                    if (correos == null || correos.Count == 0)
                    {
                        return Json(new
                        {
                            Status = "ERROR",
                            Message = "No hay correos especificados"
                        });
                    }

                    if (string.IsNullOrEmpty(archivoExcelBase64))
                    {
                        return Json(new
                        {
                            Status = "ERROR",
                            Message = "No se recibió el archivo Excel"
                        });
                    }

                    // Convertir Base64 a bytes
                    byte[] archivoExcel = Convert.FromBase64String(archivoExcelBase64);

                    // Crear plantilla HTML del correo
                    string plantillaHtml = ObtenerPlantillaCorreoProduccionConExcel(usuario, planta, tipoReporte);

                    // Enviar correo a cada destinatario
                    bool todosEnviados = true;
                    string smtpHost = ConfigurationManager.AppSettings["SMTP_HOST"];
                    int smtpPort = int.Parse(ConfigurationManager.AppSettings["SMTP_PORT"] ?? "587");
                    string smtpUser = ConfigurationManager.AppSettings["SMTP_USER"];
                    string smtpPassword = ConfigurationManager.AppSettings["SMTP_PASSWORD"];

                    using (SmtpClient smtpClient = new SmtpClient(smtpHost, smtpPort))
                    {
                        smtpClient.EnableSsl = true;
                        smtpClient.Credentials = new NetworkCredential(smtpUser, smtpPassword);

                        foreach (var correo in correos)
                        {
                            try
                            {
                                using (MailMessage mail = new MailMessage())
                                {
                                    mail.From = new MailAddress(smtpUser, "Sistema de Producción PTM");
                                    mail.To.Add(correo);
                                    mail.Subject = $"Reporte de Producción {tipoReporte} - {DateTime.Now:dd/MM/yyyy}";
                                    mail.Body = plantillaHtml;
                                    mail.IsBodyHtml = true;

                                    // Adjuntar Excel
                                    if (archivoExcel != null && archivoExcel.Length > 0)
                                    {
                                        Attachment attachment = new Attachment(new MemoryStream(archivoExcel),
                                            $"Produccion_{tipoReporte.Replace(" ", "_")}_{DateTime.Now:yyyyMMdd_HHmmss}.xlsx");
                                        attachment.ContentDisposition.CreationDate = DateTime.Now;
                                        attachment.ContentDisposition.ModificationDate = DateTime.Now;
                                        attachment.ContentDisposition.ReadDate = DateTime.Now;
                                        mail.Attachments.Add(attachment);
                                    }

                                    smtpClient.Send(mail);
                                }
                            }
                            catch (Exception ex)
                            {
                                System.Diagnostics.Debug.WriteLine($"Error enviando a {correo}: {ex.Message}");
                                todosEnviados = false;
                            }
                        }
                    }

                    if (todosEnviados)
                    {
                        jsonResponse.Status = "OK";
                        jsonResponse.Message = $"Reporte enviado exitosamente a {correos.Count} destinatarios";
                        jsonResponse.Data = "";
                    }
                    else
                    {
                        jsonResponse.Status = "WARNING";
                        jsonResponse.Message = "Algunos correos no se pudieron enviar correctamente";
                        jsonResponse.Data = "";
                    }
                }

                return Json(jsonResponse);
            }
            catch (Exception ex)
            {
                jsonResponse.Status = "ERROR";
                jsonResponse.Message = $"Error al enviar el correo: {ex.Message}";
                jsonResponse.Data = "";
                return Json(jsonResponse);
            }
        }

        // ========================================
        // GENERA LA PLANTILLA HTML PARA CORREO CON EXCEL
        // ========================================
        private string ObtenerPlantillaCorreoProduccionConExcel(string usuario, string planta, string tipoReporte)
        {
            // Obtener logo en base64
            string logoBase64 = ObtenerLogoEnBase64();

            string html = @"
            <!DOCTYPE html>
            <html lang='es'>
            <head>
                <meta charset='UTF-8'>
                <meta name='viewport' content='width=device-width, initial-scale=1.0'>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                    .container { max-width: 800px; margin: 0 auto; background: #f5f5f5; padding: 20px; border-radius: 10px; }
                    .header { background: linear-gradient(to right, #0058a1, #0070d1); color: white; padding: 20px 30px; border-radius: 10px 10px 0 0; }
                    .header-table { width: 100%; border-collapse: collapse; }
                    .header-content h1 { margin: 0; font-size: 24px; color: #000000; font-weight: bold; text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3); }
                    .header-content p { margin: 5px 0 0 0; opacity: 0.95; color: #000000; font-size: 13px; }
                    .header-logo { text-align: right; vertical-align: middle; }
                    .header-logo img { height: 40px; width: auto; }
                    .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; }
                    .info-box { background: #e8f4f8; border-left: 4px solid #0058a1; padding: 15px; margin: 20px 0; border-radius: 5px; }
                    .info-box strong { color: #0058a1; }
                    .footer { background: #f0f0f0; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 5px; margin-top: 20px; }
                    .attachment-info { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0; }
                    .attachment-info strong { color: #155724; }
                </style>
            </head>
            <body>
                <div class='container'>
                    <div class='header'>
                        <table class='header-table'>
                            <tr>
                                <td class='header-content' style='width: 70%; vertical-align: middle;'>
                                    <h1>📊 Reporte de Producción " + tipoReporte + @"</h1>
                                    <p>Sistema de Gestión de Tiempos Muertos</p>
                                </td>
                                <td class='header-logo' style='width: 30%; text-align: right; vertical-align: middle; padding-left: 20px;'>
                                    " + (string.IsNullOrEmpty(logoBase64) ? "" : $"<img width='150' src='data:image/png;base64,{logoBase64}' alt='PTM Logo'>") + @"
                                </td>
                            </tr>
                        </table>
                    </div>

                    <div class='content'>
                        <h2 style='color: #0058a1; border-bottom: 2px solid #0058a1; padding-bottom: 10px;'>
                        </h2>

                        <div class='info-box'>
                            <strong>📋 Información General:</strong>
                            <ul style='margin: 10px 0; padding-left: 20px;'>
                                <li><strong>Planta:</strong> " + planta + @"</li>
                                <li><strong>Usuario:</strong> " + usuario + @"</li>
                                <li><strong>Fecha de Generación:</strong> " + DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss") + @"</li>
                            </ul>
                        </div>

                        <div class='attachment-info'>
                            <strong>📎 Archivo Adjunto:</strong>
                            <p>Encontrará anexo el archivo Excel <strong>Produccion_" + tipoReporte + @"</strong> con todos los datos y estilos de causas de tiempos muertos completamente formateado</p>
                        </div>

                        <div>
                            <h3 style='color: #0058a1;'>📋 Contenido del Reporte:</h3>
                            <ul>
                                <li><strong>Datos Generales:</strong> Mes, Fecha, Línea, Producto, Turno</li>
                                <li><strong>Producción:</strong> TR Fabricados, Producción Neta Real, Peso Estándar</li>
                                <li><strong>Disponibilidad:</strong> Horas Programadas, Tiempo Disponible</li>
                                <li><strong>Tiempos No Disponibles:</strong> Mantenimiento, Control, Cambios, etc.</li>
                                <li><strong>Tiempos No Productivos:</strong> Causas de paros, faltas de materiales, etc.</li>
                                <li><strong>KPIs:</strong> Porcentajes y métricas calculadas automáticamente</li>
                            </ul>
                        </div>

                        <p style='margin-top: 30px; color: #666;'>
                            Si tiene alguna pregunta sobre este reporte, contáctenos a través del sistema de soporte.
                        </p>
                    </div>

                    <div class='footer'>
                        <p>
                            <strong>Plastics Technology de México, S. de R.L. de C.V.</strong><br>
                            Sistema Automatizado de Mantenimiento y Producción<br>
                            Este es un correo automático, por favor no responda directamente.
                        </p>
                    </div>
                </div>
            </body>
            </html>
            ";
                        return html;
        }

        // ========================================
        // OBTENER LOGO EN BASE64
        // ========================================
        private string ObtenerLogoEnBase64()
        {
            try
            {
                // Intentar primero con LogoPTM.png (versión a color)
                string logoPath = System.IO.Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Content", "Images", "LogoPTM.png");

                if (System.IO.File.Exists(logoPath))
                {
                    byte[] logoBytes = System.IO.File.ReadAllBytes(logoPath);
                    return Convert.ToBase64String(logoBytes);
                }

                // Si no existe, intentar con LogoPTMWhite.png
                logoPath = System.IO.Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Content", "Images", "LogoPTMWhite.png");
                if (System.IO.File.Exists(logoPath))
                {
                    byte[] logoBytes = System.IO.File.ReadAllBytes(logoPath);
                    return Convert.ToBase64String(logoBytes);
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error leyendo logo: {ex.Message}");
            }

            return string.Empty;
        }
    }
}