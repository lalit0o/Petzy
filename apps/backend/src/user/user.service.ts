import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SearchProfilesDto } from './dto/search-profiles.dto';
import { AvatarService, AvatarUpload } from './avatar.service';

const ownFields = {
  id: true,
  email: true,
  username: true,
  bio: true,
  locatedAt: true,
  avatar: true,
  createdAt: true,
  isActive: true,
} as const;

const publicFields = {
  id: true,
  username: true,
  bio: true,
  locatedAt: true,
  avatar: true,
} as const;

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService, private readonly avatars: AvatarService) {}

  async getOwnProfile(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, isActive: true },
      select: ownFields,
    });
    if (!user) throw new NotFoundException('Tu perfil no está disponible.');
    const { avatar, ...profile } = user;
    return { ...profile, avatarUrl: avatar ? `/users/${user.id}/avatar` : null };
  }

  async getPublicProfile(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, isActive: true },
      select: publicFields,
    });
    if (!user) throw new NotFoundException('Este perfil no está disponible.');
    const { avatar, ...profile } = user;
    return { ...profile, avatarUrl: avatar ? `/users/${user.id}/avatar` : null };
  }

  async searchProfiles({ q, cursor, limit = 20 }: SearchProfilesDto) {
    let after: { id: string; username: string } | null = null;
    if (cursor) {
      try {
        if (cursor.length > 512 || !/^[\w-]+$/.test(cursor)) throw new Error('cursor');
        const parsed: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
        if (!parsed || typeof parsed !== 'object' || !('q' in parsed) || parsed.q !== q ||
          !('id' in parsed) || typeof parsed.id !== 'string' || !('username' in parsed) ||
          typeof parsed.username !== 'string') throw new Error('cursor');
        after = { id: parsed.id, username: parsed.username };
      } catch {
        throw new BadRequestException('El cursor de búsqueda no es válido. Reinicia la búsqueda.');
      }
    }
    const results = await this.prisma.user.findMany({
      where: {
        isActive: true,
        username: { contains: q, mode: 'insensitive' },
        ...(after ? { OR: [
          { username: { gt: after.username } },
          { username: after.username, id: { gt: after.id } },
        ] } : {}),
      },
      select: publicFields,
      orderBy: [{ username: 'asc' }, { id: 'asc' }],
      take: limit + 1,
    });
    const page = results.slice(0, limit);
    const last = page.at(-1);
    return {
      items: page.map(({ avatar, ...profile }) => ({
        ...profile,
        avatarUrl: avatar ? `/users/${profile.id}/avatar` : null,
      })),
      nextCursor: results.length > limit && last
        ? Buffer.from(JSON.stringify({ q, id: last.id, username: last.username })).toString('base64url')
        : null,
    };
  }

  async updateOwnProfile(userId: string, dto: UpdateProfileDto) {
    const changes = {
      ...(dto.username !== undefined ? { username: dto.username.trim() } : {}),
      ...(dto.bio !== undefined ? { bio: dto.bio === null ? null : dto.bio.trim() || null } : {}),
      ...(dto.locatedAt !== undefined ? { locatedAt: dto.locatedAt } : {}),
    };
    try {
      const result = await this.prisma.user.updateMany({
        where: { id: userId, isActive: true },
        data: changes,
      });
      if (!result.count) throw new NotFoundException('Tu perfil no está disponible.');
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('El nombre de usuario ya está en uso. Elige otro.');
      }
      throw error;
    }
    return this.getOwnProfile(userId);
  }

  async replaceAvatar(userId: string, file?: AvatarUpload) {
    if (!file) throw new BadRequestException('Selecciona una foto.');
    const previous = await this.prisma.user.findFirst({
      where: { id: userId, isActive: true }, select: { avatar: true },
    });
    if (!previous) throw new NotFoundException('Tu perfil no está disponible.');
    const path = await this.avatars.upload(userId, file);
    try {
      const result = await this.prisma.user.updateMany({
        where: { id: userId, isActive: true }, data: { avatar: path },
      });
      if (!result.count) throw new NotFoundException('Tu perfil no está disponible.');
    } catch (error) {
      await this.avatars.removeAfterCommit(path);
      throw error;
    }
    if (previous.avatar) await this.avatars.removeAfterCommit(previous.avatar);
    return this.getOwnProfile(userId);
  }

  async removeAvatar(userId: string) {
    const previous = await this.prisma.user.findFirst({
      where: { id: userId, isActive: true }, select: { avatar: true },
    });
    if (!previous) throw new NotFoundException('Tu perfil no está disponible.');
    const result = await this.prisma.user.updateMany({
      where: { id: userId, isActive: true }, data: { avatar: null },
    });
    if (!result.count) throw new NotFoundException('Tu perfil no está disponible.');
    if (previous.avatar) await this.avatars.removeAfterCommit(previous.avatar);
    return this.getOwnProfile(userId);
  }

  async getAvatar(requesterId: string, ownerId: string) {
    const [requester, owner] = await Promise.all([
      this.prisma.user.findFirst({ where: { id: requesterId, isActive: true }, select: { id: true } }),
      this.prisma.user.findFirst({ where: { id: ownerId, isActive: true }, select: { avatar: true } }),
    ]);
    if (!requester || !owner?.avatar) throw new NotFoundException('La foto no está disponible');
    return this.avatars.download(owner.avatar);
  }
}
