import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { CommentOwnerGuard } from './guards/comment-owner.guard';


@Module({
  controllers: [CommentsController],
  providers: [CommentsService,CommentOwnerGuard],
})
export class CommentsModule {}
