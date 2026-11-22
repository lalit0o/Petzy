import { ConflictException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

function serializationConflict(error: unknown, depth = 0): boolean {
  if (depth > 3 || typeof error !== 'object' || error === null) return false;
  const fields = error as Record<string, unknown>;
  if (fields.code === 'P2034' || ['40001', '40P01'].includes(String(fields.originalCode ?? fields.code))) return true;
  // Prisma 7 puede conservar el error del adaptador al fallar COMMIT, en vez
  // de envolverlo en P2034. No convertir ni reintentar otros errores de datos.
  return ['cause', 'meta', 'driverAdapterError'].some(key => serializationConflict(fields[key], depth + 1));
}

// Compartido por membresías/roles y desactivación: ambas operaciones participan
// en el mismo aislamiento para evitar que cambios simultáneos eliminen al último ADMIN.
export async function serializableTransaction<T>(prisma: PrismaService, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 10000 });
    } catch (error) {
      if (!serializationConflict(error)) throw error;
      if (attempt === 3) throw new ConflictException('Otra operación cambió la cuenta o comunidad. Intenta de nuevo.');
      // Espera breve y aleatoria para que solicitudes simultáneas (p. ej. varios toques
      // seguidos) no vuelvan a chocar en el mismo instante (casos límite, 22-11-2026).
      await new Promise(resolve => setTimeout(resolve, 15 * 2 ** attempt + Math.random() * 25));
    }
  }
  throw new ConflictException('No se pudo completar la operación. Intenta de nuevo.');
}
