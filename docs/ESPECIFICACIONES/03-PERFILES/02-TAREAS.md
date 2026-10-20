# Tareas aprobadas: Perfiles (`perfiles`)

**Estado:** lista revisada y aprobada por el usuario el 9 de octubre de 2026; ninguna tarea está ejecutada. Derivan de la [ficha confirmada](../03-PERFILES.md), el [plan aprobado](01-PLAN.md) y D-35–D-41. El usuario pidió terminar toda la documentación antes de autorizar código. Esta aprobación no inicia la implementación.

**Trabajo futuro fuera del MVP:** D-86 aplaza la suspensión administrativa de D-78 y D-80 al sistema web del equipo. Estas tareas de Perfiles no dependen de ella; si se retoma, se actualizarán el plan y las pruebas de integración.

## Qué se hará, en orden

1. Comprobar qué datos y rutas de perfil existen antes de cambiarlos.
2. Permitir ver y editar el perfil sin revelar datos privados; después, añadir búsqueda por nombre.
3. Guardar y entregar la foto de perfil con permiso comprobado.
4. Preparar la reactivación y la desactivación segura, incluida la regla del administrador de comunidad.
5. Hacer que mascotas, publicaciones, comentarios, «Me gusta» y comunidades respeten el estado de la cuenta.
6. Integrar las pantallas, comprobar los recorridos y actualizar la documentación según lo realmente verificado.

Cada casilla se marcará solo al ejecutar y comprobar su aceptación. Los archivos indicados son los principales previstos, no permiso para modificar código ahora. Si una tarea necesita más alcance o cambia un contrato, revisar antes la ficha, el plan y esta lista. Las tareas de Cuenta, Publicaciones y Comunidades que se mencionan como dependencias pertenecen a sus propios módulos.

## Trabajo técnico y comprobación

- [ ] **PE-T01. Inventariar perfiles, fotos y consumidores actuales.** Depende de: ninguna. Prepara PE-01–PE-07 y D-39.
  - **Aceptación:** se registra qué rutas y pantallas consumen `/user` y `User.avatar`, y si la base conectada contiene valores de `avatar`. Si no hay base disponible, se deja la comprobación pendiente sin declarar que los valores están vacíos. Se identifica cómo actualizar o retirar cada ruta anterior sin dejar acceso inseguro.
  - **Verificar:** inspección de consumidores y consulta de solo lectura de `User.avatar` cuando exista una base de prueba conectada; comparar el inventario con [API](../../05-API.md).
  - **Archivos previstos:** `docs/ESPECIFICACIONES/03-PERFILES/01-PLAN.md` (registro del inventario); `apps/backend/src/user/`, `apps/backend/src/auth/` y `apps/mobile/` (solo inspección en esta tarea).

- [ ] **PE-T02. Separar datos propios, datos públicos y edición autorizada.** Depende de: PE-T01 y CU-T04 de Cuenta. Cubre PE-01, PE-03 y D-35, D-38, D-40.
  - **Aceptación:** `GET /users/me` entrega el correo solo al dueño; `GET /users/:id` entrega únicamente datos públicos de una cuenta activa. `PATCH /users/me` permite al dueño cambiar nombre de usuario de 3–30 caracteres, biografía de hasta 300 y estado de México; permite quitar la biografía. No acepta cambiar ID, correo, contraseña, foto mediante texto ni estado de actividad. Un nombre repetido informa el conflicto y no pierde otros datos. Las rutas antiguas de edición o lectura no permiten eludir estas reglas.
  - **Verificar:** pruebas de API con dos cuentas para lectura propia y ajena, edición propia y ajena, nombre duplicado, campos prohibidos, cuenta inactiva e ID directo; `pnpm --filter proyecto-backend test:e2e`.
  - **Archivos previstos:** `apps/backend/src/user/user.controller.ts`, `apps/backend/src/user/user.service.ts`, DTO en `apps/backend/src/user/dto/`, prueba en `apps/backend/test/`. Ajustar consumidores de rutas antiguas como tarea enlazada antes de retirarlas.

