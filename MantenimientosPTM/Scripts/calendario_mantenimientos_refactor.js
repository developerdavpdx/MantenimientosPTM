// ========================================
// UTILIDADES
// ========================================
function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** Devuelve YYYY-MM-DD sin pasar por zonas horarias. */
function soloFecha(valor) {
    if (!valor) return '';
    if (valor instanceof Date && !isNaN(valor)) {
        return `${valor.getFullYear()}-${String(valor.getMonth() + 1).padStart(2, '0')}-${String(valor.getDate()).padStart(2, '0')}`;
    }
    const m = String(valor).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
}

/** Date a medianoche local a partir de YYYY-MM-DD. */
function fechaLocal(valor) {
    const iso = soloFecha(valor);
    if (!iso) return null;
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
}

/** Suma días a una fecha YYYY-MM-DD y devuelve YYYY-MM-DD. */
function sumarDiasISO(iso, dias) {
    const f = fechaLocal(iso);
    if (!f) return '';
    f.setDate(f.getDate() + dias);
    return soloFecha(f);
}

/** Estado visual unificado a partir de id_status y firma completa. */
function obtenerEstadoEvento(props) {
    const id = Number(props.id_status);
    const finalizada = props.orden_trabajo_finalizada === 'SI';

    if (id === 4) {
        return finalizada
            ? { texto: 'Terminado', clase: 'bg-success' }
            : { texto: 'En proceso de firmas', clase: 'bg-dark' };
    }
    if (id === 3) return { texto: 'En espera de refacción', clase: 'bg-warning' };
    if (id === 2) return { texto: 'Liberado', clase: 'bg-primary' };
    if (id === 1) return { texto: 'Programado', clase: 'bg-secondary' };
    return { texto: 'Sin estatus', clase: 'bg-secondary' };
}

// ========================================
// GESTION DE EVENTOS
// ========================================
class GestionEventosApp {
    constructor() {
        this.URLBase = "Calendario";
        this.datos_usuario = GlobalUtil.getDatosUsuario();
        this.calendarManager = new CalendarManager(this.URLBase, this.datos_usuario);
        this._isReloading = false; // 🔥 flag para evitar recargas simultáneas
    }

