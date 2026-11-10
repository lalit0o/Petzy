import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormScrollView } from '@/components/form-scroll-view';
import { petzyColors, radius, spacing } from '@/constants/petzy-theme';
import { useAuthContext } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AdoptionApiError, EXPLANATION_MAX, REPORT_REASONS, reportAdoption, type AdoptionReportReason } from '@/lib/adoptions-api';
import { goBackOrReplace } from '@/lib/navigation';

// Reportar un anuncio ajeno (AD-T15; D-94, D-96, D-97). Se guarda para una
// revisión futura del equipo; la app no promete retiro ni respuesta.
export default function ReportAdoptionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const adoptionId = Number(id);
  const { token } = useAuthContext(); const router = useRouter();
  const c = petzyColors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const [reason, setReason] = useState<AdoptionReportReason | null>(null);
  const [explanation, setExplanation] = useState('');
  const [sending, setSending] = useState(false); const [error, setError] = useState('');
  const [result, setResult] = useState<'saved' | 'repeated' | 'gone' | null>(null);

  const tooLong = explanation.trim().length > EXPLANATION_MAX;
  const canSend = reason !== null && !tooLong && !sending;
  const send = async () => {
    if (!token || !reason || !canSend) return;
    setSending(true); setError('');
    try {
      await reportAdoption(token, adoptionId, reason, explanation);
      setResult('saved');
    } catch (cause) {
      if (cause instanceof AdoptionApiError && cause.code === 'ADOPTION_ALREADY_REPORTED') setResult('repeated');
      else if (cause instanceof AdoptionApiError && cause.status === 404) setResult('gone');
      else setError(`${cause instanceof Error ? cause.message : 'No se pudo guardar el reporte.'} Tu motivo y explicación siguen aquí.`);
    } finally { setSending(false); }
  };

  const back = () => goBackOrReplace(router, (`/adoptions/${adoptionId}`) as Href);
  const outcome = result === 'saved' ? { icon: 'checkmark-circle' as const, title: 'Reporte guardado', text: 'Guardamos tu reporte junto con lo que decía el anuncio en este momento, para que pueda revisarse más adelante.' }
    : result === 'repeated' ? { icon: 'flag' as const, title: 'Ya lo reportaste', text: 'Cada persona puede reportar un anuncio una sola vez. Tu reporte anterior sigue guardado.' }
    : result === 'gone' ? { icon: 'paw-outline' as const, title: 'Este anuncio ya no está disponible', text: 'Quien lo publicó lo retiró, así que ya no se puede reportar.' } : null;

  return <SafeAreaView style={[styles.screen, { backgroundColor: c.background }]} edges={['top', 'bottom']}>
    <FormScrollView contentContainerStyle={styles.content}>
      <Pressable accessibilityRole="button" accessibilityLabel={outcome ? 'Volver al anuncio' : 'Cancelar reporte y volver'} onPress={result === 'gone' ? () => goBackOrReplace(router, '/adopcion' as Href) : back} style={styles.back}><Ionicons name="arrow-back" size={24} color={c.accent} /><Text style={[styles.link, { color: c.accent }]}>Volver</Text></Pressable>
      <Text accessibilityRole="header" style={[styles.heading, { color: c.accent }]}>Reportar anuncio</Text>
      {outcome ? <View style={styles.state}>
        <Ionicons name={outcome.icon} size={48} color={c.accent} />
        <Text accessibilityRole="alert" style={[styles.stateTitle, { color: c.textPrimary }]}>{outcome.title}</Text>
        <Text style={[styles.stateText, { color: c.muted }]}>{outcome.text}</Text>
        <Pressable accessibilityRole="button" onPress={result === 'gone' ? () => goBackOrReplace(router, '/adopcion' as Href) : back} style={[styles.send, styles.stateButton, { backgroundColor: c.accent }]}>
          <Text style={[styles.sendText, { color: c.onAccent }]}>{result === 'gone' ? 'Volver a Adopción' : 'Volver al anuncio'}</Text>
        </Pressable>
      </View> : <>
        <Text style={[styles.intro, { color: c.muted }]}>Cuéntanos qué problema ves. El reporte se guarda para revisarse más adelante; no le avisamos a quien publicó.</Text>
        <Text style={[styles.label, { color: c.textPrimary }]}>Motivo</Text>
        <View accessibilityRole="radiogroup" style={styles.reasons}>
          {REPORT_REASONS.map(item => {
            const selected = reason === item.value;
            return <Pressable key={item.value} accessibilityRole="radio" accessibilityState={{ checked: selected, disabled: sending }} disabled={sending} onPress={() => { setReason(item.value); setError(''); }}
              style={[styles.reason, { borderColor: selected ? c.accent : c.border, backgroundColor: c.surface }]}>
              <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? c.accent : c.muted} />
              <Text style={[styles.reasonText, { color: c.textPrimary }]}>{item.label}</Text>
            </Pressable>;
          })}
        </View>
        <Text style={[styles.label, { color: c.textPrimary }]}>Explicación (opcional)</Text>
        <TextInput accessibilityLabel="Explicación del reporte, opcional" value={explanation} onChangeText={text => { setExplanation(text); setError(''); }} maxLength={EXPLANATION_MAX} editable={!sending} multiline textAlignVertical="top"
          placeholder="Agrega lo que ayude a entender el problema" placeholderTextColor={c.muted} style={[styles.input, { backgroundColor: c.surface, color: c.textPrimary, borderColor: c.border }]} />
        <Text style={[styles.counter, { color: explanation.length >= EXPLANATION_MAX ? c.error : c.muted }]}>{explanation.length}/{EXPLANATION_MAX}</Text>
        {error ? <Text accessibilityRole="alert" style={[styles.error, { color: c.error }]}>{error}</Text> : null}
        {!reason ? <Text style={[styles.hint, { color: c.muted }]}>Elige un motivo para enviar el reporte.</Text> : null}
        <Pressable accessibilityRole="button" accessibilityLabel={sending ? 'Enviando reporte' : 'Enviar reporte'} accessibilityState={{ busy: sending, disabled: !canSend }} disabled={!canSend} onPress={() => void send()}
          style={[styles.send, { backgroundColor: canSend || sending ? c.accent : c.surfaceAlt }]}>
          {sending ? <><ActivityIndicator color={c.onAccent} /><Text style={[styles.sendText, { color: c.onAccent }]}>Enviando…</Text></>
            : <Text style={[styles.sendText, { color: canSend ? c.onAccent : c.muted }]}>{error ? 'Reintentar reporte' : 'Enviar reporte'}</Text>}
        </Pressable>
      </>}
    </FormScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { padding: spacing.lg, paddingBottom: 48 },
  back: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  link: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
  heading: { fontFamily: 'Nunito_700Bold', fontSize: 28, marginTop: spacing.sm, marginBottom: spacing.sm },
  intro: { fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 23 },
  label: { fontFamily: 'Nunito_700Bold', fontSize: 16, marginTop: spacing.lg, marginBottom: spacing.sm },
  reasons: { gap: spacing.sm },
  reason: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, minHeight: 52 },
  reasonText: { fontFamily: 'Nunito_600SemiBold', fontSize: 16 },
  input: { borderWidth: 1, borderRadius: 15, minHeight: 110, paddingHorizontal: 14, paddingTop: 12, fontFamily: 'Nunito_400Regular', fontSize: 16 },
  counter: { fontFamily: 'Nunito_400Regular', fontSize: 13, textAlign: 'right', marginTop: 4 },
  hint: { fontFamily: 'Nunito_400Regular', fontSize: 14, marginTop: spacing.md },
  error: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, lineHeight: 20, marginTop: spacing.md },
  send: { minHeight: 52, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.lg },
  sendText: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
  state: { alignItems: 'center', gap: spacing.sm, marginTop: 40, paddingHorizontal: spacing.md },
  stateTitle: { fontFamily: 'Nunito_700Bold', fontSize: 21, textAlign: 'center' },
  stateText: { fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 23, textAlign: 'center' },
  stateButton: { alignSelf: 'stretch', marginTop: spacing.md },
});
