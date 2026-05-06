using Microsoft.AspNet.SignalR;

namespace MantenimientosPTM.Hubs
{
    public class MantenimientoHub : Hub
    {
        public void NotificarNuevaRefaccion()
        {
            Clients.All.actualizarTablaSolicitudRefacciones();
        }

        public void NotificarAjustesOrdenTrabajoPreventivo()
        {
            Clients.All.actualizarTablaMantenimientosPreventivos();
        }

        public void NotificarAjustesOrdenTrabajoCorrectivo()
        {
            Clients.All.actualizarTablaMantenimientosCorrectivos();
        }
    }
}