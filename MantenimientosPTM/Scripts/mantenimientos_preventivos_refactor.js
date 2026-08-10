// ========================================
// INICIALIZACIÓN
// ========================================
$(document).ready(function () {
    const app = new MantenimientosPreventivoApp();
    app.inicializar();

    // 🔥 INICIALIZAR HEADER FIJO CON EL GESTOR GLOBAL
    window.HeaderFijoGlobalManager.crear(
        '.card-header.header-fijo-custom',      // ✅ Header
        '.position-relative.header-custom',     // ✅ Contenedor
        'headerMantenimientos',                 // ID único
        {
            topOffset: 45,
            backgroundColor: 'white',
            boxShadow: '0 4px 12px rgba(0, 88, 161, 0.3)',
            animacion: true
        }
    );

    console.log('✅ Header fijo inicializado correctamente');
});

// ========================================
// GESTOR DE UI
// ========================================
class UIManager {
    constructor(datos_usuario) {
        this.datos_usuario = datos_usuario;
    }
    inicializarUI() {
        // Seleccionar el padre "MantenimientosContainer" y expandir
        $("#MantenimientosContainer").addClass("selected");
        $("#MantenimientosContainer a").addClass("whiteText");
        $("#mantenimientos-collapse").addClass("show");
        // Configuración de navegación
        $("#MPContainer").removeClass("collapsed").attr("aria-expanded", true);
        $("#manntopreventivo-collapse").addClass("show");
        $("#MPProgramadoURL").addClass("selected-item");



        if (this.datos_usuario[0].TIPOUSUARIO != "AdminMtto" && this.datos_usuario[0].TIPOUSUARIO != "Administrador") {
            $("#btnGenerarOrdenes").addClass("d-none");
            $("#btnExportarExcel").addClass("d-none");
        }

        $('#FiltroFechaInicio').val(DateUtils.obtenerPrimerDiaMesActual());
        $('#FiltroFechaFin').val(DateUtils.obtenerUltimoDiaMesActual());
        //const TopScrool = new TopScrollTable("tablaMantenimientosRango", "tablaMantenimientosRangoContainer", "TblMCScrool");
        //TopScrool.createScroll();
        //TopScrool.initScroll();
    }
}

// ========================================
// APLICACIÓN PRINCIPAL
// ========================================
class MantenimientosPreventivoApp {
    constructor() {
        this.URLBase = "MantenimientosPreventivos";
        this.URLBaseCorrectivos = "MantenimientosCorrectivos";
        this.URLBaseRutinas = "Rutinas";
        this.URLBaseAlmacen = "Almacen";
        this.gestionTecnicos = new GestionTecnicos(this.URLBase);
        this.gestionFirmas = new GestionFirmas();
        this.datos_usuario = GlobalUtil.getDatosUsuario();
        this.UIManager = new UIManager(this.datos_usuario);

        // ✅ Inicializar gestión de artículos custom para MP
        this.gestionArticulosMP = new GestionArticulosCustom(
            '#BuscarArticuloMP',
            '#sugerenciasArticulosMP',
            '#CodigoArticuloMP',
            '#DescripcionArticuloMP',
            '#bodyArticulosRefaccionMP',
            'Planeacion',
            'alertRefaccionContainer',
            104,
            true,
            this.datos_usuario// Grupos de articulos excluidos 110 -> Producto Terminado
        );

        this.mantenimientoManager = new MantenimientoManager(
            this.URLBase,
            this.URLBaseCorrectivos,
            this.URLBaseRutinas,
            this.gestionTecnicos,
            this.gestionFirmas,
            this.datos_usuario,
            this // ✅ Pasar referencia de la app
        );

        // ✅ Exponer manager globalmente para funciones onclick en HTML
        window.MantenimientoManagerRefactor = this.mantenimientoManager;

        this.pdfManager = new PDFManagerMantenimiento();
        this.printManager = new PrintManagerMantenimiento(this.mantenimientoManager);

        window.AppMantenimientos = this;
    }

    inicializar() {
        this.UIManager.inicializarUI();
        this.mantenimientoManager.inicializar();
        this.pdfManager.inicializar();
        this.printManager.inicializar();
        this.gestionTecnicos.inicializar();
        this.gestionFirmas.inicializar(); // 🔥 AGREGAR ESTA LÍNEA

        this.configurarEventosMantenimientos();
        this.configurarEventosPDF();
        this.configurarEventosImpresion();
        this.configurarEventosTecnicos();
        this.configurarEventosFirmas(); // 🔥 AGREGAR ESTA LÍNEA
        this.configurarEventosGestionArticulos();
        this.initHubMantenimientosPreventivos(); //Inicializar HUB mantenimientos preventivos

        console.log('✅ Sistema Completo de Mantenimientos Preventivos inicializado correctamente');
    }

    //GESTION DE ARTICULOS - Preventivo (MP)
    configurarEventosGestionArticulos() {
        // ✅ Input de búsqueda - usando nuevos IDs
        $('#BuscarArticuloMP').on('input', (e) => {
            const query = $(e.target).val().trim();
            if (query.length >= 2) {
                this.gestionArticulosMP.buscarArticulos(query, this.datos_usuario[0].EMAIL, 0);
            } else {
                this.gestionArticulosMP.ocultarSugerencias();
            }
        });

        // ✅ Click fuera para cerrar sugerencias
        $(document).on('click', (e) => {
            if (!$(e.target).closest('#BuscarArticuloMP, #sugerenciasArticulosMP').length) {
                this.gestionArticulosMP.ocultarSugerencias();
            }
        });
    }

    configurarEventosMantenimientos() {
        // Agregar mantenimiento
        $('#btnAgregarMantenimiento').on('click', (e) => this.mantenimientoManager.abrirModalAgregar(e));

        $('#btnGuardarMantenimiento').on('click', () => this.mantenimientoManager.guardarMantenimiento());

        // Checkboxes
        $('#selectAll').on('change', (e) => this.mantenimientoManager.seleccionarTodos(e));

        // Generar órdenes
        $('#btnGenerarOrdenes').on('click', () => this.mantenimientoManager.generarOrdenes());

        // Solicitar refacción
        $(document).on('click', '.btn-solicitar-refaccion', (e) => {
            this.mantenimientoManager.abrirModalRefaccion($(e.currentTarget));
        });

        // 🔥 NUEVO: Solicitar reprogramación (SupervisorPlaneacion)
        $(document).on('click', '.btn-solicitar-reprogramacion', (e) => {
            this.mantenimientoManager.abrirModalReprogramacion($(e.currentTarget));
        });

        // 🔥 NUEVO: ACEPTAR reprogramación solicitada por (SupervisorPlaneacion)
        $(document).on('click', '.btn-aceptar-reprogramacion', (e) => {
            this.mantenimientoManager.aceptarReprogramacion($(e.currentTarget));
        });

        // Carátula online
        $(document).on('click', '.btn-caratula-online', (e) => {
            //Asignamos como data atributos las areas del tecnico  
            let area = $(e.currentTarget).data('area');
            $('#BuscarTecnico').attr('data-area', area);

            this.mantenimientoManager.abrirModalCaratulaOnline($(e.currentTarget));
        })

        // 🔥 EXPORTAR A s
        $('#btnExportarExcel').on('click', () => this.mantenimientoManager.exportarExcel());

        // Guardar refacción
        $('#formSolicitarRefaccion').on('submit', (e) => this.mantenimientoManager.enviarSolicitudRefaccion(e));

        // 🔥 Reprogramación - enviar solicitud
        $('#formReprogramacion').on('submit', (e) => this.mantenimientoManager.enviarSolicitudReprogramacion(e));

        // Check deshabilitar fechas reales de ejecución
        $('#chkSiguienteMes').on('change', function () {
            const checked = $(this).is(':checked');
            const $inputs = $('#RepFechaActualInicio, #RepFechaActualFin');

            if (checked) {
                $inputs
                    .prop('disabled', true)
                    .removeAttr('required')
                    .val('')
                    .removeClass('is-invalid');
                $('.spanReq').addClass('d-none');
            } else {
                $inputs
                    .prop('disabled', false)
                    .attr('required', 'required');
                $('.spanReq').removeClass('d-none');
            }
        });

        // ✅ CORRECTO - Debes pasar "e" como parámetro
        $('#formOrdenMantenimiento').on('submit', (e) => this.mantenimientoManager.guardarOT(e));

        // 🔥 EVENT LISTENER PARA GUARDAR BORRADOR
        $('#btnGuardarBorrador').on('click', (e) => this.mantenimientoManager.guardarBorrador(e));

        // Guardar estatus
        $('#btnGuardarEstatus').on('click', () => this.mantenimientoManager.guardarEstatus());

        // Guardar rutina
        $('#btnGuardarRutina').on('click', () => this.mantenimientoManager.guardarRutina());

        // ❌ Ya no necesitas esto con arrow functions
        // const self = this;
        // ✅ Arrow function - mantiene el contexto de this automáticamente
        $('#FiltroFechaInicio, #FiltroFechaFin, #FiltroLinea, #FiltroPeriodicidad').on('change', () => {
            const fechaInicio = $('#FiltroFechaInicio').val();
            const fechaFin = $('#FiltroFechaFin').val();

            // Validar solo si ambas fechas tienen valor
            if (fechaInicio && fechaFin) {
                const inicio = new Date(fechaInicio);
                const fin = new Date(fechaFin);

                if (inicio > fin) {
                    AlertManager.mostrar('La fecha de inicio no puede ser mayor a la fecha de fin.', 'warning');
                    return;
                }
            }

            // Si pasa la validación, recargar la tabla
            if ($.fn.DataTable.isDataTable('#tablaMantenimientosRango')) {
                $('#tablaMantenimientosRango').DataTable().ajax.reload();
            } else {
                this.mantenimientoManager.llenarMantenimientosPorRango();
            }
        });

        // ✅ Arrow function con validación de fechas
        $('#btnAplicarFiltros').on('click', () => {
            const fechaInicio = $('#FiltroFechaInicio').val();
            const fechaFin = $('#FiltroFechaFin').val();

            // Validar solo si ambas fechas tienen valor
            if (fechaInicio && fechaFin) {
                const inicio = new Date(fechaInicio);
                const fin = new Date(fechaFin);

                if (inicio > fin) {
                    AlertManager.mostrar('La fecha de inicio no puede ser mayor a la fecha de fin.', 'warning');
                    return;
                }
            }

            // Si pasa la validación, recargar la tabla
            if ($.fn.DataTable.isDataTable('#tablaMantenimientosRango')) {
                $('#tablaMantenimientosRango').DataTable().ajax.reload();
            } else {
                this.mantenimientoManager.llenarMantenimientosPorRango();
            }
        });

        // ✅ Arrow function
        $('#btnLimpiarFiltros').on('click', () => {
            $('#FiltroOrdenTrabajo').val('');
            $('#FiltroFechaInicio').val('');
            $('#FiltroFechaFin').val('');

            // Si pasa la validación, recargar la tabla
            if ($.fn.DataTable.isDataTable('#tablaMantenimientosRango')) {
                $('#tablaMantenimientosRango').DataTable().ajax.reload();
            } else {
                this.mantenimientoManager.llenarMantenimientosPorRango();
            }
        });

        $('#HoraInicio, #HoraFin').on('change', () => {
            const inicio = $('#HoraInicio').val();
            const fin = $('#HoraFin').val();

            if (!inicio || !fin) return;

            const toDate = (t) => new Date(`1970-01-01T${t}`);

            const d1 = toDate(inicio);
            const d2 = toDate(fin);

            if (isNaN(d1) || isNaN(d2)) {
                $("#DuracionHrs").val('');
                return;
            }

            // 🔥 Validación
            if (d2 < d1) {
                alert('La hora fin no puede ser menor a la hora inicio.');
                $('#HoraFin').val('');
                $("#DuracionHrs").val('');
                return;
            }

            const diffMs = d2 - d1;
            const horas = diffMs / (1000 * 60 * 60);

            $("#DuracionHrs").val(horas.toFixed(2));
        });

        $("#FiltroArea")
            .off('change')
            .on('change', (e) => {

                let Area = $(e.currentTarget).val();

                EquiposUtil.llenarLineas(
                    this.datos_usuario[0].PLANTA,
                    Area,
                    1,
                    "FiltroLinea",
                    null
                );
            });

        // Lista de refacciones
        $(document).on('click', '.btn-list-refacciones', function () {
            const $btn = $(this);
            const ordenTrabajo = $btn.data('numeroorden');

            if (!ordenTrabajo) {
                alert('No se encontró el número de orden de trabajo.');
                return;
            }

            // Actualizar subtítulo del modal con el número de OT
            $('#refaccionesOTNumero').text(ordenTrabajo);

            // Mostrar estado de carga
            $('#bodyRefaccionesOT').html(`
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">
                        <i class="bi bi-hourglass-split me-1"></i>Cargando refacciones...
                    </td>
                </tr>
            `);

            // Mostrar modal
            const modalElement = document.getElementById('modalRefaccionesOT');
            const modalRefacciones = new bootstrap.Modal(modalElement);
            modalRefacciones.show();

            // Obtener datos del método obtenerArticulosPorOT
            $.ajax({
                url: `/Almacen/GetArticulosPorOrdenTrabajo`,
                type: 'GET',
                data: { ordenTrabajo: ordenTrabajo },
                dataType: 'json',
                success: function (response) {
                    // 🔥 VERIFICAR TIPO DE USUARIO
                    const tipoUsuario = AppMantenimientos.datos_usuario[0].TIPOUSUARIO;
                    const esAdmin = tipoUsuario === "Administrador" || tipoUsuario === "AdminMtto" || tipoUsuario === "SupervisorMantenimiento";

                    if (response.Status === 'OK') {
                        let refacciones = JSON.parse(response.Data);

                        // 🔥 VERIFICAR SI HAY ALGÚN ELEMENTO CON ACEPTADA_MANTENIMIENTO ESTABLECIDO
                        const hayAceptacionMantenimiento = refacciones.some(item =>
                            item.ACEPTADA_MANTENIMIENTO !== "" && item.ACEPTADA_MANTENIMIENTO !== null
                        );

                        // 🔥 MOSTRAR/OCULTAR COLUMNA BASADO EN LOS DATOS
                        if (esAdmin || hayAceptacionMantenimiento) {
                            $('#tablaRefaccionesOT thead th:last-child').show();
                        } else {
                            $('#tablaRefaccionesOT thead th:last-child').hide();
                        }

                        let html = '';
                        refacciones.forEach(item => {

                            let classBadge = `bg-warning text-dark`;

                            if (item.ESTATUS == 'Atendida') {
                                classBadge = `bg-success text-white`
                            }

                            // 🔥 Generar botón de acción
                            let accionesHTML = '';
                            if (esAdmin) {

                                if (item.ESTATUS === 'Atendida' && (item.ACEPTADA_MANTENIMIENTO == "" || item.ACEPTADA_MANTENIMIENTO == null)) {
                                    accionesHTML = `
                                        <td class="text-center">
                                            <button class="btn btn-sm btn-ptm-primary btn-autorizar-refaccion" 
                                                    data-refaccion-id="${item.ID_SOLICITUD || ''}"
                                                    data-orden-trabajo="${ordenTrabajo}"
                                                    title="Autorizar esta refacción">
                                                <i class="bi bi-check-circle me-1"></i>Autorizar
                                            </button>
                                        </td>
                                    `;
                                }
                                else if (item.ACEPTADA_MANTENIMIENTO == "true") {
                                    accionesHTML = `
                                        <td class="text-center">
                                             <span class="badge btn-ptm-primary badge-custom">Aceptada por mantenimiento</span>
                                        </td>
                                    `;
                                }
                                else if (item.ESTATUS === 'Atendida' && item.ACEPTADA_MANTENIMIENTO == "false") {
                                    accionesHTML = `
                                        <td class="text-center">
                                             <span class="badge bg-danger badge-custom">Rechazada por mantenimiento</span>
                                        </td>
                                    `;
                                }
                                else {
                                    accionesHTML = `
                                        <td class="text-center">
                                            <button class="btn btn-sm btn-secondary" disabled title="Solo se pueden autorizar refacciones completadas">
                                                <i class="bi bi-lock me-1"></i>No disponible
                                            </button>
                                        </td>
                                    `;
                                }
                            }

                            // 🔥 PARA EL TÉCNICO - mostrar estado si existe ACEPTADA_MANTENIMIENTO
                            if (!esAdmin && item.ACEPTADA_MANTENIMIENTO != "" && item.ACEPTADA_MANTENIMIENTO != null) {
                                let badgeClass = (item.ACEPTADA_MANTENIMIENTO == "true") ? "btn-ptm-primary badge-custom" : "bg-danger badge-custom";
                                let badgeText = (item.ACEPTADA_MANTENIMIENTO == "true") ? "Aceptada por mantenimiento" : "Rechazada por mantenimiento";
                                accionesHTML = `
                                    <td class="text-center">
                                        <span class="badge ${badgeClass}">${badgeText}</span>
                                    </td>`;
                            }

                            html += `
                                <tr>
                                    <td>${item.REFACCION_SOLICITADA || ''}</td>
                                    <td>${item.NOMBRE_ARTICULO || ''}</td>
                                    <td class="text-center">${item.CANTIDAD || 0}</td>
                                    <td class="text-center">
                                       ${item.NIVEL_URGENCIA || ''}
                                    </td>
                                    <td class="text-center">
                                        <span class="badge text-white ${classBadge}">${item.ESTATUS || ''}</span>
                                    </td>
                                    ${accionesHTML}
                                </tr>
                            `;
                        });

                        $('#bodyRefaccionesOT').html(html);

                    } else {
                        $('#bodyRefaccionesOT').html(`
                            <tr>
                                <td colspan="6" class="text-center text-muted py-4">
                                    <i class="bi bi-info-circle me-1"></i>No hay refacciones registradas para esta orden.
                                </td>
                            </tr>
                        `);
                    }
                },
                error: function (xhr, status, error) {
                    console.error('Error al cargar refacciones:', error);
                    $('#bodyRefaccionesOT').html(`
                        <tr>
                            <td colspan="6" class="text-center text-muted py-4">
                                <i class="bi bi-exclamation-triangle me-1"></i>Error al cargar las refacciones.
                            </td>
                        </tr>
                    `);
                }
            });
        });

        // 🔥 NUEVO: Evento para autorizar refacción (solo para admins)
        $(document).on('click', '.btn-autorizar-refaccion', function () {
            const $btn = $(this);
            const refaccionId = $btn.data('refaccion-id');
            const ordenTrabajo = $btn.data('orden-trabajo');

            // 🔥 VERIFICAR PERMISOS NUEVAMENTE
            const tipoUsuario = AppMantenimientos.datos_usuario[0].TIPOUSUARIO;
            const esAdmin = tipoUsuario === "Administrador" || tipoUsuario === "AdminMtto" || tipoUsuario === "SupervisorMantenimiento";

            if (!esAdmin) {
                AlertManager.mostrar('No tienes permisos para autorizar refacciones', 'warning');
                return;
            }

            if (!refaccionId || !ordenTrabajo) {
                AlertManager.mostrar('No se pudo obtener los datos de la refacción', 'warning');
                return;
            }

            let TipoUsuario = AppMantenimientos.datos_usuario[0].TIPOUSUARIO;
            // Mostrar confirmación con ReprogramacionConfirmManager (3 botones)
            ReprogramacionConfirmManager.mostrar({
                titulo: `¿Autorizar refacción?`,
                mensaje: `
                <div style="text-align:left; font-size:0.95rem; line-height:1.6;">
                    <div style="display:flex;gap:12px;flex-wrap:wrap;">
                        <div style="min-width:180px;"><i class="bi bi-clipboard-data me-2" style="color:#1195d0;"></i><strong>Orden de Trabajo:</strong> ${ordenTrabajo}</div>
                        <div style="min-width:180px;"><i class="bi bi-tools me-2" style="color:#1195d0;"></i><strong>ID Refacción:</strong> ${refaccionId}</div>
                    </div>
                    <hr style="margin:10px 0;">
                    <div style="font-size:0.85rem;color:#fff7d6;">
                        <strong>Importante:</strong> Al aceptar, se autorizará esta refacción para mantenimiento. Al rechazar, se marcará como no válida.
                    </div>
                </div>
                `,
                onSi: () => {
                    $btn.html('<span class="spinner-border spinner-border-sm me-2"></span>Autorizando...').prop('disabled', true);

                    $.ajax({
                        url: `/Almacen/AutorizarRefaccion`,
                        type: 'POST',
                        headers: {
                            contentType: 'application/x-www-form-urlencoded',
                            'X-Rol-Usuario': TipoUsuario
                        },
                        data: {
                            idSolicitud: refaccionId,
                            aceptadaMantenimiento: true
                        },
                        dataType: 'json',
                        success: function (response) {
                            if (response.Status === 'OK') {
                                AlertManager.mostrar(response.Message || 'Refacción autorizada correctamente', 'success');

                                // ✅ Cambiar texto del botón a estado de éxito
                                $btn.html('<i class="bi bi-check-circle-fill me-1"></i>Autorizada').addClass('btn-success').removeClass('btn-ptm-primary');

                                // ✅ Cerrar el modal después de 2 segundos
                                setTimeout(() => {
                                    const modalElement = document.getElementById('modalRefaccionesOT');
                                    const modal = bootstrap.Modal.getInstance(modalElement);
                                    if (modal) {
                                        modal.hide();
                                    }
                                }, 2000);
                            } else {
                                AlertManager.mostrar(response.Message || 'Error al autorizar la refacción', 'warning');
                                $btn.html('<i class="bi bi-check-circle me-1"></i>Autorizar').prop('disabled', false);
                            }
                        },
                        error: function (xhr, status, error) {
                            AlertManager.mostrar('Error al conectar con el servidor', 'warning');
                            $btn.html('<i class="bi bi-check-circle me-1"></i>Autorizar').prop('disabled', false);
                        }
                    });
                },
                onNo: () => {
                    $btn.html('<span class="spinner-border spinner-border-sm me-2"></span>Rechazando...').prop('disabled', true);

                    $.ajax({
                        url: `/Almacen/AutorizarRefaccion`,
                        type: 'POST',
                        contentType: 'application/x-www-form-urlencoded',
                        data: {
                            idSolicitud: refaccionId,
                            aceptadaMantenimiento: false
                        },
                        dataType: 'json',
                        success: function (response) {
                            if (response.Status === 'OK') {
                                AlertManager.mostrar(response.Message || 'Refacción rechazada correctamente', 'success');

                                // ✅ Cambiar texto del botón a estado de rechazo
                                $btn.html('<i class="bi bi-x-circle-fill me-1"></i>Rechazada').addClass('btn-danger').removeClass('btn-ptm-primary');

                                // ✅ Cerrar el modal después de 2 segundos
                                setTimeout(() => {
                                    const modalElement = document.getElementById('modalRefaccionesOT');
                                    const modal = bootstrap.Modal.getInstance(modalElement);
                                    if (modal) {
                                        modal.hide();
                                    }
                                }, 2000);
                            } else {
                                AlertManager.mostrar(response.Message || 'Error al rechazar la refacción', 'warning');
                                $btn.html('<i class="bi bi-check-circle me-1"></i>Autorizar').prop('disabled', false);
                            }
                        },
                        error: function (xhr, status, error) {
                            AlertManager.mostrar('Error al conectar con el servidor', 'warning');
                            $btn.html('<i class="bi bi-check-circle me-1"></i>Autorizar').prop('disabled', false);
                        }
                    });
                }
            });
        });
    }

    configurarEventosPDF() {
        $('#btnExportMantenimientoPDF').on('click', () => this.pdfManager.exportarOrdenMantenimiento());
    }

    // 🔥 Nuevo método para eventos de impresión
    configurarEventosImpresion() {
        $(document).on('click', '.btn-impresion-online', (e) => {

            const btn = $(e.currentTarget);

            // 🔥 abrir inmediatamente
            const win = window.open('', '_blank', 'width=900,height=700');

            if (!win) {
                AlertManager.mostrar('El navegador bloqueó la ventana. Permite popups.', 'warning');
                return;
            }

            // 🔥 pasar la referencia
            this.printManager.prepararImpresionDirecta(btn, win);
        });
    }

    configurarEventosTecnicos() {
        // ❌ QUITA el const self = this; ya no lo necesitas

        // ✅ Cambiar TODAS las function() por arrow functions
        $('#BuscarTecnico').on('input', (e) => {  // ⬅️ Agrega parámetro 'e'
            const query = $(e.target).val().trim();
            let planta = this.datos_usuario[0].PLANTA;
            let usuarioWeb = this.datos_usuario[0].USUARIOWEB;
            let tipoUsuario = this.datos_usuario[0].TIPOUSUARIO;
            let posicionId = null;

            this.parametersBuscarTecnico(query, planta, posicionId, usuarioWeb, tipoUsuario);

        });

        $('#btnAgregarTecnico').on('click', () => {  // ⬅️ Arrow function
            this.gestionTecnicos.agregarTecnicoDesdeInput();
        });

        $('#BuscarTecnico').on('keypress', (e) => {  // ⬅️ Arrow function
            if (e.which === 13) {
                e.preventDefault();
                this.gestionTecnicos.agregarTecnicoDesdeInput();
            }
        });

        // ✅ Este ya está bien con arrow function
        $(document).on('click', (e) => {
            if (!$(e.target).closest('#BuscarTecnico, #sugerenciasTecnicos').length) {
                this.gestionTecnicos.ocultarSugerencias();
            }
        });

        // ✅ Versión con suffix visual
        $('#Duracion').on('input', function (e) {
            let valor = $(this).val().replace(' Hrs', '').trim();

            // Remover todo excepto números y punto
            valor = valor.replace(/[^0-9.]/g, '');

            // Permitir solo un punto decimal
            const partes = valor.split('.');
            if (partes.length > 2) {
                valor = partes[0] + '.' + partes.slice(1).join('');
            }

            // Limitar a 2 decimales
            if (partes.length === 2 && partes[1].length > 2) {
                valor = partes[0] + '.' + partes[1].substring(0, 2);
            }

            $(this).val(valor);
        });

    }

    parametersBuscarTecnico(query, planta, posicionId, usuarioWeb, tipoUsuario) {

        if (query.length >= 2 && tipoUsuario === "TecnicoMtto") {
            this.gestionTecnicos.buscarTecnicos(query, planta, posicionId, usuarioWeb, tipoUsuario);
        } else {
            this.gestionTecnicos.ocultarSugerencias();
        }
    }

    configurarEventosFirmas() {
        // Los eventos se manejan mediante onclick en el HTML
        // pero creamos funciones globales para que sean accesibles
        window.limpiarFirma = (tipo) => this.gestionFirmas.limpiarFirma(tipo);
        window.deshacerFirma = (tipo) => this.gestionFirmas.deshacerFirma(tipo);
    }

