# Mi perfil y Buscar — D-137, 26 de octubre de 2026

El usuario autorizó implementar los ajustes documentados y pidió avisar para verificarlos en su teléfono. Mi perfil abre con foto, nombre, correo, biografía y estado guardados, sin controles editables. «Modificar perfil» habilita el formulario en la misma pantalla; el correo sigue siendo de lectura.

Guardar valida y envía los datos por el contrato existente. Durante el envío se bloquean cambios de texto y estado para que la respuesta corresponda al borrador enviado. Tras éxito vuelve a lectura y muestra `Alert.alert` con «Perfil actualizado» / «Tus cambios se guardaron correctamente». Un error mantiene el borrador y permite reintentar. Cancelar restaura nombre, biografía y estado desde los últimos datos guardados.

Los controles de foto solo aparecen en edición y explican su guardado inmediato. Subir o quitar foto no descarta el borrador de texto; Cancelar no revierte la foto. Se mantienen espera, confirmación y error de estas operaciones.

Buscar se integra como `/buscar` en el navegador de pestañas, con icono de lupa y selección propia en la barra inferior. Se retira el acceso desde Mi perfil. El componente compartido `components/search-profiles-screen.tsx` conserva búsqueda, errores, reintento, paginación y apertura de perfiles. `/profiles/search` sigue disponible por compatibilidad. El perfil público vuelve por historial y usa `/buscar` si no hay historial. La barra ajusta el ancho de sus cinco destinos a pantallas pequeñas; Mascotas usa el icono de huella para distinguirlo de Mi perfil.

No cambian API, permisos, esquema, migraciones, proveedores ni dependencias. D-136/CO-T19 permanece pendiente de definir eliminación y efectos sobre datos/fotos; no se implementó esa regla.

## Verificación local

- `pnpm --filter mobile verify:profiles`: aprobado. Componentes y hooks reales con servicios y navegación controlados: lectura inicial, edición, cancelar texto/estado, validación, error/reintento, doble envío, alerta únicamente tras éxito, foto inmediata independiente del borrador, desactivación y respuestas atrasadas. También selección de pestañas, barra con anchos 320/375/768, búsqueda, paginación sin duplicados y apertura de perfil. No es un render nativo.
- `pnpm --filter mobile exec tsc --noEmit`: aprobado.
- ESLint dirigido a las pantallas, barra, componente compartido y scripts modificados: aprobado sin avisos.
- Exportación iOS con Hermes: aprobada, 1615 módulos. El primer intento dentro del sandbox falló por permisos al ejecutar `hermesc.exe`; el reintento fuera del sandbox terminó correctamente. Artefactos locales en `.local-tmp/export-ios-d137/`, ignorados por Git. Esto acredita empaquetado, no ejecución física.

## Recorrido pendiente en teléfono

1. Abrir Mi perfil: tocar los datos no abre teclado ni selector; no hay controles de foto.
2. Modificar perfil, editar texto y estado; Cancelar recupera los valores guardados.
3. Guardar: comprobar vuelta a lectura y alerta nativa con los textos acordados. Probar validación y un fallo de API: conservar el borrador y reintentar.
4. Cambiar o quitar foto durante edición; cancelar el texto y comprobar que la foto se conserva. Comprobar también foto fallida sin perder texto.
5. Abrir Buscar desde la lupa inferior, buscar, cargar más, entrar a un perfil y volver. Confirmar pestaña seleccionada, teclado, área segura, tema y texto ampliado.

PE-T11, PE-T12 y PE-T14 siguen abiertas hasta reunir el recorrido físico y el resto de sus criterios. Perfiles no se declara verificada de punta a punta.

## Ajuste posterior: borrar búsqueda

A petición del usuario, el buscador de personas muestra una X dentro del campo cuando hay texto. «Borrar búsqueda» vacía el texto, resultados, paginación y errores, invalida respuestas pendientes y enfoca el campo para escribir otra consulta. Sin texto la X desaparece. Se mantiene la búsqueda por botón o teclado. Comprobado con el script de navegación, TypeScript y lint dirigido; presentación y teclado reales pendientes de revisión en teléfono.

## Cierre funcional posterior — 26-10-2026

El usuario confirmó funcionamiento correcto de Perfiles, incluyendo expresamente borrar fotos y borrar una comunidad de un único miembro, y aceptación general del resto. Se combina con las pruebas previas para cerrar PE-T11–PE-T14 y CO-T19. No se le atribuye una lista de casos que no enumeró. Los pendientes físicos indicados antes de esta confirmación quedan sustituidos por el [registro de cierre](2026-10-26-CIERRE-PERFILES.md); Cuenta y los demás módulos mantienen sus pendientes propios.
