import { useRouter } from 'expo-router';
import { AuthFlowButton, AuthFlowScreen } from '@/components/auth-flow-ui';
import { useAuthContext } from '@/context/AuthContext';

export default function Confirmed() {
  const router = useRouter();
  const { status } = useAuthContext();
  return <AuthFlowScreen title="Correo confirmado" description="Ya puedes entrar a Petzy con tu correo y contraseña. Si faltó guardar tu perfil, podrás completarlo con esta misma cuenta.">
    <AuthFlowButton
      label={status === 'ready' ? 'Ir a Inicio' : 'Iniciar sesión'}
      onPress={() => router.replace(status === 'ready' ? '/(tabs)' : '/(auth)/login')}
    />
  </AuthFlowScreen>;
}
