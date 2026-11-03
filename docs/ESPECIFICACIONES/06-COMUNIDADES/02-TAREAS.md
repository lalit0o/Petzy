# Tareas aprobadas: Comunidades (`comunidades`)

**Estado:** lista revisada y aprobada por el usuario el 10 de octubre de 2026; CO-T01–CO-T07, CO-T09 y CO-T12 tienen implementación y pruebas locales al 25 de octubre de 2026; las restantes mantienen los pendientes indicados abajo. Deriva de la [ficha aprobada](../06-COMUNIDADES.md), el [plan aprobado](01-PLAN.md), CO-01–CO-21 y D-20, D-23, D-25, D-27–D-28, D-36–D-37, D-59–D-74. El usuario pidió terminar la documentación antes de comenzar código.

**Trabajo futuro fuera del MVP:** D-86 aplaza las suspensiones administrativas de D-78 y D-80. El relevo y la ocultación temporal asociados se definirán con el futuro sistema web; no son condición para cerrar estas tareas de Comunidades.

**Avance del 25-10-2026:** inventario real: cero comunidades y fotos previas; migración D-74 aplicada a PostgreSQL aislado y desarrollo, con respaldo de tablas afectadas vacías. Hay exploración, textos, membresías, miembros, roles, expulsión/desbloqueo y permiso compartido con Publicaciones/Interacciones. CO-T08 tiene roles y protección concurrente del último administrador, pero falta integrarla con la futura desactivación de cuenta. CO-T10–CO-T11 (foto propia de comunidad) siguen sin implementar; CO-T13–CO-T15 tienen pantallas de texto y gestión, pendientes de completar fotos y de revisión en dispositivo. CO-T16–CO-T18 no se cierran. Ver [evidencia](../../REVISIONES/2026-10-25-INTEGRACION-PUBLICACIONES.md). La autorización de desarrollo vigente sustituye las frases históricas sobre esperar permiso.

**Acuerdo posterior del usuario, 25-10-2026:** acepta funcionalmente Feed/Publicaciones y la integración comunitaria. PU-T13/PU-T15 e IN-T12/IN-T13 se cierran. Solicita dejar los retoques de diseño de Comunidades para este módulo: registrarlos y realizarlos en CO-T13–CO-T15, conservando los permisos y flujos ya aceptados. Esta aceptación no cierra fotos comunitarias, desactivación de cuenta ni los restantes criterios propios de Comunidades.

## Qué se hará, en orden

1. Revisar los datos y rutas actuales, y preparar el tema y el registro de expulsiones aprobados.
2. Aplicar una sola regla de acceso a comunidad, membresía y rol; completar creación, búsqueda y administración.
3. Guardar y entregar la foto privada, y conectar publicaciones y comentarios sin duplicar su lógica.
4. Construir las pantallas de exploración, detalle y administración con respuestas claras a carga y errores.
5. Comprobar Comunidades con API y móvil. La asistencia a eventos se integrará en la etapa posterior de Eventos y solo entonces se cerrará CO-19.

Cada casilla se marcará después de ejecutar **y comprobar** su aceptación. Los archivos y rutas son previsiones para una implementación futura; esta lista no autoriza programar ni ejecutar una migración. Si cambia una decisión, actualizar primero ficha, plan y tarea afectada.

## Trabajo técnico y comprobación

- [x] **CO-T01. Inventariar comunidades y posibles datos de prueba.** Depende de: ninguna. Prepara CO-01–CO-21 y D-74.
  - **Aceptación:** se identifican los usos de `Community`, `CommunityMember`, `Post.communityId`, `photoUrl`, `/post` y la pantalla de Comunidades. Se comprueba con una consulta de solo lectura si la base de desarrollo conectada tiene comunidades o fotos; si no hay conexión, se registra «sin verificar», sin afirmar que está vacía. Se anotan consumidores de Publicaciones, Interacciones, Perfiles y el futuro Eventos.
  - **Verificar:** búsquedas en código y esquema, consulta de conteos y referencias de foto cuando exista conexión, y contraste con [API](../../05-API.md) y [Datos y permisos](../../04-DATOS-Y-PERMISOS.md).
  - **Archivos previstos:** inventario en `01-PLAN.md`; `apps/backend/prisma/schema.prisma`, `apps/backend/src/post/`, `apps/backend/src/user/` y `apps/mobile/app/(tabs)/comunidades.tsx` solo para inspección.

