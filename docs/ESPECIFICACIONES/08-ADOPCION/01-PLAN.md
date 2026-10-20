# Plan técnico aprobado: Adopción (`adopcion`)

**Estado:** plan aprobado por el usuario el 10 de octubre de 2026; ficha funcional y [tareas AD-T01–AD-T18](02-TAREAS.md) también aprobadas. **Código y migraciones:** no iniciados. **Alcance:** RF-AD01–RF-AD04, AD-01–AD-09 y D-89–D-98. Programar requiere autorización posterior. Véase la [ficha funcional](../08-ADOPCION.md).

## Qué ocurrirá en Petzy

Una persona podrá publicar un animal con título, descripción y entre una y tres fotos. Podrá enlazar opcionalmente su ficha de «Mis mascotas», editar el anuncio, indicar que encontró hogar o retirarlo y restaurarlo desde una lista privada. Quien busque adoptar verá los anuncios activos en un apartado propio, podrá filtrar por estado y contactar por el chat ya existente cuando el animal siga buscando hogar.

También podrá reportar una vez cada anuncio ajeno y visible. Petzy guardará el motivo y una copia del contenido denunciado, porque el autor podría editar o retirar después el anuncio. Si intenta reportarlo otra vez, verá «Ya lo reportaste». **En el MVP nadie del equipo podrá abrir ni revisar esos reportes, retirar anuncios por esa causa o suspender cuentas.** Esa gestión pertenece al [sistema web futuro](../../FUTURO/DASHBOARD-WEB-PETZY.md).

## Punto de partida y dependencias

El checkout tiene `Post` para Inicio y comunidades, con `Comment` y `PostLike`; no tiene módulo, tablas, rutas ni pantallas de Adopción. `Post.photoUrl` admite una sola foto y sus rutas actuales no separan todavía Inicio de comunidades. D-98 aprueba un modelo nuevo para evitar que los anuncios entren en esos listados o acepten sus interacciones. El chat uno a uno está documentado, pero tampoco existe aún en código: la acción «Contactar» se integrará después de comprobar ese módulo. Cuenta, Perfiles y Mascotas aportan sesión, actividad de cuentas y ficha propia activa.

## Datos y migración propuestos

Las cuatro tablas siguientes comenzarían **vacías**. No se transforman filas de `Post` ni se presume que existan datos reales: el usuario confirmó que Petzy no está desplegada. Las migraciones solo se diseñarán y aplicarán cuando autorice programar. Los identificadores de `User` siguen siendo `String` de Supabase Auth; los ID nuevos de anuncios, fotos y reportes serían `Int` generado por la base.

| Tabla o tipo | Campos y reglas propuestos | Motivo y relaciones |
| --- | --- | --- |
| `AdoptionListing` | `id Int` obligatorio generado; `userId String` obligatorio; `title String` y `description String` obligatorios; `status AdoptionStatus` obligatorio, inicialmente `SEEKING_HOME`; `petId Int?`, inicialmente `null`; `isActive Boolean` obligatorio, inicialmente `true`; `createdAt DateTime` y `updatedAt DateTime` obligatorios. `AdoptionStatus` tendría `SEEKING_HOME` y `FOUND_HOME`. | Relación con `User` y, opcionalmente, `Pet`. `petId` solo acepta una ficha propia activa al crear o editar. `isActive = false` significa retiro voluntario sin borrar el estado anterior. Índices para autor y listas por actividad, estado, fecha e ID. |
| `AdoptionPhoto` | `id Int` obligatorio generado; `listingId Int` obligatorio; `storageKey String` obligatorio; `position Int` obligatorio; `createdAt DateTime` obligatorio. Posiciones únicas por anuncio. | Guarda el orden de una a tres fotos vigentes del anuncio. `storageKey` es una referencia interna de Storage privado, nunca una URL pública. Relación con `AdoptionListing` e índice por anuncio. El backend valida que después de crear o editar queden entre una y tres fotos. |
| `AdoptionReport` | `id Int` obligatorio generado; `listingId Int` y `reporterId String` obligatorios; `reason AdoptionReportReason` obligatorio, sin valor por defecto; `explanation String?`, inicialmente `null`; `createdAt DateTime` obligatorio; `snapshotTitle String`, `snapshotDescription String` y `snapshotStatus AdoptionStatus` obligatorios. `AdoptionReportReason` tendría `POSSIBLE_SALE`, `MISLEADING_INFO`, `INAPPROPRIATE_CONTENT` y `OTHER`, equivalentes a los cuatro motivos de D-94. | Relación con anuncio y persona que reporta. La combinación `(listingId, reporterId)` es única en la base: impide duplicados incluso ante dos solicitudes simultáneas. Los tres campos `snapshot*` conservan lo que decía el anuncio al reportarlo. Índice para anuncio y fecha. No hay estado de revisión ni acceso de personal en el MVP. |
| `AdoptionReportPhoto` | `id Int` obligatorio generado; `reportId Int` obligatorio; `storageKey String` obligatorio; `position Int` obligatorio. Posiciones únicas por reporte. | Guarda referencias a las fotos que estaban en el anuncio al reportarlo, sin duplicar archivos. Relación con `AdoptionReport`; no depende de que la foto siga en `AdoptionPhoto` después de una edición. Índice por reporte. Los archivos referenciados se conservan al menos hasta la revisión futura. |

