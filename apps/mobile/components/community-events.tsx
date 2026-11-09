import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { CommunityButton, CommunityMessage, ui, useCommunityColors } from '@/components/community-ui';
import { useAuthContext } from '@/context/AuthContext';
import { EventApiError, eventCoverSource, listEvents, type CommunityEvent, type EventPhase } from '@/lib/events-api';
import { eventShortMoment, sectionLabel, stateLabel } from '@/lib/event-format';
import { cardShadow } from '@/constants/petzy-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Section = { items: CommunityEvent[]; cursor: number | null; loading: boolean; error: string };
const ORDER: EventPhase[] = ['ongoing', 'upcoming', 'past'];
const empty = (): Section => ({ items: [], cursor: null, loading: true, error: '' });
const emptyText: Record<EventPhase, string> = {
  ongoing: 'Ningún evento está en curso.',
  upcoming: 'No hay eventos próximos.',
  past: 'Todavía no hay eventos anteriores.',
};

// Tarjeta: portada o respaldo, título, fecha y hora, y lugar breve (DI-EV-01).
export function EventCard({ event, token }: { event: CommunityEvent; token: string }) {
  const c = useCommunityColors(); const router = useRouter(); const dark = useColorScheme() === 'dark';
  const [failed, setFailed] = useState(false);
  const cancelled = event.status === 'CANCELLED';
  return <Pressable accessibilityRole="button" accessibilityLabel={`Abrir evento ${event.title}${cancelled ? ', cancelado' : ''}`} onPress={() => router.push((`/events/${event.id}`) as Href)}
    style={({ pressed }) => [styles.card, cardShadow(dark), { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.85 : 1 }]}>
    <View style={[styles.cover, { backgroundColor: c.bg }]}>
      {event.coverPath && !failed
        ? <Image source={eventCoverSource(event.coverPath, token)} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory" onError={() => setFailed(true)} accessibilityLabel={`Portada de ${event.title}`} />
        : <Ionicons name="calendar-outline" size={30} color={c.heading} />}
    </View>
    <View style={styles.body}>
      {cancelled || event.phase === 'ongoing' ? <Text style={[styles.badge, { color: cancelled ? c.error : c.heading, borderColor: cancelled ? c.error : c.heading }]}>{stateLabel(event)}</Text> : null}
      <Text style={[styles.title, { color: c.heading }]} numberOfLines={2}>{event.title}</Text>
      <View style={styles.line}><Ionicons name="time-outline" size={15} color={c.muted} /><Text style={[ui.muted, styles.flex, { color: c.text }]} numberOfLines={1}>{eventShortMoment(event.startsAt, event.timeZone)}</Text></View>
      <View style={styles.line}><Ionicons name="location-outline" size={15} color={c.muted} /><Text style={[ui.muted, styles.flex, { color: c.text }]} numberOfLines={1}>{event.placeLabel}</Text></View>
    </View>
  </Pressable>;
}

