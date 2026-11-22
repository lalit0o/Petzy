# Bitácora de IA — Petzy

Registro de cómo se usó la inteligencia artificial en el desarrollo de Petzy: qué se le pidió, qué entregó, qué se corrigió o rechazó y qué resultado quedó en el repositorio. Complementa el **diario de decisiones** ([docs/03-DECISIONES.md](docs/03-DECISIONES.md)), que conserva cada acuerdo numerado (D-01 a D-158) con su motivo. Esta bitácora explica el proceso; el diario, las reglas que resultaron de él.

## Cómo se elaboró

- **Fuentes:** las conversaciones guardadas con dos asistentes de programación y el historial de Git del repositorio.
  - **Codex (OpenAI):** sesiones del 21 de septiembre al 2 de noviembre de 2026. Se descartaron las de otros proyectos y las que eran revisiones automáticas de permisos, no mensajes del usuario.
  - **Claude Code (Anthropic):** sesiones del 3 al 22 de noviembre de 2026.
  - **Git:** 72 commits, del 17 de agosto al 22 de noviembre de 2026.
- **Periodos sin conversación guardada:** del 2 al 25 de octubre no hay transcripciones disponibles; en ese tiempo se aprobaron las fichas, planes y tareas de todos los módulos y comenzó la implementación. Para esos días se resume lo que muestran el diario de decisiones y los commits, **sin reconstruir prompts**.
- **Qué se dejó fuera:** charla casual, lenguaje informal, dudas sueltas que no produjeron cambios, mensajes automáticos de las herramientas, datos personales, direcciones IP, claves y tokens. Las solicitudes se resumen en tono neutral.
- **Fechas:** hora local de Tijuana. Cada entrada agrupa los mensajes de un mismo tema y día.
- **Formato de cada entrada:** *Solicitud* (lo que se pidió), *IA* (lo que entregó o propuso), *Correcciones y decisiones* (lo que el usuario ajustó, rechazó o decidió) y *Resultado* (commit o decisión).

## Resumen por etapas

| Etapa | Fechas | Herramienta | Qué se hizo con IA |
| --- | --- | --- | --- |
| Base del proyecto | 17 ago – 18 sep | Sin registro de IA | Monorepo, autenticación con Supabase, primeras pantallas. Commits manuales. |
| Backend asistido | 21 – 23 sep | Codex | Guards de autenticación y propiedad, modelo de comentarios y «Me gusta». Uso principalmente explicativo. |
| Documentación | 29 sep – 1 oct | Codex | Documentación del proyecto, `AGENTS.md`, reglas para agentes, adopción del proceso SDD. |
| Especificación e inicio de código | 2 – 25 oct | Sin conversación guardada | Aprobación de fichas, planes y tareas (D-01 a D-135); Cuenta, Publicaciones e Interacciones. |
| Perfiles y Mascotas | 26 oct – 2 nov | Codex | Cierre de Perfiles, implementación de Mascotas. |
| Módulos y diseño | 3 – 12 nov | Claude Code | UI/UX de Mascotas y Comunidades, Eventos parte 1, Chat, Adopción, Eventos parte 2, pulido del feed. |
| Cierre y calidad | 20 – 22 nov | Claude Code | Revisión de tareas, alcance del MVP, pulido de 12 pantallas, tema de la app, pruebas de casos límite. |

---

## Registro cronológico

### Agosto – septiembre de 2026: base del proyecto (sin registro de IA)

Del 17 de agosto al 18 de septiembre los commits muestran el modelo de datos inicial, el módulo de mascotas, la autenticación con Supabase, la reestructura a monorepo (backend NestJS + app Expo), la pantalla de inicio de sesión y la navegación. No hay conversaciones con IA guardadas de este periodo.

### 21 – 23 de septiembre de 2026 — Codex: guards y comentarios

