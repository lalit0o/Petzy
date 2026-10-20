# Petzy — rutas presentes en código y contrato objetivo

**Versión documental:** 0.3 · **Revisado:** 19 de octubre de 2026

Este archivo inventaría rutas para integrar móvil y backend. **Presente en código** significa que existe un controlador, sin afirmar que el flujo esté verificado. **Verificada** exige prueba del contrato y permisos con evidencia; aún no se asigna esa etiqueta a las rutas de este inventario. **Propuesta** requiere revisión de la ficha correspondiente antes de implementarse. Los IDs y dependencias están en el [mapa](../MAPA-CAPACIDADES.md); el alcance en [01-PROYECTO.md](01-PROYECTO.md) y las reglas en [04-DATOS-Y-PERMISOS.md](04-DATOS-Y-PERMISOS.md).

**Cómo leer esta página:** una ruta es una operación que la app pide al servidor, por ejemplo «iniciar sesión» o «mostrar publicaciones». Esta página describe su nombre técnico, los datos que recibe y quién puede usarla. Para entender qué verá la persona y qué pasa si falla, abre la ficha funcional enlazada desde el [índice](ESPECIFICACIONES/00-INDICE.md). Una ruta escrita aquí como «propuesta» todavía no funciona en la app.

Supabase Postgres es el destino elegido para la base de datos del proyecto; el entorno local se conectó a Supabase en una consulta de lectura el 19-10-2026. Esa conexión no verifica todavía los recorridos de Cuenta ni autoriza aplicar las migraciones pendientes a una base con tablas previas y sin historial Prisma. Las rutas de esta página corresponden a la **API NestJS presente en código o propuesta**, que accede a Postgres mediante Prisma. D-134 confirma que esta será la vía de lectura y escritura de datos de la app móvil durante el MVP. No se abrirá acceso directo desde móvil a la Data API de Supabase en esta etapa; una sustitución futura requeriría decisión, permisos, políticas RLS probadas y actualización de este inventario para evitar dos contratos contradictorios.

## Convenciones actuales

- URL local por defecto: `http://<host-alcanzable>:3000`. No existe un prefijo global `/api`.
- `POST /auth/sign-up`, `POST /auth/sign-in`, `POST /auth/refresh`, `POST /auth/resend-confirmation`, `POST /auth/password-reset-request` y `POST /auth/password-update` son públicos en el guard global. La última operación exige que Supabase valide la sesión recibida del enlace antes de cambiar la contraseña. El resto de rutas requiere `Authorization: Bearer <access_token>`. `GET /auth/me` y `PUT /auth/profile-completion` admiten una identidad válida sin perfil de Petzy; las rutas de contenido exigen perfil activo.
- Los cuerpos JSON pasan por `ValidationPipe` global con `whitelist` y `transform`. Los campos no declarados en los DTO se descartan.
- NestJS usa sus códigos HTTP por defecto salvo configuración explícita. El campo `statusCode` que aparece en el cuerpo de autenticación **no cambia** por sí solo el código HTTP de la respuesta.
- Los errores de NestJS tienen un cuerpo con `statusCode` y `message`, pero aún no existe un formato propio y uniforme para todos los módulos.
- Los ID de usuario son cadenas de Supabase Auth; los ID de mascota, publicación, comentario y comunidad son enteros.

## Rutas presentes en código, pendientes de verificación completa

