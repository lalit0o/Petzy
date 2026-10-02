# Petzy — documentación inicial del proyecto

**Versión documental:** 0.2 · **Estado:** borrador por capacidades para revisión · **Revisado:** 1 de octubre de 2026

## 1. Propósito y alcance

Petzy es una plataforma móvil para personas que tienen mascotas y para quienes las aman aunque no tengan una propia. Una persona puede crear una cuenta y participar en publicaciones, comunidades y eventos sin registrar una mascota (D-12). Quien tiene una mascota también puede crear su ficha. El MVP incluye chat privado uno a uno y, después de integrarlo, un apartado de adopción (D-14).

**Problema que resuelve:** hoy estas personas necesitan un lugar común para compartir contenido sobre mascotas, encontrar comunidades afines y, dentro del MVP acordado, ayudar a que animales que buscan hogar contacten con personas interesadas. Petzy reúne esos recorridos en una experiencia móvil donde tener una mascota propia no es requisito para participar.

**Resultado mínimo del MVP:** una persona puede crear su cuenta, entrar, consultar y publicar en el feed, reconocer a otros usuarios y sus mascotas cuando existan, participar en comunidades, conversar de forma privada y usar el apartado de adopción para encontrar hogar sin anuncios de venta. Cada recorrido debe funcionar con permisos, estados de error y criterios de aceptación de su ficha; una pantalla aislada no cumple el resultado.

Esta versión describe el producto deseado y el estado observable del repositorio. **Una funcionalidad propuesta en este documento no debe interpretarse como implementada.** Los requisitos con identificador sirven para convertir cada módulo en tareas y pruebas de aceptación.

El trabajo seguirá [SDD](SDD.md): este documento da la visión general, el [mapa de capacidades](../MAPA-CAPACIDADES.md) fija límites y dependencias, [DECISIONES.md](DECISIONES.md) registra acuerdos y [ESPECIFICACIONES/README.md](ESPECIFICACIONES/README.md) indexa fichas para revisión. La aprobación del mapa no aprueba automáticamente requisitos aún abiertos.

### Alcance por prioridad

| Prioridad | Funcionalidad | Resultado esperado |
| --- | --- | --- |
| Base del MVP | Cuenta, perfiles, mascotas, publicaciones, interacciones, comunidades, chat privado uno a uno y adopción | Flujos completos entre app, API y base de datos. Integrar primero el chat y después el contacto desde adopción. |
| Siguiente etapa del producto | Eventos con mapa y confirmación de asistencia | Coordinación de encuentros. |
| Opcional, si hay tiempo | Chats grupales; reconocimiento de raza canina con CNN | Ampliaciones que no condicionan la entrega de la base. |
| Posibilidad futura por especificar | Aportación opcional para gastos veterinarios en adopción | Solo se evaluará después del alcance inicial de adopción; no forma parte del MVP. |

### Adopción en el MVP

El MVP incluye un espacio específico para mascotas que buscan hogar, separado del feed general. Cualquier persona registrada puede crear una publicación con título, descripción y foto; quien publica indica cuando la mascota ya encontró hogar. Una persona interesada puede contactar al autor mediante el chat privado uno a uno, que debe estar integrado antes de completar adopción. El propósito es facilitar adopciones; no se permiten anuncios de venta. La [ficha de adopción](ESPECIFICACIONES/ADOPCION.md) mantiene abiertos los detalles de seguridad, moderación y funcionamiento antes de implementar.

Una aportación opcional para gastos veterinarios queda **únicamente como posibilidad futura**, posterior al MVP. No se define un campo de costo, precio, cobro ni integración de pagos. Su eventual inclusión dependerá de acordar qué gastos se permiten, cómo se comprueban y qué controles evitan ventas encubiertas (D-13).

### Personas interesadas y actores

