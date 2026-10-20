import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useAuthContext } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { profilePhotoSource } from '@/lib/profiles-api';
import { createComment, editComment, hideCommunityComment, hideGeneralComment, listComments, listGeneralHidden, removeOwnComment, restoreGeneralComment, setLike, type Comment, type RemovedComment } from '@/lib/interactions-api';
import type { PostSummary } from '@/types/post';

const light = { card: '#F8F7F0', text: '#111212', heading: '#365625', muted: '#525D48', border: '#B5AF8B', placeholder: '#DED0A5', error: '#8C3F37', actionText: '#FFFFFF' };
const dark = { card: '#20311C', text: '#DBDFD0', heading: '#82A87E', muted: '#B5AF8B', border: '#525D48', placeholder: '#404F4D', error: '#F0A59A', actionText: '#182213' };

function CommentAvatar({ path, username, token }: { path: string | null; username: string; token: string }) {
  const colors = useColorScheme() === 'dark' ? dark : light;
  const [failed, setFailed] = useState(false);
  return <View style={[styles.avatar, { backgroundColor: colors.placeholder }]}>
    {path && !failed ? <Image source={profilePhotoSource(path, token)} style={styles.avatar} contentFit="cover" cachePolicy="none" onError={() => setFailed(true)} accessibilityLabel={`Foto de ${username}`} /> : <Ionicons name="person-outline" size={20} color={colors.heading} />}
  </View>;
}

