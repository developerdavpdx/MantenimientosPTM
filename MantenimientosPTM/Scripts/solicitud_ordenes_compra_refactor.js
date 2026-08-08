// ========================================
// APLICACIÓN PRINCIPAL
// ========================================
class SolicitudCompraApp {
    constructor() {
        this.URLBase = "Almacen";
        this.datos_usuario = GlobalUtil.getDatosUsuario();
        this.compraManager = new CompraManager(this.URLBase, this.datos_usuario);
        this.IdSolicitudCompra = 0;
        // ✅ Instanciar los 4 centros de costo — una vez al cargar
        this.centrosCosto = {
            departamento: new GestionCentrosCosto({
                inputBuscar: '#SolDep',
                inputCodigo: '#SolDepCodigo',
                contenedorSugerencias: '#sugerenciasDep',
                dimCode: 1
            }),
            proceso: new GestionCentrosCosto({
                inputBuscar: '#SolProceso',
                inputCodigo: '#SolProcesoCodigo',
                contenedorSugerencias: '#sugerenciasProceso',
                dimCode: 2
            }),
            gastos: new GestionCentrosCosto({
                inputBuscar: '#SolGastos',
                inputCodigo: '#SolGastosCodigo',
                contenedorSugerencias: '#sugerenciasGastos',
                dimCode: 3
            }),
            cedis: new GestionCentrosCosto({
                inputBuscar: '#SolCedis',
                inputCodigo: '#SolCedisCodigo',
                contenedorSugerencias: '#sugerenciasCedis',
                dimCode: 4
            })
        };
        window.AppSolicitudCompra = this;
    }

    inicializar() {
        // ✅ SIEMPRE inicializar estas cosas (necesarias para reutilización)
        this.compraManager.inicializar();
        this.configurarEventos();
        this.configurarAutoCompletes();

        // ✅ SOLO INICIALIZAR SI ESTAMOS EN LA VISTA DE SOLICITUD DE COMPRA
        if (window.CURRENT_VIEW === 'SolicitudCompra') {
            UIManagerCompra.inicializarUI();
            this.configurarEventosFiltros();
            this.initHubSolicitudCompra();
            console.log('✅ Sistema de Solicitud de Compra inicializado correctamente');
        } else {
            console.info('ℹ️ Inicialización parcial en vista: ' + window.CURRENT_VIEW);
        }
    }

    configurarAutoCompletes() {
        // ✅ Wire-up genérico para los 4
        Object.values(this.centrosCosto).forEach(gestion => {
            $(gestion._inputBuscar).on('keyup', (e) => {
                const query = $(e.target).val().trim();
                if (query.length >= 2) {
                    gestion.buscarCentros(query, this.datos_usuario[0].EMAIL);
                } else {
                    gestion.ocultarSugerencias();
                }
            });

            // ✅ Click outside
            $(document).on('click', (e) => {
                if (!$(e.target).closest(`${gestion._inputBuscar}, ${gestion._contenedorSugerencias}`).length) {
                    gestion.ocultarSugerencias();
                }
            });
        });
    }

    configurarEventosFiltros() {
        // ✅ Cambio automático en fechas y planta
        $('#FiltroFechaInicio, #FiltroFechaFin, #FiltroPlanta').on('change', () => {
            const fechaInicio = $('#FiltroFechaInicio').val();
            const fechaFin = $('#FiltroFechaFin').val();

            if (fechaInicio && fechaFin) {
                if (new Date(fechaInicio) > new Date(fechaFin)) {
                    AlertManager.mostrar('La fecha de inicio no puede ser mayor a la fecha de fin.', 'warning');
                    return;
                }
            }
            this._recargarTabla();
        });

        // ✅ Orden de trabajo — solo al presionar Enter
        $('#FiltroFolio').on('keypress', (e) => {

            if (e.which === 13) {
                e.preventDefault();
                this._recargarTabla();
            }
        });

        // ✅ Botón Aplicar
        $('#btnAplicarFiltros').on('click', () => {
            const fechaInicio = $('#FiltroFechaInicio').val();
            const fechaFin = $('#FiltroFechaFin').val();

            if (fechaInicio && fechaFin) {
                if (new Date(fechaInicio) > new Date(fechaFin)) {
                    AlertManager.mostrar('La fecha de inicio no puede ser mayor a la fecha de fin.', 'warning');
                    return;
                }
            }
            this._recargarTabla();
        });

        // ✅ Botón Limpiar
        $('#btnLimpiarFiltros').on('click', () => {
            $('#FiltroOrdenTrabajo').val('');
            $('#FiltroFechaInicio').val('');
            $('#FiltroFechaFin').val('');
            $('#FiltroPlanta').val('');
            this._recargarTabla();
        });

    }