| Grupo | Interés principal | Alcance confirmado o pendiente |
| --- | --- | --- |
| Personas con mascotas | Mostrar y cuidar sus fichas, compartir contenido y encontrar comunidad. | Público principal; registrar mascotas es opcional para usar otras funciones. |
| Amantes de las mascotas sin mascota propia | Explorar contenido, publicar y participar en comunidades y eventos. | Participación confirmada en D-12; no se les exige una ficha `Pet`. |
| Administradores y moderadores de comunidad | Organizar espacios y eventos. | Roles `ADMIN`, `MODERATOR` y `MEMBER` existentes; facultades de moderación adicionales pendientes. |
| Creadores y asistentes a eventos | Publicar encuentros, consultar ubicación y responder asistencia. | Permisos confirmados en D-05 y D-09. |
| Equipo que desarrolla y mantiene Petzy | Integrar app, API, Auth y datos sin perder seguridad ni coherencia. | Parte interesada técnica; las decisiones de producto corresponden al usuario y se registran en [DECISIONES.md](DECISIONES.md). |

**Actores del sistema:** visitante (registro e inicio), usuario autenticado con o sin mascota, administrador o moderador de comunidad y creador de evento. No se crea un rol técnico distinto para «amante sin mascota»; sus permisos se rigen por sesión, membresía y rol de comunidad.

## 2. Estado actual del repositorio

El monorepositorio usa `pnpm`. La app está en `apps/mobile` (Expo, React Native, Expo Router y TypeScript); la API está en `apps/backend` (NestJS y TypeScript). **Supabase Postgres es la base de datos elegida como destino del proyecto** y Supabase Auth gestiona identidades. El backend actual usa Prisma para acceder a la instancia PostgreSQL indicada por `DATABASE_URL`; en el entorno local revisado el 29-09-2026 esa variable apuntaba a `localhost`, no a Supabase Postgres. Docker Compose proporciona esa base local opcional para desarrollo. Las rutas privadas de la API pasan por un guard global que verifica un token; la app guarda el token con Expo SecureStore.

**Criterio de arquitectura:** antes de crear un servicio desde cero se revisará si una capacidad de Supabase cubre el caso: Auth para identidad, Storage para fotos, Data API para operaciones sencillas y Realtime para actualización en vivo. Son opciones de implementación, no funciones ya integradas. NestJS y Prisma siguen siendo válidos para reglas de negocio, transacciones y permisos que requieran una API propia. Si se usa acceso directo desde móvil a la Data API, se deben configurar y probar permisos y Row Level Security (RLS) por tabla y operación.

| Área | Existe actualmente | Falta para el alcance descrito |
| --- | --- | --- |
| Cuenta | Pantalla de registro e inicio de sesión; rutas protegidas en la app; endpoints de registro e inicio; cierre de sesión local. | Recuperación de contraseña, renovación o revalidación de sesión, perfil completo y edición segura. El botón «¿Olvidaste tu contraseña?» aún no ejecuta un flujo. |
| Perfil | Modelo `User` con correo, nombre de usuario, avatar, biografía y estado de México; pantalla que muestra datos básicos. | Vista completa, edición, consulta de perfiles y publicaciones; los endpoints de lectura de usuario aún contienen respuestas de ejemplo. |
| Mascotas | Modelo `Pet`, endpoints de crear, actualizar y desactivar; consulta de mascotas por usuario. | Pantalla funcional, detalle, foto, especie y raza. La pantalla actual es un marcador de posición. |
| Feed | Modelo `Post`, endpoints de crear, listar, consultar, editar y desactivar; modelo de comentarios y reacciones; endpoints de crear, editar y borrar comentarios. | Renderizado y creación desde la app, consulta de comentarios y endpoints de reacciones. La pantalla actual no carga ni muestra publicaciones. |
| Comunidades | Modelos, API y pantalla inicial de exploración, creación, membresía y detalle con publicaciones/eventos. | Completar búsqueda, paginación, publicación desde comunidad y administración de roles. |
| Eventos | Esquema, migración, API y pantallas iniciales con mapa, indicaciones y asistencia. | Aplicar migración en Supabase y probar flujo autenticado y dispositivo; completar portadas en Storage y avisos a asistentes. |
| Chat | No se observan modelos, endpoints ni pantallas. | Implementación completa del flujo uno a uno del MVP antes de integrar el contacto desde adopción. |
| Adopción | No se observan modelos, endpoints ni pantallas específicos. | Publicaciones del apartado de adopción, gestión de su estado y acceso al chat privado. |

