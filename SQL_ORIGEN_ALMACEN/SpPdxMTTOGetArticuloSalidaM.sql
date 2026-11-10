CREATE PROCEDURE "TEST_JUNIO_2026"."SpPdxMTTOGetArticuloSalidaM"
(
    IN P_ID_SOLICITUD INT
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN

    SELECT 
        T0."ID_SOLICITUD",
        T0."REFACCION_SOLICITADA",
        T0."CANTIDAD",
        T1."ItemCode",
        T1."ItemName",
        T1."DfltWH",
        T1."GLMethod",

        -- Cuenta contable
        CASE T1."GLMethod"
            WHEN 'I' THEN T1."ExpensAcct"
            WHEN 'W' THEN T2."ExpensesAc"
            WHEN 'C' THEN T3."ExpensesAc"
        END AS "CuentaContable",

        T1."ManBtchNum",   
        T1."ManSerNum",

        -- ✅ LOTE
        T4."DistNumber" AS "Lote",
        T5."Quantity" AS "StockLote"

    FROM "TEST_JUNIO_2026"."PdxMTTOMPSolicitudRefacciones" T0

    INNER JOIN "TEST_JUNIO_2026"."OITM" T1 
        ON T1."ItemCode" = T0."REFACCION_SOLICITADA"

    LEFT JOIN "TEST_JUNIO_2026"."OITW" T2 
        ON T2."ItemCode" = T1."ItemCode" 
        AND T2."WhsCode" = T1."DfltWH"

    LEFT JOIN "TEST_JUNIO_2026"."OITB" T3 
        ON T3."ItmsGrpCod" = T1."ItmsGrpCod"

    --    JOIN LOTES
    LEFT JOIN "TEST_JUNIO_2026"."OBTQ" T5
        ON T5."ItemCode" = T1."ItemCode"
        AND T5."WhsCode" = T1."DfltWH"
        AND T5."Quantity" > 0

    LEFT JOIN "TEST_JUNIO_2026"."OBTN" T4
        ON T4."ItemCode" = T5."ItemCode"
        AND T4."SysNumber" = T5."SysNumber"

    WHERE T0."ID_SOLICITUD" = :P_ID_SOLICITUD;

END;

