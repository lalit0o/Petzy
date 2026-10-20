import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PetPhotoService } from './pet-photo.service';
import { PetService } from './pet.service';

describe('PetService photo lifecycle', () => {
  const prisma = {
    user: { findFirst: jest.fn() },
    pet: { findFirst: jest.fn(), updateMany: jest.fn() },
  };
  const photos = { upload: jest.fn(), removeAfterCommit: jest.fn() };
  const service = new PetService(prisma as unknown as PrismaService, photos as unknown as PetPhotoService);
  const file = { buffer: Buffer.from('image'), size: 5 };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findFirst.mockResolvedValue({ id: 'ana' });
    prisma.pet.findFirst.mockResolvedValue({ photo: 'ana/old.jpg' });
    prisma.pet.updateMany.mockResolvedValue({ count: 1 });
    photos.upload.mockResolvedValue('ana/new.jpg');
    photos.removeAfterCommit.mockResolvedValue(undefined);
  });

  it('cleans a newly uploaded file when the database rejects it', async () => {
    prisma.pet.updateMany.mockRejectedValue(new Error('database offline'));
    await expect(service.replacePhoto('ana', 3, file)).rejects.toThrow('database offline');
    expect(photos.removeAfterCommit).toHaveBeenCalledWith('ana/new.jpg');
    expect(photos.removeAfterCommit).not.toHaveBeenCalledWith('ana/old.jpg');
  });

  it('does not change the database if Storage fails', async () => {
    photos.upload.mockRejectedValue(new Error('storage offline'));
    await expect(service.replacePhoto('ana', 3, file)).rejects.toThrow('storage offline');
    expect(prisma.pet.updateMany).not.toHaveBeenCalled();
  });

  it('does not delete a photo if the pet was deactivated concurrently', async () => {
    prisma.pet.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.removePhoto('ana', 3)).rejects.toBeInstanceOf(NotFoundException);
    expect(photos.removeAfterCommit).not.toHaveBeenCalled();
  });
});
