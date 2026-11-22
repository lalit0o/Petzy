import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ParseIdPipe } from '../common/parse-id.pipe';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { ListPostsDto } from './dto/list-posts.dto';
import type { PostPhotoUpload } from './post-photo.service';
import { PostModerationService } from './post-moderation.service';
import { ListCommentsDto } from '../comments/dto/list-comments.dto';
import { RemoveContentDto } from '../common/remove-content.dto';

type AuthenticatedRequest = Request & { user: { id: string } };

@Controller('posts')
export class PostController {
  constructor(private readonly posts: PostService) {}

  @Get()
  listHome(@Req() request: AuthenticatedRequest, @Query() query: ListPostsDto) {
    return this.posts.listHome(request.user.id, query);
  }

  @Post()
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 5 * 1024 * 1024 } }))
  create(@Req() request: AuthenticatedRequest, @Body() dto: CreatePostDto, @UploadedFile() file?: PostPhotoUpload) {
    return this.posts.create(request.user.id, dto, null, file);
  }

  @Get(':id/photo')
  async photo(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIdPipe) id: number,
    @Res() response: Response,
  ) {
    const photo = await this.posts.getPhoto(request.user.id, id);
    response.setHeader('Content-Type', photo.contentType);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('Vary', 'Authorization');
    response.send(photo.bytes);
  }

  @Get(':id')
  detail(@Req() request: AuthenticatedRequest, @Param('id', ParseIdPipe) id: number) {
    return this.posts.findOne(request.user.id, id);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 5 * 1024 * 1024 } }))
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: UpdatePostDto,
    @UploadedFile() file?: PostPhotoUpload,
  ) {
    return this.posts.update(request.user.id, id, dto, file);
  }

  @Delete(':id')
  remove(@Req() request: AuthenticatedRequest, @Param('id', ParseIdPipe) id: number) {
    return this.posts.remove(request.user.id, id);
  }
}

@Controller('communities/:communityId/posts')
export class CommunityPostsController {
  constructor(private readonly posts: PostService, private readonly moderation: PostModerationService) {}

  @Get()
  list(
    @Req() request: AuthenticatedRequest,
    @Param('communityId', ParseIdPipe) communityId: number,
    @Query() query: ListPostsDto,
  ) {
    return this.posts.listCommunity(request.user.id, communityId, query);
  }

  @Post()
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 5 * 1024 * 1024 } }))
  create(
    @Req() request: AuthenticatedRequest,
    @Param('communityId', ParseIdPipe) communityId: number,
    @Body() dto: CreatePostDto,
    @UploadedFile() file?: PostPhotoUpload,
  ) {
    return this.posts.create(request.user.id, dto, communityId, file);
  }

  @Delete(':postId')
  removeByModerator(
    @Req() request: AuthenticatedRequest,
    @Param('communityId', ParseIdPipe) communityId: number,
    @Param('postId', ParseIdPipe) postId: number,
    @Body() dto: RemoveContentDto,
  ) {
    return this.moderation.remove(request.user.id, communityId, postId, dto);
  }
}

@Controller('communities/:communityId/moderation/posts')
export class CommunityPostModerationController {
  constructor(private readonly moderation: PostModerationService) {}

  @Get()
  list(
    @Req() request: AuthenticatedRequest,
    @Param('communityId', ParseIdPipe) communityId: number,
    @Query() query: ListCommentsDto,
  ) {
    return this.moderation.listRemoved(request.user.id, communityId, query);
  }

  @Post(':postId/restore')
  restore(
    @Req() request: AuthenticatedRequest,
    @Param('communityId', ParseIdPipe) communityId: number,
    @Param('postId', ParseIdPipe) postId: number,
  ) {
    return this.moderation.restore(request.user.id, communityId, postId);
  }
}
