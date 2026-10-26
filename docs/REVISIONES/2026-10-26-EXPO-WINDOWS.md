# Arranque de Expo Go en Windows — 26-10-2026

El usuario reportó advertencias de `exports` de React Native y error al resolver `expo-router/build/utils/splash`. Se reprodujo el fallo solicitando al servidor el bundle iOS de desarrollo que figura en su manifiesto: HTTP 500. La exportación de producción previa no acreditaba este recorrido de desarrollo.

## Diagnóstico comprobado

Los cinco archivos señalados existían y se podían leer. Sin embargo, para `InitializeCore.js` y `HMRClient.js`, `fs.readdirSync(..., { withFileTypes: true })` informaba `isSymbolicLink() === true`, mientras `fs.lstatSync` informaba `isFile() === true` e `isSymbolicLink() === false`. Metro los interpretaba como enlaces y los excluía del índice. Su `fileSystem.lookup` devolvía `exists: false`; para `index.js`, clasificado correctamente, devolvía `true`.

El reinicio con `--clear`, la desactivación temporal del filesystem bajo demanda y una ejecución sin watcher no resolvieron el problema. Se retiraron esos ajustes temporales; `app.json` conserva sus opciones originales. No se añadieron configuraciones especiales de Metro ni se ocultaron advertencias.

## Reparación

Se regeneraron únicamente archivos normales de `node_modules` con esa clasificación contradictoria, escribiendo copias nuevas antes de reemplazar sus entradas locales. Se comparó SHA-256 antes/después de cada archivo; no cambiaron bytes. Los junctions y symlinks reales de pnpm se conservaron y no se modificó el contenido del almacén ni de otros proyectos.

Se añadió `packageImportMethod: copy` a `pnpm-workspace.yaml` para que próximas instalaciones mantengan copias independientes en vez de reutilizar enlaces duros del almacén. pnpm 10.33.1 confirma el valor `copy`. [Referencia de pnpm](https://pnpm.io/settings/node-modules#packageimportmethod). La contrapartida es mayor espacio local; no cambia dependencias ni versiones. No se reinstalaron paquetes de nuevo durante esta corrección.

## Verificación

- Metro volvió a devolver `exists: true` para los archivos de React Native antes descartados.
- Servidor normal con `expo start --clear --lan`, watcher y Expo Go activos, en el puerto 8081.
- Bundle del manifiesto con `platform=ios`, `dev=true`, `lazy=true`: **HTTP 200**, 9 092 835 caracteres recibidos.
- Bundle completo con `lazy=false`: **HTTP 200**, 9 092 429 caracteres, **1775 módulos**.
- Los avisos de archivos inexistentes y el error de `./utils/splash` no reaparecieron en esas compilaciones. El aviso de una versión nueva de Expo es informativo; no se actualizaron paquetes para resolverlo.

Se dejó únicamente el servidor normal para que el usuario vuelva a abrir la app. El servidor temporal de diagnóstico de 8082 se detuvo. Falta confirmar la ejecución visual en su iPhone; responder 200 no equivale a haber recorrido las pantallas físicamente.

Para una instalación futura: detener Expo antes de cambiar dependencias, instalar con el lockfile fijado y reiniciar Metro con `--clear`. No editar manualmente código de React Native ni desactivar sus `exports` para ocultar este síntoma.
