# Contexto de sesión — MantenimientosPTM

**Fecha:** 05/11/2026  
**Repositorio:** `C:\Paradox\DEVELOPMENT\MantenimientosPTM`

---

## 1. Estado actual

- **Desarrollo:** HANA Cloud, schema `DBADMIN`. El `Web.config` activo apunta a `DBADMIN`.
- **Producción/Test destino:** `TEST_JUNIO_2026` y `PTM_2022_FINAL`.
- **Migración BD aplicada (05/11/2026):** los scripts `MIGRACION_TEST_JUNIO_2026.sql` y `MIGRACION_PTM_2022_FINAL.sql` ya se ejecutaron en ambos schemas. Los 11 SPs y la columna `TIEMPO_MUERTO_HERRAMENTALES` de Corrugado quedaron validados por el usuario.
- **Datos de prueba:** se quedan en `DBADMIN` (NO migrar).
- **Firmas de prueba:** fuera del índice de Git (`git rm --cached`), siguen en disco y `.gitignore` las excluye.
- **Equipo BCP03:** restaurado a `FECHA_INICIO_MANT = 2026-01-01`.

## 2. Prueba funcional completa (DBADMIN)

| OT | Tipo | Equipo | Clasificación | Técnico | Máq. detenida | Duración |
|---|---|---|---|---|---|---|
| OTMP-001 | Preventivo | BCP03 A 1-4 | HERRAMENTALES | Mario (7756) | — | 1.15 h |
| OTMP-002 | Preventivo | L1 PVC- Impresora | MANTENIMIENTO | Víctor (2644) | — | 0.90 h |
| OTMC-001 | Correctivo | L1 PVC- Extrusor Linea | MANTENIMIENTO | Víctor (2644) | Sí | 1.47 h |
| OTMC-002 | Correctivo | BCP03 A 1-4 | HERRAMENTALES | Mario (7756) | Sí | 1.87 h |

**Bitácora PVC guardada (05/11/2026, LÍNEA 1 PVC):**

| ID | OTMP | OTMC | Preventivo | Mtto. Correctivos | Herramental |
|---|---|---|---|---|---|
| 1 | — | OTMC-001 | 0.00 | **1.28** | 0.00 |
| 2 | — | OTMC-002 | 0.00 | 0.00 | **1.52** |
| 3 | OTMP-001 + OTMP-002 | — | **2.05** | 0.00 | 0.00 |

**Métricas (LÍNEA 1 PVC, noviembre 2026):**

| Filtro | Correctivos | Horas paro | MTTR | Cumplimiento PM |
|---|---|---|---|---|
| Todas | 2 | 2.80 h | 1.40 h | 2/2 = 100 % |
| MANTENIMIENTO | 1 | 1.28 h | 1.28 h | 1/1 = 100 % |
| HERRAMENTALES | 1 | 1.52 h | 1.52 h | 1/1 = 100 % |

> MTBF sale negativo en la prueba porque `TIEMPO_DISPONIBLE = 0` (no hay horas de producción capturadas). Con datos reales será positivo.

## 3. Cambios aplicados en DBADMIN

### Stored procedures (11)

- `SpPdxMTTOConsultaEquipos` — filtro por `P_CLASIFICACION`.
- `SpPdxMTTOInsertaEquipo` — guarda `CLASIFICACION`.
- `SpPdxMTTOActualizaEquipo` — actualiza `CLASIFICACION`.
- `SpPdxMTTOObtenerMantenimientosPorRango` — filtros de clasificación/equipo y **filtro por posición por clasificación**:
  - TEC HERR (8, 95, 101) → `CLASIFICACION = 'HERRAMENTALES'`
  - TEC MTTO (44, 3, 82, 100) → `CLASIFICACION = 'MANTENIMIENTO'`
  - Otras posiciones → sin restricción
