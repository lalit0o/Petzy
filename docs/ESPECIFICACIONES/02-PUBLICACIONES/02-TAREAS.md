# Tareas: Publicaciones (`publicaciones`)

**Estado:** lista revisada y aprobada por el usuario el 9 de octubre de 2026; ninguna tarea está implementada por estar escrita aquí. Derivan del [plan técnico aprobado](01-PLAN.md) y de la [ficha funcional](../02-PUBLICACIONES.md). El usuario pidió terminar primero la documentación del proyecto: no comenzar código, migraciones ni configuración de Supabase hasta que lo autorice después.

## Qué se hará, en orden

1. Preparar los datos y comprobar cómo se separan Inicio y comunidades.
2. Crear la API para consultar, publicar, editar y retirar publicaciones con sus permisos.
3. Integrar una foto privada opcional y el vínculo opcional con mascota.
4. Construir las pantallas de Inicio y publicación.
5. Añadir moderación y restauración en la comunidad; integrarlas con comentarios y «Me gusta».
6. Probar el recorrido completo y actualizar el estado real de la documentación.

Cada casilla se marca solo cuando se ejecuta y se comprueba. Los archivos son los principales previstos; antes de implementar, se ajustará una tarea si el código real exige más cambios o cambia un contrato. La cuenta debe estar integrada para probar permisos con sesiones reales; la ficha de `interacciones` y la de `comunidades` aportarán las tareas propias de sus pantallas y datos.

## Trabajo técnico y comprobación

- [ ] **PU-T01. Inventariar datos y rutas existentes antes de migrar.** Depende de: ninguna. Prepara D-30–D-32.
  - **Aceptación:** queda registrado qué consumidores usan `/post`, si la base conectada tiene publicaciones y cuántas filas tienen `photoUrl` informado. Si no existe una base, se anota expresamente y no se afirma que esté vacía. La migración conserva las categorías anteriores y prevé `petId = null` para publicaciones existentes.
  - **Verificar:** consulta de solo lectura del [plan](01-PLAN.md) cuando exista base, búsqueda de consumidores y revisión de copia de respaldo antes de cualquier cambio de esquema.
  - **Archivos previstos:** `docs/ESPECIFICACIONES/02-PUBLICACIONES/01-PLAN.md`, `apps/backend/prisma/schema.prisma`, `apps/backend/src/post/`, `apps/mobile/app/` (inspección; solo el plan se edita si cambia el inventario).

- [ ] **PU-T02. Preparar los datos de categoría y mascota vinculada.** Depende de: PU-T01. Cubre FE-08–FE-09 y D-21, D-30.
  - **Aceptación:** el modelo admite `HELP` («Ayuda») y `Post.petId Int?` relacionado con `Pet.id`; las cuatro categorías actuales siguen válidas y las publicaciones anteriores quedan sin mascota vinculada. Hay índice para consultar la relación.
  - **Verificar:** revisión de la migración antes de ejecutarla, aplicación en base de prueba, comprobación de filas previas y `pnpm backend:build`.
  - **Archivos previstos:** `apps/backend/prisma/schema.prisma`, nueva migración en `apps/backend/prisma/migrations/`, tipos Prisma generados.

- [ ] **PU-T03. Preparar el registro de retiradas por moderación.** Depende de: PU-T01. Cubre FE-11, FE-13 y D-31; lo reutilizará `interacciones`.
  - **Aceptación:** `ModerationRemoval` guarda publicación **o** comentario, moderador y fecha; al restaurar puede guardar administrador y fecha. Las restricciones impiden dos retiradas de moderación abiertas del mismo contenido. No agrega campos de moderación a `Post` ni `Comment`; las filas previamente inactivas no se atribuyen a un moderador.
  - **Verificar:** revisar restricciones y relaciones de la migración, probar que una segunda retirada abierta falla y que una restaurada permite un ciclo posterior; `pnpm backend:build`.
  - **Archivos previstos:** `apps/backend/prisma/schema.prisma`, nueva migración en `apps/backend/prisma/migrations/`, pruebas de integración de datos en `apps/backend/test/`.

