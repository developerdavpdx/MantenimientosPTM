-- ============================================================================
-- 2026-11-27 | Schema: PTM_2022_FINAL | SOLO LECTURA
-- Correctivos cerrados con HORA_INICIO del tecnico en NULL.
--
-- Contexto: el reporte de Correctivos mostraba "Hora inicio (tecnico) = N/A"
-- en ordenes ya cerradas. Hasta el 20/11/2026 existia el defecto que guardaba
-- HORA_INICIO en NULL (corregido ese dia); estas ordenes quedaron sin el dato.
-- La duracion se calculo con la hora de apertura del sistema, no con la del
-- tecnico, por lo que el inicio real ya no se puede recuperar.
--
-- Este script solo diagnostica. No modifica nada.
-- ============================================================================

-- 1) Resumen por mes: cuantas OT tienen HORA_INICIO nula y como estan firmadas.
SELECT
    TO_VARCHAR(S."FECHA_CREACION", 'YYYY-MM')                       AS MES,
    COUNT(*)                                                        AS OT_CON_OT_DETALLE,
    SUM(CASE WHEN OT."HORA_INICIO" IS NULL THEN 1 ELSE 0 END)       AS SIN_HORA_INICIO,
    SUM(CASE WHEN OT."HORA_INICIO" IS NULL
              AND LENGTH(TRIM(IFNULL(OT."FIRMA_REALIZO", '')))   > 0
              AND LENGTH(TRIM(IFNULL(OT."FIRMA_SUPERVISO", ''))) > 0
             THEN 1 ELSE 0 END)                                     AS SIN_INICIO_2_FIRMAS,
    SUM(CASE WHEN OT."HORA_INICIO" IS NULL
              AND OT."HORA_FIN" IS NOT NULL
             THEN 1 ELSE 0 END)                                     AS SIN_INICIO_CON_FIN
FROM "PTM_2022_FINAL"."PdxMTTOSolicitudMC" S
INNER JOIN "PTM_2022_FINAL"."PdxMTTOMCGenerados" MCG
    ON S."ID_SOLICITUD" = MCG."ID_SOLICITUD"
INNER JOIN "PTM_2022_FINAL"."PdxMTTOOrdenesTrabajoMC" OT
    ON MCG."NUMERO_ORDEN" = OT."NUMERO_ORDEN"
GROUP BY TO_VARCHAR(S."FECHA_CREACION", 'YYYY-MM')
ORDER BY MES;

-- 2) Detalle de las OT cerradas (2 firmas) sin hora de inicio.
--    INICIO_ESTIMADO = HORA_FIN - DURACION_HRS (solo referencia; normalmente
--    coincide con la hora de apertura, no con la hora real del tecnico).
SELECT
    MCG."NUMERO_ORDEN"                                              AS ORDEN,
    TO_VARCHAR(S."FECHA_CREACION", 'YYYY-MM-DD HH24:MI')            AS FECHA_SOLICITUD,
    TO_VARCHAR(MCG."HORA_APERTURA", 'YYYY-MM-DD HH24:MI')           AS HORA_APERTURA,
    TO_VARCHAR(OT."HORA_FIN", 'YYYY-MM-DD HH24:MI')                 AS HORA_FIN_TECNICO,
    OT."DURACION_HRS"                                               AS DURACION_HRS,
    TO_VARCHAR(ADD_SECONDS(OT."HORA_FIN", -ROUND(IFNULL(OT."DURACION_HRS", 0) * 3600)),
               'YYYY-MM-DD HH24:MI')                                AS INICIO_ESTIMADO,
    CASE
        WHEN MCG."HORA_APERTURA" IS NULL OR OT."HORA_FIN" IS NULL THEN NULL
        ELSE ROUND(ABS(SECONDS_BETWEEN(MCG."HORA_APERTURA",
                 ADD_SECONDS(OT."HORA_FIN", -ROUND(IFNULL(OT."DURACION_HRS", 0) * 3600))) / 60), 1)
    END                                                             AS MINUTOS_DIF_VS_APERTURA,
    OT."FIRMA_REALIZO"                                              AS FIRMA_REALIZO,
    OT."FIRMA_SUPERVISO"                                            AS FIRMA_SUPERVISO,
    ESOT."DESCRIPCION"                                              AS ESTATUS
FROM "PTM_2022_FINAL"."PdxMTTOSolicitudMC" S
INNER JOIN "PTM_2022_FINAL"."PdxMTTOMCGenerados" MCG
    ON S."ID_SOLICITUD" = MCG."ID_SOLICITUD"
INNER JOIN "PTM_2022_FINAL"."PdxMTTOOrdenesTrabajoMC" OT
    ON MCG."NUMERO_ORDEN" = OT."NUMERO_ORDEN"
LEFT JOIN "PTM_2022_FINAL"."PdxMTTOEstatusOT" ESOT
    ON MCG."ESTATUS" = ESOT."ID_ESTATUS"
WHERE OT."HORA_INICIO" IS NULL
  AND LENGTH(TRIM(IFNULL(OT."FIRMA_REALIZO", '')))   > 0
  AND LENGTH(TRIM(IFNULL(OT."FIRMA_SUPERVISO", ''))) > 0
ORDER BY S."FECHA_CREACION";