    // ========================================
    // SIGNALR MANAGER - MANTENIMIENTOS
    // ========================================
    initHubMantenimientosPreventivos() {
        const self = this;
        const hub = $.connection.mantenimientoHub;
        let reconnectDelay = 5000;
        let modalActualizacion = null;

        const miRol = self.datos_usuario[0].TIPOUSUARIO;

        // ── Todos reciben el aviso excepto quien hizo el cambio ──
        const debeRecibirAviso = (rolQueCambio) => miRol !== rolQueCambio;

        // ── Inicializar modal una sola vez ──
        const $modalEl = document.getElementById('actualizacionDatosModal');
        if ($modalEl) {
            modalActualizacion = new bootstrap.Modal($modalEl, { backdrop: 'static', keyboard: false });

            document.getElementById('btnConfirmarActualizacion')
                .addEventListener('click', function () {
                    modalActualizacion.hide();
                    self._recargarTablaMantenimientos();
                });
        }

        // ========================================
        // 📡 EVENTO PRINCIPAL
        // ========================================
        // El servidor debe enviar el rol de quien disparó el cambio:
        //   Clients.Others.actualizarTablaMantenimientosPreventivos(rolQueCambio)
        // Si tu hub aún no lo manda, pasa string vacío como fallback y filtra en el servidor.
        hub.client.actualizarTablaMantenimientosPreventivos = function (rolQueCambio) {
            console.warn("📡 Actualización recibida desde SignalR | Origen:", rolQueCambio || "desconocido");

            // 🔥 Validar si este usuario debe recibir el aviso
            if (!debeRecibirAviso(rolQueCambio)) {
                console.info("🔕 Aviso ignorado — no corresponde a este rol:", miRol);
                return;
            }

            // 🔥 Evitar múltiples modales apilados
            if ($modalEl && $modalEl.classList.contains('show')) return;

            // 🔥 Evitar aviso si ya hay un reload en curso
            if (self._isReloading) return;

            modalActualizacion
                ? modalActualizacion.show()
                : self._recargarTablaMantenimientos();
        };

        // ========================================
        // 🚀 START HUB (con fallback controlado)
        // ========================================
        $.connection.hub.start({
            transport: ['webSockets', 'longPolling']
        }).done(function () {
            console.log("✅ SignalR conectado | Rol:", miRol);
            console.log("🚚 Transporte:", $.connection.hub.transport.name);
        }).fail(function (error) {
            console.error("❌ Error al conectar SignalR:", error);
        });

        // ========================================
        // 🔄 RECONNECTING
        // ========================================
        $.connection.hub.reconnecting(function () {
            console.warn("🔄 SignalR reconectando...");
        });

        // ========================================
        // 🔁 RECONNECTED — recarga silenciosa
        // ========================================
        $.connection.hub.reconnected(function () {
            console.info("✅ SignalR reconectado | Rol:", miRol);
            self._recargarTablaMantenimientos();
            reconnectDelay = 5000;
        });

        // ========================================
        // ❌ DISCONNECTED (retry exponencial)
        // ========================================
        $.connection.hub.disconnected(function () {
            console.error("❌ SignalR desconectado");
            setTimeout(function () {
                console.warn(`🔁 Reintentando conexión en ${reconnectDelay / 1000}s...`);
                $.connection.hub.start();
                reconnectDelay = Math.min(reconnectDelay * 2, 30000);
            }, reconnectDelay);
        });
    }

    // ========================================
    // 🔁 RECARGA CENTRALIZADA (reutilizable)
    // ========================================

    _recargarTablaMantenimientos() {

        $('.modal.show').modal('hide');

        if (this._isReloading) return;

        this._isReloading = true;

        if ($.fn.DataTable.isDataTable('#tablaMantenimientosRango')) {
            $('#tablaMantenimientosRango').DataTable().ajax.reload(() => {
                this._isReloading = false;
            }, false);
        } else {
            this.mantenimientoManager.llenarMantenimientosPorRango();
            this._isReloading = false;
        }
    }
}


// ========================================
// GESTOR DE MANTENIMIENTOS PREVENTIVOS
// ========================================
class MantenimientoManager {
    constructor(URLBase, URLBaseCorrectivos, URLBaseRutinas, gestionTecnicos, gestionFirmas, datos_usuario, appReferencia = null) {
        this.URLBase = URLBase;
        this.URLBaseCorrectivos = URLBaseCorrectivos;
        this.URLBaseRutinas = URLBaseRutinas;
        this.gestionTecnicos = gestionTecnicos;
        this.gestionFirmas = gestionFirmas;
        this.datos_usuario = datos_usuario;
        this.appReferencia = appReferencia;
        this.checklistManager = new ChecklistManager();

        // ✅ NUEVOS: Datos del botón guardados en el constructor
        this.datosBotón = {
            idEquipo: "",
            numeroOrden: "",
            nombreEquipo: "",
            numeroDocPmCalidad: "",
            area: "",
            lineaProduccion: "",
            fechaInicioMantenimiento: "",
            fechaFinMantenimiento: "",
            idPeriodicidad: "",
            periodicidadMantenimiento: "",
            fechaRealInicio: "",
            fechaRealFin: "",
            idSolicitud: "",
            fechaInicioPeriodo: "",
            fechaFinPeriodo: "",
            enviarSiguienteMes: ""
        };

        // ✅ IDs y referencias globales
        this.ID_EQUIPO = "";
        this.ID_MANTENIMIENTO = "";
        this.ID_EQUIPO_PDF = "";
        this.PLANTA_PDF = "";
        this.pdfTemporalRutina = null;
    }

    // ============================
    // GUARDAR DATOS DEL BOTÓN
    // ============================
    guardarDatosDelBoton(btn) {
        this.datosBotón = {
            idEquipo: btn.data('idequipo'),
            numeroOrden: btn.data('numeroorden'),
            nombreEquipo: btn.data('nombreequipo'),
            numeroDocPmCalidad: btn.data('numerodocpmcalidad'),
            area: btn.data('area'),
            lineaProduccion: btn.data('lineaproduccion'),
            fechaInicioMantenimiento: btn.data('fechainiciomantenimiento'),
            fechaFinMantenimiento: btn.data('fechafinmantenimiento'),
            idPeriodicidad: btn.data('idperiodicidad'),
            periodicidadMantenimiento: btn.data('periodicidadmantenimiento'),
            // ✅ v4: para el flujo de reprogramación
            fueReprogramado: btn.data('fuereprogramado'),
            tieneSolicitudPendiente: btn.data('tienesolicitudpendiente'),
            idSolicitud: btn.data('idsolicitudpendiente'),
            fechaRealInicio: btn.data('fecharealinicio'),
            fechaRealFin: btn.data('fecharealfin'),
            fechaInicioPeriodo: btn.data('fechainicioperiodo'),
            fechaFinPeriodo: btn.data('fechafinperiodo'),
            enviarSiguienteMes: btn.data('enviarsiguientemes'),
            motivo: btn.data('motivo'),
        };
    }

    // ============================
    // REPROGRAMACIÓN DE MANTENIMIENTO
    // ============================
    abrirModalReprogramacion(btn) {


        // Limpiar validación
        ValidationManager.limpiarValidacion('#formReprogramacion');

        // ✅ GUARDAR DATOS DEL BOTÓN EN EL CONSTRUCTOR
        this.guardarDatosDelBoton(btn);

        // ✅ USAR DATOS GUARDADOS
        const convertirFecha = (fecha) => {
            if (!fecha || fecha.trim() === '') return '';
            const partes = fecha.split('/');
            if (partes.length !== 3) return fecha;
            const [dia, mes, anio] = partes;
            return `${anio}-${mes}-${dia}`;
        };

        const convertirFechaReal = (fecha) => {
            if (!fecha || fecha === 'null' || fecha.trim() === '') return '';
            return fecha.split(' ')[0]; // Toma solo "2026-08-06"
        };

        // Obtener si la solicitud ya fue reprogramada
        let fueReprogramda = this.datosBotón.fueReprogramado;
        if (fueReprogramda === 'SI') { // Si ya fue reprogramada no puede volver a reprogramarse, solo asignar nuevas fechas
            $('#enviarSigMes').addClass('d-none');
            $('#chkSiguienteMes').prop('disabled', true);

            $('#RepFechaActualInicio, #RepFechaActualFin')
                .prop('disabled', false)
                .attr('required', 'required')
                .removeClass('is-invalid');

            $('.spanReq').removeClass('d-none');

            // Limitar SOLO al siguiente mes
            const hoy = new Date();

            const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);
            const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 2, 0);

            const formatDate = (fecha) => {
                const year = fecha.getFullYear();
                const month = String(fecha.getMonth() + 1).padStart(2, '0');
                const day = String(fecha.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            $('#RepFechaActualInicio, #RepFechaActualFin')
                .attr('min', formatDate(primerDiaMes))
                .attr('max', formatDate(ultimoDiaMes))
                .off('change.reprogramacion')
                .on('change.reprogramacion', function () {

                    const fecha = new Date($(this).val());

                    if (fecha < primerDiaMes || fecha > ultimoDiaMes) {
                        AlertManager.mostrar(
                            'Solo puedes seleccionar fechas en base a la reprogramación conforme al mes en el que se solicito.',
                            'warning',
                            'alertReprogramacionContainer'
                        );

                        $(this).val('');
                    }
                });

        } else {
            // Si la solicitud no a sido reprogramada

            $('#enviarSigMes').removeClass('d-none');

            // ✅ RESET COMPLETO DEL CHECKBOX Y LOS INPUTS
            $('#chkSiguienteMes').prop('checked', false);
            $('#chkSiguienteMes').prop('disabled', false);

            $('#RepFechaActualInicio, #RepFechaActualFin')
                .prop('disabled', false)
                .attr('required', 'required')
                .removeClass('is-invalid');

            $('.spanReq').removeClass('d-none');

            const hoy = new Date();

            const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
            const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

            const formatDate = (fecha) => {
                const year = fecha.getFullYear();
                const month = String(fecha.getMonth() + 1).padStart(2, '0');
                const day = String(fecha.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            $('#RepFechaActualInicio, #RepFechaActualFin')
                .attr('min', formatDate(primerDiaMes))
                .attr('max', formatDate(ultimoDiaMes));


            //Limitar las fechas reales inicio y fin (Solo mes actual)
            $('#RepFechaActualInicio, #RepFechaActualFin').off('change.reprogramacion').on('change.reprogramacion', function () {
                const hoy = new Date();
                const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
                const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
                const fecha = new Date($(this).val());

                if (fecha < primerDiaMes || fecha > ultimoDiaMes) {
                    AlertManager.mostrar('Solo puedes seleccionar fechas dentro del mes actual.', 'warning', 'alertReprogramacionContainer');
                    $(this).val('');
                }
            });
        }


        // Llenar datos en el modal
        let Equipo = `${this.datosBotón.nombreEquipo} ${this.datosBotón.numeroDocPmCalidad}`;
        $('#ReprogramacionIdEquipo').val(this.datosBotón.idEquipo);
        $('#ReprogramacionNumeroOrden').val(this.datosBotón.numeroOrden);
        $('#ReprogramacionEquipo').val(Equipo);
        $('#ReprogramacionArea').val(this.datosBotón.area);
        $('#ReprogramacionLinea').val(this.datosBotón.lineaProduccion);
        $('#ReprogramacionPeriodicidad').val(this.datosBotón.periodicidadMantenimiento);
        $('#ReprogramacionFechaActualInicio').val(convertirFechaReal(this.datosBotón.fechaInicioPeriodo));
        $('#ReprogramacionFechaActualFin').val(convertirFechaReal(this.datosBotón.fechaFinPeriodo));

        $('#RepFechaActualInicio').val(convertirFechaReal(this.datosBotón.fechaRealInicio));
        $('#RepFechaActualFin').val(convertirFechaReal(this.datosBotón.fechaRealFin));
        $('#ReprogramacionMotivo').val(this.datosBotón.motivo);

        // Limpiar campos de reprogramación
        $('#ReprogramacionFechaNovaInicio').val('');
        $('#ReprogramacionFechaNovaFin').val('');



        // Mostrar modal
        $('#modalSolicitarReprogramacion').modal('show');
    }

    enviarSolicitudReprogramacion(e) {
        e.preventDefault();
        const siguienteMes = $('#chkSiguienteMes').is(':checked');

        // ========================
        // VALIDACIÓN DE FORMULARIO
        // ========================
        // Validar fecha
        const fechaRepInicio = $('#RepFechaActualInicio').val();
        const fechaRepFin = $('#RepFechaActualFin').val();

        // Validación de fechas solo si NO es siguiente mes
        if (!siguienteMes) {
            const fechaRepInicio = $('#RepFechaActualInicio').val();
            const fechaRepFin = $('#RepFechaActualFin').val();

            if (fechaRepInicio && fechaRepFin) {
                if (new Date(fechaRepFin) < new Date(fechaRepInicio)) {
                    AlertManager.mostrar(
                        'La fecha fin real de ejecución no puede ser anterior a la fecha inicio.',
                        'warning',
                        'alertReprogramacionContainer'
                    );
                    $('#RepFechaActualFin').focus();
                    return false;
                }
            }
        }

        if (!ValidationManager.validarFormulario('#formReprogramacion')) {
            AlertManager.mostrar('Por favor, complete correctamente todos los campos', 'warning', 'alertReprogramacionContainer');
            return false;
        }

        // ✅ USAR DATOS GUARDADOS EN EL CONSTRUCTOR
        const datos = {
            IdEquipo: this.datosBotón.idEquipo,
            NumeroOrden: this.datosBotón.numeroOrden,
            FechaActualInicio: $('#ReprogramacionFechaActualInicio').val(),
            FechaActualFin: $('#ReprogramacionFechaActualFin').val(),
            FechaRepInicio: siguienteMes ? null : $('#RepFechaActualInicio').val(),
            FechaRepFin: siguienteMes ? null : $('#RepFechaActualFin').val(),
            EnviarSiguienteMes: siguienteMes,
            Motivo: $('#ReprogramacionMotivo').val(),
            UsuarioSolicita: this.datos_usuario[0].EMAIL,
            IdPeriodicidad: this.datosBotón.idPeriodicidad,
            Planta: this.datos_usuario[0].PLANTA,
            // ✅ v4: para el flujo de reprogramación
            FueReprogramado: this.datosBotón.fueReprogramado,
            TieneSolicitudPendiente: this.datosBotón.tieneSolicitudPendiente,
            IdSolicitud: this.datosBotón.idSolicitud
        };

        $('#btnEnviarReprogramacion').html('<span class="spinner-border spinner-border-sm me-2"></span>Enviando...').prop('disabled', true);

        let TipoUsuario = this.datos_usuario[0].TIPOUSUARIO;

        $.ajax({
            url: `/${this.URLBase}/SolicitarReprogramacion`,
            type: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Rol-Usuario': TipoUsuario
            },
            contentType: 'application/json; charset=utf-8',
            data: JSON.stringify(datos),
            dataType: 'json',
            success: (response) => {
                if (response.Status === 'SI') {
                    $('#btnEnviarReprogramacion').html('<i class="bi bi-check-circle-fill text-white me-2"></i>Solicitud enviada correctamente');
                    AlertManager.mostrar(response.Message || 'Solicitud de reprogramación enviada correctamente', 'success', 'alertReprogramacionContainer');

                    // Recargar tabla
                    $('#tablaMantenimientosRango').DataTable().ajax.reload(null, false);

                    setTimeout(() => {
                        $('#btnEnviarReprogramacion').html('<i class="bi bi-send-fill me-1"></i>Enviar Solicitud');
                        $('#btnEnviarReprogramacion').prop('disabled', false);
                        $('#modalSolicitarReprogramacion').modal('hide');
                    }, 2000);
                } else if (response.Status === 'ERROR') {
                    $('#btnEnviarReprogramacion').html('<i class="bi bi-send-fill me-1"></i>Enviar Solicitud');

                    AlertManager.mostrar(response.Message || 'Error técnico al procesar la solicitud', 'danger', 'alertReprogramacionContainer');
                } else {
                    $('#btnEnviarReprogramacion').html('<i class="bi bi-send-fill me-1"></i>Enviar Solicitud');
                    $('#btnEnviarReprogramacion').prop('disabled', false);
                    AlertManager.mostrar(response.Message || 'No fue posible registrar la solicitud de reprogramación', 'warning', 'alertReprogramacionContainer');
                }
            },
            error: (xhr, status, error) => {
                $('#btnEnviarReprogramacion').html('<i class="bi bi-send-fill me-1"></i>Enviar Solicitud');
                $('#btnEnviarReprogramacion').prop('disabled', false);
                AlertManager.mostrar('Error al conectar con el servidor', 'warning', 'alertReprogramacionContainer');
            }
        });
    }

    aceptarReprogramacion(btn) {
        // Obtener datos del botón
        this.guardarDatosDelBoton(btn);

        // Obtener info de la fila
        const nombreEquipo = `${this.datosBotón.nombreEquipo} ${this.datosBotón.numeroDocPmCalidad}`;
        const numeroOrden = this.datosBotón.numeroOrden || 'S/N';
        const area = this.datosBotón.area || '';
        const linea = this.datosBotón.lineaProduccion || '';
        const periodo = this.datosBotón.periodicidadMantenimiento || '';

        // Mostrar confirmación con opciones de Aceptar/Rechazar
        ReprogramacionConfirmManager.mostrar({
            titulo: '¿Aceptar reprogramación?',
            mensaje: `
            <div style="text-align:left; font-size:0.95rem; line-height:1.6;">
                <div style="display:flex;gap:12px;flex-wrap:wrap;">
                    <div style="min-width:180px;"><i class="bi bi-hash me-2" style="color:#1195d0;"></i><strong>Orden:</strong> ${numeroOrden}</div>
                    <div style="min-width:200px;"><i class="bi bi-tools me-2" style="color:#1195d0;"></i><strong>Equipo:</strong> ${nombreEquipo}</div>
                </div>
                <div style="margin-top:8px;display:flex;gap:12px;flex-wrap:wrap;">
                    <div style="min-width:160px;"><i class="bi bi-diagram-3-fill me-2" style="color:#1195d0;"></i><strong>Área:</strong> ${area}</div>
                    <div style="min-width:160px;"><i class="bi bi-diagram-3 me-2" style="color:#1195d0;"></i><strong>Línea:</strong> ${linea}</div>
                    <div style="min-width:180px;"><i class="bi bi-calendar-event me-2" style="color:#1195d0;"></i><strong>Período:</strong> ${periodo}</div>
                </div>
                <hr style="margin:10px 0;">
                <div style="font-size:0.85rem;color:#fff7d6;">
                    <strong>Importante:</strong> esta decisión aplica los ajustes correspondientes al mantenimiento.
                </div>
            </div>
            `,
            onSi: () => {
                this.procesarAceptarReprogramacion();
            },
            onNo: () => {
                this.procesarRechazarReprogramacion();
            }
        });
    }

    procesarAceptarReprogramacion() {
        GlobalUtil.mostrarLoader(true);

        const datos = {
            IdEquipo: this.datosBotón.idEquipo,
            NumeroOrden: this.datosBotón.numeroOrden,
            IdPeriodicidad: this.datosBotón.idPeriodicidad,
            Planta: this.datos_usuario[0].PLANTA,
            UsuarioAcepta: this.datos_usuario[0].EMAIL,
            Accion: 'ACEPTAR',
            // ✅ v4: para el flujo de reprogramación
            FueReprogramado: this.datosBotón.fueReprogramado,
            TieneSolicitudPendiente: this.datosBotón.tieneSolicitudPendiente,
            IdSolicitudPendiente: this.datosBotón.idSolicitud
        };

        $.ajax({
            url: `/${this.URLBase}/AceptarReprogramacion`,
            type: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Rol-Usuario': this.datos_usuario[0].TIPOUSUARIO
            },
            contentType: 'application/json; charset=utf-8',
            data: JSON.stringify(datos),
            dataType: 'json',
            success: (response) => {
                GlobalUtil.mostrarLoader(false);

                if (response.Status === 'SI') {
                    AlertManager.mostrar(response.Message || 'Reprogramación aceptada correctamente', 'success');

                    // Recargar tabla
                    $('#tablaMantenimientosRango').DataTable().ajax.reload(null, false);
                } else if (response.Status === 'ERROR') {
                    AlertManager.mostrar(response.Message || 'Error al procesar la aceptación', 'danger');
                } else {
                    AlertManager.mostrar(response.Message || 'No fue posible aceptar la reprogramación', 'warning');
                }
            },
            error: (xhr, status, error) => {
                GlobalUtil.mostrarLoader(false);
                AlertManager.mostrar('Error al conectar con el servidor', 'warning');
            }
        });
    }

