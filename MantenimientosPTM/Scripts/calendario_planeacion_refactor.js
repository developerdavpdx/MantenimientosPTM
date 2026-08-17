// ========================================
// GESTION DE EVENTOS
// ========================================
class GestionEventosApp {
    constructor() {
        this.URLBasePlaneacion = "Planeacion";
        this.URLBaseProduccion = "Produccion";
        this.URLBaseMantenimientos = "MantenimientosPreventivos";
        this.calendarManager = new CalendarManager(this.URLBasePlaneacion, this.URLBaseProduccion, this.URLBaseMantenimientos);
        this.datos_usuario = GlobalUtil.getDatosUsuario();
    }

    inicializar() {
        // Inicializar UI
        UIManager.inicializarUI();

        // Inicializar el calendario
        this.calendarManager.inicializar();

        this.InicializarEventosCalendario();

        console.log('✅ Sistema Completo de Gestión de Eventos inicializado correctamente');
    }

    InicializarEventosCalendario() {
        // Botón aplicar filtros
        $('#btnAplicarFiltros').on('click', () => this.calendarManager.aplicarFiltros());

        // Botón limpiar filtros
        $('#btnLimpiarFiltros').on('click', () => this.calendarManager.limpiarFiltros());

        //Filtrar
        $('#FiltroFechaInicio, #FiltroFechaFin, #FiltroMesAnio, #FiltroLinea,#FiltroProceso').on('change', () => {
            if (this.calendarManager._navegandoCalendario) return; // ✅ ignorar si viene del calendario
            this.calendarManager.cargarEventosReales();
        });

        $('#eptBtnEditar').off('click').on('click', () => {
            $('#eventModal').modal('hide');
            this.calendarManager.abrirModalEditarPlan(idPlan);
        });
        $('#eptBtnEliminar').off('click').on('click', () => {
            $('#eventModal').modal('hide');
            this.calendarManager.eliminarPlan(idPlan);
        });

        $('#paroBtnCerrar').off('click').on('click', () => {
            $('#modalParo').modal('hide');
            this.calendarManager.cerrarParo(idParo);
        });
        $('#paroBtnEliminar').off('click').on('click', () => {
            $('#modalParo').modal('hide');
            this.calendarManager.eliminarParo(idParo);
        });

        $(document).on('click', '#eventModal .bit-toggle-btn', function () {

            const w = $(this).closest('.bitacora-wrap');
            const isOpen = w.attr('data-open') === 'true';

            w.attr('data-open', !isOpen);

            $(this).find('.bit-chevron')
                .css('transform', !isOpen ? 'rotate(180deg)' : '');
        });

        $("#FiltroProceso")
            .off('change')
            .on('change', (e) => {

                let Area = $(e.currentTarget).val();

                EquiposUtil.llenarLineas(
                    this.datos_usuario[0].PLANTA,
                    Area,
                    1,
                    "FiltroLinea",
                    null
                );
            });

        $("#btnExportarExcel").on('click', () => this.calendarManager.exportarExcel());
    }

}

// ========================================
// INICIALIZACIÓN
// ========================================
$(document).ready(function () {
    const app = new GestionEventosApp();
    app.inicializar();

    window.HeaderFijoGlobalManager.crear(
        '.card-header.header-fijo-custom',
        '.position-relative.header-custom',
        'headerMantenimientos',
        {
            topOffset: 45,
            backgroundColor: 'white',
            boxShadow: '0 4px 12px rgba(0, 88, 161, 0.3)',
            animacion: true
        }
    );
});

// ========================================
// GESTOR DE UI
// ========================================
class UIManager {
    static inicializarUI() {
        $("#PlaneacionContainer").addClass("selected");
        $("#PlaneacionContainer a").addClass("whiteText");
        $("#planeacion-collapse").addClass("show");
        $("#CalendarioPlaneacionURL").addClass("selected-item");

        $('#FiltroFechaInicio').val(DateUtils.obtenerPrimerDiaMesActual());
        $('#FiltroFechaFin').val(DateUtils.obtenerUltimoDiaMesActual());
    }
}

// ========================================
// GESTOR DE CALENDARIO
// ========================================
class CalendarManager {
    constructor(URLBasePlaneacion, URLBaseProduccion, URLBaseMantenimientos) {
        this.URLBasePlaneacion = URLBasePlaneacion;
        this.URLBaseProduccion = URLBaseProduccion;
        this.URLBaseMantenimientos = URLBaseMantenimientos;
        this.datos_usuario = GlobalUtil.getDatosUsuario(); // ✅ Variable local
        this.PLANTA = this.datos_usuario[0].PLANTA;
        this.calendarEl = document.getElementById('calendar');
        this.selectedDate = '';
        this.calendar = null;
        this.todosLosEventos = []; // Guardar todos los eventos para filtrado
        this._navegandoCalendario = false;
        this._cargaInicial = true;
        this.todosLosPlanes = [];
        this.todosLosMantenimientos = [];
        this.todosLosParos = [];


        // ✅ AGREGA ESTAS 3 LÍNEAS:
        this.iconosLinea = { default: '⚙️' };
        this.lineaColorMap = {};
        this.lineaColorIdx = 0;

        EquiposUtil.llenarLineas(this.PLANTA, "FiltroLinea", "ParoLinea");
        EquiposUtil.llenarProcesos(this.PLANTA,1, "FiltroProceso", null);


    }

    // ✅ Función para inicializar el calendario
    inicializar() {
        // Inicializar el calendario
        this.calendar = new FullCalendar.Calendar(this.calendarEl, {
            initialView: 'dayGridMonth',
            locale: 'es',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            buttonText: {
                today: 'Hoy',
                month: 'Mes',
                week: 'Semana',
                day: 'Día'
            },
            showNonCurrentDates: true,
            events: [], // ✅ Inicialmente vacío, se carga después
            datesSet: (info) => this.RenderizarDatos(info),
            dateClick: (info) => this.handleDateClick(info),
            // ✅ AGREGA ESTO:
            eventContent: (arg) => {
                const props = arg.event.extendedProps;
                if (props._tipo === 'paro') {
                    return this._buildParoChip(arg);
                } else if (props._tipo === 'mantenimiento') {
                    return this._buildMantenimientoChip(arg);
                } else {
                    return this._buildPlanChip(arg);
                }
            },
            eventClick: (info) => this.handleEventClick(info),
        });

        this.calendar.render();

        $('#modalParo').on('hidden.bs.modal', () => {
            this._detenerRelojParo();
        });

        // ✅ Cargar los eventos reales desde HANA
        this.cargarEventosReales();
    }

