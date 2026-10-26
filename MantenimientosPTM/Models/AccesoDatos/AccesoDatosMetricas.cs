using Newtonsoft.Json;
using Sap.Data.Hana;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Configuration;
using System.Data;
using System.Linq;
using System.Web.UI.WebControls;

namespace MantenimientosPTM
{
    public class AccesoDatosMetricas
    {
    
        #region GeneralCommands(Procedure declaration)
        public string GCGetMetricasOEE_PVC
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOMetricasOEE_PVC\"";
            }
        }
        public string GCGetMetricasOEE_PeadLiso
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOMetricasOEE_PeadLiso\"";
            }
        }
        public string GCGetMetricasOEE_Corrugado
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOMetricasOEE_Corrugado\"";
            }
        }
        public string GCGetMetricasOEE_INY
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOMetricasOEE_INY\"";
            }
        }
        #endregion

        #region AditionalClassModel
        public class MetricasOEEModel
        {
            public decimal TotalHoras { get; set; }
            public decimal TotalProductivo { get; set; }
            public decimal TiempoMuerto { get; set; }
            public decimal Disponibilidad { get; set; }
            public int TotalFallas { get; set; }
            public decimal MTTR { get; set; }
            public decimal MTBF { get; set; }
        }

        public class MetricasOEEDto
        {
            public double TOTAL_HORAS { get; set; }
            public double TOTAL_DISPONIBLE { get; set; }
            public double TOTAL_PRODUCTIVO { get; set; }
            public int TOTAL_FILAS { get; set; }
            public double TIEMPO_MUERTO { get; set; }

            // Bases del OEE
            public double CAP_DISPONIBLE { get; set; }
            public double CAP_PRODUCTIVA { get; set; }
            public double KG_BRUTOS { get; set; }
            public double KG_NETOS { get; set; }

            // Indicadores (nullable: el SP puede regresar NULL)
            public double? DISPONIBILIDAD { get; set; }
            public double? RENDIMIENTO { get; set; }
            public double? CALIDAD { get; set; }
            public double? OEE { get; set; }

            public double TIEMPO_REPARACION_TOTAL_HRS { get; set; }
            public int TOTAL_OTMC { get; set; }
            public int TOTAL_PAROS_MANUALES { get; set; }
            public int TOTAL_PARADAS { get; set; }
            public double? MTTR_HRS { get; set; }
            public double? MTBF_HRS { get; set; }
            public double? DT_PORCENTAJE { get; set; }

            public int TOTAL_PM_PROGRAMADOS { get; set; }
            public int TOTAL_PM_CERRADOS { get; set; }
            public double? PORCENTAJE_CUMPLIMIENTO_PM { get; set; }
        }
        #endregion
    }
}