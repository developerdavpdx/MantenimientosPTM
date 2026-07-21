using System;
using System.Web.Mvc;
using System.Configuration;

namespace MantenimientosPTM.Controllers
{
    public class LoginController : Controller
    {
        readonly LogicaEquipos Logic = new LogicaEquipos();

        public ActionResult Login()
        {
            return View();
        }
        public ActionResult Ended()
        {
            return View();
        }

        [HttpGet]
        public JsonResult ObtenerFechaVencimiento()
        {
            try
            {
                string fechaVencimientoConfig = ConfigurationManager.AppSettings["FechaVencimiento"];

                if (string.IsNullOrEmpty(fechaVencimientoConfig))
                {
                    return Json(new { Status = "ERROR", Message = "Configuración de fecha no disponible", FechaVencimiento = "", Vencido = false }, JsonRequestBehavior.AllowGet);
                }

                if (!DateTime.TryParse(fechaVencimientoConfig, out DateTime fechaVencimiento))
                {
                    return Json(new { Status = "ERROR", Message = "Formato de fecha inválido", FechaVencimiento = "", Vencido = false }, JsonRequestBehavior.AllowGet);
                }

                DateTime hoy = DateTime.Now;
                bool vencido = hoy > fechaVencimiento;

                return Json(new
                {
                    Status = "OK",
                    FechaVencimiento = fechaVencimiento.ToString("dd/MM/yyyy"),
                    Vencido = vencido,
                    Message = vencido ? "El acceso al sistema ha vencido" : "Sistema vigente"
                }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(new { Status = "ERROR", Message = "Error al obtener fecha de vencimiento: " + ex.Message, FechaVencimiento = "", Vencido = false }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpGet]
        public JsonResult ValidaUsuario()
        {
            GlobalCommands.JsonResponseMtto jsonResponse;
            AccesoDatosEquipos.Credenciales RequestData;

            try
            {
                string Usuario = Request.Headers["Usuario"];
                string Password = Request.Headers["Password"];
                RequestData = new AccesoDatosEquipos.Credenciales() { Email = Usuario, Pass = Password };

                // Convertir modelo a parámetros HANA
                var parameters = Logic.GlobalCommands.ConvertToHanaParameters(RequestData, false, null);
                var resultHana = Logic.GlobalCommands.ExecuteProcedureHanaAuto(Logic.AD.GCLogin, parameters);
                if (resultHana.JsonResult == "[]")
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {

                        Status = "NO",
                        Message = "No fue posible iniciar sesión, valida tus credenciales.",
                        Data = string.Empty
                    };
                }
                else if (resultHana.JsonResult.Contains("Error"))
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {
                        Status = "ERROR",
                        Message = "No fue posible iniciar sesión: " + resultHana.JsonResult,
                        Data = string.Empty
                    };
                }
                else
                {
                    jsonResponse = new GlobalCommands.JsonResponseMtto()
                    {

                        Status = "OK",
                        Message = "Credenciales validadas correctamente",
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
                    Message = "No fue posible iniciar sesión: " + ex.ToString(),
                    Data = string.Empty
                };

                return Json(jsonResponse);
            }
        }
    }
}