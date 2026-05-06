// ========================================
// AUTOCOMPLETE CON DATALIST - REUTILIZABLE
// ========================================

/**
 * Clase para manejar inputs con datalist autocomplete
 * Valida que solo se seleccionen opciones válidas del datalist
 */
class DatalistAutocomplete {
    constructor(inputId, datalistId, options = {}) {
        this.input = document.getElementById(inputId);
        this.datalist = document.getElementById(datalistId);

        if (!this.input || !this.datalist) {
            console.error(`No se encontró el input (${inputId}) o datalist (${datalistId})`);
            return;
        }

        // Opciones configurables
        this.config = {
            allowCustom: options.allowCustom || false,  // Permitir valores personalizados
            caseSensitive: options.caseSensitive || false,  // Búsqueda case-sensitive
            clearInvalid: options.clearInvalid !== false,  // Limpiar si no es válido (true por defecto)
            onSelect: options.onSelect || null,  // Callback al seleccionar
            onInvalid: options.onInvalid || null,  // Callback cuando es inválido
            minChars: options.minChars || 0  // Caracteres mínimos para validar
        };

        this.validOptions = this.getValidOptions();
        this.selectedValue = null;
        this.selectedText = null;

        this.init();
    }

    /**
     * Obtiene todas las opciones válidas del datalist
     */
    getValidOptions() {
        const options = [];
        const datalistOptions = this.datalist.querySelectorAll('option');

        datalistOptions.forEach(option => {
            options.push({
                value: option.value,
                text: option.textContent || option.value,
                dataValue: option.getAttribute('data-value') || option.value
            });
        });

        return options;
    }

    /**
     * Inicializa los eventos
     */
    init() {
        // Validar al perder el foco
        this.input.addEventListener('blur', () => this.validate());

        // Validar al presionar Enter
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.validate();
            }
        });

        // Validar al seleccionar del datalist
        this.input.addEventListener('input', () => {
            // Solo validar si hay una coincidencia exacta
            const exactMatch = this.findExactMatch(this.input.value);
            if (exactMatch) {
                this.setValid(exactMatch);
            }
        });

        // Limpiar al hacer click en el input (opcional)
        this.input.addEventListener('focus', () => {
            this.input.select();
        });
    }

    /**
     * Busca una coincidencia exacta en las opciones
     */
    findExactMatch(searchText) {
        if (!searchText || searchText.length < this.config.minChars) {
            return null;
        }

        const normalizedSearch = this.config.caseSensitive ?
            searchText : searchText.toLowerCase();

        return this.validOptions.find(option => {
            const optionText = this.config.caseSensitive ?
                option.text : option.text.toLowerCase();
            const optionValue = this.config.caseSensitive ?
                option.value : option.value.toLowerCase();

            return optionText === normalizedSearch || optionValue === normalizedSearch;
        });
    }

    /**
     * Valida el valor actual del input
     */
    validate() {
        const inputValue = this.input.value.trim();

        // Si está vacío, es válido
        if (!inputValue) {
            this.setNeutral();
            return true;
        }

        const match = this.findExactMatch(inputValue);

        if (match) {
            this.setValid(match);
            return true;
        } else if (this.config.allowCustom) {
            this.setValid({ value: inputValue, text: inputValue, dataValue: inputValue });
            return true;
        } else {
            this.setInvalid();
            return false;
        }
    }

    /**
     * Marca el input como válido
     */
    setValid(option) {
        this.input.classList.remove('is-invalid');
        this.input.classList.add('is-valid');

        this.selectedValue = option.dataValue;
        this.selectedText = option.text;

        // Ejecutar callback si existe
        if (this.config.onSelect) {
            this.config.onSelect(option);
        }
    }

    /**
     * Marca el input como inválido
     */
    setInvalid() {
        this.input.classList.remove('is-valid');
        this.input.classList.add('is-invalid');

        this.selectedValue = null;
        this.selectedText = null;

        // Limpiar el input si está configurado
        if (this.config.clearInvalid) {
            setTimeout(() => {
                this.input.value = '';
                this.setNeutral();
            }, 1500);
        }

        // Ejecutar callback si existe
        if (this.config.onInvalid) {
            this.config.onInvalid(this.input.value);
        }
    }

    /**
     * Quita estilos de validación
     */
    setNeutral() {
        this.input.classList.remove('is-valid', 'is-invalid');
        this.selectedValue = null;
        this.selectedText = null;
    }

    /**
     * Obtiene el valor seleccionado (data-value)
     */
    getValue() {
        return this.selectedValue;
    }

    /**
     * Obtiene el texto seleccionado
     */
    getText() {
        return this.selectedText;
    }

    /**
     * Establece un valor programáticamente
     */
    setValue(value) {
        const match = this.validOptions.find(opt =>
            opt.dataValue === value || opt.value === value
        );

        if (match) {
            this.input.value = match.text;
            this.setValid(match);
        } else {
            this.input.value = '';
            this.setNeutral();
        }
    }

    /**
     * Limpia el input
     */
    clear() {
        this.input.value = '';
        this.setNeutral();
    }

    /**
     * Recarga las opciones del datalist (útil para AJAX)
     */
    reloadOptions() {
        this.validOptions = this.getValidOptions();
    }
}

