using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Sap.Data.Hana;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using System.Xml.Serialization;

namespace MantenimientosPTM
{
    public class GlobalCommands
    {
        #region global

        public class HanaProcedureResult
        {
            public string JsonResult { get; set; } = string.Empty; // Datos devueltos por SELECT
            public Dictionary<string, object> OutputParameters { get; set; } = new Dictionary<string, object>(); // OUT / INOUT
        }

        public HanaProcedureResult ExecuteProcedureHanaAuto(
            string commandText, Dictionary<string, (object value, ParameterDirection direction, HanaDbType type)> parameters)
        {
            HanaProcedureResult result = new HanaProcedureResult();
            string ConnectionString = ConfigurationManager.ConnectionStrings["HANAConnection"].ConnectionString;

            using (HanaConnection myConnection = new HanaConnection(ConnectionString))
            {
                try
                {
                    myConnection.Open();

                    using (HanaCommand cmd = new HanaCommand(commandText, myConnection))
                    {
                        cmd.CommandTimeout = 60;
                        cmd.CommandType = CommandType.StoredProcedure;

                        // Agregar parámetros
                        if (parameters != null)
                        {
                            foreach (var param in parameters)
                            {
                                HanaDbType type;

                                // Determinar tipo según valor o el tipo predefinido
                                if (param.Value.value == null)
                                {
                                    type = param.Value.type; // se respeta el tipo definido para OUT
                                }
                                else if (param.Value.value is int || param.Value.value is int?)
                                    type = HanaDbType.Integer;
                                else if (param.Value.value is decimal || param.Value.value is decimal?)
                                    type = HanaDbType.Decimal;
                                else if (param.Value.value is DateTime || param.Value.value is DateTime?)
                                    type = HanaDbType.TimeStamp;
                                else
                                    type = HanaDbType.NVarChar;

                                var hanaParam = new HanaParameter(param.Key, type)
                                {
                                    Direction = param.Value.direction,
                                    Value = param.Value.value ?? DBNull.Value
                                };

                                // ✅ Asignar Size para NVarChar y evitar truncado
                                if (type == HanaDbType.NVarChar && param.Value.value is string strVal)
                                {
                                    hanaParam.Size = Math.Max(strVal.Length, 1);
                                }

                                cmd.Parameters.Add(hanaParam);
                            }
                        }


                        using (HanaDataReader reader = cmd.ExecuteReader())
                        {
                            DataTable dt = new DataTable();
                            dt.Load(reader);
                            Console.WriteLine($"Número de filas cargadas: {dt.Rows.Count}");

                            using (StringWriter sw = new StringWriter())
                            using (JsonTextWriter jsonWriter = new JsonTextWriter(sw))
                            {
                                JsonSerializer serializer = new JsonSerializer();
                                serializer.Serialize(jsonWriter, dt);
                                Console.WriteLine("JSON Result: " + sw.ToString());
                                result.JsonResult = sw.ToString();
                            }

                        }
                    }
                }
                catch (Exception ex)
                {
                    result.JsonResult = $"Error: {ex.Message} | Inner: {ex.InnerException?.Message}";
                }
                finally
                {
                    if (myConnection.State == ConnectionState.Open)
                        myConnection.Close();
                }
            }

            return result;
        }

        //Ejecutar query de resultado multiple en formato JSONSTRING
        public string ExecuteProcedure(string commandText, Dictionary<string, string> parameters)
        {
            string result = string.Empty;
            using (SqlConnection myConnection = new SqlConnection(ConfigurationManager.ConnectionStrings["FFISAConnection"].ConnectionString))
            {
                try
                {
                    myConnection.Open();

                    using (SqlCommand cmd = new SqlCommand(commandText, myConnection))
                    {
                        cmd.CommandTimeout = 30;

                        if (parameters != null && parameters.Count > 0)
                        {
                            foreach (var parameter in parameters)
                            {
                                if (parameter.Value == null)
                                {
                                    cmd.Parameters.AddWithValue("@" + parameter.Key, DBNull.Value);
                                }
                                else
                                {
                                    cmd.Parameters.AddWithValue("@" + parameter.Key, parameter.Value);
                                }
                            }
                        }
                        cmd.CommandType = CommandType.Text;

                        using (SqlDataReader reader = cmd.ExecuteReader())
                        {
                            using (StringWriter sw = new StringWriter())
                            using (JsonTextWriter jsonWriter = new JsonTextWriter(sw))
                            {
                                DataTable dtDocuments = new DataTable();
                                dtDocuments.Load(reader);

                                JsonSerializer serializer = new JsonSerializer();
                                serializer.Serialize(jsonWriter, dtDocuments);
                                result = sw.ToString();

                                //JsonSerializer serializer = new JsonSerializer
                                //{
                                //    // Configuraciones para escapar caracteres conflictivos y mejorar legibilidad
                                //    StringEscapeHandling = StringEscapeHandling.EscapeNonAscii,
                                //    Formatting = Formatting.Indented // Cambiar a None si no necesitas el formato legible
                                //};
                            }
                        }
                    }
                }
                catch (Exception E)
                {
                    StringBuilder Error = new StringBuilder();
                    Error.Append("Error: ");
                    Error.Append(E.Message ?? "");
                    Error.Append(E.InnerException != null ? E.InnerException.ToString() : "");
                    result = Error.ToString();
                }
                finally
                {
                    if (myConnection.State == ConnectionState.Open)
                    {
                        myConnection.Close();
                    }
                }
            }

            return result;
        }

