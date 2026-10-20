---
name: mobile-forms
description: Diseñar o implementar formularios móviles de Petzy con avance entre campos mediante el teclado, validación clara y estados de envío. Usar antes de crear o modificar cualquier formulario en React Native.
---

# Formularios móviles de Petzy

Leer esta skill antes de crear o modificar un formulario. Aplicar también `frontend-design`, `async-feedback`, `apple-design`, los requisitos del módulo y `apps/mobile/AGENTS.md`. Las decisiones de Petzy tienen prioridad sobre ejemplos genéricos.

## Recorrido del teclado

- Ordenar los controles según el recorrido visual y la tarea. En cada `TextInput` de una línea que tenga otro campo editable después, mostrar «Siguiente» con `returnKeyType="next"`; al pulsarlo, enfocar el siguiente `TextInput` con una referencia de `useRef<TextInput>(null)` y `.focus()`.
- Usar `submitBehavior="submit"` en esos campos para mantener el teclado mientras cambia el foco. Si el siguiente control es un selector, cerrar el teclado y abrir ese selector; no fingir que es un campo de texto.
- En el último campo, mostrar «Listo» (`returnKeyType="done"`) y usar `submitBehavior="blurAndSubmit"`. Su `onSubmitEditing` debe ejecutar la misma función de validación y envío que el botón visible. Si el último campo precede un selector obligatorio, «Siguiente» abre el selector y el botón sigue disponible para guardar.
- En campos de varias líneas donde Enter añade un salto de línea, conservar ese comportamiento y ofrecer un botón visible para continuar. No sacrificar la escritura de párrafos para forzar el avance.
- No avanzar a un control oculto o deshabilitado. Ajustar el recorrido si los campos cambian por condiciones. Mantener el formulario desplazable y la acción alcanzable con el teclado abierto.

## Resultado y errores

- Antes de enviar, validar los datos según la ficha del módulo. Mostrar el error junto al campo o la acción correspondiente, conservar lo escrito si falla y permitir corregir o reintentar.
- La tecla del teclado y el botón deben compartir la misma acción y protección contra envíos duplicados. Mostrar espera durante la solicitud y confirmar éxito solo después de la respuesta del servidor. No introducir solicitudes de red al pasar de un campo a otro.
- Mantener etiquetas accesibles y tamaños táctiles adecuados. No depender solo del texto de la tecla del teclado: la acción principal debe seguir visible.

## Comprobación

Recorrer el formulario tocando campos y usando solo el teclado, en iOS y Android cuando estén disponibles. Comprobar «Siguiente», apertura de selectores, «Listo», validación, reintento, campos condicionales, texto ampliado y teclado abierto. Si falta un dispositivo, dejar esa revisión pendiente sin afirmar que el recorrido móvil está verificado.
