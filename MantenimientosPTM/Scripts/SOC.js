$(document).ready(function () {
    $("#SolicitudOrdenesCompraURL").addClass("selected");
    $("#SolicitudOrdenesCompraURL a").addClass("whiteText");

    // Seleccionar el padre "MantenimientosContainer" y expandir
    $("#AlmacenContainer").addClass("selected");
    $("#AlmacenContainer a").addClass("whiteText");
    $("#almacen-collapse").addClass("show");
    let solicitudIdCounter = 6; // Empezar desde 6 porque ya tenemos 5 solicitudes de ejemplo

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

    // Mapeo de OTs a equipos
    const otEquipos = {
        'OT-005': 'ENS-100',
        'OT-008': 'MEZ-850',
        'OT-012': 'HORNO-7G',
        'OT-018': 'ML-2200',
        'OT-022': 'CNC-789-XF',
        'OT-025': 'ROB-6AX',
        'OT-028': 'EMP-345'
    };

    // Abrir modal para nueva solicitud
    $('#btnNuevaSolicitud').on('click', function () {
        $('#modalSolicitudTitulo').text('Nueva Solicitud de Refacción');
        $('#formSolicitudRefaccion')[0].reset();
        $('#solicitudId').val('');

        // Habilitar todos los campos para nueva solicitud
        $('#solicitudOT').prop('disabled', false);
        $('#refaccionNombre').prop('disabled', false);
        $('#refaccionCantidad').prop('disabled', false);
        $('#refaccionUrgencia').prop('disabled', false);
        $('#refaccionDescripcion').prop('disabled', false);
        $('#refaccionComentarios').prop('disabled', false);

        $('#solicitudRefaccionModal').modal('show');
    });

    // Editar solicitud - Solo permitir cambiar el estatus
    $(document).on('click', '.btn-editar-solicitud', function () {
        const id = $(this).data('id');
        const fila = $(`#tablaSolicitudesRefacciones tr:has(button[data-id="${id}"])`);

        $('#modalSolicitudTitulo').text('Actualizar Estatus de Solicitud');
        $('#solicitudId').val(id);

        // Llenar el formulario con los datos de la fila (solo lectura)
        $('#solicitudOT').val(fila.find('td:eq(1)').text());
        $('#solicitudEquipo').val(fila.find('td:eq(2)').text());
        $('#refaccionNombre').val(fila.find('td:eq(3)').text());
        $('#refaccionCantidad').val(fila.find('td:eq(4)').text());

        // Obtener urgencia del badge
        const urgenciaText = fila.find('td:eq(5) .badge').text();
        $('#refaccionUrgencia').val(urgenciaText);

        // Obtener estatus del badge
        const estatusText = fila.find('td:eq(8) .badge').text();
        $('#refaccionEstatus').val(estatusText);

        // Deshabilitar todos los campos excepto el estatus
        $('#solicitudOT').prop('disabled', true);
        $('#solicitudEquipo').prop('disabled', true);
        $('#refaccionNombre').prop('disabled', true);
        $('#refaccionCantidad').prop('disabled', true);
        $('#refaccionUrgencia').prop('disabled', true);
        $('#refaccionDescripcion').prop('disabled', true);
        $('#refaccionComentarios').prop('disabled', true);
        $('#refaccionEstatus').prop('disabled', false); // Solo el estatus se puede editar

        $('#solicitudRefaccionModal').modal('show');
    });

    // Deshabilitar eliminación de solicitudes - Mostrar mensaje
    $(document).on('click', '.btn-eliminar-solicitud', function () {
        const id = $(this).data('id');
        const fila = $(`#tablaSolicitudesRefacciones tr:has(button[data-id="${id}"])`);
        const solicitudNum = fila.find('td:eq(0)').text();

        mostrarAlert(`La solicitud ${solicitudNum} no puede ser eliminada. Solo puede actualizar el estatus.`, 'info');
    });

    // Guardar solicitud
    $('#btnGuardarSolicitud').on('click', function () {
        const ot = $('#solicitudOT').val();
        const equipo = $('#solicitudEquipo').val();
        const refaccion = $('#refaccionNombre').val();
        const cantidad = $('#refaccionCantidad').val();
        const urgencia = $('#refaccionUrgencia').val();
        const estatus = $('#refaccionEstatus').val();

        if (!ot || !equipo || !refaccion || !cantidad || !urgencia || !estatus) {
            mostrarAlert('Por favor, complete todos los campos obligatorios', 'warning');
            return;
        }

        const id = $('#solicitudId').val();
        const fechaActual = new Date().toLocaleDateString('es-ES');
        const solicitante = "Técnico Actual"; // En un sistema real, esto vendría del usuario logueado

        if (id) {
            // Editar solicitud existente - Solo actualizar estatus
            const fila = $(`#tablaSolicitudesRefacciones tr:has(button[data-id="${id}"])`);

            // Solo actualizamos el estatus
            fila.find('td:eq(8)').html(`<span class="badge bg-${getEstatusBadgeColor(estatus)}">${estatus}</span>`);

            mostrarAlert('Estatus de solicitud actualizado correctamente', 'success');
        } else {
            // Nueva solicitud
            const nuevoId = solicitudIdCounter++;
            const numeroSolicitud = 'SOL-' + nuevoId.toString().padStart(3, '0');

            const nuevaFila = `
                        <tr>
                            <td>${numeroSolicitud}</td>
                            <td>${ot}</td>
                            <td>${equipo}</td>
                            <td>${refaccion}</td>
                            <td>${cantidad}</td>
                            <td><span class="badge bg-${getUrgenciaBadgeColor(urgencia)}">${urgencia}</span></td>
                            <td>${fechaActual}</td>
                            <td>${solicitante}</td>
                            <td><span class="badge bg-${getEstatusBadgeColor(estatus)}">${estatus}</span></td>
                            <td>
                                <button class="btn btn-sm btn-primary btn-editar-solicitud" data-id="${nuevoId}">
                                    Actualizar
                                </button>
                            </td>
                        </tr>
                    `;

            $('#tablaSolicitudesRefacciones tbody').append(nuevaFila);
            mostrarAlert('Solicitud de refacción creada correctamente', 'success');
        }

        $('#solicitudRefaccionModal').modal('hide');
        $('#formSolicitudRefaccion')[0].reset();
    });

    // Funciones auxiliares para colores de badges
    function getUrgenciaBadgeColor(urgencia) {
        switch (urgencia) {
            case 'Normal': return 'primary';
            case 'Urgente': return 'warning';
            case 'Crítico': return 'warning';
            default: return 'secondary';
        }
    }

    function getEstatusBadgeColor(estatus) {
        switch (estatus) {
            case 'Pendiente': return 'info';
            case 'Autorizado': return 'success';
            case 'Rechazado': return 'warning';
            case 'En tránsito': return 'warning';
            case 'Entregado': return 'success';
            default: return 'secondary';
        }
    }

    // Filtros
    $('#filtroOT, #filtroEstatus, #filtroUrgencia').on('change', aplicarFiltros);

    $('#btnLimpiarFiltros').on('click', function () {
        $('#filtroOT, #filtroEstatus, #filtroUrgencia').val('');
        aplicarFiltros();
    });

    function aplicarFiltros() {
        const filtroOT = $('#filtroOT').val().toLowerCase();
        const filtroEstatus = $('#filtroEstatus').val().toLowerCase();
        const filtroUrgencia = $('#filtroUrgencia').val().toLowerCase();

        $('#tablaSolicitudesRefacciones tbody tr').each(function () {
            const ot = $(this).find('td:eq(1)').text().toLowerCase();
            const estatus = $(this).find('td:eq(8)').text().toLowerCase();
            const urgencia = $(this).find('td:eq(5)').text().toLowerCase();

            const mostrar =
                (filtroOT === '' || ot.includes(filtroOT)) &&
                (filtroEstatus === '' || estatus.includes(filtroEstatus)) &&
                (filtroUrgencia === '' || urgencia.includes(filtroUrgencia));

            $(this).toggle(mostrar);
        });
    }

    // Cuando cambia la OT, actualizar el equipo automáticamente (solo para nuevas solicitudes)
    $('#solicitudOT').on('change', function () {
        if (!$('#solicitudOT').prop('disabled')) { // Solo si no está deshabilitado
            const ot = $(this).val();
            if (ot && otEquipos[ot]) {
                $('#solicitudEquipo').val(otEquipos[ot]);
            } else {
                $('#solicitudEquipo').val('');
            }
        }
    });
});