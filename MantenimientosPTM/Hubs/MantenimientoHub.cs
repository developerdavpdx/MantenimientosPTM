using Microsoft.AspNet.SignalR;

namespace MantenimientosPTM.Hubs
{
    public class MantenimientoHub : Hub
    {
        public void NotificarNuevaRefaccion(string rolQueCambio)
        {
            Clients.Others.actualizarTablaSolicitudRefacciones(rolQueCambio);
        }

        public void NotificarAjustesOrdenTrabajoPreventivo(string rolQueCambio)
        {
            Clients.Others.actualizarTablaMantenimientosPreventivos(rolQueCambio);
        }

        public void NotificarAjustesOrdenTrabajoCorrectivo(string rolQueCambio)
        {
            Clients.Others.actualizarTablaMantenimientosCorrectivos(rolQueCambio);
        }

        // ✅ NUEVO: Notificación de cambios en Solicitudes de Compra
        public void NotificarActualizacionSolicitudCompra(string planta)
        {
            Clients.All.actualizarTablaSolicitudCompra(planta);
        }

        // ✅ NUEVO: Notificación de nuevos mantenimeintos correctivos en la vista paros
        public void NotificarMantenimientosCorrectivos()
        {
            Clients.All.actualizarTablaParos();
        }
    }
}