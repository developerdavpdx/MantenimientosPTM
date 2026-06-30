using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Sap.Data.Hana;
using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Web;
using System.Web.Mvc;

namespace MantenimientosPTM.Controllers
{
    public class EquiposController : Controller
    {
        readonly LogicaEquipos Logic = new LogicaEquipos();

        #region Views
        public ActionResult GestionEquipos()
        {
            return View();
        }
        #endregion

        #region Endpoints

        [HttpPost]
        public JsonResult InsertarLinea()
        {
            var jsonResponse = new GlobalCommands.JsonResponseMtto();
            AccesoDatosEquipos.LineaProduccion RequestData;

            try
            {
                // Leer el cuerpo de la solicitud JSON
                Request.InputStream.Position = 0;
                using (var reader = new StreamReader(Request.InputStream))
                {
                    string jsonData = reader.ReadToEnd();
                    if (string.IsNullOrEmpty(jsonData))
                        throw new Exception("No se recibió información.");

                    // Deserializar JSON al modelo EquipoMTTO
                    RequestData = JsonConvert.DeserializeObject<AccesoDatosEquipos.LineaProduccion>(jsonData);
                }

                var parametrosLinea = new
                {
                    P_PLANTA = RequestData.Planta,
                    P_LINEA = RequestData.Linea ?? "",
                    P_ID_AREA = RequestData.Area ?? 0
                };
                // Convertir modelo a parámetros HANA
                var allparameters = Logic.GlobalCommands.ConvertToHanaParameters(parametrosLinea, false, null);

                // Ejecutar stored procedure para insertar equipo
                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(Logic.AD.GCInsertarLinea, allparameters);

                // Construir respuesta JSON
                jsonResponse.Status = resultHana.JsonResult.Contains("ERROR") ? "NO" : "SI";
                jsonResponse.Message = resultHana.JsonResult.Contains("ERROR") ? "No fue posible insertar la nueva línea de producción." : "Nueva Línea insertada correctamente.";
                jsonResponse.Data = resultHana.JsonResult;

                return Json(jsonResponse);
            }
            catch (Exception ex)
            {
                jsonResponse.Status = "ERROR";
                jsonResponse.Message = "No fue posible insertar la nueva línea de producción: " + ex.Message;
                jsonResponse.Data = string.Empty;

                return Json(jsonResponse);
            }
        }

        [HttpPost]
        public JsonResult EliminarLineas()
        {
            // Delegar procesamiento a método común
            Request.InputStream.Position = 0;
            using (var reader = new StreamReader(Request.InputStream))
            {
                string jsonData = reader.ReadToEnd();
                if (string.IsNullOrEmpty(jsonData))
                    return Json(new GlobalCommands.JsonResponseMtto { Status = "NO", Message = "No se recibió información.", Data = string.Empty });

                var req = JsonConvert.DeserializeObject<AccesoDatosEquipos.EliminarLineasRequest>(jsonData);
                var respuesta = ProcesarEliminarLineas(req);
                return Json(respuesta);
            }
        }

        [HttpPost]
        public JsonResult EliminarLinea()
        {
            // Endpoint para eliminación individual que reusa la lógica masiva
            Request.InputStream.Position = 0;
            using (var reader = new StreamReader(Request.InputStream))
            {
                string jsonData = reader.ReadToEnd();
                if (string.IsNullOrEmpty(jsonData))
                    return Json(new GlobalCommands.JsonResponseMtto { Status = "NO", Message = "No se recibió información.", Data = string.Empty });

                // Intentar parsear IdLinea y campos adicionales
                JObject jo = null;
                try { jo = JObject.Parse(jsonData); } catch { }

                int id = 0;
                if (jo != null)
                {
                    id = jo.Value<int?>("IdLinea") ?? jo.Value<int?>("ID_LINEA") ?? jo.Value<int?>("id") ?? 0;
                }
                else
                {
                    try
                    {
                        var tmp = JsonConvert.DeserializeObject<AccesoDatosEquipos.EliminarLineaProduccion>(jsonData);
                        id = tmp?.IdLinea ?? 0;
                    }
                    catch { }
                }

                if (id <= 0)
                    return Json(new GlobalCommands.JsonResponseMtto { Status = "NO", Message = "Id de línea inválido.", Data = string.Empty });

                var req = new AccesoDatosEquipos.EliminarLineasRequest
                {
                    Lineas = new List<int> { id },
                    Permanente = jo?.Value<bool?>("Permanente") ?? false,
                    PLANTA = jo?.Value<int?>("PLANTA") ?? 0,
                    USUARIO = jo?.Value<string>("USUARIO") ?? string.Empty
                };

                var respuesta = ProcesarEliminarLineas(req);
                return Json(respuesta);
            }
        }

        // Método privado que procesa la eliminación (masiva o individual) usando el SP por id
        private GlobalCommands.JsonResponseMtto ProcesarEliminarLineas(AccesoDatosEquipos.EliminarLineasRequest RequestData)
        {
            var jsonResponse = new GlobalCommands.JsonResponseMtto();

            var listaLineas = RequestData?.Lineas ?? new List<int>();
            var resultados = new List<object>();

            foreach (var id in listaLineas)
            {
                try
                {
                    var parametrosLinea = new
                    {
                        P_ID_LINEA = id
                    };

                    var allparamsLinea = Logic.GlobalCommands.ConvertToHanaParameters(parametrosLinea, false, null);
                    var resHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(Logic.AD.GCEliminarLinea, allparamsLinea);
                    var jr = resHana.JsonResult ?? string.Empty;

                    // Normalizar respuesta del SP (puede devolver JSON array como string)
                    try
                    {
                        // Si viene un JSON array (string) intentar parsear
                        if (!string.IsNullOrWhiteSpace(jr) && (jr.TrimStart().StartsWith("[") || jr.TrimStart().StartsWith("{")))
                        {
                            try
                            {
                                var arr = JArray.Parse(jr);
                                if (arr.Count > 0)
                                {
                                    var first = arr[0];
                                    var statusToken = first["Status"] ?? first["STATUS"];
                                    var msgToken = first["Message"] ?? first["MESSAGE"];
                                    var totalToken = first["TOTAL_EQUIPOS"] ?? first["TOTAL"];

                                    var statusVal = statusToken != null ? statusToken.ToString() : string.Empty;
                                    var messageVal = msgToken != null ? msgToken.ToString() : (jr ?? string.Empty);
                                    if (totalToken != null)
                                    {
                                        messageVal = messageVal + " (Total dependencias: " + totalToken.ToString() + ")";
                                    }

                                    if (statusVal.IndexOf("ERROR", StringComparison.OrdinalIgnoreCase) >= 0)
                                    {
                                        resultados.Add(new { IdLinea = id, Status = "NO", Message = messageVal });
                                    }
                                    else
                                    {
                                        resultados.Add(new { IdLinea = id, Status = "SI", Message = messageVal });
                                    }

                                    continue; // siguiente id
                                }
                            }
                            catch
                            {
                                // si no es parseable como array, seguir y evaluar jr como texto
                            }
                        }

                        // Si llega aquí, jr no es un JSON parseable o no contiene estructura esperada.
                        if (jr.IndexOf("ERROR", StringComparison.OrdinalIgnoreCase) >= 0)
                        {
                            // devolver mensaje limpio si es posible
                            resultados.Add(new { IdLinea = id, Status = "NO", Message = jr });
                        }
                        else
                        {
                            resultados.Add(new { IdLinea = id, Status = "SI", Message = jr });
                        }
                    }
                    catch
                    {
                        // En caso de cualquier error al procesar jr, devolver el texto crudo
                        resultados.Add(new { IdLinea = id, Status = "NO", Message = jr });
                    }
                }
                catch (Exception exInner)
                {
                    resultados.Add(new { IdLinea = id, Status = "NO", Message = exInner.Message });
                }
            }

            var anySi = resultados.Any(r => ((dynamic)r).Status == "SI");
            var allSi = resultados.All(r => ((dynamic)r).Status == "SI");
            jsonResponse.Status = allSi ? "SI" : (anySi ? "PARCIAL" : "NO");
            jsonResponse.Message = jsonResponse.Status == "SI" ? "Eliminación completada." : "Operación finalizada con resultados parciales o errores.";
            // Devolver resultados como JSON string en Data para que el cliente lo parsee explícitamente.
            // También limpiar DataArray para evitar ambigüedades en el cliente.
            try
            {
                jsonResponse.Data = JsonConvert.SerializeObject(resultados);
                // Si la clase JsonResponseMtto tiene DataArray, limpiarla. Si no existe, esto se ignorará en tiempo de compilación.
                try { jsonResponse.DataArray = null; } catch { /* prop puede no existir */ }
            }
            catch
            {
                jsonResponse.Data = string.Empty;
                try { jsonResponse.DataArray = null; } catch { /* prop puede no existir */ }
            }

            return jsonResponse;
        }

