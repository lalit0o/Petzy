import { INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { io, type Socket } from 'socket.io-client';
import type { AddressInfo } from 'node:net';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ChatModule } from '../src/chat/chat.module';
import { ChatSocketAuthService } from '../src/chat/chat-socket-auth.service';
import { SupabaseService } from '../src/supabase/supabase.service';

// `jose` es un módulo ESM que Jest no carga aquí; la verificación del token se
// sustituye abajo por un verificador de prueba, igual que en las otras suites.
jest.mock('jose', () => ({ createRemoteJWKSet: jest.fn().mockReturnValue(jest.fn()), jwtVerify: jest.fn() }));

// Chat privado (CH-T02–CH-T10; CH-01–CH-09, CH-12–CH-13, CH-15; D-145–D-149).
const describeDatabase = process.env.POST_TEST_DATABASE_URL ? describe : describe.skip;
describeDatabase('Chat privado (HTTP + PostgreSQL)', () => {
  let app: INestApplication; let db: PrismaService;
  const prefix = `ch${Date.now()}`;
  const [ana, luis, sara, tercero, inactiva, eva, rob, ivan] = ['ana', 'luis', 'sara', 'tercero', 'inactiva', 'eva', 'rob', 'ivan'].map(n => `${prefix}-${n}`);
  const users = [ana, luis, sara, tercero, inactiva, eva, rob, ivan];
  let url = '';
  const sockets: Socket[] = [];
  // Conexión en vivo con un token de prueba «ok:<persona>»; la verificación real
  // del token y la sesión es la misma del guard y está probada en sus pruebas.
  const connect = (user: string, token = `ok:${user}`) => new Promise<Socket>((resolve, reject) => {
    const socket = io(`${url}/chat`, { auth: { token }, transports: ['websocket'], forceNew: true, reconnection: false });
    sockets.push(socket);
    socket.once('ready', () => resolve(socket));
    socket.once('auth_error', (e: { message: string }) => reject(new Error(e.message)));
    socket.once('connect_error', reject);
  });
  const nextEvent = <T,>(socket: Socket, event: string) => new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`No llegó «${event}»`)), 3000);
    socket.once(event, (payload: T) => { clearTimeout(timer); resolve(payload); });
  });
  const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  let keyCount = 0;
  const key = () => `k${prefix}-${++keyCount}`;
  const call = (m: 'get' | 'post' | 'delete', path: string, u: string) => request(app.getHttpServer())[m](path).set('x-test-user', u);
  const open = async (u: string, other: string) => (await call('post', '/conversations', u).send({ userId: other }).expect(200)).body as { id: number };
  const send = async (u: string, id: number, body: string, clientKey = key()) => (await call('post', `/conversations/${id}/messages`, u).send({ body, clientKey }).expect(201)).body as { id: number };
  const inboxIds = async (u: string) => ((await call('get', '/conversations', u).expect(200)).body.items as { id: number }[]).map(i => i.id);

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.POST_TEST_DATABASE_URL;
    const module = await Test.createTestingModule({ imports: [PrismaModule, ChatModule] })
      .overrideProvider(SupabaseService).useValue({})
      .overrideProvider(ChatSocketAuthService).useValue({ verify: async (token: string) => { if (token.startsWith('ok:')) return token.slice(3); throw new UnauthorizedException('Token inválido o expirado'); } })
      .compile();
    app = module.createNestApplication();
    app.use((req: { user?: { id: string }; headers: Record<string, unknown> }, _res: unknown, next: () => void) => { req.user = { id: String(req.headers['x-test-user']) }; next(); });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.listen(0); db = app.get(PrismaService);
    url = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
    await db.user.createMany({ data: users.map(id => ({ id, username: id, email: `${id}@example.test`, locatedAt: 'BAJA_CALIFORNIA', isActive: id !== inactiva })) });
  });
  afterAll(async () => {
    sockets.forEach(s => s.disconnect());
    if (db) {
      const conversations = (await db.conversation.findMany({ where: { OR: [{ userAId: { in: users } }, { userBId: { in: users } }] }, select: { id: true } })).map(c => c.id);
      await db.chatReportMessage.deleteMany({ where: { report: { conversationId: { in: conversations } } } });
      await db.chatReport.deleteMany({ where: { conversationId: { in: conversations } } });
      await db.message.deleteMany({ where: { conversationId: { in: conversations } } });
      await db.conversationParticipant.deleteMany({ where: { conversationId: { in: conversations } } });
      await db.conversation.deleteMany({ where: { id: { in: conversations } } });
      await db.chatBlock.deleteMany({ where: { OR: [{ blockerId: { in: users } }, { blockedId: { in: users } }] } });
      await db.user.deleteMany({ where: { id: { in: users } } });
      await db.$disconnect();
    }
    await app?.close();
  });

  it('abre una sola conversación por pareja, en cualquier orden y aunque se pida a la vez (CH-01, CH-05)', async () => {
    const first = await open(ana, luis);
    expect((await open(luis, ana)).id).toBe(first.id);
    const parallel = await Promise.all([open(sara, ana), open(ana, sara), open(sara, ana)]);
    expect(new Set(parallel.map(c => c.id)).size).toBe(1);
    expect(await db.conversation.count({ where: { OR: [{ userAId: ana, userBId: sara }, { userAId: sara, userBId: ana }] } })).toBe(1);
    await call('post', '/conversations', ana).send({ userId: ana }).expect(400);
    await call('post', '/conversations', ana).send({ userId: inactiva }).expect(404);
    await call('post', '/conversations', ana).send({ userId: `${prefix}-nadie` }).expect(404);
  });

  it('solo las dos personas leen o escriben; un tercero recibe lo mismo que si no existiera (CH-02)', async () => {
    const { id } = await open(ana, luis);
    await send(ana, id, 'Hola Luis');
    await call('get', `/conversations/${id}`, tercero).expect(404);
    await call('get', `/conversations/${id}/messages`, tercero).expect(404);
    await call('post', `/conversations/${id}/messages`, tercero).send({ body: 'intruso', clientKey: key() }).expect(404);
    await call('post', `/conversations/${id}/read`, tercero).send({ messageId: 1 }).expect(404);
    await call('post', `/conversations/${id}/block`, tercero).expect(404);
    await call('post', `/conversations/${id}/reports`, tercero).send({ messageIds: [1], clientKey: key() }).expect(404);
    await call('get', '/conversations/999999999', ana).expect(404);
  });

  it('valida el texto y no duplica un mensaje al reintentar (CH-03, CH-08)', async () => {
    const { id } = await open(ana, luis);
    await call('post', `/conversations/${id}/messages`, ana).send({ body: '', clientKey: key() }).expect(400);
    await call('post', `/conversations/${id}/messages`, ana).send({ body: '    ', clientKey: key() }).expect(400);
    await call('post', `/conversations/${id}/messages`, ana).send({ body: 'x'.repeat(251), clientKey: key() }).expect(400);
    await call('post', `/conversations/${id}/messages`, ana).send({ body: 'sin clave' }).expect(400);
    const exact = await send(ana, id, 'y'.repeat(250));
    expect(exact.id).toBeGreaterThan(0);
    const retryKey = key();
    const original = await send(ana, id, '  ¿Paseamos mañana?  ', retryKey);
    const again = await send(ana, id, '¿Paseamos mañana?', retryKey);
    expect(again.id).toBe(original.id);
    const parallelKey = key();
    const parallel = await Promise.all([1, 2, 3].map(() => call('post', `/conversations/${id}/messages`, ana).send({ body: 'Una sola vez', clientKey: parallelKey })));
    expect(parallel.every(r => r.status === 201)).toBe(true);
    expect(new Set(parallel.map(r => r.body.id)).size).toBe(1);
    expect(await db.message.count({ where: { senderId: ana, clientKey: { in: [retryKey, parallelKey] } } })).toBe(2);
    expect((await db.message.findUnique({ where: { id: original.id } }))?.body).toBe('¿Paseamos mañana?');
    const other = await open(ana, sara);
    await call('post', `/conversations/${other.id}/messages`, ana).send({ body: 'otra', clientKey: retryKey }).expect(409);
  });

  it('pagina el historial sin repetir ni omitir mensajes (CH-04)', async () => {
    const { id } = await open(luis, sara);
    const sent: number[] = [];
    for (let i = 1; i <= 35; i++) sent.push((await send(i % 2 ? luis : sara, id, `Mensaje ${i}`)).id);
    const first = await call('get', `/conversations/${id}/messages?limit=30`, luis).expect(200);
    expect(first.body.items).toHaveLength(30);
    expect(first.body.nextCursor).not.toBeNull();
    const second = await call('get', `/conversations/${id}/messages?limit=30&cursor=${first.body.nextCursor}`, luis).expect(200);
    expect(second.body.nextCursor).toBeNull();
    const ids = [...first.body.items, ...second.body.items].map((m: { id: number }) => m.id);
    expect(ids).toEqual([...sent].reverse());
    expect(first.body.items[0]).toMatchObject({ body: 'Mensaje 35', mine: true });
  });

  it('marca «Leído» solo con mensajes de la otra persona y nunca retrocede (CH-12)', async () => {
    const { id } = await open(ana, luis);
    const m1 = await send(ana, id, 'uno'); const m2 = await send(ana, id, 'dos');
    let history = await call('get', `/conversations/${id}/messages`, ana).expect(200);
    expect(history.body.items.find((m: { id: number }) => m.id === m2.id).read).toBe(false);
    await call('post', `/conversations/${id}/read`, ana).send({ messageId: m2.id }).expect(400);
    await call('post', `/conversations/${id}/read`, luis).send({ messageId: m2.id }).expect(200);
    await call('post', `/conversations/${id}/read`, luis).send({ messageId: m1.id }).expect(200);
    history = await call('get', `/conversations/${id}/messages`, ana).expect(200);
    expect(history.body.items.find((m: { id: number }) => m.id === m1.id).read).toBe(true);
    expect(history.body.items.find((m: { id: number }) => m.id === m2.id).read).toBe(true);
    const own = await call('get', `/conversations/${id}/messages`, luis).expect(200);
    expect(own.body.items.filter((m: { mine: boolean }) => !m.mine).every((m: { read: boolean }) => m.read === false)).toBe(true);
    expect((await call('get', `/conversations/${id}`, luis).expect(200)).body.unreadCount).toBe(0);
  });

  it('bloquea en ambos sentidos, deja leer y solo quien bloqueó lo quita (CH-06, CH-13)', async () => {
    const { id } = await open(ana, luis);
    await send(luis, id, 'Antes del bloqueo');
    const blocked = await call('post', `/conversations/${id}/block`, ana).expect(200);
    expect(blocked.body).toMatchObject({ blockedByMe: true, canSend: false });
    expect((await call('get', `/conversations/${id}`, luis).expect(200)).body).toMatchObject({ blockedByMe: false, canSend: false });
    for (const u of [ana, luis]) {
      const r = await call('post', `/conversations/${id}/messages`, u).send({ body: 'bloqueado', clientKey: key() }).expect(403);
      expect(r.body.code).toBe('CHAT_BLOCKED');
      await call('get', `/conversations/${id}/messages`, u).expect(200);
    }
    await call('delete', `/conversations/${id}/block`, luis).expect(200);
    expect(await db.chatBlock.count({ where: { blockerId: ana, blockedId: luis } })).toBe(1);
    await call('post', `/conversations/${id}/block`, luis).expect(200);
    await call('delete', `/conversations/${id}/block`, ana).expect(200);
    expect((await call('get', `/conversations/${id}`, ana).expect(200)).body).toMatchObject({ blockedByMe: false, canSend: false });
    await call('post', `/conversations/${id}/messages`, ana).send({ body: 'aún no', clientKey: key() }).expect(403);
    await call('delete', `/conversations/${id}/block`, luis).expect(200);
    await send(ana, id, 'Ya podemos hablar');
  });

  it('ocultar saca el chat solo de la bandeja propia y vuelve con un mensaje nuevo (CH-09)', async () => {
    const { id } = await open(ana, luis);
    await send(ana, id, 'Hola otra vez');
    expect(await inboxIds(ana)).toContain(id);
    await call('post', `/conversations/${id}/hide`, ana).expect(200);
    expect(await inboxIds(ana)).not.toContain(id);
    expect(await inboxIds(luis)).toContain(id);
    expect((await call('get', `/conversations/${id}/messages`, ana).expect(200)).body.items.length).toBeGreaterThan(0);
    await send(luis, id, 'Te escribo de nuevo');
    expect(await inboxIds(ana)).toContain(id);
  });

  it('reporta solo mensajes visibles, sin copiar texto y sin duplicar al reintentar (CH-07, D-88, D-146, D-147)', async () => {
    const { id } = await open(ana, luis);
    const bad = await send(luis, id, 'Mensaje ofensivo');
    const reportKey = key();
    const body = { messageIds: [bad.id], note: '  Me insultó.  ', clientKey: reportKey };
    expect((await call('post', `/conversations/${id}/reports`, ana).send(body).expect(201)).body).toEqual({ saved: true });
    await call('post', `/conversations/${id}/reports`, ana).send(body).expect(201);
    const reports = await db.chatReport.findMany({ where: { reporterId: ana, clientKey: reportKey }, include: { messages: true } });
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ reportedUserId: luis, note: 'Me insultó.' });
    expect(reports[0].messages.map(m => m.messageId)).toEqual([bad.id]);
    const other = await open(ana, sara);
    const foreign = await send(sara, other.id, 'De otra conversación');
    await call('post', `/conversations/${id}/reports`, ana).send({ messageIds: [foreign.id], clientKey: key() }).expect(400);
    await call('post', `/conversations/${id}/reports`, ana).send({ messageIds: [], clientKey: key() }).expect(400);
    await call('post', `/conversations/${id}/reports`, ana).send({ messageIds: [bad.id], note: 'x'.repeat(501), clientKey: key() }).expect(400);
    await call('post', `/conversations/${other.id}/reports`, ana).send({ messageIds: [foreign.id], clientKey: reportKey }).expect(409);
    await call('get', `/conversations/${id}/reports`, ana).expect(404);
  });

  it('«Borrar chat para mí» solo cambia la vista propia y conserva los reportes (CH-15, D-82, D-88)', async () => {
    const { id } = await open(ana, luis);
    const before = await send(luis, id, 'Antes de borrar');
    await call('post', `/conversations/${id}/reports`, ana).send({ messageIds: [before.id], clientKey: key() }).expect(201);
    const luisBefore = (await call('get', `/conversations/${id}/messages?limit=30`, luis).expect(200)).body.items.length;
    await call('post', `/conversations/${id}/clear`, ana).expect(200);
    expect((await call('get', `/conversations/${id}/messages`, ana).expect(200)).body.items).toHaveLength(0);
    expect(await inboxIds(ana)).not.toContain(id);
    expect((await call('get', `/conversations/${id}/messages?limit=30`, luis).expect(200)).body.items.length).toBe(luisBefore);
    await call('post', `/conversations/${id}/reports`, ana).send({ messageIds: [before.id], clientKey: key() }).expect(400);
    await call('post', `/conversations/${id}/read`, ana).send({ messageId: before.id }).expect(400);
    expect(await db.message.count({ where: { id: before.id } })).toBe(1);
    expect(await db.chatReportMessage.count({ where: { messageId: before.id } })).toBeGreaterThan(0);
    const after = await send(luis, id, 'Después de borrar');
    expect(await inboxIds(ana)).toContain(id);
    const visible = (await call('get', `/conversations/${id}/messages`, ana).expect(200)).body.items.map((m: { id: number }) => m.id);
    expect(visible).toEqual([after.id]);
  });

  it('oculta los chats de una cuenta desactivada y los devuelve al reactivarla (D-145)', async () => {
    const { id } = await open(sara, tercero);
    await send(sara, id, 'Hola');
    await db.user.update({ where: { id: tercero }, data: { isActive: false } });
    expect(await inboxIds(sara)).not.toContain(id);
    await call('get', `/conversations/${id}`, sara).expect(404);
    await call('post', `/conversations/${id}/messages`, sara).send({ body: 'hola', clientKey: key() }).expect(404);
    await call('post', '/conversations', sara).send({ userId: tercero }).expect(404);
    await db.user.update({ where: { id: tercero }, data: { isActive: true } });
    expect(await inboxIds(sara)).toContain(id);
  });

  it('ordena la bandeja por el último mensaje y pagina sin repetir (CH-03)', async () => {
    const a = await open(tercero, ana); const b = await open(tercero, luis); const c = await open(tercero, sara);
    await send(tercero, a.id, '1'); await send(tercero, b.id, '2'); await send(tercero, c.id, '3'); await send(ana, a.id, '4');
    const first = await call('get', '/conversations?limit=2', tercero).expect(200);
    expect(first.body.items.map((i: { id: number }) => i.id)).toEqual([a.id, c.id]);
    expect(first.body.items[0]).toMatchObject({ unreadCount: 1, lastMessage: { body: '4', mine: false } });
    const second = await call('get', `/conversations?limit=2&cursor=${first.body.nextCursor}`, tercero).expect(200);
    expect(second.body.items.map((i: { id: number }) => i.id)).toEqual([b.id]);
    expect(second.body.nextCursor).toBeNull();
    await call('get', '/conversations?cursor=999999999', tercero).expect(400);
  });

  it('rechaza la conexión en vivo sin un token válido (CH-T10, D-148)', async () => {
    await expect(connect(eva, '')).rejects.toThrow('Token requerido');
    await expect(connect(eva, 'falso')).rejects.toThrow('Token inválido o expirado');
  });

  it('avisa en vivo mensajes y «Leído» solo a las dos personas del chat (CH-T10, CH-02, CH-12)', async () => {
    const { id } = await open(eva, rob);
    const [evaSocket, robSocket, ivanSocket] = await Promise.all([connect(eva), connect(rob), connect(ivan)]);
    const leaked = jest.fn(); ivanSocket.onAny(leaked);
    const toEva = nextEvent<{ conversationId: number; message: { id: number; body: string; mine: boolean } }>(evaSocket, 'message');
    const toRob = nextEvent<{ message: { mine: boolean } }>(robSocket, 'message');
    const sent = await send(rob, id, 'Hola Eva, en vivo');
    expect(await toEva).toMatchObject({ conversationId: id, message: { id: sent.id, body: 'Hola Eva, en vivo', mine: false } });
    expect((await toRob).message.mine).toBe(true);
    const readByEva = nextEvent<{ conversationId: number; lastReadMessageId: number }>(robSocket, 'read');
    await call('post', `/conversations/${id}/read`, eva).send({ messageId: sent.id }).expect(200);
    expect(await readByEva).toEqual({ conversationId: id, lastReadMessageId: sent.id });
    await pause(200);
    expect(leaked).not.toHaveBeenCalled();
    // Cerrar estas conexiones para que la siguiente prueba parta sin nadie «En línea».
    [evaSocket, robSocket, ivanSocket].forEach(socket => socket.disconnect());
    await pause(200);
  });

  it('muestra «En línea» solo entre participantes y lo oculta con cualquier bloqueo (CH-12, D-149)', async () => {
    const { id } = await open(eva, ivan);
    await send(ivan, id, 'Hola');
    const evaSocket = await connect(eva);
    const online = nextEvent<{ conversationId: number; online: boolean }>(evaSocket, 'presence');
    const ivanSocket = await connect(ivan);
    expect(await online).toEqual({ conversationId: id, online: true });
    expect((await call('get', `/conversations/${id}`, eva).expect(200)).body.otherOnline).toBe(true);
    const blockSignal = nextEvent<{ conversationId: number }>(ivanSocket, 'block');
    const hidden = nextEvent<{ online: boolean }>(ivanSocket, 'presence');
    await call('post', `/conversations/${id}/block`, eva).expect(200);
    expect(await blockSignal).toEqual({ conversationId: id });
    expect((await hidden).online).toBe(false);
    expect((await call('get', `/conversations/${id}`, eva).expect(200)).body.otherOnline).toBe(false);
    expect((await call('get', `/conversations/${id}`, ivan).expect(200)).body.otherOnline).toBe(false);
    const shown = nextEvent<{ online: boolean }>(ivanSocket, 'presence');
    await call('delete', `/conversations/${id}/block`, eva).expect(200);
    expect((await shown).online).toBe(true);
    const offline = nextEvent<{ conversationId: number; online: boolean }>(evaSocket, 'presence');
    ivanSocket.disconnect();
    expect(await offline).toEqual({ conversationId: id, online: false });
    expect((await call('get', `/conversations/${id}`, eva).expect(200)).body.otherOnline).toBe(false);
  });
});
