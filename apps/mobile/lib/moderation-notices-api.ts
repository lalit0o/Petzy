import { fetch } from 'expo/fetch';
import type { RemovalReason } from '@/lib/removal-reasons';

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

// D-141: nunca incluye quién moderó.
export type ModerationNotice = {
  id: number;
  kind: 'POST' | 'COMMENT';
  status: 'REMOVED' | 'RESTORED';
  removedAt: string;
  restoredAt: string | null;
  acknowledged: boolean;
  reason: RemovalReason | null;
  note: string | null;
  community: { id: number; name: string } | null;
  postId: number | null;
  postTitle: string | null;
  excerpt: string;
};
export type ModerationNoticePage = { items: ModerationNotice[]; nextCursor: number | null; pendingCount: number };

export class NoticeApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function request<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  if (!API_URL) throw new NoticeApiError('Falta configurar la dirección de la API de Petzy.', 0);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const response = await fetch(`${API_URL}${path}`, { ...init, signal: controller.signal, headers: { authorization: `Bearer ${token}`, ...init.headers } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new NoticeApiError(Array.isArray(data.message) ? data.message.join('. ') : data.message || 'No se pudo completar la solicitud.', response.status);
    return data as T;
  } catch (error) {
    if (error instanceof NoticeApiError) throw error;
    throw new NoticeApiError(controller.signal.aborted ? 'La solicitud tardó demasiado. Intenta de nuevo.' : 'No pudimos conectar con Petzy. Revisa tu conexión a internet e inténtalo de nuevo.', 0);
  } finally { clearTimeout(timer); }
}

export function listModerationNotices(token: string, options: { pending?: boolean; cursor?: number; limit?: number } = {}) {
  const params = new URLSearchParams({ limit: String(options.limit ?? 20) });
  if (options.pending) params.set('pending', 'true');
  if (options.cursor !== undefined) params.set('cursor', String(options.cursor));
  return request<ModerationNoticePage>(`/users/me/moderation-notices?${params}`, token);
}

export function acknowledgeModerationNotices(token: string, ids: number[]) {
  return request<{ acknowledged: number; pendingCount: number }>('/users/me/moderation-notices/acknowledge', token, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ids }),
  });
}
