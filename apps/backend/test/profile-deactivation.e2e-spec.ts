import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { jwtVerify } from 'jose';
import request from 'supertest';
import { AuthModule } from '../src/auth/auth.module';
import { SupabaseAuthGuard } from '../src/auth/guards/supabase-auth.guard';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { SupabaseService } from '../src/supabase/supabase.service';
import { SupabaseModule } from '../src/supabase/supabase.module';
import { UserModule } from '../src/user/user.module';
import { AvatarService } from '../src/user/avatar.service';
import { CommunityModule } from '../src/community/community.module';
import { PostModule } from '../src/post/post.module';
import { PostPhotoService } from '../src/post/post-photo.service';
import { PetModule } from '../src/pet/pet.module';
import { PetPhotoService } from '../src/pet/pet-photo.service';
import { CommentsModule } from '../src/comments/comments.module';
import { LikesModule } from '../src/likes/likes.module';

jest.mock('jose', () => ({ createRemoteJWKSet: jest.fn().mockReturnValue(jest.fn()), jwtVerify: jest.fn() }));
const describeDatabase = process.env.POST_TEST_DATABASE_URL ? describe : describe.skip;

describeDatabase('Perfiles: desactivación segura y efectos cruzados (HTTP + PostgreSQL)', () => {
  let app: INestApplication; let db: PrismaService;
  const prefix = `pf${Date.now()}`; const users: string[] = []; const communities: number[] = []; const revoked = new Set<string>();
  const previousJwks = process.env.SUPABASE_JWKS_URL;
  const photos = { upload: jest.fn(), download: jest.fn().mockResolvedValue({ bytes: Buffer.from('photo'), contentType: 'image/jpeg' }), removeAfterCommit: jest.fn() };
  const call = (method: 'get' | 'post' | 'patch' | 'put' | 'delete', path: string, userId: string) => request(app.getHttpServer())[method](path).set('Authorization', `Bearer ${userId}`);
  const person = async (label: string, active = true) => {
    const id = `${prefix}-${label}`; users.push(id);
    await db.user.create({ data: { id, email: `${id}@example.test`, username: id, locatedAt: 'SONORA', isActive: active, avatar: 'private/avatar.jpg' } });
    return id;
  };
  const community = async (admins: string[]) => {
    const row = await db.community.create({ data: { name: 'Comunidad de pruebas', topic: 'Cuidados', description: 'Pruebas de administración segura.', members: { create: admins.map(userId => ({ userId, role: 'ADMIN' })) } } });
    communities.push(row.id); return row.id;
  };
  const adminCount = (id: number) => db.communityMember.count({ where: { communityId: id, role: 'ADMIN', user: { isActive: true } } });

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.POST_TEST_DATABASE_URL;
    process.env.SUPABASE_JWKS_URL = 'https://petzy.example/.well-known/jwks.json';
    jest.mocked(jwtVerify).mockImplementation(async token => {
      if (typeof token !== 'string' || !users.includes(token)) throw new Error('expired');
      return { payload: { sub: token } } as never;
    });
    const auth = {
      getUser: jest.fn(async (token: string) => users.includes(token) && !revoked.has(token)
        ? { data: { user: { id: token, email_confirmed_at: '2026-10-26' } }, error: null }
        : { data: { user: null }, error: { status: 401 } }),
      signInWithPassword: jest.fn(async ({ email, password }: { email: string; password: string }) => {
        const id = users.find(value => `${value}@example.test` === email);
        if (!id || password !== 'correct-password') return { data: { user: null, session: null }, error: { status: 400, code: 'invalid_credentials' } };
        return { data: { user: { id, email_confirmed_at: '2026-10-26' }, session: { access_token: id, refresh_token: `refresh-${id}`, expires_at: 2000000000 } }, error: null };
      }),
    };
    const module = await Test.createTestingModule({
      imports: [PrismaModule, SupabaseModule, AuthModule, UserModule, CommunityModule, PostModule, PetModule, CommentsModule, LikesModule],
      providers: [{ provide: APP_GUARD, useClass: SupabaseAuthGuard }],
    }).overrideProvider(SupabaseService).useValue({ getClient: () => ({ auth }) })
      .overrideProvider(AvatarService).useValue(photos).overrideProvider(PostPhotoService).useValue(photos).overrideProvider(PetPhotoService).useValue(photos).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init(); db = app.get(PrismaService);
  });
  afterAll(async () => {
    if (db) {
      await db.moderationRemoval.deleteMany({ where: { moderatorId: { in: users } } });
      await db.postLike.deleteMany({ where: { userId: { in: users } } });
      await db.comment.deleteMany({ where: { userId: { in: users } } });
      await db.post.deleteMany({ where: { userId: { in: users } } });
      await db.pet.deleteMany({ where: { ownerId: { in: users } } });
      await db.communityExpulsion.deleteMany({ where: { communityId: { in: communities } } });
      await db.communityMember.deleteMany({ where: { communityId: { in: communities } } });
      await db.community.deleteMany({ where: { id: { in: communities } } });
      await db.user.deleteMany({ where: { id: { in: users } } });
      await db.$disconnect();
    }
    await app?.close();
    if (previousJwks === undefined) delete process.env.SUPABASE_JWKS_URL; else process.env.SUPABASE_JWKS_URL = previousJwks;
  });

  it('deactivates only the token owner and supports a safe repeated request', async () => {
    const a = await person('simple'); const other = await person('other');
    await request(app.getHttpServer()).post('/users/me/deactivate').send({}).expect(401);
    await call('post', '/users/me/deactivate', 'expired').send({}).expect(401);
    await call('post', '/users/me/deactivate', a).send({ userId: other }).expect(400);
    revoked.add(a); await call('post', '/users/me/deactivate', a).send({}).expect(401); revoked.delete(a);
    await call('post', '/users/me/deactivate', a).send({}).expect(200).expect(({ body }) => expect(body.isActive).toBe(false));
    await call('post', '/users/me/deactivate', a).send({}).expect(200);
    expect((await db.user.findUnique({ where: { id: other } }))?.isActive).toBe(true);
    for (const path of ['/users/me', `/users/${other}`, '/communities', '/posts']) await call('get', path, a).expect(403);
  });

  it('checks every community and excludes inactive alternative admins without partially deactivating', async () => {
    const a = await person('multi'); const b = await person('backup'); const dormant = await person('dormant', false);
    await community([a, b]); const blocked = await community([a, dormant]);
    const result = await call('post', '/users/me/deactivate', a).send({}).expect(409);
    expect(result.body.code).toBe('LAST_ACTIVE_COMMUNITY_ADMIN');
    expect(result.body.communities.map((row: { id: number }) => row.id)).toEqual([blocked]);
    expect((await db.user.findUnique({ where: { id: a } }))?.isActive).toBe(true);
    await db.communityMember.create({ data: { communityId: blocked, userId: b, role: 'ADMIN' } });
    await call('post', '/users/me/deactivate', a).send({}).expect(200);
    expect(await adminCount(blocked)).toBe(1);
  });

  it('prevents two simultaneous admin deactivations from leaving no active admin', async () => {
    const a = await person('race-a'); const b = await person('race-b'); const id = await community([a, b]);
    const responses = await Promise.all([call('post', '/users/me/deactivate', a).send({}), call('post', '/users/me/deactivate', b).send({})]);
    expect(responses.map(row => row.status).sort()).toEqual([200, 409]);
    expect(await adminCount(id)).toBe(1);
  });

  it('coordinates deactivation with another admin leaving or changing role', async () => {
    for (const action of ['leave', 'role']) {
      const a = await person(`${action}-a`); const b = await person(`${action}-b`); const id = await community([a, b]);
      const mutation = action === 'leave' ? call('delete', `/communities/${id}/members/me`, b) : call('patch', `/communities/${id}/members/${b}/role`, b).send({ role: 'MEMBER' });
      const results = await Promise.all([call('post', '/users/me/deactivate', a).send({}), mutation]);
      expect(results.filter(row => row.status === 200)).toHaveLength(1);
      expect(results.every(row => [200, 400, 409].includes(row.status))).toBe(true);
      expect(await adminCount(id)).toBe(1);
    }
  });

  it('does not create an orphan community when its creator deactivates concurrently', async () => {
    const a = await person('creator');
    const responses = await Promise.all([
      call('post', '/users/me/deactivate', a).send({}),
      call('post', '/communities', a).send({ name: 'Comunidad concurrente', topic: 'Cuidados', description: 'Una comunidad nueva con responsable activo.' }),
    ]);
    const created = responses[1]; if (created.status === 201) communities.push(created.body.id);
    expect(responses.every(row => [200, 201, 403, 404, 409].includes(row.status))).toBe(true);
    if (created.status === 201) expect(await adminCount(created.body.id)).toBe(1);
    expect(responses[0].status === 200 && created.status === 201).toBe(false);
  });

  it('hides and restores content and each saved membership role without resurrecting withdrawn content', async () => {
    const a = await person('lifecycle'); const b = await person('viewer');
    const roleCommunities: number[] = [];
    for (const role of ['MEMBER', 'MODERATOR', 'ADMIN'] as const) {
      const id = await community([b]); roleCommunities.push(id);
      await db.communityMember.create({ data: { communityId: id, userId: a, role } });
    }
    const pet = await db.pet.create({ data: { ownerId: a, name: 'Luna', species: 'Perro', breed: 'Mestiza', birthYear: 2024, birthMonth: 5, photo: 'private/pet.jpg' } });
    const retiredPet = await db.pet.create({ data: { ownerId: a, name: 'Retirada', species: 'Gato', breed: 'Mestiza', birthYear: 2024, birthMonth: 5, isActive: false } });
    const post = await db.post.create({ data: { userId: a, title: 'Visible', description: 'Se conserva al desactivar.', type: 'GENERAL', photoUrl: 'private/post.jpg' } });
    const retired = await db.post.create({ data: { userId: a, title: 'Retirado', description: 'No debe revivir.', type: 'GENERAL', isActive: false } });
    const otherPost = await db.post.create({ data: { userId: b, title: 'Conversación', description: 'Comentarios de una cuenta.', type: 'GENERAL' } });
    await call('post', `/posts/${otherPost.id}/comments`, a).send({ body: 'Activo' }).expect(201);
    const withdrawn = await call('post', `/posts/${otherPost.id}/comments`, a).send({ body: 'Retirado' }).expect(201);
    await call('delete', `/posts/${otherPost.id}/comments/${withdrawn.body.id}`, a).expect(200);
    await call('put', `/posts/${otherPost.id}/like`, a).expect(200);
    await call('post', '/users/me/deactivate', a).send({}).expect(200);
    for (const path of [`/users/${a}`, `/users/${a}/avatar`, `/users/${a}/pets`, `/pets/${pet.id}`, `/pets/${pet.id}/photo`, `/posts/${post.id}`, `/posts/${post.id}/photo`]) await call('get', path, b).expect(404);
    expect((await call('get', `/users?q=${a}`, b).expect(200)).body.items).toHaveLength(0);
    expect((await call('get', `/posts/${otherPost.id}/comments`, b).expect(200)).body.total).toBe(0);
    expect((await call('get', `/posts/${otherPost.id}`, b).expect(200)).body.likeCount).toBe(0);
    for (const id of roleCommunities) {
      await call('get', `/communities/${id}`, a).expect(403);
      expect((await call('get', `/communities/${id}`, b).expect(200)).body.memberCount).toBe(1);
      expect((await call('get', `/communities/${id}/members`, b).expect(200)).body.items.some((row: { id: string }) => row.id === a)).toBe(false);
    }
    const credentials = { email: `${a}@example.test`, password: 'correct-password' };
    const inactiveSignIn = await request(app.getHttpServer()).post('/auth/sign-in').send(credentials).expect(201);
    expect(inactiveSignIn.body.profileStatus).toBe('inactive');
    await request(app.getHttpServer()).post('/auth/reactivate').send({ ...credentials, password: 'wrong' }).expect(401);
    expect((await db.user.findUnique({ where: { id: a } }))?.isActive).toBe(false);
    await request(app.getHttpServer()).post('/auth/reactivate').send(credentials).expect(200);
    for (const path of [`/users/${a}`, `/users/${a}/avatar`, `/pets/${pet.id}`, `/pets/${pet.id}/photo`, `/posts/${post.id}`, `/posts/${post.id}/photo`]) await call('get', path, b).expect(200);
    await call('get', `/posts/${retired.id}`, b).expect(404);
    await call('get', `/pets/${retiredPet.id}`, b).expect(404);
    expect((await call('get', `/users/${a}/pets`, b).expect(200)).body.items.map((item: { id: number }) => item.id)).toEqual([pet.id]);
    expect((await call('get', `/posts/${otherPost.id}/comments`, b).expect(200)).body.total).toBe(1);
    expect((await call('get', `/posts/${otherPost.id}`, b).expect(200)).body.likeCount).toBe(1);
    for (const [index, id] of roleCommunities.entries()) {
      expect((await call('get', `/communities/${id}`, a).expect(200)).body).toMatchObject({ memberCount: 2, role: ['MEMBER', 'MODERATOR', 'ADMIN'][index] });
    }
    expect(await db.communityMember.count({ where: { userId: a } })).toBe(3);
    expect((await db.comment.findUnique({ where: { id: withdrawn.body.id } }))?.isActive).toBe(false);
    expect(await db.postLike.count({ where: { userId: a } })).toBe(1);
  });
});
