import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { CommunityAccessModule } from '../community/community-access.module';
import { CommunityEventsController, EventController, EventNoticesController } from './event.controller';
import { EventService } from './event.service';
import { EventNoticeService } from './event-notice.service';
import { EventPhotoService } from './event-photo.service';
import { EventStartService } from './event-start.service';

// Eventos dentro de Comunidades (D-144): reutiliza el control de acceso comunitario.
@Module({
  imports: [PrismaModule, SupabaseModule, CommunityAccessModule],
  controllers: [CommunityEventsController, EventController, EventNoticesController],
  providers: [EventService, EventNoticeService, EventPhotoService, EventStartService],
  exports: [EventStartService],
})
export class EventModule {}
