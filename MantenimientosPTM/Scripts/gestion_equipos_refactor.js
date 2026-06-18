// ========================================
// INICIALIZACIÓN
// ========================================
$(document).ready(function () {
    const app = new GestionEquiposApp();
    app.inicializar();

    // Guardar referencia global para acceder desde otros métodos
    window.gestionEquiposApp = app;

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

    console.log('✅ Header fijo inicializado correctamente');
});


// ========================================
// APLICACIÓN PRINCIPAL
// ========================================
class GestionEquiposApp {
    constructor() {
        this.URLBase = "Equipos";
        this.datos_usuario = GlobalUtil.getDatosUsuario();
        this.ArchivosManager = new ArchivosManager(this.URLBase);
        this.equipoManager = new EquipoManager(this.ArchivosManager, this.URLBase, this.datos_usuario);
        this.PDFManager = new PrintSolicitudBaja();
        this.mantenimientoManager = new MantenimientoManager(this.URLBase = "Rutinas", this.datos_usuario);
        this.checklistManager = new ChecklistManager();
    }

    inicializar() {
        // Inicializar UI
        UIManager.inicializarUI();

        // Inicializar managers
        this.ArchivosManager.inicializar();
        this.equipoManager.inicializar();
        this.PDFManager.inicializar();
        this.mantenimientoManager.inicializar();
        this.checklistManager.inicializar();
        this.checklistManager.habilitarEdicionNotas(); // 🔥 NUEVO

        this.configurarEventosArchivos(); //ARCHIVOS
        this.configurarEventosEquipos(); //GESTION EQUIPOS
        this.configurarEventosPDF(); //PDF
        this.configurarEventosMantenimientos();//MANTENIMIENTOS MANAGER
        this.configurarEventosCheckList();//CHECKLIST
        this.agregarEstilosDragDrop(); // 🔥 NUEVO

        console.log('✅ Sistema Completo de Gestión de Equipos inicializado correctamente');
    }

    // Configurar eventos para la carga de archivos
    configurarEventosArchivos() {
        // Validar archivo al seleccionar
        $('#archivoPDF').on('change', (e) => this.ArchivosManager.validarArchivo(e));

        // Remover archivo
        $('#btnRemoverArchivo').on('click', () => this.ArchivosManager.removerArchivo());
    }

    configurarEventosEquipos() {
        // Evento para abrir modal de agregar
        $('#AgregarEquipo').on('click', (e) => this.equipoManager.abrirModalAgregarEquipo(e));

        // Evento para abrir modal de agregar
        $('#AgregarLinea').on('click', (e) => this.equipoManager.abrirModalAgregarLinea(e));

        // Evento para abrir modal de agregar
        $('#AgregarTipoEquipo').on('click', (e) => this.equipoManager.abrirModalAgregarTipoEquipo(e));

        // 🔥 EXPORTAR A EXCEL
        $('#btnExportarExcel').on('click', () => this.equipoManager.exportarExcelEquipos());

        // Evento para editar equipo
        $(document).on('click', '.btn-editar', (e) => this.equipoManager.abrirModaleditarEquipo(e));

        // Evento para pausar/reanudar
        $(document).on('click', '.btn-pausar', (e) => this.equipoManager.abrirModalPausarEquipo(e));

        // Evento para eliminar
        $(document).on('click', '.btn-eliminar', (e) => this.equipoManager.abrirModalSolicitudeliminarEquipo(e));

        // ✅ CORRECTO - Debes pasar "e" como parámetro
        $('#formEquipo').on('submit', (e) => this.equipoManager.guardarEquipo(e));

        // ✅ CORRECTO - Debes pasar "e" como parámetro
        $('#formPausaEquipo').on('submit', (e) => this.equipoManager.PausarEquipo(e, "3"));

        // ✅ CORRECTO - Debes pasar "e" como parámetro
        $('#formBajaActivo').on('submit', (e) => this.equipoManager.SolicitudeliminarEquipo(e));

        // ✅ CORRECTO - Debes pasar "e" como parámetro
        $('#formLinea').on('submit', (e) => this.equipoManager.InsertarLinea(e));

        // ✅ CORRECTO - Debes pasar "e" como parámetro
        $('#formAgregarTipoEquipo').on('submit', (e) => this.equipoManager.InsertarTipoEquipo(e));

        // Botón aplicar filtros
        $('#btnAplicarFiltros').off('click').on('click', function () {
            $('#tablaEquipos').DataTable().ajax.reload();
        });

        // Botón limpiar filtros
        $('#btnLimpiarFiltros').off('click').on('click', function () {
            $('#FiltroLinea').val('');
            $('#FiltroProceso').val('');
            $('#FiltroOrdenTrabajo').val('');
            $('#FiltroFechaInicioMantenimiento').val('');
            $('#tablaEquipos').DataTable().ajax.reload();
        });

        // Opcional: Filtrar automáticamente al cambiar los selects
        $('#FiltroLinea, #FiltroProceso,#FiltroFechaInicioMantenimiento,#FiltroEstatus').off('change').on('change', function () {
            $('#tablaEquipos').DataTable().ajax.reload();
        });

        $("#Area")
            .off('change')
            .on('change', (e) => {

                let Area = $(e.currentTarget).val();

                EquiposUtil.llenarLineas(
                    this.datos_usuario[0].PLANTA,
                    Area,
                    null,
                    "LineaProduccion",
                    null
                );
            });

        $("#FiltroProceso")
            .off('change')
            .on('change', (e) => {

                let Proceso = $(e.currentTarget).val();

                EquiposUtil.llenarLineas(
                    this.datos_usuario[0].PLANTA,
                    Proceso,
                    null,
                    "FiltroLinea",
                    null
                );
            });

        $('#FiltroOrdenTrabajo').on('keypress', function (e) {
            if (e.key === 'Enter') {
                $('#tablaEquipos').DataTable().ajax.reload();
            }
        });
    }

    configurarEventosPDF() {
        $('#btnExportPDF').on('click', () => this.PDFManager.imprimir());
    }

    configurarEventosMantenimientos() {
        // Programar mantenimiento preventivo
        $(document).on('click', '.btn-mp', (e) => this.mantenimientoManager.abrirModalMP(e));

        // Guardar mantenimiento preventivo
        $('#btnGuardarMP').on('click', () => this.mantenimientoManager.guardarMP());

        // Abrir modal Rutina Online
        $(document).on('click', '.btn-rutina-online', (e) => this.mantenimientoManager.abrirModalRutina(e));

        // Guardar Rutina Online
        $('#btnGuardarRutina').on('click', () => this.mantenimientoManager.guardarRutina());
    }

    configurarEventosCheckList() {
        // ============================================
        // EVENTOS DE ACTIVIDADES
        // ============================================

        // Agregar nueva actividad
        $('#btnAgregarActividad').on('click', () => this.checklistManager.agregarActividad());

        // Eliminar actividad
        $(document).on('click', '.btn-eliminar-actividad', (e) => this.checklistManager.eliminarActividad(e));

        // Fijar texto de actividad
        $(document).on('blur', '.input-actividad', (e) => this.checklistManager.fijarTextoActividad($(e.currentTarget)));
        $(document).on('keypress', '.input-actividad', (e) => {
            if (e.which === 13) {
                e.preventDefault();
                this.checklistManager.fijarTextoActividad($(e.currentTarget));
            }
        });

        // Editar texto de actividad con doble clic
        $(document).on('dblclick', '.texto-actividad', (e) => this.checklistManager.editarTextoActividad(e));

        // Editar texto de firma (Realizado/No Realizado)
        $(document).on('dblclick', '.actividad .firma-opcion span.fw-semibold', (e) => this.checklistManager.editarTextoFirma(e));

        // ============================================
        // EVENTOS DE NOTAS 🔥 NUEVO
        // ============================================

        // Agregar nueva nota
        $('#btnAgregarNota').on('click', () => this.checklistManager.agregarNota());

        // Eliminar nota
        $(document).on('click', '.btn-eliminar-nota', (e) => this.checklistManager.eliminarNota(e));

        // Fijar texto de nota
        $(document).on('blur', '.input-nota-nueva', (e) => {
            this.checklistManager.fijarTextoNota($(e.currentTarget));
        });

        $(document).on('keypress', '.input-nota-nueva', (e) => {
            if (e.which === 13) {
                e.preventDefault();
                this.checklistManager.fijarTextoNota($(e.currentTarget));
            }
        });
    }

    // ============================================
    // ESTILOS CSS PARA DRAG & DROP 🔥 NUEVO
    // ============================================
    agregarEstilosDragDrop() {
        const style = $(`
            <style id="estilosDragDrop">
                /* Efecto de arrastrado */
                .dragging {
                    opacity: 0.5;
                    background-color: #e3f2fd;
                    border: 2px dashed #2196F3;
                    transform: scale(0.98);
                }
                
                /* Animación de eliminación */
                .fade-out {
                    opacity: 0;
                    transform: scale(0.8);
                    transition: all 0.4s ease;
                }
                
                /* Actividades */
                .actividad {
                    cursor: move;
                    transition: all 0.2s ease;
                    position: relative;
                }
                
                .actividad:hover {
                    background-color: #f8f9fa;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                
                /* Notas */
                .nota-seccion {
                    cursor: move;
                    transition: all 0.2s ease;
                    border-left: 3px solid transparent;
                    position: relative;
                }
                
                .nota-seccion:hover {
                    background-color: #fff3cd;
                    border-left-color: #ffc107;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.08);
                }
                
                /* Botones de eliminar */
                .btn-eliminar-nota {
                    opacity: 0;
                    transition: opacity 0.2s ease;
                    z-index: 10;
                    padding: 0.25rem 0.5rem !important;
                    font-size: 1rem !important;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .actividad:hover .btn-eliminar-actividad {
                    opacity: 1;
                }
                
                .nota-seccion:hover .btn-eliminar-nota {
                    opacity: 1;
                }
                
                /* Indicador visual de zona de drop */
                .actividad.drag-over {
                    border-top: 3px solid #2196F3;
                }
                
                .nota-seccion.drag-over {
                    border-top: 3px solid #ffc107;
                }
                
                /* Input de nueva nota */
                .input-nota-nueva {
                    font-size: 0.95rem;
                    border: 2px dashed #ffc107;
                }
                
                .input-nota-nueva:focus {
                    border-color: #ff9800;
                    box-shadow: 0 0 0 0.2rem rgba(255, 193, 7, 0.25);
                }
            </style>
        `);

        // Solo agregar si no existe
        if (!$('#estilosDragDrop').length) {
            $('head').append(style);
        }
    }
}

// ========================================
// GESTOR DE UI
// ========================================
class UIManager {
    static inicializarUI() {
        $("#MantenimientosContainer").addClass("selected");
        $("#MantenimientosContainer a").addClass("whiteText");
        $("#mantenimientos-collapse").addClass("show");
        $("#GestionEquiposURL").addClass("selected-item");
        $('#PeriodicidadesMantenimiento').select2({
            placeholder: 'Seleccionar periodicidades',
            width: '100%',
            closeOnSelect: false,
            dropdownParent: $('#equipoModal')
        });

        // Ocultar campos inicialmente
        $('#divDiaMantenimiento').hide();

        //const TopScrool = new TopScrollTable("tablaEquipos", "tablaEquiposContainer", "TblEquiposScrool");
        //TopScrool.createScroll();
        //TopScrool.initScroll();
    }
}

