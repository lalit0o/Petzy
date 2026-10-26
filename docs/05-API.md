# Petzy — rutas presentes en código y contrato objetivo

**Estado vigente, 25-10-2026:** existen `GET/POST /communities`, `GET/PATCH /communities/:id`, `GET /communities/:id/members`, `POST/DELETE /communities/:id/members/me`, `PATCH /communities/:id/members/:userId/role` y `GET/POST/DELETE` de expulsiones según el contrato aprobado. Exigen sesión y los permisos del servidor. Las rutas de foto propia de comunidad siguen propuestas. Publicaciones e Interacciones comunitarias ya tienen pantallas y control de acceso compartido; `GET /communities/:id/moderation/posts` devuelve `{ items, nextCursor }` con límite 20/30, actualizado junto con su consumidor. Pasan 52 pruebas HTTP completas y el usuario acepta el recorrido general del teléfono. [Alcance y pendientes](REVISIONES/2026-10-25-INTEGRACION-PUBLICACIONES.md).

**Auditoría del 25-10-2026:** restaurar un comentario conserva conjuntamente los filtros de publicación/comunidad, origen de retirada e inactividad; las listas de ocultados excluyen autores inactivos. `PATCH /posts/:id` rechaza con 400 categoría, título o descripción nulos, manteniendo opcional omitirlos. Se verificaron los conteos y estos casos por HTTP en PostgreSQL aislado; ver [revisión y límites](REVISIONES/2026-10-25-PUBLICACIONES.md).

**Conteo de comentarios, 25-10-2026:** `GET /posts/:postId/comments` ahora entrega `{ items, nextCursor, total }`. `total` cuenta todos los comentarios activos de esa publicación cuyo autor tiene cuenta activa, con independencia del cursor o límite. Se comprueba acceso al post antes de consultar; los ocultados, retirados y autores inactivos quedan fuera. La app muestra «Comentarios (total)» al recibirlo, actualiza tras crear/retirar/ocultar correctamente y vuelve a consultar al restaurar. Sin respuesta inicial válida no inventa un cero. No requiere migración ni cambia permisos. Tipos móviles, tipos de producción del backend y lint móvil dirigido pasan. Se ampliaron las pruebas HTTP de paginación y ocultar/restaurar; su ejecución con PostgreSQL y el recorrido en dispositivo siguen pendientes.

**Versión documental:** 0.4 · **Revisado:** 20 de octubre de 2026

Este archivo inventaría rutas para integrar móvil y backend. **Presente en código** significa que existe un controlador, sin afirmar que el flujo esté verificado. **Verificada** exige prueba del contrato y permisos con evidencia; aún no se asigna esa etiqueta a las rutas de este inventario. **Propuesta** requiere revisión de la ficha correspondiente antes de implementarse. Los IDs y dependencias están en el [mapa](../MAPA-CAPACIDADES.md); el alcance en [01-PROYECTO.md](01-PROYECTO.md) y las reglas en [04-DATOS-Y-PERMISOS.md](04-DATOS-Y-PERMISOS.md).

**Cómo leer esta página:** una ruta es una operación que la app pide al servidor, por ejemplo «iniciar sesión» o «mostrar publicaciones». Esta página describe su nombre técnico, los datos que recibe y quién puede usarla. Para entender qué verá la persona y qué pasa si falla, abre la ficha funcional enlazada desde el [índice](ESPECIFICACIONES/00-INDICE.md). Una ruta escrita aquí como «propuesta» todavía no funciona en la app.

Supabase Postgres es la base de desarrollo conectada. El 20-10-2026 se creó un respaldo local antes de aplicar también la migración de Mascotas; El inventario histórico registraba siete migraciones; la actualización del 25-10-2026 incluye nueve migraciones aplicadas, hasta D-74. Esto no verifica todavía el recorrido móvil. Las rutas de esta página corresponden a la **API NestJS presente en código o propuesta**, que accede a Postgres mediante Prisma. D-134 confirma que esta será la vía de lectura y escritura de datos de la app móvil durante el MVP. No se abrirá acceso directo desde móvil a la Data API de Supabase en esta etapa.

## Convenciones actuales

