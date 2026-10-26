import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useAuthContext } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { goBackOrReplace } from '@/lib/navigation';
import { getPublicProfile, profilePhotoSource, type PublicProfile } from '@/lib/profiles-api';
import { listPets, type Pet } from '@/lib/pets-api';
import { PetCard } from '@/components/pet-card';

const light = { background: '#DBDFD0', card: '#F8F7F0', text: '#111212', heading: '#365625', border: '#B5AF8B', muted: '#525D48', error: '#8C3F37', avatar: '#DED0A5' };
const dark = { background: '#182213', card: '#20311C', text: '#DBDFD0', heading: '#82A87E', border: '#525D48', muted: '#B5AF8B', error: '#F0A59A', avatar: '#404F4D' };

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuthContext();
  const colors = useColorScheme() === 'dark' ? dark : light;
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [photoError, setPhotoError] = useState(false);
  const [pets, setPets] = useState<Pet[]>([]);
  const [petCursor, setPetCursor] = useState<number | null>(null);
  const [petsLoading, setPetsLoading] = useState(true);
  const [petsError, setPetsError] = useState('');

  const load = async () => {
    if (!token || !id) return;
    setLoading(true); setError(''); setProfile(null); setPhotoError(false);
    try { setProfile(await getPublicProfile(token, id)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo cargar este perfil.'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!token || !id) return;
    let active = true;
    queueMicrotask(async () => {
      try {
        const next = await getPublicProfile(token, id);
        if (active) { setProfile(next); setError(''); }
      } catch (cause) {
        if (active) { setProfile(null); setError(cause instanceof Error ? cause.message : 'No se pudo cargar este perfil.'); }
      } finally { if (active) setLoading(false); }
    });
    return () => { active = false; };
  }, [id, token]);

  const loadPets = async (cursor?: number) => {
    if (!token || !id) return;
    setPetsLoading(true); setPetsError('');
    try {
      const page = await listPets(token, id, cursor);
      setPets(current => cursor === undefined ? page.items : [...current, ...page.items]);
      setPetCursor(page.nextCursor);
    } catch (cause) { setPetsError(cause instanceof Error ? cause.message : 'No se pudieron cargar las mascotas.'); }
    finally { setPetsLoading(false); }
  };

  useEffect(() => {
    if (!token || !id) return;
    let active = true;
    queueMicrotask(async () => {
      try {
        const page = await listPets(token, id);
        if (active) { setPets(page.items); setPetCursor(page.nextCursor); setPetsError(''); }
      } catch (cause) {
        if (active) setPetsError(cause instanceof Error ? cause.message : 'No se pudieron cargar las mascotas.');
      } finally { if (active) setPetsLoading(false); }
    });
    return () => { active = false; };
  }, [id, token]);

  const state = profile?.locatedAt.toLowerCase().split('_').map(part => part[0].toUpperCase() + part.slice(1)).join(' ');
  return <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => goBackOrReplace(router, '/profiles/search')} style={styles.back}><Ionicons name="arrow-back" size={24} color={colors.heading} /><Text style={[styles.link, { color: colors.heading }]}>Volver</Text></Pressable>
      {loading ? <View style={styles.center}><ActivityIndicator color={colors.heading} /><Text style={[styles.body, { color: colors.text }]}>Cargando perfil…</Text></View> : null}
      {error ? <View style={styles.center}><Text style={[styles.error, { color: colors.error }]}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void load()}><Text style={[styles.link, { color: colors.heading }]}>Reintentar</Text></Pressable></View> : null}
      {profile ? <>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.avatar }]}>
            {profile.avatarUrl && token && !photoError ? <Image source={profilePhotoSource(profile.avatarUrl, token)} style={styles.photo} contentFit="cover" cachePolicy="none" onError={() => setPhotoError(true)} /> : <Ionicons name="person-outline" size={48} color={colors.heading} />}
          </View>
          {photoError ? <Pressable accessibilityRole="button" onPress={() => setPhotoError(false)}><Text style={[styles.error, { color: colors.error }]}>No se pudo mostrar la foto. Reintentar.</Text></Pressable> : null}
          <Text style={[styles.title, { color: colors.heading }]}>{profile.username}</Text>
          <View style={styles.location}><Ionicons name="location-outline" size={18} color={colors.muted} /><Text style={[styles.body, { color: colors.muted }]}>{state}</Text></View>
          {profile.bio ? <View style={[styles.bioBlock, { borderColor: colors.border }]}><Text style={[styles.section, { color: colors.heading }]}>Sobre esta persona</Text><Text style={[styles.body, { color: colors.text }]}>{profile.bio}</Text></View> : null}
        </View>
        <View style={styles.petsSection}>
          <Text style={[styles.petsTitle, { color: colors.heading }]}>Sus mascotas</Text>
          {pets.map(pet => token ? <PetCard key={pet.id} pet={pet} token={token} /> : null)}
          {petsLoading ? <View style={styles.petFeedback}><ActivityIndicator color={colors.heading} /><Text style={[styles.body, { color: colors.text }]}>Cargando mascotas…</Text></View> : null}
          {petsError ? <View style={styles.petFeedback}><Text style={[styles.error, { color: colors.error }]}>{petsError}</Text><Pressable accessibilityRole="button" onPress={() => void loadPets(pets.length ? petCursor ?? undefined : undefined)}><Text style={[styles.link, { color: colors.heading }]}>Reintentar</Text></Pressable></View> : null}
          {!petsLoading && !petsError && pets.length === 0 ? <Text style={[styles.body, { color: colors.text }]}>Todavía no tiene mascotas registradas.</Text> : null}
          {!petsLoading && !petsError && petCursor !== null ? <Pressable accessibilityRole="button" onPress={() => void loadPets(petCursor)} style={styles.more}><Text style={[styles.link, { color: colors.heading }]}>Cargar más mascotas</Text></Pressable> : null}
        </View>
      </> : null}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { padding: 16, paddingBottom: 40 }, back: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 }, link: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
  card: { marginTop: 16, padding: 22, borderRadius: 22, borderWidth: 1, alignItems: 'center' }, avatar: { width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, photo: { width: 112, height: 112 },
  title: { fontFamily: 'Nunito_700Bold', fontSize: 27, marginTop: 14, textAlign: 'center' }, location: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }, body: { fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 23 },
  bioBlock: { alignSelf: 'stretch', borderTopWidth: 1, marginTop: 22, paddingTop: 18 }, section: { fontFamily: 'Nunito_700Bold', fontSize: 18, marginBottom: 6 },
  center: { alignItems: 'center', gap: 12, marginTop: 70 }, error: { fontFamily: 'Nunito_600SemiBold', fontSize: 15, textAlign: 'center' },
  petsSection: { marginTop: 26 }, petsTitle: { fontFamily: 'Nunito_700Bold', fontSize: 22, marginBottom: 12 }, petFeedback: { alignItems: 'center', gap: 9, marginVertical: 15 }, more: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
