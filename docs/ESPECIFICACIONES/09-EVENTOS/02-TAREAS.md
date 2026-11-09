# Tareas propuestas: Eventos (`eventos`)

**Estado:** lista EV-T01–EV-T20 aprobada por el usuario el 10 de octubre de 2026; parte 1 implementada el 8-11-2026 (ver el estado de cada tarea); parte 2 pendiente. Deriva de la [ficha funcional aprobada](../09-EVENTOS.md), el [plan técnico aprobado](01-PLAN.md), RF-E01–RF-E04, CE-01–CE-10 y D-05, D-09, D-70–D-71, D-99–D-119. Eventos pertenece al MVP, integrado en Comunidades (D-144); estas tareas aparecen también en [las de Comunidades](../06-COMUNIDADES/02-TAREAS.md#eventos-dentro-de-comunidades-mvp--d-144). El usuario pidió terminar la documentación antes de programar: estas casillas no autorizan código ni migraciones.

## Orden de implementación (D-144, confirmado el 8-11-2026)

Eventos se implementa en dos partes: la **parte 1** (EV-T01–EV-T13 y EV-T15–EV-T17: tablas, permisos, crear, listar, mapa, asistencia, portada, edición, cancelación y avisos guardados en la base, sin envío al teléfono) va **justo después de cerrar Comunidades y antes de Chat**; la **parte 2** (EV-T14 avisos al teléfono y EV-T18 avisos dentro de la app, que dependen de CH-T11 y CH-T14 de Chat, y el cierre EV-T19–EV-T20) va **después de Adopción**. EV-T01 compara el punto de partida con el estado real de Chat en ese momento. Las casillas no autorizan código: se necesita autorización explícita antes de empezar.

## Qué se hará, en orden

1. Comprobar el estado real de Comunidad, Cuenta, Perfiles y Chat; después preparar las tres tablas aprobadas.
2. Aplicar permisos del servidor y crear listas, detalle, asistencia y total histórico.
3. Guardar la foto de forma privada, permitir cambios y cancelación, y entregar avisos sin duplicarlos.
4. Construir pantallas móviles para mapa, eventos, asistencia y avisos.
5. Verificar los diez criterios de la ficha y actualizar el estado de los documentos con evidencia real.

Cada tarea describe un resultado futuro. Los archivos citados son previsiones, no prueba de que ya existan.

## Trabajo técnico y comprobación

- [x] **EV-T01. Confirmar el punto de partida y las dependencias.** Depende de: ninguna. Prepara CE-01–CE-10.
  - **Estado, 8-11-2026:** Inspección hecha: había `Community`, `CommunityMember`, roles, `CommunityExpulsion`, desactivación con `serializableTransaction` y `CommunityAccessService`; no había modelos, rutas ni pantallas de Eventos. **Chat no existe todavía**: no hay registro de teléfonos (CH-T11), por eso EV-T14 y EV-T18 van en la parte 2. La base de desarrollo tenía las 11 migraciones previas aplicadas.
  - **Aceptación:** se inspeccionan esquema, migraciones, sesión, `Community`, `CommunityMember`, roles, expulsiones, desactivación de cuenta, registro de teléfonos de Chat y navegación móvil. Se anota qué existe en el checkout y si alguna base conectada tiene datos de prueba; si no se puede consultar, se escribe «sin verificar». No se toman las antiguas filas «Hecha» como evidencia de Eventos implementado.
  - **Verificar:** cotejar código y [ruta de desarrollo](../../00-RUTA-DE-DESARROLLO.md), [API](../../05-API.md), [datos](../../04-DATOS-Y-PERMISOS.md) y planes de Comunidades/Chat; inspección de solo lectura.
  - **Archivos previstos:** `apps/backend/prisma/schema.prisma`, `apps/backend/src/community/`, `apps/backend/src/auth/`, `apps/mobile/app/` y este plan, solo para inspección.

- [x] **EV-T02. Crear el esquema y la migración de Eventos.** Depende de: EV-T01. Cubre CE-01–CE-02, CE-05, CE-07–CE-09; D-115–D-116.
  - **Estado, 8-11-2026:** Migración `20261109120000_community_events` (tres tablas vacías, enums `EventStatus`, `EventAttendanceStatus` y `EventNoticeKind` = `CHANGED`/`CANCELLED`, índices y unicidades del plan). Aplicada a PostgreSQL aislado y a la base de desarrollo (Supabase) el 8-11-2026; `prisma validate` y `migrate diff` sin diferencias salvo el `PostView` previo sin migración.
  - **Aceptación:** migración versionada crea `Event`, `EventAttendance` y `EventNotice` con los tipos, nulabilidad, valores iniciales, relaciones, índices y unicidades del plan. `endsAt` es obligatorio; `confirmedCountAtStart`, `invalidatedAt`, `readAt` y `pushSentAt` comienzan vacíos. Las tres tablas empiezan sin filas; no alteran `Post` ni inventan eventos antiguos.
  - **Verificar:** revisar SQL y `DATABASE_URL` antes de aplicarla; en un entorno de prueba autorizado ejecutar `pnpm --filter proyecto-backend exec prisma validate`, generación del cliente y prueba de migración. Comprobar unicidad de respuesta por persona/evento y de aviso por destinatario/cambio.
  - **Archivos previstos:** `apps/backend/prisma/schema.prisma`, nueva carpeta en `apps/backend/prisma/migrations/` y prueba de restricciones en `apps/backend/test/`.

- [x] **EV-T03. Reutilizar el permiso de Comunidad para cada operación.** Depende de: EV-T02 y CO-T03, CO-T07–CO-T09, CU-T04, PE-T07 y PE-T10 integradas. Cubre CE-01–CE-02, CE-06–CE-07; D-70, D-119.
  - **Estado, 8-11-2026:** Permisos en `src/event/event.service.ts` reutilizando `CommunityAccessService`: leer = cuenta activa no expulsada; crear = ADMIN/MODERATOR; gestionar = creador aún miembro o ADMIN. Probado con cada rol, no miembro, expulsado, creador que salió e ID directo. Evidencia automática: `test/events.e2e-spec.ts` (9 pruebas HTTP contra PostgreSQL aislado) y `src/event/event-rules.spec.ts` (6 unitarias); suite completa 84/84 HTTP y 115/115 unitarias.
  - **Aceptación:** un control compartido distingue cuenta activa, comunidad visible, expulsión, membresía y rol. Una cuenta no expulsada puede leer eventos sin unirse; solo `ADMIN`/`MODERATOR` crean; solo un creador que aún es miembro o un `ADMIN` vigente gestiona. Un excreador que salió no puede editar por conocer el ID. La app nunca decide el permiso por un botón oculto.
  - **Verificar:** pruebas directas con administrador, moderador, miembro, no miembro, creador que salió, expulsado, cuenta inactiva y token vencido, también por ID de evento; `pnpm --filter proyecto-backend test -- --runInBand`.
  - **Archivos previstos:** servicio/guard en `apps/backend/src/event/`, control compartido de `apps/backend/src/community/` y pruebas en `apps/backend/test/`.

- [x] **EV-T04. Crear encuentros con datos válidos.** Depende de: EV-T02–EV-T03. Cubre CE-01–CE-04; D-99, D-104, D-107, D-114.
  - **Estado, 8-11-2026:** `POST /communities/:communityId/events` (JSON o multipart con `photo`). Rechaza textos vacíos o largos, inicio pasado, fin no posterior, zona inválida, coordenadas fuera de rango y `creatorId` del cliente; permite terminar otro día; una portada inválida no crea filas.
  - **Aceptación:** `POST /communities/:communityId/events` exige título hasta 120, descripción hasta 3 000, lugar hasta 200, inicio futuro, fin aproximado posterior, zona horaria y punto válido. Permite terminar otro día y portada vacía. Obtiene creador del token y relaciona solo esa comunidad; no acepta coordenadas fuera de rango ni un `creatorId` elegido por el cliente. Un rechazo no crea filas parciales.
  - **Verificar:** E2E con los tres roles, otra comunidad, texto vacío/largo, fecha pasada, cruce de medianoche, zona horaria y coordenadas inválidas; `pnpm --filter proyecto-backend test:e2e`.
  - **Archivos previstos:** controlador, servicio y DTO en `apps/backend/src/event/`, registro en `apps/backend/src/app.module.ts` y prueba en `apps/backend/test/`.

- [x] **EV-T05. Listar y abrir eventos en la sección correcta.** Depende de: EV-T03–EV-T04. Cubre CE-02–CE-03, CE-06, CE-09–CE-10; D-105, D-112, D-118.
  - **Estado, 8-11-2026:** `GET /communities/:id/events?section=upcoming|ongoing|past&cursor&limit` y `GET /events/:id`. Orden estable (próximos/en curso por inicio; anteriores por fin descendente), 20 por defecto y 30 máximo, cursor validado. Cancelados en anteriores sin total. Sin ruta interna de portada ni lista nominal.
  - **Aceptación:** `GET /communities/:id/events` separa `upcoming`, `ongoing` y `past` con cursor y orden estables, 20 por defecto y máximo 30. Al inicio el evento pasa a «En curso»; al fin aproximado pasa a «Eventos anteriores». Un cancelado pasa a `past` de inmediato, con etiqueta y sin total. El detalle y la lista niegan eventos de otra comunidad o de una comunidad que expulsó a la persona; no entregan ruta interna de portada ni lista nominal de asistentes.
  - **Verificar:** E2E con más de 30 eventos, horarios idénticos, medianoche, cancelación futura/en curso, cambio de página, ID directo, no miembro y expulsado; `pnpm --filter proyecto-backend test:e2e`.
  - **Archivos previstos:** lecturas y DTO en `apps/backend/src/event/`, pruebas en `apps/backend/test/`.

- [x] **EV-T06. Guardar una sola respuesta de asistencia por persona.** Depende de: EV-T03–EV-T04. Cubre CE-05–CE-06; D-09, D-106.
  - **Estado, 8-11-2026:** `PUT /events/:id/attendance` con bloqueo por evento: una fila por persona, cambio en ambos sentidos, envíos simultáneos sin duplicar; rechaza no miembro (403), expulsado (404), evento iniciado o cancelado (409).
  - **Aceptación:** `PUT /events/:id/attendance` permite a un miembro activo marcar o cambiar «Iré»/«No iré» solo antes de `startsAt`. Actualiza su fila única y `respondedAt`, sin duplicados ante dos solicitudes simultáneas. La respuesta y el conteo visibles se actualizan; no miembro, expulsado, cuenta inactiva y evento iniciado o cancelado son rechazados por el servidor.
  - **Verificar:** E2E con cambios en ambos sentidos, envíos simultáneos, cuenta sin mascota, instante anterior/exacto/posterior al inicio, cancelación y acceso directo; `pnpm --filter proyecto-backend test:e2e`.
  - **Archivos previstos:** controlador, servicio, DTO y pruebas en `apps/backend/src/event/` y `apps/backend/test/`.

- [x] **EV-T07. Invalidar respuestas al salir, expulsar o desactivar cuenta.** Depende de: EV-T06, CO-T07–CO-T09, PE-T06–PE-T07 integradas. Cubre CE-05, CE-08; D-71, D-117.
  - **Estado, 8-11-2026:** `invalidateFutureAttendance` (`src/event/event-attendance.ts`) se ejecuta dentro de la misma transacción al salir, ser expulsada y desactivar la cuenta. Volver o reactivar no revive la respuesta. Probado con salida, expulsión, desactivación y reingreso.
  - **Aceptación:** la salida, expulsión o desactivación marca `invalidatedAt` de respuestas futuras en la misma operación coherente con el cambio de membresía/cuenta. Si la persona regresa o reactiva antes del inicio, conserva la membresía que corresponda pero no recupera «Iré» automáticamente: debe responder otra vez. Una salida posterior al inicio no cambia el total histórico.
  - **Verificar:** pruebas con salida, expulsión, desbloqueo, reingreso, desactivación/reactivación y fallo de transacción; comprobar que nunca queda una respuesta vigente de una cuenta inactiva; `pnpm --filter proyecto-backend test:e2e`.
  - **Archivos previstos:** integración en `apps/backend/src/community/`, `apps/backend/src/user/` o módulo de Perfiles, servicio de `apps/backend/src/event/` y pruebas en `apps/backend/test/`.

- [x] **EV-T08. Fijar el total histórico una sola vez al comenzar.** Depende de: EV-T06–EV-T07. Cubre CE-05, CE-08–CE-10; D-109.
  - **Estado, 8-11-2026:** `EventStartService.freezeDue`: sentencia atómica que fija `confirmedCountAtStart` una sola vez (dos intentos simultáneos escriben una vez). Tarea cada 30 s más recuperación en cada lectura. Salir después del inicio no cambia el total.
  - **Aceptación:** una tarea programada y una recuperación al consultar fijan `confirmedCountAtStart` con respuestas «Iré» válidas al instante de inicio, una sola vez. Salidas o desactivaciones antes del inicio se excluyen; posteriores no lo alteran. Dos procesos concurrentes no sobrescriben el total. Un cancelado oculta ese número aunque ya exista internamente.
  - **Verificar:** pruebas de frontera temporal, dos intentos simultáneos, proceso programado retrasado, salida/desactivación antes y después, y cambio previo de horario; `pnpm --filter proyecto-backend test -- --runInBand` y E2E.
  - **Archivos previstos:** servicio y tarea programada en `apps/backend/src/event/`, pruebas en `apps/backend/test/`.

- [x] **EV-T09. Guardar y reemplazar la portada privada.** Depende de: EV-T03–EV-T04. Cubre CE-03–CE-04, CE-07; D-102, D-110.
  - **Estado, 8-11-2026:** Implementado (`EventPhotoService`, bucket privado `event-covers` que se crea solo y sin acceso público la primera vez que hace falta). Probado con Storage simulado: formato real, archivo falso, sin permiso, reemplazo con limpieza de la anterior y quitar. Comprobado el 9-11-2026 en Supabase de desarrollo: la primera portada subida desde el teléfono creó `event-covers` con `public: false` y su URL pública sin sesión responde 400.
  - **Aceptación:** la portada opcional acepta solo JPEG, PNG o WebP reales de hasta 5 MB. Se guarda en bucket privado con nombre interno; el evento conserva `coverImagePath` sin publicarla. El creador aún miembro o `ADMIN` puede añadir, reemplazar o quitar dentro del plazo de edición. Si falla Storage o la base, se conserva la portada anterior y se limpia el archivo nuevo sin referencia.
  - **Verificar:** casos sin foto, tres formatos, tipo fingido, 5 MB excedidos, pérdida de permiso, fallo de Storage/base y sustitución; comprobar que el bucket no es público.
  - **Archivos previstos:** servicio de foto en `apps/backend/src/event/`, integración privada de Storage en `apps/backend/src/supabase/` si corresponde y pruebas en `apps/backend/test/`.

- [x] **EV-T10. Entregar portada solo con permiso vigente.** Depende de: EV-T05 y EV-T09. Cubre CE-02–CE-03, CE-06; D-70, D-102.
  - **Estado, 8-11-2026:** `GET /events/:id/cover` comprueba sesión, cuenta y expulsión en cada solicitud, con `Cache-Control: private, no-store`; expulsado recibe 404.
  - **Aceptación:** `GET /events/:id/cover` comprueba sesión, actividad y visibilidad de comunidad en cada solicitud. No entrega URL pública, referencia interna ni caché compartida. Una persona expulsada o con cuenta desactivada pierde acceso en la siguiente petición; si no hay foto, la app usa imagen de respaldo.
  - **Verificar:** API directa con miembro, no miembro, expulsado, cuenta inactiva, token vencido, evento de otra comunidad y evento sin foto; revisar encabezados y privacidad de Storage; `pnpm --filter proyecto-backend test:e2e`.
  - **Archivos previstos:** controlador y servicio en `apps/backend/src/event/`, pruebas en `apps/backend/test/`.

- [x] **EV-T11. Preparar avisos guardados y deduplicación.** Depende de: EV-T02–EV-T03. Cubre CE-07; D-101, D-116.
  - **Estado, 8-11-2026:** Avisos guardados en lote y en la misma transacción que el cambio, con `changeKey` derivado de la clave de solicitud; la unicidad impide repetirlos. `GET /me/event-notices` y `PATCH /me/event-notices/:id/read` solo para la persona destinataria; ocultos mientras esté expulsada. **Detalle de implementación:** quien hace el cambio no recibe aviso de su propia acción.
  - **Aceptación:** el servicio genera un `changeKey` a partir de la clave de solicitud y guarda un `EventNotice` por destinatario con «Iré» vigente, en lote y junto con el cambio del evento. La combinación de destinatario y cambio impide avisos repetidos. `GET /me/event-notices` pagina solo los avisos propios y oculta los de comunidades que expulsaron a la persona; marcar lectura afecta solo su fila.
  - **Verificar:** pruebas con varios destinatarios, reintento con la misma clave, distinta clave, no asistente, expulsado, fallo de transacción y lectura de aviso ajeno; `pnpm --filter proyecto-backend test:e2e`.
  - **Archivos previstos:** servicio/controlador de avisos en `apps/backend/src/event/`, pruebas en `apps/backend/test/`.

- [x] **EV-T12. Editar el evento según su horario y avisar cambios importantes.** Depende de: EV-T03–EV-T05, EV-T09 y EV-T11. Cubre CE-04, CE-07, CE-10; D-100–D-101, D-110, D-113–D-114.
  - **Estado, 8-11-2026:** `PATCH /events/:id`: antes del inicio cambia todo; en curso no cambia el inicio pero sí textos, lugar y fin futuro; después del fin o cancelado, 409. Solo horario o lugar generan aviso; reintento con la misma clave no duplica.
  - **Aceptación:** `PATCH /events/:id` deja corregir inicio y fin antes de comenzar; «En curso» deja corregir título, descripción, lugar, portada y fin aproximado futuro, pero no inicio. Después del fin o cancelación rechaza cambios. Cambio de horario o lugar guarda avisos a quienes mantienen «Iré»; cambiar solo texto o portada no avisa. Un error conserva los datos anteriores y un reintento no duplica avisos.
  - **Verificar:** E2E con creador miembro, creador que salió, `ADMIN`, `MODERATOR` ajeno, antes/durante/después, fin en otro día, textos fuera de límite, dos solicitudes repetidas y fallo de aviso; `pnpm --filter proyecto-backend test:e2e`.
  - **Archivos previstos:** controlador, servicio y DTO en `apps/backend/src/event/`, integración del servicio de avisos y pruebas en `apps/backend/test/`.

- [x] **EV-T13. Cancelar sin borrar historial ni repetir avisos.** Depende de: EV-T08, EV-T11–EV-T12. Cubre CE-05, CE-07, CE-09–CE-10; D-101, D-103, D-111, D-118.
  - **Estado, 8-11-2026:** `POST /events/:id/cancel`: creador aún miembro o ADMIN, hasta antes del fin. Conserva respuestas, oculta el total, pasa a anteriores y genera un solo aviso por persona; repetir no crea otro.
  - **Aceptación:** `POST /events/:id/cancel` funciona solo para creador aún miembro o `ADMIN` antes del fin aproximado. Cambia estado a `CANCELLED`, conserva respuestas, oculta total y bloquea nuevos cambios. La tarjeta pasa de inmediato a «Eventos anteriores»; el detalle conserva «Cancelado». Genera un aviso lógico por destinatario; repetir la cancelación no crea otro.
  - **Verificar:** E2E antes del inicio, en curso y después del fin; usuario ajeno, creador que salió, asistencia antes/después, listado, detalle y solicitud repetida; `pnpm --filter proyecto-backend test:e2e`.
  - **Archivos previstos:** controlador y servicio en `apps/backend/src/event/`, pruebas en `apps/backend/test/`.

- [ ] **EV-T14. Entregar avisos al teléfono y medir su volumen.** Depende de: EV-T11–EV-T13 y registro de dispositivos CH-T11 integrado. Cubre CE-07; D-101, D-116.
  - **Aceptación:** la entrega usa teléfonos autorizados, marca `pushSentAt` tras confirmación y deja pendiente lo fallido sin deshacer el evento. La app abierta puede leer el aviso guardado; sin permiso de teléfono no se envía push. No se consulta la base una vez por destinatario: se insertan avisos por lotes y se usa índice por destinatario. Una prueba con muchos confirmados registra tiempo, número de filas, consultas y plan de índices; si el volumen revela un cuello de botella, se corrige antes de marcar esta tarea completa.
  - **Verificar:** pruebas con push aceptado, denegado, token revocado, proveedor inaccesible y reintentos; carga sintética con 1 000 «Iré» y varios cambios, sin datos reales; comprobar que cada destinatario tiene un solo aviso lógico por cambio.
  - **Archivos previstos:** servicio de entrega en `apps/backend/src/event/`, integración compartida de dispositivos/avisos de Chat, pruebas en `apps/backend/test/`.

- [ ] **EV-T15. Mostrar listas, detalle y mapa en móvil.** Depende de: EV-T05, EV-T08, EV-T10 y detalle comunitario CO-T14. Cubre CE-02–CE-03, CE-06, CE-09–CE-10.
  - **Estado, 8-11-2026:** Implementado: sección «Eventos» en el detalle de comunidad (pestaña para miembros y bloque para quien no es miembro) con «En curso», «Próximos» y «Eventos anteriores», tarjetas, «Ver más eventos», error y «Reintentar» por sección; detalle `app/events/[id]/index.tsx` con portada o respaldo, lugar escrito antes del mapa (`react-native-maps` 1.29.11) y «Cómo llegar». `tsc`, lint y export iOS sin errores. **Pendiente del recorrido en teléfono.**
  - **Correcciones del recorrido físico, 9-11-2026:** el usuario probó el flujo completo (crear, listas, detalle, mapa, «Cómo llegar», asistencia, edición con aviso al otro participante y sin aviso a quien editó, cancelación) y lo dio por funcional en general, con dos ajustes visuales: la carga de la sección «Eventos» usaba un `ActivityIndicator` suelto en vez del esqueleto acordado en el documento de diseño (se agregó `EventListSkeleton`/`EventCardSkeleton`); y la descripción del evento se veía «perdida» al final del detalle, sin etiqueta, después del mapa — se movió a la misma tarjeta que el horario y el lugar, con ícono y la etiqueta «Descripción del evento». Detalle en [docs/06-DISENO-DE-INTERFACES.md, sección 0](../../06-DISENO-DE-INTERFACES.md#eventos--correcciones-del-recorrido-físico-9-11-2026). Confirmó también que el mapa del formulario arranca mostrando México y que el fin al día siguiente se acepta. Sigue pendiente registrar el cierre formal de EV-T15–EV-T17 y CO-T17 una vez que el usuario confirme estos dos ajustes en pantalla.
  - **Aceptación:** «Eventos» de una comunidad separa próximos, en curso y anteriores; muestra cancelados con etiqueta en anteriores. Las tarjetas abren detalle con lugar legible y marcador; si el mapa falla, el texto permanece. La portada protegida o imagen de respaldo, carga, vacío, error y «Reintentar» son visibles. La app retira datos de una comunidad si la persona fue expulsada.
  - **Verificar:** `pnpm --filter mobile lint`, `pnpm --filter mobile exec tsc --noEmit` y recorrido Android/iOS con más de una página, medianoche, mapa sin conexión, no miembro, expulsado y sesión vencida.
  - **Archivos previstos:** pantallas en `apps/mobile/app/`, componentes de mapa/tarjeta y consultas en `apps/mobile/hooks/` o servicio móvil.

- [ ] **EV-T16. Crear y editar desde el mapa en móvil.** Depende de: EV-T04, EV-T09, EV-T12 y EV-T15. Cubre CE-01, CE-04, CE-07; D-99, D-104, D-107, D-110, D-113–D-114.
  - **Estado, 8-11-2026:** Implementado: `components/event-form.tsx` (crear en `app/communities/[id]/events/create.tsx`, editar en `app/events/[id]/edit.tsx`) con título, descripción, inicio y fin aproximado (calendario nativo), zona del teléfono, lugar, punto que se toca o arrastra en el mapa y portada opcional; conserva lo escrito ante errores, clave de solicitud para reintentos y aviso al salir sin guardar. **Pendiente del recorrido en teléfono.**
  - **Aceptación:** solo roles autorizados ven «Crear evento». El formulario pide textos, inicio, fecha y hora aproximada de fin, zona, lugar y punto ajustable; portada opcional. Permite corregir lo autorizado antes y durante el evento, y explica que el fin puede variar. Al enviar muestra espera y confirma éxito tras el servidor; validación, mapa/API fallidos o pérdida de rol conservan lo escrito y permiten reintentar sin duplicar el envío.
  - **Verificar:** lint y TypeScript móvil; recorrido con fin al día siguiente, campos vacíos/largos, marcador ausente, foto inválida, pérdida de conexión, doble toque, cambio durante «En curso» y creador que salió.
  - **Archivos previstos:** formulario y edición en `apps/mobile/app/`, selector de mapa/foto y conexión API en `apps/mobile/hooks/` o servicio móvil.

- [ ] **EV-T17. Confirmar asistencia y gestionar cancelación en móvil.** Depende de: EV-T06–EV-T08, EV-T13 y EV-T15. Cubre CE-05–CE-10.
  - **Estado, 8-11-2026:** Implementado: «Iré»/«No iré» con espera, toast tras confirmación y «Reintentar respuesta»; total y respuesta propia; «Cancelar evento» con confirmación («Conservar evento»/«Cancelar evento»), toast y «Reintentar cancelación» con la misma clave. **Pendiente del recorrido en teléfono.**
  - **Aceptación:** un miembro ve su «Iré»/«No iré» y total actualizado antes del inicio. Al comenzar, los controles cierran; el total histórico permanece. El creador aún miembro o `ADMIN` ve «Cancelar» hasta el fin y recibe confirmación clara; un cancelado no muestra total ni permite responder. La app explica un rechazo por salida, expulsión, desactivación, plazo o pérdida de permiso sin fingir éxito.
  - **Verificar:** lint y TypeScript móvil; recorrido antes/en inicio/durante/después, cuenta reactivada, creador que salió, cancelación, API caída y sesión vencida.
  - **Archivos previstos:** detalle y acciones en `apps/mobile/app/`, estado y llamadas en `apps/mobile/hooks/` o servicio móvil.

- [ ] **EV-T18. Mostrar avisos dentro de Petzy y abrirlos con seguridad.** Depende de: EV-T11, EV-T14–EV-T15 y navegación de Chat CH-T14 integrada. Cubre CE-07; D-101, D-116.
  - **Aceptación:** la persona ve sus avisos de evento aun si la app estuvo cerrada y puede marcarlos leídos. Si aceptó push, recibe el aviso del teléfono; al tocar cualquiera, se comprueban sesión y visibilidad antes de abrir el evento. Un expulsado no ve avisos de esa comunidad. Hay espera, vacío, error y reintento sin marcar leído antes de que el servidor confirme.
  - **Verificar:** lint y TypeScript móvil; recorrido con app abierta/cerrada, permiso denegado, push duplicado, expulsión posterior, token vencido y API apagada.
  - **Archivos previstos:** bandeja o componente de avisos en `apps/mobile/app/`, navegación/notificaciones y consultas en `apps/mobile/hooks/` o servicio móvil.

- [ ] **EV-T19. Comprobar Eventos de extremo a extremo.** Depende de: EV-T01–EV-T18. Cubre CE-01–CE-10.
  - **Aceptación:** cada criterio tiene resultado, fecha, entorno y evidencia. Se comprueban roles, acceso directo, foto privada, mapa, inicio/fin en zonas distintas, asistencia e invalidación, total fijado, cancelación, avisos y rendimiento de avisos. Ningún criterio se marca «Verificado» si falta la integración con Comunidades, Perfiles o Chat que necesita.
  - **Verificar:** `pnpm --filter proyecto-backend test -- --runInBand`, `pnpm --filter proyecto-backend test:e2e`, `pnpm backend:build`, `pnpm --filter mobile lint`, `pnpm --filter mobile exec tsc --noEmit` y recorrido en dispositivo; registrar límites si falta entorno.
  - **Archivos previstos:** pruebas en `apps/backend/src/event/` y `apps/backend/test/`, comprobaciones móviles en `apps/mobile/` y evidencia junto a la ficha.

- [ ] **EV-T20. Actualizar documentos con lo realmente integrado.** Depende de: EV-T19. Cubre trazabilidad CE-01–CE-10.
  - **Aceptación:** ficha, plan, tareas, ruta de desarrollo, API y datos/permisos distinguen comportamiento implementado de propuesta. Se registran pruebas, fecha y entorno; ninguna ruta figura como «actual» sin implementación verificada. Se conservan pendientes y límites sin afirmar que todo Eventos está completo por una pantalla o tabla aislada.
  - **Verificar:** cotejar enlaces, criterios y estado contra código y pruebas ejecutadas; `git diff --check`.
  - **Archivos previstos:** [ficha](../09-EVENTOS.md), [plan](01-PLAN.md), este archivo, [ruta](../../00-RUTA-DE-DESARROLLO.md), [API](../../05-API.md) y [datos](../../04-DATOS-Y-PERMISOS.md).
