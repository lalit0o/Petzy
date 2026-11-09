import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useReducedMotion } from 'react-native-reanimated';

import { FormScrollView } from '@/components/form-scroll-view';
import { CommunityButton, CommunityMessage, useCommunityColors } from '@/components/community-ui';
import { REMOVAL_NOTE_MAX, REMOVAL_REASONS, removalPayload, validateRemoval, type RemovalPayload, type RemovalReason } from '@/lib/removal-reasons';

type Props = {
  kind: 'post' | 'comment';
  // Debe lanzar un Error con mensaje legible si el servidor rechaza la retirada.
  // Al resolver, quien lo usa cierra el modal; aquí no se cierra por sí solo.
  onConfirm: (payload: RemovalPayload) => Promise<void>;
  onClose: () => void;
};

// Estándar «Elegir un motivo al retirar contenido» (D-140). Se monta solo
// mientras está abierto, de modo que cada apertura empieza sin motivo ni nota.
export function RemovalReasonModal({ kind, onConfirm, onClose }: Props) {
  const c = useCommunityColors();
  const reducedMotion = useReducedMotion();
  const submitting = useRef(false);
  const [reason, setReason] = useState<RemovalReason | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const noteRequired = reason === 'OTHER';
  const noun = kind === 'post' ? 'publicación' : 'comentario';

  // La misma función atiende el botón visible y cualquier otra vía de envío.
  const submit = async () => {
    if (submitting.current) return;
    const problem = validateRemoval(reason, note);
    if (problem) { setError(problem); return; }
    submitting.current = true; setBusy(true); setError('');
    try { await onConfirm(removalPayload(reason!, note)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : `No se pudo retirar la ${noun}.`); }
    finally { submitting.current = false; setBusy(false); }
  };
  const close = () => { if (!submitting.current) onClose(); };

  return <Modal visible presentationStyle="fullScreen" animationType={reducedMotion ? 'fade' : 'slide'} onRequestClose={close}>
    {/* El modal es una ventana nativa distinta: medir sus áreas seguras aquí. */}
    <SafeAreaProvider style={[styles.screen, { backgroundColor: c.bg }]}>
      <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={styles.screen}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={[styles.title, { color: c.heading }]}>Retirar {noun}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Cerrar sin retirar" disabled={busy} style={styles.close} onPress={close}>
            <Text style={[styles.closeText, { color: c.heading }]}>Cerrar</Text>
          </Pressable>
        </View>
        <FormScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.intro, { color: c.text }]}>Elige por qué se retira. La persona que {kind === 'post' ? 'la publicó' : 'lo escribió'} verá el motivo.</Text>
          <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
            {REMOVAL_REASONS.map(item => {
              const selected = reason === item.value;
              return <Pressable key={item.value} accessibilityRole="radio" accessibilityState={{ checked: selected, disabled: busy }} disabled={busy}
                style={[styles.row, { backgroundColor: c.card, borderColor: selected ? c.heading : c.border, borderWidth: selected ? 2 : 1 }]}
                onPress={() => { setReason(item.value); setError(''); }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: c.text }]}>{item.label}</Text>
                  <Text style={[styles.hint, { color: c.muted }]}>{item.hint}</Text>
                </View>
                {selected ? <Ionicons name="checkmark-circle" size={22} color={c.heading} /> : <Ionicons name="ellipse-outline" size={22} color={c.border} />}
              </Pressable>;
            })}
          </View>
          <Text style={[styles.label, { color: c.text }]}>{noteRequired ? 'Nota (obligatoria)' : 'Nota (opcional)'}</Text>
          <TextInput
            accessibilityLabel={noteRequired ? 'Nota, obligatoria' : 'Nota, opcional'}
            multiline maxLength={REMOVAL_NOTE_MAX} value={note} editable={!busy}
            onChangeText={value => { setNote(value); setError(''); }}
            placeholder="Añade un detalle breve" placeholderTextColor={c.muted} textAlignVertical="top"
            style={[styles.note, { backgroundColor: c.card, borderColor: c.border, color: c.text }]}
          />
          <Text style={[styles.counter, { color: c.muted }]}>{note.length}/{REMOVAL_NOTE_MAX}</Text>
          <CommunityMessage text={error} error />
          <CommunityButton label={error && !validateRemoval(reason, note) ? 'Reintentar' : `Retirar ${noun}`} destructive busy={busy} onPress={() => void submit()} />
          <CommunityButton label="Cancelar" secondary disabled={busy} onPress={close} />
        </FormScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  </Modal>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1, fontFamily: 'Nunito_700Bold', fontSize: 22 },
  close: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  closeText: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
  content: { padding: 20, paddingTop: 4, paddingBottom: 40, gap: 14 },
  intro: { fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 24 },
  row: { minHeight: 56, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
  hint: { fontFamily: 'Nunito_400Regular', fontSize: 14, lineHeight: 20 },
  note: { borderWidth: 1, borderRadius: 14, minHeight: 92, paddingHorizontal: 12, paddingTop: 10, fontFamily: 'Nunito_400Regular', fontSize: 16 },
  counter: { fontFamily: 'Nunito_400Regular', fontSize: 13, textAlign: 'right', marginTop: -8 },
});
