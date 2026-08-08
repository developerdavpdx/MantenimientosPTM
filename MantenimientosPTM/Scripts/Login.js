// ========================================
// GESTOR DE LOGIN
// ========================================
class ValidationManagerLogin {
    // Flag para prevenir múltiples validaciones
    static validacionEnProceso = false;

    // Inicializar formulario con jQuery
    static inicializarFormulario(formId) {
        const form = $(formId);
        if (form.length === 0) return;

        form.on('submit', function (event) {
            event.preventDefault();
            event.stopPropagation();

            if (this.checkValidity()) {
                ValidationManagerLogin.procesarLogin();
            }

            form.addClass('was-validated');
        });
    }

    // Procesar login con jQuery AJAX
    static procesarLogin() {
        // Evitar que se ejecute múltiples veces
        if (ValidationManagerLogin.validacionEnProceso) {
            console.warn('Validación ya en proceso, ignorando esta llamada');
            return;
        }

        ValidationManagerLogin.validacionEnProceso = true;

        // Primero validar que el sistema no esté vencido
        ValidationManagerLogin.validarVencimiento(function(vencido) {
            if (vencido) {
                // Deshabilitar interacciones antes de redirigir
                $('body').css('pointer-events', 'none');
                console.log('Sistema vencido, redirigiendo a /Login/Ended');

                // Redirigir a la vista de acceso vencido con delay
                window.location.href = '/Login/Ended';
            }

            else {
                const usuario = $('#usuario').val();
                const password = $('#password').val();
                const recordarme = $('#recordarme').is(':checked');

                AlertManager.mostrar('Iniciando sesión...', 'info');

                const btnSubmit = $('.btn-login');
                btnSubmit.prop('disabled', true);
                btnSubmit.html('<span class="spinner-border spinner-border-sm me-2"></span>Iniciando...');

                $.ajax({
                    url: '/Login/ValidaUsuario',
                    type: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Usuario': usuario,
                        'Password': password
                    },
                    success: function (data) {
                        console.log('Respuesta del servidor:', data);

                        if (data.Status === 'OK') {
                            let UserData = data.Data;
                            if (typeof UserData === 'string') {
                                try {
                                    UserData = JSON.parse(UserData);
                                } catch (e) {
                                    console.warn('No se pudo parsear Data:', e);
                                }
                            }
                            if (UserData[0].STATUS == "200") {

                                //Agregar correo
                                UserData[0].EMAIL = usuario;

                                btnSubmit.addClass("text-white");
                                btnSubmit.html('<span class="spinner-border spinner-border-sm me-2"></span>Estamos preparando todo...');

                                if (recordarme) {
                                    localStorage.setItem('recordarUsuario', usuario);
                                } else {
                                    localStorage.removeItem('recordarUsuario');
                                }

                                sessionStorage.setItem('userData', JSON.stringify(UserData));

                                //Validar permisos y modulos
                                let datos_usuario = GlobalUtil.getDatosUsuario();
                                const tipoUsuario = datos_usuario[0].TIPOUSUARIO;
                                const userWeb = datos_usuario[0].USUARIOWEB;
                                const posicionId = datos_usuario[0].POSICIONID;
                                const posicion = datos_usuario[0].POSICION;
                                const codigoEmpleado = datos_usuario[0].CODIGOEMPLEADO;


                                // Mapeo de perfiles a rutas
                                const rutasPorPerfil = {
                                    'AdminMtto': '/Equipos/GestionEquipos',
                                    'Administrador': '/Equipos/GestionEquipos',
                                    'TecnicoMtto': '/MantenimientosPreventivos/MantenimientoPreventivo',
                                    'SupervisorMantenimiento': '/MantenimientosPreventivos/MantenimientoPreventivo',
                                    'SupervisorAlmacen': '/Almacen/SolicitudRefacciones',
                                    'Almacen': '/Almacen/SolicitudRefacciones',
                                    'SupervisorPlaneacion': '/Planeacion/Planeacion',
                                    'Planeacion': '/Planeacion/Planeacion',
                                    'SupervisorProduccion': '/Produccion/ParosProduccion',
                                    'Produccion': '/Produccion/ParosProduccion'
                                };

                                // Validar que el perfil exista
                                if (rutasPorPerfil[tipoUsuario]) {
                                    setTimeout(function () {
                                        AlertManager.mostrar('¡Bienvenido! ' + data.Message, 'success');
                                        window.location.href = rutasPorPerfil[tipoUsuario];
                                    }, 2000);
                                } else {
                                    // Perfil no configurado
                                    AlertManager.mostrar('Perfil ' + tipoUsuario + ' no configurado, contacte al administrador', 'warning');
                                    ValidationManagerLogin.habilitarBotonLogin(btnSubmit);
                                    ValidationManagerLogin.validacionEnProceso = false;
                                }
                            }
                            else {
                                AlertManager.mostrar("No fue posible iniciar sesión, valida tus credenciales.", 'warning');
                                ValidationManagerLogin.habilitarBotonLogin(btnSubmit);
                                ValidationManagerLogin.validacionEnProceso = false;
                            }
                        } else {
                            AlertManager.mostrar(data.Message, 'warning');
                            ValidationManagerLogin.habilitarBotonLogin(btnSubmit);
                            ValidationManagerLogin.validacionEnProceso = false;
                        }
                    },
                    error: function (xhr, status, error) {
                        console.error('Error en la petición:', error);
                        AlertManager.mostrar('Error de conexión. Por favor, intenta de nuevo.', 'warning');
                        ValidationManagerLogin.habilitarBotonLogin(btnSubmit);
                        ValidationManagerLogin.validacionEnProceso = false;
                    }
                });
            }
        });
    }

    // Habilitar botón de login con jQuery
    static habilitarBotonLogin(btnSubmit) {
        btnSubmit.prop('disabled', false);
        btnSubmit.html('<i class="bi bi-box-arrow-in-right me-2"></i>Iniciar Sesión');
    }

    // Validar si el sistema está vencido
    static validarVencimiento(callback) {
        $.ajax({
            url: '/Login/ObtenerFechaVencimiento',
            type: 'GET',
            dataType: 'json',
            timeout: 5000, // Timeout de 5 segundos
            success: function(data) {
                console.log('Respuesta de vencimiento:', data);
                if (data.Status === 'OK' && data.Vencido) {
                    callback(true); // Sistema está vencido
                } else {
                    callback(false); // Sistema vigente
                }
            },
            error: function(xhr, status, error) {
                console.warn('No se pudo validar fecha de vencimiento:', error);
                // En caso de error, permitir continuar por seguridad
                callback(false);
            }
        });
    }

    // Limpiar validación con jQuery
    static limpiarValidacion(formId) {
        const form = $(formId);
        if (form.length > 0) {
            form.removeClass('was-validated');
        }
    }
}

// ========================================
// TOGGLE PASSWORD
// ========================================
document.getElementById('togglePassword').addEventListener('click', function () {
    const password = document.getElementById('password');
    const icon = document.getElementById('toggleIcon');

    if (password.type === 'password') {
        password.type = 'text';
        icon.classList.remove('bi-eye-fill');
        icon.classList.add('bi-eye-slash-fill');
    } else {
        password.type = 'password';
        icon.classList.remove('bi-eye-slash-fill');
        icon.classList.add('bi-eye-fill');
    }
});

// ========================================
// INICIALIZACIÓN
// ========================================
document.addEventListener('DOMContentLoaded', function () {
    ValidationManagerLogin.inicializarFormulario('#loginForm');
    console.log('✅ Sistema de Login inicializado correctamente');
});