- [x] **CO-T02. Preparar tema, bloqueos e índice de miembros.** Depende de: CO-T01. Cubre CO-01, CO-15–CO-16, CO-20 y D-63, D-67–D-68, D-74.
  - **Aceptación:** una migración versionada añade `Community.topic String` obligatorio de 2 a 50 caracteres sin imponer unicidad a `name`; crea `CommunityExpulsion` con `communityId Int`, `userId String`, `expelledById String` y `expelledAt DateTime`, todos obligatorios, clave `(communityId, userId)`, relaciones e índice para excluir bloqueos en búsquedas. Añade índice `(communityId, joinedAt, userId)` a miembros. La tabla nueva comienza vacía. Si hay comunidades de prueba anteriores, se detiene la aplicación hasta asignarles temas reales; no se borran ni se inventa un tema.
  - **Verificar:** revisar SQL, claves, índices y nulabilidad antes de aplicar; probar en la base de desarrollo identificada solo tras autorización de código; `pnpm --filter proyecto-backend exec prisma generate` y `pnpm backend:build`. Comprobar que dos comunidades conservan el mismo nombre con IDs distintos.
  - **Archivos previstos:** `apps/backend/prisma/schema.prisma`, nueva migración en `apps/backend/prisma/migrations/` y pruebas de esquema o servicio en `apps/backend/src/community/`.

- [x] **CO-T03. Aplicar una regla compartida de acceso.** Depende de: CO-T02, CU-T04 de Cuenta y PE-T02 de Perfiles para sesión y cuenta activa; no depende de la desactivación completa PE-T07. Cubre CO-03–CO-05, CO-11, CO-16–CO-18 y D-20, D-36–D-37, D-70.
  - **Aceptación:** el backend toma la identidad del token y distingue vista previa permitida, bloqueo por expulsión, membresía activa y roles `MEMBER`/`MODERATOR`/`ADMIN`. Una persona expulsada no obtiene la comunidad por ID aunque su token sea válido; una cuenta desactivada no conserva permiso efectivo. Publicaciones y Eventos podrán llamar al mismo control. Ninguna ruta confía únicamente en botones ocultos o `userId` del cliente.
  - **Verificar:** pruebas de servicio y solicitudes directas con cuenta activa/inactiva, miembro, no miembro, expulsado, otra comunidad y token inválido; `pnpm --filter proyecto-backend test -- --runInBand`.
  - **Archivos previstos:** servicio y pruebas en `apps/backend/src/community/`, registro en `apps/backend/src/app.module.ts` y adaptador de acceso en `apps/backend/src/post/` cuando se integre.

- [x] **CO-T04. Crear y editar los datos de una comunidad.** Depende de: CO-T02–CO-T03. La foto se completa en CO-T10. Cubre CO-01, CO-20–CO-21 y D-63, D-67, D-72–D-74.
  - **Aceptación:** `POST /communities` exige nombre 3–60, descripción 10–500 y tema 2–50 con contenido; crea comunidad y primera membresía `ADMIN` en una transacción. Acepta nombres repetidos. `PATCH /communities/:id` permite solo al `ADMIN` vigente corregir esos textos sin cambiar ID ni administrador implícitamente. Un dato inválido o fallo deja el formulario disponible para reintento y no crea una comunidad huérfana. La foto opcional de creación y edición se completa en CO-T10.
  - **Verificar:** E2E con dos creadores, nombres iguales, límites, texto vacío, `MODERATOR`, otro `ADMIN`, envío repetido y error de base; `pnpm --filter proyecto-backend test:e2e`.
  - **Archivos previstos:** controlador, servicio y DTO en `apps/backend/src/community/`, prueba en `apps/backend/test/`.

