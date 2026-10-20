# Plan técnico propuesto: Eventos (`eventos`)

**Estado:** plan técnico aprobado por el usuario el 10 de octubre de 2026; la [ficha funcional](../09-EVENTOS.md) y los datos D-115–D-116 también están aprobados. Sustituye el registro histórico que describía archivos ausentes en este checkout. No crea tablas ni autoriza programar. Eventos corresponde a la etapa posterior al MVP.

## Qué hará Petzy

El organizador elige un punto en el mapa, escribe el lugar y publica el encuentro con inicio y fin aproximado. Las personas autorizadas lo consultan desde la comunidad; solo los miembros confirman «Iré» o «No iré» antes del inicio. Al comenzar, se cierra la asistencia y se fija el total de confirmaciones. El encuentro pasa por «Próximos», «En curso» y «Eventos anteriores». Los cambios importantes y la cancelación generan avisos guardados dentro de Petzy y, si hay permiso, una notificación del teléfono.

## Dependencias y estado actual

Hay modelos `Community` y `CommunityMember`, pero no se observan API de comunidades ni modelos, migración, API o pantallas de Eventos en este checkout. Se integrarán primero las reglas ya aprobadas de cuentas activas, membresías, roles y expulsiones. El registro de dispositivos previsto para Chat se reutilizará para las notificaciones del teléfono. Ninguna migración histórica de Eventos está presente ni se ha comprobado en una base conectada.

## Datos aprobados para este plan — D-115 y D-116

Una futura migración añadirá tres tablas vacías. No modificará publicaciones ni filas actuales de usuarios o comunidades. Antes de ejecutarla se verificará la conexión `DATABASE_URL` y el estado de las migraciones.

| Campo | Tipo y regla propuesta |
| --- | --- |
| `Event.id`, `communityId`, `creatorId` | ID `Int` autogenerado; relación obligatoria `Int` con `Community` y `String` con `User`. El creador se toma del token validado. |
| `Event.title`, `description`, `placeLabel` | `String` obligatorios con texto; máximos de 120, 3 000 y 200 caracteres (D-114). |
| `Event.latitude`, `longitude` | `Decimal` obligatorios; punto elegido en mapa, con latitud entre -90 y 90 y longitud entre -180 y 180. |
| `Event.startsAt`, `endsAt`, `timeZone` | `DateTime` obligatorios en UTC para inicio y fin aproximado, más zona horaria `String` obligatoria. El fin debe ser posterior al inicio y puede caer en otro día. |
| `Event.coverImagePath` | `String?`, vacío si no hay portada; es referencia privada, no URL pública. |
| `Event.status` | `PUBLISHED` o `CANCELLED`, obligatorio; valor inicial `PUBLISHED`. |
| `Event.confirmedCountAtStart` | `Int?`, vacío antes de iniciar; luego guarda el total de «Iré» vigentes al inicio. Una cancelación oculta el total en la app, sin borrar el dato ya fijado. |
| `Event.createdAt`, `updatedAt` | `DateTime` obligatorios para orden y cambios. |
| `EventAttendance.eventId`, `userId` | `Int` y `String` obligatorios, combinación única por persona y evento. |
| `EventAttendance.status`, `respondedAt`, `invalidatedAt` | `GOING` o `NOT_GOING` y fecha de respuesta obligatorios; `invalidatedAt DateTime?` registra cuándo dejó de valer al salir, ser expulsada o desactivar su cuenta. |
| `EventNotice.id`, `eventId`, `recipientId` | ID `Int` autogenerado, evento `Int` y destinatario `String`, obligatorios. |
| `EventNotice.kind`, `summary`, `createdAt` | Tipo, resumen breve generado por el servidor y fecha, obligatorios. |
| `EventNotice.readAt`, `pushSentAt`, `changeKey` | Fechas opcionales de lectura y envío; clave `String` obligatoria. La combinación `(recipientId, changeKey)` es única para evitar el mismo aviso dos veces. |