- **Solicitud:** revisar un error en el servicio de publicaciones sin modificar código; después, revisar el guard global con el decorador `@Public()` y guiar (no escribir) la creación de un guard que compare el usuario del token con el autor de la publicación.
- **IA:** confirmó que `SupabaseAuthGuard` global y `@Public()` estaban bien planteados; explicó cómo el guard deja el ID en `request.user`, el orden de ejecución de NestJS (guards antes que pipes) y propuso `PostOwnerGuard`.
- **Solicitud:** proponer y agregar el modelo de comentarios y «Me gusta» en `schema.prisma`.
- **IA:** agregó `Comment` y `PostLike` con relaciones, índices y clave compuesta para impedir «Me gusta» duplicados; explicó el comando para generar el módulo `comments`, la diferencia REST/GraphQL y la ruta `POST /posts/:postId/comments`.
- **Correcciones y decisiones:** el usuario corrigió por su cuenta el guard y el controlador; la IA señaló errores puntuales (`parseInt` en lugar de `ParseIntPipe`, el parámetro `:id` que el guard leía mal, `UpdateCommentDto` con mayúscula). La idea de no repetir publicaciones vistas (`PostView` y `onViewableItemsChanged`) se explicó y **se aplazó** por decisión del usuario hasta terminar las funciones básicas.
- **Resultado:** commit `61fd1f8` (guard global y guards por endpoint).

### 29 de septiembre de 2026 — Codex: documentación y reglas para agentes

- **Solicitud:** crear la documentación del proyecto a partir de la idea (red para dueños de mascotas con perfiles de mascota, feed, comunidades y eventos; chat y detección de raza como opcionales) y proponer qué más hacía falta.
- **IA:** creó `docs/PROYECTO.md`, `README.md`, `docs/API.md`, `docs/DATOS-Y-PERMISOS.md` y `AGENTS.md` con el contexto del producto para otros agentes.
- **Correcciones y decisiones:**
  - Dejar explícito que **Supabase** es la base de datos elegida, para no construir servicios que Supabase ya ofrece. La IA aclaró que Prisma podía seguir siendo el cliente de esa base y verificó que el entorno local todavía apuntaba a PostgreSQL local.
  - Reglas de producto: la edad de la mascota se calcula desde su fecha de nacimiento; las publicaciones de comunidad **no** aparecen en el feed principal (`communityId`).
  - Nuevas reglas en `AGENTS.md`: pensar cada cambio a escala del proyecto completo; **consultar antes de decidir** cualquier cosa no definida (por ejemplo, una columna nueva); diseñar pantallas minimalistas y cálidas, centradas en las mascotas, con la guía `apple-design`.
  - Eventos dentro de comunidades con mapa: solo `ADMIN` y `MODERATOR` crean eventos; la comunidad se divide en «Publicaciones» y «Eventos»; el mapa solo marca el punto y «Cómo llegar» abre la app de mapas del teléfono.
  - Adopción del proceso **SDD** (desarrollo guiado por especificaciones).
- **Corrección importante:** la IA **comenzó a programar comunidades y eventos sin autorización**. El usuario indicó que nunca pidió empezar a codificar; la IA reconoció el error, cerró lo iniciado sin agregar más funciones y dejó la migración sin aplicar.
- **Corrección de funcionamiento:** al probar comunidades, el usuario reportó carga infinita, un modal tapado por el teclado y un botón «Creando» sin resultado. La IA encontró que la app apuntaba a una IP antigua y que el error del envío no se mostraba en el modal; lo corrigió.
- **Resultado:** a pedido del usuario se creó la skill `async-feedback` (estados de espera, éxito, error y reintento visibles en toda acción de red), que el agente debe leer al comenzar.

### 1 de octubre de 2026 — Codex: reescritura con SDD

- **Solicitud:** leer la skill de *spec-driven development* y la documentación existente, explicar qué se haría y después reescribir la documentación según la skill.
- **IA:** propuso y creó un **mapa de capacidades** con ocho módulos y fichas por módulo con criterios comprobables.
- **Correcciones y decisiones:**
  - Pidió revisar si faltaba algo; la IA ajustó criterios que dependían de módulos posteriores y añadió la ficha de diseño.
  - **Stakeholders:** una persona sin mascota propia puede registrarse y participar en feed, comunidades y eventos.
  - **Adopción:** la IA propuso tratarla como «encontrar hogar» y no como mercado, con un anuncio por animal y estados sin lenguaje de objeto. Sobre cobrar gastos veterinarios, recomendó no incluir costos en la primera versión. El usuario aclaró que **adopción sí es parte del MVP** (la IA la había dejado como futura) y que solo la aportación por gastos queda para después; también corrigió que adopción depende del chat privado y va después de integrarlo.
  - Documentación secuencial (Cuenta → Publicaciones → Perfiles → …) con el estado integrado de cada módulo, para que una IA sepa qué está definido y qué no.
  - Integración de un archivo externo sobre SDD (los flujos por persona y por resultado).
