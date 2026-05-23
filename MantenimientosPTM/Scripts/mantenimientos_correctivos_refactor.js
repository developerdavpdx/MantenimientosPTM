// ========================================
// APLICACIÓN PRINCIPAL CORRECTIVOS
// ========================================
class MantenimientosPreventivoApp {
    constructor() {
        this.URLBase = "MantenimientosCorrectivos";
        this.URLBaseRutinas = "Rutinas";
        this.gestionTecnicos = new GestionTecnicos(this.URLBase);
        this.datos_usuario = GlobalUtil.getDatosUsuario();
        this.gestionFirmas = new GestionFirmas(); // 🔥 NUEVO

        // ✅ Inicializar gestión de artículos custom para MC
        this.gestionArticulosMC = new GestionArticulosCustom(
            '#BuscarArticuloMC',
            '#sugerenciasArticulosMC',
            '#CodigoArticuloMC',
            '#DescripcionArticuloMC',
            '#bodyArticulosRefaccionMC',
            'Planeacion',
            'alertRefaccionContainer',
            110,
            null,
            this.datos_usuario// Grupos de articulos excluidos 110 -> Producto Terminado
        );

        // 🔥 Pasar gestionTecnicos al manager + referencia a la app
        this.mantenimientoManager = new MantenimientoManager(
            this.URLBase,
            this.URLBaseRutinas,
            this.gestionTecnicos,
            this.gestionFirmas, // 🔥 NUEVO
            this.datos_usuario,
            this
        );

        // 🆕 Inicializar gestor de PDFs
        this.pdfManager = new PDFManagerMantenimiento();

        // 🔥 PASAR LA REFERENCIA DEL MANAGER
        this.printManager = new PrintManagerMantenimiento(this.pdfManager, this.mantenimientoManager);

        window.AppMantenimientos = this;
    }
    // Ocultar contenedor de firma de Mantenimiento y deshabilitar botón guardar OT
    static ocultarFirmaMantenimiento() {
        try {
            $('#firmaMantenimientoContainer').addClass('d-none');
            $('#btnGuardarOT').addClass('d-none').prop('disabled', true).addClass('btn_disabled');
            if (window.AppMantenimientos && window.AppMantenimientos.gestionFirmas && window.AppMantenimientos.gestionFirmas.deshabilitarFirma) {
                window.AppMantenimientos.gestionFirmas.deshabilitarFirma('Mantenimiento', true);
            }
        } catch (e) {
            console.warn('Error en ocultarFirmaMantenimiento:', e);
        }
    }

    inicializar() {
        //Inicializar UI
        UIManager.inicializarUI(this.datos_usuario);
        this.mantenimientoManager.inicializar();
        this.pdfManager.inicializar();
        this.gestionTecnicos.inicializar();
        this.gestionFirmas.inicializar(); // 🔥 NUEVO

        this.configurarEventosMantenimientos(); //MANTENIMIENTOS
        this.configurarEventosPDF(); //PDF
        this.configurarEventosImpresion();
        this.configurarEventosTecnicos(); //GESTION TECNICOS
        this.configurarEventosFirmas(); //FIRMAS
        this.initHubMantenimientosCorrectivos(); //Inicializar HUB mantenimientos correctivos

        console.log('✅ Sistema Completo de Mantenimientos Preventivos inicializado correctamente');
    }

    configurarEventosMantenimientos() {
        // Agregar mantenimiento
        $('#btnAgregarMantenimiento').on('click', (e) => this.mantenimientoManager.abrirModalAgregar(e));

        // Filtros
        $('#btnFiltrar').on('click', () => this.mantenimientoManager.aplicarFiltros());

        // Checkboxes
        $('#selectAll').on('change', (e) => this.mantenimientoManager.seleccionarTodos(e));

        // Generar órdenes
        $('#btnGenerarOrdenes').on('click', () => this.mantenimientoManager.generarOrdenes());

        // Solicitar refacción
        $(document).on('click', '.btn-solicitar-refaccion', (e) => {
            this.mantenimientoManager.abrirModalRefaccion($(e.currentTarget));
        });

        // Rutina online
        $(document).on('click', '.btn-rutina-online', (e) => {
            this.mantenimientoManager.abrirModalRutinaOnline($(e.currentTarget));
        });

        // Carátula online
        $(document).on('click', '.btn-caratula-online', (e) => {
            this.mantenimientoManager.abrirModalCaratulaOnline($(e.currentTarget));
        });

        // Guardar refacción
        $('#formSolicitarRefaccion').on('submit', (e) => this.mantenimientoManager.enviarSolicitudRefaccion(e));

        // ✅ Eventos de autocomplete para MC
        $('#BuscarArticuloMC').on('input', (e) => {
            const query = $(e.target).val().trim();
            if (query.length >= 2) {
                this.gestionArticulosMC.buscarArticulos(query, this.datos_usuario[0].EMAIL, 0);
            } else {
                this.gestionArticulosMC.ocultarSugerencias();
            }
        });

        // Click fuera para cerrar sugerencias
        $(document).on('click', (e) => {
            if (!$(e.target).closest('#BuscarArticuloMC, #sugerenciasArticulosMC').length) {
                this.gestionArticulosMC.ocultarSugerencias();
            }
        });

        // ✅ CORRECTO - Debes pasar "e" como parámetro
        $('#formOrdenMantenimiento').on('submit', (e) => this.mantenimientoManager.guardarOT(e));

        // Guardar estatus
        $('#btnGuardarEstatus').on('click', () => this.mantenimientoManager.guardarEstatus());

        // Guardar rutina
        $('#btnGuardarRutina').on('click', () => this.mantenimientoManager.guardarRutina());

        // ❌ Ya no necesitas esto con arrow functions
        // const self = this;
        // ✅ Arrow function - mantiene el contexto de this automáticamente
        $('#FiltroFechaInicio, #FiltroFechaFin, #FiltroArea, #FiltroLinea, #FiltroPeriodicidad').on('change', () => {
            const fechaInicio = $('#FiltroFechaInicio').val();
            const fechaFin = $('#FiltroFechaFin').val();

            // Validar solo si ambas fechas tienen valor
            if (fechaInicio && fechaFin) {
                const inicio = new Date(fechaInicio);
                const fin = new Date(fechaFin);

                if (inicio > fin) {
                    AlertManager.mostrar('La fecha de inicio no puede ser mayor a la fecha de fin.', 'warning');
                    return;
                }
            }

            // Si pasa la validación, recargar la tabla
            if ($.fn.DataTable.isDataTable('#tablaMantenimientosRango')) {
                $('#tablaMantenimientosRango').DataTable().ajax.reload();
            } else {
                this.mantenimientoManager.llenarMantenimientosCorrectivosPorRango();
            }
        });

        // ✅ Arrow function con validación de fechas
        $('#btnAplicarFiltros').on('click', () => {
            const fechaInicio = $('#FiltroFechaInicio').val();
            const fechaFin = $('#FiltroFechaFin').val();

            // Validar solo si ambas fechas tienen valor
            if (fechaInicio && fechaFin) {
                const inicio = new Date(fechaInicio);
                const fin = new Date(fechaFin);

                if (inicio > fin) {
                    AlertManager.mostrar('La fecha de inicio no puede ser mayor a la fecha de fin.', 'warning');
                    return;
                }
            }

            // Si pasa la validación, recargar la tabla
            if ($.fn.DataTable.isDataTable('#tablaMantenimientosRango')) {
                $('#tablaMantenimientosRango').DataTable().ajax.reload();
            } else {
                this.mantenimientoManager.llenarMantenimientosCorrectivosPorRango();
            }
        });

        // ✅ Arrow function
        $('#btnLimpiarFiltros').on('click', () => {
            $('#FiltroOrdenTrabajo').val('');
            $('#FiltroFechaInicio').val('');
            $('#FiltroFechaFin').val('');

            // Si pasa la validación, recargar la tabla
            if ($.fn.DataTable.isDataTable('#tablaMantenimientosRango')) {
                $('#tablaMantenimientosRango').DataTable().ajax.reload();
            } else {
                this.mantenimientoManager.llenarMantenimientosCorrectivosPorRango();
            }
        });

        $('#HoraInicioTrabajo, #HoraFin').on('change', () => {
            const inicio = $('#HoraInicioTrabajo').val();
            const fin = $('#HoraFin').val();

            if (!inicio || !fin) return;

            const toDate = (t) => new Date(`1970-01-01T${t}`);

            const d1 = toDate(inicio);
            const d2 = toDate(fin);

            if (isNaN(d1) || isNaN(d2)) {
                $("#DuracionHrs").val('');
                return;
            }

            // 🔥 Validación
            if (d2 < d1) {
                AlertManager.mostrar(`Hora Inicio no puede ser mayor a Hora Fin`, 'warning');
                $('#HoraFin').val('');
                $("#DuracionHrs").val('');
                return;
            }

            const diffMs = d2 - d1;
            const horas = diffMs / (1000 * 60 * 60);

            $("#DuracionHrs").val(horas.toFixed(2));
        });

        $("#FiltroArea")
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
    }

    configurarEventosPDF() {
        $('#btnExportMantenimientoPDF').on('click', () => this.pdfManager.exportarOrdenMantenimiento());
    }

    configurarEventosTecnicos() {
        // ❌ QUITA el const self = this; ya no lo necesitas

        // ✅ Cambiar TODAS las function() por arrow functions
        $('#BuscarTecnico').on('input', (e) => {  // ⬅️ Agrega parámetro 'e'
            const query = $(e.target).val().trim();  // ⬅️ Usa e.target, no this
            if (query.length >= 2) {
                this.gestionTecnicos.buscarTecnicos(query);
            } else {
                this.gestionTecnicos.ocultarSugerencias();
            }
        });

        $('#btnAgregarTecnico').on('click', () => {  // ⬅️ Arrow function
            this.gestionTecnicos.agregarTecnicoDesdeInput();
        });

        $('#BuscarTecnico').on('keypress', (e) => {  // ⬅️ Arrow function
            if (e.which === 13) {
                e.preventDefault();
                this.gestionTecnicos.agregarTecnicoDesdeInput();
            }
        });

        // ✅ Este ya está bien con arrow function
        $(document).on('click', (e) => {
            if (!$(e.target).closest('#BuscarTecnico, #sugerenciasTecnicos').length) {
                this.gestionTecnicos.ocultarSugerencias();
            }
        });

        // ✅ Versión con suffix visual
        $('#Duracion').on('input', function (e) {
            let valor = $(this).val().replace(' Hrs', '').trim();

            // Remover todo excepto números y punto
            valor = valor.replace(/[^0-9.]/g, '');

            // Permitir solo un punto decimal
            const partes = valor.split('.');
            if (partes.length > 2) {
                valor = partes[0] + '.' + partes.slice(1).join('');
            }

            // Limitar a 2 decimales
            if (partes.length === 2 && partes[1].length > 2) {
                valor = partes[0] + '.' + partes[1].substring(0, 2);
            }

            $(this).val(valor);
        });

    }

    configurarEventosImpresion() {
        $(document).on('click', '.btn-impresion-online', (e) => {
            const btn = $(e.currentTarget);
            this.printManager.prepararImpresionDirecta(btn);
        });
    }

    configurarEventosFirmas() {
        window.limpiarFirma = (tipo) => this.gestionFirmas.limpiarFirma(tipo);
        window.deshacerFirma = (tipo) => this.gestionFirmas.deshacerFirma(tipo);
    }

    // ========================================
    // SIGNALR MANAGER - MANTENIMIENTOS CORRECTIVOS
    // ========================================
    initHubMantenimientosCorrectivos() {
        const self = this;
        const hub = $.connection.mantenimientoHub;
        let reconnectDelay = 5000;
        let modalActualizacion = null;

        const miRol = self.datos_usuario[0].TIPOUSUARIO;

        // ── Todos reciben el aviso excepto quien hizo el cambio ──
        const debeRecibirAviso = (rolQueCambio) => miRol !== rolQueCambio;

        // ── Inicializar modal una sola vez ──
        const $modalEl = document.getElementById('actualizacionDatosModal');
        if ($modalEl) {
            modalActualizacion = new bootstrap.Modal($modalEl, { backdrop: 'static', keyboard: false });

            document.getElementById('btnConfirmarActualizacion')
                .addEventListener('click', function () {
                    modalActualizacion.hide();
                    self._recargarTablaCorrectivos();
                });
        }

        // ========================================
        // 📡 EVENTO PRINCIPAL
        // ========================================
        hub.client.actualizarTablaMantenimientosCorrectivos = function (rolQueCambio) {
            console.warn("📡 Actualización recibida desde SignalR | Origen:", rolQueCambio || "desconocido");

            if (!debeRecibirAviso(rolQueCambio)) {
                console.info("🔕 Aviso ignorado — no corresponde a este rol:", miRol);
                return;
            }

            if ($modalEl && $modalEl.classList.contains('show')) return;

            if (self._isReloadingCorrectivos) return;

            modalActualizacion
                ? modalActualizacion.show()
                : self._recargarTablaCorrectivos();
        };

        // ========================================
        // 🚀 START HUB (con fallback controlado)
        // ========================================
        $.connection.hub.start({
            transport: ['webSockets', 'longPolling']
        }).done(function () {
            console.log("✅ SignalR conectado | Rol:", miRol);
            console.log("🚚 Transporte:", $.connection.hub.transport.name);
        }).fail(function (error) {
            console.error("❌ Error al conectar SignalR:", error);
        });

        // ========================================
        // 🔄 RECONNECTING
        // ========================================
        $.connection.hub.reconnecting(function () {
            console.warn("🔄 SignalR reconectando...");
        });

        // ========================================
        // 🔁 RECONNECTED — recarga silenciosa
        // ========================================
        $.connection.hub.reconnected(function () {
            console.info("✅ SignalR reconectado | Rol:", miRol);
            self._recargarTablaCorrectivos();
            reconnectDelay = 5000;
        });

        // ========================================
        // ❌ DISCONNECTED (retry exponencial)
        // ========================================
        $.connection.hub.disconnected(function () {
            console.error("❌ SignalR desconectado");
            setTimeout(function () {
                console.warn(`🔁 Reintentando conexión en ${reconnectDelay / 1000}s...`);
                $.connection.hub.start();
                reconnectDelay = Math.min(reconnectDelay * 2, 30000);
            }, reconnectDelay);
        });
    }

    // ========================================
    // 🔁 RECARGA CENTRALIZADA CORRECTIVOS
    // ========================================
    _recargarTablaCorrectivos() {
        $('.modal.show').modal('hide');

        if (this._isReloadingCorrectivos) return;

        this._isReloadingCorrectivos = true;

        if ($.fn.DataTable.isDataTable('#tablaMantenimientosRango')) {
            $('#tablaMantenimientosRango').DataTable().ajax.reload(() => {
                this._isReloadingCorrectivos = false;
            }, false);
        } else {
            this.mantenimientoManager.llenarMantenimientosCorrectivosPorRango(); // 🔥 ajusta al método real
            this._isReloadingCorrectivos = false;
        }
    }
}

// ========================================
// INICIALIZACIÓN
// ========================================
$(document).ready(function () {
    const app = new MantenimientosPreventivoApp();
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

    console.log('✅ Header fijo inicializado correctamente');
});

// ========================================
// GESTOR DE UI
// ========================================
class UIManager {
    static inicializarUI(datos_usuario) {
        // Seleccionar el padre "MantenimientosContainer" y expandir
        $("#MantenimientosContainer").addClass("selected");
        $("#MantenimientosContainer a").addClass("whiteText");
        $("#mantenimientos-collapse").addClass("show");

        // Configuración de navegación
        $("#MantenimientosCorrectivosContainer").addClass("selected");
        $("#MantenimientosCorrectivosContainer a").addClass("whiteText");
        $("#manntocorrectivo-collapse").addClass("show");
        $("#MCProgramadoURL").addClass("selected-item");

        if (datos_usuario[0].TIPOUSUARIO == "TecnicoMtto") {
            $("#btnGenerarOrdenes").addClass("d-none");
        }

        $('#FiltroFechaInicio').val(DateUtils.obtenerPrimerDiaMesActual());
        $('#FiltroFechaFin').val(DateUtils.obtenerUltimoDiaMesActual());
        //const TopScrool = new TopScrollTable("tablaMantenimientosRango", "tablaMantenimientosRangoContainer", "TblMCScrool");
        //TopScrool.createScroll();
        //TopScrool.initScroll();
    }
}


// ========================================
// GESTOR DE MANTENIMIENTOS CORRECTIVOS
// ========================================
class MantenimientoManager {
    constructor(URLBase, URLBaseRutinas, gestionTecnicos, gestionFirmas, datos_usuario, appReferencia = null) {
        this.URLBase = URLBase;
        this.URLBaseRutinas = URLBaseRutinas;
        this.gestionTecnicos = gestionTecnicos;
        this.datos_usuario = datos_usuario;
        this.gestionFirmas = gestionFirmas;
        this.appReferencia = appReferencia;
        this.ID_EQUIPO = "";
        this.ID_SOLICITUD = "";
        this.TIPO_OPERACION = "";
    }

    inicializar() {
        this.inicializarTooltips();
        //Solo si es admin
        if (this.datos_usuario[0].TIPOUSUARIO == "AdminMtto" || this.datos_usuario[0].TIPOUSUARIO == "Administrador") {
            this.llenarMantenimientosCorrectivosPorRango();
        }

        EquiposUtil.llenarLineas(this.datos_usuario[0].PLANTA, "none", "FiltroLinea");
        EquiposUtil.llenarProcesos(this.datos_usuario[0].PLANTA, "none", "FiltroArea");

        console.log('✅ MantenimientoManager inicializado correctamente');
    }

