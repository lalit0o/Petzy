import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { AdoptionStatus } from '../generated/prisma/enums';
import { ChatService } from '../chat/chat.service';
import { petAge } from '../pet/pet-age';
import { PrismaService } from '../prisma/prisma.service';
import { AdoptionPhotoService, type AdoptionPhotoUpload } from './adoption-photo.service';
import { ALREADY_REPORTED, cursorWhere, encodeCursor, PHOTOS_MAX, PHOTOS_MIN, photoPlan } from './adoption-rules';
import { CreateAdoptionDto, ListAdoptionsDto, ListWithdrawnDto, ReportAdoptionDto, UpdateAdoptionDto } from './adoption.dto';

const UNAVAILABLE = 'Este anuncio ya no está disponible.';
type Tx = Prisma.TransactionClient;

const listingSelect = {
  id: true, userId: true, title: true, description: true, status: true, isActive: true, createdAt: true, updatedAt: true,
  user: { select: { id: true, username: true, avatar: true, isActive: true } },
  pet: { select: { id: true, ownerId: true, name: true, species: true, birthYear: true, birthMonth: true, birthDay: true, photo: true, isActive: true } },
  photos: { select: { id: true, position: true }, orderBy: { position: 'asc' } },
} satisfies Prisma.AdoptionListingSelect;
type ListingRow = Prisma.AdoptionListingGetPayload<{ select: typeof listingSelect }>;

