import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Modal, Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useReducedMotion } from 'react-native-reanimated';

import { FormScrollView } from '@/components/form-scroll-view';
import { CommunityButton, CommunityMessage, useCommunityColors } from '@/components/community-ui';
import { ModerationNoticeCard } from '@/components/moderation-notice-card';
import { useAuthContext } from '@/context/AuthContext';
import { acknowledgeModerationNotices, listModerationNotices, type ModerationNotice } from '@/lib/moderation-notices-api';

// Aviso «Entendido» (D-142). Solo se consulta al abrir la sesión y al volver a la
// app desde segundo plano: nunca mientras la persona navega o escribe. Si la
// consulta falla no bloquea nada y se reintenta en la próxima ocasión.
export function ModerationNoticeGate() {
  const { status, token, user } = useAuthContext();
  const c = useCommunityColors();
  const reducedMotion = useReducedMotion();
  const userId = user?.id ?? null;
  const [shown, setShown] = useState<{ userId: string; items: ModerationNotice[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const checking = useRef(false);
  const showing = useRef(false);
  const latest = useRef({ token, userId, status });
  useEffect(() => { latest.current = { token, userId, status }; }, [token, userId, status]);

  const check = useCallback(async () => {
    const { token: current, userId: owner, status: currentStatus } = latest.current;
    if (!current || !owner || currentStatus !== 'ready' || checking.current || showing.current) return;
    checking.current = true;
    try {
      const page = await listModerationNotices(current, { pending: true, limit: 30 });
      // Descarta la respuesta si la sesión cambió mientras esperaba.
      if (latest.current.userId !== owner || latest.current.status !== 'ready') return;
      if (page.items.length > 0) { showing.current = true; setError(''); setShown({ userId: owner, items: page.items }); }
    } catch (cause) {
      // Falla abierta: la app sigue funcionando y se reintenta después. En desarrollo se deja
      // rastro para no confundir «no hay avisos» con «el servidor no respondió».
      if (__DEV__) console.warn('[ModerationNoticeGate] No se pudieron consultar los avisos:', cause instanceof Error ? cause.message : cause);
    }
    finally { checking.current = false; }
  }, []);

  useEffect(() => {
    if (status !== 'ready' || !userId) return;
    let active = true;
    queueMicrotask(() => { if (active) void check(); });
    return () => { active = false; };
  }, [status, userId, check]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', next => { if (next === 'active') void check(); });
    return () => subscription.remove();
  }, [check]);

  const items = shown && shown.userId === userId && status === 'ready' ? shown.items : [];
  const close = () => { showing.current = false; setShown(null); setError(''); };

  const acknowledge = async () => {
    if (!token || busy || !items.length) return;
    setBusy(true); setError('');
    try {
      const result = await acknowledgeModerationNotices(token, items.map(item => item.id));
      close();
      if (result.pendingCount > 0) void check();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo confirmar el aviso.'); }
    finally { setBusy(false); }
  };

  if (!items.length) return null;
  return <Modal visible presentationStyle="fullScreen" animationType={reducedMotion ? 'fade' : 'slide'} onRequestClose={() => { if (!busy) close(); }}>
    {/* El modal es una ventana nativa distinta: medir sus áreas seguras aquí. */}
    <SafeAreaProvider style={[styles.screen, { backgroundColor: c.bg }]}>
      <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={styles.screen}>
        <FormScrollView contentContainerStyle={styles.content}>
          <Text accessibilityRole="header" style={[styles.title, { color: c.heading }]}>Se retiró contenido tuyo</Text>
          <Text style={[styles.intro, { color: c.text }]}>
            La moderación de la comunidad retiró {items.length === 1 ? 'esto' : 'estas publicaciones o comentarios'}. Puedes volver a revisarlo cuando quieras en Mi perfil, en «Avisos de moderación».
          </Text>
          {items.map(item => <ModerationNoticeCard key={item.id} notice={item} />)}
          <CommunityMessage text={error} error />
          <CommunityButton label={error ? 'Reintentar' : 'Entendido'} busy={busy} onPress={() => void acknowledge()} />
          {error ? <Pressable accessibilityRole="button" disabled={busy} style={styles.skip} onPress={close}><Text style={[styles.skipText, { color: c.heading }]}>Seguir sin confirmar</Text></Pressable> : null}
        </FormScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  </Modal>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, paddingBottom: 40, gap: 14 },
  title: { fontFamily: 'Nunito_700Bold', fontSize: 26, lineHeight: 34 },
  intro: { fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 24 },
  skip: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  skipText: { fontFamily: 'Nunito_700Bold', fontSize: 15 },
});