    configurarEventos() {
        // ✅ Completar solicitud de compra
        $(document).on('click', '.btn-completar-compra', (e) => {
            this.compraManager.completarSolicitudCompra($(e.currentTarget));
        });

        // ✅ Cerrar solicitud de compra
        $(document).on('click', '.btn-cerrar-compra', (e) => {
            this.compraManager.cerrarSolicitudCompra($(e.currentTarget));
        });


        //Botón mostrar solicitudes de refacciones
        $(document).on('click', '.btn-ver-detalle', (event) => {
            const btn = $(event.currentTarget);
            const IdSolicitudCompra = btn.data('id');  // ⬅️ ya lo tienes en el botón
            this.compraManager.llenarSolicitudesRefacciones(IdSolicitudCompra);
            $("#SolRefModal").modal("show");
        });

        $(document).on('click', '.btn-aprobar', async (event) => {

            // ✅ Limpiar centros de costo al abrir el modal
            Object.values(this.centrosCosto).forEach(g => g.limpiar());

            const btn = $(event.currentTarget);
            this.IdSolicitudCompra = btn.data('id');
            const FolioCompra = btn.data('folio');
            const OrdenCompra = btn.data('ot');

            $('#subtitleRequisicion').html(
                `<i class="bi bi-cash-stack me-1"></i> Folio: <strong>${FolioCompra}</strong>`
            );

            $('#bodyRequisicionArticulos').empty();
            $('#formGenerarRequisicion')[0].reset();
            $('#formGenerarRequisicion').removeClass('was-validated');

            try {
                const response = await $.ajax({
                    url: `/${this.URLBase}/GetDetallesSolicitudCompraMP`,
                    type: 'POST',
                    data: { IdSolicitudCompra: this.IdSolicitudCompra }
                });

                if (!response || !response.data || response.data.length === 0) {
                    AlertManager.mostrar('No se encontraron artículos para esta solicitud.', 'warning');
                    return;
                }

                // ✅ Agrupar por CodigoArticulo
                const agrupados = Object.values(
                    response.data.reduce((acc, item) => {
                        const key = item.CodigoArticulo;
                        if (acc[key]) {
                            acc[key].CantidadEncargar += item.CantidadEncargar;
                            acc[key].IdsDetalle.push(item.IdDetalle);
                            acc[key].OrdenesTrabajoArr.push(item.OrdenTrabajo);
                        } else {
                            acc[key] = {
                                ...item,
                                IdsDetalle: [item.IdDetalle],
                                OrdenesTrabajoArr: [item.OrdenTrabajo]
                            };
                        }
                        return acc;
                    }, {})
                );

                agrupados.forEach((item, i) => {
                    // ✅ Renderizar badges de órdenes de trabajo
                    const ordenesBadges = item.OrdenesTrabajoArr
                        .map(ot => `<span class="badge bg-blue-ptm badge-custom me-1">${ot || 'N/A'}</span>`)
                        .join('');

                    $('#bodyRequisicionArticulos').append(`
                        <tr data-idsdetalle='${JSON.stringify(item.IdsDetalle)}'
                            data-codigoarticulo="${item.CodigoArticulo}">
                            <td class="text-left">${ordenesBadges}</td>
                            <td class="text-center">
                                <small class="fw-semibold text-muted">${item.CodigoArticulo || ''}</small>
                            </td>
                            <td>${item.NombreArticulo || 'N/A'}</td>
                            <td class="text-center fw-semibold"><span class="badge bg-blue-ptm badge-custom">${item.CantidadEncargar || 0}</span></td>
                            <td>
                                <div class="sol-buscar-proveedor-wrap">
                                    <input type="text" class="form-control-custom sol-buscar-proveedor"
                                           id="BuscarProveedor_${i}" placeholder="Buscar proveedor..." autocomplete="off">
                                    <div id="sugerenciasProveedor_${i}" class="autocomplete-sugerencias-proveedores"></div>
                                    <input type="hidden" id="CodigoProveedor_${i}" class="sol-codigo-proveedor">
                                    <input type="hidden" id="NombreProveedor_${i}" class="sol-nombre-proveedor">
                                </div>
                            </td>
                        </tr>
                    `);

                    const gestion = new GestionProveedores({
                        inputBuscar: `#BuscarProveedor_${i}`,
                        inputCodigo: `#CodigoProveedor_${i}`,
                        inputNombre: `#NombreProveedor_${i}`,
                        contenedorSugerencias: `#sugerenciasProveedor_${i}`,
                        showBadge: true
                    });

                    $(`#BuscarProveedor_${i}`).data('gestion', gestion);

                    $(`#BuscarProveedor_${i}`).on('keyup', (e) => {
                        const query = $(e.target).val().trim();
                        if (query.length >= 2) {
                            gestion.buscarProveedores(query, this.datos_usuario[0].EMAIL);
                        } else {
                            gestion.ocultarSugerencias();
                        }
                    });

                    $(document).on(`click.proveedor_${i}`, (e) => {
                        if (!$(e.target).closest(`#BuscarProveedor_${i}, #sugerenciasProveedor_${i}`).length) {
                            gestion.ocultarSugerencias();
                        }
                    });
                });

                $('#SolcitarModal').modal('show');

            } catch (error) {
                AlertManager.mostrar('Error al cargar el detalle de la solicitud: ' + error, 'warning');
                console.error(error);
            }
        });




        //COMPLETAR SOLICITUD DE COMPRA
        $("#completeSolCompra").on("click", async () => {

            // ─── Validar y recolectar proveedores por fila ─────────────────────────
            const articulos = [];
            let proveedorFaltante = false;

            $('#bodyRequisicionArticulos tr').each(function () {
                const fila = $(this);
                const gestion = fila.find('.sol-buscar-proveedor').data('gestion');

                if (!gestion || !gestion.tieneProveedorSeleccionado()) {
                    fila.find('.sol-buscar-proveedor').addClass('is-invalid');
                    proveedorFaltante = true;
                    return;
                }

                fila.find('.sol-buscar-proveedor').removeClass('is-invalid');

                const nombreArticulo = fila.find('td:eq(2)').text().trim();

                // ✅ CAPTURAR CANTIDAD: Intenta primero desde input, luego desde badge/texto
                let cantidadTotal;
                const $cantidadInput = fila.find('.cantidad-editable');

                if ($cantidadInput.length > 0) {
                    // Si existe input editable, obtener su valor
                    cantidadTotal = parseInt($cantidadInput.val()) || 0;
                } else {
                    // Si no, obtener del texto de la celda (badge o texto plano)
                    const textocelda = fila.find('td:eq(3)').text().trim();
                    cantidadTotal = parseInt(textocelda) || 0;
                }

                articulos.push({
                    IdsDetalle: JSON.parse(fila.attr('data-idsdetalle')), // ✅ array de IDs
                    CodigoArticulo: fila.data('codigoarticulo'),
                    NombreArticulo: nombreArticulo,
                    CantidadTotal: cantidadTotal,
                    ...gestion.obtenerDatosFormulario()  // codigoProveedor, nombreProveedor
                });
            });

            if (proveedorFaltante) {
                AlertManager.mostrar('Selecciona un proveedor para cada artículo.', 'warning');
                return;
            }

            // ─── Validar centros de costo ──────────────────────────────────────────
            const centrosValidos = Object.values(this.centrosCosto).every(g => g.tieneCentroSeleccionado());
            if (!centrosValidos) {
                Object.values(this.centrosCosto).forEach(g => {
                    if (!g.tieneCentroSeleccionado()) {
                        $(g._inputBuscar).addClass('is-invalid');
                    }
                });
                AlertManager.mostrar('Completa todos los campos de contabilización.', 'warning');
                return;
            }

            // ─── Recolectar centros de costo ───────────────────────────────────────
            const contabilizacion = {
                Departamento: this.centrosCosto.departamento.obtenerDatosFormulario().codigo,
                Proceso: this.centrosCosto.proceso.obtenerDatosFormulario().codigo,
                Gastos: this.centrosCosto.gastos.obtenerDatosFormulario().codigo,
                Cedis: this.centrosCosto.cedis.obtenerDatosFormulario().codigo
            };

            // ─── Payload final ─────────────────────────────────────────────────────
            const payload = {
                IdSolicitudCompra: this.IdSolicitudCompra,
                Articulos: articulos,
                Contabilizacion: contabilizacion
            };

            console.log('✅ Payload listo:', payload);
            await this.createSolCompra(payload);
        });
    }

