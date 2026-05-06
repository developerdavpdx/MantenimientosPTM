// ========================================
// GESTOR DE UI
// ========================================
class UIManager {
    static inicializarUI() {
        $("#ProduccionContainer").addClass("selected");
        $("#ProduccionContainer a").addClass("whiteText");
        $("#produccion-collapse").addClass("show");
        $("#RegistroProduccionPLURL").addClass("selected-item");
        console.log('✅ UI Pead Liso inicializada');
    }
}

// ========================================
// GESTOR DE EVENTOS
// ========================================
class GestionEventosPeadLiso {
    constructor() {
        this.URLBase = "Produccion";
        this.datos_usuario = GlobalUtil.getDatosUsuario();
        this.appProduccion = new GestionProduccionPeadLiso(
            this.datos_usuario,
            this.URLBase
        );
    }

    inicializar() {

        // Inicializar UI
        UIManager.inicializarUI();

        // Inicializar aplicación
        this.appProduccion.inicializar();

        console.log('✅ Sistema Completo Pead Liso inicializado');
    }
}

// ========================================
// INICIALIZACIÓN
// ========================================
$(document).ready(function () {
    const app = new GestionEventosPeadLiso();
    app.inicializar();
});

class ArticuloAutocompleteEditor {

    init(params) {

        this.params = params;

        this.eContainer = document.createElement('div');
        this.eContainer.style.position = 'relative';

        this.eInput = document.createElement('input');
        this.eInput.className = 'form-control';
        this.eInput.value = params.value || '';

        this.eDropdown = document.createElement('div');
        this.eDropdown.className = 'autocomplete-dropdown';

        this.eContainer.appendChild(this.eInput);
        this.eContainer.appendChild(this.eDropdown);

        this.gestionArticulos = params.context.gestionArticulos;
        this.datos_usuario = params.context.datos_usuario;
        this.URLBase = params.context.URLBase;

        $(this.eInput).on('input', async (e) => {

            const query = e.target.value;

            if (query.length >= 2) {

                const articulos = await this.gestionArticulos.obtenerArticulos(
                    query,
                    this.datos_usuario[0].EMAIL
                );

                this.mostrarSugerencias(articulos);

            } else {

                this.eDropdown.innerHTML = '';

            }

        });

    }

    mostrarSugerencias(articulos) {

        this.eDropdown.innerHTML = '';

        articulos.forEach(articulo => {

            const item = document.createElement('div');
            item.className = 'autocomplete-item';

            item.innerHTML = `
                <strong>${articulo.CodigoArticulo}</strong><br>
                <small>${articulo.DescripcionArticulo}</small>
            `;

            item.addEventListener('click', () => {

                this.eInput.value = articulo.CodigoArticulo;
                this.eDropdown.innerHTML = '';
                this.params.stopEditing();

            });

            this.eDropdown.appendChild(item);

        });

    }

    getGui() {
        return this.eContainer;
    }

    afterGuiAttached() {
        this.eInput.focus();
        this.eInput.select();
        this.eInput.value = '';
    }

    getValue() {
        return this.eInput.value;
    }

    destroy() { }

    isPopup() {
        return true;
    }
}

// ========================================
// APLICACIÓN PRINCIPAL - GESTIÓN PEAD LISO
// ========================================
class GestionProduccionPeadLiso {
    constructor(datos_usuario, URLBase) {

        this.URLBase = URLBase;
        this.datos_usuario = datos_usuario;

        this.gridApi = null;
        this.gridColumnApi = null;

        this.datosOriginales = [];
        this.cambiosPendientes = [];
        this.columnDefs = null;

        this.listaLineas = [];
        this.gestionArticulos = new GestionArticulos();
    }

    async inicializar() {

        await this.cargarLineas();

        this.configurarEventos();

        this.cargarDatosIniciales();

        this.inicializarTooltips();

        this.configurarMenuContextual();

        // 🔥 CONSULTAR DATOS
        this.consultarDatos(null, null, null);

        console.log('✅ Sistema PEAD LISO inicializado');

    }

    cargarDatosIniciales() {

        this.datosOriginales = [

            {
                id: 1,
                Fecha: null,
                Linea: null,
                Producto: null,
                Turno: null,
                Grupo: null,

                TRLiberados: null,
                ProduccionNeta: null,
                HorasProgramadas: null,

                Preventivo: null,
                ControlInventarios: null,
                FaltaEnergia: null,
                FaltaMateriaPrima: null,
                TiempoCalentamiento: null,
                PreparacionLinea: null,
                TiempoCalentamientoHerramienta: null,
                ArranqueEstabilizacion: null,

                TiempoMuertoLogistica: null,
                TiempoMuertoReparacion: null,
                TiempoMuertoPorCorrectivos: null,
                CambioMolde: null,
                FaltaPersonal: null,
                MuertoProceso: null,

                TiempoNoDisponible: null,
                TiempoNoProductivo: null,
                TiempoProductivo: null
            }

        ];

        this.inicializarGrid();

        setTimeout(() => {

            $('#cardsPlaneacionGrid').html('');
            $("#tablaProduccion").removeClass("d-none");

        }, 1000);

    }

