# Petzy — documentación inicial del proyecto

**Versión documental:** 0.3 · **Estado:** visión general; fichas, planes y tareas por capacidad revisados por separado · **Última actualización:** 18 de octubre de 2026

## 1. Propósito y alcance

Petzy es una plataforma móvil para personas que tienen mascotas y para quienes las aman aunque no tengan una propia. Una persona puede crear una cuenta y participar en publicaciones, comunidades y eventos sin registrar una mascota (D-12). Quien tiene una mascota también puede crear su ficha. El MVP incluye chat privado uno a uno y, después de integrarlo, un apartado de adopción (D-14).

**Problema que resuelve:** hoy estas personas necesitan un lugar común para compartir contenido sobre mascotas, encontrar comunidades afines y, dentro del MVP acordado, ayudar a que animales que buscan hogar contacten con personas interesadas. Petzy reúne esos recorridos en una experiencia móvil donde tener una mascota propia no es requisito para participar.

**Resultado mínimo del MVP:** una persona puede crear su cuenta, entrar, consultar y publicar en el feed, reconocer a otros usuarios y sus mascotas cuando existan, participar en comunidades, conversar de forma privada y usar el apartado de adopción para encontrar hogar sin anuncios de venta. Cada recorrido debe funcionar con permisos, estados de error y criterios de aceptación de su ficha; una pantalla aislada no cumple el resultado.

Esta versión describe el producto deseado y el estado observable del repositorio. **Una funcionalidad propuesta en este documento no debe interpretarse como implementada.** Los requisitos con identificador sirven para convertir cada módulo en tareas y pruebas de aceptación.

### Cómo leer los requisitos

Cada requisito explica lo que una persona podrá hacer en Petzy. Las fichas de [especificaciones](ESPECIFICACIONES/00-INDICE.md) añaden qué ocurre si falla una acción y cómo se comprobará que funciona. «Pendiente» significa que todavía no se ha decidido ese detalle; no se debe presentar como una función disponible.

- **Cuenta de acceso o identidad:** el registro que permite entrar con correo y contraseña. Lo administra Supabase Auth.
- **Perfil de Petzy:** los datos que usa la app para identificar a esa persona, como nombre de usuario y estado de residencia. Se guardan por separado de la cuenta de acceso.
- **Sesión:** el permiso temporal para seguir usando la app después de entrar. Cuando vence, Petzy puede intentar renovarlo.
- **API:** la parte del servidor que recibe solicitudes de la app, comprueba permisos y devuelve datos.
- **Feed:** la lista de publicaciones de Inicio. El **mini-feed** es la lista de publicaciones dentro de una comunidad. La categoría indica de qué trata una publicación; es distinta del lugar donde se publica.
- **Paginación:** mostrar una parte de una lista y cargar más cuando la persona lo pida o llegue al final.
- **Criterio de aceptación:** una comprobación concreta que debe pasar antes de considerar terminada una función.

Los nombres de tablas, rutas y campos aparecen en las secciones técnicas para que el equipo pueda implementar y probar el mismo comportamiento. No sustituyen la explicación de lo que verá la persona.

El trabajo seguirá [SDD](02-SDD.md): este documento da la visión general, el [mapa de capacidades](../MAPA-CAPACIDADES.md) fija límites y dependencias, [03-DECISIONES.md](03-DECISIONES.md) registra acuerdos y [ESPECIFICACIONES/00-INDICE.md](ESPECIFICACIONES/00-INDICE.md) indexa fichas para revisión. La aprobación del mapa no aprueba automáticamente requisitos aún abiertos.

### Alcance por prioridad

| Prioridad | Funcionalidad | Resultado esperado |
| --- | --- | --- |
| Base del MVP | Cuenta, perfiles, mascotas, publicaciones, interacciones, comunidades, chat privado uno a uno y adopción | Flujos completos entre app, API y base de datos. Integrar primero el chat y después el contacto desde adopción. |
| Base del MVP, dentro de Comunidades (D-144) | Eventos con mapa y confirmación de asistencia | Coordinación de encuentros; se implementa como parte de Comunidades en dos partes (D-144): casi todo justo después de Comunidades y los avisos al teléfono después de Adopción. |
| Opcional, si hay tiempo | Chats grupales; reconocimiento de raza canina con CNN | Ampliaciones que no condicionan la entrega de la base. |
| Posibilidad futura por especificar | Aportación opcional para gastos veterinarios en adopción | Solo se evaluará después del alcance inicial de adopción; no forma parte del MVP. |

### Adopción en el MVP

El MVP incluye un espacio específico para mascotas que buscan hogar, separado del feed general. Cualquier persona registrada puede crear una publicación de un solo animal con título, descripción y de una a tres fotos. Puede enlazar opcionalmente la ficha de ese animal en «Mis mascotas», si la tiene (D-89–D-90). Quien publica indica cuando la mascota ya encontró hogar; el anuncio sigue visible y puede volver a «Busca hogar» si se equivocó. Una persona interesada puede contactar al autor mediante el chat privado uno a uno, que debe estar integrado antes de completar adopción. El propósito es facilitar adopciones; no se permiten anuncios de venta. La [ficha de Adopción](ESPECIFICACIONES/08-ADOPCION.md), su [plan técnico](ESPECIFICACIONES/08-ADOPCION/01-PLAN.md) y sus [tareas](ESPECIFICACIONES/08-ADOPCION/02-TAREAS.md) están aprobados. La revisión administrativa de reportes queda para una web futura.

Una aportación opcional para gastos veterinarios queda **únicamente como posibilidad futura**, posterior al MVP. No se define un campo de costo, precio, cobro ni integración de pagos. Su eventual inclusión dependerá de acordar qué gastos se permiten, cómo se comprueban y qué controles evitan ventas encubiertas (D-13).

### Personas interesadas y actores

| Grupo | Interés principal | Alcance confirmado o pendiente |
| --- | --- | --- |
| Personas con mascotas | Mostrar y cuidar sus fichas, compartir contenido y encontrar comunidad. | Público principal; registrar mascotas es opcional para usar otras funciones. |
| Amantes de las mascotas sin mascota propia | Explorar contenido, publicar y participar en comunidades y eventos. | Participación confirmada en D-12; no se les exige una ficha `Pet`. |
| Administradores y moderadores de comunidad | Organizar espacios y eventos. | Roles `ADMIN`, `MODERATOR` y `MEMBER` existentes; administradores gestionan roles y expulsiones, y administradores y moderadores pueden retirar publicaciones y comentarios ajenos de su comunidad (D-23, D-27, D-65, D-68). |
| Creadores y asistentes a eventos | Publicar encuentros, consultar ubicación y responder asistencia. | Permisos confirmados en D-05 y D-09. |
| Equipo que desarrolla y mantiene Petzy | Integrar app, API, Auth y datos sin perder seguridad ni coherencia. | Parte interesada técnica; las decisiones de producto corresponden al usuario y se registran en [03-DECISIONES.md](03-DECISIONES.md). |

