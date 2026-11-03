import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { SupabaseService } from '../supabase/supabase.service';

export type DeletedCommunityPhotos = { community: string | null; posts: string[] };

// Única operación de borrado para salir y desactivar. Solo usa el cliente de
// la transacción: ningún archivo se retira hasta que se haya confirmado.
@Injectable()
export class CommunityDeletionService {
  private readonly logger = new Logger(CommunityDeletionService.name);
  constructor(private readonly supabase: SupabaseService) {}

  async ifSoleAdmin(tx: Prisma.TransactionClient, id: number, userId: string): Promise<DeletedCommunityPhotos | null> {
    const community = await tx.community.findFirst({
      where: { id, members: { some: { userId, role: 'ADMIN' }, none: { userId: { not: userId } } } },
      select: { photoUrl: true },
    });
    if (!community) return null;
    const photos = await tx.post.findMany({ where: { communityId: id, photoUrl: { not: null } }, select: { photoUrl: true } });
    await tx.moderationRemoval.deleteMany({ where: { OR: [{ post: { communityId: id } }, { comment: { post: { communityId: id } } }] } });
    await tx.postLike.deleteMany({ where: { post: { communityId: id } } });
    // PostView figura en Prisma pero no existe en las migraciones del MVP.
    // Si un entorno ya tiene esa tabla, también limpiamos sus referencias.
    const [views] = await tx.$queryRaw<{ present: boolean }[]>`SELECT to_regclass('"PostView"') IS NOT NULL AS present`;
    if (views.present) await tx.postView.deleteMany({ where: { post: { communityId: id } } });
    await tx.comment.deleteMany({ where: { post: { communityId: id } } });
    await tx.post.deleteMany({ where: { communityId: id } });
    await tx.communityExpulsion.deleteMany({ where: { communityId: id } });
    await tx.communityMember.deleteMany({ where: { communityId: id } });
    await tx.community.delete({ where: { id } });
    return { community: community.photoUrl, posts: photos.flatMap(row => row.photoUrl ? [row.photoUrl] : []) };
  }

  async cleanPhotos(deleted: DeletedCommunityPhotos[]) {
    const groups = [
      { bucket: 'post-photos', paths: deleted.flatMap(row => row.posts) },
      { bucket: 'community-photos', paths: deleted.flatMap(row => row.community ? [row.community] : []) },
    ];
    for (const { bucket, paths } of groups) {
      const unique = [...new Set(paths)];
      for (let i = 0; i < unique.length; i += 100) {
        const batch = unique.slice(i, i + 100);
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const { error } = await this.supabase.getClient().storage.from(bucket).remove(batch);
            if (error) throw error;
            break;
          } catch {
            if (attempt === 2) this.logger.error(`Limpieza pendiente de comunidad: ${JSON.stringify({ bucket, paths: batch })}`);
          }
        }
      }
    }
  }
}
