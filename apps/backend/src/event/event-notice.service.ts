import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListEventNoticesDto } from './event.dto';

// Avisos guardados de Eventos (EV-T11). Solo la persona destinataria los
// consulta y marca. Mientras esté expulsada de una comunidad, no ve los
// avisos de esa comunidad (D-70).
@Injectable()
export class EventNoticeService {
  constructor(private readonly prisma: PrismaService) {}

  private where(userId: string): Prisma.EventNoticeWhereInput {
    return { recipientId: userId, event: { community: { expulsions: { none: { userId } } } } };
  }

  async list(userId: string, query: ListEventNoticesDto) {
    const where = this.where(userId);
    if (query.cursor && !await this.prisma.eventNotice.findFirst({ where: { ...where, id: query.cursor }, select: { id: true } })) {
      throw new BadRequestException('El cursor no pertenece a esta lista.');
    }
    const limit = query.limit ?? 20;
    const [rows, unreadCount] = await Promise.all([
      this.prisma.eventNotice.findMany({
        where, orderBy: { id: 'desc' }, take: limit + 1,
        select: { id: true, kind: true, summary: true, createdAt: true, readAt: true, event: { select: { id: true, title: true, communityId: true } } },
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      }),
      this.prisma.eventNotice.count({ where: { ...where, readAt: null } }),
    ]);
    const page = rows.slice(0, limit);
    return { items: page, nextCursor: rows.length > limit ? page.at(-1)?.id ?? null : null, unreadCount };
  }

  async markRead(userId: string, id: number) {
    const notice = await this.prisma.eventNotice.findFirst({ where: { ...this.where(userId), id }, select: { id: true, readAt: true } });
    if (!notice) throw new NotFoundException('El aviso no está disponible.');
    if (notice.readAt) return notice;
    return this.prisma.eventNotice.update({ where: { id }, data: { readAt: new Date() }, select: { id: true, readAt: true } });
  }
}
