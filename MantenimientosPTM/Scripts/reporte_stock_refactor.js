// ========================================
// APLICACIÓN PRINCIPAL
// ========================================
class ReporteStockApp {
    constructor() {
        this.URLBase = "Almacen";
        this.datos_usuario = GlobalUtil.getDatosUsuario();
        this.PLANTA = this.datos_usuario[0].PLANTA;
        this.reporteManager = new ReporteStockManager(this.URLBase, this.datos_usuario, this.PLANTA);

        window.AppReporteStock = this;
    }

    inicializar() {
        UIManagerReporteStock.inicializarUI(this.PLANTA);
        this.reporteManager.inicializar();
        this.configurarEventosFiltros();
        console.log('✅ Reporte de Stock Almacén inicializado correctamente');
    }

    configurarEventosFiltros() {
        // ✅ Botón Aplicar
        $('#btnAplicarFiltros').on('click', () => {
            this._recargarTabla();
        });

        // ✅ Botón Limpiar
        $('#btnLimpiarFiltros').on('click', () => {
            $('#formFiltrosReporteStock')[0].reset();
            $('#FiltroPlanta').val(this.PLANTA);
            this._recargarTabla();
        });

        // ✅ Filtros de texto — solo al presionar Enter
        $('#FiltroCodigoArticulo, #FiltroNombreArticulo').on('keypress', (e) => {
            if (e.which === 13) {
                e.preventDefault();
                this._recargarTabla();
            }
        });

        // ✅ Exportar a Excel
        $('#btnExportarExcel').on('click', () => {
            this.reporteManager.exportarExcel();
        });

        // ✅ Generar solicitud de compra desde artículos seleccionados en el reporte
        // ✅ Generar solicitud de compra desde artículos seleccionados en el reporte
        $('#btnGenerarSolicitudCompra').on('click', async () => {
            const dt = this.reporteManager.table;
            if (!dt) {
                AlertManager.mostrar('Tabla de artículos no inicializada.', 'warning');
                return;
            }

            const seleccionadas = [];

            $('#tablaReporteStock tbody input.chkArticulo:checked').each(function () {
                const $tr = $(this).closest('tr');
                const rowData = dt.row($tr).data();
                if (!rowData) return;

                seleccionadas.push({
                    IdSolicitud: rowData.IdSolicitud ?? 0,
                    OrdenTrabajo: '', // no corresponde en stock
                    CodigoArticulo: rowData.CodigoArticulo ?? rowData.Codigo ?? '',
                    NombreArticulo: rowData.NombreArticulo ?? '',
                    Cantidad: rowData.Solicitar ?? 1,
                    Stock: rowData.Stock ?? 0,
                    Min: rowData.Min ?? 0,
                    Max: rowData.Max ?? 0,
                    StatusValidacion: rowData.StatusValidacion ?? ''
                });
            });

            if (seleccionadas.length === 0) {
                AlertManager.mostrar('Debes seleccionar al menos un artículo para continuar.', 'warning');
                return;
            }

            // ✅ NUEVA LÓGICA: Generar requisición con centros de costo (como el btn-aprobar)
            try {
                // ✅ IDENTIFICAR SI VIENE DE REPORTE STOCK
                const esDesdeReporteStock = window.CURRENT_VIEW === 'ReporteStock';

                // Limpiar centros de costo
                Object.values(window.AppSolicitudCompra.centrosCosto).forEach(g => g.limpiar());

                // Preparar datos agrupados
                const agrupados = Object.values(
                    seleccionadas.reduce((acc, item) => {
                        const key = item.CodigoArticulo;
                        if (acc[key]) {
                            acc[key].Cantidad += item.Cantidad;
                            acc[key].IdsDetalle = acc[key].IdsDetalle || [];
                            acc[key].OrdenesTrabajoArr = acc[key].OrdenesTrabajoArr || [];
                        } else {
                            acc[key] = {
                                ...item,
                                IdsDetalle: [item.IdSolicitud],
                                OrdenesTrabajoArr: [item.OrdenTrabajo]
                            };
                        }
                        return acc;
                    }, {})
                );

                // Renderizar tabla de requisición
                $('#bodyRequisicionArticulos').empty();
                $('#formGenerarRequisicion')[0].reset();
                $('#formGenerarRequisicion').removeClass('was-validated');
                $('#subtitleRequisicion').html(
                    `<i class="bi bi-box-seam me-1"></i> <strong>${seleccionadas.length}</strong> artículo(s) seleccionado(s)`
                );

                agrupados.forEach((item, i) => {
                    // Renderizar badges de órdenes de trabajo
                    const ordenesBadges = item.OrdenesTrabajoArr
                        .map(ot => `<span class="badge bg-blue-ptm badge-custom me-1">${ot || 'N/A'}</span>`)
                        .join('');

                    // ✅ SI ES DESDE REPORTE STOCK: Cantidad editable | SI NO: Badge solo lectura
                    const cantidadHTML = esDesdeReporteStock
                        ? `<input type="number" class="form-control form-control-sm text-center cantidad-editable" 
                                  id="CantidadEditable_${i}" 
                                  value="${item.Cantidad || 0}" 
                                  min="1" 
                                  data-cantidad-original="${item.Cantidad || 0}"
                                  style="width: 80px;">`
                        : `<span class="badge bg-blue-ptm badge-custom">${item.Cantidad || 0}</span>`;

                    $('#bodyRequisicionArticulos').append(`
                        <tr data-idsdetalle='${JSON.stringify(item.IdsDetalle)}'
                            data-codigoarticulo="${item.CodigoArticulo}"
                            data-from-stock="${esDesdeReporteStock}">
                            <td class="text-center">${ordenesBadges || '<em class="text-muted">Sin OT</em>'}</td>
                            <td class="text-center">
                                <small class="fw-semibold text-muted">${item.CodigoArticulo || ''}</small>
                            </td>
                            <td>${item.NombreArticulo || 'N/A'}</td>
                            <td class="text-center fw-semibold">${cantidadHTML}</td>
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

                    // Instanciar gestor de proveedores
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

                // Mostrar modal
                $('#SolcitarModal').modal('show');

            } catch (error) {
                AlertManager.mostrar('Error al procesar los artículos: ' + error.message, 'warning');
                console.error(error);
            }
        });
    }

    _recargarTabla() {
        this.reporteManager.recargarTabla();
    }
}

// ========================================
// GESTOR DE UI
// ========================================
class UIManagerReporteStock {
    static inicializarUI(planta) {
        $("#ReporteStockURL").addClass("selected-item");
        $("#AlmacenContainer").addClass("selected");
        $("#AlmacenContainer a").addClass("whiteText");
        $("#almacen-collapse").addClass("show");

        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(el => new bootstrap.Tooltip(el));

        $('#FiltroPlanta').val(planta);
    }
}

// ========================================
// GESTOR DE REPORTE DE STOCK
// ========================================
class ReporteStockManager {
    constructor(URLBase, datos_usuario, planta) {
        this.URLBase = URLBase;
        this.datos_usuario = datos_usuario;
        this.PLANTA = planta;
        this.table = null;
    }

    inicializar() {
        this.llenarTablaReporteStock();
        console.log('✅ ReporteStockManager inicializado correctamente');
    }

    recargarTabla() {
        if ($.fn.DataTable.isDataTable('#tablaReporteStock')) {
            $('#tablaReporteStock').DataTable().ajax.reload(null, false);
        }
    }

    llenarTablaReporteStock() {
        try {

            if ($.fn.DataTable.isDataTable('#tablaReporteStock')) {
                $('#tablaReporteStock').DataTable().clear().destroy();
            }

            const calcularHeaderOffset = () => {
                if (window.innerWidth < 541) return 200;
                if (window.innerWidth < 640) return 156;
                if (window.innerWidth < 992) return 158;
                if (window.innerWidth < 1155) return 125;
                if (window.innerWidth < 1400) return 118;
                return 113;
            };

            this.table = $('#tablaReporteStock').DataTable({
                processing: false,
                serverSide: true,
                destroy: true,
                searching: false,
                autoWidth: false,
                colReorder: true,
                ordering: false,

                fixedHeader: {
                    header: true,
                    headerOffset: calcularHeaderOffset()
                },

                ajax: {
                    url: `/${this.URLBase}/GetReporteStock`,
                    type: "POST",
                    dataType: "json",

                    beforeSend: () => GlobalUtil.mostrarLoader(true),
                    complete: () => GlobalUtil.mostrarLoader(false),

                    data: (d) => {
                        return $.extend({}, d, {
                            FiltroPlanta: this.PLANTA,
                            FiltroCodigoArticulo: $("#FiltroCodigoArticulo").val() || null,
                            FiltroNombreArticulo: $("#FiltroNombreArticulo").val() || null
                        });
                    },

                    dataSrc: (json) => {
                        if (json && Array.isArray(json.data)) {
                            json.data.forEach(item => {
                                if (item.Solicitar != null) {
                                    let n = Number(item.Solicitar) || 0;
                                    if (n < 0) item.Solicitar = Math.abs(n);
                                }
                            });
                        }
                        return json.data || [];
                    }
                },

                columns: [
                    {
                        data: null,
                        title: '<input type="checkbox" id="checkAll" title="Seleccionar todos">',
                        orderable: false,
                        searchable: false,
                        className: 'text-center',
                        width: '50px',
                        render: (data, type, row) => {
                            return `<input type="checkbox" class="chkArticulo" data-codigo="${row.CodigoArticulo}">`;
                        }
                    },
                    {
                        data: "Activo",
                        title: "Activo",
                        className: "text-center",
                        orderable: false,
                        width: '60px',
                        render: (data) => {
                            if (data === true || data === "Y" || data === "S" || data === "Activo") {
                                return `<i class="bi bi-check-circle-fill text-success" title="Activo"></i>`;
                            }
                            return `<i class="bi bi-x-circle-fill text-danger" title="Inactivo"></i>`;
                        }
                    },
                    {
                        data: "StatusValidacion",
                        title: "Status",
                        className: "text-center",
                        orderable: false,
                        width: '80px',
                        render: (data) => {
                            if (data === "Go!") {
                                return `<span class="badge btn-ptm-primary badge-custom"><i class="bi bi-check-circle-fill"></i> Go!</span>`;
                            }
                            if (data === "Stop!") {
                                return `<span class="badge bg-danger badge-custom"><i class="bi bi-x-octagon-fill"></i> Stop!</span>`;
                            }
                            return data ?? '';
                        }
                    },
                    {
                        data: "CodigoArticulo",
                        title: "Código Artículo",
                        className: "text-center",
                        orderable: false,
                        width: '120px',
                        render: (data) =>
                            data
                                ? `<i class="bi bi-upc-scan text-muted me-1"></i><small class="fw-semibold">${data}</small>`
                                : 'N/A'
                    },
                    {
                        data: "NombreArticulo",
                        title: "Nombre Artículo",
                        className: "text-center",
                        orderable: false,
                        width: '200px',
                        render: (data) =>
                            data
                                ? `<i class="bi bi-box-seam text-info me-1"></i>${data}`
                                : 'N/A'
                    },
                    {
                        data: "UMI",
                        title: "UMI",
                        className: "text-center",
                        orderable: false,
                        width: '60px',
                        render: (data) => {
                            const texto = data
                                ? data.charAt(0).toUpperCase() + data.slice(1).toLowerCase()
                                : '';
                            return `<span class="badge bg-light text-dark border badge-custom">${texto}</span>`;
                        }
                    },
                    {
                        data: "NivelesDeStock",
                        title: "Niveles Stock",
                        className: "text-center",
                        orderable: false,
                        width: '100px',
                        render: (data) => {
                            if (!data) return '';
                            switch (data) {
                                case 'Bajo':
                                    return `<i class="bi bi-exclamation-triangle-fill text-warning me-1"></i>Bajo`;
                                case 'Critico':
                                case 'Crítico':
                                    return `<i class="bi bi-exclamation-octagon-fill text-danger me-1"></i>Crítico`;
                                case 'Normal':
                                case 'Óptimo':
                                case 'Optimo':
                                    return `<i class="bi bi-check-circle-fill text-success me-1"></i>${data}`;
                                default:
                                    return data;
                            }
                        }
                    },
                    {
                        data: "Stock",
                        title: "Stock",
                        className: "text-center",
                        orderable: false,
                        width: '70px',
                        render: (data) =>
                            `<i class="bi bi-box-seam text-info me-1"></i>${this.formatearNumero(data)}`
                    },
                    {
                        data: "Min",
                        title: "Min",
                        className: "text-center",
                        orderable: false,
                        width: '70px',
                        render: (data) =>
                            `<i class="bi bi-arrow-down-circle text-warning me-1"></i>${this.formatearNumero(data)}`
                    },
                    {
                        data: "Max",
                        title: "Max",
                        className: "text-center",
                        orderable: false,
                        width: '70px',
                        render: (data) =>
                            `<i class="bi bi-arrow-up-circle text-success me-1"></i>${this.formatearNumero(data)}`
                    },
                    {
                        data: "Requis",
                        title: "Requis",
                        className: "text-center",
                        orderable: false,
                        width: '70px',
                        render: (data) =>
                            `<i class="bi bi-clipboard-check text-primary me-1"></i>${this.formatearNumero(data)}`
                    },
                    {
                        data: "Pedidos",
                        title: "Pedidos",
                        className: "text-center",
                        orderable: false,
                        width: '70px',
                        render: (data) =>
                            `<i class="bi bi-cart-check text-primary me-1"></i>${this.formatearNumero(data)}`
                    },
                    {
                        data: "CantSalidaPromMensual",
                        title: "Salida Prom. Mensual",
                        className: "text-center",
                        orderable: false,
                        width: '130px',
                        render: (data) =>
                            `<i class="bi bi-graph-up text-secondary me-1"></i>${this.formatearNumero(data)}`
                    },
                    {
                        data: "CantMaxSalidaMensual",
                        title: "Salida Máx. Mensual",
                        className: "text-center",
                        orderable: false,
                        width: '130px',
                        render: (data) =>
                            `<i class="bi bi-graph-up-arrow text-danger me-1"></i>${this.formatearNumero(data)}`
                    },
                    {
                        data: "Solicitar",
                        title: "Solicitar",
                        className: "text-center",
                        orderable: false,
                        width: '80px',
                        render: (data) =>
                            `<i class="bi bi-cart-plus text-primary me-1"></i>${this.formatearNumero(data)}`
                    }
                ],

                columnDefs: [
                    { className: "text-center", targets: '_all' },
                    { orderable: false, targets: '_all' }
                ],

                language: {
                    lengthMenu: "Mostrar _MENU_ registros por página",
                    zeroRecords: "No se encontraron registros",
                    info: "Mostrando página _PAGE_ de _PAGES_",
                    infoEmpty: "No hay registros disponibles",
                    infoFiltered: "(filtrado de _MAX_ registros totales)",
                    search: "Buscar:",
                    paginate: {
                        first: "Primera",
                        last: "Última",
                        next: "Siguiente",
                        previous: "Anterior"
                    }
                },

                pageLength: 10,
                lengthMenu: [
                    [10, 25, 50, 100],
                    [10, 25, 50, 100]
                ],

                dom: 'Blfrtip',
                buttons: []
            });

            // Llamar al iniciar y al dibujar
            this.table.on('draw', () => {
                const $all = $('#tablaReporteStock tbody input.chkArticulo');
                const total = $all.length;
                const selected = $all.filter(':checked').length;

                if (total === 0) {
                    $('#checkAll').prop('checked', false).prop('indeterminate', false);
                } else {
                    $('#checkAll').prop('checked', selected === total);
                    $('#checkAll').prop('indeterminate', selected > 0 && selected < total);
                }
            });

            // ========================================
            // 🔵 EVENTOS: SELECCIONAR TODOS
            // ========================================
            $('#tablaReporteStock thead').off('change', '#checkAll').on('change', '#checkAll', () => {
                const checked = $('#checkAll').prop('checked');
                $('#tablaReporteStock tbody input.chkArticulo').prop('checked', checked);
            });

            // ========================================
            // 🔵 EVENTOS: ACTUALIZAR ESTADO DEL HEADER
            // ========================================
            $('#tablaReporteStock tbody').off('change', 'input.chkArticulo').on('change', 'input.chkArticulo', () => {
                const $all = $('#tablaReporteStock tbody input.chkArticulo');
                const total = $all.length;
                const selected = $all.filter(':checked').length;

                if (total === 0) {
                    $('#checkAll').prop('checked', false).prop('indeterminate', false);
                } else {
                    $('#checkAll').prop('checked', selected === total);
                    $('#checkAll').prop('indeterminate', selected > 0 && selected < total);
                }
            });

            // Resize listener mejorado
            $(window)
                .off('resize.reporteStock')
                .on('resize.reporteStock', () => {
                    if ($.fn.DataTable.isDataTable('#tablaReporteStock')) {
                        const dt = $('#tablaReporteStock').DataTable();
                        dt.fixedHeader.headerOffset(calcularHeaderOffset());
                        dt.fixedHeader.adjust();
                    }
                });

            // Agregar atributos en cada fila
            this.table.on('createdRow', (row, data, dataIndex) => {
                try {
                    $(row).attr('data-codigo', data.CodigoArticulo || '');
                    $(row).attr('data-nombre', data.NombreArticulo || '');
                    $(row).attr('data-stock', data.Stock ?? 0);
                    $(row).attr('data-min', data.Min ?? 0);
                    $(row).attr('data-max', data.Max ?? 0);
                } catch (err) { /* noop */ }
            });

        }
        catch (error) {
            console.error('Error al inicializar DataTable:', error);
            AlertManager.mostrar(
                'Error al cargar el reporte de stock',
                'warning'
            );
        }
    }

    formatearNumero(data) {
        if (data == null || data === '') return '0';
        const num = parseFloat(data);
        return isNaN(num) ? '0' : num.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }

    exportarExcel() {
        const exporter = new ExcelExporterStock(this.URLBase, this.PLANTA);
        exporter.exportarConFormato();
    }
}

// ========================================
// EXPORTADOR EXCEL REPORTE STOCK
// ========================================
class ExcelExporterStock {
    constructor(urlBase, planta) {
        this.urlBase = urlBase;
        this.planta = planta;
    }

    async exportarConFormato() {
        if (typeof ExcelJS === 'undefined') {
            console.error('❌ ExcelJS no cargado');
            alert('Error: Librería de Excel no disponible');
            return;
        }

        try {
            GlobalUtil.mostrarLoader(true);

            const response = await $.ajax({
                url: `/${this.urlBase}/GetReporteStock`,
                type: 'POST',
                data: {
                    draw: 1,
                    start: 0,
                    length: 10000,
                    FiltroPlanta: this.planta,
                    FiltroCodigoArticulo: $("#FiltroCodigoArticulo").val() || null,
                    FiltroNombreArticulo: $("#FiltroNombreArticulo").val() || null
                }
            });

            const datos = response.data || [];

            if (datos.length === 0) {
                AlertManager.mostrar('No hay datos para exportar', 'warning');
                GlobalUtil.mostrarLoader(false);
                return;
            }

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Reporte Stock');

            const columnas = [
                { header: 'Activo', key: 'Activo', width: 8 },
                { header: 'Código Artículo', key: 'CodigoArticulo', width: 20 },
                { header: 'Nombre Artículo', key: 'NombreArticulo', width: 50 },
                { header: 'UMI', key: 'UMI', width: 10 },
                { header: 'Niveles Stock', key: 'NivelesDeStock', width: 15 },
                { header: 'Stock', key: 'Stock', width: 12 },
                { header: 'Min', key: 'Min', width: 10 },
                { header: 'Max', key: 'Max', width: 10 },
                { header: 'Requis', key: 'Requis', width: 10 },
                { header: 'Pedidos', key: 'Pedidos', width: 10 },
                { header: 'Salida Prom. Mensual', key: 'CantSalidaPromMensual', width: 20 },
                { header: 'Salida Máx. Mensual', key: 'CantMaxSalidaMensual', width: 20 },
                { header: 'Solicitar', key: 'Solicitar', width: 12 },
                { header: 'Status', key: 'StatusValidacion', width: 10 }
            ];

            worksheet.columns = columnas;

            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '1976D2' }
            };
            headerRow.alignment = { horizontal: 'center' };
            headerRow.height = 25;

            datos.forEach((item) => {
                const row = worksheet.addRow({
                    Activo: item.Activo || '',
                    CodigoArticulo: item.CodigoArticulo || '',
                    NombreArticulo: item.NombreArticulo || '',
                    UMI: item.UMI || '',
                    NivelesDeStock: item.NivelesDeStock || '',
                    Stock: item.Stock || 0,
                    Min: item.Min || 0,
                    Max: item.Max || 0,
                    Requis: item.Requis || 0,
                    Pedidos: item.Pedidos || 0,
                    CantSalidaPromMensual: item.CantSalidaPromMensual || 0,
                    CantMaxSalidaMensual: item.CantMaxSalidaMensual || 0,
                    Solicitar: item.Solicitar || 0,
                    StatusValidacion: item.StatusValidacion || ''
                });

                if (item.StatusValidacion === 'Stop!') {
                    row.getCell(14).font = { color: { argb: 'FF0000' }, bold: true };
                } else if (item.StatusValidacion === 'Go!') {
                    row.getCell(14).font = { color: { argb: '28A745' }, bold: true };
                }

                if (item.Solicitar > 0) {
                    row.getCell(13).font = { bold: true, color: { argb: '1976D2' } };
                }
            });

            const columnLetters = ['F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
            columnLetters.forEach(col => {
                worksheet.getColumn(col).numFmt = '#,##0.00';
            });

            worksheet.eachRow((row, rowNum) => {
                if (rowNum > 1) {
                    row.alignment = { horizontal: 'left' };
                    ['F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'].forEach(col => {
                        if (row.getCell(col).value) {
                            row.getCell(col).alignment = { horizontal: 'right' };
                        }
                    });
                }
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });

            const fecha = new Date().toISOString().split('T')[0];
            const almacen = this.planta === '1' ? 'COR040' : 'P2040';
            const nombreArchivo = `Reporte_Stock_${almacen}_${fecha}.xlsx`;

            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = nombreArchivo;
            link.click();

            URL.revokeObjectURL(link.href);

            console.log('✅ Excel Reporte Stock exportado correctamente');
            AlertManager.mostrar('✅ Excel exportado correctamente', 'success');

        } catch (error) {
            console.error('Error al exportar:', error);
            AlertManager.mostrar('Error al exportar Excel: ' + error.message, 'warning');
        }
        finally {
            GlobalUtil.mostrarLoader(false);
        }
    }
}

// ========================================
// INICIALIZACIÓN CUANDO EL DOM ESTÁ LISTO
// ========================================
$(document).ready(() => {
    const app = new ReporteStockApp();
    app.inicializar();
});