        [HttpPost]
        public JsonResult EliminarTipos()
        {
            // Delegar procesamiento a método común específico para tipos
            Request.InputStream.Position = 0;
            using (var reader = new StreamReader(Request.InputStream))
            {
                string jsonData = reader.ReadToEnd();
                if (string.IsNullOrEmpty(jsonData))
                    return Json(new GlobalCommands.JsonResponseMtto { Status = "NO", Message = "No se recibió información.", Data = string.Empty });

                var req = JsonConvert.DeserializeObject<AccesoDatosEquipos.EliminarTiposRequest>(jsonData);
                var respuesta = ProcesarEliminarTipos(req);
                return Json(respuesta);
            }
        }

        [HttpPost]
        public JsonResult EliminarTipo()
        {
            // Endpoint para eliminación individual de tipo que reusa la lógica masiva
            Request.InputStream.Position = 0;
            using (var reader = new StreamReader(Request.InputStream))
            {
                string jsonData = reader.ReadToEnd();
                if (string.IsNullOrEmpty(jsonData))
                    return Json(new GlobalCommands.JsonResponseMtto { Status = "NO", Message = "No se recibió información.", Data = string.Empty });

                JObject jo = null;
                try { jo = JObject.Parse(jsonData); } catch { }

                int id = 0;
                if (jo != null)
                {
                    id = jo.Value<int?>("IdTipo") ?? jo.Value<int?>("ID_TIPO_EQUIPO") ?? jo.Value<int?>("id") ?? 0;
                }
                else
                {
                    try
                    {
                        var tmp = JsonConvert.DeserializeObject<dynamic>(jsonData);
                        id = tmp?.IdTipo ?? tmp?.ID_TIPO_EQUIPO ?? 0;
                    }
                    catch { }
                }

                if (id <= 0)
                    return Json(new GlobalCommands.JsonResponseMtto { Status = "NO", Message = "Id de tipo inválido.", Data = string.Empty });

                var req = new AccesoDatosEquipos.EliminarTiposRequest
                {
                    Tipos = new List<int> { id },
                    Permanente = jo?.Value<bool?>("Permanente") ?? false,
                    PLANTA = jo?.Value<int?>("PLANTA") ?? 0,
                    USUARIO = jo?.Value<string>("USUARIO") ?? string.Empty
                };

                var respuesta = ProcesarEliminarTipos(req);
                return Json(respuesta);
            }
        }

        // Método privado que procesa la eliminación (masiva o individual) para tipos de equipo
        private GlobalCommands.JsonResponseMtto ProcesarEliminarTipos(AccesoDatosEquipos.EliminarTiposRequest RequestData)
        {
            var jsonResponse = new GlobalCommands.JsonResponseMtto();

            var listaTipos = RequestData?.Tipos ?? new List<int>();
            var resultados = new List<object>();

            foreach (var id in listaTipos)
            {
                try
                {
                    var parametros = new { P_ID_TIPO_EQUIPO = id };
                    var allparams = Logic.GlobalCommands.ConvertToHanaParameters(parametros, false, null);
                    var resHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(Logic.AD.GCEliminarTipoEquipo, allparams);
                    var jr = resHana.JsonResult ?? string.Empty;

                    // Intentar parsear JSON devuelto por el SP y normalizar
                    try
                    {
                        if (!string.IsNullOrWhiteSpace(jr) && (jr.TrimStart().StartsWith("[") || jr.TrimStart().StartsWith("{")))
                        {
                            var arr = JArray.Parse(jr);
                            if (arr.Count > 0)
                            {
                                var first = arr[0];
                                var statusToken = first["Status"] ?? first["STATUS"];
                                var msgToken = first["Message"] ?? first["MESSAGE"];
                                var totalToken = first["TOTAL_EQUIPOS"] ?? first["TOTAL"];

                                var statusVal = statusToken != null ? statusToken.ToString() : string.Empty;
                                var messageVal = msgToken != null ? msgToken.ToString() : (jr ?? string.Empty);
                                if (totalToken != null)
                                {
                                    messageVal = messageVal + " (Total dependencias: " + totalToken.ToString() + ")";
                                }

                                if (statusVal.IndexOf("ERROR", StringComparison.OrdinalIgnoreCase) >= 0)
                                {
                                    resultados.Add(new { IdTipo = id, Status = "NO", Message = messageVal });
                                }
                                else
                                {
                                    resultados.Add(new { IdTipo = id, Status = "SI", Message = messageVal });
                                }

                                continue;
                            }
                        }

                        if (jr.IndexOf("ERROR", StringComparison.OrdinalIgnoreCase) >= 0)
                            resultados.Add(new { IdTipo = id, Status = "NO", Message = jr });
                        else
                            resultados.Add(new { IdTipo = id, Status = "SI", Message = jr });
                    }
                    catch
                    {
                        resultados.Add(new { IdTipo = id, Status = "NO", Message = jr });
                    }
                }
                catch (Exception ex)
                {
                    resultados.Add(new { IdTipo = id, Status = "NO", Message = ex.Message });
                }
            }

            var anySi = resultados.Any(r => ((dynamic)r).Status == "SI");
            var allSi = resultados.All(r => ((dynamic)r).Status == "SI");
            jsonResponse.Status = allSi ? "SI" : (anySi ? "PARCIAL" : "NO");
            jsonResponse.Message = jsonResponse.Status == "SI" ? "Eliminación completada." : "Operación finalizada con resultados parciales o errores.";
            try
            {
                jsonResponse.Data = JsonConvert.SerializeObject(resultados);
                try { jsonResponse.DataArray = null; } catch { }
            }
            catch
            {
                jsonResponse.Data = string.Empty;
            }

            return jsonResponse;
        }

        [HttpPost]
        public JsonResult InsertarArea()
        {
            var jsonResponse = new GlobalCommands.JsonResponseMtto();
            AccesoDatosEquipos.Area RequestData;

            try
            {
                // Leer JSON
                Request.InputStream.Position = 0;
                using (var reader = new StreamReader(Request.InputStream))
                {
                    string jsonData = reader.ReadToEnd();

                    if (string.IsNullOrEmpty(jsonData))
                        throw new Exception("No se recibió información.");

                    RequestData = JsonConvert.DeserializeObject<AccesoDatosEquipos.Area>(jsonData);
                }

                // Parámetros HANA
                var allparameters = Logic.GlobalCommands.ConvertToHanaParameters(RequestData, false, null);

                var excludedParams = new[]
                {
                    "P_ID_AREA",
                    "P_STATUS"
                };

                var parameters = allparameters
                    .Where(p => !excludedParams.Contains(p.Key))
                    .ToDictionary(p => p.Key, p => p.Value);

                // Ejecutar SP
                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                    Logic.AD.GCInsertarArea,
                    parameters
                );

                // Respuesta
                jsonResponse.Status =
                    resultHana.JsonResult.Contains("ERROR") ||
                    resultHana.JsonResult.Contains("DUPLICADO")
                        ? "NO"
                        : "SI";

                jsonResponse.Message =
                    resultHana.JsonResult.Contains("ERROR")
                        ? "No fue posible insertar el área."
                        : resultHana.JsonResult.Contains("DUPLICADO")
                            ? "El área ya existe."
                            : "Área insertada correctamente.";

                jsonResponse.Data = resultHana.JsonResult;

                return Json(jsonResponse);
            }
            catch (Exception ex)
            {
                jsonResponse.Status = "ERROR";
                jsonResponse.Message = "No fue posible insertar el área: " + ex.Message;
                jsonResponse.Data = string.Empty;

                return Json(jsonResponse);
            }
        }

