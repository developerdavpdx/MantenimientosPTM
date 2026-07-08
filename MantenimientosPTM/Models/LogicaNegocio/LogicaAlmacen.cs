using log4net;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Sap.Data.Hana;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Diagnostics;
using System.Dynamic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

namespace MantenimientosPTM
{
    public class LogicaAlmacen
    {
        #region variables
        public AccesoDatosAlmacen AD = new AccesoDatosAlmacen();
        public LoginServiceLayer LoginService = new LoginServiceLayer();
        public GlobalCommands GlobalCommands = new GlobalCommands();
        private string EmailsFacturacion { get; }
        private string EmailsVentas { get; }
        #endregion

        #region constructor

        #endregion

        #region SAP_SERVICE_LAYER

        private static readonly ILog log = LogManager.GetLogger("AlmacenSolicitudCompra");

        /// <summary>
        /// Crea una Purchase Request en SAP B1 via Service Layer
        /// </summary>
        public async Task<GlobalCommands.SapResponse> CrearPurchaseRequestAsync(List<AccesoDatosAlmacen.SolicitudCompraResume> Header, List<AccesoDatosAlmacen.SolicitudCompraDetalle> Detalle)
        {
            var responseAbx = new GlobalCommands.SapResponse { IsError = true };

            try
            {
                log.Info($"🚀 ═══════════════════════════════════════════════════");
                log.Info($"🚀 INICIO CrearPurchaseRequest — ID Solicitud: {Header[0].IdSolicitudCompra}");
                log.Info($"🚀 ═══════════════════════════════════════════════════");

                // ✅ 1 — Login
                log.Info($"🔐 Iniciando sesión en SAP Service Layer...");
                var loginResult = await LoginService.LoginAsyncHttpClient();

                if (loginResult.IsError)
                {
                    log.Error($"❌ Login fallido: {loginResult.Message}");
                    responseAbx.Message = "Error al iniciar sesión en SAP: " + loginResult.Message;
                    return responseAbx;
                }

                log.Info($"✅ Login exitoso — SessionId: {loginResult.SessionId}");

                // ✅ 2 — Armar DocumentLines
                log.Info($"📦 Armando DocumentLines — Total artículos: {Detalle.Count}");

                // ✅ DESPUÉS — una línea por artículo agrupado
                var documentLines = Detalle.Select(articulo => new
                {
                    ItemCode = articulo.CodigoArticulo,
                    Quantity = articulo.CantidadEncargar,
                    LineVendor = articulo.CodigoProveedor,
                    CostingCode = Header[0].Departamento, //Departamento
                    CostingCode2 = Header[0].Proceso,//Proceso
                    CostingCode3 = Header[0].Gastos,//Gastos
                    CostingCode4 = Header[0].Cedis//Cedis
                }).ToList();

                foreach (var line in documentLines)
                {
                    log.Debug($"   📋 Línea — ItemCode: {line.ItemCode} | Qty: {line.Quantity} | Proveedor: {line.LineVendor}");
                    log.Debug($"         CostingCode: {line.CostingCode} | CC2: {line.CostingCode2} | CC3: {line.CostingCode3} | CC4: {line.CostingCode4}");
                }

                // ✅ 3 — Armar body
                var purchaseRequest = new
                {
                    RequriedDate = DateTime.Now.AddDays(7).ToString("yyyy-MM-dd"),
                    U_URGENCIA = "NO",
                    U_REQ_CALIDAD = "NO APLICA",
                    Comments = $"Documento creado por interfaz PTM Mantenimientos — {DateTime.Now:dd/MM/yyyy HH:mm:ss}",
                    DocumentLines = documentLines
                };

                var jsonBody = JsonConvert.SerializeObject(purchaseRequest);
                log.Info($"📤 Body armado correctamente");
                log.Debug($"📤 JSON: {jsonBody}");

                var content = new StringContent(jsonBody, Encoding.UTF8, "application/json");
                content.Headers.ContentType.CharSet = "utf-8";

                // ✅ 4 — Enviar a SAP
                var url = $"{ConfigurationManager.AppSettings["ServiceLayer"]}/PurchaseRequests";
                log.Info($"🌐 Enviando POST a: {url}");

                var response = await LoginService._httpClient.PostAsync(url, content);
                var result = await response.Content.ReadAsStringAsync();

                log.Info($"📥 Respuesta SAP — StatusCode: {(int)response.StatusCode}");
                log.Debug($"📥 Respuesta SAP — Body: {result}");

                if (response.IsSuccessStatusCode)
                {
                    dynamic jsonResponse = JsonConvert.DeserializeObject(result);
                    responseAbx.IsError = false;
                    responseAbx.DocNum = jsonResponse.DocNum?.ToString() ?? string.Empty;
                    responseAbx.DocEntry = jsonResponse.DocEntry?.ToString() ?? string.Empty;
                    responseAbx.Message = "Purchase Request creada correctamente en SAP.";

                    log.Info($"✅ Purchase Request creada — DocNum: {responseAbx.DocNum} | DocEntry: {responseAbx.DocEntry}");
                }
                else
                {
                    try
                    {
                        dynamic errorResponse = JsonConvert.DeserializeObject(result);
                        string errorCode = errorResponse.error.code?.ToString() ?? "?";
                        string errorValue = errorResponse.error.message.value?.ToString() ?? result;
                        responseAbx.Message = $"Error SAP: {errorCode} / {errorValue}";
                    }
                    catch
                    {
                        // Si no se puede parsear, mostrar el raw
                        responseAbx.Message = $"Error SAP ({(int)response.StatusCode}): {result}";
                    }

                    log.Error($"❌ Error al crear Purchase Request — StatusCode: {(int)response.StatusCode}");
                    log.Error($"❌ Detalle: {responseAbx.Message}");
                }
            }
            catch (Exception ex)
            {
                responseAbx.Message = $"Excepción al crear Purchase Request: {ex.Message}";
                log.Error($"💥 Excepción en CrearPurchaseRequestAsync: {ex.Message}");
                log.Error($"💥 StackTrace: {ex.StackTrace}");
            }
            finally
            {
                // ✅ 5 — Logout siempre
                log.Info($"🔓 Cerrando sesión SAP...");
                var logoutResult = await LoginService.LogoutAsyncHttpClient();

                if (logoutResult.IsError)
                    log.Warn($"⚠️ Logout con advertencia: {logoutResult.Message}");
                else
                    log.Info($"✅ Logout exitoso");

                log.Info($"🏁 ═══════════════════════════════════════════════════");
                log.Info($"🏁 FIN CrearPurchaseRequest — ID Solicitud: {Header[0].IdSolicitudCompra}");
                log.Info($"🏁 ═══════════════════════════════════════════════════");
            }

            return responseAbx;
        }

