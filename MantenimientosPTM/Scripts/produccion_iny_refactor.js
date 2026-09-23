// ========================================
// GESTOR DE EVENTOS
// ========================================
class GestionEventosINY {
    constructor() {
        this.URLBase = "Produccion";
        this.datos_usuario = GlobalUtil.getDatosUsuario();
        this.appProduccion = new GestionProduccionINY(this.datos_usuario, this.URLBase);
    }

    inicializar() {
        UIManager_INY.inicializarUI();
        this.appProduccion.inicializar();
        console.log('✅ Sistema Completo INY inicializado');
    }
}

// ========================================
// INICIALIZACIÓN
// ========================================
$(document).ready(function () {
    const app = new GestionEventosINY();
    app.inicializar();
});

// ========================================
// GESTOR DE UI
// ========================================
class UIManager_INY {
    static inicializarUI() {
        $("#ProduccionContainer").addClass("selected");
        $("#ProduccionContainer a").addClass("whiteText");
        $("#produccion-collapse").addClass("show");
        $("#RegistroProduccionINYURL").addClass("selected-item");
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

        UIManager_INY.ajustarAlturaCard();  // 🔥 agregar esta línea

        $('#FiltroFechaInicio').val(DateUtils.obtenerPrimerDiaMesActual());
        $('#FiltroFechaFin').val(DateUtils.obtenerUltimoDiaMesActual());
        console.log('✅ UI INY inicializada');
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
// APLICACIÓN PRINCIPAL - GESTIÓN INY
// ========================================
class GestionProduccionINY extends GestionProduccionBase {
    constructor(datos_usuario, URLBase) {
        super(datos_usuario, URLBase, 110); // 🔥 ID_PROCESO distinto al PVC
        this.URLBaseMantenimientosCorrectivos = "MantenimientosCorrectivos";
        this.URLBaseMantenimientosPreventivos = "MantenimientosPreventivos";
        // 🔥 TODO: reemplazar con el ID_AREA real de INY PL2
        this.ID_AREA_CORRECTIVOS = (datos_usuario[0].PLANTA == "1" ? 15 : 15); // 🔥 INY Se dejo el mismo por que no existe INYECCION para planta 1
        this.ID_AREA_PREVENTIVOS = (datos_usuario[0].PLANTA == "1" ? 15 : 15); // 🔥 INY Se dejo el mismo por que no existe INYECCION para planta 1
        this.tipoProcesoActual = 'INYECCION';

        // ✅ Mapa de líneas INY P2: Match ya que en NW vienen diferentes
        this.MAPA_LINEAS_INY = {
            21: 'LÍNEA 1 INY',
            22: 'LÍNEA 2 INY',
            23: 'LÍNEA 3 INY',
            24: 'LÍNEA 4 INY',
            25: 'LÍNEA 5 INY',
            26: 'LÍNEA 6 INY',
            27: 'LÍNEA 7 INY',
            28: 'LÍNEA 8 INY',
            29: 'LÍNEA 9 INY'
        };
    }

    async inicializar() {
        await this.inicializarCommon();
        // 🔥 Habilitar menú contextual del grid
        this.configurarMenuContextual();
        // Inicializar gestor de correos
        this.correctosManager = new CorreosManagerINY();
        this.correctosManager.setAppProduccion(this);
        this.correctosManager.inicializar();
        EquiposUtil.llenarLineas(
            this.datos_usuario[0].PLANTA,
            (this.datos_usuario[0].PLANTA == "1" ? 15 : 15),
            1, //produccion
            "FiltroLinea",
            null,
            null,
            false
        );

        this.consultarDatos();

        // 🔥 NUEVO: Inicializar HUB para bitácoras (igual que PVC)
        this.initHubBitacoras();

        console.log('✅ Sistema INY inicializado');
    }

    // ========================================
    // TEMPLATE DE TOTALES
    // ========================================
    crearTotalesTemplate() {
        return {
            // GENERALES
            Mes: null,
            Fecha: null,
            Linea: null,
            Inyectora: null,
            Producto: null,
            Descripcion: null,
            OP: null,
            Turno: null,
            Grupo: null,
            // PRODUCCIÓN
            TRLiberados: 0,
            ProduccionNeta: 0,
            ScrapSinColada: 0,
            ScrapColada: 0,
            TotalScrap: 0,
            // DISPONIBILIDAD
            HorasProgramadas: 0,
            // TIEMPO NO DISPONIBLE
            Preventivo: 0,
            ControlInventarios: 0,
            FaltaMateriaPrima: 0,
            PreparacionLinea: 0,
            // TIEMPO NO PRODUCTIVO
            TiempoMuertoCorrectivos: 0,
            TiempoMuertoHerramentales: 0,
            TiempoMuertoArranques: 0,
            FallaMaterial: 0,
            FaltaPersonal: 0,
            FallaElectrica: 0,
            TiempoMuertoProceso: 0,
            // KPIS
            TiempoDisponible: 0,
            TiempoProductivo: 0,
            PorcentajeDisponibilidad: 0,
            PesoMinimo: 0,
            KgHrLinea: null,
            KgHrProducto: null,
            KgPorTiempoDisponible: 0,
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
    // DATOS INICIALES (fila placeholder)
    // ========================================
    cargarDatosIniciales() {
        this.datosOriginales = [
            {
                id: 1,
                // GENERALES
                Mes: null,
                Fecha: null,
                Linea: null,
                Inyectora: null,
                Producto: null,
                Descripcion: null,
                OP: null,
                Turno: null,
                Grupo: null,
                // PRODUCCIÓN
                TRLiberados: null,
                ProduccionNeta: null,
                ScrapSinColada: null,
                ScrapColada: null,
                TotalScrap: 0,
                // DISPONIBILIDAD
                HorasProgramadas: null,
                // TIEMPO NO DISPONIBLE
                Preventivo: null,
                ControlInventarios: null,
                FaltaMateriaPrima: null,
                PreparacionLinea: null,
                // TIEMPO NO PRODUCTIVO
                TiempoMuertoCorrectivos: null,
                TiempoMuertoHerramentales: null,
                TiempoMuertoArranques: null,
                FallaMaterial: null,
                FaltaPersonal: null,
                FallaElectrica: null,
                TiempoMuertoProceso: null,
                // KPIS
                TiempoDisponible: null,
                TiempoProductivo: null,
                PorcentajeDisponibilidad: null,
                PesoMinimo: 0,
                KgHrLinea: null,
                KgHrProducto: null,
                KgPorTiempoDisponible: 0,
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
            let FiltroLinea = $("#FiltroLinea").val() || null;
            let FiltroTurno = $("#FiltroTurno").val() || null;
            let FiltroProducto = $("#FiltroProducto").val() || '';

            const response = await $.ajax({
                url: `/${this.URLBase}/GetTiemposMuertosINY`,
                type: "GET",
                data: {
                    FiltroFechaInicio, FiltroFechaFin, FiltroPlanta: Planta,
                    FiltroLinea, FiltroTurno, FiltroProducto
                }
            });

            let datosFormateados = [];
            let hayDatosOriginales = false;

            if (response.Status === "OK") {
                const datos = JSON.parse(response.Data);
                datosFormateados = this.formatearDatos(datos);
                hayDatosOriginales = datosFormateados.length > 0;
                if (hayDatosOriginales) {
                    this.gridApi.setRowData(datosFormateados);
                    this.inicializarTooltipsGrid();
                }
            } else {
                this.gridApi.setRowData([]);
            }

            if (hayDatosOriginales) {
                const elColapso = document.getElementById('colapseFiltros');
                if (elColapso && elColapso.classList.contains('show')) {
                    new bootstrap.Collapse(elColapso, { toggle: false }).hide();
                }
            }

            // ✅ AHORA pasando datosFormateados para acumular ANTES de pintar
            const seAgregaronCorrectivos = await this.traerCorrectivosCerrados(FiltroFechaInicio, FiltroFechaFin, FiltroLinea, datosFormateados);
            const seAgregaronPreventivos = await this.traerPreventivosCerrados(FiltroFechaInicio, FiltroFechaFin, FiltroLinea, datosFormateados);

            const productosTerminados = await this.ObtenerProductoTerminado(null, null, FiltroTurno, 'INY');
            const seAgregaronProductosTerminados = await this.agregarProductosTerminadosAlGrid(productosTerminados, FiltroTurno, false);

            const seAgregaronParos = await this.traerParosProduccionCerrados(FiltroFechaInicio, FiltroFechaFin, FiltroLinea, datosFormateados);

            if (!hayDatosOriginales && !seAgregaronCorrectivos && !seAgregaronPreventivos && !seAgregaronProductosTerminados && !seAgregaronParos) {
                this.gridApi.setRowData([]);
            }

            this.reordenarGridPorLinea();
            this.agregarFilaTotales();

        } catch (error) {
            console.error(error);
            AlertManager.mostrar("Error al consultar datos", "danger");
        } finally {
            setTimeout(() => $("#tablaProduccion").removeClass("d-none"), 1000);
            setTimeout(() => GlobalUtil.mostrarLoader(false), 1000);
        }
    }

    // ✅ NUEVO: Método auxiliar para formatear datos (extraído de cargarDatosGrid)
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
                Mes: item.MES || this.obtenerNombreMes(item.FECHA),
                Fecha: item.FECHA,
                Linea: item.LINEA,
                Inyectora: item.INYECTORA,
                Producto: item.PRODUCTO,
                Comentarios: item.COMENTARIOS,
                Descripcion: item.DESCRIPCION,
                OP: item.OP,
                Turno: item.TURNO,
                Grupo: item.GRUPO,
                TRLiberados: item.TR_LIBERADOS,
                ProduccionNeta: item.PRODUCCION_NETA,
                ScrapSinColada: item.SCRAP_SIN_COLADA,
                ScrapColada: item.SCRAP_COLADA,
                TotalScrap: item.TOTAL_SCRAP,
                HorasProgramadas: item.HORAS_PROGRAMADAS,
                Preventivo: item.PREVENTIVO,
                ControlInventarios: item.CONTROL_INVENTARIOS,
                FaltaMateriaPrima: item.FALTA_MATERIA_PRIMA,
                PreparacionLinea: item.PREPARACION_LINEA,
                TiempoMuertoCorrectivos: item.TIEMPO_MUERTO_CORRECTIVOS,
                TiempoMuertoHerramentales: item.TIEMPO_MUERTO_HERRAMENTALES,
                TiempoMuertoArranques: item.TIEMPO_MUERTO_ARRANQUES,
                FallaMaterial: item.FALLA_MATERIAL,
                FaltaPersonal: item.FALTA_PERSONAL,
                FallaElectrica: item.FALLA_ELECTRICA,
                TiempoMuertoProceso: item.TIEMPO_MUERTO_PROCESO,
                TiempoDisponible: item.TIEMPO_DISPONIBLE || 0,
                TiempoProductivo: item.TIEMPO_PRODUCTIVO || 0,
                PorcentajeDisponibilidad: item.PORCENTAJE_DISPONIBILIDAD || 0,
                PesoMinimo: item.PESO_MINIMO || 0,
                KgHrLinea: item.KG_HR_LINEA || 0,
                KgHrProducto: item.KG_HR_PRODUCTO || 0,
                KgPorTiempoDisponible: item.KG_POR_TIEMPO_DISPONIBLE || 0,
                KgNetosHrReales: item.KG_NETOS_HR_REALES || 0,
                PorcentajeRendimiento: item.PORCENTAJE_RENDIMIENTO || 0,
                PorcentajeCalidad: item.PORCENTAJE_CALIDAD || 0,
                PorcentajeOEE: item.PORCENTAJE_OEE || 0,
                PorcentajeEficienciaProducto: item.PORCENTAJE_EFICIENCIA_PRODUCTO || 0,
                ObjetivoEficiencia: item.OBJETIVO_EFICIENCIA || 91,
                EficienciaOperativa: item.EFICIENCIA_OPERATIVA || 0
            };

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
                fila._marcador = '🚫'; // 👈 unificado con PVC/PEAD/Corrugado (era ⛔)
                fila._rowClass = 'row-paro';
            }

            return fila;
        });
    }

