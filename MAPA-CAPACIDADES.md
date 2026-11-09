# Mapa de capacidades de Petzy

**Estado:** límites y dependencias del MVP móvil, ampliados con Adopción por D-14. El posible sistema web del equipo está fuera de este mapa de ejecución y se describe como [trabajo futuro](docs/FUTURO/DASHBOARD-WEB-PETZY.md). Este mapa no certifica funciones terminadas. La [ruta de desarrollo](docs/00-RUTA-DE-DESARROLLO.md) fija la secuencia y el estado de integración.

Cada fila representa una función de Petzy. «Depende de» indica qué otra función debe estar disponible para que esta funcione por completo; por ejemplo, Adopción necesita el chat para contactar a quien publicó. El ID es una etiqueta estable para enlazar documentos, no un nombre que verá la persona en la app.

| ID estable | Responsabilidad y límite | Depende de | Especificación |
| --- | --- | --- | --- |
| `cuenta` | Registro, acceso, recuperación, sesión y credenciales mediante Supabase Auth. | — | [Cuenta](docs/ESPECIFICACIONES/01-CUENTA.md) |
| `publicaciones` | Creación, consulta, edición, desactivación, cinco categorías elegibles, filtros de Inicio y separación entre feed general y comunitario. Define el contrato de publicación que consume `comunidades`. | `cuenta` | [Publicaciones](docs/ESPECIFICACIONES/02-PUBLICACIONES.md) |
| `perfiles` | Datos de aplicación del usuario, consulta pública, búsqueda y edición propia. | `cuenta` | [Perfiles](docs/ESPECIFICACIONES/03-PERFILES.md) |
| `mascotas` | Fichas de mascotas, propiedad, edad calculada y visibilidad en perfiles. | `cuenta`, `perfiles` | [Mascotas](docs/ESPECIFICACIONES/04-MASCOTAS.md) |
| `interacciones` | Comentarios y likes sobre publicaciones visibles. | `publicaciones` | [Interacciones](docs/ESPECIFICACIONES/05-INTERACCIONES.md) |
| `comunidades` | Exploración, membresía, roles y detalle de comunidad; consume publicaciones por `communityId`. | `cuenta`, `publicaciones` | [Comunidades](docs/ESPECIFICACIONES/06-COMUNIDADES.md) |
| `chat-privado` | Conversaciones uno a uno, mensajes, bloqueo entre participantes, bandeja, avisos y reportes guardados en una tabla. La revisión y las suspensiones quedan para la etapa web futura (D-87). | `cuenta`, `perfiles` | [Chat privado](docs/ESPECIFICACIONES/07-CHAT-PRIVADO.md) |
| `adopcion` | Publicaciones para encontrar hogar, estado gestionado por el autor y contacto con él; las reglas de mensajes pertenecen a `chat-privado`. | `cuenta`, `chat-privado` | [Adopción](docs/ESPECIFICACIONES/08-ADOPCION.md) |
| `eventos` | Encuentros de comunidad, mapa, permisos y asistencia. | `comunidades` | [Eventos](docs/ESPECIFICACIONES/09-EVENTOS.md) |
| `diseno-app` | Identidad visual, navegación, componentes y estados de interfaz compartidos; no define permisos ni contratos de datos. | — | [Diseño de la app](docs/ESPECIFICACIONES/90-DISENO-APP.md) |

**Orden secuencial de cierre:** `cuenta` → `publicaciones` → `perfiles` → `mascotas` → `interacciones` → `comunidades` → `eventos` (parte 1) → `chat-privado` → `adopcion` → `eventos` (parte 2: avisos al teléfono y cierre, D-144). Chat privado y Adopción pertenecen al MVP (D-14); Adopción se integra después de verificar el chat. Eventos pertenece al MVP como parte de Comunidades (D-144) y se implementa en dos partes según el orden indicado. `diseno-app` es transversal y su implementación está aplazada por indicación del usuario. El detalle de cada paso y su estado real está en [00-RUTA-DE-DESARROLLO.md](docs/00-RUTA-DE-DESARROLLO.md). Chats grupales, reconocimiento de raza con CNN y el sistema web del equipo necesitan especificaciones propias si más adelante entran en alcance.

Los contratos entre módulos se definen en la ficha del módulo que proporciona el dato u operación. [API](docs/05-API.md) y [Datos y permisos](docs/04-DATOS-Y-PERMISOS.md) son inventarios transversales; el código y las migraciones siguen siendo evidencia del comportamiento actual.
