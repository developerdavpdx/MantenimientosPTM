// ========================================
// APLICACIÓN PRINCIPAL
// ========================================
class SolicitudRefaccionesApp {
    constructor() {
        this.URLBase = "Almacen";
        this.datos_usuario = GlobalUtil.getDatosUsuario();
        this.solicitudIdCounter = 6;
        this._isReloadingRefacciones = false;

        // ✅ Guardar referencia para métodos enlazados
        this._recargarTablaSolicitudRefacciones = this._recargarTablaSolicitudRefacciones.bind(this);

        // ✅ Inicializar gestión de artículos (se pasa this como referencia)
        this.gestionArticulosMP = new GestionArticulosCustom(
            '#BuscarArticuloMP',
            '#sugerenciasArticulosMP',
            '#CodigoArticuloMP',
            '#DescripcionArticuloMP',
            '#bodyArticulosRefaccionMP',
            'Planeacion',
            'alertRefaccionContainer',
            104,
            false,
            this.datos_usuario
        );

        // ✅ Inicializar solicitudManager PASANDO this como referencia
        this.solicitudManager = new SolicitudManager(
            this.URLBase,
            this.datos_usuario,
            this  // ← Referencia a la app principal
        );

        // ✅ Exponer globalmente SOLO para debugging (opcional)
        // En producción no es necesario, pero lo dejamos controlado
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            window.AppSolicitudRefacciones = this;
        }
    }

    inicializar() {
        UIManager.inicializarUI(this.datos_usuario[0]);
        this.solicitudManager.inicializar();
        this.configurarEventosFiltros();
        this.configurarEventos();
        this.initHubSolicitudRefacciones();

        console.log('✅ Sistema de Solicitud de Refacciones inicializado correctamente');
        console.log('Usuario:', this.datos_usuario[0]?.EMAIL);
    }

    configurarEventosFiltros() {
        // ✅ Cambio automático en fechas y planta
        const filtrarCallback = () => {
            const fechaInicio = $('#FiltroFechaInicio').val();
            const fechaFin = $('#FiltroFechaFin').val();

            if (fechaInicio && fechaFin) {
                const inicio = new Date(fechaInicio);
                const fin = new Date(fechaFin);
                if (inicio > fin) {
                    AlertManager.mostrar('La fecha de inicio no puede ser mayor a la fecha de fin.', 'warning');
                    return;
                }
            }

            this._recargarDataTable();
        };

        $('#FiltroFechaInicio, #FiltroFechaFin, #FiltroPlanta, #FiltroNivelUrgencia').on('change', filtrarCallback);

        // ✅ Orden de trabajo — solo al presionar Enter
        $('#FiltroOrdenTrabajo').on('keypress', (e) => {
            if (e.which === 13) {
                e.preventDefault();
                this._recargarDataTable();
            }
        });

        // ✅ Botón Aplicar
        $('#btnAplicarFiltros').on('click', filtrarCallback);

        // ✅ Botón Limpiar
        $('#btnLimpiarFiltros').on('click', () => {
            $('#FiltroOrdenTrabajo').val('');
            $('#FiltroFechaInicio').val('');
            $('#FiltroFechaFin').val('');
            $('#FiltroPlanta').val('');
            $('#FiltroNivelUrgencia').val('');
            this._recargarDataTable();
        });
    }

    configurarEventos() {
        // ✅ Guardar referencia para no perder el contexto
        const self = this;

        // Generar solicitud de compra (botón individual)
        $(document).on('click', '.btn-solicitud-compra', (e) => {
            self.solicitudManager.abrirModalSolicitudCompra($(e.currentTarget));
        });

        // ✅ Generar solicitud de compra con checkboxes (CORREGIDO)
        $(document).on('click', '#btnGenerarSolicitudCompra', async () => {
            await self._generarSolicitudCompraMultiple();
        });

        // Guardar refacción (cambiar artículo)
        $('#formIntercambiarRefaccionOT').on('submit', (e) => self.solicitudManager.cambiarRefaccionOT(e));

        // Solicitud de compra
        $('#formSolicitudCompra').on('submit', (e) => self.solicitudManager.enviarSolicitudCompra(e));

        // ✅ Botón de cambiar refacción (CORREGIDO - sin window.window)
        $(document).on('click', '.btn-change-ref', (e) => {
            e.preventDefault();
            self.solicitudManager.IdSolicitudR = $(e.currentTarget).data('idsolicitud');
            self.solicitudManager.OrdenTrabajo = $(e.currentTarget).data('ordentrabajo');
            self.gestionArticulosMP.articulosAgregados = [];
            $("#bodyArticulosRefaccionMP").empty();
            $("#solicitarRefAlmModal").modal("show");
        });

        // ✅ Botón de cambiar refacción (CORREGIDO - sin window.window)
        $(document).on('click', '.btn-del-ref', (e) => {
            e.preventDefault();
            self.solicitudManager.IdSolicitudR = $(e.currentTarget).data('idsolicitud');
            self.solicitudManager.OrdenTrabajo = $(e.currentTarget).data('ordentrabajo');
            self.solicitudManager.Refaccion = $(e.currentTarget).data('nombrearticulo');
            self.solicitudManager.eliminarRefaccionOT();
        });

        // Entrada de mercancía
        $(document).on('click', '.btn-entrada-mercancia', (e) => {
            self.solicitudManager.currentOC = {};
            self.solicitudManager.currentDocLinesOC = {};
            self.solicitudManager.clearModal("#entradaMercancia");

            const id = $(e.currentTarget).data('id');
            const fila = $(`#tablaSolicitudesRefacciones tr:has(button[data-id="${id}"])`);
            const Solicitante = fila.find('td:eq(7)').text();
            $("#nombre").val(Solicitante);
            self._initDateInputsEM();
            $('#entradaMercancia').modal('show');
        });

        // Guardar entrada de mercancía
        $("#SaveEM").on("click", () => {
            self.solicitudManager.guardarEntradaMercancia();
        });

        // Salida de mercancía
        $(document).on('click', '.btn-salida-mercancia', async (e) => {
            await self._abrirModalSalidaMercancia(e);
        });

        // Devolución de mercancía
        $(document).on('click', '#btnGenerarDevolucion, .btn-devolucion-mercancia', async (e) => {
            await self._abrirModalDevolucion(e);
        });

        // Limpiar y cerrar vale
        $("#btnLimpiarVale, #btnCerrarVale").on("click", () => {
            self.solicitudManager.limpiarFormulario();
        });

        // Guardar vale (salida o devolución)
        $("#btnGuardarVale").on("click", (e) => {
            self._guardarVale(e);
        });

        // Rechazo de devolución
        $("#btnRechazarDev").on("click", () => {
            $('#devolucionMercancia').modal('hide');
            $("#rechazoDevolucion").modal("show");
        });

        // Cancelar rechazo
        $("#btnCancelarRech").on("click", () => {
            $("#rechazoDevolucion").modal("hide");
            $('#devolucionMercancia').modal('show');
        });

        // Guardar rechazo
        $("#btnGuardarRech").on("click", () => {
            self._guardarRechazo();
        });

        // Checkboxes de artículos en salida
        $(document).on('change', '#chkSelAllArticulos', (e) => {
            const checked = $(e.currentTarget).is(':checked');
            $('#bodyArticulosSalida .chk-articuloSalida').prop('checked', checked);
            self.solicitudManager.actualizarContadorArticulos();
        });

        $(document).on('change', '.chk-articuloSalida', () => {
            self.solicitudManager.actualizarContadorArticulos();
        });
    }

    // ========================================
    // MÉTODOS PRIVADOS DE LA APP (organizados)
    // ========================================

    _recargarDataTable() {
        if ($.fn.DataTable.isDataTable('#tablaSolicitudesRefacciones')) {
            $('#tablaSolicitudesRefacciones').DataTable().ajax.reload();
        } else {
            this.solicitudManager.llenarSolicitudesRefacciones();
        }
    }

    async _generarSolicitudCompraMultiple() {
        const checkedRows = $('#tablaSolicitudesRefacciones tbody .chk-solicitud:checked');

        if (checkedRows.length === 0) {
            AlertManager.mostrar('Debes seleccionar al menos una solicitud para continuar.', 'warning');
            return;
        }

        const otsUnicas = new Set();
        checkedRows.each(function () {
            const ordenTrabajo = $(this).data('ordentrabajo');
            if (ordenTrabajo) otsUnicas.add(ordenTrabajo);
        });

        if (otsUnicas.size === 0) {
            AlertManager.mostrar('No se encontró información de Orden de Trabajo.', 'warning');
            return;
        }

        GlobalUtil.mostrarLoader(true);

        try {
            const todosArticulos = [];
            for (const ot of otsUnicas) {
                const articulos = await this.solicitudManager.obtenerArticulosPorOT(ot);
                const pendientes = articulos.filter(art => art.ESTATUS === 'Pendiente');
                todosArticulos.push(...pendientes);
            }

            if (todosArticulos.length === 0) {
                AlertManager.mostrar('No hay artículos con estatus Pendiente en las órdenes de trabajo seleccionadas.', 'warning');
                return;
            }

            // Normalizar nombres de propiedades recibidas desde el servidor
            const solicitudesTransformadas = todosArticulos.map(art => ({
                idSolicitud: art.ID_SOLICITUD ?? art.IdSolicitud ?? art.idSolicitud ?? 0,
                ordenTrabajo: art.ORDEN_TRABAJO ?? art.OrdenTrabajo ?? art.ordenTrabajo ?? '',
                codigoRefaccion: art.REFACCION_SOLICITADA ?? art.RefaccionSolicitada ?? art.codigoRefaccion ?? '',
                refaccion: art.NOMBRE_ARTICULO ?? art.NombreArticulo ?? art.refaccion ?? '',
                cantidad: art.CANTIDAD ?? art.Cantidad ?? art.cantidad ?? 0,
                stock: art.STOCK ?? art.Stock ?? 0,
                minStock: art.MIN_STOCK ?? art.MinStock ?? art.minStock ?? 0,
                maxStock: art.MAX_STOCK ?? art.MaxStock ?? art.maxStock ?? 0,
                estatus: art.ESTATUS ?? art.estatus ?? ''
            }));

            this.solicitudManager.abrirModalSolicitudCompra(solicitudesTransformadas);
        } catch (error) {
            console.error('Error al obtener artículos:', error);
            AlertManager.mostrar('Error al obtener los artículos de las órdenes de trabajo.', 'warning');
        } finally {
            GlobalUtil.mostrarLoader(false);
        }
    }

    async _abrirModalSalidaMercancia(e) {
        const $btn = $(e.currentTarget);
        const solicita = $btn.data('solicita');
        const ordenTrabajo = $btn.data('ordentrabajo');

        GlobalUtil.mostrarLoader(true);

        // Limpiar tablas
        $('#bodyArticulosSalida').html(`
            <tr>
                <td colspan="14" class="text-center text-muted py-4">
                    <div class="spinner-border spinner-border-sm text-primary me-2"></div>
                    Cargando artículos...
                </td>
            </tr>
        `);
        $('#contadorSeleccionados').text('0');
        $('#badgeTotalArticulos').text('0');
        $('#chkSelAllArticulos').prop('checked', false);

        try {
            const [articulos, objDepSucursal, objLastSM, salidas] = await Promise.all([
                this.solicitudManager.obtenerArticulosPorOT(ordenTrabajo),
                this.solicitudManager.getDepartamentoSucursalUser(solicita),
                this.solicitudManager.getLastSM(),
                this.solicitudManager.obtenerSalidasPorOrdenTrabajo(ordenTrabajo)
            ]);

            // Guardar datos del usuario
            this.solicitudManager.datosUsuarioSalida = {
                dept: objDepSucursal?.PrcCode || '',
                cedis: `C${objDepSucursal?.Sucursal || ''}`,
                nombre: objDepSucursal?.Nombre || ''
            };

            // Renderizar tabla
            this.solicitudManager.renderTablaArticulosSalida(articulos, salidas);

            // Generar folio
            const fol = (objLastSM?.DocNum || 0) + 1;
            this.solicitudManager.setFolio(`SM-${fol}`);
            $("#numAjuste").val(fol);

            // Fecha actual
            const hoy = new Date().toISOString().split('T')[0];
            $('#fechaDia').val(hoy);

            // Firmas
            this.solicitudManager.llenarFirmas();

            $('#solicitante').val(solicita);
            $("#titleSalidaMercancia").text("Entrega de Materiales");
            $("#btnRechazarDev").addClass("d-none");
            $("#btnGuardarVale").attr("operacion", "SALIDA");
            $("#btnGuardarVale").attr("ordentrabajo", ordenTrabajo);
            $("#btnGuardarVale").attr("solicita", solicita);

            $('#salidaMercancia').modal('show');
        } catch (error) {
            console.error('Error al abrir salida:', error);
            AlertManager.mostrar('Error al cargar los datos.', 'warning');
        } finally {
            GlobalUtil.mostrarLoader(false);
        }
    }

    async _abrirModalDevolucion(e) {
        const $btn = $(e.currentTarget);
        const ot = $btn.data('ordentrabajo');

        GlobalUtil.mostrarLoader(true);

        try {
            const [articulos, salidas] = await Promise.all([
                this.solicitudManager.obtenerArticulosPorOT(ot),
                this.solicitudManager.obtenerSalidasPorOrdenTrabajo(ot)
            ]);

            const atendidos = articulos.filter(art => art.ESTATUS === 'Atendida');

            if (atendidos.length === 0) {
                AlertManager.mostrar('No hay artículos con estatus Atendido en las órdenes de trabajo seleccionadas.', 'warning');
                return;
            }

            this.solicitudManager.abrirModalDevolucion(atendidos, salidas);
        } catch (error) {
            console.error('Error al obtener artículos atendidos:', error);
            AlertManager.mostrar('Error al obtener los artículos atendidos.', 'warning');
        } finally {
            GlobalUtil.mostrarLoader(false);
        }
    }

    _guardarVale(e) {
        e.preventDefault();

        const $btn = $(e.currentTarget);
        $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-1"></span>Guardando...');

        const operacion = $btn.attr("operacion");
        const ordenTrabajo = $btn.attr("ordentrabajo");

        // Validar campos
        const solicitante = $("#solicitante").val().trim();
        const numEmpleado = $("#numEmpleado").val().trim();
        const area = $("#area").val().trim();
        const entrega = $("#firmaAlmacen").val();

        if (!solicitante || !numEmpleado || !area || !entrega) {
            AlertManager.mostrar('Por favor complete los campos requeridos (Número de empleado, Área)', 'warning');
            $btn.prop('disabled', false).html('<i class="bi bi-save me-1"></i>Guardar');
            return;
        }

        // Obtener artículos seleccionados
        let articulosValidos = true;
        const articulosSeleccionados = [];
        $("#bodyArticulosSalida tr").each(function () {
            const $fila = $(this);
            const $chk = $fila.find('.chk-articuloSalida');
            if ($chk.is(':checked')) {

                let Cantidad = $fila.find('.cantidadEditable').val()

                if (!Cantidad || Cantidad == "0") {
                    AlertManager.mostrar('Por favor especifique una cantidad valida para l@s artículos seleccionados.', 'warning');
                    $btn.prop('disabled', false).html('<i class="bi bi-save me-1"></i>Guardar');
                    articulosValidos = false;
                    return;
                }

                articulosSeleccionados.push({
                    IdSolicitud: $chk.data('idsolicitud'),
                    ItemCode: $chk.data('codigo'),
                    Cantidad: Cantidad,
                    Departamento: $fila.find('.departamento').val(),
                    Proceso: $fila.find('.proceso').val(),
                    Gastos: $fila.find('.gastos').val(),
                    Cedis: $fila.find('.cedis').val(),
                    AddAlm: $chk.data('addalm')
                });

                articulosValidos = true;
            }
        });

        if (!articulosValidos)
            return;

        if (articulosSeleccionados.length === 0) {
            AlertManager.mostrar('Seleccione al menos un artículo para continuar.', 'warning');
            $btn.prop('disabled', false).html('<i class="bi bi-save me-1"></i>Guardar');
            return;
        }

        const payload = {
            Planta: this.datos_usuario[0].PLANTA,
            Usuario: this.datos_usuario[0].EMAIL,
            IdEquipo: 1,
            IdMantenimiento: 1,
            Referencia: ordenTrabajo,
            OrdenTrabajo: ordenTrabajo,
            Contabilizacion: articulosSeleccionados,
            DataMovimiento: {
                Solicitante: solicitante,
                NumEmpleado: numEmpleado,
                Area: area,
                Entrega: entrega,
                Recibe: $("#firmaAutoriza").val()
            },
            NombreEmpleado: solicitante,
            AlmacenistaEntrega: entrega
        };

        if (operacion === "SALIDA") {
            this.solicitudManager.postCreateSalidaMercancia(payload, $btn);
        } else {
            this.solicitudManager.postEntradaDevolucionMercancia(payload, $btn);
        }
    }

    _guardarRechazo() {
        const $btn = $("#btnGuardarRech");
        $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-1"></span>Guardando...');

        const motivo = $("#motivoRech").val();
        if (!motivo) {
            AlertManager.mostrar('Por favor selecciona el motivo de rechazo.', 'warning');
            $btn.prop('disabled', false).html('<i class="bi bi-floppy-fill me-1"></i> Aceptar');
            return;
        }

        const formData = new FormData();
        formData.append("Motivo", motivo);
        formData.append("Comentario", $("#CommentRech").val().trim());
        formData.append("IdSolicitud", $("#btnGuardarRech").attr("idsolicitud"));

        if (window.imagenesRutina && window.imagenesRutina.length > 0) {
            window.imagenesRutina.forEach((file) => {
                formData.append('files', file);
            });
        }

        $.ajax({
            url: `/${this.URLBase}/GuardarRechazoDevolucion`,
            type: "POST",
            data: formData,
            processData: false,
            contentType: false,
            success: (response) => {
                if (response.Status === "OK") {
                    AlertManager.mostrar('Rechazo registrado correctamente.', 'success');
                    $("#rechazoDevolucion").modal("hide");
                    this.solicitudManager.clearModal("#rechazoDevolucion");
                    this._recargarDataTable();
                } else {
                    AlertManager.mostrar(response.Message || 'Error al guardar el rechazo.', 'warning');
                }
            },
            error: () => {
                AlertManager.mostrar('Error al conectar con el servidor.', 'warning');
            },
            complete: () => {
                $btn.prop('disabled', false).html('<i class="bi bi-floppy-fill me-1"></i> Aceptar');
            }
        });
    }

    _initDateInputsEM() {
        const hoy = new Date().toISOString().split('T')[0];
        $('#FechaCount').val(hoy);
        $('#FechaDoc').val(hoy);
    }

    _recargarTablaSolicitudRefacciones() {
        if (this._isReloadingRefacciones) return;

        this._isReloadingRefacciones = true;

        // Cerrar modales abiertos
        $('.modal.show').modal('hide');

        if ($.fn.DataTable.isDataTable('#tablaSolicitudesRefacciones')) {
            $('#tablaSolicitudesRefacciones').DataTable().ajax.reload(() => {
                this._isReloadingRefacciones = false;
            }, false);
        } else {
            this.solicitudManager.llenarSolicitudesRefacciones();
            this._isReloadingRefacciones = false;
        }
    }

    // ========================================
    // SIGNALR MANAGER
    // ========================================
    initHubSolicitudRefacciones() {
        const self = this;
        const hub = $.connection.mantenimientoHub;
        let reconnectDelay = 5000;

        const miRol = this.datos_usuario[0]?.TIPOUSUARIO || '';
        const debeRecibirAviso = (rolQueCambio) => miRol !== rolQueCambio;

        let modalActualizacion = null;
        const $modalEl = document.getElementById('actualizacionRefaccionesModal');

        if ($modalEl) {
            modalActualizacion = new bootstrap.Modal($modalEl, { backdrop: 'static', keyboard: false });
            const btnConfirmar = document.getElementById('btnConfirmarActualizacion');
            if (btnConfirmar) {
                btnConfirmar.addEventListener('click', () => {
                    modalActualizacion.hide();
                    self._recargarTablaSolicitudRefacciones();
                });
            }
        }

        hub.client.actualizarTablaSolicitudRefacciones = function (rolQueCambio) {
            console.warn("📡 Actualización refacciones recibida | Origen:", rolQueCambio || "desconocido");

            if (!debeRecibirAviso(rolQueCambio)) {
                console.info("🔕 Aviso ignorado — no corresponde a este rol:", miRol);
                return;
            }

            if ($modalEl && $modalEl.classList.contains('show')) return;
            if (self._isReloadingRefacciones) return;

            if (modalActualizacion) {
                modalActualizacion.show();
            } else {
                self._recargarTablaSolicitudRefacciones();
            }
        };

        $.connection.hub.start({
            transport: ['webSockets', 'longPolling']
        }).done(function () {
            console.log("✅ SignalR Refacciones conectado | Rol:", miRol);
        }).fail(function (error) {
            console.error("❌ Error al conectar SignalR Refacciones:", error);
        });

        $.connection.hub.reconnecting(function () {
            console.warn("🔄 SignalR Refacciones reconectando...");
        });

        $.connection.hub.reconnected(function () {
            console.info("✅ SignalR Refacciones reconectado | Rol:", miRol);
            self._recargarTablaSolicitudRefacciones();
            reconnectDelay = 5000;
        });

        $.connection.hub.disconnected(function () {
            console.error("❌ SignalR Refacciones desconectado");
            setTimeout(function () {
                console.warn(`🔁 Reintentando conexión en ${reconnectDelay / 1000}s...`);
                $.connection.hub.start();
                reconnectDelay = Math.min(reconnectDelay * 2, 30000);
            }, reconnectDelay);
        });
    }
}

