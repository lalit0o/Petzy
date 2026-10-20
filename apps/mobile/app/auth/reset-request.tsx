import { useState } from 'react';
import { useRouter } from 'expo-router';
import { AuthFlowButton, AuthFlowField, AuthFlowMessage, AuthFlowScreen } from '@/components/auth-flow-ui';
import { useAuthContext } from '@/context/AuthContext';

export default function ResetRequest() {
  const router = useRouter();
  const { requestPasswordReset, authError, clearAuthError } = useAuthContext();
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    if (sending) return;
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setFieldError('Escribe un correo válido.');
      return;
    }
    setFieldError('');
    setSending(true);
    try { setSent(await requestPasswordReset(email.trim())); }
    finally { setSending(false); }
  }

  return <AuthFlowScreen title="Solicitar enlace" description="Escribe tu correo. Si tiene una cuenta en Petzy, recibirás un enlace para cambiar la contraseña dentro de la app.">
    <AuthFlowField label="Correo" value={email} onChangeText={value => { setEmail(value); setSent(false); setFieldError(''); clearAuthError(); }} onSubmitEditing={() => void submit()} email error={fieldError} />
    {sent && <AuthFlowMessage text="Si existe una cuenta con ese correo, recibirás un enlace. Revisa también correo no deseado." />}
    {!sent && !!authError && <AuthFlowMessage text={authError} error />}
    <AuthFlowButton label="Enviar enlace" onPress={() => void submit()} loading={sending} />
    <AuthFlowButton label="Iniciar sesión" onPress={() => router.replace('/(auth)/login')} secondary />
  </AuthFlowScreen>;
}
