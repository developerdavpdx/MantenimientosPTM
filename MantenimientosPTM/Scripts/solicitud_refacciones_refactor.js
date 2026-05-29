// ========================================
// APLICACIÓN PRINCIPAL
// ========================================
class SolicitudRefaccionesApp {
    constructor() {
        this.URLBase = "Almacen";
        this.datos_usuario = GlobalUtil.getDatosUsuario();
        this.solicitudIdCounter = 6;
        this.solicitudManager = new SolicitudManager(this.URLBase, this.datos_usuario);

        // Exponer globalmente para acceso externo
        window.AppSolicitudRefacciones = this;
    }

    inicializar() {
        UIManager.inicializarUI(this.datos_usuario[0]);
        this.solicitudManager.inicializar();
        this.configurarEventosFiltros();
        this.configurarEventos();
        this.initHubSolicitudRefacciones(); //Inicializar HUB solicitud refacciones

        console.log(this.datos_usuario);
        console.log('✅ Sistema de Solicitud de Refacciones inicializado correctamente');
    }

    configurarEventosFiltros() {
        // ✅ Cambio automático en fechas y planta (SIN FiltroOrdenTrabajo)
        $('#FiltroFechaInicio, #FiltroFechaFin, #FiltroPlanta, #FiltroNivelUrgencia').on('change', () => {
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

            if ($.fn.DataTable.isDataTable('#tablaSolicitudesRefacciones')) {
                $('#tablaSolicitudesRefacciones').DataTable().ajax.reload();
            } else {
                this.almacenManager.llenarSolicitudesRefacciones();
            }
        });

        // ✅ Orden de trabajo — solo al presionar Enter
        $('#FiltroOrdenTrabajo').on('keypress', (e) => {
            if (e.which === 13) {
                e.preventDefault();

                if ($.fn.DataTable.isDataTable('#tablaSolicitudesRefacciones')) {
                    $('#tablaSolicitudesRefacciones').DataTable().ajax.reload();
                } else {
                    this.almacenManager.llenarSolicitudesRefacciones();
                }
            }
        });

        // ✅ Botón Aplicar
        $('#btnAplicarFiltros').on('click', () => {
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

            if ($.fn.DataTable.isDataTable('#tablaSolicitudesRefacciones')) {
                $('#tablaSolicitudesRefacciones').DataTable().ajax.reload();
            } else {
                this.almacenManager.llenarSolicitudesRefacciones();
            }
        });

        // ✅ Botón Limpiar
        $('#btnLimpiarFiltros').on('click', () => {
            $('#FiltroOrdenTrabajo').val('');
            $('#FiltroFechaInicio').val('');
            $('#FiltroFechaFin').val('');
            $('#FiltroPlanta').val('');
            $('#FiltroNivelUrgencia').val('');

            if ($.fn.DataTable.isDataTable('#tablaSolicitudesRefacciones')) {
                $('#tablaSolicitudesRefacciones').DataTable().ajax.reload();
            } else {
                this.almacenManager.llenarSolicitudesRefacciones();
            }
        });

    }

    configurarEventos() {
        // Generar solicitud de compra
        $(document).on('click', '.btn-solicitud-compra', (e) => {
            this.solicitudManager.abrirModalSolicitudCompra($(e.currentTarget));
        });

        // Generar solicitud de compra con checkboxes
        $(document).on('click', '#btnGenerarSolicitudCompra', async () => {
            const checkedRows = $('#tablaSolicitudesRefacciones tbody .chk-solicitud:checked');

            if (checkedRows.length === 0) {
                AlertManager.mostrar('Debes seleccionar al menos una solicitud para continuar.', 'warning');
                return;
            }

            // Obtener OTs únicas de los checkboxes seleccionados
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
                // Obtener artículos de cada OT
                const todosArticulos = [];

                for (const ot of otsUnicas) {
                    const articulos = await this.solicitudManager.obtenerArticulosPorOT(ot);
                    // Filtrar solo los que están Pendientes
                    const pendientes = articulos.filter(art => art.ESTATUS === 'Pendiente');
                    todosArticulos.push(...pendientes);
                }

                if (todosArticulos.length === 0) {
                    AlertManager.mostrar('No hay artículos con estatus Pendiente en las órdenes de trabajo seleccionadas.', 'warning');
                    GlobalUtil.mostrarLoader(false);
                    return;
                }

                // Transformar al formato que espera el modal
                const solicitudesTransformadas = todosArticulos.map(art => ({
                    idSolicitud: art.ID_SOLICITUD,
                    ordenTrabajo: art.ORDEN_TRABAJO,
                    codigoRefaccion: art.REFACCION_SOLICITADA,
                    refaccion: art.NOMBRE_ARTICULO,
                    cantidad: art.CANTIDAD,
                    estatus: art.ESTATUS
                }));

                this.solicitudManager.abrirModalSolicitudCompra(solicitudesTransformadas);
            } catch (error) {
                console.error('Error al obtener artículos:', error);
                AlertManager.mostrar('Error al obtener los artículos de las órdenes de trabajo.', 'warning');
            } finally {
                GlobalUtil.mostrarLoader(false);
            }
        });

        // Guardar refacción
        $('#formSolicitudCompra').on('submit', (e) => this.solicitudManager.enviarSolicitudCompra(e));

        //Cambiar refacción
        $('#formIntercambiarRefaccionOT').on('submit', (e) => this.solicitudManager.CambiarRefaccionOT(e));

        // Guardar devolución de mercancía
        $('#btnGuardarDevolucion').on('click', () => this.solicitudManager.enviarDevolucion());


        $(document).on('click', '.btn-change-ref', (e) => {
            e.preventDefault();
            this.solicitudManager.IdSolicitudR = $(e.currentTarget).data('idsolicitud');
            $("#solicitarRefAlmModal").modal("show");
        });

        //Entrada de mercancía
        $(document).on('click', '.btn-entrada-mercancia', (e) => {
            //Limpiando Informacion de OC y lineas oc
            this.currentOC = {};
            this.currentDocLinesOC = {};

            this.solicitudManager.clearModal("#entradaMercancia");

            const id = $(e.currentTarget).data('id');
            const fila = $(`#tablaSolicitudesRefacciones tr:has(button[data-id="${id}"])`);


            const Solicitante = fila.find('td:eq(7)').text();
            $("#nombre").val(Solicitante);

            //Establecer fecha actual
            this.initDateInputsEM();

            $('#entradaMercancia').modal('show');

        })

        $("#SaveEM").on("click", () => {
            //Armar request

            let lineas = [];

            this.solicitudManager.currentDocLinesOC.forEach((e) => {
                let ob =
                {
                    NumeroLinea: e.Linea,
                    Cantidad: e.Cantidad,
                    PrecioUnitario: e.PrecioU
                };

                lineas.push(ob);
            });


            let payload = {
                DocEntryOrdenCompra: this.solicitudManager.currentOC.DocEntry,
                Lineas: lineas
            }

            console.log("Request:")
            console.log(payload);

            this.solicitudManager.postCreateEntradaMercancia(payload);
        })

        //Salida de mercancía
        $(document).on('click', '.btn-salida-mercancia', async (e) => {
            const $btn = $(e.currentTarget);
            const solicita = $btn.data('solicita');
            const ordenTrabajo = $btn.data('ordentrabajo');

            GlobalUtil.mostrarLoader(true);

            // Limpiar tablas y contadores
            $('#bodyArticulosSalida').html(`
                <tr>
                    <td colspan="7" class="text-center text-muted py-4">
                        <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                        Cargando artículos...
                    </td>
                </tr>
            `);
            $('#contadorSeleccionados').text('0');
            $('#badgeTotalArticulos').text('0');
            $('#chkSelAllArticulos').prop('checked', false);

            //this.llenarFirmas();

            this.solicitudManager.llenarFirmas();

            // Obtener datos necesarios en paralelo
            let [articulos, objDepSucursal, objLastSM, respS, salidas] = await Promise.all([
                this.solicitudManager.obtenerArticulosPorOT(ordenTrabajo),
                this.solicitudManager.getDepartamentoSucursalUser(solicita),
                this.solicitudManager.getLasSM(),
                this.solicitudManager.obtenerCentrosCostos(),
                this.solicitudManager.obtenerSalidasPorOrdenTrabajo(ordenTrabajo)
            ]);

            console.log(articulos);
            console.log(salidas);

            GlobalUtil.mostrarLoader(false);

            // Guardar datos del usuario para usarlos al generar las filas
            this.solicitudManager.datosUsuarioSalida = {
                dept: objDepSucursal.PrcCode,
                cedis: `C${objDepSucursal.Sucursal}`,
                nombre: objDepSucursal.Nombre
            };

            // Renderizar tabla de artículos
            this.solicitudManager.renderTablaArticulosSalida(articulos, salidas);

            // Generar folio
            let fol = (objLastSM.DocNum || 0) + 1;
            this.solicitudManager.setFolio(`SM-${fol}`);
            $("#numAjuste").val(fol);

            // Establecer fecha actual
            const hoy = new Date().toISOString().split('T')[0];
            $('#fechaDia').val(hoy);

            $('#solicitante').val(solicita);
            $("#titleSalidaMercancia").text("Entrega de Materiales");
            $("#btnRechazarDev").addClass("d-none");

            $("#btnGuardarVale").attr("operacion", "SALIDA");
            $("#btnGuardarVale").attr("ordentrabajo", ordenTrabajo);
            $("#btnGuardarVale").attr("solicita", solicita);

            $('#salidaMercancia').modal('show');
        });

        // Eventos para checkboxes de artículos
        $(document).on('change', '#chkSelAllArticulos', (e) => {
            const checked = $(e.currentTarget).is(':checked');
            $('#bodyArticulosSalida .chk-articuloSalida').prop('checked', checked);
            this.solicitudManager.actualizarContadorArticulos();
        });

