// ========================================
// GESTION DE EVENTOS
// ========================================
class GestionEventosApp {
    constructor() {
        this.URLBase = "Planeacion";
        this.calendarManager = new PlaneacionManager(this.URLBase);
        this.gestionArticulos = new GestionArticulos();
        this.datos_usuario = GlobalUtil.getDatosUsuario();
    }

    inicializar() {
        UIManager.inicializarUI();
        this.calendarManager.inicializar();
        this.gestionArticulos.inicializar();

        this.configurarEventosGestionArticulos();
        this.configurarEventosCalendarManager();
        console.log('✅ Sistema Completo de Gestión de Eventos Planeación inicializado correctamente');
    }

    //GESTION DE ARTICULOS
    configurarEventosGestionArticulos() {
        // ✅ Input de búsqueda
        $('#BuscarArticulo').on('input', (e) => {
            const query = $(e.target).val().trim();
            if (query.length >= 2) {
                this.gestionArticulos.buscarArticulos(query, this.datos_usuario[0].EMAIL);
            } else {
                this.gestionArticulos.ocultarSugerencias();
            }
        });

        // ✅ Enter en el input (opcional, ya que el click en sugerencia funciona)
        $('#BuscarArticulo').on('keypress', (e) => {
            if (e.which === 13) {
                e.preventDefault();
                // Aquí podrías seleccionar el primer resultado si quieres
            }
        });

        // ✅ Click fuera para cerrar sugerencias
        $(document).on('click', (e) => {
            if (!$(e.target).closest('#BuscarArticulo, #sugerenciasArticulos').length) {
                this.gestionArticulos.ocultarSugerencias();
            }
        });
    }
    //CALENDAR MANAGER
    configurarEventosCalendarManager() {
        $('#btnGuardarEvento').on('click', (e) => this.calendarManager.guardarPlan(e));
        $('#AgregarPlan').on('click', (e) => this.calendarManager.abrirModalAgregarPlan(e));
        $('#RegistrarParo').on('click', (e) => this.calendarManager.abrirModalRegistrarParo(e));

        $('#formFiltrosOrdenes').on('submit', (e) => {
            e.preventDefault();
            GlobalUtil.mostrarLoader(true);
            // ✅ CAMBIO: recargar cards en vez de DataTable
            this.calendarManager.cargarCards(() => GlobalUtil.mostrarLoader(false));
        });

        // ✅ CORRECTO - guardar PARO
        $('#formRegistrarParo').on('submit', (e) => this.calendarManager.guardarParo(e));

        // ✅ CAMBIO: limpiar filtros ahora recarga cards
        $('#btnLimpiarFiltros').on('click', () => {
            $('#formFiltrosOrdenes')[0].reset();
            this.calendarManager.cargarCards();
        });

        // ✅ SIN CAMBIO: sigue llamando al mismo método
        $("#btnAplicarFiltros").on('click', () => this.calendarManager.llenarTablaPlanProduccion());

        $('#FiltroFechaInicio, #FiltroFechaFin, #FiltroMesAnio, #FiltroLinea').on('change', () => {
            this.calendarManager.llenarTablaPlanProduccion();
        });

        $("#btnExportarExcel").on('click', () => this.calendarManager.exportarExcel());

        $("#DiaFinMant, #DiaInicioMant, #PlanCap").on('change', function () {
            const FI = $("#DiaInicioMant").val();
            const FF = $("#DiaFinMant").val();
            const Cap = $("#PlanCap").val();

            let CapTeorica = 0, diff = 0;

            if (FI && FF && Cap) {
                const fechaInicio = new Date(FI);
                const fechaFin = new Date(FF);

                if (fechaInicio > fechaFin) {
                    AlertManager.mostrar('La fecha de inicio no puede ser mayor a la fecha de fin.', 'warning');
                    //$("#DiaInicioMant").val('');
                    //$("#DiaFinMant").val('');
                    return;
                }
                // Diferencia en milisegundos → convertir a días
                const diffMs = fechaFin - fechaInicio;
                diff = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir día inicio

                // Protección: si las fechas están invertidas no calcules
                if (diff > 0) {
                    CapTeorica = parseFloat(Cap) * diff;
                }
            }

            $("#ProduccionTeorica").val(CapTeorica);
        });

        // ✅ Event delegation — seguro contra manipulación del DOM
        $(document).on('click', '#cardsPlaneacionGrid .btn-act.add', (e) => {
            const id = $(e.currentTarget).data('id');
            this.calendarManager.abrirModalEditarPlan(id);
        });
        // ✅ Event delegation — seguro contra manipulación del DOM
        $(document).on('click', '#cardsPlaneacionGrid .btn-act.edit', (e) => {
            const id = $(e.currentTarget).data('id');
            this.calendarManager.abrirModalEditarPlan(id);
        });

        $(document).on('click', '#cardsPlaneacionGrid .btn-act.del', (e) => {
            const btn = $(e.currentTarget);
            this.calendarManager.eliminarPlan({
                id: btn.data('id'),
                linea: btn.data('linea'),
                mes: btn.data('mes'),
                periodo: btn.data('periodo'),  // ✅
                articulo: btn.data('articulo'),
                teorica: btn.data('teorica'),
                real: btn.data('real')
            });
        });
    }
}

// ========================================
// INICIALIZACIÓN
// ========================================
$(document).ready(function () {
    window.app = new GestionEventosApp();  // ✅ este es el cambio
    window.app.inicializar();

    window.HeaderFijoGlobalManager.crear(
        '.card-header.header-fijo-custom',
        '.position-relative.header-custom',
        'headerMantenimientos',
        {
            topOffset: 45,
            backgroundColor: 'white',
            boxShadow: '0 4px 12px rgba(0, 88, 161, 0.3)',
            animacion: true
        }
    );
});

// ========================================
// GESTOR DE UI
// ========================================
class UIManager {
    static inicializarUI() {
        $("#PlaneacionContainer").addClass("selected");
        $("#PlaneacionContainer a").addClass("whiteText");
        $("#planeacion-collapse").addClass("show");
        $("#RegistroPlaneacionURL").addClass("selected-item");

        $('#FiltroFechaInicio').val(DateUtils.obtenerPrimerDiaMesActual());
        $('#FiltroFechaFin').val(DateUtils.obtenerUltimoDiaMesActual());
    }
}

