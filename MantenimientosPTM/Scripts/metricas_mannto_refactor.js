// ========================================
// APLICACIÓN PRINCIPAL - MÉTRICAS
// ========================================
class MetricasApp {
    constructor() {
        this.URLBase = "Metricas"; // Ajusta según tu controlador

        this.datos_usuario = GlobalUtil.getDatosUsuario();
        this.metricasManager = new MetricasManager(this.URLBase);
        this.filtrosManager = new FiltrosManager(this.URLBase, this.datos_usuario);

        window.AppMetricas = this;
    }

    inicializar() {
        UIManager.inicializarUI(this.datos_usuario);
        this.metricasManager.inicializar();
        this.filtrosManager.inicializar();
        this.configurarEventosFiltros();
        this.configurarActualizacionAutomatica();
        console.log('✅ Sistema de Métricas de Mantenimiento inicializado correctamente');
    }

    configurarEventosFiltros() {
        // Botón aplicar filtros
        $('#btnAplicarFiltros').on('click', () => {
            const filtros = this.filtrosManager.obtenerFiltros();
            this.metricasManager.cargarTodasLasMetricas(filtros);
        });

        // Filtrar automáticamente al cambiar los selects
        $('#FiltroLinea, #FiltroProceso').on('change', () => {
            const filtros = this.filtrosManager.obtenerFiltros();
            this.metricasManager.cargarTodasLasMetricas(filtros);
        });
    }

    configurarActualizacionAutomatica() {
        // Actualizar métricas cada 5 minutos (opcional)
        setInterval(() => {
            const filtros = this.filtrosManager.obtenerFiltros();
            this.metricasManager.cargarTodasLasMetricas(filtros);
            console.log('🔄 Métricas actualizadas automáticamente');
        }, 300000); // 300000 ms = 5 minutos
    }
}

// ========================================
// GESTOR DE UI
// ========================================
class UIManager {
    static inicializarUI(datos_usuario) {
        // Configuración inicial de navegación
        // Configuración inicial de navegación
        $("#MetricasURL").addClass("selected");
        $("#MetricasURL a").addClass("whiteText");

        // Actualizar fecha y hora
        this.actualizarFechaHora();

        // Actualizar cada minuto
        setInterval(() => {
            this.actualizarFechaHora();
        }, 60000);

        console.log('✅ UI inicializada correctamente');
    }

    static actualizarFechaHora() {
        const ahora = new Date();
        const opciones = { year: 'numeric', month: '2-digit', day: '2-digit' };
        $('#fechaActual').text(ahora.toLocaleDateString('es-MX', opciones));
        $('#horaActual').text(ahora.toLocaleTimeString('es-MX'));
    }

    static mostrarCargando(idMetrica) {
        $(`#metric-${idMetrica}`).html(`
            <div class="spinner-border spinner-border-sm" role="status">
                <span class="visually-hidden">Cargando...</span>
            </div>
        `);
    }

    static actualizarMetrica(idMetrica, valor, unidad = '') {
        $(`#metric-${idMetrica}`).text(valor + (unidad ? ' ' + unidad : ''));
        $(`#${idMetrica}-update`).text(DateUtils.obtenerHoraActualCorta());
    }

    static mostrarError(idMetrica) {
        $(`#metric-${idMetrica}`).html('<i class="bi bi-exclamation-triangle text-warning"></i>');
    }
}

// ========================================
// GESTOR DE FILTROS
// ========================================
class FiltrosManager {
    constructor(URLBase, datos_usuario) {
        this.URLBase = URLBase;
        this.datos_usuario = datos_usuario;
    }

    inicializar() {
        EquiposUtil.llenarLineas(this.datos_usuario[0].PLANTA, "none", "FiltroLinea");
        EquiposUtil.llenarProcesos(this.datos_usuario[0].PLANTA, "none", "FiltroProceso");
        EquiposUtil.llenarEquipos(this.datos_usuario[0].PLANTA, null, "none", "FiltroEquipo");
        console.log('✅ FiltrosManager inicializado correctamente');
    }

    obtenerFiltros() {
        return {
            linea: $('#FiltroLinea').val() || '',
            proceso: $('#FiltroProceso').val() || ''
        };
    }
}

