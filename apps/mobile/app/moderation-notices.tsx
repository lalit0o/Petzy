import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';

import { CommunityButton, CommunityMessage, useCommunityColors } from '@/components/community-ui';
import { ModerationNoticeCard } from '@/components/moderation-notice-card';
import { PersonListSkeleton } from '@/components/skeleton';
import { useAuthContext } from '@/context/AuthContext';
import { goBackOrReplace } from '@/lib/navigation';
import { listModerationNotices, type ModerationNotice } from '@/lib/moderation-notices-api';

// Historial de avisos de moderación (D-143): todos, vistos o no, del más reciente
// al más antiguo. Es de solo lectura; los avisos pendientes se confirman en el
// aviso «Entendido».
export default function ModerationNoticesScreen() {
  const { token } = useAuthContext();
  const router = useRouter();
  const c = useCommunityColors();
  const [items, setItems] = useState<ModerationNotice[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const loaded = useRef(false);

  const load = useCallback(async (next?: number) => {
    if (!token) return;
    const current = ++requestId.current;
    if (next === undefined) { if (!loaded.current) setLoading(true); } else setLoadingMore(true);
    setError('');
    try {
      const page = await listModerationNotices(token, { cursor: next });
      if (current !== requestId.current) return;
      setItems(old => next === undefined ? page.items : [...old, ...page.items.filter(item => !old.some(row => row.id === item.id))]);
      setCursor(page.nextCursor); loaded.current = true;
    } catch (cause) {
      if (current !== requestId.current) return;
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar tus avisos.');
    } finally { if (current === requestId.current) { setLoading(false); setLoadingMore(false); } }
  }, [token]);

  // Se vuelve a consultar al regresar a la pantalla, sin parpadeo si ya había datos.
  useFocusEffect(useCallback(() => { void load(); return () => { requestId.current++; }; }, [load]));

  return <SafeAreaView style={[styles.screen, { backgroundColor: c.bg }]} edges={['top', 'bottom']}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Volver a Mi perfil" style={styles.back} onPress={() => goBackOrReplace(router, '/perfil')}>
        <Ionicons name="arrow-back" size={24} color={c.heading} />
      </Pressable>
      <Text accessibilityRole="header" style={[styles.title, { color: c.heading }]}>Avisos de moderación</Text>
    </View>
    {loading ? <View style={styles.pad}><PersonListSkeleton /></View> : <FlatList
      data={items}
      keyExtractor={item => String(item.id)}
      contentContainerStyle={styles.list}
      ListHeaderComponent={<Text style={[styles.intro, { color: c.text }]}>Aquí queda registro de lo que la moderación de una comunidad retiró de lo que publicaste, con su motivo.</Text>}
      renderItem={({ item }) => <ModerationNoticeCard notice={item} showStatus />}
      ListEmptyComponent={error ? undefined : <Text style={[styles.empty, { color: c.muted }]}>No tienes avisos de moderación.</Text>}
      ListFooterComponent={<View style={styles.footer}>
        <CommunityMessage text={error} error />
        {error ? <CommunityButton label="Reintentar" secondary onPress={() => void load(items.length && cursor !== null ? cursor : undefined)} /> : null}
        {loadingMore ? <ActivityIndicator color={c.heading} accessibilityLabel="Cargando más avisos" /> : null}
        {!error && cursor !== null && !loadingMore ? <CommunityButton label="Cargar más avisos" secondary onPress={() => void load(cursor)} /> : null}
      </View>}
    />}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 },
  back: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontFamily: 'Nunito_700Bold', fontSize: 24 },
  pad: { padding: 16 },
  list: { padding: 16, paddingBottom: 40, gap: 12 },
  intro: { fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 24, marginBottom: 4 },
  empty: { fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 24, textAlign: 'center', marginTop: 32 },
  footer: { gap: 12, marginTop: 4 },
});