// ========================================
// GESTOR DE SOLICITUDES
// ========================================
class SolicitudManager {
    constructor(URLBase, datos_usuario, appPrincipal) {
        this.URLBase = URLBase;
        this.datos_usuario = datos_usuario;
        this.appPrincipal = appPrincipal;  // ✅ Referencia a la app principal

        // ✅ Propiedades inicializadas
        this.IdSolicitudR = "";
        this.OrdenTrabajo = "";
        this.Refaccion = "";
        this.currentOC = {};
        this.currentDocLinesOC = {};
        this.datosUsuarioSalida = {};
        this.ListProcesos = [];
        this.ListGastos = [];
        this.solicitudesSeleccionadas = [];
        this.articulosAtendidos = [];

        // ✅ Mapeo de equipos por OT
        this.otEquipos = {
            'OT-005': 'ENS-100',
            'OT-008': 'MEZ-850',
            'OT-012': 'HORNO-7G',
            'OT-018': 'ML-2200',
            'OT-022': 'CNC-789-XF',
            'OT-025': 'ROB-6AX',
            'OT-028': 'EMP-345'
        };

        // ✅ Nombres para autocomplete
        this.nombresClientes = ["Juan Pérez", "María López", "Carlos Ramírez", "Ana Torres"];

        // ✅ Bind de métodos que se usan como callbacks
        this.actualizarContadorArticulos = this.actualizarContadorArticulos.bind(this);
        this.llenarSolicitudesRefacciones = this.llenarSolicitudesRefacciones.bind(this);
    }