**Notas de integración para las siguientes tareas:** `Pet` todavía no tiene especie ni raza y `Post` todavía no referencia una mascota. La ruta de mascotas de la navegación debe comprobarse al conectar la pantalla. La API ya tiene protección global de autenticación, pero algunas operaciones de mascotas y usuario aún necesitan autorización por propietario. Las rutas del apartado 6 son una propuesta de contrato; las rutas implementadas se enumeran en [API.md](API.md).

**Brechas concretas que conviene atender primero:** el controlador de inicio de sesión registra el DTO recibido, por lo que debe retirarse ese log antes de usar cuentas reales. El DTO de creación de mascota valida `ownerId` como entero aunque en el esquema es una cadena, y hoy acepta ese propietario desde el cuerpo de la solicitud. La búsqueda de usuarios devuelve registros completos, incluido el correo. El feed móvil todavía no ejecuta su función de carga y construye el encabezado `Bearer` sin el espacio requerido. Estos puntos se registran aquí como trabajo pendiente, no como comportamiento deseado.

## 3. Reglas generales del producto

- Toda creación, modificación o eliminación de contenido requiere sesión válida. El servidor obtiene la identidad del token, no de un `userId` o `ownerId` enviado por el cliente.
- Una cuenta puede participar sin tener mascotas registradas; no imponer `Pet` como requisito de acceso al feed, comunidades o eventos. La membresía y el rol siguen aplicando donde corresponda.
- Cada mascota pertenece a una cuenta. Solo su dueño puede modificarla o desactivarla.
- Las publicaciones pueden pertenecer al feed general o a una comunidad; el origen debe quedar claro en la interfaz. Una publicación dentro de una comunidad se consulta en su mini-feed.
- Una persona puede unirse una sola vez a cada comunidad. Quien la crea recibe el rol `ADMIN`; las acciones de moderación se autorizan según el rol.
- La eliminación de mascotas, publicaciones y comentarios se modela como desactivación cuando se necesita conservar integridad e historial. El contenido desactivado no aparece en consultas públicas.
- Los eventos y las conversaciones se vinculan a usuarios autenticados. La asistencia a un evento tiene un estado vigente por usuario; cambiar de «Iré» a «No iré» actualiza ese estado y su conteo.

## 4. Requisitos funcionales por módulo

### 4.1 Cuenta y perfil de usuario

**RF-A01 Registro.** El visitante crea una cuenta con nombre de usuario único, correo único, contraseña y estado de residencia en México. No necesita registrar una mascota. El formulario valida campos, informa errores sin exponer datos sensibles y muestra confirmación de registro.

**RF-A02 Inicio y fin de sesión.** El usuario inicia sesión con correo y contraseña; al cerrar sesión se borra el token local y vuelve al acceso público. Las pantallas privadas exigen sesión válida.

**RF-A03 Recuperación de acceso.** El usuario puede solicitar restablecer su contraseña desde el formulario de inicio. La confirmación no revela si un correo está registrado.

**RF-P01 Ver perfil.** El usuario ve su propio perfil, mascotas y publicaciones. Una persona registrada puede buscar y abrir el perfil de otra, con datos generales y mascotas activas relacionadas; no se muestran correo, credenciales ni datos privados. Los campos públicos exactos se cierran en la especificación de perfil.

**RF-P02 Editar perfil.** El propietario puede actualizar nombre de usuario, avatar, biografía y estado. Los cambios de correo o contraseña se realizan mediante el proveedor de autenticación y requieren el flujo de verificación que corresponda.

