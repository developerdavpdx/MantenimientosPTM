
// ========================================
// CONFIRMACIONES
// ========================================
class ConfirmManager {
    static mostrar({ titulo, mensaje, onConfirm }) {
        $('#modalConfirmarTitulo').text(titulo);       // título sin HTML, .text() está bien
        $('#modalConfirmarMensaje').html(mensaje);     // ✅ .html() para renderizar el contenido

        $('#modalConfirmarBtn').off('click').on('click', () => {
            $('#modalConfirmarEliminar').modal('hide');
            onConfirm();
        });

        $('#modalConfirmarEliminar').modal('show');
    }
}

// ========================================
// GESTION DE FIRMAS DIGITALES (centralizada)
// ========================================
class GestionFirmas {
    constructor() {
        this.signaturePads = {
            Realizo: null,
            Superviso: null,
            Mantenimiento: null
        };

        this._firmasInicializadas = false;
        this._inicializandoFirmas = false;
        this._firmasPendientes = null;
    }

    inicializar() {
        console.log('✅ GestionFirmas inicializado correctamente');

        $('#modalOrdenMantenimiento').on('shown.bs.modal', async () => {
            await this.inicializarFirmas();
            await this._procesarFirmasPendientes();
        });
    }

    async inicializarFirmas() {
        if (this._firmasInicializadas) return;
        if (this._inicializandoFirmas) return;

        this._inicializandoFirmas = true;

        const firmas = ['Realizo', 'Superviso', 'Mantenimiento'];

        firmas.forEach(tipo => {
            const canvas = document.getElementById(`canvas${tipo}`);
            if (!canvas) {
                console.warn(`Canvas no encontrado: canvas${tipo}`);
                return;
            }

            this.ajustarCanvas(canvas);

            const pad = new SignaturePad(canvas, {
                backgroundColor: 'rgb(255,255,255)',
                penColor: 'rgb(0,0,0)',
                minWidth: 1,
                maxWidth: 2.5,
                throttle: 0,
                minDistance: 0,
                velocityFilterWeight: 0.7
            });

            pad.addEventListener('beginStroke', () => {
                const placeholder = document.getElementById(`placeholder${tipo}`);
                if (placeholder) placeholder.style.display = 'none';
            });

            pad.addEventListener('endStroke', () => {
                this.guardarFirmaEnCampo(tipo);
            });

            this.signaturePads[tipo] = pad;
        });

        this._firmasInicializadas = true;
        this._inicializandoFirmas = false;

        console.log('✅ Firmas inicializadas correctamente');
    }

    async _ensurePad(tipo) {
        const key = this._mapTipo(tipo);

        if (!this._firmasInicializadas) {
            await this.inicializarFirmas();
        }

        let pad = this.signaturePads[key];

        if (!pad) {
            console.warn(`Reintentando obtener pad: ${key}`);
            await new Promise(r => setTimeout(r, 150));
            pad = this.signaturePads[key];
        }

        if (!pad) {
            console.error(`❌ No se pudo inicializar firma: ${key}`);
            return null;
        }

        return pad;
    }

    ajustarCanvas(canvas) {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        canvas.getContext("2d").scale(ratio, ratio);
    }

    limpiarFirma(tipo) {
        if (this.signaturePads[tipo]) {
            this.signaturePads[tipo].clear();
            const placeholder = document.getElementById(`placeholder${tipo}`);
            if (placeholder) {
                placeholder.style.display = 'block';
            }
            const inputData = document.getElementById(`firma${tipo}Data`);
            if (inputData) {
                inputData.value = '';
            }
        }
    }

    deshacerFirma(tipo) {
        if (this.signaturePads[tipo]) {
            const data = this.signaturePads[tipo].toData();
            if (data && data.length > 0) {
                data.pop();
                this.signaturePads[tipo].fromData(data);

                if (data.length === 0) {
                    const placeholder = document.getElementById(`placeholder${tipo}`);
                    if (placeholder) {
                        placeholder.style.display = 'block';
                    }
                }

                this.guardarFirmaEnCampo(tipo);
            }
        }
    }

    validarFirmas(Tipo) {
        const errores = [];

        switch (Tipo) {
            case "Realizo":
                if ($('#firmaRealizoContainer').is(':visible') &&
                    !$('#firmaRealizoContainer').hasClass('firma-deshabilitada')) {
                    if (this.signaturePads.Realizo && this.signaturePads.Realizo.isEmpty()) {
                        errores.push('"Realizó"');
                    }
                    if (!$('#nombreRealizo').val().trim()) {
                        errores.push('Falta el nombre en "Realizó"');
                    }
                }
                break;
            case "Superviso":
                if ($('#firmaSupervisoContainer').is(':visible') &&
                    !$('#firmaSupervisoContainer').hasClass('firma-deshabilitada')) {
                    if (this.signaturePads.Superviso && this.signaturePads.Superviso.isEmpty()) {
                        errores.push('"Supervisó"');
                    }
                    if (!$('#nombreSuperviso').val().trim()) {
                        errores.push('Falta el nombre en "Supervisó"');
                    }
                }
                break;
            case "Mantenimiento":
                if ($('#firmaMantenimientoContainer').is(':visible') &&
                    !$('#firmaMantenimientoContainer').hasClass('firma-deshabilitada')) {
                    if (this.signaturePads.Mantenimiento && this.signaturePads.Mantenimiento.isEmpty()) {
                        errores.push('"Mantenimiento"');
                    }
                    if (!$('#nombreMantenimiento').val().trim()) {
                        errores.push('Falta el nombre en "Mantenimiento"');
                    }
                }
                break;
        }

        if (errores.length > 0) {
            AlertManager.mostrar('Por favor complete las siguientes firmas:\n\n' + errores.join('\n'), 'warning', 'alertOrdenContainer');
            return false;
        }

        return true;
    }

    guardarTodasLasFirmas() {
        ['Realizo', 'Superviso', 'Mantenimiento'].forEach(tipo => {
            this.guardarFirmaEnCampo(tipo);
        });
    }

    guardarFirmaEnCampo(tipo) {
        if (this.signaturePads[tipo] && !this.signaturePads[tipo].isEmpty()) {
            const dataURL = this.signaturePads[tipo].toDataURL('image/png');
            const inputData = document.getElementById(`firma${tipo}Data`);
            if (inputData) {
                inputData.value = dataURL;
            } else {
                console.error(`Input no encontrado: firma${tipo}Data`);
            }
        } else {
            const inputData = document.getElementById(`firma${tipo}Data`);
            if (inputData) {
                inputData.value = '';
            }
        }
    }

    obtenerTodasLasFirmas() {
        return {
            realizo: {
                firma: $('#firmaRealizoData').val(),
                nombre: $('#nombreRealizo').val()
            },
            superviso: {
                firma: $('#firmaSupervisoData').val(),
                nombre: $('#nombreSuperviso').val()
            },
            mantenimiento: {
                firma: $('#firmaMantenimientoData').val(),
                nombre: $('#nombreMantenimiento').val()
            }
        };
    }

    mostrarFirma(tipo, mostrar = true) {
        const container = $(`#firma${tipo}Container`);
        if (container.length) {
            container.toggle(mostrar);
        }
    }

    limpiarTodasLasFirmas() {
        ['Realizo', 'Superviso', 'Mantenimiento'].forEach(tipo => {
            this.limpiarFirma(tipo);
            $(`#nombre${tipo}`).val('');
        });
        this._desbloquearFirmas();
    }

    deshabilitarFirma(tipo, deshabilitar = true) {
        const container = $(`#firma${tipo}Container`);
        const canvas = document.getElementById(`canvas${tipo}`);
        const nombreInput = $(`#nombre${tipo}`);

        if (!container.length || !canvas) return;

        if (deshabilitar) {
            if (this.signaturePads[tipo]) {
                this.signaturePads[tipo].off();
            }
            $(canvas).css({ 'cursor': 'not-allowed', 'opacity': '0.5', 'pointer-events': 'none' });
            nombreInput.prop('disabled', true);
            container.find('button').prop('disabled', true).css('opacity', '0.5');
            container.addClass('firma-deshabilitada');
            container.removeClass('firma-readonly');
        } else {
            if (this.signaturePads[tipo]) {
                this.signaturePads[tipo].on();
            }
            $(canvas).css({ 'cursor': 'crosshair', 'opacity': '1', 'pointer-events': 'auto' });
            nombreInput.prop('disabled', false);
            container.find('button').prop('disabled', false).css('opacity', '1');
            container.removeClass('firma-deshabilitada');
            container.find('.badge-readonly').remove();
        }
    }

    deshabilitarFirmas(tiposArray) {
        tiposArray.forEach(tipo => this.deshabilitarFirma(tipo, true));
    }

    async _cargarFirmaFromDB(tipo, ruta, nombre) {
        if (!ruta) return;

        const key = this._mapTipo(tipo);
        const pad = await this._ensurePad(key);
        if (!pad) return;

        const canvas = pad.canvas;
        const ctx = canvas.getContext("2d");

        pad.clear();

        await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve();
            };
            img.onerror = () => { console.warn("Error cargando firma:", ruta); resolve(); };
            img.src = ruta;
        });

        $(`#nombre${key}`).val(nombre || '');
        $(`#placeholder${key}`).hide();
        this._bloquearFirma(key);
    }

    _bloquearFirma(tipo) {
        const key = this._mapTipo(tipo);
        const pad = this.signaturePads[key];
        if (pad && pad.off) pad.off();

        const container = $(`#firma${key}Container`);
        const canvas = document.getElementById(`canvas${key}`);
        const nombreInput = $(`#nombre${key}`);

        container.find('button').hide();
        nombreInput.prop('readonly', true);
        if (canvas) $(canvas).css({ 'pointer-events': 'none', 'cursor': 'default', 'opacity': '1' });
        $(`#placeholder${key}`).hide();
        container.addClass('firma-readonly');
        container.removeClass('firma-deshabilitada');
    }

    _desbloquearFirmas() {
        const tipos = ['Realizo', 'Superviso', 'Mantenimiento'];
        tipos.forEach(tipo => {
            const key = this._mapTipo(tipo);
            const pad = this.signaturePads[key];
            const container = $(`#firma${key}Container`);
            const canvas = document.getElementById(`canvas${key}`);
            const nombreInput = $(`#nombre${key}`);

            container.find('button').show();
            nombreInput.prop('readonly', false);
            if (canvas) $(canvas).css({ 'pointer-events': 'auto', 'cursor': 'crosshair', 'opacity': '1' });
            if (pad && pad.on) pad.on();
            container.removeClass('firma-readonly');
            if (pad && pad.isEmpty && pad.isEmpty()) $(`#placeholder${key}`).show();
        });
    }

    async queueFirma(tipo, ruta, nombre) {
        if (!tipo) return;
        if (!ruta) return;
        if (this._firmasInicializadas) {
            await this._cargarFirmaFromDB(tipo, ruta, nombre);
            return;
        }
        if (!this._firmasPendientes) this._firmasPendientes = [];
        const existe = this._firmasPendientes.some(f => f.tipo === tipo);
        if (existe) return;
        this._firmasPendientes.push({ tipo, ruta, nombre });
    }

    async _procesarFirmasPendientes() {
        if (!this._firmasPendientes || this._firmasPendientes.length === 0) return;
        console.log('🖋️ Procesando firmas pendientes...');
        for (const f of this._firmasPendientes) {
            await this._cargarFirmaFromDB(f.tipo, f.ruta, f.nombre);
        }
        this._firmasPendientes = null;
    }

    _cap(txt) { return txt.charAt(0).toUpperCase() + txt.slice(1); }

    _mapTipo(tipo) {
        switch (tipo) {
            case 'realizo': return 'Realizo';
            case 'superviso': return 'Superviso';
            case 'mantenimiento': return 'Mantenimiento';
            default: return tipo;
        }
    }
}

// ========================================
// GESTION TECNICOS (centralizada)
// ========================================
class GestionTecnicos {
    constructor(URLBase) {
        this.tecnicosAsignados = [];
        this.tecnicosDisponibles = [];
        this.URLBase = URLBase;
        this.foundtecnicos = false;
    }

    inicializar() {
        console.log('✅ GestionTecnicos inicializado correctamente');
    }

    async buscarTecnicos(query) {
        try {
            const response = await $.ajax({
                url: `/${this.URLBase}/BuscarEmpleados`,
                method: 'GET',
                data: { query: query },
                dataType: 'json'
            });

            this.mostrarSugerencias(response);
        } catch (error) {
            AlertManager.mostrar('No es posible mostrar la listá de técnicos: ' + error, 'warning');
        }
    }

    mostrarSugerencias(tecnicos) {
        const container = $('#sugerenciasTecnicos');
        container.empty();

        if (!tecnicos || tecnicos.length === 0) {
            container.html(`
            <div class="sugerencia-item text-muted">
                <i class="bi bi-exclamation-circle"></i> No se encontraron técnicos
            </div>
        `);
            this.foundtecnicos = false;
        } else {
            tecnicos.forEach(tecnico => {
                const item = $(`
                    <div class="sugerencia-item" data-nomina="${tecnico.NOMINA}">
                        <div class="sugerencia-nomina">📛 #${tecnico.NOMINA}</div>
                        <div class="sugerencia-nombre">👷 ${tecnico.NOMBRE_COMPLETO}</div>
                        <div class="sugerencia-puesto">🏭 ${tecnico.DEPARTAMENTO || 'N/A'}</div>
                    </div>
                `);

                item.on('click', () => {
                    this.agregarTecnico({
                        nomina: tecnico.NOMINA,
                        nombre: tecnico.NOMBRE_COMPLETO,
                        puesto: tecnico.DEPARTAMENTO || 'Sin departamento'
                    });
                    $('#BuscarTecnico').val('');
                    this.ocultarSugerencias();
                });

                container.append(item);
            });

            this.foundtecnicos = true;
        }

        container.addClass('show');
    }

    ocultarSugerencias() {
        $('#sugerenciasTecnicos').removeClass('show').empty();
    }

    agregarTecnicoDesdeInput() {
        if (this.foundtecnicos) {
            const nomina = $('#BuscarTecnico').val().trim();
            if (!nomina) return;

            const tecnicoEncontrado = {
                nomina: nomina,
                nombre: 'Técnico ' + nomina,
                puesto: 'Técnico'
            };

            this.agregarTecnico(tecnicoEncontrado);
            $('#BuscarTecnico').val('');
            this.ocultarSugerencias();
        } else {
            AlertManager.mostrar('No hay ningun técnico valido para agregar', 'info');
        }
    }

    agregarTecnico(tecnico) {
        if (this.tecnicosAsignados.some(t => t.nomina === tecnico.nomina)) {
            AlertManager.mostrar(`El técnico ${tecnico.nombre} ya está en la lista`, 'warning', 'alertTecnicosContainer');
            return;
        }
        this.tecnicosAsignados.push(tecnico);
        this.renderizarTecnicos();
    }

