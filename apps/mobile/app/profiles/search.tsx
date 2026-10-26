import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter, type Href } from 'expo-router';

import { useAuthContext } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { goBackOrReplace } from '@/lib/navigation';
import { profilePhotoSource, searchProfiles, type PublicProfile } from '@/lib/profiles-api';
import { type MexicoState } from '@/types/mexicoState';

const light = { background: '#DBDFD0', card: '#F8F7F0', text: '#111212', heading: '#365625', border: '#B5AF8B', muted: '#525D48', error: '#8C3F37', actionText: '#FFFFFF', avatar: '#DED0A5' };
const dark = { background: '#182213', card: '#20311C', text: '#DBDFD0', heading: '#82A87E', border: '#525D48', muted: '#B5AF8B', error: '#F0A59A', actionText: '#182213', avatar: '#404F4D' };

function stateLabel(state: MexicoState) {
  return state.toLowerCase().split('_').map(part => part[0].toUpperCase() + part.slice(1)).join(' ');
}

function PersonImage({ person, token, color }: { person: PublicProfile; token: string; color: typeof light }) {
  const [failed, setFailed] = useState(false);
  return <View style={[styles.avatar, { backgroundColor: color.avatar }]}>
    {person.avatarUrl && !failed ? <Image source={profilePhotoSource(person.avatarUrl, token)} style={styles.avatarImage} contentFit="cover" cachePolicy="none" onError={() => setFailed(true)} />
      : <Ionicons name="person-outline" size={23} color={color.heading} />}
  </View>;
}

