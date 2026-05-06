$(document).ready(function () {

    $("#MCContainer").removeClass("collapsed").attr("aria-expanded", true);
    $("#manntocorrectivo-collapse").addClass("show");
    $("#MCProgramadoURL").addClass("selected");
    $("#MCProgramadoURL a").addClass("whiteText");


    // Seleccionar el padre "MantenimientosContainer" y expandir
    $("#MantenimientosContainer").addClass("selected");
    $("#MantenimientosContainer a").addClass("whiteText");
    $("#mantenimientos-collapse").addClass("show");


    // Función para formatear fecha en formato dd MMM yyyy
    function formatearFecha(fecha) {
        const opciones = { day: '2-digit', month: 'short', year: 'numeric' };
        return new Date(fecha).toLocaleDateString('es-ES', opciones);
    }
    // Función para obtener la clase del badge según el estatus
    function obtenerClaseBadge(estatus) {
        switch (estatus) {
            case 'En espera de refacción':
                return 'bg-warning';
            case 'Liberado por mantenimiento':
                return 'bg-success';
            case 'Cerrado':
                return 'bg-secondary';
            default:
                return 'bg-info';
        }
    }
    // Abrir modal para agregar mantenimiento
    $('#btnAgregarMantenimiento').on('click', function (e) {
        e.preventDefault();
        $('#agregarMantenimientoModal').modal('show');
    });
    // Guardar nuevo mantenimiento
    $('#btnGuardarMantenimiento').on('click', function () {
        // Validar formulario
        var equipo = $('#equipoSelect').val();
        var linea = $('#lineaSelect').val();
        var fecha = $('#fechaMantenimiento').val();
        var estatus = $('#estatusSelect').val();
        var ordenTrabajo = $('#ordenTrabajo').val();

        if (!equipo || !linea || !fecha || !estatus) {
            alert('Por favor, complete todos los campos obligatorios');
            return;
        }

        // Formatear fecha
        var fechaFormateada = formatearFecha(fecha);
        var claseBadge = obtenerClaseBadge(estatus);

        // Crear nueva fila
        var nuevaFila = `
                    <tr>
                        <td>${equipo}</td>
                        <td>${linea}</td>
                        <td>${fechaFormateada}</td>
                        <td><span class="badge ${claseBadge}">${estatus}</span></td>
                        <td>${ordenTrabajo || ''}</td>
                        <td>
                            <button class="btn btn-sm btn-info">Detalles</button>
                        </td>
                    </tr>
                `;

        // Agregar nueva fila a la tabla
        $('#tablaMantenimientos tbody').append(nuevaFila);

        // Cerrar modal y limpiar formulario
        $('#agregarMantenimientoModal').modal('hide');
        $('#formMantenimiento')[0].reset();

        // Mensaje de confirmación
        alert('Mantenimiento preventivo programado correctamente');
    });
    // Botón filtrar (puedes implementar la funcionalidad)
    $('#btnFiltrar').on('click', function () {
        alert('Funcionalidad de filtro será implementada próximamente');
    });
    // Función para mostrar alerts de Bootstrap
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

        // Auto-cerrar después de 4 segundos
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

    // Inicializar tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Opcional: actualizar tooltips dinámicamente si agregas filas
    function refreshTooltips() {
        tooltipList.forEach(t => t.dispose()); // destruir tooltips existentes
        tooltipList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]')).map(function (el) {
            return new bootstrap.Tooltip(el);
        });
    }

    // Botón Descargar CheckList con alerta y deselección de checkboxes
    $('#btnDescargarCheckList').on('click', function () {
        const checkboxes = $('#tablaMantenimientos .row-checkbox:checked');
        if (checkboxes.length === 0) {
            mostrarAlert('Debe seleccionar al menos una fila para descargar el CheckList.', 'warning');
        } else {
            // Lógica real de descarga si deseas
            mostrarAlert('CheckList descargado correctamente.', 'success');

            // Deseleccionar todos los checkboxes
            checkboxes.prop('checked', false);
            $('#selectAll').prop('checked', false); // también desmarca el "select all"
        }
    });

    // Abrir modal Caratula Online
    $(document).on('click', '.btn-caratula-online', function () {
        const id = $(this).data('id');
        const fila = $(`tr[data-id="${id}"]`);

        $('#rutinaEquipoId').val(id);
        $('#rutinaNombreEquipo').text(fila.find('td:eq(1)').text());
        $('#rutinaProceso').text(fila.find('td:eq(7)').text());
        $('#modalOrdenMantenimiento').modal('show');
    });

});