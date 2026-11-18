-- ============================================================================
-- 01 - Columnas de sincronizacion + backfill de ORIGEN / CLAVE_SYNC
-- Schema: PTM_2022_FINAL (HANA on-premise)
-- Fecha: 2026-11-17
--
-- Orden: ejecutar DESPUES de 00_TM_BACKUP.
--
-- PASO 1: ejecutar la consulta de verificacion de abajo.
--         Si las 4 tablas ya tienen las 5 columnas nuevas, saltar los ALTER.
--         Si falta FECHA_CREACION o FECHA_ACTUALIZACION, habilitar el bloque
--         comentado al final del paso 1.
-- PASO 2: ejecutar los ALTER TABLE (una sola vez).
-- PASO 3: ejecutar los UPDATE de backfill.
-- ============================================================================

SET SCHEMA "PTM_2022_FINAL";

-- ============================================================================
-- PASO 1 - VERIFICACION PREVIA
-- Debe listar 7 columnas por tabla (28 filas en total).
-- ============================================================================
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE_NAME
FROM SYS.TABLE_COLUMNS
WHERE SCHEMA_NAME = 'PTM_2022_FINAL'
  AND TABLE_NAME LIKE 'PdxMTTOTiemposMuertosProduccion%'
  AND TABLE_NAME NOT LIKE '%BAK%'
  AND COLUMN_NAME IN (
      'FECHA_CREACION', 'FECHA_ACTUALIZACION',
      'ORIGEN', 'CLAVE_SYNC', 'MODO',
      'FECHA_INICIO_RANGO', 'FECHA_FIN_RANGO'
  )
ORDER BY TABLE_NAME, "POSITION";

-- ============================================================================
-- PASO 2 - COLUMNAS NUEVAS (ejecutar una sola vez)
-- Si alguna ya existe, el ALTER falla; omitir esa tabla y continuar.
-- ============================================================================
ALTER TABLE "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC"
    ADD ("ORIGEN" NVARCHAR(20), "CLAVE_SYNC" NVARCHAR(300), "MODO" NVARCHAR(10),
         "FECHA_INICIO_RANGO" DATE, "FECHA_FIN_RANGO" DATE);

ALTER TABLE "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY"
    ADD ("ORIGEN" NVARCHAR(20), "CLAVE_SYNC" NVARCHAR(300), "MODO" NVARCHAR(10),
         "FECHA_INICIO_RANGO" DATE, "FECHA_FIN_RANGO" DATE);

ALTER TABLE "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionCorrugado"
    ADD ("ORIGEN" NVARCHAR(20), "CLAVE_SYNC" NVARCHAR(300), "MODO" NVARCHAR(10),
         "FECHA_INICIO_RANGO" DATE, "FECHA_FIN_RANGO" DATE);

ALTER TABLE "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPeadLiso"
    ADD ("ORIGEN" NVARCHAR(20), "CLAVE_SYNC" NVARCHAR(300), "MODO" NVARCHAR(10),
         "FECHA_INICIO_RANGO" DATE, "FECHA_FIN_RANGO" DATE);

-- ----------------------------------------------------------------------------
-- SOLO SI EL PASO 1 MOSTRO QUE FALTAN (habitualmente ya existen).
-- Descomentar la tabla que lo necesite.
-- ----------------------------------------------------------------------------
-- ALTER TABLE "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC"
--     ADD ("FECHA_CREACION" TIMESTAMP, "FECHA_ACTUALIZACION" TIMESTAMP);
-- ALTER TABLE "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY"
--     ADD ("FECHA_CREACION" TIMESTAMP, "FECHA_ACTUALIZACION" TIMESTAMP);
-- ALTER TABLE "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionCorrugado"
--     ADD ("FECHA_CREACION" TIMESTAMP, "FECHA_ACTUALIZACION" TIMESTAMP);
-- ALTER TABLE "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPeadLiso"
--     ADD ("FECHA_CREACION" TIMESTAMP, "FECHA_ACTUALIZACION" TIMESTAMP);

