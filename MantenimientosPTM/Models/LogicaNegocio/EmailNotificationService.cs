using System;
using System.Collections.Generic;
using System.Configuration;
using System.Net;
using System.Net.Mail;
using System.Text;
using System.Web;
using static MantenimientosPTM.AccesoDatosPlaneacion;

namespace MantenimientosPTM
{
    public class EmailNotificationService
    {
        public class EmailRequest
        {
            public List<string> To { get; set; } = new List<string>();
            public List<string> CC { get; set; } = new List<string>();
            public List<string> BCC { get; set; } = new List<string>();
            public string Subject { get; set; }
            public string Title { get; set; }
            public string Message { get; set; }
            public Dictionary<string, string> Data { get; set; } = new Dictionary<string, string>();
            public List<string> Attachments { get; set; } = new List<string>();
        }

        public static class EmailConfig
        {
            public static string Host =>
                ConfigurationManager.AppSettings["Email.Host"];

            public static int Port =>
                int.Parse(ConfigurationManager.AppSettings["Email.Port"]);

            public static bool EnableSSL =>
                bool.Parse(ConfigurationManager.AppSettings["Email.EnableSSL"]);

            public static string User =>
                ConfigurationManager.AppSettings["Email.User"];

            public static string Password =>
                ConfigurationManager.AppSettings["Email.Password"];

            public static string FromName =>
                ConfigurationManager.AppSettings["Email.FromName"];

            public static string LogoPath =>
                ConfigurationManager.AppSettings["Email.LogoPath"];
        }

        public static bool Send(EmailRequest request, out string error)
        {
            error = string.Empty;

            try
            {
                var smtp = new SmtpClient
                {
                    Host = EmailConfig.Host,
                    Port = EmailConfig.Port,
                    EnableSsl = EmailConfig.EnableSSL,
                    DeliveryMethod = SmtpDeliveryMethod.Network,
                    UseDefaultCredentials = false,
                    Credentials = new NetworkCredential(
                        EmailConfig.User,
                        EmailConfig.Password
                    )
                };

                var mail = new MailMessage
                {
                    From = new MailAddress(
                        EmailConfig.User,
                        EmailConfig.FromName
                    ),
                    Subject = request.Subject,
                    IsBodyHtml = true
                };

                request.To.ForEach(x => mail.To.Add(x));
                request.CC.ForEach(x => mail.CC.Add(x));
                request.BCC.ForEach(x => mail.Bcc.Add(x));

                var html = BuildTemplate(request);

                AlternateView avHtml = AlternateView.CreateAlternateViewFromString(
                    html,
                    null,
                    "text/html"
                );

                string logoPath = HttpContext.Current.Server.MapPath(
                    EmailConfig.LogoPath
                );

                LinkedResource logo = new LinkedResource(logoPath);
                logo.ContentId = "logoPTM";

                avHtml.LinkedResources.Add(logo);

                mail.AlternateViews.Add(avHtml);

                foreach (var ruta in request.Attachments)
                {
                    try
                    {
                        string rutaFisica = HttpContext.Current.Server.MapPath(ruta);

                        if (System.IO.File.Exists(rutaFisica))
                        {
                            Attachment attachment = new Attachment(rutaFisica);
                            mail.Attachments.Add(attachment);
                        }
                    }
                    catch
                    {
                        // opcional: loggear error
                    }
                }

                smtp.Send(mail);

                return true;
            }
            catch (Exception ex)
            {
                error = ex.Message;
                return false;
            }
        }

