CREATE PROCEDURE "DBADMIN"."SpPdxMTTOInsertaEquipo" (
    IN P_PLANTA                     INTEGER,        -- ✅ v2: era NVARCHAR(10)
    IN P_TIPO_EQUIPO                INTEGER,        -- ✅ v2: era NVARCHAR(50)
    IN P_NOMBRE_EQUIPO              NVARCHAR(100),
    IN P_DESCRIPCION_EQUIPO         NVARCHAR(100),
    IN P_AREA                       INTEGER,        -- ✅ v2: era NVARCHAR(50)
    IN P_LINEA_PRODUCCION           INTEGER,        -- ✅ v2: era NVARCHAR(50)
    IN P_CENTRO_COSTOS              NVARCHAR(50),
    IN P_NUMERO_DOC_PM_CALIDAD      NVARCHAR(50),
    IN P_PERIODICIDAD_MANTENIMIENTO INTEGER,        -- ✅ v2: era NVARCHAR(20)
    IN P_DIA_INICIO_MANT            INTEGER,
    IN P_DIA_FIN_MANT               INTEGER,
    IN P_FECHA_INICIO_MANT          DATE,
    IN P_ESTATUS                    TINYINT,        -- ✅ v2: era NVARCHAR(20)
    IN P_COMENTARIOS                NVARCHAR(500),
    IN P_USUARIO                    NVARCHAR(100),
    IN P_FECHA_PAUSA                LONGDATE,
    IN P_FECHA_BAJA                 LONGDATE
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

    INSERT INTO "DBADMIN"."PdxMTTOGestionEquipos" (
        "PLANTA",
        "TIPO_EQUIPO",
        "NOMBRE_EQUIPO",
        "DESCRIPCION_EQUIPO",
        "AREA",
        "LINEA_PRODUCCION",
        "CENTRO_COSTOS",
        "NUMERO_DOC_PM_CALIDAD",
        "PERIODICIDAD_MANTENIMIENTO",
        "DIA_INICIO_MANT",
        "DIA_FIN_MANT",
        "FECHA_INICIO_MANT",
        "ESTATUS",
        "COMENTARIOS",
        "FECHA_PAUSA",
        "FECHA_CREACION",
        "FECHA_BAJA",
        "FECHA_ULT_MOD",
        "USUARIO"
    )
    VALUES (
        :P_PLANTA,
        :P_TIPO_EQUIPO,
        :P_NOMBRE_EQUIPO,
        :P_DESCRIPCION_EQUIPO,
        :P_AREA,
        :P_LINEA_PRODUCCION,
        :P_CENTRO_COSTOS,
        :P_NUMERO_DOC_PM_CALIDAD,
        :P_PERIODICIDAD_MANTENIMIENTO,
        :P_DIA_INICIO_MANT,
        :P_DIA_FIN_MANT,
        :P_FECHA_INICIO_MANT,
        :P_ESTATUS,
        :P_COMENTARIOS,
        :P_FECHA_PAUSA,
        :V_FECHA_MEXICO,
        :P_FECHA_BAJA,
        :V_FECHA_MEXICO,
        :P_USUARIO
    );

    -- Recuperar el ID recién insertado
    SELECT CURRENT_IDENTITY_VALUE() AS "ID_EQUIPO" FROM DUMMY;

END