- [ ] **PU-T04. Aplicar una sola regla de lectura para publicaciones.** Depende de: PU-T02 y Cuenta integrada. Cubre FE-01–FE-02, FE-05 y D-20.
  - **Aceptación:** una publicación activa de Inicio la puede leer una persona autenticada; una de comunidad exige membresía vigente, incluso por ID directo. Una publicación desactivada o cuyo autor desactivó su cuenta no se entrega por la consulta normal. Si el autor reactiva la cuenta, reaparece solo si el post seguía activo (D-36). La misma regla queda disponible para foto, comentarios y reacciones.
  - **Verificar:** pruebas de servicio con dos cuentas y dos comunidades; acceso permitido, no miembro, otra comunidad, publicación inactiva e ID directo; `pnpm --filter proyecto-backend test -- --runInBand`.
  - **Archivos previstos:** `apps/backend/src/post/post.service.ts`, servicio de permisos de publicaciones en `apps/backend/src/post/`, `apps/backend/src/post/post.module.ts`, prueba en `apps/backend/src/post/`.

- [ ] **PU-T05. Separar listas de Inicio y comunidad con filtros y paginación.** Depende de: PU-T04. Cubre FE-01–FE-02, FE-06 y FE-10.
  - **Aceptación:** `GET /posts` devuelve solo `communityId = null`; «Todas» reúne sus categorías y `type` filtra una. `GET /communities/:id/posts` devuelve solo esa comunidad a miembros. Orden por fecha e ID, 20 resultados por página por defecto y máximo 30; al pedir más no se mezclan contextos ni se repiten filas. Lista y detalle entregan solo datos públicos del autor.
  - **Verificar:** pruebas de API con publicaciones intercaladas de dos categorías y dos comunidades, cambio de filtro, páginas siguientes, lector no miembro y detalle directo; `pnpm --filter proyecto-backend test:e2e`.
  - **Archivos previstos:** `apps/backend/src/post/post.controller.ts`, `apps/backend/src/post/post.service.ts`, DTO de consulta en `apps/backend/src/post/dto/`, prueba en `apps/backend/test/`.

- [ ] **PU-T06. Crear publicaciones con validaciones y mascota opcional.** Depende de: PU-T02, PU-T04 y PU-T05. Cubre FE-04, FE-07–FE-09 y D-29–D-30, D-34.
  - **Aceptación:** `POST /posts` crea solo en Inicio y `POST /communities/:id/posts` solo para miembros; el servidor toma el autor del token y la comunidad de la ruta. Exige categoría, título de 1–120 y descripción de 1–3 000 caracteres; rechaza mascota ajena o inactiva y permite no elegir ninguna. La categoría no asigna General silenciosamente.
  - **Verificar:** pruebas de API con cuenta sin mascota, miembro/no miembro, las cinco categorías, textos vacíos o largos, `communityId` enviado indebidamente y mascota ajena; `pnpm --filter proyecto-backend test:e2e`.
  - **Archivos previstos:** `apps/backend/src/post/post.controller.ts`, `apps/backend/src/post/post.service.ts`, `apps/backend/src/post/dto/create-post.dto.ts`, prueba en `apps/backend/test/`.

- [ ] **PU-T07. Editar texto, categoría y mascota, y retirar publicaciones propias.** Depende de: PU-T06. Cubre parte de FE-03, FE-05 y D-22; la edición de foto se completa en PU-T08.
  - **Aceptación:** solo el autor cambia título, descripción, categoría o mascota; puede quitar la mascota, pero nunca cambiar autor o `communityId`. Si cambia categoría, el filtro refleja el cambio. Al retirar, `isActive` pasa a `false`, el registro permanece y no aparece en consultas normales; no se crea `ModerationRemoval` por una retirada propia.
  - **Verificar:** pruebas de API para propietario/otra cuenta, edición parcial, textos inválidos, mascota ajena, intento de mover comunidad y retirada por autor; `pnpm --filter proyecto-backend test:e2e`.
  - **Archivos previstos:** `apps/backend/src/post/post.controller.ts`, `apps/backend/src/post/post.service.ts`, `apps/backend/src/post/dto/update-post.dto.ts`, `apps/backend/src/auth/guards/post-owner.guard.ts`, prueba en `apps/backend/test/`.

- [ ] **PU-T08. Guardar y reemplazar una foto de publicación de forma segura.** Depende de: PU-T06–PU-T07. Cubre FE-12 y D-24, D-32–D-33.
  - **Aceptación:** bucket privado; cero o una foto JPEG, PNG o WebP de hasta 5 MB. El backend valida el archivo real, guarda una ruta interna en `photoUrl`, usa un objeto nuevo al reemplazar y permite quitarlo. Si falla Storage o Postgres, no deja la publicación apuntando a una imagen inexistente; la limpieza pendiente se registra para reintento. Ocultar el post conserva la foto para posible restauración.
  - **Verificar:** pruebas con tamaño/formato inválido, falla al subir, falla al guardar, reemplazo y retirada; inspección del bucket privado y `pnpm backend:build`.
  - **Archivos previstos:** `apps/backend/src/post/post.service.ts`, servicio de fotos en `apps/backend/src/post/`, `apps/backend/src/post/post.controller.ts`, `apps/backend/src/supabase/supabase.service.ts`, prueba en `apps/backend/test/`. **Configuración externa:** bucket privado y límites acordados.