        private static string BuildTemplate(EmailRequest request)
        {
            var dataRows = new StringBuilder();

            foreach (var item in request.Data)
            {
                dataRows.Append($@"
                <tr>
                    <td style='padding:10px;border-bottom:1px solid #eee;font-weight:600;white-space:nowrap;'>
                        {item.Key}
                    </td>
                    <td style='padding:10px;border-bottom:1px solid #eee;'>
                        {item.Value}
                    </td>
                </tr>");
            }

            return $@"
                <!DOCTYPE html>
                <html>
                <body style='margin:0;padding:0;background:#f4f6f9;font-family:Segoe UI,Arial,sans-serif;'>

                <table width='100%' cellpadding='0' cellspacing='0' style='max-width:600px;margin:auto;'>

                    <!-- ══ HEADER ══ -->
                    <tr>
                        <td style='background:linear-gradient(135deg,#0f3c68,#1f6fb2);
                                   padding:25px 30px;
                                   border-radius:8px 8px 0 0;
                                   text-align:center;'>

                            <!-- 🔥 LOGO CON TAMAÑO CONTROLADO -->
                            <img src='cid:logoPTM'
                                 alt='PTM'
                                 width='120'
                                 style='display:block;
                                        margin:0 auto 12px auto;
                                        width:120px;
                                        max-width:120px;
                                        height:auto;' />

                            <div style='font-size:18px;font-weight:bold;color:#0058a1 !important;'>
                                Sistema Mantenimientos
                            </div>
                            <div style='font-size:13px;color:#0058a1 !important;margin-top:4px;'>
                                {request.Title}
                            </div>
                        </td>
                    </tr>

                    <!-- ══ BODY ══ -->
                    <tr>
                        <td style='background:#ffffff;padding:25px 30px;'>

                            <p style='margin:0 0 20px 0;font-size:14px;color:#333;'>
                                {request.Message}
                            </p>

                            <table width='100%' style='border-collapse:collapse;
                                                       border:1px solid #e0e0e0;
                                                       border-radius:8px;
                                                       overflow:hidden;
                                                       font-size:13px;'>
                                {dataRows}
                            </table>

                        </td>
                    </tr>

                    <!-- ══ FOOTER ══ -->
                    <tr>
                        <td style='background:#f0f4f8;
                                   padding:15px;
                                   text-align:center;
                                   font-size:11px;
                                   color:#888;
                                   border-radius:0 0 8px 8px;'>
                            Sistema PTM — Notificación Automática
                        </td>
                    </tr>

                </table>

                </body>
                </html>";
        }

        public static Dictionary<string, string> BuildChanges(PlanProduccion model)
        {
            var changes = new Dictionary<string, string>();

            if (!string.IsNullOrEmpty(model.LINEA_PRODUCCION_DESC))
                changes.Add("🏭 Línea", model.LINEA_PRODUCCION_DESC);

            if (!string.IsNullOrEmpty(model.PROCESO))
                changes.Add("⚙️ Proceso", model.PROCESO);

            if (!string.IsNullOrEmpty(model.ARTICULO))
                changes.Add("📦 Artículo", model.ARTICULO);

            if (!string.IsNullOrEmpty(model.ARTICULO_DESC))
                changes.Add("📝 Descripción", model.ARTICULO_DESC);

            if (!string.IsNullOrEmpty(model.CAPACIDAD))
                changes.Add("📊 Capacidad", model.CAPACIDAD);

            if (!string.IsNullOrEmpty(model.PRODUCCION_TEORICA))
                changes.Add("📈 Producción Teórica", model.PRODUCCION_TEORICA);

            if (!string.IsNullOrEmpty(model.PRODUCCION_REAL))
                changes.Add("📉 Producción Real", model.PRODUCCION_REAL);

            if (!string.IsNullOrEmpty(model.COMENTARIOS))
                changes.Add("💬 Comentarios", model.COMENTARIOS);

            if (model.DIA_INICIO_MANT != null)
                changes.Add("📅 Fecha Inicio", model.DIA_INICIO_MANT_STR);

            if (model.DIA_FIN_MANT != null)
                changes.Add("📅 Fecha Fin", model.DIA_FIN_MANT_STR);

            changes.Add("👤 Usuario", model.USUARIO);
            changes.Add("🆔 ID Plan", model.ID_PLAN.ToString());

            return changes;
        }
    }
}