-- Verificacion POST-APLICACION en PTM_2022_FINAL (SOLO CONSULTA).
-- Todo son SELECT: no modifica nada.
-- Ejecutar con SET SCHEMA "PTM_2022_FINAL"; (o calificando el esquema).

SET SCHEMA "PTM_2022_FINAL";

-- @@
-- 1) ¿Estan aplicadas las versiones nuevas de los SP?
--    Cada fila debe salir 'OK'. Si sale 'VIEJO', falta aplicar ese paquete.
SELECT
    'SpPdxMTTOObtenerParosProduccion (filtros + solo produccion)' AS "SP",
    CASE WHEN TO_NVARCHAR(DEFINITION) LIKE '%LE.PRODUCCION = 1%'
               AND TO_NVARCHAR(DEFINITION) LIKE '%p_ID_AREA IS NULL%'
         THEN 'OK' ELSE 'VIEJO' END AS "ESTADO"
  FROM SYS.PROCEDURES
 WHERE SCHEMA_NAME = 'PTM_2022_FINAL' AND PROCEDURE_NAME = 'SpPdxMTTOObtenerParosProduccion'

UNION ALL
SELECT 'SpPdxMTTOObtenerParosProduccion (duracion con horas del tecnico)',
       CASE WHEN TO_NVARCHAR(DEFINITION) LIKE '%OT."HORA_INICIO"%'
                 AND TO_NVARCHAR(DEFINITION) LIKE '%OT."HORA_FIN"%'
            THEN 'OK' ELSE 'VIEJO' END
  FROM SYS.PROCEDURES
 WHERE SCHEMA_NAME = 'PTM_2022_FINAL' AND PROCEDURE_NAME = 'SpPdxMTTOObtenerParosProduccion'

UNION ALL
SELECT 'SpPdxMTTOObtenerMantenimientosPorRango (bitacora por HORA_FIN)',
       CASE WHEN TO_NVARCHAR(DEFINITION) LIKE '%CAST(OT.HORA_FIN AS DATE)%'
            THEN 'OK' ELSE 'VIEJO' END
  FROM SYS.PROCEDURES
 WHERE SCHEMA_NAME = 'PTM_2022_FINAL' AND PROCEDURE_NAME = 'SpPdxMTTOObtenerMantenimientosPorRango'

UNION ALL
SELECT 'SpPdxMTTOGetBalanceOT (Cerrada/ELIMINADA no bloquean)',
       CASE WHEN TO_NVARCHAR(DEFINITION) LIKE '%''CERRADA''%'
            THEN 'OK' ELSE 'VIEJO' END
  FROM SYS.PROCEDURES
 WHERE SCHEMA_NAME = 'PTM_2022_FINAL' AND PROCEDURE_NAME = 'SpPdxMTTOGetBalanceOT'

UNION ALL
SELECT 'SpPdxMTTOActualizarSolicitudRefaccion (libera la OT)',
       CASE WHEN TO_NVARCHAR(DEFINITION) LIKE '%PdxMTTOMCGenerados%'
            THEN 'OK' ELSE 'VIEJO' END
  FROM SYS.PROCEDURES
 WHERE SCHEMA_NAME = 'PTM_2022_FINAL' AND PROCEDURE_NAME = 'SpPdxMTTOActualizarSolicitudRefaccion'

UNION ALL
SELECT 'SpPdxMTTOUpdateEstatusSolicitud (libera la OT)',
       CASE WHEN TO_NVARCHAR(DEFINITION) LIKE '%PdxMTTOMCGenerados%'
            THEN 'OK' ELSE 'VIEJO' END
  FROM SYS.PROCEDURES
 WHERE SCHEMA_NAME = 'PTM_2022_FINAL' AND PROCEDURE_NAME = 'SpPdxMTTOUpdateEstatusSolicitud'

