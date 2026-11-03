# Plan técnico propuesto: Perfiles (`perfiles`)

**Cierre vigente, 26-10-2026:** Perfiles **Verificada para el alcance aprobado**, PE-T01–PE-T14 cerradas. El usuario confirma funcionamiento correcto en su teléfono y menciona expresamente borrar foto de perfil y comunidad de un único miembro, con aceptación general del resto. Se combina con 63 HTTP, 104 unitarias y verificaciones móviles previas, sin atribuirle casos que no enumeró. D-136/D-137 integradas; CO-T19 cerrada sin cerrar Comunidades. [Registro](../../REVISIONES/2026-10-26-CIERRE-PERFILES.md).

**Auditoría anterior al cierre, 26-10-2026:** Mi perfil, Buscar y perfiles públicos revisados con código y pruebas. D-136 implementada tras confirmar borrado definitivo de comunidad/contenido solo sin otras membresías (incluidas inactivas). Se corrigió la concurrencia de avatares y se probaron errores, permisos, paginación, respuestas atrasadas y ciclo de cuenta. Pasan 63 HTTP, 104 unitarias, scripts móviles, compilación y tipos; recorrido físico pendiente. [Informe](../../REVISIONES/2026-10-26-AUDITORIA-PERFILES.md).

**Estado al 26-10-2026:** plan aprobado e implementación funcional integrada por autorización del usuario. PE-T01–PE-T10 comprobadas localmente; las pantallas y PE-T14 esperan recorrido físico y revisión UI/UX posterior, sin dependencia funcional conocida pendiente. [Evidencia](../../REVISIONES/2026-10-26-PERFILES.md). **Ficha funcional:** [03-PERFILES.md](../03-PERFILES.md). **Alcance:** PE-01–PE-07 y D-35–D-41. Las [tareas](02-TAREAS.md) están aprobadas. El punto de partida que sigue es histórico.

**Trabajo futuro fuera del MVP:** D-86 aplaza la suspensión administrativa de D-78 y D-80 al sistema web del equipo. No es requisito para implementar este plan de Perfiles. Si se retoma, actualizar entonces el contrato de cuenta y perfil.

**Cambio funcional aprobado, 26-10-2026 (D-136):** si el único miembro es administrador, la comunidad se elimina al salir o desactivar su cuenta. Si hay otros miembros, se mantiene el relevo obligatorio. Implementado en la auditoría posterior: borrado definitivo, contando membresías inactivas y coordinado con ingresos/salidas. Servicio compartido con Comunidades sin migración nueva; fotos después de commit con tres intentos y registro del pendiente. [Plan comunitario actualizado](../06-COMUNIDADES/01-PLAN.md).

## Qué cambiaría para quien usa Petzy

- En «Mi perfil» la persona ve su correo y edita nombre de usuario, foto, biografía y estado de México. Un error conserva lo escrito y permite reintentar. El correo no tendrá opción de edición en esta versión.
- Al buscar a otra persona o abrir su perfil, ve solo nombre de usuario, foto, biografía, estado y mascotas activas. No recibe su correo en la respuesta del servidor.
- «Desactivar cuenta» pide confirmación. Si la persona es la única administradora de alguna comunidad, Petzy le indica que primero debe nombrar a otra. Si procede, se ocultan su perfil y contenido sin borrarlos y la app vuelve al ingreso.
- Cuando esa persona entra otra vez con su correo y contraseña, ve la opción de reactivar. Solo después de confirmarlo puede volver al contenido. Recupera sus comunidades y los datos que seguían activos; lo que retiró por separado permanece oculto.

## Punto de partida comprobado en el código

