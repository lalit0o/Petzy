# Especificación: eventos en comunidades (`eventos`)

**Contrato:** ficha funcional y plan técnico aprobados por el usuario el 10 de octubre de 2026; tareas EV-T01–EV-T20 aprobadas · **Código en este checkout (8-11-2026):** parte 1 implementada — tablas y migración, API con permisos, asistencia, total fijado al inicio, portada privada, edición, cancelación y avisos guardados (comprobados con pruebas HTTP), y pantallas móviles con mapa, recorridas en teléfono el 9-11-2026; parte 2: avisos dentro de la app (D-156) recorridos el 12-11-2026; los avisos al teléfono con la app cerrada salen del MVP (D-157, 22-11-2026) · **Prioridad:** MVP, dentro de Comunidades (D-144); parte 1 justo después de Comunidades, parte 2 después de Adopción · **Depende de:** `comunidades` · **Alcance:** eventos y asistencia. [Mapa](../../MAPA-CAPACIDADES.md).

La ficha, el [plan técnico aprobado](09-EVENTOS/01-PLAN.md) y las [tareas aprobadas](09-EVENTOS/02-TAREAS.md) describen el comportamiento deseado. Modelos, migración (aplicada a la base de desarrollo), rutas y pantallas están en el checkout; el estado por tarea está en las tareas y en la [ruta](../00-RUTA-DE-DESARROLLO.md).

**Decisiones confirmadas:** los eventos pertenecen a comunidades; solo `ADMIN` y `MODERATOR` pueden crearlos; la pantalla se divide en «Publicaciones» y «Eventos»; la lista usa tarjetas y el detalle incluye mapa. Los usuarios registrados que no estén expulsados de esa comunidad pueden verlos y solo los miembros confirmar asistencia antes del inicio. El creador, mientras siga siendo miembro, y un `ADMIN` vigente pueden editar o cancelar dentro de los plazos definidos (D-119). D-99–D-119 fijan ubicación en el mapa, horarios, avisos, foto privada, asistencia, historial, límites de texto y las secciones «Próximos», «En curso» y «Eventos anteriores». La excepción para personas expulsadas se confirmó en D-70. Se registran en [03-DECISIONES.md](../03-DECISIONES.md).

## Objetivo y navegación

Las personas registradas consultan encuentros de sus comunidades y, cuando su rol o membresía lo permite, los organizan o responden asistencia. El lugar se entiende tanto con mapa como con texto.

**Ejemplo:** Ana, administradora de una comunidad, publica un encuentro con fecha y lugar. Luis puede ver sus detalles aunque no pertenezca a la comunidad, siempre que no haya sido expulsado de ella, pero solo puede marcar «Iré» si se une. Si el mapa falla, sigue viendo el lugar escrito. Una persona con rol de miembro común no puede crear el evento.

## Contrato de flujos

**Consultar eventos de una comunidad (RF-E02; CE-02–CE-04, CE-06).** Actor: usuario autenticado que no esté expulsado de esa comunidad, tenga o no mascota. Precondición: comunidad existente y visible para esa cuenta según D-70. Entradas: ID de comunidad, paginación e ID de evento para detalle. Resultado: tarjetas de esa comunidad y detalle con fecha, lugar legible y mapa con marcador; el mapa fallido conserva la dirección textual. Errores: evento ausente, API o mapa inaccesible; mostrar estado y reintento cuando aplique.

**Crear evento (RF-E01; CE-01, CE-02, CE-04).** Actor: miembro `ADMIN` o `MODERATOR` de la comunidad. Entradas obligatorias: título con contenido de hasta 120 caracteres, descripción con contenido de hasta 3 000, fecha/hora de inicio con zona, fecha de fin y «Hora aproximada de fin» posteriores al inicio, nombre o dirección legible del lugar con contenido de hasta 200 caracteres y un punto elegido en el mapa; portada opcional (D-114). El formulario aclara que la hora de fin puede variar; el encuentro puede cruzar medianoche y terminar otro día (D-104, D-107). La app obtiene las coordenadas del marcador: la persona no escribe números de latitud y longitud. El servidor valida rol, fecha futura, textos, horario y coordenadas. Resultado: evento vinculado solo a esa comunidad. Errores: permiso denegado, datos inválidos, mapa o API fallidos, conservando el formulario y mostrando el error junto al campo o acción. La portada, si existe, es JPEG/PNG/WebP de hasta 5 MB y se entrega de forma privada (D-102).