    inicializar() {
        // Inicializar UI
        UIManager.inicializarUI();

        // Inicializar el calendario
        this.calendarManager.inicializar();

        // Configurar evento para guardar nuevo mantenimiento
        $('#btnGuardarEvento').on('click', () => this.guardarEvento());

        // Botón aplicar filtros
        $('#btnAplicarFiltros').on('click', () => this.calendarManager.aplicarFiltros());

        // Botón limpiar filtros
        $('#btnLimpiarFiltros').on('click', () => this.calendarManager.limpiarFiltros());

        $('#FiltroLineaProduccion, #FiltroTipoMantenimiento, #FiltroFechaInicio, #FiltroFechaFin, #FiltroClasificacion')
            .off('change')
            .on('change', () => {
                this.calendarManager.aplicarFiltros();
            });

        // Enter en los filtros de texto (Orden de Trabajo / Nombre de Equipo)
        $('#FiltroOrdenTrabajo, #FiltroNombreEquipo')
            .off('keydown')
            .on('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.calendarManager.aplicarFiltros();
                }
            });

        $("#FiltroArea")
            .off('change')
            .on('change', (e) => {
                let Area = $(e.currentTarget).val();
                EquiposUtil.llenarLineas(
                    this.datos_usuario[0].PLANTA,
                    Area,
                    null,
                    "FiltroLineaProduccion",
                    null
                );
            });

        EquiposUtil.llenarProcesos(this.datos_usuario[0].PLANTA,1, null, "FiltroArea");

        // 🔥 NUEVO: Inicializar HUB de SignalR para el calendario
        this.initHubCalendarioMantenimientos();

        console.log('✅ Sistema Completo de Gestión de Eventos inicializado correctamente');
    }

    // ========================================
    // 📡 SIGNALR MANAGER - CALENDARIO MANTENIMIENTOS
    // ========================================
    initHubCalendarioMantenimientos() {
        const self = this;

        // ✅ Validar que exista el objeto de conexión antes de usarlo
        if (typeof $.connection === 'undefined' || !$.connection.mantenimientoHub) {
            console.error('❌ SignalR no está disponible. Verifica que /signalr/hubs esté cargado en esta vista.');
            return;
        }

        const hub = $.connection.mantenimientoHub;
        let reconnectDelay = 5000;
        let modalActualizacion = null;

        // ── Inicializar modal una sola vez (si existe en esta vista) ──
        const $modalEl = document.getElementById('actualizacionDatosModal');
        if ($modalEl) {
            modalActualizacion = new bootstrap.Modal($modalEl, { backdrop: 'static', keyboard: false });

            const btnConfirmar = document.getElementById('btnConfirmarActualizacion');
            if (btnConfirmar) {
                btnConfirmar.addEventListener('click', function () {
                    modalActualizacion.hide();
                    self._recargarCalendarioMantenimientos();
                });
            }
        }

        // ========================================
        // 📡 EVENTO PRINCIPAL
        // ========================================
        // El servidor debe invocar:
        //   Clients.All.actualizarCalendarioMantenimientos()
        // (o Clients.Others si quieres excluir a quien generó el cambio)
        hub.client.actualizarCalendarioMantenimientos = function () {
            console.warn("📡 Actualización calendario recibida desde SignalR");

            // 🔥 Evitar múltiples modales apilados
            if ($modalEl && $modalEl.classList.contains('show')) return;

            // 🔥 Evitar aviso si ya hay un reload en curso
            if (self._isReloading) return;

            modalActualizacion
                ? modalActualizacion.show()
                : self._recargarCalendarioMantenimientos();
        };

        // ========================================
        // 🚀 START HUB (con fallback controlado)
        // ========================================
        $.connection.hub.start({
            transport: ['webSockets', 'longPolling']
        }).done(function () {
            console.log("✅ SignalR Calendario conectado");
            console.log("🚚 Transporte:", $.connection.hub.transport.name);
        }).fail(function (error) {
            console.error("❌ Error al conectar SignalR Calendario:", error);
        });

        // ========================================
        // 🔄 RECONNECTING
        // ========================================
        $.connection.hub.reconnecting(function () {
            console.warn("🔄 SignalR Calendario reconectando...");
        });

        // ========================================
        // 🔁 RECONNECTED — recarga silenciosa
        // ========================================
        $.connection.hub.reconnected(function () {
            console.info("✅ SignalR Calendario reconectado");
            self._recargarCalendarioMantenimientos();
            reconnectDelay = 5000;
        });

        // ========================================
        // ❌ DISCONNECTED (retry exponencial)
        // ========================================
        $.connection.hub.disconnected(function () {
            console.error("❌ SignalR Calendario desconectado");
            setTimeout(function () {
                console.warn(`🔁 Reintentando conexión en ${reconnectDelay / 1000}s...`);
                $.connection.hub.start();
                reconnectDelay = Math.min(reconnectDelay * 2, 30000);
            }, reconnectDelay);
        });
    }

    // ========================================
    // 🔁 RECARGA CENTRALIZADA (reutilizable)
    // ========================================
    _recargarCalendarioMantenimientos() {
        $('.modal.show').modal('hide');

        if (this._isReloading) return;

        this._isReloading = true;

        // 🔥 CalendarManager usa FullCalendar, no DataTable,
        // así que recargamos llamando directo a su método de carga
        this.calendarManager.cargarEventosReales()
            .finally(() => {
                this._isReloading = false;
            });
    }

    guardarEvento() {
        const equipo = $('#equipo').val();
        const tipo = $('#tipoMantenimiento').val();
        const descripcion = $('#descripcion').val();

        if (!equipo || !tipo || !descripcion) {
            AlertManager.mostrar('Por favor, complete todos los campos', 'warning');
            return;
        }

        const color = tipo === 'Preventivo' ? '#28a745' : '#dc3545';
        const className = tipo === 'Preventivo' ? 'evento-preventivo' : 'evento-correctivo';

        const nuevoEvento = {
            title: tipo + ' - ' + equipo,
            start: this.calendarManager.selectedDate,
            color: color,
            className: className,
            extendedProps: {
                equipment: equipo,
                type: tipo,
                description: descripcion,
                status: 'Programado'
            }
        };

        this.calendarManager.calendar.addEvent(nuevoEvento);
        $('#addEventModal').modal('hide');
        $('#eventForm')[0].reset();
        AlertManager.mostrar('Mantenimiento agendado correctamente para ' + new Date(this.calendarManager.selectedDate).toLocaleDateString('es-ES'), 'success');
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
        $("#MantenimientosContainer").addClass("selected");
        $("#MantenimientosContainer a").addClass("whiteText");
        $("#mantenimientos-collapse").addClass("show");
        $("#CalendarioManttoURL").addClass("selected-item");
    }
}

