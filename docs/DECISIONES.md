# Decisiones de producto y arquitectura

Este registro evita que una propuesta de la documentación se confunda con una decisión aprobada. Cada acuerdo indica su alcance; **confirmado** significa elegido por el usuario, no implementado en código.

| ID | Estado | Decisión | Consecuencia para la implementación |
| --- | --- | --- | --- |
| D-01 | Confirmada | Supabase Postgres es la base de datos elegida y Supabase Auth gestiona identidades. | Prisma puede conectarse a Supabase mediante `DATABASE_URL`. En el entorno local revisado el 29-09-2026 esa variable apuntaba a `localhost`; falta configurar y verificar la conexión de Supabase. No se ha decidido retirar Prisma. |
| D-02 | Confirmada | La mascota tendrá fecha de nacimiento; la edad se calculará con la fecha actual. | Sustituir el almacenamiento de edad fija tras revisar cómo migrar registros existentes. No guardar una edad derivada que quede desactualizada. |
| D-03 | Confirmada | El feed principal muestra solo publicaciones con `communityId = null`. Cada comunidad muestra solo publicaciones con su `communityId`. | Filtrar en el acceso a datos y verificar que un post no aparezca en el contexto equivocado. |
| D-04 | Confirmada | Los usuarios registrados pueden buscar y consultar perfiles de otros usuarios con datos generales y mascotas relacionadas. | El guard exige sesión; no exponer correo, credenciales ni campos privados. El endpoint de búsqueda actual requiere restringir su respuesta. |
| D-05 | Confirmada | En una comunidad, solo `ADMIN` y `MODERATOR` pueden crear eventos; `MEMBER` no. | Verificar el rol en el servidor además de ocultar la acción en la app. |
| D-06 | Confirmada | El detalle de comunidad se divide en «Publicaciones» y «Eventos». | Eventos en tarjetas con foto, título, fecha/hora y lugar breve; el detalle incluye información completa y mapa. |
| D-07 | Confirmada | Las publicaciones, incluidas las comunitarias, pueden recibir likes. | Reutilizar `PostLike`, que ya existe en el esquema; faltan API e interfaz. |
| D-08 | Confirmada | La documentación seguirá SDD: especificación, aclaración de decisiones, plan, tareas, implementación y verificación. | Mantener [SDD.md](SDD.md) y fichas por función como guía de trabajo. |
| D-09 | Confirmada | Eventos visibles para usuarios registrados; solo miembros confirman asistencia; creador y `ADMIN` editan o cancelan. | Se muestra el total de asistentes, no una lista nominal. La portada es opcional y el lugar se define con nombre y coordenadas. |
| D-10 | Confirmada | El detalle del evento muestra un mapa con un marcador y ofrece «Cómo llegar» en la app de mapas del teléfono. | Usar el SDK de mapas del dispositivo mediante `react-native-maps`; no construir un servidor de mapas ni navegación propia. |
| D-11 | Confirmada para documentación | La reescritura SDD usa el [mapa de capacidades](../MAPA-CAPACIDADES.md) con IDs estables para diseño de la app, cuenta, perfiles, mascotas, publicaciones, interacciones, comunidades, eventos y chat privado. | Revisar cada ficha por separado y conservar las puertas de aprobación de especificación, plan, tareas e implementación. No resuelve decisiones funcionales pendientes. |
| D-12 | Confirmada | Las personas amantes de las mascotas pueden registrarse y participar en feed, comunidades y eventos aunque no tengan una mascota propia. | El registro y la participación no exigen crear una ficha `Pet`. «Mis mascotas» debe tener un estado vacío útil; perfiles de personas sin mascota siguen siendo consultables. Se mantienen los requisitos de sesión, membresía y rol de cada operación. |
| D-13 | Confirmada para planificación futura | Una posible aportación para gastos veterinarios en adopciones se deja para una etapa posterior. | No se añade un monto, precio ni flujo de pago al MVP de adopción. Antes de especificar esta opción habrá que acordar reglas que impidan usarla para vender mascotas. |
| D-14 | Confirmada | El apartado de adopción forma parte del MVP. Cualquier persona registrada puede publicar mascotas que buscan hogar y el autor indica cuando ya encontraron uno; las personas interesadas pueden iniciar chat privado con el autor desde la publicación. | Integrar primero el chat privado uno a uno y después adopción, ambos dentro del MVP. Separar las publicaciones de adopción del feed general y prohibir su uso para vender mascotas. Los cambios técnicos siguen sujetos a revisión. |

## Decisiones pendientes que afectan el siguiente desarrollo

- **Acceso a datos:** Prisma ya puede conectarse a Supabase Postgres. La preferencia por usar más servicios de Supabase está clara, pero falta decidir si los CRUD permanecerán en NestJS o pasarán a la Data API desde móvil, con RLS. No retirar Prisma hasta concretar y verificar la sustitución.
- **Mascotas:** cómo convertir las edades numéricas que ya existan a fechas de nacimiento. Una edad en años no permite deducir un cumpleaños exacto sin información adicional.
- **Comunidades:** visibilidad y política de ingreso, y qué pasa cuando sale el último administrador.
- **Eventos:** carga segura de portadas a Supabase Storage, selección de coordenadas desde el mapa o búsqueda de dirección, avisos a asistentes al editar/cancelar y configuración de Google Maps para binarios Android de producción. La primera versión recibe nombre y coordenadas manualmente. Véase [COMUNIDADES-EVENTOS.md](ESPECIFICACIONES/COMUNIDADES-EVENTOS.md).
- **Publicaciones:** decidir si se vinculan opcionalmente a una mascota y cómo se muestra el historial si la mascota se desactiva.
- **Cuenta y perfiles:** recuperación ante registro parcial entre Supabase Auth y `User`, ciclo de sesión, campos públicos exactos y efecto de la baja de cuenta.
- **Interacciones:** moderación de comentarios y tratamiento de likes/comentarios al desactivar una publicación.
- **Chat privado:** quién puede iniciar conversación, bloqueo, reportes, retención y eventual entrega en vivo.
- **Diseño de la app:** confirmar una dirección visual única a partir de los estilos actuales, el tratamiento de fotos y la navegación antes de rediseñar pantallas. La implementación se realizará en una etapa posterior.
- **Adopción en el MVP:** definir moderación y reportes, reglas para evitar anuncios de venta, visibilidad de publicaciones cerradas y el modo de marcar que la mascota encontró hogar. La aportación para gastos veterinarios es otra decisión, aplazada: si más adelante se considera, definir gastos admitidos, comprobantes, límites, destinatario y controles contra ventas encubiertas. No hay modelo, contrato ni pagos aprobados para esa opción.

Al resolver una decisión, moverla a la tabla con su ID y actualizar las especificaciones afectadas. No completar un campo pendiente por inferencia si cambia el resultado para el usuario o el esquema.
