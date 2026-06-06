using Newtonsoft.Json;
using System;
using System.ComponentModel;
using System.Configuration;
using System.Collections.Generic;
using System.Linq;

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
            [JsonProperty("CodigoArticulo")]
            public string CodigoArticulo { get; set; }

            [JsonProperty("DescripcionArticulo")]
            public string DescripcionArticulo { get; set; }

            [JsonProperty("Planta")]
            public string Planta { get; set; }

            [JsonProperty("Linea")]
            public string Linea { get; set; }

            [JsonProperty("PzsDia")]
            public decimal? PzsDia { get; set; }

            [JsonProperty("KgsDia")]
            public decimal? KgsDia { get; set; }

            [JsonProperty("GrupoArt")]
            public string GrupoArt { get; set; }

            [JsonProperty("PesoMinimo")]
            public decimal? PesoMinimo { get; set; }

            [JsonProperty("PesoMaximo")]
            public decimal? PesoMaximo { get; set; }

            [JsonProperty("StockTotal")]
            public decimal? StockTotal { get; set; }

            [JsonProperty("Comprometido")]
            public decimal? Comprometido { get; set; }

            [JsonProperty("StockDisponible")]
            public decimal? StockDisponible { get; set; }
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

            // ══════════════════════════════════════════
            // NUEVOS CAMPOS CAPACIDAD REAL
            // ══════════════════════════════════════════

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? PZSXDIA { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? KGSXDIA { get; set; }

            [JsonProperty(NullValueHandling = NullValueHandling.Ignore)]
            public DateTime? DIA_INICIO_MANT { get; set; }

            [JsonProperty(NullValueHandling = NullValueHandling.Ignore)]
            public DateTime? DIA_FIN_MANT { get; set; }

            public string DIA_INICIO_MANT_STR =>
                DIA_INICIO_MANT?.ToString("dd/MM/yyyy");

            public string DIA_FIN_MANT_STR =>
                DIA_FIN_MANT?.ToString("dd/MM/yyyy");

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? PRODUCCION_TEORICA_PZS { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? PRODUCCION_TEORICA_KGS { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? PRODUCCION_REAL { get; set; }

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
            [DefaultValue(0)]
            public int ANIO_PLAN { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public int MES_PLAN { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string USUARIO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public int DIAS_TOTALES { get; set; }

            // ══════════════════════════════════════════
            // COLOR EVENTO
            // ══════════════════════════════════════════

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
            [DefaultValue(0)]
            public decimal? NVO_PZSXDIA { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? NVO_KGSXDIA { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string NVO_PRODUCCION_TEORICA { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? NVO_PRODUCCION_TEORICA_PZS { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? NVO_PRODUCCION_TEORICA_KGS { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? NVO_PRODUCCION_REAL { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string NVO_COMENTARIOS { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string NVO_FECHA_PLAN { get; set; }
        }

        // Nuevo: representación de una entrada de bitácora
        public class BitacoraEntry
        {
            public int? ID_BITACORA { get; set; }
            public string BIT_ACCION { get; set; }
            public string BIT_FECHA_MOVIMIENTO { get; set; }
            public string BIT_USUARIO { get; set; }
            public int? NVO_LINEA_PRODUCCION { get; set; }
            public string NVO_PROCESO { get; set; }
            public string ID_NVO_PROCESO { get; set; }
            public string NVO_ARTICULO { get; set; }
            public string NVO_ARTICULO_DESC { get; set; }
            public decimal? NVO_KGSXDIA { get; set; }
            public decimal? NVO_PZSXDIA { get; set; }
            public string NVO_DIA_INICIO_MANT_STR { get; set; }
            public string NVO_DIA_FIN_MANT_STR { get; set; }
            public decimal? NVO_PRODUCCION_TEORICA_KGS { get; set; }
            public decimal? NVO_PRODUCCION_TEORICA_PZS { get; set; }
            public decimal? NVO_PRODUCCION_REAL { get; set; }
            public string NVO_COMENTARIOS { get; set; }
            public string NVO_FECHA_PLAN { get; set; }
        }

        // Nuevo: plan agrupado con bitácora
        public class GroupedPlanProduccion
        {
            public int ID_PLAN { get; set; }
            public int LINEA_PRODUCCION { get; set; }
            public string LINEA_PRODUCCION_DESC { get; set; }
            public string ID_PROCESO { get; set; }
            public string PROCESO { get; set; }
            public string ARTICULO { get; set; }
            public string ARTICULO_DESC { get; set; }
            public decimal? KGSXDIA { get; set; }
            public decimal? PZSXDIA { get; set; }
            public string CAPACIDAD { get; set; }
            public string DIA_INICIO_MANT_STR { get; set; }
            public string DIA_FIN_MANT_STR { get; set; }
            public decimal? PRODUCCION_TEORICA_KGS { get; set; }
            public decimal? PRODUCCION_TEORICA_PZS { get; set; }
            public decimal? PRODUCCION_REAL { get; set; }
            public string COMENTARIOS { get; set; }
            public string FECHA_PLAN_STRING { get; set; }
            public string FECHA_CREACION_STRING { get; set; }
            public int PLANTA { get; set; }
            public string ESTATUS { get; set; }
            public string ANIO_PLAN { get; set; }
            public string MES_PLAN { get; set; }
            public int DIAS_TOTALES { get; set; }
            public string COLOR_EVENTO { get; set; }
            public List<BitacoraEntry> BITACORA { get; set; } = new List<BitacoraEntry>();
        }

        // Helper para agrupar filas planas en objetos GroupedPlanProduccion
        public static List<GroupedPlanProduccion> GroupPlans(List<PlanProduccion> flatRows)
        {
            var map = new Dictionary<int, GroupedPlanProduccion>();

            foreach (var fila in flatRows ?? Enumerable.Empty<PlanProduccion>())
            {
                if (!map.ContainsKey(fila.ID_PLAN))
                {
                    map[fila.ID_PLAN] = new GroupedPlanProduccion
                    {
                        ID_PLAN = fila.ID_PLAN,
                        LINEA_PRODUCCION = fila.LINEA_PRODUCCION,
                        LINEA_PRODUCCION_DESC = fila.LINEA_PRODUCCION_DESC,
                        ID_PROCESO = fila.ID_PROCESO,
                        PROCESO = fila.PROCESO,
                        ARTICULO = fila.ARTICULO,
                        ARTICULO_DESC = fila.ARTICULO_DESC,
                        KGSXDIA = fila.KGSXDIA,
                        PZSXDIA = fila.PZSXDIA,
                        CAPACIDAD = fila.CAPACIDAD,
                        DIA_INICIO_MANT_STR = fila.DIA_INICIO_MANT_STR,
                        DIA_FIN_MANT_STR = fila.DIA_FIN_MANT_STR,
                        PRODUCCION_TEORICA_KGS = fila.PRODUCCION_TEORICA_KGS,
                        PRODUCCION_TEORICA_PZS = fila.PRODUCCION_TEORICA_PZS,
                        PRODUCCION_REAL = fila.PRODUCCION_REAL,
                        COMENTARIOS = fila.COMENTARIOS,
                        FECHA_PLAN_STRING = fila.FECHA_PLAN_STRING,
                        FECHA_CREACION_STRING = fila.FECHA_CREACION_STRING,
                        PLANTA = fila.PLANTA,
                        ESTATUS = fila.ESTATUS,
                        ANIO_PLAN = fila.ANIO_PLAN.ToString(),
                        MES_PLAN = fila.MES_PLAN.ToString(),
                        DIAS_TOTALES = fila.DIAS_TOTALES,
                        COLOR_EVENTO = fila.COLOR_EVENTO,
                        BITACORA = new List<BitacoraEntry>()
                    };
                }

                if (fila.ID_BITACORA.HasValue)
                {
                    map[fila.ID_PLAN].BITACORA.Add(new BitacoraEntry
                    {
                        ID_BITACORA = fila.ID_BITACORA,
                        BIT_ACCION = fila.BIT_ACCION,
                        BIT_FECHA_MOVIMIENTO = fila.BIT_FECHA_MOVIMIENTO,
                        BIT_USUARIO = fila.BIT_USUARIO,
                        NVO_LINEA_PRODUCCION = fila.NVO_LINEA_PRODUCCION,
                        NVO_PROCESO = fila.NVO_PROCESO,
                        ID_NVO_PROCESO = fila.ID_NVO_PROCESO,
                        NVO_ARTICULO = fila.NVO_ARTICULO,
                        NVO_ARTICULO_DESC = fila.NVO_ARTICULO_DESC,
                        NVO_KGSXDIA = fila.NVO_KGSXDIA,
                        NVO_PZSXDIA = fila.NVO_PZSXDIA,
                        NVO_DIA_INICIO_MANT_STR = fila.NVO_DIA_INICIO_MANT_STR,
                        NVO_DIA_FIN_MANT_STR = fila.NVO_DIA_FIN_MANT_STR,
                        NVO_PRODUCCION_TEORICA_KGS = fila.NVO_PRODUCCION_TEORICA_KGS,
                        NVO_PRODUCCION_TEORICA_PZS = fila.NVO_PRODUCCION_TEORICA_PZS,
                        NVO_PRODUCCION_REAL = fila.NVO_PRODUCCION_REAL,
                        NVO_COMENTARIOS = fila.NVO_COMENTARIOS,
                        NVO_FECHA_PLAN = fila.NVO_FECHA_PLAN
                    });
                }
            }

            return map.Values.ToList();
        }

        #endregion
    }
}