# Petzy — rutas presentes en código y contrato objetivo

**Versión documental:** 0.2 · **Revisado:** 1 de octubre de 2026

Este archivo inventaría rutas para integrar móvil y backend. **Presente en código** significa que existe un controlador, sin afirmar que el flujo esté verificado. **Verificada** exige prueba del contrato y permisos con evidencia; aún no se asigna esa etiqueta a las rutas de este inventario. **Propuesta** requiere revisión de la ficha correspondiente antes de implementarse. Los IDs y dependencias están en el [mapa](../MAPA-CAPACIDADES.md); el alcance en [PROYECTO.md](PROYECTO.md) y las reglas en [DATOS-Y-PERMISOS.md](DATOS-Y-PERMISOS.md).

Supabase Postgres es el destino elegido para la base de datos del proyecto; el entorno local revisado aún apuntaba a PostgreSQL en `localhost`. Las rutas de esta página corresponden a la **API NestJS presente en código o propuesta**, que accede a Postgres mediante Prisma. Supabase ofrece también una Data API generada desde el esquema; antes de crear nuevos endpoints CRUD se evaluará si puede usarse para ese flujo. Esta documentación no presupone acceso directo desde móvil: tal acceso requiere permisos y políticas RLS probadas, y cualquier ruta sustituida debe marcarse aquí para evitar dos contratos contradictorios.

## Convenciones actuales

- URL local por defecto: `http://<host-alcanzable>:3000`. No existe un prefijo global `/api`.
- `POST /auth/sign-up` y `POST /auth/sign-in` son públicos. El resto de rutas pasa por un guard global y requiere `Authorization: Bearer <access_token>`.
- Los cuerpos JSON pasan por `ValidationPipe` global con `whitelist` y `transform`. Los campos no declarados en los DTO se descartan.
- NestJS usa sus códigos HTTP por defecto salvo configuración explícita. El campo `statusCode` que aparece en el cuerpo de autenticación **no cambia** por sí solo el código HTTP de la respuesta.
- Los errores de NestJS tienen un cuerpo con `statusCode` y `message`, pero aún no existe un formato propio y uniforme para todos los módulos.
- Los ID de usuario son cadenas de Supabase Auth; los ID de mascota, publicación, comentario y comunidad son enteros.

## Rutas presentes en código, pendientes de verificación completa

| Método y ruta | Entrada / respuesta observada en código | Estado y límite |
| --- | --- | --- |
| `POST /auth/sign-up` | `{ email, username, password, locatedAt, avatar?, bio? }` → mensaje y `statusCode: 201` en el cuerpo. | Crea identidad en Supabase y perfil en PostgreSQL. No hay operación de reversión si falla la segunda creación. |
| `POST /auth/sign-in` | `{ email, password }` → `{ message, statusCode: 200, user, access_token }`. | Inicia sesión. El controlador registra actualmente el DTO recibido: retirar ese log antes de uso real. |
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
| `GET /posts` | Sin filtros. | Lista publicaciones activas, recientes primero, con `id`, `username` y `avatar` del autor. Sin paginación ni separación entre feed general y comunidad. |
| `POST /posts` | `{ title, description, communityId?, type?, photoUrl? }`. | Obtiene `userId` del token. No verifica aún membresía si se envía `communityId`. |
| `GET /posts/:id` | ID de publicación. | Devuelve una publicación activa con datos públicos básicos del autor o 404. |
| `PATCH /posts/:id` | Campos de publicación. | Protegido por `PostOwnerGuard`; permite campos del DTO, incluido `communityId`. |
| `DELETE /posts/:id` | ID de publicación. | Protegido por `PostOwnerGuard`; desactivación lógica. |
| `POST /posts/:postId/comments` | `{ body }`. | Obtiene autor del token y crea comentario. No comprueba explícitamente que la publicación esté activa. |
| `PATCH /posts/:postId/comments/:commentId` | `{ body? }`. | Tiene guard de propietario, pero la validación de ID en ese guard requiere corrección. |
| `DELETE /posts/:postId/comments/:commentId` | IDs de ruta. | Desactivación lógica con el mismo guard pendiente de corrección. |

No existen todavía controladores para reacciones, conversaciones ni adopción. Comunidades y eventos tienen API inicial, aunque las tablas de eventos requieren aplicar la migración antes de usar las rutas. El modelo `PostLike` en Prisma no equivale a un endpoint disponible. Adopción está en el MVP, después de integrar chat, pero sus rutas no se definirán hasta revisar [su ficha](ESPECIFICACIONES/ADOPCION.md).

### Rutas iniciales de comunidades y eventos

