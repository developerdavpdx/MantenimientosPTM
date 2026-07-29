
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

    // Hooks para estilo de fila de totales
    getTotalsFontColor() { return 'FF0058A1'; }
    getTotalsBorderColor() { return 'FF0058A1'; }

    // Aplicar estilo a la última fila (TOTALES) si existe
    applyTotalsRowStyle(worksheet, estructura) {
        const totalFilas = worksheet.rowCount;
        if (totalFilas < 3) return; // no hay datos

        const filaTotales = worksheet.getRow(totalFilas);
        const fontColor = this.getTotalsFontColor();
        const borderColor = this.getTotalsBorderColor();

        for (let col = 1; col <= estructura.totalColumnas; col++) {
            const celda = filaTotales.getCell(col);
            if (!celda.font) celda.font = {};
            celda.font.bold = true;
            celda.font.color = { argb: fontColor };
            celda.font.size = 11;

            celda.border = {
                top: { style: 'medium', color: { argb: borderColor } },
                bottom: { style: 'thin' },
                left: { style: 'thin' },
                right: { style: 'thin' }
            };
        }
    }

}

class ReprogramacionConfirmManager {
    static mostrar({ titulo, mensaje, onSi, onNo }) {
        $('#modalReprogramacionTitulo').text(titulo);
        $('#modalReprogramacionMensaje').html(mensaje);

        $('#modalReprogramacionBtnSi').off('click').on('click', () => {
            $('#modalConfirmarReprogramacion').modal('hide');
            onSi();
        });

        $('#modalReprogramacionBtnNo').off('click').on('click', () => {
            $('#modalConfirmarReprogramacion').modal('hide');
            onNo();
        });

        $('#modalConfirmarReprogramacion').modal('show');
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

    async _cargarFirmaFromDB(tipo, ruta, nombre, disabled = true) {
        if (!ruta) return;

        const key = this._mapTipo(tipo);
        const pad = await this._ensurePad(key);
        if (!pad) return;

        pad.clear();

        await new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                try {
                    // 🔥 Convertir imagen a canvas y luego a DataURL
                    const canvas = document.createElement('canvas');
                    canvas.width = pad.canvas.width;
                    canvas.height = pad.canvas.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    // ✅ Cargar a través de SignaturePad (así lo reconoce como no vacío)
                    const dataURL = canvas.toDataURL('image/png');
                    pad.fromDataURL(dataURL);

                    resolve();
                } catch (e) {
                    console.warn('Error procesando firma:', e);
                    resolve();
                }
            };
            img.onerror = () => { console.warn("Error cargando firma:", ruta); resolve(); };
            // 🔥 Cache buster: agregar timestamp para evitar caché del navegador
            const rutaConTimestamp = ruta.includes('?') ? `${ruta}&t=${Date.now()}` : `${ruta}?t=${Date.now()}`;
            img.src = rutaConTimestamp;
        });

        $(`#nombre${key}`).val(nombre || '');
        $(`#placeholder${key}`).hide();
        if (disabled)
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

    _desbloquearFirmaParaEdicion(tipo) {
        const key = this._mapTipo(tipo);
        const pad = this.signaturePads[key];

        if (!pad) {
            console.warn(`❌ Pad no disponible para desbloquear: ${key}`);
            return;
        }

        const container = $(`#firma${key}Container`);
        const canvas = document.getElementById(`canvas${key}`);
        const nombreInput = $(`#nombre${key}`);

        if (pad && pad.on) pad.on();
        container.find('button').show();
        nombreInput.prop('readonly', false);
        if (canvas) $(canvas).css({ 'pointer-events': 'auto', 'cursor': 'crosshair', 'opacity': '1' });
        container.removeClass('firma-readonly');
        container.removeClass('firma-deshabilitada');
    }

    async queueFirma(tipo, ruta, nombre, disabled = true) {
        if (!tipo) return;
        if (!ruta) return;
        if (this._firmasInicializadas) {
            await this._cargarFirmaFromDB(tipo, ruta, nombre, disabled);
            return;
        }
        if (!this._firmasPendientes) this._firmasPendientes = [];
        const existe = this._firmasPendientes.some(f => f.tipo === tipo);
        if (existe) return;
        this._firmasPendientes.push({ tipo, ruta, nombre, disabled });
    }

    async _procesarFirmasPendientes() {
        if (!this._firmasPendientes || this._firmasPendientes.length === 0) return;
        console.log('🖋️ Procesando firmas pendientes...');
        for (const f of this._firmasPendientes) {
            await this._cargarFirmaFromDB(f.tipo, f.ruta, f.nombre, f.disabled);
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

    async buscarTecnicos(query, planta, posicionId, usuarioWeb, tipoUsuario) {
        try {
            const response = await $.ajax({
                url: `/${this.URLBase}/BuscarEmpleados`,
                method: 'GET',
                data: {
                    planta: planta,
                    query: query,
                    posicionId: posicionId,
                    usuarioWeb: usuarioWeb,
                    tipoUsuario: tipoUsuario
                },
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
                    <div class="sugerencia-item" data-nomina="${tecnico.NOMINA || 'S/A'}">
                        <div class="sugerencia-nomina">📛 #${tecnico.NOMINA || 'S/A'}</div>
                        <div class="sugerencia-nombre">👷 ${tecnico.NOMBRE_COMPLETO}</div>
                        <div class="sugerencia-puesto">🏭 ${tecnico.DEPARTAMENTO || 'N/A'}</div>
                        <div class="sugerencia-puesto">📍 PLANTA: ${tecnico.PLANTA || 'N/A'}</div>
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
    static mostrarLoader(mostrar,description = "") {
        const loader = document.getElementById('calendarLoader');
        if (loader) {
            loader.style.display = mostrar ? 'flex' : 'none';
        }
        const loaderDescription = document.getElementById('loading_description');
        if (loaderDescription && description !== "") {
            loaderDescription.textContent = description;
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
            { text: '📋 Producción Teórica', width: 24 },
            { text: '📊 Producción Real', width: 24 },
            { text: '💬 Comentarios', width: 44 },
            { text: '📅 Rango Días', width: 26 }
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

        // Localizar columnas actuales por texto de encabezado
        function findColByFragment(fragment) {
            let col = -1;
            headerRow.eachCell((cell, c) => {
                try {
                    let v = '';
                    if (cell.value && typeof cell.value === 'object' && cell.value.richText) {
                        v = cell.value.richText.map(t => t.text).join('');
                    } else {
                        v = String(cell.value || '');
                    }
                    if (v.includes(fragment)) col = c;
                } catch (e) { }
            });
            return col;
        }

        const newRangoCol = findColByFragment('Rango Días');
        const comentariosCol = findColByFragment('Comentarios');
        // Columna histórica donde el código original colocaba 'Rango Días' (1-based)
        const oldRangoCol = 6;

        // Declaración previa de slots para evitar TDZ (se rellenará más abajo)
        let slots = [];

        // Funciones auxiliares para fechas (espera formatos dd/mm/yyyy o ISO)
        const parseDateStr = (s) => {
            if (!s) return null;
            const slashPattern = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/; // dd/mm/yyyy
            const m = String(s).match(slashPattern);
            if (m) {
                const d = parseInt(m[1], 10);
                const mo = parseInt(m[2], 10) - 1;
                const y = parseInt(m[3], 10);
                const dt = new Date(y, mo, d);
                return Number.isNaN(dt.getTime()) ? null : dt;
            }
            // Fallback a ISO u otros formatos reconocidos por Date
            const iso = new Date(s);
            return Number.isNaN(iso.getTime()) ? null : iso;
        };

        const fmtNum = (n) => (parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 });

        // Determinar rango global de fechas (incluye historiales)
        let minDate = null;
        let maxDate = null;
        const updateRange = (d) => {
            if (!d) return;
            if (!minDate || d < minDate) minDate = d;
            if (!maxDate || d > maxDate) maxDate = d;
        };
        data.forEach(r => {
            const s = parseDateStr(r.DIA_INICIO_MANT_STR);
            const e = parseDateStr(r.DIA_FIN_MANT_STR);
            updateRange(s);
            updateRange(e);
            (r.BITACORA || []).forEach(b => {
                updateRange(parseDateStr(b.NVO_DIA_INICIO_MANT_STR));
                updateRange(parseDateStr(b.NVO_DIA_FIN_MANT_STR));
            });
        });

        // Generar columnas (días o semanas) entre minDate y maxDate
        const dayColumns = [];
        if (minDate && maxDate && minDate <= maxDate) {
            // normalizar horas a 00:00
            minDate = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
            maxDate = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
            for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
                dayColumns.push(new Date(d));
            }
        }

        // Decidir si usar semanas para agrupar (rango grande)
        const MAX_DAILY_COLUMNS = 45; // umbral; ajustar si es necesario
        const useWeeks = dayColumns.length > MAX_DAILY_COLUMNS;

        // Buscar la columna real que contiene 'Rango Días' en la fila de cabecera
        let rangoColIndex = -1;
        headerRow.eachCell((cell, col) => {
            try {
                let text = '';
                if (cell.value && typeof cell.value === 'object' && cell.value.richText) {
                    text = cell.value.richText.map(t => t.text).join('');
                } else {
                    text = String(cell.value || '');
                }
                if (text.includes('Rango Días')) {
                    rangoColIndex = col;
                }
            } catch (e) { /* ignore */ }
        });

        // Buscar la primera columna que parece de fecha (p. ej. '05/06') para no pisar columnas intermedias
        let firstDateCol = -1;
        headerRow.eachCell((cell, col) => {
            try {
                let s = '';
                if (cell.value && typeof cell.value === 'object' && cell.value.richText) {
                    s = cell.value.richText.map(t => t.text).join('');
                } else {
                    s = String(cell.value || '');
                }
                if (/\d{2}\/\d{2}/.test(s)) {
                    firstDateCol = col;
                }
            } catch (e) { /* ignore */ }
        });

        // Determinar el inicio del Gantt: preferir la primera columna de fecha si existe,
        // si no, colocar el Gantt después de TODAS las columnas estáticas para no sobrescribirlas
        let ganttStartCol;
        if (firstDateCol > 0) ganttStartCol = firstDateCol;
        else ganttStartCol = headers.length + 1;

        if (rangoColIndex > 0) {
            worksheet.getColumn(rangoColIndex).width = 50;
            headerRow.getCell(rangoColIndex).alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
        }

        slots = [];
        if (!useWeeks) {
            // slots por día (Date)
            for (const dt of dayColumns) slots.push(dt);
        } else {
            // slots por semana (objetos {start,end}) — semana inicia lunes
            const getStartOfWeek = d => {
                const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                const day = dt.getDay();
                // day 0 = domingo, queremos inicio lunes -> calcular offset
                const diff = (day === 0) ? 6 : day - 1; // domingo->6, lunes->0
                dt.setDate(dt.getDate() - diff);
                return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
            };
            let w = getStartOfWeek(minDate);
            while (w <= maxDate) {
                const start = new Date(w.getFullYear(), w.getMonth(), w.getDate());
                const end = new Date(start);
                end.setDate(start.getDate() + 6);
                slots.push({ start, end });
                w.setDate(w.getDate() + 7);
            }
        }

        // Crear encabezados según slots (día o semana)
        slots.forEach((slot, idx) => {
            const colIndex = ganttStartCol + idx;
            const cell = headerRow.getCell(colIndex);
            if (!useWeeks) {
                const dt = slot;
                const dd = String(dt.getDate()).padStart(2, '0');
                const mm = String(dt.getMonth() + 1).padStart(2, '0');
                cell.value = `${dd}/${mm}`;
                cell.alignment = { vertical: 'middle', horizontal: 'center', textRotation: 90, wrapText: true };
                worksheet.getColumn(colIndex).width = 3.6;
            } else {
                const a = slot.start;
                const b = slot.end;
                const ad = String(a.getDate()).padStart(2, '0');
                const am = String(a.getMonth() + 1).padStart(2, '0');
                const bd = String(b.getDate()).padStart(2, '0');
                const bm = String(b.getMonth() + 1).padStart(2, '0');
                cell.value = `${ad}/${am} - ${bd}/${bm}`;
                cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                worksheet.getColumn(colIndex).width = 9;
            }
            cell.font = { name: 'Segoe UI', size: 8, bold: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
        });
        headerRow.height = 35;

        // Paleta de colores basada en el azul PTM con variantes armónicas (se rotan por fila)
        const palette = [
            {
                name: 'PTM Blue',
                gradientStart: 'FFE7F7FF',
                gradientEnd: 'FF0058A1',
                light: 'FFBBDEFB',
                histLight: 'FFE3F2FD',
                histGradientStart: 'FFF8FBFF',
                histGradientEnd: 'FFE5F3FF'
            },
            {
                name: 'Deep Blue',
                gradientStart: 'FFEAF6FF',
                gradientEnd: 'FF1976D2',
                light: 'FFD9EAFB',
                histLight: 'FFF0F6FF',
                histGradientStart: 'FFF6FBFF',
                histGradientEnd: 'FFEAF6FF'
            },
            {
                name: 'Teal',
                gradientStart: 'FFF0FCFB',
                gradientEnd: 'FF007C91',
                light: 'FFD6F3F5',
                histLight: 'FFF0FBFA',
                histGradientStart: 'FFF7FEFF',
                histGradientEnd: 'FFDFF7F9'
            },
            {
                name: 'Cyan',
                gradientStart: 'FFEFF9FF',
                gradientEnd: 'FF00A8CC',
                light: 'FFD7F3FA',
                histLight: 'FFF0FAFF',
                histGradientStart: 'FFF7FDFF',
                histGradientEnd: 'FFDFF7FF'
            },
            {
                name: 'Green',
                gradientStart: 'FFF0FBF0',
                gradientEnd: 'FF2E7D32',
                light: 'FFDFF6E7',
                histLight: 'FFF3FAF1',
                histGradientStart: 'FFF7FFF5',
                histGradientEnd: 'FFE6F7E8'
            },
            {
                name: 'Soft Yellow',
                gradientStart: 'FFFFFBEA',
                gradientEnd: 'FFF7D358',
                light: 'FFFFF3CC',
                histLight: 'FFFFF9E6',
                histGradientStart: 'FFFFFEF8',
                histGradientEnd: 'FFFFF1D1'
            },
            {
                name: 'Orange',
                gradientStart: 'FFFFF4EB',
                gradientEnd: 'FFEF6C00',
                light: 'FFFFE0C2',
                histLight: 'FFFFF6ED',
                histGradientStart: 'FFFFF8F2',
                histGradientEnd: 'FFFFEDE0'
            },
            {
                name: 'Purple',
                gradientStart: 'FFF8F4FF',
                gradientEnd: 'FF6A1B9A',
                light: 'FFEDDFF7',
                histLight: 'FFF6F1FB',
                histGradientStart: 'FFFBF7FF',
                histGradientEnd: 'FFF2E8FF'
            }
        ];

        let currentRow = 5;

        // Mezclar paleta cada exportación para obtener colores diferentes
        const shuffle = (arr) => {
            const a = arr.slice();
            for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                const tmp = a[i];
                a[i] = a[j];
                a[j] = tmp;
            }
            return a;
        };

        // Excluir paleta morada de la exportación y mezclar
        const exportPalette = palette.filter(p => p.name !== 'Purple');
        const shuffledPalette = shuffle(exportPalette.length ? exportPalette : palette);

        data.forEach((row, index) => {
            const excelRow = worksheet.getRow(currentRow);
            // seleccionar color de paleta para esta fila (usa paleta mezclada)
            const pal = shuffledPalette[index % shuffledPalette.length];
            // preparar variantes semi-translúcidas para históricos (usar ARGB con alpha)
            const alphaStart = '33'; // ~20% opacidad
            const alphaEnd = '66';   // ~40% opacidad
            const safeHex = (s) => (s && s.length === 8) ? s.substring(2) : s; // remove leading alpha
            const histGradStartAlpha = alphaStart + safeHex(pal.histGradientStart);
            const histGradEndAlpha = alphaEnd + safeHex(pal.histGradientEnd);
            const histLightAlpha = alphaEnd + safeHex(pal.histLight);
            // fallback colores más contrastados para historiales (Excel puede ignorar alpha)
            const histStrongStart = pal.gradientStart || pal.histGradientStart;
            const histStrongEnd = pal.gradientEnd || pal.histGradientEnd;
            // Mover valores de las columnas antiguas (6..9) a las nuevas columnas según encabezado
            try {
                const mappings = [
                    { old: 6, fragment: 'Rango Días' },
                    { old: 7, fragment: 'Producción Teórica' },
                    { old: 8, fragment: 'Producción Real' },
                    { old: 9, fragment: 'Comentarios' }
                ];
                for (const m of mappings) {
                    const targetCol = findColByFragment(m.fragment);
                    if (targetCol > 0) {
                        const oldCell = excelRow.getCell(m.old);
                        const newCell = excelRow.getCell(targetCol);
                        if ((oldCell.value || '') && (!newCell.value || String(newCell.value).trim() === '')) {
                            newCell.value = oldCell.value;
                            oldCell.value = null;
                        }
                    }
                }
            } catch (e) { /* ignore */ }
            const bgColor = index % 2 === 0 ? 'FFFFFFFF' : 'FFF7F9FC';
            const capacidades = [row.PZSXDIA ? `${fmtNum(row.PZSXDIA)} PZ/día` : null, row.KGSXDIA ? `${fmtNum(row.KGSXDIA)} KG/día` : null].filter(Boolean).join(' | ');

            // Helper para escribir en la columna que coincida con el encabezado
            const writeByHeader = (fragment, value) => {
                try {
                    const c = findColByFragment(fragment);
                    if (c <= 0) return;
                    const cell = excelRow.getCell(c);
                    cell.value = value;
                    cell.font = { name: 'Segoe UI', size: 10 };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
                    const firstTwo = ['Línea de Producción', 'Artículo'];
                    const isFirstTwo = firstTwo.some(f => fragment.includes(f));
                    cell.alignment = { vertical: 'middle', horizontal: isFirstTwo ? 'left' : 'center', indent: isFirstTwo ? 1 : 0, wrapText: true };
                    cell.border = { top: { style: 'thin', color: { argb: 'FFE0E0E0' } }, left: { style: 'thin', color: { argb: 'FFE0E0E0' } }, bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } }, right: { style: 'thin', color: { argb: 'FFE0E0E0' } } };
                } catch (e) { /* ignore */ }
            };

            // Escribir campos por encabezado
            writeByHeader('Línea de Producción', row.LINEA_PRODUCCION_DESC || '');
            writeByHeader('Artículo', `${row.ARTICULO || ''} - ${row.ARTICULO_DESC || ''}`);
            writeByHeader('Capacidades', capacidades);
            writeByHeader('Proceso', row.PROCESO || '');
            writeByHeader('Mes/Año', DateUtils.getMesAnioString(row.FECHA_PLAN_STRING) || '');
            writeByHeader('Rango Días', `Del ${row.DIA_INICIO_MANT_STR} - Al ${row.DIA_FIN_MANT_STR}`);
            writeByHeader('Producción Teórica', [row.PRODUCCION_TEORICA_PZS ? `${fmtNum(row.PRODUCCION_TEORICA_PZS)} PZ` : null, row.PRODUCCION_TEORICA_KGS ? `${fmtNum(row.PRODUCCION_TEORICA_KGS)} KG` : null].filter(Boolean).join(' | '));
            writeByHeader('Producción Real', fmtNum(row.PRODUCCION_REAL));
            writeByHeader('Comentarios', row.COMENTARIOS || '');

            excelRow.height = 38;
            // Marcar rango Gantt en columnas diarias
            const start = parseDateStr(row.DIA_INICIO_MANT_STR);
            const end = parseDateStr(row.DIA_FIN_MANT_STR);
            if (start && end && slots.length) {
                if (!useWeeks) {
                    for (let i = 0; i < slots.length; i++) {
                        const colIndex = ganttStartCol + i;
                        const dt = slots[i];
                        const cell = excelRow.getCell(colIndex);
                        if (dt >= new Date(start.getFullYear(), start.getMonth(), start.getDate()) && dt <= new Date(end.getFullYear(), end.getMonth(), end.getDate())) {
                            cell.fill = {
                                type: 'gradient',
                                gradient: 'angle',
                                degree: 90,
                                stops: [
                                    { position: 0, color: { argb: pal.gradientStart } },
                                    { position: 1, color: { argb: pal.gradientEnd } }
                                ]
                            };
                            cell.border = { left: { style: 'thin', color: { argb: pal.gradientEnd } }, right: { style: 'thin', color: { argb: pal.gradientEnd } } };
                        }
                    }
                } else {
                    // marcar semanas si el slot es un objeto {start,end}
                    for (let i = 0; i < slots.length; i++) {
                        const colIndex = ganttStartCol + i;
                        const slot = slots[i];
                        const cell = excelRow.getCell(colIndex);
                        if (!(slot.end < start || slot.start > end)) {
                            cell.fill = {
                                type: 'gradient',
                                gradient: 'angle',
                                degree: 90,
                                stops: [
                                    { position: 0, color: { argb: pal.gradientStart } },
                                    { position: 1, color: { argb: pal.gradientEnd } }
                                ]
                            };
                            cell.border = { left: { style: 'thin', color: { argb: pal.gradientEnd } }, right: { style: 'thin', color: { argb: pal.gradientEnd } } };
                        }
                    }
                }
            }
            currentRow++;

            const updates = (row.BITACORA || []).filter(b => b.BIT_ACCION === 'UPDATE');
            updates.forEach((bit) => {
                const histRow = worksheet.getRow(currentRow);
                const capPzsHist = (bit.NVO_PZSXDIA !== undefined && bit.NVO_PZSXDIA != null) ? bit.NVO_PZSXDIA : (bit.PZSXDIA !== undefined ? bit.PZSXDIA : null);
                const capKgsHist = (bit.NVO_KGSXDIA !== undefined && bit.NVO_KGSXDIA != null) ? bit.NVO_KGSXDIA : (bit.KGSXDIA !== undefined ? bit.KGSXDIA : null);
                const capacidadesHist = [capPzsHist ? `${fmtNum(capPzsHist)} PZ/día` : null, capKgsHist ? `${fmtNum(capKgsHist)} KG/día` : null].filter(Boolean).join(' | ');
                const histProdTeorPzs = (bit.NVO_PRODUCCION_TEORICA_PZS !== undefined && bit.NVO_PRODUCCION_TEORICA_PZS != null) ? bit.NVO_PRODUCCION_TEORICA_PZS : (bit.PRODUCCION_TEORICA_PZS !== undefined ? bit.PRODUCCION_TEORICA_PZS : null);
                const histProdTeorKgs = (bit.NVO_PRODUCCION_TEORICA_KGS !== undefined && bit.NVO_PRODUCCION_TEORICA_KGS != null) ? bit.NVO_PRODUCCION_TEORICA_KGS : (bit.PRODUCCION_TEORICA_KGS !== undefined ? bit.PRODUCCION_TEORICA_KGS : null);
                const histData = [`↳ HISTORIAL ${row.LINEA_PRODUCCION_DESC || ''}`, bit.NVO_ARTICULO ? `${bit.NVO_ARTICULO} - ${bit.NVO_ARTICULO_DESC || ''}` : '', capacidadesHist, bit.NVO_PROCESO || '', `${DateUtils.getMesAnioString(row.FECHA_PLAN_STRING) || ''}`, (bit.NVO_DIA_INICIO_MANT_STR && bit.NVO_DIA_FIN_MANT_STR) ? `Del ${bit.NVO_DIA_INICIO_MANT_STR} - Al ${bit.NVO_DIA_FIN_MANT_STR}` : '', [histProdTeorPzs ? `${fmtNum(histProdTeorPzs)} PZ` : null, histProdTeorKgs ? `${fmtNum(histProdTeorKgs)} KG` : null].filter(Boolean).join(' | '), fmtNum(bit.NVO_PRODUCCION_REAL), bit.NVO_COMENTARIOS || ''];

                // Escribir historiales por encabezado
                const writeHist = (fragment, value) => {
                    try {
                        const c = findColByFragment(fragment);
                        if (c <= 0) return;
                        const cell = histRow.getCell(c);
                        cell.value = value;
                        cell.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF546E7A' } };
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: pal.histLight } };
                        const firstTwo = ['Línea de Producción', 'Artículo'];
                        const isFirstTwo = firstTwo.some(f => fragment.includes(f));
                        cell.alignment = { vertical: 'middle', horizontal: isFirstTwo ? 'left' : 'center', indent: isFirstTwo ? 2 : 0, wrapText: true };
                        cell.border = { top: { style: 'thin', color: { argb: 'FFE0E0E0' } }, left: { style: 'thin', color: { argb: 'FFE0E0E0' } }, bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } }, right: { style: 'thin', color: { argb: 'FFE0E0E0' } } };
                    } catch (e) { /* ignore */ }
                };

                writeHist('Línea de Producción', `↳ HISTORIAL ${row.LINEA_PRODUCCION_DESC || ''}`);
                writeHist('Artículo', bit.NVO_ARTICULO ? `${bit.NVO_ARTICULO} - ${bit.NVO_ARTICULO_DESC || ''}` : '');
                writeHist('Capacidades', capacidadesHist);
                writeHist('Proceso', bit.NVO_PROCESO || '');
                writeHist('Mes/Año', DateUtils.getMesAnioString(row.FECHA_PLAN_STRING) || '');
                writeHist('Rango Días', (bit.NVO_DIA_INICIO_MANT_STR && bit.NVO_DIA_FIN_MANT_STR) ? `Del ${bit.NVO_DIA_INICIO_MANT_STR} - Al ${bit.NVO_DIA_FIN_MANT_STR}` : '');
                writeHist('Producción Teórica', [histProdTeorPzs ? `${fmtNum(histProdTeorPzs)} PZ` : null, histProdTeorKgs ? `${fmtNum(histProdTeorKgs)} KG` : null].filter(Boolean).join(' | '));
                writeHist('Producción Real', fmtNum(bit.NVO_PRODUCCION_REAL));
                writeHist('Comentarios', bit.NVO_COMENTARIOS || '');

                histRow.height = 34;
                // Marcar rango Gantt para historial
                const hStart = parseDateStr(bit.NVO_DIA_INICIO_MANT_STR);
                const hEnd = parseDateStr(bit.NVO_DIA_FIN_MANT_STR);
                if (hStart && hEnd && slots.length) {
                    if (!useWeeks) {
                        for (let i = 0; i < slots.length; i++) {
                            const colIndex = ganttStartCol + i;
                            const dt = slots[i];
                            const cell = histRow.getCell(colIndex);
                            if (dt >= new Date(hStart.getFullYear(), hStart.getMonth(), hStart.getDate()) && dt <= new Date(hEnd.getFullYear(), hEnd.getMonth(), hEnd.getDate())) {
                            // Usar gradiente más contrastado para historiales (fallback a colores fuertes si alpha ignorado)
                            cell.fill = {
                                type: 'gradient',
                                gradient: 'angle',
                                degree: 90,
                                stops: [
                                    { position: 0, color: { argb: histStrongStart } },
                                    { position: 1, color: { argb: histStrongEnd } }
                                ]
                            };
                            cell.border = { left: { style: 'thin', color: { argb: histStrongEnd } }, right: { style: 'thin', color: { argb: histStrongEnd } } };
                            }
                        }
                    } else {
                        for (let i = 0; i < slots.length; i++) {
                            const colIndex = ganttStartCol + i;
                            const slot = slots[i];
                            const cell = histRow.getCell(colIndex);
                            if (!(slot.end < hStart || slot.start > hEnd)) {
                                cell.fill = {
                                    type: 'gradient',
                                    gradient: 'angle',
                                    degree: 90,
                                    stops: [
                                        { position: 0, color: { argb: pal.histGradientStart } },
                                        { position: 1, color: { argb: pal.histGradientEnd } }
                                    ]
                                };
                                cell.border = { left: { style: 'thin', color: { argb: pal.histGradientEnd } }, right: { style: 'thin', color: { argb: pal.histGradientEnd } } };
                            }
                        }
                    }
                }
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

        // Post-procesado: forzar títulos de fecha horizontales y dibujar barras tipo progreso
        try {
            const fixedColsCount = headers.length;
            const ganttStartCol = fixedColsCount + 1;
            const dataStartRow = headerRow.number + 1;

            // Asegurar columnas Gantt horizontales y ancho más amplio para mejor visibilidad
            for (let i = 0; i < slots.length; i++) {
                const col = worksheet.getColumn(ganttStartCol + i);
                col.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                // ancho mayor para mejorar lectura (doble del anterior)
                col.width = 16;
            }

            // Dibujar barras mergeadas por cada plano (principal) y su historial
            for (let r = 0; r < data.length; r++) {
                const rowNum = dataStartRow + r;
                const rowData = data[r];
                const s = parseDateStr(rowData.DIA_INICIO_MANT_STR);
                const e = parseDateStr(rowData.DIA_FIN_MANT_STR);
                if (s && e) {
                    const startIndex = slots.findIndex(sl => s >= sl.start && s <= sl.end);
                    const endIndex = slots.findIndex(sl => e >= sl.start && e <= sl.end);
                    if (startIndex >= 0 && endIndex >= startIndex) {
                        const startCol = ganttStartCol + startIndex;
                        const endCol = ganttStartCol + endIndex;
                        try {
                            worksheet.mergeCells(rowNum, startCol, rowNum, endCol);
                            // reducir la altura de la fila para que la barra sea más delgada
                            worksheet.getRow(rowNum).height = 14;
                            const cell = worksheet.getCell(rowNum, startCol);
                            cell.value = null;
                            // Usar un relleno tipo gradiente para dar sensación de profundidad
                            // Azul estilo barra de progreso (gradiente más marcado)
                            // Elegir color de la paleta por índice de fila
                            const pal = palette[r % palette.length];
                            cell.fill = {
                                type: 'gradient',
                                gradient: 'path',
                                center: { left: 0.5, top: 0.5 },
                                stops: [
                                    { position: 0, color: { argb: pal.gradientStart } },
                                    { position: 1, color: { argb: pal.gradientEnd } }
                                ]
                            };
                            cell.alignment = { vertical: 'middle', horizontal: 'center' };
                            // Simular contorno para que parezca una barra con borde
                            cell.border = {
                                left: { style: 'thin', color: { argb: 'FF5A9BD6' } },
                                right: { style: 'thin', color: { argb: 'FF5A9BD6' } },
                                top: { style: 'thin', color: { argb: '00FFFFFF' } },
                                bottom: { style: 'thin', color: { argb: '00FFFFFF' } }
                            };
                        } catch (ex) {
                            // merge puede fallar si ya existe un merge; ignorar
                        }
                    }
                }

                // Dibujar barras para historiales (color más claro)
                (rowData.BITACORA || []).forEach(b => {
                    const bs = parseDateStr(b.NVO_DIA_INICIO_MANT_STR);
                    const be = parseDateStr(b.NVO_DIA_FIN_MANT_STR);
                    if (!bs || !be) return;
                    const bi = slots.findIndex(sl => bs >= sl.start && bs <= sl.end);
                    const ei = slots.findIndex(sl => be >= sl.start && be <= sl.end);
                    if (bi >= 0 && ei >= bi) {
                        const sc = ganttStartCol + bi;
                        const ec = ganttStartCol + ei;
                        try {
                            worksheet.mergeCells(rowNum, sc, rowNum, ec);
                            worksheet.getRow(rowNum).height = 14;
                            const bcell = worksheet.getCell(rowNum, sc);
                            bcell.value = null;
                            // Histórico: color de la paleta pero más claro
                            const palH = palette[r % palette.length];
                            bcell.fill = {
                                type: 'gradient',
                                gradient: 'path',
                                center: { left: 0.5, top: 0.5 },
                                stops: [
                                    { position: 0, color: { argb: palH.histGradientStart } },
                                    { position: 1, color: { argb: palH.histGradientEnd } }
                                ]
                            };
                            bcell.alignment = { vertical: 'middle', horizontal: 'center' };
                        } catch (ex) {
                            // ignorar errores de merge
                        }
                    }
                });
            }
        } catch (err) {
            // no bloquear la exportación por errores visuales
            console.warn('Post-procesado Gantt falló:', err);
        }

        // --- Leyenda: mostrar muestras de color y etiquetas a la derecha del Gantt ---
        try {
            const legendColStart = ganttStartCol + slots.length + 2;
            const legendRowTop = 2;
            // Mostrar muestras de color y etiquetas sincronizadas con la paleta generada
            const legendPal = shuffledPalette[0] || palette[0];
            worksheet.getColumn(legendColStart).width = 4;
            worksheet.getColumn(legendColStart + 1).width = 20;
            worksheet.mergeCells(legendRowTop, legendColStart, legendRowTop, legendColStart);
            const sampleCell = worksheet.getCell(legendRowTop, legendColStart);
            sampleCell.fill = { type: 'gradient', gradient: 'path', center: { left: 0.5, top: 0.5 }, stops: [{ position: 0, color: { argb: legendPal.gradientStart } }, { position: 1, color: { argb: legendPal.gradientEnd } }] };
            sampleCell.border = { left: { style: 'thin', color: { argb: legendPal.gradientEnd } }, right: { style: 'thin', color: { argb: legendPal.gradientEnd } } };
            const labelCell = worksheet.getCell(legendRowTop, legendColStart + 1);
            labelCell.value = 'Producción Teórica';
            labelCell.font = { name: 'Segoe UI', size: 9 };
            labelCell.alignment = { vertical: 'middle', horizontal: 'left' };

            // Histórico: usar variante de historial de la paleta
            const legendRow2 = legendRowTop + 1;
            worksheet.getColumn(legendColStart + 1).width = 20;
            const sampleCell2 = worksheet.getCell(legendRow2, legendColStart);
            sampleCell2.fill = { type: 'gradient', gradient: 'path', center: { left: 0.5, top: 0.5 }, stops: [{ position: 0, color: { argb: legendPal.histGradientStart } }, { position: 1, color: { argb: legendPal.histGradientEnd } }] };
            sampleCell2.border = { left: { style: 'thin', color: { argb: legendPal.histGradientEnd } }, right: { style: 'thin', color: { argb: legendPal.histGradientEnd } } };
            const labelCell2 = worksheet.getCell(legendRow2, legendColStart + 1);
            labelCell2.value = 'Historial (modificaciones)';
            labelCell2.font = { name: 'Segoe UI', size: 9 };
            labelCell2.alignment = { vertical: 'middle', horizontal: 'left' };
        } catch (ex) {
            console.warn('No se pudo dibujar leyenda:', ex);
        }

        // --- Línea vertical que marca la fecha actual ---
        try {
            const today = new Date();
            const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const todayIndex = slots.findIndex(sl => t >= sl.start && t <= sl.end);
            if (todayIndex >= 0) {
                const colIndex = ganttStartCol + todayIndex;
                const firstRowToMark = 3; // incluir fila de meses/encabezados
                const lastRowToMark = dataStartRow + data.length - 1;
                for (let rr = firstRowToMark; rr <= lastRowToMark; rr++) {
                    const cell = worksheet.getCell(rr, colIndex);
                    // Dar borde más marcado para la línea vertical
                    cell.border = Object.assign({}, cell.border || {}, {
                        left: { style: 'medium', color: { argb: 'FF0B63C0' } },
                        right: { style: 'medium', color: { argb: 'FF0B63C0' } }
                    });
                }
                // Resaltar ligeramente fondo de la columna (solo en encabezado de fechas)
                const headerHighlight = worksheet.getCell(headerRow.number - 1, colIndex);
                if (headerHighlight) headerHighlight.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF6FF' } };
            }
        } catch (ex) {
            console.warn('No se pudo dibujar la línea de fecha actual:', ex);
        }

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

    static calcularDiferenciaHoras(horaInicio, horaFin) {
        // const parseFecha = (fechaStr) => {
        //     const [fecha, hora] = fechaStr.split(' ');
        //     const [dia, mes, anio] = fecha.split('/');
        //     return new Date(`${anio}-${mes}-${dia}T${hora}`);
        // };

        // const inicio = parseFecha(horaInicio);
        // const fin = parseFecha(horaFin);

        // if (isNaN(inicio) || isNaN(fin)) return null;

        // const diffMs = fin - inicio;

        // const horas = diffMs / (1000 * 60 * 60);

        // return horas.toFixed(2);

        if (!horaInicio || !horaFin)
            return null;

        // Si viene fecha y hora, nos quedamos solo con la hora
        horaInicio = horaInicio.includes(' ') ? horaInicio.split(' ')[1] : horaInicio;
        horaFin = horaFin.includes(' ') ? horaFin.split(' ')[1] : horaFin;

        const [h1, m1] = horaInicio.split(':').map(Number);
        const [h2, m2] = horaFin.split(':').map(Number);

        let inicioMin = h1 * 60 + m1;
        let finMin = h2 * 60 + m2;

        // Si cruza medianoche
        if (finMin < inicioMin) {
            finMin += 24 * 60;
        }

        const diferencia = finMin - inicioMin;

        const horas = Math.floor(diferencia / 60);
        const minutos = diferencia % 60;

        return `${horas}.${String(minutos).padStart(2, '0')}`;

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
                selectElement.empty();
                FiltroLinea.empty();

                if (data.Status === 'OK') {

                    let lineasData = data.Data;

                    if (typeof lineasData === 'string') {
                        try {
                            lineasData = JSON.parse(lineasData);
                        } catch (e) {
                            console.warn('No se pudo parsear Data:', e);
                        }
                    }

                    selectElement.append('<option value="">Todas las líneas</option>');
                    // selectElement.prop("disabled", false);
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


                } else if (data.Status === 'NO') {

                    AlertManager.mostrar(data.Message, 'warning');

                } else if (data.Status === 'warning') {

                    AlertManager.mostrar('Error: ' + data.Message, 'warning');
                }
                // Ejecutar callback siempre que se haya pasado (éxito o no)
                try {
                    if (typeof callback === 'function') callback();
                } catch (err) {
                    console.error('Error ejecutando callback en llenarLineas:', err);
                }
            },
            error: () => {

                this.hideSelectLoader(Fieldoptiongroup);
                this.hideSelectLoader(Fieldfilter);

                AlertManager.mostrar(
                    'Error de conexión. No fue posible obtener el listado de líneas.',
                    'warning'
                );
                // Asegurar que el callback se invoque también en caso de error de conexión
                try {
                    if (typeof callback === 'function') callback();
                } catch (err) {
                    console.error('Error ejecutando callback en llenarLineas (error):', err);
                }
            }
        });
    }

    static obtenerLineas(Planta, Area, Produccion) {

        return new Promise((resolve, reject) => {

            $.ajax({
                url: `/${GlobalUtil.URLBaseEquipos}/GetLineasPorPlanta`,
                type: 'GET',
                data: { "Planta": Planta, "Area": Area, "Produccion": Produccion },
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

    static obtenerAreas(Planta) {

        return new Promise((resolve, reject) => {

            $.ajax({
                url: `/${GlobalUtil.URLBaseEquipos}/GetProcesosPorPlanta`,
                type: 'GET',
                data: { "Planta": Planta },
                headers: {
                    'Content-Type': 'application/json'
                },
                success: (data) => {

                    if (data.Status === 'OK') {

                        let areasData = data.Data;

                        if (typeof areasData === 'string') {
                            try {
                                areasData = JSON.parse(areasData);
                            } catch (e) {
                                console.warn('No se pudo parsear Data:', e);
                            }
                        }

                        // 🔥 Solo devolver lista
                        const lista = areasData.map(x => ({
                            value: x.ID_AREA,
                            label: x.AREA
                        }));

                        resolve(lista);

                    } else {

                        reject(data.Message);

                    }

                },
                error: () => {

                    reject("Error al obtener áreas");

                }
            });

        });

    }

    static llenarLineasCheckbox(Planta, Area, Produccion, FieldContainer) {

        $('#cardsPlaneacionGrid')
            .removeClass('d-none')
            .show();

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
            },
            complete: function () {
                setTimeout(function () {
                    $(`#cardsPlaneacionGrid`).fadeOut(500, () => {
                        $(`#cardsPlaneacionGrid`).addClass('d-none');
                        $("#LineasProduccionContainer")
                            .removeClass("d-none")
                            .hide()
                            .fadeIn(2000);
                    });
                }, 1000);
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

                    selectElement.append('<option value="">Todas las áreas</option>');
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

    static obtenerTipoEquipos() {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: `/${GlobalUtil.URLBaseEquipos}/GetTipoEquipos`,
                type: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                success: function (data) {
                    try {
                        if (data && data.Status === 'OK') {
                            let equiposData = data.Data || [];
                            if (typeof equiposData === 'string') {
                                try {
                                    equiposData = JSON.parse(equiposData);
                                } catch (e) {
                                    console.warn('No se pudo parsear Data:', e);
                                }
                            }
                            const lista = (equiposData || []).map(t => ({ value: t.ID_TIPO_EQUIPO, label: t.DESCRIPCION }));
                            resolve(lista);
                            return;
                        }
                    } catch (ex) {
                        console.warn('obtenerTipoEquipos: error procesando respuesta', ex);
                    }
                    resolve([]);
                },
                error: function () {
                    resolve([]);
                }
            });
        });
    }

    static obtenerAreas(Planta) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: `/${GlobalUtil.URLBaseEquipos}/GetProcesosPorPlanta`,
                type: 'GET',
                data: { "Planta": Planta },
                headers: {
                    'Content-Type': 'application/json'
                },
                success: function (data) {
                    try {
                        if (data && data.Status === 'OK') {
                            let areasData = data.Data || [];
                            if (typeof areasData === 'string') {
                                try {
                                    areasData = JSON.parse(areasData);
                                } catch (e) {
                                    console.warn('No se pudo parsear Data:', e);
                                }
                            }
                            const lista = (areasData || []).map(a => ({ value: a.ID_AREA, label: a.AREA }));
                            resolve(lista);
                            return;
                        }
                    } catch (ex) {
                        console.warn('obtenerAreas: error procesando respuesta', ex);
                    }
                    resolve([]);
                },
                error: function () {
                    resolve([]);
                }
            });
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

        // Mapeo de tipos de usuario a etiquetas legibles
        const mapeoPerfiles = {
            'TecnicoMtto': 'Técnico Mantenimiento',
            'SupervisorMantenimiento': 'Supervisor Mantenimiento',
            'SupervisorAlmacen': 'Supervisor Almacén',
            'Almacen': 'Almacén',
            'SupervisorPlaneacion': 'Supervisor Planeación',
            'Planeacion': 'Planeación',
            'SupervisorProduccion': 'Supervisor Producción',
            'Produccion': 'Producción'
        };
        // Mapeo de plantas
        const mapeoPlantas = {
            '1': 'P1',
            '2': 'P2'
        };

        // Obtener el perfil legible
        const tipoUsuario = datos_usuario[0].TIPOUSUARIO;
        const planta = datos_usuario[0].PLANTA;
        const perfilLegible = mapeoPerfiles[tipoUsuario] || tipoUsuario;
        const plantaLegible = mapeoPlantas[planta] || planta;

        // Establecer el nombre de usuario con perfil
        $("#UserName").text(`${datos_usuario[0].NOMBRECOMPLETO} (${perfilLegible} ${plantaLegible})`);

        //TECNICO MTTO
        if (tipoUsuario === "TecnicoMtto") {
            $("#GestionEquiposURL").addClass("d-none"); //GESTION EQUIPOS
            $("#CalendarioManttoURL").addClass("d-none"); //CALENDARIO MANTEMINIENTOS COMPLETADOS
            $("#AlmacenURL").addClass("d-none"); //ALMACEN
            $("#PlaneacionURL").addClass("d-none"); //PLANEACION
            $("#ProduccionURL").addClass("d-none"); //PRODUCCION
            $("#MetricasURL").addClass("d-none"); //METRICAS
            $("#MCProgramarURL").addClass("d-none");
        }
        //SUPERVISOR MANTENIMIENTO
        if (tipoUsuario === "SupervisorMantenimiento") {
            $("#GestionEquiposURL").addClass("d-none"); //GESTION EQUIPOS
            $("#AlmacenURL").addClass("d-none"); //ALMACEN
            $("#PlaneacionURL").addClass("d-none"); //PLANEACION
            $("#ProduccionURL").addClass("d-none"); //PRODUCCION
        }

        //ALMACEN
        if (tipoUsuario === "SupervisorAlmacen" || tipoUsuario === "Almacen") {
            $("#MantenimientosMainContainer").addClass("d-none"); //MANTENIMIENTOS 
            $("#PlaneacionURL").addClass("d-none"); //PLANEACION
            $("#ProduccionURL").addClass("d-none"); //PRODUCCION
            $("#MetricasURL").addClass("d-none"); //METRICAS
        }

        //PLANEACION
        if (tipoUsuario === "SupervisorPlaneacion" || tipoUsuario === "Planeacion") {
            /*$("#MantenimientosMainContainer").addClass("d-none");*/ //MANTENIMIENTOS
            $("#GestionEquiposURL").addClass("d-none"); //GESTION EQUIPOS
            $("#CalendarioManttoURL").addClass("d-none"); //CALENDARIO MANTENIMIENTO URL
            $("#MCProgramadoURL").addClass("d-none"); //CALENDARIO MANTENIMIENTO URL
            $("#AlmacenURL").addClass("d-none"); //ALMACEN
            $("#ProduccionURL").addClass("d-none"); //PRODUCCION
            $("#MetricasURL").addClass("d-none"); //METRICAS
        }

        //PRODUCCION
        if (tipoUsuario === "SupervisorProduccion" || tipoUsuario === "Produccion") {
            $("#GestionEquiposURL").addClass("d-none"); //GESTION EQUIPOS
            $("#CalendarioManttoURL").addClass("d-none"); //CALENDARIO MANTENIMIENTO URL
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
            //REINICIAR FECHAS
            $("#DiaInicioMant").val('');
            $("#DiaFinMant").val('');
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
        if (this.MultipleArticulo == false) {
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
        const idEquipoPeriodicidad = window.gestionEquiposApp?.mantenimientoManager?.EquipoPeriodicidadSeleccionada || null;

        if (!idEquipo || !planta) return;

        try {
            await window.gestionEquiposApp?.mantenimientoManager?.eliminarImagenRutina(idEquipo, planta, nombreArchivo, idEquipoPeriodicidad);
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

    mostrarGaleriaImagenes(urls,showbutton) {
        if (!urls || urls.length === 0) return;

        this.crearSeccionGaleriaImagenes();

        urls.forEach((url) => {
            const nombreArchivo = url.split('/').pop();
            let buttondel = ``;

            if (showbutton)
                buttondel = `<button type="button" class="btn btn-sm btn-danger btn-eliminar-galeria position-absolute top-0 end-0 m-1" 
                            title="Eliminar" style="border-radius:50%; width:32px; height:32px; padding:0; opacity:0.8;">
                        <i class="bi bi-x" style="font-size:14px;"></i>
                    </button>`;

            const $item = $(`
                <div class="galeria-item mb-3 position-relative" data-url="${url}">
                    <img src="${url}" alt="${nombreArchivo}" class="galeria-img-rutina" 
                         style="width:100%; height:auto; border-radius:8px; cursor:pointer; border:2px solid #dee2e6;">
                    ${buttondel}
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
    cargarImagenesExistentes(urls,showbutton = true) {
        if (!urls || urls.length === 0) return;

        this.mostrarGaleriaImagenes(urls,showbutton);
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
// TIEMPOS MUERTOS
// ========================================

// ========================================
// CLASE BASE PARA GESTIÓN DE PRODUCCIÓN
// Contiene utilidades y flujo de inicialización común
// ========================================
class GestionProduccionBase {
    constructor(datos_usuario, URLBase, articuloTipo = 0) {
        this.URLBase = URLBase;
        this.datos_usuario = datos_usuario;
        this.gridApi = null;
        this.gridColumnApi = null;
        this.datosOriginales = [];
        this.cambiosPendientes = [];
        this.columnDefs = null;
        this.listaLineas = [];
        this.gestionArticulos = new GestionArticulos(this.datos_usuario, articuloTipo);
    }

    // Flujo común de inicialización que las subclases pueden reutilizar
    async inicializarCommon() {
        if (this.cargarLineas) await this.cargarLineas();
        if (this.configurarEventos) this.configurarEventos();
        if (this.cargarDatosIniciales) this.cargarDatosIniciales();
        if (this.inicializarTooltips) this.inicializarTooltips();
        if (this.configurarMenuContextual) this.configurarMenuContextual();
    }

    // Utilidades comunes
    formatearNumero(value) {
        const v = parseFloat(value || 0);
        if (isNaN(v)) return '';
        return v.toLocaleString('es-MX', { maximumFractionDigits: 2 });
    }

    formatearPorcentaje(value) {
        const v = parseFloat(value || 0);
        if (isNaN(v)) return '';
        return v.toLocaleString('es-MX', { maximumFractionDigits: 2 }) + '%';
    }

    // Devuelve configuración base para columnas numéricas editables
    getColumnaNumerica(cellClass = 'celda-blanca') {
        return {
            editable: true,
            cellClass: cellClass,
            valueFormatter: params => {
                if (params.data?.id === 'TOTALES') return '';
                const v = params.value ?? '';
                return this.formatearNumero(v);
            },
            valueParser: params => {
                const v = params.newValue;
                const parsed = parseFloat(String(v).replace(/[,\s]/g, ''));
                return isNaN(parsed) ? 0 : parsed;
            }
        };
    }

    formatearRangoFechas(fechaInicio, fechaFin) {
        if (!fechaInicio && !fechaFin) return 'Rango no especificado';
        if (!fechaInicio) return `Hasta ${new Date(fechaFin).toLocaleDateString('es-MX')}`;
        if (!fechaFin) return `Desde ${new Date(fechaInicio).toLocaleDateString('es-MX')}`;
        return `${new Date(fechaInicio).toLocaleDateString('es-MX')} - ${new Date(fechaFin).toLocaleDateString('es-MX')}`;
    }

    // BASE: crearTotalesTemplate debe ser implementado por la subclase
    crearTotalesTemplate() {
        throw new Error('crearTotalesTemplate() debe implementarse en la subclase');
    }

    // Agrega la fila de totales al grid; utiliza la plantilla que provea la subclase
    agregarFilaTotales() {
        const plantilla = this.crearTotalesTemplate();

        // Inicializar totales con la plantilla
        const totales = Object.assign({}, plantilla);
        totales.id = 'TOTALES';

        // Sumar valores numéricos por cada fila
        this.gridApi.forEachNode((node) => {
            if (node.data?.id === 'TOTALES') return;
            Object.keys(plantilla).forEach(key => {
                if (key === 'id') return;
                const val = parseFloat(node.data[key] || 0);
                if (!isNaN(val)) {
                    totales[key] = (parseFloat(totales[key] || 0) || 0) + val;
                }
            });
        });

        this.gridApi.applyTransaction({ add: [totales] });
    }

    // Recalcula los totales y actualiza la fila TOTALES si existe
    recalcularTotales() {
        const plantilla = this.crearTotalesTemplate();
        const totales = Object.assign({}, plantilla);
        totales.id = 'TOTALES';

        this.gridApi.forEachNode((node) => {
            if (node.data?.id === 'TOTALES') return;
            Object.keys(plantilla).forEach(key => {
                if (key === 'id') return;
                const val = parseFloat(node.data[key] || 0);
                if (!isNaN(val)) {
                    totales[key] = (parseFloat(totales[key] || 0) || 0) + val;
                }
            });
        });

        this.gridApi.forEachNode((node) => {
            if (node.data?.id === 'TOTALES') {
                node.setData(totales);
            }
        });

        this.gridApi.refreshCells({ force: true });
        this.gridApi.redrawRows();
    }

    // Manejo común de edición de celdas
    onCellChanged(event) {
        if (event.data?.id === 'TOTALES') {
            event.api.undoCellEditing();
            return;
        }

        const row = event.data;

        // Mes automático si hay fecha
        if (row.Fecha) {
            const fecha = new Date(row.Fecha);
            const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
            row.Mes = meses[fecha.getMonth()];
        }

        // Delegar cálculo de fila a la subclase (recalcularFila)
        if (this.recalcularFila) this.recalcularFila(row);

        // Auditoría de cambios
        this.cambiosPendientes.push({
            id: row.id,
            campo: event.colDef.field,
            valorAnterior: event.oldValue,
            valorNuevo: event.newValue
        });

        // Refresh visual
        this.gridApi.refreshCells({ force: true });
        this.gridApi.redrawRows();

        // Recalcular totales
        if (this.recalcularTotales) this.recalcularTotales();
    }

}

// ========================================
// EXPORTADOR EXCEL BASE
// ========================================
class ExcelExporterBase {
    constructor(gridApi, columnDefs) {
        this.gridApi = gridApi;
        this.columnDefs = columnDefs;
    }

    // Hooks que las subclases pueden implementar
    getSheetName() { return 'Export'; }
    getFileNamePrefix() { return 'Export'; }
    getTextFields() { return ['Mes', 'Fecha', 'Producto', 'Linea', 'Turno']; }
    // (no header rows by default)

    async exportarConFormato() {
        if (typeof ExcelJS === 'undefined') {
            console.error('❌ ExcelJS no cargado');
            alert('Error: Librería de Excel no disponible');
            return;
        }

        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet(this.getSheetName());

            const estructura = this.analizarEstructuraColumnas();

            this.agregarFilaGrupos(worksheet, estructura);
            this.agregarFilaHeaders(worksheet, estructura);

            if (this.agregarFilasDatos) {
                // si la subclase tiene su propia implementación, se usará
                this.agregarFilasDatos(worksheet, estructura);
            } else {
                this._agregarFilasDatosDefault(worksheet, estructura);
            }

            // Aplicar estilos (subclase puede sobreescribir aplicarEstilos)
            if (this.aplicarEstilos) {
                this.aplicarEstilos(worksheet, estructura);
            } else {
                this._aplicarEstilosDefault(worksheet, estructura);
            }

            // Forzar títulos de encabezado en blanco y normalizar grupo/headers
            this._enforceHeaderWhite(worksheet, estructura);

            // Ajustar anchos: subclase puede sobreescribir ajustarAnchos o getColumnWidth
            if (this.ajustarAnchos) {
                this.ajustarAnchos(worksheet);
            } else {
                this.ajustarAnchosDefault(worksheet);
            }

            // Aplicar estilo a la fila de totales (si existe)
            if (this.applyTotalsRowStyle) this.applyTotalsRowStyle(worksheet, estructura);

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const fecha = new Date().toISOString().split('T')[0];
            const nombreArchivo = `${this.getFileNamePrefix()}_${fecha}.xlsx`;
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = nombreArchivo;
            link.click();
            URL.revokeObjectURL(link.href);

            console.log('✅ Excel exportado correctamente');
            if (typeof AlertManager !== 'undefined') {
                AlertManager.mostrar('Excel exportado correctamente', 'success');
            }

        } catch (error) {
            console.error('Error al exportar:', error);
            alert('Error al exportar Excel: ' + (error && error.message ? error.message : error));
        }
    }

    // ✨ NUEVO MÉTODO: Generar Excel sin descargarlo (para enviar por correo)
    async generarExcelParaEnvio() {
        if (typeof ExcelJS === 'undefined') {
            console.error('❌ ExcelJS no cargado');
            throw new Error('Librería de Excel no disponible');
        }

        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet(this.getSheetName());

            const estructura = this.analizarEstructuraColumnas();

            this.agregarFilaGrupos(worksheet, estructura);
            this.agregarFilaHeaders(worksheet, estructura);

            if (this.agregarFilasDatos) {
                this.agregarFilasDatos(worksheet, estructura);
            } else {
                this._agregarFilasDatosDefault(worksheet, estructura);
            }

            if (this.aplicarEstilos) {
                this.aplicarEstilos(worksheet, estructura);
            } else {
                this._aplicarEstilosDefault(worksheet, estructura);
            }

            this._enforceHeaderWhite(worksheet, estructura);

            if (this.ajustarAnchos) {
                this.ajustarAnchos(worksheet);
            } else {
                this.ajustarAnchosDefault(worksheet);
            }

            if (this.applyTotalsRowStyle) this.applyTotalsRowStyle(worksheet, estructura);

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            return blob; // Devolver el Blob para envío por correo
        } catch (error) {
            console.error('Error al generar Excel:', error);
            throw error;
        }
    }

    _agregarFilasDatosDefault(worksheet, estructura) {
        const textFields = this.getTextFields();
        this.gridApi.forEachNodeAfterFilterAndSort((node) => {
            const fila = [];
            estructura.grupos.forEach(grupo => {
                grupo.children.forEach(col => {
                    let valor = node.data[col.field];
                    if (valor !== null && valor !== undefined && valor !== '' && !textFields.includes(col.field)) {
                        valor = parseFloat(valor);
                    }
                    if (node.data.id === 'TOTALES' && textFields.includes(col.field)) {
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

    _aplicarEstilosDefault(worksheet, estructura) {
        // Simple styling para encabezados y grupos
        const filaGrupos = worksheet.getRow(1);
        filaGrupos.height = 30;
        estructura.grupos.forEach(grupo => {
            if (grupo.nombre) {
                const celda = filaGrupos.getCell(grupo.inicio);
                const color = this.getGroupColor(grupo.nombre);
                celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + color } };
                celda.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
                celda.alignment = { vertical: 'middle', horizontal: 'center' };
                celda.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
            }
        });
        const filaHeaders = worksheet.getRow(2);
        filaHeaders.height = 40;
        for (let col = 1; col <= estructura.totalColumnas; col++) {
            const celda = filaHeaders.getCell(col);
            celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0058A1' } };
            celda.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
            celda.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            celda.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        }
    }

    // Hook: obtener color para un grupo por nombre (ARGB sin prefijo FF)
    getGroupColor(grupoNombre) {
        // valores por defecto similares a implementaciones anteriores
        switch ((grupoNombre || '').toString().toUpperCase()) {
            case 'TIEMPO NO DISPONIBLE': return 'FF69B4';
            case 'TIEMPO NO PRODUCTIVO': return '90EE90';
            case 'PRODUCCIÓN': return 'F1C232';
            case 'DISPONIBILIDAD': return '9FC5E8';
            case 'KPIs': return '6AA84F';
            case 'DATOS GENERALES': return 'B4A7D6';
            default: return '0058A1';
        }
    }

    // Forzar que todos los títulos de encabezado (grupos + headers) tengan texto blanco
    _enforceHeaderWhite(worksheet, estructura) {
        // Grupos (fila 1)
        const filaGrupos = worksheet.getRow(1);
        estructura.grupos.forEach(grupo => {
            if (grupo.nombre) {
                const celda = filaGrupos.getCell(grupo.inicio);
                if (!celda.font) celda.font = {};
                celda.font.color = { argb: 'FFFFFFFF' };
            }
        });
        // Headers (fila 2)
        const filaHeaders = worksheet.getRow(2);
        for (let col = 1; col <= estructura.totalColumnas; col++) {
            const celda = filaHeaders.getCell(col);
            if (!celda.font) celda.font = {};
            celda.font.color = { argb: 'FFFFFFFF' };
        }
    }

    // Ajuste de anchos por defecto, se puede overridear en subclases
    ajustarAnchosDefault(worksheet) {
        let colIdx = 0;
        this.columnDefs.forEach(grupo => {
            if (grupo.children) {
                grupo.children.forEach(col => {
                    colIdx++;
                    const ancho = this.getColumnWidth(col) || 15;
                    worksheet.getColumn(colIdx).width = ancho;
                });
            }
        });
    }

    // Hook para obtener ancho por columna (puede ser sobreescrito por subclase)
    getColumnWidth(col) {
        if (!col || !col.field) return 15;
        if (col.field === 'Fecha') return 12;
        if (col.field === 'Mes') return 12;
        if (col.field === 'HorasProgramadas') return 22;
        if (col.field === 'Planta') return 10;
        if (col.field === 'Linea' || col.field === 'Turno' || col.field === 'Grupo') return 8;
        if (col.field === 'Corrugador') return 14;
        if (col.field === 'Producto') return 18;
        if (col.headerName && col.headerName.length > 20) return 20;
        return 15;
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

