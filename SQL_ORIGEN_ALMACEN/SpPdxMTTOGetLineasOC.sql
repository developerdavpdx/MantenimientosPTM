CREATE PROCEDURE "TEST_JUNIO_2026"."SpPdxMTTOGetLineasOC"
(
    IN P_DocEntry INT
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN

    SELECT 
        -- Cabecera
        T0."DocEntry",
        T0."DocNum",
        T0."CardCode",
        T0."CardName",
        T0."DocDate",

        -- Líneas
        T1."LineNum"            AS "Linea",
        T1."ItemCode"           AS "NArticulo",
        T1."Dscription"         AS "Descripcion",
        T1."FreeTxt"            AS "Detalles",

        T1."Quantity"           AS "Cantidad",
        T1."Price"              AS "PrecioU",
        T1."DiscPrcnt"          AS "PorDesc",

        -- Impuestos
        T1."VatGroup"           AS "IVACodigo",
        T1."VatSum"             AS "IVAImporte",

        -- Totales
        T1."LineTotal"          AS "Total",

        -- Logística
        T1."WhsCode"            AS "Almacen",

        -- Unidad de medida
        T1."unitMsr"            AS "Unidad",
        T1."NumPerMsr"          AS "ArtUnidad",

        -- Cuenta contable
        T1."AcctCode"           AS "CodOp",

        -- Dimensiones contables
        T1."OcrCode"            AS "Departamento",
        T1."OcrCode2"           AS "Proceso",
        T1."OcrCode3"           AS "Gastos",
        T1."OcrCode4"           AS "Cedis",

        -- UDFs (AJUSTAR a tu sistema)
        --T1."U_Departamento"     AS "Departamento_UDF",
       	--T1."U_Proceso"          AS "Proceso_UDF",
        --T1."U_Cedes"            AS "Cedes",
        --T1."U_Gastos"           AS "Gastos",

        -- Referencias
        T1."BaseRef"            AS "DocumentoBase"

    FROM OPOR T0
    INNER JOIN POR1 T1 
        ON T0."DocEntry" = T1."DocEntry"

    WHERE 
        T0."DocEntry" = :P_DocEntry

    ORDER BY 
        T1."LineNum";
END;