        public Dictionary<string, (object value, ParameterDirection direction, HanaDbType type)>
        ConvertToHanaParameters(object obj, bool ShouldRenameParams, Dictionary<string, HanaDbType> outputParams = null)
        {
            var parameters = new Dictionary<string, (object value, ParameterDirection direction, HanaDbType type)>();

            if (obj == null)
                return parameters;

            var properties = obj.GetType().GetProperties();

            foreach (var prop in properties)
            {
                object value = prop.GetValue(obj);

                // 🔥 Manejo correcto de null y strings vacíos
                if (value is string str && string.IsNullOrWhiteSpace(str))
                    value = DBNull.Value;
                else
                    value = value ?? DBNull.Value;

                ParameterDirection direction = ParameterDirection.Input;

                // Verifica si es parámetro de salida
                if (outputParams != null && outputParams.ContainsKey(prop.Name))
                {
                    direction = ParameterDirection.Output;
                }

                // Detecta tipo de dato
                HanaDbType type;
                Type propType = Nullable.GetUnderlyingType(prop.PropertyType) ?? prop.PropertyType;

                if (propType == typeof(int))
                    type = HanaDbType.Integer;
                else if (propType == typeof(decimal))
                    type = HanaDbType.Decimal;
                else if (propType == typeof(double))
                    type = HanaDbType.Double;
                else if (propType == typeof(DateTime))
                    type = HanaDbType.TimeStamp;
                else if (propType == typeof(bool))
                    type = HanaDbType.Boolean;
                else
                    type = HanaDbType.NVarChar;

                // 🔹 Prefijo P_ y mayúsculas
                string paramName = ShouldRenameParams
                    ? "P_" + prop.Name.ToUpper()
                    : prop.Name;

                parameters.Add(paramName, (value, direction, type));
            }

            // 🔥 Agregar parámetros OUT que no vienen en el objeto
            if (outputParams != null)
            {
                foreach (var outParam in outputParams)
                {
                    if (!parameters.ContainsKey(outParam.Key))
                    {
                        parameters.Add(
                            outParam.Key,
                            (
                                HanaDbTypeToDefault(outParam.Value),
                                ParameterDirection.Output,
                                outParam.Value
                            )
                        );
                    }
                }
            }

            return parameters;
        }

        private object HanaDbTypeToDefault(HanaDbType type)
        {
            switch (type)
            {
                case HanaDbType.Integer:
                    return 0;
                case HanaDbType.NVarChar:
                    return string.Empty;
                case HanaDbType.Decimal:
                    return 0M;
                case HanaDbType.TimeStamp:
                    return DateTime.MinValue;
                default:
                    return null;
            }
        }
        public StringBuilder Excepcion(Exception E, string msg)
        {

            // 6. Obtener el número de línea del error
            int lineNumber = new StackTrace(E, true).GetFrame(0).GetFileLineNumber();

            // 7. Crear un mensaje de error detallado
            StringBuilder sb = new StringBuilder();
            sb.Append(msg);
            sb.Append(E.Message);
            sb.Append($" (Línea: {lineNumber})");

            return sb;
        }

        // 🔹 Método para convertir un objeto a XML
        public string SerializeToXml<T>(T obj)
        {
            XmlSerializer serializer = new XmlSerializer(typeof(T));
            using (StringWriter textWriter = new StringWriter())
            {
                serializer.Serialize(textWriter, obj);
                return textWriter.ToString();
            }
        }

