CREATE PROCEDURE "DBADMIN"."SpPdxMTTOActualizaEquipo" (
    IN P_IDEQUIPO                   INTEGER,
    IN P_PLANTA                     INTEGER,        -- ✅ v2: era NVARCHAR(10)
    IN P_TIPOEQUIPO                 INTEGER,        -- ✅ v2: era NVARCHAR(50)
    IN P_NOMBREEQUIPO               NVARCHAR(100),
    IN P_DESCRIPCIONEQUIPO          NVARCHAR(100),
    IN P_AREA                       INTEGER,        -- ✅ v2: era NVARCHAR(50)
    IN P_LINEAPRODUCCION            INTEGER,        -- ✅ v2: era NVARCHAR(50)
    IN P_CENTROCOSTOS               NVARCHAR(50),
    IN P_NUMERODOCPMCALIDAD         NVARCHAR(50),
    IN P_PERIODICIDADMANTENIMIENTO  INTEGER,        -- ✅ v2: era NVARCHAR(20)
    IN P_DIAINICIOMANT              INTEGER,
    IN P_DIAFINMANT                 INTEGER,
    IN P_FECHAINICIOMANT            DATE,
    IN P_COMENTARIOS                NVARCHAR(500)
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN
    DECLARE V_FECHA_MEXICO LONGDATE;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SELECT 'ERROR' AS "Estatus", ::SQL_ERROR_MESSAGE AS "Mensaje" FROM DUMMY;
    END;

    -- Obtener fecha/hora de México (UTC-6)
    SELECT ADD_SECONDS(CURRENT_UTCTIMESTAMP, -6*3600) INTO V_FECHA_MEXICO FROM DUMMY;

    -- Actualizar los datos generales
    UPDATE "DBADMIN"."PdxMTTOGestionEquipos"
    SET
        "PLANTA"                      = :P_PLANTA,
        "TIPO_EQUIPO"                 = :P_TIPOEQUIPO,
        "NOMBRE_EQUIPO"               = :P_NOMBREEQUIPO,
        "DESCRIPCION_EQUIPO"          = :P_DESCRIPCIONEQUIPO,
        "AREA"                        = :P_AREA,
        "LINEA_PRODUCCION"            = :P_LINEAPRODUCCION,
        "CENTRO_COSTOS"               = :P_CENTROCOSTOS,
        "NUMERO_DOC_PM_CALIDAD"       = :P_NUMERODOCPMCALIDAD,
        "PERIODICIDAD_MANTENIMIENTO"  = :P_PERIODICIDADMANTENIMIENTO,
        "DIA_INICIO_MANT"             = :P_DIAINICIOMANT,
        "DIA_FIN_MANT"                = :P_DIAFINMANT,
        "FECHA_INICIO_MANT"           = :P_FECHAINICIOMANT,
        "COMENTARIOS"                 = :P_COMENTARIOS,
        "FECHA_ULT_MOD"               = :V_FECHA_MEXICO
    WHERE "ID_EQUIPO" = :P_IDEQUIPO;

    SELECT 'OK' AS "Estatus" FROM DUMMY;
END
