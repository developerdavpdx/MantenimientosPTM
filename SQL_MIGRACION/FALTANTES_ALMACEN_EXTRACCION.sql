-- ============================================================================
-- EXTRACCION DE OBJETOS FALTANTES - MODULO ALMACEN
-- Fecha: 09/11/2026
-- Ejecutar en ON-PREMISE (SAP HANA Studio / hdbsql / DBeaver)
--
-- INSTRUCCIONES:
--   1. Reemplaza <SCHEMA> por el schema de origen:
--        PTM_2022_FINAL  (produccion)
--        TEST_JUNIO_2026 (pruebas)
--        DBADMIN         (desarrollo)
--   2. Ejecuta cada bloque y exporta el resultado.
--   3. El bloque 7 verifica que ya exista en cloud (DBADMIN).
--
-- NOTA: Para el DDL completo de tablas (PK, indices, FKs, comments) usa
--       SAP HANA Studio -> Export, o hdbexport. Este script lista columnas
--       y dependencias para saber QUE extraer.
-- ============================================================================


-- ============================================================================
-- 1) DEFINICIONES DE LOS SPs FALTANTES
--    (9 de Almacen + 1 de Preventivos)
-- ============================================================================
SELECT PROCEDURE_NAME, DEFINITION
FROM SYS.PROCEDURES
WHERE SCHEMA_NAME = '<SCHEMA>'
  AND PROCEDURE_NAME IN (
      'SpPdxMTTOGetArticuloSalidaM',
      'SpPdxMTTOInsertMovimientoAlmacen',
      'SpPdxMTTOGetSeriesByName',
      'SpPdxMTTOInsertRechazoDevolucion',
      'SpPdxMTTOGetEstautsAuthSC',
      'SpPdxMTTOGetLineasOC',
      'SpPdxMTTOGetSolicitudesCompra_filtradas',
      'SpPdxMTTOGetDevolucionesPorOT',
      'SpPdxMTTOConsultaSolicitudesCompraMP',
      'SpPdxMTTOAceptarReprogramacion'
  )
ORDER BY PROCEDURE_NAME;


-- ============================================================================
-- 2) VARIANTES DE NOMBRE (por typos o nombres legacy)
--    Revisa si en on-premise existen con otro nombre.
-- ============================================================================
SELECT SCHEMA_NAME, PROCEDURE_NAME
FROM SYS.PROCEDURES
WHERE SCHEMA_NAME = '<SCHEMA>'
  AND (
        PROCEDURE_NAME LIKE '%ArticuloSalida%'
     OR PROCEDURE_NAME LIKE '%MovimientoAlmacen%'
     OR PROCEDURE_NAME LIKE '%Serie%'
     OR PROCEDURE_NAME LIKE '%SerieByName%'
     OR PROCEDURE_NAME LIKE '%Rechazo%'
     OR PROCEDURE_NAME LIKE '%Devolucion%'
     OR PROCEDURE_NAME LIKE '%Devoluciones%'
     OR PROCEDURE_NAME LIKE '%AuthSC%'
     OR PROCEDURE_NAME LIKE '%EstatusAuth%'
     OR PROCEDURE_NAME LIKE '%EstautsAuth%'
     OR PROCEDURE_NAME LIKE '%LineasOC%'
     OR PROCEDURE_NAME LIKE '%SolicitudesCompra%'
     OR PROCEDURE_NAME LIKE '%SolicitudCompra%'
  )
ORDER BY PROCEDURE_NAME;


-- ============================================================================
-- 3) DEPENDENCIAS DE LOS SPs FALTANTES
--    Esto te dice exactamente que tablas/vistas/procedimientos/secuencias
--    necesitas extraer ademas de los SPs.
-- ============================================================================
SELECT DISTINCT
       D.DEPENDENT_OBJECT_NAME AS SP,
       D.BASE_SCHEMA_NAME      AS OBJ_SCHEMA,
       D.BASE_OBJECT_NAME      AS OBJ_NAME,
       D.BASE_OBJECT_TYPE      AS OBJ_TYPE
FROM SYS.OBJECT_DEPENDENCIES D
WHERE D.DEPENDENT_SCHEMA_NAME = '<SCHEMA>'
  AND D.DEPENDENT_OBJECT_NAME IN (
      'SpPdxMTTOGetArticuloSalidaM',
      'SpPdxMTTOInsertMovimientoAlmacen',
      'SpPdxMTTOGetSeriesByName',
      'SpPdxMTTOInsertRechazoDevolucion',
      'SpPdxMTTOGetEstautsAuthSC',
      'SpPdxMTTOGetLineasOC',
      'SpPdxMTTOGetSolicitudesCompra_filtradas',
      'SpPdxMTTOGetDevolucionesPorOT',
      'SpPdxMTTOConsultaSolicitudesCompraMP',
      'SpPdxMTTOAceptarReprogramacion'
  )
