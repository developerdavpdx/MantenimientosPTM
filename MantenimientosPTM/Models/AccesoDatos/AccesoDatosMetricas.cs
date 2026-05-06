using Newtonsoft.Json;
using System;
using System.ComponentModel;
using System.Configuration;

namespace MantenimientosPTM
{
    public class AccesoDatosMetricas
    {
        #region GeneralCommands(Procedure declaration)
        public string GCGetMetricasOEE
        {
            get
            {
                return $"{ConfigurationManager.AppSettings["Database"]}.\"SpPdxMTTOMetricasOEE\"";
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
        #endregion
    }
}