    inicializar() {
        this.configurarEventosGestionArticulos();
        this.configurarAutoCompletados();
        this.llenarSolicitudesRefacciones();
        this.obtenerCentrosCostos();  // ← AGREGAR ESTA LÍNEA
        console.log('✅ SolicitudManager inicializado correctamente');
    }

    // ========================================
    // CONFIGURACIÓN DE AUTOCOMPLETADOS
    // ========================================

    configurarAutoCompletados() {
        // ✅ Autocomplete de nombres de clientes
        UIManager.createAutoComplete($("#nombre"), $("#acNombre"), this.nombresClientes);

        // ✅ Autocomplete de órdenes de compra
        UIManager.createAutoCompleteAjax(
            $("#ordenCompra"),
            $("#acOC"),
            `/${this.URLBase}/GetOrdenCompraFilter`,
            (item) => {
                console.log("OC Seleccionada:", item);
                $("#nombreProv").val(item.CardName);
                $("#codigoProv").val(item.CardCode);
                this.currentOC = item;
                this.getDetalleOC(item.DocEntry);
            },
            (item) => {
                return `
                    <div class="d-flex justify-content-between">
                        <span>${item.DocNum}</span>
                        <small class="text-muted">Proveedor ${item.CardCode}</small>
                    </div>
                `;
            },
            "DocNum"
        );
    }

    configurarEventosGestionArticulos() {
        // ✅ CORREGIDO: Usar appPrincipal en lugar de window
        $('#BuscarArticuloMP').on('input', (e) => {
            const query = $(e.target).val().trim();
            if (query.length >= 2) {
                this.appPrincipal.gestionArticulosMP.buscarArticulos(
                    query,
                    this.datos_usuario[0].EMAIL,
                    0
                );
            } else {
                this.appPrincipal.gestionArticulosMP.ocultarSugerencias();
            }
        });

        // ✅ Click fuera para cerrar sugerencias
        $(document).on('click', (e) => {
            if (!$(e.target).closest('#BuscarArticuloMP, #sugerenciasArticulosMP').length) {
                this.appPrincipal.gestionArticulosMP.ocultarSugerencias();
            }
        });
        //Validacion de cantidades en salidas
        $(document).on('input', '.cantidadEditable', function () {

            const $input = $(this);

            clearTimeout($input.data('timer'));

            const timer = setTimeout(() => {

                const cantidad = parseInt($input.val()) || 0;
                const maximo = parseInt($input.attr('max')) || 0;

                if (cantidad > maximo) {

                    $input.val(maximo);

                    AlertManager.mostrar(
                        `La cantidad máxima permitida es ${maximo} de acuerdo al nivel de stock actual`,
                        'warning'
                    );
                }

            }, 1000);

            $input.data('timer', timer);
        });
    }

    // ========================================
    // MÉTODOS DE OBTENCIÓN DE DATOS (API)
    // ========================================

    async obtenerArticulosPorOT(ordenTrabajo) {
        try {
            const PLANTA = this.datos_usuario[0].PLANTA;
            const response = await $.ajax({
                url: `/${this.URLBase}/GetArticulosPorOrdenTrabajo`,
                method: 'GET',
                data: { ordenTrabajo, planta: PLANTA },
                dataType: 'json'
            });

            if (response.Status === 'OK') {
                return JSON.parse(response.Data);
            }
            AlertManager.mostrar(response.Message || 'Error al obtener artículos.', 'warning');
            return [];
        } catch (error) {
            console.error('Error al obtener artículos por OT:', error);
            AlertManager.mostrar('No fue posible obtener los artículos de la orden de trabajo.', 'warning');
            return [];
        }
    }

    async obtenerSalidasPorOrdenTrabajo(ordenTrabajo) {
        try {
            const response = await $.ajax({
                url: `/${this.URLBase}/GetSalidasPorOrdenTrabajo`,
                method: 'GET',
                data: { ordenTrabajo },
                dataType: 'json'
            });

            if (response.Status === 'OK') {
                return JSON.parse(response.Data);
            }
            return [];
        } catch (error) {
            console.error('Error al obtener salidas por OT:', error);
            return [];
        }
    }

    async obtenerDevolucionesPorOrdenTrabajo(ordenTrabajo) {
        try {
            const response = await $.ajax({
                url: `/${this.URLBase}/GetDevoPorOrdenTrabajo`,
                method: 'GET',
                data: { ordenTrabajo },
                dataType: 'json'
            });

            if (response.Status === 'OK') {
                return JSON.parse(response.Data);
            }
            return [];
        } catch (error) {
            console.error('Error al obtener devoluciones por OT:', error);
            return [];
        }
    }

    async getDetalleOC(docEntry) {
        try {
            const response = await $.ajax({
                url: `/${this.URLBase}/GetOrdenDetalleOC`,
                method: 'GET',
                data: { DocEntry: docEntry },
                dataType: 'json'
            });

            if (response.Status === "OK") {
                this.currentDocLinesOC = JSON.parse(response.Data);
                this.llenarTablaOC(this.currentDocLinesOC);
            }
        } catch (error) {
            console.error('Error al obtener detalle de OC:', error);
            AlertManager.mostrar('No es posible obtener el detalle de la orden de compra.', 'warning');
        }
    }

    async getCentroCostos(idcc) {
        try {
            const response = await $.ajax({
                url: `/${this.URLBase}/GetCentroCostos`,
                method: 'GET',
                data: { dimCode: idcc },
                dataType: 'json'
            });

            if (response.Status === "OK") {
                return JSON.parse(response.Data);
            }
            return [];
        } catch (error) {
            console.error('Error al obtener centro de costos:', error);
            return [];
        }
    }

    async getLastSM() {
        try {
            const response = await $.ajax({
                url: `/${this.URLBase}/GetLastDocEntrySM`,
                method: 'GET',
                dataType: 'json'
            });

            if (response.Status === "OK") {
                const data = JSON.parse(response.Data);
                return data[0] || {};
            }
            return {};
        } catch (error) {
            console.error('Error al obtener último SM:', error);
            return {};
        }
    }

    async getDepartamentoSucursalUser(correo) {
        try {
            const response = await $.ajax({
                url: `/${this.URLBase}/GetDepSucursalUser`,
                method: 'GET',
                data: { email: correo },
                dataType: 'json'
            });

            if (response.Status === "OK") {
                const data = JSON.parse(response.Data);
                return data[0] || {};
            }
            return {};
        } catch (error) {
            console.error('Error al obtener departamento:', error);
            return {};
        }
    }

    async obtenerCentrosCostos() {
        try {
            const [procesos, gastos] = await Promise.all([
                this.getCentroCostos(2),
                this.getCentroCostos(3)
            ]);

            this.ListProcesos = procesos;
            this.ListGastos = gastos;

            console.log('Centros de costo cargados:', { procesos: procesos.length, gastos: gastos.length });
        } catch (error) {
            console.error('Error al obtener centros de costo:', error);
            this.ListProcesos = [];
            this.ListGastos = [];
        }
    }

    // ========================================
    // MÉTODOS DE UTILIDAD GENERAL
    // ========================================

    actualizarContadorArticulos() {
        const total = $('#bodyArticulosSalida .chk-articuloSalida').length;
        const seleccionados = $('#bodyArticulosSalida .chk-articuloSalida:checked').length;

        $('#contadorSeleccionados').text(seleccionados);
        $('#chkSelAllArticulos').prop('checked', total > 0 && total === seleccionados);
        $('#chkSelAllArticulos').prop('indeterminate', seleccionados > 0 && seleccionados < total);
    }

    setFolio(folio) {
        $('#valeFolio').text('# ' + folio);
    }

    clearModal(modalId) {
        const $modal = $(modalId);
        if (!$modal.length) return;

        $modal.find('input, textarea, select').each(function () {
            const $el = $(this);
            if ($el.is(':checkbox') || $el.is(':radio')) {
                $el.prop('checked', false);
            } else if ($el.is('select')) {
                $el[0].selectedIndex = 0;  // ✅ Esto está bien
            } else if (!$el.prop('readonly') && !$el.hasClass('cantidadEditable')) {
                $el.val('');
            }
        });

        $modal.find('.list-group').empty().addClass('d-none');
        $modal.find('.is-invalid, .is-valid').removeClass('is-invalid is-valid');
        $modal.find('table tbody').empty();

        // ✅ CORREGIDO: Buscar cualquier contenedor de alerta, no solo '.alert-container'
        $modal.find('[class*="alert"]').empty();
    }

    limpiarFormulario() {
        $('#frmVale')[0]?.reset();
        $('#bodyArticulosSalida').html(`
            <tr>
                <td colspan="14" class="text-center text-muted py-4">
                    <i class="bi bi-info-circle me-1"></i>Seleccione una solicitud para ver los artículos
                </td>
            </tr>
        `);
        $('#contadorSeleccionados').text('0');
        $('#badgeTotalArticulos').text('0');
        $('#chkSelAllArticulos').prop('checked', false);
        this.setFolio('000000');
    }

    // ========================================
    // MÉTODO PARA CAMBIAR REFACCIÓN (CORREGIDO)
    // ========================================

    cambiarRefaccionOT(e) {
        e.preventDefault();
        const $btn = $("#btnCargarRefacciones");

        // ✅ CORREGIDO: Usar appPrincipal en lugar de window
        const articulos = this.appPrincipal.gestionArticulosMP.obtenerArticulos();
        const cantidad = $('#tablaArticulosRefaccionMP .cantidad-articulo').val();

        if (!articulos || articulos.length === 0) {
            AlertManager.mostrar('Debes seleccionar al menos un artículo para continuar.', 'warning', 'alertCambioRefaccionContainer');
            $('#badgeTotalArticulos').text('0');
            return;
        }

        $('#badgeTotalArticulos').text(articulos.length);

        const refaccionData = {
            ID_SOLICITUD: this.IdSolicitudR,
            REFACCIONSOLICITADA: articulos[0].CodigoArticulo,
            CANTIDAD: cantidad,
            ORDENTRABAJO: this.OrdenTrabajo,
            USUARIOATIENDE: this.datos_usuario[0].EMAIL
        };

        // Reutilizar la lógica común
        this._postActualizarRefaccionOT(refaccionData, $btn, 'Refacción reemplazada correctamente');
    }

    // MÉTODO PARA ELIMINAR REFACCIÓN (CORREGIDO)
    // ========================================

    eliminarRefaccionOT() {
        ConfirmManager.mostrar({
            titulo: `¿Eliminar Refacción de la OT #${this.OrdenTrabajo}?`,
            mensaje: `
            <div style="text-align:left; font-size:0.9rem; line-height:2;">
                <div><i class="bi bi-tools me-2 text-primary"></i><strong>Refacción:</strong> ${this.Refaccion}</div>
                <hr style="margin:8px 0;">
                <span class="text-danger"><i class="bi bi-exclamation-triangle-fill me-1"></i>Esta acción no se puede deshacer.</span>
            </div>`,
            onConfirm: () => {
                GlobalUtil.mostrarLoader(true);

                const refaccionData = {
                    ID_SOLICITUD: this.IdSolicitudR,
                    REFACCIONSOLICITADA: null,
                    CANTIDAD: null,
                    ESTATUS: 'ELIMINADA',
                    ORDENTRABAJO: this.OrdenTrabajo,
                    USUARIOATIENDE: this.datos_usuario[0].EMAIL
                };

                const $btn = $("#btnCargarRefacciones");

                // Reutilizar la lógica común
                this._postActualizarRefaccionOT(refaccionData, $btn, 'Refacción eliminada correctamente');
            }
        });
    }