ORDER BY D.DEPENDENT_OBJECT_NAME, D.BASE_OBJECT_TYPE, D.BASE_OBJECT_NAME;


-- ============================================================================
-- 4) COLUMNAS DE LAS TABLAS DEPENDIENTES
--    Sustituye la subconsulta si prefieres pegar la lista manualmente.
-- ============================================================================
SELECT C.TABLE_NAME, C.POSITION, C.COLUMN_NAME,
       C.DATA_TYPE_NAME, C.LENGTH, C.SCALE, C.IS_NULLABLE, C.DEFAULT_VALUE
FROM SYS.TABLE_COLUMNS C
WHERE C.SCHEMA_NAME = '<SCHEMA>'
  AND C.TABLE_NAME IN (
      SELECT DISTINCT D.BASE_OBJECT_NAME
      FROM SYS.OBJECT_DEPENDENCIES D
      WHERE D.DEPENDENT_SCHEMA_NAME = '<SCHEMA>'
        AND D.DEPENDENT_OBJECT_NAME IN (
            'SpPdxMTTOGetArticuloSalidaM',
            'SpPdxMTTOInsertMovimientoAlmacen',
            'SpPdxMTTOGetSeriesByName',
            'SpPdxMTTOInsertRechazoDevolucion',
            'SpPdxMTTOGetEstautsAuthSC',
            'SpPdxMTTOGetLineasOC',
            'SpPdxMTTOGetSolicitudesCompra_filtradas',
            'SpPdxMTTOGetDevolucionesPorOT',
            'SpPdxMTTOConsultaSolicitudesCompraMP',
            'SpPdxMTTOAceptarReprogramacion'
        )
        AND D.BASE_OBJECT_TYPE = 'TABLE'
  )
ORDER BY C.TABLE_NAME, C.POSITION;


-- ============================================================================
-- 5) SECUENCIAS, VISTAS Y SINONIMOS
-- ============================================================================
SELECT * FROM SYS.SEQUENCES WHERE SCHEMA_NAME = '<SCHEMA>' ORDER BY SEQUENCE_NAME;

SELECT VIEW_NAME, DEFINITION
FROM SYS.VIEWS
WHERE SCHEMA_NAME = '<SCHEMA>'
ORDER BY VIEW_NAME;

SELECT *
FROM SYS.SYNONYMS
WHERE SCHEMA_NAME = '<SCHEMA>'
ORDER BY SYNONYM_NAME;


-- ============================================================================
-- 6) INDICES / CONSTRAINTS DE LAS TABLAS DEPENDIENTES (para recrear DDL)
-- ============================================================================
SELECT * FROM SYS.INDEXES
WHERE SCHEMA_NAME = '<SCHEMA>'
  AND TABLE_NAME IN (
      SELECT DISTINCT D.BASE_OBJECT_NAME
      FROM SYS.OBJECT_DEPENDENCIES D
      WHERE D.DEPENDENT_SCHEMA_NAME = '<SCHEMA>'
        AND D.DEPENDENT_OBJECT_NAME IN (
            'SpPdxMTTOGetArticuloSalidaM',
            'SpPdxMTTOInsertMovimientoAlmacen',
            'SpPdxMTTOGetSeriesByName',
            'SpPdxMTTOInsertRechazoDevolucion',
            'SpPdxMTTOGetEstautsAuthSC',
            'SpPdxMTTOGetLineasOC',
            'SpPdxMTTOGetSolicitudesCompra_filtradas',
            'SpPdxMTTOGetDevolucionesPorOT',
            'SpPdxMTTOConsultaSolicitudesCompraMP',
            'SpPdxMTTOAceptarReprogramacion'
        )
        AND D.BASE_OBJECT_TYPE = 'TABLE'
  )
ORDER BY TABLE_NAME, INDEX_NAME;

