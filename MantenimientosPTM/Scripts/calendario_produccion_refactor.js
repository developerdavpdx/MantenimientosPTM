// ============================================================
// CALENDARIO PLAN DE PRODUCCIÓN
// Extiende GestionProduccionBase (Global.js)
// Requiere: Global.js, Bootstrap 5, jQuery
// ============================================================

// ============================================================
// GESTOR DE EVENTOS
// ============================================================
class GestionEventosCalendario {
    constructor() {
        this.datos_usuario = GlobalUtil.getDatosUsuario();
        this.appCalendario = new GestionCalendarioProduccion(
            this.datos_usuario,
            'Planeacion'
        );
    }

    inicializar() {
        UIManagerCalendario.inicializarUI();
        this.appCalendario.inicializar();
        console.log('✅ Sistema Calendario Producción inicializado');
    }
}

// ============================================================
// INICIALIZACIÓN
// ============================================================
$(document).ready(function () {
    const app = new GestionEventosCalendario();
    app.inicializar();
});

// ============================================================
// GESTOR DE UI
// ============================================================
class UIManagerCalendario {
    static inicializarUI() {
        // Aquí puedes añadir la misma lógica de tu UIManager
        // para marcar el ítem activo en el menú lateral, etc.
        $("#PlaneacionContainer").addClass("selected");
        $("#PlaneacionContainer a").addClass("whiteText");
        $("#planeacion-collapse").addClass("show");
        $("#CalendarioProduccionURL").addClass("selected-item");
        console.log('✅ UI Calendario inicializada');
    }
}

// ============================================================
// APLICACIÓN PRINCIPAL — CALENDARIO
// ============================================================
class GestionCalendarioProduccion extends GestionProduccionBase {

    constructor(datos_usuario, URLBase) {
        super(datos_usuario, URLBase);

        // Estado del calendario
        this.vistaActual = 'week';         // 'week' | 'month'
        this.fechaAncla = new Date();     // fecha de referencia para la vista
        this.planesData = [];             // datos crudos del servidor
        this.coloresLinea = {};             // mapa lineaId → color hex

        // Paleta de colores (sincronizada con la que usas en exportarPlanesAExcel)
        this._paleta = [
            '#00b4d8', '#e63946', '#f4a261', '#2a9d8f',
            '#6a4c93', '#e9c46a', '#264653', '#e76f51',
            '#43aa8b', '#577590', '#d62828', '#023e8a'
        ];

        this._paletaIdx = 0;
    }

    // ── Inicialización ───────────────────────────────────────
    async inicializar() {
        this._fijarMesActual();
        await this._cargarSelects();
        this._configurarEventos();
        await this.cargarDatosIniciales();
    }

    // Establece el filtro de mes en el valor actual
    _fijarMesActual() {
        const hoy = new Date();
        const yyyy = hoy.getFullYear();
        const mm = String(hoy.getMonth() + 1).padStart(2, '0');
        $('#CalFiltroMesAnio').val(`${yyyy}-${mm}`);
    }

    // Carga procesos y líneas usando las utilidades de Global.js
    async _cargarSelects() {
        const planta = this.datos_usuario?.[0]?.PLANTA || 1;
        EquiposUtil.llenarProcesos(planta, 'CalFiltroProceso', 'CalFiltroProceso');

        // Al cambiar proceso → cargar líneas
        $('#CalFiltroProceso').on('change', () => {
            const idProceso = $('#CalFiltroProceso').val();
            if (idProceso) {
                EquiposUtil.llenarLineas(planta, idProceso, 1, 'CalFiltroLinea', 'CalFiltroLinea');
                $('#CalFiltroLinea').prop('disabled', false);
            } else {
                $('#CalFiltroLinea').empty()
                    .append('<option value="">Todas las líneas...</option>')
                    .prop('disabled', true);
            }
        });
    }

