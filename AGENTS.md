# Contexto para agentes de IA — Petzy

Este archivo es el punto de entrada para cualquier agente que trabaje en el repositorio. El objetivo es que entienda el producto y el estado real del código antes de proponer cambios. Responder y documentar en español, salvo que el usuario pida otro idioma.

## Qué es Petzy

Aplicación móvil para personas con mascotas y amantes de los animales que no tengan una propia. Una persona puede registrarse y participar en feed, comunidades y eventos sin crear una ficha de mascota (D-12); quien tiene mascotas puede registrar sus perfiles. El MVP incluye chat privado uno a uno y, después de integrarlo, un apartado de adopción sin ventas. La posible aportación para gastos veterinarios queda para una etapa futura. Eventos con mapa y confirmación de asistencia tienen una implementación inicial pendiente de migración en Supabase y prueba real. Chats grupales y detección de raza canina con CNN son opcionales.

## Dónde encontrar la información

1. [docs/RUTA-DE-DESARROLLO.md](docs/RUTA-DE-DESARROLLO.md): orden secuencial, estado integrado de cada módulo, próximo paso y enlaces a requisitos y criterios. Leerla antes de escoger trabajo.
2. [docs/SDD.md](docs/SDD.md), [MAPA-CAPACIDADES.md](MAPA-CAPACIDADES.md) y [docs/ESPECIFICACIONES/README.md](docs/ESPECIFICACIONES/README.md): proceso guiado por especificaciones, mapa y fichas por capacidad.
3. [.agents/skills/async-feedback/SKILL.md](.agents/skills/async-feedback/SKILL.md): leerla completa al comenzar cada contexto de trabajo; aplicarla a toda pantalla o acción que consulte o envíe datos, para asegurar estados de espera, éxito, error y reintento visibles.
4. [docs/DECISIONES.md](docs/DECISIONES.md): acuerdos confirmados y decisiones pendientes; consultar antes de completar las pendientes.
5. [docs/PROYECTO.md](docs/PROYECTO.md): alcance, requisitos funcionales y no funcionales, prioridades y criterios de aceptación.
6. [docs/API.md](docs/API.md): rutas que existen y contrato propuesto. Una ruta «propuesta» no está implementada.
7. [docs/DATOS-Y-PERMISOS.md](docs/DATOS-Y-PERMISOS.md): esquema, relaciones y permisos objetivo. Una regla «objetivo» no implica que el backend ya la cumpla.
8. [README.md](README.md): instalación, variables de entorno, comandos y problemas conocidos.

El código es la referencia final del comportamiento actual. Si un documento y el código difieren, comprobar el código y actualizar la documentación como parte del cambio.

## Mapa del repositorio

- `apps/mobile`: Expo, React Native, Expo Router y TypeScript. Pantallas en `app/`; autenticación en `hooks/useAuth.ts` y `context/AuthContext.tsx`.
- `apps/backend`: NestJS y TypeScript. Módulos en `src/auth`, `src/user`, `src/pet`, `src/post` y `src/comments`.
- `apps/backend/prisma/schema.prisma`: modelo Prisma de PostgreSQL; Supabase Postgres es el destino elegido, pero el entorno local revisado el 29-09-2026 aún tenía `DATABASE_URL` en `localhost`. Migraciones en `apps/backend/prisma/migrations`.
- Supabase Auth gestiona identidades y tokens. El backend usa el ID autenticado como `User.id`; la app guarda el token con Expo SecureStore.
- La implementación actual consulta la base desde NestJS con Prisma. Supabase Storage, Data API y Realtime son capacidades disponibles para evaluar en fotos, CRUD sencillo y chat; no están integradas todavía.
- El repositorio usa `pnpm` workspaces. Consulte el README para arrancar los servicios.

## Estado que no se debe confundir con una función terminada

- Registro e inicio de sesión tienen una implementación inicial; recuperación de contraseña y ciclo completo de sesión siguen pendientes.
- La pantalla de perfil es básica. Mascotas sigue como marcador de posición. Comunidades ya tiene exploración, creación y detalle con secciones; el feed móvil todavía no carga ni representa publicaciones.
- Hay tablas y endpoints para mascotas, publicaciones y comentarios, pero faltan permisos en operaciones de usuario/mascota, integración móvil y algunas validaciones.
- `Community` y `CommunityMember` tienen API y flujo móvil inicial; faltan búsqueda temática, gestión de roles/salida y publicar desde su mini-feed.
- `PostLike` existe en Prisma; todavía no tiene endpoints.
- `Event` y `EventAttendance`, API y pantallas están escritos. La migración se aplicó a PostgreSQL local (`localhost:5435`) el 29-09-2026; no se ha verificado en Supabase ni en dispositivo. Chat privado aún no tiene modelo, API ni pantalla.

Estas notas reflejan la revisión inicial de septiembre de 2026. Verifique el estado actual antes de iniciar cada tarea y actualice esta sección cuando cambie.

## Diseñar cada cambio para el proyecto completo

Antes de agregar una tabla, endpoint, servicio, pantalla o dependencia, identificar qué módulos actuales y futuros consumirán o modificarán ese dato: perfil, mascotas, feed, comunidades, chat, adopción y eventos. Definir una sola fuente de verdad, sus relaciones, permisos y contrato de acceso para que el cambio no obligue a duplicar lógica ni rompa otros módulos después.

