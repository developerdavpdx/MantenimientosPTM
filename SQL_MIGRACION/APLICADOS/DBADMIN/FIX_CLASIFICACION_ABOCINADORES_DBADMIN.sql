-- ============================================================================
-- FIX DE DATOS - CLASIFICACION DE ABOCINADORES
-- Fecha: 11/11/2026
-- Ambiente: DBADMIN (HANA Cloud)
-- Estado: APLICADO en DBADMIN
--
-- Objetivo:
--   Los equipos "Abocinador N" de la planta 2 estaban clasificados como
--   HERRAMENTALES. Por la regla de posiciones del modulo de Preventivos,
--   un tecnico TEC MTTO (posicion 3) no los veia. Se reclasifican como
--   MANTENIMIENTO.
--
-- Nota:
--   CLASIFICACION es un campo del portal (PdxMTTOGestionEquipos), no de SAP,
--   por lo que no se sobrescribe con la sincronizacion.
-- ============================================================================

-- 1) Antes
SELECT "ID_EQUIPO","NOMBRE_EQUIPO","CLASIFICACION","PLANTA","ESTATUS"
FROM "DBADMIN"."PdxMTTOGestionEquipos"
WHERE UPPER("NOMBRE_EQUIPO") LIKE '%ABOCINADOR%'
ORDER BY "PLANTA","NOMBRE_EQUIPO";

-- 2) Actualizar
UPDATE "DBADMIN"."PdxMTTOGestionEquipos"
SET "CLASIFICACION" = 'MANTENIMIENTO',
    "FECHA_ULT_MOD"  = CURRENT_TIMESTAMP
WHERE UPPER("NOMBRE_EQUIPO") LIKE '%ABOCINADOR%';

-- 3) Despues
SELECT "ID_EQUIPO","NOMBRE_EQUIPO","CLASIFICACION","PLANTA","ESTATUS"
FROM "DBADMIN"."PdxMTTOGestionEquipos"
WHERE UPPER("NOMBRE_EQUIPO") LIKE '%ABOCINADOR%'
ORDER BY "PLANTA","NOMBRE_EQUIPO";