    async consultarDatos(fechaInicio, fechaFin, linea) {

        try {

            $("#tablaProduccion").addClass("d-none");

            $("#cardsPlaneacionGrid")
                .empty()
                .append(Array(5).fill('<div class="skeleton-card"></div>').join(''));

            const response = await $.ajax({

                url: `/${this.URLBase}/GetTiemposMuertosPeadLiso`,
                type: "GET",
                data: {
                    FiltroFechaInicio: fechaInicio,
                    FiltroFechaFin: fechaFin,
                    FiltroLinea: linea
                }

            });

            if (response.Status === "OK") {

                const datos = JSON.parse(response.Data);

                this.cargarDatosGrid(datos);

            }
            else {

                AlertManager.mostrar(
                    response.Message,
                    "warning"
                );

                this.cargarDatosGrid(null);

            }

        } catch (error) {

            console.error(error);

            AlertManager.mostrar(
                "Error al consultar datos",
                "danger"
            );

        } finally {

            setTimeout(() => {

                $('#cardsPlaneacionGrid').html('');
                $("#tablaProduccion").removeClass("d-none");

            }, 1000);

        }

    }

    cargarDatosGrid(datos) {

        if (datos != null) {

            const datosFormateados = datos.map(item => ({

                id: item.ID_REGISTRO || Date.now(),

                ID_REGISTRO: item.ID_REGISTRO,

                Fecha: item.FECHA,
                Linea: item.LINEA,
                Producto: item.PRODUCTO,
                Turno: item.TURNO,
                Grupo: item.GRUPO,

                TRLiberados: item.TRLIBERADOS,
                ProduccionNeta: item.PRODUCCION_NETA,
                HorasProgramadas: item.HORAS_PROGRAMADAS,

                Preventivo: item.PREVENTIVO,
                ControlInventarios: item.CONTROL_INVENTARIOS,
                FaltaEnergia: item.FALTA_ENERGIA,
                FaltaMateriaPrima: item.FALTA_MATERIA_PRIMA,
                TiempoCalentamiento: item.TIEMPO_CALENTAMIENTO,
                PreparacionLinea: item.PREPARACION_LINEA,
                TiempoCalentamientoHerramienta: item.TIEMPO_CALENTAMIENTO_HERRAMIENTA,
                ArranqueEstabilizacion: item.ARRANQUE_ESTABILIZACION,

                TiempoMuertoLogistica: item.TIEMPO_MUERTO_LOGISTICA,
                TiempoMuertoReparacion: item.TIEMPO_MUERTO_REPARACION,
                TiempoMuertoPorCorrectivos: item.TIEMPO_MUERTO_CORRECTIVOS,
                CambioMolde: item.CAMBIO_MOLDE,
                FaltaPersonal: item.FALTA_PERSONAL,
                MuertoProceso: item.MUERTO_PROCESO,

                TiempoNoDisponible: item.TIEMPO_NO_DISPONIBLE,
                TiempoNoProductivo: item.TIEMPO_NO_PRODUCTIVO,
                TiempoProductivo: item.TIEMPO_PRODUCTIVO

            }));

            this.gridApi.setRowData(datosFormateados);

        }
        else {

            this.gridApi.setRowData(this.datosOriginales);

        }

        this.agregarFilaTotales();

    }