    procesarRechazarReprogramacion() {
        GlobalUtil.mostrarLoader(true);

        const datos = {
            IdEquipo: this.datosBotón.idEquipo,
            NumeroOrden: this.datosBotón.numeroOrden,
            IdPeriodicidad: this.datosBotón.idPeriodicidad,
            Planta: this.datos_usuario[0].PLANTA,
            UsuarioAcepta: this.datos_usuario[0].EMAIL,
            Accion: 'RECHAZAR',
            // ✅ v4: para el flujo de reprogramación
            FueReprogramado: this.datosBotón.fueReprogramado,
            TieneSolicitudPendiente: this.datosBotón.tieneSolicitudPendiente,
            IdSolicitudPendiente: this.datosBotón.idSolicitud
        };

        $.ajax({
            url: `/${this.URLBase}/AceptarReprogramacion`,
            type: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Rol-Usuario': this.datos_usuario[0].TIPOUSUARIO
            },
            contentType: 'application/json; charset=utf-8',
            data: JSON.stringify(datos),
            dataType: 'json',
            success: (response) => {
                GlobalUtil.mostrarLoader(false);

                if (response.Status === 'SI') {
                    AlertManager.mostrar(response.Message || 'Reprogramación rechazada correctamente', 'success');

                    // Recargar tabla
                    $('#tablaMantenimientosRango').DataTable().ajax.reload(null, false);
                } else if (response.Status === 'ERROR') {
                    AlertManager.mostrar(response.Message || 'Error al procesar el rechazo', 'danger');
                } else {
                    AlertManager.mostrar(response.Message || 'No fue posible rechazar la reprogramación', 'warning');
                }
            },
            error: (xhr, status, error) => {
                GlobalUtil.mostrarLoader(false);
                AlertManager.mostrar('Error al conectar con el servidor', 'warning');
            }
        });
    }

    inicializar() {
        this.inicializarTooltips();
        //Solo si es admin
        if (this.datos_usuario[0].TIPOUSUARIO == "AdminMtto" || this.datos_usuario[0].TIPOUSUARIO == "Administrador" || this.datos_usuario[0].TIPOUSUARIO == "SupervisorPlaneacion") {
            this.llenarMantenimientosPorRango();
        }
        EquiposUtil.llenarLineas(this.datos_usuario[0].PLANTA, "none", "FiltroLinea");
        EquiposUtil.llenarProcesos(this.datos_usuario[0].PLANTA, "none", "FiltroArea");

        console.log('✅ MantenimientoManager inicializado correctamente');
    }

    llenarMantenimientosPorRango() {
        try {

            // ✅ Remover fila vacía si existe
            $('#filaVacia').remove();
            // Destruir DataTable si ya existe
            if ($.fn.DataTable.isDataTable('#tablaMantenimientosRango')) {
                $('#tablaMantenimientosRango').DataTable().destroy();
            }

            let FiltroEstatusOT = (this.datos_usuario[0].TIPOUSUARIO == "TecnicoMtto" ? "2,3,4" : null);
            //Obtencion de la posicion del empleado
            let posicionId = this.datos_usuario[0].POSICIONID || null;

            // Función para calcular el offset correcto según el tamaño de pantalla
            function calcularHeaderOffset() {
                if (window.innerWidth < 625) {
                    return 230;
                }
                if (window.innerWidth < 640) {
                    return 210;
                }
                if (window.innerWidth < 992) {
                    return 130;
                }
                if (window.innerWidth < 1155) {
                    return 140;
                } else if (window.innerWidth < 1400) {
                    return 120;
                } else {
                    return 113;
                }
            }

            const table = $('#tablaMantenimientosRango').DataTable({
                processing: false,
                serverSide: true,
                bDestroy: true,
                searching: false,
                autoWidth: false,
                colReorder: true,
                fixedHeader: {
                    header: true,
                    headerOffset: calcularHeaderOffset()
                },
                responsive: {
                    details: {
                        type: 'column',
                        target: 0,
                        renderer: function (api, rowIdx, columns) {
                            var hiddenColumns = columns.filter(function (col) {
                                return col.hidden;
                            });

                            if (hiddenColumns.length === 0) return false;

                            function normalizar(texto) {
                                return texto.toUpperCase()
                                    .normalize("NFD")
                                    .replace(/[\u0300-\u036f]/g, "")
                                    .trim();
                            }

                            function obtenerIcono(titulo) {
                                var tituloNorm = normalizar(titulo);

                                var iconos = {
                                    'TIPO MANTENIMIENTO': 'bi bi-gear-fill',
                                    'PROCESO': 'bi bi-diagram-2-fill',
                                    'LINEA': 'bi bi-diagram-3-fill',
                                    'EQUIPO': 'bi bi-tools',
                                    'USUARIO GENERO': 'bi bi-person-fill',
                                    'NUMERO ORDEN': 'bi bi-file-earmark-text',
                                    'TEXTO BREVE': 'bi bi-card-text',
                                    'PERIODICIDAD MP': 'bi bi-arrow-repeat',
                                    'FECHA REFERENCIA': 'bi bi-calendar-event',
                                    'MANTENIMIENTO PROGRAMADO': 'bi bi-calendar-range',
                                    'HORA APERTURA': 'bi bi-clock',
                                    'HORA CIERRE': 'bi bi-clock-fill',
                                    'TIEMPO INVERTIDO (HRS)': 'bi bi-hourglass-split',
                                    'COMENTARIOS': 'bi bi-chat-left-text',
                                    'ESTATUS ORDEN': 'bi bi-flag-fill',
                                    'ACCIONES': 'bi bi-lightning-fill'
                                };

                                return iconos[tituloNorm] || 'bi bi-circle-fill';
                            }

                            var detallesHtml = '';

                            $.each(hiddenColumns, function (i, col) {
                                var title = col.title;
                                var valueContent = col.data || '<em class="text-muted">Sin información</em>';
                                var iconClass = obtenerIcono(title);

                                detallesHtml +=
                                    '<div class="row mb-3 py-2 border-bottom align-items-center">' +
                                    '  <div class="col-5">' +
                                    '    <i class="' + iconClass + ' me-2" style="font-size: 1.3rem; color: #0D6EFD;"></i>' +
                                    '    <strong>' + title + '</strong>' +
                                    '  </div>' +
                                    '  <div class="col-7">' +
                                    '    <span class="badge px-3 py-2" style="background-color: #F2F2F2; color: #333;">' + valueContent + '</span>' +
                                    '  </div>' +
                                    '</div>';
                            });

                            return '<div class="card shadow-sm mt-3">' +
                                '  <div class="card-header bg-light">' +
                                '    <h5 class="mb-0">' +
                                '      <i class="bi bi-clipboard-check me-2" style="color: #0D6EFD;"></i>' +
                                '      Información adicional del mantenimiento' +
                                '    </h5>' +
                                '  </div>' +
                                '  <div class="card-body">' +
                                detallesHtml +
                                '  </div>' +
                                '  <div class="card-footer bg-light text-muted">' +
                                '    <small>Última actualización: ' + new Date().toLocaleDateString() + '</small>' +
                                '  </div>' +
                                '</div>';
                        }
                    }
                },
                ajax: {
                    url: `/${this.URLBase}/GetMantenimientosPorRango`,
                    type: "POST",
                    dataType: "json",
                    beforeSend: function () {
                        GlobalUtil.mostrarLoader(true);
                    },
                    complete: function () {
                        GlobalUtil.mostrarLoader(false);
                    },
                    data: (d) => {
                        return $.extend({}, d, {
                            "FiltroFechaInicio": $("#FiltroFechaInicio").val() || null,
                            "FiltroFechaFin": $("#FiltroFechaFin").val() || null,
                            "FiltroArea": $("#FiltroArea").val() || null,
                            "FiltroLinea": $("#FiltroLinea").val() || null,
                            "FiltroOrdenTrabajo": $("#FiltroOrdenTrabajo").val() || null,
                            "FiltroPeriodicidad": $("#FiltroPeriodicidad").val() || null,
                            "FiltroPlanta": this.datos_usuario[0].PLANTA || null,
                            "FiltroEstatusOT": FiltroEstatusOT,
                            "FiltroUsuario": this.datos_usuario[0].EMAIL || null,
                            "FiltroTipoUsuario": this.datos_usuario[0].TIPOUSUARIO,
                            "FiltroPosicionId": posicionId
                        });
                    },
                    dataSrc: function (json) {
                        if (json.fechaInicio && json.fechaFin) {
                            if ($('#mesActual').length) {
                                let Mes = DateUtils.capitalizarPrimeraLetra(json.fechaInicio + ' - ' + json.fechaFin);
                                $('#mesActual').text(Mes);
                            }
                        }
                        return json.data;
                    }
                },
                columns: [
                    // 🎯 Col 0: Control Responsive (+/-)
                    {
                        className: 'dtr-control',
                        orderable: false,
                        data: null,
                        defaultContent: '',
                        width: '50px'
                    },
                    // ✅ Col 1: Checkbox
                    {
                        data: null,
                        orderable: false,
                        className: 'text-center',
                        render: (data, type, row) => {
                            if (!row.EstatusOrden || row.EstatusOrden === '') {
                                if (this.datos_usuario[0].TIPOUSUARIO == "AdminMtto" || this.datos_usuario[0].TIPOUSUARIO == "Administrador") {
                                    return '<input type="checkbox" class="row-checkbox">';
                                }
                            }
                            return '';
                        }
                    },
                    // ✅ Col 2: Acciones
                    {
                        data: null,
                        orderable: false,
                        className: 'all text-center',
                        render: (data, type, row) => {

                            const dataAttrs = this.buildDataAttributesMP(row);

                            const tipoUsuario = this.datos_usuario[0].TIPOUSUARIO;
                            const esAdmin = tipoUsuario === "AdminMtto" || tipoUsuario === "Administrador";
                            const esTecnico = tipoUsuario === "TecnicoMtto";
                            const esSupProduccion = tipoUsuario === "Produccion" || tipoUsuario === "SupervisorProduccion";
                            const esSupMantenimiento = tipoUsuario === "SupervisorMantenimiento";
                            const esSupervisorPlaneacion = tipoUsuario === "SupervisorPlaneacion";
                            const tieneRefacciones = data.TieneRefacciones;

                            const estatusOrden = row.EstatusOrden || '';
                            const ordenFinalizada = row.OrdenTrabajoFinalizada || '';

                            const btn = (color, cssClass, icon, tooltip, attrs = '') =>
                                `<button class="btn btn-sm ${color} ${cssClass}" data-bs-toggle="tooltip" title="${tooltip}" ${attrs}>
                                <i class="bi bi-${icon}"></i>
                            </button>`;

                            const btnDisabled = (color, icon, tooltip) =>
                                btn(color, 'disabled', icon, tooltip).replace('<button', '<button disabled');

                            // 🔥 SI ES SupervisorPlaneacion → MOSTRAR SOLO BOTÓN DE REPROGRAMACIÓN
                            // ✅ CON CONDICIONES: NUMERO_ORDEN no vacío, FUE_REPROGRAMADO = 'NO' y TIENE_SOLICITUD_PENDIENTE = 'NO'
                            if (esSupervisorPlaneacion) {
                                const numeroOrden = row.NumeroOrden || '';
                                const fueReprogramado = row.FueReprogramado || 'SI';
                                const tieneSolicitudPendiente = row.TieneSolicitudPendiente || 'SI';

                                // Validar todas las condiciones
                                const puedeReprogramar =
                                    numeroOrden !== '' &&
                                    fueReprogramado === 'NO' &&
                                    tieneSolicitudPendiente === 'NO';

                                if (puedeReprogramar && estatusOrden == 2) {
                                    const reprogramBtn = btn(
                                        'btn-warning',
                                        'btn-solicitar-reprogramacion',
                                        'calendar2-check',
                                        'Solicitar Reprogramación',
                                        dataAttrs
                                    );
                                    return reprogramBtn;
                                } else if (fueReprogramado === 'SI') { //Se agrega si ya fue aceptada la reprogramacion, da oportunidad de ingresar las nuevas fechas en las que se atendera apartir de la aprobación
                                    let razonDeshabilitado = 'Ya fue reprogramado';

                                    const reprogramBtn = btn(
                                        'btn-warning',
                                        'btn-solicitar-reprogramacion',
                                        'calendar2-check',
                                        'Reprogramar fechas',
                                        dataAttrs
                                    );
                                    return reprogramBtn;

                                } else {
                                    // Mostrar botón deshabilitado con razón
                                    let razonDeshabilitado = 'No disponible';
                                    if (numeroOrden === '') {
                                        razonDeshabilitado = 'Orden de trabajo sin número';
                                    } else if (tieneSolicitudPendiente === 'SI') {
                                        razonDeshabilitado = 'Solicitud pendiente';
                                    }

                                    return btnDisabled(
                                        'btn-secondary',
                                        'calendar2-x',
                                        razonDeshabilitado
                                    );
                                }
                            }
                            let refaccionBtn = '';
                            let caratulaBtn = '';
                            let impresionBtn = '';
                            let listRefBtn = '';
                            let aceptarReprogramacionBtn = '';

                            // 🔴 VERIFICAR SI HAY SOLICITUD PENDIENTE
                            const tieneSolicitudPendiente = row.TieneSolicitudPendiente || 'NO';
                            const tieneSolicitudPendienteFlag = tieneSolicitudPendiente === 'SI';

                            // 🔵 SI HAY SOLICITUD PENDIENTE Y ES ADMIN → MOSTRAR BOTÓN DE ACEPTAR
                            if (esAdmin && tieneSolicitudPendienteFlag) {
                                aceptarReprogramacionBtn = btn(
                                    'btn-ptm-light',
                                    'btn-aceptar-reprogramacion',
                                    'check-circle',
                                    'Aceptar Reprogramación',
                                    dataAttrs
                                );
                            }

                            if (estatusOrden && estatusOrden !== '') {

                                // 🔴 SI HAY SOLICITUD PENDIENTE, DESHABILITAR TODOS LOS BOTONES
                                if (tieneSolicitudPendienteFlag) {
                                    refaccionBtn = btnDisabled('secondary', 'tools', 'Solicitar Refacción');
                                    caratulaBtn = btnDisabled('secondary', 'eye', 'Carátula(OT)');
                                    impresionBtn = btnDisabled('secondary', 'printer', 'Impresión(OT)');
                                    listRefBtn = btnDisabled('secondary', 'bi bi-box-seam', 'Historial de Refacciones');
                                } else {
                                    // LÓGICA NORMAL

                                    if (estatusOrden == 3 || estatusOrden == 4 || esSupMantenimiento || esSupProduccion || ordenFinalizada === "SI") {
                                        refaccionBtn = btnDisabled('secondary', 'tools', 'Solicitar Refacción');
                                    } else {
                                        refaccionBtn = btn('btn-ptm-primary', 'btn-solicitar-refaccion', 'tools', 'Solicitar Refacción', dataAttrs);
                                    }

                                    caratulaBtn = btn('btn-ptm-mid', 'btn-caratula-online', 'eye', 'Carátula(OT)', dataAttrs);

                                    if (!esTecnico) {
                                        if (estatusOrden == 4 || ordenFinalizada === "SI") {
                                            impresionBtn = btnDisabled('secondary', 'printer', 'Impresión(OT)');
                                        } else {
                                            impresionBtn = btn('btn-ptm-light', 'btn-impresion-online', 'printer', 'Impresión(OT)', dataAttrs);
                                        }
                                    }

                                    // 🔧 LISTADO DE REFACCIÓNES
                                    if (tieneRefacciones === "SI") {
                                        listRefBtn = btn('btn-ptm-primary', 'btn-list-refacciones', 'bi bi-box-seam', 'Historial de Refacciones', dataAttrs);
                                    } else {
                                        listRefBtn = btnDisabled('secondary', 'bi bi-box-seam', 'Historial de Refacciones');
                                    }
                                }

                                return `${aceptarReprogramacionBtn}${refaccionBtn}${caratulaBtn}${impresionBtn}${listRefBtn}`;

                            } else {

                                caratulaBtn = btnDisabled('secondary', 'eye', 'Carátula(OT)');

                                if (esAdmin) {
                                    refaccionBtn = '';
                                } else {
                                    refaccionBtn = btnDisabled('secondary', 'tools', 'Solicitar Refacción');
                                }

                                return `${aceptarReprogramacionBtn}${refaccionBtn}${caratulaBtn}`;
                            }
                        }
                    },
                    // ✅ Col 3: Número Orden
                    {
                        data: "NumeroOrden",
                        className: "text-center",
                        render: (data, type, row) => {
                            const esNueva = row.DescEstatusOrden === 'Liberado';
                            const punto = esNueva ? `<span class="punto-pulso"></span>` : '';
                            return `${punto}<span class="badge bg-primary badge-custom"><i class="bi bi-clipboard-data me-1"></i>${data || ''}</span>`;
                        }
                    },
                    // ✅ Col 4: Equipo
                    {
                        data: null,
                        render: (data, type, row) => {
                            let equipo = (row.NombreEquipo || 'N/A') + ' ' + (row.NumeroDocPmCalidad || '');
                            return `<i class="bi bi-gear-fill me-1 text-muted"></i>${equipo}`;
                        }
                    },
                    // ✅ Col 5: Proceso (Área)
                    {
                        data: "Area",
                        render: (data, type, row) => {
                            return `<i class="bi bi-diagram-3 me-1 text-muted"></i>${data || 'N/A'}`;
                        }
                    },
                    // ✅ Col 6: Línea
                    {
                        data: "LineaProduccion",
                        render: (data, type, row) => {
                            return `<i class="bi bi-arrow-repeat me-1 text-muted"></i>${data || 'N/A'}`;
                        }
                    },
                    // ✅ Col 7: Estatus Orden
                    {
                        data: null,
                        className: "text-center",
                        render: (data, type, row) => {
                            if (!row.DescEstatusOrden) {
                                return `<span class="badge bg-info badge-custom">
                                <i class="bi bi-plus-lg me-1"></i>Nueva
                            </span>`;
                            }

                            let status = row.DescEstatusOrden;

                            if (row.OrdenTrabajoFinalizada === "NO" && row.EstatusOrden == 4) {
                                status = "En proceso de firmas";
                            }

                            let badgeClass = 'bg-secondary';
                            let badgeIcon = '';

                            switch (status) {
                                case 'Liberado':
                                    badgeClass = 'btn-ptm-primary';
                                    badgeIcon = '<i class="bi bi-check-circle me-1"></i>';
                                    break;
                                case 'En espera de refacción':
                                    badgeClass = 'bg-warning';
                                    badgeIcon = '<i class="bi bi-tools me-1"></i>';
                                    break;
                                case 'En proceso de firmas':
                                    badgeClass = 'bg-dark';
                                    badgeIcon = '<i class="bi bi-pen me-1"></i>';
                                    break;
                                case 'Cerrado':
                                    badgeClass = 'bg-primary';
                                    badgeIcon = '<i class="bi bi-lock me-1"></i>';
                                    break;
                                case 'Cancelado':
                                    badgeClass = 'bg-danger';
                                    badgeIcon = '<i class="bi bi-x-circle me-1"></i>';
                                    break;
                            }

                            return `<span class="badge ${badgeClass} badge-custom">
                            ${badgeIcon}${status}
                        </span>`;
                        }
                    },
                    // ✅ Col 8: Fecha Referencia
                    {
                        data: "FechaReferencia",
                        className: "text-center",
                        render: (data, type, row) => {
                            return `<i class="bi bi-calendar-event me-1 text-muted"></i>${data || 'N/A'}`;
                        }
                    },
                    // ✅ Col 9: Mantenimiento Programado (Mes Mantenimiento)
                    {
                        data: "MesMantenimiento",
                        className: "text-center",
                        render: (data, type, row) => {
                            // if (!data) {
                            //     return `<span class="badge btn-ptm-light badge-custom">
                            //     <i class="bi bi-calendar-x me-1"></i>N/A
                            // </span>`;
                            // }

                            // return data.replace(
                            //     /(\d{2}\/\d{2}\/\d{4})/g,
                            //     '<span class="badge btn-ptm-light badge-custom"><i class="bi bi-calendar3 me-1"></i>$1</span>'
                            // );

                            // ✅ Si tiene fechas reales, mostrarlas en lugar de las programadas
                            const tieneFechaRealInicio = row.FechaRealInicio !== null && row.FechaRealInicio !== undefined && row.FechaRealInicio !== '';
                            const tieneFechaRealFin = row.FechaRealFin !== null && row.FechaRealFin !== undefined && row.FechaRealFin !== '';

                            if (tieneFechaRealInicio && tieneFechaRealFin) {
                                const inicio = row.FechaRealInicio.substring(0, 10);
                                const fin = row.FechaRealFin.substring(0, 10);
                                return `Del <span class="badge btn-ptm-light badge-custom"><i class="bi bi-calendar3 me-1"></i>${inicio} </span> Al
                                        <span class="badge btn-ptm-light badge-custom"><i class="bi bi-calendar3 me-1"></i>${fin}</span>`;
                            }

                            if (!data) {
                                return `<span class="badge btn-ptm-light badge-custom">
                                            <i class="bi bi-calendar-x me-1"></i>N/A
                                        </span>`;
                            }

                            return data.replace(
                                /(\d{2}\/\d{2}\/\d{4})/g,
                                '<span class="badge btn-ptm-light badge-custom"><i class="bi bi-calendar3 me-1"></i>$1</span>'
                            );
                        }
                    },
                    // ✅ Col 10: Periodicidad MP
                    {
                        data: null,
                        render: (data, type, row) => {
                            return `<i class="bi bi-calendar-week me-1 text-muted"></i>
                        ${DateUtils.formatearPeriodicidad(
                                row.PeriodicidadMantenimiento,
                                row.DiaInicioMant,
                                row.DiaFinMant,
                                row.FechaInicioMantenimiento
                            )}`;
                        }
                    },
                    // ✅ Col 11: Hora Apertura
                    {
                        data: "HoraApertura",
                        className: "text-center",
                        render: (data, type, row) => {
                            return `<i class="bi bi-clock me-1 text-muted"></i>${data || ''}`;
                        }
                    },
                    // ✅ Col 12: Hora Cierre
                    {
                        data: "HoraCierre",
                        className: "text-center",
                        render: (data, type, row) => {
                            return `<i class="bi bi-clock-history me-1 text-muted"></i>${data || ''}`;
                        }
                    },
                    // ✅ Col 13: Tiempo Invertido (Hrs)
                    {
                        data: "TiempoInvertido",
                        className: "text-center",
                        render: (data, type, row) => {
                            return `<i class="bi bi-stopwatch me-1 text-muted"></i>
                        ${data ? `${data} HRS` : ''}`;
                        }
                    },
                    // ✅ Col 14: Usuario Generó
                    {
                        data: "UsuarioGenero",
                        render: (data, type, row) => {
                            let user = data || '';
                            return `<span class="badge btn-ptm-mid badge-custom">
                                <i class="bi bi-person-circle me-1"></i>${user}
                            </span>`;
                        }
                    },
                    // ✅ Col 15: Tipo Mantenimiento
                    {
                        data: "TipoMantenimiento",
                        className: "text-center",
                        render: (data, type, row) => {
                            let tipo_mantenimiento = this.datos_usuario[0].PLANTA == "2" ? "Preventivo" : "Z20";
                            return `<span class="badge btn-ptm-secondary badge-custom">
                                <i class="bi bi-wrench-adjustable me-1"></i>${tipo_mantenimiento}
                            </span>`;
                        }
                    },
                    // ✅ Col 16: Texto Breve (oculta por defecto)
                    {
                        data: "DescripcionEquipo",
                        className: "text-center",
                        render: (data, type, row) => {
                            return `<i class="bi bi-card-text me-1 text-muted"></i>${data || ''}`;
                        }
                    },
                    // ✅ Col 17: Comentarios
                    {
                        data: null,
                        render: (data, type, row) => {
                            return "";
                        }
                    }
                ],
                columnDefs: [
                    // Columnas no ordenables
                    { orderable: false, targets: [0, 1, 2, 7, 9, 10, 11, 12, 17] },

                    // Centrado de columnas
                    { className: "text-center", targets: [0, 1, 2, 3, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17] },

                    // 🙈 Columnas ocultas
                    /*{ visible: false, targets: 16 },  // Texto Breve*/

                    // 🎯 PRIORIDADES RESPONSIVE
                    { responsivePriority: 1, targets: 0 },  // Control +/-
                    { responsivePriority: 2, targets: 1 },  // Checkbox
                    { responsivePriority: 3, targets: 2 },  // Acciones
                    { responsivePriority: 4, targets: 3 },  // Número Orden
                    { responsivePriority: 5, targets: 4 },  // Equipo
                    { responsivePriority: 6, targets: 5 },  // Proceso
                    { responsivePriority: 7, targets: 6 },  // Línea
                    { responsivePriority: 8, targets: 7 },  // Estatus Orden
                    { responsivePriority: 9, targets: 8 },  // Fecha Referencia
                    { responsivePriority: 10, targets: 9 },  // Mantenimiento Programado
                    { responsivePriority: 11, targets: 10 },  // Periodicidad MP
                    { responsivePriority: 12, targets: 11 },  // Hora Apertura
                    { responsivePriority: 13, targets: 12 },  // Hora Cierre
                    { responsivePriority: 14, targets: 13 },  // Tiempo Invertido
                    { responsivePriority: 15, targets: 14 },  // Usuario Generó
                    { responsivePriority: 16, targets: 15 },  // Tipo Mantenimiento
                    { responsivePriority: 17, targets: 16 },  // Texto Breve
                    { responsivePriority: 18, targets: 17 },  // Comentarios
                ],
                ordering: false,
                info: true,
                bPaginate: true,
                pageLength: 1000,
                lengthMenu: [[10, 25, 50, 100, 200, 500, 1000], [10, 25, 50, 100, 200, 500, 1000]],
                language: {
                    lengthMenu: "Mostrar _MENU_ registros",
                    zeroRecords: "No se encontraron resultados",
                    info: "Registros del _START_ al _END_ de un total de _TOTAL_ registros",
                    infoEmpty: "Registros del 0 al 0 de un total de 0 registros",
                    infoFiltered: "(filtrado de un total de _MAX_ registros)",
                    sSearch: "Buscar:",
                    oPaginate: {
                        sFirst: "Primero",
                        sLast: "Último",
                        sNext: "Siguiente",
                        sPrevious: "Anterior"
                    },
                    sProcessing: "Cargando datos, por favor espere...",
                    emptyTable: "No hay datos disponibles en la tabla"
                },
                createdRow: function (row, data, dataIndex) {


                    $(row).attr('data-id-equipo', data.IdEquipo);
                    $(row).attr('data-numero-ocurrencia', data.NumeroOcurrencia);
                    $(row).attr('data-area', data.Area);
                    $(row).attr('data-linea', data.LineaProduccion);
                    $(row).attr('data-periodicidad', data.PeriodicidadMantenimiento);
                    $(row).attr('data-id-periodicidad', data.IdPeriodicidad);
                    $(row).attr('data-fecharealinicio', data.FechaRealInicio);
                    $(row).attr('data-fecharealfin', data.FechaRealFin);
                    $(row).attr('data-enviarsiguientemes', data.EnviarSiguienteMes);

                    $(row).data('mantenimiento-completo', {
                        idEquipo: data.IdEquipo,
                        idPeriodicidad: data.IdPeriodicidad,
                        nombreEquipo: (data.NombreEquipo + ' ' + data.NumeroDocPmCalidad),
                        descripcionEquipo: data.DescripcionEquipo,
                        area: data.Area,
                        lineaProduccion: data.LineaProduccion,
                        periodicidadMantenimiento: data.PeriodicidadMantenimiento,
                        numeroOcurrencia: data.NumeroOcurrencia,
                        fechaInicioMantenimiento: data.FechaInicioMantenimiento,
                        fechaFinMantenimiento: data.FechaFinMantenimiento,
                        fechaReferencia: data.FechaReferencia,
                        diaInicioMant: data.DiaInicioMant,
                        diaFinMant: data.DiaFinMant,
                        tipoMantenimiento: data.TipoMantenimiento
                    });

                    // 🔴 PINTAR FILA SI HAY SOLICITUD PENDIENTE DE REPROGRAMACIÓN
                    // if (data.TieneSolicitudPendiente === 'SI') {
                    //     $(row).addClass('reprogramacion-pendiente');
                    // }

                    // 🔴 PINTAR FILA - lógica nueva con EnviarSiguienteMes y fechas reales
                    const enviarSiguiente = data.EnviarSiguienteMes === 1;
                    const tieneFechaRealInicio = data.FechaRealInicio !== null && data.FechaRealInicio !== undefined && data.FechaRealInicio !== '';
                    const tieneFechaRealFin = data.FechaRealFin !== null && data.FechaRealFin !== undefined && data.FechaRealFin !== '';

                    if (enviarSiguiente && !tieneFechaRealInicio && !tieneFechaRealFin) {
                        $(row).addClass('reprogramacion-pendiente');
                    }

                    // 🟢 PINTAR FILA SI YA FUE REPROGRAMADO
                    if (data.FueReprogramado === 'SI') {
                        $(row).addClass('mantenimiento-reprogramado');
                    }
                },
                drawCallback: function () {

                    table.columns.adjust();

                    const api = this.api();

                    // 🔥 Corregir ancho del empty table
                    if (api.data().count() === 0) {

                        const totalColumnas = api.columns().visible().reduce((a, b) => a + (b ? 1 : 0), 0);

                        $('#tablaMantenimientosRango tbody td.dt-empty')
                            .attr('colspan', totalColumnas)
                            .css({
                                'text-align': 'center',
                                'width': '100%'
                            });

                        return;
                    }

                    // =====================================
                    // Detectar mantenimientos coincidentes
                    // =====================================

                    let grupos = {};

                    api.rows({ page: 'current' }).every(function () {

                        let data = this.data();

                        let llave =
                            data.IdEquipo + '|' +
                            data.FechaInicioMantenimiento + '|' +
                            data.FechaFinMantenimiento;

                        if (!grupos[llave]) {
                            grupos[llave] = [];
                        }

                        grupos[llave].push(this.node());

                    });

                    Object.keys(grupos).forEach(function (key) {

                        if (grupos[key].length > 1) {

                            grupos[key].forEach(function (row) {

                                $(row).addClass('mp-periodicidad-duplicada');

                            });

                        }

                    });

                }
            });

            // ✅ Ajustar cuando cambia el tamaño de ventana
            $(window).on('resize', function () {
                if ($.fn.DataTable.isDataTable('#tablaMantenimientosRango')) {
                    const nuevoOffset = calcularHeaderOffset();
                    $('#tablaMantenimientosRango').DataTable().fixedHeader.headerOffset(nuevoOffset);
                    $('#tablaMantenimientosRango').DataTable().fixedHeader.adjust();
                }
            });

            return table;

        } catch (error) {
            AlertManager.mostrar('No es posible mostrar los mantenimientos: ' + error, 'warning');
            console.error('Error en llenarMantenimientosPorRango:', error);
        }
    }

    buildDataAttributesMP(row) {
        const map = {
            idequipo: row.IdEquipo,
            planta: row.Planta,
            numerodocpmcalidad: row.NumeroDocPmCalidad,
            nombreequipo: row.NombreEquipo,
            descripcionequipo: row.DescripcionEquipo,
            idarea: row.Idarea,
            area: row.Area,
            idlineaproduccion: row.IdLineaProduccion,
            lineaproduccion: row.LineaProduccion,
            centrocostos: row.CentroCostos,
            periodicidadmantenimiento: row.PeriodicidadMantenimiento,
            idperiodicidad: row.IdPeriodicidad,
            idequipoperiodicidad: row.IdEquipoPeriodicidad, //IDENTIFICADOR DE RUTINA
            diainiciomant: row.DiaInicioMant,
            diafinmant: row.DiaFinMant,
            fechainiciomant: row.FechaInicioMant,
            mesmantenimiento: row.MesMantenimiento,
            fechainiciomantenimiento: row.FechaInicioMantenimiento,
            fechafinmantenimiento: row.FechaFinMantenimiento,
            fechareferencia: row.FechaReferencia,
            tipomantenimiento: row.TipoMantenimiento,

            numeroorden: row.NumeroOrden,
            horaapertura: row.HoraApertura,
            horacierre: row.HoraCierre,
            tiempoinvertido: row.TiempoInvertido,

            estatusorden: row.EstatusOrden,
            descestatusorden: row.DescEstatusOrden,
            idmantenimiento: row.IdMantenimiento,
            ordentrabajofinalizada: row.OrdenTrabajoFinalizada,
            rutinacompletada: row.RutinaCompletada,
            comentariosRutina: row.ComentariosRutina,

            // 🔥 NUEVOS (los del SP)
            horainicio: row.HoraInicio,
            horafin: row.HoraFin,
            textosecuencia: row.TextoSecuencia,
            duracionhrs: row.DuracionHrs,

            firmarealizo: row.FirmaRealizo,
            nombrerealizo: row.NombreRealizo,
            firmasuperviso: row.FirmaSuperviso,
            nombresuperviso: row.NombreSuperviso,
            firmamantenimiento: row.FirmaMantenimiento,
            tieneRefacciones: row.TieneRefacciones,
            nombremantenimiento: row.NombreMantenimiento,

            enviarSiguienteMes: row.EnviarSiguienteMes,
            fechaRealInicio: row.FechaRealInicio,
            fechaRealFin: row.FechaRealFin,
            motivo: row.Motivo,
            fechaInicioPeriodo: row.FechaInicioPeriodo,
            fechaFinPeriodo: row.FechaFinPeriodo,

            // ✅ v4: para el flujo de reprogramación
            fuereprogramado: row.FueReprogramado,
            tienesolicitudpendiente: row.TieneSolicitudPendiente,
            idsolicitudpendiente: row.IdSolicitudPendiente
        };

        return Object.entries(map)
            .map(([key, value]) =>
                `data-${key}="${(value ?? '').toString().replace(/"/g, '&quot;')}"`
            )
            .join(' ');
    }

    // ============================
    // AGREGAR MANTENIMIENTO
    // ============================
    abrirModalAgregar(e) {
        e.preventDefault();
        $('#agregarMantenimientoModal').modal('show');
    }

    guardarMantenimiento() {
        // Validar formulario
        const equipo = $('#equipoSelect').val();
        const linea = $('#lineaSelect').val();
        const fecha = $('#fechaMantenimiento').val();
        const estatus = $('#estatusSelect').val();
        const ordenTrabajo = $('#ordenTrabajo').val();

        if (!equipo || !linea || !fecha || !estatus) {
            AlertManager.mostrar('Por favor, complete todos los campos obligatorios', 'warning');
            return;
        }

        // Formatear fecha
        const fechaFormateada = DateUtils.formatearFecha(fecha);
        const claseBadge = EstatusManager.obtenerClaseBadge(estatus);

        // Crear nueva fila
        const nuevaFila = `
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

        AlertManager.mostrar('Mantenimiento preventivo programado correctamente', 'success');
    }

    // ============================
    // FILTROSconfigurarEventosFiltrosMantenimientos
    // ============================
    aplicarFiltros() {
        AlertManager.mostrar('Funcionalidad de filtro será implementada próximamente', 'info');
    }

    seleccionarTodos(e) {
        $('.row-checkbox').prop('checked', $(e.target).prop('checked'));
    }

    // ============================
    // REFACCIONES
    // ============================
    abrirModalRefaccion(btn) {
        // ===== OBTENER TODOS LOS DATA ATTRIBUTES =====
        const idEquipo = btn.data('idequipo');
        const planta = btn.data('planta');
        const numeroDocPmCalidad = btn.data('numerodocpmcalidad');
        const nombreEquipo = btn.data('nombreequipo');
        const descripcionEquipo = btn.data('descripcionequipo');
        const idArea = btn.data('idarea');
        const area = btn.data('area');
        const idLineaProduccion = btn.data('idlineaproduccion');
        const lineaProduccion = btn.data('lineaproduccion');
        const centrocostos = btn.data('centrocostos');
        const periodicidadMantenimiento = btn.data('periodicidadmantenimiento');
        const diaInicioMant = btn.data('diainiciomant');
        const diaFinMant = btn.data('diafinmant');
        const fechaInicioMant = btn.data('fechainiciomant');
        const mesMantenimiento = btn.data('mesmantenimiento');
        const fechaInicioMantenimiento = btn.data('fechainiciomantenimiento');
        const fechaFinMantenimiento = btn.data('fechafinmantenimiento');
        const fechaReferencia = btn.data('fechareferencia');
        const tipoMantenimiento = btn.data('tipomantenimiento');
        const numeroOrden = btn.data('numeroorden');
        const horaApertura = btn.data('horaapertura');
        const estatusOrden = btn.data('estatusorden');
        const descEstatusOrden = btn.data('descestatusorden');
        const idMantenimiento = btn.data('idmantenimiento');

        // Llenar el modal con los datos
        $("#formSolicitarRefaccion")[0].reset();
        ValidationManager.limpiarValidacion('#formSolicitarRefaccion'); // AGREGAR ESTA LÍNEA
        $('#ROT').val(numeroOrden);
        $('#REquipo').val(nombreEquipo + ' ' + numeroDocPmCalidad);
        $('#RLinea').val(lineaProduccion);
        $('#RFechaMantenimiento').val(fechaReferencia);

        this.appReferencia.gestionArticulosMP.limpiar();


        this.ID_EQUIPO = idEquipo;
        this.ID_MANTENIMIENTO = idMantenimiento;
        $('#solicitarRefaccionModal').modal('show');
    }

    enviarSolicitudRefaccion(e) {
        e.preventDefault();

        // ✅ Validar que haya artículos en la tabla
        const articulos = this.appReferencia ? this.appReferencia.gestionArticulosMP.obtenerArticulos() : [];
        if (articulos.length === 0) {
            AlertManager.mostrar('Agregue al menos un artículo a la solicitud.', 'warning', 'alertRefaccionContainer');
            return;
        }

        // Validar prioridad y descripción
        if (!ValidationManager.validarFormulario('#formSolicitarRefaccion')) {
            AlertManager.mostrar('Por favor, complete correctamente todos los campos', 'warning', 'alertRefaccionContainer');
            return false;
        }

        // ✅ Recopilar los datos con múltiples artículos
        const datos = {
            Articulos: articulos.map(art => ({
                RefaccionSolicitada: art.CodigoArticulo,
                Cantidad: art.Cantidad,
                IdEquipo: this.ID_EQUIPO,
                OrdenTrabajo: $('#ROT').val(),
                IdMantenimiento: parseInt(this.ID_MANTENIMIENTO),
                Estatus: 3,
                NivelUrgencia: $('#RurgenciaRefaccion').val(),
                DescripcionNecesidad: $('#RdescripcionNecesidad').val(),
                UsuarioSolicita: this.datos_usuario[0].EMAIL,
                Planta: this.datos_usuario[0].PLANTA
            })),
            OrdenTrabajo: $('#ROT').val(),
            IdEquipo: this.ID_EQUIPO,
            IdMantenimiento: parseInt(this.ID_MANTENIMIENTO),
            Estatus: 3,
            NivelUrgencia: $('#RurgenciaRefaccion').val(),
            DescripcionNecesidad: $('#RdescripcionNecesidad').val(),
            UsuarioSolicita: this.datos_usuario[0].EMAIL,
            Planta: this.datos_usuario[0].PLANTA
        };

        $("#btnSolicitarRefaccion").html('<span class="spinner-border spinner-border-sm me-2"></span>Guardando...');
        $("#btnSolicitarRefaccion").prop("disabled", true);

        let TipoUsuario = this.datos_usuario[0].TIPOUSUARIO;

        $.ajax({
            url: `/${this.URLBase}/InsertarSolicitudRefaccion`,
            type: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Rol-Usuario': TipoUsuario  // 👈 esto
            },
            contentType: 'application/json; charset=utf-8',
            data: JSON.stringify(datos),
            dataType: 'json',
            success: (response) => {
                if (response.Status === 'SI') {
                    $("#btnSolicitarRefaccion").html('<i class="bi bi-check-circle-fill text-white me-2"></i>Solicitud generada correctamente');
                    $("#btnSolicitarRefaccion").prop("disabled", false);

                    // Limpiar formulario y tabla
                    $("#formSolicitarRefaccion")[0].reset();
                    $("#formSolicitarRefaccion").removeClass("was-validated");

                    // ✅ Limpiar tabla de artículos
                    if (this.appReferencia) {
                        this.appReferencia.gestionArticulosMP.limpiar();
                    }

                    // Recargar DataTable
                    $('#tablaMantenimientosRango').DataTable().ajax.reload(null, false);

                    setTimeout(function () {
                        $("#btnSolicitarRefaccion").html('<i class="bi bi-save me-1"></i>Guardar');
                        $("#solicitarRefaccionModal").modal('hide');
                    }, 3000);

                } else {
                    $("#btnSolicitarRefaccion").html('<i class="bi bi-save me-1"></i>Guardar');
                    $("#btnSolicitarRefaccion").prop("disabled", false);
                    AlertManager.mostrar(response.Message || 'Error al realizar la solicitud de refacción', 'warning', "alertRefaccionContainer");
                }
            },
            error: (xhr, status, error) => {
                $("#btnSolicitarRefaccion").html('<i class="bi bi-save me-1"></i>Guardar');
                $("#btnSolicitarRefaccion").prop("disabled", false);
                AlertManager.mostrar('Error al conectar con el servidor', 'warning', "alertRefaccionContainer");
            }
        });
    }

    // ============================
    // GENERAR ÓRDENES
    // ============================
    generarOrdenes() {
        try {
            const checkboxes = $('#tablaMantenimientosRango .row-checkbox:checked');
            if (checkboxes.length === 0) {
                AlertManager.mostrar('Debe seleccionar al menos una fila para generar las órdenes de trabajo.', 'warning');
                return;
            }
            let Usuario = this.datos_usuario[0].EMAIL;
            let TipoUsuario = this.datos_usuario[0].TIPOUSUARIO;
            // Obtener array de objetos con ID, Nombre y Fechas del Periodo
            const equiposSeleccionados = checkboxes.map(function () {
                const fila = $(this).closest('tr');
                const datosCompletos = fila.data('mantenimiento-completo');
                return {
                    IdEquipo: datosCompletos.idEquipo,
                    IdPeriodicidad: datosCompletos.idPeriodicidad,
                    NombreEquipo: datosCompletos.nombreEquipo,
                    FechaInicioMantenimiento: datosCompletos.fechaInicioMantenimiento,  // ✅ NUEVO
                    FechaFinMantenimiento: datosCompletos.fechaFinMantenimiento,         // ✅ NUEVO
                    Usuario: Usuario         // ✅ NUEVO
                };
            }).get();

            $.ajax({
                url: `/${this.URLBase}/InsertarMP`,
                type: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Rol-Usuario': TipoUsuario  // 👈 esto
                },
                contentType: 'application/json; charset=utf-8',
                data: JSON.stringify(equiposSeleccionados),
                dataType: 'json',
                beforeSend: function () {
                    GlobalUtil.mostrarLoader(true);
                },
                success: (response) => {
                    if (response.Status === 'SI') {
                        $('#tablaMantenimientosRango').DataTable().ajax.reload(null, false);
                        AlertManager.mostrar(response.Message, 'success');
                    } else {
                        $("#btnGuardarEquipo").html('<i class="bi bi-save me-1"></i>Guardar');
                        $("#btnGuardarEquipo").prop("disabled", false);
                        AlertManager.mostrar(response.Message || 'Error al generar las ordenes de trabajo', 'warning');
                    }
                    GlobalUtil.mostrarLoader(false);
                },
                error: (xhr, status, error) => {
                    $("#btnGuardarEquipo").html('<i class="bi bi-save me-1"></i>Guardar');
                    $("#btnGuardarEquipo").prop("disabled", false);
                    AlertManager.mostrar('Error al conectar con el servidor,intente de nuevo más tarde', 'warning', "alertEquipoContainer");
                    GlobalUtil.mostrarLoader(false);
                }
            });
        }
        catch (error) {
            AlertManager.mostrar('No es posible generar las ordenes de trabajo: ' + error, 'warning');
        }
    }

    // ============================
    // ORDENES TRABAJO
    // ============================
    async abrirModalCaratulaOnline(btn) {
        try {
            // ========================================
            // 1️ MODAL
            // ========================================
            $('#modalOrdenMantenimiento').modal('show');

            // ========================================
            // 3 DATA
            // ========================================
            const data = this.getDataFromButtonMP(btn);

            if (!btn || !btn.data()) {
                console.error("❌ Botón inválido o sin data");
                AlertManager.mostrar("No se pudo obtener información de la orden, intente de nuevo más tarde.", "warning");
                return;
            }

            // 🔥 Tipo operación
            this.TIPO_OPERACION = (data.estatusOrden == "4" ? "U" : "I");

            // ========================================
            // 4 RESET
            // ========================================
            $("#formOrdenMantenimiento")[0].reset();
            ValidationManager.limpiarValidacion('#formOrdenMantenimiento');

            $("#btnGuardarOT").prop("disabled", false);
            $("#btnGuardarOT").removeClass("btn_disabled");

            this.gestionFirmas.limpiarTodasLasFirmas();
            // ✅ VARIABLE GLOBAL PARA ALMACENAR ARCHIVOS
            window.imagenesRutina = [];
            // ✅ VARIABLE GLOBAL PARA ALMACENAR TECNICOS
            this.gestionTecnicos.tecnicosAsignados = [];

            $("#listaTecnicosAsignados").empty().append(`<div style="font-size:0.85rem; color:var(--modal-text-muted);">
                                            <i class="bi bi-info-circle me-2"></i>No hay técnicos asignados
                                        </div>"`);

            // ========================================
            // 5 DATOS GENERALES
            // ========================================
            $('#NumeroOrden').val(data.numeroOrden || '');
            $('#Solicitante').val(this.datos_usuario[0].EMAIL || '');
            $('#ClaseMantenimiento').val('Z20'); // 🔥 Preventivo
            $("#EstatusOrden").val(data.descEstatusOrden || '');

            $('#NombreEquipo').val(data.nombreEquipo || '');
            $('#DescEquipo').val(data.descripcionEquipo || '');

            // ========================================
            // 6 FECHA / HORA APERTURA
            // ========================================
            if (data.horaApertura && data.horaApertura.includes(' ')) {
                try {
                    const [fechaParte, horaParte] = data.horaApertura.split(' ');
                    const [dia, mes, anio] = fechaParte.split('/');

                    if (dia && mes && anio && horaParte) {
                        $("#FechaInicioExtrema").val(`${anio}-${mes}-${dia}`);
                        $("#HoraInicio").val(horaParte.substring(0, 5));
                    }
                } catch (err) {
                    console.warn("⚠️ Error parseando horaApertura:", data.horaApertura);
                }
            }

            // ========================================
            // 7 UBICACIÓN / DATOS TÉCNICOS
            // ========================================
            $("#UbicacionTecnica").val(data.area ? `AREA ${data.area}` : '');
            $("#CentroCostos").val(data.centroCostos || '');
            $("#NumDocPmCalidad").val(data.numeroDocPmCalidad || '');
            $("#Linea").val(data.lineaProduccion || '');
            $("#DescripcionEquipo").val(data.descripcionEquipo || '');
            $("#NumeroEquipo").val(data.numeroDocPmCalidad || '');

            const codigo_mantenimiento =
                (this.datos_usuario[0].PLANTA == "1" ? "PL1" : "PL2") +
                "-PMT" + (data.area || '') + "01-L01-F01";

            $("#CodigoMantenimiento").val(codigo_mantenimiento);
            $("#GrupoPlaneacion").val(this.datos_usuario[0].PLANTA + "_" + (data.area || ''));

            $("#fechaImpresion").text(DateUtils.obtenerFechaHora());

            // ========================================
            // 8 REGISTRO DE TRABAJO
            // ========================================
            if (data.horaInicio) {
                $("#HoraInicioTrabajo").val(data.horaInicio.substring(0, 5));
            }

            if (data.horaFin) {
                $("#HoraFin").val(data.horaFin.substring(0, 5));
            }

            $("#TextoSecuencia").val(data.textoSecuencia || '');
            $("#DuracionHrs").val(data.duracionHrs || '');
            $("#DuracionHrs").val(data.duracionHrs || '');

            // ========================================
            // 9 IDS
            // ========================================
            this.ID_EQUIPO = data.idEquipo;
            this.ID_MANTENIMIENTO = data.idMantenimiento;

            // ========================================
            // 10 RUTINA (CLAVE EN MP)
            // ========================================
            $('#rutinaNombreEquipo').text(data.nombreEquipo + ' ' + data.numeroDocPmCalidad);
            $('#rutinaProceso').text(data.area);

            // ========================================
            // LIMPIAR EVIDENCIA TECNICO IMAGENES
            // ========================================
            $("#galeriaEvidenciaRutina").remove();

            // ========================================
            // 11 CONFIGURACIÓN POR ROL
            // ========================================
            const tipoUsuario = this.datos_usuario?.[0]?.TIPOUSUARIO || "";

            switch (tipoUsuario) {

                // ============================
                // 🔧 TÉCNICO
                // ============================
                case "TecnicoMtto":

                    if (typeof this.configurarVistaTecnico === "function") {
                        await this.configurarVistaTecnico(data.estatusOrden, data.firmaRealizo, data.firmaSuperviso, data.firmaMantenimiento, data.idEquipo, data.planta, data.numeroOrden, data.idEquipoPeriodicidad);
                    } else {
                        console.error("❌ configurarVistaTecnico no definido");
                    }
                    break;


                // ============================
                // 🏭 PRODUCCIÓN
                // ============================
                case "Produccion":
                case "SupervisorProduccion":

                    if (typeof this.configurarVistaProduccion === "function") {
                        this.configurarVistaProduccion(
                            data.estatusOrden,
                            data.firmaRealizo,
                            data.firmaSuperviso,
                            data.firmaMantenimiento,
                            data.numeroOrden,
                            data.idEquipo,
                            data.planta,
                            data.idEquipoPeriodicidad,
                            data.comentariosRutina
                        );
                    } else {
                        console.error("❌ configurarVistaProduccion no definido");
                    }
                    break;


                // ============================
                // 👨‍💼 ADMIN / ADMIN MTTO
                // ============================
                case "AdminMtto":
                case "Administrador":
                case "SupervisorMantenimiento":

                    if (typeof this.configurarVistaAdministrador === "function") {
                        this.configurarVistaAdministrador(
                            data.estatusOrden,
                            data.firmaRealizo,
                            data.firmaSuperviso,
                            data.firmaMantenimiento,
                            data.numeroOrden,
                            data.idEquipo,
                            data.planta,
                            data.idEquipoPeriodicidad,
                            data.comentariosRutina
                        );
                    } else {
                        console.error("❌ configurarVistaAdministrador no definido");
                    }

                    break;


                // ============================
                // 🧠 FALLBACK (CRÍTICO)
                // ============================
                default:

                    console.warn("⚠️ Tipo de usuario no reconocido:", tipoUsuario);

                    if (typeof this.configurarVistaAdministrador === "function") {
                        this.configurarVistaAdministrador(
                            data.estatusOrden,
                            data.firmaRealizo,
                            data.firmaSuperviso,
                            data.firmaMantenimientso,
                            data.numeroOrden,
                            data.idEquipo,
                            data.planta,
                            data.idEquipoPeriodicidad,
                            data.comentariosRutina
                        );
                    } else {
                        console.error("❌ configurarVistaAdministrador no definido");
                    }

                    break;
            }

            // ========================================
            // 🔥 1️0 FIRMAS
            // ========================================
            this.gestionFirmas.queueFirma('realizo', data.firmaRealizo, data.nombreRealizo, (data.estatusOrden == 2 ? false : true));
            this.gestionFirmas.queueFirma('superviso', data.firmaSuperviso, data.nombreSuperviso);
            this.gestionFirmas.queueFirma('mantenimiento', data.firmaMantenimiento, data.nombreMantenimiento);

            // ========================================
            // 🔥 1️1 TÉCNICOS
            // ========================================
            this.cargarTecnicos(data.numeroOrden, "MP");

        }
        catch (error) {
            console.error("❌ Error en abrirModalCaratulaOnline:", error);
            AlertManager.mostrar("Error al abrir la orden, intente de nuevo más tarde.", "danger");
        }
    }

    getDataFromButtonMP(btn) {
        const d = btn.data();

        return {
            idEquipo: d.idequipo,
            planta: d.planta,
            numeroDocPmCalidad: d.numerodocpmcalidad,
            nombreEquipo: d.nombreequipo,
            descripcionEquipo: d.descripcionequipo,
            area: d.area,
            lineaProduccion: d.lineaproduccion,
            centroCostos: d.centrocostos,

            periodicidadMantenimiento: d.periodicidadmantenimiento,
            idPeriodicidad: d.idperiodicidad,
            idEquipoPeriodicidad: d.idequipoperiodicidad,
            fechaInicioMantenimiento: d.fechainiciomantenimiento,
            fechaFinMantenimiento: d.fechafinmantenimiento,
            fechaReferencia: d.fechareferencia,

            numeroOrden: d.numeroorden,
            horaApertura: d.horaapertura,
            horaCierre: d.horacierre,

            // 🔥 NUEVOS (IMPORTANTES)
            horaInicio: d.horainicio,
            horaFin: d.horafin,
            textoSecuencia: d.textosecuencia,
            duracionHrs: d.duracionhrs,

            estatusOrden: d.estatusorden,
            descEstatusOrden: d.descestatusorden,
            idMantenimiento: d.idmantenimiento,
            comentariosRutina: d.comentariosrutina,

            // 🔥 FIRMAS
            firmaRealizo: d.firmarealizo || '',
            nombreRealizo: d.nombrerealizo || '',
            firmaSuperviso: d.firmasuperviso || '',
            nombreSuperviso: d.nombresuperviso || '',
            firmaMantenimiento: d.firmamantenimiento || '',
            nombreMantenimiento: d.nombremantenimiento || ''
        };
    }

    cargarFirmasExistentes(firmas) {

        this.gestionFirmas._cargarFirmaFromDB('realizo', firmas.firmaRealizo, firmas.nombreRealizo);
        this.gestionFirmas._cargarFirmaFromDB('superviso', firmas.firmaSuperviso, firmas.nombreSuperviso);
        this.gestionFirmas._cargarFirmaFromDB('mantenimiento', firmas.firmaMantenimiento, firmas.nombreMantenimiento);

    }

    cargarTecnicos(numeroOrden, tipo) {

        const key = `${numeroOrden}_${tipo}`;

        //if (!this.cacheTecnicos) {
        //    this.cacheTecnicos = {};
        //}

        //// 🔥 CACHE
        //if (this.cacheTecnicos[key]) {
        //    if (this.cacheTecnicos[key].length > 0)
        //        this.gestionTecnicos.cargarTecnicosDesdeDB(this.cacheTecnicos[key]);
        //    return;
        //}

        $.ajax({
            url: `/${this.URLBaseCorrectivos}/ObtenerTecnicosOT`,
            type: 'GET',
            data: {
                numeroOrden: numeroOrden,
                tipo: tipo
            },
            dataType: 'json',

            beforeSend: () => {
                $('#listaTecnicosAsignados').html(`
                <div class="text-center py-2">
                    <div class="spinner-border spinner-border-sm text-primary"></div>
                </div>
            `);
            },

            success: (data) => {

                //this.cacheTecnicos[key] = data;

                this.gestionTecnicos.cargarTecnicosDesdeDB(data);
            },

            error: (xhr, status, error) => {

                $('#listaTecnicosAsignados').html(`
                <div style="color:red; font-size:0.9rem;">
                    Error al cargar técnicos
                </div>
            `);

                console.error(error);
            }
        });
    }

    async cargarTecnicosLista(numeroOrden, tipo) {

        const key = `${numeroOrden}_${tipo}`;

        if (!this.cacheTecnicos) {
            this.cacheTecnicos = {};
        }

        // 🔥 CACHE
        if (this.cacheTecnicos[key]) {
            return this.cacheTecnicos[key];
        }

        try {
            const response = await $.ajax({
                url: `/${this.URLBase}/ObtenerTecnicosOT`,
                type: 'GET',
                data: {
                    numeroOrden: numeroOrden,
                    tipo: tipo
                },
                dataType: 'json'
            });

            this.cacheTecnicos[key] = response;

            return response;

        } catch (error) {
            console.error("Error obteniendo técnicos:", error);
            return [];
        }
    }

    // ========================================
    // 🔧 CONFIGURAR VISTA TÉCNICO (CORRECTIVO)
    // ========================================
    async configurarVistaTecnico(EstatusOrden, FirmaTecnico, FirmaSupervisor, FirmaMantenimiento, IdEquipo, Planta, NumeroOrden, IdEquipoPeriodicidad) {

        //Cambiar títulos de firma dependiendo la planta
        switch (this.datos_usuario[0].PLANTA) {
            case 1:
                $("#supervisor_mantenimiento_sign").text("Coordinador Mantenimiento");
                $("#supervisor_producción_sign").text("Supervisor/Jefe Proceso");
                break;
            case 2:
                break;

        }

        // MOSTRAR SECCIONES SI LA ORDEN YA FUE ATENDIDA POR EL TÉCNICO
        if (EstatusOrden == 4) {
            $('#EvidenciaOrdenTrabajo').removeClass('d-none');
            $('#CierreOrdenTrabajo').removeClass('d-none');

            // ========================================
            // 🔥 DESHABILITAR TODOS LOS INPUTS
            // ========================================
            //HORA DE INICIO
            $("#HoraInicio").prop('readonly', true).prop('required', false);

            //HORA DE FIN
            $("#HoraFin").prop('readonly', true).prop('required', false);

            //TEXTO DE SECUENCIA
            $("#TextoSecuencia").prop('readonly', true).prop('required', false);

            // BUSCAR TÉCNICOS
            $("#BuscarTecnico").prop('readonly', true).prop('required', false).prop('disabled', true);

            // DURACIÓN
            $("#DuracionHrs").prop('readonly', true).prop('required', false);

            // BOTONES
            $('#btnGuardarOT').removeClass('d-none');
            $('#btnExportMantenimientoPDF').removeClass('d-none');

            //INPUTS FIRMAS
            $('#firmaMantenimientoContainer input[type="text"]').prop('required', false);
            $('#firmaRealizoContainer input[type="text"]').prop('required', false);
            $('#firmaSupervisoContainer input[type="text"]').prop('required', true);

            //LISTA DE TECNICOS
            $('#listaTecnicosAsignados').addClass('tecnicos-readonly');
            $("#busqueda_tecnicosMainContainer").addClass("d-none");

            //SECCION PARA CARGAR IMAGENES
            $("#EvidenciaOrdenTrabajo").addClass("d-none");

            // Deshabilitar uploader
            $('#uploadArea').addClass('upload-area-disabled');
            $('#uploadInfo').hide();
            $('#clearAll').hide();
            const uploaderDisabled = $('#uploadArea').data('imageUploader');
            if (uploaderDisabled && uploaderDisabled.disableUpload) {
                uploaderDisabled.disableUpload();
            }

            // BOTONES
            if (FirmaTecnico != "") {
                $('#btnGuardarOT').addClass('d-none').prop('disabled', true);
                $('#btnGuardarBorrador').addClass('d-none').prop('disabled', true);
            }
            else
                $('#btnGuardarOT').removeClass('d-none').prop('disabled', false);

            $('#btnExportMantenimientoPDF').addClass('d-none');

            if (FirmaSupervisor != "")
                this.gestionFirmas._bloquearFirma("Superviso", true);
            else
                this.gestionFirmas.deshabilitarFirma("Superviso", true);

            if (FirmaMantenimiento != "")
                this.gestionFirmas._bloquearFirma("Mantenimiento", true);
            else
                this.gestionFirmas.deshabilitarFirma("Mantenimiento", true);

            // 🔥 CARGAR ACTIVIDADES COMPLETADAS (READONLY)
            // await this.ConsultarRutinaServer(IdEquipo, Planta, IdEquipoPeriodicidad);
            this.ConsultarActividadesPorOTMP(NumeroOrden, IdEquipo, Planta, "");

            return;
        }

        // ========================================
        // 🔥 SI NO ES STATUS 4: HABILITAR TODO
        // ========================================
        // SECCIONES
        $('#btnGuardarOT').removeClass('d-none').prop('disabled', false);
        $('#btnGuardarBorrador').removeClass('d-none').prop('disabled', false);
        $('#EvidenciaOrdenTrabajo').removeClass('d-none');
        $('#CierreOrdenTrabajo').removeClass('d-none');
        $('#SeccionFirmas').removeClass('d-none');
        $("#busqueda_tecnicosMainContainer").removeClass('d-none');

        // ========================================
        // 🔥 HABILITAR TODOS LOS INPUTS
        // ========================================
        //HORA DE INICIO
        $("#HoraInicio").prop('readonly', false).prop('required', true);

        //HORA DE FIN
        $("#HoraFin").prop('readonly', false).prop('required', true);

        //TEXTO DE SECUENCIA
        $("#TextoSecuencia").prop('readonly', false).prop('required', true);

        // BUSCAR TÉCNICOS
        $("#BuscarTecnico").prop('readonly', false).prop('required', false).prop('disabled', false);

        // DURACIÓN
        $("#DuracionHrs").prop('readonly', true).prop('required', true); // Sigue readonly (calculado)

        // REQUIRED
        $('#EvidenciaOrdenTrabajo input:not(#fileInput)').prop('required', true);
        $('#CierreOrdenTrabajo input:not(#BuscarTecnico)').prop('required', true);
        $('#BuscarTecnico, #fileInput').prop('required', false);

        $('#btnExportMantenimientoPDF').addClass('d-none');

        // UPLOADER
        $('#previewArea').empty();
        $('#clearAll').hide();
        $('#uploadArea').removeClass('upload-area-disabled');
        $('#uploadInfo').show();

        const uploader = $('#uploadArea').data('imageUploader');
        if (uploader && uploader.enableUpload) {
            uploader.enableUpload();
        }

        // CAMPOS EDITABLES
        $("#Scrap").removeAttr('readonly').prop('required', true);
        $("#HoraCierreMan").removeAttr('readonly').prop('required', true);

        // 🔥 FIRMAS
        this.gestionFirmas.mostrarFirma('Realizo', true);
        $("#nombreRealizo").val(this.datos_usuario[0].NOMBRECOMPLETO.toUpperCase()).attr('readonly', true);
        this.gestionFirmas.mostrarFirma('Superviso', true);
        this.gestionFirmas.mostrarFirma('Mantenimiento', true);

        this.gestionFirmas.deshabilitarFirma('Superviso', true);
        this.gestionFirmas.deshabilitarFirma('Mantenimiento', true);

        $('#firmaRealizoContainer input[type="text"]').prop('required', true);
        $('#firmaSupervisoContainer input[type="text"]').prop('required', false);
        $('#firmaMantenimientoContainer input[type="text"]').prop('required', false);

        // ========================================
        //🔥 RUTINA
        // ========================================
        await this.ConsultarRutinaServer(IdEquipo, Planta, IdEquipoPeriodicidad);

        // 🔥 Si es BORRADOR → cargar/marcar actividades EDITABLE DESPUÉS de que se cargue la rutina
        // ConsultarRutinaServer() trae HTML limpio, necesitamos marcar lo ya guardado en BD
        if (EstatusOrden == 2 && typeof this.ConsultarActividadesPorOTMPEditable === "function") {
            this.ConsultarActividadesPorOTMPEditable(NumeroOrden, IdEquipo, Planta);
        }
    }

    // ========================================
    // 👨‍💼 CONFIGURAR VISTA ADMIN (PREVENTIVO)
    // ========================================
    configurarVistaAdministrador(EstatusOrden, FirmaTecnico, FirmaSuperviso, FirmaMantenimiento, NumeroOrden, IdEquipo, Planta, IdEquipoPeriodicidad, ComentariosRutina) {


        //Cambiar títulos de firma dependiendo la planta
        switch (this.datos_usuario[0].PLANTA) {
            case 1:
                $("#supervisor_mantenimiento_sign").text("Coordinador Mantenimiento");
                $("#supervisor_producción_sign").text("Supervisor/Jefe Proceso");
                break;
            case 2:
                break;

        }

        // MOSTRAR FIRMAS
        $('#SeccionFirmas').removeClass('d-none');

        // REQUIRED OFF PARA ADMIN, SIEMPRE LO LLENA EL TECNICO
        $('#EvidenciaOrdenTrabajo input').prop('required', false);
        $('#EvidenciaOrdenTrabajo input').prop('readonly', true);
        $('#CierreOrdenTrabajo input').prop('required', false);
        $('#CierreOrdenTrabajo input').prop('readonly', true);

        // 🔥 CAMPOS BLOQUEADOS DEFAULT ADMIN
        $("#Scrap").attr('readonly', true).prop('required', false);
        $("#HoraCierreMan").attr('readonly', true).prop('required', false);

        // 🔥 FIRMAS
        this.gestionFirmas.mostrarFirma('Realizo', true);
        this.gestionFirmas.mostrarFirma('Superviso', true);
        this.gestionFirmas.mostrarFirma('Mantenimiento', true);
        $("#nombreMantenimiento").val(this.datos_usuario[0].NOMBRECOMPLETO.toUpperCase()).attr('readonly', true);

        // bloquear correctamente
        // if (FirmaTecnico != "")
        //     this.gestionFirmas._bloquearFirma("Realizo", true);
        // else
        //     this.gestionFirmas.deshabilitarFirma("Realizo", true);

        // if (FirmaSuperviso != "")
        //     this.gestionFirmas._bloquearFirma("Superviso", true);
        // else
        //     this.gestionFirmas.deshabilitarFirma("Superviso", true);


        // 🔥 FIRMAS
        this._configureFirmas({
            showRealizo: true,
            showSuperviso: true,
            showMantenimiento: true,
            nombreSuperviso: this.datos_usuario[0].NOMBRECOMPLETO.toUpperCase(),
            bloquearRealizo: (FirmaTecnico != ""),
            bloquearSuperviso: (FirmaSuperviso != ""),
            bloquearMantenimiento: (FirmaMantenimiento != ""),
            deshabilitarRealizo: (FirmaTecnico == ""),
            deshabilitarSuperviso: (FirmaSuperviso == ""),
            deshabilitarMantenimiento: (FirmaMantenimiento != "")
        });

        // // bloquear correctamente (ya manejado por helper en la mayoría de casos)
        // if (FirmaTecnico != "") this.gestionFirmas._bloquearFirma("Realizo", true);
        // else this.gestionFirmas.deshabilitarFirma("Realizo", true);

        if (FirmaMantenimiento != "") this.gestionFirmas._bloquearFirma("Mantenimiento", true);

        //BOTON BORRADOR
        $('#btnGuardarBorrador').addClass('d-none').prop('disabled', true);


        // MOSTRAR SECCIONES SI LA ORDEN YA FUE ATENDIDA POR EL TÉCNICO
        if (EstatusOrden == 4) {
            $('#EvidenciaOrdenTrabajo').removeClass('d-none');
            $('#CierreOrdenTrabajo').removeClass('d-none');

            //TEXTO DE SECUENCIA
            $("#TextoSecuencia").prop('readonly', true);

            // BOTONES
            $('#btnGuardarOT').removeClass('d-none');
            $('#btnExportMantenimientoPDF').removeClass('d-none');

            //INPUTS FIRMAS
            $('#firmaMantenimientoContainer input[type="text"]').prop('required', true);
            $('#firmaRealizoContainer input[type="text"]').prop('required', false);
            $('#firmaSupervisoContainer input[type="text"]').prop('required', false);

            //LISTA DE TECNICOS
            $('#listaTecnicosAsignados').addClass('tecnicos-readonly');
            $("#busqueda_tecnicosMainContainer").addClass("d-none");

            //SECCION PARA CARGAR IMAGENES
            $("#EvidenciaOrdenTrabajo").addClass("d-none");

            // 🔥 Si la orden ya está atendida → cargar actividades READONLY
            this.ConsultarActividadesPorOTMP(NumeroOrden, IdEquipo, Planta, ComentariosRutina);

        }
        // OCULTAR SECCIONES SI LA ORDEN NO HA SIDO ATENDIDA POR EL TÉCNICO
        else {
            $('#EvidenciaOrdenTrabajo').addClass('d-none');
            $('#CierreOrdenTrabajo').addClass('d-none');

            // BOTONES
            $('#btnGuardarOT').addClass('d-none');
            $('#btnExportMantenimientoPDF').removeClass('d-none');

            //INPUTS FIRMAS
            $('#firmaMantenimientoContainer input[type="text"]').prop('required', false);
            $('#firmaRealizoContainer input[type="text"]').prop('required', false);
            $('#firmaSupervisoContainer input[type="text"]').prop('required', false);

            // ========================================
            //🔥 RUTINA
            // ========================================
            this.ConsultarRutinaServer(IdEquipo, Planta, IdEquipoPeriodicidad);
        }

        //IMPORTANTE SI YA FIRMO MANTENIMIENTO OCULTAR BOTON GUARDAR
        if (FirmaMantenimiento != "") {
            $("#btnGuardarOT").prop("disabled", true).addClass("d-none");
        }
    }

    // ========================================
    // 👨‍💼 CONFIGURAR VISTA PRODUCCION (CORRECTIVO)
    // ========================================
    configurarVistaProduccion(EstatusOrden, FirmaTecnico, FirmaSuperviso, FirmaMantenimiento, NumeroOrden, IdEquipo, Planta, IdEquipoPeriodicidad, ComentariosRutina) {

        //Cambiar títulos de firma dependiendo la planta
        switch (this.datos_usuario[0].PLANTA) {
            case 1:
                $("#supervisor_mantenimiento_sign").text("Coordinador Mantenimiento");
                $("#supervisor_producción_sign").text("Supervisor/Jefe Proceso");
                break;
            case 2:
                break;

        }

        // MOSTRAR FIRMAS
        $('#SeccionFirmas').removeClass('d-none');

        // REQUIRED OFF PARA ADMIN, SIEMPRE LO LLENA EL TECNICO
        $('#EvidenciaOrdenTrabajo input').prop('required', false);
        $('#EvidenciaOrdenTrabajo input').prop('readonly', true);
        $('#CierreOrdenTrabajo input').prop('required', false);
        $('#CierreOrdenTrabajo input').prop('readonly', true);
        // 🔥 CAMPOS BLOQUEADOS DEFAULT ADMIN
        $("#Scrap").attr('readonly', true).prop('required', false);
        $("#HoraCierreMan").attr('readonly', true).prop('required', false);

        // 🔥 FIRMAS
        this._configureFirmas({
            showRealizo: true,
            showSuperviso: true,
            showMantenimiento: true,
            nombreSuperviso: this.datos_usuario[0].NOMBRECOMPLETO.toUpperCase(),
            bloquearRealizo: (FirmaTecnico != ""),
            bloquearSuperviso: false,
            bloquearMantenimiento: (FirmaMantenimiento != ""),
            deshabilitarRealizo: (FirmaTecnico == ""),
            deshabilitarSuperviso: (FirmaSuperviso != ""),
            deshabilitarMantenimiento: (FirmaMantenimiento == "")
        });

        // bloquear correctamente (ya manejado por helper en la mayoría de casos)
        if (FirmaTecnico != "") this.gestionFirmas._bloquearFirma("Realizo", true);
        else this.gestionFirmas.deshabilitarFirma("Realizo", true);

        if (FirmaMantenimiento != "") this.gestionFirmas._bloquearFirma("Mantenimiento", true);


        //BOTON BORRADOR
        $('#btnGuardarBorrador').addClass('d-none').prop('disabled', true);

        // MOSTRAR SECCIONES SI LA ORDEN YA FUE ATENDIDA POR EL TÉCNICO
        if (EstatusOrden == 4) {
            $('#EvidenciaOrdenTrabajo').removeClass('d-none');
            $('#CierreOrdenTrabajo').removeClass('d-none');

            //TEXTO DE SECUENCIA
            $("#TextoSecuencia").prop('readonly', true);

            // BOTONES
            $('#btnGuardarOT').removeClass('d-none');
            $('#btnExportMantenimientoPDF').removeClass('d-none');

            //INPUTS FIRMAS
            $('#firmaMantenimientoContainer input[type="text"]').prop('required', false);
            $('#firmaRealizoContainer input[type="text"]').prop('required', false);
            $('#firmaSupervisoContainer input[type="text"]').prop('required', true);

            //LISTA DE TECNICOS
            $('#listaTecnicosAsignados').addClass('tecnicos-readonly');
            $("#busqueda_tecnicosMainContainer").addClass("d-none");

            //SECCION PARA CARGAR IMAGENES
            $("#EvidenciaOrdenTrabajo").addClass("d-none");


            // 🔥 Si la orden ya está atendida → cargar actividades READONLY
            this.ConsultarActividadesPorOTMP(NumeroOrden, IdEquipo, Planta, ComentariosRutina);

            if (FirmaSuperviso != "") this.gestionFirmas._bloquearFirma("Superviso", true);
            else this.gestionFirmas.deshabilitarFirma("Superviso", false);



        }
        // OCULTAR SECCIONES SI LA ORDEN NO HA SIDO ATENDIDA POR EL TÉCNICO
        else {
            $('#EvidenciaOrdenTrabajo').addClass('d-none');
            $('#CierreOrdenTrabajo').addClass('d-none');

            // BOTONES
            $('#btnGuardarOT').addClass('d-none');
            $('#btnExportMantenimientoPDF').removeClass('d-none');

            //INPUTS FIRMAS
            $('#firmaMantenimientoContainer input[type="text"]').prop('required', false);
            $('#firmaRealizoContainer input[type="text"]').prop('required', false);
            $('#firmaSupervisoContainer input[type="text"]').prop('required', false);

            // ========================================
            //🔥 RUTINA
            // ========================================
            this.ConsultarRutinaServer(IdEquipo, Planta, IdEquipoPeriodicidad);
        }

        //IMPORTANTE SI YA FIRMO MANTENIMIENTO OCULTAR BOTON GUARDAR
        if (FirmaSuperviso != "") {
            $("#btnGuardarOT").prop("disabled", true).addClass("d-none");
        }

    }

    // ============================
    // Helper: configurar uploader (activar/desactivar)
    // ============================
    _setupUploader(enable) {
        if (enable) {
            $('#previewArea').empty();
            $('#clearAll').hide();
            $('#uploadArea').removeClass('upload-area-disabled');
            $('#uploadInfo').show();

            const uploader = $('#uploadArea').data('imageUploader');
            if (uploader && uploader.enableUpload) {
                uploader.enableUpload();
            }
        } else {
            $('#previewArea').empty();
            $('#clearAll').hide();
            $('#uploadArea').addClass('upload-area-disabled');
            $('#uploadInfo').hide();

            const uploader = $('#uploadArea').data('imageUploader');
            if (uploader && uploader.disableUpload) {
                uploader.disableUpload();
            }
        }
    }

    // ============================
    // Helper: configurar campos editables (Scrap, HoraCierre)
    // ============================
    _setCamposEditable(scrapEditable, horaCierreEditable) {
        if (scrapEditable) {
            $("#Scrap").removeAttr('readonly').prop('required', true);
        } else {
            $("#Scrap").attr('readonly', true).prop('required', false);
        }

        if (horaCierreEditable) {
            $("#HoraCierreMan").removeAttr('readonly').prop('required', true);
        } else {
            $("#HoraCierreMan").attr('readonly', true).prop('required', false);
        }
    }

    // ============================
    // Helper: configurar firmas (mostrar, bloquear y nombres)
    // ============================
    _configureFirmas({ showRealizo = true, showSuperviso = true, showMantenimiento = true, nombreRealizo = null, nombreSuperviso = null, nombreMantenimiento = null, bloquearRealizo = false, bloquearSuperviso = false, bloquearMantenimiento = false, deshabilitarRealizo = false, deshabilitarSuperviso = false, deshabilitarMantenimiento = false } = {}) {
        if (showRealizo) this.gestionFirmas.mostrarFirma('Realizo', true);
        else this.gestionFirmas.mostrarFirma('Realizo', false);

        if (showSuperviso) this.gestionFirmas.mostrarFirma('Superviso', true);
        else this.gestionFirmas.mostrarFirma('Superviso', false);

        if (showMantenimiento) this.gestionFirmas.mostrarFirma('Mantenimiento', true);
        else this.gestionFirmas.mostrarFirma('Mantenimiento', false);

        if (nombreRealizo) $("#nombreRealizo").val(nombreRealizo).attr('readonly', true);
        if (nombreSuperviso) $("#nombreSuperviso").val(nombreSuperviso).attr('readonly', true);
        if (nombreMantenimiento) $("#nombreMantenimiento").val(nombreMantenimiento).attr('readonly', true);

        // ✅ Lógica de Realizo
        if (bloquearRealizo) this.gestionFirmas._bloquearFirma('Realizo');
        else if (deshabilitarRealizo) this.gestionFirmas.deshabilitarFirma('Realizo', true);

        // ✅ Lógica de Superviso
        if (bloquearSuperviso) this.gestionFirmas._bloquearFirma('Superviso');
        else if (deshabilitarSuperviso) this.gestionFirmas.deshabilitarFirma('Superviso', true);

        // ✅ Lógica de Mantenimiento
        if (bloquearMantenimiento) this.gestionFirmas._bloquearFirma('Mantenimiento');
        else if (deshabilitarMantenimiento) this.gestionFirmas.deshabilitarFirma('Mantenimiento', true);
    }

    async guardarOT(e) {
        e.preventDefault();

        // Validar formulario
        if (!ValidationManager.validarFormulario('#formOrdenMantenimiento')) {
            AlertManager.mostrar('Por favor, complete correctamente todos los campos', 'warning', "alertOrdenContainer");
            return false;
        }

        // ✅ Validar técnicos
        if (this.gestionTecnicos.tecnicosAsignados.length === 0) {
            AlertManager.mostrar(
                'Debe asignar al menos un técnico a la orden de trabajo',
                'warning',
                "alertOrdenContainer"
            );
            $('#BuscarTecnico').focus();
            $('#btnGuardarOT').html('<i class="bi bi-save me-1"></i>Guardar').prop('disabled', false);
            return false;
        }



        let FirmaRequerida = "";
        if (this.datos_usuario[0].TIPOUSUARIO == "TecnicoMtto") {
            FirmaRequerida = "Realizo";
        }
        if (this.datos_usuario[0].TIPOUSUARIO == "SupervisorProduccion") {
            FirmaRequerida = "Superviso";
        }
        if (this.datos_usuario[0].TIPOUSUARIO == "AdminMtto" || this.datos_usuario[0].TIPOUSUARIO == "Administrador") {
            FirmaRequerida = "Mantenimiento";
        }

        // 🔥 VALIDAR FIRMAS (solo si la sección está visible)
        if ($('#SeccionFirmas').is(':visible')) {
            if (!this.gestionFirmas.validarFirmas(FirmaRequerida)) {
                $('#btnGuardarOT').html('<i class="bi bi-save me-1"></i>Guardar').prop('disabled', false);
                return false;
            }

            // 🔥 Guardar las firmas en los campos ocultos ANTES de obtenerlas
            this.gestionFirmas.guardarTodasLasFirmas();
        }

        // ✅ Deshabilitar botón y mostrar loading
        $('#btnGuardarOT').html('<span class="spinner-border spinner-border-sm me-2"></span>Guardando OT...').prop('disabled', true);

        try {
            // 🔥 OBTENER DATOS DEL FORMULARIO
            const datos = GlobalUtil.obtenerDatosAnyFormulario("formOrdenMantenimiento");
            // 🔥 GUARDAR PRIMERO LA RUTINA Y ESPERAR RESPUESTA
            const rutinaGuardada = await this.guardarRutina(datos.NumeroOrden, datos.EstatusOrden);

            if (!rutinaGuardada) {
                AlertManager.mostrar('Complete las actividades pendientes antes de guardar continuar.', 'info', "alertOrdenContainer");
                $('#btnGuardarOT').html('<i class="bi bi-save me-1"></i>Guardar').prop('disabled', false);
                return false;
            }

            console.log('✅ Rutina guardada exitosamente, procediendo a guardar OT...');

            // ✅ SUBIR PDF SI EXISTE (cuando es rutina default para TecnicoMtto)
            if (this.pdfTemporalRutina) {
                console.log('📄 Subiendo PDF de rutina...');
                const pdfSubido = await this.SubirPdfRutinaAsync(this.pdfTemporalRutina);
                if (!pdfSubido) {
                    AlertManager.mostrar('Error al guardar el PDF de la rutina. No se puede continuar.', 'warning', "alertOrdenContainer");
                    $('#btnGuardarOT').html('<i class="bi bi-save me-1"></i>Guardar').prop('disabled', false);
                    return false;
                }
                console.log('✅ PDF de rutina guardado exitosamente');
                // Limpiar el PDF temporal después de subirlo
                this.pdfTemporalRutina = null;
            }


            datos.Usuario = this.datos_usuario[0].EMAIL;
            datos.TipoOperacion = this.TIPO_OPERACION;
            // ✅ Convertir horas de 12h a 24h
            if (datos.HoraInicio) {
                datos.HoraInicio = this.convertirA24Horas(datos.HoraInicio);
            }
            if (datos.HoraFin) {
                datos.HoraFin = this.convertirA24Horas(datos.HoraFin);
            }

            // ✅ Agregar técnicos
            datos.TecnicosAsignados = this.gestionTecnicos.obtenerNominasComoString();
            datos.IdMantenimiento = this.ID_MANTENIMIENTO;

            // 🔥 OBTENER Y AGREGAR FIRMAS DIGITALES
            const firmas = this.gestionFirmas.obtenerTodasLasFirmas();

            // 🔥 AGREGAR DATOS DE FIRMAS AL OBJETO
            datos.FirmaRealizo = firmas.realizo.firma || '';        // Base64 PNG
            datos.NombreRealizo = firmas.realizo.nombre || '';
            datos.FirmaSuperviso = firmas.superviso.firma || '';    // Base64 PNG
            datos.NombreSuperviso = firmas.superviso.nombre || '';
            datos.FirmaMantenimiento = firmas.mantenimiento.firma || ''; // Base64 PNG
            datos.NombreMantenimiento = firmas.mantenimiento.nombre || '';

            // 🔥 GUARDAR LA ORDEN DE TRABAJO
            await this.guardarOTDefinitivo(datos);


        } catch (error) {
            console.error('Error en el proceso:', error);
            AlertManager.mostrar('No es posible guardar la orden de trabajo: ' + error, 'warning', "alertOrdenContainer");
            $('#btnGuardarOT').html('<i class="bi bi-save me-1"></i>Guardar').prop('disabled', false);
        }

        return false;
    }
    // 🔥 MÉTODO SEPARADO PARA GUARDAR LA OT (también async)
    // 🔥 MÉTODO PARA GUARDAR BORRADOR (sin validaciones estrictas)
    async guardarBorrador(e) {
        if (e) e.preventDefault();

        // ✅ Validar solo campo crítico: Número de Orden
        const numeroOrden = $('#NumeroOrden').val();
        if (!numeroOrden || numeroOrden.trim() === '') {
            AlertManager.mostrar('El número de orden es requerido', 'warning', "alertOrdenContainer");
            return false;
        }

        // ✅ Deshabilitar botón y mostrar loading
        $('#btnGuardarBorrador').html('<span class="spinner-border spinner-border-sm me-2"></span>Guardando Borrador...').prop('disabled', true);

        try {
            // 🔥 OBTENER SOLO LOS DATOS DISPONIBLES (sin validaciones)
            const datosBorrador = this._obtenerDatosBorrador();

            console.log('📝 Datos del borrador:', datosBorrador);

            // 🔥 GUARDAR RUTINA EN BORRADOR (validación relajada)
            const rutinaGuardada = await this.guardarRutinaParaBorrador(datosBorrador.NumeroOrden, datosBorrador.EstatusOrden);
            if (!rutinaGuardada) {
                $('#btnGuardarBorrador').html('<i class="bi bi-cloud-upload me-1"></i> Guardar Borrador').prop('disabled', false);
                return false;
            }

            // ✅ SUBIR PDF SI EXISTE (cuando es rutina default para TecnicoMtto)
            if (this.pdfTemporalRutina) {
                console.log('📄 Subiendo PDF de rutina...');
                const pdfSubido = await this.SubirPdfRutinaAsync(this.pdfTemporalRutina);
                if (!pdfSubido) {
                    console.warn('⚠️ Advertencia: El PDF no se subió, pero continuaremos con el borrador');
                }
                this.pdfTemporalRutina = null;
            }

            // ✅ AGREGAR DATOS REQUERIDOS PARA GUARDADO
            datosBorrador.Usuario = this.datos_usuario[0].EMAIL;
            datosBorrador.TipoOperacion = 'BORRADOR'; // 🔥 Tipo especial para borrador
            datosBorrador.IdMantenimiento = this.ID_MANTENIMIENTO;

            // ✅ Convertir horas si existen
            if (datosBorrador.HoraInicio) {
                datosBorrador.HoraInicio = this.convertirA24Horas(datosBorrador.HoraInicio);
            }
            if (datosBorrador.HoraFin) {
                datosBorrador.HoraFin = this.convertirA24Horas(datosBorrador.HoraFin);
            }

            // ✅ Agregar técnicos si existen
            if (this.gestionTecnicos.tecnicosAsignados.length > 0) {
                datosBorrador.TecnicosAsignados = this.gestionTecnicos.obtenerNominasComoString();
            }

            // 🔥 GUARDAR LAS FIRMAS (si existen) - SIN VALIDAR QUE SEAN OBLIGATORIAS
            if ($('#SeccionFirmas').is(':visible')) {
                // Guardar firmas en los campos ocultos si están disponibles
                this.gestionFirmas.guardarTodasLasFirmas();

                // Obtener las firmas
                const firmas = this.gestionFirmas.obtenerTodasLasFirmas();

                // Agregar datos de firmas al objeto (aunque estén vacías, va)
                datosBorrador.FirmaRealizo = firmas.realizo.firma || '';
                datosBorrador.NombreRealizo = firmas.realizo.nombre || '';
                datosBorrador.FirmaSuperviso = firmas.superviso.firma || '';
                datosBorrador.NombreSuperviso = firmas.superviso.nombre || '';
                datosBorrador.FirmaMantenimiento = firmas.mantenimiento.firma || '';
                datosBorrador.NombreMantenimiento = firmas.mantenimiento.nombre || '';
            }

            // ✅ Guardar el borrador
            await this.guardarBorradorDefinitivo(datosBorrador);

        } catch (error) {
            console.error('Error en guardarBorrador:', error);
            AlertManager.mostrar('No es posible guardar el borrador: ' + error, 'warning', "alertOrdenContainer");
            $('#btnGuardarBorrador').html('<i class="bi bi-cloud-upload me-1"></i> Guardar Borrador').prop('disabled', false);
        }

        return false;
    }

    // 🔥 MÉTODO PARA EXTRAER DATOS DEL BORRADOR (solo disponibles)
    _obtenerDatosBorrador() {
        const datos = {};

        // 🔥 Campos que SIEMPRE se intentan obtener (pueden estar vacíos)
        const camposFormulario = [
            'NumeroOrden',
            'Solicitante',
            'ClaseMantenimiento',
            'CodigoMantenimiento',
            'EstatusOrden',
            'FechaInicioExtrema',
            'FechaFinExtrema',
            'UbicacionTecnica',
            'CentroCostos',
            'DescripcionEquipo',
            'NumeroEquipo',
            'GrupoPlaneacion',
            'HoraInicio',
            'HoraFin',
            'TextoSecuencia',
            'DuracionHrs'
        ];

        camposFormulario.forEach(campo => {
            const valor = $(`#${campo}`).val();
            if (valor !== null && valor !== undefined) {
                datos[campo] = valor;
            }
        });

        return datos;
    }

    // 🔥 MÉTODO SEPARADO PARA GUARDAR EL BORRADOR (también async)
    async guardarBorradorDefinitivo(datos) {
        let TipoUsuario = this.datos_usuario[0].TIPOUSUARIO;
        return new Promise((resolve, reject) => {
            $.ajax({
                url: `/${this.URLBase}/InsertarOrdenTrabajoMP`,
                type: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Rol-Usuario': TipoUsuario
                },
                contentType: 'application/json; charset=utf-8',
                data: JSON.stringify(datos),
                dataType: 'json',
                success: (response) => {
                    if (response.Status === 'SI') {
                        AlertManager.mostrar(
                            'Borrador guardado correctamente. Puede continuar editando o cerrar.',
                            'success',
                            "alertOrdenContainer"
                        );

                        // Recargar la tabla
                        $('#tablaMantenimientosRango').DataTable().ajax.reload(null, false);

                        // 🔥 NO cerrar el modal automáticamente para permitir seguir editando
                        resolve(true);
                    } else {
                        AlertManager.mostrar(response.Message || 'Error al guardar el borrador', 'warning', "alertOrdenContainer");
                        reject(false);
                    }

                    // Restaurar botón
                    $('#btnGuardarBorrador').html('<i class="bi bi-cloud-upload me-1"></i> Guardar Borrador').prop('disabled', false);
                },
                error: (xhr, status, error) => {
                    AlertManager.mostrar('Error al conectar con el servidor', 'warning', "alertOrdenContainer");
                    $('#btnGuardarBorrador').html('<i class="bi bi-cloud-upload me-1"></i> Guardar Borrador').prop('disabled', false);
                    reject(error);
                }
            });
        });
    }

    async guardarOTDefinitivo(datos) {
        let TipoUsuario = this.datos_usuario[0].TIPOUSUARIO;
        return new Promise((resolve, reject) => {
            $.ajax({
                url: `/${this.URLBase}/InsertarOrdenTrabajoMP`,
                type: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Rol-Usuario': TipoUsuario  // 👈 esto
                },
                contentType: 'application/json; charset=utf-8', // ✅ Importante
                data: JSON.stringify(datos), // ✅ Convierte todo a JSON
                dataType: 'json',
                success: (response) => {
                    if (response.Status === 'SI') {
                        AlertManager.mostrar(
                            response.Message,
                            'success',
                            "alertOrdenContainer"
                        );

                        // Recargar la tabla
                        $('#tablaMantenimientosRango').DataTable().ajax.reload(null, false);

                        // Cerrar modal después de 2 segundos
                        setTimeout(() => {
                            $('#modalOrdenMantenimiento').modal('hide');
                            $('#formOrdenMantenimiento')[0].reset();
                            this.gestionTecnicos.limpiar();
                            this.gestionFirmas.limpiarTodasLasFirmas(); // 🔥 Limpiar firmas
                        }, 2000);

                        resolve(true);
                    } else {
                        AlertManager.mostrar(response.Message || 'Error al guardar la orden de trabajo', 'warning', "alertOrdenContainer");
                        reject(false);
                    }

                    // Restaurar botón
                    $('#btnGuardarOT').html('<i class="bi bi-save me-1"></i>Guardar').prop('disabled', false);
                },
                error: (xhr, status, error) => {
                    AlertManager.mostrar('Error al conectar con el servidor', 'warning', "alertOrdenContainer");
                    $('#btnGuardarOT').html('<i class="bi bi-save me-1"></i>Guardar').prop('disabled', false);
                    reject(error);
                }
            });
        });
    }
    // ✅ Método para convertir de 12h a 24h (formato TIME)
    convertirA24Horas(hora12h) {
        if (!hora12h || hora12h.trim() === '') {
            return null;
        }

        try {
            // Separar hora y AM/PM
            const [time, modifier] = hora12h.trim().split(' ');
            let [hours, minutes] = time.split(':');

            hours = parseInt(hours, 10);

            // Convertir a formato 24 horas
            if (modifier && modifier.toUpperCase() === 'PM' && hours !== 12) {
                hours += 12;
            }
            if (modifier && modifier.toUpperCase() === 'AM' && hours === 12) {
                hours = 0;
            }

            // Retornar en formato HH:MM:SS
            return `${hours.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;

        } catch (error) {
            console.error('Error al convertir hora:', hora12h, error);
            return null;
        }
    }

    // ============================
    // RUTINAS
    // ===========================

    ConsultarRutinaServer(idEquipo, Planta, idEquipoPeriodicidad, ShowLoader) {

        return new Promise((resolve, reject) => {
            // CARGAR LA VISTA DESDE EL SERVIDOR

            // 🔥 CARGAR LA VISTA DESDE EL SERVIDOR
            $.ajax({
                url: `/${this.URLBaseRutinas}/ObtenerRutinaCompleta`,
                type: 'GET',
                data: (function () {
                    const d = { idEquipo: idEquipo };
                    if (typeof Planta !== 'undefined' && Planta !== null) d.Planta = Planta;
                    if (typeof idEquipoPeriodicidad !== 'undefined' && idEquipoPeriodicidad !== null) d.idEquipoPeriodicidad = idEquipoPeriodicidad;
                    return d;
                })(),
                dataType: 'json',
                beforeSend: function () {
                    if (ShowLoader) {
                        $('#formRutinaOnline').html(`
                            <div class="ai-loader">

                                <div class="ai-core">
                                    <div class="ai-ring"></div>
                                    <div class="ai-ring delay"></div>
                                    <div class="ai-ring delay2"></div>
                                </div>

                                <div class="ai-wave"></div>

                                <p class="ai-text">CARGANDO RUTINA...</p>

                            </div>`);
                    }
                },

                success: (response) => {
                    const render = () => {
                        if (response.Status === 'OK') {

                            const $c = $('#formRutinaOnline');

                            $c.fadeOut(400, () => {  // 👈 arrow function aquí también
                                $c.html(response.Html).fadeIn(600, () => {
                                    $('#formRutinaOnline').find('#seccion-upload-imagenes').remove();
                                    $('#formRutinaOnline').find('#seccion-galeria-imagenes').remove();
                                    if (response.Imagenes?.length > 0) {
                                        this.checklistManager.cargarImagenesExistentes(response.Imagenes, false);
                                    }

                                    //✅ TRANSFORMAR LAS FIRMAS A RADIOBUTTONS PARA TECNICO
                                    if (this.datos_usuario[0].TIPOUSUARIO == "TecnicoMtto") {
                                        $('#rutinaChecklist .actividad').each(function (index) {

                                            const actividadNum = index + 1;
                                            const firmaContainer = $(this).find('.d-flex.gap-4.mt-2');

                                            const radioHTML = `
                                                <div class="radio-transition d-flex gap-4 mt-2" style="display:none;">

                                                    <div class="form-check position-relative">
                                                        <input class="form-check-input" 
                                                               type="radio" 
                                                               name="actividad_${actividadNum}" 
                                                               id="actividad_${actividadNum}_realizado" 
                                                               value="realizado" 
                                                               required>

                                                        <label class="form-check-label fw-semibold"
                                                               for="actividad_${actividadNum}_realizado">
                                                            Realizado
                                                        </label>

                                                        <div class="invalid-feedback custom-invalid-feedback">
                                                            ⚠️ Por favor complete la actividad.
                                                        </div>
                                                    </div>

                                                    <div class="form-check">
                                                        <input class="form-check-input"
                                                               type="radio"
                                                               name="actividad_${actividadNum}"
                                                               id="actividad_${actividadNum}_no_realizado"
                                                               value="no_realizado">

                                                        <label class="form-check-label fw-semibold"
                                                               for="actividad_${actividadNum}_no_realizado">
                                                            No Realizado
                                                        </label>
                                                    </div>

                                                </div>
                                            `;

                                            // 🔥 Animación fluida
                                            firmaContainer.fadeOut(250, function () {

                                                $(this).replaceWith(radioHTML);

                                                const nuevoRadio = $(
                                                    `input[name="actividad_${actividadNum}"]`
                                                ).closest('.radio-transition');

                                                nuevoRadio
                                                    .hide()
                                                    .css({
                                                        opacity: 0,
                                                        transform: 'translateY(10px)'
                                                    })
                                                    .slideDown(250)
                                                    .animate({
                                                        opacity: 1
                                                    }, {
                                                        duration: 300,
                                                        step: function (now) {
                                                            $(this).css(
                                                                'transform',
                                                                `translateY(${10 - (10 * now)}px)`
                                                            );
                                                        }
                                                    });

                                            });

                                        });
                                    }

                                    // 🔥 ELIMINAR TODOS LOS BOTONES DE ELIMINAR
                                    $('#rutinaChecklist .btn-eliminar-actividad').remove();

                                    // 🔥 QUITAR CLASE "actividad" DE TODOS LOS DIVS
                                    $('#rutinaChecklist .actividad').removeClass('actividad').addClass("actividad_realizada");

                                    // 🔥 CARGAR IMÁGENES EXISTENTES DE LA RUTINA
                                    if (this.datos_usuario[0].TIPOUSUARIO == "TecnicoMtto") {
                                        this.CargarEvidenciaRutina(idEquipo, Planta);
                                        $("#seccion-upload-imagenes").hide();
                                    }

                                    // 🔥 DETECTAR SI ES RUTINA DEFAULT Y MOSTRAR SECCIÓN PDF
                                    if (this.datos_usuario[0].TIPOUSUARIO == "TecnicoMtto") {
                                        const esRutinaDefault = $('#esRutinaDefault').length > 0;
                                        if (esRutinaDefault) {
                                            // Ocultar rutina default y mostrar sección PDF
                                            $('#formRutinaOnline').hide();
                                            $('#seccionPdfRutina').show();
                                            this.CargarPdfRutina(idEquipo, Planta);
                                        } else {
                                            $('#formRutinaOnline').show();
                                            $('#seccionPdfRutina').hide();
                                        }
                                    }

                                    // 🔥 RESOLVER LA PROMISE CUANDO TODO ESTÉ LISTO
                                    resolve();
                                });
                            });



                        } else {
                            $('#formRutinaOnline').html(`<div class="alert alert-danger">${response.Message}</div>`);
                            reject(new Error(response.Message));
                        }
                    };

                    render();
                },
                error: (xhr, status, error) => {
                    $('#formRutinaOnline').html(`
                <div class="alert alert-danger" role="alert">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    Error al cargar la rutina: ${error}
                </div>
            `);
                    reject(error);
                }
            });
        });

    }

    ConsultarActividadesPorOTMP(numeroOrden, idEquipo, Planta, ComentariosRutina) {

        const startTime = Date.now();

        $.ajax({
            url: `/${this.URLBase}/ObtenerActividadesPorOTMP`,
            type: 'GET',
            data: { numeroOrden: numeroOrden },
            dataType: 'json',

            beforeSend: function () {
                $('#formRutinaOnline').html(`
                <div class="ai-loader">
                    <div class="ai-core">
                        <div class="ai-ring"></div>
                        <div class="ai-ring delay"></div>
                        <div class="ai-ring delay2"></div>
                    </div>
                    <div class="ai-wave"></div>
                    <p class="ai-text">CARGANDO ACTIVIDADES...</p>
                </div>
            `);
            },

            success: (response) => {

                const elapsed = Date.now() - startTime;
                const minDelay = 1200;
                let ComentariosRutina = "";
                const render = () => {

                    if (!response || response.length === 0) {
                        $('#formRutinaOnline').html(`<div class="alert alert-warning">Sin actividades para esta OT</div>`);
                        return;
                    }

                    const $c = $('#formRutinaOnline');

                    let html = `<div id="rutinaChecklist">`;

                    response.forEach((act, index) => {

                        const actividadNum = index + 1;
                        ComentariosRutina = act.COMENTARIOS || "";
                        const checkedSI = act.COMPLETADA === "SI" ? "checked" : "";
                        const checkedNO = act.COMPLETADA === "NO" ? "checked" : "";

                        html += `
                        <div class="actividad_realizada mb-3 p-3 border rounded">
                            <div class="fw-bold texto-actividad">${act.DESCRIPCION || ""}</div>
                            <div class="d-flex gap-4 mt-2">
                                <div class="form-check">
                                    <input class="form-check-input" type="radio"
                                        name="actividad_${actividadNum}"
                                        value="realizado"
                                        ${checkedSI}
                                        disabled>
                                    <label class="form-check-label fw-semibold">
                                        Realizado
                                    </label>
                                </div>

                                <div class="form-check">
                                    <input class="form-check-input" type="radio"
                                        name="actividad_${actividadNum}"
                                        value="no_realizado"
                                        ${checkedNO}
                                        disabled>
                                    <label class="form-check-label fw-semibold">
                                        No Realizado
                                    </label>
                                </div>
                            </div>
                        </div>
                    `;
                    });

                    html += `</div>`;

                    html += `<div class="mb-3">
                            <label for="Comentarios" class="form-label">Comentarios</label>
                            <textarea class="form-control" id="ComentariosRutina" rows="3" readonly required="">${ComentariosRutina}</textarea>
                            </div>`;

                    $c.fadeOut(300, () => {
                        $c.html(html).fadeIn(500, () => {

                            // 🔥 CARGAR IMÁGENES EXISTENTES DE LA RUTINA (PARA TODOS)
                            this.CargarEvidenciaRutina(numeroOrden, Planta)

                            // 🔥 DETECTAR SI ES RUTINA DEFAULT Y MOSTRAR PDF (PARA TODOS)
                            const esRutinaDefault = $('#esRutinaDefault').length > 0;

                            if (esRutinaDefault) {
                                $('#formRutinaOnline').hide();
                                $('#seccionPdfRutina').show();
                                this.CargarPdfRutinaPorOT(numeroOrden);
                            } else {
                                $('#formRutinaOnline').show();
                                $('#seccionPdfRutina').hide();
                            }

                        });
                    });

                };

                if (elapsed < minDelay) {
                    setTimeout(render, minDelay - elapsed);
                } else {
                    render();
                }
            },

            error: (xhr, status, error) => {
                $('#formRutinaOnline').html(`
                <div class="alert alert-danger">
                    Error al cargar actividades: ${error}
                </div>
            `);
            }
        });
    }

    // 🔥 NUEVO: Método para cargar actividades en MODO EDITABLE (para borradores)
    // Similar a ConsultarActividadesPorOTMP pero SIN deshabilitar radios
    ConsultarActividadesPorOTMPEditable(numeroOrden, idEquipo, Planta) {

        const startTime = Date.now();

        $.ajax({
            url: `/${this.URLBase}/ObtenerActividadesPorOTMP`,
            type: 'GET',
            data: { numeroOrden: numeroOrden },
            dataType: 'json',

            beforeSend: function () {
                // 🔥 NO mostrar loader aquí - validamos primero si hay datos
            },

            success: (response) => {

                // 🔥 VALIDACIÓN: Si no hay datos guardados en BD, salir sin modificar nada
                if (!response || response.length === 0) {
                    console.log('✅ Sin actividades guardadas en BD - Manteniendo template limpio del servidor');
                    return;
                }

                // 🔥 Si SÍ hay datos, mostrar loader y marcar
                $('#formRutinaOnline').html(`
                <div class="ai-loader">
                    <div class="ai-core">
                        <div class="ai-ring"></div>
                        <div class="ai-ring delay"></div>
                        <div class="ai-ring delay2"></div>
                    </div>
                    <div class="ai-wave"></div>
                    <p class="ai-text">VALIDANDO BORRADOR...</p>
                </div>
            `);

                const elapsed = Date.now() - startTime;
                const minDelay = 1200;
                let ComentariosRutina = "";

                const render = () => {

                    const $c = $('#formRutinaOnline');

                    let html = `<div id="rutinaChecklist">`;

                    response.forEach((act, index) => {

                        const actividadNum = index + 1;
                        ComentariosRutina = act.COMENTARIOS || "";
                        const checkedSI = act.COMPLETADA === "SI" ? "checked" : "";
                        const checkedNO = act.COMPLETADA === "NO" ? "checked" : "";

                        // 🔥 SIN disabled - para que puedas seguir editando en borrador
                        html += `
                        <div class="actividad_realizada mb-3 p-3 border rounded">
                            <div class="fw-bold texto-actividad">${act.DESCRIPCION || ""}</div>
                            <div class="d-flex gap-4 mt-2">
                                <div class="form-check">
                                    <input class="form-check-input" type="radio"
                                        name="actividad_${actividadNum}"
                                        value="realizado"
                                        ${checkedSI}>
                                    <label class="form-check-label fw-semibold">
                                        Realizado
                                    </label>
                                </div>

                                <div class="form-check">
                                    <input class="form-check-input" type="radio"
                                        name="actividad_${actividadNum}"
                                        value="no_realizado"
                                        ${checkedNO}>
                                    <label class="form-check-label fw-semibold">
                                        No Realizado
                                    </label>
                                </div>
                            </div>
                        </div>
                    `;
                    });

                    html += `</div>`;

                    html += `<div class="mb-3">
                            <label for="ComentariosRutina" class="form-label">Comentarios</label>
                            <textarea class="form-control" id="ComentariosRutina" rows="3" required="">${ComentariosRutina || ''}</textarea>
                            </div>`;

                    $c.fadeOut(300, () => {
                        $c.html(html).fadeIn(500, () => {

                            // 🔥 CARGAR IMÁGENES EXISTENTES DE LA RUTINA EN MODO EDITABLE (PARA BORRADORES)
                            this.CargarEvidenciaRutinaBorrador(numeroOrden, Planta)

                            // 🔥 DETECTAR SI ES RUTINA DEFAULT Y MOSTRAR PDF (PARA BORRADORES)
                            const esRutinaDefault = $('#esRutinaDefault').length > 0;

                            if (esRutinaDefault) {
                                $('#formRutinaOnline').hide();
                                $('#seccionPdfRutina').show();
                                this.CargarPdfRutinaPorOT(numeroOrden);
                            } else {
                                $('#formRutinaOnline').show();
                                $('#seccionPdfRutina').hide();
                            }

                        });
                    });

                };

                if (elapsed < minDelay) {
                    setTimeout(render, minDelay - elapsed);
                } else {
                    render();
                }
            },

            error: (xhr, status, error) => {
                $('#formRutinaOnline').html(`
                <div class="alert alert-danger">
                    Error al cargar borrador: ${error}
                </div>
            `);
            }
        });
    }

    async guardarRutina(OrdenTrabajo, EstatusOrden) {
        return new Promise((resolve, reject) => {
            // ✅ NUEVA LÓGICA: Si hay PDF de rutina (rutina default), no validar actividades
            const esRutinaDefault = $('#esRutinaDefault').length > 0;
            const tienePdf = this.pdfTemporalRutina !== null || ($('#seccionPdfRutina').is(':visible') && $('#pdfViewerContainer').is(':visible'));

            if (esRutinaDefault && tienePdf) {
                // Es rutina default con PDF - no hay actividades que validar
                console.log('📄 Rutina con PDF - omitiendo validación de actividades');
                resolve(true);
                return;
            }
            if (EstatusOrden == "Cerrado") {
                // Ya solo son firmas
                console.log('📄 Solo guardando firmas');
                resolve(true);
                return;
            }

            const respuestas = this.obtenerRespuestasRutina();
            const comentarios = $('#ComentariosRutina').val() || $('#Comentarios').val();

            // Validar que todas las actividades estén respondidas
            const sinResponder = respuestas.filter(r => r.estado === null);
            if (sinResponder.length > 0) {
                AlertManager.mostrar(`Faltan ${sinResponder.length} actividades por responder`, 'warning');
                resolve(false); // ❌ Rechazar si falta algo
                return;
            }

            //🔥 CREAR FORMDATA
            const formData = new FormData();
            formData.append('idMantenimiento', this.ID_MANTENIMIENTO);
            formData.append('idEquipo', this.ID_EQUIPO);
            formData.append('comentarios', comentarios);
            formData.append('actividades', JSON.stringify(respuestas));
            formData.append('usuarioRegistro', this.datos_usuario[0].EMAIL);
            formData.append('OrdenTrabajo', OrdenTrabajo);
            formData.append('Planta', this.datos_usuario[0].PLANTA);

            // 🔥 AGREGAR IMÁGENES
            const files = window.imagenesRutina || [];
            console.log('Total de archivos:', files.length);

            for (let i = 0; i < files.length; i++) {
                formData.append('imagenes', files[i]);
                console.log(`Agregando imagen ${i}:`, files[i].name);
            }

            // Enviar al servidor
            $.ajax({
                url: `/${this.URLBase}/GuardarRutina`,
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                beforeSend: function () {
                    $("#btnGuardarRutina").html('<span class="spinner-border spinner-border-sm me-2"></span>Guardando...');
                    $("#btnGuardarRutina").prop("disabled", true);
                },
                success: function (response) {
                    $("#btnGuardarRutina").html('<i class="bi bi-check-circle-fill me-2 text-success"></i>Rutina guardada correctamente.');
                    $("#btnGuardarRutina").prop("disabled", false);

                    // 🔥 RECARGAR LA TABLA DATATABLE
                    /*$('#tablaMantenimientosRango').DataTable().ajax.reload(null, false);*/

                    setTimeout(function () {
                        $("#btnGuardarRutina").html('<i class="bi bi-check2-circle me-1"></i>Guardar Rutina');
                        $('#modalRutinaOnline').modal('hide');
                    }, 3000);

                    resolve(true); // ✅ TODO SALIÓ BIEN
                },
                error: function (xhr, status, error) {
                    AlertManager.mostrar('No se pudo guardar la rutina: ' + error, 'warning');
                    $("#btnGuardarRutina").html('<i class="bi bi-check2-circle me-1"></i>Guardar Rutina');
                    $("#btnGuardarRutina").prop("disabled", false);
                    resolve(false); // ❌ ERROR
                }
            });
        });
    }

    // 🔥 NUEVO: Método para guardar rutina en BORRADOR (validación relajada)
    async guardarRutinaParaBorrador(OrdenTrabajo, EstatusOrden) {
        return new Promise((resolve, reject) => {
            // ✅ MISMA LÓGICA: Si hay PDF de rutina (rutina default), no validar actividades
            const esRutinaDefault = $('#esRutinaDefault').length > 0;
            const tienePdf = this.pdfTemporalRutina !== null || ($('#seccionPdfRutina').is(':visible') && $('#pdfViewerContainer').is(':visible'));

            if (esRutinaDefault && tienePdf) {
                // Es rutina default con PDF - no hay actividades que validar
                console.log('📄 Rutina con PDF (Borrador) - omitiendo validación de actividades');
                resolve(true);
                return;
            }
            if (EstatusOrden == "Cerrado") {
                // Ya solo son firmas
                console.log('📄 Solo guardando firmas (Borrador)');
                resolve(true);
                return;
            }

            const respuestas = this.obtenerRespuestasRutina();
            const comentarios = $('#ComentariosRutina').val() || $('#Comentarios').val();

            // 🔥 VALIDACIÓN RELAJADA: Al menos UNA actividad debe estar respondida
            const conRespuesta = respuestas.filter(r => r.estado !== null);
            if (conRespuesta.length === 0) {
                AlertManager.mostrar('Debe responder al menos una actividad para guardar el borrador', 'warning');
                resolve(false);
                return;
            }

            console.log(`✅ Borrador: ${conRespuesta.length} de ${respuestas.length} actividades respondidas`);

            // 🔥 CREAR FORMDATA
            const formData = new FormData();
            formData.append('idMantenimiento', this.ID_MANTENIMIENTO);
            formData.append('idEquipo', this.ID_EQUIPO);
            formData.append('comentarios', comentarios);
            formData.append('actividades', JSON.stringify(respuestas));
            formData.append('usuarioRegistro', this.datos_usuario[0].EMAIL);
            formData.append('OrdenTrabajo', OrdenTrabajo);
            formData.append('Planta', this.datos_usuario[0].PLANTA);
            formData.append('esBorrador', 'true'); // 🔥 Flag para indicar que es borrador

            // 🔥 AGREGAR IMÁGENES NUEVAS
            const files = window.imagenesRutina || [];
            console.log('Total de archivos nuevos:', files.length);

            for (let i = 0; i < files.length; i++) {
                formData.append('imagenes', files[i]);
                console.log(`Agregando imagen ${i}:`, files[i].name);
            }

            // 🔥 AGREGAR LISTA DE IMÁGENES ELIMINADAS
            const uploader = $('#uploadArea').data('imageUploader');
            const imagenesEliminadas = uploader && uploader.getDeletedImages ? uploader.getDeletedImages() : [];
            if (imagenesEliminadas.length > 0) {
                formData.append('imagenesEliminadas', JSON.stringify(imagenesEliminadas));
                console.log(`📍 ${imagenesEliminadas.length} imagen(es) marcada(s) para eliminar:`, imagenesEliminadas);
            }

            // Enviar al servidor (endpoint diferente para borrador)
            $.ajax({
                url: `/${this.URLBase}/GuardarRutinaBorrador`,
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                beforeSend: function () {
                    // No mostramos loading aquí porque se guarda en background
                },
                success: function (response) {
                    resolve(true);
                },
                error: function (xhr, status, error) {
                    console.warn('⚠️ Advertencia al guardar borrador de rutina:', error);
                    AlertManager.mostrar('Advertencia: No se pudo guardar el borrador de la rutina, pero continuaremos', 'warning', 'alertOrdenContainer');
                    // 🔥 NO rechazamos - permitimos continuar aunque falle
                    resolve(true);
                }
            });
        });
    }

    obtenerRespuestasRutina() {
        const respuestas = [];
        $('#rutinaChecklist .actividad_realizada').each(function (index) {
            const actividadNum = index + 1;
            const textoActividad = $(this).find('.texto-actividad').text().trim();
            // ✅ CORRECTO - Agregamos el $ faltante
            const radioSeleccionado = $(`input[name="actividad_${actividadNum}"]:checked`).val();

            respuestas.push({
                numero: actividadNum,
                descripcion: textoActividad,
                estado: radioSeleccionado || null // null si no seleccionó nada
            });
        });
        return respuestas;
    }

    CargarEvidenciaRutina(NumeroOrden, Planta) {
        $.get(`/${this.URLBaseRutinas}/ObtenerImagenes`, { NumeroOrden: NumeroOrden, Planta: Planta })
            .done(data => {
                if (data.Status === 'OK' && data.Imagenes && data.Imagenes.length > 0) {
                    this.MostrarGaleriaEvidencia(data.Imagenes);
                }
            })
            .fail(() => {
                console.log('No se pudieron cargar las imágenes de evidencia');
            });
    }

    MostrarGaleriaEvidencia(imagenes) {
        // 🔥 1. Crear contenedor vacío
        const galeriaHTML = `
        <div id="galeriaEvidenciaRutina" class="mb-3 mt-4">
            <h6 class="mb-3 pb-2 border-bottom" style="color: var(--modal-primary); font-weight: 700;">
                <i class="bi bi-images me-2"></i>
                Imagenes De Rutina Cargadas Por Técnico (${imagenes.length} imagen${imagenes.length > 1 ? 'es' : ''})
            </h6>
            <div class="row g-3" id="contenedorImagenesRutina"></div>
        </div>
    `;

        $('#Evidenciatecnico').html(galeriaHTML);

        const $contenedor = $('#contenedorImagenesRutina');

        // 🔥 2. Insertar imágenes una por una con animación
        imagenes.forEach((img, index) => {

            setTimeout(() => {

                const item = $(`
                <div class="col-md-6 img-wrapper" style="display:none;">
                    <img src="${img}" class="img-evidencia-rutina w-100"
                        onclick="MantenimientoManagerRefactor.mostrarLightboxEvidencia('${img}', ${index}, ${JSON.stringify(imagenes).replace(/"/g, '&quot;')})"
                        alt="Evidencia ${index + 1}" />
                </div>
            `);

                $contenedor.append(item);

                // 🔥 Animación suave
                item.fadeIn(3000);

            }, index * 150); // 👈 delay entre imágenes (ajustable)

        });
    }

    // 🔥 NUEVO: Cargar imágenes existentes en MODO EDITABLE para BORRADORES
    // Las imágenes se cargan en el uploader con opción de eliminar
    CargarEvidenciaRutinaBorrador(NumeroOrden, Planta) {
        $.get(`/${this.URLBaseRutinas}/ObtenerImagenes`, { NumeroOrden: NumeroOrden, Planta: Planta })
            .done(data => {
                if (data.Status === 'OK' && data.Imagenes && data.Imagenes.length > 0) {
                    // 🔥 Cargar imágenes en el uploader (modo editable con delete)
                    const uploader = $('#uploadArea').data('imageUploader');
                    if (uploader && uploader.loadExistingImages) {
                        uploader.loadExistingImages(data.Imagenes);
                        console.log(`✅ ${data.Imagenes.length} imagen(es) cargada(s) en modo editable`);
                    }
                }
            })
            .fail(() => {
                console.log('No se pudieron cargar las imágenes de evidencia');
            });
    }

    // ============================================================
    // GESTIÓN DE PDFs DE RUTINAS (CUANDO NO HAY RUTINA ESPECÍFICA)
    // ============================================================

    CargarPdfRutina(idEquipo, planta) {
        this.ID_EQUIPO_PDF = idEquipo;
        this.PLANTA_PDF = planta;

        // Verificar si existe PDF guardado
        $.get(`/${this.URLBaseRutinas}/ObtenerPdfRutina`, { idEquipo: idEquipo, planta: planta })
            .done(data => {
                if (data.Status === 'OK' && data.Existe) {
                    this.MostrarPdfRutina(data.Url);
                } else {
                    this.LimpiarPdfRutina();
                }
            })
            .fail(() => {
                this.LimpiarPdfRutina();
            });

        // Configurar eventos del input file
        this.ConfigurarEventosPdfRutina();
    }

    ConfigurarEventosPdfRutina() {
        const self = this;

        // Cambio de archivo
        $('#inputPdfRutina').off('change').on('change', function (e) {
            const file = this.files[0];
            if (file) {
                if (file.size > 10 * 1024 * 1024) {
                    AlertManager.mostrar('El archivo excede el límite de 10MB', 'warning');
                    $(this).val('');
                    return;
                }
                if (file.type !== 'application/pdf') {
                    AlertManager.mostrar('Solo se permiten archivos PDF', 'warning');
                    $(this).val('');
                    return;
                }
                // ✅ Guardar PDF temporalmente en variable (NO subir inmediatamente)
                self.pdfTemporalRutina = file;
                self.MostrarPdfTemporal(file);
            }
        });

        // Eliminar PDF
        $('#btnEliminarPdfRutina').off('click').on('click', function () {
            self.pdfTemporalRutina = null;
            self.LimpiarPdfRutina();
        });
    }

    MostrarPdfTemporal(file) {
        // Crear URL temporal para previsualización
        const url = URL.createObjectURL(file);
        $('#pdfUploadContainer').hide();
        $('#pdfViewerContainer').show();
        $('#pdfViewer').attr('src', url + '#toolbar=0');
    }

    SubirPdfRutina(file) {
        const formData = new FormData();
        formData.append('archivo', file);
        formData.append('idEquipo', this.ID_EQUIPO_PDF);
        formData.append('planta', this.PLANTA_PDF);

        $.ajax({
            url: `/${this.URLBaseRutinas}/GuardarPdfRutina`,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: (data) => {
                if (data.Status === 'OK') {
                    this.MostrarPdfRutina(data.Url);
                    AlertManager.mostrar('PDF guardado correctamente', 'success');
                } else {
                    AlertManager.mostrar(data.Message || 'Error al guardar PDF', 'warning');
                }
            },
            error: () => {
                AlertManager.mostrar('Error al subir el PDF', 'warning');
            }
        });
    }

    SubirPdfRutinaAsync(file) {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('archivo', file);
            formData.append('idEquipo', this.ID_EQUIPO_PDF);
            formData.append('planta', this.PLANTA_PDF);

            $.ajax({
                url: `/${this.URLBaseRutinas}/GuardarPdfRutina`,
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                success: (data) => {
                    if (data.Status === 'OK') {
                        this.MostrarPdfRutina(data.Url);
                        resolve(true);
                    } else {
                        AlertManager.mostrar(data.Message || 'Error al guardar PDF', 'warning');
                        resolve(false);
                    }
                },
                error: () => {
                    AlertManager.mostrar('Error al subir el PDF', 'warning');
                    resolve(false);
                }
            });
        });
    }

    MostrarPdfRutina(url) {
        $('#pdfUploadContainer').hide();
        $('#pdfViewerContainer').show();
        $('#pdfViewer').attr('src', url);
    }

    EliminarPdfRutina() {
        $.ajax({
            url: `/${this.URLBaseRutinas}/EliminarPdfRutina`,
            type: 'POST',
            data: {
                idEquipo: this.ID_EQUIPO_PDF,
                planta: this.PLANTA_PDF
            },
            success: (data) => {
                if (data.Status === 'OK') {
                    this.LimpiarPdfRutina();
                    AlertManager.mostrar('PDF eliminado', 'success');
                }
            },
            error: () => {
                AlertManager.mostrar('Error al eliminar el PDF', 'warning');
            }
        });
    }

    LimpiarPdfRutina() {
        // ✅ Limpiar variable temporal
        this.pdfTemporalRutina = null;

        $('#inputPdfRutina').val('');
        $('#pdfViewerContainer').hide();
        $('#pdfViewer').attr('src', '');
        $('#pdfUploadContainer').show();
    }

    // ============================
    // TOOLTIPS
    // ============================
    inicializarTooltips() {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        this.tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }

    refreshTooltips() {
        // Destruir tooltips existentes
        if (this.tooltipList) {
            this.tooltipList.forEach(t => t.dispose());
        }

        // Reinicializar
        this.inicializarTooltips();
    }

    async exportarExcel() {
        try {
            const table = $('#tablaMantenimientosRango').DataTable();

            if (!table || table.rows().count() === 0) {
                AlertManager.mostrar('No hay datos para exportar', 'warning');
                return;
            }

            $('#btnExportarExcel').html('<span class="spinner-border spinner-border-sm me-2"></span>Exportando...').prop('disabled', true);

            // Obtener todos los datos de la tabla
            const data = table.rows({ search: 'applied' }).data().toArray();

            // Crear workbook y worksheet
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Mantenimientos', {
                pageSetup: {
                    paperSize: 9,
                    orientation: 'landscape',
                    fitToPage: true,
                    fitToWidth: 1,
                    fitToHeight: 0
                }
            });

            // 🎨 SECCIÓN 1: ENCABEZADO PRINCIPAL CON LOGO Y TÍTULO
            worksheet.mergeCells('A1:F1');
            const headerCell = worksheet.getCell('A1');
            headerCell.value = '📊 REPORTE DE MANTENIMIENTOS PREVENTIVOS';
            headerCell.font = {
                name: 'Segoe UI',
                size: 18,
                bold: true,
                color: { argb: 'FFFFFFFF' }
            };
            headerCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF0058A1' } // Azul PTM
            };
            headerCell.alignment = {
                vertical: 'middle',
                horizontal: 'center'
            };
            worksheet.getRow(1).height = 40;

            // 🎨 SECCIÓN 2: INFORMACIÓN DEL REPORTE
            worksheet.mergeCells('A2:C2');
            const infoCell1 = worksheet.getCell('A2');
            const fechaActual = new Date().toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            infoCell1.value = `📅 Fecha de Generación: ${fechaActual}`;
            infoCell1.font = { name: 'Segoe UI', size: 11, bold: true };
            infoCell1.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE3F2FD' } // Azul claro
            };
            infoCell1.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
            worksheet.getRow(2).height = 25;

            worksheet.mergeCells('D2:F2');
            const infoCell2 = worksheet.getCell('D2');
            infoCell2.value = `📈 Total de Registros: ${data.length}`;
            infoCell2.font = { name: 'Segoe UI', size: 11, bold: true };
            infoCell2.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE8F5E9' } // Verde claro
            };
            infoCell2.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };

            // 🎨 ESPACIO EN BLANCO
            worksheet.getRow(3).height = 10;

            // 🎨 SECCIÓN 3: ENCABEZADOS DE COLUMNAS CON GRADIENTE
            const headerRow = worksheet.getRow(4);
            const headers = [
                { text: '🏭 Línea de Producción', width: 30 },
                { text: '⚙️ Equipo', width: 40 },
                { text: '📋 Número de Orden', width: 22 },
                { text: '🕐 Hora de Apertura', width: 20 },
                { text: '📆 Periodicidad MP', width: 35 },
                { text: '👤 Técnico Responsable', width: 30 }
            ];

            headers.forEach((header, index) => {
                const col = String.fromCharCode(65 + index); // A, B, C, D, E, F
                worksheet.getColumn(col).width = header.width;

                const cell = headerRow.getCell(index + 1);
                cell.value = header.text;
                cell.font = {
                    name: 'Segoe UI',
                    size: 12,
                    bold: true,
                    color: { argb: 'FFFFFFFF' }
                };
                cell.fill = {
                    type: 'gradient',
                    gradient: 'angle',
                    degree: 90,
                    stops: [
                        { position: 0, color: { argb: 'FF1976D2' } },
                        { position: 1, color: { argb: 'FF0058A1' } }
                    ]
                };
                cell.alignment = {
                    vertical: 'middle',
                    horizontal: 'center',
                    wrapText: true
                };
                cell.border = {
                    top: { style: 'medium', color: { argb: 'FF0058A1' } },
                    left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                    bottom: { style: 'medium', color: { argb: 'FF0058A1' } },
                    right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
                };
            });
            headerRow.height = 35;

            // 🎨 SECCIÓN 4: DATOS CON FORMATO ALTERNADO
            data.forEach((row, index) => {
                const rowNumber = 5 + index;
                const excelRow = worksheet.getRow(rowNumber);

                // Alternar colores de fila
                const isEvenRow = index % 2 === 0;
                const bgColor = isEvenRow ? 'FFFFFFFF' : 'FFF5F5F5';

                const rowData = [
                    row.LineaProduccion || 'N/A',
                    `${row.NombreEquipo || ''} ${row.NumeroDocPmCalidad || ''}`.trim() || 'N/A',
                    row.NumeroOrden || '',
                    row.HoraApertura || '',
                    DateUtils.formatearPeriodicidad(
                        row.PeriodicidadMantenimiento,
                        row.DiaInicioMant,
                        row.DiaFinMant,
                        row.FechaInicioMantenimiento
                    ) || 'N/A',
                    '' // Técnico vacío
                ];

                rowData.forEach((value, colIndex) => {
                    const cell = excelRow.getCell(colIndex + 1);
                    cell.value = value;
                    cell.font = {
                        name: 'Segoe UI',
                        size: 10
                    };
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: bgColor }
                    };
                    cell.alignment = {
                        vertical: 'middle',
                        horizontal: colIndex <= 1 ? 'left' : 'center',
                        indent: colIndex <= 1 ? 1 : 0
                    };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                        right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
                    };
                });

                excelRow.height = 22;
            });

            // 🎨 SECCIÓN 5: FILA DE RESUMEN AL FINAL
            const lastRow = worksheet.getRow(5 + data.length);
            worksheet.mergeCells(`A${lastRow.number}:F${lastRow.number}`);
            const summaryCell = worksheet.getCell(`A${lastRow.number}`);
            summaryCell.value = `✅ Fin del reporte - ${data.length} registros exportados`;
            summaryCell.font = {
                name: 'Segoe UI',
                size: 11,
                bold: true,
                italic: true,
                color: { argb: 'FF666666' }
            };
            summaryCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF0F0F0' }
            };
            summaryCell.alignment = {
                vertical: 'middle',
                horizontal: 'center'
            };
            summaryCell.border = {
                top: { style: 'medium', color: { argb: 'FF0058A1' } },
                bottom: { style: 'medium', color: { argb: 'FF0058A1' } }
            };
            lastRow.height = 30;

            // 🎨 CONGELAR PANELES (Header fijo)
            worksheet.views = [
                { state: 'frozen', xSplit: 0, ySplit: 4 }
            ];

            // 🎨 AUTOFILTRO
            worksheet.autoFilter = {
                from: { row: 4, column: 1 },
                to: { row: 4, column: 6 }
            };

            // 📥 GENERAR Y DESCARGAR
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });

            const fecha = new Date().toISOString().split('T')[0];
            const nombreArchivo = `Mantenimientos_PTM_${fecha}.xlsx`;

            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = nombreArchivo;
            link.click();

            AlertManager.mostrar('¡Excel exportado con éxito! 🎉', 'success');

        } catch (error) {
            console.error('Error al exportar:', error);
            AlertManager.mostrar('Error al exportar: ' + error.message, 'warning');
        } finally {
            $('#btnExportarExcel').html('<i class="bi bi-file-earmark-excel-fill me-1"></i>Exportar').prop('disabled', false);
        }
    }
}



// ========================================
// GESTION TECNICOS PREVENTIVOS
// ========================================
// GestionTecnicos se ha movido a Scripts/Global.js para evitar duplicación.
// Usa la clase centralizada: new GestionTecnicos(URLBase)

// GestionFirmas se ha movido a Scripts/Global.js para evitar duplicación.
// Usa la clase centralizada: new GestionFirmas()

// ========================================
// GESTOR DE ESTATUS
// ========================================
class EstatusManager {
    static obtenerClaseBadge(estatus) {
        switch (estatus) {
            case 'En espera de refacción':
                return 'bg-warning';
            case 'Liberado por mantenimiento':
                return 'bg-success';
            case 'Cerrado':
                return 'bg-secondary';
            case 'Nueva':
                return 'bg-info';
            case 'Abierta':
                return 'bg-success';
            default:
                return 'bg-info';
        }
    }

    static actualizarBadge(fila, nuevoEstatus) {
        const claseBadge = this.obtenerClaseBadge(nuevoEstatus);

        fila.find('.badge')
            .removeClass('bg-info bg-warning bg-success bg-secondary')
            .addClass(claseBadge)
            .text(nuevoEstatus);
    }
}


// ========================================
// GESTOR DE PDFs PARA MANTENIMIENTO PREVENTIVO
// ========================================
class PDFManagerMantenimiento {
    constructor() {
        this.logoUrl = `${window.location.origin}/Content/Images/LogoPTMWhite.png`;
        this.printEngine = new PrintEngine();
    }

    inicializar() {
        console.log('✅ PDFManagerMantenimiento inicializado correctamente');
    }

    async exportarOrdenMantenimiento() {
        return PDFUtils.exportarOrdenMantenimiento({
            btnSelector: '#btnExportMantenimientoPDF',
            obtenerDatosDocumento: this.obtenerDatosDocumento.bind(this),
            generarContenidoHTML: this.generarContenidoHTML.bind(this),
            printEngine: this.printEngine,
            tituloTemplate: (d) => `Orden Preventiva - ${d.NumeroOrden}`
        });
    }

    // ============================
    // OBTENER DATOS DEL DOCUMENTO
    // ============================
    obtenerDatosDocumento() {
        return {
            // Header
            FechaImpresion: $('#fechaImpresion').text() || new Date().toLocaleString('es-MX'),

            // Tipo de Mantenimiento
            TipoMantenimiento1: $('.tipo-mantenimiento-section p:nth-child(2)').text() || '',
            TipoMantenimiento2: $('.tipo-mantenimiento-section p:nth-child(3)').text() || '',

            // Datos de la Orden
            NumeroOrden: $('#NumeroOrden').val() || '',
            Solicitante: $('#Solicitante').val() || '',

            // Detalles del Mantenimiento
            ClaseMantenimiento: $('#ClaseMantenimiento').val() || '',
            CodigoMantenimiento: $('#CodigoMantenimiento').val() || '',
            EstatusOrden: $('#EstatusOrden').val() || '',
            FechaInicioExtrema: $('#FechaInicioExtrema').val() || '',
            FechaFinExtrema: $('#FechaFinExtrema').val() || '',
            UbicacionTecnica: $('#UbicacionTecnica').val() || '',
            CentroCostos: $('#CentroCostos').val() || '',
            DescripcionEquipo: $('#DescripcionEquipo').val() || '',
            NumeroEquipo: $('#NumeroEquipo').val() || '',
            GrupoPlaneacion: $('#GrupoPlaneacion').val() || '',

            // Rutina
            RutinaNombreEquipo: $('#rutinaNombreEquipo').text() || '',
            RutinaProceso: $('#rutinaProceso').text() || '',
            RutinaDuracion: $('#rutinaChecklist .form-label span:first').text() || '',
            RutinaDescripcion: $('#rutinaChecklist .text-justify:first').text() || '',
            RutinaNotaInicial: $('#rutinaChecklist .position-relative:has(.text-justify) .text-justify').last().text() || '',
            RutinaNotaFinal: $('#nota_final').html() || '',
            ComentariosRutina: $('#ComentariosRutina').html() || '',
            RutinaActividades: this.obtenerActividades(),

            // ✅ NUEVOS
            RegistroTrabajo: this.obtenerRegistroTrabajo(),
            Tecnicos: this.obtenerTecnicos(),
            Firmas: this.obtenerFirmas(),
            ImagenesEvidencia: this.obtenerImagenesEvidencia()
        };
    }

    // ============================
    // ACTIVIDADES (ya existía, sin cambios)
    // ============================
    obtenerActividades() {
        const actividades = [];
        $('.actividad_realizada').each(function (index) {
            const textoActividad = $(this).find('.texto-actividad').text().trim();
            const radioChecked = $(this).find('input[type="radio"]:checked').val();
            actividades.push({
                numero: index + 1,
                texto: textoActividad,
                estado: radioChecked === 'realizado' ? 'Realizado' : (radioChecked === 'no_realizado' ? 'No Realizado' : 'Sin evaluar')
            });
        });
        return actividades;
    }

    // ============================
    // ✅ NUEVO: REGISTRO DE TRABAJO
    // ============================

    obtenerRegistroTrabajo() {
        const campoVisible = (id) => {
            const $el = $(`#${id}`);
            return $el.length && $el.is(':visible') ? $el.val() || '' : '';
        };
        return {
            HoraInicio: campoVisible('HoraInicio'),
            HoraFin: campoVisible('HoraFin'),
            TextoSecuencia: campoVisible('TextoSecuencia'),
            DuracionHrs: campoVisible('DuracionHrs')
        };
    }


    // ============================
    // ✅ NUEVO: TÉCNICOS ASIGNADOS
    // ============================
    obtenerTecnicos() {
        const tecnicos = [];
        $('#listaTecnicosAsignados .tecnico-badge').each(function () {
            const nomina = $(this).find('.tecnico-nomina').text().trim();
            const nombre = $(this).find('.tecnico-nombre').text().trim();
            if (nombre) {
                tecnicos.push({ nomina, nombre });
            }
        });
        return tecnicos;
    }

    // ============================
    // ✅ NUEVO: FIRMAS DIGITALES
    // ============================
    obtenerFirmas() {
        const extraerFirma = (canvasId, hiddenId, nombreId) => {
            let imagenBase64 = '';

            // Primero intenta desde el hidden (cargada desde archivo)
            const hiddenVal = $(`#${hiddenId}`).val();
            if (hiddenVal && hiddenVal.trim() !== '') {
                imagenBase64 = hiddenVal;
            } else {
                // Si no, intenta desde el canvas (dibujada)
                const canvas = document.getElementById(canvasId);
                if (canvas) {
                    try {
                        const dataUrl = canvas.toDataURL('image/png');
                        // Verificar que el canvas no esté vacío
                        // Un canvas vacío genera una imagen completamente transparente
                        const ctx = canvas.getContext('2d');
                        const pixelData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                        const tieneContenido = pixelData.some(channel => channel !== 0);
                        if (tieneContenido) {
                            imagenBase64 = dataUrl;
                        }
                    } catch (e) {
                        console.warn(`⚠️ No se pudo leer canvas ${canvasId}:`, e);
                    }
                }
            }

            return {
                imagen: imagenBase64,
                nombre: $(`#${nombreId}`).val() || ''
            };
        };

        return {
            Realizo: extraerFirma('canvasRealizo', 'firmaRealizoData', 'nombreRealizo'),
            Superviso: extraerFirma('canvasSuperviso', 'firmaSupervisoData', 'nombreSuperviso'),
            Mantenimiento: extraerFirma('canvasMantenimiento', 'firmaMantenimientoData', 'nombreMantenimiento')
        };
    }

    // ============================
    // ✅ NUEVO: IMÁGENES DE EVIDENCIA
    // ============================
    obtenerImagenesEvidencia() {
        const imagenes = [];
        $('#contenedorImagenesRutina .img-evidencia-rutina').each(function () {
            const src = $(this).attr('src');
            const alt = $(this).attr('alt') || '';
            if (src) {
                imagenes.push({ src, alt });
            }
        });
        return imagenes;
    }

    // ============================
    // GENERAR HTML COMPLETO
    // ============================
    generarContenidoHTML(datos) {
        return `<div style="
                width: 202mm;
                margin: 0 auto;
                padding: 3mm;
                box-sizing: border-box;
                font-family: Arial, sans-serif;
                font-size: 11px;">

                <!-- HEADER -->
            <div style="background:#2b74c0;color:white;padding:15px;border-radius:8px;margin-bottom:20px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <img src="${this.logoUrl}" style="height:40px;">
                    </div>
                    <div style="text-align:right;font-size:10px;">
                        <div>
                            <strong>Fecha:</strong> ${DateUtils.obtenerFechaHora()}
                        </div>
                        <div style="margin-top:5px;">
                            <img src="${datos.QR}" style="width:70px;">
                        </div>
                    </div>
                </div>
            </div>

                <!-- TIPO DE MANTENIMIENTO -->
                ${datos.TipoMantenimiento1 ? `
                <div class="page-break-avoid" style="background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 15px; margin-bottom: 15px;">
                    <p style="margin: 0; font-weight: bold;">${datos.TipoMantenimiento1}</p>
                    <p style="margin: 5px 0 0 0;">${datos.TipoMantenimiento2}</p>
                </div>
                ` : ''}

                <!-- DATOS DE LA ORDEN -->
                <div class="page-break-avoid" style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 15px; page-break-inside: avoid; break-inside: avoid;">
                    <div style="background: #1976d2; color: white; padding: 8px; margin: -15px -15px 15px -15px; border-radius: 7px 7px 0 0; font-weight: bold; font-size: 10.5px;">
                        📋 DATOS DE LA ORDEN
                    </div>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="width: 50%; padding: 8px; vertical-align: top;">
                                <strong style="font-size:9.5px;">Número de Orden:</strong><br>
                                <span style="font-size:10px; border-bottom: 1px solid #000; display: inline-block; min-width: 180px; padding: 2px;">${datos.NumeroOrden}</span>
                            </td>
                            <td style="width: 50%; padding: 8px; vertical-align: top;">
                                <strong style="font-size:9.5px;">Solicitante:</strong><br>
                                <span style="font-size:10px; border-bottom: 1px solid #000; display: inline-block; min-width: 180px; padding: 2px;">${datos.Solicitante}</span>
                            </td>
                        </tr>
                    </table>
                </div>

                <!-- DETALLES DEL MANTENIMIENTO -->
                <div class="page-break-avoid" style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                    <div style="background: #1976d2; color: white; padding: 8px; margin: -15px -15px 15px -15px; border-radius: 7px 7px 0 0; font-weight: bold; font-size: 10.5px;">
                        ℹ️ DETALLES DEL MANTENIMIENTO
                    </div>
                    <table style="width: 100%; border-collapse: collapse;">
                        ${this.generarFilaDetalle('Clase de Mantenimiento', datos.ClaseMantenimiento, 'Código del Mantenimiento', datos.CodigoMantenimiento)}
                        ${this.generarFilaDetalle('Estatus de la Orden', datos.EstatusOrden, 'Fecha Inicio Extrema', datos.FechaInicioExtrema)}
                        ${this.generarFilaDetalle('Fecha Fin Extrema', datos.FechaFinExtrema, 'Ubicación Técnica', datos.UbicacionTecnica)}
                        ${this.generarFilaDetalle('Centro de Costos', datos.CentroCostos, 'Descripción', datos.DescripcionEquipo)}
                        ${this.generarFilaDetalle('Número de Equipo', datos.NumeroEquipo, 'Grupo de Planeación', datos.GrupoPlaneacion)}
                    </table>
                </div>

                    <!-- RUTINA MANTENIMIENTO -->
                    ${datos.RutinaActividades.length > 0 ? `
                    <div style="margin-bottom: 15px; margin-top: 20px;">
                        <div class="page-break-avoid" style="background: #1976d2; color: white; padding: 10px; margin-bottom: 15px; border-radius: 8px; font-weight: bold;">
                            🔧 RUTINA MANTENIMIENTO
                        </div>
            
                        <div class="page-break-avoid" style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                            <p style="margin: 0 0 15px 0; font-size: 12px;">
                                <strong>Rutina de Mantenimiento Preventivo</strong> | 
                                <strong>Equipo:</strong> ${datos.RutinaNombreEquipo} | 
                                <strong>Proceso:</strong> ${datos.RutinaProceso}
                            </p>
                
                            ${datos.RutinaDuracion ? `
                            <div style="background-color: #f0f9ff; padding: 10px; margin-bottom: 10px; border-radius: 4px;">
                                <span style="font-weight: bold;">${datos.RutinaDuracion}</span>
                            </div>
                            ` : ''}
                
                            ${datos.RutinaDescripcion ? `
                            <div style="background-color: #fffbeb; padding: 10px; margin-bottom: 10px; border-radius: 4px; font-size: 10px;">
                                ${datos.RutinaDescripcion}
                            </div>
                            ` : ''}
                
                            ${datos.RutinaNotaInicial ? `
                            <div style="background-color: #fef3c7; padding: 10px; margin-bottom: 0; border-radius: 4px; font-size: 10px; border-left: 3px solid #f59e0b;">
                                <strong>Nota Inicial:</strong> ${datos.RutinaNotaInicial}
                            </div>
                            ` : ''}
                        </div>
            
                        <!-- ACTIVIDADES -->
                        ${datos.RutinaActividades.map(act => {
            const esRealizado = act.estado === 'Realizado';
            const esNoRealizado = act.estado === 'No Realizado';
            const sinEvaluar = act.estado === 'Sin evaluar';

            let estadoHTML = '';
            if (sinEvaluar) {
                estadoHTML = `
                                    <div style="display: flex; gap: 10px; align-items: center; white-space: nowrap;">
                                        <span style="display: flex; align-items: center; gap: 3px; font-size: 9px; color: #6b7280;">
                                            <span style="display: inline-block; width: 14px; height: 14px; border: 2px solid #16a34a; border-radius: 3px; background: white;"></span>
                                            Realizado
                                        </span>
                                        <span style="display: flex; align-items: center; gap: 3px; font-size: 9px; color: #6b7280;">
                                            <span style="display: inline-block; width: 14px; height: 14px; border: 2px solid #dc2626; border-radius: 3px; background: white;"></span>
                                            No Realizado
                                        </span>
                                    </div>
                                `;
            } else if (esRealizado) {
                estadoHTML = `
                                    <div style="display: flex; gap: 10px; align-items: center; white-space: nowrap;">
                                        <span style="display: flex; align-items: center; gap: 3px; font-size: 9px; color: #16a34a; font-weight: bold;">
                                            <span style="display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; border: 2px solid #16a34a; border-radius: 3px; background: #16a34a; color: white; font-size: 10px;">✓</span>
                                            Realizado
                                        </span>
                                        <span style="display: flex; align-items: center; gap: 3px; font-size: 9px; color: #d1d5db;">
                                            <span style="display: inline-block; width: 14px; height: 14px; border: 2px solid #d1d5db; border-radius: 3px; background: white;"></span>
                                            No Realizado
                                        </span>
                                    </div>
                                `;
            } else {
                estadoHTML = `
                                    <div style="display: flex; gap: 10px; align-items: center; white-space: nowrap;">
                                        <span style="display: flex; align-items: center; gap: 3px; font-size: 9px; color: #d1d5db;">
                                            <span style="display: inline-block; width: 14px; height: 14px; border: 2px solid #d1d5db; border-radius: 3px; background: white;"></span>
                                            Realizado
                                        </span>
                                        <span style="display: flex; align-items: center; gap: 3px; font-size: 9px; color: #dc2626; font-weight: bold;">
                                            <span style="display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; border: 2px solid #dc2626; border-radius: 3px; background: #dc2626; color: white; font-size: 10px;">✓</span>
                                            No Realizado
                                        </span>
                                    </div>
                                `;
            }

            return `
                                <div class="page-break-avoid" style="background-color: ${act.numero % 2 === 0 ? '#ffffff' : '#f9fafb'}; border: 1px solid #e5e7eb; padding: 10px; margin-bottom: 6px; border-radius: 6px;">
                                    <div style="display: flex; align-items: flex-start; gap: 10px;">
                                        <span style="display: inline-block; background-color: #2563eb; color: white; min-width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-size: 11px; flex-shrink: 0;">${act.numero}</span>
                                        <span style="flex: 1; line-height: 1.4; font-size: 10px;">${act.texto}</span>
                                        ${estadoHTML}
                                    </div>
                                </div>
                            `;
        }).join('')}
            
                        <!-- NOTA FINAL -->
                        ${datos.RutinaNotaFinal ? `
                            <div style="background-color: #fef3c7; padding: 10px; margin-top: 15px; margin-bottom: 15px; border-radius: 4px; font-size: 10px; border-left: 3px solid #f59e0b;">
                                <strong>Nota Final:</strong> ${datos.RutinaNotaFinal}
                            </div>
                            ` : ''}

                        <!-- COMENTARIOS -->
                        <div class="page-break-avoid" style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                            <strong style="display: block; margin-bottom: 8px; color: #374151;">Comentarios:</strong>
                            <div style="border: 1px solid #d1d5db; padding: 10px; background: #fffbeb; font-size: 10px; border-radius: 4px; min-height: 60px;">
                                ${datos.ComentariosRutina}
                            </div>
                        </div>
                    </div>
                    ` : ''}

                <!-- ✅ REGISTRO DE TRABAJO -->
                <div style="page-break-inside: avoid; break-inside: avoid;">
                ${this.generarSeccionRegistroTrabajo(datos.RegistroTrabajo, datos.Tecnicos)}
                 </div>

                <!-- ✅ IMÁGENES DE EVIDENCIA -->
                <div style="page-break-inside: avoid; break-inside: avoid;">
                ${this.generarSeccionImagenes(datos.ImagenesEvidencia)}
                </div>

                <!-- ✅ FIRMAS -->
                <div style="page-break-inside: avoid; break-inside: avoid;">
                    ${this.generarSeccionFirmas(datos.Firmas)}
                </div>

                </div>
            `;
    }

    // ============================
    // ✅ NUEVO: HTML REGISTRO DE TRABAJO
    // ============================
    generarSeccionRegistroTrabajo(registro, tecnicos) {
        const tecnicosHTML = tecnicos && tecnicos.length > 0 ? `
            <tr>
                <td colspan="2" style="padding: 8px; vertical-align: top;">
                    <strong style="font-size:9.5px;">👷 Técnicos Asignados:</strong><br>
                    <div style="margin-top: 6px; display: flex; flex-wrap: wrap; gap: 6px;">
                        ${tecnicos.map(t => `
                            <span style="
                                display: inline-flex; align-items: center; gap: 5px;
                                background: #eff6ff; border: 1px solid #bfdbfe;
                                border-radius: 20px; padding: 3px 10px; font-size: 9.5px; color: #1e40af;">
                                <strong>${t.nomina}</strong> ${t.nombre}
                            </span>
                        `).join('')}
                    </div>
                </td>
            </tr>
        ` : '';

        const textoHTML = registro.TextoSecuencia ? `
            <tr>
                <td colspan="2" style="padding: 8px; vertical-align: top;">
                    <strong style="font-size:9.5px;">📝 Actividad Realizada:</strong><br>
                    <div style="border: 1px solid #d1d5db; padding: 8px; background: #f9fafb; font-size: 10px; border-radius: 4px; margin-top: 4px; min-height: 40px;">
                        ${registro.TextoSecuencia}
                    </div>
                </td>
            </tr>
        ` : '';

        return `
            <div class="page-break-avoid" style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                <div style="background: #1976d2; color: white; padding: 8px; margin: -15px -15px 15px -15px; border-radius: 7px 7px 0 0; font-weight: bold; font-size: 10.5px;">
                    🔩 REGISTRO DE TRABAJO
                </div>
                <table style="width: 100%; border-collapse: collapse;">
                    ${this.generarFilaDetalle('⏰ Hora Inicio', registro.HoraInicio, '⏱️ Hora Fin', registro.HoraFin)}
                    ${registro.DuracionHrs ? this.generarFilaDetalle('⌛ Duración (Hrs)', registro.DuracionHrs, '', '') : ''}
                    ${tecnicosHTML}
                    ${textoHTML}
                </table>
            </div>
        `;
    }

    // ============================
    // ✅ NUEVO: HTML IMÁGENES DE EVIDENCIA
    // ============================
    generarSeccionImagenes(imagenes) {
        if (!imagenes || imagenes.length === 0) return '';

        const imagenesHTML = imagenes.map((img, index) => `
            <td style="width: 50%; padding: 5px; vertical-align: top;">
                <img src="${window.location.origin}${img.src.startsWith('/') ? img.src : '/' + img.src}"
                     alt="${img.alt}"
                     style="width: 100%; border-radius: 6px; border: 1px solid #e5e7eb; display: block;"
                     crossorigin="anonymous">
                <div style="font-size: 9px; color: #6b7280; text-align: center; margin-top: 3px;">
                    Evidencia ${index + 1}
                </div>
            </td>
        `).reduce((rows, cell, i) => {
            if (i % 2 === 0) rows.push(`<tr>${cell}`);
            else rows[rows.length - 1] += `${cell}</tr>`;
            return rows;
        }, []).map((row, i, arr) => {
            // Cerrar la última fila si tiene número impar de imágenes
            return (i === arr.length - 1 && imagenes.length % 2 !== 0)
                ? row + '<td style="width:50%;"></td></tr>'
                : row;
        }).join('');

        return `
            <div class="page-break-avoid" style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                <div style="background: #1976d2; color: white; padding: 8px; margin: -15px -15px 15px -15px; border-radius: 7px 7px 0 0; font-weight: bold; font-size: 10.5px;">
                    📸 EVIDENCIA FOTOGRÁFICA (${imagenes.length} imagen${imagenes.length > 1 ? 'es' : ''})
                </div>
                <table style="width: 100%; border-collapse: collapse;">
                    ${imagenesHTML}
                </table>
            </div>
        `;
    }

    // ============================
    // ✅ NUEVO: HTML FIRMAS DIGITALES
    // ============================
    generarSeccionFirmas(firmas) {
        const firmaCard = (titulo, color, firma) => {
            const tieneImagen = firma.imagen && firma.imagen.trim() !== '';
            const tieneNombre = firma.nombre && firma.nombre.trim() !== '';

            return `
                <td style="width: 33.33%; padding: 8px; vertical-align: top;">
                    <div style="border: 2px solid ${color}; border-radius: 8px; overflow: hidden;">
                        <div style="background: ${color}; color: white; padding: 6px 10px; font-size: 9.5px; font-weight: bold;">
                            ${titulo}
                        </div>
                        <div style="padding: 8px; background: #f8f9fa; min-height: 80px; display: flex; align-items: center; justify-content: center;">
                            ${tieneImagen
                    ? `<img src="${firma.imagen}" alt="Firma ${titulo}" style="max-width: 100%; max-height: 80px; display: block;">`
                    : `<span style="font-size: 9px; color: #9ca3af; font-style: italic;">Sin firma</span>`
                }
                        </div>
                        <div style="padding: 6px 10px; border-top: 1px solid #e5e7eb; font-size: 9.5px; min-height: 28px;">
                            <strong>Nombre:</strong>
                            <span style="border-bottom: 1px solid #000; display: inline-block; min-width: 100px; padding: 1px 2px;">
                                ${tieneNombre ? firma.nombre : ''}
                            </span>
                        </div>
                    </div>
                </td>
            `;
        };

        return `
            <div class="page-break-avoid" style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                <div style="background: #1976d2; color: white; padding: 8px; margin: -15px -15px 15px -15px; border-radius: 7px 7px 0 0; font-weight: bold; font-size: 10.5px;">
                    ✍️ FIRMAS DIGITALES
                </div>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        ${firmaCard('Técnico MTTO', '#1d4ed8', firmas.Realizo)}
                        ${firmaCard('Supervisor Producción', '#15803d', firmas.Superviso)}
                        ${firmaCard('Supervisor Mantenimiento', '#0369a1', firmas.Mantenimiento)}
                    </tr>
                </table>
            </div>
        `;
    }

    // ============================
    // MÉTODOS EXISTENTES SIN CAMBIOS
    // ============================
    generarFilaDetalle(label1, valor1, label2, valor2) {
        const icon1 = this.obtenerIconoCampo(label1);
        const icon2 = this.obtenerIconoCampo(label2);
        if (label2 && valor2) {
            return `
                <tr>
                    <td style="width: 50%; padding: 8px; vertical-align: top;">
                        <strong style="font-size:9.5px;">${icon1} ${label1}:</strong><br>
                        <span style="font-size:10px; border-bottom: 1px solid #000; display: inline-block; min-width: 180px; padding: 2px;">
                            ${valor1 || ''}
                        </span>
                    </td>
                    <td style="width: 50%; padding: 8px; vertical-align: top;">
                        <strong style="font-size:9.5px;">${icon2} ${label2}:</strong><br>
                        <span style="font-size:10px; border-bottom: 1px solid #000; display: inline-block; min-width: 180px; padding: 2px;">
                            ${valor2 || ''}
                        </span>
                    </td>
                </tr>
                `;
        }
        else {
            return `
            <tr>
                <td style="width: 50%; padding: 8px; vertical-align: top;">
                    <strong style="font-size:9.5px;">${icon1} ${label1}:</strong><br>
                    <span style="font-size:10px; border-bottom: 1px solid #000; display: inline-block; min-width: 180px; padding: 2px;">
                        ${valor1 || ''}
                    </span>
                </td>
            </tr>
            `;
        }
    }

    obtenerOpcionesPDF() {
        const numeroOrden = document.getElementById('NumeroOrden')?.value || 'SIN_NUMERO';
        const fecha = new Date().toISOString().split('T')[0];
        return {
            margin: [4, 4, 4, 4],
            filename: `Orden_Mantenimiento_${numeroOrden}_${fecha}.pdf`,
            html2canvas: { scale: 1.5, useCORS: true, letterRendering: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: {
                mode: ['avoid-all', 'css', 'legacy'],
                before: '.page-break-before',
                after: '.page-break-after',
                avoid: '.page-break-avoid'
            }
        };
    }

    obtenerIconoCampo(label) {
        const iconos = {
            'Número de Orden': '📄',
            'Solicitante': '👤',
            'Clase de Mantenimiento': '⚙️',
            'Código del Mantenimiento': '🏷️',
            'Estatus de la Orden': '📊',
            'Fecha Inicio Extrema': '📅',
            'Fecha Fin Extrema': '📅',
            'Ubicación Técnica': '📍',
            'Centro de Costos': '💰',
            'Descripción': '📝',
            'Número de Equipo': '🏭',
            'Grupo de Planeación': '📋'
        };
        return iconos[label] || '▪️';
    }
}