**Actores del sistema:** visitante (registro e inicio), usuario autenticado con o sin mascota, administrador o moderador de comunidad y creador de evento. No se crea un rol técnico distinto para «amante sin mascota»; sus permisos se rigen por sesión, membresía y rol de comunidad.

## 2. Estado actual del repositorio

El monorepositorio usa `pnpm`. La app está en `apps/mobile` (Expo, React Native, Expo Router y TypeScript); la API está en `apps/backend` (NestJS y TypeScript). **Supabase Postgres es la base de datos elegida como destino del proyecto** y Supabase Auth gestiona identidades. El backend actual usa Prisma para acceder a la instancia PostgreSQL indicada por `DATABASE_URL`; en el entorno local revisado el 29-09-2026 esa variable apuntaba a `localhost`, no a Supabase Postgres. Docker Compose proporciona esa base local opcional para desarrollo. Las rutas privadas de la API pasan por un guard global que verifica un token; la app guarda el token con Expo SecureStore.

**Criterio de arquitectura del MVP (D-134):** la app móvil leerá y guardará los datos de Petzy mediante NestJS y Prisma. Supabase Auth gestiona identidades; Storage y Realtime se integrarán donde los planes aprobados los necesiten y con los controles de acceso previstos. La Data API no será una segunda vía directa desde el móvil durante el MVP. Una posible adopción futura exigiría decisión y plan propios, incluidos permisos y Row Level Security (RLS) por operación.

El inventario de integración por capacidad, con fecha y enlace a cada ficha, se mantiene en [00-RUTA-DE-DESARROLLO.md](00-RUTA-DE-DESARROLLO.md). Esta sección describe el producto y la arquitectura; no duplica el estado de cada módulo. Los detalles de rutas presentes y propuestas están en [05-API.md](05-API.md), y los modelos actuales y permisos objetivo en [04-DATOS-Y-PERMISOS.md](04-DATOS-Y-PERMISOS.md). Contrastar siempre esos inventarios con el checkout antes de planificar.

**Notas de integración para las siguientes tareas:** `Pet` todavía no tiene especie ni raza y `Post` todavía no referencia una mascota. La ruta de mascotas de la navegación debe comprobarse al conectar la pantalla. La API ya tiene protección global de autenticación, pero algunas operaciones de mascotas y usuario aún necesitan autorización por propietario. Las rutas del apartado 6 son una propuesta de contrato; las rutas implementadas se enumeran en [05-API.md](05-API.md).

**Brechas concretas que conviene atender primero:** el controlador de inicio de sesión registra el DTO recibido, por lo que debe retirarse ese log antes de usar cuentas reales. El DTO de creación de mascota valida `ownerId` como entero aunque en el esquema es una cadena, y hoy acepta ese propietario desde el cuerpo de la solicitud. La búsqueda de usuarios devuelve registros completos, incluido el correo. El feed móvil es un marcador de posición y todavía no consulta publicaciones. Estos puntos se registran aquí como trabajo pendiente, no como comportamiento deseado.

## 3. Reglas generales del producto

- Toda creación, modificación o eliminación de contenido requiere sesión válida. El servidor obtiene la identidad del token, no de un `userId` o `ownerId` enviado por el cliente.
- Una cuenta puede participar sin tener mascotas registradas; no imponer `Pet` como requisito de acceso al feed, comunidades o eventos. La membresía y el rol siguen aplicando donde corresponda.
- Cada mascota pertenece a una cuenta. Solo su dueño puede modificarla o desactivarla.
- Las publicaciones pueden pertenecer al feed general o a una comunidad; el origen debe quedar claro en la interfaz. Inicio muestra solo publicaciones sin comunidad, de cualquier categoría o de la categoría filtrada. Las publicaciones comunitarias solo pueden consultarse dentro de su comunidad por miembros de ella (D-20, D-21).
- Una persona puede unirse una sola vez a cada comunidad. Quien la crea recibe el rol `ADMIN`; las acciones de moderación se autorizan según el rol.
- La eliminación de mascotas, publicaciones y comentarios se modela como desactivación cuando se necesita conservar integridad e historial. El contenido desactivado no aparece en consultas públicas.
- Los eventos y las conversaciones se vinculan a usuarios autenticados. La asistencia a un evento tiene un estado vigente por usuario; cambiar de «Iré» a «No iré» actualiza ese estado y su conteo.

## 4. Requisitos funcionales por módulo

### 4.1 Cuenta y perfil de usuario

**RF-A01 Registro.** Una persona escribe correo, contraseña, nombre de usuario y estado de residencia en México. Petzy comprueba que los datos tengan el formato esperado y que el correo y el nombre de usuario no estén ya en uso. Puede registrarse aunque no tenga mascota. Después debe confirmar el correo mediante un enlace que abre la app; mientras no lo confirme, no entra al contenido. Si el mensaje no llega o el enlace vence, puede solicitar otro (D-18). La cuenta de acceso y el perfil de Petzy se guardan en dos sistemas. Si se crea la cuenta de acceso pero falla el guardado del nombre de usuario y el estado, Petzy no le pide registrarse otra vez: después de confirmar el correo y entrar, le muestra un formulario para completar esos datos. Solo cuando se guarden podrá abrir el feed y las demás pantallas de contenido (D-15). Si cualquier paso falla, la app explica qué pasó y permite reintentar sin mostrar la contraseña.

**RF-A02 Inicio y fin de sesión.** La persona entra con su correo confirmado y contraseña. Si el correo aún no está confirmado, ve qué debe hacer y puede pedir otro mensaje de confirmación; si faltan datos de su perfil de Petzy, completa esos datos antes de acceder al contenido. Cuando el permiso temporal de la sesión vence, la app intenta renovarlo sin interrumpirla (D-16). Si no puede renovarlo, explica que debe entrar de nuevo. Al elegir «Cerrar sesión», se retira el acceso guardado en el dispositivo y vuelven las pantallas de ingreso.

**RF-A03 Recuperación de acceso.** Si olvidó la contraseña, la persona escribe su correo desde la pantalla de ingreso. Petzy confirma que debe revisar el buzón sin revelar si ese correo tiene cuenta. Si recibe el mensaje, el enlace abre la app y le permite establecer una contraseña nueva mediante Supabase Auth (D-17). Si el enlace venció, la app lo explica y ofrece solicitar otro. Una solicitud fallida muestra error y opción de reintentar sin borrar el correo escrito.

