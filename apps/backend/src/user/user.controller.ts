import { Body, Controller, Delete, Get, Param, Patch, Put, Query, Req, Res, UploadedFile, UseInterceptors, ValidationPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SearchProfilesDto } from './dto/search-profiles.dto';
import type { AvatarUpload } from './avatar.service';

type AuthenticatedRequest = Request & { user: { id: string } };

@Controller('users')
export class UserController {
  constructor(private readonly users: UserService) {}

  @Get('me')
  me(@Req() request: AuthenticatedRequest) {
    return this.users.getOwnProfile(request.user.id);
  }

  @Patch('me')
  updateMe(
    @Req() request: AuthenticatedRequest,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })) dto: UpdateProfileDto,
  ) {
    return this.users.updateOwnProfile(request.user.id, dto);
  }

  @Get()
  search(@Query() query: SearchProfilesDto) {
    return this.users.searchProfiles(query);
  }

  @Put('me/avatar')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 5 * 1024 * 1024 } }))
  replaceAvatar(@Req() request: AuthenticatedRequest, @UploadedFile() file?: AvatarUpload) {
    return this.users.replaceAvatar(request.user.id, file);
  }

  @Delete('me/avatar')
  removeAvatar(@Req() request: AuthenticatedRequest) {
    return this.users.removeAvatar(request.user.id);
  }

  @Get(':id/avatar')
  async avatar(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Res() response: Response) {
    const image = await this.users.getAvatar(request.user.id, id);
    response.setHeader('Content-Type', image.contentType);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('Vary', 'Authorization');
    response.send(image.bytes);
  }

  @Get(':id')
  profile(@Param('id') id: string) {
    return this.users.getPublicProfile(id);
  }
}
