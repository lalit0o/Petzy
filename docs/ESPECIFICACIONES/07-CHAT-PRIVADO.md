# Especificación: chat privado (`chat-privado`)

**Contrato:** ficha y alcance D-86 aprobados; D-87 aclara que el reporte se guarda en el MVP y su revisión queda para después · **Código:** backend de CH-T01–CH-T09 implementado y probado localmente el 9-11-2026 (tablas, API, bloqueo, ocultar, borrar vista y reportes; D-145–D-147); migraciones aplicadas a la base de desarrollo; entrega en vivo, pantallas móviles, bloqueo/ocultar/borrar/reportes y aviso con la app abierta implementados y recorridos en el teléfono el 9 y 10-11-2026 (CH-T10, CH-T12–CH-T14); faltan las notificaciones con la app cerrada (CH-T11) y por eso Chat no está «Verificado» · **Prioridad:** MVP, paso 7 previo a adopción (D-14) · **Depende de:** `cuenta`, `perfiles`. [Mapa](../../MAPA-CAPACIDADES.md).

## Objetivo

Dos usuarios registrados pueden conversar de forma privada y volver a consultar su historial. El chat grupal es una ampliación opcional distinta.

**Ejemplo:** Ana abre el perfil de Luis y pulsa la acción para conversar. Envía un mensaje y vuelve a verlo otro día. Una persona ajena no puede leerlo. Si Ana inicia contacto con Luis otra vez, entra en la misma conversación. Si Ana bloquea a Luis, ninguno puede enviar mensajes nuevos mientras dure el bloqueo, pero ambos pueden consultar lo que ya hablaron.

## Contrato de flujos

**Abrir o iniciar conversación (RF-CH01; CH-01–CH-02, CH-05).** Actor: persona con cuenta activa que abre el perfil de otra cuenta activa (D-75). Entrada: identidad de la otra persona desde ese perfil; después, desde Adopción será el autor de la publicación. Resultado: conversación existente del par o una nueva, sin duplicado ni nombre personalizado y sin invitación previa. No puede iniciar consigo misma. Una conversación ya bloqueada sigue abriéndose para leer el historial; al intentar enviar, se explica que está bloqueada. Errores: otra cuenta inexistente o inactiva, sesión vencida o solicitud fallida; explicar el resultado sin revelar datos privados.

**Leer bandeja e historial (RF-CH03; CH-02–CH-04, CH-15).** Actor: participante autenticado. Entradas: sesión, ID de conversación y paginación. Resultado: bandeja e historial persistente en orden, o estado vacío; un tercero recibe denegación aunque conozca el ID. El bloqueo no impide a ninguno de los dos leer los mensajes anteriores que todavía tenga visibles (D-76, D-82). Cada participante podrá «Ocultar chat» de su propia bandeja sin borrar el historial ni ocultárselo al otro; si llega un mensaje nuevo, reaparece con el historial completo (D-79). «Borrar chat para mí» quita definitivamente de su vista los mensajes anteriores, sin quitarlos de la vista del otro participante ni de un reporte ya guardado. Si llegan mensajes nuevos, podrá volver a ver la conversación, pero no los mensajes que borró de su vista (D-82). Errores: falta de acceso, API inaccesible y reintento; un fallo al borrar conserva el historial y se explica en la misma pantalla.

**Enviar mensaje (RF-CH02; CH-02–CH-03).** Actor: participante autenticado y habilitado. Entradas: conversación y texto con contenido, de hasta 250 caracteres (D-79). Resultado: mensaje persistido y mostrado una sola vez, con estado de envío visible. Si la persona destinataria tiene la app cerrada, recibe una notificación del teléfono que dice «Nuevo mensaje de [nombre]», sin texto privado; si la tiene abierta, ve un aviso emergente dentro de Petzy. Un mensaje se muestra «Leído» cuando la destinataria abre la conversación y el mensaje aparece en pantalla. «En línea» se muestra solo mientras tenga Petzy abierta y conectada (D-81). Errores: texto vacío o demasiado largo, bloqueo vigente (D-76), cuenta destinataria desactivada, fallo de red o sesión vencida; conservar el texto y permitir reintento sin duplicar mensajes.

