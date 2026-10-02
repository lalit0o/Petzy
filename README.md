# Petzy

Aplicación móvil para personas con mascotas y para quienes las aman aunque no tengan una propia. Incluye publicaciones, comunidades y eventos con mapa; las fichas de mascota son opcionales para participar. El MVP también contempla chat privado uno a uno y, después de integrarlo, adopción. La [ruta de desarrollo](docs/RUTA-DE-DESARROLLO.md) muestra el orden y el estado de cada módulo; [PROYECTO.md](docs/PROYECTO.md) reúne los requisitos.

## Estado del proyecto

Es un proyecto en desarrollo. El registro e inicio de sesión tienen implementación inicial. Comunidades y eventos ya tienen API y pantallas iniciales; la migración de eventos se aplicó a PostgreSQL local el 29-09-2026, pero el flujo aún no se probó en dispositivo ni en Supabase. Mascotas sigue como marcador de posición y el feed móvil aún no presenta publicaciones. Consulte [docs/API.md](docs/API.md) antes de integrar una pantalla: allí se distingue entre rutas presentes en código, verificadas y propuestas.

## Estructura

```text
apps/
  backend/    API NestJS, Prisma y migraciones
  mobile/     App Expo/React Native
docs/         Alcance, contrato de API y diseño de datos/permisos
```

El repositorio es un workspace de `pnpm`. **Supabase es la plataforma de datos elegida:** Supabase Postgres será el destino de la base de datos del proyecto y Supabase Auth gestiona identidades. Hoy NestJS accede a PostgreSQL mediante Prisma; `DATABASE_URL` determina a qué instancia se conecta. En el entorno local revisado el 29-09-2026 apuntaba a `localhost`, por lo que todavía falta conectar y verificar Supabase Postgres allí. La app usa Expo Router y guarda el token local con Expo SecureStore. Docker Compose ofrece una base PostgreSQL local para desarrollo aislado.

## Requisitos para desarrollo

- Node.js y `pnpm` compatibles con las dependencias del repositorio.
- Un proyecto Supabase con Postgres y Auth configurados. Para desarrollo aislado se puede usar Docker con Compose como base PostgreSQL local.
- Docker con Compose solo si se elige la base local. Esa base **no sustituye** Supabase Auth.
- Expo Go, simulador o dispositivo para abrir la app. El dispositivo y la API deben poder comunicarse por red.

## Configuración inicial

Ejecute los comandos desde la raíz, salvo donde se indique otra ubicación.

1. Instale las dependencias:

   ```powershell
   pnpm install
   ```

2. Cree `apps/backend/.env` a partir de `apps/backend/.env.example` y sustituya los valores de ejemplo. El archivo `.env` está ignorado por Git:

   ```dotenv
   DATABASE_URL="CADENA_POSTGRES_DE_SUPABASE_O_BASE_LOCAL"
   SUPABASE_URL="https://TU_PROYECTO.supabase.co"
   SUPABASE_SECRET_KEY="TU_CLAVE_DE_SERVIDOR"
   SUPABASE_JWKS_URL="https://TU_PROYECTO.supabase.co/auth/v1/.well-known/jwks.json"
   PORT=3000
   ```

   `DATABASE_URL` debe contener la cadena de conexión PostgreSQL de **Supabase** para el entorno compartido o desplegado. Para desarrollo local con el Compose incluido use `postgresql://postgres:postgres@localhost:5435/nest_test_db?schema=public`. Nunca apunte una migración de desarrollo a una base compartida sin revisar el proceso de despliegue. `SUPABASE_URL` y `SUPABASE_SECRET_KEY` los consume el servicio de autenticación del backend; `SUPABASE_JWKS_URL` se usa para verificar tokens. La clave de servidor jamás va en `EXPO_PUBLIC_*` ni en el cliente móvil.

3. Si eligió la base local, arranque PostgreSQL:

   ```powershell
   docker compose -f apps/backend/docker-compose.yml up -d
   ```

   El contenedor expone PostgreSQL en el puerto local `5435`.

