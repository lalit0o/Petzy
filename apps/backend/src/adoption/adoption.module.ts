import { Module } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { AdoptionController } from './adoption.controller';
import { AdoptionPhotoService } from './adoption-photo.service';
import { AdoptionService } from './adoption.service';

// Adopción (paso 8 de la ruta). «Contactar» reutiliza Chat (D-91).
@Module({
  imports: [PrismaModule, SupabaseModule, ChatModule],
  controllers: [AdoptionController],
  providers: [AdoptionService, AdoptionPhotoService],
})
export class AdoptionModule {}
