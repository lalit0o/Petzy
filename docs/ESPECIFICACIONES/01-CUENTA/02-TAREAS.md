# Tareas propuestas: Cuenta (`cuenta`)

**Estado:** orden y alcance revisados por el usuario el 8 de octubre de 2026. El usuario autorizó comenzar el código el 19 de octubre de 2026. Las tareas derivan del [plan de Cuenta](01-PLAN.md); cada una se marca solo al comprobarla.

## Qué se hará, en orden

1. Evitar que el servidor registre contraseñas.
2. Permitir que alguien termine su registro con la misma cuenta si faltaron datos de Petzy.
3. Comprobar y renovar el acceso antes de mostrar contenido privado.
4. Abrir en la app los enlaces de confirmación y recuperación de contraseña.
5. Probar el recorrido completo, incluidos errores y cuentas sin mascota.

Cada tarea se cierra solo cuando pasa su comprobación. Los archivos indicados son los principales previstos; si una tarea requiere cambiar contratos o más archivos, actualizarla antes de ejecutarla. No añadir columnas de base de datos para Cuenta.

## Trabajo técnico y comprobación

- [x] **CU-T01. Retirar el registro de credenciales del inicio de sesión.** Depende de: ninguna. Cubre CU-02 y RNF-S02.
  - **Aceptación:** al intentar entrar, ningún log del controlador contiene correo, contraseña ni tokens del formulario. El resultado de ingreso sigue funcionando igual.
  - **Verificar:** prueba de controlador con captura de logs y `pnpm --filter proyecto-backend test -- --runInBand`.
  - **Archivos previstos:** `apps/backend/src/auth/auth.controller.ts`, `apps/backend/src/auth/auth.controller.spec.ts`.
  - **Evidencia (19-10-2026, entorno local):** se retiró `console.log(SignInDto)`; `pnpm --filter proyecto-backend test -- auth.controller.spec.ts --runInBand` pasó y comprobó que el controlador entrega el DTO al servicio sin registrarlo. Esto no acredita todavía el flujo completo de Cuenta.

- [x] **CU-T02. Aislar las operaciones de Supabase Auth de cada solicitud y definir las respuestas de Cuenta.** Depende de: CU-T01. Cubre la base de CU-01–CU-04.
  - **Aceptación:** la sesión de una persona no se conserva en un cliente compartido que pueda afectar otra solicitud. Registro, ingreso y futuras operaciones usan respuestas consistentes sin exponer datos internos.
  - **Verificar:** prueba con dos sesiones distintas y revisión de tipos/respuestas; `pnpm backend:build`.
  - **Archivos previstos:** `apps/backend/src/supabase/supabase.service.ts`, `apps/backend/src/auth/auth.service.ts`, `apps/backend/src/auth/auth.service.spec.ts`, DTO de Cuenta necesario en `apps/backend/src/auth/dto/`.
  - **Evidencia (19-10-2026, entorno local):** cada operación obtiene un cliente Supabase nuevo sin persistencia ni renovación automática de sesión en el servidor. Inicio de sesión devuelve solo los campos propios que usa la app; un error del proveedor en el registro no se entrega sin filtrar. Pasaron cuatro pruebas dirigidas de controlador, Auth y Supabase con dos ingresos concurrentes, y `pnpm --filter proyecto-backend build`. El contrato ampliado de perfil, renovación y confirmación se implementará en CU-T03–CU-T05. La suite general sigue fallando por seis pruebas de otros módulos que no proveen `PrismaService` en su módulo de prueba; esas pruebas no se cambiaron aquí.

- [x] **CU-T03. Manejar registro con correo pendiente y falla al guardar datos de Petzy.** Depende de: CU-T02. Cubre CU-01, CU-05 y CU-06.
  - **Aceptación:** el registro pide confirmar el correo. Si se creó la cuenta de acceso pero falla el guardado del nombre de usuario y estado, se informa cómo continuar con la misma cuenta; repetir el registro no crea otra identidad. Una persona sin mascota puede iniciar este proceso.
  - **Verificar:** pruebas de servicio con registro normal, correo ya usado, nombre duplicado y falla simulada después de crear la identidad; `pnpm --filter proyecto-backend test -- --runInBand`.
  - **Archivos previstos:** `apps/backend/src/auth/auth.service.ts`, `apps/backend/src/auth/auth.controller.ts`, `apps/backend/src/auth/auth.service.spec.ts`, `apps/backend/src/auth/dto/signUp.dto.ts`.
  - **Evidencia (19-10-2026, entorno local):** pruebas del servicio para registro normal, correo y nombre duplicados, identidad ya existente y falla al guardar `User`. El servidor conserva la identidad y explica que se entra con esa misma cuenta para completar el perfil. No se comprobó todavía un correo real de Supabase; esa integración queda en CU-T10.

