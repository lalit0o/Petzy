import { Injectable } from '@nestjs/common';
import type { Namespace } from 'socket.io';

// `event_notice`: aviso de un evento con la app abierta (D-156); usa la misma conexión.
export type ChatEvent = 'message' | 'read' | 'block' | 'presence' | 'event_notice';

// Avisos en vivo de Chat (D-148). Cada persona escucha solo su propia sala
// `user:<id>`, así que un evento nunca llega a quien no participa en el chat.
// «En línea» se cuenta en memoria del proceso: si el backend corre en varias
// copias, hará falta un adaptador compartido (por ejemplo Redis).
@Injectable()
export class ChatRealtimeService {
  private server: Namespace | null = null;
  private readonly connections = new Map<string, number>();

  attach(server: Namespace) {
    this.server = server;
  }

  isOnline(userId: string) {
    return (this.connections.get(userId) ?? 0) > 0;
  }

  // Devuelve true cuando es la primera conexión abierta (pasa a «En línea»).
  connected(userId: string) {
    const count = (this.connections.get(userId) ?? 0) + 1;
    this.connections.set(userId, count);
    return count === 1;
  }

  // Devuelve true cuando se cerró la última conexión (deja de estar «En línea»).
  disconnected(userId: string) {
    const count = (this.connections.get(userId) ?? 0) - 1;
    if (count > 0) { this.connections.set(userId, count); return false; }
    this.connections.delete(userId);
    return count === 0;
  }

  emitToUser(userId: string, event: ChatEvent, payload: object) {
    this.server?.to(`user:${userId}`).emit(event, payload);
  }
}
