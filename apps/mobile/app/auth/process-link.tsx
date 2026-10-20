import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { AuthFlowButton, AuthFlowMessage, AuthFlowScreen } from '@/components/auth-flow-ui';
import { useAuthContext } from '@/context/AuthContext';

export default function ProcessLink() {
  const router = useRouter();
  const { pendingAuthLink, clearAuthLink, verifyConfirmationLink, prepareRecovery } = useAuthContext();
  const [error, setError] = useState('');
  const running = useRef(false);
  const started = useRef(false);

  const process = useCallback(async () => {
    if (running.current) return;
    if (!pendingAuthLink) {
      router.replace('/auth/link-error');
      return;
    }
    running.current = true;
    try {
      if (pendingAuthLink.purpose === 'confirmation') {
        const confirmed = await verifyConfirmationLink(pendingAuthLink.access);
        clearAuthLink();
        router.replace(confirmed ? '/auth/confirmed' : '/auth/link-error?kind=confirmation');
      } else {
        await prepareRecovery(pendingAuthLink.access, pendingAuthLink.refresh!);
        clearAuthLink();
        router.replace('/auth/reset-password');
      }
    } catch (failure) {
      const status = typeof failure === 'object' && failure !== null && 'status' in failure ? failure.status : 0;
      if (status === 401 || status === 403) {
        clearAuthLink();
        router.replace({ pathname: '/auth/link-error', params: { kind: pendingAuthLink.purpose } });
      } else {
        setError('No pudimos comprobar el enlace ahora. Revisa tu conexión e inténtalo de nuevo.');
      }
    } finally {
      running.current = false;
    }
  }, [clearAuthLink, pendingAuthLink, prepareRecovery, router, verifyConfirmationLink]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const timer = setTimeout(() => void process(), 0);
    return () => clearTimeout(timer);
  }, [process]);

  return <AuthFlowScreen title="Comprobando enlace…" description="Espera un momento mientras confirmamos que el enlace todavía sirve.">
    {!!error && <AuthFlowMessage text={error} error />}
    {!!error && <AuthFlowButton label="Reintentar" onPress={() => { setError(''); void process(); }} />}
  </AuthFlowScreen>;
}
