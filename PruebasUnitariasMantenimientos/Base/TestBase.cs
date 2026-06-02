using Microsoft.VisualStudio.TestTools.UnitTesting;
using OpenQA.Selenium;
using OpenQA.Selenium.Chrome;
using OpenQA.Selenium.Support.UI;
using SeleniumExtras.WaitHelpers;
using System;
using System.Threading;

namespace PruebasUnitariasMantenimientos.Base
{
    public class TestBase
    {
        protected IWebDriver Driver;
        protected WebDriverWait Wait;

        // ← Tu URL local
        protected const string BaseUrl = "https://localhost:44377/Planeacion";

        [TestInitialize]
        public void IniciarDriver()
        {
            var options = new ChromeOptions();
            // options.AddArgument("--headless"); // sin ventana, descomenta cuando no quieras verlo

            Driver = new ChromeDriver(options);
            Driver.Manage().Window.Maximize();
            Wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(15));
        }

        [TestCleanup]
        public void CerrarDriver()
        {
            Driver?.Quit();
        }

        // ─────────────────────────────────────────
        // Esperar que un elemento sea clickeable
        // ─────────────────────────────────────────
        protected IWebElement EsperarClickeable(By selector)
            => Wait.Until(ExpectedConditions.ElementToBeClickable(selector));

        // ─────────────────────────────────────────
        // Esperar que un elemento sea visible
        // ─────────────────────────────────────────
        protected IWebElement EsperarVisible(By selector)
            => Wait.Until(ExpectedConditions.ElementIsVisible(selector));

        // ─────────────────────────────────────────
        // Llenar un input limpiando primero
        // ─────────────────────────────────────────
        protected void LlenarCampo(By selector, string valor)
        {
            var el = EsperarVisible(selector);
            el.Clear();
            el.SendKeys(valor);
        }

        // ─────────────────────────────────────────
        // Pausa visual para ver el test en cámara lenta
        // Uso: Pausa()      → 1 segundo
        //      Pausa(2)     → 2 segundos
        //      Pausa(0.5)   → medio segundo
        // ─────────────────────────────────────────
        protected void Pausa(double segundos = 1)
        {
            Thread.Sleep((int)(segundos * 1000));
        }

        // ─────────────────────────────────────────
        // Escribir carácter por carácter (más visual)
        // útil para ver el autocomplete en acción
        // ─────────────────────────────────────────
        protected void EscribirDespacio(By selector, string valor, int msEntreCaracter = 150)
        {
            var el = EsperarVisible(selector);
            el.Clear();
            foreach (char c in valor)
            {
                el.SendKeys(c.ToString());
                Thread.Sleep(msEntreCaracter);
            }
        }

        // ─────────────────────────────────────────
        // Resaltar un elemento visualmente con borde
        // útil para ver qué campo está siendo llenado
        // ─────────────────────────────────────────
        protected void Resaltar(By selector)
        {
            var el = Driver.FindElement(selector);
            var js = (IJavaScriptExecutor)Driver;
            js.ExecuteScript(
                "arguments[0].style.border='3px solid red'; " +
                "arguments[0].style.backgroundColor='#fff3cd';",
                el
            );
            Thread.Sleep(400);
            js.ExecuteScript(
                "arguments[0].style.border=''; " +
                "arguments[0].style.backgroundColor='';",
                el
            );
        }

        // ─────────────────────────────────────────
        // Scroll hacia un elemento (por si está fuera de pantalla)
        // ─────────────────────────────────────────
        protected void ScrollHacia(By selector)
        {
            var el = Driver.FindElement(selector);
            var js = (IJavaScriptExecutor)Driver;
            js.ExecuteScript("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", el);
            Thread.Sleep(300);
        }
    }
}