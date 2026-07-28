// ========================================
// APLICACIÓN PRINCIPAL - MÉTRICAS
// ========================================
class MetricasApp {
    constructor() {
        this.URLBase = "Metricas";
        this.datos_usuario = GlobalUtil.getDatosUsuario();
        this.metricasManager = new MetricasManager(this.URLBase, this.datos_usuario);
        this.filtrosManager = new FiltrosManager(this.URLBase, this.datos_usuario);
        window.AppMetricas = this;
    }

    inicializar() {
        UIManager.inicializarUI(this.datos_usuario);
        this.filtrosManager.inicializar();
        this.metricasManager.inicializar();
        this.configurarEventosFiltros();
        this.configurarActualizacionAutomatica();
        console.log('✅ Sistema de Métricas inicializado correctamente');
    }

    configurarEventosFiltros() {

        $('#btnAplicarFiltros').on('click', () => {
            this.metricasManager.cargarMetricasPorProceso();
        });

        $("#FiltroProceso")
            .off('change')
            .on('change', (e) => {

                let Area = $(e.currentTarget).val();

                EquiposUtil.llenarLineas(
                    this.datos_usuario[0].PLANTA,
                    Area,
                    null,
                    "FiltroLinea",
                    null
                );
            });
    }

    configurarActualizacionAutomatica() {
        setInterval(() => {
            this.metricasManager.cargarMetricasPorProceso();
            console.log('🔄 Métricas actualizadas automáticamente');
        }, 300000);
    }
}

// ========================================
// GESTOR DE UI
// ========================================
class UIManager {

    static inicializarUI(datos_usuario) {
        $("#MetricasURL").addClass("selected");
        $("#MetricasURL a").addClass("whiteText");
        this.actualizarFechaHora();
        setInterval(() => this.actualizarFechaHora(), 60000);
        console.log('✅ UI inicializada');
    }

    static actualizarFechaHora() {
        const ahora = new Date();
        $('#fechaActual').text(ahora.toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' }));
        $('#horaActual').text(ahora.toLocaleTimeString('es-MX'));
    }

    static mostrarSkeletons() {
        const skeleton = '<div class="skeleton-card"></div>';
        $("#metric-disponibilidad, #metric-rendimiento, #metric-calidad, #metric-oee")
            .empty()
            .append(skeleton);
    }

    static mostrarError(idMetrica) {
        $(`#metric-${idMetrica}`).html('<i class="bi bi-exclamation-triangle text-warning"></i>');
    }

    static actualizarMetrica(idMetrica, valor, unidad = '') {
        $(`#metric-${idMetrica}`).text(valor + (unidad ? ' ' + unidad : ''));
        $(`#${idMetrica}-update`).text(DateUtils.obtenerHoraActualCorta());
    }

    // 🔥 Muestra mensaje cuando no hay proceso seleccionado
    static mostrarSinProceso() {
        $("#metric-disponibilidad, #metric-rendimiento, #metric-calidad, #metric-oee")
            .html('<span class="text-muted small">Selecciona un proceso</span>');
    }

    // 🔥 Muestra mensaje cuando no hay datos
    static mostrarSinDatos() {
        $("#metric-disponibilidad, #metric-rendimiento, #metric-calidad, #metric-oee")
            .html('<span class="text-muted small">Sin datos</span>');
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
        console.log('✅ FiltrosManager inicializado');
    }

    obtenerFiltros() {
        return {
            fechaInicio: $('#FiltroFechaInicio').val() || null,
            fechaFin: $('#FiltroFechaFin').val() || null,
            linea: $('#FiltroLinea').val() != '' ? $('#FiltroLinea option:selected').text() : null,
            proceso: $('#FiltroProceso').val() || null,
            planta: this.datos_usuario[0].PLANTA || null
        };
    }
}

// ========================================
// GESTOR DE MÉTRICAS
// ========================================
class MetricasManager {

    constructor(URLBase, datos_usuario) {
        this.URLBase = URLBase;
        this.datos_usuario = datos_usuario;
        this.oeeDonutChart = null;
        this.tiempoMuertoDonutChart = null; // 🔥 nuevo
        this.tiempoEsperaDonutChart = null; // 🔥 nuevo


        // 🔥 Mapa ID → clave de proceso
        this.mapaProcesos = {
            '1': 'PVC',
            '7': 'PEAD_CORR',
            '9': 'PEAD_LISO'
        };

        // 🔥 Mapa proceso → endpoint
        this.endpointsPorProceso = {
            'PVC': 'GetMetricasOEE_PVC',
            'PEAD_LISO': 'GetMetricasOEE_PeadLiso',
            'PEAD_CORR': 'GetMetricasOEE_Corrugado'
        };
    }


