# Tareas aprobadas: Mascotas (`mascotas`)

**Avance de Mascotas, 26-10-2026:** implementación local de MA-T09–MA-T11 reforzada: lista/detalle, formulario, menús anclados, teclado, foto con reintento sin duplicar una ficha ya confirmada y protección de respuestas atrasadas. Foto backend transaccional; pasan 64 HTTP, 104 unitarias, scripts móviles, tipos, lint y export iOS. MA-T09–MA-T12 siguen abiertas por recorrido real en teléfono; Perfiles conserva su cierre. [Informe](../../REVISIONES/2026-10-26-MASCOTAS.md).

**Estado:** lista aprobada por el usuario el 9 de octubre de 2026; la autorización posterior para desarrollar rige desde el 19 de octubre. MA-T01–MA-T08 tienen implementación y pruebas locales; MA-T09–MA-T11 tienen integración móvil creada, pendiente de recorrido en dispositivo. MA-T12 sigue abierta. Derivan de la [ficha aprobada](../04-MASCOTAS.md), el [plan aprobado](01-PLAN.md), MA-01–MA-08 y D-42–D-47, D-49–D-52. D-51 sustituyó D-48.

## Qué se hará, en orden

1. Revisar las rutas, el modelo y los datos de prueba que existen para mascotas.
2. Preparar los campos de nacimiento, especie y raza, y quitar la edad guardada.
3. Calcular la edad al consultar y proteger las operaciones de lectura y escritura.
4. Guardar y entregar la foto privada; integrar listas, fichas y formularios móviles.
5. Comprobar que Perfiles y Publicaciones muestren la misma ficha y respeten su desactivación.

Una casilla se marcará solo después de ejecutar y comprobar su aceptación. Una pantalla compilada todavía necesita recorrido en un teléfono para cerrar su tarea móvil.

## Trabajo técnico y comprobación

- [x] **MA-T01. Inventariar el modelo, las rutas antiguas y posibles filas de prueba.** Depende de: ninguna. Prepara MA-01–MA-08 y D-51–D-52.
  - **Aceptación:** se registran todos los usos de `Pet.age`, `ownerId`, `/pet` y `/user/:id/pets` en backend y móvil. Se comprueba si la base de desarrollo conectada tiene filas `Pet`; si no hay conexión, se deja ese dato sin verificar. Se identifica cómo migrar o recrear posibles filas de prueba sin inventar nacimientos y cómo retirar o asegurar rutas antiguas.
  - **Verificar:** búsqueda en código, revisión del esquema y consulta de solo lectura a la base de desarrollo cuando exista; contrastar con [API](../../05-API.md) y el plan. No afirmar que la base está vacía sin consultarla.
  - **Archivos previstos:** registro del inventario en `01-PLAN.md`; `apps/backend/prisma/schema.prisma`, `apps/backend/src/pet/` y `apps/mobile/` solo para inspección.

- [x] **MA-T02. Migrar los datos de Mascotas sin guardar la edad.** Depende de: MA-T01. Cubre MA-01–MA-02 y D-42, D-44–D-46, D-51–D-52.
  - **Aceptación:** `Pet` conserva dueño, nombre, foto opcional, descripción opcional y actividad; añade `species String`, `breed String`, `birthYear Int`, `birthMonth Int` obligatorios y `birthDay Int?` opcional. Elimina `Pet.age`. `birthDay = null` distingue mes/año aproximados; no se inventan valores para filas de prueba. La migración versionada se revisa antes de aplicarla y se actualiza Prisma Client.
  - **Verificar:** inspección del SQL generado y de la nulabilidad, `pnpm --filter proyecto-backend exec prisma migrate dev` en la base de desarrollo identificada, `pnpm --filter proyecto-backend exec prisma generate` y `pnpm backend:build`; comprobar que el esquema final no contiene `Pet.age`.
  - **Archivos previstos:** `apps/backend/prisma/schema.prisma`, nueva migración en `apps/backend/prisma/migrations/` y consumidores de tipo Prisma que impidan compilar. La edición se hará solo cuando el usuario autorice código.

- [x] **MA-T03. Validar el nacimiento y calcular la edad al responder.** Depende de: MA-T02. Cubre MA-01–MA-03 y D-44, D-49–D-52.
  - **Aceptación:** una función compartida del backend calcula años cumplidos desde fecha exacta o años aproximados desde mes/año, usando el día UTC. Rechaza fecha completa imposible o futura, mes/año futuros y combinaciones incompletas; admite años bisiestos válidos. Entrega `age` e `isAgeApproximate` en la respuesta sin guardar `age` ni aceptar ese campo de entrada. No hay tarea diaria de sincronización.
  - **Verificar:** pruebas unitarias con víspera y día del cumpleaños, cambio de año, febrero bisiesto, nacimiento aproximado, límites de UTC y datos inválidos; `pnpm --filter proyecto-backend test -- --runInBand`.
  - **Archivos previstos:** utilidad de fecha en `apps/backend/src/pet/`, DTO en `apps/backend/src/pet/dto/` y pruebas `*.spec.ts` del módulo.

