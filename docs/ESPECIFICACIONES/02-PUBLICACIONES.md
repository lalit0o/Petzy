# Especificación: publicaciones (`publicaciones`)

**Contrato:** ficha funcional revisada el 8 de octubre de 2026; [plan técnico aprobado](02-PUBLICACIONES/01-PLAN.md) y [tareas aprobadas](02-PUBLICACIONES/02-TAREAS.md) · **Código:** API parcial y pantalla sin carga funcional · **Prioridad:** MVP, paso 2 · **Depende de:** `cuenta`. [Mapa](../../MAPA-CAPACIDADES.md). Los comentarios y likes se especifican en [interacciones](05-INTERACCIONES.md).

## Objetivo

Los usuarios comparten fotos y texto, leen publicaciones recientes y reconocen el contexto general o comunitario de cada publicación. Este módulo proporciona la publicación y su visibilidad; [interacciones](05-INTERACCIONES.md) define comentarios y likes.

**Ejemplo:** Ana publica desde Inicio, elige «Consejo» y su contenido aparece tanto en «Todas» como en el filtro «Consejo». Puede vincular opcionalmente la ficha de Luna, una de sus mascotas, o publicar sin elegir ninguna. Si la vincula, la publicación muestra el nombre y la foto disponible de Luna como información adicional, y permite abrir su ficha. Si después desactiva la ficha de Luna, el consejo sigue publicado, pero ya no muestra ni enlaza a Luna. Si publica dentro de una comunidad, esa publicación aparece allí y no se mezcla con Inicio, aunque también tenga categoría «Consejo».

## Contrato de flujos

**Explorar Inicio y abrir publicaciones (RF-F01, RF-F05; FE-01–FE-02, FE-05–FE-07, FE-10).** Actor: usuario autenticado con o sin mascota. Precondición: sesión válida. Entrada: selección «Todas» o de una categoría y solicitud de listado paginado; el contexto de Inicio siempre excluye comunidades. Resultado: publicaciones activas recientes de cualquier categoría con «Todas», o únicamente de la categoría seleccionada; se muestran categoría, detalle y autor público. Al cambiar de filtro, la lista comienza de nuevo para ese filtro; al cargar más, se conserva el filtro elegido. Una publicación de una cuenta desactivada tampoco aparece ni se abre directamente, aunque `Post.isActive` siga en `true` (D-36). Una publicación de comunidad no aparece en Inicio y solo puede abrirla un miembro de esa comunidad, incluso mediante enlace directo (D-20, D-21). Validaciones: actividad, contexto, categoría y membresía en el servidor; orden estable. Estados: carga, lista vacía, filtro sin resultados, acceso denegado, error de API y reintento.

**Publicar (RF-F02; FE-04, FE-07–FE-09, FE-12).** Actor: usuario autenticado. Entradas confirmadas: título y descripción obligatorios, una de las cinco categorías aprobadas, una foto opcional como máximo y vínculo opcional con una de sus propias mascotas activas (D-19, D-21, D-24, D-29); el autor procede del token. El formulario muestra la categoría seleccionada antes de enviar. Si el contexto es una comunidad, su membresía se verifica según [comunidades](06-COMUNIDADES.md). Resultado: la publicación conserva la categoría escogida y aparece solo en el feed que corresponde. Si se vinculó una mascota, muestra como complemento su nombre, foto disponible y acceso a su ficha; la foto de esa ficha no ocupa el espacio de foto propia de la publicación. Si luego se desactiva la ficha, la publicación permanece sin mostrar ese complemento. Errores: categoría no admitida, intento de adjuntar varias fotos, título o descripción ausentes, vacíos o fuera de los límites de D-34, mascota ajena o inactiva, carga de foto fallida, falta de permiso o fallo de API; conservar el contenido y mostrar reintento.

