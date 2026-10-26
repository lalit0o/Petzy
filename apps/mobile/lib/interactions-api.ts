const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

export type Comment = {
  id: number;
  postId: number;
  userId: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  user: { id: string; username: string; avatarUrl: string | null };
};
export type CommentPage = { items: Comment[]; nextCursor: number | null; total: number };
export type RemovedComment = { id: number; removedAt: string; comment: Comment; moderator: { id: string; username: string } };
export type RemovedCommentPage = { items: RemovedComment[]; nextCursor: number | null };
export type LikeResult = { likeCount: number; likedByMe: boolean };

export class InteractionApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function request<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  if (!API_URL) throw new InteractionApiError('Falta configurar la dirección de la API de Petzy.', 0);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init, signal: controller.signal,
      headers: { authorization: `Bearer ${token}`, ...init.headers },
    });
    const data: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      const body = data as { message?: string | string[] };
      const message = Array.isArray(body.message) ? body.message.join('. ') : body.message;
      throw new InteractionApiError(message || 'No se pudo completar la solicitud.', response.status);
    }
    return data as T;
  } catch (error) {
    if (error instanceof InteractionApiError) throw error;
    if (controller.signal.aborted) throw new InteractionApiError('La solicitud tardó demasiado. Intenta de nuevo.', 0);
    throw new InteractionApiError('No se pudo conectar con la API de Petzy.', 0);
  } finally { clearTimeout(timeout); }
}

export function listComments(token: string, postId: number, cursor?: number) {
  const query = new URLSearchParams({ limit: '20' });
  if (cursor) query.set('cursor', String(cursor));
  return request<CommentPage>(`/posts/${postId}/comments?${query}`, token);
}

export function createComment(token: string, postId: number, body: string) {
  return request<Comment>(`/posts/${postId}/comments`, token, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ body }) });
}

export function editComment(token: string, postId: number, commentId: number, body: string) {
  return request<Comment>(`/posts/${postId}/comments/${commentId}`, token, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ body }) });
}

export function removeOwnComment(token: string, postId: number, commentId: number) {
  return request<{ message: string }>(`/posts/${postId}/comments/${commentId}`, token, { method: 'DELETE' });
}

export function setLike(token: string, postId: number, liked: boolean) {
  return request<LikeResult>(`/posts/${postId}/like`, token, { method: liked ? 'PUT' : 'DELETE' });
}

export function hideGeneralComment(token: string, postId: number, commentId: number) {
  return request<{ message: string }>(`/posts/${postId}/moderation/comments/${commentId}`, token, { method: 'DELETE' });
}

export function listGeneralHidden(token: string, postId: number, cursor?: number) {
  const query = new URLSearchParams({ limit: '20' });
  if (cursor) query.set('cursor', String(cursor));
  return request<RemovedCommentPage>(`/posts/${postId}/moderation/comments?${query}`, token);
}

export function restoreGeneralComment(token: string, postId: number, commentId: number) {
  return request<{ message: string }>(`/posts/${postId}/moderation/comments/${commentId}/restore`, token, { method: 'POST' });
}

export function hideCommunityComment(token: string, communityId: number, postId: number, commentId: number) {
  return request<{ message: string }>(`/communities/${communityId}/posts/${postId}/comments/${commentId}`, token, { method: 'DELETE' });
}
