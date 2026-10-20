# Plan técnico: Cuenta (`cuenta`)

**Estado:** plan y [tareas](02-TAREAS.md) revisados con el usuario el 8 de octubre de 2026; D-41 ajusta el enlace con la reactivación de Perfiles y se tendrá en cuenta al integrar ese flujo. Implementación autorizada el 19 de octubre de 2026; CU-T01–CU-T05 completadas con pruebas locales y CU-T06–CU-T07 iniciadas. La [ficha funcional](../01-CUENTA.md) fue aprobada el 7 de octubre de 2026. **Alcance:** CU-01–CU-06, D-15–D-18 y enlace con D-41. **Código:** compilado y probado de forma dirigida en entorno local el 19 de octubre de 2026; no se probó contra Supabase ni en dispositivo.

## Qué cambiaría para la persona que usa Petzy

1. Después de registrarse, verá una pantalla que le pide confirmar el correo. Si el mensaje no llega o el enlace vence, podrá solicitar otro.
2. Si Petzy no pudo guardar su nombre de usuario y estado después de crear el acceso con correo y contraseña, podrá entrar con esa misma cuenta y completar solo los datos faltantes. Mientras tanto no verá el feed ni otras pantallas de contenido.
3. Al volver a abrir la app, Petzy comprobará si la sesión sigue sirviendo y tratará de renovarla si venció. Si no puede, explicará que hay que entrar de nuevo.
4. El enlace de recuperación de contraseña abrirá la app. Si venció, se podrá pedir otro.

El usuario confirmó estos cuatro resultados el 8 de octubre de 2026. El diseño técnico mantiene la comunicación con Supabase Auth a través del servidor NestJS que Petzy ya usa. Los nombres de operaciones de las tablas siguientes sirven para implementar y probar esos resultados; no son decisiones adicionales sobre la experiencia. No se propone agregar datos nuevos a la base. Nada de esto afirma que las funciones ya estén disponibles.

## Punto de partida y fuente de verdad

- Supabase Auth conserva identidad, correo confirmado y credenciales. `User` en Postgres, mediante Prisma, conserva el perfil de aplicación con el mismo ID. No se propone columna ni migración de esquema para esta capacidad.
- NestJS tiene `POST /auth/sign-up` y `POST /auth/sign-in`; el segundo devuelve solo `access_token` y puede devolver `user: null`. `AuthController.signIn` registra el DTO completo, incluida la contraseña. El alta crea identidad antes de insertar `User`, de modo que una falla de Prisma deja registro parcial.
- El guard global comprueba la firma del JWT y su vencimiento, pero no exige que exista `User`. El cliente guarda solo el token de acceso en SecureStore y la navegación privada se abre con solo encontrar ese valor, sin validar sesión ni perfil.
- `expo-linking`, `expo-secure-store` y `expo-web-browser` ya están instalados. El esquema móvil actual es `mobile`; la configuración de redirección de Supabase y la apertura real de enlaces en builds deben comprobarse.

## Diseño técnico del plan

| Decisión | Propuesta y efecto | Alternativa relevante |
| --- | --- | --- |
| Responsable de sesión | Mantener la app consumiendo NestJS y a NestJS como intermediario de Supabase Auth. Devolver `access_token`, `refresh_token` y vencimiento al iniciar sesión; guardar ambos tokens en SecureStore; renovar mediante endpoint público de NestJS que llama a Auth con cliente aislado por solicitud. Se evita que el cliente reciba la clave de servidor. | Integrar `supabase-js` en móvil con clave publicable y persistencia segura; exige nuevo contrato y configuración cliente. |
| Acceso con perfil incompleto | Distinguir sesión válida de perfil completo. Permitir al token ver su estado y completar **solo su propio** `User`; bloquear las demás rutas privadas hasta que exista un perfil activo. | Dejar el bloqueo solo en la navegación, insuficiente porque los endpoints aceptan JWT sin perfil. |
| Correo y contraseña por enlace | Enlaces de confirmación y recuperación dirigidos a la app, con una ruta móvil de retorno que procesa el resultado de Auth. El token o código del enlace se consume una vez y se retira de la navegación; confirmar y recuperar son acciones distintas. | Abrir una página web intermedia, contraria a D-17 y D-18 salvo que sea necesaria para entregar el enlace a la app. |
| Reenvío y privacidad | Reenvío de confirmación con respuesta uniforme y control de frecuencia del proveedor. Recuperación con respuesta uniforme independientemente de que exista el correo. | Mensajes distintos por existencia de cuenta, que permitirían enumerar correos. |

Estas son **operaciones planificadas**, no rutas actuales. Su forma exacta y el manejo de la sesión se comprobarán al implementar; si una prueba exige cambiar el comportamiento acordado, se revisará el plan con el usuario antes de aplicar ese cambio. No se introduce un segundo camino de escritura a `User` desde la app.

## Contrato de API propuesto

