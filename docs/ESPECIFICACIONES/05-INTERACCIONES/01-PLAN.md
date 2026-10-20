# Plan técnico: Interacciones (`interacciones`)

**Estado:** plan y [tareas](02-TAREAS.md) aprobados por el usuario el 9 de octubre de 2026; desarrollo autorizado posteriormente el 19 de octubre. **Ficha funcional:** [05-INTERACCIONES.md](../05-INTERACCIONES.md), aprobada el 9 de octubre de 2026 y ampliada con D-59. **Alcance:** IN-01–IN-10, D-26–D-28, D-31 y D-53–D-59.

## Qué cambiaría para quien usa Petzy

Al abrir una publicación visible, la persona verá sus comentarios más recientes primero y podrá cargar más. Podrá escribir uno de hasta 500 caracteres, corregirlo después, retirarlo y dar o quitar «Me gusta». El comentario corregido llevará «Editado». Si no tiene acceso a la publicación, tampoco verá ni modificará sus interacciones.

Quien publicó en Inicio podrá ocultar un comentario ajeno de ese post. En «Comentarios ocultados», dentro del mismo post y visible solo para él, encontrará los comentarios que ocultó y podrá restaurarlos uno por uno. En una comunidad, el autor del post también podrá ocultar comentarios ajenos de su publicación, aunque no sea moderador. Los moderadores y administradores podrán hacerlo en las publicaciones de su comunidad. Solo quien tenga rol `ADMIN` verá esas retiradas comunitarias y podrá restaurarlas, incluso si también es autor del post. Un comentario que su propio comentarista retiró no aparecerá en esas vistas.

## Punto de partida comprobado

`Comment` ya guarda texto, autor, post, fecha de creación, fecha de última actualización y `isActive`. Existen rutas para crear, editar y retirar comentarios, pero no para listarlos. El guard de propietario compara el usuario autenticado con el autor y ya lee `request.params.commentId`; falta aplicar las reglas completas de texto y edición. Crear, editar y retirar ya consultan la visibilidad central del post. `PostLike` tiene clave única por persona y publicación, pero aún no tiene rutas ni interfaz. `ModerationRemoval` ya existe desde Publicaciones y admite retiradas de comentarios, aún sin usar. **Inventario IN-T01 (20-10-2026):** la base de desarrollo conectada contiene 0 filas `Comment`, 0 `PostLike` y 0 `ModerationRemoval` con `commentId`; consulta de solo lectura. El usuario indicó que no hay datos de personas reales ni despliegue. La app móvil todavía no consume comentarios ni likes. Publicaciones aporta `PostService.assertCanRead`; Perfiles aporta la regla de cuenta activa. La próxima migración añade únicamente `Comment.editedAt DateTime?` con valor inicial `null`.

## Datos y migración propuestos

| Cambio | Forma y motivo | Registros existentes y módulos afectados |
| --- | --- | --- |
| Fecha de edición del texto | Añadir `Comment.editedAt DateTime?`: fecha y hora, opcional. El servidor la establece solo cuando el autor cambia el texto. `updatedAt` sigue siendo la fecha de cualquier actualización técnica, incluida retirada o restauración; por eso no sirve para decidir si mostrar «Editado». | La migración añadiría la columna con `null` para todos los comentarios existentes. Un comentario previo solo mostraría «Editado» tras una edición posterior; no se inventa una edición antigua. Afecta esquema, edición, respuesta de comentarios, app y pruebas. **Aprobado por el usuario (D-57); aún no implementado.** |
| Retiradas de comentarios ajenos | Reutilizar la tabla `ModerationRemoval` propuesta en [Publicaciones](../02-PUBLICACIONES/01-PLAN.md): una fila con `commentId`, `moderatorId` y fecha al ocultar; `restoredAt` y `restoredById` al restaurar. En una publicación general, `moderatorId` guarda el ID de su autor, porque él ejerció ese permiso sobre su propio post. En una comunidad guarda el ID de quien esté autorizado para ocultar. | No requiere otra tabla ni columna. Las retiradas previas sin registro de origen siguen ocultas y fuera de las listas de restauración. Afecta comentarios, Publicaciones y Comunidades. **Reutilización aprobada por el usuario (D-58); aún no implementada.** |
| Comentarios y likes | Conservar `Comment.isActive` para visibilidad individual y la clave `PostLike(userId, postId)` para impedir duplicados. Ocultar un post o desactivar una cuenta no borra estos registros. | Sin migración adicional. Afecta los conteos, la API, Perfiles y la app. |

La migración futura crearía primero `ModerationRemoval` según PU-T03, si aún no existe, y añadiría `Comment.editedAt`. Antes de ejecutarla se inspeccionarían las filas del entorno conectado; no se presupone que ya se hizo esa consulta. La migración no borraría comentarios ni likes.

## Permisos y fuente de verdad

El backend obtiene la identidad del token validado, nunca de un `userId` enviado por la app. Antes de leer o cambiar comentarios o likes, verifica que la cuenta solicitante y el autor del post estén activos, que el post esté activo y que sea visible según Publicaciones: en Inicio, `communityId = null`; en comunidad, membresía vigente. La comprobación se repite en consultas directas por ID. La misma regla central de acceso al post prevista en PU-T04 debe servir a detalle, foto, comentarios y likes; las operaciones de moderación agregan sus propios permisos.