    inicializarGrid() {

        const gridDiv = document.querySelector('#tablaProduccion');

        const columnDefs = [

            // ========================================
            // COLUMNAS BÁSICAS
            // ========================================
            {
                headerName: '',
                children: [
                    {
                        field: 'Fecha',
                        headerName: 'Fecha',
                        editable: true,
                        width: 110,
                        cellClass: 'celda-azul',
                        pinned: 'left',
                        cellEditor: 'agDateCellEditor',
                        cellEditorParams: {
                            browserDatePicker: true
                        },
                        valueFormatter: params => {
                            if (params.data?.id === 'TOTALES') return '';
                            if (!params.value) return '';
                            return new Date(params.value)
                                .toLocaleDateString('es-MX');
                        }
                    },
                    {
                        field: 'Linea',
                        headerName: 'Línea',
                        editable: true,
                        width: 110,
                        cellClass: 'celda-azul',
                        pinned: 'left',
                        cellEditor: 'agSelectCellEditor',
                        cellEditorParams: () => {
                            return {
                                values: this.listaLineas.map(x => x.label)
                            };
                        },
                        valueFormatter: params => {
                            if (params.data?.id === 'TOTALES') return '';
                            return params.value || '';
                        }
                    },
                    {
                        field: 'Producto',
                        headerName: 'Producto',
                        editable: true,
                        width: 140,
                        cellClass: 'celda-azul',
                        pinned: 'left',
                        cellEditor: 'articuloAutocompleteEditor',
                        valueFormatter: params => {
                            if (params.data?.id === 'TOTALES') return '';
                            return params.value || '';
                        }
                    },
                    {
                        field: 'Turno',
                        headerName: 'Turno',
                        editable: true,
                        width: 80,
                        cellClass: 'celda-azul',
                        pinned: 'left',
                        valueFormatter: params => {
                            if (params.data?.id === 'TOTALES') return '';
                            return params.value || '';
                        }
                    },
                    {
                        field: 'Grupo',
                        headerName: 'Grupo',
                        editable: true,
                        width: 80,
                        cellClass: 'celda-azul',
                        pinned: 'left',
                        cellEditor: 'agSelectCellEditor',
                        cellEditorParams: {
                            values: ['A', 'B', 'C', 'D']
                        },
                        valueFormatter: params => {
                            if (params.data?.id === 'TOTALES') return '';
                            return params.value || '';
                        }
                    }
                ]
            },

            // ========================================
            // PRODUCCIÓN
            // ========================================
            {
                headerName: '',
                children: [
                    {
                        field: 'TRLiberados',
                        headerName: 'TR LIBERADOS',
                        width: 135,
                        ...this.getColumnaNumerica('celda-verde')
                    },
                    {
                        field: 'ProduccionNeta',
                        headerName: 'PRODUCCIÓN NETA',
                        width: 135,
                        ...this.getColumnaNumerica('celda-verde')
                    },
                    {
                        field: 'HorasProgramadas',
                        headerName: 'HORAS PROGRAMADAS',
                        width: 135,
                        ...this.getColumnaNumerica('celda-gris')
                    }
                ],
            },
            {
                headerName: 'TIEMPO NO DISPONIBLE',
                headerClass: 'header-grupo-rosa',
                children: [
                    {
                        field: 'Preventivo',
                        headerName: 'PREVENTIVO',
                        width: 135,
                        ...this.getColumnaNumerica('celda-rosa')
                    },
                    {
                        field: 'ControlInventarios',
                        headerName: 'CONTROL INVENTARIOS',
                        width: 135,
                        ...this.getColumnaNumerica('celda-rosa')
                    },
                    {
                        field: 'FaltaEnergia',
                        headerName: 'FALTA ENERGÍA',
                        width: 135,
                        ...this.getColumnaNumerica('celda-rosa')
                    },
                    {
                        field: 'FaltaMateriaPrima',
                        headerName: 'FALTA MATERIA PRIMA',
                        width: 135,
                        ...this.getColumnaNumerica('celda-rosa')
                    },
                    {
                        field: 'TiempoCalentamiento',
                        headerName: 'TIEMPO CALENTAMIENTO',
                        width: 135,
                        ...this.getColumnaNumerica('celda-rosa')
                    },
                    {
                        field: 'PreparacionLinea',
                        headerName: 'PREPARACIÓN LINEA',
                        width: 135,
                        ...this.getColumnaNumerica('celda-rosa')
                    },
                    {
                        field: 'TiempoCalentamientoHerramienta',
                        headerName: 'CALENTAMIENTO HERRAMIENTA',
                        width: 135,
                        ...this.getColumnaNumerica('celda-rosa')
                    },
                    {
                        field: 'ArranqueEstabilizacion',
                        headerName: 'ARRANQUE ESTABILIZACIÓN',
                        width: 135,
                        ...this.getColumnaNumerica('celda-rosa')
                    }
                ]
            },
            {
                headerName: 'TIEMPO NO PRODUCTIVO',
                headerClass: 'header-grupo-verde-claro',
                children: [
                    {
                        field: 'TiempoMuertoLogistica',
                        headerName: 'TIEMPO MUERTO LOGÍSTICA',
                        width: 135,
                        ...this.getColumnaNumerica('celda-verde-claro')
                    },
                    {
                        field: 'TiempoMuertoReparacion',
                        headerName: 'TIEMPO MUERTO REPARACIÓN',
                        width: 135,
                        ...this.getColumnaNumerica('celda-verde-claro')
                    },
                    {
                        field: 'TiempoMuertoPorCorrectivos',
                        headerName: 'TIEMPO MUERTO CORRECTIVOS',
                        width: 135,
                        ...this.getColumnaNumerica('celda-verde-claro')
                    },
                    {
                        field: 'CambioMolde',
                        headerName: 'CAMBIO MOLDE',
                        width: 135,
                        ...this.getColumnaNumerica('celda-verde-claro')
                    },
                    {
                        field: 'FaltaPersonal',
                        headerName: 'FALTA PERSONAL',
                        width: 135,
                        ...this.getColumnaNumerica('celda-verde-claro')
                    },
                    {
                        field: 'MuertoProceso',
                        headerName: 'MUERTO PROCESO',
                        width: 135,
                        ...this.getColumnaNumerica('celda-verde-claro')
                    }
                ]
            },
            {
                headerName: '',
                children: [
                    {
                        field: 'TiempoNoDisponible',
                        headerName: 'TIEMPO NO DISPONIBLE',
                        editable: false,
                        width: 130,
                        cellClass: 'celda-azul-claro',
                        valueFormatter: params => this.formatearNumero(params.value)
                    },
                    {
                        field: 'TiempoNoProductivo',
                        headerName: 'TIEMPO NO PRODUCTIVO',
                        editable: false,
                        width: 130,
                        cellClass: 'celda-azul-claro',
                        valueFormatter: params => this.formatearNumero(params.value)
                    },
                    {
                        field: 'TiempoProductivo',
                        headerName: 'TIEMPO PRODUCTIVO',
                        editable: false,
                        width: 130,
                        cellClass: 'celda-verde-fuerte',
                        valueFormatter: params => this.formatearNumero(params.value)
                    }
                ]
            }
        ];

        this.columnDefs = columnDefs;

        const gridOptions = {

            domLayout: 'autoHeight',

            columnDefs: columnDefs,

            context: {
                datos_usuario: this.datos_usuario,
                gestionArticulos: this.gestionArticulos,
                URLBase: this.URLBase
            },

            rowData: this.datosOriginales,

            components: {
                articuloAutocompleteEditor: ArticuloAutocompleteEditor
            },

            defaultColDef: {
                sortable: true,
                filter: true,
                resizable: true,
                editable: (params) => {

                    if (params.data?.id === 'TOTALES') {
                        return false;
                    }

                    return true;
                },
                wrapHeaderText: true,
                autoHeaderHeight: true
            },

            undoRedoCellEditing: true,
            undoRedoCellEditingLimit: 20,

            rowSelection: 'multiple',

            animateRows: true,

            suppressHorizontalScroll: false,

            groupHeaderHeight: 40,
            headerHeight: 80,

            onCellValueChanged: (event) =>
                this.onCellChanged(event),

            onGridReady: (params) => {

                this.gridApi = params.api;
                this.gridColumnApi = params.columnApi;

                this.agregarFilaTotales();

                setTimeout(() => {
                    this.gridApi.sizeColumnsToFit();
                }, 200);

            },

            getRowStyle: params => {

                if (params.data?.id === 'TOTALES') {

                    return {
                        fontWeight: 'bold',
                        backgroundColor: '#e9ecef',
                        borderTop: '2px solid #0058a1',
                        pointerEvents: 'none'
                    };

                }

            }

        };

        new agGrid.Grid(gridDiv, gridOptions);
    }

