-- 2026-11-24: el modal "Registrar Paro de Produccion" permitia elegir como
-- Categoria "CORRECTIVO", "MANTENIMIENTO PREVENTIVO" y "MTTO CORRECTIVOS".
-- Esas categorias las asigna el sistema desde las ordenes de trabajo
-- (correctivos / preventivos), por lo que no deben capturarse a mano en un
-- paro manual. Se apagan con STATUS = 0; SpPdxMTTOGetCategoriasParo ya filtra
-- STATUS = 1, asi que desaparecen del combo sin tocar codigo.
-- El historico conserva su categoria (el reporte une por ID sin filtrar STATUS).
--
-- Rollback:
--   UPDATE "PdxMTTOCategoriasParo" SET "STATUS" = 1
--    WHERE "ID_CATEGORIA_PARO" IN (SELECT "ID_CATEGORIA_PARO" FROM "PdxMTTOCategoriasParo_BAK_20261124");
--
-- Re-ejecutar: borrar antes la tabla PdxMTTOCategoriasParo_BAK_20261124.

CREATE TABLE "PdxMTTOCategoriasParo_BAK_20261124" AS (
    SELECT * FROM "PdxMTTOCategoriasParo"
     WHERE "NOMBRE" IN ('CORRECTIVO', 'MANTENIMIENTO PREVENTIVO', 'MTTO CORRECTIVOS')
);

-- @@

UPDATE "PdxMTTOCategoriasParo"
   SET "STATUS" = 0
 WHERE "NOMBRE" IN ('CORRECTIVO', 'MANTENIMIENTO PREVENTIVO', 'MTTO CORRECTIVOS')
   AND "STATUS" <> 0;

-- @@

SELECT "ID_CATEGORIA_PARO", "NOMBRE", "PLANTA", "STATUS"
  FROM "PdxMTTOCategoriasParo"
 WHERE "NOMBRE" IN ('CORRECTIVO', 'MANTENIMIENTO PREVENTIVO', 'MTTO CORRECTIVOS')
 ORDER BY "ID_CATEGORIA_PARO";
