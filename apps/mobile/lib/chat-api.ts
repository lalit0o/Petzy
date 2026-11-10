import { fetch } from 'expo/fetch';

// Chat privado uno a uno (CH-T12; contrato en docs/05-API.md).
const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

export const MESSAGE_MAX = 250; // D-79

export type ChatMessage = { id: number; body: string; createdAt: string; mine: boolean; read: boolean };
export type ChatUser = { id: string; username: string; avatarUrl: string | null };
export type ConversationSummary = {
  id: number;
  otherUser: ChatUser;
  lastMessage: ChatMessage | null;
  unreadCount: number;
  hidden: boolean;
  blockedByMe: boolean;
  canSend: boolean;
  otherOnline: boolean;
};
export type Page<T> = { items: T[]; nextCursor: number | null };

export class ChatApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) { super(message); }
}

async function request<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  if (!API_URL) throw new ChatApiError('Falta configurar la dirección de la API de Petzy.', 0);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${API_URL}${path}`, { ...init, signal: controller.signal, headers: { authorization: `Bearer ${token}`, ...init.headers } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new ChatApiError(Array.isArray(data.message) ? [...new Set(data.message as string[])].join('. ') : data.message || 'No se pudo completar la solicitud.', response.status, typeof data.code === 'string' ? data.code : undefined);
    return data as T;
  } catch (error) {
    if (error instanceof ChatApiError) throw error;
    throw new ChatApiError(controller.signal.aborted ? 'La solicitud tardó demasiado. Intenta de nuevo.' : 'No se pudo conectar con la API de Petzy.', 0);
  } finally { clearTimeout(timer); }
}
const json = (data: unknown): RequestInit => ({ headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
const page = (cursor?: number, limit = 20) => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor !== undefined) params.set('cursor', String(cursor));
  return `?${params}`;
};

// Clave propia de cada envío: si se reintenta tras un fallo de red, el
// servidor reconoce el mensaje ya guardado y no lo duplica (CH-T05, D-147).
export function newClientKey() {
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export const listConversations = (token: string, cursor?: number) => request<Page<ConversationSummary>>(`/conversations${page(cursor)}`, token);
export const openConversation = (token: string, userId: string) => request<ConversationSummary>('/conversations', token, { method: 'POST', ...json({ userId }) });
export const getConversation = (token: string, id: number) => request<ConversationSummary>(`/conversations/${id}`, token);
export const listMessages = (token: string, id: number, cursor?: number) => request<Page<ChatMessage>>(`/conversations/${id}/messages${page(cursor, 30)}`, token);
export const sendMessage = (token: string, id: number, body: string, clientKey: string) => request<ChatMessage>(`/conversations/${id}/messages`, token, { method: 'POST', ...json({ body, clientKey }) });
// CH-T13: bloqueo (D-76), ocultar (D-79), «Borrar chat para mí» (D-82) y reporte (D-87, D-147).
export const REPORT_NOTE_MAX = 500;
export const blockConversation = (token: string, id: number) => request<ConversationSummary>(`/conversations/${id}/block`, token, { method: 'POST' });
export const unblockConversation = (token: string, id: number) => request<ConversationSummary>(`/conversations/${id}/block`, token, { method: 'DELETE' });
export const hideConversation = (token: string, id: number) => request<{ hidden: true }>(`/conversations/${id}/hide`, token, { method: 'POST' });
export const clearConversation = (token: string, id: number) => request<{ cleared: true }>(`/conversations/${id}/clear`, token, { method: 'POST' });
export const reportConversation = (token: string, id: number, messageIds: number[], note: string, clientKey: string) =>
  request<{ saved: true }>(`/conversations/${id}/reports`, token, { method: 'POST', ...json({ messageIds, note: note.trim() || undefined, clientKey }) });
export const markRead =(token: string, id: number, messageId: number) => request<{ lastReadMessageId: number }>(`/conversations/${id}/read`, token, { method: 'POST', ...json({ messageId }) });
