-- ============================================================================
-- VERIFICACION - Fechas reales de reprogramacion
-- Fecha: 10/11/2026
--
-- Ejecutar en TEST_JUNIO_2026 primero y luego en PTM_2022_FINAL.
-- Sirve para validar el fix de SpPdxMTTOObtenerMantenimientosPorRango.
-- ============================================================================

-- 1) Registros con fechas reales y ENVIAR_SIGUIENTE_MES = TRUE.
--    Estos son los que la version anterior del SP ignoraba.
SELECT
    "ID_SOLICITUD",
    "NUMERO_ORDEN",
    "FECHA_REAL_INICIO",
    "FECHA_REAL_FIN",
    "ENVIAR_SIGUIENTE_MES",
    "ESTATUS",
    "MOTIVO"
FROM "PdxMTTOSolicitudesReprogramacion"
WHERE "ESTATUS" IN ('NA', 'Aceptada')
  AND "FECHA_REAL_INICIO" IS NOT NULL
  AND "FECHA_REAL_FIN" IS NOT NULL
  AND IFNULL("ENVIAR_SIGUIENTE_MES", FALSE) = TRUE
ORDER BY "NUMERO_ORDEN", "ID_SOLICITUD" DESC;

-- 2) Ordenes con mas de una solicitud no rechazada.
--    Si hay varias, la CTE ESTATUS_REPROGRAMACION puede duplicar ocurrencias.
SELECT
    "NUMERO_ORDEN",
    COUNT(*) AS "N_SOLICITUDES"
FROM "PdxMTTOSolicitudesReprogramacion"
WHERE "ESTATUS" <> 'Rechazada'
GROUP BY "NUMERO_ORDEN"
HAVING COUNT(*) > 1
ORDER BY "N_SOLICITUDES" DESC, "NUMERO_ORDEN";

-- 3) Detalle de solicitudes por orden (para revisar el caso que falle).
SELECT
    "ID_SOLICITUD",
    "NUMERO_ORDEN",
    "ID_EQUIPO",
    "FECHA_REAL_INICIO",
    "FECHA_REAL_FIN",
    "ENVIAR_SIGUIENTE_MES",
    "ESTATUS",
    "MOTIVO",
    "FECHA_ULT_MOD"
FROM "PdxMTTOSolicitudesReprogramacion"
ORDER BY "NUMERO_ORDEN", "ID_SOLICITUD" DESC;

-- 4) Prueba puntual: ajustar el NUMERO_ORDEN y el rango.
--    Debe devolver la ocurrencia en el mes de FECHA_REAL_INICIO.
--    (Ejecutar el SP desde la app o con CALL si el cliente lo permite).
/*
CALL "TEST_JUNIO_2026"."SpPdxMTTOObtenerMantenimientosPorRango"(
    '2026-12-01',
    '2026-12-31',
    NULL,          -- P_FILTRO_AREA
    NULL,          -- P_FILTRO_LINEA
    'OTMP-011',    -- P_FILTRO_ORDEN
    NULL,          -- P_FILTRO_PERIODICIDAD
    '1',           -- P_FILTRO_PLANTA
    NULL,          -- P_FILTRO_ESTATUS
    NULL,          -- P_FILTRO_BUSQUEDA
    'usuario@ptmexico.com',
    NULL, NULL, NULL, NULL,
    NULL, NULL, NULL, NULL,
    NULL, NULL
);
*/
