# Especificación: cuenta (`cuenta`)

**Contrato:** en implementación; ficha aprobada el 7 de octubre, [plan](01-CUENTA/01-PLAN.md) y [tareas](01-CUENTA/02-TAREAS.md) revisados el 8 de octubre de 2026; código autorizado el 19 de octubre de 2026 · **Código:** CU-T01–CU-T05 con pruebas locales; CU-T06–CU-T09 con código parcial y comprobación local, aún sin recorrido real en dispositivo y Supabase; capacidad sin verificación integral · **Prioridad:** MVP, paso 1 · **Dependencias:** ninguna. [Mapa](../../MAPA-CAPACIDADES.md).

## Objetivo

Una persona puede crear una cuenta, entrar, conservar o recuperar el acceso y salir con información clara sobre el resultado. Supabase Auth es la fuente de identidad y credenciales; `User.id` corresponde a esa identidad. Los datos visibles y editables pertenecen a [perfiles](03-PERFILES.md).

**En palabras concretas:** Supabase Auth gestiona lo necesario para entrar (correo, contraseña y confirmación del correo). Petzy guarda por separado los datos que muestra en la app, como nombre de usuario y estado de residencia. «Perfil incompleto» significa que la primera parte existe, pero esos datos de Petzy aún no se pudieron guardar. La persona usa la misma cuenta: no tiene que registrarse ni elegir una contraseña de nuevo.

## Contrato de flujos

**Registrarse (RF-A01; CU-01, CU-05, CU-06).** Actor: visitante, con o sin mascota. Precondición: no necesita ficha `Pet`. Entradas: correo, nombre de usuario, contraseña y estado de residencia. Se validan formato y unicidad; Supabase Auth crea la identidad y la aplicación registra el perfil asociado. Resultado: informar que debe confirmar el correo antes de entrar; el enlace abre la app y esta permite reenviarlo si no llega o vence (D-18). Errores: datos inválidos, duplicados, API inaccesible o creación parcial entre Auth y perfil. Si solo se creó la identidad, la persona confirma su correo, vuelve a entrar con esa cuenta y completa los datos obligatorios del perfil, sin registrar otra identidad. Hasta completar el perfil no accede al feed ni a las demás pantallas privadas de contenido (D-15). Mostrar envío y error sin revelar contraseña ni perder datos no sensibles.

**Ejemplo de registro interrumpido:** Ana envía el formulario. Supabase Auth guarda su correo y contraseña, pero Petzy no logra guardar `ana_mascotas` y su estado porque falla la conexión con la base de datos. Ana recibe la indicación de confirmar el correo. Cuando vuelve a entrar con ese mismo correo y contraseña, la app le pide nombre de usuario y estado; al guardarlos, abre el contenido. Si vuelve a fallar, conserva lo escrito y le permite reintentar. No se crea una segunda cuenta ni se le pide registrar una mascota.

**Entrar, conservar acceso y salir (RF-A02; CU-02, CU-03, CU-05).** Actor: persona registrada. Entradas: correo y contraseña al entrar; sesión validada para rutas privadas. Credenciales incorrectas o correo sin confirmar no abren las pantallas privadas; un perfil faltante lleva a completar el registro antes de mostrar contenido. Al reabrir la app o vencer el acceso, se comprueba la sesión y se intenta renovarla automáticamente (D-16). Si la renovación falla, se solicita entrar de nuevo con un mensaje visible. Resultado: sesión utilizable o cierre que retira el acceso local. Errores: credenciales inválidas, correo sin confirmar, API inaccesible y sesión vencida con respuesta visible. Guardar un token local por sí solo no acredita una sesión válida.

**Recuperar acceso (RF-A03; CU-04, CU-05).** Actor: persona que no puede entrar. Entrada: correo. Resultado esperado: instrucción o confirmación sin revelar si el correo existe; el enlace enviado por Supabase Auth abre la app móvil para completar el cambio de contraseña (D-17). Errores: formato inválido, espera agotada, proveedor inaccesible o enlace vencido; informar el resultado y permitir solicitar otro enlace cuando corresponda. El backend y las pantallas ya tienen código; el usuario configuró el retorno en Supabase, pero aún falta probar un correo y enlace reales en un build móvil.

En los tres flujos aplican RNF-S01–S03, RNF-I02 y RNF-Q02 de [01-PROYECTO.md](../01-PROYECTO.md). Los criterios CU son la prueba de cierre; esta descripción no cambia las decisiones abiertas.

## Decisiones confirmadas para esta capacidad

- **D-15:** un registro parcial se recupera al volver a entrar y completar el perfil de aplicación faltante antes de acceder al contenido.
- **D-16:** la app intenta renovar la sesión automáticamente; si no puede, solicita un nuevo inicio.
- **D-17:** el enlace de recuperación de contraseña abre la app móvil.
- **D-18:** confirmar el correo es requisito para entrar; el enlace abre la app y se puede reenviar si falta o vence.

## Alcance y criterios de éxito

