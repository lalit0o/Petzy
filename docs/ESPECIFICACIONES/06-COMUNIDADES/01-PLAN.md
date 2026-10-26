# Plan técnico aprobado: Comunidades (`comunidades`)

**Estado:** plan y propuesta de datos aprobados por el usuario el 10 de octubre de 2026; implementación parcial desde el 25 de octubre de 2026. **Ficha funcional:** [06-COMUNIDADES.md](../06-COMUNIDADES.md), aprobada el 9 de octubre de 2026. **Alcance:** RF-C01–C06, CO-01–CO-21 y D-20, D-23, D-25, D-27–D-28, D-36–D-37, D-59–D-74. El usuario pidió terminar la documentación antes de programar.

**Trabajo futuro fuera del MVP:** D-86 aplaza las suspensiones administrativas de D-78 y D-80, sus relevos y la ocultación temporal asociada al sistema web del equipo. No condicionan la implementación del plan aprobado de Comunidades. Si se retoman, actualizar entonces plan y tareas.

**Implementación vigente del 25-10-2026:** D-74 aplicada; API de textos, búsqueda, membresías, integrantes, roles y expulsiones, y pantallas conectadas con Publicaciones/Interacciones. El inventario de desarrollo previo fue 0 comunidades y 0 fotos. Fotos propias de comunidad e integración de desactivación de cuenta siguen pendientes, junto con la revisión de pantallas nuevas. Los apartados siguientes conservan el contrato completo aprobado; [tareas](02-TAREAS.md) y [evidencia](../../REVISIONES/2026-10-25-INTEGRACION-PUBLICACIONES.md) separan lo implementado de lo propuesto.

## Qué cambiaría para quien usa Petzy

Una persona con cuenta podrá encontrar comunidades por nombre o tema y ver una ficha breve antes de unirse. Entrará al pulsar «Unirme», sin esperar aprobación. Dentro verá las publicaciones de ese grupo y la lista de integrantes. Si sale, perderá acceso a las publicaciones, pero las que ya escribió seguirán visibles para los miembros mientras estén activas. Al regresar tendrá el rol de miembro.

Quien administre podrá corregir los datos de la comunidad, cambiar roles, expulsar miembros o moderadores y quitarles después el bloqueo desde una lista privada. Una persona expulsada no encontrará esa comunidad ni sus eventos, incluso si conoce el enlace. Quitar el bloqueo le permitirá verla otra vez; ella decidirá si quiere unirse. Si era la única administradora, Petzy le pedirá nombrar a otra antes de salir o desactivar su cuenta.

## Punto de partida y dependencias

En el checkout, Prisma tiene `Community(id, name, description, photoUrl?)` y `CommunityMember(userId, communityId, role, joinedAt)` con una clave por pareja usuario/comunidad; `Post.communityId?` relaciona publicaciones. No hay campo de tema, registro de expulsiones, módulo API de comunidades ni pantalla funcional: `apps/mobile/app/(tabs)/comunidades.tsx` es un marcador de posición. No hay modelos ni API de Eventos en este checkout. El usuario indicó que Petzy no está desplegada y no hay datos de personas reales; no se consultó una base conectada para contar posibles filas de prueba.

El módulo depende de Cuenta/Perfiles para comprobar sesión y `User.isActive`, de Publicaciones para su lista y detalle privados y de Interacciones para comentarios y «Me gusta». Proporcionará a Eventos un único control de visibilidad, membresía y rol. La vista de publicaciones retiradas reutilizará `ModerationRemoval` del plan de Publicaciones; la de comentarios, el contrato de Interacciones. Este plan no crea una segunda fuente de permisos o moderación.

## Datos y migración aprobados para una implementación futura

