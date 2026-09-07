/* =========================================================
   ONBOARDING TOUR - Guía rápida de usuario
   Librería ligera, sin dependencias, para mostrar una guía
   tipo "spotlight + tooltip" paso a paso.
   ========================================================= */

class OnboardingTour {
    /**
     * @param {Object} options
     * @param {string} options.storageKey  Clave en localStorage para saber si ya se mostró.
     * @param {Array}  options.steps       [{ selector, title, text, position, requiresPanel }]
     *   requiresPanel (opcional): selector de un panel colapsable de Bootstrap
     *   (ej. '#colapseFiltros') que debe abrirse automáticamente en ese paso.
     */
    constructor(options) {
        this.storageKey = options.storageKey || 'tourCompleted';
        // Ojo: NO filtramos por "existe en el DOM" aquí, porque elementos dentro
        // de paneles colapsados (display:none) pueden reportar tamaño 0 pero sí existen.
        this.steps = (options.steps || []).filter(s => document.querySelector(s.selector) !== null);
        this.currentIndex = 0;
        this._openPanel = null; // panel que el tour dejó abierto, para saber si cerrarlo

        this.overlay = null;
        this.spotlight = null;
        this.tooltip = null;
        this.helpBtn = null;

        this._onResize = this._reposition.bind(this);
    }

    /* ---------- Ciclo de vida ---------- */

    start(force = false) {
        if (!this.steps.length) return;
        if (!force && localStorage.getItem(this.storageKey) === 'true') return;

        this.currentIndex = 0;
        this._buildDom();
        this._renderStep();

        window.addEventListener('resize', this._onResize);
        document.addEventListener('keydown', this._onKeydown = (e) => {
            if (e.key === 'Escape') this.finish();
            if (e.key === 'ArrowRight') this.next();
            if (e.key === 'ArrowLeft') this.prev();
        });
    }

    next() {
        if (this.currentIndex < this.steps.length - 1) {
            this.currentIndex++;
            this._renderStep();
        } else {
            this.finish();
        }
    }

