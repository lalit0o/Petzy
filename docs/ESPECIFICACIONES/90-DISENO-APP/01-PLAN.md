# Plan técnico aprobado: diseño de la aplicación (`diseno-app`)

**Ajuste documental aprobado, D-137 (26-10-2026):** Perfiles tendrá lectura inicial y edición en la misma pantalla mediante «Modificar perfil», guardar/cancelar texto y estado, foto de guardado inmediato explicada y alerta nativa de éxito. Buscar tendrá acceso independiente en la barra inferior y se retirará de Mi perfil, respetando D-124. Coordinar navegación con PE-T12/DA-T04 y lectura/edición con PE-T11. No requiere nuevas rutas de API, esquema ni dependencia de modales. Esperar a que el usuario indique cuándo comenzar código; la evidencia previa no acredita este ajuste.

**Estado:** aprobado por el usuario el 18 de octubre de 2026; la [ficha de diseño](../90-DISENO-APP.md), sus criterios DA-01–DA-06 y las [tareas](02-TAREAS.md) también están aprobados. Este plan describe cómo integrar el diseño cuando el usuario autorice programar. No inicia código ni sustituye los planes funcionales de cada módulo.

## Qué verá la persona

Petzy tendrá una apariencia natural y tranquila en modo claro y oscuro. Tras entrar, la barra inferior mostrará «Inicio», «Comunidades», «Buscar», «Adopción» y «Ajustes». Desde los lugares ya documentados se abrirán Chat, «Mi perfil» y «Mis mascotas». Cada pantalla indicará dónde está la persona, qué puede hacer y qué ocurrió al cargar o guardar datos. Por ejemplo, al publicar, verá «Publicando…» y solo recibirá confirmación cuando el servidor haya aceptado la publicación; si falla, conservará el texto y podrá intentarlo de nuevo.

La fuente de cada recorrido y de sus nombres visibles es el [documento de interfaces](../../06-DISENO-DE-INTERFACES.md), junto con la ficha funcional del módulo. Las pantallas descritas allí son diseños revisados, no capturas verificadas de la app actual.

## Alcance y dependencias

Este plan cubre las piezas **compartidas** del diseño: paleta y tema, tipografía de interfaz, navegación principal, componentes reutilizables, estados de espera y error, accesibilidad y comprobación visual. Cada pantalla concreta se integra con las tareas de su módulo funcional. Eventos se revisará visualmente cuando se implemente su etapa posterior al MVP. No añade reglas de negocio, permisos, tablas, endpoints, proveedores ni el dashboard web futuro.

La base visual puede prepararse sin esperar a que todos los módulos estén implementados. La verificación completa de un recorrido depende de sus datos, permisos y API reales. Ningún módulo se dará por terminado solo porque tenga una pantalla con el estilo correcto.

## Estado del código que habrá que adaptar

La app usa Expo 57, React Native, Expo Router y TypeScript. `apps/mobile/app/_layout.tsx` ya carga Nunito, monta el proveedor de autenticación y usa un tema de navegación según el teléfono. `apps/mobile/constants/theme.ts` conserva colores de plantilla distintos de la paleta aprobada. `apps/mobile/app/(tabs)/_layout.tsx` declara tres pestañas, mientras `apps/mobile/components/nav.tsx` dibuja cuatro destinos solo con iconos y otros colores. Las pantallas existentes son parciales; no acreditan los recorridos nuevos. Estas observaciones son del checkout revisado al redactar este plan, no funciones terminadas.

Antes de editar código se leerá también `apps/mobile/AGENTS.md` y se comprobará el árbol de trabajo para conservar cambios ajenos. La migración visual deberá retirar rutas o estilos antiguos únicamente cuando sus sustitutos estén conectados y comprobados.

## Diseño por piezas

| Pieza | Propuesta de integración | Comprobación principal |
| --- | --- | --- |
| Paleta y texto | Centralizar colores claros, oscuros y de estado ya aprobados, Nunito y la escala inicial de espacios en constantes o componentes compartidos. Usar los HEX de la referencia documentada; no trasladar los colores de plantilla como identidad de Petzy. | Un mismo componente mantiene función, contraste y jerarquía en ambos temas; el verde medio no se usa para texto pequeño cuando no alcance contraste. |
| Elección de tema | Mantener «Automático» como valor inicial; «Claro» y «Oscuro» son opciones de Ajustes. Propuesta técnica: guardar esa preferencia no sensible con el `expo-secure-store` ya instalado, bajo una clave separada de autenticación; al arrancar, leerla antes de mostrar una pantalla con tema incorrecto. «Automático» sigue cambios posteriores del teléfono. | Cerrar y abrir la app conserva una elección manual; volver a «Automático» responde al tema del teléfono sin afectar la sesión. No se añade dependencia nueva. |
| Navegación | Hacer coincidir la declaración de pestañas de Expo Router con la barra dibujada y sus cinco etiquetas visibles. Mantener las rutas secundarias fuera de la barra y abrirlas desde los accesos acordados. Definir regreso al origen en detalle y formularios; al salir con cambios sin guardar aplicar el aviso descrito en el documento de interfaces. | Las cinco pestañas abren su destino, identifican la seleccionada por icono y texto, y no dejan contenido bajo la barra ni una pantalla sin salida. |
| Componentes | Reutilizar botón principal/secundario/deshabilitado/enviando, campo con ayuda y error, tarjeta, avatar o icono de respaldo, mensaje de estado, menú y confirmación. Empezar por los que usan varias pantallas; conservar excepciones justificadas del módulo. | Etiquetas, estados, área táctil y apariencia equivalentes funcionan de la misma forma en pantallas distintas. |
| Datos y formularios | Para cada operación de red describir y conectar `inicial`, `cargando` o `enviando`, `éxito`, `vacío` cuando aplique y `error`; conservar campos ante un fallo y bloquear solo el control que duplicaría el envío, siguiendo [async-feedback](../../../.agents/skills/async-feedback/SKILL.md). | API caída, espera agotada, validación y reintento no aparentan éxito ni dejan indicadores eternos. El error aparece junto a la acción que falló. |
| Accesibilidad y movimiento | Dar nombre accesible a iconos, selección además de color, alternativa textual a fotos y mapas, áreas táctiles suficientes, respeto a zonas seguras, teclado y tamaño de letra del sistema. Usar movimiento breve solo si aclara un cambio; con movimiento reducido, conservar la información sin depender de la animación. | Recorridos en iOS y Android con lector de pantalla, texto ampliado, teclado, temas y movimiento reducido. |

