using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace MantenimientosPTM.Models.Dto
{
    public class PTMResponseDTO
    {
        
        public bool status { get; set; }
        public string mensaje { get; set; }
        public PTMDataDto data { get; set; }
       

    }

    public class PTMDataDto
    {
        public string oc { get; set; }
        public List<PTMFacturaDto> facturas { get; set; } = new List<PTMFacturaDto>();
    }

    public class PTMFacturaDto
    {
        public string id { get; set; }
        public string oc { get; set; }
        public string folio { get; set; }
        public string uuid { get; set; }
        public string rfcEmisor { get; set; }
        public string razon { get; set; }
        public string total { get; set; }
        public string moneda { get; set; }
        public string fechaFactura { get; set; }
        public string estado { get; set; }
    }
}