    inicializar() {
        this.inicializarGraficaOEE();
        this.inicializarGraficaTiempoMuerto();
        this.inicializarGraficaTiempoEspera();
        // 🔥 Carga inicial — si no hay proceso seleccionado muestra aviso
        this.cargarMetricasPorProceso();
        $("#FiltroPlanta").val(this.datos_usuario[0].PLANTA);
        console.log('✅ MetricasManager inicializado');
    }

    // ========================================
    // 🔥 NUEVO: decide qué endpoint llamar según proceso
    // ========================================
    cargarMetricasPorProceso() {

        const filtros = window.AppMetricas.filtrosManager.obtenerFiltros();
        const proceso = filtros.proceso;

        // Sin proceso seleccionado
        if (!proceso) {
            // UIManager.mostrarSinProceso();
            return;
        }

        // 🔥 Si viene como ID numérico, lo convierte a clave
        const clavesProceso = this.mapaProcesos[String(proceso)] ?? proceso;

        const endpoint = this.endpointsPorProceso[clavesProceso];

        if (!endpoint) {
            console.warn(`Proceso no reconocido: ${proceso} → ${clavesProceso}`);
            UIManager.mostrarSinProceso();
            return;
        }

        UIManager.mostrarSkeletons();
        this.cargarMetricasOEE(endpoint, filtros);
    }


