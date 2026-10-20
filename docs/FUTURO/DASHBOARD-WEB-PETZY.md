# Sistema web del equipo Petzy — etapa posterior al MVP

**Estado:** propuesta futura, fuera del MVP móvil. **Código:** no existen todavía chat, reportes, aplicación web del equipo, acceso de personal ni suspensiones. **Decisión de alcance:** D-87 en [03-DECISIONES.md](../03-DECISIONES.md).

## Qué hará Chat en el MVP

Dos personas podrán conversar y bloquearse. Si Ana bloquea a Luis, ninguno podrá enviarle mensajes nuevos al otro mientras exista ese bloqueo, aunque ambos podrán leer el historial que aún tengan visible. Cada persona controla el bloqueo que puso. Este bloqueo **no suspende la cuenta** ni impide usar el resto de Petzy.

En esta versión también habrá «Reportar conversación»: la persona seleccionará mensajes, podrá añadir una explicación y Petzy guardará el reporte en una tabla de la base de datos. La app confirmará solamente «Reporte guardado». **El equipo no tendrá manera todavía de consultar o revisar esos reportes.** Tampoco habrá bandeja del equipo, acciones administrativas ni suspensiones. La [ficha de Chat privado](../ESPECIFICACIONES/07-CHAT-PRIVADO.md) describe el alcance del MVP.

La [ficha de Adopción](../ESPECIFICACIONES/08-ADOPCION.md) también incluye guardar en el MVP reportes de anuncios que parezcan ventas o engaños (D-91, D-97–D-98). Se permite uno por persona y anuncio. Cada reporte conservará título, descripción, estado y referencias a las fotos privadas del momento, al menos hasta que el equipo revise ese caso en la web futura, aunque el anuncio cambie o se retire. Estos reportes no darán al equipo una bandeja ni la facultad de retirar anuncios durante el MVP; el [plan aprobado](../ESPECIFICACIONES/08-ADOPCION/01-PLAN.md) detalla su representación.

## Qué se añadirá en la etapa futura

El usuario propone una **aplicación web separada de la app móvil**, construida con un framework web que se elegirá entonces. Los reportes ya guardados por el MVP podrán consultarse y gestionarse por personal autorizado desde la web a través de una API protegida, después de definir sus permisos. La tabla creada para recibir reportes no da por sí sola acceso de lectura al equipo.

Esta etapa tendrá requisitos, ficha, plan, tareas, pruebas y despliegue propios. Deberá definir al menos:

1. **Integración de datos:** cómo acceder a los reportes creados por Chat y Adopción, qué mensajes o datos del anuncio se muestran al equipo y cómo se protege el contenido.
2. **Conservación posterior a la revisión:** D-88 acuerda conservar cada reporte de Chat y sus mensajes referenciados al menos hasta revisar ese caso; «Borrar chat para mí» no los elimina físicamente. D-97 exige la misma conservación mínima para cada reporte de Adopción y los datos del anuncio necesarios para entenderlo. La etapa web definirá qué conservar o borrar después de revisar cada caso.
3. **Acceso del personal:** inicio y cierre de sesión, recuperación de acceso, alta y revocación de integrantes y permisos independientes de los roles comunitarios.
4. **Bandeja y revisión web:** filtros, detalle limitado a lo reportado, quién revisó cada caso y cuándo. Definir por separado qué decisiones se permiten sobre un chat o un anuncio de Adopción; el acceso a conversaciones completas no queda aprobado.
5. **Medidas posibles:** evaluar las decisiones previas de suspensión por 1, 7 o 30 días, relevo comunitario y ampliación por un reporte nuevo (D-78, D-80 y D-85). Son antecedentes, **no funciones del MVP**.
6. **Interfaz y operación:** accesibilidad, estados de carga, vacío, éxito y error, pruebas del navegador, monitoreo y despliegue. El framework y la ubicación del proyecto se elegirán después de aprobar requisitos.

Antes de construir este sistema se abrirá un ciclo SDD propio. Esta nota registra el alcance futuro sin autorizar código, migraciones, permisos de personal o suspensiones ahora.
