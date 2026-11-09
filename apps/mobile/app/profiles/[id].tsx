import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { useAuthContext } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { goBackOrReplace } from '@/lib/navigation';
import { openConversation } from '@/lib/chat-api';
import { getPublicProfile, profilePhotoSource, type PublicProfile } from '@/lib/profiles-api';
import { listPets, type Pet } from '@/lib/pets-api';
import { PetCard } from '@/components/pet-card';
import { PetListSkeleton, PublicProfileSkeleton } from '@/components/skeleton';
import { petzyColors } from '@/constants/petzy-theme';

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token, user } = useAuthContext();
  const [opening, setOpening] = useState(false); const [openError, setOpenError] = useState('');
  const palette = petzyColors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const colors = { background: palette.background, card: palette.surface, text: palette.textPrimary, heading: palette.accent, border: palette.border, muted: palette.muted, error: palette.error, avatar: palette.surfaceAlt };
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [photoError, setPhotoError] = useState(false);
  const [pets, setPets] = useState<Pet[]>([]);
  const [petCursor, setPetCursor] = useState<number | null>(null);
  const [petsLoading, setPetsLoading] = useState(true);
  const [petsError, setPetsError] = useState('');
  const generation = useRef(0);
  const petRequest = useRef(0);
  const petBusy = useRef(false);
  const loadedId = useRef<string | undefined>(undefined);

  // `silent` evita el parpadeo del esqueleto al volver a este perfil (por
  // ejemplo, desde el detalle de una mascota suya).
  const load = useCallback(async (silent = false) => {
    if (!token || !id) return;
    const current = ++generation.current;
    petRequest.current++; petBusy.current = false;
    // `petsLoading` arranca en `true` (no en `false`) para que la sección de
    // mascotas muestre su propio esqueleto en vez de un "todavía no tiene
    // mascotas" momentáneo antes de que el efecto de abajo pida la lista real.
    if (!silent) { setLoading(true); setProfile(null); setPets([]); setPetCursor(null); setPetsLoading(true); }
    setError(''); setPhotoError(false); setPetsError('');
    try {
      const next = await getPublicProfile(token, id);
      if (current === generation.current) setProfile(next);
    } catch (cause) {
      if (current === generation.current) setError(cause instanceof Error ? cause.message : 'No se pudo cargar este perfil.');
    } finally { if (current === generation.current) setLoading(false); }
  }, [id, token]);

  useFocusEffect(useCallback(() => {
    let active = true;
    const silent = loadedId.current === id; loadedId.current = id;
    queueMicrotask(() => { if (active) void load(silent); });
    return () => { active = false; generation.current++; petRequest.current++; petBusy.current = false; };
  }, [load, id]));

  const loadPets = useCallback(async (cursor?: number) => {
    if (!token || !id || petBusy.current) return;
    petBusy.current = true;
    const current = generation.current; const request = ++petRequest.current;
    setPetsLoading(true); setPetsError('');
    try {
      const page = await listPets(token, id, cursor);
      if (current !== generation.current || request !== petRequest.current) return;
      setPets(previous => cursor === undefined ? page.items : [...previous, ...page.items.filter(pet => !previous.some(item => item.id === pet.id))]);
      setPetCursor(page.nextCursor);
    } catch (cause) {
      if (current === generation.current && request === petRequest.current) setPetsError(cause instanceof Error ? cause.message : 'No se pudieron cargar las mascotas.');
    } finally {
      if (current === generation.current && request === petRequest.current) { petBusy.current = false; setPetsLoading(false); }
    }
  }, [id, token]);

  useFocusEffect(useCallback(() => {
    if (!profile || profile.id !== id) return;
    let active = true;
    queueMicrotask(() => { if (active) void loadPets(); });
    return () => { active = false; };
  }, [id, profile, loadPets]));

  // D-75: abre el chat existente con esta persona o crea uno, y entra a él.
  const startChat = async () => {
    if (!token || !profile || opening) return;
    setOpening(true); setOpenError('');
    try {
      const conversation = await openConversation(token, profile.id);
      router.push((`/messages/${conversation.id}`) as Href);
    } catch (cause) {
      setOpenError(cause instanceof Error ? cause.message : 'No se pudo abrir la conversación.');
    } finally { setOpening(false); }
  };

  const state = profile?.locatedAt.toLowerCase().split('_').map(part => part[0].toUpperCase() + part.slice(1)).join(' ');
  return <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => goBackOrReplace(router, '/buscar')} style={styles.back}><Ionicons name="arrow-back" size={24} color={colors.heading} /><Text style={[styles.link, { color: colors.heading }]}>Volver</Text></Pressable>
      {loading ? <PublicProfileSkeleton /> : null}
      {error ? <View style={styles.center}><Text style={[styles.error, { color: colors.error }]}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void load()}><Text style={[styles.link, { color: colors.heading }]}>Reintentar</Text></Pressable></View> : null}
      {profile ? <>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.avatar }]}>
            {profile.avatarUrl && token && !photoError ? <Image source={profilePhotoSource(profile.avatarUrl, token)} style={styles.photo} contentFit="cover" cachePolicy="memory" onError={() => setPhotoError(true)} /> : <Ionicons name="person-outline" size={48} color={colors.heading} />}
          </View>
          {photoError ? <Pressable accessibilityRole="button" onPress={() => setPhotoError(false)}><Text style={[styles.error, { color: colors.error }]}>No se pudo mostrar la foto. Reintentar.</Text></Pressable> : null}
          <Text style={[styles.title, { color: colors.heading }]}>{profile.username}</Text>
          <View style={styles.location}><Ionicons name="location-outline" size={18} color={colors.muted} /><Text style={[styles.body, { color: colors.muted }]}>{state}</Text></View>
          {profile.id !== user?.id ? <>
            <Pressable accessibilityRole="button" accessibilityLabel={opening ? 'Abriendo conversación' : `Enviar mensaje a ${profile.username}`} accessibilityState={{ disabled: opening, busy: opening }} disabled={opening} onPress={() => void startChat()}
              style={({ pressed }) => [styles.message, { backgroundColor: colors.heading, opacity: pressed ? 0.85 : 1 }]}>
              {opening ? <ActivityIndicator color={palette.onAccent} /> : <><Ionicons name="chatbubble-outline" size={20} color={palette.onAccent} /><Text style={[styles.messageText, { color: palette.onAccent }]}>Enviar mensaje</Text></>}
            </Pressable>
            {openError ? <Text accessibilityRole="alert" style={[styles.error, styles.openError, { color: colors.error }]}>{openError}</Text> : null}
          </> : null}
          {profile.bio ? <View style={[styles.bioBlock, { borderColor: colors.border }]}><Text style={[styles.section, { color: colors.heading }]}>Sobre esta persona</Text><Text style={[styles.body, { color: colors.text }]}>{profile.bio}</Text></View> : null}
        </View>
        <View style={styles.petsSection}>
          <Text style={[styles.petsTitle, { color: colors.heading }]}>Sus mascotas</Text>
          {pets.map(pet => token ? <PetCard key={pet.id} pet={pet} token={token} /> : null)}
          {petsLoading && pets.length === 0 ? <PetListSkeleton count={2} /> : null}
          {petsLoading && pets.length > 0 ? <View style={styles.petFeedback}><ActivityIndicator color={colors.heading} /><Text style={[styles.body, { color: colors.text }]}>Cargando más mascotas…</Text></View> : null}
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
  message: { alignSelf: 'stretch', minHeight: 50, borderRadius: 16, marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, messageText: { fontFamily: 'Nunito_700Bold', fontSize: 16 }, openError: { marginTop: 8 },
  center: { alignItems: 'center', gap: 12, marginTop: 70 }, error: { fontFamily: 'Nunito_600SemiBold', fontSize: 15, textAlign: 'center' },
  petsSection: { marginTop: 26 }, petsTitle: { fontFamily: 'Nunito_700Bold', fontSize: 22, marginBottom: 12 }, petFeedback: { alignItems: 'center', gap: 9, marginVertical: 15 }, more: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
