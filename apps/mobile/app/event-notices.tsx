import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter, type Href } from 'expo-router';

import { AnimatedPressable } from '@/components/animated-pressable';
import { PersonListSkeleton } from '@/components/skeleton';
import { petzyColors, spacing } from '@/constants/petzy-theme';
import { useAuthContext } from '@/context/AuthContext';
import { useChatEvent } from '@/context/ChatSocketContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { listEventNotices, markEventNoticeRead, type EventNotice } from '@/lib/events-api';
import { formatRelativeTime } from '@/lib/format';
import { goBackOrReplace } from '@/lib/navigation';

// Avisos de eventos (EV-T18, D-156): cambios de horario o lugar y
// cancelaciones de eventos a los que marcaste «Iré». Tocar uno abre el evento,
// que vuelve a comprobar sesión y acceso; se marca leído solo cuando el
// servidor lo confirma.
export default function EventNoticesScreen() {
  const { token } = useAuthContext(); const router = useRouter();
  const c = petzyColors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const [items, setItems] = useState<EventNotice[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true); const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0); const loaded = useRef(false);

  const load = useCallback(async (next?: number) => {
    if (!token) return; const current = ++requestId.current;
    if (next === undefined) { if (!loaded.current) setLoading(true); } else setLoadingMore(true);
    setError('');
    try {
      const page = await listEventNotices(token, next);
      if (current !== requestId.current) return;
      setItems(old => next === undefined ? page.items : [...old, ...page.items.filter(item => !old.some(row => row.id === item.id))]);
      setCursor(page.nextCursor); loaded.current = true;
    } catch (cause) {
      if (current === requestId.current) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar tus avisos.');
    } finally { if (current === requestId.current) { setLoading(false); setLoadingMore(false); } }
  }, [token]);

  // Al volver (por ejemplo, desde un evento) se refresca sin esqueleto.
  useFocusEffect(useCallback(() => { void load(); return () => { requestId.current++; }; }, [load]));
  // Un aviso que llega con la pantalla abierta aparece arriba.
  useChatEvent('event_notice', notice => setItems(old => old.some(item => item.id === notice.id) ? old : [notice, ...old]));
  useChatEvent('resync', () => { if (loaded.current) void load(); });

  const open = (notice: EventNotice) => {
    if (!token) return;
    router.push((`/events/${notice.event.id}`) as Href);
    if (notice.readAt) return;
    markEventNoticeRead(token, notice.id)
      .then(result => setItems(old => old.map(item => item.id === notice.id ? { ...item, readAt: result.readAt } : item)))
      .catch(() => undefined); // Si falla, sigue sin leer y se puede volver a tocar.
  };

  const renderItem = ({ item }: { item: EventNotice }) => {
    const unread = !item.readAt;
    const cancelled = item.kind === 'CANCELLED';
    return <AnimatedPressable accessibilityRole="button" accessibilityLabel={`${unread ? 'Sin leer. ' : ''}${item.event.title}: ${item.summary}. ${formatRelativeTime(item.createdAt)}`} accessibilityHint="Abre el evento" onPress={() => open(item)}
      style={[styles.row, { backgroundColor: unread ? c.surface : c.background, borderColor: c.border }]}>
      <View style={[styles.icon, { backgroundColor: cancelled ? c.surfaceAlt : c.accent }]}>
        <Ionicons name={cancelled ? 'close-circle-outline' : 'calendar-outline'} size={22} color={cancelled ? c.textPrimary : c.onAccent} />
      </View>
      <View style={styles.text}>
        {/* Aviso corto (12-11-2026): nombre en negritas y debajo solo lo nuevo. */}
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={[styles.eventTitle, { color: c.textPrimary }]}>{item.event.title}</Text>
          <Text style={[styles.time, { color: c.muted }]}>{formatRelativeTime(item.createdAt)}</Text>
        </View>
        <Text numberOfLines={2} style={[styles.summary, { color: cancelled ? c.error : c.muted }]}>{item.summary}</Text>
      </View>
      {unread ? <View style={[styles.dot, { backgroundColor: c.accent }]} /> : null}
    </AnimatedPressable>;
  };

  return <SafeAreaView style={[styles.screen, { backgroundColor: c.background }]} edges={['top', 'bottom']}>
    <View style={[styles.header, { borderBottomColor: c.border }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Volver a Inicio" style={styles.back} onPress={() => goBackOrReplace(router, '/')}>
        <Ionicons name="arrow-back" size={24} color={c.accent} />
      </Pressable>
      <Text accessibilityRole="header" style={[styles.title, { color: c.accent }]}>Avisos de eventos</Text>
    </View>
    {loading ? <View style={styles.pad}><PersonListSkeleton count={4} /></View> : <FlatList
      data={items}
      keyExtractor={item => String(item.id)}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      ListHeaderComponent={<Text style={[styles.intro, { color: c.muted }]}>Te avisamos cuando cambia el horario o el lugar de un evento al que marcaste «Iré», o cuando se cancela.</Text>}
      ListEmptyComponent={error ? undefined : <View style={styles.state}>
        <Ionicons name="notifications-outline" size={40} color={c.accent} />
        <Text style={[styles.stateText, { color: c.textPrimary }]}>No tienes avisos de eventos.</Text>
      </View>}
      ListFooterComponent={<View style={styles.footer}>
        {error ? <><Text accessibilityRole="alert" style={[styles.stateText, { color: c.error }]}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={() => void load(items.length && cursor !== null ? cursor : undefined)} style={styles.retry}><Text style={[styles.link, { color: c.accent }]}>Reintentar</Text></Pressable></> : null}
        {loadingMore ? <ActivityIndicator color={c.accent} accessibilityLabel="Cargando más avisos" /> : null}
        {!error && cursor !== null && !loadingMore ? <Pressable accessibilityRole="button" onPress={() => void load(cursor)} style={styles.retry}><Text style={[styles.link, { color: c.accent }]}>Cargar más avisos</Text></Pressable> : null}
      </View>}
    />}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderBottomWidth: StyleSheet.hairlineWidth },
  back: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontFamily: 'Nunito_700Bold', fontSize: 24 },
  pad: { padding: spacing.lg },
  list: { padding: spacing.lg, paddingBottom: 40, gap: spacing.sm, flexGrow: 1 },
  intro: { fontFamily: 'Nunito_400Regular', fontSize: 15, lineHeight: 22, marginBottom: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: 18, padding: spacing.md, minHeight: 72 },
  icon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  eventTitle: { flex: 1, fontFamily: 'Nunito_700Bold', fontSize: 16 },
  time: { fontFamily: 'Nunito_600SemiBold', fontSize: 12 },
  summary: { fontFamily: 'Nunito_600SemiBold', fontSize: 15, lineHeight: 21 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  state: { alignItems: 'center', gap: spacing.sm, paddingTop: 50 },
  stateText: { fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 23, textAlign: 'center' },
  footer: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.sm },
  retry: { minHeight: 48, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg },
  link: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
});
