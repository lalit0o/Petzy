import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View, type ViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnchoredMenu, AnchoredMenuItem, type MenuAnchor } from '@/components/anchored-menu';
import { ChatAvatar } from '@/components/chat-avatar';
import { ChatThreadSkeleton } from '@/components/skeleton';
import { useAuthContext } from '@/context/AuthContext';
import { useChatEvent } from '@/context/ChatSocketContext';
import { petzyColors, spacing } from '@/constants/petzy-theme';
import { CHAT_ACTION_TEXT, useChatActions } from '@/hooks/use-chat-actions';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ChatApiError, getConversation, listMessages, markRead, MESSAGE_MAX, newClientKey, sendMessage, type ChatMessage, type ConversationSummary } from '@/lib/chat-api';
import { goBackOrReplace } from '@/lib/navigation';

const time = (iso: string) => new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

// Separadores de día y agrupación (22-11-2026, pulido con impeccable).
const dayKey = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
function dayLabel(iso: string) {
  const date = new Date(iso); const today = new Date(); const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (dayKey(iso) === dayKey(today.toISOString())) return 'Hoy';
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return 'Ayer';
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
}
const GROUP_GAP_MS = 5 * 60 * 1000;

// Agrega mensajes sin repetir y conserva el orden del más nuevo al más antiguo.
function merge(current: ChatMessage[], incoming: ChatMessage[]) {
  const byId = new Map(current.map(m => [m.id, m]));
  for (const message of incoming) byId.set(message.id, { ...byId.get(message.id), ...message });
  return [...byId.values()].sort((a, b) => b.id - a.id);
}

