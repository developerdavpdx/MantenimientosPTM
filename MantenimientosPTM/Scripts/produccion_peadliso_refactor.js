// ========================================
// GESTOR DE UI
// ========================================
class UIManager {
    static inicializarUI() {
        $("#ProduccionContainer").addClass("selected");
        $("#ProduccionContainer a").addClass("whiteText");
        $("#produccion-collapse").addClass("show");
        $("#RegistroProduccionPLURL").addClass("selected-item");
        $('body').css('overflow', 'hidden');
        $(".main-container").css('padding-top', '10px');
        $(".filtros-panel").css('padding-top', '0px');
        $(".filtros-panel").css('padding-bottom', '0px');
        // ========================================
        // COLAPSO PANEL FILTROS
        // ========================================
        const elColapso = document.getElementById('colapseFiltros');
        const btnColapso = document.getElementById('btnColapsoFiltros');

        elColapso.addEventListener('hide.bs.collapse', () => {
            btnColapso.classList.add('colapsado');
            document.getElementById('iconoColapsoFiltros')
                .classList.replace('bi-dash-square-fill', 'bi-plus-square-fill');
            $(".filtros-panel").css('padding-top', '0px');
            $(".filtros-panel").css('padding-bottom', '0px');
            $("#colapse-title").css("visibility", "visible");
        });

        elColapso.addEventListener('show.bs.collapse', () => {
            btnColapso.classList.remove('colapsado');
            document.getElementById('iconoColapsoFiltros')
                .classList.replace('bi-plus-square-fill', 'bi-dash-square-fill');
            $(".filtros-panel").css('padding', '0.1rem 1.4rem');
            $(".filtros-panel").css('padding-bottom', '8px');
            $("#colapse-title").css("visibility", "hidden");
        });

        UIManager.ajustarAlturaCard();

        console.log('✅ UI PVC inicializada');
    }

    static ajustarAlturaCard() {
        const $card = $(".card").first();
        const $footer = $("footer");

        if ($card.length === 0) return;

        const calcularAltura = () => {
            const offsetCard = $card.offset().top;
            const alturaVentana = $(window).height();

            // Si hay footer visible, restamos su altura + margen
            const alturaFooter = $footer.length > 0 ? $footer.outerHeight(true) : 0;

            const nuevaAltura = alturaVentana - offsetCard - alturaFooter - 8; // 12px de margen
            $card.css("height", nuevaAltura + "px");
        };

        // Calcular al cargar
        calcularAltura();

        // Recalcular al cambiar tamaño de ventana
        $(window).off("resize.card").on("resize.card", calcularAltura);
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
        this.URLBaseMantenimientosPreventivos = "MantenimientosPreventivos";
        this.ID_AREA_CORRECTIVOS = (datos_usuario[0].PLANTA == "1" ? 9 : 14); // 🔥 PEAD LISO
        this.ID_AREA_PREVENTIVOS = (datos_usuario[0].PLANTA == "1" ? 9 : 14); // 🔥 PEAD LISO
    }