| Cambio propuesto | Nombre, tipo y motivo | Filas existentes, relaciones y módulos afectados |
| --- | --- | --- |
| Tema obligatorio | Añadir `Community.topic String` no nulo, texto de 2 a 50 caracteres. Permite buscar por el tema libre elegido al crear la comunidad; el nombre sigue sin restricción de unicidad (D-63, D-67, D-72). | **Valor inicial:** ninguno inventado. Antes de migrar, contar comunidades en el entorno elegido. Si hay filas de prueba, detener la migración obligatoria y asignarles un tema válido con revisión del usuario; no borrarlas ni poner un tema genérico en silencio. Afecta creación, edición, búsqueda, validación, esquema y pruebas. |
| Bloqueo por expulsión | Crear `CommunityExpulsion` con `communityId Int` no nulo, `userId String` no nulo, `expelledById String` no nulo y `expelledAt DateTime` no nulo con fecha actual. Clave compuesta `(communityId, userId)` para que exista como máximo un bloqueo vigente por persona y comunidad; índice `(userId, communityId)` para excluir sus comunidades de exploración. Relaciones con `Community` y con `User` tanto para la persona expulsada como para quien actuó. | **Valor inicial:** tabla vacía; no hay expulsiones previas implementadas que atribuir. Al expulsar se crea la fila; al permitir volver, se elimina esa fila. Así no se añade una columna de estado a la membresía y quitar el bloqueo no la restaura automáticamente. Una expulsión futura crea una fila nueva. Afecta búsqueda, detalle, foto, publicaciones, eventos, unirse y administración. El historial permanente de expulsiones no forma parte de este requisito. |
| Foto | Reutilizar `Community.photoUrl String?` para la ruta **interna** del objeto en Storage privado; `null` significa sin foto. La app recibe una ruta de API protegida, no la ruta interna ni una URL pública. | No exige otra columna. Antes de cambiar el significado del campo, inspeccionar los valores de prueba en el entorno conectado. Si hay enlaces antiguos, revisar y migrar sus archivos antes de afirmar que son privados. Afecta creación, edición, exploración y entrega de foto. |
| Consultas | Añadir un índice de miembros por `(communityId, joinedAt, userId)` para listar miembros con orden estable. Mantener la clave existente `(userId, communityId)` que evita duplicados. | Solo índices, sin nuevos datos. Buscar por nombre o tema con límite y cursor; empezar por un orden inmutable `Community.id DESC` y revisar el índice de búsqueda cuando haya volumen o evidencia de lentitud. |

La migración futura se revisará y probará en una copia del entorno antes de ejecutarse: comprobar conexión, número de comunidades, valores de `photoUrl`, respaldo y reversión. No se ejecutará durante esta etapa documental. **La tabla `CommunityExpulsion`, la columna `Community.topic` y la reutilización privada de `photoUrl` fueron aprobadas para el plan (D-74); aún no existen en el código o Storage.**

## Una sola regla de acceso

NestJS obtendrá el usuario del token validado y comprobará que su cuenta esté activa. Un servicio de acceso a comunidades consultará la comunidad, el bloqueo vigente y la membresía activa del usuario. Sus operaciones serán: permitir vista previa si no está expulsado; exigir membresía para publicaciones y lista de miembros; exigir `ADMIN` o `MODERATOR` para las acciones correspondientes. La app ocultará botones según la respuesta, pero cada ruta volverá a comprobar el permiso en el servidor.

- **Explorar y detalle:** excluir comunidades con un bloqueo vigente para esa persona, tanto en listas/búsquedas como al pedir una comunidad por ID. Una cuenta no miembro y no expulsada recibe nombre, descripción, foto protegida y conteo de miembros activos; el tema sirve para buscar, pero no se añade a la vista previa acordada. El conteo excluye usuarios desactivados.
- **Publicaciones y comentarios:** el servicio de Publicaciones llamará al mismo control de membresía para lista, detalle, foto e interacciones de una publicación comunitaria. Al salir o ser expulsada, la siguiente solicitud deja de entregarlas. Los posts y comentarios previos de esa persona permanecen guardados y visibles para otros miembros si siguen activos y su autor no desactivó la cuenta.
- **Eventos:** cuando se implemente Eventos, sus rutas de lista, detalle, mapa/portada y acciones consultarán el mismo bloqueo. Una cuenta no miembro no expulsada podrá leerlos; solo un miembro podrá responder asistencia; `ADMIN` o `MODERATOR` podrán crearlos, y el creador o un `ADMIN` editarlos/cancelarlos, como D-09. No se crearán modelos o pantallas de Eventos dentro de esta etapa de Comunidades.
- **Fotos:** `GET /communities/:id/photo` comprobará sesión, cuenta activa, existencia de comunidad y ausencia de bloqueo en **cada** solicitud; responderá con los bytes sin URL pública o ruta interna de Storage y sin caché compartida. Quitar el bloqueo habilita la próxima solicitud; expulsar revoca la próxima. La ruta y los errores no revelarán datos de una comunidad a quien esté expulsado.