// ========================================
// GESTOR DE EQUIPOS
// ========================================
class EquipoManager {
    constructor(ArchivosManager, URLBase, datos_usuario) {
        this.ArchivosManager = ArchivosManager;
        this.datos_usuario = datos_usuario;
        this.equipoAPausar = null;
        this.equipoAEliminar = null;
        this.equipoAEliminarEstatus = null;
        this.URLBase = URLBase;
        this.PLANTA = "";
        this.usuarioNombre = ""; // ✅ AGREGAR ESTA LÍNEA
        this.allcomplete = false;
        this.correosNotificacion = []; // 🔥 AGREGAR AQUÍ
    }
    // ========================================
    // CARGA LISTADOS
    // ========================================
    inicializar() {
        const datos_usuario = GlobalUtil.getDatosUsuario(); // ✅ Variable local
        this.PLANTA = datos_usuario[0].PLANTA;
        this.usuarioNombre = datos_usuario[0].NOMBRECOMPLETO; // ✅ GUARDAR NOMBRE
        this.Email = datos_usuario[0].EMAIL;
        this.llenarEquipos();
        EquiposUtil.llenarTipoEquipos();
        EquiposUtil.llenarProcesos(this.PLANTA, "Area", "FiltroProceso");
        EquiposUtil.llenarRangoDias();
        this.inicializarCorreos(); // 🔥 AGREGAR AQUÍ
        this.llenarPeriodicidad("PeriodicidadesMantenimiento");
        console.log('✅ EquipoManager inicializada correctamente');
    }

