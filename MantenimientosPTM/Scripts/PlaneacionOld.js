// ========================================
// GESTION DE EVENTOS
// ========================================
class GestionEventosApp {
    constructor() {
        this.URLBase = "Planeacion";
        this.calendarManager = new PlaneacionManager(this.URLBase);
    }

    inicializar() {
        // Inicializar UI
        UIManager.inicializarUI();

        // Inicializar el calendario
        this.calendarManager.inicializar();

        // Configurar evento para guardar nuevo mantenimiento
        $('#btnGuardarEvento').on('click', (e) => this.calendarManager.guardarPlan(e));

        $('#btnGenerarParo').on('click', (e) => this.calendarManager.guardarParo(e));

        // Configurar evento para guardar nuevo mantenimiento
        $('#AgregarPlan').on('click', (e) => this.calendarManager.abrirModalAgregarPlan(e));

        // Configurar evento para registrar nuevo paro
        $('#RegistrarParo').on('click', (e) => this.calendarManager.abrirModalRegistrarParo(e));

        // ✅ SOLO UN EVENTO - Interceptar el submit del formulario
        $('#formFiltrosOrdenes').on('submit', function (e) {
            e.preventDefault();

            // ✅ Mostrar loader
            GlobalUtil.mostrarLoader(true);

            // Recargar tabla
            $('#tablaPlaneacion').DataTable().ajax.reload(function () {
                // ✅ Ocultar loader cuando termine
                GlobalUtil.mostrarLoader(false);
            }, false); // false = mantener la página actual
        });

        // ✅ Limpiar filtros
        $('#btnLimpiarFiltros').on('click', function () {
            $('#formFiltrosOrdenes')[0].reset();

            // ✅ Mostrar loader
            GlobalUtil.mostrarLoader(true);

            // Recargar tabla
            $('#tablaPlaneacion').DataTable().ajax.reload(function () {
                // ✅ Ocultar loader cuando termine
                GlobalUtil.mostrarLoader(false);
            }, true); // true = volver a la primera página
        });

        console.log('✅ Sistema Completo de Gestión de Eventos Planeación inicializado correctamente');
    }
}

// ========================================
// INICIALIZACIÓN
// ========================================
$(document).ready(function () {
    const app = new GestionEventosApp();
    app.inicializar();
});

// ========================================
// GESTOR DE UI
// ========================================
class UIManager {
    static inicializarUI() {
        // Configuración inicial de navegación
        $("#PlaneacionURL").addClass("selected");
        $("#PlaneacionURL a").addClass("whiteText");

        const TopScrool = new TopScrollTable("tablaPlaneacion", "tablaPlaneacionContainer", "TblPlaneacionScrool");
        TopScrool.createScroll();
        TopScrool.initScroll();
    }
}

// ========================================
// GESTOR DE CALENDARIO
// ========================================
class PlaneacionManager {
    constructor(URLBase) {
        this.datos_usuario = GlobalUtil.getDatosUsuario(); // ✅ Variable local
        this.PLANTA = this.datos_usuario[0].PLANTA;
        this.URLBase = URLBase;
        this.calendarEl = document.getElementById('calendar');
        this.selectedDate = '';
        this.calendar = null;
        this.todosLosEventos = []; // Guardar todos los eventos para filtrado
        EquiposUtil.llenarLineas(this.PLANTA, "PlanLinea", "ParoLinea");
        EquiposUtil.llenarRangoDias();
    }