**RF-P01 Ver perfil.** El usuario ve su propio perfil, mascotas y publicaciones. Una persona registrada puede buscar y abrir el perfil de otra, con datos generales y mascotas activas relacionadas; no se muestran correo, credenciales ni datos privados. D-35 fija nombre de usuario, foto de perfil, biografía, estado de México y mascotas activas como datos visibles; el correo solo aparece en «Mi perfil» para el dueño. La ficha de Mascotas definirá los datos concretos de cada ficha visible.

**RF-P02 Editar perfil.** El propietario puede actualizar su nombre de usuario (de 3 a 30 caracteres), biografía (hasta 300 caracteres) y estado de México. Puede agregar, cambiar o quitar una foto de perfil opcional: JPEG, PNG o WebP de hasta 5 MB. La foto se guarda de forma privada y se entrega únicamente a personas con una cuenta activa después de comprobar su sesión (D-39, D-40). Si una entrada o archivo no cumple los límites, Petzy explica el motivo y conserva lo escrito. El correo aparece solo en «Mi perfil» y su cambio queda para después de la primera versión (D-38). La contraseña y su recuperación se manejan mediante Supabase Auth, nunca como campo editable del perfil.

**RF-P03 Buscar usuarios.** Una persona con cuenta activa puede buscar por nombre de usuario escribiendo de 2 a 50 caracteres. Petzy muestra 20 resultados por página y permite pedir otra página, con un máximo de 30 resultados por solicitud. Solo aparecen cuentas activas y sus datos públicos; no se expone el correo de otras personas (D-35, D-40).

**RF-P04 Desactivar y reactivar cuenta.** La persona puede desactivar su cuenta sin borrar la identidad ni los datos guardados. Su perfil, mascotas, publicaciones y comentarios dejan de estar disponibles para otras personas; sus «Me gusta» dejan de contarse. Un acceso anterior tampoco permite seguir usando contenido. Al entrar otra vez con el mismo correo, puede confirmar la reactivación; el servidor vuelve a comprobar ese correo y contraseña antes de activar la cuenta. La app conserva esos datos solo en memoria durante la confirmación. Solo reaparece contenido que seguía activo individualmente. Si es la única administradora de una comunidad, primero debe nombrar a otro administrador. Las membresías y roles se conservan, pero no se muestran ni cuentan como activos mientras la cuenta esté desactivada; se recuperan al reactivarla (D-36, D-37, D-41).

**Criterios de aceptación:** no se crean cuentas duplicadas; una credencial incorrecta no abre pantallas privadas; tras cerrar sesión no se puede usar el token local; el perfil de otra cuenta no permite edición; los datos visibles coinciden con el servidor; una cuenta desactivada no expone su contenido y puede reactivarse con la misma identidad tras confirmar.

### 4.2 Mascotas

**RF-M01 Registrar mascota.** El dueño captura nombre obligatorio de 2 a 50 caracteres, especie y raza obligatoria de 2 a 50. Puede elegir «Mestiza» o «Raza desconocida» si no conoce una raza concreta. La especie se elige entre Perro, Gato, Ave, Conejo y «Otra»; al elegir «Otra», escribe cuál es en 2 a 50 caracteres. Indica la fecha exacta de nacimiento o, si no conoce el día, mes y año aproximados; foto y descripción de hasta 300 caracteres son opcionales (D-42, D-44–D-46, D-49). La persona no introduce la edad: Petzy la calcula desde el nacimiento y la fecha actual cada vez que entrega la ficha, sin guardar `Pet.age`; señala cuando es aproximada (D-50–D-51). El usuario indicó que no existen datos reales ni despliegue; el plan revisará solo el efecto sobre posibles datos de desarrollo.

**RF-M02 Mis mascotas.** Se muestra una lista de mascotas activas de la cuenta, con acceso a su ficha individual.

**RF-M03 Consultar y editar ficha.** La ficha presenta los datos registrados y permite al dueño corregirlos, cambiar o quitar la foto y añadir una descripción opcional de hasta 300 caracteres. Otra persona con cuenta activa ve nombre, especie, raza, edad calculada, foto y descripción si existen y la fecha exacta de nacimiento cuando se conoce; si solo se conoce mes y año, se muestran «Nacimiento aproximado: mes de año» y «Edad aproximada: N años» (D-43–D-44, D-50). La foto opcional se guarda de forma privada y solo se entrega tras comprobar el acceso; admite JPEG, PNG o WebP hasta 5 MB (D-47). No puede editar la ficha ajena.

**RF-M04 Desactivar mascota.** El dueño puede retirar una ficha con confirmación previa. Las publicaciones que la tenían vinculada permanecen visibles, pero dejan de mostrar y enlazar a esa mascota (D-19).

**Criterios de aceptación:** una mascota nueva aparece en «Mis mascotas»; otra cuenta no puede modificarla; los campos y la foto persisten tras reiniciar la app; las mascotas desactivadas no aparecen en la lista normal.

### 4.3 Feed y publicaciones

**RF-F01 Feed principal.** Inicio lista solo publicaciones activas creadas fuera de una comunidad (`communityId = null`), de la más reciente a la más antigua. «Todas» muestra las publicaciones de todas las categorías de ese feed; si la persona elige una categoría, la lista muestra únicamente las publicaciones de esa categoría. Puede volver a «Todas» y cargar más resultados sin mezclar categorías ni repetir publicaciones. Ve estados de carga, lista vacía y error; cuando un filtro no tiene resultados, la pantalla lo explica. Cada publicación muestra autor, fecha, categoría, texto y foto si existe. Si tiene vinculada una mascota activa, también muestra su nombre, foto disponible y acceso a su ficha (D-19). Las que tienen `communityId` no aparecen en Inicio con ningún filtro: únicamente las leen miembros de su comunidad desde la sección «Publicaciones» de esta o su detalle autorizado (D-20, D-21).

