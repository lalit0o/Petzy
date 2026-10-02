# Especificación: chat privado (`chat-privado`)

**Contrato:** borrador, pendiente de revisión · **Código:** sin modelo, API ni pantalla · **Prioridad:** MVP, paso 7 previo a adopción (D-14) · **Depende de:** `cuenta`, `perfiles`. [Mapa](../../MAPA-CAPACIDADES.md).

## Objetivo

Dos usuarios registrados pueden conversar de forma privada y volver a consultar su historial. El chat grupal es una ampliación opcional distinta.

## Contrato de flujos

**Abrir o iniciar conversación (RF-CH01; CH-01–CH-02, CH-05).** Actor: usuario autenticado. Entrada: identidad de la otra persona, tomada del contexto aprobado; desde adopción será el autor de la publicación. Resultado: conversación existente del par o una nueva, sin duplicado ni nombre personalizado. Errores: otro usuario inexistente, sesión vencida o solicitud fallida. Fuera del contacto desde adopción, la política de quién puede iniciar y si se exige invitación está **pendiente**.

**Leer bandeja e historial (RF-CH03; CH-02–CH-04).** Actor: participante autenticado. Entradas: sesión, ID de conversación y paginación. Resultado: bandeja e historial persistente en orden, o estado vacío; un tercero recibe denegación aunque conozca el ID. Errores: falta de acceso, API inaccesible y reintento. La retención y eliminación del historial siguen **pendientes**.

**Enviar mensaje (RF-CH02; CH-02–CH-03).** Actor: participante autenticado. Entradas: conversación y texto. Resultado: mensaje persistido y mostrado una sola vez, con estado de envío visible. Errores: texto inválido según límites **pendientes**, bloqueo si se aprueba esa política, fallo de red o sesión vencida; conservar el texto y permitir reintento sin duplicar mensajes.

Aplican especialmente RNF-S01, RNF-S05–S06, RNF-I02 y RNF-Q01–Q02 de [PROYECTO.md](../PROYECTO.md).

## Decisiones confirmadas

- El primer alcance es conversación uno a uno.
- Solo los dos participantes pueden consultar la conversación o enviar mensajes.
- El historial debe persistir y reaparecer al iniciar sesión en otro momento.

## Flujos esperados

1. Un usuario inicia o abre una conversación con otra persona desde un acceso definido por la interfaz.
2. La bandeja muestra conversaciones recientes y permite abrir el historial paginado.
3. En el detalle, el usuario envía un mensaje de texto, ve el estado de envío y recibe los nuevos mensajes.
4. Un tercero que conoce el ID de la conversación no puede leer ni escribir mensajes.
5. Una vez integrado el chat, el acceso desde una publicación de adopción abre o inicia la conversación con quien publicó. Se muestra a esa persona, sin nombre personalizado para el chat.

## Criterios de aceptación

| ID | Resultado comprobable |
| --- | --- |
| CH-01 | El mismo par de usuarios no genera conversaciones duplicadas. |
| CH-02 | Solo participantes leen o envían mensajes, incluso al invocar la API directamente. |
| CH-03 | Un mensaje enviado aparece una vez y permanece en el historial tras reiniciar sesión. |
| CH-04 | El historial se pagina sin perder el orden. |
| CH-05 | El chat proporciona una forma de abrir la conversación con un usuario concreto; adopción la integra después de que el chat funcione. No se crea una conversación duplicada para el mismo par. |

## Decisiones pendientes antes del plan

El contacto desde adopción se integra después de completar el chat uno a uno. Definir si cualquier usuario puede iniciar conversación fuera de ese contexto o debe aceptar invitación; bloqueo y reportes; visibilidad de «en línea» y leído; política de eliminación y retención; y si se usarán notificaciones. Evaluar Supabase Realtime para entrega en vivo después de cerrar estas reglas. No diseñar grupos ni añadir columnas de estado sin consultarlo.

## Tecnología y estructura

La app usa Expo 57, React Native y TypeScript en `apps/mobile/app`; la API usa NestJS 11 y Prisma 7 en `apps/backend`. Aún no existen módulo, tablas ni pantallas de chat, por lo que sus rutas y ubicación exacta se fijan en un plan aprobado. Supabase Realtime se evaluará para entrega en vivo. Pruebas backend seguirán `*.spec.ts` y E2E en `apps/backend/test`.

## Comandos

Desde la raíz: `pnpm backend`, `pnpm mobile`, `pnpm backend:build`, `pnpm --filter proyecto-backend test -- --runInBand`, `pnpm --filter proyecto-backend test:e2e -- --runInBand` con entorno preparado y `pnpm --filter mobile lint`. Cualquier migración futura se ejecutará solo tras aprobar esquema y entorno.

## Estilo de código

TypeScript, DTO para entradas, clases `PascalCase`, propiedades `camelCase` y autorización en servidor. Patrón existente de identidad validada que debe conservarse:

```ts
const userId = request.user.id;
```

No crear conversaciones ni mensajes a nombre de un ID enviado por la app.

## Estrategia de pruebas

Unitarias para unicidad del par y orden de mensajes; E2E con tres cuentas para acceso permitido y denegado; pruebas de paginación, reenvío y persistencia; recorrido móvil con envío, error, reintento y sesión vencida. Definir qué significa «aparece una vez» frente a reintentos antes del plan.

La cobertura exigida para aprobar esta capacidad es evidencia de CH-01 a CH-05 con participantes y terceros; no se fija un porcentaje global de líneas.

## Límites de actuación

- **Siempre:** autorizar cada lectura y escritura por participantes, paginar historial y mantener mensajes persistentes.
- **Consultar antes:** tablas, columnas, política de inicio, bloqueo, retención, estados, notificaciones y proveedor de tiempo real.
- **Nunca:** exponer mensajes a terceros ni extender el alcance a chats grupales por inferencia.