        $(document).on('change', '.chk-articuloSalida', (e) => {
            const total = $('#bodyArticulosSalida .chk-articuloSalida').length;
            const seleccionados = $('#bodyArticulosSalida .chk-articuloSalida:checked').length;
            $('#chkSelAllArticulos').prop('checked', total > 0 && total === seleccionados);
            $('#chkSelAllArticulos').prop('indeterminate', seleccionados > 0 && seleccionados < total);
            this.solicitudManager.actualizarContadorArticulos();
        });

        //Devolución de mercancía - Nuevo flujo: obtener artículos atendidos de OTs seleccionadas
        $(document).on('click', '#btnGenerarDevolucion, .btn-devolucion-mercancia', async (e) => {
            const $btn = $(e.currentTarget);
            const ot = $btn.data('ordentrabajo');

            GlobalUtil.mostrarLoader(true);

            try {
                // Obtener artículos de cada OT y filtrar solo los atendidos
                const todosAtendidos = [];

                let [articulos, salidas] = await Promise.all([
                    this.solicitudManager.obtenerArticulosPorOT(ot),
                    this.solicitudManager.obtenerSalidasPorOrdenTrabajo(ot)
                ]);

                console.log(articulos);
                console.log(salidas);

                // Filtrar solo los que están Atendidos
                const atendidos = articulos.filter(art => art.ESTATUS === 'Atendida');
                todosAtendidos.push(...atendidos);

                console.log(todosAtendidos);

                if (todosAtendidos.length === 0) {
                    AlertManager.mostrar('No hay artículos con estatus Atendido en las órdenes de trabajo seleccionadas.', 'warning');
                    GlobalUtil.mostrarLoader(false);
                    return;
                }


                // Llenar el modal con los artículos atendidos
                this.solicitudManager.abrirModalDevolucion(todosAtendidos, salidas);

            } catch (error) {
                console.error('Error al obtener artículos atendidos:', error);
                AlertManager.mostrar('Error al obtener los artículos atendidos.', 'warning');
            } finally {
                GlobalUtil.mostrarLoader(false);
            }
        });

        $("#btnLimpiarVale , #btnCerrarVale").on("click", () => {
            this.solicitudManager.limpiarFormulario();
        });

        $("#btnGuardarVale").on("click", (e) => {
            const $btn = $(e.currentTarget);

            //MOSTRAR LOADER
            $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-1"></span>Guardando...');

            let operacion = $btn.attr("operacion");
            let ordenTrabajo = $btn.attr("ordentrabajo");

            //Validar campos requeridos
            const solicitante = $("#solicitante").val().trim();
            const numEmpleado = $("#numEmpleado").val().trim();
            const area = $("#area").val().trim();
            const entrega = $("#firmaAlmacen").val();
            const recibe = $("#firmaAutoriza").val();

            if (!solicitante || !numEmpleado || !area) {
                AlertManager.mostrar('Por favor complete los campos: Solicitante, Número de Empleado y Área.', 'warning');
                $btn.prop('disabled', false).html('<i class="bi bi-save me-1"></i>Guardar');
                return;
            }

            if (!entrega) {
                AlertManager.mostrar('Por favor seleccione el nombre del almacenista que entrega.', 'warning');
                $btn.prop('disabled', false).html('<i class="bi bi-save me-1"></i>Guardar');
                return;
            }

            // Validar que haya al menos un artículo seleccionado
            const articulosSeleccionados = [];
            $("#bodyArticulosSalida tr").each(function () {
                const $fila = $(this);
                const $chk = $fila.find('.chk-articuloSalida');

                if ($chk.is(':checked')) {
                    let objSalida = {
                        IdSolicitud: $chk.data('idsolicitud'),
                        ItemCode: $chk.data('codigo'),
                        Cantidad: $fila.find('.cantidadEditable').val(),
                        Departamento: $fila.find('input.departamento').val(),
                        Proceso: $fila.find('select.proceso').val(),
                        Gastos: $fila.find('select.gastos').val(),
                        Cedis: $fila.find('input.cedis').val(),
                        AddAlm: $chk.data('addalm')
                    };
                    articulosSeleccionados.push(objSalida);
                }
            });

            if (articulosSeleccionados.length === 0) {
                AlertManager.mostrar('Seleccione al menos un artículo para continuar.', 'warning');
                $btn.prop('disabled', false).html('<i class="bi bi-save me-1"></i>Guardar');
                return;
            }

            let infoForm = {
                Solicitante: solicitante,
                NumEmpleado: numEmpleado,
                Area: area,
                Entrega: entrega,
                Recibe: recibe,
            }

            let payload = {
                Planta: this.datos_usuario[0].PLANTA,
                Usuario: this.datos_usuario[0].EMAIL,
                IdEquipo: 1,
                IdMantenimiento: 1, //Pendiente pasar
                Referencia: ordenTrabajo,
                OrdenTrabajo: ordenTrabajo,
                Contabilizacion: articulosSeleccionados,
                DataMovimiento: infoForm,
                NombreEmpleado: solicitante,
                AlmacenistaEntrega: entrega
            };

            console.log("Request salida mercancia:", payload);

            if (operacion == "SALIDA") {
                this.solicitudManager.postCreateSalidaMercancia(payload);
            }
            else {
                this.solicitudManager.postEntradaDevolucionMercancia(payload);
            }
        });

        $("#btnRechazarDev").on("click", () => {
            $('#devolucionMercancia').modal('hide');

            //Mostrar modal de rechazo de mercancia
            $("#rechazoDevolucion").modal("show");
        });

        $('#rechazoDevolucion').on('show.bs.modal', function () {
            const uploader = $('#uploadArea').data('imageUploader');
            uploader?.clearAll();
        });

        $("#btnCancelarRech").on("click", () => {
            $("#rechazoDevolucion").modal("hide");
            $('#devolucionMercancia').modal('show');
        });

