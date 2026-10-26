# Publicaciones: aceptación del teléfono e integración comunitaria

**Fecha:** 25 de octubre de 2026.

El usuario confirmó expresamente que ya recorrió el flujo en su teléfono, que funciona y que la retroalimentación anterior correspondía a esa revisión. Se acepta como revisado el flujo general de Publicaciones e Interacciones: Inicio, formulario, fotos, detalle, comentarios, ocultados, conteos, navegación y ajustes de interfaz realizados en esta conversación. No se le pide repetir ese recorrido. Su confirmación no se atribuye a pantallas de Comunidades que todavía no existían al hacerla.

## Aceptación final del usuario

El usuario acepta el funcionamiento de Feed y Publicaciones, incluida la integración comunitaria, y reserva los retoques visuales de Comunidades para su módulo. Se combina esta aceptación con la evidencia ya registrada de 52 pruebas HTTP, 97 unitarias, tipos, lint dirigido y empaquetado iOS. No se atribuye al usuario una lista de casos por rol que no enumeró. Publicaciones e Interacciones quedan cerradas para su alcance aprobado. Los estados pendientes descritos durante la continuación son históricos; la siguiente aceptación resuelve la revisión funcional que faltaba. Los ajustes de diseño de Comunidades se siguen en sus propias tareas.

## Trabajo terminado en esta continuación

- Se cierra PU-T10, PU-T11 y PU-T14. Publicaciones tiene PU-T01–PU-T12 y PU-T14 cerradas; PU-T13 ya tiene código integrado y PU-T15 conserva su cierre integral condicionado a la revisión de las nuevas pantallas comunitarias.
- Se cierran IN-T03–IN-T11: acceso, páginas de comentarios, escritura propia, ocultación/restauración general y comunitaria, likes y componente móvil compartido. IN-T12–IN-T13 mantienen la revisión e integración final de la administración comunitaria.
- Se implementó la base comunitaria que faltaba para conectar esas pantallas: exploración, búsqueda, creación y edición de textos, vista previa, unión/salida, integrantes, roles, expulsión/desbloqueo y protección concurrente del último administrador.
- El detalle comunitario abre publicaciones y el formulario existente en su contexto correcto. El autor mantiene edición y retirada propia; administradores/moderadores pueden retirar posts y ocultar comentarios ajenos. Solo `ADMIN` ve contenido retirado y lo restaura. La pantalla reutiliza la misma tarjeta de comentarios visibles y ocultados, el menú anclado aprobado y el contenedor con ajuste de teclado.
- La API de comunidades, Publicaciones y moderación de comentarios comparten `CommunityAccessService`. Los expulsados o exmiembros no pueden acceder a posts, fotos, comentarios ni likes por ID. Las acciones siguen autorizándose en servidor, incluso si el rol cambió mientras la pantalla estaba abierta.

## Datos y contrato

La consulta de solo lectura en desarrollo encontró **0 comunidades y 0 fotos comunitarias** antes de migrar. D-74 ya autorizaba `Community.topic String` obligatorio, `CommunityExpulsion` y el índice de miembros. La migración `20261026070000_community_topic_expulsions` se aplicó a PostgreSQL local aislado y al entorno de desarrollo después de comprobar otra vez que las tablas afectadas estaban vacías. El respaldo de esas tablas quedó en `.local-backups/community-before-20261026.json`, sin credenciales. No se modificaron cuentas, posts, comentarios ni fotos existentes. La migración se ejecuta en transacción y se detiene si encuentra comunidades anteriores para no inventarles temas.

Se implementaron las rutas aprobadas de exploración, detalle, textos, membresías, miembros, roles y expulsiones de `/communities`. La respuesta de vista previa incluye ID, nombre, descripción, referencia de foto si existe, conteo activo y rol propio; el tema solo se entrega al administrador para edición. Las fotos propias de comunidades y sus rutas siguen pendientes; no se creó un bucket nuevo ni se anuncia que esos archivos ya se puedan subir.

