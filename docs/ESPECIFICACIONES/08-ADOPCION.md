# Especificación: adopción (`adopcion`)

**Contrato:** ficha funcional, [plan técnico](08-ADOPCION/01-PLAN.md) y [tareas AD-T01–AD-T18](08-ADOPCION/02-TAREAS.md) aprobados por el usuario el 10 de octubre de 2026 · **Código:** **Verificada para el alcance aprobado el 12-11-2026** — backend, migración y pantallas implementados el 10-11-2026, con E2E y recorrido del usuario en el teléfono con dos cuentas (evidencia en las [tareas](08-ADOPCION/02-TAREAS.md)) · **Prioridad:** MVP, paso 8 después de integrar `chat-privado` · **Depende de:** `cuenta`, `chat-privado`. [Mapa](../../MAPA-CAPACIDADES.md).

## Objetivo

Ayudar a personas registradas, tengan o no una mascota propia, a encontrar un hogar para animales mediante publicaciones de adopción y contacto directo con quien las publicó. El apartado se usa para adopciones, no para ventas. El alcance del MVP no incluye montos, cobros ni pagos.

D-89 confirma para Adopción **un animal por publicación**, **al menos una foto obligatoria** y el vínculo opcional con la ficha de ese mismo animal en «Mis mascotas». Se puede publicar sin haber creado ninguna ficha. D-95 precisa que esa ficha aporta nombre, especie, edad calculada, foto disponible y enlace, y que su desactivación no oculta el anuncio. D-19 conserva sus propias reglas para Inicio y comunidades.

**Ejemplo:** Ana publica una foto y descripción de un animal que busca hogar, aunque no tenga una ficha en «Mis mascotas». Luis pulsa «Contactar» y abre el chat con Ana. Cuando el animal encuentra hogar, Ana marca «Encontró hogar»; el anuncio sigue visible con ese estado, pero ya no ofrece «Contactar». Si se equivocó, puede devolverlo a «Busca hogar». Si Luis ve un anuncio que parece una venta, puede reportarlo: Petzy guarda el reporte, aunque el equipo no podrá revisarlo ni retirar el anuncio por ese reporte hasta que exista la web futura (D-91).

## Contrato de flujos

**Explorar adopciones (RF-AD01; AD-02, AD-05–AD-06).** Actor: persona autenticada con o sin mascota. Entrada: acceso al apartado, filtros y paginación. Resultado: publicaciones de adopción separadas del feed general y de comunidades. La vista conjunta muestra primero «Busca hogar» y luego «Encontró hogar»; también permite filtrar por cualquiera de los dos estados. Los retirados no aparecen en esa vista ni en esos filtros (D-90, D-93). Estados: carga, vacío, error y reintento.

**Publicar para encontrar hogar (RF-AD01, RF-AD04; AD-01–AD02, AD-05–AD08).** Actor: cualquier persona registrada. Entradas confirmadas: título y descripción obligatorios, de hasta 120 y 3 000 caracteres, y de una a tres fotos JPEG, PNG o WebP de hasta 5 MB cada una, todas del mismo animal; vínculo opcional con su ficha propia en «Mis mascotas» y confirmación de «Solo adopciones, no ventas». El autor viene del token. Resultado: publicación visible en adopción, sin precio ni cobro. Si existe una ficha propia activa enlazada, el anuncio muestra nombre, especie, edad calculada, foto disponible y acceso a su ficha; si la ficha se desactiva, el anuncio sigue sin ese complemento. Errores: texto vacío o demasiado largo, fotos inválidas, ficha ajena o inactiva, falta de confirmación, carga fallida o API inaccesible. Conservar el formulario y mostrar error junto a la acción. La confirmación no detecta por sí sola ventas encubiertas (D-95–D-96).

**Contactar al autor (RF-AD03; AD-04, CH-05).** Actor: persona interesada autenticada. Precondición: [chat privado](07-CHAT-PRIVADO.md) verificado y anuncio ajeno en estado «Busca hogar». Entrada: autor de la publicación; la conversación no recibe nombre propio. Resultado: abrir o crear chat uno a uno con esa persona sin duplicarlo. En un anuncio propio se muestran acciones para editar y cambiar el estado; en uno «Encontró hogar» no aparece «Contactar». La operación de contacto de Adopción rechaza ambos casos también desde la API. Un chat que ya existía sigue siendo un chat entre dos personas y conserva las reglas de Chat (D-91).

**Indicar que encontró hogar (RF-AD02; AD-03, AD-06).** Actor: autor autenticado. Precondición: publicación propia. Entrada: marcar «Encontró hogar» o, si se equivocó, volver a «Busca hogar». Resultado: el anuncio sigue visible y muestra el estado vigente; terceros no pueden cambiarlo (D-90). Errores: permiso denegado o API fallida, con confirmación solo tras éxito.

