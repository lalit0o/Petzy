# Cómo usamos SDD en Petzy

**SDD (Spec-Driven Development)** significa definir y revisar el comportamiento esperado antes de convertirlo en plan técnico, tareas y código. Petzy adopta la skill `spec-driven-development` con puertas de revisión humana. Conserva sus fichas en `docs/ESPECIFICACIONES/` en vez de crear un `SPEC.md` paralelo.

**Para leerlo sin conocer el proceso:** primero se acuerda qué debe pasar en la app (**ficha**); luego el equipo explica cómo lo construirá (**plan**); después divide ese trabajo en pasos comprobables (**tareas**); al final lo construye y prueba (**implementación**). La revisión del usuario trata del comportamiento y de cualquier decisión que afecte al producto. Los nombres de rutas, tablas o herramientas deben explicarse por su efecto antes de pedir una decisión. Los términos frecuentes se explican en [01-PROYECTO.md](01-PROYECTO.md#cómo-leer-los-requisitos).

Para elegir el siguiente módulo, consultar primero la [ruta secuencial de desarrollo](00-RUTA-DE-DESARROLLO.md): indica lo ya integrado, lo pendiente y enlaza la ficha de cada capacidad. Este proceso regula cómo avanzar dentro de cada paso de esa ruta.

## Fase 0: mapa de capacidades

Cuando una solicitud reúne capacidades comprobables por separado, proponer primero un mapa breve con ID estable, responsabilidad, dependencias sin ciclos y orden de construcción. El usuario revisa ese mapa **antes de escribir fichas**. El mapa aprobado para esta reescritura está en [MAPA-CAPACIDADES.md](../MAPA-CAPACIDADES.md). Para una sola capacidad, pasar directamente a Especificar. El contrato entre módulos pertenece a la ficha del proveedor del dato u operación.

## Qué documento responde cada pregunta

| Documento | Pregunta que responde | Estado |
| --- | --- | --- |
| [01-PROYECTO.md](01-PROYECTO.md) | ¿Qué producto queremos y en qué orden? | Visión y requisitos generales. |
| [00-RUTA-DE-DESARROLLO.md](00-RUTA-DE-DESARROLLO.md) | ¿Qué paso sigue y qué está integrado de verdad? | Secuencia y estado por módulo; enlaza las fichas y los RF/RNF. |
| [03-DECISIONES.md](03-DECISIONES.md) | ¿Qué decisiones ya tomó el usuario y cuáles faltan? | Registro de acuerdos; no demuestra implementación. |
| [ESPECIFICACIONES/00-INDICE.md](ESPECIFICACIONES/00-INDICE.md) y cada ficha | ¿Qué debe hacer el módulo y cómo se acepta? | Cuenta, Publicaciones, Perfiles, Mascotas, Interacciones, Comunidades, Chat y Adopción tienen ficha, plan y tareas revisados. La ficha y el plan de Eventos están aprobados; D-115–D-116 aprueban sus datos y las tareas EV-T01–EV-T20 también están aprobadas, sin ejecutar. D-87–D-88 aclaran almacenamiento y conservación de reportes de Chat en el MVP. El acceso del equipo, revisión y suspensiones quedan para una [etapa web futura](FUTURO/DASHBOARD-WEB-PETZY.md). El desarrollo ya fue autorizado; Cuenta tiene código y pruebas locales, con verificación externa aplazada. |
| [ESPECIFICACIONES/90-DISENO-APP.md](ESPECIFICACIONES/90-DISENO-APP.md) | ¿Cómo se revisará el diseño transversal de la app? | Ficha, [plan](ESPECIFICACIONES/90-DISENO-APP/01-PLAN.md) y [tareas](ESPECIFICACIONES/90-DISENO-APP/02-TAREAS.md) aprobados; ninguna tarea ejecutada; implementación visual aplazada. |
| `01-PLAN.md` de una función | ¿Cómo se implementará en datos, API, móvil, seguridad y migración? | Se crea después de cerrar las decisiones funcionales. |
| `02-TAREAS.md` de una función | ¿Qué pasos pequeños y verificables se ejecutarán? | Se crea a partir del plan revisado. |
| [05-API.md](05-API.md) | ¿Qué rutas existen y qué contrato se propone? | Inventario de integración; distinguir actual/propuesto. |
| [04-DATOS-Y-PERMISOS.md](04-DATOS-Y-PERMISOS.md) | ¿Qué datos y controles existen o se necesitan? | Diseño transversal; distinguir actual/propuesto. |
| [README.md](../README.md) y [AGENTS.md](../AGENTS.md) | ¿Cómo se arranca el proyecto y qué contexto necesita un agente? | Guías de trabajo, no especificaciones funcionales. |

## Ciclo por función

1. **Especificar:** comenzar por el problema, actor y resultado deseado. Declarar supuestos antes de redactar y describir por flujo precondiciones, entradas, validaciones, resultado, errores y estados de pantalla; vincular RF, RNF y criterios de aceptación. También incluir tecnología, comandos ejecutables, estructura, ejemplo de estilo, estrategia de pruebas, límites **Siempre/Consultar antes/Nunca** y preguntas abiertas. Registrar decisiones como **confirmadas**, **propuestas** o **pendientes**. El usuario revisa y aprueba la ficha antes del plan.
2. **Planificar:** desde la ficha aprobada, comparar con código actual y diseñar los datos, permisos, navegación y respuesta visual necesarios para cumplir cada flujo. Ordenar componentes y dependencias, riesgos, migraciones, seguridad, compatibilidad y puntos de verificación. El diseño aquí es **documental**; construir o rediseñar pantallas sigue la autorización y puertas de revisión aplicables. Revisar el plan con el usuario antes de desglosar tareas. Para una función, guardarlo junto a la ficha en `docs/ESPECIFICACIONES/<NUMERO>-<FUNCION>/01-PLAN.md`.
3. **Desglosar:** derivar tareas pequeñas en `02-TAREAS.md`, ordenadas por dependencia. Cada una indica criterio de aceptación, verificación y archivos previstos; procurar que quepa en una sesión y unos cinco archivos. Revisar la lista con el usuario antes de implementar.
4. **Implementar y verificar:** ejecutar tareas aprobadas de forma incremental, probar criterios y actualizar inventarios de API/datos y estado de la ficha. El usuario revisa el resultado. Una pantalla o tabla aislada no completa una función.

Cada puerta se revisa por capacidad. Se puede analizar o documentar trabajo independiente mientras otra capacidad espera una decisión; no se implementa la parte dependiente por inferencia.

El usuario pidió terminar la documentación antes de comenzar código y autorizó iniciar el desarrollo el 19 de octubre de 2026. Cuenta está en implementación; el avance de cada tarea se registra en su lista aprobada. El usuario pospuso sus pruebas de correo real y build instalado en iPhone para que la implementación de Publicaciones y módulos posteriores continúe. La capacidad no se marca «Verificada» hasta completar esas pruebas. Si una decisión posterior cambia una ficha ya revisada, actualizarla y ajustar su plan y tareas antes de programar ese cambio.

El flujo coincide en lo esencial con [Spec Kit de GitHub](https://github.github.com/spec-kit/): especificar, planificar, derivar tareas, implementar y comprobar convergencia. Su CLI es opcional para Petzy; no se necesita instalarla para seguir este proceso.

## Estados y regla de avance

- **Borrador:** la función está descrita, pero tiene decisiones pendientes o no se ha revisado como contrato de implementación.
- **Lista para plan:** el usuario aprobó la ficha y confirmó las decisiones necesarias para ese alcance; criterios comprobables.
- **Planificada:** el usuario revisó el `01-PLAN.md`; `02-TAREAS.md` se deriva después y se aprueba aparte.
- **En implementación:** hay trabajo de código en curso; no significa que la función ya exista de punta a punta.
- **Verificada:** criterios de aceptación comprobados, documentación de API/datos actualizada y límites conocidos anotados.

No pasar una función de borrador a implementación si necesita una decisión no tomada. Sí se puede avanzar con análisis y tareas independientes. Antes de una nueva columna, documentar nombre, tipo, nulabilidad, valor para datos previos, relaciones, motivo y módulos afectados, y consultar al usuario según [AGENTS.md](../AGENTS.md).

## Estructura recomendada de cada función

Mantener un archivo de especificación por ID estable, indexado en el [mapa](../MAPA-CAPACIDADES.md). El prefijo numérico del archivo indica el orden de cierre, pero el ID de capacidad no cambia al ajustar prioridades. Cuando se vaya a implementar un alcance aprobado, crear una carpeta de función con `01-PLAN.md` y `02-TAREAS.md`, enlazados desde la ficha y el [índice](ESPECIFICACIONES/00-INDICE.md). No generar planes y tareas detallados para funciones lejanas cuando aún hay decisiones abiertas: caducan antes de usarse.

La ficha contiene las seis áreas de la skill, además de alcance/no alcance, actores, permisos, flujos, estados de interfaz, criterios con ID y decisiones confirmadas o pendientes. El plan contiene estado del código, diseño por capa, migración y reversibilidad, seguridad, compatibilidad y pruebas. Cada tarea indica aceptación, verificación y archivos previstos.

Para cada flujo de la ficha responder explícitamente: **quién actúa, qué debe existir antes, qué datos proporciona o recibe, qué se valida, qué ocurre al completar y qué ocurre si falla**. Enlazar los criterios con los RF de [01-PROYECTO.md](01-PROYECTO.md) y aplicar los RNF pertinentes. Si falta una respuesta, marcarla «Pendiente» en vez de inventarla. La [plantilla de flujo](ESPECIFICACIONES/99-PLANTILLA-FLUJO.md) sirve para mantener esa estructura sin duplicar una spec por cada botón.

`diseno-app` usa el mismo ciclo SDD: primero se revisan sus fundamentos y criterios, después su plan y tareas, y solo más adelante se implementan pantallas. Las fichas funcionales siguen siendo la fuente de comportamiento y permisos de cada flujo.

## Reglas para mantener los documentos coherentes

- La especificación es la fuente del **comportamiento deseado**; el código y [05-API.md](05-API.md) son la evidencia del **comportamiento actual**. Nunca presentar lo deseado como implementado.
- [00-RUTA-DE-DESARROLLO.md](00-RUTA-DE-DESARROLLO.md) es el inventario principal del estado integrado por capacidad. `README.md`, `AGENTS.md` y `01-PROYECTO.md` enlazan a esa ruta en vez de mantener tablas paralelas. Las fichas, API y datos conservan el detalle técnico que les corresponde e indican cuándo se comprobó.
- Si cambia una decisión funcional, actualizar primero su ficha y [03-DECISIONES.md](03-DECISIONES.md), luego el plan y las tareas afectados.
- Si cambia el código, actualizar el contrato de API, el diseño de datos/permisos y el estado de la ficha en la misma entrega.
- Mantener las fichas pequeñas y enlazadas; no duplicar largos contratos en varios archivos. El índice muestra qué existe y qué falta.
- Redactar primero el comportamiento en lenguaje claro y con un ejemplo cuando haga falta; después añadir nombres de campos, rutas y pruebas. Un criterio de aceptación debe decir qué acción se realiza y qué resultado se observa. Explicar el efecto de una propuesta técnica antes de pedir al usuario su revisión.
- Antes de marcar una capacidad «Verificada», enlazar evidencia por criterio: prueba de API/permisos, datos y migración cuando aplique, recorrido móvil de éxito y fallas, entorno donde se comprobó y fecha. Un comando exitoso por sí solo no acredita todo el flujo.
