import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PostType } from 'src/generated/prisma/enums';
import { PrismaService } from 'src/prisma/prisma.service';
import { PostService } from './post.service';
import { PostPhotoService } from './post-photo.service';

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 12,
  userId: 'author',
  communityId: null,
  petId: null,
  type: PostType.GENERAL,
  title: 'Luna en el parque',
  description: 'Hoy jugó mucho.',
  createdAt: new Date('2026-10-20T00:00:00Z'),
  photoUrl: null,
  user: { id: 'author', username: 'ana', avatar: null },
  pet: null,
  ...overrides,
});

describe('PostService', () => {
  const db = {
    post: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    pet: { findFirst: jest.fn() },
    user: { findFirst: jest.fn() },
    postLike: { groupBy: jest.fn(), findMany: jest.fn() },
    communityMember: { findUnique: jest.fn() },
  };
  const photos = { upload: jest.fn(), download: jest.fn(), removeAfterCommit: jest.fn() };
  const service = new PostService(db as unknown as PrismaService, photos as unknown as PostPhotoService);

  beforeEach(() => {
    jest.clearAllMocks();
    db.user.findFirst.mockResolvedValue({ id: 'reader' });
    db.postLike.groupBy.mockResolvedValue([]);
    db.postLike.findMany.mockResolvedValue([]);
  });

  it('requires an active post and author, and a membership for community posts', () => {
    expect(service.readableWhere('reader')).toEqual({
      isActive: true,
      user: { isActive: true },
      OR: [
        { communityId: null },
        { community: { members: { some: { userId: 'reader' } } } },
      ],
    });
  });

  it('does not return a post that fails the shared visibility rule', async () => {
    db.post.findFirst.mockResolvedValue(null);
    await expect(service.findOne('outsider', 12)).rejects.toBeInstanceOf(NotFoundException);
    expect(db.post.findFirst).toHaveBeenCalledWith({
      where: { AND: [service.readableWhere('outsider'), { id: 12 }] },
      select: expect.any(Object),
    });
  });

  it('keeps private photo references out of responses and hides inactive pets', async () => {
    db.post.findFirst.mockResolvedValue(
      row({ photoUrl: 'private/posts/12.jpg', pet: { id: 3, name: 'Luna', photo: 'private/pets/3.jpg', isActive: false } }),
    );
    const result = await service.findOne('reader', 12);
    expect(result).toMatchObject({ hasPhoto: true, photoPath: '/posts/12/photo', pet: null });
    expect(JSON.stringify(result)).not.toContain('private/');
  });

  it('filters home by null community and category with a stable next cursor', async () => {
    db.post.findMany.mockResolvedValue([row({ id: 3 }), row({ id: 2 }), row({ id: 1 })]);
    const result = await service.listHome('reader', { type: PostType.HELP, limit: 2 });
    expect(result.items.map((post) => post.id)).toEqual([3, 2]);
    expect(result.nextCursor).toBe(2);
    expect(db.post.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { AND: [service.readableWhere('reader'), { communityId: null }, { type: PostType.HELP }] },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 3,
    }));
  });

  it('rejects community list access when the viewer is not a member', async () => {
    db.communityMember.findUnique.mockResolvedValue(null);
    await expect(service.listCommunity('outsider', 7, {})).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.post.findMany).not.toHaveBeenCalled();
  });

  it('rejects a cursor from another list or filter', async () => {
    db.post.findFirst.mockResolvedValue(null);
    await expect(service.listHome('reader', { cursor: 8, type: PostType.TIP })).rejects.toBeInstanceOf(BadRequestException);
    expect(db.post.findMany).not.toHaveBeenCalled();
  });

  it('creates a general post using the authenticated author and no pet', async () => {
    db.post.create.mockResolvedValue(row());
    await service.create('author', { type: PostType.GENERAL, title: ' Luna ', description: ' Hola ' });
    expect(db.post.create).toHaveBeenCalledWith(expect.objectContaining({
      data: { userId: 'author', communityId: null, petId: null, photoUrl: null, type: PostType.GENERAL, title: 'Luna', description: 'Hola' },
    }));
  });

  it('rejects a pet that is not owned and active', async () => {
    db.pet.findFirst.mockResolvedValue(null);
    await expect(service.create('author', {
      type: PostType.HELP, title: 'Ayuda', description: 'Descripción', petId: 5,
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(db.post.create).not.toHaveBeenCalled();
  });

  it('checks the owner before editing and leaves community and author untouched', async () => {
    db.post.findFirst.mockResolvedValue({ id: 12, title: 'Anterior', description: 'Texto' });
    db.post.update.mockResolvedValue(row({ title: 'Nuevo' }));
    await service.update('author', 12, { title: ' Nuevo ' });
    expect(db.post.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 12, userId: 'author', isActive: true },
    }));
    expect(db.post.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { title: 'Nuevo', description: 'Texto', type: undefined, petId: undefined },
    }));
  });

  it('soft deletes only the authors active post', async () => {
    db.post.updateMany.mockResolvedValue({ count: 1 });
    await service.remove('author', 12);
    expect(db.post.updateMany).toHaveBeenCalledWith({
      where: { id: 12, userId: 'author', isActive: true },
      data: { isActive: false },
    });
    db.post.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.remove('other', 12)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('checks visibility again before downloading photo bytes', async () => {
    db.post.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(row({ photoUrl: 'private/12.jpg' }));
    await expect(service.getPhoto('outsider', 12)).rejects.toBeInstanceOf(NotFoundException);
    photos.download.mockResolvedValue({ bytes: Buffer.from('photo'), contentType: 'image/jpeg' });
    await expect(service.getPhoto('member', 12)).resolves.toMatchObject({ contentType: 'image/jpeg' });
    expect(photos.download).toHaveBeenCalledWith('private/12.jpg');
  });

  it('cleans a newly uploaded photo when the post insert fails', async () => {
    photos.upload.mockResolvedValue('private/new.jpg');
    photos.removeAfterCommit.mockResolvedValue(undefined);
    db.post.create.mockRejectedValue(new Error('database down'));
    await expect(service.create('author', {
      type: PostType.GENERAL, title: 'Foto', description: 'Texto',
    }, null, { buffer: Buffer.from('photo'), size: 5 })).rejects.toThrow('database down');
    expect(photos.removeAfterCommit).toHaveBeenCalledWith('private/new.jpg');
  });

  it('keeps the previous photo until the replacement is saved', async () => {
    db.post.findFirst.mockResolvedValue({ id: 12, title: 'Anterior', description: 'Texto', photoUrl: 'private/old.jpg' });
    photos.upload.mockResolvedValue('private/new.jpg');
    photos.removeAfterCommit.mockResolvedValue(undefined);
    db.post.update.mockResolvedValue(row({ photoUrl: 'private/new.jpg' }));
    await service.update('author', 12, {}, { buffer: Buffer.from('photo'), size: 5 });
    expect(db.post.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ photoUrl: 'private/new.jpg' }) }));
    expect(photos.removeAfterCommit).toHaveBeenCalledWith('private/old.jpg');
  });

  it('does not discard an old photo if saving its replacement fails', async () => {
    db.post.findFirst.mockResolvedValue({ id: 12, title: 'Anterior', description: 'Texto', photoUrl: 'private/old.jpg' });
    photos.upload.mockResolvedValue('private/new.jpg');
    photos.removeAfterCommit.mockResolvedValue(undefined);
    db.post.update.mockRejectedValue(new Error('database down'));
    await expect(service.update('author', 12, {}, { buffer: Buffer.from('photo'), size: 5 })).rejects.toThrow('database down');
    expect(photos.removeAfterCommit).toHaveBeenCalledWith('private/new.jpg');
    expect(photos.removeAfterCommit).not.toHaveBeenCalledWith('private/old.jpg');
  });

  it('removes a pet link and photo only when explicitly requested', async () => {
    db.post.findFirst.mockResolvedValue({ id: 12, title: 'Anterior', description: 'Texto', photoUrl: 'private/old.jpg' });
    db.post.update.mockResolvedValue(row({ photoUrl: null }));
    photos.removeAfterCommit.mockResolvedValue(undefined);
    await service.update('author', 12, { removePet: true, removePhoto: true });
    expect(db.post.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ petId: null, photoUrl: null }) }));
    expect(photos.removeAfterCommit).toHaveBeenCalledWith('private/old.jpg');
  });
});