- [x] **MA-T04. Consultar listas y ficha pública con edad vigente.** Depende de: MA-T03 y la sesión de Cuenta. Cubre MA-01–MA-02, MA-06–MA-07 y D-43, D-51–D-52.
  - **Aceptación:** `GET /users/me/pets`, `GET /users/:id/pets` y `GET /pets/:id` exigen cuenta solicitante activa. Solo entregan mascotas activas cuyo dueño está activo; las listas tienen orden y cursor estables, 20 elementos por defecto y máximo 30. La respuesta incluye nombre, especie, raza, nacimiento exacto o aproximado, descripción y foto disponibles, edad calculada y marca de aproximación; no expone correo, campos privados ni ruta interna de Storage. Una cuenta sin mascotas recibe lista vacía. `/user/:id/pets` se asegura o retira para que no evada estas reglas.
  - **Verificar:** pruebas directas de API con dos cuentas, una sin mascotas, más de una página, dueño inactivo, ficha inactiva, sesión ausente e ID directo; `pnpm --filter proyecto-backend test:e2e`.
  - **Archivos previstos:** `apps/backend/src/pet/pet.controller.ts`, `pet.service.ts`, DTO de consulta en `apps/backend/src/pet/dto/` y prueba en `apps/backend/test/`.

- [x] **MA-T05. Crear y editar solo mascotas propias.** Depende de: MA-T03–MA-T04. Cubre MA-01, MA-03–MA-04 y D-42, D-45–D-46, D-49, D-51.
  - **Aceptación:** `POST /pets` toma el dueño del token y exige nombre de 2–50 caracteres, especie permitida o texto «Otra» de 2–50, raza de 2–50 y nacimiento válido; acepta «Mestiza» y «Raza desconocida». `PATCH /pets/:id` permite al dueño corregir esos datos y descripción opcional hasta 300. `ownerId`, `age` e `isActive` enviados por cliente se rechazan; `POST/PATCH /pet` antiguos se aseguran o retiran. Una segunda cuenta no puede editar la ficha por ID directo. La edad devuelta se recalcula después de cambiar nacimiento.
  - **Verificar:** E2E con dos cuentas, campos vacíos o largos, «Otra», razas permitidas, fechas exactas/aproximadas, campos prohibidos y edición ajena; `pnpm --filter proyecto-backend test:e2e`.
  - **Archivos previstos:** `apps/backend/src/pet/pet.controller.ts`, `pet.service.ts`, DTO en `apps/backend/src/pet/dto/` y prueba en `apps/backend/test/`.

- [x] **MA-T06. Desactivar una ficha sin borrar su registro.** Depende de: MA-T04–MA-T05. Cubre MA-04–MA-05 y D-19, D-36.
  - **Aceptación:** `DELETE /pets/:id` solo permite al dueño activo desactivar lógicamente una ficha propia; la app pedirá confirmación. La fila y su foto privada permanecen guardadas, pero lista, detalle y foto dejan de entregarla. Las publicaciones antiguas siguen existiendo sin nombre, foto ni enlace de esa mascota. La ruta antigua de eliminación no permite eludir propiedad; no se crea una restauración de fichas no acordada.
  - **Verificar:** E2E con dueño y segunda cuenta, lectura por ID antes y después, petición repetida y publicación vinculada cuando exista PU-T correspondiente; `pnpm --filter proyecto-backend test:e2e`.
  - **Archivos previstos:** `apps/backend/src/pet/pet.controller.ts`, `pet.service.ts`, prueba en `apps/backend/test/`; integración de `Post.petId` en tareas de Publicaciones.

- [x] **MA-T07. Guardar, reemplazar y quitar una foto de mascota.** Depende de: MA-T01 y MA-T05. Cubre MA-01, MA-08 y D-47, D-52.
  - **Aceptación:** el dueño puede subir cero o una foto JPEG, PNG o WebP de hasta 5 MB mediante `PUT /pets/:id/photo`, o quitarla mediante `DELETE /pets/:id/photo`. El backend valida tipo y tamaño reales, usa Storage privado y guarda en `Pet.photo` solo la referencia interna. Al reemplazar, actualiza esa referencia antes de retirar el archivo anterior; una falla no deja referencia rota y registra limpieza pendiente. No se acepta una URL de foto enviada como texto libre.
  - **Verificar:** pruebas de formato/tamaño, subida, reemplazo, retirada y fallas simuladas de Storage o base; comprobar bucket privado y `pnpm backend:build`.
  - **Archivos previstos:** `apps/backend/src/pet/pet.controller.ts`, `pet.service.ts`, servicio de fotos en `apps/backend/src/pet/` y pruebas del módulo. **Configuración externa futura:** espacio privado de Storage.