    llenarMantenimientosCorrectivosPorRango() {
        try {
            // ✅ Remover fila vacía si existe
            $('#filaVacia').remove();

            // Destruir DataTable si ya existe
            if ($.fn.DataTable.isDataTable('#tablaMantenimientosRango')) {
                $('#tablaMantenimientosRango').DataTable().destroy();
            }

            let FiltroEstatusOT = (this.datos_usuario[0].TIPOUSUARIO == "TecnicoMtto" ? "2,3,4" : null);

            function calcularHeaderOffset() {
                if (window.innerWidth < 625) {
                    return 180;
                }
                if (window.innerWidth < 640) {
                    return 160;
                }
                if (window.innerWidth < 992) {
                    return 155;
                }
                if (window.innerWidth < 1155) {
                    return 125;
                } else if (window.innerWidth < 1400) {
                    return 120;
                } else {
                    return 113;
                }
            }

            const table = $('#tablaMantenimientosRango').DataTable({
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

                            function normalizar(texto) {
                                return texto.toUpperCase()
                                    .normalize("NFD")
                                    .replace(/[\u0300-\u036f]/g, "")
                                    .trim();
                            }

                            function obtenerIcono(titulo) {
                                var tituloNorm = normalizar(titulo);

                                var iconos = {
                                    'TIPO MANTENIMIENTO': 'bi bi-gear-fill',
                                    'PROCESO': 'bi bi-diagram-2-fill',
                                    'LINEA': 'bi bi-diagram-3-fill',
                                    'EQUIPO': 'bi bi-tools',
                                    'SOLICITANTE': 'bi bi-person-fill',
                                    'NUMERO ORDEN': 'bi bi-file-earmark-text',
                                    'TEXTO BREVE': 'bi bi-card-text',
                                    'FECHA SOLICITUD MANTENIMIENTO': 'bi bi-calendar-plus',
                                    'HORA APERTURA': 'bi bi-clock',
                                    'HORA CIERRE': 'bi bi-clock-fill',
                                    'TIEMPO INVERTIDO (HRS)': 'bi bi-hourglass-split',
                                    'COMENTARIOS': 'bi bi-chat-left-text',
                                    'ESTATUS ORDEN': 'bi bi-flag-fill',
                                    'ACCIONES': 'bi bi-lightning-fill'
                                };

                                return iconos[tituloNorm] || 'bi bi-circle-fill';
                            }

                            var detallesHtml = '';

                            $.each(hiddenColumns, function (i, col) {
                                var title = col.title;
                                var valueContent = col.data || '<em class="text-muted">Sin información</em>';
                                var iconClass = obtenerIcono(title);

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

                            return '<div class="card shadow-sm mt-3">' +
                                '  <div class="card-header bg-light">' +
                                '    <h5 class="mb-0">' +
                                '      <i class="bi bi-clipboard-check me-2" style="color: #0D6EFD;"></i>' +
                                '      Información adicional del mantenimiento' +
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
                    url: `/${this.URLBase}/GetMantenimientosCorrectivosPendientes`,
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
                            "FiltroFechaInicio": $("#FiltroFechaInicio").val() || null,
                            "FiltroFechaFin": $("#FiltroFechaFin").val() || null,
                            "FiltroArea": $("#FiltroArea").val() || null,
                            "FiltroLinea": $("#FiltroLinea").val() || null,
                            "FiltroOrdenTrabajo": $("#FiltroOrdenTrabajo").val() || null,
                            "FiltroPlanta": this.datos_usuario[0].PLANTA || null,
                            "FiltroEstatusOT": FiltroEstatusOT
                        });
                    },
                    dataSrc: function (json) {
                        if (json.fechaInicio && json.fechaFin) {
                            if ($('#mesActual').length) {
                                $('#mesActual').text(`${json.fechaInicio} - ${json.fechaFin}`);
                            }
                        }
                        return json.data;
                    }
                },
                columns: [
                    // 🎯 Col 0: Control Responsive (+/-)
                    {
                        className: 'dtr-control',
                        orderable: false,
                        data: null,
                        defaultContent: '',
                        width: '50px'
                    },
                    // ✅ Col 1: Checkbox
                    {
                        data: null,
                        orderable: false,
                        className: "text-center",
                        render: (data, type, row) => {
                            if (!row.EstatusOrden || row.EstatusOrden === '') {
                                if (this.datos_usuario[0].TIPOUSUARIO == "AdminMtto" || this.datos_usuario[0].TIPOUSUARIO == "Administrador") {
                                    return '<input type="checkbox" class="row-checkbox">';
                                }
                            }
                            return '';
                        }
                    },
                    // ✅ Col 2: Acciones
                    {
                        data: null,
                        orderable: false,
                        className: "all text-center",
                        render: (data, type, row) => {

                            const dataAttrs = this.buildDataAttributes(row);

                            let refaccionbutton = "";
                            let caratulabutton = "";
                            let listRefBtn = '';

                            const tipoUsuario = this.datos_usuario[0].TIPOUSUARIO;
                            const esAdmin = tipoUsuario === "AdminMtto" || tipoUsuario === "Administrador";
                            const esTecnico = tipoUsuario === "TecnicoMtto";
                            const esSupProduccion = tipoUsuario === "Produccion";
                            const tieneRefacciones = data.TieneRefaciones;

                            const estatusOrden = row.EstatusOrden || '';
                            const ordenFinalizada = row.OrdenTrabajoFinalizada || '';


                            const btn = (color, cssClass, icon, tooltip, attrs = '') =>
                                `<button class="btn btn-sm ${color} ${cssClass}" data-bs-toggle="tooltip" title="${tooltip}" ${attrs}>
                                <i class="bi bi-${icon}"></i>
                            </button>`;

                            const btnDisabled = (color, icon, tooltip) =>
                                btn(color, 'disabled', icon, tooltip).replace('<button', '<button disabled');

                            if (estatusOrden && estatusOrden !== '') {

                                // ================= REFACCION =================
                                if (estatusOrden == 3 || estatusOrden == 4 || ordenFinalizada === "SI" || esSupProduccion) {
                                    refaccionbutton = `
                            <button class="btn btn-sm btn-ptm-secondary" disabled
                                data-bs-toggle="tooltip" title="Solicitar Refacción">
                                <i class="bi bi-tools"></i>
                            </button>`;
                                } else {
                                    refaccionbutton = `
                            <button class="btn btn-sm btn-ptm-primary btn-solicitar-refaccion"
                                data-bs-toggle="tooltip"
                                title="Solicitar Refacción"
                                ${dataAttrs}>
                                <i class="bi bi-tools"></i>
                            </button>`;
                                }

                                // ================= CARATULA =================
                                if ((estatusOrden == 4 || ordenFinalizada === "SI") && esTecnico) {
                                    caratulabutton = `
                            <button class="btn btn-sm btn-ptm-secondary" disabled
                                data-bs-toggle="tooltip" title="Carátula(OT)">
                                <i class="bi bi-eye"></i>
                            </button>`;
                                } else {
                                    caratulabutton = `
                            <button class="btn btn-sm btn-ptm-mid btn-caratula-online"
                                data-bs-toggle="tooltip"
                                title="Carátula(OT)"
                                ${dataAttrs}>
                                <i class="bi bi-eye"></i>
                            </button>`;
                                }

                                // ================= IMPRESION =================
                                let impresionbutton = "";

                                if (!esTecnico && !esSupProduccion) {
                                    if (estatusOrden == 4 || ordenFinalizada === "SI") {
                                        impresionbutton = `
                                <button class="btn btn-sm btn-ptm-secondary" disabled
                                    data-bs-toggle="tooltip" title="Impresión(OT)">
                                    <i class="bi bi-printer"></i>
                                </button>`;
                                    } else {
                                        impresionbutton = `
                                <button class="btn btn-sm btn-ptm-light btn-impresion-online"
                                    data-bs-toggle="tooltip"
                                    title="Impresión(OT)"
                                    ${dataAttrs}>
                                    <i class="bi bi-printer"></i>
                                </button>`;
                                    }
                                }

                                // 🔧 LISTADO DE REFACCIÓNES
                                if (tieneRefacciones === "SI") {
                                    listRefBtn = btn('btn-ptm-primary', 'btn-list-refacciones', 'bi bi-box-seam', 'Solicitar Refacción', dataAttrs);
                                } else {
                                    listRefBtn = btnDisabled('secondary', 'bi bi-box-seam', 'Solicitar Refacción');
                                }

                                return `${refaccionbutton}${caratulabutton}${impresionbutton}${listRefBtn}`;

                            } else {

                                // ================= SIN ESTATUS =================
                                caratulabutton = `
                        <button class="btn btn-sm btn-ptm-secondary" disabled
                            data-bs-toggle="tooltip" title="Carátula(OT)">
                            <i class="bi bi-eye"></i>
                        </button>`;

                                if (esAdmin) {
                                    refaccionbutton = '';
                                } else {
                                    refaccionbutton = `
                            <button class="btn btn-sm btn-ptm-secondary" disabled
                                data-bs-toggle="tooltip" title="Solicitar Refacción">
                                <i class="bi bi-tools"></i>
                            </button>`;
                                }

                                return `${refaccionbutton}${caratulabutton}`;
                            }
                        }
                    },
                    // ✅ Col 3: Número Orden
                    {
                        data: "NumeroOrden",
                        className: "text-center",
                        render: (data, type, row) => {
                            const esNueva = row.DescEstatusOrden === 'Liberado';
                            const punto = esNueva ? `<span class="punto-pulso"></span>` : '';
                            return `${punto}<span class="badge bg-primary badge-custom"><i class="bi bi-clipboard-data me-1"></i>${data || ''}</span>`;
                        }
                    },
                    // ✅ Col 4: Equipo
                    {
                        data: null,
                        render: (data, type, row) => {
                            return `<i class="bi bi-gear-fill me-1 text-muted"></i>
                        ${(row.NombreEquipo || 'N/A')} ${(row.NumeroDocPmCalidad || '')}`;
                        }
                    },
                    // ✅ Col 5: Proceso (Área)
                    {
                        data: "Area",
                        render: (data) => `<i class="bi bi-diagram-3 me-1 text-muted"></i>${data || 'N/A'}`
                    },
                    // ✅ Col 6: Línea
                    {
                        data: "LineaProduccion",
                        render: (data) => `<i class="bi bi-arrow-repeat me-1 text-muted"></i>${data || 'N/A'}`
                    },
                    // ✅ Col 7: Estatus Orden
                    {
                        data: null,
                        className: "text-center",
                        render: (data, type, row) => {
                            if (!row.DescEstatusOrden) {
                                return `<span class="badge bg-info badge-custom">
                                <i class="bi bi-plus-lg me-1"></i>Nueva
                            </span>`;
                            }

                            let status = row.DescEstatusOrden;

                            if (row.OrdenTrabajoFinalizada === "NO" && row.EstatusOrden == 4) {
                                status = "En proceso de firmas";
                            }

                            let badgeClass = 'bg-secondary';
                            let badgeIcon = '';

                            switch (status) {
                                case 'Liberado':
                                    badgeClass = 'btn-ptm-primary';
                                    badgeIcon = '<i class="bi bi-check-circle me-1"></i>';
                                    break;
                                case 'En espera de refacción':
                                    badgeClass = 'bg-warning';
                                    badgeIcon = '<i class="bi bi-tools me-1"></i>';
                                    break;
                                case 'En proceso de firmas':
                                    badgeClass = 'bg-dark';
                                    badgeIcon = '<i class="bi bi-pen me-1"></i>';
                                    break;
                                case 'Cerrado':
                                    badgeClass = 'bg-primary';
                                    badgeIcon = '<i class="bi bi-lock me-1"></i>';
                                    break;
                                case 'Cancelado':
                                    badgeClass = 'bg-danger';
                                    badgeIcon = '<i class="bi bi-x-circle me-1"></i>';
                                    break;
                            }

                            return `<span class="badge ${badgeClass} badge-custom">
                            ${badgeIcon}${status}
                        </span>`;
                        }
                    },
                    // ✅ Col 8: Fecha Solicitud Mantenimiento
                    {
                        data: "FechaCreacion",
                        className: "text-center",
                        render: (data) => `<i class="bi bi-calendar-event me-1 text-muted"></i>${data || 'N/A'}`
                    },
                    // ✅ Col 9: Hora Apertura
                    {
                        data: "HoraApertura",
                        className: "text-center",
                        render: (data) => `<i class="bi bi-clock me-1 text-muted"></i>${data || ''}`
                    },
                    // ✅ Col 10: Hora Cierre
                    {
                        data: "HoraCierre",
                        className: "text-center",
                        render: (data) => `<i class="bi bi-clock-history me-1 text-muted"></i>${data || ''}`
                    },
                    // ✅ Col 11: Tiempo Invertido (Hrs)
                    {
                        data: "TiempoInvertido",
                        className: "text-center",
                        render: (data) => `<i class="bi bi-stopwatch me-1 text-muted"></i>${data ? `${data} HRS` : ''}`
                    },
                    // ✅ Col 12: Texto Breve
                    {
                        data: "TextoCorto",
                        className: "text-center",
                        render: (data) => `<i class="bi bi-card-text me-1 text-muted"></i>${data || ''}`
                    },
                    // ✅ Col 13: Solicitante
                    {
                        data: "Solicitante",
                        className: "text-center",
                        render: (data) => `<i class="bi bi-person-circle me-1 text-muted"></i>${data || ''}`
                    },
                    // ✅ Col 14: Comentarios
                    {
                        data: null,
                        render: () => `<i class="bi bi-chat-left-text me-1 text-muted"></i>`
                    },
                    // ✅ Col 15: Tipo Mantenimiento
                    {
                        data: "TipoMantenimiento",
                        className: "text-center",
                        render: (data, type, row) => {
                            let tipo_mantenimiento = (this.datos_usuario[0].PLANTA == "2") ? "Correctivo" : "Z10";
                            return `<span class="badge bg-danger badge-custom"><i class="bi bi-wrench-adjustable me-1"></i>${tipo_mantenimiento}</span>`;
                        }
                    }
                ],
                columnDefs: [
                    // Columnas no ordenables
                    { orderable: false, targets: [0, 1, 2, 7, 9, 10, 11, 12, 13, 14] },

                    // Centrado de columnas
                    { className: "text-center", targets: [0, 1, 2, 3, 7, 8, 9, 10, 11, 12, 13, 14, 15] },

                    // 🎯 PRIORIDADES RESPONSIVE
                    { responsivePriority: 1, targets: 0 },  // Control +/-
                    { responsivePriority: 2, targets: 1 },  // Checkbox
                    { responsivePriority: 3, targets: 2 },  // Acciones
                    { responsivePriority: 4, targets: 3 },  // Número Orden
                    { responsivePriority: 5, targets: 4 },  // Equipo
                    { responsivePriority: 6, targets: 5 },  // Proceso
                    { responsivePriority: 7, targets: 6 },  // Línea
                    { responsivePriority: 8, targets: 7 },  // Estatus Orden
                    { responsivePriority: 9, targets: 8 },  // Fecha Solicitud Mantenimiento
                    { responsivePriority: 10, targets: 9 },  // Hora Apertura
                    { responsivePriority: 11, targets: 10 },  // Hora Cierre
                    { responsivePriority: 12, targets: 11 },  // Tiempo Invertido
                    { responsivePriority: 13, targets: 12 },  // Texto Breve
                    { responsivePriority: 14, targets: 13 },  // Solicitante
                    { responsivePriority: 15, targets: 14 },  // Comentarios
                    { responsivePriority: 16, targets: 15 },  // Tipo Mantenimiento
                ],
                ordering: false,
                info: true,
                bPaginate: true,
                pageLength: 200,
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
                    $(row).attr('data-id-solicitud', data.IdSolicitud);
                    $(row).attr('data-id-equipo', data.IdEquipo);
                    $(row).attr('data-area', data.Area);
                    $(row).attr('data-linea', data.LineaProduccion);
                    $(row).attr('data-solicitante', data.Solicitante);

                    $(row).data('mantenimiento-completo', {
                        idSolicitud: data.IdSolicitud,
                        idEquipo: data.IdEquipo,
                        nombreEquipo: (data.NombreEquipo + ' ' + data.NumeroDocPmCalidad),
                        descripcionEquipo: data.DescripcionEquipo,
                        area: data.Area,
                        lineaProduccion: data.LineaProduccion,
                        tipoMantenimiento: data.TipoMantenimiento,
                        solicitante: data.Solicitante,
                        nominaSolicitante: data.NominaSolicitante,
                        claseMantenimiento: data.ClaseMantenimiento,
                        textoCorto: data.TextoCorto,
                        fechaCreacion: data.FechaCreacion
                    });

                    // ✅ Resaltar filas con estatus Liberado (nuevas)
                    if (data.DescEstatusOrden === 'Liberado') {
                        $(row).addClass('fila-liberado');
                    }
                },
                drawCallback: function () {

                    table.columns.adjust();

                    // 🔥 Corregir ancho del empty table
                    const api = this.api();

                    if (api.data().count() === 0) {

                        const totalColumnas = api.columns().visible().reduce((a, b) => a + (b ? 1 : 0), 0);

                        $('#tablaMantenimientosRango tbody td.dt-empty')
                            .attr('colspan', totalColumnas)
                            .css({
                                'text-align': 'center',
                                'width': '100%'
                            });
                    }
                }
            });

            // ✅ Ajustar cuando cambia el tamaño de ventana
            $(window).on('resize', function () {
                if ($.fn.DataTable.isDataTable('#tablaMantenimientosRango')) {
                    const nuevoOffset = calcularHeaderOffset();
                    $('#tablaMantenimientosRango').DataTable().fixedHeader.headerOffset(nuevoOffset);
                    $('#tablaMantenimientosRango').DataTable().fixedHeader.adjust();
                }
            });

            return table;

        } catch (error) {
            AlertManager.mostrar('No es posible mostrar los mantenimientos: ' + error, 'warning');
            console.error('Error en llenarMantenimientosCorrectivosPorRango:', error);
        }
    }

    buildDataAttributes(row) {

        const map = {
            idsolicitud: row.IdSolicitud,
            idequipo: row.IdEquipo,
            planta: row.Planta,
            numerodocpmcalidad: row.NumeroDocPmCalidad,
            nombreequipo: row.NombreEquipo,
            descripcionequipo: row.DescripcionEquipo,
            idarea: row.Idarea,
            area: row.Area,
            idlineaproduccion: row.IdLineaProduccion,
            lineaproduccion: row.LineaProduccion,
            centrocostos: row.CentroCostos,
            tipomantenimiento: row.TipoMantenimiento,
            solicitante: row.Solicitante,
            nominasolicitante: row.NominaSolicitante,
            clasemantenimiento: row.ClaseMantenimiento,
            textocorto: row.TextoCorto,
            scrap: row.Scrap,
            horacierreman: row.HoraCierreMan,
            fechacreacion: row.FechaCreacion,
            numeroorden: row.NumeroOrden,
            horaapertura: row.HoraApertura,
            horacierre: row.HoraCierre,

            // 🔥 NUEVOS
            horainicio: row.HoraInicio,
            horafin: row.HoraFin,
            horainiciotime: row.HoraInicioTime,
            horafintime: row.HoraFinTime,
            textosecuencia: row.TextoSecuencia,
            duracionhrs: row.DuracionHrs,

            estatusorden: row.EstatusOrden,
            descestatusorden: row.DescEstatusOrden,
            idmantenimiento: row.IdMantenimiento,

            firmarealizo: row.FirmaRealizo,
            nombrerealizo: row.NombreRealizo,
            firmasuperviso: row.FirmaSuperviso,
            nombresuperviso: row.NombreSuperviso,
            firmamantenimiento: row.FirmaMantenimiento,
            nombremantenimiento: row.NombreMantenimiento,
            MaquinaDetenida: row.MaquinaDetenida
        };

        return Object.entries(map)
            .map(([key, value]) => `data-${key}="${(value ?? '').toString().replace(/"/g, '&quot;')}"`)
            .join(' ');
    }

    // ============================
    // AGREGAR MANTENIMIENTO
    // ============================
    abrirModalAgregar(e) {
        e.preventDefault();
        $('#agregarMantenimientoModal').modal('show');
    }

    // ============================
    // FILTROSconfigurarEventosFiltrosMantenimientos
    // ============================
    aplicarFiltros() {
        AlertManager.mostrar('Funcionalidad de filtro será implementada próximamente', 'info');
    }

    seleccionarTodos(e) {
        $('.row-checkbox').prop('checked', $(e.target).prop('checked'));
    }

    // ============================
    // REFACCIONES
    // ============================
    abrirModalRefaccion(btn) {

        const data = this.getDataFromButton(btn);

        // Reset del formulario
        $("#formSolicitarRefaccion")[0].reset();
        ValidationManager.limpiarValidacion('#formSolicitarRefaccion');

        // ===== LLENAR EL MODAL =====

        // Número de Orden
        $('#ROT').val(data.numeroOrden || '');

        // Equipo
        $('#REquipo').val((data.nombreEquipo || '') + ' ' + (data.numeroDocPmCalidad || ''));

        // Línea
        $('#RLinea').val(data.lineaProduccion || '');

        // Fecha del Mantenimiento
        if (data.horaApertura) {
            const [fechaParte] = data.horaApertura.split(' ');
            $('#RFechaMantenimiento').val(fechaParte || '');
        } else if (data.fechaCreacion) {
            $('#RFechaMantenimiento').val(data.fechaCreacion);
        }

        // Limpiar artículos
        this.appReferencia.gestionArticulosMC.limpiar();

        // Guardar IDs
        this.ID_MANTENIMIENTO = data.idMantenimiento;
        this.ID_SOLICITUD = data.idSolicitud;
        this.ID_EQUIPO = data.idEquipo;

        // Mostrar modal
        $('#solicitarRefaccionModal').modal('show');
    }

    enviarSolicitudRefaccion(e) {
        e.preventDefault();

        // ✅ Validar que haya artículos en la tabla
        const articulos = this.appReferencia ? this.appReferencia.gestionArticulosMC.obtenerArticulos() : [];
        if (articulos.length === 0) {
            AlertManager.mostrar('Agregue al menos un artículo a la solicitud.', 'warning', 'alertRefaccionContainer');
            return;
        }

        // Validar formulario
        if (!ValidationManager.validarFormulario('#formSolicitarRefaccion')) {
            AlertManager.mostrar('Por favor, complete correctamente todos los campos', 'warning', 'alertRefaccionContainer');
            return false;
        }

        // ✅ Recopilar los datos con múltiples artículos
        const datos = {
            Articulos: articulos.map(art => ({
                RefaccionSolicitada: art.CodigoArticulo,
                Cantidad: art.Cantidad,
                OrdenTrabajo: $('#ROT').val(),
                IdEquipo: this.ID_EQUIPO,
                IdSolicitud: parseInt(this.ID_SOLICITUD),
                IdMantenimiento: parseInt(this.ID_MANTENIMIENTO),
                Estatus: 3,
                NivelUrgencia: $('#RurgenciaRefaccion').val(),
                DescripcionNecesidad: $('#RdescripcionNecesidad').val(),
                UsuarioSolicita: this.datos_usuario[0].EMAIL,
                Planta: this.datos_usuario[0].PLANTA
            })),
            OrdenTrabajo: $('#ROT').val(),
            IdEquipo: this.ID_EQUIPO,
            IdSolicitud: parseInt(this.ID_SOLICITUD),
            IdMantenimiento: parseInt(this.ID_MANTENIMIENTO),
            Estatus: 3,
            NivelUrgencia: $('#RurgenciaRefaccion').val(),
            DescripcionNecesidad: $('#RdescripcionNecesidad').val(),
            UsuarioSolicita: this.datos_usuario[0].EMAIL,
            Planta: this.datos_usuario[0].PLANTA
        };

        $("#btnSolicitarRefaccion").html('<span class="spinner-border spinner-border-sm me-2"></span>Guardando...');
        $("#btnSolicitarRefaccion").prop("disabled", true);

        let TipoUsuario = this.datos_usuario[0].TIPOUSUARIO;

        $.ajax({
            url: `/${this.URLBase}/InsertarSolicitudRefaccion`,
            type: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Rol-Usuario': TipoUsuario  // 👈 esto
            },
            contentType: 'application/json; charset=utf-8',
            data: JSON.stringify(datos),
            dataType: 'json',
            success: (response) => {
                if (response.Status === 'SI') {
                    $("#btnSolicitarRefaccion").html('<i class="bi bi-check-circle-fill me-2 text-white"></i>Solicitud generada correctamente');
                    $("#btnSolicitarRefaccion").prop("disabled", false);

                    // Limpiar formulario y tabla
                    $("#formSolicitarRefaccion")[0].reset();
                    $("#formSolicitarRefaccion").removeClass("was-validated");

                    // ✅ Limpiar tabla de artículos
                    if (this.appReferencia) {
                        this.appReferencia.gestionArticulosMC.limpiar();
                    }

                    // 🔥 RECARGAR LA TABLA DATATABLE
                    $('#tablaMantenimientosRango').DataTable().ajax.reload(null, false);

                    setTimeout(function () {
                        $("#btnSolicitarRefaccion").html('<i class="bi bi-save me-1"></i>Guardar');
                        $("#solicitarRefaccionModal").modal('hide');
                    }, 3000);

                } else {
                    $("#btnSolicitarRefaccion").html('<i class="bi bi-save me-1"></i>Guardar');
                    $("#btnSolicitarRefaccion").prop("disabled", false);
                    AlertManager.mostrar(response.Message || 'Error al realizar la solicitud de refacción', 'warning', "alertRefaccionContainer");
                }
            },
            error: (xhr, status, error) => {
                $("#btnSolicitarRefaccion").html('<i class="bi bi-save me-1"></i>Guardar');
                $("#btnSolicitarRefaccion").prop("disabled", false);
                AlertManager.mostrar('Error al conectar con el servidor', 'warning', "alertRefaccionContainer");
            }
        });
    }

    // ============================
    // GENERAR ÓRDENES
    // ============================
    generarOrdenes() {
        try {
            const checkboxes = $('#tablaMantenimientosRango .row-checkbox:checked');
            if (checkboxes.length === 0) {
                AlertManager.mostrar('Debe seleccionar al menos una fila para generar las órdenes de trabajo.', 'warning');
                return;
            }
            let Usuario = this.datos_usuario[0].EMAIL;
            // Obtener array de objetos con ID, Nombre y Fechas del Periodo
            const equiposSeleccionados = checkboxes.map(function () {
                const fila = $(this).closest('tr');
                const datosCompletos = fila.data('mantenimiento-completo');
                return {
                    IdSolicitud: datosCompletos.idSolicitud,
                    NombreEquipo: datosCompletos.nombreEquipo,
                    Usuario: Usuario         // ✅ NUEVO
                };
            }).get();

            $.ajax({
                url: `/${this.URLBase}/InsertarMC`,
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                data: JSON.stringify(equiposSeleccionados),
                dataType: 'json',
                beforeSend: function () {
                    GlobalUtil.mostrarLoader(true);
                },
                success: (response) => {
                    if (response.Status === 'SI') {
                        $('#tablaMantenimientosRango').DataTable().ajax.reload(null, false);
                        AlertManager.mostrar(response.Message, 'success');
                    } else {
                        AlertManager.mostrar(response.Message || 'Error al generar las ordenes de trabajo', 'warning');
                    }
                    GlobalUtil.mostrarLoader(false);
                },
                error: (xhr, status, error) => {
                    AlertManager.mostrar('Error al conectar con el servidor,intente de nuevo más tarde', 'warning', "alertEquipoContainer");
                    GlobalUtil.mostrarLoader(false);
                }
            });
        }
        catch (error) {
            AlertManager.mostrar('No es posible generar las ordenes de trabajo: ' + error, 'warning');
        }
    }

    // ============================
    // ORDENES TRABAJO
    // ============================
    abrirModalCaratulaOnline(btn) {

        const data = this.getDataFromButton(btn);

        // 🔥 Tipo operación
        this.TIPO_OPERACION = (data.estatusOrden == "4" ? "U" : "I");

        // Reset
        $("#formOrdenMantenimiento")[0].reset();
        ValidationManager.limpiarValidacion('#formOrdenMantenimiento');
        $("#btnGuardarOT").prop("disabled", false);
        $("#btnGuardarOT").removeClass("btn_disabled");

        // ================= DATOS =================
        $('#NumeroOrden').val(data.numeroOrden || '');
        $('#Solicitante').val(data.solicitante || '');
        $('#NominaSolicitante').val(data.nominaSolicitante || '');
        $('#ClaseMantenimiento').val(data.claseMantenimiento || 'Z10');
        $('#NombreEquipo').val(data.nombreEquipo || '');
        $('#DescEquipo').val(data.descripcionEquipo || '');
        $('#TextoCorto').val(data.textoCorto || '');
        $("#EstatusOrden").val(data.descEstatusOrden || '');

        // 🔥 Fecha/Hora
        let HoraAperturaOT = "";

        if (data.horaApertura) {
            const [fechaParte, horaParte] = data.horaApertura.split(' ');
            const [dia, mes, anio] = fechaParte.split('/');
            HoraAperturaOT = horaParte.substring(0, 5);
            $("#FechaInicioExtrema").val(`${anio}-${mes}-${dia}`);
            $("#HoraInicio").val(HoraAperturaOT);
            $("#HoraInicioTrabajo").val(HoraAperturaOT);
        }

        $("#Scrap").val(data.scrap);
        $("#HoraCierreMan").val(data.horaCierreMan);

        $("#UbicacionTecnica").val(data.area ? `AREA ${data.area}` : '');
        $("#CentroCostos").val(data.centroCostos || '');
        $("#NumDocPmCalidad").val(data.numeroDocPmCalidad || '');
        $("#Linea").val(data.lineaProduccion || '');
        $("#DescripcionEquipo").val(data.descripcionEquipo || '');
        $("#NumeroEquipo").val(data.numeroDocPmCalidad || '');

        const tipoMtto = (this.datos_usuario[0].PLANTA == "2") ? "CORRECTIVO" : "Z10";
        $("#TipoMantenimiento").val(tipoMtto);

        let codigo_mantenimiento = (this.datos_usuario[0].PLANTA == "1" ? "PL1" : "PL2") + "-CMT" + data.area + "01-L01-F01";
        $("#CodigoMantenimiento").val(codigo_mantenimiento);

        $("#GrupoPlaneacion").val(this.datos_usuario[0].PLANTA + "_" + data.area);
        $("#fechaImpresion").text(DateUtils.obtenerFechaHora());

        // ================= REGISTRO DE TRABAJO =================
        // Hora Inicio
        if (data.horaInicioTime) {
            $("#HoraInicioTrabajo").val(data.horaInicioTime.substring(0, 5));
        }
        // Hora Fin
        if (data.horaFinTime) {
            $("#HoraFin").val(data.horaFinTime.substring(0, 5));
        }
        // Texto Secuencia
        $("#TextoSecuencia").val(data.textoSecuencia || '');
        // Duración
        $("#DuracionHrs").val(data.duracionHrs || '');

        // IDs
        this.ID_SOLICITUD = data.idSolicitud;
        this.ID_EQUIPO = data.idEquipo;
        this.ID_MANTENIMIENTO = data.idMantenimiento;

        // UI
        $('#rutinaNombreEquipo').text(data.nombreEquipo + ' ' + data.numeroDocPmCalidad);
        $('#rutinaProceso').text(data.area);

        this.gestionFirmas.limpiarTodasLasFirmas();

        const tipoUsuario = this.datos_usuario[0].TIPOUSUARIO;
        HoraAperturaOT = $("#HoraInicio").val();
        if (tipoUsuario === "TecnicoMtto") {
            this.configurarVistaTecnico();
        } else if (tipoUsuario === "Produccion") {
            this.configurarVistaProduccion(data.MaquinaDetenida,data.estatusOrden, data.firmaRealizo, data.firmaSuperviso, data.firmaMantenimiento, data.horaApertura, data.horaCierre, data.horaInicio, data.horaFin);
        }
        else {
            this.configurarVistaAdministrador(data.MaquinaDetenida,data.estatusOrden, data.firmaRealizo, data.firmaMantenimiento, data.firmaSuperviso, data.horaApertura, data.horaCierre, data.horaInicio, data.horaFin);
        }

        // 🔥 Firma
        // Si el usuario NO es Produccion ni TecnicoMtto -> ocultar el campo de firma Mantenimiento y no permitir guardar OT
        if (tipoUsuario !== "Produccion" && tipoUsuario !== "TecnicoMtto") {
            // Ocultar firma y botón mediante helper global (con fallback si no está disponible)
            if (typeof GlobalUtil !== 'undefined' && typeof GlobalUtil.ocultarFirmaMantenimiento === 'function') {
                GlobalUtil.ocultarFirmaMantenimiento();
            } else {
                try {
                    $("#firmaMantenimientoContainer").addClass('d-none');
                    $("#btnGuardarOT").addClass('d-none');
                    $("#btnGuardarOT").prop('disabled', true).addClass('btn_disabled');
                    if (this.gestionFirmas && this.gestionFirmas.deshabilitarFirma) {
                        this.gestionFirmas.deshabilitarFirma('Mantenimiento', true);
                    }
                } catch (e) {
                    console.warn('Error ocultando firma/btnGuardarOT:', e);
                }
            }

            // Solo encolar firmas Realizo y Superviso
            this.gestionFirmas.queueFirma('realizo', data.firmaRealizo, data.nombreRealizo);
            this.gestionFirmas.queueFirma('superviso', data.firmaSuperviso, data.nombreSuperviso);
        } else {
            // En usuarios Produccion o TecnicoMtto encolar todas las firmas
            this.gestionFirmas.queueFirma('realizo', data.firmaRealizo, data.nombreRealizo);
            this.gestionFirmas.queueFirma('superviso', data.firmaSuperviso, data.nombreSuperviso);
            this.gestionFirmas.queueFirma('mantenimiento', data.firmaMantenimiento, data.nombreMantenimiento);
        }

        this.cargarTecnicos(data.numeroOrden, "MC");

        try {
            if (data.estatusOrden == 4) {
                $('#maquinaDetenidaBanner').addClass('maquina-detenida-banner maquina-detenida-banner-stopped');
                $("#StopMachineInputContainer").addClass('d-none');
                $("#MaquinaDetenidaToggle").prop('disabled', true);
                if (data.MaquinaDetenida == 1) {
                    $("#maquina_detenida_icon").removeClass("bi-check-circle-fill").addClass("bi-exclamation-octagon-fill");
                    $("#maquina_detenida_title").text("El quipo se detuvo");
                }
                else {
                    $("#maquina_detenida_icon").removeClass("bi-exclamation-octagon-fill").addClass("bi-check-circle-fill");
                    $("#maquina_detenida_title").text("El equipo operó normalmente");
                }
            } else {
                $('#maquinaDetenidaBanner').removeClass('maquina-detenida-banner maquina-detenida-banner-stopped');
                $('#maquinaDetenidaToggle').prop('checked', (data.MaquinaDetenida == 1 ? true : false));
                $("#StopMachineInputContainer").removeClass('d-none');
                $("#MaquinaDetenidaToggle").prop('disabled', false);
                $("#MaquinaDetenidaToggle").removeAttr('required');
            }
        } catch (e) { console.warn('MaquinaDetenida no disponible en data'); }

        $('#modalOrdenMantenimiento').modal('show');
    }

    cargarFirmasExistentes(firmas) {

        this.gestionFirmas._cargarFirmaFromDB('realizo', firmas.firmaRealizo, firmas.nombreRealizo);
        this.gestionFirmas._cargarFirmaFromDB('superviso', firmas.firmaSuperviso, firmas.nombreSuperviso);
        this.gestionFirmas._cargarFirmaFromDB('mantenimiento', firmas.firmaMantenimiento, firmas.nombreMantenimiento);

    }

    cargarTecnicos(numeroOrden, tipo) {

        const key = `${numeroOrden}_${tipo}`;

        if (!this.cacheTecnicos) {
            this.cacheTecnicos = {};
        }

        // 🔥 CACHE
        if (this.cacheTecnicos[key]) {
            if (this.cacheTecnicos[key].length > 0)
                this.gestionTecnicos.cargarTecnicosDesdeDB(this.cacheTecnicos[key]);
            return;
        }

        $.ajax({
            url: `/${this.URLBase}/ObtenerTecnicosOT`,
            type: 'GET',
            data: {
                numeroOrden: numeroOrden,
                tipo: tipo
            },
            dataType: 'json',

            beforeSend: () => {
                $('#listaTecnicosAsignados').html(`
                <div class="text-center py-2">
                    <div class="spinner-border spinner-border-sm text-primary"></div>
                </div>
            `);
            },

            success: (data) => {

                this.cacheTecnicos[key] = data;

                this.gestionTecnicos.cargarTecnicosDesdeDB(data);
            },

            error: (xhr, status, error) => {

                $('#listaTecnicosAsignados').html(`
                <div style="color:red; font-size:0.9rem;">
                    Error al cargar técnicos
                </div>
            `);

                console.error(error);
            }
        });
    }

    async cargarTecnicosLista(numeroOrden, tipo) {

        const key = `${numeroOrden}_${tipo}`;

        if (!this.cacheTecnicos) {
            this.cacheTecnicos = {};
        }

        // 🔥 CACHE
        if (this.cacheTecnicos[key]) {
            return this.cacheTecnicos[key];
        }

        try {
            const response = await $.ajax({
                url: `/${this.URLBase}/ObtenerTecnicosOT`,
                type: 'GET',
                data: {
                    numeroOrden: numeroOrden,
                    tipo: tipo
                },
                dataType: 'json'
            });

            this.cacheTecnicos[key] = response;

            return response;

        } catch (error) {
            console.error("Error obteniendo técnicos:", error);
            return [];
        }
    }

    async guardarOT(e) {
        e.preventDefault();

        // Validar formulario
        if (!ValidationManager.validarFormulario('#formOrdenMantenimiento')) {
            AlertManager.mostrar('Por favor, complete correctamente todos los campos', 'warning', "alertOrdenContainer");
            return false;
        }

        // ✅ Validar técnicos
        if (this.gestionTecnicos.tecnicosAsignados.length === 0) {
            AlertManager.mostrar(
                'Debe asignar al menos un técnico a la orden de trabajo',
                'warning',
                "alertOrdenContainer"
            );
            $('#BuscarTecnico').focus();
            $('#btnGuardarOT').html('<i class="bi bi-save me-1"></i>Guardar').prop('disabled', false);
            return false;
        }

        let FirmaRequerida = "";
        if (this.datos_usuario[0].TIPOUSUARIO == "TecnicoMtto") {
            FirmaRequerida = "Realizo";
        }
        if (this.datos_usuario[0].TIPOUSUARIO == "SupervisorProduccion") {
            FirmaRequerida = "Superviso";
        }
        if (this.datos_usuario[0].TIPOUSUARIO == "AdminMtto" || this.datos_usuario[0].TIPOUSUARIO == "Administrador") {
            FirmaRequerida = "Mantenimiento";
        }
        // 🔥 VALIDAR FIRMAS (solo si la sección está visible)
        if ($('#SeccionFirmas').is(':visible')) {
            if (!this.gestionFirmas.validarFirmas(FirmaRequerida)) {
                $('#btnGuardarOT').html('<i class="bi bi-save me-1"></i>Guardar').prop('disabled', false);
                return false;
            }

            // 🔥 Guardar las firmas en los campos ocultos ANTES de obtenerlas
            this.gestionFirmas.guardarTodasLasFirmas();
        }

        // ✅ Deshabilitar botón y mostrar loading
        $('#btnGuardarOT').html('<span class="spinner-border spinner-border-sm me-2"></span>Guardando OT...').prop('disabled', true);

        try {
            const datos = GlobalUtil.obtenerDatosAnyFormulario("formOrdenMantenimiento");
            datos.Usuario = this.datos_usuario[0].EMAIL;
            datos.TipoOperacion = this.TIPO_OPERACION;
            // ✅ Convertir horas de 12h (10:00 AM) a 24h (10:00:00)
            if (datos.HoraInicioTrabajo) {
                datos.HoraInicio = this.convertirA24Horas(datos.HoraInicioTrabajo);
            }
            if (datos.HoraFin) {
                datos.HoraFin = this.convertirA24Horas(datos.HoraFin);
            }

            datos.TecnicosAsignados = this.gestionTecnicos.obtenerNominasComoString();
            datos.IdMantenimiento = this.ID_MANTENIMIENTO;

            // ✅ Incluir el estado real de "Máquina detenida" como entero (1 = detenido, 0 = funcionando)
            // El input checkbox tiene id #MaquinaDetenidaToggle
            datos.MaquinaDetenida = $('#MaquinaDetenidaToggle').is(':checked') ? 1 : 0;

            // 🔥 OBTENER Y AGREGAR FIRMAS DIGITALES
            const firmas = this.gestionFirmas.obtenerTodasLasFirmas();

            // 🔥 AGREGAR DATOS DE FIRMAS AL OBJETO
            datos.FirmaRealizo = firmas.realizo.firma || '';        // Base64 PNG
            datos.NombreRealizo = firmas.realizo.nombre || '';
            datos.FirmaSuperviso = firmas.superviso.firma || '';    // Base64 PNG
            datos.NombreSuperviso = firmas.superviso.nombre || '';
            datos.FirmaMantenimiento = firmas.mantenimiento.firma || ''; // Base64 PNG
            datos.NombreMantenimiento = firmas.mantenimiento.nombre || '';

            // 🔥 GUARDAR LA ORDEN DE TRABAJO
            await this.guardarOTDefinitivo(datos);

        } catch (error) {
            // ❌ Manejar cualquier error
            console.error('Error en el proceso:', error);
            AlertManager.mostrar('No es posible guardar la orden de trabajo: ', 'warning', "alertOrdenContainer");
            $('#btnGuardarOT').html('<i class="bi bi-save me-1"></i>Guardar').prop('disabled', false);
        }

        return false;
    }

    // ✅ Método para convertir de 12h a 24h (formato TIME)
    convertirA24Horas(hora12h) {
        if (!hora12h || hora12h.trim() === '') {
            return null;
        }

        try {
            // Separar hora y AM/PM
            const [time, modifier] = hora12h.trim().split(' ');
            let [hours, minutes] = time.split(':');

            hours = parseInt(hours, 10);

            // Convertir a formato 24 horas
            if (modifier && modifier.toUpperCase() === 'PM' && hours !== 12) {
                hours += 12;
            }
            if (modifier && modifier.toUpperCase() === 'AM' && hours === 12) {
                hours = 0;
            }

            // Retornar en formato HH:MM:SS
            return `${hours.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;

        } catch (error) {
            console.error('Error al convertir hora:', hora12h, error);
            return null;
        }
    }
    // 🔥 MÉTODO SEPARADO PARA GUARDAR LA OT (también async)
    async guardarOTDefinitivo(datos) {
        let TipoUsuario = this.datos_usuario[0].TIPOUSUARIO;
        return new Promise((resolve, reject) => {
            $.ajax({
                url: `/${this.URLBase}/InsertarOrdenTrabajoMC`,
                type: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Rol-Usuario': TipoUsuario  // 👈 esto
                },
                contentType: 'application/json; charset=utf-8',
                data: JSON.stringify(datos),
                dataType: 'json',
                success: (response) => {
                    if (response.Status === 'SI') {
                        AlertManager.mostrar(
                            response.Message,
                            'success',
                            "alertOrdenContainer"
                        );

                        // Recargar la tabla
                        $('#tablaMantenimientosRango').DataTable().ajax.reload(null, false);

                        // Cerrar modal después de 2 segundos
                        setTimeout(() => {
                            $('#modalOrdenMantenimiento').modal('hide');
                            $('#formOrdenMantenimiento')[0].reset();
                            this.gestionTecnicos.limpiar();
                        }, 2000);

                        resolve(true);
                    } else {
                        AlertManager.mostrar(response.Message || 'Error al guardar la orden de trabajo', 'warning', "alertOrdenContainer");
                        reject(false);
                    }

                    // Restaurar botón
                    $('#btnGuardarOT').html('<i class="bi bi-save me-1"></i>Guardar').prop('disabled', false);
                },
                error: (xhr, status, error) => {
                    AlertManager.mostrar('Error al conectar con el servidor', 'warning', "alertOrdenContainer");
                    $('#btnGuardarOT').html('<i class="bi bi-save me-1"></i>Guardar').prop('disabled', false);
                    reject(error);
                }
            });
        });
    }

    getDataFromButton(btn) {

        const d = btn.data();

        return {
            idSolicitud: d.idsolicitud,
            idEquipo: d.idequipo,
            planta: d.planta,
            numeroDocPmCalidad: d.numerodocpmcalidad,
            nombreEquipo: d.nombreequipo,
            descripcionEquipo: d.descripcionequipo,
            idArea: d.idarea,
            area: d.area,
            idLineaProduccion: d.idlineaproduccion,
            lineaProduccion: d.lineaproduccion,
            centroCostos: d.centrocostos,
            tipoMantenimiento: d.tipomantenimiento,
            solicitante: d.solicitante,
            nominaSolicitante: d.nominasolicitante,
            claseMantenimiento: d.clasemantenimiento,
            textoCorto: d.textocorto,
            scrap: d.scrap,
            horaCierreMan: d.horacierreman,
            fechaCreacion: d.fechacreacion,
            numeroOrden: d.numeroorden,
            horaApertura: d.horaapertura,
            horaCierre: d.horacierre,

            // 🔥 NUEVOS
            horaInicio: d.horainicio,
            horaFin: d.horafin,
            horaInicioTime: d.horainiciotime,
            horaFinTime: d.horafintime,
            textoSecuencia: d.textosecuencia,
            duracionHrs: d.duracionhrs,

            estatusOrden: d.estatusorden,
            descEstatusOrden: d.descestatusorden,
            idMantenimiento: d.idmantenimiento,

            firmaRealizo: d.firmarealizo || '',
            nombreRealizo: d.nombrerealizo || '',
            firmaSuperviso: d.firmasuperviso || '',
            nombreSuperviso: d.nombresuperviso || '',
            firmaMantenimiento: d.firmamantenimiento || '',
            nombreMantenimiento: d.nombremantenimiento || '',
            MaquinaDetenida: d.maquinadetenida || '',
        };
    }

    // ============================
    // RUTINAS
    // ============================
    abrirModalRutinaOnline(btn) {
        // ===== OBTENER TODOS LOS DATA ATTRIBUTES =====
        const idEquipo = btn.data('idequipo');
        const planta = btn.data('planta');
        const numeroDocPmCalidad = btn.data('numerodocpmcalidad');
        const nombreEquipo = btn.data('nombreequipo');
        const descripcionEquipo = btn.data('descripcionequipo');
        const idArea = btn.data('idarea');
        const area = btn.data('area');
        const idLineaProduccion = btn.data('idlineaproduccion');
        const lineaProduccion = btn.data('lineaproduccion');
        const centrocostos = btn.data('centrocostos');
        const periodicidadMantenimiento = btn.data('periodicidadmantenimiento');
        const diaInicioMant = btn.data('diainiciomant');
        const diaFinMant = btn.data('diafinmant');
        const fechaInicioMant = btn.data('fechainiciomant');
        const mesMantenimiento = btn.data('mesmantenimiento');
        const fechaInicioMantenimiento = btn.data('fechainiciomantenimiento');
        const fechaFinMantenimiento = btn.data('fechafinmantenimiento');
        const fechaReferencia = btn.data('fechareferencia');
        const tipoMantenimiento = btn.data('tipomantenimiento');
        const numeroOrden = btn.data('numeroorden');
        const horaApertura = btn.data('horaapertura');
        const estatusOrden = btn.data('estatusorden');
        const descEstatusOrden = btn.data('descestatusorden');
        const idMantenimiento = btn.data('idmantenimiento');

        // Guardar los datos del equipo
        this.ID_EQUIPO = idEquipo;
        this.ID_MANTENIMIENTO = idMantenimiento;

        $('#rutinaNombreEquipo').text(nombreEquipo + ' ' + numeroDocPmCalidad);
        $('#rutinaProceso').text(area);

        // 🔥 CARGAR LA VISTA DESDE EL SERVIDOR
        this.ConsultarRutinaServer(idEquipo);
    }

    ConsultarRutinaServer(idEquipo) {

        // 🔥 CARGAR LA VISTA DESDE EL SERVIDOR
        $.ajax({
            url: `/${this.URLBaseRutinas}/Default`,
            type: 'GET',
            data: { idEquipo: idEquipo },
            dataType: 'html',
            beforeSend: () => {
                $('#formRutinaOnline').html(`
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Cargando...</span>
                </div>
                <p class="mt-3">Cargando rutina...</p>
            </div>
        `);
            },
            success: (html) => {
                // Cargar el contenido HTML de la vista en el modal
                $('#formRutinaOnline').html(html);

                //✅ TRANSFORMAR LAS FIRMAS A RADIOBUTTONS PARA TECNICO
                if (this.datos_usuario[0].TIPOUSUARIO == "TecnicoMtto") {
                    $('#rutinaChecklist .actividad').each(function (index) {
                        const actividadNum = index + 1;
                        const firmaContainer = $(this).find('.d-flex.gap-4.mt-2');
                        // Crear los radiobuttons
                        const radioHTML = `
                    <div class="d-flex gap-4 mt-2">
                        <div class="form-check position-relative">
                            <input class="form-check-input" type="radio" name="actividad_${actividadNum}" id="actividad_${actividadNum}_realizado" value="realizado" required>
                            <label class="form-check-label fw-semibold" for="actividad_${actividadNum}_realizado">
                                Realizado
                            </label>
                             <div class="invalid-feedback custom-invalid-feedback">
                                ⚠️ Por favor complete la actividad.
                            </div>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="radio" name="actividad_${actividadNum}" id="actividad_${actividadNum}_no_realizado" value="no_realizado">
                            <label class="form-check-label fw-semibold" for="actividad_${actividadNum}_no_realizado">
                                No Realizado
                            </label>
                        </div>
                    </div>
                `;
                        // Reemplazar el contenido
                        firmaContainer.replaceWith(radioHTML);
                    });
                }

                // 🔥 ELIMINAR TODOS LOS BOTONES DE ELIMINAR
                $('#rutinaChecklist .btn-eliminar-actividad').remove();

                // 🔥 QUITAR CLASE "actividad" DE TODOS LOS DIVS
                $('#rutinaChecklist .actividad').removeClass('actividad').addClass("actividad_realizada");
            },
            error: (xhr, status, error) => {
                $('#formRutinaOnline').html(`
            <div class="alert alert-danger" role="alert">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                Error al cargar la rutina: ${error}
            </div>
        `);
            }
        });

    }

    async guardarRutina() {
        return new Promise((resolve, reject) => {
            const respuestas = this.obtenerRespuestasRutina();
            const comentarios = $('#Comentarios').val();

            // Validar que todas las actividades estén respondidas
            const sinResponder = respuestas.filter(r => r.estado === null);
            if (sinResponder.length > 0) {
                AlertManager.mostrar(`Faltan ${sinResponder.length} actividades por responder`, 'warning');
                reject(false); // ❌ Rechazar si falta algo
                return;
            }

            // 🔥 CREAR FORMDATA
            const formData = new FormData();
            formData.append('idMantenimiento', this.ID_MANTENIMIENTO);
            formData.append('idEquipo', this.ID_EQUIPO);
            formData.append('comentarios', comentarios);
            formData.append('actividades', JSON.stringify(respuestas));
            formData.append('usuarioRegistro', this.datos_usuario[0].EMAIL);

            // 🔥 AGREGAR IMÁGENES
            const files = window.imagenesRutina || [];
            console.log('Total de archivos:', files.length);

            for (let i = 0; i < files.length; i++) {
                formData.append('imagenes', files[i]);
                console.log(`Agregando imagen ${i}:`, files[i].name);
            }

            // Enviar al servidor
            $.ajax({
                url: `/${this.URLBase}/GuardarRutina`,
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                beforeSend: function () {
                    $("#btnGuardarRutina").html('<span class="spinner-border spinner-border-sm me-2"></span>Guardando...');
                    $("#btnGuardarRutina").prop("disabled", true);
                },
                success: function (response) {
                    $("#btnGuardarRutina").html('<i class="bi bi-check-circle-fill me-2 text-success"></i>Rutina guardada correctamente.');
                    $("#btnGuardarRutina").prop("disabled", false);

                    // 🔥 RECARGAR LA TABLA DATATABLE
                    $('#tablaMantenimientosRango').DataTable().ajax.reload(null, false);

                    setTimeout(function () {
                        $("#btnGuardarRutina").html('<i class="bi bi-check2-circle me-1"></i>Guardar Rutina');
                        $('#modalRutinaOnline').modal('hide');
                    }, 3000);

                    resolve(true); // ✅ TODO SALIÓ BIEN
                },
                error: function (xhr, status, error) {
                    AlertManager.mostrar('No se pudo guardar la rutina: ' + error, 'warning');
                    $("#btnGuardarRutina").html('<i class="bi bi-check2-circle me-1"></i>Guardar Rutina');
                    $("#btnGuardarRutina").prop("disabled", false);
                    reject(false); // ❌ ERROR
                }
            });
        });
    }

    obtenerRespuestasRutina() {
        const respuestas = [];
        $('#rutinaChecklist .actividad_realizada').each(function (index) {
            const actividadNum = index + 1;
            const textoActividad = $(this).find('.texto-actividad').text().trim();
            // ✅ CORRECTO - Agregamos el $ faltante
            const radioSeleccionado = $(`input[name="actividad_${actividadNum}"]:checked`).val();

            respuestas.push({
                numero: actividadNum,
                descripcion: textoActividad,
                estado: radioSeleccionado || null // null si no seleccionó nada
            });
        });
        return respuestas;
    }

    // ============================
    // TOOLTIPS
    // ============================
    inicializarTooltips() {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        this.tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }

    refreshTooltips() {
        // Destruir tooltips existentes
        if (this.tooltipList) {
            this.tooltipList.forEach(t => t.dispose());
        }

        // Reinicializar
        this.inicializarTooltips();
    }

    // ========================================
    // 🔧 CONFIGURAR VISTA TÉCNICO (CORRECTIVO)
    // ========================================
    configurarVistaTecnico() {

        // SECCIONES
        $('#EvidenciaOrdenTrabajo').removeClass('d-none');
        $('#CierreOrdenTrabajo').removeClass('d-none');
        $('#SeccionFirmas').removeClass('d-none');

        // REQUIRED
        $('#EvidenciaOrdenTrabajo input:not(#fileInput)').prop('required', true);
        $('#CierreOrdenTrabajo input:not(#BuscarTecnico)').prop('required', true);
        $('#BuscarTecnico, #fileInput').prop('required', false);

        // BOTONES
        $('#btnGuardarOT').removeClass('d-none');
        $('#btnExportMantenimientoPDF').addClass('d-none');

        // UPLOADER
        $('#previewArea').empty();
        $('#clearAll').hide();
        $('#uploadArea').removeClass('upload-area-disabled');
        $('#uploadInfo').show();

        const uploader = $('#uploadArea').data('imageUploader');
        if (uploader && uploader.enableUpload) {
            uploader.enableUpload();
        }

        // CAMPOS EDITABLES
        $("#Scrap").removeAttr('readonly').prop('required', true);
        $("#HoraCierreMan").removeAttr('readonly').prop('required', true);

        // 🔥 FIRMAS
        this.gestionFirmas.mostrarFirma('Realizo', true);
        $("#nombreRealizo").val(this.datos_usuario[0].NOMBRECOMPLETO.toUpperCase()).attr('readonly', true);
        this.gestionFirmas.mostrarFirma('Superviso', true);
        this.gestionFirmas.mostrarFirma('Mantenimiento', true);

        this.gestionFirmas.deshabilitarFirma('Superviso', true);
        this.gestionFirmas.deshabilitarFirma('Mantenimiento', true);

        $('#firmaRealizoContainer input[type="text"]').prop('required', true);
        $('#firmaSupervisoContainer input[type="text"]').prop('required', false);
        $('#firmaMantenimientoContainer input[type="text"]').prop('required', false);
    }

    // ========================================
    // 👨‍💼 CONFIGURAR VISTA ADMIN (CORRECTIVO)
    // ========================================
    configurarVistaProduccion(MaquinaDetenida,EstatusOrden, FirmaTecnico, FirmaSuperviso, FirmaMantenimiento, HoraAperturaOT, HoraCierreOT, HoraInicioTrabajo, HoraFinTrabajo) {

        // MOSTRAR FIRMAS
        $('#SeccionFirmas').removeClass('d-none');

        // REQUIRED OFF PARA ADMIN, SIEMPRE LO LLENA EL TECNICO
        $('#EvidenciaOrdenTrabajo input').prop('required', false);
        $('#EvidenciaOrdenTrabajo input').prop('readonly', true);
        $('#CierreOrdenTrabajo input').prop('required', false);
        $('#CierreOrdenTrabajo input').prop('readonly', true);
        // 🔥 CAMPOS BLOQUEADOS DEFAULT ADMIN
        $("#Scrap").attr('readonly', true).prop('required', false);
        $("#HoraCierreMan").attr('readonly', true).prop('required', false);

        // 🔥 FIRMAS
        this.gestionFirmas.mostrarFirma('Realizo', true);
        this.gestionFirmas.mostrarFirma('Superviso', true);
        $("#nombreSuperviso").val(this.datos_usuario[0].NOMBRECOMPLETO.toUpperCase()).attr('readonly', true);
        // Para perfil Producción NO se muestra la firma de Mantenimiento pero se permite guardar OT
        this.gestionFirmas.mostrarFirma('Mantenimiento', false); // no mostrar en UI pero mantener referencia en gestionFirmas
        // Ocultar únicamente la UI de la firma (no el botón GuardarOT)
        try {
            $('#firmaMantenimientoContainer').addClass('d-none');
            $('#btnGuardarOT').removeClass('d-none').prop('disabled', false).removeClass('btn_disabled');
            if (this.gestionFirmas && this.gestionFirmas.deshabilitarFirma) {
                this.gestionFirmas.deshabilitarFirma('Mantenimiento', true);
            }
        } catch (e) { console.warn('No fue posible ocultar firma Mantenimiento (fallback)', e); }

        // bloquear correctamente
        if (FirmaTecnico != "")
            this.gestionFirmas._bloquearFirma("Realizo", true);
        else
            this.gestionFirmas.deshabilitarFirma("Realizo", true);

        if (FirmaMantenimiento != "")
            this.gestionFirmas._bloquearFirma("Mantenimiento", true);
        else
            this.gestionFirmas.deshabilitarFirma("Mantenimiento", true);

        // MOSTRAR SECCIONES SI LA ORDEN YA FUE ATENDIDA POR EL TÉCNICO
        if (EstatusOrden == 4) {
            $('#EvidenciaOrdenTrabajo').removeClass('d-none');
            $('#CierreOrdenTrabajo').removeClass('d-none');

            //TEXTO DE SECUENCIA
            $("#TextoSecuencia").prop('readonly', true);

            // BOTONES
            $('#btnGuardarOT').removeClass('d-none');
            $('#btnExportMantenimientoPDF').removeClass('d-none');

            //INPUTS FIRMAS
            $('#firmaMantenimientoContainer input[type="text"]').prop('required', false);
            $('#firmaRealizoContainer input[type="text"]').prop('required', false);
            $('#firmaSupervisoContainer input[type="text"]').prop('required', true);

            //LISTA DE TECNICOS
            $('#listaTecnicosAsignados').addClass('tecnicos-readonly');
            $("#BusquedaTecnicosContainer").addClass("d-none");

            //TIEMPOS ANALITICOS
            this.calcularTiemposCierreOT(MaquinaDetenida, HoraAperturaOT, HoraCierreOT, HoraInicioTrabajo, HoraFinTrabajo);

            // Deshabilitar y dar estilo distintivo al switch
            $('#MaquinaDetenidaToggle').prop('disabled', true);
            $('#maquinaDetenidaBanner').addClass('maquina-detenida-banner');

        }
        // OCULTAR SECCIONES SI LA ORDEN NO HA SIDO ATENDIDA POR EL TÉCNICO
        else {
            $('#EvidenciaOrdenTrabajo').addClass('d-none');
            $('#CierreOrdenTrabajo').addClass('d-none');

            // BOTONES
            $('#btnGuardarOT').addClass('d-none');
            $('#btnExportMantenimientoPDF').removeClass('d-none');

            //INPUTS FIRMAS
            $('#firmaMantenimientoContainer input[type="text"]').prop('required', false);
            $('#firmaRealizoContainer input[type="text"]').prop('required', false);
            $('#firmaSupervisoContainer input[type="text"]').prop('required', false);

            $("#TiempoEsperaContainer").addClass("d-none");
            $("#TiempoReparacionContainer").addClass("d-none");
        }

        //IMPORTANTE SI YA FIRMO MANTENIMIENTO OCULTAR BOTON GUARDAR
        if (FirmaSuperviso != "") {
            $("#btnGuardarOT").prop("disabled", true);
            $("#btnGuardarOT").addClass("btn_disabled");
        }

    }

    // ========================================
    // 👨‍💼 CONFIGURAR VISTA ADMIN (CORRECTIVO)
    // ========================================
    configurarVistaAdministrador(MaquinaDetenida,EstatusOrden, FirmaTecnico, FirmaMantenimiento, FirmaSuperviso, HoraAperturaOT, HoraCierreOT, HoraInicioTrabajo, HoraFinTrabajo) {

        // MOSTRAR FIRMAS
        $('#SeccionFirmas').removeClass('d-none');

        // REQUIRED OFF PARA ADMIN, SIEMPRE LO LLENA EL TECNICO
        $('#EvidenciaOrdenTrabajo input').prop('required', false);
        $('#EvidenciaOrdenTrabajo input').prop('readonly', true);
        $('#CierreOrdenTrabajo input').prop('required', false);
        $('#CierreOrdenTrabajo input').prop('readonly', true);
        // 🔥 CAMPOS BLOQUEADOS DEFAULT ADMIN
        $("#Scrap").attr('readonly', true).prop('required', false);
        $("#HoraCierreMan").attr('readonly', true).prop('required', false);

        // 🔥 FIRMAS
        this.gestionFirmas.mostrarFirma('Realizo', true);
        this.gestionFirmas.mostrarFirma('Superviso', true);
        this.gestionFirmas.mostrarFirma('Mantenimiento', true); // mantener por si se reactiva
        $("#nombreMantenimiento").val(this.datos_usuario[0].NOMBRECOMPLETO.toUpperCase()).attr('readonly', true);

        // Para perfil Administrador no mostrar la firma de Mantenimiento ni permitir guardar OT
        // Ocultar firma y botón mediante helper global (con fallback si no está disponible)
        if (typeof GlobalUtil !== 'undefined' && typeof GlobalUtil.ocultarFirmaMantenimiento === 'function') {
            GlobalUtil.ocultarFirmaMantenimiento();
        } else {
            try {
                $('#firmaMantenimientoContainer').addClass('d-none');
                $('#btnGuardarOT').addClass('d-none').prop('disabled', true).addClass('btn_disabled');
                if (this.gestionFirmas && this.gestionFirmas.deshabilitarFirma) {
                    this.gestionFirmas.deshabilitarFirma('Mantenimiento', true);
                }
            } catch (e) { console.warn('No fue posible ocultar firma Mantenimiento (fallback)', e); }
        }

        // bloquear correctamente
        if (FirmaTecnico != "")
            this.gestionFirmas._bloquearFirma("Realizo", true);
        else
            this.gestionFirmas.deshabilitarFirma("Realizo", true);

        if (FirmaSuperviso != "")
            this.gestionFirmas._bloquearFirma("Superviso", true);
        else
            this.gestionFirmas.deshabilitarFirma("Superviso", true);
        //this.gestionFirmas._bloquearFirma("Realizo");
        //this.gestionFirmas._bloquearFirma("Superviso");

        // MOSTRAR SECCIONES SI LA ORDEN YA FUE ATENDIDA POR EL TÉCNICO
        if (EstatusOrden == 4) {
            $('#EvidenciaOrdenTrabajo').removeClass('d-none');
            $('#CierreOrdenTrabajo').removeClass('d-none');

            //TEXTO DE SECUENCIA
            $("#TextoSecuencia").prop('readonly', true);

            // BOTONES
            $('#btnGuardarOT').removeClass('d-none');
            $('#btnExportMantenimientoPDF').removeClass('d-none');

            //INPUTS FIRMAS (La firma de "Mantenimiento" ya no es requerida)
            $('#firmaMantenimientoContainer input[type="text"]').prop('required', false);
            $('#firmaRealizoContainer input[type="text"]').prop('required', false);
            $('#firmaSupervisoContainer input[type="text"]').prop('required', false);

            //LISTA DE TECNICOS
            $('#listaTecnicosAsignados').addClass('tecnicos-readonly');
            $("#BusquedaTecnicosContainer").addClass("d-none");

            //TIEMPOS ANALITICOS
            this.calcularTiemposCierreOT(MaquinaDetenida, HoraAperturaOT, HoraCierreOT, HoraInicioTrabajo, HoraFinTrabajo);

            // Deshabilitar y dar estilo distintivo al switch
            $('#MaquinaDetenidaToggle').prop('disabled', true);
            $('#maquinaDetenidaBanner').addClass('maquina-detenida-banner');
        }
        // OCULTAR SECCIONES SI LA ORDEN NO HA SIDO ATENDIDA POR EL TÉCNICO
        else {
            $('#EvidenciaOrdenTrabajo').addClass('d-none');
            $('#CierreOrdenTrabajo').addClass('d-none');

            // BOTONES
            $('#btnGuardarOT').addClass('d-none');
            $('#btnExportMantenimientoPDF').removeClass('d-none');

            //INPUTS FIRMAS
            $('#firmaMantenimientoContainer input[type="text"]').prop('required', false);
            $('#firmaRealizoContainer input[type="text"]').prop('required', false);
            $('#firmaSupervisoContainer input[type="text"]').prop('required', false);

            $("#TiempoEsperaContainer").addClass("d-none");
            $("#TiempoReparacionContainer").addClass("d-none");
        }

        //IMPORTANTE SI YA FIRMO MANTENIMIENTO OCULTAR BOTON GUARDAR
        if (FirmaMantenimiento != "") {
            $("#btnGuardarOT").prop("disabled", true);
            $("#btnGuardarOT").addClass("btn_disabled");
        }

        // Asegurar que para Administrador el botón siga oculto
        $('#btnGuardarOT').addClass('d-none').prop('disabled', true).addClass('btn_disabled');

        // Restaurar estilo y habilitar switch
        $('#MaquinaDetenidaToggle').prop('disabled', false);
        $('#maquinaDetenidaBanner').removeClass('maquina-detenida-banner');
    }

    calcularTiemposCierreOT(MaquinaDetenida,HoraAperturaOT, HoraCierreOT, HoraInicioTrabajo, HoraFinTrabajo) {

        //CALCULO DE TIEMPO DE ESPERA VA AQUI
        // Tiempo de espera
        let TE = this.calcularDiferenciaHoras(HoraAperturaOT, HoraInicioTrabajo);
        $('#TiempoEspera').val(TE + ' HRS');
        // Tiempo reparación
        let TR = this.calcularDiferenciaHoras(HoraAperturaOT, HoraFinTrabajo);
        $('#TiempoReparacion').val(TR + ' HRS');
        // Tiempo muerto
        if (MaquinaDetenida) {
            let TM = this.calcularDiferenciaHoras(HoraAperturaOT, HoraCierreOT);
            $('#TiempoMuerto').val(TM + ' HRS');
        }
        else {
            $('#TiempoMuerto').val('N/A');
        }

        $("#TiempoEsperaContainer").removeClass("d-none");
        $("#TiempoReparacionContainer").removeClass("d-none");
        $("#TiempoMuertoContainer").removeClass("d-none");
    }

    calcularDiferenciaHoras(horaInicio, horaFin) {
        const parseFecha = (fechaStr) => {
            const [fecha, hora] = fechaStr.split(' ');
            const [dia, mes, anio] = fecha.split('/');
            return new Date(`${anio}-${mes}-${dia}T${hora}`);
        };

        const inicio = parseFecha(horaInicio);
        const fin = parseFecha(horaFin);

        if (isNaN(inicio) || isNaN(fin)) return null;

        const diffMs = fin - inicio;

        const horas = diffMs / (1000 * 60 * 60);

        return horas.toFixed(2);
    }
}

// ========================================
// GESTION DE FIRMAS DIGITALES
// ========================================
class GestionFirmas {
    constructor() {
        this.signaturePads = {
            Realizo: null,
            Superviso: null,  // ✅ Usar 'Superviso'
            Mantenimiento: null
        };

        this._firmasInicializadas = false;
        this._inicializandoFirmas = false;
    }

    inicializar() {

        console.log('✅ GestionFirmas inicializado correctamente');

        $('#modalOrdenMantenimiento').on('shown.bs.modal', async () => {

            await this.inicializarFirmas();

            await this._procesarFirmasPendientes();

        });
    }

    async inicializarFirmas() {

        if (this._firmasInicializadas) return;
        if (this._inicializandoFirmas) return;

        this._inicializandoFirmas = true;

        const firmas = ['Realizo', 'Superviso', 'Mantenimiento'];

        firmas.forEach(tipo => {

            const canvas = document.getElementById(`canvas${tipo}`);

            if (!canvas) {
                console.warn(`Canvas no encontrado: canvas${tipo}`);
                return;
            }

            this.ajustarCanvas(canvas);

            const pad = new SignaturePad(canvas, {
                backgroundColor: 'rgb(255,255,255)',
                penColor: 'rgb(0,0,0)',
                minWidth: 1,
                maxWidth: 2.5,
                throttle: 0,
                minDistance: 0,
                velocityFilterWeight: 0.7
            });

            pad.addEventListener('beginStroke', () => {
                const placeholder = document.getElementById(`placeholder${tipo}`);
                if (placeholder) placeholder.style.display = 'none';
            });

            pad.addEventListener('endStroke', () => {
                this.guardarFirmaEnCampo(tipo);
            });

            this.signaturePads[tipo] = pad;
        });

        this._firmasInicializadas = true;
        this._inicializandoFirmas = false;

        console.log('✅ Firmas inicializadas correctamente');
    }

    async _ensurePad(tipo) {

        const key = this._mapTipo(tipo);

        // Si no está inicializado → inicializa
        if (!this._firmasInicializadas) {
            await this.inicializarFirmas();
        }

        let pad = this.signaturePads[key];

        // Si sigue sin existir → retry corto (por DOM/render)
        if (!pad) {
            console.warn(`Reintentando obtener pad: ${key}`);

            await new Promise(r => setTimeout(r, 150));

            pad = this.signaturePads[key];
        }

        if (!pad) {
            console.error(`❌ No se pudo inicializar firma: ${key}`);
            return null;
        }

        return pad;
    }

    ajustarCanvas(canvas) {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        canvas.getContext("2d").scale(ratio, ratio);
    }

    limpiarFirma(tipo) {
        if (this.signaturePads[tipo]) {
            this.signaturePads[tipo].clear();
            const placeholder = document.getElementById(`placeholder${tipo}`);
            if (placeholder) {
                placeholder.style.display = 'block';
            }
            const inputData = document.getElementById(`firma${tipo}Data`);
            if (inputData) {
                inputData.value = '';
            }
        }
    }

    deshacerFirma(tipo) {
        if (this.signaturePads[tipo]) {
            const data = this.signaturePads[tipo].toData();
            if (data && data.length > 0) {
                data.pop();
                this.signaturePads[tipo].fromData(data);

                if (data.length === 0) {
                    const placeholder = document.getElementById(`placeholder${tipo}`);
                    if (placeholder) {
                        placeholder.style.display = 'block';
                    }
                }

                this.guardarFirmaEnCampo(tipo);
            }
        }
    }

    validarFirmas(Tipo) {
        const errores = [];

        switch (Tipo) {

            case "Realizo":
                // Solo validar firmas HABILITADAS
                if ($('#firmaRealizoContainer').is(':visible') &&
                    !$('#firmaRealizoContainer').hasClass('firma-deshabilitada')) {
                    if (this.signaturePads.Realizo && this.signaturePads.Realizo.isEmpty()) {
                        errores.push('"Realizó"');
                    }
                    if (!$('#nombreRealizo').val().trim()) {
                        errores.push('Falta el nombre en "Realizó"');
                    }
                }
                break;
            case "Superviso":
                if ($('#firmaSupervisoContainer').is(':visible') &&
                    !$('#firmaSupervisoContainer').hasClass('firma-deshabilitada')) {
                    if (this.signaturePads.Superviso && this.signaturePads.Superviso.isEmpty()) {
                        errores.push('"Supervisó"');
                    }
                    if (!$('#nombreSuperviso').val().trim()) {
                        errores.push('Falta el nombre en "Supervisó"');
                    }
                }
                break;

            case "Mantenimiento":
                // Nota: temporalmente no se valida la firma de Mantenimiento (no requerida)
                break;
        }

        if (errores.length > 0) {
            AlertManager.mostrar('Por favor complete las siguientes firmas:\n\n' + errores.join('\n'), 'warning', 'alertOrdenContainer');
            return false;
        }

        return true;
    }

    guardarTodasLasFirmas() {
        // ✅ Guardar solo las firmas necesarias (no incluir 'Mantenimiento' por ahora)
        ['Realizo', 'Superviso'].forEach(tipo => {
            this.guardarFirmaEnCampo(tipo);
        });
    }

    guardarFirmaEnCampo(tipo) {
        if (this.signaturePads[tipo] && !this.signaturePads[tipo].isEmpty()) {
            const dataURL = this.signaturePads[tipo].toDataURL('image/png');
            const inputData = document.getElementById(`firma${tipo}Data`);
            if (inputData) {
                inputData.value = dataURL;
            } else {
                console.error(`Input no encontrado: firma${tipo}Data`);
            }
        } else {
            const inputData = document.getElementById(`firma${tipo}Data`);
            if (inputData) {
                inputData.value = '';
            }
        }
    }

    obtenerTodasLasFirmas() {
        return {
            realizo: {
                firma: $('#firmaRealizoData').val(),
                nombre: $('#nombreRealizo').val()
            },
            // ✅ Usar 'Superviso'
            superviso: {
                firma: $('#firmaSupervisoData').val(),
                nombre: $('#nombreSuperviso').val()
            },
            // No enviar firma de mantenimiento por ahora
            mantenimiento: {
                firma: '',
                nombre: ''
            }
        };
    }

    mostrarFirma(tipo, mostrar = true) {
        const container = $(`#firma${tipo}Container`);
        if (container.length) {
            container.toggle(mostrar);
        }
    }

    limpiarTodasLasFirmas() {
        // ✅ Usar 'Superviso' (no limpiar/usar 'Mantenimiento' por ahora)
        ['Realizo', 'Superviso'].forEach(tipo => {
            this.limpiarFirma(tipo);
            $(`#nombre${tipo}`).val('');
        });
        this._desbloquearFirmas();
    }

    // 🔥 NUEVO MÉTODO: Deshabilitar firma específica
    deshabilitarFirma(tipo, deshabilitar = true) {
        const container = $(`#firma${tipo}Container`);
        const canvas = document.getElementById(`canvas${tipo}`);
        const nombreInput = $(`#nombre${tipo}`);

        if (!container.length || !canvas) return;

        if (deshabilitar) {
            // ✅ DESHABILITAR
            // 1. Deshabilitar el SignaturePad
            if (this.signaturePads[tipo]) {
                this.signaturePads[tipo].off(); // Desactiva eventos de firma
            }

            // 2. Aplicar estilos visuales de deshabilitado
            $(canvas).css({
                'cursor': 'not-allowed',
                'opacity': '0.5',
                'pointer-events': 'none'
            });

            // 3. Deshabilitar input de nombre
            nombreInput.prop('disabled', true);

            // 4. Deshabilitar botones
            container.find('button').prop('disabled', true).css('opacity', '0.5');

            // 5. Agregar clase visual al contenedor
            container.addClass('firma-deshabilitada');


        } else {
            // ✅ HABILITAR
            // 1. Reactivar el SignaturePad
            if (this.signaturePads[tipo]) {
                this.signaturePads[tipo].on(); // Reactiva eventos
            }

            // 2. Restaurar estilos
            $(canvas).css({
                'cursor': 'crosshair',
                'opacity': '1',
                'pointer-events': 'auto'
            });

            // 3. Habilitar input de nombre
            nombreInput.prop('disabled', false);

            // 4. Habilitar botones
            container.find('button').prop('disabled', false).css('opacity', '1');

            // 5. Remover clase visual
            container.removeClass('firma-deshabilitada');

            // 6. Remover badge
            container.find('.badge-readonly').remove();
        }
    }

    // 🔥 NUEVO MÉTODO: Deshabilitar múltiples firmas
    deshabilitarFirmas(tiposArray) {
        tiposArray.forEach(tipo => {
            this.deshabilitarFirma(tipo, true);
        });
    }

    async _cargarFirmaFromDB(tipo, ruta, nombre) {

        if (!ruta) return;

        const key = this._mapTipo(tipo);

        const pad = await this._ensurePad(key);

        if (!pad) return;

        const canvas = pad.canvas;
        const ctx = canvas.getContext("2d");

        // limpiar pad correctamente
        pad.clear();

        await new Promise((resolve) => {

            const img = new Image();

            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve();
            };

            img.onerror = () => {
                console.warn("Error cargando firma:", ruta);
                resolve();
            };

            img.src = ruta;
        });

        // nombre
        $(`#nombre${key}`).val(nombre || '');

        // ocultar placeholder
        $(`#placeholder${key}`).hide();

        // bloquear correctamente
        this._bloquearFirma(key);
    }

    _bloquearFirma(tipo) {

        const key = this._mapTipo(tipo);
        const pad = this.signaturePads[key];

        if (pad && pad.off) {
            pad.off();
        }

        const container = $(`#firma${key}Container`);
        const canvas = document.getElementById(`canvas${key}`);
        const nombreInput = $(`#nombre${key}`);

        // 🔥 1. Ocultar botones (en lugar de deshabilitar)
        container.find('button').hide();

        // 🔥 2. Input readonly (más elegante que disabled)
        nombreInput.prop('readonly', true);

        // 🔥 3. Canvas sin interacción PERO visual limpio
        if (canvas) {
            $(canvas).css({
                'pointer-events': 'none',
                'cursor': 'default',
                'opacity': '1' // 👈 importante, quitar ese gris feo
            });
        }

        // 🔥 4. (opcional) quitar placeholder si aún existe
        $(`#placeholder${key}`).hide();

        // 🔥 5. Clase ligera (por si quieres estilos después)
        container.addClass('firma-readonly');
    }

    _desbloquearFirmas() {

        const tipos = ['Realizo', 'Superviso', 'Mantenimiento']; // ajusta si tienes más

        tipos.forEach(tipo => {

            const key = this._mapTipo(tipo);
            const pad = this.signaturePads[key];

            const container = $(`#firma${key}Container`);
            const canvas = document.getElementById(`canvas${key}`);
            const nombreInput = $(`#nombre${key}`);

            // 🔥 1. Mostrar botones otra vez
            container.find('button').show();

            // 🔥 2. Input editable
            nombreInput.prop('readonly', false);

            // 🔥 3. Reactivar canvas
            if (canvas) {
                $(canvas).css({
                    'pointer-events': 'auto',
                    'cursor': 'crosshair',
                    'opacity': '1'
                });
            }

            // 🔥 4. Volver a activar SignaturePad
            if (pad && pad.on) {
                pad.on();
            }

            // 🔥 5. Quitar clase readonly
            container.removeClass('firma-readonly');

            // 🔥 6. (opcional) mostrar placeholder si no hay firma
            if (pad && pad.isEmpty && pad.isEmpty()) {
                $(`#placeholder${key}`).show();
            }
        });
    }

    async queueFirma(tipo, ruta, nombre) {

        // 🔒 Validación básica
        if (!tipo) return;

        // 🚫 No encolar si no hay firma
        if (!ruta) return;

        // 🔥 Si ya está listo → carga directo
        if (this._firmasInicializadas) {
            await this._cargarFirmaFromDB(tipo, ruta, nombre);
            return;
        }

        // 🧩 Inicializar cola
        if (!this._firmasPendientes) {
            this._firmasPendientes = [];
        }

        // 🛑 Evitar duplicados por tipo
        const existe = this._firmasPendientes.some(f => f.tipo === tipo);

        if (existe) return;

        this._firmasPendientes.push({ tipo, ruta, nombre });
    }

    async _procesarFirmasPendientes() {

        if (!this._firmasPendientes || this._firmasPendientes.length === 0) return;

        console.log('🖋️ Procesando firmas pendientes...');

        for (const f of this._firmasPendientes) {
            await this._cargarFirmaFromDB(f.tipo, f.ruta, f.nombre);
        }

        this._firmasPendientes = null;
    }

    _cap(txt) {
        return txt.charAt(0).toUpperCase() + txt.slice(1);
    }

    _mapTipo(tipo) {
        switch (tipo) {
            case 'realizo': return 'Realizo';
            case 'superviso': return 'Superviso';
            case 'mantenimiento': return 'Mantenimiento';
            default: return tipo;
        }
    }
}