// ========================================
// GESTOR DE PLANEACION
// ========================================
class PlaneacionManager {
    constructor(URLBase) {
        this.datos_usuario = GlobalUtil.getDatosUsuario();
        this.PLANTA = this.datos_usuario[0].PLANTA;
        this.URLBase = URLBase;
        this.calendarEl = document.getElementById('calendar');
        this.selectedDate = '';
        this.calendar = null;
        this.todosLosEventos = [];

        // ✅ NUEVO: estado interno de paginación de cards
        this._cardsPagina = 1;
        this._cardsPorPagina = 6; // ajusta a tu gusto
        this._cardsTotal = 0;

        EquiposUtil.llenarLineas(this.PLANTA, "PlanLinea", "ParoLinea");
        EquiposUtil.llenarLineas(this.PLANTA, "FiltroLinea", null);
        EquiposUtil.llenarRangoDias();

        this.Articulos = [
            { name: `3CTP032 - PVC PIPE SCH 40 ¾" (19mm) E/L Exportación 10 FT ... `, cap: 100 },
            { name: `3SNL075 - PVC PIPE SCH 40 2" (50mm) E/L Exportación 10 FT ...`, cap: 200 },
            { name: `3CTP038 - PVC PIPE  SCH 40 SF C480 3/4" (19mm) C/B`, cap: 50 },
            { name: `1PP511040A - PTR 3/4 IN CALIBRE 14 ACERO AL CARBON`, cap: 150 },
            { name: `1I26008 - ANILLO SEWER 450MM`, cap: 400 },
            { name: ` 3CTP032 - VIRUTA PVC IPS C-900`, cap: 350 }
        ];

        this.Procesos = ['PTCORR', 'PPVC', 'PEAD LISO'];
    }

    // ─────────────────────────────────────────────
    // INICIALIZAR
    // ─────────────────────────────────────────────
    inicializar() {
        this.llenarTablaPlanProduccion(); // ✅ Sigue siendo el punto de entrada
        EquiposUtil.llenarProcesos(this.PLANTA, "PlanProceso", null);
        console.log('✅ Planeación inicializado correctamente');
    }

    priorizarFiltroMesAnio() {
        const MesAnio = $("#FiltroMesAnio").val();
        if (MesAnio) {
            $("#FiltroFechaInicio").val("");
            $("#FiltroFechaFin").val("");
        }
    }