    getColumnaNumerica(cellClass) {

        return {

            editable: true,

            cellClass: cellClass,

            valueParser: params => {

                if (params.newValue === null || params.newValue === '')
                    return null;

                const valor = parseFloat(params.newValue);

                return isNaN(valor) ? null : valor;

            },

            valueFormatter: params => {

                if (params.data?.id === 'TOTALES')
                    return this.formatearNumero(params.value);

                return this.formatearNumero(params.value);

            }

        };

    }

    formatearNumero(valor) {

        if (valor === null || valor === undefined || valor === '')
            return '';

        return Number(valor).toFixed(2);

    }

    onCellChanged(event) {

        if (event.data.id === 'TOTALES') {
            event.api.undoCellEditing();
            return;
        }

        const row = event.data;

        // 🔥 CALCULAR
        row.TiempoNoDisponible =
            this.calcularTiempoNoDisponible(row);

        row.TiempoNoProductivo =
            this.calcularTiempoNoProductivo(row);

        row.TiempoProductivo =
            this.calcularTiempoProductivo(row);

        // 🔥 REGISTRAR CAMBIO
        const cambio = {
            id: event.data.id,
            campo: event.colDef.field,
            valorAnterior: event.oldValue,
            valorNuevo: event.newValue
        };

        this.cambiosPendientes.push(cambio);

        this.gridApi.refreshCells({
            rowNodes: [event.node],
            force: true
        });

        if (this.gridApi) {
            this.recalcularTotales();
        }
    }

    calcularTiempoNoDisponible(row) {

        return (
            (parseFloat(row.Preventivo) || 0) +
            (parseFloat(row.ControlInventarios) || 0) +
            (parseFloat(row.FaltaEnergia) || 0) +
            (parseFloat(row.FaltaMateriaPrima) || 0) +
            (parseFloat(row.TiempoCalentamiento) || 0) +
            (parseFloat(row.PreparacionLinea) || 0) +
            (parseFloat(row.TiempoCalentamientoHerramienta) || 0) +
            (parseFloat(row.ArranqueEstabilizacion) || 0)
        );

    }

    calcularTiempoNoProductivo(row) {

        return (
            (parseFloat(row.TiempoMuertoLogistica) || 0) +
            (parseFloat(row.TiempoMuertoReparacion) || 0) +
            (parseFloat(row.TiempoMuertoPorCorrectivos) || 0) +
            (parseFloat(row.CambioMolde) || 0) +
            (parseFloat(row.FaltaPersonal) || 0) +
            (parseFloat(row.MuertoProceso) || 0)
        );

    }

