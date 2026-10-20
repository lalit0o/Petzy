import { useState } from 'react';
import { AuthFlowButton, AuthFlowMessage, AuthFlowScreen } from '@/components/auth-flow-ui';
import { useAuthContext } from '@/context/AuthContext';

export default function InactiveAccount() {
  const { logOut, canReactivate, confirmReactivation, authError } = useAuthContext();
  const [busy, setBusy] = useState(false);

  const reactivate = async () => {
    if (busy) return;
    setBusy(true);
    try { await confirmReactivation(); }
    finally { setBusy(false); }
  };

  return <AuthFlowScreen
    title="Tu cuenta está desactivada"
    description="Tus datos siguen guardados. Confirma si quieres reactivar esta misma cuenta para volver a usar Petzy."
  >
    {canReactivate ? <AuthFlowButton label="Reactivar cuenta" loadingLabel="Comprobando…" loading={busy} onPress={() => void reactivate()} />
      : <AuthFlowMessage text="Inicia sesión de nuevo para confirmar la reactivación con tu correo y contraseña." />}
    {authError ? <AuthFlowMessage text={authError} error /> : null}
    <AuthFlowButton label={canReactivate ? 'Ahora no' : 'Iniciar sesión de nuevo'} secondary onPress={() => void logOut()} />
  </AuthFlowScreen>;
}