// ========================================
// GESTOR DE IMPRESIÓN PARA MANTENIMIENTO PREVENTIVO
// ========================================
class PrintManagerMantenimiento {
    constructor(mantenimientoManager) {
        this.logoUrl = `${window.location.origin}/Content/Images/LogoPTMWhite.png`;
        this.mantenimientoManager = mantenimientoManager;

        // Configurar PrintManagerGeneric
        this.genericPrint = new PrintManagerGeneric({
            logoUrl: this.logoUrl,
            getDatosDelBoton: this.obtenerDatosDelBoton.bind(this),
            getDatosExtra: async (datos, btn, win) => {
                // traer rutina desde servidor y devolverla
                const rutina = await this.consultarRutinaServidor(datos.idEquipo);
                return rutina;
            },
            generarContenidoHTML: this.generarContenidoHTML.bind(this),
            obtenerEstilos: this.obtenerEstilosImpresion.bind(this),
            tituloTemplate: (d) => `Orden Preventiva - ${d.NumeroOrden}`
        });
    }

    inicializar() {
        console.log('✅ PrintManagerMantenimiento inicializado correctamente');
    }

    async prepararImpresionDirecta(btn, win) {
        // Delegar a manager genérico
        return this.genericPrint.prepararImpresionDirecta(btn, win);
    }

