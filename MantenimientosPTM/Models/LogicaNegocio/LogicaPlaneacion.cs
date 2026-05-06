using System;

namespace MantenimientosPTM
{
    public class LogicaPlaneacion
    {
        #region variables
        public AccesoDatosPlaneacion AD = new AccesoDatosPlaneacion();
        public LoginServiceLayer LoginService = new LoginServiceLayer();
        public GlobalCommands GlobalCommands = new GlobalCommands();
        #endregion

        #region constructor
        public LogicaPlaneacion() //se ejecuta al instanciar la clase
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