- **Resultado:** commit `9b7ef19` («documentar flujo SDD y ruta de Petzy»).

### 2 – 25 de octubre de 2026 — sin conversación guardada

No hay transcripciones de este periodo. Según el diario de decisiones, `AGENTS.md` y los commits:

- **7 – 10 de octubre:** se aprobaron fichas, planes técnicos y tareas de Cuenta, Publicaciones, Perfiles, Mascotas, Interacciones, Comunidades, Chat privado, Adopción y Eventos (decisiones D-01 a D-119).
- **18 de octubre:** se aprobó la ficha de diseño de la app (D-120 a D-133: navegación, paleta, modo oscuro, Nunito, estados de carga, fotos opcionales).
- **19 de octubre:** el usuario autorizó comenzar a programar. Commits `fc63294` (especificaciones y diseño) y `11ac213` (flujos de Cuenta y pantallas). D-134 fija que la app usa NestJS/Prisma como vía de datos durante el MVP.
- **20 – 25 de octubre:** commit `32629c2` (Publicaciones, Perfiles, Mascotas e Interacciones) y D-135 (menús anclados que salen del control que los abre).

### 26 de octubre – 2 de noviembre de 2026 — Codex: Perfiles y Mascotas

- **Solicitud:** revisar dónde se quedó el agente anterior e implementar los ajustes documentados de Perfiles; avisar cuando estuvieran listos para probar en el teléfono.
- **IA:** implementó «Mi perfil» en modo lectura con «Modificar perfil», la alerta «Perfil actualizado» y la búsqueda de personas, con pruebas locales.
- **Correcciones y decisiones:**
  - Agregar una **X para borrar** la búsqueda de usuarios.
  - Si una cuenta se desactiva y era la única integrante de una comunidad, la comunidad **y sus publicaciones** se eliminan. La IA propuso las reglas exactas y el usuario las aceptó (D-136).
  - El usuario probó Perfiles en su teléfono y pidió cerrarlo (D-137).
  - Para Mascotas pidió primero el plan **sin codificar** y después autorizó implementarlo.
- **Corrección importante:** al pedir commit y push de Mascotas, la IA subió solo esos cambios y dejó fuera los de Perfil y Búsqueda. El usuario lo señaló; la IA integró todo, resolvió un conflicto con la actualización a Expo SDK 58 y dejó el relevo documentado.
- **Resultado:** commits `e313b07`, `608441a`, `4b3cbf9`, `323f4db` y `6ac9438`.

### 3 de noviembre de 2026 — Claude Code: UI/UX de Mascotas y Comunidades

- **Solicitud:** usar la skill `ui-ux-pro-max` para mejorar Mascotas conservando los colores de Petzy, explicando antes qué prioriza la skill.
- **IA:** resumió las prioridades (accesibilidad, contraste, zonas táctiles, estados de carga) y creó tokens compartidos (`constants/petzy-theme.ts`), tarjetas con foto protagonista, retroalimentación táctil y esqueletos de carga.
- **Correcciones y decisiones:**
  - Pidió esqueletos **en todas las pantallas**, no solo en Mascotas, más una auditoría completa de UI/UX; la IA los conectó y entregó una lista de mejoras.
  - La IA recomendó mantener el aviso «Actualizando mascotas…» al regresar a la pantalla; el usuario lo aceptó entonces (el 22 de noviembre se cambió por una actualización silenciosa).
  - Se corrigió el botón de foto duplicado del formulario. El usuario **descartó** cambiar el selector de especie a chips y aprobó mostrar «Editar» y «Retirar ficha» como botones directos en lugar del menú de tres puntos.
  - Paleta: tras un cambio del modo claro el usuario no notó diferencia (su teléfono estaba en modo oscuro); después pidió mejorar el modo oscuro, y la IA aclaró las tarjetas y usó un resplandor verde en lugar de una sombra invisible.
  - El logotipo «Petzy» queda solo en Inicio.
  - **Comunidades:** el usuario propuso separar «Explorar comunidades» y «Mis comunidades»; la IA la evaluó como buena práctica y la implementó con el endpoint `GET /communities?mine=true`, abriendo por defecto en «Mis comunidades» si la cuenta pertenece a alguna.
  - Un solo **botón flotante «+»** para crear publicación, mascota y comunidad; el usuario pidió subirlo un poco y una **barra inferior con desenfoque**.
  - Fotos de comunidad en el servidor (CO-T10 y CO-T11).