**Editar, desactivar o restaurar (RF-F03, RF-C05; FE-03, FE-05, FE-11, FE-13).** Actor: autor para editar o desactivar su publicación; `ADMIN` o `MODERATOR` para desactivar lógicamente una publicación ajena de su propia comunidad; solo `ADMIN` para restaurar una retirada por moderación dentro de esa comunidad (D-23, D-25). El autor puede cambiar título, texto, foto, categoría o mascota vinculada; la foto y la mascota se pueden añadir, cambiar o quitar. Los cambios guardados se ven en lista y detalle; si cambia la categoría, la publicación aparece en el filtro nuevo y deja de aparecer en el anterior. La desactivación conserva el registro pero retira la publicación de consultas normales y de su enlace o ID público. La restauración devuelve la publicación moderada a esas consultas. La retirada por el propio autor queda fuera de la pestaña administrativa y de esta restauración. El servidor rechaza cambios de autor o `communityId`, mascotas ajenas o inactivas, edición por terceros y acciones de moderación o restauración sin el rol y comunidad correctos. Si falla el guardado, la app conserva los cambios escritos para reintentar.

Aplican especialmente RNF-S01, RNF-S04, RNF-I02 y RNF-Q01–Q02 de [01-PROYECTO.md](../01-PROYECTO.md). Comentarios y likes se especifican en [interacciones](05-INTERACCIONES.md).

## Decisiones confirmadas

- El feed principal contiene solo publicaciones activas con `communityId = null`.
- Las publicaciones de una comunidad aparecen solo dentro de esa comunidad, filtradas por su `communityId`; no aparecen en el feed principal.
- D-20: solo los miembros de la comunidad pueden leer sus publicaciones, tanto en el listado como en el detalle directo. Los eventos conservan su regla de visibilidad propia (D-09).
- El autor se obtiene de la sesión. Solo él edita su publicación; también puede desactivarla. D-23 permite que un `ADMIN` o `MODERATOR` desactive lógicamente una publicación ajena de su propia comunidad, sin editarla.
- D-19: quien publica puede vincular opcionalmente la ficha activa de una mascota propia; publicar sin mascota sigue permitido. La publicación muestra el nombre, foto disponible y acceso a la ficha como complemento. Si la ficha se desactiva, la publicación permanece sin mostrar ni enlazar a la mascota. Esta decisión no define el uso de fichas en Adopción.
- D-21: al publicar se puede escoger General, Ayuda, Consejo, Pregunta o Mascota perdida. En Inicio se puede ver «Todas» o filtrar por cualquiera de esas cinco categorías. «Ayuda» y «Pregunta» son distintas. El filtro no cambia el lugar ni los permisos de la publicación: `communityId` determina si pertenece a Inicio o a una comunidad.
- D-22: el autor puede editar título, texto, foto, categoría y mascota vinculada; puede quitar foto o vínculo. No puede cambiar el autor ni mover la publicación de Inicio a una comunidad o entre comunidades.
- D-23: administradores y moderadores pueden desactivar lógicamente publicaciones ajenas solo de su comunidad. La publicación se conserva en base, pero se oculta de lista y detalle; no pueden editarla.
- D-24: la foto propia de una publicación es opcional y se admite una como máximo. Se puede añadir, reemplazar o quitar al editar. La foto de una mascota vinculada es parte del complemento de su ficha y no se cuenta como foto de la publicación.
- D-25: solo el administrador de la comunidad ve una pestaña con publicaciones retiradas por moderación y puede restaurarlas. Las publicaciones retiradas por su autor no aparecen allí ni puede restaurarlas. En el esquema actual, `isActive = false` indica desactivación, sin distinguir su origen; resolverlo es trabajo de planificación, no una columna ya acordada.
- D-26: al desactivar una publicación, sus comentarios y «Me gusta» se conservan pero quedan ocultos y no se aceptan nuevos. Si se restaura una retirada por moderación, reaparecen sus interacciones anteriores; los comentarios que sus autores habían desactivado siguen ocultos. Los criterios detallados están en [interacciones](05-INTERACCIONES.md).
- D-29 y D-34: título y descripción son obligatorios para publicar tanto en Inicio como en una comunidad, y deben seguir presentes después de editar. Título: hasta 120 caracteres; descripción: hasta 3 000. La foto de la publicación y la mascota vinculada son opcionales.
- D-33: la foto opcional admite JPEG, PNG o WebP y pesa como máximo 5 MB.