function isUniqueViolation(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

// Adopción (D-89–D-98). La identidad sale siempre del token validado por el
// guard global (sesión, correo confirmado, perfil completo y cuenta activa).
// Un anuncio es visible para otras cuentas solo si está activo y su autor
// también; uno retirado solo lo ve su autor. Nada de esto depende de la app.
@Injectable()
export class AdoptionService {
  constructor(private readonly prisma: PrismaService, private readonly photos: AdoptionPhotoService, private readonly chat: ChatService) {}

  // Respuesta pública: sin correo ni rutas internas de Storage. La ficha
  // enlazada solo aparece mientras siga activa y sea del autor (D-95).
  private present(row: ListingRow, me: string, extra: { reportedByMe?: boolean } = {}) {
    const pet = row.pet && row.pet.isActive && row.pet.ownerId === row.userId ? row.pet : null;
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      mine: row.userId === me,
      author: { id: row.user.id, username: row.user.username, avatarUrl: row.user.avatar ? `/users/${row.user.id}/avatar` : null },
      photos: row.photos.map(photo => ({ id: photo.id, url: `/adoptions/${row.id}/photos/${photo.id}` })),
      pet: pet ? {
        id: pet.id, name: pet.name, species: pet.species,
        ...petAge({ birthYear: pet.birthYear, birthMonth: pet.birthMonth, birthDay: pet.birthDay }),
        photoUrl: pet.photo ? `/pets/${pet.id}/photo` : null,
      } : null,
      ...extra,
    };
  }

  // AD-T03: un único control para detalle, fotos, cambios, contacto y reportes.
  private async find(me: string, id: number, tx: Tx | PrismaService = this.prisma) {
    const row = await tx.adoptionListing.findUnique({ where: { id }, select: listingSelect });
    if (!row) throw new NotFoundException(UNAVAILABLE);
    const mine = row.userId === me;
    if (!mine && (!row.isActive || !row.user.isActive)) throw new NotFoundException(UNAVAILABLE);
    return { row, mine };
  }

  private async own(me: string, id: number, tx: Tx | PrismaService, active: boolean) {
    const found = await this.find(me, id, tx);
    if (!found.mine) throw new ForbiddenException('Solo quien publicó el anuncio puede cambiarlo.');
    if (found.row.isActive !== active) {
      throw new ConflictException(active ? 'Este anuncio está retirado. Restáuralo para cambiarlo.' : 'Este anuncio ya está publicado.');
    }
    return found.row;
  }

  // Bloqueo de fila: editar y reportar el mismo anuncio se ordenan entre sí,
  // así la copia del reporte corresponde a una versión completa y la limpieza
  // de fotos no borra una que un reporte acaba de guardar.
  private lock(tx: Tx, id: number) {
    return tx.$queryRaw`SELECT id FROM "AdoptionListing" WHERE id = ${id} FOR UPDATE`;
  }

  // D-95: solo una ficha propia y activa; null quita el vínculo.
  private async checkPet(me: string, petId: number | null | undefined, tx: Tx | PrismaService = this.prisma) {
    if (petId === undefined || petId === null) return;
    const pet = await tx.pet.findFirst({ where: { id: petId, ownerId: me, isActive: true }, select: { id: true } });
    if (!pet) throw new BadRequestException('Elige una de tus mascotas activas o ninguna.');
  }

  private checkCount(files: AdoptionPhotoUpload[]) {
    if (files.length < PHOTOS_MIN) throw new BadRequestException('Agrega al menos una foto del animal.');
    if (files.length > PHOTOS_MAX) throw new BadRequestException('El anuncio admite hasta tres fotos.');
  }

  // AD-T05: anuncio y fotos se guardan juntos; si falla la base, se borran las fotos subidas.
  async create(me: string, dto: CreateAdoptionDto, files: AdoptionPhotoUpload[] = []) {
    this.checkCount(files);
    files.forEach(file => this.photos.validate(file));
    await this.checkPet(me, dto.petId);
    const keys = await this.photos.uploadAll(me, files);
    try {
      const created = await this.prisma.adoptionListing.create({
        data: {
          userId: me, title: dto.title, description: dto.description, petId: dto.petId ?? null,
          photos: { create: keys.map((storageKey, position) => ({ storageKey, position })) },
        },
        select: listingSelect,
      });
      return this.present(created, me);
    } catch (error) {
      await this.photos.removeQuietly(keys);
      throw error;
    }
  }

  // AD-T06: solo anuncios activos de autores activos; primero «Busca hogar».
  async list(me: string, query: ListAdoptionsDto) {
    const limit = query.limit ?? 20;
    const rows = await this.prisma.adoptionListing.findMany({
      where: { AND: [{ isActive: true, user: { isActive: true } }, query.status ? { status: query.status } : {}, cursorWhere(query.cursor)] },
      select: listingSelect,
      orderBy: [{ status: 'asc' }, { id: 'desc' }],
      take: limit + 1,
    });
    const page = rows.slice(0, limit);
    const last = page.at(-1);
    return { items: page.map(row => this.present(row, me)), nextCursor: rows.length > limit && last ? encodeCursor(last.status, last.id) : null };
  }

  async detail(me: string, id: number) {
    const { row, mine } = await this.find(me, id);
    const reported = mine ? null : await this.prisma.adoptionReport.findUnique({ where: { listingId_reporterId: { listingId: id, reporterId: me } }, select: { id: true } });
    return this.present(row, me, { reportedByMe: reported !== null });
  }

  // AD-T07: se comprueba acceso en cada petición; un retirado solo lo ve su autor.
  async photo(me: string, id: number, photoId: number) {
    await this.find(me, id);
    const photo = await this.prisma.adoptionPhoto.findFirst({ where: { id: photoId, listingId: id }, select: { storageKey: true } });
    if (!photo) throw new NotFoundException('La foto no está disponible.');
    return this.photos.download(photo.storageKey);
  }

  // AD-T08: solo el autor de un anuncio activo. Las fotos cambian solo si
  // llega `keepPhotoIds`; las nuevas se suben antes y se borran si algo falla.
  async update(me: string, id: number, dto: UpdateAdoptionDto, files: AdoptionPhotoUpload[] = []) {
    if (files.length && dto.keepPhotoIds === undefined) throw new BadRequestException('Indica qué fotos se conservan al agregar otras.');
    files.forEach(file => this.photos.validate(file));
    const before = await this.own(me, id, this.prisma, true);
    if (dto.keepPhotoIds !== undefined) photoPlan(before.photos.map(p => p.id), dto.keepPhotoIds, files.length);
    await this.checkPet(me, dto.petId);
    const added = files.length ? await this.photos.uploadAll(me, files) : [];
    let orphaned: string[] = [];
    try {
      const updated = await this.prisma.$transaction(async tx => {
        await this.lock(tx, id);
        const current = await this.own(me, id, tx, true);
        await this.checkPet(me, dto.petId, tx);
        if (dto.keepPhotoIds !== undefined) {
          const keep = dto.keepPhotoIds;
          const { removed } = photoPlan(current.photos.map(p => p.id), keep, added.length);
          const existing = await tx.adoptionPhoto.findMany({ where: { listingId: id }, select: { id: true, storageKey: true } });
          const keyOf = new Map(existing.map(p => [p.id, p.storageKey]));
          const ordered = [...keep.map(photoId => keyOf.get(photoId) as string), ...added];
          await tx.adoptionPhoto.deleteMany({ where: { listingId: id } });
          await tx.adoptionPhoto.createMany({ data: ordered.map((storageKey, position) => ({ listingId: id, storageKey, position })) });
          // Un archivo que un reporte conserva no se borra (D-97, D-98).
          const removedKeys = removed.map(photoId => keyOf.get(photoId) as string);
          const kept = await tx.adoptionReportPhoto.findMany({ where: { storageKey: { in: removedKeys } }, select: { storageKey: true } });
          orphaned = removedKeys.filter(key => !kept.some(row => row.storageKey === key));
        }
        return tx.adoptionListing.update({
          where: { id },
          data: {
            ...(dto.title !== undefined ? { title: dto.title } : {}),
            ...(dto.description !== undefined ? { description: dto.description } : {}),
            ...(dto.status !== undefined ? { status: dto.status } : {}),
            ...(dto.petId !== undefined ? { petId: dto.petId } : {}),
          },
          select: listingSelect,
        });
      });
      await this.photos.removeQuietly(orphaned);
      return this.present(updated, me);
    } catch (error) {
      await this.photos.removeQuietly(added);
      throw error;
    }
  }

  // AD-T09: retirar conserva todo, incluido el estado, para restaurarlo igual.
  async withdraw(me: string, id: number) {
    await this.own(me, id, this.prisma, true);
    const row = await this.prisma.adoptionListing.update({ where: { id }, data: { isActive: false }, select: listingSelect });
    return this.present(row, me);
  }

  async restore(me: string, id: number) {
    await this.own(me, id, this.prisma, false);
    const row = await this.prisma.adoptionListing.update({ where: { id }, data: { isActive: true }, select: listingSelect });
    return this.present(row, me);
  }

  async withdrawn(me: string, query: ListWithdrawnDto) {
    const limit = query.limit ?? 20;
    const rows = await this.prisma.adoptionListing.findMany({
      where: { userId: me, isActive: false, ...(query.cursor ? { id: { lt: query.cursor } } : {}) },
      select: listingSelect,
      orderBy: { id: 'desc' },
      take: limit + 1,
    });
    const page = rows.slice(0, limit);
    return { items: page.map(row => this.present(row, me)), nextCursor: rows.length > limit ? page.at(-1)?.id ?? null : null };
  }

  // AD-T10: un reporte por persona y anuncio, con copia del contenido y de
  // las fotos vigentes, todo en una transacción. Sin lectura del equipo en el MVP.
  async report(me: string, id: number, dto: ReportAdoptionDto) {
    try {
      await this.prisma.$transaction(async tx => {
        await this.lock(tx, id);
        const { row, mine } = await this.find(me, id, tx);
        if (mine) throw new BadRequestException('No puedes reportar tu propio anuncio.');
        if (!row.isActive) throw new NotFoundException(UNAVAILABLE);
        const photos = await tx.adoptionPhoto.findMany({ where: { listingId: id }, select: { storageKey: true, position: true }, orderBy: { position: 'asc' } });
        await tx.adoptionReport.create({
          data: {
            listingId: id, reporterId: me, reason: dto.reason, explanation: dto.explanation ?? null,
            snapshotTitle: row.title, snapshotDescription: row.description, snapshotStatus: row.status,
            photos: { create: photos.map(photo => ({ storageKey: photo.storageKey, position: photo.position })) },
          },
        });
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException({ code: ALREADY_REPORTED, message: 'Ya lo reportaste.' });
      throw error;
    }
    return { saved: true };
  }

  // AD-T11 (D-91): «Contactar» solo con un anuncio ajeno visible que busca hogar;
  // reutiliza la conversación de Chat del par y sus reglas de bloqueo.
  async contact(me: string, id: number) {
    const { row, mine } = await this.find(me, id);
    if (mine) throw new BadRequestException('Este anuncio es tuyo.');
    if (row.status !== AdoptionStatus.SEEKING_HOME) throw new ConflictException('Este animal ya encontró hogar.');
    return this.chat.open(me, row.userId);
  }
}
