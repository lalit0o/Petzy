import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, Platform, Pressable, StyleSheet, Text, TextInput, View, type TextInputInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthContext } from '@/context/AuthContext';
import { CommunityApiError, communityPhotoSource, listCommunities, type Community } from '@/lib/communities-api';
import { CommunityButton, CommunityCard, CommunityMessage, ui, useCommunityColors } from '@/components/community-ui';
import { AnimatedPressable } from '@/components/animated-pressable';
import { FloatingAddButton } from '@/components/floating-add-button';
import { NAV_HEIGHT } from '@/components/nav';
import { CommunityListSkeleton } from '@/components/skeleton';

type Tab = 'mine' | 'explore';

function CommunityThumb({ community, token }: { community: Community; token: string }) {
  const c = useCommunityColors();
  const [failed, setFailed] = useState(false);
  return <View style={[styles.thumb, { backgroundColor: c.card }]}>
    {community.photoPath && !failed
      ? <Image source={communityPhotoSource(community.photoPath, token)} style={styles.thumb} contentFit="cover" cachePolicy="memory" onError={() => setFailed(true)} accessibilityLabel={`Foto de ${community.name}`} />
      : <Ionicons name="people-outline" size={30} color={c.heading} />}
  </View>;
}

function CommunityListPanel({ mine, token }: { mine: boolean; token: string }) {
  const router = useRouter(); const c = useCommunityColors();
  const [query, setQuery] = useState(''); const [search, setSearch] = useState('');
  const [items, setItems] = useState<Community[]>([]); const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true); const [more, setMore] = useState(false); const [error, setError] = useState('');
  // Error de lo escrito en el campo (largo inválido); aparte del error de carga, que sí lleva «Reintentar».
  const [invalid, setInvalid] = useState('');
  const requestId = useRef(0);
  const inputRef = useRef<TextInputInstance>(null);
  const load = useCallback(async function loadPage(next?: number): Promise<void> {
    const current = ++requestId.current;
    if (next === undefined) { setLoading(true); setMore(false); setItems([]); setCursor(null); } else setMore(true);
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
  const emptyText = mine
    ? (search ? 'No tienes comunidades que coincidan con esa búsqueda.' : 'Todavía no perteneces a ninguna comunidad. Explora para encontrar una o crea la tuya.')
    : (search ? 'No encontramos comunidades para esa búsqueda.' : 'Todavía no hay comunidades. Puedes crear la primera.');
  return <FlatList style={ui.screen} data={items} keyExtractor={item => String(item.id)} contentContainerStyle={[ui.content, { paddingBottom: NAV_HEIGHT + (mine ? 90 : 30) }]}
    automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
    ListHeaderComponent={<View style={{ gap: 14 }}>
      <View>
        <TextInput ref={inputRef} accessibilityLabel={mine ? 'Buscar en mis comunidades' : 'Buscar comunidades por nombre o tema'} value={query} onChangeText={changeQuery} placeholder="Buscar por nombre o tema" placeholderTextColor={c.muted} returnKeyType="search" submitBehavior="blurAndSubmit" onSubmitEditing={submit} maxLength={51} style={[ui.input, styles.searchInput, { color: c.text, borderColor: c.border, backgroundColor: c.card }]} />
        {query.length > 0 ? <Pressable accessibilityRole="button" accessibilityLabel="Borrar búsqueda" onPress={clearQuery} style={styles.clearButton}><Ionicons name="close-circle" size={22} color={c.muted} /></Pressable> : null}
      </View>
      <CommunityButton label={search ? 'Buscar de nuevo' : 'Buscar'} secondary onPress={submit} />
      <CommunityMessage text={invalid} error />
      {error ? <><CommunityMessage text={error} error /><CommunityButton label="Reintentar" secondary onPress={() => void load(cursor ?? undefined)} /></> : null}
    </View>}
    ListEmptyComponent={loading ? <CommunityListSkeleton /> : !error ? <Text style={[ui.body, { color: c.muted }]}>{emptyText}</Text> : undefined}
    renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`Abrir comunidad ${item.name}`} onPress={() => router.push((`/communities/${item.id}`) as Href)}>
      <CommunityCard><CommunityThumb community={item} token={token} /><Text style={[ui.heading, { color: c.heading }]}>{item.name}</Text><Text style={[ui.body, { color: c.text }]} numberOfLines={3}>{item.description}</Text><Text style={[ui.muted, { color: c.muted }]}>{item.memberCount} {item.memberCount === 1 ? 'integrante' : 'integrantes'}{!mine && item.role ? ' · Ya eres miembro' : ''}</Text></CommunityCard>
    </Pressable>}
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
  if (tab === null) return <SafeAreaView style={[ui.screen, { backgroundColor: c.bg }]} edges={['top']}><View style={styles.deciding}><ActivityIndicator color={c.heading} /></View></SafeAreaView>;

  return <SafeAreaView style={[ui.screen, { backgroundColor: c.bg }]} edges={['top']}>
    <View style={styles.header}>
      <Text style={[ui.title, { color: c.heading }]}>Comunidades</Text>
      <Text style={[ui.body, { color: c.text }]}>Encuentra personas con quienes compartir el cuidado de los animales.</Text>
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
  searchInput: { paddingRight: 48 },
  clearButton: { position: 'absolute', right: 0, top: 0, width: 48, height: 52, alignItems: 'center', justifyContent: 'center' },
  thumb: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  deciding: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 16, paddingTop: 12, gap: 14 },
  tabs: { flexDirection: 'row', borderWidth: 1, borderRadius: 14, padding: 4, gap: 4 },
  tab: { flex: 1, minHeight: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontFamily: 'Nunito_700Bold', fontSize: 15 },
});