UNION ALL
SELECT 'SpPdxMTTOActualizaMC (no libera con refacciones pendientes)',
       CASE WHEN TO_NVARCHAR(DEFINITION) LIKE '%V_BLOQUEAN%'
            THEN 'OK' ELSE 'VIEJO' END
  FROM SYS.PROCEDURES
 WHERE SCHEMA_NAME = 'PTM_2022_FINAL' AND PROCEDURE_NAME = 'SpPdxMTTOActualizaMC'

UNION ALL
SELECT 'SpPdxMTTOActualizaMP (no libera con refacciones pendientes)',
       CASE WHEN TO_NVARCHAR(DEFINITION) LIKE '%V_BLOQUEAN%'
            THEN 'OK' ELSE 'VIEJO' END
  FROM SYS.PROCEDURES
 WHERE SCHEMA_NAME = 'PTM_2022_FINAL' AND PROCEDURE_NAME = 'SpPdxMTTOActualizaMP';

-- @@
-- 2) OTs que siguen en "En espera de refaccion" (ESTATUS = 3)
--    BLOQUEAN = 0 -> se puede liberar con el barrido.
SELECT 'MC' AS "TIPO", MC."NUMERO_ORDEN" AS "OT",
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
             LEFT JOIN (SELECT "ID_SALIDA" FROM "PdxMTTORechazoDevolucion" GROUP BY "ID_SALIDA") RD
                    ON RD."ID_SALIDA" = SR."ID_SOLICITUD"
            WHERE SR."ORDEN_TRABAJO" = MC."NUMERO_ORDEN"
              AND UPPER(SR."ESTATUS") NOT IN ('ELIMINADA', 'CERRADA')
              AND NOT (
                    IFNULL(MOV.SAL, 0) >= SR."CANTIDAD"
                    OR (IFNULL(MOV.SAL, 0) > 0 AND IFNULL(MOV.DEV, 0) >= IFNULL(MOV.SAL, 0))
                    OR RD."ID_SALIDA" IS NOT NULL
              )
       ) AS "BLOQUEAN"
  FROM "PdxMTTOMCGenerados" MC
 WHERE MC."ESTATUS" = 3

UNION ALL

SELECT 'MP', MP."NUMERO_ORDEN",
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
             LEFT JOIN (SELECT "ID_SALIDA" FROM "PdxMTTORechazoDevolucion" GROUP BY "ID_SALIDA") RD
                    ON RD."ID_SALIDA" = SR."ID_SOLICITUD"
            WHERE SR."ORDEN_TRABAJO" = MP."NUMERO_ORDEN"
              AND UPPER(SR."ESTATUS") NOT IN ('ELIMINADA', 'CERRADA')
              AND NOT (
                    IFNULL(MOV.SAL, 0) >= SR."CANTIDAD"
                    OR (IFNULL(MOV.SAL, 0) > 0 AND IFNULL(MOV.DEV, 0) >= IFNULL(MOV.SAL, 0))
                    OR RD."ID_SALIDA" IS NOT NULL
              )
       )
  FROM "PdxMTTOMPGenerados" MP
 WHERE MP."ESTATUS" = 3;

-- @@
-- 3) Paros de correctivo de los ultimos 30 dias por linea y bandera PRODUCCION
--    (informativo: las lineas con PRODUCCION = 0 ya no salen en el reporte)
SELECT L.PLANTA, COALESCE(L.LINEA, '(sin linea)') AS "LINEA", L.PRODUCCION, COUNT(*) AS "COR"
  FROM "PdxMTTOSolicitudMC" S
  JOIN "PdxMTTOGestionEquipos" E ON S.ID_EQUIPO = E.ID_EQUIPO
  JOIN "PdxMTTOMCGenerados" MCG ON S.ID_SOLICITUD = MCG.ID_SOLICITUD
  LEFT JOIN "PdxMTTOLineasxPlanta" L
         ON L.ID_LINEA = CASE WHEN E.LINEA_PRODUCCION IS NOT NULL
                               AND TRIM(E.LINEA_PRODUCCION) LIKE_REGEXPR '^[0-9]+$'
                              THEN TO_INTEGER(TRIM(E.LINEA_PRODUCCION)) ELSE NULL END
 WHERE MCG.HORA_APERTURA IS NOT NULL
   AND MCG.HORA_APERTURA >= ADD_DAYS(CURRENT_DATE, -30)
 GROUP BY L.PLANTA, L.LINEA, L.PRODUCCION
 ORDER BY L.PLANTA, L.PRODUCCION DESC, L.LINEA;

