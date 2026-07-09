# 🚀 IMPLEMENTACIÓN DE GUARDADO PARCIAL (BORRADOR) - PROGRESO

## ✅ COMPLETADO

### **1. Front-End (JavaScript)**
**Archivo:** `MantenimientosPTM/Scripts/mantenimientos_preventivos_refactor.js`

#### Métodos Agregados:
- ✅ **`guardarBorrador(e)`** - Guarda borrador de orden sin validaciones estrictas
  - Valida solo número de orden
  - Llama a `guardarRutinaParaBorrador()` para guardar rutina
  - Convierte horas a 24h
  - Agrega técnicos si existen
  - Envía con `TipoOperacion = 'BORRADOR'`
  - **NO cierra** el modal (permite seguir editando)

- ✅ **`guardarRutinaParaBorrador(OrdenTrabajo, EstatusOrden)`** - Nueva funcion para rutina
  - Valida que **AL MENOS UNA actividad** esté respondida (vs. todas en guardarRutina)
  - Soporta PDF de rutina (sin validar actividades si hay PDF)
  - Soporta estatus "Cerrado"
  - Envía al endpoint: `/MantenimientosPreventivos/GuardarRutinaBorrador`
  - **NO rechaza** si falla (permite continuar guardando la OT)

- ✅ **`_obtenerDatosBorrador()`** - Recolecta datos disponibles del formulario
  - Solo obtiene lo que el usuario ingresó
  - No requiere campos obligatorios

- ✅ **Event Listener**
  ```javascript
  $('#btnGuardarBorrador').on('click', (e) => this.mantenimientoManager.guardarBorrador(e));
  ```

- ✅ **Botón HTML**
  - Clase: `btn-modal-guardar draft` (naranja/ámbar)
  - Icono: `bi bi-cloud-upload`
  - Tooltip: "Guardar Borrador"

- ✅ **Estilos CSS** (Modales.css)
  - Gradiente naranja: `#F57C00 → #FB8C00`
  - Sombra personalizada
  - Efecto hover

---

### **2. Back-End (C#)**
**Archivo:** `MantenimientosPTM/Controllers/MantenimientosPreventivosController.cs`

#### Método Agregado:
- ✅ **`GuardarRutinaBorrador()`** - Nuevo método POST
  - Valida datos básicos (menos estricto)
  - Guarda imágenes en servidor
  - Prepara parámetros con `P_ES_BORRADOR = true`
  - Ejecuta SP existente `GCGuardarRutinaMP`
  - Respuestas JSON apropiadas
  - Manejo de excepciones completo

#### Parámetros Enviados:
```csharp
P_ID_MANTENIMIENTO
P_ID_EQUIPO
P_COMENTARIOS
P_USUARIO_REGISTRO
P_ID_OT_DETALLE
P_ACTIVIDADES_JSON
P_ES_BORRADOR = true  // 🔥 NUEVO
```

---

### **3. Base de Datos (SQL) - DOCUMENTACIÓN**
**Archivo:** `MantenimientosPTM/STORED_PROCEDURE_BORRADOR.sql`

#### Cambios Necesarios al SP `SpPdxMTTOGuardarRutinaMP`:
1. ✅ **Parámetro nuevo**: `IN P_ES_BORRADOR NVARCHAR(5) DEFAULT 'false'`
2. ✅ **Lógica de UPSERT** (actualizar si existe, insertar si no)
   - Verifica si rutina ya existe para esa OT
   - Si existe: actualiza comentarios y fecha, reemplaza actividades
   - Si no existe: inserta todo como nuevo
3. ✅ **Manejo de Actividades Parciales**
   - Permite guardar actividades sin que todas estén completadas
   - Preserva estado de cada actividad (realizado/no_realizado/null)

---

## 📝 PRÓXIMOS PASOS NECESARIOS

### **1. Base de Datos**
- [ ] Ejecutar cambios en SP `SpPdxMTTOGuardarRutinaMP`
  - Agregar parámetro `P_ES_BORRADOR`
  - Implementar lógica de UPSERT
  - Permitir actividades parciales
  - Ubicación: `MantenimientosPTM/STORED_PROCEDURE_BORRADOR.sql`

### **2. Método de Guardado Principal de OT**
- [ ] Crear/adaptar método para `InsertarOrdenTrabajoMP` que acepte `TipoOperacion = 'BORRADOR'`
  - Debe hacer INSERT si es borrador nuevo
  - Debe hacer UPDATE si es borrador existente

---

## 🔄 FLUJO COMPLETO DE GUARDADO BORRADOR

```
Usuario click "Guardar Borrador"
		↓
guardarBorrador() valida número de orden
		↓
guardarRutinaParaBorrador() valida ≥1 actividad
		↓
AJAX → /GuardarRutinaBorrador (C#)
		↓
SP actualiza/inserta actividades parciales
		↓
Guardar datos de OT en borrador estado
		↓
AJAX → /InsertarOrdenTrabajoMP con TipoOperacion='BORRADOR'
		↓
Modal permanece abierto (usuario puede seguir editando)
		↓
Toast: "✅ Borrador guardado correctamente"
```

---

## 🎯 ESTADÍSTICAS

| Componente | Líneas | Estado |
|-----------|--------|--------|
| JS - Métodos nuevos | ~80 | ✅ Completo |
| JS - Event listeners | ~1 | ✅ Completo |
| JS - Estilos | ~5 | ✅ Completo |
| C# - Método nuevo | ~70 | ✅ Completo |
| SQL - SP adaptado | ~100+ | 📝 Documentado |
| **Total Frontend** | **~90** | **✅ 100%** |
| **Total Backend** | **~70** | **✅ 100%** |
| **Total Database** | **~100** | **⏳ Pendiente** |

---

## 📌 NOTAS IMPORTANTES

1. **El botón "Guardar Borrador" NO cierra el modal** - Permite seguir editando y guardando múltiples veces
2. **Validación relajada** - Solo requiere:
   - Número de orden (crítico)
   - Al menos 1 actividad de rutina respondida (si hay rutina)
3. **Sin validación de técnicos** - Los técnicos son opcionales en borrador
4. **Sin validación de firmas** - No se requieren firmas en borrador
5. **Imágenes se guardan** - Las que el usuario haya subido se guardan normalmente
6. **PDF se soporta** - Si hay PDF, no se validan actividades

---

## 🔗 REFERENCIAS
- JS Original: Lines 2950-3050
- C# Original: Lines 714-836
- SP Original: `SpPdxMTTOGuardarRutinaMP`