- [x] **CO-T05. Explorar, buscar y abrir solo comunidades visibles.** Depende de: CO-T02–CO-T04. Cubre CO-03, CO-06, CO-15, CO-18, CO-20 y D-61, D-67, D-70, D-72.
  - **Aceptación:** `GET /communities` permite explorar o buscar por nombre/tema con consulta de 2–50 caracteres, 20 resultados por defecto y máximo 30, orden `id DESC` y cursor sin duplicados. Filtra los bloqueos del solicitante antes de paginar. `GET /communities/:id` devuelve a un no miembro no expulsado solo nombre, descripción, foto disponible y número de miembros activos; no devuelve posts, lista de miembros, correo ni ruta interna de foto. Dos nombres iguales quedan como resultados separados.
  - **Verificar:** E2E con más de 30 comunidades, dos homónimas, coincidencia por tema, cuenta sin mascota, expulsado, usuario inactivo, ID directo y cambio de página; `pnpm --filter proyecto-backend test:e2e`.
  - **Archivos previstos:** controlador, servicio y DTO de consulta en `apps/backend/src/community/`; prueba en `apps/backend/test/`.

- [x] **CO-T06. Entregar la lista de miembros sin datos privados.** Depende de: CO-T03 y CO-T05. Cubre CO-11, CO-17 y D-37, D-69.
  - **Aceptación:** `GET /communities/:id/members` exige membresía activa; entrega nombre de usuario, referencia protegida de foto y rol de miembros activos, 20 por página y máximo 30. Excluye cuentas desactivadas y nunca entrega correos ni rutas internas de Storage. La vista previa de un no miembro conserva solo el conteo, sin lista.
  - **Verificar:** E2E con más de 30 miembros, cuenta desactivada, miembro, no miembro, expulsado y administrador de otra comunidad; `pnpm --filter proyecto-backend test:e2e`.
  - **Archivos previstos:** controlador y servicio en `apps/backend/src/community/`, DTO de paginación y prueba en `apps/backend/test/`.

- [x] **CO-T07. Unirse y salir sin duplicar ni borrar contenido.** Depende de: CO-T03 y CO-T05. La protección del último administrador se completa en CO-T08. Cubre CO-02, CO-06, CO-12 y D-60, D-62, D-66, D-68.
  - **Aceptación:** `POST /communities/:id/members/me` crea una sola membresía `MEMBER` inmediata si no hay bloqueo; repetirlo no aumenta el conteo. `DELETE` retira una membresía vigente sin borrar publicaciones, comentarios ni fotos previos. Quien salió pierde acceso en la siguiente solicitud y, si vuelve, obtiene `MEMBER`, no el rol anterior. La ruta no permite que salga el último `ADMIN` activo; CO-T08 cierra su comprobación ante concurrencia.
  - **Verificar:** E2E con unión repetida y simultánea, salida, contenido anterior, regreso, expulsado y último administrador; `pnpm --filter proyecto-backend test:e2e`.
  - **Archivos previstos:** controlador y servicio en `apps/backend/src/community/`, transacciones Prisma y prueba en `apps/backend/test/`.

- [x] **CO-T08. Gestionar roles y proteger al último administrador.** Depende de: CO-T06–CO-T07. Provee el control que necesita PE-T07, sin esperar a PE-T07 para evitar una dependencia circular. Cubre CO-05, CO-11–CO-13 y D-36–D-37, D-62, D-65.
  - **Integración comprobada, 26-10-2026:** PE-T07/PE-T10 completan desactivación y recuperación de roles. Salida, degradación, creación y dos desactivaciones concurrentes se verificaron en PostgreSQL aislado con guard real y Auth simulado. [Evidencia](../../REVISIONES/2026-10-26-PERFILES.md). Sustituye el pendiente histórico del 25 de octubre; no cierra fotos ni diseño comunitario.
  - **Aceptación:** solo un `ADMIN` vigente cambia el rol de un miembro vigente de su comunidad entre los tres roles. Salir, bajar de rol y desactivar la cuenta del último `ADMIN` activo se rechazan hasta nombrar otro. Las operaciones se serializan por comunidad para que dos solicitudes simultáneas no dejen cero administradores. La cuenta desactivada conserva su membresía y rol, pero deja de contarse y de acceder; al reactivarse los recupera conforme a Perfiles.
  - **Verificar:** E2E con dos administradores, dos solicitudes simultáneas, degradación propia, cuenta inactiva, rol en otra comunidad e integración posterior con PE-T07/PE-T10; `pnpm --filter proyecto-backend test:e2e`.
  - **Archivos previstos:** servicio y controlador en `apps/backend/src/community/`, contrato usado por `apps/backend/src/user/` y pruebas en `apps/backend/test/`.