- [x] **CU-T04. Distinguir cuenta completa de datos pendientes y permitir completar solo el perfil propio.** Depende de: CU-T03. Cubre CU-01 y CU-02.
  - **Aceptación:** una persona con correo confirmado y datos pendientes puede consultar su estado y guardar nombre de usuario y estado de residencia. No puede abrir contenido privado antes de hacerlo ni completar el perfil de otra persona. Reintentar no crea filas duplicadas; una cuenta desactivada no obtiene acceso normal y solo recibe el estado necesario para ofrecer la reactivación de Perfiles. D-41 exige validar de nuevo las credenciales al reactivar; un token antiguo no basta.
  - **Verificar:** pruebas de guard y API con dos cuentas, una completa y otra incompleta, más caso de nombre duplicado; `pnpm --filter proyecto-backend test:e2e -- --runInBand` con entorno preparado.
  - **Archivos previstos:** `apps/backend/src/auth/guards/supabase-auth.guard.ts`, `apps/backend/src/auth/auth.controller.ts`, `apps/backend/src/auth/auth.service.ts`, DTO de completar perfil en `apps/backend/src/auth/dto/`, prueba en `apps/backend/test/`.
  - **Evidencia (19-10-2026, entorno local):** `GET /auth/me` y `PUT /auth/profile-completion` usan el ID del token; el guard bloquea rutas privadas si falta el perfil o está desactivado. Pruebas unitarias cubren identidad ajena, correo sin confirmar, nombre duplicado y cuenta inactiva. La prueba HTTP local pasó con Auth y base simulados. Falta comprobarlo contra Supabase y PostgreSQL reales en CU-T10.

- [x] **CU-T05. Entregar y renovar la sesión desde el servidor.** Depende de: CU-T02 y CU-T04. Cubre CU-02 y CU-03.
  - **Aceptación:** ingresar devuelve lo necesario para continuar y renovar la sesión. Una renovación válida entrega datos nuevos de sesión; una inválida pide ingresar otra vez. La operación de una cuenta no afecta la sesión de otra.
  - **Verificar:** pruebas de ingreso, renovación, vencimiento, respuesta inválida y solicitudes concurrentes de dos cuentas; `pnpm --filter proyecto-backend test -- --runInBand` y `pnpm backend:build`.
  - **Archivos previstos:** `apps/backend/src/auth/auth.controller.ts`, `apps/backend/src/auth/auth.service.ts`, `apps/backend/src/auth/auth.service.spec.ts`, DTO de renovación en `apps/backend/src/auth/dto/`.
  - **Evidencia (19-10-2026, entorno local):** `POST /auth/sign-in` devuelve estado de perfil, tokens y vencimiento; `POST /auth/refresh` rota tokens mediante Supabase Auth y rechaza un refresh token inválido. Las pruebas cubren correo no confirmado, perfil incompleto e inactivo, renovación inválida y dos renovaciones concurrentes aisladas. Pasaron 26 pruebas dirigidas y `pnpm --filter proyecto-backend build`. Falta prueba con sesión real de Supabase en CU-T10.

- [ ] **CU-T06. Comprobar la sesión al abrir la app y proteger la navegación.** Depende de: CU-T04 y CU-T05. Cubre CU-02, CU-03 y CU-05.
  - **Aceptación:** la app espera la comprobación antes de mostrar contenido. Si puede renovar y la cuenta está activa, continúa; si la cuenta está desactivada, ofrece el flujo de reactivación de Perfiles sin abrir contenido. Si la renovación falla, explica que se debe entrar de nuevo. Si la API no responde, ofrece reintento sin asumir que la cuenta dejó de existir. Cerrar sesión elimina los datos de acceso guardados.
  - **Verificar:** `pnpm --filter mobile lint`, `pnpm --filter mobile exec tsc --noEmit` y recorrido manual de apertura, renovación, falla de red y cierre.
  - **Archivos previstos:** `apps/mobile/hooks/useAuth.ts`, `apps/mobile/context/AuthContext.tsx`, `apps/mobile/app/_layout.tsx`, `apps/mobile/types/apiResponse.ts`.
  - **Avance (19-10-2026):** la app renueva la sesión al abrir, cerca del vencimiento y al volver a primer plano; conserva ambos tokens en SecureStore, no abre contenido para perfil incompleto o inactivo y ofrece «Reintentar» si falla la API. Pasaron TypeScript y lint sin errores; falta recorrido en dispositivo y conectar la reactivación definida en Perfiles. La tarea sigue abierta.