**RF-P03 Buscar usuarios.** Búsqueda por nombre de usuario con resultados limitados y paginados; no se expone el correo de otras personas.

**Criterios de aceptación:** no se crean cuentas duplicadas; una credencial incorrecta no abre pantallas privadas; tras cerrar sesión no se puede usar el token local; el perfil de otra cuenta no permite edición; los datos visibles coinciden con el servidor.

### 4.2 Mascotas

**RF-M01 Registrar mascota.** El dueño captura nombre, especie, raza, fecha de nacimiento y foto. El sistema calcula la edad con la fecha actual en vez de guardar una edad fija. La obligatoriedad de raza y foto y la migración de registros que ya tengan edad numérica se resolverán antes de cambiar el esquema.

**RF-M02 Mis mascotas.** Se muestra una lista de mascotas activas de la cuenta, con acceso a su ficha individual.

**RF-M03 Consultar y editar ficha.** La ficha presenta todos los datos registrados y permite al dueño corregirlos, cambiar la foto y añadir una breve descripción.

**RF-M04 Desactivar mascota.** El dueño puede retirar una ficha con confirmación previa. Se define antes de implementar cómo aparecen las publicaciones históricas asociadas a esa mascota.

**Criterios de aceptación:** una mascota nueva aparece en «Mis mascotas»; otra cuenta no puede modificarla; los campos y la foto persisten tras reiniciar la app; las mascotas desactivadas no aparecen en la lista normal.

### 4.3 Feed y publicaciones

**RF-F01 Feed principal.** Lista solo publicaciones activas con `communityId = null` en orden reciente, con paginación y estados de carga, vacío y error. Una publicación muestra autor, fecha, texto y foto si existe. Las publicaciones con `communityId` se consultan únicamente en el mini-feed de su comunidad.

**RF-F02 Publicar.** El usuario crea una publicación con contenido de texto y foto opcional. Puede asociarla a una de sus mascotas si se decide incluir esa relación. Los tipos existentes en el modelo son `GENERAL`, `TIP`, `QUESTION` y `LOST_PET`; la interfaz debe explicar o restringir su uso.

**RF-F03 Gestionar publicación propia.** El autor puede editar o desactivar su publicación; el resto solo puede verla o interactuar según permisos.

**RF-F04 Interactuar.** Un usuario puede dar o quitar un like en publicaciones generales o comunitarias y crear comentarios. Puede editar o desactivar sus comentarios. Los conteos se actualizan de forma coherente con el servidor.

**RF-F05 Detalle.** Al abrir una publicación se ven su contenido, comentarios y estado de reacción. Si pertenece a una comunidad, se identifica esa comunidad.

**Criterios de aceptación:** el autor se obtiene de la sesión; una publicación nueva aparece en el feed correcto; un usuario no puede editar contenido ajeno; cada usuario tiene a lo sumo una reacción por publicación; el feed no muestra contenido desactivado.

### 4.4 Comunidades

**RF-C01 Explorar y buscar.** Listar comunidades por nombre o tema, con descripción, imagen y número de miembros.

**RF-C02 Crear comunidad.** Cualquier usuario autenticado puede crear una comunidad con nombre, descripción, tema y foto opcional; pasa a ser administrador y primer miembro.

**RF-C03 Unirse y salir.** El usuario puede unirse o salir de una comunidad; la interfaz indica su estado de membresía. Se debe definir qué ocurre si el administrador único intenta salir.

**RF-C04 Mini-feed.** Cada comunidad muestra solo sus publicaciones activas. Para publicar en ella se requiere membresía; el backend verifica esa condición.

**RF-C05 Administración.** El administrador puede editar datos de la comunidad y gestionar roles. El moderador puede crear eventos; sus demás facultades y el tratamiento de contenido reportado quedan definidos antes de abrir comunidades al público.