    // ── Eventos UI ───────────────────────────────────────────
    _configurarEventos() {
        // Buscar
        $('#btnBuscarCalendario').on('click', () => this.cargarDatosIniciales());

        // Limpiar filtros
        $('#btnLimpiarCalendario').on('click', () => {
            $('#formFiltrosCalendario')[0].reset();
            this._fijarMesActual();
            $('#CalFiltroLinea').empty()
                .append('<option value="">Todas las líneas...</option>')
                .prop('disabled', true);
            this.fechaAncla = new Date();
            this.planesData = [];
            this.coloresLinea = {};
            this._paletaIdx = 0;
            this._renderCalendario();
        });

        // Navegación
        $('#btnCalAnterior').on('click', () => this._navegar(-1));
        $('#btnCalSiguiente').on('click', () => this._navegar(1));
        $('#btnCalHoy').on('click', () => {
            this.fechaAncla = new Date();
            this._renderCalendario();
        });

        // Cambio de vista (semana/mes)
        $('#CalVistaSelector').on('change', () => {
            this.vistaActual = $('#CalVistaSelector').val();
            this._renderCalendario();
        });

        // Exportar Excel — reutiliza GlobalUtil
        $('#btnExportarExcel').on('click', () => this._exportarExcel());

        // Tooltip: ocultar al hacer scroll
        $(window).on('scroll resize', () => this._ocultarTooltip());
    }

    // ── Carga de datos ───────────────────────────────────────
    async cargarDatosIniciales() {
        GlobalUtil.mostrarLoader(true);

        const mesAnio = $('#CalFiltroMesAnio').val();   // yyyy-MM
        const proceso = $('#CalFiltroProceso').val();
        const linea = $('#CalFiltroLinea').val();
        const planta = this.datos_usuario?.[0]?.PLANTA || 1;

        // Ajustar ancla al mes filtrado si viene
        if (mesAnio) {
            const [y, m] = mesAnio.split('-');
            this.fechaAncla = new Date(+y, +m - 1, 1);
        }

        try {
            const response = await $.ajax({
                url: `/${this.URLBase}/obtenerPlanesProgramados`,
                method: 'POST',                           // ← POST
                data: {
                    draw: 1,
                    start: 0,
                    length: 9999,                 // sin paginación para el calendario
                    FiltroMesAnio: mesAnio,              // ← nombre exacto del Form
                    FiltroProceso: proceso,
                    FiltroLinea: linea,
                    FiltroPlanta: planta,
                    FiltroFechaInicio: '',
                    FiltroFechaFin: ''
                },
                dataType: 'json'
            });

            // Tu action devuelve { draw, recordsTotal, data, Status:'OK' }
            if (response.data && response.data.length > 0) {
                this._procesarDatos(response.data);
            } else if (response.error) {
                AlertManager.mostrar(response.error, 'warning');
            } else {
                // Sin registros
                this.planesData = [];
                this._renderCalendario();
            }

        } catch (err) {
            AlertManager.mostrar('Error al cargar el calendario de producción.', 'warning');
            console.error(err);
        } finally {
            GlobalUtil.mostrarLoader(false);
        }
    }

    // Asigna colores a cada línea y transforma fechas
    _procesarDatos(data) {
        this.planesData = [];
        this.coloresLinea = {};
        this._paletaIdx = 0;

        data.forEach(plan => {
            const bitacora = plan.BITACORA || [];
            const linea = plan.LINEA_PRODUCCION;
            const linea_desc = plan.LINEA_PRODUCCION_DESC;

            // Color base de la línea
            if (!this.coloresLinea[linea]) {
                this.coloresLinea[linea] = plan.COLOR_EVENTO ||
                    this._paleta[this._paletaIdx % this._paleta.length];
                this._paletaIdx++;
            }

            // ── Pintar CADA entrada de bitácora como píldora independiente ──
            bitacora
                .sort((a, b) => (a.ID_BITACORA || 0) - (b.ID_BITACORA || 0))
                .forEach((bit, idx) => {
                    const inicioStr = bit.NVO_DIA_INICIO_MANT_STR || plan.DIA_INICIO_MANT_STR;
                    const finStr = bit.NVO_DIA_FIN_MANT_STR || plan.DIA_FIN_MANT_STR;
                    const inicio = this._parseDMY(inicioStr);
                    const fin = this._parseDMY(finStr);

                    if (!inicio || !fin) return;

                    // Variar color por entrada para distinguirlas visualmente
                    const color = idx === 0
                        ? this.coloresLinea[linea]
                        : this._paleta[(this._paletaIdx + idx) % this._paleta.length];

                    this.planesData.push({
                        id_plan: plan.ID_PLAN,
                        id_bitacora: bit.ID_BITACORA,
                        linea,
                        linea_desc: `${linea_desc}`,
                        articulo: bit.NVO_ARTICULO || plan.ARTICULO,
                        articulo_desc: bit.NVO_ARTICULO_DESC || plan.ARTICULO_DESC,
                        proceso: bit.NVO_PROCESO || plan.PROCESO,
                        inicio,
                        fin,
                        pzsxdia: parseFloat(bit.NVO_PZSXDIA ?? plan.PZSXDIA ?? 0),
                        kgsxdia: parseFloat(bit.NVO_KGSXDIA ?? plan.KGSXDIA ?? 0),
                        prod_teo_pzs: parseFloat(bit.NVO_PRODUCCION_TEORICA_PZS ?? plan.PRODUCCION_TEORICA_PZS ?? 0),
                        prod_teo_kgs: parseFloat(bit.NVO_PRODUCCION_TEORICA_KGS ?? plan.PRODUCCION_TEORICA_KGS ?? 0),
                        color,
                        estatus: plan.ESTATUS,
                        accion: bit.BIT_ACCION
                    });
                });
        });

        this._renderCalendario();
    }

