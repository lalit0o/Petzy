import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AdoptionCard } from '@/components/adoption-card';
import { AdoptionListSkeleton } from '@/components/skeleton';
import { useToast } from '@/components/toast';
import { petzyColors, spacing } from '@/constants/petzy-theme';
import { useAuthContext } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { listWithdrawn, restoreAdoption, type Adoption } from '@/lib/adoptions-api';
import { goBackOrReplace } from '@/lib/navigation';

// «Mis anuncios retirados» (AD-T14, D-93, D-94): solo los del autor; restaurar
// los vuelve a publicar con el estado que tenían.
export default function WithdrawnAdoptionsScreen() {
  const { token } = useAuthContext(); const router = useRouter(); const toast = useToast();
  const c = petzyColors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const [items, setItems] = useState<Adoption[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true); const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [restoring, setRestoring] = useState<number | null>(null);
  const [restoreError, setRestoreError] = useState<{ id: number; message: string } | null>(null);
  const requestId = useRef(0); const loaded = useRef(false);

  const load = useCallback(async (silent = false) => {
    if (!token) return; const current = ++requestId.current;
    if (!silent) { setLoading(true); setItems([]); setCursor(null); }
    setError('');
    try {
      const page = await listWithdrawn(token);
      if (current !== requestId.current) return;
      setItems(page.items); setCursor(page.nextCursor);
    } catch (cause) {
      if (current === requestId.current) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar tus anuncios retirados.');
    } finally { if (current === requestId.current) setLoading(false); }
  }, [token]);

  useFocusEffect(useCallback(() => {
    const silent = loaded.current; loaded.current = true;
    queueMicrotask(() => void load(silent));
    return () => { requestId.current++; };
  }, [load]));

  const loadMore = async () => {
    if (!token || cursor === null || loadingMore) return;
    const current = requestId.current; setLoadingMore(true); setError('');
    try {
      const page = await listWithdrawn(token, cursor);
      if (current !== requestId.current) return;
      setItems(old => [...old, ...page.items.filter(item => !old.some(row => row.id === item.id))]); setCursor(page.nextCursor);
    } catch (cause) {
      if (current === requestId.current) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar más anuncios.');
    } finally { setLoadingMore(false); }
  };

  const restore = async (item: Adoption) => {
    if (!token || restoring !== null) return;
    setRestoring(item.id); setRestoreError(null);
    try {
      await restoreAdoption(token, item.id);
      setItems(old => old.filter(row => row.id !== item.id));
      toast.show('El anuncio volvió a publicarse');
    } catch (cause) {
      setRestoreError({ id: item.id, message: cause instanceof Error ? cause.message : 'No se pudo restaurar el anuncio.' });
    } finally { setRestoring(null); }
  };

  return <SafeAreaView style={[styles.screen, { backgroundColor: c.background }]} edges={['top', 'bottom']}>
    <FlatList
      data={items}
      keyExtractor={item => String(item.id)}
      contentContainerStyle={styles.content}
      ListHeaderComponent={<View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => goBackOrReplace(router, '/adopcion' as Href)} style={styles.back}><Ionicons name="arrow-back" size={24} color={c.accent} /><Text style={[styles.link, { color: c.accent }]}>Volver</Text></Pressable>
        <Text accessibilityRole="header" style={[styles.title, { color: c.accent }]}>Mis anuncios retirados</Text>
        <Text style={[styles.help, { color: c.muted }]}>Solo tú ves esta lista. Al restaurar un anuncio vuelve a publicarse con el estado que tenía.</Text>
      </View>}
      renderItem={({ item }) => token ? <AdoptionCard item={item} token={token} onPress={() => router.push((`/adoptions/${item.id}`) as Href)} footer={<View style={styles.cardFooter}>
        <Pressable accessibilityRole="button" accessibilityLabel={restoring === item.id ? 'Restaurando anuncio' : `Restaurar ${item.title}`} accessibilityState={{ busy: restoring === item.id, disabled: restoring !== null }} disabled={restoring !== null} onPress={() => void restore(item)} style={[styles.restore, { borderColor: c.accent }]}>
          {restoring === item.id ? <ActivityIndicator color={c.accent} /> : <><Ionicons name="refresh-outline" size={18} color={c.accent} /><Text style={[styles.link, { color: c.accent }]}>{restoreError?.id === item.id ? 'Reintentar restauración' : 'Restaurar anuncio'}</Text></>}
        </Pressable>
        {restoreError?.id === item.id ? <Text accessibilityRole="alert" style={[styles.error, { color: c.error }]}>{restoreError.message}</Text> : null}
      </View>} /> : null}
      ListEmptyComponent={loading ? <AdoptionListSkeleton label="Cargando tus anuncios retirados" />
        : error ? <View style={styles.state}><Text style={[styles.stateText, { color: c.error }]}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void load()} style={styles.retry}><Text style={[styles.link, { color: c.accent }]}>Reintentar</Text></Pressable></View>
        : <View style={styles.state}><Ionicons name="archive-outline" size={40} color={c.accent} /><Text style={[styles.stateText, { color: c.textPrimary }]}>No tienes anuncios retirados.</Text></View>}
      ListFooterComponent={items.length ? <View style={styles.footer}>
        {error ? <Text style={[styles.stateText, { color: c.error }]}>{error}</Text> : null}
        {cursor !== null ? <Pressable accessibilityRole="button" disabled={loadingMore} onPress={() => void loadMore()} style={styles.retry}>{loadingMore ? <ActivityIndicator color={c.accent} accessibilityLabel="Cargando más anuncios" /> : <Text style={[styles.link, { color: c.accent }]}>{error ? 'Reintentar' : 'Cargar más'}</Text>}</Pressable> : null}
      </View> : undefined}
    />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { padding: spacing.lg, paddingBottom: 48, flexGrow: 1 },
  header: { marginBottom: spacing.lg },
  back: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  link: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
  title: { fontFamily: 'Nunito_700Bold', fontSize: 28, marginTop: spacing.sm },
  help: { fontFamily: 'Nunito_400Regular', fontSize: 15, lineHeight: 21, marginTop: 4 },
  cardFooter: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.xs },
  restore: { minHeight: 46, borderWidth: 1, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  error: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, lineHeight: 20 },
  state: { alignItems: 'center', gap: spacing.sm, paddingTop: 60 },
  stateText: { fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 23, textAlign: 'center' },
  retry: { minHeight: 48, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg },
  footer: { alignItems: 'center', gap: spacing.sm },
});
