-- ============================================================================
-- 2026-11-25 | Schema: DBADMIN | PENDIENTE DE APLICAR
-- Catalogo de lineas: falta "LÍNEA 9 INY" en PdxMTTOLineasxPlanta.
--
-- En la bitacora de INY hay 5 filas (12-25/11/2026) con LINEA = 'LÍNEA 9 INY',
-- pero esa linea no existe en el catalogo, asi que:
--   - no aparece en el combo de Linea del tablero de Metricas
--   - no se puede filtrar por ella
--
-- El alta se hace con el mismo SP que usa el portal
-- (Gestion de Equipos -> Gestionar Lineas de Produccion).
-- ============================================================================


-- ============================================================================
-- 1) VERIFICAR SI YA EXISTE (si devuelve filas, NO ejecutes el CALL)
-- ============================================================================
SELECT "ID_LINEA", "LINEA", TO_NVARCHAR("PLANTA") AS PLANTA, "PRODUCCION"
FROM "DBADMIN"."PdxMTTOLineasxPlanta"
WHERE UPPER(TRIM("LINEA")) = 'LÍNEA 9 INY';


-- ============================================================================
-- 2) ALTA (descomentar solo si la consulta anterior devolvio 0 filas)
--    Parametros: planta, nombre de la linea, id de area (0 = sin area)
-- ============================================================================
-- CALL "DBADMIN"."SpPdxMTTOInsertarLinea"(2, 'LÍNEA 9 INY', 0);


-- ============================================================================
-- 3) VERIFICAR DESPUES
-- ============================================================================
SELECT "ID_LINEA", "LINEA", TO_NVARCHAR("PLANTA") AS PLANTA, "PRODUCCION"
FROM "DBADMIN"."PdxMTTOLineasxPlanta"
WHERE UPPER(TRIM("LINEA")) = 'LÍNEA 9 INY';
