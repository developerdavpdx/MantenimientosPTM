namespace MantenimientosPTM
{
    public class LogicaMantenimientosCorrectivos
    {
        #region variables
        public AccesoDatosMantenimientosCorrectivos AD = new AccesoDatosMantenimientosCorrectivos();
        public LoginServiceLayer LoginService = new LoginServiceLayer();
        public GlobalCommands GlobalCommands = new GlobalCommands();
        #endregion

        #region constructor
        public LogicaMantenimientosCorrectivos() //se ejecuta al instanciar la clase
        {

        }
        #endregion
    }
}