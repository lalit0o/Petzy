# Tareas aprobadas: Adopción (`adopcion`)

**Estado:** lista AD-T01–AD-T18 aprobada por el usuario el 10 de octubre de 2026. **El 10-11-2026 el usuario autorizó comenzar Adopción;** AD-T01–AD-T16 se implementaron ese día y el 12-11-2026 el usuario las recorrió en el teléfono; AD-T17–AD-T18 cerradas. **Adopción: Verificada para el alcance aprobado.** Deriva de la [ficha funcional aprobada](../08-ADOPCION.md), el [plan técnico aprobado](01-PLAN.md), RF-AD01–RF-AD04, AD-01–AD-09 y D-89–D-98. El usuario pidió terminar la documentación antes de programar. Esta aprobación no inicia código ni migraciones.

## Qué se hará, en orden

1. Preparar tablas propias de Adopción y comprobar quién puede ver o cambiar cada anuncio.
2. Guardar y entregar fotos privadas, publicar animales y mostrar las listas sin mezclarlas con Inicio o comunidades.
3. Permitir editar, cambiar el estado, retirar y restaurar; guardar reportes con una copia del anuncio denunciado.
4. Conectar «Contactar» con Chat y crear las pantallas móviles con mensajes claros al cargar, guardar o fallar.
5. Comprobar los criterios de la ficha y actualizar el estado documental con evidencia real.

Cada casilla se marcará solo cuando su aceptación esté implementada y comprobada. Los archivos son previsiones, no evidencia de que una función ya exista. La revisión de reportes por el equipo y las suspensiones permanecen fuera del MVP.

## Trabajo técnico y comprobación

- [x] **AD-T01. Revisar el punto de partida y las dependencias.** Depende de: ninguna. Prepara AD-01–AD-09.
  - **Hecho, 10-11-2026:** no había nada de Adopción en el código. Se reutilizan el patrón de foto privada de Eventos (bucket privado creado al primer uso, validación del formato real, entrega con sesión y `no-store`), la edad calculada de Mascotas (`petAge`) y `ChatService.open`, que ahora exporta `ChatModule`. Ningún flujo borra usuarios o mascotas físicamente, así que las llaves `RESTRICT` no bloquean nada existente. La ubicación en la navegación se decidió con el usuario (D-155).
  - **Aceptación:** se inspeccionan `Post`, `Comment`, `PostLike`, las rutas actuales, la sesión, las fichas `Pet`, la navegación móvil y el estado real de Chat. Se anotan consumidores afectados y cualquier dato de prueba en una base conectada; si no se puede consultar la base, se registra «sin verificar». No se confunde una ficha aprobada con una función implementada.
  - **Verificar:** comparar esquema y código con [API](../../05-API.md), [datos](../../04-DATOS-Y-PERMISOS.md), [ruta](../../00-RUTA-DE-DESARROLLO.md) y el plan de Chat; inspección de solo lectura.
  - **Archivos previstos:** `apps/backend/prisma/schema.prisma`, `apps/backend/src/post/`, `apps/backend/src/auth/`, `apps/backend/src/pet/`, `apps/mobile/app/` y `01-PLAN.md`, solo para inspección.

- [x] **AD-T02. Crear tablas propias e índices de Adopción.** Depende de: AD-T01. Cubre AD-01–AD-03, AD-07–AD-09 y D-89–D-98.
  - **Hecho, 10-11-2026:** migración `20261110120000_adoption` con enums, cuatro tablas, índices, unicidad `(listingId, reporterId)` y `CHECK` de textos y posiciones; probada en PostgreSQL 16 desechable. La E2E comprueba que dos reportes simultáneos de la misma persona dejan uno solo y que otra persona sí puede reportar. **Falta que el usuario la aplique a la base de desarrollo.**
  - **Aceptación:** una migración versionada crea `AdoptionListing`, `AdoptionPhoto`, `AdoptionReport`, `AdoptionReportPhoto` y los enums aprobados, con tipos, valores iniciales, relaciones, nulabilidad, índices y unicidad `(listingId, reporterId)` del plan. Las cuatro tablas comienzan vacías; no altera filas ni relaciones de `Post`, `Comment` o `PostLike`. No crea campos de precio, permisos de personal ni suspensión.
  - **Verificar:** revisar SQL y esquema antes de aplicar; tras autorización de código, validar Prisma, generar cliente y probar migración y reversión en entorno de prueba. Comprobar que dos reportes de una misma persona para un anuncio violan la restricción única, pero dos personas distintas pueden reportarlo.
  - **Archivos previstos:** `apps/backend/prisma/schema.prisma`, nueva migración en `apps/backend/prisma/migrations/` y prueba de restricciones en `apps/backend/test/`.