**Guía de lectura de las categorías:** General es para contenido que no encaja mejor en otra opción; Ayuda sirve para pedir apoyo concreto; Consejo para compartir una recomendación; Pregunta para plantear una duda; Mascota perdida para avisar de un extravío. Estas descripciones orientan el formulario y no cambian los permisos ni crean un apartado de adopción.

## Flujos esperados

1. Inicio lista publicaciones recientes del feed principal, paginadas, con autor, fecha, categoría, contenido y foto si existe. «Todas» incluye todas sus categorías; seleccionar otra opción reduce la lista a esa categoría.
2. El usuario escribe título y descripción, escoge la categoría y, si quiere, añade una foto y una de sus fichas de mascota; el servidor exige ambos textos, asigna el autor, guarda la categoría, comprueba que la mascota le pertenece y conserva el contexto correcto.
3. En el detalle ve el contenido, autor y contexto; los comentarios y likes se añaden mediante `interacciones`.
4. El autor puede editar título, texto, foto, categoría y mascota vinculada, sin cambiar el lugar de publicación. También puede desactivarla; entonces deja de aparecer en consultas normales.

La interfaz debe distinguir carga, feed vacío, error y reintento. Publicar debe mostrar envío, éxito o error sin perder el texto escrito.

## Criterios de aceptación

