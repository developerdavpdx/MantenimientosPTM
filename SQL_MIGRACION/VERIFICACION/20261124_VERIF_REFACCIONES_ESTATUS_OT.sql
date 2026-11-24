-- Verificacion: por que una OT esta en "En espera de refaccion" (ESTATUS = 3).
-- Cambia 'OTMC-072' por la OT que quieras revisar y ajusta el esquema si hace falta
-- (en TEST_JUNIO_2026 / PTM_2022_FINAL agrega SET SCHEMA al inicio).
--
-- BLOQUEA = 1 significa que esa solicitud todavia impide liberar la OT.
-- Si todas salen con BLOQUEA = 0, la OT debe pasar a Liberado (2): corre el
-- barrido 20261124_REFACCIONES_BARRIDO_OT_EN_ESPERA_<schema>.sql o pide a la
-- aplicacion que vuelva a evaluar (cerrar/atender cualquier refaccion).

SELECT
    MC."NUMERO_ORDEN",
    MC."ESTATUS"                             AS "ESTATUS_OT",
    SR."ID_SOLICITUD",
    SR."REFACCION_SOLICITADA",
    SR."CANTIDAD"                            AS "SOLICITADO",
    SR."ESTATUS"                             AS "ESTATUS_REFACCION",
    IFNULL(MOV.SAL, 0)                       AS "SURTIDO",
    IFNULL(MOV.DEV, 0)                       AS "DEVUELTO",
    CASE WHEN RD."ID_SALIDA" IS NOT NULL THEN 1 ELSE 0 END AS "RECHAZO_DEVOLUCION",
    CASE
        WHEN UPPER(SR."ESTATUS") IN ('ELIMINADA', 'CERRADA') THEN 0
        WHEN IFNULL(MOV.SAL, 0) >= SR."CANTIDAD"             THEN 0
        WHEN IFNULL(MOV.SAL, 0) > 0
         AND IFNULL(MOV.DEV, 0) >= IFNULL(MOV.SAL, 0)        THEN 0
        WHEN RD."ID_SALIDA" IS NOT NULL                      THEN 0
        ELSE 1
    END                                      AS "BLOQUEA"
FROM "PdxMTTOMCGenerados" MC
LEFT JOIN "PdxMTTOMPSolicitudRefacciones" SR
       ON SR."ORDEN_TRABAJO" = MC."NUMERO_ORDEN"
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
WHERE MC."NUMERO_ORDEN" = 'OTMC-072'
ORDER BY SR."ID_SOLICITUD";
