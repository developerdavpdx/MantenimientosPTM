SET SCHEMA "TEST_JUNIO_2026";
-- 2026-11-24: barrido de una sola vez para las OT que YA quedaron atoradas en
-- "En espera de refaccion" (ESTATUS = 3) sin tener refacciones pendientes.
--
-- Los SP nuevos (20261124_REFACCIONES_LIBERAR_OT_AL_RESOLVER_*) solo actuan en
-- las transiciones nuevas; este script corrige el historico.
--
-- Criterio (el mismo de SpPdxMTTOGetBalanceOT): una solicitud bloquea si no esta
-- ELIMINADA ni CERRADA y ademas no esta completamente surtida (salida >=
-- solicitada), ni devuelta completa, ni con rechazo de devolucion.
--
-- Solo cambia OT en ESTATUS = 3 que ya no tengan ninguna solicitud bloqueante
-- (incluye OT en 3 sin solicitudes). No toca estatus 1, 2 ni 4.
--
-- Re-ejecutable: si vuelve a correr no encuentra OTs en 3 sin bloqueantes.

CREATE LOCAL TEMPORARY TABLE "#OT_EN_ESPERA" AS (
    SELECT
        'MC'                 AS "TIPO",
        MC."NUMERO_ORDEN"    AS "OT",
        MC."ESTATUS"         AS "ESTATUS_OT",
        (
            SELECT COUNT(*)
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
             WHERE SR."ORDEN_TRABAJO" = MC."NUMERO_ORDEN"
               AND UPPER(SR."ESTATUS") NOT IN ('ELIMINADA', 'CERRADA')
               AND NOT (
                     IFNULL(MOV.SAL, 0) >= SR."CANTIDAD"
                     OR (IFNULL(MOV.SAL, 0) > 0 AND IFNULL(MOV.DEV, 0) >= IFNULL(MOV.SAL, 0))
                     OR RD."ID_SALIDA" IS NOT NULL
               )
        )                    AS "BLOQUEAN"
      FROM "PdxMTTOMCGenerados" MC
     WHERE MC."ESTATUS" = 3

    UNION ALL

    SELECT
        'MP',
        MP."NUMERO_ORDEN",
        MP."ESTATUS",
        (
            SELECT COUNT(*)
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
             WHERE SR."ORDEN_TRABAJO" = MP."NUMERO_ORDEN"
               AND UPPER(SR."ESTATUS") NOT IN ('ELIMINADA', 'CERRADA')
               AND NOT (
                     IFNULL(MOV.SAL, 0) >= SR."CANTIDAD"
                     OR (IFNULL(MOV.SAL, 0) > 0 AND IFNULL(MOV.DEV, 0) >= IFNULL(MOV.SAL, 0))
                     OR RD."ID_SALIDA" IS NOT NULL
               )
        )
      FROM "PdxMTTOMPGenerados" MP
     WHERE MP."ESTATUS" = 3
);

-- @@

-- Diagnostico previo: que OT esta en 3 y cuantas refacciones la bloquean
SELECT "TIPO", "OT", "BLOQUEAN"
  FROM "#OT_EN_ESPERA"
 ORDER BY "BLOQUEAN" DESC, "OT";

-- @@

UPDATE "PdxMTTOMCGenerados"
   SET "ESTATUS" = 2
 WHERE "ESTATUS" = 3
   AND "NUMERO_ORDEN" IN (
        SELECT "OT" FROM "#OT_EN_ESPERA" WHERE "TIPO" = 'MC' AND "BLOQUEAN" = 0
   );

-- @@

UPDATE "PdxMTTOMPGenerados"
   SET "ESTATUS" = 2
 WHERE "ESTATUS" = 3
   AND "NUMERO_ORDEN" IN (
        SELECT "OT" FROM "#OT_EN_ESPERA" WHERE "TIPO" = 'MP' AND "BLOQUEAN" = 0
   );

-- @@

-- Resultado: OTs liberadas por este barrido
SELECT "TIPO", "OT"
  FROM "#OT_EN_ESPERA"
 WHERE "BLOQUEAN" = 0
 ORDER BY "TIPO", "OT";

-- @@

DROP TABLE "#OT_EN_ESPERA";

