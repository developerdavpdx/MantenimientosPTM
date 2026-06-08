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

        // Paleta alineada al logo PTM (tonos azules corporativos)
        this._paleta = [
            '#0b64a4', // azul oscuro principal
            '#0f7cc0', // azul intermedio
            '#29a9e6', // azul claro
            '#1b6fa6', // variante
            '#0b4e84', // azul profundo
            '#083e6a'  // azul más oscuro
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
        EquiposUtil.llenarProcesos(planta, 'CalFiltroProceso', null);

        // Al cambiar proceso → cargar líneas


        $("#CalFiltroProceso")
            .off('change')
            .on('change', (e) => {

                let Proceso = $(e.currentTarget).val();

                EquiposUtil.llenarLineas(
                    this.datos_usuario[0].PLANTA,
                    Proceso,
                    1,
                    "CalFiltroLinea",
                    null
                );
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
        this._usedColors = new Set(); // evitar reutilizar colores entre líneas

        data.forEach(plan => {
            const bitacora = plan.BITACORA || [];
            const linea = plan.LINEA_PRODUCCION;
            const linea_desc = plan.LINEA_PRODUCCION_DESC;

            // Color base de la línea — elegir uno no usado aún
            if (!this.coloresLinea[linea]) {
                let chosen = null;

                // Si el plan trae COLOR_EVENTO y no ha sido usado, preferirlo
                if (plan.COLOR_EVENTO && !this._usedColors.has(plan.COLOR_EVENTO)) {
                    chosen = plan.COLOR_EVENTO;
                }

                // Si no hay color elegido, buscar en la paleta el siguiente no usado
                if (!chosen) {
                    let foundIdx = null;
                    for (let i = 0; i < this._paleta.length; i++) {
                        const idx = (this._paletaIdx + i) % this._paleta.length;
                        const c = this._paleta[idx];
                        if (!this._usedColors.has(c)) { foundIdx = idx; break; }
                    }
                    if (foundIdx !== null) {
                        chosen = this._paleta[foundIdx];
                        this._paletaIdx = (foundIdx + 1) % this._paleta.length;
                    } else {
                        // Todos los colores ya usados: reutilizar avanzando índice
                        chosen = this._paleta[this._paletaIdx % this._paleta.length];
                        this._paletaIdx = (this._paletaIdx + 1) % this._paleta.length;
                    }
                }

                this.coloresLinea[linea] = chosen;
                this._usedColors.add(chosen);
            }

            // ── Aplicar reglas de negocio sobre la bitácora antes de pintar ──
            //  Regla: Si hay múltiples entradas para el mismo artículo y sus
            //  periodos se solapan, mostrar solamente la entrada más reciente
            //  (basada en ID_BITACORA). Si los periodos son disjuntos, mostrar
            //  como eventos independientes. Diferente artículo => evento independiente.
            const procesados = [];
            const sorted = (bitacora || []).slice().sort((a, b) => (a.ID_BITACORA || 0) - (b.ID_BITACORA || 0));
            const rangesOverlap = (aStart, aEnd, bStart, bEnd) => !(aEnd < bStart || bEnd < aStart);

            sorted.forEach(bit => {
                const inicioStr = bit.NVO_DIA_INICIO_MANT_STR || plan.DIA_INICIO_MANT_STR;
                const finStr = bit.NVO_DIA_FIN_MANT_STR || plan.DIA_FIN_MANT_STR;
                const inicio = this._parseDMY(inicioStr);
                const fin = this._parseDMY(finStr);
                if (!inicio || !fin) return;

                const articulo = (bit.NVO_ARTICULO || plan.ARTICULO || '').toString();

                // Buscar si existe ya un registro procesado para el mismo artículo
                // que se solape en fechas. Si existe, lo reemplazamos por el más
                // reciente (el actual, porque estamos ordenados por ID_BITACORA asc.).
                const idx = procesados.findIndex(p => p.articulo === articulo && rangesOverlap(p.inicio, p.fin, inicio, fin));
                const nuevo = Object.assign({}, bit, { inicio, fin, articulo });
                if (idx >= 0) {
                    // Reemplazar con la entrada más reciente
                    procesados[idx] = nuevo;
                } else {
                    procesados.push(nuevo);
                }
            });

            // Ahora crear los eventos a partir de los procesados
            procesados.forEach((bit, idx) => {
                // Usar un único color por línea para todos los eventos
                const color = this.coloresLinea[linea];

                this.planesData.push({
                    id_plan: plan.ID_PLAN,
                    id_bitacora: bit.ID_BITACORA,
                    linea,
                    linea_desc: `${linea_desc}`,
                    articulo: bit.NVO_ARTICULO || plan.ARTICULO || bit.articulo,
                    articulo_desc: bit.NVO_ARTICULO_DESC || plan.ARTICULO_DESC,
                    proceso: bit.NVO_PROCESO || plan.PROCESO,
                    inicio: bit.inicio,
                    fin: bit.fin,
                    pzsxdia: parseFloat(bit.NVO_PZSXDIA ?? plan.PZSXDIA ?? 0),
                    kgsxdia: parseFloat(bit.NVO_KGSXDIA ?? plan.KGSXDIA ?? 0) || 0,
                    prod_teo_pzs: parseFloat(bit.NVO_PRODUCCION_TEORICA_PZS ?? plan.PRODUCCION_TEORICA_PZS ?? 0) || 0,
                    prod_teo_kgs: parseFloat(bit.NVO_PRODUCCION_TEORICA_KGS ?? plan.PRODUCCION_TEORICA_KGS ?? 0) || 0,
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
                    // Determinar máximo visible según la vista
                    // Semana: limitar a 2 para evitar solapamiento visual.
                    // Mes: mostrar todos los eventos (se permite scroll en CSS).
                    const maxVisible = this.vistaActual === 'week' ? 2 : eventos.length;
                    const stackClass = `cal-pills-stack max-${maxVisible}`;
                    // Contenedor de píldoras (el comportamiento responsive lo controla CSS)
                    tbody += `<div class="${stackClass}">`;   // ← wrapper stack
                    // Mostrar un máximo de píldoras por celda, luego '+N'
                    const visible = eventos.slice(0, maxVisible);
                    const extra = eventos.length - visible.length;
                    visible.forEach(ev => {
                        const isStart = this._fmtISO(ev.inicio) === iso;
                        const isEnd = this._fmtISO(ev.fin) === iso;
                        const isSolo = isStart && isEnd;
                        const spanCls = isSolo ? 'cal-pill-solo'
                            : isStart ? 'cal-pill-start'
                                : isEnd ? 'cal-pill-end'
                                    : 'cal-pill-mid';

                        // Mostrar contenido completo en todas las píldoras
                        const mostrarCompleto = true;
                        const iniciales = ((ev.proceso || ev.articulo || 'P').toString().slice(0, 2)).toUpperCase();
                        const dataTT = this._encodeTT(ev);

                        tbody += `<div class="cal-pill ${spanCls}"
                           style="background:${ev.color}"
                           data-tt="${dataTT}"
                           data-id="${ev.id_plan}"
                           data-accion="${ev.accion}">`;

                        const nombreArticulo = (ev.articulo || ev.articulo_desc || 'Artículo').toString();
                        const pzs = Number(ev.pzsxdia) || 0;
                        const kgs = Number(ev.kgsxdia) || 0;
                        const prodPzs = Number(ev.prod_teo_pzs) || 0;
                        const prodKgs = Number(ev.prod_teo_kgs) || 0;
                        if (mostrarCompleto) {
                            // Contenido completo (mostrar siempre)
                            tbody += `
                    <div class="cal-pill-icon">${iniciales}</div>
                    <div class="cal-pill-content" style="white-space:normal;font-size:0.85rem;line-height:1.1;">
                        <div class="cal-pill-name">${nombreArticulo}</div>
                        <div class="cal-pill-theo">
                            <small>Prod. Teórica: ${prodPzs.toLocaleString('es-MX')} pzs · ${prodKgs.toLocaleString('es-MX')} kg</small>
                        </div>
                    </div>`;
                        } else {
                            // Versión compacta para píldoras intermedias: solo icono (detalles en tooltip)
                            tbody += `
                    <div class="cal-pill-icon">${iniciales}</div>`;
                        }
                        tbody += `</div>`;
                    });
                    // No mostrar contador "+N": eliminamos .cal-more por requerimiento
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
                        <span class="cal-tt-label">Capacidad</span>
                        <span>${Number(ev.pzsxdia).toLocaleString('es-MX')} pzs / ${Number(ev.kgsxdia).toLocaleString('es-MX')} kg</span>
                    </div>
                    <div class="cal-tt-row">
                        <span class="cal-tt-label">Prod. Teórica</span>
                        <span>${Number(ev.prod_teo_pzs).toLocaleString('es-MX')} pzs / ${Number(ev.prod_teo_kgs).toLocaleString('es-MX')} kg</span>
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

        // Eliminado manejador para .cal-more ya que no se genera dicho elemento
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
            color: ev.color || '#999',
            proceso: ev.proceso || 'N/A',
            articulo: ev.articulo || ev.articulo_desc || 'N/A',
            articulo_desc: ev.articulo_desc || '',
            inicio_iso: this._fmtISO(ev.inicio),
            fin_iso: this._fmtISO(ev.fin),
            pzsxdia: Number(ev.pzsxdia) || 0,
            kgsxdia: Number(ev.kgsxdia) || 0,
            prod_teo_pzs: Number(ev.prod_teo_pzs) || 0,
            prod_teo_kgs: Number(ev.prod_teo_kgs) || 0,
            accion: ev.accion || ''
        };
        return encodeURIComponent(JSON.stringify(obj));
    }

    // ── Implementación requerida por GestionProduccionBase ───
    crearTotalesTemplate() {
        return { linea: 'TOTALES', pzsxdia: 0, kgsxdia: 0 };
    }
}