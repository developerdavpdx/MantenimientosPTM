// ========================================
// GESTION DE EVENTOS
// ========================================
class GestionEventosApp {
    constructor() {
        this.URLBase = "Calendario";
        this.datos_usuario = GlobalUtil.getDatosUsuario(); // ✅ Variable local
        this.calendarManager = new CalendarManager(this.URLBase, this.datos_usuario);
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

        $('#FiltroLineaProduccion, #FiltroTipoMantenimiento, #FiltroFechaInicio, #FiltroFechaFin')
            .off('change')
            .on('change', () => {
                this.calendarManager.aplicarFiltros();
            });

        // Cargar líneas de producción únicas para el filtro (se cargará después de obtener datos)

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
        // ✅ Cargar líneas de producción para el filtro
        EquiposUtil.llenarProcesos(this.datos_usuario[0].PLANTA, null, "FiltroArea");
        console.log('✅ Sistema Completo de Gestión de Eventos inicializado correctamente');
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
        this.todosLosEventos = []; // Guardar todos los eventos para filtrado
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
            dateClick: (info) => this.handleDateClick(info),
            eventClick: (info) => this.handleEventClick(info),
            eventClassNames: (arg) => {
                return arg.event.extendedProps.tipo === 'Preventivo'
                    ? 'evento-preventivo'
                    : 'evento-correctivo';
            },
           
            // 👇 Inicializar el tooltip
            eventDidMount: (info) => {

                //Se obtiene el estatus para mostrarlo en el tooltip
                const keyTooltip = `${info.event.extendedProps.orden_trabajo_finalizada}-${info.event.extendedProps.id_status}`;

                const tiposMap = {
                    'NO-2': 'Liberado',
                    'NO-3': 'En espera de refacción',
                    'NO-4': 'En proceso de firmas',
                    'SI-4': 'Terminado'
                };
                const badgeReprogramado = info.event.extendedProps.fueReprogramado === 'SI'
                    ? `<span>✅ Reprogramado</span>`  // badge verde
                    : '';   

                $(info.el).tooltip({
                    html: true,
                    placement: 'top',
                    container: 'body',
                    title: `
                        <div>
                            <div style="font-size:14px; font-weight:bold; margin-bottom:6px;">
                                ℹ️ <b>Información del mantenimiento</b>
                            </div>

                            <b>Equipo:</b> ${info.event.extendedProps.equipment}<br>
                            <b>Área:</b> ${info.event.extendedProps.areaDescripcion}<br>
                            <b>Línea:</b> ${info.event.extendedProps.lineaDescripcion}<br>
                            <b>Estatus:</b> ${tiposMap[keyTooltip] || 'Sin estatus'}<br>

                            <b>${info.event.extendedProps.tipo === 'Correctivo' ? 'Fecha:' : 'Periodo:'}</b>
                            ${(() => {
                                const p = info.event.extendedProps;
                                const fmt = (f) => f ? f.substring(0, 10).split('-').reverse().join('/') : '';
                                if (p.tipo === 'Correctivo') return p.fechaInicio;
                                if (!p.enviarSiguienteMes && p.fechaRealInicio && p.fechaRealFin &&
                                    (p.estatusSolicitud === 'NA' || p.estatusSolicitud === 'Aceptada')) {
                                    return `${fmt(p.fechaRealInicio)} al ${fmt(p.fechaRealFin)}`;
                                }
                                if (p.enviarSiguienteMes && p.estatusSolicitud === 'Aceptada') {
                                    const fechaInicio = new Date(p.fechaEventoCalculada + 'T00:00:00');
                                    const ultimoDia = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth() + 1, 0);
                                    const fmtDate = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                                    return `${fmtDate(fechaInicio)} al ${fmtDate(ultimoDia)}`;
                                }
                                return p.periodoMantenimiento;
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
    obtenerMantenimientosAnuales(tipoMant = null, proceso = null, lineaProd = null, Planta, fechaInicio = null, fechaFin = null) {
       
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
                    fechaFin: fechaFin
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

    // ✅ Función para transformar datos de HANA a formato FullCalendar
    transformarEventosCalendario(datosHana) {
        // const eventos = [];

        // // 🎨 Colores según tipo de mantenimiento
        // const colores = {
        //     'Preventivo': '#28a745',  // Verde
        //     'Correctivo': '#dc3545'   // Rojo
        // };

        // datosHana.forEach((item) => {
        //     // Determinar color según tipo
        //     const colorEvento = colores[item.TIPO_MANTENIMIENTO] || '#6c757d';

        //     // Formatear fechas - con fallback: FECHA_COMPLETADO → HORA_APERTURA → fecha actual
        //     const fechaInicio = new Date(item.FECHA_INICIO);
        //     const fechaFin = new Date(item.FECHA_FIN);
        //     const fechaCompletado = new Date(item.FECHA_COMPLETADO || item.HORA_APERTURA || new Date());

        //     // ✅ SOLO pintar el día que fue completado (no rango)
        //     const fechaCompletadoStr = fechaCompletado.toISOString().split('T')[0];

        //     const evento = {
        //         id: item.ID_MANTENIMIENTO,
        //         title: `${item.TIPO_MANTENIMIENTO} - ${item.NOMBRE_EQUIPO}`,
        //         start: fechaCompletadoStr,  // ✅ Solo fecha completado
        //         allDay: true,                // ✅ Evento de día completo
        //         color: colorEvento,
        //         extendedProps: {
        //             id_mantenimiento: item.ID_MANTENIMIENTO,
        //             numero_orden: item.NUMERO_ORDEN,
        //             id_equipo: item.ID_EQUIPO,
        //             equipment: item.NOMBRE_EQUIPO,
        //             description: item.DESCRIPCION_EQUIPO,
        //             area: item.AREA,
        //             areaDescripcion: item.AREA_DESCRIPCION,
        //             line: item.LINEA_PRODUCCION,
        //             lineaDescripcion: item.LINEA_DESCRIPCION,
        //             type: item.TIPO_MANTENIMIENTO,
        //             tipo: item.TIPO_MANTENIMIENTO,
        //             fechaInicio: fechaInicio.toLocaleDateString('es-ES'),
        //             fechaFin: fechaFin.toLocaleDateString('es-ES'),
        //             fechaCompletado: fechaCompletado.toLocaleDateString('es-ES'),
        //             periodoMantenimiento: `${fechaInicio.toLocaleDateString('es-ES')} al ${fechaFin.toLocaleDateString('es-ES')}`,
        //             id_status: item.ID_ESTATUS,
        //             status: item.ESTATUS,
        //             orden_trabajo_finalizada: item.ORDEN_TRABAJO_FINALIZADA,
        //             solicitante: item.SOLICITANTE || 'No especificado',
        //             ubicacion_tecnica: item.UBICACION_TECNICA || 'No especificada',
        //             duracion_hrs: item.DURACION_HRS || 0,
        //             texto_corto: item.TEXTO_CORTO || '',
        //             texto_secuencia: item.TEXTO_SECUENCIA || '',
        //             tecnicos_ids: item.TECNICOS_ASIGNADOS_IDS || '',
        //             tecnicos_nombres: item.TECNICOS_ASIGNADOS_NOMBRES || 'No asignados'
        //         }
        //     };

        //     eventos.push(evento);
        // });

        // return eventos;
        const eventos = [];

        const colores = {
            'Preventivo': '#28a745',
            'Correctivo': '#dc3545'
        };

        datosHana.forEach((item) => {
            const colorEvento = colores[item.TIPO_MANTENIMIENTO] || '#6c757d';

            // const fechaInicio = new Date(item.FECHA_INICIO);
            // const fechaFin = new Date(item.FECHA_FIN);
            // const fechaCompletado = new Date(item.FECHA_COMPLETADO || item.HORA_APERTURA || new Date());

            const parseFecha = (v) => v ? new Date(v) : null;
            const fechaInicio = parseFecha(item.FECHA_INICIO);
            const fechaFin = parseFecha(item.FECHA_FIN);
            const fechaCompletado = parseFecha(item.FECHA_COMPLETADO || item.HORA_APERTURA) || new Date();

            // ✅ LÓGICA DE FECHA DEL EVENTO
            let fechaEvento;

            const tieneFechasReales = item.FECHA_REAL_INICIO && item.FECHA_REAL_FIN;
            const enviarSiguienteMes = item.ENVIAR_SIGUIENTE_MES;
            const estatusSolicitud = item.ESTATUS_SOLICITUD;

            if (!enviarSiguienteMes && tieneFechasReales && (estatusSolicitud === 'NA' || estatusSolicitud === 'Aceptada')) {
                // ✅ Tiene fechas reales y no es siguiente mes → pintar en FECHA_REAL_INICIO
                fechaEvento = new Date(item.FECHA_REAL_INICIO).toISOString().split('T')[0];
            } else if (enviarSiguienteMes && estatusSolicitud === 'Aceptada') {
                // ✅ Enviar siguiente mes y fue aceptada → primer día del mes siguiente
                //const hoy = new Date(item.FECHA_INICIO);
                const hoy = fechaInicio || fechaCompletado; 
                const primerDiaSiguienteMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);
                fechaEvento = primerDiaSiguienteMes.toISOString().split('T')[0];
            } else {
                // ✅ null, Rechazada, Pendiente o sin solicitud → fecha completado actual
                fechaEvento = fechaCompletado.toISOString().split('T')[0];
            }

            const evento = {
                id: item.ID_MANTENIMIENTO,
                title: `${item.TIPO_MANTENIMIENTO} - ${item.NOMBRE_EQUIPO}`,
                start: fechaEvento,
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
                    // fechaInicio: (fechaInicio || fechaCompletado).toLocaleDateString('es-ES'),
                    // fechaFin: fechaFin.toLocaleDateString('es-ES'),
                    // fechaCompletado: fechaCompletado.toLocaleDateString('es-ES'),
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
    async cargarEventosReales(tipoMant = null, proceso = null, lineaProd = null, fechaInicio = null, fechaFin = null) {
        // ✅ Mostrar loader
        GlobalUtil.mostrarLoader(true);

        try { 
            const datosHana = await this.obtenerMantenimientosAnuales(tipoMant, proceso, lineaProd, this.datos_usuario[0].PLANTA,fechaInicio, fechaFin);

            if (datosHana && datosHana.length > 0) {
                const eventosCalendario = this.transformarEventosCalendario(datosHana);

                // Guardar todos los eventos para filtrado
                this.todosLosEventos = eventosCalendario;

                // Limpiar eventos actuales del calendario
                this.calendar.removeAllEvents();

                // Agregar todos los eventos al calendario
                eventosCalendario.forEach((evento) => {
                    this.calendar.addEvent(evento);
                });

                AlertManager.mostrar(
                    `Se cargaron ${eventosCalendario.length} mantenimientos`,
                    'success'
                );
                console.log('✅ Eventos cargados:', eventosCalendario.length);
            } else {
                this.todosLosEventos = [];
                this.calendar.removeAllEvents();
                AlertManager.mostrar('No hay mantenimientos en el período seleccionado', 'info');
            }

           

        } catch (error) {
            console.error('❌ Error al cargar mantenimientos:', error);
            AlertManager.mostrar('Error al cargar el calendario de mantenimientos', 'warning');
        } finally {
            // ✅ Ocultar loader siempre (éxito o error)
            GlobalUtil.mostrarLoader(false);
        }
    }

    // ✅ Aplicar filtros
    aplicarFiltros() {
        const tipoMant = $('#FiltroTipoMantenimiento').val();
        const proceso = $('#FiltroArea').val();
        const lineaProd = $('#FiltroLineaProduccion').val();
        const fechaInicio = $('#FiltroFechaInicio').val();
        const fechaFin = $('#FiltroFechaFin').val();

        //this.cargarEventosReales(tipoMant, proceso, lineaProd, fechaInicio, fechaFin);

        // Si hay filtros de fecha, recargar desde el servidor
        if (fechaInicio && fechaFin) {
            this.cargarEventosReales(tipoMant, proceso, lineaProd, fechaInicio, fechaFin);
            return;
        }

        // Si hay otros filtros sin fecha, igual recargar desde servidor
        if (tipoMant || proceso || lineaProd) {
            this.cargarEventosReales(tipoMant, proceso, lineaProd, null, null);
            return;
        }

        // Filtrar eventos localmente
        // let eventosFiltrados = [...this.todosLosEventos];

        // if (tipoMant) {
        //     eventosFiltrados = eventosFiltrados.filter(e =>
        //         e.extendedProps.tipo === tipoMant
        //     );
        // }

        // if (lineaProd) {
        //     eventosFiltrados = eventosFiltrados.filter(e =>
        //         e.extendedProps.line === lineaProd
        //     );
        // }

        // Si no hay ningún filtro, cargar todo (año actual por default)
        this.cargarEventosReales(null, null, null, null, null);

        // Actualizar calendario
        // this.calendar.removeAllEvents();
        // eventosFiltrados.forEach(evento => {
        //     this.calendar.addEvent(evento);
        // });

        // AlertManager.mostrar(
        //     `Filtros aplicados: ${eventosFiltrados.length} mantenimientos encontrados`,
        //     'info'
        // );
    }

    // ✅ Limpiar filtros
    limpiarFiltros() {
        $('#FiltroTipoMantenimiento').val('');
        $('#FiltroArea').val('');
        $('#FiltroLineaProduccion').val('');
        $('#FiltroFechaInicio').val('');
        $('#FiltroFechaFin').val('');

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

        // Título del modal
        $('#modalTitle').html(`
        <i class="bi bi-info-circle-fill me-2"></i>
        ${props.type} - ${props.equipment}
    `);

        // Información General
        $('#modalNumeroOrden').text(props.numero_orden);

        // ✅ Badge de tipo con color dinámico
        const badgeColorTipo = props.tipo === 'Preventivo' ? 'bg-success' : 'bg-danger';
        $('#modalType').removeClass('bg-info bg-success bg-danger').addClass(badgeColorTipo).text(props.type);

        const colorMap = {
            'NO-2': 'bg-primary',   // Liberado
            'NO-3': 'bg-warning',    // En espera de refacción
            'NO-4': 'bg-dark',   // En proceso de firmas
            'SI-4': 'bg-success'    // Terminado
        };

        const tiposMap = {
            'NO-2': 'Liberado',
            'NO-3': 'En espera de refacción',  
            'NO-4': 'En proceso de firmas',
            'SI-4': 'Terminado'
        };

        const key = `${props.orden_trabajo_finalizada}-${props.id_status}`;


        $('#modalStatus')
            .removeClass('bg-success bg-warning bg-danger bg-primary bg-secondary bg-dark')
            .text(tiposMap[key] || 'Sin estatus')
            .addClass(colorMap[key] || 'bg-secondary');

        $('#modalSolicitante').text(props.solicitante);

        // Información del Equipo
        $('#modalEquipment').text(props.equipment);
        $('#modalDescription').text(props.description);
        $('#modalLine').text(props.lineaDescripcion || 'No especificada');
        $('#modalArea').text(props.areaDescripcion || 'No especificada');
        $('#modalUbicacionTecnica').text(props.ubicacion_tecnica);

        // Fechas y Duración
        $('#modalFechaCompletado').text(props.fechaCompletado);

        const fmt = (f) => f ? f.substring(0, 10).split('-').reverse().join('/') : '';
        let periodoMostrar = props.periodoMantenimiento;

        if (props.tipo === 'Correctivo') {
            periodoMostrar = 'N/A';
        } else if (!props.enviarSiguienteMes && props.fechaRealInicio && props.fechaRealFin &&
            (props.estatusSolicitud === 'NA' || props.estatusSolicitud === 'Aceptada')) {
            periodoMostrar = `${fmt(props.fechaRealInicio)} al ${fmt(props.fechaRealFin)}`;
        } else if (props.enviarSiguienteMes && props.estatusSolicitud === 'Aceptada') {
            const fechaInicio = new Date(props.fechaEventoCalculada + 'T00:00:00');
            const ultimoDia = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth() + 1, 0);
            const fmtDate = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
            periodoMostrar = `${fmtDate(fechaInicio)} al ${fmtDate(ultimoDia)}`;
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