-- ============================================================================
-- Indices para acelerar Sppdx_FiltradoProductosTerminados
-- Base: PtmNwScale2 (SQL Server de NWSCALE)
--
-- Nota: Codigo, Proceso, ItemCode y CodigoItem son nvarchar(max): no pueden
-- ser llave de índice, por eso van como columnas INCLUDE.
--
-- Resultado medido (31 días, PPVC, Planta 1):
--   Turno 0: ~1.59s | Turno 1: ~0.97s | Turno 2: ~0.73s
--   Endpoint completo: ~1.0 a 1.5s
-- ============================================================================

USE [PtmNwScale2];
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PT_Fecha_Planta_Linea' AND object_id = OBJECT_ID('dbo.ProductoTerminados'))
CREATE NONCLUSTERED INDEX IX_PT_Fecha_Planta_Linea
ON dbo.ProductoTerminados (FechaPesaje, Planta, Id_Linea)
INCLUDE (Proceso, Codigo, TurnoPT, NumTubos, PesoTotal, Desactivado);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PT_Linea_Fecha' AND object_id = OBJECT_ID('dbo.ProductoTerminados'))
CREATE NONCLUSTERED INDEX IX_PT_Linea_Fecha
ON dbo.ProductoTerminados (Id_Linea, FechaPesaje)
INCLUDE (Proceso, Codigo, TurnoPT, NumTubos, PesoTotal, Desactivado, Planta);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PT_Turno_Fecha_Planta_Linea' AND object_id = OBJECT_ID('dbo.ProductoTerminados'))
CREATE NONCLUSTERED INDEX IX_PT_Turno_Fecha_Planta_Linea
ON dbo.ProductoTerminados (TurnoPT, FechaPesaje, Planta, Id_Linea)
INCLUDE (Proceso, Codigo, NumTubos, PesoTotal, Desactivado);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_EnvioScraps_Fecha_Planta_Linea' AND object_id = OBJECT_ID('dbo.EnvioScraps'))
CREATE NONCLUSTERED INDEX IX_EnvioScraps_Fecha_Planta_Linea
ON dbo.EnvioScraps (FechaEnvio, ScrapPlanta, Linea)
INCLUDE (Proceso, CodigoLinea, Peso, CodigoItem);
GO

-- ============================================================================
-- ROLLBACK (si se requiere revertir):
-- DROP INDEX IX_PT_Fecha_Planta_Linea ON dbo.ProductoTerminados;
-- DROP INDEX IX_PT_Linea_Fecha ON dbo.ProductoTerminados;
-- DROP INDEX IX_PT_Turno_Fecha_Planta_Linea ON dbo.ProductoTerminados;
-- DROP INDEX IX_EnvioScraps_Fecha_Planta_Linea ON dbo.EnvioScraps;
-- ============================================================================