| Método y ruta | Entrada / respuesta observada en código | Estado y límite |
| --- | --- | --- |
| `POST /auth/sign-up` | `{ email, username, password, locatedAt }` → `confirmation_required: true` y mensaje para revisar el correo. | Crea identidad en Supabase y trata de guardar el perfil. Si falla ese guardado, conserva la identidad y pide entrar con la misma cuenta para completar el perfil después de confirmar el correo. El envío real del enlace todavía requiere configuración y prueba con Supabase. |
| `POST /auth/sign-in` | `{ email, password }` → `user` solo si el perfil está activo, `profileStatus`, `access_token`, `refresh_token`, `expires_at`. | Inicia sesión con correo confirmado. `profileStatus` vale `complete`, `incomplete` o `inactive`. Credenciales inválidas devuelven 401; fallo temporal de Supabase devuelve 503. El controlador no registra el formulario. |
| `POST /auth/refresh` | `{ refresh_token }` → tokens rotados, vencimiento y `profileStatus`. | Solicita a Supabase una sesión nueva con el token de renovación. Un token inválido devuelve 401; fallo temporal del proveedor devuelve 503 para permitir reintentar sin borrar la sesión guardada. No recibe ID de usuario del cliente. |
| `GET /auth/me` | Bearer token → ID y correo de la identidad, `emailConfirmed`, `profileStatus` y perfil propio si está completo y activo. | Permite conocer si se confirmó el correo, faltan datos de Petzy o la cuenta está desactivada; comprueba la identidad en Supabase. |
| `PUT /auth/profile-completion` | Bearer token y `{ username, locatedAt }` → perfil propio completo. | Exige correo confirmado; ID y correo proceden de Supabase, no del cuerpo. No crea dos perfiles ni cambia uno ya completo; conflicto de nombre 409. |
| `POST /auth/resend-confirmation` | `{ email }` → respuesta uniforme que indica revisar el buzón. | No revela si ese correo tiene una cuenta pendiente. Supabase Auth envía el enlace hacia `mobile://auth/callback` cuando corresponde. HTTP 200 si acepta la solicitud; HTTP 503 con mensaje genérico si el proveedor rechaza el envío. Entrega real pendiente de comprobar. |
| `POST /auth/password-reset-request` | `{ email }` → respuesta uniforme para correo existente o ausente. | Supabase Auth envía el enlace hacia `mobile://auth/callback` cuando corresponde. HTTP 200 si acepta la solicitud; HTTP 503 con mensaje genérico si el proveedor rechaza el envío. Entrega real pendiente de comprobar. |
| `POST /auth/password-update` | `{ access_token, refresh_token, password }` → confirmación de actualización. | Supabase Auth valida la sesión obtenida del enlace y cambia la contraseña; sesión inválida devuelve 401. La app mantiene esos tokens solo en memoria mientras procesa el enlace. Una prueba HTTP local con Auth simulado pasó; falta probar enlace real y nuevo ingreso. |
| `GET /auth/:id` | ID de ruta. | Devuelve texto de ejemplo; no usar como consulta de perfil. |
| `GET /user` | Sin parámetros. | Devuelve texto de ejemplo. |
| `GET /user/search?q=...` | Texto de búsqueda. | Busca por `username`; hoy devuelve registros completos, incluido correo. Requiere proyección de campos públicos y paginación. |
| `GET /user/:id` | ID de ruta. | Devuelve texto de ejemplo y convierte el ID a número aunque `User.id` es cadena. |
| `GET /user/:id/pets` | ID de usuario. | Devuelve mascotas del ID indicado sin filtrar `isActive` ni comprobar visibilidad o propiedad. |
| `PATCH /user/:id` | Campos del `UpdateUserDto`. | Actualiza por ID recibido sin comprobar propietario. El DTO incluye `password`, que no pertenece al modelo Prisma `User`; no usar para credenciales. |
| `DELETE /user/:id` | ID de usuario. | Marca `isActive: false`; falta autorización por propietario y política de baja completa. |
| `POST /pet` | `{ ownerId, name, age, bio, photo? }`. | Intenta crear mascota. El DTO exige `ownerId` como entero aunque es cadena en Prisma; faltan autorización y campos especie/raza. |
| `PATCH /pet/:id` | Campos de `UpdatePetDto`. | Actualiza por ID sin comprobar dueño; el DTO permite intentar cambiar `ownerId`. |
| `DELETE /pet/:id` | ID de mascota. | Marca `isActive: false` sin comprobar dueño. |
| `GET /post` | Sin filtros. | Lista publicaciones activas, recientes primero, con `id`, `username` y `avatar` del autor. Sin paginación ni separación entre Inicio y comunidades ni filtro por categoría; no cumple D-20 ni D-21. |
| `POST /post` | `{ title, description, communityId?, type?, photoUrl? }`; `type` admite `GENERAL`, `TIP`, `QUESTION` y `LOST_PET`; al omitirlo se guarda `GENERAL`. | Obtiene `userId` del token. `photoUrl?` es un solo valor opcional, sin flujo de carga de archivo integrado. Todavía no admite Ayuda ni verifica membresía si se envía `communityId`. |
| `GET /post/:id` | ID de publicación. | Devuelve una publicación activa con datos públicos básicos del autor o 404. Aún no comprueba membresía si la publicación pertenece a una comunidad; no cumple D-20. |
| `PATCH /post/:id` | Campos de publicación. | Protegido por `PostOwnerGuard`; el DTO actual permite `communityId`, contrario a D-22. No existe todavía el vínculo editable con mascota. |
| `DELETE /post/:id` | ID de publicación. | Protegido por `PostOwnerGuard`; solo el autor puede desactivarla lógicamente hoy. Falta el permiso comunitario D-23. |
| `POST /posts/:postId/comments` | `{ body }`. | Obtiene autor del token y crea comentario. No comprueba explícitamente que la publicación esté activa. |
| `PATCH /posts/:postId/comments/:commentId` | `{ body? }`. | Tiene guard de propietario, pero la validación de ID en ese guard requiere corrección. |
| `DELETE /posts/:postId/comments/:commentId` | IDs de ruta. | Desactivación lógica con el guard de propietario pendiente de corrección. Todavía no autoriza `ADMIN`/`MODERATOR` para comentarios de su comunidad (D-27). |

