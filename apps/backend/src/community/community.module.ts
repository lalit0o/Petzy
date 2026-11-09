import { CommunityDeletionModule } from './community-deletion.module';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { CommunityAccessModule } from './community-access.module';
import { CommunityController } from './community.controller';
import { CommunityPhotoService } from './community-photo.service';
import { CommunityService } from './community.service';

@Module({ imports: [PrismaModule, CommunityAccessModule, CommunityDeletionModule, SupabaseModule], controllers: [CommunityController], providers: [CommunityService, CommunityPhotoService] })
export class CommunityModule {}
