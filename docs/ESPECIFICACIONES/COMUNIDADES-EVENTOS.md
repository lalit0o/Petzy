# Especificación: eventos en comunidades (`eventos`)

**Contrato:** borrador, pendiente de revisión · **Código:** en implementación; migración solo en PostgreSQL local y sin prueba integral en dispositivo · **Prioridad:** etapa posterior, paso 9 · **Depende de:** `comunidades` · **Alcance:** eventos y asistencia · **Revisado:** 1 de octubre de 2026. [Mapa](../../MAPA-CAPACIDADES.md).

El esquema, las rutas y las pantallas iniciales ya están en el repositorio. La migración se aplicó a PostgreSQL local (`localhost:5435`) el 29-09-2026; no se aplicó a Supabase. Hasta probar el flujo autenticado en dispositivo, la función no tiene estado «Verificada».

**Decisiones confirmadas:** los eventos pertenecen a comunidades; solo `ADMIN` y `MODERATOR` pueden crearlos; la pantalla se divide en «Publicaciones» y «Eventos»; la lista usa tarjetas y el detalle incluye mapa. Los usuarios registrados pueden verlos y solo los miembros confirmar asistencia. El creador y `ADMIN` pueden editar/cancelar. Se registran en [DECISIONES.md](../DECISIONES.md).

## Objetivo y navegación

Las personas registradas consultan encuentros de sus comunidades y, cuando su rol o membresía lo permite, los organizan o responden asistencia. El lugar se entiende tanto con mapa como con texto.

## Contrato de flujos

**Consultar eventos de una comunidad (RF-E02; CE-02–CE-04, CE-06).** Actor: usuario autenticado, tenga o no mascota. Precondición: comunidad existente. Entradas: ID de comunidad, paginación e ID de evento para detalle. Resultado: tarjetas de esa comunidad y detalle con fecha, lugar legible y mapa con marcador; el mapa fallido conserva la dirección textual. Errores: evento ausente, API o mapa inaccesible; mostrar estado y reintento cuando aplique.

**Crear evento (RF-E01; CE-01, CE-02, CE-04).** Actor: miembro `ADMIN` o `MODERATOR` de la comunidad. Entradas: título, descripción, fecha/hora con zona, lugar y coordenadas; portada opcional. El servidor valida rol, fecha futura y coordenadas. Resultado: evento vinculado solo a esa comunidad. Errores: permiso denegado, datos inválidos o API fallida, conservando el formulario. La carga de portada a Storage sigue **pendiente**.

**Responder asistencia (RF-E03; CE-05–CE-06).** Actor: miembro autenticado. Entradas: evento y respuesta «Iré»/«No iré». Resultado: un estado vigente por persona y conteo actualizado de «Iré». Un usuario registrado sin membresía puede consultar, pero no responder. Errores: membresía inválida, evento cancelado o red fallida, con respuesta visible junto a la acción.

**Editar o cancelar (RF-E04; CE-07).** Actor: creador o `ADMIN` de la comunidad. Precondición: evento existente. Entradas: cambios permitidos o cancelación. Resultado: detalle actualizado o cancelado; el manejo de avisos a asistentes continúa **pendiente**. El servidor deniega a terceros y no reabre un evento cancelado.

Aplican especialmente RNF-S01, RNF-S05, RNF-I02–I05 y RNF-Q01–Q02 de [PROYECTO.md](../PROYECTO.md). El código inicial y sus límites se detallan más abajo.

### Navegación descrita en el código y en las decisiones confirmadas

Al abrir una comunidad, la persona encuentra dos secciones dentro de su detalle:

1. **Publicaciones:** mini-feed exclusivo de esa comunidad (`Post.communityId = id`), con sus likes y comentarios.
2. **Eventos:** encuentros de esa comunidad, listados por fecha próxima. Cada tarjeta muestra foto de portada (o una imagen de respaldo), título, fecha y hora, y nombre breve del lugar. Al pulsarla se abre el detalle.

La sección Eventos muestra una acción «Crear evento» solo a miembros con rol `ADMIN` o `MODERATOR`. El creador de la comunidad recibe `ADMIN`; `MEMBER` no puede crear eventos. El backend verifica el rol en cada creación aunque el botón esté oculto.

El detalle presenta foto, título, descripción, fecha y hora con zona horaria, nombre o dirección del lugar, mapa con marcador en las coordenadas guardadas, creador, total de asistentes confirmados y las acciones «Iré» / «No iré». Si el mapa no carga, el lugar sigue siendo legible. Un evento cancelado conserva su detalle con estado visible y no acepta nuevas confirmaciones.

## Reglas y criterios de aceptación