// ========================================
// VERSIÓN JQUERY (Alternativa)
// ========================================

(function ($) {
    $.fn.datalistAutocomplete = function (options) {
        return this.each(function () {
            const $input = $(this);
            const datalistId = $input.attr('list');
            const $datalist = $('#' + datalistId);

            if (!$datalist.length) {
                console.error('No se encontró el datalist asociado');
                return;
            }

            const config = $.extend({
                allowCustom: false,
                caseSensitive: false,
                clearInvalid: true,
                onSelect: null,
                onInvalid: null,
                minChars: 0
            }, options);

            let validOptions = [];
            let selectedValue = null;

            // Obtener opciones válidas
            function getValidOptions() {
                validOptions = [];
                $datalist.find('option').each(function () {
                    validOptions.push({
                        value: $(this).val(),
                        text: $(this).text() || $(this).val(),
                        dataValue: $(this).data('value') || $(this).val()
                    });
                });
            }

            // Buscar coincidencia exacta
            function findExactMatch(searchText) {
                if (!searchText || searchText.length < config.minChars) return null;

                const normalizedSearch = config.caseSensitive ? searchText : searchText.toLowerCase();

                return validOptions.find(option => {
                    const optionText = config.caseSensitive ? option.text : option.text.toLowerCase();
                    const optionValue = config.caseSensitive ? option.value : option.value.toLowerCase();
                    return optionText === normalizedSearch || optionValue === normalizedSearch;
                });
            }

            // Validar
            function validate() {
                const inputValue = $input.val().trim();

                if (!inputValue) {
                    $input.removeClass('is-valid is-invalid');
                    selectedValue = null;
                    return true;
                }

                const match = findExactMatch(inputValue);

                if (match) {
                    $input.removeClass('is-invalid').addClass('is-valid');
                    selectedValue = match.dataValue;
                    if (config.onSelect) config.onSelect(match);
                    return true;
                } else if (config.allowCustom) {
                    $input.removeClass('is-invalid').addClass('is-valid');
                    selectedValue = inputValue;
                    if (config.onSelect) config.onSelect({ value: inputValue, text: inputValue, dataValue: inputValue });
                    return true;
                } else {
                    $input.removeClass('is-valid').addClass('is-invalid');
                    selectedValue = null;
                    if (config.onInvalid) config.onInvalid(inputValue);

                    if (config.clearInvalid) {
                        setTimeout(() => {
                            $input.val('').removeClass('is-valid is-invalid');
                        }, 1500);
                    }
                    return false;
                }
            }

            // Inicializar
            getValidOptions();

            // Eventos
            $input.on('blur', validate);
            $input.on('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    validate();
                }
            });
            $input.on('input', function () {
                const match = findExactMatch($input.val());
                if (match) {
                    $input.removeClass('is-invalid').addClass('is-valid');
                    selectedValue = match.dataValue;
                    if (config.onSelect) config.onSelect(match);
                }
            });
            $input.on('focus', function () {
                $input.select();
            });

            // Métodos públicos
            $input.data('autocomplete', {
                getValue: () => selectedValue,
                setValue: (value) => {
                    const match = validOptions.find(opt => opt.dataValue === value || opt.value === value);
                    if (match) {
                        $input.val(match.text);
                        $input.removeClass('is-invalid').addClass('is-valid');
                        selectedValue = match.dataValue;
                    } else {
                        $input.val('').removeClass('is-valid is-invalid');
                        selectedValue = null;
                    }
                },
                clear: () => {
                    $input.val('').removeClass('is-valid is-invalid');
                    selectedValue = null;
                },
                reloadOptions: getValidOptions,
                validate: validate
            });
        });
    };
})(jQuery);