    obtenerDatosDelBoton(btn) {
        // 🔥 Extraer TODOS los data attributes del botón
        const idEquipo = btn.data('idequipo');
        const planta = btn.data('planta');
        const numeroDocPmCalidad = btn.data('numerodocpmcalidad');
        const nombreEquipo = btn.data('nombreequipo');
        const descripcionEquipo = btn.data('descripcionequipo');
        const area = btn.data('area');
        const lineaProduccion = btn.data('lineaproduccion');
        const centrocostos = btn.data('centrocostos');
        const fechaInicioMantenimiento = btn.data('fechainiciomantenimiento');
        const fechaFinMantenimiento = btn.data('fechafinmantenimiento');
        const tipoMantenimiento = btn.data('tipomantenimiento');
        const numeroOrden = btn.data('numeroorden');
        const descEstatusOrden = btn.data('descestatusorden');
        const idMantenimiento = btn.data('idmantenimiento');

        // 🔥 Formatear fechas de DD/MM/YYYY a YYYY-MM-DD
        let fechaInicio = '';
        let fechaFin = '';

        if (fechaInicioMantenimiento) {
            const [dia1, mes1, anio1] = fechaInicioMantenimiento.split('/');
            fechaInicio = `${anio1}-${mes1}-${dia1}`;
        }

        if (fechaFinMantenimiento) {
            const [dia2, mes2, anio2] = fechaFinMantenimiento.split('/');
            fechaFin = `${anio2}-${mes2}-${dia2}`;
        }

        // 🔥 Obtener datos del usuario desde el manager (igual que abrirModalCaratulaOnline)
        const datos_usuario = this.mantenimientoManager.datos_usuario;

        // 🔥 Retornar objeto con todos los datos formateados
        return {
            FechaImpresion: DateUtils.obtenerFechaHora(),
            TipoMantenimiento1: planta == "1" ? 'Mantenimiento Preventivo Z20' : 'Mantenimiento Preventivo',
            TipoMantenimiento2: `Equipo: ${nombreEquipo} | Área: ${area}`,
            NumeroOrden: numeroOrden || '',
            Solicitante: datos_usuario[0].EMAIL || '',
            ClaseMantenimiento: (planta == "1" ? tipoMantenimiento : "Preventivo"),
            CodigoMantenimiento: `${planta == "1" ? "PL1" : "PL2"}-PMT${area}01-L01-F01`,
            EstatusOrden: descEstatusOrden || '',
            FechaInicioExtrema: fechaInicio,
            FechaFinExtrema: fechaFin,
            UbicacionTecnica: `AREA ${area}`,
            CentroCostos: centrocostos || '',
            DescripcionEquipo: descripcionEquipo || '',
            NumeroEquipo: numeroDocPmCalidad || '',
            GrupoPlaneacion: `${planta}_${area}`,
            RutinaNombreEquipo: `${nombreEquipo} ${numeroDocPmCalidad}`,
            RutinaProceso: area || '',
            idEquipo: idEquipo,
            idMantenimiento: idMantenimiento,
            Comentarios: '' // Vacío por defecto para impresión
        };
    }

