import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { jwtVerify } from 'jose';
import request from 'supertest';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { SupabaseAuthGuard } from '../src/auth/guards/supabase-auth.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { SupabaseService } from '../src/supabase/supabase.service';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn().mockReturnValue(jest.fn()),
  jwtVerify: jest.fn(),
}));

describe('Cuenta: perfil incompleto (HTTP)', () => {
  let app: INestApplication;
  const previousJwksUrl = process.env.SUPABASE_JWKS_URL;
  const profiles = new Map<string, Record<string, unknown>>();
  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };
  const supabase = {
    getClient: jest.fn(),
  };
  const resend = jest.fn().mockResolvedValue({ error: null });
  const resetPasswordForEmail = jest.fn().mockResolvedValue({ error: null });
  const setSession = jest.fn();
  const updateUser = jest.fn().mockResolvedValue({ data: { user: { id: 'person-ana' } }, error: null });

  beforeAll(async () => {
    process.env.SUPABASE_JWKS_URL = 'https://petzy.example/.well-known/jwks.json';
    jest.mocked(jwtVerify).mockImplementation(async (token) => ({
      payload: { sub: token === 'token-ana' ? 'person-ana' : 'person-luis' },
    } as never));
    prisma.user.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve(profiles.get(where.id) ?? null),
    );
    prisma.user.create.mockImplementation(({ data }: { data: { id: string } }) => {
      const profile = { ...data, isActive: true };
      profiles.set(data.id, profile);
      return Promise.resolve(profile);
    });
    supabase.getClient.mockReturnValue({
      auth: {
        getUser: jest.fn().mockImplementation((token: string) => {
          const isAna = token === 'token-ana';
          return Promise.resolve({
            data: {
              user: {
                id: isAna ? 'person-ana' : 'person-luis',
                email: isAna ? 'ana@example.com' : 'luis@example.com',
                email_confirmed_at: '2026-10-19T10:00:00Z',
              },
            },
            error: null,
          });
        }),
        resend,
        resetPasswordForEmail,
        setSession,
        updateUser,
      },
    });

    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: SupabaseService, useValue: supabase },
        { provide: APP_GUARD, useClass: SupabaseAuthGuard },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    if (previousJwksUrl === undefined) delete process.env.SUPABASE_JWKS_URL;
    else process.env.SUPABASE_JWKS_URL = previousJwksUrl;
  });

  it('keeps content closed until the confirmed owner completes the profile', async () => {
    const server = app.getHttpServer();

    await request(server)
      .get('/auth/me')
      .set('Authorization', 'Bearer token-ana')
      .expect(200)
      .expect(({ body }) => expect(body.profileStatus).toBe('incomplete'));

    await request(server)
      .get('/auth/123')
      .set('Authorization', 'Bearer token-ana')
      .expect(403)
      .expect(({ body }) => expect(body.code).toBe('PROFILE_INCOMPLETE'));

    await request(server)
      .put('/auth/profile-completion')
      .set('Authorization', 'Bearer token-ana')
      .send({ username: 'ana', locatedAt: 'BAJA_CALIFORNIA', id: 'person-luis' })
      .expect(200)
      .expect(({ body }) => expect(body.profileStatus).toBe('complete'));

    expect(profiles.get('person-ana')).toMatchObject({
      id: 'person-ana',
      email: 'ana@example.com',
      username: 'ana',
    });
    expect(profiles.has('person-luis')).toBe(false);

    await request(server)
      .get('/auth/123')
      .set('Authorization', 'Bearer token-ana')
      .expect(200);
  });

  it('keeps resend and reset requests public with uniform responses', async () => {
    const server = app.getHttpServer();
    const firstResend = await request(server).post('/auth/resend-confirmation').send({ email: 'ana@example.com' }).expect(200);
    const secondResend = await request(server).post('/auth/resend-confirmation').send({ email: 'unknown@example.com' }).expect(200);
    expect(firstResend.body).toEqual(secondResend.body);
    expect(resend).toHaveBeenCalledWith(expect.objectContaining({ type: 'signup', email: 'ana@example.com' }));

    const firstReset = await request(server).post('/auth/password-reset-request').send({ email: 'ana@example.com' }).expect(200);
    const secondReset = await request(server).post('/auth/password-reset-request').send({ email: 'unknown@example.com' }).expect(200);
    expect(firstReset.body).toEqual(secondReset.body);
    expect(resetPasswordForEmail).toHaveBeenCalledWith('ana@example.com', expect.objectContaining({ redirectTo: 'mobile://auth/callback' }));

    await request(server).post('/auth/password-reset-request').send({ email: 'invalid' }).expect(400);
  });

  it('requires a valid Supabase session before changing a password', async () => {
    const server = app.getHttpServer();
    setSession.mockResolvedValueOnce({ data: { user: null, session: null }, error: { code: 'invalid' } });
    await request(server).post('/auth/password-update').send({
      access_token: 'expired', refresh_token: 'expired', password: 'new-secret-123',
    }).expect(401);
    expect(updateUser).not.toHaveBeenCalled();

    setSession.mockResolvedValueOnce({ data: { user: { id: 'person-ana' }, session: { access_token: 'valid' } }, error: null });
    await request(server).post('/auth/password-update').send({
      access_token: 'valid', refresh_token: 'valid-refresh', password: 'new-secret-123',
    }).expect(200);
    expect(updateUser).toHaveBeenCalledWith({ password: 'new-secret-123' });
  });
});