-- @@
-- 4) Bitacoras: filas con OTMP cuya fecha de fila != dia de cierre del tecnico
--    (informativo del historico; de aqui en adelante el front usa HORA_FIN)
SELECT 'PVC' AS "TABLA", COUNT(*) AS "FILAS"
  FROM "PdxMTTOTiemposMuertosProduccionPVC" T
  JOIN "PdxMTTOMPGenerados" MP ON T."OTMP" LIKE '%"' || MP."NUMERO_ORDEN" || '"%'
  JOIN "PdxMTTOOrdenesTrabajoMP" OT ON OT."NUMERO_ORDEN" = MP."NUMERO_ORDEN"
 WHERE IFNULL(T."ESTATUS", 'A') = 'A'
   AND OT."HORA_FIN" IS NOT NULL
   AND TO_VARCHAR(T."FECHA", 'YYYY-MM-DD') <> TO_VARCHAR(CAST(OT."HORA_FIN" AS DATE), 'YYYY-MM-DD')

UNION ALL

SELECT 'PEAD LISO', COUNT(*)
  FROM "PdxMTTOTiemposMuertosProduccionPeadLiso" T
  JOIN "PdxMTTOMPGenerados" MP ON T."OTMP" LIKE '%"' || MP."NUMERO_ORDEN" || '"%'
  JOIN "PdxMTTOOrdenesTrabajoMP" OT ON OT."NUMERO_ORDEN" = MP."NUMERO_ORDEN"
 WHERE IFNULL(T."ESTATUS", 'A') = 'A'
   AND OT."HORA_FIN" IS NOT NULL
   AND TO_VARCHAR(T."FECHA", 'YYYY-MM-DD') <> TO_VARCHAR(CAST(OT."HORA_FIN" AS DATE), 'YYYY-MM-DD')

UNION ALL

SELECT 'INY', COUNT(*)
  FROM "PdxMTTOTiemposMuertosProduccionINY" T
  JOIN "PdxMTTOMPGenerados" MP ON T."OTMP" LIKE '%"' || MP."NUMERO_ORDEN" || '"%'
  JOIN "PdxMTTOOrdenesTrabajoMP" OT ON OT."NUMERO_ORDEN" = MP."NUMERO_ORDEN"
 WHERE IFNULL(T."ESTATUS", 'A') = 'A'
   AND OT."HORA_FIN" IS NOT NULL
   AND TO_VARCHAR(T."FECHA", 'YYYY-MM-DD') <> TO_VARCHAR(CAST(OT."HORA_FIN" AS DATE), 'YYYY-MM-DD')

UNION ALL

SELECT 'CORRUGADO', COUNT(*)
  FROM "PdxMTTOTiemposMuertosProduccionCorrugado" T
  JOIN "PdxMTTOMPGenerados" MP ON T."OTMP" LIKE '%"' || MP."NUMERO_ORDEN" || '"%'
  JOIN "PdxMTTOOrdenesTrabajoMP" OT ON OT."NUMERO_ORDEN" = MP."NUMERO_ORDEN"
 WHERE IFNULL(T."ESTATUS", 'A') = 'A'
   AND OT."HORA_FIN" IS NOT NULL
   AND TO_VARCHAR(T."FECHA", 'YYYY-MM-DD') <> TO_VARCHAR(CAST(OT."HORA_FIN" AS DATE), 'YYYY-MM-DD');
