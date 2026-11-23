import { fetch } from 'expo/fetch';
import { photoUploadPart } from '@/lib/photo-upload';
import { versionedPhotoPath } from '@/lib/photo-cache';

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

export type Pet = {
  id: number;
  ownerId: string;
  name: string;
  species: string;
  breed: string;
  birth: { year: number; month: number; day: number | null };
  age: number;
  isAgeApproximate: boolean;
  bio: string | null;
  photoUrl: string | null;
};

export type PetPage = { items: Pet[]; nextCursor: number | null };
export type PetDraft = Pick<Pet, 'name' | 'species' | 'breed' | 'bio' | 'birth'>;
export type PetPhoto = { uri: string; name: string; mimeType: string; size: number };

export class PetApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function request<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  if (!API_URL) throw new PetApiError('Falta configurar la dirección de la API de Petzy.', 0);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { authorization: `Bearer ${token}`, ...init.headers },
    });
    const data: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      const body = data as { message?: string | string[] };
      const message = Array.isArray(body.message) ? body.message.join('. ') : body.message;
      throw new PetApiError(message || 'No se pudo completar la solicitud.', response.status);
    }
    return data as T;
  } catch (error) {
    if (error instanceof PetApiError) throw error;
    if (controller.signal.aborted) throw new PetApiError('La solicitud tardó demasiado. Intenta de nuevo.', 0);
    throw new PetApiError('No pudimos conectar con Petzy. Revisa tu conexión a internet e inténtalo de nuevo.', 0);
  } finally {
    clearTimeout(timeout);
  }
}

export function petPhotoSource(path: string, token: string) {
  return { uri: `${API_URL}${versionedPhotoPath(path)}`, headers: { authorization: `Bearer ${token}` } };
}

export function listPets(token: string, ownerId?: string, cursor?: number) {
  const path = ownerId ? `/users/${encodeURIComponent(ownerId)}/pets` : '/users/me/pets';
  const query = new URLSearchParams({ limit: '20' });
  if (cursor) query.set('cursor', String(cursor));
  return request<PetPage>(`${path}?${query}`, token);
}

export function getPet(token: string, id: number) {
  return request<Pet>(`/pets/${id}`, token);
}

export function createPet(token: string, draft: PetDraft) {
  return request<Pet>('/pets', token, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(draft) });
}

export function updatePet(token: string, id: number, draft: PetDraft) {
  return request<Pet>(`/pets/${id}`, token, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(draft) });
}

export function removePet(token: string, id: number) {
  return request<{ message: string }>(`/pets/${id}`, token, { method: 'DELETE' });
}

export async function uploadPetPhoto(token: string, id: number, photo: PetPhoto) {
  const form = new FormData();
  form.append('photo', await photoUploadPart(photo), photo.name);
  return request<Pet>(`/pets/${id}/photo`, token, { method: 'PUT', body: form });
}

export function removePetPhoto(token: string, id: number) {
  return request<Pet>(`/pets/${id}/photo`, token, { method: 'DELETE' });
}
