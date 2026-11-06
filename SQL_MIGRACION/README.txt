================================================================================
 MIGRACION DE BASE DE DATOS - MantenimientosPTM
 Fecha: 05/11/2026
================================================================================

ESTADO: APLICADO Y VALIDADO (05/11/2026)
  [x] MIGRACION_TEST_JUNIO_2026.sql                -> APLICADO
  [x] MIGRACION_PTM_2022_FINAL.sql                 -> APLICADO
  [x] MIGRACION_CALENDARIO_FILTROS_*.sql           -> APLICADO
  [x] MIGRACION_PREVENTIVOS_REPROGRAMACION_*.sql   -> APLICADO
  Base y migraciones anteriores: aplicadas y validadas.

NUEVOS CAMBIOS (05/11/2026 - REGISTRO DE TIEMPOS MUERTOS)
  [x] Aplicado en DBADMIN (desarrollo)
  [ ] Pendiente en TEST_JUNIO_2026
  [ ] Pendiente en PTM_2022_FINAL
  Scripts:
    MIGRACION_COMENTARIOS_CORRUGADO_*.sql
    MIGRACION_ELIMINAR_TIEMPOS_MUERTOS_*.sql
    MIGRACION_NORMALIZAR_OT_TIEMPOS_MUERTOS_*.sql

ARCHIVOS
  MIGRACION_TEST_JUNIO_2026.sql   -> para el schema TEST_JUNIO_2026
  MIGRACION_PTM_2022_FINAL.sql    -> para el schema PTM_2022_FINAL

  MIGRACION_CALENDARIO_FILTROS_TEST_JUNIO_2026.sql
  MIGRACION_CALENDARIO_FILTROS_PTM_2022_FINAL.sql
      -> Incrementales (05/11/2026): actualizan
         SpPdxMTTOObtenerMantenimientosCompletados con los filtros nuevos
         del Calendario (Orden de Trabajo, Clasificacion y Nombre de Equipo)
         y FUE_REPROGRAMADO = 'SI' tambien para estatus NA.
         Ejecutar despues de la migracion principal.

  MIGRACION_PREVENTIVOS_REPROGRAMACION_TEST_JUNIO_2026.sql
  MIGRACION_PREVENTIVOS_REPROGRAMACION_PTM_2022_FINAL.sql
      -> Incrementales (05/11/2026): actualizan
         SpPdxMTTOObtenerMantenimientosPorRango para que use las fechas
         reales de reprogramacion (NA / Aceptada) en el filtro y periodo,
         y FUE_REPROGRAMADO = 'SI' tambien para estatus NA.

  MIGRACION_COMENTARIOS_CORRUGADO_TEST_JUNIO_2026.sql
  MIGRACION_COMENTARIOS_CORRUGADO_PTM_2022_FINAL.sql
      -> Incrementales (05/11/2026): actualizan
         SpPdxMTTOConsultarTiemposMuertosCorrugado para devolver COMENTARIOS
         (antes se guardaban pero no se mostraban al recargar).

  MIGRACION_ELIMINAR_TIEMPOS_MUERTOS_TEST_JUNIO_2026.sql
  MIGRACION_ELIMINAR_TIEMPOS_MUERTOS_PTM_2022_FINAL.sql
      -> Incrementales (05/11/2026): crean los SPs de eliminacion
         SpPdxMTTOEliminarTiemposMuertosPVC / PeadLiso / INY / Corrugado.
         Reciben P_ID_REGISTRO y eliminan el registro de la tabla.

  MIGRACION_NORMALIZAR_OT_TIEMPOS_MUERTOS_TEST_JUNIO_2026.sql
  MIGRACION_NORMALIZAR_OT_TIEMPOS_MUERTOS_PTM_2022_FINAL.sql
      -> Incrementales (05/11/2026): normalizan OTMC / OTMP / ID_PARO
         en las 4 tablas de tiempos muertos. Corrige valores JSON
         anidados/doblemente escapados que provocaban duplicados al
         editar la Fecha y guardar. Es idempotente.

