import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CommunityRol, EventAttendanceStatus, EventNoticeKind, EventStatus, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CommunityAccessService } from '../community/community-access.service';
import { serializableTransaction } from '../common/serializable-transaction';
import { EventPhotoService, type EventCoverUpload } from './event-photo.service';
import { EventStartService } from './event-start.service';
import { ChatRealtimeService } from '../chat/chat-realtime.service';
import { CreateEventDto, ListEventsDto, UpdateEventDto } from './event.dto';
import { cancelSummary, changeSummary, eventPhase, isValidTimeZone, roundCoordinate, type EventPhase } from './event-rules';

type EventRow = Prisma.EventGetPayload<{ include: { creator: { select: { id: true; username: true; isActive: true } } } }>;
type Viewer = { userId: string; role: CommunityRol | null };

const withCreator = { creator: { select: { id: true, username: true, isActive: true } } } as const;
const UNAVAILABLE = 'El evento no está disponible.';

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CommunityAccessService,
    private readonly photos: EventPhotoService,
    private readonly start: EventStartService,
    private readonly realtime: ChatRealtimeService,
  ) {}

  // ---------- Permisos (EV-T03) ----------

  // Lectura: cuenta activa y no expulsada de la comunidad del evento (D-09, D-70).
  // Un expulsado recibe lo mismo que si el evento no existiera.
  private async visible(userId: string, id: number, db: Prisma.TransactionClient = this.prisma) {
    const event = await db.event.findUnique({ where: { id }, include: withCreator });
    if (!event) throw new NotFoundException(UNAVAILABLE);
    try {
      await this.access.preview(userId, event.communityId, db);
    } catch (error) {
      if (error instanceof NotFoundException) throw new NotFoundException(UNAVAILABLE);
      throw error;
    }
    const membership = await db.communityMember.findUnique({ where: { userId_communityId: { userId, communityId: event.communityId } }, select: { role: true } });
    const viewer: Viewer = { userId, role: membership?.role ?? null };
    return { event, viewer };
  }

  // Gestión: creador que sigue siendo miembro o ADMIN vigente (D-119).
  private canManage(event: { creatorId: string }, viewer: Viewer) {
    return viewer.role !== null && (viewer.role === CommunityRol.ADMIN || event.creatorId === viewer.userId);
  }

  private async managed(tx: Prisma.TransactionClient, userId: string, id: number) {
    await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${id} FOR UPDATE`;
    const { event, viewer } = await this.visible(userId, id, tx);
    if (!this.canManage(event, viewer)) throw new ForbiddenException('Solo quien creó el evento, si sigue en la comunidad, o una persona administradora puede cambiarlo.');
    return event;
  }

  // ---------- Lectura (EV-T05) ----------

  private sectionWhere(communityId: number, section: EventPhase, now: Date): Prisma.EventWhereInput {
    if (section === 'upcoming') return { communityId, status: EventStatus.PUBLISHED, startsAt: { gt: now } };
    if (section === 'ongoing') return { communityId, status: EventStatus.PUBLISHED, startsAt: { lte: now }, endsAt: { gt: now } };
    return { communityId, OR: [{ status: EventStatus.CANCELLED }, { status: EventStatus.PUBLISHED, endsAt: { lte: now } }] };
  }

  private sectionOrder(section: EventPhase): Prisma.EventOrderByWithRelationInput[] {
    return section === 'past' ? [{ endsAt: 'desc' }, { id: 'desc' }] : [{ startsAt: 'asc' }, { id: 'asc' }];
  }

  // Conteo vigente antes del inicio: «Iré» no invalidado de miembros con cuenta activa.
  private async liveCounts(communityId: number, ids: number[]) {
    if (!ids.length) return new Map<number, number>();
    const rows = await this.prisma.eventAttendance.groupBy({
      by: ['eventId'],
      where: { eventId: { in: ids }, status: EventAttendanceStatus.GOING, invalidatedAt: null, user: { isActive: true, communities: { some: { communityId } } } },
      _count: { _all: true },
    });
    return new Map(rows.map(row => [row.eventId, row._count._all]));
  }

  private async ownResponses(userId: string, ids: number[]) {
    if (!ids.length) return new Map<number, EventAttendanceStatus>();
    const rows = await this.prisma.eventAttendance.findMany({ where: { userId, eventId: { in: ids }, invalidatedAt: null }, select: { eventId: true, status: true } });
    return new Map(rows.map(row => [row.eventId, row.status]));
  }

  private serialize(event: EventRow, viewer: Viewer, now: Date, live: number | undefined, own: EventAttendanceStatus | undefined, full: boolean) {
    const phase = eventPhase(event, now);
    const cancelled = event.status === EventStatus.CANCELLED;
    const manage = this.canManage(event, viewer) && !cancelled;
    return {
      id: event.id,
      communityId: event.communityId,
      title: event.title,
      ...(full ? { description: event.description } : {}),
      placeLabel: event.placeLabel,
      latitude: Number(event.latitude),
      longitude: Number(event.longitude),
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      timeZone: event.timeZone,
      status: event.status,
      phase,
      coverPath: event.coverImagePath ? `/events/${event.id}/cover` : null,
      // Cancelado: total oculto (D-103). Antes del inicio: conteo vigente.
      // Después: el total fijado al comenzar (D-109).
      goingCount: cancelled ? null : phase === 'upcoming' ? (live ?? 0) : event.confirmedCountAtStart,
      myResponse: own ?? null,
      isMember: viewer.role !== null,
      canRespond: viewer.role !== null && !cancelled && phase === 'upcoming',
      canEdit: manage && phase !== 'past',
      canEditStart: manage && phase === 'upcoming',
      canCancel: manage && now < event.endsAt,
      creator: event.creator.isActive ? { id: event.creator.id, username: event.creator.username } : null,
      updatedAt: event.updatedAt,
    };
  }

  async list(userId: string, communityId: number, query: ListEventsDto) {
    await this.access.preview(userId, communityId);
    const membership = await this.prisma.communityMember.findUnique({ where: { userId_communityId: { userId, communityId } }, select: { role: true } });
    const now = new Date();
    await this.start.freezeDue({ communityId }, now);
    const where = this.sectionWhere(communityId, query.section, now);
    if (query.cursor && !await this.prisma.event.findFirst({ where: { ...where, id: query.cursor }, select: { id: true } })) {
      throw new BadRequestException('El cursor no pertenece a esta lista.');
    }
    const limit = query.limit ?? 20;
    const rows = await this.prisma.event.findMany({
      where, orderBy: this.sectionOrder(query.section), take: limit + 1, include: withCreator,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const page = rows.slice(0, limit);
    const ids = page.map(row => row.id);
    const [live, own] = await Promise.all([this.liveCounts(communityId, ids), this.ownResponses(userId, ids)]);
    const viewer: Viewer = { userId, role: membership?.role ?? null };
    return {
      items: page.map(row => this.serialize(row, viewer, now, live.get(row.id), own.get(row.id), false)),
      nextCursor: rows.length > limit ? page.at(-1)?.id ?? null : null,
    };
  }

  async detail(userId: string, id: number) {
    const now = new Date();
    await this.start.freezeDue({ eventId: id }, now);
    const { event, viewer } = await this.visible(userId, id);
    const [live, own] = await Promise.all([this.liveCounts(event.communityId, [id]), this.ownResponses(userId, [id])]);
    return this.serialize(event, viewer, now, live.get(id), own.get(id), true);
  }

  // ---------- Crear (EV-T04, EV-T09) ----------

  private checkZone(timeZone: string) {
    if (!isValidTimeZone(timeZone)) throw new BadRequestException('La zona horaria no es válida.');
  }

  private parseDate(value: string, message: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new BadRequestException(message);
    return date;
  }

  async create(userId: string, communityId: number, dto: CreateEventDto, file?: EventCoverUpload) {
    const now = new Date();
    const startsAt = this.parseDate(dto.startsAt, 'Elige la fecha y hora de inicio.');
    const endsAt = this.parseDate(dto.endsAt, 'Elige la fecha y la hora aproximada de fin.');
    if (startsAt <= now) throw new BadRequestException('El inicio debe ser una fecha y hora futuras.');
    if (endsAt <= startsAt) throw new BadRequestException('El fin aproximado debe ser posterior al inicio.');
    this.checkZone(dto.timeZone);
    // La portada se valida antes de crear nada: un rechazo no deja filas parciales.
    if (file) this.photos.validate(file);
    const event = await serializableTransaction(this.prisma, async tx => {
      await this.access.member(userId, communityId, [CommunityRol.ADMIN, CommunityRol.MODERATOR], tx);
      return tx.event.create({
        data: {
          communityId, creatorId: userId, title: dto.title, description: dto.description, placeLabel: dto.placeLabel,
          latitude: roundCoordinate(dto.latitude), longitude: roundCoordinate(dto.longitude), startsAt, endsAt, timeZone: dto.timeZone,
        },
      });
    });
    if (file) {
      let path: string;
      try {
        path = await this.photos.upload(event.id, file);
      } catch (error) {
        await this.discard(event.id);
        throw error;
      }
      try {
        await this.prisma.event.update({ where: { id: event.id }, data: { coverImagePath: path } });
      } catch (error) {
        await this.photos.removeAfterCommit(path);
        await this.discard(event.id);
        throw error;
      }
    }
    return this.detail(userId, event.id);
  }

  // Recién creado no tiene respuestas ni avisos: se puede borrar por completo.
  private async discard(id: number) {
    try {
      await this.prisma.event.delete({ where: { id } });
    } catch (error) {
      this.logger.error(`No se pudo deshacer el evento incompleto ${id}: ${String(error)}`);
    }
  }

  // ---------- Asistencia (EV-T06) ----------

  async respond(userId: string, id: number, response: EventAttendanceStatus) {
    await serializableTransaction(this.prisma, async tx => {
      await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${id} FOR UPDATE`;
      const { event, viewer } = await this.visible(userId, id, tx);
      if (!viewer.role) throw new ForbiddenException('Únete a la comunidad para responder.');
      if (event.status === EventStatus.CANCELLED) throw new ConflictException('El evento se canceló y ya no acepta respuestas.');
      const now = new Date();
      if (now >= event.startsAt) throw new ConflictException('La asistencia se cerró al comenzar el evento.');
      await tx.eventAttendance.upsert({
        where: { eventId_userId: { eventId: id, userId } },
        create: { eventId: id, userId, status: response, respondedAt: now },
        update: { status: response, respondedAt: now, invalidatedAt: null },
      });
    });
    return this.detail(userId, id);
  }

  // ---------- Avisos guardados (EV-T11) ----------

  // Un aviso por persona con «Iré» vigente, en lote y en la misma transacción
  // que el cambio. La clave (destinatario, cambio) impide repetirlo. Quien hace
  // el cambio no recibe aviso de su propia acción.
  private async notify(tx: Prisma.TransactionClient, event: { id: number; communityId: number }, actorId: string, kind: EventNoticeKind, summary: string, changeKey: string) {
    const recipients = await tx.eventAttendance.findMany({
      where: {
        eventId: event.id, status: EventAttendanceStatus.GOING, invalidatedAt: null, userId: { not: actorId },
        user: { isActive: true, communities: { some: { communityId: event.communityId } } },
      },
      select: { userId: true },
    });
    if (!recipients.length) return 0;
    const result = await tx.eventNotice.createMany({
      data: recipients.map(row => ({ eventId: event.id, recipientId: row.userId, kind, summary, changeKey })),
      skipDuplicates: true,
    });
    return result.count;
  }

  // Aviso en vivo con la app abierta (EV-T18, D-156): se manda después de
  // confirmar el cambio y solo si se guardaron avisos nuevos, para que un
  // reintento con la misma clave no repita la tarjeta emergente.
  private async announce(changeKey: string) {
    const notices = await this.prisma.eventNotice.findMany({
      where: { changeKey },
      select: { id: true, recipientId: true, kind: true, summary: true, createdAt: true, readAt: true, event: { select: { id: true, title: true, communityId: true } } },
    });
    for (const { recipientId, ...notice } of notices) this.realtime.emitToUser(recipientId, 'event_notice', notice);
  }

  // ---------- Editar (EV-T12) ----------

  async update(userId: string, id: number, dto: UpdateEventDto) {
    const changeKey = `${id}:change:${dto.requestKey ?? randomUUID()}`;
    let created = 0;
    await serializableTransaction(this.prisma, async tx => {
      created = 0;
      const event = await this.managed(tx, userId, id);
      const now = new Date();
      if (event.status === EventStatus.CANCELLED) throw new ConflictException('El evento se canceló y ya no se puede editar.');
      const phase = eventPhase(event, now);
      if (phase === 'past') throw new ConflictException('El evento ya terminó y no se puede editar.');

      const startsAt = dto.startsAt !== undefined ? this.parseDate(dto.startsAt, 'Elige la fecha y hora de inicio.') : event.startsAt;
      const endsAt = dto.endsAt !== undefined ? this.parseDate(dto.endsAt, 'Elige la fecha y la hora aproximada de fin.') : event.endsAt;
      const startChanged = startsAt.getTime() !== event.startsAt.getTime();
      const endChanged = endsAt.getTime() !== event.endsAt.getTime();
      if (startChanged && phase !== 'upcoming') throw new ConflictException('El evento ya comenzó: el inicio no se puede cambiar.');
      if (startChanged && startsAt <= now) throw new BadRequestException('El nuevo inicio debe ser una fecha y hora futuras.');
      if (endsAt <= startsAt) throw new BadRequestException('El fin aproximado debe ser posterior al inicio.');
      if (endChanged && endsAt <= now) throw new BadRequestException('El fin aproximado debe ser posterior a este momento.');
      if (dto.timeZone !== undefined) this.checkZone(dto.timeZone);

      const latitude = dto.latitude !== undefined ? roundCoordinate(dto.latitude) : Number(event.latitude);
      const longitude = dto.longitude !== undefined ? roundCoordinate(dto.longitude) : Number(event.longitude);
      const placeLabel = dto.placeLabel ?? event.placeLabel;
      const placeChanged = placeLabel !== event.placeLabel || latitude !== Number(event.latitude) || longitude !== Number(event.longitude);
      const scheduleChanged = startChanged || endChanged;

      const updated = await tx.event.update({
        where: { id },
        data: {
          title: dto.title ?? event.title, description: dto.description ?? event.description, placeLabel,
          latitude, longitude, startsAt, endsAt, timeZone: dto.timeZone ?? event.timeZone,
        },
      });
      // Solo horario o lugar avisan; título, descripción o portada no (D-101).
      if (scheduleChanged || placeChanged) {
        created = await this.notify(tx, updated, userId, EventNoticeKind.CHANGED, changeSummary(updated, { schedule: scheduleChanged, place: placeChanged }), changeKey);
      }
    });
    if (created) await this.announce(changeKey);
    return this.detail(userId, id);
  }

  // ---------- Cancelar (EV-T13) ----------

  async cancel(userId: string, id: number) {
    let created = 0;
    await serializableTransaction(this.prisma, async tx => {
      created = 0;
      const event = await this.managed(tx, userId, id);
      // Repetir la cancelación no cambia nada ni vuelve a avisar.
      if (event.status === EventStatus.CANCELLED) return;
      if (new Date() >= event.endsAt) throw new ConflictException('El evento ya terminó; no se puede cancelar.');
      await tx.event.update({ where: { id }, data: { status: EventStatus.CANCELLED } });
      created = await this.notify(tx, event, userId, EventNoticeKind.CANCELLED, cancelSummary(), `${id}:cancel`);
    });
    if (created) await this.announce(`${id}:cancel`);
    return this.detail(userId, id);
  }

  // ---------- Portada (EV-T09, EV-T10) ----------

  private editableNow(event: { status: EventStatus; startsAt: Date; endsAt: Date }) {
    if (event.status === EventStatus.CANCELLED) throw new ConflictException('El evento se canceló y ya no se puede editar.');
    if (eventPhase(event, new Date()) === 'past') throw new ConflictException('El evento ya terminó y no se puede editar.');
  }

  async replaceCover(userId: string, id: number, file?: EventCoverUpload) {
    if (!file) throw new BadRequestException('Selecciona una foto.');
    const { event, viewer } = await this.visible(userId, id);
    if (!this.canManage(event, viewer)) throw new ForbiddenException('Solo quien creó el evento, si sigue en la comunidad, o una persona administradora puede cambiarlo.');
    this.editableNow(event);
    const path = await this.photos.upload(id, file);
    let previous: string | null;
    try {
      previous = await this.setCover(userId, id, path);
    } catch (error) {
      await this.photos.removeAfterCommit(path);
      throw error;
    }
    if (previous && previous !== path) await this.photos.removeAfterCommit(previous);
    return this.detail(userId, id);
  }

  async removeCover(userId: string, id: number) {
    const previous = await this.setCover(userId, id, null);
    if (previous) await this.photos.removeAfterCommit(previous);
    return this.detail(userId, id);
  }

  private setCover(userId: string, id: number, path: string | null) {
    return serializableTransaction(this.prisma, async tx => {
      const event = await this.managed(tx, userId, id);
      this.editableNow(event);
      await tx.event.update({ where: { id }, data: { coverImagePath: path } });
      return event.coverImagePath;
    });
  }

  async getCover(userId: string, id: number) {
    const { event } = await this.visible(userId, id);
    if (!event.coverImagePath) throw new NotFoundException('La portada no está disponible');
    return this.photos.download(event.coverImagePath);
  }
}