    async createSolCompra(payload) {
        const btn = $('#completeSolCompra');

        // ─── Loading state ─────────────────────────────────────────────────────
        btn.prop('disabled', true)
            .html('<i class="bi bi-hourglass-split me-1"></i> Guardando...');

        try {

            let urlfinal = "";

            // ✅ SOLO INICIALIZAR SI ESTAMOS EN LA VISTA DE SOLICITUD DE COMPRA
            if (window.CURRENT_VIEW === 'SolicitudCompra') {
                urlfinal = "ActualizarSolicitudOrdenCompraMP";
            }
            else if (window.CURRENT_VIEW === 'ReporteStock') {
                urlfinal = "InsertarSolicitudOrdenCompraMPUndependent";
            }
           

            // ✅ Paso 1: Actualizar solicitud de compra con estatus "Espera Autorizacion"
            const responseInsert = await $.ajax({
                url: `/${this.URLBase}/${urlfinal}`,
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                data: JSON.stringify({
                    Requisicion: payload,
                    Comentarios: "Solicitud enviada para autorización",
                    UsuarioSolicita: this.datos_usuario[0].EMAIL,
                    Planta: this.datos_usuario[0].PLANTA,
                    CodigoEmpleado: this.datos_usuario[0].CODIGOEMPLEADO
                }),
                dataType: 'json'
            });

            if (responseInsert.Status !== 'SI' && responseInsert.Status !== 'PARCIAL') {
                throw new Exception(responseInsert.Message || "Error al crear la solicitud de compra.");
            }

            const idSolicitudCompra = responseInsert.Data;
            console.log('✅ Solicitud creada con ID:', idSolicitudCompra);

            // ✅ Paso 2: Enviar correo de autorización
            btn.html('<i class="bi bi-envelope-paper me-1"></i> Enviando autorización...');

            //const responseEnviar = await $.ajax({
            //    url: `/${this.URLBase}/EnviarSolicitudCompraAutorizacion`,
            //    type: 'POST',
            //    contentType: 'application/json; charset=utf-8',
            //    data: JSON.stringify({
            //        idSolicitudCompra: parseInt(idSolicitudCompra),
            //        Articulos: payload.Articulos
            //    }),
            //    dataType: 'json'
            //});

            //if (responseEnviar.Status !== 'OK') {
            //    throw new Exception(responseEnviar.Message || "Error al enviar el correo de autorización.");
            //}

            // ✅ Paso 3: Actualizar cabecera con centros de costo (sin crear PR en SAP aún)
            //const payloadActualizar = {
            //    IdSolicitudCompra: parseInt(idSolicitudCompra),
            //    Articulos: payload.Articulos,
            //    Contabilizacion: payload.Contabilizacion
            //};

            // No llamamos a CreateSolicitudCompra aquí, solo guardamos los centros de costo
            // La creación del PR en SAP se hará cuando se autorice la solicitud
            setTimeout(() => {
                btn.html('<i class="bi bi-check-circle-fill me-1"></i> Solicitud enviada');
            }, 1500);


            AlertManager.mostrar('Solicitud enviada para autorización correctamente. Se notificará cuando sea procesada.', 'success', 'alertSolicitudCompraContainer');
            // ✅ Recargar DataTable
            $('#tablaSolicitudesCompra').DataTable().ajax.reload(null, false);

            setTimeout(() => {
                btn.prop('disabled', false).html('<i class="bi bi-floppy-fill me-1"></i> Guardar');

                setTimeout(() => {
                    $('#SolcitarModal').modal('hide');
                }, 2500);

            }, 2500);



        } catch (error) {
            console.error('Error en createSolCompra:', error);
            btn.prop('disabled', false)
                .html('<i class="bi bi-floppy-fill me-1"></i> Guardar');
            AlertManager.mostrar('Error al procesar la solicitud: ' + error.message || error, 'warning', 'alertSolicitudCompraContainer');
        }
    }

