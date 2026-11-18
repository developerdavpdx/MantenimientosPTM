# Migracion TIEMPOS MUERTOS / NWSCALE — PTM_2022_FINAL

Paquete listo para aplicar en el schema **PTM_2022_FINAL** (HANA on-premise).
Replica el esquema que ya está probado en `DBADMIN` y validado en el portal
para los 4 procesos (PVC, INY, Corrugado, PEAD Liso).

---

## Orden de ejecución (obligatorio)

| # | Script | Qué hace |
|---|--------|----------|
| 00 | `00_TM_BACKUP_PTM_2022_FINAL.sql` | Respaldo completo de las 4 tablas (`*_BAK_20261117`). **Primero.** |
| 01 | `01_TM_COLUMNAS_Y_CLAVES_PTM_2022_FINAL.sql` | Columnas `ORIGEN`, `CLAVE_SYNC`, `MODO`, rango; backfill con clave `...|DIA|...`; token inicial. |
| 02 | `02_TM_REPORTE_DUPLICADOS_PTM_2022_FINAL.sql` | **Solo lectura**: duplicados y filas vacías. Revisar antes del 03. |
| 03A | `03A_TM_PREVIEW_LIMPIEZA_PTM_2022_FINAL.sql` | **Solo lectura**: qué se conservaría y cuántas filas se borrarían. |
| 03 | `03_TM_LIMPIEZA_DUPLICADOS_PTM_2022_FINAL.sql` | Conserva el `ID_REGISTRO` menor, fusiona `OTMC`/`OTMP`/`ID_PARO`, borra duplicados y vacías. |
| 04 | `04_TM_INDICES_UNICOS_PTM_2022_FINAL.sql` | Crea los 4 índices `UX_TM_*_CLAVE_SYNC`. |
| 05 | `05_TM_SP_CONSULTA_PTM_2022_FINAL.sql` | `ALTER` de los 4 SPs de consulta. |
| 06 | `06_TM_SP_GUARDADO_PTM_2022_FINAL.sql` | `ALTER` de los 4 SPs de guardado. |
| 07 | `07_TM_VERIFICACION_PTM_2022_FINAL.sql` | **Solo lectura**: verificación final. |

**No ejecutar 03 sin revisar el reporte 02.**

---

## Notas de ejecución

- Ejecutar con `SET SCHEMA "PTM_2022_FINAL";` (ya incluido en cada script).
- **`ALTER PROCEDURE` sí permite cambiar la firma** (agregar `P_MODO`, rango y
  `P_TOKEN`). Validado en HANA.
- Los scripts 01, 04, 05 y 06 se ejecutan **una vez**. Si un `ALTER TABLE` o
  `CREATE INDEX` falla porque el objeto ya existe, ignorar y continuar.
- El servidor on-premise **no es alcanzable desde desarrollo**: ejecutar desde
  un equipo con acceso a `PTM_2022_FINAL`.
- Si algún `ALTER PROCEDURE` fallara (p. ej. permisos), usar
  `CREATE OR REPLACE PROCEDURE` para ese SP; el cuerpo es el mismo.
- `FECHA_CREACION` y `FECHA_ACTUALIZACION` normalmente ya existen (el script 01
  las verifica y trae un bloque comentado por si faltan).

---

## Decisiones de datos (script 03)

- **Duplicados:** se conserva la fila con el `ID_REGISTRO` **menor** por `CLAVE_SYNC`.
- **Listas:** antes de borrar se fusionan `OTMC`, `OTMP` e `ID_PARO` (valores
  distintos) en la fila que se conserva.
- **Horas/números:** se conservan los de la fila superviviente (no se suman).
- **Vacías:** las `SIN_ORIGEN` se eliminan al final. Si el reporte 02 muestra
  alguna con horas, **no** ejecutar esa sección y revisarla a mano.
- **Token inicial:** el paso 4 del 01 asigna `FECHA_ACTUALIZACION` a las filas
  nulas; sin eso, el primer guardado de esas filas no valida concurrencia.

---

## Claves

| Origen | Clave |
|--------|-------|
| NWSCALE rango | `N\|PLANTA\|RANGO\|FECHA_INI\|FECHA_FIN\|LINEA\|PRODUCTO` |
| NWSCALE día | `N\|PLANTA\|DIA\|FECHA\|LINEA\|PRODUCTO\|TURNO` |
| Manual | `M\|PLANTA\|FECHA\|LINEA` |
| Sin origen | `X\|ID_REGISTRO` |

---

## Verificación esperada (script 07)

- 7 columnas nuevas por tabla (28 filas).
- 4 índices `UX_TM_*_CLAVE_SYNC` de tipo `CPBTREE UNIQUE`.
- **0 duplicados** por `CLAVE_SYNC` en las 4 tablas.
- **0 filas** con `FECHA_ACTUALIZACION` nula.
- Los **4 SPs de guardado** con los 4 parámetros nuevos.

---

## Después de aplicar

1. Publicar el DLL (`MantenimientosPTM.dll`).
2. Publicar los 5 JS:
   - `Global.js`
   - `produccion_pvc_refactor.js` (`?v=20261113-14`)
   - `produccion_iny_refactor.js` (`?v=20261113-15`)
   - `produccion_corrugado_refactor.js` (`?v=20261113-15`)
   - `produccion_peadliso_refactor.js` (`?v=20261113-15`)
3. Publicar las 4 vistas `Views/Produccion/Produccion_{pvc,iny,corrugado,peadliso}.cshtml`
   con sus versiones actualizadas.
4. Publicar `Views/Produccion/ParosProduccion.cshtml` y
   `Scripts/paros_produccion_refactor.js?v=20261117-2` (blindaje de área del paro).
5. Repetir en producción las pruebas del portal:
   - Filtro inicial = día actual.
   - Guardar dos veces en un día (sin duplicar).
   - NWSCALE en **día** y en **rango**.
   - Correctivo + preventivo + paro unificados en una sola fila.

---

## Nota para Corrugado / PEAD Liso en NWSCALE

Cuando esos procesos empiecen a llegar desde NWSCALE:

- El `Id_Linea` debe venir con los IDs de **planta**:
  - **Corrugado:** 17–22 y 56.
  - **PEAD Liso:** 23–29.
- Si viniera con IDs 1–8, chocaría con las líneas de **PVC** (1–16).
- Los productos deben existir en `SkuInfos` (SQL Server) con su `Planta` y
  `MinWeight`; el SP de NWSCALE hace `INNER JOIN` con ese catálogo.

---

## Rollback

- Tablas: bloque al final de `00_TM_BACKUP_PTM_2022_FINAL.sql`.
- Índices: bloque al final de `04_TM_INDICES_UNICOS_PTM_2022_FINAL.sql`.
- SPs: restaurar desde `APLICADOS/PTM_2022_FINAL/MIGRACION_PTM_2022_FINAL.sql`
  o desde el respaldo del DBA.