// Sección «Eventos» de una comunidad: «En curso», «Próximos» y «Eventos
// anteriores», cada una con su carga, vacío, error y «Ver más eventos».
export function CommunityEvents({ communityId, canCreate, onAccessLost }: { communityId: number; canCreate: boolean; onAccessLost?: () => void }) {
  const { token } = useAuthContext(); const router = useRouter(); const c = useCommunityColors();
  const [sections, setSections] = useState<Record<EventPhase, Section>>({ ongoing: empty(), upcoming: empty(), past: empty() });
  const requests = useRef<Record<EventPhase, number>>({ ongoing: 0, upcoming: 0, past: 0 });
  const loaded = useRef(false);
  // Dos pestañas: «Próximos» (incluye «En curso» arriba) y «Eventos anteriores».
  const [view, setView] = useState<'upcoming' | 'past'>('upcoming');

  const patch = (section: EventPhase, change: Partial<Section>) => setSections(old => ({ ...old, [section]: { ...old[section], ...change } }));

  const load = useCallback(async function loadSection(section: EventPhase, cursor?: number, silent = false): Promise<void> {
    if (!token) return;
    const current = ++requests.current[section];
    setSections(old => ({ ...old, [section]: { ...old[section], loading: !silent || cursor !== undefined, error: '' } }));
    try {
      const page = await listEvents(token, communityId, section, cursor);
      if (current !== requests.current[section]) return;
      setSections(old => ({ ...old, [section]: { items: cursor === undefined ? page.items : [...old[section].items, ...page.items.filter(item => !old[section].items.some(row => row.id === item.id))], cursor: page.nextCursor, loading: false, error: '' } }));
    } catch (cause) {
      if (current !== requests.current[section]) return;
      // El cursor dejó de pertenecer a la lista (el evento cambió de sección): se recarga.
      if (cause instanceof EventApiError && cause.status === 400 && cursor !== undefined) { await loadSection(section); return; }
      if (cause instanceof EventApiError && [403, 404].includes(cause.status)) { onAccessLost?.(); }
      patch(section, { loading: false, error: cause instanceof Error ? cause.message : 'No se pudieron cargar los eventos.' });
    }
  }, [token, communityId, onAccessLost]);

  // Al volver de un detalle o del formulario se actualiza sin parpadeo.
  useFocusEffect(useCallback(() => {
    const silent = loaded.current; loaded.current = true;
    for (const section of ORDER) void load(section, undefined, silent);
    const current = requests.current;
    return () => { for (const section of ORDER) current[section]++; };
  }, [load]));

  if (!token) return null;
  return <View style={styles.wrap}>
    {canCreate ? <CommunityButton label="Crear evento" onPress={() => router.push((`/communities/${communityId}/events/create`) as Href)} /> : null}
    <View accessibilityRole="tablist" style={[styles.tabs, { borderColor: c.border }]}>
      {([['upcoming', 'Próximos'], ['past', 'Eventos anteriores']] as const).map(([key, label]) => <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: view === key }} onPress={() => setView(key)} style={[styles.tab, view === key && { backgroundColor: c.heading }]}>
        <Text style={[styles.tabText, { color: view === key ? c.actionText : c.heading }]}>{label}</Text>
      </Pressable>)}
    </View>
    {(view === 'upcoming' ? (['ongoing', 'upcoming'] as EventPhase[]) : (['past'] as EventPhase[])).map(section => {
      const state = sections[section];
      // «En curso» solo aparece si hay algo que mostrar o si falló.
      if (section === 'ongoing' && !state.items.length && !state.error) return null;
      return <View key={section} style={styles.section}>
        {section === 'ongoing' || (section === 'upcoming' && (sections.ongoing.items.length > 0 || !!sections.ongoing.error)) ? <Text accessibilityRole="header" style={[ui.heading, { color: c.heading }]}>{sectionLabel[section]}</Text> : null}
        {state.loading && !state.items.length ? <ActivityIndicator color={c.heading} accessibilityLabel={`Cargando ${sectionLabel[section].toLowerCase()}`} /> : null}
        {!state.loading && !state.error && !state.items.length ? <Text style={[ui.body, { color: c.muted }]}>{emptyText[section]}</Text> : null}
        {state.items.map(event => <EventCard key={event.id} event={event} token={token} />)}
        <CommunityMessage text={state.error} error />
        {state.error ? <CommunityButton label="Reintentar" secondary onPress={() => void load(section, state.items.length && state.cursor !== null ? state.cursor : undefined)} /> : null}
        {!state.error && state.cursor !== null ? <CommunityButton label="Ver más eventos" secondary busy={state.loading} onPress={() => void load(section, state.cursor ?? undefined)} /> : null}
      </View>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  wrap: { gap: 18 },
  tabs: { flexDirection: 'row', borderWidth: 1, borderRadius: 14, padding: 4, gap: 4 },
  tab: { flex: 1, minHeight: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  tabText: { fontFamily: 'Nunito_700Bold', fontSize: 15, textAlign: 'center' },
  section: { gap: 12 },
  card: { flexDirection: 'row', borderWidth: 1, borderRadius: 18, overflow: 'hidden', minHeight: 112 },
  cover: { width: 104, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  body: { flex: 1, padding: 12, gap: 4, justifyContent: 'center' },
  badge: { alignSelf: 'flex-start', fontFamily: 'Nunito_700Bold', fontSize: 12, borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 1, overflow: 'hidden' },
  title: { fontFamily: 'Nunito_700Bold', fontSize: 17, lineHeight: 23 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  flex: { flex: 1 },
});