| Operación | Entrada y salida previstas | Acceso y errores |
| --- | --- | --- |
| `POST /auth/sign-up` (modificar) | Conserva correo, usuario, contraseña y estado; devuelve `confirmation_required` sin sesión privada. Configura la URL de retorno a Petzy. | Pública. Validación 400; conflicto de usuario 409; falla parcial con mensaje para confirmar correo y completar al entrar, sin crear otra identidad. No exponer si Auth devolvió una identidad ajena. |
| `POST /auth/sign-in` (modificar) | Correo y contraseña → tokens, vencimiento y `profileStatus: complete | incomplete | inactive`, con perfil solo si existe. | Pública. Correo sin confirmar o credenciales inválidas no dan acceso. No registrar cuerpo ni tokens. |
| `POST /auth/refresh` (nueva) | Refresh token → tokens rotados y vencimiento. | Pública por necesidad del flujo, pero valida el refresh token con Supabase Auth; no acepta ID de usuario aportado por el cliente. Respuesta 401 si no puede renovarse. |
| `GET /auth/me` (nueva) | Access token → identidad y estado del perfil, con datos mínimos del perfil propio si existe. | JWT válido; funciona también para identidad sin `User`. Si el perfil está inactivo, informa ese estado sin dar acceso a contenido; el flujo de reactivación pertenece a Perfiles (D-36). |
| `PUT /auth/profile-completion` (nueva) | Access token y datos obligatorios `username`, `locatedAt` → perfil propio completo. | JWT válido y correo confirmado; el ID y correo se obtienen de Auth, no del cuerpo. Inserción idempotente; 409 si el nombre ya pertenece a otra cuenta. No modifica un perfil ya completo. |
| `POST /auth/resend-confirmation` (nueva) | Correo → mensaje uniforme de revisión del buzón. | Pública; límites de frecuencia y respuesta del proveedor, sin exponer si existe la cuenta. |
| `POST /auth/password-reset-request` (nueva) | Correo → mensaje uniforme. | Pública; URL de retorno a la app y límites de frecuencia. |
| `POST /auth/password-update` (nueva) | Contraseña nueva y sesión obtenida del enlace de recuperación → confirmación de cambio; NestJS llama a Supabase Auth con un cliente aislado para esa sesión. | Token válido del enlace; no guardar ni registrar contraseña. El enlace vencido ofrece solicitar otro. La autorización exacta se comprueba con Supabase Auth y pruebas, no con datos del cuerpo. |

El plan **no propone** un endpoint de cierre de sesión: el cierre elimina los tokens locales. Si se requiere revocación de sesiones en todos los dispositivos, eso sería una decisión funcional adicional. El formato final de errores y la compatibilidad con la respuesta actual de `sign-in` se documentarán en [05-API.md](../../05-API.md) al implementar.

## Datos, permisos y recuperación parcial

1. El alta comprueba formatos y unicidad de `username` en Postgres. La restricción única de la base resuelve carreras; el servicio transforma esa colisión en 409. El correo se comprueba también mediante Auth, sin asumir que la tabla `User` enumera todas las identidades existentes.
2. Si Auth crea identidad y falla `User`, conservar la identidad. La pantalla informa que debe confirmar el correo. Tras confirmar e iniciar sesión, `profileStatus: incomplete` conduce al formulario de completar perfil. Este pide nombre de usuario y estado; el correo procede de la identidad confirmada. Reintentos no duplican `User` ni sobrescriben un perfil completo.
3. El guard de JWT mantiene una excepción estrecha para `GET /auth/me` y `PUT /auth/profile-completion`; las demás rutas de contenido exigen perfil completo y activo en servidor. D-41 sustituyó la idea anterior de reactivar con un token antiguo: la [propuesta de Perfiles](../03-PERFILES/01-PLAN.md) usa una operación pública de Auth que vuelve a validar correo y contraseña después de la confirmación. Esa operación no abre contenido hasta reactivar la cuenta. Confirmar cómo se identifican correctamente las rutas públicas y las excepciones del guard para evitar un desvío por anotación accidental.
4. El backend no devuelve campos privados en `GET /auth/me` salvo los propios necesarios. Ningún endpoint de completar perfil admite `id`, `ownerId` ni `email` en el cuerpo.
5. No se requieren nuevas columnas, valores iniciales para filas existentes ni migración de Prisma. Los usuarios ya completos conservan su fila. Antes de cambiar el guard, revisar endpoints existentes que usen JWT y definir el resultado para identidades sin perfil.

## Navegación y experiencia móvil

