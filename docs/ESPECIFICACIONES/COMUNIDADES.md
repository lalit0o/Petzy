# Especificación: comunidades (`comunidades`)

**Contrato:** borrador, pendiente de revisión · **Código:** en implementación, API y pantalla inicial sin verificación integral · **Prioridad:** MVP, paso 6 · **Depende de:** `cuenta`, `publicaciones`. [Mapa](../../MAPA-CAPACIDADES.md).

## Objetivo

Las personas se agrupan por interés compartido sobre mascotas y encuentran en cada comunidad un espacio propio para conversar y organizar encuentros.

## Contrato de flujos

**Explorar y abrir comunidad (RF-C01, RF-C06; CO-03, CO-05–CO-06).** Actor: usuario autenticado con o sin mascota. Entrada: listado, búsqueda y ID de comunidad. Resultado: nombre, descripción, miembros y detalle con «Publicaciones» y «Eventos» separados. Estados: carga, vacío, error y reintento por sección. El campo de tema y la política de visibilidad aún están **pendientes**.

**Crear o unirse (RF-C02–C03; CO-01–CO-02, CO-06).** Actor: usuario autenticado. Para crear, entradas previstas: nombre, descripción, tema y foto opcional; la representación exacta de tema y foto sigue **pendiente**. Resultado: creador como primer `ADMIN` o membresía única `MEMBER` al unirse. Errores: datos inválidos, membresía ya existente o API fallida; mostrar estado junto a la acción. La salida del último administrador y el ingreso restringido siguen **pendientes**.

**Publicar y administrar (RF-C04–C05; CO-03–CO-05).** Actor: miembro para publicar según reglas aprobadas; roles autorizados para administrar. Precondición: comunidad y membresía vigentes. Entrada: publicación asociada a esta comunidad o acción administrativa. Resultado: mini-feed sin contenido de otra comunidad. El backend deniega a no miembros y comprueba rol para acciones de gestión. Las facultades de moderación y edición de roles siguen **pendientes**; no deducirlas de un botón visible.

Aplican especialmente RNF-S01, RNF-I02 y RNF-Q01–Q02 de [PROYECTO.md](../PROYECTO.md). Los detalles de eventos pertenecen a [eventos](COMUNIDADES-EVENTOS.md).

## Decisiones confirmadas

- Cualquier usuario autenticado puede crear una comunidad y se convierte en su primer miembro con rol `ADMIN`.
- El modelo ya distingue `ADMIN`, `MODERATOR` y `MEMBER`; una persona solo puede tener una membresía por comunidad.
- El detalle de comunidad tiene dos secciones: «Publicaciones» y «Eventos». La primera lista solo posts con el `communityId` de esa comunidad; la segunda lista sus eventos.
- Solo `ADMIN` y `MODERATOR` pueden crear eventos. El diseño detallado de tarjetas, detalle con mapa, datos y asistencia está en [COMUNIDADES-EVENTOS.md](COMUNIDADES-EVENTOS.md).

## Flujos esperados

1. Explorar y buscar comunidades muestra nombre, descripción, imagen y número de miembros.
2. Un usuario crea una comunidad o se une a una existente; la interfaz muestra su estado de membresía.
3. Al entrar ve «Publicaciones» y «Eventos» sin mezclar datos de otras comunidades. Los miembros pueden publicar en el mini-feed según los permisos acordados.
4. Los usuarios con rol adecuado ven la acción de crear evento; el servidor verifica el mismo rol.

El detalle debe tener estados de carga, vacío y error separados para publicaciones y eventos. La navegación entre ambas secciones conserva el contexto de la comunidad.

## Criterios de aceptación

| ID | Resultado comprobable |
| --- | --- |
| CO-01 | Crear comunidad crea también la membresía `ADMIN` del creador. |
| CO-02 | Unirse dos veces no duplica la membresía. |
| CO-03 | La sección «Publicaciones» solo muestra publicaciones de esta comunidad. La separación de eventos se verifica después en CE-02. |
| CO-04 | Una cuenta sin permiso no puede publicar ni administrar por invocar la API directamente. |
| CO-05 | El detalle informa el rol vigente del usuario en esta comunidad; las facultades para crear eventos se verifican en CE-01. |
| CO-06 | Una cuenta sin ficha de mascota puede explorar, crear y unirse a comunidades con las mismas reglas de sesión y membresía. |

## Estado del código y decisiones pendientes

Existen `Community` y `CommunityMember` en Prisma y `Post.communityId` opcional. Ya hay rutas para listar, crear, consultar, unirse y leer publicaciones de una comunidad; la pantalla móvil permite esas acciones y separa «Publicaciones»/«Eventos». No hay aún edición o salida de comunidad, gestión de roles, búsqueda por tema ni creación de posts desde esa pantalla. `POST /posts` aún debe comprobar membresía cuando recibe `communityId`.

Antes del plan deben definirse visibilidad pública o limitada a miembros, proceso de ingreso, salida o reemplazo del último `ADMIN`, facultades de moderación distintas de crear eventos, y si «tema» será campo propio o parte de descripción. Las reglas de lectura y asistencia de eventos se aclaran en su especificación.

Una persona registrada sin mascota propia puede explorar, crear o unirse a comunidades según D-12. `comunidades` proporciona membresía y rol; `eventos` consume ese contrato y verifica sus permisos en sus propios criterios de aceptación.

## Tecnología y estructura

Expo 57, React Native y Expo Router en `apps/mobile/app/(tabs)/comunidades.tsx` y `app/communities/[id].tsx`; NestJS 11 en `apps/backend/src/communities`; Prisma 7 con `Community` y `CommunityMember` en `apps/backend/prisma/schema.prisma`. El mini-feed consume el contrato de `publicaciones`; los eventos dependen de este módulo. Pruebas backend `*.spec.ts` y E2E en `apps/backend/test`.

## Comandos

Desde la raíz: `pnpm backend`, `pnpm mobile`, `pnpm backend:build`, `pnpm --filter proyecto-backend test -- --runInBand`, `pnpm --filter proyecto-backend test:e2e -- --runInBand` con entorno preparado y `pnpm --filter mobile lint`.

## Estilo de código

TypeScript, DTO para creación, clases `PascalCase`, propiedades `camelCase` y operación atómica de comunidad más membresía. La unicidad existente se expresa en Prisma:

```prisma
@@id([userId, communityId])
```

## Estrategia de pruebas

Unitarias para creación atómica y roles; E2E con `ADMIN`, `MODERATOR`, `MEMBER` y no miembro para permisos y separación de comunidades; recorrido móvil de exploración, alta, unión, carga independiente de secciones, error y reintento. La administración y búsqueda temática requieren pruebas propias tras cerrar su contrato.

La cobertura exigida para aprobar esta capacidad es evidencia de CO-01 a CO-06 para roles y separación de contenido; no se fija un porcentaje global de líneas.

## Límites de actuación

- **Siempre:** comprobar membresía y rol en API, evitar miembros duplicados, paginar listados que crezcan y conservar el contexto de comunidad.
- **Consultar antes:** visibilidad, ingreso, salida del último `ADMIN`, facultades de moderación y columna de tema/categoría con migración.
- **Nunca:** inferir permisos por un botón oculto ni tratar una propuesta de política como regla ya implementada.
