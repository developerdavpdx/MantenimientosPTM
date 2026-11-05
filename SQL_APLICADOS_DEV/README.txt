================================================================================
 DEFINICIONES DE STORED PROCEDURES APLICADAS EN DESARROLLO (DBADMIN)
 Fecha: 05/11/2026
================================================================================

ARCHIVOS INCLUIDOS
  SpPdxMTTOMetricasOEE_PVC.sql
  SpPdxMTTOMetricasOEE_PeadLiso.sql
  SpPdxMTTOMetricasOEE_Corrugado.sql
  SpPdxMTTOMetricasOEE_INY.sql
  SpPdxMTTOObtenerMantenimientosPorRango.sql

QUE CAMBIO EN LOS 4 SPs DE METRICAS
  - Se agrego el parametro P_CLASIFICACION.
  - HORAS_PARO se filtra por la columna de la clasificacion.
  - Se CORRIGIO el conteo N_OTMC para que tambien se filtre por clasificacion
    (antes el divisor de MTTR/MTBF contaba todas las OTMC de la fila aunque
    las horas ya estuvieran filtradas).

QUE CAMBIO EN SpPdxMTTOObtenerMantenimientosPorRango (PREVENTIVOS)
  - El filtro por POSICION del tecnico ya no usa el NOMBRE del equipo
    (antes: TEC HERR solo nombres con 'EXTRUSI'/'INYECCI').
  - Ahora usa la CLASIFICACION del equipo:
        TEC HERR (8,95,101)   -> CLASIFICACION = 'HERRAMENTALES'
        TEC MTTO (44,3,82,100) -> CLASIFICACION = 'MANTENIMIENTO'
        Otras posiciones       -> sin restriccion
  - Validado con Mario (posicion 95): ahora ve los equipos HERRAMENTALES
    del periodo y OTMP-001 (BCP03 A 1-4). Antes veia 0.

DETALLE COMPLETO Y PENDIENTES PARA PRODUCCION
  PENDIENTES_PRODUCTIVO_BD.txt  (secciones 1.4 y 1.6)

PRUEBA FUNCIONAL (05/11/2026, L1 PVC, bitacora guardada)
  Todas          -> 2 correctivos, 2.80 hr, MTTR 1.40, PM 2/2 (100%)
  MANTENIMIENTO  -> 1 correctivo,  1.28 hr, MTTR 1.28, PM 1/1 (100%)
  HERRAMENTALES  -> 1 correctivo,  1.52 hr, MTTR 1.52, PM 1/1 (100%)

================================================================================
