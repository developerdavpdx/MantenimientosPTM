using Microsoft.AspNet.SignalR;
using Microsoft.Owin;
using Owin;

[assembly: OwinStartup(typeof(MantenimientosPTM.App_Start.Startup))]  // ⚠️ Cambia TuNamespace

namespace MantenimientosPTM.App_Start  // ⚠️ Cambia TuNamespace
{
    public class Startup
    {
        public void Configuration(IAppBuilder app)
        {
            app.MapSignalR("/signalr", new HubConfiguration()
            {
                EnableDetailedErrors = true // 👈 esto
            });
        }
    }
}