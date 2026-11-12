import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatRealtimeService } from './chat-realtime.service';
import { ChatService } from './chat.service';
import { ChatSocketAuthService } from './chat-socket-auth.service';

// Chat privado uno a uno (paso 7). Sin rutas de personal ni suspensiones (D-87).
// La conexión en vivo (D-148) solo avisa; los cambios pasan por la API.
@Module({
  imports: [PrismaModule, SupabaseModule],
  controllers: [ChatController],
  providers: [ChatService, ChatRealtimeService, ChatSocketAuthService, ChatGateway],
  // Adopción abre o reutiliza conversaciones con la misma operación (D-91).
  exports: [ChatService, ChatRealtimeService],
})
export class ChatModule {}
