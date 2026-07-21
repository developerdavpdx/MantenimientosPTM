using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Configuration;

namespace MantenimientosPTM
{
    public class AccesoDatosMantenimientosPreventivos
    {
        #region GeneralCommands(Procedure declaration)
        public string GCObtenerMantenimientosPorRango
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOObtenerMantenimientosPorRango\"";
            }
        }
        public string GCInsertarMP
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOInsertarMP\"";
            }
        }
        public string GCInsertarSolicitudRefaccion
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOInsertarSolicitudRefaccion\"";
            }
        }
        public string GCActualizaMP
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOActualizaMP\"";
            }
        }
        public string GCBuscarEmpleados
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOBuscarEmpleados\"";
            }
        }

        public string GCInsertaOrdenTrabajoMP
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOInsertaOrdenTrabajoMP\"";
            }
        }
        public string GCValidarOTFinalizada
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOValidarOTFinalizada\"";
            }
        }
        public string GCGuardarRutinaMP
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOGuardarRutinaMP\"";
            }
        }
        public string GCObtenerActividadesPorOTMP
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOObtenerActividadesPorOTMP\"";
            }
        }
        #endregion

        #region AditionalClassModel
        public class MantenimientoRangoLIST
        {
            // ID del equipo
            [JsonProperty("ID_EQUIPO")]
            public int IdEquipo { get; set; }

            // ID de la planta
            [JsonProperty("PLANTA")]
            public string Planta { get; set; }

            // Número de documento PM Calidad
            [JsonProperty("NUMERO_DOC_PM_CALIDAD")]
            public string NumeroDocPmCalidad { get; set; }

            // Nombre del equipo
            [JsonProperty("NOMBRE_EQUIPO")]
            public string NombreEquipo { get; set; }

            // Descripción del equipo
            [JsonProperty("DESCRIPCION_EQUIPO")]
            public string DescripcionEquipo { get; set; }

            // ID del área
            [JsonProperty("IDAREA")]
            public string IdArea { get; set; }

            // Descripción del área
            [JsonProperty("AREA")]
            public string Area { get; set; }

            // ID de la línea de producción
            [JsonProperty("ID_LINEA_PRODUCCION")]
            public string IdLineaProduccion { get; set; }

            // Descripción de la línea de producción
            [JsonProperty("LINEA_PRODUCCION")]
            public string LineaProduccion { get; set; }

            // Descripción de la línea de producción
            [JsonProperty("CENTRO_COSTOS")]
            public string CentroCostos { get; set; }

            // Periodicidad de mantenimiento
            [JsonProperty("PERIODICIDAD_MANTENIMIENTO")]
            public string PeriodicidadMantenimiento { get; set; }

            // Periodicidad de mantenimiento
            [JsonProperty("ID_PERIODICIDAD")]
            public string IdPeriodicidad { get; set; }

            // ID de la Periodicidad de mantenimiento
            [JsonProperty("ID_EQUIPO_PERIODICIDAD")]
            public string IdEquipoPeriodicidad { get; set; }

            // Día de inicio de mantenimiento (configurado)
            [JsonProperty("DIA_INICIO_MANT")]
            public int DiaInicioMant { get; set; }

            // Día de fin de mantenimiento (configurado)
            [JsonProperty("DIA_FIN_MANT")]
            public int DiaFinMant { get; set; }

            // Fecha de inicio de mantenimiento configurada del equipo
            [JsonProperty("FECHA_INICIO_MANT")]
            public string FechaInicioMant { get; set; }

            // Rango del mes de mantenimiento (ej: "Del 01/02/2026 Al 28/02/2026")
            [JsonProperty("MES_MANTENIMIENTO")]
            public string MesMantenimiento { get; set; }

            // Fecha de inicio del periodo de mantenimiento
            [JsonProperty("FECHA_INICIO_MANTENIMIENTO")]
            public string FechaInicioMantenimiento { get; set; }

            // Fecha de fin del periodo de mantenimiento
            [JsonProperty("FECHA_FIN_MANTENIMIENTO")]
            public string FechaFinMantenimiento { get; set; }

            // Fecha de referencia para ordenamiento
            [JsonProperty("FECHA_REFERENCIA")]
            public string FechaReferencia { get; set; }

            // Tipo de mantenimiento (Preventivo)
            [JsonProperty("TIPO_MANTENIMIENTO")]
            public string TipoMantenimiento { get; set; }

            // ✅ NUEVOS CAMPOS de PdxMTTOMPGenerados
            // Número de orden de trabajo generada
            [JsonProperty("NUMERO_ORDEN")]
            public string NumeroOrden { get; set; }

            // Hora de apertura de la orden
            [JsonProperty("HORA_APERTURA")]
            public string HoraApertura { get; set; }

            // Hora de apertura de la orden
            [JsonProperty("HORA_CIERRE")]
            public string HoraCierre { get; set; }


            // Hora de apertura de la orden
            [JsonProperty("TIEMPO_INVERTIDO")]
            public string TiempoInvertido { get; set; }

            // Estatus de la orden de trabajo
            [JsonProperty("ESTATUS_ORDEN")]
            public int EstatusOrden { get; set; }

            // Estatus de la orden de trabajo
            [JsonProperty("DESC_ESTATUS_ORDEN")]
            public string DescEstatusOrden { get; set; }

            // ID de la orden de trabajo
            [JsonProperty("ID_MANTENIMIENTO")]
            public int IdMantenimiento { get; set; }

            // Orden trabajo finalizada
            [JsonProperty("ORDEN_TRABAJO_FINALIZADA")]
            public string OrdenTrabajoFinalizada { get; set; }

            // Rutina Completada
            [JsonProperty("RUTINA_COMPLETADA")]
            public string RutinaCompletada { get; set; }
            // Rutina Completada
            [JsonProperty("COMENTARIOS_RUTINA")]
            public string ComentariosRutina { get; set; }
            // 🔥 NUEVOS CAMPOS OT (Preventivo)

            // Hora inicio
            [JsonProperty("HORA_INICIO")]
            public string HoraInicio { get; set; }

            // Hora fin
            [JsonProperty("HORA_FIN")]
            public string HoraFin { get; set; }

            // Texto de secuencia
            [JsonProperty("TEXTO_SECUENCIA")]
            public string TextoSecuencia { get; set; }

            // Duración en horas
            [JsonProperty("DURACION_HRS")]
            public string DuracionHrs { get; set; }

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
            [JsonProperty("TIENE_REFACCIONES")]
            public string TieneRefacciones { get; set; }
            // Usuario
            [JsonProperty("USUARIO")]
            public string UsuarioGenero { get; set; }
        }
        public class MantenimientoCorrectivoGenerado
        {
            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string IdSolicitud { get; set; }


            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string NombreEquipo { get; set; }


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
            [DefaultValue("Crítico")]
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

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string Planta { get; set; }

            [JsonProperty(DefaultValueHandling = DefaultValueHandling.Populate)]
            [DefaultValue("")]
            public string Tipo { get; set; }
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

        public class OrdenTrabajoMPDTO
        {
            public int IdMantenimiento { get; set; }
            public string NumeroOrden { get; set; }
            public string Solicitante { get; set; }
            public string ClaseMantenimiento { get; set; }
            public string CodigoMantenimiento { get; set; }
            public string UbicacionTecnica { get; set; }
            public string CentroCostos { get; set; }
            public string GrupoPlaneacion { get; set; }
            public string HoraInicio { get; set; }
            public string HoraFin { get; set; }
            public string TextoSecuencia { get; set; }
            public string TecnicosAsignados { get; set; }
            public decimal? DuracionHrs { get; set; }
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

        public class ActividadPorOTDTO
        {
            public string NUMERO_ORDEN { get; set; }
            public string TECNICOS_ASIGNADOS { get; set; }

            public int ID_RUTINA { get; set; }
            public DateTime? FECHA_REALIZACION { get; set; }
            public string COMENTARIOS { get; set; }
            public int ID_ACTIVIDAD { get; set; }
            public string NOMBRE_ACTIVIDAD { get; set; }
            public string DESCRIPCION { get; set; }
            public string COMPLETADA { get; set; }
            public string OBSERVACIONES { get; set; }
            public int? ORDEN { get; set; }
        }
        #endregion
    }
}