- [x] **MA-T08. Entregar la foto solo a cuentas autorizadas.** Depende de: MA-T04 y MA-T07. Cubre MA-07–MA-08 y D-36, D-47.
  - **Aceptación:** `GET /pets/:id/photo` comprueba en cada solicitud sesión, cuenta solicitante activa, ficha activa y dueño activo. Entrega la imagen sin URL pública ni ruta interna de Storage y evita caché compartida. Al desactivar ficha o dueño, se pierde acceso en la siguiente petición; no tener foto produce una respuesta clara para mostrar imagen de respaldo.
  - **Verificar:** solicitudes directas con dueño, otra cuenta activa, sin sesión, solicitante inactivo, dueño inactivo y ficha inactiva; comprobar que Storage no expone el archivo; `pnpm --filter proyecto-backend test:e2e`.
  - **Archivos previstos:** `apps/backend/src/pet/pet.controller.ts`, `pet.service.ts`, servicio de fotos en `apps/backend/src/pet/` y prueba en `apps/backend/test/`.

- [ ] **MA-T09. Mostrar «Mis mascotas» y la ficha en la app.** Depende de: MA-T04, MA-T08 y la sesión de Cuenta. La inserción en el perfil público se cierra en MA-T11. Cubre MA-01–MA-02, MA-06–MA-08.
  - **Avance 26-10-2026:** Lista con carga/error/reintento persistente, bloqueo de paginación, deduplicación y descarte de respuestas atrasadas. Ficha con Volver fijo, menú propio anclado y retirada segura; script real aprobado. [Evidencia](../../REVISIONES/2026-10-26-MASCOTAS.md).
  - **Aceptación:** «Mis mascotas» muestra solo fichas propias activas, edad enviada por la API, imagen de respaldo cuando falta foto y un estado vacío con «Agregar mascota». La ficha propia y la ajena muestran fecha completa o «Nacimiento aproximado» y «Edad aproximada» según corresponda. Solo el dueño ve acciones de edición/desactivación. Carga, error, sesión vencida y reintento tienen mensajes visibles; un fallo de imagen no oculta los demás datos.
  - **Verificar:** `pnpm --filter mobile lint`, `pnpm --filter mobile exec tsc --noEmit` y recorrido móvil con lista vacía, mascota sin foto, fecha aproximada, otra cuenta, API apagada y sesión vencida.
  - **Archivos previstos:** `apps/mobile/app/(tabs)/mascotas.tsx`, pantallas de ficha en `apps/mobile/app/`, consultas en `apps/mobile/hooks/` y tipos en `apps/mobile/types/`.

- [ ] **MA-T10. Registrar, editar y desactivar desde la app.** Depende de: MA-T05–MA-T09. Cubre MA-01, MA-03–MA-05 y MA-08.
  - **Avance 26-10-2026:** Formulario con bloqueo de envío/galería, selección anclada, aviso al salir y Siguiente numérico iOS. Foto parcial explicada, ID confirmado reutilizado y borrador conservado; edición no se recarga al renovar sesión. Script real y export aprobados. [Evidencia](../../REVISIONES/2026-10-26-MASCOTAS.md).
  - **Adjuntos, 25-10-2026:** la subida de foto reutiliza `photo-upload` y `expo/fetch`, con `File` de `expo-file-system` en móvil y Blob en web, corrigiendo la incompatibilidad de adjuntos de Expo 57 reproducida en Publicaciones. TypeScript, ESLint dirigido y envío HTTP local con serializador de Expo pasan; archivo nativo simulado. Falta subida real con sesión en iPhone/Supabase; no se cierra la tarea.
  - **Aceptación:** el formulario pide los campos aprobados y distingue fecha exacta de mes/año aproximados; foto y descripción son opcionales, y nunca se solicita edad. Puede agregar, reemplazar y quitar foto. Muestra envío, subida, éxito, error y reintento, evita doble envío y conserva lo escrito tras validación o falla. Desactivar pide confirmación y solo retira la tarjeta después de respuesta exitosa del servidor.
  - **Verificar:** `pnpm --filter mobile lint`, `pnpm --filter mobile exec tsc --noEmit` y recorrido con «Otra» especie, raza desconocida, fecha futura, foto inválida, red caída, reemplazo y retirada de foto, edición y desactivación.
  - **Archivos previstos:** pantallas de formulario en `apps/mobile/app/`, `apps/mobile/app/(tabs)/mascotas.tsx`, componentes en `apps/mobile/components/` y consultas en `apps/mobile/hooks/`.

