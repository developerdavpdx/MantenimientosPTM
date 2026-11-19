-- ============================================================================
-- SpPdxMTTOBuscarEmpleados - busqueda tolerante a ACENTOS y MAYUSCULAS
-- ============================================================================
-- ESTADO: PENDIENTE DE APLICAR (no se pudo aplicar el 18/11/2026 porque el
--         ambiente local no logro conectar a HANA Cloud: el proveedor SAP
--         falla al crear el motor SSL, mismo error que reporta el portal).
--
-- SCHEMA DESTINO: DBADMIN (HANA Cloud). Regla del proyecto:
--   - DBADMIN  -> CREATE OR REPLACE PROCEDURE
--   - TEST_JUNIO_2026 / PTM_2022_FINAL -> ALTER PROCEDURE (on-premise)
--
-- ¿ES OBLIGATORIO? NO. La correccion funcional ya esta resuelta en el codigo
-- (Models/GlobalCommands.cs > BusquedaEmpleadosAcentos): si la busqueda tal
-- cual devuelve 0 filas, el backend reintenta con variantes acentuadas
-- (VICTOR -> VICTOR, VICTOR con I acentuada, ...). Con este script aplicado,
-- el SP normaliza ambos lados y la primera busqueda ya encuentra el registro.
--
-- ¿POR QUE NO VIENE EL CUERPO COMPLETO?
-- En este entorno no fue posible leer SYS.PROCEDURES.DEFINITION. El SP debe
-- reescribirse a partir de su definicion actual (que se respalda en el paso 1),
-- sustituyendo UNICAMENTE las comparaciones de texto por la version
-- normalizada que se documenta en el paso 3.
-- ============================================================================


-- ============================================================================
-- PASO 1 - RESPALDO DE LA DEFINICION ACTUAL
-- Guardar el resultado en:
--   SQL_ORIGINALES/SpPdxMTTOBuscarEmpleados_<YYYYMMDD_HHMM>.sql
-- ============================================================================
SELECT DEFINITION
FROM SYS.PROCEDURES
WHERE SCHEMA_NAME = 'DBADMIN'
  AND PROCEDURE_NAME = 'SpPdxMTTOBuscarEmpleados';


-- ============================================================================
-- PASO 2 - ¿QUE HAY QUE CAMBIAR?
-- Buscar en el cuerpo las comparaciones contra P_QUERY. Tipicamente son de
-- la forma:
--
--   AND ( UPPER("firstName") LIKE '%' || UPPER(:P_QUERY) || '%'
--      OR UPPER("lastName")  LIKE '%' || UPPER(:P_QUERY) || '%'
--      OR "empID"            LIKE '%' || :P_QUERY || '%' )
--
-- Cada UPPER("campo") debe pasar a NORMALIZAR("campo") y
-- UPPER(:P_QUERY)     a NORMALIZAR(:P_QUERY).
-- ============================================================================


-- ============================================================================
-- PASO 3 - EXPRESION DE NORMALIZACION (equivalente a UPPER sin acentos)
-- HANA compara cadenas por code point, por eso "VICTOR" no encuentra
-- "VÍCTOR". Se reemplazan los acentos y luego se pasa a mayusculas.
-- Copiar tal cual dentro del SP (o crear la funcion escalar una sola vez).
-- ============================================================================
/*
CREATE OR REPLACE FUNCTION "DBADMIN"."F_NORMALIZAR_TEXTO" (IN P_TEXTO NVARCHAR(200))
RETURNS P_NORMALIZADO NVARCHAR(200)
LANGUAGE SQLSCRIPT
AS
BEGIN
    DECLARE T NVARCHAR(200) := :P_TEXTO;

    IF :T IS NULL THEN
        P_NORMALIZADO := NULL;
        RETURN;
    END IF;

    T := REPLACE(:T, 'á', 'a');
    T := REPLACE(:T, 'é', 'e');
    T := REPLACE(:T, 'í', 'i');
    T := REPLACE(:T, 'ó', 'o');
    T := REPLACE(:T, 'ú', 'u');
    T := REPLACE(:T, 'ü', 'u');
    T := REPLACE(:T, 'ñ', 'n');
    T := REPLACE(:T, 'Á', 'A');
    T := REPLACE(:T, 'É', 'E');
    T := REPLACE(:T, 'Í', 'I');
    T := REPLACE(:T, 'Ó', 'O');
    T := REPLACE(:T, 'Ú', 'U');
    T := REPLACE(:T, 'Ü', 'U');
    T := REPLACE(:T, 'Ñ', 'N');

    P_NORMALIZADO := UPPER(:T);
END;
*/

-- Si no se quiere crear la funcion, usar la expresion en linea:
/*
UPPER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
      REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
      "firstName",
      'á','a'),'é','e'),'í','i'),'ó','o'),'ú','u'),'ü','u'),'ñ','n'),
      'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U'),'Ü','U'),'Ñ','N'))
*/


-- ============================================================================
-- PASO 4 - APLICAR
-- 4.1 DBADMIN (HANA Cloud): CREATE OR REPLACE PROCEDURE "DBADMIN"."SpPdxMTTOBuscarEmpleados"
-- 4.2 TEST_JUNIO_2026 / PTM_2022_FINAL (on-premise): ALTER PROCEDURE "<schema>"."SpPdxMTTOBuscarEmpleados"
--     (en on-premise CREATE OR REPLACE no funciona)
-- ============================================================================


-- ============================================================================
-- PASO 5 - VERIFICACION
-- Debe devolver las mismas filas que la version acentuada.
-- ============================================================================
-- CALL "DBADMIN"."SpPdxMTTOBuscarEmpleados"('VICTOR',  1, NULL, NULL, NULL);
-- CALL "DBADMIN"."SpPdxMTTOBuscarEmpleados"('VÍCTOR',  1, NULL, NULL, NULL);
-- CALL "DBADMIN"."SpPdxMTTOBuscarEmpleados"('victor',  1, NULL, NULL, NULL);
-- CALL "DBADMIN"."SpPdxMTTOBuscarEmpleados"('AGUILERA',1, NULL, NULL, NULL);
-- CALL "DBADMIN"."SpPdxMTTOBuscarEmpleados"('JOSE',    1, NULL, NULL, NULL);
-- CALL "DBADMIN"."SpPdxMTTOBuscarEmpleados"('HERNÁNDEZ',1,NULL, NULL, NULL);
-- CALL "DBADMIN"."SpPdxMTTOBuscarEmpleados"('HERNANDEZ',1,NULL, NULL, NULL);
-- ============================================================================


-- ============================================================================
-- NOTA ON-PREMISE
-- Los reemplazos de acentos funcionan igual en HANA on-premise (REPLACE y
-- UPPER son estandar). Solo cambia la instruccion DDL (ALTER vs CREATE OR
-- REPLACE). No se requiere nada adicional.
-- ============================================================================