- [x] **AD-T03. Centralizar acceso a anuncios y fichas enlazadas.** Depende de: AD-T02 y controles de sesión/cuenta activa de Cuenta y Perfiles. Cubre AD-01–AD-04, AD-07–AD-09.
  - **Hecho, 10-11-2026:** `AdoptionService.find` es el único control para detalle, fotos, cambios, contacto y reportes: un retirado o de autor inactivo responde 404 a otras personas; cambios solo del autor (403) y con el estado correcto (409). La ficha enlazada solo se muestra si sigue activa y es del autor. Probado en E2E.
  - **Aceptación:** el servidor deriva la persona del token y distingue anuncio público activo, anuncio retirado visible solo para su autor, autor inactivo y ficha `Pet` propia activa. Una ficha desactivada no aporta nombre, especie, edad, foto ni enlace, pero el anuncio permanece. El mismo control se usa en detalle, fotos, cambios, contacto y reportes; no depende de ocultar botones en la app.
  - **Verificar:** pruebas de servicio/API con autor, tercera cuenta, sesión inválida, cuenta desactivada, ficha propia, ajena y desactivada; `pnpm --filter proyecto-backend test --runInBand`.
  - **Archivos previstos:** servicio y pruebas en `apps/backend/src/adoption/`, controles compartidos de `apps/backend/src/auth/` o `apps/backend/src/user/` solo si hacen falta, y `apps/backend/test/`.

- [x] **AD-T04. Preparar carga privada de una a tres fotos.** Depende de: AD-T02–AD-T03. Cubre AD-01, AD-06 y AD-08; D-89–D-94.
  - **Hecho, 10-11-2026:** `AdoptionPhotoService` valida 5 MB y el formato real, guarda en el bucket privado `adoption-photos` con nombres nuevos y sube todas o ninguna. E2E con 0, 1, 3 y 4 fotos, archivo falso y Storage que falla a la mitad (no queda anuncio ni archivos).
  - **Aceptación:** el backend valida tamaño máximo 5 MB por foto y contenido real JPEG/PNG/WebP; usa nombres internos nuevos y un bucket privado. Rechaza cero, más de tres o archivos inválidos sin confirmar el anuncio. Solo el servidor usa la clave de Storage; no devuelve `storageKey`. Prepara limpieza de cargas nuevas cuando falla la escritura en base.
  - **Verificar:** pruebas con 0, 1, 3 y 4 fotos, tipo falso, archivo mayor a 5 MB, fallo de Storage y fallo de base; comprobar que el bucket no ofrece URL pública y que una operación fallida no deja un anuncio incompleto.
  - **Archivos previstos:** servicio de fotos y pruebas en `apps/backend/src/adoption/`, configuración privada de Storage y `apps/backend/test/`.

