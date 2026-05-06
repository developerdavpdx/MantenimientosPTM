using System;
using System.Web.Mvc;

namespace MantenimientosPTM.Controllers
{
    public class LoginController : Controller
    {
        readonly LogicaEquipos Logic = new LogicaEquipos();

        public ActionResult Login()
        {
            return View();
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