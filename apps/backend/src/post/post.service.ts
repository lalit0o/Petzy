import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { ListPostsDto } from './dto/list-posts.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostPhotoService, PostPhotoUpload } from './post-photo.service';
import { petAge } from '../pet/pet-age';
import { CommunityAccessService } from '../community/community-access.service';

const postSelect = {
  id: true,
  userId: true,
  communityId: true,
  petId: true,
  type: true,
  title: true,
  description: true,
  createdAt: true,
  photoUrl: true,
  user: { select: { id: true, username: true, avatar: true } },
  pet: { select: { id: true, name: true, species: true, birthYear: true, birthMonth: true, birthDay: true, photo: true, isActive: true } },
} satisfies Prisma.PostSelect;

type SelectedPost = Prisma.PostGetPayload<{ select: typeof postSelect }>;

@Injectable()
export class PostService {
  constructor(private readonly prisma: PrismaService, private readonly photos: PostPhotoService, private readonly communities: CommunityAccessService) {}

  // Shared with photo, comments and reactions as those modules are integrated.
  readableWhere(viewerId: string): Prisma.PostWhereInput {
    return {
      isActive: true,
      user: { isActive: true },
      OR: [
        { communityId: null },
        { community: this.communities.memberWhere(viewerId) },
      ],
    };
  }

  async assertCanRead(viewerId: string, id: number) {
    const viewer = await this.prisma.user.findFirst({ where: { id: viewerId, isActive: true }, select: { id: true } });
    if (!viewer) throw new NotFoundException('La publicación no está disponible');
    const post = await this.prisma.post.findFirst({
      where: { AND: [this.readableWhere(viewerId), { id }] },
      select: postSelect,
    });
    if (!post) throw new NotFoundException('La publicación no está disponible');
    return post;
  }

  private publicPost(post: SelectedPost, likes: { likeCount: number; likedByMe: boolean } = { likeCount: 0, likedByMe: false }) {
    const { photoUrl, pet, petId, user, ...publicFields } = post;
    return {
      ...publicFields,
      user: { id: user.id, username: user.username, hasAvatar: Boolean(user.avatar) },
      hasPhoto: Boolean(photoUrl),
      photoPath: photoUrl ? `/posts/${post.id}/photo` : null,
      ...likes,
      pet: pet?.isActive
        ? {
            id: pet.id,
            name: pet.name,
            species: pet.species,
            ...petAge(pet),
            photoUrl: pet.photo ? `/pets/${pet.id}/photo` : null,
          }
        : null,
    };
  }

  private async visiblePosts(userId: string, posts: SelectedPost[]) {
    if (!posts.length) return [];
    const ids = posts.map(post => post.id);
    const [counts, mine] = await Promise.all([
      this.prisma.postLike.groupBy({
        by: ['postId'], where: { postId: { in: ids }, user: { isActive: true } },
        _count: { postId: true },
      }),
      this.prisma.postLike.findMany({ where: { postId: { in: ids }, userId }, select: { postId: true } }),
    ]);
    const countById = new Map(counts.map(row => [row.postId, row._count.postId]));
    const likedIds = new Set(mine.map(row => row.postId));
    return posts.map(post => this.publicPost(post, {
      likeCount: countById.get(post.id) ?? 0,
      likedByMe: likedIds.has(post.id),
    }));
  }

  private async assertMember(userId: string, communityId: number) {
    await this.communities.member(userId, communityId);
  }

