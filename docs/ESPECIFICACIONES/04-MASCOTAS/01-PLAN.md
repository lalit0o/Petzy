# Plan técnico aprobado: Mascotas (`mascotas`)

**Avance de Mascotas, 26-10-2026:** implementación local de MA-T09–MA-T11 reforzada: lista/detalle, formulario, menús anclados, teclado, foto con reintento sin duplicar una ficha ya confirmada y protección de respuestas atrasadas. Foto backend transaccional; pasan 64 HTTP, 104 unitarias, scripts móviles, tipos, lint y export iOS. MA-T09–MA-T12 siguen abiertas por recorrido real en teléfono; Perfiles conserva su cierre. [Informe](../../REVISIONES/2026-10-26-MASCOTAS.md).

**Estado:** plan aprobado el 9 de octubre de 2026 e implementación iniciada con la autorización del 19 de octubre. La migración, API y almacenamiento privado están implementados y probados localmente; las pantallas están creadas, pendientes de recorrido en dispositivo. Deriva de la [ficha funcional aprobada](../04-MASCOTAS.md), MA-01–MA-08 y D-02, D-12, D-19, D-36, D-42–D-47 y D-49–D-52. D-51 sustituyó D-48. El estado de cada paso está en las [tareas](02-TAREAS.md).

## Qué aprobó el usuario

1. **Cómo guardar el nacimiento:** se proponen cinco columnas nuevas para especie, raza, año, mes y día. El día queda vacío cuando solo se conoce mes y año. La futura migración eliminará `Pet.age`.
2. **Cómo mostrar la edad vigente:** el servidor la calcula desde el nacimiento cada vez que entrega una lista o ficha; no se guarda en la base. Se propone usar el día en UTC como referencia común; cerca de medianoche puede diferir unas horas de la fecha local.
3. **Quién puede ver o cambiar una ficha:** cualquier cuenta activa puede consultar mascotas activas de cuentas activas; solo el dueño puede crear, editar, desactivar o cambiar la foto. El servidor verifica el permiso en cada solicitud.
4. **Cómo manejar la foto:** una imagen opcional queda en almacenamiento privado. Petzy la entrega por una ruta protegida, sin publicar el enlace interno del archivo.

Estas decisiones técnicas quedaron aprobadas para el plan (D-52). El usuario autorizó programar después, el 19 de octubre de 2026.

## Qué cambiaría para quien usa Petzy

- En «Mis mascotas», la persona podrá agregar una ficha con nombre, especie, raza y nacimiento. Si sabe el día, lo indica; si solo sabe mes y año, Petzy los muestra como aproximados. Puede añadir foto y descripción, pero no necesita hacerlo.
- La edad aparecerá sin pedirla en el formulario. Petzy la calculará al consultar; una ficha con nacimiento aproximado siempre dirá «Edad aproximada». La futura migración quitará `Pet.age`.
- Otra persona con cuenta podrá ver las mascotas activas desde el perfil de su dueño, incluida la fecha exacta de nacimiento si se conoce. No podrá editarlas. Si la ficha o la cuenta del dueño se desactiva, dejará de verla, incluso por un enlace guardado.
- La foto se entregará solo después de comprobar la sesión y la actividad de la mascota y su dueño. Si una carga o edición falla, Petzy conservará el formulario y explicará cómo reintentar.

## Punto de partida histórico y dependencias

