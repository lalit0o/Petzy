import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { CommentOwnerGuard } from './guards/comment-owner.guard';
import { PostModule } from 'src/post/post.module';
import { CommentModerationService } from './comment-moderation.service';
import { GeneralCommentModerationController, CommunityCommentModerationController, CommunityRemovedCommentsController } from './comment-moderation.controller';


@Module({
  imports: [PostModule],
  controllers: [CommentsController, GeneralCommentModerationController, CommunityCommentModerationController, CommunityRemovedCommentsController],
  providers: [CommentsService, CommentOwnerGuard, CommentModerationService],
})
export class CommentsModule {}
