import { fetch } from 'expo/fetch';
import { photoUploadPart } from '@/lib/photo-upload';
import { versionedPhotoPath } from '@/lib/photo-cache';
import type { PostPage } from '@/types/post';
import type { RemovedCommentPage } from '@/lib/interactions-api';
import type { RemovalPayload, RemovalReason } from '@/lib/removal-reasons';

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
export type CommunityRole = 'ADMIN' | 'MODERATOR' | 'MEMBER';
export type Community = { id: number; name: string; description: string; photoPath: string | null; memberCount: number; role: CommunityRole | null; topic?: string };
export type CommunityDraft = { name: string; description: string; topic: string };
export type CommunityPhoto = { uri: string; name: string; mimeType: string; size: number };

export function communityPhotoSource(path: string, token: string) {
  return { uri: `${API_URL}${versionedPhotoPath(path)}`, headers: { authorization: `Bearer ${token}` } };
}
export type Member = { id: string; username: string; avatarUrl: string | null; role: CommunityRole };
export type ExpelledMember = { id: string; username: string; avatarUrl: string | null; expelledAt: string };
// D-141: la API nunca expone quién moderó.
export type RemovedPost = { id: number; removedAt: string; reason: RemovalReason | null; note: string | null; post: { id: number; title: string; type: string; user: { id: string; username: string } } };
export type Page<T, C = number> = { items: T[]; nextCursor: C | null };

export class CommunityApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}
async function request<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  if (!API_URL) throw new CommunityApiError('Falta configurar la dirección de la API de Petzy.', 0);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const response = await fetch(`${API_URL}${path}`, { ...init, signal: controller.signal, headers: { authorization: `Bearer ${token}`, ...init.headers } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new CommunityApiError(Array.isArray(data.message) ? data.message.join('. ') : data.message || 'No se pudo completar la solicitud.', response.status);
    return data as T;
  } catch (error) {
    if (error instanceof CommunityApiError) throw error;
    throw new CommunityApiError(controller.signal.aborted ? 'La solicitud tardó demasiado. Intenta de nuevo.' : 'No pudimos conectar con Petzy. Revisa tu conexión a internet e inténtalo de nuevo.', 0);
  } finally { clearTimeout(timer); }
}
const body = (data: unknown): RequestInit => ({ headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
const query = (cursor?: number | string, q?: string, mine?: boolean) => { const params = new URLSearchParams({ limit: '20' }); if (cursor !== undefined) params.set('cursor', String(cursor)); if (q) params.set('q', q); if (mine) params.set('mine', 'true'); return `?${params}`; };
export const listCommunities = (token: string, q?: string, cursor?: number, mine?: boolean) => request<Page<Community>>(`/communities${query(cursor, q, mine)}`, token);
export const getCommunity = (token: string, id: number) => request<Community>(`/communities/${id}`, token);
export async function createCommunity(token: string, draft: CommunityDraft, photo?: CommunityPhoto | null) {
  if (!photo) return request<Community>('/communities', token, { method: 'POST', ...body(draft) });
  const form = new FormData();
  form.append('name', draft.name);
  form.append('description', draft.description);
  form.append('topic', draft.topic);
  form.append('photo', await photoUploadPart(photo), photo.name);
  return request<Community>('/communities', token, { method: 'POST', body: form });
}
export const updateCommunity = (token: string, id: number, draft: CommunityDraft) => request<Community>(`/communities/${id}`, token, { method: 'PATCH', ...body(draft) });
export async function uploadCommunityPhoto(token: string, id: number, photo: CommunityPhoto) {
  const form = new FormData();
  form.append('photo', await photoUploadPart(photo), photo.name);
  return request<Community>(`/communities/${id}/photo`, token, { method: 'PUT', body: form });
}
export const removeCommunityPhoto = (token: string, id: number) => request<Community>(`/communities/${id}/photo`, token, { method: 'DELETE' });
export const joinCommunity = (token: string, id: number) => request<Community>(`/communities/${id}/members/me`, token, { method: 'POST' });
export const leaveCommunity = (token: string, id: number) => request<{ message: string; communityDeleted: boolean }>(`/communities/${id}/members/me`, token, { method: 'DELETE' });
export const listMembers = (token: string, id: number, cursor?: string) => request<Page<Member, string>>(`/communities/${id}/members${query(cursor)}`, token);
export const changeRole = (token: string, id: number, userId: string, role: CommunityRole) => request(`/communities/${id}/members/${encodeURIComponent(userId)}/role`, token, { method: 'PATCH', ...body({ role }) });
export const expelMember = (token: string, id: number, userId: string) => request(`/communities/${id}/expulsions`, token, { method: 'POST', ...body({ userId }) });
export const listExpulsions = (token: string, id: number, cursor?: string) => request<Page<ExpelledMember, string>>(`/communities/${id}/expulsions${query(cursor)}`, token);
export const unblockMember = (token: string, id: number, userId: string) => request(`/communities/${id}/expulsions/${encodeURIComponent(userId)}`, token, { method: 'DELETE' });
export const listCommunityPosts = (token: string, id: number, cursor?: number) => request<PostPage>(`/communities/${id}/posts${query(cursor)}`, token);
export const removeCommunityPost = (token: string, id: number, postId: number, payload: RemovalPayload) => request(`/communities/${id}/posts/${postId}`, token, { method: 'DELETE', ...body(payload) });
export const listRemovedPosts = (token: string, id: number, cursor?: number) => request<Page<RemovedPost>>(`/communities/${id}/moderation/posts${query(cursor)}`, token);
export const restoreCommunityPost = (token: string, id: number, postId: number) => request(`/communities/${id}/moderation/posts/${postId}/restore`, token, { method: 'POST' });
export const listRemovedComments = (token: string, id: number, cursor?: number) => request<RemovedCommentPage>(`/communities/${id}/moderation/comments${query(cursor)}`, token);
export const restoreCommunityComment = (token: string, id: number, commentId: number) => request(`/communities/${id}/moderation/comments/${commentId}/restore`, token, { method: 'POST' });
