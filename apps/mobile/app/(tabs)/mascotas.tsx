import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';

import { FloatingAddButton } from '@/components/floating-add-button';
import { PetCard } from '@/components/pet-card';
import { PetListSkeleton } from '@/components/skeleton';
import { NAV_HEIGHT } from '@/components/nav';
import { useAuthContext } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { cardShadow, iconSize, petzyColors } from '@/constants/petzy-theme';
import { listPets, PetApiError, type Pet } from '@/lib/pets-api';

export default function MyPetsScreen() {
  const { token } = useAuthContext();
  const router = useRouter();
  const dark = useColorScheme() === 'dark';
  const palette = petzyColors[dark ? 'dark' : 'light'];
  const colors = { bg: palette.background, card: palette.surface, text: palette.textPrimary, heading: palette.accent, actionText: palette.onAccent, error: palette.error, muted: palette.muted };
  const [pets, setPets] = useState<Pet[]>([]);
  const [listVersion, setListVersion] = useState(0);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(''); const [refreshing, setRefreshing] = useState(false);
  const requestId = useRef(0);
  const busy = useRef(false);
  const retryCursor = useRef<number | undefined>(undefined);

  const load = useCallback(async (next?: number) => {
    if (!token || busy.current) return;
    busy.current = true;
    const current = ++requestId.current;
    retryCursor.current = next;
    if (next === undefined) setLoading(true); else setLoadingMore(true);
    setError('');
    try {
      const page = await listPets(token, undefined, next);
      if (current !== requestId.current) return;
      setPets(previous => next === undefined ? page.items : [...previous, ...page.items.filter(pet => !previous.some(item => item.id === pet.id))]);
      setCursor(page.nextCursor);
      if (next === undefined) setListVersion(value => value + 1);
    } catch (cause) {
      if (current !== requestId.current) return;
      if (cause instanceof PetApiError && cause.status === 400) retryCursor.current = undefined;
      setError(cause instanceof Error ? cause.message : 'No pudimos cargar tus mascotas.');
    } finally {
      if (current === requestId.current) { busy.current = false; setLoading(false); setLoadingMore(false); }
    }
  }, [token]);

  // Deslizar para actualizar (estándar del 22-11-2026).
  const refresh = async () => { setRefreshing(true); try { await load(); } finally { setRefreshing(false); } };

  useFocusEffect(useCallback(() => {
    let active = true;
    queueMicrotask(() => { if (active) void load(); });
    return () => { active = false; requestId.current++; busy.current = false; };
  }, [load]));

  return <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
    {/* «Volver» fijo arriba, mismo diseño que los demás detalles (22-11-2026). Va directo a Mi perfil:
        esta pantalla vive dentro de las pestañas y un «atrás» normal podría llevar a Inicio. */}
    <View style={[styles.backHeader, { borderColor: palette.border }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Volver a Mi perfil" onPress={() => router.navigate('/perfil')} style={styles.back}>
        <Ionicons name="arrow-back" size={24} color={colors.heading} />
        <Text style={[styles.link, { color: colors.heading }]}>Volver</Text>
      </Pressable>
    </View>
    <FlatList data={pets} keyExtractor={pet => String(pet.id)} contentContainerStyle={[styles.content, { paddingBottom: NAV_HEIGHT + 90 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.heading} colors={[colors.heading]} progressBackgroundColor={colors.card} />}
      ListHeaderComponent={<View style={styles.header}>
        <Text style={[styles.title, { color: colors.heading }]}>Mis mascotas</Text>
        <Text style={[styles.intro, { color: colors.muted }]}>Sus fichas, sus historias y todo lo que las hace únicas.</Text>
      </View>}
      renderItem={({ item }) => token ? <PetCard key={`${item.id}:${listVersion}`} pet={item} token={token} /> : null}
      ListEmptyComponent={loading ? <PetListSkeleton />
        : error ? <View style={styles.state}><Ionicons name="cloud-offline-outline" size={36} color={colors.error} /><Text style={[styles.body, { color: colors.error }]}>{error}</Text><Pressable accessibilityRole="button" accessibilityLabel="Reintentar cargar tus mascotas" onPress={() => void load()} style={styles.more}><Text style={[styles.link, { color: colors.heading }]}>Reintentar</Text></Pressable></View>
        : <View style={[styles.empty, cardShadow(dark), { backgroundColor: colors.card }]}><Ionicons name="paw-outline" size={iconSize.lg} color={colors.heading} /><Text style={[styles.emptyTitle, { color: colors.heading }]}>Todavía no hay mascotas</Text><Text style={[styles.body, { color: colors.text }]}>Agrega la primera ficha cuando quieras.</Text></View>}
      ListFooterComponent={pets.length ? <View style={styles.footer}>
        {error ? <><Text accessibilityRole="alert" style={[styles.body, { color: colors.error }]}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void load(retryCursor.current)} style={styles.more}><Text style={[styles.link, { color: colors.heading }]}>Reintentar</Text></Pressable></> : null}
        {cursor !== null && !error && !loading ? <Pressable accessibilityRole="button" disabled={loadingMore} onPress={() => void load(cursor)} style={styles.more}>{loadingMore ? <ActivityIndicator color={colors.heading} accessibilityLabel="Cargando más mascotas" /> : <Text style={[styles.link, { color: colors.heading }]}>Cargar más</Text>}</Pressable> : null}
      </View> : undefined}
    />
    <FloatingAddButton accessibilityLabel="Agregar mascota" onPress={() => router.push('/pets/create')} />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { paddingHorizontal: 16, paddingTop: 12 }, header: { marginBottom: 24 },
  backHeader: { paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  back: { minHeight: 44, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8 },
  title: { fontFamily: 'Nunito_700Bold', fontSize: 29, lineHeight: 36, letterSpacing: -0.3 }, intro: { fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 23, marginTop: 4, marginBottom: 18 },
  body: { fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 23, textAlign: 'center' },
  state: { alignItems: 'center', gap: 12, paddingTop: 70 }, link: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
  empty: { alignItems: 'center', borderRadius: 22, padding: 26, gap: 7 }, emptyTitle: { fontFamily: 'Nunito_700Bold', fontSize: 21 },
  footer: { alignItems: 'center', gap: 12 }, more: { minHeight: 48, justifyContent: 'center' },
});
