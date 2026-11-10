================================================================================
 DEPENDENCIAS DE STORED PROCEDURES - MODULO ALMACEN
================================================================================

OBJETIVO
  Dejar aqui las definiciones (CREATE PROCEDURE) de los SPs que faltan, para
  que el agente extraiga las tablas/vistas/secuencias/sinonimos de los que
  dependen y genere la lista de objetos a migrar a DBADMIN.

COMO DEJAR LOS ARCHIVOS
  - Un archivo .sql por SP, nombrado EXACTAMENTE como el SP:
        SpPdxMTTOGetArticuloSalidaM.sql
        SpPdxMTTOInsertMovimientoAlmacen.sql
        SpPdxMTTOGetSeriesByName.sql
        SpPdxMTTOInsertRechazoDevolucion.sql
        SpPdxMTTOGetEstautsAuthSC.sql
        SpPdxMTTOGetLineasOC.sql
        SpPdxMTTOGetSolicitudesCompra_filtradas.sql
        SpPdxMTTOGetDevolucionesPorOT.sql
        SpPdxMTTOConsultaSolicitudesCompraMP.sql
        SpPdxMTTOAceptarReprogramacion.sql   (Preventivos, hallazgo extra)
  - Si es mas facil, un solo archivo .sql con bloques separados por:
        -- ==================== SP: NombreDelSP ====================
  - Incluir el CREATE PROCEDURE COMPLETO (cabecera + cuerpo).
  - Si se puede, agregar tambien la salida de:
        SELECT * FROM SYS.OBJECT_DEPENDENCIES
        WHERE DEPENDENT_SCHEMA_NAME = '<SCHEMA>'
          AND DEPENDENT_OBJECT_NAME IN (...);
    en un archivo aparte: dependencias.tsv (o .csv).

QUE SE EXTRAE
  - Tablas: FROM, JOIN, MERGE INTO, INSERT INTO, UPDATE, DELETE FROM.
  - Vistas y sinonimos referenciados.
  - Secuencias: NEXTVAL FOR / CURRVAL.
  - Llamadas a otros procedimientos/funciones (CALL / EXEC).
  - SQL dinamico (EXECUTE IMMEDIATE, CE_...) se marca para revision manual.

RESULTADO
  Se generara un reporte con:
  - Dependencia por SP.
  - Lista consolidada de tablas/vistas/secuencias.
  - Estado en DBADMIN (EXISTE / FALTA).
  - Orden sugerido de creacion.
================================================================================
