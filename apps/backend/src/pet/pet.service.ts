import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { ListOwnPetsDto } from './dto/list-own-pets.dto';
import { petAge, validateBirth } from './pet-age';
import { PetPhotoService, PetPhotoUpload } from './pet-photo.service';

const petSelect = {
  id: true, ownerId: true, name: true, species: true, breed: true,
  birthYear: true, birthMonth: true, birthDay: true,
  bio: true, photo: true,
} satisfies Prisma.PetSelect;
type SelectedPet = Prisma.PetGetPayload<{ select: typeof petSelect }>;

@Injectable()
export class PetService {
  constructor(private readonly prisma: PrismaService, private readonly photos: PetPhotoService) {}

  private async ensureRequesterActive(requesterId: string) {
    const requester = await this.prisma.user.findFirst({
      where: { id: requesterId, isActive: true }, select: { id: true },
    });
    if (!requester) throw new ForbiddenException('Esta cuenta no puede consultar mascotas.');
  }

  private response(pet: SelectedPet) {
    const { photo, birthYear, birthMonth, birthDay, ...fields } = pet;
    return {
      ...fields,
      birth: { year: birthYear, month: birthMonth, day: birthDay },
      ...petAge({ birthYear, birthMonth, birthDay }),
      photoUrl: photo ? `/pets/${pet.id}/photo` : null,
    };
  }

  async list(requesterId: string, ownerId: string, query: ListOwnPetsDto) {
    await this.ensureRequesterActive(requesterId);
    const owner = await this.prisma.user.findFirst({
      where: { id: ownerId, isActive: true }, select: { id: true },
    });
    if (!owner) throw new NotFoundException('Este perfil no está disponible.');
    const where: Prisma.PetWhereInput = { ownerId, isActive: true, owner: { isActive: true } };
    if (query.cursor) {
      const cursor = await this.prisma.pet.findFirst({ where: { ...where, id: query.cursor }, select: { id: true } });
      if (!cursor) throw new BadRequestException('El cursor no pertenece a esta lista.');
    }
    const limit = query.limit ?? 20;
    const rows = await this.prisma.pet.findMany({
      where, select: petSelect, orderBy: { id: 'desc' }, take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const page = rows.slice(0, limit);
    return { items: page.map(pet => this.response(pet)), nextCursor: rows.length > limit ? page.at(-1)?.id ?? null : null };
  }

  async detail(requesterId: string, id: number) {
    await this.ensureRequesterActive(requesterId);
    const pet = await this.prisma.pet.findFirst({
      where: { id, isActive: true, owner: { isActive: true } }, select: petSelect,
    });
    if (!pet) throw new NotFoundException('Esta mascota no está disponible.');
    return this.response(pet);
  }

  async create(ownerId: string, dto: CreatePetDto) {
    await this.ensureRequesterActive(ownerId);
    const birth = validateBirth(dto.birth);
    const pet = await this.prisma.pet.create({
      data: {
        ownerId, name: dto.name, species: dto.species, breed: dto.breed,
        ...birth, bio: dto.bio?.trim() || null,
      },
      select: petSelect,
    });
    return this.response(pet);
  }

  async update(ownerId: string, id: number, dto: UpdatePetDto) {
    await this.ensureRequesterActive(ownerId);
    const birth = dto.birth ? validateBirth(dto.birth) : {};
    const result = await this.prisma.pet.updateMany({
      where: { id, ownerId, isActive: true, owner: { isActive: true } },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.species !== undefined ? { species: dto.species } : {}),
        ...(dto.breed !== undefined ? { breed: dto.breed } : {}),
        ...(dto.bio !== undefined ? { bio: dto.bio?.trim() || null } : {}),
        ...birth,
      },
    });
    if (!result.count) throw new NotFoundException('Esta mascota no está disponible.');
    return this.detail(ownerId, id);
  }

  async remove(ownerId: string, id: number) {
    await this.ensureRequesterActive(ownerId);
    const result = await this.prisma.pet.updateMany({
      where: { id, ownerId, isActive: true, owner: { isActive: true } },
      data: { isActive: false },
    });
    if (!result.count) throw new NotFoundException('Esta mascota no está disponible.');
    return { message: 'La ficha de la mascota se retiró.' };
  }

  private async ownedActive(ownerId: string, id: number) {
    await this.ensureRequesterActive(ownerId);
    const pet = await this.prisma.pet.findFirst({
      where: { id, ownerId, isActive: true, owner: { isActive: true } },
      select: { photo: true },
    });
    if (!pet) throw new NotFoundException('Esta mascota no está disponible.');
    return pet;
  }

  async replacePhoto(ownerId: string, id: number, file?: PetPhotoUpload) {
    if (!file) throw new BadRequestException('Selecciona una foto.');
    const previous = await this.ownedActive(ownerId, id);
    const path = await this.photos.upload(ownerId, file);
    try {
      const result = await this.prisma.pet.updateMany({
        where: { id, ownerId, isActive: true, owner: { isActive: true } },
        data: { photo: path },
      });
      if (!result.count) throw new NotFoundException('Esta mascota no está disponible.');
    } catch (error) {
      await this.photos.removeAfterCommit(path);
      throw error;
    }
    if (previous.photo) await this.photos.removeAfterCommit(previous.photo);
    return this.detail(ownerId, id);
  }

  async removePhoto(ownerId: string, id: number) {
    const previous = await this.ownedActive(ownerId, id);
    const result = await this.prisma.pet.updateMany({
      where: { id, ownerId, isActive: true, owner: { isActive: true } },
      data: { photo: null },
    });
    if (!result.count) throw new NotFoundException('Esta mascota no está disponible.');
    if (previous.photo) await this.photos.removeAfterCommit(previous.photo);
    return this.detail(ownerId, id);
  }

  async getPhoto(requesterId: string, id: number) {
    await this.ensureRequesterActive(requesterId);
    const pet = await this.prisma.pet.findFirst({
      where: { id, isActive: true, owner: { isActive: true } },
      select: { photo: true },
    });
    if (!pet?.photo) throw new NotFoundException('La foto no está disponible');
    return this.photos.download(pet.photo);
  }
}
