import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AdoptionModule } from '../src/adoption/adoption.module';
import { SupabaseService } from '../src/supabase/supabase.service';
import { ChatSocketAuthService } from '../src/chat/chat-socket-auth.service';

jest.mock('jose', () => ({ createRemoteJWKSet: jest.fn().mockReturnValue(jest.fn()), jwtVerify: jest.fn() }));

// Adopción (AD-T02–AD-T11; AD-01–AD-09; D-89–D-98).
const describeDatabase = process.env.POST_TEST_DATABASE_URL ? describe : describe.skip;
describeDatabase('Adopción (HTTP + PostgreSQL)', () => {
  let app: INestApplication; let db: PrismaService;
  const prefix = `ad${Date.now()}`;
  const [ana, luis, sara, inactiva] = ['ana', 'luis', 'sara', 'inactiva'].map(n => `${prefix}-${n}`);
  const users = [ana, luis, sara, inactiva];
  // Storage falso: se prueba la validación real de las fotos sin red.
  const stored = new Map<string, Buffer>();
  const bucket = {
    upload: jest.fn(async (path: string, bytes: Buffer): Promise<{ error: { message: string } | null }> => { stored.set(path, bytes); return { error: null }; }),
    download: jest.fn(async (path: string) => stored.has(path) ? { data: new Blob([new Uint8Array(stored.get(path)!)]), error: null } : { data: null, error: { message: 'not found' } }),
    remove: jest.fn(async (paths: string[]) => { paths.forEach(p => stored.delete(p)); return { error: null }; }),
  };
  const supabase = { getClient: () => ({ storage: { from: () => bucket, createBucket: jest.fn(async () => ({ error: null })) } }) };
  const jpeg = (n = 1) => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(20, n), Buffer.from([0xff, 0xd9])]);
  let petAna = 0; let petLuis = 0; let petOff = 0;

  const call = (m: 'get' | 'post' | 'patch' | 'delete', path: string, u: string) => request(app.getHttpServer())[m](path).set('x-test-user', u);
  const create = (u: string, fields: Record<string, string> = {}, photos = 1) => {
    let r = call('post', '/adoptions', u).field('title', 'Michi busca hogar').field('description', 'Gatita de 2 años, muy cariñosa.').field('acceptNoSale', 'true');
    for (const [k, v] of Object.entries(fields)) r = r.field(k, v);
    for (let i = 0; i < photos; i++) r = r.attach('photos', jpeg(i + 1), { filename: `f${i}.jpg`, contentType: 'image/jpeg' });
    return r;
  };
  const listing = async (u = ana, fields: Record<string, string> = {}) => (await create(u, fields).expect(201)).body as { id: number; photos: { id: number; url: string }[] };

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.POST_TEST_DATABASE_URL;
    const module = await Test.createTestingModule({ imports: [PrismaModule, AdoptionModule] })
      .overrideProvider(SupabaseService).useValue(supabase)
      .overrideProvider(ChatSocketAuthService).useValue({ verify: jest.fn() })
      .compile();
    app = module.createNestApplication();
    app.use((req: { user?: { id: string }; headers: Record<string, unknown> }, _res: unknown, next: () => void) => { req.user = { id: String(req.headers['x-test-user']) }; next(); });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init(); db = app.get(PrismaService);
    await db.user.createMany({ data: users.map(id => ({ id, username: id, email: `${id}@example.test`, locatedAt: 'BAJA_CALIFORNIA' })) });
    const pet = (ownerId: string, isActive = true) => db.pet.create({ data: { ownerId, name: 'Luna', species: 'Gato', breed: 'Mestiza', birthYear: 2023, birthMonth: 5, isActive }, select: { id: true } });
    petAna = (await pet(ana)).id; petLuis = (await pet(luis)).id; petOff = (await pet(ana, false)).id;
  });
  afterAll(async () => {
    if (db) {
      await db.adoptionReportPhoto.deleteMany({ where: { report: { reporterId: { in: users } } } });
      await db.adoptionReport.deleteMany({ where: { reporterId: { in: users } } });
      await db.adoptionPhoto.deleteMany({ where: { listing: { userId: { in: users } } } });
      await db.adoptionListing.deleteMany({ where: { userId: { in: users } } });
      const conversations = (await db.conversation.findMany({ where: { OR: [{ userAId: { in: users } }, { userBId: { in: users } }] }, select: { id: true } })).map(c => c.id);
      await db.conversationParticipant.deleteMany({ where: { conversationId: { in: conversations } } });
      await db.conversation.deleteMany({ where: { id: { in: conversations } } });
      await db.chatBlock.deleteMany({ where: { OR: [{ blockerId: { in: users } }, { blockedId: { in: users } }] } });
      await db.pet.deleteMany({ where: { ownerId: { in: users } } });
      await db.user.deleteMany({ where: { id: { in: users } } });
      await db.$disconnect();
    }
    await app?.close();
  });

  it('publica con una a tres fotos válidas, confirmación y ficha propia opcional (AD-01, AD-05)', async () => {
    const created = await listing(ana, { petId: String(petAna) });
    expect(created).toMatchObject({ status: 'SEEKING_HOME', isActive: true, mine: true, pet: { id: petAna, name: 'Luna' } });
    expect(JSON.stringify(created)).not.toMatch(/storageKey|example\.test/);
    expect((await create(sara, {}, 3).expect(201)).body.photos).toHaveLength(3);
    await create(ana, {}, 0).expect(400);
    await create(ana, {}, 4).expect(400);
    await call('post', '/adoptions', ana).field('title', 'x').field('description', 'y').field('acceptNoSale', 'true').attach('photos', Buffer.from('no soy imagen'), { filename: 'x.jpg', contentType: 'image/jpeg' }).expect(400);
    await call('post', '/adoptions', ana).field('title', 'x').field('description', 'y').attach('photos', jpeg(), { filename: 'f.jpg', contentType: 'image/jpeg' }).expect(400);
    await create(ana, { price: '500' }).expect(400);
    await create(ana, { title: 'a'.repeat(121) }).expect(400);
    await create(ana, { title: '   ' }).expect(400);
    await create(ana, { petId: String(petLuis) }).expect(400);
    await create(ana, { petId: String(petOff) }).expect(400);
  });

  it('si Storage falla a la mitad no deja anuncio ni fotos sueltas (AD-T04, AD-T05)', async () => {
    const before = await db.adoptionListing.count({ where: { userId: luis } });
    const files = stored.size;
    // La primera foto se sube y la segunda falla: no debe quedar nada.
    bucket.upload.mockImplementationOnce(async (path: string, bytes: Buffer) => { stored.set(path, bytes); return { error: null }; })
      .mockImplementationOnce(async () => ({ error: { message: 'storage caído' } }));
    const r = create(luis, {}, 2);
    await r.expect(400);
    expect(await db.adoptionListing.count({ where: { userId: luis } })).toBe(before);
    expect(stored.size).toBe(files);
  });

  it('lista primero «Busca hogar», filtra y pagina sin repetir; no muestra retirados ni autores inactivos (AD-02, AD-06)', async () => {
    const seeking = [await listing(sara), await listing(sara)];
    const found = await listing(sara);
    await call('patch', `/adoptions/${found.id}`, sara).send({ status: 'FOUND_HOME' }).expect(200);
    const hidden = await listing(sara);
    await call('delete', `/adoptions/${hidden.id}`, sara).expect(200);
    const fromInactive = await listing(inactiva);
    await db.user.update({ where: { id: inactiva }, data: { isActive: false } });

    const seen: { id: number; status: string }[] = [];
    let cursor: string | null = null;
    do {
      const page = (await call('get', `/adoptions?limit=2${cursor ? `&cursor=${cursor}` : ''}`, luis).expect(200)).body as { items: { id: number; status: string }[]; nextCursor: string | null };
      seen.push(...page.items); cursor = page.nextCursor;
    } while (cursor);
    const ids = seen.map(i => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    const firstFound = seen.findIndex(i => i.status === 'FOUND_HOME');
    expect(seen.slice(firstFound).every(i => i.status === 'FOUND_HOME')).toBe(true);
    expect(ids).toEqual(expect.arrayContaining([...seeking.map(l => l.id), found.id]));
    expect(ids).not.toContain(hidden.id);
    expect(ids).not.toContain(fromInactive.id);
    const onlyFound = (await call('get', '/adoptions?status=FOUND_HOME', luis).expect(200)).body.items as { status: string }[];
    expect(onlyFound.every(i => i.status === 'FOUND_HOME')).toBe(true);
    await call('get', '/adoptions?cursor=basura', luis).expect(400);
    await call('get', `/adoptions/${fromInactive.id}`, luis).expect(404);
    await db.user.update({ where: { id: inactiva }, data: { isActive: true } });
  });

  it('entrega fotos solo a quien puede ver el anuncio, sin caché compartida (AD-T07, D-94)', async () => {
    const own = await listing(ana);
    const url = own.photos[0].url;
    const ok = await call('get', url, luis).expect(200);
    expect(ok.headers['content-type']).toBe('image/jpeg');
    expect(ok.headers['cache-control']).toBe('private, no-store');
    const other = await listing(sara);
    await call('get', `/adoptions/${own.id}/photos/${other.photos[0].id}`, luis).expect(404);
    await call('delete', `/adoptions/${own.id}`, ana).expect(200);
    await call('get', url, luis).expect(404);
    await call('get', `/adoptions/${own.id}`, luis).expect(404);
    await call('get', url, ana).expect(200);
  });

  it('solo el autor edita, cambia el estado y reemplaza fotos sin quedar en cero (AD-03, AD-08)', async () => {
    const own = await listing(ana);
    await call('patch', `/adoptions/${own.id}`, luis).send({ status: 'FOUND_HOME' }).expect(403);
    const changed = await call('patch', `/adoptions/${own.id}`, ana).send({ status: 'FOUND_HOME', title: 'Ya tiene hogar' }).expect(200);
    expect(changed.body).toMatchObject({ status: 'FOUND_HOME', title: 'Ya tiene hogar' });
    await call('patch', `/adoptions/${own.id}`, ana).send({ status: 'SEEKING_HOME' }).expect(200);
    await call('patch', `/adoptions/${own.id}`, ana).field('keepPhotoIds', '').expect(400);
    const oldKey = (await db.adoptionPhoto.findFirstOrThrow({ where: { listingId: own.id } })).storageKey;
    const replaced = await call('patch', `/adoptions/${own.id}`, ana).field('keepPhotoIds', '')
      .attach('photos', jpeg(7), { filename: 'a.jpg', contentType: 'image/jpeg' }).attach('photos', jpeg(8), { filename: 'b.jpg', contentType: 'image/jpeg' }).expect(200);
    expect(replaced.body.photos).toHaveLength(2);
    expect(stored.has(oldKey)).toBe(false);
    await call('patch', `/adoptions/${own.id}`, ana).field('keepPhotoIds', String(replaced.body.photos[0].id))
      .attach('photos', jpeg(9), { filename: 'c.jpg', contentType: 'image/jpeg' }).attach('photos', jpeg(10), { filename: 'd.jpg', contentType: 'image/jpeg' })
      .attach('photos', jpeg(11), { filename: 'e.jpg', contentType: 'image/jpeg' }).expect(400);
    await call('patch', `/adoptions/${own.id}`, ana).attach('photos', jpeg(9), { filename: 'c.jpg', contentType: 'image/jpeg' }).expect(400);
    await call('patch', `/adoptions/${own.id}`, ana).field('petId', String(petLuis)).expect(400);
    expect((await call('patch', `/adoptions/${own.id}`, ana).field('petId', String(petAna)).expect(200)).body.pet.id).toBe(petAna);
    expect((await call('patch', `/adoptions/${own.id}`, ana).field('petId', '').expect(200)).body.pet).toBeNull();
  });

  it('una ficha desactivada deja de aparecer sin retirar el anuncio (D-95)', async () => {
    const pet = await db.pet.create({ data: { ownerId: ana, name: 'Sol', species: 'Perro', breed: 'Mestiza', birthYear: 2022, birthMonth: 1 } });
    const own = await listing(ana, { petId: String(pet.id) });
    await db.pet.update({ where: { id: pet.id }, data: { isActive: false } });
    const seen = await call('get', `/adoptions/${own.id}`, luis).expect(200);
    expect(seen.body).toMatchObject({ isActive: true, pet: null });
  });

  it('retira y restaura con el mismo estado; los retirados solo los ve su autor (AD-08, D-94)', async () => {
    const own = await listing(ana);
    await call('patch', `/adoptions/${own.id}`, ana).send({ status: 'FOUND_HOME' }).expect(200);
    await call('delete', `/adoptions/${own.id}`, luis).expect(403);
    await call('delete', `/adoptions/${own.id}`, ana).expect(200);
    await call('patch', `/adoptions/${own.id}`, ana).send({ title: 'Otro' }).expect(409);
    const mine = (await call('get', '/adoptions/me/withdrawn', ana).expect(200)).body.items as { id: number }[];
    expect(mine.map(i => i.id)).toContain(own.id);
    expect(((await call('get', '/adoptions/me/withdrawn', luis).expect(200)).body.items as { id: number }[]).map(i => i.id)).not.toContain(own.id);
    await call('post', `/adoptions/${own.id}/restore`, luis).expect(404);
    const back = await call('post', `/adoptions/${own.id}/restore`, ana).expect(200);
    expect(back.body).toMatchObject({ isActive: true, status: 'FOUND_HOME' });
  });

  it('guarda un reporte por persona con copia del anuncio y conserva sus fotos al editar (AD-07, D-97, D-98)', async () => {
    const own = await listing(ana);
    const key = (await db.adoptionPhoto.findFirstOrThrow({ where: { listingId: own.id } })).storageKey;
    await call('post', `/adoptions/${own.id}/reports`, ana).send({ reason: 'OTHER' }).expect(400);
    await call('post', `/adoptions/${own.id}/reports`, luis).send({ reason: 'NADA' }).expect(400);
    await call('post', `/adoptions/${own.id}/reports`, luis).send({ reason: 'OTHER', explanation: 'x'.repeat(501) }).expect(400);
    const [first, second] = await Promise.all([
      call('post', `/adoptions/${own.id}/reports`, luis).send({ reason: 'POSSIBLE_SALE', explanation: 'Pide dinero por mensaje.' }),
      call('post', `/adoptions/${own.id}/reports`, luis).send({ reason: 'POSSIBLE_SALE' }),
    ]);
    expect([first.status, second.status].sort()).toEqual([201, 409]);
    expect([first, second].find(r => r.status === 409)!.body.code).toBe('ADOPTION_ALREADY_REPORTED');
    await call('post', `/adoptions/${own.id}/reports`, sara).send({ reason: 'MISLEADING_INFO' }).expect(201);
    expect((await call('get', `/adoptions/${own.id}`, luis).expect(200)).body.reportedByMe).toBe(true);

    await call('patch', `/adoptions/${own.id}`, ana).field('title', 'Título cambiado').field('keepPhotoIds', '').attach('photos', jpeg(5), { filename: 'z.jpg', contentType: 'image/jpeg' }).expect(200);
    const report = await db.adoptionReport.findFirstOrThrow({ where: { listingId: own.id, reporterId: luis }, include: { photos: true } });
    expect(report).toMatchObject({ snapshotTitle: 'Michi busca hogar', snapshotStatus: 'SEEKING_HOME', reason: 'POSSIBLE_SALE' });
    expect(report.photos.map(p => p.storageKey)).toEqual([key]);
    expect(stored.has(key)).toBe(true);
    await call('delete', `/adoptions/${own.id}`, ana).expect(200);
    await call('post', `/adoptions/${own.id}/reports`, sara).send({ reason: 'OTHER' }).expect(404);
  });

  it('«Contactar» abre el mismo chat solo desde un anuncio ajeno que busca hogar (AD-04, D-91)', async () => {
    const own = await listing(ana);
    await call('post', `/adoptions/${own.id}/contact`, ana).expect(400);
    const [a, b] = await Promise.all([call('post', `/adoptions/${own.id}/contact`, luis), call('post', `/adoptions/${own.id}/contact`, luis)]);
    expect(a.status).toBe(200); expect(b.status).toBe(200);
    expect(a.body.id).toBe(b.body.id);
    expect(a.body.otherUser.id).toBe(ana);
    await db.chatBlock.create({ data: { blockerId: ana, blockedId: luis } });
    expect((await call('post', `/adoptions/${own.id}/contact`, luis).expect(200)).body.canSend).toBe(false);
    await call('patch', `/adoptions/${own.id}`, ana).send({ status: 'FOUND_HOME' }).expect(200);
    await call('post', `/adoptions/${own.id}/contact`, sara).expect(409);
    await call('delete', `/adoptions/${own.id}`, ana).expect(200);
    await call('post', `/adoptions/${own.id}/contact`, sara).expect(404);
  });

  it('no admite comentarios ni «Me gusta» ni campos de cobro (AD-09)', async () => {
    const own = await listing(ana);
    const detail = (await call('get', `/adoptions/${own.id}`, luis).expect(200)).body as Record<string, unknown>;
    expect(Object.keys(detail)).not.toEqual(expect.arrayContaining(['comments']));
    expect(JSON.stringify(detail)).not.toMatch(/price|precio|likes|comments/i);
    await call('post', `/adoptions/${own.id}/comments`, luis).send({ content: 'hola' }).expect(404);
  });
});
