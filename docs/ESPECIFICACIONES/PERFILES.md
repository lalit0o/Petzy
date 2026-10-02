# Especificación: perfiles (`perfiles`)

**Contrato:** borrador, pendiente de revisión · **Código:** pantalla básica y rutas parciales · **Prioridad:** MVP, paso 3 · **Depende de:** `cuenta`. [Mapa](../../MAPA-CAPACIDADES.md).

## Objetivo

La persona reconoce y edita su perfil, encuentra a otros usuarios por nombre y consulta sus datos públicos sin revelar información privada. Este módulo proporciona el contrato de perfil que consumen `mascotas` y `chat-privado`. Un perfil puede existir sin fichas de mascota.

## Contrato de flujos

**Ver perfil propio o ajeno (RF-P01; PE-01, PE-03–PE-04).** Actor: usuario autenticado; no se requiere mascota. Entrada: identidad propia del token o ID del perfil consultado. Resultado: el dueño ve sus datos autorizados y terceros solo datos públicos. El correo y las credenciales quedan fuera de respuestas ajenas. Los campos públicos exactos están **pendientes**; la inclusión de mascotas activas se verifica con [mascotas](MASCOTAS.md). Estados: carga, perfil no encontrado, sesión vencida y reintento.

**Buscar usuarios (RF-P03; PE-02–PE-04).** Actor: usuario autenticado. Entrada: texto de nombre de usuario; la consulta se limita y pagina. Resultado: coincidencias con proyección de campos públicos, o vacío explícito. Errores: consulta inválida según límites **pendientes**, API inaccesible o sesión vencida; se permite reintentar sin exponer correos.

**Editar perfil propio (RF-P02; PE-01, PE-04).** Actor: propietario. Precondición: sesión válida. Entradas: nombre de usuario, avatar, biografía y estado conforme a campos aprobados; correo y contraseña usan el flujo de Auth. Resultado: cambios persistidos y confirmados. El servidor deniega edición ajena; ante validación o red fallida conserva el formulario. La política de baja y la sincronización de credenciales siguen **pendientes**.

Aplican especialmente RNF-S01, RNF-S05, RNF-I02 y RNF-Q01–Q02 de [PROYECTO.md](../PROYECTO.md).

## Alcance y criterios de éxito

| ID | Resultado verificable |
| --- | --- |
| PE-01 | Una cuenta ve y edita solo los campos propios aprobados; otra cuenta recibe denegación al intentar editarla por API. |
| PE-02 | La búsqueda por nombre de usuario limita y pagina resultados con solo campos públicos aprobados. |
| PE-03 | El perfil ajeno muestra solo los datos generales aprobados; nunca correo, credenciales, tokens ni campos privados. |
| PE-04 | Vista y búsqueda distinguen carga, vacío, error, sesión vencida y reintento; una edición fallida conserva el formulario. |

Recuperación y credenciales pertenecen a `cuenta`; las fichas de mascota, a `mascotas`. La integración que muestra mascotas activas en el perfil ajeno se verifica al completar `mascotas` (MA-06); no bloquea la aceptación del contrato básico de perfil. La baja de cuenta espera una decisión sobre sus efectos.

## Tecnología y estructura

Expo 57 y React Native en `apps/mobile/app/(tabs)/perfil.tsx`; sesión en `apps/mobile/context`; NestJS 11 en `apps/backend/src/user`; Prisma 7, `User` y relación con `Pet` en `apps/backend/prisma/schema.prisma`. Jest backend en `src/**/*.spec.ts` y E2E en `test/`.

## Comandos

Desde la raíz: `pnpm backend`, `pnpm mobile`, `pnpm backend:build`, `pnpm --filter proyecto-backend test -- --runInBand`, `pnpm --filter proyecto-backend test:e2e -- --runInBand` con entorno preparado y `pnpm --filter mobile lint`.

## Estilo de código

TypeScript, DTO de entrada separado del modelo Prisma, clases `PascalCase` y propiedades `camelCase`. Ejemplo de proyección explícita del estilo usado en consultas del repositorio:

```ts
select: { id: true, username: true, avatar: true }
```

Los campos públicos adicionales siguen pendientes de aprobación.

## Estrategia de pruebas

Unitarias para proyección y propiedad; E2E con dos cuentas para lectura y edición denegada; recorrido móvil de búsqueda vacía, fallo de API, reintento y teclado. Inspeccionar el JSON de PE-03: ocultar un campo en pantalla no basta.

La cobertura exigida para aprobar esta capacidad es evidencia de PE-01 a PE-04, incluidas respuestas públicas y denegaciones; no se fija un porcentaje global de líneas.

## Límites de actuación

- **Siempre:** derivar identidad propia del token, proyectar respuestas, paginar búsqueda y actualizar API y permisos al cambiar salidas.
- **Consultar antes:** campos públicos exactos, baja/reactivación y efecto en relaciones, esquema o rutas.
- **Nunca:** exponer correo de terceros ni editar por ID sin comprobar propiedad.

## Estado comprobado y preguntas abiertas

La pantalla es básica. `GET /user/search` devuelve registros completos; `GET /user/:id` responde texto de ejemplo; `PATCH /user/:id` no comprueba propiedad; el DTO de edición hereda `password`. Faltan campos públicos exactos, datos visibles de mascota y política de baja. PE-02 y PE-03 aún son requisitos, no comportamiento actual. La ausencia de mascotas no impide tener perfil ni participar (D-12).