| ID | Resultado comprobable |
| --- | --- |
| FE-01 | En Inicio aparecen únicamente publicaciones activas creadas fuera de una comunidad, sea cual sea su categoría. La API filtra por `communityId = null`; pedir el listado directamente tampoco mezcla publicaciones comunitarias. |
| FE-02 | Al abrir «Publicaciones» de una comunidad, un miembro ve solo publicaciones activas de ella. Una persona que no pertenece a la comunidad no recibe esa lista ni puede abrir el detalle de una publicación comunitaria mediante enlace o ID directo. El servidor comprueba membresía y `communityId`; la pantalla de Comunidades integrará esta consulta después. |
| FE-03 | Quien publicó puede editar título, texto, foto, categoría y mascota vinculada; puede añadir, cambiar o quitar foto y mascota. Los cambios persisten en lista y detalle, y un cambio de categoría se refleja en los filtros. La API rechaza cambios de autor o `communityId`, mascotas ajenas o inactivas y cualquier intento de edición hecho por otra cuenta. Desactivar una publicación ajena exige el permiso comunitario de FE-11. Si falla el guardado, la app conserva lo escrito para reintentar. |
| FE-04 | Al publicar en Inicio o en una comunidad, la app y la API exigen título y descripción. Si falta cualquiera o supera 120 caracteres en título o 3 000 en descripción, explican cuál debe corregirse y no crean la publicación; la app conserva lo escrito para corregirlo. También se exige que ambos sigan presentes después de editar. Foto y mascota vinculada son opcionales: se puede publicar sin ninguna. Petzy identifica al autor mediante la sesión, no mediante un dato escrito por la app. La publicación aparece en Inicio o en su comunidad, según dónde se creó. |
| FE-05 | Después de desactivar una publicación, sea por su autor o por moderación autorizada, deja de aparecer en listas y consultas normales aunque se conozca su ID; el registro permanece guardado. También se oculta una publicación individualmente activa si su autor desactivó la cuenta (D-36), y vuelve solo si la cuenta se reactiva y el post seguía activo. Una publicación comunitaria activa tampoco se entrega a una persona que no sea miembro. |
| FE-06 | Cuando se carga otra parte de la lista, las publicaciones mantienen el orden y ninguna se repite ni desaparece por la forma de pedir más resultados. |
| FE-07 | Una persona sin mascota registrada puede consultar y crear publicaciones. Para publicar dentro de una comunidad siguen aplicando sus reglas de membresía. |
| FE-08 | Al crear una publicación, una persona puede elegir una de sus propias mascotas activas o no elegir ninguna. Si otra cuenta intenta vincular una mascota ajena o alguien elige una ficha inactiva, el servidor rechaza la solicitud. Al volver a abrir la publicación, se ven el nombre, foto disponible y enlace a la ficha activa como información adicional. Si la ficha se desactiva después, la publicación permanece, pero ni la lista ni el detalle muestran o enlazan a esa mascota. |
| FE-09 | El formulario exige elegir entre las cinco categorías aprobadas y deja visible la selección antes de publicar; no asigna General de forma silenciosa. La publicación creada guarda esa categoría y la muestra al reabrirla; el servidor rechaza valores que no sean categorías admitidas. Una publicación no se convierte en comunitaria o de Inicio por su categoría: conserva el lugar desde el que se creó. |
| FE-10 | En Inicio, «Todas» devuelve publicaciones activas de todas las categorías con `communityId = null`. Cada filtro devuelve únicamente la categoría elegida, también al cargar más resultados. Cambiar de filtro reinicia la lista; si no hay resultados se explica. Ningún filtro devuelve publicaciones comunitarias. La API aplica ambos filtros, no solo la pantalla. |
| FE-11 | Un `ADMIN` o `MODERATOR` de una comunidad puede desactivar lógicamente una publicación ajena de esa misma comunidad, sin cambiar su contenido. La publicación deja de verse en lista y detalle normales y sigue guardada. Un `MEMBER`, un administrador de otra comunidad y cualquier moderador que intente afectar una publicación de Inicio reciben rechazo del servidor; el contenido permanece sin cambios. |
| FE-12 | Se puede crear una publicación sin foto o con una sola foto propia de la publicación. El autor puede añadirla, reemplazarla o quitarla al editar; lista y detalle muestran la elección guardada y nunca varias fotos propias del post. La API rechaza intentos de adjuntar más de una, formatos distintos de JPEG, PNG o WebP y archivos de más de 5 MB. Si se vincula una mascota con foto, esa imagen se muestra como parte de su ficha adicional y no cambia el límite de la publicación. |
| FE-13 | Solo `ADMIN` de la comunidad puede consultar la pestaña de publicaciones retiradas por moderación y restaurar una de ellas. Al restaurarla, vuelve a aparecer en la lista y el detalle normales solo para miembros de esa comunidad; sigue fuera de Inicio. Una publicación retirada por su autor no aparece en esa pestaña ni puede ser restaurada por el administrador. `MODERATOR`, `MEMBER` y administradores de otra comunidad reciben rechazo incluso si usan la API directamente. |

## Estado del código y decisiones pendientes

`Post` existe y tiene endpoints de creación, lectura, edición y desactivación. Su campo `type` admite `GENERAL`, `TIP`, `QUESTION` y `LOST_PET`; al omitirlo se guarda `GENERAL`. Todavía falta la quinta categoría, Ayuda. El DTO acepta una de las cuatro categorías actuales al crear; el DTO de edición hereda los campos de creación y hoy permite cambiar `communityId`, contrario a D-22. No existe selector móvil ni `GET /post` acepta un filtro por categoría. Esa ruta aún mezcla publicaciones generales y de comunidades. La pantalla Inicio es un marcador de posición y todavía no carga publicaciones. Comentarios y likes se describen en [interacciones](05-INTERACCIONES.md).

