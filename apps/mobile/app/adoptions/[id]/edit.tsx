import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdoptionForm } from '@/components/adoption-form';
import { AdoptionDetailSkeleton } from '@/components/skeleton';
import { petzyColors, spacing } from '@/constants/petzy-theme';
import { useAuthContext } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getAdoption, type Adoption } from '@/lib/adoptions-api';
import { goBackOrReplace } from '@/lib/navigation';

// Editar un anuncio propio y activo (AD-T13). Se carga una sola vez para no
// perder lo que se está escribiendo al volver de elegir fotos.
export default function EditAdoptionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const adoptionId = Number(id);
  const { token } = useAuthContext(); const router = useRouter();
  const c = petzyColors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const [adoption, setAdoption] = useState<Adoption | null>(null);
  const [error, setError] = useState(''); const [attempt, setAttempt] = useState(0);

  useFocusEffect(useCallback(() => {
    // `attempt` cambia al tocar «Reintentar» para volver a pedir el anuncio.
    if (!token || adoption || attempt < 0) return;
    let active = true;
    queueMicrotask(async () => {
      try {
        const found = await getAdoption(token, adoptionId);
        if (!active) return;
        if (!found.mine) setError('Solo quien publicó el anuncio puede editarlo.');
        else if (!found.isActive) setError('Este anuncio está retirado. Restáuralo para editarlo.');
        else setAdoption(found);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'No se pudo abrir el anuncio.');
      }
    });
    return () => { active = false; };
  }, [token, adoptionId, adoption, attempt]));

  if (adoption) return <AdoptionForm adoption={adoption} />;
  return <SafeAreaView style={[styles.screen, { backgroundColor: c.background }]} edges={['top', 'bottom']}>
    <View style={styles.content}>
      <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => goBackOrReplace(router, (`/adoptions/${adoptionId}`) as Href)} style={styles.back}><Ionicons name="arrow-back" size={24} color={c.accent} /><Text style={[styles.link, { color: c.accent }]}>Volver</Text></Pressable>
      {error ? <View style={styles.state}>
        <Text style={[styles.text, { color: c.error }]}>{error}</Text>
        <Pressable accessibilityRole="button" onPress={() => { setError(''); setAttempt(a => a + 1); }} style={styles.back}><Text style={[styles.link, { color: c.accent }]}>Reintentar</Text></Pressable>
      </View> : <AdoptionDetailSkeleton />}
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { padding: spacing.lg },
  back: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  link: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
  state: { alignItems: 'center', gap: spacing.sm, marginTop: 70 },
  text: { fontFamily: 'Nunito_600SemiBold', fontSize: 16, textAlign: 'center' },
});
