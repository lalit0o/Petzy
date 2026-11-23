import { fetch } from 'expo/fetch';
import { photoUploadPart } from '@/lib/photo-upload';
import { versionedPhotoPath } from '@/lib/photo-cache';
import type { OwnPet, PostCategory, PostPage, PostSummary } from '@/types/post';

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

export class PostApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function request<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  if (!API_URL) throw new PostApiError('Falta configurar la dirección de la API de Petzy.', 0);
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
      throw new PostApiError(message || 'No se pudo completar la solicitud.', response.status);
    }
    return data as T;
  } catch (error) {
    if (error instanceof PostApiError) throw error;
    if (controller.signal.aborted) throw new PostApiError('La solicitud tardó demasiado. Intenta de nuevo.', 0);
    throw new PostApiError('No pudimos conectar con Petzy. Revisa tu conexión a internet e inténtalo de nuevo.', 0);
  } finally {
    clearTimeout(timeout);
  }
}

export function photoSource(path: string, token: string) {
  return { uri: `${API_URL}${versionedPhotoPath(path)}`, headers: { authorization: `Bearer ${token}` } };
}

export function listPosts(token: string, type: PostCategory | null, cursor?: number) {
  const query = new URLSearchParams({ limit: '20' });
  if (type) query.set('type', type);
  if (cursor) query.set('cursor', String(cursor));
  return request<PostPage>(`/posts?${query.toString()}`, token);
}

export function getPost(token: string, id: number) {
  return request<PostSummary>(`/posts/${id}`, token);
}

export function listOwnPets(token: string, cursor?: number) {
  const query = cursor ? `?cursor=${cursor}` : '';
  return request<{ items: OwnPet[]; nextCursor: number | null }>(`/users/me/pets${query}`, token);
}

export type PostPhoto = { uri: string; name: string; mimeType: string; size: number };
export type PostDraft = {
  title: string;
  description: string;
  type: PostCategory;
  petId: number | null;
  photo: PostPhoto | null;
  removePhoto?: boolean;
};

async function postBody(draft: PostDraft, editing: boolean): Promise<{ body: BodyInit; headers?: HeadersInit }> {
  const fields = {
    type: draft.type,
    title: draft.title,
    description: draft.description,
    ...(draft.petId !== null ? { petId: draft.petId } : editing ? { removePet: true } : {}),
    ...(editing && draft.removePhoto ? { removePhoto: true } : {}),
  };
  if (!draft.photo) return { body: JSON.stringify(fields), headers: { 'content-type': 'application/json' } };
  const form = new FormData();
  form.append('type', fields.type);
  form.append('title', fields.title);
  form.append('description', fields.description);
  if ('petId' in fields && fields.petId !== undefined) form.append('petId', String(fields.petId));
  if ('removePet' in fields) form.append('removePet', 'true');
  form.append('photo', await photoUploadPart(draft.photo), draft.photo.name);
  return { body: form };
}

export async function createPost(token: string, draft: PostDraft, communityId?: number) {
  const payload = await postBody(draft, false);
  const path = communityId ? `/communities/${communityId}/posts` : '/posts';
  return request<PostSummary>(path, token, { method: 'POST', ...payload });
}

export async function updatePost(token: string, id: number, draft: PostDraft) {
  return request<PostSummary>(`/posts/${id}`, token, { method: 'PATCH', ...await postBody(draft, true) });
}

export function removePost(token: string, id: number) {
  return request<{ message: string }>(`/posts/${id}`, token, { method: 'DELETE' });
}