**RF-C06 Detalle de comunidad.** Al abrir una comunidad se muestran dos secciones: «Publicaciones», con su mini-feed, y «Eventos», con encuentros exclusivos de esa comunidad. Cualquier usuario registrado puede consultar eventos; solo miembros `ADMIN` y `MODERATOR` pueden crearlos, y solo miembros pueden responder asistencia (D-09).

**Criterios de aceptación:** el creador figura como `ADMIN`; no hay membresías duplicadas; una publicación aparece solo en el contexto que le corresponde; los eventos de una comunidad no aparecen en otra; una cuenta sin permiso no puede publicar ni administrar la comunidad ni crear eventos.

### 4.5 Eventos (siguiente etapa)

**RF-E01 Crear evento.** Un `ADMIN` o `MODERATOR` de la comunidad define título, descripción, foto de portada opcional, fecha, hora, zona horaria y lugar. El evento guarda coordenadas para señalar la ubicación exacta en un mapa integrado; pertenece obligatoriamente a esa comunidad.

**RF-E02 Consultar eventos.** En la sección «Eventos» de la comunidad se muestran tarjetas con foto o imagen de respaldo, título, fecha, hora y lugar breve. Al pulsar una tarjeta se abre el detalle con descripción completa, creador, confirmación de asistencia y mapa con marcador. Si el mapa no carga, la dirección sigue visible.

**RF-E03 Confirmar asistencia.** Cada usuario elige «Iré» o «No iré» y puede cambiar su decisión; se muestra el total actualizado de asistentes confirmados.

**RF-E04 Gestionar evento propio.** El creador puede editar o cancelar el encuentro y se informa el cambio a quienes confirmaron asistencia.

**Criterios de aceptación:** un miembro `MEMBER` no puede crear eventos; no se publica un evento sin fecha futura o ubicación válida; un usuario cuenta una sola vez; el mapa apunta a las coordenadas guardadas; un evento cancelado indica su estado. El detalle de esquema, rutas y decisiones abiertas está en [ESPECIFICACIONES/COMUNIDADES-EVENTOS.md](ESPECIFICACIONES/COMUNIDADES-EVENTOS.md).

### 4.6 Chat privado (MVP; previo a adopción)

**RF-CH01 Conversación uno a uno.** Un usuario puede iniciar o abrir una conversación privada con otro usuario, sin generar duplicados para el mismo par.

**RF-CH02 Mensajes.** Enviar, recibir y consultar mensajes de texto ordenados por fecha, con estado de envío y control de acceso solo para participantes.

**RF-CH03 Bandeja.** Listar conversaciones recientes y abrir su historial con paginación. Se define la política de bloqueo, reporte y retención antes de habilitar chat público.

**Criterios de aceptación:** terceros no pueden leer la conversación; un mensaje enviado aparece una sola vez; el historial reaparece al reiniciar sesión.

### 4.7 Adopción (MVP; después del chat privado)

**RF-AD01 Publicar para encontrar hogar.** Cualquier persona registrada puede publicar una mascota en un apartado propio de adopción, con título, descripción y foto. Estas publicaciones se consultan en su espacio específico, sin mezclarse con el feed general o los mini-feeds comunitarios.

**RF-AD02 Indicar que encontró hogar.** El autor puede marcar su publicación cuando la mascota ya encontró hogar. Debe distinguirse con claridad de las publicaciones de mascotas que aún buscan familia. El texto exacto y la visibilidad de publicaciones cerradas se decidirán antes de implementar.

**RF-AD03 Contactar al autor.** Desde una publicación, la persona interesada puede abrir o iniciar un chat privado uno a uno con quien publicó. El chat muestra a esa persona y no requiere un nombre personalizado. Esta integración se realiza después de completar el chat privado.

**RF-AD04 Prevenir ventas.** El apartado está destinado a encontrar hogares, no a comercializar mascotas. Las reglas de moderación, reportes y prevención de ventas encubiertas se cerrarán antes de implementar.

