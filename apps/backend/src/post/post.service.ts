import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PostService {
  constructor(private prisma: PrismaService) { }

  async create(userId:string,createPostDto: CreatePostDto) {
    return await this.prisma.post.create({ data: {...createPostDto,userId} });
  }

  findAll() {
    return this.prisma.post.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, username: true, avatar: true } } },
    });
  }

  async findOne(id: number) {
    const post = await this.prisma.post.findFirst({
      where: { id, isActive: true },
      include: { user: { select: { id: true, username: true, avatar: true } } },
    });
    if (!post) {
      throw new NotFoundException('La publicación no existe');
    }
    return post;
  }

  async update(id: number, updatePostDto: UpdatePostDto) {
    await this.findOne(id);
    return this.prisma.post.update({ where: { id }, data: updatePostDto });
  }

  // Borrado lógico, igual que en pet: el post deja de aparecer pero no se pierde.
  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.post.update({ where: { id }, data: { isActive: false } });
  }
}