- URL local por defecto: `http://<host-alcanzable>:3000`. No existe un prefijo global `/api`.
- `POST /auth/sign-up`, `POST /auth/sign-in`, `POST /auth/refresh`, `POST /auth/resend-confirmation`, `POST /auth/password-reset-request` y `POST /auth/password-update` son públicos en el guard global. La última operación exige que Supabase valide la sesión recibida del enlace antes de cambiar la contraseña. El resto de rutas requiere `Authorization: Bearer <access_token>`. `GET /auth/me` y `PUT /auth/profile-completion` admiten una identidad válida sin perfil de Petzy; las rutas de contenido exigen perfil activo.
- Los cuerpos JSON pasan por `ValidationPipe` global con `whitelist`, `forbidNonWhitelisted` y `transform`. Los campos no declarados en los DTO se rechazan con HTTP 400.
- NestJS usa sus códigos HTTP por defecto salvo configuración explícita. El campo `statusCode` que aparece en el cuerpo de autenticación **no cambia** por sí solo el código HTTP de la respuesta.
- Los errores de NestJS tienen un cuerpo con `statusCode` y `message`, pero aún no existe un formato propio y uniforme para todos los módulos.
- Los ID de usuario son cadenas de Supabase Auth; los ID de mascota, publicación, comentario y comunidad son enteros.

## Rutas presentes en código, pendientes de verificación completa