- Revisar el impacto en esquema y migraciones, API, tipos compartidos, autenticación, navegación y consultas existentes. Si cambia un contrato, actualizar juntos a sus consumidores o mantener compatibilidad durante la transición.
- Preferir modelos y operaciones extensibles: relaciones explícitas, restricciones e índices adecuados, paginación en listados que crecerán y reglas de autorización aplicadas en el punto de acceso a datos.
- Evitar decisiones locales que creen inconsistencias globales; por ejemplo, guardar una edad calculada que envejece, mezclar publicaciones generales con las de una comunidad o crear dos rutas de escritura para el mismo recurso.
- Mantener cada módulo con responsabilidades claras y reutilizar las capacidades existentes de Supabase y del proyecto. No introducir abstracciones anticipadas sin un caso real que las necesite.
- Verificar el flujo nuevo y los módulos relacionados antes de darlo por terminado. Documentar cualquier efecto sobre datos existentes o integración móvil/backend.

## Consultar antes de decidir algo no definido

Antes de implementar un cambio, contrastarlo con la solicitud del usuario y con la documentación. Si hace falta tomar una decisión que no esté definida ni autorizada, presentar la propuesta y preguntarle al usuario **antes de aplicarla**; esperar su respuesta para la parte dependiente de esa decisión. Esto incluye nuevas columnas o tablas, cambios de tipo o relación, reglas de negocio, permisos o visibilidad, contratos de API, proveedores externos y funcionalidades adicionales.

Para una columna nueva, explicar al menos nombre, tipo, si puede ser nula, valor inicial para registros existentes, motivo, módulos afectados y migración prevista. Para otras decisiones, explicar su efecto y las alternativas relevantes. Registrar la decisión acordada en la documentación junto con el cambio.

No interpretar esta regla como permiso para inventar requisitos ni como necesidad de volver a preguntar por cada paso técnico de una tarea ya definida y autorizada. Mientras se espera una respuesta, se puede continuar con análisis y trabajo independiente que no dependa de ella.

## Diseño de nuevas pantallas

Petzy está dirigida a personas que quieren compartir y cuidar a sus mascotas y a quienes disfrutan conocerlas aunque no tengan una propia. La experiencia debe sentirse **cercana, tranquila y fácil de usar**, incluso para quien solo entra unos minutos a ver fotos, registrar una mascota o encontrar una comunidad. Las mascotas y el contenido de sus dueños son el centro de la pantalla; la interfaz debe ayudarlos a destacar sin competir con ellos. La [especificación de diseño](docs/ESPECIFICACIONES/DISENO-APP.md) está en borrador; su implementación se realizará después.

Al crear o rediseñar una pantalla móvil, leer y aplicar la guía `apple-design` de `.agents/skills/apple-design/SKILL.md`, adaptando sus principios a React Native y al estilo existente de Petzy. Buscar una estética minimalista pero cálida: espacios bien medidos, tipografía legible, imágenes de mascotas protagonistas, iconos comprensibles y una acción principal evidente. Usar lenguaje cotidiano y amable, etiquetas concretas como «Agregar mascota» o «Unirme a la comunidad» y formularios cortos que expliquen lo necesario. Simplicidad significa que la persona entienda qué puede hacer y complete la tarea sin esfuerzo; no significa ocultar información útil o dejar una pantalla vacía.

Para cada pantalla, identificar primero la tarea principal del dueño de mascota y mostrarla con prioridad visual. Por ejemplo: en Mascotas, ver y registrar fichas; en el feed, explorar y publicar; en Comunidades, descubrir grupos y entrar en uno; en Perfil, reconocer a la persona y ver sus mascotas. Mantener consistencia en colores, componentes y navegación entre módulos. Dar respuesta inmediata a las interacciones; usar movimiento y efectos translúcidos con moderación y solo cuando aclaren el estado o la relación entre elementos. Respetar áreas seguras, tamaños de texto del sistema, contraste, etiquetas accesibles y preferencias de movimiento reducido. Diseñar también los estados de carga, vacío, error y éxito con mensajes claros y amables.

Si la pantalla exige una decisión visual o de flujo que no esté definida y pueda afectar la identidad o la navegación del producto, presentar una propuesta concreta al usuario antes de implementarla, según la regla anterior.

## Al implementar un módulo

- Empezar por [RUTA-DE-DESARROLLO.md](docs/RUTA-DE-DESARROLLO.md): elegir el primer paso sin verificar, abrir su ficha y localizar actor, precondiciones, entradas, validaciones, errores, RF, RNF y criterios. Seguir [SDD.md](docs/SDD.md): aclarar y confirmar la especificación, derivar plan técnico y tareas, implementar y verificar criterios. No convertir decisiones pendientes en código por inferencia.
- Mantener alineados esquema y migración, DTO y API, permisos del servidor, pantalla móvil y documentación. Usar los criterios de aceptación de `docs/PROYECTO.md`.
- Derivar autor y propietario del token validado; comprobar propiedad o membresía en el backend. No tomar `userId` u `ownerId` del cliente para crear recursos propios.
- Antes de construir un servicio propio, comprobar si Supabase Auth, Storage, Data API o Realtime resuelve el caso. Mantener NestJS/Prisma cuando aporte reglas de negocio, coordinación o controles necesarios. Si la app accede directamente a la Data API, definir y probar RLS y permisos de base por operación; no confiar solo en filtros del cliente.
- Tratar contraseñas y cambios de credenciales mediante Supabase Auth. No registrar contraseñas, tokens ni claves de servidor; las variables `EXPO_PUBLIC_*` son visibles para el cliente.
- Distinguir contenido activo de desactivado y definir los efectos sobre sus relaciones. Mantener las respuestas públicas limitadas a campos públicos.
- Documentar un endpoint como «actual» solo después de implementarlo y verificarlo. Conservar separadas las decisiones pendientes y las capacidades existentes.
- Respetar cambios que ya existan en el árbol de trabajo; consultar el estado de Git antes de editar archivos compartidos.

Si trabaja dentro de `apps/mobile`, lea también su `AGENTS.md` específico antes de modificar código móvil.
