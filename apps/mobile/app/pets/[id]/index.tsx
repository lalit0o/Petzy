import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View, type ViewInstance } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { useAuthContext } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { goBackOrReplace } from '@/lib/navigation';
import { AnchoredMenu, AnchoredMenuItem } from '@/components/anchored-menu';
import { getPet, petPhotoSource, removePet, type Pet } from '@/lib/pets-api';

const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export default function PetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const petId = Number(id);
  const { token, user } = useAuthContext();
  const router = useRouter();
  const dark = useColorScheme() === 'dark';
  const colors = dark
    ? { bg: '#182213', card: '#20311C', text: '#DBDFD0', heading: '#82A87E', placeholder: '#404F4D', error: '#F0A59A' }
    : { bg: '#DBDFD0', card: '#F8F7F0', text: '#111212', heading: '#365625', placeholder: '#DED0A5', error: '#8C3F37' };
  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');
  const [photoError, setPhotoError] = useState(false);
  const requestId = useRef(0);
  const tokenRef = useRef(token);
  useEffect(() => { tokenRef.current = token; }, [token]);
  const removingRef = useRef(false);
  const menuButton = useRef<ViewInstance>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState({ x: 0, y: 0, bottom: 0 });

  const load = useCallback(async () => {
    const current = ++requestId.current;
    const access = tokenRef.current;
    if (!user?.id) { setPet(null); setLoading(false); return; }
    if (!access || !Number.isSafeInteger(petId) || petId < 1) { setPet(null); setError('Esta ficha no está disponible.'); setLoading(false); return; }
    setLoading(true); setError(''); setPhotoError(false); setPet(null); setMenuOpen(false);
    try {
      const next = await getPet(access, petId);
      if (current === requestId.current) setPet(next);
    } catch (cause) {
      if (current === requestId.current) setError(cause instanceof Error ? cause.message : 'No se pudo abrir la ficha.');
    } finally { if (current === requestId.current) setLoading(false); }
  }, [user?.id, petId]);
  useFocusEffect(useCallback(() => {
    let active = true;
    queueMicrotask(() => { if (active) void load(); });
    return () => { active = false; requestId.current++; };
  }, [load]));

  const retire = async () => {
    if (!token || !pet || pet.ownerId !== user?.id || removingRef.current) return;
    removingRef.current = true; setRemoving(true); setError('');
    const current = requestId.current;
    try {
      await removePet(token, pet.id);
      if (current === requestId.current) router.replace('/mascotas');
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
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => goBackOrReplace(router, '/mascotas')} style={styles.back}><Ionicons name="arrow-back" size={24} color={colors.heading} /><Text style={[styles.link, { color: colors.heading }]}>Volver</Text></Pressable>
      {pet?.ownerId === user?.id && pet ? <View ref={menuButton} collapsable={false}><Pressable accessibilityRole="button" accessibilityLabel="Opciones de la mascota" accessibilityState={{ expanded: menuOpen, disabled: removing }} disabled={removing} style={styles.menuButton} onPress={() => menuButton.current?.measureInWindow((x, y, width, height) => { setMenuAnchor({ x: x + width / 2, y: y + height / 2, bottom: y + height }); setMenuOpen(true); })}><Ionicons name="ellipsis-horizontal" size={25} color={colors.heading} /></Pressable></View> : null}
    </View>
    <ScrollView contentContainerStyle={styles.content}>
    {loading ? <View style={styles.state}><ActivityIndicator color={colors.heading} /><Text style={[styles.body, { color: colors.text }]}>Cargando ficha…</Text></View> : null}
    {error && !pet ? <View style={styles.state}><Text style={[styles.body, { color: colors.error }]}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void load()}><Text style={[styles.link, { color: colors.heading }]}>Reintentar</Text></Pressable></View> : null}
    {pet ? <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={[styles.image, { backgroundColor: colors.placeholder }]}>
        {pet.photoUrl && token && !photoError ? <Image source={petPhotoSource(pet.photoUrl, token)} style={styles.image} contentFit="cover" cachePolicy="none" onError={() => setPhotoError(true)} accessibilityLabel={`Foto de ${pet.name}`} /> : <Ionicons name="paw-outline" size={72} color={colors.heading} />}
      </View>
      {photoError ? <Pressable accessibilityRole="button" onPress={() => setPhotoError(false)}><Text style={[styles.photoError, { color: colors.error }]}>No se pudo mostrar la foto. Reintentar.</Text></Pressable> : null}
      <Text style={[styles.name, { color: colors.heading }]}>{pet.name}</Text>
      <Text style={[styles.fact, { color: colors.text }]}>{pet.species} · {pet.breed}</Text>
      <Text style={[styles.fact, { color: colors.text }]}>{pet.isAgeApproximate ? 'Edad aproximada' : 'Edad'}: {pet.age} {pet.age === 1 ? 'año' : 'años'}</Text>
      <Text style={[styles.fact, { color: colors.text }]}>{birthLabel}</Text>
      {pet.bio ? <><Text style={[styles.section, { color: colors.heading }]}>Sobre {pet.name}</Text><Text style={[styles.body, { color: colors.text }]}>{pet.bio}</Text></> : null}
      {removing ? <View style={styles.progress}><ActivityIndicator color={colors.error} /><Text style={[styles.link, { color: colors.error }]}>Retirando…</Text></View> : null}
      {error ? <Text style={[styles.body, { color: colors.error }]}>{error}</Text> : null}
    </View> : null}
    </ScrollView>
    <AnchoredMenu visible={menuOpen && !!pet && pet.ownerId === user?.id} anchor={menuAnchor} onClose={() => setMenuOpen(false)} title="Tu mascota" width={260} estimatedHeight={220}>
      <AnchoredMenuItem label="Editar ficha" icon="create-outline" onPress={() => { if (pet && !removingRef.current) router.push((`/pets/${pet.id}/edit`) as Href); }} />
      <AnchoredMenuItem label="Retirar ficha" icon="trash-outline" destructive onPress={confirmRemove} />
      <AnchoredMenuItem label="Cancelar" separator={false} />
    </AnchoredMenu>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, menuButton: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  progress: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  screen: { flex: 1 }, content: { padding: 16, paddingBottom: 40 }, back: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  link: { fontFamily: 'Nunito_700Bold', fontSize: 16 }, state: { alignItems: 'center', gap: 12, marginTop: 80 },
  body: { fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 23 }, card: { padding: 18, borderRadius: 24 },
  image: { width: '100%', height: 250, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photoError: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, marginTop: 8 }, name: { fontFamily: 'Nunito_700Bold', fontSize: 29, marginTop: 18 },
  fact: { fontFamily: 'Nunito_600SemiBold', fontSize: 16, lineHeight: 24, marginTop: 4 }, section: { fontFamily: 'Nunito_700Bold', fontSize: 20, marginTop: 24, marginBottom: 6 },
  actions: { flexDirection: 'row', gap: 20, marginTop: 24 }, action: { minHeight: 48, justifyContent: 'center' },
});
