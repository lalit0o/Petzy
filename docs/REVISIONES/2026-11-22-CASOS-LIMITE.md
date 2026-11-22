# Pruebas de casos límite de toda la API — 22-11-2026

**Qué se probó:** una suite E2E nueva (`apps/backend/test/edge-cases.e2e-spec.ts`) carga todos los módulos juntos (Publicaciones, comentarios y «Me gusta», Mascotas, Perfiles, Comunidades, Eventos, Chat y Adopción) sobre un PostgreSQL 16 desechable en Docker con todas las migraciones, y envía entradas en el límite: valores exactos en el máximo y uno más, campos vacíos o solo con espacios, IDs inválidos o gigantes, paginación fuera de rango, recursos ajenos, emoji, inyección SQL, HTML, cargas enormes y toques repetidos al mismo tiempo. La regla común: **ninguna entrada del cliente puede producir un error 5xx**.

**Cómo repetirlo:** con Docker encendido, crear la base desechable, `npx prisma migrate deploy` y `NODE_OPTIONS=--experimental-vm-modules npx jest --config ./test/jest-e2e.json --runInBand --forceExit` con `DATABASE_URL`, `DIRECT_URL` y `POST_TEST_DATABASE_URL` apuntando a esa base. La variable `EDGE_REPORT` (opcional) guarda la tabla en JSON.

## Resultado

- **Casos límite:** 197 de 197 pasan; **0 errores 5xx**.
- **E2E completas** (13 suites anteriores + la nueva): 14 suites, 117 pruebas, todas pasan. Pruebas unitarias del backend: 23 suites, 128 pruebas. Compilación del backend sin errores.

## Errores reales encontrados y corregidos

