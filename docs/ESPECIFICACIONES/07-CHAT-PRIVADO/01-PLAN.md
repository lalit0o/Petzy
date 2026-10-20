# Plan técnico propuesto: Chat privado (`chat-privado`)

**Estado:** plan revisado y aprobado por el usuario el 10 de octubre de 2026, con el alcance de reportes aclarado por D-87; sin código ni migraciones. La [ficha funcional](../07-CHAT-PRIVADO.md) también está aprobada. **Alcance del MVP:** RF-CH01–CH03; CH-01–CH-09 y CH-11–CH-15. CH-10 y CH-16 quedan fuera. El usuario pidió terminar la documentación antes de programar.

## Qué ocurrirá en Petzy

Una persona podrá abrir un chat desde el perfil de otra, intercambiar mensajes de hasta 250 caracteres y volver a verlos después. Podrá bloquear el envío en ambos sentidos, ocultar una conversación de su bandeja o dejar de ver definitivamente sus mensajes anteriores sin afectar el historial de la otra persona. Al recibir un mensaje habrá un aviso en la app abierta o una notificación del teléfono con la app cerrada; también se mostrarán «Leído» y «En línea» según la ficha.

En este MVP también aparecerá «Reportar conversación». La persona elegirá mensajes, podrá explicar el motivo y Petzy guardará el reporte en una tabla; confirmará «Reporte guardado» solo tras recibir respuesta del servidor. Si falla, conservará la selección y el texto. **El equipo aún no tendrá acceso para revisarlo ni podrá suspender cuentas.** El bloqueo afecta únicamente los mensajes entre dos personas: si Ana bloquea a Luis, ninguno puede escribirle al otro mientras exista ese bloqueo, pero ambos conservan acceso a su historial. La lectura administrativa y las medidas se diseñarán con el [sistema web del equipo](../../FUTURO/DASHBOARD-WEB-PETZY.md) (D-87).

## Estado actual y dependencias

El checkout no contiene modelos `Conversation` o `Message`, módulo de chat ni pantallas de chat. El backend usa NestJS, Prisma y PostgreSQL; la app usa Expo. Supabase Auth aporta la identidad, y el servidor debe comprobar la cuenta activa y el perfil completo antes de permitir el chat. Los contratos de Cuenta y Perfiles se integrarán al implementar. Adopción reutilizará después la acción de abrir conversación.

## Datos propuestos para el MVP

Las migraciones se diseñarán y ejecutarán solo cuando se autorice código. D-83 aprobó registrar conversaciones, visibilidad por participante, bloqueos, reportes y dispositivos; D-87 confirma que la tabla de reportes pertenece al MVP. Los registros nuevos comenzarían vacíos, pues la app no está desplegada ni tiene datos reales de usuarios.

| Dato | Contenido y razón |
| --- | --- |
| `Conversation` | Identificador y par único de cuentas. Evita conversaciones duplicadas. Índices para buscar las conversaciones de cada participante. |
| `Message` | Conversación, remitente, texto y fecha. El servidor valida participación, cuenta activa y máximo 250 caracteres; usa orden estable por fecha e ID. |
| Estado de cada participante | Última lectura, ocultación temporal de la bandeja y punto desde el que «Borrar chat para mí» deja de mostrar mensajes anteriores. El historial compartido permanece guardado para la otra persona. |
| Bloqueo | Quién bloqueó a quién y fecha. Un bloqueo de cualquiera detiene mensajes nuevos en ambos sentidos; solo su autor lo retira. |
| `ChatReport` y `ChatReportMessage` | `ChatReport` guardará ID, conversación, autor del reporte, otra persona, fecha y explicación opcional. `ChatReportMessage` guardará por cada mensaje elegido el ID del reporte y el ID del mensaje original, con una combinación única; **no duplicará el texto** (D-88). Ambos registros se crean juntos. Los IDs de mensaje referenciados permanecerán válidos aunque quien reportó use «Borrar chat para mí». No habrá estado de revisión ni acceso del equipo en el MVP. |
| Dispositivos para avisos | Referencia revocable al teléfono que aceptó notificaciones, asociada a su dueño. El servidor evita incluir texto privado en avisos externos. |