Índices previstos: eventos por comunidad, estado e inicio o fin; respuestas por evento y estado; avisos por destinatario y fecha. `EventAttendance` no expone una lista nominal de asistentes. Las tres tablas comienzan vacías, por lo que no necesitan valores de relleno para registros anteriores.

## Asistencia y total histórico

Antes del inicio, el conteo incluye respuestas `GOING` vigentes de miembros con cuenta activa. Salir, ser expulsado o desactivar la cuenta antes del inicio marca `invalidatedAt`; al reingresar o reactivar la cuenta, la persona debe confirmar otra vez antes del inicio (D-71, D-117). La reactivación conserva su membresía, pero no reactiva automáticamente su respuesta. El servidor comprueba membresía, actividad de la cuenta, horario y estado del evento en cada solicitud.

Al llegar `startsAt`, una operación transaccional fija `confirmedCountAtStart` una sola vez. Una tarea programada lo intenta a la hora prevista y la primera consulta posterior puede completarlo si hubo retraso. El cálculo compara `respondedAt` e `invalidatedAt` con `startsAt`: una salida o desactivación anterior excluye y una posterior no cambia el total. Las operaciones concurrentes de respuesta, salida, desactivación e inicio se serializarán por evento para que el valor de la frontera sea consistente. La respuesta propia permanece legible después, pero ya no puede cambiarse. El número indica intención confirmada, no presencia física.

## API y permisos propuestos

NestJS y Prisma serán la ruta de acceso para aplicar las reglas de Comunidad. Las siguientes rutas **no existen hoy**. Toda ruta deriva la identidad del token y comprueba cuenta activa y expulsión; el acceso por ID directo mantiene las mismas reglas que la lista.

| Ruta propuesta | Resultado y control |
| --- | --- |
| `GET /communities/:communityId/events?section=upcoming|ongoing|past&cursor=...` | Tarjetas de una comunidad, con orden estable y páginas de 20, máximo 30. Cuenta activa no expulsada, miembro o no. `past` incluye de inmediato los cancelados, con etiqueta «Cancelado» y sin total, aunque su horario aún no haya pasado (D-118). |
| `POST /communities/:communityId/events` | Solo `ADMIN` o `MODERATOR` vigente. El servidor valida textos, horario, zona y punto; el cliente no elige `creatorId`. |
| `GET /events/:id` | Detalle, respuesta propia y total permitido; un cancelado conserva detalle con estado visible y sin total. |
| `PATCH /events/:id` | Creador **que sigue siendo miembro** o `ADMIN` vigente: antes del inicio puede cambiar horario; durante el encuentro puede corregir texto, lugar, portada y fin aproximado, pero no inicio. Después del fin o cancelación no edita. |
| `POST /events/:id/cancel` | Creador aún miembro o `ADMIN` vigente antes del fin aproximado; conserva respuestas y crea avisos una sola vez. El cancelado pasa a `past` de inmediato. |
| `PUT /events/:id/attendance` | Miembro activo antes del inicio. Rechaza evento comenzado o cancelado, no miembro y persona expulsada. |
| `GET /events/:id/cover` | Entrega foto privada tras comprobar sesión, cuenta y visibilidad; sin URL pública ni caché compartida. |
| `GET /me/event-notices?cursor=...`, `PATCH /me/event-notices/:id/read` | Solo el destinatario consulta y marca avisos. La lista oculta avisos de comunidades de las que fue expulsado; abrir uno vuelve a comprobar acceso al evento. |

La API distinguirá sesión vencida, falta de permiso, evento inexistente, texto u horario inválidos, asistencia cerrada y error temporal. La app mostrará espera, éxito, error y reintento junto a la acción, sin borrar lo escrito ni duplicar un envío.

## Mapa y portada

