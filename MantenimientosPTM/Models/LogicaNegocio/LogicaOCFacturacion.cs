using MantenimientosPTM.Models.AccesoDatos;
using MantenimientosPTM.Models.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace MantenimientosPTM.Models.LogicaNegocio
{
    public class LogicaOCFacturacion
    {
        //Reglas de ngocio 

        public PTMResponseDTO ObtenerFacturasPorOC(string oc)
        {
            return AccesoDatosPTM.ObtenerFacturasPorOC(oc);
        }
    }
}