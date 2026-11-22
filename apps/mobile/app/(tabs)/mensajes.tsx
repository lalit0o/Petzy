import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, Platform, Pressable, RefreshControl, StyleSheet, Text, TextInput, View, type TextInputInstance, type ViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnchoredMenu, AnchoredMenuItem, type MenuAnchor } from '@/components/anchored-menu';
import { AnimatedPressable } from '@/components/animated-pressable';
import { CHAT_ACTION_TEXT, useChatActions } from '@/hooks/use-chat-actions';
import { ChatAvatar } from '@/components/chat-avatar';
import { ConversationListSkeleton, PersonListSkeleton } from '@/components/skeleton';
import { useAuthContext } from '@/context/AuthContext';
import { useChatEvent } from '@/context/ChatSocketContext';
import { petzyColors, spacing } from '@/constants/petzy-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { listConversations, openConversation, type ConversationSummary } from '@/lib/chat-api';
import { formatRelativeTime } from '@/lib/format';
import { searchProfiles, type PublicProfile } from '@/lib/profiles-api';
import { NAV_HEIGHT } from '@/components/nav';

const SEARCH_MIN = 2; const SEARCH_MAX = 50; const SEARCH_DELAY = 350;

// Botón `…` de cada fila; mide su posición para que el menú salga desde él.
function RowMenuButton({ label, busy, disabled, color, onOpen }: { label: string; busy: boolean; disabled: boolean; color: string; onOpen: (anchor: MenuAnchor) => void }) {
  const ref = useRef<ViewInstance>(null);
  return <View ref={ref} collapsable={false}>
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ busy, disabled }} disabled={disabled} hitSlop={4} style={styles.rowMenu}
      onPress={() => ref.current?.measureInWindow((x, y, width, height) => onOpen({ x: x + width / 2, y: y + height / 2, bottom: y + height }))}>
      {busy ? <ActivityIndicator color={color} /> : <Ionicons name="ellipsis-horizontal" size={22} color={color} />}
    </Pressable>
  </View>;
}