- [x] **AD-T05. Crear anuncios válidos sin mezclar el feed.** Depende de: AD-T03–AD-T04. Cubre AD-01, AD-05–AD-06; D-89, D-92, D-95–D-96.
  - **Hecho, 10-11-2026:** `POST /adoptions` con todas las reglas; el envío doble lo evita la app con su bloqueo de botón. E2E con ficha propia, ajena e inactiva, límites, sin confirmación, campo `price` y fallo de Storage.
  - **Aceptación:** `POST /adoptions` exige título con contenido hasta 120, descripción con contenido hasta 3 000, una a tres fotos válidas y confirmación «Solo adopciones, no ventas». Acepta `petId` propio activo o vacío. Guarda anuncio en `SEEKING_HOME` y sus fotos juntos; toma `userId` del token, rechaza precio/pago y no crea `Post`. Si falla, no deja filas parciales ni archivos nuevos sin limpiar.
  - **Verificar:** E2E con cuenta sin mascota, ficha propia/ajena/inactiva, límites, falta de confirmación, envío repetido mientras espera y fallos de Storage/base; `pnpm --filter proyecto-backend test:e2e`.
  - **Archivos previstos:** controlador, servicio y DTO en `apps/backend/src/adoption/`, registro en `apps/backend/src/app.module.ts` y prueba en `apps/backend/test/`.

- [x] **AD-T06. Listar y abrir anuncios con orden y filtros estables.** Depende de: AD-T02–AD-T03. Cubre AD-01–AD-02, AD-06; D-90, D-93–D-95.
  - **Hecho, 10-11-2026:** orden por estado e id descendente con cursor `S-<id>`/`F-<id>`; E2E pagina de 2 en 2 sin repetir, filtra, excluye retirados y autores inactivos y rechaza cursores inválidos.
  - **Aceptación:** `GET /adoptions` devuelve por defecto 20 resultados (máximo 30), primero `SEEKING_HOME` y después `FOUND_HOME`, recientes primero dentro de cada grupo; filtra por estado y pagina sin repetir u omitir anuncios. `GET /adoptions/:id` muestra solo anuncios activos de autores activos, datos públicos del autor y complemento de mascota solo si sigue activa. No revela correo ni referencia interna de foto; Inicio/comunidades no reciben estos anuncios.
  - **Verificar:** E2E con más de 30 anuncios, fechas coincidentes, cambio de filtro, cuenta inactiva, anuncio retirado, ID directo y números de ID iguales en `Post`/`AdoptionListing`; `pnpm --filter proyecto-backend test:e2e`.
  - **Archivos previstos:** controlador, servicio y DTO de lectura en `apps/backend/src/adoption/`; prueba en `apps/backend/test/`.

- [x] **AD-T07. Entregar fotos solo a quien puede ver el anuncio.** Depende de: AD-T03–AD-T04 y AD-T06. Cubre AD-01, AD-08; D-94.
  - **Hecho, 10-11-2026:** E2E con tercero antes y después del retiro, autor con anuncio retirado, foto de otro anuncio y cabeceras `private, no-store`.
  - **Aceptación:** `GET /adoptions/:id/photos/:photoId` comprueba sesión, actividad del solicitante y autor, anuncio y pertenencia de la foto vigente en cada petición. Una tercera cuenta pierde acceso al retirarse el anuncio; el autor activo conserva acceso desde «Mis anuncios retirados». No expone URL pública, enlace firmado reutilizable ni `storageKey`; evita caché compartida. No sirve fotos históricas guardadas para reportes.
  - **Verificar:** solicitudes directas con autor, tercero, sesión vencida, cuenta desactivada, foto de otro anuncio y anuncio antes/después del retiro; confirmar bucket privado y cabeceras de caché; `pnpm --filter proyecto-backend test:e2e`.
  - **Archivos previstos:** controlador y servicio de fotos en `apps/backend/src/adoption/`, pruebas en `apps/backend/test/`.

