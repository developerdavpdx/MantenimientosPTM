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

// ========================================
// GESTOR DE UI
// ========================================
class UIManager {
    static inicializarUI() {
        $("#ProduccionContainer").addClass("selected");
        $("#ProduccionContainer a").addClass("whiteText");
        $("#produccion-collapse").addClass("show");
        $("#RegistroProduccionPVCURL").addClass("selected-item");
        $('body').css('overflow', 'hidden');
        $(".main-container").css('padding-top', '40px');
        console.log('✅ UI PVC inicializada');
    }
}

// ========================================
// APLICACIÓN PRINCIPAL - GESTIÓN PVC
// ========================================
class GestionProduccionPVC extends GestionProduccionBase {
    constructor(datos_usuario, URLBase) {
        super(datos_usuario, URLBase, 110);
        this.URLBaseMantenimientosCorrectivos = "MantenimientosCorrectivos";
        this.URLBaseMantenimientosPreventivos = "MantenimientosPreventivos";
        this.ID_AREA_CORRECTIVOS = (datos_usuario[0].PLANTA == "1" ? 1 : 14); // 🔥 PVC
        this.ID_AREA_PREVENTIVOS = (datos_usuario[0].PLANTA == "1" ? 1 : 14); // 🔥 PVC
    }

    async inicializar() {
        await this.inicializarCommon();

        // 🔥 NUEVO: Inicializar gestor de correos
        this.correctosManager = new CorreosManagerPVC();
        this.correctosManager.setAppProduccion(this);
        this.correctosManager.inicializar();
        EquiposUtil.llenarLineas(
            this.datos_usuario[0].PLANTA,
            1,
            null,
            "FiltroLinea",
            null,
            null,
            false
        );
        // 📧 CONSULTAR DATOS
        this.consultarDatos(null, null, null,null,null);
        console.log('✅ Sistema PVC inicializado');
    }

