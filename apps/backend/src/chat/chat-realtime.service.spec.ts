import type { Namespace } from 'socket.io';
import { ChatRealtimeService } from './chat-realtime.service';

describe('ChatRealtimeService', () => {
  it('sigue «En línea» mientras quede al menos una conexión abierta', () => {
    const realtime = new ChatRealtimeService();
    expect(realtime.connected('ana')).toBe(true);
    expect(realtime.connected('ana')).toBe(false);
    expect(realtime.isOnline('ana')).toBe(true);
    expect(realtime.disconnected('ana')).toBe(false);
    expect(realtime.isOnline('ana')).toBe(true);
    expect(realtime.disconnected('ana')).toBe(true);
    expect(realtime.isOnline('ana')).toBe(false);
  });

  it('no confunde una desconexión sin conexión previa con quedar fuera de línea', () => {
    const realtime = new ChatRealtimeService();
    expect(realtime.disconnected('luis')).toBe(false);
    expect(realtime.isOnline('luis')).toBe(false);
  });

  it('envía cada aviso solo a la sala de la persona destinataria', () => {
    const emit = jest.fn(); const to = jest.fn().mockReturnValue({ emit });
    const realtime = new ChatRealtimeService();
    realtime.emitToUser('ana', 'read', { conversationId: 1 });
    expect(to).not.toHaveBeenCalled();
    realtime.attach({ to } as unknown as Namespace);
    realtime.emitToUser('ana', 'read', { conversationId: 1, lastReadMessageId: 5 });
    expect(to).toHaveBeenCalledWith('user:ana');
    expect(emit).toHaveBeenCalledWith('read', { conversationId: 1, lastReadMessageId: 5 });
  });
});
