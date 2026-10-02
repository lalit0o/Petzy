# Plan técnico — eventos de comunidades

**Estado:** registro técnico previo a la reorganización SDD; implementado parcialmente, con migración aplicada a PostgreSQL local y verificación autenticada y en dispositivo pendiente. Requiere revisión y ampliación después de aprobar la [ficha de eventos](../COMUNIDADES-EVENTOS.md); no constituye aún un plan validado bajo la skill.

## Datos y migración

`Event` se relaciona con `Community` y `User`; `EventAttendance` usa clave `(eventId, userId)`. Horarios se guardan en UTC como `timestamptz` y `timeZone` conserva la zona del organizador. La migración aditiva está en `apps/backend/prisma/migrations/20260929120000_add_community_events/migration.sql` y se aplicó solo a `localhost:5435`. Antes de desplegarla en otra base, comprobar `DATABASE_URL` y el estado de las migraciones; no usar `migrate reset` ni `db push` sobre datos existentes.

## API y permisos

NestJS y Prisma son la ruta única de escritura. El guard global valida el token de Supabase Auth. `creatorId` se obtiene del token. `ADMIN`/`MODERATOR` crean; creador/`ADMIN` editan y cancelan; miembros responden asistencia mediante `upsert`; cualquier usuario registrado lee comunidad y evento. La API cuenta solo `GOING` y no expone la lista nominal.

## Móvil y mapas

Comunidades muestra exploración, creación, detalle con pestañas y tarjeta de evento. El detalle usa `react-native-maps` para un marcador y `Linking.openURL` para abrir indicaciones. En Expo Go no requiere configuración extra; un binario Android publicado necesita Google Maps SDK y clave restringida, según la [guía de Expo 57](https://docs.expo.dev/versions/v57.0.0/sdk/map-view/). Las portadas URL son temporales hasta definir carga a Supabase Storage.

## Riesgos y comprobación

- La migración local se aplicó después de iniciar PostgreSQL. Supabase y el recorrido autenticado en dispositivo siguen pendientes.
- Verificar en dos cuentas reales los roles `ADMIN`, `MODERATOR`, `MEMBER` y usuario no miembro.
- Verificar marcador e indicaciones en Android/iOS, hora en zona distinta y estados sin conexión.
- El listado de eventos carga páginas adicionales mediante `nextCursor`; comprobar orden estable y ausencia de duplicados con datos reales.