**Bloquear y desbloquear (RF-CH03; CH-06).** Cualquiera de los participantes podrá bloquear al otro desde la conversación. Si Ana bloquea a Luis, ninguno podrá enviar mensajes nuevos, pero ambos podrán leer el historial. Solo Ana podrá quitar el bloqueo que puso. Si Luis también bloqueó a Ana, la conversación seguirá sin aceptar mensajes hasta que ambos quiten sus respectivos bloqueos (D-76). Ana verá «Bloqueaste a esta persona» y «Desbloquear»; Luis verá «No puedes enviar mensajes», sin conocer por ese aviso quién puso el bloqueo (D-81). Petzy debe confirmar si cada acción se guardó o falló, sin perder la vista del historial.

**Reportar mensajes (RF-CH03; CH-07).** Desde una conversación, una persona podrá seleccionar los mensajes que considera inapropiados y guardar un reporte con una explicación opcional. Petzy almacenará el reporte en una tabla de la base y confirmará «Reporte guardado» cuando el servidor lo conserve; si falla, mantendrá la selección y el texto para reintentar. **Durante el MVP el equipo no tendrá manera de consultar, revisar ni resolver estos reportes.** Los administradores comunitarios tampoco podrán acceder a ellos por su rol. La futura revisión se definirá en un [sistema web separado](../FUTURO/DASHBOARD-WEB-PETZY.md) (D-77, D-86, D-87). El bloqueo entre participantes no suspende cuentas.

Aplican especialmente RNF-S01, RNF-S05–S06, RNF-I02 y RNF-Q01–Q02 de [01-PROYECTO.md](../01-PROYECTO.md).

## Decisiones confirmadas

- El primer alcance es conversación uno a uno.
- Solo los dos participantes pueden consultar la conversación o enviar mensajes.
- El historial debe persistir y reaparecer al iniciar sesión en otro momento, salvo los mensajes anteriores que cada participante borró de su propia vista según D-82.
- D-75: cualquier cuenta activa puede iniciar desde el perfil público de otra cuenta activa sin esperar invitación; Adopción reutilizará el mismo chat después.
- D-76: durante cualquier bloqueo no se envían mensajes en ningún sentido y ambos participantes pueden consultar el historial anterior; solo quien bloqueó puede quitar su propio bloqueo. D-81 define la presentación para cada participante.
- D-77, D-86 y D-87: la persona selecciona mensajes y, si quiere, añade una explicación; el MVP guarda el reporte en una tabla. El equipo no podrá consultarlo ni actuar sobre él hasta integrar la web futura.
- D-79: cada mensaje tiene máximo 250 caracteres; cada persona puede ocultar un chat de su propia bandeja sin borrar el historial y este reaparece al llegar un mensaje nuevo. Habrá notificación del teléfono con la app cerrada, aviso emergente dentro de la app cuando esté abierta e indicadores «Leído» y «En línea»; D-81 precisa su presentación. El plan definirá los detalles de entrega y reconexión.
- D-81: «Leído» requiere abrir y mostrar el mensaje; «En línea» requiere app abierta y conectada. Quien bloqueó ve la acción «Desbloquear»; la otra persona recibe un aviso genérico. La notificación del teléfono no muestra texto privado en pantalla bloqueada.
- D-82: «Borrar chat para mí» elimina definitivamente el historial anterior de la vista de quien lo solicita. El otro participante conserva sus mensajes y un reporte previo conserva la selección. Los mensajes nuevos pueden hacer reaparecer el chat, sin recuperar para quien borró el historial anterior.
- D-83 y D-87: el plan del MVP conserva datos de conversaciones, visibilidad por participante y reportes. Las tablas de personal y suspensiones quedan para el futuro sistema web.
- D-88: cada reporte guarda referencias a los mensajes originales elegidos, sin copiar su texto. Cada reporte y sus mensajes referenciados se conservan al menos hasta que el equipo revise ese reporte en la futura web; «Borrar chat para mí» no los elimina físicamente.
- D-78, D-80 y D-84–D-85 quedan fuera del MVP. La [propuesta web futura](../FUTURO/DASHBOARD-WEB-PETZY.md) conserva esas decisiones como antecedentes, sujetos a su propia especificación y aprobación.