QUE HACE CADA SCRIPT
  1) Agrega la columna TIEMPO_MUERTO_HERRAMENTALES a la bitacora de Corrugado
     (solo si no existe).
  2) Modifica los 11 stored procedures con ALTER PROCEDURE:
       SpPdxMTTOConsultaEquipos
       SpPdxMTTOInsertaEquipo
       SpPdxMTTOActualizaEquipo
       SpPdxMTTOObtenerMantenimientosPorRango
       SpPdxMTTOObtenerMantenimientosCorrectivos
       SpPdxMTTOMetricasOEE_PVC
       SpPdxMTTOMetricasOEE_PeadLiso
       SpPdxMTTOMetricasOEE_Corrugado
       SpPdxMTTOMetricasOEE_INY
       SpPdxMTTOGuardarTiemposMuertosCorrugado
       SpPdxMTTOConsultarTiemposMuertosCorrugado
  3) Al final ejecuta 2 consultas de validacion (SPs modificados y columna).

IMPORTANTE SOBRE ALTER PROCEDURE
  - Los 11 SPs DEBEN EXISTIR previamente en el schema destino.
  - Si alguno no existe, ALTER PROCEDURE fallara. En ese caso avisar para
    preparar un CREATE PROCEDURE solo para el que falte.

NO INCLUYE
  - Datos de prueba (OTs, bitacoras, firmas). Esos se quedan en DBADMIN.
  - Cambios de la app (van en el despliegue del sitio web).

ANTES DE EJECUTAR
  - Hacer respaldo/snapshot del schema destino.
  - Confirmar que el usuario tiene privilegios ALTER en el schema.
  - Confirmar el servidor/puerto/usuario de produccion.
  - Ejecutar PRIMERO en TEST_JUNIO_2026, validar, y despues en PTM_2022_FINAL.
  - La app debe apuntar el appSetting "Database" al schema que se esta migrando
    (Web.config). Si se publica con "DBADMIN", produccion apuntaria al schema
    de desarrollo.

COMO EJECUTAR (ejemplo con hdbsql)
  & "C:\Program Files\SAP\hdbclient\hdbsql.exe" `
      -n <servidor>:<puerto> -u <usuario> -p <password> -e -x -quiet `
      -I "MIGRACION_TEST_JUNIO_2026.sql"

  Despues, para produccion:
  & "C:\Program Files\SAP\hdbclient\hdbsql.exe" `
      -n <servidor>:<puerto> -u <usuario> -p <password> -e -x -quiet `
      -I "MIGRACION_PTM_2022_FINAL.sql"

QUE DEBE MOSTRAR AL FINAL
  - Una lista con los 11 procedimientos.
  - Una fila con:
        COLUMN_NAME = TIEMPO_MUERTO_HERRAMENTALES
        DATA_TYPE_NAME = DECIMAL
        LENGTH = 10
        SCALE = 2

SI FALLA EL BLOQUE DO BEGIN (ALTER TABLE)
  Algunas versiones de HANA no aceptan EXEC dentro de DO BEGIN. En ese caso
  ejecutar manualmente y una sola vez:

    ALTER TABLE "TEST_JUNIO_2026"."PdxMTTOTiemposMuertosProduccionCorrugado"
    ADD ("TIEMPO_MUERTO_HERRAMENTALES" DECIMAL(10,2) DEFAULT 0);

  (o el equivalente para PTM_2022_FINAL). Si la columna ya existe, HANA
  devolvera error de columna duplicada; se puede ignorar.

CODIFICACION Y CARACTERES
  - Los scripts estan en UTF-8 con BOM para que el editor muestre bien los
    acentos.
  - Se quitaron emojis y simbolos raros; se conservaron los acentos.
  - El filtro del area de INY usa LIKE 'INYECCI%' para no depender del acento
    de 'INYECCIÓN' y evitar problemas de codificacion en on-premise.
  - El codigo SQL es ASCII; los acentos solo estan en comentarios.

ORDEN DE DESPLIEGUE
  1) Base de datos (este script).            [COMPLETADO 05/11/2026]
  2) Sitio web (commit d42347a + docs).
  3) Cambiar Web.config: Database = schema destino.
  4) Probar login, preventivos, correctivos, bitacora y metricas.

NOTAS
  - El script es idempotente: se puede volver a ejecutar sin duplicar nada.
  - Los SPs usan SQL SECURITY INVOKER y nombres de tabla sin schema; al
    ejecutarse desde la app resuelven contra el schema de la conexion.
  - Los cambios ya fueron validados en DBADMIN (mismas definiciones).
  - No publicar la carpeta FirmasOTCorrectivo/ con las firmas de prueba.
================================================================================
