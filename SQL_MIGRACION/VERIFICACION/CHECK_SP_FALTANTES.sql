-- ============================================================================
--  CHECK: SPs que la aplicacion referencia y NO existen en el schema
--  Generado el 2026-11-19 desde el codigo C# (112 SPs distintos)
--
--  COMO EJECUTARLO
--    Cada bloque es UNA SOLA sentencia (SELECT ... UNION ALL), asi que el
--    cliente JDBC no lo parte y no depende de tablas temporales ni de sesion.
--    Ejecutar bloque por bloque. Solo lectura: no modifica nada.
--
--  RESULTADO ESPERADO
--    Vacio = no falta nada. Si aparece SpPdxMTTOAceptarReprogramacion es
--    normal: es codigo muerto (el flujo de aceptar reprogramacion se retiro
--    de la UI y el flujo vivo usa SpPdxMTTOSolicitarReprogramacion).
-- ============================================================================

-- ============================ TEST_JUNIO_2026 ============================
SELECT R."SP_NAME" AS FALTA
FROM (
      SELECT 'SpPdxMTTOAceptarReprogramacion' AS "SP_NAME" FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOActualizaEquipo' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOActualizaEstatusEquipo' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOActualizaMC' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOActualizaMP' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOActualizarCabeceraSolicitudCompraMP' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOActualizarPlanProduccion' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOActualizarSolicitudCompraDetalleMP' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOActualizarSolicitudRefaccion' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOBuscarArticulos' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOBuscarArticulosBatch' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOBuscarEmpleados' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOBuscarProveedores' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOCalcularMantenimientoAnual' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOCantidadesRequisicionXAlmacen' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOConsultaArticulosPorOT' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOConsultaBajaEquipos' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOConsultaDatosSolicitante' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOConsultaEquipos' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOConsultaOrdenesFabricacion' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOConsultarLineasPorPlanta' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOConsultarPeriodicidadesXEquipo' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOConsultarPeriodicidadMP' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOConsultarProcesosPorPlanta' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOConsultarTiemposMuertosCorrugado' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOConsultarTiemposMuertosINY' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOConsultarTiemposMuertosPeadLiso' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOConsultarTiemposMuertosPVC' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOConsultarTiposEquipo' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOConsultaSolicitudesRefaccionesMP' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTODesactivarPeriodicidadEquipo' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOEliminaParoProduccion' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOEliminarArea' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOEliminarBitacoraPlanProduccion' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOEliminarLinea' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOEliminarPeriodicidadesEquipo' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOEliminarPlanProduccion' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOEliminarTiemposMuertosCorrugado' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOEliminarTiemposMuertosINY' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOEliminarTiemposMuertosPeadLiso' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOEliminarTiemposMuertosPVC' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOEliminarTipoEquipo' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetArticuloSalidaM' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetBalanceOT' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetCategoriasParo' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetCostCenters' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetDepSucursal' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetDetallesSolicitudCompraMP' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetDevolucionesPorOT' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetDevoPorOT' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetEmpleadosAlmacenPorRol' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetEstautsAuthSC' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetLastSalidaInventario' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetLineasOC' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetMovimientoSalidaPorSolicitud' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetOrdenesCompraAbiertas' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetOrdenesCompraByDocNum' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetProveedorArticulo' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetSalidasPorOT' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetSeriesByName' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetSolicitudesCompraMP' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetUsuariosCompras' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetUsuariosXPlanta' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGuardarRutinaMP' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGuardarTiemposMuertosCorrugado' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGuardarTiemposMuertosINY' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGuardarTiemposMuertosPeadLiso' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGuardarTiemposMuertosPVC' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOInsertaEquipo' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOInsertaOrdenTrabajoMC' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOInsertaOrdenTrabajoMP' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOInsertarArea' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOInsertarLinea' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOInsertarMC' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOInsertarMP' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOInsertarParoProduccion' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOInsertarPeriodicidadEquipo' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOInsertarPlanProduccion' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOInsertarSolicitudCompraDetalleMP' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOInsertarSolicitudCompraMP' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOInsertarSolicitudMC' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOInsertarSolicitudRefaccion' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOInsertarTipoEquipo' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOInsertaSolicitudBaja' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOInsertCategoriaParo' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOInsertMovimientoAlmacen' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOInsertRechazoDevolucion' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOMetricasOEE_Corrugado' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOMetricasOEE_INY' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOMetricasOEE_PeadLiso' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOMetricasOEE_PVC' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOObtenerActividadesPorOTMP' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOObtenerMantenimientosCompletados' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOObtenerMantenimientosCorrectivos' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOObtenerMantenimientosPorRango' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOObtenerParosProduccion' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOObtenerPlanesProduccion' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOObtenerTecnicosOT' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOObtenerTokensOT' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOReanudarParoProduccion' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOSolicitarReprogramacion' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOUpdateEstatusAuthSC' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOUpdateEstatusComAuthSC' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOUpdateEstatusSolicitud' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOUpdateStatusOT' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOUpdateUDFEntrada' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOUpdateUDFSalida' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOValidarOTCorrectivoFinalizada' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOValidarOTFinalizada' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOValidarProductosTerminadosExistentes' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOValidarTokenGuardado' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOValidarTokenOTCorrectivo' FROM DUMMY
     ) R
