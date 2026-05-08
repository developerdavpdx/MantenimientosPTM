// ========================================
// APLICACIÓN PRINCIPAL
// ========================================
class MantenimientosCorrectivosApp {
    constructor() {
        this.URLBase = "MantenimientosCorrectivos";
        this.URLBaseEquipos = "Equipos";
        this.URLBaseRutinas = "Rutinas";
        this.datos_usuario = GlobalUtil.getDatosUsuario();
        this.gestionEquipos = new GestionEquipos(
            '#BuscarEquipo',
            '#sugerenciasEquipos',
            '#FormNombreEquipo',
            '#FormDescEquipo',
            '#FormCentroCostos',
            '#FormNumDocPmCalidad',
            '#FormLinea',
            GlobalUtil.URLBaseEquipos,
            'alertContainer',
            this.datos_usuario
        );
        this.mantenimientoManager = new MantenimientoManager(
            this.URLBase,
            this.URLBaseRutinas,
            this.gestionTecnicos,
            this.datos_usuario
        );
        this.pdfManager = new PDFManagerMantenimiento();
        this.printManager = new PrintManagerMantenimiento(); // 🔥 Nueva instancia

        window.AppMantenimientos = this;
    }

    inicializar() {
        UIManager.inicializarUI(this.datos_usuario);
        this.gestionEquipos.inicializar();
        this.mantenimientoManager.inicializar();
        this.pdfManager.inicializar();
        this.printManager.inicializar(); // 🔥 Inicializar

        this.configurarEventosGestionEquipos();
        this.configurarEventosMantenimientosManager();
        this.configurarEventosPDF();
        this.configurarEventosImpresion(); // 🔥 Nuevos eventos

        console.log('✅ Sistema Completo de Mantenimientos Correctivos inicializado correctamente');
    }

    //GESTION DE EQUIPOS
    configurarEventosGestionEquipos() {
        // ✅ Input de búsqueda
        $('#BuscarEquipo').on('input', (e) => {
            const query = $(e.target).val().trim();
            if (query.length >= 2) {
                this.gestionEquipos.buscarEquipos(query,this.datos_usuario[0].EMAIL);
            } else {
                this.gestionEquipos.ocultarSugerencias();
            }
        });

        // ✅ Enter en el input (opcional, ya que el click en sugerencia funciona)
        $('#BuscarEquipo').on('keypress', (e) => {
            if (e.which === 13) {
                e.preventDefault();
                // Aquí podrías seleccionar el primer resultado si quieres
            }
        });

        // ✅ Click fuera para cerrar sugerencias
        $(document).on('click', (e) => {
            if (!$(e.target).closest('#BuscarEquipo, #sugerenciasEquipos').length) {
                this.gestionEquipos.ocultarSugerencias();
            }
        });
    }

    configurarEventosMantenimientosManager() {
        //Solicitar Mantenimeinto Correctivo
        $('#formSolicitudCorrectivo').on('submit', (e) => this.mantenimientoManager.enviarSolicitudMantenimientoCorrectivo(e));
    }

    configurarEventosPDF() {
        $('#btnExportMantenimientoPDF').on('click', () => this.pdfManager.exportarOrdenMantenimiento());
    }

    // 🔥 Nuevo método para eventos de impresión
    configurarEventosImpresion() {
        $('#btnImprimirOrden').on('click', () => this.printManager.imprimirOrdenMantenimiento());
    }
}

// ========================================
// INICIALIZACIÓN
// ========================================
$(document).ready(function () {
    const app = new MantenimientosCorrectivosApp();
    app.inicializar();
});


// ========================================
// GESTOR DE UI
// ========================================
class UIManager {
    static inicializarUI(datos_usuario) {
        $("#MantenimientosContainer").addClass("selected");
        $("#MantenimientosContainer a").addClass("whiteText");
        $("#mantenimientos-collapse").addClass("show");
        $("#mantenimientos-collapse").addClass("show");
        $("#MantenimientosCorrectivosContainer").addClass("selected");
        $("#MantenimientosCorrectivosContainer a").addClass("whiteText");
        $("#manntocorrectivo-collapse").addClass("show");
        $("#MCProgramarURL").addClass("selected-item");

        $("#fechaImpresion").text(DateUtils.obtenerFechaActual());
        $("#horaImpresion").text(DateUtils.obtenerHoraActualCorta());
    }
}

// ========================================
// GESTOR DE MANTENIMIENTOS
// ========================================
class MantenimientoManager {
    constructor(URLBase, URLBaseRutinas, gestionTecnicos, datos_usuario) {  // ⬅️ Recibe la instancia
        this.URLBase = URLBase;
        this.URLBaseRutinas = URLBaseRutinas;
        this.gestionTecnicos = gestionTecnicos;  // 🔥 Ahora tiene acceso directo
        this.datos_usuario = datos_usuario;
        this.ID_EQUIPO = "";
    }

