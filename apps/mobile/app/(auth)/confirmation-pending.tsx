import { useState } from 'react';
import { useRouter } from 'expo-router';
import { AuthFlowButton, AuthFlowField, AuthFlowMessage, AuthFlowScreen } from '@/components/auth-flow-ui';
import { useAuthContext } from '@/context/AuthContext';

export default function ConfirmationPending() {
  const router = useRouter();
  const { pendingEmail, resendConfirmation, authError, clearAuthError } = useAuthContext();
  const [email, setEmail] = useState(pendingEmail);
  const [fieldError, setFieldError] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function resend() {
    if (sending) return;
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setFieldError('Escribe un correo válido.');
      return;
    }
    setFieldError('');
    setSending(true);
    try { setSent(await resendConfirmation(email.trim())); }
    finally { setSending(false); }
  }

  return <AuthFlowScreen title="Revisa tu correo" description="Abre el enlace que enviamos a tu correo para confirmar la cuenta. Después podrás iniciar sesión. No necesitas registrar una mascota.">
    {sent && <AuthFlowMessage text="Si ese correo tiene una confirmación pendiente, recibirás otro enlace. Revisa también correo no deseado." />}
    {!sent && !!authError && <AuthFlowMessage text={authError} error />}
    <AuthFlowField label="Correo" value={email} onChangeText={value => { setEmail(value); setSent(false); setFieldError(''); clearAuthError(); }} onSubmitEditing={() => void resend()} email error={fieldError} />
    <AuthFlowButton label="Reenviar correo" onPress={() => void resend()} loading={sending} />
    <AuthFlowButton label="Iniciar sesión" onPress={() => router.replace('/(auth)/login')} secondary />
  </AuthFlowScreen>;
}