- [ ] **CU-T07. Mostrar confirmación pendiente y completar datos faltantes en la app.** Depende de: CU-T03, CU-T04 y CU-T06. Cubre CU-01, CU-02, CU-05 y CU-06.
  - **Aceptación:** después de registrarse aparece la indicación de revisar el correo. Una cuenta confirmada sin perfil abre el formulario de nombre de usuario y estado; no ve el feed hasta guardar. Ante error conserva datos no sensibles y permite reintentar; ninguna pantalla exige registrar mascota.
  - **Verificar:** `pnpm --filter mobile lint`, `pnpm --filter mobile exec tsc --noEmit` y recorrido manual con falla simulada al guardar el perfil.
  - **Archivos previstos:** `apps/mobile/app/(auth)/login.tsx`, pantalla nueva de completar perfil en `apps/mobile/app/(auth)/`, `apps/mobile/hooks/useAuth.ts`, `apps/mobile/app/_layout.tsx`.
  - **Avance (19-10-2026):** el registro ya muestra «Revisa tu correo»; una sesión confirmada sin perfil abre «Completa tu perfil» y conserva lo escrito ante error. Faltan el reenvío y el recorrido manual completo; la tarea sigue abierta.

- [ ] **CU-T08. Reenviar confirmación y procesar el enlace que vuelve a Petzy.** Depende de: CU-T03, CU-T06 y CU-T07. Cubre CU-01 y CU-05.
  - **Aceptación:** «Reenviar correo» informa el resultado sin revelar si existe una cuenta. El enlace abre la app y permite continuar tras confirmar; un enlace vencido o repetido da una explicación y ofrece solicitar otro. Los datos del enlace no quedan visibles en el historial de navegación.
  - **Verificar:** pruebas del endpoint de reenvío; apertura de enlaces reales en un build Android y, si hay entorno disponible, iOS; probar enlace válido, vencido y repetido.
  - **Archivos previstos:** `apps/backend/src/auth/auth.controller.ts`, `apps/backend/src/auth/auth.service.ts`, `apps/mobile/app.json`, pantalla móvil de retorno de enlace en `apps/mobile/app/(auth)/`, `apps/mobile/app/(auth)/login.tsx`. **Configuración externa:** URLs permitidas y plantilla de correo en Supabase Auth.

- [ ] **CU-T09. Recuperar la contraseña desde un enlace que abre la app.** Depende de: CU-T02, CU-T06 y CU-T08. Cubre CU-04 y CU-05.
  - **Aceptación:** pedir el enlace muestra la misma respuesta para un correo existente o ausente. El enlace válido abre un formulario para contraseña nueva; uno vencido permite pedir otro. No se registran contraseñas ni datos de sesión. Si la forma real del enlace exige cambiar el contrato planificado, se revisa el plan antes de aplicarlo.
  - **Verificar:** pruebas backend para ambos tipos de correo y enlace inválido; recorrido en build móvil con enlace real, cambio de contraseña y nuevo ingreso.
  - **Archivos previstos:** `apps/backend/src/auth/auth.controller.ts`, `apps/backend/src/auth/auth.service.ts`, pantalla móvil de recuperación en `apps/mobile/app/(auth)/`, `apps/mobile/hooks/useAuth.ts`, pruebas backend de Auth. **Configuración externa:** URL y plantilla de recuperación en Supabase Auth.

- [ ] **CU-T10. Verificar Cuenta completa y documentar lo comprobado.** Depende de: CU-T01–CU-T09. Cubre CU-01–CU-06.
  - **Aceptación:** registro, confirmación, reenvío, ingreso, perfil incompleto, renovación, cierre y recuperación pasan con cuentas de prueba; se incluye una persona sin mascota y fallas de API y guardado. La documentación diferencia cada ruta implementada de cualquier propuesta restante y registra fecha y entorno.
  - **Verificar:** pruebas backend, build, lint y recorrido manual en dispositivo; anotar resultado por criterio CU-01–CU-06. Si no se dispone de Supabase o dispositivo, registrar qué no se pudo comprobar y mantener Cuenta sin estado «Verificada».
  - **Archivos previstos:** `docs/ESPECIFICACIONES/01-CUENTA.md`, `docs/ESPECIFICACIONES/01-CUENTA/01-PLAN.md`, `docs/00-RUTA-DE-DESARROLLO.md`, `docs/04-DATOS-Y-PERMISOS.md`, `docs/05-API.md`.

## Regla para seguir

La lista ya fue revisada y el usuario autorizó iniciar código el 19 de octubre de 2026. Implementar las tareas de una en una. Una prueba de código no sustituye la comprobación de enlaces reales ni del recorrido móvil.
