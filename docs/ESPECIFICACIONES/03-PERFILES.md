# Especificación: perfiles (`perfiles`)

**Contrato:** ficha funcional, [plan técnico](03-PERFILES/01-PLAN.md) y [tareas](03-PERFILES/02-TAREAS.md) aprobados por el usuario el 9 de octubre de 2026 · **Código:** pantalla básica y rutas parciales · **Prioridad:** MVP, paso 3 · **Depende de:** `cuenta`. [Mapa](../../MAPA-CAPACIDADES.md).

## Objetivo

La persona reconoce y edita su perfil, encuentra a otros usuarios por nombre y consulta sus datos públicos sin revelar información privada. Este módulo proporciona el contrato de perfil que consumen `mascotas` y `chat-privado`. Un perfil puede existir sin fichas de mascota.

**Ejemplo:** Ana cambia su biografía y ve el cambio en su perfil. Luis busca a Ana por nombre de usuario y abre su perfil, pero no recibe su correo ni otros datos privados. Por D-35, Luis ve nombre de usuario, foto de perfil, biografía, estado de México y las mascotas activas de Ana; no recibe su correo.

## Contrato de flujos

**Ver perfil propio o ajeno (RF-P01; PE-01, PE-03–PE-04).** Actor: usuario autenticado; no se requiere mascota. Entrada: identidad propia del token o ID del perfil consultado. Resultado: el dueño ve sus datos autorizados y terceros solo datos públicos. El correo y las credenciales quedan fuera de respuestas ajenas. D-35 fija como campos públicos nombre de usuario, foto de perfil, biografía y estado de México; la inclusión de mascotas activas se verifica con [mascotas](04-MASCOTAS.md). El correo solo aparece en «Mi perfil» del dueño. Estados: carga, perfil no encontrado, sesión vencida y reintento.

**Buscar usuarios (RF-P03; PE-02–PE-04).** Actor: usuario autenticado. Entrada: de 2 a 50 caracteres del nombre de usuario; la consulta se pagina de 20 en 20 resultados y nunca devuelve más de 30 por solicitud (D-40). Resultado: coincidencias con nombre de usuario, foto de perfil, biografía y estado de México, sin correo, o vacío explícito. Errores: texto fuera de ese límite, API inaccesible o sesión vencida; se permite reintentar sin exponer correos.

**Editar perfil propio (RF-P02; PE-01, PE-04).** Actor: propietario. Precondición: sesión válida. Entradas: nombre de usuario de 3 a 30 caracteres, biografía opcional de hasta 300, estado de México y una foto opcional JPEG, PNG o WebP de hasta 5 MB (D-39–D-40). La foto se guarda de forma privada y se entrega solo a cuentas autorizadas; se puede cambiar o quitar. El correo se muestra solo al dueño y no se puede cambiar en esta primera versión (D-38); la contraseña se maneja mediante el flujo de Cuenta. Resultado: cambios persistidos y confirmados. El servidor deniega edición ajena; ante validación o red fallida conserva el formulario. La desactivación se describe por separado en D-36. La recuperación de contraseña pertenece a `cuenta`; el cambio futuro de correo requerirá su propio flujo de confirmación y sincronización con Auth.

**Desactivar o reactivar cuenta (RF-P04; PE-05–PE-07).** Actor: dueño de la cuenta. Para desactivar, la app confirma la acción y el servidor comprueba si es la única persona administradora de alguna comunidad. Si lo es, explica que primero debe nombrar a otro administrador y no desactiva la cuenta. Si puede continuar, `User.isActive` pasa a `false`: su perfil, mascotas, publicaciones y comentarios dejan de verse en consultas normales y por enlace directo; sus «Me gusta» dejan de contarse, pero todos esos registros permanecen guardados. Sus membresías y roles también permanecen guardados; mientras tanto no puede entrar en comunidades ni aparece o cuenta como miembro activo. La identidad de Supabase Auth no se borra. Una sesión antigua no permite acceder a contenido mientras la cuenta esté desactivada. Al volver a iniciar sesión con el mismo correo, la app ofrece reactivar; tras la confirmación, el servidor vuelve a comprobar correo y contraseña antes de cambiar `User.isActive` a `true` (D-41). La app solo conserva esas credenciales en memoria durante la confirmación. Reaparece el contenido que seguía activo por sí mismo; el contenido retirado individualmente permanece oculto. Recupera sus comunidades y roles anteriores (D-36, D-37). Estados: confirmación, espera, éxito, bloqueo por administrador único, error y reintento.

Aplican especialmente RNF-S01, RNF-S05, RNF-I02 y RNF-Q01–Q02 de [01-PROYECTO.md](../01-PROYECTO.md).

## Alcance y criterios de éxito

