SET SCHEMA "PTM_2022_FINAL";
-- 2026-11-24: Refacciones de la OT -> la orden debe volver a LIBERADO cuando ya
-- no queda ninguna refaccion pendiente.
--
-- Caso reportado: OTMC-072 con 2 refacciones (una surtida y otra cancelada por
-- el tecnico) se queda en "En espera de refaccion" (ESTATUS = 3).
--
-- Causa:
--   1) SpPdxMTTOGetBalanceOT solo excluia 'ELIMINADA'; una solicitud 'Cerrada'
--      seguia contando como bloqueante, asi que OT_LIBERADA = 0.
--   2) La liberacion solo se ejecutaba despues de una SALIDA de mercancia.
--      Al cerrar/eliminar la ultima refaccion sin salida, nadie reevaluaba.
--   3) El endpoint que cierra la solicitud desde la OT forzaba ESTATUS = 2 sin
--      revisar si quedaban refacciones pendientes (liberaba antes de tiempo).
--
-- Cambios (todos en BD, sin DLL):
--   - SpPdxMTTOGetBalanceOT: una solicitud 'Cerrada' o 'ELIMINADA' ya no bloquea.
--   - SpPdxMTTOActualizarSolicitudRefaccion: al terminar, reevalua y libera la OT
--     (solo si estaba en 3 y ya no hay bloqueantes).
--   - SpPdxMTTOUpdateEstatusSolicitud: mismo reevaluado (cubre Atendida/ELIMINADA).
--   - SpPdxMTTOActualizaMC / SpPdxMTTOActualizaMP: al intentar poner ESTATUS = 2
--     se respeta la regla: si quedan refacciones bloqueantes, la OT sigue en 3.
--
-- Criterio "bloqueante": ESTATUS no es ELIMINADA ni Cerrada y ademas no esta
-- completamente surtida (salida >= solicitada), ni devuelta completa, ni con
-- rechazo de devolucion. Es el mismo criterio de SpPdxMTTOGetBalanceOT.
--
-- Rollback: restaurar las versiones anteriores de los 5 SP (ver
-- SQL_MIGRACION/HISTORIAL o el respaldo del dia) y volver a crear los SP.

