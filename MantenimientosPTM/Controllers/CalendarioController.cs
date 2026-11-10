using Sap.Data.Hana;
using System;
using System.Collections.Generic;
using System.Data;
using System.Diagnostics;
using System.Globalization;
using System.Web.Mvc;

namespace MantenimientosPTM.Controllers
{
    public class CalendarioController : Controller
    {
        readonly LogicaEquipos Logic = new LogicaEquipos();

        #region Views
        public ActionResult CalendarioMantenimientos()
        {
            return View();
        }
        #endregion

        #region Endpoints
        [HttpGet]
        public JsonResult GetMantenimientosCompletados(
            string tipoMant = null, 
            int? proceso = null,
            int? lineaProd = null,
            int? Planta = null, 
            string fechaInicio = null, 
            string fechaFin = null,
            string ordenTrabajo = null,
            string clasificacion = null,
            string equipo = null)
        {
            GlobalCommands.JsonResponseMtto jsonResponse;
            try
            {
                int anioActual = DateTime.Now.Year;
                DateTime? dtFechaInicio = null;
                DateTime? dtFechaFin = null;

                // Parsear solo las fechas que vengan; completar únicamente el límite faltante.
                if (!string.IsNullOrWhiteSpace(fechaInicio))
                {
                    if (!TryParseFecha(fechaInicio, out DateTime fi))
                    {
                        return Json(new GlobalCommands.JsonResponseMtto
                        {
                            Status = "NO",
                            Message = "Formato de fecha inicio inválido.",
                            Data = string.Empty
                        }, JsonRequestBehavior.AllowGet);
                    }
                    dtFechaInicio = fi;
                }

                if (!string.IsNullOrWhiteSpace(fechaFin))
                {
                    if (!TryParseFecha(fechaFin, out DateTime ff))
                    {
                        return Json(new GlobalCommands.JsonResponseMtto
                        {
                            Status = "NO",
                            Message = "Formato de fecha fin inválido.",
                            Data = string.Empty
                        }, JsonRequestBehavior.AllowGet);
                    }
                    dtFechaFin = ff;
                }

                if (!dtFechaInicio.HasValue && !dtFechaFin.HasValue)
                {
                    dtFechaInicio = new DateTime(anioActual, 1, 1);
                    dtFechaFin = new DateTime(anioActual, 12, 31);
                }
                else if (!dtFechaInicio.HasValue)
                {
                    dtFechaInicio = new DateTime(dtFechaFin.Value.Year, 1, 1);
                }
                else if (!dtFechaFin.HasValue)
                {
                    dtFechaFin = new DateTime(dtFechaInicio.Value.Year, 12, 31);
                }

                if (dtFechaInicio.Value > dtFechaFin.Value)
                {
                    return Json(new GlobalCommands.JsonResponseMtto
                    {
                        Status = "NO",
                        Message = "La fecha inicio no puede ser mayor a la fecha fin.",
                        Data = string.Empty
                    }, JsonRequestBehavior.AllowGet);
                }

                // Crear parámetros en el formato correcto para HANA
                var parametros = new Dictionary<string, (object Value, ParameterDirection Direction, HanaDbType Type)>
                {
                    {"p_TIPOMANT", (string.IsNullOrWhiteSpace(tipoMant) ? null : (object)tipoMant, ParameterDirection.Input, HanaDbType.NVarChar)},
                    { "p_PROCESO", (proceso != null ? (object)proceso : null, ParameterDirection.Input, HanaDbType.Integer) },
                    { "p_LINEAPROD", (lineaProd != null ? (object)lineaProd : null, ParameterDirection.Input, HanaDbType.Integer) },
                    { "p_FECHA_INICIO", (dtFechaInicio.HasValue ? (object)dtFechaInicio.Value : null, ParameterDirection.Input, HanaDbType.Date) },
                    { "p_FECHA_FIN", (dtFechaFin.HasValue ? (object)dtFechaFin.Value : null, ParameterDirection.Input, HanaDbType.Date) },
                    { "p_PLANTA", (Planta != null ? (object)Planta : null, ParameterDirection.Input, HanaDbType.Integer) },
                    { "p_ORDEN_TRABAJO", (string.IsNullOrWhiteSpace(ordenTrabajo) ? null : (object)ordenTrabajo, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "p_CLASIFICACION", (string.IsNullOrWhiteSpace(clasificacion) ? null : (object)clasificacion, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "p_EQUIPO", (string.IsNullOrWhiteSpace(equipo) ? null : (object)equipo, ParameterDirection.Input, HanaDbType.NVarChar) },

                };

                // Ejecutar el stored procedure con parámetros
                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                    Logic.AD.GCObtenerMantenimientosCompletados,
                    parametros
                );

                if (resultHana.JsonResult == "[]")
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {
                        Status = "NO",
                        Message = $"No se encontraron mantenimientos entre {dtFechaInicio?.ToString("dd/MM/yyyy")} y {dtFechaFin?.ToString("dd/MM/yyyy")}.",
                        Data = string.Empty
                    };
                }
                else if (EsErrorHana(resultHana.JsonResult))
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {
                        Status = "ERROR",
                        Message = "No fue posible obtener los mantenimientos: " + resultHana.JsonResult,
                        Data = string.Empty
                    };
                }
                else
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {
                        Status = "OK",
                        Message = $"Mantenimientos completados obtenidos correctamente.",
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
                    Message = "Error al obtener mantenimientos completados: " + ex.Message,
                    Data = string.Empty
                };
                return Json(jsonResponse, JsonRequestBehavior.AllowGet);
            }
        }

        private static bool EsErrorHana(string jsonResult)
        {
            return !string.IsNullOrEmpty(jsonResult) &&
                   jsonResult.IndexOf("ERROR", StringComparison.OrdinalIgnoreCase) >= 0;
        }

        private static bool TryParseFecha(string valor, out DateTime fecha)
        {
            fecha = default(DateTime);
            if (string.IsNullOrWhiteSpace(valor)) return false;

            if (DateTime.TryParseExact(valor, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out fecha))
                return true;

            return DateTime.TryParse(valor, out fecha);
        }
        #endregion
    }
}