    async consultarRutinaServidor(idEquipo) {
        // 🔥 Reutilizar la URL base del manager
        const URLBaseRutinas = this.mantenimientoManager.URLBaseRutinas;

        return new Promise((resolve, reject) => {
            $.ajax({
                url: `/${URLBaseRutinas}/Default`,
                type: 'GET',
                data: { idEquipo: idEquipo },
                dataType: 'html',
                success: (html) => {
                    // 🔥 Parsear el HTML y extraer los datos
                    const $html = $(html);

                    const rutina = {
                        RutinaDuracion: $html.find('.form-label span:first').text() || '',
                        RutinaDescripcion: $html.find('.text-justify:first').text() || '',
                        RutinaNotaInicial: $html.find('.position-relative:has(.text-justify) .text-justify').last().text() || '',
                        RutinaNotaFinal: $html.find('#nota_final').html() || '',
                        RutinaActividades: this.extraerActividades($html)
                    };

                    resolve(rutina);
                },
                error: (error) => {
                    console.error('Error al consultar rutina:', error);
                    // Retornar datos vacíos en caso de error
                    resolve({
                        RutinaDuracion: '',
                        RutinaDescripcion: '',
                        RutinaNotaInicial: '',
                        RutinaNotaFinal: '',
                        RutinaActividades: []
                    });
                }
            });
        });
    }

