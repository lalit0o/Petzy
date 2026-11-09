import { BadRequestException, NotFoundException } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SupabaseService } from '../supabase/supabase.service';
import { CommunityPhotoService } from './community-photo.service';

describe('CommunityPhotoService', () => {
  const upload = jest.fn();
  const download = jest.fn();
  const remove = jest.fn();
  const storage = { from: jest.fn().mockReturnValue({ upload, download, remove }) };
  const supabase = { getClient: jest.fn().mockReturnValue({ storage }) };
  const service = new CommunityPhotoService(supabase as unknown as SupabaseService);
  const fixture = (ext: string) => readFileSync(join(__dirname, '../../test/fixtures', `post-photo.${ext}`));

  beforeEach(() => jest.clearAllMocks());

  it.each([['jpg', 'image/jpeg'], ['png', 'image/png'], ['webp', 'image/webp']])('uploads a valid %s to private Storage', async (ext, type) => {
    upload.mockResolvedValue({ error: null });
    const bytes = fixture(ext);
    const path = await service.upload(7, { buffer: bytes, size: bytes.length });
    expect(path).toMatch(new RegExp(`^7/[a-f0-9-]+\\.${ext}$`));
    expect(storage.from).toHaveBeenCalledWith('community-photos');
    expect(upload).toHaveBeenCalledWith(path, bytes, { contentType: type, upsert: false, cacheControl: '0' });
  });

  it('rejects invalid formats and oversized files before Storage', async () => {
    await expect(service.upload(7, { buffer: Buffer.from('fake'), size: 4 })).rejects.toBeInstanceOf(BadRequestException);
    const jpeg = fixture('jpg');
    await expect(service.upload(7, { buffer: jpeg, size: 5 * 1024 * 1024 + 1 })).rejects.toBeInstanceOf(BadRequestException);
    expect(upload).not.toHaveBeenCalled();
  });

  it('does not return a path on Storage error and rejects a corrupt download', async () => {
    upload.mockResolvedValue({ error: new Error('storage down') });
    const jpeg = fixture('jpg');
    await expect(service.upload(7, { buffer: jpeg, size: jpeg.length })).rejects.toBeInstanceOf(BadRequestException);
    download.mockResolvedValue({ data: new Blob([Buffer.from('corrupt')]), error: null });
    await expect(service.download('7/corrupt.jpg')).rejects.toBeInstanceOf(NotFoundException);
  });
});
