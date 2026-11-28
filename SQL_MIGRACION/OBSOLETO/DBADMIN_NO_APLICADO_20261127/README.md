# DBADMIN - NO APLICADO (2026-11-27)

Los 4 scripts del paquete del 2026-11-25 para `DBADMIN` **nunca se aplicaron**: el
trial de HANA Cloud quedó offline ("trial environment is temporarily offline") y el
schema de desarrollo dejó de usarse.

Se movieron aquí solo para conservarlos. Si algún día se retoma `DBADMIN`:

- Los equivalentes de TEST y PTM están aplicados y probados en
  `SQL_MIGRACION/APLICADOS/{TEST_JUNIO_2026,PTM_2022_FINAL}/`.
- Basta cambiar el schema de esos scripts (o de estos) y ejecutarlos en el orden:
  1. `CATALOGO_LINEA_9_INY`
  2. `NORMALIZAR_LINEAS_BITACORAS`
  3. `FIX_INY_HERRAMENTAL_MANUAL` (solo si el preview trae filas)
  4. `METRICAS_FILTRO_LINEA_NORMALIZADO`
- `DBADMIN` es ambiente de desarrollo: no afecta a TEST ni a producción.
