using MantenimientosPTM.Service.Email.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Web;

namespace MantenimientosPTM.Service.Email.Interfaces
{
    public interface IEmailService
    {
        Task<bool> SendAsync(EmailMessage message);
    }
}