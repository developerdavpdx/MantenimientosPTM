-- ============================================================================
-- 2026-11-25 | Schema: PTM_2022_FINAL | SOLO LECTURA
-- Origen de las horas de HERRAMENTAL en INY planta 2 (18-24/11/2026).
--
-- Objetivo: saber si las 61 h vienen del modulo de Paros, de una OT de
-- herramental, o de captura directa en la celda del grid
-- (en INY la columna TIEMPO MUERTO HERRAMENTALES es editable; en PVC y
--  Corrugado no lo es).
--
-- Señales:
--   * Si la fila tiene ID_PARO y existe el paro -> vino de Paros.
--   * Si hay una OT herramental cerrada ese dia -> vino de la OT.
--   * Si no hay paro ni OT y USUARIO tiene valor -> se tecleo en el grid
--     (el usuario es el ultimo que guardo la fila).
-- ============================================================================


-- ============================================================================
-- A) FILAS DE INY CON HORAS DE HERRAMENTAL O CORRECTIVOS (detalle completo)
--    Revisar: ID_PARO (vacio = no vino de Paros), USUARIO y FECHA_ACTUALIZACION
-- ============================================================================
SELECT
    "ID_REGISTRO",
    CAST("FECHA" AS DATE)                       AS FECHA,
    "LINEA",
    TO_NVARCHAR("PLANTA")                       AS PLANTA,
    IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0)    AS H_HERRAMENTAL,
    IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0)      AS H_CORRECTIVOS,
    "ID_PARO",
    "OTMC",
    "OTMP",
    "USUARIO",
    "ORIGEN",
    "ESTATUS",
    "CLAVE_SYNC",
    "FECHA_CREACION",
    "FECHA_ACTUALIZACION"
FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY"
WHERE IFNULL("ESTATUS", 'A') = 'A'
  AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30'
  AND "PLANTA" = '2'
  AND (IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0) > 0
       OR IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0) > 0)
ORDER BY "FECHA", "LINEA";


-- ============================================================================
-- B) PAROS MANUALES DE CATEGORIA HERRAMENTAL EN PLANTA 2 / NOVIEMBRE
--    Si esta consulta sale vacia, las horas NO vienen del modulo de Paros.
-- ============================================================================
SELECT
    PAR."ID_PARO",
    CAST(PAR."FECHA_PARO" AS DATE)          AS FECHA,
    PAR."FECHA_PARO"                        AS FECHA_HORA_PARO,
    PAR."LINEA_PRODUCCION"                  AS ID_LINEA,
    LIN."LINEA"                             AS LINEA,
    TO_NVARCHAR(LIN."PLANTA")               AS PLANTA,
    IFNULL(CAT."NOMBRE", 'SIN CATEGORIA')   AS CATEGORIA,
    PAR."DURACION_HRS",
    PAR."ESTATUS",
    PAR."USUARIO",
    PAR."COMENTARIOS",
    PAR."FECHA_REANUDACION"
FROM "PTM_2022_FINAL"."PdxMTTOTParoProduccion" PAR
LEFT JOIN "PTM_2022_FINAL"."PdxMTTOLineasxPlanta" LIN
    ON LIN."ID_LINEA" = PAR."LINEA_PRODUCCION"
LEFT JOIN "PTM_2022_FINAL"."PdxMTTOCategoriasParo" CAT
    ON CAT."ID_CATEGORIA_PARO" = PAR."ID_CATEGORIA_PARO"
WHERE CAST(PAR."FECHA_PARO" AS DATE) BETWEEN '2026-11-01' AND '2026-11-30'
  AND TO_NVARCHAR(LIN."PLANTA") = '2'
  AND UPPER(IFNULL(CAT."NOMBRE", '')) LIKE '%HERRAMENTAL%'
ORDER BY PAR."FECHA_PARO", LIN."LINEA";