**Responder asistencia (RF-E03; CE-05–CE-06).** Actor: miembro autenticado. Entradas: evento y respuesta «Iré»/«No iré» antes de la hora de inicio. Resultado: un estado vigente por persona y conteo actualizado de «Iré». Si sale o es expulsada de la comunidad antes de que empiece, deja de contarse; si vuelve a unirse, debe confirmar de nuevo (D-71). Si desactiva su cuenta, tampoco cuenta; al reactivarla antes del inicio debe confirmar de nuevo (D-117). Un usuario registrado sin membresía puede consultar, pero no responder. Cuando comienza el encuentro, la asistencia se cierra incluso si sigue en curso (D-106) y se fija el total de «Iré» en ese instante; ese total no cambia por salidas posteriores (D-109). Se trata de confirmaciones, no de asistencia física comprobada. Si se cancela, conserva las respuestas como historial, oculta el total y no acepta cambios (D-103). Errores: membresía inválida, plazo cerrado, evento cancelado o red fallida, con respuesta visible junto a la acción.

**Editar o cancelar (RF-E04; CE-07).** Actor: creador que sigue siendo miembro o `ADMIN` vigente de la comunidad (D-119). Precondición: evento existente y no cancelado. Entradas: cambios permitidos o cancelación. Puede corregir fecha y hora de inicio mientras no haya empezado; la nueva fecha debe ser futura (D-100). Durante «En curso» todavía puede corregir título, descripción, lugar y portada, pero no el inicio (D-110). También puede cambiar fecha y hora aproximada de fin mientras siga en curso; el nuevo fin debe ser posterior al momento del cambio y al inicio (D-113). Puede cancelar hasta antes de la hora aproximada de fin; después no (D-111). Resultado: detalle actualizado o cancelado. Si cambia el inicio, el fin aproximado o el lugar, o se cancela, se avisa a quienes mantienen «Iré» dentro de Petzy (D-101, D-156); el aviso por teléfono con la app cerrada es trabajo futuro (D-157). El cambio se guarda aunque un aviso falle, y ese aviso se reintenta sin duplicarlo. El servidor deniega a terceros y no reabre un evento cancelado.

Aplican especialmente RNF-S01, RNF-S05, RNF-I02–I05 y RNF-Q01–Q02 de [01-PROYECTO.md](../01-PROYECTO.md). Los datos y rutas vigentes para implementar se describen en el [plan aprobado](09-EVENTOS/01-PLAN.md).

### Navegación propuesta a partir de las decisiones confirmadas

Al abrir una comunidad, la persona encuentra dos secciones dentro de su detalle:

1. **Publicaciones:** mini-feed exclusivo de esa comunidad (`Post.communityId = id`), con sus likes y comentarios.
2. **Eventos:** encuentros de esa comunidad, separados en «Próximos», «En curso» y «Eventos anteriores» según su horario (D-105, D-112). Un cancelado pasa de inmediato a «Eventos anteriores» con la etiqueta «Cancelado», aunque falte para su horario (D-118). Cada tarjeta muestra foto de portada (o una imagen de respaldo), título, fecha y hora, y nombre breve del lugar. Al pulsarla se abre el detalle.

La sección Eventos muestra una acción «Crear evento» solo a miembros con rol `ADMIN` o `MODERATOR`. El creador de la comunidad recibe `ADMIN`; `MEMBER` no puede crear eventos. El backend verifica el rol en cada creación aunque el botón esté oculto.

El detalle presenta foto privada autorizada o imagen de respaldo, título, descripción, fechas y horas de inicio y fin aproximado con zona horaria, nombre o dirección del lugar, mapa con marcador en las coordenadas guardadas, creador y total de asistentes confirmados. Las acciones «Iré» / «No iré» solo aparecen mientras sigue abierta la asistencia. Si el mapa no carga, el lugar sigue siendo legible. Un evento cancelado conserva su detalle con estado visible, pero oculta el total y no acepta cambios de asistencia (D-103). En «Eventos anteriores», la persona ve su respuesta guardada y el total final, sin poder cambiarlos (D-108).

## Reglas y criterios de aceptación

