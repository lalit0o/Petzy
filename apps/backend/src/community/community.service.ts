import { CommunityDeletionService } from './community-deletion.service';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CommunityRol, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CommunityAccessService } from './community-access.service';
import { CommunityPhotoService, CommunityPhotoUpload } from './community-photo.service';
import { CommunityQuery, CreateCommunityDto, MemberQuery, UpdateCommunityDto } from './community.dto';
import { serializableTransaction } from '../common/serializable-transaction';
import { invalidateFutureAttendance } from '../event/event-attendance';

@Injectable()
export class CommunityService {
  private readonly logger = new Logger(CommunityService.name);
  constructor(private readonly prisma: PrismaService, private readonly access: CommunityAccessService, private readonly deletion: CommunityDeletionService, private readonly photos: CommunityPhotoService) {}

  private async locked<T>(id: number, work: (tx: Prisma.TransactionClient) => Promise<T>) {
    return serializableTransaction(this.prisma, async tx => {
      await tx.$queryRaw`SELECT id FROM "Community" WHERE id = ${id} FOR UPDATE`;
      return work(tx);
    });
  }

  private async active(userId: string) {
    if (!await this.prisma.user.findFirst({ where: { id: userId, isActive: true }, select: { id: true } })) {
      throw new NotFoundException('La cuenta no está disponible.');
    }
  }

  private async response(userId: string, row: { id: number; name: string; description: string; topic: string; photoUrl: string | null }) {
    const [memberCount, membership] = await Promise.all([
      this.prisma.communityMember.count({ where: { communityId: row.id, user: { isActive: true } } }),
      this.prisma.communityMember.findUnique({ where: { userId_communityId: { userId, communityId: row.id } }, select: { role: true } }),
    ]);
    return { id: row.id, name: row.name, description: row.description, photoPath: row.photoUrl ? `/communities/${row.id}/photo` : null, memberCount, role: membership?.role ?? null, ...(membership?.role === CommunityRol.ADMIN ? { topic: row.topic } : {}) };
  }