**Criterios de aceptación:** una cuenta sin mascota propia puede publicar; la publicación aparece solo en el apartado de adopción; solo su autor cambia el estado; el acceso de contacto abre el chat con el autor correcto; no se ofrecen campos de precio ni cobro en el MVP. Ver [ADOPCION.md](ESPECIFICACIONES/ADOPCION.md).

### 4.8 Opcionales

- **Chats grupales:** grupos con participantes y reglas de administración. Se diseñan después de estabilizar el chat uno a uno.
- **Detección de raza canina con CNN:** al registrar un perro, el usuario puede solicitar una sugerencia a partir de una foto. El resultado muestra confianza y permite corregir la raza manualmente; nunca se guarda como diagnóstico ni sustituye la decisión del usuario.

## 5. Modelo de datos y cambios previstos

| Entidad | Estado actual | Ajuste previsto |
| --- | --- | --- |
| `User` | Identidad, correo, nombre, avatar, biografía, estado, actividad. | Política de datos públicos y edición sincronizada con Supabase Auth. |
| `Pet` | Dueño, nombre, edad numérica, foto, biografía, actividad. | Especie, raza y fecha de nacimiento para calcular edad; decidir migración de edades existentes y validar propiedad. |
| `Post` | Autor, comunidad opcional, tipo, título, descripción, foto, fecha, actividad. | Asociación opcional con mascota si se aprueba; paginación e índices del feed. |
| `Comment`, `PostLike` | Relación con usuario y publicación. | Listado de comentarios y operaciones de reacción. |
| `Community`, `CommunityMember` | Datos de comunidad, roles `ADMIN`, `MODERATOR`, `MEMBER` y membresía. | Tema o categoría, creador o regla de administración, API y permisos. |
| `Event`, `EventAttendance` | Esquema y migración aplicada a PostgreSQL local; despliegue en Supabase y pruebas de dispositivo pendientes. | Evento vinculado obligatoriamente a una comunidad, portada opcional, coordenadas, lugar, fecha con zona horaria, estado y asistencia única por usuario. |
| `Conversation`, `Message` | No existen. | Participantes, mensajes, fechas, índices y reglas de acceso. |

Adopción es una capacidad del MVP, pero su representación en datos sigue abierta. No se ha decidido si reutilizar `Post` o crear un modelo específico; [ADOPCION.md](ESPECIFICACIONES/ADOPCION.md) exige separar sus consultas de las del feed general y consultar antes de cualquier migración.

Relaciones principales: `User 1:N Pet`, `User 1:N Post`, `Community 1:N Post`, `User N:M Community` mediante `CommunityMember`, `Post 1:N Comment`, `User N:M Post` mediante `PostLike`. Para eventos: `User 1:N Event` y `User N:M Event` mediante asistencia. Para chat: dos usuarios por conversación y muchos mensajes por conversación.

Para las fotos, evaluar primero Supabase Storage; la base de datos conserva una referencia al archivo. Definir buckets, permisos, límites de tamaño, formatos admitidos, visibilidad y borrado antes de habilitar cargas. Para chat y otras actualizaciones en vivo, evaluar Supabase Realtime antes de implementar un transporte propio.

## 6. Contratos de API a completar

Esta tabla mezcla operaciones ya presentes en código con rutas objetivo para planificar módulos. Consulte [API.md](API.md) para distinguir rutas presentes, verificadas y propuestas. Reutilizar las rutas existentes cuando sean adecuadas y acordar un formato uniforme de respuestas y errores.

