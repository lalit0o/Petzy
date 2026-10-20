import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { UserModule } from '../src/user/user.module';
import { AvatarService } from '../src/user/avatar.service';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { privateImageFormat } from '../src/common/private-image-format';

const describeWithDatabase = process.env.POST_TEST_DATABASE_URL ? describe : describe.skip;

describeWithDatabase('Perfiles: lectura y edición autorizada (HTTP + PostgreSQL)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const suffix = Date.now().toString();
  const ana = `profiles-ana-${suffix}`;
  const luis = `profiles-luis-${suffix}`;
  const inactive = `profiles-inactive-${suffix}`;
  const ids = [ana, luis, inactive];
  const jpeg = readFileSync(join(__dirname, 'fixtures/post-photo.jpg'));
  const avatars = {
    upload: jest.fn().mockImplementation(async (_userId: string, file: { buffer: Buffer }) => {
      privateImageFormat(file.buffer);
      return 'test/avatar.jpg';
    }),
    download: jest.fn().mockResolvedValue({ bytes: jpeg, contentType: 'image/jpeg' }),
    removeAfterCommit: jest.fn().mockResolvedValue(undefined),
  };
  const call = (method: 'get' | 'patch' | 'put' | 'delete', path: string, userId = ana) =>
    request(app.getHttpServer())[method](path).set('x-test-user-id', userId);

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.POST_TEST_DATABASE_URL;
    const module = await Test.createTestingModule({ imports: [PrismaModule, UserModule] })
      .overrideProvider(AvatarService).useValue(avatars).compile();
    app = module.createNestApplication();
    app.use((req: { user?: { id: string }; headers: Record<string, unknown> }, _res: unknown, next: () => void) => {
      req.user = { id: String(req.headers['x-test-user-id']) };
      next();
    });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.user.createMany({ data: [
      { id: ana, email: `${ana}@example.test`, username: ana, locatedAt: 'BAJA_CALIFORNIA' },
      { id: luis, email: `${luis}@example.test`, username: luis, locatedAt: 'JALISCO' },
      { id: inactive, email: `${inactive}@example.test`, username: inactive, locatedAt: 'SONORA', isActive: false },
    ] });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
      await prisma.$disconnect();
    }
    await app?.close();
  });

  it('returns email only to its owner and no internal avatar path', async () => {
    const own = await call('get', '/users/me').expect(200);
    expect(own.body.email).toBe(`${ana}@example.test`);
    expect(own.body).not.toHaveProperty('avatar');
    const publicProfile = await call('get', `/users/${ana}`, luis).expect(200);
    expect(publicProfile.body.username).toBe(ana);
    expect(publicProfile.body).not.toHaveProperty('email');
    expect(publicProfile.body).not.toHaveProperty('isActive');
    expect(publicProfile.body).not.toHaveProperty('avatar');
    await call('get', `/users/${inactive}`).expect(404);
    await call('get', `/users/missing-${suffix}`).expect(404);
    await call('get', '/users/me', inactive).expect(404);
  });

  it('updates only the signed-in profile and permits clearing its bio', async () => {
    const response = await call('patch', '/users/me').send({
      username: `edited-${suffix}`, bio: 'Vivo con dos gatos', locatedAt: 'SONORA',
    }).expect(200);
    expect(response.body).toMatchObject({ username: `edited-${suffix}`, bio: 'Vivo con dos gatos', locatedAt: 'SONORA' });
    await call('patch', '/users/me', luis).send({ bio: 'Perfil de Luis' }).expect(200);
    const clear = await call('patch', '/users/me').send({ bio: null }).expect(200);
    expect(clear.body.bio).toBeNull();
    const other = await call('get', `/users/${luis}`).expect(200);
    expect(other.body.username).toBe(luis);
    expect(other.body.bio).toBe('Perfil de Luis');
    await call('patch', `/users/${luis}`).send({ bio: 'Ataque' }).expect(404);
  });

  it('rejects duplicate or invalid names and forbidden fields', async () => {
    await call('patch', '/users/me').send({ username: luis }).expect(409);
    await call('patch', '/users/me').send({ username: 'ab' }).expect(400);
    await call('patch', '/users/me').send({ username: ' '.repeat(3) }).expect(400);
    await call('patch', '/users/me').send({ bio: 'x'.repeat(301) }).expect(400);
    await call('patch', '/users/me').send({ locatedAt: 'OTRO' }).expect(400);
    for (const forbidden of ['id', 'email', 'password', 'avatar', 'isActive']) {
      await call('patch', '/users/me').send({ [forbidden]: 'evil' }).expect(400);
    }
    await call('patch', '/users/me', inactive).send({ bio: 'No permitido' }).expect(404);
    await call('get', '/user/search?q=profiles').expect(404);
    await call('patch', `/user/${luis}`).send({ bio: 'Ataque' }).expect(404);
    await call('delete', `/user/${luis}`).expect(404);
  });

  it('searches active users with stable pages and public fields only', async () => {
    const search = `lookup-${suffix}`;
    const entries = Array.from({ length: 23 }, (_unused, index) => ({
      id: `profile-search-${index}-${suffix}`,
      username: `${search}-${String(index).padStart(2, '0')}`,
      email: `search-${index}-${suffix}@example.test`,
      locatedAt: 'BAJA_CALIFORNIA' as const,
    }));
    ids.push(...entries.map(entry => entry.id));
    await prisma.user.createMany({ data: entries });
    const inactiveMatch = `inactive-search-${suffix}`;
    ids.push(inactiveMatch);
    await prisma.user.create({ data: {
      id: inactiveMatch, username: `${search}-hidden`, email: `${inactiveMatch}@example.test`,
      locatedAt: 'SONORA', isActive: false,
    } });

    const first = await call('get', `/users?q=${search}`).expect(200);
    expect(first.body.items).toHaveLength(20);
    expect(first.body.nextCursor).toEqual(expect.any(String));
    const second = await call('get', `/users?q=${search}&cursor=${first.body.nextCursor}`).expect(200);
    expect(second.body.items).toHaveLength(3);
    expect(second.body.nextCursor).toBeNull();
    const combined = [...first.body.items, ...second.body.items];
    expect(new Set(combined.map((user: { id: string }) => user.id)).size).toBe(23);
    for (const user of combined) {
      expect(user).not.toHaveProperty('email');
      expect(user).not.toHaveProperty('avatar');
      expect(user).not.toHaveProperty('isActive');
    }
    await call('get', `/users?q=otro&cursor=${first.body.nextCursor}`).expect(400);
    await call('get', `/users?q=${search}&cursor=incorrecto`).expect(400);
    await call('get', '/users?q=a').expect(400);
    await call('get', `/users?q=${'x'.repeat(51)}`).expect(400);
    await call('get', '/users').expect(400);
    await call('get', `/users?q=${search}&limit=31`).expect(400);
    const upper = await call('get', `/users?q=${search.toUpperCase()}&limit=2`).expect(200);
    expect(upper.body.items).toHaveLength(2);
  });

  it('stores, serves and removes a private profile image with active account checks', async () => {
    await call('put', '/users/me/avatar').expect(400);
    await call('put', '/users/me/avatar').attach('photo', Buffer.from('fake'), 'fake.jpg').expect(400);
    const saved = await call('put', '/users/me/avatar').attach('photo', jpeg, 'pet.jpg').expect(200);
    expect(saved.body.avatarUrl).toBe(`/users/${ana}/avatar`);
    expect(saved.body).not.toHaveProperty('avatar');
    expect(avatars.upload).toHaveBeenCalledWith(ana, expect.objectContaining({ buffer: jpeg }));
    const own = await call('get', `/users/${ana}/avatar`).expect(200);
    expect(own.headers['cache-control']).toBe('private, no-store');
    expect(own.headers.vary).toBe('Authorization');
    expect(own.body).toEqual(jpeg);
    await call('get', `/users/${ana}/avatar`, luis).expect(200);
    await call('get', `/users/${ana}/avatar`, inactive).expect(404);
    await prisma.user.update({ where: { id: ana }, data: { isActive: false } });
    await call('get', `/users/${ana}/avatar`, luis).expect(404);
    await prisma.user.update({ where: { id: ana }, data: { isActive: true } });
    const removed = await call('delete', '/users/me/avatar').expect(200);
    expect(removed.body.avatarUrl).toBeNull();
    expect(avatars.removeAfterCommit).toHaveBeenCalledWith('test/avatar.jpg');
    await call('get', `/users/${ana}/avatar`).expect(404);
  });
});
