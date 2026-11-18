================================================================================
 DEFINICIONES ORIGINALES DE STORED PROCEDURES (ANTES DE LOS CAMBIOS)
 Fecha de extraccion: 04/11/2026
 Origen: HANA Cloud / schema DBADMIN  (ambiente de desarrollo)
 Destino de comparacion: HANA on-premise / schema PTM_2022_FINAL
================================================================================

QUE SON ESTOS ARCHIVOS
- Son el texto EXACTO (CREATE PROCEDURE) que tenia cada stored en DBADMIN
  justo ANTES de aplicar los cambios de esta sesion.
- Sirven para compararlos contra la version que esta en el servidor on-premise
  (PTM_2022_FINAL) y confirmar si era la misma version antes de actualizar.

ARCHIVOS INCLUIDOS
  SpPdxMTTOMetricasOEE_PVC.sql
  SpPdxMTTOMetricasOEE_PeadLiso.sql
  SpPdxMTTOMetricasOEE_Corrugado.sql
  SpPdxMTTOMetricasOEE_INY.sql
  SpPdxMTTOInsertaEquipo.sql
  SpPdxMTTOActualizaEquipo.sql
  SpPdxMTTOObtenerMantenimientosPorRango.sql
  SpPdxMTTOObtenerMantenimientosCorrectivos.sql

QUE CAMBIO DESPUES EN CADA UNO (resumen)
  MetricasOEE_* (PVC/PeadLiso/Corrugado/INY):
      + P_CLASIFICACION NVARCHAR(50) DEFAULT NULL
      + filtro de clasificacion en CUMPLIMIENTO_PM_FILTRADO
      + CTE PARADAS_CLASIFICACION / MTTR_BASE para MTTR/MTBF/paradas
  InsertaEquipo / ActualizaEquipo:
      + P_CLASIFICACION y guardado/actualizacion de CLASIFICACION
  ObtenerMantenimientosPorRango / ObtenerMantenimientosCorrectivos:
      + P_FILTRO_CLASIFICACION y P_FILTRO_EQUIPO + condiciones en el WHERE

NO INCLUIDO
  SpPdxMTTOConsultaEquipos: lo modificaste tu directamente en DBADMIN (filtro por
  P_CLASIFICACION en el WHERE). No tenemos su version previa extraida; si la
  necesitas, se puede sacar de on-premise o de un respaldo.