Para corregir un comentario, el token debe corresponder a `Comment.userId`, el comentario debe pertenecer al `postId` de la ruta y seguir activo. Para retirar el propio se aplican las mismas condiciones. El autor de un post general tiene un permiso **distinto**: solo puede ocultar comentarios de otra persona en su post, y el servidor comprueba token = `Post.userId`, `communityId = null`, `Comment.postId = Post.id` y estados activos. Un guard específico ofrece rechazo temprano; el servicio vuelve a comprobarlo al escribir, junto con el estado del comentario y el registro de retirada, en una operación atómica. En comunidad, pueden ocultar comentarios ajenos tanto `ADMIN`/`MODERATOR` con rol vigente como el autor del post con membresía vigente, únicamente en su propio post. Se verifica `Post.communityId` contra la comunidad de la ruta, `Comment.postId` contra el post y `Post.userId` contra el token cuando actúa su autor. Solo `ADMIN` restaura las retiradas comunitarias; ninguno de estos permisos comunitarios se extiende a Inicio.

Las vistas de comentarios ocultados solo consultan filas de `ModerationRemoval` aún abiertas y su comentario asociado inactivo. En Inicio se filtra además por post general y `moderatorId` igual al autor autenticado del post. En comunidad se filtra por publicaciones de esa comunidad y solo entra un `ADMIN`; aparecen también los comentarios ocultados por autores de posts comunitarios, pues `moderatorId` conserva el ID de quien actuó. Una retirada por el propio comentarista no crea esa fila. Restaurar cierra la fila y reactiva el comentario sin alterar texto, `createdAt` ni `editedAt`. Si la cuenta del comentarista está desactivada, el comentario continúa fuera de las respuestas normales hasta su reactivación.

## API propuesta

Todas estas rutas, salvo las tres rutas parciales de comentarios indicadas arriba, son **propuestas**. Antes de marcarlas como actuales, habrá que implementarlas y comprobarlas. Los errores deben diferenciar sesión vencida, falta de acceso, recurso inexistente, texto inválido y fallo de red sin revelar contenido privado.

| Operación | Ruta propuesta y respuesta |
| --- | --- |
| Leer comentarios | `GET /posts/:postId/comments?cursor=&limit=`. Devuelve solo comentarios activos de cuentas activas, más nombre de usuario, ruta protegida de foto de perfil si existe, texto, fecha, `editedAt` y cursor siguiente. Orden `createdAt DESC, id DESC`; 20 por defecto y máximo 30. La app obtiene la etiqueta «Editado» de `editedAt`. |
| Crear | `POST /posts/:postId/comments` con `body` de 1 a 500 caracteres con contenido. Servidor recorta espacios exteriores, rechaza vacío y conserva el texto en la app si falla. No acepta fotos, respuestas anidadas ni autor enviado por cliente. |
| Editar o retirar el propio | `PATCH /posts/:postId/comments/:commentId` cambia `body` y establece `editedAt` si cambia el texto; `DELETE /posts/:postId/comments/:commentId` pone `isActive = false`. Corregir el guard para usar `commentId` y comprobar también `postId`, visibilidad y actividad en el servicio. |
| Ocultar comentario ajeno en Inicio | `DELETE /posts/:postId/moderation/comments/:commentId`. Solo autor del post general; crea una retirada abierta y pone `Comment.isActive = false` en la misma operación. Repetir una retirada ya hecha no crea otra fila. |
| Ver y restaurar los que ocultó el autor del post general | `GET /posts/:postId/moderation/comments?cursor=&limit=` y `POST /posts/:postId/moderation/comments/:commentId/restore`. Lista privada del autor, paginada de 20 en 20 y máximo 30; restaura solo una retirada abierta hecha por él. |
| Ocultar comentario ajeno en comunidad | `DELETE /communities/:communityId/posts/:postId/comments/:commentId` para `ADMIN`, `MODERATOR` o el autor de ese post con membresía vigente. Registra quién actuó. `GET /communities/:communityId/moderation/comments?cursor=&limit=` y `POST /communities/:communityId/moderation/comments/:commentId/restore` son solo para `ADMIN` e incluyen también retiradas hechas por autores de posts. Se comprueba que el post pertenece a esa comunidad. |
| Dar o quitar «Me gusta» | `PUT /posts/:postId/like` crea la reacción si falta; `DELETE /posts/:postId/like` la quita si existe. Repetir cualquiera de las dos acciones conserva el mismo resultado; la clave compuesta evita dos likes de una persona al mismo post. Detalle/lista entregan `likeCount` y `likedByMe` calculados con cuentas activas y permiso vigente. |

Para un comentario, app y servidor deben contar los 500 caracteres con la misma regla, también para letras con acento y emojis; no se contará por bytes. El detalle fino de mensajes y códigos HTTP se documentará al cerrar tareas de API sin alterar los permisos anteriores.

## App y respuesta a fallos

