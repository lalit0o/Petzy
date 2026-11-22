# Tareas aprobadas: diseño de la aplicación (`diseno-app`)

**Estado:** lista DA-T01–DA-T10 aprobada por el usuario el 18 de octubre de 2026; ninguna tarea ejecutada. Deriva de la [ficha aprobada](../90-DISENO-APP.md), el [plan aprobado](01-PLAN.md), el [documento de interfaces](../../06-DISENO-DE-INTERFACES.md) y D-120–D-133. La aprobación de documentos no autoriza programar: el usuario debe dar esa autorización expresamente más adelante.

## Qué se hará, en orden

**D-137, aprobación documental del 26-10-2026:** coordinar DA-T04 con PE-T12 para dar acceso independiente a «Buscar» en la barra inferior y retirar búsqueda de Mi perfil. PE-T11 define lectura/edición en la misma pantalla, alerta nativa tras guardar y foto con guardado inmediato que Cancelar no revierte. El usuario autorizó su implementación posteriormente y ya está integrada con pruebas locales. Las tareas conservan el recorrido físico y los demás criterios pendientes; no se amplía el alcance a módulos futuros.

Primero se preparará una base visual compartida; después se alinearán tema, barra inferior y componentes. Cada pantalla de Cuenta, Publicaciones, Perfiles, Mascotas, Interacciones, Comunidades, Chat y Adopción utilizará esa base cuando se implemente su propio módulo. Eventos la usará al implementarse dentro de Comunidades (D-144). Al final se comprobarán los recorridos reales con evidencia, sin exigir un prototipo navegable previo.

Cada casilla se marcará solo cuando exista implementación y comprobación. Los archivos citados son lugares previstos, no prueba de que la pantalla ya exista. Si durante la implementación cambia una decisión de identidad, flujo o contrato, se consultará antes de aplicarla y se actualizarán ficha, plan y tareas.

## Trabajo técnico y comprobación

- [x] **DA-T01. Confirmar el punto de partida visual y las rutas reales.** Depende de: ninguna. Prepara DA-01–DA-06.
  - **Cubierta, 22-11-2026:** el punto de partida se fue confirmando módulo por módulo; el estado real de cada pantalla está en `docs/06-DISENO-DE-INTERFACES.md` §0.
  - **Aceptación:** se comparan tema, pestañas, barra dibujada, pantallas parciales, dependencias disponibles y `apps/mobile/AGENTS.md` con el documento de interfaces. Se anota qué existe, qué es solo propuesta y qué cambios ajenos hay en el árbol de trabajo. No se marca una pantalla como terminada por existir un archivo.
  - **Verificar:** inspección de código y rutas; cotejo con [ruta de desarrollo](../../00-RUTA-DE-DESARROLLO.md) y `git status --short` antes de editar.
  - **Archivos previstos:** `apps/mobile/app/_layout.tsx`, `apps/mobile/app/(tabs)/_layout.tsx`, `apps/mobile/components/nav.tsx`, `apps/mobile/constants/theme.ts` y `apps/mobile/AGENTS.md`, solo para lectura inicial.

