# Relevo de desarrollo de Petzy — 20 de octubre de 2026

Este documento indica el punto exacto del trabajo guardado en Git. La [ruta de desarrollo](00-RUTA-DE-DESARROLLO.md) conserva el orden de módulos y cada archivo `02-TAREAS.md` conserva las tareas y sus criterios. El código puede existir aunque una tarea siga abierta: una tarea solo se cierra cuando se verifican todos sus criterios.

## Estado al dejar esta sesión

| Módulo | Implementado en el repositorio | Pendiente antes de declararlo terminado |
| --- | --- | --- |
| Cuenta | Registro, sesión, perfil inicial, recuperación y pantallas móviles. CU-T01–CU-T05 marcadas. | Recorrido real de correos y enlaces en iPhone; CU-T06–CU-T10 y criterios CU-01–CU-06. El usuario decidió aplazarlo porque aún no tiene Apple Developer ni correo de prueba autorizado. |
| Publicaciones | Migración, cinco categorías, feed general y posts comunitarios con acceso por membresía, una foto privada, mascota opcional, creación, detalle, edición y moderación del post. PU-T01–PU-T09 y PU-T12 marcadas. | Pruebas con sesión real y dispositivo, integración administrativa con Comunidades e integración completa con Interacciones. Ver PU-T10–PU-T11 y PU-T13–PU-T15. |
| Perfiles | API de perfil propio y público, edición, búsqueda, avatar privado, reactivación y pantallas móviles. PE-T01–PE-T06 marcadas. | Recorrido en dispositivo, navegación final y regla del único administrador al desactivar cuenta. Ver PE-T11–PE-T13. |
| Mascotas | Migración que elimina `Pet.age`, fecha de nacimiento exacta o mes/año aproximados, edad calculada al consultar, API con permisos, foto privada, pantallas y enlace desde perfil/publicación. MA-T01–MA-T08 marcadas. | Recorrido completo en iPhone con sesión y fotos; MA-T09–MA-T12 siguen abiertas. |
| Interacciones | La migración `Comment.editedAt` y el inventario IN-T01–IN-T02 están marcados. Hay código para acceso al post, comentarios paginados, creación/edición/retiro, moderación general y comunitaria, restauración, likes y detalle móvil. La prueba HTTP `interactions.e2e-spec.ts` pasó en PostgreSQL local durante el desarrollo. | Revisar uno por uno los criterios de IN-T03–IN-T10 antes de marcarlos; comprobar paginación extensa, concurrencia, cuenta inactiva y roles. IN-T11 tiene UI creada pero requiere recorrido móvil; IN-T12 solo tiene la vista general y depende de la pestaña administrativa de Comunidades; IN-T13 sigue abierto. |

El siguiente trabajo funcional es **Interacciones**, empezando por contrastar IN-T03–IN-T10 con sus criterios y pruebas, luego cerrar la UI y la integración con Comunidades. Después seguir [Comunidades](ESPECIFICACIONES/06-COMUNIDADES/02-TAREAS.md) en el orden aprobado. Chat, Adopción y Eventos tienen especificaciones, planes y tareas aprobados; su código aún no empezó.

## Datos, entorno y verificación

- Las migraciones `20261019180000_add_post_pet_help_moderation`, `20261020122500_pet_birth_fields` y `20261020134500_comment_edited_at` están versionadas. Se aplicaron a la base de desarrollo compartida y a una base PostgreSQL local desechable durante el trabajo. En otro entorno, configurar sus propias variables locales y aplicar migraciones antes de ejecutar la API. No copiar ni publicar archivos `.env`.
- Supabase Auth y Storage requieren configuración propia del entorno. Los buckets privados usados son `post-photos`, `profile-photos` y `pet-photos`. Confirmar sus políticas y probar con sesión real antes de dar los módulos por terminados.
- Las pruebas de backend usan un PostgreSQL aislado para E2E. Algunas pruebas HTTP inyectan identidad de prueba; no sustituyen el recorrido completo con JWT, Supabase y iPhone.
- Verificación de este relevo: `pnpm backend:build` pasó; `pnpm --filter proyecto-backend test -- --runInBand --silent` pasó con 16 suites y 95 pruebas; `pnpm --filter mobile exec tsc --noEmit` y `pnpm --filter mobile lint` pasaron. Lint móvil mostró dos advertencias de imports sin usar en `comunidades.tsx`. Registrar resultados nuevos si el entorno difiere.
- No se incluye el contenido generado de `.local-export-ios/`, `.local-tmp/` ni respaldos `.local-backups/`; son artefactos locales y no son fuente del proyecto.

## Regla para continuar

Leer primero la [ruta de desarrollo](00-RUTA-DE-DESARROLLO.md), este relevo y las [tareas de Interacciones](ESPECIFICACIONES/05-INTERACCIONES/02-TAREAS.md). No marcar como terminada una tarea solo por existir código. Dejar constancia de pruebas y limitaciones reales, especialmente las que requieren dispositivo o módulos todavía no implementados.
