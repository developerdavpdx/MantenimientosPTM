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
        public string GCEliminarParoProduccion
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOEliminaParoProduccion\"";
            }
        }
                
        public string GCConsultarTiemposMuertosINY
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOConsultarTiemposMuertosINY\"";
            }
        }

        public string GCGuardarTiemposMuertosINY = "NOMBRE_DEL_SP_GUARDAR_INY";

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
            public int? ID_PARO { get; set; }
            public int? LINEA_PRODUCCION { get; set; }
            public string LINEA_PRODUCCION_DESC { get; set; }
            public int? PLANTA { get; set; }
            public string USUARIO { get; set; }
            public string COMENTARIOS { get; set; }
            public string ESTATUS { get; set; }
            public string ORDEN_TRABAJO_FINALIZADA { get; set; }
            public string DESC_ESTATUS_ORDEN { get; set; }
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

            // 🔥 NUEVO
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string OTMC { get; set; }

            // 🔥 NUEVO
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string OTMP { get; set; }

            // 🔥 NUEVO
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string ID_PRODUCTO_TERMINADO { get; set; }

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

            // 🔥 NUEVO - KPIs calculados
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal KG_HR_LINEA { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal KG_HR_PRODUCTO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal OBJETIVO_EFICIENCIA { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal DISPONIBILIDAD_PORCENTAJE { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal KG_POR_TIEMPO_DISPONIBLE { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal KG_NETOS_HR_REALES { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal PORCENTAJE_RENDIMIENTO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal PORCENTAJE_CALIDAD { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal PORCENTAJE_OEE { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal PORCENTAJE_EFICIENCIA_PRODUCTO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal EFICIENCIA_OPERATIVA { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string USUARIO { get; set; }

            // ⚠️ CORREGIDO: en el JSON viene como número entero (ej. 1), no como string
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public int PLANTA { get; set; }
        }


        public class TiemposMuertosProduccionCorrugado
        {
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            public int? ID_REGISTRO { get; set; }

            // 🔥 NUEVO
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string OTMC { get; set; }
            // 🔥 NUEVO
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string OTMP { get; set; }

            // 🔥 NUEVO
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string ID_PRODUCTO_TERMINADO { get; set; }

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
            public decimal PESO_MINIMO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal TRLIBERADOS { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal PRODUCCION_NETA { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal PESO_ESTANDAR { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal PORCENTAJE_SOBREPESO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal SCRAP_SIN_CORTE_SIERRA { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal SCRAP_CORTE_SIERRA { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal SCRAP_TOTAL { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal PORCENTAJE_SCRAP_SIN_CORTE { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal PORCENTAJE_SCRAP_CORTE { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal KG_REPROCESO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal CARBONATO { get; set; }

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

            // 🔥 NUEVO - KPIs calculados
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal KG_HR_LINEA { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal KG_HR_PRODUCTO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal OBJETIVO_EFICIENCIA { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal DISPONIBILIDAD_PORCENTAJE { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal KG_POR_TIEMPO_DISPONIBLE { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal KG_NETOS_HR_REALES { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal PORCENTAJE_RENDIMIENTO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal PORCENTAJE_CALIDAD { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal PORCENTAJE_OEE { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal PORCENTAJE_EFICIENCIA_PRODUCTO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal EFICIENCIA_OPERATIVA { get; set; }

            // ========================================
            // AUDITORÍA
            // ========================================

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string USUARIO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public int PLANTA { get; set; }  // ← cambio a int
        }

        public class TiemposMuertosProduccionPeadLiso
        {
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            public int? ID_REGISTRO { get; set; }

            // 🔥 NUEVO
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string OTMC { get; set; }
            // 🔥 NUEVO
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string OTMP { get; set; }

            // 🔥 NUEVO
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string ID_PRODUCTO_TERMINADO { get; set; }

            // ============================================
            // GENERALES
            // ============================================

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
            public string PRODUCTO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string TURNO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string GRUPO { get; set; }

            // ============================================
            // PRODUCCIÓN
            // ============================================

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? PESO_MINIMO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? TRLIBERADOS { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? PRODUCCION_NETA { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? PESO_ESTANDAR { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? PORCENTAJE_SOBREPESO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? TOTAL_SCRAP { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? PORCENTAJE_TOTAL_SCRAP { get; set; }

            // ============================================
            // DISPONIBILIDAD
            // ============================================

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? HORAS_PROGRAMADAS { get; set; }

            // ============================================
            // TIEMPO NO DISPONIBLE
            // ============================================

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? PREVENTIVO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? CONTROL_INVENTARIOS { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? FALTA_ENERGIA_ELECTRICA { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? FALTA_MATERIA_PRIMA_INSUMOS { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? TIEMPO_CALENTAMIENTO_CI { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? PREPARACION_LINEA_CAMBIO_HERRAMENTAL { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? TIEMPO_CALENTAMIENTO_HERRAMENTAL { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? ARRANQUE_ESTABILIZACION_LINEA { get; set; }

            // ============================================
            // TIEMPO NO PRODUCTIVO
            // ============================================

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? TIEMPO_MUERTO_CORRECTIVOS { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? TIEMPO_MUERTO_HERRAMENTALES { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? CAMBIO_MOLDE_SETUP_EXCESOS { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? FALTA_PERSONAL { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? TIEMPO_MUERTO_PROCESO { get; set; }

            // ============================================
            // KPI
            // ============================================

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? TIEMPO_DISPONIBLE { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? TIEMPO_PRODUCTIVO { get; set; }

            // 🔥 NUEVO - KPIs calculados
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? KG_HR_LINEA { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? KG_HR_PRODUCTO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? OBJETIVO_EFICIENCIA { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? DISPONIBILIDAD_PORCENTAJE { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? KG_POR_TIEMPO_DISPONIBLE { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? KG_NETOS_HR_REALES { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? PORCENTAJE_RENDIMIENTO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? PORCENTAJE_CALIDAD { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? PORCENTAJE_OEE { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? PORCENTAJE_EFICIENCIA_PRODUCTO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? EFICIENCIA_OPERATIVA { get; set; }

            // ============================================
            // AUDITORÍA
            // ============================================

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string USUARIO { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string PLANTA { get; set; }
        }

        public class ReportesProdTerm
        {
            public int Id_Linea { get; set; }
            public int Turno { get; set; }
            public string Codigo { get; set; }
            public int AtadosTarimas { get; set; }
            public int NumTubos { get; set; }
            public decimal PesoTotal { get; set; }
            public decimal PUnitEstandar { get; set; }
            public decimal PUnitReal { get; set; }
            public decimal SobrePeso { get; set; }
            public decimal Scrap { get; set; }
            public decimal Eficiencia { get; set; }
            public decimal ScrapPt { get; set; }
            public decimal ScrapTotal { get; set; }
            public decimal KgPproducto { get; set; }
            public string Item { get; set; }
            public string HorasTrabajo { get; set; } //
            public string Proceso { get; set; }
        }

        public class TiemposMuertosProduccionINY
        {
            public int? ID_REGISTRO { get; set; }
            public string OTMC { get; set; }
            public string OTMP { get; set; }
            public string ID_PRODUCTO_TERMINADO { get; set; }
            public DateTime? FECHA { get; set; }
            public string LINEA { get; set; }
            public string INYECTORA { get; set; }
            public string PRODUCTO { get; set; }
            public string DESCRIPCION { get; set; }
            public string OP { get; set; }
            public string TURNO { get; set; }
            public string GRUPO { get; set; }
            public decimal TR_LIBERADOS { get; set; }
            public decimal PRODUCCION_NETA { get; set; }
            public decimal SCRAP_SIN_COLADA { get; set; }
            public decimal SCRAP_COLADA { get; set; }
            public decimal TOTAL_SCRAP { get; set; }
            public decimal HORAS_PROGRAMADAS { get; set; }
            public decimal PREVENTIVO { get; set; }
            public decimal CONTROL_INVENTARIOS { get; set; }
            public decimal FALTA_MATERIA_PRIMA { get; set; }
            public decimal PREPARACION_LINEA { get; set; }
            public decimal TIEMPO_MUERTO_CORRECTIVOS { get; set; }
            public decimal TIEMPO_MUERTO_HERRAMENTALES { get; set; }
            public decimal TIEMPO_MUERTO_ARRANQUES { get; set; }
            public decimal FALLA_MATERIAL { get; set; }
            public decimal FALTA_PERSONAL { get; set; }
            public decimal FALLA_ELECTRICA { get; set; }
            public decimal TIEMPO_MUERTO_PROCESO { get; set; }
            public decimal TIEMPO_DISPONIBLE { get; set; }
            public decimal TIEMPO_PRODUCTIVO { get; set; }
            public decimal PORCENTAJE_DISPONIBILIDAD { get; set; }
            public string USUARIO { get; set; }
            public string PLANTA { get; set; }
        }

        #endregion
    }
}