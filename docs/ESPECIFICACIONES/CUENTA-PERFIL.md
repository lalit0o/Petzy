# Especificación: cuenta (`cuenta`)

**Contrato:** borrador, pendiente de revisión · **Código:** registro e inicio iniciales, capacidad parcial sin verificación integral · **Prioridad:** MVP, paso 1 · **Dependencias:** ninguna. [Mapa](../../MAPA-CAPACIDADES.md).

## Objetivo

Una persona puede crear una cuenta, entrar, conservar o recuperar el acceso y salir con información clara sobre el resultado. Supabase Auth es la fuente de identidad y credenciales; `User.id` corresponde a esa identidad. Los datos visibles y editables pertenecen a [perfiles](PERFILES.md).

## Contrato de flujos

**Registrarse (RF-A01; CU-01, CU-05, CU-06).** Actor: visitante, con o sin mascota. Precondición: no necesita ficha `Pet`. Entradas: correo, nombre de usuario, contraseña y estado de residencia. Se validan formato y unicidad; Supabase Auth crea la identidad y la aplicación registra el perfil asociado. Resultado: cuenta creada y confirmación visible. Errores: datos inválidos, duplicados, API inaccesible o creación parcial entre Auth y perfil; la recuperación de ese último caso **está pendiente**. Mostrar envío y error sin revelar contraseña ni perder datos no sensibles.

**Entrar, conservar acceso y salir (RF-A02; CU-02, CU-03, CU-05).** Actor: persona registrada. Entradas: correo y contraseña al entrar; token validado para rutas privadas. Credenciales incorrectas no abren la app privada. Resultado: sesión utilizable o cierre que retira el acceso local. Errores: credenciales inválidas, API inaccesible y sesión vencida con respuesta visible. La política exacta de renovación/revalidación sigue **pendiente**; no inferirla del almacenamiento local del token.

**Recuperar acceso (RF-A03; CU-04, CU-05).** Actor: persona que no puede entrar. Entrada: correo. Resultado esperado: instrucción o confirmación sin revelar si el correo existe; Supabase Auth gestiona el cambio de contraseña. Errores: formato inválido, espera agotada o proveedor inaccesible, con reintento. El flujo de recuperación todavía no está implementado; sus pantallas y redirecciones exactas siguen **pendientes**.

En los tres flujos aplican RNF-S01–S03, RNF-I02 y RNF-Q02 de [PROYECTO.md](../PROYECTO.md). Los criterios CU son la prueba de cierre; esta descripción no cambia las decisiones abiertas.

## Alcance y criterios de éxito

| ID | Resultado verificable |
| --- | --- |
| CU-01 | El registro valida correo, nombre de usuario, contraseña y estado; impide duplicados y resuelve explícitamente una creación parcial entre Auth y `User`. |
| CU-02 | Credenciales correctas abren rutas privadas; credenciales incorrectas no las abren y no se registran secretos. |
| CU-03 | Cerrar sesión elimina el acceso local; al reabrir la app se comprueba la validez de la sesión antes de mostrar rutas privadas. |
| CU-04 | La recuperación no revela si el correo existe; el cambio de contraseña ocurre mediante Supabase Auth. |
| CU-05 | Cada formulario muestra espera, éxito, error y reintento; un fallo conserva los datos no sensibles escritos. |
| CU-06 | Una persona puede registrarse e iniciar sesión sin crear una ficha de mascota; el acceso posterior se rige por sesión y los permisos de cada módulo. |

Quedan fuera la edición de perfil, los campos públicos y la política de baja de cuenta. El modo de renovación de sesión y la recuperación de un registro parcial siguen abiertos.

## Tecnología y estructura

Expo 57, React Native, Expo Router y TypeScript en `apps/mobile/app/(auth)`, `context/AuthContext.tsx` y `hooks/useAuth.ts`; NestJS 11, Supabase Auth y Prisma 7 en `apps/backend/src/auth`, `src/user` y `prisma/schema.prisma`. El token se guarda con Expo SecureStore. Pruebas backend junto al código (`*.spec.ts`) y E2E en `apps/backend/test`.

## Comandos

Desde la raíz: desarrollo `pnpm backend` y `pnpm mobile`; compilación `pnpm backend:build`; unitarias `pnpm --filter proyecto-backend test -- --runInBand`; E2E, con entorno preparado, `pnpm --filter proyecto-backend test:e2e -- --runInBand`; revisión móvil `pnpm --filter mobile lint`. El repositorio no fija un umbral global de cobertura.

## Estilo de código

TypeScript, clases en `PascalCase`, funciones en `camelCase`, DTO para entradas y validación de servidor. Ejemplo del patrón existente para un recurso propio:

```ts
create(@Req() request: RequestWithUser, @Body() dto: CreatePostDto) {
  return this.postService.create(request.user.id, dto);
}
```

El ID propio procede del token validado; nunca del cuerpo de creación.

## Estrategia de pruebas

Pruebas de servicio/controlador para validación y credenciales incorrectas; E2E para guard y rutas públicas/privadas; recorrido móvil de registro, inicio, sesión vencida, recuperación, API inaccesible y reintento. CU-01 exige probar la falla entre Auth y perfil después de decidir su recuperación. Un botón no demuestra CU-03 ni CU-04.

La cobertura exigida para aprobar esta capacidad es evidencia de CU-01 a CU-06 y de sus permisos; no se fija un porcentaje global de líneas.

## Límites de actuación

- **Siempre:** validar entradas y token en servidor, proteger secretos, mostrar estados asíncronos y actualizar [API](../API.md) al cambiar contratos.
- **Consultar antes:** política de renovación, compensación de registro parcial, esquema, dependencias y cambios de contrato.
- **Nunca:** almacenar contraseñas en `User`, registrar credenciales o poner claves de servidor en `EXPO_PUBLIC_*`.

## Estado comprobado y preguntas abiertas

Existen `POST /auth/sign-up`, `POST /auth/sign-in`, guard global y cierre local. La recuperación no ejecuta un flujo; el controlador de inicio registra el DTO. Falta verificar el ciclo completo de sesión. Se debe acordar el tratamiento de registro parcial y sesión expirada antes de cerrar CU-01 y CU-03.

La participación sin mascota está confirmada en D-12 y no requiere una columna, rol ni pantalla de registro distinta.
