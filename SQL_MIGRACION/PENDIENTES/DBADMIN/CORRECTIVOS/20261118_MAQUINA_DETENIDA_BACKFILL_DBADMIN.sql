-- ============================================================================
-- CORRECTIVOS - Backfill del indicador MAQUINA_DETENIDA de la OT
-- ============================================================================
-- ESTADO: PENDIENTE DE APLICAR. No se pudo ejecutar el 18/11/2026 porque el
--         ambiente local no logra conectar a HANA Cloud (el proveedor SAP
--         falla al crear el motor SSL; el portal http://localhost:54321
--         devuelve el mismo error en /Login/ValidaUsuario).
--
-- PROBLEMA QUE RESUELVE
--   La caratula de una OT correctiva cerrada se reabre con el switch
--   "Maquina detenida" APAGADO ("El equipo opero normalmente") aunque en el
--   momento de guardar SI estaba encendido y se genero el paro COR-xx.
--   La cadena de lectura esta bien:
--     SpPdxMTTOObtenerMantenimientosCorrectivos
--       -> COALESCE(OT."MAQUINA_DETENIDA", 0) AS MAQUINA_DETENIDA
--       -> MantenimientoCorrectivoRangoLIST.MaquinaDetenida
--       -> buildDataAttributes -> data-maquinadetenida
--       -> _configurarBannerMaquinaDetenida
--   por lo que el 0 viene de la propia columna:
--     "PdxMTTOOrdenesTrabajoMC"."MAQUINA_DETENIDA"
--   Este script rellena esa columna a partir de los paros COR-xx ya creados.
--
-- SCHEMA: DBADMIN (HANA Cloud). Para on-premise usar el mismo cuerpo
--         cambiando el prefijo "DBADMIN"." por "TEST_JUNIO_2026"." o
--         "PTM_2022_FINAL"." (las tablas y columnas son iguales).
-- ============================================================================


-- ============================================================================
-- PASO 0 - DIAGNOSTICO (no modifica nada)
-- ============================================================================

-- 0.1 OTs con paro COR creado pero con la bandera en 0 / NULL
SELECT COUNT(*) AS OTS_A_CORREGIR
FROM "DBADMIN"."PdxMTTOOrdenesTrabajoMC" OT
WHERE COALESCE(OT."MAQUINA_DETENIDA", 0) = 0
  AND EXISTS (
        SELECT 1
        FROM "DBADMIN"."PdxMTTOTParoProduccion" P
        WHERE P."ORDEN_TRABAJO" = OT."NUMERO_ORDEN"
          AND P."TIPO_PARO" = 'CORRECTIVO'
  );

-- 0.2 Detalle (revisar antes de aplicar)
SELECT OT."NUMERO_ORDEN",
       OT."MAQUINA_DETENIDA"          AS BANDERA_ACTUAL,
       COUNT(P."ID_PARO")             AS PAROS_COR,
       MIN(P."DURACION_HRS")          AS HORAS_PARO
FROM "DBADMIN"."PdxMTTOOrdenesTrabajoMC" OT
INNER JOIN "DBADMIN"."PdxMTTOTParoProduccion" P
        ON P."ORDEN_TRABAJO" = OT."NUMERO_ORDEN"
       AND P."TIPO_PARO" = 'CORRECTIVO'
WHERE COALESCE(OT."MAQUINA_DETENIDA", 0) = 0
GROUP BY OT."NUMERO_ORDEN", OT."MAQUINA_DETENIDA"
ORDER BY OT."NUMERO_ORDEN";

-- 0.3 Caso inverso (bandera 1 sin paro): solo informativo, NO se toca
SELECT OT."NUMERO_ORDEN", OT."MAQUINA_DETENIDA"
FROM "DBADMIN"."PdxMTTOOrdenesTrabajoMC" OT
WHERE OT."MAQUINA_DETENIDA" = 1
  AND NOT EXISTS (
        SELECT 1
        FROM "DBADMIN"."PdxMTTOTParoProduccion" P
        WHERE P."ORDEN_TRABAJO" = OT."NUMERO_ORDEN"
          AND P."TIPO_PARO" = 'CORRECTIVO'
  );


