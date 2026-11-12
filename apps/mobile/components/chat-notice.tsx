import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, useRouter, type Href } from 'expo-router';

import { ChatAvatar } from '@/components/chat-avatar';
import { cardShadow, petzyColors, spacing } from '@/constants/petzy-theme';
import { useAuthContext } from '@/context/AuthContext';
import { useChatEvent } from '@/context/ChatSocketContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getConversation, type ChatUser } from '@/lib/chat-api';

type Notice =
  | { type: 'message'; conversationId: number; user: ChatUser; body: string }
  | { type: 'event'; eventId: number; title: string; summary: string; cancelled: boolean };
const VISIBLE_MS = 5000;

// Aviso emergente de mensaje nuevo con Petzy abierta (CH-T14, D-79, D-154):
// foto, nombre y vista previa. No sale dentro de esa conversación ni en la
// pestaña «Mensajes», donde el mensaje ya se ve. Tocarlo abre el chat, y esa
// pantalla vuelve a comprobar sesión y participación con la API.
// También muestra los avisos de eventos (EV-T18, D-156) con la etiqueta
// «EVENTO»; no salen en «Avisos de eventos» ni dentro de ese evento.
export function ChatNotice() {
  const { token } = useAuthContext(); const router = useRouter(); const pathname = usePathname();
  const dark = useColorScheme() === 'dark'; const c = petzyColors[dark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets(); const reducedMotion = useReducedMotion();
  const [notice, setNotice] = useState<Notice | null>(null);
  const progress = useSharedValue(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const unmountTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Nombre y foto de cada chat ya consultado, para no pedirlos en cada mensaje.
  const people = useRef(new Map<number, ChatUser>());
  const path = useRef(pathname);
  useEffect(() => { path.current = pathname; }, [pathname]);
  useEffect(() => () => { clearTimeout(hideTimer.current); clearTimeout(unmountTimer.current); }, []);

  const covered = (conversationId: number) => path.current === '/mensajes' || path.current === `/messages/${conversationId}` || path.current.startsWith(`/messages/${conversationId}/`);
  const eventCovered = (eventId: number) => path.current === '/event-notices' || path.current === `/events/${eventId}` || path.current.startsWith(`/events/${eventId}/`);

  const animate = (to: 0 | 1) => progress.set(reducedMotion
    ? withTiming(to, { duration: 150, reduceMotion: ReduceMotion.Never })
    : withSpring(to, { duration: to ? 320 : 260, dampingRatio: 1, overshootClamping: true, reduceMotion: ReduceMotion.System }));

  const hide = () => {
    clearTimeout(hideTimer.current); animate(0);
    unmountTimer.current = setTimeout(() => setNotice(null), 300);
  };

  const show = (next: Notice) => {
    clearTimeout(hideTimer.current); clearTimeout(unmountTimer.current);
    setNotice(next); animate(1);
    AccessibilityInfo.announceForAccessibility(next.type === 'message' ? `Mensaje nuevo de ${next.user.username}: ${next.body}` : `Aviso de evento, ${next.title}: ${next.summary}`);
    hideTimer.current = setTimeout(hide, VISIBLE_MS);
  };

  useChatEvent('message', ({ conversationId, message }) => {
    if (!token || message.mine || covered(conversationId)) return;
    const known = people.current.get(conversationId);
    if (known) { show({ type: 'message', conversationId, user: known, body: message.body }); return; }
    // Si no se puede consultar quién escribió, no hay aviso; el mensaje ya está guardado.
    getConversation(token, conversationId).then(summary => {
      people.current.set(conversationId, summary.otherUser);
      if (!covered(conversationId)) show({ type: 'message', conversationId, user: summary.otherUser, body: message.body });
    }).catch(() => undefined);
  });
  useChatEvent('event_notice', notice => {
    if (!token || eventCovered(notice.event.id)) return;
    show({ type: 'event', eventId: notice.event.id, title: notice.event.title, summary: notice.summary, cancelled: notice.kind === 'CANCELLED' });
  });
  // Un cambio de cuenta no debe reutilizar nombres ni avisos de la anterior.
  useEffect(() => { people.current.clear(); queueMicrotask(() => setNotice(null)); }, [token]);

  const style = useAnimatedStyle(() => ({ opacity: progress.get(), transform: [{ translateY: (1 - progress.get()) * -24 }] }));

  if (!notice || !token) return null;
  const isMessage = notice.type === 'message';
  const open = () => { hide(); router.push((isMessage ? `/messages/${notice.conversationId}` : `/events/${notice.eventId}`) as Href); };
  // Etiqueta arriba, como las notificaciones del teléfono (D-154): «Mensaje nuevo» o «Evento».
  return <Animated.View style={[styles.wrap, cardShadow(dark), { top: insets.top + spacing.sm, backgroundColor: c.surface, borderColor: c.border }, style]}>
    <Pressable accessibilityRole="button" accessibilityLabel={isMessage ? `Mensaje nuevo de ${notice.user.username}: ${notice.body}` : `Aviso de evento, ${notice.title}: ${notice.summary}`} accessibilityHint={isMessage ? 'Abre la conversación' : 'Abre el evento'} onPress={open} style={styles.body}>
      <View style={styles.label} importantForAccessibility="no-hide-descendants">
        <Ionicons name={isMessage ? 'chatbubble' : 'calendar'} size={14} color={c.accent} />
        <Text style={[styles.labelText, { color: c.accent }]}>{isMessage ? 'MENSAJE NUEVO' : 'EVENTO'}</Text>
        <Text style={[styles.labelTime, { color: c.muted }]}>· ahora</Text>
      </View>
      <View style={styles.content}>
        {isMessage ? <ChatAvatar avatarUrl={notice.user.avatarUrl} token={token} size={40} />
          : <View style={[styles.eventIcon, { backgroundColor: notice.cancelled ? c.surfaceAlt : c.accent }]}><Ionicons name={notice.cancelled ? 'close-circle-outline' : 'calendar-outline'} size={22} color={notice.cancelled ? c.textPrimary : c.onAccent} /></View>}
        <View style={styles.text}>
          <Text numberOfLines={1} style={[styles.name, { color: c.textPrimary }]}>{isMessage ? notice.user.username : notice.title}</Text>
          <Text numberOfLines={2} style={[styles.preview, { color: c.muted }]}>{isMessage ? notice.body : notice.summary}</Text>
        </View>
      </View>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Cerrar aviso" onPress={hide} style={styles.close} hitSlop={4}>
      <Ionicons name="close" size={20} color={c.muted} />
    </Pressable>
  </Animated.View>;
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.lg, right: spacing.lg, borderRadius: 18, borderWidth: 1, flexDirection: 'row', alignItems: 'flex-start', zIndex: 1100 },
  body: { flex: 1, paddingVertical: spacing.md, paddingLeft: spacing.md, gap: spacing.sm },
  label: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  labelText: { fontFamily: 'Nunito_700Bold', fontSize: 12, letterSpacing: 0.6 },
  labelTime: { fontFamily: 'Nunito_600SemiBold', fontSize: 12 },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1 },
  eventIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: 'Nunito_700Bold', fontSize: 15 },
  preview: { fontFamily: 'Nunito_400Regular', fontSize: 14, lineHeight: 19 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: spacing.xs, marginTop: spacing.xs },
});