- [x] **CO-T09. Expulsar y quitar bloqueos solo como administrador.** Depende de: CO-T02–CO-T03 y CO-T07–CO-T08. Cubre CO-16, CO-18 y D-68, D-70, D-74.
  - **Aceptación:** solo `ADMIN` expulsa a un `MEMBER` o `MODERATOR` de su comunidad; una transacción retira la membresía y crea un único `CommunityExpulsion`. No borra contenido previo ni permite expulsar directamente a otro `ADMIN`. Solo `ADMIN` ve la lista paginada de bloqueos vigentes y elimina uno para permitir regresar; quitar el bloqueo no crea membresía. La comunidad y sus eventos siguen inaccesibles para el expulsado mientras exista la fila.
  - **Verificar:** E2E con cada rol, otra comunidad, expulsión repetida o simultánea, solicitud directa al detalle/foto/post, desbloqueo y nueva unión; `pnpm --filter proyecto-backend test:e2e`.
  - **Archivos previstos:** controlador, servicio y DTO en `apps/backend/src/community/`, prueba en `apps/backend/test/`.

- [ ] **CO-T10. Guardar, reemplazar y quitar la foto opcional.** Depende de: CO-T01, CO-T03–CO-T04. Cubre CO-01, CO-14, CO-21 y D-64, D-73–D-74.
  - **Aceptación:** crear una comunidad admite cero o una foto; si falla la carga inicial, no se confirma una comunidad incompleta. Solo `ADMIN` añade, reemplaza o quita la foto después. El backend valida JPEG, PNG o WebP reales y máximo 5 MB, usa Storage privado y guarda en `Community.photoUrl` únicamente la ruta interna. Subir la foto nueva, cambiar la referencia y retirar la anterior no deja una referencia rota si falla un paso; se registra limpieza pendiente. Texto y foto editados por separado informan su propio resultado. No se acepta una URL enviada como texto libre.
  - **Verificar:** pruebas de creación con/sin foto, límite y tipo inválido, reemplazo, retirada, error de Storage y error de base; comprobar que el bucket no es público; `pnpm backend:build`.
  - **Archivos previstos:** controlador y servicio de foto en `apps/backend/src/community/`, `apps/backend/src/supabase/` si necesita integración y pruebas del backend. **Configuración externa futura:** bucket privado.

- [ ] **CO-T11. Entregar la foto después de comprobar el acceso.** Depende de: CO-T03, CO-T05 y CO-T10. Cubre CO-14, CO-18 y D-64, D-70, D-74.
  - **Aceptación:** `GET /communities/:id/photo` comprueba en cada solicitud sesión, cuenta activa, comunidad y ausencia de expulsión; entrega bytes sin URL pública ni ruta interna y evita caché compartida. Una cuenta no miembro no expulsada puede verla. Al expulsar, la siguiente solicitud falla; al desbloquear, vuelve a poder solicitarla. Sin foto, la app puede mostrar una imagen de respaldo.
  - **Verificar:** API directa con no miembro, miembro, expulsado, desbloqueado, cuenta inactiva, token vencido y comunidad sin foto; comprobar encabezados de caché y privacidad de Storage; `pnpm --filter proyecto-backend test:e2e`.
  - **Archivos previstos:** controlador y servicio en `apps/backend/src/community/`, integración de Storage en `apps/backend/src/supabase/` y prueba en `apps/backend/test/`.