        /// <summary>
        /// Crea una Entrada de Mercancía (GoodsReceipt PO) en SAP B1 via Service Layer
        /// basada en una Orden de Compra existente.
        /// </summary>
        public async Task<GlobalCommands.SapResponse> CrearEntradaMercanciaAsync(AccesoDatosAlmacen.EntradasMercanciaRequest payload)
        {
            var responseAbx = new GlobalCommands.SapResponse { IsError = true };

            try
            {
                log.Info($"🚀 ═══════════════════════════════════════════════════");
                log.Info($"🚀 INICIO CrearEntradaMercancia — DocEntry OC: {payload.DocEntryOrdenCompra}");
                log.Info($"🚀 ═══════════════════════════════════════════════════");

                // ✅ 1 — Login
                log.Info($"🔐 Iniciando sesión en SAP Service Layer...");
                var loginResult = await LoginService.LoginAsyncHttpClient();

                if (loginResult.IsError)
                {
                    log.Error($"❌ Login fallido: {loginResult.Message}");
                    responseAbx.Message = "Error al iniciar sesión en SAP: " + loginResult.Message;
                    return responseAbx;
                }

                log.Info($"✅ Login exitoso — SessionId: {loginResult.SessionId}");

                // ✅ 2 — Armar DocumentLines basadas en la Orden de Compra
                log.Info($"📦 Armando DocumentLines — Total líneas: {payload.Lineas.Count}");

                var documentLines = payload.Lineas.Select(linea => new
                {
                    BaseType = 22,                      // 22 = Purchase Order
                    BaseEntry = payload.DocEntryOrdenCompra,
                    BaseLine = linea.NumeroLinea,       // LineNum de la línea en la OC (base 0)
                                                        // ItemCode = linea.ItemCode,
                    Quantity = linea.Cantidad,
                    UnitPrice = linea.PrecioUnitario
                }).ToList();

                foreach (var line in documentLines)
                {
                    log.Debug($"   📋 Línea — BaseEntry: {line.BaseEntry} | BaseLine: {line.BaseLine} | Qty: {line.Quantity} | Precio: {line.UnitPrice}");
                }

                // ✅ 3 — Armar body
                var goodsReceipt = new
                {
                    DocDate = payload.fechaDoc,
                    DocDueDate = payload.fechaDoc,
                    U_COK1_01FOLIOUUID = payload.Lineas[0].Folio, // 👈 aquí
                    Comments = $"Entrada de mercancía generada por interfaz PTM Mantenimientos — {DateTime.Now:dd/MM/yyyy HH:mm:ss}",
                    DocumentLines = documentLines
                };

                var jsonBody = JsonConvert.SerializeObject(goodsReceipt);
                log.Info($"📤 Body armado correctamente");
                log.Debug($"📤 JSON: {jsonBody}");

                var content = new StringContent(jsonBody, Encoding.UTF8, "application/json");
                content.Headers.ContentType.CharSet = "utf-8";

                // ✅ 4 — Enviar a SAP
                var url = $"{ConfigurationManager.AppSettings["ServiceLayer"]}/PurchaseDeliveryNotes";
                log.Info($"🌐 Enviando POST a: {url}");

                var response = await LoginService._httpClient.PostAsync(url, content);
                var result = await response.Content.ReadAsStringAsync();

                log.Info($"📥 Respuesta SAP — StatusCode: {(int)response.StatusCode}");
                log.Debug($"📥 Respuesta SAP — Body: {result}");

                if (response.IsSuccessStatusCode)
                {
                    dynamic jsonResponse = JsonConvert.DeserializeObject(result);
                    responseAbx.IsError = false;
                    responseAbx.DocNum = jsonResponse.DocNum?.ToString() ?? string.Empty;
                    responseAbx.DocEntry = jsonResponse.DocEntry?.ToString() ?? string.Empty;
                    responseAbx.Message = "Entrada de mercancía creada correctamente en SAP.";

                    log.Info($"✅ Entrada de mercancía creada — DocNum: {responseAbx.DocNum} | DocEntry: {responseAbx.DocEntry}");
                }
                else
                {
                    try
                    {
                        dynamic errorResponse = JsonConvert.DeserializeObject(result);
                        string errorCode = errorResponse.error.code?.ToString() ?? "?";
                        string errorValue = errorResponse.error.message.value?.ToString() ?? result;
                        responseAbx.Message = $"Error SAP: {errorCode} / {errorValue}";
                    }
                    catch
                    {
                        responseAbx.Message = $"Error SAP ({(int)response.StatusCode}): {result}";
                    }

                    log.Error($"❌ Error al crear Entrada de Mercancía — StatusCode: {(int)response.StatusCode}");
                    log.Error($"❌ Detalle: {responseAbx.Message}");
                }
            }
            catch (Exception ex)
            {
                responseAbx.Message = $"Excepción al crear Entrada de Mercancía: {ex.Message}";
                log.Error($"💥 Excepción en CrearEntradaMercanciaAsync: {ex.Message}");
                log.Error($"💥 StackTrace: {ex.StackTrace}");
            }
            finally
            {
                // ✅ 5 — Logout siempre
                log.Info($"🔓 Cerrando sesión SAP...");
                var logoutResult = await LoginService.LogoutAsyncHttpClient();

                if (logoutResult.IsError)
                    log.Warn($"⚠️ Logout con advertencia: {logoutResult.Message}");
                else
                    log.Info($"✅ Logout exitoso");

                log.Info($"🏁 ═══════════════════════════════════════════════════");
                log.Info($"🏁 FIN CrearEntradaMercancia — DocEntry OC: {payload.DocEntryOrdenCompra}");
                log.Info($"🏁 ═══════════════════════════════════════════════════");
            }

            return responseAbx;
        }

