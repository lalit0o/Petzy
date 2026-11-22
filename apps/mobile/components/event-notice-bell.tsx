import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter, type Href } from 'expo-router';

import { petzyColors } from '@/constants/petzy-theme';
import { useAuthContext } from '@/context/AuthContext';
import { useChatEvent } from '@/context/ChatSocketContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { listEventNotices } from '@/lib/events-api';

// Campana de avisos de eventos arriba de Inicio (EV-T18, D-156), con el
// número de avisos sin leer. Si la consulta falla, la campana sigue abriendo
// la lista, que muestra su propio error y «Reintentar».
export function EventNoticeBell() {
  const { token } = useAuthContext(); const router = useRouter();
  const dark = useColorScheme() === 'dark';
  const c = petzyColors[dark ? 'dark' : 'light'];
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    if (!token) return;
    try { setUnread((await listEventNotices(token, undefined, 1)).unreadCount); } catch { /* se conserva el último número */ }
  }, [token]);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  useChatEvent('event_notice', () => setUnread(n => n + 1));
  useChatEvent('resync', () => { void refresh(); });

  const label = unread ? `Avisos de eventos, ${unread} sin leer` : 'Avisos de eventos';
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => router.push('/event-notices' as Href)} hitSlop={6}
    style={({ pressed }) => [styles.button, { backgroundColor: pressed ? c.surfaceAlt : 'transparent' }]}>
    <Ionicons name={unread ? 'notifications' : 'notifications-outline'} size={26} color={c.accent} />
    {unread ? <View style={[styles.badge, { backgroundColor: c.error, borderColor: c.background }]}>
      {/* En oscuro el rojo de error es claro: el número va en el fondo oscuro para que se lea. */}
      <Text style={[styles.badgeText, { color: dark ? c.background : c.surface }]}>{unread > 9 ? '9+' : unread}</Text>
    </View> : null}
  </Pressable>;
}

const styles = StyleSheet.create({
  button: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 6, right: 4, minWidth: 20, height: 20, borderRadius: 10, borderWidth: 2, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: 'Nunito_700Bold', fontSize: 11, lineHeight: 14 },
});