- [ ] **PE-T03. Buscar perfiles activos sin exponer correos.** Depende de: PE-T02. Cubre PE-02–PE-04 y D-35, D-40.
  - **Aceptación:** `GET /users` acepta búsqueda por nombre de 2–50 caracteres; devuelve 20 resultados por página por defecto, nunca más de 30 por solicitud, con orden y cursor estables. Excluye cuentas inactivas antes de paginar y solo devuelve campos públicos. Consulta vacía o inválida devuelve una explicación, no la tabla completa. La ruta anterior `/user/search` tampoco filtra filas completas.
  - **Verificar:** pruebas de API con más de una página, nombres repetidos en distintas posiciones, texto corto o largo, cuenta inactiva y respuesta inspeccionada para confirmar que no contiene correo; `pnpm --filter proyecto-backend test:e2e`.
  - **Archivos previstos:** `apps/backend/src/user/user.controller.ts`, `apps/backend/src/user/user.service.ts`, DTO de búsqueda en `apps/backend/src/user/dto/`, prueba en `apps/backend/test/`.

- [ ] **PE-T04. Guardar, reemplazar y quitar una foto de perfil.** Depende de: PE-T01–PE-T02. Cubre PE-01 y D-39.
  - **Aceptación:** el dueño puede subir cero o una imagen JPEG, PNG o WebP de hasta 5 MB. El servidor valida el archivo real, usa almacenamiento privado y guarda la referencia interna en `User.avatar`; el registro deja de aceptar `avatar` como texto libre. Al reemplazar, la cuenta apunta a la foto nueva antes de retirar la anterior. Si falla Storage o la base, no queda una referencia rota y se registra cualquier limpieza pendiente para reintentar. Quitar la foto deja el campo vacío.
  - **Verificar:** pruebas con formato y tamaño inválidos, subida, reemplazo, retirada y fallas simuladas de Storage y base; confirmar que el espacio de Storage es privado y ejecutar `pnpm backend:build`. Resolver valores antiguos del inventario antes de cambiar su lectura.
  - **Archivos previstos:** `apps/backend/src/user/user.controller.ts`, `apps/backend/src/user/user.service.ts`, servicio de foto en `apps/backend/src/user/`, `apps/backend/src/auth/dto/signUp.dto.ts`, prueba en `apps/backend/test/`. **Configuración externa futura:** espacio privado de Storage.

- [ ] **PE-T05. Entregar la foto solo a cuentas que pueden verla.** Depende de: PE-T04 y CU-T04. Cubre PE-03, PE-05 y D-39.
  - **Aceptación:** `GET /users/:id/avatar` comprueba en cada solicitud que la persona solicitante y la dueña de la foto tengan cuentas activas. La respuesta no revela la ruta interna ni una URL pública y evita caché compartida. Una cuenta desactivada o una sesión inválida dejan de recibir la imagen en la siguiente petición; las respuestas de perfil contienen solo una referencia a esta ruta protegida.
  - **Verificar:** solicitudes directas con dos cuentas activas, sesión ausente, solicitante desactivado y dueño desactivado; comprobar que no se puede leer la foto directamente desde Storage; `pnpm --filter proyecto-backend test:e2e`.
  - **Archivos previstos:** `apps/backend/src/user/user.controller.ts`, `apps/backend/src/user/user.service.ts`, servicio de foto en `apps/backend/src/user/`, prueba en `apps/backend/test/`.

- [ ] **PE-T06. Permitir reactivar la misma cuenta tras comprobar de nuevo las credenciales.** Depende de: CU-T04–CU-T06 y PE-T02. Cubre PE-06–PE-07 y D-36–D-37, D-41.
  - **Aceptación:** una identidad confirmada con perfil inactivo puede conocer ese estado, pero no entrar al contenido. Después de que la persona confirma «Reactivar», `POST /auth/reactivate` vuelve a comprobar su correo y contraseña mediante Supabase Auth y activa la misma fila `User`; una contraseña errónea o un token antiguo por sí solo no la activan. Solo cambia `User.isActive`: contenido retirado individualmente permanece retirado y las membresías guardadas vuelven a ser utilizables sin duplicarse. No se guardan ni registran credenciales.
  - **Verificar:** pruebas de API con contraseña válida e inválida, token anterior, cuenta ya activa, doble petición y falla de red tras la petición; confirmar mismo `User.id` y ausencia de duplicados; `pnpm --filter proyecto-backend test:e2e`.
  - **Archivos previstos:** `apps/backend/src/auth/auth.controller.ts`, `apps/backend/src/auth/auth.service.ts`, `apps/backend/src/user/user.service.ts`, prueba en `apps/backend/test/`. Coordinar con el contrato de Cuenta sin abrir una excepción general al guard.

