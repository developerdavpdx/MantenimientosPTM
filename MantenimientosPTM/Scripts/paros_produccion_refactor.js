// ========================================
// GESTION DE EVENTOS
// ========================================
class GestionEventosApp {
    constructor(datos_usuario) {

        this.datos_usuario = GlobalUtil.getDatosUsuario();

        this.URLBase = "Produccion";

        this.ProduccionManager =
            new ProduccionManager(this.URLBase);

        // 🔥 AGREGAR ESTO
        this.autocompleteParoArticulo =
            new AutocompleteParoArticulo(
                this.datos_usuario
            );
    }

    inicializar() {

        UIManager.inicializarUI();

        this.ProduccionManager.inicializar();

        // 🔥 AGREGAR ESTO
        this.autocompleteParoArticulo.inicializar();

        this.configurarEventosProduccionManager();

        console.log(
            '✅ Sistema Completo de Gestión de Produccion inicializado correctamente'
        );

    }

    configurarEventosProduccionManager() {
        // PARO
        $('#formRegistrarParo').on('submit', (e) => this.ProduccionManager.guardarParo(e));
        // PLAN
        $('#btnGuardarEvento').on('click', (e) => this.ProduccionManager.guardarPlan(e));
        // SELECCIONAR TODAS LAS LINEAS
        $(document).on('change', '#checkTodasLineas', function () {

            const checked = $(this).is(':checked');

            $('.linea-checkbox').prop('checked', checked);

        });

        $(document).on('change', '.linea-checkbox', function () {

            const total = $('.linea-checkbox').length;
            const checked = $('.linea-checkbox:checked').length;

            $('#checkTodasLineas').prop('checked', total === checked);

        });

        $('#AgregarPlan').on('click', (e) => this.ProduccionManager.abrirModalAgregarPlan(e));

        $('#RegistrarParo').on('click', (e) => this.ProduccionManager.abrirModalRegistrarParo(e));

        // 🔥 EXPORTAR A EXCEL
        $('#btnExportarParos').on('click', () => this.ProduccionManager.exportarExcelParos());

        // ── AGREGAR TIPO PARO ──
        $('#AddTipoParo').on('click', (e) => {
            e.preventDefault();
            const datosUsuario = GlobalUtil.getDatosUsuario();
            const planta = datosUsuario[0].PLANTA || '';

            $('#lblPlantaTipoParo').text('Planta ' + planta);
            $('#inputNombreTipoParo').val('');
            $('#alertTipoParoContainer').html('');
            $('#modalAgregarTipoParo').modal('show');
        });

        // ── GUARDAR TIPO PARO ──
        $('#btnGuardarTipoParo').on('click', () => {
            const nombre = $('#inputNombreTipoParo').val().trim();
            const datosUsuario = GlobalUtil.getDatosUsuario();
            const planta = datosUsuario[0].PLANTA || '';

            if (!nombre) {
                $('#alertTipoParoContainer').html(
                    '<div class="alert alert-danger alert-dismissible fade show" role="alert">' +
                    '<i class="bi bi-exclamation-triangle-fill me-1"></i> Ingrese el nombre de la categoría' +
                    '<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>'
                );
                return;
            }

            if (nombre.length > 50) {
                $('#alertTipoParoContainer').html(
                    '<div class="alert alert-warning alert-dismissible fade show" role="alert">' +
                    '<i class="bi bi-exclamation-triangle-fill me-1"></i> El nombre no puede exceder 50 caracteres' +
                    '<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>'
                );
                return;
            }

            $.ajax({
                url: `/${this.URLBase}/AgregarTipoParoProduccion`,
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    Planta: planta,
                    Nombre: nombre
                }),
                success: function (response) {
                    if (response.Status === 'OK') {
                        $('#alertTipoParoContainer').html(
                            '<div class="alert alert-success alert-dismissible fade show" role="alert">' +
                            '<i class="bi bi-check-circle-fill me-1"></i> ' + response.Message +
                            '<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>'
                        );

                        //Cargar nuevamente la categorias
                        EquiposUtil.llenarCategoriasParo("ParoCategoria");

                        setTimeout(function () {
                            $('#modalAgregarTipoParo').modal('hide');
                        }, 1500);
                    } else {
                        $('#alertTipoParoContainer').html(
                            '<div class="alert alert-danger alert-dismissible fade show" role="alert">' +
                            '<i class="bi bi-exclamation-triangle-fill me-1"></i> ' + response.Message +
                            '<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>'
                        );
                    }
                },
                error: function (xhr) {
                    $('#alertTipoParoContainer').html(
                        '<div class="alert alert-danger alert-dismissible fade show" role="alert">' +
                        '<i class="bi bi-exclamation-triangle-fill me-1"></i> Error al guardar: ' + (xhr.responseText || 'Error desconocido') +
                        '<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>'
                    );
                }
            });
        });

        // ── LIMPIAR ALERTA AL CERRAR MODAL ──
        $('#modalAgregarTipoParo').on('hidden.bs.modal', function () {
            $('#alertTipoParoContainer').html('');
        });

        //Agregar nueva fila de registro de paros
        $('#btnAgregarParo').on('click', (e) => this.ProduccionManager.agregarFilaParo(e));

        //Eliminar fila de registro de paros
        $(document).on('click', '.btnEliminarFila', function () {

            $(this)
                .closest('tr')
                .find('.autocomplete-dropdown')
                .remove();

            $(this)
                .closest('tr')
                .remove();

        });

        // ===============================
        // NUEVOS EVENTOS PAROS
        // ===============================

        $('#FiltroPlanta').on('change', () => {
            const Planta = $("#FiltroPlanta").val();
            EquiposUtil.llenarLineas(Planta, null, "FiltroLinea");
        });

        $('#FiltroPlantaParo').on('change', () => {
            const Planta = $("#FiltroPlantaParo").val();
            EquiposUtil.llenarProcesos(Planta, null, "FiltroProcesoParo");
            if (Planta) {
                $('#FiltroPlantaParo option[value=""]').hide();
            }
        });

        $('#btnAplicarFiltrosParo').on('click', () => {
            $("#LineasProduccionContainer").addClass("d-none");
            const Planta = $("#FiltroPlantaParo").val();
            const Proceso = $("#FiltroProcesoParo").val() || null;
            if(Planta && Proceso)
                EquiposUtil.llenarLineasCheckbox(Planta, Proceso, 1, "contenedorLineasParo");
            else
                AlertManager.mostrar('Selecciona una planta y un proceso', 'warning','alertParoContainer');
        });

        $('#btnAplicarFiltros').on('click', () => {
            this.ProduccionManager.llenarTablaParos();
        });

        $('#btnLimpiarFiltros').on('click', () => {
            $('#FiltroPlanta,#FiltroLinea, #FiltroEstadoParo, #FiltroFechaInicio, #FiltroFechaFin').val('');
            this.ProduccionManager.llenarTablaParos();
        });

        $('#FiltroPlanta,#FiltroLinea, #FiltroEstadoParo, #FiltroFechaInicio, #FiltroFechaFin').on('change', () => {
            this.ProduccionManager.llenarTablaParos();
        });

        // Resolver Paro
        $(document).on('click', '.btn-resolver-paro', (e) => {

            const id = $(e.currentTarget).data('id');

            $('#ReanudarParoId').val(id);
            $('#ReanudarComentarios').val('');

            $('#modalReanudarParo').modal('show');

        });

        $("#FiltroProceso")
            .off('change')
            .on('change', (e) => {

                let Proceso = $(e.currentTarget).val();

                EquiposUtil.llenarLineas(
                    this.datos_usuario[0].PLANTA,
                    Proceso,
                    1,
                    "FiltroLinea",
                    null
                );
            });

        $(document).on('click', '#eliminaParoProduccion', (e) => {

            const idParo = $(e.currentTarget).data("idparo");

            this.ProduccionManager.eliminarParo(idParo);

        });
    }
}