        [HttpPost]
        public JsonResult EliminarAreas()
        {
            // Delegar procesamiento a método común específico para áreas
            Request.InputStream.Position = 0;
            using (var reader = new StreamReader(Request.InputStream))
            {
                string jsonData = reader.ReadToEnd();
                if (string.IsNullOrEmpty(jsonData))
                    return Json(new GlobalCommands.JsonResponseMtto { Status = "NO", Message = "No se recibió información.", Data = string.Empty });

                var req = JsonConvert.DeserializeObject<AccesoDatosEquipos.EliminarAreasRequest>(jsonData);
                var respuesta = ProcesarEliminarAreas(req);
                return Json(respuesta);
            }
        }

        [HttpPost]
        public JsonResult EliminarArea()
        {
            // Endpoint para eliminación individual de área que reutiliza la lógica masiva
            Request.InputStream.Position = 0;
            using (var reader = new StreamReader(Request.InputStream))
            {
                string jsonData = reader.ReadToEnd();
                if (string.IsNullOrEmpty(jsonData))
                    return Json(new GlobalCommands.JsonResponseMtto
                    {
                        Status = "NO",
                        Message = "No se recibió información.",
                        Data = string.Empty
                    });

                JObject jo = null;
                try { jo = JObject.Parse(jsonData); } catch { }

                int id = 0;
                if (jo != null)
                {
                    id = jo.Value<int?>("IdArea")
                      ?? jo.Value<int?>("ID_AREA")
                      ?? jo.Value<int?>("id")
                      ?? 0;
                }
                else
                {
                    try
                    {
                        var tmp = JsonConvert.DeserializeObject<dynamic>(jsonData);
                        id = tmp?.IdArea ?? tmp?.ID_AREA ?? 0;
                    }
                    catch { }
                }

                if (id <= 0)
                    return Json(new GlobalCommands.JsonResponseMtto
                    {
                        Status = "NO",
                        Message = "Id de área inválido.",
                        Data = string.Empty
                    });

                var req = new AccesoDatosEquipos.EliminarAreasRequest
                {
                    Areas = new List<int> { id },
                    Permanente = jo?.Value<bool?>("Permanente") ?? false,
                    PLANTA = jo?.Value<int?>("PLANTA") ?? 0,
                    USUARIO = jo?.Value<string>("USUARIO") ?? string.Empty
                };

                var respuesta = ProcesarEliminarAreas(req);
                return Json(respuesta);
            }
        }

        private GlobalCommands.JsonResponseMtto ProcesarEliminarAreas(AccesoDatosEquipos.EliminarAreasRequest RequestData)
        {
            var jsonResponse = new GlobalCommands.JsonResponseMtto();

            var listaAreas = RequestData?.Areas ?? new List<int>();
            var resultados = new List<object>();

            foreach (var id in listaAreas)
            {
                try
                {
                    var parametros = new
                    {
                        P_ID_AREA = id
                    };

                    var allparams = Logic.GlobalCommands.ConvertToHanaParameters(parametros, false, null);

                    var resHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                        Logic.AD.GCEliminarArea,
                        allparams);

                    var jr = resHana.JsonResult ?? string.Empty;

                    try
                    {
                        if (!string.IsNullOrWhiteSpace(jr) &&
                            (jr.TrimStart().StartsWith("[") || jr.TrimStart().StartsWith("{")))
                        {
                            var arr = JArray.Parse(jr);

                            if (arr.Count > 0)
                            {
                                var first = arr[0];

                                var statusToken = first["Status"] ?? first["STATUS"];
                                var msgToken = first["Message"] ?? first["MESSAGE"];
                                var totalToken = first["TOTAL_EQUIPOS"] ?? first["TOTAL"];

                                var statusVal = statusToken != null ? statusToken.ToString() : string.Empty;
                                var messageVal = msgToken != null ? msgToken.ToString() : jr;

                                if (totalToken != null)
                                {
                                    messageVal += " (Total dependencias: " + totalToken.ToString() + ")";
                                }

                                if (statusVal.IndexOf("ERROR", StringComparison.OrdinalIgnoreCase) >= 0)
                                {
                                    resultados.Add(new
                                    {
                                        IdArea = id,
                                        Status = "NO",
                                        Message = messageVal
                                    });
                                }
                                else
                                {
                                    resultados.Add(new
                                    {
                                        IdArea = id,
                                        Status = "SI",
                                        Message = messageVal
                                    });
                                }

                                continue;
                            }
                        }

                        if (jr.IndexOf("ERROR", StringComparison.OrdinalIgnoreCase) >= 0)
                        {
                            resultados.Add(new
                            {
                                IdArea = id,
                                Status = "NO",
                                Message = jr
                            });
                        }
                        else
                        {
                            resultados.Add(new
                            {
                                IdArea = id,
                                Status = "SI",
                                Message = jr
                            });
                        }
                    }
                    catch
                    {
                        resultados.Add(new
                        {
                            IdArea = id,
                            Status = "NO",
                            Message = jr
                        });
                    }
                }
                catch (Exception ex)
                {
                    resultados.Add(new
                    {
                        IdArea = id,
                        Status = "NO",
                        Message = ex.Message
                    });
                }
            }

            var anySi = resultados.Any(r => ((dynamic)r).Status == "SI");
            var allSi = resultados.All(r => ((dynamic)r).Status == "SI");

            jsonResponse.Status = allSi ? "SI" : (anySi ? "PARCIAL" : "NO");
            jsonResponse.Message = jsonResponse.Status == "SI"
                ? "Eliminación completada."
                : "Operación finalizada con resultados parciales o errores.";

            try
            {
                jsonResponse.Data = JsonConvert.SerializeObject(resultados);
                try { jsonResponse.DataArray = null; } catch { }
            }
            catch
            {
                jsonResponse.Data = string.Empty;
            }