| Método y ruta | Entrada / respuesta observada en código | Estado y límite |
| --- | --- | --- |
| `POST /auth/sign-up` | `{ email, username, password, locatedAt }` → `confirmation_required: true` y mensaje para revisar el correo. | Crea identidad en Supabase y trata de guardar el perfil. Si falla ese guardado, conserva la identidad y pide entrar con la misma cuenta para completar el perfil después de confirmar el correo. El envío real del enlace todavía requiere configuración y prueba con Supabase. |
| `POST /auth/sign-in` | `{ email, password }` → `user` solo si el perfil está activo, `profileStatus`, `access_token`, `refresh_token`, `expires_at`. | Inicia sesión con correo confirmado. `profileStatus` vale `complete`, `incomplete` o `inactive`. Credenciales inválidas devuelven 401; fallo temporal de Supabase devuelve 503. El controlador no registra el formulario. |
| `POST /auth/reactivate` | `{ email, password }` → sesión y perfil propio de la misma cuenta activa. | Supabase vuelve a comprobar las credenciales. Un token antiguo solo no sirve; si la petición válida se repite, devuelve la sesión sin crear otro perfil. Prueba HTTP local con Supabase simulado; falta recorrido real. |
| `POST /auth/refresh` | `{ refresh_token }` → tokens rotados, vencimiento y `profileStatus`. | Solicita a Supabase una sesión nueva con el token de renovación. Un token inválido devuelve 401; fallo temporal del proveedor devuelve 503 para permitir reintentar sin borrar la sesión guardada. No recibe ID de usuario del cliente. |
| `GET /auth/me` | Bearer token → ID y correo de la identidad, `emailConfirmed`, `profileStatus` y perfil propio si está completo y activo. | Permite conocer si se confirmó el correo, faltan datos de Petzy o la cuenta está desactivada; comprueba la identidad en Supabase. |
| `PUT /auth/profile-completion` | Bearer token y `{ username, locatedAt }` → perfil propio completo. | Exige correo confirmado; ID y correo proceden de Supabase, no del cuerpo. No crea dos perfiles ni cambia uno ya completo; conflicto de nombre 409. |
| `POST /auth/resend-confirmation` | `{ email }` → respuesta uniforme que indica revisar el buzón. | No revela si ese correo tiene una cuenta pendiente. Supabase Auth envía el enlace hacia `mobile://auth/callback` cuando corresponde. HTTP 200 si acepta la solicitud; HTTP 503 con mensaje genérico si el proveedor rechaza el envío. Entrega real pendiente de comprobar. |
| `POST /auth/password-reset-request` | `{ email }` → respuesta uniforme para correo existente o ausente. | Supabase Auth envía el enlace hacia `mobile://auth/callback` cuando corresponde. HTTP 200 si acepta la solicitud; HTTP 503 con mensaje genérico si el proveedor rechaza el envío. Entrega real pendiente de comprobar. |
| `POST /auth/password-update` | `{ access_token, refresh_token, password }` → confirmación de actualización. | Supabase Auth valida la sesión obtenida del enlace y cambia la contraseña; sesión inválida devuelve 401. La app mantiene esos tokens solo en memoria mientras procesa el enlace. Una prueba HTTP local con Auth simulado pasó; falta probar enlace real y nuevo ingreso. |
| `GET /auth/:id` | ID de ruta. | Devuelve texto de ejemplo; no usar como consulta de perfil. |
| `GET /users/me` | Perfil propio con correo y `avatarUrl` protegido. | ID tomado del token; no entrega ruta interna de Storage. |
| `PATCH /users/me` | Nombre de usuario, biografía y estado de México. | Rechaza correo, contraseña, ID, estado de cuenta y foto en texto; conflicto de nombre 409. |
| `GET /users?q=...&cursor=...&limit=...` | `{ items, nextCursor }` con campos públicos de cuentas activas. | Búsqueda de 2–50 caracteres; 20 por página, máximo 30. No entrega correos. |
| `GET /users/:id` | Perfil público activo sin correo. | No entrega cuentas inactivas; la app consulta sus mascotas por `GET /users/:id/pets`. |
| `PUT /users/me/avatar`, `DELETE /users/me/avatar` | Archivo `photo` o retirada de la foto propia. | `profile-photos` privado; JPEG/PNG/WebP hasta 5 MB. La respuesta no entrega la ruta interna. |
| `GET /users/:id/avatar` | Bytes de la foto privada. | Comprueba solicitante y dueño activos; respuesta `private, no-store`. |
| `POST /pets` | `{ name, species, breed, birth: { year, month, day? }, bio? }` → ficha con edad calculada. | Toma dueño del token; rechaza `ownerId`, `age`, fecha futura o inválida. |
| `GET /users/me/pets`, `GET /users/:id/pets` | `{ items, nextCursor }` de fichas activas, 20 por página y máximo 30. | Exigen solicitante y dueño activos. Entregan fecha exacta o aproximada, edad calculada y `photoUrl` protegida. |
| `GET /pets/:id` | Ficha pública activa con nombre, especie, raza, nacimiento, edad, descripción y foto disponible. | No entrega fichas ni dueños inactivos; no expone ruta interna de Storage. |
| `PATCH /pets/:id`, `DELETE /pets/:id` | Corrige datos autorizados o desactiva lógicamente la ficha. | Solo dueño activo; la API rechaza campos ajenos y no ofrece restauración. |
| `PUT /pets/:id/photo`, `DELETE /pets/:id/photo`, `GET /pets/:id/photo` | Sube, quita o entrega bytes de la foto privada. | Escritura solo del dueño; lectura de cuentas activas mientras ficha y dueño estén activos. JPEG/PNG/WebP hasta 5 MB, respuesta sin caché compartida. |
| `GET /posts?cursor=&limit=&type=` | `{ items, nextCursor }`; solo publicaciones generales, 20 por página y máximo 30; `type` opcional. | Código y pruebas HTTP aisladas; no se ha recorrido la app contra la base compartida. |
| `POST /posts`, `POST /communities/:communityId/posts` | Título, descripción y categoría obligatorios; `petId` y archivo `photo` opcionales. | El autor procede del token; en comunidad exige membresía. Se rechazan mascota ajena/inactiva y campos de autor/comunidad enviados en el cuerpo. |
| `GET /communities/:communityId/posts?cursor=&limit=&type=` | Lista solo publicaciones activas de esa comunidad para sus miembros. | Existe aunque el módulo general de Comunidades y su pantalla aún no están implementados. |
| `GET /posts/:id`, `GET /posts/:id/photo` | Detalle público autorizado o bytes de foto privada. | Comprueban publicación, autor y membresía en cada solicitud; la foto responde sin caché compartida. La ruta interna de Storage no sale en el JSON. |
| `PATCH /posts/:id`, `DELETE /posts/:id` | El autor edita texto, categoría, mascota o foto; `removePet` y `removePhoto` permiten retirarlas. `DELETE` desactiva lógicamente. | Código y pruebas HTTP aisladas; falta recorrido en móvil. |
| `DELETE /communities/:communityId/posts/:postId` | Retirada de una publicación ajena de esa comunidad. | Exige rol `ADMIN` o `MODERATOR`; guarda `ModerationRemoval`. |
| `GET /communities/:communityId/moderation/posts`, `POST /communities/:communityId/moderation/posts/:postId/restore` | Lista retiradas por moderación y restaura una. | Solo `ADMIN`; no incluye retiradas por el propio autor. Falta integrar la pestaña móvil de Comunidades. |
| `POST /posts/:postId/comments` | `{ body }`. | Ruta antigua parcialmente implementada: ahora comprueba visibilidad del post antes de crear; faltan las reglas completas de Interacciones. |
| `PATCH /posts/:postId/comments/:commentId`, `DELETE /posts/:postId/comments/:commentId` | Edita o desactiva un comentario propio. | Ahora comprueban ID, autor, pertenencia al post y visibilidad del post. Falta `editedAt`, listado, moderación y restauración de Interacciones. |