## Flujos esperados

1. Una persona inicia o abre una conversación desde el perfil público de otra cuenta activa, sin invitación previa.
2. La bandeja muestra conversaciones recientes y permite abrir el historial paginado.
3. En el detalle, el usuario envía un mensaje de texto, ve el estado de envío y recibe los nuevos mensajes.
4. Un tercero que conoce el ID de la conversación no puede leer ni escribir mensajes.
5. Una vez integrado el chat, el acceso desde una publicación de adopción abre o inicia la conversación con quien publicó. Se muestra a esa persona, sin nombre personalizado para el chat.
6. Dentro de la conversación se ofrecen «Bloquear» y «Reportar conversación». El bloqueo detiene ambos envíos y conserva el historial; cada persona controla únicamente los bloqueos que puso. Para reportar, selecciona mensajes y puede añadir una explicación. Petzy guarda el reporte y lo confirma; en el MVP no hay revisión ni suspensión por ese reporte.
7. Cada participante puede «Ocultar chat» para sacarlo de su bandeja temporalmente o «Borrar chat para mí» para dejar de ver definitivamente los mensajes anteriores. Ninguna de las dos acciones elimina los mensajes de la otra persona.

## Criterios de aceptación

| ID | Resultado comprobable |
| --- | --- |
| CH-01 | Si Ana y Luis ya tienen una conversación y uno vuelve a iniciar contacto, se abre la misma conversación; no aparece otra con las mismas dos personas. |
| CH-02 | Solo Ana y Luis pueden leer o enviar mensajes en su conversación. Una tercera persona recibe una denegación aunque conozca su identificador o llame directamente a la API. |
| CH-03 | Cuando se envía un mensaje, aparece una sola vez. Al cerrar y volver a entrar a Petzy, el mensaje sigue en el historial salvo que ese participante haya usado «Borrar chat para mí» después de recibirlo. |
| CH-04 | Si hay muchos mensajes, se pueden cargar los anteriores por partes. La conversación conserva el orden y no repite ni omite mensajes al cargar más. |
| CH-05 | Una cuenta activa abre el chat desde el perfil público de otra cuenta activa, sin invitación y sin poder iniciar consigo misma. Adopción usará ese acceso después de que el chat funcione; si ya conversaban, se reutiliza la conversación. |
| CH-06 | Si Ana bloquea a Luis, ninguno puede enviar mensajes nuevos por la app ni directamente por la API, pero ambos pueden leer los anteriores. Solo Ana puede quitar su bloqueo; si Luis también bloqueó a Ana, los mensajes siguen suspendidos hasta que Luis quite el suyo. |
| CH-07 | Ana selecciona mensajes de su conversación con Luis y guarda un reporte con explicación opcional. La app confirma únicamente que se guardó; si falla, conserva la selección y lo escrito para reintentar. El reporte queda en la base, pero no existe acceso de personal para leerlo o revisarlo en el MVP. Solo se guardan los mensajes elegidos. |
| CH-08 | Un mensaje con texto que contenga al menos un carácter no vacío y no supere 250 caracteres puede enviarse; uno vacío, compuesto solo por espacios o de más de 250 se rechaza con explicación y conserva lo escrito. El servidor aplica el mismo límite aunque se llame directamente a la API. |
| CH-09 | Ana oculta una conversación de su propia bandeja y deja de verla allí; Luis sigue viéndola en la suya y el historial de ambos permanece guardado. Al llegar un nuevo mensaje para Ana, la conversación reaparece en su bandeja. Ocultar no elimina mensajes ni una denuncia ya enviada. |
| CH-11 | Al recibir un mensaje privado, Petzy muestra una notificación del teléfono si la app está cerrada o un aviso emergente dentro de la app si está abierta. La conversación ocultada por el destinatario reaparece en su bandeja. El plan definirá permisos del dispositivo y tratamiento de avisos fallidos o duplicados. |
| CH-12 | «Leído» solo aparece tras abrir la conversación y mostrar el mensaje a la persona destinataria. «En línea» solo se muestra mientras tiene Petzy abierta y conectada; desaparece cuando deja de cumplir ambas condiciones. Un tercero no obtiene estos estados privados por una ruta directa. |
| CH-13 | Quien bloqueó ve «Bloqueaste a esta persona» y puede usar «Desbloquear»; la otra persona ve «No puedes enviar mensajes» sin que el aviso revele quién puso el bloqueo. Ambos conservan el historial anterior. |
| CH-14 | La notificación del teléfono identifica que llegó un mensaje y el nombre público de quien lo envió, pero no incluye el texto del mensaje en la pantalla bloqueada. Al tocarla, Petzy comprueba sesión y permiso antes de abrir el chat. |
| CH-15 | Ana elige «Borrar chat para mí» y confirma la acción. Todos los mensajes anteriores de esa conversación dejan de aparecer en su bandeja e historial, incluso si abre de nuevo la conversación o llega un mensaje nuevo. Luis conserva su historial completo y un reporte previo conserva los mensajes seleccionados. Solo un participante puede borrar su propia vista; si la solicitud falla, el historial de Ana no cambia y Petzy muestra el error. |

