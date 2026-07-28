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

        #region Métricas OEE

        // ========================================
        // PVC
        // ========================================
        [HttpGet]
        public JsonResult GetMetricasOEE_PVC(
            DateTime? FiltroFechaInicio,
            DateTime? FiltroFechaFin,
            string FiltroLinea,
            string FiltroPlanta)
        {
            GlobalCommands.JsonResponseMtto jsonResponse;

            try
            {
                DateTime dtFechaInicio, dtFechaFin;

                if (FiltroFechaInicio == null || FiltroFechaFin == null)
                {
                    DateTime hoy = DateTime.Now;
                    dtFechaInicio = new DateTime(hoy.Year, hoy.Month, 1);
                    dtFechaFin = dtFechaInicio.AddMonths(1).AddDays(-1);
                }
                else
                {
                    dtFechaInicio = (DateTime)FiltroFechaInicio;
                    dtFechaFin = (DateTime)FiltroFechaFin;
                }

                var parameters = new Dictionary<string, (object Value, ParameterDirection Direction, HanaDbType Type)>
                {
                    { "P_FECHA_INICIO", (dtFechaInicio, ParameterDirection.Input, HanaDbType.Date) },
                    { "P_FECHA_FIN",    (dtFechaFin,    ParameterDirection.Input, HanaDbType.Date) },
                    { "P_LINEA",        (string.IsNullOrEmpty(FiltroLinea)  ? (object)null : FiltroLinea,  ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_PLANTA",       (string.IsNullOrEmpty(FiltroPlanta) ? (object)null : FiltroPlanta, ParameterDirection.Input, HanaDbType.NVarChar) }
                };

                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                    Logic.AD.GCGetMetricasOEE_PVC,
                    parameters
                );

                jsonResponse = BuildResponse(resultHana.JsonResult);
                return Json(jsonResponse, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(new GlobalCommands.JsonResponseMtto { Status = "ERROR", Message = ex.ToString() });
            }
        }

        // ========================================
        // PEAD LISO
        // ========================================
        [HttpGet]
        public JsonResult GetMetricasOEE_PeadLiso(
            DateTime? FiltroFechaInicio,
            DateTime? FiltroFechaFin,
            string FiltroLinea,
            string FiltroPlanta)
        {
            GlobalCommands.JsonResponseMtto jsonResponse;

            try
            {
                DateTime dtFechaInicio, dtFechaFin;

                if (FiltroFechaInicio == null || FiltroFechaFin == null)
                {
                    DateTime hoy = DateTime.Now;
                    dtFechaInicio = new DateTime(hoy.Year, hoy.Month, 1);
                    dtFechaFin = dtFechaInicio.AddMonths(1).AddDays(-1);
                }
                else
                {
                    dtFechaInicio = (DateTime)FiltroFechaInicio;
                    dtFechaFin = (DateTime)FiltroFechaFin;
                }

                var parameters = new Dictionary<string, (object Value, ParameterDirection Direction, HanaDbType Type)>
                {
                    { "P_FECHA_INICIO", (dtFechaInicio, ParameterDirection.Input, HanaDbType.Date) },
                    { "P_FECHA_FIN",    (dtFechaFin,    ParameterDirection.Input, HanaDbType.Date) },
                    { "P_LINEA",        (string.IsNullOrEmpty(FiltroLinea)  ? (object)null : FiltroLinea,  ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_PLANTA",       (string.IsNullOrEmpty(FiltroPlanta) ? (object)null : FiltroPlanta, ParameterDirection.Input, HanaDbType.NVarChar) }
                };

                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                    Logic.AD.GCGetMetricasOEE_PeadLiso,
                    parameters
                );

                jsonResponse = BuildResponse(resultHana.JsonResult);
                return Json(jsonResponse, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(new GlobalCommands.JsonResponseMtto { Status = "ERROR", Message = ex.ToString() });
            }
        }

        // ========================================
        // CORRUGADO
        // ========================================
        [HttpGet]
        public JsonResult GetMetricasOEE_Corrugado(
            DateTime? FiltroFechaInicio,
            DateTime? FiltroFechaFin,
            string FiltroLinea,
            int? FiltroPlanta)  // 🔥 INT porque PLANTA en Corrugado es INT
        {
            GlobalCommands.JsonResponseMtto jsonResponse;

            try
            {
                DateTime dtFechaInicio, dtFechaFin;

                if (FiltroFechaInicio == null || FiltroFechaFin == null)
                {
                    DateTime hoy = DateTime.Now;
                    dtFechaInicio = new DateTime(hoy.Year, hoy.Month, 1);
                    dtFechaFin = dtFechaInicio.AddMonths(1).AddDays(-1);
                }
                else
                {
                    dtFechaInicio = (DateTime)FiltroFechaInicio;
                    dtFechaFin = (DateTime)FiltroFechaFin;
                }

                var parameters = new Dictionary<string, (object Value, ParameterDirection Direction, HanaDbType Type)>
                {
                    { "P_FECHA_INICIO", (dtFechaInicio,                ParameterDirection.Input, HanaDbType.Date) },
                    { "P_FECHA_FIN",    (dtFechaFin,                   ParameterDirection.Input, HanaDbType.Date) },
                    { "P_LINEA",        (string.IsNullOrEmpty(FiltroLinea) ? (object)null : FiltroLinea, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_PLANTA",       (FiltroPlanta ?? (object)null,  ParameterDirection.Input, HanaDbType.Integer) }
                };

                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                    Logic.AD.GCGetMetricasOEE_Corrugado,
                    parameters
                );

                jsonResponse = BuildResponse(resultHana.JsonResult);
                return Json(jsonResponse, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(new GlobalCommands.JsonResponseMtto { Status = "ERROR", Message = ex.ToString() });
            }
        }

        // ========================================
        // 🔥 HELPER — evita repetir el if/else en los 3
        // ========================================
        private GlobalCommands.JsonResponseMtto BuildResponse(string jsonResult)
        {
            if (jsonResult == "[]")
                return new GlobalCommands.JsonResponseMtto
                {
                    Status = "NO",
                    Message = "No se encontraron métricas.",
                    Data = string.Empty
                };

            if (jsonResult.Contains("Error"))
                return new GlobalCommands.JsonResponseMtto
                {
                    Status = "ERROR",
                    Message = jsonResult,
                    Data = string.Empty
                };

            return new GlobalCommands.JsonResponseMtto
            {
                Status = "OK",
                Message = "Métricas obtenidas correctamente.",
                Data = jsonResult
            };
        }

        #endregion
    }
}