Ya existen controladores generales de comunidades y reacciones. Eventos, conversaciones y adopción conservan sus rutas propuestas. Las rutas de publicaciones bajo `/communities/:communityId` pertenecen al módulo de Publicaciones y usan la membresía ya guardada. El modelo `PostLike` en Prisma no equivale a un endpoint disponible. La [ficha de Adopción](ESPECIFICACIONES/08-ADOPCION.md) y su [plan técnico](ESPECIFICACIONES/08-ADOPCION/01-PLAN.md) están aprobados; sus rutas siguen sin implementar.

## Rutas del módulo general de Comunidades y Eventos aún ausentes

| Método y ruta | Entrada / salida | Permiso y límite |
| --- | --- | --- |
| `GET /communities` | Hasta 50 comunidades con `memberCount` y `myRole`. | Cualquier usuario registrado; falta paginación y búsqueda. |
| `POST /communities` | `{ name, description, photoUrl? }`; crea también membresía `ADMIN`. | Usuario registrado. |
| `GET /communities/:id` | Datos de comunidad, `memberCount`, `myRole`. | Usuario registrado. |
| `POST /communities/:id/members/me` | Alta idempotente como `MEMBER`. | Usuario registrado. |
| `GET /communities/:id/posts` | Lista paginada de Publicaciones comunitarias. | Ya existe en el módulo de Publicaciones y exige membresía; se incluye aquí para distinguirla del módulo general de Comunidades todavía ausente. |
| `GET /communities/:communityId/events?cursor=...` | `{ items, nextCursor }`, 20 eventos futuros publicados por página, con `goingCount`. | Usuario registrado. |
| `POST /communities/:communityId/events` | Título, descripción, `startsAt` ISO, `timeZone`, `placeLabel`, latitud, longitud y portada opcional. | Solo `ADMIN`/`MODERATOR` de esa comunidad; creador derivado del token. |
| `GET /events/:id` | Detalle, creador público, `goingCount`, `myAttendance`, `myRole`, `canManage`. | Usuario registrado. Un cancelado conserva su detalle. |
| `PATCH /events/:id` | Campos editables o `{ status: "CANCELLED" }`. | Creador o `ADMIN`; no permite reabrir un cancelado. |
| `PUT /events/:id/attendance` | `{ status: "GOING" | "NOT_GOING" }` → estado y total actualizado. | Miembro de la comunidad; un único estado vigente por usuario. |

La revisión anterior registró estas rutas y una migración aplicada a PostgreSQL local el 29-09-2026. En este checkout no aparecen controladores de comunidades o eventos ni la migración de eventos. No se comprobó el estado de la base local ni de Supabase; esta tabla no constituye un contrato actual de API.

El [plan técnico aprobado de Eventos](ESPECIFICACIONES/09-EVENTOS/01-PLAN.md) sustituye la propuesta histórica de arriba para esa capacidad: pide inicio y fin aproximado, separa `upcoming`, `ongoing` y `past`, envía los cancelados a `past`, cierra asistencia al inicio, exige que el creador siga siendo miembro y añade portada privada, cancelación y avisos propios. Sus rutas siguen siendo **propuestas** y no están implementadas.

## Ejemplos de intercambio de rutas presentes en código

Registro, con un valor de `locatedAt` del enum `MexicoState`:

```http
POST /auth/sign-up
Content-Type: application/json

{"email":"ana@example.com","username":"ana_mascotas","password":"ejemplo-seguro-123","locatedAt":"BAJA_CALIFORNIA"}
```