No existen todavía controladores para reacciones, comunidades, eventos, conversaciones ni adopción en este checkout. El modelo `PostLike` en Prisma no equivale a un endpoint disponible. La [ficha de Adopción](ESPECIFICACIONES/08-ADOPCION.md) y su [plan técnico](ESPECIFICACIONES/08-ADOPCION/01-PLAN.md) están aprobados; las rutas descritas siguen sin implementar.

## Rutas de comunidades y eventos descritas en la revisión anterior; ausentes en este checkout

| Método y ruta | Entrada / salida | Permiso y límite |
| --- | --- | --- |
| `GET /communities` | Hasta 50 comunidades con `memberCount` y `myRole`. | Cualquier usuario registrado; falta paginación y búsqueda. |
| `POST /communities` | `{ name, description, photoUrl? }`; crea también membresía `ADMIN`. | Usuario registrado. |
| `GET /communities/:id` | Datos de comunidad, `memberCount`, `myRole`. | Usuario registrado. |
| `POST /communities/:id/members/me` | Alta idempotente como `MEMBER`. | Usuario registrado. |
| `GET /communities/:id/posts` | Hasta 30 publicaciones activas de esa comunidad en el registro histórico. | El contrato histórico permitía cualquier usuario registrado; D-20 exige membresía para la futura implementación. Esta ruta no existe en este checkout. |
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
GET /post
Authorization: Bearer <access_token>
```

El ejemplo ilustra el formato. Los valores son ficticios y no deben convertirse en credenciales de prueba compartidas.

## Contrato propuesto por módulo

La siguiente tabla fija la dirección de diseño. Las rutas nuevas deben acordarse con las pantallas antes de implementarlas y reemplazar gradualmente las rutas antiguas cuando corresponda.

| Módulo | Rutas objetivo | Regla esencial |
| --- | --- | --- |
| Cuenta (`cuenta`) | Las ocho rutas del [plan aprobado](ESPECIFICACIONES/01-CUENTA/01-PLAN.md) ya tienen código y pruebas locales dirigidas. | CU-T01–CU-T05 están cerradas con evidencia local. CU-T06–CU-T09 tienen implementación, pero necesitan recorridos reales en dispositivo y Supabase; CU-T10 sigue abierto. La capacidad no está verificada de punta a punta. |
| Perfiles (`perfiles`) | [Plan](ESPECIFICACIONES/03-PERFILES/01-PLAN.md) y [tareas](ESPECIFICACIONES/03-PERFILES/02-TAREAS.md) aprobados: `GET /users/me`, `PATCH /users/me`, `GET /users/:id`, `GET /users?q=...`; incluyen rutas para foto privada y desactivación, y `POST /auth/reactivate` para volver a validar credenciales. | ID propio desde token. D-35 limita respuestas ajenas a nombre de usuario, foto de perfil, biografía, estado de México y mascotas activas; nunca correo ni ruta interna del archivo. D-36–D-37 ocultan cuenta inactiva y su contenido y conservan membresías sin contarlas. D-39–D-40 fijan foto privada y límites; D-41 exige nueva comprobación de correo y contraseña al reactivar. Estas rutas aún no son implementación actual. |
| Mascotas | [Plan](ESPECIFICACIONES/04-MASCOTAS/01-PLAN.md) y [tareas](ESPECIFICACIONES/04-MASCOTAS/02-TAREAS.md) aprobados: `GET /users/me/pets`, `GET /users/:id/pets`, `POST /pets`, `GET/PATCH/DELETE /pets/:id`, `GET/PUT/DELETE /pets/:id/photo`. | Rutas aún no implementadas. El servidor asignaría `ownerId`. La entrada prevista exige nombre de 2–50 caracteres, especie, raza de 2–50 y `birth: { year, month, day? }`; foto y descripción de hasta 300 son opcionales (D-42–D-44, D-49). «Mestiza» y «Raza desconocida» son válidas; «Otra» especie exige texto de 2–50 (D-45–D-46). La foto privada se entregaría tras comprobar sesión, mascota y dueño activos (D-47). La API no aceptaría `age` del cliente: calcularía la edad al responder con el día UTC, sin leerla ni guardarla en `Pet` (D-51–D-52), e indicaría si es aproximada (D-50). Los datos públicos siguen D-43 y excluyen fichas o dueños inactivos. |
| Publicaciones (`publicaciones`) | `GET /posts?cursor=...&limit=...&type=...` para Inicio, `POST /posts`, `GET/PATCH/DELETE /posts/:id`; el cuerpo futuro exigirá `title`, `description` y `type` con la categoría elegida y podrá incluir una foto y un vínculo opcional `petId` con mascota propia (D-30). `PATCH /posts/:id` permitirá cambiar título, descripción, foto, categoría y mascota vinculada, incluida la retirada de la foto y la mascota. Estas rutas plurales son propuestas; las actuales usan `/post`. | Inicio filtra siempre `communityId = null`; sin `type` muestra «Todas», con `type` solo la categoría elegida, incluidas las páginas siguientes (D-21). Al crear, el servidor rechazará título o descripción ausentes, vacíos o superiores a 120 y 3 000 caracteres respectivamente, y categorías ausentes o desconocidas en el contrato objetivo; no dependerá del valor por defecto General del esquema actual. Listar o abrir por ID una publicación comunitaria exige membresía (D-20). Aplicar `isActive`, paginación y autor. Si se vincula mascota, comprobar que sea propia y activa; en lista y detalle devolver como complemento nombre, foto disponible y acceso a su ficha solo mientras siga activa. Si se desactiva, conservar la publicación sin esos datos (D-19). La edición no aceptará cambios de autor ni `communityId`; si cambia la categoría, los filtros reflejarán el nuevo valor (D-22). Ayuda requiere ampliar el enum actual. |
| Interacciones (`interacciones`) | `GET/POST /posts/:id/comments`, `PATCH/DELETE /posts/:id/comments/:commentId`, `PUT/DELETE /posts/:id/like` | Rutas propuestas. Los comentarios son solo texto con contenido de hasta 500 caracteres, sin fotos ni respuestas anidadas; se listan del más reciente al más antiguo, 20 por página y máximo 30 por solicitud (D-53–D-55). La respuesta muestra nombre público, referencia protegida de foto si existe, texto, fecha e `editedAt` y «Editado» cuando ese valor no sea `null`, nunca correo ni ruta interna de Storage. El autor puede editar el suyo sin plazo mientras comentario y publicación sigan activos y tenga acceso. La publicación debe ser visible; cada cuenta solo puede tener un «Me gusta» por publicación. |
| Comunidades | `GET/POST /communities`, `GET/PATCH /communities/:id`, `POST/DELETE /communities/:id/members/me`, `GET/POST /communities/:id/posts` | **Rutas propuestas, ausentes en este checkout.** Crear comunidad también crea membresía `ADMIN`; unirse es inmediato salvo bloqueo por expulsión. Los nombres pueden repetirse (D-72). Antes de unirse, una cuenta no expulsada ve nombre, descripción, foto disponible y conteo activo; leer o publicar en posts requiere membresía (D-20, D-60–D-70). Solo un `ADMIN` puede corregir nombre, descripción y tema o añadir, cambiar y quitar la foto (D-73). El [plan aprobado](ESPECIFICACIONES/06-COMUNIDADES/01-PLAN.md) detalla búsqueda paginada, lista de miembros, cambio de roles, expulsión y desbloqueo (D-74). Una persona expulsada no recibe la comunidad ni sus eventos por lista o ID directo. Salir o ser expulsada deja sin vigencia su asistencia anterior (D-71). |

| Eventos | `GET/POST /communities/:communityId/events`, `GET/PATCH /events/:id`, `PUT /events/:id/attendance` | Rutas propuestas, ausentes en este checkout: crear exige `ADMIN` o `MODERATOR`, y responder exige membresía. Alcance en [ESPECIFICACIONES/09-EVENTOS.md](ESPECIFICACIONES/09-EVENTOS.md). |
| Chat | `GET/POST /conversations`, `GET /conversations/:id/messages`, `POST /conversations/:id/messages`, `POST /conversations/:id/reports` | **Rutas propuestas, ausentes en este checkout.** Solo participantes activos leen y envían mensajes. El bloqueo detiene mensajes en ambos sentidos; quien lo puso puede quitarlo. El MVP permite enviar un reporte con mensajes seleccionados y explicación opcional, y confirma únicamente su guardado en la base (D-87). El plan precisará bloqueo, lectura, ocultación, borrado de la vista propia, paginación y avisos. No hay rutas para que el equipo lea o revise reportes ni para suspender cuentas hasta la etapa web futura. |
| Adopción | [Plan aprobado](ESPECIFICACIONES/08-ADOPCION/01-PLAN.md): `GET/POST /adoptions`, `GET/PATCH/DELETE /adoptions/:id`, `GET /adoptions/me/withdrawn`, `POST /adoptions/:id/restore`, `GET /adoptions/:id/photos/:photoId`, `POST /adoptions/:id/contact` y `POST /adoptions/:id/reports`. | **Rutas propuestas, ausentes en este checkout.** Los anuncios se guardarán separados de `Post`; solo el autor edita, retira o restaura. «Contactar» exige anuncio ajeno visible «Busca hogar» y reutiliza Chat. Una cuenta activa puede reportar una vez un anuncio ajeno visible, con motivo obligatorio y explicación opcional hasta 500 caracteres; la API conserva el contenido denunciado y responde «Ya lo reportaste» si se repite. El MVP no ofrece lectura de reportes al equipo ni comentarios o «Me gusta» en Adopción. |


**Moderación comunitaria propuesta (D-23):** la operación de desactivación de una publicación deberá aceptar al autor o a un `ADMIN`/`MODERATOR` de la comunidad a la que pertenece la publicación. En el segundo caso el servidor comprobará rol y `communityId`, cambiará `isActive` a `false` y conservará el registro. Un rol comunitario no habilita editar publicaciones ajenas ni desactivar publicaciones de Inicio o de otras comunidades. El [plan aprobado](ESPECIFICACIONES/02-PUBLICACIONES/01-PLAN.md) separa `DELETE /posts/:id` para el autor de `DELETE /communities/:id/posts/:postId` para moderación, con registro en `ModerationRemoval`; la ruta actual `DELETE /post/:id` todavía solo acepta al autor.

**Consulta y restauración administrativa propuestas (D-25):** dentro de una comunidad, una consulta exclusiva para `ADMIN` devolverá solo publicaciones desactivadas por moderación. Otra operación, también exclusiva para `ADMIN` de esa comunidad, permitirá restaurar una de esas publicaciones y cambiar `isActive` a `true`. El servidor rechazará a moderadores, miembros y administradores de otra comunidad; tampoco restaurará una publicación retirada por su autor. `isActive = false` no basta para distinguir los dos orígenes: D-31 aprobó para el plan `ModerationRemoval` como tabla separada; el plan propone `GET /communities/:id/moderation/posts` y `POST /communities/:id/moderation/posts/:postId/restore`; ninguna existe en código.

**Interacciones al ocultar o restaurar (D-26):** las rutas de comentarios y likes comprobarán que la publicación esté activa y sea visible para quien consulta. Al desactivarla, los comentarios y likes siguen guardados, pero esas rutas no los muestran ni permiten crear o cambiar interacciones. Al restaurar una publicación moderada, vuelven a consultarse los comentarios activos y likes anteriores sin duplicarlos. Esta regla aplica aunque se llame a una ruta directamente por ID; todavía no está verificada en el backend actual.

**Moderación de comentarios propuesta (D-27):** `DELETE /posts/:postId/comments/:commentId` queda para el propio comentarista. El [plan de Interacciones](ESPECIFICACIONES/05-INTERACCIONES/01-PLAN.md) propone rutas separadas para ocultar un comentario ajeno: el autor de un post general actúa en su post; en comunidad pueden hacerlo `ADMIN`, `MODERATOR` y el autor de ese post con membresía vigente (D-56, D-59). El servidor comprobará que el comentario pertenece a ese post, la autoría o rol y la comunidad antes de establecer `Comment.isActive = false`; conservará el registro y no permitirá editar el texto ajeno. Un rol comunitario no podrá actuar sobre comentarios de Inicio ni de otra comunidad. La ruta existente aún usa un guard solo de propietario y requiere corrección.

**Consulta y restauración de comentarios propuestas (D-28):** una consulta exclusiva para `ADMIN` de la comunidad devolverá comentarios ajenos de sus publicaciones retirados por administradores, moderadores o autores de posts. Otra operación permitirá a ese administrador restaurar uno, tras comprobar comunidad, rol, publicación y origen de la retirada; establecerá `Comment.isActive = true`. Los retirados por su autor quedan excluidos. El comentario solo vuelve a la vista normal cuando su publicación está activa y quien la lee es miembro. `Comment.isActive = false` no distingue el origen: el plan propone la tabla separada `ModerationRemoval` de D-31, sin otra columna en `Comment`. El plan propone `GET /communities/:communityId/moderation/comments` y `POST /communities/:communityId/moderation/comments/:commentId/restore`, exclusivas para `ADMIN` (D-59). Estas operaciones aún no existen.

**Comentarios ocultados por el autor de un post general (D-56):** se proponen operaciones para que el autor retire lógicamente un comentario ajeno, consulte «Comentarios ocultados» de ese post y restaure uno que él retiró. En cada solicitud, el servidor comprobará el ID del token frente a `Post.userId`, que `communityId = null`, que la publicación esté activa y que `Comment.postId` coincida. La lista excluirá comentarios retirados por sus propios autores y los de otras publicaciones. El plan de Interacciones propone `DELETE /posts/:postId/moderation/comments/:commentId`, `GET /posts/:postId/moderation/comments` y `POST /posts/:postId/moderation/comments/:commentId/restore`, con origen en `ModerationRemoval` (D-58); ninguna operación de este tipo existe hoy. El guard actual de comentarios solo intenta comprobar `Comment.userId` y valida un parámetro de ID equivocado.

**Foto de publicación propuesta (D-24):** `POST /posts` y `PATCH /posts/:id` aceptarán como máximo una foto opcional propia del post; la edición podrá añadirla, sustituirla o quitarla. Lista y detalle devolverán como máximo esa foto. La imagen de una mascota vinculada se devolverá dentro de los datos de esa ficha, separada de la foto del post. El campo actual `photoUrl?` ya es singular. D-32 propone Storage privado y `GET /posts/:id/photo` con sesión y membresía comprobadas en cada solicitud; D-33 fija JPEG, PNG o WebP de hasta 5 MB. La migración de posibles URL antiguas aún requiere inventario de datos.

### Formatos recomendados para cerrar el contrato

- **Listas:** `{ items: [...], nextCursor: string | null }`, con `limit` máximo documentado y orden estable.
- **Error:** `{ statusCode: number, code: string, message: string, details?: object }`; `message` apto para el cliente, sin trazas ni secretos.
- **Fechas:** ISO 8601 en UTC en la API. Los eventos además conservan la zona horaria elegida para su presentación.
- **Fotos:** URL o identificador de archivo tras una carga validada. No aceptar una URL arbitraria como sustituto permanente de la política de archivos.
- **Códigos:** 400 para entrada inválida, 401 para falta de sesión, 403 para falta de permiso, 404 para recurso no visible o inexistente, 409 para conflicto, según el caso. La implementación deberá probar la respuesta exacta de cada ruta.

## Trabajo de integración según la ruta

El orden y estado principales se mantienen en [00-RUTA-DE-DESARROLLO.md](00-RUTA-DE-DESARROLLO.md). La ficha, el plan y las tareas de Adopción, Eventos y Diseño están aprobados. La coherencia general de las capacidades se revisa por separado; la implementación de todos los módulos está aplazada hasta autorización posterior del usuario. Este inventario de API no fija un orden alternativo.

Actualizar esta tabla y los ejemplos en la misma tarea que cambie un controlador o un DTO. El código es la referencia de lo que funciona en la versión actual; este documento expresa también las decisiones pendientes.