    calcularTiempoProductivo(row) {

        const horas = parseFloat(row.HorasProgramadas) || 0;

        const noDisponible =
            parseFloat(row.TiempoNoDisponible) || 0;

        const noProductivo =
            parseFloat(row.TiempoNoProductivo) || 0;

        return horas - noDisponible - noProductivo;

    }

    agregarFilaTotales() {

        if (!this.gridApi) return;

        let existeTotales = false;

        this.gridApi.forEachNode(node => {
            if (node.data?.id === 'TOTALES') {
                existeTotales = true;
            }
        });

        if (!existeTotales) {

            const filaTotales = {
                id: 'TOTALES',
                Linea: 'TOTALES'
            };

            this.gridApi.applyTransaction({
                add: [filaTotales],
                addIndex: this.gridApi.getDisplayedRowCount()
            });

        }

        this.recalcularTotales();

    }

    recalcularTotales() {

        if (!this.gridApi) return;

        const totales = {};

        this.columnDefs.forEach(grupo => {

            if (grupo.children) {

                grupo.children.forEach(col => {

                    if (col.field) {
                        totales[col.field] = 0;
                    }
                });

            }

        });

        this.gridApi.forEachNode(node => {

            if (node.data?.id === 'TOTALES') return;

            Object.keys(totales).forEach(field => {

                const valor = parseFloat(node.data[field]) || 0;

                totales[field] += valor;

            });

        });

        this.gridApi.forEachNode(node => {

            if (node.data?.id === 'TOTALES') {

                Object.keys(totales).forEach(field => {
                    node.data[field] = totales[field];
                });

            }

        });

        this.gridApi.refreshCells({
            force: true
        });

    }

    configurarEventos() {

        // ========================================
        // GUARDAR
        // ========================================
        $("#btnGuardarCambios").on("click", () => {
            this.guardarCambios();
        });

        // ========================================
        // EXPORTAR
        // ========================================
        $('#btnExportarExcel').on('click', () => this.exportarExcel());

        // ========================================
        // FILTROS
        // ========================================
        $("#btnAplicarFiltros").on("click", () => {

            const fechaInicio =
                $("#FiltroFechaInicio").val();

            const fechaFin =
                $("#FiltroFechaFin").val();

            this.consultarDatos(
                fechaInicio,
                fechaFin,
                null
            );

        });

        // ========================================
        // LIMPIAR
        // ========================================
        $("#btnLimpiarFiltros").on("click", () => {

            $("#FiltroFechaInicio").val("");
            $("#FiltroFechaFin").val("");

            this.consultarDatos(
                null,
                null,
                null
            );

        });

        $('#FiltroFechaInicio, #FiltroFechaFin')
            .off('change')
            .on('change', () => {

                const fechaInicio = $('#FiltroFechaInicio').val();
                const fechaFin = $('#FiltroFechaFin').val();
                const FechaTexto = this.formatearRangoFechas(fechaInicio, fechaFin);
                $("#mesActual").text(
                    FechaTexto
                );

                this.consultarDatos(fechaInicio, fechaFin, null);

            });

    }

    obtenerDatosGrid() {

        const datos = [];

        this.gridApi.forEachNode(node => {

            if (node.data?.id === 'TOTALES') return;

            const fila = node.data;

            datos.push({

                ID_REGISTRO: fila.ID_REGISTRO || null,

                FECHA: fila.Fecha,
                LINEA: fila.Linea,
                PRODUCTO: fila.Producto,
                TURNO: fila.Turno,
                GRUPO: fila.Grupo,

                TRLIBERADOS: fila.TRLiberados ?? 0,
                PRODUCCION_NETA: fila.ProduccionNeta ?? 0,
                HORAS_PROGRAMADAS: fila.HorasProgramadas ?? 0,

                PREVENTIVO: fila.Preventivo ?? 0,
                CONTROL_INVENTARIOS: fila.ControlInventarios ?? 0,
                FALTA_ENERGIA: fila.FaltaEnergia ?? 0,
                FALTA_MATERIA_PRIMA: fila.FaltaMateriaPrima ?? 0,
                TIEMPO_CALENTAMIENTO: fila.TiempoCalentamiento ?? 0,
                PREPARACION_LINEA: fila.PreparacionLinea ?? 0,
                TIEMPO_CALENTAMIENTO_HERRAMIENTA: fila.TiempoCalentamientoHerramienta ?? 0,
                ARRANQUE_ESTABILIZACION: fila.ArranqueEstabilizacion ?? 0,

                TIEMPO_MUERTO_LOGISTICA: fila.TiempoMuertoLogistica ?? 0,
                TIEMPO_MUERTO_REPARACION: fila.TiempoMuertoReparacion ?? 0,
                TIEMPO_MUERTO_CORRECTIVOS: fila.TiempoMuertoPorCorrectivos ?? 0,
                CAMBIO_MOLDE: fila.CambioMolde ?? 0,
                FALTA_PERSONAL: fila.FaltaPersonal ?? 0,
                MUERTO_PROCESO: fila.MuertoProceso ?? 0,

                TIEMPO_NO_DISPONIBLE: fila.TiempoNoDisponible ?? 0,
                TIEMPO_NO_PRODUCTIVO: fila.TiempoNoProductivo ?? 0,
                TIEMPO_PRODUCTIVO: fila.TiempoProductivo ?? 0,

                USUARIO: this.datos_usuario[0].EMAIL

            });

        });

        return datos;
    }