SELECT * FROM SYS.CONSTRAINTS
WHERE SCHEMA_NAME = '<SCHEMA>'
  AND TABLE_NAME IN (
      SELECT DISTINCT D.BASE_OBJECT_NAME
      FROM SYS.OBJECT_DEPENDENCIES D
      WHERE D.DEPENDENT_SCHEMA_NAME = '<SCHEMA>'
        AND D.DEPENDENT_OBJECT_NAME IN (
            'SpPdxMTTOGetArticuloSalidaM',
            'SpPdxMTTOInsertMovimientoAlmacen',
            'SpPdxMTTOGetSeriesByName',
            'SpPdxMTTOInsertRechazoDevolucion',
            'SpPdxMTTOGetEstautsAuthSC',
            'SpPdxMTTOGetLineasOC',
            'SpPdxMTTOGetSolicitudesCompra_filtradas',
            'SpPdxMTTOGetDevolucionesPorOT',
            'SpPdxMTTOConsultaSolicitudesCompraMP',
            'SpPdxMTTOAceptarReprogramacion'
        )
        AND D.BASE_OBJECT_TYPE = 'TABLE'
  )
ORDER BY TABLE_NAME, CONSTRAINT_NAME;


-- ============================================================================
-- 7) VERIFICACION EN CLOUD (ejecutar en DBADMIN)
--    Muestra que ya existe y que sigue faltando.
-- ============================================================================
-- 7.1 SPs
SELECT PROCEDURE_NAME, 'EXISTE' AS ESTADO
FROM SYS.PROCEDURES
WHERE SCHEMA_NAME = 'DBADMIN'
  AND PROCEDURE_NAME IN (
      'SpPdxMTTOGetArticuloSalidaM',
      'SpPdxMTTOInsertMovimientoAlmacen',
      'SpPdxMTTOGetSeriesByName',
      'SpPdxMTTOInsertRechazoDevolucion',
      'SpPdxMTTOGetEstautsAuthSC',
      'SpPdxMTTOGetLineasOC',
      'SpPdxMTTOGetSolicitudesCompra_filtradas',
      'SpPdxMTTOGetDevolucionesPorOT',
      'SpPdxMTTOConsultaSolicitudesCompraMP',
      'SpPdxMTTOAceptarReprogramacion'
  )
ORDER BY PROCEDURE_NAME;

-- 7.2 Tablas (pega aqui la lista que salga del bloque 3)
SELECT TABLE_NAME, 'EXISTE' AS ESTADO
FROM SYS.TABLES
WHERE SCHEMA_NAME = 'DBADMIN'
  AND TABLE_NAME IN (
      -- Reemplaza por las tablas que devuelva la consulta 3
      'OITM','OITW','OITB','OCRD','OHEM','OIGN','IGN1','POR1',
      'OPCH','OHPS','OUDP','@PDX_USUARIOSCOMPRAS'
  )
ORDER BY TABLE_NAME;


-- ============================================================================
-- 8) LISTA RAPIDA DE TABLAS FALTANTES EN CLOUD (SAP B1 tipicas)
--    Solo orientativo; la lista real sale del bloque 3.
-- ============================================================================
SELECT T.TABLE_NAME
FROM (
    SELECT 'OITR' AS TABLE_NAME FROM DUMMY UNION ALL
    SELECT 'OITL' FROM DUMMY UNION ALL
    SELECT 'OIBT' FROM DUMMY UNION ALL
    SELECT 'OBTQ' FROM DUMMY UNION ALL
    SELECT 'OBBQ' FROM DUMMY UNION ALL
    SELECT 'OIVL' FROM DUMMY UNION ALL
    SELECT 'OWHS' FROM DUMMY UNION ALL
    SELECT 'OWTR' FROM DUMMY UNION ALL
    SELECT 'WTR1' FROM DUMMY UNION ALL
    SELECT 'OPOR' FROM DUMMY UNION ALL
    SELECT 'PCH1' FROM DUMMY UNION ALL
    SELECT 'OIGE' FROM DUMMY UNION ALL
    SELECT 'IGE1' FROM DUMMY UNION ALL
    SELECT 'OPDN' FROM DUMMY UNION ALL
    SELECT 'PDN1' FROM DUMMY UNION ALL
    SELECT 'RIN1' FROM DUMMY UNION ALL
    SELECT 'INV1' FROM DUMMY UNION ALL
    SELECT 'OUSR' FROM DUMMY UNION ALL
    SELECT 'OUBR' FROM DUMMY UNION ALL
    SELECT 'OBPL' FROM DUMMY UNION ALL
    SELECT 'OCTG' FROM DUMMY UNION ALL
    SELECT 'OUOM' FROM DUMMY UNION ALL
    SELECT 'HPS1' FROM DUMMY
) T
WHERE NOT EXISTS (
    SELECT 1 FROM SYS.TABLES S
    WHERE S.SCHEMA_NAME = 'DBADMIN' AND S.TABLE_NAME = T.TABLE_NAME
)
ORDER BY T.TABLE_NAME;