El formulario deja colocar y ajustar un marcador; la persona no escribe coordenadas. El detalle conserva siempre el lugar escrito si el mapa no carga. Se propone `react-native-maps`, cuya compatibilidad y configuración se verificarán con la [guía oficial para Expo 57](https://docs.expo.dev/versions/v57.0.0/sdk/map-view/) antes de instalarlo. La búsqueda automática de direcciones queda fuera de esta primera versión; «Cómo llegar» abre la app de mapas del teléfono.

La portada acepta JPEG, PNG o WebP hasta 5 MB. El servidor la guarda en Supabase Storage privado y solo almacena una referencia interna. Al reemplazarla, primero valida y guarda la nueva; si falla, conserva foto y formulario anteriores. El archivo sin referencia se limpia después de confirmar el cambio. En cada lectura de la foto se comprueban sesión, cuenta activa y permiso para ver el evento.

## Avisos y reintentos

Cambiar inicio, fin aproximado o lugar, o cancelar, crea `EventNotice` para cada persona con «Iré» vigente y acceso permitido. Se guardan con el cambio del evento en una sola operación de base. Un cambio solo de título, descripción o portada no crea aviso. Al abrir la app, la persona puede leer los avisos guardados aunque no haya recibido una notificación del teléfono. Si después fue expulsada de la comunidad, la lista no le revela avisos anteriores de esa comunidad mientras dure el bloqueo (D-70). Se reutilizará el registro de dispositivos de Chat; sin permiso de teléfono, el aviso interno permanece. Se verificará `expo-notifications` con la [documentación de Expo](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/) durante la implementación.

La app enviará una clave de solicitud para cada cambio de horario, lugar o cancelación y conservará esa clave al reintentar. El servidor derivará de ella `changeKey`; una repetición no volverá a crear avisos ni a aplicar una segunda cancelación. Un proceso entrega las notificaciones del teléfono y marca `pushSentAt` al confirmar el envío; si falla, conserva la fila pendiente para reintentar sin recrearla. El cambio del evento no se deshace si falla la notificación. El aviso muestra un resumen breve; al tocarlo se vuelve a comprobar el permiso antes de abrir el detalle. Se probarán app abierta y cerrada, permiso denegado, dispositivo revocado y red fallida. Si el proveedor no confirma si recibió un envío, el proceso consultará su comprobante cuando exista antes de repetirlo para reducir el riesgo de una notificación duplicada en el teléfono; véase la [guía oficial de envío de Expo](https://docs.expo.dev/push-notifications/sending-notifications/). Los avisos se insertarán por lotes, con índice por destinatario. En una prueba con muchos «Iré» se medirán filas, consultas y tiempo; el procesamiento no hará una consulta de base por destinatario.

## Orden y comprobación futura

1. Integrar Comunidad, cuentas activas y registro compartido de dispositivos; verificar roles y expulsiones.
2. Crear y revisar la migración de las tres tablas, relaciones e índices, sin asumir una migración histórica aplicada.
3. Implementar API y probar horario, zona, cruce de medianoche, permisos, cierre exacto de asistencia, salida, reingreso, desactivación/reactivación, creador que salió y total fijado una sola vez.
4. Implementar mapa, foto privada, tarjetas, formulario y detalle con estados de espera, vacío, error y reintento; probar en Android e iOS.
5. Integrar avisos, entrega al teléfono y deduplicación; comprobar cambios y cancelación con la app abierta o cerrada.
6. Verificar CE-01–CE-10 con administrador, moderador, miembro, no miembro y persona expulsada, incluido acceso por enlace directo.

Cuando exista implementación, ejecutar `prisma validate`, compilación del backend, pruebas unitarias y E2E, lint móvil y recorrido en dispositivo. Hoy no hay resultados que acrediten esas verificaciones. La [lista EV-T01–EV-T20](02-TAREAS.md) deriva de este plan aprobado y también fue aprobada por el usuario el 10 de octubre de 2026; ninguna tarea está ejecutada. **No empezar código antes de la autorización posterior del usuario.**