// Bandeja de Chat (DI-CH-01, CH-T12). Es la pestaña «Mensajes» de la barra (D-150).
// La búsqueda de arriba (D-152) cambia la lista por personas y abre su chat directamente.
export default function MessagesScreen() {
  const { token, user } = useAuthContext(); const router = useRouter();
  const dark = useColorScheme() === 'dark';
  const c = petzyColors[dark ? 'dark' : 'light'];
  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true); const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(''); const [refreshing, setRefreshing] = useState(false);
  const requestId = useRef(0); const loaded = useRef(false);

  // `silent` actualiza sin vaciar la lista ni mostrar el esqueleto de nuevo.
  const load = useCallback(async (silent = false) => {
    if (!token) return; const current = ++requestId.current;
    if (!silent) { setLoading(true); setItems([]); setCursor(null); }
    setError('');
    try {
      const result = await listConversations(token);
      if (current !== requestId.current) return;
      setItems(result.items); setCursor(result.nextCursor);
    } catch (cause) {
      if (current === requestId.current) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar tus conversaciones.');
    } finally { if (current === requestId.current) setLoading(false); }
  }, [token]);

  const loadMore = async () => {
    if (!token || cursor === null || loadingMore) return;
    const current = requestId.current; setLoadingMore(true); setError('');
    try {
      const result = await listConversations(token, cursor);
      if (current !== requestId.current) return;
      setItems(old => [...old, ...result.items.filter(item => !old.some(row => row.id === item.id))]); setCursor(result.nextCursor);
    } catch (cause) {
      if (current === requestId.current) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar más conversaciones.');
    } finally { setLoadingMore(false); }
  };

  // Deslizar para actualizar (estándar del 22-11-2026): recarga silenciosa.
  const refresh = async () => { setRefreshing(true); try { await load(true); } finally { setRefreshing(false); } };

  useFocusEffect(useCallback(() => {
    const silent = loaded.current; loaded.current = true;
    void load(silent);
    return () => { requestId.current++; };
  }, [load]));

  // Avisos en vivo (CH-T10): un mensaje nuevo sube su chat y suma pendientes;
  // un chat que aún no está en la lista se trae de la API.
  useChatEvent('message', ({ conversationId, message }) => {
    if (!items.some(item => item.id === conversationId)) { void load(true); return; }
    setItems(old => {
      const found = old.find(item => item.id === conversationId);
      if (!found) return old;
      const updated = { ...found, lastMessage: message, hidden: false, unreadCount: message.mine ? found.unreadCount : found.unreadCount + 1 };
      return [updated, ...old.filter(item => item.id !== conversationId)];
    });
  });
  useChatEvent('presence', ({ conversationId, online }) => setItems(old => old.map(item => item.id === conversationId ? { ...item, otherOnline: online } : item)));
  useChatEvent('block', () => { void load(true); });
  useChatEvent('resync', () => { if (loaded.current) void load(true); });

  // Opciones de cada chat desde la bandeja (D-153): mismas acciones y
  // confirmaciones que dentro de la conversación.
  const [rowMenu, setRowMenu] = useState<{ item: ConversationSummary; anchor: MenuAnchor } | null>(null);
  const actions = useChatActions({
    onDone: (action, target, updated) => setItems(old => updated
      ? old.map(item => item.id === target.id ? updated : item)
      : old.filter(item => item.id !== target.id)),
    onGone: target => setItems(old => old.filter(item => item.id !== target.id)),
  });

  // Búsqueda de personas (D-152). Se lanza sola al dejar de escribir o con la
  // tecla «Buscar»; cada cambio del texto invalida la respuesta anterior.
  const inputRef = useRef<TextInputInstance>(null);
  const searchId = useRef(0); const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState<PublicProfile[]>([]);
  const [peopleCursor, setPeopleCursor] = useState<string | null>(null);
  const [searching, setSearching] = useState(false); const [searchingMore, setSearchingMore] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [openingId, setOpeningId] = useState<string | null>(null); const [openError, setOpenError] = useState('');
  const searchMode = query.trim().length >= SEARCH_MIN;
  const others = (list: PublicProfile[]) => list.filter(person => person.id !== user?.id);

  useEffect(() => () => clearTimeout(timer.current), []);

  const runSearch = async (q: string) => {
    if (!token) return; clearTimeout(timer.current);
    const current = ++searchId.current;
    setSearching(true); setSearchError(''); setPeople([]); setPeopleCursor(null);
    try {
      const page = await searchProfiles(token, q);
      if (current === searchId.current) { setPeople(others(page.items)); setPeopleCursor(page.nextCursor); }
    } catch (cause) {
      if (current === searchId.current) setSearchError(cause instanceof Error ? cause.message : 'No se pudo buscar.');
    } finally { if (current === searchId.current) setSearching(false); }
  };

  const searchMore = async () => {
    if (!token || !peopleCursor || searchingMore) return;
    const current = searchId.current; setSearchingMore(true); setSearchError('');
    try {
      const page = await searchProfiles(token, query.trim(), peopleCursor);
      if (current === searchId.current) { setPeople(old => [...old, ...others(page.items).filter(person => !old.some(row => row.id === person.id))]); setPeopleCursor(page.nextCursor); }
    } catch (cause) {
      if (current === searchId.current) setSearchError(cause instanceof Error ? cause.message : 'No se pudieron cargar más personas.');
    } finally { if (current === searchId.current) setSearchingMore(false); }
  };

  const changeQuery = (next: string) => {
    clearTimeout(timer.current); searchId.current++;
    const q = next.trim(); const valid = q.length >= SEARCH_MIN;
    setQuery(next); setPeople([]); setPeopleCursor(null); setSearchError(''); setOpenError(''); setSearchingMore(false);
    // El esqueleto aparece desde la primera letra válida para no mostrar
    // «No encontramos a nadie» mientras se espera a que deje de escribir.
    setSearching(valid);
    if (valid) timer.current = setTimeout(() => void runSearch(q), SEARCH_DELAY);
  };

  const submitSearch = () => {
    const q = query.trim();
    if (q.length >= SEARCH_MIN) void runSearch(q); else Keyboard.dismiss();
  };

  // Abre el chat existente con esa persona o crea uno (D-75), sin pasar por su perfil.
  const openPerson = async (person: PublicProfile) => {
    if (!token || openingId) return;
    setOpeningId(person.id); setOpenError('');
    try {
      const conversation = await openConversation(token, person.id);
      Keyboard.dismiss(); changeQuery('');
      router.push((`/messages/${conversation.id}`) as Href);
    } catch (cause) {
      setOpenError(cause instanceof Error ? cause.message : 'No se pudo abrir la conversación.');
    } finally { setOpeningId(null); }
  };

  const renderPerson = ({ item }: { item: PublicProfile }) => {
    const opening = openingId === item.id;
    return <AnimatedPressable accessibilityRole="button" accessibilityLabel={opening ? `Abriendo conversación con ${item.username}` : `Escribir a ${item.username}`} accessibilityState={{ busy: opening, disabled: openingId !== null }} disabled={openingId !== null} onPress={() => void openPerson(item)} style={[styles.row, { borderBottomColor: c.border }]}>
      {token ? <ChatAvatar avatarUrl={item.avatarUrl} token={token} size={52} /> : null}
      <Text numberOfLines={1} style={[styles.name, { color: c.textPrimary }]}>{item.username}</Text>
      {opening ? <ActivityIndicator color={c.accent} /> : <Ionicons name="chatbubble-outline" size={22} color={c.accent} />}
    </AnimatedPressable>;
  };

  const renderItem = ({ item }: { item: ConversationSummary }) => {
    const unread = item.unreadCount > 0;
    const preview = item.lastMessage ? `${item.lastMessage.mine ? 'Tú: ' : ''}${item.lastMessage.body}` : '';
    const label = [item.otherUser.username, item.otherOnline ? 'en línea' : null, unread ? `${item.unreadCount} sin leer` : null, preview].filter(Boolean).join('. ');
    const busy = actions.acting?.id === item.id;
    const failed = actions.error?.target.id === item.id ? actions.error : null;
    return <View style={[styles.rowWrap, { borderBottomColor: c.border }]}>
      <View style={styles.rowLine}>
        <AnimatedPressable accessibilityRole="button" accessibilityLabel={label} onPress={() => router.push((`/messages/${item.id}`) as Href)} style={styles.row}>
          {token ? <ChatAvatar avatarUrl={item.otherUser.avatarUrl} token={token} size={52} online={item.otherOnline} /> : null}
          <View style={styles.rowText}>
            <View style={styles.rowTop}>
              <Text numberOfLines={1} style={[styles.name, { color: c.textPrimary }]}>{item.otherUser.username}</Text>
              {item.lastMessage ? <Text style={[styles.time, { color: unread ? c.accent : c.muted }]}>{formatRelativeTime(item.lastMessage.createdAt)}</Text> : null}
            </View>
            <View style={styles.rowTop}>
              <Text numberOfLines={1} style={[styles.preview, { color: unread ? c.textPrimary : c.muted, fontFamily: unread ? 'Nunito_700Bold' : 'Nunito_400Regular' }]}>{preview}</Text>
              {unread ? <View style={[styles.badge, { backgroundColor: c.accent }]}><Text style={[styles.badgeText, { color: c.onAccent }]}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text></View> : null}
            </View>
          </View>
        </AnimatedPressable>
        <RowMenuButton label={busy && actions.acting ? CHAT_ACTION_TEXT[actions.acting.action].busy : `Opciones del chat con ${item.otherUser.username}`} busy={busy} disabled={actions.acting !== null} color={c.accent} onOpen={anchor => setRowMenu({ item, anchor })} />
      </View>
      {failed ? <View accessibilityRole="alert" style={styles.rowError}>
        <Text style={[styles.rowErrorText, { color: c.error }]}>{failed.message}</Text>
        <Pressable accessibilityRole="button" disabled={actions.acting !== null} onPress={actions.retry} style={styles.retry}><Text style={[styles.link, { color: c.accent }]}>{CHAT_ACTION_TEXT[failed.action].retry}</Text></Pressable>
      </View> : null}
    </View>;
  };

  return <SafeAreaView style={[styles.screen, { backgroundColor: c.background }]} edges={['top']}>
    <View style={[styles.header, { borderBottomColor: c.border }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: c.accent }]}>Mensajes</Text>
      <View style={styles.searchShell}>
        <Ionicons name="search" size={20} color={c.muted} style={styles.searchIcon} />
        <TextInput ref={inputRef} accessibilityLabel="Buscar a alguien para escribirle" value={query} onChangeText={changeQuery} maxLength={SEARCH_MAX}
          placeholder="Buscar a alguien para escribirle" placeholderTextColor={c.muted} autoCapitalize="none" autoCorrect={false}
          returnKeyType="search" submitBehavior="blurAndSubmit" onSubmitEditing={submitSearch}
          style={[styles.search, { backgroundColor: c.surface, color: c.textPrimary, borderColor: c.border }]} />
        {query.length > 0 ? <Pressable accessibilityRole="button" accessibilityLabel="Borrar búsqueda" onPress={() => { changeQuery(''); inputRef.current?.focus(); }} style={styles.clear}><Ionicons name="close-circle" size={22} color={c.muted} /></Pressable> : null}
      </View>
      {query.trim().length > 0 && !searchMode ? <Text style={[styles.hint, { color: c.muted }]}>Escribe al menos {SEARCH_MIN} letras para buscar.</Text> : null}
    </View>
    {searchMode ? <FlatList
      key="people"
      data={people}
      keyExtractor={person => person.id}
      renderItem={renderPerson}
      contentContainerStyle={[styles.content, { paddingBottom: NAV_HEIGHT + spacing.xxxl }]}
      automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      ListHeaderComponent={openError ? <Text accessibilityRole="alert" style={[styles.stateText, styles.openError, { color: c.error }]}>{openError}</Text> : undefined}
      ListEmptyComponent={searching ? <PersonListSkeleton />
        : searchError ? <View style={styles.state}><Ionicons name="cloud-offline-outline" size={36} color={c.error} /><Text style={[styles.stateText, { color: c.error }]}>{searchError}</Text><Pressable accessibilityRole="button" onPress={() => void runSearch(query.trim())} style={styles.retry}><Text style={[styles.link, { color: c.accent }]}>Reintentar</Text></Pressable></View>
        : <View style={styles.state}>
            <Ionicons name="person-outline" size={40} color={c.accent} />
            <Text style={[styles.stateTitle, { color: c.textPrimary }]}>No encontramos a nadie con ese nombre</Text>
            <Text style={[styles.stateText, { color: c.muted }]}>Revisa cómo se escribe su nombre de usuario.</Text>
          </View>}
      ListFooterComponent={people.length ? <View style={styles.footer}>
        {searchError ? <Text style={[styles.stateText, { color: c.error }]}>{searchError}</Text> : null}
        {peopleCursor !== null ? <Pressable accessibilityRole="button" disabled={searchingMore} onPress={() => void searchMore()} style={styles.retry}>{searchingMore ? <ActivityIndicator color={c.accent} accessibilityLabel="Cargando más personas" /> : <Text style={[styles.link, { color: c.accent }]}>{searchError ? 'Reintentar' : 'Cargar más'}</Text>}</Pressable> : null}
      </View> : undefined}
    /> : <FlatList
      key="inbox"
      keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      data={items}
      keyExtractor={item => String(item.id)}
      renderItem={renderItem}
      contentContainerStyle={[styles.content, { paddingBottom: NAV_HEIGHT + spacing.xxxl }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={c.accent} colors={[c.accent]} progressBackgroundColor={c.surface} />}
      ListEmptyComponent={loading ? <ConversationListSkeleton />
        : error ? <View style={styles.state}><Ionicons name="cloud-offline-outline" size={36} color={c.error} /><Text style={[styles.stateText, { color: c.error }]}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void load()} style={styles.retry}><Text style={[styles.link, { color: c.accent }]}>Reintentar</Text></Pressable></View>
        : <View style={styles.state}>
            <Ionicons name="chatbubbles-outline" size={40} color={c.accent} />
            <Text style={[styles.stateTitle, { color: c.textPrimary }]}>Aún no tienes conversaciones</Text>
            <Text style={[styles.stateText, { color: c.muted }]}>Busca a alguien arriba para empezar.</Text>
          </View>}
      ListFooterComponent={items.length ? <View style={styles.footer}>
        {error ? <Text style={[styles.stateText, { color: c.error }]}>{error}</Text> : null}
        {cursor !== null ? <Pressable accessibilityRole="button" disabled={loadingMore} onPress={() => void loadMore()} style={styles.retry}>{loadingMore ? <ActivityIndicator color={c.accent} accessibilityLabel="Cargando más conversaciones" /> : <Text style={[styles.link, { color: c.accent }]}>{error ? 'Reintentar' : 'Cargar más'}</Text>}</Pressable> : null}
      </View> : undefined}
    />}
    <AnchoredMenu visible={rowMenu !== null} anchor={rowMenu?.anchor ?? { x: 0, y: 0, bottom: 0 }} width={260} estimatedHeight={300} title={rowMenu ? `Chat con ${rowMenu.item.otherUser.username}` : undefined} onClose={() => setRowMenu(null)}>
      {rowMenu ? <>
        <AnchoredMenuItem icon="person-outline" label="Ver perfil" onPress={() => router.push((`/profiles/${rowMenu.item.otherUser.id}`) as Href)} />
        {rowMenu.item.blockedByMe
          ? <AnchoredMenuItem icon="lock-open-outline" label="Desbloquear" onPress={() => actions.request('unblock', rowMenu.item)} />
          : <AnchoredMenuItem icon="hand-left-outline" label="Bloquear" destructive onPress={() => actions.request('block', rowMenu.item)} />}
        <AnchoredMenuItem icon="eye-off-outline" label="Ocultar chat" onPress={() => actions.request('hide', rowMenu.item)} />
        <AnchoredMenuItem icon="trash-outline" label="Borrar chat para mí" destructive separator={false} onPress={() => actions.request('clear', rowMenu.item)} />
      </> : null}
    </AnchoredMenu>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontFamily: 'Nunito_700Bold', fontSize: 29, lineHeight: 36, letterSpacing: -0.3 },
  searchShell: { marginTop: spacing.sm, justifyContent: 'center' },
  searchIcon: { position: 'absolute', left: 14, zIndex: 1 },
  search: { minHeight: 48, borderWidth: 1, borderRadius: 15, paddingLeft: 42, paddingRight: 48, fontFamily: 'Nunito_400Regular', fontSize: 16 },
  clear: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 48, alignItems: 'center', justifyContent: 'center' },
  hint: { fontFamily: 'Nunito_400Regular', fontSize: 14, marginTop: spacing.xs },
  openError: { paddingTop: spacing.md },
  content: { paddingHorizontal: spacing.lg, flexGrow: 1 },
  rowWrap: { borderBottomWidth: StyleSheet.hairlineWidth },
  rowLine: { flexDirection: 'row', alignItems: 'center' },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, minHeight: 76 },
  rowMenu: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -spacing.sm },
  rowError: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs, paddingBottom: spacing.sm },
  rowErrorText: { flex: 1, minWidth: 160, fontFamily: 'Nunito_600SemiBold', fontSize: 14, lineHeight: 20 },
  rowText: { flex: 1, gap: 2 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flex: 1, fontFamily: 'Nunito_700Bold', fontSize: 16 },
  time: { fontFamily: 'Nunito_600SemiBold', fontSize: 12 },
  preview: { flex: 1, fontSize: 15, lineHeight: 21 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: 'Nunito_700Bold', fontSize: 12 },
  state: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingTop: 80, paddingHorizontal: spacing.xl },
  stateTitle: { fontFamily: 'Nunito_700Bold', fontSize: 19, textAlign: 'center' },
  stateText: { fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 23, textAlign: 'center' },
  retry: { minHeight: 48, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg },
  link: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
  footer: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.md },
});
