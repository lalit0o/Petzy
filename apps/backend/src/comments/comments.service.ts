import { Injectable } from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) { }
  create(userId: string, createCommentDto: CreateCommentDto, postId: number) {
    return this.prisma.comment.create({ data: { ...createCommentDto, userId, postId } });
  }

  update(postId: number, commentId: number, updateCommentDto: UpdateCommentDto) {
    return this.prisma.comment.update({
      where: {
        id: commentId,
        postId,
        isActive: true,
      },
      data: { ...updateCommentDto }
    })
  }

  remove(postId: number, commentId: number) {
    return this.prisma.comment.update({
      where: {
        id: commentId,
        postId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });
  }
}
