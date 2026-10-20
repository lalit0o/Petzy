import { BadRequestException, NotFoundException } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SupabaseService } from 'src/supabase/supabase.service';
import { PostPhotoService } from './post-photo.service';

describe('PostPhotoService', () => {
  const upload = jest.fn();
  const download = jest.fn();
  const remove = jest.fn();
  const storage = { from: jest.fn().mockReturnValue({ upload, download, remove }) };
  const supabase = { getClient: jest.fn().mockReturnValue({ storage }) };
  const service = new PostPhotoService(supabase as unknown as SupabaseService);
  const fixture = (extension: string) => readFileSync(join(__dirname, '../../test/fixtures', `post-photo.${extension}`));
  const jpeg = fixture('jpg');

  beforeEach(() => jest.clearAllMocks());

  it.each([
    ['jpg', 'image/jpeg'], ['png', 'image/png'], ['webp', 'image/webp'],
  ])('accepts a real %s image and stores a private path', async (extension, contentType) => {
    upload.mockResolvedValue({ error: null });
    const bytes = fixture(extension);
    const path = await service.upload('ana', { buffer: bytes, size: bytes.length });
    expect(path).toMatch(new RegExp(`^ana/[a-f0-9-]+\\.${extension}$`));
    expect(storage.from).toHaveBeenCalledWith('post-photos');
    expect(upload).toHaveBeenCalledWith(path, bytes, {
      contentType, upsert: false, cacheControl: '0',
    });
  });

  it('rejects unsupported content and oversized files before storage', async () => {
    await expect(service.upload('ana', { buffer: Buffer.from('fake'), size: 4 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.upload('ana', { buffer: Buffer.from([0xff, 0xd8, 0xff, 0x11]), size: 4 })).rejects.toBeInstanceOf(BadRequestException);
    for (const extension of ['jpg', 'png', 'webp']) {
      const truncated = fixture(extension).subarray(0, 16);
      await expect(service.upload('ana', { buffer: truncated, size: truncated.length })).rejects.toBeInstanceOf(BadRequestException);
    }
    await expect(service.upload('ana', { buffer: jpeg, size: 5 * 1024 * 1024 + 1 })).rejects.toBeInstanceOf(BadRequestException);
    expect(upload).not.toHaveBeenCalled();
  });

  it('reports a Storage upload failure without returning a photo path', async () => {
    upload.mockResolvedValue({ error: new Error('storage unavailable') });
    await expect(service.upload('ana', { buffer: jpeg, size: jpeg.length })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns photo bytes only through the storage download call', async () => {
    download.mockResolvedValue({ data: new Blob([jpeg]), error: null });
    await expect(service.download('ana/photo.jpg')).resolves.toEqual({ bytes: jpeg, contentType: 'image/jpeg' });
    download.mockResolvedValue({ data: null, error: new Error('missing') });
    await expect(service.download('ana/missing.jpg')).rejects.toBeInstanceOf(NotFoundException);
    download.mockResolvedValue({ data: new Blob([Buffer.from('corrupt')]), error: null });
    await expect(service.download('ana/corrupt.jpg')).rejects.toBeInstanceOf(NotFoundException);
  });
});
