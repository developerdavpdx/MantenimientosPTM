/**
 * TopScrollTable - Crea un scroll horizontal virtual en la parte superior de tablas
 * sidebartoggle
 */
class TopScrollTable {
    constructor(idTable, idContTable, idScroll) {
        this.idTable = idTable;
        this.idContTable = idContTable;
        this.idScroll = idScroll;
    }

    /**
     * Crea el elemento HTML del scroll superior
     */
    createScroll() {
        const $tableWrapper = $(`#${this.idContTable}`);

        if ($tableWrapper.length === 0) {
            console.error(`No se encontró el contenedor: #${this.idContTable}`);
            return false;
        }


        // Solo crear si no existe
        if (!$(`#${this.idScroll}`).length) {
            const scrollTopHtml = `
                <div class="horizontal-scroll-top" id="${this.idScroll}" >
                    <div class="scroll-content"></div>
                </div>
            `;

          

            $tableWrapper.before(scrollTopHtml);

            // Obtener ancho de $tableWrapper y asignarlo
            const anchoTabla = $tableWrapper.outerWidth();
            $(`#${this.idScroll}`).width(anchoTabla);
        } else {
            console.log(`Scroll superior ya existe: #${this.idScroll}`);
        }

        return true;
    }

    /**
     * Inicializa la sincronización de scrolls
     */
    initScroll() {
        const $tableWrapper = $(`#${this.idContTable}`);
        const $scrollTop = $(`#${this.idScroll}`);

        if ($tableWrapper.length === 0) {
            console.error(`No se encontró el contenedor: #${this.idContTable}`);
            return false;
        }

        if ($scrollTop.length === 0) {
            console.error(`No se encontró el scroll superior: #${this.idScroll}`);
            return false;
        }

        // Sincroniza scroll superior → tabla
        $scrollTop.on('scroll', () => {
            $tableWrapper.scrollLeft($scrollTop.scrollLeft());
        });

        // Sincroniza tabla → scroll superior
        $tableWrapper.on('scroll', () => {
            $scrollTop.scrollLeft($tableWrapper.scrollLeft());
        });

        // Ajusta ancho inicial
        this.syncScrollWidth();

        // Configurar eventos de ventana
        this.configurarEventos();

        return true;
    }

    /**
     * Sincroniza el ancho del scroll con la tabla
     */
    syncScrollWidth() {
        const $scrollContent = $(`#${this.idScroll} .scroll-content`);
        const $tableWrapper = $(`#${this.idContTable}`);

        if ($tableWrapper.length === 0 || $scrollContent.length === 0) {
            return;
        }

        const scrollWidth = $tableWrapper[0].scrollWidth;
        const anchoTabla = $tableWrapper.outerWidth();
        $scrollContent.width(scrollWidth);
        $(`#${this.idScroll}`).width(anchoTabla);

    }

    /**
   * Configura el observer para detectar cambios de ancho
   */
    configurarResizeObserver() {
        const $tableWrapper = $(`#${this.idContTable}`);

        if ($tableWrapper.length === 0) {
            console.error(`No se puede configurar ResizeObserver: elemento #${this.idContTable} no encontrado`);
            return;
        }

        // Desconectar observer previo si existe
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }

        // Crear nuevo ResizeObserver
        this.resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const width = entry.contentRect.width;
                this.syncScrollWidth();
            }
        });

        // Observar el elemento
        this.resizeObserver.observe($tableWrapper[0]);
    }


    /**
     * Configura eventos de ventana (resize y scroll)
     */
    configurarEventos() {

        // Configurar ResizeObserver para detectar cambios en el ancho del contenedor
        this.configurarResizeObserver();

        $(window).on(`resize.topscroll_${this.idScroll}`, () => {
            this.syncScrollWidth();
        });


        $(window).on(`scroll.topscroll_${this.idScroll}`, () => {
            const $scrollTop = $(`#${this.idScroll}`);
            const $table = $(`#${this.idContTable}`);

            if ($table.length === 0 || $scrollTop.length === 0) {
                return;
            }

            const scrollTop = $(window).scrollTop();
            const tableTop = $table.offset().top;
            const tableBottom = tableTop + $table.outerHeight();

            if (scrollTop > tableTop && scrollTop < tableBottom) {
                $scrollTop.addClass('fixed').show();
            }
            else if (scrollTop < tableTop) {
                $scrollTop.removeClass('fixed').show();
            }
            else {
                $scrollTop.removeClass('fixed').hide();
            }
        });
    }

    /**
     * Destruye los event listeners para evitar memory leaks
     */
    destroy() {
        const $tableWrapper = $(`#${this.idContTable}`);
        const $scrollTop = $(`#${this.idScroll}`);

        $scrollTop.off('scroll');
        $tableWrapper.off('scroll');

        // Remover eventos de ventana con namespace
        $(window).off(`resize.topscroll_${this.idScroll}`);
        $(window).off(`scroll.topscroll_${this.idScroll}`);

        // Desconectar ResizeObserver
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        $scrollTop.remove();
    }

    /**
     * Recalcula y actualiza el scroll
     */
    refresh() {
        this.syncScrollWidth();
    }
}

// ========================================
// GESTOR GLOBAL DE TOP SCROLL TABLES
// ========================================
class TopScrollManager {
    constructor() {
        this.instancias = new Map();
    }

    /**
     * Crea e inicializa un nuevo TopScrollTable
     * @param {string} idTable - ID de la tabla
     * @param {string} idContTable - ID del contenedor de la tabla
     * @param {string} idScroll - ID del scroll superior (opcional, se genera automáticamente)
     */
    crear(idTable, idContTable, idScroll = null) {
        // Generar ID automático si no se proporciona
        if (!idScroll) {
            idScroll = `topscroll_${idTable}`;
        }

        // Verificar si ya existe
        if (this.instancias.has(idScroll)) {
            console.warn(`Ya existe una instancia de TopScrollTable con el ID: ${idScroll}`);
            return this.instancias.get(idScroll);
        }

        // Crear nueva instancia
        const topScroll = new TopScrollTable(idTable, idContTable, idScroll);

        if (topScroll.createScroll() && topScroll.initScroll()) {
            this.instancias.set(idScroll, topScroll);
            return topScroll;
        } else {
            console.error(`❌ Error al crear TopScrollTable: ${idScroll}`);
            return null;
        }
    }

    /**
     * Obtiene una instancia existente
     */
    obtener(idScroll) {
        return this.instancias.get(idScroll);
    }

    /**
     * Destruye una instancia específica
     */
    destruir(idScroll) {
        const instancia = this.instancias.get(idScroll);
        if (instancia) {
            instancia.destroy();
            this.instancias.delete(idScroll);
            return true;
        }
        return false;
    }

    /**
     * Destruye todas las instancias
     */
    destruirTodos() {
        this.instancias.forEach((instancia, id) => {
            instancia.destroy();
        });
        this.instancias.clear();
    }

    /**
     * Refresca una instancia específica
     */
    refrescar(idScroll) {
        const instancia = this.instancias.get(idScroll);
        if (instancia) {
            instancia.refresh();
            return true;
        }
        return false;
    }

    /**
     * Refresca todas las instancias
     */
    refrescarTodos() {
        this.instancias.forEach(instancia => {
            instancia.refresh();
        });
    }

    /**
     * Lista todas las instancias registradas
     */
    listar() {
        return Array.from(this.instancias.keys());
    }
}

// ========================================
// INSTANCIA GLOBAL
// ========================================
window.TopScrollManager = new TopScrollManager();