- [ ] **PE-T07. Desactivar sin dejar comunidades sin administrador.** Depende de: PE-T02, CU-T04 y la tarea de Comunidades que permita nombrar otro `ADMIN` activo. Cubre PE-05, PE-07 y D-36–D-37.
  - **Aceptación:** `POST /users/me/deactivate` toma el dueño de la sesión y pide confirmación en la app. El servidor comprueba todas las comunidades que administra; si en alguna sería el último `ADMIN` activo, explica el bloqueo y no desactiva. Comprobación y cambio de `User.isActive` ocurren juntos para impedir que dos administradores se desactiven al mismo tiempo y dejen una comunidad sin responsable. Si procede, conserva todos los registros y el acceso previo al contenido queda bloqueado.
  - **Verificar:** pruebas con cero, una y varias comunidades, otro administrador inactivo, dos desactivaciones simultáneas, ID ajeno y petición repetida; `pnpm --filter proyecto-backend test:e2e`.
  - **Archivos previstos:** `apps/backend/src/user/user.controller.ts`, `apps/backend/src/user/user.service.ts`, servicio de roles comunitarios cuando exista, prueba en `apps/backend/test/`. No habilitar el botón sin la dependencia de Comunidades.

- [ ] **PE-T08. Ocultar contenido de cuentas desactivadas en mascotas y publicaciones.** Depende de: PE-T07, PU-T04 y tareas de Mascotas para sus lecturas. Cubre PE-05–PE-06 y D-36.
  - **Aceptación:** una cuenta inactiva no aparece como dueña visible de mascotas ni autora de publicaciones; fichas, detalle, listas y fotos no se entregan por ID directo. Al reactivarla, reaparece solo contenido que seguía activo por sí mismo. El servidor aplica la regla aunque la pantalla conserve una referencia antigua.
  - **Verificar:** peticiones directas a listas, fichas, detalles y fotos antes de desactivar, mientras está desactivada y tras reactivar; incluir mascota y publicación retiradas por separado; `pnpm --filter proyecto-backend test:e2e`.
  - **Archivos previstos:** servicios de lectura en `apps/backend/src/pet/` y `apps/backend/src/post/`, sus pruebas en `apps/backend/test/`. Coordinar con las tareas de cada capacidad antes de cerrar PE-05.

- [ ] **PE-T09. Ocultar comentarios y «Me gusta» de cuentas desactivadas.** Depende de: PE-T07 y tareas de Interacciones para lecturas y conteos. Cubre PE-05–PE-06 y D-36.
  - **Aceptación:** comentarios de una cuenta inactiva no se entregan y sus «Me gusta» no se cuentan; esa persona no puede crear interacciones. Los registros permanecen guardados y vuelven a considerarse al reactivar, salvo comentarios retirados individualmente. La API aplica la regla en listas, detalles y conteos, no solo en la app.
  - **Verificar:** pruebas directas de comentarios y likes antes/después de desactivar y reactivar; incluir un comentario retirado y un post también oculto; `pnpm --filter proyecto-backend test:e2e`.
  - **Archivos previstos:** `apps/backend/src/comments/`, módulo de likes cuando exista y pruebas en `apps/backend/test/`. Registrar la dependencia si Interacciones aún no está implementado.

- [ ] **PE-T10. Ocultar membresías de cuentas desactivadas y recuperarlas al volver.** Depende de: PE-T07 y tareas de Comunidades para acceso, listas y conteos. Cubre PE-07 y D-36–D-37.
  - **Aceptación:** la persona inactiva no entra en comunidades ni aparece o cuenta como miembro activo. Sus filas `CommunityMember` y roles permanecen guardados; al reactivar vuelve a sus comunidades sin crear membresías duplicadas. El servidor comprueba esto en acceso, lista y total de miembros.
  - **Verificar:** pruebas directas con miembro, moderador y administrador antes/después de desactivar y reactivar; comprobar conteos y otro administrador inactivo; `pnpm --filter proyecto-backend test:e2e`.
  - **Archivos previstos:** módulo de comunidades cuando exista, consulta de membresías y pruebas en `apps/backend/test/`. Registrar la dependencia si Comunidades aún no está implementado.