**Migración y reversibilidad.** Crear enums, tablas, relaciones, índices y unicidad; no añadir columnas a `Post`, `Comment` ni `PostLike`. No borrar físicamente anuncios con reportes: las relaciones y la conservación de evidencia deben impedir que desaparezca un caso pendiente. Antes de ejecutar la futura migración, validar el esquema y probar crear, editar, retirar y reportar con datos de prueba, así como una reversión en un entorno de prueba. Como las tablas comienzan vacías, no hay valores antiguos que rellenar. La política de conservación *después* de revisar cada reporte se decidirá en la especificación web.

## Fotos privadas y conservación del reporte

1. La app enviará archivos al backend; NestJS validará sesión, autor, tipo real JPEG/PNG/WebP, tamaño máximo de 5 MB por archivo y total de una a tres fotos. Solo el backend escribirá en un bucket privado de Supabase Storage; la clave de servidor no viajará a la app.
2. Al crear o editar, el backend coordinará Storage y la transacción de base: si falla la base tras subir archivos, limpiará los nuevos; si falla Storage, no confirmará cambios. Para reemplazos usará referencias nuevas y retirará los archivos antiguos solo después de confirmar el cambio y comprobar que **ningún reporte** los conserve. Edición y reporte del mismo anuncio se coordinarán sobre su fila para que la copia del reporte corresponda a una versión completa y la limpieza no borre una foto recién referenciada. Las fallas de limpieza se registrarán para reintento.
3. La respuesta del anuncio incluirá una ruta de API para cada foto vigente, nunca `storageKey` ni una URL pública o firmada reutilizable. Cada petición de foto comprobará sesión, cuenta solicitante activa, autor activo y anuncio visible; si está retirado, solo su autor activo podrá abrir las fotos desde «Mis anuncios retirados». Se evitará caché compartida y la app dejará de mostrar copias locales al perder acceso o retirarse el anuncio.
4. Guardar un reporte copiará título, descripción y estado, y registrará las referencias de sus fotos **en una misma transacción**. Después, aunque el autor edite, retire o restaure el anuncio, el reporte conserva ese contenido y los archivos privados necesarios. Esas fotos históricas no se sirven por las rutas públicas del anuncio; la web futura deberá definir su propio permiso de lectura.

## API y permisos propuestos

**Son rutas propuestas; ninguna existe hoy.** El servidor obtendrá el autor o reportante del token validado. Nunca aceptará `userId`, `reporterId`, estado de revisión ni ruta interna de Storage del cliente. Antes de cada consulta o cambio comprobará cuenta activa y el estado del anuncio; en listas públicas excluirá autores inactivos. Una ficha `Pet` desactivada dejará de aparecer como complemento sin retirar el anuncio.

| Operación propuesta | Resultado y control principal |
| --- | --- |
| `GET /adoptions?status=&cursor=&limit=` | Lista solo anuncios activos de autores activos. Sin filtro: primero `SEEKING_HOME` y luego `FOUND_HOME`; dentro de cada grupo, recientes primero. Con filtro: solo el estado elegido. Cursor estable por grupo, fecha e ID; 20 resultados por página y máximo 30 por solicitud. |
| `GET /adoptions/:id` | Detalle de anuncio visible para cuenta activa, con datos públicos del autor, estado, fotos vigentes y complemento de mascota solo si la ficha propia sigue activa. No incluye correo ni referencias internas de Storage. |
| `POST /adoptions` | Crea anuncio con título y descripción no vacíos, límites 120/3 000, una a tres fotos válidas, ficha propia activa opcional y confirmación obligatoria de «Solo adopciones, no ventas». Nace en `SEEKING_HOME`. No admite precio ni pago. |
| `PATCH /adoptions/:id` | Solo autor de anuncio activo. Permite cambiar título, descripción, fotos, ficha enlazada o estado; valida que sigan una a tres fotos y que el nuevo vínculo sea propio y activo. No acepta cambiar autor. |
| `DELETE /adoptions/:id`; `GET /adoptions/me/withdrawn`; `POST /adoptions/:id/restore` | Solo autor. Retira con `isActive = false`, lista sus retirados y restaura con el mismo `status` que tenían. Otra cuenta no abre el anuncio retirado por ID. |
| `GET /adoptions/:id/photos/:photoId` | Devuelve bytes de una foto vigente solo tras comprobar acceso en esa solicitud; un anuncio retirado solo permite al autor activo consultar sus fotos. No sirve fotos históricas de reportes. |
| `POST /adoptions/:id/contact` | Solo para otra cuenta activa y anuncio visible `SEEKING_HOME` de autor activo. Abre o reutiliza la conversación de Chat sin duplicarla. Un anuncio propio, retirado o `FOUND_HOME` se rechaza también por API directa; un chat ya existente conserva las reglas generales de bloqueo. |
| `POST /adoptions/:id/reports` | Solo otra cuenta activa y anuncio visible en cualquier estado. Exige uno de los cuatro motivos y explicación opcional de hasta 500 caracteres. Guarda reporte y evidencia juntos. La restricción única evita duplicados; si ya existe, responde conflicto con código estable que la app presenta como «Ya lo reportaste». No hay `GET` administrativo en el MVP. |

