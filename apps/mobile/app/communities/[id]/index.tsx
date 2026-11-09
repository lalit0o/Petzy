import { useCallback, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, type ViewInstance } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FormScrollView } from '@/components/form-scroll-view';
import { AnimatedPressable } from '@/components/animated-pressable';
import { AnchoredMenu, AnchoredMenuItem } from '@/components/anchored-menu';
import { CommunityButton, CommunityMessage, roleLabel, ui, useCommunityColors } from '@/components/community-ui';
import { CommunityModeration } from '@/components/community-moderation';
import { CommunityPeople } from '@/components/community-people';
import { PostCard } from '@/components/post-card';
import { useAuthContext } from '@/context/AuthContext';
import { CommunityApiError, communityPhotoSource, getCommunity, joinCommunity, leaveCommunity, listCommunityPosts, type Community } from '@/lib/communities-api';
import { profilePhotoSource } from '@/lib/profiles-api';
import { goBackOrReplace } from '@/lib/navigation';
import { cardShadow } from '@/constants/petzy-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { type PostSummary } from '@/types/post';
import { CommunityDetailSkeleton } from '@/components/skeleton';
import { useToast } from '@/components/toast';

type Tab = 'posts' | 'members' | 'moderation' | 'expulsions';

type IconName = ComponentProps<typeof Ionicons>['name'];

function CommunityTabs({ tab, isAdmin, onChange }: { tab: Tab; isAdmin: boolean; onChange: (next: Tab) => void }) {
  const c = useCommunityColors();
  const items: { key: Tab; label: string; icon: IconName }[] = [
    { key: 'posts', label: 'Publicaciones', icon: 'document-text-outline' },
    { key: 'members', label: 'Integrantes', icon: 'people-outline' },
    ...(isAdmin ? [
      { key: 'moderation' as Tab, label: 'Contenido retirado', icon: 'archive-outline' as IconName },
      { key: 'expulsions' as Tab, label: 'Expulsados', icon: 'person-remove-outline' as IconName },
    ] : []),
  ];
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" contentContainerStyle={tabStyles.row}>
    {items.map(item => <AnimatedPressable key={item.key} accessibilityRole="tab" accessibilityState={{ selected: tab === item.key }} onPress={() => onChange(item.key)} style={[tabStyles.pill, { borderColor: c.border }, tab === item.key && { backgroundColor: c.heading }]}>
      <Ionicons name={item.icon} size={16} color={tab === item.key ? c.actionText : c.heading} />
      <Text style={[tabStyles.label, { color: tab === item.key ? c.actionText : c.heading }]}>{item.label}</Text>
    </AnimatedPressable>)}
  </ScrollView>;
}

const tabStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  pill: { minHeight: 44, borderWidth: 1, borderRadius: 999, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  label: { fontFamily: 'Nunito_700Bold', fontSize: 14 },
});

function CommunityBanner({ community, token, overlay }: { community: Community; token: string; overlay?: ReactNode }) {
  const c = useCommunityColors(); const [failed, setFailed] = useState(false);
  return <View style={bannerStyles.wrap}>
    {community.photoPath && !failed
      ? <Image source={communityPhotoSource(community.photoPath, token)} style={bannerStyles.image} contentFit="cover" cachePolicy="memory" onError={() => setFailed(true)} accessibilityLabel={`Foto de ${community.name}`} />
      : <View style={[bannerStyles.image, bannerStyles.placeholder, { backgroundColor: c.card }]}><Ionicons name="people-outline" size={48} color={c.heading} /></View>}
    {overlay}
  </View>;
}

