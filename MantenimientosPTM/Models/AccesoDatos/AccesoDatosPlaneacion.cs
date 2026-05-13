using Newtonsoft.Json;
using System;
using System.ComponentModel;
using System.Configuration;

namespace MantenimientosPTM
{
    public class AccesoDatosPlaneacion
    {
        #region GeneralCommands(Procedure declaration)
        public string SpPdxMTTOObtenerPlanesProduccion
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOObtenerPlanesProduccion\"";
            }
        }
        public string GCInsertarPlanProduccion
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOInsertarPlanProduccion\"";
            }
        }
        public string GCActualizarPlanProduccion
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOActualizarPlanProduccion\"";
            }
        }
        public string GCEliminarPlanProduccion
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOEliminarPlanProduccion\"";
            }
        }
        public string GCConsultaOrdenesFabricacion
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOConsultaOrdenesFabricacion\"";
            }
        }
        public string GCBuscarArticulos
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOBuscarArticulos\"";
            }
        }

        public string GCGetUsuariosXPlanta
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOGetUsuariosXPlanta\"";
            }
        }
        #endregion

        #region AditionalClassModel
        public class OrdenFabricacion
        {
            public int DOC_ENTRY { get; set; }
            public int DOC_NUM { get; set; }
            public string SERIE { get; set; }
            public string STATUS { get; set; }
            public string STATUS_DESC { get; set; }
            public string ITEM_CODE { get; set; }
            public string ITEM_NAME { get; set; }
            public string ITEM_DESCRIPCION { get; set; }
            public decimal CANTIDAD_PLANEADA { get; set; }
            public decimal CANTIDAD_COMPLETADA { get; set; }
            public decimal CANTIDAD_PENDIENTE { get; set; }
            public decimal CANTIDAD_RECHAZADA { get; set; }
            public string FECHA_CONTABILIZACION { get; set; }
            public string FECHA_VENCIMIENTO { get; set; }
            public string FECHA_INICIO { get; set; }
            public string FECHA_CIERRE { get; set; }
            public string FECHA_LIBERACION { get; set; }
            public string ALMACEN { get; set; }
            public string ALMACEN_NOMBRE { get; set; }
            public string UNIDAD_MEDIDA { get; set; }
            public int PRIORIDAD { get; set; }
            public string PRIORIDAD_DESC { get; set; }
            public int? ORIGEN_DOC_ENTRY { get; set; }
            public int? ORIGEN_DOC_NUM { get; set; }
            public string ORIGEN_TIPO { get; set; }
            public string TIPO_ORDEN { get; set; }
            public string TIPO_ORDEN_DESC { get; set; }
            public int USUARIO_ID { get; set; }
            public string USUARIO_CODIGO { get; set; }
            public string COMENTARIOS { get; set; }
            public string NOTA { get; set; }
            public string PROYECTO { get; set; }
            public string CENTRO_COSTOS { get; set; }
            public decimal PORCENTAJE_COMPLETADO { get; set; }
            public string FECHA_CREACION { get; set; }
            public string FECHA_ACTUALIZACION { get; set; }
        }

        public class Articulos
        {
            public string CodigoArticulo { get; set; }
            public string DescripcionArticulo { get; set; }
        }

        public class PlanProduccion
        {
            // ══════════════════════════════════════════
            // DATOS DEL PLAN
            // ══════════════════════════════════════════

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public int ID_PLAN { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public int LINEA_PRODUCCION { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string LINEA_PRODUCCION_DESC { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string ID_PROCESO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string PROCESO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string ARTICULO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string ARTICULO_DESC { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string CAPACIDAD { get; set; }

            [JsonProperty(NullValueHandling = NullValueHandling.Ignore)]
            public DateTime? DIA_INICIO_MANT { get; set; }

            [JsonProperty(NullValueHandling = NullValueHandling.Ignore)]
            public DateTime? DIA_FIN_MANT { get; set; }
            public string DIA_INICIO_MANT_STR =>
                DIA_INICIO_MANT?.ToString("dd/MM/yyyy");

            public string DIA_FIN_MANT_STR =>
                DIA_FIN_MANT?.ToString("dd/MM/yyyy");

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string PRODUCCION_TEORICA { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string PRODUCCION_REAL { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string COMENTARIOS { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            public DateTime? FECHA_PLAN { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string FECHA_PLAN_STRING { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string FECHA_CREACION_STRING { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            public DateTime? FECHA_CREACION { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public int PLANTA { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("O")]
            public string ESTATUS { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string ANIO_PLAN { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string MES_PLAN { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string USUARIO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public int DIAS_TOTALES { get; set; }

            // ══════════════════════════════════════════
            // DATOS DEL PARO
            // ══════════════════════════════════════════

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            public int? ID_PARO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string FECHA_PARO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string COMENTARIOS_PARO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public int TIENE_PARO_ACTIVO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string COLOR_EVENTO { get; set; }

            // ══════════════════════════════════════════
            // BITÁCORA — campos planos del SP
            // (se agrupan en BITACORA[] en el controller)
            // ══════════════════════════════════════════

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            public int? ID_BITACORA { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string BIT_ACCION { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string BIT_FECHA_MOVIMIENTO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string BIT_USUARIO { get; set; }

            // — Valores nuevos registrados en bitácora —

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            public int? NVO_LINEA_PRODUCCION { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            public string NVO_PROCESO { get; set; }
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            public string ID_NVO_PROCESO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string NVO_ARTICULO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string NVO_ARTICULO_DESC { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string NVO_CAPACIDAD { get; set; }

            [JsonProperty(NullValueHandling = NullValueHandling.Ignore)]
            public DateTime? NVO_DIA_INICIO_MANT { get; set; }

            [JsonProperty(NullValueHandling = NullValueHandling.Ignore)]
            public DateTime? NVO_DIA_FIN_MANT { get; set; }

            public string NVO_DIA_INICIO_MANT_STR =>
                NVO_DIA_INICIO_MANT?.ToString("dd/MM/yyyy");

            public string NVO_DIA_FIN_MANT_STR =>
                NVO_DIA_FIN_MANT?.ToString("dd/MM/yyyy");

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string NVO_PRODUCCION_TEORICA { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string NVO_PRODUCCION_REAL { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string NVO_COMENTARIOS { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string NVO_FECHA_PLAN { get; set; }
        }
        #endregion
    }
}