import { Prisma } from '../generated/prisma/client';

// D-71 y D-117: al salir, ser expulsada o desactivar su cuenta antes de que un
// evento empiece, la respuesta deja de contarse y no revive sola al volver.
// Se ejecuta dentro de la misma transacción que el cambio de membresía o cuenta.
// Las respuestas de eventos ya comenzados no se tocan: el total histórico
// queda como se fijó al inicio (D-109).
export async function invalidateFutureAttendance(tx: Prisma.TransactionClient, userId: string, communityId?: number) {
  const now = new Date();
  await tx.eventAttendance.updateMany({
    where: { userId, invalidatedAt: null, event: { startsAt: { gt: now }, ...(communityId === undefined ? {} : { communityId }) } },
    data: { invalidatedAt: now },
  });
}