El plan del MVP **sí añade las tablas necesarias para guardar un reporte y sus referencias a mensajes**, pero **no añade** `PetzyStaff`, `AccountSuspension` ni `User.suspendedUntil`, ni API o permisos de lectura y revisión administrativa. Las tablas nuevas comienzan vacías. `ChatReport.id`, `ChatReport.conversationId`, `ChatReport.reporterId`, `ChatReport.reportedUserId` y `ChatReport.createdAt` serán obligatorios; la explicación será un texto opcional. `ChatReportMessage.reportId` y `ChatReportMessage.messageId` serán obligatorios y formarán una combinación única. Los tipos exactos de los IDs seguirán los modelos `Conversation`, `Message` y `User` aprobados en la misma migración, sin convertir un ID de Supabase en número. Afecta a Chat, su API y la futura web de revisión. D-88 acuerda conservar cada reporte y sus mensajes referenciados al menos hasta que el equipo revise ese reporte en el futuro dashboard; no habrá borrado automático antes de esa revisión. La política posterior a la revisión y el acceso futuro del personal se definirán en la especificación web.

## Operaciones y permisos propuestos

Las rutas exactas aún no son contrato aprobado. Se proponen `GET/POST /conversations`, `GET /conversations/:id/messages`, `POST /conversations/:id/messages` y `POST /conversations/:id/reports`, además de operaciones de bloqueo, lectura, ocultación y borrado de la vista propia. Cada solicitud usa la identidad del token validado; el cliente no elige autor ni dueño. El servidor comprueba que la persona participa en la conversación antes de leer, enviar, modificar su propia vista o reportar.

Al guardar un reporte, la API comprobará que cada mensaje seleccionado pertenece a la conversación y era visible para quien reporta. Guardará reporte y referencias a mensajes originales juntos o no guardará ninguno. La app confirmará solo el guardado. «Borrar chat para mí» no elimina físicamente los mensajes originales referenciados; así el reporte sigue completo hasta su futura revisión (D-88). El MVP no tendrá rutas para que el personal lea o revise reportes; un rol comunitario tampoco dará acceso. La futura API web necesitará permisos propios.

Las conversaciones y los mensajes se paginarán con orden estable. Un mensaje llevará un identificador de solicitud para que un reintento tras falla de red no lo duplique. La app mostrará espera, éxito, error y reintento, y no borrará texto ni selección ante un error. Para «Borrar chat para mí», se guardará el corte de visibilidad por participante sin borrar mensajes del otro ni los ya seleccionados en reportes.

## Entrega en vivo y avisos

Evaluar Supabase Realtime para mensajes, presencia y cambios de lectura antes de añadir otro transporte. La base y la API siguen siendo la fuente de verdad: tras reconectar, la app consulta de nuevo bandeja e historial. «Leído» se marca solo cuando el destinatario abrió la conversación y el mensaje se mostró. «En línea» requiere app abierta y conectada; desaparece al perder conexión. El acceso a estas señales se limita a participantes.

La notificación del teléfono dirá que llegó un mensaje y quién lo envió, sin mostrar su contenido privado. Si la app está abierta, mostrará un aviso interno. Al tocar una notificación, la app verificará la sesión y el permiso antes de abrir el chat. Un fallo de aviso no deshace un mensaje ya guardado.

## Verificación y secuencia

1. La [lista CH-T01–CH-T15](02-TAREAS.md) ya fue aprobada por el usuario; esperar autorización posterior para implementarla, una vez terminada la documentación del proyecto.
2. En implementación futura, crear datos y controles de acceso; comprobar con dos participantes y una tercera cuenta que nadie ajeno lee chats ni reportes.
3. Verificar envío, reintento sin duplicados, paginación, bloqueo en ambos sentidos, ocultación temporal, borrado solo de la vista propia, lectura y presencia.
4. Verificar que un reporte conserva solo los mensajes seleccionados, confirma guardado sin prometer revisión, permite reintento ante error y no ofrece lectura administrativa. Verificar también avisos con app abierta/cerrada, reconexión y sesión vencida. Registrar evidencia para CH-01–CH-09 y CH-11–CH-15.

No se implementará código hasta que el usuario lo autorice expresamente después de terminar la documentación.
