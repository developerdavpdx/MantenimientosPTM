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

// ========================================
// APLICACIÓN PRINCIPAL - GESTIÓN PEAD LISO
// ========================================
class GestionProduccionPeadLiso extends GestionProduccionBase {
    constructor(datos_usuario, URLBase) {
        super(datos_usuario, URLBase, 0);
        this.URLBaseMantenimientosCorrectivos = "MantenimientosCorrectivos"; // 🔥 NUEVO
        this.ID_AREA_CORRECTIVOS = (datos_usuario[0].PLANTA == "1" ? 9 : 14); // 🔥 PVC
    }

    async inicializar() {
        await this.inicializarCommon();

        // 📧 NUEVO: Inicializar gestor de correos
        this.correosManager = new CorreosManagerPeadLiso();
        this.correosManager.setAppProduccion(this);
        this.correosManager.inicializar();

        // 🔥 CONSULTAR DATOS
        this.consultarDatos(null, null, null);
        console.log('✅ Sistema PEAD LISO inicializado');
    }

    crearTotalesTemplate() {
        return {
            Mes: null,
            Fecha: null,
            Linea: null,
            Producto: null,
            Turno: null,
            Grupo: null,
            PesoMinimo: 0,
            TRLiberados: 0,
            ProduccionNeta: 0,
            PesoEstandar: 0,
            PorcentajeSobrepeso: 0,
            TotalScrap: 0,
            PorcentajeTotalScrap: 0,
            HorasProgramadas: 0,
            Preventivo: 0,
            ControlInventarios: 0,
            FaltaEnergiaElectrica: 0,
            FaltaMateriaPrimaInsumos: 0,
            TiempoCalentamientoCI: 0,
            PreparacionLineaCambioHerramental: 0,
            TiempoCalentamientoHerramental: 0,
            ArranqueEstabilizacionLinea: 0,
            TiempoMuertoCorrectivos: 0,
            TiempoMuertoHerramentales: 0,
            CambioMoldeSetupExcesos: 0,
            FaltaPersonal: 0,
            TiempoMuertoProceso: 0,
            TiempoDisponible: 0,
            TiempoProductivo: 0
        };
    }