    removerTecnico(nomina) {
        this.tecnicosAsignados = this.tecnicosAsignados.filter(t => t.nomina !== nomina);
        this.renderizarTecnicos();
    }

    renderizarTecnicos() {
        const container = $('#listaTecnicosAsignados');
        container.empty();

        if (this.tecnicosAsignados.length === 0) {
            container.html(`
                <div class="text-muted small">
                    <i class="bi bi-info-circle"></i> No hay técnicos asignados
                </div>
            `);
            return;
        }

        this.tecnicosAsignados.forEach(tecnico => {
            const badge = $(`
                <div class="tecnico-badge">
                    <div class="tecnico-info">
                        <span class="tecnico-nomina">#${tecnico.nomina}</span>
                        <span class="tecnico-nombre">${tecnico.nombre}</span>
                    </div>
                    <button class="btn-remover-tecnico" data-nomina="${tecnico.nomina}">
                        <i class="bi bi-x"></i>
                    </button>
                </div>
            `);

            badge.find('.btn-remover-tecnico').on('click', () => {
                this.removerTecnico(tecnico.nomina);
            });

            container.append(badge);
        });
    }

    obtenerTecnicosAsignados() {
        return this.tecnicosAsignados;
    }

    obtenerNominasComoString() {
        return this.tecnicosAsignados.map(t => t.nomina).join(',');
    }

    obtenerNominasComoArray() {
        return this.tecnicosAsignados.map(t => t.nomina);
    }

    limpiar() {
        this.tecnicosAsignados = [];
        this.renderizarTecnicos();
        $('#BuscarTecnico').val('');
        this.ocultarSugerencias();
    }

    obtenerDuracion(element) {
        const valor = $(`#${element}`).val().replace(' Hrs', '').trim();
        return parseFloat(valor) || 0;
    }

    cargarTecnicosDesdeDB(lista) {
        $('#BuscarTecnico').val('');
        this.ocultarSugerencias();

        if (!lista || lista.length === 0) {
            this.tecnicosAsignados = [];
            this.renderizarTecnicos();
            return;
        }

        this.tecnicosAsignados = lista.map(t => ({
            nomina: t.Nomina,
            nombre: t.NombreTecnico,
            puesto: ''
        }));

        this.renderizarTecnicos();
    }
}


// ========================================
// PRINT MANAGER GENERICO
// ========================================
class PrintManagerGeneric {
    constructor({
        logoUrl = `${window.location.origin}/Content/Images/LogoPTMWhite.png`,
        getDatosDelBoton,
        getDatosExtra, // async(datos, btn, win) => extraData or mutate datos
        generarContenidoHTML,
        obtenerEstilos,
        tituloTemplate = (datos) => 'Documento'
    } = {}) {

        this.logoUrl = logoUrl;
        this.getDatosDelBoton = getDatosDelBoton;
        this.getDatosExtra = getDatosExtra;
        this.generarContenidoHTML = generarContenidoHTML;
        this.obtenerEstilos = obtenerEstilos;
        this.tituloTemplate = tituloTemplate;

        this.printEngine = new PrintEngine();
    }

    inicializar() {
        console.log('✅ PrintManagerGeneric inicializado');
    }

