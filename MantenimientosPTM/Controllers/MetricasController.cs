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
using static MantenimientosPTM.AccesoDatosMetricas;
using static MantenimientosPTM.EmailNotificationService;

namespace MantenimientosPTM.Controllers
{
    public class MetricasController : Controller
    {
        readonly LogicaMetricas Logic = new LogicaMetricas();

        #region Views
        public ActionResult MetricasMtto()
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
        public JsonResult GetMetricasOEE(
        DateTime? FiltroFechaInicio,
        DateTime? FiltroFechaFin,
        string FiltroLinea,
        string FiltroProceso,
        int? FiltroEquipo,
        int? FiltroPlanta
        )
        {
            GlobalCommands.JsonResponseMtto jsonResponse;

            try
            {

                // ✅ Si no vienen fechas, usar el año 2026
                DateTime dtFechaInicio;
                DateTime dtFechaFin;

                if (FiltroFechaInicio == null || FiltroFechaFin == null)
                {
                    DateTime hoy = DateTime.Now;
                    dtFechaInicio = new DateTime(hoy.Year, hoy.Month, 1); // ✅ Primer día del mes actual
                    dtFechaFin = dtFechaInicio.AddMonths(1).AddDays(-1); // ✅ Último día del mes actual
                }
                else
                {
                    dtFechaInicio = (DateTime)FiltroFechaInicio;
                    dtFechaFin = (DateTime)FiltroFechaFin;
                }

                var parameters = new Dictionary<string, (object Value, ParameterDirection Direction, HanaDbType Type)>
            {
                { "P_FECHA_INICIO", (dtFechaInicio, ParameterDirection.Input, HanaDbType.Date) },
                { "P_FECHA_FIN", (dtFechaFin, ParameterDirection.Input, HanaDbType.Date) },
                { "P_LINEA", (string.IsNullOrEmpty(FiltroLinea) ? (object)null : FiltroLinea, ParameterDirection.Input, HanaDbType.NVarChar) },
                { "P_PROCESO", (string.IsNullOrEmpty(FiltroProceso) ? (object)null : FiltroProceso, ParameterDirection.Input, HanaDbType.NVarChar) },
                { "P_EQUIPO", (FiltroEquipo ?? (object)null, ParameterDirection.Input, HanaDbType.Integer) },
                { "P_PLANTA", (FiltroPlanta ?? (object)null, ParameterDirection.Input, HanaDbType.Integer) }
            };

                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                    Logic.AD.GCGetMetricasOEE,
                    parameters
                );

                if (resultHana.JsonResult == "[]")
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {
                        Status = "NO",
                        Message = "No se encontraron métricas.",
                        Data = string.Empty
                    };
                }
                else if (resultHana.JsonResult.Contains("Error"))
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {
                        Status = "ERROR",
                        Message = resultHana.JsonResult,
                        Data = string.Empty
                    };
                }
                else
                {
                   
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {
                        Status = "OK",
                        Message = "Métricas obtenidas correctamente.",
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
                    Message = ex.ToString(),
                    Data = string.Empty
                };

                return Json(jsonResponse);
            }
        }
        #endregion
    }
}