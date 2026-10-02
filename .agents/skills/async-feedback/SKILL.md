---
name: async-feedback
description: Diseñar o corregir flujos de interfaz que envían solicitudes a la API o esperan datos, con estados visibles de carga, éxito, error y reintento. Usar al crear pantallas, formularios y acciones de red de Petzy.
---

# Retroalimentación de acciones asíncronas en Petzy

Petzy debe decirle a la persona qué está ocurriendo cada vez que una pantalla consulta datos o un formulario envía cambios. Esta skill guía la experiencia; no autoriza cambiar contratos, permisos, esquema ni proveedores sin seguir `AGENTS.md` y las especificaciones.

## Regla de estado

Para cada solicitud de red, identificar sus estados `inicial`, `cargando/enviando`, `éxito`, `vacío` cuando aplique y `error`. Mostrar una señal de espera en el lugar de la acción desde que empieza la solicitud; desactivar solo el control que podría duplicarla. Al terminar, confirmar el resultado o navegar únicamente después de una respuesta exitosa. No cerrar un formulario ni borrar lo escrito si el servidor rechazó la operación.

El error debe aparecer **junto a la acción que falló**: un fallo al crear una comunidad se muestra dentro de su modal, no detrás de él. Conservar los datos ingresados y ofrecer reintento. En una lectura fallida, mostrar mensaje y acción «Reintentar» sin dejar un indicador girando indefinidamente.

## Diagnóstico y mensajes

- Distinguir conexión con la **API** de conexión a internet. Verificar `EXPO_PUBLIC_API_URL`, servidor activo y acceso desde el dispositivo o emulador antes de atribuir un fallo a internet.
- Dar límite razonable a esperas de red y limpiar temporizadores. Diferenciar espera agotada, servidor inaccesible, sesión vencida, validación y error interno. No exponer tokens, contraseñas, trazas ni detalles internos al usuario.
- No ocultar una respuesta de error detrás de un modal, una navegación o un `catch` genérico. No mantener «Creando…» mientras se espera una recarga secundaria después de que la creación ya tuvo éxito.

## Interfaz y verificación

Mantener formularios utilizables con teclado abierto: contenido desplazable, acciones accesibles y posición acorde con el diseño aprobado. Respetar accesibilidad, etiquetas claras y tamaños táctiles. Antes de dar por terminado un flujo, probar éxito, API apagada, timeout, error de validación y repetición del envío; comprobar que el usuario siempre sabe si se guardó o no. Si no hay acceso a la API o al dispositivo para probarlo, informar esa limitación sin declarar el flujo verificado.
