import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { MAX_PRIVATE_IMAGE_BYTES, privateImageFormat } from '../common/private-image-format';
import { SupabaseService } from '../supabase/supabase.service';

export type EventCoverUpload = { buffer: Buffer; size: number };
export const EVENT_COVER_BUCKET = 'event-covers';

// Portada opcional y privada (D-102): JPEG, PNG o WebP reales de hasta 5 MB.
// Solo se guarda la ruta interna; la app la pide al backend con su sesión.
@Injectable()
export class EventPhotoService {
  private readonly logger = new Logger(EventPhotoService.name);
  constructor(private readonly supabase: SupabaseService) {}

  validate(file: EventCoverUpload) {
    if (!file.buffer?.length || file.size !== file.buffer.length || file.size > MAX_PRIVATE_IMAGE_BYTES) {
      throw new BadRequestException('La portada debe pesar como máximo 5 MB');
    }
    return privateImageFormat(file.buffer);
  }

  async upload(eventId: number, file: EventCoverUpload) {
    const format = this.validate(file);
    const path = `${eventId}/${randomUUID()}.${format.extension}`;
    const storage = this.supabase.getClient().storage;
    const send = () => storage.from(EVENT_COVER_BUCKET).upload(path, file.buffer, { contentType: format.contentType, upsert: false, cacheControl: '0' });
    let { error } = await send();
    // El bucket privado se crea la primera vez que hace falta, sin acceso público.
    if (error && /bucket not found/i.test(error.message)) {
      const created = await storage.createBucket(EVENT_COVER_BUCKET, { public: false });
      if (created.error && !/already exists/i.test(created.error.message)) this.logger.error(`No se pudo crear el bucket de portadas: ${created.error.message}`);
      ({ error } = await send());
    }
    if (error) {
      this.logger.error(`No se pudo guardar la portada del evento: ${error.message}`);
      throw new BadRequestException('No pudimos guardar la portada. Inténtalo de nuevo.');
    }
    return path;
  }

  async download(path: string): Promise<{ bytes: Buffer; contentType: string }> {
    const { data, error } = await this.supabase.getClient().storage.from(EVENT_COVER_BUCKET).download(path);
    if (error || !data) throw new NotFoundException('La portada no está disponible');
    const bytes = Buffer.from(await data.arrayBuffer());
    try {
      return { bytes, contentType: privateImageFormat(bytes).contentType };
    } catch {
      this.logger.error(`Portada de evento inválida en Storage: ${path}`);
      throw new NotFoundException('La portada no está disponible');
    }
  }

  async removeAfterCommit(path: string): Promise<void> {
    try {
      const { error } = await this.supabase.getClient().storage.from(EVENT_COVER_BUCKET).remove([path]);
      if (error) this.logger.error(`Limpieza pendiente de portada ${path}: ${error.message}`);
    } catch (error) {
      this.logger.error(`Limpieza pendiente de portada ${path}: ${String(error)}`);
    }
  }
}