- [x] **AD-T08. Editar contenido, fotos, ficha y estado.** Depende de: AD-T05–AD-T07. Cubre AD-01, AD-03, AD-06, AD-08; D-90, D-92, D-94–D-95.
  - **Hecho, 10-11-2026:** `PATCH` con bloqueo de fila compartido con los reportes; las fotos cambian con `keepPhotoIds` y las nuevas se borran si algo falla. E2E con tercero, ambos estados, quedarse sin fotos, más de tres, ficha ajena, quitar ficha y reemplazo que conserva los archivos de un reporte.
  - **Aceptación:** solo el autor edita un anuncio activo. `PATCH /adoptions/:id` permite corregir título, descripción, fotos y `petId`, o cambiar entre `SEEKING_HOME` y `FOUND_HOME`; conserva una a tres fotos y rechaza ficha ajena/inactiva. No cambia autor ni retira por accidente. Un error mantiene el contenido previo. Al reemplazar fotos, usa rutas nuevas y borra archivos viejos solo si ningún reporte los referencia; coordina edición y reporte simultáneos.
  - **Verificar:** E2E con autor/tercero, límites, retirada de la última foto, cambio de estado en ambos sentidos, reemplazo de foto con Storage fallando y reporte concurrente; `pnpm --filter proyecto-backend test:e2e`.
  - **Archivos previstos:** servicio, controlador, DTO y servicio de fotos en `apps/backend/src/adoption/`; prueba en `apps/backend/test/`.

- [x] **AD-T09. Retirar, listar los propios retirados y restaurar.** Depende de: AD-T03, AD-T06 y AD-T08. Cubre AD-02–AD-04, AD-08; D-90, D-92–D-94.
  - **Hecho, 10-11-2026:** E2E con `FOUND_HOME` retirado y restaurado con el mismo estado, tercero que no ve ni restaura, y edición bloqueada mientras está retirado.
  - **Aceptación:** `DELETE /adoptions/:id` marca `isActive = false` sin borrar texto, fotos ni reportes. `GET /adoptions/me/withdrawn` solo lista anuncios del autor; `POST /adoptions/:id/restore` los hace visibles con el estado `SEEKING_HOME` o `FOUND_HOME` que tenían. Una cuenta ajena no puede abrir ni restaurar un retirado por ID. Retirar no convierte `FOUND_HOME` en `SEEKING_HOME`.
  - **Verificar:** E2E con los dos estados, autor/tercero, foto y detalle antes/durante/después, consulta directa y errores de red; `pnpm --filter proyecto-backend test:e2e`.
  - **Archivos previstos:** controlador, servicio y DTO de lectura en `apps/backend/src/adoption/`; prueba en `apps/backend/test/`.

- [x] **AD-T10. Guardar un reporte único y su evidencia.** Depende de: AD-T02–AD-T03, AD-T06–AD-T08. Cubre AD-07; D-91, D-93–D-94, D-96–D-98.
  - **Hecho, 10-11-2026:** E2E con anuncio propio, motivo inválido, 501 caracteres, dos solicitudes simultáneas (una 201 y otra 409 con código estable), copia intacta después de editar y fotos conservadas, y anuncio retirado. No existe ruta de lectura para el equipo.
  - **Aceptación:** `POST /adoptions/:id/reports` acepta solo anuncio ajeno visible y uno de cuatro motivos, con explicación opcional de hasta 500 caracteres. En una transacción copia título, descripción, estado y referencias a las fotos vigentes; no deja medio reporte si falla. Un índice único garantiza uno por persona y anuncio aun con dos solicitudes simultáneas; el segundo intento responde con código estable que la app muestra «Ya lo reportaste». La edición o retirada posterior no modifica la copia ni permite borrar los archivos referenciados. No hay API de lectura del equipo.
  - **Verificar:** E2E con anuncio propio, ajeno, retirado y `FOUND_HOME`; motivo inválido, 501 caracteres, dos solicitudes concurrentes, edición/retiro después del reporte, fallo a mitad de transacción y ausencia de rutas administrativas; `pnpm --filter proyecto-backend test:e2e`.
  - **Archivos previstos:** controlador, servicio, DTO y pruebas en `apps/backend/src/adoption/` y `apps/backend/test/`.