**RF-F02 Publicar.** La persona escribe un título obligatorio de hasta 120 caracteres y una descripción obligatoria de hasta 3 000, elige una categoría y puede adjuntar una foto como máximo; también puede publicar sin foto. Si la añade, admite JPEG, PNG o WebP hasta 5 MB (D-24, D-29, D-33, D-34). El formulario le permite escoger General, Ayuda, Consejo, Pregunta o Mascota perdida y muestra cuál quedó seleccionada antes de enviar. Debe elegir una categoría para publicar: la app no convierte silenciosamente todo en General. La publicación conserva y muestra esa elección al abrirla de nuevo (D-21). «Ayuda» y «Pregunta» son opciones diferentes. Si quiere, elige la ficha activa de una de sus propias mascotas para vincularla; también puede publicar sin elegir mascota (D-19). El servidor comprueba que la ficha seleccionada le pertenece y sigue activa. La mascota aparece como información adicional de la publicación, con nombre, foto si existe y acceso a su ficha; esa foto de la ficha no cuenta como foto de la publicación. Si más adelante el dueño desactiva la ficha, la publicación continúa visible sin mostrar ni enlazar a esa mascota. La categoría y el lugar donde publica son datos diferentes: una publicación de cualquier categoría creada en una comunidad sigue siendo comunitaria y no entra en Inicio. El modelo actual admite cuatro de las cinco categorías; agregar «Ayuda» al esquema queda para el plan y la implementación.

**RF-F03 Gestionar publicación propia.** El autor puede cambiar el título, el texto, la foto, la categoría y la mascota vinculada. Puede añadir, sustituir o quitar la única foto de la publicación y la mascota; nunca quedan varias fotos de publicación a la vez. Si elige otra mascota, debe ser una ficha propia y activa. Cambiar la categoría actualiza dónde aparece al filtrar, sin mover la publicación de Inicio a una comunidad ni de una comunidad a otra. El autor también puede desactivar su publicación. Nadie más puede editarla; un administrador o moderador sí puede desactivarla si pertenece a su propia comunidad (D-22 a D-24).

**RF-F04 Interactuar.** Una persona registrada puede dar o quitar un «Me gusta» y comentar una publicación activa que tenga permiso de ver. Para una publicación comunitaria debe pertenecer a esa comunidad (D-20). Cada comentario requiere texto con contenido de hasta 500 caracteres; en esta versión no tiene fotos ni respuestas a otro comentario. Se muestra directamente bajo la publicación, del más reciente al más antiguo, de 20 en 20 (máximo 30 por solicitud), con nombre, foto de perfil si existe, texto y fecha; tras modificarlo aparece «Editado» (D-53–D-55). La persona puede editar su comentario en cualquier momento mientras comentario y publicación sigan activos, o desactivarlo. Un administrador o moderador de esa comunidad puede desactivar lógicamente un comentario ajeno de una publicación de allí; el autor del post puede hacer lo mismo únicamente en su publicación, aunque sea miembro común, sin editar el comentario; el comentario sigue guardado pero deja de verse. Ese permiso comunitario no alcanza comentarios de Inicio ni de otra comunidad (D-27, D-59). Solo el administrador puede revisar y restaurar comentarios retirados allí por moderadores, administradores o autores de posts; no puede restaurar los que retiró su propio comentarista (D-28). Si la publicación se oculta, sus comentarios y «Me gusta» quedan guardados pero no se muestran ni se aceptan nuevas interacciones. Si un administrador restaura una publicación retirada por moderación, las interacciones anteriores vuelven a mostrarse; los comentarios desactivados individualmente siguen ocultos hasta que se restauren por la vía autorizada (D-26). Los conteos se actualizan de forma coherente con el servidor.

En una publicación general de Inicio, su autor puede ocultar un comentario ajeno sin cambiar su texto. Dentro de esa publicación solo él ve «Comentarios ocultados», donde puede restaurar los que él retiró por error. No aparecen allí comentarios retirados por quien los escribió. El backend compara el ID del token con el autor de la publicación, comprueba que no pertenece a una comunidad y que el comentario es de esa publicación (D-56). Esto aún no funciona en el código actual.

**RF-F05 Detalle.** Al abrir una publicación se ven su contenido, comentarios y estado de reacción. Si pertenece a una comunidad, se identifica esa comunidad y solo un miembro puede abrir el detalle; conocer el enlace o ID no evita la comprobación de membresía (D-20).

**Criterios de aceptación:** el autor se obtiene de la sesión; una publicación nueva conserva la categoría escogida y aparece en Inicio o en su comunidad, sin mezclarse; «Todas» reúne todas las categorías de Inicio y cada filtro devuelve solo la elegida, incluso al cargar más; se puede publicar sin foto o con una sola foto propia de la publicación, y editarla sin acumular imágenes; una mascota propia vinculada se muestra como información adicional y, si su ficha se desactiva, la publicación permanece sin mostrarla; el autor puede modificar los campos acordados y quitar foto o mascota, pero ni siquiera él puede trasladar la publicación a otro lugar; una persona no miembro no puede leer una publicación comunitaria aunque tenga su enlace; un usuario no puede editar contenido ajeno; cada usuario tiene a lo sumo una reacción por publicación; al ocultar una publicación se conservan sus comentarios y reacciones sin mostrarlos ni aceptar nuevos, y vuelven si un administrador restaura la publicación moderada; Inicio no muestra contenido desactivado.

### 4.4 Comunidades

**RF-C01 Explorar y buscar.** Una persona con cuenta que no ha sido expulsada busca comunidades por nombre o tema con términos de 2 a 50 caracteres y resultados paginados de 20 en 20 (máximo 30) y, sin unirse, ve nombre, descripción, foto disponible y número de miembros activos. Las personas expulsadas no encuentran esa comunidad ni pueden abrirla por enlace directo (D-70). Sus publicaciones y comentarios solo se abren tras unirse; los eventos mantienen su propia regla de lectura (D-20, D-61).

**RF-C02 Crear comunidad.** Cualquier usuario autenticado puede crear una comunidad con nombre de 3 a 60 caracteres, descripción de 10 a 500, tema escrito obligatorio de 2 a 50 y foto opcional JPEG/PNG/WebP de hasta 5 MB; pasa a ser administrador y primer miembro. Dos comunidades pueden tener el mismo nombre: sus descripciones y sus identificadores internos permiten distinguirlas (D-72).

**RF-C03 Unirse y salir.** Una persona con cuenta activa puede unirse de inmediato, sin aprobación, y la interfaz confirma su membresía sin duplicarla. Puede salir, pero si es la única administradora activa debe nombrar antes a otra; hasta entonces Petzy rechaza la salida y explica qué hacer (D-60, D-62). Sus publicaciones y comentarios anteriores permanecen para los miembros si siguen activos; la persona que salió pierde acceso y, si vuelve, ingresa como `MEMBER` (D-66).

**RF-C04 Publicaciones de comunidad.** Solo sus miembros pueden abrir y leer las publicaciones activas de una comunidad. También se requiere membresía para publicar en ella. El servidor comprueba ambas operaciones aunque alguien conozca el enlace directo de una publicación. Las publicaciones retiradas por moderación dejan de aparecer en la lista y no se abren con su enlace normal (D-20, D-23).

