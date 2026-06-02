// ========================================
// GESTOR DE UI
// ========================================
class UIManager {
    static inicializarUI() {
        $("#ProduccionContainer").addClass("selected");
        $("#ProduccionContainer a").addClass("whiteText");
        $("#produccion-collapse").addClass("show");
        $("#RegistroProduccionPVCURL").addClass("selected-item");
        console.log('✅ UI PVC inicializada');
    }
}

// ========================================
// APLICACIÓN PRINCIPAL - GESTIÓN PVC
// ========================================
class GestionProduccionPVC {
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
        console.log('✅ Sistema PVC inicializado');
    }

    cargarDatosIniciales() {
        this.datosOriginales = [
            {
                id: 1,

                // GENERALES
                Mes: null,
                Fecha: null,
                Linea: null,
                Producto: null,
                Turno: null,
                TRIP: null,

                // PRODUCCIÓN
                PesoMinimo: 3,
                TRFabricados: null,
                ProduccionNetaReal: null,
                PesoEstandar: null,
                PorcentajeSobrepeso: null,
                TotalScrapKg: null,
                PorcentajeScrap: null,

                // DISPONIBILIDAD
                HorasProgramadas: null,

                // TIEMPO NO DISPONIBLE
                MantenimientoPreventivo: null,
                ControlInventarios: null,
                FaltaMateriaInsumos: null,
                CambioMolde: null,
                Calentamiento: null,
                ParoArranqueNoProgramado: null,
                ArranqueEstabilizacion: null,

                // TIEMPO NO PRODUCTIVO
                MttoCorrectivos: null,
                FallaElectrica: null,
                Servicios: null,
                CambioMoldeSetupExcesos: null,
                Herramental: null,
                FallaOperacion: null,
                LimpiezaTanque: null,
                FaltaMaterial: null,
                FaltaPersonal: null,
                FaltaRefacciones: null,

                // KPIS
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
            GlobalUtil.mostrarLoader(true);

            const response = await $.ajax({
                url: `/${this.URLBase}/GetTiemposMuertosPVC`,
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

            } else {

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
                GlobalUtil.mostrarLoader(false);
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
                TRIP: item.TRIP,

                HorasProgramadas: item.HORAS_PROGRAMADAS,

                MantenimientoPreventivo: item.MANTENIMIENTO_PREVENTIVO,
                ControlInventarios: item.CONTROL_INVENTARIOS,
                FaltaMateriaInsumos: item.FALTA_MATERIA_INSUMOS,
                CambioMolde: item.CAMBIO_MOLDE_HR,
                Calentamiento: item.CALENTAMIENTO_HR,
                ParoArranqueNoProgramado: item.PARO_ARRANQUE_NO_PROGRAMADO,
                ArranqueEstabilizacion: item.ARRANQUE_ESTABILIZACION_HR,
                Mes: item.MES || (
                    item.FECHA
                        ? [
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
                        ][new Date(item.FECHA).getMonth()]
                        : null
                ),
                PesoMinimo: item.PESO_MINIMO || 3,
                TRFabricados: item.TR_FABRICADOS,
                ProduccionNetaReal: item.PRODUCCION_NETA_REAL,
                PesoEstandar: item.PESO_ESTANDAR,
                PorcentajeSobrepeso: item.PORCENTAJE_SOBREPESO,
                TotalScrapKg: item.TOTAL_SCRAP_KG,
                PorcentajeScrap: item.PORCENTAJE_SCRAP,

                MttoCorrectivos: item.MTTO_CORRECTIVOS,
                FallaElectrica: item.FALLA_ELECTRICA,
                Servicios: item.SERVICIOS,
                CambioMoldeSetupExcesos: item.CAMBIO_MOLDE_SETUP_EXCESOS,
                Herramental: item.HERRAMENTAL,
                FallaOperacion: item.FALLA_OPERACION,
                LimpiezaTanque: item.LIMPIEZA_TANQUE,
                FaltaMaterial: item.FALTA_MATERIAL,
                FaltaPersonal: item.FALTA_PERSONAL,
                FaltaRefacciones: item.FALTA_REFACCIONES,

                TiempoDisponible: item.TIEMPO_DISPONIBLE,
                TiempoProductivo: item.TIEMPO_PRODUCTIVO

            }));

            // 🔥 Aquí va la opción 4
            if (datosFormateados.length > 0) {
                this.gridApi.setRowData(datosFormateados);
            } else {
                this.gridApi.setRowData(this.datosOriginales);
            }
        }
        else {
            this.gridApi.setRowData(this.datosOriginales);
        }

        this.agregarFilaTotales();
    }

    inicializarGrid() {

        const gridDiv = document.querySelector('#tablaProduccion');

        const columnDefs = [

            // =====================================================
            // DATOS GENERALES
            // =====================================================
            {
                headerName: 'DATOS GENERALES',
                headerClass: 'header-grupo-morado',
                children: [

                    {
                        field: 'Mes',
                        headerName: 'Mes',
                        editable: false,
                        width: 100,
                        cellClass: 'celda-gris',
                        pinned: 'left'
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
                            return new Date(params.value).toLocaleDateString('es-MX');
                        }
                    },

                    {
                        field: 'Linea',
                        headerName: 'Línea',
                        editable: true,
                        width: 120,
                        cellClass: 'celda-azul',
                        pinned: 'left',
                        cellEditor: 'agSelectCellEditor',
                        cellEditorParams: () => {
                            return {
                                values: this.listaLineas.map(x => x.label)
                            };
                        }
                    },

                    {
                        field: 'Producto',
                        headerName: 'Producto',
                        editable: true,
                        width: 140,
                        cellClass: 'celda-azul',
                        pinned: 'left',
                        cellEditor: 'articuloAutocompleteEditor'
                    },

                    {
                        field: 'Turno',
                        headerName: 'Turno',
                        editable: true,
                        width: 90,
                        cellClass: 'celda-azul',
                        pinned: 'left'
                    },

                    {
                        field: 'TRIP',
                        headerName: 'TRIP',
                        editable: true,
                        width: 90,
                        cellClass: 'celda-azul',
                        pinned: 'left',
                        cellEditor: 'agSelectCellEditor',
                        cellEditorParams: {
                            values: ['A', 'B', 'C', 'D']
                        }
                    }
                ]
            },

            // =====================================================
            // PRODUCCIÓN
            // =====================================================
            {
                headerName: 'PRODUCCIÓN',
                headerClass: 'header-grupo-amarillo',
                children: [

                    {
                        field: 'PesoMinimo',
                        headerName: 'Peso Mínimo',
                        editable: false,
                        width: 120,
                        cellClass: 'celda-amarilla',
                        valueFormatter: params => this.formatearNumero(params.value)
                    },

                    {
                        field: 'TRFabricados',
                        headerName: 'TR FABRICADOS',
                        width: 120,
                        ...this.getColumnaNumerica('celda-blanca')
                    },

                    {
                        field: 'ProduccionNetaReal',
                        headerName: 'PRODUCCIÓN NETA REAL',
                        width: 150,
                        ...this.getColumnaNumerica('celda-blanca')
                    },

                    {
                        field: 'PesoEstandar',
                        headerName: 'Peso Estándar',
                        editable: false,
                        width: 140,
                        cellClass: 'celda-verde-formula',
                        valueFormatter: params => this.formatearNumero(params.value)
                    },

                    {
                        field: 'PorcentajeSobrepeso',
                        headerName: '% SOBREPESO',
                        editable: false,
                        width: 120,
                        cellClass: 'celda-verde-formula',
                        valueFormatter: params => this.formatearPorcentaje(params.value)
                    },

                    {
                        field: 'TotalScrapKg',
                        headerName: 'Total Scrap (Kg)',
                        width: 130,
                        ...this.getColumnaNumerica('celda-blanca')
                    },

                    {
                        field: 'PorcentajeScrap',
                        headerName: '% Scrap',
                        editable: false,
                        width: 110,
                        cellClass: 'celda-verde-formula',
                        valueFormatter: params => this.formatearPorcentaje(params.value)
                    }
                ]
            },

            // =====================================================
            // DISPONIBILIDAD
            // =====================================================
            {
                headerName: 'DISPONIBILIDAD',
                headerClass: 'header-grupo-azul',
                children: [
                    {
                        field: 'HorasProgramadas',
                        headerName: 'HORAS PROGRAMADAS',
                        width: 120,
                        ...this.getColumnaNumerica('celda-gris')
                    }
                ]
            },

            // =====================================================
            // TIEMPO NO DISPONIBLE
            // =====================================================
            {
                headerName: 'TIEMPO NO DISPONIBLE',
                headerClass: 'header-grupo-rosa',
                children: [

                    {
                        field: 'MantenimientoPreventivo',
                        headerName: 'MTTO. PREVENTIVO',
                        width: 100,
                        ...this.getColumnaNumerica('celda-rosa')
                    },

                    {
                        field: 'ControlInventarios',
                        headerName: 'CONTROL INVENTARIOS',
                        width: 100,
                        ...this.getColumnaNumerica('celda-rosa')
                    },

                    {
                        field: 'FaltaMateriaInsumos',
                        headerName: 'FALTA MATERIA PRIMA E INSUMOS',
                        width: 120,
                        ...this.getColumnaNumerica('celda-rosa')
                    },

                    {
                        field: 'CambioMolde',
                        headerName: 'CAMBIO MOLDE (HR)',
                        width: 110,
                        ...this.getColumnaNumerica('celda-rosa')
                    },

                    {
                        field: 'Calentamiento',
                        headerName: 'CALENTAMIENTO (HR)',
                        width: 110,
                        ...this.getColumnaNumerica('celda-rosa')
                    },

                    {
                        field: 'ParoArranqueNoProgramado',
                        headerName: 'PARO Y ARRANQUE NO PROG.',
                        width: 130,
                        ...this.getColumnaNumerica('celda-rosa')
                    },

                    {
                        field: 'ArranqueEstabilizacion',
                        headerName: 'ARRANQUE Y ESTABILIZACIÓN',
                        width: 130,
                        ...this.getColumnaNumerica('celda-rosa')
                    }
                ]
            },

            // =====================================================
            // TIEMPO NO PRODUCTIVO
            // =====================================================
            {
                headerName: 'TIEMPO NO PRODUCTIVO',
                headerClass: 'header-grupo-verde-claro',
                children: [

                    {
                        field: 'MttoCorrectivos',
                        headerName: 'MTTO. CORRECTIVOS',
                        width: 110,
                        ...this.getColumnaNumerica('celda-verde-claro')
                    },

                    {
                        field: 'FallaElectrica',
                        headerName: 'FALLA ELÉCTRICA',
                        width: 110,
                        ...this.getColumnaNumerica('celda-verde-claro')
                    },

                    {
                        field: 'Servicios',
                        headerName: 'SERVICIOS',
                        width: 100,
                        ...this.getColumnaNumerica('celda-verde-claro')
                    },

                    {
                        field: 'CambioMoldeSetupExcesos',
                        headerName: 'CAMBIO MOLDE SETUP EXCESOS',
                        width: 150,
                        ...this.getColumnaNumerica('celda-verde-claro')
                    },

                    {
                        field: 'Herramental',
                        headerName: 'HERRAMENTAL',
                        width: 100,
                        ...this.getColumnaNumerica('celda-verde-claro')
                    },

                    {
                        field: 'FallaOperacion',
                        headerName: 'FALLA OPERACIÓN',
                        width: 120,
                        ...this.getColumnaNumerica('celda-verde-claro')
                    },

                    {
                        field: 'LimpiezaTanque',
                        headerName: 'LIMPIEZA TANQUE',
                        width: 120,
                        ...this.getColumnaNumerica('celda-verde-claro')
                    },

                    {
                        field: 'FaltaMaterial',
                        headerName: 'FALTA MATERIAL',
                        width: 120,
                        ...this.getColumnaNumerica('celda-verde-claro')
                    },

                    {
                        field: 'FaltaPersonal',
                        headerName: 'FALTA PERSONAL',
                        width: 120,
                        ...this.getColumnaNumerica('celda-verde-claro')
                    },

                    {
                        field: 'FaltaRefacciones',
                        headerName: 'FALTA REFACCIONES',
                        width: 120,
                        ...this.getColumnaNumerica('celda-verde-claro')
                    }
                ]
            },

            // =====================================================
            // KPIS
            // =====================================================
            {
                headerName: 'KPIS',
                headerClass: 'header-grupo-verde-fuerte',
                children: [

                    {
                        field: 'TiempoDisponible',
                        headerName: 'TIEMPO DISPONIBLE',
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

                    if (params.data && params.data.id === 'TOTALES') {
                        return false;
                    }

                    const readonlyFields = [
                        'PesoMinimo',
                        'PesoEstandar',
                        'PorcentajeSobrepeso',
                        'PorcentajeScrap',
                        'TiempoDisponible',
                        'TiempoProductivo'
                    ];

                    if (readonlyFields.includes(params.colDef.field)) {
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

            onCellValueChanged: (event) => this.onCellChanged(event),

            onGridReady: (params) => {

                this.gridApi = params.api;
                this.gridColumnApi = params.columnApi;

                this.agregarFilaTotales();
            },

            getRowStyle: params => {

                if (params.data && params.data.id === 'TOTALES') {

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

    agregarFilaTotales() {

        const totales = {

            id: 'TOTALES',

            // GENERALES
            Mes: null,
            Fecha: null,
            Linea: null,
            Producto: null,
            Turno: null,
            TRIP: null,

            // PRODUCCIÓN
            PesoMinimo: null,
            TRFabricados: 0,
            ProduccionNetaReal: 0,
            PesoEstandar: 0,
            PorcentajeSobrepeso: null,
            TotalScrapKg: 0,
            PorcentajeScrap: null,

            // DISPONIBILIDAD
            HorasProgramadas: 0,

            // TIEMPO NO DISPONIBLE
            MantenimientoPreventivo: 0,
            ControlInventarios: 0,
            FaltaMateriaInsumos: 0,
            CambioMolde: 0,
            Calentamiento: 0,
            ParoArranqueNoProgramado: 0,
            ArranqueEstabilizacion: 0,

            // TIEMPO NO PRODUCTIVO
            MttoCorrectivos: 0,
            FallaElectrica: 0,
            Servicios: 0,
            CambioMoldeSetupExcesos: 0,
            Herramental: 0,
            FallaOperacion: 0,
            LimpiezaTanque: 0,
            FaltaMaterial: 0,
            FaltaPersonal: 0,
            FaltaRefacciones: 0,

            // KPIS
            TiempoDisponible: 0,
            TiempoProductivo: 0
        };

        this.gridApi.forEachNode((node) => {

            if (node.data && node.data.id !== 'TOTALES') {

                // ========================================
                // PRODUCCIÓN
                // ========================================

                totales.TRFabricados += parseFloat(node.data.TRFabricados || 0);

                totales.ProduccionNetaReal += parseFloat(node.data.ProduccionNetaReal || 0);

                totales.PesoEstandar += parseFloat(node.data.PesoEstandar || 0);

                totales.TotalScrapKg += parseFloat(node.data.TotalScrapKg || 0);

                // ========================================
                // DISPONIBILIDAD
                // ========================================

                totales.HorasProgramadas += parseFloat(node.data.HorasProgramadas || 0);

                // ========================================
                // TIEMPO NO DISPONIBLE
                // ========================================

                totales.MantenimientoPreventivo += parseFloat(node.data.MantenimientoPreventivo || 0);

                totales.ControlInventarios += parseFloat(node.data.ControlInventarios || 0);

                totales.FaltaMateriaInsumos += parseFloat(node.data.FaltaMateriaInsumos || 0);

                totales.CambioMolde += parseFloat(node.data.CambioMolde || 0);

                totales.Calentamiento += parseFloat(node.data.Calentamiento || 0);

                totales.ParoArranqueNoProgramado += parseFloat(node.data.ParoArranqueNoProgramado || 0);

                totales.ArranqueEstabilizacion += parseFloat(node.data.ArranqueEstabilizacion || 0);

                // ========================================
                // TIEMPO NO PRODUCTIVO
                // ========================================

                totales.MttoCorrectivos += parseFloat(node.data.MttoCorrectivos || 0);

                totales.FallaElectrica += parseFloat(node.data.FallaElectrica || 0);

                totales.Servicios += parseFloat(node.data.Servicios || 0);

                totales.CambioMoldeSetupExcesos += parseFloat(node.data.CambioMoldeSetupExcesos || 0);

                totales.Herramental += parseFloat(node.data.Herramental || 0);

                totales.FallaOperacion += parseFloat(node.data.FallaOperacion || 0);

                totales.LimpiezaTanque += parseFloat(node.data.LimpiezaTanque || 0);

                totales.FaltaMaterial += parseFloat(node.data.FaltaMaterial || 0);

                totales.FaltaPersonal += parseFloat(node.data.FaltaPersonal || 0);

                totales.FaltaRefacciones += parseFloat(node.data.FaltaRefacciones || 0);

                // ========================================
                // KPIS
                // ========================================

                totales.TiempoDisponible += parseFloat(node.data.TiempoDisponible || 0);

                totales.TiempoProductivo += parseFloat(node.data.TiempoProductivo || 0);
            }
        });

        // ========================================
        // CALCULAR PORCENTAJES TOTALES
        // ========================================

        if (totales.PesoEstandar > 0) {

            totales.PorcentajeSobrepeso =
                ((totales.ProduccionNetaReal / totales.PesoEstandar) - 1) * 100;
        }

        const totalProduccionScrap =
            totales.ProduccionNetaReal + totales.TotalScrapKg;

        if (totalProduccionScrap > 0) {

            totales.PorcentajeScrap =
                (totales.TotalScrapKg / totalProduccionScrap) * 100;
        }

        let filaTotalesExistente = null;

        this.gridApi.forEachNode((node) => {

            if (node.data && node.data.id === 'TOTALES') {

                filaTotalesExistente = node.data;
            }
        });

        if (filaTotalesExistente) {

            this.gridApi.applyTransaction({
                update: [totales]
            });

        } else {

            this.gridApi.applyTransaction({
                add: [totales]
            });
        }

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
            const alturaFinal = alturaCalculada + 40;

            gridDiv.style.height = alturaFinal + 'px';
        });
    }

    formatearNumero(valor) {
        if (valor === null || valor === undefined || valor === '') return '';
        return parseFloat(valor).toFixed(2);
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
        row.PesoEstandar = this.calcularPesoEstandar(row);
        row.PorcentajeSobrepeso = this.calcularSobrepeso(row);
        row.PorcentajeScrap = this.calcularScrap(row);

        // ========================================
        // PRODUCTIVIDAD
        // ========================================
        row.TiempoDisponible = this.calcularTiempoDisponible(row);
        row.TiempoProductivo = this.calcularTiempoProductivo(row);

        // REGISTRAR CAMBIO
        const cambio = {
            id: event.data.id,
            campo: event.colDef.field,
            valorAnterior: event.oldValue,
            valorNuevo: event.newValue
        };



        this.cambiosPendientes.push(cambio);

        this.gridApi.refreshCells({
            force: true
        });

        this.gridApi.redrawRows();


        this.recalcularTotales();
    }

    recalcularTotales() {

        const filaTotales = {

            id: 'TOTALES',

            // GENERALES
            Mes: null,
            Fecha: null,
            Linea: null,
            Producto: null,
            Turno: null,
            TRIP: null,

            // PRODUCCIÓN
            PesoMinimo: null,
            TRFabricados: 0,
            ProduccionNetaReal: 0,
            PesoEstandar: 0,
            PorcentajeSobrepeso: null,
            TotalScrapKg: 0,
            PorcentajeScrap: null,

            // DISPONIBILIDAD
            HorasProgramadas: 0,

            // TIEMPO NO DISPONIBLE
            MantenimientoPreventivo: 0,
            ControlInventarios: 0,
            FaltaMateriaInsumos: 0,
            CambioMolde: 0,
            Calentamiento: 0,
            ParoArranqueNoProgramado: 0,
            ArranqueEstabilizacion: 0,

            // TIEMPO NO PRODUCTIVO
            MttoCorrectivos: 0,
            FallaElectrica: 0,
            Servicios: 0,
            CambioMoldeSetupExcesos: 0,
            Herramental: 0,
            FallaOperacion: 0,
            LimpiezaTanque: 0,
            FaltaMaterial: 0,
            FaltaPersonal: 0,
            FaltaRefacciones: 0,

            // KPIS
            TiempoDisponible: 0,
            TiempoProductivo: 0
        };

        this.gridApi.forEachNode((node) => {

            if (node.data.id !== 'TOTALES') {

                // ========================================
                // PRODUCCIÓN
                // ========================================

                filaTotales.TRFabricados += parseFloat(node.data.TRFabricados || 0);

                filaTotales.ProduccionNetaReal += parseFloat(node.data.ProduccionNetaReal || 0);

                filaTotales.PesoEstandar += parseFloat(node.data.PesoEstandar || 0);

                filaTotales.TotalScrapKg += parseFloat(node.data.TotalScrapKg || 0);

                // ========================================
                // DISPONIBILIDAD
                // ========================================

                filaTotales.HorasProgramadas += parseFloat(node.data.HorasProgramadas || 0);

                // ========================================
                // TIEMPO NO DISPONIBLE
                // ========================================

                filaTotales.MantenimientoPreventivo += parseFloat(node.data.MantenimientoPreventivo || 0);

                filaTotales.ControlInventarios += parseFloat(node.data.ControlInventarios || 0);

                filaTotales.FaltaMateriaInsumos += parseFloat(node.data.FaltaMateriaInsumos || 0);

                filaTotales.CambioMolde += parseFloat(node.data.CambioMolde || 0);

                filaTotales.Calentamiento += parseFloat(node.data.Calentamiento || 0);

                filaTotales.ParoArranqueNoProgramado += parseFloat(node.data.ParoArranqueNoProgramado || 0);

                filaTotales.ArranqueEstabilizacion += parseFloat(node.data.ArranqueEstabilizacion || 0);

                // ========================================
                // TIEMPO NO PRODUCTIVO
                // ========================================

                filaTotales.MttoCorrectivos += parseFloat(node.data.MttoCorrectivos || 0);

                filaTotales.FallaElectrica += parseFloat(node.data.FallaElectrica || 0);

                filaTotales.Servicios += parseFloat(node.data.Servicios || 0);

                filaTotales.CambioMoldeSetupExcesos += parseFloat(node.data.CambioMoldeSetupExcesos || 0);

                filaTotales.Herramental += parseFloat(node.data.Herramental || 0);

                filaTotales.FallaOperacion += parseFloat(node.data.FallaOperacion || 0);

                filaTotales.LimpiezaTanque += parseFloat(node.data.LimpiezaTanque || 0);

                filaTotales.FaltaMaterial += parseFloat(node.data.FaltaMaterial || 0);

                filaTotales.FaltaPersonal += parseFloat(node.data.FaltaPersonal || 0);

                filaTotales.FaltaRefacciones += parseFloat(node.data.FaltaRefacciones || 0);

                // ========================================
                // KPIS
                // ========================================

                filaTotales.TiempoDisponible += parseFloat(node.data.TiempoDisponible || 0);

                filaTotales.TiempoProductivo += parseFloat(node.data.TiempoProductivo || 0);
            }
        });

        // ========================================
        // CALCULAR %
        // ========================================

        if (filaTotales.PesoEstandar > 0) {

            filaTotales.PorcentajeSobrepeso =
                ((filaTotales.ProduccionNetaReal / filaTotales.PesoEstandar) - 1) * 100;
        }

        const totalProduccionScrap =
            filaTotales.ProduccionNetaReal + filaTotales.TotalScrapKg;

        if (totalProduccionScrap > 0) {

            filaTotales.PorcentajeScrap =
                (filaTotales.TotalScrapKg / totalProduccionScrap) * 100;
        }

        this.gridApi.forEachNode((node) => {

            if (node.data.id === 'TOTALES') {

                node.setData(filaTotales);
            }
        });

    }

    configurarEventos() {
        $('#btnExportarExcel').on('click', () => this.exportarExcel());
        $('#btnGuardarCambios').on('click', () => this.guardarCambios());

        // Delegación de eventos para botones de la tabla (si los hay)
        $(document).on('click', '.btn-editar-fila', (e) => {
            const fila = $(e.currentTarget).closest('tr');
            console.log('Editar fila:', fila.data());
        });

        $(document).on('click', '.btn-eliminar-fila', (e) => {
            const fila = $(e.currentTarget).closest('tr');
            console.log('Eliminar fila:', fila.data());
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
                const FechaTexto = this.formatearRangoFechas(fechaInicio, fechaFin);
                $("#mesActual").text(
                    FechaTexto
                );

                this.consultarDatos(fechaInicio, fechaFin, null);

            });
    }

    guardarCambios() {
        $("#btnGuardarCambios").html('<span class="spinner-border spinner-border-sm me-2"></span>Guardando...');
        $("#btnGuardarCambios").prop("disabled", true);

        const datos = this.obtenerDatosGrid();

        console.log(datos);

        if (datos.length === 0) {
            AlertManager.mostrar('No hay datos para guardar', 'warning');
            return;
        }

        const camposObligatorios = [
            { campo: "FECHA", nombre: "Fecha" },
            { campo: "LINEA", nombre: "Línea" },
            { campo: "PRODUCTO", nombre: "Producto" },
            { campo: "TURNO", nombre: "Turno" },
            { campo: "TRIP", nombre: "TRIP" },
            { campo: "HORAS_PROGRAMADAS", nombre: "Horas Programadas" }
        ];

        for (let i = 0; i < datos.length; i++) {

            const fila = datos[i];

            for (const campo of camposObligatorios) {

                if (!fila[campo.campo] && fila[campo.campo] !== 0) {

                    AlertManager.mostrar(
                        `Falta el campo "${campo.nombre}" en la fila ${i + 1}`,
                        'warning'
                    );
                    $("#btnGuardarCambios").prop("disabled", false);
                    $("#btnGuardarCambios").html('<i class="bi bi-save me-1"></i>Guardar');
                    return;
                }

            }

        }

        $.ajax({

            url: `/${this.URLBase}/GuardarTiemposMuertosPVC`,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(datos),

            beforeSend: () => {
                GlobalUtil.mostrarLoader(true);
            },

            success: async (response) => {

                if (response.Status === "SI") {


                    AlertManager.mostrar(
                        "Datos guardados correctamente",
                        "success"
                    );

                    setTimeout(function () {
                        $("#btnGuardarCambios").html('<i class="bi bi-save me-1"></i>Guardar');
                        $("#btnGuardarCambios").prop("disabled", false);
                    }, 3000);

                    this.cambiosPendientes = [];

                    // 🔥 REFRESCAR GRID
                    await this.consultarDatos(null, null, null);

                } else {

                    AlertManager.mostrar(
                        response.Message,
                        "warning"
                    );
                    $("#btnGuardarCambios").html('<i class="bi bi-save me-1"></i>Guardar');
                    $("#btnGuardarCambios").prop("disabled", false);

                }
            },

            error: (error) => {

                console.error(error);

                AlertManager.mostrar(
                    "No fue posible guardar los tiempos muertos: " + error,
                    "danger"
                );

                $("#btnGuardarCambios").html('<i class="bi bi-save me-1"></i>Guardar');
                $("#btnGuardarCambios").prop("disabled", false);

            },

            complete: () => {
                GlobalUtil.mostrarLoader(false);
            }

        });

    }

    obtenerDatosGrid() {

        const datos = [];

        this.gridApi.forEachNode((node) => {

            if (node.data.id !== 'TOTALES') {

                datos.push({
                    ID_REGISTRO: node.data.ID_REGISTRO || null,
                    FECHA: node.data.Fecha,
                    LINEA: node.data.Linea,
                    PRODUCTO: node.data.Producto,
                    TURNO: node.data.Turno,
                    TRIP: node.data.TRIP,

                    HORAS_PROGRAMADAS: node.data.HorasProgramadas || 0,

                    MANTENIMIENTO_PREVENTIVO: node.data.MantenimientoPreventivo || 0,
                    CONTROL_INVENTARIOS: node.data.ControlInventarios || 0,
                    FALTA_MATERIA_INSUMOS: node.data.FaltaMateriaInsumos || 0,
                    CAMBIO_MOLDE_HR: node.data.CambioMolde || 0,
                    CALENTAMIENTO_HR: node.data.Calentamiento || 0,
                    PARO_ARRANQUE_NO_PROGRAMADO: node.data.ParoArranqueNoProgramado || 0,
                    ARRANQUE_ESTABILIZACION_HR: node.data.ArranqueEstabilizacion || 0,
                    MES: node.data.Mes,
                    PESO_MINIMO: node.data.PesoMinimo || 0,
                    TR_FABRICADOS: node.data.TRFabricados || 0,
                    PRODUCCION_NETA_REAL: node.data.ProduccionNetaReal || 0,
                    PESO_ESTANDAR: node.data.PesoEstandar || 0,
                    PORCENTAJE_SOBREPESO: node.data.PorcentajeSobrepeso || 0,
                    TOTAL_SCRAP_KG: node.data.TotalScrapKg || 0,
                    PORCENTAJE_SCRAP: node.data.PorcentajeScrap || 0,

                    MTTO_CORRECTIVOS: node.data.MttoCorrectivos || 0,
                    FALLA_ELECTRICA: node.data.FallaElectrica || 0,
                    SERVICIOS: node.data.Servicios || 0,
                    CAMBIO_MOLDE_SETUP_EXCESOS: node.data.CambioMoldeSetupExcesos || 0,
                    HERRAMENTAL: node.data.Herramental || 0,
                    FALLA_OPERACION: node.data.FallaOperacion || 0,
                    LIMPIEZA_TANQUE: node.data.LimpiezaTanque || 0,
                    FALTA_MATERIAL: node.data.FaltaMaterial || 0,
                    FALTA_PERSONAL: node.data.FaltaPersonal || 0,
                    FALTA_REFACCIONES: node.data.FaltaRefacciones || 0,

                    TIEMPO_DISPONIBLE: node.data.TiempoDisponible || 0,
                    TIEMPO_PRODUCTIVO: node.data.TiempoProductivo || 0,

                    USUARIO: this.datos_usuario[0].EMAIL,
                    PLANTA:this.datos_usuario[0].PLANTA
                });

            }
        });

        return datos;
    }

    exportarExcel() {
        const exporter = new ExcelExporterPVC(this.gridApi, this.columnDefs);
        exporter.exportarConFormato();
    }

    inicializarTooltips() {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(el => new bootstrap.Tooltip(el));
    }

    calcularTiempoDisponible(row) {

        const horas = parseFloat(row.HorasProgramadas) || 0;

        const tiempoNoDisponible =
            (parseFloat(row.MantenimientoPreventivo) || 0) +
            (parseFloat(row.ControlInventarios) || 0) +
            (parseFloat(row.FaltaMateriaInsumos) || 0) +
            (parseFloat(row.CambioMolde) || 0) +
            (parseFloat(row.Calentamiento) || 0) +
            (parseFloat(row.ParoArranqueNoProgramado) || 0) +
            (parseFloat(row.ArranqueEstabilizacion) || 0);

        return horas - tiempoNoDisponible;
    }

    calcularTiempoProductivo(row) {

        const disponible = parseFloat(row.TiempoDisponible) || 0;

        const tiempoNoProductivo =
            (parseFloat(row.MttoCorrectivos) || 0) +
            (parseFloat(row.FallaElectrica) || 0) +
            (parseFloat(row.Servicios) || 0) +
            (parseFloat(row.CambioMoldeSetupExcesos) || 0) +
            (parseFloat(row.Herramental) || 0) +
            (parseFloat(row.FallaOperacion) || 0) +
            (parseFloat(row.LimpiezaTanque) || 0) +
            (parseFloat(row.FaltaMaterial) || 0) +
            (parseFloat(row.FaltaPersonal) || 0) +
            (parseFloat(row.FaltaRefacciones) || 0);

        return disponible - tiempoNoProductivo;
    }

    agregarFila(params) {

        const nuevaFila = {

            id: Date.now(),

            // ========================================
            // GENERALES
            // ========================================

            Mes: null,
            Fecha: null,
            Linea: null,
            Producto: null,
            Turno: null,
            TRIP: null,

            // ========================================
            // PRODUCCIÓN
            // ========================================

            PesoMinimo: 3,
            TRFabricados: null,
            ProduccionNetaReal: null,
            PesoEstandar: 0,
            PorcentajeSobrepeso: 0,
            TotalScrapKg: null,
            PorcentajeScrap: 0,

            // ========================================
            // DISPONIBILIDAD
            // ========================================

            HorasProgramadas: null,

            // ========================================
            // TIEMPO NO DISPONIBLE
            // ========================================

            MantenimientoPreventivo: null,
            ControlInventarios: null,
            FaltaMateriaInsumos: null,
            CambioMolde: null,
            Calentamiento: null,
            ParoArranqueNoProgramado: null,
            ArranqueEstabilizacion: null,

            // ========================================
            // TIEMPO NO PRODUCTIVO
            // ========================================

            MttoCorrectivos: null,
            FallaElectrica: null,
            Servicios: null,
            CambioMoldeSetupExcesos: null,
            Herramental: null,
            FallaOperacion: null,
            LimpiezaTanque: null,
            FaltaMaterial: null,
            FaltaPersonal: null,
            FaltaRefacciones: null,

            // ========================================
            // KPIS
            // ========================================

            TiempoDisponible: 0,
            TiempoProductivo: 0
        };

        this.gridApi.applyTransaction({
            add: [nuevaFila],
            addIndex: params.node.rowIndex + 1
        });

        this.recalcularTotales();

    }

    copiarFilaAnterior(params) {

        const filaActual = params.node.data;

        const nuevaFila = {

            id: Date.now(),
            ID_REGISTRO: null,

            // ========================================
            // GENERALES
            // ========================================

            Mes: filaActual.Mes,
            Fecha: filaActual.Fecha,
            Linea: filaActual.Linea,
            Producto: filaActual.Producto,
            Turno: filaActual.Turno,
            TRIP: filaActual.TRIP,

            // ========================================
            // PRODUCCIÓN
            // ========================================

            PesoMinimo: filaActual.PesoMinimo || 3,
            TRFabricados: filaActual.TRFabricados,
            ProduccionNetaReal: filaActual.ProduccionNetaReal,
            TotalScrapKg: filaActual.TotalScrapKg,

            // ========================================
            // DISPONIBILIDAD
            // ========================================

            HorasProgramadas: filaActual.HorasProgramadas,

            // ========================================
            // TIEMPO NO DISPONIBLE
            // ========================================

            MantenimientoPreventivo: filaActual.MantenimientoPreventivo,
            ControlInventarios: filaActual.ControlInventarios,
            FaltaMateriaInsumos: filaActual.FaltaMateriaInsumos,
            CambioMolde: filaActual.CambioMolde,
            Calentamiento: filaActual.Calentamiento,
            ParoArranqueNoProgramado: filaActual.ParoArranqueNoProgramado,
            ArranqueEstabilizacion: filaActual.ArranqueEstabilizacion,

            // ========================================
            // TIEMPO NO PRODUCTIVO
            // ========================================

            MttoCorrectivos: filaActual.MttoCorrectivos,
            FallaElectrica: filaActual.FallaElectrica,
            Servicios: filaActual.Servicios,
            CambioMoldeSetupExcesos: filaActual.CambioMoldeSetupExcesos,
            Herramental: filaActual.Herramental,
            FallaOperacion: filaActual.FallaOperacion,
            LimpiezaTanque: filaActual.LimpiezaTanque,
            FaltaMaterial: filaActual.FaltaMaterial,
            FaltaPersonal: filaActual.FaltaPersonal,
            FaltaRefacciones: filaActual.FaltaRefacciones
        };

        // ========================================
        // RECALCULAR FORMULAS
        // ========================================

        nuevaFila.PesoEstandar =
            this.calcularPesoEstandar(nuevaFila);

        nuevaFila.PorcentajeSobrepeso =
            this.calcularSobrepeso(nuevaFila);

        nuevaFila.PorcentajeScrap =
            this.calcularScrap(nuevaFila);

        nuevaFila.TiempoDisponible =
            this.calcularTiempoDisponible(nuevaFila);

        nuevaFila.TiempoProductivo =
            this.calcularTiempoProductivo(nuevaFila);

        this.gridApi.applyTransaction({
            add: [nuevaFila],
            addIndex: params.node.rowIndex + 1
        });

        this.recalcularTotales();

    }

    eliminarFila(params) {

        if (params.node.data.id === 'TOTALES') return;

        // 🔥 No permitir eliminar si tiene ID
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
    }

    configurarMenuContextual() {

        const menu = document.getElementById("menuContextual");

        document.querySelector('#tablaProduccion')
            .addEventListener("contextmenu", (e) => {

                e.preventDefault();

                menu.style.display = "block";
                menu.style.left = e.pageX + "px";
                menu.style.top = e.pageY + "px";

                const cell = this.gridApi.getCellRanges()?.[0];
                const rowIndex = this.gridApi.getFocusedCell()?.rowIndex
                    ?? this.gridApi.getDisplayedRowCount() - 1;

                this.filaSeleccionada =
                    this.gridApi.getDisplayedRowAtIndex(rowIndex);

                if (this.filaSeleccionada?.data?.id === 'TOTALES') {
                    menu.style.display = "none";
                    return;
                }

                const eliminar = menu.querySelector('[data-action="eliminar"]');

                // 🔥 Ocultar eliminar si tiene ID
                if (this.filaSeleccionada?.data?.ID_REGISTRO) {
                    eliminar.style.display = "none";
                } else {
                    eliminar.style.display = "block";
                }

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

    async cargarLineas() {

        try {

            const lineas = await EquiposUtil.obtenerLineas(this.datos_usuario[0].PLANTA,null,1);

            this.listaLineas = lineas;

        } catch (error) {

            console.error(error);

        }

    }

    getColumnaNumerica(cellClass = '') {
        return {
            editable: true,
            cellEditor: 'agNumberCellEditor',
            cellClass: cellClass,
            valueParser: params => {
                if (params.newValue === null || params.newValue === undefined || params.newValue === '')
                    return null;

                const valor = GlobalUtil.darFormatoNum(params.newValue);
                return valor === '' ? null : Number(valor);
            },
            valueFormatter: params => this.formatearNumero(params.value)
        };
    }

    formatearRangoFechas(fechaInicio, fechaFin) {

        const inicio = DateUtils.formatearFechaTexto(fechaInicio, false);
        const fin = DateUtils.formatearFechaTexto(fechaFin, true);

        return `Del ${inicio} al ${fin}`;
    }

    formatearPorcentaje(valor) {

        if (valor === null || valor === undefined || valor === '') {
            return '';
        }

        return `${parseFloat(valor).toFixed(2)}%`;
    }

    calcularPesoEstandar(row) {

        const pesoMinimo = parseFloat(row.PesoMinimo) || 0;
        const trFabricados = parseFloat(row.TRFabricados) || 0;

        return pesoMinimo * trFabricados;
    }

    calcularSobrepeso(row) {

        const produccionReal = parseFloat(row.ProduccionNetaReal) || 0;
        const pesoEstandar = parseFloat(row.PesoEstandar) || 0;

        if (pesoEstandar <= 0) {
            return 0;
        }

        return ((produccionReal / pesoEstandar) - 1) * 100;
    }

    calcularScrap(row) {

        const scrap = parseFloat(row.TotalScrapKg) || 0;
        const produccion = parseFloat(row.ProduccionNetaReal) || 0;

        const total = produccion + scrap;

        if (total <= 0) {
            return 0;
        }

        return (scrap / total) * 100;
    }
}

// ========================================
// GESTOR DE EVENTOS
// ========================================
class GestionEventosPVC {
    constructor() {
        this.URLBase = "Produccion";
        this.datos_usuario = GlobalUtil.getDatosUsuario();
        this.appProduccion = new GestionProduccionPVC(this.datos_usuario, this.URLBase);
    }

    inicializar() {
        // Inicializar UI
        UIManager.inicializarUI();

        // Inicializar la aplicación principal
        this.appProduccion.inicializar();

        console.log('✅ Sistema Completo PVC inicializado');
    }
}

// ========================================
// INICIALIZACIÓN
// ========================================
$(document).ready(function () {
    const app = new GestionEventosPVC();
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
                    110
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

                this.eDropdown.innerHTML = '';

                this.params.stopEditing(); // 🔥 cerrar editor automáticamente

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
// EXPORTADOR EXCEL PARA PVC
// ========================================
class ExcelExporterPVC {
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
            const worksheet = workbook.addWorksheet('Causas Tiempos Muertos PVC');

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
            const nombreArchivo = `Produccion_PVC_${fecha}.xlsx`;

            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = nombreArchivo;
            link.click();

            URL.revokeObjectURL(link.href);

            console.log('✅ Excel PVC exportado correctamente');
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

                    // ========================================
                    // CALCULAR MES SI VIENE VACÍO
                    // ========================================

                    if (
                        col.field === 'Mes' &&
                        (!valor || valor === '')
                    ) {

                        if (node.data.Fecha) {

                            valor = [
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
                            ][new Date(node.data.Fecha).getMonth()];
                        }

                    }

                    if (valor !== null && valor !== undefined && valor !== '' &&
                        ![
                            'Mes',
                            'Fecha',
                            'Producto',
                            'TRIP',
                            'Linea',
                            'Turno'
                        ].includes(col.field)) {
                        valor = parseFloat(valor);
                    }

                    if (node.data.id === 'TOTALES' &&
                        ![
                            'Mes',
                            'Fecha',
                            'Producto',
                            'TRIP',
                            'Linea',
                            'Turno'
                        ].includes(col.field)) {
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

                // ========================================
                // DATOS GENERALES
                // ========================================

                if (grupo.nombre === 'DATOS GENERALES') {

                    colorFondo = 'B4A7D6';
                    colorTexto = '000000';

                }

                // ========================================
                // PRODUCCIÓN
                // ========================================

                else if (grupo.nombre === 'PRODUCCIÓN') {

                    colorFondo = 'F1C232';
                    colorTexto = '000000';

                }

                // ========================================
                // DISPONIBILIDAD
                // ========================================

                else if (grupo.nombre === 'DISPONIBILIDAD') {

                    colorFondo = '0058A1';
                    colorTexto = 'FFFFFF';

                }

                // ========================================
                // TIEMPO NO DISPONIBLE
                // ========================================

                else if (grupo.nombre === 'TIEMPO NO DISPONIBLE') {

                    colorFondo = 'FF69B4';
                    colorTexto = 'FFFFFF';

                }

                // ========================================
                // TIEMPO NO PRODUCTIVO
                // ========================================

                else if (grupo.nombre === 'TIEMPO NO PRODUCTIVO') {

                    colorFondo = '90EE90';
                    colorTexto = '333333';

                }

                // ========================================
                // KPIS
                // ========================================

                else if (grupo.nombre === 'KPIS') {

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

                        if (!['Fecha', 'Linea', 'Producto', 'Turno', 'TRIP'].includes(col.field)) {
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

            // ========================================
            // GENERALES
            // ========================================

            'celda-azul': 'FFCFE2FF',

            // ========================================
            // PRODUCCIÓN
            // ========================================

            'celda-amarilla': 'FFFFF000',

            'celda-blanca': 'FFFFFFFF',

            'celda-verde-formula': 'FFD9EAD3',

            // ========================================
            // DISPONIBILIDAD
            // ========================================

            'celda-gris': 'FFD9D9D9',

            // ========================================
            // TIEMPO NO DISPONIBLE
            // ========================================

            'celda-rosa': 'FFF8D7DA',

            // ========================================
            // TIEMPO NO PRODUCTIVO
            // ========================================

            'celda-verde-claro': 'FFD4EDDA',

            // ========================================
            // KPIS
            // ========================================

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

                    // ========================================
                    // GENERALES
                    // ========================================

                    if (col.field === 'Mes') {
                        ancho = 12;
                    }

                    else if (col.field === 'Fecha') {
                        ancho = 14;
                    }

                    else if (
                        col.field === 'Linea' ||
                        col.field === 'Turno' ||
                        col.field === 'TRIP'
                    ) {
                        ancho = 10;
                    }

                    else if (col.field === 'Producto') {
                        ancho = 18;
                    }

                    // ========================================
                    // PRODUCCIÓN
                    // ========================================

                    else if (
                        col.field === 'PesoMinimo' ||
                        col.field === 'TRFabricados' ||
                        col.field === 'PesoEstandar' ||
                        col.field === 'PorcentajeSobrepeso' ||
                        col.field === 'TotalScrapKg' ||
                        col.field === 'PorcentajeScrap'
                    ) {
                        ancho = 16;
                    }

                    else if (col.field === 'ProduccionNetaReal') {
                        ancho = 20;
                    }

                    // ========================================
                    // DISPONIBILIDAD
                    // ========================================

                    else if (col.field === 'HorasProgramadas') {
                        ancho = 18;
                    }

                    // ========================================
                    // TIEMPOS
                    // ========================================

                    else if (
                        col.field === 'FaltaMateriaInsumos' ||
                        col.field === 'ParoArranqueNoProgramado' ||
                        col.field === 'CambioMoldeSetupExcesos' ||
                        col.field === 'ArranqueEstabilizacion'
                    ) {
                        ancho = 24;
                    }

                    else if (col.headerName && col.headerName.length > 20) {
                        ancho = 20;
                    }

                    worksheet.getColumn(colIdx).width = ancho;
                });
            }
        });

    }
}