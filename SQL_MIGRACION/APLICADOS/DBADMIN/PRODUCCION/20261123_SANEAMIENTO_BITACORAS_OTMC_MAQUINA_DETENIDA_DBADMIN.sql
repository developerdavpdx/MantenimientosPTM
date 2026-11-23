-- Saneamiento de bitacoras (Fix 3, opcion B): OTMC + horas de paro + derivados.
-- Solo dejan de contar las OTs con MAQUINA_DETENIDA = 0 (y las ordenes sin fila de OT).
-- Horas nuevas = Hora Inicio tecnico -> Hora Fin tecnico (ROUND 4 por orden).
-- Derivados: TiempoProductivo, KgNetosHrReales, Rendimiento, EficienciaProducto,
--            Disponibilidad y OEE, con las mismas formulas del front (redondeo a 2 al guardar).
-- TiempoDisponible, KgPorTiempoDisponible, EficienciaOperativa y Calidad NO cambian.
-- FECHA_ACTUALIZACION se refresca para invalidar tokens viejos (evita pisar el saneo).
-- Rollback: restaurar las filas desde TMP_BAK_<T>_20261123 (se conservan).
-- Re-ejecutar: renombrar o borrar antes las tablas TMP_BAK_*/TMP_STAGE_* del dia.
-- Solo toca filas con ESTATUS = A y OTMC con contenido.

SELECT 'ANTES' AS FASE, 'PVC' AS PROCESO,
       ROUND(SUM(IFNULL("MTTO_CORRECTIVOS",0)+IFNULL("HERRAMENTAL",0)),2) AS HRS_PARO,
       ROUND(SUM(IFNULL("TIEMPO_PRODUCTIVO",0)),2) AS TP
FROM "DBADMIN"."PdxMTTOTiemposMuertosProduccionPVC"
WHERE IFNULL("ESTATUS",'A')='A' AND TO_NVARCHAR("OTMC") LIKE '%OTMC-%'
-- @@


-- ============================================================
-- PVC: saneamiento de OTMC + horas de paro + derivados (opcion B)
-- Regla: solo cuentan las OTs con MAQUINA_DETENIDA = 1.
-- Horas nuevas = Hora Inicio tecnico -> Hora Fin tecnico.
-- Derivados recalculados con las mismas formulas del front.
-- ============================================================

-- (1) Respaldo de las filas que se van a tocar (rollback: restaurar desde TMP_BAK)
CREATE COLUMN TABLE "DBADMIN"."TMP_BAK_PVC_20261123" AS (
    SELECT * FROM "DBADMIN"."PdxMTTOTiemposMuertosProduccionPVC"
    WHERE IFNULL("ESTATUS",'A') = 'A' AND TO_NVARCHAR("OTMC") LIKE '%OTMC-%'
)
-- @@