| ID | Resultado verificable |
| --- | --- |
| PE-01 | Una persona abre su perfil y cambia nombre de usuario (3–30 caracteres), biografía (hasta 300), estado o foto opcional JPEG/PNG/WebP (hasta 5 MB). Al guardar, ve los datos actualizados; puede quitar la biografía o la foto. Otra cuenta no puede modificar ese perfil, aunque envíe la solicitud directamente al servidor. |
| PE-02 | Al buscar por nombre de usuario con 2–50 caracteres, se muestran 20 coincidencias por página y nunca más de 30 por solicitud; se puede cargar más. Cada resultado incluye solo nombre de usuario, foto de perfil, biografía y estado de México; nunca correo. |
| PE-03 | Al abrir el perfil de otra persona se ven nombre de usuario, foto de perfil, biografía, estado de México y mascotas activas (D-35). No aparecen su correo, contraseña, datos de sesión ni otros campos privados, tampoco en la respuesta de la API. |
| PE-04 | La vista y la búsqueda indican si están cargando, si no hay resultados, si falló la conexión o si terminó la sesión. Ofrecen reintento; si falla una edición, el formulario conserva lo escrito. |
| PE-05 | Al desactivar su cuenta, una persona deja de aparecer en búsqueda y su perfil, mascotas activas, publicaciones y comentarios dejan de consultarse, también por ID o enlace directo. Sus «Me gusta» dejan de contarse sin borrar los registros. Un token anterior no da acceso a contenido. Si es la única administradora de una comunidad, la desactivación se rechaza y se le explica que debe nombrar a otra persona primero. |
| PE-06 | Una cuenta desactivada puede entrar con su mismo correo y confirmar su reactivación. El servidor vuelve a comprobar ese correo y contraseña antes de activar la cuenta; un token antiguo por sí solo no la reactiva. Después vuelven a verse solo sus datos y contenidos que seguían activos individualmente; las publicaciones, mascotas o comentarios retirados antes no reaparecen por la reactivación de la cuenta. |
| PE-07 | Mientras la cuenta está desactivada, sus membresías siguen guardadas, pero no puede entrar en comunidades ni aparece o cuenta como miembro activo. Al reactivarla, recupera las comunidades y roles que tenía. El servidor aplica esta regla aunque se use la API directamente. |

Recuperación y credenciales pertenecen a `cuenta`; las fichas de mascota, a `mascotas`. La integración que muestra mascotas activas en el perfil ajeno se verifica al completar `mascotas` (MA-06); no bloquea la aceptación del contrato básico de perfil. D-36 define la desactivación y reactivación voluntaria para esta primera versión; D-37 conserva membresías y roles sin contarlos durante esa desactivación. Las comunidades deben ofrecer el cambio de administrador requerido antes de desactivar a quien sea su único `ADMIN`. La suspensión administrativa de D-78 se aplaza por D-86 al futuro sistema web del equipo; no forma parte de los criterios ni bloquea la implementación del MVP de Perfiles.

## Tecnología y estructura

Expo 57 y React Native en `apps/mobile/app/(tabs)/perfil.tsx`; sesión en `apps/mobile/context`; NestJS 11 en `apps/backend/src/user`; Prisma 7, `User` y relación con `Pet` en `apps/backend/prisma/schema.prisma`. Jest backend en `src/**/*.spec.ts` y E2E en `test/`.

## Comandos

Desde la raíz: `pnpm backend`, `pnpm mobile`, `pnpm backend:build`, `pnpm --filter proyecto-backend test -- --runInBand`, `pnpm --filter proyecto-backend test:e2e -- --runInBand` con entorno preparado y `pnpm --filter mobile lint`.

## Estilo de código

TypeScript, DTO de entrada separado del modelo Prisma, clases `PascalCase` y propiedades `camelCase`. Ejemplo de proyección explícita del estilo usado en consultas del repositorio:

```ts
select: { id: true, username: true, bio: true, locatedAt: true }
```

Los datos públicos aprobados en D-35 son nombre de usuario, foto de perfil, biografía y estado de México; los datos de mascotas activas se detallan en su ficha. El campo interno `User.avatar` no se entrega tal cual si guarda una ruta privada: la API entrega una referencia a su propia ruta protegida para consultar la foto (D-39).

## Estrategia de pruebas

Unitarias para proyección, propiedad y filtros de cuenta activa; E2E con dos cuentas para lectura y edición denegada, desactivación, sesión antigua, bloqueo de administrador único y reactivación sin resucitar contenido retirado; recorrido móvil de búsqueda vacía, fallo de API, confirmación, reintento y teclado. Inspeccionar el JSON de PE-03: ocultar un campo en pantalla no basta.

La cobertura exigida para aprobar esta capacidad es evidencia de PE-01 a PE-07, incluidas respuestas públicas y denegaciones; no se fija un porcentaje global de líneas.

## Límites de actuación

- **Siempre:** derivar identidad propia del token, proyectar respuestas, paginar búsqueda y actualizar API y permisos al cambiar salidas.
- **Consultar antes:** datos concretos de mascota y cualquier cambio posterior a la regla D-36 de baja/reactivación, esquema o rutas.
- **Nunca:** exponer correo de terceros, aceptar `email` o `password` en la edición de perfil, ni editar por ID sin comprobar propiedad.

## Estado comprobado y preguntas abiertas

La pantalla es básica. `GET /user/search` devuelve registros completos; `GET /user/:id` responde texto de ejemplo; `PATCH /user/:id` no comprueba propiedad; el DTO de edición hereda `password`. D-35 fijó los campos públicos del usuario y la [ficha de Mascotas](04-MASCOTAS.md) precisa los datos de cada mascota. D-36 ya fija la desactivación y reactivación, aún sin implementar. PE-02 y PE-03 aún son requisitos, no comportamiento actual. La ausencia de mascotas no impide tener perfil ni participar (D-12).
