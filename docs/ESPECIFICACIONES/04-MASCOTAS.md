# Especificación: mascotas (`mascotas`)

**Cierre funcional, 3-11-2026:** Mascotas queda **Verificada para el alcance aprobado**: MA-T01–MA-T12 cerradas. El usuario confirmó el recorrido en un teléfono físico con su cuenta real de Supabase, probando alta/edición/desactivación de ficha, foto y fecha aproximada, e integración con Perfil y Publicaciones. [Registro de cierre](../REVISIONES/2026-11-03-CIERRE-MASCOTAS.md).

**Avance de Mascotas, 26-10-2026:** implementación local de MA-T09–MA-T11 reforzada: lista/detalle, formulario, menús anclados, teclado, foto con reintento sin duplicar una ficha ya confirmada y protección de respuestas atrasadas. Foto backend transaccional; pasan 64 HTTP, 104 unitarias, scripts móviles, tipos, lint y export iOS. [Informe](../REVISIONES/2026-10-26-MASCOTAS.md).

**Contrato:** ficha funcional aprobada por el usuario el 9 de octubre de 2026 y ajustada por D-51; [plan técnico](04-MASCOTAS/01-PLAN.md) y [tareas](04-MASCOTAS/02-TAREAS.md) aprobados · **Código:** migración, API, foto privada y pantallas móviles verificadas en dispositivo · **Prioridad:** MVP, paso 4 · **Depende de:** `cuenta`, `perfiles`. [Mapa](../../MAPA-CAPACIDADES.md).

## Objetivo

El dueño crea una ficha fácil de reconocer para cada mascota, la consulta y la corrige cuando cambian sus datos. La edad se presenta correctamente con el paso del tiempo.

**Ejemplo:** Ana registra a Luna con su fecha exacta de nacimiento. Luna aparece en «Mis mascotas»; cuando llega su cumpleaños, Petzy muestra la edad nueva la próxima vez que se consulte la ficha, sin que Ana tenga que editarla. Si Ana solo conoce el mes y el año, los registra como aproximados: Petzy muestra «Nacimiento aproximado: mayo de 2023» y una edad aproximada, sin inventar un día. Luis puede consultar los datos públicos de Luna mientras la cuenta de Ana siga activa, pero no puede cambiar su ficha. Si Ana desactiva su cuenta, la ficha de Luna queda guardada pero oculta hasta que Ana la reactive (D-36).

## Contrato de flujos

**Registrar mascota (RF-M01; MA-01–MA-04).** Actor: usuario autenticado que registra su mascota. Entradas obligatorias: nombre de 2 a 50 caracteres, especie, raza de 2 a 50 y fecha exacta de nacimiento o mes y año aproximados; foto opcional y descripción opcional de hasta 300 (D-42, D-44, D-49). Para especie elige Perro, Gato, Ave, Conejo u «Otra» y, en ese caso, escribe cuál con 2 a 50 caracteres; si no conoce la raza, puede elegir «Mestiza» o «Raza desconocida» (D-45–D-46). Petzy distingue una fecha exacta de una aproximada: nunca inventa un día. Se rechaza una fecha o mes futuros y el propietario se deriva de la sesión. La persona **no introduce la edad**: Petzy la calcula cuando entrega la ficha y señala cuando es aproximada; no guarda un número de años en `Pet` (D-50–D-51). Resultado: ficha persistida en «Mis mascotas». Errores: datos inválidos, foto fallida si se eligió una o API inaccesible; conservar lo escrito y mostrar reintento.

**Listar y consultar ficha (RF-M02–M03; MA-01–MA-02, MA-06).** Actor: dueño; otra persona con cuenta activa solo ve mascotas activas de un dueño activo. Entradas: sesión y, para detalle, ID de mascota. Resultado: lista o ficha con datos actuales y edad vigente; un dueño sin mascotas ve estado vacío útil. En el perfil ajeno se muestran nombre, especie, raza, edad, foto si existe, descripción si existe y fecha de nacimiento exacta cuando se conoce; para una fecha aproximada se muestran solo mes y año y «Edad aproximada» (D-43–D-44, D-50). Errores: recurso inexistente, sesión vencida, carga fallida y reintento. Este detalle complementa los datos del usuario aprobados en [Perfiles](03-PERFILES.md).

