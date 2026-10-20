import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AvatarService } from './avatar.service';
import { UserService } from './user.service';

describe('UserService avatar lifecycle', () => {
  const user = {
    id: 'ana', email: 'ana@example.test', username: 'ana', bio: null,
    locatedAt: 'JALISCO', isActive: true, avatar: 'ana/old.jpg',
  };
  const prisma = {
    user: { findFirst: jest.fn(), updateMany: jest.fn() },
  };
  const avatars = { upload: jest.fn(), removeAfterCommit: jest.fn() };
  const service = new UserService(prisma as unknown as PrismaService, avatars as unknown as AvatarService);
  const file = { buffer: Buffer.from('image'), size: 5 };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findFirst.mockResolvedValue(user);
    prisma.user.updateMany.mockResolvedValue({ count: 1 });
    avatars.upload.mockResolvedValue('ana/new.jpg');
    avatars.removeAfterCommit.mockResolvedValue(undefined);
  });

  it('points to the new image before cleaning up the old one', async () => {
    const events: string[] = [];
    prisma.user.updateMany.mockImplementation(async () => { events.push('database'); return { count: 1 }; });
    avatars.removeAfterCommit.mockImplementation(async () => { events.push('cleanup'); });
    await service.replaceAvatar('ana', file);
    expect(events).toEqual(['database', 'cleanup']);
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'ana', isActive: true }, data: { avatar: 'ana/new.jpg' },
    });
    expect(avatars.removeAfterCommit).toHaveBeenCalledWith('ana/old.jpg');
  });

  it('cleans up a new upload when the database rejects it', async () => {
    prisma.user.updateMany.mockRejectedValue(new Error('database offline'));
    await expect(service.replaceAvatar('ana', file)).rejects.toThrow('database offline');
    expect(avatars.removeAfterCommit).toHaveBeenCalledWith('ana/new.jpg');
    expect(avatars.removeAfterCommit).not.toHaveBeenCalledWith('ana/old.jpg');
  });

  it('keeps the old reference when Storage rejects the upload', async () => {
    avatars.upload.mockRejectedValue(new Error('storage offline'));
    await expect(service.replaceAvatar('ana', file)).rejects.toThrow('storage offline');
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });

  it('does not delete an image if deactivation wins the race', async () => {
    prisma.user.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.removeAvatar('ana')).rejects.toBeInstanceOf(NotFoundException);
    expect(avatars.removeAfterCommit).not.toHaveBeenCalled();
  });
});