La persona que deja la comunidad ya no podrá operar sobre sus publicaciones comunitarias mediante un enlace antiguo, porque esas operaciones requieren acceso vigente. La administración podrá moderar ese contenido previo según D-23/D-27. La desactivación de una cuenta conserva su membresía y rol, pero la excluye de lectura, listas y conteos hasta su reactivación (D-36–D-37).

## Operaciones y consistencia

1. **Crear:** recibir nombre, descripción y tema obligatorios, y foto opcional. Validar límites y archivo antes de confirmar; crear `Community` y la primera `CommunityMember(ADMIN)` en una transacción. El token determina el creador. Dos nombres iguales son válidos. Si falla el guardado, no debe quedar una comunidad sin administrador ni una foto nueva referenciada como válida.
2. **Unirse:** comprobar cuenta activa, comunidad visible y ausencia de bloqueo; crear una única membresía `MEMBER`. Repetir la acción no duplica membresía ni conteo. Tras una salida o desbloqueo, la nueva membresía empieza como `MEMBER`.
3. **Salir, cambiar rol o desactivar cuenta:** dentro de una transacción, bloquear la comunidad afectada y comprobar cuántos `ADMIN` activos quedan. Rechazar la salida, degradación o desactivación que dejaría cero, incluso si dos personas intentan hacerlo a la vez. Al salir, retirar la membresía sin borrar contenido. Desactivar cuenta conserva membresías y roles; el flujo de Perfiles debe comprobar todas las comunidades que administra esa cuenta.
4. **Expulsar y desbloquear:** solo `ADMIN` vigente expulsa a un `MEMBER` o `MODERATOR` de su comunidad. En una operación atómica retira la membresía y crea el bloqueo, conservando publicaciones y comentarios; una acción repetida no crea otra fila. Solo `ADMIN` consulta bloqueos y elimina uno para permitir el regreso. Borrar el bloqueo no crea membresía. No se expulsa directamente a otro `ADMIN`.
5. **Editar:** solo `ADMIN` vigente cambia nombre, descripción y tema dentro de sus límites o añade, reemplaza o quita la foto. Los textos y la foto se guardan en solicitudes separadas: la app indica cuál cambio se guardó y cuál falló, sin anunciar que todo se guardó si hubo éxito parcial. Para una foto nueva, validar JPEG/PNG/WebP y 5 MB, subirla con nombre aleatorio a Storage privado, actualizar `photoUrl` y retirar el objeto anterior después del éxito. Si falla el guardado de la foto, limpiar la nueva carga y conservar la anterior; una limpieza fallida queda registrada para reintento. Quitar la foto deja `photoUrl = null` y retira el objeto antiguo después del cambio.
6. **Moderación:** reutilizar las rutas y la tabla `ModerationRemoval` ya propuestas en Publicaciones e Interacciones. Solo `ADMIN` ve y restaura publicaciones retiradas por moderación y comentarios retirados por administradores, moderadores o autores de posts comunitarios. No muestra retiradas hechas por el propio autor del contenido. Comprobar comunidad, rol y estado en la operación, no solo en el botón.

Storage y PostgreSQL no comparten transacción: la futura implementación tendrá que probar fallas antes y después de guardar la referencia, con limpieza de objetos huérfanos. No pondrá la clave de servidor en variables `EXPO_PUBLIC_*`.

## API propuesta, todavía inexistente