    // ========================================
    // GRÁFICA DONUT OEE
    // ========================================
    inicializarGraficaOEE() {
        const ctx = document.getElementById('oeeDonutChart');
        if (!ctx) return;

        this.oeeDonutChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Disponibilidad', 'Rendimiento', 'Calidad'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: ['#2a78d6', '#1baf7a', '#eda100'],
                    borderWidth: 3,
                    borderColor: 'transparent'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '68%',
                plugins: { legend: { display: false } },
                animation: { duration: 600 }
            }
        });
    }

    // ========================================
    // GRÁFICA DONUT TIEMPO MUERTO
    // ========================================
    inicializarGraficaTiempoMuerto() {
        const ctx = document.getElementById('tiempoMuertoDonutChart');
        if (!ctx) return;

        this.tiempoMuertoDonutChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Tiempo No Disponible', 'Tiempo No Productivo'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: ['#2a78d6', '#c0d8f5'],
                    borderWidth: 3,
                    borderColor: 'transparent'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '68%',
                plugins: { legend: { display: false } },
                animation: { duration: 600 }
            }
        });
    }

    // ========================================
    // GRÁFICA TIEMPO ESPERA
    // ========================================
    inicializarGraficaTiempoEspera() {
        const ctx = document.getElementById('tiempoEsperaDonutChart');
        if (!ctx) return;

        this.tiempoEsperaDonutChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Tiempo Espera Total', 'Promedio por OT'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: ['#eda100', '#f5d78c'],
                    borderWidth: 3,
                    borderColor: 'transparent'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '68%',
                plugins: { legend: { display: false } },
                animation: { duration: 600 }
            }
        });
    }

    actualizarGraficaOEE(disponibilidad, rendimiento, calidad) {
        if (!this.oeeDonutChart) return;

        this.oeeDonutChart.data.datasets[0].data = [disponibilidad, rendimiento, calidad];
        this.oeeDonutChart.update();

        document.getElementById('lbl-disp-oee').textContent = disponibilidad.toFixed(1) + '%';
        document.getElementById('lbl-rend-oee').textContent = rendimiento.toFixed(1) + '%';
        document.getElementById('lbl-cal-oee').textContent = calidad.toFixed(1) + '%';
    }

    actualizarGraficaTiempoMuerto(tiempoNoDisponible, tiempoNoProductivo) {
        if (!this.tiempoMuertoDonutChart) return;

        this.tiempoMuertoDonutChart.data.datasets[0].data = [tiempoNoDisponible, tiempoNoProductivo];
        this.tiempoMuertoDonutChart.update();

        $('#lbl-tiempo-no-disponible').text(tiempoNoDisponible.toFixed(1) + ' hr');
        $('#lbl-tiempo-no-productivo').text(tiempoNoProductivo.toFixed(1) + ' hr');
    }

    actualizarGraficaTiempoEspera(totalHrs, promedioHrs) {
        if (!this.tiempoEsperaDonutChart) return;

        this.tiempoEsperaDonutChart.data.datasets[0].data = [totalHrs, promedioHrs];
        this.tiempoEsperaDonutChart.update();
    }

    // ========================================
    // 🔥 LLAMADA AL ENDPOINT SEGÚN PROCESO
    // ========================================
    cargarMetricasOEE(endpoint, filtros) {

        $.ajax({
            url: `/${this.URLBase}/${endpoint}`,
            type: 'GET',
            data: {
                FiltroFechaInicio: filtros.fechaInicio,
                FiltroFechaFin: filtros.fechaFin,
                FiltroLinea: filtros.linea,
                FiltroPlanta: filtros.planta
            },
            dataType: 'json',

            success: (response) => {

                if (response.Status !== 'OK') {
                    AlertManager.mostrar(response.Message, 'warning');
                    UIManager.mostrarSinDatos();
                    return;
                }

                let data = response.Data;

                try {
                    if (typeof data === 'string') data = JSON.parse(data);
                } catch (e) {
                    console.error('Error parseando métricas:', e);
                    AlertManager.mostrar('Error al procesar datos', 'warning');
                    return;
                }

                if (!data || data.length === 0) {
                    UIManager.mostrarSinDatos();
                    return;
                }

                const m = data[0];

                // Valores OEE
                const dispVal = parseFloat(m.DISPONIBILIDAD) || 0;
                const rendVal = parseFloat(m.RENDIMIENTO) || 0;
                const calVal = parseFloat(m.CALIDAD) || 0;
                const oeeVal = parseFloat(m.OEE) || 0;

                // 🔥 Valores de Tiempo Muerto (vienen en horas desde el SP)
                const tiempoNoDisponibleVal = parseFloat(m.TOTAL_DISPONIBLE) || 0;
                const tiempoNoProductivoVal = parseFloat(m.TOTAL_PRODUCTIVO) || 0;
                const tiempoMuertoVal = parseFloat(m.TIEMPO_MUERTO) || 0;
                const horasProgramadas = parseFloat(m.TOTAL_HORAS) || 0;

                // Pintar KPIs OEE
                UIManager.actualizarMetrica('rendimiento', rendVal.toFixed(1), '%');
                UIManager.actualizarMetrica('calidad', calVal.toFixed(1), '%');
                UIManager.actualizarMetrica('oee', oeeVal.toFixed(1), '%');

                // 🔥 Tiempo Muerto: valor central como % sobre horas programadas
                const tiempoMuertoPct = horasProgramadas > 0
                    ? (tiempoMuertoVal / horasProgramadas) * 100
                    : 0;
                UIManager.actualizarMetrica('tiempomuerto', tiempoMuertoPct.toFixed(1), '%');

                // 🔥 Valores de Tiempo de Espera / MTTA
                const tiempoEsperaTotalVal = parseFloat(m.TIEMPO_ESPERA_TOTAL_HRS) || 0;
                const tiempoEsperaOtsVal = parseInt(m.TOTAL_OTS_CON_ESPERA) || 0;
                const mttaVal = parseFloat(m.PROMEDIO_TIEMPO_ESPERA_HRS) || 0;

                // 🔥 KPI central ahora es el MTTA
                UIManager.actualizarMetrica('mtta', mttaVal.toFixed(1), 'hrs');
                $('#lbl-tiempo-espera-total').text(tiempoEsperaTotalVal.toFixed(1) + ' hr');
                $('#lbl-tiempo-espera-total-ots').text(tiempoEsperaOtsVal);

                
                // Actualizar gráficas
                this.actualizarGraficaOEE(dispVal, rendVal, calVal);
                this.actualizarGraficaTiempoMuerto(tiempoNoDisponibleVal, tiempoNoProductivoVal);
                this.actualizarGraficaTiempoEspera(tiempoEsperaTotalVal, mttaVal);


                $('#labelProcesoActivo').text(filtros.proceso);

            },

            error: (err) => {
                console.error(err);
                AlertManager.mostrar('Error al obtener métricas', 'warning');
                UIManager.mostrarSinDatos();
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