**RF-C05 Administración.** El administrador puede corregir nombre, descripción y tema de su comunidad y añadir, reemplazar o quitar la foto; los tres textos siguen siendo obligatorios y conservan sus límites (D-73). Puede cambiar entre `MEMBER`, `MODERATOR` y `ADMIN` el rol de miembros existentes sin dejarla sin administrador activo, y expulsar `MEMBER` o `MODERATOR` de esa comunidad. Una expulsión bloquea el reingreso hasta que un `ADMIN` quite el bloqueo; la persona decide después si vuelve a unirse como `MEMBER`. Su contenido previo activo permanece para los miembros (D-65, D-68). Tanto el administrador como el moderador pueden crear eventos y retirar de la vista publicaciones ajenas de su propia comunidad mediante desactivación lógica: el registro permanece guardado, pero deja de mostrarse. También pueden ocultar lógicamente comentarios ajenos de publicaciones de esa comunidad, sin editar su texto (D-27). El autor de un post comunitario puede ocultar comentarios ajenos solo en ese post (D-59). No pueden aplicar estas acciones a contenido de Inicio o de otra comunidad (D-23). Solo el administrador ve en el apartado de esa comunidad publicaciones retiradas **por moderación** y comentarios ajenos retirados por moderadores, administradores o autores de posts, y puede reactivar los que se ocultaron por error. Las publicaciones retiradas por sus autores y los comentarios retirados por sus propios comentaristas no aparecen en esas vistas ni pueden restaurarse desde allí (D-25, D-28). Antes de desactivar su cuenta, el único administrador de una comunidad debe nombrar a otro; las membresías inactivas no se cuentan y se recuperan al reactivar (D-36, D-37). Otras facultades y el tratamiento de reportes siguen pendientes.

**RF-C06 Detalle de comunidad.** La comunidad organiza su contenido en «Publicaciones» y «Eventos». Solo miembros pueden leer las publicaciones. Una cuenta registrada puede consultar los eventos si no fue expulsada de esa comunidad; solo miembros `ADMIN` y `MODERATOR` pueden crearlos, y solo miembros pueden responder asistencia (D-09, D-20, D-70). Antes de unirse, una cuenta no expulsada ve nombre, descripción, foto disponible y número de miembros activos; los miembros activos pueden ver una lista paginada con nombre, foto y rol de los miembros, sin correos. Una persona expulsada no ve detalle, foto, miembros ni eventos de esa comunidad (D-61, D-69–D-70).

**Criterios de aceptación:** el creador figura como `ADMIN`; no hay membresías duplicadas; al salir se conservan las publicaciones y comentarios activos para otros miembros y un regreso crea rol `MEMBER`; el último `ADMIN` activo no puede salir ni bajar de rol sin nombrar otro; solo miembros leen las publicaciones de su comunidad y ninguna aparece en Inicio; el administrador puede expulsar miembros o moderadores, impedir su reingreso hasta quitar el bloqueo y mantener su contenido previo activo visible a miembros; la persona expulsada no ve la comunidad ni sus eventos; un administrador o moderador puede desactivar lógicamente una publicación o comentario ajeno de su comunidad sin editar su contenido ni borrar el registro, mientras un miembro común solo puede ocultar comentarios ajenos de su propio post y una cuenta de otra comunidad no puede hacerlo; solo el administrador ve publicaciones retiradas por moderación y comentarios ocultados por moderadores, administradores o autores de posts, y puede restaurarlos, pero no ve allí ni restaura las publicaciones retiradas por sus autores ni los comentarios retirados por sus propios comentaristas; los eventos de una comunidad no aparecen en otra y conservan su regla de lectura para cuentas registradas; una cuenta sin permiso no puede publicar ni administrar la comunidad ni crear eventos.

### 4.5 Eventos (parte de Comunidades, dentro del MVP)

**RF-E01 Crear evento.** Un `ADMIN` o `MODERATOR` de la comunidad define título obligatorio de hasta 120 caracteres, descripción obligatoria de hasta 3 000, fecha y hora de inicio, zona horaria, fecha de fin y «Hora aproximada de fin» obligatorias y posteriores al inicio, y nombre o dirección legible del lugar obligatorios de hasta 200 caracteres (D-114). Petzy aclara que la hora de fin puede variar y permite terminar otro día (D-104, D-107). Marca un punto en el mapa y Petzy guarda esas coordenadas, sin pedirle latitud y longitud escritas a mano (D-99). La portada es opcional, privada y acepta JPEG, PNG o WebP de hasta 5 MB (D-102). El evento pertenece obligatoriamente a esa comunidad. Un error de validación conserva lo escrito.

**RF-E02 Consultar eventos.** Una persona con cuenta no expulsada de esa comunidad puede consultar sus eventos; quien fue expulsado no encuentra la comunidad ni abre un evento suyo por enlace directo (D-70). En la sección «Eventos» de la comunidad se muestran «Próximos», «En curso» desde el inicio hasta el fin aproximado, y «Eventos anteriores» después de ese fin. Un cancelado pasa de inmediato a «Eventos anteriores» con la etiqueta «Cancelado» (D-105, D-112, D-118). Las tarjetas tienen foto o imagen de respaldo, título, fecha, hora y lugar breve. Al pulsar una tarjeta se abre el detalle con descripción completa, creador, confirmación de asistencia y mapa con marcador. Si el mapa no carga, la dirección sigue visible. La portada se entrega solo después de comprobar sesión y permiso de acceso al evento (D-102). En un evento anterior no cancelado se muestran la respuesta propia guardada y el total final, sin cambios nuevos; en uno cancelado se oculta el total (D-103, D-108).

**RF-E03 Confirmar asistencia.** Cada miembro elige «Iré» o «No iré» y puede cambiar su decisión hasta antes de la hora de inicio; al comenzar, Petzy cierra la asistencia aunque el evento siga en curso (D-106). Se muestra el total actualizado de personas que confirmaron «Iré». Si sale, es expulsado o desactiva su cuenta antes del inicio, deja de contarse; si vuelve a unirse o reactiva la cuenta antes del inicio, debe confirmar otra vez (D-71, D-117). Al comenzar se fija el total histórico de confirmaciones, que no disminuye por salidas posteriores (D-109). Ese número no prueba cuántas personas asistieron físicamente.

