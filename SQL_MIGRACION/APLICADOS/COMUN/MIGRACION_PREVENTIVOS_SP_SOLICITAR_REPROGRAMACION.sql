-- ============================================================================
-- APLICADO/VALIDADO - 10/11/2026
-- SP: SpPdxMTTOSolicitarReprogramacion
--
-- CAMBIO:
--   Si P_ID_SOLICITUD viene en 0 o NULL, busca la ultima solicitud NO rechazada
--   del mismo NUMERO_ORDEN y la ACTUALIZA. Si no existe ninguna, inserta una
--   nueva como hasta ahora.
--
-- APLICADO EN:
--   - DBADMIN (validacion)
--   - TEST_JUNIO_2026
--   - PTM_2022_FINAL
-- ============================================================================
CREATE OR REPLACE PROCEDURE "DBADMIN"."SpPdxMTTOSolicitarReprogramacion" (
    IN P_ID_SOLICITUD     INTEGER,
    IN P_ID_EQUIPO        INTEGER,
    IN P_NUMERO_ORDEN     NVARCHAR(50),
    IN P_FECHA_REP_INICIO TIMESTAMP,
    IN P_FECHA_REP_FIN    TIMESTAMP,
    IN P_ENVIAR_SIGUIENTE_MES BOOLEAN,
    IN P_MOTIVO           NVARCHAR(500),
    IN P_USUARIO_SOLICITA NVARCHAR(150),
    IN P_ID_PERIODICIDAD  INTEGER,
    IN P_PLANTA           INTEGER,
    IN P_ESTATUS          NVARCHAR(20)   -- ✅ NULL = crear/editar | 'Aceptada'/'Rechazada' = resolver
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN

    DECLARE V_FECHA_MEXICO LONGDATE;

    SELECT ADD_SECONDS(CURRENT_UTCTIMESTAMP, -6*3600)
    INTO V_FECHA_MEXICO
    FROM DUMMY;

    MERGE INTO "PdxMTTOSolicitudesReprogramacion" AS T
    USING (
        SELECT COALESCE(
            NULLIF(:P_ID_SOLICITUD, 0),
            (
                SELECT MAX("ID_SOLICITUD")
                FROM "PdxMTTOSolicitudesReprogramacion"
                WHERE "NUMERO_ORDEN" = :P_NUMERO_ORDEN
                  AND "ESTATUS" <> 'Rechazada'
            )
        ) AS ID_SOLICITUD
        FROM DUMMY
    ) AS S
    ON T."ID_SOLICITUD" = S.ID_SOLICITUD

    WHEN MATCHED
        -- ✅ solo se puede tocar (editar o resolver) si sigue Pendiente
         AND (T."ESTATUS" = 'Aceptada' OR T."ESTATUS" = 'Pendiente' OR T."ESTATUS" = 'NA')
    THEN
    UPDATE SET

        "ID_EQUIPO" = CASE
            WHEN :P_ID_EQUIPO IS NULL
            THEN T."ID_EQUIPO"
            ELSE :P_ID_EQUIPO
        END,

        "NUMERO_ORDEN" = CASE
            WHEN :P_NUMERO_ORDEN IS NULL OR :P_NUMERO_ORDEN = ''
            THEN T."NUMERO_ORDEN"
            ELSE :P_NUMERO_ORDEN
        END,
        
		"FECHA_REAL_INICIO" = CASE
		    WHEN :P_ENVIAR_SIGUIENTE_MES = TRUE THEN NULL
		    WHEN :P_FECHA_REP_INICIO IS NULL THEN T."FECHA_REAL_INICIO"
		    ELSE :P_FECHA_REP_INICIO
		END,
		"FECHA_REAL_FIN" = CASE
		    WHEN :P_ENVIAR_SIGUIENTE_MES = TRUE THEN NULL
		    WHEN :P_FECHA_REP_FIN IS NULL THEN T."FECHA_REAL_FIN"
		    ELSE :P_FECHA_REP_FIN
		END,

        "MOTIVO" = CASE
            WHEN :P_MOTIVO IS NULL OR :P_MOTIVO = ''
            THEN T."MOTIVO"
            ELSE :P_MOTIVO
        END,
        
        "ENVIAR_SIGUIENTE_MES" = CASE
		    WHEN :P_ENVIAR_SIGUIENTE_MES IS NULL THEN T."ENVIAR_SIGUIENTE_MES"
		    ELSE :P_ENVIAR_SIGUIENTE_MES
		END,

        "USUARIO_SOLICITA" = CASE
            WHEN :P_USUARIO_SOLICITA IS NULL OR :P_USUARIO_SOLICITA = ''
            THEN T."USUARIO_SOLICITA"
            ELSE :P_USUARIO_SOLICITA
        END,

        "ID_PERIODICIDAD" = CASE
            WHEN :P_ID_PERIODICIDAD IS NULL
            THEN T."ID_PERIODICIDAD"
            ELSE :P_ID_PERIODICIDAD
        END,

        "PLANTA" = CASE
            WHEN :P_PLANTA IS NULL
            THEN T."PLANTA"
            ELSE :P_PLANTA
        END,

        -- ✅ solo cambia ESTATUS si viene explícito 'Aceptada' o 'Rechazada'
		"ESTATUS" = CASE

		    -- Si no viene estatus, no modificar el actual
		    WHEN :P_ESTATUS IS NULL
		    THEN T."ESTATUS"
		
		    -- Solo si viene explícitamente
		    WHEN :P_ESTATUS IN ('Aceptada', 'Rechazada')
		    THEN :P_ESTATUS
		
		    WHEN :P_ENVIAR_SIGUIENTE_MES = TRUE  -- ✅ si marca siguiente mes → Pendiente
		    THEN 'Pendiente'
		
		    WHEN :P_ENVIAR_SIGUIENTE_MES = FALSE
		         AND :P_FECHA_REP_INICIO IS NOT NULL
		         AND :P_FECHA_REP_FIN IS NOT NULL
		    THEN 'NA'
		
		    ELSE T."ESTATUS"
		
		END,
        "FECHA_ULT_MOD" = :V_FECHA_MEXICO

    WHEN NOT MATCHED THEN
        INSERT (
            "ID_EQUIPO",
            "NUMERO_ORDEN",
            "MOTIVO",
            "USUARIO_SOLICITA",
            "ID_PERIODICIDAD",
            "PLANTA",
            "ESTATUS",
            "FECHA_CREACION",
            "FECHA_ULT_MOD",
            "FECHA_REAL_INICIO",
			"FECHA_REAL_FIN",
			"ENVIAR_SIGUIENTE_MES"
        )
        VALUES (
            :P_ID_EQUIPO,
            IFNULL(NULLIF(:P_NUMERO_ORDEN, ''), 'S/N'),
            IFNULL(NULLIF(:P_MOTIVO, ''), 'S/N'),
            IFNULL(NULLIF(:P_USUARIO_SOLICITA, ''), 'S/N'),
            :P_ID_PERIODICIDAD,
            :P_PLANTA,
            CASE 
	            WHEN :P_ENVIAR_SIGUIENTE_MES = FALSE AND :P_FECHA_REP_INICIO IS NOT NULL AND :P_FECHA_REP_FIN IS NOT NULL 
	            THEN 'NA'
	            ELSE 'Pendiente'
	        END,
            :V_FECHA_MEXICO,
            :V_FECHA_MEXICO,
            :P_FECHA_REP_INICIO,
			:P_FECHA_REP_FIN,
			:P_ENVIAR_SIGUIENTE_MES
        );

    -- RETORNO: soporta ambos casos (crear/editar por equipo+orden, o resolver por ID_SOLICITUD)
    SELECT "ID_SOLICITUD", "ESTATUS" AS "ESTATUS_ACTUAL"
    FROM "PdxMTTOSolicitudesReprogramacion"
    WHERE "ID_SOLICITUD" = COALESCE(
	    CASE WHEN :P_ID_SOLICITUD = 0 OR :P_ID_SOLICITUD IS NULL THEN NULL ELSE :P_ID_SOLICITUD END,
	    (
	        SELECT "ID_SOLICITUD"
	        FROM "PdxMTTOSolicitudesReprogramacion"
	        WHERE "ID_EQUIPO" = :P_ID_EQUIPO
	          AND "NUMERO_ORDEN" = IFNULL(NULLIF(:P_NUMERO_ORDEN, ''), 'S/N')
	        ORDER BY "ID_SOLICITUD" DESC
	        LIMIT 1
	    )
	);
END