    async prepararImpresionDirecta(btn, win) {
        const iconoOriginal = btn.html ? btn.html() : null;
        try {
            if (iconoOriginal !== null) {
                btn.html('<span class="spinner-border spinner-border-sm"></span>');
                btn.prop && btn.prop('disabled', true);
            }

            // Abrir ventana para impresión y pasarla a callbacks
            const ventanaImpresion = win || window.open('', '_blank', 'width=900,height=700');

            if (!ventanaImpresion) {
                if (iconoOriginal !== null) {
                    btn.html(iconoOriginal);
                    btn.prop && btn.prop('disabled', false);
                }
                alert('El navegador bloqueó la ventana de impresión. Habilita popups.');
                return;
            }

            // UX provisional
            // UX loading chula
            try {
                ventanaImpresion.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f5f5f5}
        .wrap{text-align:center;padding:2rem}
        .doc{position:relative;width:72px;height:88px;margin:0 auto 1.5rem}
        .doc-body{position:absolute;inset:0;background:#fff;border:1.5px solid #ddd;border-radius:4px;padding:10px 8px;overflow:hidden}
        .doc-corner{position:absolute;top:0;right:0;width:18px;height:18px;background:#f5f5f5;border-left:1.5px solid #ddd;border-bottom:1.5px solid #ddd;border-radius:0 4px 0 4px}
        .line{height:6px;border-radius:3px;background:#e0e0e0;margin-bottom:7px;opacity:0;animation:appear .4s ease forwards}
        .scan{position:absolute;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#7F77DD,transparent);animation:scan 1.6s ease-in-out infinite}
        .label{font-size:15px;font-weight:600;color:#333;margin-bottom:6px}
        .sub{font-size:13px;color:#888;margin-bottom:1.5rem}
        .dots{display:flex;gap:6px;justify-content:center}
        .dot{width:7px;height:7px;border-radius:50%;background:#7F77DD;animation:bounce 1.2s ease-in-out infinite}
        @keyframes appear{to{opacity:1}}
        @keyframes scan{0%{top:8px;opacity:0}10%{opacity:1}90%{opacity:1}100%{top:76px;opacity:0}}
        @keyframes bounce{0%,100%{transform:translateY(0);opacity:.4}50%{transform:translateY(-5px);opacity:1}}
    </style></head><body>
    <div class="wrap">
        <div class="doc">
            <div class="doc-body">
                <div class="line" style="width:100%;animation-delay:.00s"></div>
                <div class="line" style="width:70%; animation-delay:.15s"></div>
                <div class="line" style="width:85%; animation-delay:.30s"></div>
                <div class="line" style="width:55%; animation-delay:.45s"></div>
                <div class="line" style="width:90%; animation-delay:.60s"></div>
                <div class="line" style="width:65%; animation-delay:.75s"></div>
            </div>
            <div class="doc-corner"></div>
            <div class="scan"></div>
        </div>
        <p class="label">Generando documento</p>
        <p class="sub">Un momento por favor...</p>
        <div class="dots">
            <div class="dot" style="animation-delay:0s"></div>
            <div class="dot" style="animation-delay:.2s"></div>
            <div class="dot" style="animation-delay:.4s"></div>
        </div>
    </div>
    </body></html>`);
            } catch (e) { }


            // Pequeño delay para que el loading sea apreciable
            await new Promise(resolve => setTimeout(resolve, 1200));
            // Datos base
            let datos = this.getDatosDelBoton ? this.getDatosDelBoton(btn) : {};

            // Datos extra específicos (ej. rutina o tecnicos)
            if (this.getDatosExtra) {
                const extra = await this.getDatosExtra(datos, btn, ventanaImpresion);
                if (extra && typeof extra === 'object') {
                    datos = { ...datos, ...extra };
                }
            }

            // Generar QR si no existe
            if (!datos.QR && datos.NumeroOrden) {
                try {
                    datos.QR = await GlobalUtil.generarQRCode(datos.NumeroOrden);
                } catch (e) {
                    console.warn('No se pudo generar QR:', e);
                }
            }

            // Generar HTML y estilos
            const html = this.generarContenidoHTML ? this.generarContenidoHTML(datos) : '';
            const estilos = this.obtenerEstilos ? this.obtenerEstilos(datos) : '';

            // Título
            const titulo = typeof this.tituloTemplate === 'function' ? this.tituloTemplate(datos) : this.tituloTemplate;

            // Llamar motor de impresión
            this.printEngine.imprimir({ html, estilos, titulo, autoClose: true, win: ventanaImpresion });

        } catch (error) {
            console.error('Error en preparación de impresión genérica:', error);
            AlertManager.mostrar('Error al preparar la impresión. Revise la consola.', 'warning');
        } finally {
            if (iconoOriginal !== null) {
                btn.html(iconoOriginal);
                btn.prop && btn.prop('disabled', false);
            }
        }
    }
}

// ========================================
// UTILIDADES PARA EXPORTAR/IMPRIMIR PDFs
// ========================================
const PDFUtils = {
    async exportarOrdenMantenimiento({ btnSelector = '#btnExportMantenimientoPDF', obtenerDatosDocumento, generarContenidoHTML, printEngine, tituloTemplate }) {
        const $btn = $(btnSelector);

        try {
            $btn.html('<span class="spinner-border spinner-border-sm me-2"></span>Generando...');
            $btn.prop('disabled', true);

            // Abrir ventana de impresión temprano para evitar popup blocker
            const ventanaImpresion = window.open('', '_blank', 'width=900,height=700');
            if (!ventanaImpresion) {
                $btn.html('<i class="bi bi-x-circle-fill me-2"></i>Error');
                if (window.AlertManager) {
                    AlertManager.mostrar('El navegador bloqueó la ventana de impresión. Habilita popups.', 'warning');
                }
                return;
            }

            // Mostrar loading provisional en la ventana
            try {
                ventanaImpresion.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f5f5f5}
        .wrap{text-align:center;padding:2rem}
        .doc{position:relative;width:72px;height:88px;margin:0 auto 1.5rem}
        .doc-body{position:absolute;inset:0;background:#fff;border:1.5px solid #ddd;border-radius:4px;padding:10px 8px;overflow:hidden}
        .doc-corner{position:absolute;top:0;right:0;width:18px;height:18px;background:#f5f5f5;border-left:1.5px solid #ddd;border-bottom:1.5px solid #ddd;border-radius:0 4px 0 4px}
        .line{height:6px;border-radius:3px;background:#e0e0e0;margin-bottom:7px;opacity:0;animation:appear .4s ease forwards}
        .scan{position:absolute;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#7F77DD,transparent);animation:scan 1.6s ease-in-out infinite}
        .label{font-size:15px;font-weight:600;color:#333;margin-bottom:6px}
        .sub{font-size:13px;color:#888;margin-bottom:1.5rem}
        .dots{display:flex;gap:6px;justify-content:center}
        .dot{width:7px;height:7px;border-radius:50%;background:#7F77DD;animation:bounce 1.2s ease-in-out infinite}
        @keyframes appear{to{opacity:1}}@keyframes scan{0%{top:8px;opacity:0}10%{opacity:1}90%{opacity:1}100%{top:76px;opacity:0}}@keyframes bounce{0%,100%{transform:translateY(0);opacity:.4}50%{transform:translateY(-5px);opacity:1}}
    </style></head><body>
    <div class="wrap">
        <div class="doc">
            <div class="doc-body">
                <div class="line" style="width:100%;animation-delay:.00s"></div>
                <div class="line" style="width:70%; animation-delay:.15s"></div>
                <div class="line" style="width:85%; animation-delay:.30s"></div>
                <div class="line" style="width:55%; animation-delay:.45s"></div>
                <div class="line" style="width:90%; animation-delay:.60s"></div>
                <div class="line" style="width:65%; animation-delay:.75s"></div>
            </div>
            <div class="doc-corner"></div>
            <div class="scan"></div>
        </div>
        <p class="label">Generando documento</p>
        <p class="sub">Un momento por favor...</p>
        <div class="dots">
            <div class="dot" style="animation-delay:0s"></div>
            <div class="dot" style="animation-delay:.2s"></div>
            <div class="dot" style="animation-delay:.4s"></div>
        </div>
    </div>
    </body></html>`);
            } catch (e) { }

            // Pequeño delay para que el loading sea apreciable
            await new Promise(resolve => setTimeout(resolve, 700));

            const datos = obtenerDatosDocumento();
            const qrBase64 = await GlobalUtil.generarQRCode(datos.NumeroOrden);
            datos.QR = qrBase64;

            const html = generarContenidoHTML(datos);

            const engine = printEngine || new PrintEngine();
            engine.imprimir({
                html,
                estilos: '',
                titulo: typeof tituloTemplate === 'function' ? tituloTemplate(datos) : (tituloTemplate || `Orden - ${datos.NumeroOrden}`),
                autoClose: true,
                win: ventanaImpresion
            });

            $btn.html('<i class="bi bi-check-circle-fill me-2 text-white"></i>PDF Generado Correctamente');

        } catch (error) {
            console.error('❌ Error al imprimir:', error);
            $btn.html('<i class="bi bi-x-circle-fill me-2"></i>Error');
            if (window.AlertManager) {
                AlertManager.mostrar('Error al generar el documento.', 'warning');
            }

        } finally {
            setTimeout(() => {
                $btn.html('<i class="bi bi-file-pdf"></i> Exportar PDF');
                $btn.prop('disabled', false);
            }, 2000);
        }
    }
};


// ========================================
// PRINT ENGINE GLOBAL
// ========================================
class PrintEngine {

    imprimir({ html, estilos = '', titulo = 'Documento', autoClose = true, win }) {

        // 🔥 usar ventana existente o fallback
        const printWindow = win || window.open('', '_blank', 'width=900,height=700');

        if (!printWindow) {
            alert('Popup bloqueado');
            return;
        }

        printWindow.document.open();
        printWindow.document.write(`
        <html>
        <head>
            <title>${titulo}</title>
            <style>
                ${this.obtenerBaseStyles()}
                ${estilos}
            </style>
        </head>
        <body>
            <div id="printRoot">
                ${html}
            </div>

            <script>
                window.onload = function() {
                    setTimeout(() => {
                        window.focus();
                        window.print();
                    }, 300);
                };

                window.onafterprint = function() {
                    const root = document.getElementById('printRoot');
                    if (root) root.classList.add('fade-out');
                    ${autoClose ? `setTimeout(() => window.close(), 2000);` : ''}
                };
            </script>
        </body>
        </html>
    `);
        printWindow.document.close();
    }

    obtenerBaseStyles() {
        return `
            * { box-sizing: border-box; font-family: Arial; }

            body { padding: 10px; }

            @media print {
                @page { size: A4; margin: 8mm; }
            }

            #printRoot {
                transition: opacity 2s ease;
            }

            .fade-out {
                opacity: 0;
            }
        `;
    }
}

// ========================================
// GLOBAL
// ========================================
class GlobalUtil {
    static URLBaseEquipos = "Equipos";
    static URLBaseProduccion = "Produccion";
    static categoriasParo = [];

    // ✅ Método estático para obtener datos de usuario
    static getDatosUsuario() {
        let datos_usuario = sessionStorage.getItem("userData");
        return datos_usuario ? JSON.parse(datos_usuario) : null;
    }
    // ✅ Nueva función para mostrar/ocultar loader
    static mostrarLoader(mostrar) {
        const loader = document.getElementById('calendarLoader');
        if (loader) {
            loader.style.display = mostrar ? 'flex' : 'none';
        }
    }
    //Obtener datos cualquier formulario
    static obtenerDatosAnyFormulario(formulario) {
        return $(`#${formulario} :input`).not(':button, :submit, :reset').map(function () {
            return {
                name: this.name,
                value: $(this).val()
            };
        }).get().reduce((obj, item) => {
            if (item.name) {
                obj[item.name] = item.value;
            }
            return obj;
        }, {});
    }
    //Obtener datos formdata cualquier formulario
    static obtenerFormDataAnyFormulario(formulario) {
        const formData = new FormData();

        $(`#${formulario} :input`).not(':button, :submit, :reset').each(function () {
            const $input = $(this);
            const name = this.name;

            if (!name) return; // Skip inputs without name

            // Handle file inputs
            if (this.type === 'file') {
                const files = this.files;
                if (files.length > 0) {
                    // Si el input acepta múltiples archivos
                    if (this.multiple) {
                        Array.from(files).forEach(file => {
                            formData.append(name + '[]', file);
                        });
                    } else {
                        formData.append(name, files[0]);
                    }
                }
            }
            // Handle checkboxes
            else if (this.type === 'checkbox') {
                if (this.checked) {
                    formData.append(name, $input.val());
                }
            }
            // Handle radio buttons
            else if (this.type === 'radio') {
                if (this.checked) {
                    formData.append(name, $input.val());
                }
            }
            // Handle all other inputs (text, textarea, select, etc.)
            else {
                formData.append(name, $input.val());
            }
        });

        return formData;
    }

    static darFormatoGeneral(cadena) {
        let aMayus = cadena.replace(/[ȺÀÄÂÃÅĄĀ]/g, 'A');
        let aMinus = aMayus.replace(/[àäâãåąªā]/g, 'a');
        let cMayus = aMinus.replace(/[ĆČÇ]/g, 'C');
        let cMinus = cMayus.replace(/[čćç]/g, 'c');
        let dMayus = cMinus.replace(/[ĎḊḐD̦ḌḒḎĐƊ]/g, 'D');
        let dMinus = dMayus.replace(/[đᵭᶁᶑȡ]/g, 'd');
        let eMayus = dMinus.replace(/[ĖĘÈÊËĒ]/g, 'E');
        let eMinus = eMayus.replace(/[ęèêëėē]/g, 'e');
        let iMayus = eMinus.replace(/[ÌÎÏĮŁ]/g, 'I');
        let iMinus = iMayus.replace(/[įìîïłĪī]/g, 'i');
        let oMayus = iMinus.replace(/[ÒÔÖÕØŌºœ]/g, 'O');
        let oMinus = oMayus.replace(/[òôöõøōºœ]/g, 'o');
        let uMayus = oMinus.replace(/[ÙÛÜŲŪ]/g, 'U');
        let uMinus = uMayus.replace(/[ùûüųū]/g, 'u');
        let enieMayus = uMinus.replace(/[Ń]/g, 'N');
        let enieMinus = enieMayus.replace(/[ń]/g, 'n');
        let yMayus = enieMinus.replace(/[ŸÝ]/g, 'Y');
        let yMinus = yMayus.replace(/[ÿý]/g, 'y');
        let sMayus = yMinus.replace(/[Š]/g, 'S');
        let sMinus = sMayus.replace(/[š]/g, 's');
        let zMayus = sMinus.replace(/[ŻŹŽ]/g, 'Z');
        let zMinus = zMayus.replace(/[żźž]/g, 'z');
        let caracterRegular = zMinus.replace(/[ßŒÆ∂ðæ]/g, '');
        let caracterEspecial = caracterRegular.replace(/[-|°¬!^`~#$%&/()@=?¿{}_,.\„“‘“‘'““‘’´+<>¡¨*:;]/g, '');
        let caracterNum = caracterEspecial.replace(/[0-9]/g, '');
        let resultado = caracterNum.replace(/[\[\]Ππ“‘"”«»§€₩₽—…‰≠≈•√Π÷×¶∆£¢€¥©®™✓ðɖ\\]/g, '');
        return resultado;
    }

    static darFormatoNumLet(cadena) {
        let aMayus = cadena.replace(/[ȺÀÄÂÃÅĄĀ]/g, 'A');
        let aMinus = aMayus.replace(/[àäâãåąªā]/g, 'a');
        let cMayus = aMinus.replace(/[ĆČÇ]/g, 'C');
        let cMinus = cMayus.replace(/[čćç]/g, 'c');
        let dMayus = cMinus.replace(/[ĎḊḐD̦ḌḒḎĐƊ]/g, 'D');
        let dMinus = dMayus.replace(/[đᵭᶁᶑȡ]/g, 'd');
        let eMayus = dMinus.replace(/[ĖĘÈÊËĒ]/g, 'E');
        let eMinus = eMayus.replace(/[ęèêëėē]/g, 'e');
        let iMayus = eMinus.replace(/[ÌÎÏĮŁ]/g, 'I');
        let iMinus = iMayus.replace(/[įìîïłĪī]/g, 'i');
        let oMayus = iMinus.replace(/[ÒÔÖÕØŌºœ]/g, 'O');
        let oMinus = oMayus.replace(/[òôöõøōºœ]/g, 'o');
        let uMayus = oMinus.replace(/[ÙÛÜŲŪ]/g, 'U');
        let uMinus = uMayus.replace(/[ùûüųū]/g, 'u');
        let enieMayus = uMinus.replace(/[ŃÑ]/g, 'N');
        let enieMinus = enieMayus.replace(/[ńñ]/g, 'n');
        let yMayus = enieMinus.replace(/[ŸÝ]/g, 'Y');
        let yMinus = yMayus.replace(/[ÿý]/g, 'y');
        let sMayus = yMinus.replace(/[Š]/g, 'S');
        let sMinus = sMayus.replace(/[š]/g, 's');
        let zMayus = sMinus.replace(/[ŻŹŽ]/g, 'Z');
        let zMinus = zMayus.replace(/[żźž]/g, 'z');
        let caracterRegular = zMinus.replace(/[ßŒÆ∂ðæ]/g, '');
        let caracterEspecial = caracterRegular.replace(/[-|°¬!^`~#$%&/()@=?¿{}_,.\'„“‘“‘““‘’´+<>¡¨*:;]/g, '');
        let resultado = caracterEspecial.replace(/[\[\]Ππ“‘"”«»§€₩₽—…‰≠≈•√Π÷×¶∆£¢€¥©®™✓ðɖ\\]/g, '');
        return resultado;
    }

    static darFormatoNum(value) {

        if (!value) return '';

        value = value
            .toString()
            .replace(/[^\d.]/g, '')   // Solo números y punto
            .replace(/(\..*)\./g, '$1'); // Solo un punto decimal

        return value;
    }

    static scrollToHighlight({
        container,
        target,
        offset = 40,
        duration = 1500,
        delay = 300,
        highlightClass = "highlight-blue",
        highlightDuration = 3500
    }) {

        setTimeout(() => {

            const $container = $(container);
            const $target = $(target);

            if (!$container.length || !$target.length) return;

            $container.animate({
                scrollTop: $target[0].offsetTop - offset
            }, duration, "swing", function () {

                $target.addClass(highlightClass);

                setTimeout(() => {
                    $target.removeClass(highlightClass);
                }, highlightDuration);

            });

        }, delay);
    }

    static generarQRCode(texto) {
        return new Promise((resolve) => {

            const qrContainer = document.createElement("div");

            new QRCode(qrContainer, {
                text: texto,
                width: 110,
                height: 110,
                correctLevel: QRCode.CorrectLevel.H
            });

            setTimeout(() => {
                const img = qrContainer.querySelector("img") || qrContainer.querySelector("canvas");
                resolve(img.src || img.toDataURL());
            }, 300);

        });
    }

    // Exportar planes a Excel — función reutilizable para planeación
    static async exportPlanesAExcel(data, options = {}) {
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('No hay datos para exportar');
        }

        const workbook = new ExcelJS.Workbook();

        const worksheet = workbook.addWorksheet('PlanProduccion', {
            pageSetup: {
                paperSize: 9,
                orientation: 'landscape',
                fitToPage: true,
                fitToWidth: 1,
                fitToHeight: 0
            }
        });

        worksheet.mergeCells('A1:I1');
        const headerCell = worksheet.getCell('A1');
        headerCell.value = '📊 PROGRAMACIÓN PLAN PRODUCCIÓN';
        headerCell.font = { name: 'Segoe UI', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
        headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0058A1' } };
        headerCell.alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(1).height = 40;

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
        worksheet.getRow(3).height = 10;

        const headerRow = worksheet.getRow(4);
        const headers = [
            { text: '🏭 Línea de Producción', width: 30 },
            { text: '📦 Artículo', width: 70 },
            { text: '⚙️ Capacidades', width: 30 },
            { text: '🔧 Proceso', width: 30 },
            { text: '📆 Mes/Año', width: 22 },
            { text: '📅 Rango Días', width: 26 },
            { text: '📋 Producción Teórica', width: 24 },
            { text: '📊 Producción Real', width: 24 },
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
            cell.border = { top: { style: 'medium', color: { argb: 'FF0058A1' } }, left: { style: 'thin', color: { argb: 'FFCCCCCC' } }, bottom: { style: 'medium', color: { argb: 'FF0058A1' } }, right: { style: 'thin', color: { argb: 'FFCCCCCC' } } };
        });
        headerRow.height = 35;

        const fmtNum = (n) => (parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 });

        let currentRow = 5;

        data.forEach((row, index) => {
            const excelRow = worksheet.getRow(currentRow);
            const bgColor = index % 2 === 0 ? 'FFFFFFFF' : 'FFF7F9FC';
            const capacidades = [row.PZSXDIA ? `${fmtNum(row.PZSXDIA)} PZ/día` : null, row.KGSXDIA ? `${fmtNum(row.KGSXDIA)} KG/día` : null].filter(Boolean).join(' | ');
            const rowData = [row.LINEA_PRODUCCION_DESC || '', `${row.ARTICULO || ''} - ${row.ARTICULO_DESC || ''}`, capacidades, row.PROCESO || '', `${DateUtils.getMesAnioString(row.FECHA_PLAN_STRING) || ''}`, `Del ${row.DIA_INICIO_MANT_STR} - Al ${row.DIA_FIN_MANT_STR}`, [row.PRODUCCION_TEORICA_PZS ? `${fmtNum(row.PRODUCCION_TEORICA_PZS)} PZ` : null, row.PRODUCCION_TEORICA_KGS ? `${fmtNum(row.PRODUCCION_TEORICA_KGS)} KG` : null].filter(Boolean).join(' | '), fmtNum(row.PRODUCCION_REAL), row.COMENTARIOS || ''];

            rowData.forEach((value, colIndex) => {
                const cell = excelRow.getCell(colIndex + 1);
                cell.value = value;
                cell.font = { name: 'Segoe UI', size: 10 };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
                cell.alignment = { vertical: 'middle', horizontal: colIndex <= 1 ? 'left' : 'center', indent: colIndex <= 1 ? 1 : 0, wrapText: true };
                cell.border = { top: { style: 'thin', color: { argb: 'FFE0E0E0' } }, left: { style: 'thin', color: { argb: 'FFE0E0E0' } }, bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } }, right: { style: 'thin', color: { argb: 'FFE0E0E0' } } };
            });

            excelRow.height = 38;
            currentRow++;

            const updates = (row.BITACORA || []).filter(b => b.BIT_ACCION === 'UPDATE');
            updates.forEach((bit) => {
                const histRow = worksheet.getRow(currentRow);
                const capacidadesHist = [bit.PZSXDIA ? `${fmtNum(bit.PZSXDIA)} PZ/día` : null, bit.KGSXDIA ? `${fmtNum(bit.KGSXDIA)} KG/día` : null].filter(Boolean).join(' | ');
                const histData = [`↳ HISTORIAL ${row.LINEA_PRODUCCION_DESC || ''}`, bit.NVO_ARTICULO ? `${bit.NVO_ARTICULO} - ${bit.NVO_ARTICULO_DESC || ''}` : '', capacidadesHist, bit.NVO_PROCESO || '', `${DateUtils.getMesAnioString(row.FECHA_PLAN_STRING) || ''}`, (bit.NVO_DIA_INICIO_MANT_STR && bit.NVO_DIA_FIN_MANT_STR) ? `Del ${bit.NVO_DIA_INICIO_MANT_STR} - Al ${bit.NVO_DIA_FIN_MANT_STR}` : '', [bit.PRODUCCION_TEORICA_PZS ? `${fmtNum(bit.PRODUCCION_TEORICA_PZS)} PZ` : null, bit.PRODUCCION_TEORICA_KGS ? `${fmtNum(bit.PRODUCCION_TEORICA_KGS)} KG` : null].filter(Boolean).join(' | '), fmtNum(bit.NVO_PRODUCCION_REAL), bit.NVO_COMENTARIOS || ''];

                histData.forEach((value, colIndex) => {
                    const cell = histRow.getCell(colIndex + 1);
                    cell.value = value;
                    cell.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF546E7A' } };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };
                    cell.alignment = { vertical: 'middle', horizontal: colIndex <= 1 ? 'left' : 'center', indent: colIndex <= 1 ? 2 : 0, wrapText: true };
                    cell.border = { top: { style: 'thin', color: { argb: 'FFE0E0E0' } }, left: { style: 'thin', color: { argb: 'FFE0E0E0' } }, bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } }, right: { style: 'thin', color: { argb: 'FFE0E0E0' } } };
                });

                histRow.height = 34;
                currentRow++;
            });
        });

        const footerRow = worksheet.getRow(currentRow);
        worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
        const summaryCell = worksheet.getCell(`A${currentRow}`);
        summaryCell.value = `✅ Fin del reporte - ${data.length} planes exportados`;
        summaryCell.font = { name: 'Segoe UI', size: 11, bold: true, italic: true, color: { argb: 'FF666666' } };
        summaryCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
        summaryCell.alignment = { vertical: 'middle', horizontal: 'center' };
        summaryCell.border = { top: { style: 'medium', color: { argb: 'FF0058A1' } }, bottom: { style: 'medium', color: { argb: 'FF0058A1' } } };
        footerRow.height = 30;

        worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 4 }];
        worksheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: 9 } };

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const fecha = new Date().toISOString().split('T')[0];
        const nombreArchivo = options.fileName || `PlanProduccion_PTM_${fecha}.xlsx`;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = nombreArchivo;
        link.click();
        return true;
    }

}

// ========================================
// GESTOR DE VALIDACIONES
// ========================================
class ValidationManager {
    static inicializarFormulario(formId) {
        const form = document.querySelector(formId);
        if (!form) return;

        form.addEventListener('submit', (event) => {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        }, false);
    }

    static limpiarValidacion(formId) {
        const form = document.querySelector(formId);
        if (form) {
            form.classList.remove('was-validated');
            $(form)[0].reset();
        }
    }

