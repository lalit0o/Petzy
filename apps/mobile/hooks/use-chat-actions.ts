import { useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useToast } from '@/components/toast';
import { useAuthContext } from '@/context/AuthContext';
import { blockConversation, ChatApiError, clearConversation, hideConversation, unblockConversation, type ConversationSummary } from '@/lib/chat-api';

export type ChatAction = 'block' | 'unblock' | 'hide' | 'clear';
export const CHAT_ACTION_TEXT: Record<ChatAction, { busy: string; retry: string }> = {
  block: { busy: 'Bloqueando…', retry: 'Reintentar bloqueo' },
  unblock: { busy: 'Desbloqueando…', retry: 'Reintentar desbloqueo' },
  hide: { busy: 'Ocultando chat…', retry: 'Reintentar ocultar' },
  clear: { busy: 'Borrando chat…', retry: 'Reintentar borrar' },
};

type Target = Pick<ConversationSummary, 'id' | 'otherUser'>;

// Bloquear, desbloquear, ocultar y «Borrar chat para mí» (CH-T13), iguales en
// la bandeja y en la conversación. Pide confirmación salvo para desbloquear,
// anuncia el resultado solo cuando el servidor lo confirma y, si falla, deja
// el error con su acción para «Reintentar…».
export function useChatActions({ onDone, onGone }: {
  onDone: (action: ChatAction, target: Target, updated?: ConversationSummary) => void;
  onGone: (target: Target) => void;
}) {
  const { token } = useAuthContext(); const toast = useToast();
  const [acting, setActing] = useState<{ id: number; action: ChatAction } | null>(null);
  const [error, setError] = useState<{ target: Target; action: ChatAction; message: string } | null>(null);
  const busy = useRef(false);

  const run = async (action: ChatAction, target: Target) => {
    if (!token || busy.current) return;
    busy.current = true; setActing({ id: target.id, action }); setError(null);
    const name = target.otherUser.username;
    try {
      if (action === 'block' || action === 'unblock') {
        const updated = await (action === 'block' ? blockConversation : unblockConversation)(token, target.id);
        toast.show(action === 'block' ? `Bloqueaste a ${name}` : `Desbloqueaste a ${name}`);
        onDone(action, target, updated);
      } else {
        await (action === 'hide' ? hideConversation : clearConversation)(token, target.id);
        toast.show(action === 'hide' ? 'Chat oculto de tu bandeja' : 'Borraste el chat para ti');
        onDone(action, target);
      }
    } catch (cause) {
      if (cause instanceof ChatApiError && cause.status === 404) onGone(target);
      else setError({ target, action, message: cause instanceof Error ? cause.message : 'No se pudo completar la acción.' });
    } finally { busy.current = false; setActing(null); }
  };

  const request = (action: ChatAction, target: Target) => {
    const name = target.otherUser.username;
    if (action === 'unblock') { void run(action, target); return; }
    if (action === 'block') Alert.alert(`Bloquear a ${name}`, 'Ninguno de los dos podrá enviar mensajes en este chat, pero ambos seguirán viendo los anteriores. No le diremos que fuiste tú. Puedes desbloquear cuando quieras.', [
      { text: 'No bloquear', style: 'cancel' },
      { text: 'Bloquear', style: 'destructive', onPress: () => void run(action, target) },
    ]);
    if (action === 'hide') Alert.alert('Ocultar chat', 'Saldrá de tu bandeja sin borrar nada y volverá a aparecer cuando llegue un mensaje nuevo. La otra persona no se entera.', [
      { text: 'Conservar en la bandeja', style: 'cancel' },
      { text: 'Ocultar chat', onPress: () => void run(action, target) },
    ]);
    if (action === 'clear') Alert.alert('Borrar chat para mí', `Dejarás de ver para siempre los mensajes anteriores de este chat. ${name} conservará los suyos y los mensajes que ya reportaste se guardan para ese reporte.`, [
      { text: 'Conservar chat', style: 'cancel' },
      { text: 'Borrar chat para mí', style: 'destructive', onPress: () => void run(action, target) },
    ]);
  };

  const retry = () => { if (error) void run(error.action, error.target); };
  return { acting, error, request, retry, clearError: () => setError(null) };
}
