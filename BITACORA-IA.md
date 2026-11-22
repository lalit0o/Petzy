# Bitácora de IA — Petzy

En esta bitácora registro cómo usé asistentes de IA para construir Petzy: qué les pedí, qué propusieron o hicieron, qué decidí o corregí y cómo comprobé el resultado. Las reglas que salieron de estas conversaciones están numeradas en el **diario de decisiones**, [docs/03-DECISIONES.md](docs/03-DECISIONES.md) (D-01 a D-158). Aquí cuento el proceso y allí queda cada acuerdo con su motivo.

## Fuentes y cómo leer las entradas

- **Herramientas que usé:**
  - **Gemini (Google):** en agosto y septiembre, solo para preguntas generales. La programación de esa etapa la hice yo.
  - **Codex (OpenAI):** desde septiembre, cuando el trabajo quedó mitad mío y mitad de Codex, y durante todo octubre.
  - **Claude Code (Anthropic):** del 3 al 22 de noviembre de 2026.
- **Conversaciones conservadas en mi laptop:** Codex del 21 de septiembre al 2 de noviembre (descarté las sesiones de otras materias y las revisiones automáticas de permisos) y todas las de Claude Code. No conservo las de Gemini ni las de Codex del 2 al 25 de octubre.
- **Contraste:** cada entrada se cruzó con el historial de Git, las pruebas de [apps/backend/test/](apps/backend/test/), los reportes de [docs/REVISIONES/](docs/REVISIONES/), la [ruta de desarrollo](docs/00-RUTA-DE-DESARROLLO.md) y el diario de decisiones.
- **Huecos:** para los periodos sin conversación conservada (Gemini en agosto y septiembre, y Codex del 2 al 25 de octubre) resumo con los commits y reportes, sin reconstruir mensajes.
- **Cómo se verificó**, con tres niveles distintos:
  - **Local:** pruebas automáticas (unitarias, E2E contra un PostgreSQL desechable en Docker, TypeScript, ESLint, empaquetado). En las E2E la sesión de Supabase y el almacenamiento de fotos se simulan.
  - **Teléfono:** recorrido mío en el iPhone con Expo Go.
  - **Entorno compartido:** Supabase real del proyecto (Auth, Storage o la base de desarrollo).
- **Exclusiones:** omito charla casual, credenciales, direcciones IP, correos y datos de otras personas.

## Episodios clave