- **Limitación de la herramienta:** el cambio de la URL del repositorio remoto fue bloqueado por el modo automático; el usuario lo ejecutó manualmente.
- **Resultado:** commits `263face` (UI/UX y tokens) y `933cf32` (Mascotas verificada con recorrido en teléfono).

### 4 – 6 de noviembre de 2026 — Claude Code: Comunidades y publicaciones

- **Error reportado:** al subir una foto de comunidad, el servidor respondía «Bucket not found». La IA explicó que faltaba el bucket privado `community-photos` y el usuario lo creó en Supabase.
- **Error reportado:** al editar una comunidad, la foto elegida no aparecía. La IA encontró que la pantalla recargaba datos al volver de la galería y descartaba la foto; corrigió también el mismo caso en Mascotas.
- **Solicitud:** la foto de comunidad debía verse completa, no como foto de perfil, y la pantalla estaba amontonada; el usuario propuso dividirla en pestañas («Publicaciones», «Integrantes», «Contenido retirado», «Expulsados», estas dos solo para administración).
- **IA:** propuso y aplicó portada ancha, cabecera fija y pestañas con icono.
- **Correcciones y decisiones:**
  - Sin publicaciones no debe haber scroll falso.
  - La tarjeta de publicación de comunidad debe ser igual a la del feed, con foto de perfil y fecha relativa («hace 1 hora»); al crear una publicación se abre su detalle con un **toast** acorde a la app (D-138).
  - Con una imagen de referencia de un grupo de Facebook se rediseñó la cabecera (portada con «Volver» y «···» encima y barra «Escribe algo…»).
  - Caché de fotos en memoria y recarga silenciosa al regresar a una pantalla.
  - **Regla nueva:** cada cambio de interfaz debe incluir su esqueleto de carga, y cada decisión de diseño debe registrarse en `docs/06-DISENO-DE-INTERFACES.md`. El usuario señaló que el último cambio no lo había hecho.
  - El usuario detectó que el esqueleto y los datos se mostraban al mismo tiempo; la IA confirmó su diagnóstico y ahora los datos se muestran juntos cuando todo llegó.
  - Una publicación retirada no se reflejaba sin salir de la comunidad; se corrigió la navegación de regreso.

### 7 – 8 de noviembre de 2026 — Claude Code: cierre de Comunidades

- **Solicitud:** ayudar a cambiar la IP local al usar otra red, y hacer commit y push dejando contexto para otro agente.
- **Resultado:** commit `0101319`. Ese día también se integraron por *pull request* el motivo de retirada con aviso al autor (D-138 a D-143), la X para borrar la búsqueda de comunidades y la entrada de **Eventos al MVP dentro de Comunidades**, en dos partes (D-144). Las conversaciones de esos cambios quedaron en un tramo resumido de la sesión.

### 9 de noviembre de 2026 — Claude Code: Eventos parte 1 y Chat

- **Error de entorno:** la app no conectaba con el backend; la IA encontró la variable de la API duplicada en el `.env` y la dejó una sola vez.
- **Solicitud:** un flujo de prueba de Eventos parte 1.
- **Correcciones y decisiones:** tras probarlo, el usuario pidió **esqueleto en lugar de ruedita** (ya acordado en el documento de diseño) y mover la descripción del evento al bloque de horario y lugar con la etiqueta «Descripción del evento». Commit `c60a77b`; se cerraron EV-T15 a EV-T17 y CO-T17.
- **Chat:** la IA presentó las tareas CH-T01 a CH-T15 y comparó Supabase Realtime con WebSocket de NestJS. El usuario eligió **WebSocket de NestJS** (D-148). Se implementaron backend, conexión en vivo y pantallas.
- **Correcciones y decisiones:**
  - Chat debe estar en la **barra inferior** y no como botón en Inicio, y la pestaña activa debe ir en **beige** en lugar de naranja (D-150 y D-151).
  - Agregar una **búsqueda en «Mensajes»** para escribir a alguien directamente; de dos propuestas, el usuario eligió la opción A (D-152).
  - La IA diagnosticó que Metro fallaba por falta de memoria del equipo, no por el código.