COMO COMPARAR
  Opcion 1 (VS Code): abre el .sql local y el de on-premise y usa "Compare".
  Opcion 2 (PowerShell): compara linea por linea, por ejemplo:
      Compare-Object (Get-Content .\SpPdxMTTOMetricasOEE_PVC.sql) `
                     (Get-Content .\onprem_PVC.sql) | Format-Table
  Opcion 3 (HANA Studio): abre ambos procedimientos y compara el source.

NOTA
- Los archivos tienen CREATE PROCEDURE (como estaban); al aplicarlos se usaria
  CREATE OR REPLACE.
- Los comentarios pueden venir con acentos normalizados; lo funcional es identico.

================================================================================
 EXTRACCION 2026-11-18 - REGLA DE LAS 3 FIRMAS EN EL CUMPLIMIENTO DE PM
================================================================================

Fecha de extraccion: 18/11/2026
Origen: historial Git del repo (commit HEAD previo al cambio)
        git show HEAD:SQL_MIGRACION/APLICADOS/DBADMIN/DEV/<SP>.sql
        Esa era la definicion vigente en HANA Cloud / schema DBADMIN antes del
        ajuste (no se pudo volver a extraer de la instancia porque el cambio ya
        estaba aplicado en DBADMIN).

ARCHIVOS NUEVOS (no sustituyen a los del 04/11/2026)
  SpPdxMTTOMetricasOEE_PVC_ANTES_3_FIRMAS_20261118.sql
  SpPdxMTTOMetricasOEE_PeadLiso_ANTES_3_FIRMAS_20261118.sql
  SpPdxMTTOMetricasOEE_Corrugado_ANTES_3_FIRMAS_20261118.sql
  SpPdxMTTOMetricasOEE_INY_ANTES_3_FIRMAS_20261118.sql

  Los archivos SpPdxMTTOMetricasOEE_{PVC,PeadLiso,Corrugado,INY}.sql (04/11/2026)
  se conservan intactos: son la version aun anterior (sin P_CLASIFICACION ni
  MTTR/MTBF por clasificacion).

QUE CAMBIO DESPUES (resumen)
  - % Cumplimiento de PM:
      ANTES  : cumplido = ESTATUS = 4 (Cerrado, incluye "En proceso de firmas")
      DESPUES: cumplido = ESTATUS = 4 Y FIRMA_REALIZO = 'SI'
                           Y FIRMA_SUPERVISO = 'SI'
                           Y FIRMA_MANTENIMIENTO = 'SI'
  - Se agrega la columna calculada CUMPLIDO en CUMPLIMIENTO_PM_FILTRADO y un
    LEFT JOIN con PdxMTTOOrdenesTrabajoMP agrupado por ID_MANTENIMIENTO
    (MAX) para no inflar filas.
  - TOTAL_PM_PROGRAMADOS (denominador) NO cambia.
  - El resto de los KPIs (OEE, Disponibilidad, Rendimiento, Calidad, DT, MTTR,
    MTBF, paros) no se toca.

DONDE ESTA EL CAMBIO APLICADO
  SQL_MIGRACION/APLICADOS/DBADMIN/METRICAS/
      20261118_METRICAS_OEE_CUMPLIMIENTO_PM_3_FIRMAS_DBADMIN.sql
  SQL_MIGRACION/PENDIENTES/TEST_JUNIO_2026/METRICAS/
      20261118_METRICAS_OEE_CUMPLIMIENTO_PM_3_FIRMAS_TEST_JUNIO_2026.sql
  SQL_MIGRACION/PENDIENTES/PTM_2022_FINAL/METRICAS/
      20261118_METRICAS_OEE_CUMPLIMIENTO_PM_3_FIRMAS_PTM_2022_FINAL.sql

COMO USAR ESTOS RESPALDOS
  Cada archivo trae un encabezado con fecha/origen y despues la definicion
  exacta previa al cambio (inicia en la linea "CREATE OR REPLACE PROCEDURE").
  Para revertir en DBADMIN basta ejecutar ese CREATE OR REPLACE; para on-premise
  cambiar CREATE OR REPLACE PROCEDURE por ALTER PROCEDURE y ajustar el schema.


================================================================================
 EXTRACCION 2026-11-18 - BUSQUEDA DE ARTICULOS: REFACCIONES + INSUMOS
================================================================================

Fecha de extraccion: 18/11/2026
Origen: HANA Cloud / schema DBADMIN (SYS.PROCEDURES.DEFINITION), justo antes de
        aplicar el cambio.

ARCHIVO NUEVO
  SpPdxMTTOBuscarArticulos_ANTES_INSUMOS_20261118.sql

QUE CAMBIO DESPUES (resumen)
  - ANTES: el SP solo filtraba por un grupo exacto
      AND (:P_GRUPO_ART IS NULL OR A."ItmsGrpCod" = :P_GRUPO_ART)
    El portal (Mantenimientos Preventivos / Correctivos / Solicitud de
    refacciones) mandaba GrupoArticulos=104 (REFACCIONES), por lo que los
    INSUMOS (ItmsGrpCod = 102) no aparecian en la busqueda.

  - DESPUES: se agrega el parametro opcional
      IN P_GRUPOS_ART NVARCHAR(100) DEFAULT NULL
    que recibe una lista separada por comas ('102,104') y se resuelve con
    LIKE sobre el codigo de grupo (mismo patron ya usado en P_FABRICANTES).
    Si P_GRUPOS_ART viene NULL o vacio, el filtro se comporta exactamente
    igual que antes con P_GRUPO_ART.

  - Retrocompatible: cualquier llamada con 8 parametros sigue funcionando
    porque P_GRUPOS_ART tiene DEFAULT NULL.

DONDE ESTA EL CAMBIO APLICADO
  SQL_MIGRACION/APLICADOS/DBADMIN/PLANEACION/
      SpPdxMTTOBuscarArticulos_INSUMOS_20261118.sql
  SQL_MIGRACION/PENDIENTES/TEST_JUNIO_2026/PLANEACION/
      SpPdxMTTOBuscarArticulos_INSUMOS_Y_ORDERBY_20261118_ALTER.sql
  SQL_MIGRACION/PENDIENTES/PTM_2022_FINAL/PLANEACION/
      SpPdxMTTOBuscarArticulos_INSUMOS_Y_ORDERBY_20261118_ALTER.sql
      (el archivo ..._INSUMOS_20261118_ALTER.sql se renombro: ahora incluye
       tambien el cambio de ORDER BY para aplicarse en un solo pase)

COMO REVERTIR
  En DBADMIN: ejecutar el contenido de
  SpPdxMTTOBuscarArticulos_ANTES_INSUMOS_20261118.sql (ya trae
  CREATE PROCEDURE; usar CREATE OR REPLACE).
  En on-premise: mismo texto cambiando CREATE PROCEDURE por ALTER PROCEDURE
  y el schema.


================================================================================
 EXTRACCION 2026-11-18 - BUSQUEDA DE ARTICULOS: ORDER BY POR RELEVANCIA
================================================================================

Fecha de extraccion: 18/11/2026
Origen: HANA Cloud / schema DBADMIN (SYS.PROCEDURES.DEFINITION)

ARCHIVO NUEVO
  SpPdxMTTOBuscarArticulos_ANTES_ORDERBY_20261118.sql

ESTADO QUE GUARDA ESTE RESPALDO (importante)
  Es la version que YA tiene INSUMOS (parametro P_GRUPOS_ART y filtro
  LIKE '%,<grupo>,%') pero conserva el ORDER BY viejo (stock DESC primero).
  NO sustituye a SpPdxMTTOBuscarArticulos_ANTES_INSUMOS_20261118.sql, que es
  el estado aun anterior (sin INSUMOS). Los dos se conservan por separado.

POR QUE SE CAMBIO
  Con ORDER BY por stock, los INSUMOS (ItmsGrpCod = 102) tienen
  StockTotal = 0 mientras REFACCIONES (104) trae 12..1446, asi que caian
  siempre al final de los 671/3561 resultados y el LIMIT 400 los recortaba.
  Medido en DBADMIN (grupos 102+104, validFor='Y'):
      '12' -> 2 insumos, 0 visibles en el top 400
      'A'  -> 67 insumos, 0 visibles en el top 400

QUE CAMBIO (solo el bloque ORDER BY; LIMIT 400 intacto)
  - ANTES: stock disponible DESC -> prefijo ItemName -> prefijo ItemCode
           -> ItemName -> ItemCode
  - DESPUES: 1) coincidencia EXACTA de ItemCode o ItemName
             2) coincidencia por PREFIJO de ItemCode o ItemName
             3) intercalado por grupo (rank de stock dentro de su grupo)
             4) stock disponible DESC
             5) ItemName, ItemCode (desempate estable)

DONDE ESTA EL CAMBIO APLICADO
  SQL_MIGRACION/APLICADOS/DBADMIN/PLANEACION/
      SpPdxMTTOBuscarArticulos_ORDERBY_RELEVANCIA_20261118.sql
  SQL_MIGRACION/PENDIENTES/TEST_JUNIO_2026/PLANEACION/
      SpPdxMTTOBuscarArticulos_INSUMOS_Y_ORDERBY_20261118_ALTER.sql
      (incluye los DOS cambios: un solo pase en on-premise)
  SQL_MIGRACION/PENDIENTES/PTM_2022_FINAL/PLANEACION/
      SpPdxMTTOBuscarArticulos_INSUMOS_Y_ORDERBY_20261118_ALTER.sql

COMO REVERTIR SOLO EL ORDER BY
  En DBADMIN: ejecutar SpPdxMTTOBuscarArticulos_ANTES_ORDERBY_20261118.sql.
  Para revertir tambien INSUMOS: usar el _ANTES_INSUMOS_.

================================================================================