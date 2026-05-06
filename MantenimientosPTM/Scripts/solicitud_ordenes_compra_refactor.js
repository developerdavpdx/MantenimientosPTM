// ========================================
// APLICACIÓN PRINCIPAL
// ========================================
class SolicitudCompraApp {
    constructor() {
        this.URLBase = "Almacen";
        this.datos_usuario = GlobalUtil.getDatosUsuario();
        this.compraManager = new CompraManager(this.URLBase, this.datos_usuario);
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
        UIManagerCompra.inicializarUI();
        this.compraManager.inicializar();
        this.configurarEventosFiltros();
        this.configurarEventos();
        this.configurarAutoCompletes();
        console.log('✅ Sistema de Solicitud de Compra inicializado correctamente');
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
            const IdSolicitudCompra = btn.data('id');
            const FolioCompra = btn.data('folio');

            $('#subtitleRequisicion').html(
                `<i class="bi bi-cash-stack me-1"></i> Folio: <strong>${FolioCompra}</strong>`
            );

            $('#formGenerarRequisicion').data('id-solicitud-compra', IdSolicitudCompra);
            $('#bodyRequisicionArticulos').empty();
            $('#formGenerarRequisicion')[0].reset();
            $('#formGenerarRequisicion').removeClass('was-validated');

            try {
                const response = await $.ajax({
                    url: `/${this.URLBase}/GetDetallesSolicitudCompraMP`,
                    type: 'POST',
                    data: { IdSolicitudCompra }
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
                    <td class="text-center fw-semibold">${item.CantidadEncargar || 0}</td>
                    <td>
                        <div class="sol-buscar-proveedor-wrap">
                            <input type="text" class="form-control-custom sol-buscar-proveedor"
                                   id="BuscarProveedor_${i}" placeholder="Buscar proveedor..." autocomplete="off">
                            <div id="sugerenciasProveedor_${i}" class="autocomplete-sugerencias"></div>
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
                
                articulos.push({
                    IdsDetalle: JSON.parse(fila.attr('data-idsdetalle')), // ✅ array de IDs
                    CodigoArticulo: fila.data('codigoarticulo'),
                    NombreArticulo: nombreArticulo,
                    CantidadTotal: parseInt(fila.find('td:eq(3)').text().trim()),
                    ...gestion.obtenerDatosFormulario()  // codigoProveedor, nombreProveedor
                });
            });

            if (proveedorFaltante) {
                AlertManager.mostrar('⚠️ Selecciona un proveedor para cada artículo.', 'warning');
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
                AlertManager.mostrar('⚠️ Completa todos los campos de contabilización.', 'warning');
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
                IdSolicitudCompra: $('#formGenerarRequisicion').data('id-solicitud-compra'),
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
            // ✅ Paso 1: Crear solicitud de compra con estatus "Espera Autorizacion"
            const responseInsert = await $.ajax({
                url: `/${this.URLBase}/InsertarSolicitudOrdenCompraMP`,
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                data: JSON.stringify({
                    Solicitudes: payload.Articulos.map(art => ({
                        IdSolicitud: art.IdsDetalle[0], // Usar el primer ID de detalle
                        CantidadEncargar: art.CantidadTotal
                    })),
                    Comentarios: "Solicitud enviada para autorización",
                    UsuarioSolicita: this.datos_usuario[0].EMAIL
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
            
            const responseEnviar = await $.ajax({
                url: `/${this.URLBase}/EnviarSolicitudCompraAutorizacion`,
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
data: JSON.stringify({ 
                    idSolicitudCompra: parseInt(idSolicitudCompra),
                    Articulos: payload.Articulos
                }),
                dataType: 'json'
            });

            if (responseEnviar.Status !== 'OK') {
                throw new Exception(responseEnviar.Message || "Error al enviar el correo de autorización.");
            }

            // ✅ Paso 3: Actualizar cabecera con centros de costo (sin crear PR en SAP aún)
            const payloadActualizar = {
                IdSolicitudCompra: parseInt(idSolicitudCompra),
                Articulos: payload.Articulos,
                Contabilizacion: payload.Contabilizacion
            };

            // No llamamos a CreateSolicitudCompra aquí, solo guardamos los centros de costo
            // La creación del PR en SAP se hará cuando se autorice la solicitud
            btn.html('<i class="bi bi-check-circle-fill me-1"></i> Solicitud enviada');

            AlertManager.mostrar('Solicitud enviada para autorización correctamente. Se notificará cuando sea procesada.', 'success', 'alertSolicitudCompraContainer');
            // ✅ Recargar DataTable
            $('#tablaSolicitudesCompra').DataTable().ajax.reload(null, false);

            setTimeout(() => {
                btn.prop('disabled', false)
                    .html('<i class="bi bi-floppy-fill me-1"></i> Guardar');
                $('#SolcribirModal').modal('hide');
            }, 2500);

        } catch (error) {
            console.error('Error en createSolCompra:', error);
            btn.prop('disabled', false)
                .html('<i class="bi bi-floppy-fill me-1"></i> Guardar');
            AlertManager.mostrar('Error al procesar la solicitud: ' + error.message || error, 'warning','alertSolicitudCompraContainer');
        }
    }

       
    _recargarTabla() {
        if ($.fn.DataTable.isDataTable('#tablaSolicitudesCompra')) {
            $('#tablaSolicitudesCompra').DataTable().ajax.reload();
        } else {
            this.compraManager.llenarSolicitudesCompra();
        }
    }
}

// ========================================
// GESTOR DE UI
// ========================================
class UIManagerCompra {
    static inicializarUI() {
        $("#SolicitudOrdenesCompraURL").addClass("selected-item");
        $("#AlmacenContainer").addClass("selected");
        $("#AlmacenContainer a").addClass("whiteText");
        $("#almacen-collapse").addClass("show");
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(el => new bootstrap.Tooltip(el));

        $('#FiltroFechaInicio').val(DateUtils.obtenerPrimerDiaMesActual());
        $('#FiltroFechaFin').val(DateUtils.obtenerUltimoDiaMesActual());
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
            if ($.fn.DataTable.isDataTable('#tablaSolicitudesCompra')) {
                $('#tablaSolicitudesCompra').DataTable().destroy();
            }

            function calcularHeaderOffset() {
                if (window.innerWidth < 541) return 200;
                if (window.innerWidth < 640) return 156;
                if (window.innerWidth < 992) return 158;
                if (window.innerWidth < 1155) return 125;
                else if (window.innerWidth < 1400) return 118;
                else return 113;
            }

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
                                    'FOLIO': 'bi bi-cash-stack',
                                    'FECHA SOLICITUD': 'bi bi-calendar-event',
                                    'ESTADO': 'bi bi-info-circle-fill',
                                    'USUARIO SOLICITA': 'bi bi-person-fill',
                                    'COMENTARIOS': 'bi bi-chat-left-text'
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
                                '      <i class="bi bi-cash-stack me-2" style="color: #0D6EFD;"></i>' +
                                '      Información adicional de la solicitud de compra' +
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
                            "FiltroFolio": $("#FiltroFolio").val() || null
                        });
                    },
                    dataSrc: (json) => json.data
                },
                columns: [
                    // 🎯 Columna 0: Control Responsive (+/-)
                    {
                        className: 'dtr-control text-center',
                        orderable: false,
                        data: null,
                        defaultContent: '',
                        width: '30px'
                    },
                    // ✅ Columna 1: Acciones
                    {
                        data: null,
                        orderable: false,
                        className: 'all text-center',
                        width: '80px',
                        render: function (data, type, row) {
                            return `<button class="btn btn-sm btn-primary btn-ver-detalle"
                                    data-id="${row.IdSolicitudCompra}"
                                    data-folio="${row.FolioCompra}"
                                    title="Ver detalle de solicitud">
                                    <i class="bi bi-eye"></i>
                                </button>
                                <button class="btn btn-sm btn-success btn-aprobar"
                                    data-id="${row.IdSolicitudCompra}"
                                    data-folio="${row.FolioCompra}"
                                    title="Generar Requisición">
                                    <i class="bi bi-cart-plus"></i>
                                </button>`;
                        }
                    },
                    // ✅ Columna 2: Folio
                    {
                        data: "FolioCompra",
                        title: "Folio",
                        className: "text-center",
                        render: (data) => data
                            ? `<span class="badge bg-primary badge-custom"><i class="bi bi-cash-stack me-1"></i>${data}</span>`
                            : '<em class="text-muted">Sin folio</em>'
                    },
                    // ✅ Columna 3: Fecha Solicitud
                    {
                        data: "FechaSolicitud",
                        title: "Fecha Solicitud",
                        className: "text-center",
                        render: (data) => data || ''
                    },
                    // ✅ Columna 4: Estado
                    {
                        data: "Estatus",
                        title: "Estado",
                        className: "all text-center",
                        render: (data) => {
                            if (!data) return '';
                            const map = {
                                'Pendiente': { color: 'bg-warning text-dark', icon: 'clock' },
                                'Aprobado': { color: 'bg-blue-ptm', icon: 'check2-circle' },
                                'Rechazado': { color: 'bg-danger', icon: 'x-circle' },
                                'Cancelado': { color: 'bg-secondary', icon: 'slash-circle' }
                            };
                            const cfg = map[data] || { color: 'bg-secondary', icon: 'circle' };
                            return `<span class="badge ${cfg.color} badge-custom">
                                    <i class="bi bi-${cfg.icon} me-1"></i>${data}
                                </span>`;
                        }
                    },
                    // ✅ Columna 5: Usuario Solicita
                    {
                        data: "UsuarioSolicita",
                        title: "Usuario Solicita",
                        render: (data) => data
                            ? `<span class="badge bg-blue-ptm badge-custom">${data}</span>`
                            : 'N/A'
                    },
                    // ✅ Columna 6: Comentarios
                    {
                        data: "Comentarios",
                        title: "Comentarios",
                        render: (data) => data || '<em class="text-muted">Sin comentarios</em>'
                    },
                    // ✅ Columna 7: DocNum
                    {
                        data: "DocNum",
                        title: "Doc. SAP",
                        className: "text-center",
                        render: (data) => data
                            ? `<span class="badge bg-blue-ptm badge-custom"><i class="bi bi-file-earmark-check me-1"></i>${data}</span>`
                            : '<em class="text-muted">—</em>'
                    },
                    // ✅ Columna 8: DocEntry
                    {
                        data: "DocEntry",
                        title: "Doc. Entry",
                        className: "text-center",
                        render: (data) => data || '<em class="text-muted">—</em>'
                    },
                    // ✅ Columna 9: ResponseSap
                    {
                        data: "ResponseSap",
                        title: "Respuesta SAP",
                        render: (data) => {
                            if (!data) return '<em class="text-muted">—</em>';
                            const isError = data.toLowerCase().includes('warning');
                            return `<span class="badge ${isError ? 'bg-danger' : 'bg-success'} badge-custom">
                    <i class="bi bi-${isError ? 'x-circle' : 'check-circle'} me-1"></i>
                    ${data.length > 40 ? data.substring(0, 40) + '...' : data}
                </span>`;
                        }
                    }
                ],
                columnDefs: [
                    { className: "text-center", targets: '_all' },
                    { orderable: false, targets: [0, 1] },

                    // Prioridades responsive
                    { responsivePriority: 1, targets: 0 },  // Control +/-
                    { responsivePriority: 2, targets: 1 },  // Acciones
                    { responsivePriority: 3, targets: 2 },  // Folio
                    { responsivePriority: 4, targets: 4 },  // Estado
                    { responsivePriority: 5, targets: 3 },  // Fecha Solicitud
                    { responsivePriority: 6, targets: 5 },  // Usuario Solicita
                    { responsivePriority: 7, targets: 6 },  // Comentarios
                    { responsivePriority: 8, targets: 7 },  // DocNum
                    { responsivePriority: 9, targets: 8 },  // DocEntry
                    { responsivePriority: 10, targets: 9 }  // ResponseSap
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
                    sSearch: "Buscar:",
                    oPaginate: {
                        sFirst: "Primero",
                        sLast: "Último",
                        sNext: "Siguiente",
                        sPrevious: "Anterior"
                    },
                    emptyTable: "No hay solicitudes de compra disponibles"
                },
                createdRow: function (row, data) {
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
                        docNum: data.DocNum,      // ⬅️ nuevo
                        docEntry: data.DocEntry,    // ⬅️ nuevo
                        responseSap: data.ResponseSap  // ⬅️ nuevo
                    });
                },
                drawCallback: function () {
                    table.columns.adjust();
                }
            });

            $(window).on('resize', function () {
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
                    // 🎯 Columna 0: Control Responsive (+/-)
                    {
                        className: 'dtr-control',
                        orderable: false,
                        data: null,
                        defaultContent: '',
                        width: '30px'
                    },
                    // ✅ Columna 1: Orden Trabajo
                    {
                        data: "OrdenTrabajo",
                        className: "text-center",
                        render: (data) =>
                            data ? `<span class="badge bg-blue-ptm badge-custom">${data}</span>` : ''
                    },
                    // ✅ Columna 2: Código Artículo
                    {
                        data: "CodigoArticulo",
                        className: "text-center",
                        render: (data) =>
                            data ? `<small class="text-muted fw-semibold">${data}</small>` : 'N/A'
                    },
                    // ✅ Columna 3: Nombre Artículo
                    {
                        data: "NombreArticulo",
                        render: (data) => data || 'N/A'
                    },
                    // ✅ Columna 4: Cantidad Requerida
                    {
                        data: "CantidadRequerida",
                        className: "text-center fw-semibold",
                        render: (data) => data || 0
                    },
                    // ✅ Columna 5: Cantidad a Encargar
                    {
                        data: "CantidadEncargar",
                        className: "text-center",
                        render: (data) =>
                            `<span class="badge bg-primary badge-custom">${data || 0}</span>`
                    },
                    // ✅ Columna 6: Nivel Urgencia
                    {
                        data: "NivelUrgencia",
                        className: "text-center",
                        render: (data) => {
                            if (!data) return '';
                            switch (data) {
                                case 'Normal':
                                    return `<span class="badge bg-secondary badge-custom">
                                    <i class="bi bi-circle-fill me-1"></i>Normal</span>`;
                                case 'Urgente':
                                    return `<span class="badge bg-warning text-dark badge-custom">
                                    <i class="bi bi-exclamation-triangle-fill me-1"></i>Urgente</span>`;
                                case 'Crítico':
                                case 'Critico':
                                    return `<span class="badge bg-danger badge-custom">
                                    <i class="bi bi-exclamation-octagon-fill me-1"></i>Crítico</span>`;
                                default:
                                    return `<span class="badge bg-secondary badge-custom">${data}</span>`;
                            }
                        }
                    },
                    // ✅ Columna 7: Descripción Necesidad
                    {
                        data: "DescripcionNecesidad",
                        render: (data) => data || 'N/A'
                    },
                    // ✅ Columna 8: Fecha Solicitud
                    {
                        data: "FechaSolicitud",
                        className: "text-center",
                        render: (data) => data || ''
                    },
                    // ✅ Columna 9: Estatus
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
                            const cfg = map[data] || { color: 'bg-secondary', icon: 'circle' };
                            return `<span class="badge ${cfg.color} badge-custom">
                                    <i class="bi bi-${cfg.icon}"></i> ${data}
                                </span>`;
                        }
                    },
                    // ✅ Columna 10: Usuario Solicita
                    {
                        data: "UsuarioSolicita",
                        render: (data) =>
                            data ? `<span class="badge bg-blue-ptm badge-custom">${data}</span>` : 'N/A'
                    }
                ],
                columnDefs: [
                    { orderable: false, targets: [0] },
                    { visible: false, targets: [2, 7, 9] },  // Código y Descripción ocultos por default
                    { className: "text-center", targets: '_all' },

                    // 🎯 Prioridades Responsive
                    { responsivePriority: 1, targets: 0 },  // Control +/-
                    { responsivePriority: 2, targets: 9 },  // Estatus
                    { responsivePriority: 3, targets: 1 },  // Orden Trabajo
                    { responsivePriority: 4, targets: 3 },  // Artículo
                    { responsivePriority: 5, targets: 5 },  // Cant. Encargar
                    { responsivePriority: 6, targets: 4 },  // Cant. Requerida
                    { responsivePriority: 7, targets: 6 },  // Nivel Urgencia
                    { responsivePriority: 8, targets: 8 },  // Fecha Solicitud
                    { responsivePriority: 9, targets: 10 },  // Usuario Solicita
                    { responsivePriority: 10, targets: 7 },  // Descripción
                    { responsivePriority: 11, targets: 2 },  // Código
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
    const app = new SolicitudCompraApp();
    app.inicializar();
});