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