class GestionTecnicos {
    constructor(URLBase) {
        this.tecnicosAsignados = [];
        this.tecnicosDisponibles = []; // Se llenará desde el servidor
        this.URLBase = URLBase;
        this.foundtecnicos = false;
    }

    inicializar() {
        console.log('✅ GestionTecnicos inicializado correctamente');
    }
    // Buscar técnicos (aquí llamarías a tu API)
    async buscarTecnicos(query) {
        try {
            const response = await $.ajax({
                url: `/${this.URLBase}/BuscarEmpleados`, // ⬅️ Ruta de tu controller
                method: 'GET',
                data: { query: query },
                dataType: 'json'
            });

            this.mostrarSugerencias(response);
        } catch (error) {
            AlertManager.mostrar('No es posible mostrar la listá de técnicos: ' + error, 'warning');
        }
    }

    mostrarSugerencias(tecnicos) {
        const container = $('#sugerenciasTecnicos');
        container.empty();

        if (tecnicos.length === 0) {
            container.html(`
            <div class="sugerencia-item text-muted">
                <i class="bi bi-exclamation-circle"></i> No se encontraron técnicos
            </div>
        `);
            this.foundtecnicos = false;

        } else {
            tecnicos.forEach(tecnico => {
                const item = $(`
                    <div class="sugerencia-item" data-nomina="${tecnico.NOMINA}">
                        <div class="sugerencia-nomina">📛 #${tecnico.NOMINA}</div>
                        <div class="sugerencia-nombre">👷 ${tecnico.NOMBRE_COMPLETO}</div>
                        <div class="sugerencia-puesto">🏭 ${tecnico.DEPARTAMENTO || 'N/A'}</div>
                    </div>
                `);

                item.on('click', () => {
                    this.agregarTecnico({
                        nomina: tecnico.NOMINA,
                        nombre: tecnico.NOMBRE_COMPLETO,
                        puesto: tecnico.DEPARTAMENTO || 'Sin departamento'
                    });
                    $('#BuscarTecnico').val('');
                    this.ocultarSugerencias();
                });

                container.append(item);
            });

            this.foundtecnicos = true;
        }

        container.addClass('show');
    }

