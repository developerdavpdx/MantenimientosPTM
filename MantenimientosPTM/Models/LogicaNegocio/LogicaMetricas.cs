using Newtonsoft.Json;
using Sap.Data.Hana;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using static MantenimientosPTM.AccesoDatosMetricas;

namespace MantenimientosPTM
{
    public class LogicaMetricas
    {
        #region variables
        public AccesoDatosMetricas AD = new AccesoDatosMetricas();
        public LoginServiceLayer LoginService = new LoginServiceLayer();
        public GlobalCommands GlobalCommands = new GlobalCommands();
        #endregion

        #region constructor
        public LogicaMetricas() //se ejecuta al instanciar la clase
        {
            try
            {
                Console.WriteLine("LogicaMetricas inicializado correctamente");
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.ToString());
            }
        }

        public MetricasOEEDto ConsolidarMetricas(IEnumerable<MetricasOEEDto> procesos)
        {
            var l = procesos.Where(x => x != null).ToList();

            var r = new MetricasOEEDto
            {
                TOTAL_HORAS = l.Sum(x => x.TOTAL_HORAS),
                TOTAL_DISPONIBLE = l.Sum(x => x.TOTAL_DISPONIBLE),
                TOTAL_PRODUCTIVO = l.Sum(x => x.TOTAL_PRODUCTIVO),
                TOTAL_FILAS = l.Sum(x => x.TOTAL_FILAS),
                CAP_DISPONIBLE = l.Sum(x => x.CAP_DISPONIBLE),
                CAP_PRODUCTIVA = l.Sum(x => x.CAP_PRODUCTIVA),
                KG_BRUTOS = l.Sum(x => x.KG_BRUTOS),
                KG_NETOS = l.Sum(x => x.KG_NETOS),
                TIEMPO_REPARACION_TOTAL_HRS = l.Sum(x => x.TIEMPO_REPARACION_TOTAL_HRS),
                TOTAL_OTMC = l.Sum(x => x.TOTAL_OTMC),
                TOTAL_PAROS_MANUALES = l.Sum(x => x.TOTAL_PAROS_MANUALES),
                TOTAL_PARADAS = l.Sum(x => x.TOTAL_PARADAS),
                TOTAL_PM_PROGRAMADOS = l.Sum(x => x.TOTAL_PM_PROGRAMADOS),
                TOTAL_PM_CERRADOS = l.Sum(x => x.TOTAL_PM_CERRADOS)
            };

            r.TIEMPO_MUERTO = r.TOTAL_HORAS - r.TOTAL_PRODUCTIVO;

            // OEE por capacidad (misma lógica que los SPs)
            r.DISPONIBILIDAD = r.CAP_DISPONIBLE > 0 ? r.CAP_PRODUCTIVA / r.CAP_DISPONIBLE * 100 : (double?)null;
            r.RENDIMIENTO = r.CAP_PRODUCTIVA > 0 ? r.KG_BRUTOS / r.CAP_PRODUCTIVA * 100 : (double?)null;
            r.CALIDAD = r.KG_BRUTOS > 0 ? r.KG_NETOS / r.KG_BRUTOS * 100 : (double?)null;
            r.OEE = r.CAP_DISPONIBLE > 0 ? r.KG_NETOS / r.CAP_DISPONIBLE * 100 : (double?)null;

            // MTTR / MTBF / DT
            if (r.TOTAL_PARADAS > 0)
            {
                double mttr = r.TIEMPO_REPARACION_TOTAL_HRS / r.TOTAL_PARADAS;
                double mtbf = (r.TOTAL_DISPONIBLE - r.TIEMPO_REPARACION_TOTAL_HRS) / r.TOTAL_PARADAS;
                r.MTTR_HRS = mttr;
                r.MTBF_HRS = mtbf;
                r.DT_PORCENTAJE = (mtbf + mttr) > 0 ? mtbf / (mtbf + mttr) * 100 : (double?)null;
            }
            else
            {
                r.MTTR_HRS = 0;
                r.MTBF_HRS = null;
                r.DT_PORCENTAJE = 100;
            }

            r.PORCENTAJE_CUMPLIMIENTO_PM = r.TOTAL_PM_PROGRAMADOS > 0
                ? (double)r.TOTAL_PM_CERRADOS / r.TOTAL_PM_PROGRAMADOS * 100
                : 0;

            return r;
        }

        public MetricasOEEDto EjecutarProceso(string sp,
        Dictionary<string, (object Value, ParameterDirection Direction, HanaDbType Type)> parameters)
        {
            var res = GlobalCommands.ExecuteProcedureHanaAuto(sp, parameters);
            var lista = JsonConvert.DeserializeObject<List<MetricasOEEDto>>(res.JsonResult);
            return lista?.FirstOrDefault();
        }
        #endregion
    }
}