Inicio de sesión y uso del token:

```http
POST /auth/sign-in
Content-Type: application/json

{"email":"ana@example.com","password":"ejemplo-seguro-123"}
```

```http
GET /posts
Authorization: Bearer <access_token>
```

El ejemplo ilustra el formato. Los valores son ficticios y no deben convertirse en credenciales de prueba compartidas.

## Contrato propuesto por módulo

La siguiente tabla fija la dirección de diseño. Las rutas nuevas deben acordarse con las pantallas antes de implementarlas y reemplazar gradualmente las rutas antiguas cuando corresponda.

| Módulo | Rutas objetivo | Regla esencial |
| --- | --- | --- |
| Cuenta (`cuenta`) | Las ocho rutas del [plan aprobado](ESPECIFICACIONES/01-CUENTA/01-PLAN.md) ya tienen código y pruebas locales dirigidas. | CU-T01–CU-T05 están cerradas con evidencia local. CU-T06–CU-T09 tienen implementación, pero necesitan recorridos reales en dispositivo y Supabase; CU-T10 sigue abierto. La capacidad no está verificada de punta a punta. |
| Perfiles (`perfiles`) | `GET/PATCH /users/me`, `GET /users`, `GET /users/:id`, rutas de avatar y `POST /auth/reactivate` tienen código y pruebas HTTP aisladas. `POST /users/me/deactivate` sigue propuesto. | PE-T01–PE-T06 cerradas localmente. La foto privada y la búsqueda no exponen correo ni ruta interna. Mascotas públicas y la desactivación dependen de tareas posteriores; falta recorrido con sesión real y móvil. |
| Mascotas | Las rutas plurales `/pets`, las listas `/users/me/pets` y `/users/:id/pets` y las operaciones de foto tienen código y pruebas HTTP locales. | Dueño tomado del token, edad calculada con UTC sin columna `age`, foto privada y fichas de dueño activo. Falta recorrer el formulario, imágenes y enlaces en iPhone con sesión real; [tareas](ESPECIFICACIONES/04-MASCOTAS/02-TAREAS.md). |
| Publicaciones (`publicaciones`) | Las rutas plurales `/posts` y `/communities/:id/posts` ya tienen código para lista, creación, detalle, foto, edición, retirada y moderación. La categoría es obligatoria; foto y `petId` son opcionales. | Inicio usa `communityId = null`; el filtro de categoría mantiene el contexto al paginar. La lectura comunitaria exige membresía, también por ID y foto. La mascota debe ser propia y activa; la respuesta añade nombre, especie, edad, foto protegida y ficha mientras siga activa. **Pendiente de Comunidades:** pestaña móvil de moderación. Hay pruebas HTTP aisladas, pero no recorrido móvil completo. |
| Interacciones (`interacciones`) | `GET/POST /posts/:id/comments`, `PATCH/DELETE /posts/:id/comments/:commentId`, `PUT/DELETE /posts/:id/like` | `POST`, `PATCH` y `DELETE` de comentarios tienen código parcial; listado y «Me gusta» siguen propuestos. Los comentarios serán solo texto con contenido de hasta 500 caracteres, sin fotos ni respuestas anidadas; se listarán del más reciente al más antiguo, 20 por página y máximo 30 por solicitud (D-53–D-55). La respuesta deberá mostrar nombre público, referencia protegida de foto si existe, texto, fecha e `editedAt` y «Editado» cuando ese valor no sea `null`, nunca correo ni ruta interna de Storage. El autor podrá editar el suyo sin plazo mientras comentario y publicación sigan activos y tenga acceso. La publicación debe ser visible; cada cuenta solo puede tener un «Me gusta» por publicación. |
| Comunidades | `GET/POST /communities`, `GET/PATCH /communities/:id`, `POST/DELETE /communities/:id/members/me`, `GET/POST /communities/:id/posts` | Las rutas generales de Comunidades son propuestas y aún no existen; `GET/POST /communities/:id/posts` sí están implementadas en Publicaciones y comprueban membresía. Crear comunidad también crea membresía `ADMIN`; unirse es inmediato salvo bloqueo por expulsión. Los nombres pueden repetirse (D-72). Antes de unirse, una cuenta no expulsada ve nombre, descripción, foto disponible y conteo activo; leer o publicar en posts requiere membresía (D-20, D-60–D-70). Solo un `ADMIN` puede corregir nombre, descripción y tema o añadir, cambiar y quitar la foto (D-73). El [plan aprobado](ESPECIFICACIONES/06-COMUNIDADES/01-PLAN.md) detalla búsqueda paginada, lista de miembros, cambio de roles, expulsión y desbloqueo (D-74). Una persona expulsada no recibe la comunidad ni sus eventos por lista o ID directo. Salir o ser expulsada deja sin vigencia su asistencia anterior (D-71). |
| Eventos | `GET/POST /communities/:communityId/events`, `GET/PATCH /events/:id`, `PUT /events/:id/attendance` | Rutas propuestas, ausentes en este checkout: crear exige `ADMIN` o `MODERATOR`, y responder exige membresía. Alcance en [ESPECIFICACIONES/09-EVENTOS.md](ESPECIFICACIONES/09-EVENTOS.md). |
| Chat | `GET/POST /conversations`, `GET /conversations/:id/messages`, `POST /conversations/:id/messages`, `POST /conversations/:id/reports` | **Rutas propuestas, ausentes en este checkout.** Solo participantes activos leen y envían mensajes. El bloqueo detiene mensajes en ambos sentidos; quien lo puso puede quitarlo. El MVP permite enviar un reporte con mensajes seleccionados y explicación opcional, y confirma únicamente su guardado en la base (D-87). El plan precisará bloqueo, lectura, ocultación, borrado de la vista propia, paginación y avisos. No hay rutas para que el equipo lea o revise reportes ni para suspender cuentas hasta la etapa web futura. |
| Adopción | [Plan aprobado](ESPECIFICACIONES/08-ADOPCION/01-PLAN.md): `GET/POST /adoptions`, `GET/PATCH/DELETE /adoptions/:id`, `GET /adoptions/me/withdrawn`, `POST /adoptions/:id/restore`, `GET /adoptions/:id/photos/:photoId`, `POST /adoptions/:id/contact` y `POST /adoptions/:id/reports`. | **Rutas propuestas, ausentes en este checkout.** Los anuncios se guardarán separados de `Post`; solo el autor edita, retira o restaura. «Contactar» exige anuncio ajeno visible «Busca hogar» y reutiliza Chat. Una cuenta activa puede reportar una vez un anuncio ajeno visible, con motivo obligatorio y explicación opcional hasta 500 caracteres; la API conserva el contenido denunciado y responde «Ya lo reportaste» si se repite. El MVP no ofrece lectura de reportes al equipo ni comentarios o «Me gusta» en Adopción. |


