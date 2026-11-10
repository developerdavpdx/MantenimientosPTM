# Reporte de faltantes — Módulo Almacén

**Fecha:** 09/11/2026  
**Ambiente comparado:** HANA Cloud — schema `DBADMIN`  
**Objetivo:** identificar los objetos de BD que usa Almacén y que aún no existen en la instancia, para extraerlos de on-premise y montarlos mañana.

> **Actualización 10/11/2026:** ya se analizaron las definiciones de los 9 SPs. La lista exacta de tablas a extraer quedó en **6** y está en `SQL_ORIGEN_ALMACEN/REPORTE_DEPENDENCIAS.md`. Este documento se mantiene como inventario inicial.
>
> **Estado final 10/11/2026:** las 5 tablas faltantes fueron creadas en `DBADMIN`, se agregaron 4 columnas a tablas existentes y los **9 SPs** fueron creados y probados. `PdxMTTOMPSolicitudCompraMP` resultó obsoleta; los 2 SPs se adaptaron a `PdxMTTOMPSolicitudCompra` + `PdxMTTOMPSolicitudCompraDetalle`.

---

## 1. Resumen ejecutivo

| Métrica | Resultado |
|---|---|
| SPs referenciados en `AccesoDatosAlmacen.cs` | **42** |
| SPs existentes en `DBADMIN` | **33** |
| **SPs faltantes** | **9** |
| Tablas propias `PdxMTTO%` | **31 existen + 2 faltan** (`PdxMTTORechazoDevolucion`, `PdxMTTOMPSolicitudCompraMP`) |
| Tablas propias `@PDX_*` | **2** (ambas existen) |
| Vistas en `DBADMIN` | **0** |
| Secuencias propias | **0** (solo del sistema) |
| Hallazgo adicional (Preventivos) | **1 SP faltante** |

> La instancia cloud tiene solo un subconjunto de tablas SAP Business One. Varios de los SPs faltantes probablemente dependen de tablas SAP que tampoco están. La lista **definitiva** se obtiene con la consulta de dependencias de la sección 5.

---

## 2. SPs faltantes (los 9 de Almacén)

| # | SP exacto en el código | Constante | Endpoint / uso | Impacto | Prioridad |
|---|---|---|---|---|---|
| 1 | `SpPdxMTTOGetArticuloSalidaM` | `GCSGetDetalleArtSalida` | `GenerarSalidaMercancia`, `GenerarDevolucionMercancia` | No se obtiene el detalle del artículo para salida/devolución | 🔴 Crítica |
| 2 | `SpPdxMTTOInsertMovimientoAlmacen` | `GCInsertarMovimientoAlm` | `ObtenerEstadoSolicitud` | No se registran los movimientos de almacén | 🔴 Crítica |
| 3 | `SpPdxMTTOGetSeriesByName` | `GCGetSerieByName` | `GenerarSalidaMercancia`, `GenerarDevolucionMercancia` | Sin serie no se contabiliza correctamente en SAP | 🔴 Crítica |
| 4 | `SpPdxMTTOInsertRechazoDevolucion` | `GCInsertRechazoDev` | `GuardarRechazoDevolucion` | No se guarda el rechazo de devolución | 🟠 Alta |
| 5 | `SpPdxMTTOGetEstautsAuthSC` | `GCGetEstatusAuthSC` | `ActualizarRefaccionOT`, `ObtenerEstadoSolicitud` | No se consulta el estatus de autorización de SC | 🟠 Alta |
| 6 | `SpPdxMTTOGetLineasOC` | `GCSGetDetalleOC` | `GetOrdenDetalleOC` | No se obtienen las líneas de la OC | 🟡 Media |
| 7 | `SpPdxMTTOGetSolicitudesCompra_filtradas` | `GCGetSolicitudesCompraFiltradoMP` | `GetDetalleSolicitudesCompra` | No se consultan solicitudes de compra filtradas | 🟡 Media |
| 8 | `SpPdxMTTOGetDevolucionesPorOT` | `GCGetDevolucionesPorOrdenTrabajo` | `GetDevolucionesPorOrdenTrabajo` | No se consultan devoluciones por OT | 🟡 Media |
| 9 | `SpPdxMTTOConsultaSolicitudesCompraMP` | `GCConsultaSolicitudesCompraMP` | **Sin uso actual** (solo declarada) | Ninguno por ahora | 🟢 Baja |

