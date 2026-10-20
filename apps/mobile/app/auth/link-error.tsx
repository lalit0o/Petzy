import { useLocalSearchParams, useRouter } from 'expo-router';
import { AuthFlowButton, AuthFlowScreen } from '@/components/auth-flow-ui';
import { useAuthContext } from '@/context/AuthContext';

export default function LinkError() {
  const router = useRouter();
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  const { status, logOut } = useAuthContext();
  async function requestConfirmation() {
    if (status === 'ready') await logOut();
    router.replace('/(auth)/confirmation-pending');
  }
  return <AuthFlowScreen title="El enlace ya no sirve" description="Puede haber vencido o ya haberse usado. Solicita otro enlace para continuar.">
    {(kind === 'confirmation' || !kind) && <AuthFlowButton label="Reenviar correo de confirmación" onPress={() => void requestConfirmation()} />}
    {(kind === 'recovery' || !kind) && <AuthFlowButton label="Solicitar otro enlace de recuperación" onPress={() => router.replace('/auth/reset-request')} />}
    <AuthFlowButton label={status === 'ready' ? 'Ir a Inicio' : 'Iniciar sesión'} onPress={() => router.replace(status === 'ready' ? '/(tabs)' : '/(auth)/login')} secondary />
  </AuthFlowScreen>;
}
