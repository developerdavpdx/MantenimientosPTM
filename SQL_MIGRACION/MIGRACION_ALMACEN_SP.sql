-- ============================================================================
-- MIGRACION ALMACEN - STORED PROCEDURES FALTANTES
-- Fecha: 10/11/2026
-- Ambiente destino: HANA Cloud - schema DBADMIN
--
-- Incluye los 9 SPs. Los 2 SPs que apuntaban a la tabla obsoleta
-- PdxMTTOMPSolicitudCompraMP se adaptaron para usar:
--   PdxMTTOMPSolicitudCompra
--   PdxMTTOMPSolicitudCompraDetalle
--   PdxMTTOMPSolicitudRefacciones
--
-- Ejecutar una sola vez. Si un SP ya existe, dropearlo antes.
-- ============================================================================

-- ============================================================================
-- SP: SpPdxMTTOGetArticuloSalidaM
-- ============================================================================
CREATE PROCEDURE "DBADMIN"."SpPdxMTTOGetArticuloSalidaM"
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

        -- âœ… LOTE
        T4."DistNumber" AS "Lote",
        T5."Quantity" AS "StockLote"

    FROM "DBADMIN"."PdxMTTOMPSolicitudRefacciones" T0

    INNER JOIN "DBADMIN"."OITM" T1 
        ON T1."ItemCode" = T0."REFACCION_SOLICITADA"

    LEFT JOIN "DBADMIN"."OITW" T2 
        ON T2."ItemCode" = T1."ItemCode" 
        AND T2."WhsCode" = T1."DfltWH"

    LEFT JOIN "DBADMIN"."OITB" T3 
        ON T3."ItmsGrpCod" = T1."ItmsGrpCod"

    --    JOIN LOTES
    LEFT JOIN "DBADMIN"."OBTQ" T5
        ON T5."ItemCode" = T1."ItemCode"
        AND T5."WhsCode" = T1."DfltWH"
        AND T5."Quantity" > 0

    LEFT JOIN "DBADMIN"."OBTN" T4
        ON T4."ItemCode" = T5."ItemCode"
        AND T4."SysNumber" = T5."SysNumber"

    WHERE T0."ID_SOLICITUD" = :P_ID_SOLICITUD;

END;


-- ============================================================================
-- SP: SpPdxMTTOInsertMovimientoAlmacen
-- ============================================================================
CREATE PROCEDURE "DBADMIN"."SpPdxMTTOInsertMovimientoAlmacen"
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
    -- âœ… Insert
    INSERT INTO "DBADMIN"."PdxMTTOMovimientosAlmacen"
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

    -- âœ… Obtener el ID generado
    SELECT CURRENT_IDENTITY_VALUE() AS "ID_MOVIMIENTO" FROM DUMMY;

END;


-- ============================================================================
-- SP: SpPdxMTTOGetSeriesByName
-- ============================================================================
CREATE PROCEDURE "DBADMIN"."SpPdxMTTOGetSeriesByName"
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
            'El parÃ¡metro SeriesName es obligatorio' AS "MSG"
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