    // ══════════════════════════════════════
    // 📧 GESTIÓN DE CORREOS DE NOTIFICACIÓN
    // ══════════════════════════════════════
    inicializarCorreos() {
        $("#btnAgregarCorreo").off("click").on("click", () => this.agregarCorreo());
        $("#inputCorreoNotificacion").off("keydown").on("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                this.agregarCorreo();
            }
        });
    }

    agregarCorreo() {
        const input = $("#inputCorreoNotificacion");
        const correo = input.val().trim().toLowerCase();
        const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        // Validar formato
        if (!regexEmail.test(correo)) {
            $("#errorCorreo").text("Ingrese un correo válido.").show();
            input.addClass("is-invalid");
            return;
        }

        // Validar duplicado
        if (this.correosNotificacion.includes(correo)) {
            $("#errorCorreo").text("Este correo ya fue agregado.").show();
            input.addClass("is-invalid");
            return;
        }

        // Agregar a la lista
        this.correosNotificacion.push(correo);
        this.renderCorreos();

        // Limpiar input
        input.val('').removeClass("is-invalid");
        $("#errorCorreo").hide();
    }

    renderCorreos() {
        const lista = $("#listaCorreos");
        lista.empty();

        if (this.correosNotificacion.length === 0) {
            lista.html(`
                <span class="text-muted" style="font-size:0.82rem;">
                    <i class="bi bi-info-circle me-1"></i> No hay correos agregados aún.
                </span>
            `);
            return;
        }

        this.correosNotificacion.forEach((correo, index) => {
            lista.append(`
                <span class="badge d-flex align-items-center gap-2 px-3 py-2"
                      style="background: var(--modal-primary-soft); color: var(--modal-primary); 
                             border: 1px solid var(--modal-primary-mid); border-radius: 20px; font-size:0.82rem;">
                    <i class="bi bi-envelope"></i>
                    ${correo}
                    <button type="button" class="btn-remove-correo" data-index="${index}"
                            style="background:none; border:none; padding:0; cursor:pointer; 
                                   color: var(--modal-primary); line-height:1;">
                        <i class="bi bi-x-lg" style="font-size:0.7rem;"></i>
                    </button>
                </span>
            `);
        });

        // Evento eliminar badge
        $(".btn-remove-correo").off("click").on("click", (e) => {
            const index = $(e.currentTarget).data("index");
            this.correosNotificacion.splice(index, 1);
            this.renderCorreos();
        });
    }

    limpiarCorreos() {
        this.correosNotificacion = [];
        $("#inputCorreoNotificacion").val('').removeClass("is-invalid");
        $("#errorCorreo").hide();
        this.renderCorreos();
    }

    llenarEquipos() {
        try {

            // Destruir DataTable si ya existe
            if ($.fn.DataTable.isDataTable('#tablaEquipos')) {
                $('#tablaEquipos').DataTable().destroy();
            }

            function calcularHeaderOffset() {
                // O usar valores fijos según breakpoints
                if (window.innerWidth < 541) {
                    return 200; // Móviles - header más alto porque se apila
                }
                if (window.innerWidth < 640) {
                    return 156; // Móviles - header más alto porque se apila
                }
                if (window.innerWidth < 992) {
                    return 158; // Móviles - header más alto porque se apila
                }
                if (window.innerWidth < 1155) {
                    return 125; // Móviles - header más alto porque se apila
                } else if (window.innerWidth < 1400) {
                    return 118; // Tablets/Desktop pequeño - header apilado
                } else {
                    return 113; // Desktop grande - header en una línea
                }
            }

            // Inicializar DataTable con server-side processing
            const table = $('#tablaEquipos').DataTable({
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
                responsive: {
                    details: {
                        type: 'column',
                        target: 0,
                        renderer: function (api, rowIdx, columns) {
                            var hiddenColumns = columns.filter(function (col) {
                                return col.hidden;
                            });

                            if (hiddenColumns.length === 0) return false;

                            // 🎨 FUNCIÓN PARA NORMALIZAR TÍTULOS (quita acentos y convierte a mayúsculas)
                            function normalizar(texto) {
                                return texto.toUpperCase()
                                    .normalize("NFD")
                                    .replace(/[\u0300-\u036f]/g, "")
                                    .trim();
                            }

                            // 🎨 MAPEO DE ICONOS BOOTSTRAP ICONS
                            function obtenerIcono(titulo) {
                                var tituloNorm = normalizar(titulo);

                                var iconos = {
                                    'PLANTA': 'bi bi-building',
                                    'PROCESO': 'bi bi-gear-fill',
                                    'LINEA': 'bi bi-diagram-3-fill',
                                    'EQUIPO': 'bi bi-tools',
                                    'DESCRIPCION': 'bi bi-card-text',
                                    'CENTRO COSTOS': 'bi bi-cash-coin',
                                    'DOC PM.CALIDAD': 'bi bi-file-earmark-text',
                                    'DOC PMCALIDAD': 'bi bi-file-earmark-text',
                                    'FECHA INICIAL MANTENIMIENTO': 'bi bi-calendar-event',
                                    'PERIODICIDAD MP': 'bi bi-arrow-repeat',
                                    'ESTATUS': 'bi bi-info-circle-fill',
                                    'COMENTARIOS PAUSA': 'bi bi-chat-left-text',
                                    'FECHA DE PAUSA': 'bi bi-calendar-x'
                                };

                                return iconos[tituloNorm] || 'bi bi-circle-fill';
                            }

                            // Construir las filas de detalles
                            var detallesHtml = '';

                            $.each(hiddenColumns, function (i, col) {
                                var title = col.title;
                                var valueContent = col.data || '<em class="text-muted">Sin información</em>';
                                var iconClass = obtenerIcono(title);

                                // Agregar fila al detalle con iconos azules y badges grises
                                detallesHtml +=
                                    '<div class="row mb-3 py-2 border-bottom align-items-center">' +
                                    '  <div class="col-5">' +
                                    '    <i class="' + iconClass + ' me-2" style="font-size: 1.3rem; color: #0D6EFD;"></i>' +
                                    '    <strong>' + title + '</strong>' +
                                    '  </div>' +
                                    '  <div class="col-7">' +
                                    '    <span class="badge px-3 py-2" style="background-color: #F2F2F2; color: #333;">' + valueContent + '</span>' +
                                    '  </div>' +
                                    '</div>';
                            });

                            // Retornar UN SOLO CARD con título "Información del Mantenimiento"
                            return '<div class="card shadow-sm mt-3">' +
                                '  <div class="card-header bg-light">' +
                                '    <h5 class="mb-0">' +
                                '      <i class="bi bi-clipboard-check me-2" style="color: #0D6EFD;"></i>' +
                                '      Información adicional del equipo' +
                                '    </h5>' +
                                '  </div>' +
                                '  <div class="card-body">' +
                                detallesHtml +
                                '  </div>' +
                                '  <div class="card-footer bg-light text-muted">' +
                                '    <small>Última actualización: ' + new Date().toLocaleDateString() + '</small>' +
                                '  </div>' +
                                '</div>';
                        }
                    }
                },
                ajax: {
                    url: `/${this.URLBase}/GetEquipos`,
                    type: "POST",
                    dataType: "json",
                    beforeSend: function () {
                        GlobalUtil.mostrarLoader(true);
                    },
                    complete: function () {
                        GlobalUtil.mostrarLoader(false);
                    },
                    data: (d) => {
                        return $.extend({}, d, {
                            "FiltroUsuario": this.Email || null,
                            "FiltroPlanta": this.PLANTA || null,
                            "FiltroLinea": $("#FiltroLinea").val() || null,
                            "FiltroArea": $("#FiltroProceso").val() || null,
                            "FiltroOrdenTrabajo": $("#FiltroOrdenTrabajo").val() || null,
                            "FiltroFechaInicioMantenimiento": $("#FiltroFechaInicioMantenimiento").val() || null,
                            "FiltroEstatus": $("#FiltroEstatus").val()
                        });
                    },
                    dataSrc: (json) => {
                        return json.data;
                    }
                },
                columns: [
                    // 👇 Columna control responsive
                    {
                        className: 'dtr-control text-center',
                        orderable: false,
                        data: null,
                        defaultContent: '',
                        width: '50px'
                    },

                    // 👇 Acciones
                    {
                        data: null,
                        orderable: false,
                        className: 'all',
                        render: function (data, type, row) {
                            var iconpause = "";
                            var iconpausedesign = "";
                            var iconpausetitle = "";

                            if (row.Estatus == "En Pausa") {
                                iconpause = "bi bi-play";
                                iconpausedesign = "btn-success";
                                iconpausetitle = "Reanudar";
                            }
                            else {
                                iconpause = "bi bi-pause";
                                iconpausedesign = "btn-ptm-pausar";
                                iconpausetitle = "Pausar";
                            }

                            if (row.Estatus != "Inactivo")
                                return `<button class="btn btn-sm ${iconpausedesign} btn-pausar" data-id="${row.IdEquipo}" title="${iconpausetitle}">
                            <i class="${iconpause}"></i>
                            </button>
                            <button class="btn btn-sm btn-ptm-edit btn-editar" data-id="${row.IdEquipo}" title="Editar">
                                <i class="bi bi-pencil-square"></i>
                            </button>
                            <button class="btn btn-sm btn-ptm-eliminar btn-eliminar" data-id="${row.IdEquipo}" title="Eliminar">
                                <i class="bi bi-trash"></i>
                            </button>
                            <button class="btn btn-sm btn-ptm-rutina btn-rutina-online" data-id="${row.IdEquipo}" title="Rutina Online">
                                <i class="bi bi-file-text"></i>
                            </button>`;
                            else
                                return ``;
                        }
                    },

                    // Planta
                    {
                        data: "Planta",
                        render: function (data) {
                            return `<i class="bi bi-building me-1 text-muted"></i>${data || ''}`;
                        }
                    },

                    // Área
                    {
                        data: "Area",
                        render: function (data) {
                            return `<i class="bi bi-diagram-3 me-1 text-muted"></i>${data || ''}`;
                        }
                    },

                    // Línea
                    {
                        data: "LineaProduccion",
                        render: function (data) {
                            return `<i class="bi bi-arrow-repeat me-1 text-muted"></i>${data || ''}`;
                        }
                    },

                    // Equipo
                    {
                        data: "NombreEquipo",
                        render: function (data) {
                            return `<i class="bi bi-gear-fill me-1 text-muted"></i>${data || ''}`;
                        }
                    },

                    // Descripción
                    {
                        data: "DescripcionEquipo",
                        render: function (data) {
                            return `<i class="bi bi-card-text me-1 text-muted"></i>${data || ''}`;
                        }
                    },

                    // Centro Costos
                    {
                        data: "CentroCostos",
                        render: function (data) {
                            return `<i class="bi bi-cash-stack me-1 text-muted"></i>${data || ''}`;
                        }
                    },

                    // Documento PM
                    {
                        data: "NumeroDocPmCalidad",
                        render: function (data) {
                            return `<i class="bi bi-file-earmark-text me-1 text-muted"></i>${data || ''}`;
                        }
                    },

                    // Fecha Inicio
                    {
                        data: "FechaInicioMant",
                        render: function (data) {
                            return `<i class="bi bi-calendar-event me-1 text-muted"></i>${data || ''}`;
                        }
                    },

                    // Periodicidad
                    {
                        data: null,
                        render: function (data, type, row) {

                            if (!row.PeriodicidadMantenimiento) {
                                return `<i class="bi bi-calendar-week me-1 text-muted"></i> N/A`;
                            }

                            let periodicidades = row.PeriodicidadMantenimiento
                                .split(',')
                                .map(x => x.trim())
                                .filter(x => x);

                            let html = `<div class="d-flex flex-wrap justify-content-center gap-1">
                                ${periodicidades.map(p => `
                                    <span class="badge bg-blue-ptm badge-custom">
                                    <i class="bi bi-calendar-week me-1 text-white"></i>
                                        ${p} (${row.DiaInicioMant}-${row.DiaFinMant})
                                    </span>
                                `).join('')}
                            </div>`;

                            return `${html}`;
                        }
                    },

                    // Estatus (Badge)
                    {
                        data: "Estatus",
                        render: function (data, type, row) {
                            let badge = '';

                            switch (data) {
                                case '1':
                                case 'Activo':
                                    badge = `<span class="badge bg-blue-ptm badge-custom">
                            <i class="bi bi-check-circle me-1"></i>Activo
                         </span>`;
                                    break;

                                case '2':
                                case 'Inactivo':
                                    badge = `<span class="badge bg-danger badge-custom">
                            <i class="bi bi-x-circle me-1"></i>Inactivo
                         </span>`;
                                    break;

                                case '3':
                                case 'Pausado':
                                case 'En Pausa':
                                    badge = `<span class="badge bg-warning text-dark badge-custom">
                            <i class="bi bi-pause-circle me-1"></i>Pausado
                         </span>`;
                                    break;

                                default:
                                    badge = `<span class="badge bg-danger text-white badge-custom">
                            <i class="bi bi-info-circle me-1"></i>${data}
                         </span>`;
                            }

                            return badge;
                        }
                    },

                    // Comentarios Pausa
                    {
                        data: null,
                        orderable: false,
                        render: function (data, type, row) {
                            return (row.Estatus == "En Pausa")
                                ? `<i class="bi bi-chat-left-text me-1 text-muted"></i>${row.Comentarios || ''}`
                                : "";
                        }
                    },

                    // Fecha Pausa
                    {
                        data: null,
                        orderable: false,
                        render: function (data, type, row) {
                            return (row.Estatus == "En Pausa")
                                ? `<i class="bi bi-calendar-x me-1 text-muted"></i>${row.FechaPausa || ''}`
                                : "";
                        }
                    }

                ],
                columnDefs: [
                    // Centrado de columnas
                    { className: "text-center", targets: '_all' },

                    // Columnas no ordenables
                    { orderable: false, targets: [0, 1, 10, 12, 13] },

                    // 🎯 PRIORIDADES RESPONSIVE (menor número = más importante, se oculta último)
                    { responsivePriority: 1, targets: 0 },   // Control +/- (siempre visible)
                    { responsivePriority: 2, targets: 1 },   // Acciones (siempre visible)
                    { responsivePriority: 3, targets: 5 },   // Nombre Equipo (importante)
                    { responsivePriority: 4, targets: 11 },  // Estatus (importante)
                    { responsivePriority: 5, targets: 2 },   // Planta
                    { responsivePriority: 6, targets: 3 },   // Proceso/Area
                    { responsivePriority: 7, targets: 4 },   // Línea
                    { responsivePriority: 8, targets: 6 },   // Descripción
                    { responsivePriority: 9, targets: 9 },   // Fecha Inicio Mant
                    { responsivePriority: 10, targets: 10 }, // Periodicidad MP
                    { responsivePriority: 11, targets: 7 },  // Centro Costos
                    { responsivePriority: 12, targets: 8 },  // Doc PM Calidad
                    { responsivePriority: 13, targets: 12 }, // Comentarios Pausa
                    { responsivePriority: 14, targets: 13 }  // Fecha de Pausa
                ],
                ordering: false,
                info: true,
                bPaginate: true,
                pageLength: 1000,
                lengthMenu: [[10, 25, 50, 100, 200, 500, 1000], [10, 25, 50, 100, 200, 500, 1000]],
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
                    emptyTable: "No hay datos disponibles en la tabla"
                },
                createdRow: function (row, data, dataIndex) {
                    $(row).attr('data-id', data.IdEquipo);
                    $(row).attr('data-planta', data.Planta);
                    $(row).attr('data-proceso', data.Area);
                    $(row).attr('data-linea', data.LineaProduccion);
                    $(row).attr('data-estatus', data.Estatus || 'Activo');
                    $(row).attr('data-comentarios', data.Comentarios || '');

                    $(row).data('equipo-completo', {
                        id: data.IdEquipo,
                        planta: data.Planta,
                        nombreEquipo: data.NombreEquipo,
                        descripcion: data.DescripcionEquipo,
                        tipoEquipo: data.TipoEquipo,
                        idarea: data.IdArea,
                        area: data.Area,
                        idlineaproduccion: data.IdLineaProduccion,
                        linea: data.LineaProduccion,
                        centroCostos: data.CentroCostos || '',
                        numeroDocPm: data.NumeroDocPmCalidad || '',
                        estatus: data.Estatus || '1',
                        comentarios: data.Comentarios || '',
                        fechaPausa: data.FechaPausa || ''
                    });

                    $(row).data('periodicidad', {
                        tipo: data.PeriodicidadMantenimiento,
                        id: data.IdPeriodicidadMantenimiento,
                        inicio: data.DiaInicioMant,
                        fin: data.DiaFinMant,
                        fecha: data.FechaInicioMant
                    });
                },
                drawCallback: function () {
                    const table = this.api();

                    // 👇 esperamos a que DataTables + Responsive terminen
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {

                            const visibleColumns = table.columns(':visible').count();

                            const emptyCell = $('#tablaEquipos tbody td.dataTables_empty');

                            if (emptyCell.length) {
                                emptyCell.attr('colspan', 14);
                            }

                        });
                    });

                    table.columns.adjust();
                }
            });

            // ✅ AQUÍ VA
            $('#tablaEquipos')
                .off('draw.dt.emptyFix') // 👈 evita duplicados si reinicializas
                .on('draw.dt.emptyFix', function () {

                    const visibleColumns = table.columns(':visible').count();

                    $('#tablaEquipos tbody td.dataTables_empty')
                        .attr('colspan', visibleColumns);
                });

            // ✅ IMPORTANTE: Ajustar cuando cambia el tamaño de ventana
            $(window).on('resize', function () {
                if ($.fn.DataTable.isDataTable('#tablaEquipos')) {
                    const nuevoOffset = calcularHeaderOffset();
                    $('#tablaEquipos').DataTable().fixedHeader.headerOffset(nuevoOffset);
                    $('#tablaEquipos').DataTable().fixedHeader.adjust();
                }
            });

            return table;

        } catch (error) {
            AlertManager.mostrar('No es posible mostrar los equipos: ' + error, 'warning');
        }
    }

    llenarPeriodicidad(Fieldoptiongroup) {
        const selectElement = $(`#${Fieldoptiongroup}`);

        $.ajax({
            url: `/${GlobalUtil.URLBaseEquipos}/GetPeriodicidadesMP`,
            type: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            success: (data) => {
                if (data.Status === 'OK') {
                    let periodicidadData = data.Data;

                    if (typeof periodicidadData === 'string') {
                        try {
                            periodicidadData = JSON.parse(periodicidadData);
                        } catch (e) {
                            console.warn('No se pudo parsear Data:', e);
                        }
                    }

                    selectElement.empty();

                    periodicidadData.forEach(p => {
                        selectElement.append(
                            `<option value="${p.ID_PERIODICIDAD}">${p.DESCRIPCION}</option>`
                        );
                    });

                } else if (data.Status === 'NO') {
                    AlertManager.mostrar(data.Message, 'warning');
                } else if (data.Status === 'warning') {
                    AlertManager.mostrar('Error: ' + data.Message, 'warning');
                }
            },
            error: () => {
                AlertManager.mostrar(
                    'Error de conexión. No fue posible obtener el listado de periodicidades.',
                    'warning'
                );
            }
        });
    }

    // Método auxiliar para cargar datos de periodicidad
    cargarPeriodicidad(periodicidadData) {

        if (!periodicidadData || !periodicidadData.id) return;

        let periodicidades = periodicidadData.id
            .split(',')
            .map(x => x.trim())
            .filter(x => x !== '');

        $('#PeriodicidadesMantenimiento')
            .val(periodicidades)
            .trigger('change');

        $('#FechaInicioMant')
            .val(this.convertirFechaParaInput(periodicidadData.fecha));

        $('#DiaInicioMant')
            .val(periodicidadData.inicio);

        $('#DiaFinMant')
            .val(periodicidadData.fin);
    }

    // Método auxiliar para convertir fecha de DD/MM/YYYY a YYYY-MM-DD
    convertirFechaParaInput(fecha) {
        if (!fecha || fecha === '--' || fecha === '') return '';

        try {
            // Si ya viene en formato YYYY-MM-DD
            if (fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
                return fecha;
            }

            // Si viene en formato DD/MM/YYYY
            if (fecha.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                const partes = fecha.split('/');
                return `${partes[2]}-${partes[1]}-${partes[0]}`;
            }

            // Si viene en formato MM/DD/YYYY
            if (fecha.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                const date = new Date(fecha);
                if (!isNaN(date.getTime())) {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                }
            }

            return '';
        } catch (error) {
            console.error('Error al convertir fecha:', error);
            return '';
        }
    }

    // ========================================
    // APERTURA MODAL
    // ========================================

    abrirModalAgregarEquipo(e) {
        e.preventDefault();
        $('#modalEquipoTitulo').text('Agregar Nuevo Equipo');
        $("#btnGuardarEquipo").html(`<i class="bi bi-floppy-fill me-1"></i>Guardar`);
        $('#formEquipo')[0].reset();
        ValidationManager.limpiarValidacion('#formEquipo'); // AGREGAR ESTA LÍNEA
        $('#IdEquipo').val('');
        $('#Planta').val(`${this.PLANTA}`);
        var fechaActual = new Date().toISOString().split('T')[0];
        $("#FechaInicioMant").attr("min", fechaActual);
        $("#TipoEquipo").prop("disabled", false);
        $("#PeriodicidadMantenimiento").prop("disabled", false);
        $("#DiaInicioMant").prop("disabled", false);
        $("#DiaFinMant").prop("disabled", false);
        $("#FechaInicioMant").attr("readonly", false);
        $('#equipoModal').modal('show');
    }

    abrirModaleditarEquipo(e) {
        try {
            const id = $(e.currentTarget).data('id');
            const fila = $(`tr[data-id="${id}"]`);
            ValidationManager.limpiarValidacion("#formEquipo");
            // Validar que la fila existe
            if (!fila.length) {
                AlertManager.mostrar('No se pudo encontrar el equipo seleccionado', 'warning');
                return;
            }

            // Obtener todos los datos guardados en la fila
            const equipoData = fila.data('equipo-completo');
            const periodicidadData = fila.data('periodicidad');

            // Validar que los datos existen
            if (!equipoData) {
                AlertManager.mostrar('Error al cargar los datos del equipo', 'warning');
                return;
            }


            // Cambiar título del modal
            $('#modalEquipoTitulo').html('<i class="bi bi-pencil-square me-2"></i>Editar Equipo');

            // Limpiar alertas previas
            $('#alertEquipoContainer').empty();

            // Cargar datos básicos del equipo
            $('#IdEquipo').val(equipoData.id);
            $('#Planta').val(equipoData.planta);
            $('#NombreEquipo').val(equipoData.nombreEquipo);
            $('#DescripcionEquipo').val(equipoData.descripcion);
            $('#TipoEquipo').val(equipoData.tipoEquipo);
            $('#CentroCostos').val(equipoData.centroCostos);
            $('#NumeroDocPmCalidad').val(equipoData.numeroDocPm);
            $('#Estatus').val(equipoData.estatus);
            $('#Comentarios').val(equipoData.comentarios);
            $('#Area').val(equipoData.idarea);
            //Seleccionar la linea
            EquiposUtil.llenarLineas(
                this.datos_usuario[0].PLANTA,
                equipoData.idarea,
                1,
                "LineaProduccion",
                null,
                () => {

                    $('#LineaProduccion')
                        .val(equipoData.idlineaproduccion);
                }
            );

            // Cargar datos de periodicidad
            this.cargarPeriodicidad(periodicidadData);

            $("#btnGuardarEquipo").html(`<i class="bi bi-arrow-clockwise me-1"></i>Actualizar`);
            // Mostrar modal
            $('#equipoModal').modal('show');

        } catch (error) {
            AlertManager.mostrar('Error al cargar los datos del equipo: ' + error.message, 'warning');
        }
    }

    abrirModalSolicitudeliminarEquipo(e) {
        e.stopPropagation(); // ✅ AGREGAR ESTO
        const id = $(e.currentTarget).data('id');
        const fila = $(`tr[data-id="${id}"]`);
        this.equipoAEliminar = id;

        // Validar que la fila existe
        if (!fila.length) {
            AlertManager.mostrar('No se pudo encontrar el equipo seleccionado', 'warning');
            return;
        }

        // Obtener todos los datos guardados en la fila
        const equipoData = fila.data('equipo-completo');

        // Validar que los datos existen
        if (!equipoData) {
            AlertManager.mostrar('Error al cargar los datos del equipo', 'warning');
            return;
        }

        //remover archivo PDF cargado anteriormente
        this.ArchivosManager.removerArchivo();

        //Guardar estatus de equipo a eliminar
        this.equipoAEliminarEstatus = equipoData.estatus;

        if (equipoData.estatus == "En Proceso De Baja") {

            $("#formBajaActivo")[0].reset();

            $.ajax({
                url: `/${this.URLBase}/GetSolicitudBajaEquipoProduccion`,
                type: 'GET',
                data: { "ID_EQUIPO": id },
                headers: {
                    'Content-Type': 'application/json'
                },
                success: (data) => {
                    if (data.Status === 'OK') {

                        let responseData = data.Data;
                        if (typeof responseData === 'string') {
                            try {
                                responseData = JSON.parse(responseData);
                            } catch (e) {
                                console.warn('No se pudo parsear Data:', e);
                            }
                        }

                        // Extraer datos de la solicitud e imágenes
                        let SolicitudData = responseData.SolicitudData;
                        if (typeof SolicitudData === 'string') {
                            try {
                                SolicitudData = JSON.parse(SolicitudData);
                            } catch (e) {
                                console.warn('No se pudo parsear SolicitudData:', e);
                            }
                        }
                        // En la parte donde obtienes las imágenes del servidor:
                        const imagenes = responseData.Imagenes || [];

                        // Llenar los campos del formulario
                        let fechaImagen = SolicitudData[0].FECHA_SOLICITUD.slice(0, 10);
                        $("#FechaSolicitud").val(fechaImagen);

                        // 🔥 CARGAR IMÁGENES EXISTENTES EN EL PLUGIN
                        const uploader = $('#uploadArea').data('imageUploader');
                        if (uploader) {
                            uploader.loadExistingImages(imagenes);
                        }

                        const campos = [
                            { selector: "#FechaSolicitud", valor: SolicitudData[0].FECHA_SOLICITUD?.slice(0, 10) },
                            { selector: "#MotivoBaja", valor: SolicitudData[0].MOTIVO_BAJA },
                            { selector: "#CodigoActivo", valor: SolicitudData[0].CODIGO_ACTIVO },
                            { selector: "#DescripcionActivo", valor: SolicitudData[0].DESCRIPCION_ACTIVO },
                            { selector: "#Desecho", valor: SolicitudData[0].DESECHO },
                            { selector: "#TipoActivoFijo", valor: SolicitudData[0].TIPO_ACTIVO_FIJO },
                            { selector: "#Venta", valor: SolicitudData[0].VENTA },
                            { selector: "#Piezas", valor: SolicitudData[0].PIEZAS },
                            { selector: "#Kilos", valor: SolicitudData[0].KILOS },
                            { selector: "#ValorIva", valor: SolicitudData[0].VALOR_IVA },
                            { selector: "#Observacion", valor: SolicitudData[0].OBSERVACION },
                            { selector: "#EncargadoActivos", valor: SolicitudData[0].ENCARGADO_ACTIVOS }
                        ];

                        // Campos que NUNCA deben ser editables
                        const camposReadonly = ["#DescripcionActivo", "#CodigoActivo"];

                        campos.forEach(campo => {
                            const $el = $(campo.selector);
                            const tieneValor = campo.valor !== null && campo.valor !== undefined && campo.valor !== '';

                            $el.val(campo.valor ?? '');

                            // 🔥 Readonly fijo para estos campos, el resto siempre editable
                            $el.prop('readonly', camposReadonly.includes(campo.selector));

                            // Estilo visual si ya tiene valor
                            if (tieneValor) {
                                $el.addClass('campo-con-valor');
                            } else {
                                $el.removeClass('campo-con-valor');
                            }
                        });

                        // 🔥 Habilitar sección DocDelPreview SOLO si todos los campos tienen valor
                        this.allcomplete = campos.every(campo =>
                            campo.valor !== null && campo.valor !== undefined && campo.valor !== ''
                        );

                        if (this.allcomplete) {
                            $('#formBajaActivo').find('#archivoPDF').prop('readonly', false);
                            $('#DocDelPreview').find('input, textarea').prop('readonly', false);
                            $("#archivoPDF").prop("required", true);
                            $("#DocDel").removeClass("d-none");

                            GlobalUtil.scrollToHighlight({
                                container: "#formBajaActivo",
                                target: "#DocDel",
                                duration: 2000,
                                highlightClass: "highlight-required"
                            });

                            $("#DocDelPreview").removeClass("d-none");

                            $("#NotificacionesEmailContainer").removeClass("d-none");
                        } else {
                            // Si faltan campos, DocDelPreview permanece bloqueado
                            $('#formBajaActivo').find('#archivoPDF').prop('readonly', true);
                            $('#DocDelPreview').find('input, textarea').prop('readonly', true);
                            $("#archivoPDF").prop("required", false);

                            $("#DocDel").addClass("d-none");

                            GlobalUtil.scrollToHighlight({
                                container: "#formBajaActivo",
                                target: "#DocHeader",
                                duration: 2000,
                                highlightClass: "highlight-blue"
                            });

                            $("#DocDelPreview").addClass("d-none");
                            $("#NotificacionesEmailContainer").addClass("d-none");
                        }

                        // 🔥 Verificar si ya hay imágenes cargadas
                        const tieneImagenes = $("#previewArea").find(".preview-item").length > 0;

                        if (tieneImagenes) {
                            $("#clearAll").hide();
                            $("#uploadArea").addClass("upload-area-disabled");
                            $("#uploadInfo").hide();
                        } else {
                            $("#clearAll").hide();
                            $("#uploadArea").removeClass("upload-area-disabled");
                            $("#uploadInfo").show();

                            // ✅ Habilitar upload limpio
                            const uploader = $('#uploadArea').data('imageUploader');
                            if (uploader && uploader.enableUpload) {
                                uploader.enableUpload();
                            }
                        }

                    } else if (data.Status === 'NO') {
                        AlertManager.mostrar(data.Message, 'warning');
                    } else if (data.Status === 'warning') {
                        AlertManager.mostrar('Error: ' + data.Message, 'warning');
                    }
                },
                error: function (xhr, status, error) {
                    AlertManager.mostrar('Error de conexión. No fue posible obtener el listado de líneas.', 'warning');
                }
            });
        }
        else {

            $("#formBajaActivo")[0].reset();
            ValidationManager.limpiarValidacion('#formBajaActivo'); // AGREGAR ESTA LÍNEA
            let Fecha = DateUtils.obtenerFechaActual();
            // Cargar datos básicos del equipo
            $('#formBajaActivo').find('input,textarea').prop('readonly', false);
            $('#CodigoActivo').val(equipoData.nombreEquipo);
            $('#CodigoActivo').attr("readonly", true);
            $('#DescripcionActivo').val(equipoData.descripcion);
            $('#DescripcionActivo').attr("readonly", true);
            $("#FechaSolicitud").val(Fecha);
            $("#FechaSolicitud").attr("readonly", true);
            $("#DocDel").addClass("d-none");
            $("#DocDelPreview").addClass("d-none");
            $("#archivoPDF").removeAttr("required");

            // Limpiar preview de imágenes
            $("#previewArea").empty();
            $("#clearAll").hide();
            $("#uploadArea").removeClass("upload-area-disabled");
            $("#uploadInfo").show();

            //Ocultar área de email
            $("#NotificacionesEmailContainer").addClass("d-none");

            // ✅ HABILITAR UPLOAD LIMPIO
            const uploader = $('#uploadArea').data('imageUploader');
            if (uploader && uploader.enableUpload) {
                uploader.enableUpload();
            }

            GlobalUtil.scrollToHighlight({
                container: "#formBajaActivo",
                target: "#DocHeader",
                duration: 2000,
                highlightClass: "highlight-blue"
            });
        }

        $('#modalBajaActivo').modal('show');
    }

    abrirModalAgregarLinea(e) {
        e.preventDefault();
        $('#formLinea')[0].reset();
        ValidationManager.limpiarValidacion('#formLinea'); // AGREGAR ESTA LÍNEA
        $('#PlantaLine').val(`${this.PLANTA}`);
        $('#lineaModal').modal('show');
    }

    abrirModalAgregarTipoEquipo(e) {
        e.preventDefault();
        $('#formAgregarTipoEquipo')[0].reset();
        ValidationManager.limpiarValidacion('#formAgregarTipoEquipo'); // AGREGAR ESTA LÍNEA
        $('#modalAgregarTipoEquipo').modal('show');
    }

    abrirModalPausarEquipo(e) {
        const id = $(e.currentTarget).data('id');
        const fila = $(`tr[data-id="${id}"]`);
        const nombreEquipo = fila.find('td:eq(1)').text();
        const estatus = fila.data('estatus') || 'Activo';
        const btn = $(e.currentTarget);

        this.equipoAPausar = id;

        if (estatus === 'Activo') {
            $('#modalPausarEquipoLabel').text('Pausar Equipo');
            $('#nombreEquipoPausar').text(nombreEquipo);
            $('#razonPausa').val('');
            $('#btnConfirmarPausa').html('<i class="bi bi-pause"></i> Pausar Equipo');
            $("#formPausaEquipo")[0].reset();
            ValidationManager.limpiarValidacion('#formPausaEquipo'); // AGREGAR ESTA LÍNEA
            $('#modalPausarEquipo').modal('show');
        } else if (estatus === 'En Pausa') {
            this.PausarEquipo(e, "1");
        }
    }

    // ========================================
    // INSERCCION DE DATOS
    // ========================================

    guardarEquipo(e) {
        e.preventDefault(); // Evitar el submit tradicional

        // Validar formulario
        if (!ValidationManager.validarFormulario('#formEquipo')) {
            AlertManager.mostrar('Por favor, complete correctamente todos los campos', 'warning', 'alertEquipoContainer');
            return false;
        }

        const datos = GlobalUtil.obtenerDatosAnyFormulario("formEquipo");
        datos.Usuario = this.Email;
        const periodicidadTexto = DateUtils.formatearPeriodicidad(
            datos.PeriodicidadMantenimiento,
            datos.DiaInicioMant,
            datos.DiaFinMant,
            datos.FechaInicioMant
        );

        if (datos.IdEquipo) {
            this.actualizarEquipo(datos);
        } else {
            this.agregarNuevoEquipo(datos, periodicidadTexto);
        }

        return false; // Por si acaso
    }

    agregarNuevoEquipo(datos, periodicidadTexto) {
        $("#btnGuardarEquipo").html('<span class="spinner-border spinner-border-sm me-2"></span>Guardando...');
        $("#btnGuardarEquipo").prop("disabled", true);

        $.ajax({
            url: `/${this.URLBase}/InsertaEquiposProduccion`,
            type: 'POST',
            contentType: 'application/json; charset=utf-8',
            data: JSON.stringify(datos),
            dataType: 'json',
            success: (response) => {
                if (response.Status === 'SI') {
                    $("#btnGuardarEquipo").html('<i class="bi bi-check-circle-fill me-2 text-white"></i>Equipo agregado correctamente');
                    $("#btnGuardarEquipo").prop("disabled", false);

                    // Guardar el valor antes del reset
                    var valorAMantener = $("#Planta").val();

                    // Hacer el reset
                    $("#formEquipo")[0].reset();
                    $("#formEquipo").removeClass("was-validated");

                    // Restaurar el valor
                    $("#Planta").val(valorAMantener);

                    // 🔥 RECARGAR LA TABLA DATATABLE
                    $('#tablaEquipos').DataTable().ajax.reload(null, false);

                    setTimeout(function () {
                        $("#btnGuardarEquipo").html('<i class="bi bi-save me-1"></i>Guardar');
                    }, 3000);

                } else {
                    $("#btnGuardarEquipo").html('<i class="bi bi-save me-1"></i>Guardar');
                    $("#btnGuardarEquipo").prop("disabled", false);
                    AlertManager.mostrar(response.Message || 'Error al agregar el equipo', 'warning', "alertEquipoContainer");
                }
            },
            error: (xhr, status, error) => {
                $("#btnGuardarEquipo").html('<i class="bi bi-save me-1"></i>Guardar');
                $("#btnGuardarEquipo").prop("disabled", false);
                AlertManager.mostrar('Error al conectar con el servidor', 'warning', "alertEquipoContainer");
            }
        });
    }

    actualizarEquipo(datos) {
        $("#btnGuardarEquipo").html('<span class="spinner-border spinner-border-sm me-2"></span>Actualizando...');
        $("#btnGuardarEquipo").prop("disabled", true);

        $.ajax({
            url: `/${this.URLBase}/AcualizaEquiposProduccion`,
            type: 'POST',
            contentType: 'application/json; charset=utf-8',
            data: JSON.stringify(datos),
            dataType: 'json',
            success: (response) => {
                if (response.Status === 'SI') {
                    $("#btnGuardarEquipo").html('<i class="bi bi-check-circle-fill me-2 text-white"></i>Equipo actualizando correctamente.');

                    // Guardar el valor antes del reset
                    var valorAMantener = $("#Planta").val();

                    // Hacer el reset
                    $("#formEquipo")[0].reset();
                    $("#formEquipo").removeClass("was-validated");

                    // Restaurar el valor
                    $("#Planta").val(valorAMantener);

                    // 🔥 RECARGAR LA TABLA DATATABLE
                    $('#tablaEquipos').DataTable().ajax.reload(null, false);

                    setTimeout(function () {
                        $("#btnGuardarEquipo").prop("disabled", false);
                        $("#equipoModal").modal('hide');
                    }, 3000);

                } else {
                    $("#btnGuardarEquipo").prop("disabled", false);
                    AlertManager.mostrar(response.Message || 'Error al agregar el equipo', 'warning', "alertEquipoContainer");
                    $("#btnGuardarEquipo").html(`<i class="bi bi-arrow-clockwise me-1"></i>Actualizar`);
                }
            },
            error: (xhr, status, error) => {
                $("#btnGuardarEquipo").prop("disabled", false);
                $("#btnGuardarEquipo").html(`<i class="bi bi-arrow-clockwise me-1"></i>Actualizar`);
                AlertManager.mostrar('Error al conectar con el servidor', 'warning', "alertEquipoContainer");
            }
        });
    }

    SolicitudeliminarEquipo(e) {
        e.preventDefault();

        if (!ValidationManager.validarFormulario('#formBajaActivo')) {
            AlertManager.mostrar('Por favor, complete correctamente todos los campos', 'warning', 'alertSolicitudBajaContainer');
            return false;
        }

        $("#btnGuardarBaja").html('<span class="spinner-border spinner-border-sm me-2"></span>Guardando...');
        $("#btnGuardarBaja").prop("disabled", true);
        $("#btnCancelarBaja").prop("disabled", true);
        $("#btnExportPDF").prop("disabled", true);

        var datos = GlobalUtil.obtenerDatosAnyFormulario("formBajaActivo");
        var formData = new FormData();

        formData.append('data', JSON.stringify({
            ...datos,
            IdEquipo: this.equipoAEliminar,
            UsuarioCreacion: this.Email,
            CorreosNotificacion: this.correosNotificacion.join(',') // 🔥 CORREOS
        }));

        const files = window.imagenesRutina || [];
        for (let i = 0; i < files.length; i++) {
            formData.append('imagenes', files[i]);
        }

        const archivoPDF = $("#archivoPDF")[0]?.files[0];
        if (archivoPDF) {
            formData.append('archivoPDF', archivoPDF);
        }

        $.ajax({
            url: `/${this.URLBase}/InsertaSolicitudBajaEquipoProduccion`,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: (response) => {
                if (response.Status === 'SI') {

                    $("#btnGuardarBaja").html('<i class="bi bi-check-circle-fill me-2 text-white"></i>Datos guardados correctamente.');
                    $("#formBajaActivo")[0].reset();
                    $("#formBajaActivo").removeClass("was-validated");
                    $('#tablaEquipos').DataTable().ajax.reload(null, false);
                    $("#clearAll").click();

                    setTimeout(() => {
                        this.limpiarCorreos();
                        $("#btnGuardarBaja").prop("disabled", false);
                        $("#btnCancelarBaja").prop("disabled", false);
                        $("#btnExportPDF").prop("disabled", false);
                        $("#btnGuardarBaja").html('<i class="bi bi-save-fill me-2"></i>Guardar');
                        $("#modalBajaActivo").modal("hide");
                    }, 3000);

                } else {
                    $("#btnGuardarBaja").html('<i class="bi bi-save me-1"></i>Guardar');
                    $("#btnGuardarBaja").prop("disabled", false);
                    $("#btnCancelarBaja").prop("disabled", false);
                    $("#btnExportPDF").prop("disabled", false);
                    AlertManager.mostrar(response.Message || 'Error al solicitar la baja del equipo', 'warning', "alertSolicitudBajaContainer");
                }
            },
            error: () => {
                $("#btnGuardarBaja").html('<i class="bi bi-save me-1"></i>Guardar');
                $("#btnGuardarBaja").prop("disabled", false);
                $("#btnCancelarBaja").prop("disabled", false);
                $("#btnExportPDF").prop("disabled", false);
                AlertManager.mostrar('Error al conectar con el servidor', 'warning', "alertSolicitudBajaContainer");
            }
        });
    }

    PausarEquipo(e, ESTATUS) {

        e.preventDefault();

        // Validar formulario solo si se esta pausando el equipo
        if (ESTATUS == "3") {
            if (!ValidationManager.validarFormulario('#formPausaEquipo')) {
                AlertManager.mostrar('Por favor, complete correctamente todos los campos', 'warning', 'alertPauseEquipoContainer');
                return false;
            }
        }

        let datos =
        {

            ID_EQUIPO: this.equipoAPausar,
            COMENTARIOS: $('#ComentariosPausa').val(),
            ESTATUS: ESTATUS
        };

        $("#btnConfirmarPausa").html('<span class="spinner-border spinner-border-sm me-2"></span>Pausando...');
        $("#btnConfirmarPausa").prop("disabled", true);

        $.ajax({
            url: `/${this.URLBase}/PausarEquiposProduccion`,
            type: 'POST',
            contentType: 'application/json; charset=utf-8',
            data: JSON.stringify(datos),
            dataType: 'json',
            success: (response) => {
                if (response.Status === 'SI') {

                    $("#btnConfirmarPausa").html('<i class="bi bi-check-circle-fill me-2 text-white"></i>Equipo pausado correctamente');

                    // 🔥 RECARGAR LA TABLA DATATABLE
                    $('#tablaEquipos').DataTable().ajax.reload(null, false);
                    this.equipoAPausar = null;

                    setTimeout(function () {
                        $("#btnConfirmarPausa").prop("disabled", false);
                        $("#ComentariosPausa").val("");
                        $("#modalPausarEquipo").modal("hide");
                    }, 3000);

                    if (ESTATUS == "1")
                        AlertManager.mostrar('Equipo reanudado correctamente.', 'success');

                } else {
                    $("#btnConfirmarPausa").html('<i class="bi bi-pause me-1"></i>Guardar');
                    $("#btnConfirmarPausa").prop("disabled", false);
                    AlertManager.mostrar(response.Message || 'Error al pausar el equipo', 'warning', "alertPauseEquipoContainer");
                }
            },
            error: (xhr, status, error) => {
                $("#btnConfirmarPausa").html('<i class="bi bi-pause me-1"></i>Guardar');
                $("#btnConfirmarPausa").prop("disabled", false);
                AlertManager.mostrar('Error al conectar con el servidor', 'warning');
            }
        });
    }

    InsertarLinea(e) {

        e.preventDefault(); // Evitar el submit tradicional

        // Validar formulario
        if (!ValidationManager.validarFormulario('#formLinea')) {
            AlertManager.mostrar('Por favor, complete correctamente todos los campos', 'warning', 'alertLineaContainer');
            return false;
        }

        // Recopilar los datos
        const datos = {
            Planta: this.PLANTA, // ✅ CAMBIAR ESTA LÍNEA
            Linea: $("#Linea").val()
        };


        $("#btnGuardarLinea").html('<span class="spinner-border spinner-border-sm me-2"></span>Guardando...');
        $("#btnGuardarLinea").prop("disabled", true);

        $.ajax({
            url: `/${this.URLBase}/InsertarLinea`,
            type: 'POST',
            contentType: 'application/json; charset=utf-8',
            data: JSON.stringify(datos),
            dataType: 'json',
            success: (response) => {
                if (response.Status === 'SI') {
                    $("#btnGuardarLinea").html('<i class="bi bi-check-circle-fill me-2 text-white"></i>Línea agregada correctamente');
                    $("#btnGuardarLinea").prop("disabled", false);

                    // Hacer el reset
                    $("#formLinea")[0].reset();
                    $("#formLinea").removeClass("was-validated");

                    EquiposUtil.llenarLineas(this.PLANTA, "LineaProduccion", "FiltroLinea");

                    setTimeout(function () {
                        $("#btnGuardarLinea").html('<i class="bi bi-save me-1"></i>Guardar');
                        $("#lineaModal").modal('hide');
                    }, 3000);

                } else {
                    let customMessage = JSON.parse(response.Data);
                    let FinalMessage = response.Message + " " + customMessage[0].Message;
                    $("#btnGuardarLinea").html('<i class="bi bi-save me-1"></i>Guardar');
                    $("#btnGuardarLinea").prop("disabled", false);
                    AlertManager.mostrar(FinalMessage + "." || 'Error al insertar nueva línea', 'warning', "alertLineaContainer");
                }
            },
            error: (xhr, status, error) => {
                $("#btnGuardarLinea").html('<i class="bi bi-save me-1"></i>Guardar');
                $("#btnGuardarLinea").prop("disabled", false);
                AlertManager.mostrar('Error al conectar con el servidor', 'warning', "alertLineaContainer");
            }
        });
    }

    InsertarTipoEquipo(e) {

        e.preventDefault(); // Evitar el submit tradicional

        // Validar formulario
        if (!ValidationManager.validarFormulario('#formAgregarTipoEquipo')) {
            AlertManager.mostrar('Por favor, complete correctamente todos los campos', 'warning', 'alertTipoEquipoContainer');
            return false;
        }

        // Recopilar los datos
        const datos = {
            DESCRIPCION: $("#NombreTipoEquipo").val()
        };


        $("#btnGuardarTipoEquipo").html('<span class="spinner-border spinner-border-sm me-2"></span>Guardando...');
        $("#btnGuardarTipoEquipo").prop("disabled", true);

        $.ajax({
            url: `/${this.URLBase}/InsertarTipoEquipo`,
            type: 'POST',
            contentType: 'application/json; charset=utf-8',
            data: JSON.stringify(datos),
            dataType: 'json',
            success: (response) => {
                if (response.Status === 'SI') {
                    $("#btnGuardarTipoEquipo").html('<i class="bi bi-check-circle-fill me-2 text-white"></i>Tipo de equipo agregado correctamente');
                    $("#btnGuardarTipoEquipo").prop("disabled", false);

                    // Hacer el reset
                    $("#formAgregarTipoEquipo")[0].reset();
                    $("#formAgregarTipoEquipo").removeClass("was-validated");

                    //PENDIENTE LLENAR TIPOS DE EQUIPO
                    EquiposUtil.llenarLineas(this.PLANTA, "LineaProduccion", "FiltroLinea");

                    setTimeout(function () {
                        $("#btnGuardarTipoEquipo").html('<i class="bi bi-save me-1"></i>Guardar');
                        $("#modalAgregarTipoEquipo").modal('hide');
                    }, 3000);

                    EquiposUtil.llenarTipoEquipos();

                } else {
                    let customMessage = JSON.parse(response.Data);
                    let FinalMessage = response.Message + " " + customMessage[0].Message;
                    $("#btnGuardarTipoEquipo").html('<i class="bi bi-save me-1"></i>Guardar');
                    $("#btnGuardarTipoEquipo").prop("disabled", false);
                    AlertManager.mostrar(FinalMessage + "." || 'Error al insertar nueva línea', 'warning', "alertTipoEquipoContainer");
                }
            },
            error: (xhr, status, error) => {
                $("#btnGuardarTipoEquipo").html('<i class="bi bi-save me-1"></i>Guardar');
                $("#btnGuardarTipoEquipo").prop("disabled", false);
                AlertManager.mostrar('Error al conectar con el servidor', 'warning', "alertTipoEquipoContainer");
            }
        });
    }

    async exportarExcelEquipos() {
        try {
            const table = $('#tablaEquipos').DataTable();

            if (!table || table.rows().count() === 0) {
                AlertManager.mostrar('No hay datos para exportar', 'warning');
                return;
            }

            $('#btnExportarExcelEquipos').html('<span class="spinner-border spinner-border-sm me-2"></span>Exportando...').prop('disabled', true);

            // Obtener todos los datos de la tabla
            const data = table.rows({ search: 'applied' }).data().toArray();

            // Crear workbook y worksheet
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Equipos', {
                pageSetup: {
                    paperSize: 9,
                    orientation: 'landscape',
                    fitToPage: true,
                    fitToWidth: 1,
                    fitToHeight: 0
                }
            });

            // 🎨 SECCIÓN 1: ENCABEZADO PRINCIPAL
            worksheet.mergeCells('A1:L1');
            const headerCell = worksheet.getCell('A1');
            headerCell.value = '⚙️ REPORTE DE GESTIÓN DE EQUIPOS';
            headerCell.font = {
                name: 'Segoe UI',
                size: 18,
                bold: true,
                color: { argb: 'FFFFFFFF' }
            };
            headerCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF0058A1' }
            };
            headerCell.alignment = { vertical: 'middle', horizontal: 'center' };
            worksheet.getRow(1).height = 40;

            // 🎨 SECCIÓN 2: INFORMACIÓN DEL REPORTE
            worksheet.mergeCells('A2:F2');
            const infoCell1 = worksheet.getCell('A2');
            const fechaActual = new Date().toLocaleDateString('es-MX', {
                year: 'numeric', month: 'long', day: 'numeric'
            });
            infoCell1.value = `📅 Fecha de Generación: ${fechaActual}`;
            infoCell1.font = { name: 'Segoe UI', size: 11, bold: true };
            infoCell1.fill = {
                type: 'pattern', pattern: 'solid',
                fgColor: { argb: 'FFE3F2FD' }
            };
            infoCell1.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
            worksheet.getRow(2).height = 25;

            worksheet.mergeCells('G2:L2');
            const infoCell2 = worksheet.getCell('G2');
            infoCell2.value = `📈 Total de Registros: ${data.length}`;
            infoCell2.font = { name: 'Segoe UI', size: 11, bold: true };
            infoCell2.fill = {
                type: 'pattern', pattern: 'solid',
                fgColor: { argb: 'FFE8F5E9' }
            };
            infoCell2.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };

            // 🎨 ESPACIO EN BLANCO
            worksheet.getRow(3).height = 10;

            // 🎨 SECCIÓN 3: ENCABEZADOS DE COLUMNAS
            const headerRow = worksheet.getRow(4);
            const headers = [
                { text: '🏭 Planta', width: 20 },
                { text: '⚙️ Proceso', width: 25 },
                { text: '🔀 Línea', width: 25 },
                { text: '🔧 Equipo', width: 35 },
                { text: '📋 Descripción', width: 35 },
                { text: '💰 Centro Costos', width: 20 },
                { text: '📄 Doc Pm.Calidad', width: 22 },
                { text: '📆 Fecha Inicio Mantenimiento', width: 28 },
                { text: '🔁 Periodicidad MP', width: 30 },
                { text: '🟢 Estatus', width: 15 },
                { text: '💬 Comentarios Pausa', width: 30 },
                { text: '📅 Fecha de Pausa', width: 20 },
            ];

            headers.forEach((header, index) => {
                const col = String.fromCharCode(65 + index);
                worksheet.getColumn(col).width = header.width;

                const cell = headerRow.getCell(index + 1);
                cell.value = header.text;
                cell.font = {
                    name: 'Segoe UI', size: 12, bold: true,
                    color: { argb: 'FFFFFFFF' }
                };
                cell.fill = {
                    type: 'gradient',
                    gradient: 'angle',
                    degree: 90,
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

                // Estatus en texto limpio
                let estatusTexto = '';
                switch (row.Estatus) {
                    case '1': case 'Activo': estatusTexto = '✅ Activo'; break;
                    case '2': case 'Inactivo': estatusTexto = '❌ Inactivo'; break;
                    case '3': case 'En Pausa':
                    case 'Pausado': estatusTexto = '⏸️ Pausado'; break;
                    default: estatusTexto = row.Estatus || 'N/A';
                }

                const rowData = [
                    row.Planta || 'N/A',
                    row.Area || 'N/A',
                    row.LineaProduccion || 'N/A',
                    `${row.NombreEquipo || ''} ${row.NumeroDocPmCalidad || ''}`.trim() || 'N/A',
                    row.DescripcionEquipo || 'N/A',
                    row.CentroCostos || 'N/A',
                    row.NumeroDocPmCalidad || 'N/A',
                    row.FechaInicioMant || 'N/A',
                    DateUtils.formatearPeriodicidad(
                        row.PeriodicidadMantenimiento,
                        row.DiaInicioMant,
                        row.DiaFinMant,
                        row.FechaInicioMant
                    ) || 'N/A',
                    estatusTexto,
                    row.Estatus === 'En Pausa' ? (row.Comentarios || '') : '',
                    row.Estatus === 'En Pausa' ? (row.FechaPausa || '') : ''
                ];

                rowData.forEach((value, colIndex) => {
                    const cell = excelRow.getCell(colIndex + 1);
                    cell.value = value;
                    cell.font = { name: 'Segoe UI', size: 10 };
                    cell.fill = {
                        type: 'pattern', pattern: 'solid',
                        fgColor: { argb: bgColor }
                    };
                    cell.alignment = {
                        vertical: 'middle',
                        horizontal: colIndex <= 3 ? 'left' : 'center',
                        indent: colIndex <= 3 ? 1 : 0,
                        wrapText: true
                    };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                        right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
                    };

                    // 🎨 COLOR ESPECIAL EN COLUMNA ESTATUS (índice 9)
                    if (colIndex === 9) {
                        if (value.includes('Activo')) {
                            cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF1565C0' } };
                        } else if (value.includes('Inactivo')) {
                            cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFC62828' } };
                        } else if (value.includes('Pausado')) {
                            cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFF57F17' } };
                        }
                    }
                });

                excelRow.height = 22;
            });

            // 🎨 SECCIÓN 5: FILA DE RESUMEN AL FINAL
            const lastRow = worksheet.getRow(5 + data.length);
            worksheet.mergeCells(`A${lastRow.number}:L${lastRow.number}`);
            const summaryCell = worksheet.getCell(`A${lastRow.number}`);
            summaryCell.value = `✅ Fin del reporte - ${data.length} equipos exportados`;
            summaryCell.font = {
                name: 'Segoe UI', size: 11, bold: true,
                italic: true, color: { argb: 'FF666666' }
            };
            summaryCell.fill = {
                type: 'pattern', pattern: 'solid',
                fgColor: { argb: 'FFF0F0F0' }
            };
            summaryCell.alignment = { vertical: 'middle', horizontal: 'center' };
            summaryCell.border = {
                top: { style: 'medium', color: { argb: 'FF0058A1' } },
                bottom: { style: 'medium', color: { argb: 'FF0058A1' } }
            };
            lastRow.height = 30;

            // 🎨 CONGELAR PANELES
            worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 4 }];

            // 🎨 AUTOFILTRO
            worksheet.autoFilter = {
                from: { row: 4, column: 1 },
                to: { row: 4, column: 12 }
            };

            // 📥 GENERAR Y DESCARGAR
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });

            const fecha = new Date().toISOString().split('T')[0];
            const nombreArchivo = `Equipos_PTM_${fecha}.xlsx`;

            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = nombreArchivo;
            link.click();

            AlertManager.mostrar('¡Excel exportado con éxito! 🎉', 'success');

        } catch (error) {
            console.error('Error al exportar:', error);
            AlertManager.mostrar('Error al exportar: ' + error.message, 'warning');
        } finally {
            $('#btnExportarExcelEquipos')
                .html('<i class="bi bi-file-earmark-excel-fill me-1"></i>Exportar')
                .prop('disabled', false);
        }
    }
}

