# Plan de carga de datos reales - Modulo Almacen (HANA Cloud)

Fecha: 10/11/2026
Objetivo: que las pantallas de Almacen se vean y se comporten con volumen realista,
sin cargar tablas completas cuando son enormes.

## 1. Estado actual en DBADMIN

| Tabla | Filas hoy | Origen |
|---|---:|---|
| OITM | 10,355 | real migrado |
| OITW | 11,745 | real migrado |
| OITB | 13 | real migrado |
| OHEM | 448 | real migrado |
| OUDP | 23 | real migrado |
| OCRD | 6,842 | real migrado |
| OPRC | 416 | real TEST_JUNIO_2026 |
| OUBR | 14 | real TEST_JUNIO_2026 |
| OWHS | **0** | **falta** (hay 71 almacenes en OITW) |
| OUSR | 1 | solo seed |
| NNM1 | 1 | solo seed |
| OBTN / OBTQ | 0 / 0 | lotes; solo 4 articulos manejan lote |
| OPOR / POR1 | 1 / 12 | solo seed |
| OPRQ / PRQ1 | 1 / 12 | solo seed |
| OIGE / IGE1 | 1 / 12 | solo seed |
| PdxMTTOMPSolicitudRefacciones | 13 | solo seed |
| PdxMTTOMPSolicitudCompra | 2 | solo seed |
| PdxMTTOMPSolicitudCompraDetalle | 12 | solo seed |
| PdxMTTOMovimientosAlmacen | 16 | solo seed |
| PdxMTTORechazoDevolucion | 2 | solo seed |
| PdxMTTOMCSolicitudRefacciones | 4 | solo seed |
| @PDX_NOTIFICACIONES | 1 | solo seed |

## 2. Prioridad 1 - Catalogos (cargar todo, son chicos)

| Tabla | Volumen sugerido | Por que |
|---|---:|---|
| **OWHS** | todos (~71) | nombres de almacen; hoy esta vacia y OITW ya usa 71 codigos |
| **NNM1** | todas las series (~50-500) | numeracion de documentos |
| **OUSR** | todos (~50-200) | usuarios/aprobadores (no es autenticacion del portal) |
| **@PDX_NOTIFICACIONES** | todos (tope 500) | notificaciones reales del portal |
| OBTN / OBTQ | solo los 4 articulos con lote | Lote y StockLote en SolicitudRefacciones |

## 3. Prioridad 2 - Documentos SAP (500 recientes + sus lineas)

Cargar los **500 documentos mas recientes** de cada tipo y **todas sus lineas**
(si las lineas son demasiadas, tope 2,000). Filtrar idealmente ultimos 12 meses
y almacenes COR040 / P2040 para la primera prueba.

| Cabecera | Detalle | Volumen sugerido |
|---|---|---:|
| OPOR | POR1 | 500 ordenes de compra + lineas |
| OPRQ | PRQ1 | 500 solicitudes de compra + lineas |
| OIGE | IGE1 | 500 salidas de inventario + lineas |

## 4. Prioridad 3 - Historial del portal (500 recientes)

| Tabla | Volumen sugerido | Nota |
|---|---:|---|
| PdxMTTOMPSolicitudRefacciones | 500 recientes | base de SolicitudRefacciones |
| PdxMTTOMPSolicitudCompra | 500 recientes | cabeceras |
| PdxMTTOMPSolicitudCompraDetalle | todas las lineas de esas 500 | depende de ID_SOLICITUD_REFACCION |
| PdxMTTOMovimientosAlmacen | 500 recientes | salidas/devoluciones |
| PdxMTTORechazoDevolucion | 500 recientes | rechazos |
| PdxMTTOMCSolicitudRefacciones | 500 recientes | refacciones de Correctivos |

## 5. Orden de carga (para consistencia)

1. Catalogos: OWHS, OUSR, NNM1, OBTN/OBTQ, @PDX_NOTIFICACIONES.
2. OPOR -> POR1.
3. OPRQ -> PRQ1.
4. OIGE -> IGE1.
5. PdxMTTOMPSolicitudRefacciones.
6. PdxMTTOMPSolicitudCompra -> PdxMTTOMPSolicitudCompraDetalle.
7. PdxMTTOMovimientosAlmacen -> PdxMTTORechazoDevolucion.
8. PdxMTTOMCSolicitudRefacciones.

## 6. Cuidados tecnicos

- `PdxMTTOMovimientosAlmacen.ID_ALMACEN` es `ALWAYS AS IDENTITY`:
  exportar sin esa columna o cargar a staging e insertar columnas explicitas.
- `PdxMTTOMPSolicitudCompraDetalle` referencia `ID_SOLICITUD_REFACCION`:
  primero refacciones, luego cabeceras de compra, luego detalles.
- Respetar rangos de IDs para no chocar con el seed `900001-900099`.
- Para documentos SAP, cargar cabecera antes que detalle.
- No se requiere OITL/OINM/OACT/OOCR/CRD1 para las pantallas actuales de
  Almacen (esas tablas no estan migradas). Solo harian falta para kardex o
  contabilidad.

## 7. Formato de entrega

Mismo esquema que OPRC/OUBR:
- CSV con encabezado, UTF-8, separador `;`.
- O SQL con INSERTs.
- O export de HANA.
- Un archivo por tabla, con el nombre de la tabla en el archivo.