    static validarFormulario(formId) {
        const form = document.querySelector(formId);
        if (!form) return false;

        if (!form.checkValidity()) {
            form.classList.add('was-validated');

            return false;
        }
        return true;
    }
}


// ========================================
// UTILIDADES DE EQUIPOS
// ========================================
class EquiposUtil {

    static llenarLineas(Planta, Area, Produccion, Fieldoptiongroup, Fieldfilter, callback = null) {

        const selectElement = $(`#${Fieldoptiongroup}`);
        const FiltroLinea = $(`#${Fieldfilter}`);

        // 🔥 Mostrar loaders
        this.showSelectLoader(Fieldoptiongroup);
        this.showSelectLoader(Fieldfilter);

        $.ajax({
            url: `/${GlobalUtil.URLBaseEquipos}/GetLineasPorPlanta`,
            type: 'GET',
            data: { "PLANTA": Planta, "AREA": Area, "PRODUCCION": Produccion },
            headers: {
                'Content-Type': 'application/json'
            },
            success: (data) => {

                this.hideSelectLoader(Fieldoptiongroup);
                this.hideSelectLoader(Fieldfilter);

                if (data.Status === 'OK') {

                    let lineasData = data.Data;

                    if (typeof lineasData === 'string') {
                        try {
                            lineasData = JSON.parse(lineasData);
                        } catch (e) {
                            console.warn('No se pudo parsear Data:', e);
                        }
                    }

                    selectElement.empty();
                    FiltroLinea.empty();

                    selectElement.append('<option value="">Todas las líneas</option>');
                    selectElement.prop("disabled", false);
                    FiltroLinea.append('<option value="">Todas las líneas</option>');

                    // 🔥 Agrupar por planta
                    const grouped = {};

                    lineasData.forEach(linea => {
                        if (!grouped[linea.PLANTA]) {
                            grouped[linea.PLANTA] = [];
                        }
                        grouped[linea.PLANTA].push(linea);
                    });

                    // 🔥 Renderizar agrupado
                    Object.keys(grouped).forEach(planta => {

                        const optgroup1 = $(`<optgroup label="Planta ${planta}"></optgroup>`);
                        const optgroup2 = $(`<optgroup label="Planta ${planta}"></optgroup>`);

                        grouped[planta].forEach(linea => {
                            optgroup1.append(`<option value="${linea.ID_LINEA}">${linea.LINEA}</option>`);
                            optgroup2.append(`<option value="${linea.ID_LINEA}">${linea.LINEA}</option>`);
                        });

                        selectElement.append(optgroup1);
                        FiltroLinea.append(optgroup2);
                    });


                    if (callback) {
                        callback();
                    }

                } else if (data.Status === 'NO') {

                    AlertManager.mostrar(data.Message, 'warning');

                } else if (data.Status === 'warning') {

                    AlertManager.mostrar('Error: ' + data.Message, 'warning');
                }
            },
            error: () => {

                this.hideSelectLoader(Fieldoptiongroup);
                this.hideSelectLoader(Fieldfilter);

                AlertManager.mostrar(
                    'Error de conexión. No fue posible obtener el listado de líneas.',
                    'warning'
                );
            }
        });
    }

    static obtenerLineas(Planta) {

        return new Promise((resolve, reject) => {

            $.ajax({
                url: `/${GlobalUtil.URLBaseEquipos}/GetLineasPorPlanta`,
                type: 'GET',
                data: { "Planta": Planta },
                headers: {
                    'Content-Type': 'application/json'
                },
                success: (data) => {

                    if (data.Status === 'OK') {

                        let lineasData = data.Data;

                        if (typeof lineasData === 'string') {
                            try {
                                lineasData = JSON.parse(lineasData);
                            } catch (e) {
                                console.warn('No se pudo parsear Data:', e);
                            }
                        }

                        // 🔥 Solo devolver lista
                        const lista = lineasData.map(x => ({
                            value: x.ID_LINEA,
                            label: x.LINEA
                        }));

                        resolve(lista);

                    } else {

                        reject(data.Message);

                    }

                },
                error: () => {

                    reject("Error al obtener líneas");

                }
            });

        });

    }

    static llenarLineasCheckbox(Planta, Area, Produccion, FieldContainer) {

        $.ajax({
            url: `/${GlobalUtil.URLBaseEquipos}/GetLineasPorPlanta`,
            type: 'GET',
            data: { "PLANTA": Planta, "AREA": Area, "PRODUCCION": Produccion },
            headers: {
                'Content-Type': 'application/json'
            },

            success: function (data) {

                if (data.Status === 'OK') {

                    let lineasData = data.Data;

                    if (typeof lineasData === 'string') {
                        try {
                            lineasData = JSON.parse(lineasData);
                        } catch (e) {
                            console.warn('No se pudo parsear Data:', e);
                        }
                    }

                    const container = $(`#${FieldContainer}`);

                    container.empty();

                    lineasData.forEach(linea => {

                        const checkbox = `
                            <div class="col-md-6">
                                <div class="form-check">
                                    <input 
                                        class="form-check-input linea-checkbox" 
                                        type="checkbox" 
                                        value="${linea.ID_LINEA}" 
                                        id="linea_${linea.ID_LINEA}">
                    
                                    <label class="form-check-label" for="linea_${linea.ID_LINEA}">
                                         ${linea.LINEA}
                                    </label>
                                </div>
                            </div>
                        `;

                        container.append(checkbox);

                    });

                } else if (data.Status === 'NO') {

                    AlertManager.mostrar(data.Message, 'info', 'alertParoContainer');
                    $(`#${FieldContainer}`).empty();

                } else if (data.Status === 'warning') {
                    AlertManager.mostrar('Error: ' + data.Message, 'warning', 'alertParoContainer');
                    $(`#${FieldContainer}`).empty();
                }
            },

            error: function () {

                AlertManager.mostrar(
                    'Error de conexión. No fue posible obtener el listado de líneas.',
                    'warning'
                );
            }
        });
    }

    static llenarProcesos(Planta, Fieldoptiongroup, Fieldfilter) {

        const selectElement = $(`#${Fieldoptiongroup}`);
        const FiltroProceso = $(`#${Fieldfilter}`);

        // 🔥 Mostrar loaders
        this.showSelectLoader(Fieldoptiongroup);
        this.showSelectLoader(Fieldfilter);

        $.ajax({
            url: `/${GlobalUtil.URLBaseEquipos}/GetProcesosPorPlanta`,
            type: 'GET',
            data: { "Planta": Planta },
            headers: {
                'Content-Type': 'application/json'
            },
            success: (data) => {

                // 🔥 Ocultar loaders
                this.hideSelectLoader(Fieldoptiongroup);
                this.hideSelectLoader(Fieldfilter);

                if (data.Status === 'OK') {

                    let AreasData = data.Data;

                    if (typeof AreasData === 'string') {
                        try {
                            AreasData = JSON.parse(AreasData);
                        } catch (e) {
                            console.warn('No se pudo parsear Data:', e);
                        }
                    }

                    selectElement.empty();
                    FiltroProceso.empty();

                    selectElement.append('<option value="">Selecciona el área de producción</option>');
                    FiltroProceso.append('<option value="">Todos los procesos</option>');

                    AreasData.forEach(area => {
                        selectElement.append(`<option value="${area.ID_AREA}">${area.AREA}</option>`);
                        FiltroProceso.append(`<option value="${area.ID_AREA}">${area.AREA}</option>`);
                    });

                } else if (data.Status === 'NO') {

                    AlertManager.mostrar(data.Message, 'warning');

                } else if (data.Status === 'warning') {

                    AlertManager.mostrar('Error: ' + data.Message, 'warning');
                }
            },
            error: () => {

                // 🔥 Ocultar loaders
                this.hideSelectLoader(Fieldoptiongroup);
                this.hideSelectLoader(Fieldfilter);

                AlertManager.mostrar(
                    'Error de conexión. No fue posible obtener el listado de áreas.',
                    'warning'
                );
            }
        });
    }

    static llenarEquipos(Planta, Area, Fieldoptiongroup, Fieldfilter) {

        const selectElement = $(`#${Fieldoptiongroup}`);
        const filtroEquipo = $(`#${Fieldfilter}`);

        // 🔥 Mostrar loaders
        this.showSelectLoader(Fieldoptiongroup);
        this.showSelectLoader(Fieldfilter);

        $.ajax({
            url: `/${GlobalUtil.URLBaseEquipos}/GetEquiposSelect`,
            type: 'GET',
            data: {
                Planta: Planta,
                Area: Area
            },
            headers: {
                'Content-Type': 'application/json'
            },
            success: (data) => {

                // 🔥 Ocultar loaders
                this.hideSelectLoader(Fieldoptiongroup);
                this.hideSelectLoader(Fieldfilter);

                if (data.Status === 'OK') {

                    let equiposData = data.Data;

                    // 🔥 Parse seguro
                    if (typeof equiposData === 'string') {
                        try {
                            equiposData = JSON.parse(equiposData);
                        } catch (e) {
                            console.warn('No se pudo parsear Data:', e);
                        }
                    }

                    // 🔥 Limpiar selects
                    selectElement.empty();
                    filtroEquipo.empty();

                    // 🔥 Opciones base
                    selectElement.append('<option value="">Selecciona un equipo</option>');
                    filtroEquipo.append('<option value="">Todos los equipos</option>');

                    // 🔥 Llenado
                    equiposData.forEach(eq => {
                        selectElement.append(`<option value="${eq.ID_EQUIPO}">${eq.NOMBRE_EQUIPO}</option>`);
                        filtroEquipo.append(`<option value="${eq.ID_EQUIPO}">${eq.NOMBRE_EQUIPO}</option>`);
                    });

                } else if (data.Status === 'NO') {

                    selectElement.empty();
                    filtroEquipo.empty();

                    selectElement.append('<option value="">Sin equipos disponibles</option>');
                    filtroEquipo.append('<option value="">Sin equipos disponibles</option>');

                    AlertManager.mostrar(data.Message, 'warning');

                } else if (data.Status === 'warning') {

                    AlertManager.mostrar('Error: ' + data.Message, 'warning');
                }
            },
            error: () => {

                // 🔥 Ocultar loaders
                this.hideSelectLoader(Fieldoptiongroup);
                this.hideSelectLoader(Fieldfilter);

                AlertManager.mostrar(
                    'Error de conexión. No fue posible obtener el listado de equipos.',
                    'warning'
                );
            }
        });
    }

    static llenarRangoDias() {
        const dias = DateUtils.generarRangoDias();
        const selectInicio = $('#DiaInicioMant');
        const selectFin = $('#DiaFinMant');

        selectInicio.empty().append('<option value="">Inicio...</option>');
        selectFin.empty().append('<option value="">Fin...</option>');

        dias.forEach(dia => {
            selectInicio.append(`<option value="${dia.valor}">${dia.texto}</option>`);
            selectFin.append(`<option value="${dia.valor}">${dia.texto}</option>`);
        });
    }

    static llenarTipoEquipos() {
        $.ajax({
            url: `/${GlobalUtil.URLBaseEquipos}/GetTipoEquipos`,
            type: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            success: function (data) {

                if (data.Status === 'OK') {
                    let equiposData = data.Data;
                    if (typeof equiposData === 'string') {
                        try {
                            equiposData = JSON.parse(equiposData);
                        } catch (e) {
                            console.warn('No se pudo parsear Data:', e);
                        }
                    }

                    // Obtener el select por su ID o clase
                    const selectElement = $('#TipoEquipo'); // Asegúrate de que el ID sea correcto

                    // Limpiar el select antes de agregar nuevas opciones
                    selectElement.empty();

                    // Crear la primera opción "Selecciona el tipo de equipo"
                    selectElement.append('<option value="">Selecciona el tipo de equipo</option>');

                    // Recorrer los datos y agregar las opciones
                    equiposData.forEach(equipo => {
                        selectElement.append(`<option value="${equipo.ID_TIPO_EQUIPO}">${equipo.DESCRIPCION}</option>`);
                    });
                } else if (data.Status === 'NO') {
                    AlertManager.mostrar(data.Message, 'warning');
                } else if (data.Status === 'warning') {
                    AlertManager.mostrar('Error: ' + data.Message, 'warning');
                }
            },
            error: function (xhr, status, error) {
                AlertManager.mostrar('Error de conexión. No fue posible obtener el listado de equipos.', 'warning');
            }
        });
    }

    static llenarCategoriasParo(Fieldfilter) {
        $.ajax({
            url: `/${GlobalUtil.URLBaseProduccion}/GetCategoriasParo`,
            type: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            success: function (data) {

                if (data.Status === 'OK') {

                    let categoriasData = data.Data;

                    if (typeof categoriasData === 'string') {
                        try {
                            categoriasData = JSON.parse(categoriasData);
                        } catch (e) {
                            console.warn('No se pudo parsear Data:', e);
                        }
                    }

                    // 🔥 Guardar en memoria
                    GlobalUtil.categoriasParo = categoriasData;

                    const selectElement = $(`#${Fieldfilter}`);

                    selectElement.empty();

                    selectElement.append('<option value="">Selecciona categoría</option>');

                    categoriasData.forEach(categoria => {
                        selectElement.append(`
                        <option value="${categoria.ID_CATEGORIA_PARO}">
                            ${categoria.NOMBRE}
                        </option>
                    `);
                    });

                } else if (data.Status === 'NO') {
                    AlertManager.mostrar(data.Message, 'warning');
                } else if (data.Status === 'warning') {
                    AlertManager.mostrar('Error: ' + data.Message, 'warning');
                }
            },
            error: function () {
                AlertManager.mostrar(
                    'Error de conexión. No fue posible obtener las categorías de paro.',
                    'warning'
                );
            }
        });
    }

    static showSelectLoader(selectId) {
        $(`#loader_${selectId}`).removeClass("d-none");

        const select = $(`#${selectId}`);
        select.prop("disabled", true);
        select.addClass("select-loading"); // 🔥 Oculta flecha
    }

    static hideSelectLoader(selectId) {

        const select = $(`#${selectId}`);

        setTimeout(() => {
            $(`#loader_${selectId}`).addClass("d-none");
            select.prop("disabled", false);
            select.removeClass("select-loading"); // 🔥 Mostrar flecha
        }, 500); // ⏱️ 2 segundos
    }
}


// ========================================
// UTILIDADES DE FECHA
// ========================================
class DateUtils {
    static obtenerFechaHora() {
        const ahora = new Date();
        const dia = String(ahora.getDate()).padStart(2, "0");
        const mes = String(ahora.getMonth() + 1).padStart(2, "0");
        const anio = ahora.getFullYear();
        const horas = String(ahora.getHours()).padStart(2, "0");
        const minutos = String(ahora.getMinutes()).padStart(2, "0");
        const segundos = String(ahora.getSeconds()).padStart(2, "0");
        return `${dia}/${mes}/${anio} ${horas}:${minutos}:${segundos}`;
    }

