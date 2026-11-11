# SQL_MIGRACION - Organización de scripts

Fecha de reorganización: 10/11/2026
Objetivo: evitar scripts duplicados, versiones viejas de SPs y carpetas con archivos “pendientes” mezclados con históricos.

## Estructura

```text
SQL_MIGRACION/
├── README.md                      # este archivo
├── MIGRACIONES_APLICADAS.md       # bitácora de migraciones
├── PENDIENTES/                    # SOLO scripts por aplicar (sin scripts = al día)
├── APLICADOS/
│   ├── COMUN/                     # scripts canónicos que se adaptan por schema
│   ├── DBADMIN/                   # aplicados en DBADMIN
│   │   ├── ALMACEN/
│   │   └── DEV/                   # scripts de SPs aplicados en desarrollo
│   ├── TEST_JUNIO_2026/           # aplicados en TEST_JUNIO_2026
│   └── PTM_2022_FINAL/            # aplicados en PTM_2022_FINAL
├── SEEDS/
│   └── DBADMIN/                   # seeds y datos de prueba
├── VERIFICACION/                  # consultas/scripts de validación
├── OBSOLETO/                      # scripts viejos que NO se deben ejecutar
└── HISTORIAL/                     # notas de sesión y pendientes resueltos
```

Carpetas de solo lectura (no mover):
- `SQL_ORIGEN_ALMACEN/`
- `SQL_ORIGEN_GENERAL/`
- `SQL_ORIGINALES/`

Historial de la migración base del 05/11/2026:
- `APLICADOS/README_MIGRACION_BASE_2026-11-05.txt`

## Reglas de ciclo de vida

1. Todo script nuevo nace en `PENDIENTES/`.
2. Se aplica primero en `TEST_JUNIO_2026`, se valida y luego en `PTM_2022_FINAL`.
3. Al aplicarse, se mueve a `APLICADOS/<schema>/`.
4. Se registra en `MIGRACIONES_APLICADAS.md`.
5. Si un script queda reemplazado, se mueve a `OBSOLETO/` con encabezado:
   ```sql
   -- OBSOLETO - NO EJECUTAR
   -- Reemplazado por: ...
   ```

## Regla importante: un solo origen de verdad por SP

- La versión **corregida y aplicada** del SP de rango de Preventivos es:
  ```text
  APLICADOS/COMUN/MIGRACION_PREVENTIVOS_SP_RANGO.sql
  ```
  - Prioriza las fechas reales de reprogramación aunque `ENVIAR_SIGUIENTE_MES = TRUE`.
  - Mantiene el no-colchón para reprogramaciones a +2 meses.
  - Toma una sola solicitud por `NUMERO_ORDEN` para evitar duplicados.
- El safeguard de solicitud está en:
  ```text
  APLICADOS/COMUN/MIGRACION_PREVENTIVOS_SP_SOLICITAR_REPROGRAMACION.sql
  ```
  - Si `P_ID_SOLICITUD` viene en 0/null, actualiza la última solicitud no rechazada; si no existe, inserta.
- La versión anterior del SP de rango está en `OBSOLETO/MIGRACION_PREVENTIVOS_SP_RANGO_VERSION_ANTERIOR.sql` y **no debe aplicarse**.
- Los scripts grandes `APLICADOS/TEST_JUNIO_2026/MIGRACION_TEST_JUNIO_2026.sql` y `APLICADOS/PTM_2022_FINAL/MIGRACION_PTM_2022_FINAL.sql` son **históricos** y contienen la versión vieja con colchón ±1 mes. **No volver a ejecutarlos completos** sin antes revisar ese punto.
- Las versiones viejas están marcadas en `OBSOLETO/`:
  - `MIGRACION_PREVENTIVOS_REPROGRAMACION_*`
  - `MIGRACION_PREVENTIVOS_SP_RANGO_VERSION_ANTERIOR.sql`
  - `SQL_APLICADOS_DEV_SpPdxMTTOObtenerMantenimientosPorRango.sql`

## Convención de nombres

Para scripts nuevos:
```text
YYYYMMDD_<schema>_<tipo>_<descripcion>.sql
```

Tipos sugeridos:
- `MIG` = migración de estructura/SP
- `SEED` = datos de prueba
- `VERIFY` = validación
- `FIX` = corrección puntual

Ejemplo:
```text
20261111_TEST_JUNIO_2026_MIG_motivo_baja_null.sql
```

## Estado actual

- Columna `TIEMPO_MUERTO_HERRAMENTALES`: aplicada/validada.
- `MOTIVO_BAJA` nullable: aplicada/validada.
- SP `SpPdxMTTOObtenerMantenimientosPorRango`: aplicado/validado (fechas reales, sin colchón y sin duplicados).
- Safeguard `SpPdxMTTOSolicitarReprogramacion`: aplicado/validado.
- `PENDIENTES/`: sin scripts SQL pendientes.
- La versión anterior del SP de rango está en `OBSOLETO/` y **no debe aplicarse**.

Ver detalle en `MIGRACIONES_APLICADAS.md`.
