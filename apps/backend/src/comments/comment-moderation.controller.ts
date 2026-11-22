import { Body, Controller, Delete, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ParseIdPipe } from '../common/parse-id.pipe';
import { RemoveContentDto } from '../common/remove-content.dto';
import { CommentModerationService } from './comment-moderation.service';
import { ListCommentsDto } from './dto/list-comments.dto';

type AuthenticatedRequest = { user: { id: string } };

@Controller('posts/:postId/moderation/comments')
export class GeneralCommentModerationController {
  constructor(private readonly moderation: CommentModerationService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest, @Param('postId', ParseIdPipe) postId: number, @Query() query: ListCommentsDto) {
    return this.moderation.listGeneral(request.user.id, postId, query);
  }

  @Delete(':commentId')
  remove(@Req() request: AuthenticatedRequest, @Param('postId', ParseIdPipe) postId: number, @Param('commentId', ParseIdPipe) commentId: number) {
    return this.moderation.removeGeneral(request.user.id, postId, commentId);
  }

  @Post(':commentId/restore')
  restore(@Req() request: AuthenticatedRequest, @Param('postId', ParseIdPipe) postId: number, @Param('commentId', ParseIdPipe) commentId: number) {
    return this.moderation.restoreGeneral(request.user.id, postId, commentId);
  }
}

@Controller('communities/:communityId/posts/:postId/comments')
export class CommunityCommentModerationController {
  constructor(private readonly moderation: CommentModerationService) {}

  @Delete(':commentId')
  remove(@Req() request: AuthenticatedRequest, @Param('communityId', ParseIdPipe) communityId: number, @Param('postId', ParseIdPipe) postId: number, @Param('commentId', ParseIdPipe) commentId: number, @Body() dto: RemoveContentDto) {
    return this.moderation.removeCommunity(request.user.id, communityId, postId, commentId, dto);
  }
}

@Controller('communities/:communityId/moderation/comments')
export class CommunityRemovedCommentsController {
  constructor(private readonly moderation: CommentModerationService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest, @Param('communityId', ParseIdPipe) communityId: number, @Query() query: ListCommentsDto) {
    return this.moderation.listCommunity(request.user.id, communityId, query);
  }

  @Post(':commentId/restore')
  restore(@Req() request: AuthenticatedRequest, @Param('communityId', ParseIdPipe) communityId: number, @Param('commentId', ParseIdPipe) commentId: number) {
    return this.moderation.restoreCommunity(request.user.id, communityId, commentId);
  }
}
