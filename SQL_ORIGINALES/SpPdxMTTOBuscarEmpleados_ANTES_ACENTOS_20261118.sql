-- ============================================================================
--  RESPALDO: SpPdxMTTOBuscarEmpleados  (ANTES del cambio de acentos)
--  Fecha de extraccion: 2026-11-19
--  Origen: HANA Cloud / schema DBADMIN  (SYS.PROCEDURES.DEFINITION)
--  Motivo del cambio posterior: la busqueda era sensible a acentos
--  ("VICTOR" no encontraba "VICTOR" con acento).
-- ============================================================================

CREATE PROCEDURE "DBADMIN"."SpPdxMTTOBuscarEmpleados" (
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
            OR UPPER(E."firstName") LIKE '%' || UPPER(:P_QUERY) || '%'
            OR UPPER(E."middleName") LIKE '%' || UPPER(:P_QUERY) || '%'
            OR UPPER(E."lastName") LIKE '%' || UPPER(:P_QUERY) || '%'
            OR UPPER(
                IFNULL(E."firstName", '') || ' ' ||
                IFNULL(E."lastName", '')
            ) LIKE '%' || UPPER(:P_QUERY) || '%'
            OR UPPER(
                IFNULL(E."firstName", '') || ' ' ||
                IFNULL(E."middleName", '') || ' ' ||
                IFNULL(E."lastName", '')
            ) LIKE '%' || UPPER(:P_QUERY) || '%'
        )
        AND (
            :P_POSICION IS NULL
            OR ',' || :P_POSICION || ',' LIKE '%,' || CAST(P."posID" AS NVARCHAR) || ',%'
        )
        AND (:P_USUARIOWEB IS NULL OR E."U_Pbx_Nw_Usuario" = :P_USUARIOWEB)
        AND (:P_TIPOUSUARIO IS NULL OR E."U_Pbx_Nw_TipoUsuario" = :P_TIPOUSUARIO)
    ORDER BY E."lastName", E."firstName"

    LIMIT 200;

END