// ========================================
// GESTOR DE MANTENIMIENTOS
// ========================================
class MantenimientoManager {

    constructor(URLBase, datos_usuario) {
        this.URLBase = URLBase;
        this.checklistManager = new ChecklistManager();
        this.EquipoAasignarRutina = null;
        this.datos_usuario = datos_usuario;
    }

    inicializar() {
        console.log('✅ MantenimientoManager inicializada correctamente');
    }

    abrirModalMP(e) {
        const id = $(e.currentTarget).data('id');
        const fila = $(`tr[data-id="${id}"]`);

        $('#mpEquipoId').val(id);
        $('#mpPlanta').val(fila.find('td:eq(0)').text());
        $('#mpNombreEquipo').val(fila.find('td:eq(1)').text());
        $('#mpDescripcion').val(fila.find('td:eq(2)').text());
        $('#mpTipoEquipo').val(fila.find('td:eq(3)').text());
        $('#mpLinea').val(fila.find('td:eq(4)').text());
        $('#mpProceso').val(fila.find('td:eq(7)').text());
        $('#mpPeriodicidad').val(fila.find('td:eq(8)').text());

        const hoy = new Date();
        $('#mpFechaMantenimiento').val(hoy.toISOString().split('T')[0]);
        $('#mpComentarios').val('');

        $('#programarMantenimientoModal').modal('show');
    }

