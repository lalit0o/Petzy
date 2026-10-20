import { useState } from 'react';
import { useRouter } from 'expo-router';
import { AuthFlowButton, AuthFlowField, AuthFlowMessage, AuthFlowScreen } from '@/components/auth-flow-ui';
import { useAuthContext } from '@/context/AuthContext';

export default function ResetPassword() {
  const router = useRouter();
  const { recoverySession, updatePassword, logOut, authError } = useAuthContext();
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function returnToLogin() {
    await logOut();
    router.replace('/(auth)/login');
  }

  async function submit() {
    if (saving) return;
    if (password.length < 8) {
      setFieldError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setFieldError('');
    setSaving(true);
    try {
      if (await updatePassword(password)) {
        setPassword('');
        setSaved(true);
      }
    } finally { setSaving(false); }
  }

  if (saved) return <AuthFlowScreen title="Contraseña actualizada" description="Ya puedes entrar con tu contraseña nueva.">
    <AuthFlowButton label="Iniciar sesión" onPress={() => void returnToLogin()} />
  </AuthFlowScreen>;

  if (!recoverySession) return <AuthFlowScreen title="El enlace ya no sirve" description="Abre de nuevo el enlace de tu correo o solicita otro para cambiar la contraseña.">
    <AuthFlowButton label="Solicitar otro enlace" onPress={() => router.replace('/auth/reset-request')} />
  </AuthFlowScreen>;

  return <AuthFlowScreen title="Contraseña nueva" description="Escribe una contraseña nueva de al menos 8 caracteres.">
    <AuthFlowField label="Contraseña nueva" value={password} onChangeText={setPassword} onSubmitEditing={() => void submit()} secure error={fieldError} />
    {!!authError && <AuthFlowMessage text={authError} error />}
    <AuthFlowButton label="Guardar contraseña" loadingLabel="Guardando…" onPress={() => void submit()} loading={saving} />
  </AuthFlowScreen>;
}