        $("#btnGuardarRech").on("click", () => {
            const $btn = $("#btnGuardarRech");
            $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-1"></span>Guardando...');

            // Validar motivo requerido
            const motivo = $("#motivoRech").val();
            if (!motivo) {
                AlertManager.mostrar('Por favor selecciona el motivo de rechazo.', 'warning');
                $btn.prop('disabled', false).html('<i class="bi bi-floppy-fill me-1"></i> Aceptar');
                return;
            }

            // Armar FormData
            const formData = new FormData();
            formData.append("Motivo", motivo);
            formData.append("Comentario", $("#CommentRech").val().trim());
            formData.append("IdSolicitud", $("#btnGuardarRech").attr("idsolicitud")); // si lo necesitas

            // Adjuntar imágenes
            if (window.imagenesRutina && window.imagenesRutina.length > 0) {
                window.imagenesRutina.forEach((file, index) => {
                    formData.append('files', file); // nombre consistente
                });
            }

            //console.log("Imágenes a enviar:", window.imagenesRutina); 


            $.ajax({
                url: `/${this.URLBase}/GuardarRechazoDevolucion`,
                type: "POST",
                data: formData,
                processData: false,  // ⚠️ obligatorio con FormData
                contentType: false,  // ⚠️ obligatorio con FormData
                success: (response) => {
                    if (response.Status === "OK") {
                        AlertManager.mostrar('Rechazo registrado correctamente.', 'success');
                        $("#rechazoDevolucion").modal("hide");
                        this.solicitudManager.clearModal("#rechazoDevolucion");
                        $('#tablaSolicitudesRefacciones').DataTable().ajax.reload(null, false);
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
        });
    }

    obtenerNuevoIdSolicitud() {
        return this.solicitudIdCounter++;
    }

    // ========================================
    // SIGNALR MANAGER - SOLICITUD REFACCIONES
    // ========================================
    initHubSolicitudRefacciones() {
        const self = this;
        const hub = $.connection.mantenimientoHub;
        let reconnectDelay = 5000;
        let modalActualizacion = null;

        const miRol = self.datos_usuario[0].TIPOUSUARIO;

        // ── Todos reciben el aviso excepto quien hizo el cambio ──
        const debeRecibirAviso = (rolQueCambio) => miRol !== rolQueCambio;

        // ── Inicializar modal una sola vez ──
        const $modalEl = document.getElementById('actualizacionRefaccionesModal');
        if ($modalEl) {
            modalActualizacion = new bootstrap.Modal($modalEl, { backdrop: 'static', keyboard: false });

            document.getElementById('btnConfirmarActualizacion')
                .addEventListener('click', function () {
                    modalActualizacion.hide();
                    self._recargarTablaSolicitudRefacciones();
                });
        }

        // ========================================
        // 📡 EVENTO PRINCIPAL
        // ========================================
        hub.client.actualizarTablaSolicitudRefacciones = function (rolQueCambio) {
            console.warn("📡 Actualización refacciones recibida desde SignalR | Origen:", rolQueCambio || "desconocido");

            // 🔥 Validar si este usuario debe recibir el aviso
            if (!debeRecibirAviso(rolQueCambio)) {
                console.info("🔕 Aviso ignorado — no corresponde a este rol:", miRol);
                return;
            }

            // 🔥 Evitar múltiples modales apilados
            if ($modalEl && $modalEl.classList.contains('show')) return;

            // 🔥 Evitar aviso si ya hay un reload en curso
            if (self._isReloadingRefacciones) return;

            modalActualizacion
                ? modalActualizacion.show()
                : self._recargarTablaSolicitudRefacciones();
        };

        // ========================================
        // 🚀 START HUB (con fallback controlado)
        // ========================================
        $.connection.hub.start({
            transport: ['webSockets', 'longPolling']
        }).done(function () {
            console.log("✅ SignalR Refacciones conectado | Rol:", miRol);
            console.log("🚚 Transporte:", $.connection.hub.transport.name);
        }).fail(function (error) {
            console.error("❌ Error al conectar SignalR Refacciones:", error);
        });

        // ========================================
        // 🔄 RECONNECTING
        // ========================================
        $.connection.hub.reconnecting(function () {
            console.warn("🔄 SignalR Refacciones reconectando...");
        });

        // ========================================
        // 🔁 RECONNECTED — recarga silenciosa
        // ========================================
        $.connection.hub.reconnected(function () {
            console.info("✅ SignalR Refacciones reconectado | Rol:", miRol);
            self._recargarTablaSolicitudRefacciones();
            reconnectDelay = 5000;
        });

        // ========================================
        // ❌ DISCONNECTED (retry exponencial)
        // ========================================
        $.connection.hub.disconnected(function () {
            console.error("❌ SignalR Refacciones desconectado");
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
    _recargarTablaSolicitudRefacciones() {

        $('.modal.show').modal('hide');

        if (this._isReloadingRefacciones) return;

        this._isReloadingRefacciones = true;

        if ($.fn.DataTable.isDataTable('#tablaSolicitudesRefacciones')) {
            $('#tablaSolicitudesRefacciones').DataTable().ajax.reload(() => {
                this._isReloadingRefacciones = false;
            }, false);
        } else {
            this.solicitudManager.llenarSolicitudesRefacciones();
            this._isReloadingRefacciones = false;
        }
    }

    initDateInputsEM() {
        this.setFechaActual('FechaCount');
        this.setFechaActual('FechaDoc');
    }

    setFechaActual(inputId) {
        const hoy = new Date();
        const año = hoy.getFullYear();
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        const dia = String(hoy.getDate()).padStart(2, '0');

        const fechaFormateada = `${año}-${mes}-${dia}`;

        $(`#${inputId}`).val(fechaFormateada);
    }
}

// ========================================
// GESTOR DE UI
// ========================================
class UIManager {
    static inicializarUI(datos_usuario) {
        // Configuración de navegación
        $("#SolicitudRefaccionesURL").addClass("selected-item");
        // Expandir contenedor padre
        $("#AlmacenContainer").addClass("selected");
        $("#AlmacenContainer a").addClass("whiteText");
        $("#almacen-collapse").addClass("show");

        $("#FiltroPlanta").val(datos_usuario.PLANTA);
        $("#FiltroPlanta").prop("disabled", true);

        // Inicializar tooltips
        this.inicializarTooltips();

        $('#FiltroFechaInicio').val(DateUtils.obtenerPrimerDiaMesActual());
        $('#FiltroFechaFin').val(DateUtils.obtenerUltimoDiaMesActual());
    }

    static inicializarTooltips() {
        const tooltipTriggerList = [].slice.call(
            document.querySelectorAll('[data-bs-toggle="tooltip"]')
        );
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }

    static createAutoComplete(input, list, data, onSelect) {
        input.on("input", function () {
            const val = this.value.toLowerCase();
            list.empty().addClass("d-none");

            if (!val) return;

            data.filter(x => x.toLowerCase().includes(val))
                .forEach(item => {
                    list.append(`<button type="button" class="list-group-item list-group-item-action">${item}</button>`);
                });

            list.removeClass("d-none");
        });

        list.on("click", "button", function () {
            input.val($(this).text());
            list.addClass("d-none");
            if (onSelect) onSelect($(this).text());
        });
    }

    static createAutoCompleteAjax(input, list, url, onSelect, renderItem, idValor) {
        let timeout = null;
        let currentRequest = null;

        input.on("input", function () {
            const val = $(this).val().trim();

            list.empty().addClass("d-none");

            if (timeout) clearTimeout(timeout);

            timeout = setTimeout(() => {
                if (!val) return;

                if (currentRequest) {
                    currentRequest.abort();
                }

                list.removeClass("d-none").html(`<div class="list-group-item">Buscando...</div>`);

                currentRequest = $.ajax({
                    url: url,
                    method: "GET",
                    data: { ParamB: `${val}%` },
                    success: function (response) {
                        list.empty();

                        let data = JSON.parse(response.Data);

                        if (!data || data.length === 0) {
                            list.append(`<div class="list-group-item">Sin resultados</div>`);
                            return;
                        }

                        data.forEach(item => {
                            const content = renderItem
                                ? renderItem(item)
                                : item;

                            list.append(`
                            <button type="button" class="list-group-item list-group-item-action" data-val='${item[idValor]}' data-item='${JSON.stringify(item)}'>
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

            }, 300);
        });

        list.on("click", "button", function () {
            const item = $(this).data("item");
            const text = $(this).data("val");

            input.val(text);
            list.addClass("d-none");

            if (onSelect) onSelect(item, text);
        });
    }

    static createAutoCompleteCC(input, list, url, onSelect, renderItem, idValor) {
        let timeout = null;
        let currentRequest = null;

        input.on("input", function () {
            const val = $(this).val().trim();

            list.empty().addClass("d-none");

            if (timeout) clearTimeout(timeout);

            timeout = setTimeout(() => {
                if (!val) return;

                if (currentRequest) {
                    currentRequest.abort();
                }

                list.removeClass("d-none").html(`<div class="list-group-item">Buscando...</div>`);

                currentRequest = $.ajax({
                    url: url,
                    method: "GET",
                    data: { dimCode: `${val}%` },
                    success: function (response) {
                        list.empty();

                        let data = JSON.parse(response.Data);

                        console.log("Centro Costos:");
                        console.log(data);

                        if (!data || data.length === 0) {
                            list.append(`<div class="list-group-item">Sin resultados</div>`);
                            return;
                        }

                        data.forEach(item => {
                            const content = renderItem
                                ? renderItem(item)
                                : item;

                            list.append(`
                            <button type="button" class="list-group-item list-group-item-action" data-val='${item[idValor]}' data-item='${JSON.stringify(item)}'>
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

            }, 300);
        });

        list.on("click", "button", function () {
            const item = $(this).data("item");
            const text = $(this).data("val");

            input.val(text);
            list.addClass("d-none");

            if (onSelect) onSelect(item, text);
        });
    }

}

// ========================================
// GESTOR DE SOLICITUDES
// ========================================
class SolicitudManager {
    constructor(URLBase, datos_usuario) {
        this.URLBase = URLBase;
        this.datos_usuario = datos_usuario;
        this.IdSolicitudR = "";
        this.OrdenTrabajo = "";
        this.otEquipos = {
            'OT-005': 'ENS-100',
            'OT-008': 'MEZ-850',
            'OT-012': 'HORNO-7G',
            'OT-018': 'ML-2200',
            'OT-022': 'CNC-789-XF',
            'OT-025': 'ROB-6AX',
            'OT-028': 'EMP-345'
        };
        this.nombresClientes = ["Juan Pérez", "María López", "Carlos Ramírez", "Ana Torres"];
        this.ordenesCompra = [
            {
                oc: "OC-1001",
                items: [
                    { articulo: "A-01", desc: "Tornillo", cant: 10, precio: 5 },
                    { articulo: "A-02", desc: "Tuerca", cant: 20, precio: 3 }
                ]
            },
            {
                oc: "OC-2002",
                items: [
                    { articulo: "B-01", desc: "Motor", cant: 1, precio: 1200 }
                ]
            }
        ];

        this.ListProcesos = [];
        this.ListGastos = [];
        this.currentOC = {};
        this.currentDocLinesOC = {};
        this.datosUsuarioSalida = {};
    }

    inicializar() {

        //Inicializar Autocomplets
        this.configurarEventosGestionArticulos()

        //Busqueda de articulos 
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
            this.datos_usuario// Grupos de articulos excluidos 104 -> Producto Terminado
        );

        // AUTO COMPLETE NOMBRES CLIENTES
        UIManager.createAutoComplete($("#nombre"), $("#acNombre"), this.nombresClientes);

        // AUTO COMPLETE ORDEN COMPRA
        UIManager.createAutoCompleteAjax(
            $("#ordenCompra"),
            $("#acOC"),
            `/${this.URLBase}/GetOrdenCompraFilter`,
            (item) => {
                console.log("Seleccionado:", item);

                $("#nombreProv").val(item.CardName);
                $("#codigoProv").val(item.CardCode);

                this.currentOC = item;

                //Peticion para obtener detalle de la OC
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

        this.llenarSolicitudesRefacciones();

        console.log('✅ SolicitudManager inicializado correctamente');
    }

    configurarEventosGestionArticulos() {
        // ✅ Input de búsqueda - usando nuevos IDs
        $('#BuscarArticuloMP').on('input', (e) => {
            const query = $(e.target).val().trim();
            if (query.length >= 2) {
                this.gestionArticulosMP.buscarArticulos(query, this.datos_usuario[0].EMAIL,0);
            } else {
                this.gestionArticulosMP.ocultarSugerencias();
            }
        });

        // ✅ Click fuera para cerrar sugerencias
        $(document).on('click', (e) => {
            if (!$(e.target).closest('#BuscarArticuloMP, #sugerenciasArticulosMP').length) {
                this.gestionArticulosMP.ocultarSugerencias();
            }
        });
    }

    async obtenerArticulosPorOT(ordenTrabajo) {
        try {

            const PLANTA = this.datos_usuario[0].PLANTA;

            const response = await $.ajax({
                url: `/${this.URLBase}/GetArticulosPorOrdenTrabajo`,
                method: 'GET',
                data: { ordenTrabajo: ordenTrabajo, planta: PLANTA },
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
                data: { ordenTrabajo: ordenTrabajo },
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

    async obtenerDevoPorOrdenTrabajo(ordenTrabajo) {
        try {
            const response = await $.ajax({
                url: `/${this.URLBase}/GetDevoPorOrdenTrabajo`,
                method: 'GET',
                data: { ordenTrabajo: ordenTrabajo },
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

    CambiarRefaccionOT(e) {

        e.preventDefault();

        $("#btnCargarRefacciones").html('<span class="spinner-border spinner-border-sm me-2"></span>Guardando...');
        $("#btnCargarRefacciones").prop("disabled", true);

        let articulos = this.gestionArticulosMP.obtenerArticulos();

        if (!articulos || articulos.length === 0) {
            AlertManager.mostrar('Debes seleccionar al menos un artículo para continuar.', 'warning', 'alertCambioRefaccionContainer');
            $('#badgeTotalArticulos').text('0');
            return;
        }

        $('#badgeTotalArticulos').text(articulos.length);

        // ✅ Recopilar los datos con múltiples artículos
        const Refaccion = {
            ID_SOLICITUD: this.IdSolicitudR,
            REFACCION_SOLICITADA: articulos[0].CodigoArticulo
        };

        let TipoUsuario = this.datos_usuario[0].TIPOUSUARIO;

        $.ajax({
            url: `/${this.URLBase}/ActualizarRefaccionOT`,
            type: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Rol-Usuario': TipoUsuario  // 👈 esto
            },
            contentType: 'application/json; charset=utf-8',
            data: JSON.stringify(Refaccion),
            dataType: 'json',
            success: (response) => {
                if (response.Status === 'SI') {
                    $("#btnCargarRefacciones").html('<i class="bi bi-check-circle-fill text-white me-2"></i>Solicitud generada correctamente');
                    $("#btnCargarRefacciones").prop("disabled", false);

                    // Limpiar formulario y tabla
                    $("#formSolicitarRefaccion")[0].reset();
                    $("#formSolicitarRefaccion").removeClass("was-validated");


                    // Recargar DataTable
                    $('#tablaSolicitudesRefacciones').DataTable().ajax.reload(null, false);

                    setTimeout(function () {
                        $("#btnCargarRefacciones").html('<i class="bi bi-save me-1"></i>Guardar');
                        $("#solicitarRefAlmModal").modal('hide');
                    }, 3000);

                } else {
                    $("#btnCargarRefacciones").html('<i class="bi bi-save me-1"></i>Guardar');
                    $("#btnCargarRefacciones").prop("disabled", false);
                    AlertManager.mostrar(response.Message || 'Error al realizar la solicitud de refacción', 'warning', "alertRefaccionContainer");
                }
            },
            error: (xhr, status, error) => {
                $("#btnCargarRefacciones").html('<i class="bi bi-save me-1"></i>Guardar');
                $("#btnCargarRefacciones").prop("disabled", false);
                AlertManager.mostrar('Error al conectar con el servidor', 'warning', "alertRefaccionContainer");
            }
        });
    }

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

        $('#badgeTotalArticulos').text(articulos.length);

        const procesoDefault = 'PCPVC';
        const gastosDefault = 'GIF';

        articulos.forEach((art, i) => {
            let {
                STOCK: Stock,
                NIVEL_URGENCIA: NivelUrgencia,
                ESTATUS: Estatus,
                NOMBRE_ARTICULO: NombreArticulo,
                REFACCION_SOLICITADA: RefaccionSolicitada,
                ID_SOLICITUD: IdSolicitud,
                CANTIDAD: Cantidad
            } = art;

            // ✅ Guardar la cantidad original ANTES de restar salidas
            const cantidadOriginal = Cantidad;

            const sa = salidas.find(s => s.ItemCode === RefaccionSolicitada);
            if (sa) {
                Cantidad -= sa.CantidadTotal;
                console.log('Salida de ese artículo:', sa);
            }

            // ✅ Evitar cantidad negativa o cero en el max del input
            const cantidadFinal = Math.max(Cantidad, 0);

            const urgenciaClass = NivelUrgencia === 'Critico' || NivelUrgencia === 'Crítico'
                ? 'bg-danger'
                : NivelUrgencia === 'Urgente'
                    ? 'bg-warning text-dark'
                    : 'bg-primary';

            const estatusClass = Estatus === 'Atendida'
                ? 'bg-success'
                : Estatus === 'Pendiente'
                    ? 'bg-warning text-dark'
                    : 'bg-primary';

            const urgenciaText = NivelUrgencia || 'N/A';
            const estatusText = Estatus || 'N/A';
            const nombreArticulo = NombreArticulo || RefaccionSolicitada || 'N/A';
            const isAtendida = Estatus === 'Atendida';

            let btnChangeRef = '';

            btnChangeRef = `
            <button class="btn btn-sm btn-ptm-edit btn-del-ref"
                        data-idsolicitud="${IdSolicitud}"
                        data-codigo="${RefaccionSolicitada || ''}"
                        data-nombre="${nombreArticulo}" data-bs-toggle="tooltip" data-bs-placement="top" title="❌ Eliminar refacción">
                    <i class="bi bi-x-circle fs-6"></i>
                </button>
            <button class="btn btn-sm btn-ptm-edit btn-change-ref"
                        data-idsolicitud="${IdSolicitud}"
                        data-codigo="${RefaccionSolicitada || ''}"
                        data-nombre="${nombreArticulo}" data-bs-toggle="tooltip" data-bs-placement="top" title="🔄 Cambiar refacción">
                    <i class="bi bi-arrow-repeat fs-6"></i>
                </button>`;

            tbody.append(`
            <tr class="${isAtendida ? 'table-success' : ''}">

                <td class="text-center align-middle">${i + 1}</td>

                <td class="text-center align-middle">
                    <input type="checkbox" class="form-check-input chk-articuloSalida"
                           data-idsolicitud="${IdSolicitud}"
                           data-codigo="${RefaccionSolicitada || ''}"
                           data-nombre="${nombreArticulo}"
                           data-cantidad="${cantidadFinal}"
                           data-cantidadoriginal="${cantidadOriginal}"
                           ${isAtendida ? 'disabled' : ''}>
                </td>

                <td class="text-center align-middle">
                    ${btnChangeRef}
                </td>

                <td class="text-center align-middle">
                    <span class="badge bg-dark">${RefaccionSolicitada || 'N/A'}</span>
                </td>

                <td class="align-middle">${nombreArticulo}</td>

                <td class="text-center align-middle">
                    <input type="number" min="1" max="${cantidadFinal}"
                           class="form-control form-control-sm text-center fw-bold cantidadEditable"
                           value="${cantidadFinal}"
                           ${isAtendida ? 'readonly' : ''}>
                </td>

                <td class="text-center align-middle">${Stock}</td>

                <td class="text-center align-middle">
                    <span class="badge ${urgenciaClass}">${urgenciaText}</span>
                </td>

                <td class="text-center align-middle">
                    <span class="badge ${estatusClass}">${estatusText}</span>
                </td>

                <td class="text-center align-middle">
                    <input type="text" class="form-control form-control-sm departamento text-center"
                           value="${this.datosUsuarioSalida.dept || ''}" readonly>
                </td>

                <td class="text-center align-middle">
                    <select class="form-select form-select-sm proceso">
                        ${this.buildOptions(this.ListProcesos, 'PrcCode', procesoDefault)}
                    </select>
                </td>

                <td class="text-center align-middle">
                    <select class="form-select form-select-sm gastos">
                        ${this.buildOptions(this.ListGastos, 'PrcCode', gastosDefault)}
                    </select>
                </td>

                <td class="text-center align-middle">
                    <input type="text" class="form-control form-control-sm cedis text-center"
                           value="${this.datosUsuarioSalida.cedis || ''}" readonly>
                </td>

                <td class="text-center align-middle">
                    <input type="text" class="form-control form-control-sm nombre_empleado text-center"
                           value="${this.datosUsuarioSalida.nombre || ''}">
                </td>

            </tr>
        `);
        });
    }

    buildOptions(list, key, selectedValue) {
        let options = '';
        list.forEach(item => {
            const selected = item[key] === selectedValue ? 'selected' : '';
            options += `<option value="${item[key]}" ${selected}>${item[key]}</option>`;
        });
        console.log("Centros Cosotos:");
        console.log(options);
        return options;
    }

    llenarSolicitudesRefacciones() {
        try {

            $('#filaVacia').remove();

            if ($.fn.DataTable.isDataTable('#tablaSolicitudesRefacciones')) {
                $('#tablaSolicitudesRefacciones').DataTable().destroy();
            }

            function calcularHeaderOffset() {
                if (window.innerWidth < 768) return 160;
                else if (window.innerWidth < 1400) return 150;
                else return 113;
            }

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
                        renderer: function (api, rowIdx, columns) {
                            var hiddenColumns = columns.filter(col => col.hidden);
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
                            }

                            var detallesHtml = '';
                            $.each(hiddenColumns, function (i, col) {
                                var iconClass = obtenerIcono(col.title);
                                var valueContent = col.data || '<em class="text-muted">Sin información</em>';
                                detallesHtml +=
                                    '<div class="row mb-3 py-2 border-bottom align-items-center">' +
                                    '  <div class="col-5">' +
                                    '    <i class="' + iconClass + ' me-2" style="font-size:1.3rem; color:#0D6EFD;"></i>' +
                                    '    <strong>' + col.title + '</strong>' +
                                    '  </div>' +
                                    '  <div class="col-7">' +
                                    '    <span class="badge px-3 py-2" style="background-color:#F2F2F2; color:#333;">' + valueContent + '</span>' +
                                    '  </div>' +
                                    '</div>';
                            });

                            return '<div class="card shadow-sm mt-3">' +
                                '  <div class="card-header bg-light">' +
                                '    <h5 class="mb-0"><i class="bi bi-tools me-2" style="color:#0D6EFD;"></i>Detalle de Solicitud</h5>' +
                                '  </div>' +
                                '  <div class="card-body">' + detallesHtml + '</div>' +
                                '  <div class="card-footer bg-light text-muted">' +
                                '    <small>Última actualización: ' + new Date().toLocaleDateString() + '</small>' +
                                '  </div>' +
                                '</div>';
                        }
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
                    dataSrc: function (json) {
                        return json.data;
                    }
                },
                columns: [
                    // 🎯 Columna 0: Control Responsive (+/-)
                    {
                        className: 'dtr-control',
                        orderable: false,
                        data: null,
                        defaultContent: '',
                        width: '30px'
                    },

                    // ✅ Columna 1: Checkbox selección
                    {
                        data: null,
                        orderable: false,
                        className: 'text-center all',
                        width: '40px',
                        render: (data, type, row) => {
                            return `<input type="checkbox"
                class="chk-solicitud form-check-input"
                data-ordentrabajo="${row.OrdenTrabajo || ''}"
                data-estatus="${row.Estatus || ''}"
                data-solicita="${row.UsuarioSolicita || ''}">`;
                        }
                    },

                    // ✅ Columna 2: Acciones
                    {
                        data: null,
                        orderable: false,
                        className: 'all text-center',
                        width: '100px',
                        render: (data, type, row) => {

                            const ordenTrabajo = row.OrdenTrabajo || '';
                            const estatus = row.Estatus || '';
                            const solicita = row.UsuarioSolicita || '';
                            const tipoUsuario = this.datos_usuario[0].TIPOUSUARIO;
                            const esAdmin = true;
                            const totalAtendidas = row.TotalAtendidas || 0;

                            const dataAttrs = `
                data-ordentrabajo="${ordenTrabajo}"
                data-estatus="${estatus}"
                data-solicita="${solicita}"
                data-totalatendidas="${totalAtendidas}"`;

                            const btn = (color, cssClass, icon, tooltip, attrs = '') =>
                                `<button class="btn btn-sm ${color} ${cssClass}"
                    data-bs-toggle="tooltip"
                    title="${tooltip}" ${attrs}>
                    <i class="bi bi-${icon}"></i>
                </button>`;

                            const btnDisabled = (color, icon, tooltip) =>
                                btn(color, '', icon, tooltip)
                                    .replace('<button', '<button disabled');

                            const devolucionMercanciaBtn = esAdmin
                                ? (totalAtendidas > 0
                                    ? btn(
                                        'btn-ptm-primary',
                                        'btn-devolucion-mercancia',
                                        'arrow-return-left',
                                        'Generar Devolución de Mercancía',
                                        dataAttrs
                                    )
                                    : btnDisabled(
                                        'bg-secondary',
                                        'arrow-return-left',
                                        'Generar Devolución de Mercancía'
                                    ))
                                : '';

                            const salidaMercanciaBtn = esAdmin
                                ? (estatus === 'Pendiente'
                                    ? btn(
                                        'btn-ptm-mid',
                                        'btn-salida-mercancia',
                                        'box-arrow-up',
                                        'Generar Salida de Mercancía',
                                        dataAttrs
                                    )
                                    : btnDisabled(
                                        'bg-secondary',
                                        'box-arrow-up',
                                        'Generar Salida de Mercancía'
                                    ))
                                : '';

                            return `${devolucionMercanciaBtn}${salidaMercanciaBtn}`;
                        }
                    },

                    // ✅ Columna 3: Orden Trabajo
                    {
                        data: "OrdenTrabajo",
                        className: "text-center",
                        render: (data) =>
                            data
                                ? `<span class="badge bg-primary badge-custom">
                    <i class="bi bi-clipboard-data me-1"></i>${data}
                </span>`
                                : ''
                    },

                    // ✅ Columna 4: Total Artículos
                    {
                        data: "TotalSolicitudes",
                        className: "text-center",
                        render: (data) => {

                            if (!data) {
                                return '<em class="text-muted"><i class="bi bi-box-seam me-1"></i>0</em>';
                            }

                            return `<em class="text-muted">
                <i class="bi bi-box-seam me-1"></i>${data}
            </em>`;
                        }
                    },

                    // ✅ Columna 5: Total Cantidad
                    {
                        data: "TotalCantidad",
                        className: "text-center",
                        render: (data) => {

                            if (!data) {
                                return '<em class="text-muted"><i class="bi bi-boxes me-1"></i>0</em>';
                            }

                            return `<em class="text-muted">
                <i class="bi bi-boxes me-1"></i>${data}
            </em>`;
                        }
                    },

                    // ✅ Columna 6: Total Atendidas
                    {
                        data: "TotalAtendidas",
                        className: "text-center",
                        render: (data) => {

                            if (!data || data === 0) {
                                return '<em class="text-muted"><i class="bi bi-check-circle me-1"></i>0</em>';
                            }

                            return `<span class="badge btn-ptm-primary badge-custom">
                <i class="bi bi-check-circle me-1"></i>${data}
            </span>`;
                        }
                    },

                    // ✅ Columna 7: Nivel Urgencia
                    {
                        data: "NivelUrgencia",
                        className: "text-center",
                        render: (data) => {

                            if (!data) return '';

                            switch (data) {

                                case 'Normal':
                                    return `<span class="badge btn-ptm-primary badge-custom">
                        <i class="bi bi-circle-fill me-1"></i>Normal
                    </span>`;

                                case 'Urgente':
                                    return `<span class="badge bg-warning text-dark badge-custom">
                        <i class="bi bi-exclamation-triangle-fill me-1"></i>Urgente
                    </span>`;

                                case 'Crítico':
                                case 'Critico':
                                    return `<span class="badge bg-danger badge-custom">
                        <i class="bi bi-exclamation-octagon-fill me-1"></i>Crítico
                    </span>`;

                                default:
                                    return `<span class="badge bg-secondary badge-custom">
                        ${data}
                    </span>`;
                            }
                        }
                    },

                    // ✅ Columna 8: Fechas
                    {
                        data: null,
                        className: "text-center",
                        render: (data, type, row) => {

                            return `<small class="text-muted">
                            <i class="bi bi-calendar-event me-1"></i>
                            ${row.FechaPrimera || ''}
                        </small>`;
                        }
                    },

                    // ✅ Columna 9: Estatus
                    {
                        data: "Estatus",
                        className: "all text-center",
                        render: (data) => {

                            if (!data) return '';

                            const map = {
                                'Pendiente': {
                                    icon: 'clock'
                                },
                                'Atendida': {
                                    icon: 'check-circle'
                                },
                                'Cancelado': {
                                    icon: 'x-circle'
                                }
                            };

                            const cfg = map[data] || {
                                icon: 'circle'
                            };

                            return `<span class="badge btn-ptm-primary badge-custom">
                <i class="bi bi-${cfg.icon} me-1"></i>${data}
            </span>`;
                        }
                    },

                    // ✅ Columna 10: Folio Compra
                    {
                        data: "FolioCompra",
                        className: "text-center",
                        render: (data) => {

                            if (!data || data === '') {
                                return '<em class="text-muted"><i class="bi bi-receipt me-1"></i>Sin OC</em>';
                            }

                            return `<span class="badge bg-primary badge-custom">
                <i class="bi bi-cash-stack me-1"></i>${data}
            </span>`;
                        }
                    },

                    // ✅ Columna 11: Usuario Solicita
                    {
                        data: "UsuarioSolicita",
                        render: (data) =>
                            data
                                ? `<span class="badge btn-ptm-mid badge-custom">
                    <i class="bi bi-person-circle me-1"></i>${data}
                </span>`
                                : '<em class="text-muted"><i class="bi bi-person-x me-1"></i>N/A</em>'
                    },

                    // ✅ Columna 12: Usuario Atiende
                    {
                        data: "UsuarioAtiende",
                        render: (data) =>
                            data
                                ? `<span class="badge btn-ptm-primary badge-custom">
                    <i class="bi bi-person-check me-1"></i>${data}
                </span>`
                                : '<em class="text-muted"><i class="bi bi-person-dash me-1"></i>Sin asignar</em>'
                    }
                ],
                columnDefs: [
                    { orderable: false, targets: [0, 1, 2] },
                    { className: "text-center", targets: '_all' },

                    // 🎯 Prioridades Responsive
                    { responsivePriority: 1, targets: 0 },  // Control +/-
                    { responsivePriority: 2, targets: 1 },  // Checkbox
                    { responsivePriority: 3, targets: 2 },  // Acciones
                    { responsivePriority: 4, targets: 8 },  // Estatus
                    { responsivePriority: 5, targets: 9 },  // Folio Compra
                    { responsivePriority: 6, targets: 3 },  // Orden Trabajo
                    { responsivePriority: 7, targets: 4 },  // Total Artículos
                    { responsivePriority: 8, targets: 5 },  // Total Cantidad
                    { responsivePriority: 9, targets: 6 },  // Nivel Urgencia
                    { responsivePriority: 10, targets: 7 },  // Fechas
                    { responsivePriority: 11, targets: 10 },  // Usuario Solicita
                    { responsivePriority: 12, targets: 11 },  // Usuario Atiende
                ],
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
                createdRow: function (row, data, dataIndex) {
                    $(row).attr('data-orden-trabajo', data.OrdenTrabajo);
                    $(row).attr('data-estatus', data.Estatus);
                },
                drawCallback: function () {
                    table.columns.adjust();

                    // ✅ Select All
                    $('#chkSelectAll').off('change').on('change', function () {
                        const checked = $(this).is(':checked');
                        $('#tablaSolicitudesRefacciones tbody .chk-solicitud').prop('checked', checked);
                    });

                    // ✅ Sync estado del chkSelectAll al marcar/desmarcar individualmente
                    $('#tablaSolicitudesRefacciones tbody').off('change', '.chk-solicitud').on('change', '.chk-solicitud', function () {
                        const total = $('#tablaSolicitudesRefacciones tbody .chk-solicitud').length;
                        const seleccionados = $('#tablaSolicitudesRefacciones tbody .chk-solicitud:checked').length;
                        $('#chkSelectAll').prop('checked', total === seleccionados);
                        $('#chkSelectAll').prop('indeterminate', seleccionados > 0 && seleccionados < total);
                    });
                }
            });

            $(window).on('resize', function () {
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

    // ============================
    // SOLICITUD COMPRA
    // ============================
    abrirModalSolicitudCompra(solicitudes) {
        this.solicitudesSeleccionadas = solicitudes;

        // ⬅️ Contador en el subtitle del header
        $('#modalSolicitudCompraTitulo').text('Generar Solicitud de Compra');
        $('.modal-subtitle-custom').html(
            `<i class="bi bi-list-check me-1"></i> 
         <strong>${solicitudes.length}</strong> artículo(s) con estatus Pendiente`
        );

        const tbody = $('#bodySeleccionadas');
        tbody.empty();

        solicitudes.forEach((s, i) => {
            tbody.append(`
            <tr>
                <td class="text-center">
                    <input type="checkbox" class="form-check-input chk-solicitud-sc" checked>
                </td>
                <td class="text-center">
                    <span class="badge bg-blue-ptm badge-custom">${s.ordenTrabajo || 'N/A'}</span>
                </td>
                <td class="text-center">
                    <small class="text-muted fw-semibold">${s.codigoRefaccion || 'N/A'}</small>
                </td>
                <td>${s.refaccion || 'N/A'}</td>
                <td class="text-center fw-semibold">${s.cantidad || 0}</td>
                <td class="text-center">
                    <input type="number"
                        class="form-control form-control-sm cant-encargar text-center"
                        min="1"
                        max="${s.cantidad}"
                        value="${s.cantidad}"
                        data-idsolicitud="${s.idSolicitud}"
                        data-ordentrabajo="${s.ordenTrabajo || ''}"
                        data-codigorefaccion="${s.codigoRefaccion || ''}"
                        data-refaccion="${s.refaccion || ''}"
                        data-cantidad="${s.cantidad}"
                        data-index="${i}"
                        required>
                </td>
            </tr>
        `);
        });

        // ✅ Agregar lógica para "Seleccionar todos"
        $('#chkSelectAllSC').prop('checked', true);

        $('#chkSelectAllSC').off('change').on('change', function () {
            const checked = $(this).prop('checked');
            $('.chk-solicitud-sc').prop('checked', checked);
            $('.cant-encargar').prop('disabled', !checked);
        });

        // ✅ Cuando se desmarca una fila, desmarcar "Seleccionar todos"
        $(document).off('change', '.chk-solicitud-sc').on('change', '.chk-solicitud-sc', function () {
            const totalChk = $('.chk-solicitud-sc').length;
            const checkedChk = $('.chk-solicitud-sc:checked').length;
            $('#chkSelectAllSC').prop('checked', totalChk === checkedChk);
            $('#chkSelectAllSC').prop('indeterminate', checkedChk > 0 && checkedChk < totalChk);

            // Habilitar/deshabilitar input de cantidad según checkbox
            const $row = $(this).closest('tr');
            const $input = $row.find('.cant-encargar');
            $input.prop('disabled', !$(this).prop('checked'));
        });

        // Por defecto deshabilitar los que no están seleccionados
        $('.chk-solicitud-sc').each(function () {
            if (!$(this).prop('checked')) {
                $(this).closest('tr').find('.cant-encargar').prop('disabled', true);
            }
        });

        $('#ComentariosSC').val('');
        $('#formSolicitudCompra').removeClass('was-validated');
        $('#alertSolicitudCompraContainer').empty();

        $('#solicitudCompra').modal('show');
    }

    enviarSolicitudCompra(e) {
        e.preventDefault();

        // Validar que haya al menos una fila seleccionada
        const checkedRows = $('.chk-solicitud-sc:checked');
        if (checkedRows.length === 0) {
            AlertManager.mostrar('Debes seleccionar al menos un artículo para continuar.', 'warning', 'alertSolicitudCompraContainer');
            return false;
        }

        // Validar que las cantidades de las filas seleccionadas estén llenas y sean válidas
        let cantidadesValidas = true;
        checkedRows.each(function () {
            const $input = $(this).closest('tr').find('.cant-encargar');
            const val = parseInt($input.val());
            if (!val || val < 1) {
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

        if (!$('#ComentariosSC').val().trim()) {
            AlertManager.mostrar('Por favor, ingresa un comentario.', 'warning', 'alertSolicitudCompraContainer');
            return false;
        }

        // Armar array de solicitudes SOLO con los artículos seleccionados
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
            Comentarios: $('#ComentariosSC').val(),
            UsuarioSolicita: this.datos_usuario[0].EMAIL
        };

        $("#btnGuardarSC").html('<span class="spinner-border spinner-border-sm me-2"></span>Guardando...');
        $("#btnGuardarSC").prop("disabled", true);

        $.ajax({
            url: `/${this.URLBase}/InsertarSolicitudOrdenCompraMP`,
            type: 'POST',
            contentType: 'application/json; charset=utf-8',
            data: JSON.stringify(datos),
            dataType: 'json',
            success: (response) => {
                if (response.Status === 'SI' || response.Status === 'PARCIAL') {
                    const color = response.Status === 'SI' ? 'check-circle-fill' : 'exclamation-triangle-fill';
                    AlertManager.mostrar(`${response.Message}`, 'success', 'alertSolicitudCompraContainer');
                    $("#btnGuardarSC").prop("disabled", false);

                    $("#formSolicitudCompra")[0].reset();
                    $("#formSolicitudCompra").removeClass("was-validated");
                    $("#btnGuardarSC").html('<i class="bi bi-check-circle-fill me-2 text-white"></i>Guardado');
                    $('#tablaSolicitudesRefacciones tbody .chk-solicitud').prop('checked', false);
                    $('#chkSelectAll').prop('checked', false).prop('indeterminate', false);
                    $('#tablaSolicitudesRefacciones').DataTable().ajax.reload(null, false);

                    setTimeout(() => {
                        $("#btnGuardarSC").html('<i class="bi bi-floppy-fill me-1"></i> Guardar');
                        $("#solicitudCompra").modal('hide');
                    }, 3000);
                } else {
                    // ...mismo manejo de error
                }
            },
            error: () => {
                $("#btnGuardarSC").html('<i class="bi bi-floppy-fill me-1"></i> Guardar');
                $("#btnGuardarSC").prop("disabled", false);
                AlertManager.mostrar('Error al conectar con el servidor', 'warning', 'alertSolicitudCompraContainer');
            }
        });
    }
    // ============================
    // UTILIDADES
    // ============================

    // ============================
    // DEVOLUCIÓN DE MERCANCÍA
    // ============================
    abrirModalDevolucion(articulosAtendidos, salidas = []) {
        this.articulosAtendidos = articulosAtendidos;

        $('#badgeTotalDevolucion').text(articulosAtendidos.length);

        const tbody = $('#bodyArticulosDevolucion');
        tbody.empty();

        articulosAtendidos.forEach((art, i) => {

            let sa = salidas.find((s) => (s.ItemCode == art.REFACCION_SOLICITADA));
            let cantS = art.CANTIDAD;

            if (sa) cantS = sa.CantidadTotal;


            tbody.append(`
            <tr>
                <td class="text-center">${i + 1}</td>
                <td class="text-center">
                    <input type="checkbox" class="form-check-input chk-articulo-devolucion" checked>
                </td>
                <td class="text-center">
                    <span class="badge bg-blue-ptm badge-custom">${art.ORDEN_TRABAJO || 'N/A'}</span>
                </td>
                <td class="text-center">
                    <small class="text-muted fw-semibold">${art.REFACCION_SOLICITADA || 'N/A'}</small>
                </td>
                <td>${art.NOMBRE_ARTICULO || 'N/A'}</td>
                <td class="text-center fw-semibold">${cantS || 0}</td>
                <td class="text-center">
                    <input type="number"
                        class="form-control form-control-sm cant-devolver text-center"
                        min="1"
                        max="${cantS}"
                        value="${cantS}"
                        data-idsolicitud="${art.ID_SOLICITUD}"
                        data-ordentrabajo="${art.ORDEN_TRABAJO || ''}"
                        data-codigo="${art.REFACCION_SOLICITADA || ''}"
                        data-articulo="${art.NOMBRE_ARTICULO || ''}"
                        data-cantidadatendida="${cantS}"
                        required>
                </td>
                <td class="text-center fw-semibold ocrCode1">${sa.OcrCode || ''}</td>
                <td class="text-center fw-semibold ocrCode2">${sa.OcrCode2 || ''}</td>
                <td class="text-center fw-semibold ocrCode3">${sa.OcrCode3 || ''}</td>
                <td class="text-center fw-semibold ocrCode4">${sa.OcrCode4 || ''}</td>

            </tr>
            `);
        });

        // Inicializar contador
        this.actualizarContadorDevolucion();

        // ✅ Lógica "Seleccionar todos"
        $('#chkSelAllDevolucion').prop('checked', true);

        $('#chkSelAllDevolucion').off('change').on('change', function () {
            const checked = $(this).prop('checked');
            $('.chk-articulo-devolucion').prop('checked', checked);
            $('.cant-devolver').prop('disabled', !checked);
        });

        // ✅ Cuando se desmarca una fila, desmarcar "Seleccionar todos"
        $(document).off('change', '.chk-articulo-devolucion').on('change', '.chk-articulo-devolucion', function () {
            const totalChk = $('.chk-articulo-devolucion').length;
            const checkedChk = $('.chk-articulo-devolucion:checked').length;
            $('#chkSelAllDevolucion').prop('checked', totalChk === checkedChk);
            $('#chkSelAllDevolucion').prop('indeterminate', checkedChk > 0 && checkedChk < totalChk);

            // Habilitar/deshabilitar input de cantidad según checkbox
            const $row = $(this).closest('tr');
            const $input = $row.find('.cant-devolver');
            $input.prop('disabled', !$(this).prop('checked'));

            // Actualizar contador
            $('#contadorDevolucion').text(checkedChk);
        });

        // Por defecto deshabilitar los que no están seleccionados
        $('.chk-articulo-devolucion').each(function () {
            if (!$(this).prop('checked')) {
                $(this).closest('tr').find('.cant-devolver').prop('disabled', true);
            }
        });

        // ✅ Inicializar firmas
        this.llenarFirmas();

        // Limpiar campos
        $('#devolucionSolicitante').val('');
        $('#devolucionNumEmpleado').val('');
        $('#devolucionArea').val('');
        $('#formDevolucionMercancia').removeClass('was-validated');
        $('#alertDevolucionContainer').empty();

        $('#devolucionMercancia').modal('show');
    }

    actualizarContadorDevolucion() {
        const total = $('.chk-articulo-devolucion').length;
        const seleccionados = $('.chk-articulo-devolucion:checked').length;
        $('#contadorDevolucion').text(seleccionados);
        $('#chkSelAllDevolucion').prop('checked', total > 0 && total === seleccionados);
        $('#chkSelAllDevolucion').prop('indeterminate', seleccionados > 0 && seleccionados < total);
    }

    enviarDevolucion() {
        // Validar que haya al menos una fila seleccionada
        const checkedRows = $('.chk-articulo-devolucion:checked');
        if (checkedRows.length === 0) {
            AlertManager.mostrar('Debes seleccionar al menos un artículo para continuar.', 'warning', 'alertDevolucionContainer');
            return false;
        }

        // Validar campos requeridos
        const solicitante = $('#devolucionSolicitante').val().trim();
        const numEmpleado = $('#devolucionNumEmpleado').val().trim();
        const area = $('#devolucionArea').val().trim();
        const entrega = $('#devolucionEntrega').val();
        const recibe = $('#devolucionRecibe').val();

        if (!solicitante || !numEmpleado || !area || !entrega || !recibe) {
            AlertManager.mostrar('Por favor, complete todos los campos requeridos.', 'warning', 'alertDevolucionContainer');
            return false;
        }

        // Validar que las cantidades de las filas seleccionadas estén llenas y sean válidas
        let cantidadesValidas = true;
        checkedRows.each(function () {
            const $input = $(this).closest('tr').find('.cant-devolver');
            const val = parseInt($input.val());
            if (!val || val < 1) {
                $input.addClass('is-invalid');
                cantidadesValidas = false;
            } else {
                $input.removeClass('is-invalid');
            }
        });

        if (!cantidadesValidas) {
            AlertManager.mostrar('Por favor, capture la cantidad a devolver en todas las filas seleccionadas.', 'warning', 'alertDevolucionContainer');
            return false;
        }

        // Armar array de artículos a devolver
        const articulos = [];
        checkedRows.each(function () {
            const $row = $(this).closest('tr');
            const $input = $row.find('.cant-devolver');
            articulos.push({
                IdSolicitud: $input.data('idsolicitud'),
                OrdenTrabajo: $input.data('ordentrabajo'),
                Codigo: $input.data('codigo'),
                Articulo: $input.data('articulo'),
                CantidadAtendida: $input.data('cantidadatendida'),
                CantidadDevolver: parseInt($input.val()),
                Departamento: $row.find('.ocrCode1').text().trim(),
                Proceso: $row.find('.ocrCode2').text().trim(),
                Gastos: $row.find('.ocrCode3').text().trim(),
                Cedis: $row.find('.ocrCode4').text().trim(),
            });
        });

        // Agrupar por Orden de Trabajo para obtener las dimensiones
        const otsUnicas = [...new Set(articulos.map(a => a.OrdenTrabajo))];

        // Por cada OT, obtener la información de la salida (dimensiones)
        const payload = {
            articulos: articulos,
            DataMovimiento: {
                Solicitante: solicitante,
                NumEmpleado: numEmpleado,
                Area: area,
                Entrega: entrega,
                Recibe: recibe
            },
            Referencia: otsUnicas.join(','), // Usar las OTs como referencia
            OrdenTrabajo: otsUnicas[0] || '' // Por ahora usar la primera OT
        };

        $("#btnGuardarDevolucion").html('<span class="spinner-border spinner-border-sm me-2"></span>Guardando...');
        $("#btnGuardarDevolucion").prop("disabled", true);

        $.ajax({
            url: `/${this.URLBase}/GenerarDevolucionMercancia`,
            type: 'POST',
            contentType: 'application/json; charset=utf-8',
            data: JSON.stringify(payload),
            dataType: 'json',
            success: (response) => {
                if (response.Status === 'OK') {
                    AlertManager.mostrar('Devolución de mercancía guardada correctamente.', 'success', 'alertDevolucionContainer');
                    $("#btnGuardarDevolucion").prop("disabled", false);
                    $("#btnGuardarDevolucion").html('<i class="bi bi-check-circle-fill me-2 text-white"></i>Guardado');

                    $('#tablaSolicitudesRefacciones').DataTable().ajax.reload(null, false);

                    setTimeout(() => {
                        $("#btnGuardarDevolucion").html('<i class="bi bi-floppy-fill me-1"></i> Guardar');
                        $("#devolucionMercancia").modal('hide');
                    }, 3000);
                } else {
                    AlertManager.mostrar(response.Message || 'Error al guardar la devolución.', 'warning', 'alertDevolucionContainer');
                    $("#btnGuardarDevolucion").prop("disabled", false);
                    $("#btnGuardarDevolucion").html('<i class="bi bi-floppy-fill me-1"></i> Guardar');
                }
            },
            error: () => {
                AlertManager.mostrar('Error al conectar con el servidor', 'warning', 'alertDevolucionContainer');
                $("#btnGuardarDevolucion").prop("disabled", false);
                $("#btnGuardarDevolucion").html('<i class="bi bi-floppy-fill me-1"></i> Guardar');
            }
        });
    }

    obtenerEquipoPorOT(ot) {
        return this.otEquipos[ot] || '';
    }

    llenarTablaOC(items) {

        console.log(items);
        const tbody = $("#tablaArticulos tbody");
        tbody.empty();

        items.forEach((it, i) => {

            let { Linea, NArticulo, Descripcion, Detalles,
                Cantidad, PrecioU, PorDesc, IVAImporte,
                Total, Almacen, Departamento, Proceso,
                Gastos, Cedes, CodOp, Unidad, ArtUnidad,
                FolioFact, Lote
            } = it;

            tbody.append(`
            <tr>
                <td class="text-center">${Linea}</td>
                <td><i class="bi bi-arrow-right-short"></i>${NArticulo}</td>
                <td>${Descripcion}</td>
                <td>${Detalles}</td>
                <td>${Cantidad}</td>
                <td>${PrecioU}</td>
                <td>${PorDesc}</td>
                <td>${IVAImporte}</td>
                <td>${Total}</td>
                <td>${Almacen}</td>
                <td class="sap-yellow">${Departamento}</td>
                <td class="sap-yellow">${Proceso}</td>
                <td class="sap-yellow">${Gastos}</td>
                <td class="sap-yellow">${Cedes}</td>
                <td>${CodOp}</td>
                <td>${Unidad}</td>
                <td>${ArtUnidad}</td>
                <td class="sap-yellow">${FolioFact}</td>
                <td>${Lote}</td>
            </tr>
        `);
        });
    }

    clearModal(modal) {
        const $modal = $(modal);

        // 1. Limpiar inputs, textareas, selects
        $modal.find('input, textarea, select').each(function () {
            const $el = $(this);

            if ($el.is(':checkbox') || $el.is(':radio')) {
                $el.prop('checked', false);
            } else if ($el.is('select')) {
                $el.prop('selectedIndex', 0);
            } else if (!$el.prop('readonly')) {
                $el.val('');
            }
        });

        // 2. Limpiar autocompletes (listas)
        $modal.find('.list-group').empty().addClass('d-none');

        // 3. Limpiar mensajes de error
        $modal.find('.modal-error-msg').hide();

        // 4. Limpiar clases de validación (si usas)
        $modal.find('.is-invalid, .is-valid').removeClass('is-invalid is-valid');

        // 5. Limpiar tablas (tbody)
        $modal.find('table tbody').empty();
    }

    // Generar filas en la tabla de artículos para devolución
    generarFilas(numFilas = 3, data = []) {
        console.log("Data tabla salida:", data);

        const tbody = $('#bodyArticulosSalida');
        tbody.empty();
        $('#badgeTotalArticulos').text(data.length);

        data.forEach((item, i) => {
            if (!item) return;

            const urgenciaClass = 'bg-secondary';
            const urgenciaText = 'N/A';

            tbody.append(`
                <tr>
                    <td class="text-center">${i + 1}</td>
                    <td class="text-center">
                        <input type="checkbox" class="form-check-input chk-articuloSalida"
                               data-idsolicitud="${item.idSolicitud || ''}"
                               data-codigo="${item.codigo || ''}"
                               data-nombre="${item.articulo || ''}"
                               data-cantidad="${item.cantidad || 0}"
                               checked>
                    </td>
                    <td><span class="badge bg-dark">${item.codigo || 'N/A'}</span></td>
                    <td>${item.articulo || 'N/A'}</td>
                    <td class="text-center">
                        <input type="number" min="1"
                               class="form-control form-control-sm text-center fw-bold cantidadEditable"
                               value="${item.cantidad || 0}">
                    </td>
                    <td class="text-center">
                        <span class="badge ${urgenciaClass}">${urgenciaText}</span>
                    </td>
                    <td class="text-center">
                        <span class="badge bg-warning text-dark">Devolución</span>
                    </td>
                    <td>
                        <input type="text" class="form-control form-control-sm departamento text-center"
                               value="${item.dept || ''}" readonly>
                    </td>
                    <td>
                        <select class="form-select form-select-sm proceso">
                            ${this.buildOptions(this.ListProcesos, 'PrcCode', item.proceso || 'PCPVC')}
                        </select>
                    </td>
                    <td>
                        <select class="form-select form-select-sm gastos">
                            ${this.buildOptions(this.ListGastos, 'PrcCode', item.gastos || 'GIF')}
                        </select>
                    </td>
                    <td>
                        <input type="text" class="form-control form-control-sm cedis text-center"
                               value="${item.cedis || ''}" readonly>
                    </td>
                    <td>
                        <input type="text" class="form-control form-control-sm nombre_empleado"
                               value="${item.nombre || ''}">
                    </td>
                </tr>
            `);
        });

        this.actualizarContadorArticulos();
    }

    buildSelect(list, clase, key, valInit) {


        let opciones = "";
        list.forEach((item) => {

            let selectd = "";
            if (item[key] == valInit) selectd = "selected";

            let opcion = `<option value="${item[key]}" ${selectd}>${item[key]}</option>`;
            opciones += opcion;
        });



        return `<select class="form-select-custom ${clase}">
                            ${opciones}
                       </select>`;;

    }

    // set folio (puedes reemplazar por valor generado por el servidor)
    setFolio(folio) {
        $('#valeFolio').text('# ' + folio);
    }

    // limpiar todo
    limpiarFormulario() {
        $('#frmVale')[0].reset();
        $('#bodyArticulosSalida').html(`
            <tr>
                <td colspan="12" class="text-center text-muted py-4">
                    <i class="bi bi-info-circle me-1"></i>Seleccione una solicitud para ver los artículos
                </td>
            </tr>
        `);
        $('#contadorSeleccionados').text('0');
        $('#badgeTotalArticulos').text('0');
        $('#chkSelAllArticulos').prop('checked', false);
        this.setFolio('000000');
    }

    // extraer datos en objeto
    obtenerDatos() {
        const cabecera = {
            folio: $('#valeFolio').text(),
            fecha: {
                dia: $('#fechaDia').val(),
                mes: $('#fechaMes').val(),
                anio: $('#fechaAnio').val()
            },
            solicitante: $('#solicitante').val(),
            empleado: $('#numEmpleado').val(),
            area: $('#area').val(),
            ajuste: $('#numAjuste').val()
        };

        const lineas = [];
        $('#bodyArticulosSalida tr').each(function () {
            const $fila = $(this);
            const $chk = $fila.find('.chk-articuloSalida');

            if ($chk.is(':checked')) {
                const idSolicitud = $chk.data('idsolicitud');
                const codigo = $chk.data('codigo');
                const cantidad = $fila.find('.cantidadEditable').val();
                const articulo = $chk.data('nombre');

                if (!codigo && !articulo) return;

                lineas.push({
                    idSolicitud,
                    codigo,
                    cantidad: cantidad || 0,
                    articulo,
                    departamento: $fila.find('.departamento').val(),
                    proceso: $fila.find('.proceso').val(),
                    gastos: $fila.find('.gastos').val(),
                    cedis: $fila.find('.cedis').val()
                });
            }
        });

        return { cabecera, lineas };
    }

    llenarFirmas() {
        $("#firmaAlmacen").empty();
        $("#firmaAutoriza").empty();
        $("#devolucionEntrega").empty();
        $("#devolucionRecibe").empty();

        let tempOP = `<option value="{{NOMBRE}}">{{NOMBRE}}</option>`;

        const AuthP1 =
            [
                { Nombre: "SIMP1" },
                { Nombre: "MPVCS" },
                { Nombre: "MPVCC" },
                { Nombre: "MPEADC" },
                { Nombre: "MPEADS" },
                { Nombre: "HP1C" },
                { Nombre: "HPVCS" },
                { Nombre: "HPEADS" },
            ];

        const SolP1 =
            [
                { Nombre: "TMPVC1" },
                { Nombre: "TMPVC2" },
                { Nombre: "TMPVC3" },
                { Nombre: "TMPVC4" },
                { Nombre: "TMPEAD1" },
                { Nombre: "TMPEAD2" },
                { Nombre: "TMPEAD3" },
                { Nombre: "TMPEAD4" },
                { Nombre: "TMPEAD5" },
                { Nombre: "THPVC1" },
                { Nombre: "THPVC2" },
                { Nombre: "THPVC3" },
                { Nombre: "THPVC4" },
                { Nombre: "THPEAD1" },
                { Nombre: "THPEAD2" },
                { Nombre: "THPEAD3" },
                { Nombre: "THPEAD4" },
            ];

        let AUTORIZADORES =
            [
                { Nombre: "JM001" },
                { Nombre: "SM001" },
                { Nombre: "SH001" }
            ];
        let ALMACENISTAS =
            [
                { Nombre: "TM001" },
                { Nombre: "TM002" },
                { Nombre: "TM003" },
                { Nombre: "TM004" },
                { Nombre: "TM005" },
                { Nombre: "TM006" },
                { Nombre: "TM007" },
                { Nombre: "TM008" },
                { Nombre: "TM009" },
                { Nombre: "TM010" },
                { Nombre: "TH001" },
                { Nombre: "TH002" },
                { Nombre: "TH003" },
                { Nombre: "TH004" },
                { Nombre: "TH005" },
                { Nombre: "TH006" },
                { Nombre: "TH007" },
                { Nombre: "TH008" },
                { Nombre: "TH009" },
                { Nombre: "TH010" }
            ];

        if (this.datos_usuario[0].PLANTA == 1) {
            AUTORIZADORES = AuthP1
            ALMACENISTAS = SolP1
        }

        let opAuth = "";
        AUTORIZADORES.forEach(a => {
            opAuth += tempOP.replaceAll('{{NOMBRE}}', a.Nombre);
        });

        let opAlm = "";
        ALMACENISTAS.forEach(a => {
            opAlm += tempOP.replaceAll('{{NOMBRE}}', a.Nombre);
        });

        $("#firmaAlmacen").append(opAlm);
        $("#firmaAutoriza").append(opAuth);
        $("#devolucionEntrega").append(opAlm);
        $("#devolucionRecibe").append(opAuth);

    }


    async obtenerCentrosCostos() {

        let [procesos, gastos] = await Promise.all([
            this.getCentroCostos(2),
            this.getCentroCostos(3),
        ]);

        console.log("ObtnerCentros :")
        console.log(procesos);
        console.log(gastos);

        this.ListProcesos = procesos;
        this.ListGastos = gastos;

    }

    async getDetalleOC(docEntry) {
        try {

            const response = await $.ajax({
                url: `/${this.URLBase}/GetOrdenDetalleOC`,
                method: 'GET',
                data: { DocEntry: docEntry },
                dataType: 'json'
            });



            if (response.Status == "OK") {

                let data = JSON.parse(response.Data);
                this.currentDocLinesOC = data;
                this.llenarTablaOC(data);
            }


        } catch (error) {
            console.error(error);
            AlertManager.mostrar('No es posible mostrar la lista de equipos: ' + error, 'warning');
        }
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

            console.log("Detalle OC:")
            console.log(response);


            if (response.Status == "OK") {
                let data = JSON.parse(response.Data);
                AlertManager.mostrar(`Entrada Mercancía generada correctamente. Con DocNum ${data.DocNum}`);
                $("#entradaMercancia").modal("hide");
            }
            else {
                AlertManager.mostrar(response.Message, 'warning');
            }

        } catch (error) {
            console.error(error);
            AlertManager.mostrar('No es posible mostrar la lista de equipos: ' + error, 'warning');
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

            if (response.Status == "OK") {

                let data = JSON.parse(response.Data);
                return data;
            }
            else {
                return [];
            }


        } catch (error) {
            console.error(error);
            return [];
        }
    }

    async getLasSM() {
        try {

            const response = await $.ajax({
                url: `/${this.URLBase}/GetLastDocEntrySM`,
                method: 'GET',
                data: {},
                dataType: 'json'
            });

            if (response.Status == "OK") {

                let data = JSON.parse(response.Data);
                return data[0];
            }
            else {
                return {};
            }


        } catch (error) {
            console.error(error);
            return {};
        }
    }

    async getDepartamentoSucursalUser(correo) {
        try {

            const response = await $.ajax({
                url: `/${this.URLBase}/GetDepSucursalUser`,
                method: 'GET',
                data: {
                    email: correo
                },
                dataType: 'json'
            });

            if (response.Status == "OK") {

                let data = JSON.parse(response.Data);
                return data[0];
            }
            else {
                return {};
            }


        } catch (error) {
            console.error(error);
            return {};
        }
    }

    async getSalidaM(IdSolicitud) {
        try {

            const response = await $.ajax({
                url: `/${this.URLBase}/GetMovimientoSalida`,
                method: 'GET',
                data: { idSol: IdSolicitud },
                dataType: 'json'
            });

            console.log("RESPONSE SALIDA M");
            console.log(response);

            if (response.Status == "OK") {

                let data = JSON.parse(response.Data);
                return data[0];
            }
            else {
                return {};
            }

        } catch (error) {
            console.error(error);
            return {};
        }
    }

    async postCreateSalidaMercancia(requestSalida) {
        try {
            const response = await $.ajax({
                url: `/${this.URLBase}/GenerarSalidaMercancia`,
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                data: JSON.stringify(requestSalida),
                dataType: 'json'
            });

            console.log("Detalle Salida:")
            console.log(response);


            if (response.Status == "OK") {
                let data = JSON.parse(response.Data);
                AlertManager.mostrar(`Salida Mercancía generada correctamente. Con NumeroAjuste ${data.DocNum}`);
                $('#salidaMercancia').modal('hide');
                this.limpiarFormulario();
            }
            else {
                AlertManager.mostrar(response.Message, 'warning');
            }

        } catch (error) {
            console.error(error);
            AlertManager.mostrar('No es posible mostrar la lista de equipos: ' + error, 'warning');
        } finally {
            $("#btnGuardarVale").prop('disabled', false).html('<i class="bi bi-save me-1"></i>Guardar');
            $('#tablaSolicitudesRefacciones').DataTable().ajax.reload(null, false);

        }
    }

    async postEntradaDevolucionMercancia(requestDev) {
        try {
            const response = await $.ajax({
                url: `/${this.URLBase}/GenerarDevolucionMercancia`,
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                data: JSON.stringify(requestDev),
                dataType: 'json'
            });

            console.log("Detalle Devolucion:")
            console.log(response);


            if (response.Status == "OK") {
                let data = JSON.parse(response.Data);
                AlertManager.mostrar(`Devolucion Mercancía generada correctamente. Con NumeroAjuste ${data.DocNum}`);
                $('#salidaMercancia').modal('hide');
            }
            else {
                AlertManager.mostrar(response.Message, 'warning');
            }

            $('#tablaSolicitudesRefacciones').DataTable().ajax.reload(null, false);

        } catch (error) {
            console.error(error);
            AlertManager.mostrar('No es posible mostrar la lista de equipos: ' + error, 'warning');
        }
    }

}

// ========================================
// GESTOR DE BADGES
// ========================================
class BadgeManager {
    static obtenerUrgenciaBadgeColor(urgencia) {
        switch (urgencia) {
            case 'Normal': return 'primary';
            case 'Urgente': return 'warning';
            case 'Crítico': return 'warning';
            default: return 'secondary';
        }
    }

    static obtenerEstatusBadgeColor(estatus) {
        switch (estatus) {
            case 'Pendiente': return 'info';
            case 'Autorizado': return 'success';
            case 'Rechazado': return 'warning';
            case 'En tránsito': return 'warning';
            case 'Entregado': return 'success';
            default: return 'secondary';
        }
    }
}


// ========================================
// INICIALIZACIÓN
// ========================================
$(document).ready(function () {
    const app = new SolicitudRefaccionesApp();
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