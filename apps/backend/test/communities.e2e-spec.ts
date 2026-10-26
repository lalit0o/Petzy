import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { CommunityModule } from '../src/community/community.module';
import { PostModule } from '../src/post/post.module';
import { PostPhotoService } from '../src/post/post-photo.service';
import { CommentsModule } from '../src/comments/comments.module';
import { LikesModule } from '../src/likes/likes.module';

const describeDatabase = process.env.POST_TEST_DATABASE_URL ? describe : describe.skip;
describeDatabase('Comunidades e integración de publicaciones (HTTP + PostgreSQL)', () => {
  let app: INestApplication;
  let db: PrismaService;
  const prefix = `community-${Date.now()}`;
  const [ana, luis, member, outsider, inactive] = ['ana', 'luis', 'member', 'outsider', 'inactive'].map(name => `${prefix}-${name}`);
  const users = [ana, luis, member, outsider, inactive];
  const ids: number[] = [];
  const photos = { upload: jest.fn().mockResolvedValue('private/community-post.jpg'), download: jest.fn().mockResolvedValue({ bytes: Buffer.from('photo'), contentType: 'image/jpeg' }), removeAfterCommit: jest.fn() };
  const call = (method: 'get' | 'post' | 'patch' | 'put' | 'delete', path: string, userId = ana) => request(app.getHttpServer())[method](path).set('x-test-user', userId);
  const create = async (userId = ana, name = 'Paseos con mascotas') => {
    const result = await call('post', '/communities', userId).send({ name, description: 'Compartimos paseos y consejos para nuestras mascotas.', topic: 'Paseos' }).expect(201);
    ids.push(result.body.id);
    return result.body as { id: number; role: string; memberCount: number };
  };
  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.POST_TEST_DATABASE_URL;
    const module = await Test.createTestingModule({ imports: [PrismaModule, CommunityModule, PostModule, CommentsModule, LikesModule] }).overrideProvider(PostPhotoService).useValue(photos).compile();
    app = module.createNestApplication();
    app.use((req: { user?: { id: string }; headers: Record<string, unknown> }, _res: unknown, next: () => void) => { req.user = { id: String(req.headers['x-test-user']) }; next(); });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init(); db = app.get(PrismaService);
    await db.user.createMany({ data: users.map(id => ({ id, username: id, email: `${id}@example.test`, locatedAt: 'SONORA', isActive: id !== inactive })) });
  });
  afterAll(async () => {
    if (db) {
      await db.moderationRemoval.deleteMany({ where: { moderatorId: { in: users } } });
      await db.postLike.deleteMany({ where: { userId: { in: users } } });
      await db.comment.deleteMany({ where: { userId: { in: users } } });
      await db.post.deleteMany({ where: { userId: { in: users } } });
      await db.communityExpulsion.deleteMany({ where: { communityId: { in: ids } } });
      await db.communityMember.deleteMany({ where: { communityId: { in: ids } } });
      await db.community.deleteMany({ where: { id: { in: ids } } });
      await db.user.deleteMany({ where: { id: { in: users } } });
      await db.$disconnect();
    }
    await app?.close();
  });

  it('creates the initial admin atomically and permits repeated names', async () => {
    const a = await create(); const b = await create(luis);
    expect(a).toMatchObject({ role: 'ADMIN', memberCount: 1 });
    expect(a.id).not.toBe(b.id);
    expect(await db.communityMember.count({ where: { communityId: a.id } })).toBe(1);
    await call('post', '/communities').send({ name: 'x', topic: 'x', description: 'corta' }).expect(400);
    await call('post', '/communities').send({ name: 'Nombre válido', topic: 'Paseos', description: 'Descripción válida.', userId: luis }).expect(400);
    await call('post', '/communities', inactive).send({ name: 'Nombre válido', topic: 'Paseos', description: 'Descripción válida.' }).expect(404);
  });

  it('paginates visible search results and keeps preview data private', async () => {
    const rows = await db.community.createManyAndReturn({ data: Array.from({ length: 34 }, (_, i) => ({ name: `${prefix} ${i}`, description: 'Resultados para probar paginación.', topic: 'Paginación' })) });
    ids.push(...rows.map(row => row.id));
    const first = await call('get', `/communities?q=${prefix}`, outsider).expect(200);
    const second = await call('get', `/communities?q=${prefix}&cursor=${first.body.nextCursor}`, outsider).expect(200);
    expect(first.body.items).toHaveLength(20); expect(second.body.items).toHaveLength(14);
    expect(new Set([...first.body.items, ...second.body.items].map(row => row.id)).size).toBe(34);
    const preview = await call('get', `/communities/${rows[0].id}`, outsider).expect(200);
    expect(preview.body).toMatchObject({ role: null, memberCount: 0, photoPath: null });
    for (const field of ['topic', 'members', 'posts', 'photoUrl']) expect(preview.body).not.toHaveProperty(field);
    await call('get', `/communities?q=x`, outsider).expect(400);
    await call('get', '/communities?limit=31', outsider).expect(400);
    await call('get', `/communities/${rows[0].id}/members`, outsider).expect(403);
  });

  it('joins once under concurrency, leaves without deleting posts and rejoins as MEMBER', async () => {
    const c = await create();
    await Promise.all([call('post', `/communities/${c.id}/members/me`, luis).expect(201), call('post', `/communities/${c.id}/members/me`, luis).expect(201)]);
    expect((await call('get', `/communities/${c.id}`).expect(200)).body.memberCount).toBe(2);
    await call('patch', `/communities/${c.id}/members/${luis}/role`).send({ role: 'MODERATOR' }).expect(200);
    const post = await call('post', `/communities/${c.id}/posts`, luis).send({ type: 'GENERAL', title: 'Se conserva', description: 'Contenido de un miembro.' }).expect(201);
    await call('delete', `/communities/${c.id}/members/me`, luis).expect(200);
    await call('get', `/posts/${post.body.id}`, luis).expect(404);
    await call('get', `/posts/${post.body.id}`).expect(200);
    expect((await call('post', `/communities/${c.id}/members/me`, luis).expect(201)).body.role).toBe('MEMBER');
  });

  it('protects the last active admin against simultaneous exits and demotions', async () => {
    const c = await create();
    await call('delete', `/communities/${c.id}/members/me`).expect(400);
    await call('post', `/communities/${c.id}/members/me`, luis).expect(201);
    await call('patch', `/communities/${c.id}/members/${luis}/role`).send({ role: 'ADMIN' }).expect(200);
    const exits = await Promise.all([call('delete', `/communities/${c.id}/members/me`), call('delete', `/communities/${c.id}/members/me`, luis)]);
    expect(exits.map(row => row.status).sort()).toEqual([200, 400]);
    expect(await db.communityMember.count({ where: { communityId: c.id, role: 'ADMIN', user: { isActive: true } } })).toBe(1);
    const d = await create();
    await call('post', `/communities/${d.id}/members/me`, luis).expect(201);
    await call('patch', `/communities/${d.id}/members/${luis}/role`).send({ role: 'ADMIN' }).expect(200);
    const demotions = await Promise.all([call('patch', `/communities/${d.id}/members/${ana}/role`).send({ role: 'MEMBER' }), call('patch', `/communities/${d.id}/members/${luis}/role`, luis).send({ role: 'MEMBER' })]);
    expect(demotions.map(row => row.status).sort()).toEqual([200, 400]);
    expect(await db.communityMember.count({ where: { communityId: d.id, role: 'ADMIN', user: { isActive: true } } })).toBe(1);
  });

  it('applies expulsion to discovery, posts, photos, comments, likes and direct IDs', async () => {
    const c = await create();
    await call('post', `/communities/${c.id}/members/me`, member).expect(201);
    const post = await db.post.create({ data: { userId: ana, communityId: c.id, title: 'Privado', description: 'Visible para miembros.', type: 'GENERAL', photoUrl: 'private/community-post.jpg' } });
    await call('get', `/posts/${post.id}/photo`, member).expect(200);
    await call('post', `/communities/${c.id}/expulsions`, luis).send({ userId: member }).expect(403);
    await call('post', `/communities/${c.id}/expulsions`).send({ userId: ana }).expect(400);
    await Promise.all([call('post', `/communities/${c.id}/expulsions`).send({ userId: member }).expect(201), call('post', `/communities/${c.id}/expulsions`).send({ userId: member }).expect(201)]);
    expect(await db.communityExpulsion.count({ where: { communityId: c.id, userId: member } })).toBe(1);
    await call('get', `/communities/${c.id}`, member).expect(404);
    await call('post', `/communities/${c.id}/members/me`, member).expect(404);
    for (const path of [`/posts/${post.id}`, `/posts/${post.id}/photo`, `/posts/${post.id}/comments`]) await call('get', path, member).expect(404);
    await call('put', `/posts/${post.id}/like`, member).expect(404);
    expect((await call('get', '/communities', member).expect(200)).body.items.some(row => row.id === c.id)).toBe(false);
    await call('delete', `/communities/${c.id}/expulsions/${member}`).expect(200);
    await call('get', `/posts/${post.id}`, member).expect(404);
    expect((await call('post', `/communities/${c.id}/members/me`, member).expect(201)).body.role).toBe('MEMBER');
    await call('get', `/posts/${post.id}`, member).expect(200);
  });

  it('restricts settings, roles and restoration to current admins of the right community', async () => {
    const c = await create(); const other = await create(luis, 'Otra comunidad');
    await call('post', `/communities/${c.id}/members/me`, member).expect(201);
    await call('patch', `/communities/${c.id}`, member).send({ name: 'Cambio ajeno' }).expect(403);
    await call('patch', `/communities/${c.id}`, luis).send({ name: 'Cambio ajeno' }).expect(403);
    await call('patch', `/communities/${c.id}`).send({ topic: null }).expect(400);
    await call('patch', `/communities/${c.id}`).send({ name: 'Nombre actualizado' }).expect(200);
    const post = await call('post', `/communities/${c.id}/posts`, member).send({ type: 'GENERAL', title: 'Para moderar', description: 'Contenido de la comunidad.' }).expect(201);
    await call('delete', `/communities/${other.id}/posts/${post.body.id}`, luis).expect(404);
    await call('delete', `/communities/${c.id}/posts/${post.body.id}`).expect(200);
    await call('get', `/communities/${c.id}/moderation/posts`, member).expect(403);
    const removed = await call('get', `/communities/${c.id}/moderation/posts`).expect(200);
    expect(removed.body.items).toEqual(expect.arrayContaining([expect.objectContaining({ post: expect.objectContaining({ id: post.body.id }) })]));
    await call('post', `/communities/${other.id}/moderation/posts/${post.body.id}/restore`, luis).expect(404);
    await call('post', `/communities/${c.id}/moderation/posts/${post.body.id}/restore`).expect(201);
    await call('get', `/posts/${post.body.id}`, member).expect(200);
    const comment = await call('post', `/posts/${post.body.id}/comments`, member).send({ body: 'Un comentario de la comunidad' }).expect(201);
    await call('delete', `/communities/${c.id}/posts/${post.body.id}/comments/${comment.body.id}`).expect(200);
    await call('post', `/communities/${other.id}/moderation/comments/${comment.body.id}/restore`, luis).expect(404);
    await call('post', `/communities/${c.id}/moderation/comments/${comment.body.id}/restore`).expect(201);
  });

  it('paginates only active members and never exposes their emails', async () => {
    const c = await create();
    const people = Array.from({ length: 32 }, (_, index) => `${prefix}-page-${index}`);
    users.push(...people);
    await db.user.createMany({ data: people.map(id => ({ id, username: id, email: `${id}@example.test`, locatedAt: 'SONORA' })) });
    await db.communityMember.createMany({ data: [...people, inactive].map(userId => ({ communityId: c.id, userId, role: 'MEMBER' })) });
    const first = await call('get', `/communities/${c.id}/members`).expect(200);
    const second = await call('get', `/communities/${c.id}/members?cursor=${encodeURIComponent(first.body.nextCursor)}`).expect(200);
    expect(first.body.items).toHaveLength(20); expect(second.body.items).toHaveLength(13);
    const all = [...first.body.items, ...second.body.items];
    expect(new Set(all.map(person => person.id)).size).toBe(33);
    expect(all.some(person => person.id === inactive)).toBe(false);
    expect(all.every(person => !('email' in person) && !('avatar' in person))).toBe(true);
    expect((await call('get', `/communities/${c.id}`).expect(200)).body.memberCount).toBe(33);
    await call('get', `/communities/${c.id}/members`, outsider).expect(403);
  });
});