- [ ] **PU-T09. Entregar la foto solo a quien puede ver la publicación.** Depende de: PU-T04 y PU-T08. Cubre FE-02, FE-05, FE-12, D-32 y D-36–D-37.
  - **Aceptación:** `GET /posts/:id/photo` comprueba en cada solicitud la sesión, que estén activas tanto la cuenta solicitante como la del autor, que la publicación esté activa y, si pertenece a una comunidad, que el solicitante sea miembro activo. No entrega URL pública ni ruta interna de Storage. Una persona que deja la comunidad pierde acceso en la siguiente petición. La foto tampoco se entrega si la publicación está oculta o su autor desactivó la cuenta. La respuesta evita caché compartida.
  - **Verificar:** solicitudes directas con miembro, no miembro, membresía retirada, post desactivado, cuenta solicitante desactivada y cuenta del autor desactivada; confirmar que Storage no expone una URL pública; `pnpm --filter proyecto-backend test:e2e`.
  - **Archivos previstos:** `apps/backend/src/post/post.controller.ts`, `apps/backend/src/post/post.service.ts`, servicio de fotos en `apps/backend/src/post/`, prueba en `apps/backend/test/`.

- [ ] **PU-T10. Construir Inicio con categorías y carga de más resultados.** Depende de: PU-T05 y PU-T09. Cubre FE-01, FE-06–FE-07 y FE-10.
  - **Aceptación:** Inicio muestra solo publicaciones generales, «Todas» y cinco filtros; cambiar filtro reinicia la lista. Cargar más mantiene el filtro. Muestra autor público, categoría, foto autorizada y mascota activa vinculada cuando exista. Hay estados claros de carga, vacío, error y reintento, también si falla una foto.
  - **Verificar:** `pnpm --filter mobile lint`, `pnpm --filter mobile exec tsc --noEmit` y recorrido en móvil con dos categorías, publicación comunitaria, páginas siguientes, red fallida y cuenta sin mascota.
  - **Archivos previstos:** `apps/mobile/app/(tabs)/index.tsx`, componente de tarjeta en `apps/mobile/components/`, consulta de publicaciones en `apps/mobile/hooks/`, tipos de respuesta en `apps/mobile/types/`.

- [ ] **PU-T11. Crear y editar desde la app sin perder el formulario al fallar.** Depende de: PU-T06–PU-T09. Cubre FE-03–FE-04, FE-07–FE-09 y FE-12.
  - **Aceptación:** formularios de Inicio y comunidad piden título, descripción y categoría; foto y mascota son opcionales. Permiten vista previa, añadir, cambiar o quitar la foto, así como cambiar o quitar la mascota al editar. Enseñan envío, éxito, error y reintento; conservan lo escrito ante fallas y evitan doble envío. Una imagen no admitida se convierte a formato aceptado o se explica cómo elegir otra. La foto comunitaria no queda en caché local.
  - **Verificar:** `pnpm --filter mobile lint`, `pnpm --filter mobile exec tsc --noEmit` y recorrido en Android y, si hay entorno, iOS: sin foto/mascota, con una foto, formato inválido, error de API y edición.
  - **Archivos previstos:** pantallas de crear/editar en `apps/mobile/app/`, formulario en `apps/mobile/components/`, lógica de solicitud en `apps/mobile/hooks/`, `apps/mobile/package.json` si hace falta selector o conversor de imágenes. Revisar dependencias antes de agregarlas.

- [ ] **PU-T12. Moderar y restaurar publicaciones comunitarias.** Depende de: PU-T03–PU-T05 y PU-T07. Cubre FE-05, FE-11 y FE-13; D-23 y D-25.
  - **Aceptación:** `ADMIN` o `MODERATOR` retira una publicación ajena de su comunidad mediante transacción que desactiva el post y registra moderador/fecha. Solo `ADMIN` consulta retiradas por moderación y restaura una; los contenidos retirados por autor nunca aparecen allí. No se puede moderar Inicio, otra comunidad ni editar contenido ajeno.
  - **Verificar:** pruebas de API con autor, miembro, moderador y administradores de dos comunidades; doble retirada, restauración, cambio de rol e intento de restaurar contenido retirado por autor; `pnpm --filter proyecto-backend test:e2e`.
  - **Archivos previstos:** `apps/backend/src/post/post.controller.ts`, `apps/backend/src/post/post.service.ts`, servicio comunitario de roles en `apps/backend/src/`, prueba en `apps/backend/test/`.