Los detalles finales del logotipo, el dibujo de los iconos de respaldo, radios, alturas y recortes de foto se decidirán y registrarán antes de producir sus activos definitivos. Se probarán en teléfonos reales o simulados con texto ampliado. Si una elección cambia la identidad o el flujo aprobado, se presentará al usuario antes de aplicarla, conforme a `AGENTS.md`. Hasta entonces se usan Nunito, los iconos disponibles y sustitutos neutros para mantener coherencia sin inventar una marca final.

## Orden de implementación futuro

1. **Fundamentos:** comparar la paleta documentada con el tema actual; preparar constantes compartidas, selección y persistencia del tema, tipografía y espacios. Comprobar contraste antes de usar cada par de colores.
2. **Navegación:** alinear declaración de rutas, barra de cinco destinos, accesos secundarios y regreso. Integrar esta pieza con las pantallas que realmente existan en esa etapa; no dejar pestañas que apunten a una pantalla vacía como si el módulo estuviera completo.
3. **Componentes y estados:** crear las piezas compartidas y aplicarlas a una pantalla piloto ya autorizada, incluida una lectura y un formulario con estados de red. Ajustar solo después de probarlas en ambos temas y con texto ampliado.
4. **Integración por módulo:** usar la ficha, plan y tareas de cada capacidad para sus pantallas. Reutilizar componentes y actualizar el documento de interfaces si el diseño aprobado cambia; conservar visibles las dependencias entre módulos.
5. **Comprobación final:** recorrer las rutas aprobadas en iOS y Android cuando sus módulos estén integrados; registrar por DA-01–DA-06 dispositivo, fecha, resultado y límites. Eventos se verifica en su etapa posterior al MVP.

Los fundamentos visuales y el inventario de navegación pueden prepararse en paralelo. La comprobación de una acción de red requiere su API y permisos integrados; la revisión final depende de las pantallas de cada módulo. La ruta crítica es: fundamentos → navegación y componentes → integración por módulo → comprobación.

## Riesgos y tratamiento

- **Cinco pestañas con texto ampliado:** probar etiquetas y anchos en teléfonos pequeños; ajustar distribución sin ocultar nombres ni cambiar los cinco destinos aprobados.
- **Cambio de tema al arrancar:** leer la preferencia antes de presentar contenido sensible a parpadeos; si la lectura local falla, usar «Automático» y permitir elegir de nuevo en Ajustes.
- **Contraste de verdes y estados:** medir combinaciones reales de texto, fondo, foco y botón. El documento de interfaces ya señala pares que no sirven para texto normal; elegir variantes aprobadas que sí sean legibles y registrar cualquier color nuevo que requiera decisión.
- **Pantallas incompletas del código actual:** integrar navegación por etapas con los módulos; no presentar una pantalla parcial como terminada ni confundir el diseño revisado con función disponible.
- **Dependencia de la red:** el componente visual no decide por sí mismo si una operación fue exitosa; esperar la respuesta del servicio del módulo y aplicar los estados de [async-feedback](../../../.agents/skills/async-feedback/SKILL.md).
- **Activos de la imagen de referencia:** los PNG recibidos sirven como guía. Su origen y licencia no están verificados, por lo que no se incorporarán como activos de producción sin aclararlo.

## Verificación y evidencia

Durante la implementación autorizada: `pnpm --filter mobile lint` y `pnpm --filter mobile exec tsc --noEmit`; después, recorridos manuales en iOS y Android con pantalla pequeña y mayor, texto ampliado, teclado abierto, claro/oscuro/automático, lector de pantalla y movimiento reducido. Para datos, probar carga lenta, vacío, API inaccesible, espera agotada, validación, doble toque y reintento. Registrar capturas de la app real y resultado de DA-01–DA-06 sin llamarlos verificados antes de ejecutar el recorrido. No se crea una suite de pruebas que copie colores o texto sin probar comportamiento.

## Límites y siguiente puerta

Este plan no cambia código ni instala dependencias. La lista `02-TAREAS.md` divide el trabajo en pasos pequeños con aceptación, verificación y archivos previstos; ya fue aprobada. La implementación solo comenzará después de recibir autorización explícita del usuario para programar.
