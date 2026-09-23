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
        $('#FiltroFechaInicio').val(DateUtils.obtenerPrimerDiaMesActual());
        $('#FiltroFechaFin').val(DateUtils.obtenerUltimoDiaMesActual());
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
        this.URLBaseMantenimientosCorrectivos = "MantenimientosCorrectivos";
        this.URLBaseMantenimientosPreventivos = "MantenimientosPreventivos";
        this.ID_AREA_CORRECTIVOS = (datos_usuario[0].PLANTA == "1" ? 9 : 14);
        this.ID_AREA_PREVENTIVOS = (datos_usuario[0].PLANTA == "1" ? 9 : 14);
        this.tipoProcesoActual = 'PEAD_LISO';

        // 🔥 NUEVO: Mapa de líneas PEAD LISO P2 (igual patrón que PVC)
        // ⚠️ OJO: confirma con el equipo cuáles IDs/nombres de línea corresponden
        // a PEAD Liso en Planta 2 — los de abajo son placeholder, cópialos de
        // como los tengan mapeados en NW para este proceso.
        this.MAPA_LINEAS_INY = {
            1: 'Linea 1 PEAD LISO',
            2: 'Linea 2 PEAD LISO',
            3: 'Linea 3 PEAD LISO',
            4: 'Linea 4 PEAD LISO',
            5: 'Linea 5 PEAD LISO',
            6: 'Linea 6 PEAD LISO',
            7: 'Linea 7 PEAD LISO',
            8: 'Linea 8 PEAD LISO',
        };
    }

    async inicializar() {
        await this.inicializarCommon();

        this.correosManager = new CorreosManagerPeadLiso();
        this.correosManager.setAppProduccion(this);
        this.correosManager.inicializar();
        EquiposUtil.llenarLineas(
            this.datos_usuario[0].PLANTA,
            (this.datos_usuario[0].PLANTA == "1" ? 9 : 9), // 🔥 PEAD LISO REVISAR PLANTA 2
            1, //Produccion
            "FiltroLinea",
            null,
            null,
            false
        );
        // 🔥 CONSULTAR DATOS (firma actualizada con 5 params, igual que PVC)
        this.consultarDatos();
        // 🔥 NUEVO: Inicializar hub de SignalR para notificaciones en tiempo real
        this.initHubBitacoras();
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

    async consultarDatos() {

        try {

            GlobalUtil.mostrarLoader(true);
            $("#tablaProduccion").addClass("d-none");
            let Planta = this.datos_usuario[0].PLANTA;
            let FiltroFechaInicio = $("#FiltroFechaInicio").val() || null;
            let FiltroFechaFin = $("#FiltroFechaFin").val() || null;
            let FiltroPlanta = Planta;
            let FiltroLinea = $("#FiltroLinea").val() || null;
            let FiltroTurno = $("#FiltroTurno").val() || null;
            let FiltroProducto = $("#FiltroProducto").val() || '';

            const response = await $.ajax({
                url: `/${this.URLBase}/GetTiemposMuertosPeadLiso`,
                type: "GET",
                data: {
                    FiltroFechaInicio: FiltroFechaInicio,
                    FiltroFechaFin: FiltroFechaFin,
                    FiltroPlanta: Planta,
                    FiltroLinea: FiltroLinea,
                    FiltroTurno: FiltroTurno,
                    FiltroProducto: FiltroProducto
                }
            });

            let datosFormateados = [];
            let hayDatosOriginales = false;

            if (response.Status === "OK") {
                const datos = JSON.parse(response.Data);
                // ✅ NUEVO: Guardar datos formateados ANTES de cargar en grid
                datosFormateados = this.formatearDatos(datos);
                hayDatosOriginales = datosFormateados.length > 0;
                if (hayDatosOriginales) {
                    this.gridApi.setRowData(datosFormateados);
                    this.inicializarTooltipsGrid();
                }
            } else {
                //AlertManager.mostrar(response.Message, "info");
                this.gridApi.setRowData([]);
            }

            // 🔥 NUEVO: Si se encontraron datos, colapsar automáticamente el panel de filtros
            if (hayDatosOriginales) {
                const elColapso = document.getElementById('colapseFiltros');
                if (elColapso && elColapso.classList.contains('show')) {
                    new bootstrap.Collapse(elColapso, { toggle: false }).hide();
                }
            }

            // 🔥 Correctivos se agregan ANTES de pintar totales
            // ✅ NUEVO: Pasar datosFormateados para acumular ANTES de agregar al grid
            const seAgregaronCorrectivos = await this.traerCorrectivosCerrados(FiltroFechaInicio, FiltroFechaFin, FiltroLinea, datosFormateados);

            // 🔥 NUEVO: Preventivos se agregan también
            // ✅ IMPORTANTE: También pasar datosFormateados para acumular preventivos
            const seAgregaronPreventivos = await this.traerPreventivosCerrados(FiltroFechaInicio, FiltroFechaFin, FiltroLinea, datosFormateados);

            // ✅ NUEVO: Productos terminados se agregan también
            const productosTerminados = await this.ObtenerProductoTerminado(null, null, FiltroTurno, 'PPEADLISO');
            const seAgregaronProductosTerminados = await this.agregarProductosTerminadosAlGrid(productosTerminados, FiltroTurno, false);

            // 🟦 NUEVO: Paros de producción se agregan también
            // ✅ IMPORTANTE: También pasar datosFormateados para acumular paros
            const seAgregaronParos = await this.traerParosProduccionCerrados(FiltroFechaInicio, FiltroFechaFin, FiltroLinea, datosFormateados);

            // If no hay datos originales, correctivos, preventivos, paros NI productos terminados, mostramos placeholder
            if (!hayDatosOriginales && !seAgregaronCorrectivos && !seAgregaronPreventivos && !seAgregaronProductosTerminados && !seAgregaronParos) {
                this.gridApi.setRowData([]);
            }

            // ✅ NUEVO: Reordenar todo el grid por línea antes de pintar totales
            this.reordenarGridPorLinea();

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

    formatearDatos(datos) {
        if (!datos || datos.length === 0) return [];

        return datos.map(item => {
            const fila = {
                id: item.ID_REGISTRO || Date.now(),
                ID_REGISTRO: item.ID_REGISTRO,
                OTMC: item.OTMC,
                OTMP: item.OTMP,
                ID_PRODUCTO_TERMINADO: item.ID_PRODUCTO_TERMINADO,
                ID_PARO: item.ID_PARO,
                Fecha: item.FECHA,
                Linea: item.LINEA,
                Producto: item.PRODUCTO,
                Turno: item.TURNO,
                Grupo: item.GRUPO,
                Comentarios: item.COMENTARIOS,
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
                PesoMinimo: item.PESO_MINIMO || 0,
                TRLiberados: item.TRLIBERADOS,
                ProduccionNeta: item.PRODUCCION_NETA,
                PesoEstandar: item.PESO_ESTANDAR,
                PorcentajeSobrepeso: item.PORCENTAJE_SOBREPESO,
                TotalScrap: item.TOTAL_SCRAP,
                PorcentajeTotalScrap: item.PORCENTAJE_TOTAL_SCRAP,
                Mes: item.MES || (
                    item.FECHA
                        ? ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'][new Date(item.FECHA).getMonth()]
                        : null
                ),
                TiempoDisponible: item.TIEMPO_DISPONIBLE,
                TiempoProductivo: item.TIEMPO_PRODUCTIVO,
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
                fila._origen = 'CORRECTIVO';
                fila._marcador = '🔧';
                fila._rowClass = 'row-correctivo';
            } else if (item.OTMP && item.OTMP.toString().trim() !== '') {
                fila._origen = 'PREVENTIVO';
                fila._marcador = '🛠️';
                fila._rowClass = 'row-preventivo';
            } else if (item.ID_PRODUCTO_TERMINADO && item.ID_PRODUCTO_TERMINADO.toString().trim() !== '') {
                fila._origen = 'PRODUCTO_TERMINADO';
                fila._marcador = '📦';
                fila._rowClass = 'row-producto-terminado';
            } else if (item.ID_PARO && item.ID_PARO.toString().trim() !== '') {
                fila._origen = 'PARO_MANUAL';
                fila._marcador = '🚫';
                fila._rowClass = 'row-paro';
            }

            return fila;
        });
    }

    // ========================================
    // SIGNALR HUB - BITÁCORAS (TABLA PRODUCCIÓN)
    // ========================================
    initHubBitacoras() {
        const self = this;
        const hub = $.connection.mantenimientoHub;
        let reconnectDelay = 5000;
        let modalActualizacion = null;

        const miRol = self.datos_usuario[0].TIPOUSUARIO;

        // ── Mapeo de mensajes dinámicos por tipo de actualización ──
        const mensajesPorTipo = {
            'CORRECTIVOS': {
                titulo: 'Se completaron nuevas órdenes de mantenimientos correctivos',
                descripcion: 'Se han completado nuevas órdenes de mantenimientos correctivos que generaron tiempo muerto desde tu última carga.'
            },
            'PREVENTIVOS': {
                titulo: 'Se completaron nuevas órdenes de mantenimientos preventivos',
                descripcion: 'Se han completado nuevas órdenes de mantenimientos preventivos desde tu última carga.'
            },
            'PAROS_MANUALES': {
                titulo: 'Se han registrado nuevos paros manuales de producción',
                descripcion: 'Se han registrado nuevos paros manuales de producción desde tu última carga.'
            }
        };

        // ── Inicializar modal una sola vez ──
        const $modalEl = document.getElementById('actualizacionDatosModalBitacoras');
        if ($modalEl) {
            modalActualizacion = new bootstrap.Modal($modalEl, { backdrop: 'static', keyboard: false });

            document.getElementById('btnConfirmarActualizacionBitacoras')
                .addEventListener('click', function () {
                    modalActualizacion.hide();
                    // Cerrar todos los modales abiertos antes de recargar
                    document.querySelectorAll('.modal.show').forEach(function (modalAbierto) {
                        var instancia = bootstrap.Modal.getInstance(modalAbierto);
                        if (instancia) instancia.hide();
                    });
                    self.consultarDatos();
                });
        }

        // ========================================
        // 📡 EVENTO PARA BITÁCORAS
        // ========================================
        hub.client.actualizarTablaBitacoras = function (rolQueCambio, tipoActualizacion = 'CORRECTIVOS') {
            console.warn("📡 Actualización de Bitácoras desde SignalR | Origen:", rolQueCambio || "desconocido", "| Tipo:", tipoActualizacion);

            if ($modalEl && $modalEl.classList.contains('show')) return;

            // Actualizar mensaje dinámico en el modal
            if ($modalEl && mensajesPorTipo[tipoActualizacion]) {
                const mensaje = mensajesPorTipo[tipoActualizacion];

                // Actualizar título del modal
                const $subtituloEl = $modalEl.querySelector('.modal-subtitle-custom');
                if ($subtituloEl) {
                    $subtituloEl.textContent = mensaje.titulo;
                }

                // Actualizar descripción
                const $alertEl = $modalEl.querySelector('.alert');
                if ($alertEl) {
                    $alertEl.innerHTML = `
                        <i class="bi bi-info-circle-fill mt-1 flex-shrink-0"></i>
                        <div>
                            <strong>Se detectaron cambios</strong> en la bitácora de producción.<br>
                            ${mensaje.descripcion}<br>
                            ¿Deseas recargar la tabla ahora para ver la información actualizada?
                        </div>
                    `;
                }
            }

            // Mostrar modal si existe, sino recargar directo
            modalActualizacion
                ? modalActualizacion.show()
                : self.consultarDatos();
        };

        // ========================================
        // 🚀 START HUB (con fallback controlado)
        // ========================================
        $.connection.hub.start({
            transport: ['webSockets', 'longPolling']
        }).done(function () {
            console.log("✅ SignalR conectado para Bitácoras | Rol:", miRol);
            console.log("🚚 Transporte:", $.connection.hub.transport.name);
        }).fail(function (error) {
            console.error("❌ Error al conectar SignalR:", error);
        });

        // ========================================
        // 🔄 RECONNECTING
        // ========================================
        $.connection.hub.reconnecting(function () {
            console.warn("🔄 SignalR reconectando...");
        });

        // ========================================
        // 🔁 RECONNECTED — recarga silenciosa
        // ========================================
        $.connection.hub.reconnected(function () {
            console.info("✅ SignalR reconectado | Rol:", miRol);
            self.consultarDatos();
            reconnectDelay = 5000;
        });
    }

    reordenarGridPorLinea() {
        const todasLasFilas = [];
        this.gridApi.forEachNode(node => {
            if (node.data?.id !== 'TOTALES') {
                todasLasFilas.push(node.data);
            }
        });

        todasLasFilas.sort((a, b) => {
            const extraerNumero = (linea) => {
                if (!linea) return 9999;
                const match = linea.match(/\d+/);
                return match ? parseInt(match[0]) : 9999;
            };
            return extraerNumero(a.Linea) - extraerNumero(b.Linea);
        });

        this.gridApi.setRowData(todasLasFilas);
    }
    // ========================================
    // 🔥 NUEVO: Traer correctivos cerrados y agregarlos al grid
    // ========================================
    async traerCorrectivosCerrados(fechaInicio, fechaFin, linea, datosFormateados = []) {

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
                    FiltroExcluirSincronizadosPEADLISO: "S" // 🔥 nombre correcto, el que usa el SP
                }
            });

            const correctivos = response.data || [];

            if (correctivos.length === 0) {
                return false; // 🔥 nada que agregar
            }

            // ✅ NUEVO: Acumular correctivos en los datos formateados IN-MEMORY
            return this.agregarCorrectivosAlGridEnMemoria(correctivos, datosFormateados);

        } catch (error) {

            console.error(error);
            AlertManager.mostrar("Error al consultar mantenimientos correctivos", "danger");
            return false;

        } finally {
            GlobalUtil.mostrarLoader(false);
        }
    }

    // ✅ NUEVO: Agrupar correctivos ANTES de procesarlos (por Fecha + Línea + AreaTécnica)
    agruparCorrectivos(correctivos) {
        const grupos = {};

        correctivos.forEach(item => {
            const fecha = this.parsearFechaCorrectivo(item.FechaCreacion);
            const tipoTiempo = item.AreaTecnica === 'MANTENIMIENTO HERRAMENTALES' ? 'TiempoMuertoHerramentales' : 'TiempoMuertoCorrectivos';

            // 🔍 Buscar línea
            const lineaEncontrada = this.listaLineas.find(
                l => String(l.value) === String(item.IdLineaProduccion)
            );
            const nombreLinea = lineaEncontrada ? lineaEncontrada.label : null;

            // ✅ Crear clave única para el grupo: Fecha|Línea|TipoTiempo
            const clave = `${fecha}|${nombreLinea}|${tipoTiempo}`;

            if (!grupos[clave]) {
                grupos[clave] = {
                    fecha,
                    nombreLinea,
                    tipoTiempo,
                    tiempoTotal: 0,
                    otmcList: [],
                    items: [],
                    sinLinea: false
                };
            }

            // ✅ IMPORTANTE: Convertir a número para evitar concatenación de strings
            const tiempoCalculado = Number(GlobalUtil.calcularDiferenciaHoras(item.HoraApertura, item.HoraCierreMan)) || 0;
            grupos[clave].tiempoTotal += tiempoCalculado;
            grupos[clave].otmcList.push(item.NumeroOrden);
            grupos[clave].items.push(item);

            if (!nombreLinea) {
                grupos[clave].sinLinea = true;
            }
        });

        return Object.values(grupos);
    }

    // ✅ NUEVO: Agregar correctivos a los datos EN MEMORIA (antes de setRowData)
    agregarCorrectivosAlGridEnMemoria(correctivos, datosFormateados) {
        // ✅ SI datosFormateados está vacío, lo inicializamos como array vacío
        if (!datosFormateados) {
            datosFormateados = [];
        }

        const otmcYaEnDatos = new Set();

        // 🔍 Recopilar OTMCs ya presentes en datosFormateados
        datosFormateados.forEach(fila => {
            if (fila.OTMC) {
                const otmcs = String(fila.OTMC).split('|').filter(o => o.trim());
                otmcs.forEach(o => otmcYaEnDatos.add(String(o).trim()));
            }
        });

        console.log('💾 OTMCs ya en datos:', [...otmcYaEnDatos]);

        // 🔍 Filtrar correctivos que NO estén ya en datos
        const correctivosNuevos = correctivos.filter(
            item => !otmcYaEnDatos.has(String(item.NumeroOrden).trim())
        );

        if (correctivosNuevos.length === 0) {
            console.log('ℹ️ Todos los correctivos ya estaban en datos, nada que agregar');
            return false;
        }

        console.log(`📥 Agregando ${correctivosNuevos.length} correctivos a datos en memoria`);

        // ✅ NUEVO: Agrupar los correctivos nuevos ANTES de procesarlos
        const gruposCorrectivos = this.agruparCorrectivos(correctivosNuevos);
        console.log(`📊 Agrupados en ${gruposCorrectivos.length} grupos únicos (Fecha + Línea + AreaTécnica)`);

        const filasNuevas = [];
        const lineasNoEncontradas = [];

        // ✅ Procesar GRUPOS en lugar de items individuales
        gruposCorrectivos.forEach(grupo => {
            const { fecha, nombreLinea, tipoTiempo, tiempoTotal, otmcList, sinLinea } = grupo;

            if (sinLinea) {
                lineasNoEncontradas.push(...otmcList);
            }

            // 🔍 Buscar fila existente en datosFormateados
            // ✅ IMPORTANTE: Normalizar fecha de fila a formato YYYY-MM-DD (puede venir como ISO: 2026-09-18T00:00:00.000)
            const normalizarFecha = (fechaStr) => {
                if (!fechaStr) return null;
                return typeof fechaStr === 'string' ? fechaStr.split('T')[0] : fechaStr;
            };

            let filaExistente = datosFormateados.find(fila =>
                normalizarFecha(fila.Fecha) === fecha &&
                fila.Linea === nombreLinea &&
                (fila._origen === 'CORRECTIVO' || fila.OTMC)
            );

            console.log(`🔍 Buscando (EN MEMORIA): Fecha="${fecha}" | Línea="${nombreLinea}" | Origen="CORRECTIVO" | Órdenes a agregar: ${otmcList.join(', ')}`);

            if (filaExistente) {
                // ✅ Acumular tiempo en fila existente
                filaExistente[tipoTiempo] = (filaExistente[tipoTiempo] || 0) + tiempoTotal;

                // ✅ Normalizar OTMC existente: puede venir en JSON ["OTMC-004","OTMC-007"] o pipes OTMC-004|OTMC-007
                let otmcActual = filaExistente.OTMC || '';
                if (typeof otmcActual === 'string' && otmcActual.startsWith('[')) {
                    // Si es JSON, parsear y convertir a pipes
                    try {
                        const parsed = JSON.parse(otmcActual);
                        otmcActual = Array.isArray(parsed) ? parsed.join('|') : otmcActual;
                    } catch (e) {
                        // Si no se puede parsear, mantener como está
                    }
                }

                // ✅ Agregar todas las órdenes de este grupo (separadas por |)
                const ordenesGrupo = otmcList.join('|');
                filaExistente.OTMC = otmcActual ? `${otmcActual}|${ordenesGrupo}` : ordenesGrupo;

                // Recalcular totales de la fila
                this.recalcularFila(filaExistente);

                console.log(`✅ Acumulado a fila existente (${fecha} - ${nombreLinea}): +${tiempoTotal}h en ${tipoTiempo} | Órdenes: ${ordenesGrupo}`);
            } else {
                // ✅ Crear nueva fila
                const nuevaFila = this.crearFilaVacia();

                nuevaFila.id = this.generarIdTemporal();
                // ✅ IMPORTANTE: Guardar todas las órdenes del grupo separadas por |
                nuevaFila.OTMC = otmcList.join('|');
                nuevaFila.Fecha = fecha;
                nuevaFila[tipoTiempo] = tiempoTotal;

                // ✅ Marcar como correctivo
                nuevaFila._origen = 'CORRECTIVO';
                nuevaFila._marcador = '🔧';
                nuevaFila._rowClass = 'row-correctivo';
                nuevaFila._esNuevo = true;
                nuevaFila.Linea = nombreLinea;

                if (nuevaFila.Fecha) {
                    const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
                    nuevaFila.Mes = meses[new Date(nuevaFila.Fecha).getMonth()];
                }

                // ✅ Recalcular antes de agregar
                this.recalcularFila(nuevaFila);

                filasNuevas.push(nuevaFila);
                console.log(`✅ Nueva fila creada (${fecha} - ${nombreLinea}): ${tiempoTotal}h en ${tipoTiempo} | Órdenes: ${otmcList.join(', ')}`);
            }
        });

        // ✅ Agregar nuevas filas a datosFormateados
        if (filasNuevas.length > 0) {
            datosFormateados.push(...filasNuevas);
            console.log(`📋 Agregadas ${filasNuevas.length} nuevas filas a datosFormateados`);
        }

        if (lineasNoEncontradas.length > 0) {
            AlertManager.mostrar(
                `Las siguientes órdenes no tienen línea reconocida y quedaron sin línea asignada: ${lineasNoEncontradas.join(', ')}`,
                "warning"
            );
        }

        // ✅ IMPORTANTE: Actualizar gridApi con los datos modificados
        this.gridApi.setRowData(datosFormateados);
        this.inicializarTooltipsGrid();

        return filasNuevas.length > 0;
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
    async traerPreventivosCerrados(fechaInicio, fechaFin, linea, datosFormateados = []) {

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

            // ✅ NUEVO: Acumular preventivos en los datos formateados IN-MEMORY
            return this.agregarPreventivosAlGridEnMemoria(preventivos, datosFormateados);

        } catch (error) {

            console.error(error);
            AlertManager.mostrar("Error al consultar mantenimientos preventivos", "danger");
            return false;

        } finally {
            GlobalUtil.mostrarLoader(false);
        }
    }

    // ✅ NUEVO: Agrupar preventivos ANTES de procesarlos (por Fecha + Línea)
    agruparPreventivos(preventivos) {
        const grupos = {};

        preventivos.forEach(item => {
            const fecha = this.parsearFechaPreventivo(item.FechaInicioMantenimiento);

            // 🔍 Buscar línea
            const lineaEncontrada = this.listaLineas.find(
                l => String(l.value) === String(item.IdLineaProduccion)
            );
            const nombreLinea = lineaEncontrada ? lineaEncontrada.label : null;

            // ✅ Crear clave única para el grupo: Fecha|Línea
            const clave = `${fecha}|${nombreLinea}`;

            if (!grupos[clave]) {
                grupos[clave] = {
                    fecha,
                    nombreLinea,
                    tiempoTotal: 0,
                    otmpList: [],
                    items: [],
                    sinLinea: false
                };
            }

            // ✅ IMPORTANTE: Convertir a número para evitar concatenación de strings
            const duracionHrs = Number(item.DuracionHrs) || 0;
            grupos[clave].tiempoTotal += duracionHrs;
            grupos[clave].otmpList.push(item.NumeroOrden);
            grupos[clave].items.push(item);

            if (!nombreLinea) {
                grupos[clave].sinLinea = true;
            }
        });

        return Object.values(grupos);
    }

    // ✅ NUEVO: Agregar preventivos a los datos EN MEMORIA (antes de setRowData)
    agregarPreventivosAlGridEnMemoria(preventivos, datosFormateados) {
        // ✅ SI datosFormateados está vacío, lo inicializamos como array vacío
        if (!datosFormateados) {
            datosFormateados = [];
        }

        const otmpYaEnDatos = new Set();

        // 🔍 Recopilar OTMPs ya presentes en datosFormateados
        datosFormateados.forEach(fila => {
            if (fila.OTMP) {
                const otmps = String(fila.OTMP).split('|').filter(o => o.trim());
                otmps.forEach(o => otmpYaEnDatos.add(String(o).trim()));
            }
        });

        console.log('💾 OTMPs ya en datos:', [...otmpYaEnDatos]);

        // 🔍 Filtrar preventivos que NO estén ya en datos
        const preventivosNuevos = preventivos.filter(
            item => !otmpYaEnDatos.has(String(item.NumeroOrden).trim())
        );

        if (preventivosNuevos.length === 0) {
            console.log('ℹ️ Todos los preventivos ya estaban en datos, nada que agregar');
            return false;
        }

        console.log(`📥 Agregando ${preventivosNuevos.length} preventivos a datos en memoria`);

        // ✅ NUEVO: Agrupar los preventivos nuevos ANTES de procesarlos
        const gruposPreventivos = this.agruparPreventivos(preventivosNuevos);
        console.log(`📊 Agrupados en ${gruposPreventivos.length} grupos únicos (Fecha + Línea)`);

        const filasNuevas = [];
        const lineasNoEncontradas = [];

        // ✅ Procesar GRUPOS en lugar de items individuales
        gruposPreventivos.forEach(grupo => {
            const { fecha, nombreLinea, tiempoTotal, otmpList, sinLinea } = grupo;

            if (sinLinea) {
                lineasNoEncontradas.push(...otmpList);
            }

            // 🔍 Buscar fila existente en datosFormateados
            // ✅ IMPORTANTE: Normalizar fecha de fila a formato YYYY-MM-DD (puede venir como ISO: 2026-09-18T00:00:00.000)
            const normalizarFecha = (fechaStr) => {
                if (!fechaStr) return null;
                return typeof fechaStr === 'string' ? fechaStr.split('T')[0] : fechaStr;
            };

            let filaExistente = datosFormateados.find(fila =>
                normalizarFecha(fila.Fecha) === fecha &&
                fila.Linea === nombreLinea &&
                (fila._origen === 'PREVENTIVO' || fila.OTMP)
            );

            console.log(`🔍 Buscando (EN MEMORIA): Fecha="${fecha}" | Línea="${nombreLinea}" | Origen="PREVENTIVO" | Órdenes a agregar: ${otmpList.join(', ')}`);

            if (filaExistente) {
                // ✅ Acumular tiempo en fila existente
                filaExistente.Preventivo = (filaExistente.Preventivo || 0) + tiempoTotal;

                // ✅ Normalizar OTMP existente: puede venir en JSON ["OTMP-004","OTMP-007"] o pipes OTMP-004|OTMP-007
                let otmpActual = filaExistente.OTMP || '';
                if (typeof otmpActual === 'string' && otmpActual.startsWith('[')) {
                    // Si es JSON, parsear y convertir a pipes
                    try {
                        const parsed = JSON.parse(otmpActual);
                        otmpActual = Array.isArray(parsed) ? parsed.join('|') : otmpActual;
                    } catch (e) {
                        // Si no se puede parsear, mantener como está
                    }
                }

                // ✅ Agregar todas las órdenes de este grupo (separadas por |)
                const ordenesGrupo = otmpList.join('|');
                filaExistente.OTMP = otmpActual ? `${otmpActual}|${ordenesGrupo}` : ordenesGrupo;

                // Recalcular totales de la fila
                this.recalcularFila(filaExistente);

                console.log(`✅ Acumulado a fila existente (${fecha} - ${nombreLinea}): +${tiempoTotal}h en Preventivo | Órdenes: ${ordenesGrupo}`);
            } else {
                // ✅ Crear nueva fila
                const nuevaFila = this.crearFilaVacia();

                nuevaFila.id = this.generarIdTemporal();
                // ✅ IMPORTANTE: Guardar todas las órdenes del grupo separadas por |
                nuevaFila.OTMP = otmpList.join('|');
                nuevaFila.Fecha = fecha;
                nuevaFila.Preventivo = tiempoTotal;

                // ✅ Marcar como preventivo
                nuevaFila._origen = 'PREVENTIVO';
                nuevaFila._marcador = '🛠️';
                nuevaFila._rowClass = 'row-preventivo';
                nuevaFila._esNuevo = true;
                nuevaFila.Linea = nombreLinea;

                if (nuevaFila.Fecha) {
                    const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
                    nuevaFila.Mes = meses[new Date(nuevaFila.Fecha).getMonth()];
                }

                // ✅ Recalcular antes de agregar
                this.recalcularFila(nuevaFila);

                filasNuevas.push(nuevaFila);
                console.log(`✅ Nueva fila creada (${fecha} - ${nombreLinea}): ${tiempoTotal}h en Preventivo | Órdenes: ${otmpList.join(', ')}`);
            }
        });

        // ✅ Agregar nuevas filas a datosFormateados
        if (filasNuevas.length > 0) {
            datosFormateados.push(...filasNuevas);
            console.log(`📋 Agregadas ${filasNuevas.length} nuevas filas a datosFormateados`);
        }

        if (lineasNoEncontradas.length > 0) {
            AlertManager.mostrar(
                `Las siguientes órdenes no tienen línea reconocida y quedaron sin línea asignada: ${lineasNoEncontradas.join(', ')}`,
                "warning"
            );
        }

        // ✅ IMPORTANTE: Actualizar gridApi con los datos modificados
        this.gridApi.setRowData(datosFormateados);
        this.inicializarTooltipsGrid();

        return filasNuevas.length > 0;
    }

    // 🔥 Convierte fecha del preventivo
    // FechaInicioMantenimiento viene en formato "DD/MM/YYYY" desde el SP
    parsearFechaPreventivo(fechaTexto) {
        if (!fechaTexto) return null;

        try {
            // ISO date (YYYY-MM-DD o con T)
            if (fechaTexto.includes('-')) {
                const fecha = new Date(fechaTexto);
                if (isNaN(fecha.getTime())) return null;
                const ano = fecha.getFullYear();
                const mes = String(fecha.getMonth() + 1).padStart(2, '0');
                const dia = String(fecha.getDate()).padStart(2, '0');
                return `${ano}-${mes}-${dia}`;
            }

            // 🆕 Separar fecha de hora si viene "DD/MM/YYYY HH:MM:SS"
            const fechaParte = fechaTexto.split(' ')[0];
            const [dia, mes, anio] = fechaParte.split('/');
            if (!dia || !mes || !anio) return null;

            return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
        } catch (error) {
            console.error("Error al parsear fecha preventivo:", error);
            return null;
        }
    }

    // ========================================
    // 🟦 NUEVO: Traer Paros de Producción Cerrados
    // ========================================
    async traerParosProduccionCerrados(fechaInicio, fechaFin, linea, datosFormateados = []) {

        try {

            GlobalUtil.mostrarLoader(true);

            // 🎯 Params para obtener paros del rango de fechas
            const response = await $.ajax({
                url: `/${this.URLBase}/obtenerParosProduccionSS`,
                type: "POST",
                data: {
                    draw: 1,
                    length: 999999,
                    start: 0,
                    FiltroFechaInicio: fechaInicio,
                    FiltroFechaFin: fechaFin,
                    FiltroLinea: linea || "",
                    FiltroEstatus: "", // 🟦 Sin filtro de estatus, traer todos
                    FiltroPlanta: this.datos_usuario[0].PLANTA,
                    "FiltroArea": (this.datos_usuario[0].PLANTA == 1 ? 9 : 9) || null, // 🟦 Área PEAD LISO
                    "FiltroIncluirCorrectivo": null,
                    "FiltroTipoLinea": 'PEAD'
                }
            });

            const paros = response.data || [];

            if (paros.length === 0) {
                return false; // 🟦 nada que agregar
            }

            // ✅ NUEVO: Acumular paros en los datos formateados IN-MEMORY
            return this.agregarParosAlGridEnMemoria(paros, datosFormateados);

        } catch (error) {

            console.error(error);
            AlertManager.mostrar("Error al consultar paros de producción", "danger");
            return false;

        } finally {
            GlobalUtil.mostrarLoader(false);
        }
    }

    // ✅ Agrupar paros ANTES de procesarlos (por Fecha + Línea) — 100% dinámico,
    // acumula en CUALQUIER columna que mapearCategoriaParoAColumna devuelva
    agruparParos(paros) {
        const grupos = {};

        paros.forEach(item => {
            const fecha = this.parsearFechaParo(item.FECHA_PARO_STRING);
            const columnaCategoria = this.mapearCategoriaParoAColumna(item.CATEGORIA);

            const lineaEncontrada = this.listaLineas.find(
                l => String(l.value) === String(item.LINEA_PRODUCCION)
            );
            const nombreLinea = lineaEncontrada ? lineaEncontrada.label : null;

            const clave = `${fecha}|${nombreLinea}`;

            if (!grupos[clave]) {
                grupos[clave] = {
                    fecha,
                    nombreLinea,
                    categorias: {}, // 🔥 acumulador dinámico: { NombreColumna: horasAcumuladas }
                    idParoList: [],
                    items: [],
                    sinLinea: false
                };
            }

            const duracionHrs = Number(item.DURACION_HRS) || 0;

            // 🔥 Acumula en la columna que sea, sin lista fija — si no existe la crea en 0
            if (columnaCategoria) {
                grupos[clave].categorias[columnaCategoria] =
                    (grupos[clave].categorias[columnaCategoria] || 0) + duracionHrs;
            } else {
                console.warn(`⚠️ Paro ID ${item.ID_PARO} con categoría "${item.CATEGORIA}" no mapeada a ninguna columna — se registra el ID pero sin sumar horas`);
            }

            grupos[clave].idParoList.push(String(item.ID_PARO));
            grupos[clave].items.push(item);

            if (!nombreLinea) {
                grupos[clave].sinLinea = true;
            }
        });

        return Object.values(grupos);
    }

    // ✅ Agregar paros a los datos EN MEMORIA — itera dinámicamente todas las
    // categorías acumuladas del grupo, sin depender de una lista fija de campos
    agregarParosAlGridEnMemoria(paros, datosFormateados) {
        if (!datosFormateados) {
            datosFormateados = [];
        }

        const idParoYaEnDatos = new Set();

        datosFormateados.forEach(fila => {
            if (fila.ID_PARO) {
                const ids = String(fila.ID_PARO).split('|').filter(o => o.trim());
                ids.forEach(o => idParoYaEnDatos.add(String(o).trim()));
            }
        });

        const parosNuevos = paros.filter(
            item => !idParoYaEnDatos.has(String(item.ID_PARO).trim())
        );

        if (parosNuevos.length === 0) {
            console.log('ℹ️ Todos los paros ya estaban en datos, nada que agregar');
            return false;
        }

        const gruposParos = this.agruparParos(parosNuevos);
        console.log(`📊 Agrupados en ${gruposParos.length} grupos únicos (Fecha + Línea)`);

        const filasNuevas = [];
        const lineasNoEncontradas = [];

        const normalizarFecha = (fechaStr) => {
            if (!fechaStr) return null;
            return typeof fechaStr === 'string' ? fechaStr.split('T')[0] : fechaStr;
        };

        gruposParos.forEach(grupo => {
            const { fecha, nombreLinea, categorias, idParoList, sinLinea } = grupo;

            if (sinLinea) {
                lineasNoEncontradas.push(...idParoList);
            }

            let filaExistente = datosFormateados.find(fila =>
                normalizarFecha(fila.Fecha) === fecha &&
                fila.Linea === nombreLinea &&
                (fila._origen === 'PARO_MANUAL' || fila.ID_PARO)
            );

            const categoriasKeys = Object.keys(categorias);

            console.log(`🔍 Buscando (EN MEMORIA): Fecha="${fecha}" | Línea="${nombreLinea}" | Categorías: ${categoriasKeys.join(', ')} | IDs: ${idParoList.join(', ')}`);

            if (filaExistente) {
                // ✅ Acumula dinámicamente CADA categoría presente en el grupo,
                // sin importar cuál o cuántas sean
                categoriasKeys.forEach(col => {
                    filaExistente[col] = (filaExistente[col] || 0) + categorias[col];
                });

                let idParoActual = filaExistente.ID_PARO || '';
                const idsGrupo = idParoList.join('|');
                filaExistente.ID_PARO = idParoActual ? `${idParoActual}|${idsGrupo}` : idsGrupo;

                if (!filaExistente._origen) {
                    filaExistente._origen = 'PARO_MANUAL';
                    filaExistente._marcador = '🚫';
                    filaExistente._rowClass = 'row-paro';
                }

                this.recalcularFila(filaExistente);

                console.log(`✅ Acumulado a fila existente (${fecha} - ${nombreLinea}): ${categoriasKeys.map(c => `${c} +${categorias[c]}h`).join(', ')} | IDs: ${idParoList.join(', ')}`);
            } else {
                const nuevaFila = this.crearFilaVacia();
                nuevaFila.id = this.generarIdTemporal();
                nuevaFila.Fecha = fecha;
                nuevaFila.Linea = nombreLinea;
                nuevaFila.ID_PARO = idParoList.join('|');
                nuevaFila._origen = 'PARO_MANUAL';
                nuevaFila._marcador = '🚫';
                nuevaFila._rowClass = 'row-paro';
                nuevaFila._esNuevo = true;

                // 🔥 Asigna dinámicamente CADA categoría presente
                categoriasKeys.forEach(col => {
                    nuevaFila[col] = categorias[col];
                });

                if (nuevaFila.Fecha) {
                    const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
                    nuevaFila.Mes = meses[new Date(nuevaFila.Fecha).getMonth()];
                }

                this.recalcularFila(nuevaFila);
                filasNuevas.push(nuevaFila);

                console.log(`✨ Nueva fila creada (${fecha} - ${nombreLinea}): ${categoriasKeys.map(c => `${c} ${categorias[c]}h`).join(', ')} | IDs: ${idParoList.join(', ')}`);
            }
        });

        if (filasNuevas.length > 0) {
            datosFormateados.push(...filasNuevas);
        }

        if (lineasNoEncontradas.length > 0) {
            AlertManager.mostrar(
                `Los siguientes paros no tienen línea reconocida y quedaron sin línea asignada: ${lineasNoEncontradas.join(', ')}`,
                "warning"
            );
        }

        this.gridApi.setRowData(datosFormateados);
        this.inicializarTooltipsGrid();

        return filasNuevas.length > 0;
    }

    // ========================================
    // 🟦 NUEVO: Mapear Categoría del Paro a Columna del Grid
    // ========================================
    mapearCategoriaParoAColumna(categoria) {

        if (!categoria) return null;

        // 🟦 Normalizar: convertir a mayúsculas y remover acentos
        const categoriaNormalizada = categoria
            .toUpperCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();

        // 🟦 Mapeo de categorías a campos del grid PEAD LISO
        const mapeo = {
            'MTTO CORRECTIVOS': 'TiempoMuertoCorrectivos',
            'MTTO. CORRECTIVOS': 'TiempoMuertoCorrectivos',
            'CORRECTIVO': 'TiempoMuertoCorrectivos',
            'CORRECTIVOS': 'TiempoMuertoCorrectivos',
            'FALLA ELECTRICA': 'FaltaEnergiaElectrica',
            'ENERGIA': 'FaltaEnergiaElectrica',
            'FALTA ENERGIA': 'FaltaEnergiaElectrica',
            'FALTA ENERGIA ELECTRICA': 'FaltaEnergiaElectrica',
            'FALTA MATERIA PRIMA': 'FaltaMateriaPrimaInsumos',
            'FALTA MATERIA': 'FaltaMateriaPrimaInsumos',
            'MATERIA PRIMA': 'FaltaMateriaPrimaInsumos',
            'TIEMPO CALENTAMIENTO CI': 'TiempoCalentamientoCI',
            'CALENTAMIENTO CI': 'TiempoCalentamientoCI',
            'PREPARACION LINEA CAMBIO HERRAMENTAL': 'PreparacionLineaCambioHerramental',
            'CAMBIO HERRAMENTAL': 'PreparacionLineaCambioHerramental',
            'HERRAMENTAL': 'PreparacionLineaCambioHerramental',
            'TIEMPO CALENTAMIENTO HERRAMENTAL': 'TiempoCalentamientoHerramental',
            'CALENTAMIENTO HERRAMENTAL': 'TiempoCalentamientoHerramental',
            'ARRANQUE ESTABILIZACION': 'ArranqueEstabilizacionLinea',
            'ARRANQUE ESTABILIZACION LINEA': 'ArranqueEstabilizacionLinea',
            'ARRANQUE': 'ArranqueEstabilizacionLinea',
            'CAMBIO MOLDE SETUP': 'CambioMoldeSetupExcesos',
            'CAMBIO MOLDE': 'CambioMoldeSetupExcesos',
            'CAMBIO DE MOLDE (SETUP) EXCESOS': 'CambioMoldeSetupExcesos',
            'SETUP': 'CambioMoldeSetupExcesos',
            'FALTA PERSONAL': 'FaltaPersonal',
            'FALTA DE PERSONAL': 'FaltaPersonal',
            'PERSONAL': 'FaltaPersonal',
            'TIEMPO MUERTO PROCESO': 'TiempoMuertoProceso',
            'PROCESO': 'TiempoMuertoProceso',
            'PREVENTIVO': 'Preventivo',
            'MANTENIMIENTO': 'Preventivo',
        };

        return mapeo[categoriaNormalizada] || null;
    }

    // ========================================
    // 🟦 NUEVO: Parsear fecha del paro
    // ========================================
    parsearFechaParo(fechaTexto) {

        if (!fechaTexto) return null;

        try {
            // 🟦 Si es ISO date (YYYY-MM-DD o con T)
            if (fechaTexto.includes('-') && !fechaTexto.includes('/')) {
                const fecha = new Date(fechaTexto);
                if (isNaN(fecha.getTime())) return null;

                const ano = fecha.getFullYear();
                const mes = String(fecha.getMonth() + 1).padStart(2, '0');
                const dia = String(fecha.getDate()).padStart(2, '0');
                return `${ano}-${mes}-${dia}`;
            }

            // 🟦 Si es formato DD/MM/YYYY o DD/MM/YYYY HH:MM:SS
            if (fechaTexto.includes('/')) {
                // 🟦 Extraer solo la parte de la fecha (antes del espacio si hay hora)
                const partesFecha = fechaTexto.split(' ')[0]; // "09/09/2026" o "09/09/2026"
                const [dia, mes, anio] = partesFecha.split('/');

                if (!dia || !mes || !anio) return null;

                return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`; // YYYY-MM-DD
            }

            return null;
        } catch (error) {
            console.error("Error al parsear fecha paro:", error);
            return null;
        }
    }

    inicializarGrid() {

        const gridDiv = document.querySelector('#tablaProduccion');

        const columnDefs = [

            // ========================================
            // COLUMNAS BÁSICAS
            // ========================================
            {
                headerName: 'DATOS GENERALES',
                headerClass: 'header-grupo-morado',
                children: [
                    {
                        field: 'Mes',
                        headerName: 'Mes',
                        editable: false,
                        width: 170,
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

                            // ✅ IMPORTANTE: Normalizar OTMC/OTMP para tooltip (puede venir en JSON o pipes)
                            const normalizarOrdenes = (ordenesStr) => {
                                if (!ordenesStr) return '';
                                if (typeof ordenesStr === 'string' && ordenesStr.startsWith('[')) {
                                    // Si es JSON, parsear
                                    try {
                                        const parsed = JSON.parse(ordenesStr);
                                        return Array.isArray(parsed) ? parsed.join(', ') : ordenesStr;
                                    } catch (e) {
                                        return ordenesStr;
                                    }
                                }
                                // Si ya es pipes, convertir a comas para legibilidad
                                return ordenesStr.split('|').join(', ');
                            };

                            // ✅ IMPORTANTE: Normalizar ID_PARO con prefijo PAR- o COR- para tooltip
                            const normalizarParos = (parosStr, esPARO_CORRECTIVO = false) => {
                                if (!parosStr) return '';
                                // Determinar prefijo según si es paro correctivo o manual
                                const prefijo = esPARO_CORRECTIVO ? 'COR' : 'PAR';

                                if (typeof parosStr === 'string' && parosStr.startsWith('[')) {
                                    // Si es JSON, parsear
                                    try {
                                        const parsed = JSON.parse(parosStr);
                                        return Array.isArray(parsed) ? parsed.map(p => `${prefijo}-${p}`).join(', ') : parosStr;
                                    } catch (e) {
                                        return parosStr;
                                    }
                                }
                                // Si ya es pipes, convertir a comas con prefijo
                                return parosStr.split('|').map(p => `${prefijo}-${p.trim()}`).join(', ');
                            };

                            // 🔥 Mapa de tooltips según origen
                            const tooltipTexts = {
                                'CORRECTIVO': 'Mantenimiento Correctivo: ' + normalizarOrdenes(params.data?.OTMC),
                                'PREVENTIVO': 'Mantenimiento Preventivo: ' + normalizarOrdenes(params.data?.OTMP),
                                'PRODUCTO_TERMINADO': 'Producto Terminado',
                                'PARO_MANUAL': 'Paros Manuales: ' + normalizarParos(params.data?.ID_PARO, false)
                            };

                            const tooltipText = tooltipTexts[origen] || '';
                            const tooltipAttr = tooltipText
                                ? `data-bs-toggle="tooltip" data-bs-title="${tooltipText}" title="${tooltipText}"`
                                : '';

                            // 🔥 NUEVO: Mostrar punto pulsante si es un registro nuevo (sin ID_REGISTRO)
                            const puntoPulsante = !idRegistro && (origen === 'CORRECTIVO' || origen === 'PREVENTIVO' || origen === 'PRODUCTO_TERMINADO' || origen === 'PARO_MANUAL')
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
                        editable: false,
                        width: 120,
                        cellClass: 'celda-azul',
                        pinned: 'left',
                        cellEditor: 'agDateCellEditor',
                        cellEditorParams: {
                            browserDatePicker: true
                        },
                        valueFormatter: params => {
                            if (!params.value) return '';

                            // Manejar tanto Date como strings
                            let dateString = params.value;

                            // Si es un objeto Date, convertir a ISO string
                            if (params.value instanceof Date) {
                                dateString = params.value.toISOString();
                            }

                            // Extraer solo la parte de fecha (YYYY-MM-DD)
                            const soloFecha = dateString.split('T')[0];
                            return soloFecha;
                        }
                    },
                    {
                        field: 'Linea',
                        headerName: 'Línea',
                        editable: false,
                        width: 150,
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
                        width: 180,
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
                    },

                    // ✅ COMENTARIOS
                    {
                        field: 'Comentarios',
                        headerName: 'Comentarios',
                        editable: true,
                        width: 200,
                        cellClass: 'celda-azul',
                        pinned: 'left',
                        cellEditor: 'agLargeTextCellEditor',
                        cellEditorParams: {
                            maxLength: 500
                        }
                    }
                ]
            },

            // ========================================
            // PRODUCCIÓN
            // ========================================
            {
                headerName: 'PRODUCCIÓN',
                headerClass: 'header-grupo-amarillo',
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
                        ...this.getColumnaNumerica('celda-blanca'),
                        editable: true
                    },

                    {
                        field: 'ProduccionNeta',
                        headerName: 'PRODUCCIÓN NETA',
                        width: 135,
                        ...this.getColumnaNumerica('celda-blanca'),
                        editable: true
                    },

                    {
                        field: 'PesoEstandar',
                        headerName: 'PESO ESTÁNDAR',
                        editable: false,
                        width: 130,
                        cellClass: 'celda-verde-formula',
                        valueFormatter: params =>
                            this.formatearNumero(params.value)
                    },

                    {
                        field: 'PorcentajeSobrepeso',
                        headerName: '% SOBREPESO',
                        editable: false,
                        width: 130,
                        cellClass: 'celda-verde-formula',
                        valueFormatter: params =>
                            this.formatearPorcentaje(params.value)
                    },

                    {
                        field: 'TotalScrap',
                        headerName: 'TOTAL SCRAP',
                        width: 130,
                        ...this.getColumnaNumerica('celda-blanca'),
                        editable: true
                    },

                    {
                        field: 'PorcentajeTotalScrap',
                        headerName: '% TOTAL SCRAP',
                        editable: false,
                        width: 130,
                        cellClass: 'celda-verde-formula',
                        valueFormatter: params =>
                            this.formatearPorcentaje(params.value)
                    },
                ]
            },
            {
                headerName: 'DISPONIBILIDAD',
                headerClass: 'header-grupo-azul',
                children: [
                    { field: 'HorasProgramadas', headerName: 'HORAS PROGRAMADAS', width: 140, ...this.getColumnaNumerica('celda-blanca') }
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
                        ...this.getColumnaNumerica('celda-rosa'),
                        editable: false
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
                        ...this.getColumnaNumerica('celda-verde-claro'),
                        editable: false
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
                headerName: 'KPIs',
                headerClass: 'header-grupo-verde',
                children: [

                    {
                        field: 'TiempoDisponible',
                        headerName: 'TIEMPO DISPONIBLE',
                        editable: false,
                        width: 130,
                        cellClass: 'celda-verde-fuerte',
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
                    { field: 'ObjetivoEficiencia', headerName: 'OBJETIVO DE EFICIENCIA %', width: 140, ...this.getColumnaPorcentaje('celda-amarilla'), editable: false },
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
                        borderTop: '2px solid #0058a1'
                    };

                }

            },
            getRowClass: params => {
                if (params.data?.id === 'TOTALES') return 'fila-totales';
                if (params.data?._rowClass) return params.data._rowClass;
                return '';
            }

        };

        new agGrid.Grid(gridDiv, gridOptions);
    }

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
    // 🔥 NUEVO: Agregar Productos Terminados al Grid
    // ========================================
    async agregarProductosTerminadosAlGrid(productosTerminados, filtroTurno, showwarning = false) {
        try {
            if (!productosTerminados || productosTerminados.length === 0) {
                if (showwarning)
                    AlertManager.mostrar(
                        `No se encontraron productos terminados para los filtros seleccionados del turno: ${filtroTurno || 'de acuerdo a la hora actual'}`,
                        "warning"
                    );
                return false;
            }

            // 🔥 NUEVO: validar en batch todos los IDs antes de procesar
            const idsAValidar = productosTerminados.map(item => item.Id);
            const { idsExistentes: idsYaExistentesEnBD, detalle: productosYaRegistrados } =
                await ProductosTerminadosHelper.validarProductosTerminadosExistentes(idsAValidar, this.tipoProcesoActual, this.URLBase);


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

                if (idsYaExistentesEnBD.has(String(item.Id))) {
                    return; // ✅ ya viene con detalle completo desde validarProductosTerminadosExistentes
                }

                const fecha = this.calcularFechaOperativaTurno(item.FechaPesaje, item.Turno);

                if (!fecha) {
                    console.warn(`⚠️ Producto ${item.Codigo} tiene fecha inválida, será omitido`);
                    return;
                }

                if (parseFloat(item.NumTubos || 0) === 0 || parseFloat(item.PesoTotal || 0) === 0) {
                    console.warn(`⚠️ Producto ${item.Codigo} sin datos de producción, será omitido`);
                    return;
                }

                const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
                    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

                let lineaLabel = null;

                if (this.datos_usuario[0].PLANTA == 1) {
                    const lineaEncontrada = this.listaLineas.find(
                        l => String(l.value) === String(item.Id_Linea)
                    );
                    lineaLabel = lineaEncontrada ? lineaEncontrada.label : null;
                } else {
                    lineaLabel = this.MAPA_LINEAS_INY ? this.MAPA_LINEAS_INY[item.Id_Linea] : null;
                }

                if (!lineaLabel) {
                    lineasNoEncontradas.push(`${item.Codigo} (Línea ${item.Id_Linea})`);
                    return;
                }

                const nodoExistente = nodosExistentes.get(String(item.Id));

                // 🆕 REEMPLAZAR el bloque if (nodoExistente) en agregarProductosTerminadosAlGrid de GestionProduccionPeadLiso
                if (nodoExistente) {
                    const dataActualizada = { ...nodoExistente.data };

                    dataActualizada.Fecha = fecha;
                    dataActualizada.Producto = item.Codigo || '';
                    dataActualizada.Turno = String(item.Turno || '');
                    dataActualizada.TRLiberados = parseFloat(item.NumTubos) || 0;  // 🆕 era TRFabricados
                    dataActualizada.ProduccionNeta = parseFloat(item.PesoTotal) || 0; // 🆕 era ProduccionNetaReal
                    dataActualizada.TotalScrap = parseFloat(item.ScrapTotal) || 0; // 🆕 era TotalScrapKg
                    dataActualizada.PorcentajeTotalScrap = 0;                             // 🆕 era PorcentajeScrap
                    dataActualizada.Linea = lineaLabel;
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
                    nuevaFila.TRLiberados = parseFloat(item.NumTubos) || 0;
                    nuevaFila.ProduccionNeta = parseFloat(item.PesoTotal) || 0;
                    nuevaFila.TotalScrap = parseFloat(item.ScrapTotal) || 0;
                    nuevaFila.PorcentajeTotalScrap = 0; // se recalcula abajo con recalcularFila()
                    nuevaFila.Linea = lineaLabel;
                    nuevaFila.Mes = meses[new Date(fecha + 'T00:00:00').getMonth()];
                    nuevaFila.PesoMinimo = parseFloat(item.PesoMinimo) || 0;
                    nuevaFila.KgHrLinea = parseFloat(item.KgsDia) || 0;
                    nuevaFila.KgHrProducto = parseFloat(item.KgsDia) || 0;
                    nuevaFila._origen = 'PRODUCTO_TERMINADO';
                    nuevaFila._marcador = '📦';
                    nuevaFila._rowClass = 'row-producto-terminado';
                    nuevaFila._esNuevo = true;

                    this.recalcularFila(nuevaFila);

                    filasNuevas.push(nuevaFila);
                    filasAgregadas++;
                }
            });

            if (filasActualizadas.length > 0) {
                this.gridApi.applyTransaction({ update: filasActualizadas.map(f => f.data) });

                AlertManager.mostrar(
                    `🔄 Se actualizaron ${filasActualizadas.length} registro(s) existente(s) del turno: ${filtroTurno == "0" ? "Reporte del dia" : filtroTurno || 'de acuerdo a la hora actual'} con información reciente en el grid`,
                    "info"
                );
            }

            if (filasNuevas.length > 0) {
                this.gridApi.applyTransaction({ add: filasNuevas });

                AlertManager.mostrar(
                    `✅ Se agregaron ${filasNuevas.length} productos terminados al grid del turno: ${filtroTurno == '0' ? 'Reporte del dia' : filtroTurno || 'de acuerdo a la hora actual'}`,
                    "info"
                );

                this.inicializarTooltipsGrid();
            }

            // 🔥 NUEVO: avisar cuáles se omitieron por ya existir en BD
            if (productosYaRegistrados.length > 0) {
                this.mostrarModalProductosOmitidos(productosYaRegistrados);
            }

            if (lineasNoEncontradas.length > 0) {
                AlertManager.mostrar(
                    `⚠️ Estos productos no tienen línea reconocida: ${lineasNoEncontradas.join(', ')}`,
                    "warning"
                );
            }

            this.reordenarGridPorLinea();
            this.agregarFilaTotales();

            return filasAgregadas > 0 || filasActualizadas.length > 0;

        } catch (error) {
            console.error("Error al agregar productos terminados:", error);
            return false;
        }
    }

    // ========================================
    // 🔥 Métodos wrapper para validación de Productos Terminados
    // ========================================
    async validarProductosTerminadosExistentes(ids, tipoProceso) {
        // 🔥 Delegado al helper compartido
        return await ProductosTerminadosHelper.validarProductosTerminadosExistentes(ids, tipoProceso, this.URLBase);
    }

    mostrarModalProductosOmitidos(productosOmitidos) {
        // 🔥 Delegado al helper compartido
        ProductosTerminadosHelper.mostrarModalProductosOmitidos(productosOmitidos);
    }

    formatearFechaCreacion(fechaCreacion) {
        // 🔥 Delegado al helper compartido
        return ProductosTerminadosHelper.formatearFechaCreacion(fechaCreacion);
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

                // Después
                new bootstrap.Tooltip(el, {
                    container: 'body'   // 🔥 Sale del scope del AG-Grid
                });
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

                const valor = GlobalUtil.darFormatoNum(params.newValue);
                return valor === '' ? null : Number(valor);
            },
            valueFormatter: params => this.formatearNumero(params.value)
        };
    }

    getColumnaPorcentaje(cellClass = '') {
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
            valueFormatter: params => this.formatearPorcentaje(params.value)
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
                await this.consultarDatos();
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

                // 🔥 NUEVO: Si se agregaron productos terminados, colapsar automáticamente el panel de filtros
                if (seAgregaronProductosTerminados) {
                    const elColapso = document.getElementById('colapseFiltros');
                    if (elColapso && elColapso.classList.contains('show')) {
                        new bootstrap.Collapse(elColapso, { toggle: false }).hide();
                    }
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

            this.consultarDatos();
        });

        $('#FiltroFechaInicio, #FiltroFechaFin')
            .off('change')
            .on('change', () => {

                const fechaInicio = $('#FiltroFechaInicio').val();
                const fechaFin = $('#FiltroFechaFin').val();

                // Validar que la fecha inicio no sea mayor a la fecha fin
                if (fechaInicio && fechaFin && new Date(fechaInicio) > new Date(fechaFin)) {
                    AlertManager.mostrar(
                        "La fecha inicio no puede ser mayor a fecha fin",
                        "warning"
                    );
                    return;
                }

                const FechaTexto = this.formatearRangoFechas(fechaInicio, fechaFin);
                $("#mesActual").text(FechaTexto);

                this.consultarDatos();

            });

    }

    obtenerDatosGrid() {

        const datos = [];

        const redondear = (valor, decimales = 2) => {
            if (valor === null || valor === undefined || isNaN(valor)) return 0;
            return Math.round(valor * Math.pow(10, decimales)) / Math.pow(10, decimales);
        };

        this.gridApi.forEachNode(node => {

            if (node.data?.id === 'TOTALES') return;

            const fila = node.data;

            // 🆕 Convertir OTMC a JSON array
            let otmcFinal = null;
            if (fila.OTMC) {
                if (String(fila.OTMC).includes('|')) {
                    const otmcs = String(fila.OTMC).split('|').map(x => x.trim()).filter(x => x);
                    otmcFinal = JSON.stringify(otmcs);
                } else {
                    otmcFinal = JSON.stringify([String(fila.OTMC).trim()]);
                }
            }

            // 🆕 Convertir OTMP a JSON array
            let otmpFinal = null;
            if (fila.OTMP) {
                if (String(fila.OTMP).includes('|')) {
                    const otmps = String(fila.OTMP).split('|').map(x => x.trim()).filter(x => x);
                    otmpFinal = JSON.stringify(otmps);
                } else {
                    otmpFinal = JSON.stringify([String(fila.OTMP).trim()]);
                }
            }

            datos.push({

                ID_REGISTRO: fila.ID_REGISTRO || null,
                OTMC: otmcFinal,  // 🆕
                OTMP: otmpFinal,  // 🆕
                ID_PRODUCTO_TERMINADO: fila.ID_PRODUCTO_TERMINADO || null,
                ID_PARO: fila.ID_PARO || null,
                MES: fila.Mes,
                FECHA: fila.Fecha,
                LINEA: fila.Linea,
                PRODUCTO: fila.Producto,
                TURNO: fila.Turno,
                GRUPO: fila.Grupo,
                COMENTARIOS: fila.Comentarios || '',

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
                this.consultarDatos();

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

                const eliminar = menu.querySelector('[data-action="eliminar"]');
                const copiar = menu.querySelector('[data-action="copiar"]');

                // 🔥 En la fila de TOTALES solo permitir "Agregar", desactivar "Copiar" y "Eliminar"
                if (this.filaSeleccionada?.data?.id === 'TOTALES') {
                    eliminar.style.display = "none";
                    copiar.style.display = "none";
                } else {
                    // Para filas normales
                    if (this.filaSeleccionada?.data?.ID_REGISTRO) {
                        eliminar.style.display = "none";
                    } else {
                        eliminar.style.display = "block";
                    }
                    copiar.style.display = "block";
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

        // 🔥 Si es la fila de TOTALES, insertar ANTES de ella (en su índice)
        // Si no, insertar DESPUÉS de la fila seleccionada
        const addIndex = params.data?.id === 'TOTALES' 
            ? params.rowIndex 
            : params.rowIndex + 1;

        this.gridApi.applyTransaction({

            add: [nuevaFila],

            addIndex: addIndex

        });

        this.recalcularTotales();

        this.gridApi.refreshCells({
            force: true
        });

        this.gridApi.redrawRows();

    }

    copiarFilaAnterior(params) {

        const node = params.node || params;
        const filaActual = node?.data;

        if (!filaActual || filaActual.id === 'TOTALES') {
            return;
        }

        const nuevaFila = JSON.parse(JSON.stringify(filaActual));

        // ========================================
        // NUEVO REGISTRO — limpiar todo lo que
        // identifica a la fila original como
        // correctivo / preventivo / producto
        // terminado / paro manual sincronizado
        // ========================================

        nuevaFila.id = this.generarIdTemporal();
        nuevaFila.ID_REGISTRO = null;
        nuevaFila.PesoMinimo = 0;

        nuevaFila.OTMC = null;
        nuevaFila.OTMP = null;
        nuevaFila.ID_PRODUCTO_TERMINADO = null;
        nuevaFila.ID_PARO = null;
        nuevaFila._origen = null;
        nuevaFila._marcador = null;
        nuevaFila._rowClass = null;
        nuevaFila._esNuevo = null;

        // ========================================
        // RECALCULAR MES
        // ========================================

        if (nuevaFila.Fecha) {

            const fecha = new Date(nuevaFila.Fecha);

            const meses = [
                'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
                'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
            ];

            nuevaFila.Mes = meses[fecha.getMonth()];
        }

        // ========================================
        // RECALCULAR KPIs
        // ========================================

        this.recalcularFila(nuevaFila);

        const addIndex = node?.data?.id === 'TOTALES'
            ? node.rowIndex
            : node.rowIndex + 1;

        this.gridApi.applyTransaction({

            add: [nuevaFila],

            addIndex: addIndex

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