- [x] **CO-T12. Conectar publicaciones y moderación con los permisos comunitarios.** Depende de: CO-T03, CO-T08–CO-T09, PU-T03–PU-T05, PU-T12 e IN-T08–IN-T09. Coordinar la evidencia con PU-T13 e IN-T12 sin convertirla en una dependencia circular. Cubre CO-03–CO-04, CO-07–CO-10, CO-18 y D-20, D-23, D-25, D-27–D-28, D-59, D-70.
  - **Aceptación:** la lista, detalle, foto, comentarios y «Me gusta» de un post comunitario llaman al mismo permiso de membresía vigente; un exmiembro o expulsado no entra por ID. Las rutas de moderación de Publicaciones e Interacciones comprueban rol y comunidad actuales y reutilizan `ModerationRemoval`. Solo `ADMIN` ve y restaura retiradas comunitarias; las retiradas del autor de la publicación o del propio comentarista quedan fuera según sus reglas. La comunidad A no accede ni modera contenido de B o de Inicio.
  - **Verificar:** pruebas directas de API con dos comunidades y cada rol, salida, expulsión, publicación/comentario oculto, retirada propia y restauración; `pnpm --filter proyecto-backend test:e2e`.
  - **Archivos previstos:** comprobación compartida en `apps/backend/src/community/`, consumidores en `apps/backend/src/post/` y `apps/backend/src/comments/`, prueba en `apps/backend/test/`.

- [ ] **CO-T13. Explorar, buscar, crear y unirse desde móvil.** Depende de: CO-T04–CO-T05, CO-T07 y CO-T10–CO-T11; sesión móvil de Cuenta. Cubre CO-01–CO-03, CO-06, CO-14–CO-15, CO-20.
  - **Aceptación:** la pestaña Comunidades muestra búsqueda y páginas sin duplicados, imagen de respaldo cuando falta foto y vista previa con nombre, descripción, foto y conteo. El formulario solicita nombre, descripción y tema; la foto es opcional y explica límite/formato. «Unirme» confirma resultado real y actualiza membresía. Carga, vacío, error, éxito y reintento son visibles; fallar no borra lo escrito ni deja el botón enviando sin fin.
  - **Verificar:** `pnpm --filter mobile lint`, `pnpm --filter mobile exec tsc --noEmit` y recorrido con cuenta sin mascota, dos nombres iguales, más de una página, foto inválida, API apagada, sesión vencida y unión repetida.
  - **Archivos previstos:** `apps/mobile/app/(tabs)/comunidades.tsx`, pantallas de formulario en `apps/mobile/app/`, consultas en `apps/mobile/hooks/` y tipos en `apps/mobile/types/`.

- [ ] **CO-T14. Mostrar detalle, integrantes y salida desde móvil.** Depende de: CO-T05–CO-T08, CO-T11–CO-T13 y lista comunitaria de Publicaciones. Cubre CO-03–CO-06, CO-11–CO-12, CO-17–CO-18.
  - **Aceptación:** el detalle separa «Publicaciones» y «Eventos» sin mezclar contenido; Eventos se completará en su etapa posterior. Un miembro ve publicaciones, lista de integrantes con rol y opción «Salir»; un no miembro solo ve la vista previa y eventos cuando existan. Si es el último `ADMIN`, Petzy explica que debe nombrar otro. Si la persona pierde acceso o es expulsada, la app retira el contenido privado y la imagen mostrada, sin dejar una copia duradera.
  - **Verificar:** `pnpm --filter mobile lint`, `pnpm --filter mobile exec tsc --noEmit` y recorrido con miembro, no miembro, último administrador, expulsado, salida, sesión vencida, error y reintento.
  - **Archivos previstos:** pantallas de detalle en `apps/mobile/app/`, componentes en `apps/mobile/components/`, consultas en `apps/mobile/hooks/` y tipos en `apps/mobile/types/`.

