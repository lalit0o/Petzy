import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { MAX_PRIVATE_IMAGE_BYTES, privateImageFormat } from '../common/private-image-format';
import { SupabaseService } from '../supabase/supabase.service';

export type PetPhotoUpload = { buffer: Buffer; size: number };
const BUCKET = 'pet-photos';

@Injectable()
export class PetPhotoService {
  private readonly logger = new Logger(PetPhotoService.name);
  constructor(private readonly supabase: SupabaseService) {}

  async upload(ownerId: string, file: PetPhotoUpload) {
    if (!file.buffer?.length || file.size !== file.buffer.length || file.size > MAX_PRIVATE_IMAGE_BYTES) {
      throw new BadRequestException('La foto debe pesar como máximo 5 MB');
    }
    const format = privateImageFormat(file.buffer);
    const path = `${ownerId}/${randomUUID()}.${format.extension}`;
    const { error } = await this.supabase.getClient().storage.from(BUCKET).upload(path, file.buffer, {
      contentType: format.contentType, upsert: false, cacheControl: '0',
    });
    if (error) {
      this.logger.error(`No se pudo guardar la foto de mascota: ${error.message}`);
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
      this.logger.error(`Foto de mascota inválida en Storage: ${path}`);
      throw new NotFoundException('La foto no está disponible');
    }
  }

  async removeAfterCommit(path: string): Promise<void> {
    try {
      const { error } = await this.supabase.getClient().storage.from(BUCKET).remove([path]);
      if (error) this.logger.error(`Limpieza pendiente de foto de mascota ${path}: ${error.message}`);
    } catch (error) {
      this.logger.error(`Limpieza pendiente de foto de mascota ${path}: ${String(error)}`);
    }
  }
}
