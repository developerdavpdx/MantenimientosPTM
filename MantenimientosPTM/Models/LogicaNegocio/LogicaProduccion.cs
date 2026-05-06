using System;

namespace MantenimientosPTM
{
    public class LogicaProduccion
    {
        #region variables
        public AccesoDatosProduccion AD = new AccesoDatosProduccion();
        public LoginServiceLayer LoginService = new LoginServiceLayer();
        public GlobalCommands GlobalCommands = new GlobalCommands();
        #endregion

        #region constructor
        public LogicaProduccion() //se ejecuta al instanciar la clase
        {
            try
            {
                Console.WriteLine("LogicaProduccion inicializado correctamente");
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.ToString());
            }
        }
        #endregion
    }
}