### 2.1 Variantes de nombre que conviene buscar en on-premise

| Nombre en el código | Posible nombre real / nota |
|---|---|
| `SpPdxMTTOGetEstautsAuthSC` | El código tiene el typo **“Estauts”**. Buscar también `SpPdxMTTOGetEstatusAuthSC`. |
| `SpPdxMTTOGetDevolucionesPorOT` | Ya existe `SpPdxMTTOGetDevoPorOT` en cloud. Confirmar si son distintos o si el código apunta al nombre viejo. |
| `SpPdxMTTOConsultaSolicitudesCompraMP` | Ya existe `SpPdxMTTOGetSolicitudesCompraMP`. Confirmar si es un SP distinto o nombre legacy. |
| `SpPdxMTTOGetSolicitudesCompra_filtradas` | Buscar también `...Filtrado`, `...Filtradas`, `...filtradas`. |
| `SpPdxMTTOGetSeriesByName` | Buscar también `SpPdxMTTOGetSerieByName` (singular). |
| `SpPdxMTTOGetLineasOC` | Buscar también `...LineasOrdenCompra`, `...GetLineasOC`. |
| `SpPdxMTTOGetArticuloSalidaM` | Buscar también `...ArticuloSalida`, `...SalidaM`. |
| `SpPdxMTTOInsertMovimientoAlmacen` | Buscar también `...InsertarMovimientoAlmacen`. |
| `SpPdxMTTOInsertRechazoDevolucion` | Buscar también `...InsertarRechazoDevolucion`. |

> Si en on-premise solo existe la variante “correcta”, hay que **alinear el nombre en `AccesoDatosAlmacen.cs`** o crear el SP con el nombre exacto que espera el código.

---

## 3. Tablas y objetos

### 3.1 Tablas propias existentes en `DBADMIN` (31)

```
PdxMTTOActividadesRutinasMP          PdxMTTOMCGenerados
PdxMTTOAreaLinea                     PdxMTTOMPGenerados
PdxMTTOAreasxPlanta                  PdxMTTOMPSolicitudCompra
PdxMTTOCategoriasParo                PdxMTTOMPSolicitudCompraDetalle
PdxMTTOEquiposPeriodicidad           PdxMTTOMPSolicitudRefacciones
PdxMTTOEstatusEquipos                PdxMTTOMovimientosAlmacen
PdxMTTOEstatusOT                     PdxMTTOOrdenesTrabajoMC
PdxMTTOGestionEquipos                PdxMTTOOrdenesTrabajoMP
PdxMTTOLineasxPlanta                 PdxMTTOPeriodicidadMant
PdxMTTOSolicitudMC                   PdxMTTORutinasMP
PdxMTTOSolicitudesBajaEquipos        PdxMTTOSolicitudesReprogramacion
PdxMTTOTBitacoraPlanProduccion       PdxMTTOTParoProduccion
PdxMTTOTPlanProduccion               PdxMTTOTiemposMuertosProduccionCorrugado
PdxMTTOTiemposMuertosProduccionINY   PdxMTTOTiemposMuertosProduccionPVC
PdxMTTOTiposEquipo                   PdxMTTOTiemposMuertosProduccionPeadLiso
PdxMTTOMantenimientosCorrectivosPro
```

**Tablas `@PDX_*` existentes (2):**

```
@PDX_CAPPROD
@PDX_USUARIOSCOMPRAS
```

> **Actualización 10/11/2026:** el análisis de las definiciones detectó **2 tablas propias faltantes**:
> - `PdxMTTORechazoDevolucion`
> - `PdxMTTOMPSolicitudCompraMP` (ver nota: cloud usa `PdxMTTOMPSolicitudCompra`)
>
> Ver `SQL_ORIGEN_ALMACEN/REPORTE_DEPENDENCIAS.md`.

### 3.2 Tablas SAP Business One — estado actual en cloud

**Existentes en `DBADMIN` (usadas por los SPs de Almacén que ya funcionan):**