        /// <summary>
        /// Crea una Salida de Mercancía (GoodsIssue) en SAP B1 via Service Layer.
        /// </summary>
        public async Task<GlobalCommands.SapResponse> CrearSalidaMercanciaAsync(AccesoDatosAlmacen.SalidasMercanciaRequest payload)
        {
            var responseAbx = new GlobalCommands.SapResponse { IsError = true };

            try
            {
                log.Info($"🚀 ═══════════════════════════════════════════════════");
                log.Info($"🚀 INICIO CrearSalidaMercancia — Usuario: {payload.Referencia}");
                log.Info($"🚀 ═══════════════════════════════════════════════════");

                // ✅ 1 — Login
                log.Info($"🔐 Iniciando sesión en SAP Service Layer...");
                var loginResult = await LoginService.LoginAsyncHttpClient();

                if (loginResult.IsError)
                {
                    log.Error($"❌ Login fallido: {loginResult.Message}");
                    responseAbx.Message = "Error al iniciar sesión en SAP: " + loginResult.Message;
                    return responseAbx;
                }

                log.Info($"✅ Login exitoso — SessionId: {loginResult.SessionId}");

                // ✅ 2 — Obtener artículos desde SP
                log.Info($"📦 Obteniendo artículos desde SP — Referencia: {payload.Referencia}");
                // ✅ 3 — Armar body con ExpandoObject para soportar UDFs dinámicos
                dynamic goodsIssue = new ExpandoObject();
                var dictGI = (IDictionary<string, object>)goodsIssue;
                dictGI["DocumentLines"] = new List<object>();


                foreach (var articulo in payload.Contabilizacion)
                {

                    var parameters = new Dictionary<string, (object value, ParameterDirection direction, HanaDbType type)>
                    {
                        { "P_ID_SOLICITUD",(string.IsNullOrEmpty(articulo.IdSolicitud.ToString()) ? (object)null : articulo.IdSolicitud.ToString(), ParameterDirection.Input, HanaDbType.NVarChar)}
                    };

                    var resultHana = GlobalCommands.ExecuteProcedureHanaAuto(AD.GCSGetDetalleArtSalida, parameters);

                    string articulos = resultHana.JsonResult.ToString();

                    if (articulos == "[]")
                    {
                        log.Warn($"⚠️ No se encontraron artículos para la solicitud: {payload.Referencia}");
                        responseAbx.Message = $"No se encontró información de artículos asociada a la solicitud {payload.Referencia}";
                        return responseAbx;
                    }

                    if (articulos.Contains("Error"))
                    {
                        log.Error($"❌ Error al obtener artículos: {articulos}");
                        responseAbx.Message = $"No fue posible obtener información de los artículos: {articulos}";
                        return responseAbx;
                    }

                    JArray articulosData = JArray.Parse(articulos);
                    log.Info($"📦 Artículos obtenidos — Total líneas: {articulosData.Count}");

                    foreach (var linea in articulosData)
                    {
                        var newLine = new ExpandoObject() as IDictionary<string, object>;

                        newLine["ItemCode"] = linea["REFACCION_SOLICITADA"].ToString();
                        //newLine["Quantity"] = Convert.ToDouble(linea["CANTIDAD"]);
                        newLine["Quantity"] = Convert.ToDouble(articulo.Cantidad);
                        newLine["WarehouseCode"] = (payload.Planta == 1 ? ConfigurationManager.AppSettings["AlmacenP1"] : ConfigurationManager.AppSettings["AlmacenP2"]);
                        newLine["CostingCode"] = articulo.Departamento;
                        newLine["CostingCode2"] = articulo.Proceso;
                        newLine["CostingCode3"] = articulo.Gastos;
                        newLine["CostingCode4"] = articulo.Cedis;
                        newLine["CostingCode5"] = payload.DataMovimiento.NumEmpleado;
                        newLine["U_EMPLEADO"] = payload.DataMovimiento.Recibe;
                        newLine["U_ALMACENISTA"] = payload.DataMovimiento.Entrega;


                        // ✅ Cuenta contable si aplica
                        if (!string.IsNullOrWhiteSpace(linea["CuentaContable"]?.ToString()))
                        {
                            newLine["AccountCode"] = linea["CuentaContable"].ToString();
                            log.Debug($"   💳 Cuenta contable asignada: {newLine["AccountCode"]}");
                        }

                        // Solo agrega BatchNumbers si el artículo maneja lotes
                        if (linea["ManBtchNum"]?.ToString() == "Y" &&
                            linea["Lote"] != null &&
                            !string.IsNullOrWhiteSpace(linea["Lote"].ToString()))
                        {
                            newLine["BatchNumbers"] = new List<object>
                        {
                            new
                            {
                                BatchNumber = linea["Lote"].ToString(),
                                Quantity    = Convert.ToDouble(linea["CANTIDAD"])
                            }
                        };

                            log.Debug($"🏷️ Lote asignado: {linea["Lote"]} | Qty: {linea["Cantidad"]}");

                        }


                        log.Debug($"   📋 Línea — ItemCode: {newLine["ItemCode"]} | Qty: {newLine["Quantity"]} | Almacén: {newLine["WarehouseCode"]}");

                        ((List<object>)dictGI["DocumentLines"]).Add(newLine);
                    }
                }


                dictGI["DocDate"] = DateTime.Now.ToString("yyyy-MM-dd");
                dictGI["DocDueDate"] = DateTime.Now.ToString("yyyy-MM-dd");
                dictGI["Comments"] = $"Salida de mercancía generada por interfaz PTM Mantenimientos — {DateTime.Now:dd/MM/yyyy HH:mm:ss}. Para solicitud: {payload.Referencia} Orden Trabajo: {payload.OrdenTrabajo}";
                dictGI["JournalMemo"] = $"Salida de mercancía para solicitud: {payload.Referencia} Orden Trabajo: {payload.OrdenTrabajo}";
                dictGI["Reference2"] = payload.DataMovimiento.Recibe;

                var serie = GetSerieByName(payload.Contabilizacion[0].Cedis);

                //La serie debe ser igual al CEDIS
                dictGI["Series"] = serie;



                // ✅ 4 — Enviar a SAP
                var jsonBody = JsonConvert.SerializeObject(goodsIssue);
                log.Info($"📤 Body armado correctamente");
                log.Debug($"📤 JSON: {jsonBody}");

                var content = new StringContent(jsonBody, Encoding.UTF8, "application/json");
                content.Headers.ContentType.CharSet = "utf-8";

                var url = $"{ConfigurationManager.AppSettings["ServiceLayer"]}/InventoryGenExits";
                log.Info($"🌐 Enviando POST a: {url}");

                var response = await LoginService._httpClient.PostAsync(url, content);
                var result = await response.Content.ReadAsStringAsync();

                log.Info($"📥 Respuesta SAP — StatusCode: {(int)response.StatusCode}");
                log.Debug($"📥 Respuesta SAP — Body: {result}");

                if (response.IsSuccessStatusCode)
                {
                    dynamic jsonResponse = JsonConvert.DeserializeObject(result);
                    responseAbx.IsError = false;
                    responseAbx.DocNum = jsonResponse.DocNum?.ToString() ?? string.Empty;
                    responseAbx.DocEntry = jsonResponse.DocEntry?.ToString() ?? string.Empty;
                    responseAbx.Message = "Salida de mercancía creada correctamente en SAP.";

                    log.Info($"✅ Salida de mercancía creada — DocNum: {responseAbx.DocNum} | DocEntry: {responseAbx.DocEntry}");

                    // ✅ Actualizar tablas internas
                    //log.Info($"🔄 Actualizando tablas internas...");
                    var paramUpdate = new Dictionary<string, (object value, ParameterDirection direction, HanaDbType type)>
                    {
                        { "P_DOCENTRY",     (  jsonResponse.DocEntry?.ToString() ?? string.Empty, ParameterDirection.Input, HanaDbType.Integer) },
                        { "P_FECHA_SOLICITUD", ("", ParameterDirection.Input, HanaDbType.NVarChar) },
                        { "P_FOLIO", ("", ParameterDirection.Input, HanaDbType.NVarChar) },
                        { "P_ORDEN_TRABAJO", (payload.Referencia, ParameterDirection.Input, HanaDbType.NVarChar) },
                        { "P_REFACCION_SOLICITADA", ("", ParameterDirection.Input, HanaDbType.NVarChar) },
                        { "P_SOLICITANTE", (payload.DataMovimiento.Solicitante, ParameterDirection.Input, HanaDbType.NVarChar) },
                        { "O_ERROR", ("", ParameterDirection.Input, HanaDbType.NVarChar) },
                        { "O_MSG", ("", ParameterDirection.Input, HanaDbType.NVarChar) },
                    };

                    var resultUpdate = GlobalCommands.ExecuteProcedureHanaAuto(
                        AD.GCUpdateUDFSalida, paramUpdate
                    );


                    string resultadoUpdateEst = resultUpdate.JsonResult.ToString();
                    if (resultadoUpdateEst.Contains("ERROR") || resultadoUpdateEst.Contains("Error"))
                        throw new Exception("Error al actualizar losc campos definidos de la salida: " + resultadoUpdateEst);

                    log.Info($"✅ UDFs actualizados correctamente");
                }
                else
                {
                    try
                    {
                        dynamic errorResponse = JsonConvert.DeserializeObject(result);
                        string errorCode = errorResponse.error.code?.ToString() ?? "?";
                        string errorValue = errorResponse.error.message.value?.ToString() ?? result;
                        responseAbx.Message = $"Error SAP: {errorCode} / {errorValue}";
                    }
                    catch
                    {
                        responseAbx.Message = $"Error SAP ({(int)response.StatusCode}): {result}";
                    }

                    log.Error($"❌ Error al crear Salida de Mercancía — StatusCode: {(int)response.StatusCode}");
                    log.Error($"❌ Detalle: {responseAbx.Message}");
                }
            }
            catch (Exception ex)
            {
                responseAbx.Message = $"Excepción al crear Salida de Mercancía: {ex.Message}";
                log.Error($"💥 Excepción en CrearSalidaMercanciaAsync: {ex.Message}");
                log.Error($"💥 StackTrace: {ex.StackTrace}");
            }
            finally
            {
                // ✅ 5 — Logout siempre
                log.Info($"🔓 Cerrando sesión SAP...");
                var logoutResult = await LoginService.LogoutAsyncHttpClient();

                if (logoutResult.IsError)
                    log.Warn($"⚠️ Logout con advertencia: {logoutResult.Message}");
                else
                    log.Info($"✅ Logout exitoso");

                log.Info($"🏁 ═══════════════════════════════════════════════════");
                log.Info($"🏁 FIN CrearSalidaMercancia — Referencia: {payload.Referencia}");
                log.Info($"🏁 ═══════════════════════════════════════════════════");
            }

            return responseAbx;
        }

