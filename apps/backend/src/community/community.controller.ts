import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ParseIdPipe } from '../common/parse-id.pipe';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CommunityService } from './community.service';
import type { CommunityPhotoUpload } from './community-photo.service';
import { CommunityQuery, CommunityRoleDto, CreateCommunityDto, ExpelMemberDto, MemberQuery, UpdateCommunityDto } from './community.dto';

type Request = { user: { id: string } };
@Controller('communities')
export class CommunityController {
  constructor(private readonly communities: CommunityService) {}
  @Get() list(@Req() r: Request, @Query() q: CommunityQuery) { return this.communities.list(r.user.id, q); }
  @Post()
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 5 * 1024 * 1024 } }))
  create(@Req() r: Request, @Body() dto: CreateCommunityDto, @UploadedFile() file?: CommunityPhotoUpload) { return this.communities.create(r.user.id, dto, file); }
  @Get(':id') detail(@Req() r: Request, @Param('id', ParseIdPipe) id: number) { return this.communities.detail(r.user.id, id); }
  @Patch(':id') update(@Req() r: Request, @Param('id', ParseIdPipe) id: number, @Body() dto: UpdateCommunityDto) { return this.communities.update(r.user.id, id, dto); }
  @Put(':id/photo')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 5 * 1024 * 1024 } }))
  replacePhoto(@Req() r: Request, @Param('id', ParseIdPipe) id: number, @UploadedFile() file?: CommunityPhotoUpload) { return this.communities.replacePhoto(r.user.id, id, file); }
  @Delete(':id/photo') removePhoto(@Req() r: Request, @Param('id', ParseIdPipe) id: number) { return this.communities.removePhoto(r.user.id, id); }
  @Get(':id/photo')
  async photo(@Req() r: Request, @Param('id', ParseIdPipe) id: number, @Res() response: Response) {
    const image = await this.communities.getPhoto(r.user.id, id);
    response.setHeader('Content-Type', image.contentType);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('Vary', 'Authorization');
    response.send(image.bytes);
  }
  @Post(':id/members/me') join(@Req() r: Request, @Param('id', ParseIdPipe) id: number) { return this.communities.join(r.user.id, id); }
  @Delete(':id/members/me') leave(@Req() r: Request, @Param('id', ParseIdPipe) id: number) { return this.communities.leave(r.user.id, id); }
  @Get(':id/members') members(@Req() r: Request, @Param('id', ParseIdPipe) id: number, @Query() q: MemberQuery) { return this.communities.members(r.user.id, id, q); }
  @Patch(':id/members/:userId/role') role(@Req() r: Request, @Param('id', ParseIdPipe) id: number, @Param('userId') target: string, @Body() dto: CommunityRoleDto) { return this.communities.changeRole(r.user.id, id, target, dto.role); }
  @Post(':id/expulsions') expel(@Req() r: Request, @Param('id', ParseIdPipe) id: number, @Body() dto: ExpelMemberDto) { return this.communities.expel(r.user.id, id, dto.userId); }
  @Get(':id/expulsions') expulsions(@Req() r: Request, @Param('id', ParseIdPipe) id: number, @Query() q: MemberQuery) { return this.communities.expulsions(r.user.id, id, q); }
  @Delete(':id/expulsions/:userId') unblock(@Req() r: Request, @Param('id', ParseIdPipe) id: number, @Param('userId') target: string) { return this.communities.unblock(r.user.id, id, target); }
}