**RF-E04 Gestionar evento propio.** El creador del evento, mientras siga siendo miembro, o un `ADMIN` vigente de su comunidad puede editarlo o cancelarlo (D-09, D-119). Puede corregir la fecha y hora de inicio solo antes de que empiece y elegir un nuevo inicio futuro (D-100). Mientras está en curso puede corregir título, descripción, lugar, portada y fecha y hora aproximada de fin; el inicio ya queda fijo y el nuevo fin debe ser posterior al momento del cambio (D-110, D-113). Puede cancelarlo hasta antes de la hora aproximada de fin, pero no después (D-111). Si cambia el inicio, el fin aproximado o el lugar, o lo cancela, Petzy avisa a quienes mantienen «Iré» dentro de la app; una falla de aviso no deshace el cambio (D-101). El aviso por teléfono con la app cerrada queda como trabajo futuro (D-157). Al cancelar, las respuestas quedan guardadas como historial, pero el evento ya no muestra el total de asistentes ni permite cambiar la respuesta (D-103).

**Criterios de aceptación:** un miembro `MEMBER` no puede crear eventos; no se publica un evento sin fecha futura o ubicación válida; un usuario cuenta una sola vez y deja de contarse al salir o ser expulsado; una cuenta expulsada no consulta eventos de esa comunidad; el mapa apunta a las coordenadas guardadas; un evento cancelado indica su estado. El detalle de esquema, rutas y decisiones abiertas está en [ESPECIFICACIONES/09-EVENTOS.md](ESPECIFICACIONES/09-EVENTOS.md).

### 4.6 Chat privado (MVP; previo a adopción)

**RF-CH01 Conversación uno a uno.** Una persona con cuenta activa puede iniciar desde el perfil público de otra cuenta activa una conversación privada, sin invitación previa ni duplicados para el mismo par. No puede iniciar una conversación consigo misma (D-75). El acceso desde Adopción reutilizará esta función después.

**RF-CH02 Mensajes.** Enviar, recibir y consultar mensajes de texto con contenido de hasta 250 caracteres, ordenados por fecha, con estado de envío y control de acceso solo para participantes. Con la app abierta, un mensaje nuevo muestra un aviso emergente dentro de Petzy (D-79, D-81, D-154). La notificación del teléfono «Nuevo mensaje de [nombre]» con la app cerrada, sin texto privado, queda como trabajo futuro (D-157). «Leído» aparece al abrir y mostrar el mensaje a su destinatario; «En línea» solo mientras la persona tiene Petzy abierta y conectada (D-81).

**RF-CH03 Bandeja y protección.** Listar conversaciones recientes y abrir su historial con paginación. Cada persona puede ocultar un chat de su bandeja; reaparece al recibir otro mensaje (D-79). También puede elegir «Borrar chat para mí»: deja de ver sus mensajes anteriores incluso si llegan nuevos, mientras la otra persona conserva los suyos y los reportes ya enviados conservan los mensajes seleccionados (D-82). «Bloquear» detiene los mensajes en ambos sentidos y mantiene legible el historial; solo quien bloqueó puede deshacer su propio bloqueo (D-76). Quien bloqueó ve «Bloqueaste a esta persona» y «Desbloquear»; la otra persona ve «No puedes enviar mensajes» (D-81). El bloqueo no suspende cuentas ni impide usar otras funciones de Petzy. «Reportar conversación» permite seleccionar mensajes y añadir una explicación opcional. **El MVP guarda el reporte en una tabla**, pero el equipo no tendrá manera de consultarlo o revisarlo todavía; Petzy confirma únicamente «Reporte guardado». La revisión y posibles suspensiones llegarán con un [sistema web independiente](FUTURO/DASHBOARD-WEB-PETZY.md) (D-77, D-86, D-87).

**Criterios de aceptación:** terceros no pueden leer la conversación; un mensaje enviado aparece una sola vez; el historial reaparece al reiniciar sesión.

### 4.7 Adopción (MVP; después del chat privado y el guardado de reportes)

**RF-AD01 Publicar para encontrar hogar.** Cualquier persona registrada puede publicar un solo animal en un apartado propio de adopción, con título y descripción obligatorios de hasta 120 y 3 000 caracteres y de una a tres fotos JPEG, PNG o WebP de hasta 5 MB cada una. Las fotos son privadas y solo se entregan tras comprobar sesión y visibilidad del anuncio. Puede enlazar opcionalmente una ficha propia de ese animal, pero no necesita crearla. Si la enlaza, el anuncio muestra nombre, especie, edad calculada, foto disponible y acceso a la ficha mientras siga activa; si se desactiva, el anuncio permanece sin ese complemento. Su autor puede corregir título, descripción, fotos y ficha enlazada, o retirar el anuncio sin borrar físicamente sus datos. Un anuncio retirado deja de mostrarse a otras personas; el autor puede verlo y restaurarlo desde «Mis anuncios retirados» con el mismo estado que tenía antes del retiro. La vista conjunta de Adopción muestra primero «Busca hogar» y después «Encontró hogar»; también puede filtrarse por cada estado. Estas publicaciones no se mezclan con el feed general o los mini-feeds comunitarios y no tienen comentarios ni «Me gusta» en el MVP (D-89–D-90, D-92–D-96).

**RF-AD02 Indicar que encontró hogar.** El autor puede marcar su publicación «Encontró hogar» cuando la mascota ya encontró uno; el anuncio sigue visible y se distingue de «Busca hogar». Si se equivocó, puede devolverlo a «Busca hogar». Otras cuentas no pueden cambiar ese estado (D-90).

**RF-AD03 Contactar al autor.** Desde un anuncio ajeno que indica «Busca hogar», la persona interesada puede abrir o iniciar un chat privado uno a uno con quien publicó. El chat muestra a esa persona y no requiere un nombre personalizado. Un anuncio «Encontró hogar» no ofrece «Contactar»; en un anuncio propio se muestran acciones de edición y estado. Esta integración se realiza después de completar el chat privado (D-91).

**RF-AD04 Reportar anuncios sospechosos y desalentar ventas.** El apartado está destinado a encontrar hogares, no a comercializar mascotas. El formulario no ofrece precio ni pago, muestra «Solo adopciones, no ventas» y exige que el autor confirme esa regla antes de publicar. Una persona con cuenta puede reportar solo un anuncio ajeno y visible con motivo obligatorio elegido entre «Parece una venta», «Información engañosa», «Contenido inapropiado» y «Otro», más explicación opcional de hasta 500 caracteres. Se guarda un reporte por persona y anuncio; si intenta otro, Petzy indica «Ya lo reportaste». El reporte y los datos necesarios del anuncio se conservan hasta su futura revisión. El equipo no podrá consultar ni revisar esos reportes ni retirar anuncios por esta vía durante el MVP. La app no debe prometer retiro inmediato ni detección automática de ventas encubiertas (D-91, D-93–D-97).

