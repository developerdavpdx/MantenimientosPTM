using System;

namespace MantenimientosPTM
{
    public class LogicaMetricas
    {
        #region variables
        public AccesoDatosMetricas AD = new AccesoDatosMetricas();
        public LoginServiceLayer LoginService = new LoginServiceLayer();
        public GlobalCommands GlobalCommands = new GlobalCommands();
        #endregion

        #region constructor
        public LogicaMetricas() //se ejecuta al instanciar la clase
        {
            try
            {
                Console.WriteLine("LogicaMetricas inicializado correctamente");
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.ToString());
            }
        }
        #endregion
    }
}