    inicializar() {
        console.log('✅ MantenimientoManager inicializado correctamente');
    }
    // ============================
    // MANTENIMIENTO CORRECTIVO
    // ============================
    enviarSolicitudMantenimientoCorrectivo(e) {

        e.preventDefault(); // Evitar el submit tradicional

        // Validar formulario
        if (!ValidationManager.validarFormulario('#formSolicitudCorrectivo')) {
            AlertManager.mostrar('Por favor, complete correctamente todos los campos', 'warning');
            return false;
        }

        // Recopilar los datos
        const datos = GlobalUtil.obtenerDatosAnyFormulario("formSolicitudCorrectivo");
        let equipo_seleccionado = window.AppMantenimientos.gestionEquipos.obtenerEquipoSeleccionado();
        if (equipo_seleccionado == undefined || equipo_seleccionado == null) {
            AlertManager.mostrar('No ha seleccionado ningún equipo para la solicitud de mantenimiento correctivo.', 'warning');
            return false;
        }
        datos.IdEquipo = equipo_seleccionado.IdEquipo;
        datos.UsuarioCreacion = this.datos_usuario[0].EMAIL;

        $("#btnGuardarCorrectivo").html('<span class="spinner-border spinner-border-sm me-2"></span>Guardando...');
        $("#btnGuardarCorrectivo").prop("disabled", true);

        let TipoUsuario = this.datos_usuario[0].TIPOUSUARIO;

        $.ajax({
            url: `/${this.URLBase}/InsertarSolicitudMC`,
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
                    $("#btnGuardarCorrectivo").html('<i class="bi bi-check-circle-fill me-2 text-white"></i>Solicitud generada correctamente');

                    let ID_SOLICITUD = JSON.parse(response.Data);

                    // Enviar como array
                    let solicitudes_MC = [{
                        IdSolicitud: ID_SOLICITUD[0].ID_SOLICITUD,
                        NombreEquipo: "",
                        Usuario: this.datos_usuario[0].EMAIL
                    }];

                    //INSERTAR OT
                    $.ajax({
                        url: `/${this.URLBase}/InsertarMC`,
                        type: 'POST',
                        contentType: 'application/json; charset=utf-8',
                        data: JSON.stringify(solicitudes_MC),
                        dataType: 'json',
                        success: (response) => {
                            if (response.Status === 'SI') {
                                setTimeout(function () {
                                    $("#btnGuardarCorrectivo").html('<i class="bi bi-save-fill me-1"></i>Guardar');
                                    $("#btnGuardarCorrectivo").prop("disabled", false);
                                }, 3000);
                                //OBTENER MC
                                $.ajax({
                                    url: `/${this.URLBase}/GetMantenimientoCorrectivo`,
                                    type: 'GET',
                                    contentType: 'application/json; charset=utf-8',
                                    data: {
                                        "ID_SOLICITUD": ID_SOLICITUD[0].ID_SOLICITUD
                                    },
                                    dataType: 'json',
                                    success: (response) => {
                                        this.abrirModalCaratulaOnline(response[0]);
                                        //RESET FORM
                                        $("#formSolicitudCorrectivo")[0].reset();
                                        $("#formSolicitudCorrectivo").removeClass("was-validated");
                                    },
                                    error: (xhr, status, error) => {
                                        $("#btnGuardarCorrectivo").html('<i class="bi bi-save me-1"></i>Guardar');
                                        $("#btnGuardarCorrectivo").prop("disabled", false);
                                        AlertManager.mostrar('Error al conectar con el servidor', 'warning', "alertaMCContainer");
                                    }
                                });

                            } else {
                                $("#btnGuardarCorrectivo").html('<i class="bi bi-save me-1"></i>Guardar');
                                $("#btnGuardarCorrectivo").prop("disabled", false);
                                AlertManager.mostrar(response.Message || 'Error al realizar la solicitud de nuevo mantenimiento correctivo.', 'warning', "alertaMCContainer");
                            }
                        },
                        error: (xhr, status, error) => {
                            $("#btnGuardarCorrectivo").html('<i class="bi bi-save me-1"></i>Guardar');
                            $("#btnGuardarCorrectivo").prop("disabled", false);
                            AlertManager.mostrar('Error al conectar con el servidor', 'warning', "alertaMCContainer");
                        }
                    });

                } else {
                    $("#btnGuardarCorrectivo").html('<i class="bi bi-save me-1"></i>Guardar');
                    $("#btnGuardarCorrectivo").prop("disabled", false);
                    AlertManager.mostrar(response.Message || 'Error al realizar la solicitud de nuevo mantenimiento correctivo.', 'warning', "alertaMCContainer");
                }
            },
            error: (xhr, status, error) => {
                $("#btnGuardarCorrectivo").html('<i class="bi bi-save me-1"></i>Guardar');
                $("#btnGuardarCorrectivo").prop("disabled", false);
                AlertManager.mostrar('Error al conectar con el servidor', 'warning', "alertaMCContainer");
            }
        });
    }

    abrirModalCaratulaOnline(btn,) {
        // ===== OBTENER TODOS LOS DATA ATTRIBUTES DEL CORRECTIVO =====
        const idSolicitud = btn.IdSolicitud;
        const idEquipo = btn.IdEquipo;
        const planta = btn.Planta;
        const numeroDocPmCalidad = btn.NumeroDocPmCalidad;
        const nombreEquipo = btn.NombreEquipo;
        const descripcionEquipo = btn.DescripcionEquipo;
        const idArea = btn.IdArea;
        const area = btn.Area;
        const idLineaProduccion = btn.IdLineaProduccion;
        const lineaProduccion = btn.LineaProduccion;
        const centrocostos = btn.CentroCostos;
        const tipoMantenimiento = btn.TipoMantenimiento;
        const solicitante = btn.Solicitante;
        const nominaSolicitante = btn.NominaSolicitante;
        const claseMantenimiento = btn.ClaseMantenimiento;
        const textoCorto = btn.TextoCorto;
        const fechaCreacion = btn.FechaCreacion;
        const numeroOrden = btn.NumeroOrden;
        const areaTecnica = $("#AreaTecnicaR").val();
        const horaApertura = btn.HoraApertura;
        const estatusOrden = btn.EstatusOrden;
        const descEstatusOrden = btn.DescEstatusOrden;
        const idMantenimiento = btn.IdMantenimiento;

        // Reset del formulario
        $("#formOrdenMantenimiento")[0].reset();
        ValidationManager.limpiarValidacion('#formOrdenMantenimiento');

        // ===== LLENAR EL MODAL CON LOS DATOS DEL CORRECTIVO =====

        // 🔹 Datos de la Orden
        $('#AreaTecnica').val(areaTecnica || '');
        $('#NumeroOrden').val(numeroOrden || '');
        $('#Solicitante').val(solicitante || '');
        $('#NominaSolicitante').val(nominaSolicitante || '');

        // 🔹 Clase de Mantenimiento
        $('#ClaseMantenimiento').val(claseMantenimiento || 'Z10');

        // 🔹 Nombre del equipo
        $('#NombreEquipo').val(nombreEquipo || '');

        // 🔹 Descripcion del equipo
        $('#DescEquipo').val(descripcionEquipo || '');

        // 🔹 Texto Corto (Descripción de la falla)
        $('#TextoCorto').val(textoCorto || '');

        // 🔹 Estatus de la Orden
        $("#EstatusOrden").val(descEstatusOrden || '');

        // 🔹 Fecha y Hora (usar horaApertura que trae ambos)
        if (horaApertura) {
            // horaApertura = "15/12/2025 13:28:02"
            const [fechaParte, horaParte] = horaApertura.split(' ');

            // ✅ FECHA - Convertir DD/MM/YYYY a YYYY-MM-DD
            const [dia, mes, anio] = fechaParte.split('/');
            $("#FechaInicioExtrema").val(`${anio}-${mes}-${dia}`);

            // ✅ HORA - Tomar solo HH:MM
            $("#HoraInicio").val(horaParte.substring(0, 5));
        }

        // 🔹 Ubicación Técnica
        $("#UbicacionTecnica").val(area ? `AREA ${area}` : '');

        // 🔹 Centro de Costos
        $("#CentroCostos").val(centrocostos || '');

        // 🔹 Doc PM Calidad
        $("#NumDocPmCalidad").val(numeroDocPmCalidad || '');

        // 🔹 Línea
        $("#Linea").val(lineaProduccion || '');

        // 🔹 Tipo de Mantenimiento
        const tipoMtto = (this.datos_usuario[0].PLANTA == "2") ? "CORRECTIVO" : "Z10";
        $("#TipoMantenimiento").val(tipoMtto);

        // 🔹 Fecha de impresión
        $("#fechaImpresion").text(DateUtils.obtenerFechaHora());

        // 🔹 Guardar IDs para uso posterior
        this.ID_SOLICITUD = idSolicitud;
        this.ID_EQUIPO = idEquipo;
        this.ID_MANTENIMIENTO = idMantenimiento;

        // 🔹 Opciones para TECNICO DE MANTENIMIENTO
        if (this.datos_usuario[0].TIPOUSUARIO == "TecnicoMtto") {
            $("#EvidenciaOrdenTrabajo").removeClass("d-none");
            $("#CierreOrdenTrabajo").addClass("d-none");
        }
        //if (this.datos_usuario[0].TIPOUSUARIO == "TecnicoMtto") {
        //    $("#EvidenciaOrdenTrabajo").removeClass("d-none");
        //    //$("#CierreOrdenTrabajo").removeClass("d-none");

        //    // ✅ Hacer required solo los inputs EXCEPTO los que no se requieren
        //    $('#EvidenciaOrdenTrabajo input:not(#fileInput)').prop('required', true);
        //    $('#CierreOrdenTrabajo input:not(#BuscarTecnico)').prop('required', true);

        //    // ✅ Asegurar que estos específicos NO sean required
        //    $("#BuscarTecnico, #fileInput").prop('required', false);

        //    $("#btnGuardarOT").removeClass("d-none");
        //    $("#btnExportMantenimientoPDF").addClass("d-none");

        //    // Limpiar preview de imágenes
        //    $("#previewArea").empty();
        //    $("#clearAll").hide();
        //    $("#uploadArea").removeClass("upload-area-disabled");
        //    $("#uploadInfo").show();

        //    // ✅ HABILITAR UPLOAD LIMPIO
        //    const uploader = $('#uploadArea').data('imageUploader');
        //    if (uploader && uploader.enableUpload) {
        //        uploader.enableUpload();
        //    }
        //}
         
        if (this.datos_usuario[0].TIPOUSUARIO == "AdminMtto" || this.datos_usuario[0].TIPOUSUARIO == "Administrador") {
            $("#EvidenciaOrdenTrabajo").addClass("d-none");
            $("#CierreOrdenTrabajo").addClass("d-none");
            $('#EvidenciaOrdenTrabajo input').prop('required', false);
            $('#CierreOrdenTrabajo input').prop('required', false);
            $("#btnGuardarOT").addClass("d-none");
            //$("#btnExportMantenimientoPDF").removeClass("d-none");
        }

        // 🔹 Mostrar modal
        $('#modalOrdenMantenimiento').modal('show');
    }

}
// ========================================
// GESTOR DE PDFs PARA MANTENIMIENTO CORRECTIVO
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
        const $btn = $("#btnExportMantenimientoPDF");

        try {
            $btn.html('<span class="spinner-border spinner-border-sm me-2"></span>Generando...');
            $btn.prop("disabled", true);

            const datos = this.obtenerDatosDocumento();
            const qrBase64 = await GlobalUtil.generarQRCode(datos.NumeroOrden);
            datos.QR = qrBase64;

            const html = this.generarContenidoHTML(datos);

            this.printEngine.imprimir({
                html,
                titulo: `Orden Correctiva - ${datos.NumeroOrden}`,
                autoClose: true
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
                $btn.prop("disabled", false);
            }, 2000);
        }
    }

    obtenerDatosDocumento() {
        return {
            FechaImpresion: $('#fechaImpresion').text() || new Date().toLocaleString('es-MX'),
            NumeroOrden: $('#NumeroOrden').val() || '',
            AreaTecnica: $('#AreaTecnica').val() || '',
            Solicitante: $('#Solicitante').val() || '',
            NominaSolicitante: $('#NominaSolicitante').val() || '',
            EstatusOrden: $('#EstatusOrden').val() || '',
            FechaInicioExtrema: $('#FechaInicioExtrema').val() || '',
            HoraInicio: $('#HoraInicio').val() || '',
            Scrap: $('#Scrap').val() || '',
            HoraCierre: $('#HoraCierre').val() || '',
            UbicacionTecnica: $('#UbicacionTecnica').val() || '',
            TipoMantenimiento: $('#TipoMantenimiento').val() || '',
            TextoCorto: $('#TextoCorto').val() || '',
            ClaseMantenimiento: $('#ClaseMantenimiento').val() || '',
            NombreEquipo: $('#NombreEquipo').val() || '',
            DescEquipo: $('#DescEquipo').val() || '',
            CentroCostos: $('#CentroCostos').val() || '',
            NumDocPmCalidad: $('#NumDocPmCalidad').val() || '',
            Linea: $('#Linea').val() || '',
            HoraInicioTrabajo: $('#HoraInicioTrabajo').val() || '',
            HoraFin: $('#HoraFin').val() || '',
            TextoSecuencia: $('#TextoSecuencia').val() || '',
            DuracionHrs: $('#DuracionHrs').val() || '',
            TecnicosAsignados: this.obtenerTecnicosAsignados(),
            Comentarios: $('#Comentarios').val() || '' // ✅ NUEVO
        };
    }

    obtenerTecnicosAsignados() {
        const tecnicos = [];
        $('#listaTecnicosAsignados .tecnico-item').each(function () {
            const nombre = $(this).find('.tecnico-nombre').text().trim();
            const nomina = $(this).data('nomina');
            if (nombre && nomina) {
                tecnicos.push({ nombre, nomina });
            }
        });
        return tecnicos;
    }

    generarContenidoHTML(datos) {
        return `
        <div style="width: 190mm; padding: 0; margin: 0 auto; font-family: Arial, sans-serif; font-size: 11px; line-height: 1.4; box-sizing: border-box;">

            <div class="page-break-avoid" style="background: #1976d2; color: white; padding: 12px; margin-bottom: 15px; border-radius: 6px;">
                <div style="display: flex; align-items: center; justify-content: space-between;">

                    <div style="width: 100px; height: 40px; display: flex; align-items: center;">
                        <img src="${this.logoUrl}" style="max-width: 100%; max-height: 40px;" />
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
            <div class="page-break-avoid" style="background-color: #f0f9ff; border-left: 4px solid #dc2626; padding: 12px; margin-bottom: 12px; border-radius: 4px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 20px;">🔧</span>
                    <div>
                        <p style="margin: 0; font-weight: bold; font-size: 11px;">MANTENIMIENTO MAQUINARIA E INSTALACIONES</p>
                        <p style="margin: 3px 0 0 0; font-size: 10px; color: #dc2626; font-weight: bold;">REPARACIÓN MANTENIMIENTO CORRECTIVO</p>
                    </div>
                </div>
            </div>

            <!-- DATOS DE LA ORDEN -->
            <div class="page-break-avoid" style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; margin-bottom: 12px;">
                <div style="background: #1976d2; color: white; padding: 8px; margin: -12px -12px 12px -12px; border-radius: 5px 5px 0 0; font-weight: bold; font-size: 11px;">
                    📋 DATOS DE LA ORDEN ${datos.AreaTecnica}<br>
                    🔧 ÁREA TÉCNICA ${datos.AreaTecnica}
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                    ${this.generarFilaDetalle('Número de Orden', datos.NumeroOrden, 'Solicitante', datos.Solicitante)}
                    ${this.generarFilaDetalle('Número de Nómina', datos.NominaSolicitante, 'Estatus de la Orden', datos.EstatusOrden)}
                    ${this.generarFilaDetalle('Fecha Inicio Extrema', this.formatearFecha(datos.FechaInicioExtrema), 'Hora', datos.HoraInicio)}
                    ${this.generarFilaDetalle('Scrap', datos.Scrap, 'Hora Cierre', datos.HoraCierre)}
                    ${this.generarFilaDetalle('Ubicación Técnica', datos.UbicacionTecnica, 'Tipo de Mantenimiento', datos.TipoMantenimiento)}
                </table>
                
                <div style="padding: 6px 0; margin-top: 8px; border-top: 1px solid #e5e7eb;">
                    <strong style="font-size: 10px;">Texto Corto (Descripción de la Falla):</strong><br>
                    <div style="border: 1px solid #d1d5db; padding: 8px; background: #fffbeb; margin-top: 4px; border-radius: 3px; min-height: 30px; font-size: 9px; word-wrap: break-word;">
                        ${datos.TextoCorto || 'N/A'}
                    </div>
                </div>
            </div>

            <!-- DATOS DEL EQUIPO -->
            <div class="page-break-avoid" style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; margin-bottom: 12px;">
                <div style="background: #1976d2; color: white; padding: 8px; margin: -12px -12px 12px -12px; border-radius: 5px 5px 0 0; font-weight: bold; font-size: 11px;">
                    ⚙️ DATOS DEL EQUIPO
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                    ${this.generarFilaDetalle('Clase de Mantenimiento', datos.ClaseMantenimiento, 'Nombre Equipo', datos.NombreEquipo)}
                    ${this.generarFilaDetalle('Descripción Equipo', datos.DescEquipo, 'Centro de Costos', datos.CentroCostos)}
                    ${this.generarFilaDetalle('Número Doc PM Calidad', datos.NumDocPmCalidad, 'Línea', datos.Linea)}
                </table>
            </div>

            <!-- TRABAJO (si existe) -->
            ${datos.TextoSecuencia || datos.TecnicosAsignados.length > 0 ? `
            <div class="page-break-avoid" style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; margin-bottom: 12px;">
                <div style="background: #1976d2; color: white; padding: 8px; margin: -12px -12px 12px -12px; border-radius: 5px 5px 0 0; font-weight: bold; font-size: 11px;">
                    🔧 TRABAJO REALIZADO
                </div>
                
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10px;">
                    ${datos.HoraInicioTrabajo && datos.HoraFin ? this.generarFilaDetalle('Hora Inicio', datos.HoraInicioTrabajo, 'Hora Fin', datos.HoraFin) : ''}
                    ${datos.DuracionHrs ? `
                    <tr>
                        <td colspan="2" style="padding: 6px; vertical-align: top;">
                            <strong>Duración:</strong><br>
                            <span style="border-bottom: 1px solid #000; display: inline-block; min-width: 80px; padding: 2px;">${datos.DuracionHrs} Hrs</span>
                        </td>
                    </tr>
                    ` : ''}
                </table>

                ${datos.TecnicosAsignados.length > 0 ? `
                <div style="margin-bottom: 12px;">
                    <strong style="display: block; margin-bottom: 6px; color: #374151; font-size: 10px;">Técnicos Asignados:</strong>
                    <div style="border: 1px solid #e5e7eb; padding: 8px; background: #f9fafb; border-radius: 3px; font-size: 9px;">
                        ${datos.TecnicosAsignados.map((tec, idx) => `
                            <div style="padding: 4px 0; ${idx < datos.TecnicosAsignados.length - 1 ? 'border-bottom: 1px solid #e5e7eb;' : ''}">
                                👤 <strong>${tec.nombre}</strong> - Nómina: ${tec.nomina}
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}

                ${datos.TextoSecuencia ? `
                <div>
                    <strong style="display: block; margin-bottom: 6px; color: #374151; font-size: 10px;">Texto de Secuencia:</strong>
                    <div style="border: 1px solid #d1d5db; padding: 8px; background: #fffbeb; font-size: 9px; border-radius: 3px; min-height: 40px; word-wrap: break-word;">
                        ${datos.TextoSecuencia}
                    </div>
                </div>
                ` : ''}
            </div>
            ` : ''}

            <!-- ✅ COMENTARIOS -->
            <div class="page-break-avoid" style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; margin-bottom: 12px;">
                <div style="background-color: #f0f9ff; border-left: 4px solid #dc2626; padding: 12px; margin-bottom: 12px; border-radius: 4px;">
                    💬 COMENTARIOS
                </div>
                <div style="border: 1px solid #d1d5db; padding: 10px; background: #fffbeb; border-radius: 3px; min-height: 60px; font-size: 10px; word-wrap: break-word; line-height: 1.6; white-space: pre-wrap;">
                    ${datos.Comentarios || ''}
                </div>
            </div>

            <!-- FOOTER -->
            <div style="border-top: 1px solid #e5e7eb; padding-top: 8px; margin-top: 12px; text-align: center; color: #6b7280; font-size: 8px;">
                <p style="margin: 0;">
                    🛡️ Sistema de Gestión de Mantenimiento - PTM © 2025
                </p>
            </div>
        </div>
    `;
    }

    generarFilaDetalle(label1, valor1, label2, valor2) {

        const icon1 = this.obtenerIconoCampo(label1);
        const icon2 = this.obtenerIconoCampo(label2);

        return `
    <tr>
        <td style="width: 50%; padding: 6px; vertical-align: top;">
            <strong style="font-size: 9px;">
                ${icon1} ${label1}:
            </strong><br>
            <span style="border-bottom: 1px solid #000; display: inline-block; width: 95%; padding: 2px; font-size: 9px;">
                ${valor1}
            </span>
        </td>

        <td style="width: 50%; padding: 6px; vertical-align: top;">
            <strong style="font-size: 9px;">
                ${icon2} ${label2}:
            </strong><br>
            <span style="border-bottom: 1px solid #000; display: inline-block; width: 95%; padding: 2px; font-size: 9px;">
                ${valor2}
            </span>
        </td>
    </tr>
    `;
    }

    formatearFecha(fecha) {
        if (!fecha) return 'N/A';
        if (fecha.includes('-')) {
            const [anio, mes, dia] = fecha.split('-');
            return `${dia}/${mes}/${anio}`;
        }
        return fecha;
    }

    obtenerOpcionesPDF() {
        const numeroOrden = document.getElementById('NumeroOrden')?.value || 'SIN_NUMERO';
        const fecha = new Date().toISOString().split('T')[0];

        return {
            margin: [10, 10, 10, 10],
            filename: `Orden_Mantenimiento_Correctivo_${numeroOrden}_${fecha}.pdf`,
            html2canvas: {
                scale: 2,
                useCORS: true,
                letterRendering: true,
                scrollY: 0,
                scrollX: 0
            },
            jsPDF: {
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait',
                compress: true
            },
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
            'Número de Nómina': '🪪',
            'Estatus de la Orden': '📊',
            'Fecha Inicio Extrema': '📅',
            'Hora': '⏰',
            'Scrap': '⚠️',
            'Hora Cierre': '🕓',
            'Ubicación Técnica': '📍',
            'Tipo de Mantenimiento': '🔧',
            'Clase de Mantenimiento': '⚙️',
            'Nombre Equipo': '🏭',
            'Descripción Equipo': '📝',
            'Centro de Costos': '💰',
            'Número Doc PM Calidad': '📋',
            'Línea': '📈',
            'Hora Inicio': '▶️',
            'Hora Fin': '⏹️'
        };

        return iconos[label] || '▪️';
    }
}

