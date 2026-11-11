-- ============================================================================
-- MIGRACION ALMACEN - DEVOLUCION CON COSTO PROMEDIO (AvgPrice)
-- Fecha: 11/11/2026
-- Ambiente destino: TEST_JUNIO_2026
-- Estado: PENDIENTE DE APLICAR
--
-- Objetivo:
--   Que la entrada por devolucion (InventoryGenEntries) use como costo el
--   costo promedio del articulo (OITM.AvgPrice) al momento de la devolucion.
--
--   La logica C# (LogicaAlmacen.CrearEntradaDevolucionAsync) lee el campo
--   "CostoPromedio" y lo envia a SAP en DocumentLines[].Price.
--
--   Ademas, SpPdxMTTOGetSalidasPorOT devuelve "CostoPromedio" para que el
--   modal de devolucion muestre el costo unitario y el valor a devolver
--   antes de confirmar.
--
-- On-premise: usar ALTER PROCEDURE. CREATE OR REPLACE no funciona en este ambiente.
-- El SP ya existe; no requiere dropear.
-- ============================================================================

SET SCHEMA TEST_JUNIO_2026;

ALTER PROCEDURE "TEST_JUNIO_2026"."SpPdxMTTOGetArticuloSalidaM"
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

        -- Costo promedio del articulo al momento de la devolucion
        T1."AvgPrice" AS "CostoPromedio",

        -- Cuenta contable
        CASE T1."GLMethod"
            WHEN 'I' THEN T1."ExpensAcct"
            WHEN 'W' THEN T2."ExpensesAc"
            WHEN 'C' THEN T3."ExpensesAc"
        END AS "CuentaContable",

        T1."ManBtchNum",   
        T1."ManSerNum",

        -- LOTE
        T4."DistNumber" AS "Lote",
        T5."Quantity"   AS "StockLote"

    FROM "TEST_JUNIO_2026"."PdxMTTOMPSolicitudRefacciones" T0

    INNER JOIN "TEST_JUNIO_2026"."OITM" T1 
        ON T1."ItemCode" = T0."REFACCION_SOLICITADA"

    LEFT JOIN "TEST_JUNIO_2026"."OITW" T2 
        ON T2."ItemCode" = T1."ItemCode" 
        AND T2."WhsCode" = T1."DfltWH"

    LEFT JOIN "TEST_JUNIO_2026"."OITB" T3 
        ON T3."ItmsGrpCod" = T1."ItmsGrpCod"

    -- JOIN LOTES
    LEFT JOIN "TEST_JUNIO_2026"."OBTQ" T5
        ON T5."ItemCode" = T1."ItemCode"
        AND T5."WhsCode" = T1."DfltWH"
        AND T5."Quantity" > 0

    LEFT JOIN "TEST_JUNIO_2026"."OBTN" T4
        ON T4."ItemCode" = T5."ItemCode"
        AND T4."SysNumber" = T5."SysNumber"

    WHERE T0."ID_SOLICITUD" = :P_ID_SOLICITUD;

END;

-- ============================================================================
-- SP: SpPdxMTTOGetSalidasPorOT
-- Devuelve el costo promedio (OITM.AvgPrice) para mostrarlo en el modal de
-- devolucion antes de confirmar.
-- ============================================================================

