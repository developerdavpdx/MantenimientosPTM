namespace MantenimientosPTM
{
    public class LogicaMantenimientosPreventivos
    {
        #region variables
        public AccesoDatosMantenimientosPreventivos AD = new AccesoDatosMantenimientosPreventivos();
        public LoginServiceLayer LoginService = new LoginServiceLayer();
        public GlobalCommands GlobalCommands = new GlobalCommands();
        #endregion

        #region constructor
        public LogicaMantenimientosPreventivos() //se ejecuta al instanciar la clase
        {

        }
        #endregion
    }
}