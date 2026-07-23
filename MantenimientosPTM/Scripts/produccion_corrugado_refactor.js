// ========================================
// GESTOR DE UI
// ========================================
class UIManager {
    static inicializarUI() {
        $("#ProduccionContainer").addClass("selected");
        $("#ProduccionContainer a").addClass("whiteText");
        $("#produccion-collapse").addClass("show");
        $("#RegistroProduccionCorrugadoURL").addClass("selected-item");
        console.log('✅ UI Corrugado inicializada');
    }
}

// ========================================
// GESTOR DE EVENTOS
// ========================================
class GestionEventosCorrugado {
    constructor() {
        this.URLBase = "Produccion";
        this.datos_usuario = GlobalUtil.getDatosUsuario();
        this.appProduccion =
            new GestionProduccionCorrugado(
                this.datos_usuario,
                this.URLBase
            );
    }

    inicializar() {
        UIManager.inicializarUI();
        this.appProduccion.inicializar();
        console.log('✅ Sistema Completo Corrugado inicializado');
    }
}

// ========================================
// INICIALIZACIÓN
// ========================================
$(document).ready(function () {
    const app = new GestionEventosCorrugado();
    app.inicializar();
});

// ========================================
// APLICACIÓN PRINCIPAL - GESTIÓN PRODUCCIÓN CORRUGADO
// ========================================
class GestionProduccionCorrugado extends GestionProduccionBase {
    constructor(datos_usuario, URLBase) {
        super(datos_usuario, URLBase, 110);
        this.URLBaseMantenimientosCorrectivos = "MantenimientosCorrectivos"; // 🔥 NUEVO
        this.ID_AREA_CORRECTIVOS = (datos_usuario[0].PLANTA == "1" ? 7 : 7); // 🔥 PVC REVISAR PARA PLANTA 2
    }

    async inicializar() {
        await this.inicializarCommon();

        // 📧 NUEVO: Inicializar gestor de correos
        this.correosManager = new CorreosManagerCorrugado();
        this.correosManager.setAppProduccion(this);
        this.correosManager.inicializar();

        // 🔥 CONSULTAR DATOS
        this.consultarDatos(null, null, null);

        // 🔧 Inicializar tooltips
        this.inicializarTooltips();

        console.log('✅ Sistema Corrugado inicializado');
    }

    crearTotalesTemplate() {
        return {
            Mes: null,
            Fecha: null,
            Linea: null,
            Corrugador: null,
            Producto: null,
            Turno: null,
            Grupo: null,
            PesoMinimo: 0,
            TRLiberados: 0,
            ProduccionNeta: 0,
            PesoEstandar: 0,
            PorcentajeSobrepeso: 0,
            ScrapSinCorteSierra: 0,
            ScrapCorteSierra: 0,
            ScrapTotal: 0,
            PorcentajeScrapSinCorte: 0,
            PorcentajeScrapCorte: 0,
            KgReproceso: 0,
            Carbonato: 0,
            HorasProgramadas: 0,
            MantenimientoPreventivo: 0,
            ControlInventarios: 0,
            FaltaEnergia: 0,
            FaltaMateriaPrima: 0,
            PreparacionCambio: 0,
            ArranqueEstabilizacion: 0,
            TiempoMttoCorrectivosArranque: 0,
            TiempoMuertoCorrectivos: 0,
            CambioMoldeSetupExcesos: 0,
            TiempoMuertoArrancar: 0,
            TiempoMuertoProceso: 0,
            TiempoDisponible: 0,
            TiempoProductivo: 0
        };
    }

