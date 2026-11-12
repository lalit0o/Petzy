import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { SupabaseService } from '../src/supabase/supabase.service';
import { CommunityModule } from '../src/community/community.module';
import { CommunityPhotoService } from '../src/community/community-photo.service';
import { EventModule } from '../src/event/event.module';
import { EventStartService } from '../src/event/event-start.service';
import { UserModule } from '../src/user/user.module';
import { UserService } from '../src/user/user.service';
import { AvatarService } from '../src/user/avatar.service';
import { ChatRealtimeService } from '../src/chat/chat-realtime.service';
import { ChatSocketAuthService } from '../src/chat/chat-socket-auth.service';

// `jose` es ESM y Jest no lo carga aquí; Chat lo importa para su conexión en vivo.
jest.mock('jose', () => ({ createRemoteJWKSet: jest.fn().mockReturnValue(jest.fn()), jwtVerify: jest.fn() }));

// Eventos dentro de Comunidades (EV-T02–EV-T13; CE-01–CE-10, salvo envío al teléfono).
const describeDatabase = process.env.POST_TEST_DATABASE_URL ? describe : describe.skip;
describeDatabase('Eventos de comunidad (HTTP + PostgreSQL)', () => {
  let app: INestApplication; let db: PrismaService; let starts: EventStartService; let usersService: UserService;
  const prefix = `ev${Date.now()}`;
  const [admin, mod, mod2, member, member2, outsider, expelled, gone] = ['admin', 'mod', 'mod2', 'member', 'member2', 'outsider', 'expelled', 'gone'].map(n => `${prefix}-${n}`);
  const users = [admin, mod, mod2, member, member2, outsider, expelled, gone];
  const communities: number[] = [];
  // Conexión en vivo falsa: se comprueba a quién se avisaría con la app abierta (D-156).
  const realtime = { emitToUser: jest.fn(), isOnline: jest.fn(() => false), attach: jest.fn(), connected: jest.fn(() => true), disconnected: jest.fn(() => true) };
  const liveNotices = (u: string) => realtime.emitToUser.mock.calls.filter(([to, name]) => to === u && name === 'event_notice');
  // Storage falso: se prueba la validación real de la portada sin red.
  const stored = new Map<string, Buffer>();
  const bucket = {
    upload: jest.fn(async (path: string, bytes: Buffer) => { stored.set(path, bytes); return { error: null }; }),
    download: jest.fn(async (path: string) => stored.has(path) ? { data: new Blob([new Uint8Array(stored.get(path)!)]), error: null } : { data: null, error: { message: 'not found' } }),
    remove: jest.fn(async (paths: string[]) => { paths.forEach(p => stored.delete(p)); return { error: null }; }),
  };
  const supabase = { getClient: () => ({ storage: { from: () => bucket, createBucket: jest.fn(async () => ({ error: null })) } }) };
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(20, 1), Buffer.from([0xff, 0xd9])]);

  const call = (m: 'get' | 'post' | 'patch' | 'put' | 'delete', path: string, u = admin) => request(app.getHttpServer())[m](path).set('x-test-user', u);
  const hours = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();
  const draft = (over: Record<string, unknown> = {}) => ({ title: 'Paseo en la playa', description: 'Caminata con perros por la orilla.', placeLabel: 'Playas de Tijuana, junto al faro', latitude: 32.5262, longitude: -117.1232, startsAt: hours(48), endsAt: hours(50), timeZone: 'America/Tijuana', ...over });
  const community = async () => {
    const created = await call('post', '/communities', admin).send({ name: `${prefix} comunidad ${communities.length}`, description: 'Comunidad para probar eventos.', topic: 'Eventos' }).expect(201);
    const id = created.body.id as number; communities.push(id);
    const active = new Set((await db.user.findMany({ where: { id: { in: users }, isActive: true }, select: { id: true } })).map(r => r.id));
    for (const u of [mod, mod2, member, member2, expelled, gone].filter(u => active.has(u))) await call('post', `/communities/${id}/members/me`, u).expect(201);
    for (const u of [mod, mod2]) await call('patch', `/communities/${id}/members/${u}/role`, admin).send({ role: 'MODERATOR' }).expect(200);
    await call('post', `/communities/${id}/expulsions`, admin).send({ userId: expelled }).expect(201);
    return id;
  };
  const event = async (communityId: number, u = admin, over: Record<string, unknown> = {}) => (await call('post', `/communities/${communityId}/events`, u).send(draft(over)).expect(201)).body as { id: number };
  // Mueve el horario en la base para simular el paso del tiempo.
  const shift = (id: number, startsAt: Date, endsAt: Date) => db.event.update({ where: { id }, data: { startsAt, endsAt } });
  const ago = (h: number) => new Date(Date.now() - h * 3600_000);
  // Retrocede todo el reloj de un evento (horario, respuestas e invalidaciones)
  // para simular que ya pasó el tiempo sin alterar el orden real de los hechos.
  const rewind = async (id: number, hoursBack: number) => {
    const secs = hoursBack * 3600;
    await db.$executeRaw`UPDATE "Event" SET "startsAt" = "startsAt" - ${secs}::double precision * interval '1 second', "endsAt" = "endsAt" - ${secs}::double precision * interval '1 second' WHERE id = ${id}`;
    await db.$executeRaw`UPDATE "EventAttendance" SET "respondedAt" = "respondedAt" - ${secs}::double precision * interval '1 second', "invalidatedAt" = "invalidatedAt" - ${secs}::double precision * interval '1 second' WHERE "eventId" = ${id}`;
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.POST_TEST_DATABASE_URL;
    const module = await Test.createTestingModule({ imports: [PrismaModule, CommunityModule, EventModule, UserModule] })
      .overrideProvider(SupabaseService).useValue(supabase)
      .overrideProvider(CommunityPhotoService).useValue({ upload: jest.fn(), download: jest.fn(), removeAfterCommit: jest.fn() })
      .overrideProvider(AvatarService).useValue({ upload: jest.fn(), download: jest.fn(), removeAfterCommit: jest.fn() })
      .overrideProvider(ChatRealtimeService).useValue(realtime)
      .overrideProvider(ChatSocketAuthService).useValue({ verify: jest.fn() })
      .compile();
    app = module.createNestApplication();
    app.use((req: { user?: { id: string }; headers: Record<string, unknown> }, _res: unknown, next: () => void) => { req.user = { id: String(req.headers['x-test-user']) }; next(); });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init(); db = app.get(PrismaService); starts = app.get(EventStartService); usersService = app.get(UserService);
    await db.user.createMany({ data: users.map(id => ({ id, username: id, email: `${id}@example.test`, locatedAt: 'BAJA_CALIFORNIA' })) });
  });
  afterAll(async () => {
    if (db) {
      const ids = (await db.community.findMany({ where: { id: { in: communities } }, select: { id: true } })).map(r => r.id);
      await db.eventNotice.deleteMany({ where: { event: { communityId: { in: ids } } } });
      await db.eventAttendance.deleteMany({ where: { event: { communityId: { in: ids } } } });
      await db.event.deleteMany({ where: { communityId: { in: ids } } });
      await db.communityExpulsion.deleteMany({ where: { communityId: { in: ids } } });
      await db.communityMember.deleteMany({ where: { communityId: { in: ids } } });
      await db.community.deleteMany({ where: { id: { in: ids } } });
      await db.user.deleteMany({ where: { id: { in: users } } });
      await db.$disconnect();
    }
    await app?.close();
  });

  it('CE-01/CE-04: solo ADMIN y MODERATOR crean, con datos válidos y sin filas parciales', async () => {
    const c = await community();
    const created = await call('post', `/communities/${c}/events`, admin).send(draft()).expect(201);
    expect(created.body).toMatchObject({ communityId: c, phase: 'upcoming', status: 'PUBLISHED', goingCount: 0, canEdit: true, canEditStart: true, canCancel: true, creator: { id: admin } });
    expect(created.body.latitude).toBeCloseTo(32.5262); expect(created.body).not.toHaveProperty('coverImagePath');
    await call('post', `/communities/${c}/events`, mod).send(draft()).expect(201);
    await call('post', `/communities/${c}/events`, member).send(draft()).expect(403);
    await call('post', `/communities/${c}/events`, outsider).send(draft()).expect(403);
    await call('post', `/communities/${c}/events`, expelled).send(draft()).expect(404);
    await call('post', `/communities/${c}/events`, admin).send({ ...draft(), creatorId: member }).expect(400);
    const before = await db.event.count({ where: { communityId: c } });
    for (const bad of [{ title: '   ' }, { title: 'x'.repeat(121) }, { description: 'x'.repeat(3001) }, { placeLabel: '' }, { placeLabel: 'x'.repeat(201) },
      { startsAt: hours(-1) }, { endsAt: hours(47) }, { endsAt: hours(48) }, { timeZone: 'Marte/Olympus' }, { latitude: 91 }, { longitude: -181 }, { latitude: 'abc' }, { startsAt: 'mañana' }]) {
      await call('post', `/communities/${c}/events`, admin).send(draft(bad)).expect(400);
    }
    expect(await db.event.count({ where: { communityId: c } })).toBe(before);
    // Puede terminar al día siguiente (D-107).
    await call('post', `/communities/${c}/events`, admin).send(draft({ startsAt: hours(30), endsAt: hours(40) })).expect(201);
    // Portada inválida: no se crea nada.
    await call('post', `/communities/${c}/events`, admin).field('title', 'Con foto falsa').field('description', 'd').field('placeLabel', 'p').field('latitude', '32.5').field('longitude', '-117').field('startsAt', hours(24)).field('endsAt', hours(26)).field('timeZone', 'America/Tijuana')
      .attach('photo', Buffer.from('no soy imagen'), { filename: 'x.jpg', contentType: 'image/jpeg' }).expect(400);
    expect(await db.event.count({ where: { title: 'Con foto falsa' } })).toBe(0);
  });

  it('CE-02/CE-03/CE-10/D-118: separa por comunidad y por sección, pagina estable y oculta a expulsados', async () => {
    const a = await community(); const b = await community();
    const upcoming = await event(a); await event(b);
    const ongoing = await event(a); await shift(ongoing.id, ago(1), new Date(Date.now() + 3600_000));
    const past = await event(a); await shift(past.id, ago(5), ago(3));
    const cancelled = await event(a); await call('post', `/events/${cancelled.id}/cancel`, admin).send({}).expect(200);
    const ids = async (section: string, u = outsider) => (await call('get', `/communities/${a}/events?section=${section}`, u).expect(200)).body.items.map((i: { id: number }) => i.id);
    expect(await ids('upcoming')).toEqual([upcoming.id]);
    expect(await ids('ongoing')).toEqual([ongoing.id]);
    expect((await ids('past')).sort()).toEqual([past.id, cancelled.id].sort());
    const pastItems = (await call('get', `/communities/${a}/events?section=past`, outsider).expect(200)).body.items;
    expect(pastItems.find((i: { id: number }) => i.id === cancelled.id)).toMatchObject({ status: 'CANCELLED', goingCount: null });
    // No miembro lee sin poder responder; expulsado no ve nada.
    const preview = (await call('get', `/events/${upcoming.id}`, outsider).expect(200)).body;
    expect(preview).toMatchObject({ isMember: false, canRespond: false, canEdit: false, description: expect.any(String) });
    await call('get', `/communities/${a}/events?section=upcoming`, expelled).expect(404);
    await call('get', `/events/${upcoming.id}`, expelled).expect(404);
    await call('get', '/events/999999999', member).expect(404);
    await call('get', `/communities/${a}/events?section=todos`, member).expect(400);
    await call('get', `/communities/${a}/events?section=upcoming&limit=31`, member).expect(400);
    // Paginación de más de 30 con horarios idénticos.
    const same = new Date(Date.now() + 72 * 3600_000);
    await db.event.createMany({ data: Array.from({ length: 32 }, (_, i) => ({ communityId: b, creatorId: admin, title: `Lote ${i}`, description: 'd', placeLabel: 'p', latitude: 1, longitude: 1, startsAt: same, endsAt: new Date(same.getTime() + 3600_000), timeZone: 'UTC' })) });
    const first = (await call('get', `/communities/${b}/events?section=upcoming`, member).expect(200)).body;
    const second = (await call('get', `/communities/${b}/events?section=upcoming&cursor=${first.nextCursor}`, member).expect(200)).body;
    expect(first.items).toHaveLength(20); expect(second.items).toHaveLength(13); expect(second.nextCursor).toBeNull();
    expect(new Set([...first.items, ...second.items].map((i: { id: number }) => i.id)).size).toBe(33);
    await call('get', `/communities/${a}/events?section=upcoming&cursor=${first.items[0].id}`, member).expect(400);
  });

  it('CE-05/CE-06: una respuesta vigente por persona, solo miembros y solo antes del inicio', async () => {
    const c = await community(); const e = await event(c);
    const going = await call('put', `/events/${e.id}/attendance`, member).send({ response: 'GOING' }).expect(200);
    expect(going.body).toMatchObject({ myResponse: 'GOING', goingCount: 1 });
    expect((await call('put', `/events/${e.id}/attendance`, member).send({ response: 'NOT_GOING' }).expect(200)).body).toMatchObject({ myResponse: 'NOT_GOING', goingCount: 0 });
    await Promise.all([1, 2, 3].map(() => call('put', `/events/${e.id}/attendance`, member2).send({ response: 'GOING' })));
    expect(await db.eventAttendance.count({ where: { eventId: e.id, userId: member2 } })).toBe(1);
    expect((await call('get', `/events/${e.id}`, outsider).expect(200)).body.goingCount).toBe(1);
    await call('put', `/events/${e.id}/attendance`, outsider).send({ response: 'GOING' }).expect(403);
    await call('put', `/events/${e.id}/attendance`, expelled).send({ response: 'GOING' }).expect(404);
    await call('put', `/events/${e.id}/attendance`, member).send({ response: 'MAYBE' }).expect(400);
    const started = await event(c); await call('put', `/events/${started.id}/attendance`, member).send({ response: 'GOING' }).expect(200);
    await shift(started.id, ago(0.01), new Date(Date.now() + 3600_000));
    await call('put', `/events/${started.id}/attendance`, member).send({ response: 'NOT_GOING' }).expect(409);
    const cancelled = await event(c); await call('post', `/events/${cancelled.id}/cancel`, admin).send({}).expect(200);
    await call('put', `/events/${cancelled.id}/attendance`, member).send({ response: 'GOING' }).expect(409);
  });

  it('CE-08/D-109: salir, ser expulsado o desactivar antes del inicio invalida; el total se fija una sola vez', async () => {
    const c = await community(); const e = await event(c);
    for (const u of [member, member2, mod, gone]) await call('put', `/events/${e.id}/attendance`, u).send({ response: 'GOING' }).expect(200);
    expect((await call('get', `/events/${e.id}`, admin).expect(200)).body.goingCount).toBe(4);
    await call('delete', `/communities/${c}/members/me`, member).expect(200);
    await call('post', `/communities/${c}/expulsions`, admin).send({ userId: member2 }).expect(201);
    await usersService.deactivate(gone);
    expect((await call('get', `/events/${e.id}`, admin).expect(200)).body.goingCount).toBe(1);
    // Volver no revive la respuesta: debe confirmar de nuevo.
    await call('post', `/communities/${c}/members/me`, member).expect(201);
    expect((await call('get', `/events/${e.id}`, member).expect(200)).body).toMatchObject({ myResponse: null, goingCount: 1 });
    await call('put', `/events/${e.id}/attendance`, member).send({ response: 'GOING' }).expect(200);
    expect((await call('get', `/events/${e.id}`, admin).expect(200)).body.goingCount).toBe(2);
    expect(await db.eventAttendance.count({ where: { userId: gone, invalidatedAt: null } })).toBe(0);
    // Comienza: el total se fija y no baja si alguien sale después.
    await rewind(e.id, 48.02); // empezó hace poco más de un minuto; termina en ~2 h
    const [a, b] = await Promise.all([starts.freezeDue({ eventId: e.id }), starts.freezeDue({ eventId: e.id })]);
    expect(a + b).toBe(1);
    expect((await call('get', `/events/${e.id}`, admin).expect(200)).body).toMatchObject({ phase: 'ongoing', goingCount: 2, canRespond: false });
    await call('delete', `/communities/${c}/members/me`, mod).expect(200);
    expect((await call('get', `/events/${e.id}`, admin).expect(200)).body.goingCount).toBe(2);
    expect((await db.event.findUnique({ where: { id: e.id } }))!.confirmedCountAtStart).toBe(2);
    // Recuperación al consultar si la tarea programada se retrasó.
    const late = await event(c); await call('put', `/events/${late.id}/attendance`, member).send({ response: 'GOING' }).expect(200);
    await rewind(late.id, 51); // terminó hace una hora y nadie fijó el total
    expect((await call('get', `/communities/${c}/events?section=past`, admin).expect(200)).body.items.find((i: { id: number }) => i.id === late.id)).toMatchObject({ goingCount: 1, myResponse: null });
    expect((await call('get', `/events/${late.id}`, member).expect(200)).body).toMatchObject({ phase: 'past', goingCount: 1, myResponse: 'GOING', canRespond: false });
  });

  it('CE-07: edición según horario, permisos del creador y avisos sin duplicar', async () => {
    const c = await community(); const e = await event(c, mod);
    for (const u of [member, member2, mod]) await call('put', `/events/${e.id}/attendance`, u).send({ response: 'GOING' }).expect(200);
    await call('put', `/events/${e.id}/attendance`, admin).send({ response: 'NOT_GOING' }).expect(200);
    const notices = () => db.eventNotice.count({ where: { eventId: e.id } });
    await call('patch', `/events/${e.id}`, mod).send({ title: 'Paseo corregido', description: 'Nueva descripción.' }).expect(200);
    expect(await notices()).toBe(0);
    await call('patch', `/events/${e.id}`, mod).send({ placeLabel: 'Parque Morelos', latitude: 32.49, longitude: -116.95, requestKey: 'clave-cambio-1' }).expect(200);
    expect(await notices()).toBe(2); // member y member2; quien edita no se avisa a sí mismo
    // Con la app abierta llega un aviso en vivo a cada destinataria, no a quien editó (D-156).
    expect(liveNotices(member).at(-1)?.[2]).toMatchObject({ kind: 'CHANGED', event: { id: e.id } });
    expect(liveNotices(mod)).toHaveLength(0);
    const sent = liveNotices(member).length;
    await call('patch', `/events/${e.id}`, mod).send({ placeLabel: 'Parque Morelos', latitude: 32.49, longitude: -116.95, requestKey: 'clave-cambio-1' }).expect(200);
    expect(await notices()).toBe(2);
    expect(liveNotices(member)).toHaveLength(sent); // el reintento no repite el aviso en vivo
    await call('patch', `/events/${e.id}`, admin).send({ startsAt: hours(60), endsAt: hours(63), requestKey: 'clave-cambio-2' }).expect(200);
    expect(await notices()).toBe(5); // admin cambia: avisa a member, member2 y mod
    await call('patch', `/events/${e.id}`, mod2).send({ title: 'Ajeno' }).expect(403);
    await call('patch', `/events/${e.id}`, member).send({ title: 'Ajeno' }).expect(403);
    await call('patch', `/events/${e.id}`, mod).send({ title: 'x'.repeat(121) }).expect(400);
    await call('patch', `/events/${e.id}`, mod).send({ startsAt: hours(-2) }).expect(400);
    await call('patch', `/events/${e.id}`, mod).send({ endsAt: hours(59) }).expect(400);
    // En curso: no cambia el inicio; sí textos, lugar y fin futuro.
    await shift(e.id, ago(1), new Date(Date.now() + 3600_000));
    const live = (await call('get', `/events/${e.id}`, mod).expect(200)).body;
    expect(live).toMatchObject({ phase: 'ongoing', canEdit: true, canEditStart: false });
    await call('patch', `/events/${e.id}`, mod).send({ startsAt: hours(5) }).expect(409);
    await call('patch', `/events/${e.id}`, mod).send({ startsAt: live.startsAt, title: 'Sigue igual el inicio' }).expect(200);
    await call('patch', `/events/${e.id}`, mod).send({ endsAt: hours(-0.5) }).expect(400);
    await call('patch', `/events/${e.id}`, mod).send({ endsAt: hours(4), requestKey: 'clave-cambio-3' }).expect(200);
    // El creador que salió pierde la gestión aunque conozca el ID.
    await call('delete', `/communities/${c}/members/me`, mod).expect(200);
    await call('patch', `/events/${e.id}`, mod).send({ title: 'Ya no' }).expect(403);
    await call('patch', `/events/${e.id}`, admin).send({ title: 'Admin sí' }).expect(200);
    await shift(e.id, ago(5), ago(1));
    await call('patch', `/events/${e.id}`, admin).send({ title: 'Terminado' }).expect(409);
  });

  it('CE-07/CE-09/D-103: cancelar conserva historial, oculta el total y no repite avisos', async () => {
    const c = await community(); const e = await event(c, mod);
    for (const u of [member, member2]) await call('put', `/events/${e.id}/attendance`, u).send({ response: 'GOING' }).expect(200);
    await call('post', `/events/${e.id}/cancel`, member).send({}).expect(403);
    await call('post', `/events/${e.id}/cancel`, mod2).send({}).expect(403);
    const done = (await call('post', `/events/${e.id}/cancel`, admin).send({}).expect(200)).body;
    expect(done).toMatchObject({ status: 'CANCELLED', phase: 'past', goingCount: null, canEdit: false, canCancel: false, canRespond: false });
    await call('post', `/events/${e.id}/cancel`, admin).send({}).expect(200);
    expect(await db.eventNotice.count({ where: { eventId: e.id, kind: 'CANCELLED' } })).toBe(2);
    expect(await db.eventAttendance.count({ where: { eventId: e.id } })).toBe(2);
    await call('patch', `/events/${e.id}`, admin).send({ title: 'Reabrir' }).expect(409);
    expect((await call('get', `/events/${e.id}`, member).expect(200)).body).toMatchObject({ myResponse: 'GOING', goingCount: null });
    // En curso sí se puede cancelar; después del fin, no.
    const ongoing = await event(c); await shift(ongoing.id, ago(1), new Date(Date.now() + 3600_000));
    await call('post', `/events/${ongoing.id}/cancel`, admin).send({}).expect(200);
    const ended = await event(c); await shift(ended.id, ago(3), ago(1));
    await call('post', `/events/${ended.id}/cancel`, admin).send({}).expect(409);
  });

  it('EV-T11: cada persona lee y marca solo sus avisos; expulsada no los ve', async () => {
    const c = await community(); const e = await event(c);
    for (const u of [member, member2]) await call('put', `/events/${e.id}/attendance`, u).send({ response: 'GOING' }).expect(200);
    await call('post', `/events/${e.id}/cancel`, admin).send({}).expect(200);
    const mine = (await call('get', '/me/event-notices', member).expect(200)).body;
    const own = mine.items.find((n: { event: { id: number } }) => n.event.id === e.id);
    expect(own).toMatchObject({ kind: 'CANCELLED', readAt: null, summary: 'Cancelado', event: { title: 'Paseo en la playa' } });
    expect(mine.unreadCount).toBeGreaterThanOrEqual(1);
    const theirs = (await call('get', '/me/event-notices', member2).expect(200)).body.items.find((n: { event: { id: number } }) => n.event.id === e.id);
    await call('patch', `/me/event-notices/${theirs.id}/read`, member).expect(404);
    expect((await call('patch', `/me/event-notices/${own.id}/read`, member).expect(200)).body.readAt).toBeTruthy();
    await call('post', `/communities/${c}/expulsions`, admin).send({ userId: member2 }).expect(201);
    expect((await call('get', '/me/event-notices', member2).expect(200)).body.items.some((n: { event: { id: number } }) => n.event.id === e.id)).toBe(false);
    await call('get', '/me/event-notices?limit=31', member).expect(400);
  });

  it('EV-T09/EV-T10: portada privada con permiso vigente', async () => {
    const c = await community();
    const created = await call('post', `/communities/${c}/events`, admin).field('title', 'Con portada').field('description', 'd').field('placeLabel', 'p').field('latitude', '32.5').field('longitude', '-117').field('startsAt', hours(24)).field('endsAt', hours(26)).field('timeZone', 'America/Tijuana')
      .attach('photo', jpeg, { filename: 'f.jpg', contentType: 'image/jpeg' }).expect(201);
    const id = created.body.id as number;
    expect(created.body.coverPath).toBe(`/events/${id}/cover`);
    const cover = await call('get', `/events/${id}/cover`, outsider).expect(200);
    expect(cover.headers['cache-control']).toContain('no-store');
    await call('get', `/events/${id}/cover`, expelled).expect(404);
    await call('put', `/events/${id}/cover`, member).attach('photo', jpeg, { filename: 'f.jpg', contentType: 'image/jpeg' }).expect(403);
    await call('put', `/events/${id}/cover`, admin).attach('photo', Buffer.from('falsa'), { filename: 'f.jpg', contentType: 'image/jpeg' }).expect(400);
    const path = (await db.event.findUnique({ where: { id } }))!.coverImagePath;
    await call('put', `/events/${id}/cover`, admin).attach('photo', jpeg, { filename: 'g.jpg', contentType: 'image/jpeg' }).expect(200);
    expect(stored.has(path!)).toBe(false);
    expect((await call('delete', `/events/${id}/cover`, admin).expect(200)).body.coverPath).toBeNull();
    await call('get', `/events/${id}/cover`, admin).expect(404);
  });

  it('D-144: al eliminarse la comunidad por salida del único integrante, sus eventos se van con ella', async () => {
    const created = await call('post', '/communities', outsider).send({ name: `${prefix} sola`, description: 'Comunidad de una sola persona.', topic: 'Eventos' }).expect(201);
    communities.push(created.body.id);
    const e = await event(created.body.id, outsider);
    await call('put', `/events/${e.id}/attendance`, outsider).send({ response: 'GOING' }).expect(200);
    expect((await call('delete', `/communities/${created.body.id}/members/me`, outsider).expect(200)).body.communityDeleted).toBe(true);
    expect(await db.event.count({ where: { id: e.id } })).toBe(0);
  });

  // EV-T14 (volumen): 1 000 «Iré» sintéticos, sin datos reales. Un cambio de
  // lugar debe crear un aviso por persona con dos consultas fijas (leer
  // destinatarios e insertar en lote), no una por destinataria.
  it('EV-T14: 1 000 «Iré» generan un aviso por persona en lote y rápido', async () => {
    const c = await community(); const e = await event(c);
    const crowd = Array.from({ length: 1000 }, (_, i) => `${prefix}-v${i}`);
    users.push(...crowd);
    await db.user.createMany({ data: crowd.map(id => ({ id, username: id, email: `${id}@example.test`, locatedAt: 'BAJA_CALIFORNIA' })) });
    await db.communityMember.createMany({ data: crowd.map(userId => ({ userId, communityId: c, role: 'MEMBER' as const })) });
    await db.eventAttendance.createMany({ data: crowd.map(userId => ({ eventId: e.id, userId, status: 'GOING' as const, respondedAt: new Date() })) });
    const before = realtime.emitToUser.mock.calls.length;
    const started = Date.now();
    await call('patch', `/events/${e.id}`, admin).send({ placeLabel: 'Estadio Caliente', latitude: 32.5, longitude: -117.0, requestKey: 'clave-volumen' }).expect(200);
    const elapsed = Date.now() - started;
    const rows = await db.eventNotice.count({ where: { eventId: e.id } });
    const distinct = await db.eventNotice.groupBy({ by: ['recipientId'], where: { eventId: e.id } });
    // La bandeja de cada persona usa el índice (recipientId, createdAt, id).
    const plan = await db.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(`EXPLAIN SELECT id FROM "EventNotice" WHERE "recipientId" = '${crowd[0]}' ORDER BY "createdAt" DESC, id DESC LIMIT 21`);
    console.log(`EV-T14 volumen: ${rows} avisos en ${elapsed} ms; ${realtime.emitToUser.mock.calls.length - before} avisos en vivo; plan: ${plan.map(r => r['QUERY PLAN']).join(' | ')}`);
    expect(rows).toBe(1000);
    expect(distinct).toHaveLength(1000);
    expect(realtime.emitToUser.mock.calls.length - before).toBe(1000);
    expect(elapsed).toBeLessThan(5000);
    await call('patch', `/events/${e.id}`, admin).send({ placeLabel: 'Estadio Caliente', latitude: 32.5, longitude: -117.0, requestKey: 'clave-volumen' }).expect(200);
    expect(await db.eventNotice.count({ where: { eventId: e.id } })).toBe(1000);
  }, 60000);
});