    static generarDiasDelMes() {
        const ahora = new Date();
        const añoActual = ahora.getFullYear();
        const mesActual = ahora.getMonth();
        const ultimoDiaMes = new Date(añoActual, mesActual + 1, 0).getDate();
        const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

        const dias = [];
        for (let dia = 1; dia <= ultimoDiaMes; dia++) {
            const fecha = new Date(añoActual, mesActual, dia);
            const diaSemana = diasSemana[fecha.getDay()];
            dias.push({ valor: dia, texto: `Día ${dia} (${diaSemana})` });
        }
        return dias;
    }

    static generarRangoDias() {
        const dias = [];
        for (let i = 1; i <= 31; i++) {
            dias.push({ valor: i, texto: i.toString() });
        }
        return dias;
    }

    static formatearPeriodicidad(periodicidad, diaInicio, diaFin, fechaEspecifica) {
        try {
            if (!periodicidad || !diaInicio || !diaFin) {
                return 'N/A';
            }

            periodicidad = this.capitalizarPrimeraLetra(periodicidad);

            return `${periodicidad} (días ${diaInicio}–${diaFin})`;
        } catch (error) {
            return 'N/A';
        }
    }

    static formatearPeriodicidadSimple(diaInicio, diaFin) {
        return `Mensual(días ${diaInicio}–${diaFin})`;
    }

    static capitalizarPrimeraLetra(texto) {
        return texto.charAt(0).toUpperCase() + texto.slice(1);
    }

    static getMesAnioString(data) {
        if (!data) return 'N/A';
        // Si viene en formato YYYY-MM, convertir a Mes Año
        const [dia, mes, anio] = data.split('/');
        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
            'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const mesNombre = meses[parseInt(mes) - 1];

        return `${mesNombre} ${anio}`;
    }

    // Ejemplo de uso:
    //const resultado = obtenerFechaConDia('01/02/2026', 20);
    //console.log(resultado); // Output: '20/02/2026'
    static obtenerFechaConDia(fechaStr, dia) {
        try {
            // Validar que la fecha esté en formato 'dd/mm/yyyy'
            const fechaParts = fechaStr.split('/');
            if (fechaParts.length !== 3) {
                throw new Error("El formato de la fecha debe ser 'dd/mm/yyyy'");
            }

            const diaFecha = parseInt(fechaParts[0], 10);
            const mesFecha = parseInt(fechaParts[1], 10) - 1; // Mes en JavaScript comienza desde 0 (enero es 0)
            const anioFecha = parseInt(fechaParts[2], 10);

            // Validar que los parámetros sean números válidos
            if (isNaN(diaFecha) || isNaN(mesFecha) || isNaN(anioFecha)) {
                throw new Error("La fecha o el día ingresado no es válido");
            }

            // Validar que el día esté dentro del rango permitido para ese mes
            const fecha = new Date(anioFecha, mesFecha, diaFecha);
            const ultimoDiaDelMes = new Date(anioFecha, mesFecha + 1, 0).getDate();

            if (dia < 1 || dia > ultimoDiaDelMes) {
                throw new Error(`El día debe estar entre 1 y ${ultimoDiaDelMes} para el mes de ${mesFecha + 1}`);
            }

            // Asignar la nueva fecha con el día indicado
            fecha.setDate(dia);

            // Retornar la fecha en formato 'yyyy-mm-dd' para que sea válida en new Date()
            const diaFormateado = String(fecha.getDate()).padStart(2, '0');
            const mesFormateado = String(fecha.getMonth() + 1).padStart(2, '0');
            const anioFormateado = fecha.getFullYear();

            return `${anioFormateado}-${mesFormateado}-${diaFormateado}`; // Formato 'yyyy-mm-dd'
        } catch (error) {
            console.error('Error al calcular la fecha:', error.message);
            return null; // Si ocurre un error, retorna null
        }
    }

    static obtenerFechaActual() {
        const hoy = new Date();
        const year = hoy.getFullYear();
        const month = String(hoy.getMonth() + 1).padStart(2, '0');
        const day = String(hoy.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Obtener Hora Actual HH:MM:SS
    static obtenerHoraActual() {
        const ahora = new Date();
        const horas = String(ahora.getHours()).padStart(2, '0');
        const minutos = String(ahora.getMinutes()).padStart(2, '0');
        const segundos = String(ahora.getSeconds()).padStart(2, '0');
        return `${horas}:${minutos}:${segundos} `;
    }

    //Obtener Hora Actual HH:MM
    static obtenerHoraActualCorta() {
        const ahora = new Date();
        const horas = String(ahora.getHours()).padStart(2, '0');
        const minutos = String(ahora.getMinutes()).padStart(2, '0');
        return `${horas}:${minutos} `;
    }

    static obtenerPrimerDiaMesActual() {
        const hoy = new Date();
        const anio = hoy.getFullYear();
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');

        return `${anio}-${mes}-01`;
    }

    static obtenerUltimoDiaMesActual() {
        const hoy = new Date();
        const anio = hoy.getFullYear();
        const mes = hoy.getMonth();

        const ultimoDia = new Date(anio, mes + 1, 0).getDate();

        const mesFormateado = String(mes + 1).padStart(2, '0');
        const diaFormateado = String(ultimoDia).padStart(2, '0');

        return `${anio}-${mesFormateado}-${diaFormateado}`;
    }
    //Convierte fecha a valor valido para input
    static convertirFecha(fecha) {
        const [dia, mes, anio] = fecha.split('/');
        return `${anio}-${mes}-${dia}`;
    }

    static formatearFechaTexto(fecha, includeyear) {

        if (!fecha) return '';

        const meses = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];

        const [anio, mes, dia] = fecha.split('-');
        const date = new Date(anio, mes - 1, dia);

        const diaFormateado = String(date.getDate()).padStart(2, '0');
        const mesNombre = meses[date.getMonth()];
        const anioFormateado = date.getFullYear();
        if (includeyear)
            return `${diaFormateado} de ${mesNombre} de ${anioFormateado}`;
        else
            return `${diaFormateado} de ${mesNombre}`;
    }
}

// ========================================
// GESTOR DE SESIÓN GLOBAL
// ========================================
class SessionManager {

    static cerrarSesion() {
        Swal.fire({
            html: `
            <div style = "text-align: center;" >
                <img src="/Content/Images/LogoPTM.png" style="width: 120px; margin-bottom: 20px;" alt="Logo PTM">
                    <h3 style="color: #dc3545; font-weight: bold; margin-bottom: 15px;">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>Cerrar Sesión
                    </h3>
                    <p style="font-size: 16px; color: #6c757d;">
                        ¿Estás seguro de que deseas cerrar tu sesión?
                    </p>
                    <p style="font-size: 14px; color: #999;">
                        Tendrás que volver a iniciar sesión para acceder al sistema.
                    </p>
                </div>
        `,
            showCancelButton: true,
            confirmButtonColor: '#6c757d',
            cancelButtonColor: '#6c757d',
            confirmButtonText: '<i class="bi bi-box-arrow-right me-2"></i>Sí, cerrar sesión',
            cancelButtonText: '<i class="bi bi-x-circle me-2"></i>Cancelar',
            customClass: {
                popup: 'swal-custom-popup',
                confirmButton: 'btn custom-confirm-button',
                cancelButton: 'btn custom-confirm-button',
                actions: 'gap-3'
            },
            buttonsStyling: false,
            reverseButtons: true,
            allowOutsideClick: false,
            showClass: {
                popup: 'animate__animated animate__fadeInDown animate__faster'
            },
            hideClass: {
                popup: 'animate__animated animate__fadeOutUp animate__faster'
            },
            preConfirm: () => {
                return new Promise((resolve) => {
                    // Cambiar el botón a estado "Cerrando..."
                    const btnConfirm = $('.swal2-confirm');
                    const btnCancel = $('.swal2-cancel');

                    btnConfirm.prop('disabled', true);
                    btnCancel.prop('disabled', true);
                    btnConfirm.html('<span class="spinner-border spinner-border-sm me-2"></span>Cerrando sesión...');

                    // Simular proceso de cierre
                    setTimeout(function () {
                        // Limpiar sesión
                        sessionStorage.removeItem('userData');

                        // Cambiar botón a "Sesión cerrada exitosamente" con check
                        btnConfirm.removeClass('btn-danger').addClass('btn-modal-guardar text-white d-flex justify-content-center align-items-center');
                        btnCancel.removeClass('custom-confirm-button').addClass('btn-modal-guardar text-white');
                        btnConfirm.html('<img src="/Content/Images/adios.gif" width="24" class"me-2"> <span>Sesión cerrada exitosamente</span>');
                        // Redireccionar después de mostrar el mensaje
                        setTimeout(function () {
                            window.location.href = '/';
                        }, 1500);
                    }, 800);
                });
            }
        });
    }

    // Método para verificar si hay sesión activa
    static verificarSesion() {
        const userData = sessionStorage.getItem('userData');
        if (!userData) {
            window.location.href = '/';
            return false;
        }

        //Validar permisos y modulos
        let datos_usuario = GlobalUtil.getDatosUsuario();
        //Estatablecer el nombre de usuario
        $("#UserName").text(datos_usuario[0].NOMBRECOMPLETO);

        //TECNICO MTTO
        if (datos_usuario[0].TIPOUSUARIO == "TecnicoMtto") {
            $("#GestionEquiposURL").addClass("d-none"); //GESTION EQUIPOS
            $("#CalendarioManttoURL").addClass("d-none"); //CALENDARIO MANTEMINIENTOS COMPLETADOS
            $("#AlmacenURL").addClass("d-none"); //ALMACEN
            $("#PlaneacionURL").addClass("d-none"); //PLANEACION
            $("#ProduccionURL").addClass("d-none"); //PRODUCCION
            $("#MetricasURL").addClass("d-none"); //METRICAS
        }

        //ALMACEN
        if (datos_usuario[0].TIPOUSUARIO == "Almacen") {
            $("#MantenimientosMainContainer").addClass("d-none"); //MANTENIMIENTOS 
            $("#PlaneacionURL").addClass("d-none"); //PLANEACION
            $("#ProduccionURL").addClass("d-none"); //PRODUCCION
            $("#MetricasURL").addClass("d-none"); //METRICAS
        }

        //PLANEACION
        if (datos_usuario[0].TIPOUSUARIO == "Planeacion") {
            $("#MantenimientosMainContainer").addClass("d-none"); //MANTENIMIENTOS 
            $("#AlmacenURL").addClass("d-none"); //ALMACEN
            $("#ProduccionURL").addClass("d-none"); //PRODUCCION
            $("#MetricasURL").addClass("d-none"); //METRICAS
        }

        //PRODUCCION
        if (datos_usuario[0].TIPOUSUARIO == "Produccion") {
            $("#GestionEquiposURL").addClass("d-none"); //GESTION EQUIPOS
            $("#MCProgramarURL").addClass("d-none"); //GESTION EQUIPOS
            $("#CalendarioManttoURL").addClass("d-none"); //GESTION EQUIPOS
            $("#AlmacenURL").addClass("d-none"); //ALMACEN
            $("#PlaneacionURL").addClass("d-none"); //PLANEACION
            $("#MetricasURL").addClass("d-none"); //METRICAS
        }

        return true;
    }

    // Método para obtener datos del usuario en sesión
    static obtenerUsuario() {
        const userData = sessionStorage.getItem('userData');
        if (userData) {
            try {
                return JSON.parse(userData);
            } catch (e) {
                console.error('Error al parsear datos de usuario:', e);
                return null;
            }
        }
        return null;
    }
}

// ========================================
// GESTOR DE ALERTAS GLOBAL
// ========================================
class AlertManager {
    static mostrar(mensaje, tipo = 'success', containerId = 'alertContainer') {
        const alertId = 'alert-' + Date.now();
        const emoji = (tipo == "success" ? '<img src="/Content/Images/ok.gif" width="24" class"me-3">' : (tipo == "warning" ? '<img src="/Content/Images/alerta.gif" width="24" class"me-3">' : ''));
        const alertHtml = `
            <div id="${alertId}" class="d-flex align-items-center alert alert-${tipo} alert-dismissible fade show" role="alert">
                ${emoji}
                ${mensaje}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;

        $(`#${containerId}`).append(alertHtml);

        setTimeout(() => {
            $(`#${alertId}`).alert('close');
        }, 4000);
    }
}

class GestionEquipos {
    constructor(
        inputBuscar,
        contenedorSugerencias,
        campoNombre,
        campoDescripcion,
        campoCentroCostos,
        campoDocumento,
        campoLinea,
        URLBase,
        alertContainer,
        datosUsuario,
        debounceDelay = 300
    ) {
        this.equipoSeleccionado = null;

        this._inputBuscar = inputBuscar;
        this._contenedorSugerencias = contenedorSugerencias;

        this._campoNombre = campoNombre;
        this._campoDescripcion = campoDescripcion;
        this._campoCentroCostos = campoCentroCostos;
        this._campoDocumento = campoDocumento;
        this._campoLinea = campoLinea;

        this.URLBase = URLBase;
        this._alertContainer = alertContainer;
        this._datosUsuario = datosUsuario;

        this._debounceDelay = debounceDelay;
        this._debounceTimer = null;
    }

    inicializar() {
        console.log('✅ GestionEquipos inicializado correctamente');
    }

    // ─── Búsqueda con debounce ─────────────────────────────
    buscarEquipos(query, Usuario) {
        clearTimeout(this._debounceTimer);

        this._debounceTimer = setTimeout(async () => {
            try {

                if (this._datosUsuario?.[0]?.TIPOUSUARIO === "TecnicoMtto") {
                    Usuario = null;
                }

                const response = await $.ajax({
                    url: `/${this.URLBase}/BuscarEquipo`,
                    method: 'GET',
                    data: {
                        query,
                        Usuario,
                        Planta: this._datosUsuario?.[0]?.PLANTA || null
                    },
                    dataType: 'json'
                });

                this._procesarRespuesta(response);

            } catch (error) {
                AlertManager.mostrar(
                    '🔴 No es posible mostrar la lista de equipos: ' + error,
                    'warning',
                    this._alertContainer
                );
            }

        }, this._debounceDelay);
    }

    // ─── Procesar respuesta ────────────────────────────────
    _procesarRespuesta(response) {

        let data = [];

        // 🔥 CASO 1: viene directo (array)
        if (Array.isArray(response)) {
            data = response;
        }
        // 🔥 CASO 2: viene envuelto (Status/Data)
        else if (response.Status === 'OK') {

            data = response.Data;

            if (typeof data === 'string') {
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    console.warn('Error parseando equipos:', e);
                    data = [];
                }
            }

        }
        else if (response.Status === 'NO') {
            data = [];
        }
        else {
            AlertManager.mostrar('Error: ' + response.Message, 'warning', this._alertContainer);
            return;
        }