**Moderación comunitaria en código (D-23):** `DELETE /posts/:id` retira una publicación propia y `DELETE /communities/:id/posts/:postId` permite a `ADMIN` o `MODERATOR` retirar una publicación ajena de esa comunidad y registrar `ModerationRemoval`. No concede edición ajena ni acceso a otra comunidad o a Inicio. Tiene pruebas HTTP aisladas; falta el recorrido en la pantalla comunitaria.

**Consulta y restauración administrativa en código (D-25):** `GET /communities/:id/moderation/posts` y `POST /communities/:id/moderation/posts/:postId/restore` exigen `ADMIN` de esa comunidad. La lista toma solo retiradas abiertas por moderación; una retirada propia no tiene ese registro. La API tiene pruebas HTTP aisladas; falta la interfaz de Comunidades.

**Interacciones al ocultar o restaurar (D-26):** las rutas de comentarios y likes comprobarán que la publicación esté activa y sea visible para quien consulta. Al desactivarla, los comentarios y likes siguen guardados, pero esas rutas no los muestran ni permiten crear o cambiar interacciones. Al restaurar una publicación moderada, vuelven a consultarse los comentarios activos y likes anteriores sin duplicarlos. Esta regla aplica aunque se llame a una ruta directamente por ID; todavía no está verificada en el backend actual.

