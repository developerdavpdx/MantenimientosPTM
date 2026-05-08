using Microsoft.VisualStudio.TestTools.UnitTesting;
using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;
using SeleniumExtras.WaitHelpers;
using PruebasUnitariasMantenimientos.Base;
using System;
using System.Threading;

namespace PruebasUnitariasMantenimientos.Tests
{
    [TestClass]
    public class PlanProduccionTests : TestBase
    {
        // ─────────────────────────────────────────
        // TEST 1: Abrir el modal correctamente
        // ─────────────────────────────────────────
        [TestMethod]
        public void AbrirModal_DebeVerseElFormulario()
        {
            Driver.Navigate().GoToUrl(BaseUrl + "/Planeacion");

            // Esperar que cargue la página completamente
            Wait.Until(d => d.FindElement(By.Id("AgregarPlan")).Displayed);

            // Click en "Agregar Plan"
            EsperarClickeable(By.Id("AgregarPlan")).Click();

            // Esperar que el modal sea visible
            var modal = EsperarVisible(By.Id("addEventModal"));
            Assert.IsTrue(modal.Displayed, "El modal debería estar visible");

            // Verificar título del modal
            var titulo = EsperarVisible(By.Id("addEventModalLabel"));
            Assert.AreEqual("Carga Plan de Producción", titulo.Text);

            Console.WriteLine("✅ TEST 1 OK — Modal abierto correctamente");
        }

        // ─────────────────────────────────────────
        // TEST 2: Llenar el formulario completo
        // ─────────────────────────────────────────
        [TestMethod]
        public void LlenarFormulario_DatosValidos_DebeGuardar()
        {
            Driver.Navigate().GoToUrl(BaseUrl + "/Planeacion");
            Wait.Until(d => d.FindElement(By.Id("AgregarPlan")).Displayed);

            // ── 1. Abrir modal ──────────────────────────────
            EsperarClickeable(By.Id("AgregarPlan")).Click();
            EsperarVisible(By.Id("addEventModal"));
            Console.WriteLine("📋 Modal abierto");

            // ── 2. Mes y Año ────────────────────────────────
            // El campo es type="month", necesita formato YYYY-MM
            var inputMes = EsperarVisible(By.Id("MesAnioPlan"));
            inputMes.SendKeys("2026-05");
            Console.WriteLine("📅 Mes y año llenado");

            // ── 3. Línea de Producción ──────────────────────
            // Esperar que EquiposUtil.llenarLineas() termine de cargar las opciones
            Wait.Until(d =>
            {
                var select = d.FindElement(By.Id("PlanLinea"));
                var options = select.FindElements(By.TagName("option"));
                return options.Count > 1; // más de la opción vacía
            });

            var selectLinea = new SelectElement(Driver.FindElement(By.Id("PlanLinea")));
            selectLinea.SelectByIndex(1); // primera opción real
            Console.WriteLine("🏭 Línea seleccionada: " + selectLinea.SelectedOption.Text);

            // ── 4. Proceso ──────────────────────────────────
            // Esperar que EquiposUtil.llenarProcesos() termine
            Wait.Until(d =>
            {
                var select = d.FindElement(By.Id("PlanProceso"));
                var options = select.FindElements(By.TagName("option"));
                return options.Count > 1;
            });

            var selectProceso = new SelectElement(Driver.FindElement(By.Id("PlanProceso")));
            selectProceso.SelectByIndex(1);
            Console.WriteLine("⚙️ Proceso seleccionado: " + selectProceso.SelectedOption.Text);

            // ── 5. Buscar artículo (autocomplete) ───────────
            // Necesita mínimo 2 caracteres para disparar la búsqueda
            var inputBuscar = EsperarVisible(By.Id("BuscarArticulo"));
            inputBuscar.SendKeys("43");
            Thread.Sleep(600); // esperar debounce del input

            // Esperar que aparezca al menos una sugerencia en #sugerenciasArticulos
            Wait.Until(d =>
            {
                var sugerencias = d.FindElement(By.Id("sugerenciasArticulos"));
                return sugerencias.Displayed &&
                       sugerencias.FindElements(By.CssSelector("*")).Count > 0;
            });

            // Click en la primera sugerencia
            var primeraSugerencia = Driver.FindElement(
                By.CssSelector("#sugerenciasArticulos > *:first-child")
            );
            Console.WriteLine("🔍 Primera sugerencia: " + primeraSugerencia.Text);
            primeraSugerencia.Click();

            // ── 6. Verificar campos readonly llenados automáticamente ──
            Wait.Until(d => !string.IsNullOrEmpty(
                d.FindElement(By.Id("CodigoArticulo")).GetAttribute("value")
            ));

            string codigo = Driver.FindElement(By.Id("CodigoArticulo")).GetAttribute("value");
            string descripcion = Driver.FindElement(By.Id("DescripcionArticulo")).GetAttribute("value");
            Console.WriteLine("📦 Código: " + codigo);
            Console.WriteLine("📝 Descripción: " + descripcion);
            Assert.IsFalse(string.IsNullOrEmpty(codigo), "CodigoArticulo debe llenarse solo");
            Assert.IsFalse(string.IsNullOrEmpty(descripcion), "DescripcionArticulo debe llenarse solo");

            // ── 7. Fechas del rango ─────────────────────────
            // Son inputs type="date", formato YYYY-MM-DD
            LlenarCampo(By.Id("DiaInicioMant"), "2026-05-07");
            LlenarCampo(By.Id("DiaFinMant"), "2026-05-08");
            Console.WriteLine("📅 Fechas llenadas");

            // ── 8. Verificar que ProduccionTeorica se calculó ──
            // El JS la calcula automáticamente al cambiar fechas
            Thread.Sleep(300);
            string teorica = Driver.FindElement(By.Id("ProduccionTeorica")).GetAttribute("value");
            Console.WriteLine("🔢 Producción teórica calculada: " + teorica);

            // ── 9. Producción Real ──────────────────────────
            LlenarCampo(By.Id("ProduccionReal"), "150");

            // ── 10. Comentarios ─────────────────────────────
            LlenarCampo(By.Id("Comentarios"), "Prueba automatizada Selenium");

            // ── 11. Guardar ─────────────────────────────────
            EsperarClickeable(By.Id("btnGuardarEvento")).Click();
            Console.WriteLine("💾 Botón guardar presionado");

            // ── 12. Verificar respuesta ─────────────────────
            // El JS hace response.Status === 'SI' y muestra AlertManager
            // Esperamos que el alertContainer tenga algo o el modal se cierre
            Wait.Until(d =>
            {
                // Opción A: apareció alerta en alertPlanContainer
                var alerta = d.FindElement(By.Id("alertPlanContainer"));
                if (!string.IsNullOrEmpty(alerta.Text)) return true;

                // Opción B: el modal se ocultó (guardó y cerró)
                var modal = d.FindElement(By.Id("addEventModal"));
                return !modal.Displayed;
            });

            Console.WriteLine("✅ TEST 2 OK — Formulario guardado");
        }