1. **ID mayor que el rango de la base → error 500** en publicaciones, mascotas, comunidades, eventos, chat y adopción (por ejemplo `GET /posts/2147483648`), y lo mismo con un cursor de paginación así. **Corrección:** `src/common/parse-id.pipe.ts` (`ParseIdPipe`) sustituye a `ParseIntPipe` en los 9 controladores y responde 400 «El identificador no es válido.»; los cursores numéricos de los DTO tienen `@Max(INT32_MAX)`.
2. **Buscar «%%» o «_» en perfiles devolvía todas las cuentas**, porque se usaban como comodines de SQL. **Corrección:** `UserService` escapa `\`, `%` y `_` antes de buscar, así que se buscan como texto.
3. **Varios «Iré» simultáneos de la misma persona:** el conteo quedaba bien (1), pero uno de los toques podía responder 409. **Corrección:** `serializableTransaction` espera un momento breve y aleatorio antes de reintentar, para que las solicitudes simultáneas no vuelvan a chocar.

## Observaciones (sin cambio de código)

- **Año de nacimiento muy antiguo (1800) se aceptaba.** La ficha solo prohibía fechas futuras. **Resuelto el mismo día con D-158:** el usuario fijó un tope de 40 años; ahora 1800 y hace 41 años responden 400 y hace 40 años se acepta.
- **«Me gusta» no recibe cuerpo** (`PUT` lo da y `DELETE` lo quita); un cuerpo inesperado se ignora y repetir la acción es idempotente.

## Tabla completa

### IDs y paginación

| Caso | Esperado | Obtenido | Resultado |
| --- | --- | --- | --- |
| publicación con id 0 | 400 / 404 | 404 | Pasa |
| publicación con id negativo | 400 / 404 | 404 | Pasa |
| publicación con id de texto | 400 | 400 | Pasa |
| publicación con id mayor a int32 (2147483648) | 400 / 404 | 400 | Pasa |
| publicación con id de 30 dígitos | 400 / 404 | 400 | Pasa |
| publicación con id decimal | 400 | 400 | Pasa |
| mascota con id mayor a int32 | 400 / 404 | 400 | Pasa |
| comunidad con id mayor a int32 | 400 / 404 | 400 | Pasa |
| evento con id mayor a int32 | 400 / 404 | 400 | Pasa |
| conversación con id mayor a int32 | 400 / 404 | 400 | Pasa |
| adopción con id mayor a int32 | 400 / 404 | 400 | Pasa |
| feed con limit=0 | 400 | 400 | Pasa |
| feed con limit=31 (máximo 30) | 400 | 400 | Pasa |
| feed con limit=30 (en el límite) | 200 | 200 | Pasa |
| feed con cursor de texto | 400 | 400 | Pasa |
| feed con cursor negativo | 400 | 400 | Pasa |
| feed con cursor mayor a int32 | 200 / 400 | 400 | Pasa |
| feed con categoría inexistente | 400 | 400 | Pasa |
| feed con parámetro desconocido | 200 / 400 | 400 | Pasa |
| comentarios con limit=1000 | 400 | 400 | Pasa |
| comunidades con limit negativo | 400 | 400 | Pasa |
| adopciones con cursor basura | 400 | 400 | Pasa |
| adopciones con estado inexistente | 400 | 400 | Pasa |

### Publicaciones

| Caso | Esperado | Obtenido | Resultado |
| --- | --- | --- | --- |
| título de 120 caracteres (límite) | 201 | 201 | Pasa |
| título de 121 caracteres | 400 | 400 | Pasa |
| título solo con espacios | 400 | 400 | Pasa |
| título vacío | 400 | 400 | Pasa |
| descripción de 3 000 caracteres (límite) | 201 | 201 | Pasa |
| descripción de 3 001 caracteres | 400 | 400 | Pasa |
| descripción de 100 000 caracteres | 400 / 413 | 400 | Pasa |
| título con emoji y acentos | 201 | 201 | Pasa |
| título con inyección SQL | 201 | 201 | Pasa |
| título con HTML/script | 201 | 201 | Pasa |
| enviar userId de otra persona | 400 | 400 | Pasa |
| categoría inválida | 400 | 400 | Pasa |
| categoría en minúsculas | 400 | 400 | Pasa |
| enlazar mascota de otra persona | 400 / 403 / 404 | 400 | Pasa |
| enlazar mascota inexistente | 400 / 404 | 400 | Pasa |
| enlazar mascota con id de texto | 400 | 400 | Pasa |
| editar publicación ajena | 403 / 404 | 404 | Pasa |
| retirar publicación ajena | 403 / 404 | 404 | Pasa |
| editar con cuerpo vacío | 200 / 400 | 200 | Pasa |
| comentario de 500 caracteres (límite) | 201 | 201 | Pasa |
| comentario de 501 caracteres | 400 | 400 | Pasa |
| comentario vacío | 400 | 400 | Pasa |
| comentario con saltos de línea solamente | 400 | 400 | Pasa |
| comentario numérico | 400 | 400 | Pasa |
| comentario en publicación inexistente | 404 | 404 | Pasa |
| «Me gusta» simultáneo #1 | 200 | 200 | Pasa |
| «Me gusta» simultáneo #2 | 200 | 200 | Pasa |
| «Me gusta» simultáneo #3 | 200 | 200 | Pasa |
| «Me gusta» simultáneo #4 | 200 | 200 | Pasa |
| «Me gusta» simultáneo #5 | 200 | 200 | Pasa |
| «Me gusta» simultáneo #6 | 200 | 200 | Pasa |
| «Me gusta» simultáneo #7 | 200 | 200 | Pasa |
| «Me gusta» simultáneo #8 | 200 | 200 | Pasa |
| «Me gusta» simultáneo #9 | 200 | 200 | Pasa |
| «Me gusta» simultáneo #10 | 200 | 200 | Pasa |
| 10 «Me gusta» simultáneos cuentan 1 | 1 | 1 | Pasa |
| «Me gusta» con cuerpo inesperado (se ignora) | 200 | 200 | Pasa |
| quitar «Me gusta» dos veces | 200 | 200 | Pasa |
| «Me gusta» en publicación inexistente | 404 | 404 | Pasa |

### Mascotas

| Caso | Esperado | Obtenido | Resultado |
| --- | --- | --- | --- |
| nombre de 2 caracteres (mínimo) | 201 | 201 | Pasa |
| nombre de 1 carácter | 400 | 400 | Pasa |
| nombre de 50 caracteres (máximo) | 201 | 201 | Pasa |
| nombre de 51 caracteres | 400 | 400 | Pasa |
| raza solo con espacios | 400 | 400 | Pasa |
| especie «Otra» sin decir cuál | 400 | 400 | Pasa |
| nacimiento en el futuro | 400 | 400 | Pasa |
| nacimiento el mes que viene | 400 | 400 | Pasa |
| mes 13 | 400 | 400 | Pasa |
| mes 0 | 400 | 400 | Pasa |
| 31 de febrero | 400 | 400 | Pasa |
| 29 de febrero de año bisiesto (2024) | 201 | 201 | Pasa |
| 29 de febrero de año no bisiesto (2023) | 400 | 400 | Pasa |
| año 1800 | 400 | 400 | Pasa |
| hace 40 años (límite, D-158) | 201 | 201 | Pasa |
| hace 41 años | 400 | 400 | Pasa |
| sin fecha de nacimiento | 400 | 400 | Pasa |
| enviar edad directamente | 400 | 400 | Pasa |
| enviar dueño de otra persona | 400 | 400 | Pasa |
| descripción de 300 caracteres (límite) | 201 | 201 | Pasa |
| descripción de 301 caracteres | 400 | 400 | Pasa |
| editar mascota ajena | 403 / 404 | 404 | Pasa |
| retirar mascota ajena | 403 / 404 | 404 | Pasa |
| ver ficha propia | 200 | 200 | Pasa |

### Perfiles

| Caso | Esperado | Obtenido | Resultado |
| --- | --- | --- | --- |
| buscar con 1 carácter | 400 | 400 | Pasa |
| buscar con 2 caracteres (mínimo) | 200 | 200 | Pasa |
| buscar con 51 caracteres | 400 | 400 | Pasa |
| buscar sin texto | 400 | 400 | Pasa |
| buscar «%%» (comodín SQL) | 200 / 400 | 200 | Pasa |
| «%%» no devuelve a todas las cuentas | 0 | 0 | Pasa |
| buscar con inyección SQL | 200 / 400 | 200 | Pasa |
| nombre de usuario de 2 caracteres | 400 | 400 | Pasa |
| nombre de usuario de 31 caracteres | 400 | 400 | Pasa |
| nombre de usuario de 30 caracteres (límite) | 200 | 200 | Pasa |
| biografía de 301 caracteres | 400 | 400 | Pasa |
| estado de México inexistente | 400 | 400 | Pasa |
| intentar cambiar el correo | 400 | 400 | Pasa |
| intentar volverse inactivo/activo por PATCH | 400 | 400 | Pasa |
| perfil público inexistente | 404 | 404 | Pasa |
| perfil público de otra persona | 200 | 200 | Pasa |
| el perfil público no expone el correo | 0 | 0 | Pasa |

### Comunidades

| Caso | Esperado | Obtenido | Resultado |
| --- | --- | --- | --- |
| nombre de 2 caracteres | 400 | 400 | Pasa |
| nombre de 61 caracteres | 400 | 400 | Pasa |
| nombre de 60 caracteres (límite) | 201 | 201 | Pasa |
| nombre repetido (permitido, D-72) | 201 | 201 | Pasa |
| descripción de 9 caracteres | 400 | 400 | Pasa |
| descripción de 501 caracteres | 400 | 400 | Pasa |
| tema de 1 carácter | 400 | 400 | Pasa |
| tema de 51 caracteres | 400 | 400 | Pasa |
| unirse simultáneo #1 | 200 / 201 | 201 | Pasa |
| unirse simultáneo #2 | 200 / 201 | 201 | Pasa |
| unirse simultáneo #3 | 200 / 201 | 201 | Pasa |
| unirse simultáneo #4 | 200 / 201 | 201 | Pasa |
| unirse simultáneo #5 | 200 / 201 | 201 | Pasa |
| 5 «Unirme» simultáneos dejan 1 membresía | 1 | 1 | Pasa |
| miembro intenta cambiar roles | 403 | 403 | Pasa |
| rol inexistente | 400 | 400 | Pasa |
| expulsarse a sí mismo | 400 / 403 / 409 | 400 | Pasa |
| miembro intenta expulsar | 403 | 403 | Pasa |
| único admin intenta salir | 200 / 400 / 409 | 400 | Pasa |
| salir sin ser miembro | 200 / 204 / 403 / 404 / 409 | 403 | Pasa |
| no miembro intenta publicar en la comunidad | 403 | 403 | Pasa |
| no miembro intenta leer publicaciones | 403 | 403 | Pasa |

### Eventos

| Caso | Esperado | Obtenido | Resultado |
| --- | --- | --- | --- |
| evento válido | 201 | 201 | Pasa |
| fin antes del inicio | 400 | 400 | Pasa |
| fin igual al inicio | 400 | 400 | Pasa |
| inicio en el pasado | 400 | 400 | Pasa |
| fin al día siguiente (permitido) | 201 | 201 | Pasa |
| latitud 91 | 400 | 400 | Pasa |
| latitud -90 (límite) | 201 | 201 | Pasa |
| longitud 181 | 400 | 400 | Pasa |
| coordenada como texto | 400 | 400 | Pasa |
| zona horaria inexistente | 400 | 400 | Pasa |
| fecha con formato inválido | 400 | 400 | Pasa |
| título de 121 caracteres | 400 | 400 | Pasa |
| lugar de 201 caracteres | 400 | 400 | Pasa |
| miembro (no admin/mod) crea evento | 403 | 403 | Pasa |
| no miembro crea evento | 403 | 403 | Pasa |
| respuesta de asistencia inválida | 400 | 400 | Pasa |
| no miembro confirma asistencia | 403 | 403 | Pasa |
| «Iré» simultáneo #1 | 200 | 200 | Pasa |
| «Iré» simultáneo #2 | 200 | 200 | Pasa |
| «Iré» simultáneo #3 | 200 | 200 | Pasa |
| «Iré» simultáneo #4 | 200 | 200 | Pasa |
| «Iré» simultáneo #5 | 200 | 200 | Pasa |
| 5 «Iré» simultáneos cuentan 1 | 1 | 1 | Pasa |
| miembro intenta cancelar | 403 | 403 | Pasa |
| cancelar dos veces | 200 / 201 | 200 | Pasa |
| segunda cancelación (no se repite) | 200 / 201 / 409 | 200 | Pasa |
| responder a un evento cancelado | 409 | 409 | Pasa |
| editar un evento cancelado | 409 | 409 | Pasa |

### Chat

| Caso | Esperado | Obtenido | Resultado |
| --- | --- | --- | --- |
| abrir chat consigo misma | 400 | 400 | Pasa |
| abrir chat con cuenta inexistente | 404 | 404 | Pasa |
| abrir chat sin userId | 400 | 400 | Pasa |
| abrir el mismo chat simultáneo #1 | 200 / 201 | 200 | Pasa |
| abrir el mismo chat simultáneo #2 | 200 / 201 | 200 | Pasa |
| abrir el mismo chat simultáneo #3 | 200 / 201 | 200 | Pasa |
| abrir el mismo chat simultáneo #4 | 200 / 201 | 200 | Pasa |
| abrir el mismo chat simultáneo #5 | 200 / 201 | 200 | Pasa |
| 5 aperturas simultáneas crean 1 conversación | 1 | 1 | Pasa |
| mensaje de 250 caracteres (límite) | 201 | 201 | Pasa |
| mensaje de 251 caracteres | 400 | 400 | Pasa |
| mensaje vacío | 400 | 400 | Pasa |
| mensaje solo con espacios | 400 | 400 | Pasa |
| mensaje con emoji | 201 | 201 | Pasa |
| clave de reintento con formato inválido | 400 | 400 | Pasa |
| mismo mensaje con la misma clave #1 | 200 / 201 | 201 | Pasa |
| mismo mensaje con la misma clave #2 | 200 / 201 | 201 | Pasa |
| reintento con la misma clave no duplica | 1 | 1 | Pasa |
| tercera persona lee la conversación | 404 | 404 | Pasa |
| tercera persona escribe | 404 | 404 | Pasa |
| reporte sin mensajes | 400 | 400 | Pasa |
| reporte con explicación de 501 caracteres | 400 | 400 | Pasa |
| reporte con mensaje de otra conversación | 400 / 404 | 400 | Pasa |
| bloquear y luego escribir | 403 / 409 | 403 | Pasa |
| leído con id de mensaje inexistente | 200 / 400 / 404 | 400 | Pasa |

### Adopción

| Caso | Esperado | Obtenido | Resultado |
| --- | --- | --- | --- |
| anuncio válido con 1 foto | 201 | 201 | Pasa |
| anuncio con 3 fotos (máximo) | 201 | 201 | Pasa |
| anuncio con 4 fotos | 400 | 400 | Pasa |
| anuncio sin fotos | 400 | 400 | Pasa |
| sin aceptar «solo adopción» | 400 | 400 | Pasa |
| título de 121 caracteres | 400 | 400 | Pasa |
| título solo con espacios | 400 | 400 | Pasa |
| descripción de 3 001 caracteres | 400 | 400 | Pasa |
| archivo que no es imagen | 400 | 400 | Pasa |
| imagen de más de 5 MB | 400 / 413 | 413 | Pasa |
| enlazar mascota ajena | 400 / 403 / 404 | 400 | Pasa |
| reportar anuncio propio | 400 / 403 | 400 | Pasa |
| reporte sin motivo | 400 | 400 | Pasa |
| reporte con motivo inexistente | 400 | 400 | Pasa |
| reportar anuncio ajeno | 200 / 201 | 201 | Pasa |
| reportar dos veces el mismo anuncio | 200 / 201 / 409 | 409 | Pasa |
| reporte con explicación de 501 caracteres | 400 | 400 | Pasa |
| editar anuncio ajeno | 403 / 404 | 403 | Pasa |
| estado inválido | 400 / 404 | 404 | Pasa |

Límites de esta prueba: no recorre la app en el teléfono ni Supabase Auth real (la identidad se inyecta como en las demás E2E); las fotos usan almacenamiento simulado.
