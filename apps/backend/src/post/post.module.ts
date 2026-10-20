import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { CommunityPostModerationController, CommunityPostsController, PostController } from './post.controller';
import { PostPhotoService } from './post-photo.service';
import { PostModerationService } from './post-moderation.service';
import { SupabaseModule } from 'src/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [PostController, CommunityPostsController, CommunityPostModerationController],
  providers: [PostService, PostPhotoService, PostModerationService],
  exports: [PostService],
})
export class PostModule { }