**Moderación de comentarios propuesta (D-27):** `DELETE /posts/:postId/comments/:commentId` queda para el propio comentarista. El [plan de Interacciones](ESPECIFICACIONES/05-INTERACCIONES/01-PLAN.md) propone rutas separadas para ocultar un comentario ajeno: el autor de un post general actúa en su post; en comunidad pueden hacerlo `ADMIN`, `MODERATOR` y el autor de ese post con membresía vigente (D-56, D-59). El servidor deberá comprobar que el comentario pertenece a ese post, la autoría o rol y la comunidad antes de establecer `Comment.isActive = false`; conservará el registro y no permitirá editar el texto ajeno. Un rol comunitario no podrá actuar sobre comentarios de Inicio ni de otra comunidad. El guard existente ya comprueba el ID del comentario y su pertenencia al post para las operaciones propias; aún no concede moderación ajena.

**Consulta y restauración de comentarios propuestas (D-28):** una consulta exclusiva para `ADMIN` de la comunidad devolverá comentarios ajenos de sus publicaciones retirados por administradores, moderadores o autores de posts. Otra operación permitirá a ese administrador restaurar uno, tras comprobar comunidad, rol, publicación y origen de la retirada; establecerá `Comment.isActive = true`. Los retirados por su autor quedan excluidos. El comentario solo vuelve a la vista normal cuando su publicación está activa y quien la lee es miembro. `Comment.isActive = false` no distingue el origen: el plan propone la tabla separada `ModerationRemoval` de D-31, sin otra columna en `Comment`. El plan propone `GET /communities/:communityId/moderation/comments` y `POST /communities/:communityId/moderation/comments/:commentId/restore`, exclusivas para `ADMIN` (D-59). Estas operaciones aún no existen.

**Comentarios ocultados por el autor de un post general (D-56):** se proponen operaciones para que el autor retire lógicamente un comentario ajeno, consulte «Comentarios ocultados» de ese post y restaure uno que él retiró. En cada solicitud, el servidor comprobará el ID del token frente a `Post.userId`, que `communityId = null`, que la publicación esté activa y que `Comment.postId` coincida. La lista excluirá comentarios retirados por sus propios autores y los de otras publicaciones. El plan de Interacciones propone `DELETE /posts/:postId/moderation/comments/:commentId`, `GET /posts/:postId/moderation/comments` y `POST /posts/:postId/moderation/comments/:commentId/restore`, con origen en `ModerationRemoval` (D-58); ninguna operación de este tipo existe hoy. El guard actual solo cubre la edición y retirada del propio comentario.

**Foto de publicación en código (D-24):** `POST /posts` y `PATCH /posts/:id` aceptan como máximo una foto opcional JPEG, PNG o WebP de hasta 5 MB; la edición puede añadirla, sustituirla o quitarla. `GET /posts/:id/photo` comprueba sesión y permiso de lectura en cada solicitud. El bucket `post-photos` está configurado como privado; la base tenía 0 valores antiguos de `photoUrl`. Falta probar carga, sustitución y visualización en dispositivo. La foto de una mascota vinculada usa por separado `/pets/:id/photo` y sus permisos propios.

### Formatos recomendados para cerrar el contrato

- **Listas:** `{ items: [...], nextCursor: string | null }`, con `limit` máximo documentado y orden estable.
- **Error:** `{ statusCode: number, code: string, message: string, details?: object }`; `message` apto para el cliente, sin trazas ni secretos.
- **Fechas:** ISO 8601 en UTC en la API. Los eventos además conservan la zona horaria elegida para su presentación.
- **Fotos:** URL o identificador de archivo tras una carga validada. No aceptar una URL arbitraria como sustituto permanente de la política de archivos.
- **Códigos:** 400 para entrada inválida, 401 para falta de sesión, 403 para falta de permiso, 404 para recurso no visible o inexistente, 409 para conflicto, según el caso. La implementación deberá probar la respuesta exacta de cada ruta.

## Trabajo de integración según la ruta

El orden y estado principales se mantienen en [00-RUTA-DE-DESARROLLO.md](00-RUTA-DE-DESARROLLO.md). La ficha, el plan y las tareas de Adopción, Eventos y Diseño están aprobados. La coherencia general de las capacidades se revisa por separado; la implementación de todos los módulos está aplazada hasta autorización posterior del usuario. Este inventario de API no fija un orden alternativo.

Actualizar esta tabla y los ejemplos en la misma tarea que cambie un controlador o un DTO. El código es la referencia de lo que funciona en la versión actual; este documento expresa también las decisiones pendientes.