-- ============================================================================
-- PASO 1 - RESPALDO (obligatorio antes del UPDATE)
-- ============================================================================
DROP TABLE "DBADMIN"."_BAK_PdxMTTOOrdenesTrabajoMC_MD_20261118";
CREATE TABLE "DBADMIN"."_BAK_PdxMTTOOrdenesTrabajoMC_MD_20261118" AS
SELECT "NUMERO_ORDEN", "MAQUINA_DETENIDA", CURRENT_TIMESTAMP AS FECHA_RESPALDO
FROM "DBADMIN"."PdxMTTOOrdenesTrabajoMC";


-- ============================================================================
-- PASO 2 - BACKFILL
-- Solo las OT que YA generaron un paro COR-xx (evidencia de que el switch
-- estaba encendido al guardar). No se inventan valores en OT sin paro.
-- ============================================================================
UPDATE "DBADMIN"."PdxMTTOOrdenesTrabajoMC" OT
   SET OT."MAQUINA_DETENIDA" = 1
WHERE COALESCE(OT."MAQUINA_DETENIDA", 0) = 0
  AND EXISTS (
        SELECT 1
        FROM "DBADMIN"."PdxMTTOTParoProduccion" P
        WHERE P."ORDEN_TRABAJO" = OT."NUMERO_ORDEN"
          AND P."TIPO_PARO" = 'CORRECTIVO'
  );


-- ============================================================================
-- PASO 3 - VERIFICACION
-- ============================================================================

-- 3.1 Debe devolver 0
SELECT COUNT(*) AS PENDIENTES
FROM "DBADMIN"."PdxMTTOOrdenesTrabajoMC" OT
WHERE COALESCE(OT."MAQUINA_DETENIDA", 0) = 0
  AND EXISTS (
        SELECT 1
        FROM "DBADMIN"."PdxMTTOTParoProduccion" P
        WHERE P."ORDEN_TRABAJO" = OT."NUMERO_ORDEN"
          AND P."TIPO_PARO" = 'CORRECTIVO'
  );

-- 3.2 La OT del reporte (ajustar el numero si aplica) debe salir en 1
-- SELECT "NUMERO_ORDEN", "MAQUINA_DETENIDA"
-- FROM "DBADMIN"."PdxMTTOOrdenesTrabajoMC"
-- WHERE "NUMERO_ORDEN" = 'OTMC-011';

-- 3.3 El SP debe devolverla (misma consulta que usa el portal)
-- CALL "DBADMIN"."SpPdxMTTOObtenerMantenimientosCorrectivos"(
--     '2026-01-01','2026-12-31',NULL,NULL,'OTMC-011',4,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);


-- ============================================================================
-- PASO 4 - ROLLBACK (si hiciera falta)
-- ============================================================================
-- UPDATE "DBADMIN"."PdxMTTOOrdenesTrabajoMC" OT
--    SET OT."MAQUINA_DETENIDA" = B."MAQUINA_DETENIDA"
-- FROM "DBADMIN"."_BAK_PdxMTTOOrdenesTrabajoMC_MD_20261118" B
-- WHERE B."NUMERO_ORDEN" = OT."NUMERO_ORDEN";
-- DROP TABLE "DBADMIN"."_BAK_PdxMTTOOrdenesTrabajoMC_MD_20261118";


-- ============================================================================
-- NOTA SOBRE EL WRITE (SpPdxMTTOInsertaOrdenTrabajoMC)
-- ----------------------------------------------------------------------------
-- El aplicativo ya NO envia NULL en P_MAQUINA_DETENIDA cuando la OT esta en
-- estatus 4 (antes se enviaba NULL esperando que el SP conservara el valor;
-- si el SP hace  "MAQUINA_DETENIDA" = :P_MAQUINA_DETENIDA  sin COALESCE, el
-- estado se perdia al firmar supervision / administracion).
--
-- Si al aplicar este script el problema reaparece en OT nuevas, revisar el
-- cuerpo del SP y asegurar que en el UPDATE use:
--     "MAQUINA_DETENIDA" = COALESCE(:P_MAQUINA_DETENIDA, "MAQUINA_DETENIDA")
--
-- Verificacion rapida despues de cerrar una OT de prueba con el switch
-- encendido y firmar como supervisor:
--     SELECT "NUMERO_ORDEN", "MAQUINA_DETENIDA"
--     FROM "DBADMIN"."PdxMTTOOrdenesTrabajoMC"
--     WHERE "NUMERO_ORDEN" = '<OT de prueba>';
-- ============================================================================
