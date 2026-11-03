# Auditoría de Mi perfil y perfiles públicos — 26-10-2026

El usuario pidió revisar todos los casos de Mi perfil y búsqueda pública y confirmó las reglas propuestas de eliminación definitiva de comunidad y contenido. Esta auditoría revisa los criterios PE-01–PE-07 y separa pruebas automatizadas de los recorridos físicos pendientes.

## Cambios realizados

- Se implementó D-136 para salida y desactivación con una operación común. Se cuentan **todas** las membresías, incluidas las de cuentas inactivas. Solo un único integrante administrador permite borrar; otra membresía sin administrador activo mantiene el bloqueo.
- El borrado retira comunidad, publicaciones activas/retiradas (también de antiguos miembros), comentarios, likes, moderación vinculada, expulsiones y membresía en una transacción Serializable. Si otra comunidad impide desactivar, se revierte todo. Reactivar no recupera los datos borrados. No se tocan publicaciones generales, otras comunidades, identidades, avatares ni mascotas.
- Las fotos de publicaciones y comunidad se borran después del commit, por lotes de hasta 100 y sin duplicados. Cada lote se reintenta hasta tres veces; un fallo persistente se registra con bucket y rutas para intervención/reintento. **Límite:** no hay cola durable de limpieza; un fallo persistente o caída del proceso tras confirmar la base puede dejar archivos privados pendientes de limpieza, sin acceso desde la app. No se crean tablas ni proveedores nuevos para esta tarea.
- Mi perfil y la confirmación de salida explican el borrado irreversible. La respuesta de salida añade `communityDeleted`; la app confirma éxito y vuelve a Comunidades sin recargar un detalle borrado. Respuestas atrasadas de membresía no navegan desde otra pantalla.
- Se corrigió una carrera en cambios de avatar desde dos dispositivos: ahora la referencia anterior se lee y reemplaza en la misma transacción. La limpieza retira la foto desplazada y conserva la vigente.
- Se añadieron pruebas de la pantalla real de perfil público y de las reglas nuevas. La prueba general de rutas sin token simula JOSE (no verifica firmas en ese caso), evitando el fallo de carga ESM de Jest/Node 22; la suite de desactivación conserva el guard real con JWT/JWKS/Auth controlados.

## Casos contrastados

| Flujo | Casos y evidencia local |
| --- | --- |
| Mi perfil | Carga y fallo con reintento; correo propio de lectura; lectura inicial; entrar a edición; cancelar texto/estado; guardar una sola vez y alerta solo tras éxito; validación de nombre, biografía y estado; conflicto de nombre y campos prohibidos; conservar borrador ante fallo; ignorar respuesta atrasada. HTTP y scripts del componente real. |
| Fotos | JPEG/PNG/WebP, archivo inválido/truncado y límite de 5 MB; subir, reemplazar y quitar; guardado inmediato independiente del texto; selector único; fallo sin perder borrador; permiso de solicitante/dueño activo, sin URL interna ni caché compartida; cambios concurrentes sin borrar la foto vigente. Unitarias, HTTP y script de pantalla. |
| Buscar | Texto mínimo/máximo/vacío, coincidencias sin distinguir mayúsculas, páginas de 20 y máximo 30, cursores inválidos o de otra consulta, sin duplicados/inactivos/correos; error/reintento; lupa independiente y selección; X que limpia texto/resultados y descarta respuesta pendiente. HTTP y script de búsqueda. |
| Perfil público | Nombre, biografía, estado, foto y mascotas activas sin correo ni edición ajena; perfil inexistente/inactivo; sin foto/biografía/mascotas; error de foto o mascotas y reintento; paginación sin duplicados; regreso; respuesta antigua al cambiar de perfil descartada. HTTP y nueva prueba de pantalla real. |
| Desactivar/reactivar | Token ausente, inválido o revocado; petición repetida; dueño derivado de sesión; confirmación sin envío al cancelar; bloqueo y enlace para administrar; credenciales válidas/incorrectas; credenciales solo en memoria y descarte; refresh/logout/respuestas de otra cuenta; contenido activo que reaparece y retiradas que no reviven; roles conservados en comunidades no borradas. HTTP y script del hook real. |
| Comunidad única | No se borra al crearla; salida o desactivación borran contenido vinculado; general y otras comunidades intactos; cuenta sigue existiendo; reactivar no recupera la comunidad; miembro inactivo impide borrar; varias comunidades con bloqueo revierten también borrados y no limpian fotos; ingreso concurrente conserva comunidad con responsable o rechaza ingreso tras borrado; carreras con salida, rol y creación. HTTP con PostgreSQL. |

No se atribuye al usuario haber recorrido cada caso. Su conformidad con la X se limita a esa mejora; el resto conserva la evidencia indicada.

## Entorno y resultados

- PostgreSQL 17 desechable en Docker, puerto local 59126; nueve migraciones existentes aplicadas. Sin cambios en Supabase ni en la base compartida. Los dos contenedores temporales de esta revisión (uno no pudo arrancar por puerto bloqueado) y sus volúmenes se retiraron al terminar.
- HTTP: **9 suites, 63 pruebas aprobadas**, con `POST_TEST_DATABASE_URL` aislada y `node --experimental-vm-modules node_modules/jest/bin/jest.js --config test/jest-e2e.json --runInBand --silent`.
- Unitarias: **18 suites, 104 pruebas aprobadas**, con `node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand --silent`.
- Exportación iOS con Hermes aprobada: 1615 módulos, artefactos ignorados en `.local-tmp/export-ios-profiles-audit/`; no acredita ejecución física.
- Backend compilado, tipos móviles, `verify:profiles` (sesión, Mi perfil, Buscar y perfil público) y lint móvil dirigido aprobados.
- Se detectó que `PostView` figura en Prisma pero no tiene migración, como ya advertía Datos y permisos. La limpieza consulta si esa tabla existe antes de acceder; no se añadió ni se migró. La prueba utiliza el esquema real de las nueve migraciones. El primer fallo llevó a corregir esa compatibilidad; no se presenta como una prueba aprobada antes de corregirlo.
- Identidades y Storage se simulan en HTTP. Scripts móviles ejecutan componentes/hooks reales con servicios controlados, sin render nativo. No acreditan JWT/Storage reales ni la interfaz de iPhone/Android.

## Pendiente en teléfono

Recorrer edición/guardar/cancelar y alerta nativa, fotos reales y errores, teclado y área segura; búsqueda/paginación/perfil con y sin mascotas; desactivación/reactivación con sesión real y los avisos nuevos. Para borrar, usar comunidades de prueba con un único integrante; comprobar también que una membresía inactiva bloquea el caso. Comprobar que salir vuelve a Comunidades y que reactivar no recupera la comunidad borrada.

PE-T11–PE-T14 y CO-T19 conservan el cierre físico pendiente. Cuenta mantiene sus pruebas externas de correos/enlaces aplazadas. No se declara Perfiles verificada de punta a punta.

## Cierre funcional posterior — 26-10-2026

El usuario confirmó funcionamiento correcto de Perfiles, incluyendo expresamente borrar fotos y borrar una comunidad de un único miembro, y aceptación general del resto. Se combina con las pruebas previas para cerrar PE-T11–PE-T14 y CO-T19. No se le atribuye una lista de casos que no enumeró. Los pendientes físicos indicados antes de esta confirmación quedan sustituidos por el [registro de cierre](2026-10-26-CIERRE-PERFILES.md); Cuenta y los demás módulos mantienen sus pendientes propios.