- [ ] **MA-T11. Integrar mascotas con Perfiles, Publicaciones y cuentas desactivadas.** Depende de: MA-T04, MA-T06, MA-T08–MA-T10 y tareas correspondientes de Perfiles y Publicaciones. Cubre MA-05–MA-08 y D-19, D-36.
  - **Avance 26-10-2026:** Regresión HTTP de Perfiles/Publicaciones/Mascotas y desactivación aprobada, además de scripts públicos. Se preserva una sola edad y foto protegida; cambio de foto concurrente probado. Pendiente recorrido físico de la integración. [Evidencia](../../REVISIONES/2026-10-26-MASCOTAS.md).
  - **Aceptación:** el perfil público muestra solo mascotas activas de dueño activo con la misma edad calculada que su ficha. Si se desactiva el dueño, no aparecen ficha ni foto; al reactivarlo reaparecen solo fichas que seguían activas. Una publicación con mascota vinculada conserva el post cuando la ficha se desactiva, pero deja de mostrar el complemento y su enlace. La foto de mascota sigue sus permisos propios, independientemente de la foto del post.
  - **Verificar:** pruebas directas de API y recorrido móvil antes/después de desactivar y reactivar cuenta o mascota, incluyendo post vinculado; registrar una dependencia pendiente si los módulos de Perfiles/Publicaciones todavía no están implementados.
  - **Archivos previstos:** servicios de lectura en `apps/backend/src/pet/`, `apps/backend/src/user/` y `apps/backend/src/post/`, pruebas en `apps/backend/test/`, integración móvil de perfil/publicación.

- [ ] **MA-T12. Verificar el módulo y actualizar su estado real.** Depende de: MA-T01–MA-T11 y de las tareas relacionadas de Cuenta, Perfiles y Publicaciones. Cubre MA-01–MA-08.
  - **Avance 26-10-2026:** 64 HTTP y 104 unitarias aprobadas, compilación backend, tipos, lint dirigido, verify:pets, regresiones Perfiles/Interacciones y export iOS. Informe preparado; no cerrar sin recorrido físico. [Evidencia](../../REVISIONES/2026-10-26-MASCOTAS.md).
  - **Aceptación:** cada criterio MA tiene evidencia de base, API y app según corresponda, incluidas solicitudes sin permiso, errores, fecha aproximada, cumpleaños y foto privada. Se registran resultado, fecha y entorno. API, datos y ruta distinguen funciones realmente comprobadas de propuestas; no se marca Mascotas «Verificada» mientras falte una integración necesaria.
  - **Verificar:** `pnpm --filter proyecto-backend test -- --runInBand`, `pnpm --filter proyecto-backend test:e2e`, `pnpm backend:build`, `pnpm --filter mobile lint`, `pnpm --filter mobile exec tsc --noEmit` y recorrido en dispositivo; revisar MA-01–MA-08 uno por uno.
  - **Archivos previstos:** `docs/ESPECIFICACIONES/04-MASCOTAS.md`, `docs/00-RUTA-DE-DESARROLLO.md`, `docs/04-DATOS-Y-PERMISOS.md`, `docs/05-API.md` y este archivo.

## Regla para seguir

Esta lista quedó aprobada conforme a [SDD](../../02-SDD.md). El usuario autorizó comenzar el desarrollo el 19 de octubre de 2026. Si cambian decisiones o aparecen filas de prueba en otro entorno, actualizar ficha, plan y tareas antes de modificar ese entorno.

**Evidencia local del 20-10-2026:** respaldo previo y migración `20261020122500_pet_birth_fields` aplicados a la base de desarrollo de Supabase tras comprobar 0 filas `Pet`; siete migraciones al día y Prisma Client generado. El bucket `pet-photos` es privado, con límite de 5 MB y formatos JPEG/PNG/WebP. `pnpm backend:build` pasó; 19 pruebas unitarias dirigidas de edad, fotos y ciclo de ficha y 27 pruebas HTTP de Cuenta, Perfiles, Publicaciones y Mascotas pasaron en PostgreSQL local desechable. Las pruebas HTTP cubren fechas, propiedad, dueño inactivo, paginación, foto y ocultación del complemento de mascota en el post al desactivar la ficha; usan identidad simulada, por lo que falta sesión real y recorrido en iPhone. Las pantallas móviles de lista, formulario y detalle están creadas; TypeScript y lint pasan sin errores. MA-T09–MA-T11 permanecen abiertas hasta probarlas en dispositivo con los módulos relacionados.
