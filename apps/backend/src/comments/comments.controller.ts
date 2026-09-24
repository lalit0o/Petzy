import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentOwnerGuard } from './guards/comment-owner.guard';


@Controller('posts/:postId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}


  @Post()
  create(@Req() req,@Param('postId',ParseIntPipe) postId:number,@Body() createCommentDto: CreateCommentDto,) {
    return this.commentsService.create(req.user.id,createCommentDto,postId);
  }

  @UseGuards(CommentOwnerGuard)
  @Patch(':commentId')
  update(@Param('postId',ParseIntPipe) postId: number,@Param('commentId',ParseIntPipe) commentId:number, @Body() updateCommentDto: UpdateCommentDto) {
    return this.commentsService.update(postId,commentId, updateCommentDto);
  }

  @UseGuards(CommentOwnerGuard)
  @Delete(':commentId')
  remove(@Param('postId',ParseIntPipe) postId:number,@Param('commentId',ParseIntPipe) commentId:number) {
    return this.commentsService.remove(postId,commentId);
  }
}
