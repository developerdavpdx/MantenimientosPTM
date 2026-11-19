-- ============================================================================
--  SpPdxMTTOBuscarEmpleados - busqueda INSENSIBLE A ACENTOS
--  Schema destino: TEST_JUNIO_2026   (ON-PREMISE - usa ALTER PROCEDURE)
--  Fecha: 2026-11-19
--
--  IMPORTANTE: on-premise NO soporta CREATE OR REPLACE PROCEDURE.
--  El SP debe existir previamente. Solo se cambia el cuerpo (la logica de
--  busqueda); la firma de parametros es la misma.
--
--  Si el SP del servidor difiere de esta version, NO reemplazar el cuerpo
--  completo: portar solo la normalizacion de acentos (los bloques con
--  REPLACE(... UPPER(...) ...) y la variable V_QUERY).
--
--  Verificacion despues de aplicar:
--    CALL "TEST_JUNIO_2026"."SpPdxMTTOBuscarEmpleados"('VICTOR',1,NULL,NULL,NULL);
--    Debe devolver el mismo resultado que con 'VICTOR' acentuado.
-- ============================================================================
-- ============================================================================
--  SpPdxMTTOBuscarEmpleados  -  busqueda INSENSIBLE A ACENTOS
--  Schema: DBADMIN (HANA Cloud)  |  Fecha: 2026-11-19
--  Idempotente: se puede re-ejecutar (usa ALTER PROCEDURE).
--
--  Antes: "VICTOR" devolvia 0 filas porque HANA compara por code point.
--  Ahora: se normalizan acentos en AMBOS lados (columna y texto buscado).
-- ============================================================================

ALTER PROCEDURE "TEST_JUNIO_2026"."SpPdxMTTOBuscarEmpleados" (
    IN P_QUERY NVARCHAR(100),
    IN P_PLANTA INT,
    IN P_POSICION NVARCHAR(500),
    IN P_USUARIOWEB NVARCHAR(100),
    IN P_TIPOUSUARIO NVARCHAR(150)
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN

    DECLARE V_QUERY NVARCHAR(100);

    -- Texto buscado, en mayusculas y sin acentos
    SELECT
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
            UPPER(IFNULL(:P_QUERY, '')),
            'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U'),'Ñ','N')
    INTO V_QUERY FROM DUMMY;

    SELECT
        E."Code" AS "CODIGO_EMPLEADO",
        E."ExtEmpNo" AS "NOMINA",

        TRIM(
            IFNULL(E."firstName", '') || ' ' ||
            IFNULL(E."middleName", '') || ' ' ||
            IFNULL(E."lastName", '')
        ) AS "NOMBRE_COMPLETO",

        E."firstName"  AS "NOMBRE",
        E."middleName" AS "SEGUNDO_NOMBRE",
        E."lastName"   AS "APELLIDO",
        P."posID" AS "POSICIONID",
        IFNULL(P."name", CAST(E."position" AS NVARCHAR(50))) AS "PUESTO",

        IFNULL(D."Name", CAST(E."dept" AS NVARCHAR(50))) AS "DEPARTAMENTO",
        E."U_Pdx_Nw_Planta" AS PLANTA,
        E."U_Pbx_Nw_Usuario" AS USUARIOWEB,
        E."U_Pbx_Nw_TipoUsuario" AS TIPOUSUARIO
    FROM OHEM E

    LEFT JOIN OHPS P
        ON CAST(E."position" AS NVARCHAR(50)) = CAST(P."posID" AS NVARCHAR(50))

    LEFT JOIN OUDP D
        ON CAST(E."dept" AS NVARCHAR(50)) = CAST(D."Code" AS NVARCHAR(50))

    WHERE
        E."Active" = 'Y'
        AND E."U_Pdx_Nw_Planta" = :P_PLANTA
           AND (
            :P_QUERY IS NULL
            OR E."Code" LIKE '%' || :P_QUERY || '%'
            OR E."ExtEmpNo" LIKE '%' || :P_QUERY || '%'

            -- Nombre / segundo nombre / apellido, sin acentos
            OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                   UPPER(IFNULL(E."firstName", '')),
                   'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U'),'Ñ','N')
               LIKE '%' || :V_QUERY || '%'
            OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                   UPPER(IFNULL(E."middleName", '')),
                   'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U'),'Ñ','N')
               LIKE '%' || :V_QUERY || '%'
            OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                   UPPER(IFNULL(E."lastName", '')),
                   'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U'),'Ñ','N')
               LIKE '%' || :V_QUERY || '%'

            -- Nombre + apellido
            OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                   UPPER(IFNULL(E."firstName", '') || ' ' || IFNULL(E."lastName", '')),
                   'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U'),'Ñ','N')
               LIKE '%' || :V_QUERY || '%'

            -- Nombre completo
            OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                   UPPER(IFNULL(E."firstName", '') || ' ' ||
                         IFNULL(E."middleName", '') || ' ' ||
                         IFNULL(E."lastName", '')),
                   'Á','A'),'É','E'),'Í','I'),'Ó','O'),'Ú','U'),'Ñ','N')
               LIKE '%' || :V_QUERY || '%'
        )
        AND (
            :P_POSICION IS NULL
            OR ',' || :P_POSICION || ',' LIKE '%,' || CAST(P."posID" AS NVARCHAR) || ',%'
        )
        AND (:P_USUARIOWEB IS NULL OR E."U_Pbx_Nw_Usuario" = :P_USUARIOWEB)
        AND (:P_TIPOUSUARIO IS NULL OR E."U_Pbx_Nw_TipoUsuario" = :P_TIPOUSUARIO)
    ORDER BY E."lastName", E."firstName"

    LIMIT 200;

END;