    extraerActividades($html) {
        const actividades = [];
        $html.find('.actividad').each(function (index) {
            const textoActividad = $(this).find('.texto-actividad').text().trim();
            actividades.push({
                numero: index + 1,
                texto: textoActividad,
                estado: 'Sin evaluar' // Por defecto sin evaluar para impresión
            });
        });
        return actividades;
    }

    imprimirOrdenMantenimiento(datos, win) {
        try {
            const html = this.generarContenidoHTML(datos);
            const estilos = this.obtenerEstilosImpresion();

            this.printEngine.imprimir({
                html,
                estilos,
                titulo: `Orden Preventiva - ${datos.NumeroOrden}`,
                autoClose: true,
                win // 🔥 le pasas la ventana ya abierta
            });

        } catch (error) {
            console.error('Error al generar impresión:', error);
            AlertManager.mostrar('Error al preparar la impresión.', 'warning');
        }
    }

    obtenerEstilosImpresion() {
        return `
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: Arial, sans-serif;
            padding: 15px;
            background: white;
            color: #000;
        }
        
        @media print {
            @page { margin: 6mm 5mm; size: A4 portrait; }
            body { margin: 0; padding: 0; }
            .page-break-avoid { page-break-inside: avoid; break-inside: avoid; }
        }
        
        .contenedor-principal {
            width: 100%;
            max-width: 200mm;
            margin: 0 auto;
            font-size: 11.5px; /* 🔥 subimos un poco */
            line-height: 1.45;
        }

        /* HEADER */
        .encabezado {
            background: #1976d2;
            color: white;
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 8px;
            display: table;
            width: 100%;
        }

        .encabezado-logo {
            display: table-cell;
            width: 120px;
            vertical-align: middle;
        }

        .encabezado-logo img {
            max-width: 100%;
            max-height: 50px;
            display: block;
        }

        .encabezado-fecha {
            display: table-cell;
            text-align: right;
            vertical-align: middle;
            font-size: 10px;
        }

        /* BANNER */
        .banner-tipo {
            background-color: #f0f9ff;
            border-left: 4px solid #2563eb;
            padding: 15px;
            margin-bottom: 15px;
        }

        .banner-tipo p { margin: 0; }
        .banner-tipo-titulo { font-weight: bold; margin-bottom: 5px; }

        /* SECCIONES */
        .seccion {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
        }

        /* 🔥 ligeramente más grande */
        .seccion-header {
            background: #1976d2;
            color: white;
            padding: 9px 12px;
            margin: -15px -15px 15px -15px;
            border-radius: 7px 7px 0 0;
            font-weight: bold;
            font-size: 10.8px;
            letter-spacing: 0.3px;
        }

        /* TABLA */
        .tabla-detalles {
            width: 100%;
            border-collapse: collapse;
        }

        .tabla-detalles td {
            width: 50%;
            padding: 8px;
            vertical-align: top;
        }

        /* 🔥 aquí está el balance bueno */
        .campo-label {
            font-weight: bold;
            display: block;
            margin-bottom: 2px;
            font-size: 9.5px;
        }

        .campo-valor {
            border-bottom: 1px solid #000;
            display: inline-block;
            min-width: 180px;
            padding: 2px;
            font-size: 10.2px;
        }

        /* RUTINA */
        .rutina-header {
            background: #1976d2;
            color: white;
            padding: 10px;
            margin-bottom: 15px;
            border-radius: 8px;
            font-weight: bold;
        }

        .rutina-info {
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 15px;
        }

        .rutina-titulo {
            margin: 0 0 15px 0;
            font-size: 12px;
        }

        .rutina-duracion {
            background-color: #f0f9ff;
            padding: 10px;
            margin-bottom: 10px;
            border-radius: 4px;
        }

        .rutina-descripcion {
            background-color: #fffbeb;
            padding: 10px;
            margin-bottom: 10px;
            border-radius: 4px;
            font-size: 10px;
        }

        .rutina-nota {
            background-color: #fef3c7;
            padding: 10px;
            border-radius: 4px;
            font-size: 10px;
            border-left: 3px solid #f59e0b;
            margin: 15px 0;
        }

        /* ACTIVIDADES */
        .actividad {
            background-color: #ffffff;
            border: 1px solid #e5e7eb;
            padding: 10px;
            margin-bottom: 6px;
            border-radius: 6px;
            display: table;
            width: 100%;
        }

        .actividad:nth-child(even) {
            background-color: #f9fafb;
        }

        .actividad-numero {
            display: table-cell;
            width: 30px;
            vertical-align: top;
        }

        .actividad-numero-circulo {
            display: inline-block;
            background-color: #2563eb;
            color: white;
            min-width: 24px;
            height: 24px;
            border-radius: 50%;
            text-align: center;
            line-height: 24px;
            font-size: 11px;
        }

        .actividad-texto {
            display: table-cell;
            vertical-align: top;
            padding-left: 10px;
            line-height: 1.4;
            font-size: 10px;
        }

        .actividad-estado {
            display: table-cell;
            width: 200px;
            vertical-align: top;
            text-align: right;
        }

        /* ESTADOS */
        .estado-opciones {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
            white-space: nowrap;
        }

        .estado-opcion {
            display: flex;
            align-items: center;
            gap: 3px;
            font-size: 9px;
        }

        .checkbox {
            display: inline-block;
            width: 14px;
            height: 14px;
            border: 2px solid;
            border-radius: 3px;
            background: white;
        }

        .checkbox-realizado { border-color: #16a34a; }
        .checkbox-no-realizado { border-color: #dc2626; }

        .checkbox-marcado {
            background: currentColor;
            color: white;
            text-align: center;
            line-height: 10px;
            font-size: 10px;
        }

        .estado-realizado { color: #16a34a; font-weight: bold; }
        .estado-no-realizado { color: #dc2626; font-weight: bold; }
        .estado-sin-evaluar { color: #6b7280; }
        .checkbox-deshabilitado { border-color: #d1d5db; }

        /* COMENTARIOS */
        .comentarios-contenedor {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
        }

        .comentarios-label {
            display: block;
            margin-bottom: 8px;
            color: #374151;
            font-weight: bold;
        }

        .comentarios-valor {
            border: 1px solid #d1d5db;
            padding: 10px;
            background: #fffbeb;
            font-size: 10px;
            border-radius: 4px;
            min-height: 60px;
        }
        
        .fade-out {
            opacity: 0;
        }
    `;
    }