- [x] **AD-T11. Abrir Chat desde un anuncio elegible.** Depende de: AD-T03, AD-T06, AD-T09 y CH-T04 y CH-T07 de Chat implementadas y verificadas. Cubre AD-04; D-91.
  - **Hecho, 10-11-2026:** E2E con contacto propio (400), dos solicitudes simultáneas que abren el mismo chat, bloqueo (`canSend: false`), `FOUND_HOME` (409) y retirado (404). Autor inactivo responde 404 por el control común.
  - **Aceptación:** `POST /adoptions/:id/contact` acepta solo a otra cuenta activa cuando el anuncio está visible en `SEEKING_HOME` y su autor sigue activo; abre o reutiliza la misma conversación de Chat para ese par. Rechaza anuncio propio, retirado o `FOUND_HOME`, incluso por API directa. Si el par ya está bloqueado, se puede leer el historial según Chat, pero no enviar mensajes nuevos; un chat previo sigue existiendo al cerrar el anuncio.
  - **Verificar:** E2E con conversación nueva/existente, dos solicitudes simultáneas, bloqueo, autor inactivo, anuncio propio, retirado y `FOUND_HOME`; `pnpm --filter proyecto-backend test:e2e`.
  - **Archivos previstos:** controlador y servicio en `apps/backend/src/adoption/`, operación reutilizada de `apps/backend/src/chat/` y pruebas en `apps/backend/test/`.

- [x] **AD-T12. Mostrar listado y detalle en móvil.** Depende de: AD-T06–AD-T07 y navegación de Cuenta; ubicación visual revisada con Diseño de la app. Cubre AD-01–AD-02, AD-06.
  - **Implementado, 10-11-2026; recorrido en teléfono el 12-11-2026:** ver la sección 0 del [documento de interfaces](../../06-DISENO-DE-INTERFACES.md). `tsc`, ESLint y `expo export --platform ios` pasan.
  - **Aceptación:** la persona abre Adopción, ve `SEEKING_HOME` antes que `FOUND_HOME`, filtra por ambos estados y carga más sin duplicados. El detalle muestra autor, estado, fotos protegidas y complemento de ficha solo si está activa. Hay estados de carga, vacío, error y «Reintentar»; la app no usa URL pública ni muestra anuncios retirados de otra persona.
  - **Verificar:** `pnpm --filter mobile lint`, `pnpm --filter mobile exec tsc --noEmit` y recorrido con más de una página, filtro cambiado, foto denegada, API apagada y sesión vencida.
  - **Archivos previstos:** pantallas en `apps/mobile/app/`, consulta y tipos en `apps/mobile/hooks/` o servicios móviles, componentes compartidos si corresponden.

- [x] **AD-T13. Crear y editar anuncios desde móvil.** Depende de: AD-T05, AD-T08 y AD-T12. Cubre AD-01, AD-05–AD-06, AD-08.
  - **Implementado, 10-11-2026; recorrido en teléfono el 12-11-2026:** ver la sección 0 del [documento de interfaces](../../06-DISENO-DE-INTERFACES.md). `tsc`, ESLint y `expo export --platform ios` pasan.
  - **Recorrido del usuario, 12-11-2026:** creó un anuncio, lo editó y subió fotos sin errores. Encontró que con una sola foto se podía deslizar el carrusel del detalle; se corrigió ese mismo día.
  - **Aceptación:** el formulario pide título, descripción, una a tres fotos y confirmación de «Solo adopciones, no ventas»; la ficha propia es opcional. Al editar muestra los valores vigentes y permite sustituir fotos o cambiar ficha sin dejar cero fotos. Indica subida y guardado; confirma éxito solo tras respuesta del servidor. Ante validación, API caída o sesión vencida conserva textos y fotos elegidas y permite corregir/reintentar. No ofrece precio/pago.
  - **Verificar:** `pnpm --filter mobile lint`, `pnpm --filter mobile exec tsc --noEmit` y recorrido con 0/1/3/4 fotos, ficha propia/inactiva, texto largo, doble toque, timeout y API apagada.
  - **Archivos previstos:** formularios en `apps/mobile/app/`, selector y vista previa de fotos en componentes móviles, integración de API en `apps/mobile/hooks/` o servicios móviles.

