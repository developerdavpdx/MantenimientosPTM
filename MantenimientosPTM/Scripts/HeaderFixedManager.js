/**
 * HeaderFijoManager - Convierte cualquier header en un header fijo que respeta su contenedor
 * Versión standalone - Reutilizable en cualquier proyecto
 */
class HeaderFijoManager {
    constructor(selectorHeader, selectorContainer, opciones = {}) {
        this.selectorHeader = selectorHeader;
        this.selectorContainer = selectorContainer;

        // Opciones configurables
        this.opciones = {
            topOffset: opciones.topOffset || 45,              // Offset desde el top cuando está fixed
            backgroundColor: opciones.backgroundColor || 'white',
            boxShadow: opciones.boxShadow || '0 4px 12px rgba(0, 88, 161, 0.3)',
            zIndex: opciones.zIndex || 1000,
            animacion: opciones.animacion !== false,          // Activar animación por defecto
            ...opciones
        };

        this.$header = $(this.selectorHeader);
        this.$container = $(this.selectorContainer);
        this.$placeholder = null;
        this.headerHeight = 0;
        this.isFixed = false;
        this.scrollThreshold = 0;
        this.resizeObserver = null;
    }

    /**
     * Inicializa el header fijo
     */
    inicializar() {
        if (this.$header.length === 0) {
            console.error(`❌ No se encontró el header: ${this.selectorHeader}`);
            return false;
        }

        if (this.$container.length === 0) {
            console.error(`❌ No se encontró el contenedor: ${this.selectorContainer}`);
            return false;
        }

        // Guardar threshold ANTES de crear el placeholder
        this.scrollThreshold = this.$header.offset().top;

        // Crear placeholder DESPUÉS de guardar el threshold
        this.$placeholder = $('<div class="header-fijo-placeholder"></div>');
        this.$header.after(this.$placeholder);

        this.headerHeight = this.$header.outerHeight();
        this.$placeholder.height(0);

        // Agregar clase para identificación
        this.$header.addClass('header-fijo-managed');

        this.configurarEventos();
        this.configurarResizeObserver();
        this.ajustarHeader();

        // Agregar estilos si está activada la animación
        if (this.opciones.animacion) {
            this.agregarEstilosAnimacion();
        }

        console.log(`✅ HeaderFijoManager inicializado: ${this.selectorHeader}`);
        return true;
    }

    /**
     * Configura los event listeners de scroll y resize
     */
    configurarEventos() {
        // Usar namespace único para evitar conflictos
        const namespace = `.headerfijo_${this.selectorHeader.replace(/[^a-zA-Z0-9]/g, '_')}`;

        $(window).on(`scroll${namespace}`, () => this.manejarScroll());
        $(window).on(`resize${namespace}`, () => this.ajustarHeader());
    }

    /**
     * Configura ResizeObserver para detectar cambios en el ancho del contenedor
     */
    configurarResizeObserver() {
        if (this.$container.length === 0) {
            console.error('No se puede configurar ResizeObserver: contenedor no encontrado');
            return;
        }

        // Desconectar observer previo si existe
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }

        // Crear nuevo ResizeObserver
        this.resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                // Solo ajustar si está en modo fixed
                if (this.isFixed) {
                    this.ajustarPosicionFixed();
                }
            }
        });

        // Observar el contenedor
        this.resizeObserver.observe(this.$container[0]);
    }

    /**
     * Maneja el evento de scroll
     */
    manejarScroll() {
        const scrollTop = $(window).scrollTop();

        if (scrollTop >= this.scrollThreshold && !this.isFixed) {
            this.activarFixed();
        } else if (scrollTop < this.scrollThreshold && this.isFixed) {
            this.desactivarFixed();
        }
    }

    /**
     * Activa el modo fixed
     */
    activarFixed() {
        // 1. PRIMERO activar el placeholder para evitar el salto
        this.$placeholder.height(this.headerHeight);

        // 2. LUEGO poner fixed
        this.isFixed = true;
        this.$header.addClass('header-fijo-is-fixed');
        this.ajustarPosicionFixed();
    }

    /**
     * Desactiva el modo fixed
     */
    desactivarFixed() {
        this.isFixed = false;
        this.$header.removeClass('header-fijo-is-fixed');
        this.$placeholder.height(0);

        this.$header.css({
            'position': '',
            'top': '',
            'left': '',
            'width': '',
            'background-color': '',
            'box-shadow': '',
            'z-index': ''
        });
    }

    /**
     * Ajusta la posición del header cuando está fixed
     */
    ajustarPosicionFixed() {
        if (!this.isFixed) return;

        const containerOffset = this.$container.offset();
        const containerWidth = this.$container.outerWidth();

        this.$header.css({
            'position': 'fixed',
            'top': `${this.opciones.topOffset}px`,
            'left': `${containerOffset.left}px`,
            'width': `${containerWidth}px`,
            'background-color': this.opciones.backgroundColor,
            'box-shadow': this.opciones.boxShadow,
            'z-index': this.opciones.zIndex
        });
    }

    /**
     * Ajusta el header (recalcula threshold y posición)
     */
    ajustarHeader() {
        // Recalcular altura siempre
        this.headerHeight = this.$header.outerHeight();

        if (!this.isFixed) {
            // Solo recalcular threshold cuando NO está fixed
            // usando el placeholder como referencia
            this.scrollThreshold = this.$placeholder.length
                ? this.$placeholder.offset().top
                : this.$header.offset().top;
        }

        if (this.isFixed) {
            this.$placeholder.height(this.headerHeight);
            this.ajustarPosicionFixed();
        }
    }

    /**
     * Agrega estilos de animación al documento
     */
    agregarEstilosAnimacion() {
        const styleId = 'header-fijo-animation-styles';

        if ($(`#${styleId}`).length) {
            return; // Ya existen los estilos
        }

        const styles = `
    <style id="${styleId}">
        /* Transición EXTRA SUAVE */
        .header-fijo-managed {
            transition: all 0.8s ease-in-out !important;
        }
        
        .header-fijo-is-fixed {
            animation: headerFijoSlideDown 0.7s ease-in-out;
        }
        
        @keyframes headerFijoSlideDown {
            from {
                transform: translateY(-100%);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
        
        .header-fijo-placeholder {
            transition: height 0.8s ease-in-out !important;
        }
    </style>
`;

        $('head').append(styles);
    }

    /**
     * Destruye el header fijo y limpia recursos
     */
    destroy() {
        // Namespace único
        const namespace = `.headerfijo_${this.selectorHeader.replace(/[^a-zA-Z0-9]/g, '_')}`;

        // Desconectar ResizeObserver
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        // Remover eventos
        $(window).off(`scroll${namespace}`);
        $(window).off(`resize${namespace}`);

        // Remover placeholder
        if (this.$placeholder) {
            this.$placeholder.remove();
        }

        // Limpiar estilos y clases
        this.$header.removeClass('header-fijo-managed header-fijo-is-fixed');
        this.$header.css({
            'position': '',
            'top': '',
            'left': '',
            'width': '',
            'background-color': '',
            'box-shadow': '',
            'z-index': ''
        });

        console.log(`✅ HeaderFijoManager destruido: ${this.selectorHeader}`);
    }

    /**
     * Refresca el header fijo
     */
    refresh() {
        this.headerHeight = this.$header.outerHeight();

        if (this.isFixed) {
            this.$placeholder.height(this.headerHeight);
            this.ajustarPosicionFixed();
        } else {
            this.scrollThreshold = this.$header.offset().top;
        }
    }

    /**
     * Actualiza las opciones del header
     */
    actualizarOpciones(nuevasOpciones) {
        this.opciones = { ...this.opciones, ...nuevasOpciones };

        if (this.isFixed) {
            this.ajustarPosicionFixed();
        }
    }
}

// ========================================
// GESTOR GLOBAL DE HEADERS FIJOS
// ========================================
class HeaderFijoGlobalManager {
    constructor() {
        this.instancias = new Map();
    }

    /**
     * Crea e inicializa un nuevo HeaderFijoManager
     * @param {string} selectorHeader - Selector CSS del header
     * @param {string} selectorContainer - Selector CSS del contenedor
     * @param {string} id - ID único para la instancia (opcional)
     * @param {object} opciones - Opciones de configuración
     */
    crear(selectorHeader, selectorContainer, id = null, opciones = {}) {
        // Generar ID automático si no se proporciona
        if (!id) {
            id = `header_${selectorHeader.replace(/[^a-zA-Z0-9]/g, '_')}`;
        }

        // Verificar si ya existe
        if (this.instancias.has(id)) {
            console.warn(`⚠️ Ya existe una instancia de HeaderFijoManager con el ID: ${id}`);
            return this.instancias.get(id);
        }

        // Crear nueva instancia
        const headerFijo = new HeaderFijoManager(selectorHeader, selectorContainer, opciones);

        if (headerFijo.inicializar()) {
            this.instancias.set(id, headerFijo);
            return headerFijo;
        } else {
            console.error(`❌ Error al crear HeaderFijoManager: ${id}`);
            return null;
        }
    }

    /**
     * Obtiene una instancia existente
     */
    obtener(id) {
        return this.instancias.get(id);
    }

    /**
     * Destruye una instancia específica
     */
    destruir(id) {
        const instancia = this.instancias.get(id);
        if (instancia) {
            instancia.destroy();
            this.instancias.delete(id);
            return true;
        }
        console.warn(`⚠️ No se encontró instancia con ID: ${id}`);
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
        console.log('✅ Todas las instancias de HeaderFijoManager destruidas');
    }

    /**
     * Refresca una instancia específica
     */
    refrescar(id) {
        const instancia = this.instancias.get(id);
        if (instancia) {
            instancia.refresh();
            return true;
        }
        console.warn(`⚠️ No se encontró instancia con ID: ${id}`);
        return false;
    }

    /**
     * Refresca todas las instancias
     */
    refrescarTodos() {
        this.instancias.forEach(instancia => {
            instancia.refresh();
        });
        console.log('✅ Todas las instancias refrescadas');
    }

    /**
     * Lista todas las instancias registradas
     */
    listar() {
        return Array.from(this.instancias.keys());
    }

    /**
     * Obtiene el número de instancias activas
     */
    contar() {
        return this.instancias.size;
    }
}

// ========================================
// INSTANCIA GLOBAL
// ========================================
window.HeaderFijoGlobalManager = new HeaderFijoGlobalManager();