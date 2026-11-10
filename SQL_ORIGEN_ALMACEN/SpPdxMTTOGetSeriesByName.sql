CREATE
PROCEDURE "SpPdxMTTOGetSeriesByName"
(
    IN P_SERIES_NAME NVARCHAR(100),
    IN P_OBJECT_CODE NVARCHAR(10) DEFAULT NULL
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN

    IF :P_SERIES_NAME IS NULL OR LENGTH(:P_SERIES_NAME) = 0 THEN
        
        SELECT 
            1 AS "ERROR",
            'El parámetro SeriesName es obligatorio' AS "MSG"
        FROM DUMMY;

        RETURN;
    END IF;

    SELECT 
        0 AS "ERROR",
        'OK' AS "MSG",
        "Series",
        "SeriesName"
    FROM NNM1
    WHERE 
        (
            (
                :P_OBJECT_CODE IS NULL
                AND "ObjectCode" = '60'
            )
            OR
            (
                :P_OBJECT_CODE IS NOT NULL
                AND "ObjectCode" = :P_OBJECT_CODE
            )
        )
        AND "Locked" = 'N'
        AND "SeriesName" = :P_SERIES_NAME;

END;