// ========================================
// INICIALIZACIÓN
// ========================================
$(document).ready(function () {
    const app = new GestionEventosApp();
    app.inicializar();

    // 🔥 INICIALIZAR HEADER FIJO CON EL GESTOR GLOBAL
    window.HeaderFijoGlobalManager.crear(
        '.card-header.header-fijo-custom',      // ✅ Header
        '.position-relative.header-custom',     // ✅ Contenedor
        'headerMantenimientos',                 // ID único
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
        $("#ProduccionContainer").addClass("selected");
        $("#ProduccionContainer a").addClass("whiteText");
        $("#produccion-collapse").addClass("show");
        $("#ParosProduccionURL").addClass("selected-item");

        $('#FiltroFechaInicio').val(DateUtils.obtenerPrimerDiaMesActual());
        $('#FiltroFechaFin').val(DateUtils.obtenerUltimoDiaMesActual());
    }
}

// ========================================
// GESTOR DE PRODUCCION
// ========================================
class ProduccionManager {
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
        this.llenarTablaParos();
        EquiposUtil.llenarProcesos(this.PLANTA, null, "FiltroProceso");
        EquiposUtil.llenarCategoriasParo("ParoCategoria");
        console.log('✅ Calendar Manager inicializado correctamente');
    }
    // ========================================
    // PAROS DE PRODUCCION
    // ========================================
    llenarTablaParos() {
        try {

            // ✅ Remover fila vacía si existe
            $('#filaVacia').remove();

            // Destruir DataTable si ya existe
            if ($.fn.DataTable.isDataTable('#HistorialParos')) {
                $('#HistorialParos').DataTable().destroy();
            }

            const Planta = this.PLANTA;

            // Función para calcular el offset según tamaño de pantalla
            function calcularHeaderOffset() {
                if (window.innerWidth < 625) return 200;
                if (window.innerWidth < 640) return 180;
                if (window.innerWidth < 992) return 140;
                if (window.innerWidth < 1155) return 100;
                if (window.innerWidth < 1400) return 100;
                return 80;
            }

            const table = $('#HistorialParos').DataTable({
                processing: false,
                serverSide: true,
                bDestroy: true,
                searching: false,
                autoWidth: false,
                colReorder: true,
                fixedHeader: {
                    header: true,
                    headerOffset: calcularHeaderOffset()
                },

                // 🎯 RESPONSIVE
                responsive: {
                    details: {
                        type: 'column',
                        target: 0,
                        renderer: function (api, rowIdx, columns) {
                            const hiddenColumns = columns.filter(col => col.hidden);
                            if (hiddenColumns.length === 0) return false;

                            function normalizar(texto) {
                                return texto.toUpperCase()
                                    .normalize("NFD")
                                    .replace(/[\u0300-\u036f]/g, "")
                                    .trim();
                            }

                            function obtenerIcono(titulo) {
                                const iconos = {
                                    'LINEA': 'bi bi-diagram-3-fill',
                                    'USUARIO': 'bi bi-person-fill',
                                    'FECHA INICIO': 'bi bi-calendar-event',
                                    'FECHA FIN': 'bi bi-calendar-check',
                                    'DURACION (HRS)': 'bi bi-clock',
                                    'COMENTARIOS': 'bi bi-chat-left-text',
                                    'ESTADO': 'bi bi-toggle-on',
                                };
                                return iconos[normalizar(titulo)] || 'bi bi-circle-fill';
                            }

                            let detallesHtml = '';
                            $.each(hiddenColumns, function (i, col) {
                                const iconClass = obtenerIcono(col.title);
                                const value = col.data || '<em class="text-muted">Sin información</em>';
                                detallesHtml +=
                                    '<div class="row mb-3 py-2 border-bottom align-items-center">' +
                                    '  <div class="col-5">' +
                                    '    <i class="' + iconClass + ' me-2" style="font-size:1.3rem;color:#0D6EFD;"></i>' +
                                    '    <strong>' + col.title + '</strong>' +
                                    '  </div>' +
                                    '  <div class="col-7">' +
                                    '    <span class="badge px-3 py-2" style="background-color:#F2F2F2;color:#333;">' + value + '</span>' +
                                    '  </div>' +
                                    '</div>';
                            });

                            return '<div class="card shadow-sm mt-3">' +
                                '  <div class="card-header bg-light">' +
                                '    <h5 class="mb-0">' +
                                '      <i class="bi bi-pause-circle me-2" style="color:#0D6EFD;"></i>' +
                                '      Información adicional del paro' +
                                '    </h5>' +
                                '  </div>' +
                                '  <div class="card-body">' + detallesHtml + '  </div>' +
                                '  <div class="card-footer bg-light text-muted">' +
                                '    <small>Última actualización: ' + new Date().toLocaleDateString() + '</small>' +
                                '  </div>' +
                                '</div>';
                        }
                    }
                },

                // 🌐 AJAX
                ajax: {
                    url: `/${this.URLBase}/obtenerParosProduccionSS`,
                    type: "POST",
                    dataType: "json",
                    beforeSend: function () { GlobalUtil.mostrarLoader(true); },
                    complete: function () { GlobalUtil.mostrarLoader(false); },
                    data: (d) => {
                        return $.extend({}, d, {
                            "FiltroFechaInicio": $("#FiltroFechaInicio").val() || null,
                            "FiltroFechaFin": $("#FiltroFechaFin").val() || null,
                            "FiltroLinea": $("#FiltroLinea").val() || null,
                            "FiltroEstatus": $("#FiltroEstatus").val() || null,
                            "FiltroPlanta": Planta || null,
                        });
                    },
                    dataSrc: function (json) {
                        return json.data;
                    }
                },

                // 📋 COLUMNAS — alineadas al SP
                columns: [
                    // Columna: Control Responsive (+/-)
                    {
                        className: 'dtr-control',
                        orderable: false,
                        data: null,
                        defaultContent: '',
                        width: '30px'
                    },
                    {                        
                        data: null,
                        orderable: false,
                        className: "text-center",
                        width: '50px',
                        render: (data, type, row) => {
                            if (data.TIPO_PARO !== "CORRECTIVO") {
                                return `<button id="eliminaParoProduccion" type="button" class="btn btn-sm btn-ptm-eliminar btn-eliminar-tipo" data-bs-toggle="tooltip" title="Eliminar" data-idParo="${data.ID_PARO}">
                                    <i class="bi bi-trash"></i>
                                </button>`;
                            }

                            return "";
                        }
                    },
                    // Columna: Planta
                    {
                        data: "PLANTA",
                        render: (data) => {
                            return `<i class="bi bi-building-fill me-1"></i>${data || 'N/A'}`;
                        }
                    },
                    // Columna: Línea
                    {
                        data: "LINEA_PRODUCCION_DESC",
                        render: (data) => {
                            return `<i class="bi bi-diagram-3-fill me-1"></i>${data || 'N/A'}`;
                        }
                    },
                    // Columna: Artículo (nuevo)
                    {
                        data: "ARTICULO",
                        render: (data, type, row) => {
                            const codigo = row.ARTICULO || '';
                            const desc = row.ARTICULO_DESC || '';
                            const texto = codigo ? (desc ? `${codigo} — ${desc}` : codigo) : (desc || 'N/A');
                            return `<i class="bi bi-box-seam-fill me-1"></i>${texto}`;
                        }
                    },
                    // Columna: Categoría
                    {
                        data: "CATEGORIA",
                        render: (data, type, row) => {

                            let color = "bg-info";

                            if (data === "CORRECTIVO") color = "bg-warning text-dark";
                            if (data === "PRODUCCION") color = "bg-primary";
                            if (data === "SUPERVISORPRODUCCION") color = "bg-primary";

                            return `<span class="badge ${color} badge-custom">
                                <i class="bi bi-tag-fill me-1"></i>${data || 'N/A'}
                            </span>`;
                        }
                    },
                    // Columna: Usuario
                    {
                        data: "USUARIO",
                        render: (data) => {
                            return `<span class="badge bg-blue-ptm badge-custom">
                            <i class="bi bi-person-circle me-1"></i>${data || ''}
                        </span>`;
                        }
                    },
                    // Columna: Fecha Inicio
                    {
                        data: "FECHA_PARO_STRING",
                        className: "text-center",
                        render: (data) => {
                            return `<i class="bi bi-calendar-event me-1 text-muted"></i>${data || 'N/A'}`;
                        }
                    },
                    // Columna: Fecha Fin
                    {
                        data: "FECHA_REANUDACION_STRING",
                        className: "text-center",
                        render: (data) => {
                            return `<i class="bi bi-calendar-check me-1 text-muted"></i>${data || 'N/A'}`;
                        }
                    },
                    // Columna: Duración (Hrs)
                    {
                        data: "DURACION_HRS",
                        className: "text-center",
                        render: (data) => {
                            if (!data) {
                                return `<span class="badge bg-warning text-dark badge-custom">
                                <i class="bi bi-clock me-1"></i>En curso
                            </span>`;
                            }
                            return `<i class="bi bi-clock me-1 text-muted"></i>${data} HRS`;
                        }
                    },
                    // Columna: Comentarios
                    {
                        data: "COMENTARIOS",
                        render: (data) => {
                            return `<i class="bi bi-chat-left-text me-1 text-muted"></i>${data || ''}`;
                        }
                    },
                    // Columna: Estado
                    {
                        data: "ESTATUS",
                        className: "all text-center",
                        render: (data, type, row) => {
                            if (data === 'O') {
                                return `<span class="badge bg-danger badge-custom">
                                <i class="bi bi-record-circle me-1"></i>Activo
                            </span>`;
                            }
                            if (data === 'C') {
                                return `<span class="badge bg-secondary badge-custom">
                                <i class="bi bi-check-circle me-1"></i>Cerrado
                            </span>`;
                            }
                            return `<span class="badge bg-secondary badge-custom">${data || 'N/A'}</span>`;
                        }
                    },
                ],

                columnDefs: [
                    // Ajustes tras agregar la columna ARTICULO (desplaza índices a la derecha a partir de la posición 3)
                    { orderable: false, targets: [0, 1, 8, 9] },
                    { visible: false, targets: [8, 11] },
                    { className: "text-center", targets: [0, 2, 5, 6, 7, 8, 10] },

                    // Prioridades responsive (ahora 11 columnas: 0..10)
                    { responsivePriority: 1, targets: 0 },
                    { responsivePriority: 2, targets: 1 },
                    { responsivePriority: 3, targets: 2 }, // Planta
                    { responsivePriority: 4, targets: 3 }, // Línea
                    { responsivePriority: 5, targets: 4 }, // Artículo (nuevo)
                    { responsivePriority: 6, targets: 5 }, // Categoria
                    { responsivePriority: 7, targets: 6 }, // Usuario
                    { responsivePriority: 8, targets: 7 }, // Fecha Inicio
                    { responsivePriority: 9, targets: 8 }, // Fecha Fin
                    { responsivePriority: 10, targets: 9 }, // Duracion
                    { responsivePriority: 11, targets: 10 },  // Comentarios
                    { responsivePriority: 12, targets: 11 }  // Estado
                ],

                ordering: false,
                info: true,
                bPaginate: true,
                pageLength: 100,
                lengthMenu: [[10, 25, 50, 100, 200], [10, 25, 50, 100, 200]],
                language: {
                    lengthMenu: "Mostrar _MENU_ registros",
                    zeroRecords: "No se encontraron paros",
                    info: "Registros del _START_ al _END_ de un total de _TOTAL_ registros",
                    infoEmpty: "Registros del 0 al 0 de un total de 0 registros",
                    infoFiltered: "(filtrado de un total de _MAX_ registros)",
                    oPaginate: {
                        sFirst: "Primero",
                        sLast: "Último",
                        sNext: "Siguiente",
                        sPrevious: "Anterior"
                    },
                    sProcessing: "Cargando datos, por favor espere...",
                    emptyTable: "No hay paros registrados"
                },
                createdRow: function (row, data) {
                    $(row).attr('data-id-paro', data.ID_PARO);
                    $(row).attr('data-linea', data.LINEA_PRODUCCION);
                    $(row).attr('data-estatus', data.ESTATUS);
                },
                drawCallback: function () {
                    table.columns.adjust();
                }
            });

            // ✅ Ajustar offset al cambiar tamaño de ventana
            $(window).on('resize', function () {
                if ($.fn.DataTable.isDataTable('#HistorialParos')) {
                    const nuevoOffset = calcularHeaderOffset();
                    $('#HistorialParos').DataTable().fixedHeader.headerOffset(nuevoOffset);
                    $('#HistorialParos').DataTable().fixedHeader.adjust();
                }
            });

            return table;

        } catch (error) {
            AlertManager.mostrar('No es posible mostrar los paros: ' + error, 'warning');
            console.error('Error en llenarTablaParos:', error);
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
            AlertManager.mostrar('El día final debe ser mayor o igual al día inicial', 'warning');
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
                    AlertManager.mostrar(
                        `Mantenimiento planificado para ${lineaProduccionDesc} (${diasTotal} días)`,
                        'success'
                    );

                    this.llenarTablaParos();
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
        e.preventDefault();

        $("#btnGuardarParo")
            .html('<span class="spinner-border spinner-border-sm me-2"></span>Guardando...')
            .prop("disabled", true);

        let paros = [];
        let errorDuracion = false;
        let errorArticulo = false;
        const self = this;
        const Planta = $("#FiltroPlantaParo").val();
        $('#modalRegistrarParo #tablaParos tbody tr').each(function () {

            const linea = $(this).find('td:eq(0)').attr('data-value');

            const categoria = $(this)
                .find('.paro-categoria')
                .val();


            const duracion = $(this)
                .find('.paro-duracion')
                .val();

            const comentarios = $(this)
                .find('.paro-comentarios')
                .val();

            const articulo = $(this)
                .find('.paro-articulo')
                .val()
                .trim();

            // 🔥 VALIDAR AUTOCOMPLETE REAL
            const articuloData = $(this).data('articulo');

            if (!articuloData || articulo !== articuloData.CodigoArticulo) {

                errorArticulo = true;

                $(this)
                    .find('.paro-articulo')
                    .addClass('is-invalid');

                AlertManager.mostrar(
                    'Debe seleccionar un artículo válido de la lista.',
                    'warning',
                    'alertParoContainer'
                );

                $("#btnGuardarParo")
                    .html('<i class="bi bi-save me-1"></i>Guardar')
                    .prop("disabled", false);

                return;

            }

            else {

                $(this)
                    .find('.paro-articulo')
                    .removeClass('is-invalid');

            }

            // Validar duración obligatoria
            if (!duracion || parseFloat(duracion) <= 0) {

                errorDuracion = true;

                $(this)
                    .find('.paro-duracion')
                    .addClass('is-invalid');

                return;

            } else {

                $(this)
                    .find('.paro-duracion')
                    .removeClass('is-invalid');

            }

            paros.push({

                LINEA_PRODUCCION: linea,

                ID_CATEGORIA_PARO: categoria,

                ARTICULO: articulo,

                DURACION_HRS: duracion,

                COMENTARIOS: comentarios,

                USUARIO: self.datos_usuario[0].EMAIL,

                PLANTA: Planta

            });

        });

        if (errorArticulo) {

            $("#btnGuardarParo")
                .html('<i class="bi bi-floppy-fill"></i> Guardar Paro')
                .prop("disabled", false);

            return;
        }

        if (errorDuracion) {
            AlertManager.mostrar(
                'Debe ingresar la duración en horas para todos los paros.',
                'warning',
                'alertParoContainer'
            );

            $("#btnGuardarParo")
                .html('<i class="bi bi-floppy-fill"></i> Guardar Paro')
                .prop("disabled", false);
            return;
        }

        if (paros.length === 0) {
            AlertManager.mostrar(
                'Debe agregar al menos un paro.',
                'warning',
                'alertParoContainer'
            );
            $("#btnGuardarParo")
                .html('<i class="bi bi-floppy-fill"></i> Guardar Paro')
                .prop("disabled", false);
            return;
        }


        $.ajax({
            url: `/${this.URLBase}/InsertarParoProduccion`,
            type: 'POST',
            contentType: 'application/json; charset=utf-8',
            data: JSON.stringify(paros),
            dataType: 'json',

            success: (response) => {

                if (response.Status === 'SI') {

                    $("#btnGuardarParo")
                        .html(`<i class="bi bi-check-circle-fill me-2 text-white"></i>Paros registrados correctamente.`)
                        .prop("disabled", false);

                    $('#tablaParos tbody').empty();

                    setTimeout(() => {

                        $("#btnGuardarParo")
                            .html('<i class="bi bi-save me-1"></i>Guardar');

                        $('#modalRegistrarParo').modal('hide');

                    }, 2000);

                    this.llenarTablaParos();

                } else {

                    $("#btnGuardarParo")
                        .html('<i class="bi bi-save me-1"></i>Guardar')
                        .prop("disabled", false);

                    AlertManager.mostrar(
                        `${response.Message || 'Error al insertar los paros.'}`,
                        'warning',
                        "alertParoContainer"
                    );
                }
            },

            error: () => {

                $("#btnGuardarParo")
                    .html('<i class="bi bi-save me-1"></i>Guardar')
                    .prop("disabled", false);

                AlertManager.mostrar(
                    'Error al conectar con el servidor',
                    'warning',
                    "alertParoContainer"
                );
            }
        });
    }

    eliminarParo(idParo) {

        ConfirmManager.mostrar({
            titulo: `¿Eliminar paro ${idParo}?`,
            mensaje: `
                    <div style="text-align:left; font-size:0.95rem; line-height:1.6; color:#ffffff;">
                        <div>Se eliminarán el paro <strong>${idParo}</strong>.</div>
                        <hr style="margin:10px 0;">
                        <div style="font-size:0.9rem;color:#fff7d6;">Importante: La eliminación es irrevocable.</div>
                    </div>
                `,
            onConfirm: () => {
                $.ajax({
                    url: `/${this.URLBase}/EliminarParoProduccion`,
                    type: 'PUT',
                    contentType: 'application/json; charset=utf-8',
                    data: JSON.stringify({
                        idParo: idParo
                    }),
                    dataType: 'json',
                    beforeSend: () => { GlobalUtil.mostrarLoader(true, "Eliminando por favor espere…"); },
                    success: (response) => {
                        if (response.Status === 'SI') {
                            GlobalUtil.mostrarLoader(false, "Cargando paros por favor espere...");
                            // ✅ Cargar los eventos reales desde HANA
                            $('#tablaPlaneacion').DataTable().ajax.reload();

                            $('#eventForm')[0].reset();
                            ValidationManager.limpiarValidacion("eventForm");


                            AlertManager.mostrar(
                                `Registro eliminado`,
                                'success'
                            );

                            this.llenarTablaParos();
                        } else {

                            AlertManager.mostrar(
                                response.Message,
                                'warning'
                            );

                            GlobalUtil.mostrarLoader(false, "Cargando paros por favor espere...");
                        }
                    },
                    error: (xhr, status, error) => {
                        GlobalUtil.mostrarLoader(false, "Cargando paros por favor espere...");
                        AlertManager.mostrar('Error al conectar con el servidor', 'warning');
                    }
                });

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
        $("#formRegistrarParo")[0].reset();
        $("#LineasProduccionContainer").addClass("d-none");
        $("#contenedorLineasParo").empty();
        $("#FiltroPlantaParo").val(this.PLANTA).prop("disabled", true).trigger("change");
        $("#tablaParos tbody").empty();
        $('#FiltroPlantaParo option[value=""]').show();
        $('#modalRegistrarParo').modal('show');
    }

    agregarFilaParo(e) {

        e.preventDefault();

        const categoria = $('#ParoCategoria').val();
        const categoriaTexto = $('#ParoCategoria option:selected').text();

        if (!categoria) {
            AlertManager.mostrar(
                'Selecciona una categoría.',
                'warning',
                'alertParoContainer'
            );
            return;
        }

        let lineasSeleccionadas = [];

        $('.linea-checkbox:checked').each(function () {
            lineasSeleccionadas.push({
                id: $(this).val(),
                texto: $(this).next('label').text()
            });
        });

        if (lineasSeleccionadas.length === 0) {
            AlertManager.mostrar(
                'Selecciona al menos una línea.',
                'warning',
                'alertParoContainer'
            );
            return;
        }

        $('#tablaParos tbody tr').empty();

        lineasSeleccionadas.forEach(linea => {

            // Evitar duplicados
            // let existe = false;

            // $('#tablaParos tbody tr').each(function () {

            //     const lineaTabla = $(this).find('td').eq(0).attr('data-value');

            //     if (lineaTabla == linea.id) {
            //         existe = true;
            //     }

            // });

            // if (existe) return;
            const fila = `
                <tr>
                    <td data-value="${linea.id}">
                        ${linea.texto}
                    </td>

                    <td>
                        <select class="form-select form-select-sm paro-categoria" data-value="${categoria}">
                            ${this.generarOpcionesCategorias(categoria)}
                        </select>
                    </td>

                    <td>
                        <input type="text" step="0.1"
                               class="form-control form-control-sm paro-articulo" />
                    </td>

                    <td>
                        <input type="number" step="0.1"
                               class="form-control form-control-sm paro-duracion" />
                    </td>

                    <td>
                        <input type="text"
                               class="form-control form-control-sm paro-comentarios" />
                    </td>

                    <td class="text-center">
                        <button type="button"
                                class="btn btn-sm btn-danger btnEliminarFila">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
        `;

            $('#tablaParos tbody').append(fila);

        });

    }

    generarOpcionesCategorias(selected) {

        let opciones = '';

        GlobalUtil.categoriasParo.forEach(cat => {

            opciones += `
            <option value="${cat.ID_CATEGORIA_PARO}"
                ${cat.ID_CATEGORIA_PARO == selected ? 'selected' : ''}>
                ⛔ ${cat.NOMBRE}
            </option>
        `;
        });

        return opciones;
    }

    async exportarExcelParos() {
        try {
            const table = $('#HistorialParos').DataTable();

            if (!table || table.rows().count() === 0) {
                AlertManager.mostrar('No hay datos para exportar', 'warning');
                return;
            }

            $('#btnExportarParos').html('<span class="spinner-border spinner-border-sm me-2"></span>Exportando...').prop('disabled', true);

            const data = table.rows({ search: 'applied' }).data().toArray();

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Paros de Producción', {
                pageSetup: {
                    paperSize: 9,
                    orientation: 'landscape',
                    fitToPage: true,
                    fitToWidth: 1,
                    fitToHeight: 0
                }
            });

            // 🎨 SECCIÓN 1: ENCABEZADO PRINCIPAL
            worksheet.mergeCells('A1:I1');
            const headerCell = worksheet.getCell('A1');
            headerCell.value = '🛑 REPORTE DE PAROS DE PRODUCCIÓN';
            headerCell.font = { name: 'Segoe UI', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
            headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0058A1' } };
            headerCell.alignment = { vertical: 'middle', horizontal: 'center' };
            worksheet.getRow(1).height = 40;

            // 🎨 SECCIÓN 2: INFO DEL REPORTE
            worksheet.mergeCells('A2:E2');
            const infoCell1 = worksheet.getCell('A2');
            const fechaActual = new Date().toLocaleDateString('es-MX', {
                year: 'numeric', month: 'long', day: 'numeric'
            });
            infoCell1.value = `📅 Fecha de Generación: ${fechaActual}`;
            infoCell1.font = { name: 'Segoe UI', size: 11, bold: true };
            infoCell1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };
            infoCell1.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
            worksheet.getRow(2).height = 25;

            worksheet.mergeCells('F2:I2');
            const infoCell2 = worksheet.getCell('F2');
            infoCell2.value = `📈 Total de Registros: ${data.length}`;
            infoCell2.font = { name: 'Segoe UI', size: 11, bold: true };
            infoCell2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
            infoCell2.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };

            // 🎨 ESPACIO EN BLANCO
            worksheet.getRow(3).height = 10;

            // 🎨 SECCIÓN 3: ENCABEZADOS DE COLUMNAS
            const headerRow = worksheet.getRow(4);
            const headers = [
                { text: '🏭 Planta', width: 20 },
                { text: '🔀 Línea', width: 30 },
                { text: '🏷️ Categoría', width: 20 },
                { text: '👤 Usuario', width: 25 },
                { text: '📅 Fecha Registro', width: 22 },
                { text: '📅 Fecha Fin', width: 22 },
                { text: '⏱️ Duración (Hrs)', width: 18 },
                { text: '💬 Comentarios', width: 35 },
                { text: '🔘 Estado', width: 15 },
            ];

            headers.forEach((header, index) => {
                const col = String.fromCharCode(65 + index);
                worksheet.getColumn(col).width = header.width;

                const cell = headerRow.getCell(index + 1);
                cell.value = header.text;
                cell.font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = {
                    type: 'gradient', gradient: 'angle', degree: 90,
                    stops: [
                        { position: 0, color: { argb: 'FF1976D2' } },
                        { position: 1, color: { argb: 'FF0058A1' } }
                    ]
                };
                cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                cell.border = {
                    top: { style: 'medium', color: { argb: 'FF0058A1' } },
                    left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                    bottom: { style: 'medium', color: { argb: 'FF0058A1' } },
                    right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
                };
            });
            headerRow.height = 35;

            // 🎨 SECCIÓN 4: DATOS CON FORMATO ALTERNADO
            data.forEach((row, index) => {
                const rowNumber = 5 + index;
                const excelRow = worksheet.getRow(rowNumber);
                const isEvenRow = index % 2 === 0;
                const bgColor = isEvenRow ? 'FFFFFFFF' : 'FFF5F5F5';

                let estatusTexto = '';
                switch (row.ESTATUS) {
                    case 'O': estatusTexto = '🔴 Activo'; break;
                    case 'C': estatusTexto = '✅ Cerrado'; break;
                    default: estatusTexto = row.ESTATUS || 'N/A';
                }

                const rowData = [
                    row.PLANTA || 'N/A',
                    row.LINEA_PRODUCCION_DESC || 'N/A',
                    row.CATEGORIA || 'N/A',
                    row.USUARIO || 'N/A',
                    row.FECHA_PARO_STRING || 'N/A',
                    row.FECHA_REANUDACION_STRING || 'N/A',
                    row.DURACION_HRS ? `${row.DURACION_HRS} HRS` : 'En curso',
                    row.COMENTARIOS || '',
                    estatusTexto
                ];

                rowData.forEach((value, colIndex) => {
                    const cell = excelRow.getCell(colIndex + 1);
                    cell.value = value;
                    cell.font = { name: 'Segoe UI', size: 10 };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
                    cell.alignment = {
                        vertical: 'middle',
                        horizontal: colIndex <= 1 ? 'left' : 'center',
                        indent: colIndex <= 1 ? 1 : 0,
                        wrapText: true
                    };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                        right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
                    };

                    // 🎨 COLOR ESPECIAL ESTADO (índice 8)
                    if (colIndex === 8) {
                        if (value.includes('Activo')) {
                            cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFC62828' } };
                        } else if (value.includes('Cerrado')) {
                            cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF2E7D32' } };
                        }
                    }

                    // 🎨 COLOR ESPECIAL DURACIÓN "En curso" (índice 6)
                    if (colIndex === 6 && value === 'En curso') {
                        cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFF57F17' } };
                    }
                });

                excelRow.height = 22;
            });

            // 🎨 SECCIÓN 5: FILA DE RESUMEN AL FINAL
            const lastRow = worksheet.getRow(5 + data.length);
            worksheet.mergeCells(`A${lastRow.number}:I${lastRow.number}`);
            const summaryCell = worksheet.getCell(`A${lastRow.number}`);
            summaryCell.value = `✅ Fin del reporte - ${data.length} paros exportados`;
            summaryCell.font = { name: 'Segoe UI', size: 11, bold: true, italic: true, color: { argb: 'FF666666' } };
            summaryCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
            summaryCell.alignment = { vertical: 'middle', horizontal: 'center' };
            summaryCell.border = {
                top: { style: 'medium', color: { argb: 'FF0058A1' } },
                bottom: { style: 'medium', color: { argb: 'FF0058A1' } }
            };
            lastRow.height = 30;

            // 🎨 CONGELAR PANELES
            worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 4 }];

            // 🎨 AUTOFILTRO
            worksheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: 9 } };

            // 📥 GENERAR Y DESCARGAR
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });

            const fecha = new Date().toISOString().split('T')[0];
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Paros_Produccion_${fecha}.xlsx`;
            link.click();

            AlertManager.mostrar('¡Excel exportado con éxito!', 'success');

        } catch (error) {
            console.error('Error al exportar:', error);
            AlertManager.mostrar('Error al exportar: ' + error.message, 'warning');
        } finally {
            $('#btnExportarParos')
                .html('<i class="bi bi-file-earmark-excel-fill me-1"></i>Exportar')
                .prop('disabled', false);
        }
    }

    
}

class AutocompleteParoArticulo {

    constructor(datos_usuario) {

        this.datos_usuario = datos_usuario;

        this.gestionArticulos = new GestionArticulos(
            datos_usuario,
            110
        );

    }

    inicializar() {

        $(document).on(
            'input',
            '.paro-articulo',
            async (e) => {

                const input = $(e.currentTarget);

                input
                    .closest('tr')
                    .removeData('articulo');

                const query = input.val().trim();

                this.removerDropdown(input);

                if (query.length < 2) return;

                try {

                    const articulos =
                        await this.gestionArticulos.obtenerArticulos(
                            query,
                            this.datos_usuario[0].EMAIL,
                            0
                        );

                    this.mostrarSugerencias(
                        input,
                        articulos
                    );


                } catch (error) {

                    console.error(error);

                }

            }
        );

        // 🔥 cerrar dropdown al click afuera
        $(document).on('click', (e) => {

            if (!$(e.target).closest('.autocomplete-wrapper').length) {

                $('.autocomplete-dropdownv2').remove();

            }

        });

    }

    mostrarSugerencias(input, articulos) {

        this.removerDropdown(input);

        if (!articulos || articulos.length === 0) return;

        if (!input.parent().hasClass('autocomplete-wrapper')) {

            input.wrap(
                $('<div class="autocomplete-wrapper position-relative"></div>')
            );

        }

        const dropdown = $(`
            <div class="autocomplete-dropdownv2">
            </div>
        `);

        articulos.forEach(articulo => {

            const item = $(`
                <div class="autocomplete-item">
                    <strong>${articulo.CodigoArticulo}</strong><br>
                    <small>${articulo.DescripcionArticulo}</small>
                </div>
            `);

            item.on('click', () => {
                input.val(articulo.CodigoArticulo);

                const tituloTooltip = `📦 ${articulo.DescripcionArticulo}`;
                input.attr('title', tituloTooltip);

                // Usar API pública de Bootstrap para reutilizar o crear tooltip sin disponer la instancia
                if (input && input[0] && typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
                    try {
                        const tt = bootstrap.Tooltip.getOrCreateInstance(input[0]);

                        if (typeof tt.setContent === 'function') {
                            // Actualizar contenido de forma segura
                            tt.setContent({ '.tooltip-inner': tituloTooltip });
                            // Mantener atributo original por compatibilidad
                            try {
                                input.attr('data-bs-original-title', tituloTooltip);
                            } catch (_) {}
                            if (typeof tt.update === 'function') tt.update();
                        } else {
                            // Fallback: recrear sin usar dispose() para evitar estados intermedios inconsistentes
                            try {
                                tt.dispose && tt.dispose();
                            } catch (e) {
                                console.warn('Error al disponer tooltip (fallback):', e);
                            }
                            try {
                                new bootstrap.Tooltip(input[0]);
                            } catch (e) {
                                console.warn('No se pudo inicializar tooltip (fallback):', e);
                            }
                        }
                    } catch (e) {
                        console.warn('Error gestionando tooltip:', e);
                    }
                }

                const row = input.closest('tr');

                row.data('articulo', articulo);

                dropdown.remove();

            });

            dropdown.append(item);

        });

        input.after(dropdown);

    }

    removerDropdown(input) {

        input
            .siblings('.autocomplete-dropdownv2')
            .remove();

    }

}
