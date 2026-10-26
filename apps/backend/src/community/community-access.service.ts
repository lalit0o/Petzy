import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CommunityRol, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommunityAccessService {
  constructor(private readonly prisma: PrismaService) {}

  memberWhere(userId: string): Prisma.CommunityWhereInput {
    return { expulsions: { none: { userId } }, members: { some: { userId, user: { isActive: true } } } };
  }

  async preview(userId: string, id: number, db: Prisma.TransactionClient = this.prisma) {
    const viewer = await db.user.findFirst({ where: { id: userId, isActive: true }, select: { id: true } });
    if (!viewer) throw new ForbiddenException('Esta cuenta no puede acceder a la comunidad.');
    const community = await db.community.findFirst({ where: { id, expulsions: { none: { userId } } } });
    if (!community) throw new NotFoundException('La comunidad no está disponible.');
    return community;
  }

  async member(userId: string, id: number, roles?: CommunityRol[], db: Prisma.TransactionClient = this.prisma) {
    await this.preview(userId, id, db);
    const member = await db.communityMember.findUnique({ where: { userId_communityId: { userId, communityId: id } } });
    if (!member) throw new ForbiddenException('Únete a la comunidad para continuar.');
    if (roles && !roles.includes(member.role)) throw new ForbiddenException('No tienes permiso para esta acción en la comunidad.');
    return member;
  }
}
