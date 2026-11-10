using System;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Web.Mvc;
using Newtonsoft.Json;
using System.Collections.Generic;
using Sap.Data.Hana;
using System.Data;

namespace MantenimientosPTM.Controllers
{
    public class RutinasController : Controller
    {
        readonly LogicaEquipos Logic = new LogicaEquipos();

        private const int MaxUploadSize = 5 * 1024 * 1024; // 5 MB
        private static readonly string[] ExtensionesImagen = { ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp" };
        private static readonly string[] MimesImagen = { "image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp" };

        #region Helpers de seguridad

        private static bool EsErrorHana(string jsonResult)
        {
            return !string.IsNullOrEmpty(jsonResult) &&
                   jsonResult.IndexOf("ERROR", StringComparison.OrdinalIgnoreCase) >= 0;
        }

        /// <summary>
        /// Limpia un valor para usarlo como segmento de ruta. Evita path traversal.
        /// </summary>
        private static string SanitizarSegmento(string valor, string fallback, int maxLen)
        {
            if (string.IsNullOrWhiteSpace(valor))
                return fallback;

            var chars = valor.Trim().Select(c =>
                (char.IsLetterOrDigit(c) || c == '-' || c == '_' || c == '.') ? c : '_').ToArray();

            string limpio = new string(chars).Replace("..", "_").Trim('.', '_', '-');
            if (string.IsNullOrWhiteSpace(limpio))
                return fallback;

            return limpio.Length > maxLen ? limpio.Substring(0, maxLen) : limpio;
        }

        /// <summary>
        /// Limpia el HTML de plantillas de rutina: elimina scripts, iframes, objetos,
        /// formularios y manejadores de eventos, conservando el HTML/CSS/controles normales.
        /// </summary>
        private static string SanitizarHtmlRutina(string html)
        {
            if (string.IsNullOrEmpty(html))
                return string.Empty;

            string limpio = html;

            // Etiquetas peligrosas (con contenido y autocerradas)
            string[] etiquetas = { "script", "iframe", "object", "embed", "applet", "form", "base", "link", "meta", "svg", "math" };
            foreach (var tag in etiquetas)
            {
                limpio = Regex.Replace(
                    limpio,
                    $@"<{tag}\b[^>]*>.*?</{tag}\s*>",
                    string.Empty,
                    RegexOptions.IgnoreCase | RegexOptions.Singleline);

                limpio = Regex.Replace(
                    limpio,
                    $@"<{tag}\b[^>]*/?>",
                    string.Empty,
                    RegexOptions.IgnoreCase | RegexOptions.Singleline);
            }

            // Manejadores de eventos (onclick, onload, onerror, etc.)
            limpio = Regex.Replace(
                limpio,
                @"\s+on[a-zA-Z]+\s*=\s*(""[^""]*""|'[^']*'|[^\s>]+)",
                string.Empty,
                RegexOptions.IgnoreCase);

            // URLs ejecutables
            limpio = Regex.Replace(limpio, @"(javascript|vbscript)\s*:", string.Empty, RegexOptions.IgnoreCase);
            limpio = Regex.Replace(limpio, @"data\s*:\s*text/html", string.Empty, RegexOptions.IgnoreCase);

            return limpio;
        }

        private static bool EsImagenValida(System.Web.HttpPostedFileBase archivo, out string extension)
        {
            extension = Path.GetExtension(archivo.FileName ?? string.Empty).ToLower();
            if (!ExtensionesImagen.Contains(extension)) return false;
            if (!MimesImagen.Contains((archivo.ContentType ?? string.Empty).ToLower())) return false;
            if (archivo.ContentLength > MaxUploadSize) return false;
            return true;
        }

        #endregion

        // GET: Rutinas/Default?idEquipo=123
        public ActionResult Default(int? idEquipo, string Planta)
        {
            if (!idEquipo.HasValue)
            {
                return View("Default");
            }

            // ✅ Validar Planta
            if (string.IsNullOrEmpty(Planta))
            {
                return View("Default");
            }

            string plantaSanitizada = SanitizarNombreDirectorio(Planta);
            string ruta = Server.MapPath($"~/Views/Rutinas/{plantaSanitizada}/Rutina_{idEquipo}.cshtml");

            if (System.IO.File.Exists(ruta))
            {
                string html = System.IO.File.ReadAllText(ruta);
                html = html.Replace("@{\n    Layout = null;\n}\n\n\n\n\n<meta charset=\"utf-8\">\n\n", string.Empty);
                return Content(SanitizarHtmlRutina(html), "text/html");
            }

            return Content("<div>No existe rutina</div>");
        }

        // 🔥 POST: Rutinas/GuardarRutina
        [HttpPost]
        public JsonResult GuardarRutina(RutinaModel modelo)
        {
            try
            {
                // ✅ VALIDACIÓN 1: Validar que lleguen los datos
                if (modelo == null)
                {
                    return Json(new { Status = "ERROR", Message = "No se recibieron datos para guardar" });
                }

                // ✅ VALIDACIÓN 2: Sanitizar nombres para evitar inyección de path
                string plantaSanitizada = SanitizarNombreDirectorio(modelo.Planta);

                // Determinar id a usar (puede ser periodicidad)
                int idParaArchivo = modelo.IdEquipoPeriodicidad.HasValue && modelo.IdEquipoPeriodicidad.Value > 0
                    ? modelo.IdEquipoPeriodicidad.Value
                    : modelo.IdEquipo;

                string idEquipoSanitizado = SanitizarNombreArchivo(idParaArchivo.ToString());

                // Construir el nombre del archivo usando el idParaArchivo
                string nombreArchivo = $"Rutina_{idEquipoSanitizado}.cshtml";
                string rutaDirectorio = Server.MapPath($"~/Views/Rutinas/{plantaSanitizada}");
                string rutaCompleta = Path.Combine(rutaDirectorio, nombreArchivo);

                // ✅ VALIDACIÓN 3: Crear el directorio si no existe
                if (!Directory.Exists(rutaDirectorio))
                {
                    Directory.CreateDirectory(rutaDirectorio);
                }

                // ✅ VALIDACIÓN 4: Verificar si el archivo ya existe (para backup opcional)
                bool archivoExistia = System.IO.File.Exists(rutaCompleta);


                // Construir el contenido completo del archivo .cshtml
                // Se limpia el HTML para evitar scripts/eventos almacenados (XSS).
                string contenidoCompleto = $@"@{{
                    Layout = null;
                }}
                {SanitizarHtmlRutina(modelo.ContenidoHTML)}";

                // ✅ VALIDACIÓN 5: Escribir el archivo con manejo de permisos
                try
                {
                    System.IO.File.WriteAllText(rutaCompleta, contenidoCompleto, System.Text.Encoding.UTF8);
                }
                catch (UnauthorizedAccessException)
                {
                    return Json(new { Status = "ERROR", Message = "No hay permisos suficientes para guardar el archivo" });
                }
                catch (IOException)
                {
                    return Json(new { Status = "ERROR", Message = "Error al escribir el archivo en disco" });
                }

                return Json(new
                {
                    Status = "OK",
                    Message = archivoExistia
                        ? "Plantilla de rutina actualizada correctamente"
                        : "Plantilla de rutina creada correctamente"
                });
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    Status = "ERROR",
                    Message = $"Error al guardar la rutina: {ex.Message}"
                });
            }
        }

        // ============================================================
        // MÉTODOS AUXILIARES - SANITIZACIÓN
        // ============================================================
        private string SanitizarNombreDirectorio(string nombre)
        {
            return SanitizarSegmento(nombre, "Default", 50);
        }

        private string SanitizarNombreArchivo(string nombre)
        {
            return SanitizarSegmento(nombre, "Default", 100);
        }

        // ============================================================
        // ENDPOINTS PARA GESTIÓN DE IMÁGENES DE RUTINAS
        // ============================================================

        [HttpGet]
        public JsonResult ObtenerImagenes(string NumeroOrden, string Planta)
        {
            try
            {
                string plantaSanitizada = SanitizarNombreDirectorio(Planta);
                string ordenSanitizado = SanitizarNombreArchivo(NumeroOrden);
                string rutaCarpeta = Server.MapPath($"~/EvidenciaRutinas/{plantaSanitizada}/{ordenSanitizado}");

                var imagenes = new System.Collections.Generic.List<string>();

                if (Directory.Exists(rutaCarpeta))
                {
                    var archivos = Directory.GetFiles(rutaCarpeta);
                    foreach (var archivo in archivos)
                    {
                        string extension = Path.GetExtension(archivo).ToLower();
                        if (new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" }.Contains(extension))
                        {
                            string nombreArchivo = Path.GetFileName(archivo);
                            string url = $"/EvidenciaRutinas/{plantaSanitizada}/{ordenSanitizado}/{nombreArchivo}";
                            imagenes.Add(url);
                        }
                    }
                }

                return Json(new
                {
                    Status = "OK",
                    Imagenes = imagenes,
                    Mensaje = imagenes.Count > 0 ? $"Se encontraron {imagenes.Count} imagen(es)" : "No hay imágenes"
                }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    Status = "ERROR",
                    Message = $"Error al obtener imágenes: {ex.Message}"
                }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpPost]
        public JsonResult GuardarImagenes(int idEquipo, string planta, int? idEquipoPeriodicidad = null)
        {
            try
            {
                string plantaSanitizada = SanitizarNombreDirectorio(planta);
                int idParaRutina = idEquipoPeriodicidad.HasValue && idEquipoPeriodicidad.Value > 0
                    ? idEquipoPeriodicidad.Value
                    : idEquipo;

                string rutaCarpeta = Server.MapPath($"~/ImagenesRutinas/{plantaSanitizada}/Rutina_{idParaRutina}");

                if (!Directory.Exists(rutaCarpeta))
                {
                    Directory.CreateDirectory(rutaCarpeta);
                }

                var imagenesGuardadas = new System.Collections.Generic.List<string>();

                if (Request.Files != null && Request.Files.Count > 0)
                {
                    for (int i = 0; i < Request.Files.Count; i++)
                    {
                        var archivo = Request.Files[i];
                        if (archivo != null && archivo.ContentLength > 0)
                        {
                            string extension = Path.GetExtension(archivo.FileName).ToLower();

                            // Validar extensión, tamaño y tipo MIME (si viene informado)
                            if (!ExtensionesImagen.Contains(extension)) continue;
                            if (archivo.ContentLength > MaxUploadSize) continue;
                            if (!string.IsNullOrEmpty(archivo.ContentType) &&
                                !archivo.ContentType.ToLower().StartsWith("image/")) continue;

                            string nombreArchivo = $"img_{DateTime.Now.Ticks}_{i}_{Path.GetFileName(archivo.FileName)}";
                            string rutaCompleta = Path.Combine(rutaCarpeta, nombreArchivo);
                            archivo.SaveAs(rutaCompleta);

                            string url = $"/ImagenesRutinas/{plantaSanitizada}/Rutina_{idParaRutina}/{nombreArchivo}";
                            imagenesGuardadas.Add(url);
                        }
                    }
                }

                return Json(new
                {
                    Status = "OK",
                    Imagenes = imagenesGuardadas,
                    Mensaje = $"Se guardaron {imagenesGuardadas.Count} imagen(es)"
                });
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    Status = "ERROR",
                    Message = $"Error al guardar imágenes: {ex.Message}"
                });
            }
        }

        [HttpPost]
        public JsonResult EliminarImagen()
        {
            try
            {
                string nombreArchivo = Request.Form["nombreArchivo"];
                string idEquipoStr = Request.Form["idEquipo"];
                string idEquipoPeriodicidadStr = Request.Form["idEquipoPeriodicidad"];
                string planta = Request.Form["planta"];

                if (string.IsNullOrEmpty(nombreArchivo) || string.IsNullOrEmpty(idEquipoStr) || string.IsNullOrEmpty(planta))
                {
                    return Json(new { Status = "ERROR", Message = "Faltan parámetros" });
                }

                int idEquipo = int.Parse(idEquipoStr);
                int? idEquipoPeriodicidad = null;
                if (!string.IsNullOrEmpty(idEquipoPeriodicidadStr))
                {
                    if (int.TryParse(idEquipoPeriodicidadStr, out int tmp)) idEquipoPeriodicidad = tmp;
                }
                string plantaSanitizada = SanitizarNombreDirectorio(planta);
                int idParaRutina = idEquipoPeriodicidad.HasValue && idEquipoPeriodicidad.Value > 0 ? idEquipoPeriodicidad.Value : idEquipo;

                // Solo se permite borrar un archivo dentro de la carpeta de esa rutina
                string nombreSeguro = Path.GetFileName(nombreArchivo ?? string.Empty);
                if (string.IsNullOrWhiteSpace(nombreSeguro))
                {
                    return Json(new { Status = "ERROR", Message = "Nombre de archivo inválido" });
                }

                string baseCarpeta = Path.GetFullPath(Server.MapPath($"~/ImagenesRutinas/{plantaSanitizada}/Rutina_{idParaRutina}"));
                string rutaArchivo = Path.GetFullPath(Path.Combine(baseCarpeta, nombreSeguro));

                if (!rutaArchivo.StartsWith(baseCarpeta + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
                {
                    return Json(new { Status = "ERROR", Message = "Ruta de archivo inválida" });
                }

                if (System.IO.File.Exists(rutaArchivo))
                {
                    System.IO.File.Delete(rutaArchivo);
                    return Json(new { Status = "OK", Message = "Imagen eliminada correctamente" });
                }
                else
                {
                    return Json(new
                    {
                        Status = "ERROR",
                        Message = "Archivo no encontrado"
                    });
                }
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    Status = "ERROR",
                    Message = $"Error al eliminar imagen: {ex.Message}"
                });
            }
        }

        // ============================================================
        // ENDPOINTS PARA GESTIÓN DE PDFs DE RUTINAS
        // ============================================================

        [HttpGet]
        public JsonResult ObtenerRutinaCompleta(int idEquipo, string planta, int? idEquipoPeriodicidad = null)
        {
            try
            {
                string plantaSanitizada = SanitizarNombreDirectorio(planta);

                // Determinar identificador a usar para el archivo de rutina
                int idParaRutina = idEquipoPeriodicidad.HasValue && idEquipoPeriodicidad.Value > 0
                    ? idEquipoPeriodicidad.Value
                    : idEquipo;

                // HTML
                string rutaHtml = Server.MapPath($"~/Views/Rutinas/{plantaSanitizada}/Rutina_{idParaRutina}.cshtml");

                string html = "<div>No existe rutina</div>";
                bool usedDefault = false;

                if (System.IO.File.Exists(rutaHtml))
                {
                    html = System.IO.File.ReadAllText(rutaHtml);

                    int index = html.IndexOf("<div id=\"rutinaChecklist\"");

                    if (index >= 0)
                    {
                        html = html.Substring(index);
                    }
                }
                else
                {
                    // Si no existe rutina para el id especificado, usar la plantilla Default.cshtml
                    string rutaDefault = Server.MapPath("~/Views/Rutinas/Default.cshtml");
                    if (System.IO.File.Exists(rutaDefault))
                    {
                        html = System.IO.File.ReadAllText(rutaDefault);
                        int index2 = html.IndexOf("<div id=\"rutinaChecklist\"");
                        if (index2 >= 0)
                        {
                            html = html.Substring(index2);
                        }

                        usedDefault = true;
                    }
                }

                // IMÁGENES
                string rutaCarpeta = Server.MapPath($"~/ImagenesRutinas/{plantaSanitizada}/Rutina_{idParaRutina}");
                var imagenes = new System.Collections.Generic.List<string>();

                if (Directory.Exists(rutaCarpeta))
                {
                    var archivos = Directory.GetFiles(rutaCarpeta);

                    foreach (var archivo in archivos)
                    {
                        string ext = Path.GetExtension(archivo).ToLower();

                        if (new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" }.Contains(ext))
                        {
                            string nombre = Path.GetFileName(archivo);
                            string url = $"/ImagenesRutinas/{plantaSanitizada}/Rutina_{idParaRutina}/{nombre}";
                            imagenes.Add(url);
                        }
                    }
                }

                var responseObj = new
                {
                    Status = "OK",
                    Html = SanitizarHtmlRutina(html),
                    Imagenes = imagenes,
                    Message = usedDefault ? "No se encontró rutina asignada para este equipo en la periodicidad seleccionada, se mostrará la plantilla por default" : string.Empty,
                    UsedDefault = usedDefault
                };

                return Json(responseObj, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    Status = "ERROR",
                    Message = ex.Message
                }, JsonRequestBehavior.AllowGet);
            }
        }

        //Obtener Periodicidades

        [HttpGet]
        public JsonResult ObtenerPeriodicidadesEquipo(int idEquipo)
        {
            try
            {
                var parametrosConsulta = new Dictionary<string, (object value, ParameterDirection direction, HanaDbType type)>
                {
                    { "P_IDEQUIPO", (idEquipo, ParameterDirection.Input, HanaDbType.Integer) }
                };

                var resultConsulta = Logic.GlobalCommands.ExecuteProcedureHanaAuto(
                    Logic.AD.GCConsultarPeriodicidadesEquipo,
                    parametrosConsulta
                );

                if (EsErrorHana(resultConsulta.JsonResult))
                {
                    return Json(new { Status = "ERROR", Message = "No fue posible consultar las periodicidades: " + resultConsulta.JsonResult }, JsonRequestBehavior.AllowGet);
                }

                List<AccesoDatosEquipos.PeriodicidadEquipoMTTO> periodicidades =
                    new List<AccesoDatosEquipos.PeriodicidadEquipoMTTO>();

                if (!string.IsNullOrEmpty(resultConsulta.JsonResult) && resultConsulta.JsonResult != "[]")
                {
                    try
                    {
                        periodicidades = JsonConvert.DeserializeObject<List<AccesoDatosEquipos.PeriodicidadEquipoMTTO>>(resultConsulta.JsonResult)
                                          ?? new List<AccesoDatosEquipos.PeriodicidadEquipoMTTO>();
                    }
                    catch
                    {
                        periodicidades = new List<AccesoDatosEquipos.PeriodicidadEquipoMTTO>();
                    }
                }

                return Json(new { Status = "OK", Periodicidades = periodicidades }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(new { Status = "ERROR", Message = ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpGet]
        public JsonResult ObtenerPdfRutina(int idEquipo, string planta)
        {
            try
            {
                string plantaSanitizada = SanitizarNombreDirectorio(planta);
                string rutaCarpeta = Server.MapPath($"~/PdfsRutinas/{plantaSanitizada}/{idEquipo}");

                string rutaPdf = Path.Combine(rutaCarpeta, "instructivo.pdf");

                if (System.IO.File.Exists(rutaPdf))
                {
                    string url = $"/PdfsRutinas/{plantaSanitizada}/{idEquipo}/instructivo.pdf?t={DateTime.Now.Ticks}";
                    return Json(new
                    {
                        Status = "OK",
                        Existe = true,
                        Url = url
                    }, JsonRequestBehavior.AllowGet);
                }
                else
                {
                    return Json(new
                    {
                        Status = "OK",
                        Existe = false,
                        Url = ""
                    }, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    Status = "ERROR",
                    Message = $"Error al obtener PDF: {ex.Message}"
                }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpPost]
        public JsonResult GuardarPdfRutina()
        {
            try
            {
                if (Request.Files == null || Request.Files.Count == 0)
                {
                    return Json(new { Status = "ERROR", Message = "No se recibió ningún archivo PDF" });
                }

                var archivo = Request.Files[0];
                if (archivo.ContentLength == 0)
                {
                    return Json(new { Status = "ERROR", Message = "El archivo está vacío" });
                }

                string extension = Path.GetExtension(archivo.FileName).ToLower();
                if (extension != ".pdf")
                {
                    return Json(new { Status = "ERROR", Message = "Solo se permiten archivos PDF" });
                }

                if (archivo.ContentLength > MaxUploadSize)
                {
                    return Json(new { Status = "ERROR", Message = "El PDF no debe superar los 5 MB" });
                }

                string tipoMime = (archivo.ContentType ?? string.Empty).ToLower();
                if (!string.IsNullOrEmpty(tipoMime) && tipoMime != "application/pdf" && tipoMime != "application/octet-stream")
                {
                    return Json(new { Status = "ERROR", Message = "El archivo no es un PDF válido" });
                }

                string idEquipoStr = Request.Form["idEquipo"];
                string planta = Request.Form["planta"];

                if (string.IsNullOrEmpty(idEquipoStr) || string.IsNullOrEmpty(planta))
                {
                    return Json(new { Status = "ERROR", Message = "Faltan parámetros: idEquipo o planta" });
                }

                int idEquipo = int.Parse(idEquipoStr);
                string plantaSanitizada = SanitizarNombreDirectorio(planta);
                string rutaCarpeta = Server.MapPath($"~/PdfsRutinas/{plantaSanitizada}/{idEquipo}");

                if (!Directory.Exists(rutaCarpeta))
                {
                    Directory.CreateDirectory(rutaCarpeta);
                }

                // Eliminar PDF anterior si existe
                string rutaPdfAnterior = Path.Combine(rutaCarpeta, "instructivo.pdf");
                if (System.IO.File.Exists(rutaPdfAnterior))
                {
                    System.IO.File.Delete(rutaPdfAnterior);
                }

                // Guardar nuevo PDF
                string rutaPdf = Path.Combine(rutaCarpeta, "instructivo.pdf");
                archivo.SaveAs(rutaPdf);

                string url = $"/PdfsRutinas/{plantaSanitizada}/{idEquipo}/instructivo.pdf";

                return Json(new
                {
                    Status = "OK",
                    Message = "PDF guardado correctamente",
                    Url = url
                });
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    Status = "ERROR",
                    Message = $"Error al guardar PDF: {ex.Message}"
                });
            }
        }

        [HttpPost]
        public JsonResult EliminarPdfRutina()
        {
            try
            {
                string idEquipoStr = Request.Form["idEquipo"];
                string planta = Request.Form["planta"];

                if (string.IsNullOrEmpty(idEquipoStr) || string.IsNullOrEmpty(planta))
                {
                    return Json(new { Status = "ERROR", Message = "Faltan parámetros" });
                }

                int idEquipo = int.Parse(idEquipoStr);
                string plantaSanitizada = SanitizarNombreDirectorio(planta);
                string rutaCarpeta = Server.MapPath($"~/PdfsRutinas/{plantaSanitizada}/{idEquipo}");
                string rutaPdf = Path.Combine(rutaCarpeta, "instructivo.pdf");

                if (System.IO.File.Exists(rutaPdf))
                {
                    System.IO.File.Delete(rutaPdf);
                }

                return Json(new
                {
                    Status = "OK",
                    Message = "PDF eliminado correctamente"
                });
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    Status = "ERROR",
                    Message = $"Error al eliminar PDF: {ex.Message}"
                });
            }
        }
    }

    // 🔥 MODELO PARA RECIBIR LOS DATOS
    public class RutinaModel
    {
        public int IdEquipo { get; set; }
        public int? IdEquipoPeriodicidad { get; set; }
        public string Planta { get; set; }
        public string ContenidoHTML { get; set; }
    }
}