// ========================================
// GESTOR DE CALENDARIO
// ========================================
class CalendarManager {
    constructor(URLBase, datos_usuario) {
        this.URLBase = URLBase;
        this.datos_usuario = datos_usuario;
        this.calendarEl = document.getElementById('calendar');
        this.selectedDate = '';
        this.calendar = null;
        this._requestId = 0;
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
            dayMaxEventRows: false, // ✅ Mostrar TODOS los eventos sin límite
            dayMaxEvents: false,    // ✅ No limitar eventos por día
            events: [], // ✅ Inicialmente vacío, se carga después
            datesSet: (info) => this.actualizarTitulo(info),
            //dateClick: (info) => this.handleDateClick(info),
            eventClick: (info) => this.handleEventClick(info),
            eventClassNames: (arg) => {
                return arg.event.extendedProps.tipo === 'Preventivo'
                    ? 'evento-preventivo'
                    : 'evento-correctivo';
            },
           
            // 👇 Inicializar el tooltip
            eventDidMount: (info) => {

                const props = info.event.extendedProps;
                const estado = obtenerEstadoEvento(props);
                const badgeReprogramado = props.fueReprogramado === 'SI'
                    ? `<span>✅ Reprogramado</span>`
                    : '';

                const fmt = (f) => {
                    const iso = soloFecha(f);
                    return iso ? iso.split('-').reverse().join('/') : '';
                };

                $(info.el).tooltip({
                    html: true,
                    placement: 'top',
                    container: 'body',
                    title: `
                        <div>
                            <div style="font-size:14px; font-weight:bold; margin-bottom:6px;">
                                ℹ️ <b>Información del mantenimiento</b>
                            </div>

                            <b>Orden Trabajo:</b> ${escapeHtml(props.numero_orden)}<br>
                            <b>Equipo:</b> ${escapeHtml(props.equipment)}<br>
                            <b>Área:</b> ${escapeHtml(props.areaDescripcion)}<br>
                            <b>Línea:</b> ${escapeHtml(props.lineaDescripcion)}<br>
                            <b>Estatus:</b> ${escapeHtml(estado.texto)}<br>

                            <b>${props.tipo === 'Correctivo' ? 'Fecha:' : 'Periodo:'}</b>
                            ${(() => {
                                if (props.tipo === 'Correctivo') return escapeHtml(props.fechaInicio);
                                if (!props.enviarSiguienteMes && props.fechaRealInicio && props.fechaRealFin &&
                                    (props.estatusSolicitud === 'NA' || props.estatusSolicitud === 'Aceptada')) {
                                    return `${escapeHtml(fmt(props.fechaRealInicio))} al ${escapeHtml(fmt(props.fechaRealFin))}`;
                                }
                                if (props.enviarSiguienteMes && props.estatusSolicitud === 'Aceptada') {
                                    const fechaInicio = fechaLocal(props.fechaEventoCalculada);
                                    if (!fechaInicio) return escapeHtml(props.periodoMantenimiento);
                                    const ultimoDia = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth() + 1, 0);
                                    const fmtDate = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                                    return `${escapeHtml(fmtDate(fechaInicio))} al ${escapeHtml(fmtDate(ultimoDia))}`;
                                }
                                return escapeHtml(props.periodoMantenimiento);
                             })()}<br>

                             ${badgeReprogramado}
                        </div>
                    `
                });
            }
        });

        this.calendar.render();

        // ✅ Cargar los eventos reales desde HANA
        this.cargarEventosReales();
    }

    // ✅ Función para obtener mantenimientos completados del SP
    obtenerMantenimientosAnuales(tipoMant = null, proceso = null, lineaProd = null, Planta, fechaInicio = null, fechaFin = null, ordenTrabajo = null, clasificacion = null, equipo = null) {
       
        return new Promise((resolve, reject) => {
            // Si no se proporcionan fechas, usar el año actual
            if (!fechaInicio || !fechaFin) {
                const anioActual = new Date().getFullYear();
                fechaInicio = `${anioActual}-01-01`;
                fechaFin = `${anioActual}-12-31`;
            }

            $.ajax({
                url: `/${this.URLBase}/GetMantenimientosCompletados`,
                type: 'GET',
                data: {
                    tipoMant: tipoMant,
                    proceso: proceso,
                    lineaProd: lineaProd,
                    planta: Planta,
                    fechaInicio: fechaInicio,
                    fechaFin: fechaFin,
                    ordenTrabajo: ordenTrabajo,
                    clasificacion: clasificacion,
                    equipo: equipo
                },
                headers: {
                    'Content-Type': 'application/json'
                },
                success: function (data) {
                    if (data.Status === 'OK') {
                        let mantenimientos = data.Data;

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
                    } else if (data.Status === 'ERROR') {
                        AlertManager.mostrar('Error: ' + data.Message, 'warning');
                        reject(data.Message);
                    }

                },
                error: function (xhr, status, error) {
                    console.error('❌ Error AJAX:', error);
                    AlertManager.mostrar('Error de conexión al obtener mantenimientos.', 'warning');
                    reject(error);
                }
            });
        });
    }

    transformarEventosCalendario(datosHana) {
        const eventos = [];

        const colores = {
            'Preventivo': '#28a745',
            'Correctivo': '#dc3545'
        };

        datosHana.forEach((item) => {
            const colorEvento = colores[item.TIPO_MANTENIMIENTO] || '#6c757d';

            const parseFecha = (v) => fechaLocal(v);
            const fechaInicio = parseFecha(item.FECHA_INICIO);
            const fechaFin = parseFecha(item.FECHA_FIN);
            const fechaCompletado = parseFecha(item.FECHA_COMPLETADO || item.HORA_APERTURA) || new Date();

            // ✅ LÓGICA DE FECHA DEL EVENTO
            let fechaEvento;
            let fechaFinEvento;

            const tieneFechasReales = item.FECHA_REAL_INICIO && item.FECHA_REAL_FIN;
            const enviarSiguienteMes = item.ENVIAR_SIGUIENTE_MES;
            const estatusSolicitud = item.ESTATUS_SOLICITUD;

            if (!enviarSiguienteMes && tieneFechasReales && (estatusSolicitud === 'NA' || estatusSolicitud === 'Aceptada')) {
                // ✅ Tiene fechas reales y no es siguiente mes → pintar desde FECHA_REAL_INICIO hasta FECHA_REAL_FIN
                fechaEvento = soloFecha(item.FECHA_REAL_INICIO);
                // 🔥 FullCalendar trata end como EXCLUSIVO: sumar 1 día
                fechaFinEvento = sumarDiasISO(soloFecha(item.FECHA_REAL_FIN), 1);
            } else if (enviarSiguienteMes && estatusSolicitud === 'Aceptada') {
                // ✅ Enviar siguiente mes y fue aceptada → pintar desde primer día hasta último día del mes siguiente
                const hoy = fechaInicio || fechaCompletado;
                const primerDiaSiguienteMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);
                const ultimoDiaSiguienteMes = new Date(hoy.getFullYear(), hoy.getMonth() + 2, 0);
                fechaEvento = soloFecha(primerDiaSiguienteMes);
                fechaFinEvento = sumarDiasISO(soloFecha(ultimoDiaSiguienteMes), 1);
            } else {
                // ✅ null, Rechazada, Pendiente o sin solicitud → usar fecha completado (solo un día)
                fechaEvento = soloFecha(fechaCompletado);
                // Para eventos de un solo día, FullCalendar necesita que end sea el día siguiente
                fechaFinEvento = sumarDiasISO(fechaEvento, 1);
            }

            const evento = {
                id: `${item.TIPO_MANTENIMIENTO === 'Preventivo' ? 'P' : 'C'}-${item.ID_MANTENIMIENTO}`,
                title: `${item.TIPO_MANTENIMIENTO} - ${item.NOMBRE_EQUIPO}`,
                start: fechaEvento,
                end: fechaFinEvento,  // ✅ Ya incluye +1 día para FullCalendar
                allDay: true,
                color: colorEvento,
                extendedProps: {
                    id_mantenimiento: item.ID_MANTENIMIENTO,
                    numero_orden: item.NUMERO_ORDEN,
                    id_equipo: item.ID_EQUIPO,
                    equipment: item.NOMBRE_EQUIPO,
                    description: item.DESCRIPCION_EQUIPO,
                    area: item.AREA,
                    areaDescripcion: item.AREA_DESCRIPCION,
                    line: item.LINEA_PRODUCCION,
                    lineaDescripcion: item.LINEA_DESCRIPCION,
                    type: item.TIPO_MANTENIMIENTO,
                    tipo: item.TIPO_MANTENIMIENTO,
                    fechaInicio: (fechaInicio || fechaCompletado).toLocaleDateString('es-ES'),
                    fechaFin: (fechaFin || fechaCompletado).toLocaleDateString('es-ES'),
                    fechaCompletado: fechaCompletado.toLocaleDateString('es-ES'),
                    periodoMantenimiento: (fechaInicio && fechaFin)
                        ? `${fechaInicio.toLocaleDateString('es-ES')} al ${fechaFin.toLocaleDateString('es-ES')}`
                        : '',
                    id_status: item.ID_ESTATUS,
                    status: item.ESTATUS,
                    orden_trabajo_finalizada: item.ORDEN_TRABAJO_FINALIZADA,
                    solicitante: item.SOLICITANTE || 'No especificado',
                    ubicacion_tecnica: item.UBICACION_TECNICA || 'No especificada',
                    duracion_hrs: item.DURACION_HRS || 0,
                    texto_corto: item.TEXTO_CORTO || '',
                    texto_secuencia: item.TEXTO_SECUENCIA || '',
                    tecnicos_ids: item.TECNICOS_ASIGNADOS_IDS || '',
                    tecnicos_nombres: item.TECNICOS_ASIGNADOS_NOMBRES || 'No asignados',
                    estatusSolicitud: item.ESTATUS_SOLICITUD,
                    fechaRealInicio: item.FECHA_REAL_INICIO,
                    fechaRealFin: item.FECHA_REAL_FIN,
                    enviarSiguienteMes: item.ENVIAR_SIGUIENTE_MES,
                    fechaEventoCalculada: fechaEvento,
                    fueReprogramado: item.FUE_REPROGRAMADO,
                }
            };

            eventos.push(evento);
        });

        return eventos;
    }

    // ✅ Cargar eventos reales desde HANA
    async cargarEventosReales(tipoMant = null, proceso = null, lineaProd = null, fechaInicio = null, fechaFin = null, ordenTrabajo = null, clasificacion = null, equipo = null) {
        // ✅ Mostrar loader
        GlobalUtil.mostrarLoader(true);
        const requestId = ++this._requestId;

        try { 
            const datosHana = await this.obtenerMantenimientosAnuales(tipoMant, proceso, lineaProd, this.datos_usuario[0].PLANTA, fechaInicio, fechaFin, ordenTrabajo, clasificacion, equipo);

            // Si llegó una respuesta vieja, no pisar la más reciente
            if (requestId !== this._requestId) return;

            if (datosHana && datosHana.length > 0) {
                const eventosCalendario = this.transformarEventosCalendario(datosHana);

                // Limpiar eventos actuales del calendario
                this.calendar.removeAllEvents();

                // Agregar todos los eventos al calendario
                eventosCalendario.forEach((evento) => {
                    this.calendar.addEvent(evento);
                });

                console.log('✅ Eventos cargados:', eventosCalendario.length);
            } else {
                this.calendar.removeAllEvents();
                AlertManager.mostrar('No hay mantenimientos en el período seleccionado', 'info');
            }

        } catch (error) {
            if (requestId !== this._requestId) return;
            console.error('❌ Error al cargar mantenimientos:', error);
            AlertManager.mostrar('Error al cargar el calendario de mantenimientos', 'warning');
        } finally {
            // ✅ Ocultar loader solo si esta sigue siendo la petición más reciente
            if (requestId === this._requestId) {
                GlobalUtil.mostrarLoader(false);
            }
        }
    }

    // ✅ Aplicar filtros
    aplicarFiltros() {
        const tipoMant = $('#FiltroTipoMantenimiento').val();
        const proceso = $('#FiltroArea').val();
        const lineaProd = $('#FiltroLineaProduccion').val();
        const fechaInicio = $('#FiltroFechaInicio').val();
        const fechaFin = $('#FiltroFechaFin').val();
        const ordenTrabajo = $('#FiltroOrdenTrabajo').val();
        const clasificacion = $('#FiltroClasificacion').val();
        const equipo = $('#FiltroNombreEquipo').val();

        if (fechaInicio && fechaFin && new Date(fechaInicio) > new Date(fechaFin)) {
            AlertManager.mostrar('La fecha inicio no puede ser mayor a la fecha fin.', 'warning');
            return;
        }

        // Siempre recargar desde el servidor; si no hay fechas, el endpoint usa el año actual
        this.cargarEventosReales(
            tipoMant,
            proceso,
            lineaProd,
            fechaInicio,
            fechaFin,
            ordenTrabajo,
            clasificacion,
            equipo
        );
    }

    // ✅ Limpiar filtros
    limpiarFiltros() {
        $('#FiltroTipoMantenimiento').val('');
        $('#FiltroArea').val('');
        $('#FiltroLineaProduccion').val('');
        $('#FiltroFechaInicio').val('');
        $('#FiltroFechaFin').val('');
        $('#FiltroOrdenTrabajo').val('');
        $('#FiltroClasificacion').val('');
        $('#FiltroNombreEquipo').val('');

        // Recargar eventos del año actual
        this.cargarEventosReales();
    }

    // ✅ Actualizar título del calendario
    actualizarTitulo(info) {
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

    // ✅ Manejar click en evento del calendario
    handleEventClick(info) {
        const event = info.event;
        const props = event.extendedProps;

        // Título del modal (el equipo viene de BD: escapar)
        $('#modalTitle').html(
            '<i class="bi bi-info-circle-fill me-2"></i>' +
            escapeHtml(`${props.type} - ${props.equipment}`)
        );

        // Información General
        $('#modalNumeroOrden').text(props.numero_orden);

        // ✅ Badge de tipo con color dinámico
        const badgeColorTipo = props.tipo === 'Preventivo' ? 'bg-success' : 'bg-danger';
        $('#modalType').removeClass('bg-info bg-success bg-danger').addClass(badgeColorTipo).text(props.type);

        const estado = obtenerEstadoEvento(props);
        $('#modalStatus')
            .removeClass('bg-success bg-warning bg-danger bg-primary bg-secondary bg-dark')
            .text(estado.texto)
            .addClass(estado.clase);

        $('#modalSolicitante').text(props.solicitante);

        // Información del Equipo
        $('#modalEquipment').text(props.equipment);
        $('#modalDescription').text(props.description);
        $('#modalLine').text(props.lineaDescripcion || 'No especificada');
        $('#modalArea').text(props.areaDescripcion || 'No especificada');
        $('#modalUbicacionTecnica').text(props.ubicacion_tecnica);

        // Fechas y Duración
        $('#modalFechaCompletado').text(props.fechaCompletado);

        const fmt = (f) => {
            const iso = soloFecha(f);
            return iso ? iso.split('-').reverse().join('/') : '';
        };
        let periodoMostrar = props.periodoMantenimiento;

        if (props.tipo === 'Correctivo') {
            periodoMostrar = 'N/A';
        } else if (!props.enviarSiguienteMes && props.fechaRealInicio && props.fechaRealFin &&
            (props.estatusSolicitud === 'NA' || props.estatusSolicitud === 'Aceptada')) {
            periodoMostrar = `${fmt(props.fechaRealInicio)} al ${fmt(props.fechaRealFin)}`;
        } else if (props.enviarSiguienteMes && props.estatusSolicitud === 'Aceptada') {
            const fechaInicio = fechaLocal(props.fechaEventoCalculada);
            if (fechaInicio) {
                const ultimoDia = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth() + 1, 0);
                const fmtDate = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                periodoMostrar = `${fmtDate(fechaInicio)} al ${fmtDate(ultimoDia)}`;
            }
        }

        $('#modalPeriodoMantenimiento').text(periodoMostrar);


        $('#modalDuracion').text(props.duracion_hrs + ' hrs');

        // Técnicos Asignados
        $('#modalTecnicos').text(props.tecnicos_nombres);

        // ✅ Observaciones - Mostrar según el tipo de mantenimiento
        const tieneTextoSecuencia = props.texto_secuencia && props.texto_secuencia.trim() !== '';
        const tieneTextoCorto = props.texto_corto && props.texto_corto.trim() !== '';
        const esCorrectivo = props.tipo === 'Correctivo';

        // Solo mostrar la sección si hay información relevante
        if (tieneTextoSecuencia || (esCorrectivo && tieneTextoCorto)) {
            $('#seccionObservaciones').show();

            // Texto Corto - SOLO para Correctivos
            if (esCorrectivo && tieneTextoCorto) {
                $('#contenedorTextoCorto').show();
                $('#modalTextoCorto').text(props.texto_corto);
            } else {
                $('#contenedorTextoCorto').hide();
            }

            // Texto Secuencia - Para ambos tipos
            if (tieneTextoSecuencia) {
                $('#contenedorTextoSecuencia').show();
                $('#modalTextoSecuencia').text(props.texto_secuencia);
            } else {
                $('#contenedorTextoSecuencia').hide();
            }
        } else {
            $('#seccionObservaciones').hide();
        }

        $('#eventModal').modal('show');
        info.jsEvent.preventDefault();
    }
}