Los identificadores CH-10 y CH-16 se retiraron del MVP por D-86. Se conservan como referencias históricas para la futura especificación web y no se prueban para cerrar Chat.

## Siguiente paso documental

El usuario confirmó en D-87 que la opción de reportar y el almacenamiento en tabla sí pertenecen al MVP. La ficha, el [plan técnico de Chat](07-CHAT-PRIVADO/01-PLAN.md) y sus [tareas](07-CHAT-PRIVADO/02-TAREAS.md) están aprobados; ninguna tarea se ha ejecutado. El contacto desde Adopción se integrará después del chat uno a uno. El acceso del personal, la revisión y las suspensiones tendrán especificación y aprobación propias junto al [sistema web futuro](../FUTURO/DASHBOARD-WEB-PETZY.md).

## Tecnología y estructura

La app usa Expo 57, React Native y TypeScript en `apps/mobile/app`; la API usa NestJS 11 y Prisma 7 en `apps/backend`. Aún no existen módulo, tablas ni pantallas de chat, por lo que sus rutas y ubicación exacta se fijan en un plan aprobado. Supabase Realtime se evaluará para entrega en vivo. Pruebas backend seguirán `*.spec.ts` y E2E en `apps/backend/test`.

## Comandos

Desde la raíz: `pnpm backend`, `pnpm mobile`, `pnpm backend:build`, `pnpm --filter proyecto-backend test --runInBand`, `pnpm --filter proyecto-backend test:e2e -- --runInBand` con entorno preparado y `pnpm --filter mobile lint`. Cualquier migración futura se ejecutará solo tras aprobar esquema y entorno.

## Estilo de código

TypeScript, DTO para entradas, clases `PascalCase`, propiedades `camelCase` y autorización en servidor. Patrón existente de identidad validada que debe conservarse:

```ts
const userId = request.user.id;
```

No crear conversaciones ni mensajes a nombre de un ID enviado por la app.

## Estrategia de pruebas

Unitarias para unicidad del par y orden de mensajes; E2E con tres cuentas para acceso permitido y denegado; pruebas de paginación, reenvío y persistencia; recorrido móvil con envío, error, reintento y sesión vencida. Definir qué significa «aparece una vez» frente a reintentos antes del plan.

La cobertura exigida para aprobar esta capacidad incluirá CH-01–CH-09 y CH-11–CH-15, con participantes y terceros; no se fija un porcentaje global de líneas.

## Límites de actuación

- **Siempre:** autorizar cada lectura y escritura por participantes, paginar historial y mantener mensajes persistentes.
- **Consultar antes:** tablas, columnas, política de inicio, bloqueo, retención, estados, notificaciones y proveedor de tiempo real.
- **Nunca:** exponer una conversación o reporte a terceros ni habilitar lectura administrativa o suspensiones en el MVP. No extender el alcance a chats grupales por inferencia.