    ocultarSugerencias() {
        $('#sugerenciasTecnicos').removeClass('show').empty();
    }

    agregarTecnicoDesdeInput() {
        if (this.foundtecnicos) {
            const nomina = $('#BuscarTecnico').val().trim();
            if (!nomina) return;

            // Buscar técnico por nómina exacta
            // En producción, aquí harías una llamada al servidor
            const tecnicoEncontrado = {
                nomina: nomina,
                nombre: 'Técnico ' + nomina, // Placeholder
                puesto: 'Técnico'
            };

            this.agregarTecnico(tecnicoEncontrado);
            $('#BuscarTecnico').val('');
            this.ocultarSugerencias();
        }
        else {
            AlertManager.mostrar('No hay ningun técnico valido para agregar', 'info');
        }
    }

    agregarTecnico(tecnico) {
        // Verificar si ya está asignado
        if (this.tecnicosAsignados.some(t => t.nomina === tecnico.nomina)) {
            AlertManager.mostrar(`El técnico ${tecnico.nombre} ya está en la lista`, 'warning', 'alertTecnicosContainer');
            return;
        }

        this.tecnicosAsignados.push(tecnico);
        this.renderizarTecnicos();
    }

    removerTecnico(nomina) {
        this.tecnicosAsignados = this.tecnicosAsignados.filter(t => t.nomina !== nomina);
        this.renderizarTecnicos();
    }