    crearTotalesTemplate() {
        return {
            // GENERALES
            Mes: null,
            Fecha: null,
            Linea: null,
            Producto: null,
            Turno: null,
            TRIP: null,
            // PRODUCCIÓN
            PesoMinimo: 0,
            TRFabricados: 0,
            ProduccionNetaReal: 0,
            PesoEstandar: 0,
            PorcentajeSobrepeso: 0,
            TotalScrapKg: 0,
            PorcentajeScrap: 0,
            // DISPONIBILIDAD
            HorasProgramadas: 0,
            // TIEMPO NO DISPONIBLE (ejemplos)
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
            TiempoProductivo: 0,
            // PRODUCCIÓN (agregar junto a los demás, después de TiempoProductivo)
            DisponibilidadPorcentaje: 0,
            KgPorTiempoDisponible: 0,
            KgHrLinea: null,          // manual, sin fórmula (la que marcaste NO)
            KgHrProducto: null,       // viene del catálogo al buscar el artículo, como PesoMinimo
            KgNetosHrReales: 0,
            PorcentajeRendimiento: 0,
            PorcentajeCalidad: 0,
            PorcentajeOEE: 0,
            PorcentajeEficienciaProducto: 0,
            ObjetivoEficiencia: 91,   // constante, no fórmula
            EficienciaOperativa: 0
        };
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
                PesoMinimo: 0,
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
                TiempoProductivo: null,
                // PRODUCCIÓN (agregar junto a los demás, después de TiempoProductivo)
                DisponibilidadPorcentaje: 0,
                KgPorTiempoDisponible: 0,
                KgHrLinea: null,          // manual, sin fórmula (la que marcaste NO)
                KgHrProducto: null,       // viene del catálogo al buscar el artículo, como PesoMinimo
                KgNetosHrReales: 0,
                PorcentajeRendimiento: 0,
                PorcentajeCalidad: 0,
                PorcentajeOEE: 0,
                PorcentajeEficienciaProducto: 0,
                ObjetivoEficiencia: 91,   // constante, no fórmula
                EficienciaOperativa: 0
            }
        ];

        this.inicializarGrid();

        setTimeout(() => {
            $("#tablaProduccion").removeClass("d-none");
        }, 1000);

    }

    cargarDatosGrid(datos) {

        // 🔥 Ya NO agrega la fila de totales aquí — eso se decide al final en consultarDatos

        if (datos != null) {

            const datosFormateados = datos.map(item => {

                const fila = {
                    id: item.ID_REGISTRO || Date.now(),
                    ID_REGISTRO: item.ID_REGISTRO,
                    OTMC: item.OTMC,
                    OTMP: item.OTMP,
                    ID_PRODUCTO_TERMINADO: item.ID_PRODUCTO_TERMINADO,
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
                            ? ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'][new Date(item.FECHA).getMonth()]
                            : null
                    ),
                    PesoMinimo: item.PESO_MINIMO || 0,
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
                    TiempoProductivo: item.TIEMPO_PRODUCTIVO,
                    // 🔥 AGREGAR (si tu SP ya los regresa):
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
                };

                // 🔥 NUEVO: Identificar origen y asignar emoji
                if (item.OTMC && item.OTMC.toString().trim() !== '') {
                    // Es un correctivo guardado en DB
                    fila._origen = 'CORRECTIVO';
                    fila._marcador = '🔧';
                    fila._rowClass = 'row-correctivo';
                } else if (item.OTMP && item.OTMP.toString().trim() !== '') {
                    // Es un preventivo guardado en DB
                    fila._origen = 'PREVENTIVO';
                    fila._marcador = '🛠️';
                    fila._rowClass = 'row-preventivo';
                } else if (item.ID_PRODUCTO_TERMINADO && item.ID_PRODUCTO_TERMINADO.toString().trim() !== '') {
                    // Es un producto terminado guardado en DB
                    fila._origen = 'PRODUCTO_TERMINADO';
                    fila._marcador = '📦';
                    fila._rowClass = 'row-producto-terminado';
                }

                return fila;
            });

            if (datosFormateados.length > 0) {
                this.gridApi.setRowData(datosFormateados);
                this.inicializarTooltipsGrid(); // 🔥
                return true; // 🔥 sí había datos
            }
        }

        // 🔥 Sin datos: limpiamos el grid, SIN placeholder todavía
        this.gridApi.setRowData([]);
        return false;
    }

    async consultarDatos(fechaInicio, fechaFin, FiltroTurno, FiltroLinea, filtroProducto) {

        try {

            GlobalUtil.mostrarLoader(true);
            $("#tablaProduccion").addClass("d-none");

            const response = await $.ajax({
                url: `/${this.URLBase}/GetTiemposMuertosPVC`,
                type: "GET",
                data: {
                    FiltroFechaInicio: fechaInicio,
                    FiltroFechaFin: fechaFin,
                    FiltroLinea: FiltroLinea,
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

            // 🔥 NUEVO: Preventivos se agregan también
            const seAgregaronPreventivos = await this.traerPreventivosCerrados(fechaInicio, fechaFin, FiltroLinea);

            // ✅ NUEVO: Productos terminados se agregan también
            const productosTerminados = await this.ObtenerProductoTerminado(null, null, FiltroTurno, (this.datos_usuario[0].PLANTA == "1" ? "PPVC" : "PPVC"));
            const seAgregaronProductosTerminados = await this.agregarProductosTerminadosAlGrid(productosTerminados,false);

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
                    FiltroArea: this.ID_AREA_CORRECTIVOS,
                    FiltroLinea: linea || "",
                    FiltroOrdenTrabajo: "",
                    FiltroPlanta: this.datos_usuario[0].PLANTA,
                    FiltroEstatusOT: "4",
                    FiltroExcluirSincronizadosPVC: "S" // 🔥 nombre correcto, el que usa el SP
                }
            });

            const correctivos = response.data || [];

            if (correctivos.length === 0) {
                return false; // 🔥 nada que agregar
            }

            return this.agregarCorrectivosAlGrid(correctivos); // 🔥 ahora retorna bool

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

        console.log('OTMCs en grid:', [...otmcYaEnGrid]);
        console.log('NumeroOrden del primer correctivo:', correctivos[0]?.NumeroOrden, typeof correctivos[0]?.NumeroOrden);

        this.gridApi.forEachNode(node => {
            if (node.data?.OTMC) {
                otmcYaEnGrid.add(String(node.data.OTMC).trim()); // 🔥 normalizar
            }
        });

        const correctivosNuevos = correctivos.filter(
            item => !otmcYaEnGrid.has(String(item.NumeroOrden).trim()) // 🔥 normalizar
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
            nuevaFila.MttoCorrectivos = GlobalUtil.calcularDiferenciaHoras(item.FechaCreacion, item.FechaCierre) || 0;

            // ✅ Marcar como correctivo
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

            // ✅ MOVER ESTO ANTES DEL PUSH (igual que en preventivos)
            this.recalcularFila(nuevaFila);

            filasNuevas.push(nuevaFila);
        });

        if (filasNuevas.length > 0) {
            this.gridApi.applyTransaction({ add: filasNuevas });
            this.inicializarTooltipsGrid();
        }

        if (lineasNoEncontradas.length > 0) {
            AlertManager.mostrar(
                `Las siguientes órdenes no tienen línea reconocida y quedaron sin línea asignada: ${lineasNoEncontradas.join(', ')}`,
                "warning"
            );
        }

        return true;
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
                    FiltroExcluirSincronizadosPVC: "S"  // 🔥 Excluir PVC
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
            nuevaFila.MantenimientoPreventivo = parseFloat(item.DuracionHrs) || 0;

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
        this.inicializarTooltipsGrid(); // 🔥 NUEVO


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

    // 🔥 Convierte "DD/MM/YYYY HH24:MI:SS" (formato que regresa el SP de correctivos)
    // a un valor que el date editor/valueFormatter del grid entienda (ISO)
    parsearFechaCorrectivo(fechaTexto) {

        if (!fechaTexto) return null;

        const [fechaParte] = fechaTexto.split(' '); // nos quedamos con DD/MM/YYYY
        const [dia, mes, anio] = fechaParte.split('/');

        if (!dia || !mes || !anio) return null;

        return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`; // YYYY-MM-DD
    }

    // 🔥 Helper para no repetir el template de fila vacía
    // (extraje el objeto de agregarFila() para reutilizarlo aquí también)
    crearFilaVacia() {
    return {
        id: null,
        Mes: null, Fecha: null, Linea: null, Producto: null, Turno: null, TRIP: null,
        PesoMinimo: 0, TRFabricados: null, ProduccionNetaReal: null,
        PesoEstandar: 0, PorcentajeSobrepeso: 0, TotalScrapKg: null, PorcentajeScrap: 0,
        HorasProgramadas: null,
        MantenimientoPreventivo: null, ControlInventarios: null, FaltaMateriaInsumos: null,
        CambioMolde: null, Calentamiento: null, ParoArranqueNoProgramado: null,
        ArranqueEstabilizacion: null,
        MttoCorrectivos: null, FallaElectrica: null, Servicios: null,
        CambioMoldeSetupExcesos: null, Herramental: null, FallaOperacion: null,
        LimpiezaTanque: null, FaltaMaterial: null, FaltaPersonal: null, FaltaRefacciones: null,
        TiempoDisponible: 0, TiempoProductivo: 0,
        // 🔥 AGREGAR:
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

    // ========================================
    // 🔥 NUEVO: Obtener Producto Terminado
    // ========================================
    async ObtenerProductoTerminado(FechaInicio, FechaFin, FiltroTurno, proceso) {

        try {

            GlobalUtil.mostrarLoader(true);

            // ✅ CORRECIÓN: Usar los parámetros correctos
            const response = await $.ajax({
                url: `/${this.URLBase}/GetProductoTerminadoNewScale`,
                type: "GET",
                headers: {
                    "FechaInicio": FechaInicio,
                    "FechaFin": FechaFin,
                    "Planta": this.datos_usuario[0].PLANTA,
                    "Turno" : FiltroTurno || null,
                    "Proceso": proceso || ""
                },
                dataType: 'json'
            });

            // ✅ AJUSTE: Validar estructura correcta
            let productosTerminados = [];

            if (response && response.reportesProdTerm && Array.isArray(response.reportesProdTerm)) {
                productosTerminados = response.reportesProdTerm;
            } else if (response && response.Data) {
                // Si viene en response.Data, intentar parsear si es string
                if (typeof response.Data === 'string') {
                    productosTerminados = JSON.parse(response.Data);
                } else {
                    productosTerminados = response.Data;
                }
            } else if (Array.isArray(response)) {
                // Si la respuesta es directamente un array
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
    // 🔥 NUEVO: Agregar Productos Terminados al Grid
    // ========================================
    async agregarProductosTerminadosAlGrid(productosTerminados,filtroTurno,showwarning = false) {
        try {
            if (!productosTerminados || productosTerminados.length === 0) {
                if (showwarning)
                AlertManager.mostrar(
                    `No se encontraron productos terminados para los filtros seleccionados del turno: ${filtroTurno || 'de acuerdo a la hora actual'}`,
                    "warning"
                );
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

                const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
                    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

                const nodoExistente = nodosExistentes.get(String(item.Id));

                if (nodoExistente) {
                    const dataActualizada = { ...nodoExistente.data };

                    dataActualizada.Fecha = fecha;
                    dataActualizada.Producto = item.Codigo || '';
                    dataActualizada.Turno = String(item.Turno || '');
                    dataActualizada.TRFabricados = parseFloat(item.NumTubos) || 0;
                    dataActualizada.ProduccionNetaReal = parseFloat(item.PesoTotal) || 0;
                    dataActualizada.PorcentajeScrap = 0;
                    dataActualizada.TotalScrapKg = parseFloat(item.ScrapTotal) || 0;
                    dataActualizada.Linea = lineaEncontrada ? lineaEncontrada.label : null;
                    dataActualizada.Mes = meses[new Date(fecha + 'T00:00:00').getMonth()];

                    dataActualizada.PesoMinimo = parseFloat(item.PesoMinimo) || 0;
                    dataActualizada.KgHrLinea = parseFloat(item.KgsDia) || 0;
                    dataActualizada.KgHrProducto = parseFloat(item.KgsDia) || 0;

                    dataActualizada._origen = 'PRODUCTO_TERMINADO';
                    dataActualizada._marcador = '📦';
                    dataActualizada._rowClass = 'row-producto-terminado';

                    this.recalcularFila(dataActualizada);

                    filasActualizadas.push({ rowNode: nodoExistente, data: dataActualizada });

                } else {
                    const nuevaFila = this.crearFilaVacia();

                    nuevaFila.ID_PRODUCTO_TERMINADO = item.Id;
                    nuevaFila.id = this.generarIdTemporal();
                    nuevaFila.Fecha = fecha;
                    nuevaFila.Producto = item.Codigo || '';
                    nuevaFila.Turno = String(item.Turno || '');
                    nuevaFila.TRFabricados = parseFloat(item.NumTubos) || 0;
                    nuevaFila.ProduccionNetaReal = parseFloat(item.PesoTotal) || 0;
                    nuevaFila.PorcentajeScrap = 0;
                    nuevaFila.TotalScrapKg = parseFloat(item.ScrapTotal) || 0;
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
                this.gridApi.applyTransaction({
                    update: filasActualizadas.map(f => f.data)
                });
                console.log(`🔄 Se actualizaron ${filasActualizadas.length} productos terminados en el grid`);

                AlertManager.mostrar(
                    `🔄 Se actualizaron ${filasActualizadas.length} registro(s) existente(s) del turno: ${filtroTurno || 'de acuerdo a la hora actual'} con información reciente`,
                    "info"
                );
            }

            if (filasNuevas.length > 0) {
                this.gridApi.applyTransaction({ add: filasNuevas });
                console.log(`✅ Se agregaron ${filasNuevas.length} productos terminados al grid`);

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

            this.agregarFilaTotales();

            return filasAgregadas > 0 || filasActualizadas.length > 0;

        } catch (error) {
            console.error("Error al agregar productos terminados:", error);
            return false;
        }
    }

    parsearFechaProductoTerminado(fechaISO) {
        if (!fechaISO) return null;

        try {
            const partesFecha = fechaISO.split('T')[0]; // "2026-07-28"

            if (!partesFecha) return null;

            const [ano, mes, dia] = partesFecha.split('-');
            if (!ano || !mes || !dia) return null;

            if (parseInt(ano) < 2000) {
                console.warn(`⚠️ Fecha inválida detectada: ${fechaISO}`);
                return null;
            }

            return `${ano}-${mes}-${dia}`; // YYYY-MM-DD directo, sin new Date()

        } catch (error) {
            console.error("Error al parsear fecha:", error);
            return null;
        }
    }

    // parsearFechaProductoTerminado(fechaISO) {
    //     if (!fechaISO) return null;

    //     try {
    //         // 🔥 Tomar directo la parte de fecha del string sin pasar por Date()
    //         const partesFecha = fechaISO.split('T')[0]; // "2026-07-28"

    //         if (!partesFecha) return null;

    //         const [ano, mes, dia] = partesFecha.split('-');
    //         if (!ano || !mes || !dia) return null;

    //         // Rechazar fechas anteriores al 2000
    //         if (parseInt(ano) < 2000) {
    //             console.warn(`⚠️ Fecha inválida detectada: ${fechaISO}`);
    //             return null;
    //         }

    //         return `${ano}-${mes}-${dia}`; // YYYY-MM-DD directo, sin new Date()

    //     } catch (error) {
    //         console.error("Error al parsear fecha:", error);
    //         return null;
    //     }
    // }


    // 🔥 NUEVO: Ajusta la fecha "de reloj" a la fecha "operativa del turno"
    // Turno 2 corre de 4:30pm a 4:30am del día siguiente.
    // Si el registro cae en la madrugada (00:00 - 4:30am) y es turno 2,
    // operativamente pertenece al día ANTERIOR (el día en que arrancó el turno).

    //IDENTICO NEW SCALE

    calcularFechaOperativaTurno(fechaISOConHora, turno) {

        if (!fechaISOConHora) return null;

        try {
            const fecha = new Date(fechaISOConHora);
            if (isNaN(fecha.getTime())) return null;

            const hora = fecha.getHours();
            const minutos = fecha.getMinutes();

            const esMadrugada =
                hora < 4 || (hora === 4 && minutos <= 30);

            // Si es turno 2 y cae en la madrugada, retrocedemos un día
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
                        width: 120,
                        cellClass: 'celda-gris',
                        pinned: 'left',
                        // ✅ NUEVO: Renderer para mostrar emoji + mes + tooltip + punto pulsante
                        cellRenderer: params => {
                            if (!params.value || params.data?.id === 'TOTALES') {
                                return params.value || '';
                            }

                            const emoji = params.data?._marcador || '';
                            const origen = params.data?._origen;
                            const idRegistro = params.data?.ID_REGISTRO;

                            // 🔥 Mapa de tooltips según origen
                            const tooltipTexts = {
                                'CORRECTIVO': 'Mantenimiento Correctivo',
                                'PREVENTIVO': 'Mantenimiento Preventivo',
                                'PRODUCTO_TERMINADO': 'Producto Terminado'
                            };

                            const tooltipText = tooltipTexts[origen] || '';
                            const tooltipAttr = tooltipText
                                ? `data-bs-toggle="tooltip" data-bs-title="${tooltipText}" title="${tooltipText}"`
                                : '';

                            // 🔥 NUEVO: Mostrar punto pulsante si es un registro nuevo (sin ID_REGISTRO)
                            const puntoPulsante = !idRegistro && (origen === 'CORRECTIVO' || origen === 'PREVENTIVO' || origen === 'PRODUCTO_TERMINADO')
                                ? `<span class="punto-pulso punto-pulso-margin-left"></span>`
                                : '';

                            return emoji
                                ? `<div style="display: flex; align-items: center; gap: 4px;"><span style="font-size: 16px; cursor: help;" ${tooltipAttr}>${emoji}</span><span>${params.value}</span>${puntoPulsante}</div>`
                                : params.value;
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

                            // 🔥 Tomar solo la parte de fecha, sin importar el formato que venga
                            const soloFecha = params.value.split('T')[0]; // "2026-07-01"
                            return new Date(soloFecha + 'T00:00:00').toLocaleDateString('es-MX');
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
                        cellEditor: 'articuloAutocompleteEditor',

                        tooltipField: 'DescripcionArticulo'
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
            },
            {
                headerName: 'RENDIMIENTO Y OEE',
                headerClass: 'header-grupo-verde-fuerte',
                children: [
                    {
                        field: 'DisponibilidadPorcentaje',
                        headerName: 'DISPONIBILIDAD %',
                        editable: false,
                        width: 130,
                        cellClass: 'celda-verde-fuerte',
                        valueFormatter: params => this.formatearPorcentaje(params.value)
                    },
                    {
                        field: 'KgPorTiempoDisponible',
                        headerName: 'KG POR TIEMPO DISPONIBLE',
                        editable: false,
                        width: 150,
                        cellClass: 'celda-verde-fuerte',
                        valueFormatter: params => this.formatearNumero(params.value)
                    },
                    {
                        field: 'KgHrLinea',
                        headerName: 'KG/HR X LINEA (capacidad Instalada)',
                        editable: false, // 🔥 se llena al buscar el artículo, igual que PesoMinimo
                        width: 150,
                        cellClass: 'celda-rosa',
                        valueFormatter: params => this.formatearNumero(params.value)
                    },
                    {
                        field: 'KgHrProducto',
                        headerName: 'KG/HR X PRODUCTO (historial)',
                        editable: false, // 🔥 se llena al buscar el artículo, igual que PesoMinimo
                        width: 150,
                        cellClass: 'celda-rosa',
                        valueFormatter: params => this.formatearNumero(params.value)
                    },
                    {
                        field: 'KgNetosHrReales',
                        headerName: 'KG NETOS/HR REALES (tiempo productivo)',
                        editable: false,
                        width: 150,
                        cellClass: 'celda-verde-fuerte',
                        valueFormatter: params => this.formatearNumero(params.value)
                    },
                    {
                        field: 'PorcentajeRendimiento',
                        headerName: '% RENDIMIENTO',
                        editable: false,
                        width: 120,
                        cellClass: 'celda-verde-fuerte',
                        valueFormatter: params => this.formatearPorcentaje(params.value)
                    },
                    {
                        field: 'PorcentajeCalidad',
                        headerName: '% CALIDAD',
                        editable: false,
                        width: 110,
                        cellClass: 'celda-verde-fuerte',
                        valueFormatter: params => this.formatearPorcentaje(params.value)
                    },
                    {
                        field: 'PorcentajeOEE',
                        headerName: '% OEE',
                        editable: false,
                        width: 110,
                        cellClass: 'celda-verde-fuerte',
                        valueFormatter: params => this.formatearPorcentaje(params.value)
                    },
                    {
                        field: 'ObjetivoEficiencia',
                        headerName: 'OBJETIVO DE EFICIENCIA %',
                        width: 140,
                        ...this.getColumnaNumerica('celda-amarilla') // editable por si cambia la meta
                    },
                    {
                        field: 'EficienciaOperativa',
                        headerName: 'EFICIENCIA OPERATIVA',
                        editable: false,
                        width: 130,
                        cellClass: 'celda-verde-fuerte',
                        valueFormatter: params => this.formatearPorcentaje(params.value)
                    }
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
                        'TiempoProductivo',
                        'Mes'  // ✅ NUEVO: No editable si queremos que muestre emoji
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
                this.inicializarTooltipsGrid(); // 🔥 NUEVO
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

                return null;
            },

            getRowClass: params => {

                if (params.data?.id === 'TOTALES') {
                    return '';
                }

                if (params.data?._rowClass) {
                    return params.data._rowClass;
                }

                return '';
            },

            // ✅ NUEVO: Cell renderer global para mostrar emojis
            processCellForClipboard: params => {
                // Para que el emoji no se copie en el portapapeles
                if (params.column.field === 'Mes') {
                    return params.value;
                }
                return params.value;
            },

            // ✅ Renderer personalizado para el Mes
            cellRenderer: {
                'mesRenderer': function (params) {
                    if (!params.value) return '';
                    const emoji = params.data?._marcador || '';
                    return emoji ? `<span style="font-size: 14px; margin-right: 4px;">${emoji}</span><span>${params.value}</span>` : params.value;
                }
            }
        };

        new agGrid.Grid(gridDiv, gridOptions);

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

    agregarFilaTotales() {

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

        const totales = this.obtenerTotalesGrid();

        this.gridApi.applyTransaction({
            add: [totales]
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

        row.PorcentajeScrap =
            this.calcularScrap(row);

        row.TiempoDisponible =
            this.calcularTiempoDisponible(row);

        row.TiempoProductivo =
            this.calcularTiempoProductivo(row);

        // 🔥 NUEVO: Rendimiento / OEE
        row.KgPorTiempoDisponible = this.calcularKgPorTiempoDisponible(row);
        row.KgNetosHrReales = this.calcularKgNetosHrReales(row);
        row.PorcentajeRendimiento = this.calcularPorcentajeRendimiento(row);
        row.PorcentajeEficienciaProducto = row.PorcentajeRendimiento; // duplicado igual que en el Excel (DJ = DG)
        row.PorcentajeCalidad = this.calcularPorcentajeCalidad(row);
        row.DisponibilidadPorcentaje = this.calcularDisponibilidadPorcentaje(row);
        row.PorcentajeOEE = this.calcularPorcentajeOEE(row);
        row.EficienciaOperativa = this.calcularEficienciaOperativa(row);
    }

    recalcularTotales() {

        const filaTotales = this.obtenerTotalesGrid();

        this.gridApi.forEachNode((node) => {

            if (node.data?.id === 'TOTALES') {

                node.setData(filaTotales);
            }

        });
    }

    configurarEventos() {
        $('#btnExportarExcel').on('click', () => this.exportarExcel());
        $('#btnGuardarCambios').on('click', () => this.guardarCambios());

        // 🔥 NUEVO: Abrir modal para enviar por correo
        $('#btnEnviarCorreo').on('click', () => {
            const modal = new bootstrap.Modal(document.getElementById('modalEnviarExcelCorreo'));
            modal.show();
        });

        // Delegación de eventos para botones de la tabla (si los hay)
        $(document).on('click', '.btn-editar-fila', (e) => {
            const fila = $(e.currentTarget).closest('tr');
            console.log('Editar fila:', fila.data());
        });

        $(document).on('click', '.btn-eliminar-fila', (e) => {
            const fila = $(e.currentTarget).closest('tr');
            console.log('Eliminar fila:', fila.data());
        });

        $('#btnAplicarFiltros').on('click', async () => {
            const $btn = $('#btnAplicarFiltros');
            $btn.prop('disabled', true);

            try {
                const fechaInicio = $('#FiltroFechaInicio').val();
                const fechaFin = $('#FiltroFechaFin').val();
                const filtroTurno = $('#FiltroTurno').val();
                const filtroProducto = $('#FiltroProducto').val(); // 🔥 NUEVO
                const FiltroLinea = $('#FiltroLinea').val(); // 🔥 NUEVO

                await this.consultarDatos(fechaInicio, fechaFin, filtroTurno, FiltroLinea, filtroProducto);
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
                const productosTerminados = await this.ObtenerProductoTerminado(fechaInicio, fechaFin, filtroTurno, (this.datos_usuario[0].PLANTA == "1" ? "PPVC" : "PPVC"));
                const seAgregaronProductosTerminados = await this.agregarProductosTerminadosAlGrid(productosTerminados, filtroTurno,true);
            } finally {
                $btn.prop('disabled', false);
            }
        });

        $('#btnLimpiarFiltros').on('click', () => {
            $('#FiltroFechaInicio').val('');
            $('#FiltroFechaFin').val('');
            $('#FiltroProducto').val('');
            $('#FiltroTurno').val('');
            $('#FiltroProducto').val('');
            $('#FiltroLinea').val('');

            this.consultarDatos(null, null, null, null, null);
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

                this.consultarDatos(fechaInicio, fechaFin, null,null,null);

            });
    }

    guardarCambios() {
        $("#btnGuardarCambios").html('<span class="spinner-border spinner-border-sm me-2"></span>Guardando...');
        $("#btnGuardarCambios").prop("disabled", true);

        const datos = this.obtenerDatosGrid();

        console.log(datos);

        if (datos.length === 0) {

            AlertManager.mostrar(
                'No hay datos para guardar',
                'warning'
            );

            $("#btnGuardarCambios").prop("disabled", false);

            $("#btnGuardarCambios")
                .html('<i class="bi bi-save me-1"></i>Guardar');

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
                    await this.consultarDatos(null, null, null,null,null);

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

            }

        });

    }

    obtenerDatosGrid() {

        const datos = [];

        const redondear = (valor, decimales = 2) => {
            if (valor === null || valor === undefined || isNaN(valor)) return 0;
            return Math.round(valor * Math.pow(10, decimales)) / Math.pow(10, decimales);
        };

        this.gridApi.forEachNode((node) => {

            if (node.data.id !== 'TOTALES') {

                datos.push({
                    ID_REGISTRO: node.data.ID_REGISTRO || null,
                    OTMC: node.data.OTMC || null,
                    OTMP: node.data.OTMP || null, // 🔥 NUEVO: Preventivos
                    ID_PRODUCTO_TERMINADO: node.data.ID_PRODUCTO_TERMINADO || null, // ✅ NUEVO: Identificador del producto
                    FECHA: node.data.Fecha,
                    LINEA: node.data.Linea,
                    PRODUCTO: node.data.Producto,
                    TURNO: node.data.Turno,
                    TRIP: node.data.TRIP,

                    HORAS_PROGRAMADAS: redondear(node.data.HorasProgramadas || 0, 2),

                    MANTENIMIENTO_PREVENTIVO: redondear(node.data.MantenimientoPreventivo || 0, 2),
                    CONTROL_INVENTARIOS: redondear(node.data.ControlInventarios || 0, 2),
                    FALTA_MATERIA_INSUMOS: redondear(node.data.FaltaMateriaInsumos || 0, 2),
                    CAMBIO_MOLDE_HR: redondear(node.data.CambioMolde || 0, 2),
                    CALENTAMIENTO_HR: redondear(node.data.Calentamiento || 0, 2),
                    PARO_ARRANQUE_NO_PROGRAMADO: redondear(node.data.ParoArranqueNoProgramado || 0, 2),
                    ARRANQUE_ESTABILIZACION_HR: redondear(node.data.ArranqueEstabilizacion || 0, 2),
                    MES: node.data.Mes,
                    PESO_MINIMO: redondear(node.data.PesoMinimo || 0, 2),
                    TR_FABRICADOS: redondear(node.data.TRFabricados || 0, 2),
                    PRODUCCION_NETA_REAL: redondear(node.data.ProduccionNetaReal || 0, 2),
                    PESO_ESTANDAR: redondear(node.data.PesoEstandar || 0, 2),
                    PORCENTAJE_SOBREPESO: redondear(node.data.PorcentajeSobrepeso || 0, 2),
                    TOTAL_SCRAP_KG: redondear(node.data.TotalScrapKg || 0, 2),
                    PORCENTAJE_SCRAP: redondear(node.data.PorcentajeScrap || 0, 2),

                    MTTO_CORRECTIVOS: redondear(node.data.MttoCorrectivos || 0, 2),
                    FALLA_ELECTRICA: redondear(node.data.FallaElectrica || 0, 2),
                    SERVICIOS: redondear(node.data.Servicios || 0, 2),
                    CAMBIO_MOLDE_SETUP_EXCESOS: redondear(node.data.CambioMoldeSetupExcesos || 0, 2),
                    HERRAMENTAL: redondear(node.data.Herramental || 0, 2),
                    FALLA_OPERACION: redondear(node.data.FallaOperacion || 0, 2),
                    LIMPIEZA_TANQUE: redondear(node.data.LimpiezaTanque || 0, 2),
                    FALTA_MATERIAL: redondear(node.data.FaltaMaterial || 0, 2),
                    FALTA_PERSONAL: redondear(node.data.FaltaPersonal || 0, 2),
                    FALTA_REFACCIONES: redondear(node.data.FaltaRefacciones || 0, 2),

                    TIEMPO_DISPONIBLE: redondear(node.data.TiempoDisponible || 0, 2),
                    TIEMPO_PRODUCTIVO: redondear(node.data.TiempoProductivo || 0, 2),
                    // 🔥 FALTABAN:
                    KG_HR_LINEA: redondear(node.data.KgHrLinea || 0, 2),
                    KG_HR_PRODUCTO: redondear(node.data.KgHrProducto || 0, 2),
                    OBJETIVO_EFICIENCIA: redondear(node.data.ObjetivoEficiencia || 0, 2),
                    DISPONIBILIDAD_PORCENTAJE: redondear(node.data.DisponibilidadPorcentaje || 0, 2),
                    KG_POR_TIEMPO_DISPONIBLE: redondear(node.data.KgPorTiempoDisponible || 0, 2),
                    KG_NETOS_HR_REALES: redondear(node.data.KgNetosHrReales || 0, 2),
                    PORCENTAJE_RENDIMIENTO: redondear(node.data.PorcentajeRendimiento || 0, 2),
                    PORCENTAJE_CALIDAD: redondear(node.data.PorcentajeCalidad || 0, 2),
                    PORCENTAJE_OEE: redondear(node.data.PorcentajeOEE || 0, 2),
                    PORCENTAJE_EFICIENCIA_PRODUCTO: redondear(node.data.PorcentajeEficienciaProducto || 0, 2),
                    EFICIENCIA_OPERATIVA: redondear(node.data.EficienciaOperativa || 0, 2),

                    USUARIO: this.datos_usuario[0].EMAIL,
                    PLANTA: this.datos_usuario[0].PLANTA
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

    generarIdTemporal() {
        return `TMP_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    }

    agregarFila(params) {

        const nuevaFila = {

            id: this.generarIdTemporal(),

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

            PesoMinimo: 0,
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
            TiempoProductivo: 0,
            // 🔥 AGREGAR:
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
            addIndex: params.node.rowIndex + 1
        });

        this.recalcularTotales();

    }

    copiarFilaAnterior(params) {

        const filaActual = params.node.data;

        const nuevaFila = {

            id: this.generarIdTemporal(),
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

            PesoMinimo: filaActual.PesoMinimo || 0,
            KgHrLinea: filaActual.KgHrLinea || 0, // 🔥 AGREGAR
            KgHrProducto: filaActual.KgHrProducto || 0, // 🔥 AGREGAR
            DescripcionArticulo: filaActual.DescripcionArticulo, // opcional, solo para el tooltip
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


            // 🔥 AGREGAR (campos manuales que no tienen fórmula):
            KgHrLinea: filaActual.KgHrLinea,
            ObjetivoEficiencia: filaActual.ObjetivoEficiencia,

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

        this.recalcularFila(nuevaFila);

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

        const tabla = document.querySelector('#tablaProduccion');

        if (!tabla) return;

        tabla.addEventListener("contextmenu", (e) => {

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

            const lineas = await EquiposUtil.obtenerLineas(this.datos_usuario[0].PLANTA, (this.datos_usuario[0].PLANTA == "1" ? 1 : 14), null);

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

    calcularKgPorTiempoDisponible(row) {
        const tiempoDisponible = parseFloat(row.TiempoDisponible) || 0;
        const kgHrProducto = parseFloat(row.KgHrProducto) || 0;
        return tiempoDisponible * kgHrProducto;
    }

    calcularKgNetosHrReales(row) {
        const tiempoProductivo = parseFloat(row.TiempoProductivo) || 0;
        if (tiempoProductivo <= 0) return 0;

        const produccion = parseFloat(row.ProduccionNetaReal) || 0;
        const scrap = parseFloat(row.TotalScrapKg) || 0;

        return (produccion + scrap) / tiempoProductivo;
    }

    calcularPorcentajeRendimiento(row) {
        const kgHrProducto = parseFloat(row.KgHrProducto) || 0;
        if (kgHrProducto <= 0) return 0;

        const kgNetosHrReales = parseFloat(row.KgNetosHrReales) || 0;
        return (kgNetosHrReales / kgHrProducto) * 100;
    }

    calcularPorcentajeCalidad(row) {
        const produccion = parseFloat(row.ProduccionNetaReal) || 0;
        const scrap = parseFloat(row.TotalScrapKg) || 0;
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

        const produccion = parseFloat(row.ProduccionNetaReal) || 0;
        return (produccion / kgPorTiempoDisponible) * 100;
    }

    obtenerTotalesGrid() {

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
            PesoMinimo: 0,
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
            TiempoProductivo: 0,

            // 🔥 NUEVO: RENDIMIENTO Y OEE
            DisponibilidadPorcentaje: null,
            KgPorTiempoDisponible: 0,
            KgHrLinea: null,                     // 🔲 en blanco, mezcla productos/líneas distintas
            KgHrProducto: null,                  // 🔲 en blanco, mezcla productos/líneas distintas
            KgNetosHrReales: 0,
            PorcentajeRendimiento: null,         // 🔲 en blanco, depende de KgHrProducto
            PorcentajeCalidad: null,
            PorcentajeOEE: null,                 // 🔲 en blanco, depende de %Rendimiento
            PorcentajeEficienciaProducto: null,  // 🔲 en blanco, igual que %Rendimiento (DJ=DG)
            ObjetivoEficiencia: 0,
            EficienciaOperativa: null
        };

        this.gridApi.forEachNode((node) => {

            if (!node.data || node.data.id === 'TOTALES') {
                return;
            }

            totales.PesoMinimo += Number(node.data.PesoMinimo || 0);
            totales.TRFabricados += Number(node.data.TRFabricados || 0);
            totales.ProduccionNetaReal += Number(node.data.ProduccionNetaReal || 0);
            totales.PesoEstandar += Number(node.data.PesoEstandar || 0);
            totales.TotalScrapKg += Number(node.data.TotalScrapKg || 0);

            totales.HorasProgramadas += Number(node.data.HorasProgramadas || 0);

            totales.MantenimientoPreventivo += Number(node.data.MantenimientoPreventivo || 0);
            totales.ControlInventarios += Number(node.data.ControlInventarios || 0);
            totales.FaltaMateriaInsumos += Number(node.data.FaltaMateriaInsumos || 0);
            totales.CambioMolde += Number(node.data.CambioMolde || 0);
            totales.Calentamiento += Number(node.data.Calentamiento || 0);
            totales.ParoArranqueNoProgramado += Number(node.data.ParoArranqueNoProgramado || 0);
            totales.ArranqueEstabilizacion += Number(node.data.ArranqueEstabilizacion || 0);

            totales.MttoCorrectivos += Number(node.data.MttoCorrectivos || 0);
            totales.FallaElectrica += Number(node.data.FallaElectrica || 0);
            totales.Servicios += Number(node.data.Servicios || 0);
            totales.CambioMoldeSetupExcesos += Number(node.data.CambioMoldeSetupExcesos || 0);
            totales.Herramental += Number(node.data.Herramental || 0);
            totales.FallaOperacion += Number(node.data.FallaOperacion || 0);
            totales.LimpiezaTanque += Number(node.data.LimpiezaTanque || 0);
            totales.FaltaMaterial += Number(node.data.FaltaMaterial || 0);
            totales.FaltaPersonal += Number(node.data.FaltaPersonal || 0);
            totales.FaltaRefacciones += Number(node.data.FaltaRefacciones || 0);

            totales.TiempoDisponible += Number(node.data.TiempoDisponible || 0);
            totales.TiempoProductivo += Number(node.data.TiempoProductivo || 0);

            // 🔥 NUEVO: acumulables (sí tienen sentido sumados)
            totales.KgPorTiempoDisponible += Number(node.data.KgPorTiempoDisponible || 0);
            totales.KgNetosHrReales += Number(node.data.KgNetosHrReales || 0);
            totales.ObjetivoEficiencia += Number(node.data.ObjetivoEficiencia || 0);

        });

        if (totales.PesoEstandar > 0) {

            totales.PorcentajeSobrepeso =
                ((totales.ProduccionNetaReal / totales.PesoEstandar) - 1) * 100;
        }

        const totalProduccion =
            totales.ProduccionNetaReal + totales.TotalScrapKg;

        if (totalProduccion > 0) {

            totales.PorcentajeScrap =
                (totales.TotalScrapKg / totalProduccion) * 100;
        }

        // 🔥 NUEVO: Disponibilidad % recalculada desde los totales de tiempo
        if (totales.TiempoDisponible > 0) {
            totales.DisponibilidadPorcentaje =
                (totales.TiempoProductivo / totales.TiempoDisponible) * 100;
        }

        // 🔥 NUEVO: % Calidad recalculado desde los totales de kg
        const totalProduccionCalidad = totales.ProduccionNetaReal + totales.TotalScrapKg;
        if (totalProduccionCalidad > 0) {
            totales.PorcentajeCalidad =
                (totales.ProduccionNetaReal / totalProduccionCalidad) * 100;
        }

        // KgHrLinea, KgHrProducto, PorcentajeRendimiento, PorcentajeOEE,
        // PorcentajeEficienciaProducto y EficienciaOperativa se quedan en null
        // porque mezclan productos/líneas distintas — igual que en el Excel.

        return totales;
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
        const altoDropdown = 280; // el mismo max-height que tienes en el CSS

        // 🔥 Evitar que se salga por la derecha
        let left = rect.left;
        if (left + anchoDropdown > window.innerWidth) {
            left = window.innerWidth - anchoDropdown - 10;
        }

        // 🔥 Evitar que se salga por abajo: si no cabe, lo mostramos ARRIBA del input
        const espacioAbajo = window.innerHeight - rect.bottom;
        const cabeAbajo = espacioAbajo >= altoDropdown;

        if (cabeAbajo) {
            this.eDropdown.style.top = rect.bottom + 'px';
        } else {
            // lo pegamos arriba del input, pegado a su borde superior
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

                row.PesoMinimo = articulo.PesoMinimo || 0;

                row.DescripcionArticulo = articulo.DescripcionArticulo;

                row.KgHrProducto = parseFloat(articulo.KgsDia) / 24 || 0;

                row.KgHrLinea = parseFloat(articulo.KgsDia) / 24 || 0;


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
// EXPORTADOR EXCEL PARA PVC
// ========================================
class ExcelExporterPVC extends ExcelExporterBase {
    constructor(gridApi, columnDefs) {
        super(gridApi, columnDefs);
    }

    getSheetName() { return 'Causas Tiempos Muertos PVC'; }

    getFileNamePrefix() { return 'Produccion_PVC'; }

    getTextFields() { return ['Mes','Fecha','Producto','TRIP','Linea','Turno']; }

    getTotalsFontColor() { return 'FF0058A1'; }

    getTotalsBorderColor() { return 'FF0058A1'; }

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
        let filaTotales = null;

        // Primero, recopilar todos los datos (excluyendo TOTALES)
        this.gridApi.forEachNodeAfterFilterAndSort((node) => {
            // Guardar la fila de totales para procesarla al final
            if (node.data && node.data.id === 'TOTALES') {
                filaTotales = node;
                return; // No procesarla aquí, la haremos al final
            }

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

        // Ahora procesar la fila de totales si existe
        if (filaTotales) {
            const fila = [];

            estructura.grupos.forEach(grupo => {
                grupo.children.forEach(col => {
                    let valor = filaTotales.data[col.field];

                    // Para TOTALES, mostrar valores numéricos (no vacíos)
                    if (valor !== null && valor !== undefined && valor !== '') {
                        if (![
                            'Mes',
                            'Fecha',
                            'Producto',
                            'TRIP',
                            'Linea',
                            'Turno'
                        ].includes(col.field)) {
                            valor = parseFloat(valor);
                        }
                    } else {
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
        }
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

                else if (grupo.nombre === 'RENDIMIENTO Y OEE') {
                    colorFondo = '38761D'; // verde más oscuro, distinto de KPIS
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

                        // Aplicar formato numérico a la fila de totales también
                        if (!['Fecha', 'Linea', 'Producto', 'Turno', 'TRIP', 'Mes'].includes(col.field)) {
                            celda.numFmt = '0.00';
                        }
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

// ========================================
// 📧 GESTOR DE CORREOS PARA ENVÍO DE EXCEL
// ========================================
class CorreosManagerPVC {
    constructor() {
        this.correosNotificacion = [];
        this.appProduccion = null;
    }

    setAppProduccion(app) {
        this.appProduccion = app;
    }

    inicializar() {
        $("#btnAgregarCorreoPVC").off("click").on("click", () => this.agregarCorreo());
        $("#inputCorreoPVC").off("keydown").on("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                this.agregarCorreo();
            }
        });
        $("#btnEnviarExcelCorreo").off("click").on("click", () => this.enviarExcelPorCorreo());
    }

    agregarCorreo() {
        const input = $("#inputCorreoPVC");
        const correo = input.val().trim().toLowerCase();
        const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        // Validar formato
        if (!regexEmail.test(correo)) {
            $("#errorCorreoPVC").text("Ingrese un correo válido.").show();
            input.addClass("is-invalid");
            return;
        }

        // Validar duplicado
        if (this.correosNotificacion.includes(correo)) {
            $("#errorCorreoPVC").text("Este correo ya fue agregado.").show();
            input.addClass("is-invalid");
            return;
        }

        // Agregar a la lista
        this.correosNotificacion.push(correo);
        this.renderCorreos();

        // Limpiar input
        input.val('').removeClass("is-invalid");
        $("#errorCorreoPVC").hide();
    }

    renderCorreos() {
        const lista = $("#listaCorreosPVC");
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
            const exporter = new ExcelExporterPVC(this.appProduccion.gridApi, this.appProduccion.columnDefs);
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
                        tipoReporte: 'PVC'
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
        $("#inputCorreoPVC").val('').removeClass("is-invalid");
        $("#errorCorreoPVC").hide();
    }
}