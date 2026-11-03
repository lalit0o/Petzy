import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PetForm } from '@/components/pet-form';
import { useAuthContext } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { petzyColors } from '@/constants/petzy-theme';
import { goBackOrReplace } from '@/lib/navigation';
import { getPet, type Pet } from '@/lib/pets-api';

export default function EditPetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const petId = Number(id);
  const { token, user } = useAuthContext();
  const router = useRouter();
  const tokenRef = useRef(token);
  const requestId = useRef(0);
  const ownerId = user?.id;
  useEffect(() => { tokenRef.current = token; }, [token]);
  const dark = useColorScheme() === 'dark';
  const palette = petzyColors[dark ? 'dark' : 'light'];
  const colors = { bg: palette.background, text: palette.textPrimary, heading: palette.accent, error: palette.error };
  const [pet, setPet] = useState<Pet | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    const current = ++requestId.current;
    const access = tokenRef.current;
    setPet(null);
    if (!access || !Number.isSafeInteger(petId) || petId < 1) { setError('Esta ficha no está disponible.'); setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const next = await getPet(access, petId);
      if (current !== requestId.current) return;
      if (next.ownerId !== ownerId) { setPet(null); setError('Solo el dueño puede editar esta ficha.'); }
      else setPet(next);
    } catch (cause) { if (current === requestId.current) setError(cause instanceof Error ? cause.message : 'No se pudo abrir la ficha.'); }
    finally { if (current === requestId.current) setLoading(false); }
  }, [petId, ownerId]);
  useFocusEffect(useCallback(() => {
    let active = true; queueMicrotask(() => { if (active) void load(); });
    return () => { active = false; requestId.current++; };
  }, [load]));
  if (pet) return <PetForm key={pet.id} pet={pet} />;
  return <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
    <Pressable accessibilityRole="button" onPress={() => goBackOrReplace(router, '/mascotas')} style={styles.back}><Text style={[styles.link, { color: colors.heading }]}>Volver</Text></Pressable><View style={styles.state}>
    {loading ? <><ActivityIndicator color={colors.heading} /><Text style={[styles.body, { color: colors.text }]}>Cargando ficha…</Text></> : <><Text style={[styles.body, { color: colors.error }]}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void load()}><Text style={[styles.link, { color: colors.heading }]}>Reintentar</Text></Pressable></>}
  </View></SafeAreaView>;
}

const styles = StyleSheet.create({ back: { minHeight: 44, paddingHorizontal: 16, justifyContent: 'center' }, screen: { flex: 1 }, state: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }, body: { fontFamily: 'Nunito_400Regular', fontSize: 16, textAlign: 'center' }, link: { fontFamily: 'Nunito_700Bold', fontSize: 16 } });