export default function SearchProfilesScreen() {
  const { token } = useAuthContext();
  const router = useRouter();
  const colors = useColorScheme() === 'dark' ? dark : light;
  const requestId = useRef(0);
  const busy = useRef(false);
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState('');
  const [items, setItems] = useState<PublicProfile[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  useFocusEffect(useCallback(() => {
    // Al volver, permite reintentar una solicitud interrumpida sin aceptar su respuesta vieja.
    queueMicrotask(() => { setLoading(false); setLoadingMore(false); });
    return () => { requestId.current++; busy.current = false; };
  }, []));

  const changeQuery = (next: string) => {
    requestId.current += 1;
    busy.current = false;
    setQuery(next); setSearched(''); setItems([]); setCursor(null); setError(''); setLoading(false); setLoadingMore(false);
  };

  const search = async () => {
    if (!token || busy.current) return;
    const q = query.trim();
    if (q.length < 2 || q.length > 50) { setError('Escribe de 2 a 50 caracteres para buscar.'); return; }
    const id = ++requestId.current;
    busy.current = true;
    setSearched(q); setItems([]); setCursor(null); setLoading(true); setError(''); Keyboard.dismiss();
    try {
      const page = await searchProfiles(token, q);
      if (id === requestId.current) { setItems(page.items); setCursor(page.nextCursor); }
    } catch (cause) {
      if (id === requestId.current) setError(cause instanceof Error ? cause.message : 'No se pudo buscar.');
    } finally { if (id === requestId.current) { busy.current = false; setLoading(false); } }
  };

  const more = async () => {
    if (!token || !cursor || busy.current) return;
    const id = requestId.current;
    busy.current = true;
    setLoadingMore(true); setError('');
    try {
      const page = await searchProfiles(token, searched, cursor);
      if (id === requestId.current) { setItems(current => [...current, ...page.items.filter(person => !current.some(item => item.id === person.id))]); setCursor(page.nextCursor); }
    } catch (cause) {
      if (id === requestId.current) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar más perfiles.');
    } finally { if (id === requestId.current) { busy.current = false; setLoadingMore(false); } }
  };

  return <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
    <FlatList style={styles.screen} data={items} keyExtractor={person => person.id} contentContainerStyle={styles.list}
      automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      ListHeaderComponent={<View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => goBackOrReplace(router, '/perfil')} style={styles.back}><Ionicons name="arrow-back" size={24} color={colors.heading} /><Text style={[styles.link, { color: colors.heading }]}>Volver</Text></Pressable>
      <Text style={[styles.title, { color: colors.heading }]}>Buscar perfiles</Text>
      <Text style={[styles.help, { color: colors.muted }]}>Encuentra personas por su nombre de usuario.</Text>
      <View style={styles.searchRow}>
        <TextInput accessibilityLabel="Nombre de usuario para buscar" value={query} onChangeText={changeQuery} placeholder="Escribe un nombre" placeholderTextColor={colors.muted} autoCapitalize="none" returnKeyType="search" submitBehavior="submit" onSubmitEditing={() => void search()} style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} />
        <Pressable accessibilityRole="button" accessibilityLabel="Buscar" disabled={loading} onPress={() => void search()} style={[styles.searchButton, { backgroundColor: colors.heading }]}><Ionicons name="search" size={23} color={colors.actionText} /></Pressable>
      </View>
      {error ? <View style={styles.errorRow}><Text style={[styles.error, { color: colors.error }]}>{error}</Text>{searched && !loading ? <Pressable accessibilityRole="button" onPress={() => void (cursor ? more() : search())}><Text style={[styles.link, { color: colors.heading }]}>Reintentar</Text></Pressable> : null}</View> : null}
    </View>}
        ListEmptyComponent={loading ? <View style={styles.center}><ActivityIndicator color={colors.heading} /><Text style={[styles.help, { color: colors.text }]}>Buscando perfiles…</Text></View> : searched && !error ? <Text style={[styles.empty, { color: colors.muted }]}>No encontramos perfiles con «{searched}».</Text> : !searched ? <Text style={[styles.empty, { color: colors.muted }]}>Escribe al menos dos caracteres y pulsa Buscar.</Text> : null}
        renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`Abrir perfil de ${item.username}`} onPress={() => router.push((`/profiles/${encodeURIComponent(item.id)}`) as Href)} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}><PersonImage person={item} token={token ?? ''} color={colors} /><View style={styles.personText}><Text style={[styles.name, { color: colors.text }]}>{item.username}</Text><Text style={[styles.location, { color: colors.muted }]}>{stateLabel(item.locatedAt)}</Text></View><Ionicons name="chevron-forward" size={20} color={colors.heading} /></Pressable>}
        ListFooterComponent={cursor ? <Pressable accessibilityRole="button" disabled={loadingMore} onPress={() => void more()} style={[styles.more, { borderColor: colors.border }]}>{loadingMore ? <ActivityIndicator color={colors.heading} /> : <Text style={[styles.link, { color: colors.heading }]}>Cargar más perfiles</Text>}</Pressable> : null}
      />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, header: { paddingTop: 8 }, back: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: 'Nunito_700Bold', fontSize: 28, marginTop: 8 }, help: { fontFamily: 'Nunito_400Regular', fontSize: 16, marginTop: 5, lineHeight: 22 },
  searchRow: { flexDirection: 'row', gap: 9, marginTop: 18 }, input: { flex: 1, minHeight: 52, borderWidth: 1, borderRadius: 15, paddingHorizontal: 14, fontFamily: 'Nunito_400Regular', fontSize: 16 }, searchButton: { width: 52, height: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 28, gap: 10 }, card: { borderWidth: 1, borderRadius: 17, padding: 12, minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, avatarImage: { width: 48, height: 48 }, personText: { flex: 1 },
  name: { fontFamily: 'Nunito_700Bold', fontSize: 17 }, location: { fontFamily: 'Nunito_400Regular', fontSize: 14, marginTop: 2 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }, empty: { fontFamily: 'Nunito_400Regular', fontSize: 16, textAlign: 'center', marginTop: 34 },
  link: { fontFamily: 'Nunito_700Bold', fontSize: 16 }, errorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 12 }, error: { flex: 1, fontFamily: 'Nunito_600SemiBold', fontSize: 14 }, more: { minHeight: 52, borderWidth: 1, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
});