    renderizarTecnicos() {
        const container = $('#listaTecnicosAsignados');
        container.empty();

        if (this.tecnicosAsignados.length === 0) {
            container.html(`
                <div class="text-muted small">
                    <i class="bi bi-info-circle"></i> No hay técnicos asignados
                </div>
            `);
            return;
        }

        this.tecnicosAsignados.forEach(tecnico => {
            const badge = $(`
                <div class="tecnico-badge">
                    <div class="tecnico-info">
                        <span class="tecnico-nomina">#${tecnico.nomina}</span>
                        <span class="tecnico-nombre">${tecnico.nombre}</span>
                    </div>
                    <button class="btn-remover-tecnico" data-nomina="${tecnico.nomina}">
                        <i class="bi bi-x"></i>
                    </button>
                </div>
            `);

            badge.find('.btn-remover-tecnico').on('click', () => {
                this.removerTecnico(tecnico.nomina);
            });

            container.append(badge);
        });
    }

    obtenerTecnicosAsignados() {
        return this.tecnicosAsignados;
    }

    obtenerNominasComoString() {
        return this.tecnicosAsignados.map(t => t.nomina).join(',');
    }

    // También puedes agregar este por si lo necesitas como array
    obtenerNominasComoArray() {
        return this.tecnicosAsignados.map(t => t.nomina);
    }