**Editar o desactivar (RF-M03–M04; MA-03–MA-05).** Actor: dueño. Precondición: ficha propia activa. Entradas: cambios autorizados o confirmación de desactivación. Resultado: ficha actualizada o retirada de listados normales; otro usuario recibe denegación desde la API. Las publicaciones que mostraban esa ficha permanecen, pero dejan de mostrar su nombre, foto y enlace (D-19). Errores: datos inválidos, fallo de foto o red, sin perder cambios no guardados.

**Foto opcional (D-47).** El dueño puede agregar, cambiar o quitar una imagen JPEG, PNG o WebP de hasta 5 MB. La foto queda en un espacio privado; al consultarla, el servidor comprueba la sesión y que tanto la mascota como su dueño sigan activos. Si falta foto, Petzy muestra una imagen de respaldo. Un archivo inválido o una carga fallida se explica junto al formulario y no borra los otros datos.

Aplican especialmente RNF-S01, RNF-S04–S05, RNF-I02 y RNF-Q02–Q04 de [01-PROYECTO.md](../01-PROYECTO.md).

## Decisiones confirmadas

- Cada mascota pertenece a una cuenta y solo su dueño puede crearla, editarla o desactivarla.
- El registro exige nombre, especie, raza y datos de nacimiento; foto y descripción son opcionales. Se pide fecha exacta de nacimiento o, si no se conoce el día, mes y año aproximados. La persona no escribe la edad: el servidor la calcula con los datos de nacimiento y la fecha actual cada vez que entrega la ficha, sin guardarla en `Pet` (D-02, D-42, D-44, D-51). «Mestiza» y «Raza desconocida» cumplen el campo de raza; «Otra» especie pide escribir cuál (D-45–D-46).
- El dueño puede consultar una lista de sus mascotas y abrir cada ficha. Una persona con cuenta activa puede ver las mascotas activas de otro dueño activo desde su perfil, con los datos públicos definidos en D-43.

## Flujos esperados

1. En «Mis mascotas», el dueño ve fichas activas o un estado vacío con acción «Agregar mascota».
2. En el formulario captura nombre, especie, raza y fecha exacta o mes y año aproximados; puede elegir una foto. La app indica los campos obligatorios y rechaza datos de nacimiento futuros o de hace más de 40 años (D-158).
3. En el detalle ve los datos y la edad calculada, marcada como aproximada cuando corresponde; puede editar la ficha o desactivarla con confirmación.
4. Tras reiniciar la app, los cambios persisten. Una mascota desactivada no aparece en listas normales.

La interfaz considera carga, errores de red, fallo de foto y ausencia de foto. El servidor calcula la edad al consultar a partir de la fecha exacta o del mes y año conocidos. Con datos aproximados muestra «Edad aproximada: N años» y «Nacimiento aproximado: mes de año», sin día inventado (D-50–D-51).

## Criterios de aceptación

| ID | Resultado comprobable |
| --- | --- |
| MA-01 | Para guardar una mascota se requieren nombre de 2–50 caracteres, especie, raza de 2–50 y fecha exacta o mes y año aproximados; foto y descripción de hasta 300 son opcionales. «Mestiza» y «Raza desconocida» son respuestas válidas, y «Otra» especie exige escribir cuál con 2–50 caracteres. Después de guardar, aparece en «Mis mascotas». Si no tiene foto, se muestra una imagen de respaldo. |
| MA-02 | La persona no introduce la edad. Cada vez que se consulta la ficha, el servidor calcula los años desde los datos de nacimiento y la fecha actual; no lee ni guarda `Pet.age`. Una fecha exacta permite mostrar los años cumplidos después del cumpleaños; con solo mes y año, muestra «Edad aproximada: N años» y «Nacimiento aproximado: mes de año» sin inventar un día. |
| MA-03 | Si alguien indica fecha o mes y año posteriores a hoy, Petzy explica el error y no guarda la ficha hasta corregirla. |
| MA-04 | Solo quien registró la mascota puede editarla o desactivarla. Una segunda cuenta recibe una denegación aunque envíe la solicitud directamente al servidor. |
| MA-05 | Cuando el dueño desactiva una ficha, esta deja de aparecer en «Mis mascotas» y en perfiles públicos normales. Las publicaciones antiguas permanecen, pero ya no muestran ni enlazan a esa mascota (D-19). |
| MA-06 | Al abrir el perfil de otra persona activa, solo se muestran sus mascotas activas: nombre, especie, raza, edad, foto y descripción si existen, y fecha exacta de nacimiento si se conoce. Si solo se conoce mes y año, se muestran como aproximados. Si esa persona no tiene mascotas, su perfil sigue disponible y lo indica con claridad. |
| MA-07 | Si el dueño desactiva su cuenta, sus fichas de mascota dejan de aparecer en listas, perfiles y detalles por ID, aunque cada ficha continúe guardada y activa individualmente. Al reactivar la cuenta, reaparecen solo las fichas que no estaban desactivadas por sí mismas (D-36). |
| MA-08 | La foto opcional acepta solo JPEG, PNG o WebP hasta 5 MB. Otra cuenta activa puede verla solo mientras la ficha y su dueño sigan activos; pedirla por enlace directo sin sesión o desde una cuenta desactivada no entrega el archivo. Una carga fallida conserva los demás datos del formulario. |

