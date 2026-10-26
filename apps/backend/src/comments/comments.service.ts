import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PostService } from '../post/post.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { ListCommentsDto } from './dto/list-comments.dto';

const commentSelect = {
  id: true, postId: true, userId: true, body: true,
  createdAt: true, editedAt: true,
  user: { select: { id: true, username: true, avatar: true } },
} satisfies Prisma.CommentSelect;
type SelectedComment = Prisma.CommentGetPayload<{ select: typeof commentSelect }>;

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService, private readonly posts: PostService) {}

  private response(comment: SelectedComment) {
    const { user, ...fields } = comment;
    return {
      ...fields,
      user: { id: user.id, username: user.username, avatarUrl: user.avatar ? `/users/${user.id}/avatar` : null },
    };
  }

  async list(userId: string, postId: number, query: ListCommentsDto) {
    await this.posts.assertCanRead(userId, postId);
    const where: Prisma.CommentWhereInput = { postId, isActive: true, user: { isActive: true } };
    if (query.cursor) {
      const cursor = await this.prisma.comment.findFirst({ where: { ...where, id: query.cursor }, select: { id: true } });
      if (!cursor) throw new BadRequestException('El cursor no pertenece a esta lista.');
    }
    const limit = query.limit ?? 20;
    const [rows, total] = await Promise.all([this.prisma.comment.findMany({
      where, select: commentSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    }), this.prisma.comment.count({ where })]);
    const page = rows.slice(0, limit);
    return { items: page.map(comment => this.response(comment)), nextCursor: rows.length > limit ? page.at(-1)?.id ?? null : null, total };
  }

  async create(userId: string, dto: CreateCommentDto, postId: number) {
    await this.posts.assertCanRead(userId, postId);
    const comment = await this.prisma.comment.create({
      data: { body: dto.body, userId, postId }, select: commentSelect,
    });
    return this.response(comment);
  }

  async update(userId: string, postId: number, commentId: number, dto: UpdateCommentDto) {
    await this.posts.assertCanRead(userId, postId);
    const existing = await this.prisma.comment.findFirst({
      where: { id: commentId, postId, userId, isActive: true }, select: { body: true },
    });
    if (!existing) throw new NotFoundException('El comentario no está disponible.');
    if (existing.body !== dto.body) {
      await this.prisma.comment.updateMany({
        where: { id: commentId, postId, userId, isActive: true, body: { not: dto.body } },
        data: { body: dto.body, editedAt: new Date() },
      });
    }
    const comment = await this.prisma.comment.findFirst({
      where: { id: commentId, postId, userId, isActive: true }, select: commentSelect,
    });
    if (!comment) throw new NotFoundException('El comentario no está disponible.');
    return this.response(comment);
  }

  async remove(userId: string, postId: number, commentId: number) {
    await this.posts.assertCanRead(userId, postId);
    const changed = await this.prisma.comment.updateMany({
      where: { id: commentId, postId, userId, isActive: true }, data: { isActive: false },
    });
    if (changed.count !== 1) throw new NotFoundException('El comentario no está disponible.');
    return { message: 'Comentario retirado.' };
  }
}
