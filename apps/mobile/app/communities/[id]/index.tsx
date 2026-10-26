import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FormScrollView } from '@/components/form-scroll-view';
import { CommunityButton, CommunityCard, CommunityMessage, roleLabel, ui, useCommunityColors } from '@/components/community-ui';
import { CommunityModeration } from '@/components/community-moderation';
import { CommunityPeople } from '@/components/community-people';
import { useAuthContext } from '@/context/AuthContext';
import { CommunityApiError, getCommunity, joinCommunity, leaveCommunity, listCommunityPosts, type Community } from '@/lib/communities-api';
import { photoSource } from '@/lib/posts-api';
import { goBackOrReplace } from '@/lib/navigation';
import { POST_CATEGORIES, type PostSummary } from '@/types/post';

function CommunityPostPhoto({ path, token }: { path: string; token: string }) {
  const c = useCommunityColors(); const [failed, setFailed] = useState(false);
  return failed ? <View style={{ gap: 8 }}><CommunityMessage text="No se pudo mostrar la foto." error /><Pressable accessibilityRole="button" style={ui.button} onPress={event => { event.stopPropagation(); setFailed(false); }}><Text style={[ui.label, { color: c.heading }]}>Reintentar foto</Text></Pressable></View> : <Image source={photoSource(path, token)} cachePolicy="none" contentFit="cover" style={{ width: '100%', height: 210, borderRadius: 14 }} onError={() => setFailed(true)} />;
}

