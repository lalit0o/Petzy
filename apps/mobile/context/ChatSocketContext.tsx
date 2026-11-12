import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { io } from 'socket.io-client';
import { useAuthContext } from '@/context/AuthContext';
import type { ChatMessage } from '@/lib/chat-api';
import type { EventNotice } from '@/lib/events-api';

// Conexión en vivo de Chat (CH-T10, D-148). Solo recibe avisos; enviar, leer
// y bloquear siguen pasando por la API. La API es la fuente de verdad: cada
// vez que la conexión queda lista se emite `resync` para que las pantallas
// abiertas vuelvan a pedir sus datos y no se pierda nada de lo ocurrido
// mientras estaba desconectada.
export type ChatEvents = {
  message: { conversationId: number; message: ChatMessage };
  read: { conversationId: number; lastReadMessageId: number };
  block: { conversationId: number };
  presence: { conversationId: number; online: boolean };
  // Aviso de un evento con la app abierta (EV-T18, D-156).
  event_notice: EventNotice;
  resync: Record<string, never>;
};
type EventName = keyof ChatEvents;
type Handler<K extends EventName> = (payload: ChatEvents[K]) => void;
type ChatSocketValue = { connected: boolean; subscribe: <K extends EventName>(event: K, handler: Handler<K>) => () => void };

const ChatSocketContext = createContext<ChatSocketValue | null>(null);
const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
const SERVER_EVENTS: Exclude<EventName, 'resync'>[] = ['message', 'read', 'block', 'presence', 'event_notice'];

export function ChatSocketProvider({ children }: { children: ReactNode }) {
  const { status, token } = useAuthContext();
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [connected, setConnected] = useState(false);
  const listeners = useRef(new Map<EventName, Set<(payload: unknown) => void>>());

  const dispatch = useCallback((event: EventName, payload: unknown) => {
    listeners.current.get(event)?.forEach(handler => handler(payload));
  }, []);

  const subscribe = useCallback(<K extends EventName>(event: K, handler: Handler<K>) => {
    const set = listeners.current.get(event) ?? new Set();
    const wrapped = handler as (payload: unknown) => void;
    set.add(wrapped); listeners.current.set(event, set);
    return () => { set.delete(wrapped); };
  }, []);

  // «En línea» solo con la app abierta (D-81): en segundo plano se cierra la conexión.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', next => setActive(next === 'active'));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (status !== 'ready' || !token || !active || !API_URL) return;
    const socket = io(`${API_URL}/chat`, { auth: { token }, transports: ['websocket'] });
    socket.on('ready', () => { setConnected(true); dispatch('resync', {}); });
    socket.on('disconnect', () => setConnected(false));
    // Sesión rechazada: no se reintenta con el mismo token; al renovarse, este efecto vuelve a conectar.
    socket.on('auth_error', () => setConnected(false));
    for (const event of SERVER_EVENTS) socket.on(event, (payload: unknown) => dispatch(event, payload));
    return () => { socket.removeAllListeners(); socket.disconnect(); setConnected(false); };
  }, [status, token, active, dispatch]);

  return <ChatSocketContext.Provider value={{ connected, subscribe }}>{children}</ChatSocketContext.Provider>;
}

export function useChatSocket() {
  const value = useContext(ChatSocketContext);
  if (!value) throw new Error('useChatSocket debe usarse dentro de ChatSocketProvider.');
  return value;
}

// Escucha un evento con el manejador más reciente, sin volver a suscribirse en cada render.
export function useChatEvent<K extends EventName>(event: K, handler: Handler<K>) {
  const { subscribe } = useChatSocket();
  const latest = useRef(handler);
  useEffect(() => { latest.current = handler; });
  useEffect(() => subscribe(event, payload => latest.current(payload)), [event, subscribe]);
}