            return jsonResponse;
        }

        [HttpPost]
        public JsonResult InsertarTipoEquipo()
        {
            var jsonResponse = new GlobalCommands.JsonResponseMtto();
            AccesoDatosEquipos.TipoEquipo RequestData;

            try
            {
                // Leer JSON
                Request.InputStream.Position = 0;
                using (var reader = new StreamReader(Request.InputStream))
                {
                    string jsonData = reader.ReadToEnd();

                    if (string.IsNullOrEmpty(jsonData))
                        throw new Exception("No se recibió información.");

                    RequestData = JsonConvert.DeserializeObject<AccesoDatosEquipos.TipoEquipo>(jsonData);
                }

                // Parámetros HANA
                var allparameters = Logic.GlobalCommands.ConvertToHanaParameters(RequestData, true, null);
                var excludedParams = new[] { "P_ID_TIPO_EQUIPO", "P_ESTATUS", "P_FECHA_CREACION" };
                var parameters = allparameters
                    .Where(p => !excludedParams.Contains(p.Key))
                    .ToDictionary(p => p.Key, p => p.Value);
                // Ejecutar SP
                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                    Logic.AD.GCInsertarTipoEquipo,
                    parameters
                );

                // Respuesta
                jsonResponse.Status = resultHana.JsonResult.Contains("ERROR") ? "NO" : "SI";
                jsonResponse.Message = resultHana.JsonResult.Contains("ERROR")
                    ? "No fue posible insertar el tipo de equipo."
                    : "Tipo de equipo insertado correctamente.";

                // Respuesta
                jsonResponse.Status = resultHana.JsonResult.Contains("DUPLICADO") ? "NO" : "SI";
                jsonResponse.Message = resultHana.JsonResult.Contains("ERROR")
                    ? "No fue posible insertar el tipo de equipo."
                    : "Tipo de equipo insertado correctamente.";

                jsonResponse.Data = resultHana.JsonResult;

                return Json(jsonResponse);
            }
            catch (Exception ex)
            {
                jsonResponse.Status = "ERROR";
                jsonResponse.Message = "No fue posible insertar el tipo de equipo: " + ex.Message;
                jsonResponse.Data = string.Empty;

                return Json(jsonResponse);
            }
        }


        [HttpPost]
        public JsonResult InsertaEquiposProduccion()
        {
            var jsonResponse = new GlobalCommands.JsonResponseMtto();
            AccesoDatosEquipos.EquipoMTTO RequestData;

            try
            {
                // Leer el cuerpo de la solicitud JSON
                Request.InputStream.Position = 0;
                using (var reader = new StreamReader(Request.InputStream))
                {
                    string jsonData = reader.ReadToEnd();
                    if (string.IsNullOrEmpty(jsonData))
                        throw new Exception("No se recibió información.");

                    // Deserializar JSON al modelo EquipoMTTO
                    RequestData = JsonConvert.DeserializeObject<AccesoDatosEquipos.EquipoMTTO>(jsonData);
                }

                // Convertir modelo a parámetros HANA
                var allparameters = Logic.GlobalCommands.ConvertToHanaParameters(RequestData, true, null); // true para que agregue P_
                var excludedParams = new[] { "P_IDEQUIPO", "P_PERIODICIDADESMANTENIMIENTO" }; // Cambié a mayúsculas
                var parameters = allparameters
                    .Where(p => !excludedParams.Contains(p.Key))
                    .ToDictionary(p => p.Key, p => p.Value);

                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(Logic.AD.GCInsertaEquipo, parameters);

                if (resultHana.JsonResult.IndexOf("Error", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {
                        Status = "ERROR",
                        Message = "No fue posible insertar el equipo: " + resultHana.JsonResult,
                        Data = string.Empty
                    };
                    return Json(jsonResponse);
                }

                // Ejecutar stored procedure para insertar equipo

                // Obtener ID generado si existe
                var nuevoId = resultHana.JsonResult;
                int IdEquipo = int.Parse(JArray.Parse(nuevoId)[0]["ID_EQUIPO"].ToString());
                bool errorPeriodicidad = false;
                foreach (var periodicidad in RequestData.PeriodicidadesMantenimiento)
                {
                    try
                    {
                        var paramPeriodicidad = Logic.GlobalCommands.ConvertToHanaParameters(new AccesoDatosEquipos.PeriodicidadEquipoMTTO { Id_Periodicidad = periodicidad, Id_Equipo = IdEquipo, Usuario = RequestData.Usuario }, true, null);

                        var resultHanaPeriodicidad = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                            Logic.AD.GCInsertaPeriodicidadesEquipo,
                            paramPeriodicidad
                        );

                        if (resultHanaPeriodicidad.JsonResult.IndexOf("Error", StringComparison.OrdinalIgnoreCase) >= 0)
                        {
                            errorPeriodicidad = true;
                            break;
                        }
                    }
                    catch (Exception ex)
                    {
                        errorPeriodicidad = true;
                        break;
                    }
                }

                if (errorPeriodicidad)
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {
                        Status = "ERROR",
                        Message = "El equipo fue insertado pero no fue posible guardar su periodicidad:",
                        Data = string.Empty
                    };
                    return Json(jsonResponse);
                }


                // Construir respuesta JSON
                jsonResponse.Status = nuevoId != null ? "SI" : "NO";
                jsonResponse.Message = nuevoId != null ? "Equipo insertado correctamente." : "No se pudo insertar el equipo.";
                jsonResponse.Data = nuevoId;

                return Json(jsonResponse);
            }
            catch (Exception ex)
            {
                jsonResponse.Status = "ERROR";
                jsonResponse.Message = "No fue posible generar el equipo: " + ex.Message;
                jsonResponse.Data = string.Empty;

                return Json(jsonResponse);
            }
        }

        [HttpPost]
        public JsonResult AcualizaEquiposProduccion()
        {
            var jsonResponse = new GlobalCommands.JsonResponseMtto();
            AccesoDatosEquipos.EquipoMTTO RequestData;

            try
            {
                // Leer el cuerpo de la solicitud JSON
                Request.InputStream.Position = 0;
                using (var reader = new StreamReader(Request.InputStream))
                {
                    string jsonData = reader.ReadToEnd();
                    if (string.IsNullOrEmpty(jsonData))
                        throw new Exception("No se recibió información.");

                    // Deserializar JSON al modelo EquipoMTTO
                    RequestData = JsonConvert.DeserializeObject<AccesoDatosEquipos.EquipoMTTO>(jsonData);
                }


                // Consultar periodicidades actuales
                var parametrosConsulta = new Dictionary<string, (object value, ParameterDirection direction, HanaDbType type)>
                {
                    { "P_IDEQUIPO", (RequestData.IdEquipo, ParameterDirection.Input, HanaDbType.Integer) }
                };

                var resultConsulta = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                    Logic.AD.GCConsultarPeriodicidadesEquipo,
                    parametrosConsulta
                );

                List<AccesoDatosEquipos.PeriodicidadEquipoMTTO> periodicidadesActuales =
                    new List<AccesoDatosEquipos.PeriodicidadEquipoMTTO>();

                if (!string.IsNullOrEmpty(resultConsulta.JsonResult) &&
                    resultConsulta.JsonResult != "[]")
                {
                    periodicidadesActuales =
                        JsonConvert.DeserializeObject<List<AccesoDatosEquipos.PeriodicidadEquipoMTTO>>
                        (
                            resultConsulta.JsonResult
                        );
                }

                var actuales = periodicidadesActuales
                    .Select(x => x.Id_Periodicidad.Value)
                    .ToList();

                var nuevas = RequestData.PeriodicidadesMantenimiento;

                // Periodicidades a insertar (no existen actualmente)
                var agregar = nuevas.Except(actuales).ToList();

                // Periodicidades a desactivar (ya no vienen en la solicitud)
                var desactivar = actuales.Except(nuevas).ToList();

                // Periodicidades que permanecen iguales
                var mantener = actuales.Intersect(nuevas).ToList();

                var allparameters = Logic.GlobalCommands.ConvertToHanaParameters(RequestData, true, null);
                var excludedParams = new[]
                {
                    "P_ESTATUS",
                    "P_USUARIO",
                    "P_FECHAPAUSA",
                    "P_FECHABAJA",
                    "P_PERIODICIDADESMANTENIMIENTO"
                };
                var parameters = allparameters
                    .Where(p => !excludedParams.Contains(p.Key))
                    .ToDictionary(p => p.Key, p => p.Value);

                // Ejecutar stored procedure para insertar equipo
                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(Logic.AD.GCActualizaEquipo, parameters);

                if (resultHana.JsonResult.Contains("ERROR") || resultHana.JsonResult.Contains("Error"))
                {
                    // Construir respuesta JSON
                    jsonResponse.Status = "NO";
                    jsonResponse.Message = $"No fue posible actualizar el equipo: {resultHana.JsonResult}";
                    jsonResponse.Data = string.Empty;
                }

                else
                {
                    bool errorPeriodicidad = false;

                    try
                    {
                        //// Eliminar periodicidades actuales (SE ELIMINA LOGICA DE ELIMINACION DE PERIODICIDADES PARA MEJORA ARQUITECTONICA)
                        //var parametrosEliminar = new Dictionary<string, (object Value, ParameterDirection Direction, HanaDbType Type)>
                        //{
                        //    { "P_ID_EQUIPO", (RequestData.IdEquipo, ParameterDirection.Input, HanaDbType.Integer) },
                        //};

                        //var resultEliminar = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                        //    Logic.AD.GCEliminarPeriodicidadesEquipo,
                        //    parametrosEliminar
                        //);

                        //if (resultEliminar.JsonResult.IndexOf("Error", StringComparison.OrdinalIgnoreCase) >= 0)
                        //{
                        //    errorPeriodicidad = true;
                        //}

                        // Insertar las nuevas periodicidades
                        // Insertar únicamente las periodicidades nuevas
                        if (!errorPeriodicidad)
                        {
                            foreach (var periodicidad in agregar)
                            {
                                var paramPeriodicidad =
                                    Logic.GlobalCommands.ConvertToHanaParameters(
                                        new AccesoDatosEquipos.PeriodicidadEquipoMTTO
                                        {
                                            Id_Periodicidad = periodicidad,
                                            Id_Equipo = RequestData.IdEquipo,
                                            Usuario = RequestData.Usuario
                                        },
                                        true,
                                        null
                                    );

                                var resultPeriodicidad =
                                    Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                                        Logic.AD.GCInsertaPeriodicidadesEquipo,
                                        paramPeriodicidad
                                    );

                                if (resultPeriodicidad.JsonResult.IndexOf("Error", StringComparison.OrdinalIgnoreCase) >= 0)
                                {
                                    errorPeriodicidad = true;
                                    break;
                                }
                            }
                        }

                        // Desactivar periodicidades eliminadas
                        if (!errorPeriodicidad)
                        {
                            foreach (var periodicidad in desactivar)
                            {
                                var parametrosDesactivar = new Dictionary<string, (object Value, ParameterDirection Direction, HanaDbType Type)>
                            {
                                { "P_ID_EQUIPO", (RequestData.IdEquipo, ParameterDirection.Input, HanaDbType.Integer) },
                                { "P_ID_PERIODICIDAD", (periodicidad, ParameterDirection.Input, HanaDbType.Integer) },
                                { "P_USUARIO", (RequestData.Usuario, ParameterDirection.Input, HanaDbType.NVarChar) }
                            };

                                var resultDesactivar = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                                    Logic.AD.GCDesactivarPeriodicidadEquipo,
                                    parametrosDesactivar
                                );

                                if (resultDesactivar.JsonResult.IndexOf("Error", StringComparison.OrdinalIgnoreCase) >= 0)
                                {
                                    errorPeriodicidad = true;
                                    break;
                                }
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        errorPeriodicidad = true;
                    }

                    if (errorPeriodicidad)
                    {
                        jsonResponse.Status = "ERROR";
                        jsonResponse.Message =
                            "El equipo fue actualizado, pero ocurrió un problema al actualizar las periodicidades.";
                        jsonResponse.Data = string.Empty;
                    }
                    else
                    {
                        jsonResponse.Status = "SI";
                        jsonResponse.Message = "Equipo actualizado correctamente";
                        jsonResponse.Data = string.Empty;
                    }
                }

                return Json(jsonResponse);
            }
            catch (Exception ex)
            {
                jsonResponse.Status = "ERROR";
                jsonResponse.Message = "No fue posible actualizar el equipo: " + ex.Message;
                jsonResponse.Data = string.Empty;

                return Json(jsonResponse);
            }
        }

        [HttpPost]
        public JsonResult PausarEquiposProduccion()
        {
            var jsonResponse = new GlobalCommands.JsonResponseMtto();
            AccesoDatosEquipos.PausaEquipo RequestData;

            try
            {
                // Leer el cuerpo de la solicitud JSON
                Request.InputStream.Position = 0;
                using (var reader = new StreamReader(Request.InputStream))
                {
                    string jsonData = reader.ReadToEnd();
                    if (string.IsNullOrEmpty(jsonData))
                        throw new Exception("No se recibió información.");

                    // Deserializar JSON al modelo PausaEquipo
                    RequestData = JsonConvert.DeserializeObject<AccesoDatosEquipos.PausaEquipo>(jsonData);
                }

                // Convertir modelo a parámetros HANAs
                var parameters = Logic.GlobalCommands.ConvertToHanaParameters(RequestData, false, null);
                // Ejecutar stored procedure para insertar equipo
                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(Logic.AD.GCActualizaEstatusEquipo, parameters);

                if (resultHana.JsonResult.Contains("Error"))
                {
                    jsonResponse.Status = "ERROR";
                    jsonResponse.Message = "No fue posible pausar el equipo: " + resultHana.JsonResult;
                    jsonResponse.Data = string.Empty;

                }
                else
                {
                    // Construir respuesta JSON
                    jsonResponse.Status = "SI";
                    jsonResponse.Message = "Equipo pausado correctamente.";
                    jsonResponse.Data = string.Empty;
                }

                return Json(jsonResponse);
            }
            catch (Exception ex)
            {
                jsonResponse.Status = "ERROR";
                jsonResponse.Message = "No fue posible pausar el equipo: " + ex.Message;
                jsonResponse.Data = string.Empty;

                return Json(jsonResponse);
            }
        }

        [HttpPost]
        public JsonResult InsertaSolicitudBajaEquipoProduccion()
        {
            var jsonResponse = new GlobalCommands.JsonResponseMtto();
            AccesoDatosEquipos.SolicitudBajaEquipo RequestData;
            AccesoDatosEquipos.PausaEquipo ChangeStatus;
            List<string> rutasArchivos = new List<string>();

            try
            {
                if (Request.Files.Count == 0 && string.IsNullOrEmpty(Request.Form[0]))
                    throw new Exception("No se recibió información.");

                string jsonData = Request.Form["data"];
                if (string.IsNullOrEmpty(jsonData))
                    throw new Exception("No se recibieron los datos del formulario.");

                RequestData = JsonConvert.DeserializeObject<AccesoDatosEquipos.SolicitudBajaEquipo>(jsonData);

                // ══════════════════════════════════════
                // 📁 PROCESAR IMÁGENES (múltiples)
                // ══════════════════════════════════════
                if (Request.Files.Count > 0)
                {
                    string carpetaBase = Server.MapPath("~/SolicitudesBaja");
                    if (!Directory.Exists(carpetaBase))
                        Directory.CreateDirectory(carpetaBase);

                    string subcarpeta = Path.Combine(carpetaBase, RequestData.IdEquipo.ToString());
                    if (!Directory.Exists(subcarpeta))
                        Directory.CreateDirectory(subcarpeta);

                    string[] extensionesPermitidas = { ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp" };
                    string[] tiposPermitidos = { "image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp" };

                    for (int i = 0; i < Request.Files.Count; i++)
                    {
                        HttpPostedFileBase archivo = Request.Files[i];

                        if (Request.Files.GetKey(i) == "archivoPDF") continue;

                        if (archivo != null && archivo.ContentLength > 0)
                        {
                            string extension = Path.GetExtension(archivo.FileName).ToLower();

                            if (!extensionesPermitidas.Contains(extension))
                                throw new Exception($"Solo se permiten archivos de imagen. Archivo recibido: {extension}");

                            if (!tiposPermitidos.Contains(archivo.ContentType.ToLower()))
                                throw new Exception("Solo se permiten archivos de imagen.");

                            string nombreArchivo = $"{DateTime.Now:yyyyMMddHHmmss}_{i}_{Path.GetFileName(archivo.FileName)}";
                            string rutaCompleta = Path.Combine(subcarpeta, nombreArchivo);
                            archivo.SaveAs(rutaCompleta);
                        }
                    }
                }

                // ══════════════════════════════════════
                // 📄 PROCESAR PDF (si viene)
                // ══════════════════════════════════════
                HttpPostedFileBase archivoPDF = Request.Files["archivoPDF"];
                if (archivoPDF != null && archivoPDF.ContentLength > 0)
                {
                    string rutaBase = Server.MapPath($"~/SolicitudesBaja/{RequestData.IdEquipo}");
                    if (!Directory.Exists(rutaBase))
                        Directory.CreateDirectory(rutaBase);

                    string nombrePDF = $"SOLICITUD BAJA {RequestData.IdEquipo}{Path.GetExtension(archivoPDF.FileName)}";
                    string rutaPDF = Path.Combine(rutaBase, nombrePDF);
                    archivoPDF.SaveAs(rutaPDF);
                }


                string carpeta = Server.MapPath($"~/SolicitudesBaja/{RequestData.IdEquipo}");

                if (Directory.Exists(carpeta))
                {
                    var archivos = Directory.GetFiles(carpeta);

                    foreach (var archivo in archivos)
                    {
                        // Convertir a ruta relativa para el email service
                        string nombre = Path.GetFileName(archivo);
                        rutasArchivos.Add($"~/SolicitudesBaja/{RequestData.IdEquipo}/{nombre}");
                    }
                }

                // ══════════════════════════════════════
                // 💾 EJECUTAR SP INSERTAR / ACTUALIZAR
                // ══════════════════════════════════════
                var allparameters = Logic.GlobalCommands.ConvertToHanaParameters(RequestData, true, null);
                var excludedParams = new[] {
                        "P_IDSOLICITUD",
                        "P_FECHACREACION",
                        "P_FECHAULTMOD",
                        "P_SOLICITA",
                        "P_ESTATUS",
                        "P_CORREOSNOTIFICACION"  // 🔥 Excluir también este
                    };

                var parameters = allparameters
                    .Where(p => !excludedParams.Contains(p.Key))
                    .ToDictionary(p => p.Key, p => p.Value);

                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(Logic.AD.GCSolicitudBaja, parameters);

                if (resultHana.JsonResult.Contains("Error"))
                {
                    foreach (var ruta in rutasArchivos)
                    {
                        string rutaFisica = Server.MapPath(ruta);
                        if (System.IO.File.Exists(rutaFisica))
                            System.IO.File.Delete(rutaFisica);
                    }

                    jsonResponse.Status = "ERROR";
                    jsonResponse.Message = "No fue posible solicitar la baja del equipo: " + resultHana.JsonResult;
                    jsonResponse.Data = string.Empty;
                    return Json(jsonResponse);
                }

                // ══════════════════════════════════════
                // 🔄 ACTUALIZAR ESTATUS DEL EQUIPO
                // ══════════════════════════════════════
                string nuevoEstatus = (archivoPDF != null && archivoPDF.ContentLength > 0) ? "2" : "4";

                ChangeStatus = new AccesoDatosEquipos.PausaEquipo
                {
                    COMENTARIOS = string.Empty,
                    ESTATUS = nuevoEstatus,
                    ID_EQUIPO = RequestData.IdEquipo
                };

                parameters = Logic.GlobalCommands.ConvertToHanaParameters(ChangeStatus, false, null);
                Logic.GlobalCommands.ExecuteProcedureHanaAuto(Logic.AD.GCActualizaEstatusEquipo, parameters);

                // ══════════════════════════════════════
                // 📧 ENVIAR CORREOS (si hay en la lista)
                // ══════════════════════════════════════
                if (!string.IsNullOrEmpty(RequestData.CorreosNotificacion))
                {
                    try
                    {
                        // Convertir string separado por comas a List<string>
                        List<string> correos = RequestData.CorreosNotificacion
                            .Split(new[] { ',' }, StringSplitOptions.RemoveEmptyEntries)
                            .Select(c => c.Trim())
                            .Where(c => !string.IsNullOrEmpty(c))
                            .ToList();

                        if (correos.Count > 0)
                        {
                            var changes = new Dictionary<string, string>();

                            if (!string.IsNullOrEmpty(RequestData.CodigoActivo))
                                changes.Add("🔖 Código Activo", RequestData.CodigoActivo);

                            if (!string.IsNullOrEmpty(RequestData.DescripcionActivo))
                                changes.Add("📦 Descripción", RequestData.DescripcionActivo);

                            if (!string.IsNullOrEmpty(RequestData.MotivoBaja))
                                changes.Add("📝 Motivo de Baja", RequestData.MotivoBaja);

                            if (RequestData.FechaSolicitud.HasValue)
                                changes.Add("📅 Fecha Solicitud", RequestData.FechaSolicitud.Value.ToString("dd/MM/yyyy"));

                            if (!string.IsNullOrEmpty(RequestData.UsuarioCreacion))
                                changes.Add("👤 Solicitado por", RequestData.UsuarioCreacion);

                            changes.Add("🆔 ID Equipo", RequestData.IdEquipo.ToString());

                            var emailRequest = new EmailNotificationService.EmailRequest
                            {
                                To = correos,
                                Subject = "📢 Solicitud de Baja de Activo Fijo",
                                Title = "Solicitud de Baja de Activo Fijo",
                                Message = $"Se ha registrado una solicitud de baja de activo fijo por el usuario <strong>{RequestData.UsuarioCreacion}</strong>.",
                                Data = changes,
                                Attachments = rutasArchivos // 🔥 aquí está la magia
                            };

                            string errorEmail;
                            EmailNotificationService.Send(emailRequest, out errorEmail);
                            // No se lanza excepción si falla el correo — la solicitud ya quedó guardada
                        }
                    }
                    catch { /* El correo no debe interrumpir el flujo principal */ }
                }

                jsonResponse.Status = "SI";
                jsonResponse.Message = nuevoEstatus == "2"
                    ? "Solicitud y documento guardados correctamente."
                    : "Solicitud registrada correctamente.";
                jsonResponse.Data = string.Empty;

                return Json(jsonResponse);
            }
            catch (Exception ex)
            {
                foreach (var ruta in rutasArchivos)
                {
                    try
                    {
                        string rutaFisica = Server.MapPath(ruta);
                        if (System.IO.File.Exists(rutaFisica))
                            System.IO.File.Delete(rutaFisica);
                    }
                    catch { }
                }

                jsonResponse.Status = "ERROR";
                jsonResponse.Message = "No fue posible solicitar la baja del equipo: " + ex.Message;
                jsonResponse.Data = string.Empty;
                return Json(jsonResponse);
            }
        }

        [HttpPost]
        public JsonResult GuardarBaja(HttpPostedFileBase archivoPDF, string ID_EQUIPO)
        {
            var jsonResponse = new GlobalCommands.JsonResponseMtto();
            AccesoDatosEquipos.PausaEquipo ChangeStatus;

            try
            {
                // Verifica si se recibió un archivo
                if (archivoPDF != null && archivoPDF.ContentLength > 0)
                {
                    // Configura la ruta en la que se guardará el archivo
                    string rutaBase = Server.MapPath($"~/SolicitudesBaja/{ID_EQUIPO}");  // Ruta relativa en el proyecto
                    if (!Directory.Exists(rutaBase))
                    {
                        Directory.CreateDirectory(rutaBase);  // Crea la carpeta si no existe
                    }

                    // Genera un nombre único para el archivo (por ejemplo, usando un GUID)
                    string nombreArchivo = "SOLICITUD BAJA " + ID_EQUIPO + Path.GetExtension(archivoPDF.FileName);

                    // Ruta completa donde se guardará el archivo
                    string rutaArchivo = Path.Combine(rutaBase, nombreArchivo);

                    // Guarda el archivo en el servidor
                    archivoPDF.SaveAs(rutaArchivo);


                    ChangeStatus = new AccesoDatosEquipos.PausaEquipo { COMENTARIOS = string.Empty, ESTATUS = "2", ID_EQUIPO = ID_EQUIPO };
                    var parameters = Logic.GlobalCommands.ConvertToHanaParameters(ChangeStatus, false, null);

                    var resultUpdate = Logic.GlobalCommands.ExecuteProcedureHanaAuto(Logic.AD.GCActualizaEstatusEquipo, parameters);

                    // Responder con éxito
                    jsonResponse.Status = "OK";
                    jsonResponse.Message = "Documento guardado correctamente.";
                    jsonResponse.Data = new { filePath = rutaArchivo }.filePath;  // Puedes devolver la ruta del archivo si es necesario
                }
                else
                {
                    throw new Exception("No se recibió un archivo válido.");
                }
            }
            catch (Exception ex)
            {
                jsonResponse.Status = "ERROR";
                jsonResponse.Message = "Error al guardar el archivo: " + ex.Message;
                jsonResponse.Data = string.Empty;
            }

            return Json(jsonResponse);
        }

        [HttpGet]
        public JsonResult GetTipoEquipos()
        {
            GlobalCommands.JsonResponseMtto jsonResponse;

            try
            {
                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(Logic.AD.GCTiposEquipo, null);

                if (resultHana.JsonResult == "[]")
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {

                        Status = "NO",
                        Message = "No fue posible obtener el listado de tipos de equipos. no se encontró información relacionada.",
                        Data = string.Empty
                    };
                }
                else if (resultHana.JsonResult.Contains("Error"))
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {
                        Status = "ERROR",
                        Message = "No fue posible obtener el listado de tipos de equipos: " + resultHana.JsonResult,
                        Data = string.Empty
                    };
                }
                else
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {

                        Status = "OK",
                        Message = "Listado de equipos correctamente.",
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
                    Message = "No fue posible obtener el listado de equipos: " + ex.ToString(),
                    Data = string.Empty
                };

                return Json(jsonResponse);
            }
        }

        [HttpGet]
        public JsonResult GetPeriodicidadesMP()
        {
            GlobalCommands.JsonResponseMtto jsonResponse;

            try
            {
                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(Logic.AD.GCConsultarPeriodicidadMP, null);

                if (resultHana.JsonResult == "[]")
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {

                        Status = "NO",
                        Message = "No fue posible obtener el listado de periodicidades de mantenimientos, no se encontró información relacionada.",
                        Data = string.Empty
                    };
                }
                else if (resultHana.JsonResult.Contains("Error"))
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {
                        Status = "ERROR",
                        Message = "No fue posible obtener el listado de periodicidades de mantenimientos: " + resultHana.JsonResult,
                        Data = string.Empty
                    };
                }
                else
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {

                        Status = "OK",
                        Message = "Listado de periodicidades obtenida correctamente.",
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
                    Message = "No fue posible obtener el listado de periodicidades de mantenimientos: " + ex.ToString(),
                    Data = string.Empty
                };

                return Json(jsonResponse);
            }
        }

        [HttpPost]
        public JsonResult GetEquipos()
        {
            try
            {
                // Numero de veces que se ha realizado una peticion
                string draw = Request.Form["draw"];
                string drawValue = !string.IsNullOrEmpty(draw) ? draw : "0";
                int NroPeticion = Convert.ToInt32(drawValue);

                // Cantidad de registros a devolver
                string lenght = Request.Form["length"];
                string lenghtValue = !string.IsNullOrEmpty(lenght) ? lenght : "10";
                int CantidadRegistros = Convert.ToInt32(lenghtValue);

                // Cantidad de registros a omitir
                string start = Request.Form["start"];
                string startValue = !string.IsNullOrEmpty(start) ? start : "0";
                int OmitirRegistros = Convert.ToInt32(startValue);

                // Texto de busqueda
                string search = Request.Form["search[value]"];
                string searchValue = !string.IsNullOrEmpty(search) ? search : "";
                string FiltroBusqueda = searchValue;

                // Filtros adicionales (si los enviaste desde el JS)
                string FiltroUsuario = Request.Form["FiltroUsuario"];
                string FiltroPlanta = Request.Form["FiltroPlanta"];
                string FiltroArea = Request.Form["FiltroArea"];
                string FiltroLinea = Request.Form["FiltroLinea"];
                string FiltroOrdenTrabajo = Request.Form["FiltroOrdenTrabajo"];
                string FiltroFechaInicioMantenimiento = Request.Form["FiltroFechaInicioMantenimiento"];
                string FiltroEstatus = Request.Form["FiltroEstatus"];

                // Convertir la fecha string a DateTime si viene con valor
                DateTime? fechaInicioMant = null;
                if (!string.IsNullOrEmpty(FiltroFechaInicioMantenimiento))
                {
                    if (DateTime.TryParse(FiltroFechaInicioMantenimiento, out DateTime tempDate))
                    {
                        fechaInicioMant = tempDate;
                    }
                }

                int TotalRegistros = 0;

                //=================================OBTENER DATOS===========================//
                // Preparar parámetros para el stored procedure
                var parameters = new Dictionary<string, (object Value, ParameterDirection Direction, HanaDbType Type)>
                {
                    { "P_ID_EQUIPO", (null, ParameterDirection.Input, HanaDbType.Integer) },
                    { "P_NOMBRE", (string.IsNullOrEmpty(FiltroBusqueda) ? (object)null : FiltroBusqueda, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_PLANTA", (string.IsNullOrEmpty(FiltroPlanta) ? (object)null : FiltroPlanta, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_USUARIO", (string.IsNullOrEmpty(FiltroUsuario) ? (object)null : FiltroUsuario, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_AREA", (string.IsNullOrEmpty(FiltroArea) ? (object)null : FiltroArea, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_LINEA_PRODUCCION", (string.IsNullOrEmpty(FiltroLinea) ? (object)null : FiltroLinea, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_ORDEN_TRABAJO", (string.IsNullOrEmpty(FiltroOrdenTrabajo) ? (object)null : FiltroOrdenTrabajo, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_FECHA_INICIO_MANTENIMIENTO", (fechaInicioMant.HasValue ? (object)fechaInicioMant.Value : null, ParameterDirection.Input, HanaDbType.Date) },

                    // 🔥 NUEVOS PARÁMETROS
                    { "P_QUERY", (null, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_TOP", (null, ParameterDirection.Input, HanaDbType.Integer) },
                    { "P_MODO", ("FULL", ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_ESTATUS", (string.IsNullOrEmpty(FiltroEstatus) ? (object)null : FiltroEstatus, ParameterDirection.Input, HanaDbType.NVarChar) }
                };

                // Ejecutar stored procedure
                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                    Logic.AD.GCConsultaEquipos,
                    parameters
                );

                // Obtener los datos
                List<AccesoDatosEquipos.EquipoMTTOLIST> equipos = new List<AccesoDatosEquipos.EquipoMTTOLIST>();

                if (resultHana.JsonResult != null)
                {
                    equipos = JsonConvert.DeserializeObject<List<AccesoDatosEquipos.EquipoMTTOLIST>>(resultHana.JsonResult);
                }

                // Guardar total ANTES de filtrar
                TotalRegistros = equipos.Count();

                // Total de registros filtrados
                int totalRegistrosFiltrados = equipos.Count();

                // Aplicar paginación
                equipos = equipos.Skip(OmitirRegistros).Take(CantidadRegistros).ToList();

                // ⭐ RETORNAR DIRECTAMENTE el formato de DataTables
                var equiposFiltrados = Json(new
                {
                    draw = NroPeticion,
                    recordsTotal = TotalRegistros,
                    recordsFiltered = totalRegistrosFiltrados,
                    data = equipos
                }, JsonRequestBehavior.AllowGet);

                equiposFiltrados.MaxJsonLength = 2147483644;

                return equiposFiltrados;
            }
            catch (Exception ex)
            {
                string MethodName = MethodBase.GetCurrentMethod().Name;
                string ControllerName = this.ControllerContext.RouteData.Values["controller"].ToString();
                string msg = $"No es posible obtener la lista de equipos en {MethodName} de {ControllerName}. Error: ";

                // ⭐ IMPORTANTE: En error también devolver formato DataTables
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

        //LISTADO DE EQUIPOS PARA SELECT
        [HttpGet]
        public JsonResult GetEquiposSelect(string Planta = null, string Area = null)
        {
            GlobalCommands.JsonResponseMtto jsonResponse;

            try
            {
                string FiltroEstatus = "1";
                // 🔥 Parámetros para el SP (modo SELECT)
                var parameters = new Dictionary<string, (object Value, ParameterDirection Direction, HanaDbType Type)>
            {
                // Parámetros originales (NULL)
                { "P_ID_EQUIPO", (null, ParameterDirection.Input, HanaDbType.Integer) },
                { "P_NOMBRE", (null, ParameterDirection.Input, HanaDbType.NVarChar) },
                { "P_PLANTA", (string.IsNullOrEmpty(Planta) ? (object)null : Planta, ParameterDirection.Input, HanaDbType.NVarChar) },
                { "P_USUARIO", (null, ParameterDirection.Input, HanaDbType.NVarChar) },
                { "P_AREA", (string.IsNullOrEmpty(Area) ? (object)null : Area, ParameterDirection.Input, HanaDbType.NVarChar) },
                { "P_LINEA_PRODUCCION", (null, ParameterDirection.Input, HanaDbType.NVarChar) },
                { "P_ORDEN_TRABAJO", (null, ParameterDirection.Input, HanaDbType.NVarChar) },
                { "P_FECHA_INICIO_MANTENIMIENTO", (null, ParameterDirection.Input, HanaDbType.Date) },

                // 🔥 Parámetros nuevos
                { "P_QUERY", (null, ParameterDirection.Input, HanaDbType.NVarChar) },
                { "P_TOP", (null, ParameterDirection.Input, HanaDbType.Integer) },
                { "P_MODO", ("SELECT", ParameterDirection.Input, HanaDbType.NVarChar) },
                { "P_ESTATUS", (string.IsNullOrEmpty(FiltroEstatus) ? (object)null : FiltroEstatus, ParameterDirection.Input, HanaDbType.NVarChar) }
            };

                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                    Logic.AD.GCConsultaEquipos,
                    parameters
                );

                if (resultHana.JsonResult == "[]")
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {
                        Status = "NO",
                        Message = "No se encontraron equipos.",
                        Data = string.Empty
                    };
                }
                else if (resultHana.JsonResult.Contains("Error"))
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {
                        Status = "ERROR",
                        Message = "Error al obtener equipos: " + resultHana.JsonResult,
                        Data = string.Empty
                    };
                }
                else
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {
                        Status = "OK",
                        Message = "Listado de equipos obtenido correctamente.",
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
                    Message = "Error al obtener equipos: " + ex.ToString(),
                    Data = string.Empty
                };

                return Json(jsonResponse, JsonRequestBehavior.AllowGet);
            }
        }
        //LISTADO DE EQUIPOS AUTOCOMPLETE
        [HttpGet]
        public JsonResult BuscarEquipo(string query, string Usuario, string Planta)
        {
            try
            {
                string FiltroEstatus = "1";
                // ✅ Validar que venga el parámetro
                if (string.IsNullOrEmpty(query))
                {
                    return Json(new List<object>(), JsonRequestBehavior.AllowGet);
                }

                // ✅ Preparar parámetros para el SP
                var parameters = new Dictionary<string, (object value, ParameterDirection direction, HanaDbType type)>
                {
                    // Parámetros originales (en NULL)
                    { "P_ID_EQUIPO", (null, ParameterDirection.Input, HanaDbType.Integer) },
                    { "P_NOMBRE", (null, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_PLANTA", (string.IsNullOrEmpty(Planta) ? (object)null : Planta, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_USUARIO", (string.IsNullOrEmpty(Usuario) ? (object)null : Usuario, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_AREA", (null, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_LINEA_PRODUCCION", (null, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_ORDEN_TRABAJO", (null, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_FECHA_INICIO_MANTENIMIENTO", (null, ParameterDirection.Input, HanaDbType.Date) },

                    // 🔥 Parámetros de búsqueda
                    { "P_QUERY", (string.IsNullOrEmpty(query) ? (object)null : query, ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_TOP", (20, ParameterDirection.Input, HanaDbType.Integer) },
                    { "P_MODO", ("SEARCH", ParameterDirection.Input, HanaDbType.NVarChar) },
                    { "P_ESTATUS", (string.IsNullOrEmpty(FiltroEstatus) ? (object)null : FiltroEstatus, ParameterDirection.Input, HanaDbType.NVarChar) }
                };

                // ✅ Ejecutar el Stored Procedure
                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                    Logic.AD.GCConsultaEquipos, // ⬅️ Nombre de tu SP
                    parameters
                );

                // ✅ Deserializar resultado
                List<AccesoDatosEquipos.EquipoMTTOLIST> equipos = new List<AccesoDatosEquipos.EquipoMTTOLIST>();

                if (!string.IsNullOrEmpty(resultHana.JsonResult) && resultHana.JsonResult != "[]")
                {
                    equipos = JsonConvert.DeserializeObject<List<AccesoDatosEquipos.EquipoMTTOLIST>>(resultHana.JsonResult);
                }

                // ✅ Retornar JSON
                return Json(equipos, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                string MethodName = MethodBase.GetCurrentMethod().Name;
                string ControllerName = this.ControllerContext.RouteData.Values["controller"].ToString();
                string msg = $"Error al buscar equipos en {MethodName} de {ControllerName}. Error: {ex.Message}";

                // ✅ Log del error (si tienes sistema de logs)
                // Logger.Error(msg);

                // ✅ Retornar lista vacía en caso de error
                return Json(new List<object>(), JsonRequestBehavior.AllowGet);
            }
        }
        [HttpGet]
        public JsonResult GetLineasPorPlanta(int? PLANTA, int? AREA, int? PRODUCCION)
        {
            GlobalCommands.JsonResponseMtto jsonResponse;
            AccesoDatosEquipos.PlantaSeleccionada RequestData;

            try
            {

                if (!PLANTA.HasValue)
                {
                    return Json(new GlobalCommands.JsonResponseMtto()
                    {
                        Status = "NO",
                        Message = "Falta seleccionar la planta.",
                        Data = string.Empty
                    }, JsonRequestBehavior.AllowGet);
                }


                RequestData = new AccesoDatosEquipos.PlantaSeleccionada();
                RequestData.Planta = PLANTA;
                RequestData.Area = AREA;
                RequestData.Produccion = PRODUCCION;
                // Convertir modelo a parámetros HANA
                var parameters = Logic.GlobalCommands.ConvertToHanaParameters(RequestData, true, null);

                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(Logic.AD.GCConsultarLineasPorPlanta, parameters);

                if (resultHana.JsonResult == "[]")
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {

                        Status = "NO",
                        Message = "No se encontraron líneas con los filtros especificados.",
                        Data = string.Empty
                    };
                }
                else if (resultHana.JsonResult.Contains("Error"))
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {
                        Status = "ERROR",
                        Message = "No fue posible obtener el listado de líneas: " + resultHana.JsonResult,
                        Data = string.Empty
                    };
                }
                else
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {

                        Status = "OK",
                        Message = "Listado de líneas correctamente.",
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
                    Message = "No fue posible obtener el listado de líneas: " + ex.ToString(),
                    Data = string.Empty
                };

                return Json(jsonResponse);
            }
        }

        [HttpGet]
        public JsonResult GetProcesosPorPlanta(int? PLANTA)
        {
            GlobalCommands.JsonResponseMtto jsonResponse;
            AccesoDatosEquipos.PlantaSeleccionada RequestData;

            try
            {

                RequestData = new AccesoDatosEquipos.PlantaSeleccionada();
                RequestData.Planta = PLANTA;
                // Convertir modelo a parámetros HANA
                var allparameters = Logic.GlobalCommands.ConvertToHanaParameters(RequestData, true, null);

                var excludedParams = new[] { "P_AREA", "P_PRODUCCION" }; // Cambié a mayúsculas
                var parameters = allparameters
                    .Where(p => !excludedParams.Contains(p.Key))
                    .ToDictionary(p => p.Key, p => p.Value);

                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(Logic.AD.GCConsultarProcesosPorPlanta, parameters);

                if (resultHana.JsonResult == "[]")
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {

                        Status = "NO",
                        Message = "No fue posible obtener el listado de áreas. no se encontró información relacionada.",
                        Data = string.Empty
                    };
                }
                else if (resultHana.JsonResult.Contains("Error"))
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {
                        Status = "ERROR",
                        Message = "No fue posible obtener el listado de áreas: " + resultHana.JsonResult,
                        Data = string.Empty
                    };
                }
                else
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {

                        Status = "OK",
                        Message = "Listado de áreas obtenido correctamente.",
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
                    Message = "No fue posible obtener el listado de áreas: " + ex.ToString(),
                    Data = string.Empty
                };

                return Json(jsonResponse);
            }
        }

        [HttpGet]
        public JsonResult GetSolicitudBajaEquipoProduccion(string ID_EQUIPO)
        {
            GlobalCommands.JsonResponseMtto jsonResponse;
            AccesoDatosEquipos.EquipoSeleccionado RequestData;
            try
            {
                RequestData = new AccesoDatosEquipos.EquipoSeleccionado();
                RequestData.ID_EQUIPO = ID_EQUIPO;

                // Convertir modelo a parámetros HANA
                var parameters = Logic.GlobalCommands.ConvertToHanaParameters(RequestData, false, null);
                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(Logic.AD.GCConsultaBajaEquipos, parameters);

                if (resultHana.JsonResult == "[]")
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {
                        Status = "NO",
                        Message = "No fue posible obtener los datos de la solicitud de baja. no se encontró información relacionada.",
                        Data = string.Empty
                    };
                }
                else if (resultHana.JsonResult.Contains("Error"))
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {
                        Status = "ERROR",
                        Message = "No fue posible obtener los datos de la solicitud de baja: " + resultHana.JsonResult,
                        Data = string.Empty
                    };
                }
                else
                {
                    // 🔥 OBTENER LAS IMÁGENES DEL DIRECTORIO
                    List<string> imagenesUrls = new List<string>();
                    string carpetaImagenes = Server.MapPath($"~/SolicitudesBaja/{ID_EQUIPO}");

                    if (Directory.Exists(carpetaImagenes))
                    {
                        string[] extensionesPermitidas = { ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp" };
                        var archivos = Directory.GetFiles(carpetaImagenes)
                            .Where(f => extensionesPermitidas.Contains(Path.GetExtension(f).ToLower()))
                            .ToList();

                        foreach (var archivo in archivos)
                        {
                            string nombreArchivo = Path.GetFileName(archivo);
                            // Crear URL relativa accesible desde el navegador
                            string urlImagen = $"/SolicitudesBaja/{ID_EQUIPO}/{nombreArchivo}";
                            imagenesUrls.Add(urlImagen);
                        }
                    }

                    // Crear objeto con datos y las imágenes
                    var responseData = new
                    {
                        SolicitudData = resultHana.JsonResult,
                        Imagenes = imagenesUrls
                    };

                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {
                        Status = "OK",
                        Message = "Datos de la solicitud obtenidos correctamente.",
                        Data = JsonConvert.SerializeObject(responseData)
                    };
                }

                return Json(jsonResponse, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                jsonResponse = new GlobalCommands.JsonResponseMtto()
                {
                    Status = "ERROR",
                    Message = "No fue posible obtener los datos de la solicitud de baja: " + ex.ToString(),
                    Data = string.Empty
                };
                return Json(jsonResponse);
            }
        }
        #endregion
    }
}