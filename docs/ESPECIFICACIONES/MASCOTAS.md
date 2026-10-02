# Especificación: mascotas (`mascotas`)

**Contrato:** borrador, pendiente de revisión · **Código:** modelo y endpoints parciales; pantalla marcador de posición · **Prioridad:** MVP, paso 4 · **Depende de:** `cuenta`, `perfiles`. [Mapa](../../MAPA-CAPACIDADES.md).

## Objetivo

El dueño crea una ficha fácil de reconocer para cada mascota, la consulta y la corrige cuando cambian sus datos. La edad se presenta correctamente con el paso del tiempo.

## Contrato de flujos

**Registrar mascota (RF-M01; MA-01–MA-04).** Actor: usuario autenticado que registra su mascota. Entradas previstas: nombre, especie, raza, fecha de nacimiento y foto. La obligatoriedad de raza/foto está **pendiente**; no convertirla en validación por inferencia. Se rechaza una fecha futura y el propietario se deriva del token. Resultado: ficha persistida en «Mis mascotas» y edad calculada desde la fecha. Errores: datos inválidos, foto fallida, API inaccesible o migración no preparada; conservar lo escrito y mostrar reintento.

**Listar y consultar ficha (RF-M02–M03; MA-01–MA-02, MA-06).** Actor: dueño; otro usuario registrado solo ve las mascotas activas permitidas en el perfil público. Entradas: sesión y, para detalle, ID de mascota. Resultado: lista o ficha con datos actuales y edad recalculada; un dueño sin mascotas ve estado vacío útil. Errores: recurso inexistente, sesión vencida, carga fallida y reintento. Los campos públicos exactos dependen de [perfiles](PERFILES.md).

**Editar o desactivar (RF-M03–M04; MA-03–MA-05).** Actor: dueño. Precondición: ficha propia activa. Entradas: cambios autorizados o confirmación de desactivación. Resultado: ficha actualizada o retirada de listados normales; otro usuario recibe denegación desde la API. Errores: datos inválidos, fallo de foto o red, sin perder cambios no guardados. El tratamiento de publicaciones históricas relacionadas sigue **pendiente**.

Aplican especialmente RNF-S01, RNF-S04–S05, RNF-I02 y RNF-Q02–Q04 de [PROYECTO.md](../PROYECTO.md).

## Decisiones confirmadas

- Cada mascota pertenece a una cuenta y solo su dueño puede crearla, editarla o desactivarla.
- El registro incluye nombre, especie, raza, fecha de nacimiento y foto. El usuario pidió ingresar la fecha de nacimiento y calcular la edad automáticamente con la fecha actual; no guardar la edad calculada como valor fijo.
- El dueño puede consultar una lista de sus mascotas y abrir cada ficha. Los usuarios registrados pueden ver mascotas relacionadas desde el perfil público de su dueño, con los campos públicos que se definan.

## Flujos esperados

1. En «Mis mascotas», el dueño ve fichas activas o un estado vacío con acción «Agregar mascota».
2. En el formulario captura los datos y selecciona una foto; la app valida fecha no futura y campos obligatorios.
3. En el detalle ve datos y edad calculada; puede editar la ficha o desactivarla con confirmación.
4. Tras reiniciar la app, los cambios persisten. Una mascota desactivada no aparece en listas normales.

La interfaz considera carga, errores de red, fallo de foto y ausencia de foto. La edad se calcula con calendario local a partir de la fecha de nacimiento; la representación exacta en años o años/meses se concreta en el plan de interfaz.

## Criterios de aceptación

| ID | Resultado comprobable |
| --- | --- |
| MA-01 | Una mascota creada aparece en «Mis mascotas» con nombre, especie y foto o respaldo visual. |
| MA-02 | La edad mostrada cambia al llegar su cumpleaños sin modificar el registro almacenado. |
| MA-03 | Se rechaza una fecha de nacimiento futura. |
| MA-04 | Una segunda cuenta no puede modificar ni desactivar la mascota del primer dueño. |
| MA-05 | Una mascota desactivada desaparece de los listados normales y de perfiles públicos. |
| MA-06 | Al abrir el perfil público de un usuario con mascotas, solo aparecen las fichas activas y los campos públicos aprobados; un perfil sin mascotas sigue siendo consultable. |

## Estado del código y decisiones pendientes

`Pet` guarda `age: Int` y todavía no tiene especie ni raza. Su DTO valida `ownerId` como entero aunque la relación usa cadena y acepta el dueño desde el cuerpo. Se requiere cambiar el modelo y asignar el propietario desde la sesión.

Antes de aprobar una migración se debe decidir cómo tratar registros que ya tengan solo `age`: no existe una fecha exacta deducible de esos años. También quedan por confirmar si raza y foto serán opcionales, qué campos de mascota son públicos y cómo aparecen publicaciones históricas relacionadas con una ficha desactivada. Esas decisiones no deben rellenarse por inferencia.

No se exige registrar una mascota para crear cuenta o participar en feed, comunidades y eventos (D-12). Esta ficha cubre la integración de mascotas con el perfil; el contrato básico del perfil puede verificarse antes.

## Tecnología y estructura

Expo 57, React Native y TypeScript en `apps/mobile/app/(tabs)/mascotas.tsx` y las futuras pantallas de ficha; NestJS 11 en `apps/backend/src/pet`; Prisma 7 y `Pet` en `apps/backend/prisma/schema.prisma`; Supabase Storage está por evaluar para fotos. Pruebas backend junto a los servicios (`*.spec.ts`) y E2E en `apps/backend/test`. La pantalla actual no demuestra un flujo completo.

## Comandos

Desde la raíz: desarrollo `pnpm backend` y `pnpm mobile`; compilación `pnpm backend:build`; unitarias `pnpm --filter proyecto-backend test -- --runInBand`; E2E con entorno preparado `pnpm --filter proyecto-backend test:e2e -- --runInBand`; lint móvil `pnpm --filter mobile lint`. Para un esquema aprobado, `pnpm --filter proyecto-backend exec prisma migrate dev` y luego `pnpm --filter proyecto-backend exec prisma generate` en base de desarrollo identificada.

## Estilo de código

TypeScript, DTO para entradas, clases `PascalCase`, propiedades `camelCase`, validación de servidor y desactivación explícita. Ejemplo real del patrón de consulta en publicaciones, aplicable a fichas activas:

```ts
where: { id, isActive: true }
```

El propietario de una ficha se deriva del token, no del cuerpo del DTO.

## Estrategia de pruebas

Unitarias para fecha futura y edad al cruzar cumpleaños; E2E con dos cuentas para crear, leer, editar y desactivar; prueba de migración con registros `age` existentes después de acordar su tratamiento; recorrido móvil para carga, vacío, foto fallida, API apagada, reintento y persistencia tras reiniciar. No se fija cobertura porcentual global inexistente en el repositorio.

La cobertura exigida para aprobar esta capacidad es evidencia de MA-01 a MA-06, incluida migración y propiedad entre dos cuentas; no se fija un porcentaje global de líneas.

## Límites de actuación

- **Siempre:** comprobar propiedad en API, filtrar inactivas, conservar formulario ante error y actualizar API/datos al cambiar contrato.
- **Consultar antes:** columnas `species`, `breed` y fecha de nacimiento con tipo, nulabilidad, valor para filas existentes y migración; obligatoriedad de foto/raza, campos públicos y política de fotos.
- **Nunca:** inventar cumpleaños a partir de `age`, confiar en `ownerId` enviado por móvil ni guardar edad calculada como dato fijo.