    exportarExcel() {
        const exporter = new ExcelExporterPeadLiso(this.gridApi, this.columnDefs);
        exporter.exportarConFormato();
    }

    async guardarCambios() {

        const datos = this.obtenerDatosGrid();

        if (datos.length === 0) {

            AlertManager.mostrar(
                "No hay datos para guardar",
                "warning"
            );

            return;
        }

        // ========================================
        // VALIDACIONES CAMPOS OBLIGATORIOS
        // ========================================
        const camposObligatorios = [
            { campo: "FECHA", nombre: "Fecha" },
            { campo: "LINEA", nombre: "Línea" },
            { campo: "PRODUCTO", nombre: "Producto" },
            { campo: "TURNO", nombre: "Turno" },
            { campo: "GRUPO", nombre: "Grupo" },
            { campo: "HORAS_PROGRAMADAS", nombre: "Horas Programadas" }
        ];

        for (let i = 0; i < datos.length; i++) {

            const fila = datos[i];

            for (const campo of camposObligatorios) {

                if (!fila[campo.campo] && fila[campo.campo] !== 0) {

                    AlertManager.mostrar(
                        `Falta el campo "${campo.nombre}" en la fila ${i + 1}`,
                        "warning"
                    );

                    return;
                }

            }

        }

        // ========================================
        // BOTÓN LOADING
        // ========================================
        $("#btnGuardarCambios")
            .prop("disabled", true)
            .html('<span class="spinner-border spinner-border-sm"></span> Guardando...');

        try {

            const response = await $.ajax({

                url: `/${this.URLBase}/GuardarTiemposMuertosPeadLiso`,

                type: "POST",

                data: JSON.stringify(datos),

                contentType: "application/json"

            });

            if (response.Status === "SI") {

                AlertManager.mostrar(
                    "Datos guardados correctamente",
                    "success"
                );

                this.cambiosPendientes = [];

                // 🔥 refrescar grid
                this.consultarDatos(null, null, null);

            } else {

                AlertManager.mostrar(
                    response.Message,
                    "warning"
                );

            }

        } catch (error) {

            console.error(error);

            AlertManager.mostrar(
                "Error al guardar",
                "danger"
            );

        } finally {

            $("#btnGuardarCambios")
                .prop("disabled", false)
                .html('<i class="bi bi-save-fill me-1"></i>Guardar');

        }

    }

    async cargarLineas() {

        try {

            const lineas = await EquiposUtil.obtenerLineas(this.datos_usuario[0].PLANTA);

            this.listaLineas = lineas;

        } catch (error) {

            console.error(error);

        }

    }

    configurarMenuContextual() {

        const menu = document.getElementById("menuContextual");

        document.addEventListener("click", () => {
            menu.style.display = "none";
        });

        document
            .querySelector("#tablaProduccion")
            .addEventListener("contextmenu", (event) => {

                event.preventDefault();

                const cell = this.gridApi.getFocusedCell();

                const rowIndex = cell?.rowIndex;

                this.filaSeleccionada =
                    this.gridApi.getDisplayedRowAtIndex(rowIndex);

                if (!this.filaSeleccionada) return;

                if (this.filaSeleccionada?.data?.id === 'TOTALES') {
                    menu.style.display = "none";
                    return;
                }

                const eliminar = menu.querySelector('[data-action="eliminar"]');

                if (this.filaSeleccionada?.data?.ID_REGISTRO) {
                    eliminar.style.display = "none";
                } else {
                    eliminar.style.display = "block";
                }

                menu.style.display = "block";
                menu.style.left = event.pageX + "px";
                menu.style.top = event.pageY + "px";

            });

        menu.addEventListener("click", (event) => {

            const action =
                event.target.getAttribute("data-action");

            if (!this.filaSeleccionada) return;

            switch (action) {

                case "agregar":

                    this.agregarFila(this.filaSeleccionada);

                    break;

                case "copiar":

                    this.copiarFilaAnterior(this.filaSeleccionada);

                    break;

                case "eliminar":

                    this.eliminarFila(this.filaSeleccionada);

                    break;
            }

            menu.style.display = "none";

            this.recalcularTotales();

        });

    }

