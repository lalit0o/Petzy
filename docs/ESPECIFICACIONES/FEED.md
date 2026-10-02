# Especificación: publicaciones (`publicaciones`)

**Contrato:** borrador, pendiente de revisión · **Código:** API parcial y pantalla sin carga funcional · **Prioridad:** MVP, paso 2 · **Depende de:** `cuenta`. [Mapa](../../MAPA-CAPACIDADES.md). Los comentarios y likes se especifican en [interacciones](INTERACCIONES.md).

## Objetivo

Los usuarios comparten fotos y texto, leen publicaciones recientes y reconocen el contexto general o comunitario de cada publicación. Este módulo proporciona la publicación y su visibilidad; [interacciones](INTERACCIONES.md) define comentarios y likes.

## Contrato de flujos

**Explorar Inicio (RF-F01, RF-F05; FE-01–FE-02, FE-05–FE-07).** Actor: usuario autenticado con o sin mascota. Precondición: sesión válida. Entrada: solicitud de listado y paginación; el contexto de Inicio es el feed general. Resultado: publicaciones activas recientes, detalle y autor público; las de comunidad quedan fuera de este listado y se consultan solo en su comunidad. Validaciones: filtrado de actividad y contexto en servidor, orden estable. Estados: carga, lista vacía, error de API y reintento.

**Publicar (RF-F02; FE-04, FE-07).** Actor: usuario autenticado. Entradas confirmadas: texto y foto opcional; el autor procede del token. Si el contexto es una comunidad, su membresía se verifica según [comunidades](COMUNIDADES.md). Resultado: publicación visible solo en el feed que corresponde. Errores: texto inválido según reglas aún **pendientes**, carga de foto fallida, falta de permiso o fallo de API; conservar el contenido y mostrar reintento. La relación opcional con `Pet` y el tratamiento de tipos de publicación siguen **pendientes**.

**Editar o desactivar (RF-F03; FE-03, FE-05).** Actor: autor. Precondición: publicación activa y propia. Entradas: cambios permitidos por el contrato aprobado, o solicitud de desactivación. Resultado: datos actualizados o retiro de consultas normales. El backend deniega operaciones de terceros. Los campos editables exactos y el cambio de contexto comunitario requieren revisión antes del plan.

Aplican especialmente RNF-S01, RNF-S04, RNF-I02 y RNF-Q01–Q02 de [PROYECTO.md](../PROYECTO.md). Comentarios y likes se especifican en [interacciones](INTERACCIONES.md).

## Decisiones confirmadas

- El feed principal contiene solo publicaciones activas con `communityId = null`.
- Las publicaciones de una comunidad aparecen solo dentro de esa comunidad, filtradas por su `communityId`; no aparecen en el feed principal.
- El autor se obtiene de la sesión. Solo el autor edita o desactiva su publicación, salvo una futura regla explícita de moderación.

## Flujos esperados

1. Inicio lista publicaciones recientes del feed principal, paginadas, con autor, fecha, contenido y foto si existe.
2. El usuario publica texto y foto opcional; el servidor asigna el autor y el contexto correcto.
3. En el detalle ve el contenido, autor y contexto; los comentarios y likes se añaden mediante `interacciones`.
4. El autor puede editar o desactivar su publicación. El contenido desactivado deja de aparecer en consultas normales.

La interfaz debe distinguir carga, feed vacío, error y reintento. Publicar debe mostrar envío, éxito o error sin perder el texto escrito.

## Criterios de aceptación

| ID | Resultado comprobable |
| --- | --- |
| FE-01 | Inicio no devuelve ni muestra publicaciones con `communityId` distinto de `null`. |
| FE-02 | La consulta de publicaciones acepta un contexto de comunidad y, cuando se solicita, devuelve solo publicaciones activas con ese `communityId`; `comunidades` integra después esta consulta en su pantalla. |
| FE-03 | Un usuario no puede editar o desactivar una publicación ajena. |
| FE-04 | El autor de una nueva publicación se obtiene del token y aparece en el feed correspondiente. |
| FE-05 | Una publicación inactiva o no visible no se entrega en consultas normales. |
| FE-06 | Listados paginados conservan orden estable y no repiten publicaciones al pedir más. |
| FE-07 | Una cuenta sin ficha de mascota puede leer y crear publicaciones; sigue sujeta a sesión y a permisos de comunidad cuando corresponda. |

## Estado del código y decisiones pendientes

`Post` existe y tiene endpoints de creación, lectura, edición y desactivación. `GET /posts` aún mezcla publicaciones generales y de comunidades. La pantalla Inicio todavía no ejecuta su carga de datos y construye `Bearer` sin espacio. Comentarios y likes se describen en [interacciones](INTERACCIONES.md).

Antes de añadir relaciones nuevas se debe decidir si una publicación puede asociarse opcionalmente a una mascota, quién puede leer o interactuar con publicaciones de comunidades según membresía, y las facultades de moderación. La foto de publicaciones necesitará una política de almacenamiento y acceso aprobada.

El contrato del feed no exige que el autor tenga una mascota registrada (D-12). La publicación dentro de una comunidad usa el contexto y permisos que proporciona `comunidades`; FE-02 puede probarse en API con datos de prueba antes de construir esa pantalla.

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

Unitarias del filtro y orden estable; E2E con dos cuentas y dos comunidades para separación, propiedad y desactivación; recorrido móvil para carga, vacío real, fallo de API, reintento y publicación fallida sin pérdida de texto. Verificar FE-01 en respuesta del servidor, no solo en pantalla.

La cobertura exigida para aprobar esta capacidad es evidencia de FE-01 a FE-07 en API y app según corresponda; no se fija un porcentaje global de líneas.

## Límites de actuación

- **Siempre:** derivar autor del token, filtrar `isActive` y contexto en servidor, paginar y actualizar consumidores al cambiar respuesta.
- **Consultar antes:** `petId`, política de visibilidad comunitaria, esquema, moderación, tipo de publicación y política de fotos.
- **Nunca:** mezclar publicaciones comunitarias en Inicio ni aceptar autor arbitrario del cliente.