        this._mostrarSugerencias(data);
    }

    // ─── Render ────────────────────────────────────────────
    _mostrarSugerencias(equipos) {
        const container = $(this._contenedorSugerencias);
        container.empty();

        if (!equipos || equipos.length === 0) {
            container.html(`
                <div class="sugerencia-item text-muted">
                    <i class="bi bi-exclamation-circle"></i> No se encontraron equipos.
                </div>
            `);
        } else {
            equipos.forEach(eq => container.append(this._renderItem(eq)));
        }

        container.addClass('show');
    }

    _renderItem(equipo) {
        const item = $(`
            <div class="sugerencia-item">
                <div class="sugerencia-nomina">⚙️ ${equipo.NombreEquipo}</div>
                <div class="sugerencia-nombre">📋 ${equipo.DescripcionEquipo}</div>
                <div class="sugerencia-puesto">
                    💰 ${equipo.CentroCostos} | 📄 ${equipo.NumeroDocPmCalidad || 'N/A'}
                </div>
            </div>
        `);

        item.on('click', () => {
            this._seleccionarEquipo(equipo);
            $(this._inputBuscar).val('');
            this.ocultarSugerencias();
        });

        return item;
    }

    // ─── Selección ─────────────────────────────────────────
    _seleccionarEquipo(equipo) {
        this.equipoSeleccionado = equipo;

        $(this._campoNombre).val(equipo.NombreEquipo || '');
        $(this._campoDescripcion).val(equipo.DescripcionEquipo || '');
        $(this._campoCentroCostos).val(equipo.CentroCostos || '');
        $(this._campoDocumento).val(equipo.NumeroDocPmCalidad || '');
        $(this._campoLinea).val(equipo.LineaProduccion || '');

        $(this._inputBuscar).removeClass('is-invalid').addClass('is-valid');

        [
            this._campoNombre,
            this._campoDescripcion,
            this._campoCentroCostos,
            this._campoDocumento,
            this._campoLinea
        ].forEach(selector => {
            if ($(selector).val()) {
                $(selector).removeClass('is-invalid').addClass('is-valid');
            }
        });

        console.log('✅ Equipo seleccionado:', equipo);
    }

    // ─── API pública ───────────────────────────────────────
    ocultarSugerencias() {
        clearTimeout(this._debounceTimer);
        $(this._contenedorSugerencias).removeClass('show').empty();
    }

    limpiar() {
        this.equipoSeleccionado = null;
        clearTimeout(this._debounceTimer);

        $(this._inputBuscar).val('');

        [
            this._campoNombre,
            this._campoDescripcion,
            this._campoCentroCostos,
            this._campoDocumento,
            this._campoLinea
        ].forEach(selector => $(selector).val(''));

        this.ocultarSugerencias();
    }

    obtenerEquipoSeleccionado() {
        return this.equipoSeleccionado;
    }
}


class GestionProveedores {
    constructor({
        inputBuscar = '#BuscarProveedor',
        inputCodigo = '#CodigoProveedor',
        inputNombre = '#NombreProveedor',
        contenedorSugerencias = '#sugerenciasProveedores',
        debounceDelay = 300,
        showBadge = false   // ⬅️ false por default = modo hardcoded
    } = {}) {
        this.proveedorSeleccionado = null;
        this.URLBase = "Almacen";
        this._debounceTimer = null;
        this._debounceDelay = debounceDelay;
        this._showBadge = showBadge;

        this._inputBuscar = inputBuscar;
        this._inputCodigo = inputCodigo;
        this._inputNombre = inputNombre;
        this._contenedorSugerencias = contenedorSugerencias;
    }

    inicializar() {
        console.log('✅ GestionProveedores inicializado:', this._inputBuscar);
    }

    // ─── Búsqueda con debounce ─────────────────────────────────────────────────
    buscarProveedores(query, Usuario) {
        clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(async () => {
            try {
                const response = await $.ajax({
                    url: `/${this.URLBase}/BuscarProveedor`,
                    method: 'GET',
                    data: { query, Usuario },
                    dataType: 'json'
                });
                this._mostrarSugerencias(response);
            } catch (error) {
                AlertManager.mostrar('No es posible mostrar la lista de proveedores: ' + error, 'warning');
            }
        }, this._debounceDelay);
    }

    // ─── Renderizado ───────────────────────────────────────────────────────────
    _mostrarSugerencias(proveedores) {
        const container = $(this._contenedorSugerencias);
        container.empty();

        if (proveedores.length === 0) {
            container.html(`
                <div class="sugerencia-item text-muted">
                    <i class="bi bi-exclamation-circle"></i> No se encontraron proveedores.
                </div>
            `);
            this.foundProveedores = false;
        } else {
            proveedores.forEach(proveedor => container.append(this._renderItem(proveedor)));
            this.foundProveedores = true;
        }

        container.addClass('show');
    }

    _renderItem(proveedor) {
        const item = $(`
            <div class="sugerencia-item">
                <div class="sugerencia-nomina">🏢 ${proveedor.CodigoProveedor}</div>
                <div class="sugerencia-nombre">📋 ${proveedor.NombreProveedor}</div>
            </div>
        `);
        item.on('click', () => {
            this._seleccionarProveedor(proveedor);
            $(this._inputBuscar).val('');
            this.ocultarSugerencias();
        });
        return item;
    }

    // ─── Selección ─────────────────────────────────────────────────────────────
    _seleccionarProveedor(proveedor) {
        this.proveedorSeleccionado = proveedor;
        $(this._inputCodigo).val(proveedor.CodigoProveedor || '');
        $(this._inputNombre).val(proveedor.NombreProveedor || '');

        if (this._showBadge) {
            // ✅ Modo dinámico — oculta input y muestra badge
            $(this._inputBuscar).val('').removeClass('is-invalid').addClass('is-valid').hide();
            $(this._inputBuscar).siblings('.proveedor-badge-selected').remove();

            const badge = $(`
            <div class="proveedor-badge-selected d-flex align-items-center gap-2 p-1">
                <span class="badge-proveedor-chip">
                    <i class="bi bi-building me-1"></i>
                    <strong>${proveedor.CodigoProveedor}</strong> — ${proveedor.NombreProveedor}
                </span>
                <button type="button" class="btn btn-sm btn-warning btn-clear-proveedor" title="Cambiar proveedor">
                    <i class="bi bi-arrow-counterclockwise"></i>
                </button>
            </div>
        `);
            badge.find('.btn-clear-proveedor').on('click', () => {
                this.limpiar();
                $(this._inputBuscar).show().focus();
            });
            $(this._inputBuscar).after(badge);

        } else {
            // ✅ Modo hardcoded — llena campos visibles normalmente
            $(this._inputBuscar).val('').removeClass('is-invalid').addClass('is-valid');
            $(`${this._inputCodigo}, ${this._inputNombre}`).each(function () {
                if ($(this).val()) $(this).removeClass('is-invalid').addClass('is-valid');
            });
        }

        console.log('✅ Proveedor seleccionado:', proveedor);
    }

    // ─── API pública ───────────────────────────────────────────────────────────
    ocultarSugerencias() {
        clearTimeout(this._debounceTimer);
        $(this._contenedorSugerencias).removeClass('show').empty();
    }

    limpiar() {
        this.proveedorSeleccionado = null;
        clearTimeout(this._debounceTimer);
        $(`${this._inputBuscar}, ${this._inputCodigo}, ${this._inputNombre}`).val('');
        this.ocultarSugerencias();
    }

    tieneProveedorSeleccionado() {
        return this.proveedorSeleccionado !== null;
    }

    obtenerProveedorSeleccionado() {
        return this.proveedorSeleccionado;
    }

    obtenerDatosFormulario() {
        return {
            codigoProveedor: $(this._inputCodigo).val().trim(),
            nombreProveedor: $(this._inputNombre).val().trim()
        };
    }
}

class GestionCentrosCosto {
    constructor({
        inputBuscar,
        inputCodigo,
        contenedorSugerencias,
        dimCode,
        debounceDelay = 300
    } = {}) {
        this.centroSeleccionado = null;
        this.URLBase = "Almacen";
        this._debounceTimer = null;
        this._debounceDelay = debounceDelay;
        this._dimCode = dimCode;
        this._inputBuscar = inputBuscar;
        this._inputCodigo = inputCodigo;
        this._contenedorSugerencias = contenedorSugerencias;
        this._listaCache = null; // ✅ caché local
    }

    inicializar() {
        console.log(`✅ GestionCentrosCosto [DimCode: ${this._dimCode}] inicializado:`, this._inputBuscar);
    }

    // ─── Búsqueda con debounce + caché ────────────────────────────────────────
    buscarCentros(query, Usuario) {
        clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(async () => {
            try {
                // ✅ Si ya tenemos la lista cacheada, filtramos directo sin AJAX
                if (this._listaCache) {
                    this._filtrarYMostrar(query);
                    return;
                }

                // ✅ Primera vez — cargamos desde el servidor y cacheamos
                const response = await $.ajax({
                    url: `/${this.URLBase}/GetCentroCostos`,
                    method: 'GET',
                    data: { dimCode: this._dimCode },
                    dataType: 'json'
                });

                if (response.Status !== 'OK') {
                    AlertManager.mostrar('Error al obtener centros de costo.', 'warning');
                    return;
                }

                this._listaCache = JSON.parse(response.Data);
                this._filtrarYMostrar(query);

            } catch (error) {
                AlertManager.mostrar('No es posible mostrar centros de costo: ' + error, 'warning');
            }
        }, this._debounceDelay);
    }

    _filtrarYMostrar(query) {
        const filtrados = this._listaCache.filter(c =>
            c.PrcCode.toUpperCase().includes(query.toUpperCase()) ||
            c.PrcName.toUpperCase().includes(query.toUpperCase())
        );
        this._mostrarSugerencias(filtrados);
    }

    // ─── Renderizado ───────────────────────────────────────────────────────────
    _mostrarSugerencias(centros) {
        // ✅ Remover instancia previa del body
        $(`${this._contenedorSugerencias}`).remove();
        $('body').append(`<div id="${this._contenedorSugerencias.replace('#', '')}" class="autocomplete-centrocostos"></div>`);

        const container = $(this._contenedorSugerencias);
        container.empty();

        const inputEl = $(this._inputBuscar)[0].getBoundingClientRect();

        container.css({
            position: 'fixed',
            top: inputEl.bottom + 'px',
            left: inputEl.left + 'px',
            width: inputEl.width + 'px',
            zIndex: 99999
        });

        if (centros.length === 0) {
            container.html(`
            <div class="sugerencia-item text-muted">
                <i class="bi bi-exclamation-circle"></i> No se encontraron resultados.
            </div>
        `);
        } else {
            centros.forEach(centro => container.append(this._renderItem(centro)));
        }

        container.addClass('show');
    }

    _renderItem(centro) {
        const item = $(`
            <div class="sugerencia-item">
                <div class="sugerencia-nomina">🏷️ ${centro.PrcCode}</div>
                <div class="sugerencia-nombre">📋 ${centro.PrcName}</div>
            </div>
        `);
        item.on('click', () => {
            this._seleccionarCentro(centro);
            this.ocultarSugerencias();
        });
        return item;
    }

    // ─── Selección con badge ───────────────────────────────────────────────────
    _seleccionarCentro(centro) {
        this.centroSeleccionado = centro;
        $(this._inputCodigo).val(centro.PrcCode || '');

        $(this._inputBuscar).val('').removeClass('is-invalid').addClass('is-valid').hide();
        $(this._inputBuscar).siblings('.centro-badge-selected').remove();

        const badge = $(`
            <div class="centro-badge-selected d-flex align-items-center gap-2 p-1">
                <span class="badge-proveedor-chip">
                    <i class="bi bi-diagram-3 me-1"></i>
                    <strong>${centro.PrcCode}</strong> — ${centro.PrcName}
                </span>
                <button type="button" class="btn btn-sm btn-warning btn-clear-centro" title="Cambiar">
                    <i class="bi bi-arrow-counterclockwise"></i>
                </button>
            </div>
        `);

        badge.find('.btn-clear-centro').on('click', () => {
            this.limpiar();
            $(this._inputBuscar).show().focus();
        });

        $(this._inputBuscar).after(badge);
        console.log(`✅ Centro [DimCode: ${this._dimCode}] seleccionado:`, centro);
    }

    // ─── API pública ───────────────────────────────────────────────────────────
    ocultarSugerencias() {
        clearTimeout(this._debounceTimer);
        $(this._contenedorSugerencias).removeClass('show').empty().remove(); // ✅ remove() para limpiarlo del body
    }

    limpiar() {
        this.centroSeleccionado = null;
        clearTimeout(this._debounceTimer);
        $(this._inputBuscar).val('').show();
        $(this._inputCodigo).val('');
        $(this._inputBuscar).siblings('.centro-badge-selected').remove();
        this.ocultarSugerencias();
        // ✅ _listaCache se conserva intencionalmente
    }

    tieneCentroSeleccionado() {
        return this.centroSeleccionado !== null;
    }

    obtenerCentroSeleccionado() {
        return this.centroSeleccionado;
    }

    obtenerDatosFormulario() {
        return {
            codigo: $(this._inputCodigo).val().trim()
        };
    }
}

// ✅ Clase para gestionar artículos con selección automática a tabla
class GestionArticulos {
    constructor(datos_usuario, grupo_articulos) {
        this.articuloSeleccionado = null;
        this.URLBase = "Planeacion";
        this._debounceTimer = null;
        this._debounceDelay = 300;
        this._inputBuscar = '#BuscarArticulo';
        this._contenedorSugerencias = '#sugerenciasArticulos'; // ⬅️ faltaba
        this.includeArt = [];
        this.grupo_articulos = grupo_articulos;
        this.datos_usuario = datos_usuario;
    }

    inicializar() {
        console.log('✅ GestionArticulos inicializado correctamente');
    }

    // ─── Búsqueda con debounce integrado ──────────────────────────────────────
    buscarArticulos(query, Usuario, Linea, ValidarCap) {
        let Planta = this.datos_usuario[0].PLANTA;
        let GrupoArticulos = this.grupo_articulos;
        clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(async () => {
            try {
                const response = await $.ajax({
                    url: `/${this.URLBase}/BuscarArticulo`,
                    method: 'GET',
                    data: { query, Usuario, Planta, Linea, GrupoArticulos, ValidarCap },
                    dataType: 'json'
                });
                this._mostrarSugerencias(response);
            } catch (error) {
                AlertManager.mostrar('No es posible mostrar la lista de artículos: ' + error, 'warning');
            }
        }, this._debounceDelay);
    }