// ========================================
// GESTOR DE IMPRESIÓN PARA MANTENIMIENTO CORRECTIVO
// ========================================
class PrintManagerMantenimiento {
    constructor() {
        this.logoUrl = `${window.location.origin}/Content/Images/LogoPTMWhite.png`;
        this.printEngine = new PrintEngine();
    }

    inicializar() {
        console.log('✅ PrintManagerMantenimiento inicializado correctamente');
    }

    async imprimirOrdenMantenimiento() {
        const $btn = $("#btnImprimirOrden");

        try {
            $btn.html('<span class="spinner-border spinner-border-sm me-2"></span>Generando...');
            $btn.prop("disabled", true);

            const datos = this.obtenerDatosDocumento();
            const qrBase64 = await GlobalUtil.generarQRCode(datos.NumeroOrden);
            datos.QR = qrBase64;

            const html = this.generarContenidoHTML(datos);

            this.printEngine.imprimir({
                html,
                titulo: `Orden Correctiva - ${datos.NumeroOrden}`,
                estilos: this.obtenerEstilos(), // 🔥 CLAVE
                autoClose: true
            });

            $btn.html('<i class="bi bi-check-circle-fill me-2 text-white"></i>Listo para imprimir');

        } catch (error) {
            console.error('❌ Error al imprimir:', error);
            $btn.html('<i class="bi bi-x-circle-fill me-2"></i>Error');

            if (window.AlertManager) {
                AlertManager.mostrar('Error al preparar la impresión.', 'warning');
            }

        } finally {
            setTimeout(() => {
                $btn.html('<i class="bi bi-printer"></i> Imprimir Orden');
                $btn.prop("disabled", false);
            }, 2000);
        }
    }