Las operaciones de `/posts/:id/comments` y `/posts/:id/like` solo reciben IDs de `Post`; un ID de `AdoptionListing` no se convierte en publicación ordinaria aunque tenga el mismo número. El módulo de Adopción no ofrece comentarios ni «Me gusta». Las rutas actuales de `/post` permanecen inventariadas como actuales en [05-API.md](../../05-API.md), separadas de estas rutas futuras.

## App, errores y estados visibles

- Apartado Adopción: carga, lista vacía, error con «Reintentar», filtro por estado y carga de más resultados sin mezclar grupos ni repetir anuncios. La ubicación exacta en la navegación se revisará con la especificación de diseño antes de construir la pantalla.
- Crear y editar: vista previa y orden de fotos, indicador durante subida y guardado, éxito solo después de respuesta del servidor. Un error de texto, foto, ficha, sesión o API deja el formulario y las imágenes elegidas disponibles para corregir o reintentar; se desactiva solo el envío que podría duplicarse.
- Detalle: muestra estado, autor y, si sigue activa, información adicional de la ficha enlazada. «Contactar» solo aparece cuando corresponde; el servidor mantiene esa regla aunque alguien invoque la ruta manualmente. Un anuncio retirado ajeno muestra que ya no está disponible, sin revelar sus datos.
- Reportar: selector de motivo, explicación opcional con contador de 500 caracteres y mensaje claro si ya se reportó. Ante error de red conserva motivo y explicación. Tras éxito muestra «Reporte guardado» y no promete revisión ni retiro inmediato.
- «Mis anuncios retirados»: solo el autor ve esa lista y puede restaurar; mostrar espera, éxito y error junto a la acción. La app aplica la guía [async-feedback](../../../.agents/skills/async-feedback/SKILL.md).

La implementación futura ubicaría los DTO, controladores, servicios y pruebas del servidor en `apps/backend/src/adoption/` y `apps/backend/test/`; el esquema y la migración irían en `apps/backend/prisma/`. Las pantallas y su integración de API irían en `apps/mobile/app/` y los componentes compartidos existentes que correspondan. Antes de elegir la ruta visual exacta, revisar la navegación actual y la ficha de diseño de la app.

## Orden futuro y verificación

1. **Datos y seguridad:** cuando se autorice código, crear y validar migración; comprobar relaciones, unicidad de reporte y que ninguna tabla de Adopción se une accidentalmente a comentarios/likes de `Post`. Confirmar lectura solo de cuentas activas.
2. **Lectura y fotos:** implementar lista, detalle, filtros, cursor y entrega privada. Probar anuncios en ambos estados, autores inactivos, foto retirada y acceso directo por ID de una tercera cuenta.
3. **Escritura del autor:** crear, editar, cambiar estado, retirar y restaurar. Probar límites, ficha propia/ajena, mínimo y máximo de fotos, fallas parciales de Storage y conservación del estado anterior.
4. **Contacto:** integrar la operación ya verificada de Chat. Probar anuncio abierto, encontrado, propio y retirado, y el caso de conversación ya existente o bloqueada.
5. **Reportes:** probar motivos, límite de 500, reporte único bajo reintentos concurrentes, copia de texto y fotos antes y después de editar/retirar, y ausencia de API de revisión administrativa.
6. **Móvil e inventarios:** comprobar estados de carga, vacío, éxito, error y reintento con API disponible y caída; recorrer AD-01–AD-09. Actualizar API, datos y ruta de desarrollo con evidencia y fecha. La [lista de tareas aprobada](02-TAREAS.md) concreta archivos y comandos.

**Riesgos que se verificarán:** Storage y PostgreSQL no comparten transacción; una foto puede quedar sin referencia si falla una operación. Los archivos denunciados no deben borrarse al editar. La paginación debe respetar el orden por estado al cargar más. El chat todavía no existe en código, por lo que no se declarará completo el contacto hasta verificar ambos módulos juntos. Ninguna prueba de backend por sí sola acredita el recorrido móvil.

No ejecutar migraciones, crear rutas ni construir pantallas antes de la autorización posterior de código. Aprobar ficha, plan y tareas no equivale a comenzar la implementación.
