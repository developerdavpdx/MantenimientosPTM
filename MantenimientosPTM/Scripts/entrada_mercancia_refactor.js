// ========================================
// APLICACIÓN - ENTRADA DE MERCANCÍA
// ========================================
class EntradaMercanciaApp {
    constructor() {
        this.URLBase = "Almacen";
        this.datos_usuario = GlobalUtil.getDatosUsuario();
        this.entradaManager = new EntradaMercanciaManager(this.URLBase, this.datos_usuario);

        // Exponer globalmente para acceso externo
        window.AppEntradaMercancia = this;

        this._filtroTimer = null;

    }

    inicializar() {
        UIManager.inicializarUI();
        this.entradaManager.inicializar();
        this.configurarEventosFiltros();
        this.configurarEventos();
        this.initHubSolicitudRefacciones();

        console.log(this.datos_usuario);
        console.log('✅ Sistema de Entrada de Mercancía inicializado correctamente');
    }

    configurarEventosFiltros() {
        // Cambio automático en fechas, planta y urgencia
        //$('#FiltroFechaInicio, #FiltroFechaFin, #FiltroPlanta').on('change', () => {
        //    if (!this._validarRangoFechas()) return;
        //    this._recargarTabla();
        //});



        $('#FiltroFechaInicio, #FiltroFechaFin, #FiltroPlanta').on('change', () => {
            if (!this._validarRangoFechas()) return;

            clearTimeout(this._filtroTimer);
            this._filtroTimer = setTimeout(() => {
                this._recargarTabla();
            }, 600); // espera 600ms después del último cambio
        });

        // Orden de trabajo — solo al presionar Enter
        $('#FiltroOC').on('keypress', (e) => {
            if (e.which === 13) {
                e.preventDefault();
                this._recargarTabla();
            }
        });

        // Botón Aplicar
        $('#btnAplicarFiltros').on('click', () => {
            if (!this._validarRangoFechas()) return;
            this._recargarTabla();
        });

        // Botón Limpiar
        $('#btnLimpiarFiltros').on('click', () => {
            $('#FiltroOrdenTrabajo, #FiltroFechaInicio, #FiltroFechaFin, #FiltroPlanta, #FiltroNivelUrgencia').val('');
            this._recargarTabla();
        });
    }

