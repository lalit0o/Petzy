import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthModule } from '../src/auth/auth.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { SupabaseService } from '../src/supabase/supabase.service';

const describeWithDatabase = process.env.POST_TEST_DATABASE_URL ? describe : describe.skip;

describeWithDatabase('Reactivación de perfil (HTTP + PostgreSQL)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const id = `reactivation-${Date.now()}`;
  const email = `${id}@example.test`;
  const signInWithPassword = jest.fn().mockImplementation(async ({ email: suppliedEmail, password }) => {
    if (suppliedEmail !== email || password !== 'correct-password') {
      return { data: { user: null, session: null }, error: { status: 400, code: 'invalid_credentials' } };
    }
    return {
      data: {
        user: { id, email_confirmed_at: '2026-10-20T10:00:00Z' },
        session: { access_token: 'new-access', refresh_token: 'new-refresh' },
      }, error: null,
    };
  });

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.POST_TEST_DATABASE_URL;
    const module = await Test.createTestingModule({ imports: [PrismaModule, AuthModule] })
      .overrideProvider(SupabaseService)
      .useValue({ getClient: () => ({ auth: { signInWithPassword } }) })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.user.create({ data: { id, email, username: id, locatedAt: 'JALISCO', isActive: false } });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({ where: { id } });
      await prisma.$disconnect();
    }
    await app?.close();
  });

  it('needs a new password check, restores the same row and handles a repeated request', async () => {
    await request(app.getHttpServer()).post('/auth/reactivate')
      .set('Authorization', 'Bearer old-token').send({}).expect(400);
    await request(app.getHttpServer()).post('/auth/reactivate')
      .send({ email, password: 'wrong' }).expect(401);
    expect((await prisma.user.findUnique({ where: { id } }))?.isActive).toBe(false);

    const first = await request(app.getHttpServer()).post('/auth/reactivate')
      .send({ email, password: 'correct-password' }).expect(200);
    expect(first.body).toMatchObject({ profileStatus: 'complete', user: { id }, access_token: 'new-access' });
    expect((await prisma.user.findUnique({ where: { id } }))?.isActive).toBe(true);
    const repeated = await request(app.getHttpServer()).post('/auth/reactivate')
      .send({ email, password: 'correct-password' }).expect(200);
    expect(repeated.body.user.id).toBe(id);
    expect(signInWithPassword).toHaveBeenCalledTimes(3);
    expect(await prisma.user.count({ where: { id } })).toBe(1);
  });
});