    guardarMP() {
        const equipoId = $('#mpEquipoId').val();
        const fechaMantenimiento = $('#mpFechaMantenimiento').val();
        const comentarios = $('#mpComentarios').val();

        if (!fechaMantenimiento) {
            AlertManager.mostrar('Por favor, seleccione una fecha de mantenimiento', 'warning');
            return;
        }

        const nombreEquipo = $('#mpNombreEquipo').val();
        AlertManager.mostrar(`Mantenimiento correctivo programado para ${nombreEquipo} el ${fechaMantenimiento}`, 'success');

        $('#programarMantenimientoModal').modal('hide');

        // Actualizar fecha de próximo mantenimiento en la tabla
        const fila = $(`tr[data-id="${equipoId}"]`);
        const fechaFormateada = new Date(fechaMantenimiento).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
        fila.find('td:eq(6)').text(fechaFormateada);
    }

    abrirModalRutina(e) {
        const id = $(e.currentTarget).data('id');
        const fila = $(`tr[data-id="${id}"]`);

        // Guardar los datos del equipo
        this.EquipoAasignarRutina = id;
        $('#rutinaNombreEquipo').text(fila.find('td:eq(3)').text() + ' ' + fila.find('td:eq(6)').text());
        $('#rutinaProceso').text(fila.find('td:eq(1)').text());

        // Limpiar variable global de imágenes
        window.imagenesRutina = [];

        // CARGAR LA VISTA DESDE EL SERVIDOR
        const startTime = Date.now();

        $.ajax({
            url: '/Rutinas/ObtenerRutinaCompleta',
            type: 'GET',
            data: { idEquipo: id, planta: this.datos_usuario[0].PLANTA },
            dataType: 'json',

            beforeSend: function () {
                $('#formRutinaOnline').html(`
                <div class="ai-loader">

                    <div class="ai-core">
                        <div class="ai-ring"></div>
                        <div class="ai-ring delay"></div>
                        <div class="ai-ring delay2"></div>
                    </div>

                    <div class="ai-wave"></div>

                    <p class="ai-text">CARGANDO RUTINA...</p>

                </div>
            `);

                $('#modalRutinaOnline').modal('show');
            },

            success: (response) => {
                const elapsed = Date.now() - startTime;
                const minDelay = 2000; // 👈 3 segundos

                const render = () => {
                    if (response.Status === 'OK') {

                        const $c = $('#formRutinaOnline');

                        $c.fadeOut(400, () => {  // 👈 arrow function aquí también
                            $c.html(response.Html).fadeIn(600, () => {
                                $('#formRutinaOnline').find('#seccion-upload-imagenes').remove();
                                $('#formRutinaOnline').find('#seccion-galeria-imagenes').remove();
                                if (response.Imagenes?.length > 0) {
                                    this.checklistManager.cargarImagenesExistentes(response.Imagenes);
                                }
                            });
                        });

                    } else {
                        $('#formRutinaOnline').html(`<div class="alert alert-danger">${response.Message}</div>`);
                    }
                };

                if (elapsed < minDelay) {
                    setTimeout(render, minDelay - elapsed);
                } else {
                    render();
                }
            }
        });
    }

