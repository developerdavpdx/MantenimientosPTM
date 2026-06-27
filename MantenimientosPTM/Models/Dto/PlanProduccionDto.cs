using System;
using System.ComponentModel;
using Newtonsoft.Json;

namespace MantenimientosPTM.Models.Dto
{
    public class PlanProduccionCreateDto
    {
        // Campos requeridos por SpPdxMTTOInsertarPlanProduccion
        public int LINEA_PRODUCCION { get; set; }
        public string FECHA_PLAN_STRING { get; set; }
        public string PROCESO { get; set; }
        public string ARTICULO { get; set; }
        public string CAPACIDAD { get; set; }
        public DateTime? DIA_INICIO_MANT { get; set; }
        public DateTime? DIA_FIN_MANT { get; set; }
        public string COMENTARIOS { get; set; }
        public int PLANTA { get; set; }
        public string USUARIO { get; set; }
    }

    public class PlanProduccionUpdateDto : PlanProduccionCreateDto
    {
        public int ID_PLAN { get; set; }
    }

    public class PlanProduccionDeleteDto
    {
        public int ID_PLAN { get; set; }
        public int PLANTA { get; set; }
        public string USUARIO { get; set; }
    }
    public class BitacoralanProduccionDeleteDto
    {
        public int IDBITACORA { get; set; }
    }
}