`GET /communities/:id/moderation/posts` entrega ahora `{ items, nextCursor }`, con 20 filas por defecto y máximo 30; se actualizaron controlador, consumidores móviles y pruebas juntos. Los ocultados de comentarios conservan su contrato paginado. La medida del límite de comentarios se alineó entre DTO y contador móvil: hasta 500 unidades UTF-16, también al editar; no se mide por bytes. Se probaron 500 letras, 250 emojis de dos unidades y el rechazo de 251 de esos emojis.

## Evidencia de Publicaciones

| Criterios | Evidencia vigente |
| --- | --- |
| FE-01, FE-06, FE-07, FE-09, FE-10 | HTTP con filtros, páginas estables, categorías, Inicio separado de comunidades y usuarios sin mascota; recorrido general en teléfono aceptado por el usuario. |
| FE-03, FE-04, FE-08, FE-12 | Formulario compartido; HTTP con creación/edición, autor del token, campos obligatorios, límites, mascota propia, foto y permisos; pruebas unitarias de formatos/Storage/limpieza; recorrido general aceptado. |
| FE-02 | API y nueva pantalla comunitaria con membresía, separación y pérdida de acceso; comprobación HTTP y empaquetado iOS. Revisión visual de esta pantalla nueva pendiente. |
| FE-05 | Ciclo HTTP de post moderado/restaurado, autor desactivado/reactivado y comentarista desactivado/reactivado: detalle, foto, comentarios y likes se niegan mientras no hay acceso; los registros se conservan. Un comentario retirado individualmente no revive. |
| FE-11, FE-13 | API con miembro/moderador/administrador, dos comunidades, retirada propia excluida y restauración; nuevas opciones del detalle y vista administrativa integradas. Falta revisión física de esas pantallas recién creadas, no del flujo general ya aceptado. |

## Verificación ejecutada

- **52 pruebas HTTP**, ocho suites del backend, pasan con `POST_TEST_DATABASE_URL` apuntando únicamente al contenedor desechable PostgreSQL 16. Las identidades y Storage se simulan en estas suites; no se confunden con una sesión real en Supabase. Se incluyen 44 comentarios visibles, 33 ocultados paginados, 33 integrantes activos, concurrencia de ocultar/restaurar y salidas/cambios de rol, expulsiones y pérdida de acceso.
- **97 pruebas unitarias**, 16 suites, pasan. Se corrigió solo el tipo del mock en `supabase.service.spec.ts` para poder ejecutarlas todas con los tipos actuales del SDK.
- TypeScript del backend completo y móvil pasan. ESLint de los archivos móviles afectados pasa. El lint global conserva errores anteriores en hooks ajenos a este cambio; no se declara limpio todo el repositorio.
- `apps/mobile/scripts/verify-post-interactions.cjs`, ejecutable con `pnpm --filter mobile verify:interactions`, pasa. Ejecuta el componente real con hooks y transporte simulados: envío, doble toque, respuesta atrasada, edición, likes, retirada, ocultación/restauración, borradores y permisos visuales de autor/miembro/moderador/administrador. No es un render nativo.
- La exportación iOS pasa e incluye las nuevas rutas. La API local reconoce `/communities` y devuelve 401 sin sesión, conservando la guardia global.

Comandos desde `apps/backend`, con base temporal preparada y las variables apuntando a ella:

```powershell
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand --silent
node --experimental-vm-modules node_modules/jest/bin/jest.js --config test/jest-e2e.json --runInBand --silent
node node_modules/typescript/bin/tsc --noEmit
node node_modules/@nestjs/cli/bin/nest.js build
```

## Estado final y trabajo posterior

**Publicaciones e Interacciones cerradas:** PU-T01–PU-T15 e IN-T01–IN-T13 completadas con evidencia técnica y aceptación funcional del usuario. Los retoques visuales de Comunidades se aplazan a CO-T13–CO-T15 y no bloquean este cierre. Comunidades conserva además foto propia, integración de desactivación de cuenta y sus restantes criterios; Cuenta mantiene las pruebas de correo y build instalado previamente aplazadas.