    // Método privado para centralizar la llamada AJAX de actualización/eliminación de refacción
    _postActualizarRefaccionOT(refaccionData, $btn, successMessage) {
        if (!$btn || !$btn.length) {
            $btn = $("#btnCargarRefacciones");
        }

        $btn.html('<span class="spinner-border spinner-border-sm me-2"></span>Guardando...');
        $btn.prop("disabled", true);

        const tipoUsuario = this.datos_usuario[0].TIPOUSUARIO;

        $.ajax({
            url: `/${this.URLBase}/ActualizarRefaccionOT`,
            type: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Rol-Usuario': tipoUsuario
            },
            contentType: 'application/json; charset=utf-8',
            data: JSON.stringify(refaccionData),
            dataType: 'json',
            success: (response) => {
                if (response.Status === 'SI') {
                    AlertManager.mostrar(successMessage, 'success');

                    // Limpiar formulario
                    $("#formIntercambiarRefaccionOT")[0].reset();
                    $("#formIntercambiarRefaccionOT").removeClass("was-validated");

                    // Recargar tabla
                    if ($.fn.DataTable.isDataTable('#tablaSolicitudesRefacciones')) {
                        $('#tablaSolicitudesRefacciones').DataTable().ajax.reload(null, false);
                    }

                    setTimeout(() => {
                        $btn.html('<i class="bi bi-save me-1"></i>Guardar');
                        $btn.prop("disabled", false);
                        $('.modal').modal('hide');
                    }, 2000);
                } else {
                    AlertManager.mostrar(response.Message || 'Error al realizar la solicitud de refacción', 'warning', "alertRefaccionContainer");
                    $btn.html('<i class="bi bi-save me-1"></i>Guardar');
                    $btn.prop("disabled", false);
                }
            },
            error: () => {
                AlertManager.mostrar('Error al conectar con el servidor', 'warning', "alertRefaccionContainer");
                $btn.html('<i class="bi bi-save me-1"></i>Guardar');
                $btn.prop("disabled", false);
            },
            complete: () => {
                GlobalUtil.mostrarLoader(false);
            }
        });
    }

    // ========================================
    // MÉTODO PARA LLENAR TABLA OC
    // ========================================

    llenarTablaOC(items) {
        const tbody = $("#tablaArticulos tbody");
        tbody.empty();

        if (!items || items.length === 0) {
            tbody.html(`
                <tr><td colspan="20" class="text-center">No hay artículos disponibles</td></tr>
            `);
            return;
        }

        items.forEach((item) => {
            const {
                Linea, NArticulo, Descripcion, Detalles,
                Cantidad, PrecioU, PorDesc, IVAImporte,
                Total, Almacen, Departamento, Proceso,
                Gastos, Cedes, CodOp, Unidad, ArtUnidad,
                FolioFact, Lote
            } = item;

            tbody.append(`
                <tr>
                    <td class="text-center">${Linea || ''}</td>
                    <td><i class="bi bi-arrow-right-short"></i>${NArticulo || ''}</td>
                    <td>${Descripcion || ''}</td>
                    <td>${Detalles || ''}</td>
                    <td class="text-center">${Cantidad || 0}</td>
                    <td class="text-end">${PrecioU || 0}</td>
                    <td class="text-center">${PorDesc || 0}%</td>
                    <td class="text-end">${IVAImporte || 0}</td>
                    <td class="text-end">${Total || 0}</td>
                    <td>${Almacen || ''}</td>
                    <td class="sap-yellow">${Departamento || ''}</td>
                    <td class="sap-yellow">${Proceso || ''}</td>
                    <td class="sap-yellow">${Gastos || ''}</td>
                    <td class="sap-yellow">${Cedes || ''}</td>
                    <td>${CodOp || ''}</td>
                    <td>${Unidad || ''}</td>
                    <td>${ArtUnidad || ''}</td>
                    <td class="sap-yellow">${FolioFact || ''}</td>
                    <td>${Lote || ''}</td>
                </tr>
            `);
        });
    }

    // ========================================
    // MÉTODO PARA RENDERIZAR TABLA DE ARTÍCULOS (SALIDA) - VERSIÓN SIMPLIFICADA
    // ========================================

    renderTablaArticulosSalida(articulos, salidas = []) {
        const tbody = $('#bodyArticulosSalida');
        tbody.empty();

        if (!articulos || articulos.length === 0) {
            tbody.html(`
            <tr>
                <td colspan="14" class="text-center text-muted py-4">
                    <i class="bi bi-inbox me-2"></i>No hay artículos disponibles
                </td>
            </tr>
        `);
            $('#badgeTotalArticulos').text('0');
            return;
        }

        // ✅ Obtener opciones de selects (procesos y gastos)
        const procesosHtml = this.buildOptions(this.ListProcesos, 'PrcCode', 'PCPVC');
        const gastosHtml = this.buildOptions(this.ListGastos, 'PrcCode', 'GIF');

        // ✅ Datos comunes del usuario
        const dept = this.datosUsuarioSalida.dept || '';
        const cedis = this.datosUsuarioSalida.cedis || '';
        const nombreEmpleado = this.datosUsuarioSalida.nombre || '';

        $('#badgeTotalArticulos').text(articulos.length);

        articulos.forEach((art, index) => {
            // ✅ Acceso directo a las propiedades
            const FolioSalida = art.FOLIO_SALIDA ?? art.Folio_Salida ?? "";
            const CantidadSurtida = art.CANTIDAD_SURTIDA ?? art.Cantidad_Surtida ?? "";
            const refaccionSolicitada = art.REFACCION_SOLICITADA || '';
            const cantidadOriginal = art.CANTIDAD || art.Cantidad || 0;
            const nombreMostrar = art.NOMBRE_ARTICULO || art.NombreArticulo || refaccionSolicitada || 'N/A';
            const minStock = art.MIN_STOCK ?? art.MinStock ?? art.minStock ?? 0;
            const maxStock = art.MAX_STOCK ?? art.MaxStock ?? art.maxStock ?? 0;

            // ✅ Calcular cantidad disponible restando salidas ya realizadas
            const salidaExistente = salidas.find(s => s.ItemCode === refaccionSolicitada);
            const cantidadDisponible = salidaExistente
                ? Math.max(0, cantidadOriginal - (salidaExistente.CantidadTotal || 0))
                : cantidadOriginal;

            // ✅ Estados y clases
            const isAtendida = art.ESTATUS === 'Atendida';
            const urgenciaClass = this._getUrgenciaClass(art.NIVEL_URGENCIA);
            const estatusClass = isAtendida ? 'badge btn-ptm-primary badge-custom' : 'bg-warning text-dark';
            const urgenciaText = art.NIVEL_URGENCIA || 'N/A';
            const estatusText = art.ESTATUS || 'N/A';

            let botonesAccion =`
            <button class="btn btn-sm btn-ptm-edit btn-del-ref"
                    data-idsolicitud="${art.ID_SOLICITUD}"
                    data-codigo="${refaccionSolicitada}"
                    data-nombrearticulo="${art.NOMBRE_ARTICULO}"
                    data-ordentrabajo="${art.ORDEN_TRABAJO}"
                    data-bs-toggle="tooltip"
                    title="❌ Eliminar refacción">
                <i class="bi bi-x-circle fs-6"></i>
            </button>
            <button class="btn btn-sm btn-ptm-edit btn-change-ref"
                    data-idsolicitud="${art.ID_SOLICITUD}"
                    data-codigo="${refaccionSolicitada}"
                    data-nombrearticulo="${art.NOMBRE_ARTICULO}"
                    data-ordentrabajo="${art.ORDEN_TRABAJO}"
                    data-bs-toggle="tooltip"
                    title="🔄 Cambiar refacción">
                <i class="bi bi-arrow-repeat fs-6"></i>
            </button>`;

            if (isAtendida) {
                botonesAccion = `
            <button class="btn btn-sm btn-ptm-edit btn-del-ref disabled">
                <i class="bi bi-x-circle fs-6"></i>
            </button>
            <button class="btn btn-sm btn-ptm-edit btn-change-ref disabled">
                <i class="bi bi-arrow-repeat fs-6"></i>
            </button>`;
            }

            tbody.append(`
            <tr class="${isAtendida ? 'table-success' : ''}" ${isAtendida ? `data-bs-toggle="tooltip" data-bs-placement="top" data-bs-custom-class="custom-tooltip" data-bs-title="Refacción Atendida"` : ''}>
                <td class="text-center align-middle">${index + 1}</td>
                <td class="text-center align-middle">${FolioSalida}</td>
                <td class="text-center align-middle">
                    <input type="checkbox" class="form-check-input chk-articuloSalida"
                           data-idsolicitud="${art.ID_SOLICITUD}"
                           data-codigo="${refaccionSolicitada}"
                           data-nombrearticulo="${art.NOMBRE_ARTICULO}"
                           data-ordentrabajo="${art.ORDEN_TRABAJO}"
                           data-nombre="${nombreMostrar}"
                           data-cantidad="${cantidadDisponible}"
                           data-cantidadoriginal="${cantidadOriginal}"
                           ${isAtendida ? 'disabled' : ''}>
                </td>
                <td class="text-center align-middle">${botonesAccion}</td>
                <td class="text-center align-middle">
                    ${!isAtendida ? `<span class="punto-pulso-absolute"></span>` : ''}
                    <span class="badge bg-dark">${refaccionSolicitada || 'N/A'}</span>
                </td>
                <td class="align-middle">${nombreMostrar}</td>
                    <td class="text-center align-middle">
                    <input type="number" min="1" max="${art.STOCK || maxStock}"
                           class="form-control form-control-sm text-center fw-bold cantidadEditable" ${isAtendida ? 'disabled' : ''}
                           value="${CantidadSurtida}"
                           data-stock="${art.STOCK || 0}"
                           data-min="${minStock}"
                           data-max="${maxStock}"
                           ${isAtendida ? 'readonly' : ''}>
                </td>
                <td class="text-center align-middle">${art.STOCK || 0}</td>
                <td class="text-center align-middle">${minStock}</td>
                <td class="text-center align-middle">${maxStock}</td>
                <td class="text-center align-middle">
                    <span class="badge ${urgenciaClass}">${urgenciaText}</span>
                </td>
                <td class="text-center align-middle">
                    <span class="badge ${estatusClass}">${estatusText}</span>
                </td>
                <td class="text-center align-middle">
                    <input type="text" class="form-control form-control-sm departamento text-center"
                           value="${dept}" readonly>
                </td>
                <td class="text-center align-middle">
                    <select class="form-select form-select-sm proceso">
                        ${procesosHtml}
                    </select>
                </td>
                <td class="text-center align-middle">
                    <select class="form-select form-select-sm gastos">
                        ${gastosHtml}
                    </select>
                </td>
                <td class="text-center align-middle">
                    <input type="text" class="form-control form-control-sm cedis text-center"
                           value="${cedis}" readonly>
                </td>
                <td class="text-center align-middle">
                    <input type="text" class="form-control form-control-sm nombre_empleado text-center"
                           value="${nombreEmpleado}">
                </td>
            </tr>
        `);
        });

        // ✅ Reinicializar tooltips para los nuevos elementos
        $('[data-bs-toggle="tooltip"]').tooltip();
    }

    // ========================================
    // MÉTODOS PRIVADOS DE APOYO
    // ========================================

    _getUrgenciaClass(nivelUrgencia) {
        if (nivelUrgencia === 'Critico' || nivelUrgencia === 'Crítico') {
            return 'bg-danger';
        }
        if (nivelUrgencia === 'Urgente') {
            return 'bg-warning text-dark';
        }
        return 'bg-primary';
    }

    buildOptions(list, key, selectedValue) {
        if (!list || list.length === 0) {
            return `<option value="">Sin opciones</option>`;
        }

        let options = '';
        list.forEach(item => {
            const selected = item[key] === selectedValue ? 'selected' : '';
            options += `<option value="${item[key]}" ${selected}>${item[key]}</option>`;
        });
        return options;
    }

    obtenerEquipoPorOT(ot) {
        return this.otEquipos[ot] || '';
    }

    // ========================================
    // MÉTODOS DE FIRMAS Y AUTORIZACIONES
    // ========================================

    llenarFirmas() {
        $("#firmaAlmacen").empty();
        $("#firmaAutoriza").empty();
        $("#devolucionEntrega").empty();
        $("#devolucionRecibe").empty();

        const templateOption = `<option value="{{NOMBRE}}">{{NOMBRE}}</option>`;

        // ✅ Configuración por planta
        let autorizadores = [];
        let almacenistas = [];

        const planta = this.datos_usuario[0].PLANTA;

        if (planta == 1) {
            // Planta 1
            autorizadores = [
                { Nombre: "SIMP1" }, { Nombre: "MPVCS" }, { Nombre: "MPVCC" },
                { Nombre: "MPEADC" }, { Nombre: "MPEADS" }, { Nombre: "HP1C" },
                { Nombre: "HPVCS" }, { Nombre: "HPEADS" }
            ];
            almacenistas = [
                { Nombre: "TMPVC1" }, { Nombre: "TMPVC2" }, { Nombre: "TMPVC3" },
                { Nombre: "TMPVC4" }, { Nombre: "TMPEAD1" }, { Nombre: "TMPEAD2" },
                { Nombre: "TMPEAD3" }, { Nombre: "TMPEAD4" }, { Nombre: "TMPEAD5" },
                { Nombre: "THPVC1" }, { Nombre: "THPVC2" }, { Nombre: "THPVC3" },
                { Nombre: "THPVC4" }, { Nombre: "THPEAD1" }, { Nombre: "THPEAD2" },
                { Nombre: "THPEAD3" }, { Nombre: "THPEAD4" }
            ];
        } else {
            // Otras plantas
            autorizadores = [
                { Nombre: "JM001" }, { Nombre: "SM001" }, { Nombre: "SH001" }
            ];
            almacenistas = [
                { Nombre: "TM001" }, { Nombre: "TM002" }, { Nombre: "TM003" },
                { Nombre: "TM004" }, { Nombre: "TM005" }, { Nombre: "TM006" },
                { Nombre: "TM007" }, { Nombre: "TM008" }, { Nombre: "TM009" },
                { Nombre: "TM010" }, { Nombre: "TH001" }, { Nombre: "TH002" },
                { Nombre: "TH003" }, { Nombre: "TH004" }, { Nombre: "TH005" },
                { Nombre: "TH006" }, { Nombre: "TH007" }, { Nombre: "TH008" },
                { Nombre: "TH009" }, { Nombre: "TH010" }
            ];
        }

        let opcionesAuth = "";
        autorizadores.forEach(a => {
            opcionesAuth += templateOption.replaceAll('{{NOMBRE}}', a.Nombre);
        });

        let opcionesAlm = "";
        almacenistas.forEach(a => {
            opcionesAlm += templateOption.replaceAll('{{NOMBRE}}', a.Nombre);
        });

        $("#firmaAlmacen").append(opcionesAlm);
        $("#firmaAutoriza").append(opcionesAuth);
        $("#devolucionEntrega").append(opcionesAlm);
        $("#devolucionRecibe").append(opcionesAuth);
    }

    // ========================================
    // MÉTODO PARA ABRIR MODAL DE DEVOLUCIÓN
    // ========================================

    abrirModalDevolucion(articulosAtendidos, salidas = []) {
        this.articulosAtendidos = articulosAtendidos;

        $('#badgeTotalDevolucion').text(articulosAtendidos.length);

        const tbody = $('#bodyArticulosDevolucion');
        tbody.empty();

        if (!articulosAtendidos || articulosAtendidos.length === 0) {
            tbody.html(`
                <tr><td colspan="10" class="text-center">No hay artículos para devolver</td></tr>
            `);
            return;
        }

        articulosAtendidos.forEach((art, index) => {
            // ✅ Buscar salida relacionada para obtener dimensiones y cantidad real
            const salidaRelacionada = salidas.find(s => s.ItemCode === art.REFACCION_SOLICITADA);
            const cantidadAtendida = salidaRelacionada?.CantidadTotal || art.CANTIDAD || 0;

            tbody.append(`
                <tr>
                    <td class="text-center">${index + 1}</td>
                    <td class="text-center">
                        <input type="checkbox" class="form-check-input chk-articulo-devolucion" checked>
                    </td>
                    <td class="text-center">
                        <span class="badge bg-blue-ptm badge-custom">${art.ORDEN_TRABAJO || 'N/A'}</span>
                    </td>
                    <td class="text-center">
                        <small class="text-muted fw-semibold">${art.REFACCION_SOLICITADA || 'N/A'}</small>
                    </td>
                    <td>${art.NOMBRE_ARTICULO || art.REFACCION_SOLICITADA || 'N/A'}</td>
                    <td class="text-center fw-semibold">${cantidadAtendida}</td>
                    <td class="text-center">
                        <input type="number"
                            class="form-control form-control-sm cant-devolver text-center"
                            min="1"
                            max="${cantidadAtendida}"
                            value="${cantidadAtendida}"
                            data-idsolicitud="${art.ID_SOLICITUD}"
                            data-ordentrabajo="${art.ORDEN_TRABAJO || ''}"
                            data-codigo="${art.REFACCION_SOLICITADA || ''}"
                            data-articulo="${art.NOMBRE_ARTICULO || ''}"
                            data-cantidadatendida="${cantidadAtendida}"
                            required>
                    </td>
                    <td class="text-center fw-semibold">${salidaRelacionada?.OcrCode1 || ''}</td>
                    <td class="text-center fw-semibold">${salidaRelacionada?.OcrCode2 || ''}</td>
                    <td class="text-center fw-semibold">${salidaRelacionada?.OcrCode3 || ''}</td>
                    <td class="text-center fw-semibold">${salidaRelacionada?.OcrCode4 || ''}</td>
                </tr>
            `);
        });

        // ✅ Configurar eventos de selección
        this._configurarEventosDevolucion();

        // ✅ Inicializar firmas
        this.llenarFirmas();

        // Limpiar campos
        $('#devolucionSolicitante').val('');
        $('#devolucionNumEmpleado').val('');
        $('#devolucionArea').val('');
        $('#formDevolucionMercancia').removeClass('was-validated');
        $('#alertDevolucionContainer').empty();

        // ✅ Actualizar contador
        this.actualizarContadorDevolucion();

        $('#devolucionMercancia').modal('show');
    }

    _configurarEventosDevolucion() {
        // ✅ Lógica "Seleccionar todos"
        $('#chkSelAllDevolucion').off('change').on('change', () => {
            const checked = $('#chkSelAllDevolucion').prop('checked');
            $('.chk-articulo-devolucion').prop('checked', checked);
            $('.cant-devolver').prop('disabled', !checked);
            this.actualizarContadorDevolucion();
        });

        // ✅ Cuando se desmarca una fila
        $(document).off('change', '.chk-articulo-devolucion').on('change', '.chk-articulo-devolucion', () => {
            const total = $('.chk-articulo-devolucion').length;
            const seleccionados = $('.chk-articulo-devolucion:checked').length;

            $('#chkSelAllDevolucion').prop('checked', total === seleccionados);
            $('#chkSelAllDevolucion').prop('indeterminate', seleccionados > 0 && seleccionados < total);

            // Habilitar/deshabilitar input según checkbox
            $('.chk-articulo-devolucion').each(function () {
                const $input = $(this).closest('tr').find('.cant-devolver');
                $input.prop('disabled', !$(this).prop('checked'));
            });

            this.actualizarContadorDevolucion();
        });

        // Por defecto deshabilitar los que no están seleccionados
        $('.chk-articulo-devolucion').each(function () {
            if (!$(this).prop('checked')) {
                $(this).closest('tr').find('.cant-devolver').prop('disabled', true);
            }
        });
    }

    actualizarContadorDevolucion() {
        const seleccionados = $('.chk-articulo-devolucion:checked').length;
        $('#contadorDevolucion').text(seleccionados);
    }

    // ========================================
    // ENTRADA DE MERCANCÍA
    // ========================================

    guardarEntradaMercancia() {
        const lineas = [];

        this.currentDocLinesOC.forEach((item) => {
            lineas.push({
                NumeroLinea: item.Linea,
                Cantidad: item.Cantidad,
                PrecioUnitario: item.PrecioU
            });
        });

        const payload = {
            DocEntryOrdenCompra: this.currentOC.DocEntry,
            Lineas: lineas
        };

        console.log("Request Entrada Mercancía:", payload);
        this.postCreateEntradaMercancia(payload);
    }

    async postCreateEntradaMercancia(requestEM) {
        try {
            const response = await $.ajax({
                url: `/${this.URLBase}/GenerarEntradaMercancia`,
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                data: JSON.stringify(requestEM),
                dataType: 'json'
            });

            console.log("Respuesta Entrada Mercancía:", response);

            if (response.Status === "OK") {
                const data = JSON.parse(response.Data);
                AlertManager.mostrar(`Entrada de Mercancía generada correctamente. Documento: ${data.DocNum}`, 'success');
                $("#entradaMercancia").modal("hide");
                this.appPrincipal._recargarDataTable();
            } else {
                AlertManager.mostrar(response.Message || 'Error al generar entrada de mercancía', 'warning');
            }
        } catch (error) {
            console.error('Error en postCreateEntradaMercancia:', error);
            AlertManager.mostrar('Error al conectar con el servidor', 'warning');
        }
    }

    // ========================================
    // SALIDA DE MERCANCÍA
    // ========================================

    async postCreateSalidaMercancia(requestSalida, $btn = null) {
        try {
            const response = await $.ajax({
                url: `/${this.URLBase}/GenerarSalidaMercancia`,
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                data: JSON.stringify(requestSalida),
                dataType: 'json'
            });

            console.log("Respuesta Salida Mercancía:", response);

            if (response.Status === "OK") {
                const data = JSON.parse(response.Data);
                AlertManager.mostrar(`Salida de Mercancía generada correctamente. Folio: ${data.DocNum}`, 'success');
                $('#salidaMercancia').modal('hide');
                this.limpiarFormulario();
                this.appPrincipal._recargarDataTable();
            } else {
                AlertManager.mostrar(response.Message || 'Error al generar salida de mercancía', 'warning');
            }
        } catch (error) {
            console.error('Error en postCreateSalidaMercancia:', error);
            AlertManager.mostrar('Error al conectar con el servidor', 'warning');
        } finally {
            // ✅ CORREGIDO: Solo si $btn existe
            if ($btn && $btn.length) {
                $btn.prop('disabled', false).html('<i class="bi bi-save me-1"></i>Guardar');
            }
        }
    }

    // ========================================
    // DEVOLUCIÓN DE MERCANCÍA
    // ========================================

    async postEntradaDevolucionMercancia(requestDevolucion, $btn = null) {
        try {
            const response = await $.ajax({
                url: `/${this.URLBase}/GenerarDevolucionMercancia`,
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                data: JSON.stringify(requestDevolucion),
                dataType: 'json'
            });

            console.log("Respuesta Devolución Mercancía:", response);

            if (response.Status === "OK") {
                const data = JSON.parse(response.Data);
                AlertManager.mostrar(`Devolución de Mercancía generada correctamente. Folio: ${data.DocNum}`, 'success');
                $('#salidaMercancia').modal('hide');
                this.appPrincipal._recargarDataTable();
            } else {
                AlertManager.mostrar(response.Message || 'Error al generar devolución de mercancía', 'warning');
            }
        } catch (error) {
            console.error('Error en postEntradaDevolucionMercancia:', error);
            AlertManager.mostrar('Error al conectar con el servidor', 'warning');
        } finally {
            // ✅ CORREGIDO: Solo si $btn existe
            if ($btn && $btn.length) {
                $btn.prop('disabled', false).html('<i class="bi bi-save me-1"></i>Guardar');
            }
        }
    }

    // ========================================
    // MÉTODO PARA OBTENER SALIDA POR ID
    // ========================================

    async getSalidaM(IdSolicitud) {
        try {
            const response = await $.ajax({
                url: `/${this.URLBase}/GetMovimientoSalida`,
                method: 'GET',
                data: { idSol: IdSolicitud },
                dataType: 'json'
            });

            console.log("RESPONSE SALIDA M:", response);

            if (response.Status === "OK") {
                const data = JSON.parse(response.Data);
                return data[0] || {};
            }
            return {};
        } catch (error) {
            console.error('Error en getSalidaM:', error);
            return {};
        }
    }

    // ========================================
    // MÉTODOS DE SOLICITUD DE COMPRA
    // ========================================

    abrirModalSolicitudCompra(solicitudes) {
        this.solicitudesSeleccionadas = solicitudes;

        // ✅ Actualizar subtítulo con contador
        $('#modalSolicitudCompraTitulo').text('Generar Solicitud de Compra');
        $('.modal-subtitle-custom').html(
            `<i class="bi bi-list-check me-1"></i> 
             <strong>${solicitudes.length}</strong> artículo(s) con estatus Pendiente`
        );

        const tbody = $('#bodySeleccionadas');
        tbody.empty();

        if (!solicitudes || solicitudes.length === 0) {
            tbody.html(`
                <tr><td colspan="6" class="text-center">No hay artículos seleccionados</td</tr>
            `);
            return;
        }

        solicitudes.forEach((solicitud, index) => {
            // Mapear propiedades al modelo ArticuloSolicitudRefaccion
            const idSolicitud = solicitud.IdSolicitud ?? solicitud.idSolicitud ?? 0;
            const ordenTrabajo = solicitud.OrdenTrabajo ?? solicitud.ordenTrabajo ?? '';
            const codigoRefaccion = solicitud.RefaccionSolicitada ?? solicitud.codigoRefaccion ?? '';
            const nombreArticulo = solicitud.NombreArticulo ?? solicitud.refaccion ?? '';
            const cantidadReq = solicitud.Cantidad ?? solicitud.cantidad ?? 0;
            const stock = (solicitud.Stock ?? solicitud.stock ?? 0);
            const minStock = (solicitud.MinStock ?? solicitud.minStock ?? 0);
            const maxStock = (solicitud.MaxStock ?? solicitud.maxStock ?? 0);

            tbody.append(`
                <tr>
                    <td class="text-center">
                        <input type="checkbox" class="form-check-input chk-solicitud-sc" checked>
                    </td>
                    <td class="text-center">
                        <span class="badge bg-blue-ptm badge-custom">${ordenTrabajo || 'N/A'}</span>
                    </td>
                    <td class="text-center">
                        <small class="text-muted fw-semibold">${codigoRefaccion || 'N/A'}</small>
                    </td>
                    <td>${nombreArticulo || 'N/A'}</td>
                    <td class="text-end fw-semibold">${stock.toLocaleString('es-MX')}</td>
                    <td class="text-end fw-semibold">${minStock.toLocaleString('es-MX')}</td>
                    <td class="text-end fw-semibold">${maxStock.toLocaleString('es-MX')}</td>
                    <td class="text-center fw-semibold">${cantidadReq}</td>
                    <td class="text-center">
                        <input type="number"
                            class="form-control form-control-sm cant-encargar text-center"
                            min="1"
                            max="${cantidadReq}"
                            value="${cantidadReq}"
                            data-idsolicitud="${idSolicitud}"
                            data-ordentrabajo="${ordenTrabajo}"
                            data-codigorefaccion="${codigoRefaccion}"
                            data-refaccion="${nombreArticulo}"
                            data-cantidad="${cantidadReq}"
                            data-index="${index}"
                            required>
                    </td>
                </tr>
            `);
        });

        // ✅ Configurar eventos del modal
        this._configurarEventosSolicitudCompra();

        $('#ComentariosSC').val('');
        $('#formSolicitudCompra').removeClass('was-validated');
        $('#alertSolicitudCompraContainer').empty();

        $('#solicitudCompra').modal('show');
    }

    _configurarEventosSolicitudCompra() {
        // ✅ Seleccionar todos
        $('#chkSelectAllSC').prop('checked', true);

        $('#chkSelectAllSC').off('change').on('change', () => {
            const checked = $('#chkSelectAllSC').prop('checked');
            $('.chk-solicitud-sc').prop('checked', checked);
            $('.cant-encargar').prop('disabled', !checked);
        });

        // ✅ Cuando se desmarca una fila
        $(document).off('change', '.chk-solicitud-sc').on('change', '.chk-solicitud-sc', () => {
            const total = $('.chk-solicitud-sc').length;
            const seleccionados = $('.chk-solicitud-sc:checked').length;

            $('#chkSelectAllSC').prop('checked', total === seleccionados);
            $('#chkSelectAllSC').prop('indeterminate', seleccionados > 0 && seleccionados < total);

            // Habilitar/deshabilitar input según checkbox
            $('.chk-solicitud-sc').each(function () {
                const $input = $(this).closest('tr').find('.cant-encargar');
                $input.prop('disabled', !$(this).prop('checked'));
            });
        });

        // ✅ Por defecto, deshabilitar los no seleccionados
        $('.chk-solicitud-sc').each(function () {
            if (!$(this).prop('checked')) {
                $(this).closest('tr').find('.cant-encargar').prop('disabled', true);
            }
        });
    }

    enviarSolicitudCompra(e) {
        e.preventDefault();

        // ✅ Validar que haya al menos una fila seleccionada
        const checkedRows = $('.chk-solicitud-sc:checked');
        if (checkedRows.length === 0) {
            AlertManager.mostrar('Debes seleccionar al menos un artículo para continuar.', 'warning', 'alertSolicitudCompraContainer');
            return false;
        }

        // ✅ Validar cantidades
        let cantidadesValidas = true;
        checkedRows.each(function () {
            const $input = $(this).closest('tr').find('.cant-encargar');
            const valor = parseInt($input.val());
            if (!valor || valor < 1) {
                $input.addClass('is-invalid');
                cantidadesValidas = false;
            } else {
                $input.removeClass('is-invalid');
            }
        });

        if (!cantidadesValidas) {
            AlertManager.mostrar('Por favor, capture la cantidad a encargar en todas las filas seleccionadas.', 'warning', 'alertSolicitudCompraContainer');
            return false;
        }

        // ✅ Validar comentario
        const comentario = $('#ComentariosSC').val().trim();
        if (!comentario) {
            AlertManager.mostrar('Por favor, ingresa un comentario.', 'warning', 'alertSolicitudCompraContainer');
            return false;
        }

        // ✅ Armar array de solicitudes
        const lineas = [];
        checkedRows.each(function () {
            const $row = $(this).closest('tr');
            const $input = $row.find('.cant-encargar');
            lineas.push({
                IdSolicitud: $input.data('idsolicitud'),
                CantidadEncargar: $input.val()
            });
        });

        const datos = {
            Solicitudes: lineas,
            Comentarios: comentario,
            UsuarioSolicita: this.datos_usuario[0].EMAIL
        };

        const $btn = $("#btnGuardarSC");
        $btn.html('<span class="spinner-border spinner-border-sm me-2"></span>Guardando...');
        $btn.prop("disabled", true);

        $.ajax({
            url: `/${this.URLBase}/InsertarSolicitudOrdenCompraMP`,
            type: 'POST',
            contentType: 'application/json; charset=utf-8',
            data: JSON.stringify(datos),
            dataType: 'json',
            success: (response) => {
                // ✅ CORREGIDO: Manejo de estados correctos
                if (response.Status === 'SI' || response.Status === 'OK') {
                    AlertManager.mostrar(response.Message || 'Solicitud de compra generada correctamente.', 'success', 'alertSolicitudCompraContainer');
                    this._limpiarYRecargarDespuesDeCompra($btn);
                } else if (response.Status === 'PARCIAL' || response.Status === 'PARTIAL') {
                    AlertManager.mostrar(response.Message || 'Solicitud procesada parcialmente. Algunos artículos no pudieron ser procesados.', 'warning', 'alertSolicitudCompraContainer');
                    this._limpiarYRecargarDespuesDeCompra($btn);
                } else {
                    AlertManager.mostrar(response.Message || 'Error al realizar la solicitud de compra', 'warning', 'alertSolicitudCompraContainer');
                    $btn.html('<i class="bi bi-floppy-fill me-1"></i> Guardar');
                    $btn.prop("disabled", false);
                }
            },
            error: (xhr, status, error) => {
                console.error('Error en enviarSolicitudCompra:', error);
                AlertManager.mostrar('Error al conectar con el servidor', 'warning', 'alertSolicitudCompraContainer');
                $btn.html('<i class="bi bi-floppy-fill me-1"></i> Guardar');
                $btn.prop("disabled", false);
            }
        });
    }

    _limpiarYRecargarDespuesDeCompra($btn) {
        $btn.prop("disabled", false);
        $("#formSolicitudCompra")[0].reset();
        $("#formSolicitudCompra").removeClass("was-validated");
        $btn.html('<i class="bi bi-check-circle-fill me-2 text-white"></i>Guardado');

        // ✅ Limpiar checkboxes
        $('#tablaSolicitudesRefacciones tbody .chk-solicitud').prop('checked', false);
        $('#chkSelectAll').prop('checked', false).prop('indeterminate', false);

        // ✅ Recargar DataTable
        if ($.fn.DataTable.isDataTable('#tablaSolicitudesRefacciones')) {
            $('#tablaSolicitudesRefacciones').DataTable().ajax.reload(null, false);
        }

        setTimeout(() => {
            $btn.html('<i class="bi bi-floppy-fill me-1"></i> Guardar');
            $("#solicitudCompra").modal('hide');
        }, 2000);
    }

    // ========================================
    // DATATABLE - SOLICITUDES REFACCIONES
    // ========================================

    llenarSolicitudesRefacciones() {
        try {
            $('#filaVacia').remove();

            if ($.fn.DataTable.isDataTable('#tablaSolicitudesRefacciones')) {
                $('#tablaSolicitudesRefacciones').DataTable().destroy();
            }

            const calcularHeaderOffset = () => {
                if (window.innerWidth < 768) return 160;
                if (window.innerWidth < 1400) return 150;
                return 113;
            };

            const table = $('#tablaSolicitudesRefacciones').DataTable({
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
                        renderer: (api, rowIdx, columns) => this._renderDetallesResponsive(columns)
                    }
                },
                ajax: {
                    url: `/${this.URLBase}/GetSolicitudesRefacciones`,
                    type: "POST",
                    dataType: "json",
                    beforeSend: () => GlobalUtil.mostrarLoader(true),
                    complete: () => GlobalUtil.mostrarLoader(false),
                    data: (d) => {
                        return $.extend({}, d, {
                            "FiltroFechaInicio": $("#FiltroFechaInicio").val() || null,
                            "FiltroFechaFin": $("#FiltroFechaFin").val() || null,
                            "FiltroOrdenTrabajo": $("#FiltroOrdenTrabajo").val() || null,
                            "FiltroPlanta": $("#FiltroPlanta").val() || null,
                            "FiltroNivelUrgencia": $("#FiltroNivelUrgencia").val() || null,
                        });
                    },
                    dataSrc: (json) => json.data
                },
                columns: this._getColumnDefs(),
                columnDefs: this._getColumnDefsConfig(),
                ordering: false,
                info: true,
                bPaginate: true,
                pageLength: 50,
                lengthMenu: [[10, 25, 50, 100, 200], [10, 25, 50, 100, 200]],
                language: {
                    lengthMenu: "Mostrar _MENU_ registros",
                    zeroRecords: "No se encontraron solicitudes",
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
                    emptyTable: "No hay solicitudes disponibles"
                },
                createdRow: (row, data) => {
                    $(row).attr('data-orden-trabajo', data.OrdenTrabajo);
                    $(row).attr('data-estatus', data.Estatus);
                },
                drawCallback: () => {
                    table.columns.adjust();
                    this._configurarEventosDataTable();
                }
            });

            // ✅ Manejar resize de ventana
            $(window).off('resize.solicitudes').on('resize.solicitudes', () => {
                if ($.fn.DataTable.isDataTable('#tablaSolicitudesRefacciones')) {
                    const nuevoOffset = calcularHeaderOffset();
                    $('#tablaSolicitudesRefacciones').DataTable().fixedHeader.headerOffset(nuevoOffset);
                    $('#tablaSolicitudesRefacciones').DataTable().fixedHeader.adjust();
                }
            });

            return table;

        } catch (error) {
            AlertManager.mostrar('No es posible mostrar las solicitudes: ' + error, 'warning');
            console.error('Error en llenarSolicitudesRefacciones:', error);
        }
    }

    _renderDetallesResponsive(columns) {
        const hiddenColumns = columns.filter(col => col.hidden);
        if (hiddenColumns.length === 0) return false;

        const normalizar = (texto) => {
            return texto.toUpperCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .trim();
        };

        const obtenerIcono = (titulo) => {
            const tituloNorm = normalizar(titulo);
            const iconos = {
                'ID SOLICITUD': 'bi bi-hash',
                'ORDEN TRABAJO': 'bi bi-file-earmark-text',
                'REFACCION SOLICITADA': 'bi bi-tools',
                'CANTIDAD': 'bi bi-123',
                'NIVEL URGENCIA': 'bi bi-exclamation-triangle-fill',
                'DESCRIPCION NECESIDAD': 'bi bi-card-text',
                'FECHA SOLICITUD': 'bi bi-calendar-event',
                'ESTATUS': 'bi bi-flag-fill',
                'USUARIO SOLICITA': 'bi bi-person-fill',
                'USUARIO ATIENDE': 'bi bi-person-check-fill',
                'FECHA ATENCION': 'bi bi-calendar-check',
                'ACCIONES': 'bi bi-lightning-fill'
            };
            return iconos[tituloNorm] || 'bi bi-circle-fill';
        };

        let detallesHtml = '';
        hiddenColumns.forEach((col) => {
            const iconClass = obtenerIcono(col.title);
            const valueContent = col.data || '<em class="text-muted">Sin información</em>';
            detallesHtml += `
                <div class="row mb-3 py-2 border-bottom align-items-center">
                    <div class="col-5">
                        <i class="${iconClass} me-2" style="font-size:1.3rem; color:#0D6EFD;"></i>
                        <strong>${col.title}</strong>
                    </div>
                    <div class="col-7">
                        <span class="badge px-3 py-2" style="background-color:#F2F2F2; color:#333;">${valueContent}</span>
                    </div>
                </div>
            `;
        });

        return `
            <div class="card shadow-sm mt-3">
                <div class="card-header bg-light">
                    <h5 class="mb-0"><i class="bi bi-tools me-2" style="color:#0D6EFD;"></i>Detalle de Solicitud</h5>
                </div>
                <div class="card-body">${detallesHtml}</div>
                <div class="card-footer bg-light text-muted">
                    <small>Última actualización: ${new Date().toLocaleDateString()}</small>
                </div>
            </div>
        `;
    }

    _getColumnDefs() {
        return [
            // Columna 0: Control Responsive
            { className: 'dtr-control', orderable: false, data: null, defaultContent: '', width: '30px' },

            // Columna 1: Checkbox
            {
                data: null, orderable: false, className: 'text-center all', width: '40px',
                render: (data, type, row) => {
                    return `<input type="checkbox" class="chk-solicitud form-check-input"
                          data-ordentrabajo="${row.OrdenTrabajo || ''}"
                          data-estatus="${row.Estatus || ''}"
                          data-solicita="${row.UsuarioSolicita || ''}">`;
                }
            },

            // Columna 2: Acciones
            {
                data: null, orderable: false, className: 'all text-center', width: '100px',
                render: (data, type, row) => this._renderAcciones(row)
            },

            // Columna 3: Orden Trabajo
            {
                data: "OrdenTrabajo", className: "text-center",
                render: (data) => data ? `<span class="badge bg-primary badge-custom"><i class="bi bi-clipboard-data me-1"></i>${data}</span>` : ''
            },

            // Columna 4: Total Artículos
            {
                data: "TotalSolicitudes", className: "text-center",
                render: (data) => `<em class="text-muted"><i class="bi bi-box-seam me-1"></i>${data || 0}</em>`
            },

            // Columna 5: Total Cantidad
            {
                data: "TotalCantidad", className: "text-center",
                render: (data) => `<em class="text-muted"><i class="bi bi-boxes me-1"></i>${data || 0}</em>`
            },

            // Columna 6: Total Atendidas
            {
                data: "TotalAtendidas", className: "text-center",
                render: (data) => data && data > 0
                    ? `<span class="badge btn-ptm-primary badge-custom"><i class="bi bi-check-circle me-1"></i>${data}</span>`
                    : '<em class="text-muted"><i class="bi bi-check-circle me-1"></i>0</em>'
            },

            // Columna 7: Nivel Urgencia
            {
                data: "NivelUrgencia", className: "text-center",
                render: (data) => this._renderUrgencia(data)
            },

            // Columna 8: Fecha
            {
                data: null, className: "text-center",
                render: (data, type, row) => `<small class="text-muted"><i class="bi bi-calendar-event me-1"></i>${row.FechaPrimera || ''}</small>`
            },

            // Columna 9: Estatus
            {
                data: "Estatus", className: "all text-center",
                render: (data) => this._renderEstatus(data)
            },

            // Columna 10: Folio Compra
            {
                data: "FolioCompra", className: "text-center",
                render: (data) => data && data !== ''
                    ? `<span class="badge bg-primary badge-custom"><i class="bi bi-cash-stack me-1"></i>${data}</span>`
                    : '<em class="text-muted"><i class="bi bi-receipt me-1"></i>Sin OC</em>'
            },

            // Columna 11: Usuario Solicita
            {
                data: "UsuarioSolicita",
                render: (data) => data
                    ? `<span class="badge btn-ptm-mid badge-custom"><i class="bi bi-person-circle me-1"></i>${data}</span>`
                    : '<em class="text-muted"><i class="bi bi-person-x me-1"></i>N/A</em>'
            },

            // Columna 12: Usuario Atiende
            {
                data: "UsuarioAtiende",
                render: (data) => data
                    ? `<span class="badge btn-ptm-primary badge-custom"><i class="bi bi-person-check me-1"></i>${data}</span>`
                    : '<em class="text-muted"><i class="bi bi-person-dash me-1"></i>Sin asignar</em>'
            }
        ];
    }

    _getColumnDefsConfig() {
        return [
            { orderable: false, targets: [0, 1, 2] },
            { className: "text-center", targets: '_all' },
            // Prioridades responsive
            { responsivePriority: 1, targets: 0 },
            { responsivePriority: 2, targets: 1 },
            { responsivePriority: 3, targets: 2 },
            { responsivePriority: 4, targets: 8 },
            { responsivePriority: 5, targets: 9 },
            { responsivePriority: 6, targets: 3 },
            { responsivePriority: 7, targets: 4 },
            { responsivePriority: 8, targets: 5 },
            { responsivePriority: 9, targets: 6 },
            { responsivePriority: 10, targets: 7 },
            { responsivePriority: 11, targets: 10 },
            { responsivePriority: 12, targets: 11 },
        ];
    }

    _renderAcciones(row) {
        const ordenTrabajo = row.OrdenTrabajo || '';
        const estatus = row.Estatus || '';
        const solicita = row.UsuarioSolicita || '';
        const totalAtendidas = row.TotalAtendidas || 0;
        const esAdmin = true; // o basado en this.datos_usuario[0].TIPOUSUARIO

        const dataAttrs = `data-ordentrabajo="${ordenTrabajo}" data-estatus="${estatus}" data-solicita="${solicita}" data-totalatendidas="${totalAtendidas}"`;

        const btn = (color, cssClass, icon, tooltip, attrs = '') =>
            `<button class="btn btn-sm ${color} ${cssClass}" data-bs-toggle="tooltip" title="${tooltip}" ${attrs} ${dataAttrs}>
                <i class="bi bi-${icon}"></i>
            </button>`;

        const devolucionBtn = esAdmin && totalAtendidas > 0
            ? btn('btn-ptm-primary', 'btn-devolucion-mercancia', 'arrow-return-left', 'Generar Devolución de Mercancía')
            : '';

        const salidaBtn = esAdmin && estatus === 'Pendiente'
            ? btn('btn-ptm-mid', 'btn-salida-mercancia', 'box-arrow-up', 'Generar Salida de Mercancía')
            : '';

        return `${devolucionBtn}${salidaBtn}`;
    }

    _renderUrgencia(data) {
        if (!data) return '';

        const map = {
            'Normal': { class: 'btn-ptm-primary', icon: 'circle-fill' },
            'Urgente': { class: 'bg-warning text-dark', icon: 'exclamation-triangle-fill' },
            'Crítico': { class: 'bg-danger', icon: 'exclamation-octagon-fill' },
            'Critico': { class: 'bg-danger', icon: 'exclamation-octagon-fill' }
        };

        const cfg = map[data] || { class: 'bg-secondary', icon: 'circle' };
        return `<span class="badge ${cfg.class} badge-custom"><i class="bi bi-${cfg.icon} me-1"></i>${data}</span>`;
    }

    _renderEstatus(data) {
        if (!data) return '';

        const map = {
            'Pendiente': { icon: 'clock' },
            'Atendida': { icon: 'check-circle' },
            'Cancelado': { icon: 'x-circle' }
        };

        const cfg = map[data] || { icon: 'circle' };
        return `<span class="badge btn-ptm-primary badge-custom"><i class="bi bi-${cfg.icon} me-1"></i>${data}</span>`;
    }

    _configurarEventosDataTable() {
        // ✅ Select All
        $('#chkSelectAll').off('change').on('change', function () {
            const checked = $(this).is(':checked');
            $('#tablaSolicitudesRefacciones tbody .chk-solicitud').prop('checked', checked);
        });

        // ✅ Sync estado del chkSelectAll
        $('#tablaSolicitudesRefacciones tbody').off('change', '.chk-solicitud').on('change', '.chk-solicitud', () => {
            const total = $('#tablaSolicitudesRefacciones tbody .chk-solicitud').length;
            const seleccionados = $('#tablaSolicitudesRefacciones tbody .chk-solicitud:checked').length;
            $('#chkSelectAll').prop('checked', total === seleccionados);
            $('#chkSelectAll').prop('indeterminate', seleccionados > 0 && seleccionados < total);
        });

        // ✅ Reinicializar tooltips
        $('[data-bs-toggle="tooltip"]').tooltip();
    }
}

