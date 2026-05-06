using Newtonsoft.Json;
using System;
using System.Configuration;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

namespace MantenimientosPTM.Service
{
    public class PurchaseRequestService
    {
        readonly LoginServiceLayer SL = new LoginServiceLayer();

        public async Task<object> CreatePurchaseRequestAsync(AccesoDatosAlmacen.PurchaseRequestDto dto)
        {
            
            // 1. Obtener sesión activa
            //var session = await SapAuthService.GetSessionAsync();
            var session = await SL.LoginAsyncHttpClient();

            // 2. Mapear nuestro modelo al formato de SAP
            var sapPayload = MapToSapPayload(dto);
           
            var json = JsonConvert.SerializeObject(sapPayload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            //var response = await client.PostAsync("/b1s/v1/PurchaseRequests", content);
            var grUrl = $"{ConfigurationManager.AppSettings["ServiceLayer"]}/PurchaseRequests";

            var postResponse = await SL._httpClient.PostAsync(grUrl, content);
            var responseBody = await postResponse.Content.ReadAsStringAsync();

            // 5. Manejar respuesta
            //var responseBody = await response.Content.ReadAsStringAsync();

            //{
            //  "RequriedDate": "2025-03-20",
            //  "U_URGENCIA": "NO",
            //  "U_REQ_CALIDAD": "NO APLICA",
            //  "DocumentLines": [
            //    {
            //      "ItemCode": "133MP000004",
            //      "Quantity": 1,
            //      "LineVendor": "P00036",
            //      "U_COK1_01Dimension": "",
            //      "CostingCode": "DSOT",
            //      "CostingCode2": "PINY",
            //      "CostingCode3": "GG",
            //      "CostingCode4": "CCOR"
            //    }
            //  ]
            //}

            if (!postResponse.IsSuccessStatusCode)
            {
                // SAP devuelve el error en el body, lo extraemos
                var sapError = JsonConvert.DeserializeObject<AccesoDatosAlmacen.SapErrorResponse>(responseBody);
                throw new AccesoDatosAlmacen.SapException(sapError?.Error?.Message?.Value ?? "Error desconocido en SAP");
            }

            return JsonConvert.DeserializeObject<object>(responseBody);

        }

        private AccesoDatosAlmacen.SapPurchaseRequestPayload MapToSapPayload(AccesoDatosAlmacen.PurchaseRequestDto dto)
        {
            return new AccesoDatosAlmacen.SapPurchaseRequestPayload
            {
                Document = new AccesoDatosAlmacen.SapPurchaseRequestDocument
                {
                    //CardCode = dto.CardCode,
                    //DocDate = DateTime.Now.ToString("yyyy-MM-dd"),
                    RequriedDate = DateTime.Parse(dto.ReqDate).ToString("yyyy-MM-dd"), // 👈 Sin T00:00:00
                    DocumentLines = dto.Lines.Select(l => new AccesoDatosAlmacen.SapPurchaseRequestLine
                    {
                        ItemCode = l.ItemCode,
                        Quantity = l.Quantity,
                        LineVendor = dto.CardCode  // 👈 Se hereda del header
                    }).ToList()
                }
            };
        }

        private void ValidateRequest(AccesoDatosAlmacen.PurchaseRequestDto dto)
        {
            if (string.IsNullOrEmpty(dto.CardCode))
                throw new ArgumentException("El CardCode del proveedor es requerido.");

            if (string.IsNullOrEmpty(dto.ReqDate))
                throw new ArgumentException("La fecha requerida es obligatoria.");

            if (dto.Lines == null || !dto.Lines.Any())
                throw new ArgumentException("Debe incluir al menos una línea de artículo.");

            foreach (var line in dto.Lines)
            {
                if (string.IsNullOrEmpty(line.ItemCode))
                    throw new ArgumentException("Todas las líneas deben tener un ItemCode.");

                if (line.Quantity <= 0)
                    throw new ArgumentException($"La cantidad del artículo {line.ItemCode} debe ser mayor a 0.");

                if (string.IsNullOrEmpty(line.WarehouseCode))
                    throw new ArgumentException($"El artículo {line.ItemCode} debe tener un almacén asignado.");
            }
        }
    }
}