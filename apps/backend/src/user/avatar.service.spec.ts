import { BadRequestException, NotFoundException } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SupabaseService } from '../supabase/supabase.service';
import { AvatarService } from './avatar.service';

describe('AvatarService', () => {
  const upload = jest.fn();
  const download = jest.fn();
  const remove = jest.fn();
  const storage = { from: jest.fn().mockReturnValue({ upload, download, remove }) };
  const supabase = { getClient: jest.fn().mockReturnValue({ storage }) };
  const service = new AvatarService(supabase as unknown as SupabaseService);
  const fixture = (extension: string) => readFileSync(join(__dirname, '../../test/fixtures', `post-photo.${extension}`));

  beforeEach(() => jest.clearAllMocks());

  it.each([['jpg', 'image/jpeg'], ['png', 'image/png'], ['webp', 'image/webp']])(
    'stores a valid %s image in the private profile bucket', async (extension, contentType) => {
      upload.mockResolvedValue({ error: null });
      const bytes = fixture(extension);
      const path = await service.upload('ana', { buffer: bytes, size: bytes.length });
      expect(path).toMatch(new RegExp(`^ana/[a-f0-9-]+\\.${extension}$`));
      expect(storage.from).toHaveBeenCalledWith('profile-photos');
      expect(upload).toHaveBeenCalledWith(path, bytes, { contentType, upsert: false, cacheControl: '0' });
    },
  );

  it('rejects invalid or oversized content before Storage', async () => {
    await expect(service.upload('ana', { buffer: Buffer.from('fake'), size: 4 })).rejects.toBeInstanceOf(BadRequestException);
    for (const extension of ['jpg', 'png', 'webp']) {
      const truncated = fixture(extension).subarray(0, 16);
      await expect(service.upload('ana', { buffer: truncated, size: truncated.length })).rejects.toBeInstanceOf(BadRequestException);
    }
    const jpeg = fixture('jpg');
    await expect(service.upload('ana', { buffer: jpeg, size: 5 * 1024 * 1024 + 1 })).rejects.toBeInstanceOf(BadRequestException);
    expect(upload).not.toHaveBeenCalled();
  });

  it('does not return a reference if Storage rejects the upload', async () => {
    upload.mockResolvedValue({ error: new Error('Storage offline') });
    const bytes = fixture('jpg');
    await expect(service.upload('ana', { buffer: bytes, size: bytes.length })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('downloads a valid image and rejects missing or corrupted ones', async () => {
    const jpeg = fixture('jpg');
    download.mockResolvedValue({ data: new Blob([jpeg]), error: null });
    await expect(service.download('ana/photo.jpg')).resolves.toEqual({ bytes: jpeg, contentType: 'image/jpeg' });
    download.mockResolvedValue({ data: null, error: new Error('missing') });
    await expect(service.download('ana/missing.jpg')).rejects.toBeInstanceOf(NotFoundException);
    download.mockResolvedValue({ data: new Blob([Buffer.from('corrupt')]), error: null });
    await expect(service.download('ana/corrupt.jpg')).rejects.toBeInstanceOf(NotFoundException);
  });
});
