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
import { CommunityApiError, getCommunity, removeCommunityPost, type CommunityRole } from '@/lib/communities-api';
import { POST_CATEGORIES, type PostSummary } from '@/types/post';
import { PostInteractions, PostLikeButton } from '@/components/post-interactions';
import { AnchoredMenu, AnchoredMenuItem } from '@/components/anchored-menu';
import { PostViewSkeleton } from '@/components/skeleton';
import { RemovalReasonModal } from '@/components/removal-reason-modal';
import { useToast } from '@/components/toast';
import type { RemovalPayload } from '@/lib/removal-reasons';
import { cardShadow, petzyColors, radius, spacing } from '@/constants/petzy-theme';

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
  const [moderating, setModerating] = useState(false);
  const toast = useToast();
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
      const removal = removePost(token, post.id);
      // goBackOrReplace en vez de router.replace: si la comunidad o el feed ya
      // están debajo en la pila, un "replace" al mismo destino no siempre
      // dispara un nuevo foco y esa pantalla se queda con la lista vieja
      // hasta salir y volver a entrar. Un "back" real sí refresca siempre.
      void removal.then(() => goBackOrReplace(router, post.communityId !== null ? (`/communities/${post.communityId}`) as Href : '/')).catch((cause) => { setError(cause instanceof Error ? cause.message : 'No se pudo retirar la publicación.'); refreshRole(); }).finally(() => setRemoving(false));
    } },
  ]);

  // Retirada por moderación de una publicación ajena: pide motivo (D-140).
  const moderatesOther = Boolean(post && post.communityId !== null && post.userId !== user?.id);
  const removeByModeration = async (payload: RemovalPayload) => {
    if (!token || !post || post.communityId === null) return;
    try { await removeCommunityPost(token, post.communityId, post.id, payload); }
    catch (cause) {
      if (cause instanceof CommunityApiError && [403, 404].includes(cause.status)) { setModerating(false); refreshRole(); }
      throw cause;
    }
    setModerating(false);
    toast.show('Publicación retirada');
    goBackOrReplace(router, (`/communities/${post.communityId}`) as Href);
  };

  return <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
    <View style={[styles.fixedHeader, { borderColor: colors.border }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Volver" style={styles.back} onPress={() => goBackOrReplace(router, post?.communityId != null ? (`/communities/${post.communityId}`) as Href : '/')}><Ionicons name="arrow-back" size={24} color={colors.title} /><Text style={[styles.backText, { color: colors.title }]}>Volver</Text></Pressable>
    </View>
    <FormScrollView style={styles.scroll} contentContainerStyle={styles.content}>
    {loading ? <PostViewSkeleton /> : error && !post ? <View style={styles.state}><Ionicons name="cloud-offline-outline" size={36} color={colors.error} /><Text style={[styles.stateText, { color: colors.error }]}>{error}</Text><Pressable accessibilityRole="button" accessibilityLabel="Reintentar abrir la publicación" style={styles.retryButton} onPress={() => void load()}><Text style={[styles.link, { color: colors.title }]}>Reintentar</Text></Pressable></View> : post ? <>
    {/* Mismo orden que la tarjeta del feed (22-11-2026): autor, foto, título, texto, mascota y «Me gusta». */}
    <View style={[styles.card, cardShadow(dark), { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Sin botón «…» la cápsula necesita el mismo margen derecho que el izquierdo. */}
      <View style={[styles.authorRow, !(post.userId === user?.id || communityRole === 'ADMIN' || communityRole === 'MODERATOR') && { paddingRight: spacing.lg }]}>
        <View style={[styles.avatar, { backgroundColor: palette.surfaceAlt }]}>
          {post.user.hasAvatar && token && !avatarFailed
            ? <Image source={profilePhotoSource(`/users/${post.user.id}/avatar`, token)} style={styles.avatar} contentFit="cover" cachePolicy="memory" onError={() => setAvatarFailed(true)} accessibilityLabel={`Foto de ${post.user.username}`} />
            : <Ionicons name="person-outline" size={20} color={colors.title} />}
        </View>
        <View style={styles.authorInfo}>
          <Text numberOfLines={1} style={[styles.author, { color: colors.text }]}>{post.user.username}</Text>
          <Text numberOfLines={1} style={[styles.meta, { color: palette.muted }]}>{formatRelativeTime(post.createdAt)}</Text>
        </View>
        <View style={[styles.category, { backgroundColor: palette.surfaceAlt }]}>
          <Text numberOfLines={1} style={[styles.categoryText, { color: colors.text }]}>{POST_CATEGORIES.find((item) => item.value === post.type)?.label ?? post.type}</Text>
        </View>
        {post.userId === user?.id || communityRole === 'ADMIN' || communityRole === 'MODERATOR' ? <View ref={menuButton} collapsable={false}>
          <Pressable accessibilityRole="button" accessibilityLabel={removing ? 'Retirando publicación' : 'Opciones de la publicación'} accessibilityState={{ expanded: actionsOpen, disabled: removing, busy: removing }} disabled={removing} style={styles.menuButton} onPress={() => menuButton.current?.measureInWindow((x, y, buttonWidth, buttonHeight) => { setMenuAnchor({ x: x + buttonWidth / 2, y: y + buttonHeight / 2, bottom: y + buttonHeight }); setActionsOpen(true); })}>
            {removing ? <ActivityIndicator color={colors.title} /> : <Ionicons name="ellipsis-horizontal" size={24} color={colors.title} />}
          </Pressable>
        </View> : null}
      </View>
      {removing ? <Text accessibilityLiveRegion="polite" style={[styles.status, { color: colors.text }]}>Retirando publicación…</Text> : null}
      {error ? <Text accessibilityRole="alert" style={[styles.status, { color: colors.error }]}>{error}</Text> : null}
      {/* Foto 4:3 a todo el ancho, como en el feed: no recorta de más y conserva su espacio si falla. */}
      {post.photoPath && token ? <View style={[styles.photoFrame, { backgroundColor: palette.surfaceAlt }]}>
        {!photoError ? <Image source={photoSource(post.photoPath, token)} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory" transition={150} accessibilityLabel={'Foto de ' + post.title} onError={() => setPhotoError(true)} />
          : <View style={styles.photoFailure}>
              <Ionicons name="image-outline" size={28} color={palette.muted} />
              <Text style={[styles.photoErrorText, { color: colors.error }]}>No se pudo mostrar la foto.</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={'Reintentar foto de ' + post.title} onPress={() => setPhotoError(false)} style={styles.action}><Text style={[styles.link, { color: colors.title }]}>Reintentar foto</Text></Pressable>
            </View>}
      </View> : null}
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.title }]}>{post.title}</Text>
        <Text style={[styles.description, { color: colors.text }]}>{post.description}</Text>
        {post.pet ? <Pressable accessibilityRole="button" accessibilityLabel={`Ver ficha de ${post.pet.name}`} style={({ pressed }) => [styles.pet, { backgroundColor: pressed ? palette.surfaceAlt : 'transparent' }]} onPress={() => router.push((`/pets/${post.pet!.id}`) as Href)}>
          <View style={[styles.petPhoto, { backgroundColor: palette.surfaceAlt }]}>
            {post.pet.photoUrl && token ? <Image source={petPhotoSource(post.pet.photoUrl, token)} style={styles.petPhoto} contentFit="cover" cachePolicy="memory" /> : <Ionicons name="paw" size={20} color={colors.title} />}
          </View>
          <View style={styles.petInfo}><Text numberOfLines={1} style={[styles.petName, { color: colors.title }]}>{post.pet.name}</Text><Text numberOfLines={1} style={[styles.petAge, { color: palette.muted }]}>{post.pet.species} · {post.pet.isAgeApproximate ? 'aprox. ' : ''}{post.pet.age} {post.pet.age === 1 ? 'año' : 'años'}</Text></View>
          <Ionicons name="chevron-forward" size={18} color={palette.muted} />
        </Pressable> : null}
        <PostLikeButton post={post} onPostUnavailable={unavailable} />
      </View>
    </View>
    <PostInteractions post={post} communityRole={communityRole} onPostUnavailable={unavailable} onPermissionsChanged={refreshRole} />
    </> : null}
  </FormScrollView>
    <AnchoredMenu visible={actionsOpen && Boolean(post && (post.userId === user?.id || communityRole === 'ADMIN' || communityRole === 'MODERATOR'))} anchor={menuAnchor} onClose={() => setActionsOpen(false)}>
      {post?.userId === user?.id ? <AnchoredMenuItem label="Editar" icon="create-outline" onPress={() => { if (!post || removing) return; router.push({ pathname: '/posts/[id]/edit', params: { id: String(post.id) } }); }} /> : null}
      <AnchoredMenuItem label={post?.userId === user?.id ? 'Retirar' : 'Retirar por moderación'} icon="trash-outline" destructive onPress={moderatesOther ? () => setModerating(true) : confirmRemove} />
      <AnchoredMenuItem label="Cancelar" separator={false} />
    </AnchoredMenu>
    {moderating ? <RemovalReasonModal kind="post" onConfirm={removeByModeration} onClose={() => setModerating(false)} /> : null}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, scroll: { flex: 1 }, content: { padding: 16, paddingBottom: 40 },
  fixedHeader: { paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  back: { minHeight: 44, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8 },
  backText: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
  state: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 20, gap: 12 },
  stateText: { fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 24, textAlign: 'center' },
  retryButton: { minHeight: 48, minWidth: 120, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  card: { borderWidth: 1, borderRadius: 23, overflow: 'hidden' },
  authorRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: spacing.lg, paddingRight: spacing.sm, paddingTop: 12, paddingBottom: spacing.md, gap: spacing.sm },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  authorInfo: { flex: 1 },
  author: { fontFamily: 'Nunito_700Bold', fontSize: 15 },
  meta: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, marginTop: 1 },
  category: { flexShrink: 0, maxWidth: '38%', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  categoryText: { fontFamily: 'Nunito_700Bold', fontSize: 12, lineHeight: 16 },
  menuButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  status: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, lineHeight: 20, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  photoFrame: { width: '100%', aspectRatio: 4 / 3, alignItems: 'center', justifyContent: 'center' },
  photoFailure: { alignItems: 'center', gap: 6, padding: spacing.lg },
  photoErrorText: { fontFamily: 'Nunito_600SemiBold', fontSize: 14 },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.lg },
  title: { fontFamily: 'Nunito_700Bold', fontSize: 24, lineHeight: 30, letterSpacing: -0.2 },
  description: { fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 24, marginTop: spacing.sm },
  pet: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg, minHeight: 56, borderRadius: radius.md, marginHorizontal: -spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  petPhoto: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  petInfo: { flex: 1 },
  petName: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
  petAge: { fontFamily: 'Nunito_600SemiBold', fontSize: 14 },
  action: { minHeight: 44, justifyContent: 'center' },
  link: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
});
