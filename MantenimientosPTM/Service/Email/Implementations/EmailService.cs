using MantenimientosPTM.Service.Email.Interfaces;
using MantenimientosPTM.Service.Email.Models;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Linq;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;
using System.Web;
using System.Web.Hosting;

namespace MantenimientosPTM.Service.Email.Implementations
{

    public class EmailService : IEmailService
    {
        private readonly SmtpClient _smtp;

        public EmailService()
        {
            _smtp = new SmtpClient
            {
                Host = ConfigurationManager.AppSettings["SMTP_HOST"],
                Port = int.Parse(ConfigurationManager.AppSettings["SMTP_PORT"] ?? "587"),
                EnableSsl = true,
                Credentials = new NetworkCredential(
                    ConfigurationManager.AppSettings["SMTP_USER"],
                    ConfigurationManager.AppSettings["SMTP_PASSWORD"])
            };
        }

        public async Task<bool> SendAsync(EmailMessage message)
        {
            try
            {
                foreach (var to in message.To)
                {
                    var mail = new MailMessage
                    {
                        From = new MailAddress(
                            ConfigurationManager.AppSettings["SMTP_USER"],
                            message.Alias),
                        Subject = message.Subject,
                        Body = message.Body,
                        IsBodyHtml = true
                    };

                    mail.To.Add(to);

                    // Imagen embebida
                    if (!string.IsNullOrEmpty(message.ImagePath))
                    {
                        var view = AlternateView.CreateAlternateViewFromString(message.Body, null, "text/html");

                        var resource = new LinkedResource(
                            HostingEnvironment.MapPath(message.ImagePath),
                            "image/png")
                        {
                            ContentId = "imgAct"
                        };

                        view.LinkedResources.Add(resource);
                        mail.AlternateViews.Add(view);
                    }

                    await _smtp.SendMailAsync(mail); // ✅ async
                }

                return true;
            }
            catch (Exception ex)
            {
                // log real aquí
                return false;
            }
        }
    }
}