| Método y ruta | Entrada / salida | Permiso y límite |
| --- | --- | --- |
| `GET /communities` | Hasta 50 comunidades con `memberCount` y `myRole`. | Cualquier usuario registrado; falta paginación y búsqueda. |
| `POST /communities` | `{ name, description, photoUrl? }`; crea también membresía `ADMIN`. | Usuario registrado. |
| `GET /communities/:id` | Datos de comunidad, `memberCount`, `myRole`. | Usuario registrado. |
| `POST /communities/:id/members/me` | Alta idempotente como `MEMBER`. | Usuario registrado. |
| `GET /communities/:id/posts` | Hasta 30 publicaciones activas de esa comunidad. | Usuario registrado; falta paginación. |
| `GET /communities/:communityId/events?cursor=...` | `{ items, nextCursor }`, 20 eventos futuros publicados por página, con `goingCount`. | Usuario registrado. |
| `POST /communities/:communityId/events` | Título, descripción, `startsAt` ISO, `timeZone`, `placeLabel`, latitud, longitud y portada opcional. | Solo `ADMIN`/`MODERATOR` de esa comunidad; creador derivado del token. |
| `GET /events/:id` | Detalle, creador público, `goingCount`, `myAttendance`, `myRole`, `canManage`. | Usuario registrado. Un cancelado conserva su detalle. |
| `PATCH /events/:id` | Campos editables o `{ status: "CANCELLED" }`. | Creador o `ADMIN`; no permite reabrir un cancelado. |
| `PUT /events/:id/attendance` | `{ status: "GOING" | "NOT_GOING" }` → estado y total actualizado. | Miembro de la comunidad; un único estado vigente por usuario. |

Estas rutas están implementadas en código y la migración de eventos ya se aplicó a PostgreSQL local (`localhost:5435`) el 29-09-2026. Falta probarlas con cuentas autenticadas desde la app y aplicar la migración al entorno Supabase que corresponda.

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
| Cuenta (`cuenta`) | `POST /auth/password-recovery`, `POST /auth/sign-out` solo si se acuerda invalidación del servidor | Recuperación y credenciales mediante Supabase Auth; ciclo de sesión pendiente. |
| Perfiles (`perfiles`) | `GET /users/me`, `PATCH /users/me`, `GET /users/:id`, `GET /users?q=...` | ID propio desde token; respuesta pública sin correo ni privados. Campos exactos pendientes. |
| Mascotas | `GET /users/me/pets`, `POST /pets`, `GET /pets/:id`, `PATCH /pets/:id`, `DELETE /pets/:id` | El servidor asigna `ownerId`. Cuerpo objetivo con `name`, `species`, `breed?`, `birthDate`, `photo?`, `bio?`; la edad se calcula al consultar. Pendiente la migración de `age`. |
| Publicaciones (`publicaciones`) | `GET /posts?cursor=...&limit=...`, `POST /posts`, `GET/PATCH/DELETE /posts/:id` | Inicio filtra `communityId = null`; mini-feed filtra el ID de su comunidad. Aplicar `isActive`, paginación y autor. |
| Interacciones (`interacciones`) | `GET/POST /posts/:id/comments`, `PATCH/DELETE /posts/:id/comments/:commentId`, `PUT/DELETE /posts/:id/like` | Paginación, publicación visible, comentario propio y reacción única. |
| Comunidades | `GET/POST /communities`, `GET/PATCH /communities/:id`, `POST/DELETE /communities/:id/members/me`, `GET/POST /communities/:id/posts` | Crear comunidad también crea membresía `ADMIN`; publicar requiere membresía. |
| Eventos | `GET/POST /communities/:communityId/events`, `GET/PATCH /events/:id`, `PUT /events/:id/attendance` | Rutas ya presentes en código: crear exige `ADMIN` o `MODERATOR`, y responder exige membresía. Falta verificación autenticada y en dispositivo; alcance en [ESPECIFICACIONES/COMUNIDADES-EVENTOS.md](ESPECIFICACIONES/COMUNIDADES-EVENTOS.md). |
| Chat | `GET/POST /conversations`, `GET /conversations/:id/messages`, `POST /conversations/:id/messages` | Solo participantes pueden acceder; definir entrega en tiempo real y paginación. |

### Formatos recomendados para cerrar el contrato

- **Listas:** `{ items: [...], nextCursor: string | null }`, con `limit` máximo documentado y orden estable.
- **Error:** `{ statusCode: number, code: string, message: string, details?: object }`; `message` apto para el cliente, sin trazas ni secretos.
- **Fechas:** ISO 8601 en UTC en la API. Los eventos además conservan la zona horaria elegida para su presentación.
- **Fotos:** URL o identificador de archivo tras una carga validada. No aceptar una URL arbitraria como sustituto permanente de la política de archivos.
- **Códigos:** 400 para entrada inválida, 401 para falta de sesión, 403 para falta de permiso, 404 para recurso no visible o inexistente, 409 para conflicto, según el caso. La implementación deberá probar la respuesta exacta de cada ruta.

## Trabajo de integración inmediato

1. Corregir el encabezado `Bearer` del feed móvil y conectar realmente `GET /posts`.
2. Cerrar autorización y validación de mascotas y perfil antes de exponer sus formularios.
3. Definir respuestas públicas de usuario y contrato de paginación.
4. Añadir lectura de comentarios y operaciones de reacciones antes de mostrar controles interactivos.
5. Completar comunidades y su mini-feed cuando el contrato de publicaciones esté estable.

Actualizar esta tabla y los ejemplos en la misma tarea que cambie un controlador o un DTO. El código es la referencia de lo que funciona en la versión actual; este documento expresa también las decisiones pendientes.
