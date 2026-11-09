import { HttpException, Logger, UnauthorizedException } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, WebSocketGateway } from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';
import { ChatRealtimeService } from './chat-realtime.service';
import { ChatSocketAuthService } from './chat-socket-auth.service';
import { ChatService } from './chat.service';

type ChatSocket = Socket<Record<string, never>, Record<string, (payload: object) => void>, Record<string, never>, { userId?: string }>;

// Conexión en vivo de Chat (CH-T10, D-148). Solo envía avisos: todo lo que la
// persona hace sigue pasando por la API HTTP, que comprueba permisos. No hay
// mensajes del cliente al servidor por aquí, así que no se abre otra vía de escritura.
@WebSocketGateway({ namespace: '/chat' })
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  constructor(private readonly auth: ChatSocketAuthService, private readonly realtime: ChatRealtimeService, private readonly chat: ChatService) {}

  afterInit(server: Namespace) {
    this.realtime.attach(server);
  }

  async handleConnection(socket: ChatSocket) {
    const token: unknown = socket.handshake.auth?.token;
    try {
      if (typeof token !== 'string' || !token) throw new UnauthorizedException('Token requerido');
      const userId = await this.auth.verify(token);
      // Si se desconectó mientras se comprobaba la sesión, no se cuenta como «En línea».
      if (!socket.connected) return;
      socket.data.userId = userId;
      await socket.join(`user:${userId}`);
      if (this.realtime.connected(userId)) await this.chat.announcePresence(userId, true);
      socket.emit('ready', {});
    } catch (error) {
      const message = error instanceof HttpException ? error.message : 'No se pudo conectar el chat.';
      socket.emit('auth_error', { message });
      socket.disconnect(true);
    }
  }

  async handleDisconnect(socket: ChatSocket) {
    const userId = socket.data.userId;
    if (!userId || !this.realtime.disconnected(userId)) return;
    // Un fallo al avisar no debe tumbar el servidor; la app vuelve a consultar al reconectar.
    try { await this.chat.announcePresence(userId, false); }
    catch (error) { this.logger.warn(`No se pudo avisar la desconexión: ${String(error)}`); }
  }
}
