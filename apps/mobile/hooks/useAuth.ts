import type { ApiResponse, User } from '@/types/apiResponse';
import type { MexicoState } from '@/types/mexicoState';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';

const ACCESS_KEY = 'token';
const REFRESH_KEY = 'refresh_token';
const API_URL = process.env.EXPO_PUBLIC_API_URL;
type AuthStatus = 'checking' | 'signedOut' | 'ready' | 'incomplete' | 'inactive' | 'retry';
type PendingAuthLink = { purpose: 'confirmation' | 'recovery'; access: string; refresh?: string };

class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function apiRequest(path: string, init: RequestInit): Promise<ApiResponse> {
  if (!API_URL) throw new ApiError('Falta configurar la dirección de la API de Petzy.', 0);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${API_URL}${path}`, { ...init, signal: controller.signal });
    const data = await response.json().catch(() => ({})) as ApiResponse;
    if (!response.ok) {
      const message = Array.isArray(data.message) ? data.message.join('. ') : data.message;
      throw new ApiError(message || 'No se pudo completar la solicitud.', response.status);
    }
    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted) throw new ApiError('La solicitud tardó demasiado. Intenta de nuevo.', 0);
    throw new ApiError('No se pudo conectar con la API de Petzy. Intenta de nuevo.', 0);
  } finally {
    clearTimeout(timeout);
  }
}

function statusFromResponse(data: ApiResponse): AuthStatus {
  if (data.profileStatus === 'complete' && data.user?.isActive) return 'ready';
  if (data.profileStatus === 'inactive') return 'inactive';
  return 'incomplete';
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [authError, setAuthError] = useState('');
  const [sessionError, setSessionError] = useState('');
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [pendingEmail, setPendingEmail] = useState('');
  const [recoverySession, setRecoverySession] = useState<{ access: string; refresh: string } | null>(null);
  const [pendingAuthLink, setPendingAuthLink] = useState<PendingAuthLink | null>(null);
  const refreshing = useRef(false);
  const clearAuthError = useCallback(() => setAuthError(''), []);
  const clearAuthLink = useCallback(() => setPendingAuthLink(null), []);

  const clearSession = useCallback(async () => {
    setUser(null);
    setToken(null);
    setExpiresAt(null);
    setAuthError('');
    setStatus('signedOut');
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
    ]);
  }, []);

  const acceptSession = useCallback(async (data: ApiResponse) => {
    if (!data.access_token || !data.refresh_token) {
      throw new ApiError('La respuesta de sesión está incompleta. Inicia sesión de nuevo.', 401);
    }
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_KEY, data.access_token),
      SecureStore.setItemAsync(REFRESH_KEY, data.refresh_token),
    ]);
    setToken(data.access_token);
    setExpiresAt(data.expires_at ?? null);
    setUser(data.user ?? null);
    setStatus(statusFromResponse(data));
    setSessionError('');
  }, []);

  const checkSession = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    setStatus('checking');
    setSessionError('');
    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
      if (!refreshToken) {
        await clearSession();
        return;
      }
      const data = await apiRequest('/auth/refresh', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      await acceptSession(data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await clearSession();
        setAuthError('Tu sesión terminó. Inicia sesión de nuevo.');
      } else {
        setStatus('retry');
        setSessionError(error instanceof Error ? error.message : 'No se pudo comprobar la sesión.');
      }
    } finally {
      refreshing.current = false;
    }
  }, [acceptSession, clearSession]);

  useEffect(() => { void checkSession(); }, [checkSession]);

  useEffect(() => {
    if (!expiresAt || !['ready', 'incomplete', 'inactive'].includes(status)) return;
    const delay = Math.max(1000, expiresAt * 1000 - Date.now() - 60000);
    const timer = setTimeout(() => void checkSession(), delay);
    return () => clearTimeout(timer);
  }, [checkSession, expiresAt, status]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'active' && ['ready', 'incomplete', 'inactive', 'retry'].includes(status)) {
        void checkSession();
      }
    });
    return () => subscription.remove();
  }, [checkSession, status]);

  async function logIn(email: string, password: string) {
    setAuthError('');
    try {
      const data = await apiRequest('/auth/sign-in', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      await acceptSession(data);
      return 'success' as const;
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setPendingEmail(email);
        setAuthError(error.message);
        return 'unconfirmed' as const;
      }
      setAuthError(error instanceof Error ? error.message : 'No se pudo iniciar sesión.');
      return 'failed' as const;
    }
  }

  async function signUp(data: {
    email: string;
    username: string;
    password: string;
    locatedAt: MexicoState;
  }) {
    setAuthError('');
    try {
      await apiRequest('/auth/sign-up', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      });
      setPendingEmail(data.email);
      return true;
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'No se pudo registrar la cuenta.');
      return false;
    }
  }

  async function completeProfile(username: string, locatedAt: MexicoState) {
    setAuthError('');
    if (!token) {
      setAuthError('Tu sesión terminó. Inicia sesión de nuevo.');
      return false;
    }
    try {
      const data = await apiRequest('/auth/profile-completion', {
        method: 'PUT',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ username, locatedAt }),
      });
      if (data.profileStatus !== 'complete' || !data.user) throw new ApiError('No se pudo confirmar tu perfil.', 0);
      setUser(data.user);
      setStatus('ready');
      return true;
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'No se pudo guardar tu perfil.');
      return false;
    }
  }

  async function resendConfirmation(email: string) {
    setAuthError('');
    try {
      await apiRequest('/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      return true;
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'No se pudo solicitar otro correo.');
      return false;
    }
  }

  async function requestPasswordReset(email: string) {
    setAuthError('');
    try {
      await apiRequest('/auth/password-reset-request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      return true;
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'No se pudo solicitar el enlace.');
      return false;
    }
  }

  const verifyConfirmationLink = useCallback(async (access: string) => {
    const data = await apiRequest('/auth/me', {
      method: 'GET',
      headers: { authorization: `Bearer ${access}` },
    });
    return data.emailConfirmed === true;
  }, []);

  const prepareRecovery = useCallback(async (access: string, refresh: string) => {
    setAuthError('');
    await apiRequest('/auth/me', {
      method: 'GET',
      headers: { authorization: `Bearer ${access}` },
    });
    setRecoverySession({ access, refresh });
  }, []);

  async function updatePassword(password: string) {
    setAuthError('');
    if (!recoverySession) {
      setAuthError('El enlace ya no está disponible. Solicita otro.');
      return false;
    }
    try {
      await apiRequest('/auth/password-update', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          access_token: recoverySession.access,
          refresh_token: recoverySession.refresh,
          password,
        }),
      });
      setRecoverySession(null);
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) setRecoverySession(null);
      setAuthError(error instanceof Error ? error.message : 'No se pudo cambiar la contraseña.');
      return false;
    }
  }

  return {
    user,
    token,
    status,
    isLoading: status === 'checking',
    authError,
    clearAuthError,
    pendingEmail,
    recoverySession,
    pendingAuthLink,
    sessionError,
    logIn,
    signUp,
    completeProfile,
    resendConfirmation,
    requestPasswordReset,
    verifyConfirmationLink,
    prepareRecovery,
    stageAuthLink: setPendingAuthLink,
    clearAuthLink,
    updatePassword,
    checkSession,
    logOut: clearSession,
  };
}