-- (2) Stage: nuevos OTMC/horas/derivados por fila afectada
CREATE COLUMN TABLE "DBADMIN"."TMP_STAGE_PVC_20261123" AS (
    SELECT X."ID_REGISTRO", X.NUEVO_OTMC, X.NUEVO_MTTO, X.NUEVO_HERR,
           ROUND(X.TP_EXACTO, 2) AS NUEVO_TP,
           CASE WHEN X.TP_EXACTO > 0
                THEN ROUND((IFNULL(X."PRODUCCION_NETA_REAL",0) + IFNULL(X."TOTAL_SCRAP_KG",0)) / X.TP_EXACTO, 2)
                ELSE 0 END AS NUEVO_KGNETOS,
           CASE WHEN X.TP_EXACTO > 0 AND IFNULL(X."KG_HR_PRODUCTO",0) > 0
                THEN ROUND(((IFNULL(X."PRODUCCION_NETA_REAL",0) + IFNULL(X."TOTAL_SCRAP_KG",0)) / X.TP_EXACTO) / X."KG_HR_PRODUCTO" * 100, 2)
                ELSE 0 END AS NUEVO_REND,
           CASE WHEN IFNULL(X."TIEMPO_DISPONIBLE",0) > 0
                THEN ROUND(X.TP_EXACTO / X."TIEMPO_DISPONIBLE" * 100, 2)
                ELSE 0 END AS NUEVO_DISP,
           ROUND( (CASE WHEN IFNULL(X."TIEMPO_DISPONIBLE",0) > 0 THEN X.TP_EXACTO / X."TIEMPO_DISPONIBLE" ELSE 0 END)
                * (CASE WHEN X.TP_EXACTO > 0 AND IFNULL(X."KG_HR_PRODUCTO",0) > 0
                        THEN (IFNULL(X."PRODUCCION_NETA_REAL",0) + IFNULL(X."TOTAL_SCRAP_KG",0)) / X.TP_EXACTO / X."KG_HR_PRODUCTO"
                        ELSE 0 END)
                * (IFNULL(X."PORCENTAJE_CALIDAD",0) / 100) * 100, 2) AS NUEVO_OEE
    FROM (
        SELECT AF."ID_REGISTRO",
               CASE WHEN IFNULL(AGG.N_OK, 0) > 0 THEN '[' || AGG.ITEMS || ']' ELSE NULL END AS NUEVO_OTMC,
               IFNULL(AGG.HRS_MTTO, 0) AS NUEVO_MTTO,
               IFNULL(AGG.HRS_HERR, 0) AS NUEVO_HERR,
               GREATEST(IFNULL(TM."TIEMPO_DISPONIBLE", 0)
                      - (IFNULL(AGG.HRS_MTTO, 0) + IFNULL(AGG.HRS_HERR, 0) + IFNULL(TM."FALLA_ELECTRICA",0) + IFNULL(TM."SERVICIOS",0) + IFNULL(TM."CAMBIO_MOLDE_SETUP_EXCESOS",0) + IFNULL(TM."FALLA_OPERACION",0) + IFNULL(TM."LIMPIEZA_TANQUE",0) + IFNULL(TM."FALTA_MATERIAL",0) + IFNULL(TM."FALTA_PERSONAL",0) + IFNULL(TM."FALTA_REFACCIONES",0)), 0) AS TP_EXACTO,
               TM."TIEMPO_DISPONIBLE", TM."PRODUCCION_NETA_REAL", TM."TOTAL_SCRAP_KG",
               TM."KG_HR_PRODUCTO", TM."PORCENTAJE_CALIDAD"
        FROM (
            SELECT DISTINCT TM2."ID_REGISTRO"
            FROM "DBADMIN"."PdxMTTOTiemposMuertosProduccionPVC" TM2
            JOIN "DBADMIN"."PdxMTTOMCGenerados" MCG2
              ON TM2."OTMC" LIKE '%"' || MCG2."NUMERO_ORDEN" || '"%'
            WHERE IFNULL(TM2."ESTATUS",'A') = 'A'
        ) AF
        JOIN "DBADMIN"."PdxMTTOTiemposMuertosProduccionPVC" TM ON TM."ID_REGISTRO" = AF."ID_REGISTRO"
        LEFT JOIN (
            SELECT P."ID_REGISTRO",
                   COUNT(P."NUMERO_ORDEN") AS N_OK,
                   STRING_AGG('"' || P."NUMERO_ORDEN" || '"', ',' ORDER BY P."NUMERO_ORDEN") AS ITEMS,
                   SUM(CASE WHEN P.ES_HERR = 0 THEN P.HRS ELSE 0 END) AS HRS_MTTO,
                   SUM(CASE WHEN P.ES_HERR = 1 THEN P.HRS ELSE 0 END) AS HRS_HERR
            FROM (
                SELECT TM3."ID_REGISTRO", MCG3."NUMERO_ORDEN",
                       CASE WHEN UPPER(COALESCE(S3."AREA_TECNICA",'')) LIKE '%HERRAMENTAL%' THEN 1 ELSE 0 END AS ES_HERR,
                       ROUND(CASE WHEN OT3."HORA_FIN" IS NOT NULL
                                  AND OT3."HORA_FIN" >= IFNULL(OT3."HORA_INICIO", MCG3."HORA_APERTURA")
                             THEN SECONDS_BETWEEN(IFNULL(OT3."HORA_INICIO", MCG3."HORA_APERTURA"), OT3."HORA_FIN")/3600.0
                             ELSE 0 END, 4) AS HRS
                FROM "DBADMIN"."PdxMTTOTiemposMuertosProduccionPVC" TM3
                JOIN "DBADMIN"."PdxMTTOMCGenerados" MCG3
                  ON TM3."OTMC" LIKE '%"' || MCG3."NUMERO_ORDEN" || '"%'
                JOIN "DBADMIN"."PdxMTTOSolicitudMC" S3 ON S3."ID_SOLICITUD" = MCG3."ID_SOLICITUD"
                LEFT JOIN "DBADMIN"."PdxMTTOOrdenesTrabajoMC" OT3 ON OT3."NUMERO_ORDEN" = MCG3."NUMERO_ORDEN"
                WHERE IFNULL(TM3."ESTATUS",'A') = 'A'
                  AND IFNULL(OT3."MAQUINA_DETENIDA", 0) = 1
            ) P
            GROUP BY P."ID_REGISTRO"
        ) AGG ON AGG."ID_REGISTRO" = AF."ID_REGISTRO"
    ) X
)
-- @@

-- (3) Aplicar cambios y refrescar el token de concurrencia
MERGE INTO "DBADMIN"."PdxMTTOTiemposMuertosProduccionPVC" TM
USING "DBADMIN"."TMP_STAGE_PVC_20261123" S
ON TM."ID_REGISTRO" = S."ID_REGISTRO"
WHEN MATCHED THEN UPDATE SET
    "OTMC" = S."NUEVO_OTMC",
    "MTTO_CORRECTIVOS" = S."NUEVO_MTTO",
    "HERRAMENTAL" = S."NUEVO_HERR",
    "TIEMPO_PRODUCTIVO" = S."NUEVO_TP",
    "KG_NETOS_HR_REALES" = S."NUEVO_KGNETOS",
    "PORCENTAJE_RENDIMIENTO" = S."NUEVO_REND",
    "PORCENTAJE_EFICIENCIA_PRODUCTO" = S."NUEVO_REND",
    "DISPONIBILIDAD_PORCENTAJE" = S."NUEVO_DISP",
    "PORCENTAJE_OEE" = S."NUEVO_OEE",
    "FECHA_ACTUALIZACION" = CURRENT_TIMESTAMP
-- @@

-- (4) Verificacion fila por fila
SELECT T."ID_REGISTRO", T."FECHA", T."LINEA",
       TO_NVARCHAR(B."OTMC") AS OTMC_ANTES, TO_NVARCHAR(T."OTMC") AS OTMC_DESPUES,
       IFNULL(B."MTTO_CORRECTIVOS",0) AS MTTO_ANTES, IFNULL(T."MTTO_CORRECTIVOS",0) AS MTTO_DESPUES,
       IFNULL(B."TIEMPO_PRODUCTIVO",0) AS TP_ANTES, IFNULL(T."TIEMPO_PRODUCTIVO",0) AS TP_DESPUES,
       IFNULL(B."PORCENTAJE_OEE",0) AS OEE_ANTES, IFNULL(T."PORCENTAJE_OEE",0) AS OEE_DESPUES