    formatearImporte(total) {
        return Number(total).toLocaleString('es-MX', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    // ========================================
    // SIGNALR MANAGER — SOLICITUDES DE COMPRA
    // ========================================
    initHubSolicitudCompra() {
        // ✅ SOLO INICIALIZAR EN LA VISTA CORRECTA
        if (window.CURRENT_VIEW !== 'SolicitudCompra') {
            console.info('ℹ️ SignalR Solicitud Compra omitido (vista: ' + window.CURRENT_VIEW + ')');
            return;
        }

        // ✅ VERIFICAR QUE EL MODAL EXISTE
        const $modalEl = document.getElementById('actualizacionRefaccionesModal');
        if (!$modalEl) {
            console.warn('Modal actualizacionRefaccionesModal no encontrado');
            return;
        }

        const self = this;
        const hub = $.connection.mantenimientoHub;
        let reconnectDelay = 5000;
        let isReloadingSolicitudCompra = false;

        const miPlanta = this.datos_usuario[0]?.PLANTA || '';

        // ✅ Reemplaza la función debeRecibirAviso por esta versión más robusta
        const debeRecibirAviso = (planta) => {
            const mi = String(miPlanta || '').trim();
            const pl = String(planta || '').trim();
            return mi !== '' && mi === pl;
        };

        let modalActualizacion = new bootstrap.Modal($modalEl, {
            backdrop: 'static',
            keyboard: false
        });

        const btnConfirmar = document.getElementById('btnConfirmarActualizacion');
        if (btnConfirmar) {
            btnConfirmar.addEventListener('click', () => {
                modalActualizacion.hide();
                self._recargarTabla();
            });
        }

        // ✅ Método que se ejecuta cuando se recibe notificación
        hub.client.actualizarTablaSolicitudCompra = function (planta) {
            console.warn("📡 Actualización Solicitud Compra recibida");

            if (!debeRecibirAviso(planta)) {
                console.info("🔕 Aviso ignorado — no corresponde a esta planta:", miPlanta);
                return;
            }

            // Validaciones para no recargar innecesariamente
            if ($modalEl && $modalEl.classList.contains('show')) {
                console.info("🔕 Modal de actualización ya está abierto");
                return;
            }

            if (isReloadingSolicitudCompra) {
                console.info("🔄 Recarga ya en progreso");
                return;
            }

            // Mostrar modal de actualización
            if (modalActualizacion) {
                console.info("✅ Mostrando modal de actualización");
                modalActualizacion.show();
            } else {
                // Fallback: recargar directo si no hay modal
                self._recargarTabla();
            }
        };

        // ✅ Iniciar conexión SignalR
        $.connection.hub.start({
            transport: ['webSockets', 'longPolling']
        }).done(function () {
            console.log("✅ SignalR Solicitud Compra conectado");
        }).fail(function (error) {
            console.error("❌ Error al conectar SignalR Solicitud Compra:", error);
        });

        // ✅ Eventos de reconexión
        $.connection.hub.reconnecting(function () {
            console.warn("🔄 SignalR Solicitud Compra reconectando...");
        });

        $.connection.hub.reconnected(function () {
            console.info("✅ SignalR Solicitud Compra reconectado");
            reconnectDelay = 5000;
        });

        $.connection.hub.disconnected(function () {
            console.error("❌ SignalR Solicitud Compra desconectado");
            setTimeout(function () {
                console.warn(`🔁 Reintentando conexión en ${reconnectDelay / 1000}s...`);
                $.connection.hub.start();
                reconnectDelay = Math.min(reconnectDelay * 2, 30000);
            }, reconnectDelay);
        });
    }

    _recargarTabla() {
        let isReloadingSolicitudCompra = true;

        if ($.fn.DataTable.isDataTable('#tablaSolicitudesCompra')) {
            $('#tablaSolicitudesCompra').DataTable().ajax.reload(() => {
                isReloadingSolicitudCompra = false;
                console.info("✅ Tabla recargada correctamente");
            }, false);
        } else {
            this.compraManager.llenarSolicitudesCompra();
            isReloadingSolicitudCompra = false;
        }
    }
}

// ========================================
// GESTOR DE UI
// ========================================
class UIManagerCompra {
    static inicializarUI() {
        // ✅ VERIFICAR QUE LOS ELEMENTOS EXISTEN ANTES DE USARLOS
        if ($('#SolicitudOrdenesCompraURL').length === 0) {
            console.info('UIManagerCompra.inicializarUI() omitido - elementos no encontrados');
            return;
        }

        $("#SolicitudOrdenesCompraURL").addClass("selected-item");
        $("#AlmacenContainer").addClass("selected");
        $("#AlmacenContainer a").addClass("whiteText");
        $("#almacen-collapse").addClass("show");

        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(el => new bootstrap.Tooltip(el));

        if ($('#FiltroFechaInicio').length > 0) {
            $('#FiltroFechaInicio').val(DateUtils.obtenerPrimerDiaMesActual());
            $('#FiltroFechaFin').val(DateUtils.obtenerUltimoDiaMesActual());
        }
    }
}


// ========================================
// GESTOR DE COMPRAS
// ========================================
class CompraManager {
    constructor(URLBase, datos_usuario) {
        this.URLBase = URLBase;
        this.datos_usuario = datos_usuario;
        this.IdSolicitudCompra = "";
    }

    inicializar() {
        this.llenarSolicitudesCompra();
        console.log('✅ CompraManager inicializado correctamente');
    }

    llenarSolicitudesCompra() {
        try {
            // ✅ Limpiar evento resize anterior
            $(window).off('resize.solicitudesCompra');

            // ✅ Destruir instancia anterior
            if ($.fn.DataTable.isDataTable('#tablaSolicitudesCompra')) {
                $('#tablaSolicitudesCompra').DataTable().destroy();
            }

            // ✅ Función para offset responsivo
            const calcularHeaderOffset = () => {
                if (window.innerWidth < 541) return 200;
                if (window.innerWidth < 640) return 156;
                if (window.innerWidth < 992) return 158;
                if (window.innerWidth < 1155) return 125;
                if (window.innerWidth < 1400) return 118;
                return 113;
            };

            // ✅ Renderer customizado para detalles responsivos
            const renderDetallesResponsive = (columns) => {
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
                        'FOLIO': 'bi bi-cash-stack',
                        'FECHA SOLICITUD': 'bi bi-calendar-event',
                        'ESTADO': 'bi bi-info-circle-fill',
                        'USUARIO SOLICITA': 'bi bi-person-fill',
                        'COMENTARIOS': 'bi bi-chat-left-text',
                        'DOC. SAP': 'bi bi-file-earmark-check',
                        'DOC. ENTRY': 'bi bi-file-earmark-number',
                        'RESPUESTA SAP': 'bi bi-reply-fill'
                    };
                    return iconos[tituloNorm] || 'bi bi-circle-fill';
                };

                let detallesHtml = '';
                $.each(hiddenColumns, function (i, col) {
                    const title = col.title;
                    const valueContent = col.data || '<em class="text-muted">Sin información</em>';
                    const iconClass = obtenerIcono(title);

                    detallesHtml += `
                    <div class="row mb-3 py-2 border-bottom align-items-center">
                        <div class="col-5">
                            <i class="${iconClass} me-2" style="font-size: 1.3rem; color: #0D6EFD;"></i>
                            <strong>${title}</strong>
                        </div>
                        <div class="col-7">
                            <span class="badge px-3 py-2" style="background-color: #F2F2F2; color: #333;">
                                ${valueContent}
                            </span>
                        </div>
                    </div>`;
                });

                return `
                <div class="card shadow-sm mt-3">
                    <div class="card-header bg-light">
                        <h5 class="mb-0">
                            <i class="bi bi-cash-stack me-2" style="color: #0D6EFD;"></i>
                            Información adicional de la solicitud de compra
                        </h5>
                    </div>
                    <div class="card-body">
                        ${detallesHtml}
                    </div>
                    <div class="card-footer bg-light text-muted">
                        <small>Última actualización: ${new Date().toLocaleDateString()}</small>
                    </div>
                </div>`;
            };

            // ✅ Instancia DataTable
            const table = $('#tablaSolicitudesCompra').DataTable({
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
                        renderer: (api, rowIdx, columns) => renderDetallesResponsive(columns)
                    }
                },
                ajax: {
                    url: `/${this.URLBase}/GetSolicitudesCompraMP`,
                    type: "POST",
                    dataType: "json",
                    beforeSend: () => GlobalUtil.mostrarLoader(true),
                    complete: () => GlobalUtil.mostrarLoader(false),
                    data: (d) => {
                        return $.extend({}, d, {
                            "FiltroFechaInicio": $("#FiltroFechaInicio").val() || null,
                            "FiltroFechaFin": $("#FiltroFechaFin").val() || null,
                            "FiltroFolio": $("#FiltroFolio").val() || null,
                            "FiltroPlanta": this.datos_usuario[0].PLANTA || null
                        });
                    },
                    dataSrc: (json) => json.data
                },
                // ✅ COLUMNAS INLINE
                columns: [
                    // Columna 0: Control Responsive
                    {
                        className: 'dtr-control text-center',
                        orderable: false,
                        data: null,
                        defaultContent: '',
                        width: '30px'
                    },
                    // Columna 1: Acciones
                    {
                        data: null,
                        orderable: false,
                        className: 'all text-center',
                        width: '100px',
                        render: function (data, type, row) {

                            let btnDetalleSolicitudCompra = "";
                            let btnReqCompra = "";

                            switch (row.Estatus) {
                                case "Pendiente":
                                    btnDetalleSolicitudCompra = `<button class="btn btn-sm btn-ptm-edit btn-ver-detalle"
                                        data-id="${row.IdSolicitudCompra}"
                                        data-folio="${row.FolioCompra}"
                                        title="Ver detalle">
                                        <i class="bi bi-eye"></i>
                                    </button>`;

                                    btnReqCompra = `<button class="btn btn-sm btn-ptm-mid btn-aprobar"
                                    data-id="${row.IdSolicitudCompra}"
                                    data-folio="${row.FolioCompra}"
                                    data-OT="${row.OrdenTrabajo}"
                                    title="Generar Requisición">
                                    <i class="bi bi-cart-check"></i>
                                </button>`;
                                    break;
                                case "Espera Autorizacion":
                                    btnDetalleSolicitudCompra = `<button class="btn btn-sm btn-ptm-edit btn-ver-detalle"
                                        data-id="${row.IdSolicitudCompra}"
                                        data-folio="${row.FolioCompra}"
                                        title="Ver detalle">
                                        <i class="bi bi-eye"></i>
                                    </button>`;

                                    btnReqCompra = `<button class="btn btn-sm btn-ptm-mid btn-aprobar"
                                    data-id="${row.IdSolicitudCompra}"
                                    data-folio="${row.FolioCompra}"
                                    data-OT="${row.OrdenTrabajo}"
                                    title="Generar Requisición" disabled>
                                    <i class="bi bi-cart-check"></i>
                                </button>`;
                                    break;
                            }

                            return `${btnDetalleSolicitudCompra}${btnReqCompra}`
                        }
                    },
                    // Columna 2: Folio
                    {
                        data: "FolioCompra",
                        title: "Folio",
                        className: "text-center",
                        render: (data) => data
                            ? `<span class="badge btn-ptm-mid badge-custom"><i class="bi bi-cash-stack me-1"></i>${data}</span>`
                            : '<em class="text-muted">Sin folio</em>'
                    },
                    // Columna 3: OT
                    {
                        data: null,
                        title: "OT(s)",
                        className: "text-center",
                        render: function (data, type, row) {
                            if (!row.OrdenTrabajo)
                                return '<em class="text-muted">Sin OT</em>';

                            const folios = row.OrdenTrabajo
                                .split(',')
                                .map(f => f.trim())
                                .filter(f => f.length > 0);

                            const badgesHtml = folios
                                .map(folio => `<span class="badge btn-ptm-mid badge-custom me-1 mb-1"><i class="bi bi-cash-stack me-1"></i>${folio}</span>`)
                                .join('');

                            return `<div class="d-flex flex-wrap justify-content-center" title="${row.OrdenTrabajo}">
                                    ${badgesHtml}
                                    </div>`;
                        }
                    },
                    // Columna 3: Fecha Solicitud
                    {
                        data: "FechaSolicitud",
                        title: "Fecha Solicitud",
                        className: "text-center",
                        render: (data) => data || ''
                    },
                    // Columna 4: Estado
                    {
                        data: "Estatus",
                        title: "Estado",
                        className: "text-center",
                        render: (data) => {
                            if (!data) return '<em class="text-muted">—</em>';

                            const cfg = data === "No Aprobado"
                                ? { color: 'badge bg-danger text-white badge-custom', icon: 'x-circle' }
                                : { color: 'badge btn-ptm-mid badge-custom', icon: 'check2-circle' };

                            return `<span class="badge ${cfg.color} badge-custom">
                            <i class="bi bi-${cfg.icon} me-1"></i>
                            ${data}
                        </span>`;
                        }
                    },
                    // Columna 5: Usuario Solicita
                    {
                        data: "UsuarioSolicita",
                        title: "Usuario Solicita",
                        render: (data) => data
                            ? `<span class="badge btn-ptm-mid badge-custom">${data}</span>`
                            : 'N/A'
                    },
                    // Columna 6: Comentarios
                    {
                        data: "Comentarios",
                        title: "Comentarios",
                        render: (data) => data || '<em class="text-muted">Sin comentarios</em>'
                    },
                    // Columna 7: DocNum
                    {
                        data: "DocNum",
                        title: "Doc. SAP",
                        className: "text-center",
                        render: (data) => data
                            ? `<span class="badge bg-blue-ptm badge-custom"><i class="bi bi-file-earmark-check me-1"></i>${data}</span>`
                            : '<em class="text-muted">—</em>'
                    },
                    // Columna 8: DocEntry
                    {
                        data: "DocEntry",
                        title: "Doc. Entry",
                        className: "text-center",
                        render: (data) => data || '<em class="text-muted">—</em>'
                    },
                    // Columna 9: ResponseSap
                    {
                        data: "ResponseSap",
                        title: "SAP",
                        className: "text-center",
                        render: function (data) {

                            if (!data)
                                return '<em class="text-muted">—</em>';

                            const texto = data.length > 40
                                ? data.substring(0, 40) + '...'
                                : data;

                            const isError =
                                data.toLowerCase().includes('error') ||
                                data.toLowerCase().includes('warning');

                            return `
                            <span
                                class="badge ${isError ? 'bg-danger' : 'bg-success'} badge-custom"
                                title="${data}">
                                <i class="bi bi-${isError ? 'x-circle' : 'check-circle'} me-1"></i>
                                ${texto}
                            </span>`;
                        }
                    },
                    // Columna 10: Comentarios Rechazo
                    {
                        data: "ComentariosRechazo",
                        title: "Comentarios Rechazo",
                        render: (data) => data || '<em class="text-muted">Sin comentarios</em>'
                    }
                ],
                // ✅ COLUMNDEFS INLINE
                columnDefs: [
                    { className: "text-center", targets: '_all' },
                    { orderable: false, targets: [0, 1] },
                    { responsivePriority: 1, targets: 0 },
                    { responsivePriority: 2, targets: 1 },
                    { responsivePriority: 3, targets: 2 },
                    { responsivePriority: 4, targets: 4 },
                    { responsivePriority: 5, targets: 3 },
                    { responsivePriority: 6, targets: 5 },
                    { responsivePriority: 7, targets: 6 },
                    { responsivePriority: 8, targets: 7 },
                    { responsivePriority: 9, targets: 8 },
                    { responsivePriority: 10, targets: 9 }
                ],
                ordering: false,
                info: true,
                bPaginate: true,
                pageLength: 50,
                lengthMenu: [[10, 25, 50, 100, 200], [10, 25, 50, 100, 200]],
                language: {
                    lengthMenu: "Mostrar _MENU_ registros",
                    zeroRecords: "No se encontraron solicitudes de compra",
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
                    emptyTable: "No hay solicitudes de compra disponibles"
                },
                createdRow: (row, data) => {
                    $(row).attr('data-id-solicitud-compra', data.IdSolicitudCompra);
                    $(row).attr('data-folio', data.FolioCompra || '');
                    $(row).attr('data-estatus', data.Estatus || '');
                    $(row).attr('data-usuario', data.UsuarioSolicita || '');

                    $(row).data('solicitud-completa', {
                        idSolicitudCompra: data.IdSolicitudCompra,
                        folioCompra: data.FolioCompra,
                        fechaSolicitud: data.FechaSolicitud,
                        estatus: data.Estatus,
                        usuarioSolicita: data.UsuarioSolicita,
                        comentarios: data.Comentarios,
                        docNum: data.DocNum,
                        docEntry: data.DocEntry,
                        responseSap: data.ResponseSap
                    });
                },
                drawCallback: () => {
                    table.columns.adjust();
                }
            });