**Editar, retirar o restaurar un anuncio (RF-AD01–RF-AD02; AD-01, AD-03, AD-06, AD-08).** Actor: autor autenticado. Entrada: corregir título, descripción, fotos y ficha propia enlazada; elegir «Retirar anuncio» o restaurarlo desde «Mis anuncios retirados». Resultado: la edición conserva entre una y tres fotos; el retiro deja de mostrar el anuncio a otras personas y guarda sus datos sin borrarlos físicamente. Solo el autor ve sus anuncios retirados y puede restaurarlos. Al restaurarlo recupera el estado que tenía antes: «Busca hogar» o «Encontró hogar». Una cuenta ajena no puede editar, retirar, restaurar ni consultar por ID un anuncio retirado. Si falla una acción, el formulario conserva lo escrito y el anuncio mantiene su estado anterior hasta confirmar éxito (D-92–D-94).

**Reportar un anuncio (RF-AD04; AD-07).** Actor: persona con cuenta activa distinta del autor. Precondición: anuncio visible, ya sea «Busca hogar» o «Encontró hogar»; uno retirado no se puede reportar. Entrada: motivo obligatorio elegido entre «Parece una venta», «Información engañosa», «Contenido inapropiado» y «Otro»; explicación opcional de hasta 500 caracteres. Resultado: Petzy guarda un solo reporte de esa persona por anuncio y confirma «Reporte guardado». Si intenta reportarlo otra vez, indica «Ya lo reportaste» sin guardar otro. Si falla, explica el error y conserva lo escrito. El servidor comprueba autor, visibilidad y duplicados aunque la operación se llame directamente. El reporte y los datos del anuncio necesarios para entenderlo se conservan al menos hasta la futura revisión, incluso si después se edita o retira el anuncio. **Durante el MVP nadie del equipo puede consultar ni revisar esos reportes; tampoco puede retirar anuncios o suspender cuentas por esta vía.** La revisión se definirá con el dashboard web futuro (D-91, D-93–D-94, D-96–D-97).

Aplican especialmente RNF-S01, RNF-S04–S06, RNF-I02 y RNF-Q01–Q02 de [01-PROYECTO.md](../01-PROYECTO.md). La aportación veterinaria futura no participa en estos flujos.

## Límites para el plan

- Una publicación de adopción se crea dentro de su propio apartado y no aparece como publicación normal del feed general ni de una comunidad. D-98 aprobó tablas propias para el plan, separadas de `Post`.
- Las fotos corresponden al único animal que busca hogar. Se exigen entre una y tres; cada una admite JPEG, PNG o WebP hasta 5 MB. Se guardan de forma privada y se entregan después de comprobar sesión y visibilidad en cada solicitud (D-94).
- El botón de contacto usa el chat privado uno a uno existente y muestra a la persona autora, sin nombre personalizado de conversación.

Estos límites delimitan la ficha; la aprobación funcional no autoriza todavía esquema, rutas, diseño de pantalla ni código.

## Decisiones confirmadas

- Adopción forma parte del MVP y se integra **después** de que el chat privado uno a uno funcione (D-14).
- Cualquier persona registrada puede publicar mascotas en adopción; no necesita tener una ficha `Pet` propia (D-12, D-14).
- La publicación requiere título, descripción y foto, y pertenece a un apartado de adopción específico.
- Cada publicación presenta un solo animal y al menos una foto. Puede enlazar opcionalmente la ficha propia de ese animal, sin exigir que exista una ficha (D-89).
- La publicación admite hasta tres fotos. «Encontró hogar» permanece visible y solo el autor puede devolverla a «Busca hogar» (D-90).
- Quien publica indica cuando la mascota encontró hogar; se debe distinguir su estado de las publicaciones que aún buscan familia.
- La persona interesada puede contactar desde la publicación con su autor por chat privado; ese chat no tiene nombre propio.
- «Contactar» solo aparece en anuncios ajenos que indican «Busca hogar». El autor ve acciones propias para editar y cambiar el estado (D-91).
- La persona puede reportar un anuncio sospechoso; el MVP guarda el reporte, pero su revisión y las acciones administrativas pertenecen al dashboard web futuro (D-91).
- El autor puede editar título, descripción, fotos y ficha enlazada o retirar el anuncio con borrado lógico. Las fotos admiten JPEG, PNG o WebP de hasta 5 MB cada una (D-92).
- El autor consulta «Mis anuncios retirados» y puede restaurar uno. La vista conjunta de Adopción presenta primero «Busca hogar» y al final «Encontró hogar», con filtros separados. Un reporte exige motivo y acepta explicación opcional (D-93).
- Restaurar devuelve al anuncio su estado anterior. Reportar ofrece cuatro motivos concretos y las fotos solo se entregan a quien puede ver el anuncio, comprobando acceso en cada solicitud (D-94).
- La ficha enlazada aporta nombre, especie, edad calculada, foto y enlace mientras siga activa; el anuncio conserva sus propios datos si la ficha se desactiva. El formulario muestra «Solo adopciones, no ventas», no ofrece precio ni pago y pide confirmar esa regla (D-95).
- Título y descripción son obligatorios, con máximos de 120 y 3 000 caracteres. En el MVP no hay comentarios ni «Me gusta» en Adopción; solo contacto y reportes. Solo se reportan anuncios ajenos y visibles (D-96).
- Cada persona puede reportar una sola vez cada anuncio; un segundo intento muestra «Ya lo reportaste». La explicación opcional tiene máximo 500 caracteres. Cada reporte y los datos del anuncio necesarios para entenderlo se conservan al menos hasta su revisión en la futura web (D-97).
- No se permite usar adopción para vender mascotas. Una posible aportación para gastos veterinarios queda fuera del MVP y requiere una decisión futura separada (D-13).