## Estado del código y decisiones pendientes

Desde el 20-10-2026, `Pet` guarda especie, raza y nacimiento, y ya no guarda `age`. La API toma `ownerId` de la sesión, calcula edad al responder y rechaza `ownerId` o `age` enviados en el cuerpo. Las rutas antiguas `/pet` se retiraron.

El usuario indicó que la app aún no se ha desplegado y que no hay datos de personas reales en la base. Se comprobó que la base de desarrollo conectada tenía 0 filas `Pet` antes de aplicar la migración `20261020122500_pet_birth_fields`; no se inventaron fechas. Si otra base futura tiene filas, la migración se detiene para revisarlas. D-42–D-47 y D-49–D-51 fijan campos, visibilidad, fotos, límites y presentación de edad. D-48 quedó sustituida por D-51. D-19 define el caso de publicaciones relacionadas con una ficha desactivada.

No se exige registrar una mascota para crear cuenta o participar en feed, comunidades y eventos (D-12). Esta ficha cubre la integración de mascotas con el perfil; el contrato básico del perfil puede verificarse antes.

## Tecnología y estructura

Expo 58, React Native y TypeScript en `apps/mobile/app/(tabs)/mascotas.tsx` y `apps/mobile/app/pets/`; NestJS 11 en `apps/backend/src/pet`; Prisma 7 y `Pet` en `apps/backend/prisma/schema.prisma`; Supabase Storage privado `pet-photos` para fotos (D-47). Pruebas backend junto a los servicios (`*.spec.ts`) y E2E en `apps/backend/test`. El flujo móvil se comprobó en dispositivo físico con sesión real (3-11-2026).

## Comandos

Desde la raíz: desarrollo `pnpm backend` y `pnpm mobile`; compilación `pnpm backend:build`; unitarias `pnpm --filter proyecto-backend test --runInBand`; E2E con entorno preparado `pnpm --filter proyecto-backend test:e2e -- --runInBand`; lint móvil `pnpm --filter mobile lint`. Para un esquema aprobado, `pnpm --filter proyecto-backend exec prisma migrate dev` y luego `pnpm --filter proyecto-backend exec prisma generate` en base de desarrollo identificada.

## Estilo de código

TypeScript, DTO para entradas, clases `PascalCase`, propiedades `camelCase`, validación de servidor y desactivación explícita. Ejemplo real del patrón de consulta en publicaciones, aplicable a fichas activas:

```ts
where: { id, isActive: true }
```

El propietario de una ficha se deriva del token, no del cuerpo del DTO.

## Estrategia de pruebas

Unitarias para fecha o mes futuros, edad calculada al consultar antes y después del cumpleaños, y edad aproximada sin día inventado; E2E con dos cuentas para crear, leer, editar y desactivar; prueba de migración que compruebe que se retiró `Pet.age` en una base de desarrollo, sin suponer datos reales; recorrido móvil para carga, vacío, foto fallida, API apagada, reintento y persistencia tras reiniciar. No se fija cobertura porcentual global inexistente en el repositorio.

La cobertura exigida para aprobar esta capacidad es evidencia de MA-01 a MA-08, incluida migración, foto privada y propiedad entre dos cuentas; no se fija un porcentaje global de líneas.

## Límites de actuación

- **Siempre:** comprobar propiedad en API, filtrar inactivas, conservar formulario ante error y actualizar API/datos al cambiar contrato.
- **Consultar antes:** columnas `species`, `breed` y datos de nacimiento exactos o aproximados con tipo, nulabilidad, valor para filas existentes y migración; límites de texto y detalle de almacenamiento, reemplazo y retirada de fotos.
- **Nunca:** aceptar la edad desde el móvil, inventar cumpleaños a partir del antiguo `Pet.age`, conservar ese campo como dato persistido ni confiar en `ownerId` enviado por móvil. Calcular la edad cuando se consulta.