    // Parsea 'dd/MM/yyyy' → Date
    _parseDMY(str) {
        if (!str) return null;
        const [d, m, y] = str.split('/');
        if (!d || !m || !y) return null;
        const dt = new Date(+y, +m - 1, +d);
        return isNaN(dt) ? null : dt;
    }

    // ── Navegación ───────────────────────────────────────────
    _navegar(dir) {
        if (this.vistaActual === 'week') {
            this.fechaAncla.setDate(this.fechaAncla.getDate() + dir * 7);
        } else {
            this.fechaAncla.setMonth(this.fechaAncla.getMonth() + dir);
        }
        this._renderCalendario();
    }

    // ── Render principal ─────────────────────────────────────
    _renderCalendario() {
        const dias = this.vistaActual === 'week'
            ? this._getDiasSemana(this.fechaAncla)
            : this._getDiasMes(this.fechaAncla);

        const lineas = this._getLineasUnicas();
        const hoy = DateUtils.obtenerFechaActual();  // 'yyyy-mm-dd'

        // Título
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const mes = this.fechaAncla.getMonth();
        const anio = this.fechaAncla.getFullYear();
        $('#calTituloMes').text(`${meses[mes]} ${anio}`);

        // ↓↓↓ ESTAS DOS LÍNEAS SON LA CORRECCIÓN ↓↓↓
        $('#calTabla')
            .toggleClass('vista-week', this.vistaActual === 'week')
            .toggleClass('vista-mes', this.vistaActual === 'month');
        // ↑↑↑ ↑↑↑ ↑↑↑ ↑↑↑ ↑↑↑ ↑↑↑ ↑↑↑ ↑↑↑ ↑↑↑ ↑↑↑

        // Estado vacío
        if (this.planesData.length === 0) {
            $('#calTabla').addClass('d-none');
            $('#calVacio').removeClass('d-none');
            this._renderLeyenda([]);
            return;
        }
        $('#calTabla').removeClass('d-none');
        $('#calVacio').addClass('d-none');

        // ─── THEAD ───────────────────────────────────────────
        const dNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        let thead = '<tr><th class="cal-th-linea">Línea</th>';
        dias.forEach(d => {
            const iso = this._fmtISO(d);
            const esHoy = iso === hoy;
            const clase = esHoy ? 'cal-th-dia cal-th-hoy' : 'cal-th-dia';
            const estilo = esHoy ? 'color:#e63946; font-weight:700;' : '';
            thead += `<th class="${clase}" style="${estilo}">
                        ${dNames[d.getDay()]} ${d.getDate()}
                      </th>`;
        });
        thead += '</tr>';
        $('#calThead').html(thead);

        // ─── TBODY ───────────────────────────────────────────
        let tbody = '';
        lineas.forEach(linea => {
            tbody += `<tr>
                        <td class="cal-td-linea" title="${linea.desc}">${linea.desc}</td>`;
            // Reemplazar la sección donde renderizas los eventos en cada celda
            dias.forEach(dia => {
                const iso = this._fmtISO(dia);
                const esHoy = iso === hoy;
                tbody += `<td class="cal-td-dia${esHoy ? ' cal-td-hoy' : ''}">`;

                const eventos = this.planesData.filter(p =>
                    p.linea == linea.id &&
                    dia >= p.inicio &&
                    dia <= p.fin
                );

                if (eventos.length > 0) {
                    tbody += `<div class="cal-pills-stack">`;   // ← wrapper stack
                    eventos.forEach(ev => {
                        const isStart = this._fmtISO(ev.inicio) === iso;
                        const isEnd = this._fmtISO(ev.fin) === iso;
                        const isSolo = isStart && isEnd;
                        const spanCls = isSolo ? 'cal-pill-solo'
                            : isStart ? 'cal-pill-start'
                                : isEnd ? 'cal-pill-end'
                                    : 'cal-pill-mid';

                        const mostrarContenido = isStart || isSolo;
                        const iniciales = (ev.proceso || 'P').slice(0, 2).toUpperCase();
                        const dataTT = this._encodeTT(ev);

                        tbody += `<div class="cal-pill ${spanCls}"
                           style="background:${ev.color}"
                           data-tt="${dataTT}"
                           data-id="${ev.id_plan}"
                           data-accion="${ev.accion}">`;

                        if (mostrarContenido) {
                            tbody += `
                    <div class="cal-pill-icon">${iniciales}</div>
                    <div class="cal-pill-content">
                        <div class="cal-pill-name">${ev.articulo}</div>
                        ${ev.pzsxdia > 0
                                    ? `<div class="cal-pill-stats">
                                 ${ev.pzsxdia.toLocaleString('es-MX')} pzs
                                 · ${ev.kgsxdia.toLocaleString('es-MX')} kg
                               </div>`
                                    : ''}
                    </div>`;
                        }
                        tbody += `</div>`;
                    });
                    tbody += `</div>`;                          // ← cierra stack
                }

                tbody += `</td>`;
            });
            tbody += `</tr>`;
        });
        $('#calTbody').html(tbody);

        // ─── EVENTOS TOOLTIP ─────────────────────────────────
        this._bindTooltipEvents();

        // ─── LEYENDA ─────────────────────────────────────────
        this._renderLeyenda(lineas);
    }

