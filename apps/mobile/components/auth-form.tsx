import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { FlatList, Keyboard, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthFlowButton, AuthFlowField, AuthFlowMessage, AuthFlowScreen, useAuthFlowColors } from '@/components/auth-flow-ui';
import { useAuthContext } from '@/context/AuthContext';
import { MEXICO_STATES, type MexicoState } from '@/types/mexicoState';

function stateLabel(value: MexicoState) {
  return value.toLowerCase().split('_').map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
}

export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const colors = useAuthFlowColors();
  const { logIn, signUp, authError, clearAuthError } = useAuthContext();
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [locatedAt, setLocatedAt] = useState<MexicoState | null>(null);
  const [choosingState, setChoosingState] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; username?: string; locatedAt?: string }>({});

  function validate() {
    const next: typeof errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Escribe un correo válido.';
    if (password.length < 8 && mode === 'register') next.password = 'La contraseña debe tener al menos 8 caracteres.';
    if (!password && mode === 'login') next.password = 'Escribe tu contraseña.';
    if (mode === 'register') {
      if (username.trim().length < 3 || username.trim().length > 30) next.username = 'Usa entre 3 y 30 caracteres.';
      if (!locatedAt) next.locatedAt = 'Elige tu estado.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit() {
    if (submitting || !validate()) return;
    setSubmitting(true);
    try {
      if (mode === 'login') {
        const result = await logIn(email.trim(), password);
        setPassword('');
        if (result === 'unconfirmed') router.replace('/(auth)/confirmation-pending');
      } else {
        const ok = await signUp({ email: email.trim(), username: username.trim(), password, locatedAt: locatedAt! });
        setPassword('');
        if (ok) router.replace('/(auth)/confirmation-pending');
      }
    } finally { setSubmitting(false); }
  }

  return <AuthFlowScreen
    title={mode === 'login' ? 'Bienvenido de vuelta' : 'Crea tu cuenta'}
    description={mode === 'login'
      ? 'Inicia sesión para explorar Petzy y compartir con la comunidad.'
      : 'Únete a Petzy para compartir y conocer mascotas. Puedes empezar sin registrar una.'}
  >
    {mode === 'register' && <AuthFlowField label="Nombre de usuario" value={username} onChangeText={setUsername} returnKeyType="next" onSubmitEditing={() => emailInputRef.current?.focus()} error={errors.username} />}
    <AuthFlowField label="Correo" value={email} onChangeText={setEmail} inputRef={emailInputRef} returnKeyType="next" onSubmitEditing={() => passwordInputRef.current?.focus()} email error={errors.email} />
    <AuthFlowField label="Contraseña" value={password} onChangeText={setPassword} inputRef={passwordInputRef} returnKeyType={mode === 'register' ? 'next' : 'done'} onSubmitEditing={() => { if (mode === 'register') { Keyboard.dismiss(); setChoosingState(true); } else { void submit(); } }} secure passwordAutoComplete={mode === 'login' ? 'current-password' : 'new-password'} error={errors.password} />
    {mode === 'register' && <>
      <Text style={[styles.label, { color: colors.text }]}>Estado</Text>
      <Pressable style={[styles.statePicker, { backgroundColor: colors.surface, borderColor: errors.locatedAt ? colors.error : colors.border }]} onPress={() => setChoosingState(true)} accessibilityRole="button" accessibilityLabel="Elegir estado">
        <Text style={[styles.value, { color: colors.text }]}>{locatedAt ? stateLabel(locatedAt) : 'Selecciona tu estado'}</Text>
      </Pressable>
      {!!errors.locatedAt && <AuthFlowMessage text={errors.locatedAt} error />}
    </>}
    {!!authError && <AuthFlowMessage text={authError} error />}
    {mode === 'login' && <AuthFlowButton label="¿Olvidaste tu contraseña?" onPress={() => router.push('/auth/reset-request')} secondary />}
    <AuthFlowButton label={mode === 'login' ? 'Iniciar sesión' : 'Registrarme'} loadingLabel={mode === 'login' ? 'Entrando…' : 'Registrando…'} onPress={() => void submit()} loading={submitting} />
    <AuthFlowButton
      label={mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
      onPress={() => { clearAuthError(); router.replace(mode === 'login' ? '/(auth)/register' : '/(auth)/login'); }}
      secondary
    />
    <Modal visible={choosingState} animationType="slide" onRequestClose={() => setChoosingState(false)}>
      <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.heading }]}>Elige tu estado</Text>
          <Pressable onPress={() => setChoosingState(false)} accessibilityRole="button"><Text style={[styles.close, { color: colors.heading }]}>Cerrar</Text></Pressable>
        </View>
        <FlatList data={MEXICO_STATES} keyExtractor={item => item} renderItem={({ item }) =>
          <Pressable style={[styles.row, { borderColor: colors.border }]} onPress={() => { setLocatedAt(item); setChoosingState(false); setErrors(current => ({ ...current, locatedAt: undefined })); }}>
            <Text style={[styles.value, { color: colors.text }]}>{stateLabel(item)}</Text>
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