- [ ] **PU-T13. Mostrar moderación y restauración dentro de la comunidad.** Depende de: PU-T12 y tareas de navegación/membresía de `comunidades`. Cubre FE-11 y FE-13.
  - **Aceptación:** solo el administrador ve la pestaña de publicaciones retiradas por moderación de su comunidad y puede restaurarlas; el moderador puede retirarlas pero no restaurarlas. Se distinguen carga, lista vacía, error y reintento. La API sigue rechazando acciones sin permiso aunque no se muestre el botón.
  - **Verificar:** recorrido móvil con miembro, moderador y administrador de dos comunidades; retirada por autor, retirada por moderación y restauración; `pnpm --filter mobile lint` y `pnpm --filter mobile exec tsc --noEmit`.
  - **Archivos previstos:** `apps/mobile/app/(tabs)/comunidades.tsx`, pantalla comunitaria en `apps/mobile/app/`, componentes de moderación en `apps/mobile/components/`, consultas en `apps/mobile/hooks/`.

- [ ] **PU-T14. Comprobar el efecto de ocultar un post o desactivar una cuenta sobre comentarios y «Me gusta».** Depende de: PU-T04, PU-T09, PU-T12 y tareas correspondientes de `interacciones`. Cubre FE-05, D-26–D-28 y D-36.
  - **Aceptación:** los comentarios y «Me gusta» permanecen guardados, pero sus rutas no los entregan ni aceptan cambios mientras el post esté oculto o la cuenta de su autor esté desactivada. Solo cuando el post y la cuenta de su autor están activos vuelven a mostrarse las interacciones que también siguen activas, sin duplicarse. Los comentarios de una cuenta desactivada quedan ocultos y sus «Me gusta» dejan de contarse hasta que se reactive; la reactivación no vuelve a mostrar un comentario retirado individualmente. La foto y el detalle conservan la misma regla de acceso.
  - **Verificar:** pruebas directas de API con comentarios, likes, foto y detalle antes de retirar, mientras el post está oculto y tras restaurarlo; repetir con la cuenta del autor del post y la de un comentarista desactivadas y reactivadas; comprobar membresía y comentario desactivado individualmente. Registrar dependencia si `interacciones` aún no está implementado.
  - **Archivos previstos:** `apps/backend/src/comments/`, módulo de likes cuando exista, `apps/backend/src/post/post.service.ts`, prueba en `apps/backend/test/`.

- [ ] **PU-T15. Cerrar la verificación y actualizar la documentación.** Depende de: PU-T01–PU-T14. Cubre FE-01–FE-13.
  - **Aceptación:** cada criterio FE tiene evidencia de API y app según corresponda, incluidas fallas y permisos; se anota entorno y fecha. Los documentos distinguen rutas actuales de propuestas restantes y la ruta de desarrollo indica solo lo realmente integrado. Publicaciones no se marca «Verificada» si falta una dependencia de comunidades o interacciones.
  - **Verificar:** `pnpm --filter proyecto-backend test -- --runInBand`, `pnpm --filter proyecto-backend test:e2e`, `pnpm backend:build`, `pnpm --filter mobile lint`, `pnpm --filter mobile exec tsc --noEmit` y recorrido manual en dispositivo; revisar evidencia criterio por criterio.
  - **Archivos previstos:** `docs/ESPECIFICACIONES/02-PUBLICACIONES.md`, `docs/ESPECIFICACIONES/02-PUBLICACIONES/01-PLAN.md`, `docs/00-RUTA-DE-DESARROLLO.md`, `docs/04-DATOS-Y-PERMISOS.md`, `docs/05-API.md`.

## Regla para seguir

Esta lista ya fue aprobada conforme a [SDD](../../02-SDD.md). La aprobación de tareas **no** inicia el código: el usuario pidió completar la documentación del proyecto primero. Si durante una implementación futura aparecen datos reales, cambios de contrato o nuevas dependencias, actualizar primero ficha, plan y tarea afectada; después continuar con autorización del usuario.