    // ── Tooltip ──────────────────────────────────────────────
    _bindTooltipEvents() {
        const $tt = $('#calTooltip');

        $(document).off('mouseenter.caltt', '.cal-pill')
            .on('mouseenter.caltt', '.cal-pill', (e) => {
                const raw = $(e.currentTarget).data('tt');
                if (!raw) return;
                const ev = JSON.parse(decodeURIComponent(raw));

                $('#calTooltipHeader').html(`
                    <span class="cal-tt-badge" style="background:${ev.color}">
                        ${ev.proceso}
                    </span>
                    <strong>${ev.articulo}</strong>
                `);
                $('#calTooltipBody').html(`
                    <div class="cal-tt-row">
                        <span class="cal-tt-label">Descripción</span>
                        <span>${ev.articulo_desc}</span>
                    </div>
                    <div class="cal-tt-row">
                        <span class="cal-tt-label">Período</span>
                        <span>${DateUtils.formatearFechaTexto(ev.inicio_iso, true)}
                              → ${DateUtils.formatearFechaTexto(ev.fin_iso, true)}</span>
                    </div>
                    <div class="cal-tt-row">
                        <span class="cal-tt-label">Piezas / día</span>
                        <span>${Number(ev.pzsxdia).toLocaleString('es-MX')}</span>
                    </div>
                    <div class="cal-tt-row">
                        <span class="cal-tt-label">Kg / día</span>
                        <span>${Number(ev.kgsxdia).toLocaleString('es-MX')}</span>
                    </div>
                    <div class="cal-tt-row">
                        <span class="cal-tt-label">Prod. Teórica</span>
                        <span>${Number(ev.prod_teo_pzs).toLocaleString('es-MX')} pzs
                              / ${Number(ev.prod_teo_kgs).toLocaleString('es-MX')} kg</span>
                    </div>
                    <div class="cal-tt-row">
                        <span class="cal-tt-label">Acción</span>
                        <span class="cal-tt-badge-sm">${ev.accion}</span>
                    </div>
                `);

                const rect = e.currentTarget.getBoundingClientRect();
                let top = rect.bottom + window.scrollY + 6;
                let left = rect.left + window.scrollX;
                $tt.removeClass('d-none').css({ top, left });

                // Ajustar si se sale de pantalla
                const ttW = $tt.outerWidth();
                if (left + ttW > window.innerWidth - 16) {
                    $tt.css('left', window.innerWidth - ttW - 16);
                }
            })
            .off('mouseleave.caltt', '.cal-pill')
            .on('mouseleave.caltt', '.cal-pill', () => this._ocultarTooltip());
    }

    _ocultarTooltip() {
        $('#calTooltip').addClass('d-none');
    }

