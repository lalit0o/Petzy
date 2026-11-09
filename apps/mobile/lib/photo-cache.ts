// Ahora que las fotos se cachean en memoria (`cachePolicy="memory"`), una
// foto recién subida o quitada en esta sesión podría seguir mostrándose
// vieja: la URL del recurso (por ejemplo `/pets/123/photo`) no cambia solo
// porque su contenido cambió. Este mapa en memoria agrega una marca de
// versión a esa URL justo después de subir o quitar una foto propia, para
// forzar una descarga fresca sin perder la caché del resto de las fotos.
const versions = new Map<string, number>();

export function bumpPhotoVersion(path: string) {
  versions.set(path, Date.now());
}

export function versionedPhotoPath(path: string) {
  const version = versions.get(path);
  if (!version) return path;
  return `${path}${path.includes('?') ? '&' : '?'}v=${version}`;
}
