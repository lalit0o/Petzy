import { useCallback, useRef, useState } from 'react';
import { FlatList, Keyboard, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthContext } from '@/context/AuthContext';
import { CommunityApiError, listCommunities, type Community } from '@/lib/communities-api';
import { CommunityButton, CommunityCard, CommunityMessage, ui, useCommunityColors } from '@/components/community-ui';
import { NAV_HEIGHT } from '@/components/nav';
import { CommunityListSkeleton } from '@/components/skeleton';

export default function CommunitiesScreen() {
  const { token } = useAuthContext(); const router = useRouter(); const c = useCommunityColors();
  const [query, setQuery] = useState(''); const [search, setSearch] = useState('');
  const [items, setItems] = useState<Community[]>([]); const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true); const [more, setMore] = useState(false); const [error, setError] = useState('');
  const requestId = useRef(0);
  const load = useCallback(async function loadPage(next?: number): Promise<void> {
    if (!token) return;
    const current = ++requestId.current;
    if (next === undefined) { setLoading(true); setMore(false); setItems([]); setCursor(null); } else setMore(true);
    setError('');
    try {
      const page = await listCommunities(token, search || undefined, next);
      if (current !== requestId.current) return;
      setItems(previous => next === undefined ? page.items : [...previous, ...page.items.filter(item => !previous.some(old => old.id === item.id))]); setCursor(page.nextCursor);
    } catch (cause) {
      if (current !== requestId.current) return;
      if (next !== undefined && cause instanceof CommunityApiError && cause.status === 400) { await loadPage(); return; }
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las comunidades.');
    } finally { if (current === requestId.current) { setLoading(false); setMore(false); } }
  }, [token, search]);
  useFocusEffect(useCallback(() => { void load(); return () => { requestId.current++; }; }, [load]));
  const submit = () => {
    const value = query.trim();
    if (value && (value.length < 2 || value.length > 50)) { setError('Escribe de 2 a 50 caracteres o deja vacío para explorar.'); return; }
    Keyboard.dismiss(); if (value === search) void load(); else { requestId.current++; setItems([]); setCursor(null); setLoading(true); setSearch(value); }
  };
  return <SafeAreaView style={[ui.screen, { backgroundColor: c.bg }]} edges={['top']}>
    <FlatList style={ui.screen} data={items} keyExtractor={item => String(item.id)} contentContainerStyle={[ui.content, { paddingBottom: NAV_HEIGHT + 30 }]}
      automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      ListHeaderComponent={<View style={{ gap: 14 }}>
        <Text style={[ui.title, { color: c.heading }]}>Comunidades</Text>
        <Text style={[ui.body, { color: c.text }]}>Encuentra personas con quienes compartir el cuidado de los animales.</Text>
        <CommunityButton label="Crear comunidad" onPress={() => router.push('/communities/create' as Href)} />
        <TextInput accessibilityLabel="Buscar comunidades por nombre o tema" value={query} onChangeText={setQuery} placeholder="Buscar por nombre o tema" placeholderTextColor={c.muted} returnKeyType="search" submitBehavior="blurAndSubmit" onSubmitEditing={submit} maxLength={51} style={[ui.input, { color: c.text, borderColor: c.border, backgroundColor: c.card }]} />
        <CommunityButton label={search ? 'Buscar de nuevo' : 'Buscar'} secondary onPress={submit} />
        {error ? <><CommunityMessage text={error} error /><CommunityButton label="Reintentar" secondary onPress={() => void load(cursor ?? undefined)} /></> : null}
      </View>}
      ListEmptyComponent={loading ? <CommunityListSkeleton /> : !error ? <Text style={[ui.body, { color: c.muted }]}>{search ? 'No encontramos comunidades para esa búsqueda.' : 'Todavía no hay comunidades. Puedes crear la primera.'}</Text> : undefined}
      renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`Abrir comunidad ${item.name}`} onPress={() => router.push((`/communities/${item.id}`) as Href)}>
        <CommunityCard><Ionicons name="people-outline" size={30} color={c.heading} /><Text style={[ui.heading, { color: c.heading }]}>{item.name}</Text><Text style={[ui.body, { color: c.text }]} numberOfLines={3}>{item.description}</Text><Text style={[ui.muted, { color: c.muted }]}>{item.memberCount} {item.memberCount === 1 ? 'integrante' : 'integrantes'}{item.role ? ' · Ya eres miembro' : ''}</Text></CommunityCard>
      </Pressable>}
      ListFooterComponent={cursor !== null && items.length ? <CommunityButton label="Cargar más comunidades" busy={more} secondary onPress={() => void load(cursor)} /> : undefined}
    />
  </SafeAreaView>;
}
