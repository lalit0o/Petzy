# Especificación: adopción (`adopcion`)

**Contrato:** borrador, pendiente de revisión · **Código:** sin implementación específica · **Prioridad:** MVP, paso 8 después de integrar `chat-privado` · **Depende de:** `cuenta`, `chat-privado`. [Mapa](../../MAPA-CAPACIDADES.md).

## Objetivo

Ayudar a personas registradas, tengan o no una mascota propia, a encontrar un hogar para animales mediante publicaciones de adopción y contacto directo con quien las publicó. El apartado se usa para adopciones, no para ventas. El alcance del MVP no incluye montos, cobros ni pagos.

## Contrato de flujos

**Explorar adopciones (RF-AD01; AD-02, AD-05–AD-06).** Actor: persona autenticada con o sin mascota. Entrada: acceso al apartado y paginación. Resultado: publicaciones de adopción separadas del feed general y de comunidades; distinguir animales que aún buscan hogar. Estados: carga, vacío, error y reintento. La visibilidad de publicaciones cuyos animales encontraron hogar está **pendiente**.

**Publicar para encontrar hogar (RF-AD01, RF-AD04; AD-01–AD02, AD-05–AD07).** Actor: cualquier persona registrada. Entradas confirmadas: título, descripción y foto; el autor viene del token. Resultado: publicación visible en adopción, sin precio ni cobro. Errores: datos o foto inválidos conforme a límites **pendientes**, carga fallida, anuncio que incumpla reglas de venta aún **pendientes** o API inaccesible. Conservar el formulario y mostrar error junto a la acción.

**Contactar al autor (RF-AD03; AD-04, CH-05).** Actor: persona interesada autenticada. Precondición: [chat privado](CHAT-PRIVADO.md) verificado. Entrada: autor de la publicación; la conversación no recibe nombre propio. Resultado: abrir o crear chat uno a uno con esa persona sin duplicarlo. El comportamiento sobre publicación propia o cerrada está **pendiente**.

**Indicar que encontró hogar (RF-AD02; AD-03, AD-06).** Actor: autor autenticado. Precondición: publicación propia. Entrada: acción de cambio de estado. Resultado: indicación clara de que el animal encontró hogar; terceros no pueden cambiarla. Errores: permiso denegado o API fallida, con confirmación solo tras éxito. Texto exacto, reversión y visibilidad posterior están **pendientes**.

Aplican especialmente RNF-S01, RNF-S04–S06, RNF-I02 y RNF-Q01–Q02 de [PROYECTO.md](../PROYECTO.md). La aportación veterinaria futura no participa en estos flujos.

## Supuestos para revisar

- Una publicación de adopción se crea dentro de su propio apartado y no aparece como publicación normal del feed general ni de una comunidad. Falta decidir si reutiliza el modelo de publicación o necesita uno propio.
- La foto corresponde a la mascota que busca hogar. Falta definir límites de cantidad de mascotas por publicación y de imágenes.
- El botón de contacto usa el chat privado uno a uno existente y muestra a la persona autora, sin nombre personalizado de conversación.

Estos supuestos delimitan la ficha; no autorizan todavía esquema, rutas ni diseño de pantalla.

## Decisiones confirmadas

- Adopción forma parte del MVP y se integra **después** de que el chat privado uno a uno funcione (D-14).
- Cualquier persona registrada puede publicar mascotas en adopción; no necesita tener una ficha `Pet` propia (D-12, D-14).
- La publicación requiere título, descripción y foto, y pertenece a un apartado de adopción específico.
- Quien publica indica cuando la mascota encontró hogar; se debe distinguir su estado de las publicaciones que aún buscan familia.
- La persona interesada puede contactar desde la publicación con su autor por chat privado; ese chat no tiene nombre propio.
- No se permite usar adopción para vender mascotas. Una posible aportación para gastos veterinarios queda fuera del MVP y requiere una decisión futura separada (D-13).

## Flujos esperados

1. Una persona registrada abre el apartado de adopción y consulta publicaciones de mascotas que buscan hogar.
2. Crea una publicación con título, descripción y foto. La app muestra envío, éxito o error sin perder lo escrito si falla.
3. Al abrir una publicación, la persona interesada puede contactar a quien publicó. La app abre la conversación existente o inicia una, una vez integrado `chat-privado`.
4. El autor marca que la mascota encontró hogar. La interfaz confirma el cambio y muestra un estado comprensible.
5. Si falla la carga o una acción, se muestra el error junto a la acción y una forma de reintentar. El listado distingue carga, vacío y error.