| ID | Regla | Comprobación |
| --- | --- | --- |
| CE-01 | Solo `ADMIN` y `MODERATOR` de la comunidad pueden crear eventos. | Una cuenta `MEMBER` o ajena recibe denegación al invocar la API, además de no ver la acción. |
| CE-02 | Un evento pertenece a una comunidad. | En el listado de la comunidad A no aparece un evento de B; una persona expulsada de A tampoco ve sus eventos por lista o ID directo (D-70). |
| CE-03 | La tarjeta resume el evento; el detalle muestra la información completa y el mapa. | La tarjeta incluye imagen, título y horario; al abrirla aparecen descripción, lugar y marcador correcto. |
| CE-04 | Inicio, fin aproximado y lugar son datos explícitos. | El organizador escribe un lugar y marca un punto en el mapa; se rechaza un inicio pasado, una fecha u hora aproximada de fin vacía o no posterior al inicio, coordenadas fuera de rango o falta de dirección legible. Título, descripción y lugar requieren texto y respetan máximos de 120, 3 000 y 200 caracteres; el error conserva lo escrito. Un evento puede terminar otro día; no se le exige escribir latitud y longitud manualmente. |
| CE-05 | Cada usuario tiene una sola respuesta vigente por evento y puede cambiarla solo antes de que comience. | Cambiar de «Iré» a «No iré» antes del inicio actualiza la misma respuesta; el conteo incluye solo «Iré». Al llegar la hora de inicio, la API rechaza nuevos cambios incluso si el evento sigue en curso. |
| CE-06 | Tener una mascota no es requisito para consultar o responder asistencia. | Una cuenta sin mascota consulta el evento y, al ser miembro de la comunidad, responde; una cuenta no miembro no puede responder; una cuenta expulsada no puede siquiera consultar ese evento (D-70). |
| CE-07 | Solo el creador aún miembro o un `ADMIN` vigente puede editar o cancelar dentro de los plazos acordados. | Un tercero o creador que salió recibe denegación en la API. El inicio solo cambia antes del evento y por un valor futuro; título, descripción, lugar y portada pueden corregirse mientras está en curso. El fin aproximado puede corregirse mientras siga en curso y por un valor posterior al momento del cambio. Puede cancelarse antes de su fin aproximado, pero no después. Un cancelado conserva detalle visible, oculta el total de asistentes, conserva respuestas y no acepta cambios. Si cambia horario o lugar, o se cancela, las personas con «Iré» vigente reciben aviso en Petzy, sin duplicados ante reintentos; el aviso por teléfono es trabajo futuro (D-157). |
| CE-08 | Si alguien sale, es expulsado o desactiva su cuenta antes del inicio, su «Iré» deja de contarse y no revive al volver (D-71, D-117). Una salida posterior no altera el total ya fijado (D-109). | Comprobar el conteo tras salida, expulsión o desactivación antes del inicio; solo vuelve al total si confirma otra vez antes de empezar. Después del inicio, comprobar que el total histórico queda igual aunque esa persona salga. |
| CE-09 | Los eventos pasados y cancelados se conservan en «Eventos anteriores» (D-105, D-108–D-109, D-118). | Tras la hora aproximada de fin, la tarjeta puede abrirse desde «Eventos anteriores»; un cancelado pasa allí de inmediato, con su etiqueta y sin total. Se mantienen permisos y paginación. El detalle de un evento terminado no cancelado muestra la respuesta propia y el total fijado al comenzar, sin aceptar cambios. Ese total no disminuye si alguien sale después. Un evento que cruzó medianoche aparece allí cuando termina, no al cambiar el día. |
| CE-10 | Un evento iniciado y aún no terminado se muestra en «En curso» (D-112). | Al llegar la hora de inicio, la tarjeta pasa de «Próximos» a «En curso» sin volver a abrir la asistencia. Al llegar la hora aproximada de fin, pasa a «Eventos anteriores», incluso si terminó otro día. |

## Datos y API previstos

El [plan aprobado](09-EVENTOS/01-PLAN.md) es la referencia técnica vigente para las tres tablas nuevas `Event`, `EventAttendance` y `EventNotice`, sus campos, permisos, índices, rutas propuestas y migración futura. El inicio y el fin aproximado son obligatorios; `confirmedCountAtStart` conserva el total al comenzar y `EventNotice` guarda los avisos. Las tablas empezarían vacías. Ninguna tabla o ruta existe aún por estar descrita en el plan. La búsqueda automática de direcciones y el cálculo de rutas dentro de Petzy no forman parte de los requisitos aprobados.

## Estado por capa y trabajo pendiente

- **Base de datos:** no aparecen `Event`, `EventAttendance` ni migración de eventos en este checkout. `Post` no representa eventos.
- **Backend:** no aparece módulo de eventos en este checkout; las rutas, validaciones, roles y conteo siguen por implementar y probar.
- **Archivos:** falta decidir bucket y política de Supabase Storage para portadas; se prevé una imagen de respaldo.
- **Móvil:** no aparecen detalle de comunidad ni pantallas de eventos en este checkout; se requiere implementación y recorrido real en dispositivo.
- **Verificación:** probar acceso con `ADMIN`, `MODERATOR`, `MEMBER` y no miembro; separación de comunidades, zona horaria, mapa sin conexión y actualización del conteo.

## Integración prevista y límites de la primera versión

