================================================================================
 EXPORT DE STORED PROCEDURES ON-PREMISE -> COMPARACION CONTRA HANA CLOUD
================================================================================

OBJETIVO
  Comparar uno por uno los stored procedures de on-premise contra los que ya
  existen en HANA Cloud (DBADMIN), para decidir:
    - Cuales son iguales.
    - Cuales cambiaron en cloud (fixes de Calendario/Preventivos/Correctivos).
    - Cuales faltan en cloud.
    - Cuales estan obsoletos.

COMO DEJAR EL EXPORT
  Opcion A (recomendada): un archivo .sql por SP, nombrado exactamente igual:
        SpPdxMTTOObtenerMantenimientosCorrectivos.sql
        SpPdxMTTOInsertarMC.sql
        ...
  Opcion B: un solo archivo .sql con todos los CREATE PROCEDURE.
  Opcion C: un .csv/.tsv con columnas:
        PROCEDURE_NAME, DEFINITION
     (salida de: SELECT PROCEDURE_NAME, DEFINITION FROM SYS.PROCEDURES
      WHERE SCHEMA_NAME='<SCHEMA>' AND PROCEDURE_NAME LIKE 'SpPdxMTTO%')

QUE REVISAR EN EL EXPORT
  - Que venga el CREATE PROCEDURE completo.
  - Que se vea el schema de origen (TEST_JUNIO_2026 / PTM_2022_FINAL / DBADMIN).
  - Si es posible, incluir tambien:
        SELECT * FROM SYS.OBJECT_DEPENDENCIES
        WHERE DEPENDENT_SCHEMA_NAME='<SCHEMA>'
          AND DEPENDENT_OBJECT_NAME LIKE 'SpPdxMTTO%';

RESULTADO
  Se generara un reporte con:
    - Diff por SP (igual / diferente / falta / obsoleto).
    - Dependencias que no existan en cloud.
    - Prioridad y orden de migracion.
================================================================================