## Criterios de aceptación

| ID | Resultado comprobable |
| --- | --- |
| AD-01 | Una cuenta registrada sin ficha de mascota puede crear una publicación de adopción con título, descripción y foto. |
| AD-02 | El apartado lista sus publicaciones separadas del feed general y de los mini-feeds comunitarios; la separación se cumple en el acceso a datos. |
| AD-03 | Solo el autor autenticado puede marcar que la mascota encontró hogar; el estado resultante se distingue del de las publicaciones que aún buscan familia. |
| AD-04 | Contactar desde una publicación abre el chat uno a uno con el autor correcto y reutiliza una conversación ya existente entre ambas personas. |
| AD-05 | La publicación del MVP no solicita ni muestra precio, costo o pago por adoptar. |
| AD-06 | Crear y actualizar informa espera, éxito y error; ante error conserva los datos del formulario y permite reintentar. El listado tiene estados de carga, vacío y error. |
| AD-07 | Se verifican las reglas aprobadas de moderación y prevención de anuncios de venta antes de habilitar el apartado para usuarios. |

## Preguntas abiertas antes del plan

- ¿Se permite una mascota o varias en la misma publicación? ¿Se permite más de una foto?
- ¿Qué nombre exacto llevará la acción y cómo se mostrarán las publicaciones cuyos animales ya encontraron hogar? ¿Puede el autor revertir el estado si hubo un error?
- ¿Qué edición, retiro, reporte y moderación se necesitan para impedir anuncios de venta y contenido engañoso? ¿Cómo se tramitan los reportes?
- ¿Qué ocurre al pulsar «Contactar» en una publicación propia o en una publicación ya cerrada? ¿Se conserva el historial de chats al cerrarla?
- ¿Qué datos visibles y límites de archivo se aplican a las fotos?
- ¿Se reutiliza `Post` con una separación verificable o se crea un modelo específico? Elegirlo después de revisar feed, permisos, consultas y migración. No añadir columnas por inferencia.

## Tecnología y estructura

Expo 57, React Native y TypeScript en `apps/mobile/app`; NestJS 11 en `apps/backend/src`; Prisma 7 y PostgreSQL en `apps/backend/prisma`. El chat proveedor está especificado en [CHAT-PRIVADO.md](CHAT-PRIVADO.md). La ubicación exacta de pantallas, módulo, modelo y rutas se decide en un plan posterior a la revisión de esta ficha. Para fotos, evaluar Supabase Storage y sus permisos antes de implementar.

## Comandos

Desde la raíz: `pnpm backend`, `pnpm mobile`, `pnpm backend:build`, `pnpm --filter proyecto-backend test -- --runInBand`, `pnpm --filter proyecto-backend test:e2e -- --runInBand` con entorno preparado y `pnpm --filter mobile lint`. No ejecutar migraciones hasta aprobar el esquema y el entorno.

## Estilo de código

TypeScript; DTO para escrituras, clases `PascalCase` y propiedades `camelCase`. La identidad de quien publica procede del token, siguiendo el patrón del backend:

```ts
const userId = request.user.id;
```

## Estrategia de pruebas

Pruebas unitarias de separación del listado y transiciones de estado; E2E con autor, interesado y tercero para permisos, contacto y ausencia de campos monetarios; recorrido móvil para carga, vacío, error, reintento y conservación del formulario. La cobertura requerida es evidencia de AD-01 a AD-07, sin fijar un porcentaje global de líneas.

## Límites de actuación

- **Siempre:** obtener autor del token, validar entradas y fotos, aplicar permisos en servidor, paginar listados y usar el chat privado existente para el contacto.
- **Consultar antes:** esquema o migración, contratos de API, modelo de publicación, estados exactos, moderación, reportes, tratamiento de varias mascotas y política de imágenes.
- **Nunca:** permitir precio o cobro en el MVP, presentar mascotas como productos, aceptar un autor arbitrario del cliente o exponer conversaciones a terceros.