    limpiar() {
        this.tecnicosAsignados = [];
        this.renderizarTecnicos();
        $('#BuscarTecnico').val('');
        this.ocultarSugerencias();
    }

    // ✅ Para obtener el valor numérico cuando lo necesites:
    obtenerDuracion(element) {
        const valor = $(`#${element}`).val().replace(' Hrs', '').trim();
        return parseFloat(valor) || 0;
    }

    cargarTecnicosDesdeDB(lista) {

        // 🔥 limpiar input y estado
        $('#BuscarTecnico').val('');
        this.ocultarSugerencias();

        if (!lista || lista.length === 0) {
            this.tecnicosAsignados = [];
            this.renderizarTecnicos();
            return;
        }

        // 🔥 AQUÍ va el map (tu duda)
        this.tecnicosAsignados = lista.map(t => ({
            nomina: t.Nomina,
            nombre: t.NombreTecnico,
            puesto: ''
        }));

        this.renderizarTecnicos();
    }
}

// ========================================
// GESTOR DE ESTATUS
// ========================================
class EstatusManager {
    static obtenerClaseBadge(estatus) {
        switch (estatus) {
            case 'En espera de refacción':
                return 'bg-warning';
            case 'Liberado por mantenimiento':
                return 'bg-success';
            case 'Cerrado':
                return 'bg-secondary';
            case 'Nueva':
                return 'bg-info';
            case 'Abierta':
                return 'bg-success';
            default:
                return 'bg-info';
        }
    }