| Acción | Ruta propuesta y respuesta |
| --- | --- |
| Explorar y buscar | `GET /communities?q=&cursor=&limit=`; `q` opcional para explorar y, si se usa, de 2 a 50 caracteres. Orden `id DESC`, 20 resultados por defecto y máximo 30. Filtra bloqueos antes de paginar, devuelve `nextCursor` y solo datos de vista previa; puede haber nombres repetidos con ID distinto. |
| Crear y abrir | `POST /communities` acepta textos y una foto opcional; `GET /communities/:id` devuelve vista previa y, si corresponde, rol propio. No entrega posts o lista de miembros a un no miembro. |
| Foto y edición | `GET /communities/:id/photo` entrega imagen protegida. `PATCH /communities/:id` corrige textos; `PUT /communities/:id/photo` añade o reemplaza y `DELETE /communities/:id/photo` quita. Las tres escrituras son solo para `ADMIN`. |
| Membresía propia | `POST /communities/:id/members/me` une de inmediato; `DELETE /communities/:id/members/me` sale si no deja la comunidad sin administrador. |
| Miembros y roles | `GET /communities/:id/members?cursor=&limit=` devuelve nombre, foto protegida y rol de miembros activos, 20 por página y máximo 30; requiere membresía. `PATCH /communities/:id/members/:userId/role` solo para `ADMIN`. |
| Expulsión | `POST /communities/:id/expulsions` recibe el usuario objetivo y expulsa; `GET /communities/:id/expulsions?cursor=&limit=` lista bloqueos vigentes; `DELETE /communities/:id/expulsions/:userId` quita uno. Solo `ADMIN`; lista de 20 por página y máximo 30. |
| Contenido | `GET/POST /communities/:id/posts` y rutas de moderación siguen los planes de [Publicaciones](../02-PUBLICACIONES/01-PLAN.md) e [Interacciones](../05-INTERACCIONES/01-PLAN.md). `GET/POST /communities/:id/events` pertenece a Eventos, etapa posterior. |

Los listados no aceptan un `userId` de quien consulta; lo toman del token. Los detalles directos y las fotos aplican los mismos permisos que las listas. Las rutas actuales de `/post` singular se migrarán o mantendrán compatibles según el plan de Publicaciones; no se anunciarán estas rutas propuestas como existentes. Una respuesta distinguirá validación, sesión vencida y fallo de red sin filtrar contenido privado por su mensaje.

## App y estados visibles

La pestaña Comunidades tendrá exploración y búsqueda con carga, vacío, más resultados, error y reintento. La vista previa mostrará los cuatro datos acordados y «Unirme» cuando corresponda. El detalle de un miembro separará «Publicaciones» y «Eventos»; esta segunda sección se completará al implementar Eventos. La lista de miembros mostrará nombre, foto y rol, nunca correo. La administración tendrá configuración, roles, personas expulsadas, publicaciones retiradas y comentarios ocultados; cada vista solo se abre con permiso vigente. La foto comunitaria no se guardará en una caché local duradera: al perder acceso, la app retirará cualquier imagen que estuviera mostrando.

Crear, editar, unirse, salir, cambiar rol, expulsar, desbloquear y restaurar mostrarán espera junto a la acción, impedirán envíos duplicados y confirmarán éxito solo tras respuesta del servidor. Ante error, conservarán el formulario y la foto previa y permitirán reintentar. Si la persona pierde acceso mientras mira la comunidad, la app retirará el contenido privado de la pantalla y explicará que ya no puede abrirlo. Al construir estas pantallas se aplicarán `apps/mobile/AGENTS.md`, `apple-design` y `async-feedback`; este plan solo documenta su comportamiento.

## Orden de trabajo y comprobaciones