- `Pet` ya tiene `id`, `ownerId String`, `name`, `age Int`, `photo?`, `bio?` e `isActive`. No tiene especie ni datos de nacimiento. El DTO actual pide `ownerId` desde la app, lo valida como entero aunque la relación es cadena y acepta `age` desde el cliente. `POST/PATCH/DELETE /pet` no comprueban propiedad. `GET /user/:id/pets` devuelve fichas sin filtrar actividad. La pantalla de Mascotas solo muestra un título.
- La regla de cuenta activa y la sesión vienen de Cuenta y Perfiles; el complemento de mascota en Publicaciones viene de D-19 y el plan de Publicaciones. Mascotas será la fuente de verdad de los datos públicos de la ficha y de su foto. Publicaciones y Perfiles consumirán ese contrato, sin duplicar su cálculo de edad o permisos.
- El usuario confirmó que la app no está desplegada y no hay datos de personas reales. **Inventario MA-T01 (20-10-2026):** consulta agregada de solo lectura en la base de desarrollo conectada: 0 filas `Pet` y 0 referencias `Pet.photo`; no hay nacimientos que convertir ni fotos antiguas en ese entorno. El backend antiguo `/pet` acepta `ownerId` y `age` desde el cliente sin propiedad comprobada; `/user/:id/pets` ya se retiró al asegurar Perfiles. `Pet.age` se usa además en el fixture HTTP de Publicaciones, que deberá pasar al nuevo nacimiento. En móvil, «Mascotas» solo es una pantalla de título; Publicaciones consume `GET /users/me/pets` para elegir una ficha y `Post.petId` para enlazarla. No inventar fechas si otra base futura contiene filas.

## Datos y migración propuestos

La propuesta elimina el actual `Pet.age Int` y añade cinco columnas. `birthDay = null` significa que solo se conocen mes y año aproximados; si tiene valor, los tres componentes forman la fecha exacta. La app y la API nunca aceptan una edad escrita por el usuario.

| Columna | Tipo y nulabilidad propuestos | Motivo y valor para filas anteriores | Módulos afectados |
| --- | --- | --- | --- |
| `Pet.species` | `String`, obligatorio | Guarda Perro, Gato, Ave, Conejo u otra especie escrita; no imponer un enum cerrado. No hay valor por defecto inventado. Si hay filas de prueba, revisar su especie antes de exigir el campo. | Mascotas, Perfiles y resumen de Publicaciones. |
| `Pet.breed` | `String`, obligatorio | Guarda la raza indicada o los valores «Mestiza»/«Raza desconocida». No asignar una raza ficticia a filas anteriores. | Mascotas y perfil público. |
| `Pet.birthYear` | `Int`, obligatorio | Año de nacimiento exacto o aproximado. No deducirlo del antiguo `Pet.age`; revisar posibles filas de prueba antes de exigirlo. | Mascotas y edad calculada al consultar. |
| `Pet.birthMonth` | `Int`, obligatorio | Mes del 1 al 12. Sin valor por defecto para filas anteriores. | Mascotas y edad calculada al consultar. |
| `Pet.birthDay` | `Int?`, opcional | Día del nacimiento exacto; `null` indica que mes y año son aproximados. Las filas de prueba sin información no reciben un día inventado. | Mascotas, respuestas públicas y presentación de aproximación. |

No se agrega otra columna para precisión: `birthDay` distingue los dos casos. `Pet.photo String?` conserva una referencia interna al archivo privado, nunca una URL pública en la respuesta. `Pet.bio String?` permanece opcional. `Pet.ownerId` sigue siendo relación obligatoria con `User.id` y se obtiene del token. El vínculo opcional futuro `Post.petId` pertenece a la migración de Publicaciones; este plan no crea una segunda relación.

La migración se diseñará en un entorno de desarrollo identificado y será reversible. Primero se comprueba el número de filas `Pet` y los usos de `age` en backend, API, tipos y app. Si no hay filas, se añaden los campos obligatorios y las restricciones y se elimina `Pet.age`; los consumidores pasan a usar la edad calculada en la respuesta. Si aparecen filas de prueba, se documentan y se acuerda cómo completarlas o recrearlas antes de imponer campos obligatorios; no se plantea migración de personas reales. El plan no ejecuta SQL ni modifica el esquema.

Validar en servidor año no futuro, mes de 1 a 12 y día válido para ese mes y año, incluidos años bisiestos. Una fecha completa no puede ser posterior al día actual; mes/año aproximados no pueden estar después del mes actual. Rechazar combinaciones incompletas, texto vacío y valores fuera de D-49. La base puede añadir restricciones simples de rangos; la validación de calendario completo pertenece al servicio.

## Edad calculada al consultar