1. [La IA empezó a programar sin que se lo pidiera](#29-de-septiembre--documentación-del-proyecto-y-reglas-para-la-ia) (29 sep): de ahí salió la regla de consultar antes de decidir.
2. [La app apuntaba a una IP vieja y no mostraba errores](#29-de-septiembre--documentación-del-proyecto-y-reglas-para-la-ia) (29 sep): de ahí salió la skill `async-feedback`.
3. [Adopción quedaba fuera del MVP por una mala interpretación](#1-de-octubre--reescritura-con-sdd-y-alcance-del-mvp) (1 oct).
4. [Un push dejó fuera parte del trabajo](#2-de-noviembre--commit-de-mascotas-y-push-incompleto) (2 nov).
5. [«No cambió nada»: mi teléfono estaba en modo oscuro](#3-de-noviembre--uiux-de-mascotas-y-comunidades) (3 nov).
6. [Bucket inexistente y foto perdida al editar](#4-de-noviembre--fotos-de-comunidad-y-pestañas) (4 nov).
7. [Regla de esqueletos y del documento de diseño](#5-de-noviembre--portada-tipo-grupo-caché-y-regla-de-esqueletos) (5 nov).
8. [Cómo probar Chat con un solo teléfono](#10-de-noviembre--chat-completo-y-adopción) (10 nov).
9. [Los avisos de eventos se reescribieron tres veces](#12-de-noviembre--adopción-verificada-avisos-de-eventos-y-feed) (12 nov).
10. [Las notificaciones con la app cerrada salieron del MVP](#22-de-noviembre--cierre-del-mvp-pulido-y-casos-límite) (22 nov).
11. [El enlace de correo de Supabase no regresa a la app](#22-de-noviembre--cierre-del-mvp-pulido-y-casos-límite) (22 nov).
12. [Las pruebas de casos límite encontraron tres errores reales](#22-de-noviembre--cierre-del-mvp-pulido-y-casos-límite) (22 nov).

---

## Registro por fecha

### 17 de agosto – 18 de septiembre — base del proyecto

En esta etapa programé yo. Usé Gemini solo para preguntas generales y no conservo esas conversaciones. Los commits muestran el modelo de datos inicial, el módulo de mascotas, la autenticación con Supabase, la reestructura a monorepo (backend NestJS y app Expo), la pantalla de inicio de sesión y la navegación. A partir de septiembre empecé a usar Codex y el trabajo quedó mitad mío y mitad de Codex.

### 21 – 23 de septiembre — guards y comentarios con Codex

- **Qué pedí:**
  - Que revisara el servicio de publicaciones y solo me señalara el error, sin modificar código.
  - Que revisara mi guard global con el decorador `@Public()`.
  - Que me **guiara**, sin escribirlo, para crear un guard que comparara el usuario del token con el autor de una publicación.
- **Qué hizo la IA:**
  - Confirmó que `SupabaseAuthGuard` registrado como `APP_GUARD` y `@Public()` estaban bien planteados.
  - Me explicó cómo el guard deja el ID en `request.user`, por qué en NestJS los guards se ejecutan antes que los pipes y cómo armar `PostOwnerGuard`.
  - Le pedí agregar el modelo de comentarios y agregó `Comment` y `PostLike` en `schema.prisma`, con relaciones, índices y una clave compuesta contra «Me gusta» duplicados.
- **Qué decidí o corregí:**
  - Escribí yo el guard y el controlador de comentarios. La IA me señaló errores concretos: usar `ParseIntPipe` y no `parseInt`, el guard leía `params.id` cuando la ruta usaba `:commentId`, y había confundido la clase `UpdateCommentDto` con su variable.
  - La idea de no repetir publicaciones ya vistas (`PostView` con `onViewableItemsChanged`) me la explicó, pero decidí dejarla para después de terminar las funciones básicas.
- **Cómo se verificó:** la IA compiló el backend para encontrar los errores de `@Param` y del DTO. No hubo pruebas en el teléfono. Resultado: commit `61fd1f8`.

### 29 de septiembre — documentación del proyecto y reglas para la IA

- **Qué pedí:** documentación para la idea de Petzy (perfiles de mascota, feed, comunidades, eventos; chat y detección de raza como opcionales), saber qué más hacía falta y un archivo para que cualquier IA entendiera el proyecto.
- **Qué hizo la IA:** creó `docs/PROYECTO.md`, el README, la API, datos y permisos, y [AGENTS.md](AGENTS.md).
- **Qué decidí o corregí:**
  - Pedí dejar claro que **Supabase** es la base de datos, para no programar servicios que Supabase ya resuelve. La IA aclaró que Prisma podía seguir como cliente de esa base y comprobó que el entorno local todavía apuntaba a PostgreSQL local (D-01).
  - Definí que la edad de una mascota se calcula con su fecha de nacimiento (D-02) y que las publicaciones de comunidad no salen en el feed principal.
  - Agregué reglas a `AGENTS.md`:
    - Pensar cada cambio a escala del proyecto.
    - **Consultar antes de decidir** algo no definido, como una columna nueva.
    - Diseñar pantallas sencillas y cálidas, centradas en las mascotas, siguiendo `apple-design`.
  - Para eventos pedí que solo `ADMIN` y `MODERATOR` los creen, que la comunidad se divida en «Publicaciones» y «Eventos», y que el mapa solo marque el punto, con «Cómo llegar» abriendo la app de mapas.
  - Elegí trabajar con **SDD** (desarrollo guiado por especificaciones).
- **Episodio — la IA programó sin permiso:** después de proponer eventos, la IA empezó a escribir modelos, API y pantallas de comunidades y eventos. Le dije que nunca le pedí empezar a codificar. Reconoció el error, cerró lo empezado sin agregar más y dejó la migración sin aplicar. Desde entonces la regla de consultar antes de decidir es la primera que reviso en cada sesión.
- **Episodio — IP vieja y errores ocultos:** al probar comunidades en mi teléfono vi carga infinita, el modal tapado por el teclado y un botón «Creando» que no creaba nada. La IA encontró que la app apuntaba a una IP antigua y que el error del envío no se mostraba en el modal. Lo corrigió con un límite de espera, mensajes según la causa y el error dentro del modal.
- **Cómo se verificó:** exportación web y lint locales, y mi prueba en el teléfono que reveló el problema. A partir de esto pedí la skill [async-feedback](.agents/skills/async-feedback/SKILL.md): toda acción que espera la red debe mostrar espera, éxito, error y reintento.

### 1 de octubre — reescritura con SDD y alcance del MVP

- **Qué pedí:** que leyera la skill de *spec-driven development* y la documentación, que me dijera qué iba a hacer y después reescribiera todo según la skill.
- **Qué hizo la IA:** propuso un mapa de capacidades con ocho módulos y una ficha por módulo con criterios comprobables. Al pedirle una segunda revisión, corrigió criterios que dependían de módulos posteriores y añadió la ficha de diseño.
- **Qué decidí o corregí:**
  - Una persona **sin mascota** también puede registrarse y participar.
  - **Adopción:** la IA propuso tratarla como «encontrar hogar» y no como venta: un anuncio por animal y estados que no traten a los animales como objetos. Sobre cobrar gastos veterinarios recomendó no incluir costos en la primera versión, y acepté dejar eso para el futuro.
  - **Corrección:** la IA documentó adopción como función futura. Le aclaré que adopción **sí va en el MVP**, que lo futuro eran solo los costos, y que depende del chat privado, así que se implementa después de él.
  - Pedí una ruta secuencial (Cuenta → Publicaciones → Perfiles → …) con el estado integrado de cada módulo, e incorporé un archivo externo sobre SDD para describir los flujos por persona.
- **Cómo se verificó:** fue trabajo documental, sin pruebas. Resultado: commit `9b7ef19`.

### 2 – 25 de octubre — fichas, planes y comienzo del código con Codex

Trabajé con Codex, pero no conservo estas conversaciones. Lo que muestran el diario y los commits:

- **7 – 10 oct:** se aprobaron fichas, planes y tareas de Cuenta, Publicaciones, Perfiles, Mascotas, Interacciones, Comunidades, Chat, Adopción y Eventos (D-01 a D-119).
- **18 oct:** se aprobó el diseño de la app (D-120 a D-133).
- **19 oct:** autoricé comenzar a programar; commits `fc63294` y `11ac213`. D-134 fija que la app usa NestJS y Prisma para los datos durante el MVP.
- **20 – 25 oct:** commit `32629c2`. El [reporte del 25 de octubre](docs/REVISIONES/2026-10-25-PUBLICACIONES.md) registra correcciones en Publicaciones e Interacciones; por ejemplo, editar con `null` producía un error 500. Se verificó con 52 pruebas HTTP y 97 unitarias. Según [el informe de integración](docs/REVISIONES/2026-10-25-INTEGRACION-PUBLICACIONES.md), recorrí Publicaciones en mi teléfono y lo acepté.

### 26 de octubre — Perfiles cerrado y Mascotas planeado

- **Qué pedí:** que revisara dónde se quedó el agente anterior y aplicara los ajustes documentados de Perfiles, y que me avisara para probar en el teléfono.
- **Qué hizo la IA:** «Mi perfil» en modo lectura con «Modificar perfil», la alerta «Perfil actualizado» y la búsqueda de personas en su propia pantalla ([reporte](docs/REVISIONES/2026-10-26-AJUSTES-PERFIL-BUSCAR.md)).
- **Qué decidí o corregí:**
  - Pedí una **X** para borrar la búsqueda de usuarios.
  - Propuse que, si alguien desactiva su cuenta y era el único integrante de una comunidad, la comunidad se elimine **con sus publicaciones**. La IA definió las reglas exactas, entre ellas que una cuenta desactivada también cuenta como integrante, y las acepté (D-136).
  - Para Mascotas pedí primero el plan, **sin codificar**, y luego lo autoricé.
- **Cómo se verificó:**
  - **Local:** E2E y unitarias, según la [auditoría](docs/REVISIONES/2026-10-26-AUDITORIA-PERFILES.md).
  - **Teléfono:** probé borrar la foto de perfil, borrar una comunidad con un solo miembro y el resto del flujo, y le dije que todo funcionaba. Con eso se cerró Perfiles ([cierre](docs/REVISIONES/2026-10-26-CIERRE-PERFILES.md), D-137).
  - **Mascotas:** quedó implementado con 64 pruebas HTTP y 104 unitarias ([reporte](docs/REVISIONES/2026-10-26-MASCOTAS.md)), pero sin mi prueba en el teléfono.
  - El mismo día se diagnosticó un fallo de Expo Go en Windows ([reporte](docs/REVISIONES/2026-10-26-EXPO-WINDOWS.md)).

### 2 de noviembre — commit de Mascotas y push incompleto

- **Qué pedí:** commit y push de Mascotas, dejando claro para el siguiente agente que yo todavía no había probado nada.
- **Episodio — push incompleto:** la IA subió solo Mascotas (`4b3cbf9`) y dejó fuera los cambios de Perfil y Buscar. Se lo reclamé; los integró, resolvió un conflicto con la actualización a Expo SDK 58 y subió todo (`323f4db`, `6ac9438`).
- **Cómo se verificó:** la IA comprobó con Git que la rama quedó sincronizada y sin cambios locales. En el relevo quedó anotado que mi prueba en el teléfono seguía pendiente.

### 3 de noviembre — UI/UX de Mascotas y Comunidades

- **Qué pedí:** mejorar Mascotas con la skill `ui-ux-pro-max`, conservando los colores de Petzy y explicando antes qué prioriza la skill.
- **Qué hizo la IA:** resumió sus prioridades (accesibilidad, contraste, zonas táctiles, estados de carga) y creó tokens de diseño compartidos ([petzy-theme.ts](apps/mobile/constants/petzy-theme.ts)), tarjetas con la foto como protagonista, respuesta al tocar y esqueletos de carga.
- **Qué decidí o corregí:**
  - Pedí esqueletos **en todas las pantallas** y una auditoría completa de UI/UX.
  - La IA recomendó conservar el aviso «Actualizando mascotas…» al volver a la pantalla y lo acepté. El 22 de noviembre lo cambiamos por una actualización silenciosa.
  - Señalé que el formulario tenía dos botones para la foto; se dejó uno.
  - **Rechacé** cambiar el selector de especie por chips.
  - Acepté «Editar ficha» y «Retirar ficha» como botones directos en lugar del menú de tres puntos.
  - El logotipo «Petzy» queda solo en Inicio.
  - **Comunidades:** propuse separar «Explorar comunidades» y «Mis comunidades». La IA lo evaluó como el patrón de Discord o Reddit y lo implementó con `GET /communities?mine=true`, abriendo en «Mis comunidades» si ya pertenezco a alguna.
  - Pedí unificar los botones de crear en un **«+» flotante**, subirlo un poco y hacer la barra inferior con desenfoque.
- **Episodio — «no cambió nada»:** después de un cambio de paleta le dije que no veía diferencia. La IA preguntó y resultó que mi teléfono estaba en modo oscuro y el cambio era del modo claro. Luego pedí mejorar el modo oscuro: aclaró las tarjetas y cambió la sombra, que no se veía, por un resplandor verde.
- **Episodio — permiso bloqueado:** cambiar la URL del repositorio remoto quedó bloqueado por el modo automático de la herramienta, así que lo ejecuté yo.
- **Cómo se verificó:**
  - **Local:** TypeScript, ESLint y exportación iOS en cada cambio.
  - **Teléfono y entorno compartido:** recorrí Mascotas en el iPhone con mi cuenta real de Supabase y lo di por cerrado ([cierre](docs/REVISIONES/2026-11-03-CIERRE-MASCOTAS.md)).
  - Commits `263face` y `933cf32`.

### 4 de noviembre — fotos de comunidad y pestañas

- **Episodio — bucket inexistente:** al subir una foto de comunidad el servidor respondió «Bucket not found». La IA explicó que faltaba el bucket privado `community-photos`, lo creé en Supabase y quedó documentado en el README. Se verificó en el **entorno compartido**: después pude guardar fotos al crear una comunidad.
- **Episodio — foto perdida al editar:** al editar una comunidad elegía una foto y no aparecía ni salía ningún error. La IA encontró que la pantalla recargaba datos al volver de la galería y desmontaba el formulario; lo corrigió en comunidades y en mascotas.
- **Qué pedí:** que la foto de la comunidad se viera completa y no como foto de perfil, y dividir la pantalla en pestañas («Publicaciones», «Integrantes», y «Contenido retirado» y «Expulsados» solo para administración).
- **Qué hizo la IA:** portada ancha, cabecera fija y pestañas con icono.
- **Qué decidí o corregí:**
  - Sin publicaciones no debe haber scroll vacío.
  - La tarjeta de publicación de la comunidad debe ser igual a la del feed, con foto de perfil y fecha relativa.
  - Al crear una publicación se abre su detalle con un **toast** acorde a la app (D-138).
- **Cómo se verificó:** TypeScript, ESLint y exportación iOS. Los cambios quedaron listos para mi recorrido en el teléfono.

### 5 de noviembre — portada tipo grupo, caché y regla de esqueletos

- **Qué pedí:**
  - Una cabecera como la de los grupos de Facebook, a partir de una imagen de referencia del proyecto.
  - Revisar por qué tardaban las fotos.
  - Evitar que todo se recargara al regresar de una publicación.
- **Qué hizo la IA:** portada con «Volver» y «···» encima, barra «Escribe algo…», caché de fotos en memoria y recarga silenciosa al regresar.
- **Qué decidí o corregí:**
  - **Regla nueva:** le reclamé que el último cambio no incluía su esqueleto de carga. Desde entonces todo cambio de interfaz lleva su esqueleto y cada decisión de diseño se registra en [docs/06-DISENO-DE-INTERFACES.md](docs/06-DISENO-DE-INTERFACES.md), en el mismo cambio.
  - Noté que el esqueleto y los datos aparecían al mismo tiempo y supuse que se pintaba antes de que llegara todo. La IA confirmó el diagnóstico y ahora los datos se muestran juntos.
- **Cómo se verificó:** TypeScript, ESLint y exportación iOS. Al día siguiente le confirmé que el diseño estaba bien en el teléfono.

### 6 – 8 de noviembre — moderación y cierre de Comunidades

- **Qué reporté:** al retirar una publicación desde la comunidad no se refrescaba la lista y no aparecía en «Contenido retirado».
- **Qué hizo la IA:** corrigió el regreso tras retirar (`goBackOrReplace`). Me explicó que retirar una publicación **propia** no la manda a «Contenido retirado», porque ese historial es para la moderación de contenido ajeno, y me indicó cómo probarlo con una segunda cuenta.
- **Qué decidí:** dejar el comportamiento de «retirar publicación propia» como estaba.
- **Cómo se verificó:** según la ruta de desarrollo, el 8 de noviembre recorrí con dos cuentas todo el flujo de Comunidades (explorar, crear, unirse, roles, expulsar, retirar con motivo, restaurar). Ese día también se integraron el motivo de retirada con aviso al autor (D-138 a D-143), la X para borrar la búsqueda de comunidades y la entrada de **Eventos al MVP dentro de Comunidades**, en dos partes (D-144). Commits `0101319`, `da9a65e`, `ed91fda` y `669257b`.

### 9 de noviembre — Eventos parte 1 y Chat

- **Episodio — entorno:** la app no conectaba con el backend. La IA encontró la variable de la API duplicada en el `.env`; reinicié Expo y funcionó.
- **Qué pedí:** un flujo de prueba de Eventos parte 1 y, tras probarlo, dos ajustes: **esqueleto en lugar de ruedita**, que ya estaba acordado, y la descripción dentro del bloque de horario y lugar con la etiqueta «Descripción del evento».
- **Cómo se verificó:** **teléfono**, con dos cuentas: crear con mapa, listas, «Iré», editar con aviso y cancelar. Confirmé los ajustes y se cerraron EV-T15 a EV-T17 y CO-T17 (commits `e3127af`, `c60a77b`).
- **Chat:**
  - La IA comparó Supabase Realtime con WebSocket de NestJS. Elegí **WebSocket de NestJS** (D-148).
  - Pedí que Mensajes fuera una **pestaña** de la barra y que la pestaña activa fuera **beige** en lugar de naranja (D-150, D-151).
  - Pedí poder escribirle a alguien desde una **búsqueda en Mensajes**; de dos propuestas elegí la A (D-152).
  - La IA diagnosticó que Metro fallaba por falta de memoria en mi equipo, no por el código.
- **Cómo se verificó:**
  - **Local:** 14 pruebas E2E de Chat, 98 HTTP y 126 unitarias.
  - **Teléfono:** probé abrir un chat, enviar y ver «Leído». «En línea» no pude probarlo porque no tenía dos cuentas abiertas a la vez.
  - Commit `b6cb63e`.

### 10 de noviembre — Chat completo y Adopción

- **Qué pedí:** reportar un mensaje **dejándolo presionado**, ir al perfil al tocar el nombre y tener el menú «…» en cada chat de la bandeja (D-153). Propuse un buscador dentro del reporte; la IA explicó por qué no era urgente y lo aplacé.
- **Episodio — probar con un solo teléfono:** no tenía dos dispositivos para probar el aviso de mensaje nuevo. La IA creó [chat-probe.mjs](apps/backend/scripts/chat-probe.mjs), que hace de segunda cuenta desde la computadora. Le dije que se trababa; agregó pasos visibles y límites de tiempo. También pedí que el aviso dijera claramente que era un mensaje nuevo: «MENSAJE NUEVO · ahora» (D-154).
- **Episodio — Docker:** las E2E no corrían porque Docker quedó en mal estado. Hicimos commit, reinicié la PC y pasaron.
- **Adopción:** la IA implementó backend, migración y pantallas. Le señalé que el formulario pedía la foto antes que los datos, al revés que los demás; lo comparó con los otros formularios y lo reordenó (D-155).
- **Cómo se verificó:**
  - **Local:** E2E 98 de 98 contra PostgreSQL desechable ([chat.e2e-spec.ts](apps/backend/test/chat.e2e-spec.ts)).
  - **Teléfono:** probé bloqueo, desbloqueo, ocultar, borrar, reporte y el aviso usando el script.
  - **Pendiente:** Chat no quedó verificado porque faltaban las notificaciones con la app cerrada y confirmar «En línea».
  - Commits `234dd0c`, `05775bf`, `beb5362`, `26445e8` y `60b3e30`.

### 12 de noviembre — Adopción verificada, avisos de eventos y feed

- **Qué reporté:** con una sola foto, el carrusel de adopción se podía deslizar; la IA lo bloqueó.
- **Cómo se verificó Adopción:** en el **teléfono**, con dos cuentas, probé publicar, editar fotos, contactar, reportar, cambiar estado, filtros, retirar y restaurar. Quedó verificada (`75e43a5`). La migración se aplicó a la base de desarrollo, que es el **entorno compartido**.
- **Episodio — avisos de eventos:** la IA hizo la campana de avisos (D-156). El texto se corrigió tres veces:
  1. Pedí quitar las comillas angulares alrededor del nombre del evento.
  2. Pedí negritas solo en el nombre y en lo que cambió.
  3. Un compañero me dijo que era mucho texto, así que pedí un formato corto: el nombre arriba y una línea con lo nuevo.
- **Cómo se verificó:** **teléfono**, con dos cuentas, recibiendo avisos de cambio de lugar, de hora y de cancelación. **Local:** prueba de volumen con 1 000 «Iré» ([events.e2e-spec.ts](apps/backend/test/events.e2e-spec.ts)). Commit `a5214e7`.
- **Feed:** pedí cambiar **solo el feed** con la skill `impeccable`, sin perder colores ni estilo. Elegí «foto protagonista», lo revisé y lo aprobé (`631add6`).

### 20 de noviembre — comparación con GitHub

Pedí comparar `main` en GitHub con mi copia local **sin modificar nada**. La IA confirmó que eran iguales y que el último cambio era el pulido del feed. Después le pedí subir lo que hubiera sin commit; no había código pendiente, solo carpetas de herramientas.

### 22 de noviembre — cierre del MVP, pulido y casos límite

- **Inicio de sesión:** la app no obtenía el token. La IA revisó mi `.env` y el backend y encontró que el proyecto de Supabase estaba pausado. Lo reactivé y comprobó que el backend ya respondía.
- **Revisión de tareas:** pregunté por qué había tareas de Eventos sin marcar. Dependían de las notificaciones con la app cerrada, que necesitan un build de desarrollo y una cuenta de Apple Developer. La IA también encontró documentos desactualizados y los corrigió (`eccb985`).
- **Episodio — notificaciones fuera del MVP:** no tengo cuenta de Apple Developer ni teléfono Android. La IA recomendó probarlas en Android si conseguía uno; con la entrega al día siguiente, decidí sacarlas del MVP y dejarlas en [trabajo futuro](docs/FUTURO/NOTIFICACIONES-PUSH.md) (D-157).
- **Cierre de Chat, Eventos y Comunidades:**
  - Confirmé en el teléfono las dos pruebas que faltaban de Chat: varias páginas de mensajes y «En línea».
  - La IA corrió todas las E2E. Dos veces se equivocó en la configuración: le faltó una opción de Node y dejó vacía la variable de la base, con lo que 105 pruebas se saltaron. Lo detectó, lo explicó y repitió hasta tener 109 de 109.
  - Commit `ec77a44`.
- **Pulido de pantallas con `impeccable`:**
  - Pedí mejorar las pantallas **sin perder la identidad de Petzy** y **una a la vez**, con un commit por pantalla. Autoricé el orden que propuso la IA.
  - Aprobé **deslizar para actualizar**, que la IA propuso sin aplicarlo hasta que lo autoricé.
  - Decidí que la cabecera de la comunidad **se desplace** con el contenido.
  - Le señalé que «Mis mascotas» no tenía cómo regresar a «Mi perfil».
  - Pedí los tres últimos formularios en un solo commit.
  - Commits `1cf7110` a `76efc75`.
- **Episodio — enlace de correo:**
  - La IA puso en el backend la dirección de Expo Go y yo configuré Supabase.
  - En el **entorno compartido** el registro envió el correo y el enlace **confirmó la cuenta**: después pude iniciar sesión.
  - Pero Supabase no regresó a la app; Safari abrió su dirección por defecto y no pudo conectar. Lo mismo pasó con la recuperación de contraseña.
  - Decidí dejarlo pendiente (`2f31bc2`).
- **Diseño:** pedí registrar las tareas de diseño como cubiertas. La IA me advirtió que DA-T03 (elegir el tema) no existía y que DA-T04 había cambiado por decisiones posteriores. Pedí implementar el tema: «Automático / Claro / Oscuro» en Mi perfil. Lo probé en el teléfono y funcionó. Pedí cambiar los textos a «Apariencia de la aplicación», con una ayuda menos técnica y comillas rectas en "Automático" (commits `3a6dae2` a `c9c6152`).
- **Episodio — casos límite:**
  - Pedí probar casos límite de todo. La IA escribió una suite con 195 casos sobre toda la API ([edge-cases.e2e-spec.ts](apps/backend/test/edge-cases.e2e-spec.ts)).
  - Encontró tres errores reales y los corrigió:
    - Un ID gigante devolvía error 500.
    - Buscar «%%» devolvía todas las cuentas.
    - Varios «Iré» simultáneos chocaban entre sí.
  - Reconoció que dos casos fallaban porque su propia prueba estaba mal planteada. También deshizo un reformateo automático que se coló en archivos no relacionados.
  - La prueba mostró que se aceptaba un nacimiento en 1800. La IA me explicó qué sería un año mínimo y fijé **40 años** (D-158).
  - Verificación **local**: 197 de 197 casos, E2E 117 de 117 y unitarias en verde ([reporte](docs/REVISIONES/2026-11-22-CASOS-LIMITE.md)). Commits `d7fb1e8` y `bd0febb`.
- **Revisión del pulido:** además de pasar TypeScript y ESLint en cada pantalla, revisé en el **teléfono** las 12 pantallas pulidas y quedaron bien.

---

## Lo que aprendí a pedirle a la IA

| Situación | Qué cambié en mi forma de pedir | Dónde quedó |
| --- | --- | --- |
| Programó sin autorización (29 sep). | Pido primero el plan y espero a aprobarlo. | [AGENTS.md](AGENTS.md), «Consultar antes de decidir». |
| No mostraba errores ni espera (29 sep). | Toda acción de red con espera, error y reintento. | [async-feedback](.agents/skills/async-feedback/SKILL.md). |
| Push incompleto (2 nov). | Pido revisar el estado de Git antes de subir. | [Relevo de desarrollo](docs/00-RELEVO-DE-DESARROLLO.md). |
| Pantallas sin esqueleto (5 nov). | Cada cambio de interfaz con su esqueleto y su registro. | [Documento de interfaces](docs/06-DISENO-DE-INTERFACES.md). |
| Textos largos o técnicos (12 y 22 nov). | Pido redacción corta y cotidiana. | Avisos de eventos; «Apariencia». |
| Rediseño masivo (22 nov). | Una pantalla a la vez, con commit por pantalla. | Historial de Git del 22-11-2026. |
| Dar algo por terminado sin probarlo. | Nada queda «Verificado» sin mi recorrido en el teléfono. | [Ruta de desarrollo](docs/00-RUTA-DE-DESARROLLO.md). |

## Límites

- No conservo las conversaciones de Gemini (agosto y septiembre, solo preguntas generales) ni las de Codex del 2 al 25 de octubre; esos tramos salen de commits y reportes.
- Algunas sesiones largas se resumieron automáticamente al llenarse su contexto; en esos tramos (por ejemplo, el 8 de noviembre) me apoyé en los commits y la ruta de desarrollo.
- Las pruebas E2E simulan la sesión de Supabase y el almacenamiento de fotos; lo que depende de Supabase real o del teléfono se indica en cada entrada.
