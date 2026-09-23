using System.Web.Mvc;
using System.Web.Optimization;
using System.Web.Routing;

namespace MantenimientosPTM
{
    public class MvcApplication : System.Web.HttpApplication
    {
        protected void Application_Start()
        {
            // 🆕 Global.asax.cs — Application_Start
            System.Net.ServicePointManager.SecurityProtocol =
                System.Net.SecurityProtocolType.Tls12 |
                System.Net.SecurityProtocolType.Tls13;
            AreaRegistration.RegisterAllAreas();
            FilterConfig.RegisterGlobalFilters(GlobalFilters.Filters);
            RouteConfig.RegisterRoutes(RouteTable.Routes);
            BundleConfig.RegisterBundles(BundleTable.Bundles);
            log4net.Config.XmlConfigurator.Configure(); // ⬅️ inicializa log4net
            // AutoMapper no inicializado en esta rama
        }
    }
}
