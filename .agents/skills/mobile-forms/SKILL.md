---
name: mobile-forms
description: Diseñar o implementar formularios e inputs móviles de Petzy con campos visibles sobre el teclado, avance entre controles, validación y estados de envío. Usar antes de crear o modificar formularios, comentarios o búsquedas en React Native.
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

## Campos visibles con el teclado abierto

Resolver el teclado en el contenedor de la pantalla, no añadiendo margen fijo a cada `TextInput`. Esto también aplica a búsquedas y a crear o editar comentarios, aunque no parezcan un formulario completo.

- En las pantallas desplazables de Petzy, reutilizar `apps/mobile/components/form-scroll-view.tsx`. Activa `automaticallyAdjustKeyboardInsets` para que iOS adapte el espacio al teclado y desplace el campo activo, con `flex: 1`, `keyboardShouldPersistTaps="handled"` y cierre interactivo en iOS o al arrastrar en Android. Mantener acotada la altura de sus contenedores y respetar las áreas seguras.
- Android usa `android.softwareKeyboardLayoutMode: "resize"` en `app.json`. Conservar el formulario desplazable dentro del espacio que deja el teclado. Esa configuración nativa se aplica al generar el build; Expo Go usa la configuración de su propio contenedor.
- Para una lista virtualizada con búsqueda editable, poner el formulario en `ListHeaderComponent` y aplicar esas propiedades al `FlatList`; no anidar listas verticales dentro de otro `ScrollView`. Pasar un elemento a la cabecera, sin definir un nuevo tipo de componente en cada render que remonte el input y pierda el foco.
- Si otra pantalla necesita `KeyboardAvoidingView`, elegir su comportamiento y `keyboardVerticalOffset` según la cabecera real y la plataforma. No combinar su compensación con `automaticallyAdjustKeyboardInsets` en el mismo recorrido: produciría doble espacio. No usar offsets que supongan una altura fija de teclado.
- Conservar cabeceras fijas fuera del contenido desplazable, como «Volver» en el detalle de publicación. El contenido que contiene los comentarios es el que debe ajustarse. En modales con inputs, aplicar la solución dentro de la raíz del modal nativo, con su propia área segura.
- Mantener visible el campo activo y su cursor al abrir el teclado, avanzar con «Siguiente», tocar otro campo con el teclado abierto o escribir varias líneas. La acción de enviar/guardar debe ser alcanzable desplazándose y responder al primer toque; no basta con poder ocultar el teclado manualmente.

## Comprobación

Recorrer el formulario tocando campos y usando solo el teclado, en iOS y Android cuando estén disponibles. Comprobar «Siguiente», apertura de selectores, «Listo», validación, reintento, campos condicionales y texto ampliado. Con teclado abierto, probar el primer y último campo, comentarios al final de una publicación larga, edición de comentarios, multilinea, cambio de foco, rotación, envío al primer toque y cierre sin espacio vacío residual. Si falta un dispositivo, dejar esa revisión pendiente sin afirmar que el recorrido móvil está verificado.
