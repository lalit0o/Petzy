import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Put, Query, Req, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { EventService } from './event.service';
import { EventNoticeService } from './event-notice.service';
import type { EventCoverUpload } from './event-photo.service';
import { AttendanceDto, CancelEventDto, CreateEventDto, ListEventNoticesDto, ListEventsDto, UpdateEventDto } from './event.dto';

type AuthenticatedRequest = { user: { id: string } };
const cover = FileInterceptor('photo', { limits: { fileSize: 5 * 1024 * 1024 } });

// La identidad sale siempre del token validado; nunca del cuerpo ni de la URL.
@Controller('communities/:communityId/events')
export class CommunityEventsController {
  constructor(private readonly events: EventService) {}

  @Get()
  list(@Req() r: AuthenticatedRequest, @Param('communityId', ParseIntPipe) communityId: number, @Query() query: ListEventsDto) {
    return this.events.list(r.user.id, communityId, query);
  }

  @Post()
  @UseInterceptors(cover)
  create(@Req() r: AuthenticatedRequest, @Param('communityId', ParseIntPipe) communityId: number, @Body() dto: CreateEventDto, @UploadedFile() file?: EventCoverUpload) {
    return this.events.create(r.user.id, communityId, dto, file);
  }
}

@Controller('events')
export class EventController {
  constructor(private readonly events: EventService) {}

  @Get(':id')
  detail(@Req() r: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return this.events.detail(r.user.id, id);
  }

  @Patch(':id')
  update(@Req() r: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEventDto) {
    return this.events.update(r.user.id, id, dto);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  // El cuerpo se valida (clave opcional) aunque la cancelación ya es única por evento.
  cancel(@Req() r: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number, @Body() _dto: CancelEventDto) {
    return this.events.cancel(r.user.id, id);
  }

  @Put(':id/attendance')
  respond(@Req() r: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: AttendanceDto) {
    return this.events.respond(r.user.id, id, dto.response);
  }

  @Get(':id/cover')
  async getCover(@Req() r: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number, @Res() response: Response) {
    const image = await this.events.getCover(r.user.id, id);
    response.setHeader('Content-Type', image.contentType);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('Vary', 'Authorization');
    response.send(image.bytes);
  }

  @Put(':id/cover')
  @UseInterceptors(cover)
  replaceCover(@Req() r: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number, @UploadedFile() file?: EventCoverUpload) {
    return this.events.replaceCover(r.user.id, id, file);
  }

  @Delete(':id/cover')
  removeCover(@Req() r: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return this.events.removeCover(r.user.id, id);
  }
}

@Controller('me/event-notices')
export class EventNoticesController {
  constructor(private readonly notices: EventNoticeService) {}

  @Get()
  list(@Req() r: AuthenticatedRequest, @Query() query: ListEventNoticesDto) {
    return this.notices.list(r.user.id, query);
  }

  @Patch(':id/read')
  markRead(@Req() r: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return this.notices.markRead(r.user.id, id);
  }
}