// ========================================
// GESTOR DE MÉTRICAS
// ========================================
class MetricasManager {
    constructor(URLBase) {
        this.URLBase = URLBase;
    }

    inicializar() {
        // Cargar métricas iniciales
        this.cargarTodasLasMetricas();
        console.log('✅ MetricasManager inicializado correctamente');
    }

    cargarTodasLasMetricas() {

        UIManager.mostrarCargando('mtbf');
        UIManager.mostrarCargando('mttr');
        UIManager.mostrarCargando('disponibilidad');
        UIManager.mostrarCargando('oee');
        UIManager.mostrarCargando('mantenimientos');

        // 🔥 SOLO UNA LLAMADA
        this.cargarMetricasOEE();
    }

    // ============================
    // EXPORTAR REPORTE (Opcional)
    // ============================
    exportarReporte() {
        const filtros = window.AppMetricas.filtrosManager.obtenerFiltros();

        $.ajax({
            url: `/${this.URLBase}/ExportarReporteMetricas`,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                filtros: filtros,
                metricas: this.metricas
            }),
            success: (response) => {
                if (response.Status === 'SI') {
                    AlertManager.mostrar('Reporte exportado exitosamente', 'success', 'alertContainer');
                    // Descargar archivo si es necesario
                    if (response.FileUrl) {
                        window.open(response.FileUrl, '_blank');
                    }
                } else {
                    AlertManager.mostrar('Error al exportar el reporte', 'warning', 'alertContainer');
                }
            },
            error: (xhr, status, error) => {
                console.error('Error al exportar reporte:', error);
                AlertManager.mostrar('Error al conectar con el servidor', 'warning', 'alertContainer');
            }
        });
    }

    cargarMetricasOEE() {

        $("#metric-mtbf,#metric-mttr,#metric-fpy,#metric-disponibilidad,#metric-oee")
            .empty()
            .append(Array(1).fill('<div class="skeleton-card"></div>').join(''));

        $.ajax({
            url: `/${this.URLBase}/GetMetricasOEE`,
            type: 'GET',
            data: {
                FiltroFechaInicio: $('#FiltroFechaInicio').val() || null,
                FiltroFechaFin: $('#FiltroFechaFin').val() || null,
                FiltroLinea: $('#FiltroLinea').val() || null,
                FiltroProceso: $('#FiltroProceso').val() || null,
                FiltroEquipo: $('#FiltroEquipo').val() || null,
                FiltroPlanta: $('#FiltroPlanta').val() || null
            },
            dataType: 'json',
            success: (response) => {

                if (response.Status === 'OK') {

                    let data = response.Data;

                    // 🔥 PARSEAR (CLAVE)
                    try {
                        if (typeof data === 'string') {
                            data = JSON.parse(data);
                        }
                    } catch (e) {
                        console.error('Error parseando métricas:', e);
                        AlertManager.mostrar('Error al procesar datos', 'warning');
                        return;
                    }

                    if (!data || data.length === 0) return;

                    const m = data[0];

                    $("#metric-mtbf,#metric-mttr,#metric-fpy,#metric-disponibilidad,#metric-oee").html('');
                    //// 🔥 PINTAR KPIs
                    UIManager.actualizarMetrica('mtbf', m.MTBF, 'hrs');
                    UIManager.actualizarMetrica('mttr', m.MTTR, 'hrs');
                    UIManager.actualizarMetrica('disponibilidad', m.DISPONIBILIDAD, '%');

                    //// Puedes calcular OEE después
                    UIManager.actualizarMetrica('oee', m.DISPONIBILIDAD + '%');

                    UIManager.actualizarMetrica('mantenimientos', m.TOTAL_FALLAS);

                } else {
                    AlertManager.mostrar(response.Message, 'warning');
                }
            },
            error: (err) => {
                console.error(err);
                AlertManager.mostrar('Error al obtener métricas', 'warning');
            }
        });
    }
}


// ========================================
// INICIALIZACIÓN
// ========================================
$(document).ready(function () {
    const app = new MetricasApp();
    app.inicializar();
});