- [ ] **PE-T11. Mostrar y editar «Mi perfil» en la app.** Depende de: PE-T02, PE-T04–PE-T05 y CU-T06. Cubre PE-01 y PE-04.
  - **Aceptación:** la persona ve su correo como dato no editable, cambia nombre, biografía y estado, y puede agregar, reemplazar o quitar su foto. Ve carga, guardado, éxito, validación, falla y reintento junto a la acción; el formulario conserva lo escrito cuando falla. Una foto inválida explica el límite y no borra los otros campos.
  - **Verificar:** `pnpm --filter mobile lint`, `pnpm --filter mobile exec tsc --noEmit` y recorrido móvil con edición normal, nombre duplicado, foto inválida, API inaccesible y reemplazo de foto.
  - **Archivos previstos:** `apps/mobile/app/(tabs)/perfil.tsx`, componentes de edición en `apps/mobile/components/`, consultas en `apps/mobile/hooks/`, tipos en `apps/mobile/types/`.

- [ ] **PE-T12. Buscar personas y abrir su perfil público en la app.** Depende de: PE-T03, PE-T05 y tareas de Mascotas para mostrar sus fichas públicas. Cubre PE-02–PE-04.
  - **Aceptación:** la búsqueda explica el mínimo de texto, muestra 20 resultados por página, permite cargar más y distingue carga, lista vacía, error y reintento. El perfil ajeno muestra nombre, foto, biografía, estado y mascotas activas sin correo ni edición ajena. Una persona sin mascotas sigue teniendo perfil visible; una cuenta desactivada no aparece.
  - **Verificar:** `pnpm --filter mobile lint`, `pnpm --filter mobile exec tsc --noEmit` y recorrido con dos páginas, búsqueda vacía, sesión vencida, API caída, cuenta sin mascota y perfil desactivado.
  - **Archivos previstos:** pantalla de búsqueda y detalle en `apps/mobile/app/`, componentes en `apps/mobile/components/`, consultas en `apps/mobile/hooks/`, tipos en `apps/mobile/types/`.

- [ ] **PE-T13. Guiar desactivación y reactivación en la app.** Depende de: PE-T06–PE-T07, PE-T11 y CU-T06. Cubre PE-05–PE-07.
  - **Aceptación:** desactivar pide confirmación, explica si falta otro administrador y vuelve al ingreso solo cuando el servidor confirma el cambio. Una cuenta inactiva ve la opción de reactivar sin abrir contenido; tras aceptar, la app conserva correo y contraseña únicamente en memoria durante la comprobación final y los descarta después. Si se cierra la app, la persona los introduce otra vez. Falla de red o credenciales erróneas muestran error y reintento sin anunciar éxito falso.
  - **Verificar:** `pnpm --filter mobile lint`, `pnpm --filter mobile exec tsc --noEmit` y recorrido móvil con bloqueo comunitario, éxito, API caída, contraseña errónea, cierre de app durante confirmación y token viejo.
  - **Archivos previstos:** `apps/mobile/app/(tabs)/perfil.tsx`, pantalla de ingreso y reactivación en `apps/mobile/app/(auth)/`, `apps/mobile/hooks/useAuth.ts`, `apps/mobile/context/AuthContext.tsx`.

- [ ] **PE-T14. Comprobar el módulo completo y registrar lo realmente integrado.** Depende de: PE-T01–PE-T13 y de las tareas relacionadas de Cuenta, Mascotas, Publicaciones, Interacciones y Comunidades. Cubre PE-01–PE-07.
  - **Aceptación:** cada criterio PE tiene evidencia de API y app según corresponda, incluidas solicitudes directas sin permiso, fallas y cuenta desactivada. Se anotan fecha, entorno y dependencias pendientes. API, datos, decisiones y ruta de desarrollo distinguen comportamiento actual de propuesta; Perfiles no recibe estado «Verificada» si falta una integración necesaria.
  - **Verificar:** `pnpm --filter proyecto-backend test -- --runInBand`, `pnpm --filter proyecto-backend test:e2e`, `pnpm backend:build`, `pnpm --filter mobile lint`, `pnpm --filter mobile exec tsc --noEmit` y recorrido manual en dispositivo; revisar PE-01–PE-07 uno por uno.
  - **Archivos previstos:** `docs/ESPECIFICACIONES/03-PERFILES.md`, `docs/00-RUTA-DE-DESARROLLO.md`, `docs/04-DATOS-Y-PERMISOS.md`, `docs/05-API.md`, este archivo.

## Regla para seguir

Esta lista ya fue aprobada conforme a [SDD](../../02-SDD.md), pero **ninguna tarea autoriza código**: el usuario quiere terminar primero la documentación del proyecto. Si al trabajar más adelante aparece un dato real, un cambio de contrato o una dependencia distinta, se actualizarán ficha, plan y tareas antes de continuar.
