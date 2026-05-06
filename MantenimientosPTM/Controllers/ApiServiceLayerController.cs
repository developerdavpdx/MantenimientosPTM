using System.Threading.Tasks;
using System.Web.Mvc;

namespace MantenimientosPTM.Controllers
{

    public class ApiServiceLayerController : Controller
    {
        readonly LoginServiceLayer SL = new LoginServiceLayer();

        [HttpPost]
        public async Task<string> TestLogin()
        {

            var login = await SL.LoginAsyncHttpClient();

            if (login.IsError)
            {
                return "ERROR";
            }
            else
            {
                return "OK";
            }

        }
    }
}