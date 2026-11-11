# PENDIENTES

Esta carpeta debe estar **sin scripts SQL** en estado normal. Este README es solo una referencia.

- Aquí solo deben vivir scripts SQL **por aplicar**.
- Al aplicarse en TEST_JUNIO_2026 y PTM_2022_FINAL, se mueven a `../APLICADOS/<schema>/`.
- Se registran en `../MIGRACIONES_APLICADAS.md`.
- Si un script se reemplaza, se mueve a `../OBSOLETO/` con encabezado `OBSOLETO - NO EJECUTAR`.

Regla: si hay algo aquí, es porque falta aplicarlo. Si no hay nada, todo está al día.

## Contenido actual

- `MIGRACION_DEVOLUCION_COSTO_PROMEDIO_TEST_JUNIO_2026.sql`
- `MIGRACION_DEVOLUCION_COSTO_PROMEDIO_PTM_2022_FINAL.sql`

Motivo: los SPs `SpPdxMTTOGetArticuloSalidaM` y `SpPdxMTTOGetSalidasPorOT`
deben devolver `CostoPromedio` (`OITM.AvgPrice`) para que la devolución a SAP
se valore con el costo promedio del artículo al momento de la devolución y el
modal lo muestre antes de confirmar.