export function PostInteractions({ post, onPostUnavailable }: { post: PostSummary; onPostUnavailable: () => void }) {
  const { token, user } = useAuthContext();
  const colors = useColorScheme() === 'dark' ? dark : light;
  const sendingRef = useRef(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState('');
  const [actionBusy, setActionBusy] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [likedByMe, setLikedByMe] = useState(post.likedByMe);
  const [likeBusy, setLikeBusy] = useState(false);
  const [likeError, setLikeError] = useState('');
  const [hiddenOpen, setHiddenOpen] = useState(false);
  const [hidden, setHidden] = useState<RemovedComment[]>([]);
  const [hiddenCursor, setHiddenCursor] = useState<number | null>(null);
  const [hiddenLoading, setHiddenLoading] = useState(false);
  const [hiddenError, setHiddenError] = useState('');

  const load = async (next?: number) => {
    if (!token) return;
    if (next === undefined) setLoading(true); else setLoadingMore(true);
    setLoadError('');
    try {
      const page = await listComments(token, post.id, next);
      setComments(current => next === undefined ? page.items : [...current, ...page.items]);
      setCursor(page.nextCursor);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'No se pudieron cargar los comentarios.';
      setLoadError(message);
      if (next === undefined && 'status' in (cause as object) && (cause as { status: number }).status === 404) onPostUnavailable();
    } finally { setLoading(false); setLoadingMore(false); }
  };

  useEffect(() => {
    if (!token) return;
    let active = true;
    queueMicrotask(async () => {
      try {
        const page = await listComments(token, post.id);
        if (active) { setComments(page.items); setCursor(page.nextCursor); setLoadError(''); }
      } catch (cause) {
        if (active) { setLoadError(cause instanceof Error ? cause.message : 'No se pudieron cargar los comentarios.'); if ('status' in (cause as object) && (cause as { status: number }).status === 404) onPostUnavailable(); }
      } finally { if (active) setLoading(false); }
    });
    return () => { active = false; };
  }, [post.id, token, onPostUnavailable]);

  const send = async () => {
    if (!token || sendingRef.current) return;
    const body = draft.trim();
    if (!body || body.length > 500) { setFormError('Escribe un comentario de 1 a 500 caracteres.'); return; }
    sendingRef.current = true; setSending(true); setFormError('');
    try {
      const comment = await createComment(token, post.id, body);
      setComments(current => [comment, ...current]);
      setDraft('');
    } catch (cause) { setFormError(cause instanceof Error ? cause.message : 'No se pudo publicar el comentario.'); }
    finally { sendingRef.current = false; setSending(false); }
  };

  const changeLike = async () => {
    if (!token || likeBusy) return;
    setLikeBusy(true); setLikeError('');
    try {
      const result = await setLike(token, post.id, !likedByMe);
      setLikedByMe(result.likedByMe); setLikeCount(result.likeCount);
    } catch (cause) { setLikeError(cause instanceof Error ? cause.message : 'No se pudo actualizar «Me gusta».'); }
    finally { setLikeBusy(false); }
  };

  const commentAction = async (comment: Comment, action: 'edit' | 'remove' | 'hide') => {
    if (!token || actionBusy !== null) return;
    if (action === 'edit' && (!editText.trim() || editText.trim().length > 500)) { setActionError('El comentario debe tener de 1 a 500 caracteres.'); return; }
    setActionBusy(comment.id); setActionError('');
    try {
      if (action === 'edit') {
        const next = await editComment(token, post.id, comment.id, editText.trim());
        setComments(current => current.map(item => item.id === next.id ? next : item));
        setEditingId(null); setEditText('');
      } else {
        if (action === 'remove') await removeOwnComment(token, post.id, comment.id);
        else if (post.communityId !== null) await hideCommunityComment(token, post.communityId, post.id, comment.id);
        else await hideGeneralComment(token, post.id, comment.id);
        setComments(current => current.filter(item => item.id !== comment.id));
        if (action === 'hide' && hiddenOpen) void loadHidden();
      }
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : 'No se pudo cambiar el comentario.'); }
    finally { setActionBusy(null); }
  };

  const loadHidden = async (next?: number) => {
    if (!token) return;
    setHiddenLoading(true); setHiddenError('');
    try {
      const page = await listGeneralHidden(token, post.id, next);
      setHidden(current => next === undefined ? page.items : [...current, ...page.items]);
      setHiddenCursor(page.nextCursor);
    } catch (cause) { setHiddenError(cause instanceof Error ? cause.message : 'No se pudieron cargar los comentarios ocultados.'); }
    finally { setHiddenLoading(false); }
  };

  const restore = async (commentId: number) => {
    if (!token || actionBusy !== null) return;
    setActionBusy(commentId); setHiddenError('');
    try {
      await restoreGeneralComment(token, post.id, commentId);
      setHidden(current => current.filter(item => item.comment.id !== commentId));
      await load();
    } catch (cause) { setHiddenError(cause instanceof Error ? cause.message : 'No se pudo restaurar el comentario.'); }
    finally { setActionBusy(null); }
  };

  return <View style={styles.section}>
    <Pressable accessibilityRole="button" disabled={likeBusy} onPress={() => void changeLike()} style={[styles.like, { borderColor: colors.border }]}><Ionicons name={likedByMe ? 'heart' : 'heart-outline'} size={21} color={colors.heading} /><Text style={[styles.link, { color: colors.heading }]}>{likedByMe ? 'Te gusta' : 'Me gusta'} · {likeCount}</Text>{likeBusy ? <ActivityIndicator size="small" color={colors.heading} /> : null}</Pressable>
    {likeError ? <Text style={[styles.error, { color: colors.error }]}>{likeError}</Text> : null}
    <Text style={[styles.heading, { color: colors.heading }]}>Comentarios</Text>
    <TextInput accessibilityLabel="Escribir comentario" multiline maxLength={501} value={draft} onChangeText={setDraft} placeholder="Escribe un comentario" placeholderTextColor={colors.muted} textAlignVertical="top" style={[styles.input, styles.newInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} />
    <Text style={[styles.counter, { color: colors.muted }]}>{draft.length}/500</Text>
    {formError ? <Text style={[styles.error, { color: colors.error }]}>{formError}</Text> : null}
    <Pressable accessibilityRole="button" disabled={sending} onPress={() => void send()} style={[styles.send, { backgroundColor: colors.heading }]}>{sending ? <ActivityIndicator color={colors.actionText} /> : <Text style={[styles.sendText, { color: colors.actionText }]}>Comentar</Text>}</Pressable>
    {loading ? <View style={styles.feedback}><ActivityIndicator color={colors.heading} /><Text style={[styles.body, { color: colors.text }]}>Cargando comentarios…</Text></View> : null}
    {loadError ? <View style={styles.feedback}><Text style={[styles.error, { color: colors.error }]}>{loadError}</Text><Pressable accessibilityRole="button" onPress={() => void load(cursor ?? undefined)}><Text style={[styles.link, { color: colors.heading }]}>Reintentar</Text></Pressable></View> : null}
    {!loading && !loadError && comments.length === 0 ? <Text style={[styles.body, { color: colors.text, marginTop: 22 }]}>Todavía no hay comentarios. Puedes escribir el primero.</Text> : null}
    {comments.map(comment => <View key={comment.id} style={[styles.comment, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.commentHeader}><CommentAvatar path={comment.user.avatarUrl} username={comment.user.username} token={token!} /><View style={styles.authorBlock}><Text style={[styles.author, { color: colors.heading }]}>{comment.user.username}</Text><Text style={[styles.meta, { color: colors.muted }]}>{new Date(comment.createdAt).toLocaleDateString('es-MX')}{comment.editedAt ? ' · Editado' : ''}</Text></View></View>
      {editingId === comment.id ? <><TextInput accessibilityLabel="Editar comentario" multiline maxLength={501} value={editText} onChangeText={setEditText} style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} /><View style={styles.actions}><Pressable accessibilityRole="button" disabled={actionBusy !== null} onPress={() => void commentAction(comment, 'edit')}><Text style={[styles.link, { color: colors.heading }]}>{actionBusy === comment.id ? 'Guardando…' : 'Guardar'}</Text></Pressable><Pressable accessibilityRole="button" onPress={() => { setEditingId(null); setEditText(''); setActionError(''); }}><Text style={[styles.link, { color: colors.muted }]}>Cancelar</Text></Pressable></View></>
        : <Text style={[styles.body, { color: colors.text }]}>{comment.body}</Text>}
      {editingId !== comment.id ? <View style={styles.actions}>
        {comment.userId === user?.id ? <><Pressable accessibilityRole="button" onPress={() => { setEditingId(comment.id); setEditText(comment.body); setActionError(''); }}><Text style={[styles.link, { color: colors.heading }]}>Editar</Text></Pressable><Pressable accessibilityRole="button" disabled={actionBusy !== null} onPress={() => void commentAction(comment, 'remove')}><Text style={[styles.link, { color: colors.error }]}>{actionBusy === comment.id ? 'Retirando…' : 'Retirar'}</Text></Pressable></> : null}
        {comment.userId !== user?.id && post.userId === user?.id ? <Pressable accessibilityRole="button" disabled={actionBusy !== null} onPress={() => void commentAction(comment, 'hide')}><Text style={[styles.link, { color: colors.error }]}>{actionBusy === comment.id ? 'Ocultando…' : 'Ocultar'}</Text></Pressable> : null}
      </View> : null}
    </View>)}
    {actionError ? <Text style={[styles.error, { color: colors.error }]}>{actionError}</Text> : null}
    {cursor !== null ? <Pressable accessibilityRole="button" disabled={loadingMore} onPress={() => void load(cursor)} style={styles.more}>{loadingMore ? <ActivityIndicator color={colors.heading} /> : <Text style={[styles.link, { color: colors.heading }]}>Cargar más comentarios</Text>}</Pressable> : null}
    {post.communityId === null && post.userId === user?.id ? <View style={[styles.hiddenBlock, { borderColor: colors.border }]}>
      <Pressable accessibilityRole="button" onPress={() => { setHiddenOpen(!hiddenOpen); if (!hiddenOpen) void loadHidden(); }} style={styles.hiddenToggle}><Text style={[styles.link, { color: colors.heading }]}>Comentarios ocultados</Text><Ionicons name={hiddenOpen ? 'chevron-up' : 'chevron-down'} size={19} color={colors.heading} /></Pressable>
      {hiddenOpen ? <>{hiddenLoading ? <ActivityIndicator color={colors.heading} /> : null}{hiddenError ? <View style={styles.feedback}><Text style={[styles.error, { color: colors.error }]}>{hiddenError}</Text><Pressable accessibilityRole="button" onPress={() => void loadHidden(hiddenCursor ?? undefined)}><Text style={[styles.link, { color: colors.heading }]}>Reintentar</Text></Pressable></View> : null}{!hiddenLoading && !hiddenError && hidden.length === 0 ? <Text style={[styles.body, { color: colors.text }]}>No has ocultado comentarios en esta publicación.</Text> : null}{hidden.map(item => <View key={item.id} style={styles.hiddenItem}><Text style={[styles.author, { color: colors.heading }]}>{item.comment.user.username}</Text><Text style={[styles.body, { color: colors.text }]}>{item.comment.body}</Text><Pressable accessibilityRole="button" disabled={actionBusy !== null} onPress={() => void restore(item.comment.id)}><Text style={[styles.link, { color: colors.heading }]}>{actionBusy === item.comment.id ? 'Restaurando…' : 'Restaurar'}</Text></Pressable></View>)}{hiddenCursor !== null ? <Pressable accessibilityRole="button" disabled={hiddenLoading} onPress={() => void loadHidden(hiddenCursor)} style={styles.more}><Text style={[styles.link, { color: colors.heading }]}>Cargar más ocultados</Text></Pressable> : null}</> : null}
    </View> : null}
  </View>;
}

const styles = StyleSheet.create({
  section: { marginTop: 24 }, like: { minHeight: 50, borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8, paddingHorizontal: 14 },
  heading: { fontFamily: 'Nunito_700Bold', fontSize: 23, marginTop: 26, marginBottom: 12 }, body: { fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 23 },
  input: { borderWidth: 1, borderRadius: 14, minHeight: 70, paddingHorizontal: 12, paddingTop: 10, fontFamily: 'Nunito_400Regular', fontSize: 16 }, newInput: { minHeight: 92 },
  counter: { fontFamily: 'Nunito_400Regular', fontSize: 13, textAlign: 'right', marginTop: 3 }, error: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, lineHeight: 20, marginTop: 8 },
  send: { minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 14, marginTop: 10 }, sendText: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
  feedback: { alignItems: 'center', gap: 8, marginTop: 18 }, link: { fontFamily: 'Nunito_700Bold', fontSize: 15 }, comment: { borderWidth: 1, borderRadius: 16, padding: 13, marginTop: 12 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 }, avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  authorBlock: { flex: 1 }, author: { fontFamily: 'Nunito_700Bold', fontSize: 15 }, meta: { fontFamily: 'Nunito_400Regular', fontSize: 12 },
  actions: { flexDirection: 'row', gap: 20, marginTop: 10 }, more: { minHeight: 48, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  hiddenBlock: { marginTop: 24, borderTopWidth: 1, paddingTop: 16 }, hiddenToggle: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hiddenItem: { paddingVertical: 12, gap: 5 },
});
