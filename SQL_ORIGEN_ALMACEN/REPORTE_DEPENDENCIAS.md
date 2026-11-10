# Dependencias de los SPs de Almacén — Análisis de definiciones

**Fecha:** 10/11/2026  
**Fuente:** 9 archivos `.sql` en `SQL_ORIGEN_ALMACEN/`  
**Ambiente comparado:** HANA Cloud — schema `DBADMIN`

---

## 1. Resultado

| Métrica | Resultado |
|---|---|
| SPs analizados | **9** |
| Objetos dependientes únicos (tablas/vistas) | **14** |
| Ya existen en `DBADMIN` | **8** |
| **Faltan** | **6** |

### Las 6 tablas que hay que extraer de on-premise

| # | Tabla | Tipo | La usan | Nota |
|---|---|---|---|---|
| 1 | `PdxMTTORechazoDevolucion` | Propia | `SpPdxMTTOInsertRechazoDevolucion`, `SpPdxMTTOGetDevolucionesPorOT` | **No existe en cloud.** Tiene identidad `ID_RECHAZO` (el SP usa `CURRENT_IDENTITY_VALUE()`). |
| 2 | `PdxMTTOMPSolicitudCompraMP` | Propia | `SpPdxMTTOGetSolicitudesCompra_filtradas`, `SpPdxMTTOConsultaSolicitudesCompraMP` | **Ver nota crítica de la sección 5**: cloud usa `PdxMTTOMPSolicitudCompra` (sin `MP`). |
| 3 | `OPOR` | SAP B1 | `SpPdxMTTOGetLineasOC` | Cabecera de órdenes de compra. |
| 4 | `OBTN` | SAP B1 | `SpPdxMTTOGetArticuloSalidaM` | Maestro de lotes. |
| 5 | `OBTQ` | SAP B1 | `SpPdxMTTOGetArticuloSalidaM` | Cantidades por lote/almacén. |
| 6 | `NNM1` | SAP B1 | `SpPdxMTTOGetSeriesByName` | Series de numeración. |

> **Estado del DDL (10/11/2026):** 5 de las 6 tablas ya tienen `CREATE TABLE` generado y **validado** en un schema temporal. Script: `SQL_MIGRACION/MIGRACION_ALMACEN_TABLAS.sql`.
>
> **Pendiente:** `PdxMTTOMPSolicitudCompraMP` — no vino su DDL en `SQL_ORIGEN_ALMACEN/TABLAS`.

---

## 2. Dependencias por SP

| SP | Dependencias | Faltantes |
|---|---|---|
| `SpPdxMTTOGetArticuloSalidaM` | `PdxMTTOMPSolicitudRefacciones` ✅, `OITM` ✅, `OITW` ✅, `OITB` ✅, `OBTQ` ❌, `OBTN` ❌ | `OBTQ`, `OBTN` |
| `SpPdxMTTOInsertMovimientoAlmacen` | `PdxMTTOMovimientosAlmacen` ✅, `DUMMY` (sistema) | Ninguna |
| `SpPdxMTTOGetSeriesByName` | `NNM1` ❌, `DUMMY` (sistema) | `NNM1` |
| `SpPdxMTTOInsertRechazoDevolucion` | `PdxMTTORechazoDevolucion` ❌, `DUMMY` (sistema) | `PdxMTTORechazoDevolucion` |
| `SpPdxMTTOGetEstautsAuthSC` | `PdxMTTOMPSolicitudCompra` ✅ | Ninguna |
| `SpPdxMTTOGetLineasOC` | `OPOR` ❌, `POR1` ✅ | `OPOR` |
| `SpPdxMTTOGetSolicitudesCompra_filtradas` | `PdxMTTOMPSolicitudCompraMP` ❌, `PdxMTTOMPSolicitudRefacciones` ✅ | `PdxMTTOMPSolicitudCompraMP` |
| `SpPdxMTTOGetDevolucionesPorOT` | `PdxMTTOMPSolicitudRefacciones` ✅, `OITM` ✅, `PdxMTTOMovimientosAlmacen` ✅, `OIGN` ✅, `PdxMTTORechazoDevolucion` ❌, `DUMMY` | `PdxMTTORechazoDevolucion` |
| `SpPdxMTTOConsultaSolicitudesCompraMP` | `PdxMTTOMPSolicitudCompraMP` ❌, `PdxMTTOMPSolicitudRefacciones` ✅ | `PdxMTTOMPSolicitudCompraMP` |