1. Guardar el nacimiento exacto o mes/año aproximados, sin guardar la edad. Al crear o corregir el nacimiento, el servidor valida esos datos; no escribe `age` en `Pet`.
2. Cada respuesta que muestre una mascota calcula los años con una misma función del backend a partir de `birthYear`, `birthMonth`, `birthDay` y el día actual. Listas, detalle y perfil usan esa función; Publicaciones recibe los datos de Mascotas si necesita mostrar la edad más adelante.
3. Con día exacto, los años cumplidos cambian al llegar el cumpleaños. Con solo mes y año, el cambio se estima al llegar ese mes y la respuesta marca siempre la edad como aproximada. No se crea un día ficticio.
4. Se propone usar el día en UTC como referencia común. La app muestra la edad enviada por la API, sin calcular otra con el reloj del teléfono. Como UTC puede diferir unas horas del día local, se comprobará expresamente en pruebas cercanas al cumpleaños.

No se necesita una tarea diaria ni una dependencia para programarla. La futura migración y el código eliminarán `Pet.age`; tampoco aceptarán una edad enviada desde móvil.

## API propuesta y permisos

Estas rutas son **propuestas** y aún no existen. Las rutas actuales `/pet` y `/user/:id/pets` no se considerarán seguras por ocultar botones: hay que actualizar o retirar sus consumidores y cerrar el acceso anterior sin propiedad comprobada.

| Operación futura | Resultado y validación | Quién puede usarla |
| --- | --- | --- |
| `GET /users/me/pets?cursor=&limit=` | Lista paginada de fichas propias activas; 20 por página por defecto, máximo 30. Edad vigente e indicador de aproximación. | Dueño con sesión y cuenta activa. |
| `GET /users/:id/pets?cursor=&limit=` | Mascotas activas de una cuenta activa, solo campos públicos de D-43; lista vacía si no tiene mascotas. | Otra persona con cuenta activa. |
| `POST /pets` | Crea con nombre, especie, raza y objeto de nacimiento exacto o aproximado; foto y descripción opcionales. El servidor asigna `ownerId` y devuelve la edad calculada; rechaza `ownerId` o `age` si el cliente intenta fijarlos. | Dueño con sesión y cuenta activa. |
| `GET /pets/:id` | Detalle público de una ficha activa con dueño activo; datos de nacimiento precisos o aproximados según D-43–D-44. Inexistente o inactiva no expone el contenido. | Persona con cuenta activa. |
| `PATCH /pets/:id` | Solo dueño: corrige campos permitidos; la respuesta calcula la edad desde el nacimiento vigente. Rechaza cambio de `ownerId`, `age` o `isActive` por esta vía. | Dueño activo de la ficha activa. |
| `DELETE /pets/:id` | Desactiva lógicamente con confirmación en la app; conserva la fila. Los listados, detalle, foto y complementos de publicaciones dejan de entregarla. | Dueño activo de la ficha activa. |
| `PUT /pets/:id/photo`, `DELETE /pets/:id/photo`, `GET /pets/:id/photo` | Agregar/reemplazar, quitar y leer una foto privada. La lectura comprueba sesión, mascota y dueño activos en cada solicitud. | Escritura del dueño; lectura de cuentas activas. |

La entrada de nacimiento se propone como `birth: { year, month, day? }`: `day` presente significa fecha exacta; ausente significa mes/año aproximados. Las respuestas incluirán esos componentes autorizados, `age` calculada y `isAgeApproximate` derivado de la ausencia de día, sin revelar `Pet.photo` como ruta interna. La foto se representa con una referencia a la ruta protegida de la API cuando existe. En el resumen de una publicación vinculada solo se entregan nombre, referencia de foto y acceso a la ficha mientras la mascota y su dueño sigan activos (D-19).

## Foto privada y errores de archivo

- Usar Supabase Storage privado para una foto opcional por mascota, JPEG/PNG/WebP hasta 5 MB (D-47). La app envía el archivo al backend; este valida contenido y tamaño reales, sesión y propiedad antes de subir. La clave de servidor nunca llega a la app.
- La ruta de lectura entrega los bytes tras comprobar permisos en cada petición y evita caché compartida; no devuelve URL pública ni ruta interna de Storage. Si se desactiva la ficha o el dueño, el siguiente acceso se deniega. El resumen público recibe una URL de la API, no un enlace a Storage.
- Al reemplazar, subir un objeto nuevo, actualizar `Pet.photo` y después retirar el antiguo. Si falla el guardado, limpiar el nuevo; si falla la limpieza posterior, registrar reintento. Quitar la foto pone `photo = null` antes de eliminar el archivo anterior. Una falla conserva los campos de texto en el formulario y muestra el motivo.
- Desactivar la ficha conserva su archivo privado por ahora, pero deja de entregarlo. No se propone aquí restaurar fichas desactivadas ni una política de retención nueva; si se define después, actualizar la ficha y el plan.

