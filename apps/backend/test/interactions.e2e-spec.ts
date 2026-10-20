import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PostModule } from '../src/post/post.module';
import { PostPhotoService } from '../src/post/post-photo.service';
import { CommentsModule } from '../src/comments/comments.module';
import { LikesModule } from '../src/likes/likes.module';

const describeWithDatabase = process.env.POST_TEST_DATABASE_URL ? describe : describe.skip;

describeWithDatabase('Interacciones: comentarios (HTTP + PostgreSQL)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const suffix = Date.now().toString();
  const ana = `comments-ana-${suffix}`;
  const luis = `comments-luis-${suffix}`;
  const inactive = `comments-inactive-${suffix}`;
  const admin = `comments-admin-${suffix}`;
  const moderator = `comments-moderator-${suffix}`;
  const member = `comments-member-${suffix}`;
  const userIds = [ana, luis, inactive, admin, moderator, member];
  let postId: number;
  let otherPostId: number;
  let communityId: number;
  let communityPostId: number;
  const photos = { upload: jest.fn(), download: jest.fn(), removeAfterCommit: jest.fn() };
  const call = (method: 'get' | 'post' | 'patch' | 'put' | 'delete', path: string, userId = ana) =>
    request(app.getHttpServer())[method](path).set('x-test-user-id', userId);

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.POST_TEST_DATABASE_URL;
    const module = await Test.createTestingModule({ imports: [PrismaModule, PostModule, CommentsModule, LikesModule] })
      .overrideProvider(PostPhotoService).useValue(photos).compile();
    app = module.createNestApplication();
    app.use((req: { user?: { id: string }; headers: Record<string, unknown> }, _res: unknown, next: () => void) => {
      req.user = { id: String(req.headers['x-test-user-id']) }; next();
    });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.user.createMany({ data: [
      { id: ana, email: `${ana}@example.test`, username: ana, locatedAt: 'SONORA' },
      { id: luis, email: `${luis}@example.test`, username: luis, locatedAt: 'SONORA' },
      { id: inactive, email: `${inactive}@example.test`, username: inactive, locatedAt: 'SONORA', isActive: false },
      { id: admin, email: `${admin}@example.test`, username: admin, locatedAt: 'SONORA' },
      { id: moderator, email: `${moderator}@example.test`, username: moderator, locatedAt: 'SONORA' },
      { id: member, email: `${member}@example.test`, username: member, locatedAt: 'SONORA' },
    ] });
    const posts = await Promise.all([
      prisma.post.create({ data: { userId: ana, title: 'Primero', description: 'Visible', type: 'GENERAL' } }),
      prisma.post.create({ data: { userId: ana, title: 'Segundo', description: 'Visible', type: 'GENERAL' } }),
    ]);
    postId = posts[0].id; otherPostId = posts[1].id;
    communityId = (await prisma.community.create({ data: { name: `Comunidad ${suffix}`, description: 'Pruebas' } })).id;
    await prisma.communityMember.createMany({ data: [
      { userId: ana, communityId, role: 'MEMBER' },
      { userId: admin, communityId, role: 'ADMIN' },
      { userId: moderator, communityId, role: 'MODERATOR' },
      { userId: member, communityId, role: 'MEMBER' },
    ] });
    communityPostId = (await prisma.post.create({ data: { userId: ana, communityId, title: 'Comunidad', description: 'Privado', type: 'GENERAL' } })).id;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.moderationRemoval.deleteMany({ where: { moderatorId: { in: userIds } } });
      await prisma.comment.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.postLike.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.post.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.communityMember.deleteMany({ where: { communityId } });
      await prisma.community.delete({ where: { id: communityId } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      await prisma.$disconnect();
    }
    await app?.close();
  });

  it('validates 1–500 characters and takes the author from the session', async () => {
    await call('post', `/posts/${postId}/comments`).send({ body: '   ' }).expect(400);
    await call('post', `/posts/${postId}/comments`).send({ body: 'x'.repeat(501) }).expect(400);
    await call('post', `/posts/${postId}/comments`).send({ body: 'Hola', userId: ana }).expect(400);
    const created = await call('post', `/posts/${postId}/comments`, luis).send({ body: '  Hola, Petzy 🐾  ' }).expect(201);
    expect(created.body).toMatchObject({ userId: luis, postId, body: 'Hola, Petzy 🐾', editedAt: null, user: { username: luis, avatarUrl: null } });
    expect(created.body.user).not.toHaveProperty('email');
    expect((await prisma.comment.findUnique({ where: { id: created.body.id } }))?.userId).toBe(luis);
  });

  it('lists newest comments in pages and excludes hidden or inactive authors', async () => {
    const sameTime = new Date('2026-10-19T12:00:00.000Z');
    await prisma.comment.createMany({ data: Array.from({ length: 23 }, (_, index) => ({ userId: luis, postId, body: `Comentario ${index}`, createdAt: sameTime })) });
    await prisma.comment.create({ data: { userId: inactive, postId, body: 'Cuenta inactiva' } });
    await prisma.comment.create({ data: { userId: luis, postId, body: 'Oculto', isActive: false } });
    const first = await call('get', `/posts/${postId}/comments`).expect(200);
    expect(first.body.items).toHaveLength(20);
    const second = await call('get', `/posts/${postId}/comments?cursor=${first.body.nextCursor}`).expect(200);
    const all = [...first.body.items, ...second.body.items];
    expect(new Set(all.map((item: { id: number }) => item.id)).size).toBe(all.length);
    expect(all.every((item: { body: string }) => item.body !== 'Oculto' && item.body !== 'Cuenta inactiva')).toBe(true);
    expect(all.every((item: { user: Record<string, unknown> }) => !('email' in item.user) && !('avatar' in item.user))).toBe(true);
    await call('get', `/posts/${postId}/comments?limit=31`).expect(400);
    await call('get', `/posts/${otherPostId}/comments?cursor=${first.body.nextCursor}`).expect(400);
  });

  it('marks Edited only after a text change and protects ownership and post IDs', async () => {
    const created = await call('post', `/posts/${postId}/comments`, luis).send({ body: 'Inicial' }).expect(201);
    await call('patch', `/posts/${postId}/comments/${created.body.id}`).send({ body: 'Ajeno' }).expect(403);
    await call('patch', `/posts/${otherPostId}/comments/${created.body.id}`, luis).send({ body: 'Otro post' }).expect(404);
    const same = await call('patch', `/posts/${postId}/comments/${created.body.id}`, luis).send({ body: 'Inicial' }).expect(200);
    expect(same.body.editedAt).toBeNull();
    const edited = await call('patch', `/posts/${postId}/comments/${created.body.id}`, luis).send({ body: 'Corregido' }).expect(200);
    expect(edited.body.editedAt).not.toBeNull();
    await call('delete', `/posts/${postId}/comments/${created.body.id}`, luis).expect(200);
    expect((await prisma.comment.findUnique({ where: { id: created.body.id } }))?.editedAt).toEqual(new Date(edited.body.editedAt));
    await call('patch', `/posts/${postId}/comments/${created.body.id}`, luis).send({ body: 'Después' }).expect(404);
    await call('delete', `/posts/${postId}/comments/${created.body.id}`, luis).expect(404);
  });

  it('reuses post visibility and membership for reading and writing', async () => {
    await call('get', `/posts/${communityPostId}/comments`, luis).expect(404);
    await call('post', `/posts/${communityPostId}/comments`, luis).send({ body: 'Intruso' }).expect(404);
    const comment = await call('post', `/posts/${communityPostId}/comments`).send({ body: 'Mi comunidad' }).expect(201);
    await prisma.communityMember.delete({ where: { userId_communityId: { userId: ana, communityId } } });
    await call('get', `/posts/${communityPostId}/comments`).expect(404);
    await call('patch', `/posts/${communityPostId}/comments/${comment.body.id}`).send({ body: 'Sin membresía' }).expect(404);
    await prisma.post.update({ where: { id: postId }, data: { isActive: false } });
    await call('get', `/posts/${postId}/comments`, luis).expect(404);
    await call('post', `/posts/${postId}/comments`, luis).send({ body: 'Oculto' }).expect(404);
    expect((await prisma.comment.count({ where: { postId } }))).toBeGreaterThan(0);
    await prisma.post.update({ where: { id: postId }, data: { isActive: true } });
  });

  it('keeps likes unique, hides inactive people and rejects inaccessible posts', async () => {
    await call('put', `/posts/${postId}/like`, inactive).expect(404);
    const first = await call('put', `/posts/${postId}/like`, luis).expect(200);
    expect(first.body).toMatchObject({ likeCount: 1, likedByMe: true });
    await Promise.all(Array.from({ length: 3 }, () => call('put', `/posts/${postId}/like`, luis).expect(200)));
    expect(await prisma.postLike.count({ where: { userId: luis, postId } })).toBe(1);
    expect((await call('get', `/posts/${postId}`).expect(200)).body).toMatchObject({ likeCount: 1, likedByMe: false });
    await prisma.user.update({ where: { id: luis }, data: { isActive: false } });
    expect((await call('get', `/posts/${postId}`).expect(200)).body.likeCount).toBe(0);
    await prisma.user.update({ where: { id: luis }, data: { isActive: true } });
    expect((await call('get', `/posts/${postId}`).expect(200)).body.likeCount).toBe(1);
    await call('delete', `/posts/${postId}/like`, luis).expect(200);
    await call('delete', `/posts/${postId}/like`, luis).expect(200);
    expect((await call('get', `/posts/${postId}`).expect(200)).body.likeCount).toBe(0);
    await call('put', `/posts/${communityPostId}/like`, luis).expect(404);
    await prisma.post.update({ where: { id: postId }, data: { isActive: false } });
    await call('put', `/posts/${postId}/like`, luis).expect(404);
    await call('delete', `/posts/${postId}/like`, luis).expect(404);
    await prisma.post.update({ where: { id: postId }, data: { isActive: true } });
  });

  it('lets only the general post author see and restore comments they hid', async () => {
    const comment = await call('post', `/posts/${postId}/comments`, luis).send({ body: 'Comentario ajeno' }).expect(201);
    await call('delete', `/posts/${otherPostId}/moderation/comments/${comment.body.id}`).expect(404);
    await call('delete', `/posts/${postId}/moderation/comments/${comment.body.id}`, luis).expect(403);
    await call('delete', `/posts/${postId}/moderation/comments/${comment.body.id}`).expect(200);
    await call('delete', `/posts/${postId}/moderation/comments/${comment.body.id}`).expect(404);
    const mine = await call('get', `/posts/${postId}/moderation/comments`).expect(200);
    expect(mine.body.items).toEqual(expect.arrayContaining([expect.objectContaining({ comment: expect.objectContaining({ id: comment.body.id, body: 'Comentario ajeno' }) })]));
    await call('get', `/posts/${postId}/moderation/comments`, luis).expect(403);
    expect((await call('get', `/posts/${postId}/comments`).expect(200)).body.items.some((item: { id: number }) => item.id === comment.body.id)).toBe(false);
    await call('post', `/posts/${postId}/moderation/comments/${comment.body.id}/restore`, luis).expect(403);
    await call('post', `/posts/${postId}/moderation/comments/${comment.body.id}/restore`).expect(201);
    await call('post', `/posts/${postId}/moderation/comments/${comment.body.id}/restore`).expect(404);
    const restored = await prisma.comment.findUnique({ where: { id: comment.body.id } });
    expect(restored).toMatchObject({ isActive: true, editedAt: null });
    const removal = await prisma.moderationRemoval.findFirst({ where: { commentId: comment.body.id } });
    expect(removal?.restoredById).toBe(ana);
  });

  it('allows community author, moderator and admin to hide; only admin restores', async () => {
    await prisma.communityMember.upsert({
      where: { userId_communityId: { userId: ana, communityId } },
      create: { userId: ana, communityId, role: 'MEMBER' }, update: { role: 'MEMBER' },
    });
    const fromMember = await call('post', `/posts/${communityPostId}/comments`, member).send({ body: 'De miembro' }).expect(201);
    const fromAdmin = await call('post', `/posts/${communityPostId}/comments`, admin).send({ body: 'De admin' }).expect(201);
    const fromModerator = await call('post', `/posts/${communityPostId}/comments`, moderator).send({ body: 'De moderador' }).expect(201);
    await call('delete', `/communities/${communityId}/posts/${communityPostId}/comments/${fromMember.body.id}`, member).expect(403);
    await call('delete', `/communities/${communityId}/posts/${communityPostId}/comments/${fromMember.body.id}`, luis).expect(403);
    await call('delete', `/communities/${communityId}/posts/${postId}/comments/${fromMember.body.id}`, admin).expect(404);
    await call('delete', `/posts/${communityPostId}/moderation/comments/${fromMember.body.id}`).expect(403);
    await call('delete', `/communities/${communityId}/posts/${communityPostId}/comments/${fromMember.body.id}`, admin).expect(200);
    await call('delete', `/communities/${communityId}/posts/${communityPostId}/comments/${fromAdmin.body.id}`, moderator).expect(200);
    await call('delete', `/communities/${communityId}/posts/${communityPostId}/comments/${fromModerator.body.id}`).expect(200);
    await call('get', `/communities/${communityId}/moderation/comments`, moderator).expect(403);
    await call('get', `/communities/${communityId}/moderation/comments`).expect(403);
    const removed = await call('get', `/communities/${communityId}/moderation/comments`, admin).expect(200);
    const ids = removed.body.items.map((item: { comment: { id: number } }) => item.comment.id);
    expect(ids).toEqual(expect.arrayContaining([fromMember.body.id, fromAdmin.body.id, fromModerator.body.id]));
    await call('post', `/communities/${communityId}/moderation/comments/${fromModerator.body.id}/restore`, moderator).expect(403);
    await call('post', `/communities/${communityId}/moderation/comments/${fromModerator.body.id}/restore`, admin).expect(201);
    expect((await prisma.comment.findUnique({ where: { id: fromModerator.body.id } }))?.isActive).toBe(true);
    expect((await prisma.comment.findUnique({ where: { id: fromMember.body.id } }))?.isActive).toBe(false);
  });
});