    // ─── Metodo para AcGrid ───────────────────────────────────────────────────────────
    async obtenerArticulos(query, Usuario, ValidarCap) {
        let Planta = this.datos_usuario[0].PLANTA;
        let GrupoArticulos = this.grupo_articulos;
        let Linea = null;
        try {
            const response = await $.ajax({
                url: `/${this.URLBase}/BuscarArticulo`,
                method: 'GET',
                data: { query, Usuario, Planta, Linea, GrupoArticulos, ValidarCap },
                dataType: 'json'
            });

            return response;

        } catch (error) {

            console.error(error);
            return [];

        }

    }

    // ─── Renderizado ───────────────────────────────────────────────────────────
    _mostrarSugerencias(articulos) {
        const container = $(this._contenedorSugerencias);
        container.empty();

        if (articulos.length === 0) {
            container.html(`
                <div class="sugerencia-item-empty text-muted">
                    <i class="bi bi-exclamation-circle"></i> No se encontraron artículos.
                </div>
            `);
        } else {
            articulos.forEach(articulo => {
                if (this.includeArt.length > 0) {
                    if (this.includeArt.includes(articulo.GrupoArt)) {
                        container.append(this._renderItem(articulo))
                    }
                }
                else {
                    container.append(this._renderItem(articulo))
                }
            });
        }

        container.addClass('show');
    }

    _renderItem(articulo) {
        const item = $(`
            <div class="sugerencia-item">
                <div class="sugerencia-nomina">🏷️ ${articulo.CodigoArticulo}</div>
                <div class="sugerencia-nombre">📦 ${articulo.DescripcionArticulo}</div>
            </div>
        `);
        item.on('click', () => {
            this._seleccionarArticulo(articulo);
            $(this._inputBuscar).val('');
            this.ocultarSugerencias();
        });
        return item;
    }

    // ─── Selección ─────────────────────────────────────────────────────────────
    _seleccionarArticulo(articulo) {
        this.articuloSeleccionado = articulo;
        $('#CodigoArticulo').val(articulo.CodigoArticulo || '');
        $('#DescripcionArticulo').val(articulo.DescripcionArticulo || '');
        $('#PlanCapPiezas').val(articulo.PzsDia || 0);
        $('#PlanCapKilos').val(articulo.KgsDia || 0);

        $('#BuscarArticulo').removeClass('is-invalid').addClass('is-valid');
        $('#CodigoArticulo, #DescripcionArticulo').each(function () {
            if ($(this).val()) $(this).removeClass('is-invalid').addClass('is-valid');
        });

        console.log('✅ Artículo seleccionado:', articulo);
    }

    // ─── API pública ───────────────────────────────────────────────────────────
    ocultarSugerencias() {
        clearTimeout(this._debounceTimer);
        $(this._contenedorSugerencias).removeClass('show').empty();
    }

    limpiar() {
        this.articuloSeleccionado = null;
        clearTimeout(this._debounceTimer);
        $('#BuscarArticulo, #CodigoArticulo, #DescripcionArticulo').val('');
        this.ocultarSugerencias();
    }

    tieneArticuloSeleccionado() {
        return this.articuloSeleccionado !== null;
    }

    obtenerArticuloSeleccionado() {
        return this.articuloSeleccionado;
    }

    obtenerDatosFormulario() {
        return {
            codigoArticulo: $('#CodigoArticulo').val().trim(),
            descripcionArticulo: $('#DescripcionArticulo').val().trim()
        };
    }
}
// ✅ Clase para gestionar artículos con selección automática a tabla
class GestionArticulosCustom {
    constructor(
        inputBuscar,
        contenedorSugerencias,
        inputCodigo,
        inputDescripcion,
        tbodyId = '#bodyArticulosRefaccionMP',
        urlBase = 'Mantenimientos',
        ModalContainer,
        GrupoArticulos = 0,
        MultipleArticulo = true,
        datos_usuario
    ) {
        this.URLBase = urlBase;
        this._inputBuscar = inputBuscar;
        this._contenedorSugerencias = contenedorSugerencias;
        this._inputCodigo = inputCodigo;
        this._inputDescripcion = inputDescripcion;
        this._tbodyId = tbodyId;
        this._debounceTimer = null;
        this._debounceDelay = 300;
        this._ModalContainer = ModalContainer;
        this.articulosAgregados = [];
        this.GrupoArticulos = GrupoArticulos;
        this.MultipleArticulo = MultipleArticulo;
        this.datos_usuario = datos_usuario;
    }

    buscarArticulos(query, Usuario, ValidarCap) {
        clearTimeout(this._debounceTimer);
        let Planta = this.datos_usuario[0].PLANTA;
        let GrupoArticulos = this.GrupoArticulos; //cualquiera diferente de 110
        this._debounceTimer = setTimeout(async () => {
            try {
                const response = await $.ajax({
                    url: `/${this.URLBase}/BuscarArticulo`,
                    // url: `/ProgramaMantenimientos/BuscarArticulo`,
                    method: 'GET',
                    data: { query, Usuario, Planta, GrupoArticulos, ValidarCap },
                    dataType: 'json'
                });
                this._mostrarSugerencias(response);
            } catch (error) {
                console.error('Error al buscar artículos:', error);
            }
        }, this._debounceDelay);
    }

    _mostrarSugerencias(articulos) {
        const container = $(this._contenedorSugerencias);
        container.empty();
        if (articulos.length === 0) {
            container.html(`<div class="sugerencia-item text-muted"><i class="bi bi-exclamation-circle"></i> No se encontraron artículos.</div>`);
        } else {
            articulos.forEach(articulo => {
                //Solo los incluidos en el arreglo en caso de exisitir
                container.append(this._renderItem(articulo))
            });
        }
        container.addClass('show');
    }

    _renderItem(articulo) {
        const sinStock = articulo.StockDisponible <= 0;

        const badgeStock = sinStock
            ? `<span class="badge-stock sin-stock-badge"><span class="circulo-badge"></span> Sin stock</span>`
            : `<span class="badge-stock con-stock-badge"><span class="circulo-badge"></span> Disponible</span>`;

        const item = $(`
        <div class="sugerencia-item ${sinStock ? 'sin-stock' : ''}">
            <div class="sugerencia-info">
                <div class="sugerencia-nomina">🏷️ ${articulo.CodigoArticulo}</div>
                <div class="sugerencia-nombre">📦 ${articulo.DescripcionArticulo}</div>
            </div>
            ${badgeStock}
        </div>
    `);

        item.on('click', () => {
            this._seleccionarArticulo(articulo);
        });

        return item;
    }

    _seleccionarArticulo(articulo) {
        //Si no se permiten multiples articulos
        if (this.MultipleArticulo == false)
        {
            $(`#bodyArticulosRefaccionMP`).empty();
        }
        this.agregarArticuloTabla(articulo);
        $(this._inputBuscar).val('');
        this.ocultarSugerencias();
    }

    agregarArticuloTabla(articulo) {
        //Si no se permiten multiples articulos
        if (this.MultipleArticulo == false) {
            this.articulosAgregados = [];
        }
        const yaExiste = this.articulosAgregados.some(a => a.CodigoArticulo === articulo.CodigoArticulo);
        if (yaExiste) {
            AlertManager.mostrar('El artículo ya está en la lista.', 'warning', this._ModalContainer);
            return;
        }
        this.articulosAgregados.push({ CodigoArticulo: articulo.CodigoArticulo, StockDisponible: articulo.StockDisponible, DescripcionArticulo: articulo.DescripcionArticulo, Cantidad: 1 });
        this.renderizarTabla();
    }

    renderizarTabla() {
        const tbody = $(this._tbodyId);
        tbody.empty();
        if (this.articulosAgregados.length === 0) {
            const emptyRowId = this._tbodyId.includes('MP') ? 'filaSinArticulosMP' : 'filaSinArticulosMC';
            tbody.html(`<tr id="${emptyRowId}"><td colspan="6" class="text-center text-muted py-3"><i class="bi bi-info-circle me-1"></i>Busque y seleccione un artículo para agregarlo</td></tr>`);
            return;
        }
        this.articulosAgregados.forEach((articulo, index) => {
            const row = $(`<tr><td class="text-center">${index + 1}</td><td class="text-center">${articulo.CodigoArticulo}</td><td>${articulo.DescripcionArticulo}</td><td class="text-center">${articulo.StockDisponible}</td><td class="text-center"><input type="number" class="form-control form-control-sm text-center cantidad-articulo" value="${articulo.Cantidad}" min="1" data-index="${index}"></td><td class="text-center"><button class="btn btn-sm btn-danger btn-eliminar-articulo" data-index="${index}"><i class="bi bi-x-lg"></i></button></td></tr>`);
            tbody.append(row);
        });
        $('.cantidad-articulo').on('change', (e) => { const index = $(e.target).data('index'); this.articulosAgregados[index].Cantidad = parseInt($(e.target).val()) || 1; });
        $('.btn-eliminar-articulo').on('click', (e) => { this.eliminarArticulo($(e.target).closest('button').data('index')); });
    }

    eliminarArticulo(index) {
        this.articulosAgregados.splice(index, 1);
        this.renderizarTabla();
    }

    obtenerArticulos() { return this.articulosAgregados; }

    limpiar() { this.articulosAgregados = []; this.renderizarTabla(); }

    ocultarSugerencias() { clearTimeout(this._debounceTimer); $(this._contenedorSugerencias).removeClass('show').empty(); }
}

// ========================================
// GESTOR DE CHECKLIST (CON NOTAS)
// ========================================
class ChecklistManager {
    constructor() {
        this.draggedActividad = null;
        this.draggedNota = null;
        this.contadorNotas = 0;
        this.seccionImagenesCreada = false;
    }

    inicializar() {
        this.configurarDragAndDropActividades();
        this.configurarDragAndDropNotas();
        this.configurarEventosImagenes();
        console.log('✅ ChecklistManager inicializada correctamente');
    }

    // ============================================
    // MÉTODOS PARA IMÁGENES
    // ============================================

    crearSeccionGaleriaImagenes() {
        // Verificar si ya existe la sección de galería
        if ($('#seccion-galeria-imagenes').length > 0) {
            return;
        }

        const seccionGaleria = `
        <div id="seccion-galeria-imagenes" class="nota-seccion p-3 mb-3" style="display:none;">
            <h6 style="color:var(--modal-primary); font-weight:700;">
                <i class="bi bi-images me-2"></i>Ilustración grafica
            </h6>
            <div id="galeriaImagenesRutina"></div>
        </div>
        `;

        // Insertar antes de la sección de comentarios
        const $comentarios = $("#seccion-comentarios");
        if ($comentarios.length) {
            $comentarios.before(seccionGaleria);
        } else {
            $("#rutinaChecklist").parent().append(seccionGaleria);
        }

        // Configurar eventos para la galería
        this.configurarEventosGaleria();
    }

    crearSeccionUploadImagenes() {
        // Verificar si ya existe la sección
        if ($('#seccion-upload-imagenes').length > 0) {
            $('#seccion-upload-imagenes').show();
            return;
        }

        const seccionUpload = `
        <div id="seccion-upload-imagenes" class="nota-seccion p-3 mb-3" style="display:none;">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <h6 style="color:var(--modal-primary); font-weight:700; margin:0;">
                    <i class="bi bi-plus-circle me-2"></i>Agregar más imágenes
                </h6>
                <button type="button" class="btn btn-sm btn-outline-secondary" id="btnCerrarUpload">
                    <i class="bi bi-x"></i> Cerrar
                </button>
            </div>
            <div class="upload-area mb-2" id="uploadAreaRutina">
                <div class="upload-icon">📷</div>
                <div class="upload-text">Arrastra y suelta imágenes aquí</div>
                <div class="upload-hint">o haz clic para seleccionar archivos</div>
                <input type="file" id="fileInputRutina" accept="image/*" multiple style="display:none;">
            </div>
            <div class="progress-bar" id="progressBarRutina" style="display:none;">
                <div class="progress-fill" id="progressFillRutina"></div>
            </div>
            <div class="upload-info">
                Formatos: JPG, PNG, GIF, WebP | Tamaño máximo: 5MB por imagen
            </div>
            <div class="preview-area" id="previewAreaRutina"></div>
            <button type="button" class="btn-clear-all" id="clearAllRutina" style="display:none;">
                🗑️ Limpiar todas las imágenes
            </button>
        </div>
        `;

        // Insertar después de la galería de imágenes
        const $galeria = $("#seccion-galeria-imagenes");
        if ($galeria.length) {
            $galeria.after(seccionUpload);
        } else {
            const $comentarios = $("#seccion-comentarios");
            if ($comentarios.length) {
                $comentarios.before(seccionUpload);
            }
        }

        // Inicializar el uploader de imágenes
        this.inicializarUploaderImagenes();

        // Evento para cerrar la sección de upload
        $('#btnCerrarUpload').off('click').on('click', () => {
            $('#seccion-upload-imagenes').hide();
        });
    }

    configurarEventosGaleria() {
        // Ver imagen en grande
        $(document).off('click', '.galeria-img-rutina').on('click', '.galeria-img-rutina', (e) => {
            const imgSrc = $(e.currentTarget).attr('src');
            this.mostrarImagenGrande(imgSrc);
        });

        // Eliminar imagen de la galería
        $(document).off('click', '.btn-eliminar-galeria').on('click', '.btn-eliminar-galeria', (e) => {
            e.stopPropagation();
            const $item = $(e.currentTarget).closest('.galeria-item');
            const url = $item.data('url');
            const nombreArchivo = url.split('/').pop();
            this.eliminarImagenGaleria($item, nombreArchivo);
        });
    }

    async eliminarImagenGaleria($item, nombreArchivo) {
        const idEquipo = window.gestionEquiposApp?.mantenimientoManager?.EquipoAasignarRutina;
        const planta = window.gestionEquiposApp?.datos_usuario[0]?.PLANTA;

        if (!idEquipo || !planta) return;

        try {
            await window.gestionEquiposApp?.mantenimientoManager?.eliminarImagenRutina(idEquipo, planta, nombreArchivo);
            $item.fadeOut(300, function () {
                $(this).remove();
                // Si no quedan imágenes, ocultar la sección
                if ($('#galeriaImagenesRutina .galeria-item').length === 0) {
                    $('#seccion-galeria-imagenes').fadeOut(300, function () {
                        $(this).remove();
                    });
                }
            });
            AlertManager.mostrar('Imagen eliminada correctamente', 'success');
        } catch (error) {
            AlertManager.mostrar('Error al eliminar imagen: ' + error, 'warning');
        }
    }

