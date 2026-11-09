import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter, type Href } from 'expo-router';

import { useAuthContext } from '@/context/AuthContext';
import { useCommunityColors } from '@/components/community-ui';
import { listModerationNotices } from '@/lib/moderation-notices-api';

// Entrada a «Avisos de moderación» en Mi perfil (D-143). Solo aparece si la
// persona tiene al menos un aviso; un punto indica los pendientes de confirmar.
// Si la consulta falla no se muestra nada: no es una tarea de la pantalla.
export function ModerationNoticesRow({ disabled = false }: { disabled?: boolean }) {
  const { token } = useAuthContext();
  const router = useRouter();
  const c = useCommunityColors();
  const [summary, setSummary] = useState<{ any: boolean; pending: number }>({ any: false, pending: 0 });
  const requestId = useRef(0);

  useFocusEffect(useCallback(() => {
    if (!token) return;
    const current = ++requestId.current;
    listModerationNotices(token, { limit: 1 })
      .then(page => { if (current === requestId.current) setSummary({ any: page.items.length > 0, pending: page.pendingCount }); })
      .catch(cause => { if (__DEV__) console.warn('[ModerationNoticesRow] No se pudieron consultar los avisos:', cause instanceof Error ? cause.message : cause); });
    return () => { requestId.current++; };
  }, [token]));

  if (!summary.any) return null;
  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={summary.pending > 0 ? `Avisos de moderación, ${summary.pending} sin confirmar` : 'Avisos de moderación'}
    disabled={disabled}
    onPress={() => router.push('/moderation-notices' as Href)}
    style={[styles.row, { borderColor: c.border }]}
  >
    <Ionicons name="shield-checkmark-outline" size={20} color={c.heading} />
    <Text style={[styles.label, { color: c.heading }]}>Avisos de moderación</Text>
    {summary.pending > 0 ? <View accessible={false} style={[styles.dot, { backgroundColor: c.error }]} /> : null}
    <Ionicons name="chevron-forward" size={20} color={c.muted} />
  </Pressable>;
}

const styles = StyleSheet.create({
  row: { minHeight: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  label: { flex: 1, fontFamily: 'Nunito_700Bold', fontSize: 15 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
