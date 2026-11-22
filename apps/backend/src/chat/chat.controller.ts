import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, Req } from '@nestjs/common';
import { ParseIdPipe } from '../common/parse-id.pipe';
import { ChatService } from './chat.service';
import { ListPageDto, MarkReadDto, OpenConversationDto, ReportConversationDto, SendMessageDto } from './chat.dto';

type AuthenticatedRequest = { user: { id: string } };

// La identidad sale siempre del token validado; nunca del cuerpo ni de la URL.
@Controller('conversations')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get()
  inbox(@Req() r: AuthenticatedRequest, @Query() query: ListPageDto) {
    return this.chat.inbox(r.user.id, query);
  }

  @Post()
  @HttpCode(200)
  open(@Req() r: AuthenticatedRequest, @Body() dto: OpenConversationDto) {
    return this.chat.open(r.user.id, dto.userId);
  }

  @Get(':id')
  detail(@Req() r: AuthenticatedRequest, @Param('id', ParseIdPipe) id: number) {
    return this.chat.detail(r.user.id, id);
  }

  @Get(':id/messages')
  messages(@Req() r: AuthenticatedRequest, @Param('id', ParseIdPipe) id: number, @Query() query: ListPageDto) {
    return this.chat.messages(r.user.id, id, query);
  }

  @Post(':id/messages')
  send(@Req() r: AuthenticatedRequest, @Param('id', ParseIdPipe) id: number, @Body() dto: SendMessageDto) {
    return this.chat.send(r.user.id, id, dto);
  }

  @Post(':id/read')
  @HttpCode(200)
  read(@Req() r: AuthenticatedRequest, @Param('id', ParseIdPipe) id: number, @Body() dto: MarkReadDto) {
    return this.chat.markRead(r.user.id, id, dto.messageId);
  }

  @Post(':id/block')
  @HttpCode(200)
  block(@Req() r: AuthenticatedRequest, @Param('id', ParseIdPipe) id: number) {
    return this.chat.block(r.user.id, id);
  }

  @Delete(':id/block')
  unblock(@Req() r: AuthenticatedRequest, @Param('id', ParseIdPipe) id: number) {
    return this.chat.unblock(r.user.id, id);
  }

  @Post(':id/hide')
  @HttpCode(200)
  hide(@Req() r: AuthenticatedRequest, @Param('id', ParseIdPipe) id: number) {
    return this.chat.hide(r.user.id, id);
  }

  @Post(':id/clear')
  @HttpCode(200)
  clear(@Req() r: AuthenticatedRequest, @Param('id', ParseIdPipe) id: number) {
    return this.chat.clear(r.user.id, id);
  }

  @Post(':id/reports')
  report(@Req() r: AuthenticatedRequest, @Param('id', ParseIdPipe) id: number, @Body() dto: ReportConversationDto) {
    return this.chat.report(r.user.id, id, dto);
  }
}