## Interfaz móvil y estado de solicitudes

- «Mis mascotas»: carga, lista, vacío útil con «Agregar mascota», error y «Reintentar». Mostrar solo fichas activas. Si falla una foto, mantener el resto de la tarjeta y mostrar imagen de respaldo.
- Crear/editar: campos y límites aprobados, selector de especie con «Otra», opciones de raza, selección de fecha exacta o mes/año aproximados, vista previa de foto y descripción opcional. Indicar envío y subida; prevenir doble envío. Si hay validación, falla de API o Storage, conservar lo escrito y la selección recuperable.
- Detalle propio y ajeno: mostrar «Nacimiento aproximado» y «Edad aproximada» cuando falte día, incluso después de editar o volver a abrir la app. Solo el dueño ve editar y desactivar, con confirmación; el servidor aplica el permiso aunque otra persona construya una solicitud directa.
- Al construir pantallas después, aplicar `apps/mobile/AGENTS.md`, `apple-design` y `async-feedback`. Esta etapa solo documenta el comportamiento.

## Orden futuro y verificación

1. Revisar esquema, filas de prueba y consumidores de rutas antiguas; preparar y revisar migración de `species`, `breed` y nacimiento, junto con la eliminación de `Pet.age`, sin adivinar fechas.
2. Introducir validaciones y una sola función de cálculo de edad para todas las respuestas; comprobar cumpleaños exacto, mes aproximado, bisiesto, cambio de año y consulta tras reiniciar el servidor.
3. Crear API de listas, detalle, alta, edición y desactivación con propiedad y cuenta activa comprobadas en servidor; probar con dos cuentas y lectura por ID directo.
4. Integrar foto privada y comprobar formato, tamaño, reemplazo, retirada, falla de Storage, caché y pérdida de acceso al desactivar ficha o cuenta.
5. Construir app con estados de espera, vacío, éxito, error y reintento; comprobar formulario sin foto, con foto y con fecha aproximada en un dispositivo.
6. Verificar MA-01–MA-08, integración con Perfiles y el complemento de mascota de Publicaciones; anotar evidencia, fecha y entorno. Actualizar API, datos y ruta solo con funciones comprobadas.

## Riesgos y puntos de revisión

| Riesgo | Comprobación prevista |
| --- | --- |
| Dos pantallas muestran edades distintas | Calcular en el backend al crear cada respuesta con la misma función y día de referencia; probar lista, detalle y perfil alrededor del cumpleaños. |
| Nacimiento aproximado se presenta como fecha exacta | Probar `birthDay = null` en lista, detalle, perfil y publicación; nunca rellenar día ficticio. |
| Una ruta antigua deja crear o editar la mascota de otra persona | Probar `/pet` y `/user/:id/pets` durante transición y retirar o asegurar cada ruta antes de dar la capacidad por verificada. |
| Foto expuesta tras desactivar mascota o dueño | Probar GET directo y Storage con sesión ausente, otra cuenta, mascota inactiva y dueño inactivo; respuesta sin caché compartida. |
| Datos de prueba impiden añadir columnas obligatorias | Contar filas en el entorno de desarrollo y resolverlas antes de ejecutar la migración, sin suponer datos reales. |

**Estado vigente del plan:** implementación autorizada y ampliada en esta sesión, sin nuevas tablas, migraciones ni contratos. La foto lee/cambia su referencia en una transacción Serializable y se limpia después del commit. Los formularios usan el menú anclado compartido, aviso de salida y Siguiente en el teclado numérico iOS. Las tareas móviles conservan el recorrido físico pendiente; el punto de partida descrito antes es histórico.