    // ✅ Chip para planes de producción
    _buildPlanChip(arg) {
        const event = arg.event;
        const props = event.extendedProps;
        const linea = props.line || event.id || 'default';
        const titulo = props.equipment || event.title || 'Sin nombre';
        const tipo = props.tipo || '';
        const estatus = props.status || '';
        const marcador = props._marcador || 'inicio';
        const articulo = props.articulo;
        const articulo_desc = props.articulo_desc;

        const icono = marcador === 'inicio'
            ? '<i class="bi bi-play-circle-fill" style="color:#4ade80; font-size:0.9rem;"></i>'
            : '<i class="bi bi-stop-circle-fill" style="color:#f87171; font-size:0.9rem;"></i>';

        const colorClass = this.getColorClass(linea);
        const statusMap = { 'C': 'Completado', 'P': 'En Proceso', 'X': 'Cancelado', 'O': 'Programado' };
        const estatusLabel = statusMap[estatus] || 'Programado';
        const sub = [tipo, estatusLabel].filter(Boolean).join(' · ');
        const badgeClass = estatus ? `chip-badge-${estatus}` : 'chip-badge-O';
        const badgeLabel = marcador === 'inicio' ? 'Inicio' : 'Fin';

        const html = `
        <div class="cal-event-chip ${colorClass}" title="PLAN ${titulo}">
            <div class="chip-stripe"></div>
            <div class="chip-body">
                ${icono}
                <div class="chip-text">
                    <div class="chip-title">PLAN ${titulo}</div>
                      <div class="chip-sub" title="${articulo_desc}">
                        🔩 ${articulo}
                      </div>
                    ${sub ? `<div class="chip-sub">${sub}</div>` : ''}
                </div>
                <span class="chip-badge ${badgeClass}">${badgeLabel}</span>
            </div>
        </div>
    `;
        return { html };
    }

    // ✅ Chip para paros de producción
    _buildParoChip(arg) {
        const props = arg.event.extendedProps;
        const linea = props.line || 'default';
        const titulo = props.equipment || 'Sin nombre';
        const estatus = props.status || 'O';
        const colorClass = this.getColorClass(linea);

        const estatusMap = { 'O': 'Activo', 'C': 'Cerrado' };
        const estatusLabel = estatusMap[estatus] || 'Activo';
        const badgeClass = estatus === 'O' ? 'chip-badge-paro-activo' : 'chip-badge-paro-cerrado';
        const duracion = props.duracion_hrs != null ? `${props.duracion_hrs} hrs` : 'En curso';
        const chipClass = estatus === 'O' ? 'chip-paro' : 'chip-paro-cerrado';


        const html = `
        <div class="cal-event-chip ${chipClass}" title="PARO ${titulo}">
            <div class="chip-stripe chip-stripe-paro"></div>
            <div class="chip-body">
                <i class="bi bi-exclamation-triangle-fill" style="color:#fbbf24; font-size:0.9rem;"></i>
                <div class="chip-text">
                    <div class="chip-title">PARO ${titulo}</div>
                    <div class="chip-sub">${duracion}</div>
                </div>
                <span class="chip-badge ${badgeClass}">${estatusLabel}</span>
            </div>
        </div>
    `;
        return { html };
    }

    // ✅ Chip para mantenimientos preventivos
    _buildMantenimientoChip(arg) {
        const props = arg.event.extendedProps;
        const linea = props.line || 'default';
        const titulo = props.equipment || 'Sin nombre';
        const periodicidad = props.periodicidad || 'No especificada';
        const marcador = props._marcador || 'inicio';

        const icono = marcador === 'inicio'
            ? '<i class="bi bi-tools" style="color:#10b981; font-size:0.9rem;"></i>'
            : '<i class="bi bi-check-circle-fill" style="color:#06b6d4; font-size:0.9rem;"></i>';

        const colorClass = this.getColorClass(linea);
        const badgeLabel = marcador === 'inicio' ? 'Inicio' : 'Fin';

        const html = `
        <div class="cal-event-chip ${colorClass}" title="MTT ${titulo}">
            <div class="chip-stripe" style="background-color:#10b981;"></div>
            <div class="chip-body">
                ${icono}
                <div class="chip-text">
                    <div class="chip-title">MTT ${titulo}</div>
                    <div class="chip-sub">🔧 ${periodicidad}</div>
                </div>
                <span class="chip-badge chip-badge-O">Preventivo</span>
            </div>
        </div>
    `;
        return { html };
    }

