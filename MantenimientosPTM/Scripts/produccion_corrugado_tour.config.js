/* =========================================================
   CONFIGURACIÓN DEL TOUR - Vista: Producción PVC
   (registro de tiempos muertos)

   Este archivo SOLO define los pasos de esta vista.
   La lógica genérica vive en onboarding-tour.js
   ========================================================= */

$(document).ready(function () {

    OnboardingTour.init({
        storageKey: 'tourCorrugado_completado',
        steps: [
            {
                selector: '#colapse-title',
                title: '¡Bienvenido a Tiempos Muertos Corrugado! 👋',
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
                text: 'Elige la fecha de inicio y fin para acotar los registros. Se consultarán los registros ya guardados, además de los correctivos, preventivos y paros del periodo. Los registros que aún no están salvados se identifican con 📦 (producto terminado), 🔧 (correctivo) o 🛠️ (preventivo).',
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
                selector: '#chkIncluirNWSCALE',
                title: 'Incluir productos pendientes de NWSCALE',
                text: 'Déjalo marcado (viene así por defecto) si quieres que la búsqueda también traiga los registros de producto terminado pendientes de NEWSCALE para el mismo rango de fechas y turno. Los que ya existan se actualizan y no se duplican.',
                position: 'bottom',
                requiresPanel: '#colapseFiltros'
            },
            {
                selector: '#btnAplicarFiltros',
                title: 'Buscar registros',
                text: 'Con el rango, turno, línea y producto listos, presiona "Buscar". Se cargarán los registros guardados más los correctivos, preventivos y paros del periodo; si el checkbox de NWSCALE está marcado, también los productos terminados pendientes.',
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