    guardarRutina() {
        $('#formRutinaOnline img').each(function () {
            const src = $(this).attr('src');

            if (src && src.startsWith('data:image')) {
                $(this).remove(); // o reemplazar por placeholder
            }
        });
        // Capturar todo el contenido HTML del formulario
        const contenidoHTML = $('#formRutinaOnline').html();

        // Mostrar loading en el botón
        const $btnGuardar = $('#btnGuardarRutina');
        const textoOriginal = $btnGuardar.html();
        $btnGuardar.html('<span class="spinner-border spinner-border-sm me-2"></span>Guardando...').prop('disabled', true);

        const idEquipo = this.EquipoAasignarRutina;
        const planta = this.datos_usuario[0].PLANTA;

        // Primero guardar el HTML de la rutina
        $.ajax({
            url: '/Rutinas/GuardarRutina',
            type: 'POST',
            contentType: 'application/json; charset=utf-8',
            data: JSON.stringify({
                IdEquipo: idEquipo,
                Planta: planta,
                ContenidoHTML: contenidoHTML
            }),
            dataType: 'json',
            success: (response) => {
                if (response.Status === 'OK' || response.Success) {
                    // Ahora guardar las imágenes (si hay nuevas)
                    this.guardarImagenesRutina(idEquipo, planta)
                        .then(() => {
                            AlertManager.mostrar(`Rutina guardada correctamente para el equipo "${$('#rutinaNombreEquipo').text()}"`, 'success');
                            $btnGuardar.html(textoOriginal).prop('disabled', false);

                            setTimeout(function () {
                                $('#modalRutinaOnline').modal('hide');
                            }, 1500);
                        })
                        .catch((error) => {
                            AlertManager.mostrar('Rutina guardada, pero error al guardar imágenes: ' + error, 'warning');
                            $btnGuardar.html(textoOriginal).prop('disabled', false);
                        });
                } else {
                    AlertManager.mostrar('Error al guardar la rutina: ' + (response.Message || 'Error desconocido'), 'warning');
                    $btnGuardar.html(textoOriginal).prop('disabled', false);
                }
            },
            error: (xhr, status, error) => {
                AlertManager.mostrar('Error al conectar con el servidor: ' + error, 'warning');
                $btnGuardar.html(textoOriginal).prop('disabled', false);
            }
        });
    }

