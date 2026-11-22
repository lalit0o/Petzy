import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { AnimatedPressable } from '@/components/animated-pressable';
import { PetDetailSkeleton } from '@/components/skeleton';
import { useAuthContext } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { cardShadow, iconSize, petzyColors } from '@/constants/petzy-theme';
import { goBackOrReplace } from '@/lib/navigation';
import { getPet, petPhotoSource, removePet, type Pet } from '@/lib/pets-api';

const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export default function PetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const petId = Number(id);
  const { token, user } = useAuthContext();
  const router = useRouter();
  const dark = useColorScheme() === 'dark';
  const palette = petzyColors[dark ? 'dark' : 'light'];
  const colors = { bg: palette.background, card: palette.surface, text: palette.textPrimary, heading: palette.accent, placeholder: palette.surfaceAlt, error: palette.error, muted: palette.muted, border: palette.border };
  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');
  const [photoError, setPhotoError] = useState(false);
  const requestId = useRef(0);
  const tokenRef = useRef(token);
  const loadedId = useRef<number | null>(null);
  useEffect(() => { tokenRef.current = token; }, [token]);
  const removingRef = useRef(false);

  // `silent` evita el parpadeo del esqueleto al volver a esta ficha (por
  // ejemplo, desde el detalle de una publicación que la enlaza).
  const load = useCallback(async (silent = false) => {
    const current = ++requestId.current;
    const access = tokenRef.current;
    if (!user?.id) { setPet(null); setLoading(false); return; }
    if (!access || !Number.isSafeInteger(petId) || petId < 1) { setPet(null); setError('Esta ficha no está disponible.'); setLoading(false); return; }
    if (!silent) { setLoading(true); setPet(null); }
    setError(''); setPhotoError(false);
    try {
      const next = await getPet(access, petId);
      if (current === requestId.current) setPet(next);
    } catch (cause) {
      if (current === requestId.current) setError(cause instanceof Error ? cause.message : 'No se pudo abrir la ficha.');
    } finally { if (current === requestId.current) setLoading(false); }
  }, [user?.id, petId]);
  useFocusEffect(useCallback(() => {
    let active = true;
    const silent = loadedId.current === petId; loadedId.current = petId;
    queueMicrotask(() => { if (active) void load(silent); });
    return () => { active = false; requestId.current++; };
  }, [load, petId]));

  const retire = async () => {
    if (!token || !pet || pet.ownerId !== user?.id || removingRef.current) return;
    removingRef.current = true; setRemoving(true); setError('');
    const current = requestId.current;
    try {
      await removePet(token, pet.id);
      if (current === requestId.current) goBackOrReplace(router, '/mascotas');
    } catch (cause) {
      if (current === requestId.current) {
        const message = cause instanceof Error ? cause.message : 'No se pudo retirar la ficha.';
        setError(message);
        Alert.alert('No se pudo retirar la ficha', message, [{ text: 'Conservar ficha', style: 'cancel' }, { text: 'Reintentar', onPress: () => void retire() }]);
      }
    } finally { removingRef.current = false; setRemoving(false); }
  };
  const confirmRemove = () => Alert.alert('Retirar ficha', 'La mascota dejará de verse en perfiles y publicaciones. Sus datos se conservarán.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Retirar', style: 'destructive', onPress: () => void retire() },
  ]);
  const birth = pet?.birth;
  const birthLabel = birth ? birth.day === null
    ? `Nacimiento aproximado: ${months[birth.month - 1]} de ${birth.year}`
    : `Nacimiento: ${birth.day} de ${months[birth.month - 1]} de ${birth.year}` : '';

  return <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
    <View style={[styles.header, { borderColor: colors.border }]}>
      <AnimatedPressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => goBackOrReplace(router, '/mascotas')} style={styles.back}><Ionicons name="arrow-back" size={24} color={colors.heading} /><Text style={[styles.link, { color: colors.heading }]}>Volver</Text></AnimatedPressable>
    </View>
    <ScrollView contentContainerStyle={styles.content}>
    {loading ? <PetDetailSkeleton /> : null}
    {error && !pet ? <View style={styles.state}><Ionicons name="cloud-offline-outline" size={36} color={colors.error} /><Text style={[styles.body, styles.center, { color: colors.error }]}>{error}</Text><Pressable accessibilityRole="button" accessibilityLabel="Reintentar abrir la ficha" onPress={() => void load()} style={styles.retry}><Text style={[styles.link, { color: colors.heading }]}>Reintentar</Text></Pressable></View> : null}
    {pet ? <View style={[styles.card, cardShadow(dark), { backgroundColor: colors.card }]}>
      <View style={[styles.image, { backgroundColor: colors.placeholder }]}>
        {pet.photoUrl && token && !photoError ? <Image source={petPhotoSource(pet.photoUrl, token)} style={styles.image} contentFit="cover" cachePolicy="memory" onError={() => setPhotoError(true)} accessibilityLabel={`Foto de ${pet.name}`} /> : <Ionicons name="paw-outline" size={iconSize.xl} color={colors.heading} />}
      </View>
      {photoError ? <Pressable accessibilityRole="button" onPress={() => setPhotoError(false)}><Text style={[styles.photoError, { color: colors.error }]}>No se pudo mostrar la foto. Reintentar.</Text></Pressable> : null}
      <Text style={[styles.name, { color: colors.heading }]}>{pet.name}</Text>
      {/* Un dato por fila con su icono (22-11-2026); los textos no cambian. */}
      <View style={styles.facts}>
        <View style={styles.factRow}><Ionicons name="paw-outline" size={20} color={colors.heading} /><Text style={[styles.fact, { color: colors.text }]}>{pet.species} · {pet.breed}</Text></View>
        <View style={styles.factRow}><Ionicons name="time-outline" size={20} color={colors.heading} /><Text style={[styles.fact, { color: colors.text }]}>{pet.isAgeApproximate ? 'Edad aproximada' : 'Edad'}: {pet.age} {pet.age === 1 ? 'año' : 'años'}</Text></View>
        {birthLabel ? <View style={styles.factRow}><Ionicons name="calendar-outline" size={20} color={colors.heading} /><Text style={[styles.fact, { color: colors.text }]}>{birthLabel}</Text></View> : null}
      </View>
      {pet.bio ? <><Text style={[styles.section, { color: colors.heading }]}>Sobre {pet.name}</Text><Text style={[styles.body, { color: colors.text }]}>{pet.bio}</Text></> : null}
      {removing ? <View style={styles.progress}><ActivityIndicator color={colors.error} /><Text style={[styles.link, { color: colors.error }]}>Retirando…</Text></View> : null}
      {error ? <Text style={[styles.body, { color: colors.error }]}>{error}</Text> : null}
    </View> : null}
    {pet && pet.ownerId === user?.id ? <View style={styles.actions}>
      <AnimatedPressable accessibilityRole="button" accessibilityLabel="Editar ficha" disabled={removing} style={[styles.action, { borderColor: colors.heading }]} onPress={() => router.push((`/pets/${pet.id}/edit`) as Href)}><Ionicons name="create-outline" size={20} color={colors.heading} /><Text style={[styles.link, { color: colors.heading }]}>Editar ficha</Text></AnimatedPressable>
      <AnimatedPressable accessibilityRole="button" accessibilityLabel="Retirar ficha" disabled={removing} style={[styles.action, styles.dangerAction, { borderColor: colors.error }]} onPress={confirmRemove}><Ionicons name="trash-outline" size={20} color={colors.error} /><Text style={[styles.link, { color: colors.error }]}>Retirar ficha</Text></AnimatedPressable>
    </View> : null}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progress: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  screen: { flex: 1 }, content: { padding: 16, paddingBottom: 40 }, back: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  link: { fontFamily: 'Nunito_700Bold', fontSize: 16 }, state: { alignItems: 'center', gap: 12, marginTop: 80 },
  body: { fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 23 }, card: { padding: 18, borderRadius: 24 },
  // 4:3 como las fotos de las publicaciones (22-11-2026); antes 250 px fijos.
  image: { width: '100%', aspectRatio: 4 / 3, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photoError: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, marginTop: 8 }, name: { fontFamily: 'Nunito_700Bold', fontSize: 29, lineHeight: 36, letterSpacing: -0.3, marginTop: 18 },
  facts: { gap: 8, marginTop: 10 }, factRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  fact: { flex: 1, fontFamily: 'Nunito_600SemiBold', fontSize: 16, lineHeight: 22 },
  center: { textAlign: 'center' }, retry: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16 }, section: { fontFamily: 'Nunito_700Bold', fontSize: 20, marginTop: 24, marginBottom: 6 },
  actions: { gap: 12, marginTop: 24 }, action: { minHeight: 48, borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  dangerAction: { marginTop: 12 },
});