        // Método de login asíncrono con webrequest
        public async Task<GlobalCommands.SapResponse> LoginAsyncHttpWebRequest()
        {
            GlobalCommands.SapResponse responseAbx = new GlobalCommands.SapResponse();
            var loginUrl = $"{ConfigurationManager.AppSettings["ServiceLayer"].ToString()}/Login";
            var loginPayload = new
            {
                CompanyDB = ConfigurationManager.AppSettings["SapDatabase"],     // Nombre de la base de datos en SAP
                UserName = ConfigurationManager.AppSettings["SapUser"],          // Usuario de SAP
                Password = ConfigurationManager.AppSettings["SapPassword"],         // Contraseña
                lang = "en-us"             // Idioma preferido de la sesión
            };
            responseAbx.IsError = true;
            // 1. Ignorar errores de SSL (solo para desarrollo)
            ServicePointManager.ServerCertificateValidationCallback = (sender, certificate, chain, sslPolicyErrors) => true;
            ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12; // Usar TLS 1.2

            var request = (HttpWebRequest)WebRequest.Create(loginUrl);
            request.Method = "POST";

            request.UseDefaultCredentials = true;
            request.ContentType = "application/json;odata=minimalmetadata;charset=utf8";

            request.KeepAlive = true;
            //     httpWebRequest.ServerCertificateValidationCallback += (sender, certificate, chain, sslPolicyErrors) => true;
            request.Accept = "application/json;odata=minimalmetadata";
            request.ServicePoint.Expect100Continue = false;
            request.Headers.Add("B1S-WCFCompatible", "true");
            request.Headers.Add("B1S-MetadataWithoutSession", "true");
            request.AllowAutoRedirect = true;
            request.Timeout = 10000000;

            using (var streamWriter = new StreamWriter(await request.GetRequestStreamAsync()))
            {
                var json = JsonConvert.SerializeObject(loginPayload);
                await streamWriter.WriteAsync(json);
                await streamWriter.FlushAsync();
            }

            try
            {
                using (var response = (HttpWebResponse)await request.GetResponseAsync())
                {
                    using (var reader = new StreamReader(response.GetResponseStream()))
                    {
                        responseAbx.IsError = false;
                        var result = await reader.ReadToEndAsync();
                        dynamic jsonResponse = JsonConvert.DeserializeObject(result);
                        string SessionId = jsonResponse.SessionId;
                        responseAbx.SessionId = SessionId;
                        // return responseAbx;
                    }
                }
            }
            catch (WebException ex)
            {
                using (var errorResponse = (HttpWebResponse)ex.Response)
                {
                    using (var reader = new StreamReader(errorResponse.GetResponseStream()))
                    {
                        string errorText = await reader.ReadToEndAsync();
                        Console.WriteLine($"Login failed: {errorText}");
                        responseAbx.IsError = true;
                        responseAbx.Message = errorText;

                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Login failed: {ex.Message}");
                responseAbx.IsError = true;
                responseAbx.Message = ex.Message;
            }

            return responseAbx;
        }
        // Método cerrar sesion asíncrono con webrequest
        public async Task<GlobalCommands.SapResponse> LogoutAsyncHttpWebRequest(string SessionId)
        {
            var responseAbx = new GlobalCommands.SapResponse
            {
                IsError = true
            };

            var logoutUrl = $"{ConfigurationManager.AppSettings["ServiceLayer"]}/Logout";
            var request = (HttpWebRequest)WebRequest.Create(logoutUrl);
            //request.Method = "POST";
            request.ContentType = "application/json";
            request.Method = "POST";
            request.KeepAlive = true;
            request.ServerCertificateValidationCallback += (sender, certificate, chain, sslPolicyErrors) => true;
            request.Accept = "application/jsona";
            request.Headers.Add("Cookie", $"B1SESSION={SessionId}");


            try
            {
                using (var response = (HttpWebResponse)await request.GetResponseAsync())
                {
                    responseAbx.IsError = false;
                    responseAbx.Message = "Logout exitoso.";
                }

                return responseAbx;
            }
            catch (Exception ex)
            {
                responseAbx.Message = $"Exception: {ex.Message}";
                return responseAbx;
            }
        }

        public Dictionary<string, string> ConvertToParameters(object obj)
        {
            var parameters = new Dictionary<string, string>();

            var properties = obj.GetType().GetProperties();

            foreach (var prop in properties)
            {
                var value = prop.GetValue(obj);
                // Convierte el valor a string o "" si es null
                parameters.Add(prop.Name, value?.ToString() ?? "");
            }

            return parameters;
        }
        #endregion

        #region Class
        public class SapResponse
        {
            public string SessionId { get; set; }
            public string Message { get; set; }
            // public string IdRole { get; set; }
            public object JsonRsp { get; set; }
            public string Version { get; set; }
            public bool IsError { get; set; }
            public string RouteId { get; set; }
            public string OrdenVenta { get; set; }
            public string DocNum { get; set; }  // ⬅️ agregar
            public string DocEntry { get; set; }  // ⬅️ agregar
        }
        public class JsonResponseMtto
        {
            public string Status { get; set; }
            public string Message { get; set; }
            public string Data { get; set; }
            public JArray DataArray { get; set; }
        }
        #endregion

    }
}