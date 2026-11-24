SET SCHEMA "PTM_2022_FINAL";
-- 2026-11-24: reporte de Paros de Produccion (SpPdxMTTOObtenerParosProduccion).
--   1) El combo "Proceso" no filtraba los paros generados por mantenimiento
--      correctivo (COR-xx): la rama de correctivos solo filtraba
--      planta/linea/fecha/estatus y devolvia ID_AREA nulo, asi que con
--      Proceso = PVC se veian COR de SERVICIOS / PEAD / etc.
--      -> AND (:p_ID_AREA IS NULL OR E.AREA = :p_ID_AREA) y E.AREA AS ID_AREA
--   2) No deben aparecer lineas que no son de produccion (SERVICIOS, MEZCLADO,
--      CALIDAD, SILOS, ...): se exige PRODUCCION = 1 en PdxMTTOLineasxPlanta.
--      En la rama manual el filtro solo aplica cuando llama el reporte
--      (p_INCLUIR_CORRECTIVO = 'S'); las bitacoras de tiempos muertos llaman
--      con NULL y no cambian.
--   3) La duracion de los COR usaba HORA_APERTURA -> HORA_CIERRE de la OT
--      (incluia los dias que tardo en cerrarse: casos de 112 / 321 / 174 h).
--      Ahora usa la ventana del tecnico HORA_INICIO -> HORA_FIN
--      (PdxMTTOOrdenesTrabajoMC); si esa ventana falta o es incoherente se
--      usa la del sistema como respaldo.
--
ALTER PROCEDURE "PTM_2022_FINAL"."SpPdxMTTOObtenerParosProduccion"(
    IN p_PLANTA           INT,
    IN p_FECHA_INICIO     DATE,
    IN p_FECHA_FIN        DATE,
    IN p_LINEA_PRODUCCION INT,
    IN p_ESTATUS          VARCHAR(1),
    IN p_ID_AREA          INT,
    IN p_INCLUIR_CORRECTIVO  VARCHAR(1) DEFAULT 'S',
    IN p_TIPO_LINEA       VARCHAR(10) DEFAULT NULL   -- NUEVO: 'PVC', 'INY', 'PEAD', 'CORR'
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN

    SELECT *
    FROM
    (

        --------------------------------------------
        -- PAROS MANUALES
        --------------------------------------------
        SELECT
            PAR.ID_PARO,

            PAR.LINEA_PRODUCCION,

            LIN.LINEA                                                AS LINEA_PRODUCCION_DESC,

            LIN.PLANTA,

            PAR.ARTICULO,

            COALESCE(ITM."ItemName",'N/A')                           AS ARTICULO_DESC,

            CAST(IFNULL(ITM."U_PESO_MIN", 0) AS DECIMAL(19,6))       AS PESO_MINIMO,

            CAST(IFNULL(ITM."U_PESO_MAX", 0) AS DECIMAL(19,6))       AS PESO_MAXIMO,

            CAST(IFNULL(CAP."U_PDX_PZSXDIA", 0) AS DECIMAL(19,6))    AS PZS_DIA,

            CAST(IFNULL(CAP."U_PDX_KGSXDIA", 0) AS DECIMAL(19,6))    AS KGS_DIA,

            PAR.USUARIO,

            PAR.COMENTARIOS,

            PAR.ESTATUS,

            '' AS ORDEN_TRABAJO_FINALIZADA,

            ''   AS DESC_ESTATUS_ORDEN,

            TO_VARCHAR(
                PAR.FECHA_PARO,
                'DD/MM/YYYY HH24:MI'
            )                                                        AS FECHA_PARO_STRING,

            TO_VARCHAR(
                PAR.FECHA_REANUDACION,
                'DD/MM/YYYY HH24:MI'
            )                                                        AS FECHA_REANUDACION_STRING,

            PAR.DURACION_HRS,

            CASE PAR.ESTATUS
                WHEN 'O' THEN '#ef4444'
                WHEN 'C' THEN '#94a3b8'
                ELSE '#ef4444'
            END                                                      AS COLOR_EVENTO,

            'MANUAL'                                                 AS TIPO_PARO,

            COALESCE(CAT.NOMBRE,'SIN CATEGORIA')                     AS CATEGORIA,

            PAR.FECHA_PARO                                           AS FECHA_ORDEN,

            PAR.ID_AREA                                              AS ID_AREA

        FROM "PdxMTTOTParoProduccion" PAR

        INNER JOIN "PdxMTTOLineasxPlanta" LIN
            ON LIN.ID_LINEA = PAR.LINEA_PRODUCCION

        LEFT JOIN "PdxMTTOCategoriasParo" CAT
            ON CAT.ID_CATEGORIA_PARO = PAR.ID_CATEGORIA_PARO

        LEFT JOIN "OITM" ITM
            ON ITM."ItemCode" = PAR.ARTICULO

        LEFT JOIN (

            SELECT *
            FROM (

                SELECT

                    CAP.*,

                    ROW_NUMBER() OVER(
                        PARTITION BY
                            CAP."U_PDX_CODART",
                            CAP."U_PDX_PLANTA",
                            CAP."U_PDX_LINEA"
                        ORDER BY CAP."Code"
                    ) AS RN

                FROM "@PDX_CAPPROD" CAP

            )

            WHERE RN = 1

        ) CAP
            ON TRIM(CAP."U_PDX_CODART") = TRIM(PAR.ARTICULO)
            AND CAP."U_PDX_PLANTA" = LPAD(CAST(LIN.PLANTA AS NVARCHAR(2)), 2, '0')
            AND CAP."U_PDX_LINEA"  = LPAD(
                                        SUBSTR_REGEXPR('[0-9]+' IN LIN.LINEA),
                                        2, '0'
                                     )

        WHERE
            LIN.STATUS = 1

            AND CAST(PAR.FECHA_PARO AS DATE)
                BETWEEN :p_FECHA_INICIO
                    AND :p_FECHA_FIN

            AND (
                :p_LINEA_PRODUCCION IS NULL
                OR PAR.LINEA_PRODUCCION = :p_LINEA_PRODUCCION
            )

            AND (
                :p_PLANTA IS NULL
                OR LIN.PLANTA = :p_PLANTA
            )

            AND (
                (:p_ESTATUS IS NULL AND PAR.ESTATUS <> 'C')
                OR PAR.ESTATUS = :p_ESTATUS
            )

            AND (
                :p_ID_AREA IS NULL
                OR PAR.ID_AREA = :p_ID_AREA
            )

            -- Solo lineas de produccion. El reporte de Paros llama con
            -- p_INCLUIR_CORRECTIVO = 'S'; las bitacoras de tiempos muertos
            -- llaman con NULL y conservan el comportamiento anterior.
            -- Solo lineas de produccion. El reporte de Paros llama con
            -- p_INCLUIR_CORRECTIVO = 'S'; las bitacoras de tiempos muertos
            -- llaman con NULL y conservan el comportamiento anterior.
            -- Ademas de la bandera PRODUCCION se excluyen por nombre las lineas
            -- que no son de produccion, por si la bandera esta mal capturada.
            AND (
                :p_INCLUIR_CORRECTIVO IS NULL
                OR (
                    LIN.PRODUCCION = 1
                    AND UPPER(TRIM(LIN.LINEA)) NOT LIKE 'SERVICIOS%'
                    AND UPPER(TRIM(LIN.LINEA)) NOT LIKE 'CALIDAD%'
                    AND UPPER(TRIM(LIN.LINEA)) NOT LIKE 'MEZCLADO%'
                    AND UPPER(TRIM(LIN.LINEA)) NOT LIKE 'SILOS%'
                    AND UPPER(TRIM(LIN.LINEA)) NOT LIKE 'MOLINO%'
                    AND UPPER(TRIM(LIN.LINEA)) NOT LIKE 'FFCC%'
                    AND UPPER(TRIM(LIN.LINEA)) NOT LIKE 'OTROS%'
                    AND UPPER(TRIM(LIN.LINEA)) NOT LIKE '%PRUEBA%'
                )
            )
            -- NUEVO: excluye paros manuales que ya fueron migrados/capturados
            -- en la tabla de tiempos muertos correspondiente al tipo de lÃ­nea
            -- indicado en :p_TIPO_LINEA. Solo aplica a paros manuales, NO a
            -- correctivos. Si :p_TIPO_LINEA es NULL, no excluye nada.
            AND NOT EXISTS (
               SELECT 1
                FROM "PdxMTTOTiemposMuertosProduccionPVC" TMP
                WHERE TMP."ID_PARO" LIKE '%"' || CAST(PAR.ID_PARO AS NVARCHAR(20)) || '"%'
                  AND :p_TIPO_LINEA = 'PVC'

                UNION ALL

                SELECT 1
                FROM "PdxMTTOTiemposMuertosProduccionINY" TMP
                WHERE TMP."ID_PARO" LIKE '%"' || CAST(PAR.ID_PARO AS NVARCHAR(20)) || '"%'
                  AND :p_TIPO_LINEA = 'INY'

                UNION ALL

                SELECT 1
                FROM "PdxMTTOTiemposMuertosProduccionPeadLiso" TMP
                WHERE TMP."ID_PARO" LIKE '%"' || CAST(PAR.ID_PARO AS NVARCHAR(20)) || '"%'
                  AND :p_TIPO_LINEA = 'PEAD'

                UNION ALL

               SELECT 1
                FROM "PdxMTTOTiemposMuertosProduccionCorrugado" TMP
                WHERE TMP."ID_PARO" LIKE '%"' || CAST(PAR.ID_PARO AS NVARCHAR(20)) || '"%'
                  AND :p_TIPO_LINEA = 'CORR'
            )

        UNION ALL

        --------------------------------------------
        -- PAROS POR MANTENIMIENTO CORRECTIVO
        --------------------------------------------
        SELECT
            S.ID_SOLICITUD                                           AS ID_PARO,

            E.LINEA_PRODUCCION,

            COALESCE(LE.LINEA,'')                                    AS LINEA_PRODUCCION_DESC,

            E.PLANTA,

            E."NOMBRE_EQUIPO"                                        AS ARTICULO,

            ''                                                    AS ARTICULO_DESC,

            CAST(IFNULL(ITM2."U_PESO_MIN", 0) AS DECIMAL(19,6))      AS PESO_MINIMO,

            CAST(IFNULL(ITM2."U_PESO_MAX", 0) AS DECIMAL(19,6))      AS PESO_MAXIMO,

            CAST(IFNULL(CAP2."U_PDX_PZSXDIA", 0) AS DECIMAL(19,6))   AS PZS_DIA,

            CAST(IFNULL(CAP2."U_PDX_KGSXDIA", 0) AS DECIMAL(19,6))   AS KGS_DIA,

            S.SOLICITANTE                                            AS USUARIO,

            S.TEXTO_CORTO                                            AS COMENTARIOS,

            CASE
                WHEN MCG.ESTATUS = 4 THEN 'C'
                ELSE 'O'
            END                                                      AS ESTATUS,

            CASE
		    WHEN OT."ID_OT_DETALLE" IS NOT NULL
		        AND LENGTH(TRIM(OT."FIRMA_REALIZO"))   > 0
		        AND LENGTH(TRIM(OT."FIRMA_SUPERVISO")) > 0
		    THEN 'SI'
		    ELSE 'NO'
		END AS ORDEN_TRABAJO_FINALIZADA,

		COALESCE(ESOT."DESCRIPCION", '')    AS DESC_ESTATUS_ORDEN,

            -- Ventana de la actividad: hora inicio / fin del TECNICO
            -- (PdxMTTOOrdenesTrabajoMC). Si falta alguna de las dos se usa la
            -- del sistema solo para ese extremo. Antes la duracion salia de
            -- HORA_APERTURA -> HORA_CIERRE de la OT, que incluye los dias que
            -- la orden tardo en cerrarse (casos de 112 / 321 / 174 h).
            -- Si el fin queda antes del inicio (captura invalida) se usa la
            -- ventana del sistema completa.
            TO_VARCHAR(
                CASE
                    WHEN COALESCE(OT."HORA_FIN", MCG.HORA_CIERRE)
                            >= COALESCE(OT."HORA_INICIO", MCG.HORA_APERTURA)
                    THEN COALESCE(OT."HORA_INICIO", MCG.HORA_APERTURA)
                    ELSE MCG.HORA_APERTURA
                END,
                'DD/MM/YYYY HH24:MI'
            )                                                        AS FECHA_PARO_STRING,

            TO_VARCHAR(
                CASE
                    WHEN COALESCE(OT."HORA_FIN", MCG.HORA_CIERRE)
                            >= COALESCE(OT."HORA_INICIO", MCG.HORA_APERTURA)
                    THEN COALESCE(OT."HORA_FIN", MCG.HORA_CIERRE)
                    ELSE MCG.HORA_CIERRE
                END,
                'DD/MM/YYYY HH24:MI'
            )                                                        AS FECHA_REANUDACION_STRING,

            CASE
                -- 1) ventana del tecnico (con respaldo por extremo) coherente
                WHEN COALESCE(OT."HORA_FIN", MCG.HORA_CIERRE)
                        >= COALESCE(OT."HORA_INICIO", MCG.HORA_APERTURA)
                THEN ROUND(
                    SECONDS_BETWEEN(
                        COALESCE(OT."HORA_INICIO", MCG.HORA_APERTURA),
                        COALESCE(OT."HORA_FIN", MCG.HORA_CIERRE)
                    ) / 3600,
                    2
                )
                -- 2) respaldo: ventana del sistema
                WHEN MCG.HORA_APERTURA IS NOT NULL
                 AND MCG.HORA_CIERRE IS NOT NULL
                 AND MCG.HORA_CIERRE >= MCG.HORA_APERTURA
                THEN ROUND(
                    SECONDS_BETWEEN(MCG.HORA_APERTURA, MCG.HORA_CIERRE) / 3600,
                    2
                )
                ELSE NULL
            END                                                      AS DURACION_HRS,

            CASE
                WHEN MCG.ESTATUS = 4 THEN '#94a3b8'
                ELSE '#f97316'
            END                                                      AS COLOR_EVENTO,

            'CORRECTIVO'                                             AS TIPO_PARO,

            'CORRECTIVO'                                             AS CATEGORIA,

            COALESCE(OT."HORA_INICIO", MCG.HORA_APERTURA)         AS FECHA_ORDEN,

            E.AREA                                                  AS ID_AREA

        FROM "PdxMTTOSolicitudMC" S

        INNER JOIN "PdxMTTOGestionEquipos" E
            ON S.ID_EQUIPO = E.ID_EQUIPO

        LEFT JOIN "PdxMTTOLineasxPlanta" LE
            ON (
                CASE
                    WHEN E.LINEA_PRODUCCION IS NOT NULL
                     AND TRIM(E.LINEA_PRODUCCION) <> ''
                     AND TRIM(E.LINEA_PRODUCCION) LIKE_REGEXPR '^[0-9]+$'
                    THEN TO_INTEGER(TRIM(E.LINEA_PRODUCCION))
                    ELSE NULL
                END
            ) = LE.ID_LINEA

        LEFT JOIN "PdxMTTOMCGenerados" MCG
            ON S.ID_SOLICITUD = MCG.ID_SOLICITUD

		LEFT JOIN "PdxMTTOOrdenesTrabajoMC" OT
        ON MCG."NUMERO_ORDEN" = OT."NUMERO_ORDEN"

        LEFT JOIN "PdxMTTOEstatusOT" ESOT
        ON MCG."ESTATUS" = ESOT."ID_ESTATUS"

        LEFT JOIN "OITM" ITM2
        ON ITM2."ItemCode" = E."NOMBRE_EQUIPO"

        LEFT JOIN (

            SELECT *
            FROM (

                SELECT

                    CAP.*,

                    ROW_NUMBER() OVER(
                        PARTITION BY
                            CAP."U_PDX_CODART",
                            CAP."U_PDX_PLANTA",
                            CAP."U_PDX_LINEA"
                        ORDER BY CAP."Code"
                    ) AS RN

                FROM "@PDX_CAPPROD" CAP

            )

            WHERE RN = 1

        ) CAP2
            ON TRIM(CAP2."U_PDX_CODART") = TRIM(E."NOMBRE_EQUIPO")
            AND CAP2."U_PDX_PLANTA" = LPAD(CAST(E.PLANTA AS NVARCHAR(2)), 2, '0')
            AND CAP2."U_PDX_LINEA"  = LPAD(
                                        SUBSTR_REGEXPR('[0-9]+' IN LE.LINEA),
                                        2, '0'
                                     )

        WHERE
            :p_INCLUIR_CORRECTIVO = 'S'   -- si es 'N' este bloque no regresa nada

            AND MCG.HORA_APERTURA IS NOT NULL

            AND CAST(MCG.HORA_APERTURA AS DATE)
                BETWEEN :p_FECHA_INICIO
                    AND :p_FECHA_FIN

            AND (
                :p_LINEA_PRODUCCION IS NULL
                OR (
                    CASE
                        WHEN E.LINEA_PRODUCCION IS NOT NULL
                         AND TRIM(E.LINEA_PRODUCCION) <> ''
                         AND TRIM(E.LINEA_PRODUCCION) LIKE_REGEXPR '^[0-9]+$'
                        THEN TO_INTEGER(TRIM(E.LINEA_PRODUCCION))
                        ELSE NULL
                    END
                ) = :p_LINEA_PRODUCCION
            )

            AND (
                :p_PLANTA IS NULL
                OR E.PLANTA = :p_PLANTA
            )

            AND (
			    :p_ESTATUS IS NULL
			    OR (
			        CASE
			            WHEN MCG.ESTATUS = 4 THEN 'C'
			            ELSE 'O'
			        END
			    ) = :p_ESTATUS
			)

            AND (
                :p_ID_AREA IS NULL
                OR E.AREA = :p_ID_AREA
            )

            -- Solo lineas de produccion (SERVICIOS, MEZCLADO, CALIDAD, SILOS...
            -- tienen PRODUCCION = 0 en PdxMTTOLineasxPlanta). Se excluyen tambien
            -- por nombre por si la bandera esta mal capturada.
            AND LE.PRODUCCION = 1
            AND UPPER(TRIM(LE.LINEA)) NOT LIKE 'SERVICIOS%'
            AND UPPER(TRIM(LE.LINEA)) NOT LIKE 'CALIDAD%'
            AND UPPER(TRIM(LE.LINEA)) NOT LIKE 'MEZCLADO%'
            AND UPPER(TRIM(LE.LINEA)) NOT LIKE 'SILOS%'
            AND UPPER(TRIM(LE.LINEA)) NOT LIKE 'MOLINO%'
            AND UPPER(TRIM(LE.LINEA)) NOT LIKE 'FFCC%'
            AND UPPER(TRIM(LE.LINEA)) NOT LIKE 'OTROS%'
            AND UPPER(TRIM(LE.LINEA)) NOT LIKE '%PRUEBA%'
            -- NOTA: aquÃ­ NO se aplica exclusiÃ³n contra las tablas de tiempos
            -- muertos, segÃºn lo solicitado esa exclusiÃ³n solo aplica a
            -- paros manuales.

    ) T

    ORDER BY
        T.FECHA_ORDEN DESC,
        T.LINEA_PRODUCCION;

END