- `User` ya tiene `id` de Supabase Auth, `email`, `username`, `avatar?`, `bio?`, `locatedAt` e `isActive`. `CommunityMember`, `Pet`, `Post`, `Comment` y `PostLike` ya se relacionan con `User`. Para los acuerdos actuales **no se propone una columna nueva** ni migración de Prisma.
- **Estado anterior al cambio:** `GET /user/search` devolvía filas completas, incluido el correo; `PATCH /user/:id` permitía editar por ID y `DELETE /user/:id` desactivaba por ID. El controlador antiguo `/user` se retiró al añadir `/users` seguro. El registro real de Cuenta no acepta `avatar` como texto; los DTO antiguos de `user` ya no están conectados a rutas. La pantalla `perfil.tsx` sigue siendo básica y corresponde a PE-T11.
- Cuenta tiene plan y tareas para validar sesión, distinguir perfiles incompletos e inactivos y proteger rutas privadas. Perfiles dependerá de ese contrato. Comunidades aún no tiene API para nombrar a otro administrador; esa capacidad es requisito para desactivar al último `ADMIN`.
- **Inventario PE-T01 (20 de octubre de 2026):** en la base de desarrollo conectada hay 12 filas de `User` y ninguna tiene `avatar` informado (consulta agregada de solo lectura; no se mostraron datos personales). No hace falta convertir referencias de fotos existentes en ese entorno. Esta comprobación no afirma nada sobre futuras bases.
- El móvil no llamaba a `/user`; su pantalla `perfil.tsx` mostraba el valor `avatar` de autenticación como texto. La respuesta de Cuenta ya entrega `avatarUrl` protegido en lugar de la ruta interna, y se retiró ese texto de la pantalla. Publicaciones consulta el campo solo para devolver `hasAvatar`, sin exponer su valor.
- El controlador antiguo `/user` fue retirado, incluida su lectura de mascotas sin filtro de actividad. Las nuevas rutas `/users/me`, `/users/:id` y `/users?q=` solo entregan sus campos autorizados. La búsqueda tiene paginación de 20 (máximo 30). La app aún no consume estas rutas: PE-T11–PE-T12 siguen abiertas.

## Datos, respuestas y archivos de foto

| Dato u operación | Propuesta técnica y efecto | Situación de registros existentes |
| --- | --- | --- |
| Perfil propio | Respuesta explícita con `id`, `email`, `username`, `bio`, `locatedAt`, estado de cuenta y una referencia `avatarUrl` a la ruta protegida de la API cuando haya foto. El ID procede del token, no de un ID editable en la ruta. No devolver tokens, credenciales ni ruta interna de Storage. | Se reutilizan las columnas actuales; sin migración. |
| Perfil ajeno y búsqueda | Proyectar únicamente `id`, `username`, `bio`, `locatedAt` y la referencia `avatarUrl` a la ruta protegida cuando haya foto; el detalle añade mascotas activas mediante el contrato de Mascotas. Excluir cuentas inactivas antes de paginar. | No exponer columnas nuevas ni la ruta interna guardada en `User.avatar`; los índices existentes de `username` se revisan con datos reales antes de optimizar la búsqueda. |
| Edición | DTO separado del registro: permitir `username` de 3–30 caracteres, `bio` opcional de hasta 300 y `locatedAt`; `avatar` se cambia mediante una operación de archivo aparte. Rechazar `id`, `email`, `password`, `isActive` y campos desconocidos. Permitir quitar la biografía. | Se conserva `User.username` único y `User.locatedAt` obligatorio. No cambiar datos actuales automáticamente (D-40). |
| Foto de perfil | D-39 confirma guardar JPEG, PNG o WebP de hasta 5 MB en Supabase Storage privado. El plan propone usar `User.avatar` para la ruta interna. El backend comprueba sesión y cuenta activa antes de entregar la foto; al desactivar la cuenta deja de entregarla. Al reemplazar, usar un objeto nuevo y limpiar el anterior después del cambio de referencia. | Inventariar `avatar` antes de migrar referencias antiguas; no se crea columna. Si hubiera URL antiguas, acordar su tratamiento antes de cambiar lecturas. |
| Desactivación | Cambiar solo `User.isActive` a `false`; conservar mascotas, publicaciones, comentarios, likes y membresías. Las lecturas filtran también la actividad de sus autores y los conteos excluyen likes de cuentas inactivas. | Las cuentas actuales conservan su estado; sin borrado ni migración. |