- `SpPdxMTTOObtenerMantenimientosCorrectivos` — filtros de clasificación/equipo + `CLASIFICACION` en el result.
- `SpPdxMTTOMetricasOEE_PVC / _PeadLiso / _Corrugado / _INY`:
  - `P_CLASIFICACION`.
  - `HORAS_PARO` según columna de la clasificación.
  - **Fix `N_OTMC`**: el divisor de MTTR/MTBF también se filtra por clasificación.
- `SpPdxMTTOGuardarTiemposMuertosCorrugado` / `SpPdxMTTOConsultarTiemposMuertosCorrugado` — columna `TIEMPO_MUERTO_HERRAMENTALES`.

### Scripts de migración

- `SQL_MIGRACION/MIGRACION_TEST_JUNIO_2026.sql` — **aplicado en `TEST_JUNIO_2026`**.
- `SQL_MIGRACION/MIGRACION_PTM_2022_FINAL.sql` — **aplicado en `PTM_2022_FINAL`**.
- Usan **`ALTER PROCEDURE`** (los 11 SPs deben existir previamente).
- Incluyen `ALTER TABLE` condicional para la columna de Corrugado.
- UTF-8 con BOM, sin emojis, con acentos en comentarios.
- El filtro de INY usa `LIKE 'INYECCI%'` para evitar depender del acento de `INYECCIÓN`.

## 4. Estado de la migración y pendientes

**Hecho (05/11/2026):**

- [x] Migración ejecutada en `TEST_JUNIO_2026`.
- [x] Migración ejecutada en `PTM_2022_FINAL`.
- [x] Validación de los 11 SPs y de la columna `TIEMPO_MUERTO_HERRAMENTALES` (confirmada por el usuario).

**Pendiente para productivo (solo app / despliegue):**

1. Respaldo/snapshot de `PTM_2022_FINAL` antes de publicar (recomendado).
2. Publicar la app (commits `d42347a` + `20f1dfe` + docs).
3. Aplicar la migración incremental del Calendario en TEST/PTM (`SQL_MIGRACION/MIGRACION_CALENDARIO_FILTROS_*.sql`).
4. Aplicar la migración incremental de reprogramación de preventivos (`SQL_MIGRACION/MIGRACION_PREVENTIVOS_REPROGRAMACION_*.sql`).
5. Cambiar `Web.config`:
   - `Database` y `SapDatabase` = `PTM_2022_FINAL`.
   - `HANAConnection` → `10.161.60.152:30015`.
   - `SQLConnection` → `SAP-PLASTIC-INT\MSSQLPTM`.
6. Verificar el sello de ambiente en Login: `SelloProduccion.png` para productivo.
7. **No publicar** `FirmasOTCorrectivo/` con las firmas de prueba.
8. Validar login, preventivos, correctivos, calendario, bitácora y métricas.

**Orden:** la BD ya está migrada; solo falta el despliegue de la app. La app nueva espera los parámetros/columna nuevos.

## 5. Archivos clave

- `PENDIENTES_PRODUCTIVO_BD.txt` — checklist de migración.
- `RESUMEN_AJUSTES.txt` — resumen de cambios funcionales.
- `SQL_MIGRACION/` — scripts ejecutables + README.
- `SQL_APLICADOS_DEV/` — definiciones aplicadas en DBADMIN (referencia).
- `SQL_ORIGINALES/` — versiones originales para comparar.
- `.codegraph/` — índice de CodeGraph del proyecto.

## 6. Cómo retomar en una nueva sesión

1. Abrir el repo en `C:\Paradox\DEVELOPMENT\MantenimientosPTM`.
2. Leer este archivo y `PENDIENTES_PRODUCTIVO_BD.txt`.
3. Usar CodeGraph (`codegraph_explore` o `codegraph explore`) para mapear código antes de editar.
4. No truncar tablas ni tocar producción sin confirmar.
5. Recordar: datos de prueba en DBADMIN; la migración a TEST/PRODUCCIÓN ya está aplicada y solo falta el despliegue de la app.
