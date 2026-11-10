CREATE PROCEDURE "TEST_JUNIO_2026"."SpPdxMTTOInsertRechazoDevolucion"
(
    IN P_ID_SALIDA      INT,
    IN P_MOTIVO         NVARCHAR(100),
    IN P_COMENTARIOS    NVARCHAR(150)
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN
    -- ✅ Insert
    INSERT INTO "TEST_JUNIO_2026"."PdxMTTORechazoDevolucion"
    (
        "ID_SALIDA",
        "MOTIVO",
        "COMENTARIOS"
    )
    VALUES
    (
        :P_ID_SALIDA,
        :P_MOTIVO,
        :P_COMENTARIOS
    );
    -- ✅ Obtener el ID generado
    SELECT CURRENT_IDENTITY_VALUE() AS "ID_RECHAZO" FROM DUMMY;
END;