-- ============================================================================
-- C) CRUCE: cada fila de INY vs los paros capturados el mismo dia y linea
--    (cualquier categoria). Sirve para confirmar si el ID_PARO se perdio.
-- ============================================================================
WITH FILAS AS (
    SELECT "ID_REGISTRO",
           CAST("FECHA" AS DATE) AS FECHA,
           "LINEA",
           IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0) AS H_HERR,
           IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0)   AS H_CORR,
           TO_NVARCHAR("ID_PARO") AS ID_PARO_TXT,
           "USUARIO"
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY"
    WHERE IFNULL("ESTATUS", 'A') = 'A'
      AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30'
      AND "PLANTA" = '2'
      AND (IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0) > 0
           OR IFNULL("TIEMPO_MUERTO_CORRECTIVOS", 0) > 0)
),
PAROS AS (
    SELECT CAST(PAR."FECHA_PARO" AS DATE)        AS FECHA,
           LIN."LINEA"                            AS LINEA,
           COUNT(*)                               AS N_PAROS,
           ROUND(SUM(IFNULL(PAR."DURACION_HRS", 0)), 4) AS HORAS_PAROS,
           STRING_AGG(TO_NVARCHAR(PAR."ID_PARO"), ',' ORDER BY PAR."ID_PARO") AS IDS_PARO,
           STRING_AGG(IFNULL(CAT."NOMBRE", 'SIN CAT'), ',' ORDER BY PAR."ID_PARO") AS CATEGORIAS
    FROM "PTM_2022_FINAL"."PdxMTTOTParoProduccion" PAR
    LEFT JOIN "PTM_2022_FINAL"."PdxMTTOLineasxPlanta" LIN
        ON LIN."ID_LINEA" = PAR."LINEA_PRODUCCION"
    LEFT JOIN "PTM_2022_FINAL"."PdxMTTOCategoriasParo" CAT
        ON CAT."ID_CATEGORIA_PARO" = PAR."ID_CATEGORIA_PARO"
    WHERE CAST(PAR."FECHA_PARO" AS DATE) BETWEEN '2026-11-01' AND '2026-11-30'
      AND TO_NVARCHAR(LIN."PLANTA") = '2'
    GROUP BY CAST(PAR."FECHA_PARO" AS DATE), LIN."LINEA"
)
SELECT
    F.FECHA,
    F.LINEA,
    F.H_HERR,
    F.H_CORR,
    F.ID_PARO_TXT,
    F."USUARIO",
    IFNULL(P.N_PAROS, 0)        AS PAROS_MISMO_DIA_LINEA,
    IFNULL(P.HORAS_PAROS, 0)    AS HORAS_PAROS_MISMO_DIA_LINEA,
    P.IDS_PARO,
    P.CATEGORIAS
FROM FILAS F
LEFT JOIN PAROS P
    ON P.FECHA = F.FECHA
   AND P.LINEA = F.LINEA
ORDER BY F.FECHA, F.LINEA;


-- ============================================================================
-- D) OTs DE HERRAMENTAL CERRADAS EN PLANTA 2 / NOVIEMBRE
--    Si hay alguna con HORA_FIN en esos dias, revisar si aporto las horas.
-- ============================================================================
SELECT
    TRIM(MCG."NUMERO_ORDEN")                        AS ORDEN,
    E."NOMBRE_EQUIPO",
    E."LINEA_PRODUCCION"                            AS ID_LINEA,
    S."AREA_TECNICA",
    E."CLASIFICACION",
    IFNULL(OT."MAQUINA_DETENIDA", 0)                AS MAQUINA_DETENIDA,
    OT."HORA_INICIO",
    OT."HORA_FIN",
    S."FECHA_CREACION",
    ROUND(CASE WHEN OT."HORA_FIN" IS NOT NULL
                AND OT."HORA_FIN" >= IFNULL(OT."HORA_INICIO", MCG."HORA_APERTURA")
               THEN ROUND(SECONDS_BETWEEN(IFNULL(OT."HORA_INICIO", MCG."HORA_APERTURA"),
                                          OT."HORA_FIN") / 60) / 60
               ELSE 0 END, 4)                       AS HORAS