    configurarEventos() {

        $("#btnGenerarEntradaMercancia").on("click", () => {

            this.entradaManager.currentOC = {};
            this.entradaManager.currentDocLinesOC = {};
            this.entradaManager.clearModal("#entradaMercancia");

            this._setFechasActuales();
            $('#entradaMercancia').modal('show');

        });

        // Abrir modal de entrada de mercancía
        $(document).on('click', '.btn-entrada-mercancia', (e) => {
            const $btn = $(e.currentTarget);
            $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-1"></span>');

            $("#SaveEM").attr("DocEntry", "");

            this.entradaManager.currentOC = {};
            this.entradaManager.currentDocLinesOC = {};
            this.entradaManager.clearModal("#entradaMercancia");

            const id = $btn.data('id');
            const DocEntry = $btn.data('docentry');
            const DocNum = $btn.data('docnum');
            const CardCode = $btn.data('cardcode');
            const CardName = $btn.data('cardname');

            const fila = $(`#tablaSolicitudesRefacciones tr:has(button[data-id="${id}"])`);
            const solicitante = fila.find('td:eq(7)').text();
            $("#nombre").val(solicitante);

            this._setFechasActuales();

            $("#nombreProv").val(CardName);
            $("#codigoProv").val(CardCode);
            $("#ordenCompra").val(DocNum);
            this.entradaManager.getDetalleOC(DocEntry);

            $("#inputValMoneda").val(17.23);

            $("#SaveEM").attr("DocEntry", DocEntry);

            $('#entradaMercancia').modal('show');
            $btn.prop('disabled', false).html('<i class="bi bi-box-arrow-in-down"></i>');
        });

        $(document).on("change", ".select-docline", (e) => {
            const $check = $(e.currentTarget);
            const linea = $check.data("linea");
            const isCheck = $check.prop("checked");

            if (isCheck) {
                $(`#InputCantidad${linea}`).prop("disabled", false);
                $(`#InputLote${linea}`).prop("disabled", false);
                $(`#InputFolioFact${linea}`).prop("disabled", false);
            }
            else {
                $(`#InputCantidad${linea}`).prop("disabled", true);
                $(`#InputLote${linea}`).prop("disabled", true);
                $(`#InputFolioFact${linea}`).prop("disabled", true);
            }
        });

        // Guardar entrada de mercancía
        $("#SaveEM").on("click", () => {
            const $btn = $("#SaveEM");
            $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-1"></span>Guardando...');

            const nombreProv = $("#nombreProv").val().trim();
            const codigoProv = $("#codigoProv").val().trim();
            const ordenCompra = $("#ordenCompra").val().trim();

            if (!nombreProv || !codigoProv || !ordenCompra) {
                AlertManager.mostrar('Por favor complete los campos: Proveedor y Orden de Compra.', 'warning');
                $btn.prop('disabled', false).html('<i class="bi bi-floppy-fill me-1"></i> Guardar');
                return;
            }

            if (!this.entradaManager.currentDocLinesOC || this.entradaManager.currentDocLinesOC.length === 0) {
                AlertManager.mostrar('No hay artículos en la orden de compra para generar la entrada.', 'warning');
                $btn.prop('disabled', false).html('<i class="bi bi-floppy-fill me-1"></i> Guardar');
                return;
            }

            //const lineas = this.entradaManager.currentDocLinesOC.map(e => ({
            //    NumeroLinea: e.Linea,
            //    Cantidad: e.Cantidad,
            //    PrecioUnitario: e.PrecioU
            //}));

            const lineas = this.entradaManager.obtenerFilasSeleccionadas();

            console.log("Articulos seleccionados:");
            console.log(lineas);

            const DocEntryOC = $("#SaveEM").attr("DocEntry");
            console.log("DocEntryOC", DocEntryOC);

            const payload = {
                DocEntryOrdenCompra: DocEntryOC,
                Lineas: lineas
            };

            console.log("Request entrada mercancía:", payload);

            this.entradaManager.postCreateEntradaMercancia(payload, () => {
                $btn.prop('disabled', false).html('<i class="bi bi-floppy-fill me-1"></i> Guardar');
            });
        });


        $("#btnGuardarRech").on("click", () => {
            let motivoRecha = $("#motivoRech").value();
            let comentarios = $("#CommentRech").value();
        });
    }

    // ============================
    // HELPERS PRIVADOS
    // ============================
    _validarRangoFechas() {
        const fechaInicio = $('#FiltroFechaInicio').val();
        const fechaFin = $('#FiltroFechaFin').val();

        if (fechaInicio && fechaFin && new Date(fechaInicio) > new Date(fechaFin)) {
            AlertManager.mostrar('La fecha de inicio no puede ser mayor a la fecha de fin.', 'warning');
            return false;
        }
        return true;
    }

    _recargarTabla() {
        if ($.fn.DataTable.isDataTable('#tablaSolicitudesRefacciones')) {
            $('#tablaSolicitudesRefacciones').DataTable().ajax.reload();
        } else {
            this.entradaManager.llenarOrdenesCompra();
        }
    }

    _setFechasActuales() {
        const fechaHoy = this._getFechaHoy();
        $('#FechaCount').val(fechaHoy);
        $('#FechaDoc').val(fechaHoy);
    }

    _getFechaHoy() {
        const hoy = new Date();
        const año = hoy.getFullYear();
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        const dia = String(hoy.getDate()).padStart(2, '0');
        return `${año}-${mes}-${dia}`;
    }

