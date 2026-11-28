-- ============================================================================
-- 2026-11-27 | Schema: PTM_2022_FINAL | SOLO LECTURA
-- Preventivos: consistencia de la hora inicio / fin del tecnico.
--
-- Revisa las OT de PdxMTTOOrdenesTrabajoMP contra su periodo en
-- PdxMTTOMPGenerados. Detecta:
--   - hora inicio o fin capturada a medias,
--   - ventana invertida (inicio > fin),
--   - duracion que no cuadra con la ventana (> 0.02 h),
--   - OT con las 3 firmas (cerradas) con alguno de esos problemas,
--   - horas capturadas sin la firma del tecnico (o al reves).
--
-- No modifica nada.
-- ============================================================================

-- 1) Resumen por mes del periodo.
SELECT
    TO_VARCHAR(MPG."FECHA_INICIO_PERIODO", 'YYYY-MM')                       AS MES,
    COUNT(*)                                                              AS OT,
    SUM(CASE WHEN OT."HORA_INICIO" IS NULL THEN 1 ELSE 0 END)             AS SIN_INICIO,
    SUM(CASE WHEN OT."HORA_FIN"    IS NULL THEN 1 ELSE 0 END)             AS SIN_FIN,
    SUM(CASE WHEN OT."HORA_INICIO" IS NOT NULL AND OT."HORA_FIN" IS NOT NULL
              AND OT."HORA_INICIO" > OT."HORA_FIN" THEN 1 ELSE 0 END)     AS INVERTIDAS,
    SUM(CASE WHEN OT."HORA_INICIO" IS NOT NULL AND OT."HORA_FIN" IS NOT NULL
              AND OT."DURACION_HRS" IS NOT NULL
              AND ABS(SECONDS_BETWEEN(OT."HORA_INICIO", OT."HORA_FIN") / 3600.0
                      - CAST(OT."DURACION_HRS" AS DECIMAL(10,2))) > 0.02
             THEN 1 ELSE 0 END)                                            AS DIF_DURACION,
    SUM(CASE WHEN LENGTH(TRIM(IFNULL(OT."FIRMA_REALIZO", '')))       > 0
              AND LENGTH(TRIM(IFNULL(OT."FIRMA_SUPERVISO", '')))     > 0
              AND LENGTH(TRIM(IFNULL(OT."FIRMA_MANTENIMIENTO", ''))) > 0
              AND (OT."HORA_INICIO" IS NULL OR OT."HORA_FIN" IS NULL
                   OR OT."HORA_INICIO" > OT."HORA_FIN")
             THEN 1 ELSE 0 END)                                            AS CERRADAS_CON_PROBLEMA
FROM "PTM_2022_FINAL"."PdxMTTOMPGenerados" MPG
INNER JOIN "PTM_2022_FINAL"."PdxMTTOOrdenesTrabajoMP" OT
    ON MPG."NUMERO_ORDEN" = OT."NUMERO_ORDEN"
GROUP BY TO_VARCHAR(MPG."FECHA_INICIO_PERIODO", 'YYYY-MM')
ORDER BY MES;

-- 2) Detalle de las OT con algun problema de horas o duracion.
SELECT
    MPG."NUMERO_ORDEN"                                                     AS OT,
    TO_VARCHAR(MPG."FECHA_INICIO_PERIODO", 'YYYY-MM-DD')                   AS PERIODO,
    TO_VARCHAR(OT."HORA_INICIO", 'YYYY-MM-DD HH24:MI')                     AS INICIO,
    TO_VARCHAR(OT."HORA_FIN",    'YYYY-MM-DD HH24:MI')                     AS FIN,
    OT."DURACION_HRS"                                                      AS DURACION,
    CASE
        WHEN OT."HORA_INICIO" IS NULL AND OT."HORA_FIN" IS NULL THEN 'SIN HORAS'
        WHEN OT."HORA_INICIO" IS NULL                            THEN 'SIN INICIO'
        WHEN OT."HORA_FIN"    IS NULL                            THEN 'SIN FIN'
        WHEN OT."HORA_INICIO" > OT."HORA_FIN"                    THEN 'INVERTIDA'
        ELSE 'DURACION NO CUADRA'
    END                                                                    AS PROBLEMA,
    CASE WHEN LENGTH(TRIM(IFNULL(OT."FIRMA_REALIZO", '')))       > 0 THEN 'SI' ELSE 'NO' END AS FIRMA_TEC,
    CASE WHEN LENGTH(TRIM(IFNULL(OT."FIRMA_SUPERVISO", '')))     > 0 THEN 'SI' ELSE 'NO' END AS FIRMA_SUP,
    CASE WHEN LENGTH(TRIM(IFNULL(OT."FIRMA_MANTENIMIENTO", ''))) > 0 THEN 'SI' ELSE 'NO' END AS FIRMA_MTTO
FROM "PTM_2022_FINAL"."PdxMTTOMPGenerados" MPG
INNER JOIN "PTM_2022_FINAL"."PdxMTTOOrdenesTrabajoMP" OT
    ON MPG."NUMERO_ORDEN" = OT."NUMERO_ORDEN"
WHERE
    OT."HORA_INICIO" IS NULL
    OR OT."HORA_FIN" IS NULL
    OR OT."HORA_INICIO" > OT."HORA_FIN"
    OR (OT."HORA_INICIO" IS NOT NULL AND OT."HORA_FIN" IS NOT NULL
        AND OT."DURACION_HRS" IS NOT NULL
        AND ABS(SECONDS_BETWEEN(OT."HORA_INICIO", OT."HORA_FIN") / 3600.0
                - CAST(OT."DURACION_HRS" AS DECIMAL(10,2))) > 0.02)
ORDER BY PERIODO, OT;

-- 3) Horas sin la firma del tecnico, o firma sin horas.
SELECT
    MPG."NUMERO_ORDEN"                                                     AS OT,
    TO_VARCHAR(MPG."FECHA_INICIO_PERIODO", 'YYYY-MM-DD')                   AS PERIODO,
    TO_VARCHAR(OT."HORA_INICIO", 'YYYY-MM-DD HH24:MI')                     AS INICIO,
    TO_VARCHAR(OT."HORA_FIN",    'YYYY-MM-DD HH24:MI')                     AS FIN,
    CASE WHEN LENGTH(TRIM(IFNULL(OT."FIRMA_REALIZO", ''))) > 0 THEN 'SI' ELSE 'NO' END AS FIRMA_TEC
FROM "PTM_2022_FINAL"."PdxMTTOMPGenerados" MPG
INNER JOIN "PTM_2022_FINAL"."PdxMTTOOrdenesTrabajoMP" OT
    ON MPG."NUMERO_ORDEN" = OT."NUMERO_ORDEN"
WHERE
    ( (OT."HORA_INICIO" IS NOT NULL OR OT."HORA_FIN" IS NOT NULL)
      AND LENGTH(TRIM(IFNULL(OT."FIRMA_REALIZO", ''))) = 0 )
    OR
    ( LENGTH(TRIM(IFNULL(OT."FIRMA_REALIZO", ''))) > 0
      AND (OT."HORA_INICIO" IS NULL OR OT."HORA_FIN" IS NULL) )
ORDER BY PERIODO, OT;
