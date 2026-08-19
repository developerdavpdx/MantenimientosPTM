using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Web.Mvc;

namespace MantenimientosPTM
{
    public class AccesoDatosAlmacen
    {
        public readonly AccesoDatosMantenimientosCorrectivos _datosCorrectivos = new AccesoDatosMantenimientosCorrectivos();
        public readonly AccesoDatosMantenimientosPreventivos _datosPreventivos = new AccesoDatosMantenimientosPreventivos();

        #region GeneralCommands(Procedure declaration)

        public string GCGetEmpleadosAlmacenPorRol
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOGetEmpleadosAlmacenPorRol\"";
            }
        }

        public string GCConsultaSolicitudesRefaccionesMP
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOConsultaSolicitudesRefaccionesMP\"";
            }
        }

        public string GCGetArticulosPorOrdenTrabajo
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOConsultaArticulosPorOT\"";
            }
        }

        public string GCGetSalidasPorOrdenTrabajo
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOGetSalidasPorOT\"";
            }
        }

        public string GCGetDevoPorOrdenTrabajo
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOGetDevoPorOT\"";
            }
        }

        public string GCInsertarSolicitudCompraMP
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOInsertarSolicitudCompraMP\"";
            }
        }

        public string GCInsertarSolicitudCompraDetalleMP
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOInsertarSolicitudCompraDetalleMP\"";
            }
        }

        public string GCActualizarCabeceraSolicitudCompraMP
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOActualizarCabeceraSolicitudCompraMP\"";
            }
        }

        public string GCActualizarSolicitudCompraDetalleMP
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOActualizarSolicitudCompraDetalleMP\"";
            }
        }

        public string GCConsultaSolicitudesCompraMP
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOConsultaSolicitudesCompraMP\"";
            }
        }

        public string GCGetSolicitudesCompraAgrupadoMP
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOGetSolicitudesCompraMP\"";
            }
        }

        public string GCGetDetallesSolicitudCompraMP
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOGetDetallesSolicitudCompraMP\"";
            }
        }

        public string GCGetSolicitudesCompraFiltradoMP
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOGetSolicitudesCompra_filtradas\"";
            }
        }

        public string GCGetProveedorArticulo
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOGetProveedorArticulo\"";
            }
        }

        public string GCGetCentrosCosto
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOGetCostCenters\"";
            }
        }

        public string GCConsultaProveedores
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOBuscarProveedores\"";
            }
        }

        public string GCUpdateEstatusAuthSC
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOUpdateEstatusAuthSC\"";
            }
        }

        public string GCUpdateEstatusCommAuthSC
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOUpdateEstatusComAuthSC\"";
            }
        }

        public string GCSActualizarSolicitudCompraDetalleMP
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOActualizarSolicitudCompraDetalleMP\"";
            }
        }

        public string GCGetEstatusAuthSC
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOGetEstautsAuthSC\"";
            }
        }

        public string GCGetEmailsEmpleadosXModulo
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOGetEmailsEmpleadosXModulo\"";
            }
        }

        public string GCGetUsuariosXPlanta
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOGetUsuariosXPlanta\"";
            }
        }

        /// <summary>
        /// Filtras las ordenes de compra por DocNum, para autocomplete de OC. Parametro: P_DocNumFilter NVARCHAR(50)
        /// </summary>
        public string GCSGetOCByDocNum
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOGetOrdenesCompraByDocNum\"";
            }
        }

        /// <summary>
        /// Obtiene el detalle de las lineas de la oc con su DocEntry
        /// Nombre Parametro: P_DocEntry
        /// </summary>
        public string GCSGetDetalleOC
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOGetLineasOC\"";
            }
        }

        /// <summary>
        ///  Obtiene el  DocNum y DocEntry de la ultima salida de inventario
        /// </summary>
        public string GCSGetLastSalidaInventario
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOGetLastSalidaInventario\"";
            }
        }


        /// <summary>
        /// Obtiene la informacion de la refaccion solicitada para realisar 
        /// su salida, basado en el id de la solicitud de refaccion 
        /// Nombre Parametro: P_ID_SOLICITUD
        /// </summary>
        public string GCSGetDetalleArtSalida
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOGetArticuloSalidaM\"";
            }
        }

        /// <summary>
        /// Obtiene el reporte de stock, minimos, maximos y cantidad sugerida para pedidos
        /// Nombre Parametros: P_WHSCODE, P_ITEMCODE, P_ITEMNAME
        /// </summary>
        public string GCConsultaStockAlmacen
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOCantidadesRequisicionXAlmacen\"";
            }
        }

        /// <summary>
        /// Obtiene los centros de costo Departamento y Sucursal.
        /// De datos maestros del usuario basado en su email
        /// Nombre Parametro: P_EMAIL
        /// </summary>
        public string GCSGetDepartamentSucursalUser
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOGetDepSucursal\"";
            }
        }

        /// <summary>
        /// Obtiene la ultima salida de una solicitud de refaccion. Pensada para mostrar la info en el front
        /// Parametro: P_ID_SOLICITUD INT
        /// </summary>
        public string GCSGetLastMovimientoSalida
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOGetMovimientoSalidaPorSolicitud\"";
            }
        }

        /// <summary>
        /// Inserta los movimientos (Salidas,Devoluciones) de almacen
        /// Nombre Parametro: P_ID_SOLICITUD INT , P_TIPO NVARCHAR(10) , P_SOLICITANTE  NVARCHAR(80)
        /// P_NUM_EMPLEADO NVARCHAR(20) , P_AREA NVARCHAR(50) , P_DOCENTRY  INT
        /// P_ENTREGA NVARCHAR(30) , P_RECIBE NVARCHAR(30) 
        /// P_DEPT NVARCHAR(100) , P_PROCESO NVARCHAR(10) 
        /// P_GASTOS NVARCHAR(10) , P_CEDIS NVARCHAR(10) 
        /// </summary>
        public string GCInsertarMovimientoAlm
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOInsertMovimientoAlmacen\"";
            }
        }

        /// <summary>
        /// Actualiza el estatus de las solicitudes de refacciones. 
        /// Parametro: P_ID_SOLICITUD INT , P_ESTATUS valores validos (´Atentidad´, ´Pendiente´)
        /// </summary>
        public string GCUpdateEstatusSolicitud
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOUpdateEstatusSolicitud\"";
            }
        }

        public string GCUpdateStatusOT
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOUpdateStatusOT\"";
            }
        }

        /// <summary>
        /// Obtiene las ordenes de compra abiertas. Si proposito es mostrarlas en la vista de entradas mercancia. 
        /// Cuenta con filtros por rango de rechas y docnum. 
        /// Los filtros son opcionales, en caso de no requerirlos se debe de pasar NULL
        /// Parametros: P_FECHA_INI DATE, P_FECHA_FIN DATE, P_DOCNUM INT
        /// </summary>
        public string GCGetOrdenesCompraAbiertas
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOGetOrdenesCompraAbiertas\"";
            }
        }

        /// <summary>
        /// Inserta el rechazo de las devoluciones
        /// Parametros: P_ID_SALIDA INT, P_MOTIVO NVARCHAR(100) , P_COMENTARIOS NVARCHAR(150)
        /// </summary>
        public string GCInsertRechazoDev
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOInsertRechazoDevolucion\"";
            }
        }

        public string GCGetUsuariosAuthCompras
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOGetUsuariosCompras\"";
            }
        }

        /// <summary>
        /// Actualizar los campos definidos de la salida e mercanica. Para relacionar las solicitudes de refacciones 
        /// del portal, con SAP
        /// Parametros:
        /// IN P_DOCENTRY INT,
        /// IN P_FECHA_SOLICITUD TIMESTAMP,
        /// IN P_FOLIO NVARCHAR(20),
        /// IN P_ORDEN_TRABAJO NVARCHAR(30),
        /// IN P_REFACCION_SOLICITADA NVARCHAR(100),
        /// IN P_SOLICITANTE NVARCHAR(100),
        /// </summary>
        public string GCUpdateUDFSalida
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOUpdateUDFSalida\"";
            }
        }

        public string GCGetSerieByName
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOGetSeriesByName\"";
            }
        }

        /// <summary>
        /// Actualizar los campos definidos de la entrada de mercanica directa (devoluciones). Para relacionar las solicitudes de refacciones 
        /// del portal, con SAP
        /// Parametros:
        /// IN P_DOCENTRY INT,
        /// IN P_FECHA_SOLICITUD TIMESTAMP,
        /// IN P_FOLIO NVARCHAR(20),
        /// IN P_ORDEN_TRABAJO NVARCHAR(30),
        /// IN P_REFACCION_SOLICITADA NVARCHAR(100),
        /// IN P_SOLICITANTE NVARCHAR(100),
        /// </summary>
        public string GCUpdateUDFEntradaDirecta
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOUpdateUDFEntrada\"";
            }
        }

        public string GCGetBalanceOT
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOGetBalanceOT\"";
            }
        }

        public string GCInsertarSolicitudRefaccion
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOInsertarSolicitudRefaccion\"";
            }
        }

        public string GCActualizaSolicitudRefaccion
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOActualizarSolicitudRefaccion\"";
            }
        }



        #endregion

        #region AditionalClassModel

        public class Proveedores
        {
            public string CodigoProveedor { get; set; }
            public string NombreProveedor { get; set; }
        }
        public class SolicitudRefaccionLIST
        {
            [JsonProperty("ORDEN_TRABAJO")]
            public string OrdenTrabajo { get; set; }

            [JsonProperty("TOTAL_SOLICITUDES")]
            public int TotalSolicitudes { get; set; }

            [JsonProperty("TOTAL_CANTIDAD")]
            public int TotalCantidad { get; set; }

            [JsonProperty("TOTAL_ATENDIDAS")]
            public int TotalAtendidas { get; set; }

            [JsonProperty("TOTAL_PENDIENTE_DEVOLUCION")]
            public decimal totalPendienteDevolucion { get; set; }

            [JsonProperty("FECHA_PRIMERA")]
            public string FechaPrimera { get; set; }

            [JsonProperty("FECHA_ULTIMA")]
            public string FechaUltima { get; set; }

            [JsonProperty("NIVEL_URGENCIA")]
            public string NivelUrgencia { get; set; }

            [JsonProperty("ESTATUS")]
            public string Estatus { get; set; }

            [JsonProperty("USUARIO_SOLICITA")]
            public string UsuarioSolicita { get; set; }

            [JsonProperty("NOMBRE_EMPLEADO")]
            public string NombreEmpleado { get; set; }

            [JsonProperty("USUARIO_ATIENDE")]
            public string UsuarioAtiende { get; set; }

            [JsonProperty("NUMERO_EMPLEADO")]
            public string NumeroEmpleado { get; set; }

            [JsonProperty("DEPARTAMENTO")]
            public string Departamento { get; set; }

            [JsonProperty("FOLIO_COMPRA")]
            public string FolioCompra { get; set; }
        }

        public class ArticuloSolicitudRefaccion
        {
            [JsonProperty("ID_SOLICITUD")]
            public int IdSolicitud { get; set; }

            [JsonProperty("ORDEN_TRABAJO")]
            public string OrdenTrabajo { get; set; }

            [JsonProperty("ID_ORDENTRABAJO")]
            public int? IdOrdenTrabajo { get; set; }

            [JsonProperty("ESTATUSOT")]
            public string EstatusOT { get; set; }

            [JsonProperty("ID_ORDENTRABAJOMC")]
            public int? IdOrdenTrabajoMC { get; set; }

            [JsonProperty("ESTATUSOTMC")]
            public string EstatusOTMC { get; set; }

            [JsonProperty("ID_EQUIPO")]
            public int IdEquipo { get; set; }

            [JsonProperty("REFACCION_SOLICITADA")]
            public string RefaccionSolicitada { get; set; }

            [JsonProperty("NOMBRE_ARTICULO")]
            public string NombreArticulo { get; set; }

            [JsonProperty("STOCK")]
            public decimal Stock { get; set; }

            [JsonProperty("MIN_STOCK")]
            public decimal MinStock { get; set; }

            [JsonProperty("MAX_STOCK")]
            public decimal MaxStock { get; set; }

            [JsonProperty("CANTIDAD")]
            public int Cantidad { get; set; }

            [JsonProperty("NIVEL_URGENCIA")]
            public string NivelUrgencia { get; set; }

            [JsonProperty("DESCRIPCION_NECESIDAD")]
            public string DescripcionNecesidad { get; set; }

            [JsonProperty("FECHA_SOLICITUD")]
            public string FechaSolicitud { get; set; }

            [JsonProperty("ESTATUS")]
            public string Estatus { get; set; }

            [JsonProperty("USUARIO_SOLICITA")]
            public string UsuarioSolicita { get; set; }

            [JsonProperty("USUARIO_ATIENDE")]
            public string UsuarioAtiende { get; set; }

            [JsonProperty("FECHA_ATENCION")]
            public string FechaAtencion { get; set; }

            [JsonProperty("FOLIO_COMPRA")]
            public string FolioCompra { get; set; }
            [JsonProperty("FOLIO_SALIDA")]
            public string FolioSalida { get; set; }

            [JsonProperty("ACEPTADA_MANTENIMIENTO")]
            public string AceptadaMantenimiento { get; set; }

            [JsonProperty("CANTIDAD_SURTIDA")]
            public decimal CantidadSurtida { get; set; }

            [JsonProperty("CANTIDAD_DEVUELTA")]
            public decimal CantidadDevuelta { get; set; }

            [JsonProperty("CANTIDAD_CONSUMIDA")]
            public decimal CantidadConsumida { get; set; }
        }

        // Modelo para cada línea de solicitud
        public class SolicitudCompraLinea
        {
            [JsonProperty("IdSolicitud")]
            public int IdSolicitud { get; set; }

            [JsonProperty("CantidadEncargar")]
            public int CantidadEncargar { get; set; }
        }

        // Modelo principal que recibe el JS
        public class PurchaseRequest
        {
            [JsonProperty("Solicitudes")]
            public List<SolicitudCompraLinea> Solicitudes { get; set; }

            [JsonProperty("Comentarios")]
            public string Comentarios { get; set; }

            [JsonProperty("UsuarioSolicita")]
            public string UsuarioSolicita { get; set; }
            [JsonProperty("Planta")]
            public int? Planta { get; set; }
        }

        // Modelo principal que recibe el JS
        public class UpdatePurchaseRequest
        {
            [JsonProperty("Requisicion")]
            public RequisicionModel Requisicion { get; set; }

            [JsonProperty("Comentarios")]
            public string Comentarios { get; set; }

            [JsonProperty("UsuarioSolicita")]
            public string UsuarioSolicita { get; set; }
            [JsonProperty("Planta")]
            public int? Planta { get; set; }
            [JsonProperty("CodigoEmpleado")]
            public int CodigoEmpleado { get; set; }
        }

        public class RequisicionModel
        {
            [JsonProperty("IdSolicitudCompra")]
            public int IdSolicitudCompra { get; set; }

            [JsonProperty("Articulos")]
            public List<ArticuloRequisicionModel> Articulos { get; set; }

            [JsonProperty("Contabilizacion")]
            public ContabilizacionModel Contabilizacion { get; set; }
        }

        public class ArticuloRequisicionModel
        {
            [JsonProperty("IdsDetalle")]
            public List<int> IdsDetalle { get; set; }

            [JsonProperty("CodigoArticulo")]
            public long CodigoArticulo { get; set; }

            [JsonProperty("NombreArticulo")]
            public string NombreArticulo { get; set; }

            [JsonProperty("CantidadTotal")]
            public int CantidadTotal { get; set; }

            [JsonProperty("codigoProveedor")]
            public string CodigoProveedor { get; set; }

            [JsonProperty("nombreProveedor")]
            public string NombreProveedor { get; set; }
        }

        public class ContabilizacionModel
        {
            [JsonProperty("Departamento")]
            public string Departamento { get; set; }

            [JsonProperty("Proceso")]
            public string Proceso { get; set; }

            [JsonProperty("Gastos")]
            public string Gastos { get; set; }

            [JsonProperty("Cedis")]
            public string Cedis { get; set; }
        }

        public class SolicitudCompraDetalle
        {
            [JsonProperty("ID_DETALLE")]
            public int? IdDetalle { get; set; }

            [JsonProperty("ID_SOLICITUD_COMPRA")]
            public int? IdSolicitudCompra { get; set; }

            [JsonProperty("ID_SOLICITUD_REFACCION")]
            public int? IdSolicitudRefaccion { get; set; }

            [JsonProperty("CANTIDAD_ENCARGAR")]
            public int? CantidadEncargar { get; set; }

            [JsonProperty("ORDEN_TRABAJO")]
            public string OrdenTrabajo { get; set; }

            [JsonProperty("PLANTA")]
            public string Planta { get; set; }

            [JsonProperty("CODIGO_ARTICULO")]
            public string CodigoArticulo { get; set; }

            [JsonProperty("NOMBRE_ARTICULO")]
            public string NombreArticulo { get; set; }

            [JsonProperty("CANTIDAD_REQUERIDA")]
            public int? CantidadRequerida { get; set; }

            [JsonProperty("STOCK_ACTUAL")]
            public decimal? StockActual { get; set; }

            [JsonProperty("MIN_STOCK")]
            public decimal? MinStock { get; set; }

            [JsonProperty("MAX_STOCK")]
            public decimal? MaxStock { get; set; }

            [JsonProperty("NIVEL_URGENCIA")]
            public string NivelUrgencia { get; set; }

            [JsonProperty("DESCRIPCION_NECESIDAD")]
            public string DescripcionNecesidad { get; set; }

            [JsonProperty("FECHA_SOLICITUD")]
            public string FechaSolicitud { get; set; }

            [JsonProperty("ESTATUS")]
            public string Estatus { get; set; }

            [JsonProperty("USUARIO_SOLICITA")]
            public string UsuarioSolicita { get; set; }
            [JsonProperty("CODIGO_PROVEEDOR")]
            public string CodigoProveedor { get; set; }
        }

        //Resumen de solicitudes de compra.
        public class SolicitudCompraResume
        {
            [JsonProperty("ID_SOLICITUD_COMPRA")]
            public int IdSolicitudCompra { get; set; }

            [JsonProperty("FOLIO_COMPRA")]
            public string FolioCompra { get; set; }

            [JsonProperty("COMENTARIOS")]
            public string Comentarios { get; set; }

            [JsonProperty("ORDEN_TRABAJO")]
            public string OrdenTrabajo { get; set; }

            [JsonProperty("TOTAL_OTS")]
            public int TotalOts { get; set; }

            [JsonProperty("FECHA_SOLICITUD")]
            public string FechaSolicitud { get; set; }

            [JsonProperty("ESTATUS")]
            public string Estatus { get; set; }

            [JsonProperty("USUARIO_SOLICITA")]
            public string UsuarioSolicita { get; set; }

            [JsonProperty("DEPARTAMENTO")]
            public string Departamento { get; set; }

            [JsonProperty("PROCESO")]
            public string Proceso { get; set; }

            [JsonProperty("GASTOS")]
            public string Gastos { get; set; }

            [JsonProperty("CEDIS")]
            public string Cedis { get; set; }

            [JsonProperty("DOC_NUM")]
            public string DocNum { get; set; }

            [JsonProperty("DOC_ENTRY")]
            public string DocEntry { get; set; }

            [JsonProperty("RESPONSE_SAP")]
            public string ResponseSap { get; set; }
            [JsonProperty("COMENTARIOS_RECHAZO")]
            public string ComentariosRechazo { get; set; }
        }

        public class OrdenCompraDTO
        {
            [JsonProperty("DocEntry")]
            public int DocEntry { get; set; }

            [JsonProperty("DocNum")]
            public int DocNum { get; set; }

            [JsonProperty("CardCode")]
            public string CardCode { get; set; }

            [JsonProperty("CardName")]
            public string CardName { get; set; }

            [JsonProperty("DocDate")]
            public string DocDate { get; set; }

            [JsonProperty("DocDueDate")]
            public string DocDueDate { get; set; }

            [JsonProperty("DocTotal")]
            public float DocTotal { get; set; }

            [JsonProperty("DocCur")]
            public string DocCur { get; set; }

            [JsonProperty("Comments")]
            public string Comments { get; set; }

            [JsonProperty("DocStatus")]
            public string DocStatus { get; set; }

        }

        public class EmailUser
        {
            [JsonProperty("Nombre")]
            public string Nombre { get; set; }

            [JsonProperty("Email")]
            public string Email { get; set; }
        }

        // Clase principal para la solicitud de compra
        public class SolicitudCompraRequest
        {
            public string CardCode { get; set; }  // Código del proveedor
            public DateTime DocDate { get; set; }  // Fecha de la solicitud
            public DateTime DocDueDate { get; set; }  // Fecha de vencimiento
            public string Comments { get; set; }  // Comentarios
            public List<DocumentLine> DocumentLines { get; set; }  // Lista de líneas del documento
        }
        // Clase para las líneas del documento (los artículos solicitados)
        public class DocumentLine
        {
            public string ItemCode { get; set; }  // Código del artículo
            public int Quantity { get; set; }  // Cantidad solicitada
            public decimal? Price { get; set; }  // Precio unitario (opcional)
            public string WarehouseCode { get; set; }  // Almacén
        }

        public class PurchaseRequestDto
        {
            public string CardCode { get; set; }// Proveedor
            public string DocDate { get; set; }  // Fecha de la solicitud
            public string DocDueDate { get; set; }  // Fecha de vencimiento
            public string Comments { get; set; }  // Comentarios
            public string ReqDate { get; set; }       // Fecha requerida (formato: "2024-12-31")
            public List<PurchaseRequestLine> Lines { get; set; }
        }

        public class PurchaseRequestLine
        {
            //public string ItemCode { get; set; }  // Código del artículo
            //public int Quantity { get; set; }  // Cantidad solicitada
            //public decimal? Price { get; set; }  // Precio unitario (opcional)
            //public string WarehouseCode { get; set; }  // Almacén
            public string ItemCode { get; set; }
            public double Quantity { get; set; }
            public double? Price { get; set; }
            public string WarehouseCode { get; set; }      // Almacén
        }

        public class SapErrorResponse
        {
            public SapError Error { get; set; }
        }

        public class SapError
        {
            public int Code { get; set; }
            public SapErrorMessage Message { get; set; }
        }

        public class SapErrorMessage
        {
            public string Lang { get; set; }
            public string Value { get; set; }
        }

        // Excepción personalizada para errores de SAP
        public class SapException : Exception
        {
            public SapException(string message) : base(message) { }
        }

        public class SapPurchaseRequestPayload
        {
            public SapPurchaseRequestDocument Document { get; set; }
        }

        public class SapPurchaseRequestDocument
        {
            //public string CardCode { get; set; }
            //public string DocDate { get; set; }
            public string RequriedDate { get; set; }   // 👈 Typo intencional de SAP
            public List<SapPurchaseRequestLine> DocumentLines { get; set; }
        }

        public class SapPurchaseRequestLine
        {
            public string ItemCode { get; set; }
            public double Quantity { get; set; }
            public string LineVendor { get; set; }     // 👈 Así llama SAP al proveedor por línea
        }

        //CLASES PARA DATOS DE SOLICITUD DE COMPRA
        public class RequisicionPayload
        {
            public int IdSolicitudCompra { get; set; }
            public List<DetalleRequisicion> Articulos { get; set; }
            public ContabilizacionRequisicion Contabilizacion { get; set; }
        }

        public class DetalleRequisicion
        {
            public List<int> IdsDetalle { get; set; }
            public string CodigoArticulo { get; set; }
            public string CodigoProveedor { get; set; }
            public string NombreProveedor { get; set; }
            public string CantidadTotal { get; set; }
        }

        public class ContabilizacionRequisicion
        {
            public string Departamento { get; set; }
            public string Proceso { get; set; }
            public string Gastos { get; set; }
            public string Cedis { get; set; }
        }

        //Clases para entrada de mercancía

        public class EntradasMercanciaRequest
        {
            public int DocEntryOrdenCompra { get; set; }
            public DateTime fechaDoc { get; set; }
            public List<LineaEntradaMercancia> Lineas { get; set; } = new List<LineaEntradaMercancia>();
        }

        public class LineaEntradaMercancia
        {
            public int NumeroLinea { get; set; }  // BaseLine (base 0)
            public double Cantidad { get; set; }
            public double PrecioUnitario { get; set; }
            public string ItemCode { get; set; }
            public string Lote { get; set; }
            public string Folio { get; set; }

        }

        //Salida de mercancia

        public class SalidasMercanciaRequest
        {
            public int Planta { get; set; }
            public string Referencia { get; set; }
            public string Usuario { get; set; }
            public string OrdenTrabajo { get; set; }
            public int IdEquipo { get; set; }
            public int IdMantenimiento { get; set; }
            public string NombreEmpleado { get; set; }
            public string AlmacenistaEntrega { get; set; }
            public List<Contabilizacion> Contabilizacion { get; set; } = new List<Contabilizacion>();
            public DataMovimiento DataMovimiento { get; set; } = new DataMovimiento();
        }

        // Modelo para devolución de mercancía (recibe artículos directamente del frontend)
        public class DevolucionMercanciaRequest
        {
            public List<ArticuloDevolucion> Articulos { get; set; } = new List<ArticuloDevolucion>();
            public DataMovimiento DataMovimiento { get; set; } = new DataMovimiento();
            public string Referencia { get; set; }
            public string OrdenTrabajo { get; set; }
        }

        public class ArticuloDevolucion
        {
            public int IdSolicitud { get; set; }
            public string OrdenTrabajo { get; set; }
            public string Codigo { get; set; }
            public string Articulo { get; set; }
            public int CantidadAtendida { get; set; }
            public int CantidadDevolver { get; set; }
            public string Departamento { get; set; }
            public string Proceso { get; set; }
            public string Gastos { get; set; }
            public string Cedis { get; set; }

        }

        // Reutiliza el mismo modelo de contabilización que ya tienes en RequisicionPayload
        public class Contabilizacion
        {
            public string ItemCode { get; set; }
            public string NombreArticulo { get; set; }
            public string Cantidad { get; set; }
            public string Departamento { get; set; }
            public string Proceso { get; set; }
            public string Gastos { get; set; }
            public string Cedis { get; set; }
            public int IdSolicitud { get; set; }
            public string AddAlm { get; set; }
        }

        public class DataMovimiento
        {
            public string Solicitante { get; set; }
            public string NumEmpleado { get; set; }
            public string Area { get; set; }
            public string Entrega { get; set; }
            public string Recibe { get; set; }
        }

        // Reporte de Stock Almacén
        public class ReporteStock
        {
            [JsonProperty("GrupoArticulo")]
            public string GrupoArticulo { get; set; }

            [JsonProperty("Activo")]
            public string Activo { get; set; }

            [JsonProperty("CodigoArticulo")]
            public string CodigoArticulo { get; set; }

            [JsonProperty("NombreArticulo")]
            public string NombreArticulo { get; set; }

            [JsonProperty("UMI")]
            public string UMI { get; set; }

            [JsonProperty("NivelesDeStock")]
            public string NivelesDeStock { get; set; }

            [JsonProperty("Stock")]
            public double Stock { get; set; }

            [JsonProperty("Min")]
            public double Min { get; set; }

            [JsonProperty("Max")]
            public double Max { get; set; }

            [JsonProperty("Requis")]
            public double Requis { get; set; }

            [JsonProperty("Pedidos")]
            public double Pedidos { get; set; }

            [JsonProperty("CantSalidaPromMensual")]
            public double CantSalidaPromMensual { get; set; }

            [JsonProperty("CantMaxSalidaMensual")]
            public double CantMaxSalidaMensual { get; set; }

            [JsonProperty("Solicitar")]
            public double Solicitar { get; set; }

            [JsonProperty("StatusValidacion")]
            public string StatusValidacion { get; set; }
        }

        // Reporte de Stock Almacén
        public class CambioRefaccion
        {
            [JsonProperty("ID_SOLICITUD")]
            public string IdSolicitud { get; set; }

            [JsonProperty("ORDENTRABAJO")]
            public string OrdenTrabajo { get; set; }

            [JsonProperty("REFACCIONSOLICITADA")]
            public string RefaccionSolicitada { get; set; }

            [JsonProperty("CANTIDAD")]
            public string Cantidad { get; set; }

            [JsonProperty("ESTATUS")]
            public string Estatus { get; set; }

            [JsonProperty("USUARIOATIENDE")]
            public string UsuarioAtiende { get; set; }
        }

        public class EmpleadoRol
        {
            [JsonProperty("IDENTIFICADOR")]
            public string Identificador { get; set; }

            [JsonProperty("CODIGO_EMPLEADO")]
            public string CodigoEmpleado { get; set; }

            [JsonProperty("EMP_ID")]
            public int EmpId { get; set; }

            [JsonProperty("NUM_NOMINA")]
            public string NumNomina { get; set; }

            [JsonProperty("EMAIL")]
            public string Email { get; set; }

            [JsonProperty("NOMBRE_COMPLETO")]
            public string NombreCompleto { get; set; }

            [JsonProperty("TITULO_PUESTO")]
            public string TituloPuesto { get; set; }

            [JsonProperty("PUESTO")]
            public string Puesto { get; set; }

            [JsonProperty("DEPARTAMENTO")]
            public string Departamento { get; set; }

            [JsonProperty("PLANTA")]
            public int Planta { get; set; }

            [JsonProperty("USUARIO_WEB")]
            public string UsuarioWeb { get; set; }

            [JsonProperty("TIPO_USUARIO")]
            public string TipoUsuario { get; set; }

            [JsonProperty("AUTORIZADOR_ID")]
            public int AutorizadorId { get; set; }

            [JsonProperty("AUTORIZADOR_CODIGO")]
            public string AutorizadorCodigo { get; set; }

            [JsonProperty("AUTORIZADOR_NOMBRE")]
            public string AutorizadorNombre { get; set; }

            [JsonProperty("AUTORIZADOR_EMAIL")]
            public string AutorizadorEmail { get; set; }
        }

        #endregion
    }
}