    async guardarImagenesRutina(idEquipo, planta) {
        return new Promise((resolve, reject) => {
            // Verificar si hay imágenes nuevas para guardar
            if (!window.imagenesRutina || window.imagenesRutina.length === 0) {
                resolve();
                return;
            }

            const formData = new FormData();
            window.imagenesRutina.forEach((file, index) => {
                formData.append('files', file);
            });

            $.ajax({
                url: '/Rutinas/GuardarImagenes',
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                data: function () {
                    const data = new FormData();
                    data.append('idEquipo', idEquipo);
                    data.append('planta', planta);
                    if (window.imagenesRutina) {
                        window.imagenesRutina.forEach((file) => {
                            data.append('files', file);
                        });
                    }
                    return data;
                }(),
                success: (response) => {
                    if (response.Status === 'OK' || response.Status === 'WARNING') {
                        // Limpiar variable global después de guardar
                        window.imagenesRutina = [];
                        resolve();
                    } else {
                        reject(response.Message || 'Error desconocido');
                    }
                },
                error: (xhr, status, error) => {
                    reject(error);
                }
            });
        });
    }

    async cargarImagenesExistentes(idEquipo, planta) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: '/Rutinas/ObtenerImagenes',
                type: 'GET',
                data: { idEquipo: idEquipo, planta: planta },
                dataType: 'json',
                success: (response) => {
                    if (response.Status === 'OK' && response.Imagenes) {
                        resolve(response.Imagenes);
                    } else {
                        resolve([]);
                    }
                },
                error: (xhr, status, error) => {
                    console.error('Error al cargar imágenes existentes:', error);
                    resolve([]);
                }
            });
        });
    }

    async eliminarImagenRutina(idEquipo, planta, nombreArchivo) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: '/Rutinas/EliminarImagen',
                type: 'POST',
                data: { idEquipo: idEquipo, planta: planta, nombreArchivo: nombreArchivo },
                dataType: 'json',
                success: (response) => {
                    if (response.Status === 'OK') {
                        resolve();
                    } else {
                        reject(response.Message || 'Error desconocido');
                    }
                },
                error: (xhr, status, error) => {
                    reject(error);
                }
            });
        });
    }
}