// ========================================
// GESTOR DE UI (CORREGIDO Y OPTIMIZADO)
// ========================================
class UIManager {

    // ========================================
    // INICIALIZACIÓN PRINCIPAL
    // ========================================

    static inicializarUI(datosUsuario) {
        // Configuración de navegación
        $("#SolicitudRefaccionesURL").addClass("selected-item");

        // Expandir contenedor padre
        $("#AlmacenContainer").addClass("selected");
        $("#AlmacenContainer a").addClass("whiteText");
        $("#almacen-collapse").addClass("show");

        // Configurar filtro de planta (readonly)
        $("#FiltroPlanta").val(datosUsuario.PLANTA);
        $("#FiltroPlanta").prop("disabled", true);

        // Inicializar tooltips
        this.inicializarTooltips();

        // Establecer fechas por defecto
        $('#FiltroFechaInicio').val(DateUtils.obtenerPrimerDiaMesActual());
        $('#FiltroFechaFin').val(DateUtils.obtenerUltimoDiaMesActual());
    }

    static inicializarTooltips() {
        // ✅ Versión más segura
        $('[data-bs-toggle="tooltip"]').each(function () {
            const tooltip = bootstrap.Tooltip.getInstance(this);
            if (tooltip) tooltip.dispose();
        });

        // Inicializar nuevos tooltips
        const tooltipTriggerList = [].slice.call(
            document.querySelectorAll('[data-bs-toggle="tooltip"]')
        );

        tooltipTriggerList.forEach((tooltipTriggerEl) => {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }

    // ========================================
    // AUTOCOMPLETADORES
    // ========================================

    static createAutoComplete(input, list, data, onSelect) {
        // ✅ Validar que existan los elementos
        if (!input.length || !list.length) {
            console.warn('Elementos de autocomplete no encontrados');
            return;
        }

        let timeout = null;

        input.on("input", function () {
            const val = this.value.toLowerCase();

            if (timeout) clearTimeout(timeout);

            timeout = setTimeout(() => {
                list.empty().addClass("d-none");

                if (!val || val.length < 1) return;

                const filtered = data.filter(x => x.toLowerCase().includes(val));

                if (filtered.length === 0) {
                    list.append(`<button type="button" class="list-group-item list-group-item-action text-muted">Sin resultados</button>`);
                } else {
                    filtered.forEach(item => {
                        list.append(`<button type="button" class="list-group-item list-group-item-action">${item}</button>`);
                    });
                }

                list.removeClass("d-none");
            }, 300);
        });

        list.on("click", "button", function () {
            input.val($(this).text());
            list.addClass("d-none");
            if (onSelect && typeof onSelect === 'function') {
                onSelect($(this).text());
            }
        });

        // ✅ Cerrar al hacer click fuera
        $(document).on('click', (e) => {
            if (!input.is(e.target) && !list.is(e.target) && !list.has(e.target).length) {
                list.addClass("d-none");
            }
        });
    }

    static createAutoCompleteAjax(input, list, url, onSelect, renderItem, idValor) {
        // ✅ Validar que existan los elementos
        if (!input.length || !list.length) {
            console.warn('Elementos de autocomplete no encontrados');
            return;
        }

        let timeout = null;
        let currentRequest = null;

        input.on("input", function () {
            const val = $(this).val().trim();

            list.empty().addClass("d-none");

            if (timeout) clearTimeout(timeout);

            timeout = setTimeout(() => {
                if (!val || val.length < 2) return;

                if (currentRequest) {
                    currentRequest.abort();
                }

                list.removeClass("d-none").html(`<div class="list-group-item text-muted">Buscando...</div>`);

                currentRequest = $.ajax({
                    url: url,
                    method: "GET",
                    data: { ParamB: `${val}%` },
                    success: function (response) {
                        list.empty();

                        let data = [];
                        try {
                            data = JSON.parse(response.Data);
                        } catch (e) {
                            console.error('Error parsing response:', e);
                            list.append(`<div class="list-group-item text-danger">Error al procesar datos</div>`);
                            return;
                        }

                        if (!data || data.length === 0) {
                            list.append(`<div class="list-group-item text-muted">Sin resultados</div>`);
                            return;
                        }

                        data.forEach(item => {
                            const content = renderItem && typeof renderItem === 'function'
                                ? renderItem(item)
                                : item[idValor] || JSON.stringify(item);

                            list.append(`
                                <button type="button" class="list-group-item list-group-item-action" 
                                        data-val='${item[idValor] || ''}' 
                                        data-item='${JSON.stringify(item).replace(/'/g, "&#39;")}'>
                                    ${content}
                                </button>
                            `);
                        });
                    },
                    error: function (xhr, status) {
                        if (status !== "abort") {
                            list.html(`<div class="list-group-item text-danger">Error al buscar</div>`);
                        }
                    }
                });

            }, 400);
        });

        list.on("click", "button", function () {
            const item = $(this).data("item");
            const text = $(this).data("val");

            input.val(text);
            list.addClass("d-none");

            if (onSelect && typeof onSelect === 'function') {
                onSelect(item, text);
            }
        });

        // ✅ Cerrar al hacer click fuera
        $(document).on('click', (e) => {
            if (!input.is(e.target) && !list.is(e.target) && !list.has(e.target).length) {
                list.addClass("d-none");
            }
        });
    }

    static createAutoCompleteCC(input, list, url, onSelect, renderItem, idValor) {
        // ✅ Similar a createAutoCompleteAjax pero con diferentes parámetros
        let timeout = null;
        let currentRequest = null;

        input.on("input", function () {
            const val = $(this).val().trim();

            list.empty().addClass("d-none");

            if (timeout) clearTimeout(timeout);

            timeout = setTimeout(() => {
                if (!val || val.length < 2) return;

                if (currentRequest) {
                    currentRequest.abort();
                }

                list.removeClass("d-none").html(`<div class="list-group-item text-muted">Buscando...</div>`);

                currentRequest = $.ajax({
                    url: url,
                    method: "GET",
                    data: { dimCode: `${val}%` },
                    success: function (response) {
                        list.empty();

                        let data = [];
                        try {
                            data = JSON.parse(response.Data);
                        } catch (e) {
                            console.error('Error parsing response:', e);
                            list.append(`<div class="list-group-item text-danger">Error al procesar datos</div>`);
                            return;
                        }

                        console.log("Centro Costos:", data);

                        if (!data || data.length === 0) {
                            list.append(`<div class="list-group-item text-muted">Sin resultados</div>`);
                            return;
                        }

                        data.forEach(item => {
                            const content = renderItem && typeof renderItem === 'function'
                                ? renderItem(item)
                                : item[idValor] || JSON.stringify(item);

                            list.append(`
                                <button type="button" class="list-group-item list-group-item-action" 
                                        data-val='${item[idValor] || ''}' 
                                        data-item='${JSON.stringify(item).replace(/'/g, "&#39;")}'>
                                    ${content}
                                </button>
                            `);
                        });
                    },
                    error: function (xhr, status) {
                        if (status !== "abort") {
                            list.html(`<div class="list-group-item text-danger">Error al buscar</div>`);
                        }
                    }
                });

            }, 400);
        });

        list.on("click", "button", function () {
            const item = $(this).data("item");
            const text = $(this).data("val");

            input.val(text);
            list.addClass("d-none");

            if (onSelect && typeof onSelect === 'function') {
                onSelect(item, text);
            }
        });

        // ✅ Cerrar al hacer click fuera
        $(document).on('click', (e) => {
            if (!input.is(e.target) && !list.is(e.target) && !list.has(e.target).length) {
                list.addClass("d-none");
            }
        });
    }
}


// ========================================
// GESTOR DE BADGES (CORREGIDO)
// ========================================
class BadgeManager {
    static obtenerUrgenciaBadgeColor(urgencia) {
        const colores = {
            'Normal': 'primary',
            'Urgente': 'warning',
            'Crítico': 'danger',
            'Critico': 'danger'
        };
        return colores[urgencia] || 'secondary';
    }

    static obtenerUrgenciaBadgeIcono(urgencia) {
        const iconos = {
            'Normal': 'circle-fill',
            'Urgente': 'exclamation-triangle-fill',
            'Crítico': 'exclamation-octagon-fill',
            'Critico': 'exclamation-octagon-fill'
        };
        return iconos[urgencia] || 'circle';
    }

    static obtenerEstatusBadgeColor(estatus) {
        const colores = {
            'Pendiente': 'info',
            'Autorizado': 'success',
            'Rechazado': 'warning',
            'En tránsito': 'warning',
            'Entregado': 'success',
            'Atendida': 'success',
            'Cancelado': 'secondary'
        };
        return colores[estatus] || 'secondary';
    }

    static obtenerEstatusBadgeIcono(estatus) {
        const iconos = {
            'Pendiente': 'clock',
            'Autorizado': 'check-circle',
            'Rechazado': 'x-circle',
            'En tránsito': 'truck',
            'Entregado': 'box-seam',
            'Atendida': 'check-circle',
            'Cancelado': 'x-circle'
        };
        return iconos[estatus] || 'circle';
    }

    static crearBadge(texto, tipo, variante = '') {
        const color = this.obtenerUrgenciaBadgeColor(tipo);
        const icono = this.obtenerUrgenciaBadgeIcono(tipo);
        const extraClass = variante || '';

        return `<span class="badge bg-${color} ${extraClass}">
                    <i class="bi bi-${icono} me-1"></i>${texto}
                </span>`;
    }
}


// ========================================
// INICIALIZACIÓN FINAL
// ========================================
$(document).ready(function () {
    // ✅ Esperar a que SignalR esté listo si es necesario
    const iniciarApp = () => {
        const app = new SolicitudRefaccionesApp();
        app.inicializar();

        // ✅ Exponer para debugging (solo desarrollo)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            window.debugApp = app;
        }

        // ✅ Inicializar header fijo si existe la función
        if (typeof HeaderFijoGlobalManager !== 'undefined' && HeaderFijoGlobalManager.crear) {
            HeaderFijoGlobalManager.crear(
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
        }
    };

    // ✅ Si SignalR ya está cargado, iniciar inmediatamente
    if (typeof $.connection !== 'undefined') {
        iniciarApp();
    } else {
        // ✅ Esperar a que SignalR cargue
        console.log('Esperando carga de SignalR...');
        const checkSignalR = setInterval(() => {
            if (typeof $.connection !== 'undefined') {
                clearInterval(checkSignalR);
                iniciarApp();
            }
        }, 100);

        // Timeout por si acaso
        setTimeout(() => {
            clearInterval(checkSignalR);
            if (typeof $.connection === 'undefined') {
                console.warn('SignalR no cargado, iniciando app sin SignalR');
                iniciarApp();
            }
        }, 5000);
    }
});



