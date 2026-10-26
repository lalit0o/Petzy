import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PetForm } from '@/components/pet-form';
import { useAuthContext } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { goBackOrReplace } from '@/lib/navigation';
import { getPet, type Pet } from '@/lib/pets-api';

export default function EditPetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const petId = Number(id);
  const { token, user } = useAuthContext();
  const router = useRouter();
  const dark = useColorScheme() === 'dark';
  const colors = dark ? { bg: '#182213', text: '#DBDFD0', heading: '#82A87E', error: '#F0A59A' } : { bg: '#DBDFD0', text: '#111212', heading: '#365625', error: '#8C3F37' };
  const [pet, setPet] = useState<Pet | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!token || !Number.isSafeInteger(petId) || petId < 1) { setError('Esta ficha no está disponible.'); setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const next = await getPet(token, petId);
      if (next.ownerId !== user?.id) { setPet(null); setError('Solo el dueño puede editar esta ficha.'); }
      else setPet(next);
    } catch (cause) { setPet(null); setError(cause instanceof Error ? cause.message : 'No se pudo abrir la ficha.'); }
    finally { setLoading(false); }
  }, [token, petId, user]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (pet) return <PetForm pet={pet} />;
  return <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}><View style={styles.state}>
    {loading ? <><ActivityIndicator color={colors.heading} /><Text style={[styles.body, { color: colors.text }]}>Cargando ficha…</Text></> : <><Text style={[styles.body, { color: colors.error }]}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void load()}><Text style={[styles.link, { color: colors.heading }]}>Reintentar</Text></Pressable><Pressable accessibilityRole="button" onPress={() => goBackOrReplace(router, '/mascotas')}><Text style={[styles.link, { color: colors.heading }]}>Volver</Text></Pressable></>}
  </View></SafeAreaView>;
}

const styles = StyleSheet.create({ screen: { flex: 1 }, state: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }, body: { fontFamily: 'Nunito_400Regular', fontSize: 16, textAlign: 'center' }, link: { fontFamily: 'Nunito_700Bold', fontSize: 16 } });
