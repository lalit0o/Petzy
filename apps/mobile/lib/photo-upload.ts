type UploadPhoto = { uri: string; name: string; mimeType: string };

async function readPhoto(uri: string): Promise<Blob> {
  try {
    const response = await fetch(uri);
    if (!response.ok) throw new Error('Photo unavailable');
    const blob = await response.blob();
    if (blob.size === 0) throw new Error('Empty photo');
    return blob;
  } catch {
    throw new Error('No se pudo leer la foto seleccionada. Vuelve a elegirla.');
  }
}

// En web el selector entrega una URL de Blob; Metro usa .native.ts en el móvil.
export async function photoUploadPart(photo: UploadPhoto): Promise<Blob> {
  const blob = await readPhoto(photo.uri);
  if (blob.size > 5 * 1024 * 1024) throw new Error('La foto supera 5 MB. Elige otra imagen.');
  return blob.type === photo.mimeType ? blob : new Blob([blob], { type: photo.mimeType });
}

export async function localPhotoSize(uri: string): Promise<number> {
  return (await readPhoto(uri)).size;
}