LEFT JOIN SYS.PROCEDURES P
       ON P."SCHEMA_NAME" = 'TEST_JUNIO_2026'
      AND P."PROCEDURE_NAME" = R."SP_NAME"
WHERE P."PROCEDURE_NAME" IS NULL
ORDER BY 1;

-- ============================ PTM_2022_FINAL ============================
SELECT R."SP_NAME" AS FALTA
FROM (
      SELECT 'SpPdxMTTOAceptarReprogramacion' AS "SP_NAME" FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOActualizaEquipo' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOActualizaEstatusEquipo' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOActualizaMC' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOActualizaMP' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOActualizarCabeceraSolicitudCompraMP' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOActualizarPlanProduccion' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOActualizarSolicitudCompraDetalleMP' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOActualizarSolicitudRefaccion' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOBuscarArticulos' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOBuscarArticulosBatch' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOBuscarEmpleados' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOBuscarProveedores' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOCalcularMantenimientoAnual' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOCantidadesRequisicionXAlmacen' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOConsultaArticulosPorOT' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOConsultaBajaEquipos' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOConsultaDatosSolicitante' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOConsultaEquipos' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOConsultaOrdenesFabricacion' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOConsultarLineasPorPlanta' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOConsultarPeriodicidadesXEquipo' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOConsultarPeriodicidadMP' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOConsultarProcesosPorPlanta' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOConsultarTiemposMuertosCorrugado' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOConsultarTiemposMuertosINY' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOConsultarTiemposMuertosPeadLiso' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOConsultarTiemposMuertosPVC' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOConsultarTiposEquipo' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOConsultaSolicitudesRefaccionesMP' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTODesactivarPeriodicidadEquipo' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOEliminaParoProduccion' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOEliminarArea' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOEliminarBitacoraPlanProduccion' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOEliminarLinea' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOEliminarPeriodicidadesEquipo' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOEliminarPlanProduccion' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOEliminarTiemposMuertosCorrugado' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOEliminarTiemposMuertosINY' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOEliminarTiemposMuertosPeadLiso' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOEliminarTiemposMuertosPVC' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOEliminarTipoEquipo' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetArticuloSalidaM' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetBalanceOT' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetCategoriasParo' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetCostCenters' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetDepSucursal' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetDetallesSolicitudCompraMP' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetDevolucionesPorOT' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetDevoPorOT' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetEmpleadosAlmacenPorRol' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetEstautsAuthSC' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetLastSalidaInventario' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetLineasOC' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetMovimientoSalidaPorSolicitud' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetOrdenesCompraAbiertas' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetOrdenesCompraByDocNum' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetProveedorArticulo' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetSalidasPorOT' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetSeriesByName' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetSolicitudesCompraMP' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetUsuariosCompras' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGetUsuariosXPlanta' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGuardarRutinaMP' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGuardarTiemposMuertosCorrugado' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGuardarTiemposMuertosINY' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGuardarTiemposMuertosPeadLiso' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOGuardarTiemposMuertosPVC' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOInsertaEquipo' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOInsertaOrdenTrabajoMC' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOInsertaOrdenTrabajoMP' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOInsertarArea' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOInsertarLinea' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOInsertarMC' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOInsertarMP' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOInsertarParoProduccion' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOInsertarPeriodicidadEquipo' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOInsertarPlanProduccion' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOInsertarSolicitudCompraDetalleMP' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOInsertarSolicitudCompraMP' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOInsertarSolicitudMC' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOInsertarSolicitudRefaccion' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOInsertarTipoEquipo' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOInsertaSolicitudBaja' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOInsertCategoriaParo' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOInsertMovimientoAlmacen' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOInsertRechazoDevolucion' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOMetricasOEE_Corrugado' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOMetricasOEE_INY' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOMetricasOEE_PeadLiso' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOMetricasOEE_PVC' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOObtenerActividadesPorOTMP' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOObtenerMantenimientosCompletados' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOObtenerMantenimientosCorrectivos' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOObtenerMantenimientosPorRango' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOObtenerParosProduccion' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOObtenerPlanesProduccion' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOObtenerTecnicosOT' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOObtenerTokensOT' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOReanudarParoProduccion' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOSolicitarReprogramacion' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOUpdateEstatusAuthSC' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOUpdateEstatusComAuthSC' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOUpdateEstatusSolicitud' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOUpdateStatusOT' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOUpdateUDFEntrada' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOUpdateUDFSalida' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOValidarOTCorrectivoFinalizada' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOValidarOTFinalizada' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOValidarProductosTerminadosExistentes' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOValidarTokenGuardado' FROM DUMMY
      UNION ALL SELECT 'SpPdxMTTOValidarTokenOTCorrectivo' FROM DUMMY
     ) R
LEFT JOIN SYS.PROCEDURES P
       ON P."SCHEMA_NAME" = 'PTM_2022_FINAL'
      AND P."PROCEDURE_NAME" = R."SP_NAME"
WHERE P."PROCEDURE_NAME" IS NULL
ORDER BY 1;

