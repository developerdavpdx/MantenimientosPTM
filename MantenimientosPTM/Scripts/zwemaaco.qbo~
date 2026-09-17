// ========================================
// 🔥 HELPER COMPARTIDO: Validación de Productos Terminados
// ========================================
// Este archivo contiene métodos reutilizables para validar y gestionar
// productos terminados en todos los procesos (PVC, Corrugado, Inyección, PEAD Liso)

class ProductosTerminadosHelper {

    /**
     * Valida productos terminados existentes (batch)
     * @param {Array} ids - Array de IDs de productos a validar
     * @param {String} tipoProceso - Tipo de proceso (PVC, CORRUGADO, INYECCION, PEAD_LISO)
     * @param {String} URLBase - URL base del controlador (ej: 'Produccion')
     * @returns {Object} { idsExistentes: Set, detalle: Array }
     */
    static async validarProductosTerminadosExistentes(ids, tipoProceso, URLBase) {
        try {
            if (!ids || ids.length === 0) {
                return { idsExistentes: new Set(), detalle: [] };
            }

            const idsJson = JSON.stringify(ids.map(id => parseInt(id)));

            const response = await $.ajax({
                url: `/${URLBase}/ValidarProductosTerminadosExistentes`,
                type: "GET",
                data: {
                    IdsJson: idsJson,
                    TipoProceso: tipoProceso
                }
            });

            if (response.Status !== "OK") {
                console.warn("⚠️ No se pudo validar productos existentes:", response.Message);
                return { idsExistentes: new Set(), detalle: [] };
            }

            const data = JSON.parse(response.Data);

            // 🔥 Ahora cada registro trae PRODUCTO, MES, FECHA, LINEA, TURNO reales de BD
            const existentes = data.filter(x => x.EXISTE === 'SI');
            const idsExistentes = new Set(existentes.map(x => String(x.ID_PRODUCTO_TERMINADO)));

            return { idsExistentes, detalle: existentes };

        } catch (error) {
            console.error("Error al validar productos terminados existentes:", error);
            return { idsExistentes: new Set(), detalle: [] };
        }
    }

    /**
     * Muestra un modal con los productos omitidos durante la validación
     * @param {Array} productosOmitidos - Array de productos que ya existen
     */
    static mostrarModalProductosOmitidos(productosOmitidos) {
        try {
            if (!productosOmitidos || productosOmitidos.length === 0) return;

            let tableHtml = '<div style="max-height:360px; overflow:auto;">' +
                '<table class="table table-sm table-striped mb-0">' +
                '<thead><tr>' +
                '<th>Producto</th><th>Fecha creación</th><th>Mes</th><th>Turno</th><th>Línea</th>' +
                '</tr></thead><tbody>';

            productosOmitidos.forEach(r => {
                tableHtml += `
                <tr style="background-color:#fff3cd;">
                    <td>${r.PRODUCTO || r.ID_PRODUCTO_TERMINADO}</td>
                    <td>${ProductosTerminadosHelper.formatearFechaCreacion(r.FECHA_CREACION)}</td>
                    <td>${r.MES || '-'}</td>
                    <td>${r.TURNO || '-'}</td>
                    <td>${r.LINEA || '-'}</td>
                </tr>`;
            });

            tableHtml += '</tbody></table></div>';

            const modalId = 'ptmValidacionModal_' + Date.now();
            const modalHtml = `
            <div class="modal fade" id="${modalId}" tabindex="-1" aria-hidden="true" data-bs-backdrop="static" data-bs-keyboard="true">
              <div class="modal-dialog modal-dialog-centered" style="max-width:80%">
                <div class="modal-content">

                  <!-- Header -->
                  <div class="modal-header-custom">
                    <div class="d-flex align-items-center gap-3">
                        <div class="modal-icon-wrap">
                            <i class="bi bi-exclamation-triangle"></i>
                        </div>
                        <div>
                            <div class="modal-title-custom">Productos terminados ya sincronizados</div>
                            <div class="modal-subtitle-custom">${productosOmitidos.length} producto(s) omitidos del grid</div>
                        </div>
                    </div>
                    <button type="button" class="btn-close-custom" data-bs-dismiss="modal" aria-label="Cerrar">
                        <i class="bi bi-x-lg"></i>
                    </button>
                  </div>

                  <!-- Body -->
                  <div class="modal-body-custom">

                    <div class="p-3 rounded border mb-3" style="background:#f8f9fa;">
                        <div class="d-flex align-items-center gap-2">
                            <i class="bi bi-info-circle text-info"></i>
                            <span style="font-size:0.85rem; color:#666;">
                                Estos productos terminados ya existen en bitácora con la información mostrada a continuación y fueron omitidos de la sincronización.
                            </span>
                        </div>
                    </div>

                    <div class="p-3 rounded border" style="background:#fff;">
                        ${tableHtml}
                    </div>

                  </div>

                  <!-- Footer -->
                  <div class="modal-footer-custom justify-content-end">
                    <button type="button" class="btn-modal-cancelar" data-bs-dismiss="modal">
                        <i class="bi bi-x-circle me-1"></i> Cerrar
                    </button>
                  </div>

                </div>
              </div>
            </div>
        `;

            const $modal = $(modalHtml).appendTo('body');
            const bsModal = new bootstrap.Modal(document.getElementById(modalId));
            bsModal.show();

            $modal.on('hidden.bs.modal', function () {
                $modal.remove();
            });

        } catch (err) {
            console.warn('mostrarModalProductosOmitidos error', err);
        }
    }

    /**
     * Formatea una fecha en formato dd/mm/yyyy hh:mm am/pm
     * @param {String} fechaCreacion - Fecha a formatear
     * @returns {String} Fecha formateada
     */
    static formatearFechaCreacion(fechaCreacion) {
        if (!fechaCreacion) return '-';

        const fecha = new Date(fechaCreacion);
        if (isNaN(fecha.getTime())) return '-';

        const dia = String(fecha.getDate()).padStart(2, '0');
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const anio = fecha.getFullYear();

        let horas = fecha.getHours();
        const minutos = String(fecha.getMinutes()).padStart(2, '0');
        const ampm = horas >= 12 ? 'pm' : 'am';

        horas = horas % 12;
        horas = horas === 0 ? 12 : horas; // 0 -> 12

        return `${dia}/${mes}/${anio} ${horas}:${minutos} ${ampm}`;
    }
}