1. **Preparar contratos compartidos:** comprobar sesión y cuenta activa; definir una única consulta de visibilidad/membresía para Comunidades, Publicaciones y futuro Eventos. Verificar no miembro, expulsado y cuenta desactivada por solicitud directa.
2. **Datos:** revisar filas de prueba y `photoUrl`; tras aprobación y autorización de código, migrar tema, tabla de expulsiones e índice de miembros. Probar nombre repetido, tema obligatorio y tabla inicialmente vacía.
3. **Lectura:** crear exploración/búsqueda paginada, detalle, foto y lista de miembros. Probar que un expulsado no obtiene resultados ni acceso por ID, foto o publicación, y que no se muestran correos.
4. **Membresía y roles:** crear, unirse, salir y cambiar roles con transacciones. Probar dos acciones simultáneas de salida/degradación del último par de administradores, reingreso como `MEMBER` y conteos sin inactivos.
5. **Administración:** expulsar/desbloquear; integrar `ModerationRemoval` con los planes aprobados de Publicaciones e Interacciones. Probar contenido anterior visible para otros miembros, bloqueos directos y restauración solo por `ADMIN`.
6. **App y fotos:** integrar pantallas, formularios, foto privada y estados de red. Probar archivo inválido, falla de Storage, sustitución, retirada, red apagada y cambio de rol mientras la vista está abierta.
7. **Integración posterior con Eventos:** cuando exista su modelo, invalidar confirmaciones «Iré» al salir o ser expulsado y negar evento/portada/mapa al expulsado. Verificar CE-02, CE-08 y CO-19 con salida, expulsión, desbloqueo y nueva unión. Esta comprobación queda pendiente hasta la etapa de Eventos; no se declarará CO-19 verificado antes.

Publicaciones e Interacciones pueden avanzar en paralelo con lectura comunitaria una vez fijado el control de acceso compartido; la moderación depende de `ModerationRemoval`. Fotos dependen de Storage privado y de la regla de visibilidad. La prueba completa de asistencia depende de Eventos, que se desarrolla después del MVP. Los criterios CO-01–CO-21 requieren evidencia registrada por flujo; la aprobación del plan no demuestra implementación.

## Riesgos y límites

| Riesgo | Comprobación o respuesta |
| --- | --- |
| Dos salidas o cambios de rol dejan cero administradores activos | Serializar cambios por comunidad y comprobar el conteo dentro de la transacción; E2E de concurrencia. |
| La expulsión se aplica a la lista, pero se filtra un evento, foto o post por ID | Usar el mismo control en cada entrada y probar URL directa antes y después de bloquear. |
| Desbloquear revive una membresía o asistencia antigua | Quitar solo `CommunityExpulsion`; unirse crea membresía nueva `MEMBER`; Eventos exige confirmación nueva. |
| Una foto reemplazada deja enlace público o referencia rota | Bucket privado, entrega por API, actualización de ruta seguida de limpieza y prueba de fallas en cada paso. |
| Nombres iguales mezclan resultados o recursos | Usar siempre `Community.id` en rutas y relaciones; probar dos comunidades homónimas con miembros y posts distintos. |
| Una cuenta inactiva sigue en el conteo o conserva permiso efectivo | Filtrar `User.isActive` al consultar membresía y conteos; probar desactivación y reactivación. |
| El detalle móvil muestra contenido privado tras perder acceso | Limpiar el estado local al recibir denegación y recargar rol/membresía antes de permitir otra acción. |

**Siempre:** derivar identidad del token; comprobar cuenta, comunidad, bloqueo, membresía y rol en servidor; paginar listas; registrar evidencia. **Consultar antes:** resolver filas de prueba que requieran tema y cualquier cambio posterior en esquema, rutas, permisos o datos visibles que no cubra este plan aprobado. **Nunca:** implementar durante la etapa documental, exponer rutas internas de Storage o tratar un botón oculto como control de acceso.

## Decisiones técnicas aprobadas

1. `Community.topic String` obligatorio, sin valor ficticio para comunidades de prueba que ya existan.
2. `CommunityExpulsion` como tabla de bloqueos vigentes; quitar el bloqueo elimina esa fila y no vuelve a unir a la persona.
3. Reutilizar `Community.photoUrl String?` para una ruta interna privada y entregar la foto solo por API después de comprobar la sesión y la expulsión.
4. Mantener Eventos en su etapa posterior y comprobar entonces la retirada de asistencias; Comunidades no se marcará verificada respecto a CO-19 antes de esa prueba.

El usuario aprobó este plan y sus [tareas](02-TAREAS.md) el 10 de octubre de 2026. Ninguna de las rutas, columnas o pantallas de este documento existe todavía por el hecho de figurar aquí.