    cargarDatosIniciales() {

        this.datosOriginales = [

            {
                id: 1,

                ID_REGISTRO: null,

                // =====================================
                // GENERALES
                // =====================================

                Mes: null,

                Fecha: null,
                Linea: null,
                Producto: null,
                Turno: null,
                Grupo: null,

                // =====================================
                // PRODUCCIÓN
                // =====================================

                PesoMinimo: 0,

                TRLiberados: null,
                ProduccionNeta: null,

                PesoEstandar: null,

                PorcentajeSobrepeso: null,

                TotalScrap: null,

                PorcentajeTotalScrap: null,

                // =====================================
                // DISPONIBILIDAD
                // =====================================

                HorasProgramadas: null,

                // =====================================
                // TIEMPO NO DISPONIBLE
                // =====================================

                Preventivo: null,

                ControlInventarios: null,

                FaltaEnergiaElectrica: null,

                FaltaMateriaPrimaInsumos: null,

                TiempoCalentamientoCI: null,

                PreparacionLineaCambioHerramental: null,

                TiempoCalentamientoHerramental: null,

                ArranqueEstabilizacionLinea: null,

                // =====================================
                // TIEMPO NO PRODUCTIVO
                // =====================================

                TiempoMuertoCorrectivos: null,

                TiempoMuertoHerramentales: null,

                CambioMoldeSetupExcesos: null,

                FaltaPersonal: null,

                TiempoMuertoProceso: null,

                // =====================================
                // KPI
                // =====================================

                TiempoDisponible: null,

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
            GlobalUtil.mostrarLoader(true);
            $("#tablaProduccion").addClass("d-none");

            const response = await $.ajax({

                url: `/${this.URLBase}/GetTiemposMuertosPeadLiso`,
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
                $("#tablaProduccion").removeClass("d-none");

            }, 1000);

            setTimeout(() => {
                GlobalUtil.mostrarLoader(false);
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
                Producto: item.PRODUCTO,
                Turno: item.TURNO,
                Grupo: item.GRUPO,

                PesoMinimo: item.PESO_MINIMO,

                TRLiberados: item.TRLIBERADOS,
                ProduccionNeta: item.PRODUCCION_NETA,

                PesoEstandar: item.PESO_ESTANDAR,

                PorcentajeSobrepeso: item.PORCENTAJE_SOBREPESO,

                TotalScrap: item.TOTAL_SCRAP,

                PorcentajeTotalScrap: item.PORCENTAJE_TOTAL_SCRAP,

                HorasProgramadas: item.HORAS_PROGRAMADAS,

                Preventivo: item.PREVENTIVO,

                ControlInventarios: item.CONTROL_INVENTARIOS,

                FaltaEnergiaElectrica: item.FALTA_ENERGIA_ELECTRICA,

                FaltaMateriaPrimaInsumos: item.FALTA_MATERIA_PRIMA_INSUMOS,

                TiempoCalentamientoCI: item.TIEMPO_CALENTAMIENTO_CI,

                PreparacionLineaCambioHerramental: item.PREPARACION_LINEA_CAMBIO_HERRAMENTAL,

                TiempoCalentamientoHerramental: item.TIEMPO_CALENTAMIENTO_HERRAMENTAL,

                ArranqueEstabilizacionLinea: item.ARRANQUE_ESTABILIZACION_LINEA,

                TiempoMuertoCorrectivos: item.TIEMPO_MUERTO_CORRECTIVOS,

                TiempoMuertoHerramentales: item.TIEMPO_MUERTO_HERRAMENTALES,

                CambioMoldeSetupExcesos: item.CAMBIO_MOLDE_SETUP_EXCESOS,

                FaltaPersonal: item.FALTA_PERSONAL,

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
                    FiltroArea: this.ID_AREA_CORRECTIVOS, // 🔥 9 = Pead Liso
                    FiltroLinea: linea || "",
                    FiltroOrdenTrabajo: "",
                    FiltroPlanta: this.datos_usuario[0].PLANTA,
                    FiltroEstatusOT: "4",
                    FiltroExcluirSincronizadosPEADLISO: "S" // ⚠️ ver nota abajo
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
            nuevaFila.TiempoMuertoCorrectivos = parseFloat(item.DuracionHrs) || 0; // 🔥 campo distinto a PVC

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

    // 🔥 Template de fila vacía, ajustado a los campos de Pead Liso
    crearFilaVacia() {
        return {
            id: null,
            ID_REGISTRO: null,
            OTMC: null,
            Mes: null, Fecha: null, Linea: null, Producto: null, Turno: null, Grupo: null,
            PesoMinimo: 0,
            TRLiberados: null, ProduccionNeta: null,
            PesoEstandar: 0, PorcentajeSobrepeso: 0,
            TotalScrap: null, PorcentajeTotalScrap: 0,
            HorasProgramadas: null,
            Preventivo: null, ControlInventarios: null,
            FaltaEnergiaElectrica: null, FaltaMateriaPrimaInsumos: null,
            TiempoCalentamientoCI: null, PreparacionLineaCambioHerramental: null,
            TiempoCalentamientoHerramental: null, ArranqueEstabilizacionLinea: null,
            TiempoMuertoCorrectivos: null, TiempoMuertoHerramentales: null,
            CambioMoldeSetupExcesos: null, FaltaPersonal: null, TiempoMuertoProceso: null,
            TiempoDisponible: 0, TiempoProductivo: 0
        };
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
                        field: 'Mes',
                        headerName: 'Mes',
                        editable: false,
                        width: 100,
                        cellClass: 'celda-gris',
                        pinned: 'left',
                        valueFormatter: params => {

                            if (params.data?.id === 'TOTALES')
                                return '';

                            return params.value || '';
                        }
                    },
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
                        field: 'PesoMinimo',
                        headerName: 'PESO MÍNIMO',
                        editable: false,
                        width: 130,
                        cellClass: 'celda-gris',
                        valueFormatter: params =>
                            this.formatearNumero(params.value)
                    },

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
                        field: 'PesoEstandar',
                        headerName: 'PESO ESTÁNDAR',
                        editable: false,
                        width: 130,
                        cellClass: 'celda-azul-claro',
                        valueFormatter: params =>
                            this.formatearNumero(params.value)
                    },

                    {
                        field: 'PorcentajeSobrepeso',
                        headerName: '% SOBREPESO',
                        editable: false,
                        width: 130,
                        cellClass: 'celda-azul-claro',
                        valueFormatter: params =>
                            this.formatearNumero(params.value)
                    },

                    {
                        field: 'TotalScrap',
                        headerName: 'TOTAL SCRAP',
                        width: 130,
                        ...this.getColumnaNumerica('celda-verde')
                    },

                    {
                        field: 'PorcentajeTotalScrap',
                        headerName: '% TOTAL SCRAP',
                        editable: false,
                        width: 130,
                        cellClass: 'celda-azul-claro',
                        valueFormatter: params =>
                            this.formatearNumero(params.value)
                    },

                    {
                        field: 'HorasProgramadas',
                        headerName: 'HORAS PROGRAMADAS',
                        width: 135,
                        ...this.getColumnaNumerica('celda-gris')
                    }

                ]
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
                        field: 'FaltaEnergiaElectrica',
                        headerName: 'FALTA ENERGÍA ELÉCTRICA',
                        width: 135,
                        ...this.getColumnaNumerica('celda-rosa')
                    },
                    {
                        field: 'FaltaMateriaPrimaInsumos',
                        headerName: 'FALTA MATERIA PRIMA INSUMOS',
                        width: 135,
                        ...this.getColumnaNumerica('celda-rosa')
                    },
                    {
                        field: 'TiempoCalentamientoCI',
                        headerName: 'TIEMPO CALENTAMIENTO CI',
                        width: 135,
                        ...this.getColumnaNumerica('celda-rosa')
                    },
                    {
                        field: 'PreparacionLineaCambioHerramental',
                        headerName: 'PREPARACIÓN LINEA CAMBIO HERRAMENTAL',
                        width: 135,
                        ...this.getColumnaNumerica('celda-rosa')
                    },
                    {
                        field: 'TiempoCalentamientoHerramental',
                        headerName: 'TIEMPO CALENTAMIENTO HERRAMENTAL',
                        width: 135,
                        ...this.getColumnaNumerica('celda-rosa')
                    },
                    {
                        field: 'ArranqueEstabilizacionLinea',
                        headerName: 'ARRANQUE ESTABILIZACIÓN LÍNEA',
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
                        field: 'TiempoMuertoCorrectivos',
                        headerName: 'TIEMPO MUERTO CORRECTIVOS',
                        width: 135,
                        ...this.getColumnaNumerica('celda-verde-claro')
                    },

                    {
                        field: 'TiempoMuertoHerramentales',
                        headerName: 'TIEMPO MUERTO HERRAMENTALES',
                        width: 135,
                        ...this.getColumnaNumerica('celda-verde-claro')
                    },

                    {
                        field: 'CambioMoldeSetupExcesos',
                        headerName: 'CAMBIO MOLDE / SETUP EXCESOS',
                        width: 160,
                        ...this.getColumnaNumerica('celda-verde-claro')
                    },

                    {
                        field: 'FaltaPersonal',
                        headerName: 'FALTA PERSONAL',
                        width: 135,
                        ...this.getColumnaNumerica('celda-verde-claro')
                    },

                    {
                        field: 'TiempoMuertoProceso',
                        headerName: 'TIEMPO MUERTO PROCESO',
                        width: 135,
                        ...this.getColumnaNumerica('celda-verde-claro')
                    }

                ]
            },
            {
                headerName: '',
                children: [

                    {
                        field: 'TiempoDisponible',
                        headerName: 'TIEMPO DISPONIBLE',
                        editable: false,
                        width: 130,
                        cellClass: 'celda-azul-claro',
                        valueFormatter: params =>
                            this.formatearNumero(params.value)
                    },

                    {
                        field: 'TiempoProductivo',
                        headerName: 'TIEMPO PRODUCTIVO',
                        editable: false,
                        width: 130,
                        cellClass: 'celda-verde-fuerte',
                        valueFormatter: params =>
                            this.formatearNumero(params.value)
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

    generarIdTemporal() {
        return `TMP_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    }

    onCellChanged(event) {

        if (event.data.id === 'TOTALES') {

            event.api.undoCellEditing();

            return;
        }

        const row = event.data;

        // ========================================
        // MES AUTOMÁTICO
        // ========================================

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

        // ========================================
        // RECALCULAR FILA
        // ========================================

        this.recalcularFila(row);

        // ========================================
        // AUDITORÍA
        // ========================================

        const cambio = {

            id: row.id,

            campo: event.colDef.field,

            valorAnterior: event.oldValue,

            valorNuevo: event.newValue

        };

        this.cambiosPendientes.push(cambio);

        // ========================================
        // REFRESH VISUAL
        // ========================================

        this.gridApi.refreshCells({
            force: true
        });

        this.gridApi.redrawRows();

        // ========================================
        // TOTALES
        // ========================================

        this.recalcularTotales();

    }

    recalcularFila(row) {

        // ========================================
        // PRODUCCIÓN
        // ========================================

        row.PesoEstandar =
            this.calcularPesoEstandar(row);

        row.PorcentajeSobrepeso =
            this.calcularPorcentajeSobrepeso(row);

        row.PorcentajeTotalScrap =
            this.calcularPorcentajeTotalScrap(row);

        // ========================================
        // KPI
        // ========================================

        row.TiempoDisponible =
            this.calcularTiempoDisponible(row);

        row.TiempoProductivo =
            this.calcularTiempoProductivo(row);

    }

    calcularTiempoDisponible(row) {

        const horas =
            parseFloat(row.HorasProgramadas) || 0;

        const tiempoNoDisponible =

            (parseFloat(row.Preventivo) || 0) +
            (parseFloat(row.ControlInventarios) || 0) +
            (parseFloat(row.FaltaEnergiaElectrica) || 0) +
            (parseFloat(row.FaltaMateriaPrimaInsumos) || 0) +
            (parseFloat(row.TiempoCalentamientoCI) || 0) +
            (parseFloat(row.PreparacionLineaCambioHerramental) || 0) +
            (parseFloat(row.TiempoCalentamientoHerramental) || 0) +
            (parseFloat(row.ArranqueEstabilizacionLinea) || 0);

        return Math.max(
            horas - tiempoNoDisponible,
            0
        );

    }

    calcularTiempoProductivo(row) {

        const disponible =
            parseFloat(row.TiempoDisponible) || 0;

        const tiempoNoProductivo =

            (parseFloat(row.TiempoMuertoCorrectivos) || 0) +
            (parseFloat(row.TiempoMuertoHerramentales) || 0) +
            (parseFloat(row.CambioMoldeSetupExcesos) || 0) +
            (parseFloat(row.FaltaPersonal) || 0) +
            (parseFloat(row.TiempoMuertoProceso) || 0);

        return Math.max(
            disponible - tiempoNoProductivo,
            0
        );

    }

    calcularPesoEstandar(row) {

        const pesoMinimo =
            parseFloat(row.PesoMinimo) || 0;

        const trLiberados =
            parseFloat(row.TRLiberados) || 0;

        return pesoMinimo * trLiberados;
    }

    calcularPorcentajeSobrepeso(row) {

        const produccion =
            parseFloat(row.ProduccionNeta) || 0;

        const pesoEstandar =
            parseFloat(row.PesoEstandar) || 0;

        if (pesoEstandar <= 0)
            return 0;

        return (
            (produccion / pesoEstandar) - 1
        ) * 100;
    }

    calcularPorcentajeTotalScrap(row) {

        const scrap =
            parseFloat(row.TotalScrap) || 0;

        const produccion =
            parseFloat(row.ProduccionNeta) || 0;

        const total =
            produccion + scrap;

        if (total <= 0)
            return 0;

        return (scrap / total) * 100;
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

        const filaTotales = this.obtenerTotalesGrid();

        this.gridApi.forEachNode((node) => {

            if (node.data?.id === 'TOTALES') {

                node.setData(filaTotales);
            }

        });

        this.gridApi.refreshCells({
            force: true
        });

    }

    obtenerTotalesGrid() {

        const totales = {

            id: 'TOTALES',
            Linea: 'TOTALES',

            // =====================================
            // GENERALES (no sumar)
            // =====================================

            Mes: null,
            Fecha: null,
            Producto: null,
            Turno: null,
            Grupo: null,

            // =====================================
            // PRODUCCIÓN
            // =====================================

            PesoMinimo: 0,

            TRLiberados: 0,
            ProduccionNeta: 0,

            PesoEstandar: 0,

            PorcentajeSobrepeso: null,

            TotalScrap: 0,

            PorcentajeTotalScrap: null,

            // =====================================
            // DISPONIBILIDAD
            // =====================================

            HorasProgramadas: 0,

            // =====================================
            // TIEMPO NO DISPONIBLE
            // =====================================

            Preventivo: 0,

            ControlInventarios: 0,

            FaltaEnergiaElectrica: 0,

            FaltaMateriaPrimaInsumos: 0,

            TiempoCalentamientoCI: 0,

            PreparacionLineaCambioHerramental: 0,

            TiempoCalentamientoHerramental: 0,

            ArranqueEstabilizacionLinea: 0,

            // =====================================
            // TIEMPO NO PRODUCTIVO
            // =====================================

            TiempoMuertoCorrectivos: 0,

            TiempoMuertoHerramentales: 0,

            CambioMoldeSetupExcesos: 0,

            FaltaPersonal: 0,

            TiempoMuertoProceso: 0,

            // =====================================
            // KPI
            // =====================================

            TiempoDisponible: 0,

            TiempoProductivo: 0

        };

        this.gridApi.forEachNode((node) => {

            if (!node.data || node.data.id === 'TOTALES') {
                return;
            }

            // =====================================
            // PRODUCCIÓN
            // =====================================

            totales.PesoMinimo += Number(node.data.PesoMinimo || 0);

            totales.TRLiberados += Number(node.data.TRLiberados || 0);
            totales.ProduccionNeta += Number(node.data.ProduccionNeta || 0);

            totales.PesoEstandar += Number(node.data.PesoEstandar || 0);

            totales.TotalScrap += Number(node.data.TotalScrap || 0);

            // =====================================
            // DISPONIBILIDAD
            // =====================================

            totales.HorasProgramadas += Number(node.data.HorasProgramadas || 0);

            // =====================================
            // TIEMPO NO DISPONIBLE
            // =====================================

            totales.Preventivo += Number(node.data.Preventivo || 0);

            totales.ControlInventarios += Number(node.data.ControlInventarios || 0);

            totales.FaltaEnergiaElectrica += Number(node.data.FaltaEnergiaElectrica || 0);

            totales.FaltaMateriaPrimaInsumos += Number(node.data.FaltaMateriaPrimaInsumos || 0);

            totales.TiempoCalentamientoCI += Number(node.data.TiempoCalentamientoCI || 0);

            totales.PreparacionLineaCambioHerramental += Number(node.data.PreparacionLineaCambioHerramental || 0);

            totales.TiempoCalentamientoHerramental += Number(node.data.TiempoCalentamientoHerramental || 0);

            totales.ArranqueEstabilizacionLinea += Number(node.data.ArranqueEstabilizacionLinea || 0);

            // =====================================
            // TIEMPO NO PRODUCTIVO
            // =====================================

            totales.TiempoMuertoCorrectivos += Number(node.data.TiempoMuertoCorrectivos || 0);

            totales.TiempoMuertoHerramentales += Number(node.data.TiempoMuertoHerramentales || 0);

            totales.CambioMoldeSetupExcesos += Number(node.data.CambioMoldeSetupExcesos || 0);

            totales.FaltaPersonal += Number(node.data.FaltaPersonal || 0);

            totales.TiempoMuertoProceso += Number(node.data.TiempoMuertoProceso || 0);

            // =====================================
            // KPI
            // =====================================

            totales.TiempoDisponible += Number(node.data.TiempoDisponible || 0);

            totales.TiempoProductivo += Number(node.data.TiempoProductivo || 0);

        });

        // ========================================
        // CALCULAR PORCENTAJES EN TOTALES
        // ========================================

        if (totales.PesoEstandar > 0) {

            totales.PorcentajeSobrepeso =
                ((totales.ProduccionNeta / totales.PesoEstandar) - 1) * 100;
        }

        const totalProduccion =
            totales.ProduccionNeta + totales.TotalScrap;

        if (totalProduccion > 0) {

            totales.PorcentajeTotalScrap =
                (totales.TotalScrap / totalProduccion) * 100;
        }

        return totales;

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
        // 📧 NUEVO: Abrir modal para enviar por correo
        // ========================================
        $('#btnEnviarCorreo').on('click', () => {
            const modal = new bootstrap.Modal(document.getElementById('modalEnviarExcelCorreo'));
            modal.show();
        });

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

        // 🔥 NUEVO — mismo helper que PVC
        const redondear = (valor, decimales = 2) => {
            if (valor === null || valor === undefined || isNaN(valor)) return 0;
            return Math.round(valor * Math.pow(10, decimales)) / Math.pow(10, decimales);
        };

        this.gridApi.forEachNode(node => {

            if (node.data?.id === 'TOTALES') return;

            const fila = node.data;

            datos.push({

                ID_REGISTRO: fila.ID_REGISTRO || null,
                OTMC: fila.OTMC ?? null,

                MES: fila.Mes,
                FECHA: fila.Fecha,
                LINEA: fila.Linea,
                PRODUCTO: fila.Producto,
                TURNO: fila.Turno,
                GRUPO: fila.Grupo,

                PESO_MINIMO: redondear(fila.PesoMinimo, 2),
                TRLIBERADOS: redondear(fila.TRLiberados, 2),
                PRODUCCION_NETA: redondear(fila.ProduccionNeta, 2),
                PESO_ESTANDAR: redondear(fila.PesoEstandar, 2),
                PORCENTAJE_SOBREPESO: redondear(fila.PorcentajeSobrepeso, 2),
                TOTAL_SCRAP: redondear(fila.TotalScrap, 2),
                PORCENTAJE_TOTAL_SCRAP: redondear(fila.PorcentajeTotalScrap, 2),

                HORAS_PROGRAMADAS: redondear(fila.HorasProgramadas, 2),

                PREVENTIVO: redondear(fila.Preventivo, 2),
                CONTROL_INVENTARIOS: redondear(fila.ControlInventarios, 2),
                FALTA_ENERGIA_ELECTRICA: redondear(fila.FaltaEnergiaElectrica, 2),
                FALTA_MATERIA_PRIMA_INSUMOS: redondear(fila.FaltaMateriaPrimaInsumos, 2),
                TIEMPO_CALENTAMIENTO_CI: redondear(fila.TiempoCalentamientoCI, 2),
                PREPARACION_LINEA_CAMBIO_HERRAMENTAL: redondear(fila.PreparacionLineaCambioHerramental, 2),
                TIEMPO_CALENTAMIENTO_HERRAMENTAL: redondear(fila.TiempoCalentamientoHerramental, 2),
                ARRANQUE_ESTABILIZACION_LINEA: redondear(fila.ArranqueEstabilizacionLinea, 2),

                TIEMPO_MUERTO_CORRECTIVOS: redondear(fila.TiempoMuertoCorrectivos, 2),
                TIEMPO_MUERTO_HERRAMENTALES: redondear(fila.TiempoMuertoHerramentales, 2),
                CAMBIO_MOLDE_SETUP_EXCESOS: redondear(fila.CambioMoldeSetupExcesos, 2),
                FALTA_PERSONAL: redondear(fila.FaltaPersonal, 2),
                TIEMPO_MUERTO_PROCESO: redondear(fila.TiempoMuertoProceso, 2),

                TIEMPO_DISPONIBLE: redondear(fila.TiempoDisponible, 2),
                TIEMPO_PRODUCTIVO: redondear(fila.TiempoProductivo, 2),

                USUARIO: this.datos_usuario[0].EMAIL,
                PLANTA: this.datos_usuario[0].PLANTA

            });

        });

        return datos;
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
            { campo: "MES", nombre: "Mes" },
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
            GlobalUtil.mostrarLoader(true);

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

    exportarExcel() {
        const exporter = new ExcelExporterPeadLiso(this.gridApi, this.columnDefs);
        exporter.exportarConFormato();
    }

    async cargarLineas() {

        try {

            const lineas = await EquiposUtil.obtenerLineas(this.datos_usuario[0].PLANTA, (this.datos_usuario[0].PLANTA == "1" ? 9 : 9), 1); //REVISAR PARA PLANTA 2 QUE LINEAS

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

            id: this.generarIdTemporal(),

            ID_REGISTRO: null,

            // =====================================
            // GENERALES
            // =====================================

            Mes: null,

            Fecha: null,
            Linea: null,
            Producto: null,
            Turno: null,
            Grupo: null,

            // =====================================
            // PRODUCCIÓN
            // =====================================

            PesoMinimo: 0,

            TRLiberados: null,
            ProduccionNeta: null,

            PesoEstandar: 0,

            PorcentajeSobrepeso: 0,

            TotalScrap: null,

            PorcentajeTotalScrap: 0,

            // =====================================
            // DISPONIBILIDAD
            // =====================================

            HorasProgramadas: null,

            // =====================================
            // TIEMPO NO DISPONIBLE
            // =====================================

            Preventivo: null,

            ControlInventarios: null,

            FaltaEnergiaElectrica: null,

            FaltaMateriaPrimaInsumos: null,

            TiempoCalentamientoCI: null,

            PreparacionLineaCambioHerramental: null,

            TiempoCalentamientoHerramental: null,

            ArranqueEstabilizacionLinea: null,

            // =====================================
            // TIEMPO NO PRODUCTIVO
            // =====================================

            TiempoMuertoCorrectivos: null,

            TiempoMuertoHerramentales: null,

            CambioMoldeSetupExcesos: null,

            FaltaPersonal: null,

            TiempoMuertoProceso: null,

            // =====================================
            // KPI
            // =====================================

            TiempoDisponible: 0,

            TiempoProductivo: 0

        };

        this.gridApi.applyTransaction({

            add: [nuevaFila],

            addIndex: params.rowIndex + 1

        });

        this.recalcularTotales();

        this.gridApi.refreshCells({
            force: true
        });

        this.gridApi.redrawRows();

    }

    copiarFilaAnterior(params) {

        // 🔥 Manejar tanto params.node (del callback del grid) como node directo (del menú contextual)
        const node = params.node || params;
        const filaActual = node?.data;

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

        nuevaFila.PesoMinimo = 0;

        // ========================================
        // RECALCULAR MES
        // ========================================

        if (nuevaFila.Fecha) {

            const fecha = new Date(nuevaFila.Fecha);

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

            nuevaFila.Mes =
                meses[fecha.getMonth()];
        }

        // ========================================
        // RECALCULAR KPIs
        // ========================================

        this.recalcularFila(nuevaFila);

        this.gridApi.applyTransaction({

            add: [nuevaFila],

            addIndex:
                node.rowIndex + 1

        });

        this.recalcularTotales();

        this.gridApi.refreshCells({
            force: true
        });

        this.gridApi.redrawRows();

    }

    eliminarFila(params) {

        if (params.data.id === 'TOTALES')
            return;

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

        this.gridApi.refreshCells({
            force: true
        });

        this.gridApi.redrawRows();

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

                row.PesoMinimo =
                    parseFloat(articulo.PesoMinimo) || 0;

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
// ⭐ EXPORTADOR EXCEL PARA PEAD LISO
// ========================================
class ExcelExporterPeadLiso extends ExcelExporterBase {
    constructor(gridApi, columnDefs) {
        super(gridApi, columnDefs);
    }

    getSheetName() { return 'Causas Tiempos Muertos Pead Liso'; }
    getFileNamePrefix() { return 'Produccion_PeadLiso'; }
    getTextFields() { return ['Mes','Fecha','Linea','Producto','Turno','Grupo']; }

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

                    // ⚠️ AJUSTA los campos de texto según Pead Liso
                    if (valor !== null && valor !== undefined && valor !== '' &&
                        !['Mes', 'Fecha', 'Linea', 'Producto', 'Turno', 'Grupo'].includes(col.field)) {
                        valor = parseFloat(valor);
                    }

                    if (node.data.id === 'TOTALES' &&
                        ['Mes', 'Fecha', 'Linea', 'Producto', 'Turno', 'Grupo'].includes(col.field)) {
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
                        if (!['Mes', 'Fecha', 'Linea', 'Producto', 'Turno', 'Grupo'].includes(col.field)) {
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

// ========================================
// 📧 GESTOR DE CORREOS PARA ENVÍO DE EXCEL
// ========================================
class CorreosManagerPeadLiso {
    constructor() {
        this.correosNotificacion = [];
        this.appProduccion = null;
    }

    setAppProduccion(app) {
        this.appProduccion = app;
    }

    inicializar() {
        $("#btnAgregarCorreoPeadLiso").off("click").on("click", () => this.agregarCorreo());
        $("#inputCorreoPeadLiso").off("keydown").on("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                this.agregarCorreo();
            }
        });
        $("#btnEnviarExcelCorreo").off("click").on("click", () => this.enviarExcelPorCorreo());
    }

    agregarCorreo() {
        const input = $("#inputCorreoPeadLiso");
        const correo = input.val().trim().toLowerCase();
        const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        // Validar formato
        if (!regexEmail.test(correo)) {
            $("#errorCorreoPeadLiso").text("Ingrese un correo válido.").show();
            input.addClass("is-invalid");
            return;
        }

        // Validar duplicado
        if (this.correosNotificacion.includes(correo)) {
            $("#errorCorreoPeadLiso").text("Este correo ya fue agregado.").show();
            input.addClass("is-invalid");
            return;
        }

        // Agregar a la lista
        this.correosNotificacion.push(correo);
        this.renderCorreos();

        // Limpiar input
        input.val('').removeClass("is-invalid");
        $("#errorCorreoPeadLiso").hide();
    }

    renderCorreos() {
        const lista = $("#listaCorreosPeadLiso");
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
            const exporter = new ExcelExporterPeadLiso(this.appProduccion.gridApi, this.appProduccion.columnDefs);
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
                        tipoReporte: 'PEAD LISO'
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
        $("#inputCorreoPeadLiso").val('').removeClass("is-invalid");
        $("#errorCorreoPeadLiso").hide();
    }
}