- **Resultado:** commits `e3127af` y `b6cb63e`.

### 10 de noviembre de 2026 — Claude Code: Chat completo y Adopción

- **Correcciones y decisiones sobre Chat (D-153):** reportar un mensaje **dejándolo presionado**, abrir el perfil al tocar el nombre y un menú «…» en cada chat de la bandeja. El buscador dentro del reporte se evaluó y **se aplazó**.
- **Aviso de mensaje nuevo (D-154):** el usuario pidió una etiqueta clara; la IA agregó «MENSAJE NUEVO · ahora».
- **Limitación:** el usuario no tenía dos dispositivos; la IA creó el script `scripts/chat-probe.mjs` como segunda cuenta. El usuario reportó que se quedaba trabado y la IA le agregó pasos visibles y límites de tiempo.
- **Pruebas:** las E2E fallaron por un estado dañado de Docker; después de reiniciar el equipo pasaron 98 de 98. Chat no se marcó como verificado porque faltaban las notificaciones con la app cerrada.
- **Adopción:** la IA implementó backend, migración y pantallas. El usuario señaló que el formulario no seguía el orden de los demás (pedía la foto primero); la IA lo comparó y reordenó (D-155: Adopción como pestaña propia).
- **Resultado:** commits `234dd0c`, `05775bf`, `beb5362`, `9c51d92`, `26445e8` y `60b3e30`.

### 12 de noviembre de 2026 — Claude Code: Adopción verificada, Eventos parte 2 y feed

- **Error reportado:** con una sola foto, el carrusel de adopción se podía deslizar; se bloqueó. El usuario probó publicar, editar, contactar, reportar, cambiar estado, retirar y restaurar. Commit `75e43a5`.
- **Eventos parte 2:** campana de avisos en Inicio (D-156). El texto de los avisos se corrigió tres veces a pedido del usuario: sin comillas angulares, con negritas solo en el nombre y en lo que cambió, y por último un **formato corto** porque un compañero del equipo lo consideró abrumador. Commit `a5214e7`.
- **Solicitud:** modificar **solo el feed** con la skill `impeccable`, sin perder colores ni estilo.
- **IA:** foto protagonista 4:3, menos texto y contador de «Me gusta». Commit `631add6`.

### 20 – 22 de noviembre de 2026 — Claude Code: cierre del MVP

- **Comparación con GitHub:** el usuario pidió comparar `main` remoto con el local sin modificar nada. La IA confirmó que estaban iguales y que el último cambio era el pulido del feed.
- **Diagnóstico de inicio de sesión:** la app no obtenía el token; la IA verificó la configuración y encontró que el proyecto de Supabase estaba pausado. El usuario lo reactivó.
- **Revisión de tareas:** el usuario preguntó por qué había tareas de Eventos sin marcar. La IA explicó que dependían de las notificaciones con la app cerrada (build de desarrollo y cuenta de Apple Developer) y encontró documentos desactualizados, que corrigió (commit `eccb985`).
- **Decisión de alcance:** sin cuenta de Apple Developer ni teléfono Android, y con la entrega al día siguiente, el usuario sacó del MVP las **notificaciones con la app cerrada**. La IA había recomendado probarlas en Android si había un dispositivo (D-157, commit `6598b2f`).
- **Cierre de Chat, Eventos y Comunidades:** el usuario confirmó en su teléfono las pruebas pendientes de Chat. La IA corrió las E2E completas (117 de 117 al final del día); en dos intentos cometió errores de configuración propios (una opción faltante de Node y una variable vacía) que detectó y corrigió antes de reportar resultados (commit `ec77a44`).
- **Pulido de pantallas con `impeccable`:** el usuario pidió mejorar las pantallas **sin perder la identidad de Petzy** y **una pantalla a la vez**, con un commit por pantalla.
  - Orden propuesto por la IA y autorizado: Inicio, detalle de publicación, Comunidades, detalle de comunidad, detalle de evento, Adopción, Mensajes, perfiles, Mascotas, Buscar, formularios y Acceso.
  - El usuario aprobó **deslizar para actualizar**, que la IA propuso sin aplicarlo hasta su visto bueno.
  - Decidió que la cabecera de la comunidad **se desplace** con el contenido, en lugar de la cabecera fija del 5 de noviembre.
  - Señaló que «Mis mascotas» no tenía forma de regresar a «Mi perfil»; se agregó «Volver».
  - Pidió los tres últimos formularios en un solo commit.
  - Commits `1cf7110` a `76efc75`.
