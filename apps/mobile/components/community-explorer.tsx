import { useCallback, useRef, useState } from 'react';
import { FlatList, Keyboard, Platform, Pressable, RefreshControl, StyleSheet, Text, TextInput, View, type TextInputInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthContext } from '@/context/AuthContext';
import { CommunityApiError, communityPhotoSource, listCommunities, type Community } from '@/lib/communities-api';
import { CommunityButton, CommunityMessage, ui, useCommunityColors } from '@/components/community-ui';
import { AnimatedPressable } from '@/components/animated-pressable';
import { FloatingAddButton } from '@/components/floating-add-button';
import { NAV_HEIGHT } from '@/components/nav';
import { CommunityListSkeleton } from '@/components/skeleton';
import { cardShadow, petzyColors, radius, spacing } from '@/constants/petzy-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Tab = 'mine' | 'explore';

function CommunityThumb({ community, token }: { community: Community; token: string }) {
  const c = useCommunityColors();
  const [failed, setFailed] = useState(false);
  const surfaceAlt = petzyColors[useColorScheme() === 'dark' ? 'dark' : 'light'].surfaceAlt;
  return <View style={[styles.thumb, { backgroundColor: surfaceAlt }]}>
    {community.photoPath && !failed
      ? <Image source={communityPhotoSource(community.photoPath, token)} style={styles.thumb} contentFit="cover" cachePolicy="memory" onError={() => setFailed(true)} accessibilityLabel={`Foto de ${community.name}`} />
      : <Ionicons name="people-outline" size={30} color={c.heading} />}
  </View>;
}

// Fila de comunidad (22-11-2026, pulido con impeccable): foto a la izquierda y
// nombre, descripción e integrantes a la derecha, para que quepan más en
// pantalla. Toda la tarjeta abre la comunidad y responde al presionar.
function CommunityRow({ community, token, mine }: { community: Community; token: string; mine: boolean }) {
  const router = useRouter(); const c = useCommunityColors();
  const dark = useColorScheme() === 'dark'; const surfaceAlt = petzyColors[dark ? 'dark' : 'light'].surfaceAlt;
  const members = `${community.memberCount} ${community.memberCount === 1 ? 'integrante' : 'integrantes'}`;
  const isMember = !mine && Boolean(community.role);
  return <Pressable accessibilityRole="button" accessibilityLabel={`Abrir comunidad ${community.name}. ${members}${isMember ? '. Ya eres miembro' : ''}`} onPress={() => router.push((`/communities/${community.id}`) as Href)}
    style={({ pressed }) => [styles.row, cardShadow(dark), { backgroundColor: pressed ? surfaceAlt : c.card, borderColor: c.border }]}>
    <CommunityThumb community={community} token={token} />
    <View style={styles.rowInfo}>
      <Text numberOfLines={2} style={[styles.rowName, { color: c.heading }]}>{community.name}</Text>
      {community.description ? <Text numberOfLines={2} style={[styles.rowDescription, { color: c.text }]}>{community.description}</Text> : null}
      <View style={styles.rowMeta}>
        <Ionicons name="people-outline" size={15} color={c.muted} />
        <Text style={[ui.muted, { color: c.muted }]}>{members}</Text>
        {isMember ? <View style={[styles.memberChip, { backgroundColor: surfaceAlt }]}><Text style={[styles.memberChipText, { color: c.text }]}>Ya eres miembro</Text></View> : null}
      </View>
    </View>
  </Pressable>;
}