    // ✅ Función para inicializar el calendario
    inicializar() {
        this.llenarTablaOrdenesFabricacion();
        console.log('✅ Planeación inicializado correctamente');
    }
    //Listado de planeacion
    llenarTablaOrdenesFabricacion() {
        try {
            // ✅ Destruir DataTable si ya existe
            if ($.fn.DataTable.isDataTable('#tablaPlaneacion')) {
                $('#tablaPlaneacion').DataTable().destroy();
            }

            // Inicializar DataTable con server-side processing
            const table = $('#tablaPlaneacion').DataTable({
                processing: false,
                serverSide: true,
                bDestroy: true,
                searching: true,
                ordering: false,  // ✅ Agregar esta línea
                ajax: {
                    url: `/${this.URLBase}/obtenerOrdenesFabricacion`,
                    type: "POST",
                    dataType: "json",
                    data: (d) => {
                        return $.extend({}, d, {
                            "FiltroDocEntry": $("#FiltroDocEntry").val() || null,
                            "FiltroDocNum": $("#FiltroDocNum").val() || null,
                            "FiltroItemCode": $("#FiltroItemCode").val() || null,
                            "FiltroWarehouse": $("#FiltroWarehouse").val() || null,
                            "FiltroStatus": $("#FiltroStatus").val() || null,
                            "FiltroFechaInicio": $("#FiltroFechaInicio").val() || null,
                            "FiltroFechaFin": $("#FiltroFechaFin").val() || null,
                            "FiltroSerie": $("#FiltroSerie").val() || null,
                            "FiltroPrioridad": $("#FiltroPrioridad").val() || null
                        });
                    },
                    dataSrc: function (json) {
                        return json.data;
                    }
                },
                columns: [
                    // ✅ Columna 0: N° Documento
                    {
                        data: "DOC_NUM",
                        className: "text-center",
                        render: (data) => `<strong class="text-primary">${data}</strong>`
                    },
                    // ✅ Columna 1: Estado
                    {
                        data: "STATUS_DESC",
                        className: "text-center",
                        render: (data, type, row) => {
                            let badgeClass = 'bg-secondary';
                            switch (row.STATUS) {
                                case 'P': badgeClass = 'bg-warning'; break;
                                case 'R': badgeClass = 'bg-info'; break;
                                case 'C': badgeClass = 'bg-success'; break;
                                case 'L': badgeClass = 'bg-danger'; break;
                            }
                            return `<span class="badge ${badgeClass}">${data}</span>`;
                        }
                    },
                    // ✅ Columna 2: Código Artículo
                    {
                        data: "ITEM_CODE",
                        className: "text-center",
                        render: (data) => data || 'N/A'
                    },
                    // ✅ Columna 3: Descripción
                    {
                        data: "ITEM_NAME",
                        render: (data) => {
                            if (!data) return 'N/A';
                            const nombreCorto = data.length > 40 ? data.substring(0, 40) + '...' : data;
                            return `<span data-bs-toggle="tooltip" title="${data}">${nombreCorto}</span>`;
                        }
                    },
                    // ✅ Columna 4: Cantidad Planeada
                    {
                        data: "CANTIDAD_PLANEADA",
                        className: "text-end",
                        render: (data, type, row) => {
                            const valor = parseFloat(data) || 0;
                            return `${valor.toLocaleString('es-MX', { minimumFractionDigits: 2 })} ${row.UNIDAD_MEDIDA || ''}`;
                        }
                    },
                    // ✅ Columna 5: Cantidad Completada
                    {
                        data: "CANTIDAD_COMPLETADA",
                        className: "text-end",
                        render: (data, type, row) => {
                            const valor = parseFloat(data) || 0;
                            return `<strong class="text-success">${valor.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong> ${row.UNIDAD_MEDIDA || ''}`;
                        }
                    },
                    // ✅ Columna 6: Cantidad Pendiente
                    {
                        data: "CANTIDAD_PENDIENTE",
                        className: "text-end",
                        render: (data, type, row) => {
                            const valor = parseFloat(data) || 0;
                            const colorClass = valor > 0 ? 'text-warning' : 'text-muted';
                            return `<strong class="${colorClass}">${valor.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong> ${row.UNIDAD_MEDIDA || ''}`;
                        }
                    },
                    // ✅ Columna 7: % Completado
                    {
                        data: "PORCENTAJE_COMPLETADO",
                        className: "text-center",
                        render: (data) => {
                            const porcentaje = parseFloat(data) || 0;
                            let progressClass = 'bg-danger';
                            if (porcentaje >= 90) progressClass = 'bg-success';
                            else if (porcentaje >= 50) progressClass = 'bg-warning';

                            return `
                            <div class="progress" style="height: 20px;">
                                <div class="progress-bar ${progressClass}" role="progressbar" 
                                    style="width: ${porcentaje}%" 
                                    aria-valuenow="${porcentaje}" aria-valuemin="0" aria-valuemax="100">
                                    ${porcentaje.toFixed(1)}%
                                </div>
                            </div>
                        `;
                        }
                    },
                    // ✅ Columna 8: Almacén
                    {
                        data: "ALMACEN_NOMBRE",
                        className: "text-center",
                        render: (data, type, row) => {
                            return `<span data-bs-toggle="tooltip" title="${data || 'N/A'}">${row.ALMACEN || 'N/A'}</span>`;
                        }
                    },
                    // ✅ Columna 9: Fecha Vencimiento
                    {
                        data: "FECHA_VENCIMIENTO",
                        className: "text-center",
                        render: (data) => data || 'N/A'
                    },
                    // ✅ Columna 10: Prioridad
                    {
                        data: "PRIORIDAD_DESC",
                        className: "text-center",
                        render: (data, type, row) => {
                            let badgeClass = 'bg-secondary';
                            switch (row.PRIORIDAD) {
                                case 0: badgeClass = 'bg-secondary'; break;
                                case 1: badgeClass = 'bg-info'; break;
                                case 2: badgeClass = 'bg-danger'; break;
                            }
                            return `<span class="badge ${badgeClass}">${data}</span>`;
                        }
                    }
                    // ✅ Columna 11: Acciones
                    //{
                    //    data: null,
                    //    orderable: false,
                    //    className: "text-center",
                    //    render: (data, type, row) => {
                    //        const docEntry = row.DOC_ENTRY || '';
                    //        const docNum = row.DOC_NUM || '';
                    //        const itemCode = row.ITEM_CODE || '';
                    //        const status = row.STATUS || '';

                    //        // Solo mostrar botón de ver detalle
                    //        let btnVerDetalle = `
                    //        <button class="btn btn-sm btn-info btn-ver-detalle"
                    //            data-bs-toggle="tooltip" title="Ver Detalle"
                    //            data-docentry="${docEntry}"
                    //            data-docnum="${docNum}"
                    //            data-itemcode="${itemCode}"
                    //            data-status="${status}">
                    //            <i class="bi bi-eye"></i>
                    //        </button>
                    //    `;

                    //        // Opcional: botón para editar solo si está Planeada o Liberada
                    //        let btnEditar = '';
                    //        if (status === 'P' || status === 'R') {
                    //            btnEditar = `
                    //            <button class="btn btn-sm btn-warning btn-editar"
                    //                data-bs-toggle="tooltip" title="Editar"
                    //                data-docentry="${docEntry}">
                    //                <i class="bi bi-pencil"></i>
                    //            </button>
                    //        `;
                    //        }

                    //        return `
                    //        <div class="btn-group" role="group">
                    //            ${btnVerDetalle}
                    //            ${btnEditar}
                    //        </div>
                    //    `;
                    //    }
                    //}
                ],
                columnDefs: [
                    { width: '80px', targets: 0 },      // N° Doc
                    { width: '100px', targets: 1 },     // Estado
                    { width: '120px', targets: 2 },     // Código
                    { width: '200px', targets: 3 },     // Descripción
                    { width: '120px', targets: 4 },     // Cant. Planeada
                    { width: '120px', targets: 5 },     // Cant. Completada
                    { width: '120px', targets: 6 },     // Cant. Pendiente
                    { width: '150px', targets: 7 },     // % Completado
                    { width: '100px', targets: 8 },     // Almacén
                    { width: '100px', targets: 9 },     // Fecha Venc.
                    { width: '90px', targets: 10 },     // Prioridad
                    //{ width: '120px', targets: 11 },    // Acciones

                    { orderable: false, targets: [7] },
                    { className: "text-center", targets: [0, 1, 2, 7, 8, 9, 10] }
                ],
                order: [[0, 'desc']], // Ordenar por N° Doc descendente
                info: true,
                bPaginate: true,
                pageLength: 10,
                lengthMenu: [[10, 25, 50, 100], [10, 25, 50, 100]],
                language: {
                    lengthMenu: "Mostrar _MENU_ registros",
                    zeroRecords: "No se encontraron resultados",
                    info: "Registros del _START_ al _END_ de un total de _TOTAL_ registros",
                    infoEmpty: "Registros del 0 al 0 de un total de 0 registros",
                    infoFiltered: "(filtrado de un total de _MAX_ registros)",
                    sSearch: "Buscar:",
                    oPaginate: {
                        sFirst: "Primero",
                        sLast: "Último",
                        sNext: "Siguiente",
                        sPrevious: "Anterior"
                    },
                    emptyTable: "No hay órdenes de fabricación disponibles"
                },
                createdRow: function (row, data, dataIndex) {
                    // Agregar data attributes a la fila
                    $(row).attr('data-doc-entry', data.DOC_ENTRY);
                    $(row).attr('data-doc-num', data.DOC_NUM);
                    $(row).attr('data-status', data.STATUS);

                    // Guardar datos completos en la fila
                    $(row).data('orden-completo', {
                        docEntry: data.DOC_ENTRY,
                        docNum: data.DOC_NUM,
                        itemCode: data.ITEM_CODE,
                        itemName: data.ITEM_NAME,
                        cantidadPlaneada: data.CANTIDAD_PLANEADA,
                        cantidadCompletada: data.CANTIDAD_COMPLETADA,
                        cantidadPendiente: data.CANTIDAD_PENDIENTE,
                        status: data.STATUS,
                        statusDesc: data.STATUS_DESC,
                        almacen: data.ALMACEN,
                        fechaVencimiento: data.FECHA_VENCIMIENTO,
                        prioridad: data.PRIORIDAD,
                        porcentajeCompletado: data.PORCENTAJE_COMPLETADO
                    });

                    // Resaltar fila según estado
                    switch (data.STATUS) {
                        case 'C': // Cerrada
                            $(row).addClass('table-success');
                            break;
                        case 'L': // Cancelada
                            $(row).addClass('table-danger');
                            break;
                        case 'R': // Liberada con bajo avance
                            const porcentaje = parseFloat(data.PORCENTAJE_COMPLETADO) || 0;
                            if (porcentaje < 50) {
                                $(row).addClass('table-warning');
                            }
                            break;
                    }
                },
                drawCallback: function (settings) {
                    // Reinicializar tooltips después de cada redibujado
                    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
                    tooltipTriggerList.map(function (tooltipTriggerEl) {
                        return new bootstrap.Tooltip(tooltipTriggerEl);
                    });
                }
            });

            return table;

        } catch (error) {
            AlertManager.mostrar('No es posible mostrar las órdenes de fabricación: ' + error, 'warning');
            console.error('Error en llenarTablaOrdenesFabricacion:', error);
        }
    }
    // En el constructor o al abrir el modal
    llenarDiasDelMes() {
        const selectInicio = $('#DiaInicioMant');
        const selectFin = $('#DiaFinMant');

        selectInicio.empty().append('<option value="">Día inicio</option>');
        selectFin.empty().append('<option value="">Día fin</option>');

        // Obtener los días del mes actual usando el método generarDiasDelMes()
        const diasDelMes = DateUtils.generarDiasDelMes();

        // Llenar los selects con los días
        diasDelMes.forEach(dia => {
            selectInicio.append(`<option value="${dia.valor}">${dia.texto}</option>`);
            selectFin.append(`<option value="${dia.valor}">${dia.texto}</option>`);
        });
    }
    // ✅ Cargar eventos del mes visible en el calendario
    cargarEventosDelMesVisible(info) {
        // Obtener el primer y último día del mes visible
        const fechaInicio = info.view.currentStart;
        const fechaFin = info.view.currentEnd;

        // Ajustar fechas para obtener el mes completo
        const primerDia = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth(), 1);
        const ultimoDia = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth() + 1, 0);

        // Formatear fechas para el backend (YYYY-MM-DD)
        const fechaInicioStr = primerDia.toISOString().split('T')[0];
        const fechaFinStr = ultimoDia.toISOString().split('T')[0];

        console.log(`📅 Cargando planes del mes: ${fechaInicioStr} al ${fechaFinStr}`);

        // Cargar eventos con las fechas del mes visible
        this.cargarEventosReales(fechaInicioStr, fechaFinStr);
    }

    guardarPlan(e) {
        e.preventDefault(); // Evitar el submit tradicional

        // Validar formulario
        if (!ValidationManager.validarFormulario('#eventForm')) {
            AlertManager.mostrar('Por favor, complete correctamente todos los campos', 'warning', 'alertPlanContainer');
            return false;
        }

        const lineaProduccion = $('#PlanLinea').val();
        const lineaProduccionDesc = $('#PlanLinea option:selected').text();
        const diaInicio = $('#DiaInicioMant').val();
        const diaFin = $('#DiaFinMant').val();
        const produccionTeorica = $('#ProduccionTeorica').val();
        const produccionReal = $('#ProduccionReal').val();
        const comentarios = $("#Comentarios").val();

        if (parseInt(diaFin) < parseInt(diaInicio)) {
            UIManager.mostrarAlert('El día final debe ser mayor o igual al día inicial', 'warning');
            return;
        }

        // ⭐ OBJETO JSON CON LOS DATOS
        // Obtener el valor (formato: "2025-12")
        const mesAnio = $('#MesAnioPlan').val();
        // Armar la fecha completa (siempre día 1)
        const fechaPlan = `${mesAnio}-01`; // Resultado: "2025-12-01"

        const datos = {
            LINEA_PRODUCCION: lineaProduccion,
            LINEA_PRODUCCION_DESC: lineaProduccionDesc,
            DIA_INICIO_MANT: diaInicio,
            DIA_FIN_MANT: diaFin,
            PRODUCCION_TEORICA: produccionTeorica,
            PRODUCCION_REAL: produccionReal,
            FECHA_PLAN: fechaPlan, // ⭐ Formato: 2025-12-01
            PLANTA: this.PLANTA,
            COMENTARIOS: comentarios
        };

        $("#btnGuardarEvento").html('<span class="spinner-border spinner-border-sm me-2"></span>Guardando...');
        $("#btnGuardarEvento").prop("disabled", true);

        $.ajax({
            url: `/${this.URLBase}/InsertarPlanProduccion`,
            type: 'POST',
            contentType: 'application/json; charset=utf-8',
            data: JSON.stringify(datos),
            dataType: 'json',
            success: (response) => {
                if (response.Status === 'SI') {
                    $("#btnGuardarEvento").html('<i class="bi bi-check-circle-fill me-2 text-white"></i>Plan generado correctamente.');
                    $("#btnGuardarEvento").prop("disabled", false);

                    // ✅ Cargar los eventos reales desde HANA
                    $('#tablaPlaneacion').DataTable().ajax.reload();

                    $('#eventForm')[0].reset();
                    ValidationManager.limpiarValidacion("eventForm");

                    setTimeout(function () {
                        $("#btnGuardarEvento").html('<i class="bi bi-save me-1"></i>Guardar');
                        $('#addEventModal').modal('hide');
                    }, 3000);


                    const diasTotal = parseInt(diaFin) - parseInt(diaInicio) + 1;
                    UIManager.mostrarAlert(
                        `Mantenimiento planificado para ${lineaProduccionDesc} (${diasTotal} días)`,
                        'success'
                    );
                } else {
                    $("#btnGuardarEvento").html('<i class="bi bi-save me-1"></i>Guardar');
                    $("#btnGuardarEvento").prop("disabled", false);
                    AlertManager.mostrar(response.Message || 'Error al insertar el plan de producción.', 'warning', "alertPlanContainer");
                }
            },
            error: (xhr, status, error) => {
                $("#btnGuardarEvento").html('<i class="bi bi-save me-1"></i>Guardar');
                $("#btnGuardarEvento").prop("disabled", false);
                AlertManager.mostrar('Error al conectar con el servidor', 'warning', "alertPlanContainer");
            }
        });
    }

    guardarParo(e) {
        e.preventDefault(); // Evitar el submit tradicional

        // Validar formulario
        if (!ValidationManager.validarFormulario('#formParoLinea')) {
            AlertManager.mostrar('Por favor, complete correctamente todos los campos', 'warning', 'alertParoContainer');
            return false;
        }

        const lineaProduccion = $('#ParoLinea').val();
        const comentarios = $("#ComentariosParo").val();
        const lineaProduccionDesc = $('#ParoLinea option:selected').text();

        const datos = {
            LINEA_PRODUCCION: lineaProduccion,
            COMENTARIOS: comentarios
        };

        $("#btnGenerarParo").html('<span class="spinner-border spinner-border-sm me-2"></span>Guardando...');
        $("#btnGenerarParo").prop("disabled", true);

        $.ajax({
            url: `/${this.URLBase}/InsertarParoProduccion`,
            type: 'POST',
            contentType: 'application/json; charset=utf-8',
            data: JSON.stringify(datos),
            dataType: 'json',
            success: (response) => {
                if (response.Status === 'SI') {
                    $("#btnGenerarParo").html(`<i class="bi bi-check-circle-fill me-2 text-white"></i>Paro de línea ${lineaProduccionDesc} generado correctamente.`);
                    $("#btnGenerarParo").prop("disabled", false);

                    // ✅ Cargar los eventos reales desde HANA
                    this.cargarEventosReales();

                    $('#formParoLinea')[0].reset();
                    ValidationManager.limpiarValidacion("formParoLinea");

                    setTimeout(function () {
                        $("#btnGenerarParo").html('<i class="bi bi-save me-1"></i>Guardar');
                        $('#modalRegistrarParo').modal('hide');
                    }, 3000);

                } else {
                    $("#btnGenerarParo").html('<i class="bi bi-save me-1"></i>Guardar');
                    $("#btnGenerarParo").prop("disabled", false);
                    AlertManager.mostrar(response.Message || 'Error al insertar el paro de línea de producción.', 'warning', "alertParoContainer");
                }
            },
            error: (xhr, status, error) => {
                $("#btnGenerarParo").html('<i class="bi bi-save me-1"></i>Guardar');
                $("#btnGenerarParo").prop("disabled", false);
                AlertManager.mostrar('Error al conectar con el servidor', 'warning', "alertParoContainer");
            }
        });
    }

    abrirModalAgregarPlan(e) {
        e.preventDefault();
        $("#Comentarios").val('');
        $("#FiltroLinea").val('');
        this.llenarDiasDelMes(); // ⭐ Agregar esta línea
        $('#addEventModal').modal('show');
    }

    abrirModalRegistrarParo(e) {
        e.preventDefault();
        $('#modalRegistrarParo').modal('show');
    }

    // ✅ Función para obtener mantenimientos completados del SP
    obtenerPlanesProducción(fechaInicio = null, fechaFin = null) {
        return new Promise((resolve, reject) => {
            // Si no se proporcionan fechas, usar el año actual
            if (!fechaInicio || !fechaFin) {
                const anioActual = new Date().getFullYear();
                fechaInicio = `${anioActual}-01-01`;
                fechaFin = `${anioActual}-12-31`;
            }

            $.ajax({
                url: `/${this.URLBase}/obtenerPlanesProgramados`,
                type: 'GET',
                data: {
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
                        UIManager.mostrarAlert(data.Message, 'info');
                        resolve([]);
                    } else if (data.Status === 'warning') {
                        UIManager.mostrarAlert('Error: ' + data.Message, 'warning');
                        reject(data.Message);
                    }
                },
                error: function (xhr, status, error) {
                    console.error('❌ Error AJAX:', error);
                    UIManager.mostrarAlert('Error de conexión al obtener mantenimientos.', 'warning');
                    reject(error);
                }
            });
        });
    }

    // ✅ Función para transformar datos de HANA a formato FullCalendar
    transformarEventosCalendario(datosHana) {
        const eventos = [];

        // 🎨 Colores según tipo de mantenimiento
        const colores = {
            'Preventivo': '#28a745',  // Verde
            'Correctivo': '#dc3545'   // Rojo
        };

        datosHana.forEach((item) => {
            // Determinar color según tipo
            const colorEvento = colores[item.TIPO_MANTENIMIENTO] || '#6c757d';

            // Formatear fechas
            const fechaInicio = new Date(item.FECHA_INICIO);
            const fechaFin = new Date(item.FECHA_FIN);
            const fechaCompletado = new Date(item.FECHA_COMPLETADO);

            // ✅ SOLO pintar el día que fue completado (no rango)
            const fechaCompletadoStr = fechaCompletado.toISOString().split('T')[0];

            const evento = {
                id: item.ID_MANTENIMIENTO,
                title: `${item.TIPO_MANTENIMIENTO} - ${item.NOMBRE_EQUIPO}`,
                start: fechaCompletadoStr,  // ✅ Solo fecha completado
                allDay: true,                // ✅ Evento de día completo
                color: colorEvento,
                extendedProps: {
                    id_mantenimiento: item.ID_MANTENIMIENTO,
                    numero_orden: item.NUMERO_ORDEN,
                    id_equipo: item.ID_EQUIPO,
                    equipment: item.NOMBRE_EQUIPO,
                    description: item.DESCRIPCION_EQUIPO,
                    area: item.AREA,
                    line: item.LINEA_PRODUCCION,
                    type: item.TIPO_MANTENIMIENTO,
                    tipo: item.TIPO_MANTENIMIENTO,
                    fechaInicio: fechaInicio.toLocaleDateString('es-ES'),
                    fechaFin: fechaFin.toLocaleDateString('es-ES'),
                    fechaCompletado: fechaCompletado.toLocaleDateString('es-ES'),
                    periodoMantenimiento: `${fechaInicio.toLocaleDateString('es-ES')} al ${fechaFin.toLocaleDateString('es-ES')}`,
                    status: item.ESTATUS,
                    solicitante: item.SOLICITANTE || 'No especificado',
                    ubicacion_tecnica: item.UBICACION_TECNICA || 'No especificada',
                    duracion_hrs: item.DURACION_HRS || 0,
                    texto_corto: item.TEXTO_CORTO || '',
                    texto_secuencia: item.TEXTO_SECUENCIA || '',
                    tecnicos_ids: item.TECNICOS_ASIGNADOS_IDS || '',
                    tecnicos_nombres: item.TECNICOS_ASIGNADOS_NOMBRES || 'No asignados'
                }
            };

            eventos.push(evento);
        });

        return eventos;
    }

    async cargarEventosReales(fechaInicio = null, fechaFin = null) {
        GlobalUtil.mostrarLoader(true);

        try {
            if (!fechaInicio || !fechaFin) {
                const currentDate = this.calendar.getDate();
                const primerDia = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                const ultimoDia = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

                fechaInicio = primerDia.toISOString().split('T')[0];
                fechaFin = ultimoDia.toISOString().split('T')[0];
            }

            const datosHana = await this.obtenerPlanesProducción(fechaInicio, fechaFin);

            if (datosHana && datosHana.length > 0) {
                this.calendar.removeAllEvents();

                datosHana.forEach((plan) => {
                    const grupoId = `plan-${plan.ID_PLAN}`;
                    const year = plan.ANIO_PLAN;
                    const month = String(plan.FECHA_PLAN_STRING).padStart(2, '0');
                    const color = plan.COLOR_EVENTO; // Ya viene rojo si hay paro
                    const colorClase = plan.TIPO_TURNO === '12' ? 'evento-turno-12' : 'evento-turno-12';

                    // 🔥 ICONO DE PARO ACTIVO
                    const iconoParo = plan.TIENE_PARO_ACTIVO ? '🛑 ' : '';
                    const claseParoActivo = plan.TIENE_PARO_ACTIVO ? 'evento-con-paro' : '';

                    for (let dia = plan.DIA_INICIO_MANT; dia <= plan.DIA_FIN_MANT; dia++) {
                        const diaStr = String(dia).padStart(2, '0');
                        const fechaEvento = `${year}-${month}-${diaStr}`;

                        const esPrimerDia = (dia === plan.DIA_INICIO_MANT);
                        const esUltimoDia = (dia === plan.DIA_FIN_MANT);

                        let prefijo = '';
                        if (esPrimerDia && esUltimoDia) {
                            prefijo = '●';
                        } else if (esPrimerDia) {
                            prefijo = '';
                        } else if (esUltimoDia) {
                            prefijo = '';
                        } else {
                            prefijo = '━';
                        }

                        const evento = {
                            id: `${grupoId}-dia${dia}`,
                            title: `${iconoParo}${prefijo} ${plan.LINEA_PRODUCCION_DESC}`,
                            start: fechaEvento,
                            allDay: true,
                            color: color,
                            classNames: ['evento-planificado', colorClase, claseParoActivo],
                            extendedProps: {
                                idPlan: plan.ID_PLAN,
                                grupoId: grupoId,
                                lineaProduccion: plan.LINEA_PRODUCCION,
                                lineaProduccionDesc: plan.LINEA_PRODUCCION_DESC,
                                planta: plan.PLANTA,
                                tipoTurno: plan.TIPO_TURNO,
                                tipoTurnoDesc: plan.TIPO_TURNO_DESC,
                                diaInicio: plan.DIA_INICIO_MANT,
                                diaFin: plan.DIA_FIN_MANT,
                                diaActual: dia,
                                diasTotales: plan.DIAS_TOTALES,
                                comentarios: plan.COMENTARIOS,
                                fechaPlan: plan.FECHA_PLAN,
                                fechaCreacion: plan.FECHA_CREACION,
                                esPrimerDia: esPrimerDia,
                                esUltimoDia: esUltimoDia,
                                // 🔥 INFORMACIÓN DEL PARO
                                tieneParoActivo: plan.TIENE_PARO_ACTIVO,
                                idParo: plan.ID_PARO,
                                fechaParo: plan.FECHA_PARO,
                                comentariosParo: plan.COMENTARIOS_PARO
                            }
                        };

                        this.calendar.addEvent(evento);
                    }
                });

                this.todosLosEventos = datosHana;
                console.log(`✅ Planes cargados: ${datosHana.length} del período ${fechaInicio} al ${fechaFin}`);
            } else {
                this.todosLosEventos = [];
                this.calendar.removeAllEvents();
                console.log('ℹ️ No hay planes de producción en el período seleccionado');
            }
        } catch (error) {
            console.error('❌ Error al cargar planes:', error);
            UIManager.mostrarAlert('Error al cargar el calendario de planes', 'warning');
        } finally {
            GlobalUtil.mostrarLoader(false);
        }
    }

    // ✅ Cargar líneas de producción para el filtro
    cargarLineasProduccion() {
        const lineasUnicas = new Set();

        this.todosLosEventos.forEach(evento => {
            if (evento.extendedProps.line) {
                lineasUnicas.add(evento.extendedProps.line);
            }
        });

        const selectLinea = $('#FiltroLineaProduccion');
        selectLinea.empty();
        selectLinea.append('<option value="">Todas las líneas...</option>');

        Array.from(lineasUnicas).sort().forEach(linea => {
            selectLinea.append(`<option value="${linea}">${linea}</option>`);
        });
    }

    // ✅ Aplicar filtros
    aplicarFiltros() {
        const tipoMant = $('#FiltroTipoMantenimiento').val();
        const lineaProd = $('#FiltroLineaProduccion').val();
        const fechaInicio = $('#FiltroFechaInicio').val();
        const fechaFin = $('#FiltroFechaFin').val();

        // Si hay filtros de fecha, recargar desde el servidor
        if (fechaInicio && fechaFin) {
            this.cargarEventosReales(fechaInicio, fechaFin);
            return;
        }

        // Filtrar eventos localmente
        let eventosFiltrados = [...this.todosLosEventos];

        if (tipoMant) {
            eventosFiltrados = eventosFiltrados.filter(e =>
                e.extendedProps.tipo === tipoMant
            );
        }

        if (lineaProd) {
            eventosFiltrados = eventosFiltrados.filter(e =>
                e.extendedProps.line === lineaProd
            );
        }

        // Actualizar calendario
        this.calendar.removeAllEvents();
        eventosFiltrados.forEach(evento => {
            this.calendar.addEvent(evento);
        });

        UIManager.mostrarAlert(
            `Filtros aplicados: ${eventosFiltrados.length} mantenimientos encontrados`,
            'info'
        );
    }

    // ✅ Limpiar filtros
    limpiarFiltros() {
        $('#FiltroTipoMantenimiento').val('');
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
        this.llenarDiasDelMes(); // ⭐ Agregar esta línea
        $('#addEventModal').modal('show');
    }

    // ✅ Manejar click en evento del calendario
    handleEventClick(info) {
        const event = info.event;
        const props = event.extendedProps;

        // Título del modal
        $('#modalTitle').html(`
        <i class="bi bi-calendar-check-fill me-2"></i>
        Plan de Producción - ${props.lineaProduccionDesc}
    `);

        // Información General
        $('#modalIdPlan').text(props.idPlan);
        $('#modalLineaProduccion').text(props.lineaProduccionDesc);
        $('#modalPlanta').text(props.planta);

        // Badge de tipo de turno con color dinámico
        const badgeColorTurno = props.tipoTurno === '12' ? 'bg-info' : 'bg-warning';
        $('#modalTipoTurno').removeClass('bg-info bg-warning').addClass(badgeColorTurno).text(props.tipoTurnoDesc);

        // Período del Plan
        const nombreMes = this.obtenerNombreMes(event.start);
        const anio = event.start.getFullYear();
        $('#modalMesAnio').text(`${nombreMes} ${anio}`);
        $('#modalDiasPlan').text(`Del día ${props.diaInicio} al ${props.diaFin}`);
        $('#modalDuracionTotal').text(`${props.diasTotales} días`);

        // Formatear fecha de creación
        if (props.fechaCreacion) {
            const fechaCreacion = new Date(props.fechaCreacion);
            $('#modalFechaCreacion').text(fechaCreacion.toLocaleString('es-MX'));
        }

        // ✅ MOSTRAR INFORMACIÓN DEL PARO SOLO SI EXISTE
        if (props.tieneParoActivo === 1 && props.idParo) {
            // 🔴 HAY PARO ACTIVO - Mostrar alerta roja
            $('#alertaParoActivo').removeClass("d-none");
            $('#alertaParoActivo').removeAttr('style');
            $('#alertaSinParo').addClass("d-none");

            const fechaParo = new Date(props.fechaParo);
            $('#mensajeParoActivo').text(`Paro registrado el ${fechaParo.toLocaleString('es-MX')}`);

            // Mostrar sección de información del paro
            $('#seccionParo').show();
            $('#modalIdParo').text(props.idParo);
            $('#modalFechaParo').text(fechaParo.toLocaleString('es-MX'));
            $('#modalComentariosParo').text(props.comentariosParo || 'Sin comentarios');

            // Mostrar botón para reanudar
            $('#btnReanudarParo').show().off('click').on('click', () => {
                this.reanudarParo(props.idParo, props.lineaProduccionDesc);
            });
        } else {
            // ✅ NO HAY PARO - Mostrar mensaje positivo
            $('#alertaParoActivo').addClass("d-none");
            $('#alertaSinParo').removeClass("d-none");
            $('#alertaSinParo').removeAttr('style');
            $('#seccionParo').hide();
            $('#btnReanudarParo').hide();
        }

        // Comentarios del Plan
        if (props.comentarios && props.comentarios.trim() !== '') {
            $('#seccionComentarios').show();
            $('#modalComentarios').text(props.comentarios);
        } else {
            $('#seccionComentarios').hide();
        }

        $('#eventModal').modal('show');
        info.jsEvent.preventDefault();
    }

    // ✅ Método auxiliar para obtener nombre del mes
    obtenerNombreMes(fecha) {
        const meses = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        return meses[fecha.getMonth()];
    }

    // ✅ Método para reanudar paro
    async reanudarParo(idParo, lineaDesc) {
        const { value: comentarios } = await Swal.fire({
            title: '¿Reanudar Producción?',
            html: `¿Está seguro que desea reanudar la producción de <strong>${lineaDesc}</strong>?`,
            input: 'textarea',
            inputLabel: 'Comentarios adicionales (opcional)',
            inputPlaceholder: 'Ej: Reparación completada, sistema funcionando correctamente...',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#6c757d',
            confirmButtonText: '<i class="bi bi-play-circle me-1"></i>Sí, reanudar',
            cancelButtonText: 'Cancelar',
            inputValidator: (value) => {
                // Validación opcional - puedes quitarla si no quieres forzar comentarios
                // if (!value) {
                //     return 'Por favor ingrese un comentario';
                // }
            }
        });

        if (comentarios !== undefined) { // Usuario confirmó (incluso si no escribió comentarios)
            try {
                GlobalUtil.mostrarLoader(true);

                // 🔥 Llamar al stored procedure de reanudación
                const resultado = await this.reanudarParoProduccion(idParo, comentarios || '');

                if (resultado && resultado.ESTATUS === 'C') {
                    await Swal.fire({
                        title: '¡Producción Reanudada!',
                        text: 'La línea ha sido reactivada correctamente',
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false
                    });

                    $('#eventModal').modal('hide');

                    // Recargar calendario para reflejar cambios
                    await this.cargarEventosReales();
                } else {
                    throw new Error(resultado?.MENSAJE || 'Error al reanudar el paro');
                }
            } catch (error) {
                console.error('❌ Error al reanudar paro:', error);
                Swal.fire({
                    title: 'warning',
                    text: 'No se pudo reanudar la producción. Intente nuevamente.',
                    icon: 'warning'
                });
            } finally {
                GlobalUtil.mostrarLoader(false);
            }
        }
    }

    // ✅ Método para llamar al stored procedure de reanudación
    async reanudarParoProduccion(idParo, comentarios) {
        try {
            const response = await fetch('/api/tu-endpoint-reanudar-paro', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    idParo: idParo,
                    comentarios: comentarios
                })
            });

            if (!response.ok) {
                throw new Error('Error en la petición');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error al reanudar paro:', error);
            throw error;
        }
    }
}