FROM "DBADMIN"."TMP_BAK_PVC_20261123" B
JOIN "DBADMIN"."PdxMTTOTiemposMuertosProduccionPVC" T ON T."ID_REGISTRO" = B."ID_REGISTRO"
ORDER BY T."ID_REGISTRO"
-- @@

-- (5) Resumen del proceso
SELECT COUNT(*) AS FILAS_SANEADAS,
       ROUND(SUM(IFNULL(B."MTTO_CORRECTIVOS",0) + IFNULL(B."HERRAMENTAL",0)), 2) AS HRS_PARO_ANTES,
       ROUND(SUM(IFNULL(T."MTTO_CORRECTIVOS",0) + IFNULL(T."HERRAMENTAL",0)), 2) AS HRS_PARO_DESPUES,
       ROUND(SUM(IFNULL(B."TIEMPO_PRODUCTIVO",0)), 2) AS TP_ANTES,
       ROUND(SUM(IFNULL(T."TIEMPO_PRODUCTIVO",0)), 2) AS TP_DESPUES
FROM "DBADMIN"."TMP_BAK_PVC_20261123" B
JOIN "DBADMIN"."PdxMTTOTiemposMuertosProduccionPVC" T ON T."ID_REGISTRO" = B."ID_REGISTRO"
-- @@
-- ============================================================
-- PEADLISO: saneamiento de OTMC + horas de paro + derivados (opcion B)
-- Regla: solo cuentan las OTs con MAQUINA_DETENIDA = 1.
-- Horas nuevas = Hora Inicio tecnico -> Hora Fin tecnico.
-- Derivados recalculados con las mismas formulas del front.
-- ============================================================

-- (1) Respaldo de las filas que se van a tocar (rollback: restaurar desde TMP_BAK)
CREATE COLUMN TABLE "DBADMIN"."TMP_BAK_PEADLISO_20261123" AS (
    SELECT * FROM "DBADMIN"."PdxMTTOTiemposMuertosProduccionPeadLiso"
    WHERE IFNULL("ESTATUS",'A') = 'A' AND TO_NVARCHAR("OTMC") LIKE '%OTMC-%'
)
-- @@

-- (2) Stage: nuevos OTMC/horas/derivados por fila afectada
CREATE COLUMN TABLE "DBADMIN"."TMP_STAGE_PEADLISO_20261123" AS (
    SELECT X."ID_REGISTRO", X.NUEVO_OTMC, X.NUEVO_MTTO, X.NUEVO_HERR,
           ROUND(X.TP_EXACTO, 2) AS NUEVO_TP,
           CASE WHEN X.TP_EXACTO > 0
                THEN ROUND((IFNULL(X."PRODUCCION_NETA",0) + IFNULL(X."TOTAL_SCRAP",0)) / X.TP_EXACTO, 2)
                ELSE 0 END AS NUEVO_KGNETOS,
           CASE WHEN X.TP_EXACTO > 0 AND IFNULL(X."KG_HR_PRODUCTO",0) > 0
                THEN ROUND(((IFNULL(X."PRODUCCION_NETA",0) + IFNULL(X."TOTAL_SCRAP",0)) / X.TP_EXACTO) / X."KG_HR_PRODUCTO" * 100, 2)
                ELSE 0 END AS NUEVO_REND,
           CASE WHEN IFNULL(X."TIEMPO_DISPONIBLE",0) > 0
                THEN ROUND(X.TP_EXACTO / X."TIEMPO_DISPONIBLE" * 100, 2)
                ELSE 0 END AS NUEVO_DISP,
           ROUND( (CASE WHEN IFNULL(X."TIEMPO_DISPONIBLE",0) > 0 THEN X.TP_EXACTO / X."TIEMPO_DISPONIBLE" ELSE 0 END)
                * (CASE WHEN X.TP_EXACTO > 0 AND IFNULL(X."KG_HR_PRODUCTO",0) > 0
                        THEN (IFNULL(X."PRODUCCION_NETA",0) + IFNULL(X."TOTAL_SCRAP",0)) / X.TP_EXACTO / X."KG_HR_PRODUCTO"
                        ELSE 0 END)
                * (IFNULL(X."PORCENTAJE_CALIDAD",0) / 100) * 100, 2) AS NUEVO_OEE
    FROM (
        SELECT AF."ID_REGISTRO",
               CASE WHEN IFNULL(AGG.N_OK, 0) > 0 THEN '[' || AGG.ITEMS || ']' ELSE NULL END AS NUEVO_OTMC,
               IFNULL(AGG.HRS_MTTO, 0) AS NUEVO_MTTO,
               IFNULL(AGG.HRS_HERR, 0) AS NUEVO_HERR,
               GREATEST(IFNULL(TM."TIEMPO_DISPONIBLE", 0)
                      - (IFNULL(AGG.HRS_MTTO, 0) + IFNULL(AGG.HRS_HERR, 0) + IFNULL(TM."CAMBIO_MOLDE_SETUP_EXCESOS",0) + IFNULL(TM."FALTA_PERSONAL",0) + IFNULL(TM."TIEMPO_MUERTO_PROCESO",0)), 0) AS TP_EXACTO,
               TM."TIEMPO_DISPONIBLE", TM."PRODUCCION_NETA", TM."TOTAL_SCRAP",
               TM."KG_HR_PRODUCTO", TM."PORCENTAJE_CALIDAD"
        FROM (
            SELECT DISTINCT TM2."ID_REGISTRO"
            FROM "DBADMIN"."PdxMTTOTiemposMuertosProduccionPeadLiso" TM2
            JOIN "DBADMIN"."PdxMTTOMCGenerados" MCG2
              ON TM2."OTMC" LIKE '%"' || MCG2."NUMERO_ORDEN" || '"%'
            WHERE IFNULL(TM2."ESTATUS",'A') = 'A'
        ) AF
        JOIN "DBADMIN"."PdxMTTOTiemposMuertosProduccionPeadLiso" TM ON TM."ID_REGISTRO" = AF."ID_REGISTRO"
        LEFT JOIN (
            SELECT P."ID_REGISTRO",
                   COUNT(P."NUMERO_ORDEN") AS N_OK,
                   STRING_AGG('"' || P."NUMERO_ORDEN" || '"', ',' ORDER BY P."NUMERO_ORDEN") AS ITEMS,
                   SUM(CASE WHEN P.ES_HERR = 0 THEN P.HRS ELSE 0 END) AS HRS_MTTO,
                   SUM(CASE WHEN P.ES_HERR = 1 THEN P.HRS ELSE 0 END) AS HRS_HERR
            FROM (
                SELECT TM3."ID_REGISTRO", MCG3."NUMERO_ORDEN",
                       CASE WHEN UPPER(COALESCE(S3."AREA_TECNICA",'')) LIKE '%HERRAMENTAL%' THEN 1 ELSE 0 END AS ES_HERR,
                       ROUND(CASE WHEN OT3."HORA_FIN" IS NOT NULL
                                  AND OT3."HORA_FIN" >= IFNULL(OT3."HORA_INICIO", MCG3."HORA_APERTURA")
                             THEN SECONDS_BETWEEN(IFNULL(OT3."HORA_INICIO", MCG3."HORA_APERTURA"), OT3."HORA_FIN")/3600.0
                             ELSE 0 END, 4) AS HRS
                FROM "DBADMIN"."PdxMTTOTiemposMuertosProduccionPeadLiso" TM3
                JOIN "DBADMIN"."PdxMTTOMCGenerados" MCG3
                  ON TM3."OTMC" LIKE '%"' || MCG3."NUMERO_ORDEN" || '"%'
                JOIN "DBADMIN"."PdxMTTOSolicitudMC" S3 ON S3."ID_SOLICITUD" = MCG3."ID_SOLICITUD"
                LEFT JOIN "DBADMIN"."PdxMTTOOrdenesTrabajoMC" OT3 ON OT3."NUMERO_ORDEN" = MCG3."NUMERO_ORDEN"
                WHERE IFNULL(TM3."ESTATUS",'A') = 'A'
                  AND IFNULL(OT3."MAQUINA_DETENIDA", 0) = 1
            ) P
            GROUP BY P."ID_REGISTRO"
        ) AGG ON AGG."ID_REGISTRO" = AF."ID_REGISTRO"
    ) X
)
-- @@

