# Petzy

Aplicación móvil para personas con mascotas y para quienes las aman aunque no tengan una propia. Incluye publicaciones, comunidades y eventos con mapa; las fichas de mascota son opcionales para participar. El MVP también contempla chat privado uno a uno y, después de integrarlo, adopción. La [ruta de desarrollo](docs/00-RUTA-DE-DESARROLLO.md) muestra el orden y el estado de cada módulo; [01-PROYECTO.md](docs/01-PROYECTO.md) reúne los requisitos.

## Estado del proyecto

Es un proyecto en desarrollo. El estado integrado de cada capacidad, con fecha de revisión, se mantiene en [docs/00-RUTA-DE-DESARROLLO.md](docs/00-RUTA-DE-DESARROLLO.md). Antes de integrar una pantalla, consulte también [docs/05-API.md](docs/05-API.md), que distingue rutas presentes en código de contratos propuestos, y compruebe ambos documentos contra su checkout.

Para entender qué hará cada función antes de leer rutas o tablas, comienza por [Cómo leer los requisitos](docs/01-PROYECTO.md#cómo-leer-los-requisitos) y el [índice de funciones](docs/ESPECIFICACIONES/00-INDICE.md).

## Estructura

```text
apps/
  backend/    API NestJS, Prisma y migraciones
  mobile/     App Expo/React Native
docs/         Alcance, contrato de API y diseño de datos/permisos
```

El repositorio es un workspace de `pnpm`. **Supabase es la plataforma de datos elegida:** la base compartida de desarrollo ya usa Supabase Postgres, y Supabase Auth gestiona identidades. NestJS accede a PostgreSQL mediante Prisma; `DATABASE_URL` determina a qué instancia se conecta. La app usa Expo Router y guarda el token local con Expo SecureStore. Docker Compose ofrece una base PostgreSQL local para desarrollo aislado.

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
   PETZY_AUTH_REDIRECT_URL="mobile://auth/callback"
   PORT=3000
   ```

   `DATABASE_URL` debe contener la cadena de conexión PostgreSQL de **Supabase** para el entorno compartido o desplegado. Para desarrollo local con el Compose incluido use `postgresql://postgres:postgres@localhost:5435/nest_test_db?schema=public`. Nunca apunte una migración de desarrollo a una base compartida sin revisar el proceso de despliegue. `SUPABASE_URL` y `SUPABASE_SECRET_KEY` los consume el servicio de autenticación del backend; `SUPABASE_JWKS_URL` se usa para verificar tokens. La clave de servidor jamás va en `EXPO_PUBLIC_*` ni en el cliente móvil.

   Para comprobar confirmación de correo y recuperación de contraseña, permita `mobile://auth/callback` en **Supabase Auth → URL Configuration → Redirect URLs** y use ese mismo valor en `PETZY_AUTH_REDIRECT_URL`. El esquema `mobile` está en `apps/mobile/app.json`; después de instalar un build de desarrollo en el teléfono, pruebe un enlace real de cada tipo. En iPhone físico desde Windows, el build de desarrollo mediante EAS requiere una cuenta de Apple Developer. El SMTP predeterminado de Supabase solo envía correos a miembros autorizados del proyecto; para otros destinatarios se necesita configurar SMTP propio. El código local y las pruebas simuladas no confirman que Supabase envíe los correos ni que iOS abra la app. No pegue enlaces recibidos por correo en incidencias: contienen datos de sesión.

   **Probar los enlaces con Expo Go (sin build ni cuenta de Apple):** Expo Go no reconoce el esquema `mobile://`; abre direcciones `exp://`. Para desarrollo, ponga en `apps/backend/.env` la dirección de Expo Go con la IP de su computadora en la red local (la misma de `EXPO_PUBLIC_API_URL`) y el puerto de Metro: `PETZY_AUTH_REDIRECT_URL="exp://192.168.1.192:8081/--/auth/callback"`. El tramo `--/auth/callback` es como Expo Go entrega la ruta `/auth/callback` de la app. Agregue `exp://**` en **Supabase Auth → URL Configuration → Redirect URLs** y reinicie el backend para que lea el valor. Si cambia la IP de la computadora o el puerto de Metro, actualice la variable; un correo enviado antes del cambio apuntará a la dirección vieja. Para un build instalado vuelva a `mobile://auth/callback`.

3. Si eligió la base local, arranque PostgreSQL:

   ```powershell
   docker compose -f apps/backend/docker-compose.yml up -d
   ```

   El contenedor expone PostgreSQL en el puerto local `5435`.

4. En una base de desarrollo nueva, aplique las migraciones existentes y genere Prisma Client:

   ```powershell
   pnpm --filter proyecto-backend exec prisma migrate dev
   pnpm --filter proyecto-backend exec prisma generate
   ```

   `migrate dev` puede pedir resolver diferencias o reiniciar una base que ya tenga datos. Lea cualquier aviso antes de aceptarlo. La base compartida de Supabase tenía tablas y perfiles de prueba sin historial de Prisma el 19-10-2026; el 20-10-2026 se respaldó, ensayó la restauración, concilió el historial y aplicó las migraciones pendientes de Comentarios y Publicaciones. `prisma migrate status` mostró seis migraciones al día. El esquema Prisma aún menciona `PostView`, que carece de migración y no existe en esa base; esta diferencia anterior no forma parte de Publicaciones. Para otro entorno, revise primero su esquema e historial y use un proceso de despliegue de migraciones; no repita ciegamente la conciliación ni ejecute estos comandos de desarrollo directamente en una base compartida o de producción.

   Para las fotos de Publicaciones, configure en Supabase Storage un bucket **privado** llamado `post-photos`: límite de 5 MB por archivo y tipos `image/jpeg`, `image/png` e `image/webp`. El backend guarda una ruta interna y entrega la foto mediante `GET /posts/:id/photo` después de comprobar el acceso; no convierta el bucket en público. El bucket ya está creado en el proyecto compartido de desarrollo, pero cada proyecto Supabase nuevo necesita esa configuración.

   De la misma forma, cree buckets **privados** `pet-photos` (fotos de mascotas), `profile-photos` (fotos de perfil) y `community-photos` (fotos de comunidad), cada uno con límite de 5 MB y los mismos tres tipos de imagen. Sin el bucket correspondiente, subir una foto falla con «Bucket not found» aunque el resto de la API funcione; esto no indica un error de código. `community-photos` se creó en el proyecto compartido de desarrollo el 4-11-2026.

5. Cree `apps/mobile/.env` a partir de `apps/mobile/.env.example` y ajuste la URL:

   ```dotenv
   EXPO_PUBLIC_API_URL=http://IP_ALCANZABLE_DESDE_EL_DISPOSITIVO:3000
   ```

   El ejemplo versionado usa `localhost` como referencia inicial. En un teléfono físico, `localhost` apunta al propio teléfono; sustituya ese valor por la IP Wi-Fi actual del equipo que ejecuta la API y confirme que ambos dispositivos puedan comunicarse. Esa IP puede cambiar al cambiar de red. Reinicie Expo después de cambiar variables de entorno: tener internet no garantiza acceso a una API local.

   La ficha de eventos prevé usar `react-native-maps` para mostrar un marcador y abrir la app de mapas del dispositivo para indicaciones. Esa dependencia y las pantallas de eventos no están en este checkout. La migración de eventos `20260929120000_add_community_events` tampoco aparece entre los archivos del repositorio; antes de implementarla o desplegarla, revisar la ficha, el plan y la base de destino. Para un binario Android que use mapas, consultar la [guía de Expo 57](https://docs.expo.dev/versions/v57.0.0/sdk/map-view/) y definir la configuración necesaria.

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
| `cd apps/backend && node scripts/chat-probe.mjs` | Solo desarrollo: usa una segunda cuenta desde la computadora para probar Chat con un solo teléfono («En línea», mensajes en vivo, aviso de mensaje nuevo, «Leído», bloqueo y varias páginas). Pide correo y contraseña en la terminal y no los guarda. Correrlo en una terminal propia con el backend encendido. |

Tras modificar `apps/backend/prisma/schema.prisma`, cree/revise la migración correspondiente en desarrollo y vuelva a ejecutar `prisma generate`. No edite migraciones aplicadas en otros entornos.

## Problemas conocidos de integración

**Expo/Metro en Windows, corregido el 26-10-2026:** si informa que no existen `InitializeCore.js`, `HMRClient.js` o `expo-router/build/utils/splash.js` aunque sí están instalados, revisar la clasificación de archivos de `node_modules`. Se reprodujo que Windows los listaba como enlaces y `lstat` los reconocía como archivos normales; Metro los descartaba. Se regeneraron las copias afectadas sin cambiar su contenido y el bundle iOS de desarrollo completo volvió a responder 200 (1775 módulos). `pnpm-workspace.yaml` usa `packageImportMethod: copy` para mantener copias independientes del almacén en futuras instalaciones; ocupa más espacio que los enlaces duros. No cambia versiones, permisos de la app ni el lockfile. Si se reinstalan dependencias, detener primero Expo, usar `pnpm install --frozen-lockfile --force` y arrancar con `pnpm --filter mobile exec expo start --clear`. [Diagnóstico y evidencia](docs/REVISIONES/2026-10-26-EXPO-WINDOWS.md).

El estado funcional actual de los módulos está en [la ruta de desarrollo](docs/00-RUTA-DE-DESARROLLO.md); los problemas iniciales que siguen son antecedentes del repositorio.

- El feed móvil todavía no llama a su función de carga y forma el encabezado `Bearer` sin espacio. Su pantalla «No hay publicaciones» no confirma que la API haya devuelto una lista vacía.
- El DTO de mascotas valida `ownerId` como entero aunque el modelo usa cadena; además, la creación todavía acepta el dueño enviado por el cliente.
- Algunos endpoints de usuario devuelven texto de ejemplo o necesitan restringir los datos expuestos y comprobar propiedad.
- Recuperación de contraseña y confirmación de correo ya tienen pantallas y API, pero sus enlaces no se han comprobado con un correo real y un build instalado en iPhone.

Estos puntos están documentados como trabajo pendiente; la guía no implica que los flujos completos funcionen hoy.

## Documentación

- [Contexto para agentes de IA](AGENTS.md)
- [Proceso SDD y estado de especificaciones](docs/02-SDD.md)
- [Mapa de capacidades y dependencias](MAPA-CAPACIDADES.md)
- [Decisiones confirmadas y pendientes](docs/03-DECISIONES.md)
- [Bitácora de IA](BITACORA-IA.md): qué se le pidió a la IA, qué entregó y qué se corrigió, por fecha
- [Índice de especificaciones por función](docs/ESPECIFICACIONES/00-INDICE.md)
- [Especificación del diseño de la app](docs/ESPECIFICACIONES/90-DISENO-APP.md)
- [Alcance y plan por módulos](docs/01-PROYECTO.md)
- [Rutas presentes en código y contrato propuesto](docs/05-API.md)
- [Modelo de datos y permisos](docs/04-DATOS-Y-PERMISOS.md)
- [Propuesta futura: sistema web del equipo para revisar reportes](docs/FUTURO/DASHBOARD-WEB-PETZY.md)
- [Especificación de eventos en comunidades](docs/ESPECIFICACIONES/09-EVENTOS.md)
