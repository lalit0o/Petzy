import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

// Estas solicitudes no llevan token; no necesitan cargar JOSE ni acceder a JWKS.
jest.mock('jose', () => ({ createRemoteJWKSet: jest.fn().mockReturnValue(jest.fn()), jwtVerify: jest.fn() }));

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('requires a session for the root and the publications/community routes', async () => {
    await request(app.getHttpServer()).get('/').expect(401);
    await request(app.getHttpServer()).get('/posts').expect(401);
    await request(app.getHttpServer()).post('/posts').send({}).expect(401);
    await request(app.getHttpServer()).get('/communities').expect(401);
    for (const path of ['/users/me', '/users?q=Ana', '/users/person', '/users/person/avatar', '/users/person/pets', '/users/me/pets', '/pets/1', '/pets/1/photo']) await request(app.getHttpServer()).get(path).expect(401);
    await request(app.getHttpServer()).patch('/users/me').send({ bio: 'No autorizado' }).expect(401);
    await request(app.getHttpServer()).post('/users/me/deactivate').send({}).expect(401);
    await request(app.getHttpServer()).post('/pets').send({}).expect(401);
    await request(app.getHttpServer()).patch('/pets/1').send({ name: 'No autorizado' }).expect(401);
    await request(app.getHttpServer()).delete('/pets/1').expect(401);
    await request(app.getHttpServer()).put('/pets/1/photo').expect(401);
    await request(app.getHttpServer()).delete('/pets/1/photo').expect(401);
  });

  afterEach(async () => {
    await app.close();
  });
});