            // ✅ Manejo de resize con namespace
            $(window).off('resize.solicitudesCompra').on('resize.solicitudesCompra', () => {
                if ($.fn.DataTable.isDataTable('#tablaSolicitudesCompra')) {
                    const nuevoOffset = calcularHeaderOffset();
                    $('#tablaSolicitudesCompra').DataTable().fixedHeader.headerOffset(nuevoOffset);
                    $('#tablaSolicitudesCompra').DataTable().fixedHeader.adjust();
                }
            });

            return table;

        } catch (error) {
            AlertManager.mostrar('No es posible mostrar las solicitudes de compra: ' + error, 'warning');
            console.error('Error en llenarSolicitudesCompra:', error);
        }
    }

    llenarSolicitudesRefacciones(IdSolicitudCompra) {
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
                                    'ORDEN TRABAJO': 'bi bi-file-earmark-text',
                                    'CODIGO': 'bi bi-upc-scan',
                                    'ARTICULO': 'bi bi-box-seam',
                                    'CANT. REQUERIDA': 'bi bi-123',
                                    'CANT. A ENCARGAR': 'bi bi-cart-plus',

                                    'STOCK': 'bi bi-box-seam',
                                    'MIN': 'bi bi-arrow-down-circle',
                                    'MAX': 'bi bi-arrow-up-circle',

                                    'NIVEL URGENCIA': 'bi bi-exclamation-triangle-fill',
                                    'DESCRIPCION': 'bi bi-card-text',
                                    'FECHA SOLICITUD': 'bi bi-calendar-event',
                                    'ESTATUS': 'bi bi-flag-fill',
                                    'USUARIO SOLICITA': 'bi bi-person-fill'
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
                                '    <h5 class="mb-0"><i class="bi bi-list-task me-2" style="color:#0D6EFD;"></i>Detalle de Solicitud</h5>' +
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
                    url: `/${this.URLBase}/GetDetallesSolicitudCompraMP`,  // ⬅️ nuevo endpoint
                    type: "POST",
                    dataType: "json",
                    beforeSend: () => GlobalUtil.mostrarLoader(true),
                    complete: () => GlobalUtil.mostrarLoader(false),
                    data: (d) => {
                        return $.extend({}, d, {
                            "IdSolicitudCompra": IdSolicitudCompra || null
                        });
                    },
                    dataSrc: (json) => json.data
                },
                columns: [
                    {
                        className: 'dtr-control',
                        orderable: false,
                        data: null,
                        defaultContent: '',
                        width: '30px'
                    },

                    // OT
                    {
                        data: "OrdenTrabajo",
                        className: "text-center",
                        render: (data) =>
                            data
                                ? `<span class="badge bg-blue-ptm badge-custom">${data}</span>`
                                : ''
                    },

                    // Código
                    {
                        data: "CodigoArticulo",
                        className: "text-center",
                        render: (data) =>
                            data
                                ? `<small class="text-muted fw-semibold">${data}</small>`
                                : 'N/A'
                    },

                    // Artículo
                    {
                        data: "NombreArticulo",
                        render: (data) => data || 'N/A'
                    },

                    // Cantidad requerida
                    {
                        data: "CantidadRequerida",
                        className: "text-center fw-semibold",
                        render: (data) => data || 0
                    },

                    // Cantidad a encargar
                    {
                        data: "CantidadEncargar",
                        className: "text-center",
                        render: (data) =>
                            `<span class="badge bg-primary badge-custom">
                ${data || 0}
            </span>`
                    },

                    // Stock actual
                    {
                        data: "StockActual",
                        className: "text-center fw-semibold",
                        render: (data) =>
                            `<i class="bi bi-box-seam text-info me-1"></i>
             ${(data ?? 0).toLocaleString()}`
                    },

                    // Stock mínimo
                    {
                        data: "MinStock",
                        className: "text-center fw-semibold",
                        render: (data) =>
                            `<i class="bi bi-arrow-down-circle text-warning me-1"></i>
             ${(data ?? 0).toLocaleString()}`
                    },

                    // Stock máximo
                    {
                        data: "MaxStock",
                        className: "text-center fw-semibold",
                        render: (data) =>
                            `<i class="bi bi-arrow-up-circle text-success me-1"></i>
             ${(data ?? 0).toLocaleString()}`
                    },

                    // Nivel urgencia
                    {
                        data: "NivelUrgencia",
                        className: "text-center fw-semibold",
                        render: (data) => {

                            if (!data) return '';

                            switch (data) {

                                case 'Normal':
                                    return `
                        <i class="bi bi-check-circle-fill text-success me-1"></i>
                        Normal`;

                                case 'Bajo':
                                    return `
                        <i class="bi bi-exclamation-triangle-fill text-warning me-1"></i>
                        Bajo`;

                                case 'Critico':
                                case 'Crítico':
                                    return `
                        <i class="bi bi-exclamation-octagon-fill text-danger me-1"></i>
                        Crítico`;

                                default:
                                    return data;
                            }
                        }
                    },

                    // Descripción
                    {
                        data: "DescripcionNecesidad",
                        render: (data) => data || 'N/A'
                    },

                    // Fecha
                    {
                        data: "FechaSolicitud",
                        className: "text-center",
                        render: (data) => data || ''
                    },

                    // Estatus
                    {
                        data: "Estatus",
                        className: "all text-center",
                        render: (data) => {

                            if (!data) return '';

                            const map = {
                                'Pendiente': { color: 'bg-warning text-dark', icon: 'clock' },
                                'En Compra': { color: 'bg-primary', icon: 'cart-check' },
                                'Atendido': { color: 'bg-success', icon: 'check-circle' },
                                'Cancelado': { color: 'bg-danger', icon: 'x-circle' }
                            };

                            const cfg = map[data] || {
                                color: 'bg-secondary',
                                icon: 'circle'
                            };

                            return `
                <span class="badge ${cfg.color} badge-custom">
                    <i class="bi bi-${cfg.icon}"></i> ${data}
                </span>`;
                        }
                    },

                    // Usuario
                    {
                        data: "UsuarioSolicita",
                        render: (data) =>
                            data
                                ? `<span class="badge bg-blue-ptm badge-custom">${data}</span>`
                                : 'N/A'
                    }
                ],
                columnDefs: [
                    { orderable: false, targets: [0] },

                    // ocultar código y descripción
                    { visible: false, targets: [2, 10] },

                    { className: "text-center", targets: '_all' },

                    { responsivePriority: 1, targets: 0 },   // +
                    { responsivePriority: 2, targets: 12 },  // Estatus
                    { responsivePriority: 3, targets: 1 },   // OT
                    { responsivePriority: 4, targets: 3 },   // Artículo
                    { responsivePriority: 5, targets: 9 },   // Urgencia
                    { responsivePriority: 6, targets: 6 },   // Stock
                    { responsivePriority: 7, targets: 7 },   // Min
                    { responsivePriority: 8, targets: 8 },   // Max
                    { responsivePriority: 9, targets: 5 },   // Encargar
                    { responsivePriority: 10, targets: 4 },  // Requerida
                    { responsivePriority: 11, targets: 11 }, // Fecha
                    { responsivePriority: 12, targets: 13 }, // Usuario
                    { responsivePriority: 13, targets: 10 }, // Descripción
                    { responsivePriority: 14, targets: 2 }   // Código
                ],
                ordering: false,
                info: true,
                bPaginate: true,
                pageLength: 50,
                lengthMenu: [[10, 25, 50, 100, 200], [10, 25, 50, 100, 200]],
                language: {
                    lengthMenu: "Mostrar _MENU_ registros",
                    zeroRecords: "No se encontraron registros",
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
                    emptyTable: "No hay registros disponibles"
                },
                createdRow: function (row, data) {

                    $(row).attr('data-id-detalle', data.IdDetalle);
                    $(row).attr('data-id-solicitud-compra', data.IdSolicitudCompra);
                    $(row).attr('data-orden-trabajo', data.OrdenTrabajo);
                    $(row).attr('data-estatus', data.Estatus);

                    if (data.NivelUrgencia === "Critico" ||
                        data.NivelUrgencia === "Crítico") {

                        $(row).addClass("table-danger");
                    }
                    else if (data.NivelUrgencia === "Bajo") {

                        $(row).addClass("table-warning");
                    }
                },
                drawCallback: function () {
                    table.columns.adjust();
                    $("#SolRefModal").modal("show");
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
            AlertManager.mostrar('No es posible mostrar el detalle: ' + error, 'warning');
            console.error('Error en llenarSolicitudesRefacciones:', error);
        }
    }
    // ============================
    // ACCIONES
    // ============================
    completarSolicitudCompra($btn) {
        this.IdSolicitudCompra = $btn.data('idsolicitudcompra');
        // 👉 Aquí puedes abrir un modal de confirmación o llamar directo al endpoint
        AlertManager.mostrar(`¿Completar solicitud #${this.IdSolicitudCompra}?`, 'info');
    }

    cerrarSolicitudCompra($btn) {
        this.IdSolicitudCompra = $btn.data('idsolicitudcompra');
        // 👉 Aquí puedes abrir un modal de confirmación o llamar directo al endpoint
        AlertManager.mostrar(`¿Cerrar solicitud #${this.IdSolicitudCompra}?`, 'warning');
    }
}

// ========================================
// INICIALIZACIÓN
// ========================================
$(document).ready(function () {
    // ✅ SIEMPRE CREAR LA APP PARA ACCESO A EVENTOS Y MÉTODOS
    const app = new SolicitudCompraApp();
    app.inicializar();

    console.log('✅ SolicitudCompraApp disponible en window.AppSolicitudCompra');
    console.log('ℹ️ Vista actual: ' + (window.CURRENT_VIEW || 'no definida'));
});