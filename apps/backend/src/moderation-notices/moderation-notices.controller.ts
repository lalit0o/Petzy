import { Body, Controller, Get, HttpCode, Post, Query, Req } from '@nestjs/common';
import { ModerationNoticesService } from './moderation-notices.service';
import { ListNoticesDto } from './dto/list-notices.dto';
import { AcknowledgeNoticesDto } from './dto/acknowledge-notices.dto';

type AuthenticatedRequest = { user: { id: string } };

// La persona sale del token validado; nunca del cuerpo ni de la URL.
@Controller('users/me/moderation-notices')
export class ModerationNoticesController {
  constructor(private readonly notices: ModerationNoticesService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest, @Query() query: ListNoticesDto) {
    return this.notices.list(request.user.id, query);
  }

  @Post('acknowledge')
  @HttpCode(200)
  acknowledge(@Req() request: AuthenticatedRequest, @Body() dto: AcknowledgeNoticesDto) {
    return this.notices.acknowledge(request.user.id, dto);
  }
}