-- (3) Aplicar cambios y refrescar el token de concurrencia
MERGE INTO "DBADMIN"."PdxMTTOTiemposMuertosProduccionPeadLiso" TM
USING "DBADMIN"."TMP_STAGE_PEADLISO_20261123" S
ON TM."ID_REGISTRO" = S."ID_REGISTRO"
WHEN MATCHED THEN UPDATE SET
    "OTMC" = S."NUEVO_OTMC",
    "TIEMPO_MUERTO_CORRECTIVOS" = S."NUEVO_MTTO",
    "TIEMPO_MUERTO_HERRAMENTALES" = S."NUEVO_HERR",
    "TIEMPO_PRODUCTIVO" = S."NUEVO_TP",
    "KG_NETOS_HR_REALES" = S."NUEVO_KGNETOS",
    "PORCENTAJE_RENDIMIENTO" = S."NUEVO_REND",
    "PORCENTAJE_EFICIENCIA_PRODUCTO" = S."NUEVO_REND",
    "DISPONIBILIDAD_PORCENTAJE" = S."NUEVO_DISP",
    "PORCENTAJE_OEE" = S."NUEVO_OEE",
    "FECHA_ACTUALIZACION" = CURRENT_TIMESTAMP
-- @@

-- (4) Verificacion fila por fila
SELECT T."ID_REGISTRO", T."FECHA", T."LINEA",
       TO_NVARCHAR(B."OTMC") AS OTMC_ANTES, TO_NVARCHAR(T."OTMC") AS OTMC_DESPUES,
       IFNULL(B."TIEMPO_MUERTO_CORRECTIVOS",0) AS MTTO_ANTES, IFNULL(T."TIEMPO_MUERTO_CORRECTIVOS",0) AS MTTO_DESPUES,
       IFNULL(B."TIEMPO_PRODUCTIVO",0) AS TP_ANTES, IFNULL(T."TIEMPO_PRODUCTIVO",0) AS TP_DESPUES,
       IFNULL(B."PORCENTAJE_OEE",0) AS OEE_ANTES, IFNULL(T."PORCENTAJE_OEE",0) AS OEE_DESPUES
FROM "DBADMIN"."TMP_BAK_PEADLISO_20261123" B
JOIN "DBADMIN"."PdxMTTOTiemposMuertosProduccionPeadLiso" T ON T."ID_REGISTRO" = B."ID_REGISTRO"
ORDER BY T."ID_REGISTRO"
-- @@

