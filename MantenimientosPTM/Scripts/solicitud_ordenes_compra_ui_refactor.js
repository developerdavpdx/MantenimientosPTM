// Módulo ligero para manejar el modal de "Solicitud de Compra" reutilizable
// Requiere que exista en el DOM el partial _ModalSolicitudCompra (id #solicitudCompra)

(function (global, $) {
    const URLBase = 'Almacen';
    let currentSource = null; // puede ser 'stock' u otros

    function _configurarEventosSeleccion() {
        // Select all
        $('#chkSelectAllSC').prop('checked', true);
        $('#chkSelectAllSC').off('change').on('change', () => {
            const checked = $('#chkSelectAllSC').prop('checked');
            $('.chk-solicitud-sc').prop('checked', checked);
            $('.cant-encargar').prop('disabled', !checked);
        });

        // Individual change
        $(document).off('change', '.chk-solicitud-sc').on('change', '.chk-solicitud-sc', () => {
            const total = $('.chk-solicitud-sc').length;
            const seleccionados = $('.chk-solicitud-sc:checked').length;

            $('#chkSelectAllSC').prop('checked', total === seleccionados);
            $('#chkSelectAllSC').prop('indeterminate', seleccionados > 0 && seleccionados < total);

            $('.chk-solicitud-sc').each(function () {
                const $input = $(this).closest('tr').find('.cant-encargar');
                $input.prop('disabled', !$(this).prop('checked'));
            });
        });

        // Inicial: deshabilitar inputs no seleccionados
        $('.chk-solicitud-sc').each(function () {
            if (!$(this).prop('checked')) {
                $(this).closest('tr').find('.cant-encargar').prop('disabled', true);
            }
        });
    }

    async function enviarSolicitudCompra(e) {
        if (e && e.preventDefault) e.preventDefault();

        // En modo stock se toman todas las filas; en otros casos solo las seleccionadas
        const checkedRows = currentSource === 'stock'
            ? $('.chk-solicitud-sc') // todas las filas (ocultas/deshabilitadas pero presentes)
            : $('.chk-solicitud-sc:checked');

        if (checkedRows.length === 0) {
            AlertManager.mostrar('Debes seleccionar al menos un artículo para continuar.', 'warning', 'alertSolicitudCompraContainer');
            return false;
        }

        // Validar cantidades
        let cantidadesValidas = true;
        checkedRows.each(function () {
            const $input = $(this).closest('tr').find('.cant-encargar');
            let valor = parseInt($input.val()) || 0;
            // Normalizar negativos a positivos
            if (valor < 0) {
                valor = Math.abs(valor);
                $input.val(valor);
            }
            if (!valor || valor < 1) {
                $input.addClass('is-invalid');
                cantidadesValidas = false;
            } else {
                $input.removeClass('is-invalid');
            }
        });

        if (!cantidadesValidas) {
            AlertManager.mostrar('Por favor, capture la cantidad a encargar en todas las filas seleccionadas.', 'warning', 'alertSolicitudCompraContainer');
            return false;
        }

        // Validar comentario
        const comentario = $('#ComentariosSC').val().trim();
        if (!comentario) {
            AlertManager.mostrar('Por favor, ingresa un comentario.', 'warning', 'alertSolicitudCompraContainer');
            return false;
        }

        // Construir lineas
        const lineas = [];
        checkedRows.each(function () {
            const $row = $(this).closest('tr');
            const $input = $row.find('.cant-encargar');
            let cantidad = parseInt($input.val()) || 0;
            if (cantidad < 0) cantidad = Math.abs(cantidad);
            // Asegurar que el input muestre número positivo
            $input.val(cantidad);
            lineas.push({
                IdSolicitud: $input.data('idsolicitud') || 0,
                CantidadEncargar: cantidad
            });
        });

        // Obtener usuario/planta (intenta usar AppReporteStock o GlobalUtil)
        let usuario = null;
        let planta = null;
        if (window.AppReporteStock && window.AppReporteStock.datos_usuario && window.AppReporteStock.datos_usuario[0]) {
            usuario = window.AppReporteStock.datos_usuario[0].EMAIL;
            planta = window.AppReporteStock.datos_usuario[0].PLANTA;
        } else {
            const du = (typeof GlobalUtil !== 'undefined' && GlobalUtil.getDatosUsuario) ? GlobalUtil.getDatosUsuario() : null;
            if (du && du[0]) {
                usuario = du[0].EMAIL;
                planta = du[0].PLANTA;
            }
        }

        const datos = {
            Solicitudes: lineas,
            Comentarios: comentario,
            UsuarioSolicita: usuario || '',
            Planta: planta || ''
        };

        const $btn = $("#btnGuardarSC");
        $btn.html('<span class="spinner-border spinner-border-sm me-2"></span>Guardando...');
        $btn.prop("disabled", true);

        try {
            const response = await $.ajax({
                url: `/${URLBase}/InsertarSolicitudOrdenCompraMP`,
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                data: JSON.stringify(datos),
                dataType: 'json'
            });

            if (response.Status === 'SI' || response.Status === 'OK') {
                AlertManager.mostrar(response.Message || 'Solicitud de compra generada correctamente.', 'success', 'alertSolicitudCompraContainer');
                _limpiarYRecargarDespues(response, $btn);
            } else if (response.Status === 'PARCIAL' || response.Status === 'PARTIAL') {
                AlertManager.mostrar(response.Message || 'Solicitud procesada parcialmente. Algunos artículos no pudieron ser procesados.', 'warning', 'alertSolicitudCompraContainer');
                _limpiarYRecargarDespues(response, $btn);
            } else {
                AlertManager.mostrar(response.Message || 'Error al realizar la solicitud de compra', 'warning', 'alertSolicitudCompraContainer');
                $btn.html('<i class="bi bi-floppy-fill me-1"></i> Guardar');
                $btn.prop("disabled", false);
            }
        } catch (err) {
            console.error('Error en solicitud_compra_ui.enviarSolicitudCompra:', err);
            AlertManager.mostrar('Error al conectar con el servidor', 'warning', 'alertSolicitudCompraContainer');
            $btn.html('<i class="bi bi-floppy-fill me-1"></i> Guardar');
            $btn.prop("disabled", false);
        }

        return false;
    }

    function _limpiarYRecargarDespues(response, $btn) {
        $btn.prop("disabled", false);
        $("#formSolicitudCompra")[0].reset();
        $("#formSolicitudCompra").removeClass("was-validated");
        $btn.html('<i class="bi bi-check-circle-fill me-2 text-white"></i>Guardado');

        // Limpiar checkboxes en tabla origen si aplica
        $('#tablaSolicitudesRefacciones tbody .chk-solicitud').prop('checked', false);
        $('#chkSelectAll').prop('checked', false).prop('indeterminate', false);

        // Si la vista que abrió el modal tiene DataTable, recargarla
        if ($.fn.DataTable.isDataTable('#tablaSolicitudesRefacciones')) {
            $('#tablaSolicitudesRefacciones').DataTable().ajax.reload(null, false);
        }
        if ($.fn.DataTable.isDataTable('#tablaReporteStock')) {
            $('#tablaReporteStock').DataTable().ajax.reload(null, false);
        }

        setTimeout(() => {
            $btn.html('<i class="bi bi-floppy-fill me-1"></i> Guardar');
            $("#solicitudCompra").modal('hide');
        }, 1200);
    }

    /**
     * abrirModal(solicitudes, options)
     * solicitudes: array de objetos (estructura flexible)
     * options: { source: 'stock'|'solicitudes'|... }
     */
    function abrirModal(solicitudes = [], options = {}) {
        currentSource = options?.source || null;

        // Rellena el modal #solicitudCompra con la misma estructura esperada por la app de SolicitudRefacciones
        const tbody = $('#bodySeleccionadas');
        tbody.empty();

        if (!solicitudes || solicitudes.length === 0) {
            tbody.html(`<tr><td colspan="6" class="text-center">No hay artículos seleccionados</td></tr>`);
            $('#modalSolicitudCompraTitulo').text('Generar Solicitud de Compra');
            $('.modal-subtitle-custom').text('0 artículo(s)');
            return;
        }

        $('#modalSolicitudCompraTitulo').text('Generar Solicitud de Compra');
        $('.modal-subtitle-custom').html(`<i class="bi bi-list-check me-1"></i> <strong>${solicitudes.length}</strong> artículo(s)`);

        solicitudes.forEach((s, index) => {
            const idSolicitud = s.IdSolicitud ?? s.idSolicitud ?? 0;
            const ordenTrabajo = s.OrdenTrabajo ?? s.ordenTrabajo ?? '';
            const codigoRefaccion = s.CodigoArticulo ?? s.codigoRefaccion ?? s.codigo ?? '';
            const nombreArticulo = s.NombreArticulo ?? s.refaccion ?? s.articulo ?? '';
            const cantidadReq = s.Cantidad ?? s.cantidad ?? s.Solicitar ?? 1;
            const stock = s.Stock ?? s.stock ?? 0;
            const minStock = s.Min ?? s.minStock ?? 0;
            const maxStock = s.Max ?? s.maxStock ?? 0;

            // normalizar cantidad a valor absoluto (si viene negativa)
            const cantidadPositiva = Math.abs(Number(cantidadReq)) || 1;

            // Añadimos clase col-ot en la celda de OT para permitir ocultarla si viene de stock
            tbody.append(`
            <tr>
                <td class="cell-select text-center">
                    <input type="checkbox" class="form-check-input chk-solicitud-sc" checked>
                </td>
                <td class="text-center col-ot">
                    <span class="badge bg-blue-ptm badge-custom"><i class="bi bi-file-earmark-text me-1"></i>${ordenTrabajo || 'N/A'}</span>
                </td>
                <td class="text-center">
                    <small class="text-muted fw-s"><i class="bi bi-upc-scan me-1"></i>${codigoRefaccion || 'N/A'}</small>
                </td>
                <td><i class="bi bi-box-seam text-muted me-1"></i>${nombreArticulo || 'N/A'}</td>
                <td class="text-end fw-semibold"><i class="bi bi-box-seam text-info me-1"></i>${Number(stock).toLocaleString('es-MX')}</td>
                <td class="text-end fw-semibold"><i class="bi bi-arrow-down-circle text-warning me-1"></i>${Number(minStock).toLocaleString('es-MX')}</td>
                <td class="text-end fw-semibold"><i class="bi bi-arrow-up-circle text-success me-1"></i>${Number(maxStock).toLocaleString('es-MX')}</td>
                <td class="text-center fw-semibold"><span class="badge bg-blue-ptm badge-custom">${cantidadPositiva}</span></td>
                <td class="text-center">
                    <input type="number"
                        class="form-control form-control-sm cant-encargar text-center"
                        min="1"
                        max="${cantidadPositiva}"
                        value="${cantidadPositiva}"
                        data-idsolicitud="${idSolicitud}"
                        data-ordentrabajo="${ordenTrabajo}"
                        data-codigorefaccion="${codigoRefaccion}"
                        data-refaccion="${nombreArticulo}"
                        data-cantidad="${cantidadPositiva}"
                        data-index="${index}"
                        required>
                </td>
            </tr>
        `);
        });

        // Normalizar entrada en los inputs: convertir negativos a positivos al tipear
        $(document).off('input', '.cant-encargar').on('input', '.cant-encargar', function () {
            const $el = $(this);
            let v = $el.val();
            if (v === '' || v === null) return;
            // eliminar caracteres no numéricos salvo signo negativo
            // parsear entero
            let num = parseInt(v.toString().replace(/[^0-9-]/g, '')) || 0;
            if (num < 0) {
                num = Math.abs(num);
                $el.val(num);
            }
        });

        // Si venimos desde ReporteStock: ocultar OT y ocultar columna de selección (todos se envían)
        if (currentSource === 'stock') {
            // ocultar cabecera OT (segunda columna) y cabecera de selección (primera columna)
            $('#tablaSolicitudesSeleccionadas thead th').eq(1).hide();
            $('#tablaSolicitudesSeleccionadas thead th').eq(0).hide();

            // para cada fila: ocultar celda OT y ocultar celda de selección; asegurar checkbox marcado y deshabilitado
            $('#bodySeleccionadas tr').each(function () {
                $(this).find('td.col-ot').hide();
                $(this).find('td.cell-select').hide();
                const $chk = $(this).find('.chk-solicitud-sc');
                $chk.prop('checked', true).prop('disabled', true);
            });
        } else {
            // asegurar que cabeceras estén visibles (por si se reutiliza el modal)
            $('#tablaSolicitudesSeleccionadas thead th').eq(1).show();
            $('#tablaSolicitudesSeleccionadas thead th').eq(0).show();

            // mostrar celdas de selección y OT y permitir selección
            $('#bodySeleccionadas tr').each(function () {
                $(this).find('td.col-ot').show();
                $(this).find('td.cell-select').show();
                $(this).find('.chk-solicitud-sc').prop('disabled', false);
            });
        }

        // Inicializar eventos y bind submit
        _configurarEventosSeleccion();

        // Bind del submit del form
        $('#formSolicitudCompra').off('submit.solicitud_compra_ui').on('submit.solicitud_compra_ui', enviarSolicitudCompra);

        $('#ComentariosSC').val('');
        $('#formSolicitudCompra').removeClass('was-validated');
        $('#alertSolicitudCompraContainer').empty();

        $('#solicitudCompra').modal('show');
    }

    // Exportar API
    global.SolicitudCompraUI = {
        abrirModal: abrirModal
    };

})(window, jQuery);