4. En una base de desarrollo, aplique las migraciones existentes y genere Prisma Client:

   ```powershell
   pnpm --filter proyecto-backend exec prisma migrate dev
   pnpm --filter proyecto-backend exec prisma generate
   ```

   `migrate dev` puede pedir resolver diferencias o reiniciar una base que ya tenga datos. Lea cualquier aviso antes de aceptarlo. Para la base compartida de Supabase o producción, use un proceso de despliegue de migraciones revisadas; no ejecute estos comandos de desarrollo directamente allí.

5. Cree `apps/mobile/.env` a partir de `apps/mobile/.env.example` y ajuste la URL:

   ```dotenv
   EXPO_PUBLIC_API_URL=http://IP_ALCANZABLE_DESDE_EL_DISPOSITIVO:3000
   ```

   El ejemplo versionado usa `localhost` como referencia inicial. En un teléfono físico, `localhost` apunta al propio teléfono; sustituya ese valor por la IP Wi-Fi actual del equipo que ejecuta la API y confirme que ambos dispositivos puedan comunicarse. Esa IP puede cambiar al cambiar de red. Reinicie Expo después de cambiar variables de entorno: tener internet no garantiza acceso a una API local.

   Los eventos usan `react-native-maps` para mostrar un marcador y abren Apple Maps o Google Maps para indicaciones. Funciona en Expo Go sin configuración adicional de mapas; para publicar un binario Android se debe configurar `GOOGLE_MAPS_API_KEY` en el entorno de compilación, restringida por paquete y SHA-1, según la [guía de Expo 57](https://docs.expo.dev/versions/v57.0.0/sdk/map-view/). La migración de eventos `20260929120000_add_community_events` debe aplicarse a la base correcta antes de usar estas pantallas.

## Ejecutar

En terminales separadas:

```powershell
pnpm backend
pnpm mobile
```

También existe `pnpm dev` para iniciar ambos procesos a la vez. La API escucha en `PORT` (por defecto `3000`). Expo muestra las opciones para abrir Android, iOS o web; el soporte de web y los permisos de red de la API aún deben comprobarse como flujo completo.

## Comandos disponibles

| Comando desde la raíz | Propósito |
| --- | --- |
| `pnpm backend` | Inicia NestJS en modo desarrollo. |
| `pnpm mobile` | Inicia Expo. |
| `pnpm dev` | Inicia backend y móvil juntos. |
| `pnpm backend:build` | Compila el backend. |
| `pnpm --filter proyecto-backend test` | Ejecuta pruebas unitarias del backend. |
| `pnpm --filter proyecto-backend test:e2e` | Ejecuta pruebas E2E del backend; necesitan su entorno preparado. |
| `pnpm --filter mobile lint` | Revisa el código móvil con ESLint. |

Tras modificar `apps/backend/prisma/schema.prisma`, cree/revise la migración correspondiente en desarrollo y vuelva a ejecutar `prisma generate`. No edite migraciones aplicadas en otros entornos.

## Problemas conocidos de integración

- El feed móvil todavía no llama a su función de carga y forma el encabezado `Bearer` sin espacio. Su pantalla «No hay publicaciones» no confirma que la API haya devuelto una lista vacía.
- El DTO de mascotas valida `ownerId` como entero aunque el modelo usa cadena; además, la creación todavía acepta el dueño enviado por el cliente.
- Algunos endpoints de usuario devuelven texto de ejemplo o necesitan restringir los datos expuestos y comprobar propiedad.
- El botón de recuperación de contraseña de la pantalla de acceso todavía no tiene flujo asociado.

Estos puntos están documentados como trabajo pendiente; la guía no implica que los flujos completos funcionen hoy.

## Documentación

- [Contexto para agentes de IA](AGENTS.md)
- [Proceso SDD y estado de especificaciones](docs/SDD.md)
- [Mapa de capacidades y dependencias](MAPA-CAPACIDADES.md)
- [Decisiones confirmadas y pendientes](docs/DECISIONES.md)
- [Índice de especificaciones por función](docs/ESPECIFICACIONES/README.md)
- [Especificación del diseño de la app](docs/ESPECIFICACIONES/DISENO-APP.md)
- [Alcance y plan por módulos](docs/PROYECTO.md)
- [Rutas presentes en código y contrato propuesto](docs/API.md)
- [Modelo de datos y permisos](docs/DATOS-Y-PERMISOS.md)
- [Especificación de eventos en comunidades](docs/ESPECIFICACIONES/COMUNIDADES-EVENTOS.md)
