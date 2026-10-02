# Especificación: diseño de la aplicación (`diseno-app`)

**Contrato:** borrador, pendiente de revisión · **Código:** estilos parciales existentes; implementación del rediseño aplazada por solicitud del usuario · **Prioridad:** transversal a pantallas móviles · **Dependencias:** ninguna para fundamentos; cada pantalla consume su ficha funcional. [Mapa](../../MAPA-CAPACIDADES.md).

## Objetivo

Petzy debe sentirse cercana, tranquila y fácil de usar para dueños de mascotas y amantes de los animales que aún no tienen una. Las fotos y el contenido de las personas ocupan el centro de la experiencia. El diseño ayuda a orientarse, completar la tarea principal de cada pantalla y entender el resultado de cada acción. Esta ficha define criterios compartidos de interfaz; las reglas de datos, permisos y API permanecen en las fichas funcionales.

## Alcance y criterios de éxito propuestos para revisión

| ID | Resultado comprobable antes de considerar el diseño terminado |
| --- | --- |
| DA-01 | Hay un inventario de pantallas y navegación que cubre acceso, Inicio, Comunidades, Mascotas, Perfil y las pantallas de detalle aprobadas. Cada pantalla indica tarea principal, acción visible y forma de volver. |
| DA-02 | Una dirección visual aprobada documenta paleta para claro/oscuro si ambos modos entran en alcance, tipografía, escala de espacios, formas, iconos e imágenes de respaldo. Los componentes equivalentes se ven y actúan de forma consistente. |
| DA-03 | Cada pantalla de datos especifica carga, contenido, vacío, error y reintento; cada formulario especifica envío, éxito, validación y fallo sin perder lo escrito. Los mensajes aparecen junto a la acción pertinente. |
| DA-04 | La navegación y los controles tienen etiquetas accesibles, tamaño táctil suficiente, contraste comprobado y contenido legible con texto ampliado y teclado abierto; las imágenes y mapas tienen alternativa textual. |
| DA-05 | Las transiciones y el feedback son inmediatos y útiles; una preferencia de movimiento reducido conserva la información de estado sin exigir animación. Se revisan en iOS y Android con tamaños de pantalla representativos. |
| DA-06 | La revisión del diseño usa un prototipo o recorrido interactivo de los flujos principales y registra qué criterios se comprobaron, en qué dispositivo y qué queda pendiente. |

El diseño de chats grupales y CNN queda fuera por ser opcional. Chat privado se diseña cuando su ficha funcional cierre las reglas de inicio, bloqueo y retención. Los flujos de recuperación, edición de perfil y publicación necesitan sus contratos funcionales aprobados antes de cerrar su diseño detallado.

## Inventario de navegación para planificar

| Recorrido | Punto de entrada conocido o previsto | Destino y dato de contexto | Estado de definición |
| --- | --- | --- | --- |
| Entrar | Pantalla de acceso existente | Rutas privadas tras sesión validada | Flujo de sesión y recuperación pendientes en `cuenta`. |
| Explorar feed | Pestaña Inicio existente | Detalle de publicación por ID | Detalle y acción de publicar pendientes de integrar. |
| Ver perfil y mascotas | Pestaña Perfil y Mascotas existentes | Perfil por ID y ficha por ID | Campos visibles y ficha móvil pendientes. |
| Explorar comunidades | Pestaña Comunidades existente | Detalle por ID con «Publicaciones» y «Eventos» | Navegación inicial existente; faltan flujos de salida, roles y publicación. |
| Consultar evento | Detalle de comunidad existente | Detalle de evento por ID y mapa | Pantallas iniciales existentes; falta verificación en dispositivo. |
| Conversar | Entrada exacta por definir; adopción abrirá chat con el autor | Conversación con el otro usuario | Pantallas/rutas por planificar después de cerrar `chat-privado`. |
| Adoptar | Apartado específico aprobado, ubicación en navegación por definir | Publicación de adopción y chat con autor | Pantallas/rutas por planificar después del chat; sin diseño visual aprobado. |

La tabla identifica pasos y datos que viajan entre pantallas; **no fija** una nueva barra de navegación ni autoriza implementarla. Al aprobar cada flujo, actualizar su ficha y después esta tabla antes de diseñar pantallas.

## Tecnología y estructura del proyecto

La app usa Expo 57, React Native, Expo Router, TypeScript, `react-native-reanimated`, `expo-haptics`, `expo-image` y `react-native-safe-area-context`. Hay componentes en `apps/mobile/components`, navegación en `apps/mobile/app` y `components/nav.tsx`, y tema inicial en `apps/mobile/constants/theme.ts`. El login usa una superficie oscura; comunidades y eventos usan superficies claras cálidas; Inicio y Mascotas mantienen pantallas básicas oscuras. Estos estilos existentes son referencias de código, no una identidad visual aprobada. Las pruebas móviles automatizadas no tienen todavía una suite propia; la revisión de interfaz será manual hasta definirla en el plan.

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

Revisar con tareas reales: entrar, explorar publicaciones, encontrar comunidad, consultar evento y registrar mascota. Probar cada pantalla en iOS y Android cuando haya acceso, áreas seguras, teclado, texto ampliado, modo oscuro si se aprueba, errores de API, carga lenta y movimiento reducido. La cobertura exigida es **todos los criterios DA-01 a DA-06 para las pantallas incluidas en el alcance aprobado**; no se fija un porcentaje de cobertura de código móvil que hoy no existe.

## Límites de actuación

- **Siempre:** priorizar contenido de mascotas y personas, usar lenguaje claro, mostrar estados asíncronos, respetar accesibilidad y conservar consistencia entre módulos.
- **Consultar antes:** identidad visual definitiva, cambios de navegación, estilos de imagen o iconos que definan marca, incorporación de dependencias y pantallas o flujos no especificados.
- **Nunca:** tomar los colores actuales como marca aprobada, ocultar información necesaria para lograr minimalismo ni iniciar la implementación visual antes de la revisión de esta ficha y su plan.

## Preguntas abiertas

- ¿Se unificará la interfaz alrededor de una variante cálida clara, de una variante oscura o de ambos modos? Los estilos actuales no resuelven esa elección.
- ¿Se conservará Nunito como tipografía principal y cuál será el tratamiento aprobado de fotografías, ilustraciones e imágenes de respaldo?
- ¿La barra principal seguirá con cuatro destinos (`Inicio`, `Comunidades`, `Mis mascotas`, `Mi perfil`) y qué patrón de navegación se usará en pantallas de creación y detalle?
- ¿Qué dispositivos y tamaños de texto se usarán como referencia para la revisión visual?

Estas preguntas no impiden documentar el inventario y los estados, pero sí cerrar la identidad visual o iniciar el rediseño. La implementación permanece aplazada.
