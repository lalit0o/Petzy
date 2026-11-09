import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { blockState, orderedPair, otherParticipant, unreadFloor, visibleAfter } from './chat-rules';
import { ChatRealtimeService } from './chat-realtime.service';
import { ListPageDto, ReportConversationDto, SendMessageDto } from './chat.dto';

const UNAVAILABLE = 'Esta conversación no está disponible.';
const BLOCKED = { code: 'CHAT_BLOCKED', message: 'No puedes enviar mensajes en esta conversación.' };
const userSelect = { id: true, username: true, avatar: true, isActive: true } as const;
type PublicUser = { id: string; username: string; avatar: string | null };
type Tx = Prisma.TransactionClient | PrismaService;
type MessageRow = { id: number; conversationId: number; senderId: string; body: string; createdAt: Date };

function isUniqueViolation(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

// Chat privado uno a uno. La identidad sale siempre del token validado por el
// guard global (sesión, correo confirmado, perfil completo y cuenta activa):
// nadie elige autor ni dueño desde la app (CH-T03).
@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService, private readonly realtime: ChatRealtimeService) {}

  private publicUser(user: PublicUser) {
    return { id: user.id, username: user.username, avatarUrl: user.avatar ? `/users/${user.id}/avatar` : null };
  }

  private publicMessage(message: MessageRow, me: string, otherLastRead: number | null) {
    const mine = message.senderId === me;
    // «Leído» solo para mensajes propios que la otra persona ya vio (D-81).
    return { id: message.id, body: message.body, createdAt: message.createdAt, mine, read: mine && otherLastRead !== null && message.id <= otherLastRead };
  }

  // Solo las dos personas del chat lo abren, y solo si la otra sigue activa
  // (D-145). A un tercero se le responde igual que si no existiera (CH-02).
  private async access(me: string, conversationId: number, db: Tx = this.prisma) {
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      include: { userA: { select: userSelect }, userB: { select: userSelect }, participants: true },
    });
    if (!conversation || (conversation.userAId !== me && conversation.userBId !== me)) throw new NotFoundException(UNAVAILABLE);
    const other = conversation.userAId === me ? conversation.userB : conversation.userA;
    if (!other.isActive) throw new NotFoundException(UNAVAILABLE);
    const mine = conversation.participants.find(p => p.userId === me);
    const theirs = conversation.participants.find(p => p.userId === other.id);
    if (!mine || !theirs) throw new NotFoundException(UNAVAILABLE);
    return { conversation, other, mine, theirs };
  }

  private blocksBetween(a: string, b: string, db: Tx = this.prisma) {
    return db.chatBlock.findMany({ where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] }, select: { blockerId: true } });
  }

  // Bloqueo de fila: enviar y bloquear se ordenan entre sí, así ningún mensaje
  // se guarda después de un bloqueo ya confirmado (D-76).
  private lock(tx: Prisma.TransactionClient, conversationId: number) {
    return tx.$queryRaw`SELECT id FROM "Conversation" WHERE id = ${conversationId} FOR UPDATE`;
  }

  private async summary(me: string, conversationId: number) {
    const { conversation, other, mine, theirs } = await this.access(me, conversationId);
    const [last, unread, blocks] = await Promise.all([
      this.prisma.message.findFirst({ where: { conversationId, id: { gt: visibleAfter(mine.clearedThroughMessageId) } }, orderBy: { id: 'desc' } }),
      this.prisma.message.count({ where: { conversationId, senderId: other.id, id: { gt: unreadFloor(mine.lastReadMessageId, mine.clearedThroughMessageId) } } }),
      this.blocksBetween(me, other.id),
    ]);
    return {
      id: conversation.id,
      otherUser: this.publicUser(other),
      lastMessage: last ? this.publicMessage(last, me, theirs.lastReadMessageId) : null,
      unreadCount: unread,
      hidden: mine.hiddenAt !== null,
      ...blockState(blocks, me),
      // «En línea» solo entre participantes y nunca con un bloqueo de por medio (D-81, D-149).
      otherOnline: blocks.length === 0 && this.realtime.isOnline(other.id),
    };
  }

  // CH-T04 (D-75): abre la conversación existente del par o crea una sola.
  async open(me: string, otherId: string) {
    if (otherId === me) throw new BadRequestException('No puedes iniciar una conversación contigo.');
    const other = await this.prisma.user.findFirst({ where: { id: otherId, isActive: true }, select: { id: true } });
    if (!other) throw new NotFoundException('Esta persona no está disponible.');
    const pair = orderedPair(me, otherId);
    let conversation = await this.prisma.conversation.findUnique({ where: { userAId_userBId: pair }, select: { id: true } });
    if (!conversation) {
      try {
        conversation = await this.prisma.conversation.create({
          data: { ...pair, participants: { create: [{ userId: pair.userAId }, { userId: pair.userBId }] } },
          select: { id: true },
        });
      } catch (error) {
        // Dos aperturas simultáneas: la otra ya creó el chat; se reutiliza.
        if (!isUniqueViolation(error)) throw error;
        conversation = await this.prisma.conversation.findUnique({ where: { userAId_userBId: pair }, select: { id: true } });
        if (!conversation) throw error;
      }
    }
    return this.summary(me, conversation.id);
  }

  detail(me: string, conversationId: number) {
    return this.summary(me, conversationId);
  }

  // CH-T06: bandeja propia. Sin chats ocultos ni vacíos, ni con cuentas
  // desactivadas (D-79, D-145); orden por último mensaje.
  async inbox(me: string, query: ListPageDto) {
    const limit = query.limit ?? 20;
    const where: Prisma.ConversationParticipantWhereInput = {
      userId: me, hiddenAt: null,
      conversation: { lastMessageAt: { not: null }, OR: [{ userAId: me, userB: { isActive: true } }, { userBId: me, userA: { isActive: true } }] },
    };
    if (query.cursor && !await this.prisma.conversationParticipant.findFirst({ where: { ...where, conversationId: query.cursor }, select: { conversationId: true } })) {
      throw new BadRequestException('La página de conversaciones ya no está disponible.');
    }
    const rows = await this.prisma.conversationParticipant.findMany({
      where,
      orderBy: [{ conversation: { lastMessageAt: 'desc' } }, { conversationId: 'desc' }],
      take: limit + 1,
      ...(query.cursor ? { cursor: { conversationId_userId: { conversationId: query.cursor, userId: me } }, skip: 1 } : {}),
      select: { conversationId: true },
    });
    const page = rows.slice(0, limit);
    const items: Awaited<ReturnType<ChatService['summary']>>[] = [];
    for (const row of page) {
      try { items.push(await this.summary(me, row.conversationId)); }
      catch (error) { if (!(error instanceof NotFoundException)) throw error; }
    }
    return { items, nextCursor: rows.length > limit ? page.at(-1)?.conversationId ?? null : null };
  }

  // CH-T06: historial de lo más reciente a lo más antiguo, sin lo que la
  // persona borró de su vista (D-82). El bloqueo no impide leer (D-76).
  async messages(me: string, conversationId: number, query: ListPageDto) {
    const { mine, theirs } = await this.access(me, conversationId);
    const limit = query.limit ?? 30;
    const rows = await this.prisma.message.findMany({
      where: { conversationId, id: { gt: visibleAfter(mine.clearedThroughMessageId), ...(query.cursor ? { lt: query.cursor } : {}) } },
      orderBy: { id: 'desc' },
      take: limit + 1,
    });
    const page = rows.slice(0, limit);
    return {
      items: page.map(m => this.publicMessage(m, me, theirs.lastReadMessageId)),
      nextCursor: rows.length > limit ? page.at(-1)?.id ?? null : null,
    };
  }

  // CH-T05: un participante habilitado envía; el reintento con la misma clave
  // devuelve el mensaje ya guardado en vez de crear otro.
  async send(me: string, conversationId: number, dto: SendMessageDto) {
    const saved = async () => {
      const existing = await this.prisma.message.findUnique({ where: { senderId_clientKey: { senderId: me, clientKey: dto.clientKey } } });
      if (!existing) return null;
      if (existing.conversationId !== conversationId) throw new ConflictException('La clave del mensaje ya se usó en otra conversación.');
      const { theirs } = await this.access(me, conversationId);
      return this.publicMessage(existing, me, theirs.lastReadMessageId);
    };
    const repeated = await saved();
    if (repeated) return repeated;
    try {
      const message = await this.prisma.$transaction(async tx => {
        await this.lock(tx, conversationId);
        const { other } = await this.access(me, conversationId, tx);
        if ((await this.blocksBetween(me, other.id, tx)).length) throw new ForbiddenException(BLOCKED);
        const created = await tx.message.create({ data: { conversationId, senderId: me, body: dto.body, clientKey: dto.clientKey } });
        await tx.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: created.createdAt } });
        // Un mensaje nuevo devuelve el chat a ambas bandejas (D-79, CH-09).
        await tx.conversationParticipant.updateMany({ where: { conversationId }, data: { hiddenAt: null } });
        return { created, recipientId: other.id };
      });
      // Aviso en vivo a la destinataria y a las otras sesiones de quien envía (CH-T10).
      this.realtime.emitToUser(message.recipientId, 'message', { conversationId, message: this.publicMessage(message.created, message.recipientId, null) });
      this.realtime.emitToUser(me, 'message', { conversationId, message: this.publicMessage(message.created, me, null) });
      return this.publicMessage(message.created, me, null);
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      // Reintento simultáneo: el primero ya guardó el mensaje.
      const again = await saved();
      if (again) return again;
      throw error;
    }
  }

  // CH-T06 (D-81): «Leído» avanza solo hasta un mensaje de la otra persona que
  // la destinataria todavía ve; nunca retrocede.
  async markRead(me: string, conversationId: number, messageId: number) {
    const { other, mine } = await this.access(me, conversationId);
    const message = await this.prisma.message.findFirst({ where: { conversationId, senderId: other.id, id: { equals: messageId, gt: visibleAfter(mine.clearedThroughMessageId) } }, select: { id: true } });
    if (!message) throw new BadRequestException('Ese mensaje no se puede marcar como leído.');
    await this.prisma.conversationParticipant.updateMany({
      where: { conversationId, userId: me, OR: [{ lastReadMessageId: null }, { lastReadMessageId: { lt: messageId } }] },
      data: { lastReadMessageId: messageId },
    });
    const lastReadMessageId = Math.max(messageId, mine.lastReadMessageId ?? 0);
    this.realtime.emitToUser(other.id, 'read', { conversationId, lastReadMessageId });
    return { lastReadMessageId };
  }

  // CH-T07 (D-76): cada quien pone y quita solo su propio bloqueo.
  async block(me: string, conversationId: number) {
    const otherId = await this.prisma.$transaction(async tx => {
      await this.lock(tx, conversationId);
      const { other } = await this.access(me, conversationId, tx);
      await tx.chatBlock.upsert({ where: { blockerId_blockedId: { blockerId: me, blockedId: other.id } }, create: { blockerId: me, blockedId: other.id }, update: {} });
      return other.id;
    });
    await this.blockChanged(me, otherId, conversationId);
    return this.summary(me, conversationId);
  }

  async unblock(me: string, conversationId: number) {
    const { other } = await this.access(me, conversationId);
    await this.prisma.chatBlock.deleteMany({ where: { blockerId: me, blockedId: other.id } });
    await this.blockChanged(me, other.id, conversationId);
    return this.summary(me, conversationId);
  }

  // La otra persona actualiza si puede enviar, sin saber quién bloqueó (D-81);
  // la presencia se oculta o vuelve a mostrarse según queden bloqueos (D-149).
  private async blockChanged(me: string, otherId: string, conversationId: number) {
    const blocked = (await this.blocksBetween(me, otherId)).length > 0;
    this.realtime.emitToUser(otherId, 'block', { conversationId });
    this.realtime.emitToUser(otherId, 'presence', { conversationId, online: !blocked && this.realtime.isOnline(me) });
    this.realtime.emitToUser(me, 'presence', { conversationId, online: !blocked && this.realtime.isOnline(otherId) });
  }

  // CH-T10 (D-81, D-149): avisa «En línea» o «desconectada» solo a quienes ya
  // tienen un chat con esta persona, con cuenta activa y sin bloqueo.
  async announcePresence(userId: string, online: boolean) {
    const conversations = await this.prisma.conversation.findMany({
      where: { OR: [{ userAId: userId, userB: { isActive: true } }, { userBId: userId, userA: { isActive: true } }] },
      select: { id: true, userAId: true, userBId: true },
    });
    if (!conversations.length) return;
    const partners = conversations.map(c => otherParticipant(c, userId));
    const blocks = await this.prisma.chatBlock.findMany({
      where: { OR: [{ blockerId: userId, blockedId: { in: partners } }, { blockedId: userId, blockerId: { in: partners } }] },
      select: { blockerId: true, blockedId: true },
    });
    const blocked = new Set(blocks.map(b => b.blockerId === userId ? b.blockedId : b.blockerId));
    for (const conversation of conversations) {
      const partner = otherParticipant(conversation, userId);
      if (!blocked.has(partner)) this.realtime.emitToUser(partner, 'presence', { conversationId: conversation.id, online });
    }
  }

  // CH-T08 (D-79): saca el chat solo de la bandeja propia, sin borrar nada.
  async hide(me: string, conversationId: number) {
    await this.access(me, conversationId);
    await this.prisma.conversationParticipant.update({ where: { conversationId_userId: { conversationId, userId: me } }, data: { hiddenAt: new Date() } });
    return { hidden: true };
  }

  // CH-T08 (D-82): los mensajes anteriores dejan de verse para siempre solo
  // para quien lo pide. No se borra ningún mensaje: la otra persona y los
  // reportes ya guardados los conservan (D-88).
  async clear(me: string, conversationId: number) {
    await this.prisma.$transaction(async tx => {
      await this.lock(tx, conversationId);
      await this.access(me, conversationId, tx);
      const last = await tx.message.findFirst({ where: { conversationId }, orderBy: { id: 'desc' }, select: { id: true } });
      await tx.conversationParticipant.update({
        where: { conversationId_userId: { conversationId, userId: me } },
        data: { hiddenAt: new Date(), ...(last ? { clearedThroughMessageId: last.id } : {}) },
      });
    });
    return { cleared: true };
  }

  // CH-T09 (D-77, D-87, D-88): solo un participante reporta, y solo mensajes de
  // ese chat que todavía ve. Reporte y referencias se guardan juntos o nada.
  // La respuesta solo confirma el guardado: no hay revisión ni sanción en el MVP.
  async report(me: string, conversationId: number, dto: ReportConversationDto) {
    const saved = async () => {
      const existing = await this.prisma.chatReport.findUnique({ where: { reporterId_clientKey: { reporterId: me, clientKey: dto.clientKey } }, select: { conversationId: true } });
      if (!existing) return null;
      if (existing.conversationId !== conversationId) throw new ConflictException('La clave del reporte ya se usó en otra conversación.');
      return { saved: true };
    };
    const repeated = await saved();
    if (repeated) return repeated;
    const { other, mine } = await this.access(me, conversationId);
    const found = await this.prisma.message.count({ where: { conversationId, id: { in: dto.messageIds, gt: visibleAfter(mine.clearedThroughMessageId) } } });
    if (found !== dto.messageIds.length) throw new BadRequestException('Elige solo mensajes de esta conversación que todavía puedas ver.');
    try {
      await this.prisma.chatReport.create({
        data: {
          conversationId, reporterId: me, reportedUserId: other.id, note: dto.note ?? null, clientKey: dto.clientKey,
          messages: { create: dto.messageIds.map(messageId => ({ messageId })) },
        },
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const again = await saved();
      if (again) return again;
      throw error;
    }
    return { saved: true };
  }
}