- Al iniciar la app: estado `comprobando sesión`; cargar tokens seguros, intentar renovar si el acceso venció, consultar `GET /auth/me` y decidir entre autenticación, completar perfil o contenido. No renderizar rutas privadas durante esa decisión. Ante API inaccesible, mostrar error y «Reintentar» sin asumir que la sesión dejó de existir.
- Registro: formulario existente → confirmación de envío → pantalla de espera de correo con «Reenviar correo» y opción de volver a entrar. Al abrir enlace de confirmación, comprobar el resultado y continuar al ingreso o completar perfil según corresponda.
- Inicio: diferenciar credenciales incorrectas, correo pendiente de confirmar y perfil incompleto. Para correo pendiente ofrecer reenvío; para perfil incompleto abrir el formulario correspondiente. Deshabilitar solo el envío mientras está en curso y conservar datos no sensibles ante error.
- Recuperación: pedir correo, dar respuesta uniforme, abrir el enlace en la app y establecer la sesión de recuperación antes de mostrar el formulario de contraseña nueva; ante enlace inválido o vencido ofrecer solicitar otro. Nunca mostrar la contraseña en logs, URL, errores o estado persistido. Comprobar en el entorno real el formato del enlace y procesar sus datos de sesión sin dejarlos en el historial de navegación.
- Renovación: un único intento coordinado ante vencimiento para no competir con otros requests; guardar tokens rotados antes de seguir. Si Auth rechaza la renovación, borrar sesión local y pedir entrada de nuevo. Cierre local retira ambos tokens y el perfil en memoria.
- El diseño de estas pantallas se revisará al implementar según `apps/mobile/AGENTS.md`, `apple-design` y `async-feedback`. Incluir espera, éxito, error, reintento, teclado, accesibilidad y tamaño de texto; no asumir que la ficha transversal de diseño ya fue aprobada.

## Orden de implementación y puntos de verificación

1. **Seguridad inmediata:** retirar el log del DTO de inicio; probar que ningún error o log contiene credenciales. Revisar el guard y los contratos actuales. Este arreglo es independiente del resto del plan.
2. **Identidad y perfil:** manejar registro parcial, estados de cuenta y completar perfil propio en backend. Comprobar con dos identidades que no se pueda completar ni leer un perfil ajeno, y que otras rutas rechacen perfil incompleto.
3. **Sesión:** devolver tokens y vencimiento, implementar renovación aislada y ajustar almacenamiento/navegación móvil. Probar renovación exitosa, token revocado, reapertura de app y API inaccesible.
4. **Enlaces:** configurar URLs permitidas en Supabase y esquema de app, implementar reenvío, confirmación y recuperación. Verificar en build de Android y, si está disponible, iOS; Expo Go no sustituye esa prueba. Probar enlace válido, repetido, vencido y apertura sin app.
5. **Cierre integrado:** recorrer CU-01–CU-06 sin mascota y con fallas inyectadas entre Auth y Prisma. Actualizar `05-API.md`, `04-DATOS-Y-PERMISOS.md`, ficha e inventario de la ruta con prueba, fecha y entorno.

Los pasos 2 y 3 comparten contrato de sesión y guard y se integran secuencialmente. El diseño de pantallas y la configuración de enlaces pueden prepararse en paralelo después de acordar ese contrato. No declarar Cuenta verificada por unitarias aisladas.

## Riesgos y comprobaciones

| Riesgo | Comprobación / respuesta |
| --- | --- |
| Cliente Supabase compartido en NestJS conserva estado de sesión de otra solicitud | Usar cliente aislado o llamada Auth sin sesión compartida para operaciones de cada usuario; prueba concurrente con dos cuentas. |
| Auth crea una identidad pero Prisma falla; un reintento de registro encuentra correo ya existente | Guiar al inicio y completar perfil después de confirmar; prueba con falla Prisma inducida. |
| Refresh token rotado se pierde al cerrar la app durante el guardado | Almacenar y reemplazar tokens de forma coordinada; si se pierde, mostrar entrada de nuevo sin abrir contenido indebidamente. |
| Enlace profundo funciona en desarrollo pero no en build | Probar configuración de redirección permitida, enlace recibido en correo y apertura real en Android/iOS. |
| La nueva comprobación de perfil corta rutas válidas o deja otra sin protección | Inventario de controladores con pruebas de guard para usuario completo, incompleto, sin sesión e inactivo. |
| Mensajes de Auth revelan existencia de correo o datos internos | Normalizar respuestas públicas y cubrir con pruebas de solicitud para correo existente y ausente. |

## Referencias técnicas para validar durante implementación

- [Supabase Auth: reenvío de confirmación](https://supabase.com/docs/reference/javascript/auth-resend).
- [Supabase Auth: renovación de sesión](https://supabase.com/docs/reference/javascript/auth-refreshsession).
- [Supabase Auth: enlaces profundos móviles](https://supabase.com/docs/guides/auth/native-mobile-deep-linking).
- [Expo SDK 57: documentación versionada](https://docs.expo.dev/versions/v57.0.0/).

## Antes de implementar

Las [tareas](02-TAREAS.md) ya fueron revisadas, pero el usuario pidió terminar la documentación del proyecto antes de comenzar código. Durante la implementación futura, concretar el formato del enlace de Supabase configurado para este proyecto y comprobar que la sesión de recuperación permite actualizar la contraseña por la operación planificada. Si esa comprobación exige cambiar el comportamiento acordado o un contrato relevante, actualizar este plan y revisar el cambio antes de aplicarlo.
