import { File } from 'expo-file-system';

function readPhoto(uri: string): File {
  try {
    const file = new File(uri);
    if (!file.exists || file.size <= 0) throw new Error('Photo unavailable');
    return file;
  } catch {
    throw new Error('No se pudo leer la foto seleccionada. Vuelve a elegirla.');
  }
}

export async function photoUploadPart(photo: { uri: string; name: string; mimeType: string }): Promise<Blob> {
  const file = readPhoto(photo.uri);
  if (file.size > 5 * 1024 * 1024) throw new Error('La foto supera 5 MB. Elige otra imagen.');
  // File implementa Blob/bytes(); expo/fetch no admite el antiguo objeto { uri }.
  return file;
}

export async function localPhotoSize(uri: string): Promise<number> {
  return readPhoto(uri).size;
}