```
OITM   OITW   OITB   OCRD   OHEM   OIGN   IGN1
POR1   OPCH   OHPS   OUDP
```

**No existen en `DBADMIN` (candidatas a extraer si las usan los 9 SPs):**

```
OITR   OITL   OIBT   OBTN   OBTQ   OBBQ   OIVL
OWHS   OWTR   WTR1   OPOR   PCH1   OIGE   IGE1
OPDN   PDN1   RIN1   INV1   OUSR   OUBR   OBPL
OCTG   OUOM   HPS1   NNM1
```

> ⚠️ **No asumir** que todas hacen falta. El análisis de las definiciones redujo la lista exacta a **6 tablas**: `PdxMTTORechazoDevolucion`, `PdxMTTOMPSolicitudCompraMP`, `OPOR`, `OBTN`, `OBTQ` y `NNM1` (ver `SQL_ORIGEN_ALMACEN/REPORTE_DEPENDENCIAS.md`).

### 3.3 Vistas, secuencias y sinónimos

- **Vistas en `DBADMIN`:** 0.
- **Secuencias propias:** 0 (las 34 que hay son del sistema `_SYS_*`).
- **Sinónimos:** revisar en on-premise; pueden aparecer dependencias a `PUBLIC` o a tablas SAP.

Si los SPs usan secuencias para folios (por ejemplo, `SpPdxMTTOGenerarFolioSCMP`), hay que extraer también la secuencia asociada.

---

## 4. Checklist para mañana (on-premise → cloud)

- [ ] Identificar el **schema de origen** en on-premise (`PTM_2022_FINAL`, `TEST_JUNIO_2026` o `DBADMIN`).
- [ ] Extraer los **9 SPs** de Almacén + `SpPdxMTTOAceptarReprogramacion` (Preventivos).
- [ ] Ejecutar la consulta de **dependencias** de esos SPs y guardar la lista.
- [ ] Extraer las **tablas SAP B1** que aparezcan en las dependencias y que no existan en cloud.
- [ ] Extraer las **6 tablas exactas**: `PdxMTTORechazoDevolucion`, `PdxMTTOMPSolicitudCompraMP`, `OPOR`, `OBTN`, `OBTQ`, `NNM1`.
- [ ] Extraer las **tablas propias** adicionales que aparezcan (si hay).
- [ ] Extraer **secuencias, vistas y sinónimos** usados.
- [ ] Crear en cloud en este orden: **tablas → secuencias → vistas/sinónimos → SPs**.
- [ ] Validar que los SPs compilen (`SYS.PROCEDURES`).
- [ ] Ejecutar la verificación de objetos faltantes (sección 5).
- [ ] Probar los endpoints afectados:
  - `GenerarSalidaMercancia`
  - `GenerarDevolucionMercancia`
  - `ObtenerEstadoSolicitud`
  - `GuardarRechazoDevolucion`
  - `ActualizarRefaccionOT`
  - `GetOrdenDetalleOC`
  - `GetDetalleSolicitudesCompra`
  - `GetDevolucionesPorOrdenTrabajo`

---

## 5. Scripts SQL

El script listo para ejecutar está en:

```
SQL_MIGRACION/FALTANTES_ALMACEN_EXTRACCION.sql
```

Incluye:

1. Definiciones de los 9 SPs + `SpPdxMTTOAceptarReprogramacion`.
2. Dependencias (`SYS.OBJECT_DEPENDENCIES`).
3. Columnas de las tablas dependientes.
4. Secuencias, vistas y sinónimos.
5. Verificación de objetos existentes/faltantes en cloud.
6. Búsqueda de variantes de nombre.

> Reemplaza `<SCHEMA>` por el schema de on-premise antes de ejecutarlo.

---

## 6. Notas importantes

- En `Web.config`, la app usa `ConfigurationManager.AppSettings["Database"]` como prefijo de schema. Hoy está en **`DBADMIN`**; en TEST/PTM debe apuntar al schema correspondiente y los objetos deben existir ahí.
- Si el SP existe en on-premise con otro nombre, **no basta con copiarlo**: hay que crear el nombre exacto que espera el código o ajustar la constante en `AccesoDatosAlmacen.cs`.
- **Hallazgo adicional (no Almacén):** `SpPdxMTTOAceptarReprogramacion` (Preventivos) tampoco existe en `DBADMIN`. Conviene extraerlo en la misma jornada.
- Este análisis **no modificó código ni base de datos**; solo compara el código contra `SYS.PROCEDURES` / `SYS.TABLES`.