    async inicializar() {
        await this.inicializarCommon();

        this.correosManager = new CorreosManagerPeadLiso();
        this.correosManager.setAppProduccion(this);
        this.correosManager.inicializar();
        EquiposUtil.llenarLineas(
            this.datos_usuario[0].PLANTA,
            (this.datos_usuario[0].PLANTA == "1" ? 9 : 9), // 🔥 PEAD LISO REVISAR PLANTA 2
            null,
            "FiltroLinea",
            null,
            null,
            false
        );
        // 🔥 CONSULTAR DATOS (firma actualizada con 5 params, igual que PVC)
        this.consultarDatos(null, null, this.datos_usuario[0].PLANTA, null, null, null);
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
            TiempoProductivo: 0,
            // 🔥 RENDIMIENTO Y OEE
            DisponibilidadPorcentaje: 0,
            KgPorTiempoDisponible: 0,
            KgHrLinea: null,
            KgHrProducto: null,
            KgNetosHrReales: 0,
            PorcentajeRendimiento: 0,
            PorcentajeCalidad: 0,
            PorcentajeOEE: 0,
            PorcentajeEficienciaProducto: 0,
            ObjetivoEficiencia: 91,
            EficienciaOperativa: 0
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

                TiempoProductivo: null,
                // 🔥 RENDIMIENTO Y OEE
                DisponibilidadPorcentaje: 0,
                KgPorTiempoDisponible: 0,
                KgHrLinea: null,
                KgHrProducto: null,
                KgNetosHrReales: 0,
                PorcentajeRendimiento: 0,
                PorcentajeCalidad: 0,
                PorcentajeOEE: 0,
                PorcentajeEficienciaProducto: 0,
                ObjetivoEficiencia: 91,
                EficienciaOperativa: 0
            }

        ];

        this.inicializarGrid();

        setTimeout(() => {

            $('#cardsPlaneacionGrid').html('');
            $("#tablaProduccion").removeClass("d-none");

        }, 1000);

    }

    async consultarDatos(fechaInicio, fechaFin, FitroPlanta, FiltroTurno, FiltroLinea, filtroProducto) {

        try {
            GlobalUtil.mostrarLoader(true);
            $("#tablaProduccion").addClass("d-none");

            const response = await $.ajax({
                url: `/${this.URLBase}/GetTiemposMuertosPeadLiso`,
                type: "GET",
                data: {
                    FiltroFechaInicio: fechaInicio,
                    FiltroFechaFin: fechaFin,
                    FiltroLinea: FiltroLinea,
                    FiltroPlanta: FitroPlanta,
                    FiltroTurno: FiltroTurno || '',        // 🔥 NUEVO
                    FiltroProducto: filtroProducto || ''   // 🔥 NUEVO
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

            // 🔥 Correctivos se agregan ANTES de pintar totales
            const seAgregaronCorrectivos = await this.traerCorrectivosCerrados(fechaInicio, fechaFin, FiltroLinea);

            // 🔥 Preventivos se agregan también
            const seAgregaronPreventivos = await this.traerPreventivosCerrados(fechaInicio, fechaFin, FiltroLinea);

            // ✅ Productos terminados se agregan también (turno actual si no hay fecha, mismo patrón que PVC)
            const productosTerminados = await this.ObtenerProductoTerminado(null, null, FiltroTurno, 'PPEADLISO');
            const seAgregaronProductosTerminados = await this.agregarProductosTerminadosAlGrid(productosTerminados, FiltroTurno, false);

            // 🔥 Si no hay datos originales, correctivos, preventivos NI productos terminados, mostramos placeholder
            if (!hayDatosOriginales && !seAgregaronCorrectivos && !seAgregaronPreventivos && !seAgregaronProductosTerminados) {
                this.gridApi.setRowData(this.datosOriginales);
            }

            // 🔥 AHORA sí, una sola vez, al final de todo
            this.agregarFilaTotales();

        } catch (error) {
            console.error(error);
            AlertManager.mostrar("Error al consultar datos", "danger");
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
                OTMC: item.OTMC,
                OTMP: item.OTMP,
                ID_PRODUCTO_TERMINADO: item.ID_PRODUCTO_TERMINADO,

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

                TiempoProductivo: item.TIEMPO_PRODUCTIVO,
                // 🔥 RENDIMIENTO Y OEE
                KgHrLinea: item.KG_HR_LINEA,
                KgHrProducto: item.KG_HR_PRODUCTO,
                ObjetivoEficiencia: item.OBJETIVO_EFICIENCIA ?? 91,
                DisponibilidadPorcentaje: item.DISPONIBILIDAD_PORCENTAJE,
                KgPorTiempoDisponible: item.KG_POR_TIEMPO_DISPONIBLE,
                KgNetosHrReales: item.KG_NETOS_HR_REALES,
                PorcentajeRendimiento: item.PORCENTAJE_RENDIMIENTO,
                PorcentajeCalidad: item.PORCENTAJE_CALIDAD,
                PorcentajeOEE: item.PORCENTAJE_OEE,
                PorcentajeEficienciaProducto: item.PORCENTAJE_EFICIENCIA_PRODUCTO,
                EficienciaOperativa: item.EFICIENCIA_OPERATIVA,

                // ✅ NUEVO: Identificar origen de datos de BD
                ...(item.OTMC && item.OTMC.toString().trim() !== '' ? {
                    _origen: 'CORRECTIVO',
                    _marcador: '🔧',
                    _rowClass: 'row-correctivo'
                } : item.OTMP && item.OTMP.toString().trim() !== '' ? {
                    _origen: 'PREVENTIVO',
                    _marcador: '🛠️',
                    _rowClass: 'row-preventivo'
                } : item.ID_PRODUCTO_TERMINADO && item.ID_PRODUCTO_TERMINADO.toString().trim() !== '' ? {
                    _origen: 'PRODUCTO_TERMINADO',
                    _marcador: '📦',
                    _rowClass: 'row-producto-terminado'
                } : {})

            }));

            this.gridApi.setRowData(datosFormateados);
            this.inicializarTooltipsGrid(); // 🔥 AGREGAR ESTA LÍNEA
            return true;

        }

        this.gridApi.setRowData([]);
        return false;
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
            const tiempoCalculado = GlobalUtil.calcularDiferenciaHoras(item.HoraApertura, item.HoraCierreMan) || 0;

            //Condiciona si es de herramental pinta el tiempo muerto en herramental
            if (item.AreaTecnica === 'MANTENIMIENTO HERRAMENTALES') {
                nuevaFila.TiempoMuertoHerramentales = tiempoCalculado;
            } else {
                nuevaFila.TiempoMuertoCorrectivos = tiempoCalculado;
            }

            // ✅ NUEVO: Marcar como correctivo
            nuevaFila._origen = 'CORRECTIVO';
            nuevaFila._marcador = '🔧';
            nuevaFila._rowClass = 'row-correctivo';

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
        this.inicializarTooltipsGrid();

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

    // ========================================
    // 🔥 NUEVO: Traer preventivos cerrados y agregarlos al grid
    // ========================================

    async traerPreventivosCerrados(fechaInicio, fechaFin, linea) {

        try {

            GlobalUtil.mostrarLoader(true);

            const response = await $.ajax({
                url: `/${this.URLBaseMantenimientosPreventivos}/GetMantenimientosPorRango`,
                type: "POST",
                data: {
                    draw: 1,
                    length: 999999,
                    start: 0,
                    "search[value]": "",
                    FiltroFechaInicio: fechaInicio,
                    FiltroFechaFin: fechaFin,
                    FiltroArea: this.ID_AREA_PREVENTIVOS,
                    FiltroLinea: linea || "",
                    FiltroOrdenTrabajo: "",
                    FiltroPeriodicidad: "",
                    FiltroPlanta: this.datos_usuario[0].PLANTA,
                    FiltroEstatusOT: "4",
                    FiltroUsuario: "",
                    FiltroTipoUsuario: this.datos_usuario[0].TIPO_USUARIO,
                    FiltroExcluirSincronizadosPEADLISO: "S"  // 🔥 Excluir PEAD LISO
                }
            });

            const preventivos = response.data || [];

            if (preventivos.length === 0) {
                return false; // 🔥 nada que agregar
            }

            return this.agregarPreventivoAlGrid(preventivos); // 🔥 ahora retorna bool

        } catch (error) {

            console.error(error);
            AlertManager.mostrar("Error al consultar mantenimientos preventivos", "danger");
            return false;

        } finally {
            GlobalUtil.mostrarLoader(false);
        }
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
                        width: 150,
                        cellClass: 'celda-gris',
                        pinned: 'left',
                        // ✅ NUEVO: Renderer para mostrar emoji + mes + tooltip + punto pulsante
                        // En el cellRenderer del campo 'Mes' en inicializarGrid() de PEAD Liso
                        cellRenderer: params => {
                            if (!params.value || params.data?.id === 'TOTALES') {
                                return params.value || '';
                            }

                            const emoji = params.data?._marcador || '';
                            const origen = params.data?._origen;
                            const idRegistro = params.data?.ID_REGISTRO;

                            const tooltipTexts = {
                                'CORRECTIVO': 'Mantenimiento Correctivo',
                                'PREVENTIVO': 'Mantenimiento Preventivo',
                                'PRODUCTO_TERMINADO': 'Producto Terminado'
                            };

                            const tooltipText = tooltipTexts[origen] || '';
                            const tooltipAttr = tooltipText
                                ? `data-bs-toggle="tooltip" data-bs-title="${tooltipText}" title="${tooltipText}"`
                                : '';

                            const puntoPulsante = !idRegistro && (origen === 'CORRECTIVO' || origen === 'PREVENTIVO' || origen === 'PRODUCTO_TERMINADO')
                                ? `<span class="punto-pulso punto-pulso-margin-left"></span>`
                                : '';

                            // 🔥 IGUAL QUE PVC: sin emoji, devuelve solo el valor plano
                            return emoji
                                ? `<div style="display: flex; align-items: center; gap: 4px;"><span style="font-size: 16px; cursor: help;" ${tooltipAttr}>${emoji}</span><span>${params.value}</span>${puntoPulsante}</div>`
                                : params.value;
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
            },
            {
                headerName: 'RENDIMIENTO Y OEE',
                headerClass: 'header-grupo-verde-fuerte',
                children: [
                    { field: 'DisponibilidadPorcentaje', headerName: 'DISPONIBILIDAD %', editable: false, width: 130, cellClass: 'celda-verde-fuerte', valueFormatter: params => this.formatearPorcentaje(params.value) },
                    { field: 'KgPorTiempoDisponible', headerName: 'KG POR TIEMPO DISPONIBLE', editable: false, width: 150, cellClass: 'celda-verde-fuerte', valueFormatter: params => this.formatearNumero(params.value) },
                    { field: 'KgHrLinea', headerName: 'KG/HR X LINEA (capacidad instalada)', editable: false, width: 150, cellClass: 'celda-rosa', valueFormatter: params => this.formatearNumero(params.value) },
                    { field: 'KgHrProducto', headerName: 'KG/HR X PRODUCTO (historial)', editable: false, width: 150, cellClass: 'celda-rosa', valueFormatter: params => this.formatearNumero(params.value) },
                    { field: 'KgNetosHrReales', headerName: 'KG NETOS/HR REALES (tiempo productivo)', editable: false, width: 150, cellClass: 'celda-verde-fuerte', valueFormatter: params => this.formatearNumero(params.value) },
                    { field: 'PorcentajeRendimiento', headerName: '% RENDIMIENTO', editable: false, width: 120, cellClass: 'celda-verde-fuerte', valueFormatter: params => this.formatearPorcentaje(params.value) },
                    { field: 'PorcentajeCalidad', headerName: '% CALIDAD', editable: false, width: 110, cellClass: 'celda-verde-fuerte', valueFormatter: params => this.formatearPorcentaje(params.value) },
                    { field: 'PorcentajeOEE', headerName: '% OEE', editable: false, width: 110, cellClass: 'celda-verde-fuerte', valueFormatter: params => this.formatearPorcentaje(params.value) },
                    { field: 'ObjetivoEficiencia', headerName: 'OBJETIVO DE EFICIENCIA %', width: 140, ...this.getColumnaNumerica('celda-amarilla') },
                    { field: 'EficienciaOperativa', headerName: 'EFICIENCIA OPERATIVA', editable: false, width: 130, cellClass: 'celda-verde-fuerte', valueFormatter: params => this.formatearPorcentaje(params.value) }
                ]
            }
        ];

        this.columnDefs = columnDefs;

        const gridOptions = {

            domLayout: 'normal',

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
                // CORRECTO
                editable: (params) => {
                    if (params.data?.id === 'TOTALES') return false;

                    const readonlyFields = [
                        'PesoMinimo',
                        'PesoEstandar',
                        'PorcentajeSobrepeso',
                        'PorcentajeTotalScrap',
                        'TiempoDisponible',
                        'TiempoProductivo',
                        'Mes'
                    ];

                    return !readonlyFields.includes(params.colDef.field);
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
                this.inicializarTooltipsGrid(); // 🔥 AGREGAR
                this.gridApi.sizeColumnsToFit();

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

            },
            getRowClass: params => {
                if (params.data?.id === 'TOTALES') return '';
                if (params.data?._rowClass) return params.data._rowClass;
                return '';
            }

        };

        new agGrid.Grid(gridDiv, gridOptions);
    }

    agregarPreventivoAlGrid(preventivos) {

        const otmpYaEnGrid = new Set();

        this.gridApi.forEachNode(node => {
            if (node.data?.OTMP) {
                otmpYaEnGrid.add(node.data.OTMP);
            }
        });

        const preventivosNuevos = preventivos.filter(
            item => !otmpYaEnGrid.has(item.NumeroOrden)
        );

        if (preventivosNuevos.length === 0) {
            return false;
        }

        const filasNuevas = [];
        const lineasNoEncontradas = [];

        preventivosNuevos.forEach(item => {

            const nuevaFila = this.crearFilaVacia();

            nuevaFila.id = this.generarIdTemporal();
            nuevaFila.OTMP = item.NumeroOrden;
            nuevaFila.Fecha = this.parsearFechaPreventivo(item.FechaInicioMantenimiento);
            nuevaFila.Preventivo = parseFloat(item.DuracionHrs) || 0;

            // ✅ NUEVO: Marcar como preventivo
            nuevaFila._origen = 'PREVENTIVO';
            nuevaFila._marcador = '🛠️';
            nuevaFila._rowClass = 'row-preventivo';

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
        this.inicializarTooltipsGrid();

        if (lineasNoEncontradas.length > 0) {
            AlertManager.mostrar(
                `Las siguientes órdenes no tienen línea reconocida y quedaron sin línea asignada: ${lineasNoEncontradas.join(', ')}`,
                "warning"
            );
        }

        return true;
    }

    // 🔥 Convierte fecha del preventivo
    // FechaInicioMantenimiento viene en formato "DD/MM/YYYY" desde el SP
    parsearFechaPreventivo(fechaTexto) {

        if (!fechaTexto) return null;

        try {
            // Si es un ISO date (YYYY-MM-DD o con T)
            if (fechaTexto.includes('-')) {
                const fecha = new Date(fechaTexto);
                if (isNaN(fecha.getTime())) return null;

                const ano = fecha.getFullYear();
                const mes = String(fecha.getMonth() + 1).padStart(2, '0');
                const dia = String(fecha.getDate()).padStart(2, '0');
                return `${ano}-${mes}-${dia}`;
            }

            // Si es formato DD/MM/YYYY
            const [dia, mes, anio] = fechaTexto.split('/');
            if (!dia || !mes || !anio) return null;

            return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`; // YYYY-MM-DD
        } catch (error) {
            console.error("Error al parsear fecha preventivo:", error);
            return null;
        }
    }

    // ========================================
    // 🔥 NUEVO: Obtener Producto Terminado
    // ========================================
    // ========================================
    // 🔥 NUEVO: Obtener Producto Terminado
    // ========================================
    async ObtenerProductoTerminado(FechaInicio, FechaFin, FiltroTurno, proceso) {

        try {

            GlobalUtil.mostrarLoader(true);

            const response = await $.ajax({
                url: `/${this.URLBase}/GetProductoTerminadoNewScale`,
                type: "GET",
                headers: {
                    "FechaInicio": FechaInicio,
                    "FechaFin": FechaFin,
                    "Planta": this.datos_usuario[0].PLANTA,
                    "Turno": FiltroTurno || null,
                    "Proceso": proceso || ""
                },
                dataType: 'json'
            });

            let productosTerminados = [];

            if (response && response.reportesProdTerm && Array.isArray(response.reportesProdTerm)) {
                productosTerminados = response.reportesProdTerm;
            } else if (response && response.Data) {
                if (typeof response.Data === 'string') {
                    productosTerminados = JSON.parse(response.Data);
                } else {
                    productosTerminados = response.Data;
                }
            } else if (Array.isArray(response)) {
                productosTerminados = response;
            }

            if (productosTerminados && productosTerminados.length > 0) {
                console.log("✅ Productos Terminados obtenidos:", productosTerminados.length);
                return productosTerminados;
            } else {
                console.warn("⚠️ No se obtuvieron productos terminados");
                return [];
            }

        } catch (error) {

            console.error("❌ Error al consultar productos terminados:", error);
            AlertManager.mostrar("Error al consultar productos terminados", "danger");
            return [];

        } finally {

            GlobalUtil.mostrarLoader(false);

        }
    }

    // ========================================
    // 🔥 NUEVO: Traer productos terminados y agregarlos al grid
    // ========================================
    async agregarProductosTerminadosAlGrid(productosTerminados, filtroTurno, showwarning = false) {
        try {
            if (!productosTerminados || productosTerminados.length === 0) {
                if (showwarning) {
                    AlertManager.mostrar(
                        `No se encontraron productos terminados para los filtros seleccionados del turno: ${filtroTurno || 'de acuerdo a la hora actual'}`,
                        "warning"
                    );
                }
                return false;
            }

            const nodosExistentes = new Map();
            this.gridApi.forEachNode(node => {
                if (node.data?.ID_PRODUCTO_TERMINADO) {
                    nodosExistentes.set(String(node.data.ID_PRODUCTO_TERMINADO), node);
                }
            });

            const filasNuevas = [];
            const filasActualizadas = [];
            const lineasNoEncontradas = [];
            let filasAgregadas = 0;

            const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
                'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

            productosTerminados.forEach(item => {
                // 🔥 CAMBIO: usar la fecha operativa del turno, no la fecha "de reloj"
                const fecha = this.calcularFechaOperativaTurno(item.FechaPesaje, item.Turno);

                if (!fecha) {
                    console.warn(`⚠️ Producto ${item.Codigo} tiene fecha inválida, será omitido`);
                    return;
                }

                if (parseFloat(item.NumTubos || 0) === 0 || parseFloat(item.PesoTotal || 0) === 0) {
                    console.warn(`⚠️ Producto ${item.Codigo} sin datos de producción, será omitido`);
                    return;
                }

                const lineaEncontrada = this.listaLineas.find(
                    l => String(l.value) === String(item.Id_Linea)
                );

                if (!lineaEncontrada) {
                    lineasNoEncontradas.push(`${item.Codigo} (Línea ${item.Id_Linea})`);
                }

                const nodoExistente = nodosExistentes.get(String(item.Id));

                if (nodoExistente) {
                    // 🔥 YA EXISTE: actualizar sin duplicar
                    const dataActualizada = { ...nodoExistente.data };

                    dataActualizada.Fecha = fecha;
                    dataActualizada.Producto = item.Codigo || '';
                    dataActualizada.Turno = String(item.Turno || '');
                    dataActualizada.TRLiberados = parseFloat(item.NumTubos) || 0;
                    dataActualizada.ProduccionNeta = parseFloat(item.PesoTotal) || 0;
                    dataActualizada.PorcentajeTotalScrap = 0;
                    dataActualizada.TotalScrap = parseFloat(item.ScrapTotal) || 0;
                    dataActualizada.Linea = lineaEncontrada ? lineaEncontrada.label : null;
                    dataActualizada.Mes = meses[new Date(fecha + 'T00:00:00').getMonth()];

                    dataActualizada.PesoMinimo = parseFloat(item.PesoMinimo) || 0;
                    dataActualizada.KgHrLinea = parseFloat(item.KgsDia) || 0;
                    dataActualizada.KgHrProducto = parseFloat(item.KgsDia) || 0;

                    dataActualizada._origen = 'PRODUCTO_TERMINADO';
                    dataActualizada._marcador = '📦';
                    dataActualizada._rowClass = 'row-producto-terminado';

                    this.recalcularFila(dataActualizada);
                    filasActualizadas.push(dataActualizada);

                } else {
                    // 🔥 NO EXISTE: crear fila nueva
                    const nuevaFila = this.crearFilaVacia();

                    nuevaFila.ID_PRODUCTO_TERMINADO = item.Id;
                    nuevaFila.id = this.generarIdTemporal();
                    nuevaFila.Fecha = fecha;
                    nuevaFila.Producto = item.Codigo || '';
                    nuevaFila.Turno = String(item.Turno || '');
                    nuevaFila.TRLiberados = parseFloat(item.NumTubos) || 0;
                    nuevaFila.ProduccionNeta = parseFloat(item.PesoTotal) || 0;
                    nuevaFila.PorcentajeTotalScrap = 0;
                    nuevaFila.TotalScrap = parseFloat(item.ScrapTotal) || 0;
                    nuevaFila.Linea = lineaEncontrada ? lineaEncontrada.label : null;
                    nuevaFila.Mes = meses[new Date(fecha + 'T00:00:00').getMonth()];

                    nuevaFila.PesoMinimo = parseFloat(item.PesoMinimo) || 0;
                    nuevaFila.KgHrLinea = parseFloat(item.KgsDia) || 0;
                    nuevaFila.KgHrProducto = parseFloat(item.KgsDia) || 0;

                    nuevaFila._origen = 'PRODUCTO_TERMINADO';
                    nuevaFila._marcador = '📦';
                    nuevaFila._rowClass = 'row-producto-terminado';

                    this.recalcularFila(nuevaFila);
                    filasNuevas.push(nuevaFila);
                    filasAgregadas++;
                }
            });

            if (filasActualizadas.length > 0) {
                this.gridApi.applyTransaction({ update: filasActualizadas });
                console.log(`🔄 Se actualizaron ${filasActualizadas.length} productos terminados`);

                AlertManager.mostrar(
                    `🔄 Se actualizaron ${filasActualizadas.length} registro(s) existente(s) del turno: ${filtroTurno || 'de acuerdo a la hora actual'} con información reciente`,
                    "info"
                );
            }

            if (filasNuevas.length > 0) {
                this.gridApi.applyTransaction({ add: filasNuevas });
                console.log(`✅ Se agregaron ${filasNuevas.length} productos terminados`);

                AlertManager.mostrar(
                    `✅ Se agregaron ${filasNuevas.length} productos terminados al grid del turno: ${filtroTurno || 'de acuerdo a la hora actual'}`,
                    "info"
                );

                this.inicializarTooltipsGrid();
            }

            if (lineasNoEncontradas.length > 0) {
                AlertManager.mostrar(
                    `⚠️ Estos productos no tienen línea reconocida: ${lineasNoEncontradas.join(', ')}`,
                    "warning"
                );
            }

            // 🔥 Reponer la fila de totales al final, recalculada
            this.agregarFilaTotales();

            return filasAgregadas > 0 || filasActualizadas.length > 0;

        } catch (error) {
            console.error("Error al agregar productos terminados:", error);
            return false;
        }
    }

    // ✅ Convertir fecha del producto terminado (ISO format)
    parsearFechaProductoTerminado(fechaISO) {

        if (!fechaISO) return null;

        try {
            // fechaISO viene como: "2026-07-23T13:53:08.467"
            const fecha = new Date(fechaISO);

            // ✅ VALIDAR: Rechazar fechas inválidas (1900-01-01)
            if (isNaN(fecha.getTime())) return null;

            // Rechazar si es fecha default (1900)
            if (fecha.getFullYear() < 2000) {
                console.warn(`⚠️ Fecha inválida detectada: ${fechaISO}`);
                return null;
            }

            // Retornar en formato YYYY-MM-DD para que el grid lo entienda
            const ano = fecha.getFullYear();
            const mes = String(fecha.getMonth() + 1).padStart(2, '0');
            const dia = String(fecha.getDate()).padStart(2, '0');

            return `${ano}-${mes}-${dia}`;

        } catch (error) {
            console.error("Error al parsear fecha:", error);
            return null;
        }
    }

    // 🔥 NUEVO: Ajusta la fecha "de reloj" a la fecha "operativa del turno"
    // Turno 2 corre de 4:30pm a 4:30am del día siguiente.
    // Si el registro cae en la madrugada (00:00 - 4:30am) y es turno 2,
    // operativamente pertenece al día ANTERIOR (el día en que arrancó el turno).
    calcularFechaOperativaTurno(fechaISOConHora, turno) {

        if (!fechaISOConHora) return null;

        try {
            const fecha = new Date(fechaISOConHora);
            if (isNaN(fecha.getTime())) return null;

            const hora = fecha.getHours();
            const minutos = fecha.getMinutes();

            const esMadrugada =
                hora < 4 || (hora === 4 && minutos <= 30);

            if (String(turno) === '2' && esMadrugada) {
                fecha.setDate(fecha.getDate() - 1);
            }

            const ano = fecha.getFullYear();
            const mes = String(fecha.getMonth() + 1).padStart(2, '0');
            const dia = String(fecha.getDate()).padStart(2, '0');

            return `${ano}-${mes}-${dia}`; // YYYY-MM-DD

        } catch (error) {
            console.error("Error al calcular fecha operativa del turno:", error);
            return null;
        }
    }

    // 🔥 Template de fila vacía, ajustado a los campos de Pead Liso
    crearFilaVacia() {
        return {
            id: null,
            ID_REGISTRO: null,
            OTMC: null,
            OTMP: null, // 🔥 NUEVO: Para preventivos
            ID_PRODUCTO_TERMINADO: null, // 🔥 NUEVO: Para productos terminados
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
            TiempoDisponible: 0, TiempoProductivo: 0,
            // 🔥 RENDIMIENTO Y OEE
            DisponibilidadPorcentaje: 0,
            KgPorTiempoDisponible: 0,
            KgHrLinea: null,
            KgHrProducto: null,
            KgNetosHrReales: 0,
            PorcentajeRendimiento: 0,
            PorcentajeCalidad: 0,
            PorcentajeOEE: 0,
            PorcentajeEficienciaProducto: 0,
            ObjetivoEficiencia: 91,
            EficienciaOperativa: 0
        };
    }

    inicializarTooltipsGrid() {
        // 🔥 Esperar a que el DOM se renderice antes de inicializar tooltips
        setTimeout(() => {
            const tooltipElements = document.querySelectorAll('[data-bs-toggle="tooltip"]');
            tooltipElements.forEach(el => {
                // Destruir tooltip anterior si existe
                const existingTooltip = bootstrap.Tooltip.getInstance(el);
                if (existingTooltip) existingTooltip.dispose();

                // Crear nuevo tooltip
                new bootstrap.Tooltip(el);
            });
        }, 100);
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

        // 🔥 RENDIMIENTO Y OEE
        row.KgPorTiempoDisponible = this.calcularKgPorTiempoDisponible(row);
        row.KgNetosHrReales = this.calcularKgNetosHrReales(row);
        row.PorcentajeRendimiento = this.calcularPorcentajeRendimiento(row);
        row.PorcentajeEficienciaProducto = row.PorcentajeRendimiento;
        row.PorcentajeCalidad = this.calcularPorcentajeCalidad(row);
        row.DisponibilidadPorcentaje = this.calcularDisponibilidadPorcentaje(row);
        row.PorcentajeOEE = this.calcularPorcentajeOEE(row);
        row.EficienciaOperativa = this.calcularEficienciaOperativa(row);

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

        // 🔥 Si ya existe una fila de TOTALES, la quitamos primero
        // para que siempre quede una sola, y al final de todo
        let filaTotalesVieja = null;

        this.gridApi.forEachNode(node => {
            if (node.data?.id === 'TOTALES') {
                filaTotalesVieja = node.data;
            }
        });

        if (filaTotalesVieja) {
            this.gridApi.applyTransaction({ remove: [filaTotalesVieja] });
        }

        const filaTotales = {
            id: 'TOTALES',
            Linea: 'TOTALES'
        };

        this.gridApi.applyTransaction({
            add: [filaTotales]
        });

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

            TiempoProductivo: 0,
            // 🔥 RENDIMIENTO Y OEE
            DisponibilidadPorcentaje: null,
            KgPorTiempoDisponible: 0,
            KgHrLinea: null,
            KgHrProducto: null,
            KgNetosHrReales: 0,
            PorcentajeRendimiento: null,
            PorcentajeCalidad: null,
            PorcentajeOEE: null,
            PorcentajeEficienciaProducto: null,
            ObjetivoEficiencia: 0,
            EficienciaOperativa: null

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

            totales.KgPorTiempoDisponible += Number(node.data.KgPorTiempoDisponible || 0);
            totales.KgNetosHrReales += Number(node.data.KgNetosHrReales || 0);
            totales.ObjetivoEficiencia += Number(node.data.ObjetivoEficiencia || 0);

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

        // 🔥 Disponibilidad % desde totales
        if (totales.TiempoDisponible > 0) {
            totales.DisponibilidadPorcentaje =
                (totales.TiempoProductivo / totales.TiempoDisponible) * 100;
        }

        // 🔥 Calidad % — usa ProduccionNeta y TotalScrap (PEAD Liso)
        const totalProdCalidad = totales.ProduccionNeta + totales.TotalScrap;
        if (totalProdCalidad > 0) {
            totales.PorcentajeCalidad =
                (totales.ProduccionNeta / totalProdCalidad) * 100;
        }

        return totales;

    }

    configurarEventos() {

        $("#btnGuardarCambios").on("click", () => {
            this.guardarCambios();
        });

        $('#btnExportarExcel').on('click', () => this.exportarExcel());

        $('#btnEnviarCorreo').on('click', () => {
            const modal = new bootstrap.Modal(document.getElementById('modalEnviarExcelCorreo'));
            modal.show();
        });

        $('#btnAplicarFiltros').on('click', async () => {
            const $btn = $('#btnAplicarFiltros');
            $btn.prop('disabled', true);

            try {
                const fechaInicio = $('#FiltroFechaInicio').val();
                const fechaFin = $('#FiltroFechaFin').val();
                const filtroTurno = $('#FiltroTurno').val();
                const filtroProducto = $('#FiltroProducto').val();
                const FiltroLinea = $('#FiltroLinea').val();

                await this.consultarDatos(fechaInicio, fechaFin, this.datos_usuario[0].PLANTA, filtroTurno, FiltroLinea, filtroProducto);
            } finally {
                $btn.prop('disabled', false);
            }
        });

        $('#btnAplicarFiltrosPT').on('click', async () => {
            const $btn = $('#btnAplicarFiltrosPT');
            $btn.prop('disabled', true);

            try {
                const fechaInicio = $('#FiltroFechaInicioPT').val();
                const fechaFin = $('#FiltroFechaFinPT').val();
                const filtroTurno = $('#FiltroTurnoPT').val();
                const productosTerminados = await this.ObtenerProductoTerminado(fechaInicio, fechaFin, filtroTurno, 'PPEADLISO');
                const seAgregaronProductosTerminados = await this.agregarProductosTerminadosAlGrid(productosTerminados, filtroTurno, true);

                // ✅ Siempre borrar fila vacía ANTES de agregar productos
                const filasVacias = [];
                this.gridApi.forEachNode(node => {
                    if (node.data &&
                        !node.data.ID_REGISTRO &&
                        !node.data.OTMC &&
                        !node.data.OTMP &&
                        !node.data.ID_PRODUCTO_TERMINADO &&
                        !node.data.Fecha &&
                        node.data.id !== 'TOTALES'
                    ) {
                        filasVacias.push(node.data);
                    }
                });
                if (seAgregaronProductosTerminados && filasVacias.length > 0) {
                    this.gridApi.applyTransaction({ remove: filasVacias });
                }

            } finally {
                $btn.prop('disabled', false);
            }
        });

        $("#btnLimpiarFiltros").on("click", () => {

            $("#FiltroFechaInicio").val("");
            $("#FiltroFechaFin").val("");
            $("#FiltroTurno").val("");
            $("#FiltroProducto").val("");
            $("#FiltroLinea").val("");

            this.consultarDatos(null, null, this.datos_usuario[0].PLANTA, null, null, null);

        });

        $('#FiltroFechaInicio, #FiltroFechaFin')
            .off('change')
            .on('change', () => {

                const fechaInicio = $('#FiltroFechaInicio').val();
                const fechaFin = $('#FiltroFechaFin').val();
                const FechaTexto = this.formatearRangoFechas(fechaInicio, fechaFin);
                $("#mesActual").text(FechaTexto);

                this.consultarDatos(fechaInicio, fechaFin, this.datos_usuario[0].PLANTA, null, null, null);

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
                OTMP: fila.OTMP ?? null,                        // 🔥 AGREGAR
                ID_PRODUCTO_TERMINADO: fila.ID_PRODUCTO_TERMINADO || null,  // 🔥 AGREGAR
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

                // 🔥 RENDIMIENTO Y OEE
                KG_HR_LINEA: redondear(fila.KgHrLinea || 0, 2),
                KG_HR_PRODUCTO: redondear(fila.KgHrProducto || 0, 2),
                OBJETIVO_EFICIENCIA: redondear(fila.ObjetivoEficiencia || 0, 2),
                DISPONIBILIDAD_PORCENTAJE: redondear(fila.DisponibilidadPorcentaje || 0, 2),
                KG_POR_TIEMPO_DISPONIBLE: redondear(fila.KgPorTiempoDisponible || 0, 2),
                KG_NETOS_HR_REALES: redondear(fila.KgNetosHrReales || 0, 2),
                PORCENTAJE_RENDIMIENTO: redondear(fila.PorcentajeRendimiento || 0, 2),
                PORCENTAJE_CALIDAD: redondear(fila.PorcentajeCalidad || 0, 2),
                PORCENTAJE_OEE: redondear(fila.PorcentajeOEE || 0, 2),
                PORCENTAJE_EFICIENCIA_PRODUCTO: redondear(fila.PorcentajeEficienciaProducto || 0, 2),
                EFICIENCIA_OPERATIVA: redondear(fila.EficienciaOperativa || 0, 2),

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
                this.consultarDatos(null, null, this.datos_usuario[0].PLANTA, null, null, null);

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

            const lineas = await EquiposUtil.obtenerLineas(this.datos_usuario[0].PLANTA, (this.datos_usuario[0].PLANTA == "1" ? 9 : 9), null); //REVISAR PARA PLANTA 2 QUE LINEAS

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

            TiempoProductivo: 0,
            // 🔥 RENDIMIENTO Y OEE
            DisponibilidadPorcentaje: 0,
            KgPorTiempoDisponible: 0,
            KgHrLinea: null,
            KgHrProducto: null,
            KgNetosHrReales: 0,
            PorcentajeRendimiento: 0,
            PorcentajeCalidad: 0,
            PorcentajeOEE: 0,
            PorcentajeEficienciaProducto: 0,
            ObjetivoEficiencia: 91,
            EficienciaOperativa: 0

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

    calcularKgPorTiempoDisponible(row) {
        const tiempoDisponible = parseFloat(row.TiempoDisponible) || 0;
        const kgHrProducto = parseFloat(row.KgHrProducto) || 0;
        return tiempoDisponible * kgHrProducto;
    }

    calcularKgNetosHrReales(row) {
        const tiempoProductivo = parseFloat(row.TiempoProductivo) || 0;
        if (tiempoProductivo <= 0) return 0;
        const produccion = parseFloat(row.ProduccionNeta) || 0;
        const scrap = parseFloat(row.TotalScrap) || 0;
        return (produccion + scrap) / tiempoProductivo;
    }

    calcularPorcentajeRendimiento(row) {
        const kgHrProducto = parseFloat(row.KgHrProducto) || 0;
        if (kgHrProducto <= 0) return 0;
        const kgNetosHrReales = parseFloat(row.KgNetosHrReales) || 0;
        return (kgNetosHrReales / kgHrProducto) * 100;
    }

    calcularPorcentajeCalidad(row) {
        const produccion = parseFloat(row.ProduccionNeta) || 0;
        const scrap = parseFloat(row.TotalScrap) || 0;
        const total = produccion + scrap;
        if (total <= 0) return 0;
        return (produccion / total) * 100;
    }

    calcularDisponibilidadPorcentaje(row) {
        const tiempoDisponible = parseFloat(row.TiempoDisponible) || 0;
        if (tiempoDisponible <= 0) return 0;
        const tiempoProductivo = parseFloat(row.TiempoProductivo) || 0;
        return (tiempoProductivo / tiempoDisponible) * 100;
    }

    calcularPorcentajeOEE(row) {
        const disponibilidad = (parseFloat(row.DisponibilidadPorcentaje) || 0) / 100;
        const rendimiento = (parseFloat(row.PorcentajeRendimiento) || 0) / 100;
        const calidad = (parseFloat(row.PorcentajeCalidad) || 0) / 100;
        return disponibilidad * rendimiento * calidad * 100;
    }

    calcularEficienciaOperativa(row) {
        const kgPorTiempoDisponible = parseFloat(row.KgPorTiempoDisponible) || 0;
        if (kgPorTiempoDisponible <= 0) return 0;
        const produccion = parseFloat(row.ProduccionNeta) || 0;
        return (produccion / kgPorTiempoDisponible) * 100;
    }
}

class ArticuloAutocompleteEditor {

    constructor() {
        this.articuloSeleccionado = null;
    }

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

        this.appProduccion = params.context.appProduccion;

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
        const anchoDropdown = Math.max(rect.width, 450);
        const altoDropdown = 280;

        let left = rect.left;
        if (left + anchoDropdown > window.innerWidth) {
            left = window.innerWidth - anchoDropdown - 10;
        }

        const espacioAbajo = window.innerHeight - rect.bottom;
        const cabeAbajo = espacioAbajo >= altoDropdown;

        if (cabeAbajo) {
            this.eDropdown.style.top = rect.bottom + 'px';
        } else {
            const topArriba = rect.top - altoDropdown;
            this.eDropdown.style.top = Math.max(topArriba, 10) + 'px';
        }

        this.eDropdown.style.left = left + 'px';
        this.eDropdown.style.width = anchoDropdown + 'px';

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

                row.PesoMinimo = parseFloat(articulo.PesoMinimo) || 0;

                row.DescripcionArticulo = articulo.DescripcionArticulo;

                row.KgHrProducto = parseFloat(articulo.KgsDia) / 24 || 0;

                row.KgHrLinea = parseFloat(articulo.KgsDia) / 24 || 0;

                const app = this.params.context.appProduccion;

                app.recalcularFila(row);

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
    getTextFields() { return ['Mes', 'Fecha', 'Linea', 'Producto', 'Turno', 'Grupo']; }

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