    initHubSolicitudRefacciones() {
        var hubRefacciones = $.connection.mantenimientoHub;

        hubRefacciones.client.actualizarTablaSolicitudRefacciones = function () {
            $('#tablaSolicitudesRefacciones').DataTable().ajax.reload(null, false);
            console.warn("Actualización recibida por SignalR...");
        };

        $.connection.hub.start().done(function () {
            console.log("SignalR conectado");
        });

        $.connection.hub.reconnecting(function () {
            console.warn("SignalR reconectando... 🔄");
        });

        $.connection.hub.reconnected(function () {
            console.info("SignalR reconectado ✔");
            $('#tablaSolicitudesRefacciones').DataTable().ajax.reload(null, false);
        });

        $.connection.hub.disconnected(function () {
            console.error("SignalR desconectado ❌");
            setTimeout(function () {
                $.connection.hub.start();
            }, 5000);
        });
    }
}


// ========================================
// GESTOR DE UI
// ========================================
class UIManager {
    static inicializarUI() {
        $("#EntradaMercanciaURL").addClass("selected-item");
        $("#AlmacenContainer").addClass("selected");
        $("#AlmacenContainer a").addClass("whiteText");
        $("#almacen-collapse").addClass("show");

        this.inicializarTooltips();

        $('#FiltroFechaInicio').val(DateUtils.obtenerPrimerDiaMesActual());
        $('#FiltroFechaFin').val(DateUtils.obtenerUltimoDiaMesActual());
    }