## Flujos esperados

1. Una persona registrada abre Adopción: ve primero los anuncios «Busca hogar» y después los «Encontró hogar», o filtra para ver solo uno de esos estados.
2. Crea una publicación de un animal con título, descripción y al menos una foto; si tiene su ficha en «Mis mascotas», puede enlazarla. Lee y confirma «Solo adopciones, no ventas». La app muestra envío, éxito o error sin perder lo escrito si falla.
3. Al abrir un anuncio ajeno que indica «Busca hogar», la persona interesada puede contactar a quien publicó. La app abre la conversación existente o inicia una, una vez integrado `chat-privado`. Un anuncio propio muestra acciones de edición y estado; uno «Encontró hogar» no ofrece «Contactar».
4. El autor marca «Encontró hogar». El anuncio sigue visible con esa indicación; si fue un error, el autor vuelve a «Busca hogar». La interfaz confirma cada cambio exitoso.
5. Si falla la carga o una acción, se muestra el error junto a la acción y una forma de reintentar. El listado distingue carga, vacío y error.
6. Si alguien reporta un anuncio sospechoso, elige uno de cuatro motivos y, si quiere, añade una explicación de hasta 500 caracteres. Petzy confirma que guardó el reporte sin prometer revisión inmediata ni retiro durante el MVP. Si vuelve a reportar ese mismo anuncio, ve «Ya lo reportaste».
7. Si el autor retira su anuncio, deja de mostrarse y sus datos permanecen guardados. Puede verlo y restaurarlo desde «Mis anuncios retirados» con el mismo estado de búsqueda anterior; si corrige sus fotos, siempre deja entre una y tres válidas.

## Criterios de aceptación