    generarContenidoHTML(datos) {
        return `
    <div class="contenedor-principal">
        <div class="encabezado page-break-avoid"
     style="display:flex;justify-content:space-between;align-items:center;">
    <div class="encabezado-logo">
        <img src="${this.logoUrl}" alt="Logo PTM" />
    </div>
    <div class="encabezado-fecha" style="text-align:right;">
        <div>
            <strong>Fecha:</strong> ${datos.FechaImpresion}
        </div>
        <div style="margin-top:5px;">
            <img src="${datos.QR}" style="width:70px;">
        </div>
    </div>
    </div>

        ${datos.TipoMantenimiento1 ? `
        <div class="banner-tipo page-break-avoid">
            <p class="banner-tipo-titulo">${datos.TipoMantenimiento1}</p>
            <p>${datos.TipoMantenimiento2}</p>
        </div>
        ` : ''}

        <div class="seccion page-break-avoid">
            <div class="seccion-header">📋 DATOS DE LA ORDEN</div>
            <table class="tabla-detalles">
                <tr>
                    <td><span class="campo-label">Número de Orden:</span><span class="campo-valor">${datos.NumeroOrden}</span></td>
                    <td><span class="campo-label">Solicitante:</span><span class="campo-valor">${datos.Solicitante}</span></td>
                </tr>
            </table>
        </div>

        <div class="seccion page-break-avoid">
            <div class="seccion-header">ℹ️ DETALLES DEL MANTENIMIENTO</div>
            <table class="tabla-detalles">
                ${this.generarFilaDetalle('Clase de Mantenimiento', datos.ClaseMantenimiento, 'Código del Mantenimiento', datos.CodigoMantenimiento)}
                ${this.generarFilaDetalle('Estatus de la Orden', datos.EstatusOrden, 'Fecha Inicio Extrema', datos.FechaInicioExtrema)}
                ${this.generarFilaDetalle('Fecha Fin Extrema', datos.FechaFinExtrema, 'Ubicación Técnica', datos.UbicacionTecnica)}
                ${this.generarFilaDetalle('Centro de Costos', datos.CentroCostos, 'Descripción', datos.DescripcionEquipo)}
                ${this.generarFilaDetalle('Número de Equipo', datos.NumeroEquipo, 'Grupo de Planeación', datos.GrupoPlaneacion)}
            </table>
        </div>

        ${datos.RutinaActividades && datos.RutinaActividades.length > 0 ? `
        <div style="margin-bottom: 15px; margin-top: 20px;">
            <div class="rutina-header page-break-avoid">🔧 RUTINA MANTENIMIENTO</div>
            
            <div class="rutina-info page-break-avoid">
                <p class="rutina-titulo">
                    <strong>Rutina de Mantenimiento Preventivo</strong> | 
                    <strong>Equipo:</strong> ${datos.RutinaNombreEquipo} | 
                    <strong>Proceso:</strong> ${datos.RutinaProceso}
                </p>
                ${datos.RutinaDuracion ? `<div class="rutina-duracion"><span style="font-weight: bold;">${datos.RutinaDuracion}</span></div>` : ''}
                ${datos.RutinaDescripcion ? `<div class="rutina-descripcion">${datos.RutinaDescripcion}</div>` : ''}
                ${datos.RutinaNotaInicial ? `<div class="rutina-nota"><strong>Nota Inicial:</strong> ${datos.RutinaNotaInicial}</div>` : ''}
            </div>

            ${datos.RutinaActividades.map(act => this.generarActividadHTML(act)).join('')}
            
            ${datos.RutinaNotaFinal ? `<div class="rutina-nota"><strong>Nota Final:</strong> ${datos.RutinaNotaFinal}</div>` : ''}

            <div class="comentarios-contenedor page-break-avoid">
                <span class="comentarios-label">Comentarios:</span>
                <div class="comentarios-valor">${datos.Comentarios}</div>
            </div>
        </div>
        ` : ''}
    </div>
`;
    }

    generarActividadHTML(act) {
        const esRealizado = act.estado === 'Realizado';
        const esNoRealizado = act.estado === 'No Realizado';

        let estadoHTML = '';
        if (act.estado === 'Sin evaluar') {
            estadoHTML = `
                <div class="estado-opciones">
                    <span class="estado-opcion estado-sin-evaluar">
                        <span class="checkbox checkbox-realizado"></span> Realizado
                    </span>
                    <span class="estado-opcion estado-sin-evaluar">
                        <span class="checkbox checkbox-no-realizado"></span> No Realizado
                    </span>
                </div>
            `;
        } else if (esRealizado) {
            estadoHTML = `
                <div class="estado-opciones">
                    <span class="estado-opcion estado-realizado">
                        <span class="checkbox checkbox-realizado checkbox-marcado">✓</span> Realizado
                    </span>
                    <span class="estado-opcion" style="color: #d1d5db;">
                        <span class="checkbox checkbox-deshabilitado"></span> No Realizado
                    </span>
                </div>
            `;
        } else {
            estadoHTML = `
                <div class="estado-opciones">
                    <span class="estado-opcion" style="color: #d1d5db;">
                        <span class="checkbox checkbox-deshabilitado"></span> Realizado
                    </span>
                    <span class="estado-opcion estado-no-realizado">
                        <span class="checkbox checkbox-no-realizado checkbox-marcado">✓</span> No Realizado
                    </span>
                </div>
            `;
        }

        return `
            <div class="actividad page-break-avoid">
                <div class="actividad-numero">
                    <span class="actividad-numero-circulo">${act.numero}</span>
                </div>
                <div class="actividad-texto">${act.texto}</div>
                <div class="actividad-estado">${estadoHTML}</div>
            </div>
        `;
    }

    generarFilaDetalle(label1, valor1, label2, valor2) {

        const icon1 = this.obtenerIconoCampo(label1);
        const icon2 = this.obtenerIconoCampo(label2);

        return `
    <tr>
        <td>
            <span class="campo-label">
                ${icon1} ${label1}:
            </span>
            <span class="campo-valor">${valor1 || ''}</span>
        </td>

        <td>
            <span class="campo-label">
                ${icon2} ${label2}:
            </span>
            <span class="campo-valor">${valor2 || ''}</span>
        </td>
    </tr>
    `;
    }

    obtenerIconoCampo(label) {

        const iconos = {
            'Número de Orden': '📄',
            'Solicitante': '👤',
            'Clase de Mantenimiento': '⚙️',
            'Código del Mantenimiento': '🏷️',
            'Estatus de la Orden': '📊',
            'Fecha Inicio Extrema': '📅',
            'Fecha Fin Extrema': '📅',
            'Ubicación Técnica': '📍',
            'Centro de Costos': '💰',
            'Descripción': '📝',
            'Número de Equipo': '🏭',
            'Grupo de Planeación': '📋'
        };

        return iconos[label] || '▪️';
    }
}