  private async list(userId: string, query: ListPostsDto, communityId: number | null) {
    if (communityId !== null) await this.assertMember(userId, communityId);
    const where: Prisma.PostWhereInput = {
      AND: [
        this.readableWhere(userId),
        { communityId },
        ...(query.type ? [{ type: query.type }] : []),
      ],
    };
    if (query.cursor) {
      const cursorPost = await this.prisma.post.findFirst({
        where: { AND: [where, { id: query.cursor }] },
        select: { id: true },
      });
      if (!cursorPost) throw new BadRequestException('El cursor no pertenece a esta lista');
    }
    const limit = query.limit ?? 20;
    const rows = await this.prisma.post.findMany({
      where,
      select: postSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    return {
      items: await this.visiblePosts(userId, page),
      nextCursor: hasMore ? page.at(-1)?.id ?? null : null,
    };
  }

  listHome(userId: string, query: ListPostsDto) {
    return this.list(userId, query, null);
  }

  listCommunity(userId: string, communityId: number, query: ListPostsDto) {
    return this.list(userId, query, communityId);
  }

  async findOne(userId: string, id: number) {
    return (await this.visiblePosts(userId, [await this.assertCanRead(userId, id)]))[0];
  }

  async getPhoto(userId: string, id: number) {
    const post = await this.assertCanRead(userId, id);
    if (!post.photoUrl) throw new NotFoundException('La publicación no tiene foto');
    return this.photos.download(post.photoUrl);
  }

  private async assertOwnedActivePet(userId: string, petId: number | null | undefined) {
    if (petId == null) return;
    const pet = await this.prisma.pet.findFirst({
      where: { id: petId, ownerId: userId, isActive: true },
      select: { id: true },
    });
    if (!pet) throw new BadRequestException('Elige una mascota propia y activa');
  }

  private normalizedText(title: string, description: string) {
    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim();
    if (!normalizedTitle || normalizedTitle.length > 120) {
      throw new BadRequestException('El título debe tener entre 1 y 120 caracteres');
    }
    if (!normalizedDescription || normalizedDescription.length > 3000) {
      throw new BadRequestException('La descripción debe tener entre 1 y 3 000 caracteres');
    }
    return { title: normalizedTitle, description: normalizedDescription };
  }

  async create(userId: string, dto: CreatePostDto, communityId: number | null = null, file?: PostPhotoUpload) {
    if (communityId !== null) await this.assertMember(userId, communityId);
    await this.assertOwnedActivePet(userId, dto.petId);
    const text = this.normalizedText(dto.title, dto.description);
    const path = file ? await this.photos.upload(userId, file) : null;
    let post: SelectedPost;
    try {
      post = await this.prisma.post.create({
        data: { ...text, type: dto.type, userId, communityId, petId: dto.petId ?? null, photoUrl: path },
        select: postSelect,
      });
    } catch (error) {
      if (path) await this.photos.removeAfterCommit(path);
      throw error;
    }
    return (await this.visiblePosts(userId, [post]))[0];
  }

  async update(userId: string, id: number, dto: UpdatePostDto, file?: PostPhotoUpload) {
    if (file && dto.removePhoto) throw new BadRequestException('Elige reemplazar o quitar la foto');
    if (dto.removePet && dto.petId !== undefined && dto.petId !== null) {
      throw new BadRequestException('Elige una mascota o quita el vínculo actual');
    }
    const current = await this.prisma.post.findFirst({
      where: { id, isActive: true, userId },
      select: { id: true, title: true, description: true, photoUrl: true },
    });
    if (!current) throw new NotFoundException('La publicación no está disponible');
    await this.assertOwnedActivePet(userId, dto.petId);
    const text = this.normalizedText(
      dto.title ?? current.title,
      dto.description ?? current.description,
    );
    const newPath = file ? await this.photos.upload(userId, file) : undefined;
    let post: SelectedPost;
    try {
      post = await this.prisma.post.update({
        where: { id, userId, isActive: true },
        data: {
          ...text,
          type: dto.type,
          petId: dto.removePet ? null : dto.petId,
          ...(newPath ? { photoUrl: newPath } : dto.removePhoto ? { photoUrl: null } : {}),
        },
        select: postSelect,
      });
    } catch (error) {
      if (newPath) await this.photos.removeAfterCommit(newPath);
      throw error;
    }
    if (current.photoUrl && (newPath || dto.removePhoto)) {
      await this.photos.removeAfterCommit(current.photoUrl);
    }
    return (await this.visiblePosts(userId, [post]))[0];
  }

  async remove(userId: string, id: number) {
    const changed = await this.prisma.post.updateMany({
      where: { id, userId, isActive: true },
      data: { isActive: false },
    });
    if (changed.count === 0) throw new NotFoundException('La publicación no está disponible');
    return { message: 'Publicación retirada' };
  }
}
