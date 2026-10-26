# Revisión de Publicaciones e Interacciones — 25 de octubre de 2026

El usuario informó que había probado varias acciones y funcionaban correctamente. Solicitó una segunda revisión de publicar, comentar y retirar contenido. Se revisaron creación, edición, retirada, fotos, categorías, paginación, comentarios, ocultación/restauración y «Me gusta», incluyendo errores y permisos. Su reporte se conserva como evidencia de uso, sin atribuirle casos que no enumeró.

## Problemas encontrados y corregidos

| Situación | Problema confirmado | Corrección y evidencia |
| --- | --- | --- |
| Restaurar un comentario ocultado | Al añadir la condición de comentario inactivo se reemplazaba el filtro de publicación/comunidad. Se podía restaurar desde otra ruta. | Se combinan las condiciones mediante `AND`. Una prueba HTTP recibió 201 donde debía recibir 404 antes del cambio; ahora rechaza otra publicación y una comunidad ajena al comentario, y permite el contexto correcto. |
| Guardar una publicación con foto y fallar la consulta posterior de reacciones | La limpieza eliminaba la foto nueva aunque la base ya la hubiera guardado. También afectaba reemplazos. | La limpieza de la foto nueva se limita al fallo de escritura. Dos pruebas unitarias fallaron antes y pasan después; una falla posterior al guardado conserva el archivo al que apunta la base. |
| Editar categoría, título o descripción enviando `null` | La validación parcial omitía los nulos. La categoría llegaba a Prisma y producía 500; los textos se ignoraban. | Los campos requeridos enviados se validan también ante nulos. Prueba HTTP reproducida con 500 y corregida a 400, conservando el contenido anterior. Los campos opcionales mantienen su tratamiento propio. |
| Cuenta desactivada con comentarios ocultados | La lista de ocultados podía mostrar su nombre y texto, pese a la regla de desactivación. | Las listas general y comunitaria filtran autores activos. Prueba HTTP reproducida antes del cambio; después oculta el comentario y vuelve a permitir consultarlo tras reactivar la cuenta. |
| «Cargar más» tras retirar o restaurar el elemento usado como cursor | La app podía insistir en un cursor que ya no pertenecía a la lista. | Ante ese 400 al paginar, Inicio, comentarios y ocultados reinician la consulta una vez. Cambiar comentarios recarga primera página y total; restaurar recarga también ocultados. |
| Respuestas atrasadas, páginas superpuestas y escritura durante el envío | Una respuesta anterior podía sobrescribir comentarios recientes; podía haber duplicados al combinar páginas y borrarse un borrador escrito durante la espera. | Se ignoran respuestas anteriores, se evitan IDs duplicados y se conserva el borrador nuevo. La recarga secundaria no mantiene la acción como «enviando» después del éxito. El detalle también ignora respuestas de una visita anterior. |

Se mantienen las reglas aprobadas: autor derivado de sesión, permisos en servidor, fotos privadas, una foto como máximo, comentarios activos de cuentas activas y retirada lógica. No se agregó esquema, migración, proveedor ni funcionalidad de Comunidades.

## Verificación realizada

| Comprobación | Resultado y alcance |
| --- | --- |
| Migraciones | Ocho migraciones aplicadas a PostgreSQL 16 temporal, sin volúmenes, expuesto solo en `127.0.0.1:55432`. No se usó la base de la app. |
| HTTP con PostgreSQL real | **26 pruebas pasan**: `posts.e2e-spec.ts` e `interactions.e2e-spec.ts`. Categorías, separación Inicio/comunidades, páginas, permisos, creación/edición/retirada, mascota propia, archivos adjuntos y límites, acceso a fotos, comentarios, texto editado, ocultación/restauración, conteos y likes repetidos. Identidad y Storage simulados: no es un recorrido real de Supabase Auth/Storage ni de la app. |
| Unitarias relacionadas | **31 pruebas pasan**, cinco suites de Publicaciones, fotos, controlador/servicio de comentarios y guardia de autenticación. Incluyen limpieza de fotos ante errores. Los mensajes de error de Storage impresos son fallos provocados por las pruebas. |
| Lógica móvil | Componente real `PostInteractions` con hooks y transporte controlados: crear, doble toque, respuesta atrasada, editar, dar/quitar like, retirar, ocultar/restaurar, conservar borradores, cursor inválido y pérdida de acceso. Pasa; no hay render nativo ni teclado real. Ejecutor local en `.local-tmp/audit-post-interactions.cjs`, artefacto ignorado, no fuente requerida. |
| Adjuntos Expo 57 | Diez solicitudes HTTP locales pasan con el serializador de Expo y bytes JPEG/PNG/WebP: publicación general/comunitaria, edición, JSON sin foto, avatar, mascota y errores. El `File` nativo está simulado. Ejecutor local `.local-tmp/verify-photo-upload.cjs`. |
| Tipos y lint | TypeScript móvil y tipos de producción backend pasan; ESLint de Inicio, detalle y `post-interactions.tsx` pasa. El chequeo global backend ya tenía errores de tipos en `supabase.service.spec.ts`; no se declara que ese chequeo global pase. |

Para repetir HTTP, preparar una base aislada con las migraciones y definir `POST_TEST_DATABASE_URL` exclusivamente para ella. Las suites crean y limpian sus registros. Desde `apps/backend`:

```powershell
node --experimental-vm-modules node_modules/jest/bin/jest.js --config test/jest-e2e.json --runInBand --silent --testPathPatterns 'interactions.e2e-spec.ts|posts.e2e-spec.ts'
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand --silent --testPathPatterns 'post|comments|likes|supabase-auth.guard'
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.build.json
```

Este entorno requirió módulos VM de Node para Prisma 7 en Jest. Para `prisma migrate deploy`, se resolvió `dotenv/config` mediante `NODE_PATH` desde la copia ya instalada en el workspace; no se agregaron dependencias. El contenedor temporal se detuvo y eliminó al finalizar; no se detuvieron otros contenedores.

## Alcance pendiente

No se controló un iPhone. Quedan los recorridos físicos de teclado, fotos, accesibilidad y movimiento; Supabase Auth/Storage con sesión real; y la futura integración administrativa y navegación de Comunidades. No se declaran Publicaciones ni Interacciones como capacidades verificadas ni se cierran automáticamente sus tareas pendientes.
