-- ============================================================================
-- EXTRACCION DE LAS 6 TABLAS FALTANTES - MODULO ALMACEN
-- Fecha: 10/11/2026
-- Ejecutar en ON-PREMISE (SAP HANA Studio / hdbsql / DBeaver)
--
-- INSTRUCCIONES:
--   1. Reemplaza <SCHEMA> por el schema real:
--        TEST_JUNIO_2026  (pruebas)
--        PTM_2022_FINAL   (produccion)
--        DBADMIN          (desarrollo)
--   2. Ejecuta cada bloque y exporta el resultado.
--   3. Para el DDL completo usa SAP HANA Studio -> Export, o hdbexport.
-- ============================================================================


-- ============================================================================
-- 1) EXISTENCIA Y TIPO DE LAS 6 TABLAS
-- ============================================================================
SELECT 'TABLE' AS TIPO, TABLE_NAME AS NOMBRE
FROM SYS.TABLES
WHERE SCHEMA_NAME = '<SCHEMA>'
  AND TABLE_NAME IN (
      'PdxMTTORechazoDevolucion',
      'PdxMTTOMPSolicitudCompraMP',
      'OPOR',
      'OBTN',
      'OBTQ',
      'NNM1'
  )
UNION ALL
SELECT 'VIEW', VIEW_NAME
FROM SYS.VIEWS
WHERE SCHEMA_NAME = '<SCHEMA>'
  AND VIEW_NAME IN (
      'PdxMTTORechazoDevolucion',
      'PdxMTTOMPSolicitudCompraMP',
      'OPOR',
      'OBTN',
      'OBTQ',
      'NNM1'
  )
UNION ALL
SELECT 'SYNONYM', SYNONYM_NAME
FROM SYS.SYNONYMS
WHERE SCHEMA_NAME = '<SCHEMA>'
  AND SYNONYM_NAME IN (
      'PdxMTTORechazoDevolucion',
      'PdxMTTOMPSolicitudCompraMP',
      'OPOR',
      'OBTN',
      'OBTQ',
      'NNM1'
  )
ORDER BY TIPO, NOMBRE;


-- ============================================================================
-- 2) COLUMNAS DE LAS 6 TABLAS
--    GENERATION_TYPE indica si la columna es IDENTITY.
-- ============================================================================
SELECT TABLE_NAME, POSITION, COLUMN_NAME, DATA_TYPE_NAME,
       LENGTH, SCALE, IS_NULLABLE, DEFAULT_VALUE, GENERATION_TYPE
FROM SYS.TABLE_COLUMNS
WHERE SCHEMA_NAME = '<SCHEMA>'
  AND TABLE_NAME IN (
      'PdxMTTORechazoDevolucion',
      'PdxMTTOMPSolicitudCompraMP',
      'OPOR',
      'OBTN',
      'OBTQ',
      'NNM1'
  )
ORDER BY TABLE_NAME, POSITION;


-- ============================================================================
-- 3) INDICES DE LAS 6 TABLAS
-- ============================================================================
SELECT SCHEMA_NAME, TABLE_NAME, INDEX_NAME, INDEX_TYPE, CONSTRAINT
FROM SYS.INDEXES
WHERE SCHEMA_NAME = '<SCHEMA>'
  AND TABLE_NAME IN (
      'PdxMTTORechazoDevolucion',
      'PdxMTTOMPSolicitudCompraMP',
      'OPOR',
      'OBTN',
      'OBTQ',
      'NNM1'
  )
ORDER BY TABLE_NAME, INDEX_NAME;


-- ============================================================================
-- 4) CONSTRAINTS (PK / UNIQUE / CHECK) DE LAS 6 TABLAS
-- ============================================================================
SELECT SCHEMA_NAME, TABLE_NAME, COLUMN_NAME, POSITION,
       CONSTRAINT_NAME, IS_PRIMARY_KEY, IS_UNIQUE_KEY, CHECK_CONDITION
FROM SYS.CONSTRAINTS
WHERE SCHEMA_NAME = '<SCHEMA>'
  AND TABLE_NAME IN (
      'PdxMTTORechazoDevolucion',
      'PdxMTTOMPSolicitudCompraMP',
      'OPOR',
      'OBTN',
      'OBTQ',
      'NNM1'
  )
ORDER BY TABLE_NAME, CONSTRAINT_NAME, POSITION;


-- ============================================================================
-- 5) CONFIRMAR EL NOMBRE REAL DE LA TABLA DE SOLICITUDES DE COMPRA
--    Cloud usa  PdxMTTOMPSolicitudCompra
--    Los SPs nuevos usan  PdxMTTOMPSolicitudCompraMP
-- ============================================================================
SELECT TABLE_NAME
FROM SYS.TABLES
WHERE SCHEMA_NAME = '<SCHEMA>'
  AND TABLE_NAME LIKE 'PdxMTTOMPSolicitudCompra%'
ORDER BY TABLE_NAME;


-- ============================================================================
-- 6) COMPARAR COLUMNAS ENTRE PdxMTTOMPSolicitudCompra y ...MP (si existen)
--    Sirve para saber si es la misma tabla con otro nombre o una distinta.
-- ============================================================================
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE_NAME, LENGTH, SCALE, IS_NULLABLE
FROM SYS.TABLE_COLUMNS
WHERE SCHEMA_NAME = '<SCHEMA>'
  AND TABLE_NAME IN ('PdxMTTOMPSolicitudCompra','PdxMTTOMPSolicitudCompraMP')
ORDER BY COLUMN_NAME, TABLE_NAME;


-- ============================================================================
-- 7) VERIFICACION EN CLOUD (ejecutar en DBADMIN)
-- ============================================================================
SELECT 'TABLE' AS TIPO, TABLE_NAME AS NOMBRE
FROM SYS.TABLES
WHERE SCHEMA_NAME = 'DBADMIN'
  AND TABLE_NAME IN (
      'PdxMTTORechazoDevolucion',
      'PdxMTTOMPSolicitudCompraMP',
      'OPOR',
      'OBTN',
      'OBTQ',
      'NNM1'
  )
UNION ALL
SELECT 'VIEW', VIEW_NAME
FROM SYS.VIEWS
WHERE SCHEMA_NAME = 'DBADMIN'
  AND VIEW_NAME IN (
      'PdxMTTORechazoDevolucion',
      'PdxMTTOMPSolicitudCompraMP',
      'OPOR',
      'OBTN',
      'OBTQ',
      'NNM1'
  )
UNION ALL
SELECT 'SYNONYM', SYNONYM_NAME
FROM SYS.SYNONYMS
WHERE SCHEMA_NAME = 'DBADMIN'
  AND SYNONYM_NAME IN (
      'PdxMTTORechazoDevolucion',
      'PdxMTTOMPSolicitudCompraMP',
      'OPOR',
      'OBTN',
      'OBTQ',
      'NNM1'
  )
ORDER BY TIPO, NOMBRE;
