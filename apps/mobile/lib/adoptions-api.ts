import { fetch } from 'expo/fetch';
import { photoUploadPart } from '@/lib/photo-upload';

// Adopción (AD-T12–AD-T16; contrato en docs/05-API.md).
const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

export const TITLE_MAX = 120;
export const DESCRIPTION_MAX = 3000;
export const EXPLANATION_MAX = 500;
export const PHOTOS_MAX = 3;

export type AdoptionStatus = 'SEEKING_HOME' | 'FOUND_HOME';
export const STATUS_LABEL: Record<AdoptionStatus, string> = { SEEKING_HOME: 'Busca hogar', FOUND_HOME: 'Encontró hogar' };
export type AdoptionReportReason = 'POSSIBLE_SALE' | 'MISLEADING_INFO' | 'INAPPROPRIATE_CONTENT' | 'OTHER';
export const REPORT_REASONS: { value: AdoptionReportReason; label: string }[] = [
  { value: 'POSSIBLE_SALE', label: 'Parece una venta' },
  { value: 'MISLEADING_INFO', label: 'Información engañosa' },
  { value: 'INAPPROPRIATE_CONTENT', label: 'Contenido inapropiado' },
  { value: 'OTHER', label: 'Otro' },
];

export type Adoption = {
  id: number; title: string; description: string; status: AdoptionStatus; isActive: boolean;
  createdAt: string; updatedAt: string; mine: boolean; reportedByMe?: boolean;
  author: { id: string; username: string; avatarUrl: string | null };
  photos: { id: number; url: string }[];
  pet: { id: number; name: string; species: string; age: number; isAgeApproximate: boolean; photoUrl: string | null } | null;
};
export type AdoptionPage<C> = { items: Adoption[]; nextCursor: C | null };
export type NewPhoto = { uri: string; name: string; mimeType: string; size: number };

export class AdoptionApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) { super(message); }
}

async function request<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  if (!API_URL) throw new AdoptionApiError('Falta configurar la dirección de la API de Petzy.', 0);
  const controller = new AbortController();
  // Subir hasta tres fotos puede tardar más que una consulta.
  const timer = setTimeout(() => controller.abort(), init.body instanceof FormData ? 90000 : 60000);
  try {
    const response = await fetch(`${API_URL}${path}`, { ...init, signal: controller.signal, headers: { authorization: `Bearer ${token}`, ...init.headers } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new AdoptionApiError(Array.isArray(data.message) ? [...new Set(data.message as string[])].join('. ') : data.message || 'No se pudo completar la solicitud.', response.status, typeof data.code === 'string' ? data.code : undefined);
    return data as T;
  } catch (error) {
    if (error instanceof AdoptionApiError) throw error;
    throw new AdoptionApiError(controller.signal.aborted ? 'La solicitud tardó demasiado. Intenta de nuevo.' : 'No pudimos conectar con Petzy. Revisa tu conexión a internet e inténtalo de nuevo.', 0);
  } finally { clearTimeout(timer); }
}
const json = (data: unknown): RequestInit => ({ headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });

// Foto privada: la API comprueba sesión y visibilidad en cada petición (D-94).
export function adoptionPhotoSource(path: string, token: string) {
  return { uri: `${API_URL}${path}`, headers: { authorization: `Bearer ${token}` } };
}

export const listAdoptions = (token: string, status: AdoptionStatus | null, cursor?: string) => {
  const params = new URLSearchParams({ limit: '20' });
  if (status) params.set('status', status);
  if (cursor) params.set('cursor', cursor);
  return request<AdoptionPage<string>>(`/adoptions?${params}`, token);
};
export const getAdoption = (token: string, id: number) => request<Adoption>(`/adoptions/${id}`, token);
export const listWithdrawn = (token: string, cursor?: number) => request<AdoptionPage<number>>(`/adoptions/me/withdrawn?limit=20${cursor ? `&cursor=${cursor}` : ''}`, token);

export type AdoptionDraft = { title: string; description: string; petId: number | null };

export async function createAdoption(token: string, draft: AdoptionDraft, photos: NewPhoto[]) {
  const form = new FormData();
  form.append('title', draft.title);
  form.append('description', draft.description);
  if (draft.petId !== null) form.append('petId', String(draft.petId));
  form.append('acceptNoSale', 'true');
  for (const photo of photos) form.append('photos', await photoUploadPart(photo), photo.name);
  return request<Adoption>('/adoptions', token, { method: 'POST', body: form });
}

// `keepPhotoIds` en orden; las fotos nuevas quedan después (AD-T08).
export async function updateAdoption(token: string, id: number, draft: AdoptionDraft, keepPhotoIds: number[], photos: NewPhoto[]) {
  const form = new FormData();
  form.append('title', draft.title);
  form.append('description', draft.description);
  form.append('petId', draft.petId === null ? '' : String(draft.petId));
  form.append('keepPhotoIds', keepPhotoIds.join(','));
  for (const photo of photos) form.append('photos', await photoUploadPart(photo), photo.name);
  return request<Adoption>(`/adoptions/${id}`, token, { method: 'PATCH', body: form });
}

export const setAdoptionStatus = (token: string, id: number, status: AdoptionStatus) => request<Adoption>(`/adoptions/${id}`, token, { method: 'PATCH', ...json({ status }) });
export const withdrawAdoption = (token: string, id: number) => request<Adoption>(`/adoptions/${id}`, token, { method: 'DELETE' });
export const restoreAdoption = (token: string, id: number) => request<Adoption>(`/adoptions/${id}/restore`, token, { method: 'POST' });
export const contactAdoption = (token: string, id: number) => request<{ id: number }>(`/adoptions/${id}/contact`, token, { method: 'POST' });
export const reportAdoption = (token: string, id: number, reason: AdoptionReportReason, explanation: string) =>
  request<{ saved: true }>(`/adoptions/${id}/reports`, token, { method: 'POST', ...json({ reason, explanation: explanation.trim() || undefined }) });
