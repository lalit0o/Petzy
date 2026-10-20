import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NAV_HEIGHT } from '@/components/nav';
import { useAuthContext } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { listPosts, photoSource } from '@/lib/posts-api';
import { petPhotoSource } from '@/lib/pets-api';
import { POST_CATEGORIES, type PostCategory, type PostSummary } from '@/types/post';

const filters: { value: PostCategory | null; label: string }[] = [{ value: null, label: 'Todas' }, ...POST_CATEGORIES];
const light = { background: '#DBDFD0', card: '#F8F7F0', text: '#111212', heading: '#365625', actionText: '#FFFFFF', border: '#B5AF8B', muted: '#525D48', avatar: '#DED0A5', error: '#8C3F37' };
const dark = { background: '#182213', card: '#20311C', text: '#DBDFD0', heading: '#82A87E', actionText: '#182213', border: '#525D48', muted: '#B5AF8B', avatar: '#404F4D', error: '#F0A59A' };

export default function Feed() {
  const { token } = useAuthContext();
  const router = useRouter();
  const color = useColorScheme() === 'dark' ? dark : light;
  const [category, setCategory] = useState<PostCategory | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [failedPhotos, setFailedPhotos] = useState<Record<number, boolean>>({});
  const requestId = useRef(0);

  const load = useCallback(async (next?: number) => {
    if (!token) return;
    const id = ++requestId.current;
    if (next === undefined) { setLoading(true); setPosts([]); setCursor(null); setFailedPhotos({}); }
    else setLoadingMore(true);
    setError('');
    try {
      const page = await listPosts(token, category, next);
      if (id !== requestId.current) return;
      setPosts((current) => next === undefined ? page.items : [...current, ...page.items]);
      setCursor(page.nextCursor);
    } catch (cause) {
      if (id === requestId.current) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las publicaciones.');
    } finally {
      if (id === requestId.current) { setLoading(false); setLoadingMore(false); }
    }
  }, [token, category]);

  useFocusEffect(useCallback(() => {
    let active = true;
    queueMicrotask(() => { if (active) void load(); });
    return () => { active = false; requestId.current += 1; };
  }, [load]));
  const selected = filters.find((item) => item.value === category)?.label ?? 'Todas';

  return <SafeAreaView style={[styles.screen, { backgroundColor: color.background }]} edges={['top']}>
    <FlatList
      data={posts}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={[styles.content, { paddingBottom: NAV_HEIGHT + 20 }]}
      ListHeaderComponent={<View style={styles.header}>
        <Text style={[styles.brand, { color: color.heading }]}>Petzy</Text>
        <View style={styles.headingRow}>
          <Text style={[styles.heading, { color: color.heading }]}>Inicio</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Crear publicación" style={[styles.create, { backgroundColor: color.heading }]} onPress={() => router.push('/posts/create')}>
            <Ionicons name="add" size={20} color={color.actionText} /><Text style={[styles.createText, { color: color.actionText }]}>Publicar</Text>
          </Pressable>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={'Filtrar publicaciones. Categoría actual: ' + selected} style={[styles.filter, { backgroundColor: color.card, borderColor: color.border }]} onPress={() => setFilterOpen(true)}>
          <View><Text style={[styles.caption, { color: color.muted }]}>Categoría</Text><Text style={[styles.filterText, { color: color.text }]}>{selected}</Text></View>
          <Ionicons name="chevron-down" size={20} color={color.heading} />
        </Pressable>
      </View>}
      renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={'Abrir publicación ' + item.title} style={[styles.card, { backgroundColor: color.card, borderColor: color.border }]} onPress={() => router.push(('/posts/' + item.id) as Href)}>
        <View style={styles.authorRow}>
          <View style={[styles.avatar, { backgroundColor: color.avatar }]}><Ionicons name="person-outline" size={20} color={color.heading} /></View>
          <View style={styles.authorInfo}>
            <Text style={[styles.author, { color: color.text }]}>{item.user.username}</Text>
            <Text style={[styles.category, { color: color.heading }]}>{POST_CATEGORIES.find((entry) => entry.value === item.type)?.label ?? item.type}</Text>
          </View><Ionicons name="chevron-forward" size={18} color={color.muted} />
        </View>
        <Text style={[styles.postTitle, { color: color.heading }]}>{item.title}</Text>
        <Text style={[styles.description, { color: color.text }]} numberOfLines={4}>{item.description}</Text>
        {item.pet ? <Pressable accessibilityRole="button" accessibilityLabel={`Ver ficha de ${item.pet.name}`} style={[styles.pet, { borderColor: color.border }]} onPress={(event) => { event.stopPropagation(); router.push((`/pets/${item.pet!.id}`) as Href); }}>
          {item.pet.photoUrl && token ? <Image source={petPhotoSource(item.pet.photoUrl, token)} style={styles.petPhoto} contentFit="cover" cachePolicy="none" /> : <Ionicons name="paw-outline" size={22} color={color.heading} />}
          <View><Text style={[styles.petText, { color: color.heading }]}>{item.pet.name}</Text><Text style={[styles.petAge, { color: color.text }]}>{item.pet.species} · {item.pet.isAgeApproximate ? 'aprox. ' : ''}{item.pet.age} {item.pet.age === 1 ? 'año' : 'años'}</Text></View>
          <Ionicons name="chevron-forward" size={17} color={color.heading} />
        </Pressable> : null}
        {item.photoPath && token && !failedPhotos[item.id] ? <Image source={photoSource(item.photoPath, token)} style={styles.photo} contentFit="cover" cachePolicy="none" accessibilityLabel={'Foto de ' + item.title} onError={() => setFailedPhotos((current) => ({ ...current, [item.id]: true }))} /> : null}
        {failedPhotos[item.id] ? <View style={styles.photoFailure}><Text style={[styles.photoError, { color: color.error }]}>No se pudo mostrar la foto.</Text><Pressable accessibilityRole="button" accessibilityLabel={'Reintentar foto de ' + item.title} onPress={(event) => { event.stopPropagation(); setFailedPhotos((current) => ({ ...current, [item.id]: false })); }}><Text style={[styles.retry, { color: color.heading }]}>Reintentar foto</Text></Pressable></View> : null}
      </Pressable>}
      ListEmptyComponent={loading ? <View style={styles.state}><ActivityIndicator color={color.heading} /><Text style={[styles.stateText, { color: color.text }]}>Cargando publicaciones…</Text></View> : error ? <View style={styles.state}><Text style={[styles.stateText, { color: color.error }]}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void load()}><Text style={[styles.retry, { color: color.heading }]}>Reintentar</Text></Pressable></View> : <View style={styles.state}><Ionicons name="document-text-outline" size={32} color={color.muted} /><Text style={[styles.stateText, { color: color.text }]}>Todavía no hay publicaciones en {selected.toLowerCase()}.</Text></View>}
      ListFooterComponent={posts.length ? <View style={styles.footer}>
        {error ? <Text style={[styles.stateText, { color: color.error }]}>{error}</Text> : null}
        {cursor !== null ? <Pressable accessibilityRole="button" disabled={loadingMore} style={styles.more} onPress={() => void load(cursor)}>{loadingMore ? <ActivityIndicator color={color.heading} /> : <Text style={[styles.retry, { color: color.heading }]}>{error ? 'Reintentar' : 'Cargar más'}</Text>}</Pressable> : null}
      </View> : null}
    />
    <Modal visible={filterOpen} transparent animationType="fade" onRequestClose={() => setFilterOpen(false)}><Pressable style={styles.overlay} onPress={() => setFilterOpen(false)}><View style={[styles.menu, { backgroundColor: color.card }]}>
      <Text style={[styles.menuTitle, { color: color.heading }]}>Filtrar por categoría</Text>
      {filters.map((item) => <Pressable key={item.value ?? 'ALL'} accessibilityRole="radio" accessibilityState={{ checked: category === item.value }} style={[styles.option, { borderColor: color.border }]} onPress={() => { setCategory(item.value); setFilterOpen(false); }}><Text style={[styles.optionText, { color: color.text }]}>{item.label}</Text>{category === item.value ? <Ionicons name="checkmark" size={20} color={color.heading} /> : null}</Pressable>)}
    </View></Pressable></Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { paddingHorizontal: 16, paddingTop: 12 }, header: { marginBottom: 18 },
  brand: { fontFamily: 'Nunito_700Bold', fontSize: 19, textAlign: 'center', marginBottom: 14 },
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  heading: { fontFamily: 'Nunito_700Bold', fontSize: 29, lineHeight: 36 },
  create: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, minHeight: 44, paddingHorizontal: 14, gap: 4 },
  createText: { fontFamily: 'Nunito_700Bold', fontSize: 15 },
  filter: { minHeight: 56, borderWidth: 1, borderRadius: 17, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  caption: { fontFamily: 'Nunito_600SemiBold', fontSize: 12 }, filterText: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
  card: { borderWidth: 1, borderRadius: 23, padding: 16, marginBottom: 12 },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 13 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  authorInfo: { flex: 1 }, author: { fontFamily: 'Nunito_700Bold', fontSize: 14 }, category: { fontFamily: 'Nunito_700Bold', fontSize: 12 },
  postTitle: { fontFamily: 'Nunito_700Bold', fontSize: 19, lineHeight: 25, marginBottom: 5 },
  description: { fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 23 },
  pet: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 12, borderWidth: 1, borderRadius: 13, padding: 8 },
  petPhoto: { width: 38, height: 38, borderRadius: 9 }, petText: { fontFamily: 'Nunito_700Bold', fontSize: 14 }, petAge: { fontFamily: 'Nunito_400Regular', fontSize: 13 }, photo: { marginTop: 14, width: '100%', height: 220, borderRadius: 16 },
  photoFailure: { marginTop: 12, gap: 6 }, photoError: { fontFamily: 'Nunito_600SemiBold', fontSize: 14 },
  state: { alignItems: 'center', justifyContent: 'center', paddingVertical: 70, paddingHorizontal: 20, gap: 12 },
  stateText: { fontFamily: 'Nunito_400Regular', fontSize: 16, textAlign: 'center' }, retry: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
  footer: { alignItems: 'center', gap: 10 }, more: { minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 28 },
  menu: { borderRadius: 22, padding: 18 }, menuTitle: { fontFamily: 'Nunito_700Bold', fontSize: 20, marginBottom: 8 },
  option: { minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionText: { fontFamily: 'Nunito_600SemiBold', fontSize: 16 },
});