**Dependencias que ya existen en cloud (no tocar):**

```
PdxMTTOMPSolicitudRefacciones   PdxMTTOMovimientosAlmacen
PdxMTTOMPSolicitudCompra        PdxMTTOMPSolicitudCompraDetalle
OITM   OITW   OITB   OIGN   POR1
```

---

## 3. Verificación en on-premise

Antes de extraer, confirma el tipo y existencia real de las 6:

```sql
SELECT 'TABLE' AS TIPO, TABLE_NAME AS NOMBRE
FROM SYS.TABLES
WHERE SCHEMA_NAME = 'TEST_JUNIO_2026'
  AND TABLE_NAME IN ('PdxMTTORechazoDevolucion','PdxMTTOMPSolicitudCompraMP','OPOR','OBTN','OBTQ','NNM1')
UNION ALL
SELECT 'VIEW', VIEW_NAME
FROM SYS.VIEWS
WHERE SCHEMA_NAME = 'TEST_JUNIO_2026'
  AND VIEW_NAME IN ('PdxMTTORechazoDevolucion','PdxMTTOMPSolicitudCompraMP','OPOR','OBTN','OBTQ','NNM1')
UNION ALL
SELECT 'SYNONYM', SYNONYM_NAME
FROM SYS.SYNONYMS
WHERE SCHEMA_NAME = 'TEST_JUNIO_2026'
  AND SYNONYM_NAME IN ('PdxMTTORechazoDevolucion','PdxMTTOMPSolicitudCompraMP','OPOR','OBTN','OBTQ','NNM1')
ORDER BY TIPO, NOMBRE;
```

> Cambia `TEST_JUNIO_2026` por el schema real de on-premise.

---

## 4. Nota crítica: `PdxMTTOMPSolicitudCompraMP`

Los SPs **existentes** en cloud usan la tabla:

```
PdxMTTOMPSolicitudCompra
```

Pero los **nuevos** SPs extraídos usan:

```
PdxMTTOMPSolicitudCompraMP   (con "MP" al final)
```

Antes de crear nada, verifica en on-premise:

```sql
SELECT TABLE_NAME
FROM SYS.TABLES
WHERE SCHEMA_NAME = 'TEST_JUNIO_2026'
  AND TABLE_NAME LIKE 'PdxMTTOMPSolicitudCompra%'
ORDER BY TABLE_NAME;
```

- Si **existe** `PdxMTTOMPSolicitudCompraMP`: hay que extraerla y crearla en cloud.
- Si **no existe** y solo está `PdxMTTOMPSolicitudCompra`: **no basta con renombrar**. La tabla `PdxMTTOMPSolicitudCompra` de cloud **no tiene** la columna `ID_SOLICITUD_REFACCION` que usan los 2 SPs nuevos. En ese caso hay que:
  - Agregar `ID_SOLICITUD_REFACCION` a `PdxMTTOMPSolicitudCompra` (si el negocio confirma que es la misma tabla), **o**
  - Extraer/crear la tabla `PdxMTTOMPSolicitudCompraMP` tal como está en on-premise.

> **Importante — flujo de escritura:** los SPs que ya existen en cloud (`SpPdxMTTOInsertarSolicitudCompraMP`, `...DetalleMP`, `...Actualizar...`) escriben en `PdxMTTOMPSolicitudCompra`, no en `...CompraMP`. Si se crea `...CompraMP`, hay que revisar también esos SPs para que el flujo de escritura apunte a la misma tabla. De lo contrario, la consulta filtrada leerá una tabla vacía.

---

## 5. Nota de schema al montar en `DBADMIN`

7 de los 9 SPs traen `"TEST_JUNIO_2026".` **hardcodeado** en el cuerpo. Al crear en cloud hay que:

- Reemplazar `"TEST_JUNIO_2026".` por `"DBADMIN".`, **o**
- Quitar el prefijo de schema y dejar que use el schema actual de la conexión.

