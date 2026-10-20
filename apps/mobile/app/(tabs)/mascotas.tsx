import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';

import { PetCard } from '@/components/pet-card';
import { NAV_HEIGHT } from '@/components/nav';
import { useAuthContext } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { listPets, type Pet } from '@/lib/pets-api';

export default function MyPetsScreen() {
  const { token } = useAuthContext();
  const router = useRouter();
  const dark = useColorScheme() === 'dark';
  const colors = dark
    ? { bg: '#182213', card: '#20311C', text: '#DBDFD0', heading: '#82A87E', actionText: '#182213', error: '#F0A59A' }
    : { bg: '#DBDFD0', card: '#F8F7F0', text: '#111212', heading: '#365625', actionText: '#FFFFFF', error: '#8C3F37' };
  const [pets, setPets] = useState<Pet[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (next?: number) => {
    if (!token) return;
    if (next === undefined) setLoading(true); else setLoadingMore(true);
    setError('');
    try {
      const page = await listPets(token, undefined, next);
      setPets(current => next === undefined ? page.items : [...current, ...page.items]);
      setCursor(page.nextCursor);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos cargar tus mascotas.'); }
    finally { setLoading(false); setLoadingMore(false); }
  }, [token]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
    <FlatList data={pets} keyExtractor={pet => String(pet.id)} contentContainerStyle={[styles.content, { paddingBottom: NAV_HEIGHT + 20 }]}
      ListHeaderComponent={<View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.heading }]}>Petzy</Text>
        <Text style={[styles.title, { color: colors.heading }]}>Mis mascotas</Text>
        <Text style={[styles.intro, { color: colors.text }]}>Sus fichas, sus historias y todo lo que las hace únicas.</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push('/pets/create')} style={[styles.button, { backgroundColor: colors.heading }]}>
          <Ionicons name="add" size={20} color={colors.actionText} /><Text style={[styles.buttonText, { color: colors.actionText }]}>Agregar mascota</Text>
        </Pressable>
      </View>}
      renderItem={({ item }) => token ? <PetCard pet={item} token={token} /> : null}
      ListEmptyComponent={loading ? <View style={styles.state}><ActivityIndicator color={colors.heading} /><Text style={[styles.body, { color: colors.text }]}>Cargando mascotas…</Text></View>
        : error ? <View style={styles.state}><Text style={[styles.body, { color: colors.error }]}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void load()}><Text style={[styles.link, { color: colors.heading }]}>Reintentar</Text></Pressable></View>
        : <View style={[styles.empty, { backgroundColor: colors.card }]}><Ionicons name="paw-outline" size={42} color={colors.heading} /><Text style={[styles.emptyTitle, { color: colors.heading }]}>Todavía no hay mascotas</Text><Text style={[styles.body, { color: colors.text }]}>Agrega la primera ficha cuando quieras.</Text></View>}
      ListFooterComponent={pets.length ? <View style={styles.footer}>{error ? <Text style={[styles.body, { color: colors.error }]}>{error}</Text> : null}{cursor !== null ? <Pressable accessibilityRole="button" disabled={loadingMore} onPress={() => void load(cursor)} style={styles.more}>{loadingMore ? <ActivityIndicator color={colors.heading} /> : <Text style={[styles.link, { color: colors.heading }]}>{error ? 'Reintentar' : 'Cargar más'}</Text>}</Pressable> : null}</View> : null}
    />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { paddingHorizontal: 16, paddingTop: 12 }, header: { marginBottom: 24 },
  eyebrow: { fontFamily: 'Nunito_700Bold', fontSize: 18, textAlign: 'center', marginBottom: 16 },
  title: { fontFamily: 'Nunito_700Bold', fontSize: 30, lineHeight: 38 }, intro: { fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 23, marginTop: 4, marginBottom: 18 },
  button: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 18, minHeight: 48, paddingHorizontal: 16 },
  buttonText: { fontFamily: 'Nunito_700Bold', fontSize: 16 }, body: { fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 23, textAlign: 'center' },
  state: { alignItems: 'center', gap: 12, paddingTop: 70 }, link: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
  empty: { alignItems: 'center', borderRadius: 22, padding: 26, gap: 7 }, emptyTitle: { fontFamily: 'Nunito_700Bold', fontSize: 21 },
  footer: { alignItems: 'center', gap: 12 }, more: { minHeight: 48, justifyContent: 'center' },
});
