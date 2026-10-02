# Tareas — eventos de comunidades

**Estado SDD:** inventario histórico de trabajo realizado y pendiente. Tras aprobar la ficha y revisar el plan, desglosar las tareas pendientes con criterio de aceptación, verificación y archivos previstos; esta tabla no autoriza implementación nueva por sí sola.

| Estado | Tarea y evidencia |
| --- | --- |
| Hecha | Definir `Event`, `EventAttendance`, índices y migración aditiva; `prisma validate` pasa. |
| Hecha | Crear API de comunidades, eventos y asistencia con roles en el servidor; backend compila y pruebas unitarias de permisos/asistencia pasan. |
| Hecha | Crear pantallas de comunidad, tarjetas, formulario, detalle, mapa, indicaciones y respuesta; TypeScript móvil pasa. |
| Hecha | Aplicar migración en PostgreSQL local identificado (`localhost:5435`); `prisma migrate status` confirma esquema al día. |
| Pendiente | Probar consultas reales autenticadas y desplegar la migración en Supabase tras revisar la conexión correcta. |
| Pendiente | Recorrido manual en dispositivo con dos cuentas, mapa y apertura de indicaciones. |
| Pendiente | Implementar carga segura de portada en Supabase Storage y avisos a asistentes cuando cambie o se cancele el evento. |
| Hecha | Cargar páginas adicionales del listado de eventos con `nextCursor` y «Ver más eventos». |
| Pendiente, fuera de `eventos` | Completar administración y salida en `comunidades`, y paginar publicaciones en `publicaciones`; derivar tareas en sus planes propios. |
