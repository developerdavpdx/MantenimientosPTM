using MantenimientosPTM.Models.Dto;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Sap.Data.Hana;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
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
        readonly LogicaPlaneacion logicaPlaneacion = new LogicaPlaneacion();

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
        public ActionResult Produccion_iny()
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
                List<AccesoDatosProduccion.ParoProduccionSS> filas = new List<ParoProduccionSS>();

                if (!string.IsNullOrEmpty(resultHana.JsonResult) && resultHana.JsonResult != "[]")
                {
                    filas = JsonConvert.DeserializeObject<List<ParoProduccionSS>>(resultHana.JsonResult);
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

                    RequestData = JsonConvert.DeserializeObject<List<TiemposMuertosProduccionPVC>>(jsonData);
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
            string FiltroLinea,
            string FiltroPlanta,
            string FiltroTurno,      // 🔥 NUEVO
            string FiltroProducto)   // 🔥 NUEVO
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
                    { "P_FECHA_INICIO", (dtFechaInicio.ToString("yyyy-MM-dd"), ParameterDirection.Input, HanaDbType.Date) },
                    { "P_FECHA_FIN",    (dtFechaFin.ToString("yyyy-MM-dd"),    ParameterDirection.Input, HanaDbType.Date) },
                    { "P_LINEA",        (string.IsNullOrEmpty(FiltroLinea)    ? (object)null : FiltroLinea,    ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_PLANTA",       (string.IsNullOrEmpty(FiltroPlanta)   ? (object)null : FiltroPlanta,   ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_TURNO",        (string.IsNullOrEmpty(FiltroTurno)    ? (object)null : FiltroTurno,    ParameterDirection.Input, HanaDbType.NVarChar) }, // 🔥 NUEVO
                    { "P_PRODUCTO",     (string.IsNullOrEmpty(FiltroProducto) ? (object)null : FiltroProducto, ParameterDirection.Input, HanaDbType.NVarChar) }  // 🔥 NUEVO
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
        string FiltroPlanta,
        string FiltroTurno,      // 🔥 NUEVO
        string FiltroProducto)
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
                    { "P_FECHA_INICIO", (dtFechaInicio.ToString("yyyy-MM-dd"), ParameterDirection.Input, HanaDbType.Date) },
                    { "P_FECHA_FIN",    (dtFechaFin.ToString("yyyy-MM-dd"),    ParameterDirection.Input, HanaDbType.Date) },
                    { "P_LINEA",        (string.IsNullOrEmpty(FiltroLinea)    ? (object)null : FiltroLinea,    ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_PLANTA",       (string.IsNullOrEmpty(FiltroPlanta)   ? (object)null : FiltroPlanta,   ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_TURNO",        (string.IsNullOrEmpty(FiltroTurno)    ? (object)null : FiltroTurno,    ParameterDirection.Input, HanaDbType.NVarChar) }, // 🔥 NUEVO
                    { "P_PRODUCTO",     (string.IsNullOrEmpty(FiltroProducto) ? (object)null : FiltroProducto, ParameterDirection.Input, HanaDbType.NVarChar) }  // 🔥 NUEVO
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

        [HttpGet]
        public JsonResult GetTiemposMuertosINY(
        string FiltroFechaInicio,
        string FiltroFechaFin,
        string FiltroPlanta,
        string FiltroLinea,
        string FiltroTurno,      // 🔥 NUEVO
        string FiltroProducto)
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

                var parameters = new Dictionary<string, (object value, ParameterDirection direction, HanaDbType type)>
                {
                    { "P_FECHA_INICIO", (dtFechaInicio.ToString("yyyy-MM-dd"), ParameterDirection.Input, HanaDbType.Date) },
                    { "P_FECHA_FIN", (dtFechaFin.ToString("yyyy-MM-dd"), ParameterDirection.Input, HanaDbType.Date) },
                    { "P_LINEA", (string.IsNullOrEmpty(FiltroLinea) ? (object)null : FiltroLinea, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_PLANTA", (string.IsNullOrEmpty(FiltroPlanta)   ? (object)null : FiltroPlanta,   ParameterDirection.Input, HanaDbType.NVarChar) },
                };

                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                    Logic.AD.GCConsultarTiemposMuertosINY,
                    parameters
                );

                if (resultHana.JsonResult == "[]")
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {
                        Status = "NO",
                        Message = "No se encontraron registros de tiempos muertos INY, se mostrará la plantilla por default.",
                        Data = string.Empty
                    };
                }
                else if (resultHana.JsonResult.Contains("Error"))
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {
                        Status = "ERROR",
                        Message = "Error al consultar tiempos muertos INY: " + resultHana.JsonResult,
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
                    Message = "Error al consultar tiempos muertos INY: " + ex.ToString(),
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
        string FiltroPlanta,
        string FiltroTurno,      // 🔥 NUEVO
        string FiltroProducto)
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
                    { "P_FECHA_INICIO", (dtFechaInicio.ToString("yyyy-MM-dd"), ParameterDirection.Input, HanaDbType.Date) },
                    { "P_FECHA_FIN",    (dtFechaFin.ToString("yyyy-MM-dd"),    ParameterDirection.Input, HanaDbType.Date) },
                    { "P_LINEA",        (string.IsNullOrEmpty(FiltroLinea)    ? (object)null : FiltroLinea,    ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_PLANTA",       (string.IsNullOrEmpty(FiltroPlanta)   ? (object)null : FiltroPlanta,   ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_TURNO",        (string.IsNullOrEmpty(FiltroTurno)    ? (object)null : FiltroTurno,    ParameterDirection.Input, HanaDbType.NVarChar) }, // 🔥 NUEVO
                    { "P_PRODUCTO",     (string.IsNullOrEmpty(FiltroProducto) ? (object)null : FiltroProducto, ParameterDirection.Input, HanaDbType.NVarChar) }  // 🔥 NUEVO
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
        public JsonResult GuardarTiemposMuertosINY()
        {
            var jsonResponse = new GlobalCommands.JsonResponseMtto();
            List<AccesoDatosProduccion.TiemposMuertosProduccionINY> RequestData;

            try
            {
                Request.InputStream.Position = 0;

                using (var reader = new StreamReader(Request.InputStream))
                {
                    string jsonData = reader.ReadToEnd();

                    if (string.IsNullOrEmpty(jsonData))
                        throw new Exception("No se recibió información.");

                    RequestData = JsonConvert.DeserializeObject<List<AccesoDatosProduccion.TiemposMuertosProduccionINY>>(jsonData);
                }

                foreach (var registro in RequestData)
                {
                    var allparameters = Logic.GlobalCommands.ConvertToHanaParameters(registro, true, null);

                    var parameters = allparameters.ToDictionary(p => p.Key, p => p.Value);

                    var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                        Logic.AD.GCGuardarTiemposMuertosINY,
                        parameters
                    );

                    if (resultHana.JsonResult.Contains("ERROR") || resultHana.JsonResult.Contains("Error"))
                    {
                        jsonResponse.Status = "NO";
                        jsonResponse.Message = $"Error al guardar registros INY: {resultHana.JsonResult}";
                        jsonResponse.Data = string.Empty;

                        return Json(jsonResponse);
                    }
                }

                jsonResponse.Status = "SI";
                jsonResponse.Message = "Registros INY guardados correctamente.";
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
                    string logoPath;
                    string plantillaHtml = ObtenerPlantillaCorreoProduccionConExcel(usuario, planta, tipoReporte, out logoPath);

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

                                    // En vez de mail.Body = plantillaHtml, usamos AlternateView para poder anexar el logo
                                    AlternateView vistaHtml = AlternateView.CreateAlternateViewFromString(plantillaHtml, null, "text/html");

                                    if (!string.IsNullOrEmpty(logoPath))
                                    {
                                        LinkedResource logo = new LinkedResource(logoPath, "image/png");
                                        logo.ContentId = "logoPTM"; // debe coincidir con el cid del HTML
                                        vistaHtml.LinkedResources.Add(logo);
                                    }

                                    mail.AlternateViews.Add(vistaHtml);

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
        private string ObtenerPlantillaCorreoProduccionConExcel(string usuario, string planta, string tipoReporte, out string logoPath)
        {
            // Obtener logo en base64
            logoPath = ObtenerRutaLogo();
            string logoCid = "logoPTM";


            string html = @"
                <!DOCTYPE html>
                <html lang='es'>
                <head>
                    <meta charset='UTF-8'>
                    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
                    <meta http-equiv='X-UA-Compatible' content='IE=edge'>
                    <title>Reporte de Producción</title>
                </head>
                <body style='margin:0; padding:0; background-color:#f5f5f5; font-family: Tahoma, Geneva, Verdana, sans-serif;'>

                    <!-- Wrapper -->
                    <table role='presentation' width='100%' cellpadding='0' cellspacing='0' style='background-color:#f5f5f5;'>
                        <tr>
                            <td align='center' style='padding:20px 10px;'>

                                <!-- Contenedor principal -->
                                <table role='presentation' width='800' cellpadding='0' cellspacing='0' style='max-width:800px; width:100%; background-color:#f5f5f5;'>

                                    <!-- HEADER -->
                                    <tr>
                                        <td style='background-color:#0058a1; padding:20px 30px; border-radius:10px 10px 0 0;'>
                                            <table role='presentation' width='100%' cellpadding='0' cellspacing='0'>
                                                <tr>
                                                    <td style='width:70%; vertical-align:middle;'>
                                                        <h1 style='margin:0; font-size:24px; color:#ffffff; font-weight:bold; font-family: Tahoma, Geneva, Verdana, sans-serif;'>
                                                            &#128202; Reporte de Producción " + tipoReporte + @"
                                                        </h1>
                                                        <p style='margin:5px 0 0 0; color:#ffffff; font-size:13px; font-family: Tahoma, Geneva, Verdana, sans-serif;'>
                                                            Sistema de Gestión de Tiempos Muertos
                                                        </p>
                                                    </td>
                                                    <td style='width:30%; text-align:right; vertical-align:middle; padding-left:20px;'>
                                                        " + (string.IsNullOrEmpty(logoPath) ? "" : $"<img src='cid:{logoCid}' width='150' height='auto' alt='PTM Logo' style='display:block; max-width:150px;'>") + @"
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>

                                    <!-- CONTENIDO -->
                                    <tr>
                                        <td style='background-color:#ffffff; padding:30px; border-radius:0 0 10px 10px;'>

                                            <!-- Info general -->
                                            <table role='presentation' width='100%' cellpadding='0' cellspacing='0' style='background-color:#e8f4f8; border-left:4px solid #0058a1; margin:0 0 20px 0;'>
                                                <tr>
                                                    <td style='padding:15px; font-family: Tahoma, Geneva, Verdana, sans-serif; font-size:14px; color:#333333;'>
                                                        <strong style='color:#0058a1;'>&#128203; Información General:</strong>
                                                        <table role='presentation' cellpadding='0' cellspacing='0' style='margin-top:10px;'>
                                                            <tr><td style='padding:2px 0;'><strong>Planta:</strong> " + planta + @"</td></tr>
                                                            <tr><td style='padding:2px 0;'><strong>Usuario:</strong> " + usuario + @"</td></tr>
                                                            <tr><td style='padding:2px 0;'><strong>Fecha de Generación:</strong> " + DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss") + @"</td></tr>
                                                        </table>
                                                    </td>
                                                </tr>
                                            </table>

                                            <!-- Adjunto -->
                                            <table role='presentation' width='100%' cellpadding='0' cellspacing='0' style='background-color:#d4edda; border:1px solid #c3e6cb; margin:0 0 20px 0;'>
                                                <tr>
                                                    <td style='padding:15px; font-family: Tahoma, Geneva, Verdana, sans-serif; font-size:14px; color:#333333;'>
                                                        <strong style='color:#155724;'>&#128206; Archivo Adjunto:</strong>
                                                        <p style='margin:8px 0 0 0;'>Encontrará anexo el archivo Excel <strong>Produccion_" + tipoReporte + @"</strong> con todos los datos y estilos de causas de tiempos muertos completamente formateado</p>
                                                    </td>
                                                </tr>
                                            </table>

                                            <!-- Contenido del reporte -->
                                            <table role='presentation' width='100%' cellpadding='0' cellspacing='0'>
                                                <tr>
                                                    <td style='font-family: Tahoma, Geneva, Verdana, sans-serif; font-size:14px; color:#333333;'>
                                                        <h3 style='color:#0058a1; margin:0 0 10px 0;'>&#128203; Contenido del Reporte:</h3>
                                                        <ul style='margin:0; padding-left:20px;'>
                                                            <li><strong>Datos Generales:</strong> Mes, Fecha, Línea, Producto, Turno</li>
                                                            <li><strong>Producción:</strong> TR Fabricados, Producción Neta Real, Peso Estándar</li>
                                                            <li><strong>Disponibilidad:</strong> Horas Programadas, Tiempo Disponible</li>
                                                            <li><strong>Tiempos No Disponibles:</strong> Mantenimiento, Control, Cambios, etc.</li>
                                                            <li><strong>Tiempos No Productivos:</strong> Causas de paros, faltas de materiales, etc.</li>
                                                            <li><strong>KPIs:</strong> Porcentajes y métricas calculadas automáticamente</li>
                                                        </ul>
                                                    </td>
                                                </tr>
                                            </table>

                                            <table role='presentation' width='100%' cellpadding='0' cellspacing='0'>
                                                <tr>
                                                    <td style='padding-top:30px; font-family: Tahoma, Geneva, Verdana, sans-serif; font-size:13px; color:#666666;'>
                                                        Si tiene alguna pregunta sobre este reporte, contáctenos a través del sistema de soporte.
                                                    </td>
                                                </tr>
                                            </table>

                                        </td>
                                    </tr>

                                    <!-- FOOTER -->
                                    <tr>
                                        <td style='background-color:#f0f0f0; padding:15px; text-align:center; border-radius:5px;'>
                                            <p style='margin:0; font-family: Tahoma, Geneva, Verdana, sans-serif; font-size:12px; color:#666666;'>
                                                <strong>Plastics Technology de México, S. de R.L. de C.V.</strong><br>
                                                Sistema Automatizado de Mantenimiento y Producción<br>
                                                Este es un correo automático, por favor no responda directamente.
                                            </p>
                                        </td>
                                    </tr>

                                </table>
                                <!-- /Contenedor principal -->

                            </td>
                        </tr>
                    </table>
                    <!-- /Wrapper -->

                </body>
                </html>

            ";
            return html;
        }

        // ========================================
        // OBTENER LOGO
        // ========================================
        private string ObtenerRutaLogo()
        {
            try
            {
                // Intentar primero con LogoPTM.png (versión a color)
                string logoPath = System.IO.Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Content", "Images", "LogoPTMWhite.png");

                if (System.IO.File.Exists(logoPath))
                {
                    return logoPath;
                }

                // Si no existe, intentar con LogoPTMWhite.png
                logoPath = System.IO.Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Content", "Images", "LogoPTMWhite.png");
                if (System.IO.File.Exists(logoPath))
                {
                    return logoPath;
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error leyendo logo: {ex.Message}");
            }

            return string.Empty;
        }

        [HttpPut]
        public JsonResult EliminarParoProduccion(EliminarParoProduccionDTO request)
        {

            var jsonResponse = new GlobalCommands.JsonResponseMtto();

            try
            {
                var parameters = Logic.GlobalCommands.ConvertToHanaParameters(request, true, null);

                // Ejecutar stored procedure para insertar plan
                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(Logic.AD.GCEliminarParoProduccion, parameters);

                if (resultHana.JsonResult.Contains("ERROR") || resultHana.JsonResult.Contains("Error"))
                {
                    // Construir respuesta JSON
                    jsonResponse.Status = "NO";
                    jsonResponse.Message = $"No fue posible eliminar el registro de paro de producción: {resultHana.JsonResult}";
                    jsonResponse.Data = string.Empty;
                    return Json(jsonResponse);
                }

                // Obtener resultado del stored
                var eliminacionR = JArray.Parse(resultHana.JsonResult);
                string estatus = (string)eliminacionR[0]["ESTATUS"];
                string mensaje = (string)eliminacionR[0]["MENSAJE"];

                jsonResponse.Status = estatus == "OK" ? "SI" : "NO";
                jsonResponse.Message = mensaje;
                jsonResponse.Data = resultHana.JsonResult;

                return Json(jsonResponse);
            }
            catch (Exception ex)
            {
                jsonResponse.Status = "ERROR";
                jsonResponse.Message = "No fue posible eliminar el registro de paro producción: " + ex.Message;
                jsonResponse.Data = string.Empty;
                return Json(jsonResponse);
            }
        }

        // GET: /TuControlador/GetAllPt
        [HttpGet]
        public JsonResult GetProductoTerminadoNewScale()
        {
            GlobalCommands.JsonResponseMtto jsonResponse;
            try
            {
                string plantaHeader = Request.Headers["Planta"];
                string proceso = Request.Headers["Proceso"];
                string FiltroTurno = Request.Headers["Turno"];

                // 🔥 NUEVO: leer fechas del filtro
                string filtroFechaInicio = Request.Headers["FechaInicio"];
                string filtroFechaFin = Request.Headers["FechaFin"];

                if (string.IsNullOrEmpty(plantaHeader) || string.IsNullOrEmpty(proceso))
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {
                        Status = "ERROR",
                        Message = "Headers 'Planta' y 'Proceso' son requeridos.",
                        Data = string.Empty
                    };
                    return Json(jsonResponse, JsonRequestBehavior.AllowGet);
                }

                int numplanta = int.Parse(plantaHeader);
                int turno = 0;
                DateTime TurnoStar = DateTime.Now;
                DateTime TurnoEnd = DateTime.Now;
                DateTime TurnoScrapStar = DateTime.Now;
                DateTime TurnoScrapEnd = DateTime.Now;

                DateTime horaInicioTurno = DateTime.Today.AddHours(4.5).AddSeconds(1);
                DateTime horaFinTurno = DateTime.Today.AddHours(16.5);
                DateTime horaActual = DateTime.Now;

                string JSONstringSp = string.Empty;
                List<ReportesProdTerm> reportesProdTerm = new List<ReportesProdTerm>();

                // 🔥 NUEVO: ¿el usuario mandó un rango de fechas explícito desde el filtro?
                DateTime fechaInicioParsed = DateTime.MinValue;
                DateTime fechaFinParsed = DateTime.MinValue;

                bool hayFiltroFechas =
                    DateTime.TryParse(filtroFechaInicio, out fechaInicioParsed) &&
                    DateTime.TryParse(filtroFechaFin, out fechaFinParsed);

                if (hayFiltroFechas)
                {
                    DateTime fechaIni = fechaInicioParsed.Date;
                    DateTime fechaFinDia = fechaFinParsed.Date;

                    // 🔥 Si no viene turno explícito, lo deducimos igual que la lógica original (por hora actual)
                    string turnoEfectivo = FiltroTurno;

                    if (string.IsNullOrEmpty(turnoEfectivo) || turnoEfectivo == "null")
                    {
                        bool esTurno1PorHora = horaActual >= horaInicioTurno && horaActual <= horaFinTurno;
                        turnoEfectivo = esTurno1PorHora ? "1" : "2";
                    }

                    if (turnoEfectivo == "1")
                    {
                        turno = 1;

                        // Turno 1: 4:30:01am a 4:30pm del mismo día
                        TurnoStar = fechaIni.AddHours(4.5).AddSeconds(1);
                        TurnoEnd = fechaFinDia.AddHours(16.5);

                        TurnoScrapStar = fechaIni.AddHours(5).AddMinutes(45).AddSeconds(1);
                        TurnoScrapEnd = fechaFinDia.AddHours(17).AddMinutes(45);
                    }
                    else // turnoEfectivo == "2"
                    {
                        turno = 2;

                        // Turno 2: 4:30:01pm del día a 4:30am del día siguiente
                        TurnoStar = fechaIni.AddHours(16.5).AddSeconds(1);
                        TurnoEnd = fechaFinDia.AddDays(1).AddHours(4.5);

                        TurnoScrapStar = fechaIni.AddHours(17).AddMinutes(45).AddSeconds(1);
                        TurnoScrapEnd = fechaFinDia.AddDays(1).AddHours(5).AddMinutes(45);
                    }
                }
                else if (FiltroTurno == null || FiltroTurno == "null")
                {
                    // Asignar turno y rangos de fechas (lógica original: turno actual por hora del sistema)
                    if (horaActual >= horaInicioTurno && horaActual <= horaFinTurno)
                    {
                        turno = 1;

                        TurnoStar = DateTime.Today.AddHours(4.5).AddSeconds(1);
                        TurnoEnd = DateTime.Today.AddHours(16.5);
                        TurnoScrapStar = DateTime.Today.AddHours(5).AddMinutes(45).AddSeconds(1);
                        TurnoScrapEnd = DateTime.Today.AddHours(17).AddMinutes(45);
                    }
                    else
                    {
                        turno = 2;

                        TurnoStar = DateTime.Today.AddHours(16.5).AddSeconds(1);
                        TurnoEnd = DateTime.Today.AddDays(1).AddHours(4.5);
                        TurnoScrapStar = DateTime.Today.AddHours(17).AddMinutes(45).AddSeconds(1);
                        TurnoScrapEnd = DateTime.Today.AddDays(1).AddHours(5).AddMinutes(45);

                        if (horaActual.Hour >= 0 && horaActual.Hour < 4 ||
                           (horaActual.Hour == 4 && horaActual.Minute <= 30))
                        {
                            TurnoStar = TurnoStar.AddDays(-1);
                            TurnoEnd = TurnoEnd.AddDays(-1);
                            TurnoScrapStar = TurnoScrapStar.AddDays(-1);
                            TurnoScrapEnd = TurnoScrapEnd.AddDays(-1);
                        }
                    }
                }
                else
                {
                    if (FiltroTurno == "1")
                    {
                        turno = 1;

                        TurnoStar = DateTime.Today.AddHours(4.5).AddSeconds(1);
                        TurnoEnd = DateTime.Today.AddHours(16.5);
                        TurnoScrapStar = DateTime.Today.AddHours(5).AddMinutes(45).AddSeconds(1);
                        TurnoScrapEnd = DateTime.Today.AddHours(17).AddMinutes(45);
                    }
                    else
                    {
                        turno = 2;

                        TurnoStar = DateTime.Today.AddHours(16.5).AddSeconds(1);
                        TurnoEnd = DateTime.Today.AddDays(1).AddHours(4.5);
                        TurnoScrapStar = DateTime.Today.AddHours(17).AddMinutes(45).AddSeconds(1);
                        TurnoScrapEnd = DateTime.Today.AddDays(1).AddHours(5).AddMinutes(45);

                        if (horaActual.Hour >= 0 && horaActual.Hour < 4 ||
                           (horaActual.Hour == 4 && horaActual.Minute <= 30))
                        {
                            TurnoStar = TurnoStar.AddDays(-1);
                            TurnoEnd = TurnoEnd.AddDays(-1);
                            TurnoScrapStar = TurnoScrapStar.AddDays(-1);
                            TurnoScrapEnd = TurnoScrapEnd.AddDays(-1);
                        }
                    }
                }

                double horas = (horaActual - horaInicioTurno).TotalHours;
                int horasT = Convert.ToInt32(horas);
                string ConectionStringSQL = ConfigurationManager.ConnectionStrings["SQLConnection"].ConnectionString;

                using (SqlConnection cnn = new SqlConnection(ConectionStringSQL))
                {
                    if (cnn.State == ConnectionState.Closed)
                        cnn.Open();

                    using (SqlCommand command = new SqlCommand())
                    {
                        command.Connection = cnn;
                        command.CommandText = "Sppdx_ObtenerProductosTerminados";
                        command.CommandType = CommandType.StoredProcedure;

                        command.Parameters.AddWithValue("@turno", turno);
                        command.Parameters.AddWithValue("@proceso", proceso);
                        command.Parameters.AddWithValue("@FechaTurnoInicio", TurnoStar);
                        command.Parameters.AddWithValue("@FechaTurnoFin", TurnoEnd);
                        command.Parameters.AddWithValue("@Horas", horasT == 0 ? 1 : horasT);
                        command.Parameters.AddWithValue("@Planta", numplanta);
                        command.Parameters.AddWithValue("@FechaTurnoInicioScrap", TurnoScrapStar);
                        command.Parameters.AddWithValue("@FechaTurnoFinScrap", TurnoScrapEnd);

                        // 🔥 Agrega esto para ver exactamente qué parámetros van
                        System.Diagnostics.Debug.WriteLine($"turno={turno} proceso={proceso} planta={numplanta}");
                        System.Diagnostics.Debug.WriteLine($"inicio={TurnoStar} fin={TurnoEnd}, hora= {horasT}, FechaTurnoInicioScrap={TurnoScrapStar}, FechaTurnoFinScrap={TurnoScrapEnd}");

                        using (SqlDataAdapter da = new SqlDataAdapter(command))
                        using (DataSet ds = new DataSet())
                        {
                            da.Fill(ds);
                            DataTable tabla1 = ds.Tables[0];

                            System.Diagnostics.Debug.WriteLine($"Filas: {tabla1.Rows.Count}"); // 🔥

                            using (tabla1)
                            {
                                tabla1.Columns.Add("Turno", typeof(int));
                                tabla1.Columns.Add("PesoMinimo", typeof(decimal));
                                tabla1.Columns.Add("KgsDia", typeof(decimal));

                                try
                                {
                                    foreach (DataRow row in tabla1.Rows)
                                    {
                                        var parameters = new Dictionary<string, (object value, ParameterDirection direction, HanaDbType type)>
                                        {
                                            { "P_QUERY", ((object)null, ParameterDirection.Input, HanaDbType.NVarChar) },
                                            { "P_USUARIO", ((object)null, ParameterDirection.Input, HanaDbType.NVarChar) },
                                            { "P_PLANTA", (plantaHeader, ParameterDirection.Input, HanaDbType.NVarChar) },
                                            { "P_LINEA", (row["Id_Linea"], ParameterDirection.Input, HanaDbType.NVarChar) },
                                            { "P_GRUPO_ART", ((object)null, ParameterDirection.Input, HanaDbType.Integer) },
                                            { "P_VALIDAR_CAP", ((object)null, ParameterDirection.Input, HanaDbType.Integer) },
                                            { "P_ITEMCODE", (row["Codigo"], ParameterDirection.Input, HanaDbType.NVarChar) }
                                        };

                                        var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                                            logicaPlaneacion.AD.GCBuscarArticulos,
                                            parameters
                                        );

                                        JArray Articulo = JArray.Parse(resultHana.JsonResult);
                                        decimal KgsDia = Convert.ToDecimal(Articulo[0]["KgsDia"] != null ? (decimal.Parse(Articulo[0]["KgsDia"].ToString()) / 24).ToString() : "0");
                                        decimal PesoMinimo = Convert.ToDecimal(Articulo[0]["PesoMinimo"] != null ? Articulo[0]["PesoMinimo"].ToString() : "0");

                                        row["Turno"] = turno;
                                        row["PesoMinimo"] = PesoMinimo;
                                        row["KgsDia"] = KgsDia;
                                    }
                                }
                                catch (Exception ex)
                                {
                                    System.Diagnostics.Debug.WriteLine($"ERROR foreach: {ex.Message}"); // 🔥
                                    System.Diagnostics.Debug.WriteLine($"Inner: {ex.InnerException?.Message}"); // 🔥
                                    throw; // para que también lo veas en el catch del método
                                }

                                JSONstringSp = JsonConvert.SerializeObject(tabla1);
                                reportesProdTerm = JsonConvert.DeserializeObject<List<ReportesProdTerm>>(JSONstringSp);
                            }
                        }
                    }
                }

                // Armar respuesta homologada
                if (reportesProdTerm == null || reportesProdTerm.Count == 0)
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {
                        Status = "NO",
                        Message = "No se encontraron registros, se mostrará la plantilla por default.",
                        Data = string.Empty
                    };
                }
                else
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {
                        Status = "OK",
                        Message = "Datos obtenidos correctamente.",
                        Data = JSONstringSp
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

    }
}