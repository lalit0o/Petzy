# Especificación: diseño de la aplicación (`diseno-app`)

**Contrato:** ficha y criterios DA-01–DA-06 aprobados por el usuario el 18 de octubre de 2026 · **Código:** estilos parciales existentes; implementación del rediseño aplazada por solicitud del usuario · **Prioridad:** transversal a pantallas móviles · **Dependencias:** ninguna para fundamentos; cada pantalla consume su ficha funcional. [Mapa](../../MAPA-CAPACIDADES.md).

El [documento de interfaces](../06-DISENO-DE-INTERFACES.md) registra la pantalla y paleta proporcionadas por el usuario y las decisiones D-120–D-133 sobre navegación, filtro, modo oscuro, estados de carga, selección del tema, tipografía, colores de estado, botones deshabilitados, fotos opcionales, espaciado, pantallas separadas de Cuenta y proceso de diseño. El usuario ya revisó los recorridos y pantallas propuestos de Cuenta, Publicaciones, Perfiles, Mascotas, Interacciones, Comunidades, Chat, Adopción, Eventos y Ajustes. También aprobó como conjunto los criterios DA-01–DA-06. Estas aprobaciones no autorizan código.

## Objetivo

**Actualización aprobada, D-137 (26-10-2026):** Mi perfil abre en lectura y habilita la edición en la misma pantalla con «Modificar perfil»; guardar texto/estado confirma mediante alerta nativa y Cancelar descarta solo ese borrador. Los cambios de foto se guardan inmediatamente y esto se explica en pantalla. Buscar se mantiene como destino independiente de la barra inferior y se retira de Mi perfil, conforme a D-124. [Flujo y criterios](03-PERFILES.md#ajuste-de-interfaz-aprobado-el-26-10-2026--d-137). Implementado tras autorización posterior del usuario; pruebas locales aprobadas, recorrido físico pendiente.

Petzy debe sentirse cercana, tranquila y fácil de usar para dueños de mascotas y amantes de los animales que aún no tienen una. Las fotos y el contenido de las personas ocupan el centro de la experiencia. El diseño ayuda a orientarse, completar la tarea principal de cada pantalla y entender el resultado de cada acción. Esta ficha define criterios compartidos de interfaz; las reglas de datos, permisos y API permanecen en las fichas funcionales.

**Ejemplo:** en «Mis mascotas», una persona entiende de inmediato cómo agregar una ficha o por qué todavía no aparece ninguna. Al guardar, ve si funcionó; si falla, sabe qué corregir y conserva los datos escritos. El recorrido y la dirección visual están documentados; las medidas y los activos visuales finales se comprobarán en la app cuando se autorice implementarla.

## Alcance y criterios de éxito aprobados

| ID | Resultado comprobable antes de considerar el diseño terminado |
| --- | --- |
| DA-01 | Hay un inventario de pantallas y navegación que cubre acceso y la barra inferior aprobada: Inicio, Comunidades, Buscar perfiles, Adopción y Configuración, con accesos a Chat, Mi perfil y Mis mascotas (D-120/D-124). Cada pantalla que se diseñe indica tarea principal, acción visible y forma de volver. |
| DA-02 | Una dirección visual aprobada documenta paleta clara y oscura (D-125), colores de error/éxito/aviso/foco (D-128), colores de botones deshabilitados (D-130), Nunito para la interfaz (D-127), base de espaciado (D-132), formas e iconos. D-131 fija cómo se ve una publicación sin foto y las imágenes de respaldo de perfil, mascota y comunidad. Los componentes equivalentes se ven y actúan de forma consistente. El tema sigue el teléfono por defecto y puede elegirse en Ajustes (D-126). |
| DA-03 | Cada pantalla de datos especifica carga, contenido, vacío, error y reintento; cada formulario especifica envío, éxito, validación y fallo sin perder lo escrito. Los mensajes aparecen junto a la acción pertinente. Para Inicio se aplican los patrones de primera carga, filtro, paginación y foto de D-125. D-129 distingue botón deshabilitado por falta de datos del botón que está enviando. |
| DA-04 | La navegación y los controles tienen etiquetas accesibles, tamaño táctil suficiente, contraste comprobado y contenido legible con texto ampliado y teclado abierto; las imágenes y mapas tienen alternativa textual. |
| DA-05 | Las transiciones y el feedback son inmediatos y útiles; una preferencia de movimiento reducido conserva la información de estado sin exigir animación. Se revisan en iOS y Android con tamaños de pantalla representativos. |
| DA-06 | La revisión documental registra referencias, flujos y decisiones pendientes sin exigir prototipo navegable (D-123). Cuando el usuario autorice programar, el recorrido de la app real registrará qué criterios se comprobaron, en qué dispositivo y qué queda pendiente. |

El diseño de chats grupales y CNN queda fuera por ser opcional. Las fichas funcionales aprobadas guían el comportamiento y los permisos de cada pantalla. D-120/D-124 ya fijaron la barra principal y los accesos a Chat, Perfil y Mascotas. Las pantallas previstas están descritas en el documento de interfaces; no se presentaron capturas de todas ellas ni se han comprobado en una app ejecutable.

## Inventario de navegación para planificar

| Recorrido | Punto de entrada conocido o previsto | Destino y dato de contexto | Estado de definición |
| --- | --- | --- | --- |
| Entrar | «Iniciar sesión» y «Crear cuenta» como pantallas separadas (D-133) | «Revisa tu correo», «Completar registro», recuperación y, con sesión válida, Inicio | Navegación y propuesta de pantallas de Cuenta revisadas el 18 de octubre de 2026; el recorrido completo no existe todavía en el código. |
| Explorar feed | Pestaña Inicio; filtro desplegable arriba del contenido | Detalle, creación y edición de publicación | D-121 fija «Todas» y cinco categorías; no habrá saludo «¡Hola, [nombre]!». El usuario revisó el recorrido y las pantallas de Publicaciones; aún no están integrados. |
| Ver perfil y mascotas | «Mi perfil» y «Mis mascotas» desde Configuración (D-124) | Perfil propio o ajeno y ficha por ID | El usuario revisó los recorridos y pantallas de Perfiles y Mascotas. El código actual conserva una navegación diferente. |
| Comentar y reaccionar | Detalle de publicación visible en Inicio o comunidad | Comentarios, «Me gusta», edición propia y vistas de retiradas según permisos | El usuario revisó el recorrido y cuatro vistas de Interacciones. Inicio y comunidad aplican restauraciones distintas; no hay flujo móvil completo implementado. |
| Explorar comunidades | «Comunidades» en la barra inferior | Detalle con «Publicaciones» y «Eventos», membresía y administración según rol | Ocho vistas y su recorrido revisados por el usuario; aún no están integrados. |
| Consultar evento | Sección «Eventos» dentro de una comunidad | Lista por estado, detalle con mapa y asistencia | Cuatro vistas y su recorrido revisados; pertenecen a Eventos, dentro de Comunidades (MVP, D-144), y no existen en este checkout. |
| Conversar | Icono de mensajes arriba de Inicio, perfil de otra persona o anuncio que permita contactar | Bandeja, conversación, bloqueo, reporte y borrado propio | Cuatro vistas y su recorrido revisados; el equipo no revisa reportes en el MVP. |
| Buscar perfiles | «Buscar» en la barra inferior | Pantalla «Buscar perfiles» y perfil encontrado | Ubicación aprobada en D-120/D-124; su pantalla fue revisada dentro de Perfiles, pendiente de implementación. |
| Adoptar | «Adopción» en la barra inferior | Anuncio, contacto por Chat y reporte | Cinco vistas y su recorrido revisados; el MVP guarda reportes sin revisión administrativa. |
| Configurar | «Ajustes» en la barra inferior | «Configuración», con «Mi perfil», «Mis mascotas», tema y cierre de sesión | Ubicación, accesos y agrupación visual revisados; D-126 añade «Automático», «Claro» y «Oscuro». |

La tabla resume los recorridos revisados y distingue su documentación del código disponible. Ninguna de esas decisiones autoriza implementarlos antes de completar las tareas de todos los módulos y recibir la autorización explícita del usuario (D-123).

## Tecnología y estructura del proyecto

La app usa Expo 57, React Native, Expo Router, TypeScript, `react-native-reanimated`, `expo-haptics`, `expo-image` y `react-native-safe-area-context`. Hay componentes en `apps/mobile/components`, navegación en `apps/mobile/app` y tema inicial en `apps/mobile/constants/theme.ts`. El login usa una superficie oscura; Inicio, Comunidades y Mascotas mantienen pantallas básicas oscuras. No hay pantallas de eventos en este checkout. Estos estilos existentes son referencias de código, no una identidad visual aprobada. Las pruebas móviles automatizadas no tienen todavía una suite propia; la revisión de interfaz será manual hasta definirla en el plan.

## Comandos

Desde la raíz: `pnpm mobile` para abrir Expo; `pnpm --filter mobile lint` para revisión estática. Para comprobar que los cambios móviles compilan en TypeScript, `pnpm --filter mobile exec tsc --noEmit`. Abrir iOS o Android desde Expo exige un simulador o dispositivo disponible. No se ejecutan comandos de implementación durante esta fase documental.

## Estilo de código

Componentes React Native en `PascalCase`, variables y estilos en `camelCase`, constantes visuales compartidas antes de reutilizar valores sueltos. Ejemplo real del tema actual, que puede revisarse al aprobar la dirección visual:

```ts
export const Nunito = {
  regular: 'Nunito_400Regular',
  semiBold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
} as const;
```

La guía [apple-design](../../.agents/skills/apple-design/SKILL.md) aporta principios de feedback, jerarquía, movimiento y accesibilidad; sus ejemplos web se adaptan a React Native. La guía [async-feedback](../../.agents/skills/async-feedback/SKILL.md) rige los estados de red.

## Estrategia de pruebas

Revisar con tareas reales: entrar, explorar publicaciones, encontrar comunidad, consultar evento y registrar mascota. Probar cada pantalla en iOS y Android cuando haya acceso, áreas seguras, teclado, texto ampliado, modo claro y oscuro, errores de API, carga lenta y movimiento reducido. En Inicio, comprobar que el filtro no muestre temporalmente publicaciones de otra categoría, que la paginación conserve las tarjetas previas y que el formulario no pierda lo escrito ante error (D-125). La cobertura exigida es **todos los criterios DA-01 a DA-06 para las pantallas incluidas en el alcance aprobado**; no se fija un porcentaje de cobertura de código móvil que hoy no existe.

## Límites de actuación

- **Siempre:** priorizar contenido de mascotas y personas, usar lenguaje claro, mostrar estados asíncronos, respetar accesibilidad y conservar consistencia entre módulos.
- **Consultar antes:** identidad visual definitiva, cambios a la navegación D-120/D-124, estilos de imagen o iconos que definan marca, incorporación de dependencias y pantallas o flujos no especificados.
- **Nunca:** tomar los colores actuales del código como marca aprobada, ocultar información necesaria para lograr minimalismo ni iniciar la implementación visual antes de que el usuario autorice expresamente programar.

## Detalles para el plan y la comprobación visual

- ¿Cómo se verán los botones deshabilitados de D-129/D-130 en cada pantalla real, incluidos sus alrededores y la explicación de lo que falta? Los pares de colores ya están acordados; falta comprobarlos en contexto.
- ¿Cuál será la fuente decorativa del logotipo «Petzy» y cuáles serán el recorte de fotografías y los dibujos finales de los iconos de respaldo? Nunito ya está acordada para el resto de la interfaz (D-127), y D-131 fija cuándo aparecen los iconos.
- ¿Qué mecanismo local guardará la preferencia de tema de D-126 y cómo se comprobará que «Automático» siga cambios posteriores del teléfono? Esta es una decisión de implementación futura, sin código autorizado todavía.
- ¿Cómo se comprobarán en cada pantalla los patrones de regreso y de acciones locales ya descritos en el documento de interfaces?
- ¿Qué dispositivos y tamaños de texto se usarán como referencia para la revisión visual?
- ¿Qué radios de esquinas y alturas usarán los componentes? D-132 solo fija espacios iniciales; se ajustarán al probarlos en pantallas pequeñas y con texto ampliado.

Estas decisiones de detalle no alteran los recorridos revisados. El [plan aprobado](90-DISENO-APP/01-PLAN.md) indica cómo resolverlas y comprobarlas; las [tareas aprobadas](90-DISENO-APP/02-TAREAS.md) dividen ese trabajo. La implementación permanece aplazada.