-- (5) Resumen del proceso
SELECT COUNT(*) AS FILAS_SANEADAS,
       ROUND(SUM(IFNULL(B."TIEMPO_MUERTO_CORRECTIVOS",0) + IFNULL(B."TIEMPO_MUERTO_HERRAMENTALES",0)), 2) AS HRS_PARO_ANTES,
       ROUND(SUM(IFNULL(T."TIEMPO_MUERTO_CORRECTIVOS",0) + IFNULL(T."TIEMPO_MUERTO_HERRAMENTALES",0)), 2) AS HRS_PARO_DESPUES,
       ROUND(SUM(IFNULL(B."TIEMPO_PRODUCTIVO",0)), 2) AS TP_ANTES,
       ROUND(SUM(IFNULL(T."TIEMPO_PRODUCTIVO",0)), 2) AS TP_DESPUES
FROM "DBADMIN"."TMP_BAK_PEADLISO_20261123" B
JOIN "DBADMIN"."PdxMTTOTiemposMuertosProduccionPeadLiso" T ON T."ID_REGISTRO" = B."ID_REGISTRO"
-- @@
-- ============================================================
-- CORRUGADO: saneamiento de OTMC + horas de paro + derivados (opcion B)
-- Regla: solo cuentan las OTs con MAQUINA_DETENIDA = 1.
-- Horas nuevas = Hora Inicio tecnico -> Hora Fin tecnico.
-- Derivados recalculados con las mismas formulas del front.
-- ============================================================

-- (1) Respaldo de las filas que se van a tocar (rollback: restaurar desde TMP_BAK)
CREATE COLUMN TABLE "DBADMIN"."TMP_BAK_CORRUGADO_20261123" AS (
    SELECT * FROM "DBADMIN"."PdxMTTOTiemposMuertosProduccionCorrugado"
    WHERE IFNULL("ESTATUS",'A') = 'A' AND TO_NVARCHAR("OTMC") LIKE '%OTMC-%'
)
-- @@

-- (2) Stage: nuevos OTMC/horas/derivados por fila afectada
CREATE COLUMN TABLE "DBADMIN"."TMP_STAGE_CORRUGADO_20261123" AS (
    SELECT X."ID_REGISTRO", X.NUEVO_OTMC, X.NUEVO_MTTO, X.NUEVO_HERR,
           ROUND(X.TP_EXACTO, 2) AS NUEVO_TP,
           CASE WHEN X.TP_EXACTO > 0
                THEN ROUND((IFNULL(X."PRODUCCION_NETA",0) + IFNULL(X."SCRAP_TOTAL",0)) / X.TP_EXACTO, 2)
                ELSE 0 END AS NUEVO_KGNETOS,
           CASE WHEN X.TP_EXACTO > 0 AND IFNULL(X."KG_HR_PRODUCTO",0) > 0
                THEN ROUND(((IFNULL(X."PRODUCCION_NETA",0) + IFNULL(X."SCRAP_TOTAL",0)) / X.TP_EXACTO) / X."KG_HR_PRODUCTO" * 100, 2)
                ELSE 0 END AS NUEVO_REND,
           CASE WHEN IFNULL(X."TIEMPO_DISPONIBLE",0) > 0
                THEN ROUND(X.TP_EXACTO / X."TIEMPO_DISPONIBLE" * 100, 2)
                ELSE 0 END AS NUEVO_DISP,
           ROUND( (CASE WHEN IFNULL(X."TIEMPO_DISPONIBLE",0) > 0 THEN X.TP_EXACTO / X."TIEMPO_DISPONIBLE" ELSE 0 END)
                * (CASE WHEN X.TP_EXACTO > 0 AND IFNULL(X."KG_HR_PRODUCTO",0) > 0
                        THEN (IFNULL(X."PRODUCCION_NETA",0) + IFNULL(X."SCRAP_TOTAL",0)) / X.TP_EXACTO / X."KG_HR_PRODUCTO"
                        ELSE 0 END)
                * (IFNULL(X."PORCENTAJE_CALIDAD",0) / 100) * 100, 2) AS NUEVO_OEE
    FROM (
        SELECT AF."ID_REGISTRO",
               CASE WHEN IFNULL(AGG.N_OK, 0) > 0 THEN '[' || AGG.ITEMS || ']' ELSE NULL END AS NUEVO_OTMC,
               IFNULL(AGG.HRS_MTTO, 0) AS NUEVO_MTTO,
               IFNULL(AGG.HRS_HERR, 0) AS NUEVO_HERR,
               GREATEST(IFNULL(TM."TIEMPO_DISPONIBLE", 0)
                      - (IFNULL(AGG.HRS_MTTO, 0) + IFNULL(AGG.HRS_HERR, 0) + IFNULL(TM."CAMBIO_MOLDE_SETUP_EXCESOS",0) + IFNULL(TM."TIEMPO_MUERTO_ARRANCAR",0) + IFNULL(TM."TIEMPO_MUERTO_PROCESO",0)), 0) AS TP_EXACTO,
               TM."TIEMPO_DISPONIBLE", TM."PRODUCCION_NETA", TM."SCRAP_TOTAL",
               TM."KG_HR_PRODUCTO", TM."PORCENTAJE_CALIDAD"
        FROM (
            SELECT DISTINCT TM2."ID_REGISTRO"
            FROM "DBADMIN"."PdxMTTOTiemposMuertosProduccionCorrugado" TM2
            JOIN "DBADMIN"."PdxMTTOMCGenerados" MCG2
              ON TM2."OTMC" LIKE '%"' || MCG2."NUMERO_ORDEN" || '"%'
            WHERE IFNULL(TM2."ESTATUS",'A') = 'A'
        ) AF
        JOIN "DBADMIN"."PdxMTTOTiemposMuertosProduccionCorrugado" TM ON TM."ID_REGISTRO" = AF."ID_REGISTRO"
        LEFT JOIN (
            SELECT P."ID_REGISTRO",
                   COUNT(P."NUMERO_ORDEN") AS N_OK,
                   STRING_AGG('"' || P."NUMERO_ORDEN" || '"', ',' ORDER BY P."NUMERO_ORDEN") AS ITEMS,
                   SUM(CASE WHEN P.ES_HERR = 0 THEN P.HRS ELSE 0 END) AS HRS_MTTO,
                   SUM(CASE WHEN P.ES_HERR = 1 THEN P.HRS ELSE 0 END) AS HRS_HERR
            FROM (
                SELECT TM3."ID_REGISTRO", MCG3."NUMERO_ORDEN",
                       CASE WHEN UPPER(COALESCE(S3."AREA_TECNICA",'')) LIKE '%HERRAMENTAL%' THEN 1 ELSE 0 END AS ES_HERR,
                       ROUND(CASE WHEN OT3."HORA_FIN" IS NOT NULL
                                  AND OT3."HORA_FIN" >= IFNULL(OT3."HORA_INICIO", MCG3."HORA_APERTURA")
                             THEN SECONDS_BETWEEN(IFNULL(OT3."HORA_INICIO", MCG3."HORA_APERTURA"), OT3."HORA_FIN")/3600.0
                             ELSE 0 END, 4) AS HRS
                FROM "DBADMIN"."PdxMTTOTiemposMuertosProduccionCorrugado" TM3
                JOIN "DBADMIN"."PdxMTTOMCGenerados" MCG3
                  ON TM3."OTMC" LIKE '%"' || MCG3."NUMERO_ORDEN" || '"%'
                JOIN "DBADMIN"."PdxMTTOSolicitudMC" S3 ON S3."ID_SOLICITUD" = MCG3."ID_SOLICITUD"
                LEFT JOIN "DBADMIN"."PdxMTTOOrdenesTrabajoMC" OT3 ON OT3."NUMERO_ORDEN" = MCG3."NUMERO_ORDEN"
                WHERE IFNULL(TM3."ESTATUS",'A') = 'A'
                  AND IFNULL(OT3."MAQUINA_DETENIDA", 0) = 1
            ) P
            GROUP BY P."ID_REGISTRO"
        ) AGG ON AGG."ID_REGISTRO" = AF."ID_REGISTRO"
    ) X
)
-- @@