    prev() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this._renderStep();
        }
    }

    finish() {
        localStorage.setItem(this.storageKey, 'true');
        this._closeOpenPanel();
        this._teardown();
    }

    /* ---------- Construcción del DOM ---------- */

    _buildDom() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'tour-overlay';

        this.spotlight = document.createElement('div');
        this.spotlight.className = 'tour-spotlight';

        this.tooltip = document.createElement('div');
        this.tooltip.className = 'tour-tooltip';
        this.tooltip.innerHTML = `
            <button class="tour-skip" title="Cerrar guía">✕</button>
            <div class="tour-step-badge"></div>
            <h5 class="tour-title"></h5>
            <p class="tour-text"></p>
            <div class="tour-footer">
                <span class="tour-progress"></span>
                <div class="tour-btns">
                    <button class="tour-btn tour-btn-prev">Anterior</button>
                    <button class="tour-btn tour-btn-next">Siguiente</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);
        document.body.appendChild(this.spotlight);
        document.body.appendChild(this.tooltip);

        requestAnimationFrame(() => this.overlay.classList.add('tour-visible'));

        this.tooltip.querySelector('.tour-skip').addEventListener('click', () => this.finish());
        this.tooltip.querySelector('.tour-btn-next').addEventListener('click', () => this.next());
        this.tooltip.querySelector('.tour-btn-prev').addEventListener('click', () => this.prev());
    }

    _teardown() {
        window.removeEventListener('resize', this._onResize);
        if (this._onKeydown) document.removeEventListener('keydown', this._onKeydown);
        [this.overlay, this.spotlight, this.tooltip].forEach(el => el && el.remove());
        this.overlay = this.spotlight = this.tooltip = null;
    }

    /* ---------- Render de cada paso ---------- */

    _renderStep() {
        const step = this.steps[this.currentIndex];
        this.tooltip.classList.remove('tour-visible');

        this._ensurePanelState(step, () => {
            const el = document.querySelector(step.selector);
            if (!el) { this.next(); return; }

            // Scroll instantáneo (sin 'smooth') para que el browser termine el reflow
            // ANTES de que midamos con getBoundingClientRect.
            // 'smooth' es async y no tiene evento de fin confiable entre browsers,
            // lo que hacía que la medición llegara antes que el scroll terminara.
            el.scrollIntoView({ behavior: 'instant', block: 'nearest' });

            // Doble rAF: garantiza que el browser pintó el frame con el nuevo scroll
            // antes de medir. Un solo rAF a veces llega antes del paint.
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    this._measureAndPlace(el, step);
                });
            });
        });
    }

    /**
     * Mide el elemento y coloca spotlight + tooltip.
     * Si getBoundingClientRect reporta tamaño 0 (elemento aún no visible/pintado),
     * reintenta hasta 5 veces con 80ms de espera entre intentos antes de rendirse.
     */
    _measureAndPlace(el, step, attempt = 0) {
        const rect = el.getBoundingClientRect();
        const hasDimensions = rect.width > 0 && rect.height > 0;

        if (!hasDimensions && attempt < 5) {
            setTimeout(() => this._measureAndPlace(el, step, attempt + 1), 80);
            return;
        }

        this._positionSpotlight(el);
        this._positionTooltip(el, step.position || 'bottom');
        this._fillTooltipText(step);
        this.tooltip.classList.add('tour-visible');
    }

    /**
     * Gestiona el estado del panel colapsable para el paso actual.
     *
     * Flujo:
     *  1. Si hay un panel abierto de un paso anterior y este paso no lo necesita → ciérralo
     *     y ESPERA el evento 'hidden.bs.collapse' antes de continuar (la animación dura ~350ms;
     *     si no esperamos, el layout todavía está expandido y getBoundingClientRect mide mal).
     *  2. Si el paso necesita un panel que ya está abierto → callback directo.
     *  3. Si el paso necesita un panel cerrado → ábrelo y espera 'shown.bs.collapse'.
     *  4. Si el paso no necesita panel → callback directo.
     */
    _ensurePanelState(step, callback) {
        const needsPanel  = step.requiresPanel || null;
        const panelToClose = (this._openPanel && this._openPanel !== needsPanel)
            ? this._openPanel : null;

        const openIfNeeded = () => {
            if (!needsPanel) { callback(); return; }

            const $panel   = $(needsPanel);
            const yaAbierto = $panel.hasClass('show');

            if (yaAbierto) {
                this._openPanel = needsPanel;
                callback();
                return;
            }

            $panel.one('shown.bs.collapse', () => {
                this._openPanel = needsPanel;
                callback();
            });
            $panel.collapse('show');
        };

        if (panelToClose) {
            // Esperar 'hidden' es CRÍTICO: hasta que no termina la animación de cierre
            // el layout sigue "inflado" y cualquier getBoundingClientRect está mal.
            const $closing = $(panelToClose);
            this._openPanel = null;
            $closing.one('hidden.bs.collapse', () => openIfNeeded());
            $closing.collapse('hide');
        } else {
            openIfNeeded();
        }
    }

    _closeOpenPanel() {
        if (!this._openPanel) return;
        $(this._openPanel).collapse('hide');
        this._openPanel = null;
    }

    _fillTooltipText(step) {
        this.tooltip.querySelector('.tour-step-badge').textContent = this.currentIndex + 1;
        this.tooltip.querySelector('.tour-title').textContent = step.title;
        this.tooltip.querySelector('.tour-text').textContent = step.text;
        this.tooltip.querySelector('.tour-progress').textContent =
            `Paso ${this.currentIndex + 1} de ${this.steps.length}`;

        const nextBtn = this.tooltip.querySelector('.tour-btn-next');
        nextBtn.textContent = (this.currentIndex === this.steps.length - 1) ? 'Finalizar' : 'Siguiente';

        const prevBtn = this.tooltip.querySelector('.tour-btn-prev');
        prevBtn.disabled = this.currentIndex === 0;
    }

    _positionSpotlight(el) {
        const rect = el.getBoundingClientRect();
        const pad = 6;
        Object.assign(this.spotlight.style, {
            top: `${rect.top - pad}px`,
            left: `${rect.left - pad}px`,
            width: `${rect.width + pad * 2}px`,
            height: `${rect.height + pad * 2}px`
        });
    }

    _positionTooltip(el, preferred) {
        const rect = el.getBoundingClientRect();
        const tooltipWidth = 320;
        const tooltipHeight = this.tooltip.offsetHeight || 180; // altura real o estimada
        const margin = 16;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // ── Elemento "grande": ocupa más del 60% del alto o ancho de la ventana ──
        // En ese caso no tiene sentido pegarlo al borde; lo centramos en pantalla.
        const elTooTall  = rect.height > vh * 0.6;
        const elTooWide  = rect.width  > vw * 0.6;

        if (elTooTall || elTooWide) {
            this.tooltip.style.transform = 'none';
            this.tooltip.style.top  = `${Math.round((vh - tooltipHeight) / 2)}px`;
            this.tooltip.style.left = `${Math.round((vw - tooltipWidth)  / 2)}px`;
            this.tooltip.setAttribute('data-pos', 'center');
            return;
        }

        // ── Lógica normal: elegir la posición con más espacio disponible ──
        const spaceBelow = vh - rect.bottom;
        const spaceAbove = rect.top;
        const spaceRight = vw - rect.right;
        const spaceLeft  = rect.left;

        let position = preferred;

        // Fallback automático si no hay espacio suficiente en la dirección preferida
        if (position === 'bottom' && spaceBelow < tooltipHeight + margin) {
            position = spaceAbove >= tooltipHeight + margin ? 'top' : 'center';
        } else if (position === 'top' && spaceAbove < tooltipHeight + margin) {
            position = spaceBelow >= tooltipHeight + margin ? 'bottom' : 'center';
        } else if (position === 'right' && spaceRight < tooltipWidth + margin) {
            position = spaceLeft >= tooltipWidth + margin ? 'left' : 'center';
        } else if (position === 'left' && spaceLeft < tooltipWidth + margin) {
            position = spaceRight >= tooltipWidth + margin ? 'right' : 'center';
        }

        if (position === 'center') {
            this.tooltip.style.transform = 'none';
            this.tooltip.style.top  = `${Math.round((vh - tooltipHeight) / 2)}px`;
            this.tooltip.style.left = `${Math.round((vw - tooltipWidth)  / 2)}px`;
            this.tooltip.setAttribute('data-pos', 'center');
            return;
        }

        let top, left;
        this.tooltip.style.transform = 'none'; // resetear siempre antes de calcular

        switch (position) {
            case 'top':
                top  = rect.top - tooltipHeight - margin;
                left = rect.left;
                break;
            case 'right':
                top  = rect.top;
                left = rect.right + margin;
                break;
            case 'left':
                top  = rect.top;
                left = rect.left - tooltipWidth - margin;
                break;
            default: // bottom
                top  = rect.bottom + margin;
                left = rect.left;
        }

        // Clampear para que no se salga de los bordes
        left = Math.min(Math.max(left, margin), vw - tooltipWidth - margin);
        top  = Math.min(Math.max(top,  margin), vh - tooltipHeight - margin);

        this.tooltip.setAttribute('data-pos', position);
        this.tooltip.style.top  = `${top}px`;
        this.tooltip.style.left = `${left}px`;
    }

    _reposition() {
        if (!this.steps.length || !this.spotlight) return;
        const step = this.steps[this.currentIndex];
        const el = document.querySelector(step.selector);
        if (!el) return;
        this._positionSpotlight(el);
        this._positionTooltip(el, step.position || 'bottom');
    }
}

/**
 * Atajo para no repetir el "boilerplate" en cada vista:
 * crea el tour, lo arranca (si no se ha visto) y agrega
 * el botón flotante de ayuda para relanzarlo.
 *
 * @returns {OnboardingTour} la instancia, por si se necesita controlarla
 */
OnboardingTour.init = function (options) {
    const tour = new OnboardingTour(options);
    tour.start();

    const helpBtn = document.createElement('button');
    helpBtn.className = 'tour-help-btn';
    helpBtn.title = 'Ver guía de uso';
    helpBtn.innerHTML = '<i class="bi bi-question-lg"></i>';
    helpBtn.addEventListener('click', () => tour.start(true));
    document.body.appendChild(helpBtn);

    return tour;
};

/* Se expone globalmente para poder usarla en cualquier vista */
window.OnboardingTour = OnboardingTour;
