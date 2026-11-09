import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View, type ViewInstance } from 'react-native';
import { FormScrollView } from '@/components/form-scroll-view';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthContext } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { goBackOrReplace } from '@/lib/navigation';
import { getPost, photoSource, removePost } from '@/lib/posts-api';
import { petPhotoSource } from '@/lib/pets-api';
import { profilePhotoSource } from '@/lib/profiles-api';
import { formatRelativeTime } from '@/lib/format';
import { getCommunity, removeCommunityPost, type CommunityRole } from '@/lib/communities-api';
import { POST_CATEGORIES, type PostSummary } from '@/types/post';
import { PostInteractions } from '@/components/post-interactions';
import { AnchoredMenu, AnchoredMenuItem } from '@/components/anchored-menu';
import { PostDetailSkeleton } from '@/components/skeleton';
import { petzyColors } from '@/constants/petzy-theme';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user } = useAuthContext();
  const router = useRouter();
  const menuButton = useRef<ViewInstance>(null);
  const requestId = useRef(0);
  const loadedId = useRef<string | undefined>(undefined);
  const dark = useColorScheme() === 'dark';
  const palette = petzyColors[dark ? 'dark' : 'light'];
  const colors = { bg: palette.background, card: palette.surface, title: palette.accent, text: palette.textPrimary, error: palette.error, border: palette.border };
  const [post, setPost] = useState<PostSummary | null>(null);
  const [communityRole, setCommunityRole] = useState<CommunityRole | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState({ x: 0, y: 0, bottom: 0 });
  const unavailable = useCallback(() => { setActionsOpen(false); setPost(null); setError('La publicación ya no está disponible.'); }, []);

  // `silent` evita el parpadeo del esqueleto al volver a esta publicación
  // (por ejemplo, desde una ficha de mascota o un perfil enlazados).
  const load = useCallback(async (silent = false) => {
    if (!token || !id) return;
    const currentRequest = ++requestId.current;
    if (!silent) { setLoading(true); setPost(null); setCommunityRole(null); setPhotoError(false); setAvatarFailed(false); }
    setActionsOpen(false); setError('');
    try {
      const found = await getPost(token, Number(id));
      const role = found.communityId !== null ? (await getCommunity(token, found.communityId)).role : null;
      if (currentRequest === requestId.current) { setPost(found); setCommunityRole(role); }
    }
    catch (cause) { if (currentRequest === requestId.current) setError(cause instanceof Error ? cause.message : 'No se pudo abrir la publicación.'); }
    finally { if (currentRequest === requestId.current) setLoading(false); }
  }, [token, id]);
  useFocusEffect(useCallback(() => {
    const silent = loadedId.current === id; loadedId.current = id;
    void load(silent);
    return () => { requestId.current += 1; };
  }, [load, id]));

  const refreshRole = useCallback(() => {
    if (!token || post?.communityId == null) return;
    const currentRequest = requestId.current;
    void getCommunity(token, post.communityId).then(found => {
      if (currentRequest !== requestId.current) return;
      setCommunityRole(found.role); setActionsOpen(false);
      if (!found.role) unavailable();
    }).catch(() => { if (currentRequest === requestId.current) unavailable(); });
  }, [token, post, unavailable]);

  const confirmRemove = () => Alert.alert('Retirar publicación', 'Dejará de mostrarse, pero sus datos se conservarán.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Retirar', style: 'destructive', onPress: () => {
      if (!token || !post || removing) return;
      setActionsOpen(false);
      setRemoving(true); setError('');
      const removal = post.userId !== user?.id && post.communityId !== null ? removeCommunityPost(token, post.communityId, post.id) : removePost(token, post.id);
      // goBackOrReplace en vez de router.replace: si la comunidad o el feed ya
      // están debajo en la pila, un "replace" al mismo destino no siempre
      // dispara un nuevo foco y esa pantalla se queda con la lista vieja
      // hasta salir y volver a entrar. Un "back" real sí refresca siempre.
      void removal.then(() => goBackOrReplace(router, post.communityId !== null ? (`/communities/${post.communityId}`) as Href : '/')).catch((cause) => { setError(cause instanceof Error ? cause.message : 'No se pudo retirar la publicación.'); refreshRole(); }).finally(() => setRemoving(false));
    } },
  ]);

  return <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
    <View style={[styles.fixedHeader, { borderColor: colors.border }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Volver" style={styles.back} onPress={() => goBackOrReplace(router, post?.communityId != null ? (`/communities/${post.communityId}`) as Href : '/')}><Ionicons name="arrow-back" size={24} color={colors.title} /><Text style={[styles.backText, { color: colors.title }]}>Volver</Text></Pressable>
    </View>
    <FormScrollView style={styles.scroll} contentContainerStyle={styles.content}>
    {loading ? <PostDetailSkeleton /> : error && !post ? <View style={styles.state}><Text style={[styles.body, { color: colors.error }]}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void load()}><Text style={[styles.link, { color: colors.title }]}>Reintentar</Text></Pressable></View> : post ? <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.category, { color: colors.title }]}>{POST_CATEGORIES.find((item) => item.value === post.type)?.label ?? post.type}</Text>
        {post.userId === user?.id || communityRole === 'ADMIN' || communityRole === 'MODERATOR' ? <View ref={menuButton} collapsable={false}>
          <Pressable accessibilityRole="button" accessibilityLabel={removing ? 'Retirando publicación' : 'Opciones de la publicación'} accessibilityState={{ expanded: actionsOpen, disabled: removing, busy: removing }} disabled={removing} style={styles.menuButton} onPress={() => menuButton.current?.measureInWindow((x, y, buttonWidth, buttonHeight) => { setMenuAnchor({ x: x + buttonWidth / 2, y: y + buttonHeight / 2, bottom: y + buttonHeight }); setActionsOpen(true); })}>
            {removing ? <ActivityIndicator color={colors.title} /> : <Ionicons name="ellipsis-horizontal" size={24} color={colors.title} />}
          </Pressable>
        </View> : null}
      </View>
      {removing ? <Text accessibilityLiveRegion="polite" style={[styles.author, { color: colors.text }]}>Retirando publicación…</Text> : null}
      {error ? <Text accessibilityRole="alert" style={[styles.body, { color: colors.error }]}>{error}</Text> : null}
      <Text style={[styles.title, { color: colors.title }]}>{post.title}</Text>
      <View style={styles.authorRow}>
        <View style={[styles.avatar, { backgroundColor: colors.border }]}>
          {post.user.hasAvatar && token && !avatarFailed
            ? <Image source={profilePhotoSource(`/users/${post.user.id}/avatar`, token)} style={styles.avatar} contentFit="cover" cachePolicy="memory" onError={() => setAvatarFailed(true)} accessibilityLabel={`Foto de ${post.user.username}`} />
            : <Ionicons name="person-outline" size={16} color={colors.title} />}
        </View>
        <Text style={[styles.author, { color: colors.text }]}>{post.user.username} · {formatRelativeTime(post.createdAt)}</Text>
      </View>
      <Text style={[styles.body, { color: colors.text }]}>{post.description}</Text>
      {post.pet ? <Pressable accessibilityRole="button" accessibilityLabel={`Ver ficha de ${post.pet.name}`} style={styles.pet} onPress={() => router.push((`/pets/${post.pet!.id}`) as Href)}>
        {post.pet.photoUrl && token ? <Image source={petPhotoSource(post.pet.photoUrl, token)} style={styles.petPhoto} contentFit="cover" cachePolicy="memory" /> : <Ionicons name="paw-outline" size={24} color={colors.title} />}
        <View><Text style={[styles.petName, { color: colors.title }]}>{post.pet.name}</Text><Text style={[styles.petAge, { color: colors.text }]}>{post.pet.species} · {post.pet.isAgeApproximate ? 'aprox. ' : ''}{post.pet.age} {post.pet.age === 1 ? 'año' : 'años'}</Text></View>
        <Ionicons name="chevron-forward" size={18} color={colors.title} />
      </Pressable> : null}
      {post.photoPath && token && !photoError ? <Image source={photoSource(post.photoPath, token)} style={styles.photo} contentFit="cover" cachePolicy="memory" accessibilityLabel={'Foto de ' + post.title} onError={() => setPhotoError(true)} /> : null}
      {photoError ? <View><Text style={[styles.body, { color: colors.error }]}>No se pudo mostrar la foto.</Text><Pressable accessibilityRole="button" onPress={() => setPhotoError(false)} style={styles.action}><Text style={[styles.link, { color: colors.title }]}>Reintentar foto</Text></Pressable></View> : null}
      <PostInteractions post={post} communityRole={communityRole} onPostUnavailable={unavailable} onPermissionsChanged={refreshRole} />
    </View> : null}
  </FormScrollView>
    <AnchoredMenu visible={actionsOpen && Boolean(post && (post.userId === user?.id || communityRole === 'ADMIN' || communityRole === 'MODERATOR'))} anchor={menuAnchor} onClose={() => setActionsOpen(false)}>
      {post?.userId === user?.id ? <AnchoredMenuItem label="Editar" icon="create-outline" onPress={() => { if (!post || removing) return; router.push({ pathname: '/posts/[id]/edit', params: { id: String(post.id) } }); }} /> : null}
      <AnchoredMenuItem label={post?.userId === user?.id ? 'Retirar' : 'Retirar por moderación'} icon="trash-outline" destructive onPress={confirmRemove} />
      <AnchoredMenuItem label="Cancelar" separator={false} />
    </AnchoredMenu>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, scroll: { flex: 1 }, content: { padding: 16, paddingBottom: 40 },
  fixedHeader: { paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  back: { minHeight: 44, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8 },
  backText: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
  state: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 },
  card: { borderRadius: 24, padding: 18 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  category: { flex: 1, fontFamily: 'Nunito_700Bold', fontSize: 14 },
  menuButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Nunito_700Bold', fontSize: 25, lineHeight: 32, marginTop: 7 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  author: { fontFamily: 'Nunito_600SemiBold', fontSize: 14 },
  body: { fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 24, marginTop: 14 },
  pet: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, minHeight: 50 },
  petPhoto: { width: 46, height: 46, borderRadius: 10 },
  petName: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
  petAge: { fontFamily: 'Nunito_400Regular', fontSize: 14 },
  photo: { width: '100%', height: 250, borderRadius: 16, marginTop: 16 },
  action: { minHeight: 46, justifyContent: 'center' },
  link: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
});