FROM "PTM_2022_FINAL"."PdxMTTOOrdenesTrabajoMC" OT
INNER JOIN "PTM_2022_FINAL"."PdxMTTOMCGenerados" MCG
    ON MCG."NUMERO_ORDEN" = OT."NUMERO_ORDEN"
INNER JOIN "PTM_2022_FINAL"."PdxMTTOSolicitudMC" S
    ON S."ID_SOLICITUD" = MCG."ID_SOLICITUD"
INNER JOIN "PTM_2022_FINAL"."PdxMTTOGestionEquipos" E
    ON E."ID_EQUIPO" = S."ID_EQUIPO"
WHERE CAST(S."FECHA_CREACION" AS DATE) BETWEEN '2026-11-01' AND '2026-11-30'
  AND TO_INT(E."PLANTA") = 2
  AND UPPER(IFNULL(S."AREA_TECNICA", '')) LIKE '%HERRAMENTAL%'
ORDER BY S."FECHA_CREACION";


-- ============================================================================
-- E) RESUMEN: horas de herramental en la bitacora vs paros herramental
--    por dia. Si BITACORA_HERR > PAROS_HERR, la diferencia se tecleo.
-- ============================================================================
WITH BIT AS (
    SELECT CAST("FECHA" AS DATE) AS FECHA,
           ROUND(SUM(IFNULL("TIEMPO_MUERTO_HERRAMENTALES", 0)), 4) AS BIT_HERR
    FROM "PTM_2022_FINAL"."PdxMTTOTiemposMuertosProduccionINY"
    WHERE IFNULL("ESTATUS", 'A') = 'A'
      AND "FECHA" BETWEEN '2026-11-01' AND '2026-11-30'
      AND "PLANTA" = '2'
    GROUP BY CAST("FECHA" AS DATE)
),
PAR AS (
    SELECT CAST(PAR."FECHA_PARO" AS DATE) AS FECHA,
           ROUND(SUM(IFNULL(PAR."DURACION_HRS", 0)), 4) AS PAR_HERR
    FROM "PTM_2022_FINAL"."PdxMTTOTParoProduccion" PAR
    LEFT JOIN "PTM_2022_FINAL"."PdxMTTOLineasxPlanta" LIN
        ON LIN."ID_LINEA" = PAR."LINEA_PRODUCCION"
    LEFT JOIN "PTM_2022_FINAL"."PdxMTTOCategoriasParo" CAT
        ON CAT."ID_CATEGORIA_PARO" = PAR."ID_CATEGORIA_PARO"
    WHERE CAST(PAR."FECHA_PARO" AS DATE) BETWEEN '2026-11-01' AND '2026-11-30'
      AND TO_NVARCHAR(LIN."PLANTA") = '2'
      AND UPPER(IFNULL(CAT."NOMBRE", '')) LIKE '%HERRAMENTAL%'
    GROUP BY CAST(PAR."FECHA_PARO" AS DATE)
)
SELECT
    IFNULL(B.FECHA, P.FECHA)          AS FECHA,
    IFNULL(B.BIT_HERR, 0)             AS BITACORA_HERRAMENTAL,
    IFNULL(P.PAR_HERR, 0)             AS PAROS_HERRAMENTAL,
    ROUND(IFNULL(B.BIT_HERR, 0) - IFNULL(P.PAR_HERR, 0), 4) AS DIFERENCIA_TECLEADA
FROM BIT B
FULL OUTER JOIN PAR P ON P.FECHA = B.FECHA
WHERE IFNULL(B.BIT_HERR, 0) > 0 OR IFNULL(P.PAR_HERR, 0) > 0
ORDER BY FECHA;