El detalle del post mostrará lista, contador y estado propio de «Me gusta», formulario de comentario y acciones que correspondan al usuario. Si el post es comunitario, su autor verá «Ocultar» en comentarios ajenos de ese post; solo verá «Restaurar» en la vista administrativa si además tiene rol `ADMIN`. La carga inicial, «cargar más», envío, edición, retirada y restauración muestran espera; un error se explica junto a la acción y ofrece reintento. No se borra el texto escrito por una falla. Los botones evitan envíos simultáneos y no anuncian éxito antes de recibir confirmación. Si la publicación deja de ser visible, se retira su detalle de la pantalla y no se conserva una copia de comentarios privados accesible desde esa vista. La foto del comentarista se obtiene por la ruta protegida de Perfiles, nunca por una URL pública de Storage.

«Comentarios ocultados» aparece dentro de cada publicación general solo a su autor; la pestaña administrativa comunitaria pertenece a la capacidad de Comunidades e incluye retiradas hechas por autores de posts, administradores y moderadores. Ambas indican estado vacío, carga, error y restauración individual al usuario autorizado. En la lista normal, un comentario oculto no aparece. Si el post está oculto, tampoco se abre su lista ni se ejecutan acciones sobre ella.

## Orden de trabajo y puntos de verificación

1. **Base de acceso:** completar en Publicaciones la comprobación central de visibilidad y en Perfiles la condición de cuenta activa. Probar Inicio, miembro, no miembro, post desactivado y autor inactivo por API directa.
2. **Datos y lectura:** aplicar la migración aprobada cuando exista autorización de código; añadir la lectura paginada de comentarios y la fecha `editedAt`. Probar orden estable, límite y que ocultar/restaurar no ponga «Editado».
3. **Escritura propia:** validar texto, corregir el guard, comprobar post y autor en el servicio e integrar creación, edición y retirada propia. Probar solicitudes con IDs cruzados y carreras con desactivación.
4. **Retirada y restauración ajena:** reutilizar `ModerationRemoval`; integrar por separado permiso del autor del post general, permiso del autor del post comunitario y roles comunitarios. Probar que el administrador vea y restaure retiradas hechas por autores de posts comunitarios, pero el autor del post no pueda restaurarlas; comprobar exclusión de retiradas del propio comentarista, repetición y accesos por URL directa.
5. **Likes y app:** crear rutas idempotentes, calcular conteo y estado propio, integrar detalle y estados de red. Probar dos usuarios, acción repetida, cuenta/post desactivado y restauración.
6. **Verificación transversal:** junto con PU-T14 y tareas de Perfiles/Comunidades, comprobar que una publicación oculta niega lectura y escritura y que reaparecen únicamente interacciones todavía activas al restaurarla.

El trabajo de detalle móvil necesita la respuesta de lectura; moderación necesita la tabla D-31 y permisos comunitarios; reacciones y comentarios pueden avanzar por separado tras contar con la comprobación central de visibilidad. Cada punto se considera verificado solo con evidencia de sus criterios IN-01–IN-10.

## Riesgos y comprobaciones

| Riesgo | Comprobación |
| --- | --- |
| Un token válido intenta leer comentarios de otra comunidad o de un post oculto | Pruebas directas de cada ruta, incluidas paginación, likes y restauración, con miembro/no miembro y cambios de membresía. |
| `updatedAt` cambia por ocultar/restaurar y muestra «Editado» por error | Usar solo `editedAt` para la etiqueta; probar ambos cambios de estado sin edición del texto. |
| Dos solicitudes ocultan o restauran a la vez el mismo comentario | Transacción y restricción de retirada abierta única; verificar una sola fila y estado coherente al repetir la acción. |
| El autor de un post usa el permiso sobre otra publicación o una comunidad distinta | Comprobar token, `Post.userId`, membresía, `communityId`, `Comment.postId` y estado en guard y servicio; probar IDs cruzados. |
| El conteo incluye likes de cuentas desactivadas o duplica reacciones | Filtrar cuentas activas y probar clave compuesta, PUT/DELETE repetidos y reactivación. |
| La app presenta éxito pese a falla de red | Probar envío, edición, retirada y restauración fallidos; conservar texto y mostrar reintento. |

## Decisiones confirmadas

1. **Aprobado (D-57):** `Comment.editedAt DateTime?` indica únicamente cambios de texto. Las filas actuales recibirían `null`; ninguna se marcaría «Editado» por ocultarse o restaurarse.
2. **Aprobado (D-58):** `ModerationRemoval` registra también lo que oculta el autor de un post general. No se crea otra tabla o columna para ese caso.
3. **Aprobado (D-59):** el autor de un post comunitario puede ocultar comentarios ajenos de ese post. Solo el `ADMIN` de la comunidad ve y restaura esas retiradas; ser autor del post por sí solo no permite restaurarlas.
4. **Plan aprobado:** las rutas propuestas y el orden de trabajo descritos arriba fueron revisados por el usuario; su existencia en este documento no significa que ya estén implementados.

Las [tareas](02-TAREAS.md) aprobadas dividen este plan en pasos. La implementación continuará aplazada hasta que el usuario autorice código más adelante.
