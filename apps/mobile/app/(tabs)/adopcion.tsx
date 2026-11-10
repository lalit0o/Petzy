import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AdoptionCard } from '@/components/adoption-card';
import { AnimatedPressable } from '@/components/animated-pressable';
import { FloatingAddButton } from '@/components/floating-add-button';
import { NAV_HEIGHT } from '@/components/nav';
import { AdoptionListSkeleton } from '@/components/skeleton';
import { petzyColors, spacing } from '@/constants/petzy-theme';
import { useAuthContext } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AdoptionApiError, listAdoptions, type Adoption, type AdoptionStatus } from '@/lib/adoptions-api';

const FILTERS: { value: AdoptionStatus | null; label: string }[] = [
  { value: null, label: 'Todos' }, { value: 'SEEKING_HOME', label: 'Busca hogar' }, { value: 'FOUND_HOME', label: 'Encontró hogar' },
];

// Pestaña «Adopción» (AD-T12, D-155). Sin filtro se ven primero los que buscan
// hogar y después los que ya lo encontraron; los retirados no aparecen.
export default function AdoptionScreen() {
  const { token } = useAuthContext(); const router = useRouter();
  const c = petzyColors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const [filter, setFilter] = useState<AdoptionStatus | null>(null);
  const [items, setItems] = useState<Adoption[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0); const loadedFilter = useRef<AdoptionStatus | null | undefined>(undefined);

  // `silent` refresca al volver sin vaciar la lista ni mostrar el esqueleto.
  const load = useCallback(async (silent = false) => {
    if (!token) return; const current = ++requestId.current;
    if (!silent) { setLoading(true); setItems([]); setCursor(null); }
    setError('');
    try {
      const page = await listAdoptions(token, filter);
      if (current !== requestId.current) return;
      setItems(page.items); setCursor(page.nextCursor);
    } catch (cause) {
      if (current === requestId.current) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las adopciones.');
    } finally { if (current === requestId.current) setLoading(false); }
  }, [token, filter]);

  useFocusEffect(useCallback(() => {
    const silent = loadedFilter.current === filter; loadedFilter.current = filter;
    queueMicrotask(() => void load(silent));
    return () => { requestId.current++; };
  }, [load, filter]));

  const loadMore = async () => {
    if (!token || !cursor || loadingMore) return;
    const current = requestId.current; setLoadingMore(true); setError('');
    try {
      const page = await listAdoptions(token, filter, cursor);
      if (current !== requestId.current) return;
      setItems(old => [...old, ...page.items.filter(item => !old.some(row => row.id === item.id))]); setCursor(page.nextCursor);
    } catch (cause) {
      if (current !== requestId.current) return;
      // Un cursor viejo (la lista cambió mucho) se resuelve cargando de nuevo.
      if (cause instanceof AdoptionApiError && cause.status === 400) { void load(); return; }
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar más adopciones.');
    } finally { setLoadingMore(false); }
  };

  const changeFilter = (next: AdoptionStatus | null) => {
    if (next === filter) return;
    requestId.current++; setItems([]); setCursor(null); setError(''); setLoading(true); setFilter(next);
  };

  const emptyText = filter === 'FOUND_HOME' ? 'Todavía no hay animales que hayan encontrado hogar.' : 'Todavía no hay animales buscando hogar.';
  return <SafeAreaView style={[styles.screen, { backgroundColor: c.background }]} edges={['top']}>
    <FlatList
      data={items}
      keyExtractor={item => String(item.id)}
      contentContainerStyle={[styles.content, { paddingBottom: NAV_HEIGHT + 90 }]}
      ListHeaderComponent={<View style={styles.header}>
        <Text accessibilityRole="header" style={[styles.title, { color: c.accent }]}>Adopción</Text>
        <Text style={[styles.help, { color: c.muted }]}>Animales que buscan un hogar. Solo adopciones, no ventas.</Text>
        <View accessibilityRole="tablist" style={[styles.tabs, { borderColor: c.border }]}>
          {FILTERS.map(item => <AnimatedPressable key={item.label} accessibilityRole="tab" accessibilityState={{ selected: filter === item.value }} onPress={() => changeFilter(item.value)} style={[styles.tab, filter === item.value && { backgroundColor: c.accent }]}>
            <Text numberOfLines={1} style={[styles.tabText, { color: filter === item.value ? c.onAccent : c.textPrimary }]}>{item.label}</Text>
          </AnimatedPressable>)}
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/adoptions/withdrawn' as Href)} style={styles.withdrawnLink}>
          <Ionicons name="archive-outline" size={18} color={c.accent} />
          <Text style={[styles.link, { color: c.accent }]}>Mis anuncios retirados</Text>
        </Pressable>
      </View>}
      renderItem={({ item }) => token ? <AdoptionCard item={item} token={token} onPress={() => router.push((`/adoptions/${item.id}`) as Href)} /> : null}
      ListEmptyComponent={loading ? <AdoptionListSkeleton />
        : error ? <View style={styles.state}><Text style={[styles.stateText, { color: c.error }]}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void load()} style={styles.retry}><Text style={[styles.link, { color: c.accent }]}>Reintentar</Text></Pressable></View>
        : <View style={styles.state}>
            <Ionicons name="paw-outline" size={40} color={c.accent} />
            <Text style={[styles.stateTitle, { color: c.textPrimary }]}>{emptyText}</Text>
            <Text style={[styles.stateText, { color: c.muted }]}>Si un animal necesita hogar, toca + para publicarlo.</Text>
          </View>}
      ListFooterComponent={items.length ? <View style={styles.footer}>
        {error ? <Text style={[styles.stateText, { color: c.error }]}>{error}</Text> : null}
        {cursor ? <Pressable accessibilityRole="button" disabled={loadingMore} onPress={() => void loadMore()} style={styles.retry}>{loadingMore ? <ActivityIndicator color={c.accent} accessibilityLabel="Cargando más adopciones" /> : <Text style={[styles.link, { color: c.accent }]}>{error ? 'Reintentar' : 'Cargar más'}</Text>}</Pressable> : null}
      </View> : undefined}
    />
    <FloatingAddButton accessibilityLabel="Publicar un animal en adopción" onPress={() => router.push('/adoptions/create' as Href)} />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, flexGrow: 1 },
  header: { marginBottom: spacing.lg },
  title: { fontFamily: 'Nunito_700Bold', fontSize: 29, lineHeight: 36 },
  help: { fontFamily: 'Nunito_400Regular', fontSize: 15, lineHeight: 21, marginTop: 2, marginBottom: spacing.md },
  tabs: { flexDirection: 'row', borderWidth: 1, borderRadius: 14, padding: 4, gap: 4 },
  tab: { flex: 1, minHeight: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabText: { fontFamily: 'Nunito_700Bold', fontSize: 14 },
  withdrawnLink: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, alignSelf: 'flex-start', marginTop: spacing.xs },
  state: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingTop: 60, paddingHorizontal: spacing.xl },
  stateTitle: { fontFamily: 'Nunito_700Bold', fontSize: 18, textAlign: 'center' },
  stateText: { fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 23, textAlign: 'center' },
  retry: { minHeight: 48, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg },
  link: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
  footer: { alignItems: 'center', gap: spacing.sm },
});