- [x] **AD-T14. Mostrar acciones del autor y anuncios retirados en móvil.** Depende de: AD-T08–AD-T09 y AD-T12. Cubre AD-03, AD-06, AD-08.
  - **Implementado, 10-11-2026; recorrido en teléfono el 12-11-2026:** ver la sección 0 del [documento de interfaces](../../06-DISENO-DE-INTERFACES.md). `tsc`, ESLint y `expo export --platform ios` pasan.
  - **Aceptación:** el autor puede cambiar entre «Busca hogar» y «Encontró hogar», retirar y abrir «Mis anuncios retirados» para restaurar cada uno con su estado anterior. Los botones solo aparecen en sus anuncios, pero la API conserva los permisos. Cada acción muestra espera y resultado; una falla mantiene el estado previo y ofrece reintento sin mostrar éxito prematuro.
  - **Verificar:** `pnpm --filter mobile lint`, `pnpm --filter mobile exec tsc --noEmit` y recorrido con ambos estados, retirada accidental, restauración, tercero, sesión vencida y red caída.
  - **Archivos previstos:** detalle y lista privada en `apps/mobile/app/`, acciones y consultas en `apps/mobile/hooks/` o servicios móviles.

- [x] **AD-T15. Reportar un anuncio desde móvil.** Depende de: AD-T10 y AD-T12. Cubre AD-07.
  - **Implementado, 10-11-2026; recorrido en teléfono el 12-11-2026:** ver la sección 0 del [documento de interfaces](../../06-DISENO-DE-INTERFACES.md). `tsc`, ESLint y `expo export --platform ios` pasan.
  - **Recorrido del usuario, 12-11-2026:** reportó un anuncio de otra cuenta en el teléfono y el reporte se guardó correctamente.
  - **Aceptación:** en un anuncio ajeno visible aparece «Reportar». La persona elige motivo obligatorio y puede escribir hasta 500 caracteres; al guardar ve «Reporte guardado». Si ya lo reportó ve «Ya lo reportaste». Un fallo conserva motivo y explicación. La pantalla aclara que el reporte se guarda para revisión futura, sin prometer retiro o respuesta inmediata; en anuncios propios o retirados no ofrece esa acción.
  - **Verificar:** `pnpm --filter mobile lint`, `pnpm --filter mobile exec tsc --noEmit` y recorrido con reporte exitoso, repetido, texto de 501 caracteres, API apagada, anuncio retirado durante el formulario y sesión vencida.
  - **Archivos previstos:** formulario y detalle en `apps/mobile/app/`, integración de reporte en `apps/mobile/hooks/` o servicios móviles.

- [x] **AD-T16. Conectar «Contactar» en móvil con Chat.** Depende de: AD-T11–AD-T12 y la pantalla de Chat CH-T12 verificada. Cubre AD-04.
  - **Implementado, 10-11-2026; recorrido en teléfono el 12-11-2026:** ver la sección 0 del [documento de interfaces](../../06-DISENO-DE-INTERFACES.md). `tsc`, ESLint y `expo export --platform ios` pasan.
  - **Recorrido del usuario, 12-11-2026:** desde otra cuenta tocó «Contactar» en un anuncio que busca hogar y el chat se abrió correctamente.
  - **Aceptación:** un anuncio ajeno `SEEKING_HOME` ofrece «Contactar» y abre el chat con su autor, reutilizando una conversación anterior. El propio y `FOUND_HOME` muestran su estado sin ese botón. Si el anuncio deja de estar disponible entre lectura y toque, la app explica el error; una conversación bloqueada deja leer su historial, pero no enviar por las reglas de Chat.
  - **Verificar:** `pnpm --filter mobile lint`, `pnpm --filter mobile exec tsc --noEmit` y recorrido con chat nuevo/existente/bloqueado, cierre del anuncio, autor inactivo, API apagada y sesión vencida.
  - **Archivos previstos:** detalle de Adopción en `apps/mobile/app/`, integración de Chat en `apps/mobile/hooks/` o servicios móviles y navegación existente.

