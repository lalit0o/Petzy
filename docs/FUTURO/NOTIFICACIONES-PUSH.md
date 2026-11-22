# Trabajo futuro: notificaciones del teléfono con la app cerrada

**Estado:** fuera del MVP por la decisión [D-157](../03-DECISIONES.md) del 22-11-2026. No hay código de push en el checkout.

## Qué verá la persona cuando se implemente

- **Chat:** con Petzy cerrada, el teléfono muestra «Nuevo mensaje de [nombre]», sin el texto del mensaje. Al tocarla, Petzy comprueba la sesión y que la persona sigue en esa conversación antes de abrirla (CH-11 con la app cerrada y CH-14).
- **Eventos:** quien marcó «Iré» recibe en el teléfono el aviso de cambio de hora, de lugar o de cancelación. Al tocarlo se abre el evento después de comprobar el acceso (parte «por teléfono» de CE-07, RF-E04 y D-101).
- Si la persona no da permiso de notificaciones, todo sigue funcionando dentro de la app.

## Qué ya funciona en el MVP y se reutiliza

- Los avisos de eventos se guardan uno por persona y por cambio, sin duplicados ante reintentos. La prueba de volumen con 1 000 «Iré» ya se superó (EV-T14).
- Con la app abierta llegan en vivo por la conexión de Chat: tarjeta emergente de mensaje (D-154) y de evento (D-156). Con la app cerrada, lo recibido sigue disponible en «Mensajes» y en la campana «Avisos de eventos».

## Qué falta construir

1. Guardar el teléfono autorizado de cada persona (token de Expo Push), con la posibilidad de revocarlo. Antes de crear la tabla hay que proponerla y aprobarla según `AGENTS.md`.
2. Enviar el aviso desde el backend con el servicio de Expo Push y marcar `pushSentAt` en los avisos de eventos. Si el envío falla, el mensaje o el cambio del evento no se deshacen.
3. En la app: pedir el permiso, registrar el token al iniciar sesión, quitarlo al cerrarla y abrir la pantalla correcta al tocar la notificación.
4. Pruebas: permiso concedido y denegado, token caducado, proveedor caído, reintentos sin duplicar y bloqueo entre personas.

## Qué se necesita para probarlo

- Un **build de desarrollo**: Expo Go no recibe notificaciones remotas en Android desde el SDK 53.
- Un **proyecto EAS** (`projectId`).
- **Android:** un proyecto de Firebase (gratis) y un teléfono Android o un emulador con Google Play.
- **iPhone:** una cuenta de Apple Developer de pago para las credenciales de push.

Tareas de origen: [CH-T11](../ESPECIFICACIONES/07-CHAT-PRIVADO/02-TAREAS.md), y la parte de app cerrada de CH-T14, EV-T14 y EV-T18. La guía de diseño ya aprobada está en el [plan de Chat](../ESPECIFICACIONES/07-CHAT-PRIVADO/01-PLAN.md) y en el [plan de Eventos](../ESPECIFICACIONES/09-EVENTOS/01-PLAN.md).