-- ============================================================================
-- PASO 3 - BACKFILL DE ORIGEN Y CLAVE_SYNC
--
-- Reglas (iguales a DBADMIN):
--   NWSCALE  -> tiene ID_PRODUCTO_TERMINADO
--   MANUAL   -> tiene OTMC / OTMP / ID_PARO
--   LEGACY   -> solo producto o turno (filas viejas de NWSCALE sin ID)
--   SIN_ORIGEN -> fila vacia (se revisa/elimina en el paso 03)
--
-- Clave dia/turno: N|PLANTA|DIA|FECHA|LINEA|PRODUCTO|TURNO
-- Clave manual:    M|PLANTA|FECHA|LINEA
-- Clave legacy:    N|PLANTA|DIA|FECHA|LINEA|PRODUCTO|TURNO
-- Clave sin origen:X|ID_REGISTRO
--
-- El WHERE evita sobrescribir claves ya calculadas (re-ejecutable).
-- ============================================================================
UPDATE "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC"
SET
    "ORIGEN" = CASE
        WHEN "ID_PRODUCTO_TERMINADO" IS NOT NULL THEN 'NWSCALE'
        WHEN LENGTH(COALESCE("OTMC",'')) > 2
          OR LENGTH(COALESCE("OTMP",'')) > 2
          OR LENGTH(COALESCE("ID_PARO",'')) > 0 THEN 'MANUAL'
        WHEN "PRODUCTO" IS NOT NULL OR "TURNO" IS NOT NULL THEN 'LEGACY'
        ELSE 'SIN_ORIGEN'
    END,
    "CLAVE_SYNC" = CASE
        WHEN "ID_PRODUCTO_TERMINADO" IS NOT NULL
            THEN 'N|' || COALESCE(TO_NVARCHAR("PLANTA"),'') || '|DIA|'
                 || COALESCE(TO_VARCHAR(CAST("FECHA" AS DATE),'YYYYMMDD'),'') || '|'
                 || COALESCE("LINEA",'') || '|' || COALESCE("PRODUCTO",'') || '|'
                 || COALESCE("TURNO",'')
        WHEN LENGTH(COALESCE("OTMC",'')) > 2
          OR LENGTH(COALESCE("OTMP",'')) > 2
          OR LENGTH(COALESCE("ID_PARO",'')) > 0
            THEN 'M|' || COALESCE(TO_NVARCHAR("PLANTA"),'') || '|'
                 || COALESCE(TO_VARCHAR(CAST("FECHA" AS DATE),'YYYYMMDD'),'') || '|'
                 || COALESCE("LINEA",'')
        WHEN "PRODUCTO" IS NOT NULL OR "TURNO" IS NOT NULL
            THEN 'N|' || COALESCE(TO_NVARCHAR("PLANTA"),'') || '|DIA|'
                 || COALESCE(TO_VARCHAR(CAST("FECHA" AS DATE),'YYYYMMDD'),'') || '|'
                 || COALESCE("LINEA",'') || '|' || COALESCE("PRODUCTO",'') || '|'
                 || COALESCE("TURNO",'')
        ELSE 'X|' || TO_VARCHAR("ID_REGISTRO")
    END
WHERE "CLAVE_SYNC" IS NULL OR "CLAVE_SYNC" = '';

UPDATE "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY"
SET
    "ORIGEN" = CASE
        WHEN "ID_PRODUCTO_TERMINADO" IS NOT NULL THEN 'NWSCALE'
        WHEN LENGTH(COALESCE("OTMC",'')) > 2
          OR LENGTH(COALESCE("OTMP",'')) > 2
          OR LENGTH(COALESCE("ID_PARO",'')) > 0 THEN 'MANUAL'
        WHEN "PRODUCTO" IS NOT NULL OR "TURNO" IS NOT NULL THEN 'LEGACY'
        ELSE 'SIN_ORIGEN'
    END,
    "CLAVE_SYNC" = CASE
        WHEN "ID_PRODUCTO_TERMINADO" IS NOT NULL
            THEN 'N|' || COALESCE(TO_NVARCHAR("PLANTA"),'') || '|DIA|'
                 || COALESCE(TO_VARCHAR(CAST("FECHA" AS DATE),'YYYYMMDD'),'') || '|'
                 || COALESCE("LINEA",'') || '|' || COALESCE("PRODUCTO",'') || '|'
                 || COALESCE("TURNO",'')
        WHEN LENGTH(COALESCE("OTMC",'')) > 2
          OR LENGTH(COALESCE("OTMP",'')) > 2
          OR LENGTH(COALESCE("ID_PARO",'')) > 0
            THEN 'M|' || COALESCE(TO_NVARCHAR("PLANTA"),'') || '|'
                 || COALESCE(TO_VARCHAR(CAST("FECHA" AS DATE),'YYYYMMDD'),'') || '|'
                 || COALESCE("LINEA",'')
        WHEN "PRODUCTO" IS NOT NULL OR "TURNO" IS NOT NULL
            THEN 'N|' || COALESCE(TO_NVARCHAR("PLANTA"),'') || '|DIA|'
                 || COALESCE(TO_VARCHAR(CAST("FECHA" AS DATE),'YYYYMMDD'),'') || '|'
                 || COALESCE("LINEA",'') || '|' || COALESCE("PRODUCTO",'') || '|'
                 || COALESCE("TURNO",'')
        ELSE 'X|' || TO_VARCHAR("ID_REGISTRO")
    END
WHERE "CLAVE_SYNC" IS NULL OR "CLAVE_SYNC" = '';

