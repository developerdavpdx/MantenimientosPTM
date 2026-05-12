using Newtonsoft.Json;
using System;
using System.ComponentModel;
using System.Configuration;

namespace MantenimientosPTM
{
    public class AccesoDatosEquipos
    {
        #region GeneralCommands(Procedure declaration)
        public string GCInsertaEquipo
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOInsertaEquipo\"";
            }
        }
        public string GCActualizaEquipo
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOActualizaEquipo\"";
            }
        }
        public string GCActualizaEstatusEquipo
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOActualizaEstatusEquipo\"";
            }
        }
        public string GCSolicitudBaja
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOInsertaSolicitudBaja\"";
            }
        }
        public string GCConsultaEquipos
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOConsultaEquipos\"";
            }
        }
        public string GCConsultaBajaEquipos
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOConsultaBajaEquipos\"";
            }
        }
        public string GCLogin
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SPPDX_LOGIN\"";
            }
        }
        public string GCTiposEquipo
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOConsultarTiposEquipo\"";
            }
        }

        public string GCConsultarPeriodicidadMP
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOConsultarPeriodicidadMP\"";
            }
        }
        public string GCMantenimientoAnual
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOCalcularMantenimientoAnual\"";
            }
        }

        public string GCObtenerMantenimientosCompletados
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOObtenerMantenimientosCompletados\"";
            }
        }
        public string GCConsultarLineasPorPlanta
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOConsultarLineasPorPlanta\"";
            }
        }
        public string GCConsultarProcesosPorPlanta
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOConsultarProcesosPorPlanta\"";
            }
        }
        public string GCInsertarLinea
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOInsertarLinea\"";
            }
        }

        public string GCInsertarTipoEquipo
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOInsertarTipoEquipo\"";
            }
        }
        #endregion

        #region AditionalClassModel
        public class LineaProduccion
        {
            public int Planta { get; set; }
            public string Linea { get; set; }
        }

        public class TipoEquipo
        {
            public int ID_TIPO_EQUIPO { get; set; }

            public string DESCRIPCION { get; set; }

            public string ESTATUS { get; set; }

            public DateTime? FECHA_CREACION { get; set; }
        }
        public class PlantaSeleccionada
        {
            // Planta
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public int? Planta { get; set; }

            // Area
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public int? Area { get; set; }

            // Produccion
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public int? Produccion { get; set; }
        }

        public class EquipoSeleccionado
        {
            // Planta
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string ID_EQUIPO { get; set; }
        }
        public class Credenciales
        {
            // Usuario
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string Email { get; set; }

            // Tipo de equipo
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string Pass { get; set; }
        }
        public class PausaEquipo
        {
            // ID_EQUIPO
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string ID_EQUIPO { get; set; }

            // COMENTARIOS
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string COMENTARIOS { get; set; }

            // ESTATUS
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string ESTATUS { get; set; }
        }
        public class EquipoMTTO
        {
            // IdEquipo
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string IdEquipo { get; set; }
            // Planta
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string Planta { get; set; }

            // Tipo de equipo
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string TipoEquipo { get; set; }

            // Nombre del equipo
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string NombreEquipo { get; set; }

            // Descripción del equipo
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string DescripcionEquipo { get; set; }

            // Área
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string Area { get; set; }

            // Línea de producción
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string LineaProduccion { get; set; }

            // Centro de costos
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string CentroCostos { get; set; }

            // Número de documento PM Calidad
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string NumeroDocPmCalidad { get; set; }

            // Periodicidad de mantenimiento
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string PeriodicidadMantenimiento { get; set; }

            // Día de inicio de mantenimiento
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public int DiaInicioMant { get; set; }

            // Día de fin de mantenimiento
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public int DiaFinMant { get; set; }

            // Fecha inicio de mantenimiento
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(null)]
            public DateTime? FechaInicioMant { get; set; }

            // Estatus
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string Estatus { get; set; }

            // Comentarios
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string Comentarios { get; set; }
            // Usuario
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string Usuario { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(null)]
            public DateTime? FechaPausa { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(null)]
            public DateTime? FechaBaja { get; set; }
        }
        public class EquipoMTTOLIST
        {
            // ID del equipo
            [JsonProperty("ID_EQUIPO", DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public int IdEquipo { get; set; }

            // Planta
            [JsonProperty("PLANTA", DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string Planta { get; set; }

            // Tipo de equipo
            [JsonProperty("TIPO_EQUIPO", DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string TipoEquipo { get; set; }

            // Descripción del tipo de equipo
            [JsonProperty("TIPO_EQUIPO_DESC", DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string TipoEquipoDesc { get; set; }

            // Nombre del equipo
            [JsonProperty("NOMBRE_EQUIPO", DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string NombreEquipo { get; set; }

            // Descripción del equipo
            [JsonProperty("DESCRIPCION_EQUIPO", DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string DescripcionEquipo { get; set; }

            // ID Área
            [JsonProperty("IDAREA", DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string IdArea { get; set; }

            // Área
            [JsonProperty("AREA", DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string Area { get; set; }

            // ID Línea de Producción
            [JsonProperty("ID_LINEA_PRODUCCION", DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string IdLineaProduccion { get; set; }

            // Línea de producción
            [JsonProperty("LINEA_PRODUCCION", DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string LineaProduccion { get; set; }

            // Centro de costos
            [JsonProperty("CENTRO_COSTOS", DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string CentroCostos { get; set; }

            // Número de documento PM Calidad
            [JsonProperty("NUMERO_DOC_PM_CALIDAD", DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string NumeroDocPmCalidad { get; set; }

            // Periodicidad de mantenimiento
            [JsonProperty("PERIODICIDAD_MANTENIMIENTO", DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string PeriodicidadMantenimiento { get; set; }

            // Día de inicio de mantenimiento
            [JsonProperty("DIA_INICIO_MANT", DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public int? DiaInicioMant { get; set; }

            // Día de fin de mantenimiento
            [JsonProperty("DIA_FIN_MANT", DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public int? DiaFinMant { get; set; }

            // Fecha inicio de mantenimiento
            [JsonProperty("FECHA_INICIO_MANT", DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string FechaInicioMant { get; set; }

            // Estatus
            [JsonProperty("ESTATUS", DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string Estatus { get; set; }

            // Comentarios
            [JsonProperty("COMENTARIOS", DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string Comentarios { get; set; }

            // Fecha de pausa
            [JsonProperty("FECHA_PAUSA", DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string FechaPausa { get; set; }

            // Fecha de creación
            [JsonProperty("FECHA_CREACION", DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string FechaCreacion { get; set; }

            // Fecha de baja
            [JsonProperty("FECHA_BAJA", DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string FechaBaja { get; set; }

            // Fecha de última modificación
            [JsonProperty("FECHA_ULT_MOD", DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string FechaUltMod { get; set; }
        }
        public class SolicitudBajaEquipo
        {
            // ID Solicitud
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string IdSolicitud { get; set; }

            // ID Equipo
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string IdEquipo { get; set; }

            // Fecha Solicitud
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(null)]
            public DateTime? FechaSolicitud { get; set; }

            // Motivo de Baja
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string MotivoBaja { get; set; }

            // Descripción del Activo
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string CodigoActivo { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string DescripcionActivo { get; set; }

            // Forma de Baja
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string Desecho { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string TipoActivoFijo { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string Venta { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public int? Piezas { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? Kilos { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public decimal? ValorIva { get; set; }

            // Contabilidad
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string Observacion { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string EncargadoActivos { get; set; }

            // Firmas
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string Solicita { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string Autoriza1 { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string Autoriza2 { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string DepositoFactura { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string Entrega { get; set; }

            // Control
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string Estatus { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(null)]
            public DateTime? FechaCreacion { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(null)]
            public DateTime? FechaUltMod { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string UsuarioCreacion { get; set; }

            // 🔥 NUEVO — correos separados por coma: "a@x.com,b@x.com"
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string CorreosNotificacion { get; set; }
        }
        #endregion
    }
}