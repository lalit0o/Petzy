# Mapa de capacidades de Petzy

**Estado:** límites y dependencias de documentación, ampliados con adopción por D-14. Este mapa no certifica funciones terminadas ni aprueba decisiones abiertas. La [ruta de desarrollo](docs/RUTA-DE-DESARROLLO.md) fija la secuencia y el estado de integración.

| ID estable | Responsabilidad y límite | Depende de | Especificación |
| --- | --- | --- | --- |
| `cuenta` | Registro, acceso, recuperación, sesión y credenciales mediante Supabase Auth. | — | [Cuenta](docs/ESPECIFICACIONES/CUENTA-PERFIL.md) |
| `publicaciones` | Creación, consulta, edición, desactivación y separación entre feed general y comunitario. Define el contrato de publicación que consume `comunidades`. | `cuenta` | [Publicaciones](docs/ESPECIFICACIONES/FEED.md) |
| `perfiles` | Datos de aplicación del usuario, consulta pública, búsqueda y edición propia. | `cuenta` | [Perfiles](docs/ESPECIFICACIONES/PERFILES.md) |
| `mascotas` | Fichas de mascotas, propiedad, edad calculada y visibilidad en perfiles. | `cuenta`, `perfiles` | [Mascotas](docs/ESPECIFICACIONES/MASCOTAS.md) |
| `interacciones` | Comentarios y likes sobre publicaciones visibles. | `publicaciones` | [Interacciones](docs/ESPECIFICACIONES/INTERACCIONES.md) |
| `comunidades` | Exploración, membresía, roles y detalle de comunidad; consume publicaciones por `communityId`. | `cuenta`, `publicaciones` | [Comunidades](docs/ESPECIFICACIONES/COMUNIDADES.md) |
| `chat-privado` | Conversaciones uno a uno y mensajes persistentes. | `cuenta`, `perfiles` | [Chat privado](docs/ESPECIFICACIONES/CHAT-PRIVADO.md) |
| `adopcion` | Publicaciones para encontrar hogar, estado gestionado por el autor y contacto con él; las reglas de mensajes pertenecen a `chat-privado`. | `cuenta`, `chat-privado` | [Adopción](docs/ESPECIFICACIONES/ADOPCION.md) |
| `eventos` | Encuentros de comunidad, mapa, permisos y asistencia. | `comunidades` | [Eventos](docs/ESPECIFICACIONES/COMUNIDADES-EVENTOS.md) |
| `diseno-app` | Identidad visual, navegación, componentes y estados de interfaz compartidos; no define permisos ni contratos de datos. | — | [Diseño de la app](docs/ESPECIFICACIONES/DISENO-APP.md) |

**Orden secuencial de cierre:** `cuenta` → `publicaciones` → `perfiles` → `mascotas` → `interacciones` → `comunidades` → `chat-privado` → `adopcion` → `eventos`. El chat privado y adopción pertenecen al MVP (D-14); adopción se integra después de verificar el chat. Eventos siguen en la etapa posterior. `diseno-app` es transversal y su implementación está aplazada por indicación del usuario. El detalle de cada paso y su estado real está en [RUTA-DE-DESARROLLO.md](docs/RUTA-DE-DESARROLLO.md). Chats grupales y reconocimiento de raza con CNN son opcionales y necesitan su propia ficha si entran en alcance.

Los contratos entre módulos se definen en la ficha del módulo que proporciona el dato u operación. [API](docs/API.md) y [Datos y permisos](docs/DATOS-Y-PERMISOS.md) son inventarios transversales; el código y las migraciones siguen siendo evidencia del comportamiento actual.
