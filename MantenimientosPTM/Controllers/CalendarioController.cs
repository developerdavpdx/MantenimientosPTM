using Sap.Data.Hana;
using System;
using System.Collections.Generic;
using System.Data;
using System.Diagnostics;
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
            string fechaFin = null)
        {
            GlobalCommands.JsonResponseMtto jsonResponse;
            try
            {
                // Si no se proporcionan fechas, usar el año actual completo
                DateTime? dtFechaInicio = null;
                DateTime? dtFechaFin = null;

                if (string.IsNullOrEmpty(fechaInicio) || string.IsNullOrEmpty(fechaFin))
                {
                    // Obtener el año actual completo
                    int anioActual = DateTime.Now.Year;
                    dtFechaInicio = new DateTime(anioActual, 1, 1);
                    dtFechaFin = new DateTime(anioActual, 12, 31);
                }
                else
                {
                    // Parsear las fechas proporcionadas
                    DateTime tempInicio, tempFin;
                    if (DateTime.TryParse(fechaInicio, out tempInicio))
                    {
                        dtFechaInicio = tempInicio;
                    }
                    if (DateTime.TryParse(fechaFin, out tempFin))
                    {
                        dtFechaFin = tempFin;
                    }
                }

                // Crear parámetros en el formato correcto para HANA
                var parametros = new Dictionary<string, (object Value, ParameterDirection Direction, HanaDbType Type)>
                {
                    {"p_TIPOMANTENIMIENTO", (string.IsNullOrWhiteSpace(tipoMant) ? null : (object)tipoMant, ParameterDirection.Input, HanaDbType.VarChar)},
                    { "p_PROCESO", (proceso != null ? (object)proceso : null, ParameterDirection.Input, HanaDbType.Integer) },
                    { "p_LINEAPROD", (lineaProd != null ? (object)lineaProd : null, ParameterDirection.Input, HanaDbType.Integer) },
                    { "p_FECHA_INICIO", (dtFechaInicio.HasValue ? (object)dtFechaInicio.Value : null, ParameterDirection.Input, HanaDbType.Date) },
                    { "p_FECHA_FIN", (dtFechaFin.HasValue ? (object)dtFechaFin.Value : null, ParameterDirection.Input, HanaDbType.Date) },
                    { "p_PLANTA", (Planta != null ? (object)Planta : null, ParameterDirection.Input, HanaDbType.Integer) },

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
                else if (resultHana.JsonResult.Contains("Error"))
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

        // Helper para contar registros en el JSON
        private int ContarRegistros(string jsonResult)
        {
            try
            {
                var array = Newtonsoft.Json.JsonConvert.DeserializeObject<System.Collections.ArrayList>(jsonResult);
                return array?.Count ?? 0;
            }
            catch
            {
                return 0;
            }
        }
        #endregion
    }
}