import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useAuthContext } from '@/context/AuthContext';
import { CommentCard } from '@/components/post-interactions';
import { CommunityButton, CommunityCard, CommunityMessage, ui, useCommunityColors } from '@/components/community-ui';
import { CommunityApiError, listRemovedComments, listRemovedPosts, restoreCommunityComment, restoreCommunityPost, type RemovedPost } from '@/lib/communities-api';
import type { RemovedComment } from '@/lib/interactions-api';

export function CommunityModeration({ communityId, onAccessLost }: { communityId: number; onAccessLost: () => void }) {
  const { token } = useAuthContext(); const c = useCommunityColors();
  const [tab, setTab] = useState<'posts' | 'comments'>('posts'); const [posts, setPosts] = useState<RemovedPost[]>([]); const [comments, setComments] = useState<RemovedComment[]>([]);
  const [cursor, setCursor] = useState<number | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<number | null>(null); const action = useRef(false); const requestId = useRef(0);
  const load = useCallback(async function loadPage(next?: number): Promise<void> {
    if (!token) return;
    const current = ++requestId.current; setLoading(true); setError('');
    if (next === undefined) { setPosts([]); setComments([]); setCursor(null); }
    try {
      if (tab === 'posts') {
        const page = await listRemovedPosts(token, communityId, next); if (current !== requestId.current) return;
        setPosts(old => next === undefined ? page.items : [...old, ...page.items.filter(item => !old.some(row => row.id === item.id))]); setCursor(page.nextCursor);
      } else {
        const page = await listRemovedComments(token, communityId, next); if (current !== requestId.current) return;
        setComments(old => next === undefined ? page.items : [...old, ...page.items.filter(item => !old.some(row => row.id === item.id))]); setCursor(page.nextCursor);
      }
    } catch (cause) {
      if (current !== requestId.current) return;
      if (next !== undefined && cause instanceof CommunityApiError && [400, 404].includes(cause.status)) { await loadPage(); return; }
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar el contenido retirado.');
      if (cause instanceof CommunityApiError && [403, 404].includes(cause.status)) { setPosts([]); setComments([]); onAccessLost(); }
    } finally { if (current === requestId.current) setLoading(false); }
  }, [token, communityId, tab, onAccessLost]);
  const invalidate = useCallback(() => { requestId.current++; }, []);
  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void load(); }); return () => { active = false; invalidate(); }; }, [load, invalidate]);
  const restore = async (removalId: number, contentId: number) => {
    if (!token || action.current) return; action.current = true; setBusy(removalId); setError(''); setMessage('');
    try {
      if (tab === 'posts') await restoreCommunityPost(token, communityId, contentId); else await restoreCommunityComment(token, communityId, contentId);
      setMessage(tab === 'posts' ? 'Publicación restaurada.' : 'Comentario restaurado.'); void load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo restaurar.'); if (cause instanceof CommunityApiError && [403, 404].includes(cause.status)) onAccessLost(); }
    finally { action.current = false; setBusy(null); }
  };
  const changeTab = (next: 'posts' | 'comments') => { if (next === tab) return; requestId.current++; setPosts([]); setComments([]); setCursor(null); setMessage(''); setTab(next); };
  return <View style={{ gap: 12 }}>
    <Text style={[ui.heading, { color: c.heading }]}>Contenido retirado</Text>
    <View style={ui.row}><CommunityButton label="Publicaciones" secondary={tab !== 'posts'} disabled={busy !== null} onPress={() => changeTab('posts')} /><CommunityButton label="Comentarios" secondary={tab !== 'comments'} disabled={busy !== null} onPress={() => changeTab('comments')} /></View>
    <CommunityMessage text={message} /><CommunityMessage text={error} error />
    {error ? <CommunityButton label="Reintentar contenido retirado" secondary onPress={() => void load()} /> : null}
    {loading ? <ActivityIndicator color={c.heading} accessibilityLabel="Cargando contenido retirado" /> : null}
    {!loading && !error && !(tab === 'posts' ? posts.length : comments.length) ? <Text style={[ui.body, { color: c.muted }]}>No hay {tab === 'posts' ? 'publicaciones retiradas' : 'comentarios ocultados'} por moderación.</Text> : null}
    {tab === 'posts' ? posts.map(item => <CommunityCard key={item.id}><Text style={[ui.heading, { color: c.heading }]}>{item.post.title}</Text><Text style={[ui.body, { color: c.text }]}>Por {item.post.user.username}</Text><Text style={[ui.muted, { color: c.muted }]}>Retirada por {item.moderator.username}</Text><CommunityButton label="Restaurar publicación" secondary busy={busy === item.id} disabled={busy !== null} onPress={() => void restore(item.id, item.post.id)} /></CommunityCard>) : comments.map(item => <CommentCard key={item.id} comment={item.comment} token={token}><Text style={[ui.muted, { color: c.muted }]}>Ocultado por {item.moderator.username}</Text><CommunityButton label="Restaurar comentario" secondary busy={busy === item.id} disabled={busy !== null} onPress={() => void restore(item.id, item.comment.id)} /></CommentCard>)}
    {cursor !== null ? <CommunityButton label="Cargar más retirados" busy={loading} secondary onPress={() => void load(cursor)} /> : null}
  </View>;
}
