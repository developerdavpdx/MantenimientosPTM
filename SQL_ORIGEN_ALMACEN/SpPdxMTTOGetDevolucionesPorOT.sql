CREATE PROCEDURE "SpPdxMTTOGetDevolucionesPorOT"
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
         * Estado de devolución a nivel solicitud:
         *   0 = sin devolución
         *   1 = devolución parcial
         *   2 = devolución total
         */
        CASE
            WHEN DEV."CANTIDAD_DEVUELTA" IS NULL
                THEN 0
            WHEN DEV."CANTIDAD_DEVUELTA" < MOV."CANTIDAD_SALIDA_BRUTA"
                THEN 1
            ELSE 2
        END AS "ESTADO_DEVOLUCION",

        /* ---- Datos del movimiento de DEVOLUCIÓN individual ---- */
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

        /* Folio SAP de la devolución (ORPC = Goods Return) */
        IFNULL(TO_VARCHAR(RC."DocNum"), '')  AS "FOLIO_DEVOLUCION",

        /* ¿Tiene rechazo registrado? */
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

    /* Cada movimiento de DEVOLUCIÓN individual — un renglón por devolución */
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

    /* Folio SAP de la devolución (Goods Return = ORPC) */
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
