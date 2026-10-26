import { ForbiddenException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CommunityRol, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PostService } from '../post/post.service';
import { ListCommentsDto } from './dto/list-comments.dto';
import { CommunityAccessService } from '../community/community-access.service';

const removalSelect = {
  id: true, removedAt: true,
  comment: { select: {
    id: true, postId: true, body: true, createdAt: true, editedAt: true,
    user: { select: { id: true, username: true, avatar: true } },
  } },
  moderator: { select: { id: true, username: true } },
} satisfies Prisma.ModerationRemovalSelect;
type SelectedRemoval = Prisma.ModerationRemovalGetPayload<{ select: typeof removalSelect }>;

@Injectable()
export class CommentModerationService {
  constructor(private readonly prisma: PrismaService, private readonly posts: PostService, private readonly communities: CommunityAccessService) {}

  private publicRemoval(removal: SelectedRemoval) {
    const { comment, ...fields } = removal;
    return {
      ...fields,
      comment: comment && {
        id: comment.id, postId: comment.postId, body: comment.body,
        createdAt: comment.createdAt, editedAt: comment.editedAt,
        user: { id: comment.user.id, username: comment.user.username, avatarUrl: comment.user.avatar ? `/users/${comment.user.id}/avatar` : null },
      },
    };
  }

  private async assertGeneralAuthor(userId: string, postId: number) {
    const post = await this.posts.assertCanRead(userId, postId);
    if (post.communityId !== null || post.userId !== userId) throw new ForbiddenException('Solo el autor de esta publicación general puede gestionar sus comentarios.');
    return post;
  }

  private async assertCommunityMember(userId: string, communityId: number, postId?: number) {
    const membership = await this.communities.member(userId, communityId);
    const post = postId ? await this.posts.assertCanRead(userId, postId) : null;
    if (post && post.communityId !== communityId) throw new NotFoundException('La publicación no pertenece a esta comunidad.');
    return { membership, post };
  }

  private async assertAdmin(userId: string, communityId: number) {
    await this.communities.member(userId, communityId, [CommunityRol.ADMIN]);
  }

  private async remove(userId: string, postId: number, commentId: number) {
    return this.prisma.$transaction(async tx => {
      const comment = await tx.comment.findFirst({
        where: { id: commentId, postId, isActive: true }, select: { userId: true },
      });
      if (!comment) throw new NotFoundException('El comentario no está disponible.');
      if (comment.userId === userId) throw new ForbiddenException('Retira tu propio comentario desde sus opciones.');
      const changed = await tx.comment.updateMany({
        where: { id: commentId, postId, isActive: true }, data: { isActive: false },
      });
      if (changed.count !== 1) throw new NotFoundException('El comentario ya fue retirado.');
      await tx.moderationRemoval.create({ data: { commentId, moderatorId: userId } });
      return { message: 'Comentario ocultado.' };
    });
  }

  async removeGeneral(userId: string, postId: number, commentId: number) {
    await this.assertGeneralAuthor(userId, postId);
    return this.remove(userId, postId, commentId);
  }

  async removeCommunity(userId: string, communityId: number, postId: number, commentId: number) {
    const { membership, post } = await this.assertCommunityMember(userId, communityId, postId);
    if (membership.role !== CommunityRol.ADMIN && membership.role !== CommunityRol.MODERATOR && post?.userId !== userId) {
      throw new ForbiddenException('No puedes ocultar comentarios de esta publicación.');
    }
    return this.remove(userId, postId, commentId);
  }

  private async list(where: Prisma.ModerationRemovalWhereInput, query: ListCommentsDto) {
    if (query.cursor) {
      const cursor = await this.prisma.moderationRemoval.findFirst({ where: { ...where, id: query.cursor }, select: { id: true } });
      if (!cursor) throw new BadRequestException('El cursor no pertenece a esta lista.');
    }
    const limit = query.limit ?? 20;
    const rows = await this.prisma.moderationRemoval.findMany({
      where, select: removalSelect, orderBy: [{ removedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const page = rows.slice(0, limit);
    return { items: page.map(row => this.publicRemoval(row)), nextCursor: rows.length > limit ? page.at(-1)?.id ?? null : null };
  }

  async listGeneral(userId: string, postId: number, query: ListCommentsDto) {
    await this.assertGeneralAuthor(userId, postId);
    return this.list({ moderatorId: userId, restoredAt: null, comment: { postId, isActive: false, user: { isActive: true } } }, query);
  }

  async listCommunity(userId: string, communityId: number, query: ListCommentsDto) {
    await this.assertAdmin(userId, communityId);
    return this.list({ restoredAt: null, comment: { isActive: false, user: { isActive: true }, post: { communityId, isActive: true, user: { isActive: true } } } }, query);
  }

  private async restore(userId: string, commentId: number, where: Prisma.ModerationRemovalWhereInput) {
    return this.prisma.$transaction(async tx => {
      const removal = await tx.moderationRemoval.findFirst({
        where: { AND: [where, { commentId, restoredAt: null, comment: { isActive: false } }] },
        select: { id: true },
      });
      if (!removal) throw new NotFoundException('No hay un comentario ocultado que puedas restaurar.');
      const changed = await tx.moderationRemoval.updateMany({
        where: { id: removal.id, restoredAt: null }, data: { restoredAt: new Date(), restoredById: userId },
      });
      if (changed.count !== 1) throw new NotFoundException('El comentario ya fue restaurado.');
      await tx.comment.update({ where: { id: commentId }, data: { isActive: true } });
      return { message: 'Comentario restaurado.' };
    });
  }

  async restoreGeneral(userId: string, postId: number, commentId: number) {
    await this.assertGeneralAuthor(userId, postId);
    return this.restore(userId, commentId, { moderatorId: userId, comment: { postId } });
  }

  async restoreCommunity(userId: string, communityId: number, commentId: number) {
    await this.assertAdmin(userId, communityId);
    return this.restore(userId, commentId, { comment: { post: { communityId, isActive: true, user: { isActive: true } } } });
  }
}