    initHubBitacoras() {
        const self = this;
        const hub = $.connection.mantenimientoHub;
        let modalActualizacion = null;

        const miRol = self.datos_usuario[0].TIPOUSUARIO;

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

        const $modalEl = document.getElementById('actualizacionDatosModalBitacoras');
        if ($modalEl) {
            modalActualizacion = new bootstrap.Modal($modalEl, { backdrop: 'static', keyboard: false });

            document.getElementById('btnConfirmarActualizacionBitacoras')
                .addEventListener('click', function () {
                    modalActualizacion.hide();
                    document.querySelectorAll('.modal.show').forEach(function (modalAbierto) {
                        var instancia = bootstrap.Modal.getInstance(modalAbierto);
                        if (instancia) instancia.hide();
                    });
                    self.consultarDatos();
                });
        }

        hub.client.actualizarTablaBitacoras = function (rolQueCambio, tipoActualizacion = 'CORRECTIVOS') {
            console.warn("📡 Actualización de Bitácoras desde SignalR (INY) | Origen:", rolQueCambio || "desconocido", "| Tipo:", tipoActualizacion);

            if ($modalEl && $modalEl.classList.contains('show')) return;

            if ($modalEl && mensajesPorTipo[tipoActualizacion]) {
                const mensaje = mensajesPorTipo[tipoActualizacion];

                const $subtituloEl = $modalEl.querySelector('.modal-subtitle-custom');
                if ($subtituloEl) $subtituloEl.textContent = mensaje.titulo;

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

            modalActualizacion ? modalActualizacion.show() : self.consultarDatos();
        };

        $.connection.hub.start({
            transport: ['webSockets', 'longPolling']
        }).done(function () {
            console.log("✅ SignalR conectado para Bitácoras (INY) | Rol:", miRol);
            console.log("🚚 Transporte:", $.connection.hub.transport.name);
        }).fail(function (error) {
            console.error("❌ Error al conectar SignalR (INY):", error);
        });

        $.connection.hub.reconnecting(function () {
            console.warn("🔄 SignalR reconectando (INY)...");
        });

        $.connection.hub.reconnected(function () {
            console.info("✅ SignalR reconectado (INY) | Rol:", miRol);
            self.consultarDatos();
        });
    }

    reordenarGridPorLinea() {
        // 1. Sacar todos los datos del grid (menos TOTALES)
        const todasLasFilas = [];
        this.gridApi.forEachNode(node => {
            if (node.data?.id !== 'TOTALES') {
                todasLasFilas.push(node.data);
            }
        });

        // 2. Ordenar por línea (extrae el número de "Linea 1 PVC" → 1)
        todasLasFilas.sort((a, b) => {
            const extraerNumero = (linea) => {
                if (!linea) return 9999;
                const match = linea.match(/\d+/);
                return match ? parseInt(match[0]) : 9999;
            };
            return extraerNumero(a.Linea) - extraerNumero(b.Linea);
        });

        // 3. Repintar el grid con el orden nuevo
        this.gridApi.setRowData(todasLasFilas);
    }

    // ========================================
    // TRAER CORRECTIVOS CERRADOS
    // ========================================
    async traerCorrectivosCerrados(fechaInicio, fechaFin, linea, datosFormateados = []) {
        try {
            GlobalUtil.mostrarLoader(true);
            const response = await $.ajax({
                url: `/${this.URLBaseMantenimientosCorrectivos}/GetMantenimientosCorrectivosPendientes`,
                type: "POST",
                data: {
                    draw: 1, length: 999999, start: 0, "search[value]": "",
                    FiltroSolicitud: "", FiltroFechaInicio: fechaInicio, FiltroFechaFin: fechaFin,
                    FiltroArea: this.ID_AREA_CORRECTIVOS, FiltroLinea: linea || "",
                    FiltroOrdenTrabajo: "", FiltroPlanta: this.datos_usuario[0].PLANTA,
                    FiltroEstatusOT: "4", FiltroExcluirSincronizadosINY: "S"
                }
            });

            const correctivos = response.data || [];
            if (correctivos.length === 0) return false;

            return this.agregarCorrectivosAlGridEnMemoria(correctivos, datosFormateados);

        } catch (error) {
            console.error(error);
            AlertManager.mostrar("Error al consultar mantenimientos correctivos", "danger");
            return false;
        } finally {
            GlobalUtil.mostrarLoader(false);
        }
    }

    // ✅ NUEVO: Agrupar correctivos por Fecha + Línea + tipoTiempo (Herramentales vs Correctivos)
    agruparCorrectivos(correctivos) {
        const grupos = {};

        correctivos.forEach(item => {
            const fecha = this.parsearFechaCorrectivo(item.FechaCreacion);
            const tipoTiempo = item.AreaTecnica === 'MANTENIMIENTO HERRAMENTALES'
                ? 'TiempoMuertoHerramentales'
                : 'TiempoMuertoCorrectivos';

            const lineaEncontrada = this.listaLineas.find(l => String(l.value) === String(item.IdLineaProduccion));
            const nombreLinea = lineaEncontrada ? lineaEncontrada.label : null;

            const clave = `${fecha}|${nombreLinea}|${tipoTiempo}`;

            if (!grupos[clave]) {
                grupos[clave] = {
                    fecha, nombreLinea, tipoTiempo,
                    tiempoTotal: 0, otmcList: [], items: [], sinLinea: false, nombreEquipo: item.NombreEquipo || ''
                };
            }

            const tiempoCalculado = Number(GlobalUtil.calcularDiferenciaHoras(item.HoraApertura, item.HoraCierreMan)) || 0;
            grupos[clave].tiempoTotal += tiempoCalculado;
            grupos[clave].otmcList.push(item.NumeroOrden);
            grupos[clave].items.push(item);

            if (!nombreLinea) grupos[clave].sinLinea = true;
        });

        return Object.values(grupos);
    }

    // ✅ NUEVO: Acumular correctivos EN MEMORIA (antes de setRowData)
    agregarCorrectivosAlGridEnMemoria(correctivos, datosFormateados) {
        if (!datosFormateados) datosFormateados = [];

        const otmcYaEnDatos = new Set();
        datosFormateados.forEach(fila => {
            if (fila.OTMC) {
                String(fila.OTMC).split('|').filter(o => o.trim()).forEach(o => otmcYaEnDatos.add(String(o).trim()));
            }
        });

        const correctivosNuevos = correctivos.filter(item => !otmcYaEnDatos.has(String(item.NumeroOrden).trim()));
        if (correctivosNuevos.length === 0) return false;

        const gruposCorrectivos = this.agruparCorrectivos(correctivosNuevos);
        const filasNuevas = [];
        const lineasNoEncontradas = [];

        const normalizarFecha = (fechaStr) => {
            if (!fechaStr) return null;
            return typeof fechaStr === 'string' ? fechaStr.split('T')[0] : fechaStr;
        };

        gruposCorrectivos.forEach(grupo => {
            const { fecha, nombreLinea, tipoTiempo, tiempoTotal, otmcList, sinLinea, nombreEquipo } = grupo;

            if (sinLinea) lineasNoEncontradas.push(...otmcList);

            let filaExistente = datosFormateados.find(fila =>
                normalizarFecha(fila.Fecha) === fecha &&
                fila.Linea === nombreLinea &&
                (fila._origen === 'CORRECTIVO' || fila.OTMC)
            );

            if (filaExistente) {
                filaExistente[tipoTiempo] = (filaExistente[tipoTiempo] || 0) + tiempoTotal;

                let otmcActual = filaExistente.OTMC || '';
                if (typeof otmcActual === 'string' && otmcActual.startsWith('[')) {
                    try {
                        const parsed = JSON.parse(otmcActual);
                        otmcActual = Array.isArray(parsed) ? parsed.join('|') : otmcActual;
                    } catch (e) { /* mantener */ }
                }

                const ordenesGrupo = otmcList.join('|');
                filaExistente.OTMC = otmcActual ? `${otmcActual}|${ordenesGrupo}` : ordenesGrupo;

                this.recalcularFila(filaExistente);
            } else {
                const nuevaFila = this.crearFilaVacia();
                nuevaFila.id = this.generarIdTemporal();
                nuevaFila.OTMC = otmcList.join('|');
                nuevaFila.Fecha = fecha;
                nuevaFila[tipoTiempo] = tiempoTotal;
                nuevaFila._origen = 'CORRECTIVO';
                nuevaFila._marcador = '🔧';
                nuevaFila._rowClass = 'row-correctivo';
                nuevaFila._esNuevo = true;
                nuevaFila.Linea = nombreLinea;
                nuevaFila.Inyectora = nombreEquipo;
                nuevaFila.Mes = this.obtenerNombreMes(nuevaFila.Fecha);

                this.recalcularFila(nuevaFila);
                filasNuevas.push(nuevaFila);
            }
        });

        if (filasNuevas.length > 0) datosFormateados.push(...filasNuevas);

        if (lineasNoEncontradas.length > 0) {
            AlertManager.mostrar(`Las siguientes órdenes no tienen línea reconocida y quedaron sin línea asignada: ${lineasNoEncontradas.join(', ')}`, "warning");
        }

        this.gridApi.setRowData(datosFormateados);
        this.inicializarTooltipsGrid();

        return filasNuevas.length > 0;
    }

    // ========================================
    // TRAER PREVENTIVOS CERRADOS
    // ========================================
    async traerPreventivosCerrados(fechaInicio, fechaFin, linea, datosFormateados = []) {
        try {
            GlobalUtil.mostrarLoader(true);
            const response = await $.ajax({
                url: `/${this.URLBaseMantenimientosPreventivos}/GetMantenimientosPorRango`,
                type: "POST",
                data: {
                    draw: 1, length: 999999, start: 0, "search[value]": "",
                    FiltroFechaInicio: fechaInicio, FiltroFechaFin: fechaFin,
                    FiltroArea: this.ID_AREA_PREVENTIVOS, FiltroLinea: linea || "",
                    FiltroOrdenTrabajo: "", FiltroPeriodicidad: "",
                    FiltroPlanta: this.datos_usuario[0].PLANTA, FiltroEstatusOT: "4",
                    FiltroUsuario: "", FiltroTipoUsuario: this.datos_usuario[0].TIPO_USUARIO,
                    FiltroExcluirSincronizadosINY: "S"
                }
            });

            const preventivos = response.data || [];
            if (preventivos.length === 0) return false;

            return this.agregarPreventivosAlGridEnMemoria(preventivos, datosFormateados);

        } catch (error) {
            console.error(error);
            AlertManager.mostrar("Error al consultar mantenimientos preventivos", "danger");
            return false;
        } finally {
            GlobalUtil.mostrarLoader(false);
        }
    }

    // ✅ NUEVO: Agrupar preventivos por Fecha + Línea
    agruparPreventivos(preventivos) {
        const grupos = {};

        preventivos.forEach(item => {
            const fecha = this.parsearFechaPreventivo(item.FechaInicioMantenimiento);

            const lineaEncontrada = this.listaLineas.find(l => String(l.value) === String(item.IdLineaProduccion));
            const nombreLinea = lineaEncontrada ? lineaEncontrada.label : null;

            const clave = `${fecha}|${nombreLinea}`;

            if (!grupos[clave]) {
                grupos[clave] = {
                    fecha, nombreLinea, tiempoTotal: 0, otmpList: [], items: [],
                    sinLinea: false, nombreEquipo: item.NombreEquipo || ''
                };
            }

            const duracionHrs = Number(item.DuracionHrs) || 0;
            grupos[clave].tiempoTotal += duracionHrs;
            grupos[clave].otmpList.push(item.NumeroOrden);
            grupos[clave].items.push(item);

            if (!nombreLinea) grupos[clave].sinLinea = true;
        });

        return Object.values(grupos);
    }

    // ✅ NUEVO: Acumular preventivos EN MEMORIA
    agregarPreventivosAlGridEnMemoria(preventivos, datosFormateados) {
        if (!datosFormateados) datosFormateados = [];

        const otmpYaEnDatos = new Set();
        datosFormateados.forEach(fila => {
            if (fila.OTMP) {
                String(fila.OTMP).split('|').filter(o => o.trim()).forEach(o => otmpYaEnDatos.add(String(o).trim()));
            }
        });

        const preventivosNuevos = preventivos.filter(item => !otmpYaEnDatos.has(String(item.NumeroOrden).trim()));
        if (preventivosNuevos.length === 0) return false;

        const gruposPreventivos = this.agruparPreventivos(preventivosNuevos);
        const filasNuevas = [];
        const lineasNoEncontradas = [];

        const normalizarFecha = (fechaStr) => {
            if (!fechaStr) return null;
            return typeof fechaStr === 'string' ? fechaStr.split('T')[0] : fechaStr;
        };

        gruposPreventivos.forEach(grupo => {
            const { fecha, nombreLinea, tiempoTotal, otmpList, sinLinea, nombreEquipo } = grupo;

            if (sinLinea) lineasNoEncontradas.push(...otmpList);

            let filaExistente = datosFormateados.find(fila =>
                normalizarFecha(fila.Fecha) === fecha &&
                fila.Linea === nombreLinea &&
                (fila._origen === 'PREVENTIVO' || fila.OTMP)
            );

            if (filaExistente) {
                filaExistente.Preventivo = (filaExistente.Preventivo || 0) + tiempoTotal;

                let otmpActual = filaExistente.OTMP || '';
                if (typeof otmpActual === 'string' && otmpActual.startsWith('[')) {
                    try {
                        const parsed = JSON.parse(otmpActual);
                        otmpActual = Array.isArray(parsed) ? parsed.join('|') : otmpActual;
                    } catch (e) { /* mantener */ }
                }

                const ordenesGrupo = otmpList.join('|');
                filaExistente.OTMP = otmpActual ? `${otmpActual}|${ordenesGrupo}` : ordenesGrupo;

                this.recalcularFila(filaExistente);
            } else {
                const nuevaFila = this.crearFilaVacia();
                nuevaFila.id = this.generarIdTemporal();
                nuevaFila.OTMP = otmpList.join('|');
                nuevaFila.Fecha = fecha;
                nuevaFila.Preventivo = tiempoTotal;
                nuevaFila._origen = 'PREVENTIVO';
                nuevaFila._marcador = '🛠️';
                nuevaFila._rowClass = 'row-preventivo';
                nuevaFila._esNuevo = true;
                nuevaFila.Linea = nombreLinea;
                nuevaFila.Inyectora = nombreEquipo;
                nuevaFila.Mes = this.obtenerNombreMes(nuevaFila.Fecha);

                this.recalcularFila(nuevaFila);
                filasNuevas.push(nuevaFila);
            }
        });

        if (filasNuevas.length > 0) datosFormateados.push(...filasNuevas);

        if (lineasNoEncontradas.length > 0) {
            AlertManager.mostrar(`Las siguientes órdenes no tienen línea reconocida y quedaron sin línea asignada: ${lineasNoEncontradas.join(', ')}`, "warning");
        }

        this.gridApi.setRowData(datosFormateados);
        this.inicializarTooltipsGrid();

        return filasNuevas.length > 0;
    }

    // ========================================
    // PARSERS DE FECHA (reutilizados del PVC)
    // ========================================
    parsearFechaPreventivo(fechaTexto) {
        if (!fechaTexto) return null;
        try {
            if (fechaTexto.includes('-')) {
                const fecha = new Date(fechaTexto);
                if (isNaN(fecha.getTime())) return null;
                const ano = fecha.getFullYear();
                const mes = String(fecha.getMonth() + 1).padStart(2, '0');
                const dia = String(fecha.getDate()).padStart(2, '0');
                return `${ano}-${mes}-${dia}`;
            }
            const [dia, mes, anio] = fechaTexto.split('/');
            if (!dia || !mes || !anio) return null;
            return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
        } catch (error) {
            console.error("Error al parsear fecha preventivo:", error);
            return null;
        }
    }

    parsearFechaCorrectivo(fechaTexto) {
        if (!fechaTexto) return null;
        const [fechaParte] = fechaTexto.split(' ');
        const [dia, mes, anio] = fechaParte.split('/');
        if (!dia || !mes || !anio) return null;
        return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    }

    // ========================================
    // 🟦 NUEVO: Traer Paros de Producción y agregarlos al Grid
    // ========================================
    async traerParosProduccionCerrados(fechaInicio, fechaFin, linea, datosFormateados = []) {
        try {
            GlobalUtil.mostrarLoader(true);
            const response = await $.ajax({
                url: `/${this.URLBase}/obtenerParosProduccionSS`,
                type: "POST",
                data: {
                    draw: 1, length: 999999, start: 0,
                    FiltroFechaInicio: fechaInicio, FiltroFechaFin: fechaFin,
                    FiltroLinea: linea || "", FiltroEstatus: "",
                    FiltroPlanta: this.datos_usuario[0].PLANTA,
                    "FiltroArea": (this.datos_usuario[0].PLANTA == 1 ? 15 : 15) || null,
                    "FiltroIncluirCorrectivo": null,
                    "FiltroTipoLinea": 'INY'
                }
            });

            const paros = response.data || [];
            if (paros.length === 0) return false;

            return this.agregarParosAlGridEnMemoria(paros, datosFormateados);

        } catch (error) {
            console.error(error);
            AlertManager.mostrar("Error al consultar paros de producción", "danger");
            return false;
        } finally {
            GlobalUtil.mostrarLoader(false);
        }
    }

    // 🆕 REEMPLAZAR agruparParos en GestionProduccionINY
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
                    categorias: {}, // 🆕 acumulador dinámico igual que PVC/PEAD/Corrugado
                    idParoList: [],
                    items: [],
                    sinLinea: false
                };
            }

            const duracionHrs = Number(item.DURACION_HRS) || 0;

            if (columnaCategoria) {
                grupos[clave].categorias[columnaCategoria] =
                    (grupos[clave].categorias[columnaCategoria] || 0) + duracionHrs; // 🆕
            } else {
                console.warn(`⚠️ Paro ID ${item.ID_PARO} con categoría "${item.CATEGORIA}" no mapeada — se registra ID sin sumar horas`);
            }

            grupos[clave].idParoList.push(String(item.ID_PARO));
            grupos[clave].items.push(item);

            if (!nombreLinea) grupos[clave].sinLinea = true;
        });

        return Object.values(grupos);
    }

    // 🆕 REEMPLAZAR agregarParosAlGridEnMemoria en GestionProduccionINY
    agregarParosAlGridEnMemoria(paros, datosFormateados) {
        if (!datosFormateados) datosFormateados = [];

        const idParoYaEnDatos = new Set();
        datosFormateados.forEach(fila => {
            if (fila.ID_PARO) {
                String(fila.ID_PARO).split('|').filter(o => o.trim())
                    .forEach(o => idParoYaEnDatos.add(String(o).trim()));
            }
        });

        const parosNuevos = paros.filter(
            item => !idParoYaEnDatos.has(String(item.ID_PARO).trim())
        );
        if (parosNuevos.length === 0) return false;

        const gruposParos = this.agruparParos(parosNuevos);
        const filasNuevas = [];
        const lineasNoEncontradas = [];

        const normalizarFecha = (fechaStr) => {
            if (!fechaStr) return null;
            return typeof fechaStr === 'string' ? fechaStr.split('T')[0] : fechaStr;
        };

        gruposParos.forEach(grupo => {
            const { fecha, nombreLinea, categorias, idParoList, sinLinea } = grupo;

            if (sinLinea) lineasNoEncontradas.push(...idParoList);

            let filaExistente = datosFormateados.find(fila =>
                normalizarFecha(fila.Fecha) === fecha &&
                fila.Linea === nombreLinea &&
                (fila._origen === 'PARO_MANUAL' || fila.ID_PARO)
            );

            const categoriasKeys = Object.keys(categorias);

            if (filaExistente) {
                // 🆕 Acumula dinámicamente cada categoría
                categoriasKeys.forEach(col => {
                    filaExistente[col] = (filaExistente[col] || 0) + categorias[col];
                });

                let idParoActual = filaExistente.ID_PARO || '';
                const idsGrupo = idParoList.join('|');
                filaExistente.ID_PARO = idParoActual ? `${idParoActual}|${idsGrupo}` : idsGrupo;

                this.recalcularFila(filaExistente);
            } else if (categoriasKeys.length > 0) {
                const nuevaFila = this.crearFilaVacia();
                nuevaFila.id = this.generarIdTemporal();
                nuevaFila.ID_PARO = idParoList.join('|');
                nuevaFila.Fecha = fecha;
                nuevaFila._origen = 'PARO_MANUAL';
                nuevaFila._marcador = '🚫';
                nuevaFila._rowClass = 'row-paro';
                nuevaFila._esNuevo = true;
                nuevaFila.Linea = nombreLinea;

                // 🆕 Asigna dinámicamente cada categoría
                categoriasKeys.forEach(col => {
                    nuevaFila[col] = categorias[col];
                });

                const primerItem = grupo.items[0];
                if (primerItem.ARTICULO) nuevaFila.Producto = primerItem.ARTICULO;
                if (primerItem.ARTICULO_DESC) nuevaFila.Descripcion = primerItem.ARTICULO_DESC;
                if (primerItem.PESO_MINIMO) nuevaFila.PesoMinimo = primerItem.PESO_MINIMO;
                if (primerItem.KGS_DIA) {
                    nuevaFila.KgHrProducto = parseFloat(primerItem.KGS_DIA) / 24 || 0;
                    nuevaFila.KgHrLinea = parseFloat(primerItem.KGS_DIA) / 24 || 0;
                }

                nuevaFila.Mes = this.obtenerNombreMes(nuevaFila.Fecha);

                this.recalcularFila(nuevaFila);
                filasNuevas.push(nuevaFila);
            } else {
                console.warn(`⚠️ Grupo (${fecha} - ${nombreLinea}) sin categorías mapeadas — IDs: ${idParoList.join(', ')}`);
            }
        });

        if (filasNuevas.length > 0) datosFormateados.push(...filasNuevas);

        if (lineasNoEncontradas.length > 0) {
            AlertManager.mostrar(
                `Los siguientes paros no tienen línea reconocida: ${lineasNoEncontradas.join(', ')}`,
                "warning"
            );
        }

        this.gridApi.setRowData(datosFormateados);
        this.inicializarTooltipsGrid();

        return filasNuevas.length > 0;
    }

    // ========================================
    // 🟦 NUEVO: Mapear Categoría del Paro a Columna del Grid (Inyección)
    // ========================================
    mapearCategoriaParoAColumna(categoria) {

        if (!categoria) return null;

        // 🟦 Normalizar: convertir a mayúsculas y remover acentos
        const categoriaNormalizada = categoria
            .toUpperCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();

        // 🟦 Mapeo 1:1 directo con columnas de TIEMPO NO PRODUCTIVO (Inyección)
        // 7 columnas: TiempoMuertoCorrectivos, TiempoMuertoHerramentales, TiempoMuertoArranques, 
        //             FallaMaterial, FaltaPersonal, FallaElectrica, TiempoMuertoProceso
        const mapeo = {
            // MTTO CORRECTIVOS (Row 8)
            'MTTO CORRECTIVOS': 'TiempoMuertoCorrectivos',
            'MTTO. CORRECTIVOS': 'TiempoMuertoCorrectivos',

            // HERRAMENTAL (Row 12)
            'HERRAMENTAL': 'TiempoMuertoHerramentales',

            // ARRANQUE (rows 6, 7, 20, 23)
            'PARO Y ARRANQUE NO PROGRAMADO': 'TiempoMuertoArranques',
            'ARRANQUE Y ESTABILIZACION (HR)': 'TiempoMuertoArranques',
            'ARRANQUE Y ESTABILIZACION DE LINEA': 'TiempoMuertoArranques',
            'TIEMPO MUERTO POR ARRANQUES': 'TiempoMuertoArranques',

            // FALLA DE MATERIAL (Row 15)
            'FALLA DE MATERIAL': 'FallaMaterial',
            'FALLA MATERIAL': 'FallaMaterial',
            'FALTA DE MATERIAL': 'FallaMaterial',
            'FALTA MATERIAL': 'FallaMaterial',

            // FALTA DE PERSONAL (Row 16)
            'FALTA DE PERSONAL': 'FaltaPersonal',
            'FALTA PERSONAL': 'FaltaPersonal',

            // FALLA ELECTRICA (Row 9)
            'FALLA ELECTRICA': 'FallaElectrica',
            'FALLA ELÉCTRICA': 'FallaElectrica',

            // FALLA DE OPERACIÓN (Row 13)
            'FALLA DE OPERACION': 'TiempoMuertoProceso',
            'FALLA DE OPERACIÓN': 'TiempoMuertoProceso',
            'FALLA OPERACION': 'TiempoMuertoProceso',
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

    // ========================================
    // 🔥 NUEVO: Obtener nombre del mes a partir de una fecha
    // ========================================
    obtenerNombreMes(fecha) {
        if (!fecha) return null;
        const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO',
            'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
        return meses[new Date(fecha).getMonth()];
    }

    // ========================================
    // OBTENER PRODUCTO TERMINADO
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
                productosTerminados = typeof response.Data === 'string'
                    ? JSON.parse(response.Data)
                    : response.Data;
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
    // 🔥 Métodos wrapper para validación de Productos Terminados
    // ========================================
    async validarProductosTerminadosExistentes(ids, tipoProceso) {
        return await ProductosTerminadosHelper.validarProductosTerminadosExistentes(ids, tipoProceso, this.URLBase);
    }

    mostrarModalProductosOmitidos(productosOmitidos) {
        ProductosTerminadosHelper.mostrarModalProductosOmitidos(productosOmitidos);
    }

    formatearFechaCreacion(fechaCreacion) {
        return ProductosTerminadosHelper.formatearFechaCreacion(fechaCreacion);
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
                    lineaLabel = this.MAPA_LINEAS_INY ? this.MAPA_LINEAS_INY[item.Id_Linea] : null || null;
                }

                if (!lineaLabel) {
                    lineasNoEncontradas.push(`${item.Codigo} (Línea ${item.Id_Linea})`);
                    return;
                }

                const nodoExistente = nodosExistentes.get(String(item.Id));

                if (nodoExistente) {
                    const dataActualizada = { ...nodoExistente.data };

                    dataActualizada.Fecha = fecha;
                    dataActualizada.Producto = item.Codigo || '';
                    dataActualizada.Turno = String(item.Turno || '');
                    dataActualizada.TRLiberados = parseFloat(item.NumTubos) || 0;
                    dataActualizada.ProduccionNeta = parseFloat(item.PesoTotal) || 0;
                    dataActualizada.ScrapSinColada = parseFloat(item.ScrapTotal) || 0;
                    dataActualizada.ScrapColada = 0;
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
                    nuevaFila.ScrapSinColada = parseFloat(item.ScrapTotal) || 0;
                    nuevaFila.ScrapColada = 0;
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

    // ========================================
    // FILA VACÍA
    // ========================================
    crearFilaVacia() {
        return {
            id: null,
            // GENERALES
            Mes: null, Fecha: null, Linea: null, Inyectora: null, Producto: null,
            Descripcion: null, OP: null, Turno: null, Grupo: null,
            // PRODUCCIÓN
            TRLiberados: null, ProduccionNeta: null,
            ScrapSinColada: null, ScrapColada: null, TotalScrap: 0,
            // DISPONIBILIDAD
            HorasProgramadas: null,
            // TIEMPO NO DISPONIBLE
            Preventivo: null, ControlInventarios: null,
            FaltaMateriaPrima: null, PreparacionLinea: null,
            // TIEMPO NO PRODUCTIVO
            TiempoMuertoCorrectivos: null, TiempoMuertoHerramentales: null,
            TiempoMuertoArranques: null, FallaMaterial: null,
            FaltaPersonal: null, FallaElectrica: null, TiempoMuertoProceso: null,
            // KPIS
            TiempoDisponible: 0,
            TiempoProductivo: 0,
            PorcentajeDisponibilidad: 0,
            PesoMinimo: 0,
            // RENDIMIENTO Y OEE
            KgPorTiempoDisponible: 0,
            KgHrLinea: null,
            KgHrProducto: null,
            KgNetosHrReales: 0,
            PorcentajeRendimiento: 0,
            PorcentajeCalidad: 0,
            PorcentajeOEE: 0,
            ObjetivoEficiencia: 91,
            EficienciaOperativa: 0,
            PorcentajeEficienciaProducto: 0,
        };
    }

    // ========================================
    // INICIALIZAR GRID AG-GRID
    // ========================================
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
                        width: 170,
                        cellClass: 'celda-gris',
                        pinned: 'left',
                        // 🔥 Renderer con emoji + tooltip + punto pulsante
                        cellRenderer: params => {
                            if (!params.value || params.data?.id === 'TOTALES') return params.value || '';

                            const emoji = params.data?._marcador || '';
                            const origen = params.data?._origen;
                            const idRegistro = params.data?.ID_REGISTRO;

                            // ✅ Normalizar OTMC/OTMP para tooltip (puede venir en JSON o pipes)
                            const normalizarOrdenes = (ordenesStr) => {
                                if (!ordenesStr) return '';
                                if (typeof ordenesStr === 'string' && ordenesStr.startsWith('[')) {
                                    try {
                                        const parsed = JSON.parse(ordenesStr);
                                        return Array.isArray(parsed) ? parsed.join(', ') : ordenesStr;
                                    } catch (e) {
                                        return ordenesStr;
                                    }
                                }
                                return ordenesStr.split('|').join(', ');
                            };

                            // ✅ Normalizar ID_PARO con prefijo PAR- o COR- para tooltip
                            const normalizarParos = (parosStr, esPARO_CORRECTIVO = false) => {
                                if (!parosStr) return '';
                                const prefijo = esPARO_CORRECTIVO ? 'COR' : 'PAR';

                                if (typeof parosStr === 'string' && parosStr.startsWith('[')) {
                                    try {
                                        const parsed = JSON.parse(parosStr);
                                        return Array.isArray(parsed) ? parsed.map(p => `${prefijo}-${p}`).join(', ') : parosStr;
                                    } catch (e) {
                                        return parosStr;
                                    }
                                }
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
                            browserDatePicker: true,
                            min: '2020-01-01',
                            max: '2035-12-31'
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
                        width: 100,
                        cellClass: 'celda-azul',
                        pinned: 'left',
                        cellEditor: 'agSelectCellEditor',
                        cellEditorParams: () => ({
                            values: this.listaLineas.map(x => x.label)
                        })
                    },
                    {
                        field: 'Inyectora',
                        headerName: 'Inyectora',
                        editable: true,
                        width: 160,
                        cellClass: 'celda-azul',
                        pinned: 'left'
                    },
                    {
                        field: 'Producto',
                        headerName: 'Producto',
                        editable: true,
                        width: 180,
                        cellClass: 'celda-azul',
                        pinned: 'left',
                        cellEditor: 'articuloAutocompleteEditor',
                        tooltipField: 'Descripcion'
                    },
                    {
                        field: 'Descripcion',
                        headerName: 'Descripción',
                        editable: true,
                        width: 200,
                        cellClass: 'celda-gris'
                    },
                    {
                        field: 'OP',
                        headerName: 'OP',
                        editable: true,
                        width: 110,
                        cellClass: 'celda-azul'
                    },
                    {
                        field: 'Turno',
                        headerName: 'Turno',
                        editable: true,
                        width: 90,
                        cellClass: 'celda-azul'
                    },
                    {
                        field: 'Grupo',
                        headerName: 'Grupo',
                        editable: true,
                        width: 90,
                        cellClass: 'celda-azul',
                        cellEditor: 'agSelectCellEditor',
                        cellEditorParams: {
                            values: ['A', 'B', 'C', 'D']
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
                        field: 'TRLiberados',
                        headerName: 'TR LIBERADOS',
                        width: 120,
                        ...this.getColumnaNumerica('celda-blanca'),
                        editable: true
                    },
                    {
                        field: 'ProduccionNeta',
                        headerName: 'PRODUCCIÓN NETA',
                        width: 150,
                        ...this.getColumnaNumerica('celda-blanca'),
                        editable: true
                    },
                    {
                        field: 'ScrapSinColada',
                        headerName: 'SCRAP SIN COLADA',
                        width: 130,
                        ...this.getColumnaNumerica('celda-blanca'),
                        editable: true
                    },
                    {
                        field: 'ScrapColada',
                        headerName: 'SCRAP COLADA',
                        width: 130,
                        ...this.getColumnaNumerica('celda-blanca'),
                        editable: true
                    },
                    {
                        field: 'TotalScrap',
                        headerName: 'TOTAL SCRAP',
                        editable: false,
                        width: 120,
                        cellClass: 'celda-verde-formula',
                        valueFormatter: params => this.formatearNumero(params.value)
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
                        width: 140,
                        ...this.getColumnaNumerica('celda-blanca')
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
                        field: 'Preventivo',
                        headerName: 'PREVENTIVO',
                        width: 110,
                        ...this.getColumnaNumerica('celda-rosa'),
                        editable: false
                    },
                    {
                        field: 'ControlInventarios',
                        headerName: 'CONTROL DE INVENTARIOS',
                        width: 120,
                        ...this.getColumnaNumerica('celda-rosa')
                    },
                    {
                        field: 'FaltaMateriaPrima',
                        headerName: 'FALTA DE MATERIA PRIMA E INSUMOS',
                        width: 140,
                        ...this.getColumnaNumerica('celda-rosa')
                    },
                    {
                        field: 'PreparacionLinea',
                        headerName: 'PREPARACIÓN DE LÍNEA',
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
                        field: 'TiempoMuertoCorrectivos',
                        headerName: 'TIEMPO MUERTO CORRECTIVOS',
                        width: 130,
                        ...this.getColumnaNumerica('celda-verde-claro'),
                        editable: false
                    },
                    {
                        field: 'TiempoMuertoHerramentales',
                        headerName: 'TIEMPO MUERTO HERRAMENTALES',
                        width: 140,
                        ...this.getColumnaNumerica('celda-verde-claro')
                    },
                    {
                        field: 'TiempoMuertoArranques',
                        headerName: 'TIEMPO MUERTO ARRANQUES',
                        width: 130,
                        ...this.getColumnaNumerica('celda-verde-claro')
                    },
                    {
                        field: 'FallaMaterial',
                        headerName: 'FALLA DE MATERIAL',
                        width: 120,
                        ...this.getColumnaNumerica('celda-verde-claro')
                    },
                    {
                        field: 'FaltaPersonal',
                        headerName: 'FALTA DE PERSONAL',
                        width: 120,
                        ...this.getColumnaNumerica('celda-verde-claro')
                    },
                    {
                        field: 'FallaElectrica',
                        headerName: 'FALLA ELÉCTRICA',
                        width: 120,
                        ...this.getColumnaNumerica('celda-verde-claro')
                    },
                    {
                        field: 'TiempoMuertoProceso',
                        headerName: 'TIEMPO MUERTO PROCESO',
                        width: 130,
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
                        cellClass: 'celda-verde-fuerte',
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
                        field: 'PorcentajeDisponibilidad',
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
                        editable: false,
                        width: 150,
                        cellClass: 'celda-rosa',
                        valueFormatter: params => this.formatearNumero(params.value)
                    },

                    {
                        field: 'KgHrProducto',
                        headerName: 'KG/HR X PRODUCTO (historial)',
                        editable: false,
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
                        ...this.getColumnaPorcentaje('celda-amarilla')
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
                articuloAutocompleteEditor: ArticuloAutocompleteEditorINY
            },
            defaultColDef: {
                sortable: true,
                filter: true,
                resizable: true,
                editable: (params) => {
                    if (params.data && params.data.id === 'TOTALES') return false;

                    const readonlyFields = [
                        'Mes',
                        'TotalScrap',
                        'TiempoDisponible',
                        'TiempoProductivo',
                        'PorcentajeDisponibilidad'
                    ];

                    if (readonlyFields.includes(params.colDef.field)) return false;

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
                this.inicializarTooltipsGrid();
            },
            getRowStyle: params => {
                if (params.data && params.data.id === 'TOTALES') {
                    return {
                        fontWeight: 'bold',
                        backgroundColor: '#e9ecef',
                        borderTop: '2px solid #0058a1'
                    };
                }
                return null;
            },
            getRowClass: params => {
                if (params.data?.id === 'TOTALES') return 'fila-totales';
                if (params.data?._rowClass) return params.data._rowClass;
                return '';
            }
        };

        new agGrid.Grid(gridDiv, gridOptions);
    }

    inicializarTooltipsGrid() {
        setTimeout(() => {
            const tooltipElements = document.querySelectorAll('[data-bs-toggle="tooltip"]');
            tooltipElements.forEach(el => {
                const existingTooltip = bootstrap.Tooltip.getInstance(el);
                if (existingTooltip) existingTooltip.dispose();
                // Después
                new bootstrap.Tooltip(el, {
                    container: 'body'   // 🔥 Sale del scope del AG-Grid
                });
            });
        }, 100);
    }

    // ========================================
    // RECALCULAR FILA
    // ========================================
    recalcularFila(row) {
        if (row.Fecha) row.Mes = this.obtenerNombreMes(row.Fecha);
        row.TotalScrap = this.calcularTotalScrap(row);
        row.TiempoDisponible = this.calcularTiempoDisponible(row);
        row.TiempoProductivo = this.calcularTiempoProductivo(row);

        // 🆕 Unificar en PorcentajeDisponibilidad (nombre del campo en grid/SP)
        row.PorcentajeDisponibilidad = this.calcularPorcentajeDisponibilidad(row);
        row.DisponibilidadPorcentaje = row.PorcentajeDisponibilidad; // 🆕 alias por si algo lo lee

        row.KgPorTiempoDisponible = this.calcularKgPorTiempoDisponible(row);
        row.KgNetosHrReales = this.calcularKgNetosHrReales(row);
        row.PorcentajeRendimiento = this.calcularPorcentajeRendimiento(row);
        row.PorcentajeCalidad = this.calcularPorcentajeCalidad(row);
        row.PorcentajeOEE = this.calcularPorcentajeOEE(row);
        row.EficienciaOperativa = this.calcularEficienciaOperativa(row);
        row.PorcentajeEficienciaProducto = row.PorcentajeRendimiento; // igual que Excel DJ=DG, homologado con el resto
    }

    calcularTotalScrap(row) {
        return (parseFloat(row.ScrapSinColada) || 0) + (parseFloat(row.ScrapColada) || 0);
    }

    // 🆕 REEMPLAZAR calcularTiempoDisponible en GestionProduccionINY
    calcularTiempoDisponible(row) {
        const horas = parseFloat(row.HorasProgramadas) || 0;
        const tiempoNoDisponible =
            (parseFloat(row.Preventivo) || 0) +
            (parseFloat(row.ControlInventarios) || 0) +
            (parseFloat(row.FaltaMateriaPrima) || 0) +
            (parseFloat(row.PreparacionLinea) || 0);
        return Math.max(horas - tiempoNoDisponible, 0); // 🆕
    }

    // 🆕 REEMPLAZAR calcularTiempoProductivo en GestionProduccionINY
    calcularTiempoProductivo(row) {
        const disponible = parseFloat(row.TiempoDisponible) || 0;
        const tiempoNoProductivo =
            (parseFloat(row.TiempoMuertoCorrectivos) || 0) +
            (parseFloat(row.TiempoMuertoHerramentales) || 0) +
            (parseFloat(row.TiempoMuertoArranques) || 0) +
            (parseFloat(row.FallaMaterial) || 0) +
            (parseFloat(row.FaltaPersonal) || 0) +
            (parseFloat(row.FallaElectrica) || 0) +
            (parseFloat(row.TiempoMuertoProceso) || 0);
        return Math.max(disponible - tiempoNoProductivo, 0); // 🆕
    }

    calcularPorcentajeDisponibilidad(row) {

        const disponible = parseFloat(row.TiempoDisponible) || 0;
        const productivo = parseFloat(row.TiempoProductivo) || 0;

        if (disponible <= 0) return 0;

        return (productivo / disponible) * 100;

    }

    // ========================================
    // ON CELL CHANGED
    // ========================================
    onCellChanged(event) {
        if (event.data.id === 'TOTALES') {
            event.api.undoCellEditing();
            return;
        }

        const row = event.data;
        this.recalcularFila(row);
        event.node.setData(row);

        this.cambiosPendientes.push({
            id: row.id,
            campo: event.colDef.field,
            valorAnterior: event.oldValue,
            valorNuevo: event.newValue
        });

        this.gridApi.refreshCells({ rowNodes: [event.node], force: true });
        this.recalcularTotales();
    }

    // ========================================
    // RECALCULAR TOTALES
    // ========================================
    recalcularTotales() {
        const filaTotales = this.obtenerTotalesGrid();
        this.gridApi.forEachNode(node => {
            if (node.data?.id === 'TOTALES') node.setData(filaTotales);
        });
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

    obtenerTotalesGrid() {

        const totales = {
            id: 'TOTALES',

            // GENERALES
            Mes: null,
            Fecha: null,
            Linea: null,
            Inyectora: null,
            Producto: null,
            Descripcion: null,
            OP: null,
            Turno: null,
            Grupo: null,

            // PRODUCCIÓN
            TRLiberados: 0,
            ProduccionNeta: 0,
            ScrapSinColada: 0,
            ScrapColada: 0,
            TotalScrap: 0,

            // DISPONIBILIDAD
            HorasProgramadas: 0,
            Preventivo: 0,
            ControlInventarios: 0,
            FaltaMateriaPrima: 0,
            PreparacionLinea: 0,

            // TIEMPO NO PRODUCTIVO
            TiempoMuertoCorrectivos: 0,
            TiempoMuertoHerramentales: 0,
            TiempoMuertoArranques: 0,
            FallaMaterial: 0,
            FaltaPersonal: 0,
            FallaElectrica: 0,
            TiempoMuertoProceso: 0,

            // KPIs
            TiempoDisponible: 0,
            TiempoProductivo: 0,
            PorcentajeDisponibilidad: 0,

            KgPorTiempoDisponible: 0,
            KgNetosHrReales: 0,

            PorcentajeRendimiento: 0,
            PorcentajeCalidad: 0,
            PorcentajeOEE: 0,

            PorcentajeEficienciaProducto: 0,
            ObjetivoEficiencia: 0,
            EficienciaOperativa: 0,

            // Estos NO se suman porque pueden cambiar
            // dependiendo del producto/línea
            KgHrLinea: null,
            KgHrProducto: null
        };


        // ========================================
        // SUMAR TODAS LAS FILAS
        // ========================================
        this.gridApi.forEachNode(node => {

            if (!node.data || node.data.id === 'TOTALES') return;

            const row = node.data;

            // PRODUCCIÓN
            totales.TRLiberados += Number(row.TRLiberados || 0);
            totales.ProduccionNeta += Number(row.ProduccionNeta || 0);
            totales.ScrapSinColada += Number(row.ScrapSinColada || 0);
            totales.ScrapColada += Number(row.ScrapColada || 0);
            totales.TotalScrap += Number(row.TotalScrap || 0);

            // DISPONIBILIDAD
            totales.HorasProgramadas += Number(row.HorasProgramadas || 0);
            totales.Preventivo += Number(row.Preventivo || 0);
            totales.ControlInventarios += Number(row.ControlInventarios || 0);
            totales.FaltaMateriaPrima += Number(row.FaltaMateriaPrima || 0);
            totales.PreparacionLinea += Number(row.PreparacionLinea || 0);

            // TIEMPO NO PRODUCTIVO
            totales.TiempoMuertoCorrectivos += Number(row.TiempoMuertoCorrectivos || 0);
            totales.TiempoMuertoHerramentales += Number(row.TiempoMuertoHerramentales || 0);
            totales.TiempoMuertoArranques += Number(row.TiempoMuertoArranques || 0);
            totales.FallaMaterial += Number(row.FallaMaterial || 0);
            totales.FaltaPersonal += Number(row.FaltaPersonal || 0);
            totales.FallaElectrica += Number(row.FallaElectrica || 0);
            totales.TiempoMuertoProceso += Number(row.TiempoMuertoProceso || 0);

            // TIEMPOS
            totales.TiempoDisponible += Number(row.TiempoDisponible || 0);
            totales.TiempoProductivo += Number(row.TiempoProductivo || 0);

            // KPIs BASE
            totales.KgPorTiempoDisponible += Number(row.KgPorTiempoDisponible || 0);
            totales.KgNetosHrReales += Number(row.KgNetosHrReales || 0);
            totales.ObjetivoEficiencia += Number(row.ObjetivoEficiencia || 0);
        });


        // ========================================
        // DISPONIBILIDAD TOTAL
        // ========================================
        if (totales.TiempoDisponible > 0) {

            totales.PorcentajeDisponibilidad =
                (totales.TiempoProductivo / totales.TiempoDisponible) * 100;

        } else {

            totales.PorcentajeDisponibilidad = 0;
        }


        // ========================================
        // CALIDAD TOTAL
        // ========================================
        const produccion = totales.ProduccionNeta;
        const scrap = totales.TotalScrap;

        const totalProduccion =
            produccion + scrap;

        if (totalProduccion > 0) {

            totales.PorcentajeCalidad =
                (produccion / totalProduccion) * 100;

        } else {

            totales.PorcentajeCalidad = 0;
        }


        // ========================================
        // EFICIENCIA OPERATIVA TOTAL
        // ========================================
        if (totales.KgPorTiempoDisponible > 0) {

            totales.EficienciaOperativa =
                (totales.ProduccionNeta /
                    totales.KgPorTiempoDisponible) * 100;

        } else {

            totales.EficienciaOperativa = 0;
        }


        // ========================================
        // RENDIMIENTO TOTAL
        // ========================================
        //
        // KgHrProducto puede cambiar entre filas,
        // por eso NO hacemos promedio simple.
        //
        // Si posteriormente quieres un rendimiento
        // global ponderado, aquí es donde lo podemos
        // calcular.
        //
        totales.PorcentajeRendimiento = 0;


        // ========================================
        // OEE TOTAL
        // ========================================
        //
        // OEE = Disponibilidad × Rendimiento × Calidad
        //
        // Como Rendimiento global todavía no tiene
        // un KgHrProducto único, no lo calculamos.
        //
        totales.PorcentajeOEE = 0;


        return totales;
    }

    // ========================================
    // OBTENER DATOS DEL GRID PARA GUARDAR
    // ========================================
    obtenerDatosGrid() {
        const datos = [];

        const redondear = (valor, decimales = 2) => {
            if (valor === null || valor === undefined || isNaN(valor)) return 0;
            return Math.round(valor * Math.pow(10, decimales)) / Math.pow(10, decimales);
        };

        // 🆕 REEMPLAZAR el inicio del forEach en obtenerDatosGrid de GestionProduccionINY
        this.gridApi.forEachNode(node => {
            if (node.data.id !== 'TOTALES') {

                // 🆕 Convertir OTMC a JSON array (igual que PVC/Corrugado)
                let otmcFinal = null;
                if (node.data.OTMC) {
                    if (String(node.data.OTMC).includes('|')) {
                        const otmcs = String(node.data.OTMC).split('|').map(x => x.trim()).filter(x => x);
                        otmcFinal = JSON.stringify(otmcs);
                    } else {
                        otmcFinal = JSON.stringify([String(node.data.OTMC).trim()]);
                    }
                }

                // 🆕 Convertir OTMP a JSON array
                let otmpFinal = null;
                if (node.data.OTMP) {
                    if (String(node.data.OTMP).includes('|')) {
                        const otmps = String(node.data.OTMP).split('|').map(x => x.trim()).filter(x => x);
                        otmpFinal = JSON.stringify(otmps);
                    } else {
                        otmpFinal = JSON.stringify([String(node.data.OTMP).trim()]);
                    }
                }

                datos.push({
                    ID_REGISTRO: node.data.ID_REGISTRO || null,
                    OTMC: node.data.OTMC || null,
                    OTMP: node.data.OTMP || null,
                    ID_PRODUCTO_TERMINADO: node.data.ID_PRODUCTO_TERMINADO || null,
                    ID_PARO: node.data.ID_PARO || null, // 🟦 NUEVO: Identificador del paro manual
                    MES: node.data.Mes,
                    FECHA: node.data.Fecha,
                    LINEA: node.data.Linea,
                    INYECTORA: node.data.Inyectora,
                    PRODUCTO: node.data.Producto,
                    DESCRIPCION: node.data.Descripcion,
                    OP: node.data.OP,
                    TURNO: node.data.Turno,
                    GRUPO: node.data.Grupo,
                    COMENTARIOS: node.data.Comentarios || '',  // ✅ COMENTARIOS
                    // PRODUCCIÓN
                    TR_LIBERADOS: redondear(node.data.TRLiberados || 0),
                    PRODUCCION_NETA: redondear(node.data.ProduccionNeta || 0),
                    SCRAP_SIN_COLADA: redondear(node.data.ScrapSinColada || 0),
                    SCRAP_COLADA: redondear(node.data.ScrapColada || 0),
                    TOTAL_SCRAP: redondear(node.data.TotalScrap || 0),
                    // DISPONIBILIDAD
                    HORAS_PROGRAMADAS: redondear(node.data.HorasProgramadas || 0),
                    // TIEMPO NO DISPONIBLE
                    PREVENTIVO: redondear(node.data.Preventivo || 0),
                    CONTROL_INVENTARIOS: redondear(node.data.ControlInventarios || 0),
                    FALTA_MATERIA_PRIMA: redondear(node.data.FaltaMateriaPrima || 0),
                    PREPARACION_LINEA: redondear(node.data.PreparacionLinea || 0),
                    // TIEMPO NO PRODUCTIVO
                    TIEMPO_MUERTO_CORRECTIVOS: redondear(node.data.TiempoMuertoCorrectivos || 0),
                    TIEMPO_MUERTO_HERRAMENTALES: redondear(node.data.TiempoMuertoHerramentales || 0),
                    TIEMPO_MUERTO_ARRANQUES: redondear(node.data.TiempoMuertoArranques || 0),
                    FALLA_MATERIAL: redondear(node.data.FallaMaterial || 0),
                    FALTA_PERSONAL: redondear(node.data.FaltaPersonal || 0),
                    FALLA_ELECTRICA: redondear(node.data.FallaElectrica || 0),
                    TIEMPO_MUERTO_PROCESO: redondear(node.data.TiempoMuertoProceso || 0),
                    // KPIS
                    TIEMPO_DISPONIBLE: redondear(node.data.TiempoDisponible || 0),
                    TIEMPO_PRODUCTIVO: redondear(node.data.TiempoProductivo || 0),
                    PORCENTAJE_DISPONIBILIDAD: redondear(node.data.PorcentajeDisponibilidad || 0),

                    // RENDIMIENTO Y OEE
                    PESO_MINIMO: redondear(node.data.PesoMinimo || 0),
                    KG_HR_LINEA: redondear(node.data.KgHrLinea || 0),
                    KG_HR_PRODUCTO: redondear(node.data.KgHrProducto || 0),
                    OBJETIVO_EFICIENCIA: redondear(node.data.ObjetivoEficiencia || 0),
                    KG_POR_TIEMPO_DISPONIBLE: redondear(
                        node.data.KgPorTiempoDisponible || 0
                    ),
                    KG_NETOS_HR_REALES: redondear(
                        node.data.KgNetosHrReales || 0
                    ),
                    PORCENTAJE_RENDIMIENTO: redondear(
                        node.data.PorcentajeRendimiento || 0
                    ),
                    PORCENTAJE_CALIDAD: redondear(
                        node.data.PorcentajeCalidad || 0
                    ),
                    PORCENTAJE_OEE: redondear(
                        node.data.PorcentajeOEE || 0
                    ),
                    PORCENTAJE_EFICIENCIA_PRODUCTO: redondear(
                        node.data.PorcentajeEficienciaProducto || 0
                    ),
                    EFICIENCIA_OPERATIVA: redondear(
                        node.data.EficienciaOperativa || 0
                    ),
                    // AUDITORÍA
                    USUARIO: this.datos_usuario[0].EMAIL,
                    PLANTA: this.datos_usuario[0].PLANTA
                });
            }
        });

        return datos;
    }

    // ========================================
    // GUARDAR CAMBIOS
    // ========================================
    guardarCambios() {
        $("#btnGuardarCambios").html('<span class="spinner-border spinner-border-sm me-2"></span>Guardando...');
        $("#btnGuardarCambios").prop("disabled", true);

        const datos = this.obtenerDatosGrid();
        console.log(datos);

        if (datos.length === 0) {
            AlertManager.mostrar('No hay datos para guardar', 'warning');
            $("#btnGuardarCambios").prop("disabled", false);
            $("#btnGuardarCambios").html('<i class="bi bi-save me-1"></i>Guardar');
            return;
        }

        const camposObligatorios = [
            { campo: "FECHA", nombre: "Fecha" },
            { campo: "LINEA", nombre: "Línea" },
            { campo: "TURNO", nombre: "Turno" },
            { campo: "HORAS_PROGRAMADAS", nombre: "Horas Programadas" }
        ];

        for (let i = 0; i < datos.length; i++) {
            const fila = datos[i];
            for (const campo of camposObligatorios) {
                if (!fila[campo.campo] && fila[campo.campo] !== 0) {
                    AlertManager.mostrar(`Falta el campo "${campo.nombre}" en la fila ${i + 1}`, 'warning');
                    $("#btnGuardarCambios").prop("disabled", false);
                    $("#btnGuardarCambios").html('<i class="bi bi-save me-1"></i>Guardar');
                    return;
                }
            }
        }

        $.ajax({
            url: `/${this.URLBase}/GuardarTiemposMuertosINY`,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(datos),
            beforeSend: () => { GlobalUtil.mostrarLoader(true); },
            success: async (response) => {
                if (response.Status === "SI") {
                    AlertManager.mostrar("Datos guardados correctamente", "success");
                    setTimeout(() => {
                        $("#btnGuardarCambios").html('<i class="bi bi-save me-1"></i>Guardar');
                        $("#btnGuardarCambios").prop("disabled", false);
                    }, 3000);
                    this.cambiosPendientes = [];
                    await this.consultarDatos();
                } else {
                    AlertManager.mostrar(response.Message, "warning");
                    $("#btnGuardarCambios").html('<i class="bi bi-save me-1"></i>Guardar');
                    $("#btnGuardarCambios").prop("disabled", false);
                }
            },
            error: (error) => {
                console.error(error);
                AlertManager.mostrar("No fue posible guardar: " + error, "danger");
                $("#btnGuardarCambios").html('<i class="bi bi-save me-1"></i>Guardar');
                $("#btnGuardarCambios").prop("disabled", false);
            }
        });
    }

    // ========================================
    // CONFIGURAR EVENTOS
    // ========================================
    configurarEventos() {
        $('#btnExportarExcel').on('click', () => this.exportarExcel());
        $('#btnGuardarCambios').on('click', () => this.guardarCambios());

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
                const productosTerminados = await this.ObtenerProductoTerminado(fechaInicio, fechaFin, filtroTurno, 'INY');
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

        $('#btnLimpiarFiltros').on('click', () => {
            $('#FiltroFechaInicio').val('');
            $('#FiltroFechaFin').val('');
            $('#FiltroLinea').val('');
            $('#FiltroTurno').val('');
            $('#FiltroProducto').val('');
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
                $("#mesActual").text(
                    FechaTexto
                );
                this.consultarDatos();
            });
    }

    // ========================================
    // AGREGAR / COPIAR / ELIMINAR FILA
    // ========================================
    agregarFila(params) {
        const nuevaFila = this.crearFilaVacia();
        nuevaFila.id = this.generarIdTemporal();

        const addIndex = params.node.data?.id === 'TOTALES'
            ? params.node.rowIndex
            : params.node.rowIndex + 1;

        this.gridApi.applyTransaction({ add: [nuevaFila], addIndex });
        this.recalcularTotales();
    }

    copiarFilaAnterior(params) {
        const filaActual = params.node.data;
        const nuevaFila = JSON.parse(JSON.stringify(filaActual));

        nuevaFila.id = this.generarIdTemporal();
        nuevaFila.ID_REGISTRO = null;
        nuevaFila.OTMC = null;
        nuevaFila.OTMP = null;
        nuevaFila.ID_PRODUCTO_TERMINADO = null;
        nuevaFila.ID_PARO = null;
        nuevaFila._origen = null;
        nuevaFila._marcador = null;
        nuevaFila._rowClass = null;
        nuevaFila._esNuevo = null;

        if (nuevaFila.Fecha) {
            nuevaFila.Mes = this.obtenerNombreMes(nuevaFila.Fecha);
        }

        this.recalcularFila(nuevaFila);

        const addIndex = params.node.data?.id === 'TOTALES'
            ? params.node.rowIndex
            : params.node.rowIndex + 1;

        this.gridApi.applyTransaction({ add: [nuevaFila], addIndex });
        this.recalcularTotales();
    }

    eliminarFila(params) {
        if (params.node.data.id === 'TOTALES') return;

        if (params.node.data.ID_REGISTRO) {
            AlertManager.mostrar("No se puede eliminar un registro guardado", "warning");
            return;
        }

        this.gridApi.applyTransaction({ remove: [params.node.data] });
        this.recalcularTotales();
    }

    // ========================================
    // MENÚ CONTEXTUAL
    // ========================================
    configurarMenuContextual() {
        if (this.menuContextualConfigurado) return;
        this.menuContextualConfigurado = true;

        const menu = document.getElementById("menuContextual");
        const tabla = document.querySelector('#tablaProduccion');
        if (!tabla) return;

        tabla.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            menu.style.display = "block";
            menu.style.left = e.pageX + "px";
            menu.style.top = e.pageY + "px";

            const rowIndex = this.gridApi.getFocusedCell()?.rowIndex
                ?? this.gridApi.getDisplayedRowCount() - 1;

            this.filaSeleccionada = this.gridApi.getDisplayedRowAtIndex(rowIndex);

            const eliminar = menu.querySelector('[data-action="eliminar"]');
            const copiar = menu.querySelector('[data-action="copiar"]');

            // 🔥 En la fila de TOTALES solo permitir "Agregar", desactivar "Copiar" y "Eliminar"
            if (this.filaSeleccionada?.data?.id === 'TOTALES') {
                eliminar.style.display = "none";
                copiar.style.display = "none";
            } else {
                // Para filas normales
                eliminar.style.display = this.filaSeleccionada?.data?.ID_REGISTRO ? "none" : "block";
                copiar.style.display = "block";
            }
        });

        document.addEventListener("click", () => { menu.style.display = "none"; });

        menu.addEventListener("click", (e) => {
            const accion = e.target.dataset.action;
            if (!this.filaSeleccionada) return;
            const params = { node: this.filaSeleccionada };
            if (accion === "agregar") this.agregarFila(params);
            if (accion === "copiar") this.copiarFilaAnterior(params);
            if (accion === "eliminar") this.eliminarFila(params);
            menu.style.display = "none";
        });
    }

    // ========================================
    // CARGAR LÍNEAS
    // ========================================
    async cargarLineas() {
        try {
            const lineas = await EquiposUtil.obtenerLineas(
                this.datos_usuario[0].PLANTA,
                this.ID_AREA_CORRECTIVOS,
                null
            );
            this.listaLineas = lineas;
        } catch (error) {
            console.error(error);
        }
    }

    // ========================================
    // HELPERS NUMÉRICOS / FORMATO
    // ========================================
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
        return parseFloat(valor).toFixed(2);
    }

    formatearPorcentaje(valor) {
        if (valor === null || valor === undefined || valor === '') return '';
        return `${parseFloat(valor).toFixed(2)}%`;
    }

    formatearRangoFechas(fechaInicio, fechaFin) {
        const inicio = DateUtils.formatearFechaTexto(fechaInicio, false);
        const fin = DateUtils.formatearFechaTexto(fechaFin, true);
        return `Del ${inicio} al ${fin}`;
    }

    generarIdTemporal() {
        return `TMP_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    }

    //CALCULO DE RENDIMIENTO Y OEE
    calcularKgPorTiempoDisponible(row) {
        const tiempoDisponible = parseFloat(row.TiempoDisponible) || 0;
        const kgHrProducto = parseFloat(row.KgHrProducto) || 0;
        return tiempoDisponible * kgHrProducto;
    }

    calcularKgNetosHrReales(row) {
        const tiempoProductivo = parseFloat(row.TiempoProductivo) || 0;
        if (tiempoProductivo <= 0) return 0;
        const produccion = parseFloat(row.ProduccionNeta) || 0; // 🔥 INY usa ProduccionNeta, no ProduccionNetaReal
        const scrap = parseFloat(row.TotalScrap) || 0;          // 🔥 INY usa TotalScrap, no TotalScrapKg
        return (produccion + scrap) / tiempoProductivo;
    }

    calcularPorcentajeRendimiento(row) {
        const kgHrProducto = parseFloat(row.KgHrProducto) || 0;
        if (kgHrProducto <= 0) return 0;
        const kgNetosHrReales = parseFloat(row.KgNetosHrReales) || 0;
        return (kgNetosHrReales / kgHrProducto) * 100;
    }

    calcularPorcentajeCalidad(row) {
        const produccion = parseFloat(row.ProduccionNeta) || 0; // 🔥 INY
        const scrap = parseFloat(row.TotalScrap) || 0;          // 🔥 INY
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

    // 🆕 REEMPLAZAR calcularPorcentajeOEE en GestionProduccionINY
    calcularPorcentajeOEE(row) {
        const disponibilidad = (parseFloat(row.PorcentajeDisponibilidad) || 0) / 100; // 🆕
        const rendimiento = (parseFloat(row.PorcentajeRendimiento) || 0) / 100;
        const calidad = (parseFloat(row.PorcentajeCalidad) || 0) / 100;
        return disponibilidad * rendimiento * calidad * 100;
    }

    calcularEficienciaOperativa(row) {
        const kgPorTiempoDisponible = parseFloat(row.KgPorTiempoDisponible) || 0;
        if (kgPorTiempoDisponible <= 0) return 0;
        const produccion = parseFloat(row.ProduccionNeta) || 0; // 🔥 INY
        return (produccion / kgPorTiempoDisponible) * 100;
    }
    // ========================================
    // EXPORTAR EXCEL
    // ========================================
    exportarExcel() {
        const exporter = new ExcelExporterINY(this.gridApi, this.columnDefs);
        exporter.exportarConFormato();
    }
}

// ========================================
// AUTOCOMPLETE EDITOR DE ARTÍCULOS (INY)
// ========================================
class ArticuloAutocompleteEditorINY {
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
                    1
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
            item.innerHTML = `<strong>${articulo.CodigoArticulo}</strong><br><small>${articulo.DescripcionArticulo}</small>`;

            item.addEventListener('click', () => {

                console.log("🔥 ARTICULO COMPLETO:", articulo);
                console.log("🔥 KgsDia:", articulo.KgsDia);

                this.eInput.value = articulo.CodigoArticulo;
                this.articuloSeleccionado = articulo;
                const row = this.params.node.data;

                // ==============================
                // DATOS DEL ARTÍCULO
                // ==============================
                row.Producto = articulo.CodigoArticulo;
                row.Descripcion = articulo.DescripcionArticulo || '';

                // ==============================
                // KPIs DE PRODUCCIÓN
                // ==============================
                row.PesoMinimo = parseFloat(articulo.PesoMinimo) || 0;

                row.KgHrProducto = parseFloat(articulo.KgsDia) / 24 || 0;
                row.KgHrLinea = parseFloat(articulo.KgsDia) / 24 || 0;

                // ==============================
                // RECALCULAR KPIs
                // ==============================
                const app = this.params.context.appProduccion;
                app.recalcularFila(row);
                app.recalcularTotales();

                // ==============================
                // REFRESCAR GRID
                // ==============================
                this.eDropdown.innerHTML = '';
                this.params.api.refreshCells({ rowNodes: [this.params.node], force: true });
                this.params.stopEditing();
            });

            this.eDropdown.appendChild(item);
        });
    }

    getGui() { return this.eContainer; }
    afterGuiAttached() { this.eInput.focus(); this.eInput.select(); this.eInput.value = ''; }
    getValue() { return this.eInput.value; }
    destroy() { }
    isPopup() { return true; }
}

// ========================================
// EXPORTADOR EXCEL PARA INY
// ========================================
class ExcelExporterINY extends ExcelExporterBase {
    constructor(gridApi, columnDefs) {
        super(gridApi, columnDefs);
    }

    getSheetName() { return 'Causas Tiempos Muertos INY'; }
    getFileNamePrefix() { return 'Produccion_INY'; }
    getTextFields() { return ['Mes', 'Fecha', 'Linea', 'Inyectora', 'Producto', 'Descripcion', 'OP', 'Turno', 'Grupo']; }
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
                if (grupo.columnas > 1)
                    worksheet.mergeCells(1, grupo.inicio, 1, grupo.fin);
            }
        });
    }

    agregarFilaHeaders(worksheet, estructura) {
        const headers = [];
        estructura.grupos.forEach(grupo => {
            grupo.children.forEach(col => headers.push(col.headerName));
        });
        worksheet.addRow(headers);
    }

    agregarFilasDatos(worksheet, estructura) {
        let filaTotales = null;

        this.gridApi.forEachNodeAfterFilterAndSort(node => {
            if (node.data && node.data.id === 'TOTALES') { filaTotales = node; return; }

            const fila = [];
            estructura.grupos.forEach(grupo => {
                grupo.children.forEach(col => {
                    let valor = node.data[col.field];
                    if (valor !== null && valor !== undefined && valor !== '' &&
                        !this.getTextFields().includes(col.field)) {
                        valor = parseFloat(valor);
                    }
                    fila.push((valor === 0 || valor === '0') ? 0 : (valor || ''));
                });
            });
            worksheet.addRow(fila);
        });

        if (filaTotales) {
            const fila = [];
            estructura.grupos.forEach(grupo => {
                grupo.children.forEach(col => {
                    let valor = filaTotales.data[col.field];
                    if (valor !== null && valor !== undefined && valor !== '' &&
                        !this.getTextFields().includes(col.field)) {
                        valor = parseFloat(valor);
                    } else if (!valor) { valor = ''; }
                    fila.push((valor === 0 || valor === '0') ? 0 : (valor || ''));
                });
            });
            worksheet.addRow(fila);
        }
    }

    aplicarEstilos(worksheet, estructura) {
        const filaGrupos = worksheet.getRow(1);
        filaGrupos.height = 30;

        estructura.grupos.forEach(grupo => {
            if (grupo.nombre) {
                const celda = filaGrupos.getCell(grupo.inicio);

                const colorMap = {
                    'DATOS GENERALES': { fondo: 'B4A7D6', texto: '000000' },
                    'PRODUCCIÓN': { fondo: 'F1C232', texto: '000000' },
                    'DISPONIBILIDAD': { fondo: '0058A1', texto: 'FFFFFF' },
                    'TIEMPO NO DISPONIBLE': { fondo: 'FF69B4', texto: 'FFFFFF' },
                    'TIEMPO NO PRODUCTIVO': { fondo: '90EE90', texto: '333333' },
                    'KPIS': { fondo: '6AA84F', texto: 'FFFFFF' }
                };

                const color = colorMap[grupo.nombre] || { fondo: '0058A1', texto: 'FFFFFF' };

                celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + color.fondo } };
                celda.font = { bold: true, color: { argb: 'FF' + color.texto }, size: 12 };
                celda.alignment = { vertical: 'middle', horizontal: 'center' };
                celda.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
            }
        });

        const filaHeaders = worksheet.getRow(2);
        filaHeaders.height = 60;
        for (let col = 1; col <= estructura.totalColumnas; col++) {
            const celda = filaHeaders.getCell(col);
            celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0058A1' } };
            celda.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
            celda.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            celda.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        }

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
                        celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9ECEF' } };
                        celda.font = { bold: true, color: { argb: 'FF0058A1' }, size: 11 };
                        celda.border = { top: { style: 'medium', color: { argb: 'FF0058A1' } }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
                        if (!this.getTextFields().includes(col.field)) celda.numFmt = '0.00';
                    } else {
                        const colorFondo = this.obtenerColorCelda(col.cellClass);
                        celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorFondo } };
                        celda.font = { size: 10 };
                        celda.border = { top: { style: 'thin', color: { argb: 'FFE0E0E0' } }, bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } }, left: { style: 'thin', color: { argb: 'FFE0E0E0' } }, right: { style: 'thin', color: { argb: 'FFE0E0E0' } } };
                        if (!this.getTextFields().includes(col.field)) celda.numFmt = '0.00';
                    }

                    celda.alignment = { vertical: 'middle', horizontal: 'center' };
                });
            });
        }
    }

    obtenerColorCelda(cellClass) {
        const colores = {
            'celda-azul': 'FFCFE2FF',
            'celda-amarilla': 'FFFFF000',
            'celda-blanca': 'FFFFFFFF',
            'celda-verde-formula': 'FFD9EAD3',
            'celda-gris': 'FFD9D9D9',
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
                    if (col.field === 'Mes') ancho = 14;
                    else if (col.field === 'Fecha') ancho = 14;
                    else if (col.field === 'Linea') ancho = 10;
                    else if (col.field === 'Inyectora') ancho = 14;
                    else if (col.field === 'Producto') ancho = 18;
                    else if (col.field === 'Descripcion') ancho = 30;
                    else if (col.field === 'OP') ancho = 12;
                    else if (col.field === 'Turno') ancho = 10;
                    else if (col.field === 'Grupo') ancho = 10;
                    else if (col.field === 'FaltaMateriaPrima') ancho = 26;
                    else if (col.headerName && col.headerName.length > 20) ancho = 22;
                    worksheet.getColumn(colIdx).width = ancho;
                });
            }
        });
    }
}

// ========================================
// GESTOR DE CORREOS PARA INY
// ========================================
class CorreosManagerINY {
    constructor() {
        this.correosNotificacion = [];
        this.appProduccion = null;
    }

    setAppProduccion(app) { this.appProduccion = app; }

    inicializar() {
        $("#btnAgregarCorreoINY").off("click").on("click", () => this.agregarCorreo());
        $("#inputCorreoINY").off("keydown").on("keydown", (e) => {
            if (e.key === "Enter") { e.preventDefault(); this.agregarCorreo(); }
        });
        $("#btnEnviarExcelCorreo").off("click").on("click", () => this.enviarExcelPorCorreo());
    }

    agregarCorreo() {
        const input = $("#inputCorreoINY");
        const correo = input.val().trim().toLowerCase();
        const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!regexEmail.test(correo)) {
            $("#errorCorreoINY").text("Ingrese un correo válido.").show();
            input.addClass("is-invalid");
            return;
        }
        if (this.correosNotificacion.includes(correo)) {
            $("#errorCorreoINY").text("Este correo ya fue agregado.").show();
            input.addClass("is-invalid");
            return;
        }

        this.correosNotificacion.push(correo);
        this.renderCorreos();
        input.val('').removeClass("is-invalid");
        $("#errorCorreoINY").hide();
    }

    renderCorreos() {
        const lista = $("#listaCorreosINY");
        lista.empty();

        if (this.correosNotificacion.length === 0) {
            lista.html(`<span class="text-muted" style="font-size:0.82rem;"><i class="bi bi-info-circle me-1"></i> No hay correos agregados aún.</span>`);
            return;
        }

        this.correosNotificacion.forEach((correo, index) => {
            lista.append(`
                <span class="badge d-flex align-items-center gap-2 px-3 py-2"
                      style="background:var(--modal-primary-soft);color:var(--modal-primary);border:1px solid var(--modal-primary-mid);border-radius:20px;font-size:0.82rem;">
                    <i class="bi bi-envelope"></i>${correo}
                    <button type="button" class="btn-remove-correo" data-index="${index}"
                            style="background:none;border:none;padding:0;cursor:pointer;color:var(--modal-primary);line-height:1;">
                        <i class="bi bi-x-lg" style="font-size:0.7rem;"></i>
                    </button>
                </span>
            `);
        });

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
            const exporter = new ExcelExporterINY(this.appProduccion.gridApi, this.appProduccion.columnDefs);
            const archivoExcel = await exporter.generarExcelParaEnvio();

            if (!archivoExcel) {
                AlertManager.mostrar("No se pudo generar el Excel", "warning");
                this.resetearBoton(btn);
                return;
            }

            btn.html('<span class="spinner-border spinner-border-sm me-2"></span>Enviando...');

            const reader = new FileReader();
            reader.onload = async () => {
                const base64Excel = reader.result.split(',')[1];

                try {
                    const payload = {
                        correos: this.correosNotificacion,
                        archivoExcelBase64: base64Excel,
                        usuario: this.appProduccion.datos_usuario[0].NOMBRECOMPLETO,
                        planta: this.appProduccion.datos_usuario[0].PLANTA,
                        tipoReporte: 'INY'
                    };

                    const response = await $.ajax({
                        url: `/${this.appProduccion.URLBase}/EnviarExcelProduccionPorCorreo`,
                        type: 'POST',
                        contentType: 'application/json',
                        data: JSON.stringify(payload),
                        beforeSend: () => { GlobalUtil.mostrarLoader(true); }
                    });

                    if (response.Status === "OK") {
                        AlertManager.mostrar("Excel enviado correctamente", "success");
                        this.correosNotificacion = [];
                        this.renderCorreos();
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
}
