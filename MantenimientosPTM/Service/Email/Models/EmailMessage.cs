using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace MantenimientosPTM.Service.Email.Models
{
    public class EmailMessage
    {
        public List<string> To { get; set; }
        public string Subject { get; set; }
        public string Body { get; set; }
        public string Alias { get; set; }
        public string ImagePath { get; set; }
    }
}