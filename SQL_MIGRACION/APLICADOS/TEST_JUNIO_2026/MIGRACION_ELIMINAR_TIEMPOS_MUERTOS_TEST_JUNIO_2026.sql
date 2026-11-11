-- Migracion incremental: eliminacion de registros de tiempos muertos (4 procesos)
-- Schema destino: TEST_JUNIO_2026
-- Fecha: 05/11/2026
-- Crea: SpPdxMTTOEliminarTiemposMuertosPVC / PeadLiso / INY / Corrugado

CREATE OR REPLACE PROCEDURE "TEST_JUNIO_2026"."SpPdxMTTOEliminarTiemposMuertosCorrugado" (
    IN P_ID_REGISTRO INTEGER
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN
    DECLARE V_EXISTE INTEGER;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SELECT 'ERROR' AS "ESTATUS", ::SQL_ERROR_MESSAGE AS "MENSAJE" FROM DUMMY;
    END;

    SELECT COUNT(*) INTO V_EXISTE
    FROM "PdxMTTOTiemposMuertosProduccionCorrugado"
    WHERE "ID_REGISTRO" = :P_ID_REGISTRO;

    IF :V_EXISTE = 0 THEN
        SELECT 'ERROR' AS "ESTATUS",
               'No existe el registro con ID ' || :P_ID_REGISTRO AS "MENSAJE"
        FROM DUMMY;
        RETURN;
    END IF;

    DELETE FROM "PdxMTTOTiemposMuertosProduccionCorrugado"
    WHERE "ID_REGISTRO" = :P_ID_REGISTRO;

    SELECT 'OK' AS "ESTATUS",
           'Registro eliminado correctamente.' AS "MENSAJE"
    FROM DUMMY;
END;


CREATE OR REPLACE PROCEDURE "TEST_JUNIO_2026"."SpPdxMTTOEliminarTiemposMuertosINY" (
    IN P_ID_REGISTRO INTEGER
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN
    DECLARE V_EXISTE INTEGER;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SELECT 'ERROR' AS "ESTATUS", ::SQL_ERROR_MESSAGE AS "MENSAJE" FROM DUMMY;
    END;

    SELECT COUNT(*) INTO V_EXISTE
    FROM "PdxMTTOTiemposMuertosProduccionINY"
    WHERE "ID_REGISTRO" = :P_ID_REGISTRO;

    IF :V_EXISTE = 0 THEN
        SELECT 'ERROR' AS "ESTATUS",
               'No existe el registro con ID ' || :P_ID_REGISTRO AS "MENSAJE"
        FROM DUMMY;
        RETURN;
    END IF;

    DELETE FROM "PdxMTTOTiemposMuertosProduccionINY"
    WHERE "ID_REGISTRO" = :P_ID_REGISTRO;

    SELECT 'OK' AS "ESTATUS",
           'Registro eliminado correctamente.' AS "MENSAJE"
    FROM DUMMY;
END;


CREATE OR REPLACE PROCEDURE "TEST_JUNIO_2026"."SpPdxMTTOEliminarTiemposMuertosPeadLiso" (
    IN P_ID_REGISTRO INTEGER
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN
    DECLARE V_EXISTE INTEGER;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SELECT 'ERROR' AS "ESTATUS", ::SQL_ERROR_MESSAGE AS "MENSAJE" FROM DUMMY;
    END;

    SELECT COUNT(*) INTO V_EXISTE
    FROM "PdxMTTOTiemposMuertosProduccionPeadLiso"
    WHERE "ID_REGISTRO" = :P_ID_REGISTRO;

    IF :V_EXISTE = 0 THEN
        SELECT 'ERROR' AS "ESTATUS",
               'No existe el registro con ID ' || :P_ID_REGISTRO AS "MENSAJE"
        FROM DUMMY;
        RETURN;
    END IF;

    DELETE FROM "PdxMTTOTiemposMuertosProduccionPeadLiso"
    WHERE "ID_REGISTRO" = :P_ID_REGISTRO;

    SELECT 'OK' AS "ESTATUS",
           'Registro eliminado correctamente.' AS "MENSAJE"
    FROM DUMMY;
END;


CREATE OR REPLACE PROCEDURE "TEST_JUNIO_2026"."SpPdxMTTOEliminarTiemposMuertosPVC" (
    IN P_ID_REGISTRO INTEGER
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN
    DECLARE V_EXISTE INTEGER;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SELECT 'ERROR' AS "ESTATUS", ::SQL_ERROR_MESSAGE AS "MENSAJE" FROM DUMMY;
    END;

    SELECT COUNT(*) INTO V_EXISTE
    FROM "PdxMTTOTiemposMuertosProduccionPVC"
    WHERE "ID_REGISTRO" = :P_ID_REGISTRO;

    IF :V_EXISTE = 0 THEN
        SELECT 'ERROR' AS "ESTATUS",
               'No existe el registro con ID ' || :P_ID_REGISTRO AS "MENSAJE"
        FROM DUMMY;
        RETURN;
    END IF;

    DELETE FROM "PdxMTTOTiemposMuertosProduccionPVC"
    WHERE "ID_REGISTRO" = :P_ID_REGISTRO;

    SELECT 'OK' AS "ESTATUS",
           'Registro eliminado correctamente.' AS "MENSAJE"
    FROM DUMMY;
END;



