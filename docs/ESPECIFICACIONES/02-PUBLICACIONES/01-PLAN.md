# Plan técnico: Publicaciones (`publicaciones`)

**Estado:** plan técnico y [tareas](02-TAREAS.md) aprobados por el usuario el 9 de octubre de 2026; la regla posterior D-36–D-37 sobre cuentas desactivadas se añadió como ajuste documental y se revisará con la ficha de Perfiles antes de programar. No se ha implementado código a partir de este plan. **Ficha funcional:** [02-PUBLICACIONES.md](../02-PUBLICACIONES.md), revisada el 8 de octubre de 2026. **Alcance:** FE-01–FE-13, D-19–D-26, D-29–D-34 y D-36–D-37. Las reglas de comentarios se detallan en [Interacciones](../05-INTERACCIONES.md) y las de roles en [Comunidades](../06-COMUNIDADES.md). El usuario pidió terminar la documentación antes de programar.

## Qué cambiaría para quien usa Petzy

- Al crear una publicación, escribe título y descripción, elige una categoría y decide si añade una foto y la ficha de una mascota propia. Puede publicarla sin foto ni mascota.
- En Inicio ve solo publicaciones generales y puede filtrar por categoría. Las de una comunidad solo las ven sus miembros, incluida su foto.
- Si una publicación se oculta, su foto, comentarios y «Me gusta» dejan de estar disponibles en las consultas normales. Si un administrador restaura una retirada por moderación, vuelven a aparecer los datos que continúen activos.
- El administrador ve únicamente publicaciones retiradas por moderación dentro de su comunidad. Las retiradas por sus autores no aparecen allí.

## Punto de partida

`Post` ya tiene `title`, `description`, `type`, `communityId?`, `photoUrl?` e `isActive`. `GET /post` mezcla Inicio y comunidades y no pagina; el DTO permite omitir categoría y cambiar comunidad al editar. No hay vínculo con mascota, carga de archivos ni pantalla de feed funcional. `Comment.isActive` y `PostLike` existen. No hay API de comunidades ni registro de quién retiró contenido. El estado de los datos en una base externa no se ha comprobado.

## Datos y migración propuestos

| Cambio | Forma y motivo | Datos existentes y módulos afectados |
| --- | --- | --- |
| Mascota vinculada | Añadir `Post.petId Int?`, relación con `Pet.id` e índice. `null` significa publicación sin mascota. El servidor acepta solo una mascota activa del autor. Al desactivarse la mascota, conserva `petId` pero no entrega sus datos ni el enlace en respuestas públicas. | Las publicaciones existentes reciben `null`, sin inventar vínculos. Afecta publicaciones, mascotas, API y app. D-30 aprobó esta columna y su migración; aún no se ha aplicado. |
| Quinta categoría | Añadir `HELP` a `PostType` para «Ayuda». Las cuatro categorías actuales mantienen su valor y las publicaciones existentes conservan su categoría. La API exige una selección explícita aunque el esquema conserve temporalmente `GENERAL` por compatibilidad. | Migración del enum; afecta publicaciones, filtros, tipos generados y app. D-21 aprobó la categoría, no se ha aplicado la migración. |
| Origen de retirada por moderación | Crear `ModerationRemoval`: `id` entero obligatorio generado; `postId Int?` o `commentId Int?` (exactamente uno presente); `moderatorId String` obligatorio; `removedAt DateTime` obligatorio con fecha actual; `restoredAt DateTime?` y `restoredById String?`, ambos vacíos hasta restaurar. Relaciones con `Post`, `Comment` y `User`, índice para cada recurso y restricción que impida dos retiradas de moderación abiertas del mismo recurso. `Post.isActive` y `Comment.isActive` siguen indicando si el contenido está visible. | Tabla nueva, sin columnas nuevas en `Post` o `Comment`. Las filas ya inactivas quedan ocultas y no aparecen como moderadas: su origen anterior es desconocido. Afecta moderación de publicaciones y comentarios, permisos y vista administrativa. D-31 aprobó esta tabla y el tratamiento inicial. |
| Foto | Mantener el único campo `Post.photoUrl String?`, pero guardar allí la **ruta interna** del objeto privado; no devolver esa ruta como URL pública. Las respuestas dan una ruta de la API para solicitar la foto si existe. | Antes de usar ese campo con otro significado, revisar valores reales de `photoUrl` en cada entorno. Migrar archivos anteriores a Storage privado y reemplazar el valor por su ruta interna; si un archivo no está disponible, dejarlo como caso pendiente de migración y no presentarlo como protegido. No borrar referencias o archivos existentes sin revisar el inventario. |