- [x] **AD-T17. Comprobar Adopción de extremo a extremo.** Depende de: AD-T01–AD-T16. Cubre AD-01–AD-09.
  - **Cierre, 12-11-2026.** Automático (computadora de desarrollo, Windows 11): E2E del backend 108/108 con 10 de Adopción contra PostgreSQL 16 desechable y Storage simulado (10-11-2026; el backend no cambió después), unitarias 128/128, compilación del backend, `tsc` y ESLint de la app y `git diff --check`. Teléfono (iPhone del usuario con Expo Go, dos cuentas, migración aplicada a la base de desarrollo):

    | Criterio | E2E | Teléfono (12-11-2026) |
    | --- | --- | --- |
    | AD-01 publicar con 1–3 fotos y ficha opcional | Sí | Publicar, editar y subir fotos |
    | AD-02 apartado propio, orden y filtros, sin retirados | Sí | Lista, orden por estado y filtros |
    | AD-03 solo el autor cambia el estado | Sí | Cambio de estado |
    | AD-04 «Contactar» solo en ajeno «Busca hogar» | Sí | Abre el chat; sin botón en «Encontró hogar» |
    | AD-05 sin precio y con confirmación | Sí | Casilla obligatoria al publicar |
    | AD-06 espera, éxito, error y reintento | — | Error con backend apagado conserva lo escrito |
    | AD-07 reporte único con motivo | Sí (incluye concurrencia) | «Reporte guardado» y «Ya lo reportaste» |
    | AD-08 editar, retirar y restaurar con el mismo estado | Sí | Retirar, «Mis anuncios retirados» y restaurar |
    | AD-09 sin comentarios ni «Me gusta» | Sí | No se ofrecen |

    La paginación con más de 20 anuncios solo se comprobó en E2E. «Contactar» depende de las operaciones de Chat CH-T04 y CH-T07, ya verificadas; las notificaciones con la app cerrada (CH-T11), ahora trabajo futuro por D-157, no afectan a Adopción. El MVP guarda los reportes sin lectura del equipo.
  - **Aceptación:** cada criterio tiene resultado, fecha y entorno de verificación. Se comprueban API, permisos, almacenamiento privado y recorrido móvil con éxito y fallas; el reporte sigue íntegro tras editar o retirar, las fotos dejan de ser accesibles cuando corresponde y Chat se abre solo desde anuncios elegibles. No se marca la capacidad «Verificada» si falta algún criterio o una dependencia de Chat.
  - **Verificar:** `pnpm --filter proyecto-backend test --runInBand`, `pnpm --filter proyecto-backend test:e2e`, `pnpm backend:build`, `pnpm --filter mobile lint`, `pnpm --filter mobile exec tsc --noEmit` y recorrido en dispositivo; registrar limitaciones del entorno.
  - **Archivos previstos:** pruebas en `apps/backend/src/adoption/` y `apps/backend/test/`, comprobaciones móviles en `apps/mobile/` y registro de evidencia junto a la ficha.

- [x] **AD-T18. Actualizar inventarios con lo realmente implementado.** Depende de: AD-T17. Cubre trazabilidad de AD-01–AD-09.
  - **Aceptación:** la ficha, el plan, las tareas, la ruta de desarrollo, API y datos/permisos distinguen funciones verificadas de propuestas. Se registran fecha, entorno y evidencia por criterio; se anotan límites pendientes sin declarar completo un flujo parcial. El sistema web del equipo continúa como proyecto futuro independiente.
  - **Verificar:** comprobar enlaces, criterios y estado contra código y pruebas ejecutadas; `git diff --check`.
  - **Archivos previstos:** [ficha](../08-ADOPCION.md), [plan](01-PLAN.md), este archivo, [ruta](../../00-RUTA-DE-DESARROLLO.md), [API](../../05-API.md) y [datos](../../04-DATOS-Y-PERMISOS.md).

## Regla para seguir

Estas tareas están **aprobadas para una implementación futura, pero sin ejecutar**. La fase documental de Adopción quedó cerrada; el usuario decidirá por separado cuándo autoriza comenzar código. La ubicación visual exacta del apartado se revisará con la especificación de Diseño antes de construir pantallas; la lectura de reportes y cualquier medida del equipo se diseñarán en su proyecto web futuro.