    obtenerDatosDocumento() {
        return {
            FechaImpresion: $('#fechaImpresion').text() || new Date().toLocaleString('es-MX'),
            AreaTecnica: $('#AreaTecnica').val() || '',
            NumeroOrden: $('#NumeroOrden').val() || '',
            Solicitante: $('#Solicitante').val() || '',
            NominaSolicitante: $('#NominaSolicitante').val() || '',
            EstatusOrden: $('#EstatusOrden').val() || '',
            FechaInicioExtrema: $('#FechaInicioExtrema').val() || '',
            HoraInicio: $('#HoraInicio').val() || '',
            Scrap: $('#Scrap').val() || '',
            HoraCierre: $('#HoraCierre').val() || '',
            UbicacionTecnica: $('#UbicacionTecnica').val() || '',
            TipoMantenimiento: $('#TipoMantenimiento').val() || '',
            TextoCorto: $('#TextoCorto').val() || '',
            ClaseMantenimiento: $('#ClaseMantenimiento').val() || '',
            NombreEquipo: $('#NombreEquipo').val() || '',
            DescEquipo: $('#DescEquipo').val() || '',
            CentroCostos: $('#CentroCostos').val() || '',
            NumDocPmCalidad: $('#NumDocPmCalidad').val() || '',
            Linea: $('#Linea').val() || '',
            HoraInicioTrabajo: $('#HoraInicioTrabajo').val() || '',
            HoraFin: $('#HoraFin').val() || '',
            TextoSecuencia: $('#TextoSecuencia').val() || '',
            DuracionHrs: $('#DuracionHrs').val() || '',
            TecnicosAsignados: this.obtenerTecnicosAsignados(),
            Comentarios: $('#Comentarios').val() || '' // ✅ NUEVO
        };
    }