    inicializarTooltips() {

        const tooltipTriggerList = [].slice.call(
            document.querySelectorAll('[data-bs-toggle="tooltip"]')
        );

        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });

    }

    formatearRangoFechas(fechaInicio, fechaFin) {

        const inicio = DateUtils.formatearFechaTexto(fechaInicio, false);
        const fin = DateUtils.formatearFechaTexto(fechaFin, true);

        return `Del ${inicio} al ${fin}`;
    }

    agregarFila(params) {

        const nuevaFila = {

            id: Date.now(),

            Fecha: null,
            Linea: null,
            Producto: null,
            Turno: null,
            Grupo: null,

            TRLiberados: null,
            ProduccionNeta: null,
            HorasProgramadas: null,

            Preventivo: null,
            ControlInventarios: null,
            FaltaEnergia: null,
            FaltaMateriaPrima: null,
            TiempoCalentamiento: null,
            PreparacionLinea: null,
            TiempoCalentamientoHerramienta: null,
            ArranqueEstabilizacion: null,

            TiempoMuertoLogistica: null,
            TiempoMuertoReparacion: null,
            TiempoMuertoPorCorrectivos: null,
            CambioMolde: null,
            FaltaPersonal: null,
            MuertoProceso: null,

            TiempoNoDisponible: null,
            TiempoNoProductivo: null,
            TiempoProductivo: null

        };

        this.gridApi.applyTransaction({
            add: [nuevaFila],
            addIndex: params.rowIndex + 1
        });

        this.recalcularTotales();
    }

    copiarFilaAnterior(params) {

        const filaActual = params.data;

        const nuevaFila = JSON.parse(
            JSON.stringify(filaActual)
        );

        nuevaFila.id = Date.now();
        nuevaFila.ID_REGISTRO = null;

        this.gridApi.applyTransaction({
            add: [nuevaFila],
            addIndex: params.rowIndex + 1
        });

        this.recalcularTotales();
    }

    eliminarFila(params) {

        if (params.data.id === 'TOTALES') return;

        if (params.data.ID_REGISTRO) {

            AlertManager.mostrar(
                "No se puede eliminar un registro guardado",
                "warning"
            );

            return;
        }

        this.gridApi.applyTransaction({
            remove: [params.data]
        });

        this.recalcularTotales();
    }
}

// ========================================
// ⭐ EXPORTADOR EXCEL PARA PEAD LISO
// ========================================
class ExcelExporterPeadLiso {
    constructor(gridApi, columnDefs) {
        this.gridApi = gridApi;
        this.columnDefs = columnDefs;
    }

