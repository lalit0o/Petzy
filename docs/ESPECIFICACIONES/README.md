# Índice de especificaciones de Petzy

El [mapa de capacidades](../../MAPA-CAPACIDADES.md) fija IDs, límites y dependencias. La [ruta secuencial](../RUTA-DE-DESARROLLO.md) indica qué módulo abordar primero, qué está integrado y dónde consultar requisitos funcionales, no funcionales y criterios de aceptación. Cada ficha es un **borrador para revisión** aunque alguna función tenga código inicial. «En implementación» describe código existente, no aprobación automática del contrato ni verificación completa. El proceso está en [SDD.md](../SDD.md).

Cada módulo conserva una ficha; dentro de ella, los flujos se describen con [PLANTILLA-FLUJO.md](PLANTILLA-FLUJO.md). Los RF están en [PROYECTO.md](../PROYECTO.md), los RNF se aplican desde su sección 7 y cada ficha aporta criterios con ID. Si un dato, permiso o paso no está acordado, debe figurar como pendiente. La implementación de una ficha requiere revisión humana de su especificación, plan y tareas conforme a SDD.

| ID | Ficha | Estado del contrato | Decisión o verificación que falta antes de avanzar |
| --- | --- | --- | --- |
| `cuenta` | [CUENTA-PERFIL.md](CUENTA-PERFIL.md) | Borrador; código inicial | Registro parcial, sesión y recuperación. |
| `publicaciones` | [FEED.md](FEED.md) | Borrador; código parcial | Asociación con mascota y visibilidad comunitaria. |
| `perfiles` | [PERFILES.md](PERFILES.md) | Borrador; código parcial | Campos públicos y baja de cuenta. |
| `mascotas` | [MASCOTAS.md](MASCOTAS.md) | Borrador; código parcial | Migración de edad y campos públicos. |
| `interacciones` | [INTERACCIONES.md](INTERACCIONES.md) | Borrador; código parcial | Moderación e historial al desactivar publicaciones. |
| `comunidades` | [COMUNIDADES.md](COMUNIDADES.md) | Borrador; en implementación | Visibilidad, ingreso, salida del último administrador y tema. |
| `chat-privado` | [CHAT-PRIVADO.md](CHAT-PRIVADO.md) | Borrador; sin código; necesario para adopción en el MVP | Inicio, bloqueo, retención y entrega. |
| `adopcion` | [ADOPCION.md](ADOPCION.md) | Borrador; sin código | Moderación, prevención de ventas y cierre de publicaciones; se integra después del chat privado. |
| `eventos` | [COMUNIDADES-EVENTOS.md](COMUNIDADES-EVENTOS.md) | Borrador; en implementación | Migración Supabase y prueba autenticada en dispositivo; Storage y avisos siguen abiertos. |
| `diseno-app` | [DISENO-APP.md](DISENO-APP.md) | Borrador; diseño parcial y desigual en código | Capacidad transversal: identidad visual, navegación y criterios de revisión. No se implementa aún. |

La revisión humana de cada ficha cierra la fase **Especificar** solo para el alcance aprobado. Después se revisan plan y tareas por separado. El [plan](COMUNIDADES-EVENTOS/PLAN.md) y las [tareas](COMUNIDADES-EVENTOS/TAREAS.md) de eventos preceden esta reorganización: registran trabajo real, pero requieren nueva revisión antes de usar sus pendientes como autorización de implementación.