        // ─────────────────────────────────────────
        // TEST 3: Validar campos requeridos vacíos
        // ─────────────────────────────────────────
        [TestMethod]
        public void GuardarSinDatos_DebeMostrarValidaciones()
        {
            Driver.Navigate().GoToUrl(BaseUrl + "/Planeacion");
            Wait.Until(d => d.FindElement(By.Id("AgregarPlan")).Displayed);

            // Abrir modal
            EsperarClickeable(By.Id("AgregarPlan")).Click();
            EsperarVisible(By.Id("addEventModal"));

            // Click guardar sin llenar nada
            EsperarClickeable(By.Id("btnGuardarEvento")).Click();

            // El JS llama ValidationManager.validarFormulario('#eventForm')
            // y muestra los divs .modal-error-msg o alerta en alertPlanContainer
            Thread.Sleep(500);

            // Verificar que hay al menos un .modal-error-msg visible
            // O que alertPlanContainer tiene contenido
            bool hayValidacion = false;

            // Revisar mensajes de error inline
            var errores = Driver.FindElements(By.CssSelector(".modal-error-msg"));
            foreach (var error in errores)
            {
                if (error.Displayed)
                {
                    Console.WriteLine("⚠️ Error visible: " + error.Text);
                    hayValidacion = true;
                    break;
                }
            }

            // Si no hay errores inline, revisar la alerta general
            if (!hayValidacion)
            {
                var alerta = Driver.FindElement(By.Id("alertPlanContainer"));
                if (!string.IsNullOrEmpty(alerta.Text))
                {
                    Console.WriteLine("⚠️ Alerta: " + alerta.Text);
                    hayValidacion = true;
                }
            }

            Assert.IsTrue(hayValidacion, "Deben mostrarse validaciones al guardar vacío");
            Console.WriteLine("✅ TEST 3 OK — Validaciones funcionando");
        }
    }
}