    async exportarConFormato() {
        if (typeof ExcelJS === 'undefined') {
            console.error('❌ ExcelJS no cargado');
            alert('Error: Librería de Excel no disponible');
            return;
        }

        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Causas Tiempos Muertos Pead Liso');

            const estructura = this.analizarEstructuraColumnas();

            this.agregarFilaGrupos(worksheet, estructura);
            this.agregarFilaHeaders(worksheet, estructura);
            this.agregarFilasDatos(worksheet, estructura);
            this.aplicarEstilos(worksheet, estructura);
            this.ajustarAnchos(worksheet);

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });

            const fecha = new Date().toISOString().split('T')[0];
            const nombreArchivo = `Produccion_PeadLiso_${fecha}.xlsx`;

            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = nombreArchivo;
            link.click();

            URL.revokeObjectURL(link.href);

            console.log('✅ Excel Pead Liso exportado correctamente');
            if (typeof AlertManager !== 'undefined') {
                AlertManager.mostrar('✅ Excel exportado correctamente', 'success');
            }

        } catch (error) {
            console.error('Error al exportar:', error);
            alert('Error al exportar Excel: ' + error.message);
        }
    }

    analizarEstructuraColumnas() {
        const grupos = [];
        let totalColumnas = 0;

        this.columnDefs.forEach(grupo => {
            if (grupo.children) {
                const numColumnas = grupo.children.length;
                grupos.push({
                    nombre: grupo.headerName || '',
                    columnas: numColumnas,
                    inicio: totalColumnas + 1,
                    fin: totalColumnas + numColumnas,
                    children: grupo.children
                });
                totalColumnas += numColumnas;
            }
        });

        return { grupos, totalColumnas };
    }

    agregarFilaGrupos(worksheet, estructura) {
        const fila = worksheet.addRow([]);

        estructura.grupos.forEach(grupo => {
            if (grupo.nombre) {
                fila.getCell(grupo.inicio).value = grupo.nombre;
                if (grupo.columnas > 1) {
                    worksheet.mergeCells(1, grupo.inicio, 1, grupo.fin);
                }
            }
        });
    }

    agregarFilaHeaders(worksheet, estructura) {
        const headers = [];
        estructura.grupos.forEach(grupo => {
            grupo.children.forEach(col => {
                headers.push(col.headerName);
            });
        });
        worksheet.addRow(headers);
    }

    agregarFilasDatos(worksheet, estructura) {
        this.gridApi.forEachNodeAfterFilterAndSort((node) => {
            const fila = [];

            estructura.grupos.forEach(grupo => {
                grupo.children.forEach(col => {
                    let valor = node.data[col.field];

                    // ⚠️ AJUSTA los campos de texto según Pead Liso
                    if (valor !== null && valor !== undefined && valor !== '' &&
                        !['Fecha', 'Linea', 'Producto', 'Turno', 'Grupo'].includes(col.field)) {
                        valor = parseFloat(valor);
                    }

                    if (node.data.id === 'TOTALES' &&
                        ['Fecha', 'Linea', 'Producto', 'Turno', 'Grupo'].includes(col.field)) {
                        valor = '';
                    }

                    fila.push(valor || '');
                });
            });

            worksheet.addRow(fila);
        });
    }

    aplicarEstilos(worksheet, estructura) {
        // FILA 1: GRUPOS
        const filaGrupos = worksheet.getRow(1);
        filaGrupos.height = 30;

        estructura.grupos.forEach(grupo => {
            if (grupo.nombre) {
                const celda = filaGrupos.getCell(grupo.inicio);

                let colorFondo = '0058A1';
                let colorTexto = 'FFFFFF';

                if (grupo.nombre === 'TIEMPO NO DISPONIBLE') {
                    colorFondo = 'FF69B4';
                } else if (grupo.nombre === 'TIEMPO NO PRODUCTIVO') {
                    colorFondo = '90EE90';
                    colorTexto = '333333';
                }

                celda.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF' + colorFondo }
                };
                celda.font = {
                    bold: true,
                    color: { argb: 'FF' + colorTexto },
                    size: 12
                };
                celda.alignment = {
                    vertical: 'middle',
                    horizontal: 'center'
                };
                celda.border = {
                    top: { style: 'thin' },
                    bottom: { style: 'thin' },
                    left: { style: 'thin' },
                    right: { style: 'thin' }
                };
            }
        });

        // FILA 2: HEADERS
        const filaHeaders = worksheet.getRow(2);
        filaHeaders.height = 60;

        for (let col = 1; col <= estructura.totalColumnas; col++) {
            const celda = filaHeaders.getCell(col);
            celda.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF0058A1' }
            };
            celda.font = {
                bold: true,
                color: { argb: 'FFFFFFFF' },
                size: 11
            };
            celda.alignment = {
                vertical: 'middle',
                horizontal: 'center',
                wrapText: true
            };
            celda.border = {
                top: { style: 'thin' },
                bottom: { style: 'thin' },
                left: { style: 'thin' },
                right: { style: 'thin' }
            };
        }

        // FILAS DE DATOS
        const totalFilas = worksheet.rowCount;

        for (let rowNum = 3; rowNum <= totalFilas; rowNum++) {
            const fila = worksheet.getRow(rowNum);
            const esFilaTotales = rowNum === totalFilas;

            let colIdx = 0;
            estructura.grupos.forEach(grupo => {
                grupo.children.forEach(col => {
                    colIdx++;
                    const celda = fila.getCell(colIdx);

                    if (esFilaTotales) {
                        celda.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFE9ECEF' }
                        };
                        celda.font = {
                            bold: true,
                            color: { argb: 'FF0058A1' },
                            size: 11
                        };
                        celda.border = {
                            top: { style: 'medium', color: { argb: 'FF0058A1' } },
                            bottom: { style: 'thin' },
                            left: { style: 'thin' },
                            right: { style: 'thin' }
                        };
                    } else {
                        const colorFondo = this.obtenerColorCelda(col.cellClass);

                        celda.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: colorFondo }
                        };
                        celda.font = { size: 10 };
                        celda.border = {
                            top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                            bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                            left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                            right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
                        };

                        // ⚠️ AJUSTA según tus campos de texto
                        if (!['Fecha', 'Linea', 'Producto', 'Turno', 'Grupo'].includes(col.field)) {
                            celda.numFmt = '0.00';
                        }
                    }

                    celda.alignment = {
                        vertical: 'middle',
                        horizontal: 'center'
                    };
                });
            });
        }
    }

    obtenerColorCelda(cellClass) {
        const colores = {
            'celda-azul': 'FFCFE2FF',
            'celda-verde': 'FFD1E7DD',
            'celda-rosa': 'FFF8D7DA',
            'celda-verde-claro': 'FFD4EDDA',
            'celda-azul-claro': 'FFE7F3FF',
            'celda-verde-fuerte': 'FFA8D5BA'
        };
        return colores[cellClass] || 'FFFFFFFF';
    }

    ajustarAnchos(worksheet) {
        let colIdx = 0;

        this.columnDefs.forEach(grupo => {
            if (grupo.children) {
                grupo.children.forEach(col => {
                    colIdx++;

                    let ancho = 15;
                    if (col.field === 'Fecha') ancho = 12;
                    else if (col.field === 'Linea' || col.field === 'Turno' || col.field === 'Grupo') ancho = 8;
                    else if (col.field === 'Producto') ancho = 14;
                    else if (col.headerName && col.headerName.length > 20) ancho = 20;

                    worksheet.getColumn(colIdx).width = ancho;
                });
            }
        });
    }
}