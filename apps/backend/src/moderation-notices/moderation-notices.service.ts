import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListNoticesDto } from './dto/list-notices.dto';
import { AcknowledgeNoticesDto } from './dto/acknowledge-notices.dto';

const EXCERPT_LENGTH = 140;

const noticeSelect = {
  id: true, removedAt: true, restoredAt: true, acknowledgedAt: true, reason: true, note: true,
  post: { select: { id: true, title: true, community: { select: { id: true, name: true } } } },
  comment: { select: { id: true, body: true, postId: true, post: { select: { id: true, title: true, community: { select: { id: true, name: true } } } } } },
} satisfies Prisma.ModerationRemovalSelect;
type SelectedNotice = Prisma.ModerationRemovalGetPayload<{ select: typeof noticeSelect }>;

// Avisos de contenido propio retirado por moderación comunitaria (D-142, D-143).
// La fuente es `ModerationRemoval`: no hay tabla propia. Nunca se expone quién
// moderó (D-141) y se ignoran las ocultaciones de publicaciones generales (D-56).
@Injectable()
export class ModerationNoticesService {
  constructor(private readonly prisma: PrismaService) {}

  // Contenido de la persona dentro de una comunidad.
  private owned(userId: string): Prisma.ModerationRemovalWhereInput {
    return { OR: [
      { post: { userId, communityId: { not: null } } },
      { comment: { userId, post: { communityId: { not: null } } } },
    ] };
  }

  private pendingWhere(userId: string): Prisma.ModerationRemovalWhereInput {
    return { AND: [this.owned(userId), { acknowledgedAt: null, restoredAt: null }] };
  }

  private excerpt(text: string) {
    const clean = text.replace(/\s+/g, ' ').trim();
    return clean.length > EXCERPT_LENGTH ? `${clean.slice(0, EXCERPT_LENGTH - 1)}…` : clean;
  }

  private present(row: SelectedNotice) {
    const isPost = row.post !== null;
    const post = isPost ? row.post : row.comment?.post ?? null;
    return {
      id: row.id,
      kind: isPost ? 'POST' as const : 'COMMENT' as const,
      status: row.restoredAt ? 'RESTORED' as const : 'REMOVED' as const,
      removedAt: row.removedAt,
      restoredAt: row.restoredAt,
      acknowledged: row.acknowledgedAt !== null,
      reason: row.reason,
      note: row.note,
      community: post?.community ?? null,
      postId: post?.id ?? null,
      postTitle: post?.title ?? null,
      excerpt: this.excerpt(isPost ? row.post!.title : row.comment?.body ?? ''),
    };
  }

  async list(userId: string, query: ListNoticesDto) {
    const where: Prisma.ModerationRemovalWhereInput = query.pending ? this.pendingWhere(userId) : this.owned(userId);
    const limit = query.limit ?? 20;
    if (query.cursor && !await this.prisma.moderationRemoval.findFirst({ where: { AND: [where, { id: query.cursor }] }, select: { id: true } })) {
      throw new BadRequestException('El cursor no pertenece a esta lista.');
    }
    const [rows, pendingCount] = await Promise.all([
      this.prisma.moderationRemoval.findMany({
        where, select: noticeSelect, orderBy: [{ removedAt: 'desc' }, { id: 'desc' }], take: limit + 1,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      }),
      this.prisma.moderationRemoval.count({ where: this.pendingWhere(userId) }),
    ]);
    const page = rows.slice(0, limit);
    return { items: page.map(row => this.present(row)), nextCursor: rows.length > limit ? page.at(-1)?.id ?? null : null, pendingCount };
  }

  async acknowledge(userId: string, dto: AcknowledgeNoticesDto) {
    const result = await this.prisma.moderationRemoval.updateMany({
      where: { AND: [this.owned(userId), { acknowledgedAt: null }, ...(dto.ids ? [{ id: { in: dto.ids } }] : [])] },
      data: { acknowledgedAt: new Date() },
    });
    const pendingCount = await this.prisma.moderationRemoval.count({ where: this.pendingWhere(userId) });
    return { acknowledged: result.count, pendingCount };
  }
}
