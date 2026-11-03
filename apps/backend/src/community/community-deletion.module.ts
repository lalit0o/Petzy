import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { CommunityDeletionService } from './community-deletion.service';

@Module({ imports: [SupabaseModule], providers: [CommunityDeletionService], exports: [CommunityDeletionService] })
export class CommunityDeletionModule {}