UPDATE "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionCorrugado"
SET
    "ORIGEN" = CASE
        WHEN "ID_PRODUCTO_TERMINADO" IS NOT NULL THEN 'NWSCALE'
        WHEN LENGTH(COALESCE("OTMC",'')) > 2
          OR LENGTH(COALESCE("OTMP",'')) > 2
          OR LENGTH(COALESCE("ID_PARO",'')) > 0 THEN 'MANUAL'
        WHEN "PRODUCTO" IS NOT NULL OR "TURNO" IS NOT NULL THEN 'LEGACY'
        ELSE 'SIN_ORIGEN'
    END,
    "CLAVE_SYNC" = CASE
        WHEN "ID_PRODUCTO_TERMINADO" IS NOT NULL
            THEN 'N|' || COALESCE(TO_NVARCHAR("PLANTA"),'') || '|DIA|'
                 || COALESCE(TO_VARCHAR(CAST("FECHA" AS DATE),'YYYYMMDD'),'') || '|'
                 || COALESCE("LINEA",'') || '|' || COALESCE("PRODUCTO",'') || '|'
                 || COALESCE("TURNO",'')
        WHEN LENGTH(COALESCE("OTMC",'')) > 2
          OR LENGTH(COALESCE("OTMP",'')) > 2
          OR LENGTH(COALESCE("ID_PARO",'')) > 0
            THEN 'M|' || COALESCE(TO_NVARCHAR("PLANTA"),'') || '|'
                 || COALESCE(TO_VARCHAR(CAST("FECHA" AS DATE),'YYYYMMDD'),'') || '|'
                 || COALESCE("LINEA",'')
        WHEN "PRODUCTO" IS NOT NULL OR "TURNO" IS NOT NULL
            THEN 'N|' || COALESCE(TO_NVARCHAR("PLANTA"),'') || '|DIA|'
                 || COALESCE(TO_VARCHAR(CAST("FECHA" AS DATE),'YYYYMMDD'),'') || '|'
                 || COALESCE("LINEA",'') || '|' || COALESCE("PRODUCTO",'') || '|'
                 || COALESCE("TURNO",'')
        ELSE 'X|' || TO_VARCHAR("ID_REGISTRO")
    END
WHERE "CLAVE_SYNC" IS NULL OR "CLAVE_SYNC" = '';

UPDATE "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPeadLiso"
SET
    "ORIGEN" = CASE
        WHEN "ID_PRODUCTO_TERMINADO" IS NOT NULL THEN 'NWSCALE'
        WHEN LENGTH(COALESCE("OTMC",'')) > 2
          OR LENGTH(COALESCE("OTMP",'')) > 2
          OR LENGTH(COALESCE("ID_PARO",'')) > 0 THEN 'MANUAL'
        WHEN "PRODUCTO" IS NOT NULL OR "TURNO" IS NOT NULL THEN 'LEGACY'
        ELSE 'SIN_ORIGEN'
    END,
    "CLAVE_SYNC" = CASE
        WHEN "ID_PRODUCTO_TERMINADO" IS NOT NULL
            THEN 'N|' || COALESCE(TO_NVARCHAR("PLANTA"),'') || '|DIA|'
                 || COALESCE(TO_VARCHAR(CAST("FECHA" AS DATE),'YYYYMMDD'),'') || '|'
                 || COALESCE("LINEA",'') || '|' || COALESCE("PRODUCTO",'') || '|'
                 || COALESCE("TURNO",'')
        WHEN LENGTH(COALESCE("OTMC",'')) > 2
          OR LENGTH(COALESCE("OTMP",'')) > 2
          OR LENGTH(COALESCE("ID_PARO",'')) > 0
            THEN 'M|' || COALESCE(TO_NVARCHAR("PLANTA"),'') || '|'
                 || COALESCE(TO_VARCHAR(CAST("FECHA" AS DATE),'YYYYMMDD'),'') || '|'
                 || COALESCE("LINEA",'')
        WHEN "PRODUCTO" IS NOT NULL OR "TURNO" IS NOT NULL
            THEN 'N|' || COALESCE(TO_NVARCHAR("PLANTA"),'') || '|DIA|'
                 || COALESCE(TO_VARCHAR(CAST("FECHA" AS DATE),'YYYYMMDD'),'') || '|'
                 || COALESCE("LINEA",'') || '|' || COALESCE("PRODUCTO",'') || '|'
                 || COALESCE("TURNO",'')
        ELSE 'X|' || TO_VARCHAR("ID_REGISTRO")
    END
WHERE "CLAVE_SYNC" IS NULL OR "CLAVE_SYNC" = '';

-- ============================================================================
-- VERIFICACION POST-BACKFILL: no debe haber CLAVE_SYNC nulas/vacias
-- ============================================================================
SELECT 'PVC' AS TABLA, COUNT(*) AS NULAS FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPVC"
WHERE "CLAVE_SYNC" IS NULL OR "CLAVE_SYNC" = ''
UNION ALL
SELECT 'INY', COUNT(*) FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY"
WHERE "CLAVE_SYNC" IS NULL OR "CLAVE_SYNC" = ''
UNION ALL
SELECT 'CORRUGADO', COUNT(*) FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionCorrugado"
WHERE "CLAVE_SYNC" IS NULL OR "CLAVE_SYNC" = ''
UNION ALL
SELECT 'PEADLISO', COUNT(*) FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionPeadLiso"
WHERE "CLAVE_SYNC" IS NULL OR "CLAVE_SYNC" = '';
