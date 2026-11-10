CREATE PROCEDURE "TEST_JUNIO_2026"."SpPdxMTTOInsertMovimientoAlmacen"
(
    IN P_ID_SOLICITUD   INT,
    IN P_TIPO           NVARCHAR(10),
    IN P_SOLICITANTE    NVARCHAR(80),
    IN P_NUM_EMPLEADO   NVARCHAR(20),
    IN P_AREA           NVARCHAR(50),
    IN P_DOCENTRY       INT,
    IN P_ENTREGA        NVARCHAR(30),
    IN P_RECIBE         NVARCHAR(30),
    IN P_DEPT 			NVARCHAR(100),
    IN P_PROCESO		NVARCHAR(10),
    IN P_GASTOS 		NVARCHAR(10),
    IN P_CEDIS 			NVARCHAR(10),
    IN P_CANTIDAD_REAL 	DECIMAL(21,2),
    IN P_ESTATUS 		INT,
    IN P_COMENTARIOS 	NVARCHAR(1000) DEFAULT ''
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN
    -- ✅ Insert
    INSERT INTO "TEST_JUNIO_2026"."PdxMTTOMovimientosAlmacen"
    (
        "ID_SOLICITUD",
        "TIPO",
        "SOLICITANTE",
        "NUM_EMPLEADO",
        "AREA",
        "DOCENTRY",
        "ENTREGA",
        "RECIBE",
        "DEPT",
        "PROCESO",
        "GASTOS",
        "CEDIS",
        "CANTIDAD_REAL",
        "ESTATUS",
        "COMENTARIOS"
    )
    VALUES
    (
        :P_ID_SOLICITUD,
        :P_TIPO,
        :P_SOLICITANTE,
        :P_NUM_EMPLEADO,
        :P_AREA,
        :P_DOCENTRY,
        :P_ENTREGA,
        :P_RECIBE,
        :P_DEPT,
        :P_PROCESO,
        :P_GASTOS,
        :P_CEDIS,
        :P_CANTIDAD_REAL,
        :P_ESTATUS,
        :P_COMENTARIOS
    );

    -- ✅ Obtener el ID generado
    SELECT CURRENT_IDENTITY_VALUE() AS "ID_MOVIMIENTO" FROM DUMMY;

END;