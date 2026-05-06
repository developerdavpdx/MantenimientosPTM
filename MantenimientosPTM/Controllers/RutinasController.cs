using System;
using System.IO;
using System.Linq;
using System.Web.Mvc;

namespace MantenimientosPTM.Controllers
{
    public class RutinasController : Controller
    {
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

            string ruta = Server.MapPath($"~/Views/Rutinas/{Planta}/Rutina_{idEquipo}.cshtml");

            if (System.IO.File.Exists(ruta))
            {
                string html = System.IO.File.ReadAllText(ruta);
                html = html.Replace("@{\n    Layout = null;\n}\n\n\n\n\n<meta charset=\"utf-8\">\n\n", string.Empty);
                return Content(html, "text/html");
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
                string idEquipoSanitizado = SanitizarNombreArchivo(modelo.IdEquipo.ToString());

                // Construir el nombre del archivo
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
                string contenidoCompleto = $@"@{{
                    Layout = null;
                }}
                {modelo.ContenidoHTML}";

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
            if (string.IsNullOrWhiteSpace(nombre))
            {
                return "Default";
            }

            // Eliminar caracteres no válidos para nombres de directorio
            char[] caracteresNoValidos = Path.GetInvalidPathChars();
            string nombreLimpio = new string(nombre.Where(c => !caracteresNoValidos.Contains(c)).ToArray());

            // Eliminar "../" y "./" para evitar path traversal
            nombreLimpio = nombreLimpio.Replace("../", "").Replace("./", "");

            // Limitar longitud
            if (nombreLimpio.Length > 50)
            {
                nombreLimpio = nombreLimpio.Substring(0, 50);
            }

            return nombreLimpio.Trim();
        }

        private string SanitizarNombreArchivo(string nombre)
        {
            if (string.IsNullOrWhiteSpace(nombre))
            {
                return "Default";
            }

            // Eliminar caracteres no válidos para nombres de archivo
            char[] caracteresNoValidos = Path.GetInvalidFileNameChars();
            string nombreLimpio = new string(nombre.Where(c => !caracteresNoValidos.Contains(c)).ToArray());

            // Eliminar "../" y "./" para evitar path traversal
            nombreLimpio = nombreLimpio.Replace("../", "").Replace("./", "");

            // Limitar longitud
            if (nombreLimpio.Length > 100)
            {
                nombreLimpio = nombreLimpio.Substring(0, 100);
            }

            return nombreLimpio.Trim();
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
                string rutaCarpeta = Server.MapPath($"~/EvidenciaRutinas/{Planta}/{NumeroOrden}");

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
                            string url = $"/EvidenciaRutinas/{Planta}/{NumeroOrden}/{nombreArchivo}";
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
        public JsonResult GuardarImagenes(int idEquipo, string planta)
        {
            try
            {
                string plantaSanitizada = SanitizarNombreDirectorio(planta);
                string rutaCarpeta = Server.MapPath($"~/ImagenesRutinas/{plantaSanitizada}/Rutina_{idEquipo}");

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
                            if (new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" }.Contains(extension))
                            {
                                string nombreArchivo = $"img_{DateTime.Now.Ticks}_{i}_{Path.GetFileName(archivo.FileName)}";
                                string rutaCompleta = Path.Combine(rutaCarpeta, nombreArchivo);
                                archivo.SaveAs(rutaCompleta);

                                string url = $"/ImagenesRutinas/{plantaSanitizada}/Rutina_{idEquipo}/{nombreArchivo}";
                                imagenesGuardadas.Add(url);
                            }
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
                string planta = Request.Form["planta"];

                if (string.IsNullOrEmpty(nombreArchivo) || string.IsNullOrEmpty(idEquipoStr) || string.IsNullOrEmpty(planta))
                {
                    return Json(new { Status = "ERROR", Message = "Faltan parámetros" });
                }

                int idEquipo = int.Parse(idEquipoStr);
                string plantaSanitizada = SanitizarNombreDirectorio(planta);
                string rutaArchivo = Server.MapPath($"~/ImagenesRutinas/{plantaSanitizada}/Rutina_{idEquipo}/{nombreArchivo}");

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
        public JsonResult ObtenerRutinaCompleta(int idEquipo, string planta)
        {
            try
            {
                string plantaSanitizada = SanitizarNombreDirectorio(planta);

                // 🔹 HTML
                string rutaHtml = Server.MapPath($"~/Views/Rutinas/{plantaSanitizada}/Rutina_{idEquipo}.cshtml");

                string html = "<div>No existe rutina</div>";

                if (System.IO.File.Exists(rutaHtml))
                {
                    html = System.IO.File.ReadAllText(rutaHtml);

                    int index = html.IndexOf("<div id=\"rutinaChecklist\"");

                    if (index >= 0)
                    {
                        html = html.Substring(index);
                    }
                }

                // 🔹 IMÁGENES
                string rutaCarpeta = Server.MapPath($"~/ImagenesRutinas/{plantaSanitizada}/Rutina_{idEquipo}");
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
                            string url = $"/ImagenesRutinas/{plantaSanitizada}/Rutina_{idEquipo}/{nombre}";
                            imagenes.Add(url);
                        }
                    }
                }

                return Json(new
                {
                    Status = "OK",
                    Html = html,
                    Imagenes = imagenes
                }, JsonRequestBehavior.AllowGet);
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
        public string Planta { get; set; }
        public string ContenidoHTML { get; set; }
    }
}