---

## Anexo A — Los 42 SPs de Almacén y su estado

| SP | Estado |
|---|---|
| `SpPdxMTTOActualizarCabeceraSolicitudCompraMP` | ✅ Existe |
| `SpPdxMTTOActualizarSolicitudCompraDetalleMP` | ✅ Existe |
| `SpPdxMTTOActualizarSolicitudRefaccion` | ✅ Existe |
| `SpPdxMTTOBuscarProveedores` | ✅ Existe |
| `SpPdxMTTOCantidadesRequisicionXAlmacen` | ✅ Existe |
| `SpPdxMTTOConsultaArticulosPorOT` | ✅ Existe |
| `SpPdxMTTOConsultaDatosSolicitante` | ✅ Existe |
| `SpPdxMTTOConsultaSolicitudesCompraMP` | ❌ **Falta** |
| `SpPdxMTTOConsultaSolicitudesRefaccionesMP` | ✅ Existe |
| `SpPdxMTTOGetArticuloSalidaM` | ❌ **Falta** |
| `SpPdxMTTOGetBalanceOT` | ✅ Existe |
| `SpPdxMTTOGetCostCenters` | ✅ Existe |
| `SpPdxMTTOGetDepSucursal` | ✅ Existe |
| `SpPdxMTTOGetDetallesSolicitudCompraMP` | ✅ Existe |
| `SpPdxMTTOGetDevolucionesPorOT` | ❌ **Falta** |
| `SpPdxMTTOGetDevoPorOT` | ✅ Existe |
| `SpPdxMTTOGetEmailsEmpleadosXModulo` | ✅ Existe |
| `SpPdxMTTOGetEmpleadosAlmacenPorRol` | ✅ Existe |
| `SpPdxMTTOGetEstautsAuthSC` | ❌ **Falta** |
| `SpPdxMTTOGetLastSalidaInventario` | ✅ Existe |
| `SpPdxMTTOGetLineasOC` | ❌ **Falta** |
| `SpPdxMTTOGetMovimientoSalidaPorSolicitud` | ✅ Existe |
| `SpPdxMTTOGetOrdenesCompraAbiertas` | ✅ Existe |
| `SpPdxMTTOGetOrdenesCompraByDocNum` | ✅ Existe |
| `SpPdxMTTOGetProveedorArticulo` | ✅ Existe |
| `SpPdxMTTOGetSalidasPorOT` | ✅ Existe |
| `SpPdxMTTOGetSeriesByName` | ❌ **Falta** |
| `SpPdxMTTOGetSolicitudesCompra_filtradas` | ❌ **Falta** |
| `SpPdxMTTOGetSolicitudesCompraMP` | ✅ Existe |
| `SpPdxMTTOGetUsuariosCompras` | ✅ Existe |
| `SpPdxMTTOGetUsuariosXPlanta` | ✅ Existe |
| `SpPdxMTTOInsertarSolicitudCompraDetalleMP` | ✅ Existe |
| `SpPdxMTTOInsertarSolicitudCompraMP` | ✅ Existe |
| `SpPdxMTTOInsertarSolicitudRefaccion` | ✅ Existe |
| `SpPdxMTTOInsertMovimientoAlmacen` | ❌ **Falta** |
| `SpPdxMTTOInsertRechazoDevolucion` | ❌ **Falta** |
| `SpPdxMTTOUpdateEstatusAuthSC` | ✅ Existe |
| `SpPdxMTTOUpdateEstatusComAuthSC` | ✅ Existe |
| `SpPdxMTTOUpdateEstatusSolicitud` | ✅ Existe |
| `SpPdxMTTOUpdateStatusOT` | ✅ Existe |
| `SpPdxMTTOUpdateUDFEntrada` | ✅ Existe |
| `SpPdxMTTOUpdateUDFSalida` | ✅ Existe |