- El mapa mostrará el punto elegido junto al lugar escrito. D-10 confirma que «Cómo llegar» abrirá la app de mapas del teléfono; Petzy no calculará rutas dentro de su pantalla. El plan propone `react-native-maps`, cuya compatibilidad se comprobará antes de instalarla; no hay dependencia de mapas para Eventos en este checkout.
- La portada es opcional, privada, JPEG/PNG/WebP de hasta 5 MB (D-102); el plan aprobado describe su carga y limpieza en Supabase Storage. Si no hay portada, se muestra una imagen de respaldo.
- D-99 sustituyó la entrada manual de coordenadas: el formulario pide nombre o dirección del lugar y permite marcar el punto en el mapa. La búsqueda automática de direcciones sigue fuera de este alcance salvo acuerdo posterior.
- La edición móvil prevista permite cambiar título, descripción y lugar; D-100 también permite corregir fecha y hora antes del inicio. D-101 exige avisos a quienes mantienen «Iré» al cambiar horario o lugar, o al cancelar. La cancelación debe dejar el detalle visible y bloquear nuevas confirmaciones.
- Las listas de «Próximos», «En curso» y «Eventos anteriores» se prevén paginadas con una acción «Ver más eventos». D-101 define cuándo y a quién avisar; el plan técnico aprobado describe la entrega y los reintentos.
- El [plan técnico](09-EVENTOS/01-PLAN.md) fue rehecho y aprobado para este checkout. Las [tareas EV-T01–EV-T20](09-EVENTOS/02-TAREAS.md) fueron aprobadas; ninguna está ejecutada.

## Tecnología y estructura

Expo 57, React Native y Expo Router están en `apps/mobile`; NestJS 11 y Prisma 7 en `apps/backend`. Las rutas móviles, el módulo backend, los modelos, la migración y la dependencia de mapas específicos de eventos no aparecen en este checkout. Su ubicación y contrato están propuestos en el plan aprobado y se contrastarán con el código cuando se autorice implementar. Las pruebas backend seguirán `*.spec.ts` y E2E en `apps/backend/test`. Supabase Storage para portadas aún no está integrado.

## Comandos

Desde la raíz: desarrollo `pnpm backend` y `pnpm mobile`; compilación `pnpm backend:build`; unitarias `pnpm --filter proyecto-backend test --runInBand`; E2E con entorno preparado `pnpm --filter proyecto-backend test:e2e -- --runInBand`; revisión móvil `pnpm --filter mobile lint`. Para consultar migraciones en el backend: `pnpm --filter proyecto-backend exec prisma migrate status`, después de identificar la base por `DATABASE_URL`.

## Estilo de código

TypeScript, DTO para entradas, clases `PascalCase`, propiedades `camelCase`, fecha ISO y zona horaria explícita. Unicidad de asistencia expresada en Prisma:

```prisma
@@id([eventId, userId])
```

El creador se deriva del token validado y el rol se comprueba en el servidor.

## Estrategia de pruebas

Unitarias para rol, fecha, coordenadas, cancelación y conteo; E2E con `ADMIN`, `MODERATOR`, `MEMBER` y no miembro; recorrido en dispositivo de tarjeta, detalle, mapa, asistencia, cambio de zona, API apagada y reintento. Verificar migración en el entorno Supabase antes de usarlo. La compilación o el mapa renderizado no sustituyen la prueba autenticada completa.

La cobertura exigida para aprobar esta capacidad es evidencia de CE-01 a CE-10, incluida migración en el entorno objetivo y recorrido real en dispositivo; no se fija un porcentaje global de líneas.

## Límites de actuación

- **Siempre:** comprobar rol y membresía en API, conservar lugar legible cuando el mapa falle, contar solo `GOING` y separar eventos por comunidad.
- **Consultar antes:** proveedor y configuración del mapa, cambios de contratos o columnas que no estén acordados, y cualquier ampliación de avisos fuera de D-101.
- **Nunca:** anunciar como verificado el despliegue en Supabase o dispositivo sin evidencia, ni exponer una lista nominal de asistentes.

## Preguntas abiertas y puerta de avance

Las reglas de visibilidad y asistencia están confirmadas en D-09, con la excepción de expulsión D-70. D-99–D-119 fijan mapa, horarios, avisos, portada privada, asistencia, historial, correcciones durante el encuentro, cancelación hasta el fin, «En curso», límites de texto, reactivación, ubicación de cancelados y permiso del creador al salir. El usuario aprobó esta ficha funcional y el [plan técnico](09-EVENTOS/01-PLAN.md) el 10 de octubre de 2026. Las [tareas EV-T01–EV-T20](09-EVENTOS/02-TAREAS.md) están aprobadas; ninguna se ha ejecutado. No hay código nuevo.

Según D-12, una persona registrada sin mascota puede consultar eventos y, si pertenece a la comunidad, responder asistencia; la creación y gestión mantienen los requisitos de rol y autor.