    mostrarGaleriaImagenes(urls) {
        if (!urls || urls.length === 0) return;

        this.crearSeccionGaleriaImagenes();

        urls.forEach((url) => {
            const nombreArchivo = url.split('/').pop();
            const $item = $(`
                <div class="galeria-item mb-3 position-relative" data-url="${url}">
                    <img src="${url}" alt="${nombreArchivo}" class="galeria-img-rutina" 
                         style="width:100%; height:auto; border-radius:8px; cursor:pointer; border:2px solid #dee2e6;">
                    <button type="button" class="btn btn-sm btn-danger btn-eliminar-galeria position-absolute top-0 end-0 m-1" 
                            title="Eliminar" style="border-radius:50%; width:32px; height:32px; padding:0; opacity:0.8;">
                        <i class="bi bi-x" style="font-size:14px;"></i>
                    </button>
                </div>
            `);
            $('#galeriaImagenesRutina').append($item);
        });

        // Mostrar la galería
        $('#seccion-galeria-imagenes').show();
    }

    inicializarUploaderImagenes() {
        const $uploadArea = $('#uploadAreaRutina');
        const $fileInput = $('#fileInputRutina');
        const $previewArea = $('#previewAreaRutina');
        const $progressBar = $('#progressBarRutina');
        const $progressFill = $('#progressFillRutina');
        const $clearAll = $('#clearAllRutina');

        // Inicializar variable global
        if (typeof window.imagenesRutina === 'undefined') {
            window.imagenesRutina = [];
        }

        // Click en el área de carga
        $uploadArea.off('click').on('click', function () {
            $fileInput.click();
        });

        // Prevenir click en el input
        $fileInput.off('click').on('click', function (e) {
            e.stopPropagation();
        });

        // Manejar selección de archivos
        $fileInput.off('change').on('change', (e) => {
            this.handleFiles(e.target.files);
        });

        // Drag and drop
        $uploadArea.off('dragover').on('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            $uploadArea.addClass('dragover');
        });

        $uploadArea.off('dragleave').on('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            $uploadArea.removeClass('dragover');
        });

        $uploadArea.off('drop').on('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            $uploadArea.removeClass('dragover');
            this.handleFiles(e.originalEvent.dataTransfer.files);
        });

        // Limpiar todo
        $clearAll.off('click').on('click', () => {
            $previewArea.empty();
            window.imagenesRutina = [];
            $clearAll.hide();
        });

        // Eliminar imagen individual
        $previewArea.off('click', '.delete-btn').on('click', '.delete-btn', (e) => {
            e.stopPropagation();
            const index = $(e.currentTarget).data('index');
            this.eliminarImagen(index);
        });

        // Ver imagen en grande
        $previewArea.off('click', '.preview-item').on('click', '.preview-item', (e) => {
            if (!$(e.target).hasClass('delete-btn')) {
                const imgSrc = $(e.currentTarget).find('img').attr('src');
                this.mostrarImagenGrande(imgSrc);
            }
        });
    }

    handleFiles(files) {
        if (files.length === 0) return;

        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        const maxFileSize = 5 * 1024 * 1024; // 5MB

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            if (!allowedTypes.includes(file.type)) {
                AlertManager.mostrar(`${file.name}: Formato no soportado`, 'warning');
                continue;
            }

            if (file.size > maxFileSize) {
                AlertManager.mostrar(`${file.name}: Archivo muy grande (máx 5MB)`, 'warning');
                continue;
            }

            // Agregar a la lista global
            window.imagenesRutina.push(file);

            // Mostrar preview
            this.agregarPreviewImagen(file, window.imagenesRutina.length - 1);
        }

        $('#clearAllRutina').show();
    }

    agregarPreviewImagen(file, index) {
        const $previewArea = $('#previewAreaRutina');
        const reader = new FileReader();

        reader.onload = (e) => {
            const $preview = $(`
                <div class="preview-item" data-index="${index}">
                    <img src="${e.target.result}" alt="${file.name}">
                    <div class="preview-overlay">
                        <div class="file-name">${file.name}</div>
                        <div class="file-size">${this.formatFileSize(file.size)}</div>
                        <button class="delete-btn" data-index="${index}">🗑️</button>
                    </div>
                </div>
            `);
            $previewArea.append($preview);
        };

        reader.readAsDataURL(file);
    }

    eliminarImagen(index) {
        $(`.preview-item[data-index="${index}"]`).remove();
        window.imagenesRutina.splice(index, 1);

        // Reindexar previews
        $('#previewAreaRutina').find('.preview-item').each((i, el) => {
            $(el).attr('data-index', i);
            $(el).find('.delete-btn').attr('data-index', i);
        });

        if (window.imagenesRutina.length === 0) {
            $('#clearAllRutina').hide();
        }
    }

    mostrarImagenGrande(src) {
        $('#imagenAmpliada').attr('src', src);
        $('#modalVerImagen').modal('show');
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    configurarEventosImagenes() {
        // Click en botón "Agregar Imagen" del modal
        $(document).off('click', '#btnAgregarImagenRutina').on('click', '#btnAgregarImagenRutina', () => {
            this.crearSeccionUploadImagenes();
            $('#seccion-upload-imagenes').show();

            // Hacer scroll hasta la sección
            $('html, body').animate({
                scrollTop: $('#seccion-upload-imagenes').offset().top - 100
            }, 500);
        });
    }

    // Cargar imágenes existentes en la galería
    cargarImagenesExistentes(urls) {
        if (!urls || urls.length === 0) return;

        this.mostrarGaleriaImagenes(urls);
    }

    // ============================================
    // MÉTODOS PARA ACTIVIDADES
    // ============================================
    renumerarActividades() {
        $("#rutinaChecklist .actividad").each(function (index) {
            const numero = index + 1;
            const $numeroSpan = $(this).find(".numero-actividad");
            const $label = $(this).find("label.form-label");

            if ($label.find("input").length) {
                $numeroSpan.text(`${numero}.`);
            } else {
                $numeroSpan.text(`${numero}.`);
            }

            // Actualizar el ID
            $(this).attr('id', `actividad-${numero}`);
        });
    }

    fijarTextoActividad($input) {
        const texto = $input.val().trim() || "Actividad sin nombre";
        const $label = $input.closest("label");
        const $numeroSpan = $label.find(".numero-actividad");
        const numero = $numeroSpan.text();

        $label.html(`
            <span class="numero-actividad">${numero}</span>
            <span class="texto-actividad">${texto}</span>
        `);
    }

    agregarActividad() {
        const total = $("#rutinaChecklist .actividad").length + 1;
        const nuevaActividad = $(`
        <div id="actividad-${total}" class="mb-3 actividad position-relative p-2" draggable="true">
            <button type="button" class="btn btn-sm btn-danger btn-eliminar-actividad position-absolute top-0 end-0 m-1 fs-4" title="Eliminar">
                <i class="bi bi-x-circle"></i>
            </button>
            <label class="form-label fw-semibold input-edicion-actividad">
                <span class="numero-actividad">${total}.</span>
                <input type="text" class="form-control d-inline-block w-100 input-actividad" placeholder="Nueva actividad">
            </label>
            <div class="d-flex gap-4 mt-2">
                <div class="firma-opcion">
                    <span class="fw-semibold editable-firma">Realizado:</span>
                    <div class="linea-firma"></div>
                </div>
                <div class="firma-opcion">
                    <span class="fw-semibold editable-firma">No Realizado:</span>
                    <div class="linea-firma"></div>
                </div>
            </div>
        </div>
        `);

        $("#rutinaChecklist").append(nuevaActividad);
        this.renumerarActividades();

        // Poner focus en el input de inmediato
        nuevaActividad.find("input.input-actividad").focus();
    }

    eliminarActividad(e) {
        const $actividad = $(e.currentTarget).closest(".actividad");
        $actividad.addClass("fade-out");
        setTimeout(() => {
            $actividad.remove();
            this.renumerarActividades();
        }, 400);
    }

    editarTextoActividad(e) {
        const span = $(e.currentTarget);
        const currentText = span.text();

        const input = $('<input type="text" class="form-control d-inline-block">').val(currentText)
            .css({
                width: 'calc(100% - 40px)',
                display: 'inline-block'
            });

        span.replaceWith(input);
        input.focus();

        input.on('blur keydown', function (event) {
            if (event.type === 'blur' || (event.type === 'keydown' && event.key === 'Enter')) {
                const newSpan = $('<span class="texto-actividad"></span>').text(input.val());
                input.replaceWith(newSpan);
            }
        });
    }

    editarTextoFirma(e) {
        const span = $(e.currentTarget);
        const currentText = span.text();

        const input = $('<input type="text" class="form-control form-control-sm">').val(currentText)
            .css('width', '100%');

        span.replaceWith(input);
        input.focus();

        input.on('blur keydown', function (event) {
            if (event.type === 'blur' || (event.type === 'keydown' && event.key === 'Enter')) {
                const newSpan = $('<span class="fw-semibold editable-firma"></span>').text(input.val());
                input.replaceWith(newSpan);
            }
        });
    }

    configurarDragAndDropActividades() {
        $(document).on('dragstart', '#rutinaChecklist .actividad', (e) => {
            this.draggedActividad = e.currentTarget;
            e.originalEvent.dataTransfer.effectAllowed = 'move';
            $(e.currentTarget).addClass('dragging');
        });

        $(document).on('dragend', '#rutinaChecklist .actividad', (e) => {
            $(e.currentTarget).removeClass('dragging');
        });

        $(document).on('dragover', '#rutinaChecklist .actividad', function (e) {
            e.preventDefault();
            e.originalEvent.dataTransfer.dropEffect = 'move';
        });

        $(document).on('drop', '#rutinaChecklist .actividad', (e) => {
            e.preventDefault();
            if (this.draggedActividad && this.draggedActividad !== e.currentTarget) {
                const $dragged = $(this.draggedActividad);
                const $target = $(e.currentTarget);

                const draggedIndex = $dragged.index();
                const targetIndex = $target.index();

                if (draggedIndex < targetIndex) {
                    $target.after($dragged);
                } else {
                    $target.before($dragged);
                }

                this.renumerarActividades();
            }
            this.draggedActividad = null;
        });
    }

    // ============================================
    // MÉTODOS PARA NOTAS
    // ============================================
    agregarNota() {
        this.contadorNotas++;
        const idNota = `nota-agregada-${this.contadorNotas}`;

        const nuevaNota = $(`
        <div id="${idNota}" class="nota-seccion position-relative p-2 mb-3" draggable="true">
            <button type="button" class="btn btn-sm btn-danger btn-eliminar-nota position-absolute top-0 end-0 m-1 fs-4" title="Eliminar">
                <i class="bi bi-x-circle"></i>
            </button>
            <label class="form-label w-100">
                <input type="text" class="form-control input-nota-nueva" placeholder="Escribe aquí la nota...">
            </label>
        </div>
        `);

        // Insertar antes de la sección de comentarios
        const $comentarios = $("#seccion-comentarios");
        if ($comentarios.length) {
            $comentarios.before(nuevaNota);
        } else {
            $("#rutinaChecklist").parent().append(nuevaNota);
        }

        // Focus en el input
        nuevaNota.find("input.input-nota-nueva").focus();
    }

    eliminarNota(e) {
        const $nota = $(e.currentTarget).closest(".nota-seccion");
        $nota.addClass("fade-out");
        setTimeout(() => {
            $nota.remove();
        }, 400);
    }

    fijarTextoNota($input) {
        const texto = $input.val().trim() || "Nota vacía";
        const $label = $input.closest("label");

        $label.html(`<span class="texto-actividad">${texto}</span>`);
    }

    configurarDragAndDropNotas() {
        $(document).on('dragstart', '.nota-seccion', (e) => {
            this.draggedNota = e.currentTarget;
            e.originalEvent.dataTransfer.effectAllowed = 'move';
            $(e.currentTarget).addClass('dragging');
        });

        $(document).on('dragend', '.nota-seccion', (e) => {
            $(e.currentTarget).removeClass('dragging');
        });

        $(document).on('dragover', '.nota-seccion', function (e) {
            e.preventDefault();
            e.originalEvent.dataTransfer.dropEffect = 'move';
        });

        $(document).on('drop', '.nota-seccion', (e) => {
            e.preventDefault();
            if (this.draggedNota && this.draggedNota !== e.currentTarget) {
                const $dragged = $(this.draggedNota);
                const $target = $(e.currentTarget);

                const draggedIndex = $dragged.index();
                const targetIndex = $target.index();

                if (draggedIndex < targetIndex) {
                    $target.after($dragged);
                } else {
                    $target.before($dragged);
                }
            }
            this.draggedNota = null;
        });
    }

    // ============================================
    // HACER SECCIONES EDITABLES
    // ============================================
    habilitarEdicionNotas() {
        // Mostrar botones de eliminar en notas NUEVAS solamente
        $(document).on('mouseenter', '.nota-seccion', function () {
            // Solo mostrar el botón si la nota es nueva (tiene el ID "nota-agregada-")
            if ($(this).attr('id') && $(this).attr('id').startsWith('nota-agregada-')) {
                $(this).find('.btn-eliminar-nota').show();
            }
        });

        $(document).on('mouseleave', '.nota-seccion', function () {
            $(this).find('.btn-eliminar-nota').hide();
        });
    }
}

// ========================================
// INICIALIZACIÓN GLOBAL
// ========================================
$(document).ready(function () {
    // Cerrar sesión
    $('#btnCerrarSesion').on('click', function (e) {
        e.preventDefault();
        SessionManager.cerrarSesion();
    });

    //Limita a solo caracteres, no acepta simbolos ni numeros
    $('.validacion').on('input', function (e) {
        texto_formateado = "";
        funcion_destino = $(this).attr("funcion_destino");
        switch (funcion_destino) {
            case "darFormatoNumLet":
                texto_formateado = GlobalUtil.darFormatoNumLet($(this).val());
                break;
            case "darFormatoGeneral":
                texto_formateado = GlobalUtil.darFormatoGeneral($(this).val());
                break;
            case "darFormatoNum":
                texto_formateado = GlobalUtil.darFormatoNum($(this).val());
                break;
        }
        $(this).val(texto_formateado);
        valor_actual = $(this).val().length;
        max = $(this).attr("maximo") ? parseInt($(this).attr("maximo")) : "";
        if (max != '') {
            if (valor_actual > max) {
                $(this).val($(this).val().substr(0, max));
            }
        }
    });

    // Verificar sesión solo si la página lo requiere
    if ($('body').data('require-auth') === true) {
        SessionManager.verificarSesion();
    }

    function ajustarAlturaMenu() {
        const altura = $(window).height();
        $("#MenuLateral").height(altura);
    }

    // Al cargar la página
    ajustarAlturaMenu();

    // Cuando cambie el tamaño
    $(window).on('resize', function () {
        ajustarAlturaMenu();
    });

    console.log('✅ Global.js cargado correctamente');
});