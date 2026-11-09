import { fetch } from 'expo/fetch';
import { photoUploadPart } from '@/lib/photo-upload';
import { versionedPhotoPath } from '@/lib/photo-cache';

// Eventos dentro de Comunidades (D-144; plan de Eventos).
const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

export type EventPhase = 'upcoming' | 'ongoing' | 'past';
export type EventResponse = 'GOING' | 'NOT_GOING';
export type CommunityEvent = {
  id: number; communityId: number; title: string; description?: string; placeLabel: string;
  latitude: number; longitude: number; startsAt: string; endsAt: string; timeZone: string;
  status: 'PUBLISHED' | 'CANCELLED'; phase: EventPhase; coverPath: string | null;
  goingCount: number | null; myResponse: EventResponse | null; isMember: boolean;
  canRespond: boolean; canEdit: boolean; canEditStart: boolean; canCancel: boolean;
  creator: { id: string; username: string } | null; updatedAt: string;
};
export type EventPage = { items: CommunityEvent[]; nextCursor: number | null };
export type EventDraft = { title: string; description: string; placeLabel: string; latitude: number; longitude: number; startsAt: string; endsAt: string; timeZone: string };
export type EventCover = { uri: string; name: string; mimeType: string; size: number };

export class EventApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function request<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  if (!API_URL) throw new EventApiError('Falta configurar la dirección de la API de Petzy.', 0);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${API_URL}${path}`, { ...init, signal: controller.signal, headers: { authorization: `Bearer ${token}`, ...init.headers } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new EventApiError(Array.isArray(data.message) ? [...new Set(data.message as string[])].join('. ') : data.message || 'No se pudo completar la solicitud.', response.status);
    return data as T;
  } catch (error) {
    if (error instanceof EventApiError) throw error;
    throw new EventApiError(controller.signal.aborted ? 'La solicitud tardó demasiado. Intenta de nuevo.' : 'No se pudo conectar con la API de Petzy.', 0);
  } finally { clearTimeout(timer); }
}
const json = (data: unknown): RequestInit => ({ headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });

export function eventCoverSource(path: string, token: string) {
  return { uri: `${API_URL}${versionedPhotoPath(path)}`, headers: { authorization: `Bearer ${token}` } };
}

// Clave que se conserva al reintentar un cambio de horario, lugar o
// cancelación, para que el servidor no repita los avisos.
export function newRequestKey() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export const listEvents = (token: string, communityId: number, section: EventPhase, cursor?: number) => {
  const params = new URLSearchParams({ section, limit: '20' });
  if (cursor !== undefined) params.set('cursor', String(cursor));
  return request<EventPage>(`/communities/${communityId}/events?${params}`, token);
};
export const getEvent = (token: string, id: number) => request<CommunityEvent>(`/events/${id}`, token);

export async function createEvent(token: string, communityId: number, draft: EventDraft, cover?: EventCover | null) {
  if (!cover) return request<CommunityEvent>(`/communities/${communityId}/events`, token, { method: 'POST', ...json(draft) });
  const form = new FormData();
  for (const [key, value] of Object.entries(draft)) form.append(key, String(value));
  form.append('photo', await photoUploadPart(cover), cover.name);
  return request<CommunityEvent>(`/communities/${communityId}/events`, token, { method: 'POST', body: form });
}
export const updateEvent = (token: string, id: number, draft: Partial<EventDraft>, requestKey: string) =>
  request<CommunityEvent>(`/events/${id}`, token, { method: 'PATCH', ...json({ ...draft, requestKey }) });
export async function uploadEventCover(token: string, id: number, cover: EventCover) {
  const form = new FormData();
  form.append('photo', await photoUploadPart(cover), cover.name);
  return request<CommunityEvent>(`/events/${id}/cover`, token, { method: 'PUT', body: form });
}
export const removeEventCover = (token: string, id: number) => request<CommunityEvent>(`/events/${id}/cover`, token, { method: 'DELETE' });
export const cancelEvent = (token: string, id: number, requestKey: string) => request<CommunityEvent>(`/events/${id}/cancel`, token, { method: 'POST', ...json({ requestKey }) });
export const respondEvent = (token: string, id: number, response: EventResponse) => request<CommunityEvent>(`/events/${id}/attendance`, token, { method: 'PUT', ...json({ response }) });