-- (3) Aplicar cambios y refrescar el token de concurrencia
MERGE INTO "DBADMIN"."PdxMTTOTiemposMuertosProduccionCorrugado" TM
USING "DBADMIN"."TMP_STAGE_CORRUGADO_20261123" S
ON TM."ID_REGISTRO" = S."ID_REGISTRO"
WHEN MATCHED THEN UPDATE SET
    "OTMC" = S."NUEVO_OTMC",
    "TIEMPO_MUERTO_CORRECTIVOS" = S."NUEVO_MTTO",
    "TIEMPO_MUERTO_HERRAMENTALES" = S."NUEVO_HERR",
    "TIEMPO_PRODUCTIVO" = S."NUEVO_TP",
    "KG_NETOS_HR_REALES" = S."NUEVO_KGNETOS",
    "PORCENTAJE_RENDIMIENTO" = S."NUEVO_REND",
    "PORCENTAJE_EFICIENCIA_PRODUCTO" = S."NUEVO_REND",
    "DISPONIBILIDAD_PORCENTAJE" = S."NUEVO_DISP",
    "PORCENTAJE_OEE" = S."NUEVO_OEE",
    "FECHA_ACTUALIZACION" = CURRENT_TIMESTAMP
-- @@

-- (4) Verificacion fila por fila
SELECT T."ID_REGISTRO", T."FECHA", T."LINEA",
       TO_NVARCHAR(B."OTMC") AS OTMC_ANTES, TO_NVARCHAR(T."OTMC") AS OTMC_DESPUES,
       IFNULL(B."TIEMPO_MUERTO_CORRECTIVOS",0) AS MTTO_ANTES, IFNULL(T."TIEMPO_MUERTO_CORRECTIVOS",0) AS MTTO_DESPUES,
       IFNULL(B."TIEMPO_PRODUCTIVO",0) AS TP_ANTES, IFNULL(T."TIEMPO_PRODUCTIVO",0) AS TP_DESPUES,
       IFNULL(B."PORCENTAJE_OEE",0) AS OEE_ANTES, IFNULL(T."PORCENTAJE_OEE",0) AS OEE_DESPUES
FROM "DBADMIN"."TMP_BAK_CORRUGADO_20261123" B
JOIN "DBADMIN"."PdxMTTOTiemposMuertosProduccionCorrugado" T ON T."ID_REGISTRO" = B."ID_REGISTRO"
ORDER BY T."ID_REGISTRO"
-- @@

-- (5) Resumen del proceso
SELECT COUNT(*) AS FILAS_SANEADAS,
       ROUND(SUM(IFNULL(B."TIEMPO_MUERTO_CORRECTIVOS",0) + IFNULL(B."TIEMPO_MUERTO_HERRAMENTALES",0)), 2) AS HRS_PARO_ANTES,
       ROUND(SUM(IFNULL(T."TIEMPO_MUERTO_CORRECTIVOS",0) + IFNULL(T."TIEMPO_MUERTO_HERRAMENTALES",0)), 2) AS HRS_PARO_DESPUES,
       ROUND(SUM(IFNULL(B."TIEMPO_PRODUCTIVO",0)), 2) AS TP_ANTES,
       ROUND(SUM(IFNULL(T."TIEMPO_PRODUCTIVO",0)), 2) AS TP_DESPUES
