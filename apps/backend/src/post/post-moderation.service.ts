import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CommunityRol } from 'src/generated/prisma/enums';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PostModerationService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertRole(userId: string, communityId: number, allowed: CommunityRol[]) {
    const membership = await this.prisma.communityMember.findUnique({
      where: { userId_communityId: { userId, communityId } },
      select: { role: true },
    });
    if (!membership || !allowed.includes(membership.role)) {
      throw new ForbiddenException('No tienes permiso para moderar esta comunidad');
    }
  }

  async remove(userId: string, communityId: number, postId: number) {
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
        data: { postId, moderatorId: userId },
      });
      return { message: 'Publicación retirada por moderación' };
    });
  }

  async listRemoved(userId: string, communityId: number) {
    await this.assertRole(userId, communityId, [CommunityRol.ADMIN]);
    return this.prisma.moderationRemoval.findMany({
      where: { restoredAt: null, post: { communityId, isActive: false } },
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
        moderator: { select: { id: true, username: true } },
      },
    });
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
