$(document).ready(function () {

    $("#MCContainer").removeClass("collapsed").attr("aria-expanded", true);
    $("#manntocorrectivo-collapse").addClass("show");
    $("#PROGMCURL").addClass("selected");
    $("#PROGMCURL a").addClass("whiteText");


    // Seleccionar el padre "MantenimientosContainer" y expandir
    $("#MantenimientosContainer").addClass("selected");
    $("#MantenimientosContainer a").addClass("whiteText");
    $("#mantenimientos-collapse").addClass("show");
    // Inicializar tooltips si se necesitan
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Función para mostrar alertas de Bootstrap
    function mostrarAlert(mensaje, tipo = 'success') {
        const alertContainer = $('#alertContainer');
        const alertId = 'alert-' + Date.now();

        const alertHtml = `
            <div id="${alertId}" class="alert alert-${tipo} alert-dismissible fade show" role="alert">
                ${mensaje}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        alertContainer.append(alertHtml);

        setTimeout(() => {
            $(`#${alertId}`).alert('close');
        }, 4000);
    }

    // Solicitar refacción - Abrir modal
    $(document).on('click', '.btn-solicitar-refaccion', function () {
        const ot = $(this).data('ot');
        const equipo = $(this).data('equipo');
        const linea = $(this).data('linea');
        const fecha = $(this).data('fecha');

        // Llenar el modal con los datos
        $('#modalOT').val(ot);
        $('#modalEquipo').val(equipo);
        $('#modalLinea').val(linea);
        $('#modalFechaMantenimiento').val(fecha);

        // Limpiar el formulario de refacción
        $('#refaccionSolicitada').val('');
        $('#cantidadRefaccion').val('');
        $('#urgenciaRefaccion').val('');
        $('#descripcionNecesidad').val('');

        $('#solicitarRefaccionModal').modal('show');
    });
    // Enviar solicitud de refacción
    $('#btnEnviarSolicitud').on('click', function () {
        const ot = $('#modalOT').val();
        const equipo = $('#modalEquipo').val();
        const refaccion = $('#refaccionSolicitada').val();
        const cantidad = $('#cantidadRefaccion').val();
        const urgencia = $('#urgenciaRefaccion').val();
        const descripcion = $('#descripcionNecesidad').val();

        if (!refaccion || !cantidad || !urgencia) {
            mostrarAlert('Por favor, complete todos los campos obligatorios', 'warning');
            return;
        }

        if (ot === '--') {
            mostrarAlert('No se puede solicitar refacción sin una Orden de Trabajo', 'warning');
            return;
        }

        // Aquí iría la lógica para guardar en base de datos
        // Por ahora mostramos un mensaje de éxito
        mostrarAlert(`Solicitud de refacción enviada para ${ot} - ${equipo}`, 'success');

        // Cerrar el modal
        $('#solicitarRefaccionModal').modal('hide');

        // Actualizar estatus a "En espera de refacción"
        if (ot !== '--') {
            const fila = $(`button[data-ot="${ot}"]`).closest('tr');
            fila.find('.badge')
                .removeClass('bg-info bg-success bg-secondary')
                .addClass('bg-warning')
                .text('En espera de refacción');

            // 🔹 Eliminar botón de solicitar refacción
            fila.find('.btn-solicitar-refaccion').remove();
        }
    });
    // Seleccionar todos los checkboxes
    $('#selectAll').on('change', function () {
        $('.row-checkbox').prop('checked', $(this).prop('checked'));
    });
    $(document).on('click', '.btn-editar-estatus', function () {
        const fila = $(this).closest('tr');

        const ot = $(this).data('ot');
        const equipo = fila.find('td:eq(2)').text().trim(); // columna Equipo
        const linea = fila.find('td:eq(3)').text().trim(); // columna Línea
        const estatusActual = fila.find('.badge').text().trim(); // badge actual

        // Guardar la fila en un data para usarla al guardar
        $('#editarEstatusModal').data('fila', fila);

        // Llenar modal
        $('#modalOTEditar').val(ot);
        $('#modalEquipoEditar').val(equipo);
        $('#modalLineaEditar').val(linea);
        $('#estatusEditar').val(estatusActual);

        // Abrir modal
        $('#editarEstatusModal').modal('show');
    });
    // Guardar nuevo estatus
    $('#btnGuardarEstatus').on('click', function () {
        const fila = $('#editarEstatusModal').data('fila');
        const nuevoEstatus = $('#estatusEditar').val();

        // Actualizar badge
        let claseBadge = 'bg-info';
        switch (nuevoEstatus) {
            case 'En espera de refacción':
                claseBadge = 'bg-warning'; break;
            case 'Liberado por mantenimiento':
                claseBadge = 'bg-success'; break;
            case 'Cerrado':
                claseBadge = 'bg-secondary'; break;
            case 'Nueva':
                claseBadge = 'bg-info'; break;
        }

        fila.find('.badge')
            .removeClass('bg-info bg-warning bg-success bg-secondary')
            .addClass(claseBadge)
            .text(nuevoEstatus);

        // Ocultar o mostrar botones según estatus
        const btnRefaccion = fila.find('.btn-solicitar-refaccion');
        const btnEditar = fila.find('.btn-editar-estatus');

        if (nuevoEstatus === 'Liberado por mantenimiento' || nuevoEstatus === 'Cerrado') {
            btnRefaccion.hide();
            btnEditar.hide();
        } else {
            btnRefaccion.show();
            btnEditar.show();
        }

        // Cerrar modal
        $('#editarEstatusModal').modal('hide');

        // Mostrar alerta
        mostrarAlert(`Estatus de OT ${fila.find('td:eq(1)').text().trim()} actualizado a "${nuevoEstatus}"`, 'success');
    });

    // Submit del formulario
    $('#formCorrectivo').on('submit', function (e) {
        e.preventDefault();

        // Obtener valores
        const equipo = $('#equipoCorrectivo').val();
        const linea = $('#lineaCorrectivo').val();
        const fecha = $('#fechaCorrectivo').val();
        const prioridad = $('#prioridadCorrectivo').val();
        const descripcion = $('#descripcionFalla').val();
        const tecnico = $('#tecnicoCorrectivo').val();

        // Validación
        if (!equipo || !linea || !fecha || !prioridad || !descripcion || !tecnico) {
            mostrarAlert('Por favor, complete todos los campos obligatorios (*)', 'warning');
            return;
        }

        // Aquí se enviaría la información a la base de datos

        // Mensaje de confirmación
        mostrarAlert(`Mantenimiento correctivo programado para ${equipo} en ${linea} asignado a ${tecnico}`, 'success');

        // Limpiar formulario
        $(this)[0].reset();
    });

});
