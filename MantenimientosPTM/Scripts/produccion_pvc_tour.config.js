/* =========================================================
   CONFIGURACIÓN DEL TOUR - Vista: Producción PVC
   (registro de tiempos muertos)

   Este archivo SOLO define los pasos de esta vista.
   La lógica genérica vive en onboarding-tour.js
   ========================================================= */

$(document).ready(function () {

    OnboardingTour.init({
        storageKey: 'tourPVC_completado',
        steps: [
            {
                selector: '#colapse-title',
                title: '¡Bienvenido a Tiempos Muertos PVC! 👋',
                text: 'Aquí puedes registrar y consultar las causas de tiempos muertos de la línea. Te mostramos rápido cómo funciona.',
                position: 'bottom'
            },
            {
                selector: '#btnColapsoFiltros',
                title: 'Panel de filtros',
                text: 'Da clic aquí para mostrar u ocultar el panel de filtros de búsqueda.',
                position: 'left'
            },
            {
                selector: '#FiltroFechaInicio',
                title: 'Rango de fechas (Datos Salvados)',
                text: 'Elige la fecha de inicio y fin para acotar los registros que quieres consultar, esto consultará los registros ya guardados en el sistema una vez que tu completaste las filas correspondientes y diste clic en "Guardar", tambien consultará los registros pendientes de mantenimientos correctivos y mantenimientos preventivos completados para sincronizar en la tabla (los registros que aún no estan salvados en el sistema aparecerán con un punto azul parpadeante)',
                position: 'bottom',
                requiresPanel: '#colapseFiltros'
            },
            {
                selector: '#FiltroTurno',
                title: 'Filtra por turno (Datos Salvados)',
                text: 'Selecciona el turno de producción que te interesa revisar.',
                position: 'bottom',
                requiresPanel: '#colapseFiltros'
            },
            {
                selector: '#FiltroLinea',
                title: 'Filtra por línea (Datos Salvados)',
                text: 'Selecciona la línea de producción que te interesa revisar.',
                position: 'bottom',
                requiresPanel: '#colapseFiltros'
            },
            {
                selector: '#FiltroProducto',
                title: 'Filtra por producto (Datos Salvados)',
                text: 'Escribe el nombre de un producto que te interesa revisar.',
                position: 'bottom',
                requiresPanel: '#colapseFiltros'
            },
            {
                selector: '#btnAplicarFiltros',
                title: 'Buscar registros (Datos Salvados)',
                text: 'Una vez configurados tus filtros, presiona "Buscar" para cargar la información en la tabla, esto consultará los registros ya guardados en el sistema una vez que tu completaste las filas correspondientes y diste clic en "Guardar".',
                position: 'top',
                requiresPanel: '#colapseFiltros'
            },
            {
                selector: '#FiltroFechaInicioPT',
                title: 'Rango de fechas (Producto Terminado Pendiente)',
                text: 'Elige la fecha de inicio y fin para acotar los registros que quieres consultar, esto consultará los registros de producto terminado pendiente de NEWSCALE para sincronizar en la tabla (los registros que aún no estan salvados en el sistema aparecerán con un punto azul parpadeante)',
                position: 'bottom',
                requiresPanel: '#colapseFiltros'
            },
            {
                selector: '#FiltroTurnoPT',
                title: 'Filtra por turno (Producto Terminado Pendiente)',
                text: 'Elige el turno que te interesa revisar en las fechas seleccionadas.',
                position: 'bottom',
                requiresPanel: '#colapseFiltros'
            },
            {
                selector: '#btnAplicarFiltrosPT',
                title: 'Buscar registros (Producto Terminado Pendiente)',
                text: 'Una vez configurados tus filtros, presiona "Buscar" para cargar la información en la tabla, esto consultará los registros de producto terminado pendiente de NEWSCALE para sincronizar en la tabla',
                position: 'top',
                requiresPanel: '#colapseFiltros'
            },
            {
                selector: '#tablaProduccion',
                title: 'Tabla de registros',
                text: 'Aquí verás los datos. Puedes editar celdas directamente y usar clic derecho para agregar, copiar o eliminar filas (solo si es una fila temporal que acabas de agregar mediante el menú contextual).',
                position: 'top'
            },
            {
                selector: '#btnGuardarCambios',
                title: 'Guardar cambios',
                text: 'No olvides guardar tus cambios con este botón antes de salir.',
                position: 'left'
            },
            {
                selector: '#btnExportarExcel',
                title: 'Descargar en Excel',
                text: 'Exporta la información que ves en la tabla a un archivo de Excel.',
                position: 'left'
            },
            {
                selector: '#btnEnviarCorreo',
                title: 'Enviar por correo',
                text: 'También puedes enviar el reporte en Excel directamente por correo a quien tú quieras. ¡Eso es todo, ya estás listo! 🎉',
                position: 'left'
            }
        ]
    });

});
