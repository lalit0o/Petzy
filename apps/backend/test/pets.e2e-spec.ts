import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PetModule } from '../src/pet/pet.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PetPhotoService } from '../src/pet/pet-photo.service';
import { privateImageFormat } from '../src/common/private-image-format';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const describeWithDatabase = process.env.POST_TEST_DATABASE_URL ? describe : describe.skip;

describeWithDatabase('Mascotas: nacimiento, lectura y propiedad (HTTP + PostgreSQL)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const suffix = Date.now().toString();
  const ana = `pets-ana-${suffix}`;
  const luis = `pets-luis-${suffix}`;
  const inactive = `pets-inactive-${suffix}`;
  const ids = [ana, luis, inactive];
  const jpeg = readFileSync(join(__dirname, 'fixtures/post-photo.jpg'));
  let photoNumber = 0;
  const photos = {
    upload: jest.fn().mockImplementation(async (_ownerId: string, file: { buffer: Buffer }) => {
      privateImageFormat(file.buffer);
      photoNumber += 1;
      return `test/pet-${photoNumber}.jpg`;
    }),
    download: jest.fn().mockResolvedValue({ bytes: jpeg, contentType: 'image/jpeg' }),
    removeAfterCommit: jest.fn().mockResolvedValue(undefined),
  };
  let petId: number;
  const birth = { year: 2023, month: 5 };
  const draft = { name: 'Luna', species: 'Perro', breed: 'Mestiza', birth, bio: 'Le gusta correr' };
  const call = (method: 'get' | 'post' | 'put' | 'patch' | 'delete', path: string, userId = ana) =>
    request(app.getHttpServer())[method](path).set('x-test-user-id', userId);

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.POST_TEST_DATABASE_URL;
    const module = await Test.createTestingModule({ imports: [PrismaModule, PetModule] })
      .overrideProvider(PetPhotoService).useValue(photos).compile();
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
      await prisma.post.deleteMany({ where: { userId: { in: ids } } });
      await prisma.pet.deleteMany({ where: { ownerId: { in: ids } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
      await prisma.$disconnect();
    }
    await app?.close();
  });

  it('creates a pet without accepting owner or age from the client', async () => {
    await call('post', '/pet').send(draft).expect(404);
    await call('post', '/pets').send({ ...draft, ownerId: luis }).expect(400);
    await call('post', '/pets').send({ ...draft, age: 3 }).expect(400);
    const created = await call('post', '/pets').send(draft).expect(201);
    petId = created.body.id;
    expect(created.body).toMatchObject({ ownerId: ana, name: 'Luna', species: 'Perro', breed: 'Mestiza', birth: { year: 2023, month: 5, day: null }, isAgeApproximate: true, photoUrl: null });
    expect(created.body.age).toEqual(expect.any(Number));
    expect(created.body).not.toHaveProperty('photo');
    const row = await prisma.pet.findUniqueOrThrow({ where: { id: petId } });
    expect(row).not.toHaveProperty('age');
    expect(row.birthDay).toBeNull();
  });

  it('rejects invalid text, unsupported dates and nested forbidden fields', async () => {
    await call('post', '/pets').send({ ...draft, name: ' ' }).expect(400);
    await call('post', '/pets').send({ ...draft, species: 'Otra' }).expect(400);
    await call('post', '/pets').send({ ...draft, breed: ' ' }).expect(400);
    await call('post', '/pets').send({ ...draft, bio: 'x'.repeat(301) }).expect(400);
    await call('post', '/pets').send({ ...draft, birth: { year: 2023, month: 2, day: 29 } }).expect(400);
    await call('post', '/pets').send({ ...draft, birth: { year: 2027, month: 1 } }).expect(400);
    await call('post', '/pets').send({ ...draft, birth: { year: 2024, month: 2, day: 29, age: 2 } }).expect(400);
    await call('post', '/pets').send({ ...draft, birth: { month: 4 } }).expect(400);
    await call('post', '/pets', inactive).send(draft).expect(403);
    const other = await call('post', '/pets').send({ ...draft, name: 'Iguana', species: 'Iguana', breed: 'Raza desconocida', birth: { year: 2024, month: 2, day: 29 } }).expect(201);
    expect(other.body.birth.day).toBe(29);
    expect(other.body.isAgeApproximate).toBe(false);
  });

  it('shows active pets only, paginates and hides inactive owners', async () => {
    const own = await call('get', '/users/me/pets').expect(200);
    expect(own.body.items.some((pet: { id: number }) => pet.id === petId)).toBe(true);
    const publicList = await call('get', `/users/${ana}/pets`, luis).expect(200);
    expect(publicList.body.items.find((pet: { id: number }) => pet.id === petId).age).toEqual(expect.any(Number));
    await call('get', `/users/${luis}/pets`).expect(200).then(response => expect(response.body.items).toEqual([]));
    await call('get', `/pets/${petId}`, luis).expect(200);
    await call('get', `/pets/${petId}`, inactive).expect(403);
    await call('get', `/users/${inactive}/pets`).expect(404);
    const hidden = await prisma.pet.create({ data: {
      ownerId: inactive, name: 'Oculta', species: 'Gato', breed: 'Mestiza',
      birthYear: 2024, birthMonth: 1, birthDay: null,
    } });
    await call('get', `/pets/${hidden.id}`).expect(404);

    const more = Array.from({ length: 22 }, (_unused, index) => ({
      ownerId: ana, name: `Mascota ${index}`, species: 'Ave', breed: 'Raza desconocida',
      birthYear: 2022, birthMonth: 1, birthDay: null,
    }));
    await prisma.pet.createMany({ data: more });
    const first = await call('get', '/users/me/pets').expect(200);
    expect(first.body.items).toHaveLength(20);
    const second = await call('get', `/users/me/pets?cursor=${first.body.nextCursor}`).expect(200);
    expect(second.body.items.length).toBeGreaterThan(0);
    expect([...first.body.items, ...second.body.items].map((pet: { id: number }) => pet.id).length).toBe(24);
    await call('get', '/users/me/pets?limit=31').expect(400);
    await call('get', `/users/${luis}/pets?cursor=${first.body.nextCursor}`).expect(400);
  });

  it('protects private pet photos and cleans them after replacement or removal', async () => {
    await call('get', `/pets/${petId}/photo`).expect(404);
    await call('put', `/pets/${petId}/photo`, luis).attach('photo', jpeg, 'pet.jpg').expect(404);
    await call('put', `/pets/${petId}/photo`).attach('photo', Buffer.from('fake'), 'bad.jpg').expect(400);
    const first = await call('put', `/pets/${petId}/photo`).attach('photo', jpeg, 'pet.jpg').expect(200);
    expect(first.body.photoUrl).toBe(`/pets/${petId}/photo`);
    expect(first.body).not.toHaveProperty('photo');
    const shown = await call('get', `/pets/${petId}/photo`, luis).expect(200);
    expect(shown.headers['cache-control']).toBe('private, no-store');
    expect(shown.body).toEqual(jpeg);
    await call('get', `/pets/${petId}/photo`, inactive).expect(403);
    await call('put', `/pets/${petId}/photo`).attach('photo', jpeg, 'new.jpg').expect(200);
    expect(photos.removeAfterCommit).toHaveBeenCalledWith('test/pet-1.jpg');
    await prisma.user.update({ where: { id: ana }, data: { isActive: false } });
    await call('get', `/pets/${petId}/photo`, luis).expect(404);
    await prisma.user.update({ where: { id: ana }, data: { isActive: true } });
    const removed = await call('delete', `/pets/${petId}/photo`).expect(200);
    expect(removed.body.photoUrl).toBeNull();
    await call('get', `/pets/${petId}/photo`).expect(404);
    await call('put', `/pets/${petId}/photo`).attach('photo', jpeg, 'again.jpg').expect(200);
  });

  it('serializes concurrent photo replacements and keeps the current image', async () => {
    await prisma.pet.update({ where: { id: petId }, data: { photo: 'test/pre-race.jpg' } });
    photos.removeAfterCommit.mockClear();
    const firstNumber = photoNumber + 1;
    await Promise.all([
      call('put', `/pets/${petId}/photo`).attach('photo', jpeg, 'first.jpg').expect(200),
      call('put', `/pets/${petId}/photo`).attach('photo', jpeg, 'second.jpg').expect(200),
    ]);
    const candidates = [`test/pet-${firstNumber}.jpg`, `test/pet-${firstNumber + 1}.jpg`];
    const current = (await prisma.pet.findUniqueOrThrow({ where: { id: petId } })).photo;
    expect(candidates).toContain(current);
    expect(photos.removeAfterCommit).toHaveBeenCalledWith('test/pre-race.jpg');
    expect(photos.removeAfterCommit).toHaveBeenCalledWith(candidates.find(path => path !== current));
    expect(photos.removeAfterCommit).not.toHaveBeenCalledWith(current);
  });

  it('permits only the owner to edit or deactivate a pet', async () => {
    await call('patch', `/pets/${petId}`, luis).send({ name: 'Ataque' }).expect(404);
    await call('delete', `/pets/${petId}`, luis).expect(404);
    for (const forbidden of ['ownerId', 'age', 'photo', 'isActive']) {
      await call('patch', `/pets/${petId}`).send({ [forbidden]: 'evil' }).expect(400);
    }
    const changed = await call('patch', `/pets/${petId}`).send({ birth: { year: 2020, month: 10, day: 20 }, bio: null }).expect(200);
    expect(changed.body.birth).toEqual({ year: 2020, month: 10, day: 20 });
    expect(changed.body.isAgeApproximate).toBe(false);
    expect(changed.body.bio).toBeNull();
    await call('delete', `/pets/${petId}`).expect(200);
    await call('get', `/pets/${petId}`).expect(404);
    await call('get', `/pets/${petId}/photo`).expect(404);
    await call('delete', `/pets/${petId}`).expect(404);
    await call('patch', `/pet/${petId}`).send({ name: 'Viejo' }).expect(404);
  });
});