La migración se revisará antes de ejecutarla: confirmar copias de respaldo, conteos de publicaciones y comentarios, valores previos de `photoUrl` y posibilidad de revertir cada cambio. La tabla nueva comienza vacía; no se atribuirá una retirada antigua a un moderador sin evidencia. El cambio de enum y `petId` conserva registros existentes. Para `photoUrl`, la transición de datos y archivos se probará primero en una copia del entorno.

**Comprobación de `photoUrl` el 9 de octubre de 2026:** en este checkout no hay `.env` del backend ni `DATABASE_URL` de proceso; Docker no está iniciado y no hay PostgreSQL escuchando en los puertos locales 5432 o 5435. Las migraciones solo crean la columna; no se encontró un archivo de datos iniciales que inserte fotos en publicaciones. Esto **no demuestra por consulta** que alguna base esté vacía. Cuando exista una base conectada, comprobar en solo lectura el total de publicaciones, las que tienen `photoUrl` no nulo y las que tienen un valor no vacío, sin mostrar enlaces ni credenciales. Solo si los dos últimos conteos son cero se puede omitir la migración de fotos anteriores en ese entorno.

El usuario confirmó el 9 de octubre de 2026 que **todavía no hay datos reales**. Por ello no se planifica trasladar fotos de usuarios anteriores en esta etapa. La consulta sigue como comprobación previa a la futura migración de esquema, por si existe alguna base de pruebas o se crean registros antes de implementar las fotos privadas. No se afirma que se haya consultado una base de datos.

```sql
SELECT COUNT(*) AS total,
       COUNT("photoUrl") AS con_valor_no_nulo,
       COUNT(*) FILTER (WHERE NULLIF(BTRIM("photoUrl"), '') IS NOT NULL) AS con_ruta_no_vacia
FROM "Post";
```

## Fotos: carga, acceso y fallas

1. Usar un bucket **privado** de Supabase Storage para fotos de publicaciones. La app envía como máximo una imagen al backend junto con la creación o edición. NestJS valida sesión, autor, comunidad y archivo; solo el backend usa la clave de servidor para subir o retirar objetos. No exponer esa clave en `EXPO_PUBLIC_*`.
2. D-33 confirmó JPEG, PNG o WebP, hasta 5 MB por foto. El backend comprueba tamaño y tipo real del archivo, asigna un nombre aleatorio y rechaza contenido inválido antes de guardarlo. Configurar el bucket con los mismos límites. La app explica el error y conserva título, descripción y categoría. Si el selector del teléfono entrega otro formato, convertirlo a uno admitido antes de subirlo o explicar claramente que debe escoger otra imagen; verificar la conversión en Android e iOS antes de elegir la dependencia.
3. La foto se entrega desde `GET /posts/:id/photo`, que comprueba **en cada solicitud** sesión, `Post.isActive` y membresía si `communityId` existe. No devuelve URL pública ni enlace firmado reutilizable. La app solicita la imagen con el token y no la guarda como un enlace permanente compartible; para fotos comunitarias desactiva su caché local y el backend responde sin caché compartida. Esta comprobación continua es la decisión D-32.
4. Al sustituir una foto, subir el objeto nuevo, actualizar `Post.photoUrl` y luego retirar el anterior; si falla el guardado del post, retirar el objeto nuevo. Al quitar una foto, poner `photoUrl = null` y retirar el objeto anterior después del cambio. Registrar fallas de limpieza para reintento, sin dejar la publicación apuntando a una foto inexistente. Ocultar un post **no** borra su foto: la necesita si se restaura.
5. Como Storage y Postgres no comparten una transacción, probar fallas en cada punto y definir una limpieza de objetos huérfanos antes de habilitar cargas reales. No sobrescribir la misma ruta: cada reemplazo usa un nombre nuevo.

