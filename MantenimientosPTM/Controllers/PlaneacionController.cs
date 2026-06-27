using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Sap.Data.Hana;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Web.Mvc;
using static MantenimientosPTM.EmailNotificationService;
using MantenimientosPTM.Models.Dto;

namespace MantenimientosPTM.Controllers
{
    public class PlaneacionController : Controller
    {
        readonly LogicaPlaneacion Logic = new LogicaPlaneacion();

        #region Views
        public ActionResult Planeacion()
        {
            return View();
        }
        public ActionResult CalendarioPlaneacion()
        {
            return View();
        }
        public ActionResult CalendarioProduccion()
        {
            return View();
        }
        #endregion

        #region Endpoints
        [HttpPost]
        public JsonResult obtenerPlanesProgramados()
        {
            try
            {
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

                string FiltroFechaInicio = Request.Form["FiltroFechaInicio"];
                string FiltroFechaFin = Request.Form["FiltroFechaFin"];
                string FiltroMesAnio = Request.Form["FiltroMesAnio"];
                string FiltroLinea = Request.Form["FiltroLinea"];
                string FiltroPlanta = Request.Form["FiltroPlanta"];
                string FiltroProceso = Request.Form["FiltroProceso"];
                string FiltroIdPlan = Request.Form["FiltroIdPlan"];

                FiltroLinea = string.IsNullOrEmpty(FiltroLinea) ? null : FiltroLinea;
                FiltroProceso = string.IsNullOrEmpty(FiltroProceso) ? null : FiltroProceso;

                DateTime dtFechaInicio;
                DateTime dtFechaFin;

                if (string.IsNullOrEmpty(FiltroMesAnio))
                {
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
                }
                else
                {
                    string[] mesAnio = FiltroMesAnio.Split('-');
                    int anio = int.Parse(mesAnio[0]);
                    int mes = int.Parse(mesAnio[1]);
                    dtFechaInicio = new DateTime(anio, mes, 1);
                    dtFechaFin = dtFechaInicio.AddMonths(1).AddDays(-1);
                }

                var parametros = new Dictionary<string, (object Value, ParameterDirection Direction, HanaDbType Type)>
                {
                    { "p_PLANTA",            (FiltroPlanta, ParameterDirection.Input, HanaDbType.Integer) },
                    { "p_FECHA_INICIO",      (dtFechaInicio, ParameterDirection.Input, HanaDbType.Date)    },
                    { "p_FECHA_FIN",         (dtFechaFin,    ParameterDirection.Input, HanaDbType.Date)    },
                    { "p_LINEA_PRODUCCION",  (FiltroLinea,   ParameterDirection.Input, HanaDbType.Integer) },
                    { "p_PROCESO",  (FiltroProceso,   ParameterDirection.Input, HanaDbType.Integer) },
                    { "p_ID_PLAN",           (FiltroIdPlan,  ParameterDirection.Input, HanaDbType.Integer) }
                };

                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                    Logic.AD.SpPdxMTTOObtenerPlanesProduccion,
                    parametros
                );

                // ── Deserializar filas planas del SP ─────────────────────────────────
                List<AccesoDatosPlaneacion.PlanProduccion> filas = new List<AccesoDatosPlaneacion.PlanProduccion>();

                if (!string.IsNullOrEmpty(resultHana.JsonResult) && resultHana.JsonResult != "[]")
                {
                    filas = JsonConvert.DeserializeObject<List<AccesoDatosPlaneacion.PlanProduccion>>(resultHana.JsonResult);
                }

                // ✅ Agrupar filas por ID_PLAN usando helper centralizado
                var planesAgrupados = AccesoDatosPlaneacion.GroupPlans(filas).Cast<object>().ToList();

                // ── Paginación sobre los planes ya agrupados ──────────────────────────
                int totalRegistrosFiltrados = planesAgrupados.Count;

                var planesPaginados = planesAgrupados
                    .Skip(OmitirRegistros)
                    .Take(CantidadRegistros)
                    .ToList();

                var resultado = Json(new
                {
                    draw = NroPeticion,
                    recordsTotal = totalRegistrosFiltrados,
                    recordsFiltered = totalRegistrosFiltrados,
                    data = planesPaginados,
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
                string msg = $"No es posible obtener los planes de producción, Error: ";

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
        // Agrupación de filas planas a planes con bitácora se realiza en AccesoDatosPlaneacion.GroupPlans

        [HttpPost]
        public JsonResult obtenerOrdenesFabricacion()
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

                // ✅ Parámetros de filtros específicos para órdenes de fabricación
                string FiltroDocEntry = Request.Form["FiltroDocEntry"];
                string FiltroDocNum = Request.Form["FiltroDocNum"];
                string FiltroItemCode = Request.Form["FiltroItemCode"];
                string FiltroWarehouse = Request.Form["FiltroWarehouse"];
                string FiltroStatus = Request.Form["FiltroStatus"];
                string FiltroFechaInicio = Request.Form["FiltroFechaInicio"];
                string FiltroFechaFin = Request.Form["FiltroFechaFin"];
                string FiltroSerie = Request.Form["FiltroSerie"];
                string FiltroPrioridad = Request.Form["FiltroPrioridad"];

                // ✅ Parsear valores numéricos correctamente
                int? docEntry = string.IsNullOrEmpty(FiltroDocEntry) ? (int?)null : Convert.ToInt32(FiltroDocEntry);
                int? docNum = string.IsNullOrEmpty(FiltroDocNum) ? (int?)null : Convert.ToInt32(FiltroDocNum);
                int? prioridad = string.IsNullOrEmpty(FiltroPrioridad) ? (int?)null : Convert.ToInt32(FiltroPrioridad);

                // ✅ Si vienen filtros específicos (DocNum, DocEntry, ItemCode), NO usar fechas por defecto
                bool tieneFiltrosEspecificos = !string.IsNullOrEmpty(FiltroDocNum) ||
                                                !string.IsNullOrEmpty(FiltroDocEntry) ||
                                                !string.IsNullOrEmpty(FiltroItemCode);

                DateTime? dtFechaInicio = null;
                DateTime? dtFechaFin = null;

                if (!string.IsNullOrEmpty(FiltroFechaInicio) && !string.IsNullOrEmpty(FiltroFechaFin))
                {
                    // Usuario puso fechas manualmente
                    dtFechaInicio = DateTime.Parse(FiltroFechaInicio);
                    dtFechaFin = DateTime.Parse(FiltroFechaFin);
                }
                else if (!tieneFiltrosEspecificos)
                {
                    // ⚠️ SOLO si NO hay filtros específicos, usar últimos 30 días
                    DateTime hoy = DateTime.Now;
                    dtFechaInicio = hoy.AddDays(-30);
                    dtFechaFin = hoy;
                }
                // Si hay filtros específicos y NO hay fechas, dtFechaInicio y dtFechaFin quedan en NULL

                // ✅ Crear parámetros con los valores correctos (NULL o valor parseado)
                var parametros = new Dictionary<string, (object Value, ParameterDirection Direction, HanaDbType Type)>
                {
                    { "P_DOC_ENTRY", (docEntry, ParameterDirection.Input, HanaDbType.Integer) },
                    { "P_DOC_NUM", (docNum, ParameterDirection.Input, HanaDbType.Integer) },
                    { "P_ITEM_CODE", (string.IsNullOrEmpty(FiltroItemCode) ? null : FiltroItemCode, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_WAREHOUSE", (string.IsNullOrEmpty(FiltroWarehouse) ? null : FiltroWarehouse, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_STATUS", (string.IsNullOrEmpty(FiltroStatus) ? null : FiltroStatus, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_FECHA_INICIO", (dtFechaInicio, ParameterDirection.Input, HanaDbType.Date) },
                    { "P_FECHA_FIN", (dtFechaFin, ParameterDirection.Input, HanaDbType.Date) },
                    { "P_SERIE", (string.IsNullOrEmpty(FiltroSerie) ? null : FiltroSerie, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_PRIORITY", (prioridad, ParameterDirection.Input, HanaDbType.Integer) }
                };

                // ✅ Ejecutar el stored procedure
                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                    Logic.AD.GCConsultaOrdenesFabricacion, // ✅ Cambiar por tu constante
                    parametros
                );

                // ✅ Obtener los datos desde HANA
                List<AccesoDatosPlaneacion.OrdenFabricacion> ordenes = new List<AccesoDatosPlaneacion.OrdenFabricacion>();

                if (!string.IsNullOrEmpty(resultHana.JsonResult) && resultHana.JsonResult != "[]")
                {
                    ordenes = JsonConvert.DeserializeObject<List<AccesoDatosPlaneacion.OrdenFabricacion>>(resultHana.JsonResult);
                }

                // ✅ Aplicar filtro de búsqueda general (si viene del DataTable search)
                if (!string.IsNullOrEmpty(FiltroBusqueda))
                {
                    ordenes = ordenes.Where(o =>
                        o.DOC_NUM.ToString().Contains(FiltroBusqueda) ||
                        (o.ITEM_CODE != null && o.ITEM_CODE.ToUpper().Contains(FiltroBusqueda.ToUpper())) ||
                        (o.ITEM_NAME != null && o.ITEM_NAME.ToUpper().Contains(FiltroBusqueda.ToUpper())) ||
                        (o.STATUS_DESC != null && o.STATUS_DESC.ToUpper().Contains(FiltroBusqueda.ToUpper())) ||
                        (o.ALMACEN_NOMBRE != null && o.ALMACEN_NOMBRE.ToUpper().Contains(FiltroBusqueda.ToUpper()))
                    ).ToList();
                }

                // ✅ Total de registros filtrados
                int totalRegistrosFiltrados = ordenes.Count();

                // ✅ Aplicar paginación
                var ordenesPaginadas = ordenes.Skip(OmitirRegistros).Take(CantidadRegistros).ToList();

                // ✅ RETORNAR formato DataTables
                var resultado = Json(new
                {
                    draw = NroPeticion,
                    recordsTotal = totalRegistrosFiltrados,
                    recordsFiltered = totalRegistrosFiltrados,
                    data = ordenesPaginadas,
                    fechaInicio = dtFechaInicio?.ToString("dd/MM/yyyy"),
                    fechaFin = dtFechaFin?.ToString("dd/MM/yyyy")
                }, JsonRequestBehavior.AllowGet);

                resultado.MaxJsonLength = 2147483644;

                return resultado;
            }
            catch (Exception ex)
            {
                string MethodName = MethodBase.GetCurrentMethod().Name;
                string ControllerName = this.ControllerContext.RouteData.Values["controller"].ToString();
                string msg = $"No es posible obtener las órdenes de fabricación en {MethodName} de {ControllerName}. Error: ";

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
        public JsonResult BuscarArticulo(string query, string Usuario,string Planta,int? Linea, int? GrupoArticulos,int? ValidarCap)
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
                    { "P_QUERY", (query, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_USUARIO", (Usuario, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_PLANTA", (Planta, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_LINEA", (Linea, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_GRUPO_ART", (GrupoArticulos == 0 ? (object)null : GrupoArticulos, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_VALIDAR_CAP", (ValidarCap, ParameterDirection.Input, HanaDbType.NVarChar) }
                };

                // ✅ Ejecutar el Stored Procedure
                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                    Logic.AD.GCBuscarArticulos, // ⬅️ Nombre de tu SP
                    parameters
                );

                // ✅ Deserializar resultado
                List<AccesoDatosPlaneacion.Articulos> equipos = new List<AccesoDatosPlaneacion.Articulos>();

                if (!string.IsNullOrEmpty(resultHana.JsonResult) && resultHana.JsonResult != "[]")
                {
                    equipos = JsonConvert.DeserializeObject<List<AccesoDatosPlaneacion.Articulos>>(resultHana.JsonResult);
                }

                // ✅ Retornar JSON
                return Json(equipos, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                string MethodName = MethodBase.GetCurrentMethod().Name;
                string ControllerName = this.ControllerContext.RouteData.Values["controller"].ToString();
                string msg = $"Error al buscar articulos en {MethodName} de {ControllerName}. Error: {ex.Message}";

                // ✅ Log del error (si tienes sistema de logs)
                // Logger.Error(msg);

                // ✅ Retornar lista vacía en caso de error
                return Json(new List<object>(), JsonRequestBehavior.AllowGet);
            }
        }

        [HttpPost]
        public JsonResult InsertarPlanProduccion()
        {
            var jsonResponse = new GlobalCommands.JsonResponseMtto();
            // Usar DTO para insertar
            Models.Dto.PlanProduccionCreateDto requestDto;
            try
            {
                // Leer el cuerpo de la solicitud JSON
                Request.InputStream.Position = 0;
                using (var reader = new StreamReader(Request.InputStream))
                {
                    string jsonData = reader.ReadToEnd();
                    if (string.IsNullOrEmpty(jsonData))
                        throw new Exception("No se recibió información.");
                    // Deserializar JSON al DTO de creación
                    requestDto = JsonConvert.DeserializeObject<PlanProduccionCreateDto>(jsonData);
                }

                // 🔥 CONVERTIR FECHA AL FORMATO CORRECTO ANTES DE ENVIAR A HANA
                // Normalizar FECHA_PLAN_STRING en el DTO (usado para enviar al SP)
                if (string.IsNullOrWhiteSpace(requestDto.FECHA_PLAN_STRING))
                    requestDto.FECHA_PLAN_STRING = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

                // Convertir DTO a parámetros HANA (sin excludedParams)
                var parameters = Logic.GlobalCommands.ConvertToHanaParameters(requestDto, true, null);

                // Asegurar que los parámetros de fecha sean enviados como DATE a HANA
                if (parameters.ContainsKey("P_DIA_INICIO_MANT"))
                {
                    var p = parameters["P_DIA_INICIO_MANT"];
                    parameters["P_DIA_INICIO_MANT"] = (p.Item1 is DBNull ? (object)DBNull.Value : (p.Item1 is DateTime dt ? (object)dt.Date : p.Item1), p.Item2, Sap.Data.Hana.HanaDbType.Date);
                }

                if (parameters.ContainsKey("P_DIA_FIN_MANT"))
                {
                    var p = parameters["P_DIA_FIN_MANT"];
                    parameters["P_DIA_FIN_MANT"] = (p.Item1 is DBNull ? (object)DBNull.Value : (p.Item1 is DateTime dt ? (object)dt.Date : p.Item1), p.Item2, Sap.Data.Hana.HanaDbType.Date);
                }

                // Ejecutar stored procedure para insertar plan
                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(Logic.AD.GCInsertarPlanProduccion, parameters);

                if (resultHana.JsonResult.Contains("ERROR") || resultHana.JsonResult.Contains("Error"))
                {
                    // Construir respuesta JSON
                    jsonResponse.Status = "NO";
                    jsonResponse.Message = $"No fue posible insertar el plan de producción: {resultHana.JsonResult}";
                    jsonResponse.Data = string.Empty;
                    return Json(jsonResponse);
                }

                // Obtener resultado del stored
                var nuevoId = JArray.Parse(resultHana.JsonResult);
                string estatus = (string)nuevoId[0]["ESTATUS"];
                string mensaje = (string)nuevoId[0]["MENSAJE"];

                // Construir respuesta JSON
                jsonResponse.Status = estatus.Contains("DUPLICADO") ? "NO" : "SI";
                jsonResponse.Message = estatus.Contains("DUPLICADO") ? mensaje : "Plan insertado correctamente.";
                jsonResponse.Data = resultHana.JsonResult;

                return Json(jsonResponse);
            }
            catch (Exception ex)
            {
                jsonResponse.Status = "ERROR";
                jsonResponse.Message = "No fue posible insertar el plan de producción: " + ex.Message;
                jsonResponse.Data = string.Empty;
                return Json(jsonResponse);
            }
        }

        [HttpPost]
        public JsonResult ActualizarPlanProduccion()
        {
            var jsonResponse = new GlobalCommands.JsonResponseMtto();
            MantenimientosPTM.Models.Dto.PlanProduccionUpdateDto requestDto;
            try
            {
                // Leer el cuerpo de la solicitud JSON
                Request.InputStream.Position = 0;
                using (var reader = new StreamReader(Request.InputStream))
                {
                    string jsonData = reader.ReadToEnd();
                    if (string.IsNullOrEmpty(jsonData))
                        throw new Exception("No se recibió información.");
                    requestDto = JsonConvert.DeserializeObject<PlanProduccionUpdateDto>(jsonData);
                }

                // Validar que venga el ID del plan a actualizar
                if (requestDto.ID_PLAN == 0)
                    throw new Exception("No se recibió el ID del plan a actualizar.");

                // Normalizar FECHA_PLAN_STRING en el DTO (se recibe como string desde el frontend)
                if (string.IsNullOrWhiteSpace(requestDto.FECHA_PLAN_STRING))
                    requestDto.FECHA_PLAN_STRING = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

                // Convertir DTO a parámetros HANA y ejecutar SP
                var parametersUpdate = Logic.GlobalCommands.ConvertToHanaParameters(requestDto, true, null);
                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                    Logic.AD.GCActualizarPlanProduccion,
                    parametersUpdate
                );

                if (resultHana.JsonResult.Contains("ERROR") || resultHana.JsonResult.Contains("Error"))
                {
                    jsonResponse.Status = "NO";
                    jsonResponse.Message = $"No fue posible actualizar el plan: {resultHana.JsonResult}";
                    jsonResponse.Data = string.Empty;
                    return Json(jsonResponse);
                }

                string errorEmail;

                // Mapear manualmente DTO a PlanProduccion para reutilizar BuildChanges y notificaciones (sin AutoMapper)
                var modelForEmail = new AccesoDatosPlaneacion.PlanProduccion
                {
                    ID_PLAN = requestDto.ID_PLAN,
                    LINEA_PRODUCCION = requestDto.LINEA_PRODUCCION,
                    ID_PROCESO = requestDto.PROCESO,
                    PROCESO = requestDto.PROCESO,
                    ARTICULO = requestDto.ARTICULO,
                    DIA_INICIO_MANT = requestDto.DIA_INICIO_MANT,
                    DIA_FIN_MANT = requestDto.DIA_FIN_MANT,
                    PRODUCCION_TEORICA_PZS = null,
                    PRODUCCION_TEORICA_KGS = null,
                    PRODUCCION_REAL = null,
                    COMENTARIOS = requestDto.COMENTARIOS,
                    FECHA_PLAN_STRING = requestDto.FECHA_PLAN_STRING,
                    PLANTA = requestDto.PLANTA,
                    ESTATUS = null,
                    USUARIO = requestDto.USUARIO,
                    CAPACIDAD = requestDto.CAPACIDAD
                };

                var changes = BuildChanges(modelForEmail);


                // ✅ Preparar parámetros para el SP
                var parametersEmail = new Dictionary<string, (object value, ParameterDirection direction, HanaDbType type)>
                {
                    { "P_PLANTA", (requestDto.PLANTA, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_TIPO", ("P", ParameterDirection.Input, HanaDbType.NVarChar) }
                };
                // Ejecutar stored procedure de actualización
                var resultHanaEmails = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                    Logic.AD.GCGetUsuariosXPlanta,
                    parametersEmail
                );

                if (resultHanaEmails.JsonResult.Contains("ERROR") || resultHanaEmails.JsonResult.Contains("Error"))
                {
                    jsonResponse.Status = "SI";
                    jsonResponse.Message = $"El plan fue actualizado correctamente, pero la notificación no pudo ser enviada.";
                    jsonResponse.Data = string.Empty;
                    return Json(jsonResponse);
                }
                //Correos para notificaciones por cambio de plan
                JArray ListaEmails = JArray.Parse(resultHanaEmails.JsonResult);
                List<string> emails = new List<string>();

                foreach (var itemEmail in ListaEmails)
                {
                    emails.Add(itemEmail["Email"].ToString());
                }

                var email = new EmailRequest
                {
                    To = emails,
                    Subject = "Plan de Producción Actualizado",
                    Title = "Plan de Producción Actualizado",
                    Message = "Se realizaron cambios en el plan de producción.",
                    Data = changes
                };

                Send(email, out errorEmail);

                var resultado = JArray.Parse(resultHana.JsonResult);
                string estatus = (string)resultado[0]["ESTATUS"];
                string mensaje = (string)resultado[0]["MENSAJE"];

                // DUPLICADO o NO_EXISTE → respuesta negativa
                jsonResponse.Status = (estatus == "O") ? "SI" : "NO";
                jsonResponse.Message = (estatus == "O") ? "Plan actualizado correctamente." : mensaje;
                jsonResponse.Data = resultHana.JsonResult;

                return Json(jsonResponse);
            }
            catch (Exception ex)
            {
                jsonResponse.Status = "ERROR";
                jsonResponse.Message = "No fue posible actualizar el plan de producción: " + ex.Message;
                jsonResponse.Data = string.Empty;
                return Json(jsonResponse);
            }
        }

        [HttpPost]
        public JsonResult EliminarPlanProduccion()
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

                    var requestDto = JsonConvert.DeserializeObject<Models.Dto.PlanProduccionDeleteDto>(jsonData);

                    int idPlan = requestDto.ID_PLAN;
                    int planta = requestDto.PLANTA;
                    string usuario = requestDto.USUARIO;

                    if (idPlan == 0)
                        throw new Exception("No se recibió el ID del plan a eliminar.");

                    // Crear parámetros en el formato correcto para HANA
                    // Convertir DTO a parámetros HANA (ConvertToHanaParameters asigna tipos apropiados)
                    var parametros = Logic.GlobalCommands.ConvertToHanaParameters(requestDto, true, null);

                    var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                        Logic.AD.GCEliminarPlanProduccion,
                        parametros
                    );

                    if (resultHana.JsonResult.Contains("ERROR") || resultHana.JsonResult.Contains("Error"))
                    {
                        jsonResponse.Status = "NO";
                        jsonResponse.Message = $"No fue posible eliminar el plan: {resultHana.JsonResult}";
                        jsonResponse.Data = string.Empty;
                        return Json(jsonResponse);
                    }

                    var resultado = JArray.Parse(resultHana.JsonResult);
                    string estatus = (string)resultado[0]["ESTATUS"];
                    string mensaje = (string)resultado[0]["MENSAJE"];

                    jsonResponse.Status = (estatus == "OK") ? "SI" : "NO";
                    jsonResponse.Message = (estatus == "OK") ? "Plan eliminado correctamente." : mensaje;
                    jsonResponse.Data = resultHana.JsonResult;
                    return Json(jsonResponse);
                }
            }
            catch (Exception ex)
            {
                jsonResponse.Status = "ERROR";
                jsonResponse.Message = "No fue posible eliminar el plan de producción: " + ex.Message;
                jsonResponse.Data = string.Empty;
                return Json(jsonResponse);
            }
        }

        [HttpPost]
        public JsonResult EliminarBitacoraPlanProduccion()
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

                    var requestDto = JsonConvert.DeserializeObject<BitacoralanProduccionDeleteDto>(jsonData);

                    // Crear parámetros en el formato correcto para HANA
                    // Convertir DTO a parámetros HANA (ConvertToHanaParameters asigna tipos apropiados)
                    var parametros = Logic.GlobalCommands.ConvertToHanaParameters(requestDto, true, null);

                    var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                        Logic.AD.GCSpPdxMTTOEliminarBitacoraPlanProduccion,
                        parametros
                    );

                    if (resultHana.JsonResult.Contains("ERROR") || resultHana.JsonResult.Contains("Error"))
                    {
                        jsonResponse.Status = "NO";
                        jsonResponse.Message = $"No fue posible eliminar el historial del plan: {resultHana.JsonResult}";
                        jsonResponse.Data = string.Empty;
                        return Json(jsonResponse);
                    }

                    var resultado = JArray.Parse(resultHana.JsonResult);
                    string estatus = (string)resultado[0]["ESTATUS"];
                    string mensaje = (string)resultado[0]["MENSAJE"];

                    jsonResponse.Status = (estatus == "OK") ? "SI" : "NO";
                    jsonResponse.Message = (estatus == "OK") ? "Historial del plan eliminado correctamente." : mensaje;
                    jsonResponse.Data = resultHana.JsonResult;
                    return Json(jsonResponse);
                }
            }
            catch (Exception ex)
            {
                jsonResponse.Status = "ERROR";
                jsonResponse.Message = "No fue posible eliminar el plan de producción: " + ex.Message;
                jsonResponse.Data = string.Empty;
                return Json(jsonResponse);
            }
        }
        #endregion
    }
}