FROM "DBADMIN"."TMP_BAK_CORRUGADO_20261123" B
JOIN "DBADMIN"."PdxMTTOTiemposMuertosProduccionCorrugado" T ON T."ID_REGISTRO" = B."ID_REGISTRO"
-- @@
-- ============================================================
-- INY: saneamiento de OTMC + horas de paro + derivados (opcion B)
-- Regla: solo cuentan las OTs con MAQUINA_DETENIDA = 1.
-- Horas nuevas = Hora Inicio tecnico -> Hora Fin tecnico.
-- Derivados recalculados con las mismas formulas del front.
-- ============================================================

-- (1) Respaldo de las filas que se van a tocar (rollback: restaurar desde TMP_BAK)
CREATE COLUMN TABLE "DBADMIN"."TMP_BAK_INY_20261123" AS (
    SELECT * FROM "DBADMIN"."PdxMTTOTiemposMuertosProduccionINY"
    WHERE IFNULL("ESTATUS",'A') = 'A' AND TO_NVARCHAR("OTMC") LIKE '%OTMC-%'
)
-- @@

-- (2) Stage: nuevos OTMC/horas/derivados por fila afectada
CREATE COLUMN TABLE "DBADMIN"."TMP_STAGE_INY_20261123" AS (
    SELECT X."ID_REGISTRO", X.NUEVO_OTMC, X.NUEVO_MTTO, X.NUEVO_HERR,
           ROUND(X.TP_EXACTO, 2) AS NUEVO_TP,
           CASE WHEN X.TP_EXACTO > 0
                THEN ROUND((IFNULL(X."PRODUCCION_NETA",0) + IFNULL(X."TOTAL_SCRAP",0)) / X.TP_EXACTO, 2)
                ELSE 0 END AS NUEVO_KGNETOS,
           CASE WHEN X.TP_EXACTO > 0 AND IFNULL(X."KG_HR_PRODUCTO",0) > 0
                THEN ROUND(((IFNULL(X."PRODUCCION_NETA",0) + IFNULL(X."TOTAL_SCRAP",0)) / X.TP_EXACTO) / X."KG_HR_PRODUCTO" * 100, 2)
                ELSE 0 END AS NUEVO_REND,
           CASE WHEN IFNULL(X."TIEMPO_DISPONIBLE",0) > 0
                THEN ROUND(X.TP_EXACTO / X."TIEMPO_DISPONIBLE" * 100, 2)
                ELSE 0 END AS NUEVO_DISP,
           ROUND( (CASE WHEN IFNULL(X."TIEMPO_DISPONIBLE",0) > 0 THEN X.TP_EXACTO / X."TIEMPO_DISPONIBLE" ELSE 0 END)
                * (CASE WHEN X.TP_EXACTO > 0 AND IFNULL(X."KG_HR_PRODUCTO",0) > 0
                        THEN (IFNULL(X."PRODUCCION_NETA",0) + IFNULL(X."TOTAL_SCRAP",0)) / X.TP_EXACTO / X."KG_HR_PRODUCTO"
                        ELSE 0 END)
                * (IFNULL(X."PORCENTAJE_CALIDAD",0) / 100) * 100, 2) AS NUEVO_OEE
    FROM (
        SELECT AF."ID_REGISTRO",
               CASE WHEN IFNULL(AGG.N_OK, 0) > 0 THEN '[' || AGG.ITEMS || ']' ELSE NULL END AS NUEVO_OTMC,
               IFNULL(AGG.HRS_MTTO, 0) AS NUEVO_MTTO,
               IFNULL(AGG.HRS_HERR, 0) AS NUEVO_HERR,
               GREATEST(IFNULL(TM."TIEMPO_DISPONIBLE", 0)
                      - (IFNULL(AGG.HRS_MTTO, 0) + IFNULL(AGG.HRS_HERR, 0) + IFNULL(TM."TIEMPO_MUERTO_ARRANQUES",0) + IFNULL(TM."FALLA_MATERIAL",0) + IFNULL(TM."FALTA_PERSONAL",0) + IFNULL(TM."FALLA_ELECTRICA",0) + IFNULL(TM."TIEMPO_MUERTO_PROCESO",0)), 0) AS TP_EXACTO,
               TM."TIEMPO_DISPONIBLE", TM."PRODUCCION_NETA", TM."TOTAL_SCRAP",
               TM."KG_HR_PRODUCTO", TM."PORCENTAJE_CALIDAD"
        FROM (
            SELECT DISTINCT TM2."ID_REGISTRO"
            FROM "DBADMIN"."PdxMTTOTiemposMuertosProduccionINY" TM2
            JOIN "DBADMIN"."PdxMTTOMCGenerados" MCG2
              ON TM2."OTMC" LIKE '%"' || MCG2."NUMERO_ORDEN" || '"%'
            WHERE IFNULL(TM2."ESTATUS",'A') = 'A'
        ) AF
        JOIN "DBADMIN"."PdxMTTOTiemposMuertosProduccionINY" TM ON TM."ID_REGISTRO" = AF."ID_REGISTRO"
        LEFT JOIN (
            SELECT P."ID_REGISTRO",
                   COUNT(P."NUMERO_ORDEN") AS N_OK,
                   STRING_AGG('"' || P."NUMERO_ORDEN" || '"', ',' ORDER BY P."NUMERO_ORDEN") AS ITEMS,
                   SUM(CASE WHEN P.ES_HERR = 0 THEN P.HRS ELSE 0 END) AS HRS_MTTO,
                   SUM(CASE WHEN P.ES_HERR = 1 THEN P.HRS ELSE 0 END) AS HRS_HERR
            FROM (
                SELECT TM3."ID_REGISTRO", MCG3."NUMERO_ORDEN",
                       CASE WHEN UPPER(COALESCE(S3."AREA_TECNICA",'')) LIKE '%HERRAMENTAL%' THEN 1 ELSE 0 END AS ES_HERR,
                       ROUND(CASE WHEN OT3."HORA_FIN" IS NOT NULL
                                  AND OT3."HORA_FIN" >= IFNULL(OT3."HORA_INICIO", MCG3."HORA_APERTURA")
                             THEN SECONDS_BETWEEN(IFNULL(OT3."HORA_INICIO", MCG3."HORA_APERTURA"), OT3."HORA_FIN")/3600.0
                             ELSE 0 END, 4) AS HRS
                FROM "DBADMIN"."PdxMTTOTiemposMuertosProduccionINY" TM3
                JOIN "DBADMIN"."PdxMTTOMCGenerados" MCG3
                  ON TM3."OTMC" LIKE '%"' || MCG3."NUMERO_ORDEN" || '"%'
                JOIN "DBADMIN"."PdxMTTOSolicitudMC" S3 ON S3."ID_SOLICITUD" = MCG3."ID_SOLICITUD"
                LEFT JOIN "DBADMIN"."PdxMTTOOrdenesTrabajoMC" OT3 ON OT3."NUMERO_ORDEN" = MCG3."NUMERO_ORDEN"
                WHERE IFNULL(TM3."ESTATUS",'A') = 'A'
                  AND IFNULL(OT3."MAQUINA_DETENIDA", 0) = 1
            ) P
            GROUP BY P."ID_REGISTRO"
        ) AGG ON AGG."ID_REGISTRO" = AF."ID_REGISTRO"
    ) X
)
-- @@

