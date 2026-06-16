using System;
using System.Net.Http;
using System.Text;
using MantenimientosPTM.Models.Dto;
using Newtonsoft.Json;
using System.Configuration;
using System.Net;

namespace MantenimientosPTM.Models.AccesoDatos
{
    public class AccesoDatosPTM
    {

        //Se obtienen los datos de las facturas por orden de compra
        public static PTMResponseDTO ObtenerFacturasPorOC(string oc)
        {
            //Se usa TLS 1.2 para las peticiones HTTPS
            ConfigurarSeguridadTLS();

            using (var client = new HttpClient())
            {
                //Construccion del request
                var request = new PTMRequestDTO
                {
                    usuario = ConfigurationManager.AppSettings["PTMUsuario"],
                    password = ConfigurationManager.AppSettings["PTMPassword"],
                    oc = oc
                };

                //Conversion de objeto a JSON
                string json = JsonConvert.SerializeObject(request);

                //Preparacion contenido para HTTP
                var content = new StringContent(
                    json,
                    Encoding.UTF8,
                    "application/json");


                //Se realiza el post
                var response = client.PostAsync(
                ConfigurationManager.AppSettings["PTMUrl"],
                content).Result;

                if (!response.IsSuccessStatusCode)
                {
                    throw new Exception($"Error PTM: {response.StatusCode}");
                }

                //Lectura de respuesta
                var resultado = response.Content.ReadAsStringAsync().Result;

                //Convertir a JSON la respuesta
                return JsonConvert.DeserializeObject<PTMResponseDTO>(resultado);

            }

        }

        private static void ConfigurarSeguridadTLS()
        {
            // PTM requiere TLS 1.2 para conexiones HTTPS
            ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
        }

    }
}