    static actualizarBadge(fila, nuevoEstatus) {
        const claseBadge = this.obtenerClaseBadge(nuevoEstatus);

        fila.find('.badge')
            .removeClass('bg-info bg-warning bg-success bg-secondary')
            .addClass(claseBadge)
            .text(nuevoEstatus);
    }
}

// ========================================
// GESTOR DE PDFs PARA SOLICITUDES DE MANTENIMIENTO CORRECTIVO
// ========================================
class PDFManagerMantenimiento {
    constructor() {
        this.logoUrl = `${window.location.origin}/Content/Images/LogoPTMWhite.png`;
        this.printEngine = new PrintEngine();
    }

    inicializar() {
        console.log('✅ PDFManagerMantenimiento (Correctivo) inicializado correctamente');
    }

    async exportarOrdenMantenimiento() {
        const $btn = $("#btnExportMantenimientoPDF");

        try {
            $btn.html('<span class="spinner-border spinner-border-sm me-2"></span>Generando...');
            $btn.prop("disabled", true);

            const datos = this.obtenerDatosDocumento();
            const qrBase64 = await GlobalUtil.generarQRCode(datos.NumeroOrden);
            datos.QR = qrBase64;

            const html = this.generarContenidoHTML(datos);

            this.printEngine.imprimir({
                html,
                titulo: `Orden Correctiva - ${datos.NumeroOrden}`,
                autoClose: true
            });

            $btn.html('<i class="bi bi-check-circle-fill me-2 text-white"></i>PDF Generado Correctamente');

        } catch (error) {
            console.error('❌ Error al imprimir:', error);
            $btn.html('<i class="bi bi-x-circle-fill me-2"></i>Error');

            if (window.AlertManager) {
                AlertManager.mostrar('Error al generar el documento.', 'warning');
            }

        } finally {
            setTimeout(() => {
                $btn.html('<i class="bi bi-file-pdf"></i> Exportar PDF');
                $btn.prop("disabled", false);
            }, 2000);
        }
    }

    // ============================
    // OBTENER DATOS DEL DOCUMENTO
    // ============================
    obtenerDatosDocumento() {
        return {
            // Header
            FechaImpresion: $('#fechaImpresion').text() || new Date().toLocaleString('es-MX'),

            // Datos de la Orden
            NumeroOrden: $('#NumeroOrden').val() || '',
            Solicitante: $('#Solicitante').val() || '',
            NominaSolicitante: $('#NominaSolicitante').val() || '',
            EstatusOrden: $('#EstatusOrden').val() || '',
            FechaInicioExtrema: $('#FechaInicioExtrema').val() || '',
            HoraInicio: $('#HoraInicio').val() || '',
            UbicacionTecnica: $('#UbicacionTecnica').val() || '',
            TipoMantenimiento: $('#TipoMantenimiento').val() || '',
            TextoCorto: $('#TextoCorto').val() || '',

            // Datos del Equipo
            ClaseMantenimiento: $('#ClaseMantenimiento').val() || '',
            NombreEquipo: $('#NombreEquipo').val() || '',
            DescEquipo: $('#DescEquipo').val() || '',
            CentroCostos: $('#CentroCostos').val() || '',
            NumDocPmCalidad: $('#NumDocPmCalidad').val() || '',
            Linea: $('#Linea').val() || '',

            // Registro de Trabajo
            RegistroTrabajo: this.obtenerRegistroTrabajo(),
            Tecnicos: this.obtenerTecnicosAsignados(),
            Firmas: this.obtenerFirmas()
        };
    }

    // ============================
    // REGISTRO DE TRABAJO
    // ============================
    obtenerRegistroTrabajo() {
        return {
            HoraInicio: $('#HoraInicioTrabajo').val() || '',
            HoraFin: $('#HoraFin').val() || '',
            TextoSecuencia: $('#TextoSecuencia').val() || '',
            DuracionHrs: $('#DuracionHrs').val() || '',
            TiempoEspera: $('#TiempoEspera').val() || '',
            TiempoReparacion: $('#TiempoReparacion').val() || '',
            TiempoMuerto: $('#TiempoMuerto').val() || ''
        };
    }

    // ============================
    // TÉCNICOS ASIGNADOS
    // ============================
    obtenerTecnicosAsignados() {
        const tecnicos = [];
        $('#listaTecnicosAsignados .tecnico-badge').each(function () {
            const nombre = $(this).find('.tecnico-nombre').text().trim();
            const nomina = $(this).find('.tecnico-nomina').text().trim();
            if (nombre && nomina) {
                tecnicos.push({ nombre, nomina });
            }
        });
        return tecnicos;
    }

    // ============================
    // FIRMAS DIGITALES
    // ============================
    obtenerFirmas() {
        const extraerFirma = (canvasId, hiddenId, nombreId) => {
            let imagenBase64 = '';

            const hiddenVal = $(`#${hiddenId}`).val();
            if (hiddenVal && hiddenVal.trim() !== '') {
                imagenBase64 = hiddenVal;
            } else {
                const canvas = document.getElementById(canvasId);
                if (canvas) {
                    try {
                        const ctx = canvas.getContext('2d');
                        const pixelData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                        const tieneContenido = pixelData.some(channel => channel !== 0);
                        if (tieneContenido) {
                            imagenBase64 = canvas.toDataURL('image/png');
                        }
                    } catch (e) {
                        console.warn(`⚠️ No se pudo leer canvas ${canvasId}:`, e);
                    }
                }
            }

            return {
                imagen: imagenBase64,
                nombre: $(`#${nombreId}`).val() || ''
            };
        };

        return {
            Realizo: extraerFirma('canvasRealizo', 'firmaRealizoData', 'nombreRealizo'),
            Superviso: extraerFirma('canvasSuperviso', 'firmaSupervisoData', 'nombreSuperviso'),
            Mantenimiento: extraerFirma('canvasMantenimiento', 'firmaMantenimientoData', 'nombreMantenimiento')
        };
    }

    // ============================
    // GENERAR HTML COMPLETO
    // ============================
    generarContenidoHTML(datos) {
        return `
            <div style="
                width: 202mm;
                margin: 0 auto;
                padding: 3mm;
                box-sizing: border-box;
                font-family: Arial, sans-serif;
                font-size: 11px;">

                <!-- HEADER -->
                <div style="background:#2b74c0; color:white; padding:15px; border-radius:8px; margin-bottom:20px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <img src="${this.logoUrl}" style="height:40px;">
                        </div>
                        <div style="text-align:right; font-size:10px;">
                            <div>
                                <strong>Fecha:</strong> ${DateUtils.obtenerFechaHora()}
                            </div>
                            <div style="margin-top:5px;">
                                <img src="${datos.QR}" style="width:70px;">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- TIPO DE MANTENIMIENTO -->
                <div class="page-break-avoid" style="background-color: #f0f9ff; border-left: 4px solid #dc2626; padding: 15px; margin-bottom: 15px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 24px;">🔧</span>
                        <div>
                            <p style="margin: 0; font-weight: bold; font-size: 13px;">MANTENIMIENTO MAQUINARIA E INSTALACIONES</p>
                            <p style="margin: 5px 0 0 0; font-size: 12px; color: #dc2626; font-weight: bold;">REPARACIÓN MANTENIMIENTO CORRECTIVO</p>
                        </div>
                    </div>
                </div>

                <!-- DATOS DE LA ORDEN -->
                <div class="page-break-avoid" style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                    <div style="background: #1976d2; color: white; padding: 8px; margin: -15px -15px 15px -15px; border-radius: 7px 7px 0 0; font-weight: bold; font-size: 10.5px;">
                        📋 DATOS DE LA ORDEN
                    </div>
                    <table style="width: 100%; border-collapse: collapse;">
                        ${this.generarFilaDetalle('Número de Orden', datos.NumeroOrden, 'Solicitante', datos.Solicitante)}
                        ${this.generarFilaDetalle('Número de Nómina', datos.NominaSolicitante, 'Estatus de la Orden', datos.EstatusOrden)}
                        ${this.generarFilaDetalle('Fecha Inicio Extrema', this.formatearFecha(datos.FechaInicioExtrema), 'Hora', datos.HoraInicio)}
                        ${this.generarFilaDetalle('Ubicación Técnica', datos.UbicacionTecnica, 'Tipo de Mantenimiento', datos.TipoMantenimiento)}
                    </table>

                    <!-- Texto Corto full width -->
                    <div style="padding: 8px 0; margin-top: 10px; border-top: 1px solid #e5e7eb;">
                        <strong style="font-size:9.5px;">📝 Texto Corto (Descripción de la Falla):</strong><br>
                        <div style="border: 1px solid #d1d5db; padding: 10px; background: #fffbeb; margin-top: 5px; border-radius: 4px; min-height: 40px; font-size: 10px;">
                            ${datos.TextoCorto || ''}
                        </div>
                    </div>
                </div>

                <!-- DATOS DEL EQUIPO -->
                <div class="page-break-avoid" style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                    <div style="background: #1976d2; color: white; padding: 8px; margin: -15px -15px 15px -15px; border-radius: 7px 7px 0 0; font-weight: bold; font-size: 10.5px;">
                        ⚙️ DATOS DEL EQUIPO
                    </div>
                    <table style="width: 100%; border-collapse: collapse;">
                        ${this.generarFilaDetalle('Clase de Mantenimiento', datos.ClaseMantenimiento, 'Nombre Equipo', datos.NombreEquipo)}
                        ${this.generarFilaDetalle('Descripción Equipo', datos.DescEquipo, 'Centro de Costos', datos.CentroCostos)}
                        ${this.generarFilaDetalle('Número Doc PM Calidad', datos.NumDocPmCalidad, 'Línea', datos.Linea)}
                    </table>
                </div>

                <!-- REGISTRO DE TRABAJO -->
                  <div style="page-break-inside: avoid; break-inside: avoid;">
                ${this.generarSeccionRegistroTrabajo(datos.RegistroTrabajo, datos.Tecnicos)}
                 </div>

                 <!-- REGISTRO DE TIEMPOS DE CIERRE -->
                  <div style="page-break-inside: avoid; break-inside: avoid;">
                ${this.generarSeccionRegistroTiemposReparacion(datos.RegistroTrabajo)}
                 </div>

                <!-- FIRMAS -->
                <div style="page-break-inside: avoid; break-inside: avoid;">
                    ${this.generarSeccionFirmas(datos.Firmas)}
                </div>

            </div>
        `;
    }

    // ============================
    // HTML REGISTRO DE TRABAJO
    // ============================
    generarSeccionRegistroTrabajo(registro, tecnicos) {
        const tieneDatos = registro.HoraInicio || registro.HoraFin || registro.TextoSecuencia || registro.DuracionHrs;
        if (!tieneDatos && (!tecnicos || tecnicos.length === 0)) return '';

        const tecnicosHTML = tecnicos && tecnicos.length > 0 ? `
            <tr>
                <td colspan="2" style="padding: 8px; vertical-align: top;">
                    <strong style="font-size:9.5px;">👷 Técnicos Asignados:</strong><br>
                    <div style="margin-top: 6px; display: flex; flex-wrap: wrap; gap: 6px;">
                        ${tecnicos.map(t => `
                            <span style="
                                display: inline-flex; align-items: center; gap: 5px;
                                background: #eff6ff; border: 1px solid #bfdbfe;
                                border-radius: 20px; padding: 3px 10px; font-size: 9.5px; color: #1e40af;">
                                <strong>${t.nomina}</strong> ${t.nombre}
                            </span>
                        `).join('')}
                    </div>
                </td>
            </tr>
        ` : '';

        const textoHTML = registro.TextoSecuencia ? `
            <tr>
                <td colspan="2" style="padding: 8px; vertical-align: top;">
                    <strong style="font-size:9.5px;">📝 Actividad Realizada:</strong><br>
                    <div style="border: 1px solid #d1d5db; padding: 8px; background: #f9fafb; font-size: 10px; border-radius: 4px; margin-top: 4px; min-height: 40px;">
                        ${registro.TextoSecuencia}
                    </div>
                </td>
            </tr>
        ` : '';

        return `
            <div class="page-break-avoid" style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                <div style="background: #1976d2; color: white; padding: 8px; margin: -15px -15px 15px -15px; border-radius: 7px 7px 0 0; font-weight: bold; font-size: 10.5px;">
                    🔩 REGISTRO DE TRABAJO
                </div>
                <table style="width: 100%; border-collapse: collapse;">
                    ${this.generarFilaDetalle('⏰ Hora Inicio', registro.HoraInicio, '⏱️ Hora Fin', registro.HoraFin)}
                    ${registro.DuracionHrs ? this.generarFilaDetalle('⌛ Duración (Hrs)', registro.DuracionHrs, '', '') : ''}
                    ${tecnicosHTML}
                    ${textoHTML}
                </table>
            </div>
        `;
    }

    generarSeccionRegistroTiemposReparacion(registro) {
        const tieneDatos = registro.TiempoEspera || registro.TiempoReparacion || registro.TiempoMuerto;
        if (!tieneDatos) return '';
        return `
            <div class="page-break-avoid" style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                <div style="background: #1976d2; color: white; padding: 8px; margin: -15px -15px 15px -15px; border-radius: 7px 7px 0 0; font-weight: bold; font-size: 10.5px;">
                    🔩 REGISTRO DE TIEMPOS DE CIERRE
                </div>
                <table style="width: 100%; border-collapse: collapse;">
                    ${this.generarFilaDetalle('⏰ Tiempo Espera', registro.TiempoEspera, '⏱️ Tiempo Reparación', registro.TiempoReparacion)}
                    ${this.generarFilaDetalle('⏰ Tiempo Muerto', registro.TiempoMuerto, '', '')}
                </table>
            </div>
        `;
    }

    // ============================
    // HTML FIRMAS DIGITALES
    // ============================
    generarSeccionFirmas(firmas) {
        const firmaCard = (titulo, color, firma) => {
            const tieneImagen = firma.imagen && firma.imagen.trim() !== '';
            const tieneNombre = firma.nombre && firma.nombre.trim() !== '';

            return `
                <td style="width: 33.33%; padding: 8px; vertical-align: top;">
                    <div style="border: 2px solid ${color}; border-radius: 8px; overflow: hidden;">
                        <div style="background: ${color}; color: white; padding: 6px 10px; font-size: 9.5px; font-weight: bold;">
                            ${titulo}
                        </div>
                        <div style="padding: 8px; background: #f8f9fa; min-height: 80px; display: flex; align-items: center; justify-content: center;">
                            ${tieneImagen
                    ? `<img src="${firma.imagen}" alt="Firma ${titulo}" style="max-width: 100%; max-height: 80px; display: block;">`
                    : `<span style="font-size: 9px; color: #9ca3af; font-style: italic;">Sin firma</span>`
                }
                        </div>
                        <div style="padding: 6px 10px; border-top: 1px solid #e5e7eb; font-size: 9.5px; min-height: 28px;">
                            <strong>Nombre:</strong>
                            <span style="border-bottom: 1px solid #000; display: inline-block; min-width: 100px; padding: 1px 2px;">
                                ${tieneNombre ? firma.nombre : ''}
                            </span>
                        </div>
                    </div>
                </td>
            `;
        };

        return `
            <div class="page-break-avoid" style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 15px; page-break-inside: avoid; break-inside: avoid;">
                <div style="background: #1976d2; color: white; padding: 8px; margin: -15px -15px 15px -15px; border-radius: 7px 7px 0 0; font-weight: bold; font-size: 10.5px;">
                    ✍️ FIRMAS DIGITALES
                </div>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        ${firmaCard('Técnico MTTO', '#1d4ed8', firmas.Realizo)}
                        ${firmaCard('Supervisor Producción', '#15803d', firmas.Superviso)}
                    </tr>
                </table>
            </div>
        `;
    }