function CommunityListPanel({ mine, token }: { mine: boolean; token: string }) {
  const c = useCommunityColors();
  const [query, setQuery] = useState(''); const [search, setSearch] = useState('');
  const [items, setItems] = useState<Community[]>([]); const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true); const [more, setMore] = useState(false); const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  // Error de lo escrito en el campo (largo inválido); aparte del error de carga, que sí lleva «Reintentar».
  const [invalid, setInvalid] = useState('');
  const requestId = useRef(0);
  const inputRef = useRef<TextInputInstance>(null);
  // `silent`: al deslizar para actualizar no se vacía la lista ni sale el esqueleto.
  const load = useCallback(async function loadPage(next?: number, silent = false): Promise<void> {
    const current = ++requestId.current;
    if (next === undefined) { if (!silent) { setLoading(true); setItems([]); setCursor(null); } setMore(false); } else setMore(true);
    setError('');
    try {
      const page = await listCommunities(token, search || undefined, next, mine);
      if (current !== requestId.current) return;
      setItems(previous => next === undefined ? page.items : [...previous, ...page.items.filter(item => !previous.some(old => old.id === item.id))]); setCursor(page.nextCursor);
    } catch (cause) {
      if (current !== requestId.current) return;
      if (next !== undefined && cause instanceof CommunityApiError && cause.status === 400) { await loadPage(); return; }
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las comunidades.');
    } finally { if (current === requestId.current) { setLoading(false); setMore(false); } }
  }, [token, search, mine]);
  useFocusEffect(useCallback(() => { void load(); return () => { requestId.current++; }; }, [load]));
  // Cambia el criterio aplicado y recarga desde el principio; descarta cualquier respuesta atrasada.
  const applySearch = (value: string) => { requestId.current++; setItems([]); setCursor(null); setLoading(true); setSearch(value); };
  const submit = () => {
    const value = query.trim();
    if (value && (value.length < 2 || value.length > 50)) { setInvalid('Escribe de 2 a 50 caracteres o deja vacío para explorar.'); return; }
    setInvalid(''); Keyboard.dismiss(); if (value === search) void load(); else applySearch(value);
  };
  // Sin texto no hay criterio: se muestran todas las comunidades sin pulsar «Buscar».
  const changeQuery = (next: string) => {
    setQuery(next); setInvalid('');
    if (next.trim() === '' && search !== '') applySearch('');
  };
  const clearQuery = () => { changeQuery(''); inputRef.current?.focus(); };
  const refresh = async () => { setRefreshing(true); try { await load(undefined, true); } finally { setRefreshing(false); } };
  const emptyText = mine
    ? (search ? 'No tienes comunidades que coincidan con esa búsqueda.' : 'Todavía no perteneces a ninguna comunidad. Explora para encontrar una o crea la tuya.')
    : (search ? 'No encontramos comunidades para esa búsqueda.' : 'Todavía no hay comunidades. Puedes crear la primera.');
  return <FlatList style={ui.screen} data={items} keyExtractor={item => String(item.id)} contentContainerStyle={[ui.content, { paddingBottom: NAV_HEIGHT + (mine ? 90 : 30) }]}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={c.heading} colors={[c.heading]} progressBackgroundColor={c.card} />}
    automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
    ListHeaderComponent={<View style={styles.listHeader}>
      {/* Campo y «Buscar» en una sola fila: el botón se conserva (estándar de búsqueda) sin ocupar todo el ancho. */}
      <View style={styles.searchRow}>
        <View style={styles.searchField}>
          <Ionicons name="search" size={18} color={c.muted} style={styles.searchIcon} pointerEvents="none" />
          <TextInput ref={inputRef} accessibilityLabel={mine ? 'Buscar en mis comunidades' : 'Buscar comunidades por nombre o tema'} value={query} onChangeText={changeQuery} placeholder="Nombre o tema" placeholderTextColor={c.muted} returnKeyType="search" submitBehavior="blurAndSubmit" onSubmitEditing={submit} maxLength={51} style={[ui.input, styles.searchInput, { color: c.text, borderColor: c.border, backgroundColor: c.card }]} />
          {query.length > 0 ? <Pressable accessibilityRole="button" accessibilityLabel="Borrar búsqueda" onPress={clearQuery} style={styles.clearButton}><Ionicons name="close-circle" size={22} color={c.muted} /></Pressable> : null}
        </View>
        <CommunityButton label={search ? 'Buscar de nuevo' : 'Buscar'} secondary onPress={submit} style={styles.searchButton} />
      </View>
      <CommunityMessage text={invalid} error />
      {error ? <><CommunityMessage text={error} error /><CommunityButton label="Reintentar" secondary onPress={() => void load(cursor ?? undefined)} /></> : null}
    </View>}
    ListEmptyComponent={loading ? <CommunityListSkeleton /> : !error ? <View style={styles.empty}><Ionicons name={search ? 'search-outline' : 'people-outline'} size={36} color={c.heading} /><Text style={[ui.body, styles.emptyText, { color: c.muted }]}>{emptyText}</Text></View> : undefined}
    renderItem={({ item }) => <CommunityRow community={item} token={token} mine={mine} />}
    ListFooterComponent={cursor !== null && items.length ? <CommunityButton label="Cargar más comunidades" busy={more} secondary onPress={() => void load(cursor)} /> : undefined}
  />;
}