// Conversación privada (DI-CH-02, CH-T12). La lista está invertida: el mensaje
// más reciente queda abajo, junto al cuadro para escribir.
export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const conversationId = Number(id);
  const { token } = useAuthContext(); const router = useRouter();
  const dark = useColorScheme() === 'dark';
  const c = petzyColors[dark ? 'dark' : 'light'];
  const [summary, setSummary] = useState<ConversationSummary | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true); const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState(''); const [gone, setGone] = useState(false);
  const [draft, setDraft] = useState(''); const [sending, setSending] = useState(false); const [sendError, setSendError] = useState('');
  const requestId = useRef(0); const loadedId = useRef<number | null>(null);
  const focused = useRef(false); const lastMarked = useRef(0);
  // Clave del último intento: reintentar el mismo texto reutiliza la clave y el servidor no lo duplica.
  const attempt = useRef<{ text: string; key: string } | null>(null);

  // `silent` refresca sin vaciar la pantalla. Resumen e historial se muestran
  // juntos, cuando llegaron los dos, para no mezclar esqueleto y contenido.
  const load = useCallback(async (silent = false) => {
    if (!token) return; const current = ++requestId.current;
    if (!silent) { setLoading(true); setSummary(null); setMessages([]); setCursor(null); }
    setError('');
    try {
      const [found, page] = await Promise.all([getConversation(token, conversationId), listMessages(token, conversationId)]);
      if (current !== requestId.current) return;
      setSummary(found); setGone(false);
      // Al refrescar se suman los mensajes nuevos sin perder los anteriores ya cargados.
      setMessages(old => silent ? merge(old, page.items) : page.items);
      if (!silent) setCursor(page.nextCursor);
    } catch (cause) {
      if (current !== requestId.current) return;
      if (cause instanceof ChatApiError && cause.status === 404) { setSummary(null); setMessages([]); setGone(true); }
      setError(cause instanceof Error ? cause.message : 'No se pudo abrir la conversación.');
    } finally { if (current === requestId.current) setLoading(false); }
  }, [token, conversationId]);

  useFocusEffect(useCallback(() => {
    focused.current = true;
    const silent = loadedId.current === conversationId; loadedId.current = conversationId;
    void load(silent);
    return () => { focused.current = false; requestId.current++; };
  }, [load, conversationId]));

  // «Leído» (D-81): solo con la pantalla abierta, la app en primer plano y el
  // mensaje ya en pantalla; se marca el más reciente de la otra persona.
  const newestTheirs = messages.find(m => !m.mine)?.id ?? 0;
  useEffect(() => {
    if (!token || !focused.current || AppState.currentState !== 'active' || newestTheirs <= lastMarked.current) return;
    lastMarked.current = newestTheirs;
    markRead(token, conversationId, newestTheirs).catch(() => { lastMarked.current = 0; });
  }, [token, conversationId, newestTheirs]);

  const loadOlder = async () => {
    if (!token || cursor === null || loadingOlder) return;
    const current = requestId.current; setLoadingOlder(true);
    try {
      const page = await listMessages(token, conversationId, cursor);
      if (current !== requestId.current) return;
      setMessages(old => merge(old, page.items)); setCursor(page.nextCursor);
    } catch (cause) {
      if (current === requestId.current) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los mensajes anteriores.');
    } finally { setLoadingOlder(false); }
  };

  const send = async () => {
    const text = draft.trim();
    if (!token || !summary?.canSend || sending || !text) return;
    if (attempt.current?.text !== text) attempt.current = { text, key: newClientKey() };
    setSending(true); setSendError('');
    try {
      const saved = await sendMessage(token, conversationId, text, attempt.current.key);
      attempt.current = null;
      setMessages(old => merge(old, [saved]));
      setDraft('');
    } catch (cause) {
      setSendError(cause instanceof Error ? cause.message : 'No se pudo enviar el mensaje.');
      if (cause instanceof ChatApiError && cause.code === 'CHAT_BLOCKED') void load(true);
      if (cause instanceof ChatApiError && cause.status === 404) void load();
    } finally { setSending(false); }
  };

  // Avisos en vivo de esta conversación (CH-T10).
  useChatEvent('message', ({ conversationId: target, message }) => { if (target === conversationId) setMessages(old => merge(old, [message])); });
  useChatEvent('read', ({ conversationId: target, lastReadMessageId }) => {
    if (target === conversationId) setMessages(old => old.map(m => m.mine && m.id <= lastReadMessageId ? { ...m, read: true } : m));
  });
  useChatEvent('presence', ({ conversationId: target, online }) => { if (target === conversationId) setSummary(old => old ? { ...old, otherOnline: online } : old); });
  useChatEvent('block', ({ conversationId: target }) => { if (target === conversationId) void load(true); });
  useChatEvent('resync', () => { if (focused.current && loadedId.current === conversationId) void load(true); });

  // Menú de la conversación y sus acciones (DI-CH-02, CH-T13). El resultado se
  // anuncia solo cuando el servidor lo confirma; si falla, el error queda junto
  // al encabezado con su «Reintentar…».
  const menuButton = useRef<ViewInstance>(null);
  const [menuOpen, setMenuOpen] = useState(false); const [menuAnchor, setMenuAnchor] = useState<MenuAnchor>({ x: 0, y: 0, bottom: 0 });
  const openMenu = () => menuButton.current?.measureInWindow((x, y, width, height) => { setMenuAnchor({ x: x + width / 2, y: y + height / 2, bottom: y + height }); setMenuOpen(true); });
  const backToInbox = () => goBackOrReplace(router, '/mensajes' as Href);
  const actions = useChatActions({
    onDone: (action, _target, updated) => { if (updated) setSummary(updated); else if (action === 'hide' || action === 'clear') backToInbox(); },
    onGone: () => void load(),
  });
  const acting = actions.acting?.action ?? null; const actionError = actions.error;
  const run = (action: 'block' | 'unblock' | 'hide' | 'clear') => { if (summary) actions.request(action, summary); };

  // Dejar presionado un mensaje de la otra persona abre «Reportar mensaje» junto
  // al mensaje; lleva al mismo reporte con ese mensaje ya elegido (D-153).
  const [reportTarget, setReportTarget] = useState<{ messageId: number; anchor: MenuAnchor } | null>(null);
  const reportMessage = (messageId: number) => router.push((`/messages/${conversationId}/report?messageId=${messageId}`) as Href);

  const newestMine = messages.find(m => m.mine)?.id;
  const canSubmit = !!draft.trim() && !sending;

  // La lista va del más nuevo (índice 0) al más antiguo. Un mensaje abre su día si el
  // anterior (índice + 1) es de otro día; muestra la hora si cierra una racha de la misma
  // persona (el siguiente es de la otra o pasaron más de 5 min) o lleva «Leído»/«Enviado».
  const renderItem = ({ item, index }: { item: ChatMessage; index: number }) => {
    const older = messages[index + 1]; const newer = messages[index - 1];
    const startsDay = !older || dayKey(older.createdAt) !== dayKey(item.createdAt);
    const endsRun = !newer || newer.mine !== item.mine || new Date(newer.createdAt).getTime() - new Date(item.createdAt).getTime() > GROUP_GAP_MS || dayKey(newer.createdAt) !== dayKey(item.createdAt);
    const showMeta = endsRun || item.id === newestMine;
    return <View>
    {startsDay ? <View style={styles.day} accessibilityRole="header"><Text style={[styles.dayText, { color: c.muted, backgroundColor: c.surfaceAlt }]}>{dayLabel(item.createdAt)}</Text></View> : null}
    <View style={[styles.bubbleRow, item.mine ? styles.mineRow : styles.theirsRow, !showMeta && styles.groupedRow]}>
    {item.mine ? <View style={[styles.bubble, styles.mineBubble, { backgroundColor: c.accent }]}>
      <Text style={[styles.body, { color: c.onAccent }]}>{item.body}</Text>
    </View> : <Pressable
      accessibilityHint="Mantén presionado para reportar este mensaje"
      accessibilityActions={[{ name: 'report', label: 'Reportar mensaje' }]}
      onAccessibilityAction={event => { if (event.nativeEvent.actionName === 'report') reportMessage(item.id); }}
      onLongPress={event => { const { pageX, pageY } = event.nativeEvent; setReportTarget({ messageId: item.id, anchor: { x: pageX, y: pageY, bottom: pageY + 8 } }); }}
      delayLongPress={350}
      style={({ pressed }) => [styles.bubble, styles.theirsBubble, { backgroundColor: pressed ? c.surfaceAlt : c.surface, borderColor: reportTarget?.messageId === item.id ? c.accent : c.border }]}>
      <Text style={[styles.body, { color: c.textPrimary }]}>{item.body}</Text>
    </Pressable>}
    {showMeta ? <Text style={[styles.meta, { color: c.muted }]}>{time(item.createdAt)}{item.id === newestMine ? ` · ${item.read ? 'Leído' : 'Enviado'}` : ''}</Text> : null}
    </View>
    </View>;
  };

  const header = <View style={[styles.header, { borderBottomColor: c.border }]}>
    <Pressable accessibilityRole="button" accessibilityLabel="Volver a mensajes" onPress={() => goBackOrReplace(router, '/mensajes' as Href)} style={styles.back} hitSlop={8}>
      <Ionicons name="arrow-back" size={24} color={c.accent} />
    </Pressable>
    {summary && token ? <Pressable accessibilityRole="button" accessibilityLabel={`Ver perfil de ${summary.otherUser.username}${summary.otherOnline ? ', en línea' : ''}`} onPress={() => router.push((`/profiles/${summary.otherUser.id}`) as Href)} style={styles.identity}>
      <ChatAvatar avatarUrl={summary.otherUser.avatarUrl} token={token} size={40} online={summary.otherOnline} />
      <View style={styles.identityText}>
        <Text numberOfLines={1} style={[styles.name, { color: c.textPrimary }]}>{summary.otherUser.username}</Text>
        {summary.otherOnline ? <Text style={[styles.online, { color: c.accent }]}>En línea</Text> : null}
      </View>
    </Pressable> : null}
    {summary ? <View ref={menuButton} collapsable={false}>
      <Pressable accessibilityRole="button" accessibilityLabel={acting ? CHAT_ACTION_TEXT[acting].busy : 'Opciones de la conversación'} accessibilityState={{ expanded: menuOpen, busy: acting !== null, disabled: acting !== null }} disabled={acting !== null} onPress={openMenu} style={styles.menu} hitSlop={8}>
        {acting ? <ActivityIndicator color={c.accent} /> : <Ionicons name="ellipsis-horizontal" size={24} color={c.accent} />}
      </Pressable>
    </View> : null}
  </View>;

  return <KeyboardAvoidingView style={[styles.screen, { backgroundColor: c.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {header}
      {actionError ? <View accessibilityRole="alert" style={[styles.actionError, { borderBottomColor: c.border }]}>
        <Text style={[styles.actionErrorText, { color: c.error }]}>{actionError.message}</Text>
        <Pressable accessibilityRole="button" disabled={acting !== null} onPress={actions.retry} style={styles.action}><Text style={[styles.link, { color: c.accent }]}>{CHAT_ACTION_TEXT[actionError.action].retry}</Text></Pressable>
      </View> : null}
      {loading ? <View style={styles.padded}><ChatThreadSkeleton /></View> : null}
      {!loading && !summary ? <View style={styles.state}>
        <Ionicons name={gone ? 'chatbubbles-outline' : 'cloud-offline-outline'} size={36} color={c.error} />
        <Text style={[styles.stateText, { color: c.error }]}>{gone ? 'Esta conversación ya no está disponible.' : error}</Text>
        <Pressable accessibilityRole="button" onPress={() => gone ? goBackOrReplace(router, '/mensajes' as Href) : void load()} style={styles.action}><Text style={[styles.link, { color: c.accent }]}>{gone ? 'Volver a mensajes' : 'Reintentar'}</Text></Pressable>
      </View> : null}
      {!loading && summary ? <>
        <FlatList
          inverted
          data={messages}
          // Cada burbuja depende de sus vecinas (día y hora agrupada): al llegar un mensaje se re-evalúan.
          extraData={messages}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          onEndReached={() => void loadOlder()}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingOlder ? <ActivityIndicator style={styles.older} color={c.accent} accessibilityLabel="Cargando mensajes anteriores" /> : undefined}
          ListEmptyComponent={<View style={[styles.empty, styles.flipped]}>
            <Ionicons name="chatbubble-ellipses-outline" size={36} color={c.accent} />
            <Text style={[styles.stateText, { color: c.muted }]}>Escríbele a {summary.otherUser.username} para empezar la conversación.</Text>
          </View>}
        />
        {error ? <Text accessibilityRole="alert" style={[styles.inlineError, { color: c.error }]}>{error}</Text> : null}
        {summary.canSend ? <View style={[styles.composer, { borderTopColor: c.border, backgroundColor: c.background }]}>
          {sendError ? <Text accessibilityRole="alert" style={[styles.inlineError, styles.composerError, { color: c.error }]}>{sendError} Tu mensaje sigue aquí; toca enviar para reintentar.</Text> : null}
          <View style={styles.composerRow}>
            <TextInput
              accessibilityLabel="Escribe un mensaje"
              placeholder="Escribe un mensaje"
              placeholderTextColor={c.muted}
              value={draft}
              onChangeText={text => { setDraft(text); if (sendError) setSendError(''); }}
              multiline
              maxLength={MESSAGE_MAX}
              editable={!sending}
              style={[styles.input, { color: c.textPrimary, backgroundColor: c.surface, borderColor: c.border }]}
            />
            <Pressable accessibilityRole="button" accessibilityLabel={sending ? 'Enviando mensaje' : 'Enviar mensaje'} accessibilityState={{ disabled: !canSubmit, busy: sending }} disabled={!canSubmit} onPress={() => void send()}
              style={({ pressed }) => [styles.sendButton, { backgroundColor: canSubmit || sending ? c.accent : c.surfaceAlt, opacity: pressed ? 0.8 : 1 }]}>
              {sending ? <ActivityIndicator color={c.onAccent} /> : <Ionicons name="send" size={20} color={canSubmit ? c.onAccent : c.muted} />}
            </Pressable>
          </View>
          {/* El contador aparece solo mientras se escribe (22-11-2026). */}
          {draft.length > 0 ? <Text style={[styles.counter, { color: draft.length >= MESSAGE_MAX ? c.error : c.muted }]}>{draft.length}/{MESSAGE_MAX}</Text> : null}
        </View> : <View style={[styles.blocked, { borderTopColor: c.border, backgroundColor: c.surface }]}>
          <Ionicons name="hand-left-outline" size={20} color={c.muted} />
          {/* D-81: quien bloqueó lo sabe; la otra persona solo ve un aviso genérico. */}
          <Text style={[styles.blockedText, { color: c.textPrimary }]}>{summary.blockedByMe ? 'Bloqueaste a esta persona. Ninguno de los dos puede enviar mensajes.' : 'No puedes enviar mensajes en esta conversación.'}</Text>
          {summary.blockedByMe ? <Pressable accessibilityRole="button" accessibilityLabel={acting === 'unblock' ? 'Desbloqueando' : `Desbloquear a ${summary.otherUser.username}`} accessibilityState={{ busy: acting === 'unblock', disabled: acting !== null }} disabled={acting !== null} onPress={() => run('unblock')} style={[styles.unblock, { borderColor: c.accent }]}>
            {acting === 'unblock' ? <ActivityIndicator color={c.accent} /> : <Text style={[styles.link, { color: c.accent }]}>Desbloquear</Text>}
          </Pressable> : null}
        </View>}
      </> : null}
      {summary ? <AnchoredMenu visible={menuOpen} anchor={menuAnchor} width={260} estimatedHeight={300} title="Opciones de la conversación" onClose={() => setMenuOpen(false)}>
        {summary.blockedByMe
          ? <AnchoredMenuItem icon="lock-open-outline" label="Desbloquear" onPress={() => run('unblock')} />
          : <AnchoredMenuItem icon="hand-left-outline" label="Bloquear" destructive onPress={() => run('block')} />}
        <AnchoredMenuItem icon="flag-outline" label="Reportar conversación" onPress={() => router.push((`/messages/${conversationId}/report`) as Href)} />
        <AnchoredMenuItem icon="eye-off-outline" label="Ocultar chat" onPress={() => run('hide')} />
        <AnchoredMenuItem icon="trash-outline" label="Borrar chat para mí" destructive separator={false} onPress={() => run('clear')} />
      </AnchoredMenu> : null}
      <AnchoredMenu visible={reportTarget !== null} anchor={reportTarget?.anchor ?? { x: 0, y: 0, bottom: 0 }} width={240} estimatedHeight={130} title="Opciones del mensaje" onClose={() => setReportTarget(null)}>
        <AnchoredMenuItem icon="flag-outline" label="Reportar mensaje" separator={false} onPress={() => { if (reportTarget) reportMessage(reportTarget.messageId); }} />
      </AnchoredMenu>
    </SafeAreaView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, minHeight: 60 },
  back: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -spacing.sm },
  menu: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginRight: -spacing.sm },
  actionError: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, borderBottomWidth: StyleSheet.hairlineWidth },
  actionErrorText: { flex: 1, minWidth: 160, fontFamily: 'Nunito_600SemiBold', fontSize: 14, lineHeight: 20 },
  unblock: { minHeight: 44, borderWidth: 1, borderRadius: 14, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center' },
  identity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
  identityText: { flex: 1 },
  name: { fontFamily: 'Nunito_700Bold', fontSize: 17 },
  online: { fontFamily: 'Nunito_600SemiBold', fontSize: 13 },
  padded: { paddingHorizontal: spacing.lg },
  list: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, flexGrow: 1 },
  bubbleRow: { marginVertical: 3, maxWidth: '82%' },
  groupedRow: { marginVertical: 1 },
  day: { alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.sm },
  dayText: { fontFamily: 'Nunito_700Bold', fontSize: 12, lineHeight: 16, borderRadius: 999, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 3 },
  mineRow: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  theirsRow: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18 },
  mineBubble: { borderBottomRightRadius: 6 },
  theirsBubble: { borderBottomLeftRadius: 6, borderWidth: 1 },
  body: { fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 22 },
  meta: { fontFamily: 'Nunito_600SemiBold', fontSize: 11, marginTop: 2, marginHorizontal: 4 },
  older: { paddingVertical: spacing.md },
  // La lista invertida voltea su contenido; el estado vacío se endereza aquí.
  flipped: { transform: [{ scaleY: -1 }] },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl },
  stateText: { fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 23, textAlign: 'center' },
  action: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.lg },
  link: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
  inlineError: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, lineHeight: 20, paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
  composer: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  composerError: { paddingHorizontal: spacing.xs, paddingBottom: spacing.xs },
  composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderWidth: 1, borderRadius: 22, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, fontFamily: 'Nunito_400Regular', fontSize: 16 },
  sendButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  counter: { fontFamily: 'Nunito_600SemiBold', fontSize: 12, textAlign: 'right', marginTop: 2, marginRight: 52 },
  blocked: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  blockedText: { flex: 1, fontFamily: 'Nunito_600SemiBold', fontSize: 15, lineHeight: 21 },
});
