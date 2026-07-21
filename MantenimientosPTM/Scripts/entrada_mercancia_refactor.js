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
            $('#FiltroOC, #FiltroCN, #FiltroFechaInicio, #FiltroFechaFin, #FiltroPlanta').val('');
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
        $(document).on('click', '.btn-entrada-mercancia', async (e) => {
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

            await this.ObtenerFacturasPTM(DocNum);

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
            const fechaDoc = $("#FechaDoc").val();

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

            const lineas = this.entradaManager.obtenerFilasSeleccionadas();

            console.log("Articulos seleccionados:");
            console.log(lineas);

            const DocEntryOC = $("#SaveEM").attr("DocEntry");
            console.log("DocEntryOC", DocEntryOC);

            const payload = {
                DocEntryOrdenCompra: DocEntryOC,
                fechaDoc: fechaDoc,
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

        // Reemplazo del handler .radio-factura
        $(document).on("click", ".radio-factura", (e) => {
            const $radio = $(e.currentTarget);

            // Extraer todos los atributos data-* en un objeto
            const datos = {};
            if ($radio && $radio.length) {
                const attrs = $radio[0].attributes;
                for (let i = 0; i < attrs.length; i++) {
                    const a = attrs[i];
                    if (a && a.name && a.name.indexOf('data-') === 0) {
                        const key = a.name.slice(5); // quita 'data-'
                        datos[key] = a.value;
                    }
                }
            }

            // Obtener el valor de data-factura (fallback con jQuery.data)
            const factura = datos['factura'] || $radio.data('factura') || '';

            // Rellenar todos los inputs .input-folio dentro de #tablaArticulos con data-factura
            $('#tablaArticulos').find('.input-folio').each(function () {
                $(this).val(factura);
                // mantener también en atributo data-factura para referencia
                $(this).attr('data-factura', factura);
            });

            // (Opcional) si quieres exponer los demás datos en cada fila, podríamos setear
            // data-oc, data-folio, data-total, data-rfcemisor en cada input-folio:
            $('#tablaArticulos').find('.input-folio').each(function () {
                if (datos['oc']) $(this).attr('data-oc', datos['oc']);
                if (datos['folio']) $(this).attr('data-folio', datos['folio']);
                if (datos['total']) $(this).attr('data-total', datos['total']);
                if (datos['rfcemisor']) $(this).attr('data-rfcemisor', datos['rfcemisor']);
            });

            $("#inputDivisa").val(datos['moneda']);

            // Parsear la fecha: de '2026-06-22 09:54:29.000' a '2026-06-22'
            const fechaFactura = datos['fecha'] ? datos['fecha'].split(' ')[0] : '';
            $("#FechaDoc").val(fechaFactura);

        });
    }

    async ObtenerFacturasPTM(OrdenCompra) {
        //Se realiza la peticion para obtener las facturas
        const responseFacturas = await $.ajax({
            url: `/${this.URLBase}/ObtenerFacturasPTM`,
            type: 'GET',
            data: {
                oc: OrdenCompra
            }
        });

        //Se comienzan a colocar las cards mostrando las facturas ligadas a OC
        //Parseamos la data obtenida
        const dataFacturas = JSON.parse(responseFacturas.Data);
        const facturas = dataFacturas.data.facturas; //Obtenemos las facturas
        let htmlFacturas = '';
        let badgeEstado = 'bg-success';

        facturas.forEach(f => {

            //Seleccion tipo de estado de factura
            switch (f.estado.toLowerCase()) {

                case 'registrada':
                    badgeEstado = 'bg-success';
                    break;

                case 'pendiente':
                    badgeEstado = 'bg-warning text-dark';
                    break;

                case 'rechazada':
                    badgeEstado = 'bg-danger';
                    break;
            }

            htmlFacturas += `
                             <div class="col-12 col-md-6 col-xl-4">
                                <div class="card cards-facturas border-0 rounded-4 factura-card h-100">
                                    <!-- ENCABEZADO -->
                                    <div class="card-header text-white border-0 py-3">
                                        <div class="form-check contenedor-checkFactura">
                                            
                                            <div class="factura-id">
                                                ID: ${f.id}
                                            </div>
                                            <input class="form-check-input mb-2 me-1 radio-factura"
                                                    type="radio"
                                                    name="facturaSeleccionada"

                                                    data-id="${f.id}"
                                                    data-factura="${f.uuid}"
                                                    data-fecha="${f.fechaFactura}"
                                                    data-moneda="${f.moneda}"
                                                    data-oc="${f.oc}"
                                                    data-folio="${f.folio}"
                                                    data-total="${f.total}"
                                                    data-rfcEmisor="${f.rfcEmisor}"
                                                    id="radioFactura_${f.folio}">

                                        </div>
                                        <div class="d-flex justify-content-between align-items-start">
                                            
                                            <div>
                                                <div class="factura-title mb-1">
                                                    FACTURA ELECTRÓNICA
                                                </div>

                                                <small class="factura-Emisor">
                                                    RFC Emisor: ${f.rfcEmisor}
                                                </small>
                                            </div>
                                            <div class="text-end">
                                                <div class="fw-bold">${f.folio}</div>

                                                <span class="badge ${badgeEstado} rounded-pill mt-2 pb-2">
                                                    ${f.estado}
                                                </span>
                                            </div>
                                            
                                        </div>
                                    </div>

                                    <!-- BODY -->
                                    <div class="card-body">

                                        <div class="row g-3">

                                            <!-- PROVEEDOR -->
                                            <div class="col-12">
                                                <small class="text-muted d-block">
                                                    Proveedor:
                                                </small>
                                                <div class="fw-semibold">
                                                   ${f.razon}
                                                </div>
                                            </div>
                                            <!-- OC -->
                                            <div class="col-6">
                                                <small class="text-muted d-block">
                                                    Orden de Compra:
                                                </small>
                                                <div class="fw-semibold">
                                                    ${f.oc}
                                                </div>
                                            </div>
                                            <!-- FECHA -->
                                            <div class="col-6">
                                                <small class="text-muted d-block">
                                                    Fecha:
                                                </small>
                                                <div class="fw-semibold">
                                                    ${f.fechaFactura}
                                                </div>
                                            </div>

                                            <!-- MONEDA -->
                                            <div class="col-6">
                                                <small class="text-muted d-block">Moneda:</small>
                                                <div class="fw-semibold">${f.moneda}</div>
                                            </div>

                                        </div>

                                        <!-- TOTAL -->
                                        <div class="factura-area-total p-3 mt-4">
                                            <div class="text-muted small">TOTAL</div>
                                            <div class="fs-3 fw-bold text-success ms-3">$${this.formatearImporte(f.total)}</div>
                                        </div>

                                    </div>

                                    <!-- UUID -->
                                    <div class="card-footer pb-3">
                                        <div class="small text-muted fw-semibold">UUID:</div>
                                        <small class="text-break factura-uuid ms-3">${f.uuid}</small>
                                    </div>

                                </div>

                            </div>
                        `;
        });
        $('#contenedorFacturas').html(htmlFacturas);

    }

    formatearImporte(total) {
        return Number(total).toLocaleString('es-MX', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
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
        $('#FechaV').val(fechaHoy);
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
        $("#EntradasMercanciaURL").addClass("selected-item");
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
    // TABLA DE ÓRDENES DE COMPRA - VERSIÓN MEJORADA
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
                        'N° OC': 'bi bi-hash',
                        'PROVEEDOR': 'bi bi-building',
                        'CODIGO PROVEEDOR': 'bi bi-upc',
                        'CARDCODE': 'bi bi-upc',
                        'CARDNAME': 'bi bi-building',
                        'FECHA DOCUMENTO': 'bi bi-calendar-event',
                        'DOCDATE': 'bi bi-calendar-event',
                        'FECHA VENCIMIENTO': 'bi bi-calendar-x',
                        'DOCDUEDATE': 'bi bi-calendar-x',
                        'COMENTARIOS': 'bi bi-chat-left-text',
                        'COMMENTS': 'bi bi-chat-left-text',
                        'ACCIONES': 'bi bi-lightning-fill'
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
                        <i class="bi bi-file-earmark-text me-2" style="color: #0D6EFD;"></i>
                        Detalle de Orden de Compra
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
                        renderer: (api, rowIdx, columns) => renderDetallesResponsive(columns)
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
                        "FiltroCN": $("#FiltroCN").val() || null,
                        "FiltroFechaInicio": $("#FiltroFechaInicio").val() || null,
                        "FiltroFechaFin": $("#FiltroFechaFin").val() || null,
                        "FiltroPlanta": $("#FiltroPlanta").val() || null,
                    }),
                    dataSrc: function (json) {
                        return json.data;
                    }
                },
                // ✅ COLUMNAS CON ESTILOS MEJORADOS
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
                        render: (data, type, row) => {
                            const tipoUsuario = this.datos_usuario[0].TIPOUSUARIO;
                            const esAdmin = tipoUsuario === "AdminMtto" || tipoUsuario === "Administrador";

                        const dataAttrs = `
                        data-docentry="${row.DocEntry || ''}"
                        data-docnum="${row.DocNum || ''}"
                        data-cardcode="${row.CardCode || ''}"
                        data-cardname="${row.CardName || ''}"`;

                            return `<button class="btn btn-sm btn-ptm-mid btn-entrada-mercancia"  // Azul ✅ 
                                data-bs-toggle="tooltip" title="Generar Entrada de Mercancía" 
                                ${dataAttrs}>
                                <i class="bi bi-box-arrow-in-down"></i>
                            </button>`;
                        }
                    },
                    // Columna 2: N° OC
                    {
                        data: "DocNum",
                        title: "N° OC",
                        className: "text-center",
                        render: (data) => data
                            ? `<span class="badge bg-blue-ptm badge-custom"><i class="bi bi-hash me-1"></i>${data}</span>`
                            : '<em class="text-muted">—</em>'
                    },
                    // Columna 3: Código Proveedor (oculto)
                    {
                        data: "CardCode",
                        title: "Código Proveedor",
                        className: "text-center",
                        render: (data) => data
                            ? `<span class="badge bg-secondary badge-custom"><i class="bi bi-upc me-1"></i>${data}</span>`
                            : '<em class="text-muted">N/A</em>'
                    },
                    // Columna 4: Proveedor
                    {
                        data: "CardName",
                        title: "Proveedor",
                        className: "text-start",
                        render: (data) => data
                            ? `<span class="badge bg-light text-dark badge-custom" style="border-left: 3px solid #0D6EFD;">
                             <i class="bi bi-building me-1" style="color: #0D6EFD;"></i>${data}
                           </span>`
                            : '<em class="text-muted">N/A</em>'
                    },
                    // Columna 5: Fecha Documento
                    {
                        data: "DocDate",
                        title: "Fecha Documento",
                        className: "text-center",
                        render: (data) => data
                            ? `<span class="badge btn-ptm-mid badge-custom"><i class="bi bi-calendar-event me-1"></i>${data}</span>`
                            : '<em class="text-muted">—</em>'
                    },
                    // Columna 6: Fecha Vencimiento
                    {
                        data: "DocDueDate",
                        title: "Fecha Vencimiento",
                        className: "text-center",
                        render: (data) => data
                            ? `<span class="badge bg-warning text-dark badge-custom"><i class="bi bi-calendar-x me-1"></i>${data}</span>`
                            : '<em class="text-muted">—</em>'
                    },
                    // Columna 7: Comentarios
                    {
                        data: "Comments",
                        title: "Comentarios",
                        className: "text-start",
                        render: (data) => {
                            if (!data) return '<em class="text-muted">Sin comentarios</em>';
                            const texto = data.length > 50 ? data.substring(0, 50) + '...' : data;
                            return `<span class="text-truncate d-inline-block" 
                                style="max-width:200px;" 
                                title="${data}">
                                <i class="bi bi-chat-left-text me-1" style="color: #0D6EFD;"></i>
                                ${texto}
                            </span>`;
                        }
                    }
                ],
                // ✅ COLUMNDEFS
                columnDefs: [
                    { orderable: false, targets: [0, 1] },
                    { visible: false, targets: [3] },  // Código proveedor oculto por defecto

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

                    $(row).data('oc-completa', {
                        docEntry: data.DocEntry,
                        docNum: data.DocNum,
                        cardCode: data.CardCode,
                        cardName: data.CardName,
                        docDate: data.DocDate,
                        docDueDate: data.DocDueDate,
                        comments: data.Comments
                    });
                },
                drawCallback: function () {
                    table.columns.adjust();
                }
            });

            // ✅ Manejo de resize con namespace
            $(window).off('resize.ordenesCompra').on('resize.ordenesCompra', () => {
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
                Gastos, Cedis, CodOp, Unidad, ArtUnidad,
                FolioFact, Lote
            } = it;
            //<td class="detalles" >${Detalles}</td>
            tbody.append(`
                <tr>
                    <td class="text-center align-middle">  
                        <input type="checkbox" class="select-docline form-check-input" value="" data-linea=${Linea} id="checkArt${Linea}">
                    </td>
                    <td class="text-center linea align-middle">${Linea}</td>
                    <td class="itemcode align-middle">${NArticulo}</td>
                    <td class="desc align-middle">${Descripcion}</td>
                    <td class="cantidad align-middle">
                        <input type="number" class="form-control form-control-sm input-cantidad text-center" value="0" max="${Cantidad}" id="InputCantidad${Linea}" disabled>
                    </td>
                    <td class="lote align-middle">
                        <input type="text" class="form-control form-control-sm input-lote" value="${Lote || ''}" id="InputLote${Linea}" disabled>
                    </td>
                    <td class="sap-yellow foliofac align-middle">
                        <input type="text" class="form-control form-control-sm input-folio" value="${FolioFact || ''}" id="InputFolioFact${Linea}" disabled>
                    </td>
                    <td class="preciou align-middle"><span class="text-nowrap">${PrecioU}</span></td>
                    <td class="align-middle">${PorDesc}</td>
                    <td class="align-middle">${IVAImporte}</td>
                    <td class="align-middle">${Total}</td>
                    <td class="align-middle">${Almacen}</td>
                    <td class="sap-yellow align-middle">${Departamento}</td>
                    <td class="sap-yellow align-middle">${Proceso}</td>
                    <td class="sap-yellow align-middle">${Gastos}</td>
                    <td class="sap-yellow align-middle">${Cedis}</td>
                    <td class="align-middle">${CodOp}</td>
                    <td class="align-middle">${Unidad}</td>
                    <td class="align-middle">${ArtUnidad}</td>
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
                $('#tablaOrdenesCompra').DataTable().ajax.reload(null, false);
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
            const cantidad = parseInt($fila.find('.input-cantidad').val()) || 0;
            const lote = $fila.find('.input-lote').val() || '';
            const folio = $fila.find('.input-folio').val() || '';
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