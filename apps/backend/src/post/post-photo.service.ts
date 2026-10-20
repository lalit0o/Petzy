import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { SupabaseService } from 'src/supabase/supabase.service';
import { MAX_PRIVATE_IMAGE_BYTES, privateImageFormat } from '../common/private-image-format';

export type PostPhotoUpload = { buffer: Buffer; size: number };

const BUCKET = 'post-photos';

@Injectable()
export class PostPhotoService {
  private readonly logger = new Logger(PostPhotoService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async upload(userId: string, file: PostPhotoUpload): Promise<string> {
    if (!file.buffer?.length || file.size !== file.buffer.length || file.size > MAX_PRIVATE_IMAGE_BYTES) {
      throw new BadRequestException('La foto debe pesar como máximo 5 MB');
    }
    const format = privateImageFormat(file.buffer);
    const path = `${userId}/${randomUUID()}.${format.extension}`;
    const { error } = await this.supabase.getClient().storage.from(BUCKET).upload(path, file.buffer, {
      contentType: format.contentType,
      upsert: false,
      cacheControl: '0',
    });
    if (error) {
      this.logger.error(`No se pudo guardar una foto de publicación: ${error.message}`);
      throw new BadRequestException('No pudimos guardar la foto. Inténtalo de nuevo.');
    }
    return path;
  }

  async download(path: string): Promise<{ bytes: Buffer; contentType: string }> {
    const { data, error } = await this.supabase.getClient().storage.from(BUCKET).download(path);
    if (error || !data) throw new NotFoundException('La foto no está disponible');
    const bytes = Buffer.from(await data.arrayBuffer());
    try {
      return { bytes, contentType: privateImageFormat(bytes).contentType };
    } catch {
      this.logger.error(`La foto guardada no tiene un formato válido: ${path}`);
      throw new NotFoundException('La foto no está disponible');
    }
  }

  async removeAfterCommit(path: string): Promise<void> {
    try {
      const { error } = await this.supabase.getClient().storage.from(BUCKET).remove([path]);
      if (error) this.logger.error(`Limpieza pendiente de foto ${path}: ${error.message}`);
    } catch (error) {
      this.logger.error(`Limpieza pendiente de foto ${path}: ${String(error)}`);
    }
  }
}