ALTER PROCEDURE "TEST_JUNIO_2026"."SpPdxMTTOGetSalidasPorOT"
(
    IN P_ORDEN_TRABAJO NVARCHAR(50)
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN
    IF :P_ORDEN_TRABAJO IS NULL OR LENGTH(:P_ORDEN_TRABAJO) = 0 THEN
        SELECT
            'La orden de trabajo es obligatoria' AS "MSG",
            'Error' AS "ESTATUS"
        FROM DUMMY;
        RETURN;
    END IF;

    SELECT
        SR."ID_SOLICITUD",
        SR."ORDEN_TRABAJO",
        SR."REFACCION_SOLICITADA"           AS "ItemCode",
        I."ItemName",
        I."AvgPrice" AS "CostoPromedio",
        SR."CANTIDAD"                       AS "CANTIDAD_SOLICITADA",
        
        IFNULL(MOV."CANTIDAD_SURTIDA", 0)   AS "CANTIDAD_SURTIDA",
        MOV."SOLICITANTE",
        MOV."NUM_EMPLEADO",
        MOV."AREA",

        /* Datos del solicitante (OHEM por email) */
        SR."USUARIO_SOLICITA",
        TRIM(
            IFNULL(E."firstName", '') || ' ' ||
            IFNULL(E."middleName" || ' ', '') ||
            IFNULL(E."lastName", '')
        )                                   AS "SOLICITANTE_ORIGINAL",
        IFNULL(E."ExtEmpNo", '')            AS "NUM_EMPLEADO_ORIGINAL",
        IFNULL(D."Name", '')                AS "AREA_ORIGINAL",

        SALIDA."ID_ALMACEN",
        SALIDA."DEPT",
        SALIDA."PROCESO",
        SALIDA."GASTOS",
        SALIDA."CEDIS",
        SALIDA."DOCENTRY",
        SALIDA."FECHA_INGRESO",
        SALIDA."CANTIDAD_REAL"              AS "CANTIDAD_SALIDA",
        IFNULL(TO_VARCHAR(OG."DocNum"), '') AS "FOLIO_SALIDA",

        /* Cantidad total devuelta para esta solicitud */
        IFNULL(DEV."CANTIDAD_DEVUELTA", 0)  AS "CANTIDAD_DEVUELTA",

        /*
         * Estado de devolucion a nivel solicitud:
         *   0 = sin devolucion
         *   1 = devolucion parcial  (devuelto < total surtido bruto)
         *   2 = devolucion total    (devuelto >= total surtido bruto)
         */
        CASE
            WHEN DEV."CANTIDAD_DEVUELTA" IS NULL
                THEN 0
            WHEN DEV."CANTIDAD_DEVUELTA" < MOV."CANTIDAD_SALIDA_BRUTA"
                THEN 1
            ELSE 2
        END AS "ESTADO_DEVOLUCION",

        /* Tiene rechazo de devolucion registrado? */
        CASE
            WHEN RD."ID_RECHAZO" IS NOT NULL THEN 1
            ELSE 0
        END AS "DEVOLUCION_RECHAZADA",
        IFNULL(RD."MOTIVO", '')      AS "MOTIVO_RECHAZO",
        IFNULL(RD."COMENTARIOS", '') AS "COMENTARIOS_RECHAZO"

    FROM "PdxMTTOMPSolicitudRefacciones" SR

    LEFT JOIN "OITM" I
        ON I."ItemCode" = SR."REFACCION_SOLICITADA"

    /* Saldo neto (salidas - devoluciones) y salida bruta para calcular ESTADO_DEVOLUCION */
    LEFT JOIN
    (
        SELECT
            "ID_SOLICITUD",
            MAX("SOLICITANTE")  AS "SOLICITANTE",
            MAX("NUM_EMPLEADO") AS "NUM_EMPLEADO",
            MAX("AREA")         AS "AREA",
            SUM(CASE WHEN "TIPO" = 'SALIDA'     THEN IFNULL("CANTIDAD_REAL", 0) ELSE 0 END)
            - SUM(CASE WHEN "TIPO" = 'DEVOLUCION' THEN IFNULL("CANTIDAD_REAL", 0) ELSE 0 END)
                AS "CANTIDAD_SURTIDA",
            SUM(CASE WHEN "TIPO" = 'SALIDA'     THEN IFNULL("CANTIDAD_REAL", 0) ELSE 0 END)
                AS "CANTIDAD_SALIDA_BRUTA"
        FROM "PdxMTTOMovimientosAlmacen"
        WHERE IFNULL("ESTATUS", 1) = 1
        GROUP BY "ID_SOLICITUD"
    ) MOV ON MOV."ID_SOLICITUD" = SR."ID_SOLICITUD"

    /* Cada salida individual */
    INNER JOIN "PdxMTTOMovimientosAlmacen" SALIDA
        ON SALIDA."ID_SOLICITUD" = SR."ID_SOLICITUD"
       AND SALIDA."TIPO"         = 'SALIDA'
       AND IFNULL(SALIDA."ESTATUS", 1) = 1

    /* Folio SAP */
    LEFT JOIN "OIGE" OG
        ON OG."DocEntry" = SALIDA."DOCENTRY"

    /* Un solo empleado por email (evita duplicar filas si hay correos repetidos en OHEM) */
    LEFT JOIN
    (
        SELECT
            LOWER(TRIM("email")) AS "EMAIL",
            MIN("empID")         AS "empID"
        FROM "OHEM"
        WHERE IFNULL(TRIM("email"), '') <> ''
        GROUP BY LOWER(TRIM("email"))
    ) EM ON EM."EMAIL" = LOWER(TRIM(SR."USUARIO_SOLICITA"))

    LEFT JOIN "OHEM" E
        ON E."empID" = EM."empID"

    /* Nombre del departamento */
    LEFT JOIN "OUDP" D
        ON D."Code" = E."dept"

    /* Total devuelto por solicitud */
    LEFT JOIN
    (
        SELECT
            "ID_SOLICITUD",
            SUM(IFNULL("CANTIDAD_REAL", 0)) AS "CANTIDAD_DEVUELTA"
        FROM "PdxMTTOMovimientosAlmacen"
        WHERE "TIPO"               = 'DEVOLUCION'
          AND IFNULL("ESTATUS", 1) = 1
        GROUP BY "ID_SOLICITUD"
    ) DEV ON DEV."ID_SOLICITUD" = SR."ID_SOLICITUD"

    /* Rechazo de devolucion agrupado - evita duplicados cuando hay multiples salidas por solicitud */
    LEFT JOIN
    (
        SELECT
            "ID_SALIDA",
            MAX("ID_RECHAZO")  AS "ID_RECHAZO",
            MAX("MOTIVO")      AS "MOTIVO",
            MAX("COMENTARIOS") AS "COMENTARIOS"
        FROM "PdxMTTORechazoDevolucion"
        GROUP BY "ID_SALIDA"
    ) RD ON RD."ID_SALIDA" = SR."ID_SOLICITUD"

    WHERE
        SR."ORDEN_TRABAJO" = :P_ORDEN_TRABAJO
        AND SR."ESTATUS"   = 'Atendida'
        -- Ya no filtramos por CANTIDAD_SURTIDA aqui
        -- En cambio nos aseguramos que haya tenido al menos UNA salida
        AND MOV."CANTIDAD_SALIDA_BRUTA" > 0

    ORDER BY
        SR."REFACCION_SOLICITADA",
        SALIDA."FECHA_INGRESO" ASC;
END;