- [ ] **CO-T15. Administrar datos, roles, expulsiones y retiradas desde móvil.** Depende de: CO-T08–CO-T12, CO-T14 y PU-T13. Proporciona la vista administrativa que después usa IN-T12; no depende de ella. Cubre CO-07–CO-08, CO-13–CO-14, CO-16, CO-21.
  - **Aceptación:** solo `ADMIN` ve edición de nombre/descripción/tema/foto, cambio de rol, lista privada de expulsados y acciones de desbloqueo y restauración de publicaciones retiradas; `MODERATOR` solo ve las acciones de moderación acordadas. La sección administrativa de comentarios queda lista para que IN-T12 integre sus listas y restauración, sin duplicar sus permisos. Cada acción indica espera, éxito, fallo y reintento; el guardado separado de textos y foto muestra qué parte sí se guardó. Una cuenta sin permiso no conserva botones tras cambiar su rol; el servidor rechaza cualquier llamada directa.
  - **Verificar:** `pnpm --filter mobile lint`, `pnpm --filter mobile exec tsc --noEmit` y recorrido con los tres roles, administrador de otra comunidad, foto fallida, expulsión/desbloqueo, post/comentario retirado y pérdida de rol durante la vista.
  - **Archivos previstos:** pantallas de administración en `apps/mobile/app/`, componentes en `apps/mobile/components/`, consultas en `apps/mobile/hooks/` y tipos en `apps/mobile/types/`.

- [ ] **CO-T16. Comprobar Comunidades antes de integrar Eventos.** Depende de: CO-T01–CO-T15, PU-T13, IN-T12, CU-T04, PE-T07 y PE-T10; coordinar evidencia con los cierres de esos módulos sin crear una dependencia circular. Cubre CO-01–CO-18 y CO-20–CO-21; CO-19 queda pendiente de Eventos.
  - **Aceptación:** se registra prueba, resultado, fecha y entorno de cada criterio ya comprobable, incluidas solicitudes rechazadas y fallos recuperables. API, datos y ruta indican qué está integrado y qué sigue propuesto. Aunque las funciones del MVP se comprueben, no se marca **todo** Comunidades «Verificada» si CO-19 aún carece de evidencia con Eventos.
  - **Verificar:** `pnpm --filter proyecto-backend test -- --runInBand`, `pnpm --filter proyecto-backend test:e2e`, `pnpm backend:build`, `pnpm --filter mobile lint`, `pnpm --filter mobile exec tsc --noEmit` y recorrido en dispositivo; revisar los criterios uno a uno.
  - **Archivos previstos:** [ficha](../06-COMUNIDADES.md), este archivo, [ruta](../../00-RUTA-DE-DESARROLLO.md), [datos](../../04-DATOS-Y-PERMISOS.md) y [API](../../05-API.md).

- [ ] **CO-T17. Integrar visibilidad y asistencia cuando exista Eventos.** Depende de: CO-T09, CO-T16 y tareas de la futura revisión de Eventos que creen `Event` y `EventAttendance`. Cubre CO-18–CO-19, CE-02, CE-08 y D-70–D-71.
  - **Aceptación:** Eventos usa el mismo control de expulsión en lista, detalle, foto/portada y acceso directo. Salir o ser expulsado invalida las confirmaciones «Iré» de esa comunidad: dejan de contarse y no reaparecen al quitar bloqueo o volver a unirse; solo una confirmación nueva vuelve a contarse. El plan de Eventos definirá si cambia el estado o elimina la fila, sin introducir una columna por suposición. Este trabajo se ejecuta en la etapa posterior de Eventos, no al completar pantallas del MVP de Comunidades.
  - **Verificar:** E2E con miembro confirmado, salida, expulsión, desbloqueo, reingreso, confirmación nueva y evento por ID directo; comprobar conteos y acceso a mapa/portada; `pnpm --filter proyecto-backend test:e2e`.
  - **Archivos previstos:** servicio de acceso en `apps/backend/src/community/`, futuro módulo en `apps/backend/src/event/` o su ubicación aprobada, pruebas en `apps/backend/test/` y [ficha de Eventos](../09-EVENTOS.md).