    static inicializarTooltips() {
        const tooltipTriggerList = [].slice.call(
            document.querySelectorAll('[data-bs-toggle="tooltip"]')
        );
        tooltipTriggerList.map(el => new bootstrap.Tooltip(el));
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
                if (currentRequest) currentRequest.abort();

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
                            const content = renderItem ? renderItem(item) : item;
                            list.append(`
                                <button type="button" class="list-group-item list-group-item-action"
                                    data-val='${item[idValor]}' data-item='${JSON.stringify(item)}'>
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
// GESTOR DE ENTRADA DE MERCANCÍA
// ========================================
class EntradaMercanciaManager {
    constructor(URLBase, datos_usuario) {
        this.URLBase = URLBase;
        this.datos_usuario = datos_usuario;
        this.currentOC = {};
        this.currentDocLinesOC = {};
    }

    inicializar() {
        // Autocomplete Orden de Compra
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
            (item) => `
                <div class="d-flex justify-content-between">
                    <span>${item.DocNum}</span>
                    <small class="text-muted">Proveedor ${item.CardCode}</small>
                </div>
            `,
            "DocNum"
        );

        this.llenarOrdenesCompra();
        console.log('✅ EntradaMercanciaManager inicializado correctamente');
    }

    // ============================
    // TABLA DE ÓRDENES DE COMPRA
    // ============================
    llenarOrdenesCompra() {
        try {
            $('#filaVacia').remove();

            if ($.fn.DataTable.isDataTable('#tablaOrdenesCompra')) {
                $('#tablaOrdenesCompra').DataTable().destroy();
            }

            function calcularHeaderOffset() {
                if (window.innerWidth < 768) return 160;
                else if (window.innerWidth < 1400) return 150;
                else return 113;
            }

            const table = $('#tablaOrdenesCompra').DataTable({
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
                                    'N° OC': 'bi bi-hash',
                                    'PROVEEDOR': 'bi bi-building',
                                    'CÓDIGO PROVEEDOR': 'bi bi-upc',
                                    'FECHA DOCUMENTO': 'bi bi-calendar-event',
                                    'FECHA VENCIMIENTO': 'bi bi-calendar-x',
                                    'COMENTARIOS': 'bi bi-chat-left-text',
                                    'ACCIONES': 'bi bi-lightning-fill'
                                };
                                return iconos[normalizar(titulo)] || 'bi bi-circle-fill';
                            }

                            let detallesHtml = '';
                            $.each(hiddenColumns, function (i, col) {
                                const iconClass = obtenerIcono(col.title);
                                const valueContent = col.data || '<em class="text-muted">Sin información</em>';
                                detallesHtml +=
                                    '<div class="row mb-3 py-2 border-bottom align-items-center">' +
                                    '  <div class="col-5">' +
                                    `    <i class="${iconClass} me-2" style="font-size:1.3rem; color:#0D6EFD;"></i>` +
                                    `    <strong>${col.title}</strong>` +
                                    '  </div>' +
                                    '  <div class="col-7">' +
                                    `    <span class="badge px-3 py-2" style="background-color:#F2F2F2; color:#333;">${valueContent}</span>` +
                                    '  </div>' +
                                    '</div>';
                            });

                            return '<div class="card shadow-sm mt-3">' +
                                '  <div class="card-header bg-light">' +
                                '    <h5 class="mb-0"><i class="bi bi-file-earmark-text me-2" style="color:#0D6EFD;"></i>Detalle de Orden de Compra</h5>' +
                                '  </div>' +
                                `  <div class="card-body">${detallesHtml}</div>` +
                                '  <div class="card-footer bg-light text-muted">' +
                                `    <small>Última actualización: ${new Date().toLocaleDateString()}</small>` +
                                '  </div>' +
                                '</div>';
                        }
                    }
                },
                ajax: {
                    url: `/${this.URLBase}/GetOrdenesCompra`,
                    type: "POST",
                    dataType: "json",
                    beforeSend: () => GlobalUtil.mostrarLoader(true),
                    complete: () => GlobalUtil.mostrarLoader(false),
                    data: (d) => $.extend({}, d, {
                        "FiltroOC": $("#FiltroOC").val() || null,
                        "FiltroFechaInicio": $("#FiltroFechaInicio").val() || null,
                        "FiltroFechaFin": $("#FiltroFechaFin").val() || null,
                        "FiltroPlanta": $("#FiltroPlanta").val() || null,
                    }),
                    dataSrc: function (json) {
                        return json.data;
                    }
                },
                columns: [
                    // Columna 0: Control Responsive (+/-)
                    {
                        className: 'dtr-control',
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
                        render: (data, type, row) => {
                            const tipoUsuario = this.datos_usuario[0].TIPOUSUARIO;
                            const esAdmin = tipoUsuario === "AdminMtto" || tipoUsuario === "Administrador";

                            if (!esAdmin) return '';

                            const dataAttrs = `
                            data-docentry="${row.DocEntry || ''}"
                            data-docnum="${row.DocNum || ''}"
                            data-cardcode="${row.CardCode || ''}"
                            data-cardname="${row.CardName || ''}"`;

                            return `<button class="btn btn-sm btn-success btn-entrada-mercancia"
                            data-bs-toggle="tooltip" title="Generar Entrada de Mercancía" ${dataAttrs}>
                            <i class="bi bi-box-arrow-in-down"></i>
                        </button>`;
                        }
                    },
                    // Columna 2: N° OC
                    {
                        data: "DocNum",
                        className: "text-center",
                        render: (data) => data
                            ? `<span class="badge bg-blue-ptm badge-custom"><i class="bi bi-hash me-1"></i>${data}</span>`
                            : ''
                    },
                    // Columna 3: Código Proveedor
                    {
                        data: "CardCode",
                        className: "text-center",
                        render: (data) => data
                            ? `<span class="badge bg-secondary badge-custom">${data}</span>`
                            : 'N/A'
                    },
                    // Columna 4: Proveedor
                    {
                        data: "CardName",
                        render: (data) => data || 'N/A'
                    },
                    // Columna 5: Fecha Documento
                    {
                        data: "DocDate",
                        className: "text-center",
                        render: (data) => data
                            ? `<span><i class="bi bi-calendar-event me-1 text-muted"></i>${data}</span>`
                            : ''
                    },
                    // Columna 6: Fecha Vencimiento
                    {
                        data: "DocDueDate",
                        className: "text-center",
                        render: (data) => data
                            ? `<span><i class="bi bi-calendar-x me-1 text-muted"></i>${data}</span>`
                            : ''
                    },
                    // Columna 7: Comentarios
                    {
                        data: "Comments",
                        render: (data) => data
                            ? `<span class="text-truncate d-inline-block" style="max-width:200px;" title="${data}">${data}</span>`
                            : '<em class="text-muted">Sin comentarios</em>'
                    }
                ],
                columnDefs: [
                    { orderable: false, targets: [0, 1] },
                    { visible: false, targets: [3] },           // Código proveedor oculto por defecto
                    { className: "text-center", targets: [0, 1, 2, 5, 6] },

                    // Prioridades Responsive
                    { responsivePriority: 1, targets: 0 },    // Control +/-
                    { responsivePriority: 2, targets: 1 },    // Acciones
                    { responsivePriority: 3, targets: 2 },    // N° OC
                    { responsivePriority: 4, targets: 4 },    // Proveedor
                    { responsivePriority: 5, targets: 5 },    // Fecha Documento
                    { responsivePriority: 6, targets: 6 },    // Fecha Vencimiento
                    { responsivePriority: 7, targets: 7 },    // Comentarios
                    { responsivePriority: 8, targets: 3 },    // Código Proveedor
                ],
                ordering: false,
                info: true,
                bPaginate: true,
                pageLength: 50,
                lengthMenu: [[10, 25, 50, 100, 200], [10, 25, 50, 100, 200]],
                language: {
                    lengthMenu: "Mostrar _MENU_ registros",
                    zeroRecords: "No se encontraron órdenes de compra",
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
                    emptyTable: "No hay órdenes de compra disponibles"
                },
                createdRow: function (row, data) {
                    $(row).attr('data-doc-entry', data.DocEntry);
                    $(row).attr('data-doc-num', data.DocNum);
                    $(row).attr('data-card-code', data.CardCode);
                },
                drawCallback: function () {
                    table.columns.adjust();
                }
            });

            $(window).on('resize', function () {
                if ($.fn.DataTable.isDataTable('#tablaOrdenesCompra')) {
                    const nuevoOffset = calcularHeaderOffset();
                    $('#tablaOrdenesCompra').DataTable().fixedHeader.headerOffset(nuevoOffset);
                    $('#tablaOrdenesCompra').DataTable().fixedHeader.adjust();
                }
            });

            return table;

        } catch (error) {
            AlertManager.mostrar('No es posible mostrar las órdenes de compra: ' + error, 'warning');
            console.error('Error en llenarOrdenesCompra:', error);
        }
    }
    // ============================
    // DETALLE DE ORDEN DE COMPRA
    // ============================
    async getDetalleOC(docEntry) {
        try {
            const response = await $.ajax({
                url: `/${this.URLBase}/GetOrdenDetalleOC`,
                method: 'GET',
                data: { DocEntry: docEntry },
                dataType: 'json'
            });

            if (response.Status === "OK") {
                const data = JSON.parse(response.Data);
                this.currentDocLinesOC = data;
                this.llenarTablaOC(data);
            }
        } catch (error) {
            console.error(error);
            AlertManager.mostrar('No es posible obtener el detalle de la OC: ' + error, 'warning');
        }
    }

    llenarTablaOC(items) {
        console.log("Artículos OC:", items);
        const tbody = $("#tablaArticulos tbody");
        tbody.empty();

        items.forEach(it => {
            const {
                Linea, NArticulo, Descripcion, Detalles,
                Cantidad, PrecioU, PorDesc, IVAImporte,
                Total, Almacen, Departamento, Proceso,
                Gastos, Cedes, CodOp, Unidad, ArtUnidad,
                FolioFact, Lote
            } = it;
            //<td class="detalles" >${Detalles}</td>
            tbody.append(`
                <tr>
                    <td class="text-center">  
                        <input type="checkbox" class="select-docline" value="" data-linea=${Linea} id="checkArt${Linea}">
                    </td>
                    <td class="text-center linea">${Linea}</td>
                    <td class="itemcode">${NArticulo}</td>
                    <td class="desc">${Descripcion}</td>
                    <td class="cantidad" ><input style="width:60px" type="number" value="0" max="${Cantidad}" id="InputCantidad${Linea}" disabled > </td>
                    <td class="lote" ><input style="width:60px" type="text" value="" id="InputLote${Linea}" disabled > </td>
                    <td class="sap-yellow foliofac"><input style="width:60px" type="text" value="" id="InputFolioFact${Linea}" disabled > </td>
                    <td class="preciou">${PrecioU}</td>
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
                </tr>
            `);
        });
    }

    // ============================
    // CREAR ENTRADA DE MERCANCÍA
    // ============================
    async postCreateEntradaMercancia(payload, onComplete) {
        try {
            GlobalUtil.mostrarLoader(true);

            const response = await $.ajax({
                url: `/${this.URLBase}/GenerarEntradaMercancia`,
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                data: JSON.stringify(payload),
                dataType: 'json'
            });

            console.log("Respuesta entrada mercancía:", response);

            if (response.Status === "OK") {
                const data = JSON.parse(response.Data);
                AlertManager.mostrar(`Entrada de Mercancía generada correctamente. DocNum: ${data.DocNum}`);
                $("#entradaMercancia").modal("hide");
                this.clearModal("#entradaMercancia");
                $('#tablaSolicitudesRefacciones').DataTable().ajax.reload(null, false);
            } else {
                AlertManager.mostrar(response.Message || 'Error al generar la entrada de mercancía.', 'warning');
            }
        } catch (error) {
            console.error(error);
            AlertManager.mostrar('Error al generar la entrada de mercancía: ' + error, 'warning');
        } finally {
            GlobalUtil.mostrarLoader(false);
            if (onComplete) onComplete();
        }
    }

    // ============================
    // UTILIDADES DE MODAL
    // ============================
    clearModal(modal) {
        const $modal = $(modal);

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

        // Valores por defecto del modal de entrada
        $modal.find('#NoEntrada').val('231244');
        $modal.find('#inputMonedaSN').val('Moneda SN');
        $modal.find('#inputDivisa').val('USD');

        $modal.find('.list-group').empty().addClass('d-none');
        $modal.find('.modal-error-msg invalid-feedback').hide();
        $modal.find('.is-invalid, .is-valid').removeClass('is-invalid is-valid');
        $modal.find('table tbody').empty();
    }


  
    /**
     * Obtiene los datos de las filas seleccionadas (línea, cantidad, precio unitario)
     * @returns {Array} Array de objetos con los datos seleccionados
     */
    obtenerFilasSeleccionadas() {
        const filasSeleccionadas = [];

        // Recorrer todos los checkboxes seleccionados
        $('#tablaArticulos .select-docline:checked').each(function () {
            const $checkbox = $(this);
            const $fila = $checkbox.closest('tr');

            // Obtener datos de la fila
            const linea = $fila.find('.linea').text().trim();
            const code = $fila.find('.itemcode').text().trim();
            const cantidad = parseInt($fila.find('.cantidad input').val()) || 0;
            const lote = parseInt($fila.find('.lote input').val()) || '';
            const folio = parseInt($fila.find('.folioFact input').val()) || '';
            const precioUnitario = parseFloat($fila.find('.preciou').text().trim()) || 0;

            filasSeleccionadas.push({
                NumeroLinea: linea,
                Cantidad: cantidad,
                PrecioUnitario: precioUnitario,
                ItemCode: code,
                Lote: lote,
                Folio: folio
            });
        });

        return filasSeleccionadas;
    }

}


// ========================================
// INICIALIZACIÓN
// ========================================
$(document).ready(function () {
    const app = new EntradaMercanciaApp();
    app.inicializar();

    window.HeaderFijoGlobalManager.crear(
        '.card-header.header-fijo-custom',
        '.position-relative.header-custom',
        'headerEntradaMercancia',
        {
            topOffset: 45,
            backgroundColor: 'white',
            boxShadow: '0 4px 12px rgba(0, 88, 161, 0.3)',
            animacion: true
        }
    );
});