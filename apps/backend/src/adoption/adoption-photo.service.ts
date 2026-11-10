import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { MAX_PRIVATE_IMAGE_BYTES, privateImageFormat } from '../common/private-image-format';
import { SupabaseService } from '../supabase/supabase.service';

export type AdoptionPhotoUpload = { buffer: Buffer; size: number };
export const ADOPTION_PHOTO_BUCKET = 'adoption-photos';

// Fotos privadas de Adopción (AD-T04, D-89, D-94): JPEG, PNG o WebP reales de
// hasta 5 MB. Solo el backend escribe en el bucket; la app recibe una ruta de
// la API, nunca la ruta interna ni una URL pública.
@Injectable()
export class AdoptionPhotoService {
  private readonly logger = new Logger(AdoptionPhotoService.name);
  constructor(private readonly supabase: SupabaseService) {}

  validate(file: AdoptionPhotoUpload) {
    if (!file.buffer?.length || file.size !== file.buffer.length || file.size > MAX_PRIVATE_IMAGE_BYTES) {
      throw new BadRequestException('Cada foto debe pesar como máximo 5 MB.');
    }
    return privateImageFormat(file.buffer);
  }

  // Sube todas o ninguna: si una falla, borra las que ya se habían subido.
  async uploadAll(ownerId: string, files: AdoptionPhotoUpload[]) {
    const formats = files.map(file => this.validate(file));
    const uploaded: string[] = [];
    try {
      for (const [index, file] of files.entries()) uploaded.push(await this.upload(ownerId, file, formats[index]));
    } catch (error) {
      await this.removeQuietly(uploaded);
      throw error;
    }
    return uploaded;
  }

  private async upload(ownerId: string, file: AdoptionPhotoUpload, format: { extension: string; contentType: string }) {
    const path = `${ownerId}/${randomUUID()}.${format.extension}`;
    const storage = this.supabase.getClient().storage;
    const send = () => storage.from(ADOPTION_PHOTO_BUCKET).upload(path, file.buffer, { contentType: format.contentType, upsert: false, cacheControl: '0' });
    let { error } = await send();
    // El bucket privado se crea la primera vez que hace falta, sin acceso público.
    if (error && /bucket not found/i.test(error.message)) {
      const created = await storage.createBucket(ADOPTION_PHOTO_BUCKET, { public: false });
      if (created.error && !/already exists/i.test(created.error.message)) this.logger.error(`No se pudo crear el bucket de adopciones: ${created.error.message}`);
      ({ error } = await send());
    }
    if (error) {
      this.logger.error(`No se pudo guardar una foto de adopción: ${error.message}`);
      throw new BadRequestException('No pudimos guardar las fotos. Inténtalo de nuevo.');
    }
    return path;
  }

  async download(path: string): Promise<{ bytes: Buffer; contentType: string }> {
    const { data, error } = await this.supabase.getClient().storage.from(ADOPTION_PHOTO_BUCKET).download(path);
    if (error || !data) throw new NotFoundException('La foto no está disponible.');
    const bytes = Buffer.from(await data.arrayBuffer());
    try {
      return { bytes, contentType: privateImageFormat(bytes).contentType };
    } catch {
      this.logger.error(`Foto de adopción inválida en Storage: ${path}`);
      throw new NotFoundException('La foto no está disponible.');
    }
  }

  // Limpieza después de confirmar en la base; un fallo se registra para reintento.
  async removeQuietly(paths: string[]): Promise<void> {
    if (!paths.length) return;
    try {
      const { error } = await this.supabase.getClient().storage.from(ADOPTION_PHOTO_BUCKET).remove(paths);
      if (error) this.logger.error(`Limpieza pendiente de fotos de adopción ${paths.join(', ')}: ${error.message}`);
    } catch (error) {
      this.logger.error(`Limpieza pendiente de fotos de adopción ${paths.join(', ')}: ${String(error)}`);
    }
  }
}