- **Cuenta con correo real:** se configuró la dirección de Expo Go y Supabase. El enlace del correo **sí confirma la cuenta**, pero Supabase no regresa a la app. El usuario decidió dejarlo pendiente (commit `2f31bc2`).
- **Diseño:** el usuario pidió registrar las tareas de diseño como cubiertas. La IA advirtió que DA-T03 (elegir tema manualmente) no existía y que DA-T04 había cambiado por decisiones posteriores; el usuario pidió implementar el tema y se agregó «Automático / Claro / Oscuro» en Mi perfil. Los textos se ajustaron a pedido del usuario: «Apariencia de la aplicación», una ayuda menos técnica y comillas rectas en "Automático". Commits `3a6dae2`, `ca36c66`, `4eff28d` y `c9c6152`.
- **Pruebas de casos límite:** el usuario pidió probar casos límite de todo. La IA escribió una suite E2E con 195 casos y encontró tres errores reales que corrigió: IDs gigantes que producían error 500, la búsqueda con «%» que devolvía todas las cuentas y choques entre respuestas «Iré» simultáneas. También corrigió dos casos en los que la propia prueba estaba mal planteada. Un reformateo automático se coló en archivos no relacionados; la IA lo deshizo antes del commit (`d7fb1e8`).
- **Decisión:** la prueba mostró que se aceptaba un nacimiento en 1800. La IA explicó qué sería un «año mínimo» y el usuario fijó **40 años** (D-158, commit `bd0febb`).
- **Bitácora:** el usuario pidió esta bitácora. La IA preguntó primero por las fuentes, el detalle, las exclusiones y la ubicación antes de redactarla.

---

## Patrones de corrección

Cosas que el usuario corrigió más de una vez y que se convirtieron en reglas del proyecto:

| Situación | Cómo se corrigió | Dónde quedó la regla |
| --- | --- | --- |
| La IA empezó a programar sin autorización (29 sep). | Se exigió proponer y esperar confirmación. | `AGENTS.md`: «Consultar antes de decidir algo no definido». |
| Acciones sin indicador de espera ni mensaje de error (29 sep). | Estados visibles de espera, éxito, error y reintento. | Skill `async-feedback`. |
| Un push incompleto dejó fuera cambios (2 nov). | Revisar el estado de Git antes de subir y no omitir trabajo. | Relevo en `docs/00-RUTA-DE-DESARROLLO.md`. |
| Pantallas nuevas sin esqueleto de carga (5 nov). | Todo cambio de interfaz incluye su esqueleto. | Memoria del agente y documento de interfaces. |
| Decisiones de diseño sin registrar (5 nov). | Registrar cada decisión en el mismo cambio. | `docs/06-DISENO-DE-INTERFACES.md`, sección 0. |
| Textos demasiado largos o técnicos (12 y 22 nov). | Formato corto y lenguaje cotidiano. | Avisos de eventos; textos de «Apariencia». |
| Rediseñar todo a la vez (22 nov). | Una pantalla a la vez, con revisión y commit por pantalla. | Bitácora del pulido en el documento de interfaces. |
| Dar por cerrada una función sin probarla en el teléfono. | Ninguna capacidad se marca «Verificada» sin recorrido en dispositivo. | `AGENTS.md` y ruta de desarrollo. |

## Límites de esta bitácora

- No incluye conversaciones del 2 al 25 de octubre ni del trabajo anterior al 21 de septiembre, porque no se conservaron.
- Algunas sesiones se resumieron automáticamente cuando se llenó su contexto; en esos tramos se usaron los commits y los documentos.
- Los resultados de pruebas y las fechas de cada decisión están con más detalle en [docs/03-DECISIONES.md](docs/03-DECISIONES.md), [docs/00-RUTA-DE-DESARROLLO.md](docs/00-RUTA-DE-DESARROLLO.md) y [docs/REVISIONES/](docs/REVISIONES/).