export default function CommunityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const communityId = Number(id);
  const { token } = useAuthContext(); const router = useRouter(); const c = useCommunityColors();
  const [community, setCommunity] = useState<Community | null>(null); const [posts, setPosts] = useState<PostSummary[]>([]); const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true); const [postLoading, setPostLoading] = useState(false); const [error, setError] = useState(''); const [postError, setPostError] = useState('');
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [tab, setTab] = useState<'posts' | 'members' | 'moderation' | 'expulsions'>('posts');
  const requestId = useRef(0); const postRequest = useRef(0); const action = useRef(false);
  const load = useCallback(async () => {
    if (!token) return; const current = ++requestId.current; postRequest.current++;
    setLoading(true); setError(''); setCommunity(null); setPosts([]); setCursor(null); setPostError('');
    try {
      const found = await getCommunity(token, communityId); if (current !== requestId.current) return;
      setCommunity(found); if (found.role !== 'ADMIN') setTab('posts');
      if (found.role) {
        try { const page = await listCommunityPosts(token, communityId); if (current === requestId.current) { setPosts(page.items); setCursor(page.nextCursor); } }
        catch (cause) { if (current === requestId.current) { if (cause instanceof CommunityApiError && [403, 404].includes(cause.status)) setCommunity(null); setPostError(cause instanceof Error ? cause.message : 'No se pudieron cargar las publicaciones.'); } }
      }
    } catch (cause) { if (current === requestId.current) setError(cause instanceof Error ? cause.message : 'No se pudo abrir la comunidad.'); }
    finally { if (current === requestId.current) setLoading(false); }
  }, [token, communityId]);
  useFocusEffect(useCallback(() => { void load(); return () => { requestId.current++; postRequest.current++; }; }, [load]));
  const lost = useCallback(() => { void load(); }, [load]);
  const loadPosts = async (next?: number): Promise<void> => {
    if (!token || !community?.role) return; const current = ++postRequest.current; setPostLoading(true); setPostError('');
    try { const page = await listCommunityPosts(token, communityId, next); if (current !== postRequest.current) return; setPosts(old => next === undefined ? page.items : [...old, ...page.items.filter(item => !old.some(row => row.id === item.id))]); setCursor(page.nextCursor); }
    catch (cause) { if (current !== postRequest.current) return; if (cause instanceof CommunityApiError && next !== undefined && cause.status === 400) { await loadPosts(); return; } setPostError(cause instanceof Error ? cause.message : 'No se pudieron cargar las publicaciones.'); if (cause instanceof CommunityApiError && [403, 404].includes(cause.status)) { setPosts([]); setCommunity(null); void load(); } }
    finally { if (current === postRequest.current) setPostLoading(false); }
  };
  const membership = async (join: boolean) => {
    if (!token || action.current) return; action.current = true; setBusy(true); setError(''); setMessage('');
    try {
      if (join) await joinCommunity(token, communityId); else await leaveCommunity(token, communityId);
      postRequest.current++; setPosts([]); setCursor(null); setMessage(join ? 'Te uniste a la comunidad.' : 'Saliste de la comunidad.'); void load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo cambiar tu membresía.'); if (cause instanceof CommunityApiError && [403, 404].includes(cause.status)) void load(); }
    finally { action.current = false; setBusy(false); }
  };
  return <SafeAreaView style={[ui.screen, { backgroundColor: c.bg }]} edges={['top', 'bottom']}>
    <Pressable accessibilityRole="button" accessibilityLabel="Volver a comunidades" style={ui.back} onPress={() => goBackOrReplace(router, '/comunidades')}><Ionicons name="arrow-back" size={24} color={c.heading} /><Text style={[ui.label, { color: c.heading }]}>Volver</Text></Pressable>
    <FormScrollView contentContainerStyle={ui.content}>
      <CommunityMessage text={message} /><CommunityMessage text={error} error />
      {loading ? <ActivityIndicator color={c.heading} accessibilityLabel="Cargando comunidad" /> : null}
      {!community && !loading ? <><CommunityMessage text={postError} error /><CommunityButton label="Reintentar comunidad" secondary onPress={() => void load()} /></> : null}
      {community ? <>
        <Ionicons name="people-outline" size={42} color={c.heading} />
        <Text style={[ui.title, { color: c.heading }]}>{community.name}</Text><Text style={[ui.body, { color: c.text }]}>{community.description}</Text>
        <Text style={[ui.muted, { color: c.muted }]}>{community.memberCount} {community.memberCount === 1 ? 'integrante' : 'integrantes'}{community.role ? ` · ${roleLabel[community.role]}` : ''}</Text>
        {!community.role ? <CommunityButton label="Unirme a la comunidad" busy={busy} onPress={() => void membership(true)} /> : <>
          <View style={ui.row}><CommunityButton label="Publicaciones" secondary={tab !== 'posts'} onPress={() => setTab('posts')} /><CommunityButton label="Integrantes" secondary={tab !== 'members'} onPress={() => setTab('members')} />{community.role === 'ADMIN' ? <CommunityButton label="Contenido retirado" secondary={tab !== 'moderation'} onPress={() => setTab('moderation')} /> : null}</View>
          {tab === 'posts' ? <>
            <CommunityButton label="Crear publicación" onPress={() => router.push((`/communities/${communityId}/posts/create`) as Href)} />
            <CommunityMessage text={postError} error />{postError ? <CommunityButton label="Reintentar publicaciones" secondary onPress={() => void loadPosts()} /> : null}
            {!loading && !postLoading && !postError && !posts.length ? <Text style={[ui.body, { color: c.muted }]}>Todavía no hay publicaciones en esta comunidad.</Text> : null}
            {posts.map(post => <Pressable key={post.id} accessibilityRole="button" accessibilityLabel={`Abrir ${post.title}`} onPress={() => router.push((`/posts/${post.id}`) as Href)}><CommunityCard><Text style={[ui.muted, { color: c.heading }]}>{POST_CATEGORIES.find(item => item.value === post.type)?.label}</Text><Text style={[ui.heading, { color: c.heading }]}>{post.title}</Text><Text style={[ui.muted, { color: c.muted }]}>Por {post.user.username}</Text><Text style={[ui.body, { color: c.text }]} numberOfLines={4}>{post.description}</Text>{post.photoPath && token ? <CommunityPostPhoto path={post.photoPath} token={token} /> : null}</CommunityCard></Pressable>)}
            {cursor !== null ? <CommunityButton label="Cargar más publicaciones" secondary busy={postLoading} onPress={() => void loadPosts(cursor)} /> : null}
          </> : tab === 'members' ? <CommunityPeople communityId={communityId} role={community.role} onAccessLost={lost} onRoleChanged={lost} /> : tab === 'moderation' && community.role === 'ADMIN' ? <CommunityModeration communityId={communityId} onAccessLost={lost} /> : tab === 'expulsions' && community.role === 'ADMIN' ? <CommunityPeople communityId={communityId} role={community.role} expelled onAccessLost={lost} onRoleChanged={lost} /> : null}
          {community.role === 'ADMIN' ? <View style={ui.row}><CommunityButton label="Editar comunidad" secondary onPress={() => router.push((`/communities/${communityId}/edit`) as Href)} /><CommunityButton label="Personas expulsadas" secondary onPress={() => setTab('expulsions')} /></View> : null}
          <CommunityButton label="Salir de la comunidad" secondary destructive busy={busy} onPress={() => Alert.alert('Salir de la comunidad', 'Tus publicaciones y comentarios se conservarán para los demás integrantes.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Salir', style: 'destructive', onPress: () => void membership(false) }])} />
        </>}
      </> : null}
    </FormScrollView>
  </SafeAreaView>;
}
