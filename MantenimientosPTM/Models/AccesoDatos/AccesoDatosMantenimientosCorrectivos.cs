using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Configuration;

namespace MantenimientosPTM
{
    public class AccesoDatosMantenimientosCorrectivos
    {
        #region GeneralCommands(Procedure declaration)
        public string GCObtenerMantenimientosCorrectivos
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOObtenerMantenimientosCorrectivos\"";
            }
        }
        public string GCInsertarMC
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOInsertarMC\"";
            }
        }
        public string GCInsertarSolicitudRefaccionCorrectivo
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOInsertarSolicitudRefaccion\"";
            }
        }
        public string GCActualizaMC
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOActualizaMC\"";
            }
        }
        public string GCBuscarEmpleados
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOBuscarEmpleados\"";
            }
        }
        public string GCConsultaEquipos
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOConsultaEquipos\"";
            }
        }
        public string GCInsertaOrdenTrabajoMC
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOInsertaOrdenTrabajoMC\"";
            }
        }
        public string GCValidarOTCorrectivoFinalizada
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOValidarOTCorrectivoFinalizada\"";
            }
        }
        public string GCGuardarRutinaMP
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOGuardarRutinaMP\"";
            }
        }
        public string GCInsertarSolicitudMC
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOInsertarSolicitudMC\"";
            }
        }
        public string GCObtenerTecnicosOT
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOObtenerTecnicosOT\"";
            }
        }
        #endregion

        #region AditionalClassModel
        public class SolicitudMantenimientoMC
        {
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public int IdSolicitud { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public int IdEquipo { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string Solicitante { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string NominaSolicitante { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("Z10")]
            public string ClaseMantenimiento { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string TextoCorto { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            public DateTime? FechaCreacion { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            public DateTime? FechaActualizacion { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string UsuarioCreacion { get; set; }
        }
        public class MantenimientoCorrectivoRangoLIST
        {
            [JsonProperty("ID_SOLICITUD")]
            public int IdSolicitud { get; set; }

            [JsonProperty("ID_EQUIPO")]
            public int IdEquipo { get; set; }

            [JsonProperty("PLANTA")]
            public string Planta { get; set; }

            [JsonProperty("NUMERO_DOC_PM_CALIDAD")]
            public string NumeroDocPmCalidad { get; set; }

            [JsonProperty("NOMBRE_EQUIPO")]
            public string NombreEquipo { get; set; }

            [JsonProperty("DESCRIPCION_EQUIPO")]
            public string DescripcionEquipo { get; set; }

            [JsonProperty("IDAREA")]
            public string IdArea { get; set; }

            [JsonProperty("AREA")]
            public string Area { get; set; }

            [JsonProperty("ID_LINEA_PRODUCCION")]
            public string IdLineaProduccion { get; set; }

            [JsonProperty("LINEA_PRODUCCION")]
            public string LineaProduccion { get; set; }

            [JsonProperty("CENTRO_COSTOS")]
            public string CentroCostos { get; set; }

            [JsonProperty("TIPO_MANTENIMIENTO")]
            public string TipoMantenimiento { get; set; }

            [JsonProperty("SOLICITANTE")]
            public string Solicitante { get; set; }

            [JsonProperty("NOMINA_SOLICITANTE")]
            public string NominaSolicitante { get; set; }

            [JsonProperty("CLASE_MANTENIMIENTO")]
            public string ClaseMantenimiento { get; set; }

            [JsonProperty("TEXTO_CORTO")]
            public string TextoCorto { get; set; }

            [JsonProperty("FECHA_CREACION")]
            public string FechaCreacion { get; set; }

            [JsonProperty("NUMERO_ORDEN")]
            public string NumeroOrden { get; set; }

            [JsonProperty("HORA_APERTURA")]
            public string HoraApertura { get; set; }

            [JsonProperty("HORA_CIERRE")]
            public string HoraCierre { get; set; }

            [JsonProperty("TIEMPO_INVERTIDO")]
            public string TiempoInvertido { get; set; }

            // 🔥 NUEVOS CAMPOS
            [JsonProperty("HORA_INICIO")]
            public string HoraInicio { get; set; }

            [JsonProperty("HORA_FIN")]
            public string HoraFin { get; set; }
            [JsonProperty("HORA_INICIO_TIME")]
            public string HoraInicioTime { get; set; }

            [JsonProperty("HORA_FIN_TIME")]
            public string HoraFinTime { get; set; }

            [JsonProperty("TEXTO_SECUENCIA")]
            public string TextoSecuencia { get; set; }

            [JsonProperty("DURACION_HRS")]
            public string DuracionHrs { get; set; }

            [JsonProperty("ESTATUS_ORDEN")]
            public int EstatusOrden { get; set; }

            [JsonProperty("DESC_ESTATUS_ORDEN")]
            public string DescEstatusOrden { get; set; }

            [JsonProperty("ID_MANTENIMIENTO")]
            public int IdMantenimiento { get; set; }

            [JsonProperty("ORDEN_TRABAJO_FINALIZADA")]
            public string OrdenTrabajoFinalizada { get; set; }

            [JsonProperty("SCRAP")]
            public string Scrap { get; set; }

            [JsonProperty("HORA_CIERRE_MAN")]
            public string HoraCierreMan { get; set; }

            // 🔥 FIRMAS
            [JsonProperty("FIRMA_REALIZO")]
            public string FirmaRealizo { get; set; }

            [JsonProperty("NOMBRE_REALIZO")]
            public string NombreRealizo { get; set; }

            [JsonProperty("FIRMA_SUPERVISO")]
            public string FirmaSuperviso { get; set; }

            [JsonProperty("NOMBRE_SUPERVISO")]
            public string NombreSuperviso { get; set; }

            [JsonProperty("FIRMA_MANTENIMIENTO")]
            public string FirmaMantenimiento { get; set; }

            [JsonProperty("NOMBRE_MANTENIMIENTO")]
            public string NombreMantenimiento { get; set; }
        }
        public class MantenimientoPreventivoGenerado
        {
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string IdEquipo { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string NombreEquipo { get; set; }

            // ✅ NUEVOS
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string FechaInicioMantenimiento { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string FechaFinMantenimiento { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string Usuario { get; set; }
        }
        public class SolicitudRefaccion
        {
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string OrdenTrabajo { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string IdEquipo { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string RefaccionSolicitada { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue(0)]
            public int Cantidad { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string NivelUrgencia { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string DescripcionNecesidad { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string UsuarioSolicita { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public int Estatus { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public int IdMantenimiento { get; set; }


        }

        // ✅ Modelo para múltiples artículos en solicitud de refacción
        public class SolicitudRefaccionMultiple
        {
            [JsonProperty("Articulos")]
            public List<SolicitudRefaccion> Articulos { get; set; }

            [JsonProperty("OrdenTrabajo")]
            public string OrdenTrabajo { get; set; }

            [JsonProperty("IdEquipo")]
            public string IdEquipo { get; set; }

            [JsonProperty("IdMantenimiento")]
            public int IdMantenimiento { get; set; }

            [JsonProperty("Estatus")]
            public int Estatus { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("Urgente")]
            public string NivelUrgencia { get; set; }

            [JsonProperty("DescripcionNecesidad")]
            public string DescripcionNecesidad { get; set; }

            [JsonProperty("UsuarioSolicita")]
            public string UsuarioSolicita { get; set; }

            [JsonProperty("Planta")]
            public string Planta { get; set; }
        }

        // ✅ Puedes ponerla en tu carpeta de Models o DTOs
        public class EmpleadoDTO
        {
            public string NOMINA { get; set; }  // ✅ String porque Code es NVARCHAR
            public string NOMBRE_COMPLETO { get; set; }
            public string NOMBRE { get; set; }
            public string SEGUNDO_NOMBRE { get; set; }
            public string APELLIDO { get; set; }
            public string PUESTO { get; set; }
            public string DEPARTAMENTO { get; set; }
        }
        public class EquipoDTO
        {
            public string ID_EQUIPO { get; set; }  // ✅ String porque Code es NVARCHAR
            public string NOMBRE_EQUIPO { get; set; }
            public string DESCRIPCION_EQUIPO { get; set; }
            public string CENTRO_COSTOS { get; set; }
            public string NUMERO_DOC_PM_CALIDAD { get; set; }

        }
        public class OrdenTrabajoMCDTO
        {
            public int IdMantenimiento { get; set; }
            public string NumeroOrden { get; set; }
            public string ClaseMantenimiento { get; set; }
            public string UbicacionTecnica { get; set; }
            public decimal Scrap { get; set; }
            public string CentroCostos { get; set; }
            // 🔥 Cambiar a tipo fuerte
            public DateTime HoraInicio { get; set; }
            public DateTime HoraFin { get; set; }
            public DateTime HoraCierreMan { get; set; }
            public string TextoSecuencia { get; set; }
            public string TecnicosAsignados { get; set; } // "328,325,317"
            public decimal DuracionHrs { get; set; }
            public string Solicitante { get; set; }
            public string Usuario { get; set; }
            // 🔥 NUEVOS CAMPOS PARA FIRMAS
            public string FirmaRealizo { get; set; }          // Base64 PNG
            public string NombreRealizo { get; set; }
            public string FirmaSuperviso { get; set; }        // Base64 PNG
            public string NombreSuperviso { get; set; }
            public string FirmaMantenimiento { get; set; }    // Base64 PNG
            public string NombreMantenimiento { get; set; }
            public string TipoOperacion { get; set; }
        }
        public class ActividadRutina
        {
            public int Numero { get; set; }
            public string Descripcion { get; set; }
            public string Estado { get; set; }
        }
        public class TecnicoDTO
        {
            [JsonProperty("NOMINA")]
            public string Nomina { get; set; }

            [JsonProperty("NOMBRE_TECNICO")]
            public string NombreTecnico { get; set; }
        }
        #endregion
    }
}