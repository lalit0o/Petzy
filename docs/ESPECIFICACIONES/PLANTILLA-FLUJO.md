# Plantilla breve para flujos de una capacidad

Esta plantilla complementa las seis áreas de la skill [spec-driven-development](../../.agents/skills/spec-driven-development/SKILL.md). Se usa **dentro de la ficha del módulo**, sin crear un archivo por botón. La ficha mantiene objetivo, tecnología, comandos, estructura, estilo, pruebas, límites y criterios de aceptación.

## Flujo: nombre de la acción

- **Actor:** rol o tipo de persona que la realiza.
- **Precondiciones:** sesión, membresía, recurso existente u otra condición comprobable. Si no se ha decidido, escribir «Pendiente».
- **Entradas:** datos que la persona aporta o identificadores del contexto; indicar cuáles son obligatorios, opcionales o pendientes.
- **Pasos y resultado:** desde dónde inicia, qué hace el sistema y qué ve al completarse. Incluir navegación solo si está aprobada.
- **Validaciones y permisos:** reglas confirmadas y lugar donde se comprueban; señalar aparte las que siguen pendientes.
- **Errores y estados:** campo inválido, red/API, sesión vencida, vacío y reintento cuando corresponda. Conservar datos escritos si falla una acción.
- **Trazabilidad:** RF, RNF pertinentes y criterios de aceptación de la ficha.
- **Estado de evidencia:** especificado / planificado / integrado / verificado, fecha, entorno y prueba o recorrido que acredita cada criterio. No llamar «verificado» a un flujo solo por tener código.

Para planificar, comparar cada línea con [API.md](../API.md), [DATOS-Y-PERMISOS.md](../DATOS-Y-PERMISOS.md) y el código. Registrar decisiones nuevas en [DECISIONES.md](../DECISIONES.md) antes de diseñar columnas, permisos o rutas dependientes.

## Revisión antes de pasar al plan

- ¿Otra persona puede explicar quién inicia el flujo, qué necesita y qué resultado observa sin preguntar qué se quiso decir?
- ¿Cada entrada obligatoria y cada validación confirmada tiene una comprobación de aceptación? ¿Los permisos se prueban también en API?
- ¿Se describen al menos el camino correcto, la ausencia de datos, un dato inválido, una falla de API y la recuperación o reintento cuando aplican?
- ¿Los campos, estados, rutas o permisos aún abiertos se señalan como «Pendiente» y están en [DECISIONES.md](../DECISIONES.md) si requieren acuerdo?
- ¿El diseño de datos y navegación se apoyará en esta ficha aprobada, con el estado del código contrastado, antes de crear tareas?

Una respuesta negativa indica que la ficha sigue en borrador para ese alcance. La aprobación humana de la especificación precede al plan, a las tareas y a la implementación.
