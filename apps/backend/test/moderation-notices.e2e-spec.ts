import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { CommunityModule } from '../src/community/community.module';
import { CommunityPhotoService } from '../src/community/community-photo.service';
import { PostModule } from '../src/post/post.module';
import { PostPhotoService } from '../src/post/post-photo.service';
import { CommentsModule } from '../src/comments/comments.module';
import { LikesModule } from '../src/likes/likes.module';
import { ModerationNoticesModule } from '../src/moderation-notices/moderation-notices.module';

type Notice = { id: number; kind: 'POST' | 'COMMENT'; status: 'REMOVED' | 'RESTORED'; acknowledged: boolean; reason: string; note: string | null; community: { id: number; name: string } | null; excerpt: string; postTitle: string | null };

const describeDatabase = process.env.POST_TEST_DATABASE_URL ? describe : describe.skip;
describeDatabase('Avisos de moderación al autor (HTTP + PostgreSQL)', () => {
  let app: INestApplication;
  let db: PrismaService;
  const prefix = `notice-${Date.now()}`;
  const [admin, author, bystander, general] = ['admin', 'author', 'bystander', 'general'].map(name => `${prefix}-${name}`);
  const users = [admin, author, bystander, general];
  const communities: number[] = [];
  const photos = { upload: jest.fn().mockResolvedValue('private/x.jpg'), download: jest.fn(), delete: jest.fn() };
  const call = (method: 'get' | 'post' | 'patch' | 'put' | 'delete', path: string, userId = admin) => request(app.getHttpServer())[method](path).set('x-test-user', userId);

  const community = async () => {
    const created = await call('post', '/communities', admin).send({ name: `Comunidad ${communities.length}`, description: 'Compartimos paseos y consejos para nuestras mascotas.', topic: 'Paseos' }).expect(201);
    communities.push(created.body.id);
    await call('post', `/communities/${created.body.id}/members/me`, author).expect(201);
    return created.body.id as number;
  };
  const post = async (communityId: number, title: string) => (await call('post', `/communities/${communityId}/posts`, author).send({ type: 'GENERAL', title, description: 'Descripción de prueba.' }).expect(201)).body.id as number;
  const comment = async (postId: number, body: string) => (await call('post', `/posts/${postId}/comments`, author).send({ body }).expect(201)).body.id as number;
  const notices = async (query = '', userId = author) => (await call('get', `/users/me/moderation-notices${query}`, userId).expect(200)).body as { items: Notice[]; nextCursor: number | null; pendingCount: number };

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.POST_TEST_DATABASE_URL;
    const module = await Test.createTestingModule({ imports: [PrismaModule, CommunityModule, PostModule, CommentsModule, LikesModule, ModerationNoticesModule] })
      .overrideProvider(PostPhotoService).useValue(photos).overrideProvider(CommunityPhotoService).useValue(photos).compile();
    app = module.createNestApplication();
    app.use((req: { user?: { id: string }; headers: Record<string, unknown> }, _res: unknown, next: () => void) => { req.user = { id: String(req.headers['x-test-user']) }; next(); });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init(); db = app.get(PrismaService);
    await db.user.createMany({ data: users.map(id => ({ id, username: id, email: `${id}@example.test`, locatedAt: 'SONORA' })) });
  });
  afterAll(async () => {
    if (db) {
      await db.moderationRemoval.deleteMany({ where: { moderatorId: { in: users } } });
      await db.comment.deleteMany({ where: { userId: { in: users } } });
      await db.post.deleteMany({ where: { userId: { in: users } } });
      await db.communityMember.deleteMany({ where: { communityId: { in: communities } } });
      await db.community.deleteMany({ where: { id: { in: communities } } });
      await db.user.deleteMany({ where: { id: { in: users } } });
      await db.$disconnect();
    }
    await app?.close();
  });

  it('notifies the author of community removals with reason, community and excerpt, and never the moderator (D-141, D-142)', async () => {
    const id = await community();
    const removedPost = await post(id, 'Venta de cachorros');
    const keptPost = await post(id, 'Paseo del domingo');
    const removedComment = await comment(keptPost, 'Compra aquí mi producto');
    await call('delete', `/communities/${id}/posts/${removedPost}`).send({ reason: 'SPAM' }).expect(200);
    await call('delete', `/communities/${id}/posts/${keptPost}/comments/${removedComment}`).send({ reason: 'OTHER', note: 'Vende cosas en los comentarios' }).expect(200);

    const pending = await notices('?pending=true');
    expect(pending.pendingCount).toBe(2);
    expect(pending.items).toHaveLength(2);
    const asPost = pending.items.find(item => item.kind === 'POST')!;
    const asComment = pending.items.find(item => item.kind === 'COMMENT')!;
    expect(asPost).toEqual(expect.objectContaining({ status: 'REMOVED', acknowledged: false, reason: 'SPAM', note: null, excerpt: 'Venta de cachorros', community: expect.objectContaining({ id }) }));
    expect(asComment).toEqual(expect.objectContaining({ reason: 'OTHER', note: 'Vende cosas en los comentarios', excerpt: 'Compra aquí mi producto', postTitle: 'Paseo del domingo' }));
    expect(JSON.stringify(pending)).not.toContain(admin);
    expect(pending.items.every(item => !('moderator' in item) && !('moderatorId' in item))).toBe(true);
  });

  it('shows nothing to people who did not lose content, including the moderator', async () => {
    expect(await notices('', bystander)).toEqual({ items: [], nextCursor: null, pendingCount: 0 });
    expect((await notices('?pending=true', admin)).pendingCount).toBe(0);
  });

  it('keeps restored removals in the history but not among the pending ones', async () => {
    const id = await community();
    const restored = await post(id, 'Se restaurará');
    await call('delete', `/communities/${id}/posts/${restored}`).send({ reason: 'OFF_TOPIC' }).expect(200);
    const before = (await notices('?pending=true')).pendingCount;
    await call('post', `/communities/${id}/moderation/posts/${restored}/restore`).expect(201);
    const after = await notices('?pending=true');
    expect(after.pendingCount).toBe(before - 1);
    expect(after.items.find(item => item.excerpt === 'Se restaurará')).toBeUndefined();
    const history = await notices();
    expect(history.items.find(item => item.excerpt === 'Se restaurará')).toEqual(expect.objectContaining({ status: 'RESTORED' }));
  });

  it('acknowledges only the author\'s own notices, by id or all of them', async () => {
    const all = await notices('?pending=true');
    expect(all.pendingCount).toBeGreaterThan(1);
    const [first, ...rest] = all.items;
    await call('post', '/users/me/moderation-notices/acknowledge', bystander).send({ ids: all.items.map(item => item.id) }).expect(200).expect(({ body }) => expect(body.acknowledged).toBe(0));
    expect((await notices('?pending=true')).pendingCount).toBe(all.pendingCount);
    await call('post', '/users/me/moderation-notices/acknowledge', author).send({ ids: [first.id] }).expect(200).expect(({ body }) => {
      expect(body.acknowledged).toBe(1); expect(body.pendingCount).toBe(all.pendingCount - 1);
    });
    await call('post', '/users/me/moderation-notices/acknowledge', author).send({ ids: [first.id] }).expect(200).expect(({ body }) => expect(body.acknowledged).toBe(0));
    expect(rest.length).toBeGreaterThan(0);
    const history = await notices();
    expect(history.items.find(item => item.id === first.id)?.acknowledged).toBe(true);
    await call('post', '/users/me/moderation-notices/acknowledge', author).send({}).expect(200).expect(({ body }) => expect(body.pendingCount).toBe(0));
    expect((await notices('?pending=true')).items).toEqual([]);
    await call('post', '/users/me/moderation-notices/acknowledge', author).send({ ids: ['x'] }).expect(400);
    await call('post', '/users/me/moderation-notices/acknowledge', author).send({ ids: [1], extra: true }).expect(400);
  });

  it('paginates the history from newest to oldest and rejects a foreign cursor', async () => {
    const id = await community();
    for (let index = 0; index < 3; index++) {
      const created = await post(id, `Pagina ${index}`);
      await call('delete', `/communities/${id}/posts/${created}`).send({ reason: 'SPAM' }).expect(200);
    }
    const first = await notices('?limit=2');
    expect(first.items).toHaveLength(2); expect(first.nextCursor).not.toBeNull();
    const second = await notices(`?limit=2&cursor=${first.nextCursor}`);
    expect(second.items.length).toBeGreaterThan(0);
    expect(new Set([...first.items, ...second.items].map(item => item.id)).size).toBe(first.items.length + second.items.length);
    const stamps = [...first.items, ...second.items];
    expect(stamps.map(item => item.id)).toEqual([...stamps.map(item => item.id)].sort((a, b) => b - a));
    await call('get', `/users/me/moderation-notices?cursor=${first.items[0].id}`, bystander).expect(400);
    await call('get', '/users/me/moderation-notices?limit=500', author).expect(400);
  });

  it('ignores comments the author of a general post hides (D-56)', async () => {
    const generalPost = (await call('post', '/posts', general).send({ type: 'GENERAL', title: 'Publicación general', description: 'Con un comentario ajeno.' }).expect(201)).body.id as number;
    const hidden = (await call('post', `/posts/${generalPost}/comments`, author).send({ body: 'Comentario en post general' }).expect(201)).body.id as number;
    await call('delete', `/posts/${generalPost}/moderation/comments/${hidden}`, general).expect(200);
    const history = await notices();
    expect(history.items.find(item => item.excerpt === 'Comentario en post general')).toBeUndefined();
  });
});
