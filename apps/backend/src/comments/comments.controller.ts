import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { ParseIdPipe } from '../common/parse-id.pipe';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentOwnerGuard } from './guards/comment-owner.guard';
import { ListCommentsDto } from './dto/list-comments.dto';


@Controller('posts/:postId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  list(@Req() req: { user: { id: string } }, @Param('postId', ParseIdPipe) postId: number, @Query() query: ListCommentsDto) {
    return this.commentsService.list(req.user.id, postId, query);
  }

  @Post()
  create(@Req() req: { user: { id: string } },@Param('postId',ParseIdPipe) postId:number,@Body() createCommentDto: CreateCommentDto,) {
    return this.commentsService.create(req.user.id,createCommentDto,postId);
  }

  @UseGuards(CommentOwnerGuard)
  @Patch(':commentId')
  update(@Req() req: { user: { id: string } }, @Param('postId',ParseIdPipe) postId: number,@Param('commentId',ParseIdPipe) commentId:number, @Body() updateCommentDto: UpdateCommentDto) {
    return this.commentsService.update(req.user.id,postId,commentId, updateCommentDto);
  }

  @UseGuards(CommentOwnerGuard)
  @Delete(':commentId')
  remove(@Req() req: { user: { id: string } }, @Param('postId',ParseIdPipe) postId:number,@Param('commentId',ParseIdPipe) commentId:number) {
    return this.commentsService.remove(req.user.id,postId,commentId);
  }
}
