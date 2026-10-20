import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useLinkingURL } from 'expo-linking';
import { AuthFlowScreen } from '@/components/auth-flow-ui';
import { useAuthContext } from '@/context/AuthContext';

// Supabase devuelve los datos del enlace en el fragmento (#), o un error en la URL.
// Se copian solo a memoria y se reemplaza esta ruta antes de procesarlos.
export default function AuthCallback() {
  const url = useLinkingURL();
  const router = useRouter();
  const { stageAuthLink } = useAuthContext();
  const handled = useRef(false);

  useEffect(() => {
    if (!url || handled.current) return;
    handled.current = true;
    try {
      const parsed = new URL(url);
      const fragment = new URLSearchParams(parsed.hash.slice(1));
      const value = (key: string) => fragment.get(key) ?? parsed.searchParams.get(key);
      const linkType = value('type');
      const kind = linkType === 'recovery' ? 'recovery' : 'confirmation';
      const access = value('access_token');
      const refresh = value('refresh_token');
      if (value('error') || value('error_code') ||
        (linkType !== 'recovery' && linkType !== 'signup') ||
        !access || (kind === 'recovery' && !refresh)) {
        router.replace({ pathname: '/auth/link-error', params: { kind } });
        return;
      }
      stageAuthLink({ purpose: kind, access, refresh: refresh ?? undefined });
      router.replace('/auth/process-link');
    } catch {
      router.replace('/auth/link-error');
    }
  }, [url, router, stageAuthLink]);

  return <AuthFlowScreen title="Abriendo enlace…" description="Estamos comprobando el enlace que recibiste por correo." />;
}