    inicializarGrid() {
        const gridDiv = document.querySelector('#tablaProduccion');

        // ========================================
        // DEFINICIÓN DE COLUMNAS CORRUGADO
        // ========================================
        const columnDefs = [
            // COLUMNAS BÁSICAS (AZUL CLARO)
            {
                headerName: 'DATOS GENERALES',
                headerClass: 'header-grupo-morado',
                children: [

                    {
                        field: 'Mes',
                        headerName: 'Mes',
                        editable: false,
                        width: 110,
                        pinned: 'left',
                        cellClass: 'celda-gris',
                        valueFormatter: params => {

                            if (params.data?.id === 'TOTALES') {
                                return '';
                            }

                            return params.value || '';
                        }
                    },

                    {
                        field: 'Fecha',
                        headerName: 'Fecha',
                        editable: true,
                        width: 120,
                        cellClass: 'celda-azul',
                        pinned: 'left',
                        cellEditor: 'agDateCellEditor',
                        cellEditorParams: {
                            browserDatePicker: true,
                            min: '2020-01-01',
                            max: '2035-12-31'
                        },
                        valueFormatter: params => {

                            if (!params.value) return '';

                            return new Date(
                                params.value
                            ).toLocaleDateString('es-MX');
                        }
                    },

                    {
                        field: 'Linea',
                        headerName: 'Línea',
                        editable: true,
                        width: 130,
                        cellClass: 'celda-azul',
                        pinned: 'left',
                        cellEditor: 'agSelectCellEditor',
                        cellEditorParams: () => {
                            return {
                                values:
                                    this.listaLineas.map(
                                        x => x.label
                                    )
                            };
                        },
                        valueFormatter: params => {

                            if (params.data?.id === 'TOTALES') {
                                return '';
                            }

                            return params.value || '';
                        }
                    },

                    {
                        field: 'Corrugador',
                        headerName: 'Corrugador',
                        editable: true,
                        width: 120,
                        cellClass: 'celda-azul',
                        pinned: 'left',
                        cellEditor: 'agSelectCellEditor',
                        cellEditorParams: {
                            values: [
                                '60-30',
                                '08-30'
                            ]
                        },
                        valueFormatter: params => {

                            if (params.data?.id === 'TOTALES') {
                                return '';
                            }

                            return params.value || '';
                        }
                    },

                    {
                        field: 'Producto',
                        headerName: 'Producto',
                        editable: true,
                        width: 160,
                        cellClass: 'celda-azul',
                        pinned: 'left',
                        cellEditor:
                            'articuloAutocompleteEditor',
                        valueFormatter: params => {

                            if (params.data?.id === 'TOTALES') {
                                return '';
                            }

                            return params.value || '';
                        }
                    },

                    {
                        field: 'Turno',
                        headerName: 'Turno',
                        editable: true,
                        width: 90,
                        cellClass: 'celda-azul',
                        pinned: 'left',
                        valueFormatter: params => {

                            if (params.data?.id === 'TOTALES') {
                                return '';
                            }

                            return params.value || '';
                        }
                    },

                    {
                        field: 'Grupo',
                        headerName: 'Grupo',
                        editable: true,
                        width: 90,
                        cellClass: 'celda-azul',
                        pinned: 'left',
                        cellEditor: 'agSelectCellEditor',
                        cellEditorParams: {
                            values: [
                                'A',
                                'B',
                                'C',
                                'D'
                            ]
                        },
                        valueFormatter: params => {

                            if (params.data?.id === 'TOTALES') {
                                return '';
                            }

                            return params.value || '';
                        }
                    }

                ]
            },

            // COLUMNAS AZUL CLARO (Producción)
            {
                headerName: 'PRODUCCIÓN',
                headerClass: 'header-grupo-amarillo',
                children: [

                    {
                        field: 'PesoMinimo',
                        headerName: 'PESO MÍNIMO',
                        editable: false,
                        width: 120,
                        cellClass: 'celda-gris',
                        valueFormatter: params =>
                            this.formatearNumero(params.value)
                    },

                    {
                        field: 'TRLiberados',
                        headerName: 'TR LIBERADOS',
                        width: 120,
                        ...this.getColumnaNumerica('celda-azul')
                    },

                    {
                        field: 'ProduccionNeta',
                        headerName: 'PRODUCCIÓN NETA',
                        width: 140,
                        ...this.getColumnaNumerica('celda-azul')
                    },

                    {
                        field: 'PesoEstandar',
                        headerName: 'PESO ESTÁNDAR',
                        editable: false,
                        width: 140,
                        cellClass: 'celda-verde-formula',
                        valueFormatter: params =>
                            this.formatearNumero(params.value)
                    },

                    {
                        field: 'PorcentajeSobrepeso',
                        headerName: '% SOBREPESO',
                        editable: false,
                        width: 120,
                        cellClass: 'celda-verde-formula',
                        valueFormatter: params =>
                            this.formatearNumero(params.value)
                    },

                    {
                        field: 'ScrapSinCorteSierra',
                        headerName: 'SCRAP S/CORTES SIERRA',
                        width: 150,
                        ...this.getColumnaNumerica('celda-azul')
                    },

                    {
                        field: 'ScrapCorteSierra',
                        headerName: 'SCRAP CORTES SIERRA',
                        width: 150,
                        ...this.getColumnaNumerica('celda-azul')
                    },

                    {
                        field: 'ScrapTotal',
                        headerName: 'SCRAP TOTAL',
                        editable: false,
                        width: 130,
                        cellClass: 'celda-verde-formula',
                        valueFormatter: params =>
                            this.formatearNumero(params.value)
                    },

                    {
                        field: 'PorcentajeScrapSinCorte',
                        headerName: '% SCRAP S/CORTE',
                        editable: false,
                        width: 130,
                        cellClass: 'celda-verde-formula',
                        valueFormatter: params =>
                            this.formatearNumero(params.value)
                    },

                    {
                        field: 'PorcentajeScrapCorte',
                        headerName: '% SCRAP CORTE',
                        editable: false,
                        width: 130,
                        cellClass: 'celda-verde-formula',
                        valueFormatter: params =>
                            this.formatearNumero(params.value)
                    },

                    {
                        field: 'KgReproceso',
                        headerName: 'KG REPROCESO',
                        width: 130,
                        ...this.getColumnaNumerica('celda-azul')
                    },

                    {
                        field: 'Carbonato',
                        headerName: 'CARBONATO',
                        width: 120,
                        ...this.getColumnaNumerica('celda-azul')
                    }

                ]
            },

            // ========================================
            // DISPONIBILIDAD
            // ========================================
            {
                headerName: 'DISPONIBILIDAD',
                headerClass: 'header-grupo-azul',
                children: [
                    {
                        field: 'HorasProgramadas',
                        headerName: 'HORAS PROGRAMADAS',
                        width: 140,
                        ...this.getColumnaNumerica('celda-azul')
                    }
                ]
            },
            // ========================================
            // TIEMPO NO DISPONIBLE
            // ========================================
            {
                headerName: 'TIEMPO NO DISPONIBLE',
                headerClass: 'header-grupo-rosa',
                children: [

                    {
                        field: 'MantenimientoPreventivo',
                        headerName: 'MANTENIMIENTO PREVENTIVO',
                        width: 140,
                        ...this.getColumnaNumerica('celda-rosa')
                    },

                    {
                        field: 'ControlInventarios',
                        headerName: 'CONTROL INVENTARIOS',
                        width: 140,
                        ...this.getColumnaNumerica('celda-rosa')
                    },

                    {
                        field: 'FaltaEnergia',
                        headerName: 'FALTA ENERGÍA ELÉCTRICA',
                        width: 140,
                        ...this.getColumnaNumerica('celda-rosa')
                    },

                    {
                        field: 'FaltaMateriaPrima',
                        headerName: 'FALTA MATERIA PRIMA E INSUMOS',
                        width: 170,
                        ...this.getColumnaNumerica('celda-rosa')
                    },

                    {
                        field: 'PreparacionCambio',
                        headerName: 'PREPARACIÓN DE LÍNEA',
                        width: 150,
                        ...this.getColumnaNumerica('celda-rosa')
                    },

                    {
                        field: 'ArranqueEstabilizacion',
                        headerName: 'ARRANQUE Y ESTABILIZACIÓN',
                        width: 150,
                        ...this.getColumnaNumerica('celda-rosa')
                    },

                    {
                        field: 'TiempoMttoCorrectivosArranque',
                        headerName: 'MTTO CORRECTIVOS ARRANQUE',
                        width: 170,
                        ...this.getColumnaNumerica('celda-rosa')
                    }

                ]
            },

            // GRUPO: TIEMPO NO PRODUCTIVO (VERDE CLARO)
            {
                headerName: 'TIEMPO NO PRODUCTIVO',
                headerClass: 'header-grupo-verde-claro',
                children: [
                    {
                        field: 'TiempoMuertoCorrectivos',
                        headerName: 'TIEMPO MUERTO POR CORRECTIVOS',
                        width: 110,
                        ...this.getColumnaNumerica('celda-verde-claro')
                    },
                    {
                        field: 'CambioMoldeSetupExcesos',
                        headerName: 'CAMBIO DE MOLDE (SETUP) EXCESOS',
                        width: 170,
                        ...this.getColumnaNumerica('celda-verde-claro')
                    },
                    {
                        field: 'TiempoMuertoArrancar',
                        headerName: 'TIEMPO MUERTO POR ARRANCAR',
                        width: 110,
                        ...this.getColumnaNumerica('celda-verde-claro')
                    },
                    {
                        field: 'TiempoMuertoProceso',
                        headerName: 'TIEMPO MUERTO PROCESO',
                        width: 110,
                        ...this.getColumnaNumerica('celda-verde-claro')
                    }
                ]
            },

            // KPIS
            {
                headerName: 'KPIs',
                headerClass: 'header-grupo-verde',
                children: [
                    {
                        field: 'TiempoDisponible',
                        headerName: 'TIEMPO DISPONIBLE',
                        editable: false,
                        width: 110,
                        cellClass: 'celda-azul-claro',
                        valueFormatter: params => this.formatearNumero(params.value)
                    },
                    {
                        field: 'TiempoProductivo',
                        headerName: 'TIEMPO PRODUCTIVO',
                        editable: false,
                        width: 110,
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
                URLBase: this.URLBase,
                appProduccion: this
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

                    const readonlyFields = [

                        // PRODUCCIÓN

                        'PesoMinimo',

                        'PesoEstandar',

                        'PorcentajeSobrepeso',

                        'ScrapTotal',

                        'PorcentajeScrapSinCorte',

                        'PorcentajeScrapCorte',

                        // KPIS

                        'TiempoDisponible',

                        'TiempoProductivo'

                    ];

                    return !readonlyFields.includes(
                        params.colDef.field
                    );

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
            onCellValueChanged: (event) => this.onCellChanged(event),
            onGridReady: (params) => {
                this.gridApi = params.api;
                this.gridColumnApi = params.columnApi;
                this.agregarFilaTotales();
                //this.ajustarAlturaGrid();
            },
            getRowStyle: params => {
                if (params.data && params.data.id === 'TOTALES') {
                    return {
                        fontWeight: 'bold',
                        backgroundColor: '#e9ecef',
                        borderTop: '2px solid #0058a1'
                    };
                }
            }
        };

        new agGrid.Grid(gridDiv, gridOptions);
    }

    agregarFilaTotales() {

        // 🔥 NUEVO: evitar agregar TOTALES duplicado
        let existeTotales = false;

        this.gridApi.forEachNode(node => {
            if (node.data?.id === 'TOTALES') {
                existeTotales = true;
            }
        });

        if (existeTotales) {
            this.recalcularTotales(); // ya existe, solo recalculamos
            return;
        }

        const totales = this.obtenerTotalesGrid(); // 🔥 reutilizamos el método que ya calcula todo

        this.gridApi.applyTransaction({
            add: [totales]
        });

    }

    // ========================================
    // 🔥 NUEVO: Traer correctivos cerrados y agregarlos al grid
    // ========================================

    async traerCorrectivosCerrados(fechaInicio, fechaFin, linea) {

        try {

            GlobalUtil.mostrarLoader(true);

            const response = await $.ajax({
                url: `/${this.URLBaseMantenimientosCorrectivos}/GetMantenimientosCorrectivosPendientes`,
                type: "POST",
                data: {
                    draw: 1,
                    length: 999999,
                    start: 0,
                    "search[value]": "",
                    FiltroSolicitud: "",
                    FiltroFechaInicio: fechaInicio,
                    FiltroFechaFin: fechaFin,
                    FiltroArea: this.ID_AREA_CORRECTIVOS, // 🔥 7 = Corrugado
                    FiltroLinea: linea || "",
                    FiltroOrdenTrabajo: "",
                    FiltroPlanta: this.datos_usuario[0].PLANTA,
                    FiltroEstatusOT: "4",
                    FiltroExcluirSincronizadosPEADCORR: "S" // ⚠️ nuevo parámetro, falta agregarlo al SP
                }
            });

            const correctivos = response.data || [];

            if (correctivos.length === 0) {
                return false;
            }

            return this.agregarCorrectivosAlGrid(correctivos);

        } catch (error) {

            console.error(error);
            AlertManager.mostrar("Error al consultar mantenimientos correctivos", "danger");
            return false;

        } finally {
            GlobalUtil.mostrarLoader(false);
        }
    }

    agregarCorrectivosAlGrid(correctivos) {

        const otmcYaEnGrid = new Set();

        this.gridApi.forEachNode(node => {
            if (node.data?.OTMC) {
                otmcYaEnGrid.add(node.data.OTMC);
            }
        });

        const correctivosNuevos = correctivos.filter(
            item => !otmcYaEnGrid.has(item.NumeroOrden)
        );

        if (correctivosNuevos.length === 0) {
            return false;
        }

        const filasNuevas = [];
        const lineasNoEncontradas = [];

        correctivosNuevos.forEach(item => {

            const nuevaFila = this.crearFilaVacia();

            nuevaFila.id = this.generarIdTemporal();
            nuevaFila.OTMC = item.NumeroOrden;
            nuevaFila.Fecha = this.parsearFechaCorrectivo(item.FechaCreacion);
            nuevaFila.TiempoMuertoCorrectivos = parseFloat(item.DuracionHrs) || 0;

            const lineaEncontrada = this.listaLineas.find(
                l => String(l.value) === String(item.IdLineaProduccion)
            );

            if (lineaEncontrada) {
                nuevaFila.Linea = lineaEncontrada.label;
            } else {
                nuevaFila.Linea = null;
                lineasNoEncontradas.push(item.NumeroOrden);
            }

            if (nuevaFila.Fecha) {
                const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
                nuevaFila.Mes = meses[new Date(nuevaFila.Fecha).getMonth()];
            }

            this.recalcularFila(nuevaFila);

            filasNuevas.push(nuevaFila);
        });

        this.gridApi.applyTransaction({ add: filasNuevas });

        if (lineasNoEncontradas.length > 0) {
            AlertManager.mostrar(
                `Las siguientes órdenes no tienen línea reconocida y quedaron sin línea asignada: ${lineasNoEncontradas.join(', ')}`,
                "warning"
            );
        }

        return true;
    }

    parsearFechaCorrectivo(fechaTexto) {

        if (!fechaTexto) return null;

        const [fechaParte] = fechaTexto.split(' ');
        const [dia, mes, anio] = fechaParte.split('/');

        if (!dia || !mes || !anio) return null;

        return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    }

    // 🔥 Template de fila vacía, ajustado a los campos de Corrugado
    crearFilaVacia() {
        return {
            id: null,
            ID_REGISTRO: null,
            OTMC: null,
            Mes: null, Fecha: null, Linea: null, Corrugador: null, Producto: null, Turno: null, Grupo: null,
            PesoMinimo: 0,
            TRLiberados: null, ProduccionNeta: null,
            PesoEstandar: 0, PorcentajeSobrepeso: 0,
            ScrapSinCorteSierra: null, ScrapCorteSierra: null,
            ScrapTotal: 0, PorcentajeScrapSinCorte: 0, PorcentajeScrapCorte: 0,
            KgReproceso: null, Carbonato: null,
            HorasProgramadas: null,
            MantenimientoPreventivo: null, ControlInventarios: null,
            FaltaEnergia: null, FaltaMateriaPrima: null,
            PreparacionCambio: null, ArranqueEstabilizacion: null,
            TiempoMttoCorrectivosArranque: null,
            TiempoMuertoCorrectivos: null, CambioMoldeSetupExcesos: null,
            TiempoMuertoArrancar: null, TiempoMuertoProceso: null,
            TiempoDisponible: 0, TiempoProductivo: 0
        };
    }

    ajustarAlturaGrid() {
        requestAnimationFrame(() => {
            const gridDiv = document.querySelector('#tablaProduccion');
            if (!gridDiv || !this.gridApi) return;

            const headerHeight = 120;
            const rowHeight = 40;
            const totalRows = this.gridApi.getDisplayedRowCount();
            const scrollbarHeight = 20;

            const alturaCalculada = headerHeight + (totalRows * rowHeight) + scrollbarHeight;
            const alturaFinal = Math.min(alturaCalculada, 600) + 40;

            gridDiv.style.height = alturaFinal + 'px';
        });
    }

    formatearNumero(valor) {
        if (valor === null || valor === undefined || valor === '') return '';

        // Asegurar que es un número
        const numValue = typeof valor === 'number' ? valor : parseFloat(valor);

        if (isNaN(numValue)) return '';

        // Formato con 2 decimales y punto como separador decimal
        return numValue.toFixed(2);
    }

    formatearPorcentaje(valor) {

        if (valor === null || valor === undefined || valor === '') {
            return '';
        }

        return `${parseFloat(valor).toFixed(2)}%`;
    }

    onCellChanged(event) {

        if (event.data.id === 'TOTALES') {

            event.api.undoCellEditing();

            return;
        }

        const row = event.data;

        if (row.Fecha) {

            const fecha = new Date(row.Fecha);

            const meses = [
                'ENERO',
                'FEBRERO',
                'MARZO',
                'ABRIL',
                'MAYO',
                'JUNIO',
                'JULIO',
                'AGOSTO',
                'SEPTIEMBRE',
                'OCTUBRE',
                'NOVIEMBRE',
                'DICIEMBRE'
            ];

            row.Mes = meses[fecha.getMonth()];
        }

        // 🔥 UNA SOLA LLAMADA
        this.recalcularFila(row);

        event.node.setData(row);

        this.cambiosPendientes.push({
            id: row.id,
            campo: event.colDef.field,
            valorAnterior: event.oldValue,
            valorNuevo: event.newValue
        });

        this.gridApi.refreshCells({
            rowNodes: [event.node],
            force: true
        });

        this.recalcularTotales();
    }

    recalcularFila(row) {

        row.PesoEstandar =
            this.calcularPesoEstandar(row);

        row.PorcentajeSobrepeso =
            this.calcularSobrepeso(row);

        row.ScrapTotal =
            this.calcularScrapTotal(row);

        // 🔥 NO recalcular ScrapSinCorteSierra ni ScrapCorteSierra
        // porque son editables por el usuario
        // Solo recalcular los porcentajes derivados

        row.PorcentajeScrapSinCorte =
            this.calcularScrapSinCorte(row);

        row.PorcentajeScrapCorte =
            this.calcularScrapCorte(row);

        row.TiempoDisponible =
            this.calcularTiempoDisponible(row);

        row.TiempoProductivo =
            this.calcularTiempoProductivo(row);

    }

    recalcularTotales() {

        const filaTotales = this.obtenerTotalesGrid();

        this.gridApi.forEachNode((node) => {

            if (node.data.id === 'TOTALES') {

                node.setData(filaTotales);
            }

        });
    }

    obtenerTotalesGrid() {

        const totales = {

            id: 'TOTALES',

            // GENERALES
            Mes: null,
            Fecha: null,
            Linea: null,
            Corrugador: null,
            Producto: null,
            Turno: null,
            Grupo: null,

            // PRODUCCIÓN
            PesoMinimo: 0,

            TRLiberados: 0,
            ProduccionNeta: 0,

            PesoEstandar: 0,
            PorcentajeSobrepeso: null,

            ScrapSinCorteSierra: 0,
            ScrapCorteSierra: 0,

            ScrapTotal: 0,

            PorcentajeScrapSinCorte: null,
            PorcentajeScrapCorte: null,

            KgReproceso: 0,
            Carbonato: 0,

            // DISPONIBILIDAD
            HorasProgramadas: 0,

            // TIEMPO NO DISPONIBLE
            MantenimientoPreventivo: 0,
            ControlInventarios: 0,
            FaltaEnergia: 0,
            FaltaMateriaPrima: 0,
            PreparacionCambio: 0,
            ArranqueEstabilizacion: 0,

            TiempoMttoCorrectivosArranque: 0,

            // TIEMPO NO PRODUCTIVO
            TiempoMuertoCorrectivos: 0,
            CambioMoldeSetupExcesos: 0,
            TiempoMuertoArrancar: 0,
            TiempoMuertoProceso: 0,

            // KPIS
            TiempoDisponible: 0,
            TiempoProductivo: 0
        };

        this.gridApi.forEachNode((node) => {

            if (!node.data || node.data.id === 'TOTALES') {
                return;
            }

            totales.PesoMinimo += Number(node.data.PesoMinimo || 0);
            totales.TRLiberados += Number(node.data.TRLiberados || 0);
            totales.ProduccionNeta += Number(node.data.ProduccionNeta || 0);

            totales.PesoEstandar += Number(node.data.PesoEstandar || 0);

            totales.ScrapSinCorteSierra += Number(node.data.ScrapSinCorteSierra || 0);
            totales.ScrapCorteSierra += Number(node.data.ScrapCorteSierra || 0);

            totales.ScrapTotal += Number(node.data.ScrapTotal || 0);

            totales.KgReproceso += Number(node.data.KgReproceso || 0);
            totales.Carbonato += Number(node.data.Carbonato || 0);

            totales.HorasProgramadas += Number(node.data.HorasProgramadas || 0);

            totales.MantenimientoPreventivo += Number(node.data.MantenimientoPreventivo || 0);
            totales.ControlInventarios += Number(node.data.ControlInventarios || 0);
            totales.FaltaEnergia += Number(node.data.FaltaEnergia || 0);
            totales.FaltaMateriaPrima += Number(node.data.FaltaMateriaPrima || 0);
            totales.PreparacionCambio += Number(node.data.PreparacionCambio || 0);
            totales.ArranqueEstabilizacion += Number(node.data.ArranqueEstabilizacion || 0);

            totales.TiempoMttoCorrectivosArranque += Number(node.data.TiempoMttoCorrectivosArranque || 0);

            totales.TiempoMuertoCorrectivos += Number(node.data.TiempoMuertoCorrectivos || 0);

            totales.CambioMoldeSetupExcesos += Number(node.data.CambioMoldeSetupExcesos || 0);

            totales.TiempoMuertoArrancar += Number(node.data.TiempoMuertoArrancar || 0);

            totales.TiempoMuertoProceso += Number(node.data.TiempoMuertoProceso || 0);

            totales.TiempoDisponible += Number(node.data.TiempoDisponible || 0);

            totales.TiempoProductivo += Number(node.data.TiempoProductivo || 0);

        });

        // ========================================
        // PORCENTAJES TOTALES
        // ========================================

        if (totales.PesoEstandar > 0) {

            totales.PorcentajeSobrepeso =
                ((totales.ProduccionNeta / totales.PesoEstandar) - 1) * 100;
        }

        if (totales.ProduccionNeta > 0) {

            totales.PorcentajeScrapSinCorte =
                (totales.ScrapSinCorteSierra / totales.ProduccionNeta) * 100;

            totales.PorcentajeScrapCorte =
                (totales.ScrapCorteSierra / totales.ProduccionNeta) * 100;
        }

        return totales;
    }

    calcularPesoEstandar(row) {

        const pesoMinimo =
            parseFloat(row.PesoMinimo) || 0;

        const trLiberados =
            parseFloat(row.TRLiberados) || 0;

        return pesoMinimo * trLiberados;
    }

    calcularSobrepeso(row) {

        const produccion =
            parseFloat(row.ProduccionNeta) || 0;

        const pesoEstandar =
            parseFloat(row.PesoEstandar) || 0;

        if (pesoEstandar <= 0) {
            return 0;
        }

        return (
            ((produccion / pesoEstandar) - 1)
            * 100
        );
    }

    calcularScrapTotal(row) {

        return (

            (parseFloat(row.ScrapSinCorteSierra) || 0)

            +

            (parseFloat(row.ScrapCorteSierra) || 0)

        );

    }

    // Retorna el PORCENTAJE de scrap sin corte de sierra
    calcularScrapSinCorte(row) {

        const scrap =
            parseFloat(row.ScrapSinCorteSierra) || 0;

        const produccion =
            parseFloat(row.ProduccionNeta) || 0;

        if (produccion <= 0) {
            return 0;
        }

        return (scrap / produccion) * 100;
    }

    // Retorna el PORCENTAJE de scrap con cortes de sierra
    calcularScrapCorte(row) {

        const scrap =
            parseFloat(row.ScrapCorteSierra) || 0;

        const produccion =
            parseFloat(row.ProduccionNeta) || 0;

        if (produccion <= 0) {
            return 0;
        }

        return (scrap / produccion) * 100;
    }

    calcularTiempoProductivo(row) {

        const disponible =
            parseFloat(row.TiempoDisponible) || 0;

        const tiempoNoProductivo =

            (parseFloat(row.TiempoMuertoCorrectivos) || 0)

            +

            (parseFloat(row.CambioMoldeSetupExcesos) || 0)

            +

            (parseFloat(row.TiempoMuertoArrancar) || 0)

            +

            (parseFloat(row.TiempoMuertoProceso) || 0);

        return Math.max(
            disponible - tiempoNoProductivo,
            0
        );

    }

    calcularTiempoDisponible(row) {

        const horas =
            parseFloat(row.HorasProgramadas) || 0;

        const tiempoNoDisponible =

            (parseFloat(row.MantenimientoPreventivo) || 0)

            +

            (parseFloat(row.ControlInventarios) || 0)

            +

            (parseFloat(row.FaltaEnergia) || 0)

            +

            (parseFloat(row.FaltaMateriaPrima) || 0)

            +

            (parseFloat(row.PreparacionCambio) || 0)

            +

            (parseFloat(row.ArranqueEstabilizacion) || 0)

            +

            (parseFloat(row.TiempoMttoCorrectivosArranque) || 0);

        return Math.max(
            horas - tiempoNoDisponible,
            0
        );

    }

    configurarEventos() {
        $('#btnExportarExcel').on('click', () => this.exportarExcel());
        $('#btnGuardarCambios').on('click', () => this.guardarCambios());

        // ========================================
        // 📧 NUEVO: Abrir modal para enviar por correo
        // ========================================
        $('#btnEnviarCorreo').on('click', () => {
            const modal = new bootstrap.Modal(document.getElementById('modalEnviarExcelCorreo'));
            modal.show();
        });

        $('#btnAplicarFiltros').on('click', () => {

            const fechaInicio = $('#FiltroFechaInicio').val();
            const fechaFin = $('#FiltroFechaFin').val();

            this.consultarDatos(fechaInicio, fechaFin, null);

        });

        $('#btnLimpiarFiltros').on('click', () => {

            $('#FiltroFechaInicio').val('');
            $('#FiltroFechaFin').val('');

            this.consultarDatos(null, null, null);

        });

        $('#FiltroFechaInicio, #FiltroFechaFin')
            .off('change')
            .on('change', () => {

                const fechaInicio = $('#FiltroFechaInicio').val();
                const fechaFin = $('#FiltroFechaFin').val();

                const FechaTexto =
                    this.formatearRangoFechas(
                        fechaInicio,
                        fechaFin
                    );

                $("#mesActual").text(FechaTexto);

                this.consultarDatos(
                    fechaInicio,
                    fechaFin,
                    null
                );

            });
    }

    async guardarCambios() {

        const datos = this.obtenerDatosGrid();

        let datosJSON = JSON.stringify(datos);
        

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
            { campo: "CORRUGADOR", nombre: "Corrugador" },
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
        // VALIDAR TIEMPO NO DISPONIBLE
        // ========================================
        const camposTiempo = [
            "MANTENIMIENTO_PREVENTIVO",
            "CONTROL_INVENTARIOS",
            "FALTA_ENERGIA",
            "FALTA_MATERIA_PRIMA",
            "PREPARACION_CAMBIO",
            "ARRANQUE_ESTABILIZACION",
            "TIEMPO_MTTO_CORRECTIVOS_ARRANQUE"
        ];

        const existeTiempo = datos.some(fila =>
            camposTiempo.some(campo => Number(fila[campo]) > 0)
        );

        // if (!existeTiempo) {

        //     AlertManager.mostrar(
        //         "Debe capturar al menos un TIEMPO NO DISPONIBLE",
        //         "warning"
        //     );

        //     return;
        // }

        // ========================================
        // BOTÓN LOADING
        // ======================================m==
        $("#btnGuardarCambios")
            .prop("disabled", true)
            .html('<span class="spinner-border spinner-border-sm me-2"></span>Guardando...');

        try {

            const response = await $.ajax({

                url: `/${this.URLBase}/GuardarTiemposMuertosCorrugado`,

                type: "POST",

                data: JSON.stringify(datos),

                contentType: "application/json",

                beforeSend: () => {
                    GlobalUtil.mostrarLoader(true);
                }

            });

            if (response.Status === "SI") {

                AlertManager.mostrar(
                    "Datos guardados correctamente",
                    "success"
                );

                this.cambiosPendientes = [];

                // 🔥 refrescar grid
                await this.consultarDatos(null, null, null);

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

            GlobalUtil.mostrarLoader(false);

        }

    }



    exportarExcel() {
        const exporter = new ExcelExporterCorrugado(this.gridApi, this.columnDefs);
        exporter.exportarConFormato();
    }

    inicializarTooltips() {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(el => new bootstrap.Tooltip(el));
    }

    cargarDatosIniciales() {

        this.datosOriginales = [
            {
                id: 1,

                // ========================================
                // DATOS GENERALES
                // ========================================

                Mes: null,
                Fecha: null,
                Linea: null,
                Corrugador: null,
                Producto: null,
                Turno: null,
                Grupo: null,

                // ========================================
                // PRODUCCIÓN
                // ========================================

                PesoMinimo: 0,

                TRLiberados: null,
                ProduccionNeta: null,

                PesoEstandar: 0,
                PorcentajeSobrepeso: 0,

                ScrapSinCorteSierra: null,
                ScrapCorteSierra: null,

                ScrapTotal: 0,

                PorcentajeScrapSinCorte: 0,
                PorcentajeScrapCorte: 0,

                KgReproceso: null,
                Carbonato: null,

                // ========================================
                // DISPONIBILIDAD
                // ========================================

                HorasProgramadas: null,

                // ========================================
                // TIEMPO NO DISPONIBLE
                // ========================================

                MantenimientoPreventivo: null,
                ControlInventarios: null,
                FaltaEnergia: null,
                FaltaMateriaPrima: null,
                PreparacionCambio: null,
                ArranqueEstabilizacion: null,

                TiempoMttoCorrectivosArranque: null,

                // ========================================
                // TIEMPO NO PRODUCTIVO
                // ========================================

                TiempoMuertoCorrectivos: null,

                CambioMoldeSetupExcesos: null,

                TiempoMuertoArrancar: null,
                TiempoMuertoProceso: null,

                // ========================================
                // KPIs
                // ========================================

                TiempoDisponible: 0,
                TiempoProductivo: 0
            }
        ];

        this.inicializarGrid();

        setTimeout(() => {
            $("#tablaProduccion").removeClass("d-none");
        }, 1000);
    }

    async consultarDatos(fechaInicio, fechaFin, linea) {

        try {

            $("#tablaProduccion").addClass("d-none");
            GlobalUtil.mostrarLoader(true);

            const response = await $.ajax({
                url: `/${this.URLBase}/GetTiemposMuertosCorrugado`,
                type: "GET",
                data: {
                    FiltroFechaInicio: fechaInicio,
                    FiltroFechaFin: fechaFin,
                    FiltroLinea: linea
                }
            });

            let hayDatosOriginales = false;

            if (response.Status === "OK") {

                const datos = JSON.parse(response.Data);
                hayDatosOriginales = this.cargarDatosGrid(datos);

            } else {

                AlertManager.mostrar(response.Message, "info");
                hayDatosOriginales = this.cargarDatosGrid(null);
            }

            // 🔥 NUEVO: correctivos ANTES de pintar totales
            const seAgregaronCorrectivos = await this.traerCorrectivosCerrados(fechaInicio, fechaFin, linea);

            if (!hayDatosOriginales && !seAgregaronCorrectivos) {
                this.gridApi.setRowData(this.datosOriginales);
            }

            // 🔥 Totales una sola vez, al final
            this.agregarFilaTotales();

        } catch (error) {

            console.error(error);

            AlertManager.mostrar(
                "Error al consultar datos",
                "danger"
            );

        } finally {

            setTimeout(() => {
                GlobalUtil.mostrarLoader(false);
                $("#tablaProduccion").removeClass("d-none");
            }, 1000);

        }

    }

    cargarDatosGrid(datos) {

        if (datos && datos.length > 0) {

            const datosFormateados = datos.map(item => ({

                id: item.ID_REGISTRO || Date.now(),

                ID_REGISTRO: item.ID_REGISTRO,
                OTMC: item.OTMC, // 🔥 NUEVO

                Mes: item.MES,

                Fecha: item.FECHA,
                Linea: item.LINEA,
                Corrugador: item.CORRUGADOR,
                Producto: item.PRODUCTO,
                Turno: item.TURNO,
                Grupo: item.GRUPO,

                PesoMinimo: item.PESO_MINIMO ?? 0,

                TRLiberados: item.TRLIBERADOS,
                ProduccionNeta: item.PRODUCCION_NETA,

                PesoEstandar: item.PESO_ESTANDAR,
                PorcentajeSobrepeso: item.PORCENTAJE_SOBREPESO,

                ScrapSinCorteSierra: item.SCRAP_SIN_CORTE_SIERRA,
                ScrapCorteSierra: item.SCRAP_CORTE_SIERRA,
                ScrapTotal: item.SCRAP_TOTAL,

                PorcentajeScrapSinCorte: item.PORCENTAJE_SCRAP_SIN_CORTE,
                PorcentajeScrapCorte: item.PORCENTAJE_SCRAP_CORTE,

                KgReproceso: item.KG_REPROCESO,
                Carbonato: item.CARBONATO,

                HorasProgramadas: item.HORAS_PROGRAMADAS,

                MantenimientoPreventivo: item.MANTENIMIENTO_PREVENTIVO,
                ControlInventarios: item.CONTROL_INVENTARIOS,
                FaltaEnergia: item.FALTA_ENERGIA,
                FaltaMateriaPrima: item.FALTA_MATERIA_PRIMA,
                PreparacionCambio: item.PREPARACION_CAMBIO,
                ArranqueEstabilizacion: item.ARRANQUE_ESTABILIZACION,

                TiempoMttoCorrectivosArranque: item.TIEMPO_MTTO_CORRECTIVOS_ARRANQUE,

                TiempoMuertoCorrectivos: item.TIEMPO_MUERTO_CORRECTIVOS,
                CambioMoldeSetupExcesos: item.CAMBIO_MOLDE_SETUP_EXCESOS,
                TiempoMuertoArrancar: item.TIEMPO_MUERTO_ARRANCAR,
                TiempoMuertoProceso: item.TIEMPO_MUERTO_PROCESO,

                TiempoDisponible: item.TIEMPO_DISPONIBLE,
                TiempoProductivo: item.TIEMPO_PRODUCTIVO

            }));

            this.gridApi.setRowData(datosFormateados);
            return true; // 🔥 sí había datos

        }

        this.gridApi.setRowData([]);
        return false; // 🔥 NUEVO — ya no llama agregarFilaTotales aquí
    }

    formatearRangoFechas(fechaInicio, fechaFin) {

        const inicio = DateUtils.formatearFechaTexto(fechaInicio, false);
        const fin = DateUtils.formatearFechaTexto(fechaFin, true);

        return `Del ${inicio} al ${fin}`;
    }

    async cargarLineas() {

        try {
            const lineas = await EquiposUtil.obtenerLineas(this.datos_usuario[0].PLANTA, (this.datos_usuario[0].PLANTA == "1" ? 7 : 7), 1); // 🔥 REVISAR PLANTA 2
            this.listaLineas = lineas;

        } catch (error) {

            console.error(error);

        }

    }

    configurarMenuContextual() {

        const menu = document.getElementById("menuContextual");

        document.querySelector('#tablaProduccion')
            .addEventListener("contextmenu", (e) => {

                e.preventDefault();

                const rowIndex =
                    this.gridApi.getFocusedCell()?.rowIndex;

                this.filaSeleccionada =
                    this.gridApi.getDisplayedRowAtIndex(
                        rowIndex
                    );

                if (this.filaSeleccionada?.data?.id === 'TOTALES') {
                    menu.style.display = "none";
                    return;
                }

                const eliminar =
                    menu.querySelector(
                        '[data-action="eliminar"]'
                    );

                if (this.filaSeleccionada?.data?.ID_REGISTRO) {

                    eliminar.style.display = "none";

                } else {

                    eliminar.style.display = "block";

                }

                // ========================================
                // MOSTRAR MENÚ CON POSICIÓN CORRECTA
                // ========================================
                menu.style.display = "block";

                // Obtener dimensiones del menú y viewport
                const menuRect = menu.getBoundingClientRect();
                const menuWidth = menuRect.width || 180;
                const menuHeight = menuRect.height || 150;

                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;

                let posX = e.pageX;
                let posY = e.pageY;

                // Ajustar posición X si se sale por la derecha
                if (posX + menuWidth > viewportWidth) {
                    posX = viewportWidth - menuWidth - 10;
                }

                // Ajustar posición Y si se sale por abajo
                if (posY + menuHeight > viewportHeight) {
                    posY = viewportHeight - menuHeight - 10;
                }

                // Asegurar que no se salga por la izquierda o arriba
                posX = Math.max(10, posX);
                posY = Math.max(10, posY);

                menu.style.left = posX + "px";
                menu.style.top = posY + "px";

            });

        document.addEventListener("click", () => {

            menu.style.display = "none";

        });

        menu.addEventListener("click", (e) => {

            const accion = e.target.dataset.action;

            if (!this.filaSeleccionada) return;

            const params = {
                node: this.filaSeleccionada
            };

            if (accion === "agregar") {

                this.agregarFila(params);

            }

            if (accion === "copiar") {

                this.copiarFilaAnterior(params);

            }

            if (accion === "eliminar") {

                this.eliminarFila(params);

            }

            menu.style.display = "none";

        });

    }

    generarIdTemporal() {
        return `TMP_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    }

    agregarFila(params) {

        const nuevaFila = {

            id: this.generarIdTemporal(),

            // ========================================
            // DATOS GENERALES
            // ========================================

            Mes: null,
            Fecha: null,
            Linea: null,
            Corrugador: null,
            Producto: null,
            Turno: null,
            Grupo: null,

            // ========================================
            // PRODUCCIÓN
            // ========================================

            PesoMinimo: 0,

            TRLiberados: null,
            ProduccionNeta: null,

            PesoEstandar: 0,
            PorcentajeSobrepeso: 0,

            ScrapSinCorteSierra: null,
            ScrapCorteSierra: null,

            ScrapTotal: 0,

            PorcentajeScrapSinCorte: 0,
            PorcentajeScrapCorte: 0,

            KgReproceso: null,
            Carbonato: null,

            // ========================================
            // DISPONIBILIDAD
            // ========================================

            HorasProgramadas: null,

            // ========================================
            // TIEMPO NO DISPONIBLE
            // ========================================

            MantenimientoPreventivo: null,
            ControlInventarios: null,
            FaltaEnergia: null,
            FaltaMateriaPrima: null,
            PreparacionCambio: null,
            ArranqueEstabilizacion: null,

            TiempoMttoCorrectivosArranque: null,

            // ========================================
            // TIEMPO NO PRODUCTIVO
            // ========================================

            TiempoMuertoCorrectivos: null,
            CambioMoldeSetupExcesos: null,
            TiempoMuertoArrancar: null,
            TiempoMuertoProceso: null,

            // ========================================
            // KPIs
            // ========================================

            TiempoDisponible: 0,
            TiempoProductivo: 0

        };

        this.gridApi.applyTransaction({
            add: [nuevaFila],
            addIndex: params.node.rowIndex + 1
        });

        this.recalcularTotales();

        this.gridApi.refreshCells({
            force: true
        });

        this.gridApi.redrawRows();

    }

    copiarFilaAnterior(params) {

        const filaActual = params.node.data;

        if (!filaActual || filaActual.id === 'TOTALES') {
            return;
        }

        const nuevaFila =
            JSON.parse(JSON.stringify(filaActual));

        // ========================================
        // NUEVO REGISTRO
        // ========================================

        nuevaFila.id = this.generarIdTemporal();

        nuevaFila.ID_REGISTRO = null;

        // ========================================
        // RECALCULAR KPIs
        // ========================================

        this.recalcularFila(nuevaFila);

        this.gridApi.applyTransaction({

            add: [nuevaFila],

            addIndex:
                params.node.rowIndex + 1

        });

        this.recalcularTotales();

    }

    eliminarFila(params) {

        if (params.node.data.id === 'TOTALES') return;

        if (params.node.data.ID_REGISTRO) {

            AlertManager.mostrar(
                "No se puede eliminar un registro guardado",
                "warning"
            );

            return;
        }

        this.gridApi.applyTransaction({

            remove: [params.node.data]

        });

        this.recalcularTotales();

        this.gridApi.refreshCells({
            force: true
        });

        this.gridApi.redrawRows();

    }

    obtenerDatosGrid() {

        const datos = [];

        // 🔥 NUEVO — mismo helper que PVC
        const redondear = (valor, decimales = 2) => {
            if (valor === null || valor === undefined || isNaN(valor)) return 0;
            return Math.round(valor * Math.pow(10, decimales)) / Math.pow(10, decimales);
        };

        this.gridApi.forEachNode((node) => {

            if (node.data.id !== 'TOTALES') {

                datos.push({

                    ID_REGISTRO: node.data.ID_REGISTRO || null,
                    OTMC: node.data.OTMC || null, // 🔥 NUEVO

                    MES: node.data.Mes,
                    FECHA: node.data.Fecha,
                    LINEA: node.data.Linea,
                    CORRUGADOR: node.data.Corrugador,
                    PRODUCTO: node.data.Producto,
                    TURNO: node.data.Turno,
                    GRUPO: node.data.Grupo,

                    PESO_MINIMO: redondear(node.data.PesoMinimo, 2),
                    TRLIBERADOS: redondear(node.data.TRLiberados, 2),
                    PRODUCCION_NETA: redondear(node.data.ProduccionNeta, 2),
                    PESO_ESTANDAR: redondear(node.data.PesoEstandar, 2),
                    PORCENTAJE_SOBREPESO: redondear(node.data.PorcentajeSobrepeso, 2),

                    SCRAP_SIN_CORTE_SIERRA: redondear(node.data.ScrapSinCorteSierra, 2),
                    SCRAP_CORTE_SIERRA: redondear(node.data.ScrapCorteSierra, 2),
                    SCRAP_TOTAL: redondear(node.data.ScrapTotal, 2),
                    PORCENTAJE_SCRAP_SIN_CORTE: redondear(node.data.PorcentajeScrapSinCorte, 2),
                    PORCENTAJE_SCRAP_CORTE: redondear(node.data.PorcentajeScrapCorte, 2),

                    KG_REPROCESO: redondear(node.data.KgReproceso, 2),
                    CARBONATO: redondear(node.data.Carbonato, 2),

                    HORAS_PROGRAMADAS: redondear(node.data.HorasProgramadas, 2),

                    MANTENIMIENTO_PREVENTIVO: redondear(node.data.MantenimientoPreventivo, 2),
                    CONTROL_INVENTARIOS: redondear(node.data.ControlInventarios, 2),
                    FALTA_ENERGIA: redondear(node.data.FaltaEnergia, 2),
                    FALTA_MATERIA_PRIMA: redondear(node.data.FaltaMateriaPrima, 2),
                    PREPARACION_CAMBIO: redondear(node.data.PreparacionCambio, 2),
                    ARRANQUE_ESTABILIZACION: redondear(node.data.ArranqueEstabilizacion, 2),

                    TIEMPO_MTTO_CORRECTIVOS_ARRANQUE: redondear(node.data.TiempoMttoCorrectivosArranque, 2),

                    TIEMPO_MUERTO_CORRECTIVOS: redondear(node.data.TiempoMuertoCorrectivos, 2),
                    CAMBIO_MOLDE_SETUP_EXCESOS: redondear(node.data.CambioMoldeSetupExcesos, 2),
                    TIEMPO_MUERTO_ARRANCAR: redondear(node.data.TiempoMuertoArrancar, 2),
                    TIEMPO_MUERTO_PROCESO: redondear(node.data.TiempoMuertoProceso, 2),

                    TIEMPO_DISPONIBLE: redondear(node.data.TiempoDisponible, 2),
                    TIEMPO_PRODUCTIVO: redondear(node.data.TiempoProductivo, 2),

                    USUARIO: this.datos_usuario[0].EMAIL,
                    PLANTA: this.datos_usuario[0].PLANTA

                });
            }

        });

        return datos;
    }

    getColumnaNumerica(cellClass = '') {
        return {
            editable: true,
            cellEditor: 'agNumberCellEditor',
            cellClass: cellClass,
            valueParser: params => {
                if (params.newValue === null || params.newValue === undefined || params.newValue === '')
                    return null;

                // Convierte string a número, maneja tanto comas como puntos como separador decimal
                let valor = params.newValue.toString().trim();

                // Si contiene coma y punto, asumir que la coma es separador decimal (formato latino)
                if (valor.includes(',') && valor.includes('.')) {
                    const lastComma = valor.lastIndexOf(',');
                    const lastDot = valor.lastIndexOf('.');

                    if (lastComma > lastDot) {
                        // Formato latino: 1.000,50 => remover puntos y usar coma como decimal
                        valor = valor.replace(/\./g, '').replace(',', '.');
                    } else {
                        // Formato inglés: 1,000.50 => remover comas
                        valor = valor.replace(/,/g, '');
                    }
                } else if (valor.includes(',')) {
                    // Solo coma: asumir separador decimal
                    valor = valor.replace(/,/g, '.');
                }

                const numValue = parseFloat(valor);
                return isNaN(numValue) ? null : numValue;
            },
            valueFormatter: params => this.formatearNumero(params.value)
        };
    }
}

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
                    this.datos_usuario[0].EMAIL,
                    0
                );

                this.mostrarSugerencias(articulos);

            } else {

                this.eDropdown.innerHTML = '';

            }

        });

    }

    mostrarSugerencias(articulos) {

        this.eDropdown.innerHTML = '';

        const rect = this.eInput.getBoundingClientRect();

        this.eDropdown.style.top = rect.bottom + 'px';
        this.eDropdown.style.left = rect.left + 'px';
        this.eDropdown.style.width = Math.max(rect.width, 450) + 'px';

        articulos.forEach(articulo => {

            const item = document.createElement('div');
            item.className = 'autocomplete-item';

            item.innerHTML = `
            <strong>${articulo.CodigoArticulo}</strong><br>
            <small>${articulo.DescripcionArticulo}</small>
        `;

            item.addEventListener('click', () => {

                this.eInput.value = articulo.CodigoArticulo;

                this.articuloSeleccionado = articulo;

                const row = this.params.node.data;

                row.Producto = articulo.CodigoArticulo;

                row.PesoMinimo = articulo.PesoMinimo || 0;

                row.DescripcionArticulo = articulo.DescripcionArticulo;

                // 🔥 Recalcular KPIs de la fila
                const app = this.params.context.appProduccion;

                app.recalcularFila(row);

                // 🔥 Actualizar totales
                app.recalcularTotales();

                this.eDropdown.innerHTML = '';

                this.params.api.refreshCells({
                    rowNodes: [this.params.node],
                    force: true
                });

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
        this.eInput.value = ''; // 🔥 limpiar input
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
// EXPORTADOR EXCEL PARA CORRUGADO
// ========================================
class ExcelExporterCorrugado extends ExcelExporterBase {
    constructor(gridApi, columnDefs) {
        super(gridApi, columnDefs);
    }

    getSheetName() { return 'Causas Tiempos Muertos Corrugado'; }
    getFileNamePrefix() { return 'Produccion_Corrugado'; }
    getTextFields() { return ['Mes', 'Fecha', 'Linea', 'Corrugador', 'Producto', 'Turno', 'Grupo']; }

    getTotalsFontColor() { return 'FF0058A1'; }
    getTotalsBorderColor() { return 'FF0058A1'; }
    async exportarConFormato() {
        return super.exportarConFormato();
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

                    if (valor !== null && valor !== undefined && valor !== '' &&
                        ![
                            'Mes',
                            'Fecha',
                            'Linea',
                            'Corrugador',
                            'Producto',
                            'Turno',
                            'Grupo'
                        ].includes(col.field)) {

                        valor = parseFloat(valor);
                    }

                    if (node.data.id === 'TOTALES' &&
                        [
                            'Mes',
                            'Fecha',
                            'Linea',
                            'Corrugador',
                            'Producto',
                            'Turno',
                            'Grupo'
                        ].includes(col.field)) {
                        valor = '';
                    }

                    // 🔥 Si el valor es 0, mantener el 0 (no convertir a string vacío)
                    if (valor === 0 || valor === '0') {
                        fila.push(0);
                    } else {
                        fila.push(valor || '');
                    }
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

                // DATOS GENERALES
                if (grupo.nombre === 'DATOS GENERALES') {

                    colorFondo = 'B4A7D6';
                    colorTexto = '000000';

                }

                // PRODUCCIÓN
                else if (grupo.nombre === 'PRODUCCIÓN') {

                    colorFondo = 'F1C232';
                    colorTexto = '000000';

                }

                // DISPONIBILIDAD
                else if (grupo.nombre === 'DISPONIBILIDAD') {

                    colorFondo = '9FC5E8';
                    colorTexto = '000000';

                }

                // TIEMPO NO DISPONIBLE
                else if (grupo.nombre === 'TIEMPO NO DISPONIBLE') {

                    colorFondo = 'FF69B4';
                    colorTexto = 'FFFFFF';

                }

                // TIEMPO NO PRODUCTIVO
                else if (grupo.nombre === 'TIEMPO NO PRODUCTIVO') {

                    colorFondo = '90EE90';
                    colorTexto = '333333';

                }

                // KPIs
                else if (grupo.nombre === 'KPIs') {

                    colorFondo = '6AA84F';
                    colorTexto = 'FFFFFF';

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

                        if (![
                            'Mes',
                            'Fecha',
                            'Linea',
                            'Corrugador',
                            'Producto',
                            'Turno',
                            'Grupo'
                        ].includes(col.field)) {
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

        worksheet.getRow(1).height = 30;
        worksheet.getRow(2).height = 60;
    }

    obtenerColorCelda(cellClass) {
        const colores = {
            'celda-azul': 'FFCFE2FF',
            'celda-verde': 'FFD1E7DD',
            'celda-rosa': 'FFF8D7DA',
            'celda-verde-claro': 'FFD4EDDA',
            'celda-azul-claro': 'FFE7F3FF',
            'celda-verde-fuerte': 'FFA8D5BA',
            'celda-gris': 'FFD3D3D3'
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
                    else if (col.field === 'Mes') ancho = 12;
                    else if (col.field === 'HorasProgramadas') ancho = 22;
                    else if (col.field === 'Planta') ancho = 10;
                    else if (col.field === 'Linea' || col.field === 'Turno' || col.field === 'Grupo') ancho = 8;
                    else if (col.field === 'Corrugador') ancho = 14;
                    else if (col.field === 'Producto') ancho = 18;
                    else if (col.headerName && col.headerName.length > 20) ancho = 20;

                    worksheet.getColumn(colIdx).width = ancho;
                });
            }
        });
    }
}

// ========================================
// 📧 GESTOR DE CORREOS PARA ENVÍO DE EXCEL
// ========================================
class CorreosManagerCorrugado {
    constructor() {
        this.correosNotificacion = [];
        this.appProduccion = null;
    }

    setAppProduccion(app) {
        this.appProduccion = app;
    }

    inicializar() {
        $("#btnAgregarCorreoCorrugado").off("click").on("click", () => this.agregarCorreo());
        $("#inputCorreoCorrugado").off("keydown").on("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                this.agregarCorreo();
            }
        });
        $("#btnEnviarExcelCorreo").off("click").on("click", () => this.enviarExcelPorCorreo());
    }

    agregarCorreo() {
        const input = $("#inputCorreoCorrugado");
        const correo = input.val().trim().toLowerCase();
        const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        // Validar formato
        if (!regexEmail.test(correo)) {
            $("#errorCorreoCorrugado").text("Ingrese un correo válido.").show();
            input.addClass("is-invalid");
            return;
        }

        // Validar duplicado
        if (this.correosNotificacion.includes(correo)) {
            $("#errorCorreoCorrugado").text("Este correo ya fue agregado.").show();
            input.addClass("is-invalid");
            return;
        }

        // Agregar a la lista
        this.correosNotificacion.push(correo);
        this.renderCorreos();

        // Limpiar input
        input.val('').removeClass("is-invalid");
        $("#errorCorreoCorrugado").hide();
    }

    renderCorreos() {
        const lista = $("#listaCorreosCorrugado");
        lista.empty();

        if (this.correosNotificacion.length === 0) {
            lista.html(`
                <span class="text-muted" style="font-size:0.82rem;">
                    <i class="bi bi-info-circle me-1"></i> No hay correos agregados aún.
                </span>
            `);
            return;
        }

        this.correosNotificacion.forEach((correo, index) => {
            lista.append(`
                <span class="badge d-flex align-items-center gap-2 px-3 py-2"
                      style="background: var(--modal-primary-soft); color: var(--modal-primary); 
                             border: 1px solid var(--modal-primary-mid); border-radius: 20px; font-size:0.82rem;">
                    <i class="bi bi-envelope"></i>
                    ${correo}
                    <button type="button" class="btn-remove-correo" data-index="${index}"
                            style="background:none; border:none; padding:0; cursor:pointer; 
                                   color: var(--modal-primary); line-height:1;">
                        <i class="bi bi-x-lg" style="font-size:0.7rem;"></i>
                    </button>
                </span>
            `);
        });

        // Evento eliminar badge
        $(".btn-remove-correo").off("click").on("click", (e) => {
            const index = $(e.currentTarget).data("index");
            this.correosNotificacion.splice(index, 1);
            this.renderCorreos();
        });
    }

    async enviarExcelPorCorreo() {
        if (this.correosNotificacion.length === 0) {
            AlertManager.mostrar("Debe agregar al menos un correo", "warning");
            return;
        }

        const btn = $("#btnEnviarExcelCorreo");
        btn.html('<span class="spinner-border spinner-border-sm me-2"></span>Generando Excel...');
        btn.prop("disabled", true);

        try {
            // 🔥 Generar Excel en el cliente con estilos
            const exporter = new ExcelExporterCorrugado(this.appProduccion.gridApi, this.appProduccion.columnDefs);
            const archivoExcel = await exporter.generarExcelParaEnvio();

            if (!archivoExcel) {
                AlertManager.mostrar("No se pudo generar el Excel", "warning");
                this.resetearBoton(btn);
                return;
            }

            btn.html('<span class="spinner-border spinner-border-sm me-2"></span>Enviando...');

            // 🔥 Convertir Blob a Base64
            const reader = new FileReader();
            reader.onload = async () => {
                const base64Excel = reader.result.split(',')[1]; // Obtener solo la parte Base64

                try {
                    // 🔥 Obtener metadatos del grid
                    const payload = {
                        correos: this.correosNotificacion,
                        archivoExcelBase64: base64Excel,
                        usuario: this.appProduccion.datos_usuario[0].NOMBRECOMPLETO,
                        planta: this.appProduccion.datos_usuario[0].PLANTA,
                        tipoReporte: 'PEAD CORRUGADO'
                    };

                    // 🔥 Enviar al servidor
                    const response = await $.ajax({
                        url: `/${this.appProduccion.URLBase}/EnviarExcelProduccionPorCorreo`,
                        type: 'POST',
                        contentType: 'application/json',
                        data: JSON.stringify(payload),
                        beforeSend: () => {
                            GlobalUtil.mostrarLoader(true);
                        }
                    });

                    if (response.Status === "OK") {
                        AlertManager.mostrar("Excel enviado correctamente", "success");
                        // Limpiar correos
                        this.correosNotificacion = [];
                        this.renderCorreos();
                        // Cerrar modal
                        bootstrap.Modal.getInstance(document.getElementById('modalEnviarExcelCorreo')).hide();
                    } else {
                        AlertManager.mostrar(response.Message || "Error al enviar el email", "danger");
                    }
                } catch (error) {
                    console.error(error);
                    AlertManager.mostrar("Error al procesar la solicitud: " + (error.statusText || error.message), "danger");
                } finally {
                    this.resetearBoton(btn);
                    GlobalUtil.mostrarLoader(false);
                }
            };

            reader.readAsDataURL(archivoExcel);

        } catch (error) {
            console.error(error);
            AlertManager.mostrar("Error al generar el Excel: " + error.message, "danger");
            this.resetearBoton(btn);
        }
    }

    resetearBoton(btn) {
        btn.html('<i class="bi bi-send-fill me-1"></i> Enviar');
        btn.prop("disabled", false);
    }

    limpiarFormulario() {
        this.correosNotificacion = [];
        this.renderCorreos();
        $("#inputCorreoCorrugado").val('').removeClass("is-invalid");
        $("#errorCorreoCorrugado").hide();
    }
}