import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ChatThreadSkeleton } from '@/components/skeleton';
import { useAuthContext } from '@/context/AuthContext';
import { petzyColors, spacing } from '@/constants/petzy-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ChatApiError, getConversation, listMessages, newClientKey, REPORT_NOTE_MAX, reportConversation, type ChatMessage, type ConversationSummary } from '@/lib/chat-api';
import { goBackOrReplace } from '@/lib/navigation';

const when = (iso: string) => new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// Reportar conversación (DI-CH-03, CH-T13; D-77, D-87, D-88). Solo se guardan
// los mensajes elegidos y la explicación opcional; la app no promete revisión
// ni sanción porque el MVP no las tiene.
export default function ReportConversationScreen() {
  const { id, messageId } = useLocalSearchParams<{ id: string; messageId?: string }>(); const conversationId = Number(id);
  // «Reportar mensaje» (D-153) llega con ese mensaje ya elegido; se pueden sumar más.
  const preselected = Number(messageId);
  const { token } = useAuthContext(); const router = useRouter();
  const c = petzyColors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const [summary, setSummary] = useState<ConversationSummary | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true); const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState(''); const [olderError, setOlderError] = useState(''); const [gone, setGone] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(() => new Set(Number.isInteger(preselected) && preselected > 0 ? [preselected] : []));
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false); const [sendError, setSendError] = useState(''); const [saved, setSaved] = useState(false);
  const requestId = useRef(0); const loaded = useRef(false);
  // Mientras lo elegido y la explicación no cambien, reintentar reutiliza la clave y el servidor no guarda dos reportes (D-147).
  const attempt = useRef<{ signature: string; key: string } | null>(null);

  const load = useCallback(async () => {
    if (!token) return; const current = ++requestId.current;
    setLoading(true); setError(''); setOlderError('');
    try {
      const [found, page] = await Promise.all([getConversation(token, conversationId), listMessages(token, conversationId)]);
      let items = page.items; let next = page.nextCursor;
      // Si el mensaje presionado es antiguo, se cargan páginas hasta mostrarlo elegido.
      while (preselected > 0 && next !== null && !items.some(m => m.id === preselected) && current === requestId.current) {
        const older = await listMessages(token, conversationId, next);
        items = [...items, ...older.items.filter(m => !items.some(item => item.id === m.id))]; next = older.nextCursor;
      }
      if (current !== requestId.current) return;
      setSummary(found); setMessages(items); setCursor(next); setGone(false);
    } catch (cause) {
      if (current !== requestId.current) return;
      if (cause instanceof ChatApiError && cause.status === 404) setGone(true);
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los mensajes.');
    } finally { if (current === requestId.current) setLoading(false); }
  }, [token, conversationId, preselected]);

  // Se carga una sola vez: al volver no se pierde la selección ni lo escrito.
  useFocusEffect(useCallback(() => {
    if (!loaded.current) { loaded.current = true; void load(); }
  }, [load]));

  const loadOlder = async () => {
    if (!token || cursor === null || loadingOlder) return;
    setLoadingOlder(true); setOlderError('');
    try {
      const page = await listMessages(token, conversationId, cursor);
      setMessages(old => [...old, ...page.items.filter(m => !old.some(item => item.id === m.id))]); setCursor(page.nextCursor);
    } catch (cause) {
      setOlderError(cause instanceof Error ? cause.message : 'No se pudieron cargar los mensajes anteriores.');
    } finally { setLoadingOlder(false); }
  };

  const toggle = (messageId: number) => {
    setSelected(old => { const next = new Set(old); if (next.has(messageId)) next.delete(messageId); else next.add(messageId); return next; });
    setSendError('');
  };

  const noteTooLong = note.trim().length > REPORT_NOTE_MAX;
  const canSubmit = selected.size > 0 && !noteTooLong && !sending;

  const submit = async () => {
    if (!token || !canSubmit) return;
    const ids = [...selected].sort((a, b) => a - b);
    const signature = JSON.stringify([ids, note.trim()]);
    if (attempt.current?.signature !== signature) attempt.current = { signature, key: newClientKey() };
    setSending(true); setSendError('');
    try {
      await reportConversation(token, conversationId, ids, note, attempt.current.key);
      attempt.current = null; setSaved(true);
    } catch (cause) {
      if (cause instanceof ChatApiError && cause.status === 404) { setGone(true); setSummary(null); setError(cause.message); return; }
      setSendError(cause instanceof Error ? cause.message : 'No se pudo guardar el reporte.');
    } finally { setSending(false); }
  };

  const backToChat = () => goBackOrReplace(router, (`/messages/${conversationId}`) as Href);
  const backToInbox = () => goBackOrReplace(router, '/mensajes' as Href);

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const checked = selected.has(item.id);
    const author = item.mine ? 'Tú' : summary?.otherUser.username ?? '';
    return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={`${author}, ${when(item.createdAt)}: ${item.body}`} onPress={() => toggle(item.id)}
      style={[styles.row, { borderColor: checked ? c.accent : c.border, backgroundColor: c.surface }]}>
      <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={24} color={checked ? c.accent : c.muted} />
      <View style={styles.rowText}>
        <Text style={[styles.author, { color: c.muted }]}>{author} · {when(item.createdAt)}</Text>
        <Text style={[styles.body, { color: c.textPrimary }]}>{item.body}</Text>
      </View>
    </Pressable>;
  };

  const footer = <View style={styles.footer}>
    {cursor !== null ? <Pressable accessibilityRole="button" disabled={loadingOlder} onPress={() => void loadOlder()} style={styles.action}>
      {loadingOlder ? <ActivityIndicator color={c.accent} accessibilityLabel="Cargando mensajes anteriores" /> : <Text style={[styles.link, { color: c.accent }]}>{olderError ? 'Reintentar mensajes anteriores' : 'Cargar mensajes anteriores'}</Text>}
    </Pressable> : null}
    {olderError ? <Text accessibilityRole="alert" style={[styles.error, { color: c.error }]}>{olderError}</Text> : null}
    <Text style={[styles.label, { color: c.textPrimary }]}>Explicación (opcional)</Text>
    <TextInput
      accessibilityLabel="Explicación del reporte, opcional"
      placeholder="Cuéntanos qué pasó, si quieres"
      placeholderTextColor={c.muted}
      value={note}
      onChangeText={text => { setNote(text); if (sendError) setSendError(''); }}
      multiline
      maxLength={REPORT_NOTE_MAX}
      editable={!sending}
      style={[styles.note, { color: c.textPrimary, backgroundColor: c.surface, borderColor: c.border }]}
    />
    <Text style={[styles.counter, { color: note.length >= REPORT_NOTE_MAX ? c.error : c.muted }]}>{note.length}/{REPORT_NOTE_MAX}</Text>
    {sendError ? <Text accessibilityRole="alert" style={[styles.error, { color: c.error }]}>{sendError} Tu selección y lo que escribiste siguen aquí.</Text> : null}
    {!selected.size ? <Text style={[styles.hint, { color: c.muted }]}>Elige al menos un mensaje para enviar el reporte.</Text> : null}
    <Pressable accessibilityRole="button" accessibilityLabel={sending ? 'Enviando reporte' : 'Enviar reporte'} accessibilityState={{ disabled: !canSubmit, busy: sending }} disabled={!canSubmit} onPress={() => void submit()}
      style={({ pressed }) => [styles.submit, { backgroundColor: canSubmit || sending ? c.accent : c.surfaceAlt, opacity: pressed ? 0.85 : 1 }]}>
      {sending ? <><ActivityIndicator color={c.onAccent} /><Text style={[styles.submitText, { color: c.onAccent }]}>Enviando…</Text></>
        : <Text style={[styles.submitText, { color: canSubmit ? c.onAccent : c.muted }]}>{sendError ? 'Reintentar reporte' : selected.size ? `Enviar reporte (${selected.size})` : 'Enviar reporte'}</Text>}
    </Pressable>
  </View>;

  return <SafeAreaView style={[styles.screen, { backgroundColor: c.background }]} edges={['top', 'bottom']}>
    <View style={[styles.header, { borderBottomColor: c.border }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={saved ? 'Volver a la conversación' : 'Cancelar reporte y volver'} onPress={gone ? backToInbox : backToChat} style={styles.back} hitSlop={8}>
        <Ionicons name="arrow-back" size={24} color={c.accent} />
      </Pressable>
      <Text accessibilityRole="header" style={[styles.title, { color: c.textPrimary }]}>Reportar conversación</Text>
    </View>
    {saved ? <View style={styles.state}>
      <Ionicons name="checkmark-circle" size={48} color={c.accent} />
      <Text accessibilityRole="alert" style={[styles.stateTitle, { color: c.textPrimary }]}>Reporte guardado</Text>
      <Text style={[styles.stateText, { color: c.muted }]}>Guardamos los mensajes que elegiste{note.trim() ? ' y tu explicación' : ''}. Si no quieres recibir más mensajes de esta persona, puedes bloquearla desde las opciones del chat.</Text>
      <Pressable accessibilityRole="button" onPress={backToChat} style={[styles.submit, styles.stateButton, { backgroundColor: c.accent }]}><Text style={[styles.submitText, { color: c.onAccent }]}>Volver a la conversación</Text></Pressable>
    </View>
      : loading ? <View style={styles.padded}><ChatThreadSkeleton /></View>
      : !summary ? <View style={styles.state}>
        <Text style={[styles.stateText, { color: c.error }]}>{gone ? 'Esta conversación ya no está disponible.' : error}</Text>
        <Pressable accessibilityRole="button" onPress={() => gone ? backToInbox() : void load()} style={styles.action}><Text style={[styles.link, { color: c.accent }]}>{gone ? 'Volver a mensajes' : 'Reintentar'}</Text></Pressable>
      </View>
      : <FlatList
        data={messages}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        ListHeaderComponent={<Text style={[styles.intro, { color: c.muted }]}>{preselected > 0 ? 'Ya elegimos el mensaje que presionaste. Puedes sumar otros si también quieres reportarlos.' : 'Elige los mensajes que quieres reportar.'} Solo se guardan esos mensajes, no toda la conversación.</Text>}
        ListEmptyComponent={<Text style={[styles.stateText, { color: c.muted }]}>No hay mensajes que puedas reportar en este chat.</Text>}
        ListFooterComponent={messages.length ? footer : undefined}
      />}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, minHeight: 60 },
  back: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -spacing.sm },
  title: { flex: 1, fontFamily: 'Nunito_700Bold', fontSize: 19 },
  padded: { paddingHorizontal: spacing.lg },
  list: { padding: spacing.lg, gap: spacing.sm, flexGrow: 1 },
  intro: { fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 23, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, borderWidth: 1, borderRadius: 16, padding: spacing.md, minHeight: 56 },
  rowText: { flex: 1, gap: 2 },
  author: { fontFamily: 'Nunito_600SemiBold', fontSize: 13 },
  body: { fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 22 },
  footer: { gap: spacing.sm, paddingTop: spacing.sm },
  label: { fontFamily: 'Nunito_700Bold', fontSize: 16, marginTop: spacing.sm },
  note: { minHeight: 96, maxHeight: 180, borderWidth: 1, borderRadius: 15, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, fontFamily: 'Nunito_400Regular', fontSize: 16, textAlignVertical: 'top' },
  counter: { fontFamily: 'Nunito_600SemiBold', fontSize: 12, textAlign: 'right' },
  hint: { fontFamily: 'Nunito_400Regular', fontSize: 14 },
  error: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, lineHeight: 20 },
  submit: { minHeight: 52, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  submitText: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl },
  stateTitle: { fontFamily: 'Nunito_700Bold', fontSize: 21, textAlign: 'center' },
  stateText: { fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 23, textAlign: 'center' },
  stateButton: { alignSelf: 'stretch', marginTop: spacing.md },
  action: { minHeight: 48, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg },
  link: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
});