    // ── Leyenda ──────────────────────────────────────────────
    _renderLeyenda(lineas) {
        const html = lineas.map(l => `
            <div class="cal-leyenda-item">
                <span class="cal-leyenda-dot" style="background:${this.coloresLinea[l.id] || '#ccc'}"></span>
                ${l.desc}
            </div>
        `).join('');
        $('#calLeyenda').html(html);
    }

    // ── Exportar Excel ───────────────────────────────────────
    async _exportarExcel() {
        if (!this.planesData || this.planesData.length === 0) {
            AlertManager.mostrar('No hay datos para exportar.', 'warning');
            return;
        }

        const $btn = $('#btnExportarExcel');
        $btn.html('<span class="spinner-border spinner-border-sm me-1"></span>Generando...')
            .prop('disabled', true);

        try {
            // Adaptar al formato que espera GlobalUtil.exportPlanesAExcel
            const dataExport = this.planesData.map(p => ({
                LINEA_PRODUCCION: p.linea,
                LINEA_PRODUCCION_DESC: p.linea_desc,
                ARTICULO: p.articulo,
                ARTICULO_DESC: p.articulo_desc,
                PROCESO: p.proceso,
                PZSXDIA: p.pzsxdia,
                KGSXDIA: p.kgsxdia,
                PRODUCCION_TEORICA_PZS: p.prod_teo_pzs,
                PRODUCCION_TEORICA_KGS: p.prod_teo_kgs,
                PRODUCCION_REAL: 0,
                COMENTARIOS: '',
                FECHA_PLAN_STRING: DateUtils.obtenerFechaActual(),
                DIA_INICIO_MANT_STR: this._fmtDisplay(p.inicio),
                DIA_FIN_MANT_STR: this._fmtDisplay(p.fin),
                COLOR_EVENTO: p.color,
                BITACORA: []
            }));

            await GlobalUtil.exportPlanesAExcel(dataExport, {
                fileName: `CalendarioProduccion_${DateUtils.obtenerFechaActual()}.xlsx`
            });

            AlertManager.mostrar('Excel exportado correctamente.', 'success');
        } catch (err) {
            AlertManager.mostrar('Error al exportar: ' + err.message, 'warning');
            console.error(err);
        } finally {
            $btn.html('<i class="bi bi-file-earmark-excel-fill me-1"></i>Exportar')
                .prop('disabled', false);
        }
    }

    _fmtISO(d) {
        if (!d) return '';
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dd}`;
    }

    _fmtDisplay(d) {
        if (!d) return '';
        const dd = String(d.getDate()).padStart(2, '0');
        const m = String(d.getMonth() + 1).padStart(2, '0');
        return `${dd}/${m}/${d.getFullYear()}`;
    }

    _getDiasSemana(ancla) {
        const d = new Date(ancla);
        const day = d.getDay();
        // Iniciar lunes
        const mon = new Date(d);
        mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
        return Array.from({ length: 7 }, (_, i) => {
            const x = new Date(mon);
            x.setDate(mon.getDate() + i);
            return x;
        });
    }

    _getDiasMes(ancla) {
        const y = ancla.getFullYear();
        const m = ancla.getMonth();
        const days = [];
        for (let d = new Date(y, m, 1); d.getMonth() === m; d.setDate(d.getDate() + 1)) {
            days.push(new Date(d));
        }
        return days;
    }

    _getLineasUnicas() {
        const map = {};
        this.planesData.forEach(p => {
            if (!map[p.linea]) map[p.linea] = p.linea_desc;
        });
        return Object.entries(map)
            .sort((a, b) => +a[0] - +b[0])
            .map(([id, desc]) => ({ id: +id, desc }));
    }

    // Codifica los datos del evento para el atributo data-tt
    _encodeTT(ev) {
        const obj = {
            color: ev.color,
            proceso: ev.proceso,
            articulo: ev.articulo,
            articulo_desc: ev.articulo_desc,
            inicio_iso: this._fmtISO(ev.inicio),
            fin_iso: this._fmtISO(ev.fin),
            pzsxdia: ev.pzsxdia,
            kgsxdia: ev.kgsxdia,
            prod_teo_pzs: ev.prod_teo_pzs,
            prod_teo_kgs: ev.prod_teo_kgs,
            accion: ev.accion
        };
        return encodeURIComponent(JSON.stringify(obj));
    }

    // ── Implementación requerida por GestionProduccionBase ───
    crearTotalesTemplate() {
        return { linea: 'TOTALES', pzsxdia: 0, kgsxdia: 0 };
    }
}