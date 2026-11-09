import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// D-109: al comenzar, se fija una sola vez el total de «Iré» vigentes en ese
// instante. Una tarea periódica lo intenta a la hora prevista y cada lectura
// lo completa si hubo retraso. La sentencia es atómica: solo escribe si el
// total sigue vacío, así que dos intentos simultáneos no lo sobrescriben.
// Compara `respondedAt` e `invalidatedAt` con `startsAt`: salir antes del
// inicio excluye; salir después no cambia el total.
@Injectable()
export class EventStartService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventStartService.name);
  private timer?: NodeJS.Timeout;
  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    // En pruebas se invoca de forma explícita; en la app corre cada 30 s.
    if (process.env.JEST_WORKER_ID !== undefined || process.env.EVENT_START_TASK === 'off') return;
    this.timer = setInterval(() => { this.freezeDue().catch(error => this.logger.error(`No se pudo fijar el total de eventos: ${String(error)}`)); }, 30_000);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async freezeDue(scope: { communityId?: number; eventId?: number } = {}, now = new Date()): Promise<number> {
    const filter = scope.eventId !== undefined
      ? Prisma.sql`AND e."id" = ${scope.eventId}`
      : scope.communityId !== undefined ? Prisma.sql`AND e."communityId" = ${scope.communityId}` : Prisma.empty;
    return this.prisma.$executeRaw`
      UPDATE "Event" e SET "confirmedCountAtStart" = (
        SELECT COUNT(*)::int FROM "EventAttendance" a
        WHERE a."eventId" = e."id" AND a."status" = 'GOING'
          AND a."respondedAt" <= e."startsAt"
          AND (a."invalidatedAt" IS NULL OR a."invalidatedAt" > e."startsAt")
      )
      WHERE e."confirmedCountAtStart" IS NULL AND e."status" = 'PUBLISHED' AND e."startsAt" <= ${now} ${filter}`;
  }
}