        public async Task<int> GetSerieByName(string Cedis)
        {
            var paramgs = new Dictionary<string, (object value, ParameterDirection direction, HanaDbType type)>
            {
                { "P_SERIES_NAME",     (  Cedis ?? string.Empty, ParameterDirection.Input, HanaDbType.Integer) },
            };

            var resultGS = GlobalCommands.ExecuteProcedureHanaAuto(
                AD.GCGetSerieByName, paramgs
            );


            string resultadoSerie = resultGS.JsonResult.ToString();
            if (resultadoSerie.Contains("ERROR") || resultadoSerie.Contains("Error"))
                throw new Exception("Error al obtner la serie de numeracion: " + resultadoSerie);

            JArray series = JArray.Parse(resultadoSerie);

            if (series.Count > 0)
            {
                var first = series[0];

                int serie = first["Series"]?.Value<int>() ?? 0;

                return serie;
            }

            return 0;

        }

        /// <summary>
        /// Crea una Entrada de Mercancía (InventoryGenEntries) en SAP B1 via Service Layer.
        /// Usado para devoluciones internas de refacciones de técnicos.
        /// Ahora soporta múltiples artículos enviados directamente.
        /// </summary>
        public async Task<GlobalCommands.SapResponse> CrearEntradaDevolucionAsync(AccesoDatosAlmacen.SalidasMercanciaRequest payload)
        {
            var responseAbx = new GlobalCommands.SapResponse { IsError = true };

            try
            {
                log.Info($"🚀 ═══════════════════════════════════════════════════");
                log.Info($"🚀 INICIO CrearEntradaDevolucion — Referencia: {payload.Referencia}");
                log.Info($"🚀 ═══════════════════════════════════════════════════");

                // ✅ 1 — Login
                log.Info($"🔐 Iniciando sesión en SAP Service Layer...");
                var loginResult = await LoginService.LoginAsyncHttpClient();

                if (loginResult.IsError)
                {
                    log.Error($"❌ Login fallido: {loginResult.Message}");
                    responseAbx.Message = "Error al iniciar sesión en SAP: " + loginResult.Message;
                    return responseAbx;
                }

                log.Info($"✅ Login exitoso — SessionId: {loginResult.SessionId}");

                // ✅ 2 — Obtener artículos: puede venir del payload.Contabilizacion (nuevo flujo) o del SP (viejo flujo)
                List<Dictionary<string, object>> articulosData = new List<Dictionary<string, object>>();

                if (payload.Contabilizacion != null && payload.Contabilizacion.Count > 0)
                {
                    // Nuevo flujo: los artículos vienen en el payload
                    log.Info($"📦 Obteniendo artículos desde payload — Total: {payload.Contabilizacion.Count}");

                    foreach (var articulo in payload.Contabilizacion)
                    {
                        // Obtener información adicional del artículo desde SP (para Warehouse, etc.)
                        var parameters = new Dictionary<string, (object value, ParameterDirection direction, HanaDbType type)>
                        {
                            { "P_ID_SOLICITUD", (articulo.IdSolicitud.ToString(), ParameterDirection.Input, HanaDbType.NVarChar) }
                        };

                        var resultHana = GlobalCommands.ExecuteProcedureHanaAuto(AD.GCSGetDetalleArtSalida, parameters);
                        string articulosStr = resultHana.JsonResult.ToString();

                        if (!articulosStr.Contains("ERROR") && articulosStr != "[]")
                        {
                            var articulosTemp = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(articulosStr);
                            if (articulosTemp.Count > 0)
                            {
                                var artInfo = articulosTemp[0];
                                artInfo["CANTIDAD"] = articulo.Cantidad; // Usar la cantidad del payload
                                artInfo["CostingCode"] = articulo.Departamento;
                                artInfo["CostingCode2"] = articulo.Proceso;
                                artInfo["CostingCode3"] = articulo.Gastos;
                                artInfo["CostingCode4"] = articulo.Cedis;
                                artInfo["CostingCode5"] = payload.DataMovimiento.NumEmpleado;
                                artInfo["U_EMPLEADO"] = payload.DataMovimiento.Recibe;
                                artInfo["U_ALMACENISTA"] = payload.DataMovimiento.Entrega;
                                articulosData.Add(artInfo);
                            }
                        }
                    }
                }
                else
                {
                    // Viejo flujo: obtener desde SP
                    log.Info($"📦 Obteniendo artículos desde SP — Referencia: {payload.Referencia}");

                    var parameters = new Dictionary<string, (object value, ParameterDirection direction, HanaDbType type)>
                    {
                        { "P_ID_SOLICITUD", (string.IsNullOrEmpty(payload.Referencia) ? (object)null : payload.Referencia, ParameterDirection.Input, HanaDbType.NVarChar) }
                    };

                    var resultHana = GlobalCommands.ExecuteProcedureHanaAuto(AD.GCSGetDetalleArtSalida, parameters);
                    string articulos = resultHana.JsonResult.ToString();

                    if (articulos == "[]")
                    {
                        log.Warn($"⚠️ No se encontraron artículos para la solicitud: {payload.Referencia}");
                        responseAbx.Message = $"No se encontró información de artículos asociada a la solicitud {payload.Referencia}";
                        return responseAbx;
                    }

                    if (articulos.Contains("Error"))
                    {
                        log.Error($"❌ Error al obtener artículos: {articulos}");
                        responseAbx.Message = $"No fue posible obtener información de los artículos: {articulos}";
                        return responseAbx;
                    }

                    articulosData = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(articulos);
                }

                log.Info($"📦 Artículos obtenidos — Total líneas: {articulosData.Count}");

                if (articulosData.Count == 0)
                {
                    responseAbx.Message = "No se encontraron artículos para procesar la devolución.";
                    return responseAbx;
                }

                // ✅ 3 — Armar body (InventoryGenEntries)
                dynamic goodsReceipt = new ExpandoObject();
                var dictGR = (IDictionary<string, object>)goodsReceipt;

                dictGR["DocDate"] = DateTime.Now.ToString("yyyy-MM-dd");
                dictGR["DocDueDate"] = DateTime.Now.ToString("yyyy-MM-dd");
                dictGR["Comments"] = $"Devolución de refacciones — {DateTime.Now:dd/MM/yyyy HH:mm:ss}";
                dictGR["JournalMemo"] = $"Devolución interna solicitud: {payload.Referencia} orden trabajo: {payload.OrdenTrabajo}";
                dictGR["Reference2"] = payload.DataMovimiento.Recibe;
                dictGR["DocumentLines"] = new List<object>();
                //FALTA SERIE = CEDIS

                var serie = GetSerieByName(payload.Contabilizacion[0].Cedis);
                dictGR["Serie"] = serie;


                foreach (var linea in articulosData)
                {
                    var newLine = new ExpandoObject() as IDictionary<string, object>;

                    newLine["ItemCode"] = linea["REFACCION_SOLICITADA"].ToString();
                    newLine["Quantity"] = Convert.ToDouble(linea["CANTIDAD"]);
                    newLine["WarehouseCode"] = newLine["WarehouseCode"] = (payload.Planta == 1 ? ConfigurationManager.AppSettings["AlmacenP1"] : ConfigurationManager.AppSettings["AlmacenP2"]);
                    newLine["CostingCode"] = linea["CostingCode"];
                    newLine["CostingCode2"] = linea["CostingCode2"];
                    newLine["CostingCode3"] = linea["CostingCode3"];
                    newLine["CostingCode4"] = linea["CostingCode4"];
                    newLine["CostingCode5"] = payload.DataMovimiento.NumEmpleado;
                    newLine["U_EMPLEADO"] = payload.DataMovimiento.Recibe;
                    newLine["U_ALMACENISTA"] = payload.DataMovimiento.Entrega;


                    // Cuenta contable (opcional pero recomendable)
                    if (linea.ContainsKey("CuentaContable") && !string.IsNullOrWhiteSpace(linea["CuentaContable"]?.ToString()))
                    {
                        newLine["AccountCode"] = linea["CuentaContable"].ToString();
                        log.Debug($"   💳 Cuenta contable asignada: {newLine["AccountCode"]}");
                    }

                    // Lotes (si aplica)
                    if (linea.ContainsKey("ManBtchNum") && linea["ManBtchNum"]?.ToString() == "Y" &&
                        linea.ContainsKey("Lote") && linea["Lote"] != null &&
                        !string.IsNullOrWhiteSpace(linea["Lote"].ToString()))
                    {
                        newLine["BatchNumbers"] = new List<object>
                        {
                            new
                            {
                                BatchNumber = linea["Lote"].ToString(),
                                Quantity = Convert.ToDouble(linea["CANTIDAD"])
                            }
                        };

                        log.Debug($"🏷️ Lote asignado: {linea["Lote"]}");
                    }

                    log.Debug($"   📋 Línea — ItemCode: {newLine["ItemCode"]} | Qty: {newLine["Quantity"]} | Almacén: {newLine["WarehouseCode"]}");

                    ((List<object>)dictGR["DocumentLines"]).Add(newLine);
                }

                // ✅ 4 — Enviar a SAP
                var jsonBody = JsonConvert.SerializeObject(goodsReceipt);
                log.Info($"📤 Body armado correctamente");
                log.Debug($"📤 JSON: {jsonBody}");

                var content = new StringContent(jsonBody, Encoding.UTF8, "application/json");
                content.Headers.ContentType.CharSet = "utf-8";

                var url = $"{ConfigurationManager.AppSettings["ServiceLayer"]}/InventoryGenEntries";
                log.Info($"🌐 Enviando POST a: {url}");

                var response = await LoginService._httpClient.PostAsync(url, content);
                var result = await response.Content.ReadAsStringAsync();

                log.Info($"📥 Respuesta SAP — StatusCode: {(int)response.StatusCode}");
                log.Debug($"📥 Respuesta SAP — Body: {result}");

                if (response.IsSuccessStatusCode)
                {
                    dynamic jsonResponse = JsonConvert.DeserializeObject(result);
                    responseAbx.IsError = false;
                    responseAbx.DocNum = jsonResponse.DocNum?.ToString() ?? string.Empty;
                    responseAbx.DocEntry = jsonResponse.DocEntry?.ToString() ?? string.Empty;
                    responseAbx.Message = "Entrada por devolución creada correctamente en SAP.";

                    log.Info($"✅ Entrada creada (devolución) — DocNum: {responseAbx.DocNum} | DocEntry: {responseAbx.DocEntry}");

                    // ✅ Actualizar tablas internas
                    //log.Info($"🔄 Actualizando tablas internas...");
                    var paramUpdate = new Dictionary<string, (object value, ParameterDirection direction, HanaDbType type)>
                    {
                        { "P_DOCENTRY",     (  jsonResponse.DocEntry?.ToString() ?? string.Empty, ParameterDirection.Input, HanaDbType.Integer) },
                        { "P_FECHA_SOLICITUD", ("", ParameterDirection.Input, HanaDbType.NVarChar) },
                        { "P_FOLIO", ("", ParameterDirection.Input, HanaDbType.NVarChar) },
                        { "P_ORDEN_TRABAJO", (payload.Referencia, ParameterDirection.Input, HanaDbType.NVarChar) },
                        { "P_REFACCION_SOLICITADA", ("", ParameterDirection.Input, HanaDbType.NVarChar) },
                        { "P_SOLICITANTE", (payload.DataMovimiento.Solicitante, ParameterDirection.Input, HanaDbType.NVarChar) },
                        { "O_ERROR", ("", ParameterDirection.Input, HanaDbType.NVarChar) },
                        { "O_MSG", ("", ParameterDirection.Input, HanaDbType.NVarChar) },
                    };

                    var resultUpdate = GlobalCommands.ExecuteProcedureHanaAuto(
                        AD.GCUpdateUDFEntradaDirecta, paramUpdate
                    );

                    string resultadoUpdateEst = resultUpdate.JsonResult.ToString();
                    if (resultadoUpdateEst.Contains("ERROR") || resultadoUpdateEst.Contains("Error"))
                        throw new Exception("Error al actualizar los campos definidos de la entrada directa (devolción): " + resultadoUpdateEst);

                    log.Info($"✅ Entrada mercancia (devolución) UDFs actualizados correctamente");


                }
                else
                {
                    try
                    {
                        dynamic errorResponse = JsonConvert.DeserializeObject(result);
                        string errorCode = errorResponse.error.code?.ToString() ?? "?";
                        string errorValue = errorResponse.error.message.value?.ToString() ?? result;
                        responseAbx.Message = $"Error SAP: {errorCode} / {errorValue}";
                    }
                    catch
                    {
                        responseAbx.Message = $"Error SAP ({(int)response.StatusCode}): {result}";
                    }

                    log.Error($"❌ Error al crear Entrada por devolución — StatusCode: {(int)response.StatusCode}");
                    log.Error($"❌ Detalle: {responseAbx.Message}");
                }
            }
            catch (Exception ex)
            {
                responseAbx.Message = $"Excepción al crear Entrada por devolución: {ex.Message}";
                log.Error($"💥 Excepción en CrearEntradaDevolucionAsync: {ex.Message}");
                log.Error($"💥 StackTrace: {ex.StackTrace}");
            }
            finally
            {
                // ✅ 5 — Logout
                log.Info($"🔓 Cerrando sesión SAP...");
                var logoutResult = await LoginService.LogoutAsyncHttpClient();

                if (logoutResult.IsError)
                    log.Warn($"⚠️ Logout con advertencia: {logoutResult.Message}");
                else
                    log.Info($"✅ Logout exitoso");

                log.Info($"🏁 ═══════════════════════════════════════════════════");
                log.Info($"🏁 FIN CrearEntradaDevolucion — Referencia: {payload.Referencia}");
                log.Info($"🏁 ═══════════════════════════════════════════════════");
            }

            return responseAbx;
        }

        #endregion
    }
}