La documentación oficial de Supabase confirma que un bucket privado requiere descarga autorizada o enlace temporal, y que los límites de tipo y tamaño pueden configurarse por bucket: [buckets privados](https://supabase.com/docs/guides/storage/buckets/fundamentals), [descarga](https://supabase.com/docs/reference/javascript/file-buckets-download), [límites](https://supabase.com/docs/guides/storage/uploads/file-limits). Supabase recomienda rutas nuevas al reemplazar archivos para evitar contenido viejo en caché: [cargas estándar](https://supabase.com/docs/guides/storage/uploads/standard-uploads). La versión 57 de [Expo Image](https://docs.expo.dev/versions/v57.0.0/sdk/image/) permite enviar encabezados de autenticación y usar `cachePolicy: 'none'`.

## Permisos y restauración

- Centralizar la comprobación de publicación visible: activa, con autor de cuenta activa y, si pertenece a una comunidad, solicitante miembro vigente y activo (D-36–D-37). Aplicarla a lista, detalle, foto, comentarios y «Me gusta», incluso por ID directo. La categoría nunca concede acceso por sí misma.
- Autor: puede editar o retirar su publicación. La retirada propia cambia `isActive` a `false` y no crea `ModerationRemoval`. No puede cambiar autor o comunidad. Un título o descripción ausente o vacío se rechaza también al editar.
- Moderador o administrador: puede retirar contenido ajeno de su comunidad. En una transacción se verifica rol, comunidad y estado; se crea `ModerationRemoval` y se cambia `isActive` a `false`. No puede editar el contenido ajeno ni actuar sobre Inicio u otra comunidad.
- Administrador: lista solo filas de `ModerationRemoval` de su comunidad con `restoredAt = null` y contenido inactivo. Para restaurar, verifica rol actual, comunidad, estado y registro abierto; en una transacción marca `isActive = true`, `restoredAt` y `restoredById`. Una retirada propia no tiene registro abierto y no se puede restaurar por esta vía. Un moderador no puede restaurar.
- La misma tabla sirve para comentarios cuando se planifique `interacciones`; la restauración del comentario no lo hace visible si su publicación sigue inactiva. Nunca borrar comentarios o likes al ocultar la publicación. Mantener la unicidad ya existente de `PostLike`.

## API propuesta y compatibilidad

| Operación futura | Contrato principal |
| --- | --- |
| `GET /posts?cursor=&limit=&type=` | Solo Inicio (`communityId = null`), activo, orden `createdAt DESC, id DESC`; `type` opcional para «Todas». Respuesta paginada con autor público, categoría, mascota activa vinculada y referencia autorizada de foto. |
| `GET /communities/:id/posts?cursor=&limit=` | Solo miembros; publicaciones activas de esa comunidad. Reutiliza el mismo resumen, sin mezclarlas con Inicio. |
| `POST /posts` | Crea en Inicio con `communityId = null`. Título, descripción y categoría obligatorios; foto y `petId` opcionales. El autor se obtiene del token. Rechazar `communityId` enviado por el cliente en esta ruta. |
| `POST /communities/:id/posts` | Crea dentro de esa comunidad solo si el autor es miembro. El backend toma `communityId` de la ruta y comprueba la membresía; usa los mismos campos de contenido que `POST /posts`. |
| `GET /posts/:id`, `GET /posts/:id/photo` | Comprobar actividad y membresía antes de devolver texto o bytes. Las fotos no se entregan por URL pública de Storage. |
| `PATCH /posts/:id`, `DELETE /posts/:id` | Solo autor. Editar campos permitidos; `DELETE` desactiva lógicamente sin borrar comentarios, likes o foto. |
| `DELETE /communities/:id/posts/:postId` | `ADMIN` o `MODERATOR` retira una publicación ajena de esa comunidad y crea su registro `ModerationRemoval`. Separada de la retirada por el autor en `DELETE /posts/:id`. |
| `GET /communities/:id/moderation/posts` y `POST /communities/:id/moderation/posts/:postId/restore` | Solo `ADMIN` ve las retiradas por moderación de su comunidad y restaura una de ellas. No incluye retiradas propias. El contrato de comentarios usará la misma regla en `interacciones`. |

Las rutas actuales usan `/post` singular. Antes de reemplazarlas, revisar consumidores y pruebas; si alguno las usa, mantener compatibilidad durante la transición o migrarlo en el mismo cambio. No describir las rutas plurales como actuales en [05-API.md](../../05-API.md) hasta implementarlas. D-34 fija título de 1 a 120 caracteres y descripción de 1 a 3 000 después de quitar espacios sobrantes; app y API deben aplicar la misma regla. Para la paginación se propone 20 publicaciones por página y un máximo aceptado de 30; es un parámetro técnico, no cambia quién puede ver cada publicación.

## App y estados visibles

- Inicio: carga inicial, «Todas», filtros, más resultados, vacío real, error y reintento. Un cambio de filtro reinicia cursor y lista. Una foto con acceso denegado o carga fallida muestra un estado comprensible sin exponer Storage.
- Crear o editar: mostrar categoría seleccionada, mascota propia activa y vista previa de una foto; indicar subida y guardado, éxito, error y reintento. Conservar lo escrito al fallar. Evitar doble envío mientras una operación está en curso.
- Comunidad: mostrar publicaciones solo tras confirmar membresía. La pestaña administrativa de retiradas aparece solo a `ADMIN` y se recarga si cambia su rol. La API sigue siendo la autoridad aunque la app oculte un botón.
- Al construir pantallas, aplicar `apps/mobile/AGENTS.md`, `apple-design` y `async-feedback` en la versión vigente de Expo; la etapa actual solo diseña el comportamiento.

## Orden futuro y puntos de verificación

1. Inventariar datos existentes y consumidores de `/post` y `photoUrl`; aprobar la migración concreta y probarla en una copia. Verificar que publicaciones antiguas conservan categoría y que `petId` inicia vacío.
2. Introducir datos y permisos: enum Ayuda, `petId`, tabla de retiradas, índices/restricciones; probar dos cuentas y dos comunidades para impedir vínculos, lectura y moderación indebidos.
3. Separar API de Inicio y comunidad; lectura paginada y detalle con un único control de visibilidad. Probar acceso por enlace directo y filtros, no solo pantallas.
4. Integrar foto privada, carga y acceso por backend; probar reemplazo, retirada, errores de Storage, limpieza y revocación tras perder membresía u ocultar el post.
5. Crear y editar desde móvil; comprobar campos obligatorios, categorías, foto y mascota opcionales, errores y reintentos sin pérdida de texto.
6. Integrar moderación y restauración con `comunidades` e `interacciones`; verificar el origen de la retirada y que comentarios/likes conservados reaparecen correctamente.
7. Recorrer FE-01–FE-13 y actualizar ficha, API, datos y ruta de desarrollo con evidencia, fecha y entorno. Las pruebas aisladas de backend no acreditan la experiencia móvil completa.

## Comprobaciones antes de implementar

- D-33 y D-34 ya confirmaron formatos, tamaño de foto y límites de texto. Verificar la conversión de formatos del selector móvil y la forma exacta de contar caracteres con texto acentuado o emoji.
- Si antes de implementar aparecen datos de prueba con `photoUrl`, ejecutar la consulta anterior y decidir su tratamiento. Un enlace antiguo que siga siendo público no se vuelve privado por cambiar la API; habrá que retirar o restringir su origen antes de afirmar que cumple D-32.
- Contrastar las rutas comunitarias propuestas con la estructura final de `comunidades` antes de implementarlas, sin cambiar los permisos ya aprobados.

Las [tareas](02-TAREAS.md) se prepararon después de la aprobación de este plan y el usuario las aprobó el 9 de octubre de 2026. No hay autorización para implementar código en esta etapa.
