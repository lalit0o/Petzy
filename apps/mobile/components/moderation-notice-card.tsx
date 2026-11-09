import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CommunityCard, useCommunityColors } from '@/components/community-ui';
import type { ModerationNotice } from '@/lib/moderation-notices-api';
import { removalReasonHint, removalReasonLabel } from '@/lib/removal-reasons';

function Field({ label, children, last = false }: { label: string; children: ReactNode; last?: boolean }) {
  const c = useCommunityColors();
  return <View style={[styles.field, !last && { borderBottomColor: c.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
    <Text style={[styles.label, { color: c.muted }]}>{label}</Text>
    {children}
  </View>;
}

// Fecha y hora locales de la retirada, p. ej. «9 de noviembre de 2026, 5:11 a.m.».
function dateLabel(iso: string) {
  const date = new Date(iso);
  const day = date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  const time = date.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
  return `${day}, ${time}`;
}

// Tarjeta compartida por el aviso «Entendido» y el historial (D-142, D-143).
// Cada dato va en su propia línea con una etiqueta clara: qué se retiró, dónde,
// por qué y cuándo. Nunca muestra quién lo retiró (D-141).
export function ModerationNoticeCard({ notice, showStatus = false }: { notice: ModerationNotice; showStatus?: boolean }) {
  const c = useCommunityColors();
  const isPost = notice.kind === 'POST';
  const reason = removalReasonLabel(notice.reason);
  const hint = removalReasonHint(notice.reason);
  const restored = notice.status === 'RESTORED';
  return <CommunityCard style={styles.card}>
    <View style={styles.top}>
      <Text accessibilityRole="header" style={[styles.kind, { color: c.heading }]}>{isPost ? 'Publicación retirada' : 'Comentario retirado'}</Text>
      {showStatus ? <Text style={[styles.chip, { color: restored ? c.heading : c.error, borderColor: restored ? c.heading : c.error }]}>{restored ? 'Ya restaurada' : 'Sigue retirada'}</Text> : null}
    </View>
    <Field label={isPost ? 'Tu publicación' : 'Tu comentario'}>
      <Text style={[styles.value, { color: c.text }]}>{isPost ? notice.excerpt : `«${notice.excerpt}»`}</Text>
    </Field>
    {!isPost && notice.postTitle ? <Field label="En la publicación"><Text style={[styles.value, { color: c.text }]}>{notice.postTitle}</Text></Field> : null}
    <Field label="Comunidad"><Text style={[styles.value, { color: c.text }]}>{notice.community?.name ?? 'Comunidad no disponible'}</Text></Field>
    <Field label="Motivo">
      <Text style={[styles.reason, { color: c.error }]}>{reason ?? 'Sin motivo registrado'}</Text>
      {hint ? <Text style={[styles.hint, { color: c.muted }]}>{hint}</Text> : null}
    </Field>
    {notice.note ? <Field label="Mensaje de la moderación"><Text style={[styles.value, { color: c.text }]}>{notice.note}</Text></Field> : null}
    <Field label="Fecha" last><Text style={[styles.value, { color: c.text }]}>{dateLabel(notice.removedAt)}</Text></Field>
  </CommunityCard>;
}

const styles = StyleSheet.create({
  card: { gap: 0 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 10 },
  kind: { flex: 1, fontFamily: 'Nunito_700Bold', fontSize: 18, lineHeight: 24 },
  chip: { fontFamily: 'Nunito_700Bold', fontSize: 13, borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  field: { paddingVertical: 10, gap: 2 },
  label: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, lineHeight: 18 },
  value: { fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 23 },
  reason: { fontFamily: 'Nunito_700Bold', fontSize: 17, lineHeight: 23 },
  hint: { fontFamily: 'Nunito_400Regular', fontSize: 14, lineHeight: 20 },
});
