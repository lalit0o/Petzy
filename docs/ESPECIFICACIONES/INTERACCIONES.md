# Especificación: interacciones (`interacciones`)

**Contrato:** borrador, pendiente de revisión · **Código:** comentarios con API parcial y likes solo en el modelo · **Prioridad:** MVP, paso 5 · **Depende de:** `publicaciones`. [Mapa](../../MAPA-CAPACIDADES.md).

## Objetivo

Los usuarios conversan en publicaciones visibles mediante comentarios y expresan o retiran un like. El comportamiento es el mismo para publicaciones generales y comunitarias, sujeto a la visibilidad que defina [publicaciones](FEED.md).

## Contrato de flujos

**Leer comentarios (RF-F04; IN-01, IN-04).** Actor: usuario autenticado. Precondición: publicación activa y visible según [publicaciones](FEED.md). Entrada: ID de publicación y paginación. Resultado: comentarios activos en orden estable o estado vacío. Errores: publicación no visible, sesión vencida o API inaccesible; mostrar error y reintento.

**Crear, editar o desactivar comentario (RF-F04; IN-02, IN-04–IN-05).** Actor: usuario autenticado para crear; autor para cambiar su comentario. Entradas: texto del comentario o acción de desactivación. El servidor comprueba visibilidad de la publicación y propiedad del comentario. Resultado: comentario persistido/actualizado o retirado del listado activo. Errores: texto inválido según reglas aún **pendientes**, permiso denegado o red fallida; conservar texto no enviado y permitir reintento.

**Dar o quitar like (RF-F04; IN-03–IN-05).** Actor: usuario autenticado. Precondición: publicación visible. Entrada: ID de publicación y acción de reacción. Resultado: un solo like vigente por usuario y conteo coherente; repetir la acción no genera duplicados. Errores: recurso no visible, sesión vencida o API fallida con estado y reintento visibles. La moderación y el historial tras desactivar el post siguen **pendientes**.

Aplican especialmente RNF-S01, RNF-I02 y RNF-Q01–Q02 de [PROYECTO.md](../PROYECTO.md).

## Alcance y criterios de éxito

| ID | Resultado verificable |
| --- | --- |
| IN-01 | Un usuario autenticado ve comentarios activos de una publicación visible en orden estable y con paginación. |
| IN-02 | El autor de un comentario puede editarlo y desactivarlo; otra cuenta recibe denegación en la API. |
| IN-03 | Dar like dos veces no genera duplicados; quitarlo actualiza estado y conteo. |
| IN-04 | Una publicación inactiva o no visible no acepta comentarios ni likes y sus interacciones no se muestran como contenido activo. |
| IN-05 | Los controles muestran espera, éxito, error y reintento sin duplicar envíos ni perder texto tras un error. |

La moderación de contenido ajeno y el tratamiento histórico de interacciones tras desactivar una publicación quedan pendientes de decisión; no son permisos implícitos de `ADMIN` o `MODERATOR`.

## Tecnología y estructura

Expo 57 y React Native en el detalle de publicación que se construirá en `apps/mobile/app`; NestJS 11 en `apps/backend/src/comments` y un módulo de likes por definir; Prisma 7 con `Comment` y `PostLike` en `apps/backend/prisma/schema.prisma`. `PostLike` ya usa clave `(userId, postId)`. Pruebas backend `*.spec.ts` y E2E `apps/backend/test`.

## Comandos

Desde la raíz: `pnpm backend`, `pnpm mobile`, `pnpm backend:build`, `pnpm --filter proyecto-backend test -- --runInBand`, `pnpm --filter proyecto-backend test:e2e -- --runInBand` con entorno preparado y `pnpm --filter mobile lint`.

## Estilo de código

TypeScript, DTO validado, clases `PascalCase` y propiedades `camelCase`. La unicidad existente se expresa así en Prisma:

```prisma
@@id([userId, postId])
```

Las operaciones de reacción deben respetar esa clave, y el usuario se deriva del token.

## Estrategia de pruebas

Unitarias para guard de propietario y estado de publicación; E2E con dos cuentas para editar comentario ajeno, like repetido, quitar like y publicación no visible; recorrido móvil de envío fallido, reintento, carga de comentarios y conteos. Comprobar que un `catch` no oculte el error tras navegación o modal.

La cobertura exigida para aprobar esta capacidad es evidencia de IN-01 a IN-05, con casos permitidos, denegados y reintentos; no se fija un porcentaje global de líneas.

## Límites de actuación

- **Siempre:** comprobar visibilidad y autor en servidor, paginar comentarios y mantener conteos consistentes.
- **Consultar antes:** permiso de moderación, respuesta al desactivar publicaciones y contrato exacto de paginación o errores.
- **Nunca:** crear likes duplicados, aceptar `userId` del cliente ni mostrar interacción en contenido no visible.

## Estado comprobado y preguntas abiertas

Existen `POST/PATCH/DELETE /posts/:postId/comments`; falta lectura. El guard de propietario del comentario necesita corregir la validación de ID. `PostLike` existe sin endpoints ni interfaz. La visibilidad comunitaria y la moderación se definen antes de dar por terminados IN-01 e IN-04.