const bannerStyles = StyleSheet.create({
  wrap: { width: '100%', height: 200, borderRadius: 18, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  overlayRow: { position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between' },
  overlayButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
});

// Barra de "Escribe algo…" al estilo de la portada de un grupo: reemplaza
// al botón flotante "+" como entrada para crear una publicación dentro de
// la comunidad, con la foto de perfil propia para ubicarla de inmediato.
function PostComposer({ onPress, avatarUrl, token }: { onPress: () => void; avatarUrl: string | null; token: string | null }) {
  const c = useCommunityColors(); const dark = useColorScheme() === 'dark';
  const [failed, setFailed] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel="Crear publicación" style={[composerStyles.row, cardShadow(dark), { backgroundColor: c.card, borderColor: c.border }]} onPress={onPress}>
    <View style={[composerStyles.avatar, { backgroundColor: c.bg }]}>
      {avatarUrl && token && !failed
        ? <Image source={profilePhotoSource(avatarUrl, token)} style={composerStyles.avatar} contentFit="cover" cachePolicy="memory" onError={() => setFailed(true)} />
        : <Ionicons name="person-outline" size={20} color={c.heading} />}
    </View>
    <Text style={[composerStyles.placeholder, { color: c.muted }]}>Escribe algo…</Text>
    <Ionicons name="camera-outline" size={22} color={c.heading} />
  </Pressable>;
}

const composerStyles = StyleSheet.create({
  row: { minHeight: 56, borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  placeholder: { flex: 1, fontFamily: 'Nunito_600SemiBold', fontSize: 15 },
});

export default function CommunityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const communityId = Number(id);
  const { token, user } = useAuthContext(); const router = useRouter(); const c = useCommunityColors();
  const [community, setCommunity] = useState<Community | null>(null); const [posts, setPosts] = useState<PostSummary[]>([]); const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true); const [postLoading, setPostLoading] = useState(false); const [error, setError] = useState(''); const [postError, setPostError] = useState('');
  const [busy, setBusy] = useState(false); const [tab, setTab] = useState<Tab>('posts'); const toast = useToast();
  const [actionsOpen, setActionsOpen] = useState(false); const [menuAnchor, setMenuAnchor] = useState({ x: 0, y: 0, bottom: 0 });
  const requestId = useRef(0); const postRequest = useRef(0); const action = useRef(false); const menuButton = useRef<ViewInstance>(null);
  const loadedId = useRef<number | null>(null); const [lastMembership, setLastMembership] = useState<'join' | 'leave' | null>(null);
  const openMenu = () => menuButton.current?.measureInWindow((x, y, w, h) => { setMenuAnchor({ x: x + w / 2, y: y + h / 2, bottom: y + h }); setActionsOpen(true); });
  // `silent` evita el parpadeo del esqueleto y la pérdida del scroll al
  // volver a esta pantalla (por ejemplo, desde el detalle de una
  // publicación): se vuelve a pedir la comunidad y sus publicaciones, pero
  // solo se reemplaza lo que se ve cuando ya llegó la respuesta.
  const load = useCallback(async (silent = false) => {
    if (!token) return; const current = ++requestId.current; postRequest.current++;
    if (!silent) { setLoading(true); setCommunity(null); setPosts([]); setCursor(null); }
    setError(''); setPostError('');
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
  useFocusEffect(useCallback(() => {
    const silent = loadedId.current === communityId; loadedId.current = communityId;
    void load(silent);
    return () => { requestId.current++; postRequest.current++; };
  }, [load, communityId]));
  const lost = useCallback(() => { void load(); }, [load]);
  const loadPosts = async (next?: number): Promise<void> => {
    if (!token || !community?.role) return; const current = ++postRequest.current; setPostLoading(true); setPostError('');
    try { const page = await listCommunityPosts(token, communityId, next); if (current !== postRequest.current) return; setPosts(old => next === undefined ? page.items : [...old, ...page.items.filter(item => !old.some(row => row.id === item.id))]); setCursor(page.nextCursor); }
    catch (cause) { if (current !== postRequest.current) return; if (cause instanceof CommunityApiError && next !== undefined && cause.status === 400) { await loadPosts(); return; } setPostError(cause instanceof Error ? cause.message : 'No se pudieron cargar las publicaciones.'); if (cause instanceof CommunityApiError && [403, 404].includes(cause.status)) { setPosts([]); setCommunity(null); void load(); } }
    finally { if (current === postRequest.current) setPostLoading(false); }
  };
  const membership = async (join: boolean) => {
    if (!token || action.current) return; const current = requestId.current; action.current = true; setBusy(true); setError('');
    const name = community?.name; setLastMembership(join ? 'join' : 'leave');
    try {
      // El toast se muestra solo después de que el servidor confirma (D-138).
      if (join) { await joinCommunity(token, communityId); toast.show(name ? `Te uniste a ${name}` : 'Te uniste a la comunidad'); if (current !== requestId.current) return; }
      else {
        const result = await leaveCommunity(token, communityId);
        if (!result.communityDeleted) toast.show(name ? `Saliste de ${name}` : 'Saliste de la comunidad');
        if (current !== requestId.current) return;
        if (result.communityDeleted) {
          requestId.current++; postRequest.current++;
          setCommunity(null); setPosts([]); setCursor(null);
          Alert.alert('Comunidad eliminada', result.message);
          goBackOrReplace(router, '/comunidades');
          return;
        }
      }
      postRequest.current++; setPosts([]); setCursor(null); void load();
    } catch (cause) { if (current !== requestId.current) return; setError(cause instanceof Error ? cause.message : 'No se pudo cambiar tu membresía.'); if (cause instanceof CommunityApiError && [403, 404].includes(cause.status)) void load(); }
    finally { action.current = false; setBusy(false); }
  };
  const isAdmin = community?.role === 'ADMIN';
  const confirmLeave = () => Alert.alert('Salir de la comunidad', 'Si eres su único integrante y administrador, la comunidad, publicaciones, comentarios y fotos se eliminarán definitivamente. Las cuentas desactivadas también cuentan como integrantes. Si hay otros integrantes, tu contenido se conserva y debes dejar otro administrador activo.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Salir', style: 'destructive', onPress: () => void membership(false) }]);
  return <SafeAreaView style={[ui.screen, { backgroundColor: c.bg }]} edges={['top', 'bottom']}>
    {loading || (!community && !loading) ? <Pressable accessibilityRole="button" accessibilityLabel="Volver a comunidades" style={ui.back} onPress={() => goBackOrReplace(router, '/comunidades')}><Ionicons name="arrow-back" size={24} color={c.heading} /><Text style={[ui.label, { color: c.heading }]}>Volver</Text></Pressable> : null}
    {loading ? <View style={ui.content}><CommunityDetailSkeleton /></View> : null}
    {!community && !loading ? <View style={ui.content}><CommunityMessage text={postError} error /><CommunityButton label="Reintentar comunidad" secondary onPress={() => void load()} /></View> : null}
    {community && token && !community.role && !loading ? <FormScrollView contentContainerStyle={ui.content}>
      <CommunityMessage text={error} error />{error && lastMembership === 'join' ? <CommunityButton label="Reintentar unirme" secondary busy={busy} onPress={() => void membership(true)} /> : null}
      <CommunityBanner community={community} token={token} overlay={
        <View style={bannerStyles.overlayRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Volver a comunidades" style={bannerStyles.overlayButton} onPress={() => goBackOrReplace(router, '/comunidades')}><Ionicons name="arrow-back" size={22} color="#FFFFFF" /></Pressable>
        </View>
      } />
      <Text style={[ui.title, { color: c.heading }]}>{community.name}</Text>
      <Text style={[ui.body, { color: c.text }]}>{community.description}</Text>
      <Text style={[ui.muted, { color: c.muted }]}>{community.memberCount} {community.memberCount === 1 ? 'integrante' : 'integrantes'}</Text>
      <CommunityButton label="Unirme a la comunidad" busy={busy} onPress={() => void membership(true)} />
    </FormScrollView> : null}
    {community && token && community.role && !loading ? <>
      <View style={[ui.content, headerStyles.fixed]}>
        <CommunityMessage text={busy ? 'Actualizando tu membresía…' : ''} /><CommunityMessage text={error} error />{error && lastMembership === 'leave' ? <CommunityButton label="Reintentar salir" secondary busy={busy} onPress={() => void membership(false)} /> : null}
        <CommunityBanner community={community} token={token} overlay={
          <View style={bannerStyles.overlayRow}>
            <Pressable accessibilityRole="button" accessibilityLabel="Volver a comunidades" style={bannerStyles.overlayButton} onPress={() => goBackOrReplace(router, '/comunidades')}><Ionicons name="arrow-back" size={22} color="#FFFFFF" /></Pressable>
            <View ref={menuButton} collapsable={false}>
              <Pressable accessibilityRole="button" accessibilityLabel="Opciones de la comunidad" accessibilityState={{ expanded: actionsOpen }} style={bannerStyles.overlayButton} onPress={openMenu}><Ionicons name="ellipsis-horizontal" size={22} color="#FFFFFF" /></Pressable>
            </View>
          </View>
        } />
        <Text style={[ui.title, { color: c.heading }]}>{community.name}</Text>
        <Text style={[ui.body, { color: c.text }]}>{community.description}</Text>
        <Text style={[ui.muted, { color: c.muted }]}>{community.memberCount} {community.memberCount === 1 ? 'integrante' : 'integrantes'} · {roleLabel[community.role]}</Text>
        <CommunityTabs tab={tab} isAdmin={isAdmin} onChange={setTab} />
      </View>
      {(() => {
        const content = <>
          {tab === 'posts' ? <>
            <PostComposer token={token} avatarUrl={user?.avatarUrl ?? null} onPress={() => router.push((`/communities/${communityId}/posts/create`) as Href)} />
            <CommunityMessage text={postError} error />{postError ? <CommunityButton label="Reintentar publicaciones" secondary onPress={() => void loadPosts()} /> : null}
            {!loading && !postLoading && !postError && !posts.length ? <Text style={[ui.body, { color: c.muted }]}>Todavía no hay publicaciones en esta comunidad.</Text> : null}
            {posts.map(post => <PostCard key={post.id} post={post} token={token} />)}
            {cursor !== null ? <CommunityButton label="Cargar más publicaciones" secondary busy={postLoading} onPress={() => void loadPosts(cursor)} /> : null}
          </> : tab === 'members' ? <CommunityPeople communityId={communityId} role={community.role} onAccessLost={lost} onRoleChanged={lost} /> : tab === 'moderation' && isAdmin ? <CommunityModeration communityId={communityId} onAccessLost={lost} /> : tab === 'expulsions' && isAdmin ? <CommunityPeople communityId={communityId} role={community.role} expelled onAccessLost={lost} onRoleChanged={lost} /> : null}
        </>;
        // Publicaciones sin resultados no necesita desplazarse: evita el
        // rebote de un ScrollView vacío. Las demás pestañas siempre se
        // desplazan porque sus propios componentes manejan su lista.
        const scrollable = tab !== 'posts' || posts.length > 0;
        return scrollable
          ? <FormScrollView contentContainerStyle={[ui.content, headerStyles.scroll]}>{content}</FormScrollView>
          : <View style={[headerStyles.flex, ui.content, headerStyles.scroll]}>{content}</View>;
      })()}
      <AnchoredMenu visible={actionsOpen} anchor={menuAnchor} onClose={() => setActionsOpen(false)}>
        {isAdmin ? <AnchoredMenuItem label="Editar comunidad" icon="create-outline" onPress={() => router.push((`/communities/${communityId}/edit`) as Href)} /> : null}
        <AnchoredMenuItem label="Salir de la comunidad" icon="exit-outline" destructive onPress={confirmLeave} />
        <AnchoredMenuItem label="Cancelar" separator={false} />
      </AnchoredMenu>
    </> : null}
  </SafeAreaView>;
}

const headerStyles = StyleSheet.create({
  fixed: { paddingBottom: 14 },
  scroll: { paddingTop: 14 },
  flex: { flex: 1 },
});
