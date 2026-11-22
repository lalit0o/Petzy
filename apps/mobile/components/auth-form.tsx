import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { Keyboard, Pressable, StyleSheet, Text, View, type TextInputInstance } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AuthFlowButton, AuthFlowField, AuthFlowMessage, AuthFlowScreen, useAuthFlowColors } from '@/components/auth-flow-ui';
import { useAuthContext } from '@/context/AuthContext';
import { type MexicoState } from '@/types/mexicoState';
import { StatePickerModal } from '@/components/state-picker-modal';

function stateLabel(value: MexicoState) {
  return value.toLowerCase().split('_').map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
}

export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const colors = useAuthFlowColors();
  const { logIn, signUp, authError, clearAuthError } = useAuthContext();
  const emailInputRef = useRef<TextInputInstance>(null);
  const passwordInputRef = useRef<TextInputInstance>(null);
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
      <Pressable style={[styles.statePicker, { backgroundColor: colors.surface, borderColor: errors.locatedAt ? colors.error : colors.border }]} onPress={() => { Keyboard.dismiss(); setChoosingState(true); }} accessibilityRole="button" accessibilityLabel={`Elegir estado${locatedAt ? `, actual: ${stateLabel(locatedAt)}` : ''}`} accessibilityState={{ expanded: choosingState }}>
        <Text style={[styles.value, { color: locatedAt ? colors.text : colors.muted }]}>{locatedAt ? stateLabel(locatedAt) : 'Selecciona tu estado'}</Text>
        <Ionicons name="chevron-down" size={20} color={colors.heading} />
      </Pressable>
      {!!errors.locatedAt && <AuthFlowMessage text={errors.locatedAt} error />}
    </>}
    {/* Enlace pequeño bajo la contraseña; la acción principal va justo después (22-11-2026). */}
    {mode === 'login' && <Pressable accessibilityRole="link" accessibilityLabel="¿Olvidaste tu contraseña?" onPress={() => router.push('/auth/reset-request')} style={styles.forgot} hitSlop={4}>
      <Text style={[styles.forgotText, { color: colors.heading }]}>¿Olvidaste tu contraseña?</Text>
    </Pressable>}
    {!!authError && <AuthFlowMessage text={authError} error />}
    <AuthFlowButton label={mode === 'login' ? 'Iniciar sesión' : 'Registrarme'} loadingLabel={mode === 'login' ? 'Entrando…' : 'Registrando…'} onPress={() => void submit()} loading={submitting} />
    <View style={styles.switchRow}>
      <View style={[styles.rule, { backgroundColor: colors.border }]} />
      <Text style={[styles.switchText, { color: colors.muted }]}>{mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}</Text>
      <View style={[styles.rule, { backgroundColor: colors.border }]} />
    </View>
    <AuthFlowButton
      label={mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
      onPress={() => { clearAuthError(); router.replace(mode === 'login' ? '/(auth)/register' : '/(auth)/login'); }}
      secondary
    />
    <StatePickerModal visible={choosingState} value={locatedAt} colors={colors} onClose={() => setChoosingState(false)} onSelect={item => { setLocatedAt(item); setChoosingState(false); setErrors(current => ({ ...current, locatedAt: undefined })); }} />
  </AuthFlowScreen>;
}

const styles = StyleSheet.create({
  label: { fontFamily: 'Nunito_700Bold', fontSize: 16, marginBottom: -8 },
  statePicker: { minHeight: 52, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  forgot: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', marginTop: -10, marginBottom: -6 },
  forgotText: { fontFamily: 'Nunito_700Bold', fontSize: 14 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rule: { flex: 1, height: StyleSheet.hairlineWidth },
  switchText: { fontFamily: 'Nunito_600SemiBold', fontSize: 14 },
  value: { fontFamily: 'Nunito_400Regular', fontSize: 16 },
});