La foto es visible a otras personas con cuenta, pero D-35 no concede acceso anónimo. D-39 confirmó almacenamiento privado, entrega autorizada y límites para avatares; D-32/D-33 tratan por separado fotos de publicaciones.

## API propuesta y permisos

`GET/PATCH /users/me`, `GET /users`, `GET /users/:id`, las tres rutas de avatar y `POST /auth/reactivate` ya están en código con pruebas locales; `/user` se retiró. La desactivación sigue propuesta. Las pruebas con identidad y Supabase simulados no sustituyen el recorrido con sesión real en la app.

| Operación | Resultado y validación | Quién puede usarla |
| --- | --- | --- |
| `GET /users/me` | Datos propios y correo; no incluye secretos. | Dueño con sesión válida y perfil activo. |
| `PATCH /users/me` | Actualiza solo nombre de usuario, biografía y estado. Conflicto de nombre devuelve 409 sin perder el formulario. | Dueño activo; ID tomado del token. |
| `GET /users?q=...&cursor=...&limit=...` | Busca por nombre de usuario sin distinguir mayúsculas; devuelve páginas estables de perfiles activos y solo campos públicos. D-40 fija texto de búsqueda de 2 a 50 caracteres, 20 resultados por página y máximo 30. | Persona autenticada con cuenta activa. |
| `GET /users/:id` | Perfil público de una cuenta activa; incluye sus mascotas activas cuando se integre Mascotas. Perfil inexistente o inactivo no expone correo ni contenido. | Persona autenticada con cuenta activa. |
| `PUT /users/me/avatar`, `DELETE /users/me/avatar` y `GET /users/:id/avatar` | Subir, quitar y leer foto privada. Se valida archivo real y propiedad al escribir; al leer se verifica cuenta solicitante y dueño activos. No se devuelve URL pública ni ruta interna de Storage; la imagen no se deja en caché compartida. | Escritura del dueño activo; lectura de otra cuenta activa. |
| `POST /users/me/deactivate` | Tras confirmación en la app, comprueba en **todas** las comunidades que otro `ADMIN` activo permanecerá. Si falta, responde conflicto con explicación; si procede, desactiva la cuenta. | Dueño activo; sin ID aportado por el cliente. |
| `POST /auth/reactivate` | Ruta propuesta para D-41: tras confirmar en la app, vuelve a validar correo y contraseña con Supabase Auth y reactiva la misma fila `User`. Devuelve sesión para entrar. Una contraseña incorrecta no reactiva. | Persona dueña de la identidad; operación disponible sin acceso al contenido. |

Para reactivar sin permitir que un token antiguo active la cuenta por sí solo, D-41 exige volver a comprobar las credenciales en la operación final. La app puede conservarlas **solo en memoria** durante el paso de confirmación; si se cierra, la persona vuelve a escribirlas. No se registran ni se guardan como datos del perfil. Esta decisión ajusta la excepción de reactivación prevista en el [plan de Cuenta](../01-CUENTA/01-PLAN.md).

## Seguridad y consistencia entre módulos