- [ ] **CO-T18. Cerrar la verificación completa y actualizar la documentación.** Depende de: CO-T16–CO-T17 y CE-08 verificado en Eventos. Cubre CO-01–CO-21.
  - **Aceptación:** todos los criterios CO tienen evidencia con resultado, fecha y entorno; CO-19 incluye la integración real con Eventos. Se actualizan ficha, plan, tareas, API, datos y ruta sin presentar una propuesta como función existente. Un fallo pendiente impide marcar «Verificada» la capacidad completa.
  - **Verificar:** revisar CO-01–CO-21 frente a pruebas E2E, recorrido móvil y CE-02/CE-08; `git diff --check` para los documentos modificados.
  - **Archivos previstos:** [ficha](../06-COMUNIDADES.md), [plan](01-PLAN.md), este archivo, [ruta](../../00-RUTA-DE-DESARROLLO.md) y [API](../../05-API.md); actualizar también [datos](../../04-DATOS-Y-PERMISOS.md) si cambia el contrato real.

## Adición funcional aprobada el 26-10-2026

- [x] **CO-T19. Eliminar la comunidad al salir o desactivar su único miembro administrador.** Depende de CO-T08, PE-T07 y del diseño de eliminación confirmado en D-136. Cubre CO-22 y precisa CO-11/CO-12.
  - **Cierre, 26-10-2026:** pruebas HTTP de D-136 y aceptación funcional del usuario, que menciona expresamente el borrado de comunidad de un solo miembro. [Registro](../../REVISIONES/2026-10-26-CIERRE-PERFILES.md). Solo cierra CO-T19; Comunidades conserva sus demás tareas.
  - **Implementado y verificado localmente:** servicio común, borrado transaccional, membresías inactivas, conservación de datos ajenos, rollback, limpieza de fotos y carreras con ingresos/salidas. [Auditoría](../../REVISIONES/2026-10-26-AUDITORIA-PERFILES.md). El recorrido fue aceptado posteriormente en el cierre de Perfiles.
  - **Aceptación funcional confirmada e implementada localmente:** una comunidad no desaparece por tener un miembro. Si ese único miembro es administrador y sale o desactiva su cuenta, se elimina definitivamente la comunidad/contenido; si hay otros miembros, incluidas cuentas inactivas, sigue siendo obligatorio nombrar otro administrador activo. Recorrido físico pendiente.
  - **Contenido confirmado posteriormente:** las publicaciones de la comunidad se eliminan junto con ella; no se tocan publicaciones generales ni de otras comunidades. El usuario concretó posteriormente borrado definitivo de comunidad/contenido y contar membresías inactivas.
  - **Diseño confirmado posteriormente:** eliminación definitiva de comunidad y contenido vinculado; otras membresías, incluidas inactivas, impiden considerarla de un único integrante. Operación común con PE-T07, borrado transaccional sin nueva migración y limpieza de fotos posterior con reintento/registro. Aviso móvil irreversible y `communityDeleted` en salida. [Plan actualizado](01-PLAN.md#precisión-aprobada-para-d-136--26-10-2026). Implementación y verificación aislada completadas; falta recorrido físico.
  - **Verificar al implementar:** comunidad recién creada que permanece, salida del único miembro, desactivación del único miembro, otros integrantes sin administrador de relevo e ingreso concurrente durante la eliminación. El resultado no puede borrar una comunidad que acaba de recibir otro miembro ni dejarla sin administrador por una carrera.

CO-T08 conserva evidencia de su alcance anterior; no acredita CO-T19. La nueva excepción debe integrarse también con PE-T07 y registrarse en el cierre de CO-T16/CO-T18. La auditoría posterior implementó y comprobó esta ampliación de Perfiles.

## Regla para seguir

Estas tareas quedaron aprobadas conforme a [SDD](../../02-SDD.md). D-136/CO-T19 fue concretada y autorizada posteriormente; implementación y pruebas locales integradas, aceptación funcional posterior registrada con Perfiles. La autorización previa del proyecto y el alcance ya implementado se conservan.
