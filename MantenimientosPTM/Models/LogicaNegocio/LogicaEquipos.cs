using System;
using System.Collections.Generic;

namespace MantenimientosPTM
{
    public class LogicaEquipos
    {
        #region variables
        public AccesoDatosEquipos AD = new AccesoDatosEquipos();
        public LoginServiceLayer LoginService = new LoginServiceLayer();
        public GlobalCommands GlobalCommands = new GlobalCommands();
        private string EmailsFacturacion { get; }
        private string EmailsVentas { get; }
        #endregion

        #region constructor
        public LogicaEquipos() //se ejecuta al instanciar la clase
        {
            try
            {
                Dictionary<string, string> parameters = new Dictionary<string, string>();
                parameters.Add("Code", "FacturacionM");
                //EmailsFacturacion = GlobalCommands.ExecuteProcedure(GlobalCommands.GCGetEmailAutorizacionesHHOC, parameters);
                parameters.Clear();
                parameters.Add("Code", "Ventas");
                //EmailsVentas = GlobalCommands.ExecuteProcedure(GlobalCommands.GCGetEmailAutorizacionesHHOC, parameters);
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.ToString());
                EmailsFacturacion = "";
                EmailsVentas = "";
            }
        }
        #endregion
    }
}