-- ============================================================================
-- SP: SpPdxMTTOInsertRechazoDevolucion
-- ============================================================================
CREATE PROCEDURE "DBADMIN"."SpPdxMTTOInsertRechazoDevolucion"
(
    IN P_ID_SALIDA      INT,
    IN P_MOTIVO         NVARCHAR(100),
    IN P_COMENTARIOS    NVARCHAR(150)
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN
    -- âœ… Insert
    INSERT INTO "DBADMIN"."PdxMTTORechazoDevolucion"
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
    -- âœ… Obtener el ID generado
    SELECT CURRENT_IDENTITY_VALUE() AS "ID_RECHAZO" FROM DUMMY;
END;


-- ============================================================================
-- SP: SpPdxMTTOGetEstautsAuthSC
-- ============================================================================
CREATE PROCEDURE "DBADMIN"."SpPdxMTTOGetEstautsAuthSC"
(
    IN P_ID_SOLICITUD_COMPRA INT
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN

    --    ValidaciÃ³n bÃ¡sica
    IF :P_ID_SOLICITUD_COMPRA IS NULL THEN
        SIGNAL SQL_ERROR_CODE 10001
        SET MESSAGE_TEXT = 'El ID_SOLICITUD_COMPRA es obligatorio';
    END IF;

    SELECT 
        IFNULL("ATENDIDA", 0) AS "ATENDIDA",
        "FOLIO_COMPRA",
        "ESTATUS",
        "PLANTA",
        "DOC_ENTRY" AS "DOCENTRY",
        "DOC_NUM" AS "DOCNUM",
        "FECHA_REQUERIDA"
    FROM "PdxMTTOMPSolicitudCompra"
    WHERE "ID_SOLICITUD_COMPRA" = :P_ID_SOLICITUD_COMPRA;

END;


-- ============================================================================
-- SP: SpPdxMTTOGetLineasOC
-- ============================================================================
CREATE PROCEDURE "DBADMIN"."SpPdxMTTOGetLineasOC"
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

        -- LÃ­neas
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

        -- LogÃ­stica
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


-- ============================================================================
-- SP: SpPdxMTTOGetSolicitudesCompra_filtradas
-- ============================================================================
CREATE PROCEDURE "DBADMIN"."SpPdxMTTOGetSolicitudesCompra_filtradas" 
(
    IN P_FILTRO_PLANTA NVARCHAR(10),        -- Filtro para Planta
    IN P_FILTRO_REFACCION NVARCHAR(100)     -- Filtro para RefacciÃ³n
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN
    SELECT
        SC."ID_SOLICITUD_COMPRA" AS "SOLICITUD_COMPRA",
        SR."ORDEN_TRABAJO",
        SR."REFACCION_SOLICITADA" AS "REFACCION",
        SR."CANTIDAD",
        SR."NIVEL_URGENCIA" AS "URGENCIA",
        TO_VARCHAR(SC."FECHA_SOLICITUD", 'DD/MM/YYYY HH24:MI:SS') AS "FECHA_SOLICITUD",
        SC."USUARIO_SOLICITA"  AS "SOLICITANTE",
        SR."DESCRIPCION_NECESIDAD",
        SD."ID_SOLICITUD_REFACCION",
        SC."COMENTARIOS",
        SC."ESTATUS",
        SC."USUARIO_ATIENDE",
        TO_VARCHAR(SC."FECHA_ATENCION", 'DD/MM/YYYY HH24:MI:SS')  AS "FECHA_ATENCION",
        SR."ID_EQUIPO",
        SR."PLANTA"
    FROM "DBADMIN"."PdxMTTOMPSolicitudCompra" SC
    INNER JOIN "DBADMIN"."PdxMTTOMPSolicitudCompraDetalle" SD
        ON SC."ID_SOLICITUD_COMPRA" = SD."ID_SOLICITUD_COMPRA"
    INNER JOIN "DBADMIN"."PdxMTTOMPSolicitudRefacciones" SR
        ON SD."ID_SOLICITUD_REFACCION" = SR."ID_SOLICITUD"
    WHERE 
        (:P_FILTRO_PLANTA IS NULL OR SR."PLANTA" = :P_FILTRO_PLANTA)
        AND (:P_FILTRO_REFACCION IS NULL OR SR."REFACCION_SOLICITADA" = :P_FILTRO_REFACCION)
    ORDER BY
        SC."FECHA_SOLICITUD" DESC;
END;


-- ============================================================================
-- SP: SpPdxMTTOGetDevolucionesPorOT
-- ============================================================================
CREATE PROCEDURE "DBADMIN"."SpPdxMTTOGetDevolucionesPorOT"
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
        SR."REFACCION_SOLICITADA"            AS "ItemCode",
        I."ItemName",
        SR."CANTIDAD"                        AS "CANTIDAD_SOLICITADA",

        /* Salida bruta total (sin restar devoluciones) */
        IFNULL(MOV."CANTIDAD_SALIDA_BRUTA", 0) AS "CANTIDAD_SURTIDA_TOTAL",

        /* Neto actual (salidas - devoluciones) */
        IFNULL(MOV."CANTIDAD_SURTIDA", 0)    AS "CANTIDAD_SURTIDA_NETA",

        /* Total ya devuelto acumulado para esta solicitud */
        IFNULL(DEV."CANTIDAD_DEVUELTA", 0)   AS "CANTIDAD_DEVUELTA_TOTAL",

        /*
         * Estado de devoluciÃ³n a nivel solicitud:
         *   0 = sin devoluciÃ³n
         *   1 = devoluciÃ³n parcial
         *   2 = devoluciÃ³n total
         */
        CASE
            WHEN DEV."CANTIDAD_DEVUELTA" IS NULL
                THEN 0
            WHEN DEV."CANTIDAD_DEVUELTA" < MOV."CANTIDAD_SALIDA_BRUTA"
                THEN 1
            ELSE 2
        END AS "ESTADO_DEVOLUCION",

        /* ---- Datos del movimiento de DEVOLUCIÃ“N individual ---- */
        DEVMOV."ID_ALMACEN"                  AS "ID_ALMACEN_DEV",
        DEVMOV."SOLICITANTE"                 AS "DEVUELVE",
        DEVMOV."NUM_EMPLEADO"                AS "NUM_EMPLEADO_DEV",
        DEVMOV."AREA"                        AS "AREA_DEV",
        DEVMOV."FECHA_INGRESO"               AS "FECHA_DEVOLUCION",
        DEVMOV."CANTIDAD_REAL"               AS "CANTIDAD_DEVUELTA",
        DEVMOV."DEPT",
        DEVMOV."PROCESO",
        DEVMOV."GASTOS",
        DEVMOV."CEDIS",
        DEVMOV."DOCENTRY"                    AS "DOCENTRY_DEV",

        /* Folio SAP de la devoluciÃ³n (ORPC = Goods Return) */
        IFNULL(TO_VARCHAR(RC."DocNum"), '')  AS "FOLIO_DEVOLUCION",

        /* Â¿Tiene rechazo registrado? */
        CASE
            WHEN RD."ID_RECHAZO" IS NOT NULL THEN 1
            ELSE 0
        END AS "DEVOLUCION_RECHAZADA",
        IFNULL(RD."MOTIVO", '')              AS "MOTIVO_RECHAZO",
        IFNULL(RD."COMENTARIOS", '')         AS "COMENTARIOS_RECHAZO"

    FROM "PdxMTTOMPSolicitudRefacciones" SR

    LEFT JOIN "OITM" I
        ON I."ItemCode" = SR."REFACCION_SOLICITADA"

    /* Neto y bruto por solicitud */
    LEFT JOIN
    (
        SELECT
            "ID_SOLICITUD",
            SUM(CASE WHEN "TIPO" = 'SALIDA'
                     THEN IFNULL("CANTIDAD_REAL", 0) ELSE 0 END)
            - SUM(CASE WHEN "TIPO" = 'DEVOLUCION'
                       THEN IFNULL("CANTIDAD_REAL", 0) ELSE 0 END)
                AS "CANTIDAD_SURTIDA",
            SUM(CASE WHEN "TIPO" = 'SALIDA'
                     THEN IFNULL("CANTIDAD_REAL", 0) ELSE 0 END)
                AS "CANTIDAD_SALIDA_BRUTA"
        FROM "PdxMTTOMovimientosAlmacen"
        WHERE IFNULL("ESTATUS", 1) = 1
        GROUP BY "ID_SOLICITUD"
    ) MOV ON MOV."ID_SOLICITUD" = SR."ID_SOLICITUD"

    /* Cada movimiento de DEVOLUCIÃ“N individual â€” un renglÃ³n por devoluciÃ³n */
    INNER JOIN "PdxMTTOMovimientosAlmacen" DEVMOV
        ON DEVMOV."ID_SOLICITUD" = SR."ID_SOLICITUD"
       AND DEVMOV."TIPO"         = 'DEVOLUCION'
       AND IFNULL(DEVMOV."ESTATUS", 1) = 1

    /* Total devuelto acumulado por solicitud */
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

    /* Folio SAP de la devoluciÃ³n (Goods Return = ORPC) */
    LEFT JOIN "OIGN" RC
        ON RC."DocEntry" = DEVMOV."DOCENTRY"

    /* Rechazo agrupado por solicitud */
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
        SR."ORDEN_TRABAJO"              = :P_ORDEN_TRABAJO
        AND SR."ESTATUS"                = 'Atendida'
        AND MOV."CANTIDAD_SALIDA_BRUTA" > 0

    ORDER BY
        SR."REFACCION_SOLICITADA",
        DEVMOV."FECHA_INGRESO" ASC;
END;


-- ============================================================================
-- SP: SpPdxMTTOConsultaSolicitudesCompraMP
-- ============================================================================
CREATE PROCEDURE "DBADMIN"."SpPdxMTTOConsultaSolicitudesCompraMP" (
    IN P_FILTRO_ORDEN        NVARCHAR(50),
    IN P_FILTRO_FECHA_INICIO DATE,
    IN P_FILTRO_FECHA_FIN    DATE,
    IN P_FILTRO_PLANTA       NVARCHAR(10)
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN
    SELECT
        SC."ID_SOLICITUD_COMPRA",
        SD."ID_SOLICITUD_REFACCION",
        SC."COMENTARIOS",
        TO_VARCHAR(SC."FECHA_SOLICITUD", 'DD/MM/YYYY HH24:MI:SS') AS "FECHA_SOLICITUD",
        SC."ESTATUS",
        SC."USUARIO_SOLICITA",
        SC."USUARIO_ATIENDE",
        TO_VARCHAR(SC."FECHA_ATENCION", 'DD/MM/YYYY HH24:MI:SS')  AS "FECHA_ATENCION",
        SR."ORDEN_TRABAJO",
        SR."ID_EQUIPO",
        SR."REFACCION_SOLICITADA",
        SR."CANTIDAD",
        SR."NIVEL_URGENCIA",
        SR."DESCRIPCION_NECESIDAD",
        SR."PLANTA"
    FROM "DBADMIN"."PdxMTTOMPSolicitudCompra" SC
    INNER JOIN "DBADMIN"."PdxMTTOMPSolicitudCompraDetalle" SD
        ON SC."ID_SOLICITUD_COMPRA" = SD."ID_SOLICITUD_COMPRA"
    INNER JOIN "DBADMIN"."PdxMTTOMPSolicitudRefacciones" SR
        ON SD."ID_SOLICITUD_REFACCION" = SR."ID_SOLICITUD"
    WHERE
        (:P_FILTRO_ORDEN  IS NULL OR SR."ORDEN_TRABAJO" = :P_FILTRO_ORDEN)
        AND (:P_FILTRO_PLANTA IS NULL OR SR."PLANTA"    = :P_FILTRO_PLANTA)
        AND (
            :P_FILTRO_FECHA_INICIO IS NULL
            OR :P_FILTRO_FECHA_FIN IS NULL
            OR CAST(SC."FECHA_SOLICITUD" AS DATE) BETWEEN :P_FILTRO_FECHA_INICIO AND :P_FILTRO_FECHA_FIN
        )
    ORDER BY
        SC."FECHA_SOLICITUD" DESC;
END;