| ID | Regla | Comprobación |
| --- | --- | --- |
| CE-01 | Solo `ADMIN` y `MODERATOR` de la comunidad pueden crear eventos. | Una cuenta `MEMBER` o ajena recibe denegación al invocar la API, además de no ver la acción. |
| CE-02 | Un evento pertenece a una comunidad. | En el listado de la comunidad A no aparece un evento de B. |
| CE-03 | La tarjeta resume el evento; el detalle muestra la información completa y el mapa. | La tarjeta incluye imagen, título y horario; al abrirla aparecen descripción, lugar y marcador correcto. |
| CE-04 | Fecha y lugar son datos explícitos. | Se rechaza una fecha inicial pasada, coordenadas fuera de rango o falta de dirección legible. |
| CE-05 | Cada usuario tiene una sola respuesta vigente por evento. | Cambiar de «Iré» a «No iré» actualiza la misma respuesta; el conteo incluye solo «Iré». |
| CE-06 | Tener una mascota no es requisito para consultar o responder asistencia. | Una cuenta sin mascota consulta el evento y, al ser miembro de la comunidad, responde; una cuenta no miembro no puede responder. |
| CE-07 | Solo el creador o un `ADMIN` de la comunidad puede editar o cancelar un evento. | Un tercero recibe denegación en la API; un evento cancelado conserva detalle visible y no acepta nuevas asistencias. Los avisos a asistentes siguen pendientes de decisión. |

## Esquema de datos implementado en Prisma y migración local

Estas columnas ya están definidas en Prisma y en una migración versionada aplicada **solo a PostgreSQL local**. Son tablas nuevas y no requieren rellenar filas anteriores.

| Tabla | Columna y tipo en Prisma | Nulabilidad y propósito |
| --- | --- | --- |
| `Event` | `id` entero autogenerado | Obligatorio; mantiene el tipo de ID usado por `Community` y `Post`. |
| `Event` | `communityId` entero, FK a `Community` | Obligatorio; delimita listado, permisos y futuro mini-calendario. |
| `Event` | `creatorId` cadena, FK a `User` | Obligatorio; se obtiene del token, nunca del cuerpo enviado por la app. |
| `Event` | `title` texto corto; `description` texto | Obligatorios; nombre y explicación del encuentro. |
| `Event` | `coverImagePath` texto | Opcional; la app inicial acepta una URL HTTPS. La carga validada a Supabase Storage está pendiente; la tarjeta usa respaldo si falta. |
| `Event` | `startsAt` fecha y hora con zona; `endsAt` fecha y hora con zona | Inicio obligatorio; fin opcional, siempre posterior al inicio si existe. |
| `Event` | `timeZone` identificador de zona horaria | Obligatorio; permite mostrar la hora anunciada por el organizador. |
| `Event` | `placeLabel` texto; `latitude` y `longitude` decimales | Obligatorios; texto accesible y posición del marcador. Validar latitud `-90..90` y longitud `-180..180`. |
| `Event` | `status` enum `PUBLISHED` / `CANCELLED` | Obligatorio, valor inicial `PUBLISHED`; permite cancelar sin borrar el historial. |
| `Event` | `createdAt`, `updatedAt` | Obligatorios; auditoría básica y orden estable. |
| `EventAttendance` | `eventId`, `userId` | Clave primaria compuesta; evita respuestas duplicadas. |
| `EventAttendance` | `status` enum `GOING` / `NOT_GOING`; `respondedAt` | Obligatorios; estado vigente y momento de la última decisión. |

Índices presentes en Prisma y la migración local: `(communityId, status, startsAt, id)` para eventos próximos y `(eventId, status)` para contar «Iré». Para una búsqueda futura por distancia se evaluará PostGIS; no se necesita para colocar un marcador a partir de dos coordenadas.

## Contrato de API implementado en código

| Operación | Ruta presente en código | Permiso |
| --- | --- | --- |
| Listar eventos de una comunidad | `GET /communities/:communityId/events?cursor=...` | Usuario registrado; el código muestra eventos publicados próximos de esa comunidad. |
| Crear evento | `POST /communities/:communityId/events` | `ADMIN` o `MODERATOR` de esa comunidad. |
| Abrir detalle | `GET /events/:id` | Usuario registrado; un evento cancelado conserva su detalle. |
| Editar o cancelar | `PATCH /events/:id` | Creador del evento o `ADMIN` de su comunidad, según decisión D-09. |
| Confirmar asistencia | `PUT /events/:id/attendance` con `GOING` o `NOT_GOING` | Miembro de la comunidad, según decisión D-09. |

Todas las consultas deben limitarse a eventos de la comunidad solicitada, paginar listados y devolver el horario en un formato inequívoco. El servicio de mapas solo representa las coordenadas; una búsqueda de direcciones para elegir el lugar sería una integración adicional.

## Estado por capa y trabajo pendiente

