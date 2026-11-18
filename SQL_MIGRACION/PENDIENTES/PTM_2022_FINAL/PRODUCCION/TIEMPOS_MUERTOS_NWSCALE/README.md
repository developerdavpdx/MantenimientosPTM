# Migracion TIEMPOS MUERTOS / NWSCALE - PTM_2022_FINAL

Paquete para blindar los Tiempos Muertos de los 4 procesos (PVC, INY, Corrugado,
PEAD Liso) contra duplicados y edicion concurrente en el schema **PTM_2022_FINAL**.

Aplica el mismo esquema que ya esta en `DBADMIN`:

- Una sola fila por `CLAVE_SYNC`.
- NWSCALE como resumen por **rango** o por **dia/turno**.
- Una sola fila **manual** por fecha + linea, con `OTMC` + `OTMP` + paros unificados.
- Upsert por clave en el servidor, dedupe de listas y **token de version**.
- Indice unico por `CLAVE_SYNC` como garantia final.

---

## Orden de ejecucion (obligatorio)

| # | Script | Que hace |
|---|--------|----------|
| 00 | `00_TM_BACKUP_PTM_2022_FINAL.sql` | Respaldo completo de las 4 tablas (`*_BAK_20261117`). |
| 01 | `01_TM_COLUMNAS_Y_CLAVES_PTM_2022_FINAL.sql` | Agrega columnas y calcula `ORIGEN` + `CLAVE_SYNC`. |
| 02 | `02_TM_REPORTE_DUPLICADOS_PTM_2022_FINAL.sql` | **Solo lectura.** Reporte para autorizar la limpieza. |
| 03 | `03_TM_LIMPIEZA_DUPLICADOS_PTM_2022_FINAL.sql` | Fusiona listas, conserva el ID menor y borra duplicados/vacias. |
| 04 | `04_TM_INDICES_UNICOS_PTM_2022_FINAL.sql` | Crea los 4 indices unicos `UX_TM_*_CLAVE_SYNC`. |
| 05 | `05_TM_SP_CONSULTA_PTM_2022_FINAL.sql` | `ALTER` de los 4 SPs de consulta. |
| 06 | `06_TM_SP_GUARDADO_PTM_2022_FINAL.sql` | `ALTER` de los 4 SPs de guardado. |

**No ejecutar 03 sin haber revisado 02.**

---

## Decisiones de datos

- **Duplicados:** se conserva la fila con el `ID_REGISTRO` **menor** de cada
  `CLAVE_SYNC`.
- **Listas:** antes de borrar se fusionan `OTMC`, `OTMP` e `ID_PARO` (valores
  distintos) dentro de la fila que se conserva, para no perder informacion.
- **Horas y numericos:** se conservan tal como estan en la fila superviviente.
  No se suman. (El front nuevo guarda el total con `SET`, no acumulando.)
- **Filas vacias:** las `SIN_ORIGEN` se eliminan en la seccion 5 del script 03.
  Si el reporte 02 muestra alguna con horas capturadas, **no** ejecutar esa
  seccion y revisarla a mano.
- **NWSCALE por rango:** las filas historicas quedan con clave `DIA`
  (`N|PLANTA|DIA|FECHA|LINEA|PRODUCTO|TURNO`). Las nuevas consultas por rango
  generan `N|PLANTA|RANGO|FECHA_INI|FECHA_FIN|LINEA|PRODUCTO`.

---

## Claves

| Origen | Clave |
|--------|-------|
| NWSCALE rango | `N\|PLANTA\|RANGO\|FECHA_INI\|FECHA_FIN\|LINEA\|PRODUCTO` |
| NWSCALE dia | `N\|PLANTA\|DIA\|FECHA\|LINEA\|PRODUCTO\|TURNO` |
| Manual | `M\|PLANTA\|FECHA\|LINEA` |
| Sin origen | `X\|ID_REGISTRO` |

---

## Notas tecnicas

- En on-premise **no** funciona `CREATE OR REPLACE PROCEDURE`; los scripts 05 y
  06 usan `ALTER PROCEDURE`. Si algun SP no existiera, cambiar `ALTER` por
  `CREATE` solo en ese bloque.
- Los scripts 01, 04, 05 y 06 se ejecutan **una vez**. Si un `ALTER TABLE` o
  `CREATE INDEX` falla porque el objeto ya existe, ignorar y continuar.
- `FECHA_CREACION` y `FECHA_ACTUALIZACION` normalmente ya existen. El script 01
  las verifica; si faltan, hay un bloque comentado para agregarlas.
- El servidor on-premise no es alcanzable desde la maquina de desarrollo:
  ejecutar estos scripts desde un equipo con acceso a `PTM_2022_FINAL`.

---

## Despues de aplicar

1. Publicar el DLL (`MantenimientosPTM.dll`) con los cambios de
   `ProduccionController` y `AccesoDatosProduccion`.
2. Publicar los 5 JS:
   `Global.js`, `produccion_pvc_refactor.js`, `produccion_iny_refactor.js`,
   `produccion_corrugado_refactor.js`, `produccion_peadliso_refactor.js`.
3. Publicar las 4 vistas `Views/Produccion/Produccion_{pvc,iny,corrugado,peadliso}.cshtml`
   (version `?v=20261113-13`).
4. Verificar en el sitio que el filtro inicial abre con la fecha del dia y que
   el guardado no duplica filas.

---

## Rollback

- Tablas: ver el bloque de rollback al final de `00_TM_BACKUP_PTM_2022_FINAL.sql`.
- Indices: ver el bloque de rollback en `04_TM_INDICES_UNICOS_PTM_2022_FINAL.sql`.
- SPs: restaurar la version anterior desde
  `SQL_MIGRACION/APLICADOS/PTM_2022_FINAL/MIGRACION_PTM_2022_FINAL.sql`
  (para lo que ahi exista) o desde el respaldo del DBA.
