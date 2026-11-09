import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthContext } from '@/context/AuthContext';
import { getCommunity, type Community } from '@/lib/communities-api';
import { CommunityForm } from '@/components/community-form';
import { CommunityButton, CommunityMessage, ui, useCommunityColors } from '@/components/community-ui';
import { goBackOrReplace } from '@/lib/navigation';

export default function EditCommunityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const { token } = useAuthContext(); const router = useRouter(); const c = useCommunityColors();
  const [community, setCommunity] = useState<Community | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const requestId = useRef(0);
  const loadedId = useRef<number | null>(null);
  const load = useCallback(async () => {
    if (!token) return; const current = ++requestId.current; setLoading(true); setCommunity(null); setError('');
    try { const found = await getCommunity(token, Number(id)); if (current !== requestId.current) return; if (found.role !== 'ADMIN') setError('Solo una persona administradora puede editar esta comunidad.'); else { setCommunity(found); loadedId.current = Number(id); } }
    catch (cause) { if (current === requestId.current) setError(cause instanceof Error ? cause.message : 'No se pudo cargar la comunidad.'); }
    finally { if (current === requestId.current) setLoading(false); }
  }, [token, id]);
  // Solo se recarga al entrar por primera vez a esta comunidad, no en cada
  // regreso de foco: abrir la galería de fotos también cuenta como perder y
  // recuperar el foco, y volver a pedir los datos desmontaba el formulario
  // (y la foto recién elegida) justo cuando el selector terminaba.
  useFocusEffect(useCallback(() => {
    if (loadedId.current !== Number(id)) void load();
    return () => { requestId.current++; };
  }, [load, id]));
  if (community) return <CommunityForm key={community.id} community={community} />;
  return <SafeAreaView style={[ui.screen, ui.content, { backgroundColor: c.bg }]} edges={['top', 'bottom']}>
    <Pressable accessibilityRole="button" accessibilityLabel="Volver" style={ui.back} onPress={() => goBackOrReplace(router, '/comunidades')}><Text style={[ui.label, { color: c.heading }]}>Volver</Text></Pressable>
    {loading ? <ActivityIndicator color={c.heading} /> : <><CommunityMessage text={error} error /><CommunityButton label="Reintentar" secondary onPress={() => void load()} /></>}
  </SafeAreaView>;
}
