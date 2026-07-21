(function ($) {
    // ✅ VARIABLE GLOBAL PARA ALMACENAR ARCHIVOS
    window.imagenesRutina = [];

    // 🔥 NUEVO: Array global para rastrear URLs de imágenes eliminadas (existentes)
    window.imagenesRutinaEliminadas = [];

    $.fn.imageUploader = function (options) {
        const settings = $.extend({
            maxFileSize: 5 * 1024 * 1024,
            allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
            onUpload: function (files) { },
            onDelete: function (index) { },
            onError: function (message) { }
        }, options);

        let uploadedFiles = [];

        const $uploadArea = $(this);
        const $fileInput = $('#fileInput');
        const $previewArea = $('#previewArea');
        const $progressBar = $('#progressBar');
        const $progressFill = $('#progressFill');
        const $uploadInfo = $('#uploadInfo');
        const $clearAll = $('#clearAll');

        // Click en el área de carga
        $uploadArea.on('click', function () {
            $fileInput.click();
        });

        // Prevenir click en el input
        $fileInput.on('click', function (e) {
            e.stopPropagation();
        });

        // Manejar selección de archivos
        $fileInput.on('change', function (e) {
            handleFiles(e.target.files);
        });

        // Drag and drop
        $uploadArea.on('dragover', function (e) {
            e.preventDefault();
            e.stopPropagation();
            $(this).addClass('dragover');
        });

        $uploadArea.on('dragleave', function (e) {
            e.preventDefault();
            e.stopPropagation();
            $(this).removeClass('dragover');
        });

        $uploadArea.on('drop', function (e) {
            e.preventDefault();
            e.stopPropagation();
            $(this).removeClass('dragover');
            handleFiles(e.originalEvent.dataTransfer.files);
        });

        // Procesar archivos
        function handleFiles(files) {
            if (files.length === 0) return;

            const validFiles = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                if (!settings.allowedTypes.includes(file.type)) {
                    showError(`${file.name}: Formato no soportado`);
                    continue;
                }

                if (file.size > settings.maxFileSize) {
                    showError(`${file.name}: Archivo muy grande (máx 5MB)`);
                    continue;
                }

                validFiles.push(file);
            }

            if (validFiles.length > 0) {
                uploadFiles(validFiles);
            }
        }

        // Simular carga y mostrar preview
        function uploadFiles(files) {
            $progressBar.show();
            let progress = 0;

            const interval = setInterval(function () {
                progress += 10;
                $progressFill.css('width', progress + '%');

                if (progress >= 100) {
                    clearInterval(interval);
                    setTimeout(function () {
                        $progressBar.hide();
                        $progressFill.css('width', '0%');
                    }, 500);
                }
            }, 50);

            files.forEach(function (file) {
                const reader = new FileReader();

                reader.onload = function (e) {
                    uploadedFiles.push(file);
                    window.imagenesRutina.push(file); // ✅ GUARDAR EN VARIABLE GLOBAL
                    addPreview(e.target.result, file);
                    settings.onUpload(uploadedFiles);
                    $clearAll.show();
                };

                reader.readAsDataURL(file);
            });

            $fileInput.val('');
        }

        // Agregar preview
        function addPreview(src, file) {
            const fileSize = formatFileSize(file.size);
            const index = uploadedFiles.length - 1;

            const $preview = $(`
                <div class="preview-item" data-index="${index}">
                    <img src="${src}" alt="${file.name}">
                    <div class="preview-overlay">
                        <div class="file-name">${file.name}</div>
                        <div class="file-size">${fileSize}</div>
                        <button class="delete-btn" data-index="${index}">Eliminar</button>
                    </div>
                </div>
            `);

            $previewArea.append($preview);
        }

        // 🔥 NUEVO: Agregar preview de imágenes existentes (modo editable con delete)
        // Usa URL como data-id para evitar conflictos de índices
        function addExistingImagePreview(url, filename) {
            // 🔥 Usar URL como ID único en base64 para evitar conflictos
            const urlId = btoa(url).replace(/[^a-zA-Z0-9]/g, '');

            const $preview = $(`
                <div class="preview-item preview-existing" data-url="${url}" data-url-id="${urlId}">
                    <img src="${url}" alt="${filename}">
                    <div class="preview-overlay">
                        <div class="file-name">${filename}</div>
                        <div class="file-size">Archivo existente</div>
                        <button class="delete-btn-existing" data-url="${url}">Eliminar</button>
                    </div>
                </div>
            `);

            $previewArea.append($preview);
        }

        // 🔥 Eliminar imagen existente (por URL)
        $previewArea.on('click', '.delete-btn-existing', function (e) {
            e.preventDefault();
            e.stopPropagation();
            const urlToDelete = $(this).data('url');
            const $preview = $(`.preview-item[data-url="${urlToDelete}"]`);

            // 🔥 Marcar como eliminada en el array global
            if (!window.imagenesRutinaEliminadas.includes(urlToDelete)) {
                window.imagenesRutinaEliminadas.push(urlToDelete);
                console.log(`✅ Marcada para eliminar: ${urlToDelete}`);
            }

            // 🔥 Agregar overlay visual de "Eliminada"
            $preview.addClass('marked-for-deletion');
            $preview.find('.preview-overlay').append(`
                <div class="deletion-badge">
                    <i class="bi bi-trash"></i> Marcada para eliminar
                </div>
            `);

            // 🔥 Deshabilitar botón
            $preview.find('.delete-btn-existing').prop('disabled', true).css('opacity', '0.5');

            // Remover de window.imagenesRutina
            window.imagenesRutina = window.imagenesRutina.filter(img => img !== urlToDelete);

            console.log(`📍 URL en lista de eliminadas: ${window.imagenesRutinaEliminadas.length}`);
        });

        // Eliminar imagen
        $previewArea.on('click', '.delete-btn', function (e) {
            e.preventDefault();
            e.stopPropagation();
            const index = $(this).data('index');

            $(`.preview-item[data-index="${index}"]`).remove();
            uploadedFiles.splice(index, 1);
            window.imagenesRutina.splice(index, 1); // ✅ ACTUALIZAR VARIABLE GLOBAL

            // Reindexar previews
            $previewArea.find('.preview-item').each(function (i) {
                $(this).attr('data-index', i);
                $(this).find('.delete-btn').attr('data-index', i);
            });

            settings.onDelete(index);

            if (uploadedFiles.length === 0) {
                $clearAll.hide();
            }
        });

        // Limpiar todo
        $clearAll.on('click', function () {
            $previewArea.empty();
            uploadedFiles = [];
            window.imagenesRutina = []; // ✅ LIMPIAR VARIABLE GLOBAL
            $clearAll.hide();
            $uploadInfo.text('Todas las imágenes han sido eliminadas');
            setTimeout(function () {
                $uploadInfo.text('Formatos soportados: JPG, PNG, GIF, WebP | Tamaño máximo: 5MB por imagen');
            }, 3000);
        });

        // Mostrar error
        function showError(message) {
            $uploadInfo.text('❌ ' + message);
            $uploadInfo.css('color', '#f44336');
            setTimeout(function () {
                $uploadInfo.text('Formatos soportados: JPG, PNG, GIF, WebP | Tamaño máximo: 5MB por imagen');
                $uploadInfo.css('color', '#666');
            }, 3000);
            settings.onError(message);
        }

        // Formatear tamaño de archivo
        function formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
        }

        // 🔥 EXPONER MÉTODOS PÚBLICOS
        this.loadExistingImages = function (imageUrls) {
            // 🔥 Resetear lista de eliminadas cada vez que carguemos nuevas imágenes
            window.imagenesRutinaEliminadas = [];

            // 🔥 NO limpiar - solo agregar imágenes existentes al preview
            // $previewArea.empty(); ← Comentado para no borrar lo que ya está

            if (imageUrls && imageUrls.length > 0) {
                imageUrls.forEach(url => {
                    const filename = url.split('/').pop();
                    // 🔥 Usar URL como ID único (no usar índices de array)
                    addExistingImagePreview(url, filename);
                });
                $clearAll.show();
            }
        };

        // ✅ NUEVO MÉTODO: Habilitar área de carga
        this.enableUpload = function () {
            // Remover eventos anteriores para evitar duplicados
            $uploadArea.off('click');
            $fileInput.off('change');

            // Volver a agregar eventos limpios
            $uploadArea.on('click', function () {
                $fileInput.click();
            });

            $fileInput.on('change', function (e) {
                handleFiles(e.target.files);
            });

            // Limpiar input file
            $fileInput.val('');
        };

        // 🔥 MÉTODO: Obtener lista de imágenes marcadas para eliminar
        this.getDeletedImages = function () {
            return window.imagenesRutinaEliminadas || [];
        };

        this.clearAll = function () {
            $previewArea.empty();
            uploadedFiles = [];
            window.imagenesRutina = [];
            $clearAll.hide();
        };

        // ✅ GUARDAR LA INSTANCIA
        $uploadArea.data('imageUploader', this);

        return this;
    };

    // Inicializar el plugin SOLO SI NO EXISTE
    if (!$('#uploadArea').data('imageUploader')) {
        $('#uploadArea').imageUploader({
            maxFileSize: 5 * 1024 * 1024,
            onUpload: function (files) {
                console.log('Archivos cargados:', files);
            },
            onDelete: function (index) {
                console.log('Archivo eliminado:', index);
            },
            onError: function (message) {
                console.error('Error:', message);
            }
        });
    }
})(jQuery);