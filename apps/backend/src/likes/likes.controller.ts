import { Controller, Delete, Param, ParseIntPipe, Put, Req } from '@nestjs/common';
import { LikesService } from './likes.service';

type AuthenticatedRequest = { user: { id: string } };

@Controller('posts/:postId/like')
export class LikesController {
  constructor(private readonly likes: LikesService) {}

  @Put()
  put(@Req() request: AuthenticatedRequest, @Param('postId', ParseIntPipe) postId: number) {
    return this.likes.put(request.user.id, postId);
  }

  @Delete()
  remove(@Req() request: AuthenticatedRequest, @Param('postId', ParseIntPipe) postId: number) {
    return this.likes.remove(request.user.id, postId);
  }
}