**Criterios de aceptación:** una cuenta sin mascota propia puede publicar; la publicación aparece solo en el apartado de adopción; solo su autor la edita, retira o cambia de estado; el acceso de contacto abre el chat con el autor correcto solo desde anuncios ajenos «Busca hogar»; se pueden guardar reportes sin lectura administrativa durante el MVP; no se ofrecen campos de precio ni cobro. Ver [08-ADOPCION.md](ESPECIFICACIONES/08-ADOPCION.md).

### 4.8 Opcionales

- **Chats grupales:** grupos con participantes y reglas de administración. Se diseñan después de estabilizar el chat uno a uno.
- **Detección de raza canina con CNN:** al registrar un perro, el usuario puede solicitar una sugerencia a partir de una foto. El resultado muestra confianza y permite corregir la raza manualmente; nunca se guarda como diagnóstico ni sustituye la decisión del usuario.

## 5. Modelo de datos y cambios previstos

| Entidad | Estado actual | Ajuste previsto |
| --- | --- | --- |
| `User` | Identidad, correo, nombre, avatar, biografía, estado, actividad. | Política de datos públicos y edición sincronizada con Supabase Auth. |
| `Pet` | Dueño, nombre, `age: Int`, foto, biografía, actividad. | Añadir especie, raza y nacimiento exacto o aproximado; eliminar `age` en la futura migración y calcular la edad al consultar; validar propiedad. No hay datos reales de usuarios que migrar según el usuario. |
| `Post` | Autor, comunidad opcional, tipo, título, descripción, foto, fecha, actividad. | D-19 confirma el vínculo opcional con una mascota propia y D-30 aprobó `Post.petId Int?` para el plan; aún no existe en el esquema. Si la ficha se desactiva, la publicación sigue visible sin mostrar la mascota. También faltan paginación e índices del feed. |
| `Comment`, `PostLike` | Relación con usuario y publicación. | Listado de comentarios y operaciones de reacción. |
| `Community`, `CommunityMember` | Datos de comunidad, roles `ADMIN`, `MODERATOR`, `MEMBER` y membresía. | Tema o categoría, creador o regla de administración, API y permisos. |
| `Event`, `EventAttendance` | No aparecen en el esquema ni en las migraciones de este checkout; el estado de bases externas no se comprobó. | Evento vinculado obligatoriamente a una comunidad, portada opcional, coordenadas, lugar, fecha con zona horaria, estado y asistencia única por usuario. |
| `Conversation`, `Message` | No existen. | Participantes, mensajes, fechas, índices y reglas de acceso. |

Adopción es una capacidad del MVP. D-98 aprobó tablas específicas separadas de `Post` para anuncios, fotos y reportes. El [plan aprobado](ESPECIFICACIONES/08-ADOPCION/01-PLAN.md) detalla las relaciones y la migración; todavía no se ha cambiado la base.

Relaciones principales: `User 1:N Pet`, `User 1:N Post`, `Community 1:N Post`, `User N:M Community` mediante `CommunityMember`, `Post 1:N Comment`, `User N:M Post` mediante `PostLike`. Para eventos: `User 1:N Event` y `User N:M Event` mediante asistencia. Para chat: dos usuarios por conversación y muchos mensajes por conversación.

Para las fotos, evaluar primero Supabase Storage; la base de datos conserva una referencia al archivo. Definir buckets, permisos, límites de tamaño, formatos admitidos, visibilidad y borrado antes de habilitar cargas. Para chat y otras actualizaciones en vivo, evaluar Supabase Realtime antes de implementar un transporte propio.

## 6. Contratos de API a completar

Esta tabla mezcla operaciones ya presentes en código con rutas objetivo para planificar módulos. Consulte [05-API.md](05-API.md) para distinguir rutas presentes, verificadas y propuestas. Reutilizar las rutas existentes cuando sean adecuadas y acordar un formato uniforme de respuestas y errores.

| Módulo | Operaciones previstas |
| --- | --- |
| Cuenta y perfil | `POST /auth/sign-up`, `POST /auth/sign-in`, recuperación de contraseña, `GET/PATCH /users/me`, `GET /users/:id`, búsqueda de usuarios. |
| Mascotas | `POST /pets`, `GET /users/me/pets`, `GET/PATCH/DELETE /pets/:id`, fecha de nacimiento y carga de foto. |
| Feed | `GET/POST /posts`, `GET/PATCH/DELETE /posts/:id`, `GET/POST /posts/:id/comments`, `PATCH/DELETE /posts/:id/comments/:commentId`, `PUT/DELETE /posts/:id/like`. |
| Comunidades | `GET/POST /communities`, `GET/PATCH /communities/:id`, `POST/DELETE /communities/:id/members/me`, `GET/POST /communities/:id/posts`. |
| Eventos | `GET/POST /communities/:communityId/events`, `GET/PATCH /events/:id`, `PUT /events/:id/attendance`. |
| Chat | `GET/POST /conversations`, `GET /conversations/:id/messages`, `POST /conversations/:id/messages`; definir transporte en tiempo real. |
| Adopción | El [plan aprobado](ESPECIFICACIONES/08-ADOPCION/01-PLAN.md) define rutas futuras para listar, crear, editar, retirar, restaurar, abrir fotos, contactar por Chat y guardar reportes. No hay rutas actuales de Adopción. |

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

- **RNF-I01:** navegación consistente entre Inicio, Comunidades, Buscar, Adopción y Ajustes; Chat, Mi perfil y Mis mascotas se abren desde los accesos acordados. Las cinco pestañas tienen icono y etiqueta visible (D-120/D-124).
- **RNF-I02:** cada pantalla de datos ofrece estados de carga, vacío, error y reintento; las acciones destructivas piden confirmación y las acciones exitosas dan respuesta clara.
- **RNF-I03:** admitir distintos tamaños de pantalla, áreas seguras, teclado, tamaños de texto del sistema y contraste suficiente. Los controles táctiles deben ser fáciles de pulsar.
- **RNF-I04:** fotos con texto alternativo o descripción accesible; el mapa siempre se acompaña de una dirección textual. La información no depende solo del color.
- **RNF-I05:** mantener lenguaje y formatos coherentes en español; presentar hora local del evento junto con su zona horaria cuando haya participantes de otras zonas.

La [especificación de diseño de la app](ESPECIFICACIONES/90-DISENO-APP.md) convierte estas condiciones generales en criterios de revisión de navegación, sistema visual, estados y accesibilidad; el [documento de interfaces](06-DISENO-DE-INTERFACES.md) conserva la pantalla y paleta de referencia con las decisiones D-120–D-133. No se hará prototipo navegable previo. La ficha, el plan y las tareas de Diseño ya están aprobados; la programación espera autorización explícita del usuario.

