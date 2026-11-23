import { fetch } from 'expo/fetch';
import { photoUploadPart } from '@/lib/photo-upload';
import type { User } from '@/types/apiResponse';
import type { MexicoState } from '@/types/mexicoState';

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

export class ProfileApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string, readonly communities: { id: number; name: string }[] = []) { super(message); }
}

async function request<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  if (!API_URL) throw new ProfileApiError('Falta configurar la dirección de la API de Petzy.', 0);
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
      const body = data as { message?: string | string[]; code?: string; communities?: { id: number; name: string }[] };
      const message = Array.isArray(body.message) ? body.message.join('. ') : body.message;
      throw new ProfileApiError(message || 'No se pudo completar la solicitud.', response.status, body.code, Array.isArray(body.communities) ? body.communities : []);
    }
    return data as T;
  } catch (error) {
    if (error instanceof ProfileApiError) throw error;
    if (controller.signal.aborted) throw new ProfileApiError('La solicitud tardó demasiado. Intenta de nuevo.', 0);
    throw new ProfileApiError('No pudimos conectar con Petzy. Revisa tu conexión a internet e inténtalo de nuevo.', 0);
  } finally {
    clearTimeout(timeout);
  }
}

export function getOwnProfile(token: string) {
  return request<User>('/users/me', token);
}

export type PublicProfile = {
  id: string;
  username: string;
  bio: string | null;
  locatedAt: MexicoState;
  avatarUrl: string | null;
};

export function searchProfiles(token: string, q: string, cursor?: string) {
  const params = new URLSearchParams({ q, limit: '20' });
  if (cursor) params.set('cursor', cursor);
  return request<{ items: PublicProfile[]; nextCursor: string | null }>(`/users?${params}`, token);
}

export function getPublicProfile(token: string, id: string) {
  return request<PublicProfile>(`/users/${encodeURIComponent(id)}`, token);
}

export function updateOwnProfile(token: string, draft: { username: string; bio: string | null; locatedAt: MexicoState }) {
  return request<User>('/users/me', token, {
    method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(draft),
  });
}

export async function uploadProfilePhoto(token: string, photo: { uri: string; name: string; mimeType: string }) {
  const form = new FormData();
  form.append('photo', await photoUploadPart(photo), photo.name);
  return request<User>('/users/me/avatar', token, { method: 'PUT', body: form });
}

export function removeProfilePhoto(token: string) {
  return request<User>('/users/me/avatar', token, { method: 'DELETE' });
}

export function deactivateOwnProfile(token: string) {
  return request<{ isActive: false; message: string }>('/users/me/deactivate', token, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
}

export function profilePhotoSource(path: string, token: string) {
  return { uri: `${API_URL}${path}`, headers: { authorization: `Bearer ${token}` } };
}
