import { CommunityDeletionModule } from '../community/community-deletion.module';
import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { AvatarService } from './avatar.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule, CommunityDeletionModule],
  controllers: [UserController],
  providers: [UserService, AvatarService],
})
export class UserModule {}
