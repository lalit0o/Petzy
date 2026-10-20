import { Module } from '@nestjs/common';
import { PetService } from './pet.service';
import { OwnPetsController, PetController, PublicPetsController } from './pet.controller';
import { PetPhotoService } from './pet-photo.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [OwnPetsController, PublicPetsController, PetController],
  providers: [PetService, PetPhotoService],
})
export class PetModule {}