- [x] **DA-T02. Centralizar la paleta, Nunito y los espacios aprobados.** Depende de: DA-T01. Cubre DA-02 y DA-04; D-122, D-125, D-127–D-128 y D-132.
  - **Cubierta, 22-11-2026:** paleta, espacios, radios e iconos centralizados en `apps/mobile/constants/petzy-theme.ts` (`petzyColors`, `spacing`, `radius`, `iconSize`, `cardShadow`); Nunito en todas las pantallas. El pulido del 22-11-2026 pasó a estos tokens las pantallas de Acceso, que tenían su propia copia de colores.
  - **Aceptación:** colores de superficie, texto, acción, estado y foco para claro/oscuro, pesos de Nunito y espacios iniciales tienen una fuente compartida. No se reutilizan como marca los colores de plantilla. Se registra qué pares de HEX sirven para texto normal y cuáles solo para títulos grandes; ningún componente recibe un color nuevo sin revisar su contraste.
  - **Verificar:** comparar los valores con [paleta documentada](../../06-DISENO-DE-INTERFACES.md#3-paleta-de-colores); cálculo de contraste y vista en ambos temas; `pnpm --filter mobile lint` y `pnpm --filter mobile exec tsc --noEmit`.
  - **Archivos previstos:** `apps/mobile/constants/theme.ts`, componentes de texto/superficie en `apps/mobile/components/` y, si hace falta, un archivo de tokens compartidos en `apps/mobile/constants/`.

- [ ] **DA-T03. Aplicar «Automático», «Claro» y «Oscuro» a toda la app.** Depende de: DA-T02 y pantalla de Ajustes cuando exista. Cubre DA-02; D-125–D-126.
  - **Abierta, 22-11-2026:** la app sigue siempre el modo del teléfono (equivale a «Automático»), pero no existe la elección manual «Claro»/«Oscuro» ni una pantalla de Ajustes. Pendiente de decisión del usuario.
  - **Aceptación:** «Automático» sigue el teléfono por defecto; una elección manual se guarda con una clave distinta de la sesión usando la dependencia ya instalada prevista en el plan. El tema se aplica a navegación y contenido sin mostrar primero el tema equivocado. Si falla la lectura local, se usa «Automático» y se puede volver a elegir desde Ajustes.
  - **Verificar:** cambiar tema del teléfono con «Automático», elegir cada modo, cerrar y abrir la app, provocar fallo de lectura local y confirmar que la sesión no cambia; lint y TypeScript móvil.
  - **Archivos previstos:** `apps/mobile/app/_layout.tsx`, `apps/mobile/hooks/use-color-scheme.ts`, `apps/mobile/constants/theme.ts` y pantalla de Ajustes en `apps/mobile/app/` cuando corresponda.

- [x] **DA-T04. Alinear la barra inferior y el regreso entre pantallas.** Depende de: DA-T01–DA-T03 y pantallas de destino disponibles según cada módulo. Cubre DA-01 y DA-04; D-120–D-121, D-124 y D-133.
  - **Cubierta, 22-11-2026:** **cubierta con diferencias decididas por el usuario:** D-150 y D-155 sustituyeron la barra de cinco destinos con «Ajustes» por seis pestañas (Inicio, Buscar, Comunidades, Adopción, Mensajes, Mi perfil) dibujadas en `components/nav.tsx`, solo con icono y nombre accesible; el activo se marca con icono relleno y círculo, no solo con color (D-151). Detalles y formularios tienen «Volver» fijo, y «Mis mascotas» regresa a Mi perfil.
  - **Aceptación:** la declaración de Expo Router y la barra coinciden en cinco destinos con icono **y** texto: «Inicio», «Comunidades», «Buscar», «Adopción» y «Ajustes». Chat, «Mi perfil» y «Mis mascotas» se abren desde los accesos acordados, no como pestañas adicionales. El destino activo se identifica sin depender solo del color; detalle y formularios tienen regreso claro. Ninguna pestaña lleva a un marcador vacío presentado como módulo terminado.
  - **Verificar:** recorrido de cada pestaña y acceso secundario, regreso con botón y gesto del sistema, sesión cerrada, teléfono pequeño, texto ampliado y área segura; lint y TypeScript móvil.
  - **Archivos previstos:** `apps/mobile/app/(tabs)/_layout.tsx`, `apps/mobile/components/nav.tsx`, rutas secundarias en `apps/mobile/app/` y navegación raíz en `apps/mobile/app/_layout.tsx`.

- [x] **DA-T05. Construir controles y tarjetas reutilizables.** Depende de: DA-T02. Cubre DA-02 y DA-04; D-129–D-132.
  - **Cubierta, 22-11-2026:** botones, campos con error y tarjetas compartidos por módulo (`community-ui`, `auth-flow-ui`, `post-card`, `pet-card`, `adoption-card`, `anchored-menu`, `toast`); estados de espera («Guardando…», «Publicando…») y deshabilitado en cada formulario.
  - **Aceptación:** botón principal/secundario/deshabilitado/enviando, campo con ayuda/error y tarjeta comparten estilo y significado en ambos modos. El deshabilitado conserva etiqueta legible y explica qué falta cuando no sea evidente; «Guardando…» o «Publicando…» es un estado distinto. Los controles conservan áreas táctiles y nombres accesibles.
  - **Verificar:** revisar variantes en claro/oscuro, texto ampliado y foco accesible; medir contraste real y comprobar que un botón deshabilitado no ejecuta la acción; lint y TypeScript móvil.
  - **Archivos previstos:** componentes de botón, campo y tarjeta en `apps/mobile/components/`, tokens en `apps/mobile/constants/`.

- [x] **DA-T06. Tratar fotos opcionales, sustitutos y estados vacíos.** Depende de: DA-T02 y DA-T05. Cubre DA-02–DA-04; D-131.
  - **Cubierta, 22-11-2026:** publicación sin foto como tarjeta de texto; perfil, mascota, comunidad, evento y adopción sin foto con icono sobre fondo beige; foto que falla con «Reintentar foto» distinta de foto ausente; estados vacíos con icono y qué hacer (pulido del 22-11-2026).
  - **Aceptación:** una publicación sin foto queda como tarjeta de texto; perfil, mascota y comunidad sin foto muestran icono sencillo sobre fondo neutro. Una foto que falla al cargar se distingue de una foto nunca agregada. Los estados vacíos dicen qué se puede hacer y no muestran datos que la persona no puede ver. Adopción mantiene su regla funcional de una a tres fotos obligatorias.
  - **Verificar:** comparar casos con/sin foto y fallo de carga en ambos temas, lector de pantalla y acceso permitido/denegado; lint y TypeScript móvil.
  - **Archivos previstos:** componentes de imagen/avatar/tarjeta y estado vacío en `apps/mobile/components/`, pantallas piloto en `apps/mobile/app/`.

- [x] **DA-T07. Reutilizar mensajes de carga, éxito, error y reintento.** Depende de: DA-T05 y un flujo de lectura y formulario con API integrados por sus módulos. Cubre DA-03; D-125 y D-129.
  - **Cubierta, 22-11-2026:** patrón aplicado en todas las listas y formularios: esqueleto al cargar, éxito solo tras el servidor (toast), error junto a la acción con «Reintentar», vacío con icono, deslizar para actualizar y paginación que conserva lo cargado (estándares de interacción del documento de interfaces).
  - **Aceptación:** una pantalla piloto de lectura y un formulario piloto muestran espera desde el inicio, éxito solo tras respuesta, vacío cuando corresponde, error junto a la acción y «Reintentar». Un fallo conserva lo escrito; solo se bloquea el control que duplicaría el envío. Inicio no mezcla resultados de filtros durante la espera y la paginación conserva las tarjetas previas.
  - **Verificar:** API apagada, respuesta lenta, espera agotada, validación, doble toque y reintento siguiendo [async-feedback](../../../.agents/skills/async-feedback/SKILL.md); lint, TypeScript móvil y recorrido en dispositivo.
  - **Archivos previstos:** componentes de estado en `apps/mobile/components/`, una lectura y un formulario ya autorizados en `apps/mobile/app/`, sus consultas en `apps/mobile/hooks/`.

- [x] **DA-T08. Ajustar accesibilidad y movimiento en las piezas compartidas.** Depende de: DA-T03–DA-T06. Cubre DA-04–DA-05; las pantallas con datos se vuelven a comprobar al ejecutar DA-T07 y DA-T09.
  - **Cubierta, 22-11-2026:** nombres y estados accesibles en barra, botones, campos, tarjetas y menús; zonas táctiles de 44–48 px revisadas en el pulido; movimiento reducido en esqueletos y menús anclados; texto del lugar antes del mapa. Pendiente de comprobar en dispositivo: texto ampliado al máximo.
  - **Aceptación:** barra, botones, campos, tarjetas y mensajes tienen nombres y estados accesibles; el color no es la única señal. Se respetan tamaño de texto, teclado, áreas seguras y movimiento reducido. Los mapas y fotos de cada módulo conservan alternativa textual cuando se integren. Radios, alturas, iconos y recortes definitivos se registran tras comprobarlos; los cambios de identidad se consultan al usuario.
  - **Verificar:** lector de pantalla, texto ampliado, teclado abierto, claro/oscuro, movimiento reducido y teléfono pequeño en iOS/Android disponibles; lint y TypeScript móvil. Anotar plataforma no comprobada en lugar de darla por aprobada.
  - **Archivos previstos:** componentes compartidos en `apps/mobile/components/`, navegación en `apps/mobile/components/nav.tsx` y tokens en `apps/mobile/constants/`.

- [x] **DA-T09. Comprobar el diseño al integrar cada módulo funcional.** Depende de: DA-T04–DA-T08 y tareas móviles del módulo correspondiente. Cubre DA-01–DA-05.
  - **Cubierta, 22-11-2026:** cada módulo se cotejó al integrarse (sección 0 del documento de interfaces) y las 12 pantallas del plan se repasaron con la skill `impeccable` el 22-11-2026, una por commit.
  - **Aceptación:** para cada módulo integrado se cotejan sus pantallas con el documento de interfaces y sus reglas funcionales. Se registran entradas, regreso, acción principal, ambos temas, carga/vacío/error/éxito, accesibilidad y diferencias justificadas. Una pantalla de Eventos se revisa cuando se implemente dentro de Comunidades (D-144). Esta tarea acompaña la integración de cada módulo y no reemplaza ni duplica sus tareas funcionales.
  - **Verificar:** recorridos reales por módulo en iOS y Android cuando estén disponibles; comprobar los criterios del módulo y registrar fecha, dispositivo y límites. No llamar «verificado» a un recorrido cuya API o permisos aún no existen.
  - **Archivos previstos:** pantallas del módulo en `apps/mobile/app/`, su ficha y tareas en `docs/ESPECIFICACIONES/`, y [documento de interfaces](../../06-DISENO-DE-INTERFACES.md) si cambia una decisión aprobada.

- [x] **DA-T10. Cerrar la comprobación transversal y actualizar documentos.** Depende de: DA-T01–DA-T09 para los módulos del alcance integrado. Cubre DA-01–DA-06.
  - **Cubierta, 22-11-2026:** este cierre: DA-T03 queda abierta (ver abajo). Los recorridos visuales del pulido del 22-11-2026 dependen de la revisión del usuario en su iPhone; TypeScript y ESLint pasaron en cada cambio.
  - **Aceptación:** cada DA tiene evidencia de lo comprobado, fecha, dispositivo y límites. La [ruta de desarrollo](../../00-RUTA-DE-DESARROLLO.md), ficha, plan y tareas distinguen diseño documentado, código presente y recorridos realmente probados. Los criterios de Eventos permanecen pendientes hasta su etapa. No se declara completo el diseño de toda Petzy solo por tener los componentes compartidos.
  - **Verificar:** revisar DA-01–DA-06 contra capturas de la app real y pruebas ejecutadas; `pnpm --filter mobile lint`, `pnpm --filter mobile exec tsc --noEmit` y `git diff --check`; registrar falta de dispositivos o API cuando aplique.
  - **Archivos previstos:** [ficha](../90-DISENO-APP.md), [plan](01-PLAN.md), este archivo, [documento de interfaces](../../06-DISENO-DE-INTERFACES.md) y [ruta de desarrollo](../../00-RUTA-DE-DESARROLLO.md).

## Regla para seguir

Estas tareas quedaron revisadas conforme a [SDD](../../02-SDD.md). **Cierre, 22-11-2026:** a pedido del usuario se registran como cubiertas DA-T01, DA-T02 y DA-T04–DA-T10, porque el diseño se implementó al integrar cada módulo y se repasó con el pulido de `impeccable`. DA-T03 (elegir tema manualmente) sigue abierta porque no existe en el código.