| Módulo | Operaciones previstas |
| --- | --- |
| Cuenta y perfil | `POST /auth/sign-up`, `POST /auth/sign-in`, recuperación de contraseña, `GET/PATCH /users/me`, `GET /users/:id`, búsqueda de usuarios. |
| Mascotas | `POST /pets`, `GET /users/me/pets`, `GET/PATCH/DELETE /pets/:id`, fecha de nacimiento y carga de foto. |
| Feed | `GET/POST /posts`, `GET/PATCH/DELETE /posts/:id`, `GET/POST /posts/:id/comments`, `PATCH/DELETE /posts/:id/comments/:commentId`, `PUT/DELETE /posts/:id/like`. |
| Comunidades | `GET/POST /communities`, `GET/PATCH /communities/:id`, `POST/DELETE /communities/:id/members/me`, `GET/POST /communities/:id/posts`. |
| Eventos | `GET/POST /communities/:communityId/events`, `GET/PATCH /events/:id`, `PUT /events/:id/attendance`. |
| Chat | `GET/POST /conversations`, `GET /conversations/:id/messages`, `POST /conversations/:id/messages`; definir transporte en tiempo real. |
| Adopción | Contrato por definir en su ficha y plan; el contacto reutiliza el chat privado. No hay rutas actuales ni propuestas con forma definitiva. |

Convenciones a fijar en la implementación: autenticación `Authorization: Bearer <token>` en rutas privadas; identificadores y errores consistentes; fechas en ISO 8601 con zona horaria; filtros y paginación para listados; validación del lado del servidor.

## 7. Requisitos no funcionales

### Seguridad y privacidad

- **RNF-S01:** todas las operaciones privadas verifican autenticación y autorización por recurso. El servidor ignora identificadores de propietario enviados por el cliente al crear datos propios.
- **RNF-S02:** contraseñas y cambios de credenciales se gestionan por Supabase Auth. No se registran contraseñas, tokens ni cuerpos de inicio de sesión en logs.
- **RNF-S03:** usar HTTPS en entornos publicados; guardar tokens en almacenamiento seguro del dispositivo y manejar expiración, renovación y cierre de sesión.
- **RNF-S04:** validar tipo, tamaño y contenido permitido en cada entrada y archivo; limitar solicitudes de acceso, registro, búsqueda, publicación y chat para reducir abuso.
- **RNF-S05:** mostrar el mínimo de datos personales. Correo y ubicación precisa no se exponen en perfiles públicos; la ubicación del evento se publica solo cuando el creador confirma que desea compartirla.
- **RNF-S06:** registrar eventos de seguridad sin datos sensibles, definir retención y borrado de datos y ofrecer mecanismos para reportar y moderar contenido.

### Interfaz y accesibilidad

- **RNF-I01:** navegación consistente entre Inicio, Comunidades, Mascotas y Perfil, con etiquetas visibles o accesibles para los iconos.
- **RNF-I02:** cada pantalla de datos ofrece estados de carga, vacío, error y reintento; las acciones destructivas piden confirmación y las acciones exitosas dan respuesta clara.
- **RNF-I03:** admitir distintos tamaños de pantalla, áreas seguras, teclado, tamaños de texto del sistema y contraste suficiente. Los controles táctiles deben ser fáciles de pulsar.
- **RNF-I04:** fotos con texto alternativo o descripción accesible; el mapa siempre se acompaña de una dirección textual. La información no depende solo del color.
- **RNF-I05:** mantener lenguaje y formatos coherentes en español; presentar hora local del evento junto con su zona horaria cuando haya participantes de otras zonas.

La [especificación de diseño de la app](ESPECIFICACIONES/DISENO-APP.md) convierte estas condiciones generales en criterios de revisión de navegación, sistema visual, estados, accesibilidad y prototipo. Está en borrador documental y su implementación se dejó para una etapa posterior por indicación del usuario.

### Calidad y operación

- **RNF-Q01:** paginar publicaciones, comunidades, comentarios, eventos y mensajes; evitar cargar listas completas en memoria.
- **RNF-Q02:** manejar fallas de red sin perder silenciosamente formularios; mostrar reintento y evitar duplicados al repetir una operación.
- **RNF-Q03:** definir una meta medible de rendimiento antes de cada entrega (por ejemplo, tiempo de apertura del feed con una cantidad de datos de prueba acordada) y verificarla en dispositivos objetivo.
- **RNF-Q04:** mantener migraciones de base de datos versionadas, pruebas de permisos y flujos críticos, y configuración por entorno sin secretos en el repositorio.
- **RNF-Q05:** monitorear errores de API y app y documentar respaldo, restauración y despliegue antes de producción.

