-- 🔥 STORED PROCEDURE ADAPTADO PARA SOPORTAR BORRADORES
-- Este SP maneja tanto inserciones como actualizaciones de rutinas
-- Si ya existe una rutina para esa OrdenTrabajo, actualiza las actividades
-- Si no existe, crea una nueva

CREATE PROCEDURE "DBADMIN"."SpPdxMTTOGuardarRutinaMP" (
	IN P_ID_MANTENIMIENTO INTEGER,
	IN P_ID_EQUIPO INTEGER,
	IN P_COMENTARIOS NVARCHAR(2000),
	IN P_USUARIO_REGISTRO NVARCHAR(100),
	IN P_ID_OT_DETALLE NVARCHAR(50),
	IN P_ACTIVIDADES_JSON NCLOB,
	IN P_ES_BORRADOR NVARCHAR(5) DEFAULT 'false'  -- 🔥 NUEVO: Indicador de borrador
)
LANGUAGE SQLSCRIPT
SQL SECURITY INVOKER
AS
BEGIN
	DECLARE V_ID_RUTINA INTEGER;
	DECLARE V_FECHA_MEXICO LONGDATE;
	DECLARE V_RUTINA_EXISTE INTEGER;

	-- Tabla temporal para actividades
	DECLARE LT_ACTIVIDADES TABLE (
		ROWNUM BIGINT,
		DESCRIPCION NVARCHAR(2000),
		COMPLETADA NVARCHAR(2),
		ORDEN INTEGER
	);

	-- Obtener fecha/hora de México (UTC-6)
	SELECT ADD_SECONDS(CURRENT_UTCTIMESTAMP, -6*3600) INTO V_FECHA_MEXICO FROM DUMMY;

	-- 🔥 VERIFICAR SI LA RUTINA YA EXISTE PARA ESTA ORDEN
	SELECT COUNT(*) INTO V_RUTINA_EXISTE FROM "PdxMTTORutinasMP"
	WHERE "ID_OT_DETALLE" = :P_ID_OT_DETALLE;

	IF V_RUTINA_EXISTE > 0 THEN
		-- 📝 ACTUALIZAR RUTINA EXISTENTE (para borradores)
		UPDATE "PdxMTTORutinasMP" 
		SET 
			"COMENTARIOS" = :P_COMENTARIOS,
			"FECHA_ULT_MOD" = :V_FECHA_MEXICO,
			"USUARIO_MOD" = :P_USUARIO_REGISTRO
		WHERE "ID_OT_DETALLE" = :P_ID_OT_DETALLE;

		-- Obtener el ID de la rutina existente
		SELECT "ID_RUTINA" INTO V_ID_RUTINA FROM "PdxMTTORutinasMP"
		WHERE "ID_OT_DETALLE" = :P_ID_OT_DETALLE
		LIMIT 1;

		-- 🔥 ELIMINAR ACTIVIDADES PREVIAS (para reemplazarlas)
		DELETE FROM "PdxMTTOActividadesRutinasMP" 
		WHERE "ID_RUTINA" = :V_ID_RUTINA;

	ELSE
		-- ✅ INSERTAR RUTINA NUEVA
		INSERT INTO "PdxMTTORutinasMP" (
			"ID_MANTENIMIENTO",
			"ID_EQUIPO",
			"COMENTARIOS",
			"USUARIO_REGISTRO",
			"FECHA_REALIZACION",
			"FECHA_CREACION",
			"FECHA_ULT_MOD",
			"ID_OT_DETALLE"
		)
		VALUES (
			:P_ID_MANTENIMIENTO,
			:P_ID_EQUIPO,
			:P_COMENTARIOS,
			:P_USUARIO_REGISTRO,
			:V_FECHA_MEXICO,
			:V_FECHA_MEXICO,
			:V_FECHA_MEXICO,
			:P_ID_OT_DETALLE
		);

		-- Obtener el ID de la rutina recién creada
		SELECT CURRENT_IDENTITY_VALUE() INTO V_ID_RUTINA FROM DUMMY;
	END IF;

	-- 2️⃣ PARSEAR Y GUARDAR ACTIVIDADES DESDE JSON
	-- Formato: [{"numero":1,"descripcion":"...","estado":"realizado"}]
	LT_ACTIVIDADES = SELECT 
		ROW_NUMBER() OVER (ORDER BY "numero") AS ROWNUM,
		"descripcion" AS DESCRIPCION,
		CASE 
			WHEN "estado" = 'realizado' THEN 'SI'
			WHEN "estado" = 'no_realizado' THEN 'NO'
			ELSE 'NO'
		END AS COMPLETADA,
		"numero" AS ORDEN
	FROM JSON_TABLE(
		:P_ACTIVIDADES_JSON, '$[*]'
		COLUMNS(
			"numero" INTEGER PATH '$.numero',
			"descripcion" NVARCHAR(2000) PATH '$.descripcion',
			"estado" NVARCHAR(50) PATH '$.estado'
		)
	);

	-- ✅ INSERTAR ACTIVIDADES (nuevas o reemplazadas)
	INSERT INTO "PdxMTTOActividadesRutinasMP" (
		"ID_RUTINA",
		"NOMBRE_ACTIVIDAD",
		"DESCRIPCION",
		"COMPLETADA",
		"OBSERVACIONES",
		"ORDEN",
		"FECHA_CREACION"
	)
	SELECT 
		:V_ID_RUTINA,
		LEFT(DESCRIPCION, 100), -- Primeros 100 chars como nombre
		DESCRIPCION,
		COMPLETADA,
		NULL, -- Sin observaciones por ahora
		ORDEN,
		:V_FECHA_MEXICO
	FROM :LT_ACTIVIDADES;

	-- 3️⃣🔥 LOGICA DE BORRADORES
	-- Si es borrador (P_ES_BORRADOR = 'true'), NO validamos completitud
	-- Si no es borrador, validamos que TODAS las actividades estén completas

	IF :P_ES_BORRADOR = 'false' THEN
		-- Validar que todas las actividades estén completadas
		-- (se puede hacer aquí o en el back-end, esto es solo referencia)
		NULL; -- La validación se maneja en el back-end por ahora
	END IF;

	-- 4️⃣ RETORNAR RESULTADO
	SELECT 
		:V_ID_RUTINA AS "ID_RUTINA",
		'Rutina guardada correctamente' AS "MENSAJE",
		CASE WHEN V_RUTINA_EXISTE > 0 THEN 'ACTUALIZADA' ELSE 'INSERTADA' END AS "OPERACION"
	FROM DUMMY;

END
