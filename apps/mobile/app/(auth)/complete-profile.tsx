import { useState } from 'react';
import { FlatList, Keyboard, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthFlowButton, AuthFlowField, AuthFlowMessage, AuthFlowScreen, useAuthFlowColors } from '@/components/auth-flow-ui';
import { useAuthContext } from '@/context/AuthContext';
import { MEXICO_STATES, type MexicoState } from '@/types/mexicoState';

function labelForState(value: MexicoState) {
  return value.toLowerCase().split('_').map(part => part[0].toUpperCase() + part.slice(1)).join(' ');
}

export default function CompleteProfile() {
  const { completeProfile, logOut, authError } = useAuthContext();
  const colors = useAuthFlowColors();
  const [username, setUsername] = useState('');
  const [locatedAt, setLocatedAt] = useState<MexicoState | null>(null);
  const [selectingState, setSelectingState] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  async function submit() {
    if (saving) return;
    if (username.trim().length < 3 || username.trim().length > 30 || !locatedAt) {
      setFormError('Escribe un nombre de 3 a 30 caracteres y elige tu estado.');
      return;
    }
    setFormError('');
    setSaving(true);
    try { await completeProfile(username.trim(), locatedAt); }
    finally { setSaving(false); }
  }

  return <AuthFlowScreen title="Completa tu perfil" description="Tu cuenta ya existe. Solo falta guardar el nombre que verán otras personas y tu estado para entrar a Petzy.">
    <AuthFlowField label="Nombre de usuario" value={username} onChangeText={setUsername} returnKeyType="next" onSubmitEditing={() => { Keyboard.dismiss(); setSelectingState(true); }} />
    <Text style={[styles.label, { color: colors.text }]}>Estado de México</Text>
    <Pressable style={[styles.statePicker, { backgroundColor: colors.surface, borderColor: formError ? colors.error : colors.border }]} onPress={() => setSelectingState(true)} accessibilityRole="button" accessibilityLabel="Elegir estado">
      <Text style={[styles.value, { color: colors.text }]}>{locatedAt ? labelForState(locatedAt) : 'Selecciona tu estado'}</Text>
    </Pressable>
    {!!(formError || authError) && <AuthFlowMessage text={formError || authError} error />}
    <AuthFlowButton label="Guardar y entrar" loadingLabel="Guardando…" onPress={() => void submit()} loading={saving} />
    <AuthFlowButton label="Usar otra cuenta" onPress={() => void logOut()} secondary />
    <Modal visible={selectingState} animationType="slide" onRequestClose={() => setSelectingState(false)}>
      <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.heading }]}>Elige tu estado</Text>
          <Pressable onPress={() => setSelectingState(false)} accessibilityRole="button"><Text style={[styles.close, { color: colors.heading }]}>Cerrar</Text></Pressable>
        </View>
        <FlatList data={MEXICO_STATES} keyExtractor={item => item} renderItem={({ item }) =>
          <Pressable style={[styles.row, { borderColor: colors.border }]} onPress={() => { setLocatedAt(item); setSelectingState(false); setFormError(''); }}>
            <Text style={[styles.value, { color: colors.text }]}>{labelForState(item)}</Text>
          </Pressable>
        } />
      </SafeAreaView>
    </Modal>
  </AuthFlowScreen>;
}

const styles = StyleSheet.create({
  label: { fontFamily: 'Nunito_700Bold', fontSize: 16, marginBottom: -8 },
  statePicker: { minHeight: 52, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center' },
  value: { fontFamily: 'Nunito_400Regular', fontSize: 16 },
  modal: { flex: 1 },
  modalHeader: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontFamily: 'Nunito_700Bold', fontSize: 22 },
  close: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
  row: { minHeight: 52, paddingHorizontal: 20, justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
});