-- ============================================================
-- 1) SpPdxMTTOGetBalanceOT  (no bloquean las solicitudes canceladas)
-- ============================================================
ALTER PROCEDURE "PTM_2022_FINAL"."SpPdxMTTOGetBalanceOT"
(
    IN P_ORDEN_TRABAJO NVARCHAR(50)
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN

    -- Query 1: detalle por solicitud de refaccion
    SELECT
        SR."ID_SOLICITUD",
        SR."REFACCION_SOLICITADA"            AS "ItemCode",
        SR."CANTIDAD"                         AS "CantidadSolicitada",
        IFNULL(MOV."CANTIDAD_SALIDA",      0) AS "CantidadSalida",
        IFNULL(MOV."CANTIDAD_DEVOLUCION",  0) AS "CantidadDevolucion",
        CASE WHEN RD."ID_SALIDA" IS NOT NULL THEN 1 ELSE 0 END AS "TieneRechazo",
        ( SR."CANTIDAD" - IFNULL(MOV."CANTIDAD_SALIDA", 0) ) AS "Diferencia",
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
        --   1) Se surtio completo
        --   2) Se devolvio todo lo que salio
        --   3) Existe un rechazo de devolucion
        --   4) La solicitud se cancelo (Cerrada por el tecnico / ELIMINADA por almacen)
        CASE
            WHEN UPPER(SR."ESTATUS") IN ('ELIMINADA', 'CERRADA') THEN 1
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
    LEFT JOIN (
        SELECT "ID_SALIDA"
        FROM "PdxMTTORechazoDevolucion"
        GROUP BY "ID_SALIDA"
    ) RD ON RD."ID_SALIDA" = SR."ID_SOLICITUD"
    WHERE
        SR."ORDEN_TRABAJO" = :P_ORDEN_TRABAJO
        AND UPPER(SR."ESTATUS") <> 'ELIMINADA'
    ORDER BY
        SR."REFACCION_SOLICITADA";

    -- Query 2: resumen de la OT en una sola fila
    SELECT
        :P_ORDEN_TRABAJO  AS "ORDEN_TRABAJO",
        COUNT(*)          AS "TOTAL_SOLICITUDES",
        SUM(
            CASE
                WHEN UPPER(SR2."ESTATUS") IN ('ELIMINADA', 'CERRADA') THEN 1
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
                    WHEN UPPER(SR2."ESTATUS") IN ('ELIMINADA', 'CERRADA') THEN 1
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
        AND UPPER(SR2."ESTATUS") <> 'ELIMINADA';

END

-- @@

-- ============================================================
-- 2) SpPdxMTTOActualizarSolicitudRefaccion
--    (al cerrar/rechazar/autorizar reevalua y libera la OT)
-- ============================================================
ALTER PROCEDURE "PTM_2022_FINAL"."SpPdxMTTOActualizarSolicitudRefaccion"(
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
    DECLARE V_OT NVARCHAR(50);
    DECLARE V_BLOQUEAN INT := 0;

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
        SET MESSAGE_TEXT = 'No se encontro la solicitud especificada';
    END IF;

    SELECT COUNT(*)
    INTO V_PENDIENTES
    FROM "PdxMTTOMPSolicitudRefacciones"
    WHERE "ORDEN_TRABAJO" = :P_ORDENTRABAJO
      AND UPPER("ESTATUS") = 'PENDIENTE';

    -- Liberar la OT si ya no quedan refacciones que la bloqueen
    SELECT "ORDEN_TRABAJO" INTO V_OT
      FROM "PdxMTTOMPSolicitudRefacciones"
     WHERE "ID_SOLICITUD" = :P_IDSOLICITUD;

    IF :V_OT IS NOT NULL THEN
        SELECT COUNT(*) INTO V_BLOQUEAN
          FROM "PdxMTTOMPSolicitudRefacciones" SR
          LEFT JOIN (
              SELECT "ID_SOLICITUD",
                     SUM(CASE WHEN "TIPO" = 'SALIDA'     THEN "CANTIDAD_REAL" ELSE 0 END) AS SAL,
                     SUM(CASE WHEN "TIPO" = 'DEVOLUCION' THEN "CANTIDAD_REAL" ELSE 0 END) AS DEV
                FROM "PdxMTTOMovimientosAlmacen"
               WHERE "TIPO" IN ('SALIDA', 'DEVOLUCION')
               GROUP BY "ID_SOLICITUD"
          ) MOV ON MOV."ID_SOLICITUD" = SR."ID_SOLICITUD"
          LEFT JOIN (
              SELECT "ID_SALIDA" FROM "PdxMTTORechazoDevolucion" GROUP BY "ID_SALIDA"
          ) RD ON RD."ID_SALIDA" = SR."ID_SOLICITUD"
         WHERE SR."ORDEN_TRABAJO" = :V_OT
           AND UPPER(SR."ESTATUS") NOT IN ('ELIMINADA', 'CERRADA')
           AND NOT (
                 IFNULL(MOV.SAL, 0) >= SR."CANTIDAD"
                 OR (IFNULL(MOV.SAL, 0) > 0 AND IFNULL(MOV.DEV, 0) >= IFNULL(MOV.SAL, 0))
                 OR RD."ID_SALIDA" IS NOT NULL
           );

        IF :V_BLOQUEAN = 0 THEN
            UPDATE "PdxMTTOMCGenerados"
               SET "ESTATUS" = 2
             WHERE "NUMERO_ORDEN" = :V_OT
               AND "ESTATUS" = 3;

            UPDATE "PdxMTTOMPGenerados"
               SET "ESTATUS" = 2
             WHERE "NUMERO_ORDEN" = :V_OT
               AND "ESTATUS" = 3;
        END IF;
    END IF;

    SELECT
        :P_IDSOLICITUD AS "ID_SOLICITUD",
        :V_PENDIENTES AS "PENDIENTES",
        CASE
            WHEN :V_PENDIENTES > 0 THEN 'PENDIENTE'
            ELSE 'COMPLETADA'
        END AS "ESTATUS_OT",
        :V_OT AS "ORDEN_TRABAJO",
        CASE
            WHEN :V_BLOQUEAN = 0 THEN 1
            ELSE 0
        END AS "OT_LIBERADA",
        'Refaccion actualizada correctamente' AS "MSG"
    FROM DUMMY;
END

-- @@

-- ============================================================
-- 3) SpPdxMTTOUpdateEstatusSolicitud
--    (Atendida / ELIMINADA tambien reevaluan la liberacion)
-- ============================================================
ALTER PROCEDURE "PTM_2022_FINAL"."SpPdxMTTOUpdateEstatusSolicitud"
(
    IN P_ID_SOLICITUD INT,
    IN P_ESTATUS NVARCHAR(20)
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN
    DECLARE V_FECHA_MEXICO LONGDATE;
    DECLARE V_OT NVARCHAR(50);
    DECLARE V_BLOQUEAN INT := 0;

    SELECT ADD_SECONDS(CURRENT_UTCTIMESTAMP, -6 * 3600)
    INTO V_FECHA_MEXICO
    FROM DUMMY;

    UPDATE "PdxMTTOMPSolicitudRefacciones"
    SET
        "ESTATUS" = :P_ESTATUS,
        "FECHA_ATENCION" = CASE
            WHEN :P_ESTATUS = 'Atendida' THEN :V_FECHA_MEXICO
            ELSE "FECHA_ATENCION"
        END
    WHERE "ID_SOLICITUD" = :P_ID_SOLICITUD;

    IF ::ROWCOUNT = 0 THEN
        SIGNAL SQL_ERROR_CODE 10002
        SET MESSAGE_TEXT = 'La solicitud no existe';
    END IF;

    -- Liberar la OT si ya no quedan refacciones que la bloqueen
    SELECT "ORDEN_TRABAJO" INTO V_OT
      FROM "PdxMTTOMPSolicitudRefacciones"
     WHERE "ID_SOLICITUD" = :P_ID_SOLICITUD;

    IF :V_OT IS NOT NULL THEN
        SELECT COUNT(*) INTO V_BLOQUEAN
          FROM "PdxMTTOMPSolicitudRefacciones" SR
          LEFT JOIN (
              SELECT "ID_SOLICITUD",
                     SUM(CASE WHEN "TIPO" = 'SALIDA'     THEN "CANTIDAD_REAL" ELSE 0 END) AS SAL,
                     SUM(CASE WHEN "TIPO" = 'DEVOLUCION' THEN "CANTIDAD_REAL" ELSE 0 END) AS DEV
                FROM "PdxMTTOMovimientosAlmacen"
               WHERE "TIPO" IN ('SALIDA', 'DEVOLUCION')
               GROUP BY "ID_SOLICITUD"
          ) MOV ON MOV."ID_SOLICITUD" = SR."ID_SOLICITUD"
          LEFT JOIN (
              SELECT "ID_SALIDA" FROM "PdxMTTORechazoDevolucion" GROUP BY "ID_SALIDA"
          ) RD ON RD."ID_SALIDA" = SR."ID_SOLICITUD"
         WHERE SR."ORDEN_TRABAJO" = :V_OT
           AND UPPER(SR."ESTATUS") NOT IN ('ELIMINADA', 'CERRADA')
           AND NOT (
                 IFNULL(MOV.SAL, 0) >= SR."CANTIDAD"
                 OR (IFNULL(MOV.SAL, 0) > 0 AND IFNULL(MOV.DEV, 0) >= IFNULL(MOV.SAL, 0))
                 OR RD."ID_SALIDA" IS NOT NULL
           );

        IF :V_BLOQUEAN = 0 THEN
            UPDATE "PdxMTTOMCGenerados"
               SET "ESTATUS" = 2
             WHERE "NUMERO_ORDEN" = :V_OT
               AND "ESTATUS" = 3;

            UPDATE "PdxMTTOMPGenerados"
               SET "ESTATUS" = 2
             WHERE "NUMERO_ORDEN" = :V_OT
               AND "ESTATUS" = 3;
        END IF;
    END IF;

    SELECT
        :P_ID_SOLICITUD AS "ID_SOLICITUD",
        :P_ESTATUS AS "ESTATUS",
        :V_OT AS "ORDEN_TRABAJO",
        CASE WHEN :V_BLOQUEAN = 0 THEN 1 ELSE 0 END AS "OT_LIBERADA",
        'Actualizado exitosamente' AS "MENSAJE"
    FROM DUMMY;
END

-- @@

-- ============================================================
-- 4) SpPdxMTTOActualizaMC  (no liberar si hay refacciones bloqueantes)
-- ============================================================
ALTER PROCEDURE "PTM_2022_FINAL"."SpPdxMTTOActualizaMC"(
    IN P_ID_MANTENIMIENTO INT,
    IN P_ESTATUS INT,
    IN P_USUARIO_ACTUALIZA NVARCHAR(50)
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN
    DECLARE V_FECHA_MEXICO LONGDATE;
    DECLARE V_OT NVARCHAR(50);
    DECLARE V_BLOQUEAN INT := 0;

    SELECT ADD_SECONDS(CURRENT_UTCTIMESTAMP, -6*3600) INTO V_FECHA_MEXICO FROM DUMMY;

    -- Regla: no se puede "Liberar" (2) una OT que aun tiene refacciones pendientes
    IF :P_ESTATUS = 2 THEN
        SELECT "NUMERO_ORDEN" INTO V_OT
          FROM "PdxMTTOMCGenerados"
         WHERE "ID_MANTENIMIENTO" = :P_ID_MANTENIMIENTO;

        IF :V_OT IS NOT NULL THEN
            SELECT COUNT(*) INTO V_BLOQUEAN
              FROM "PdxMTTOMPSolicitudRefacciones" SR
              LEFT JOIN (
                  SELECT "ID_SOLICITUD",
                         SUM(CASE WHEN "TIPO" = 'SALIDA'     THEN "CANTIDAD_REAL" ELSE 0 END) AS SAL,
                         SUM(CASE WHEN "TIPO" = 'DEVOLUCION' THEN "CANTIDAD_REAL" ELSE 0 END) AS DEV
                    FROM "PdxMTTOMovimientosAlmacen"
                   WHERE "TIPO" IN ('SALIDA', 'DEVOLUCION')
                   GROUP BY "ID_SOLICITUD"
              ) MOV ON MOV."ID_SOLICITUD" = SR."ID_SOLICITUD"
              LEFT JOIN (
                  SELECT "ID_SALIDA" FROM "PdxMTTORechazoDevolucion" GROUP BY "ID_SALIDA"
              ) RD ON RD."ID_SALIDA" = SR."ID_SOLICITUD"
             WHERE SR."ORDEN_TRABAJO" = :V_OT
               AND UPPER(SR."ESTATUS") NOT IN ('ELIMINADA', 'CERRADA')
               AND NOT (
                     IFNULL(MOV.SAL, 0) >= SR."CANTIDAD"
                     OR (IFNULL(MOV.SAL, 0) > 0 AND IFNULL(MOV.DEV, 0) >= IFNULL(MOV.SAL, 0))
                     OR RD."ID_SALIDA" IS NOT NULL
               );
        END IF;
    END IF;

    UPDATE "PdxMTTOMCGenerados"
    SET
        ESTATUS =
            CASE
                WHEN :P_ESTATUS = 2 AND :V_BLOQUEAN > 0 THEN ESTATUS
                ELSE :P_ESTATUS
            END,
        USUARIO_ACTUALIZA = :P_USUARIO_ACTUALIZA,
        HORA_CIERRE = CASE
            WHEN :P_ESTATUS = 4 THEN :V_FECHA_MEXICO
            ELSE HORA_CIERRE
        END
    WHERE ID_MANTENIMIENTO = :P_ID_MANTENIMIENTO;

    IF ::ROWCOUNT = 0 THEN
        SIGNAL SQL_ERROR_CODE 10001
        SET MESSAGE_TEXT = 'No se encontro el mantenimiento con el ID especificado';
    END IF;

    SELECT
        :P_ID_MANTENIMIENTO AS "ID_MANTENIMIENTO",
        :P_ESTATUS AS "ESTATUS",
        :V_BLOQUEAN AS "REFACCIONES_BLOQUEAN",
        'Actualizado exitosamente' AS "MENSAJE"
    FROM DUMMY;
END

-- @@

-- ============================================================
-- 5) SpPdxMTTOActualizaMP  (misma regla para preventivos)
-- ============================================================
ALTER PROCEDURE "PTM_2022_FINAL"."SpPdxMTTOActualizaMP"(
    IN P_ID_MANTENIMIENTO INT,
    IN P_ORDENTRABAJO NVARCHAR(50),
    IN P_ESTATUS INT,
    IN P_USUARIOACTUALIZA NVARCHAR(50)
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN
    DECLARE V_FECHA_MEXICO LONGDATE;
    DECLARE V_OT NVARCHAR(50);
    DECLARE V_BLOQUEAN INT := 0;

    IF :P_ID_MANTENIMIENTO IS NULL
       AND (:P_ORDENTRABAJO IS NULL OR TRIM(:P_ORDENTRABAJO) = '') THEN

        SIGNAL SQL_ERROR_CODE 10002
        SET MESSAGE_TEXT = 'Debe especificar ID_MANTENIMIENTO o ORDEN_TRABAJO';

    END IF;

    SELECT ADD_SECONDS(CURRENT_UTCTIMESTAMP, -6 * 3600)
    INTO V_FECHA_MEXICO
    FROM DUMMY;

    -- Regla: no se puede "Liberar" (2) una OT que aun tiene refacciones pendientes
    IF :P_ESTATUS = 2 THEN
        IF :P_ORDENTRABAJO IS NOT NULL AND TRIM(:P_ORDENTRABAJO) <> '' THEN
            V_OT := :P_ORDENTRABAJO;
        ELSE
            SELECT "NUMERO_ORDEN" INTO V_OT
              FROM "PdxMTTOMPGenerados"
             WHERE "ID_MANTENIMIENTO" = :P_ID_MANTENIMIENTO;
        END IF;

        IF :V_OT IS NOT NULL THEN
            SELECT COUNT(*) INTO V_BLOQUEAN
              FROM "PdxMTTOMPSolicitudRefacciones" SR
              LEFT JOIN (
                  SELECT "ID_SOLICITUD",
                         SUM(CASE WHEN "TIPO" = 'SALIDA'     THEN "CANTIDAD_REAL" ELSE 0 END) AS SAL,
                         SUM(CASE WHEN "TIPO" = 'DEVOLUCION' THEN "CANTIDAD_REAL" ELSE 0 END) AS DEV
                    FROM "PdxMTTOMovimientosAlmacen"
                   WHERE "TIPO" IN ('SALIDA', 'DEVOLUCION')
                   GROUP BY "ID_SOLICITUD"
              ) MOV ON MOV."ID_SOLICITUD" = SR."ID_SOLICITUD"
              LEFT JOIN (
                  SELECT "ID_SALIDA" FROM "PdxMTTORechazoDevolucion" GROUP BY "ID_SALIDA"
              ) RD ON RD."ID_SALIDA" = SR."ID_SOLICITUD"
             WHERE SR."ORDEN_TRABAJO" = :V_OT
               AND UPPER(SR."ESTATUS") NOT IN ('ELIMINADA', 'CERRADA')
               AND NOT (
                     IFNULL(MOV.SAL, 0) >= SR."CANTIDAD"
                     OR (IFNULL(MOV.SAL, 0) > 0 AND IFNULL(MOV.DEV, 0) >= IFNULL(MOV.SAL, 0))
                     OR RD."ID_SALIDA" IS NOT NULL
               );
        END IF;
    END IF;

    UPDATE "PdxMTTOMPGenerados"
    SET
        ESTATUS =
            CASE
                WHEN :P_ESTATUS = 2 AND :V_BLOQUEAN > 0 THEN ESTATUS
                ELSE :P_ESTATUS
            END,
        USUARIO_ACTUALIZA = :P_USUARIOACTUALIZA,
        HORA_CIERRE =
            CASE
                WHEN :P_ESTATUS = 4 THEN :V_FECHA_MEXICO
                ELSE HORA_CIERRE
            END
    WHERE
        (
            :P_ID_MANTENIMIENTO IS NOT NULL
            AND ID_MANTENIMIENTO = :P_ID_MANTENIMIENTO
        )
        OR
        (
            :P_ID_MANTENIMIENTO IS NULL
            AND :P_ORDENTRABAJO IS NOT NULL
            AND NUMERO_ORDEN = :P_ORDENTRABAJO
        );

    IF ::ROWCOUNT = 0 THEN
        SIGNAL SQL_ERROR_CODE 10001
        SET MESSAGE_TEXT = 'No se encontro el mantenimiento con el ID o Numero de Orden especificados';
    END IF;

    SELECT
        COALESCE(:P_ID_MANTENIMIENTO, 0) AS "ID_MANTENIMIENTO",
        :P_ORDENTRABAJO AS "NUMERO_ORDEN",
        :P_ESTATUS AS "ESTATUS",
        :V_BLOQUEAN AS "REFACCIONES_BLOQUEAN",
        'Actualizado exitosamente' AS "MENSAJE"
    FROM DUMMY;
END