- **Base de datos:** `Event`, `EventAttendance`, relaciones e índices están en Prisma y en una migración versionada aplicada a PostgreSQL local. No se ha comprobado su aplicación en Supabase. `Post` no representa eventos.
- **Backend:** las rutas, validaciones, roles y conteo están en NestJS/Prisma; faltan pruebas autenticadas de extremo a extremo. NestJS es la ruta de escritura actual.
- **Archivos:** falta decidir bucket y política de Supabase Storage para portadas. La app usa imagen de respaldo.
- **Móvil:** existen detalle de comunidad con secciones, tarjetas, formulario, detalle con mapa y asistencia; falta recorrido real en dispositivo.
- **Verificación:** probar acceso con `ADMIN`, `MODERATOR`, `MEMBER` y no miembro; separación de comunidades, zona horaria, mapa sin conexión y actualización del conteo.

## Integración y límites de la primera versión

- `react-native-maps` dibuja un marcador a partir de las coordenadas; «Cómo llegar» abre Apple Maps en iOS o un enlace de Google Maps en Android. No se usa geocodificación ni se calculan rutas dentro de Petzy.
- La portada es opcional: la app acepta una URL HTTPS y usa imagen de respaldo si no hay portada. Aún falta un flujo de carga validada a Supabase Storage.
- El formulario solicita nombre del lugar y coordenadas manuales; la elección tocando el mapa o por búsqueda de dirección queda para otra especificación.
- La edición móvil inicial permite cambiar título, descripción y lugar. La API también acepta cambios de horario; falta una experiencia de aviso a asistentes antes de ofrecerla en la app. La cancelación deja el detalle visible y bloquea nuevas confirmaciones.
- La lista de eventos está paginada en la API (`nextCursor`) y la pantalla ofrece «Ver más eventos». No hay notificaciones a asistentes.
- [PLAN.md](COMUNIDADES-EVENTOS/PLAN.md) y [TAREAS.md](COMUNIDADES-EVENTOS/TAREAS.md) registran lo implementado y lo pendiente de verificar.

## Tecnología y estructura

Expo 57, React Native, Expo Router y `react-native-maps` en `apps/mobile/app/communities` y `app/events`; NestJS 11 en `apps/backend/src/events`; Prisma 7 con `Event` y `EventAttendance` en `apps/backend/prisma/schema.prisma` y la migración `20260929120000_add_community_events`. Pruebas Jest junto al servicio (`*.spec.ts`) y E2E en `apps/backend/test`. Supabase Storage para portadas aún no está integrado.

## Comandos

Desde la raíz: desarrollo `pnpm backend` y `pnpm mobile`; compilación `pnpm backend:build`; unitarias `pnpm --filter proyecto-backend test -- --runInBand`; E2E con entorno preparado `pnpm --filter proyecto-backend test:e2e -- --runInBand`; revisión móvil `pnpm --filter mobile lint`. Para consultar migraciones en el backend: `pnpm --filter proyecto-backend exec prisma migrate status`, después de identificar la base por `DATABASE_URL`.

## Estilo de código

TypeScript, DTO para entradas, clases `PascalCase`, propiedades `camelCase`, fecha ISO y zona horaria explícita. Unicidad de asistencia expresada en Prisma:

```prisma
@@id([eventId, userId])
```

El creador se deriva del token validado y el rol se comprueba en el servidor.

## Estrategia de pruebas

Unitarias para rol, fecha, coordenadas, cancelación y conteo; E2E con `ADMIN`, `MODERATOR`, `MEMBER` y no miembro; recorrido en dispositivo de tarjeta, detalle, mapa, indicaciones, asistencia, cambio de zona, API apagada y reintento. Verificar migración en el entorno Supabase antes de usarlo. La compilación o el mapa renderizado no sustituyen la prueba autenticada completa.

La cobertura exigida para aprobar esta capacidad es evidencia de CE-01 a CE-07, incluida migración en el entorno objetivo y recorrido real en dispositivo; no se fija un porcentaje global de líneas.

## Límites de actuación

- **Siempre:** comprobar rol y membresía en API, conservar lugar legible cuando el mapa falle, contar solo `GOING` y separar eventos por comunidad.
- **Consultar antes:** flujo de Storage, selección de ubicación por búsqueda o mapa, avisos a asistentes y cambios de contratos o columnas.
- **Nunca:** anunciar como verificado el despliegue en Supabase o dispositivo sin evidencia, ni exponer una lista nominal de asistentes.

## Preguntas abiertas y puerta de avance

Las reglas de visibilidad y asistencia de esta primera versión están confirmadas en D-09. Siguen abiertos la carga segura de portada, la selección de coordenadas y los avisos al editar o cancelar. El [plan](COMUNIDADES-EVENTOS/PLAN.md) y las [tareas](COMUNIDADES-EVENTOS/TAREAS.md) existentes documentan trabajo iniciado; necesitan revisión contra esta ficha antes de continuar con funcionalidades nuevas. La función permanece «En implementación» hasta verificar migración, API autenticada y dispositivo.

Según D-12, una persona registrada sin mascota puede consultar eventos y, si pertenece a la comunidad, responder asistencia; la creación y gestión mantienen los requisitos de rol y autor.