export default function CommunitiesScreen() {
  const { token } = useAuthContext(); const c = useCommunityColors(); const router = useRouter();
  const decided = useRef(false);
  const [tab, setTab] = useState<Tab | null>(null);

  useFocusEffect(useCallback(() => {
    if (decided.current || !token) return;
    let active = true;
    (async () => {
      try {
        const page = await listCommunities(token, undefined, undefined, true);
        if (active) { decided.current = true; setTab(page.items.length > 0 ? 'mine' : 'explore'); }
      } catch { if (active) { decided.current = true; setTab('explore'); } }
    })();
    return () => { active = false; };
  }, [token]));

  if (!token) return null;
  // Mientras se decide la pestaña inicial: título y esqueleto, no una ruedita suelta.
  if (tab === null) return <SafeAreaView style={[ui.screen, { backgroundColor: c.bg }]} edges={['top']}>
    <View style={styles.header}><Text style={[styles.title, { color: c.heading }]}>Comunidades</Text></View>
    <View style={ui.content}><CommunityListSkeleton /></View>
  </SafeAreaView>;

  return <SafeAreaView style={[ui.screen, { backgroundColor: c.bg }]} edges={['top']}>
    <View style={styles.header}>
      <Text style={[styles.title, { color: c.heading }]}>Comunidades</Text>
      <Text style={[ui.body, { color: c.muted }]}>Encuentra personas con quienes compartir el cuidado de los animales.</Text>
      <View accessibilityRole="tablist" style={[styles.tabs, { borderColor: c.border }]}>
        <AnimatedPressable accessibilityRole="tab" accessibilityState={{ selected: tab === 'mine' }} style={[styles.tab, tab === 'mine' && { backgroundColor: c.heading }]} onPress={() => setTab('mine')}>
          <Text style={[styles.tabText, { color: tab === 'mine' ? c.actionText : c.heading }]}>Mis comunidades</Text>
        </AnimatedPressable>
        <AnimatedPressable accessibilityRole="tab" accessibilityState={{ selected: tab === 'explore' }} style={[styles.tab, tab === 'explore' && { backgroundColor: c.heading }]} onPress={() => setTab('explore')}>
          <Text style={[styles.tabText, { color: tab === 'explore' ? c.actionText : c.heading }]}>Explorar comunidades</Text>
        </AnimatedPressable>
      </View>
    </View>
    {tab === 'mine' ? <CommunityListPanel mine token={token} /> : <CommunityListPanel mine={false} token={token} />}
    {tab === 'mine' ? <FloatingAddButton accessibilityLabel="Crear comunidad" onPress={() => router.push('/communities/create' as Href)} /> : null}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  title: { fontFamily: 'Nunito_700Bold', fontSize: 29, lineHeight: 36, letterSpacing: -0.3 },
  listHeader: { gap: spacing.md, marginBottom: spacing.xs },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  searchField: { flex: 1 },
  searchIcon: { position: 'absolute', left: 12, top: 17, zIndex: 1 },
  searchInput: { paddingLeft: 38, paddingRight: 48 },
  searchButton: { minHeight: 52 },
  clearButton: { position: 'absolute', right: 0, top: 0, width: 48, height: 52, alignItems: 'center', justifyContent: 'center' },
  thumb: { width: 64, height: 64, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: radius.xl, padding: spacing.md },
  rowInfo: { flex: 1, gap: 3 },
  rowName: { fontFamily: 'Nunito_700Bold', fontSize: 18, lineHeight: 23 },
  rowDescription: { fontFamily: 'Nunito_400Regular', fontSize: 15, lineHeight: 21 },
  rowMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 3 },
  memberChip: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  memberChipText: { fontFamily: 'Nunito_700Bold', fontSize: 12, lineHeight: 16 },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: 48, paddingHorizontal: spacing.xl },
  emptyText: { textAlign: 'center' },
  header: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  tabs: { flexDirection: 'row', borderWidth: 1, borderRadius: 14, padding: 4, gap: 4 },
  tab: { flex: 1, minHeight: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontFamily: 'Nunito_700Bold', fontSize: 15 },
});
