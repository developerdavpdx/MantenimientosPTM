-- 2026-11-24: ROLLBACK del apagado de categorias de paro.
-- El usuario confirmo que "CORRECTIVO", "MANTENIMIENTO PREVENTIVO" y
-- "MTTO CORRECTIVOS" son categorias de produccion (no solo de mantenimiento)
-- y deben seguir disponibles para capturar paros manuales, asi que se
-- reactivan con STATUS = 1.
--
-- Rollback de este script: volver a poner STATUS = 0
--   UPDATE "PdxMTTOCategoriasParo" SET "STATUS" = 0
--    WHERE "NOMBRE" IN ('CORRECTIVO', 'MANTENIMIENTO PREVENTIVO', 'MTTO CORRECTIVOS');

UPDATE "PdxMTTOCategoriasParo"
   SET "STATUS" = 1
 WHERE "NOMBRE" IN ('CORRECTIVO', 'MANTENIMIENTO PREVENTIVO', 'MTTO CORRECTIVOS')
   AND "STATUS" = 0;

-- @@

SELECT "ID_CATEGORIA_PARO", "NOMBRE", "PLANTA", "STATUS"
  FROM "PdxMTTOCategoriasParo"
 WHERE "NOMBRE" IN ('CORRECTIVO', 'MANTENIMIENTO PREVENTIVO', 'MTTO CORRECTIVOS')
 ORDER BY "ID_CATEGORIA_PARO";