  async list(userId: string, query: CommunityQuery) {
    await this.active(userId);
    const where: Prisma.CommunityWhereInput = {
      expulsions: { none: { userId } },
      ...(query.mine ? { members: { some: { userId } } } : {}),
      ...(query.q ? { OR: [{ name: { contains: query.q, mode: 'insensitive' } }, { topic: { contains: query.q, mode: 'insensitive' } }] } : {}),
    };
    if (query.cursor && !await this.prisma.community.findFirst({ where: { ...where, id: query.cursor }, select: { id: true } })) throw new BadRequestException('El cursor no pertenece a esta lista.');
    const limit = query.limit ?? 20;
    const rows = await this.prisma.community.findMany({ where, orderBy: { id: 'desc' }, take: limit + 1, ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}) });
    const page = rows.slice(0, limit);
    return { items: await Promise.all(page.map(row => this.response(userId, row))), nextCursor: rows.length > limit ? page.at(-1)?.id ?? null : null };
  }

  async detail(userId: string, id: number) { return this.response(userId, await this.access.preview(userId, id)); }

  async create(userId: string, dto: CreateCommunityDto, file?: CommunityPhotoUpload) {
    const row = await serializableTransaction(this.prisma, async tx => {
      if (!await tx.user.findFirst({ where: { id: userId, isActive: true }, select: { id: true } })) throw new NotFoundException('La cuenta no está disponible.');
      return tx.community.create({ data: { ...dto, members: { create: { userId, role: CommunityRol.ADMIN } } } });
    });
    if (file) {
      let path: string;
      try {
        path = await this.photos.upload(row.id, file);
      } catch (error) {
        await this.discardIncomplete(row.id);
        throw error;
      }
      try {
        await this.prisma.community.update({ where: { id: row.id }, data: { photoUrl: path } });
      } catch (error) {
        await this.photos.removeAfterCommit(path);
        await this.discardIncomplete(row.id);
        throw error;
      }
      row.photoUrl = path;
    }
    return this.response(userId, row);
  }

  // Si la foto elegida al crear falla, no se deja una comunidad a medias:
  // se deshace la creación completa (todavía no tiene posts ni otros
  // miembros, nadie más pudo haberla referenciado).
  private async discardIncomplete(id: number) {
    try {
      await this.prisma.$transaction([
        this.prisma.communityMember.deleteMany({ where: { communityId: id } }),
        this.prisma.community.delete({ where: { id } }),
      ]);
    } catch (error) {
      this.logger.error(`No se pudo deshacer la comunidad incompleta ${id}: ${String(error)}`);
    }
  }

  async update(userId: string, id: number, dto: UpdateCommunityDto) {
    const row = await this.locked(id, async tx => {
      await this.access.member(userId, id, [CommunityRol.ADMIN], tx);
      return tx.community.update({ where: { id }, data: dto });
    });
    return this.response(userId, row);
  }

  async replacePhoto(userId: string, id: number, file?: CommunityPhotoUpload) {
    if (!file) throw new BadRequestException('Selecciona una foto.');
    await this.access.member(userId, id, [CommunityRol.ADMIN]);
    const path = await this.photos.upload(id, file);
    let previous: string | null;
    try {
      previous = await this.setPhoto(userId, id, path);
    } catch (error) {
      await this.photos.removeAfterCommit(path);
      throw error;
    }
    if (previous && previous !== path) await this.photos.removeAfterCommit(previous);
    return this.detail(userId, id);
  }

  async removePhoto(userId: string, id: number) {
    await this.access.member(userId, id, [CommunityRol.ADMIN]);
    const previous = await this.setPhoto(userId, id, null);
    if (previous) await this.photos.removeAfterCommit(previous);
    return this.detail(userId, id);
  }

  private async setPhoto(userId: string, id: number, photo: string | null) {
    return this.locked(id, async tx => {
      await this.access.member(userId, id, [CommunityRol.ADMIN], tx);
      const previous = await tx.community.findUnique({ where: { id }, select: { photoUrl: true } });
      if (!previous) throw new NotFoundException('La comunidad no está disponible.');
      await tx.community.update({ where: { id }, data: { photoUrl: photo } });
      return previous.photoUrl;
    });
  }

  async getPhoto(requesterId: string, id: number) {
    const community = await this.access.preview(requesterId, id);
    if (!community.photoUrl) throw new NotFoundException('La foto no está disponible');
    return this.photos.download(community.photoUrl);
  }

  async join(userId: string, id: number) {
    await this.locked(id, async tx => {
      await this.access.preview(userId, id, tx);
      await tx.communityMember.createMany({ data: [{ userId, communityId: id, role: CommunityRol.MEMBER }], skipDuplicates: true });
    });
    return this.detail(userId, id);
  }

  private async otherAdmin(tx: Prisma.TransactionClient, id: number, userId: string) {
    const others = await tx.communityMember.count({ where: { communityId: id, userId: { not: userId }, role: CommunityRol.ADMIN, user: { isActive: true } } });
    if (!others) throw new BadRequestException('Primero nombra a otra persona administradora de la comunidad.');
  }

  async leave(userId: string, id: number) {
    const deleted = await this.locked(id, async tx => {
      const membership = await this.access.member(userId, id, undefined, tx);
      if (membership.role === CommunityRol.ADMIN) {
        const removed = await this.deletion.ifSoleAdmin(tx, id, userId);
        if (removed) return removed;
        await this.otherAdmin(tx, id, userId);
      }
      await tx.communityMember.delete({ where: { userId_communityId: { userId, communityId: id } } });
      await invalidateFutureAttendance(tx, userId, id);
      return null;
    });
    if (deleted) await this.deletion.cleanPhotos([deleted]);
    return { message: deleted ? 'La comunidad y su contenido se eliminaron definitivamente.' : 'Saliste de la comunidad.', communityDeleted: !!deleted };
  }

  private person(user: { id: string; username: string; avatar: string | null }) {
    return { id: user.id, username: user.username, avatarUrl: user.avatar ? `/users/${user.id}/avatar` : null };
  }

  async members(userId: string, id: number, query: MemberQuery) {
    await this.access.member(userId, id);
    const where = { communityId: id, user: { isActive: true } };
    if (query.cursor && !await this.prisma.communityMember.findFirst({ where: { ...where, userId: query.cursor } })) throw new BadRequestException('El cursor no pertenece a esta lista.');
    const limit = query.limit ?? 20;
    const rows = await this.prisma.communityMember.findMany({ where, orderBy: [{ joinedAt: 'desc' }, { userId: 'desc' }], take: limit + 1, include: { user: { select: { id: true, username: true, avatar: true } } }, ...(query.cursor ? { cursor: { userId_communityId: { userId: query.cursor, communityId: id } }, skip: 1 } : {}) });
    const page = rows.slice(0, limit);
    return { items: page.map(row => ({ ...this.person(row.user), role: row.role })), nextCursor: rows.length > limit ? page.at(-1)?.userId ?? null : null };
  }

  async changeRole(userId: string, id: number, targetId: string, role: CommunityRol) {
    await this.locked(id, async tx => {
      await this.access.member(userId, id, [CommunityRol.ADMIN], tx);
      const target = await tx.communityMember.findFirst({ where: { communityId: id, userId: targetId, user: { isActive: true } } });
      if (!target) throw new NotFoundException('La persona ya no es miembro activo.');
      if (target.role === CommunityRol.ADMIN && role !== CommunityRol.ADMIN) await this.otherAdmin(tx, id, targetId);
      await tx.communityMember.update({ where: { userId_communityId: { userId: targetId, communityId: id } }, data: { role } });
    });
    return { message: 'Rol actualizado.' };
  }

  async expel(userId: string, id: number, targetId: string) {
    await this.locked(id, async tx => {
      await this.access.member(userId, id, [CommunityRol.ADMIN], tx);
      if (await tx.communityExpulsion.findUnique({ where: { communityId_userId: { communityId: id, userId: targetId } } })) return;
      const target = await tx.communityMember.findUnique({ where: { userId_communityId: { userId: targetId, communityId: id } } });
      if (!target) throw new NotFoundException('La persona ya no es miembro.');
      if (target.role === CommunityRol.ADMIN) throw new BadRequestException('Primero cambia el rol de esa persona administradora.');
      await tx.communityMember.delete({ where: { userId_communityId: { userId: targetId, communityId: id } } });
      await tx.communityExpulsion.create({ data: { communityId: id, userId: targetId, expelledById: userId } });
      await invalidateFutureAttendance(tx, targetId, id);
    });
    return { message: 'Persona expulsada de la comunidad.' };
  }

  async expulsions(userId: string, id: number, query: MemberQuery) {
    await this.access.member(userId, id, [CommunityRol.ADMIN]);
    const where = { communityId: id };
    if (query.cursor && !await this.prisma.communityExpulsion.findUnique({ where: { communityId_userId: { communityId: id, userId: query.cursor } } })) throw new BadRequestException('El cursor no pertenece a esta lista.');
    const limit = query.limit ?? 20;
    const rows = await this.prisma.communityExpulsion.findMany({ where, orderBy: [{ expelledAt: 'desc' }, { userId: 'desc' }], take: limit + 1, include: { user: { select: { id: true, username: true, avatar: true } } }, ...(query.cursor ? { cursor: { communityId_userId: { communityId: id, userId: query.cursor } }, skip: 1 } : {}) });
    return { items: rows.slice(0, limit).map(row => ({ ...this.person(row.user), expelledAt: row.expelledAt })), nextCursor: rows.length > limit ? rows[limit - 1].userId : null };
  }

  async unblock(userId: string, id: number, targetId: string) {
    await this.locked(id, async tx => {
      await this.access.member(userId, id, [CommunityRol.ADMIN], tx);
      await tx.communityExpulsion.deleteMany({ where: { communityId: id, userId: targetId } });
    });
    return { message: 'La persona puede volver a unirse.' };
  }
}
