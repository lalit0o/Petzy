import { useCallback, useRef, useState } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FormScrollView } from '@/components/form-scroll-view';
import { CommunityButton, CommunityMessage, ui, useCommunityColors } from '@/components/community-ui';
import { EventDetailSkeleton } from '@/components/skeleton';
import { useToast } from '@/components/toast';
import { useAuthContext } from '@/context/AuthContext';
import { cancelEvent, eventCoverSource, getEvent, newRequestKey, respondEvent, EventApiError, type CommunityEvent, type EventResponse } from '@/lib/events-api';
import { eventMoment, eventTime, goingLabel, sameDay, stateLabel } from '@/lib/event-format';
import { goBackOrReplace } from '@/lib/navigation';
import { petzyColors, radius, spacing } from '@/constants/petzy-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// «Cómo llegar» abre la app de mapas del teléfono (D-10); Petzy no calcula rutas.
function openDirections(event: CommunityEvent) {
  const { latitude: lat, longitude: lng } = event;
  const label = encodeURIComponent(event.placeLabel);
  const url = Platform.OS === 'ios' ? `http://maps.apple.com/?daddr=${lat},${lng}&q=${label}` : `geo:${lat},${lng}?q=${lat},${lng}(${label})`;
  Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`).catch(() => Alert.alert('No se pudo abrir el mapa', 'Abre tu app de mapas y busca el lugar escrito en el evento.')));
}

export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const eventId = Number(id);
  const { token } = useAuthContext(); const router = useRouter(); const c = useCommunityColors(); const toast = useToast();
  const surfaceAlt = petzyColors[useColorScheme() === 'dark' ? 'dark' : 'light'].surfaceAlt;
  const [event, setEvent] = useState<CommunityEvent | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [gone, setGone] = useState(false);
  const [responding, setResponding] = useState<EventResponse | null>(null); const [respondError, setRespondError] = useState(''); const [lastResponse, setLastResponse] = useState<EventResponse | null>(null);
  const [cancelling, setCancelling] = useState(false); const [cancelError, setCancelError] = useState('');
  const [coverFailed, setCoverFailed] = useState(false);
  const requestId = useRef(0); const acting = useRef(false); const cancelKey = useRef<string | null>(null); const loadedId = useRef<number | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!token) return; const current = ++requestId.current;
    if (!silent) { setLoading(true); setEvent(null); }
    setError('');
    try {
      const found = await getEvent(token, eventId);
      if (current !== requestId.current) return;
      setEvent(found); setGone(false);
    } catch (cause) {
      if (current !== requestId.current) return;
      // Expulsión o evento inexistente: se retiran los datos que hubiera en pantalla.
      if (cause instanceof EventApiError && [403, 404].includes(cause.status)) { setEvent(null); setGone(true); }
      setError(cause instanceof Error ? cause.message : 'No se pudo abrir el evento.');
    } finally { if (current === requestId.current) setLoading(false); }
  }, [token, eventId]);

  useFocusEffect(useCallback(() => {
    const silent = loadedId.current === eventId; loadedId.current = eventId;
    void load(silent);
    return () => { requestId.current++; };
  }, [load, eventId]));

  const respond = async (response: EventResponse) => {
    if (!token || !event || acting.current) return;
    acting.current = true; setResponding(response); setRespondError(''); setLastResponse(response);
    try {
      const saved = await respondEvent(token, event.id, response);
      setEvent(saved);
      toast.show(response === 'GOING' ? 'Confirmaste que irás' : 'Marcaste que no irás');
    } catch (cause) {
      setRespondError(cause instanceof Error ? cause.message : 'No se pudo guardar tu respuesta.');
      if (cause instanceof EventApiError && [403, 404, 409].includes(cause.status)) void load(true);
    } finally { acting.current = false; setResponding(null); }
  };

  const cancel = async () => {
    if (!token || !event || acting.current) return;
    acting.current = true; setCancelling(true); setCancelError('');
    // La misma clave se conserva si hay que reintentar.
    cancelKey.current ??= newRequestKey();
    try {
      const saved = await cancelEvent(token, event.id, cancelKey.current);
      cancelKey.current = null; setEvent(saved); toast.show('Evento cancelado');
    } catch (cause) {
      setCancelError(cause instanceof Error ? cause.message : 'No se pudo cancelar el evento.');
      if (cause instanceof EventApiError && [403, 404, 409].includes(cause.status)) void load(true);
    } finally { acting.current = false; setCancelling(false); }
  };

  // DI-EV-04: confirmación explícita antes de cancelar.
  const confirmCancel = () => Alert.alert('Cancelar evento', 'El evento quedará visible como «Cancelado» en «Eventos anteriores» y dejará de aceptar respuestas. Se avisará a quienes confirmaron «Iré».', [
    { text: 'Conservar evento', style: 'cancel' },
    { text: 'Cancelar evento', style: 'destructive', onPress: () => void cancel() },
  ]);

  const back = () => goBackOrReplace(router, (event ? `/communities/${event.communityId}` : '/comunidades') as Href);
  const cancelled = event?.status === 'CANCELLED';

  return <SafeAreaView style={[ui.screen, { backgroundColor: c.bg }]} edges={['top', 'bottom']}>
    <Pressable accessibilityRole="button" accessibilityLabel="Volver" style={ui.back} onPress={back}><Ionicons name="arrow-back" size={24} color={c.heading} /><Text style={[ui.label, { color: c.heading }]}>Volver</Text></Pressable>
    {loading ? <View style={ui.content}><EventDetailSkeleton /></View> : null}
    {!loading && !event ? <View style={[ui.content, styles.stateBox]}>
      <Ionicons name={gone ? 'calendar-clear-outline' : 'cloud-offline-outline'} size={36} color={c.error} />
      <Text style={[ui.body, styles.center, { color: c.error }]}>{gone ? 'Este evento ya no está disponible para tu cuenta.' : error}</Text>
      {!gone ? <CommunityButton label="Reintentar" secondary onPress={() => void load()} /> : <CommunityButton label="Volver" secondary onPress={back} />}
    </View> : null}
    {event && token ? <FormScrollView contentContainerStyle={ui.content}>
      <View style={[styles.cover, { backgroundColor: surfaceAlt }]}>
        {event.coverPath && !coverFailed
          ? <Image source={eventCoverSource(event.coverPath, token)} style={styles.cover} contentFit="cover" cachePolicy="memory" onError={() => setCoverFailed(true)} accessibilityLabel={`Portada de ${event.title}`} />
          : <Ionicons name="calendar-outline" size={48} color={c.heading} />}
      </View>
      {/* Estado en cápsula, como las demás de la app; «Cancelado» conserva el rojo (palabra, no solo color). */}
      <View style={[styles.state, cancelled ? { borderColor: c.error, borderWidth: 1 } : { backgroundColor: surfaceAlt }]}>
        <Text style={[styles.stateText, { color: cancelled ? c.error : c.text }]}>{stateLabel(event)}</Text>
      </View>
      <View style={styles.titleGroup}>
        <Text accessibilityRole="header" style={[styles.title, { color: c.heading }]}>{event.title}</Text>
        {event.creator ? <Text style={[ui.muted, { color: c.muted }]}>Organiza {event.creator.username}</Text> : null}
      </View>

      {/* Asistencia arriba (22-11-2026): es la tarea principal de un miembro; antes quedaba debajo del mapa. */}
      <View style={[styles.block, { borderColor: c.border, backgroundColor: c.card }]}>
        {/* Total de «Iré»: oculto si se canceló (D-103); fijo al comenzar (D-109). */}
        {event.goingCount !== null ? <View style={styles.row}><Ionicons name="people-outline" size={20} color={c.heading} /><Text style={[ui.label, styles.flex, { color: c.heading }]}>{goingLabel(event.goingCount)}{event.phase !== 'upcoming' ? ' antes de empezar' : ''}</Text></View> : null}
        {event.canRespond ? <View style={styles.answers}>
          {(['GOING', 'NOT_GOING'] as EventResponse[]).map(option => {
            const selected = event.myResponse === option;
            return <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected, busy: responding === option, disabled: responding !== null }} disabled={responding !== null} onPress={() => void respond(option)}
              style={({ pressed }) => [styles.answer, { borderColor: c.heading, backgroundColor: selected ? c.heading : 'transparent', opacity: pressed || (responding !== null && responding !== option) ? 0.6 : 1 }]}>
              <Ionicons name={option === 'GOING' ? 'checkmark-circle-outline' : 'close-circle-outline'} size={20} color={selected ? c.actionText : c.heading} />
              <Text style={[ui.buttonText, { color: selected ? c.actionText : c.heading }]}>{responding === option ? 'Guardando…' : option === 'GOING' ? 'Iré' : 'No iré'}</Text>
            </Pressable>;
          })}
        </View> : event.myResponse ? <Text style={[ui.body, { color: c.text }]}>Tu respuesta: {event.myResponse === 'GOING' ? 'Iré' : 'No iré'}</Text> : null}
        <CommunityMessage text={respondError} error />
        {respondError && lastResponse && event.canRespond ? <CommunityButton label="Reintentar respuesta" secondary onPress={() => void respond(lastResponse)} /> : null}
        {!event.isMember && !cancelled && event.phase === 'upcoming' ? <Text style={[ui.muted, { color: c.muted }]}>Únete a la comunidad para responder si irás.</Text> : null}
        {event.isMember && !cancelled && event.phase !== 'upcoming' ? <Text style={[ui.muted, { color: c.muted }]}>La asistencia se cerró al comenzar el evento.</Text> : null}
        {cancelled ? <Text style={[ui.muted, { color: c.muted }]}>Este evento se canceló. Ya no acepta respuestas.</Text> : null}
      </View>

      <View style={[styles.block, { borderColor: c.border, backgroundColor: c.card }]}>
        <View style={styles.row}><Ionicons name="time-outline" size={20} color={c.heading} /><View style={styles.flex}>
          <Text style={[ui.label, { color: c.text }]}>Empieza el {eventMoment(event.startsAt, event.timeZone)}</Text>
          <Text style={[ui.body, { color: c.text }]}>Termina aproximadamente {sameDay(event.startsAt, event.endsAt, event.timeZone) ? `a las ${eventTime(event.endsAt, event.timeZone)}` : `el ${eventMoment(event.endsAt, event.timeZone)}`}</Text>
          <Text style={[ui.muted, { color: c.muted }]}>Horario de {event.timeZone}. La hora de fin puede variar.</Text>
        </View></View>
        <View style={styles.row}><Ionicons name="location-outline" size={20} color={c.heading} /><Text style={[ui.label, styles.flex, { color: c.text }]}>{event.placeLabel}</Text></View>
        {event.description ? <View style={styles.row}><Ionicons name="document-text-outline" size={20} color={c.heading} /><View style={styles.flex}>
          <Text style={[ui.muted, { color: c.muted }]}>Descripción del evento</Text>
          <Text style={[ui.body, { color: c.text }]}>{event.description}</Text>
        </View></View> : null}
      </View>

      {/* El lugar escrito va antes del mapa para seguir siendo útil si este no carga. */}
      <View style={[styles.map, { borderColor: c.border }]}>
        <MapView style={StyleSheet.absoluteFill} initialRegion={{ latitude: event.latitude, longitude: event.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }} scrollEnabled={false} rotateEnabled={false} pitchEnabled={false} accessibilityLabel={`Mapa con el punto de ${event.placeLabel}`}>
          <Marker coordinate={{ latitude: event.latitude, longitude: event.longitude }} title={event.placeLabel} />
        </MapView>
      </View>
      <CommunityButton label="Cómo llegar" secondary onPress={() => openDirections(event)} />

      {event.canEdit || event.canCancel ? <View style={styles.manage}>
        {event.canEdit ? <CommunityButton label="Editar evento" secondary disabled={cancelling} onPress={() => router.push((`/events/${event.id}/edit`) as Href)} /> : null}
        {event.canCancel ? <CommunityButton label="Cancelar evento" secondary destructive busy={cancelling} onPress={confirmCancel} /> : null}
        <CommunityMessage text={cancelError} error />
        {cancelError && event.canCancel ? <CommunityButton label="Reintentar cancelación" secondary destructive busy={cancelling} onPress={() => void cancel()} /> : null}
      </View> : null}
    </FormScrollView> : null}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  cover: { width: '100%', height: 200, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  state: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  stateText: { fontFamily: 'Nunito_700Bold', fontSize: 12, lineHeight: 16 },
  titleGroup: { gap: spacing.xs, marginTop: -spacing.xs },
  title: { fontFamily: 'Nunito_700Bold', fontSize: 28, lineHeight: 34, letterSpacing: -0.3 },
  stateBox: { alignItems: 'center', paddingTop: 48 },
  center: { textAlign: 'center' },
  block: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 12 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  flex: { flex: 1, gap: 2 },
  map: { height: 200, borderRadius: 18, overflow: 'hidden', borderWidth: 1 },
  answers: { flexDirection: 'row', gap: 10 },
  answer: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  manage: { gap: 10, marginTop: 6 },
});