    // ✅ Función para obtener paros de produccion del SP
    obtenerParosProduccion() {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: `/${this.URLBaseProduccion}/obtenerParosProduccion`,
                type: 'POST',
                data: {
                    FiltroPlanta: this.PLANTA || '',
                    FiltroFechaInicio: $("#FiltroFechaInicio").val() || '',
                    FiltroFechaFin: $("#FiltroFechaFin").val() || '',
                    FiltroLinea: $("#FiltroLinea").val() || '',
                    FiltroMesAnio: $("#FiltroMesAnio").val() || '',
                },
                success: function (data) {
                    if (data.Status === 'OK') {
                        let paros = data.Data;

                        // Si viene como string, parsearlo
                        if (typeof paros === 'string') {
                            try {
                                paros = JSON.parse(paros);
                            } catch (e) {
                                console.error('❌ Error al parsear datos:', e);
                                reject(e);
                                return;
                            }
                        }

                        resolve(paros);
                    } else if (data.Status === 'NO') {
                        AlertManager.mostrar(data.Message, 'info');
                        resolve([]);
                    } else if (data.Status === 'warning') {
                        AlertManager.mostrar('Error: ' + data.Message, 'warning');
                        reject(data.Message);
                    }
                },
                error: function (xhr, status, error) {
                    console.error('❌ Error AJAX:', error);
                    AlertManager.mostrar('Error de conexión al obtener los planes.', 'warning');
                    reject(error);
                }
            });
        });
    }

    // ✅ Función para obtener mantenimientos completados del SP
    obtenerPlanesProduccion() {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: `/${this.URLBasePlaneacion}/obtenerPlanesProgramados`,
                type: 'POST',
                data: {
                    FiltroFechaInicio: $("#FiltroFechaInicio").val() || '',
                    FiltroFechaFin: $("#FiltroFechaFin").val() || '',
                    FiltroMesAnio: $("#FiltroMesAnio").val() || '',
                    FiltroLinea: $("#FiltroLinea").val() || '',
                    FiltroProceso: $("#FiltroProceso").val() || '',
                    FiltroPlanta: this.PLANTA || '',
                },
                success: function (data) {
                    if (data.Status === 'OK') {
                        let mantenimientos = data.data;

                        // Si viene como string, parsearlo
                        if (typeof mantenimientos === 'string') {
                            try {
                                mantenimientos = JSON.parse(mantenimientos);
                            } catch (e) {
                                console.error('❌ Error al parsear datos:', e);
                                reject(e);
                                return;
                            }
                        }

                        console.log('✅ Mantenimientos recibidos:', mantenimientos);
                        resolve(mantenimientos);
                    } else if (data.Status === 'NO') {
                        AlertManager.mostrar(data.Message, 'info');
                        resolve([]);
                    } else if (data.Status === 'warning') {
                        AlertManager.mostrar('Error: ' + data.Message, 'warning');
                        reject(data.Message);
                    }
                },
                error: function (xhr, status, error) {
                    console.error('❌ Error AJAX:', error);
                    AlertManager.mostrar('Error de conexión al obtener los planes.', 'warning');
                    reject(error);
                }
            });
        });
    }

    // ✅ Función para obtener mantenimientos preventivos del SP
    obtenerMantenimientosPreventivos() {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: `/${this.URLBaseMantenimientos}/GetMantenimientosPorRango`,
                type: 'POST',
                data: {
                    FiltroFechaInicio: $("#FiltroFechaInicio").val() || '',
                    FiltroFechaFin: $("#FiltroFechaFin").val() || '',
                    FiltroLinea: $("#FiltroLinea").val() || '',
                    FiltroPlanta: this.PLANTA || '',
                    length: 9999,
                    start: 0
                },
                success: function (data) {
                    if (data.error) {
                        AlertManager.mostrar('Error: ' + data.error, 'warning');
                        reject(data.error);
                        return;
                    }
                    resolve(data.data || []);
                },
                error: function (xhr, status, error) {
                    console.error('❌ Error AJAX mantenimientos:', error);
                    AlertManager.mostrar('Error de conexión al obtener mantenimientos.', 'warning');
                    reject(error);
                }
            });
        });
    }

    filtrarUltimosMovimientos(bitacora) {
        if (!bitacora || bitacora.length === 0) return [];

        const resultado = [];

        for (let i = 0; i < bitacora.length; i++) {
            const actual = bitacora[i];
            const siguiente = bitacora[i + 1];

            // Si no hay siguiente, o el siguiente es un artículo diferente,
            // incluimos el registro actual
            if (!siguiente || siguiente.NVO_ARTICULO !== actual.NVO_ARTICULO) {
                resultado.push(actual);
            }
            // Si el siguiente tiene el mismo artículo, lo saltamos
            // (esperamos al último del grupo)
        }

        return resultado;
    }

    // ✅ Función para transformar datos de HANA a formato FullCalendar
    transformarEventosCalendario(datosHana) {
        const eventos = [];

        datosHana.forEach((data) => {

            console.log(data.BITACORA);

            let eventosSegmentados = this.filtrarUltimosMovimientos(data.BITACORA);

            console.log(eventosSegmentados);
            //let FI = DateUtils.obtenerFechaConDia(item.FECHA_PLAN_STRING, item.DIA_INICIO_MANT_STR);
            //let FF = DateUtils.obtenerFechaConDia(item.FECHA_PLAN_STRING, item.DIA_FIN_MANT);

            eventosSegmentados.forEach((item) => {

                let FI = item.NVO_DIA_INICIO_MANT_STR;
                let FF = item.NVO_DIA_FIN_MANT_STR;
                FI = DateUtils.convertirFecha(FI);
                FF = DateUtils.convertirFecha(FF);

                const fechaInicio = new Date(FI + 'T00:00:00');
                const fechaFin = new Date(FF + 'T00:00:00');
                const fechaCompletado = new Date(FF + 'T00:00:00');

                const extendedProps = {
                    id_mantenimiento: data.ID_PLAN,
                    numero_orden: data.ID_PLAN,
                    id_equipo: item.NVO_LINEA_PRODUCCION,
                    equipment: item.LINEA_PRODUCCION_DESC,
                    description: data.LINEA_PRODUCCION_DESC,
                    area: data.AREA,
                    line: item.NVO_LINEA_PRODUCCION,
                    type: data.TIPO_MANTENIMIENTO,
                    tipo: data.TIPO_MANTENIMIENTO,
                    fechaInicio: fechaInicio.toLocaleDateString('es-ES'),
                    fechaFin: fechaFin.toLocaleDateString('es-ES'),
                    fechaCompletado: fechaCompletado.toLocaleDateString('es-ES'),
                    periodoMantenimiento: `${fechaInicio.toLocaleDateString('es-ES')} al ${fechaFin.toLocaleDateString('es-ES')}`,
                    status: data.ESTATUS,
                    solicitante: data.SOLICITANTE || 'No especificado',
                    ubicacion_tecnica: data.UBICACION_TECNICA || 'No especificada',
                    duracion_hrs: data.DURACION_HRS || 0,
                    texto_corto: data.TEXTO_CORTO || '',
                    texto_secuencia: data.TEXTO_SECUENCIA || '',
                    tecnicos_ids: data.TECNICOS_ASIGNADOS_IDS || '',
                    tecnicos_nombres: data.TECNICOS_ASIGNADOS_NOMBRES || 'No asignados',
                    proceso: item.NVO_PROCESO || '',
                    articulo: item.NVO_ARTICULO || '',
                    articulo_desc: item.NVO_ARTICULO_DESC || '',
                    capacidad: item.NVO_CAPACIDAD || 0,
                    pzsxdia: item.PZSXDIA || data.PZSXDIA || 0,
                    kgsxdia: item.KGSXDIA || data.KGSXDIA || 0,
                    // Preferir valores de la bitácora (item), si no están usar valores del plan (data)
                    produccion_teorica_pzs: (item.PRODUCCION_TEORICA_PZS || data.PRODUCCION_TEORICA_PZS) || 0,
                    produccion_teorica_kgs: (item.PRODUCCION_TEORICA_KGS || data.PRODUCCION_TEORICA_KGS) || 0,
                    produccion_real: (item.NVO_PRODUCCION_REAL != null ? item.NVO_PRODUCCION_REAL : (data.PRODUCCION_REAL != null ? data.PRODUCCION_REAL : 0)),
                    comentarios: item.NVO_COMENTARIOS || '',
                    dias_totales: data.DIAS_TOTALES || 0,
                    anio_plan: data.ANIO_PLAN || '',
                    mes_plan: data.MES_PLAN || '',
                    color_evento: data.COLOR_EVENTO || '#1a6fbd',
                    tiene_paro: data.TIENE_PARO_ACTIVO || 0,
                    id_paro: data.ID_PARO || null,
                    fecha_paro: data.FECHA_PARO || '',
                    comentarios_paro: data.COMENTARIOS_PARO || '',
                    bitacora: data.BITACORA || [] // ✅ NUEVO — BITÁCORA
                };

                // ── Evento INICIO ──
                eventos.push({
                    id: `${data.ID_PLAN}-inicio`,
                    title: `${data.LINEA_PRODUCCION_DESC}`,
                    start: fechaInicio,
                    end: fechaInicio,
                    allDay: true,
                    color: 'transparent',
                    extendedProps: { ...extendedProps, _marcador: 'inicio' }
                });

                // ── Evento FIN ──
                eventos.push({
                    id: `${data.ID_PLAN}-fin`,
                    title: `${data.LINEA_PRODUCCION_DESC}`,
                    start: fechaFin,
                    end: fechaFin,
                    allDay: true,
                    color: 'transparent',
                    extendedProps: { ...extendedProps, _marcador: 'fin' }
                });
            })


        });

        return eventos;
    }

    // ✅ Transformar mantenimientos preventivos → formato FullCalendar
    transformarMantenimientosCalendario(datosMantenimientos) {
        const eventos = [];

        datosMantenimientos.forEach((data) => {
            // Convertir fechas desde formato DD/MM/YYYY
            const convertirFecha = (fechaStr) => {
                if (!fechaStr) return null;
                const [dia, mes, anio] = fechaStr.split('/');
                return new Date(`${anio}-${mes}-${dia}T00:00:00`);
            };

            let fechaInicio = convertirFecha(data.FechaInicioMantenimiento);
            let fechaFin = convertirFecha(data.FechaFinMantenimiento);

            // Validación: si algo falla, usar fecha de referencia o ignorar
            if (!fechaInicio || isNaN(fechaInicio)) {
                console.warn('⚠️ Fecha de inicio inválida para equipo:', data.NombreEquipo);
                return; // Saltar este registro
            }
            if (!fechaFin || isNaN(fechaFin)) {
                fechaFin = fechaInicio; // Si falta fin, usar inicio
            }

            const extendedProps = {
                id_mantenimiento: data.IdEquipo,
                id_equipo: data.IdEquipo,
                equipment: data.NombreEquipo,
                description: data.DescripcionEquipo,
                area: data.Area,
                line: data.IdLineaProduccion,
                type: 'Mantenimiento Preventivo',
                tipo: 'Mantenimiento Preventivo',
                periodicidad: data.PeriodicidadMantenimiento,
                fechaInicio: fechaInicio.toLocaleDateString('es-ES'),
                fechaFin: fechaFin.toLocaleDateString('es-ES'),
                periodoMantenimiento: `${fechaInicio.toLocaleDateString('es-ES')} al ${fechaFin.toLocaleDateString('es-ES')}`,
                status: 'O', // Preventivos generalmente están en estado abierto/programado
                numero_doc: data.NumeroDocPmCalidad || '',
                centro_costos: data.CentroCostos || '',
                mes_mantenimiento: data.MesMantenimiento || '',
                color_evento: '#10b981' // Verde para diferenciarlo de los planes (azul)
            };

            // ── Evento INICIO del mantenimiento ──
            eventos.push({
                id: `${data.IdEquipo}-mtto-inicio-${data.IdEquipoPeriodicidad}`,
                title: `MTT ${data.NombreEquipo}`,
                start: fechaInicio,
                end: fechaInicio,
                allDay: true,
                color: 'transparent',
                extendedProps: { ...extendedProps, _marcador: 'inicio', _tipo: 'mantenimiento' }
            });

            // ── Evento FIN del mantenimiento ──
            eventos.push({
                id: `${data.IdEquipo}-mtto-fin-${data.IdEquipoPeriodicidad}`,
                title: `MTT ${data.NombreEquipo}`,
                start: fechaFin,
                end: fechaFin,
                allDay: true,
                color: 'transparent',
                extendedProps: { ...extendedProps, _marcador: 'fin', _tipo: 'mantenimiento' }
            });
        });

        return eventos;
    }
    // ✅ Transformar paros → formato FullCalendar
    transformarParosCalendario(datosHana) {
        const eventos = [];

        datosHana.forEach((item) => {
            // FECHA_PARO_STRING viene como 'DD/MM/YYYY HH24:MI' — tomamos solo la fecha
            const fechaStr = item.FECHA_PARO_STRING
                ? item.FECHA_PARO_STRING.split(' ')[0]  // 'DD/MM/YYYY'
                : null;

            if (!fechaStr) return;

            const [d, m, y] = fechaStr.split('/');
            const fechaParo = new Date(`${y}-${m}-${d}T00:00:00`);

            const extendedProps = {
                _tipo: 'paro',                                        // ✅ Identificador de tipo
                id_paro: item.ID_PARO,
                line: item.LINEA_PRODUCCION,
                equipment: item.LINEA_PRODUCCION_DESC,
                usuario: item.USUARIO || '—',
                comentarios: item.COMENTARIOS || '',
                status: item.ESTATUS,
                fecha_paro: item.FECHA_PARO_STRING || '',
                fecha_reanudacion: item.FECHA_REANUDACION_STRING || null,
                duracion_hrs: item.DURACION_HRS || null,              // null = paro activo aún
                color_evento: item.COLOR_EVENTO || '#ef4444',
            };

            // Solo evento de inicio — los paros no tienen chip de fin
            eventos.push({
                id: `paro-${item.ID_PARO}`,
                title: item.LINEA_PRODUCCION_DESC,
                start: fechaParo,
                end: fechaParo,
                allDay: true,
                color: 'transparent',
                extendedProps: { ...extendedProps, _marcador: 'inicio' }
            });
        });

        return eventos;
    }

    async cargarEventosReales() {
        GlobalUtil.mostrarLoader(true);

        try {
            // ✅ Tres peticiones en paralelo — un solo loader
            const [datosPlanes/*datosMantenimientos,datosParos*/] = await Promise.all([
                this.obtenerPlanesProduccion()
                // this.obtenerMantenimientosPreventivos()
                // this.obtenerParosProduccion()
            ]);

            this.calendar.removeAllEvents();

            // ── Planes de Producción ──
            if (datosPlanes && datosPlanes.length > 0) {
                const eventosPlanes = this.transformarEventosCalendario(datosPlanes);
                this.todosLosPlanes = eventosPlanes;
                eventosPlanes.forEach(e => this.calendar.addEvent(e));
            }

            // ── Mantenimientos Preventivos ──
            // if (datosMantenimientos && datosMantenimientos.length > 0) {
            //     const eventosMantenimientos = this.transformarMantenimientosCalendario(datosMantenimientos);
            //     this.todosLosMantenimientos = eventosMantenimientos;
            //     eventosMantenimientos.forEach(e => this.calendar.addEvent(e));
            // }

            // ── Paros ──
            // if (datosParos && datosParos.length > 0) {
            //     const eventosParos = this.transformarParosCalendario(datosParos);
            //     this.todosLosParos = eventosParos;
            //     eventosParos.forEach(e => this.calendar.addEvent(e));
            // }

            // todosLosEventos sigue funcionando para cargarLineasProduccion
            this.todosLosEventos = [...this.todosLosPlanes, ...this.todosLosMantenimientos, ...this.todosLosParos];

            const totalPlanes = datosPlanes?.length || 0;
            // const totalMantenimientos = datosMantenimientos?.length || 0;
            // const totalParos = datosParos?.length || 0;

            const labelPlanes = totalPlanes === 1 ? 'plan cargado' : 'planes cargados';
            // const labelMantenimientos = totalMantenimientos === 1 ? 'mantenimiento cargado' : 'mantenimientos cargados';
            // const labelParos = totalParos === 1 ? 'paro cargado' : 'paros cargados';

            AlertManager.mostrar(`${totalPlanes} ${labelPlanes}`, 'success');

        } catch (error) {
            console.error('❌ Error al cargar calendario:', error);
            AlertManager.mostrar('Error al cargar el calendario', 'warning');
        } finally {
            GlobalUtil.mostrarLoader(false);
        }
    }

    // ✅ Aplicar filtros
    aplicarFiltros() {
        // Si hay filtros de fecha, recargar desde el servidor
        this.cargarEventosReales();
    }

    // ✅ Limpiar filtros
    limpiarFiltros() {
        $('#FiltroTipoMantenimiento').val('');
        $('#FiltroLineaProduccion').val('');
        $('#FiltroFechaInicio').val('');
        $('#FiltroFechaFin').val('');
        $('#FiltroLinea').val('');     // ✅
        $('#FiltroMesAnio').val('');   // ✅
        this.cargarEventosReales();
    }

    // ✅ Actualizar título del calendario
    RenderizarDatos(info) {
        const viewType = info.view.type;
        const capitalizar = true;
        let titleText = '';

        if (viewType === 'dayGridMonth') {
            const currentDate = info.view.currentStart;
            let monthName = currentDate.toLocaleString('es-ES', { month: 'long' });
            const year = currentDate.getFullYear();
            if (capitalizar) monthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);
            titleText = monthName + ' ' + year;
        } else if (['timeGridWeek', 'timeGridDay', 'listWeek'].includes(viewType)) {
            const start = info.start;
            const end = new Date(info.end.getTime() - 1);
            function fmt(d) {
                return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
            }
            titleText = viewType === 'timeGridDay' ? fmt(start) : fmt(start) + ' - ' + fmt(end);
        } else {
            titleText = info.view.title.replace(/\s+de\s+/i, ' ');
            if (capitalizar) titleText = titleText.charAt(0).toUpperCase() + titleText.slice(1);
        }

        const titleEl = document.querySelector('.fc-toolbar-title');
        if (titleEl) titleEl.textContent = titleText;

        // ✅ Sincronizar inputs de fecha con el rango visible del calendario
        this._navegandoCalendario = true;

        const primerDia = info.view.currentStart.toISOString().split('T')[0]; // este sí funciona

        // ✅ Último día — restar 1 día entero en lugar de 1 milisegundo
        const fechaFin = new Date(info.view.currentEnd);
        fechaFin.setDate(fechaFin.getDate() - 1);
        const ultimoDia = `${fechaFin.getFullYear()}-${String(fechaFin.getMonth() + 1).padStart(2, '0')}-${String(fechaFin.getDate()).padStart(2, '0')}`;

        $('#FiltroFechaInicio').val(primerDia);
        $('#FiltroFechaFin').val(ultimoDia);
        $('#FiltroLinea').val('');      // ✅ limpiar al navegar
        $('#FiltroMesAnio').val('');    // ✅ limpiar al navegar

        this._navegandoCalendario = false;

        // ✅ Ignorar el primer datesSet — ya lo carga inicializar()
        if (this._cargaInicial) {
            this._cargaInicial = false;
            return;
        }

        this.cargarEventosReales();
    }

    // ✅ Manejar click en fecha del calendario
    handleDateClick(info) {
        const clickedDate = info.date;
        const currentMonth = this.calendar.getDate().getMonth();
        const clickedMonth = clickedDate.getMonth();

        if (clickedMonth !== currentMonth) return;

        this.selectedDate = info.dateStr;
        $('#selectedDate').val(this.selectedDate);
        $('#addEventModal').modal('show');
    }

    // ✅ Manejar click en evento del calendario — reemplaza handleEventClick() completo
    handleEventClick(info) {
        const props = info.event.extendedProps;

        if (props._tipo === 'paro') {
            this._renderModalParo(props);
            $('#modalParo').modal('show');     // 👈 el ID de tu modal de paro
        } else {
            this._renderModalEvento(props);
            $('#eventModal').modal('show');
        }

        info.jsEvent.preventDefault();
    }

    _renderModalEvento(props) {
        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const estatusMap = { 'C': 'Completado', 'P': 'En Proceso', 'X': 'Cancelado', 'O': 'Programado' };
        const fmtNum = n => n ? Number(n).toLocaleString('es-MX') : '0';

        // ── Header ──
        const lineaNumero = props.line || props.id_equipo || props.numero_orden || '—';
        const tituloLinea = props.equipment
            ? props.equipment
            : `PLAN LÍNEA ${lineaNumero}`;

        $('#eptLineaNombre').text(tituloLinea);
        $('#eptLineaSub').text(`ID #${props.numero_orden || '—'}`);

        const mesPill = props.mes_plan
            ? `${meses[(props.mes_plan - 1)] || ''} ${props.anio_plan || ''}`
            : '—';
        $('#eptMesPill').html(`<i class="bi bi-calendar3"></i> ${mesPill}`);

        // ── Paro activo ──
        const tieneParoActivo = props.tiene_paro == 1;
        if (tieneParoActivo) {
            $('#eptParoBanner').removeClass('d-none');
            $('#eptParoTexto').text(`Paro activo registrado el ${props.fecha_paro || ''}`);
            $('#eptLineaIcon').addClass('linea-icon-paro');
        } else {
            $('#eptParoBanner').addClass('d-none');
            $('#eptLineaIcon').removeClass('linea-icon-paro');
        }

        // ── Período y proceso ──
        $('#eptPeriodo').text(`${props.fechaInicio || '—'} — ${props.fechaFin || '—'}`);
        $('#eptProceso').text(props.proceso || '—');

        // ── Artículo ──
        const artDesc = props.articulo_desc || props.articulo || '—';
        $('#eptArticulo')
            .text(artDesc.length > 40 ? artDesc.substring(0, 40) + '…' : artDesc)
            .attr('title', artDesc);


        // ── Capacidades ──────────────────────────────────────────────────────
        $('#eptCapacidadPZ').text(
            props.pzsxdia
                ? fmtNum(props.pzsxdia)
                : '0'
        );

        $('#eptCapacidadKGS').text(
            props.kgsxdia
                ? fmtNum(props.kgsxdia)
                : '0'
        );

        // ── Stats producción ──
        const prodTeoricaPzs = parseFloat(props.produccion_teorica_pzs) || 0;
        const prodTeoricaKgs = parseFloat(props.produccion_teorica_kgs) || 0;

        $('#eptProdTeoricaPZ').text(prodTeoricaPzs > 0 ? fmtNum(prodTeoricaPzs) : '0');
        $('#eptProdTeoricaKGS').text(prodTeoricaKgs > 0 ? fmtNum(prodTeoricaKgs) : '0');

        $('#eptProdReal').text(props.produccion_real != null ? fmtNum(props.produccion_real) : '0');

        // ── Barra de cumplimiento ──
        const teo = prodTeoricaPzs;
        const real = parseFloat(props.produccion_real) || 0;
        const pct = teo > 0 ? Math.round((real / teo) * 100) : 0;
        const bw = Math.min(pct, 100);

        $('#eptPct').text(`${pct}%`);
        const fillClass = pct >= 90 ? 'fill-ok' : pct >= 50 ? 'fill-warn' : 'fill-bad';
        $('#eptProgressFill')
            .removeClass('fill-ok fill-warn fill-bad fill-over')
            .addClass(fillClass)
            .css('width', '0%');
        setTimeout(() => $('#eptProgressFill').css('width', bw + '%'), 120);

        // ── Comentarios ──
        const comentarios = props.comentarios && props.comentarios.trim()
            ? props.comentarios
            : '<em style="color:#94a3b8">Sin comentarios</em>';
        $('#eptComentarios').html(comentarios);

        // ── Estatus chip ──
        const estatus = props.status || 'O';
        $('#eptEstatusChip')
            .removeClass('chip-O chip-P chip-C chip-X')
            .addClass(`chip-${estatus}`);
        $('#eptEstatusLabel').text(estatusMap[estatus] || 'Programado');

        // ── Bitácora ──
        $('#eptBitacora').html(
            this._renderBitacora(props.bitacora || [])
        );

        // ── Botones ──
        const idPlan = props.id_mantenimiento;
    }

    _renderModalParo(props) {
        const estatusMap = { 'O': 'Activo', 'C': 'Cerrado' };
        const estatus = props.status || 'O';
        const estatusLabel = estatusMap[estatus] || 'Activo';
        const esActivo = estatus === 'O';

        // ── Header ──
        $('#paroLineaNombre').text(props.equipment || 'Sin nombre');
        $('#paroLineaSub').text(`ID #${props.id_paro || '—'}`);
        $('#paroEstatusPill').text(estatusLabel);

        // Pulso solo si está activo
        $('.paro-header')
            .toggleClass('paro-activo-header', esActivo);

        // ── Fechas ──
        $('#paroFechaInicio').text(props.fecha_paro || '—');

        // ── Tiempo transcurrido — reloj en vivo ──
        this._iniciarRelojParo(props.fecha_paro, esActivo);

        $('#paroFechaReanudacion').text(
            props.fecha_reanudacion || 'Sin reanudación aún'
        );

        // ── Duración ──
        $('#paroDuracion').html(
            props.duracion_hrs != null
                ? `${props.duracion_hrs} <small>hrs</small>`
                : '<em style="color:#94a3b8">En curso</em>'
        );

        // ── Usuario ──
        $('#paroUsuario').text(props.usuario || '—');

        // ── Estatus chip ──
        $('#paroEstatusChip')
            .removeClass('chip-O chip-P chip-C chip-X')
            .addClass(`chip-${estatus}`);
        $('#paroEstatusLabel').text(estatusLabel);

        // ── Comentarios ──
        const comentarios = props.comentarios && props.comentarios.trim()
            ? props.comentarios
            : '<em style="color:#94a3b8">Sin comentarios</em>';
        $('#paroComentarios').html(comentarios);

        // ── Botones ──
        const idParo = props.id_paro;

        // Ocultar "Cerrar Paro" si ya está cerrado
        $('#paroBtnCerrar').toggle(esActivo);
    }

    _iniciarRelojParo(fechaParoString, esActivo) {
        // Limpiar intervalo anterior si había uno corriendo
        this._detenerRelojParo();

        if (!esActivo || !fechaParoString) {
            $('#paroTiempoRow').hide();
            return;
        }

        $('#paroTiempoRow').show();

        // Parsear 'DD/MM/YYYY HH:MM'
        const [fecha, hora] = fechaParoString.split(' ');
        const [d, m, y] = fecha.split('/');
        const [h, min] = (hora || '00:00').split(':');
        const inicio = new Date(y, m - 1, d, h, min);

        // Función que actualiza el DOM
        const tick = () => {
            const diffMs = new Date() - inicio;
            if (diffMs < 0) { $('#paroTiempoTranscurrido').text('—'); return; }

            const totalMin = Math.floor(diffMs / 60000);
            const dias = Math.floor(totalMin / 1440);
            const horas = Math.floor((totalMin % 1440) / 60);
            const mins = totalMin % 60;
            const segs = Math.floor((diffMs % 60000) / 1000);

            let texto = '';
            if (dias > 0) texto += `${dias}d `;
            if (horas > 0) texto += `${horas}h `;
            texto += `${String(mins).padStart(2, '0')}m ${String(segs).padStart(2, '0')}s`;

            $('#paroTiempoTranscurrido').text(texto);
        };

        tick(); // ejecutar inmediatamente
        this._relojParoInterval = setInterval(tick, 1000);
    }

    _detenerRelojParo() {
        if (this._relojParoInterval) {
            clearInterval(this._relojParoInterval);
            this._relojParoInterval = null;
        }
    }

    _renderBitacora(bitacora = []) {

        // Si no hay registros, no renderiza nada
        if (!bitacora.length) return '';

        // Configuración visual según tipo de acción
        const cfg = {
            CREATE: { icon: 'bi-plus-circle-fill', cls: 'bit-create', label: 'Plan creado' },
            UPDATE: { icon: 'bi-pencil-fill', cls: 'bit-update', label: 'Ajuste' },
            DELETE: { icon: 'bi-trash3-fill', cls: 'bit-delete', label: 'Eliminado' },
        };

        // Recorrer bitácora (ya viene orden cronológico)
        const items = bitacora.map((b, i) => {

            // Configuración visual del registro
            const c = cfg[b.BIT_ACCION] || cfg.UPDATE;

            // Determinar si es el último (más reciente)
            const esUltimo = i === bitacora.length - 1;

            // Dibujar línea vertical solo si no es el último
            const esLinea = !esUltimo;

            // Campos normales (grid compacto)
            // Preparar valores de producción teórica (intentar distintas propiedades que pueda traer la bitácora)
            const bitProdPzsRaw = b.NVO_PRODUCCION_TEORICA_PZS || b.PRODUCCION_TEORICA_PZS || b.NVO_PRODUCCION_TEORICA;
            const bitProdKgsRaw = b.NVO_PRODUCCION_TEORICA_KGS || b.PRODUCCION_TEORICA_KGS || b.NVO_PRODUCCION_TEORICA_KGS;

            const bitProdPzsVal = bitProdPzsRaw != null && String(bitProdPzsRaw).trim() !== ''
                ? `${Number(bitProdPzsRaw).toLocaleString('es-MX')} PZ`
                : `0 PZ`;

            const bitProdKgsVal = bitProdKgsRaw != null && String(bitProdKgsRaw).trim() !== ''
                ? `${Number(bitProdKgsRaw).toLocaleString('es-MX')} KG`
                : `0 KG`;

            const campos = [
                { icon: 'bi-gear-fill', label: 'Proceso', val: b.NVO_PROCESO },

                { icon: 'bi-box-seam-fill', label: 'Artículo', val: b.NVO_ARTICULO },

                {
                    icon: 'bi-box-seam-fill',
                    label: 'Cap. PZ',
                    val: b.PZSXDIA
                        ? `${Number(b.PZSXDIA).toLocaleString('es-MX')} PZ/día`
                        : `0 PZ/día`
                },

                {
                    icon: 'bi-speedometer2',
                    label: 'Cap. KGS',
                    val: b.KGSXDIA
                        ? `${Number(b.KGSXDIA).toLocaleString('es-MX')} KG/día`
                        : `0 KG/día`
                },

                { icon: 'bi-calculator-fill', label: 'Prod. Teórica PZ', val: bitProdPzsVal },
                { icon: 'bi-calculator-fill', label: 'Prod. Teórica KGS', val: bitProdKgsVal }
            ]
                .filter(f => f.val && String(f.val).trim() !== '');


            // Campos ancho completo (al final)
            const camposFull = [
                { icon: 'bi-graph-up-arrow', label: 'Prod. Real', val: (b.NVO_PRODUCCION_REAL != null && String(b.NVO_PRODUCCION_REAL).trim() !== '') ? `${Number(b.NVO_PRODUCCION_REAL).toLocaleString('es-MX')} PZ` : null },

                { icon: 'bi-card-text', label: 'Descripción', val: b.NVO_ARTICULO_DESC },

                {
                    icon: 'bi-calendar-range',
                    label: 'Período',
                    val: (b.NVO_DIA_INICIO_MANT_STR && b.NVO_DIA_FIN_MANT_STR)
                        ? `${b.NVO_DIA_INICIO_MANT_STR} — ${b.NVO_DIA_FIN_MANT_STR}`
                        : null
                },

                { icon: 'bi-chat-left-text', label: 'Comentarios', val: b.NVO_COMENTARIOS },

            ].filter(f => f.val && String(f.val).trim() !== '');

            // Renderizar campos dinámicamente
            const detalle = (campos.length || camposFull.length) ? `
            <div class="bit-fields">
                ${campos.map(f => `
                <div class="bit-field">
                    <span class="bit-field-label">
                        <i class="bi ${f.icon}"></i> ${f.label}
                    </span>
                    <span class="bit-field-val">
                        ${f.val}
                    </span>
                </div>
                `).join('')}

                ${camposFull.map(f => `
                <div class="bit-field full">
                    <span class="bit-field-label">
                        <i class="bi ${f.icon}"></i> ${f.label}
                    </span>
                    <span class="bit-field-val ${f.label === 'Descripción' ? 'desc-articulo' : ''}">
                        ${f.val}
                    </span>
                </div>
                `).join('')}

            </div>` : '';

            // Retornar estructura del timeline
            return `
    <div class="bit-item ${c.cls}">

        <!-- Línea lateral -->
        <div class="bit-left">
            <div class="bit-dot">
                <i class="bi ${c.icon}"></i>
            </div>
            ${esLinea ? '<div class="bit-line"></div>' : ''}
        </div>

        <!-- Contenido -->
        <div class="bit-body ${esUltimo ? 'bit-body-last' : ''}">

            <!-- Header -->
            <div class="bit-header">
                <span class="bit-chip ${c.cls}">
                    ${c.label}
                </span>
                ${esUltimo ? '<span class="bit-reciente">Más reciente</span>' : ''}
            </div>

            <!-- Meta -->
            <div class="bit-meta">
                <span>
                    <i class="bi bi-person-circle"></i> 
                    ${b.BIT_USUARIO || 'Sistema'}
                </span>
                <span>
                    <i class="bi bi-clock-history"></i> 
                    ${b.BIT_FECHA_MOVIMIENTO || ''}
                </span>
            </div>

            <!-- Detalle -->
            ${detalle}

        </div>
    </div>`;
        });

        // Contenedor general
        return `
<div class="bitacora-wrap" data-open="false">

    <!-- Botón toggle -->
    <button class="bit-toggle-btn">
        <span class="bit-toggle-left">
            <i class="bi bi-clock-history"></i>
            Historial de cambios
        </span>

        <span class="bit-toggle-right">
            <span class="bit-count-pill">
                ${bitacora.length} 
                ${bitacora.length === 1 ? 'registro' : 'registros'}
            </span>
            <i class="bi bi-chevron-down bit-chevron"></i>
        </span>

    </button>

    <!-- Timeline -->
    <div class="bit-timeline">
        ${items.join('')}
    </div>

</div>`;
    }

    // ✅ Calcular días entre dos fechas
    calcularDias(start, end) {
        if (!start || !end) return null;
        const diff = Math.round((new Date(end) - new Date(start)) / 86400000);
        return diff > 0 ? diff : 1;
    }

    // ✅ Asignar color fijo por línea de producción
    getColorClass(lineaId) {
        if (!this.lineaColorMap[lineaId]) {
            this.lineaColorMap[lineaId] = `color-${this.lineaColorIdx % 6}`;
            this.lineaColorIdx++;
        }
        return this.lineaColorMap[lineaId];
    }

    cerrarParo(idParo) {
        // TODO: implementar cuando esté el endpoint
        console.log('Cerrar paro:', idParo);
    }

    eliminarParo(idParo) {
        // TODO: implementar cuando esté el endpoint  
        console.log('Eliminar paro:', idParo);
    }

    // ─────────────────────────────────────────────
    // EXPORTAR EXCEL
    // ─────────────────────────────────────────────
    async exportarExcel() {
        try {
            const response = await $.ajax({
                url: `/${this.URLBasePlaneacion}/obtenerPlanesProgramados`,
                type: 'POST',
                data: {
                    start: 0,
                    length: 9999,
                    FiltroFechaInicio: $("#FiltroFechaInicio").val() || null,
                    FiltroFechaFin: $("#FiltroFechaFin").val() || null,
                    FiltroMesAnio: $("#FiltroMesAnio").val() || null,
                    FiltroLinea: $("#FiltroLinea").val() || null,
                    FiltroPlanta: this.PLANTA || null,
                }
            });

            const data = response.data || [];

            if (!data.length) {
                AlertManager.mostrar('No hay datos para exportar', 'warning');
                return;
            }

            $('#btnExportarExcel')
                .html('<span class="spinner-border spinner-border-sm me-2"></span>Exportando...')
                .prop('disabled', true);

            await GlobalUtil.exportPlanesAExcel(data, { fileName: null });

            AlertManager.mostrar('¡Excel exportado con éxito!', 'success');

        } catch (err) {
            console.error('Error al exportar:', err);
            AlertManager.mostrar('Error al exportar: ' + (err.message || err), 'warning');
        } finally {
            $('#btnExportarExcel').html('<i class="bi bi-file-earmark-excel-fill me-1"></i>Exportar').prop('disabled', false);
        }
    }
}
