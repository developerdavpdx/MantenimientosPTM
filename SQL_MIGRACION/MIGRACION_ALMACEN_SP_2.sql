-- ============================================================================
-- MIGRACION ALMACEN - SPs FUNCIONALES + FALTANTES
-- Fecha: 10/11/2026 | Destino: DBADMIN
-- Excluye los 2 SPs adaptados (GetSolicitudesCompra_filtradas / ConsultaSolicitudesCompraMP)
--
-- NOTA: hdbsql no delimita bien varios CREATE PROCEDURE complejos en un solo
--       archivo. Ejecutar SP por SP (o usar el script individual por SP).
-- ============================================================================

-- ============================================================================
-- SP: SpPdxMTTOGetSalidasPorOT
-- ============================================================================
CREATE PROCEDURE "SpPdxMTTOGetSalidasPorOT"
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
         * Estado de devoluciÃ³n a nivel solicitud:
         *   0 = sin devoluciÃ³n
         *   1 = devoluciÃ³n parcial  (devuelto < total surtido bruto)
         *   2 = devoluciÃ³n total    (devuelto >= total surtido bruto)
         */
        CASE
            WHEN DEV."CANTIDAD_DEVUELTA" IS NULL
                THEN 0
            WHEN DEV."CANTIDAD_DEVUELTA" < MOV."CANTIDAD_SALIDA_BRUTA"
                THEN 1
            ELSE 2
        END AS "ESTADO_DEVOLUCION",

        /* Â¿Tiene rechazo de devoluciÃ³n registrado? */
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

    /* Rechazo de devoluciÃ³n agrupado â€” evita duplicados cuando hay mÃºltiples salidas por solicitud */
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
        -- Ya no filtramos por CANTIDAD_SURTIDA aquÃ­
        -- En cambio nos aseguramos que haya tenido al menos UNA salida
        AND MOV."CANTIDAD_SALIDA_BRUTA" > 0

    ORDER BY
        SR."REFACCION_SOLICITADA",
        SALIDA."FECHA_INGRESO" ASC;
END;


-- ============================================================================
-- SP: SpPdxMTTOGetBalanceOT
-- ============================================================================
CREATE PROCEDURE "DBADMIN"."SpPdxMTTOGetBalanceOT"
(
    IN P_ORDEN_TRABAJO NVARCHAR(50)
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN

    -- Query 1: detalle por solicitud de refaccion
    -- Una fila por cada solicitud, con sus cantidades y estatus de surtido
    SELECT
        SR."ID_SOLICITUD",
        SR."REFACCION_SOLICITADA"            AS "ItemCode",
        SR."CANTIDAD"                         AS "CantidadSolicitada",
        IFNULL(MOV."CANTIDAD_SALIDA",      0) AS "CantidadSalida",
        IFNULL(MOV."CANTIDAD_DEVOLUCION",  0) AS "CantidadDevolucion",
        -- 1 si existe al menos un rechazo de devolucion para esta solicitud
        CASE WHEN RD."ID_SALIDA" IS NOT NULL THEN 1 ELSE 0 END AS "TieneRechazo",
        (
            SR."CANTIDAD" - IFNULL(MOV."CANTIDAD_SALIDA", 0)
        ) AS "Diferencia",
        -- RECHAZADA_DEVOLUCION: existe rechazo => lo que salio se da por consumido
        -- DEVUELTA: se devolvio todo lo que habia salido
        -- COMPLETA: salio igual o mas de lo solicitado
        -- PARCIAL: salio algo pero no todo
        -- PENDIENTE: no ha salido nada
        CASE
            WHEN RD."ID_SALIDA" IS NOT NULL
            THEN 'RECHAZADA_DEVOLUCION'
            WHEN IFNULL(MOV."CANTIDAD_SALIDA", 0) > 0
             AND IFNULL(MOV."CANTIDAD_DEVOLUCION", 0) >= IFNULL(MOV."CANTIDAD_SALIDA", 0)
            THEN 'DEVUELTA'
            WHEN IFNULL(MOV."CANTIDAD_SALIDA", 0) >= SR."CANTIDAD"
            THEN 'COMPLETA'
            WHEN IFNULL(MOV."CANTIDAD_SALIDA", 0) > 0
            THEN 'PARCIAL'
            ELSE 'PENDIENTE'
        END AS "ESTATUS_SURTIDO",
        -- LIBERADA = 1 cuando la solicitud ya no bloquea el flujo:
        --   1) Se surgio completo
        --   2) Se devolvio todo lo que salio
        --   3) Existe un rechazo de devolucion (cubre toda la salida)
        CASE
            WHEN IFNULL(MOV."CANTIDAD_SALIDA", 0) >= SR."CANTIDAD"
              OR (
                IFNULL(MOV."CANTIDAD_SALIDA", 0) > 0
                AND IFNULL(MOV."CANTIDAD_DEVOLUCION", 0) >= IFNULL(MOV."CANTIDAD_SALIDA", 0)
              )
              OR RD."ID_SALIDA" IS NOT NULL
            THEN 1
            ELSE 0
        END AS "LIBERADA"
    FROM "PdxMTTOMPSolicitudRefacciones" SR
    LEFT JOIN (
        SELECT
            "ID_SOLICITUD",
            SUM(CASE WHEN "TIPO" = 'SALIDA'     THEN "CANTIDAD_REAL" ELSE 0 END) AS "CANTIDAD_SALIDA",
            SUM(CASE WHEN "TIPO" = 'DEVOLUCION' THEN "CANTIDAD_REAL" ELSE 0 END) AS "CANTIDAD_DEVOLUCION"
        FROM "PdxMTTOMovimientosAlmacen"
        WHERE "TIPO" IN ('SALIDA', 'DEVOLUCION')
        GROUP BY "ID_SOLICITUD"
    ) MOV ON MOV."ID_SOLICITUD" = SR."ID_SOLICITUD"
    -- Rechazo agrupado por solicitud
    -- Nota: ID_SALIDA en PdxMTTORechazoDevolucion almacena ID_SOLICITUD de PdxMTTOMPSolicitudRefacciones
    LEFT JOIN (
        SELECT "ID_SALIDA"
        FROM "PdxMTTORechazoDevolucion"
        GROUP BY "ID_SALIDA"
    ) RD ON RD."ID_SALIDA" = SR."ID_SOLICITUD"
    WHERE
        SR."ORDEN_TRABAJO" = :P_ORDEN_TRABAJO
        AND SR."ESTATUS" <> 'ELIMINADA'
    ORDER BY
        SR."REFACCION_SOLICITADA";

    -- Query 2: resumen de la OT en una sola fila
    -- TOTAL_SOLICITUDES: cuantas solicitudes tiene la OT (excluye ELIMINADA)
    -- SOLICITUDES_LIBERADAS: cuantas ya no bloquean el flujo
    -- OT_LIBERADA: 1 si todas las solicitudes estan liberadas, 0 si hay al menos una pendiente
    SELECT
        :P_ORDEN_TRABAJO  AS "ORDEN_TRABAJO",
        COUNT(*)          AS "TOTAL_SOLICITUDES",
        SUM(
            CASE
                WHEN IFNULL(MOV2."CANTIDAD_SALIDA", 0) >= SR2."CANTIDAD"
                  OR (
                    IFNULL(MOV2."CANTIDAD_SALIDA", 0) > 0
                    AND IFNULL(MOV2."CANTIDAD_DEVOLUCION", 0) >= IFNULL(MOV2."CANTIDAD_SALIDA", 0)
                  )
                  OR RD2."ID_SALIDA" IS NOT NULL
                THEN 1
                ELSE 0
            END
        ) AS "SOLICITUDES_LIBERADAS",
        CASE
            WHEN COUNT(*) = SUM(
                CASE
                    WHEN IFNULL(MOV2."CANTIDAD_SALIDA", 0) >= SR2."CANTIDAD"
                      OR (
                        IFNULL(MOV2."CANTIDAD_SALIDA", 0) > 0
                        AND IFNULL(MOV2."CANTIDAD_DEVOLUCION", 0) >= IFNULL(MOV2."CANTIDAD_SALIDA", 0)
                      )
                      OR RD2."ID_SALIDA" IS NOT NULL
                    THEN 1
                    ELSE 0
                END
            )
            THEN 1
            ELSE 0
        END AS "OT_LIBERADA"
    FROM "PdxMTTOMPSolicitudRefacciones" SR2
    LEFT JOIN (
        SELECT
            "ID_SOLICITUD",
            SUM(CASE WHEN "TIPO" = 'SALIDA'     THEN "CANTIDAD_REAL" ELSE 0 END) AS "CANTIDAD_SALIDA",
            SUM(CASE WHEN "TIPO" = 'DEVOLUCION' THEN "CANTIDAD_REAL" ELSE 0 END) AS "CANTIDAD_DEVOLUCION"
        FROM "PdxMTTOMovimientosAlmacen"
        WHERE "TIPO" IN ('SALIDA', 'DEVOLUCION')
        GROUP BY "ID_SOLICITUD"
    ) MOV2 ON MOV2."ID_SOLICITUD" = SR2."ID_SOLICITUD"
    LEFT JOIN (
        SELECT "ID_SALIDA"
        FROM "PdxMTTORechazoDevolucion"
        GROUP BY "ID_SALIDA"
    ) RD2 ON RD2."ID_SALIDA" = SR2."ID_SOLICITUD"
    WHERE
        SR2."ORDEN_TRABAJO" = :P_ORDEN_TRABAJO
        AND SR2."ESTATUS" <> 'ELIMINADA';