// ========================================
// GESTOR DE IMPRESIÓN - SOLICITUD DE BAJA
// ========================================
class PrintSolicitudBaja {
    constructor() {
        this.printEngine = new PrintEngine();
        this.logoUrl = `${window.location.origin}/Content/Images/LogoPTMWhite.png`;
    }

    inicializar() {
        console.log('✅ PrintSolicitudBaja Inicializada Correctamente');
    }

    async imprimir() {

        const $btn = $("#btnExportPDF");

        try {
            // 🔄 Estado loading
            $btn.html('<span class="spinner-border spinner-border-sm me-2"></span>Generando PDF...');
            $btn.prop("disabled", true);

            // 🧠 Obtener datos
            const datos = GlobalUtil.obtenerDatosAnyFormulario("formBajaActivo");

            // 🔥 Generar QR
            datos.QR = await GlobalUtil.generarQRCode(datos.CodigoActivo);

            // 🖼 Imágenes
            datos.Imagenes = this.obtenerImagenesPreview();

            // 🧾 HTML + estilos
            const html = this.generarContenidoHTML(datos);
            const estilos = this.obtenerEstilos();

            // 🖨 Imprimir
            this.printEngine.imprimir({
                html,
                estilos,
                titulo: 'Solicitud de Baja'
            });

            // ✅ Feedback éxito
            $btn.html('<i class="bi bi-check-circle-fill me-2 text-white"></i> PDF generado correctamente');

        } catch (error) {

            // ❌ Feedback error
            $btn.html('<i class="bi bi-x-circle-fill me-2"></i>Error al generar PDF');

            // (opcional si usas alertas globales)
            AlertManager.mostrar('No es posible generar el PDF, intente de nuevo más tarde: ' + error, 'warning', "alertSolicitudBajaContainer");

        } finally {

            // 🔁 Restaurar botón SIEMPRE
            setTimeout(() => {
                $btn.html('<i class="bi bi-file-earmark-pdf-fill me-1"></i> Exportar PDF');
                $btn.prop("disabled", false);
            }, 2000);
        }
    }

    obtenerImagenesPreview() {
        const imagenes = [];
        document.querySelectorAll('#previewArea img').forEach(img => {
            imagenes.push(img.src);
        });
        return imagenes;
    }

    generarContenidoHTML(datos) {
        return `
        <div class="contenedor">

            <!-- HEADER -->
            <div class="header">
                <img src="${this.logoUrl}" class="logo"/>
                <div class="info-header">
                    <div class="fecha">
                        <strong>Fecha:</strong> ${DateUtils.obtenerFechaHora()}
                    </div>

                    <div class="qr-container">
                        <img src="${datos.QR}" class="qr"/>
                    </div>
                </div>
            </div>

            ${this.seccion("📋 DATOS GENERALES", `
                <div class="row">
                    <div><strong>Fecha Solicitud:</strong><br>${datos.FechaSolicitud || ''}</div>
                    <div><strong>Encargado:</strong><br>${datos.EncargadoActivos || ''}</div>
                </div>
            `)}

            ${this.seccion("📝 MOTIVO DE BAJA", `
                ${datos.MotivoBaja || ''}
            `)}

            ${this.seccion("📦 DESCRIPCIÓN ACTIVO", `
                <div class="row">
                    <div><strong>Código:</strong><br>${datos.CodigoActivo || ''}</div>
                    <div><strong>Descripción:</strong><br>${datos.DescripcionActivo || ''}</div>
                </div>
            `)}

            ${this.seccion("📉 FORMA DE BAJA", `
                <div class="row">
                    <div><strong>Desecho:</strong><br>${datos.Desecho || ''}</div>
                    <div><strong>Tipo Activo:</strong><br>${datos.TipoActivoFijo || ''}</div>
                </div>

                <div class="row">
                    <div><strong>Piezas:</strong><br>${datos.Piezas || ''}</div>
                    <div><strong>Kilos:</strong><br>${datos.Kilos || ''}</div>
                </div>

                <div class="row">
                    <div><strong>Venta:</strong><br>${datos.Venta || ''}</div>
                    <div><strong>Valor IVA:</strong><br>${datos.ValorIva || ''}</div>
                </div>
            `)}

            ${this.seccion("💰 CONTABILIDAD", `
                ${datos.Observacion || ''}
            `)}

            ${this.seccion("📸 EVIDENCIAS", `
                <div class="imagenes">
                    ${(datos.Imagenes || []).map(img => `
                        <img src="${img}" />
                    `).join('')}
                </div>
            `)}

        </div>
        `;
    }

    obtenerEstilos() {
        return `
        * { box-sizing: border-box; font-family: Arial; }

        body { padding: 10px; }

        @media print {
            @page { size: A4; margin: 8mm; }
        }

        .contenedor {
            max-width: 200mm;
            margin: auto;
            font-size: 11px;
        }

        .header {
        background: #2b74c0;
        color: white;
        padding: 15px;
        border-radius: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        }
        .logo {
            height: 40px;
        }
        .seccion {
            page-break-inside: avoid;
        }
        .info-header {
        display: flex;
        flex-direction: column;
        align-items: flex-end; /* 🔥 TODO a la derecha */
        }

        .qr-container {
            display: flex;
            justify-content: flex-end;
        }

        .qr {
            width: 70px;
            margin-top: 5px;
        }

        .seccion {
            border: 1px solid #ddd;
            border-radius: 8px;
            margin-top: 15px;
        }

        .seccion-header {
            background: #2b74c0;
            color: white;
            padding: 8px;
            font-weight: bold;
            border-radius: 8px 8px 0 0;
        }

        .seccion-body {
            padding: 12px;
        }

        .row {
            display: flex;
            gap: 20px;
            margin-bottom: 10px;
        }

        @media print {
            .row {
                display: flex;
            }
        }

        .row div {
            width: 50%;
            min-height: 25px;
            border-bottom: 1px solid #000;
            padding-bottom: 3px;
        }

        .imagenes {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }

        .imagenes img {
            width: 90px;
            height: 90px;
            object-fit: cover;
            border-radius: 6px;
            border: 1px solid #ccc;
        }

        .fade-out {
            opacity: 0;
        }
        `;
    }

    seccion(titulo, contenido) {
        return `
    <div class="seccion">
        <div class="seccion-header">${titulo}</div>
        <div class="seccion-body">${contenido}</div>
    </div>
    `;
    }
}


// ========================================
// GESTOR DE Archivos
// ========================================
class ArchivosManager {
    constructor(URLBase) {
        this.maxSize = 5 * 1024 * 1024; // 5MB en bytes
        this.URLBase = URLBase;
    }

    inicializar() {
        console.log('✅ ArchivosManager inicializada correctamente');
    }

    // Validar archivo PDF
    validarArchivo(e) {
        const file = e.target.files[0];

        if (file) {
            // Validar tipo de archivo
            if (file.type !== 'application/pdf') {
                AlertManager.mostrar('Solo se permiten archivos PDF', 'warning');
                $('#archivoPDF').val(''); // Limpiar el campo
                $('#archivoInfo').addClass('d-none'); // Ocultar la información del archivo
                return;
            }

            // Validar tamaño
            if (file.size > this.maxSize) {
                AlertManager.mostrar('El archivo no debe superar los 5MB', 'warning');
                $('#archivoPDF').val(''); // Limpiar el campo
                $('#archivoInfo').addClass('d-none'); // Ocultar la información del archivo
                return;
            }

            // Mostrar información del archivo
            this.mostrarInfoArchivo(file);
        }
    }

    // Mostrar información del archivo seleccionado
    mostrarInfoArchivo(file) {
        const sizeKB = (file.size / 1024).toFixed(2);
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        const sizeDisplay = file.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;

        $('#nombreArchivo').text(file.name);
        $('#tamañoArchivo').text(`(${sizeDisplay})`);
        $('#archivoInfo').removeClass('d-none'); // Mostrar la info
    }

    // Remover archivo
    removerArchivo() {
        $('#archivoPDF').val(''); // Limpiar el campo
        $('#archivoInfo').addClass('d-none'); // Ocultar la información del archivo
    }

    // Enviar con FormData
    guardarConArchivo(ID_EQUIPO) {
        const formData = new FormData($('#formBajaActivo')[0]);

        // El archivo se agrega automáticamente con el name del input
        const archivo = $('#archivoPDF')[0].files[0];
        if (archivo) {
            formData.append('archivoPDF', archivo);
        }

        // Agregar el ID_EQUIPO al FormData
        formData.append('ID_EQUIPO', ID_EQUIPO);

        $.ajax({
            url: `/${this.URLBase}/GuardarBaja`, // Asegúrate de que la URL sea la correcta
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: (response) => {
                $("#btnGuardarBaja").html('<i class="bi bi-check-circle-fill me-2 text-white"></i>Equipo eliminado correctamente');

                // Hacer el reset
                $("#formBajaActivo")[0].reset();
                $("#formBajaActivo").removeClass("was-validated");

                // 🔥 RECARGAR LA TABLA DATATABLE
                $('#tablaEquipos').DataTable().ajax.reload(null, false);

                setTimeout(function () {
                    $("#btnGuardarBaja").prop("disabled", false);
                    $("#btnCancelarBaja").prop("disabled", false);
                    $("#btnExportPDF").prop("disabled", false);
                    $("#btnGuardarBaja").html('<i class="bi bi-save-fill me-2 text-success"></i>Guardar...');
                    $("#modalBajaActivo").modal("hide");
                }, 3000);

            },
            error: (error) => {
                AlertManager.mostrar('Error al guardar el documento', 'warning');
            }
        });
    }
}

