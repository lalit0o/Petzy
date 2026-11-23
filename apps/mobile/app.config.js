// Extiende app.json con valores que no deben quedar escritos en el repositorio.
// GOOGLE_MAPS_API_KEY la lee EAS Build de sus variables de entorno (o del .env local)
// para que el mapa de Android funcione en el APK; Expo Go no la necesita.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    config: {
      ...(config.android?.config ?? {}),
      googleMaps: { apiKey: process.env.GOOGLE_MAPS_API_KEY },
    },
  },
});