| ID | Resultado comprobable |
| --- | --- |
| AD-01 | Una persona registrada puede publicar un solo animal que busca hogar con título y descripción obligatorios, de hasta 120 y 3 000 caracteres, y entre una y tres fotos JPEG, PNG o WebP de hasta 5 MB cada una, aunque no tenga ninguna ficha en «Mis mascotas». Si la tiene, puede enlazar opcionalmente la ficha propia y activa de ese animal; el servidor rechaza fichas ajenas o inactivas. Si se desactiva después, el anuncio sigue visible sin el complemento de nombre, especie, edad, foto y enlace de la ficha. Las fotos propias del anuncio se guardan privadas y se entregan solo tras comprobar sesión y acceso al anuncio. |
| AD-02 | Las publicaciones para encontrar hogar aparecen en Adopción y no se mezclan con Inicio ni con «Publicaciones» de una comunidad. La vista conjunta muestra primero «Busca hogar» y después «Encontró hogar», con filtros para cada estado; los retirados no aparecen. El servidor aplica separación, filtros y orden también al cargar más resultados. |
| AD-03 | Solo quien publicó puede cambiar el anuncio entre «Busca hogar» y «Encontró hogar». Otras cuentas no pueden hacerlo. El anuncio sigue visible en ambos estados y muestra cuál es el vigente. |
| AD-04 | «Contactar» abre o reutiliza el chat privado con el autor solo desde un anuncio ajeno que indica «Busca hogar». Un anuncio propio muestra acciones para editar y cambiar el estado; un anuncio «Encontró hogar» no muestra «Contactar». La API de contacto rechaza anuncios propios o cerrados, incluso si se la llama directamente. |
| AD-05 | El formulario y la publicación visible no piden ni muestran precio, costo o una forma de cobrar por la adopción. Antes de crear el anuncio, la persona ve «Solo adopciones, no ventas» y confirma que cumplirá esa regla. El servidor rechaza el envío si no hay confirmación, explica el motivo y conserva lo escrito. |
| AD-06 | Al crear o actualizar, Petzy muestra que está trabajando y confirma éxito o error. Si falla, mantiene lo escrito y permite reintentar; la lista distingue carga, ausencia de publicaciones y error. |
| AD-07 | Una persona con cuenta puede enviar un reporte sobre un anuncio ajeno y visible, esté «Busca hogar» o «Encontró hogar», con motivo obligatorio («Parece una venta», «Información engañosa», «Contenido inapropiado» u «Otro») y explicación opcional de hasta 500 caracteres. El servidor rechaza reportes sobre anuncios propios o retirados, incluso por API directa. Se admite un solo reporte por persona y anuncio: otro intento o un reintento de red no crea duplicados y muestra «Ya lo reportaste» si ya existía. Petzy confirma «Reporte guardado» solo tras éxito y conserva lo escrito si falla. El reporte y los datos del anuncio necesarios para entenderlo persisten al menos hasta la revisión futura, aunque el anuncio cambie o se retire. El MVP no ofrece al equipo consulta, revisión, retiro por reporte ni suspensión. La app no promete que el anuncio será retirado; esos procesos se especificarán con la futura web. |
| AD-08 | Solo el autor puede editar título, descripción, fotos y ficha enlazada, siempre con texto válido y una a tres fotos válidas. Puede retirar el anuncio sin borrar sus datos y restaurarlo desde la vista privada «Mis anuncios retirados», recuperando el estado anterior. Un anuncio retirado no aparece en listados públicos, no se abre desde otra cuenta por ID y no sirve para iniciar contacto; solo el autor puede abrir sus fotos privadas mientras esté retirado. Un fallo conserva los datos anteriores y muestra el error. |
| AD-09 | Los anuncios de Adopción no muestran ni admiten comentarios o «Me gusta» en el MVP. Las rutas de interacción de Publicaciones no aceptan IDs de anuncios de Adopción. Una persona puede usar «Contactar» o «Reportar» solo cuando cumple las reglas de cada acción. |

## Límites para la implementación futura

- D-98 aprobó tablas separadas de `Post` y copia de título, descripción, estado y referencias a fotos privadas en cada reporte. El [plan](08-ADOPCION/01-PLAN.md) detalla campos, relaciones, rutas y verificación; la [lista AD-T01–AD-T18](08-ADOPCION/02-TAREAS.md) también está aprobada. Nada de esto autoriza aún código.
- La política de conservación después de que el equipo revise cada reporte se decidirá con la web futura. «Adopción» ya está acordada como pestaña de la barra inferior (D-120/D-124); sus pantallas propuestas están en el [documento de interfaces](../06-DISENO-DE-INTERFACES.md).

## Tecnología y estructura

Expo 57, React Native y TypeScript en `apps/mobile/app`; NestJS 11 en `apps/backend/src`; Prisma 7 y PostgreSQL en `apps/backend/prisma`. El chat proveedor está especificado en [CHAT-PRIVADO.md](07-CHAT-PRIVADO.md). El [plan aprobado](08-ADOPCION/01-PLAN.md) propone pantallas, módulo, modelos, rutas y uso privado de Supabase Storage; nada de ello está implementado todavía.

## Comandos

Desde la raíz: `pnpm backend`, `pnpm mobile`, `pnpm backend:build`, `pnpm --filter proyecto-backend test --runInBand`, `pnpm --filter proyecto-backend test:e2e -- --runInBand` con entorno preparado y `pnpm --filter mobile lint`. No ejecutar migraciones hasta aprobar el esquema y el entorno.

## Estilo de código

TypeScript; DTO para escrituras, clases `PascalCase` y propiedades `camelCase`. La identidad de quien publica procede del token, siguiendo el patrón del backend:

```ts
const userId = request.user.id;
```

## Estrategia de pruebas

Pruebas unitarias de separación del listado y transiciones de estado; E2E con autor, interesado y tercero para permisos, contacto y ausencia de campos monetarios o interacciones; recorrido móvil para carga, vacío, error, reintento y conservación del formulario. La cobertura requerida es evidencia de AD-01 a AD-09, sin fijar un porcentaje global de líneas.

## Límites de actuación

- **Siempre:** obtener autor del token, validar entradas y fotos, aplicar permisos en servidor, paginar listados y usar el chat privado existente para el contacto.
- **Consultar antes:** esquema o migración, contratos de API, modelo de publicación, edición y retiro, datos del reporte, presentación de la ficha enlazada y política de imágenes.
- **Nunca:** permitir precio o cobro en el MVP, presentar mascotas como productos, aceptar un autor arbitrario del cliente o exponer conversaciones a terceros.