D-19 confirmó el vínculo opcional con una mascota propia y D-30 aprobó `Post.petId Int?` para el plan; el esquema actual aún no tiene esa relación. D-20 confirmó que solo miembros leen publicaciones comunitarias; el código actual aún no aplica ese permiso. D-21 confirmó selección y filtros por cinco categorías; falta agregar Ayuda al modelo; el plan propone `HELP`. D-23 confirmó la desactivación lógica por moderación comunitaria; la ruta actual de eliminación solo acepta al autor. D-24 confirmó el máximo de una foto opcional. D-25 confirmó la pestaña y restauración solo para administradores y solo de contenido retirado por moderación. D-31 aprobó para el plan una tabla separada `ModerationRemoval` para registrar la retirada por moderación y su restauración, sin otra columna en `Post` o `Comment`; aún no existe en el esquema. D-32 aprobó guardar las fotos en Storage privado y comprobar el permiso en el backend cada vez que se piden; D-33 fijó JPEG, PNG o WebP hasta 5 MB y D-34 los límites de texto. El [plan](02-PUBLICACIONES/01-PLAN.md) fue aprobado el 9 de octubre de 2026; las [tareas](02-PUBLICACIONES/02-TAREAS.md) fueron aprobadas el 9 de octubre de 2026.

El contrato del feed no exige que el autor tenga una mascota registrada (D-12). La publicación dentro de una comunidad usa el contexto y membresía que proporciona `comunidades`; FE-02 se prueba en la API con un miembro y un no miembro antes de construir esa pantalla. Los eventos de esa misma comunidad conservan su visibilidad distinta (D-09).

## Tecnología y estructura

Expo 57, React Native y TypeScript en `apps/mobile/app/(tabs)/index.tsx`; NestJS 11 en `apps/backend/src/post`; Prisma 7 y `Post` en `apps/backend/prisma/schema.prisma`. `comunidades` consume el contrato de consulta por `communityId`. Pruebas backend en `src/**/*.spec.ts` y E2E en `test/`.

## Comandos

Desde la raíz: `pnpm backend`, `pnpm mobile`, `pnpm backend:build`, `pnpm --filter proyecto-backend test -- --runInBand`, `pnpm --filter proyecto-backend test:e2e -- --runInBand` con entorno preparado y `pnpm --filter mobile lint`.

## Estilo de código

TypeScript, DTO para escrituras, `PascalCase` en clases y `camelCase` en propiedades. Ejemplo real de proyección limitada del autor:

```ts
include: { user: { select: { id: true, username: true, avatar: true } } }
```

## Estrategia de pruebas

Unitarias del filtro por contexto y categoría, orden y comprobación de membresía; E2E con dos cuentas, dos categorías y dos comunidades para separación, lectura permitida/denegada, detalle directo, propiedad, edición, desactivación y restauración. Incluir publicación retirada por el autor y otra por moderación; solo la segunda aparece en la pestaña administrativa y puede reactivarse por `ADMIN`. Verificar además intentos de cambiar `communityId`, publicar sin foto y con una, rechazar varias, reemplazar y quitar la foto, cambiar categoría y rechazar una mascota ajena o inactiva; comprobar que desactivar una ficha conserva la publicación pero retira sus datos de las respuestas. Recorrido móvil para selector, «Todas», cambio de filtro, carga de más resultados, foto opcional, complemento de mascota, edición, pestaña administrativa, vacío real, acceso denegado, fallo de API, reintento y guardado fallido sin pérdida de texto. Verificar FE-01, FE-02, FE-03, FE-08, FE-10, FE-12 y FE-13 en respuestas del servidor, no solo en pantalla.

La cobertura exigida para aprobar esta capacidad es evidencia de FE-01 a FE-13 en API y app según corresponda; no se fija un porcentaje global de líneas.

## Límites de actuación

- **Siempre:** derivar autor del token, filtrar `isActive` y contexto en servidor, comprobar membresía al leer publicaciones comunitarias, paginar y actualizar consumidores al cambiar respuesta.
- **Consultar antes:** cualquier cambio de esquema adicional o cambio en las reglas de foto, vínculo con mascota y moderación ya aprobadas. `petId`, `ModerationRemoval` y el acceso privado a fotos se revisaron con el usuario; la ficha, el plan y las tareas están aprobados. Implementarlos requiere la autorización expresa del usuario para comenzar código.
- **Nunca:** mezclar publicaciones comunitarias en Inicio ni aceptar autor arbitrario del cliente.
