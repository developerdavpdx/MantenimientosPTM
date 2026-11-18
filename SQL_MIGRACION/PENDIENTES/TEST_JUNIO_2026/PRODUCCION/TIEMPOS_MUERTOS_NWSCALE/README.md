# Migracion TIEMPOS MUERTOS / NWSCALE - TEST_JUNIO_2026

Paquete listo para aplicar en el schema **TEST_JUNIO_2026** (HANA on-premise).
Es el mismo paquete que ya se aplico y valido en `PTM_2022_FINAL` el 2026-11-17,
adaptado a este schema y con respaldo fechado 2026-11-18.

---

## Orden de ejecucion (obligatorio)

| # | Script | Que hace |
|---|--------|----------|
| 00 | `00_TM_BACKUP_TEST_JUNIO_2026.sql` | Respaldo completo de las 4 tablas (`*_BAK_20261118`). **Primero.** |
| 01 | `01_TM_COLUMNAS_Y_CLAVES_TEST_JUNIO_2026.sql` | Columnas `ORIGEN`, `CLAVE_SYNC`, `MODO`, rango; backfill con clave `...|DIA|...`; token inicial. |
| 02 | `02_TM_REPORTE_DUPLICADOS_TEST_JUNIO_2026.sql` | **Solo lectura**: duplicados y filas vacias. Revisar antes del 03. |
| 03A | `03A_TM_PREVIEW_LIMPIEZA_TEST_JUNIO_2026.sql` | **Solo lectura**: que se conservaria y cuantas filas se borrarian. |
| 03 | `03_TM_LIMPIEZA_DUPLICADOS_TEST_JUNIO_2026.sql` | Conserva el `ID_REGISTRO` menor, fusiona `OTMC`/`OTMP`/`ID_PARO`, borra duplicados y vacias. |
| 04 | `04_TM_INDICES_UNICOS_TEST_JUNIO_2026.sql` | Crea los 4 indices `UX_TM_*_CLAVE_SYNC`. |
| 05 | `05_TM_SP_CONSULTA_TEST_JUNIO_2026.sql` | `ALTER` de los 4 SPs de consulta. |
| 06 | `06_TM_SP_GUARDADO_TEST_JUNIO_2026.sql` | `ALTER` de los 4 SPs de guardado. |
| 07 | `07_TM_VERIFICACION_TEST_JUNIO_2026.sql` | **Solo lectura**: verificacion final. |

**No ejecutar 03 sin revisar el reporte 02 y el preview 03A.**

---

## Antes de ejecutar

1. Confirmar que el respaldo del **00** se creo y tiene el mismo numero de filas
   que las tablas originales.
2. Ejecutar **01** y revisar que `03A` devuelva **0 filas sin CLAVE_SYNC**.
3. Revisar el **02** y el **03A**: duplicados y vacias esperados; `SIN_ORIGEN`
   sin horas capturadas.

Si `03A` muestra filas `SIN_ORIGEN` con horas, **no** ejecutar la seccion 5 del 03.

---

## Notas de ejecucion

- Ejecutar con `SET SCHEMA "TEST_JUNIO_2026";` (ya incluido en cada script).
- **`ALTER PROCEDURE` si permite cambiar la firma** (agregar `P_MODO`, rango y
  `P_TOKEN`). Validado en HANA.
- Los scripts 01, 04, 05 y 06 se ejecutan **una vez**. Si un `ALTER TABLE` o
  `CREATE INDEX` falla porque el objeto ya existe, ignorar y continuar.
- El servidor on-premise **no es alcanzable desde desarrollo**: ejecutar desde
  un equipo con acceso a `TEST_JUNIO_2026`.
- Si algun `ALTER PROCEDURE` fallara (p. ej. permisos), usar
  `CREATE OR REPLACE PROCEDURE` para ese SP; el cuerpo es el mismo.

---

## Decisiones de datos (script 03)

- **Duplicados:** se conserva la fila con el `ID_REGISTRO` **menor** por `CLAVE_SYNC`.
- **Listas:** antes de borrar se fusionan `OTMC`, `OTMP` e `ID_PARO` (valores
  distintos) en la fila que se conserva.
- **Horas/numeros:** se conservan los de la fila superviviente (no se suman).
- **Vacias:** las `SIN_ORIGEN` se eliminan al final.
- **Token inicial:** el paso 4 del 01 asigna `FECHA_ACTUALIZACION` a las filas
  nulas; sin eso, el primer guardado de esas filas no valida concurrencia.

---

## Claves

| Origen | Clave |
|--------|-------|
| NWSCALE rango | `N\|PLANTA\|RANGO\|FECHA_INI\|FECHA_FIN\|LINEA\|PRODUCTO` |
| NWSCALE dia | `N\|PLANTA\|DIA\|FECHA\|LINEA\|PRODUCTO\|TURNO` |
| Manual | `M\|PLANTA\|FECHA\|LINEA` |
| Sin origen | `X\|ID_REGISTRO` |

---

## Verificacion esperada (script 07)

- 7 columnas nuevas por tabla (28 filas).
- 4 indices `UX_TM_*_CLAVE_SYNC` de tipo `CPBTREE UNIQUE`.
- **0 duplicados** por `CLAVE_SYNC` en las 4 tablas.
- **0 filas** con `FECHA_ACTUALIZACION` nula.
- Los **4 SPs de guardado** con los 4 parametros nuevos.

Referencia del resultado en PTM_2022_FINAL (2026-11-17):
- 7 columnas por tabla, 4 indices unicos, 0 duplicados, 0 sin token.
- PVC 251 (190 NWSCALE / 17 MANUAL / 44 LEGACY), INY 10, Corrugado 87, PEAD Liso 197.

---

## Despues de aplicar

1. Publicar el DLL (`MantenimientosPTM.dll`).
2. Publicar los 5 JS:
   - `Global.js`
   - `produccion_pvc_refactor.js` (`?v=20261113-14`)
   - `produccion_iny_refactor.js` (`?v=20261113-15`)
   - `produccion_corrugado_refactor.js` (`?v=20261113-15`)
   - `produccion_peadliso_refactor.js` (`?v=20261113-15`)
3. Publicar las 4 vistas `Views/Produccion/Produccion_{pvc,iny,corrugado,peadliso}.cshtml`.
4. Publicar `Views/Produccion/ParosProduccion.cshtml` y
   `Scripts/paros_produccion_refactor.js?v=20261117-2`.
5. Prueba rapida en el portal:
   - Filtro inicial = dia actual.
   - Guardar dos veces en un dia (sin duplicar).
   - NWSCALE en **dia** y en **rango**.
   - Correctivo + preventivo + paro unificados en una sola fila.

---

## Nota para Corrugado / PEAD Liso en NWSCALE

Cuando esos procesos empiecen a llegar desde NWSCALE:

- El `Id_Linea` debe venir con los IDs de **planta**:
  - **Corrugado:** 17-22 y 56.
  - **PEAD Liso:** 23-29.
- Si viniera con IDs 1-8, chocaria con las lineas de **PVC** (1-16).
- Los productos deben existir en `SkuInfos` (SQL Server) con su `Planta` y
  `MinWeight`; el SP de NWSCALE hace `INNER JOIN` con ese catalogo.

---

## Rollback

- Tablas: bloque al final de `00_TM_BACKUP_TEST_JUNIO_2026.sql`.
- Indices: bloque al final de `04_TM_INDICES_UNICOS_TEST_JUNIO_2026.sql`.
- SPs: restaurar desde `APLICADOS/TEST_JUNIO_2026/MIGRACION_TEST_JUNIO_2026.sql`
  o desde el respaldo del DBA.
