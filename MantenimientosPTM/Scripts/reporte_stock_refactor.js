// ========================================
// APLICACIÓN REPORTE STOCK ALMACÉN
// ========================================
class ReporteStockApp {
    constructor() {
        this.URLBase = "Almacen";
        this.datos_usuario = GlobalUtil.getDatosUsuario();
        this.PLANTA = this.datos_usuario[0].PLANTA;
        
        window.AppReporteStock = this;
    }

    inicializar() {
        this.configurarPlanta();
        this.configurarEventosFiltros();
        this.llenarTablaReporteStock();
        console.log('✅ Reporte de Stock Almacén inicializado correctamente');
    }

    configurarPlanta() {
        $('#FiltroPlanta').val(this.PLANTA);
    }

    configurarEventosFiltros() {
        $('#btnAplicarFiltros').on('click', () => {
            this._recargarTabla();
        });

        $('#btnLimpiarFiltros').on('click', () => {
            $('#formFiltrosReporteStock')[0].reset();
            $('#FiltroPlanta').val(this.PLANTA);
            this._recargarTabla();
        });

        $('#FiltroCodigoArticulo, #FiltroNombreArticulo').on('keypress', (e) => {
            if (e.which === 13) {
                e.preventDefault();
                this._recargarTabla();
            }
        });

        $('#btnExportarExcel').on('click', () => {
            this.exportarExcel();
        });
    }

    _recargarTabla() {
        if ($.fn.DataTable.isDataTable('#tablaReporteStock')) {
            $('#tablaReporteStock').DataTable().ajax.reload(null, false);
        }
    }

    llenarTablaReporteStock() {
        try {

            if ($.fn.DataTable.isDataTable('#tablaReporteStock')) {
                $('#tablaReporteStock').DataTable().clear().destroy();
            }

            function calcularHeaderOffset() {
                if (window.innerWidth < 541) return 200;
                if (window.innerWidth < 640) return 156;
                if (window.innerWidth < 992) return 158;
                if (window.innerWidth < 1155) return 125;
                if (window.innerWidth < 1400) return 118;
                return 113;
            }

            const table = $('#tablaReporteStock').DataTable({
                processing: false,
                serverSide: true,
                destroy: true,
                searching: false,
                autoWidth: false,
                colReorder: true,

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
                        console.log("Respuesta DataTable:", json);
                        return json.data || [];
                    }
                },

                columns: [

                    // CHECKBOX
                    {
                        data: null,
                        title: '',
                        orderable: false,
                        searchable: false,
                        className: 'text-center',
                        width: '40px',
                        render: function (data, type, row) {
                            return `
                            <input type="checkbox"
                                   class="chkArticulo"
                                   data-codigo="${row.CodigoArticulo}">
                        `;
                        }
                    },

                    { data: "Activo", title: "Activo", className: "text-center" },
                    { data: "CodigoArticulo", title: "Código Artículo", className: "text-center" },
                    { data: "NombreArticulo", title: "Nombre Artículo", className: "text-start" },
                    { data: "UMI", title: "UMI", className: "text-center" },
                    { data: "NivelesDeStock", title: "Niveles Stock", className: "text-center" },

                    {
                        data: "Stock",
                        title: "Stock",
                        className: "text-end",
                        render: (data) => this.formatearNumero(data)
                    },

                    {
                        data: "Min",
                        title: "Min",
                        className: "text-end",
                        render: (data) => this.formatearNumero(data)
                    },

                    {
                        data: "Max",
                        title: "Max",
                        className: "text-end",
                        render: (data) => this.formatearNumero(data)
                    },

                    {
                        data: "Requis",
                        title: "Requis",
                        className: "text-end",
                        render: (data) => this.formatearNumero(data)
                    },

                    {
                        data: "Pedidos",
                        title: "Pedidos",
                        className: "text-end",
                        render: (data) => this.formatearNumero(data)
                    },

                    {
                        data: "CantSalidaPromMensual",
                        title: "Salida Prom. Mensual",
                        className: "text-end",
                        render: (data) => this.formatearNumero(data)
                    },

                    {
                        data: "CantMaxSalidaMensual",
                        title: "Salida Máx. Mensual",
                        className: "text-end",
                        render: (data) => this.formatearNumero(data)
                    },

                    {
                        data: "Solicitar",
                        title: "Solicitar",
                        className: "text-end",
                        render: (data) => this.formatearNumero(data)
                    },

                    {
                        data: "StatusValidacion",
                        title: "Status",
                        className: "text-center",
                        render: (data) => {

                            if (data === "Go!") {
                                return '<span class="badge bg-success">Go!</span>';
                            }

                            if (data === "Stop!") {
                                return '<span class="badge bg-danger">Stop!</span>';
                            }

                            return data ?? '';
                        }
                    }
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

            $(window)
                .off('resize.reporteStock')
                .on('resize.reporteStock', () => {

                    if ($.fn.DataTable.isDataTable('#tablaReporteStock')) {

                        const dt = $('#tablaReporteStock').DataTable();

                        dt.fixedHeader.headerOffset(
                            calcularHeaderOffset()
                        );

                        dt.fixedHeader.adjust();
                    }
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

            datos.forEach((item, index) => {
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