    obtenerTecnicosAsignados() {
        const tecnicos = [];
        $('#listaTecnicosAsignados .tecnico-item').each(function () {
            const nombre = $(this).find('.tecnico-nombre').text().trim();
            const nomina = $(this).data('nomina');
            if (nombre && nomina) {
                tecnicos.push({ nombre, nomina });
            }
        });
        return tecnicos;
    }

    generarContenidoHTML(datos) {
        return `
    <div class="contenedor-principal">

        <div class="encabezado page-break-avoid">
    <div class="encabezado-contenido">

            <div class="encabezado-logo">
               <img src="${this.logoUrl}" alt="Logo PTM" />
            </div>

            <div class="encabezado-fecha">
                <div>
                    <strong>Fecha:</strong> ${datos.FechaImpresion}
                </div>
                <div style="margin-top:5px;">
                    <img src="${datos.QR}" style="width:70px;">
                </div>
            </div>

        </div>
    </div>

        <!-- TIPO DE MANTENIMIENTO -->
        <div class="banner-tipo page-break-avoid">
            <div class="banner-tipo-contenido">
                <div class="banner-tipo-icono">🔧</div>
                <div class="banner-tipo-texto">
                    <p class="banner-tipo-titulo">MANTENIMIENTO MAQUINARIA E INSTALACIONES</p>
                    <p class="banner-tipo-subtitulo">REPARACIÓN MANTENIMIENTO CORRECTIVO</p>
                </div>
            </div>
        </div>

        <!-- DATOS DE LA ORDEN -->
        <div class="seccion page-break-avoid">
            <div class="seccion-header">📋 DATOS DE LA ORDEN<br>🔧 ÁREA TÉCNICA ${datos.AreaTecnica}</div>
            <table class="tabla-detalles">
                ${this.generarFilaDetalle('Número de Orden', datos.NumeroOrden, 'Solicitante', datos.Solicitante)}
                ${this.generarFilaDetalle('Número de Nómina', datos.NominaSolicitante, 'Estatus de la Orden', datos.EstatusOrden)}
                ${this.generarFilaDetalle('Fecha Inicio Extrema', this.formatearFecha(datos.FechaInicioExtrema), 'Hora', datos.HoraInicio)}
                ${this.generarFilaDetalle('Scrap', datos.Scrap, 'Hora Cierre', datos.HoraCierre)}
                ${this.generarFilaDetalle('Ubicación Técnica', datos.UbicacionTecnica, 'Tipo de Mantenimiento', datos.TipoMantenimiento)}
            </table>
            
            <div class="texto-corto-contenedor">
                <span class="texto-corto-label">Texto Corto (Descripción de la Falla):</span>
                <div class="texto-corto-valor">${datos.TextoCorto || 'N/A'}</div>
            </div>
        </div>

        <!-- DATOS DEL EQUIPO -->
        <div class="seccion page-break-avoid">
            <div class="seccion-header">⚙️ DATOS DEL EQUIPO</div>
            <table class="tabla-detalles">
                ${this.generarFilaDetalle('Clase de Mantenimiento', datos.ClaseMantenimiento, 'Nombre Equipo', datos.NombreEquipo)}
                ${this.generarFilaDetalle('Descripción Equipo', datos.DescEquipo, 'Centro de Costos', datos.CentroCostos)}
                ${this.generarFilaDetalle('Número Doc PM Calidad', datos.NumDocPmCalidad, 'Línea', datos.Linea)}
            </table>
        </div>

        <!-- TRABAJO REALIZADO -->
        ${datos.TextoSecuencia || datos.TecnicosAsignados.length > 0 ? `
        <div class="seccion page-break-avoid">
            <div class="seccion-header">🔧 TRABAJO REALIZADO</div>
            
            <table class="tabla-detalles">
                ${datos.HoraInicioTrabajo && datos.HoraFin ? this.generarFilaDetalle('Hora Inicio', datos.HoraInicioTrabajo, 'Hora Fin', datos.HoraFin) : ''}
                ${datos.DuracionHrs ? `
                <tr>
                    <td colspan="2">
                        <span class="campo-label">Duración:</span>
                        <span class="campo-valor">${datos.DuracionHrs} Hrs</span>
                    </td>
                </tr>
                ` : ''}
            </table>

            ${datos.TecnicosAsignados.length > 0 ? `
            <div class="tecnicos-contenedor">
                <span class="tecnicos-label">Técnicos Asignados:</span>
                <div class="tecnicos-lista">
                    ${datos.TecnicosAsignados.map((tec, idx) => `
                        <div class="tecnico-item ${idx < datos.TecnicosAsignados.length - 1 ? 'tecnico-item-separador' : ''}">
                            👤 <strong>${tec.nombre}</strong> - Nómina: ${tec.nomina}
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            ${datos.TextoSecuencia ? `
            <div>
                <span class="tecnicos-label">Texto de Secuencia:</span>
                <div class="texto-corto-valor">${datos.TextoSecuencia}</div>
            </div>
            ` : ''}
        </div>
        ` : ''}

        <!-- ✅ COMENTARIOS -->
        <div class="seccion page-break-avoid">
            <div class="seccion-header">💬 COMENTARIOS</div>
            <div class="comentarios-valor">${datos.Comentarios || ''}</div>
        </div>

        <!-- FOOTER -->
        <div class="footer">
            <p>🛡️ Sistema de Gestión de Mantenimiento - PTM © 2025</p>
        </div>
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
            <span class="campo-valor">${valor1}</span>
        </td>

        <td>
            <span class="campo-label">
                ${icon2} ${label2}:
            </span>
            <span class="campo-valor">${valor2}</span>
        </td>
    </tr>
    `;
    }

    formatearFecha(fecha) {
        if (!fecha) return 'N/A';
        if (fecha.includes('-')) {
            const [anio, mes, dia] = fecha.split('-');
            return `${dia}/${mes}/${anio}`;
        }
        return fecha;
    }

    obtenerIconoCampo(label) {

        const iconos = {
            'Número de Orden': '📄',
            'Solicitante': '👤',
            'Número de Nómina': '🪪',
            'Estatus de la Orden': '📊',
            'Fecha Inicio Extrema': '📅',
            'Hora': '⏰',
            'Scrap': '⚠️',
            'Hora Cierre': '🕓',
            'Ubicación Técnica': '📍',
            'Tipo de Mantenimiento': '🔧',
            'Clase de Mantenimiento': '⚙️',
            'Nombre Equipo': '🏭',
            'Descripción Equipo': '📝',
            'Centro de Costos': '💰',
            'Número Doc PM Calidad': '📋',
            'Línea': '📈',
            'Hora Inicio': '▶️',
            'Hora Fin': '⏹️'
        };

        return iconos[label] || '▪️';
    }

    obtenerEstilos() {
        return `
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body { 
            font-family: Arial, sans-serif; 
            padding: 15px;
            background: white;
            color: #000;
        }

        @media print {
            @page { margin: 10mm; size: A4 portrait; }
            body { margin: 0; padding: 0; }
            .page-break-avoid { page-break-inside: avoid; break-inside: avoid; }
            .no-print { display: none !important; }
        }

        .contenedor-principal {
            width: 100%;
            max-width: 190mm;
            margin: 0 auto;
            font-size: 11px;
            line-height: 1.4;
        }

        .encabezado {
            background: #1976d2;
            color: white;
            padding: 12px;
            margin-bottom: 15px;
            border-radius: 6px;
        }

        .encabezado-contenido { display: table; width: 100%; }
        .encabezado-logo { display: table-cell; width: 100px; vertical-align: middle; }
        .encabezado-logo img { max-width: 100px; max-height: 40px; display: block; }
        .encabezado-fecha { display: table-cell; text-align: right; vertical-align: middle; font-size: 9px; }

        .banner-tipo {
            background-color: #f0f9ff;
            border-left: 4px solid #dc2626;
            padding: 12px;
            margin-bottom: 12px;
            border-radius: 4px;
        }

        .banner-tipo-contenido { display: table; width: 100%; }
        .banner-tipo-icono { display: table-cell; width: 30px; font-size: 20px; vertical-align: middle; }
        .banner-tipo-texto { display: table-cell; vertical-align: middle; padding-left: 8px; }
        .banner-tipo-titulo { margin: 0; font-weight: bold; font-size: 11px; }
        .banner-tipo-subtitulo { margin: 3px 0 0 0; font-size: 10px; color: #dc2626; font-weight: bold; }

        .seccion {
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 12px;
        }

        .seccion-header {
            background: #1976d2;
            color: white;
            padding: 8px;
            margin: -12px -12px 12px -12px;
            border-radius: 5px 5px 0 0;
            font-weight: bold;
            font-size: 11px;
        }

        .tabla-detalles { width: 100%; border-collapse: collapse; font-size: 10px; }
        .tabla-detalles td { width: 50%; padding: 6px; vertical-align: top; }

        .campo-label { font-weight: bold; font-size: 9px; display: block; margin-bottom: 2px; }

        .campo-valor {
            border-bottom: 1px solid #000;
            display: inline-block;
            width: 95%;
            padding: 2px;
            font-size: 9px;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }

        .texto-corto-contenedor { padding: 6px 0; margin-top: 8px; border-top: 1px solid #e5e7eb; }

        .texto-corto-label { font-weight: bold; font-size: 10px; display: block; margin-bottom: 4px; }

        .texto-corto-valor {
            border: 1px solid #d1d5db;
            padding: 8px;
            background: #fffbeb;
            border-radius: 3px;
            min-height: 30px;
            font-size: 9px;
            word-wrap: break-word;
        }

        .comentarios-valor {
            border: 1px solid #d1d5db;
            padding: 10px;
            background: #fffbeb;
            border-radius: 3px;
            min-height: 60px;
            font-size: 10px;
            word-wrap: break-word;
            line-height: 1.6;
            white-space: pre-wrap;
        }

        .tecnicos-contenedor { margin-bottom: 12px; }

        .tecnicos-label {
            display: block;
            margin-bottom: 6px;
            color: #374151;
            font-weight: bold;
            font-size: 10px;
        }

        .tecnicos-lista {
            border: 1px solid #e5e7eb;
            padding: 8px;
            background: #f9fafb;
            border-radius: 3px;
            font-size: 9px;
        }

        .tecnico-item { padding: 4px 0; }
        .tecnico-item-separador { border-bottom: 1px solid #e5e7eb; }

        .footer {
            border-top: 1px solid #e5e7eb;
            padding-top: 8px;
            margin-top: 12px;
            text-align: center;
            color: #6b7280;
            font-size: 8px;
        }
    `;
    }
}

