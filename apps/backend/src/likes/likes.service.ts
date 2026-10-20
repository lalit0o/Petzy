import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PostService } from '../post/post.service';

@Injectable()
export class LikesService {
  constructor(private readonly prisma: PrismaService, private readonly posts: PostService) {}

  async put(userId: string, postId: number) {
    await this.posts.assertCanRead(userId, postId);
    await this.prisma.postLike.createMany({
      data: [{ userId, postId }], skipDuplicates: true,
    });
    return this.posts.findOne(userId, postId);
  }

  async remove(userId: string, postId: number) {
    await this.posts.assertCanRead(userId, postId);
    await this.prisma.postLike.deleteMany({ where: { userId, postId } });
    return this.posts.findOne(userId, postId);
  }
}
