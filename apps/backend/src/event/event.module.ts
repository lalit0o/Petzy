import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { CommunityAccessModule } from '../community/community-access.module';
import { ChatModule } from '../chat/chat.module';
import { CommunityEventsController, EventController, EventNoticesController } from './event.controller';
import { EventService } from './event.service';
import { EventNoticeService } from './event-notice.service';
import { EventPhotoService } from './event-photo.service';
import { EventStartService } from './event-start.service';

// Eventos dentro de Comunidades (D-144): reutiliza el control de acceso comunitario.
@Module({
  // ChatModule aporta la conexión en vivo para avisar con la app abierta (D-156).
  imports: [PrismaModule, SupabaseModule, CommunityAccessModule, ChatModule],
  controllers: [CommunityEventsController, EventController, EventNoticesController],
  providers: [EventService, EventNoticeService, EventPhotoService, EventStartService],
  exports: [EventStartService],
})
export class EventModule {}
