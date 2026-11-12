import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, type ViewInstance } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NAV_HEIGHT } from '@/components/nav';
import { AnchoredMenu, AnchoredMenuItem } from '@/components/anchored-menu';
import { EventNoticeBell } from '@/components/event-notice-bell';
import { FloatingAddButton } from '@/components/floating-add-button';
import { PostCard } from '@/components/post-card';
import { PostListSkeleton } from '@/components/skeleton';
import { useAuthContext } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { listPosts, PostApiError } from '@/lib/posts-api';
import { POST_CATEGORIES, type PostCategory, type PostSummary } from '@/types/post';
import { petzyColors } from '@/constants/petzy-theme';

const filters: { value: PostCategory | null; label: string }[] = [{ value: null, label: 'Todas' }, ...POST_CATEGORIES];

export default function Feed() {
  const { token } = useAuthContext();
  const router = useRouter();
  const palette = petzyColors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const color = { background: palette.background, card: palette.surface, text: palette.textPrimary, heading: palette.accent, actionText: palette.onAccent, border: palette.border, muted: palette.muted, avatar: palette.surfaceAlt, error: palette.error };
  const [category, setCategory] = useState<PostCategory | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterButton = useRef<ViewInstance>(null);
  const [filterAnchor, setFilterAnchor] = useState({ x: 0, y: 0, bottom: 0 });
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const loadedCategory = useRef<PostCategory | null | undefined>(undefined);

  // `silent` evita el parpadeo del esqueleto y el vacío momentáneo al
  // regresar a esta pantalla (por ejemplo, desde el detalle de una
  // publicación): se vuelve a pedir la misma página, pero solo se
  // reemplaza la lista cuando ya llegó la respuesta, sin borrarla antes.
  const load = useCallback(async function loadPage(next?: number, silent = false): Promise<void> {
    if (!token) return;
    const id = ++requestId.current;
    if (next === undefined) { if (!silent) { setLoading(true); setPosts([]); setCursor(null); } }
    else setLoadingMore(true);
    setError('');
    try {
      const page = await listPosts(token, category, next);
      if (id !== requestId.current) return;
      setPosts((current) => next === undefined ? page.items : [...current, ...page.items]);
      setCursor(page.nextCursor);
    } catch (cause) {
      if (id === requestId.current && next !== undefined && cause instanceof PostApiError && cause.status === 400) {
        await loadPage();
        return;
      }
      if (id === requestId.current) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las publicaciones.');
    } finally {
      if (id === requestId.current) { setLoading(false); setLoadingMore(false); }
    }
  }, [token, category]);

  useFocusEffect(useCallback(() => {
    let active = true;
    const silent = loadedCategory.current === category;
    loadedCategory.current = category;
    queueMicrotask(() => { if (active) void load(undefined, silent); });
    return () => { active = false; requestId.current += 1; };
  }, [load, category]));
  const selected = filters.find((item) => item.value === category)?.label ?? 'Todas';

  const changeCategory = (next: PostCategory | null) => {
    if (next === category) return;
    requestId.current += 1;
    setPosts([]); setCursor(null); setError(''); setLoading(true); setLoadingMore(false);
    setCategory(next);
  };

  return <SafeAreaView style={[styles.screen, { backgroundColor: color.background }]} edges={['top']}>
    <FlatList
      data={posts}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={[styles.content, { paddingBottom: NAV_HEIGHT + 90 }]}
      ListHeaderComponent={<View style={styles.header}>
        <Text style={[styles.brand, { color: color.heading }]}>Petzy</Text>
        <View style={styles.headingRow}>
          <Text style={[styles.heading, { color: color.heading }]}>Inicio</Text>
          <EventNoticeBell />
        </View>
        <View ref={filterButton} collapsable={false} style={styles.filterWrap}>
          <Pressable accessibilityRole="button" accessibilityLabel={'Filtrar publicaciones. Categoría actual: ' + selected} accessibilityState={{ expanded: filterOpen }} style={({ pressed }) => [styles.filter, { backgroundColor: pressed ? color.avatar : color.card, borderColor: color.border }]} onPress={() => filterButton.current?.measureInWindow((x, y, width, height) => { setFilterAnchor({ x: x + width / 2, y: y + height / 2, bottom: y + height }); setFilterOpen(true); })}>
            <Ionicons name="filter" size={18} color={color.heading} />
            <Text style={[styles.filterLabel, { color: color.muted }]}>Filtrar por: <Text style={[styles.filterText, { color: color.text }]}>{selected}</Text></Text>
          </Pressable>
        </View>
      </View>}
      renderItem={({ item }) => <PostCard post={item} token={token} />}
      ListEmptyComponent={loading ? <PostListSkeleton /> : error ? <View style={styles.state}><Text style={[styles.stateText, { color: color.error }]}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void load()}><Text style={[styles.retry, { color: color.heading }]}>Reintentar</Text></Pressable></View> : <View style={styles.state}><Ionicons name="document-text-outline" size={32} color={color.muted} /><Text style={[styles.stateText, { color: color.text }]}>Todavía no hay publicaciones en {selected.toLowerCase()}.</Text></View>}
      ListFooterComponent={posts.length ? <View style={styles.footer}>
        {error ? <Text style={[styles.stateText, { color: color.error }]}>{error}</Text> : null}
        {cursor !== null ? <Pressable accessibilityRole="button" disabled={loadingMore} style={styles.more} onPress={() => void load(cursor)}>{loadingMore ? <ActivityIndicator color={color.heading} /> : <Text style={[styles.retry, { color: color.heading }]}>{error ? 'Reintentar' : 'Cargar más'}</Text>}</Pressable> : null}
      </View> : undefined}
    />
    <AnchoredMenu visible={filterOpen} anchor={filterAnchor} width={260} estimatedHeight={420} title="Filtrar por categoría" onClose={() => setFilterOpen(false)}>
      {filters.map(item => <AnchoredMenuItem key={item.value ?? 'ALL'} label={item.label} selected={category === item.value} onPress={() => changeCategory(item.value)} />)}
      <AnchoredMenuItem label="Cancelar" separator={false} />
    </AnchoredMenu>
    <FloatingAddButton accessibilityLabel="Crear publicación" onPress={() => router.push('/posts/create')} />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { paddingHorizontal: 16, paddingTop: 12 }, header: { marginBottom: 18 },
  brand: { fontFamily: 'Nunito_700Bold_Italic', fontSize: 38, lineHeight: 50, textAlign: 'center', marginBottom: 14 },
  heading: { fontFamily: 'Nunito_700Bold', fontSize: 29, lineHeight: 36 },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  filterWrap: { alignSelf: 'flex-start', maxWidth: '100%' },
  filter: { minHeight: 44, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterLabel: { flexShrink: 1, fontFamily: 'Nunito_600SemiBold', fontSize: 14 },
  filterText: { fontFamily: 'Nunito_700Bold', fontSize: 14 },
  state: { alignItems: 'center', justifyContent: 'center', paddingVertical: 70, paddingHorizontal: 20, gap: 12 },
  stateText: { fontFamily: 'Nunito_400Regular', fontSize: 16, textAlign: 'center' }, retry: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
  footer: { alignItems: 'center', gap: 10 }, more: { minHeight: 48, justifyContent: 'center', alignItems: 'center' },
});