| ID | Resultado verificable |
| --- | --- |
| CU-01 | Al enviar correo, contraseña, nombre de usuario y estado válidos, la persona ve que debe confirmar su correo. El enlace abre Petzy y puede solicitar otro si no llega o vence. Antes de confirmar, no ve el feed. Si se guardó la cuenta de acceso pero falló el guardado de los datos de Petzy, entra con el mismo correo después de confirmarlo y completa nombre de usuario y estado. Solo entonces accede al contenido. Repetir el proceso no crea otra cuenta. |
| CU-02 | Con correo confirmado, contraseña correcta y datos de Petzy completos, se abre el contenido. Una contraseña incorrecta o un correo sin confirmar muestran una explicación sin abrirlo. Si faltan los datos de Petzy, se abre el formulario para completarlos. Ninguna contraseña o dato de sesión aparece en registros del servidor. |
| CU-03 | Al cerrar sesión, el dispositivo deja de tener acceso. Al reabrir la app o vencer el permiso temporal, Petzy comprueba si puede renovarlo antes de mostrar contenido. Si puede, la persona continúa; si no, ve un mensaje y la pantalla de ingreso. |
| CU-04 | Tras pedir recuperar la contraseña, Petzy muestra el mismo mensaje exista o no una cuenta con ese correo. El enlace recibido abre la app para establecer una contraseña nueva; si venció, se ofrece pedir otro. |
| CU-05 | Al enviar cualquiera de los formularios, la persona ve que la acción está en curso y después ve éxito o un error junto a la acción. Si falla, puede reintentar sin volver a escribir correo, nombre de usuario o estado; la contraseña no se conserva indebidamente. |
| CU-06 | Una persona sin mascota puede crear su cuenta, entrar y usar las funciones permitidas para cualquier persona registrada. No aparece un paso obligatorio de «Registrar mascota». |

Quedan fuera la edición de perfil, los campos públicos y la desactivación/reactivación de cuenta, definida en [Perfiles](03-PERFILES.md) por D-35, D-36 y D-41. El futuro flujo de ingreso debe permitir únicamente la acción de reactivación a una identidad confirmada con perfil inactivo, sin darle acceso al resto del contenido antes de confirmar. Tras esa confirmación, el servidor vuelve a comprobar correo y contraseña antes de activarla; un token anterior por sí solo no basta. D-15 a D-18 fijan el comportamiento de registro y sesión; los contratos de API, manejo de sesión, enlaces profundos y permisos se detallan en el [plan de Cuenta](01-CUENTA/01-PLAN.md). El usuario autorizó empezar código el 19 de octubre de 2026; el avance de cada paso está en las [tareas](01-CUENTA/02-TAREAS.md).

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

Pruebas de servicio/controlador para validación, credenciales incorrectas y recuperación de registro parcial; E2E para guard, rutas públicas/privadas y denegación de completar el perfil de otra identidad; recorrido móvil de registro, confirmación de correo, reenvío, intento de acceso sin confirmar, inicio, renovación lograda y fallida, cierre, recuperación por enlace, enlace vencido, API inaccesible y reintento. CU-01 exige provocar la falla entre Auth y perfil y comprobar que se completa sin duplicar la identidad. Un botón no demuestra CU-03 ni CU-04.

La cobertura exigida para aprobar esta capacidad es evidencia de CU-01 a CU-06 y de sus permisos; no se fija un porcentaje global de líneas.

## Límites de actuación

- **Siempre:** validar entradas y token en servidor, proteger secretos, mostrar estados asíncronos y actualizar [API](../05-API.md) al cambiar contratos.
- **Consultar antes:** esquema, dependencias, nuevos contratos de API y cualquier cambio al comportamiento confirmado en D-15 a D-18.
- **Nunca:** almacenar contraseñas en `User`, registrar credenciales o poner claves de servidor en `EXPO_PUBLIC_*`.

## Estado comprobado y preguntas abiertas

Existen las ocho rutas de Cuenta descritas en [API](../05-API.md); el guard exige perfil activo y correo confirmado para contenido privado. El controlador ya no registra credenciales. La app comprueba y renueva la sesión al abrir, separa ingreso y registro, ofrece completar el perfil, reenviar confirmación y recuperar contraseña. Las 36 pruebas unitarias dirigidas, 3 pruebas HTTP con Auth y base simulados, el build backend, TypeScript móvil, lint sin errores y export iOS pasaron el 19-10-2026. Una prueba HTTP adicional con cuenta temporal comprobó ingreso, perfil incompleto, bloqueo de contenido, completado y renovación contra Supabase Auth y PostgreSQL reales; eliminó la identidad y el perfil al terminar. Esto no comprueba los correos ni la navegación móvil. El usuario configuró `mobile://auth/callback`, pero decidió aplazar la prueba de enlaces reales y pantallas en iPhone para continuar el desarrollo. Para esa prueba faltan una cuenta de Apple Developer y un correo autorizado para el SMTP predeterminado de Supabase. D-15 a D-18 y las tareas escritas no demuestran verificación integral.

La participación sin mascota está confirmada en D-12 y no requiere una columna, rol ni pantalla de registro distinta.