END


-- ============================================================================
-- SP: SpPdxMTTOConsultaArticulosPorOT
-- ============================================================================
CREATE PROCEDURE "DBADMIN"."SpPdxMTTOConsultaArticulosPorOT"
(
    IN P_FILTRO_ORDEN NVARCHAR(50),
    IN P_FILTRO_ESTATUS NVARCHAR(200)
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN
    SELECT
        SR."ID_SOLICITUD",
        SR."ORDEN_TRABAJO",
        MP."ID_MANTENIMIENTO" AS "ID_ORDENTRABAJO",
        MP."ESTATUS" AS "ESTATUSOT",
        MC."ID_MANTENIMIENTO" AS "ID_ORDENTRABAJOMC",
        MC."ESTATUS" AS "ESTATUSOTMC",
        SR."ID_EQUIPO",
        SR."REFACCION_SOLICITADA",
        A."ItemName" AS "NOMBRE_ARTICULO",
        IFNULL(W."OnHand", 0) AS "STOCK",
        CASE
            WHEN A."ByWh" = 'Y'
                THEN IFNULL(W."MinStock", 0)
            ELSE IFNULL(A."MinLevel", 0)
        END AS "MIN_STOCK",
        CASE
            WHEN A."ByWh" = 'Y'
                THEN IFNULL(W."MaxStock", 0)
            ELSE IFNULL(A."MaxLevel", 0)
        END AS "MAX_STOCK",
        SR."CANTIDAD",
        IFNULL(MA."CANTIDAD_SURTIDA",   0) AS "CANTIDAD_SURTIDA",
        IFNULL(MA."CANTIDAD_DEVUELTA",  0) AS "CANTIDAD_DEVUELTA",
        IFNULL(MA."CANTIDAD_CONSUMIDA", 0) AS "CANTIDAD_CONSUMIDA",
        CASE
            WHEN IFNULL(W."OnHand", 0) <=
                CASE
                    WHEN A."ByWh" = 'Y'
                        THEN IFNULL(W."MinStock", 0)
                    ELSE IFNULL(A."MinLevel", 0)
                END
            THEN 'Critico'
            WHEN IFNULL(W."OnHand", 0) <=
                (
                    CASE
                        WHEN A."ByWh" = 'Y'
                            THEN IFNULL(W."MinStock", 0)
                        ELSE IFNULL(A."MinLevel", 0)
                    END * 1.25
                )
            THEN 'Bajo'
            ELSE 'Normal'
        END AS "NIVEL_URGENCIA",
        SR."DESCRIPCION_NECESIDAD",
        TO_VARCHAR(
            SR."FECHA_SOLICITUD",
            'DD/MM/YYYY HH24:MI:SS'
        ) AS "FECHA_SOLICITUD",
        SR."ESTATUS",
        SR."USUARIO_SOLICITA",
        SR."USUARIO_ATIENDE",
        TO_VARCHAR(
            MA."FECHA_INGRESO",
            'DD/MM/YYYY HH24:MI:SS'
        ) AS "FECHA_ATENCION",
        IFNULL(SC_AGG."FOLIO_COMPRA", '') AS "FOLIO_COMPRA",  -- ï¿½ï¿½
        MA."DOCENTRY" AS "DOCENTRY_SALIDA",
        IFNULL(
            TO_VARCHAR(OG."DocNum"),
            ''
        ) AS "FOLIO_SALIDA",
        SR."ACEPTADA_MANTENIMIENTO"
    FROM "PdxMTTOMPSolicitudRefacciones" SR
    LEFT JOIN "OITM" A
        ON A."ItemCode" = SR."REFACCION_SOLICITADA"
    LEFT JOIN "OITW" W
        ON W."ItemCode" = SR."REFACCION_SOLICITADA"
       AND W."WhsCode" =
            CASE TRIM(SR."PLANTA")
                WHEN '1'  THEN 'COR040'
                WHEN '01' THEN 'COR040'
                WHEN '2'  THEN 'P2040'
                WHEN '02' THEN 'P2040'
                ELSE NULL
            END
    -- ï¿½ï¿½ Subquery pre-agrupado â€” reemplaza los JOINs de D + SC para evitar duplicados
    LEFT JOIN (
        SELECT
            D2."ID_SOLICITUD_REFACCION",
            STRING_AGG(IFNULL(SC2."FOLIO_COMPRA", ''), ', ' ORDER BY SC2."FOLIO_COMPRA") AS "FOLIO_COMPRA"
        FROM "PdxMTTOMPSolicitudCompraDetalle" D2
        JOIN "PdxMTTOMPSolicitudCompra" SC2
            ON SC2."ID_SOLICITUD_COMPRA" = D2."ID_SOLICITUD_COMPRA"
        WHERE SC2."FOLIO_COMPRA" IS NOT NULL
        GROUP BY D2."ID_SOLICITUD_REFACCION"
    ) SC_AGG
        ON SC_AGG."ID_SOLICITUD_REFACCION" = SR."ID_SOLICITUD"
    LEFT JOIN "PdxMTTOMPGenerados" MP
        ON MP."NUMERO_ORDEN" = SR."ORDEN_TRABAJO"
    LEFT JOIN "PdxMTTOMCGenerados" MC
        ON MC."NUMERO_ORDEN" = SR."ORDEN_TRABAJO"
    LEFT JOIN (
        SELECT
            "ID_SOLICITUD",
            SUM(CASE WHEN "TIPO" = 'SALIDA'     THEN "CANTIDAD_REAL" ELSE 0 END) AS "CANTIDAD_SURTIDA",
            SUM(CASE WHEN "TIPO" = 'DEVOLUCION' THEN "CANTIDAD_REAL" ELSE 0 END) AS "CANTIDAD_DEVUELTA",
            SUM(CASE WHEN "TIPO" = 'SALIDA'     THEN "CANTIDAD_REAL" ELSE 0 END)
          - SUM(CASE WHEN "TIPO" = 'DEVOLUCION' THEN "CANTIDAD_REAL" ELSE 0 END) AS "CANTIDAD_CONSUMIDA",
            MAX(CASE WHEN "TIPO" = 'SALIDA' THEN "DOCENTRY"      END) AS "DOCENTRY",
            MAX(CASE WHEN "TIPO" = 'SALIDA' THEN "FECHA_INGRESO" END) AS "FECHA_INGRESO"
        FROM "PdxMTTOMovimientosAlmacen"
        WHERE "TIPO" IN ('SALIDA', 'DEVOLUCION')
        GROUP BY "ID_SOLICITUD"
    ) MA ON MA."ID_SOLICITUD" = SR."ID_SOLICITUD"
    LEFT JOIN "OIGE" OG
        ON OG."DocEntry" = MA."DOCENTRY"
    WHERE
        SR."ORDEN_TRABAJO" = :P_FILTRO_ORDEN
        AND (
            :P_FILTRO_ESTATUS IS NULL
            OR ',' || :P_FILTRO_ESTATUS || ',' NOT LIKE '%,' || SR."ESTATUS" || ',%'
        )
    ORDER BY
        SR."FECHA_SOLICITUD" DESC;
END


-- ============================================================================
-- SP: SpPdxMTTOGetSolicitudesCompraMP
-- ============================================================================
CREATE PROCEDURE "DBADMIN"."SpPdxMTTOGetSolicitudesCompraMP"
(
    IN P_FILTRO_FOLIO        NVARCHAR(50),
    IN P_FILTRO_FECHA_INICIO DATE,
    IN P_FILTRO_FECHA_FIN    DATE,
    IN P_PLANTA              INT
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN
    SELECT
        SC."ID_SOLICITUD_COMPRA",
        SC."FOLIO_COMPRA",
        SC."COMENTARIOS",
        STRING_AGG(OT."ORDEN_TRABAJO", ', ') AS "ORDEN_TRABAJO",
        COUNT(DISTINCT OT."ORDEN_TRABAJO") AS "TOTAL_OTS",
        TO_VARCHAR(
            SC."FECHA_SOLICITUD",
            'DD/MM/YYYY HH24:MI:SS'
        ) AS "FECHA_SOLICITUD",
        SC."ESTATUS",
        SC."USUARIO_SOLICITA",
        OHEM."firstName" || ' ' || IFNULL(OHEM."middleName" || ' ', '') || OHEM."lastName" AS "NOMBRE_SOLICITA",
        OHEM."empID" AS "EMP_ID",
        SC."DOC_NUM",
        SC."DOC_ENTRY",
        SC."RESPONSE_SAP",
        SC."COM_RECHAZO" AS "COMENTARIOS_RECHAZO",
        -- Centros de costo
        IFNULL(SC."CENTRO_COSTO_1", '') AS "DEPARTAMENTO",
        IFNULL(SC."CENTRO_COSTO_2", '') AS "PROCESO",
        IFNULL(SC."CENTRO_COSTO_3", '') AS "GASTOS",
        IFNULL(SC."CENTRO_COSTO_4", '') AS "CEDIS",
        IFNULL(SC."FECHA_REQUERIDA", '') AS "FECHA_REQUERIDA"
    FROM "PdxMTTOMPSolicitudCompra" SC
    LEFT JOIN
    (
        SELECT DISTINCT
            D."ID_SOLICITUD_COMPRA",
            SR."ORDEN_TRABAJO"
        FROM "PdxMTTOMPSolicitudCompraDetalle" D
        INNER JOIN "PdxMTTOMPSolicitudRefacciones" SR
            ON SR."ID_SOLICITUD" = D."ID_SOLICITUD_REFACCION"
    ) OT
        ON OT."ID_SOLICITUD_COMPRA" = SC."ID_SOLICITUD_COMPRA"
           -- DespuÃ©s del JOIN de OT 
		 LEFT JOIN "OHEM" OHEM
		ON OHEM."email" = SC."USUARIO_SOLICITA"
		
		WHERE
        (
            :P_FILTRO_FOLIO IS NULL
            OR SC."FOLIO_COMPRA" = :P_FILTRO_FOLIO
        )
        AND
        (
            :P_FILTRO_FECHA_INICIO IS NULL
            OR :P_FILTRO_FECHA_FIN IS NULL
            OR CAST(SC."FECHA_SOLICITUD" AS DATE)
                BETWEEN :P_FILTRO_FECHA_INICIO
                    AND :P_FILTRO_FECHA_FIN
        )
        AND
        (
            :P_PLANTA IS NULL
            OR SC."PLANTA" = :P_PLANTA
        )
    GROUP BY
        SC."ID_SOLICITUD_COMPRA",
        SC."FOLIO_COMPRA",
        SC."COMENTARIOS",
        SC."FECHA_SOLICITUD",
        SC."ESTATUS",
        SC."USUARIO_SOLICITA",
        SC."DOC_NUM",
        SC."DOC_ENTRY",
        SC."RESPONSE_SAP",
        SC."COM_RECHAZO",
        SC."CENTRO_COSTO_1",
        SC."CENTRO_COSTO_2",
        SC."CENTRO_COSTO_3",
        SC."CENTRO_COSTO_4",
        SC."FECHA_REQUERIDA",
        OHEM."firstName",
        OHEM."middleName",
        OHEM."lastName",
        OHEM."empID"
        ORDER BY SC."FECHA_SOLICITUD" DESC;
END


-- ============================================================================
-- SP: SpPdxMTTOInsertarSolicitudCompraMP
-- ============================================================================
CREATE PROCEDURE "DBADMIN"."SpPdxMTTOInsertarSolicitudCompraMP" (
    IN P_COMENTARIOS        NVARCHAR(500),
    IN P_USUARIOSOLICITA    NVARCHAR(50),
    IN P_PLANTA 			INTEGER,
    IN P_ESTATUS			NVARCHAR(20),
    IN P_CENTRO_COSTO_1		NVARCHAR(500),
	IN P_CENTRO_COSTO_2		NVARCHAR(500),
	IN P_CENTRO_COSTO_3		NVARCHAR(500),
	IN P_CENTRO_COSTO_4		NVARCHAR(500),
	IN P_FECHA_REQUERIDA    DATE
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN
    DECLARE V_FECHA_MEXICO  LONGDATE;
    DECLARE V_FOLIO         NVARCHAR(50);

    SELECT ADD_SECONDS(CURRENT_UTCTIMESTAMP, -6*3600)
    INTO V_FECHA_MEXICO FROM DUMMY;

    -- Generar folio automÃ¡ticamente
    CALL "SpPdxMTTOGenerarFolioSCMP"(V_FOLIO);

    INSERT INTO "PdxMTTOMPSolicitudCompra" (
        "FOLIO_COMPRA",
        "COMENTARIOS",
        "FECHA_SOLICITUD",
        "ESTATUS",
        "USUARIO_SOLICITA",
        "PLANTA",        
        "CENTRO_COSTO_1",
        "CENTRO_COSTO_2",
        "CENTRO_COSTO_3",
        "CENTRO_COSTO_4",
        "FECHA_REQUERIDA"
    ) VALUES (
        :V_FOLIO,
        :P_COMENTARIOS,
        :V_FECHA_MEXICO,        
        :P_ESTATUS,
        :P_USUARIOSOLICITA,
        :P_PLANTA,
        :P_CENTRO_COSTO_1,
        :P_CENTRO_COSTO_2,
        :P_CENTRO_COSTO_3,
        :P_CENTRO_COSTO_4,
        :P_FECHA_REQUERIDA
    );

    SELECT
        CURRENT_IDENTITY_VALUE() AS "ID_SOLICITUD_COMPRA",
        :V_FOLIO                 AS "FOLIO_COMPRA",
        'Pendiente'              AS "ESTATUS"
    FROM DUMMY;
END;


-- ============================================================================
-- SP: SpPdxMTTOGetUsuariosXPlanta
-- ============================================================================
CREATE PROCEDURE "SpPdxMTTOGetUsuariosXPlanta"
(
    IN P_PLANTA INT,
    IN P_TIPO NVARCHAR(2),
    IN P_CODE INT
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN
    DECLARE V_PLANTA INT;

    IF :P_PLANTA = 2 THEN
        V_PLANTA := 12;
    ELSE
        V_PLANTA := :P_PLANTA;
    END IF;

     SELECT 
        CONCAT(T0."firstName", CONCAT(' ', T0."lastName")) AS "Nombre",
        T0."email" AS "Email",
        T1."Name" AS "TipoNotificacion",
        IFNULL(T0."branch", 0) AS "Planta",

        CASE 
            WHEN T1."U_PDX_TIPO" = 'RC' 
                THEN T1."U_PDX_CODE_AUTORIZADOR"
            ELSE T1."U_PDX_CODE"
        END AS "Codigo"

    FROM "@PDX_NOTIFICACIONES" T1

    INNER JOIN "OHEM" T0
        ON T0."Code" = 
            CASE 
                WHEN T1."U_PDX_TIPO" = 'RC'
                    THEN T1."U_PDX_CODE_AUTORIZADOR"
                ELSE T1."U_PDX_CODE"
            END

    WHERE 
        (:V_PLANTA IS NULL OR T0."branch" = :V_PLANTA)
        AND (:P_TIPO IS NULL OR T1."U_PDX_TIPO" = :P_TIPO)
        AND T1."U_PDX_CODE" = :P_CODE;
END


-- ============================================================================
-- SP: SpPdxMTTOGetDetallesSolicitudCompraMP
-- ============================================================================
CREATE PROCEDURE "DBADMIN"."SpPdxMTTOGetDetallesSolicitudCompraMP" (
    IN P_ID_SOLICITUD_COMPRA INT
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN
    SELECT
        D."ID_DETALLE",
        D."ID_SOLICITUD_COMPRA",
        D."ID_SOLICITUD_REFACCION",
        D."CANTIDAD_ENCARGAR",
        SR."ORDEN_TRABAJO",
        COALESCE(SR."PLANTA", C."PLANTA") AS "PLANTA",
        COALESCE(SR."REFACCION_SOLICITADA", D."CODIGO_ARTICULO") AS "CODIGO_ARTICULO",
        IFNULL(A."ItemName", '') AS "NOMBRE_ARTICULO",
        COALESCE(SR."CANTIDAD", D."CANTIDAD_ENCARGAR") AS "CANTIDAD_REQUERIDA",
        IFNULL(W."OnHand", 0) AS "STOCK_ACTUAL",
        CASE
            WHEN A."ByWh" = 'Y'
                THEN IFNULL(W."MinStock", 0)
            ELSE IFNULL(A."MinLevel", 0)
        END AS "MIN_STOCK",
        CASE
            WHEN A."ByWh" = 'Y'
                THEN IFNULL(W."MaxStock", 0)
            ELSE IFNULL(A."MaxLevel", 0)
        END AS "MAX_STOCK",
        CASE
            WHEN IFNULL(W."OnHand", 0) <=
                CASE
                    WHEN A."ByWh" = 'Y'
                        THEN IFNULL(W."MinStock", 0)
                    ELSE IFNULL(A."MinLevel", 0)
                END
            THEN 'Critico'
            WHEN IFNULL(W."OnHand", 0) <=
                (
                    CASE
                        WHEN A."ByWh" = 'Y'
                            THEN IFNULL(W."MinStock", 0)
                        ELSE IFNULL(A."MinLevel", 0)
                    END * 1.25
                )
            THEN 'Bajo'
            ELSE 'Normal'
        END AS "NIVEL_URGENCIA",
        SR."DESCRIPCION_NECESIDAD",
        TO_VARCHAR(
            SR."FECHA_SOLICITUD",
            'DD/MM/YYYY HH24:MI:SS'
        ) AS "FECHA_SOLICITUD",
        SR."ESTATUS",
        SR."USUARIO_SOLICITA",
        IFNULL(D."CARD_CODE", '') AS "CODIGO_PROVEEDOR"
    FROM "PdxMTTOMPSolicitudCompraDetalle" D
    INNER JOIN "PdxMTTOMPSolicitudCompra" C
        ON C."ID_SOLICITUD_COMPRA" = D."ID_SOLICITUD_COMPRA"
    LEFT JOIN "PdxMTTOMPSolicitudRefacciones" SR
        ON SR."ID_SOLICITUD" = D."ID_SOLICITUD_REFACCION"
    LEFT JOIN "OITM" A
        ON A."ItemCode" = COALESCE(SR."REFACCION_SOLICITADA", D."CODIGO_ARTICULO")
    LEFT JOIN "OITW" W
        ON W."ItemCode" = COALESCE(SR."REFACCION_SOLICITADA", D."CODIGO_ARTICULO")
       AND W."WhsCode" =
            CASE TRIM(COALESCE(SR."PLANTA", C."PLANTA"))
                WHEN '1'  THEN 'COR040'
                WHEN '01' THEN 'COR040'
                WHEN '2'  THEN 'P2040'
                WHEN '02' THEN 'P2040'
                ELSE NULL
            END
    WHERE
        D."ID_SOLICITUD_COMPRA" = :P_ID_SOLICITUD_COMPRA
    ORDER BY
        SR."ORDEN_TRABAJO",
        COALESCE(SR."REFACCION_SOLICITADA", D."CODIGO_ARTICULO");
END


-- ============================================================================
-- SP: SpPdxMTTOInsertarSolicitudCompraDetalleMP
-- ============================================================================
CREATE PROCEDURE "DBADMIN"."SpPdxMTTOInsertarSolicitudCompraDetalleMP" (
    IN P_ID_SOLICITUD_COMPRA    INT,
    IN P_ID_SOLICITUD_REFACCION INT,
    IN P_CANTIDAD_ENCARGAR      INT,
    IN P_CARD_CODE				NVARCHAR(50),
    IN P_CODIGO_ARTICULO		NVARCHAR(50)
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN
    INSERT INTO "PdxMTTOMPSolicitudCompraDetalle" (
        "ID_SOLICITUD_COMPRA",
        "ID_SOLICITUD_REFACCION",
        "CANTIDAD_ENCARGAR",
        "CARD_CODE",
        "CODIGO_ARTICULO"
    ) VALUES (
        :P_ID_SOLICITUD_COMPRA,
        :P_ID_SOLICITUD_REFACCION,
        :P_CANTIDAD_ENCARGAR,
        :P_CARD_CODE,
        :P_CODIGO_ARTICULO
    );
    
    -- Al final del SpPdxMTTOInsertarSolicitudCompraDetalleMP
	UPDATE "PdxMTTOMPSolicitudRefacciones"
	SET "ESTATUS" = 'En Compra'
	WHERE "ID_SOLICITUD" = :P_ID_SOLICITUD_REFACCION;

    SELECT 'OK' AS "RESULT" FROM DUMMY;
END;


-- ============================================================================
-- SP: SpPdxMTTOActualizarSolicitudRefaccion
-- ============================================================================
CREATE PROCEDURE "DBADMIN"."SpPdxMTTOActualizarSolicitudRefaccion"(
    IN P_IDSOLICITUD INT,
    IN P_ORDENTRABAJO NVARCHAR(50),
    IN P_REFACCIONSOLICITADA NVARCHAR(200),
    IN P_CANTIDAD INT,
    IN P_ESTATUS NVARCHAR(20),
    IN P_USUARIOATIENDE NVARCHAR(50),
    IN P_ACEPTADAMANTENIMIENTO BOOLEAN DEFAULT NULL
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN
    DECLARE V_PENDIENTES INT;
    UPDATE "PdxMTTOMPSolicitudRefacciones"
    SET
        "REFACCION_SOLICITADA" =
            CASE
                WHEN :P_REFACCIONSOLICITADA IS NOT NULL
                     AND TRIM(:P_REFACCIONSOLICITADA) <> ''
                THEN :P_REFACCIONSOLICITADA
                ELSE "REFACCION_SOLICITADA"
            END,
        "CANTIDAD" =
            CASE
                WHEN :P_CANTIDAD IS NOT NULL
                THEN :P_CANTIDAD
                ELSE "CANTIDAD"
            END,
        "ESTATUS" =
            CASE
                WHEN :P_ESTATUS IS NOT NULL
                     AND TRIM(:P_ESTATUS) <> ''
                THEN :P_ESTATUS
                ELSE "ESTATUS"
            END,
        "USUARIO_ATIENDE" =
            CASE
                WHEN :P_USUARIOATIENDE IS NOT NULL
                     AND TRIM(:P_USUARIOATIENDE) <> ''
                THEN :P_USUARIOATIENDE
                ELSE "USUARIO_ATIENDE"
            END,
        "ACEPTADA_MANTENIMIENTO" =
            CASE
                WHEN :P_ACEPTADAMANTENIMIENTO IS NOT NULL
                THEN :P_ACEPTADAMANTENIMIENTO
                ELSE "ACEPTADA_MANTENIMIENTO"
            END
    WHERE "ID_SOLICITUD" = :P_IDSOLICITUD;

    IF ::ROWCOUNT = 0 THEN
        SIGNAL SQL_ERROR_CODE 10001
        SET MESSAGE_TEXT = 'No se encontrÃ³ la solicitud especificada';
    END IF;

    SELECT COUNT(*)
    INTO V_PENDIENTES
    FROM "PdxMTTOMPSolicitudRefacciones"
    WHERE "ORDEN_TRABAJO" = :P_ORDENTRABAJO
      AND UPPER("ESTATUS") = 'PENDIENTE';

    SELECT
        :P_IDSOLICITUD AS "ID_SOLICITUD",
        :V_PENDIENTES AS "PENDIENTES",
        CASE
            WHEN :V_PENDIENTES > 0 THEN 'PENDIENTE'
            ELSE 'COMPLETADA'
        END AS "ESTATUS_OT",
        'RefacciÃ³n actualizada correctamente' AS "MSG"
    FROM DUMMY;
END


-- ============================================================================
-- SP: SpPdxMTTOActualizarCabeceraSolicitudCompraMP
-- ============================================================================
CREATE PROCEDURE "DBADMIN"."SpPdxMTTOActualizarCabeceraSolicitudCompraMP"
(
    IN P_ID_SOLICITUD_COMPRA    INT,
    IN P_CENTRO_COSTO_1         NVARCHAR(20),
    IN P_CENTRO_COSTO_2         NVARCHAR(20),
    IN P_CENTRO_COSTO_3         NVARCHAR(20),
    IN P_CENTRO_COSTO_4         NVARCHAR(20),
    IN P_FECHA_REQUERIDA   		DATE,
    IN P_ESTATUS                NVARCHAR(20)    DEFAULT '',
    IN P_DOC_NUM                NVARCHAR(20)    DEFAULT '',
    IN P_DOC_ENTRY              NVARCHAR(20)    DEFAULT '',
    IN P_RESPONSE_SAP           NVARCHAR(1000)  DEFAULT ''
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN

    UPDATE "PdxMTTOMPSolicitudCompra"
    SET
        "CENTRO_COSTO_1" =
            CASE
                WHEN IFNULL(:P_CENTRO_COSTO_1, '') <> ''
                THEN :P_CENTRO_COSTO_1
                ELSE "CENTRO_COSTO_1"
            END,

        "CENTRO_COSTO_2" =
            CASE
                WHEN IFNULL(:P_CENTRO_COSTO_2, '') <> ''
                THEN :P_CENTRO_COSTO_2
                ELSE "CENTRO_COSTO_2"
            END,

        "CENTRO_COSTO_3" =
            CASE
                WHEN IFNULL(:P_CENTRO_COSTO_3, '') <> ''
                THEN :P_CENTRO_COSTO_3
                ELSE "CENTRO_COSTO_3"
            END,

        "CENTRO_COSTO_4" =
            CASE
                WHEN IFNULL(:P_CENTRO_COSTO_4, '') <> ''
                THEN :P_CENTRO_COSTO_4
                ELSE "CENTRO_COSTO_4"
            END,
            
        "FECHA_REQUERIDA" =
            CASE
                WHEN IFNULL(:P_FECHA_REQUERIDA, '') <> ''
                THEN :P_FECHA_REQUERIDA
                ELSE "FECHA_REQUERIDA"
            END,

        "ESTATUS" =
            CASE
                WHEN IFNULL(:P_ESTATUS, '') <> ''
                THEN :P_ESTATUS
                ELSE "ESTATUS"
            END,

        "DOC_NUM" =
            CASE
                WHEN IFNULL(:P_DOC_NUM, '') <> ''
                THEN :P_DOC_NUM
                ELSE "DOC_NUM"
            END,

        "DOC_ENTRY" =
            CASE
                WHEN IFNULL(:P_DOC_ENTRY, '') <> ''
                THEN :P_DOC_ENTRY
                ELSE "DOC_ENTRY"
            END,

        "RESPONSE_SAP" =
            CASE
                WHEN IFNULL(:P_RESPONSE_SAP, '') <> ''
                THEN :P_RESPONSE_SAP
                ELSE "RESPONSE_SAP"
            END

    WHERE "ID_SOLICITUD_COMPRA" = :P_ID_SOLICITUD_COMPRA;

    SELECT
        'OK' AS "Status",
        "FOLIO_COMPRA",
        'Cabecera actualizada correctamente' AS "Message"
    FROM "PdxMTTOMPSolicitudCompra" WHERE "ID_SOLICITUD_COMPRA" = :P_ID_SOLICITUD_COMPRA;

END


-- ============================================================================
-- SP: SpPdxMTTOValidarProductosTerminadosExistentes
-- ============================================================================
CREATE PROCEDURE "SpPdxMTTOValidarProductosTerminadosExistentes"(
    IN p_IDS_JSON NCLOB,
    IN p_TIPO_PROCESO NVARCHAR(10)
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN

    DECLARE v_TIPO NVARCHAR(10) = UPPER(:p_TIPO_PROCESO);

    IF :v_TIPO NOT IN ('PVC', 'PEAD', 'INYECCION', 'CORR') THEN
        SIGNAL SQL_ERROR_CODE 10001
            SET MESSAGE_TEXT = 'Tipo de proceso no vÃ¡lido. Use PVC, PEAD, INYECCION o CORR.';
    END IF;

    LT_IDS = SELECT "id" AS ID_PRODUCTO_TERMINADO
    FROM JSON_TABLE(
        :p_IDS_JSON, '$[*]'
        COLUMNS(
            "id" INTEGER PATH '$'
        )
    );

    LT_EXISTENTES =
        SELECT
            "ID_PRODUCTO_TERMINADO",
            "MES",
            "FECHA",
            "FECHA_CREACION",
            "LINEA",
            "PRODUCTO",
            "TURNO"
        FROM "PdxMTTOTiemposMuertosProduccionPVC"
        WHERE "ID_PRODUCTO_TERMINADO" IS NOT NULL AND :v_TIPO = 'PVC'
        UNION ALL
        SELECT
            "ID_PRODUCTO_TERMINADO",
            "MES",
            "FECHA",
            "FECHA_CREACION",
            "LINEA",
            "PRODUCTO",
            "TURNO"
        FROM "PdxMTTOTiemposMuertosProduccionPeadLiso"
        WHERE "ID_PRODUCTO_TERMINADO" IS NOT NULL AND :v_TIPO = 'PEAD'
        UNION ALL
        SELECT
            "ID_PRODUCTO_TERMINADO",
            "MES",
            "FECHA",
            "FECHA_CREACION",
            "LINEA",
            "PRODUCTO",
            "TURNO"
        FROM "PdxMTTOTiemposMuertosProduccionINY"
        WHERE "ID_PRODUCTO_TERMINADO" IS NOT NULL AND :v_TIPO = 'INYECCION'
        UNION ALL
        SELECT
            "ID_PRODUCTO_TERMINADO",
            "MES",
            "FECHA",
            "FECHA_CREACION",
            "LINEA",
            "PRODUCTO",
            "TURNO"
        FROM "PdxMTTOTiemposMuertosProduccionCorrugado"
        WHERE "ID_PRODUCTO_TERMINADO" IS NOT NULL AND :v_TIPO = 'CORR';

    SELECT
        IDS.ID_PRODUCTO_TERMINADO AS "ID_PRODUCTO_TERMINADO",
        CASE
            WHEN TMP."ID_PRODUCTO_TERMINADO" IS NOT NULL THEN 'SI'
            ELSE 'NO'
        END AS "EXISTE",
        TMP."PRODUCTO" AS "PRODUCTO",
        TMP."MES" AS "MES",
        TMP."FECHA" AS "FECHA",
        TMP."FECHA_CREACION" AS "FECHA_CREACION",
        TMP."LINEA" AS "LINEA",
        TMP."TURNO" AS "TURNO"
    FROM :LT_IDS AS IDS
    LEFT JOIN :LT_EXISTENTES AS TMP
        ON TMP."ID_PRODUCTO_TERMINADO" = IDS.ID_PRODUCTO_TERMINADO;

END


-- ============================================================================
-- SP: SpPdxMTTOUpdateUDFSalida
-- ============================================================================
CREATE PROCEDURE "DBADMIN"."SpPdxMTTOUpdateUDFSalida"
(
    IN P_DOCENTRY INT,
    IN P_FECHA_SOLICITUD TIMESTAMP,
    IN P_FOLIO NVARCHAR(20),
    IN P_ORDEN_TRABAJO NVARCHAR(30),
    IN P_REFACCION_SOLICITADA NVARCHAR(100),
    IN P_SOLICITANTE NVARCHAR(100),

    OUT O_ERROR INT,
    OUT O_MSG NVARCHAR(200)
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN

    -- ï¿½ï¿½ Handler (try/catch)
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        O_ERROR := 1;
        O_MSG := ::SQL_ERROR_MESSAGE;
    END;

    -- InicializaciÃ³n
    O_ERROR := 0;
    O_MSG := 'OK';

    -- ï¿½ï¿½ ValidaciÃ³n obligatoria
    IF :P_DOCENTRY IS NULL THEN
        SIGNAL SQL_ERROR_CODE 10001
        SET MESSAGE_TEXT = 'DocEntry es obligatorio';
    END IF;

    -- ï¿½ï¿½ Validar existencia del documento
    IF NOT EXISTS (
        SELECT 1 FROM OIGE WHERE "DocEntry" = :P_DOCENTRY
    ) THEN
        SIGNAL SQL_ERROR_CODE 10002
        SET MESSAGE_TEXT = 'El DocEntry no existe';
    END IF;

    -- ï¿½ï¿½ Updates dinÃ¡micos por campo

    --IF :P_FECHA_SOLICITUD IS NOT NULL THEN
    --    UPDATE OIGE
    --    SET "U_PDX_FECHA_SOLICITUD" = :P_FECHA_SOLICITUD
    --    WHERE "DocEntry" = :P_DOCENTRY;
    --END IF;

    --IF :P_FOLIO IS NOT NULL THEN
    --    UPDATE OIGE
    --    SET "U_PDX_FOLIO" = :P_FOLIO
    --    WHERE "DocEntry" = :P_DOCENTRY;
    --END IF;

    IF :P_ORDEN_TRABAJO IS NOT NULL THEN
        UPDATE OIGE
        SET "U_PDX_ORDEN_TRABAJO" = :P_ORDEN_TRABAJO
        WHERE "DocEntry" = :P_DOCENTRY;
    END IF;

    --IF :P_REFACCION_SOLICITADA IS NOT NULL THEN
    --    UPDATE OIGE
    --    SET "U_PDX_REFACCION_SOLICITADA" = :P_REFACCION_SOLICITADA
    --    WHERE "DocEntry" = :P_DOCENTRY;
    --END IF;

    IF :P_SOLICITANTE IS NOT NULL THEN
        UPDATE OIGE
        SET "U_U_PDX_SOLICITANTE" = :P_SOLICITANTE
        WHERE "DocEntry" = :P_DOCENTRY;
    END IF;

    O_MSG := 'ActualizaciÃ³n realizada correctamente';

END


-- ============================================================================
-- SP: SpPdxMTTOCantidadesRequisicionXAlmacen
-- ============================================================================
CREATE PROCEDURE "DBADMIN"."SpPdxMTTOCantidadesRequisicionXAlmacen"
(
    IN P_WHSCODE NVARCHAR(8),
    IN P_ITEMCODE NVARCHAR(50),
    IN P_ITEMNAME NVARCHAR(100)
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN

    SELECT
        A1.GrupoArticulo,
        A1.Activo,
        A1.CodigoArticulo,
        A1.NombreArticulo,
        A1.UMI,
        A1.NivelesDeStock,

        A1.Stock,
        COALESCE(A1.Min,0) AS Min,
        COALESCE(A1.Max,0) AS Max,
        COALESCE(A1.Requis,0) AS Requis,
        COALESCE(A1.Pedidos,0) AS Pedidos,
        COALESCE(A1.CantSalidaPromMensual,0) AS CantidadSalidaPromMensual,
        COALESCE(A1.CantMaxSalidaMensual,0) AS CantMaxSalidaMensual,

        (
            IFNULL(A1.Max, 0) - (
                IFNULL(A1.Stock, 0) + IFNULL(A1.Requis, 0) + IFNULL(A1.Pedidos, 0)
            )
        ) AS Solicitar,

        CASE
            WHEN (
                IFNULL(A1.Max, 0) - (
                    IFNULL(A1.Stock, 0) + IFNULL(A1.Requis, 0) + IFNULL(A1.Pedidos, 0)
                )
            ) < 0 THEN 'Stop!'
            ELSE 'Go!'
        END AS StatusValidacion

    FROM
    (
        SELECT
            b."ItmsGrpNam" AS GrupoArticulo,
            a."validFor" AS Activo,
            a."ItemCode" AS CodigoArticulo,
            a."ItemName" AS NombreArticulo,
            a."InvntryUom" AS UMI,

            w."OnHand" AS Stock,

            CASE
                WHEN a."ByWh" = 'Y' THEN 'Por Almacen'
                ELSE 'General'
            END AS NivelesDeStock,

            CASE WHEN a."ByWh" = 'Y' THEN w."MinStock" ELSE a."MinLevel" END AS Min,
            CASE WHEN a."ByWh" = 'Y' THEN w."MaxStock" ELSE a."MaxLevel" END AS Max,

            (
                SELECT SUM(x."OpenCreQty")
                FROM PRQ1 x
                INNER JOIN OPRQ y ON y."DocEntry" = x."DocEntry"
                WHERE y."CANCELED" = 'N'
                  AND y."DocStatus" = 'O'
                  AND x."LineStatus" = 'O'
                  AND x."WhsCode" = :P_WHSCODE
                  AND x."ItemCode" = a."ItemCode"
            ) AS Requis,

            (
                SELECT SUM(x."OpenCreQty")
                FROM POR1 x
                INNER JOIN OPOR y ON y."DocEntry" = x."DocEntry"
                WHERE y."CANCELED" = 'N'
                  AND y."DocStatus" = 'O'
                  AND x."LineStatus" = 'O'
                  AND x."WhsCode" = :P_WHSCODE
                  AND x."ItemCode" = a."ItemCode"
            ) AS Pedidos,

            ROUND((
                SELECT SUM(z.Cant) / COUNT(z.Mes)
                FROM (
                    SELECT MONTH(y."DocDate") Mes, SUM(x."Quantity") Cant
                    FROM IGE1 x
                    INNER JOIN OIGE y ON y."DocEntry" = x."DocEntry"
                    WHERE x."ItemCode" = a."ItemCode"
                      AND x."WhsCode" = :P_WHSCODE
                      AND y."DocDate" BETWEEN ADD_MONTHS(CURRENT_DATE, -12) AND CURRENT_DATE
                    GROUP BY MONTH(y."DocDate")
                ) z
            ),0) AS CantSalidaPromMensual,

            (
                SELECT MAX(z.Cant)
                FROM (
                    SELECT MONTH(y."DocDate") Mes, SUM(x."Quantity") Cant
                    FROM IGE1 x
                    INNER JOIN OIGE y ON y."DocEntry" = x."DocEntry"
                    WHERE x."ItemCode" = a."ItemCode"
                      AND x."WhsCode" = :P_WHSCODE
                      AND y."DocDate" BETWEEN ADD_MONTHS(CURRENT_DATE, -12) AND CURRENT_DATE
                    GROUP BY MONTH(y."DocDate")
                ) z
            ) AS CantMaxSalidaMensual

        FROM OITM a
        INNER JOIN OITB b ON a."ItmsGrpCod" = b."ItmsGrpCod"
        INNER JOIN OITW w 
            ON a."ItemCode" = w."ItemCode" 
            AND w."WhsCode" = :P_WHSCODE

        WHERE 
            a."ItmsGrpCod" = 104

            -- ï¿½ï¿½ FILTROS DINÃMICOS
            AND (
                :P_ITEMCODE IS NULL 
                OR a."ItemCode" LIKE '%' || :P_ITEMCODE || '%'
            )
            AND (
                :P_ITEMNAME IS NULL 
                OR a."ItemName" LIKE '%' || :P_ITEMNAME || '%'
            )

    ) A1
    
    ORDER BY A1.CodigoArticulo;  -- ï¿½ï¿½

END


-- ============================================================================
-- SP: SpPdxMTTOConsultaOrdenesFabricacion
-- ============================================================================
CREATE PROCEDURE "DBADMIN"."SpPdxMTTOConsultaOrdenesFabricacion" (
    IN P_DOC_ENTRY INTEGER,              -- NÃºmero interno de la orden
    IN P_DOC_NUM INTEGER,                -- NÃºmero de documento
    IN P_ITEM_CODE NVARCHAR(50),         -- CÃ³digo de artÃ­culo
    IN P_WAREHOUSE NVARCHAR(8),          -- AlmacÃ©n
    IN P_STATUS NVARCHAR(1),             -- Estado: P=Planeada, R=Liberada, C=Cerrada
    IN P_FECHA_INICIO DATE,              -- Fecha inicio rango
    IN P_FECHA_FIN DATE,                 -- Fecha fin rango
    IN P_SERIE NVARCHAR(3),              -- Serie del documento
    IN P_PRIORITY INTEGER                -- Prioridad
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN
    SELECT 
        -- ï¿½ï¿½ï¿½ï¿½ Datos principales de la orden
        O."DocEntry" AS "DOC_ENTRY",
        O."DocNum" AS "DOC_NUM",
        O."Series" AS "SERIE",
        O."Status" AS "STATUS",
        CASE O."Status"
            WHEN 'P' THEN 'Planeada'
            WHEN 'R' THEN 'Liberada'
            WHEN 'C' THEN 'Cerrada'
            WHEN 'L' THEN 'Cancelada'
            ELSE O."Status"
        END AS "STATUS_DESC",
        
        -- ï¿½ï¿½ï¿½ï¿½ InformaciÃ³n del artÃ­culo
        O."ItemCode" AS "ITEM_CODE",
        I."ItemName" AS "ITEM_NAME",
        I."FrgnName" AS "ITEM_DESCRIPCION",
        O."PlannedQty" AS "CANTIDAD_PLANEADA",
        O."CmpltQty" AS "CANTIDAD_COMPLETADA",
        (O."PlannedQty" - O."CmpltQty") AS "CANTIDAD_PENDIENTE",
        O."RjctQty" AS "CANTIDAD_RECHAZADA",
        
        -- ï¿½ï¿½ï¿½ï¿½ Fechas
        TO_VARCHAR(O."PostDate", 'DD/MM/YYYY') AS "FECHA_CONTABILIZACION",
        TO_VARCHAR(O."DueDate", 'DD/MM/YYYY') AS "FECHA_VENCIMIENTO",
        TO_VARCHAR(O."StartDate", 'DD/MM/YYYY') AS "FECHA_INICIO",
        TO_VARCHAR(O."CloseDate", 'DD/MM/YYYY') AS "FECHA_CIERRE",
        TO_VARCHAR(O."RlsDate", 'DD/MM/YYYY') AS "FECHA_LIBERACION",
        
        -- ï¿½ï¿½ï¿½ï¿½ AlmacÃ©n y ubicaciÃ³n
        O."Warehouse" AS "ALMACEN",
        W."WhsName" AS "ALMACEN_NOMBRE",
        O."Uom" AS "UNIDAD_MEDIDA",
        
        -- ï¿½ï¿½ï¿½ï¿½ Prioridad y otros
        O."Priority" AS "PRIORIDAD",
        CASE O."Priority"
            WHEN 0 THEN 'Baja'
            WHEN 1 THEN 'Media'
            WHEN 2 THEN 'Alta'
            ELSE 'N/A'
        END AS "PRIORIDAD_DESC",
        
        -- ï¿½ï¿½ï¿½ï¿½ Origen y referencia
        O."OriginAbs" AS "ORIGEN_DOC_ENTRY",
        O."OriginNum" AS "ORIGEN_DOC_NUM",
        O."OriginType" AS "ORIGEN_TIPO",
        
        -- ï¿½ï¿½ï¿½ï¿½ Tipo de orden
        O."Type" AS "TIPO_ORDEN",
        CASE O."Type"
            WHEN 'S' THEN 'EstÃ¡ndar'
            WHEN 'P' THEN 'ProducciÃ³n'
            WHEN 'A' THEN 'Ensamble'
            WHEN 'D' THEN 'Desensamble'
            ELSE O."Type"
        END AS "TIPO_ORDEN_DESC",
        
        -- ï¿½ï¿½ï¿½ï¿½ Usuario y comentarios
        O."UserSign" AS "USUARIO_ID",
        U."USER_CODE" AS "USUARIO_CODIGO",
        O."Comments" AS "COMENTARIOS",
        O."JrnlMemo" AS "NOTA",
        
        -- ï¿½ï¿½ï¿½ï¿½ Proyecto y centro de costo
        O."Project" AS "PROYECTO",
        O."OcrCode" AS "CENTRO_COSTOS",
        O."OcrCode2" AS "REGLA_DISTRIBUCION",

        
        -- ï¿½ï¿½ï¿½ï¿½ Porcentaje de completado
        CASE 
            WHEN O."PlannedQty" > 0 THEN 
                ROUND((O."CmpltQty" / O."PlannedQty") * 100, 2)
            ELSE 0
        END AS "PORCENTAJE_COMPLETADO",
        
        -- ï¿½ï¿½ï¿½ï¿½ AuditorÃ­a
        TO_VARCHAR(O."CreateDate", 'DD/MM/YYYY') AS "FECHA_CREACION",
        TO_VARCHAR(O."UpdateDate", 'DD/MM/YYYY') AS "FECHA_ACTUALIZACION"
        
    FROM "OWOR" O
    -- Join con artÃ­culos
    LEFT JOIN "OITM" I
        ON O."ItemCode" = I."ItemCode"
    -- Join con almacenes
    LEFT JOIN "OWHS" W
        ON O."Warehouse" = W."WhsCode"
    -- Join con usuarios
    LEFT JOIN "OUSR" U
        ON O."UserSign" = U."USERID"
    
    WHERE 
    -- Filtros opcionales
    (:P_DOC_ENTRY IS NULL OR O."DocEntry" = :P_DOC_ENTRY)
    AND (:P_DOC_NUM IS NULL OR O."DocNum" = :P_DOC_NUM)
    AND (:P_ITEM_CODE IS NULL OR O."ItemCode" LIKE '%' || :P_ITEM_CODE || '%')
    AND (:P_WAREHOUSE IS NULL OR O."Warehouse" = :P_WAREHOUSE)
    AND (:P_STATUS IS NULL OR O."Status" = :P_STATUS)
    AND (:P_SERIE IS NULL OR O."Series" = :P_SERIE)
    AND (:P_PRIORITY IS NULL OR O."Priority" = :P_PRIORITY)
    -- Filtro por rango de fechas (solo si AMBAS fechas vienen con valor)
    AND (
        :P_FECHA_INICIO IS NULL 
        OR :P_FECHA_FIN IS NULL
        OR O."PostDate" BETWEEN :P_FECHA_INICIO AND :P_FECHA_FIN
    )

ORDER BY O."DocNum" DESC;
    
END;


-- ============================================================================
-- SP: SpPdxMTTOInsertarSolicitudRefaccionCorrectivo
-- ============================================================================
CREATE PROCEDURE "DBADMIN"."SpPdxMTTOInsertarSolicitudRefaccionCorrectivo"(
    IN p_ORDEN_TRABAJO NVARCHAR(50),
    IN p_REFACCION_SOLICITADA NVARCHAR(200),
    IN p_CANTIDAD INT,
    IN p_NIVEL_URGENCIA NVARCHAR(20),
    IN p_DESCRIPCION_NECESIDAD NVARCHAR(500),
    IN p_USUARIO_SOLICITA NVARCHAR(50)
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN
    DECLARE V_FECHA_MEXICO LONGDATE;
    
    -- Obtener fecha/hora de MÃ©xico (UTC-6)
    SELECT ADD_SECONDS(CURRENT_UTCTIMESTAMP, -6*3600) INTO V_FECHA_MEXICO FROM DUMMY;
    
    -- Insertar la nueva solicitud de refacciÃ³n
    INSERT INTO "DBADMIN"."PdxMTTOMCSolicitudRefacciones" (
        "ORDEN_TRABAJO",
        "REFACCION_SOLICITADA",
        "CANTIDAD",
        "NIVEL_URGENCIA",
        "DESCRIPCION_NECESIDAD",
        "FECHA_SOLICITUD",
        "ESTATUS",
        "USUARIO_SOLICITA"
    )
    VALUES (
        :p_ORDEN_TRABAJO,
        :p_REFACCION_SOLICITADA,
        :p_CANTIDAD,
        :p_NIVEL_URGENCIA,
        :p_DESCRIPCION_NECESIDAD,
        :V_FECHA_MEXICO,
        'Pendiente',
        :p_USUARIO_SOLICITA
    );
    
    -- Retornar el ID reciÃ©n insertado
    SELECT 
        CURRENT_IDENTITY_VALUE() AS "ID_SOLICITUD",
        :p_ORDEN_TRABAJO AS "ORDEN_TRABAJO",
        'Pendiente' AS "ESTATUS"
    FROM DUMMY;
    
END;