-- (3) Aplicar cambios y refrescar el token de concurrencia
MERGE INTO "DBADMIN"."PdxMTTOTiemposMuertosProduccionINY" TM
USING "DBADMIN"."TMP_STAGE_INY_20261123" S
ON TM."ID_REGISTRO" = S."ID_REGISTRO"
WHEN MATCHED THEN UPDATE SET
    "OTMC" = S."NUEVO_OTMC",
    "TIEMPO_MUERTO_CORRECTIVOS" = S."NUEVO_MTTO",
    "TIEMPO_MUERTO_HERRAMENTALES" = S."NUEVO_HERR",
    "TIEMPO_PRODUCTIVO" = S."NUEVO_TP",
    "KG_NETOS_HR_REALES" = S."NUEVO_KGNETOS",
    "PORCENTAJE_RENDIMIENTO" = S."NUEVO_REND",
    "PORCENTAJE_EFICIENCIA_PRODUCTO" = S."NUEVO_REND",
    "PORCENTAJE_DISPONIBILIDAD" = S."NUEVO_DISP",
    "PORCENTAJE_OEE" = S."NUEVO_OEE",
    "FECHA_ACTUALIZACION" = CURRENT_TIMESTAMP
-- @@

-- (4) Verificacion fila por fila
SELECT T."ID_REGISTRO", T."FECHA", T."LINEA",
       TO_NVARCHAR(B."OTMC") AS OTMC_ANTES, TO_NVARCHAR(T."OTMC") AS OTMC_DESPUES,
       IFNULL(B."TIEMPO_MUERTO_CORRECTIVOS",0) AS MTTO_ANTES, IFNULL(T."TIEMPO_MUERTO_CORRECTIVOS",0) AS MTTO_DESPUES,
       IFNULL(B."TIEMPO_PRODUCTIVO",0) AS TP_ANTES, IFNULL(T."TIEMPO_PRODUCTIVO",0) AS TP_DESPUES,
       IFNULL(B."PORCENTAJE_OEE",0) AS OEE_ANTES, IFNULL(T."PORCENTAJE_OEE",0) AS OEE_DESPUES
FROM "DBADMIN"."TMP_BAK_INY_20261123" B
JOIN "DBADMIN"."PdxMTTOTiemposMuertosProduccionINY" T ON T."ID_REGISTRO" = B."ID_REGISTRO"
ORDER BY T."ID_REGISTRO"
-- @@

-- (5) Resumen del proceso
SELECT COUNT(*) AS FILAS_SANEADAS,
       ROUND(SUM(IFNULL(B."TIEMPO_MUERTO_CORRECTIVOS",0) + IFNULL(B."TIEMPO_MUERTO_HERRAMENTALES",0)), 2) AS HRS_PARO_ANTES,
       ROUND(SUM(IFNULL(T."TIEMPO_MUERTO_CORRECTIVOS",0) + IFNULL(T."TIEMPO_MUERTO_HERRAMENTALES",0)), 2) AS HRS_PARO_DESPUES,
       ROUND(SUM(IFNULL(B."TIEMPO_PRODUCTIVO",0)), 2) AS TP_ANTES,
       ROUND(SUM(IFNULL(T."TIEMPO_PRODUCTIVO",0)), 2) AS TP_DESPUES
FROM "DBADMIN"."TMP_BAK_INY_20261123" B
JOIN "DBADMIN"."PdxMTTOTiemposMuertosProduccionINY" T ON T."ID_REGISTRO" = B."ID_REGISTRO"