1. El guard valida el token y consulta `User` antes de permitir contenido: perfil inexistente va a completar registro; `isActive = false` solo puede conocer su estado y seguir el flujo de reactivación. Una sesión antigua no lee contenido. Las rutas públicas de ingreso y reactivación validan credenciales con Supabase Auth y nunca aceptan un ID de dueño enviado por el cliente.
2. Aplicar D-40 también al registro y al formulario para completar el perfil: validar el mismo límite de nombre de usuario en todos los puntos de escritura y el de biografía donde se permita. Dejar de aceptar `avatar` como texto libre en el registro; la única escritura de foto pasará por archivo validado. Actualizar el contrato de Cuenta y sus consumidores durante la implementación autorizada, sin crear un segundo camino que salte Storage privado.
3. Buscar, abrir perfiles, leer mascotas y avatares, listar publicaciones y comentarios, leer fotos e interacciones, así como contar likes y miembros, deben aplicar `User.isActive`. La regla se comparte en el punto de acceso a datos o se prueba en cada módulo consumidor; ocultar la pantalla no basta.
4. La desactivación comprueba que cada comunidad administrada conserva **otro administrador activo**. Comprobación y cambio de estado deben ser atómicos y resistir dos desactivaciones simultáneas; usar transacción con aislamiento adecuado y reintento controlado ante conflicto. La acción de nombrar otro administrador pertenece a Comunidades y debe estar disponible antes de habilitar este botón.
5. Al desactivar, la app elimina tokens locales y muestra ingreso. Supabase Auth conserva la identidad. Reingresar con credenciales correctas solo muestra la opción de reactivar; no abre feed, perfil ni comunidad antes de la confirmación.
6. Al reactivar, solo cambia `User.isActive` a `true`. No se reactivan filas `Pet`, `Post` o `Comment` que tenían `isActive = false`; las membresías y roles existentes vuelven a contar sin crear duplicados. Las retiradas por moderación conservan su estado.

## Interfaz móvil y respuesta a fallas

**Ajuste aprobado, D-137 (26-10-2026):** implementado tras autorización posterior del usuario; pruebas locales aprobadas y recorrido físico pendiente. Buscar reutiliza `components/search-profiles-screen.tsx` desde `/buscar` y conserva `/profiles/search` por compatibilidad. No requiere un contrato nuevo de API, cambios de esquema ni una librería nueva de modales.

1. Mantener en la misma pantalla un modo de lectura inicial y un modo de edición que se activa con «Modificar perfil». Separar los valores persistidos del borrador de nombre/biografía/estado. En lectura no se abren teclado, selector de estado ni acciones de foto; el correo nunca es editable.
2. Mostrar «Guardar cambios» y «Cancelar» en edición. Guardar usa la validación y API actuales, con bloqueo de envíos duplicados. Solo tras éxito actualizar datos persistidos, volver a lectura y ejecutar la alerta nativa «Perfil actualizado» / «Tus cambios se guardaron correctamente». Un error conserva el borrador y la edición y se muestra junto al formulario.
3. Cancelar restaura el último texto/estado guardado y vuelve a lectura. Las operaciones de foto conservan su guardado inmediato y sus estados independientes; habilitarlas solo en edición. Explicar que cancelar no deshace la foto. No enviar ni anunciar guardado del borrador de texto al terminar una operación de foto.
4. Reutilizar la búsqueda existente como destino «Buscar» de la barra inferior y retirar el enlace de Mi perfil. Mantener paginación, permisos y navegación a perfiles públicos. Respetar D-120/D-124 como navegación final sin inventar funciones de módulos aún no implementados; comprobar rutas reales antes de modificar la barra.
5. Verificar lectura sin teclado, activación de edición, validación, guardado único con alerta, error con borrador conservado, cancelar texto/estado y cambiar foto seguido de cancelar. Revisar teclado, áreas seguras, tamaños de texto y accesibilidad al implementar, siguiendo las skills del repositorio.

- «Mi perfil» diferencia carga, éxito, fallo y reintento; la edición mantiene datos si falla. El correo aparece como dato de solo lectura. Para la foto se muestra vista previa y un error junto a la acción si falla la carga.
- La búsqueda muestra texto de ayuda, resultados paginados, estado vacío y error recuperable. La tarjeta y el detalle usan etiquetas de estado de México legibles, no nombres internos del enum. El perfil ajeno no representa campos privados aunque el servidor debe excluirlos igualmente.
- Desactivar requiere una confirmación clara y estado de espera. Si falta otro administrador, muestra qué debe hacer antes; una falla de red no se presenta como desactivación exitosa. Reactivar pide confirmación, muestra espera y reintento, y navega al contenido solo tras respuesta exitosa.
- Al diseñar las pantallas durante la implementación futura, aplicar `apps/mobile/AGENTS.md`, `apple-design` y `async-feedback`, además de los estados descritos aquí.

## Orden de trabajo y puntos de verificación