    // ─────────────────────────────────────────────
    // PUNTO DE ENTRADA PRINCIPAL  (antes DataTable)
    // ✅ Ahora simplemente arranca las cards
    // ─────────────────────────────────────────────
    llenarTablaPlanProduccion() {
        this.priorizarFiltroMesAnio();
        this._cardsPagina = 1;      // siempre empieza en página 1
        this.cargarCards();
    }
    // ─────────────────────────────────────────────
    // CARDS — helpers de render
    // ─────────────────────────────────────────────
    _fmtNum(n) {
        return parseFloat(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 });
    }

    _calcPct(teorica, real) {
        return teorica ? Math.round((real / teorica) * 100) : 0;
    }

    _getMesAnio(str) {
        if (!str) return 'N/A';
        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const [, m, a] = str.split('/');
        return `${meses[parseInt(m) - 1]} ${a}`;
    }

    _getFillClass(p) {
        if (p >= 100) return 'fill-over';
        if (p >= 85) return 'fill-ok';
        if (p >= 60) return 'fill-warn';
        return 'fill-bad';
    }

    _getEstatusLabel(e) {
        return { C: 'Completado', P: 'En Proceso', X: 'Cancelado', O: 'Pendiente' }[e] || 'Pendiente';
    }

    // ─────────────────────────────────────────────
    // CARDS — template de una card
    // ─────────────────────────────────────────────
    _renderCard(d, idx) {
        const p = this._calcPct(d.PRODUCCION_TEORICA, d.PRODUCCION_REAL);
        const bw = Math.min(p, 100);
        const estatusC = `estatus-${d.ESTATUS || 'P'}`;
        const chipC = `chip-${d.ESTATUS || 'P'}`;

        const comentario = (d.COMENTARIOS && d.COMENTARIOS.trim())
            ? d.COMENTARIOS
            : '<em>Sin comentarios</em>';

        // ── Paro activo ──────────────────────────
        const tieneParoActivo = d.TIENE_PARO_ACTIVO === 1 || d.TIENE_PARO_ACTIVO === '1';
        const paroBanner = tieneParoActivo ? `
        <div class="paro-banner">
            <i class="bi bi-exclamation-octagon-fill"></i>
            <span>Paro activo registrado el ${d.FECHA_PARO || ''}</span>
        </div>` : '';

        // ── Artículo (truncado si es muy largo) ──
        const articulo = d.ARTICULO
            ? (d.ARTICULO.length > 45 ? d.ARTICULO.substring(0, 45) + '…' : d.ARTICULO)
            : null;

        return `
    <div class="prod-card ${estatusC} ${tieneParoActivo ? 'tiene-paro' : ''}"
         data-id="${d.ID_PLAN}"
         style="animation-delay:${idx * 55}ms">

        ${paroBanner}

        <!-- HEADER -->
        <div class="card-head">
            <div class="linea-info">
                <div class="linea-icon ${tieneParoActivo ? 'linea-icon-paro' : ''}">
                    <i class="bi bi-diagram-3-fill"></i>
                </div>
                <div>
                    <div class="linea-nombre">${d.LINEA_PRODUCCION_DESC || 'N/A'}</div>
                    <div class="linea-sub">ID #${d.ID_PLAN}</div>
                </div>
            </div>
            <span class="mes-pill">
                <i class="bi bi-calendar3"></i> ${this._getMesAnio(d.FECHA_PLAN_STRING)}
            </span>
        </div>

        <!-- BODY -->
        <div class="card-body">
            <!-- Badge Plan Original -->
            <div class="plan-original-badge">
                <i class="bi bi-clipboard-check-fill"></i> Plan original
            </div>
            <!-- Rango de días + Proceso -->
            <div class="card-tags-row">
                <span class="rango-tag">
                    <i class="bi bi-calendar-range"></i>
                    <span class="tag-label">Período:</span> Del ${d.DIA_INICIO_MANT_STR || 0} — Al ${d.DIA_FIN_MANT_STR || 0}
                </span>
                ${d.PROCESO ? `
                <span class="proceso-tag">
                    <i class="bi bi-gear-fill"></i>
                    <span class="tag-label">Proceso:</span> ${d.PROCESO}
                </span>` : ''}
            </div>

            <!-- Artículo -->
            ${articulo ? `
            <div class="info-badge-row">
                <span class="info-badge-label">
                    <i class="bi bi-box-seam-fill"></i> Artículo
                </span>
                <span class="info-badge-value" data-bs-toggle="tooltip" title="${d.ARTICULO}">
                    ${articulo}
                </span>
            </div>

            <!-- Artículo Desc -->
            ${d.ARTICULO_DESC ? `
            <div class="info-badge-row articulo-desc">
                <span class="info-badge-label">
                    <i class="bi bi-card-text"></i> Descripción
                </span>
                <span class="info-badge-value articulo-desc-text" 
                      data-bs-toggle="tooltip" 
                      title="${d.ARTICULO_DESC}">
                    ${d.ARTICULO_DESC}
                </span>
            </div>` : ''}

            ` : ''}

            <!-- Capacidad -->
            ${d.CAPACIDAD ? `
            <div class="info-badge-row">
                <span class="info-badge-label">
                    <i class="bi bi-speedometer2"></i> Cap. diaria
                </span>
                <span class="info-badge-value highlight">
                    ${this._fmtNum(d.CAPACIDAD)} <small>PZ/día</small>
                </span>
            </div>` : ''}

            <!-- Stats producción -->
            <div class="stats-row">
                <div class="stat-box teorica">
                    <div class="stat-label">
                        <i class="bi bi-calculator-fill teorica-icon"></i> Prod. Teórica
                    </div>
                    <div class="stat-value">
                        ${this._fmtNum(d.PRODUCCION_TEORICA)}<span class="stat-unit">PZ</span>
                    </div>
                    <div class="stat-sublabel">Meta del período</div>
                </div>
                <div class="stat-box real">
                    <div class="stat-label">
                        <i class="bi bi-graph-up-arrow real-icon"></i> Prod. Real
                    </div>
                    <div class="stat-value real">
                        ${this._fmtNum(d.PRODUCCION_REAL)}<span class="stat-unit">PZ</span>
                    </div>
                    <div class="stat-sublabel">Piezas producidas</div>
                </div>
            </div>

            <!-- Barra de cumplimiento 
            <div class="progress-section">
                <div class="progress-labels">
                    <span><i class="bi bi-bar-chart-fill me-1"></i>% Cumplimiento del plan</span>
                    <strong>${p}%</strong>
                </div>
                <div class="progress-track">
                    <div class="progress-fill ${this._getFillClass(p)}" style="width:${bw}%"></div>
                </div>
            </div>-->

            <!-- Comentarios -->
            <div class="info-badge-row">
                <span class="info-badge-label">
                    <i class="bi bi-chat-left-text-fill"></i> Comentarios
                </span>
                <span class="info-badge-value">${comentario}</span>
            </div>

        </div>

        <!-- Historial -->
        ${this._renderBitacora(d.BITACORA || [])}

        <!-- FOOTER -->
        <div class="card-foot">
            <!--<span class="estatus-chip ${chipC}">
                <span class="dot"></span>${this._getEstatusLabel(d.ESTATUS)}
            </span>-->
            <div class="actions">   
                <button class="btn-act edit" title="Extender plan Actual"
                    data-id="${d.ID_PLAN}" data-linea="${d.LINEA_PRODUCCION_DESC || 'N/A'}">
                    <i class="bi bi-pencil-square"></i>
                </button>
                <button class="btn-act del" title="Eliminar plan"
                data-id="${d.ID_PLAN}"
                data-linea="${d.LINEA_PRODUCCION_DESC || 'N/A'}"
                data-mes="${this._getMesAnio(d.FECHA_PLAN_STRING)}"
                data-periodo="Del ${d.DIA_INICIO_MANT_STR || 0} — Al ${d.DIA_FIN_MANT_STR || 0}"
                data-articulo="${d.ARTICULO ? d.ARTICULO.substring(0, 45) : 'Sin artículo'}"
                data-teorica="${this._fmtNum(d.PRODUCCION_TEORICA)}"
                data-real="${this._fmtNum(d.PRODUCCION_REAL)}">
                <i class="bi bi-trash3-fill"></i>
            </button>
            </div>
        </div>
    </div>`;
    }

    // ─────────────────────────────────────────────
    // CARDS — renderiza el grid completo
    // ─────────────────────────────────────────────
    _renderGrid(data) {
        const grid = document.getElementById('cardsPlaneacionGrid');
        if (!data.length) {
            grid.innerHTML = `
            <div class="cards-empty">
                <i class="bi bi-inbox-fill"></i>
                <p>No hay planes de producción disponibles.</p>
            </div>`;
            return;
        }
        grid.innerHTML = data.map((d, i) => this._renderCard(d, i)).join('');

        // Reinicializar tooltips para artículos largos
        document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
            new bootstrap.Tooltip(el);
        });
    }

    // ─────────────────────────────────────────────
    // CARDS — paginación
    // ─────────────────────────────────────────────
    _renderPaginacion(total, pag, por) {
        const el = document.getElementById('cardsPlaneacionPaginacion');
        const totalPags = Math.ceil(total / por);

        if (totalPags <= 1) { el.innerHTML = ''; return; }

        const desde = (pag - 1) * por + 1;
        const hasta = Math.min(pag * por, total);

        let h = `<span class="pag-info">Mostrando ${desde}–${hasta} de ${total} registros</span>`;
        h += `<button class="pag-btn" onclick="app.calendarManager.irPaginaCards(${pag - 1})" ${pag === 1 ? 'disabled' : ''}>‹ Anterior</button>`;
        for (let p = 1; p <= totalPags; p++)
            h += `<button class="pag-btn ${p === pag ? 'active' : ''}" onclick="app.calendarManager.irPaginaCards(${p})">${p}</button>`;
        h += `<button class="pag-btn" onclick="app.calendarManager.irPaginaCards(${pag + 1})" ${pag === totalPags ? 'disabled' : ''}>Siguiente ›</button>`;

        el.innerHTML = h;
    }

    _renderBitacora(bitacora = []) {

        // Si no hay registros, no renderiza nada
        if (!bitacora.length) return '';

        // Configuración visual según tipo de acción
        const cfg = {
            CREATE: { icon: 'bi-plus-circle-fill', cls: 'bit-create', label: 'Plan creado' },
            UPDATE: { icon: 'bi-pencil-fill', cls: 'bit-update', label: 'Ajuste' },
            DELETE: { icon: 'bi-trash3-fill', cls: 'bit-delete', label: 'Eliminado' },
        };

        // Recorrer bitácora (ya viene orden cronológico)
        const items = bitacora.map((b, i) => {

            // Configuración visual del registro
            const c = cfg[b.BIT_ACCION] || cfg.UPDATE;

            // Determinar si es el último (más reciente)
            const esUltimo = i === bitacora.length - 1;

            // Dibujar línea vertical solo si no es el último
            const esLinea = !esUltimo;

            // Campos normales (grid compacto)
            const campos = [
                { icon: 'bi-gear-fill', label: 'Proceso', val: b.NVO_PROCESO },
                { icon: 'bi-box-seam-fill', label: 'Artículo', val: b.NVO_ARTICULO },
                { icon: 'bi-calculator-fill', label: 'Prod. Teórica', val: b.NVO_PRODUCCION_TEORICA },
                { icon: 'bi-graph-up-arrow', label: 'Prod. Real', val: b.NVO_PRODUCCION_REAL },
                { icon: 'bi-speedometer2', label: 'Capacidad', val: b.NVO_CAPACIDAD },
            ]
                .filter(f => f.val && String(f.val).trim() !== '');


            // Campos ancho completo (al final)
            const camposFull = [
                { icon: 'bi-card-text', label: 'Descripción', val: b.NVO_ARTICULO_DESC },

                {
                    icon: 'bi-calendar-range',
                    label: 'Período',
                    val: (b.NVO_DIA_INICIO_MANT_STR && b.NVO_DIA_FIN_MANT_STR)
                        ? `${b.NVO_DIA_INICIO_MANT_STR} — ${b.NVO_DIA_FIN_MANT_STR}`
                        : null
                },

                { icon: 'bi-chat-left-text', label: 'Comentarios', val: b.NVO_COMENTARIOS },

            ].filter(f => f.val && String(f.val).trim() !== '');

            // Renderizar campos dinámicamente
            const detalle = (campos.length || camposFull.length) ? `
            <div class="bit-fields">
                ${campos.map(f => `
                <div class="bit-field">
                    <span class="bit-field-label">
                        <i class="bi ${f.icon}"></i> ${f.label}
                    </span>
                    <span class="bit-field-val">
                        ${f.val}
                    </span>
                </div>
                `).join('')}

                ${camposFull.map(f => `
                <div class="bit-field full">
                    <span class="bit-field-label">
                        <i class="bi ${f.icon}"></i> ${f.label}
                    </span>
                    <span class="bit-field-val ${f.label === 'Descripción' ? 'desc-articulo' : ''}">
                        ${f.val}
                    </span>
                </div>
                `).join('')}

            </div>` : '';

            // Retornar estructura del timeline
            return `
    <div class="bit-item ${c.cls}">

        <!-- Línea lateral -->
        <div class="bit-left">
            <div class="bit-dot">
                <i class="bi ${c.icon}"></i>
            </div>
            ${esLinea ? '<div class="bit-line"></div>' : ''}
        </div>

        <!-- Contenido -->
        <div class="bit-body ${esUltimo ? 'bit-body-last' : ''}">

            <!-- Header -->
            <div class="bit-header">
                <span class="bit-chip ${c.cls}">
                    ${c.label}
                </span>
                ${esUltimo ? '<span class="bit-reciente">Más reciente</span>' : ''}
            </div>

            <!-- Meta -->
            <div class="bit-meta">
                <span>
                    <i class="bi bi-person-circle"></i> 
                    ${b.BIT_USUARIO || 'Sistema'}
                </span>
                <span>
                    <i class="bi bi-clock-history"></i> 
                    ${b.BIT_FECHA_MOVIMIENTO || ''}
                </span>
            </div>

            <!-- Detalle -->
            ${detalle}

        </div>
    </div>`;
        });

        // Contenedor general
        return `
<div class="bitacora-wrap" data-open="false">

    <!-- Botón toggle -->
    <button class="bit-toggle-btn" onclick="
        const w = this.closest('.bitacora-wrap');
        const isOpen = w.dataset.open === 'true';
        w.dataset.open = String(!isOpen);
        this.querySelector('.bit-chevron').style.transform = isOpen ? '' : 'rotate(180deg)';
    ">

        <span class="bit-toggle-left">
            <i class="bi bi-clock-history"></i>
            Historial de cambios
        </span>

        <span class="bit-toggle-right">
            <span class="bit-count-pill">
                ${bitacora.length} 
                ${bitacora.length === 1 ? 'registro' : 'registros'}
            </span>
            <i class="bi bi-chevron-down bit-chevron"></i>
        </span>

    </button>

    <!-- Timeline -->
    <div class="bit-timeline">
        ${items.join('')}
    </div>

</div>`;
    }

    // ─────────────────────────────────────────────
    // CARDS — cambiar de página
    // ─────────────────────────────────────────────
    irPaginaCards(p) {
        this._cardsPagina = p;
        this.cargarCards();
    }

    // ─────────────────────────────────────────────
    // CARDS — carga principal
    // ─────────────────────────────────────────────
    cargarCards(callback = null) {
        document.getElementById('cardsPlaneacionGrid').innerHTML =
            Array(3).fill('<div class="skeleton-card"></div>').join('');

        $.ajax({
            url: `/${this.URLBase}/obtenerPlanesProgramados`,
            type: 'POST',
            dataType: 'json',
            data: {
                start: (this._cardsPagina - 1) * this._cardsPorPagina,
                length: this._cardsPorPagina,
                FiltroFechaInicio: $("#FiltroFechaInicio").val() || null,
                FiltroFechaFin: $("#FiltroFechaFin").val() || null,
                FiltroMesAnio: $("#FiltroMesAnio").val() || null,
                FiltroLinea: $("#FiltroLinea").val() || null,
                FiltroPlanta: this.PLANTA || null,
            },
            success: (json) => {
                this._cardsTotal = json.recordsFiltered ?? json.recordsTotal ?? 0;
                if (json.error != "" && json.error != undefined) {
                    document.getElementById('cardsPlaneacionGrid').innerHTML = `
                                <div class="cards-empty">
                                    <i class="bi bi-exclamation-triangle-fill"></i>
                                    <p>${json.error}</p>
                                </div>`;
                if (callback) callback();
                }
                else {
                    this._renderGrid(json.data || []);
                    this._renderPaginacion(this._cardsTotal, this._cardsPagina, this._cardsPorPagina);
                    if (callback) callback();
                }
            },
            error: () => {
                document.getElementById('cardsPlaneacionGrid').innerHTML = `
                <div class="cards-empty">
                    <i class="bi bi-exclamation-triangle-fill"></i>
                    <p>Error al cargar los planes de producción.</p>
                </div>`;
                if (callback) callback();
            }
        });
    }

    eliminarPlan({ id, linea, mes, periodo, articulo, teorica, real }) {
        ConfirmManager.mostrar({
            titulo: `¿Eliminar plan #${id}?`,
            mensaje: `
            <div style="text-align:left; font-size:0.9rem; line-height:2;">
                <div><i class="bi bi-diagram-3-fill me-2 text-primary"></i><strong>Línea:</strong> ${linea}</div>
                <div><i class="bi bi-calendar3 me-2 text-primary"></i><strong>Mes:</strong> ${mes}</div>
                <div><i class="bi bi-calendar-range me-2 text-primary"></i><strong>Período:</strong> ${periodo}</div>
                <div><i class="bi bi-box-seam-fill me-2 text-primary"></i><strong>Artículo:</strong> ${articulo}</div>
                <div><i class="bi bi-calculator-fill me-2 text-primary"></i><strong>Prod. Teórica:</strong> ${teorica} PZ</div>
                <div><i class="bi bi-graph-up-arrow me-2 text-primary"></i><strong>Prod. Real:</strong> ${real} PZ</div>
                <hr style="margin:8px 0;">
                <span class="text-danger"><i class="bi bi-exclamation-triangle-fill me-1"></i>Esta acción no se puede deshacer.</span>
            </div>
        `,
            onConfirm: () => {
                GlobalUtil.mostrarLoader(true);
                $.ajax({
                    url: `/${this.URLBase}/EliminarPlanProduccion`,
                    type: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({
                        ID_PLAN: id,
                        PLANTA: this.datos_usuario[0].PLANTA,
                        USUARIO: this.datos_usuario[0].EMAIL
                    }),
                    success: (response) => {
                        if (response.Status === 'SI') {
                            AlertManager.mostrar(`🗑️ Plan #${id} de ${linea} eliminado correctamente`, 'success');
                            this.cargarCards();
                        } else {
                            AlertManager.mostrar(`❌ ${response.Message || 'Error al eliminar'}`, 'warning');
                        }
                        GlobalUtil.mostrarLoader(false);
                    },
                    error: () => {
                        AlertManager.mostrar('Error al conectar con el servidor', 'warning');
                        GlobalUtil.mostrarLoader(false);
                    }
                });
            }
        });
    }

    // ─────────────────────────────────────────────
    // EXPORTAR EXCEL
    // ─────────────────────────────────────────────
    async exportarExcel() {
        try {
            // ✅ obtener datos directamente del endpoint en vez del DataTable
            const response = await $.ajax({
                url: `/${this.URLBase}/obtenerPlanesProgramados`,
                type: 'POST',
                data: {
                    start: 0,
                    length: 9999, // todos los registros
                    FiltroFechaInicio: $("#FiltroFechaInicio").val() || null,
                    FiltroFechaFin: $("#FiltroFechaFin").val() || null,
                    FiltroMesAnio: $("#FiltroMesAnio").val() || null,
                    FiltroLinea: $("#FiltroLinea").val() || null,
                    FiltroPlanta: this.PLANTA || null,
                }
            });

            const data = response.data || [];

            if (!data.length) {
                AlertManager.mostrar('📭 No hay datos para exportar', 'warning');
                return;
            }

            $('#btnExportarExcel').html('<span class="spinner-border spinner-border-sm me-2"></span>Exportando...').prop('disabled', true);

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('PlanProduccion', {
                pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
            });

            // ── Título principal (A1:I1) ──────────────────────────────────────
            worksheet.mergeCells('A1:I1');
            const headerCell = worksheet.getCell('A1');
            headerCell.value = '📊 PROGRAMACIÓN PLAN PRODUCCIÓN';
            headerCell.font = { name: 'Segoe UI', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
            headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0058A1' } };
            headerCell.alignment = { vertical: 'middle', horizontal: 'center' };
            worksheet.getRow(1).height = 40;

            // ── Fila de info (fila 2) ─────────────────────────────────────────
            worksheet.mergeCells('A2:D2');
            const infoCell1 = worksheet.getCell('A2');
            const fechaActual = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
            infoCell1.value = `📅 Fecha de Generación: ${fechaActual}`;
            infoCell1.font = { name: 'Segoe UI', size: 11, bold: true };
            infoCell1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };
            infoCell1.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
            worksheet.getRow(2).height = 25;

            worksheet.mergeCells('E2:I2');
            const infoCell2 = worksheet.getCell('E2');
            infoCell2.value = `📈 Total de Registros: ${data.length}`;
            infoCell2.font = { name: 'Segoe UI', size: 11, bold: true };
            infoCell2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
            infoCell2.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };

            // ── Fila separadora ───────────────────────────────────────────────
            worksheet.getRow(3).height = 10;

            // ── Headers (fila 4) ──────────────────────────────────────────────
            const headerRow = worksheet.getRow(4);
            const headers = [
                { text: '🏭 Línea de Producción', width: 30 },
                { text: '📦 Artículo', width: 70 },
                { text: '⚙️ Capacidad', width: 20 },
                { text: '🔧 Proceso', width: 30 },
                { text: '📆 Mes/Año', width: 22 },
                { text: '📅 Rango Días', width: 22 },
                { text: '📋 Producción Teórica', width: 20 },
                { text: '📊 Producción Real', width: 20 },
                { text: '💬 Comentarios', width: 44 }
            ];

            headers.forEach((header, index) => {
                const col = String.fromCharCode(65 + index);
                worksheet.getColumn(col).width = header.width;
                const cell = headerRow.getCell(index + 1);
                cell.value = header.text;
                cell.font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'gradient', gradient: 'angle', degree: 90, stops: [{ position: 0, color: { argb: 'FF1976D2' } }, { position: 1, color: { argb: 'FF0058A1' } }] };
                cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                cell.border = {
                    top: { style: 'medium', color: { argb: 'FF0058A1' } },
                    left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                    bottom: { style: 'medium', color: { argb: 'FF0058A1' } },
                    right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
                };
            });
            headerRow.height = 35;

            // ── Filas de datos ────────────────────────────────────────────────
            data.forEach((row, index) => {
                const rowNumber = 5 + index;
                const excelRow = worksheet.getRow(rowNumber);
                const bgColor = index % 2 === 0 ? 'FFFFFFFF' : 'FFF5F5F5';

                const ProReal = (parseFloat(row.PRODUCCION_REAL) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 });
                const ProTe = (parseFloat(row.PRODUCCION_TEORICA) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 });

                const rowData = [
                    row.LINEA_PRODUCCION_DESC || '',
                    `${row.ARTICULO} - ${row.ARTICULO_DESC}`,
                    row.CAPACIDAD || '',
                    row.PROCESO || '',
                    `${DateUtils.getMesAnioString(row.FECHA_PLAN_STRING) || ''}`,
                    `Del ${row.DIA_INICIO_MANT_STR} - Al ${row.DIA_FIN_MANT_STR}`,
                    ProTe,
                    ProReal,
                    row.COMENTARIOS || ''
                ];

                rowData.forEach((value, colIndex) => {
                    const cell = excelRow.getCell(colIndex + 1);
                    cell.value = value;
                    cell.font = { name: 'Segoe UI', size: 10 };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
                    cell.alignment = {
                        vertical: 'middle',
                        horizontal: colIndex <= 1 ? 'left' : 'center',
                        indent: colIndex <= 1 ? 1 : 0
                    };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                        right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
                    };
                });
                excelRow.height = 22;
            });

            // ── Footer ────────────────────────────────────────────────────────
            const lastRow = worksheet.getRow(5 + data.length);
            worksheet.mergeCells(`A${lastRow.number}:I${lastRow.number}`);
            const summaryCell = worksheet.getCell(`A${lastRow.number}`);
            summaryCell.value = `✅ Fin del reporte - ${data.length} registros exportados`;
            summaryCell.font = { name: 'Segoe UI', size: 11, bold: true, italic: true, color: { argb: 'FF666666' } };
            summaryCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
            summaryCell.alignment = { vertical: 'middle', horizontal: 'center' };
            summaryCell.border = {
                top: { style: 'medium', color: { argb: 'FF0058A1' } },
                bottom: { style: 'medium', color: { argb: 'FF0058A1' } }
            };
            lastRow.height = 30;

            // ── Freeze & AutoFilter ───────────────────────────────────────────
            worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 4 }];
            worksheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: 9 } };

            // ── Descargar ─────────────────────────────────────────────────────
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const fecha = new Date().toISOString().split('T')[0];
            const nombreArchivo = `PlanProduccion_PTM_${fecha}.xlsx`;
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = nombreArchivo;
            link.click();

            AlertManager.mostrar('📊 ¡Excel exportado con éxito! 🎉', 'success');

        } catch (error) {
            console.error('Error al exportar:', error);
            AlertManager.mostrar('❌ Error al exportar: ' + error.message, 'warning');
        } finally {
            $('#btnExportarExcel').html('<i class="bi bi-file-earmark-excel-fill me-1"></i>Exportar').prop('disabled', false);
        }
    }

    // ─────────────────────────────────────────────
    // GUARDAR PLAN  (solo cambio: refresca cards)
    // ─────────────────────────────────────────────
    guardarPlan(e) {
        e.preventDefault();

        if (!ValidationManager.validarFormulario('#eventForm')) {
            AlertManager.mostrar('⚠️ Por favor, complete correctamente todos los campos', 'warning', 'alertPlanContainer');
            return false;
        }

        const mesAnio = $('#MesAnioPlan').val();
        const lineaProduccion = $('#PlanLinea').val();
        const lineaProduccionDesc = $('#PlanLinea option:selected').text();
        const proceso = $('#PlanProceso').val();
        const codigoarticulo = $('#CodigoArticulo').val();
        const capacidad = $('#PlanCap').val();
        const diaInicio = $('#DiaInicioMant').val();
        const diaFin = $('#DiaFinMant').val();
        const produccionTeorica = $('#ProduccionTeorica').val();
        const produccionReal = $('#ProduccionReal').val();
        const comentarios = $("#Comentarios").val();

        const fechaInicio = new Date(diaInicio);
        const fechaFin = new Date(diaFin);

        if (fechaFin < fechaInicio) {
            AlertManager.mostrar('📅 El día final debe ser mayor o igual al día inicial', 'warning');
            return;
        }

        if (fechaInicio > fechaFin) {
            AlertManager.mostrar('La fecha de inicio no puede ser mayor a la fecha de fin.', 'warning');
            return;
        }

        const fechaPlan = `${mesAnio}-01`;

        const datos = {
            LINEA_PRODUCCION: lineaProduccion,
            LINEA_PRODUCCION_DESC: lineaProduccionDesc,
            PROCESO: proceso,
            ARTICULO: codigoarticulo,
            CAPACIDAD: capacidad,
            DIA_INICIO_MANT: diaInicio,
            DIA_FIN_MANT: diaFin,
            PRODUCCION_TEORICA: produccionTeorica,
            PRODUCCION_REAL: produccionReal,
            FECHA_PLAN: fechaPlan,
            PLANTA: this.PLANTA,
            COMENTARIOS: comentarios,
            USUARIO: this.datos_usuario[0].EMAIL
        };

        $("#btnGuardarEvento").html('<span class="spinner-border spinner-border-sm me-2"></span>Guardando...').prop("disabled", true);

        const idPlan = $('#IdPlanEditar').val();
        if (idPlan != '')
            datos.ID_PLAN = idPlan;
        const url = idPlan
            ? `/${this.URLBase}/ActualizarPlanProduccion`   // edición
            : `/${this.URLBase}/InsertarPlanProduccion`;     // nuevo

        $.ajax({
            url: url,
            type: 'POST',
            contentType: 'application/json; charset=utf-8',
            data: JSON.stringify(datos),
            dataType: 'json',
            success: (response) => {
                if (response.Status === 'SI') {
                    let message = idPlan != '' ? 'Plan actualizado correctamente' : 'Plan generado correctamente';
                    $("#btnGuardarEvento").html(`<i class="bi bi-check-circle-fill me-2 text-white">${message}</i>`).prop("disabled", false);

                    // ✅ CAMBIO: refresca cards en vez de DataTable.ajax.reload()
                    this.cargarCards();

                    $('#eventForm')[0].reset();
                    ValidationManager.limpiarValidacion("eventForm");

                    setTimeout(() => {
                        $("#btnGuardarEvento").html('<i class="bi bi-save me-1"></i>Guardar');
                        $('#addEventModal').modal('hide');
                    }, 3000);

                    const diasTotal = parseInt(diaFin) - parseInt(diaInicio) + 1;
                    message = idPlan != '' ? 'Actualizado' : 'Programado';
                    AlertManager.mostrar(`Plan ${message} para línea ${lineaProduccionDesc} (${diasTotal} días)`, 'success');

                } else {
                    $("#btnGuardarEvento").html('<i class="bi bi-save me-1"></i>Guardar').prop("disabled", false);
                    AlertManager.mostrar(`${response.Message || 'Error al insertar el plan de producción.'}`, 'warning', "alertPlanContainer");
                }
            },
            error: () => {
                $("#btnGuardarEvento").html('<i class="bi bi-save me-1"></i>Guardar').prop("disabled", false);
                // ❌ Error del servidor en guardarPlan
                AlertManager.mostrar('Error al conectar con el servidor', 'warning', "alertPlanContainer");
            }
        });
    }

    // ─────────────────────────────────────────────
    // GUARDAR PARO  (sin cambios)
    // ─────────────────────────────────────────────
    guardarParo(e) {
        e.preventDefault();

        if (!ValidationManager.validarFormulario('#formRegistrarParo')) {
            AlertManager.mostrar('⚠️ Por favor, complete correctamente todos los campos', 'warning', 'alertParoContainer');
            return false;
        }

        const lineaProduccion = $('#ParoLinea').val();
        const comentarios = $("#ParoComentarios").val();
        const lineaProduccionDesc = $('#ParoLinea option:selected').text();
        const datos = { LINEA_PRODUCCION: lineaProduccion, COMENTARIOS: comentarios, USUARIO: this.datos_usuario[0].EMAIL };

        $("#btnGuardarParo").html('<span class="spinner-border spinner-border-sm me-2"></span>Guardando...').prop("disabled", true);

        $.ajax({
            url: `/${this.URLBase}/InsertarParoProduccion`,
            type: 'POST',
            contentType: 'application/json; charset=utf-8',
            data: JSON.stringify(datos),
            dataType: 'json',
            success: (response) => {
                if (response.Status === 'SI') {
                    $("#btnGuardarParo").html(`<i class="bi bi-check-circle-fill me-2 text-white"></i>Paro de línea ${lineaProduccionDesc} generado correctamente.`).prop("disabled", false);
                    $('#formRegistrarParo')[0].reset();
                    ValidationManager.limpiarValidacion("formRegistrarParo");
                    setTimeout(() => {
                        $("#btnGuardarParo").html('<i class="bi bi-save me-1"></i>Guardar');
                        $('#modalRegistrarParo').modal('hide');
                    }, 3000);
                } else {
                    $("#btnGuardarParo").html('<i class="bi bi-save me-1"></i>Guardar').prop("disabled", false);
                    AlertManager.mostrar(`${response.Message || 'Error al insertar el paro.'}`, 'warning', "alertParoContainer");
                }
            },
            error: () => {
                $("#btnGuardarParo").html('<i class="bi bi-save me-1"></i>Guardar').prop("disabled", false);
                AlertManager.mostrar('Error al conectar con el servidor', 'warning', "alertParoContainer");
            }
        });
    }

    // ─────────────────────────────────────────────
    // MODALES  (sin cambios)
    // ─────────────────────────────────────────────
    abrirModalAgregarPlan(e) {
        e.preventDefault();
        this.llenarDiasDelMes();
        $('#PlanLinea').prop("disabled", false);
        $('#IdPlanEditar').val('');
        $("#eventForm")[0].reset();
        $("#PlanCap").val(Math.floor(Math.random() * (50 - 10 + 1)) + 10);
        $('#addEventModal').modal('show');
    }
    // =====================================================
    // MÉTODO JS — abrirModalEditarPlan
    // Reemplaza el método en tu clase PlaneacionManager
    // =====================================================

    abrirModalEditarPlan(id) {
        const btnEdit = document.querySelector(`.prod-card[data-id="${id}"] .btn-act.edit`);
        if (btnEdit) btnEdit.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

        $.ajax({
            url: `/${this.URLBase}/obtenerPlanesProgramados`,
            type: 'POST',
            dataType: 'json',
            data: {
                FiltroIdPlan: id,
                FiltroPlanta: this.PLANTA,
            },
            success: (response) => {
                if (btnEdit) btnEdit.innerHTML = '<i class="bi bi-pencil-square"></i>';

                if (!response.data || !response.data.length) {
                    AlertManager.mostrar('🔍 No se encontró el plan solicitado.', 'warning');
                    return;
                }

                const plan = response.data[0];

                // ✅ Si hay bitácora, tomar el último registro (más reciente)
                // y sobreescribir los campos del plan con esos valores
                const bitacora = plan.BITACORA || [];
                const ultimaEdic = bitacora.length ? bitacora[bitacora.length - 1] : null;

                // ── Función helper: usa valor de bitácora si existe, si no el del plan ──
                const val = (nvo, original) => (nvo !== null && nvo !== undefined && String(nvo).trim() !== '') ? nvo : original;

                // ── Datos finales a mostrar en el modal ──────────────────────────────
                const datos = ultimaEdic ? {
                    LINEA_PRODUCCION: val(ultimaEdic.NVO_LINEA_PRODUCCION, plan.LINEA_PRODUCCION),
                    ID_PROCESO: val(ultimaEdic.ID_NVO_PROCESO, plan.ID_PROCESO),
                    ARTICULO: val(ultimaEdic.NVO_ARTICULO, plan.ARTICULO),
                    ARTICULO_DESC: ultimaEdic.NVO_ARTICULO_DESC, // no está en bitácora, se queda del plan
                    CAPACIDAD: val(ultimaEdic.NVO_CAPACIDAD, plan.CAPACIDAD),
                    DIA_INICIO_MANT: val(ultimaEdic.NVO_DIA_INICIO_MANT_STR, plan.DIA_INICIO_MANT_STR),
                    DIA_FIN_MANT: val(ultimaEdic.NVO_DIA_FIN_MANT_STR, plan.DIA_FIN_MANT_STR),
                    PRODUCCION_TEORICA: val(ultimaEdic.NVO_PRODUCCION_TEORICA, plan.PRODUCCION_TEORICA),
                    PRODUCCION_REAL: val(ultimaEdic.NVO_PRODUCCION_REAL, plan.PRODUCCION_REAL),
                    COMENTARIOS: val(ultimaEdic.NVO_COMENTARIOS, plan.COMENTARIOS),
                    FECHA_PLAN_STRING: val(ultimaEdic.NVO_FECHA_PLAN, plan.FECHA_PLAN_STRING),
                    LINEA_PRODUCCION_DESC: plan.LINEA_PRODUCCION_DESC,
                } : plan;  // si no hay bitácora usa el plan original directo

                ValidationManager.limpiarValidacion("eventForm");

                // ── Mes/Año ──────────────────────────────────────────────────────────
                if (datos.FECHA_PLAN_STRING) {
                    const partes = datos.FECHA_PLAN_STRING.split('/');
                    // puede venir DD/MM/YYYY o MM/YYYY dependiendo del campo
                    const mes = partes.length === 3 ? partes[1] : partes[0];
                    const anio = partes.length === 3 ? partes[2] : partes[1];
                    $('#MesAnioPlan').val(`${anio}-${mes}`);
                }

                // ── Línea ────────────────────────────────────────────────────────────
                $('#PlanLinea').val(datos.LINEA_PRODUCCION).trigger('change');
                $('#PlanLinea').prop("disabled", true);

                // ── Rango de días ────────────────────────────────────────────────────
                $('#DiaInicioMant').val(DateUtils.convertirFecha(datos.DIA_INICIO_MANT));
                $('#DiaFinMant').val(DateUtils.convertirFecha(datos.DIA_FIN_MANT));

                // ── Proceso ──────────────────────────────────────────────────────────
                setTimeout(() => {
                    $('#PlanProceso').val(datos.ID_PROCESO);
                }, 100);


                // ── Artículo ─────────────────────────────────────────────────────────
                $('#CodigoArticulo').val(datos.ARTICULO);
                $('#DescripcionArticulo').val(datos.ARTICULO_DESC);
                $('#PlanCap').val(datos.CAPACIDAD);

                // ── Producción ───────────────────────────────────────────────────────
                $('#ProduccionTeorica').val(datos.PRODUCCION_TEORICA);
                $('#ProduccionReal').val(datos.PRODUCCION_REAL);

                // ── Comentarios ──────────────────────────────────────────────────────
                $('#Comentarios').val(datos.COMENTARIOS || '');

                // ── IDs y título ─────────────────────────────────────────────────────
                $('#selectedDate').val(plan.ID_PLAN);
                $('#IdPlanEditar').val(id);
                $('#addEventModal .modal-title').html(
                    `<i class="bi bi-pencil-square me-2"></i>Editar Plan — ${datos.LINEA_PRODUCCION_DESC}`
                );

                $('#addEventModal').modal('show');
            },
            error: () => {
                if (btnEdit) btnEdit.innerHTML = '<i class="bi bi-pencil-square"></i>';
                AlertManager.mostrar('Error al obtener los datos del plan.', 'warning');
            }
        });
    }

    abrirModalRegistrarParo(e) {
        e.preventDefault();
        $('#modalRegistrarParo').modal('show');
    }

    llenarDiasDelMes() {
        const selectInicio = $('#DiaInicioMant');
        const selectFin = $('#DiaFinMant');

        selectInicio.empty().append('<option value="">Día inicio</option>');
        selectFin.empty().append('<option value="">Día fin</option>');

        const diasDelMes = DateUtils.generarDiasDelMes();
        diasDelMes.forEach(dia => {
            selectInicio.append(`<option value="${dia.valor}">${dia.texto}</option>`);
            selectFin.append(`<option value="${dia.valor}">${dia.texto}</option>`);
        });
    }

    obtenerPlanesProducción(fechaInicio = null, fechaFin = null) {
        return new Promise((resolve, reject) => {
            if (!fechaInicio || !fechaFin) {
                const anioActual = new Date().getFullYear();
                fechaInicio = `${anioActual}-01-01`;
                fechaFin = `${anioActual}-12-31`;
            }
            $.ajax({
                url: `/${this.URLBase}/obtenerPlanesProgramados`,
                type: 'GET',
                data: { fechaInicio, fechaFin },
                headers: { 'Content-Type': 'application/json' },
                success(data) {
                    if (data.Status === 'OK') {
                        let m = data.Data;
                        if (typeof m === 'string') { try { m = JSON.parse(m); } catch (e) { reject(e); return; } }
                        resolve(m);
                    } else if (data.Status === 'NO') {
                        UIManager.mostrarAlert(data.Message, 'info'); resolve([]);
                    } else {
                        UIManager.mostrarAlert('Error: ' + data.Message, 'warning'); reject(data.Message);
                    }
                },
                error(xhr, status, error) { reject(error); }
            });
        });
    }

    transformarEventosCalendario(datosHana) {
        const colores = { 'Preventivo': '#28a745', 'Correctivo': '#dc3545' };
        return datosHana.map(item => ({
            id: item.ID_MANTENIMIENTO,
            title: `${item.TIPO_MANTENIMIENTO} - ${item.NOMBRE_EQUIPO}`,
            start: new Date(item.FECHA_COMPLETADO).toISOString().split('T')[0],
            allDay: true,
            color: colores[item.TIPO_MANTENIMIENTO] || '#6c757d',
            extendedProps: { ...item }
        }));
    }

    actualizarTitulo(info) {
        const viewType = info.view.type;
        let titleText = '';
        if (viewType === 'dayGridMonth') {
            const currentDate = info.view.currentStart;
            let monthName = currentDate.toLocaleString('es-ES', { month: 'long' });
            monthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);
            titleText = `${monthName} ${currentDate.getFullYear()}`;
        } else {
            titleText = info.view.title.replace(/\s+de\s+/i, ' ');
            titleText = titleText.charAt(0).toUpperCase() + titleText.slice(1);
        }
        const titleEl = document.querySelector('.fc-toolbar-title');
        if (titleEl) titleEl.textContent = titleText;
    }

    obtenerNombreMes(fecha) {
        return ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][fecha.getMonth()];
    }

    async reanudarParo(idParo, lineaDesc) {
        const { value: comentarios } = await Swal.fire({
            title: '¿Reanudar Producción?',
            html: `¿Está seguro que desea reanudar la producción de <strong>${lineaDesc}</strong>?`,
            input: 'textarea',
            inputLabel: 'Comentarios adicionales (opcional)',
            inputPlaceholder: 'Ej: Reparación completada...',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#6c757d',
            confirmButtonText: '<i class="bi bi-play-circle me-1"></i>Sí, reanudar',
            cancelButtonText: 'Cancelar'
        });

        if (comentarios !== undefined) {
            try {
                GlobalUtil.mostrarLoader(true);
                const resultado = await this.reanudarParoProduccion(idParo, comentarios || '');
                if (resultado && resultado.ESTATUS === 'C') {
                    await Swal.fire({ title: '¡Producción Reanudada!', text: 'La línea ha sido reactivada correctamente', icon: 'success', timer: 2000, showConfirmButton: false });
                    $('#eventModal').modal('hide');
                } else {
                    throw new Error(resultado?.MENSAJE || 'Error al reanudar el paro');
                }
            } catch (error) {
                Swal.fire({ title: 'warning', text: 'No se pudo reanudar la producción.', icon: 'warning' });
            } finally {
                GlobalUtil.mostrarLoader(false);
            }
        }
    }

    async reanudarParoProduccion(idParo, comentarios) {
        const response = await fetch('/api/tu-endpoint-reanudar-paro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idParo, comentarios })
        });
        if (!response.ok) throw new Error('Error en la petición');
        return response.json();
    }

    llenarTablaOrdenesFabricacion() {
        // Sin cambios — se mantiene igual que tu código original
    }
}