Los 2 SPs que **no** traen schema en el cuerpo son:

```
SpPdxMTTOGetSeriesByName
SpPdxMTTOGetDevolucionesPorOT
```

Esos se crearán en el schema actual (`DBADMIN`). Verifica que `NNM1`, `OITM`, `OIGN` y las tablas `PdxMTTO...` resuelvan ahí.

---

## 6. Orden sugerido de montaje

1. **Tablas** (en este orden):
   1. `PdxMTTORechazoDevolucion`
   2. `PdxMTTOMPSolicitudCompraMP` *(o corregir la referencia a `PdxMTTOMPSolicitudCompra`)*
   3. `OPOR`
   4. `OBTN`
   5. `OBTQ`
   6. `NNM1`
2. **SPs** (9), con el schema ajustado.
3. **Verificación**:
   ```sql
   SELECT PROCEDURE_NAME FROM SYS.PROCEDURES
   WHERE SCHEMA_NAME='DBADMIN'
     AND PROCEDURE_NAME IN ( ...los 9... )
   ORDER BY PROCEDURE_NAME;
   ```
4. **Pruebas** de endpoints:
   - `GenerarSalidaMercancia`
   - `GenerarDevolucionMercancia`
   - `ObtenerEstadoSolicitud`
   - `GuardarRechazoDevolucion`
   - `ActualizarRefaccionOT`
   - `GetOrdenDetalleOC`
   - `GetDetalleSolicitudesCompra`
   - `GetDevolucionesPorOrdenTrabajo`

---

## 7. Pendiente

- `SpPdxMTTOAceptarReprogramacion` (Preventivos) **no está** en la carpeta. Si lo quieres montar en la misma jornada, agrégalo.
- `PdxMTTOMPSolicitudCompraMP` **no se usa**: se descartó y los 2 SPs se adaptaron a `PdxMTTOMPSolicitudCompra` + `PdxMTTOMPSolicitudCompraDetalle`.

---

## 8. Estado del montaje (10/11/2026)

### Tablas

| Tabla | Estado |
|---|---|
| `PdxMTTORechazoDevolucion` | ✅ Creada en `DBADMIN` |
| `OBTN` | ✅ Creada en `DBADMIN` |
| `OBTQ` | ✅ Creada en `DBADMIN` |
| `NNM1` | ✅ Creada en `DBADMIN` |
| `OPOR` | ✅ Creada en `DBADMIN` |
| `PdxMTTOMPSolicitudCompraMP` | ❌ Obsoleta, no se crea |

### Columnas agregadas a tablas existentes

- `PdxMTTOMovimientosAlmacen`: `ESTATUS INTEGER`, `COMENTARIOS NVARCHAR(1000)`.
- `PdxMTTOMPSolicitudCompra`: `PLANTA NVARCHAR(10)`, `FECHA_REQUERIDA DATE`.

### SPs

- **Los 9 SPs quedaron creados en `DBADMIN`**.
- `SpPdxMTTOGetSolicitudesCompra_filtradas` y `SpPdxMTTOConsultaSolicitudesCompraMP` se adaptaron a las tablas reales usando `PdxMTTOMPSolicitudCompraDetalle`.
- Scripts: `SQL_MIGRACION/MIGRACION_ALMACEN_SP.sql` y `MIGRACION_ALMACEN_SP_FIX.sql`.

### Pruebas

| SP | Resultado |
|---|---|
| `GetArticuloSalidaM` | ✅ OK (0 filas) |
| `GetSeriesByName` | ✅ OK (0 filas) |
| `GetEstautsAuthSC` | ✅ OK (0 filas) |
| `GetLineasOC` | ✅ OK (0 filas) |
| `GetSolicitudesCompra_filtradas` | ✅ OK (0 filas) |
| `GetDevolucionesPorOT` | ✅ OK (0 filas) |
| `ConsultaSolicitudesCompraMP` | ✅ OK (0 filas) |
| `InsertMovimientoAlmacen` | ✅ OK (insertó y se limpió) |
| `InsertRechazoDevolucion` | ✅ OK (insertó y se limpió) |
