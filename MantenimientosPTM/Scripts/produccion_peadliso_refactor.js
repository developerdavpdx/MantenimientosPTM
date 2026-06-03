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
        this.gestionArticulos = new GestionArticulos(this.datos_usuario, 0);
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

                PesoMinimo: 3,

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
                    "info"
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

        if (datos && datos.length > 0) {

            const datosFormateados = datos.map(item => ({

                id: item.ID_REGISTRO || Date.now(),

                ID_REGISTRO: item.ID_REGISTRO,

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

                FaltaEnergiaElectrica:
                    item.FALTA_ENERGIA_ELECTRICA,

                FaltaMateriaPrimaInsumos:
                    item.FALTA_MATERIA_PRIMA_INSUMOS,

                TiempoCalentamientoCI:
                    item.TIEMPO_CALENTAMIENTO_CI,

                PreparacionLineaCambioHerramental:
                    item.PREPARACION_LINEA_CAMBIO_HERRAMENTAL,

                TiempoCalentamientoHerramental:
                    item.TIEMPO_CALENTAMIENTO_HERRAMENTAL,

                ArranqueEstabilizacionLinea:
                    item.ARRANQUE_ESTABILIZACION_LINEA,

                TiempoMuertoCorrectivos:
                    item.TIEMPO_MUERTO_CORRECTIVOS,

                TiempoMuertoHerramentales:
                    item.TIEMPO_MUERTO_HERRAMENTALES,

                CambioMoldeSetupExcesos:
                    item.CAMBIO_MOLDE_SETUP_EXCESOS,

                FaltaPersonal:
                    item.FALTA_PERSONAL,

                TiempoMuertoProceso:
                    item.TIEMPO_MUERTO_PROCESO,

                TiempoDisponible:
                    item.TIEMPO_DISPONIBLE,

                TiempoProductivo:
                    item.TIEMPO_PRODUCTIVO

            }));

            this.gridApi.setRowData(datosFormateados);

        } else {

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
        // PRODUCCIÓN
        // ========================================

        row.PesoEstandar =
            this.calcularPesoEstandar(row);

        row.PorcentajeSobrepeso =
            this.calcularPorcentajeSobrepeso(row);

        row.TotalScrap =
            this.calcularTotalScrap(row);

        row.PorcentajeTotalScrap =
            this.calcularPorcentajeTotalScrap(row);

        // ========================================
        // KPI
        // ========================================

        row.TiempoDisponible =
            this.calcularTiempoDisponible(row);

        row.TiempoProductivo =
            this.calcularTiempoProductivo(row);

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

    calcularTotalScrap(row) {
        return parseFloat(row.TotalScrap) || 0;
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

                // =====================================
                // GENERALES
                // =====================================

                MES: fila.Mes,

                FECHA: fila.Fecha,
                LINEA: fila.Linea,
                PRODUCTO: fila.Producto,
                TURNO: fila.Turno,
                GRUPO: fila.Grupo,

                // =====================================
                // PRODUCCIÓN
                // =====================================

                PESO_MINIMO:
                    fila.PesoMinimo ?? 0,

                TRLIBERADOS:
                    fila.TRLiberados ?? 0,

                PRODUCCION_NETA:
                    fila.ProduccionNeta ?? 0,

                PESO_ESTANDAR:
                    fila.PesoEstandar ?? 0,

                PORCENTAJE_SOBREPESO:
                    fila.PorcentajeSobrepeso ?? 0,

                TOTAL_SCRAP:
                    fila.TotalScrap ?? 0,

                PORCENTAJE_TOTAL_SCRAP:
                    fila.PorcentajeTotalScrap ?? 0,

                // =====================================
                // DISPONIBILIDAD
                // =====================================

                HORAS_PROGRAMADAS:
                    fila.HorasProgramadas ?? 0,

                // =====================================
                // TIEMPO NO DISPONIBLE
                // =====================================

                PREVENTIVO:
                    fila.Preventivo ?? 0,

                CONTROL_INVENTARIOS:
                    fila.ControlInventarios ?? 0,

                FALTA_ENERGIA_ELECTRICA:
                    fila.FaltaEnergiaElectrica ?? 0,

                FALTA_MATERIA_PRIMA_INSUMOS:
                    fila.FaltaMateriaPrimaInsumos ?? 0,

                TIEMPO_CALENTAMIENTO_CI:
                    fila.TiempoCalentamientoCI ?? 0,

                PREPARACION_LINEA_CAMBIO_HERRAMENTAL:
                    fila.PreparacionLineaCambioHerramental ?? 0,

                TIEMPO_CALENTAMIENTO_HERRAMENTAL:
                    fila.TiempoCalentamientoHerramental ?? 0,

                ARRANQUE_ESTABILIZACION_LINEA:
                    fila.ArranqueEstabilizacionLinea ?? 0,

                // =====================================
                // TIEMPO NO PRODUCTIVO
                // =====================================

                TIEMPO_MUERTO_CORRECTIVOS:
                    fila.TiempoMuertoCorrectivos ?? 0,

                TIEMPO_MUERTO_HERRAMENTALES:
                    fila.TiempoMuertoHerramentales ?? 0,

                CAMBIO_MOLDE_SETUP_EXCESOS:
                    fila.CambioMoldeSetupExcesos ?? 0,

                FALTA_PERSONAL:
                    fila.FaltaPersonal ?? 0,

                TIEMPO_MUERTO_PROCESO:
                    fila.TiempoMuertoProceso ?? 0,

                // =====================================
                // KPI
                // =====================================

                TIEMPO_DISPONIBLE:
                    fila.TiempoDisponible ?? 0,

                TIEMPO_PRODUCTIVO:
                    fila.TiempoProductivo ?? 0,

                // =====================================
                // AUDITORÍA
                // =====================================

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

            PesoMinimo: 3,

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

        const filaActual = params.node.data;

        if (!filaActual || filaActual.id === 'TOTALES') {
            return;
        }

        const nuevaFila =
            JSON.parse(JSON.stringify(filaActual));

        // ========================================
        // NUEVO REGISTRO
        // ========================================

        nuevaFila.id = Date.now();

        nuevaFila.ID_REGISTRO = null;

        nuevaFila.PesoMinimo = 3;

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

        nuevaFila.PesoEstandar =
            this.calcularPesoEstandar(nuevaFila);

        nuevaFila.PorcentajeSobrepeso =
            this.calcularPorcentajeSobrepeso(nuevaFila);

        nuevaFila.TotalScrap =
            this.calcularTotalScrap(nuevaFila);

        nuevaFila.PorcentajeTotalScrap =
            this.calcularPorcentajeTotalScrap(nuevaFila);

        nuevaFila.TiempoDisponible =
            this.calcularTiempoDisponible(nuevaFila);

        nuevaFila.TiempoProductivo =
            this.calcularTiempoProductivo(nuevaFila);

        this.gridApi.applyTransaction({

            add: [nuevaFila],

            addIndex:
                params.node.rowIndex + 1

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
                AlertManager.mostrar('Excel exportado correctamente', 'success');
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
                        !['Mes', 'Fecha', 'Linea', 'Producto', 'Turno', 'Grupo'].includes(col.field)) {
                        valor = parseFloat(valor);
                    }

                    if (node.data.id === 'TOTALES' &&
                        ['Mes', 'Fecha', 'Linea', 'Producto', 'Turno', 'Grupo'].includes(col.field)) {
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