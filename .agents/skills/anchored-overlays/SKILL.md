---
name: anchored-overlays
description: Diseñar o corregir menús emergentes y selectores pequeños de Petzy, como los tres puntos de una publicación o el filtro de categorías, con animación desde el control de origen, separación del fondo y movimiento reducido.
---

# Menús y selectores anclados de Petzy

Patrón pedido por el usuario el 25 de octubre de 2026. El panel debe sentirse conectado al botón que lo abrió y distinguirse claramente del contenido que queda detrás. Se aplica a menús de opciones y filtros pequeños; no convierte automáticamente formularios, avisos de confirmación ni pantallas completas en menús anclados.

Reutilizar `AnchoredMenu` y `AnchoredMenuItem` de `apps/mobile/components/anchored-menu.tsx`. Sus consumidores de referencia son el detalle de publicación y el filtro de categorías de Inicio. Ajustar allí el comportamiento compartido si hace falta, en lugar de copiar una segunda implementación de animación o colores. Conservar las decisiones de Petzy sobre Nunito, paleta, navegación, permisos y estados de red.

## Origen y recorrido

- Medir el control real con `measureInWindow` justo al abrir. Usar una vista medible (`ref` y `collapsable={false}`) para conocer su centro y su borde inferior. No usar coordenadas fijas ni la posición del dedo como sustituto del control.
- El centro medido es el punto del que sale el panel. Calcular `transformOrigin` respecto de la posición final del menú: `centroX - izquierdaDelPanel`, `centroY - parteSuperiorDelPanel`, `0`.
- Abrir debajo del control cuando haya espacio, con una separación inicial de 4 unidades. Ajustar la posición a las áreas seguras y a los bordes de la ventana; si el panel no cabe, permitir desplazamiento interno. No reducir el tamaño del texto para hacerlo caber.
- En el post, medir los tres puntos y usar un menú compacto. En filtros, medir el selector y permitir que el panel tenga su anchura. El contenido de la pantalla no se desplaza al abrir el menú.
- Recalcular el origen en cada apertura, especialmente después de desplazar la pantalla. Las dimensiones disponibles y las áreas seguras se obtienen del dispositivo, no de un modelo de iPhone concreto.

## Animación de entrada y salida

La implementación compartida usa Reanimated, ya instalado:

| Propiedad | Referencia implementada |
| --- | --- |
| Progreso | Valor compartido entre 0, cerrado, y 1, abierto. |
| Superficie | Escala `0.08 + progreso * 0.92` desde el origen medido y opacidad igual al progreso. |
| Apertura | `withSpring(1)` con `duration: 280`, `dampingRatio: 1`, `overshootClamping: true`. |
| Cierre | `withSpring(0)` con `duration: 220` y el mismo amortiguamiento, siguiendo el camino inverso. |
| Fondo oscurecido | Su opacidad sigue el mismo progreso; aparece y desaparece junto al menú. |
| Movimiento reducido | Escala fija en 1 y fundido de 120 ms; consultar `useReducedMotion`. |

Son los valores del patrón actual, no una obligación para todas las animaciones de Petzy. Si se ajustan, conservar una transición suave, sin rebote ornamental ni saltos al cambiar de dirección. Retomar el valor actual al redirigir una animación; no reiniciarla bruscamente a mitad de recorrido.

Mantener el modal nativo montado durante toda la salida. Desmontarlo al pedir cerrar corta la animación. No reemplazar la coordinación del cierre por un `setTimeout` con duración supuesta. Pasar la navegación, el cambio de filtro o la confirmación a `onPress` de `AnchoredMenuItem`: este llama internamente a `close(acción)` y espera a terminar la salida y el cierre nativo. No cerrar inmediatamente desde el consumidor. Un ítem «Cancelar» sin `onPress` solo cierra. En iOS se espera `onDismiss`; en Android se continúa tras ocultar el modal. Ejecutar la acción una sola vez y cancelarla si el menú se oculta externamente, por ejemplo porque el post perdió acceso.

## Separación visual del fondo

El oscurecimiento, la superficie, el borde y la sombra cumplen funciones distintas. Mantenerlos juntos para que el menú no parezca parte de la tarjeta situada detrás. No añadir desenfoque, nuevas dependencias o una paleta distinta por defecto.

| Elemento | Modo claro | Modo oscuro |
| --- | --- | --- |
| Superficie opaca | `#F8F7F0` | `#20311C` |
| Texto | `#111212` | `#DBDFD0` |
| Iconos y selección | `#365625` | `#82A87E` |
| Borde y separadores | `#B5AF8B` | `#525D48` |
| Fila presionada o seleccionada | `#DBDFD0` | `#404F4D` |
| Acción destructiva | `#8C3F37` | `#F0A59A` |
| Velo detrás del panel | Negro al 32 % | Negro al 55 % |

Referencia de volumen: borde de 1 unidad, radio 18, espacio interior 8, sombra negra con desplazamiento vertical 8, radio 20, opacidad 0.24 en claro y 0.5 en oscuro; `elevation: 16` para Android. Los separadores son líneas finas. Las filas tienen al menos 48 unidades de alto, etiquetas Nunito legibles y respuesta visible al presionar. La sombra no debe recortarse al limitar el contenido desplazable.

## Interacción y accesibilidad

- Cerrar al tocar fuera, elegir «Cancelar» o usar Atrás en Android, siempre por el mismo recorrido de salida. Un cierre sin selección conserva el filtro anterior.
- En filtros, marcar la opción vigente con check y estado accesible `radio/checked`, además del color. El disparador informa su estado `expanded` y mantiene visible la categoría actual tras cerrar.
- En acciones, usar etiquetas concretas, iconos del proyecto y color destructivo solo donde corresponda. La confirmación de retirar se conserva; abrir el menú no ejecuta la retirada.
- Mantener aislada la interacción del fondo mientras el modal está abierto y ofrecer una salida accesible. Respetar áreas seguras, texto ampliado y selección desplazable en teléfonos pequeños.
- Mostrar espera, éxito y errores junto a la acción de red según `async-feedback`. La animación no debe anunciar un guardado exitoso ni ocultar un error.

## Verificación

Ejecutar TypeScript y lint de los archivos afectados. En dispositivo, recorrer abrir/cerrar, tocar fuera, cancelar, seleccionar, reapertura, desplazamiento previo, claro/oscuro, texto ampliado y movimiento reducido. Comprobar que una elección no se ejecute dos veces, que cancelar no cambie el filtro y que el contenido no salte de posición. Si no se accede al dispositivo, registrar que el movimiento y la presentación siguen pendientes de verificación visual; una compilación no acredita la experiencia en iPhone.
