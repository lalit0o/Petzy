import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useAuthContext } from '@/context/AuthContext';
import { getEvent, type CommunityEvent } from '@/lib/events-api';
import { EventForm } from '@/components/event-form';
import { CommunityButton, CommunityMessage, ui, useCommunityColors } from '@/components/community-ui';
import { goBackOrReplace } from '@/lib/navigation';

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const { token } = useAuthContext(); const router = useRouter(); const c = useCommunityColors();
  const [event, setEvent] = useState<CommunityEvent | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const requestId = useRef(0); const loadedId = useRef<number | null>(null);
  const load = useCallback(async () => {
    if (!token) return; const current = ++requestId.current; setLoading(true); setEvent(null); setError('');
    try {
      const found = await getEvent(token, Number(id)); if (current !== requestId.current) return;
      if (!found.canEdit) setError('Este evento ya no se puede editar con tu cuenta.'); else { setEvent(found); loadedId.current = Number(id); }
    } catch (cause) { if (current === requestId.current) setError(cause instanceof Error ? cause.message : 'No se pudo cargar el evento.'); }
    finally { if (current === requestId.current) setLoading(false); }
  }, [token, id]);
  // Solo se carga al entrar: abrir la galería también quita y devuelve el foco.
  useFocusEffect(useCallback(() => {
    if (loadedId.current !== Number(id)) void load();
    return () => { requestId.current++; };
  }, [load, id]));
  if (event) return <EventForm key={event.id} communityId={event.communityId} event={event} />;
  return <SafeAreaView style={[ui.screen, ui.content, { backgroundColor: c.bg }]} edges={['top', 'bottom']}>
    <Pressable accessibilityRole="button" accessibilityLabel="Volver" style={ui.back} onPress={() => goBackOrReplace(router, (`/events/${id}`) as Href)}><Text style={[ui.label, { color: c.heading }]}>Volver</Text></Pressable>
    {loading ? <ActivityIndicator color={c.heading} /> : <><CommunityMessage text={error} error /><CommunityButton label="Reintentar" secondary onPress={() => void load()} /></>}
  </SafeAreaView>;
}