## 8. Orden de capacidades y puertas de revisión

El [mapa](../MAPA-CAPACIDADES.md) es el índice de IDs estables y dependencias. La [ruta de desarrollo](RUTA-DE-DESARROLLO.md) es la fuente para el orden secuencial, estado integrado y enlace a cada ficha. Cada ficha es todavía un borrador de contrato hasta revisión humana.

`diseno-app` define los fundamentos visuales y de interacción que usarán las pantallas de estas capacidades. Su ficha se redactó para revisión; por indicación del usuario, el rediseño de pantallas se realizará más adelante y no se incluye como trabajo de código en esta fase.

1. **Cuenta e inicio de sesión:** cerrar registro, recuperación, sesión y seguridad.
2. **Feed y publicaciones:** completar lectura, creación, separación de contexto, fotos y permisos.
3. **Perfiles:** cerrar consulta pública, búsqueda, edición y campos visibles.
4. **Mascotas:** resolver migración de edad, propiedad, foto, lista y ficha.
5. **Interacciones:** completar comentarios y likes sobre contenido visible.
6. **Comunidades:** completar membresía, roles, búsqueda y mini-feed.
7. **Chat privado:** implementar conversaciones uno a uno persistentes y sus permisos.
8. **Adopción:** integrar publicaciones y contacto después de verificar el chat.
9. **Eventos:** terminar migración, mapa y asistencia; etapa posterior al MVP.

Chats grupales y CNN son opcionales. La posible aportación veterinaria se evalúa en una etapa futura separada.

Cada capacidad pasa por revisión de especificación, plan y tareas antes de nueva implementación. Se considera terminada solo con flujo completo: migración/modelo cuando aplique, API y autorización, pantalla, estados de error, pruebas de aceptación y documentación actualizada. No basta con una pantalla o una tabla aislada.

## 9. Decisiones pendientes

- ¿Cómo se migrarán mascotas existentes que solo tienen edad numérica a una fecha de nacimiento sin inventar un cumpleaños exacto?
- ¿Las publicaciones podrán vincularse opcionalmente a una mascota? El feed general y los mini-feeds comunitarios ya están definidos como separados.
- ¿Las comunidades serán siempre públicas o algunas necesitarán aprobación para entrar? Esto cambia permisos y flujo de membresía.
- El mapa inicial usa `react-native-maps` y abre indicaciones en la app de mapas del dispositivo; falta configurar clave de Google Maps para binarios Android publicados. Definir Storage para portadas.
- Solo se muestra el total de asistentes, no su lista nominal. Aún faltan los campos exactos visibles de perfiles de otros usuarios.
- ¿Se permiten mensajes entre cualquier par de usuarios o se necesita invitación/aceptación? Resolver junto con bloqueo y reportes.
- En adopción: cerrar la política contra ventas, moderación y reportes; decidir el estado visible cuando una mascota encuentra hogar y cómo representar las publicaciones en datos sin mezclarlas con el feed normal. La posible aportación veterinaria queda para una etapa futura.

## 10. Referencias internas del código

- App móvil: `apps/mobile/app`, `apps/mobile/hooks/useAuth.ts`, `apps/mobile/context/AuthContext.tsx`.
- API: `apps/backend/src/auth`, `apps/backend/src/user`, `apps/backend/src/pet`, `apps/backend/src/post`, `apps/backend/src/comments`.
- Datos y migraciones: `apps/backend/prisma/schema.prisma`, `apps/backend/prisma/migrations`.

Al iniciar cada módulo, revisar estas rutas y actualizar la tabla de estado para reflejar lo que realmente quedó implementado.