    // ============================
    // MÉTODOS UTILITARIOS
    // ============================
    generarFilaDetalle(label1, valor1, label2, valor2) {
        const icon1 = this.obtenerIconoCampo(label1);
        const icon2 = this.obtenerIconoCampo(label2);
        if (label2 && valor2) {
            return `
                <tr>
                    <td style="width: 50%; padding: 8px; vertical-align: top;">
                        <strong style="font-size:9.5px;">${icon1} ${label1}:</strong><br>
                        <span style="font-size:10px; border-bottom: 1px solid #000; display: inline-block; min-width: 180px; padding: 2px;">
                            ${valor1 || ''}
                        </span>
                    </td>
                    <td style="width: 50%; padding: 8px; vertical-align: top;">
                        <strong style="font-size:9.5px;">${icon2} ${label2}:</strong><br>
                        <span style="font-size:10px; border-bottom: 1px solid #000; display: inline-block; min-width: 180px; padding: 2px;">
                            ${valor2 || ''}
                        </span>
                    </td>
                </tr>
                `;
        }
        else {
            return `
            <tr>
                <td style="width: 50%; padding: 8px; vertical-align: top;">
                    <strong style="font-size:9.5px;">${icon1} ${label1}:</strong><br>
                    <span style="font-size:10px; border-bottom: 1px solid #000; display: inline-block; min-width: 180px; padding: 2px;">
                        ${valor1 || ''}
                    </span>
                </td>
            </tr>
            `;
        }
    }

    formatearFecha(fecha) {
        if (!fecha) return '';
        if (fecha.includes('-')) {
            const [anio, mes, dia] = fecha.split('-');
            return `${dia}/${mes}/${anio}`;
        }
        return fecha;
    }

    obtenerOpcionesPDF() {
        const numeroOrden = document.getElementById('NumeroOrden')?.value || 'SIN_NUMERO';
        const fecha = new Date().toISOString().split('T')[0];
        return {
            margin: [4, 4, 4, 4],
            filename: `Orden_Mantenimiento_Correctivo_${numeroOrden}_${fecha}.pdf`,
            html2canvas: { scale: 1.5, useCORS: true, letterRendering: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: {
                mode: ['avoid-all', 'css', 'legacy'],
                before: '.page-break-before',
                after: '.page-break-after',
                avoid: '.page-break-avoid'
            }
        };
    }

    obtenerIconoCampo(label) {
        const iconos = {
            'Número de Orden': '📄',
            'Solicitante': '👤',
            'Número de Nómina': '🪪',
            'Estatus de la Orden': '📊',
            'Fecha Inicio Extrema': '📅',
            'Hora': '⏰',
            'Ubicación Técnica': '📍',
            'Tipo de Mantenimiento': '🔧',
            'Clase de Mantenimiento': '⚙️',
            'Nombre Equipo': '🏭',
            'Descripción Equipo': '📝',
            'Centro de Costos': '💰',
            'Número Doc PM Calidad': '📋',
            'Línea': '📈',
            'Hora Inicio': '▶️',
            'Hora Fin': '⏹️'
        };
        return iconos[label] || '▪️';
    }
}

// ========================================
// GESTOR DE IMPRESIÓN PARA LISTADO MANTENIMIENTO CORRECTIVO
// ========================================
class PrintManagerMantenimiento {
    constructor(PdfManagerMantenimiento, MantenimientoManager) {
        this.PdfManagerMantenimiento = PdfManagerMantenimiento;
        this.MantenimientoManager = MantenimientoManager;
        this.logoUrl = `${window.location.origin}/Content/Images/LogoPTMWhite.png`;

        this.printEngine = new PrintEngine(); // 🔥 FALTA ESTO
    }

    inicializar() {
        console.log('✅ PrintManagerMantenimiento inicializado correctamente');
    }

    async prepararImpresionDirecta(btn) {

        try {

            const iconoOriginal = btn.html();
            btn.html('<span class="spinner-border spinner-border-sm"></span>');
            btn.prop("disabled", true);

            // ✅ ABRIR AQUÍ (CLAVE)
            const ventanaImpresion = window.open('', '_blank', 'width=900,height=700');

            if (!ventanaImpresion) {
                alert("El navegador bloqueó la ventana de impresión. Habilita popups.");
                btn.html(iconoOriginal);
                btn.prop("disabled", false);
                return;
            }

            // 👇 OPCIONAL UX PRO
            ventanaImpresion.document.write(`
            <div style="font-family:Arial; padding:20px;">
                ⏳ Generando documento de mantenimiento...
            </div>
        `);

            const datos = this.obtenerDatosDelBoton(btn);

            // 🔥 ASYNC SIN PROBLEMA
            const tecnicos = await this.MantenimientoManager.cargarTecnicosLista(
                datos.NumeroOrden,
                'MC'
            );

            datos.TecnicosAsignados = (tecnicos || []).map(t => ({
                nombre: t.Nombre,
                nomina: t.Nomina
            }));

            const qrBase64 = await GlobalUtil.generarQRCode(datos.NumeroOrden);
            datos.QR = qrBase64;

            // ✅ IMPRIMIR USANDO LA MISMA VENTANA
            this.imprimirOrdenMantenimiento(datos, ventanaImpresion);

            btn.html(iconoOriginal);
            btn.prop("disabled", false);

        } catch (error) {
            console.error(error);
            btn.prop("disabled", false);
        }
    }

    imprimirOrdenMantenimiento(datos, ventanaImpresion) {
        try {

            const html = this.generarContenidoHTML(datos);

            this.printEngine.imprimir({
                html,
                titulo: `Orden Correctiva - ${datos.NumeroOrden}`,
                estilos: this.obtenerEstilos(), // 🔥 CLAVE
                autoClose: true,
                win: ventanaImpresion // 🔥 reutiliza la ventana
            });

        } catch (error) {
            console.error('Error al generar impresión:', error);
        }
    }

    obtenerDatosDelBoton(btn) {

        return {

            FechaImpresion: DateUtils.obtenerFechaHora(),

            NumeroOrden: btn.data('numeroorden') || '',
            Solicitante: btn.data('solicitante') || '',
            NominaSolicitante: btn.data('nominasolicitante') || '',
            EstatusOrden: btn.data('descestatusorden') || '',

            TipoMantenimiento: btn.data('tipomantenimiento') || '',
            ClaseMantenimiento: btn.data('clasemantenimiento') || '',

            NombreEquipo: btn.data('nombreequipo') || '',
            DescEquipo: btn.data('descripcionequipo') || '',
            CentroCostos: btn.data('centrocostos') || '',
            NumDocPmCalidad: btn.data('numerodocpmcalidad') || '',
            Linea: btn.data('lineaproduccion') || '',

            TextoCorto: btn.data('textocorto') || '',

            HoraInicio: btn.data('horaapertura') || '',
            HoraCierre: btn.data('horacierre') || '',

            AreaTecnica: btn.data('area') || '',

            // 🔥🔥🔥 TRABAJO REAL
            HoraInicioTrabajo: btn.data('horainicio') || '',
            HoraFin: btn.data('horafin') || '',
            DuracionHrs: btn.data('duracionhrs') || '',
            TextoSecuencia: btn.data('textosecuencia') || '',

            // ⚠️ aquí ojo
            TecnicosAsignados: [],

            Comentarios: ''
        };
    }

    obtenerTecnicosAsignados() {
        const tecnicos = [];
        $('#listaTecnicosAsignados .tecnico-badge').each(function () {
            const nombre = $(this).find('.tecnico-nombre').text().trim();
            const nomina = $(this).data('tecnico-nomina').text().trim();
            if (nombre && nomina) {
                tecnicos.push({ nombre, nomina });
            }
        });
        return tecnicos;
    }

    generarContenidoHTML(datos) {
        return `
    <div class="contenedor-principal">

        <div class="encabezado page-break-avoid">
    <div class="encabezado-contenido">

            <div class="encabezado-logo">
               <img src="${this.logoUrl}" alt="Logo PTM" />
            </div>

            <div class="encabezado-fecha">
                <div>
                    <strong>Fecha:</strong> ${datos.FechaImpresion}
                </div>
                <div style="margin-top:5px;">
                    <img src="${datos.QR}" style="width:70px;">
                </div>
            </div>

        </div>
    </div>

        <!-- TIPO DE MANTENIMIENTO -->
        <div class="banner-tipo page-break-avoid">
            <div class="banner-tipo-contenido">
                <div class="banner-tipo-icono">🔧</div>
                <div class="banner-tipo-texto">
                    <p class="banner-tipo-titulo">MANTENIMIENTO MAQUINARIA E INSTALACIONES</p>
                    <p class="banner-tipo-subtitulo">REPARACIÓN MANTENIMIENTO CORRECTIVO</p>
                </div>
            </div>
        </div>

        <!-- DATOS DE LA ORDEN -->
        <div class="seccion page-break-avoid">
            <div class="seccion-header">📋 DATOS DE LA ORDEN<br>🔧 ÁREA TÉCNICA ${datos.AreaTecnica}</div>
            <table class="tabla-detalles">
                ${this.generarFilaDetalle('Número de Orden', datos.NumeroOrden, 'Solicitante', datos.Solicitante)}
                ${this.generarFilaDetalle('Número de Nómina', datos.NominaSolicitante, 'Estatus de la Orden', datos.EstatusOrden)}
                ${this.generarFilaDetalle('Fecha Inicio Extrema', this.formatearFecha(datos.FechaInicioExtrema), 'Hora', datos.HoraInicio)}
                ${this.generarFilaDetalle('Scrap', '', 'Hora Cierre', '')}
                ${this.generarFilaDetalle('Ubicación Técnica', 'ÁREA ' + datos.AreaTecnica, 'Tipo de Mantenimiento', datos.TipoMantenimiento)}
            </table>
            
            <div class="texto-corto-contenedor">
                <span class="texto-corto-label">Texto Corto (Descripción de la Falla):</span>
                <div class="texto-corto-valor">${datos.TextoCorto || 'N/A'}</div>
            </div>
        </div>

        <!-- DATOS DEL EQUIPO -->
        <div class="seccion page-break-avoid">
            <div class="seccion-header">⚙️ DATOS DEL EQUIPO</div>
            <table class="tabla-detalles">
                ${this.generarFilaDetalle('Clase de Mantenimiento', datos.ClaseMantenimiento, 'Nombre Equipo', datos.NombreEquipo)}
                ${this.generarFilaDetalle('Descripción Equipo', datos.DescEquipo, 'Centro de Costos', datos.CentroCostos)}
                ${this.generarFilaDetalle('Número Doc PM Calidad', datos.NumDocPmCalidad, 'Línea', datos.Linea)}
            </table>
        </div>

        <!-- TRABAJO REALIZADO -->
        ${datos.TextoSecuencia || (datos.TecnicosAsignados && datos.TecnicosAsignados.length > 0) ? `
        <div class="seccion page-break-avoid">
            <div class="seccion-header">🔧 TRABAJO REALIZADO</div>
            
            <table class="tabla-detalles">
                ${datos.HoraInicioTrabajo && datos.HoraFin ? this.generarFilaDetalle('Hora Inicio', datos.HoraInicioTrabajo, 'Hora Fin', datos.HoraFin) : ''}
                ${datos.DuracionHrs ? `
                <tr>
                    <td colspan="2">
                        <span class="campo-label">Duración:</span>
                        <span class="campo-valor">${datos.DuracionHrs} Hrs</span>
                    </td>
                </tr>
                ` : ''}
            </table>

            ${datos.TecnicosAsignados.length > 0 ? `
            <div class="tecnicos-contenedor">
                <span class="tecnicos-label">Técnicos Asignados:</span>
                <div class="tecnicos-lista">
                    ${datos.TecnicosAsignados.map((tec, idx) => `
                        <div class="tecnico-item ${idx < datos.TecnicosAsignados.length - 1 ? 'tecnico-item-separador' : ''}">
                            👤 <strong>${tec.nombre}</strong> - Nómina: ${tec.nomina}
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            ${datos.TextoSecuencia ? `
            <div>
                <span class="tecnicos-label">Texto de Secuencia:</span>
                <div class="texto-corto-valor">${datos.TextoSecuencia}</div>
            </div>
            ` : ''}
        </div>
        ` : ''}

        <!-- ✅ COMENTARIOS -->
        <div class="seccion page-break-avoid">
            <div class="seccion-header">💬 COMENTARIOS</div>
            <div class="comentarios-valor">${datos.Comentarios || ''}</div>
        </div>

        <!-- FOOTER -->
        <div class="footer">
            <p>🛡️ Sistema de Gestión de Mantenimiento - PTM © 2025</p>
        </div>
    </div>
`;
    }

    generarFilaDetalle(label1, valor1, label2, valor2) {

        const icon1 = this.obtenerIconoCampo(label1);
        const icon2 = this.obtenerIconoCampo(label2);

        return `
    <tr>
        <td>
            <span class="campo-label">
                ${icon1} ${label1}:
            </span>
            <span class="campo-valor">${valor1}</span>
        </td>

        <td>
            <span class="campo-label">
                ${icon2} ${label2}:
            </span>
            <span class="campo-valor">${valor2}</span>
        </td>
    </tr>
    `;
    }

    formatearFecha(fecha) {
        if (!fecha) return 'N/A';
        if (fecha.includes('-')) {
            const [anio, mes, dia] = fecha.split('-');
            return `${dia}/${mes}/${anio}`;
        }
        return fecha;
    }

    obtenerIconoCampo(label) {

        const iconos = {
            'Número de Orden': '📄',
            'Solicitante': '👤',
            'Número de Nómina': '🪪',
            'Estatus de la Orden': '📊',
            'Fecha Inicio Extrema': '📅',
            'Hora': '⏰',
            'Scrap': '⚠️',
            'Hora Cierre': '🕓',
            'Ubicación Técnica': '📍',
            'Tipo de Mantenimiento': '🔧',
            'Clase de Mantenimiento': '⚙️',
            'Nombre Equipo': '🏭',
            'Descripción Equipo': '📝',
            'Centro de Costos': '💰',
            'Número Doc PM Calidad': '📋',
            'Línea': '📈',
            'Hora Inicio': '▶️',
            'Hora Fin': '⏹️'
        };

        return iconos[label] || '▪️';
    }

    obtenerEstilos() {
        return `
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body { 
            font-family: Arial, sans-serif; 
            padding: 15px;
            background: white;
            color: #000;
        }

        @media print {
            @page { margin: 10mm; size: A4 portrait; }
            body { margin: 0; padding: 0; }
            .page-break-avoid { page-break-inside: avoid; break-inside: avoid; }
            .no-print { display: none !important; }
        }

        .contenedor-principal {
            width: 100%;
            max-width: 190mm;
            margin: 0 auto;
            font-size: 11px;
            line-height: 1.4;
        }

        .encabezado {
            background: #1976d2;
            color: white;
            padding: 12px;
            margin-bottom: 15px;
            border-radius: 6px;
        }

        .encabezado-contenido { display: table; width: 100%; }
        .encabezado-logo { display: table-cell; width: 100px; vertical-align: middle; }
        .encabezado-logo img { max-width: 100px; max-height: 40px; display: block; }
        .encabezado-fecha { display: table-cell; text-align: right; vertical-align: middle; font-size: 9px; }

        .banner-tipo {
            background-color: #f0f9ff;
            border-left: 4px solid #dc2626;
            padding: 12px;
            margin-bottom: 12px;
            border-radius: 4px;
        }

        .banner-tipo-contenido { display: table; width: 100%; }
        .banner-tipo-icono { display: table-cell; width: 30px; font-size: 20px; vertical-align: middle; }
        .banner-tipo-texto { display: table-cell; vertical-align: middle; padding-left: 8px; }

        .seccion {
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 12px;
        }

        .seccion-header {
            background: #1976d2;
            color: white;
            padding: 8px;
            margin: -12px -12px 12px -12px;
            border-radius: 5px 5px 0 0;
            font-weight: bold;
            font-size: 11px;
        }

        .tabla-detalles { width: 100%; border-collapse: collapse; font-size: 10px; }
        .tabla-detalles td { width: 50%; padding: 6px; vertical-align: top; }

        .campo-label { font-weight: bold; font-size: 9px; display: block; margin-bottom: 2px; }

        .campo-valor {
            border-bottom: 1px solid #000;
            display: inline-block;
            width: 95%;
            padding: 2px;
            font-size: 9px;
        }

        .texto-corto-contenedor { padding: 6px 0; margin-top: 8px; border-top: 1px solid #e5e7eb; }

        .texto-corto-label { font-weight: bold; font-size: 10px; display: block; margin-bottom: 4px; }

        .texto-corto-valor {
            border: 1px solid #d1d5db;
            padding: 8px;
            background: #fffbeb;
            border-radius: 3px;
            min-height: 30px;
            font-size: 9px;
        }

        .comentarios-valor {
            border: 1px solid #d1d5db;
            padding: 10px;
            background: #fffbeb;
            border-radius: 3px;
            min-height: 60px;
            font-size: 10px;
            white-space: pre-wrap;
        }

        .tecnicos-contenedor { margin-bottom: 12px; }

        .tecnicos-label {
            display: block;
            margin-bottom: 6px;
            color: #374151;
            font-weight: bold;
            font-size: 10px;
        }

        .tecnicos-lista {
            border: 1px solid #e5e7eb;
            padding: 8px;
            background: #f9fafb;
            border-radius: 3px;
            font-size: 9px;
        }

        .footer {
            border-top: 1px solid #e5e7eb;
            padding-top: 8px;
            margin-top: 12px;
            text-align: center;
            color: #6b7280;
            font-size: 8px;
        }
    `;
    }
}


