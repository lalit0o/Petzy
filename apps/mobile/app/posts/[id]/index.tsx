import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
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
import { getCommunity, removeCommunityPost, type CommunityRole } from '@/lib/communities-api';
import { POST_CATEGORIES, type PostSummary } from '@/types/post';
import { PostInteractions } from '@/components/post-interactions';
import { AnchoredMenu, AnchoredMenuItem } from '@/components/anchored-menu';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user } = useAuthContext();
  const router = useRouter();
  const menuButton = useRef<View>(null);
  const requestId = useRef(0);
  const dark = useColorScheme() === 'dark';
  const colors = dark ? { bg: '#182213', card: '#20311C', title: '#82A87E', text: '#DBDFD0', error: '#F0A59A', border: '#525D48' } : { bg: '#DBDFD0', card: '#F8F7F0', title: '#365625', text: '#111212', error: '#8C3F37', border: '#B5AF8B' };
  const [post, setPost] = useState<PostSummary | null>(null);
  const [communityRole, setCommunityRole] = useState<CommunityRole | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState({ x: 0, y: 0, bottom: 0 });
  const unavailable = useCallback(() => { setActionsOpen(false); setPost(null); setError('La publicación ya no está disponible.'); }, []);

  const load = useCallback(async () => {
    if (!token || !id) return;
    const currentRequest = ++requestId.current;
    setLoading(true); setActionsOpen(false); setPost(null); setCommunityRole(null); setError(''); setPhotoError(false);
    try {
      const found = await getPost(token, Number(id));
      const role = found.communityId !== null ? (await getCommunity(token, found.communityId)).role : null;
      if (currentRequest === requestId.current) { setPost(found); setCommunityRole(role); }
    }
    catch (cause) { if (currentRequest === requestId.current) setError(cause instanceof Error ? cause.message : 'No se pudo abrir la publicación.'); }
    finally { if (currentRequest === requestId.current) setLoading(false); }
  }, [token, id]);
  useFocusEffect(useCallback(() => { void load(); return () => { requestId.current += 1; }; }, [load]));

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
      void removal.then(() => router.replace(post.communityId !== null ? (`/communities/${post.communityId}`) as Href : '/')).catch((cause) => { setError(cause instanceof Error ? cause.message : 'No se pudo retirar la publicación.'); refreshRole(); }).finally(() => setRemoving(false));
    } },
  ]);

  return <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
    <View style={[styles.fixedHeader, { borderColor: colors.border }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Volver" style={styles.back} onPress={() => goBackOrReplace(router, post?.communityId != null ? (`/communities/${post.communityId}`) as Href : '/')}><Ionicons name="arrow-back" size={24} color={colors.title} /><Text style={[styles.backText, { color: colors.title }]}>Volver</Text></Pressable>
    </View>
    <FormScrollView style={styles.scroll} contentContainerStyle={styles.content}>
    {loading ? <View style={styles.state}><ActivityIndicator color={colors.title} /><Text style={[styles.body, { color: colors.text }]}>Cargando publicación…</Text></View> : error && !post ? <View style={styles.state}><Text style={[styles.body, { color: colors.error }]}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void load()}><Text style={[styles.link, { color: colors.title }]}>Reintentar</Text></Pressable></View> : post ? <View style={[styles.card, { backgroundColor: colors.card }]}>
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
      <Text style={[styles.author, { color: colors.text }]}>Por {post.user.username}</Text>
      <Text style={[styles.body, { color: colors.text }]}>{post.description}</Text>
      {post.pet ? <Pressable accessibilityRole="button" accessibilityLabel={`Ver ficha de ${post.pet.name}`} style={styles.pet} onPress={() => router.push((`/pets/${post.pet!.id}`) as Href)}>
        {post.pet.photoUrl && token ? <Image source={petPhotoSource(post.pet.photoUrl, token)} style={styles.petPhoto} contentFit="cover" cachePolicy="none" /> : <Ionicons name="paw-outline" size={24} color={colors.title} />}
        <View><Text style={[styles.petName, { color: colors.title }]}>{post.pet.name}</Text><Text style={[styles.petAge, { color: colors.text }]}>{post.pet.species} · {post.pet.isAgeApproximate ? 'aprox. ' : ''}{post.pet.age} {post.pet.age === 1 ? 'año' : 'años'}</Text></View>
        <Ionicons name="chevron-forward" size={18} color={colors.title} />
      </Pressable> : null}
      {post.photoPath && token && !photoError ? <Image source={photoSource(post.photoPath, token)} style={styles.photo} contentFit="cover" cachePolicy="none" accessibilityLabel={'Foto de ' + post.title} onError={() => setPhotoError(true)} /> : null}
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
  author: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, marginTop: 8 },
  body: { fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 24, marginTop: 14 },
  pet: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, minHeight: 50 },
  petPhoto: { width: 46, height: 46, borderRadius: 10 },
  petName: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
  petAge: { fontFamily: 'Nunito_400Regular', fontSize: 14 },
  photo: { width: '100%', height: 250, borderRadius: 16, marginTop: 16 },
  action: { minHeight: 46, justifyContent: 'center' },
  link: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
});