1. **Base de Cuenta:** completar sesión validada, estado `complete | incomplete | inactive`, renovación y guard; retirar el registro de credenciales. Probar que un perfil inactivo no accede a contenido.
2. **Perfil seguro:** DTO propio, respuestas pública/privada, búsqueda limitada y paginada, lectura y edición del dueño. Probar con dos cuentas que otra persona no edita ni recibe correo.
3. **Foto:** inventariar valores antiguos; configurar Storage privado según D-39 durante la implementación autorizada; integrar subida, reemplazo, retirada y lectura autorizada. Probar falla de Storage y cuenta desactivada.
4. **Administración comunitaria:** habilitar nombrar otro `ADMIN` activo y comprobar que una comunidad no quede sin administrador, incluida una carrera entre dos desactivaciones.
5. **Desactivar y reactivar:** integrar guard, operación atómica, ingreso con estado inactivo y reactivación confirmada. Probar sesión antigua, credenciales inválidas y contenido individualmente retirado.
6. **Efectos transversales y app:** comprobar visibilidad en mascotas, feed, comentarios, likes y miembros; integrar pantallas y navegación con carga, error y reintento. No declarar Perfiles «Verificada» si falta un módulo necesario para PE-05–PE-07.

Las respuestas públicas, validaciones y fotos ya tienen implementación local. Las operaciones de desactivación dependen de la capacidad de Comunidades para nombrar otro administrador. Las [tareas](02-TAREAS.md) mantienen ese trabajo separado.

## Riesgos y comprobaciones

| Riesgo | Comprobación o respuesta |
| --- | --- |
| El código actual filtra o muestra campos de `User` completos | Probar el JSON real de búsqueda y perfil ajeno con dos cuentas; permitir explícitamente solo campos públicos. |
| Una cuenta inactiva entra con un token antiguo o reacciona a contenido | Probar guard y cada ruta de contenido por API directa; la reactivación requiere credenciales nuevas. |
| Dos administradores se desactivan al mismo tiempo y dejan una comunidad sin `ADMIN` activo | Prueba concurrente con transacción y comprobación de administrador restante. |
| Una foto antigua contiene URL pública o queda en caché tras desactivar | Inventariar `User.avatar`, probar acceso directo al archivo y respuesta sin caché compartida antes de declarar la foto privada. |
| Una falla de red ocurre después de solicitar desactivación o reactivación | Consultar el estado de cuenta al reintentar y mostrar el resultado real, sin duplicar operaciones ni asumir éxito. |

## Decisiones confirmadas en el plan

1. **Foto de perfil (D-39):** Storage privado, acceso comprobado por backend y límite de una imagen JPEG/PNG/WebP de hasta 5 MB. El plan propone que `User.avatar` guarde la ruta interna, sin columna nueva.
2. **Búsqueda y edición (D-40):** búsqueda de 2–50 caracteres, 20 resultados por página y máximo 30; nombre de usuario de 3–30 caracteres y biografía de hasta 300. `locatedAt` sigue siendo un estado de México obligatorio.
3. **Reactivación (D-41):** tras ingresar y aceptar la reactivación, el servidor comprueba de nuevo correo y contraseña antes de activar la cuenta. La app conserva esas credenciales solo en memoria durante la confirmación. Esto sustituye la excepción con token que mencionaba el plan de Cuenta.

**Actualización, 26-10-2026:** implementación funcional integrada, incluida desactivación segura y Comunidades. PE-T01–PE-T10 comprobadas localmente; PE-T11–PE-T14 conservan revisión física pendiente y diseño final aplazado por el usuario. [Informe](../../REVISIONES/2026-10-26-PERFILES.md). La desactivación usa transacciones Serializable coordinadas con creación comunitaria, roles y salidas, con hasta cuatro intentos ante conflicto; no necesita migración nueva. Las descripciones anteriores de implementación pendiente son históricas.

Si una decisión cambia, actualizar primero la ficha y este plan. Ninguna ruta, archivo ni permiso propuesto aquí se considera implementado por estar documentado.