### Calidad y operación

- **RNF-Q01:** paginar publicaciones, comunidades, comentarios, eventos y mensajes; evitar cargar listas completas en memoria.
- **RNF-Q02:** manejar fallas de red sin perder silenciosamente formularios; mostrar reintento y evitar duplicados al repetir una operación.
- **RNF-Q03:** definir una meta medible de rendimiento antes de cada entrega (por ejemplo, tiempo de apertura del feed con una cantidad de datos de prueba acordada) y verificarla en dispositivos objetivo.
- **RNF-Q04:** mantener migraciones de base de datos versionadas, pruebas de permisos y flujos críticos, y configuración por entorno sin secretos en el repositorio.
- **RNF-Q05:** monitorear errores de API y app y documentar respaldo, restauración y despliegue antes de producción.

## 8. Orden de capacidades y puertas de revisión

El [mapa](../MAPA-CAPACIDADES.md) es el índice de IDs estables y dependencias. La [ruta de desarrollo](00-RUTA-DE-DESARROLLO.md) fija el orden y estado de integración. Cuenta, Publicaciones, Perfiles, Mascotas, Interacciones, Comunidades, Chat y Adopción tienen ficha, plan y tareas revisados. Chat incluye D-87–D-88 y Adopción D-89–D-98. La ficha y el plan de Eventos están aprobados; sus tareas EV-T01–EV-T20 también están aprobadas, sin ejecutar. Diseño tiene ficha, plan y tareas DA-T01–DA-T10 aprobados, sin ejecutar. El [sistema web del equipo](FUTURO/DASHBOARD-WEB-PETZY.md) queda fuera de este MVP. El usuario aplazó todo código hasta autorizarlo expresamente.

`diseno-app` define los fundamentos visuales y de interacción que usarán las pantallas de estas capacidades. Su ficha, plan y tareas están aprobados; por indicación del usuario, el rediseño de pantallas se realizará más adelante y no se incluye como trabajo de código en esta fase.

1. **Cuenta e inicio de sesión:** cerrar registro, recuperación, sesión y seguridad.
2. **Feed y publicaciones:** completar lectura, creación, separación de contexto, fotos y permisos.
3. **Perfiles:** cerrar consulta pública, búsqueda, edición y campos visibles.
4. **Mascotas:** añadir nacimiento exacto o aproximado, eliminar `Pet.age`, calcular la edad al consultar, asegurar propiedad e integrar foto, lista y ficha.
5. **Interacciones:** completar comentarios y likes sobre contenido visible.
6. **Comunidades:** completar membresía, roles, búsqueda y mini-feed.
7. **Chat privado:** implementar conversaciones uno a uno persistentes y sus permisos.
8. **Adopción:** integrar publicaciones y contacto después de verificar el chat y el guardado de reportes.
9. **Eventos:** terminar migración, mapa y asistencia; parte del MVP, dentro de Comunidades; en dos partes: la primera antes de Chat y la segunda, con avisos al teléfono, después de Adopción (D-144).

Chats grupales y CNN son opcionales. La posible aportación veterinaria se evalúa en una etapa futura separada.

Cada capacidad pasa por revisión de especificación, plan y tareas antes de nueva implementación. Se considera terminada solo con flujo completo: migración/modelo cuando aplique, API y autorización, pantalla, estados de error, pruebas de aceptación y documentación actualizada. No basta con una pantalla o una tabla aislada.

## 9. Decisiones acordadas y verificaciones pendientes

- Antes de cambiar el esquema de Mascotas, revisar si el entorno de desarrollo conserva filas de prueba con solo `age`; el usuario confirmó que no hay datos reales ni despliegue. No inventar cumpleaños para filas de prueba.
- D-19 confirmó que una publicación de Inicio o de comunidad podrá vincularse opcionalmente a una mascota propia, mostrando nombre, foto disponible y acceso a la ficha como información adicional. Si se desactiva, la publicación permanece sin mostrarla. D-30 aprobó `Post.petId Int?` para el plan, aún sin implementar. El feed general y las listas de comunidad siguen separados. D-21 confirmó las cinco categorías y el filtro de Inicio; Ayuda debe añadirse al modelo antes de implementar ese flujo.
- D-60 confirma que una cuenta activa entra de inmediato a una comunidad si no fue expulsada; no se exige aprobación administrativa. Sus publicaciones siguen reservadas a miembros según D-20.
- D-99 confirma que quien organiza marca el lugar del evento en un mapa y añade un nombre o dirección legible; no escribe coordenadas manualmente. El [plan aprobado de Eventos](ESPECIFICACIONES/09-EVENTOS/01-PLAN.md) propone el mapa y la portada privada. Su configuración concreta se verificará durante una futura implementación autorizada.
- Solo se muestra el total de asistentes, no su lista nominal. Los campos visibles de perfiles ajenos se fijaron en D-35; los de mascotas, en D-43.
- Chat privado: D-81 precisa «Leído», «En línea», presentación del bloqueo y privacidad de avisos. D-82 define «Borrar chat para mí». D-87 confirma que la opción de reportar y su tabla pertenecen al MVP; la revisión, el acceso del equipo y las suspensiones quedan para la futura especificación web. Ninguna de estas funciones de Chat está implementada.
- En adopción: D-89–D-97 fijan fotos privadas, edición, retiro y restauración del autor, filtros por estado, contacto, ficha propia opcional, reglas contra ventas, límites de texto, ausencia de comentarios y «Me gusta» y un reporte por persona y anuncio. Los reportes se almacenan sin revisión administrativa en el MVP y se conservan hasta su futura revisión. D-98 aprueba anuncios separados de `Post` y copia del contenido denunciado; la ficha, el [plan técnico](ESPECIFICACIONES/08-ADOPCION/01-PLAN.md) y las [tareas](ESPECIFICACIONES/08-ADOPCION/02-TAREAS.md) están aprobados. La posible aportación veterinaria queda para una etapa futura.

## 10. Referencias internas del código

- App móvil: `apps/mobile/app`, `apps/mobile/hooks/useAuth.ts`, `apps/mobile/context/AuthContext.tsx`.
- API: `apps/backend/src/auth`, `apps/backend/src/user`, `apps/backend/src/pet`, `apps/backend/src/post`, `apps/backend/src/comments`.
- Datos y migraciones: `apps/backend/prisma/schema.prisma`, `apps/backend/prisma/migrations`.

Al iniciar cada módulo, revisar estas rutas y actualizar la tabla de estado para reflejar lo que realmente quedó implementado.
