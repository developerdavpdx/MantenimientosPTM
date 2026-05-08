using Microsoft.AspNet.SignalR;

namespace MantenimientosPTM.Hubs
{
    public class MantenimientoHub : Hub
    {
        public void NotificarNuevaRefaccion()
        {
            Clients.All.actualizarTablaSolicitudRefacciones();
        }

        public void NotificarAjustesOrdenTrabajoPreventivo(string rolQueCambio)
        {
            Clients.Others.actualizarTablaMantenimientosPreventivos(rolQueCambio);
        }

        public void NotificarAjustesOrdenTrabajoCorrectivo(string rolQueCambio)
        {
            Clients.Others.actualizarTablaMantenimientosCorrectivos();
        }
    }
}