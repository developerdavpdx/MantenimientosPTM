# Reglas del proyecto — MantenimientosPTM

## Pruebas funcionales

- **Todas las pruebas funcionales se hacen SIEMPRE en el portal (navegador)**, simulando la interacción real del usuario (login, clics, formularios, modales, guardado).
- **No usar llamadas directas a la API como sustituto** de una prueba funcional. La API/SQL solo sirve para verificar el resultado por debajo (conteos, claves, duplicados) o para preparar datos cuando el flujo del módulo no lo permita.
- Cuando el flujo lo requiera, usar **usuarios reales por rol** (ambiente de pruebas DBADMIN):
  - Administrador de mantenimiento: `adminmantenimiento@ptmexico.com`
  - Técnico de mantenimiento: usuarios `p1tecmantto*@ptm.com` / `p1techerramentales*@ptm.com`
  - Supervisor de producción: `hernandezmj@ptmexico.com`
  - Las contraseñas de prueba están en `CONTEXTO_SESION.md` y en el ambiente de pruebas.
- **Limpiar los datos de prueba** al terminar (filas de tiempos muertos, OTs, paros, etc.).
- Para Tiempos Muertos, validar el ciclo completo cuando aplique:
  1. Generar/liberar la orden (correctivo o preventivo) con el rol correspondiente.
  2. Atender/cerrar la orden con el técnico.
  3. Registrar el paro manual si aplica.
  4. Abrir el portal de Producción y verificar que **todo se unifica en una sola fila manual** por fecha + línea.
  5. Guardar dos veces y confirmar que **no se duplica**.
  6. Validar el producto terminado (NWSCALE) en modo día y en modo rango.
