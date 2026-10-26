import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { CommunityService } from './community.service';
import { CommunityQuery, CommunityRoleDto, CreateCommunityDto, ExpelMemberDto, MemberQuery, UpdateCommunityDto } from './community.dto';

type Request = { user: { id: string } };
@Controller('communities')
export class CommunityController {
  constructor(private readonly communities: CommunityService) {}
  @Get() list(@Req() r: Request, @Query() q: CommunityQuery) { return this.communities.list(r.user.id, q); }
  @Post() create(@Req() r: Request, @Body() dto: CreateCommunityDto) { return this.communities.create(r.user.id, dto); }
  @Get(':id') detail(@Req() r: Request, @Param('id', ParseIntPipe) id: number) { return this.communities.detail(r.user.id, id); }
  @Patch(':id') update(@Req() r: Request, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCommunityDto) { return this.communities.update(r.user.id, id, dto); }
  @Post(':id/members/me') join(@Req() r: Request, @Param('id', ParseIntPipe) id: number) { return this.communities.join(r.user.id, id); }
  @Delete(':id/members/me') leave(@Req() r: Request, @Param('id', ParseIntPipe) id: number) { return this.communities.leave(r.user.id, id); }
  @Get(':id/members') members(@Req() r: Request, @Param('id', ParseIntPipe) id: number, @Query() q: MemberQuery) { return this.communities.members(r.user.id, id, q); }
  @Patch(':id/members/:userId/role') role(@Req() r: Request, @Param('id', ParseIntPipe) id: number, @Param('userId') target: string, @Body() dto: CommunityRoleDto) { return this.communities.changeRole(r.user.id, id, target, dto.role); }
  @Post(':id/expulsions') expel(@Req() r: Request, @Param('id', ParseIntPipe) id: number, @Body() dto: ExpelMemberDto) { return this.communities.expel(r.user.id, id, dto.userId); }
  @Get(':id/expulsions') expulsions(@Req() r: Request, @Param('id', ParseIntPipe) id: number, @Query() q: MemberQuery) { return this.communities.expulsions(r.user.id, id, q); }
  @Delete(':id/expulsions/:userId') unblock(@Req() r: Request, @Param('id', ParseIntPipe) id: number, @Param('userId') target: string) { return this.communities.unblock(r.user.id, id, target); }
}
