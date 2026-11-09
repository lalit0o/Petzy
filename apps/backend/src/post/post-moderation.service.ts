import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CommunityRol } from 'src/generated/prisma/enums';
import { PrismaService } from 'src/prisma/prisma.service';
import { CommunityAccessService } from '../community/community-access.service';
import { ListCommentsDto } from '../comments/dto/list-comments.dto';
import { RemoveContentDto } from '../common/remove-content.dto';

@Injectable()
export class PostModerationService {
  constructor(private readonly prisma: PrismaService, private readonly communities: CommunityAccessService) {}

  private async assertRole(userId: string, communityId: number, allowed: CommunityRol[]) {
    await this.communities.member(userId, communityId, allowed);
  }

  async remove(userId: string, communityId: number, postId: number, dto: RemoveContentDto) {
    await this.assertRole(userId, communityId, [CommunityRol.ADMIN, CommunityRol.MODERATOR]);
    return this.prisma.$transaction(async (tx) => {
      const post = await tx.post.findFirst({
        where: { id: postId, communityId, isActive: true },
        select: { userId: true },
      });
      if (!post) throw new NotFoundException('La publicación no está disponible');
      if (post.userId === userId) {
        throw new ForbiddenException('Retira tu publicación desde tus propias opciones');
      }
      const changed = await tx.post.updateMany({
        where: { id: postId, communityId, isActive: true },
        data: { isActive: false },
      });
      if (changed.count !== 1) throw new NotFoundException('La publicación ya fue retirada');
      await tx.moderationRemoval.create({
        data: { postId, moderatorId: userId, reason: dto.reason, note: dto.note ?? null },
      });
      return { message: 'Publicación retirada por moderación' };
    });
  }

  async listRemoved(userId: string, communityId: number, query: ListCommentsDto = {}) {
    await this.assertRole(userId, communityId, [CommunityRol.ADMIN]);
    const where = { restoredAt: null, post: { communityId, isActive: false, user: { isActive: true } } };
    if (query.cursor && !await this.prisma.moderationRemoval.findFirst({ where: { ...where, id: query.cursor }, select: { id: true } })) throw new NotFoundException('La página de retiradas ya no está disponible.');
    const limit = query.limit ?? 20;
    const rows = await this.prisma.moderationRemoval.findMany({
      where, take: limit + 1, ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: [{ removedAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        removedAt: true,
        post: {
          select: {
            id: true, title: true, type: true,
            user: { select: { id: true, username: true } },
          },
        },
        reason: true,
        note: true,
      },
    });
    return { items: rows.slice(0, limit), nextCursor: rows.length > limit ? rows[limit - 1].id : null };
  }

  async restore(userId: string, communityId: number, postId: number) {
    await this.assertRole(userId, communityId, [CommunityRol.ADMIN]);
    return this.prisma.$transaction(async (tx) => {
      const removal = await tx.moderationRemoval.findFirst({
        where: { postId, restoredAt: null, post: { communityId, isActive: false } },
        select: { id: true },
      });
      if (!removal) throw new NotFoundException('No hay una retirada por moderación para restaurar');
      const changed = await tx.moderationRemoval.updateMany({
        where: { id: removal.id, restoredAt: null },
        data: { restoredAt: new Date(), restoredById: userId },
      });
      if (changed.count !== 1) throw new NotFoundException('La publicación ya fue restaurada');
      await tx.post.update({ where: { id: postId }, data: { isActive: true } });
      return { message: 'Publicación restaurada' };
    });
  }
}
