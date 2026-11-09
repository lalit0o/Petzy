import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, Platform, Pressable, StyleSheet, Text, TextInput, View, type TextInputInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter, type Href } from 'expo-router';

import { useAuthContext } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { goBackOrReplace } from '@/lib/navigation';
import { profilePhotoSource, searchProfiles, type PublicProfile } from '@/lib/profiles-api';
import { NAV_HEIGHT } from '@/components/nav';
import { PersonListSkeleton } from '@/components/skeleton';
import { type MexicoState } from '@/types/mexicoState';
import { petzyColors } from '@/constants/petzy-theme';

type SearchColors = { background: string; card: string; text: string; heading: string; border: string; muted: string; error: string; actionText: string; avatar: string };

function stateLabel(state: MexicoState) {
  return state.toLowerCase().split('_').map(part => part[0].toUpperCase() + part.slice(1)).join(' ');
}

function PersonImage({ person, token, color }: { person: PublicProfile; token: string; color: SearchColors }) {
  const [failed, setFailed] = useState(false);
  return <View style={[styles.avatar, { backgroundColor: color.avatar }]}>
    {person.avatarUrl && !failed ? <Image source={profilePhotoSource(person.avatarUrl, token)} style={styles.avatarImage} contentFit="cover" cachePolicy="memory" onError={() => setFailed(true)} />
      : <Ionicons name="person-outline" size={23} color={color.heading} />}
  </View>;
}

export default function SearchProfilesScreen({ inTab = false }: { inTab?: boolean }) {
  const { token } = useAuthContext();
  const router = useRouter();
  const palette = petzyColors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const colors: SearchColors = { background: palette.background, card: palette.surface, text: palette.textPrimary, heading: palette.accent, border: palette.border, muted: palette.muted, error: palette.error, actionText: palette.onAccent, avatar: palette.surfaceAlt };
  const inputRef = useRef<TextInputInstance>(null);
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

  return <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={inTab ? ['top'] : ['top', 'bottom']}>
    <FlatList style={styles.screen} data={items} keyExtractor={person => person.id} contentContainerStyle={[styles.list, inTab && { paddingBottom: NAV_HEIGHT + 28 }]}
      automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      ListHeaderComponent={<View style={styles.header}>
      {!inTab ? <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => goBackOrReplace(router, '/buscar')} style={styles.back}><Ionicons name="arrow-back" size={24} color={colors.heading} /><Text style={[styles.link, { color: colors.heading }]}>Volver</Text></Pressable> : null}
      <Text style={[styles.title, { color: colors.heading }]}>Buscar perfiles</Text>
      <Text style={[styles.help, { color: colors.muted }]}>Encuentra personas por su nombre de usuario.</Text>
      <View style={styles.searchRow}>
        <View style={styles.inputShell}>
        <TextInput ref={inputRef} accessibilityLabel="Nombre de usuario para buscar" value={query} onChangeText={changeQuery} placeholder="Escribe un nombre" placeholderTextColor={colors.muted} autoCapitalize="none" returnKeyType="search" submitBehavior="submit" onSubmitEditing={() => void search()} style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} />
        {query.length > 0 ? <Pressable accessibilityRole="button" accessibilityLabel="Borrar búsqueda" onPress={() => { changeQuery(''); inputRef.current?.focus(); }} style={styles.clearButton}><Ionicons name="close-circle" size={22} color={colors.muted} /></Pressable> : null}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Buscar" disabled={loading} onPress={() => void search()} style={[styles.searchButton, { backgroundColor: colors.heading }]}><Ionicons name="search" size={23} color={colors.actionText} /></Pressable>
      </View>
      {error ? <View style={styles.errorRow}><Text style={[styles.error, { color: colors.error }]}>{error}</Text>{searched && !loading ? <Pressable accessibilityRole="button" onPress={() => void (cursor ? more() : search())}><Text style={[styles.link, { color: colors.heading }]}>Reintentar</Text></Pressable> : null}</View> : null}
    </View>}
        ListEmptyComponent={loading ? <PersonListSkeleton /> : searched && !error ? <Text style={[styles.empty, { color: colors.muted }]}>No encontramos perfiles con «{searched}».</Text> : !searched ? <Text style={[styles.empty, { color: colors.muted }]}>Escribe al menos dos caracteres y pulsa Buscar.</Text> : undefined}
        renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`Abrir perfil de ${item.username}`} onPress={() => router.push((`/profiles/${encodeURIComponent(item.id)}`) as Href)} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}><PersonImage person={item} token={token ?? ''} color={colors} /><View style={styles.personText}><Text style={[styles.name, { color: colors.text }]}>{item.username}</Text><Text style={[styles.location, { color: colors.muted }]}>{stateLabel(item.locatedAt)}</Text></View><Ionicons name="chevron-forward" size={20} color={colors.heading} /></Pressable>}
        ListFooterComponent={cursor ? <Pressable accessibilityRole="button" disabled={loadingMore} onPress={() => void more()} style={[styles.more, { borderColor: colors.border }]}>{loadingMore ? <ActivityIndicator color={colors.heading} /> : <Text style={[styles.link, { color: colors.heading }]}>Cargar más perfiles</Text>}</Pressable> : undefined}
      />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, header: { paddingTop: 8 }, back: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: 'Nunito_700Bold', fontSize: 28, marginTop: 8 }, help: { fontFamily: 'Nunito_400Regular', fontSize: 16, marginTop: 5, lineHeight: 22 },
  inputShell: { flex: 1, minWidth: 0 }, clearButton: { position: 'absolute', right: 0, top: 0, width: 48, height: 52, alignItems: 'center', justifyContent: 'center' },
  searchRow: { flexDirection: 'row', gap: 9, marginTop: 18 }, input: { flex: 1, minHeight: 52, borderWidth: 1, borderRadius: 15, paddingHorizontal: 14, paddingRight: 48, fontFamily: 'Nunito_400Regular', fontSize: 16 }, searchButton: { width: 52, height: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 28, gap: 10 }, card: { borderWidth: 1, borderRadius: 17, padding: 12, minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, avatarImage: { width: 48, height: 48 }, personText: { flex: 1 },
  name: { fontFamily: 'Nunito_700Bold', fontSize: 17 }, location: { fontFamily: 'Nunito_400Regular', fontSize: 14, marginTop: 2 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }, empty: { fontFamily: 'Nunito_400Regular', fontSize: 16, textAlign: 'center', marginTop: 34 },
  link: { fontFamily: 'Nunito_700Bold', fontSize: 16 }, errorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 12 }, error: { flex: 1, fontFamily: 'Nunito_600SemiBold', fontSize: 14 }, more: { minHeight: 52, borderWidth: 1, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
});
