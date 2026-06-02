using Newtonsoft.Json;
using System;
using System.ComponentModel;
using System.Configuration;

namespace MantenimientosPTM
{
    public class AccesoDatosProduccion
    {
        #region GeneralCommands(Procedure declaration)
        public string GCInsertarParoProduccion
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOInsertarParoProduccion\"";
            }
        }
        public string GCObtenerParosProduccion
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOObtenerParosProduccion\"";
            }
        }
        public string GCGetCategoriasParo
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOGetCategoriasParo\"";
            }
        }

        public string GCIntertarCategoriaParo
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOInsertCategoriaParo\"";
            }
        }

        public string GCReanudarParoProduccion
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOReanudarParoProduccion\"";
            }
        }
        public string GCGuardarTiemposMuertosPVC
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOGuardarTiemposMuertosPVC\"";
            }
        }
        public string GCConsultarTiemposMuertosPVC
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOConsultarTiemposMuertosPVC\"";
            }
        }
        public string GCGuardarTiemposMuertosCorrugado
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOGuardarTiemposMuertosCorrugado\"";
            }
        }
        public string GCConsultarTiemposMuertosCorrugado
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOConsultarTiemposMuertosCorrugado\"";
            }
        }
        public string GCConsultarTiemposMuertosPeadLiso
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOConsultarTiemposMuertosPeadLiso\"";
            }
        }
        public string GCGuardarTiemposMuertosPeadLiso
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOGuardarTiemposMuertosPeadLiso\"";
            }
        }
        #endregion

        #region AditionalClassModel
        public class ParoProduccion
        {
            // ID_PARO (auto-generado, no se envía en el insert)
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public int ID_PARO { get; set; }

            // LINEA_PRODUCCION
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public int LINEA_PRODUCCION { get; set; }

            // ID_CATEGORIA_PARO
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public int ID_CATEGORIA_PARO { get; set; }

            // ARTICULO
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public string ARTICULO { get; set; }

            // DURACION_HRS
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal DURACION_HRS { get; set; }

            // COMENTARIOS
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string COMENTARIOS { get; set; }

            // FECHA_PARO
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            public DateTime? FECHA_PARO { get; set; }

            // FECHA_REANUDACION (se actualiza al cerrar el paro)
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            public DateTime? FECHA_REANUDACION { get; set; }

            // ESTATUS (O = Abierto, C = Cerrado)
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("O")]
            public string ESTATUS { get; set; }

            // USUARIO
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string USUARIO { get; set; }

            // PLANTA
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string PLANTA { get; set; }
        }

        public class ParoProduccionSS
        {
            public int ID_PARO { get; set; }
            public int LINEA_PRODUCCION { get; set; }
            public string LINEA_PRODUCCION_DESC { get; set; }
            public int PLANTA { get; set; }
            public string USUARIO { get; set; }
            public string COMENTARIOS { get; set; }
            public string ESTATUS { get; set; }
            public string FECHA_PARO_STRING { get; set; }
            public string FECHA_REANUDACION_STRING { get; set; }
            public decimal? DURACION_HRS { get; set; }
            public string COLOR_EVENTO { get; set; }

            // Nuevo: información de artículo
            public string ARTICULO { get; set; }
            public string ARTICULO_DESC { get; set; }

            // 🆕 Nuevos campos
            public string TIPO_PARO { get; set; }
            public string CATEGORIA { get; set; }

            // 🆕 Opcional (para ordenamiento interno)
            public DateTime? FECHA_ORDEN { get; set; }
        }

        public class ReanudarParo
        {
            public int ID_PARO { get; set; }
            public string COMENTARIOS { get; set; }
            public string USUARIO_ATIENDE { get; set; }
        }


        public class NuevaCategoriaParo
        {
            public int Planta { get; set; }

            public string Nombre { get; set; }
        }

        public class TiemposMuertosProduccionPVC
        {
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            public int? ID_REGISTRO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            public DateTime? FECHA { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string LINEA { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string PRODUCTO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string TURNO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string TRIP { get; set; }

            // Producción

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string MES { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal PESO_MINIMO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal TR_FABRICADOS { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal PRODUCCION_NETA_REAL { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal PESO_ESTANDAR { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal PORCENTAJE_SOBREPESO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal TOTAL_SCRAP_KG { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal PORCENTAJE_SCRAP { get; set; }
            // Disponibilidad

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal HORAS_PROGRAMADAS { get; set; }

            // Tiempo No Disponible

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal MANTENIMIENTO_PREVENTIVO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal CONTROL_INVENTARIOS { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal FALTA_MATERIA_INSUMOS { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal CAMBIO_MOLDE_HR { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal CALENTAMIENTO_HR { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal PARO_ARRANQUE_NO_PROGRAMADO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal ARRANQUE_ESTABILIZACION_HR { get; set; }

            // Tiempo No Productivo

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal MTTO_CORRECTIVOS { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal FALLA_ELECTRICA { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal SERVICIOS { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal CAMBIO_MOLDE_SETUP_EXCESOS { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal HERRAMENTAL { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal FALLA_OPERACION { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal LIMPIEZA_TANQUE { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal FALTA_MATERIAL { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal FALTA_PERSONAL { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal FALTA_REFACCIONES { get; set; }

            // Totales

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal TIEMPO_DISPONIBLE { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal TIEMPO_PRODUCTIVO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string USUARIO { get; set; }

            // PLANTA
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string PLANTA { get; set; }
        }

        public class TiemposMuertosProduccionCorrugado
        {
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            public int? ID_REGISTRO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string MES { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            public DateTime? FECHA { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string LINEA { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string CORRUGADOR { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string PRODUCTO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string TURNO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string GRUPO { get; set; }

            // ========================================
            // PRODUCCIÓN
            // ========================================

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal TRLIBERADOS { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal PRODUCCION_NETA { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal HORAS_PROGRAMADAS { get; set; }

            // ========================================
            // TIEMPO NO DISPONIBLE
            // ========================================

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal MANTENIMIENTO_PREVENTIVO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal CONTROL_INVENTARIOS { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal FALTA_ENERGIA { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal FALTA_MATERIA_PRIMA { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal PREPARACION_CAMBIO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal ARRANQUE_ESTABILIZACION { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal TIEMPO_MTTO_CORRECTIVOS_ARRANQUE { get; set; }

            // ========================================
            // TIEMPO NO PRODUCTIVO
            // ========================================

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal TIEMPO_MUERTO_CORRECTIVOS { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal CAMBIO_MOLDE_SETUP_EXCESOS { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal TIEMPO_MUERTO_ARRANCAR { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal TIEMPO_MUERTO_PROCESO { get; set; }

            // ========================================
            // KPIs
            // ========================================

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal TIEMPO_DISPONIBLE { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal TIEMPO_PRODUCTIVO { get; set; }

            // ========================================
            // AUDITORÍA
            // ========================================

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string USUARIO { get; set; }

            // PLANTA
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string PLANTA { get; set; }
        }

        public class TiemposMuertosProduccionPeadLiso
        {
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            public int? ID_REGISTRO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            public DateTime? FECHA { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string LINEA { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string PRODUCTO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string TURNO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string GRUPO { get; set; }

            // Producción

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? TRLIBERADOS { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? PRODUCCION_NETA { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? HORAS_PROGRAMADAS { get; set; }

            // Tiempo No Disponible

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? PREVENTIVO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? CONTROL_INVENTARIOS { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? FALTA_ENERGIA { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? FALTA_MATERIA_PRIMA { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? TIEMPO_CALENTAMIENTO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? PREPARACION_LINEA { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? TIEMPO_CALENTAMIENTO_HERRAMIENTA { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? ARRANQUE_ESTABILIZACION { get; set; }

            // Tiempo No Productivo

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? TIEMPO_MUERTO_LOGISTICA { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? TIEMPO_MUERTO_REPARACION { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? TIEMPO_MUERTO_CORRECTIVOS { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? CAMBIO_MOLDE { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? FALTA_PERSONAL { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? MUERTO_PROCESO { get; set; }

            // Totales

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? TIEMPO_NO_DISPONIBLE { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? TIEMPO_NO_PRODUCTIVO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? TIEMPO_PRODUCTIVO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string USUARIO { get; set; }
        }

        #endregion
    }
}