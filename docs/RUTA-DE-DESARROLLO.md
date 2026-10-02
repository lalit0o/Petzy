# Ruta secuencial de desarrollo de Petzy

**Corte documental:** 1 de octubre de 2026 · **Estado:** guía de orden y seguimiento; ninguna ficha queda aprobada automáticamente.

Esta es la entrada para saber **qué sigue, qué existe y dónde está el contrato de cada módulo**. El [mapa de capacidades](../MAPA-CAPACIDADES.md) define límites y dependencias; esta ruta ordena su trabajo. La ficha enlazada en cada paso contiene objetivo, flujos, criterios de aceptación, tecnología, comandos, estrategia de pruebas y límites. Los requisitos funcionales (RF) generales están en [PROYECTO.md, sección 4](PROYECTO.md#4-requisitos-funcionales-por-módulo) y los requisitos no funcionales (RNF) compartidos en su [sección 7](PROYECTO.md#7-requisitos-no-funcionales). Los RNF de seguridad, interfaz y calidad aplican a cada módulo según sus operaciones. [DECISIONES.md](DECISIONES.md) distingue acuerdos de preguntas abiertas.

## Cómo leer el estado

| Estado | Significado |
| --- | --- |
| Sin código | No se observan modelo, API ni pantalla específicos de la capacidad. |
| Parcial | Hay piezas en el repositorio, pero falta un flujo, permiso o integración esencial. |
| En implementación | Hay varias capas iniciadas; la capacidad aún requiere migración, prueba o cierre de reglas. |
| Verificada | Se cumplieron y probaron los criterios de aceptación de la ficha, con evidencia de API, datos y app. Ninguna capacidad tiene hoy esta etiqueta. |

**Estado del código:** inspección del espacio de trabajo del 1 de octubre de 2026, que incluye cambios de aplicación aún sin commit; no equivale a una prueba de ejecución, despliegue ni dispositivo. Al clonar o actualizar desde otra PC, comparar esta tabla con el código realmente recibido y corregir «Integrado hoy» antes de elegir tareas. «Definido» indica requisitos documentados, no aprobación de toda la ficha ni implementación.

## Secuencia principal

| Paso | Capacidad y ficha que debe leerse | RF y criterios de aceptación definidos | Integrado hoy | Falta antes de darlo por terminado |
| --- | --- | --- | --- | --- |
| 1 | [Cuenta e inicio de sesión](ESPECIFICACIONES/CUENTA-PERFIL.md) (`cuenta`) | RF-A01–A03 → CU-01–CU-06: registro, acceso, cierre, recuperación y uso sin mascota. | **Parcial:** registro e inicio, guard y cierre local. | Retirar log de credenciales; resolver registro parcial, sesión/revalidación y recuperación; verificar CU-01 a CU-06. |
| 2 | [Feed y publicaciones](ESPECIFICACIONES/FEED.md) (`publicaciones`) | RF-F01–F03 y F05 → FE-01–FE-07: feed general separado del comunitario, creación, detalle, edición y desactivación. | **Parcial:** modelo y API; pantalla Inicio sin carga funcional. | Separar consultas, integrar app/fotos/paginación, autorizar contexto y verificar FE-01 a FE-07. |
| 3 | [Perfiles](ESPECIFICACIONES/PERFILES.md) (`perfiles`) | RF-P01–P03 → PE-01–PE-04: perfil propio y público, búsqueda y edición. | **Parcial:** modelo y pantalla básica; lectura pública incompleta. | Definir campos públicos y baja de cuenta; corregir endpoints y permisos; verificar PE-01 a PE-04. |
| 4 | [Mascotas](ESPECIFICACIONES/MASCOTAS.md) (`mascotas`) | RF-M01–M04 → MA-01–MA-06: fichas, edad desde fecha de nacimiento y propiedad. | **Parcial:** modelo/API, pantalla marcador de posición. | Resolver migración de edad, campos y fotos; corregir DTO/propiedad; integrar móvil y verificar MA-01 a MA-06. |
| 5 | [Interacciones](ESPECIFICACIONES/INTERACCIONES.md) (`interacciones`) | RF-F04 → IN-01–IN-05: comentarios y likes sobre publicaciones visibles. | **Parcial:** comentarios con API incompleta; `PostLike` solo en esquema. | Lectura, likes, permisos, app y verificación IN-01 a IN-05. |
| 6 | [Comunidades](ESPECIFICACIONES/COMUNIDADES.md) (`comunidades`) | RF-C01–C06 → CO-01–CO-06: exploración, membresía, roles y mini-feed. | **En implementación:** API y pantallas iniciales. | Búsqueda, publicación, salida/roles, permisos y pruebas CO-01 a CO-06. |
| 7 | [Chat privado uno a uno](ESPECIFICACIONES/CHAT-PRIVADO.md) (`chat-privado`) | RF-CH01–CH03 → CH-01–CH-05: conversaciones privadas persistentes, bandeja y mensajes. | **Sin código:** no hay modelo, API ni pantalla. | Cerrar inicio, bloqueo y retención; implementar y verificar chat antes de integrar adopción. |
| 8 | [Adopción](ESPECIFICACIONES/ADOPCION.md) (`adopcion`) | RF-AD01–AD04 → AD-01–AD-07: apartado propio, publicación, estado cuando encontró hogar, contacto con autor y sin ventas. | **Sin código:** no hay implementación específica. | Definir moderación, estado y modelo; integrar **después** del chat verificado; probar AD-01 a AD-07. Los gastos veterinarios quedan fuera del MVP. |
| 9 | [Eventos](ESPECIFICACIONES/COMUNIDADES-EVENTOS.md) (`eventos`) | RF-E01–E04 → CE-01–CE-07: eventos de comunidad, mapa y asistencia. | **En implementación:** esquema, API y pantallas iniciales; migración aplicada solo en PostgreSQL local. | Aplicar migración al entorno correcto, cerrar Storage/avisos y probar en dispositivo y con cuentas reales. |

El orden es la secuencia de **cierre de módulos**, no una obligación de descartar código que ya existe. Cada paso usa capacidades anteriores cuando las necesita. Eventos dependen de comunidades y pertenecen a la etapa posterior al MVP; su código inicial puede revisarse sin declararlos terminados. Los chats grupales y la CNN son opcionales, fuera de esta ruta. La posible aportación para gastos veterinarios es una decisión futura separada de adopción.

## Estado documental y evidencia

El estado de la ficha se registra por separado del código integrado en la tabla anterior. Ninguna ficha ha sido aprobada como contrato completo ni tiene evidencia suficiente para declarar la capacidad verificada.

| Paso | Ficha | Plan / tareas | Evidencia de aceptación |
| --- | --- | --- | --- |
| 1–6 | Borrador por módulo | Aún no aprobados para esas capacidades | Pendiente por criterio CU, FE, PE, MA, IN y CO. |
| 7–8 | Borrador por módulo | Aún no creados para chat ni adopción | Pendiente por criterio CH y AD; adopción espera chat verificado. |
| 9 | Borrador; código de eventos en implementación | [Plan](ESPECIFICACIONES/COMUNIDADES-EVENTOS/PLAN.md) y [tareas](ESPECIFICACIONES/COMUNIDADES-EVENTOS/TAREAS.md) previos a la reorganización, por revisar | CE-01–CE-07 sin prueba integral en Supabase y dispositivo. |
| Transversal | [Diseño de la app](ESPECIFICACIONES/DISENO-APP.md) en borrador | Implementación visual aplazada por el usuario | DA-01–DA-06 pendientes de aprobación y revisión. |

Al terminar un criterio, registrar en la ficha o en el plan enlazado **prueba o recorrido, resultado, fecha y entorno**. Después actualizar esta tabla, el inventario de API/datos y la columna «Integrado hoy» si cambió. Un cambio de estado documental requiere la revisión SDD correspondiente; tener código parcial no la reemplaza.

## Diseño transversal

[Diseño de la app](ESPECIFICACIONES/DISENO-APP.md) (`diseno-app`) define navegación, sistema visual, accesibilidad y estados de interfaz compartidos. Su ficha está en **borrador** y hay estilos parciales en código; el usuario aplazó su implementación. Cuando se autorice el rediseño, aplicarlo a las pantallas del módulo que se esté integrando, siguiendo también [async-feedback](../.agents/skills/async-feedback/SKILL.md) para carga, éxito, error y reintento. Esta ruta no autoriza construir pantallas ahora.

## Procedimiento para la siguiente IA o colaborador

1. **Entrada:** leer [AGENTS.md](../AGENTS.md) y las skills que exige para el trabajo. Abrir esta ruta para elegir el primer paso sin verificar; confirmar su dependencia en el [mapa](../MAPA-CAPACIDADES.md). Revisar `git status` antes de editar.
2. **Contexto de producto:** leer [PROYECTO.md](PROYECTO.md) para el problema, actor, RF y RNF del paso; después [DECISIONES.md](DECISIONES.md) para separar acuerdos de preguntas abiertas. Abrir la [ficha enlazada arriba](ESPECIFICACIONES/README.md) y localizar flujos, entradas, validaciones, errores y criterios con ID.
3. **Realidad técnica:** comparar la ficha con código, [API.md](API.md) y [DATOS-Y-PERMISOS.md](DATOS-Y-PERMISOS.md). Anotar qué está presente, qué falla y qué no se verificó. Usar [README.md](../README.md) para comandos y entorno. Actualizar «Integrado hoy» si la evidencia cambió.
4. **Especificación:** aplicar [SDD.md](SDD.md). Revisar con el usuario la ficha y sus preguntas abiertas que afectan el alcance. Una vez aprobado el comportamiento, documentar datos, permisos y navegación necesarios en el plan; no decidir columnas o flujos por inferencia.
5. **Plan y tareas:** crear o revisar `PLAN.md` y después `TAREAS.md` del módulo, con dependencias, archivos, riesgos y una prueba por tarea. Cada puerta SDD se revisa para esa capacidad; los planes/tareas históricos se contrastan con la ficha vigente.
6. **Implementación y validación:** trabajar una tarea aprobada a la vez, verificar permisos y estados de éxito, vacío y error, y reunir evidencia por criterio en API, datos y app cuando corresponda. Actualizar ficha, API, datos, decisiones y esta ruta. Solo marcar «Verificada» después de comprobar todos sus criterios.

**Ejemplo para comenzar:** `AGENTS.md` → esta ruta, paso 1 `cuenta` → [PROYECTO.md, RF-A01–A03 y RNF](PROYECTO.md) → [DECISIONES.md](DECISIONES.md) → [ficha de cuenta, CU-01–CU-06](ESPECIFICACIONES/CUENTA-PERFIL.md) → código en `apps/backend/src/auth` y `apps/mobile/app/(auth)` → [API.md](API.md) y [DATOS-Y-PERMISOS.md](DATOS-Y-PERMISOS.md) → plan → tareas → pruebas y actualización del estado. Después se continúa con el paso 2, `publicaciones`.

**Punto de partida recomendado:** paso 1, cuenta e inicio de sesión. Hay código inicial, pero las decisiones sobre sesión, recuperación y registro parcial siguen abiertas; preparar su revisión antes de planificar cambios dependientes.
