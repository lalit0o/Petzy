import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { AuthController } from '../auth.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { SupabaseService } from 'src/supabase/supabase.service';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn().mockReturnValue(jest.fn()),
  jwtVerify: jest.fn(),
}));

describe('SupabaseAuthGuard', () => {
  const previousJwksUrl = process.env.SUPABASE_JWKS_URL;
  const prisma = { user: { findUnique: jest.fn() } };
  const supabase = { getClient: jest.fn() };
  let guard: SupabaseAuthGuard;

  function context(method: keyof AuthController, token?: string): ExecutionContext {
    const request = {
      headers: token ? { authorization: `Bearer ${token}` } : {},
      user: undefined as { id: string } | undefined,
    };
    return {
      getClass: () => AuthController,
      getHandler: () => AuthController.prototype[method],
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SUPABASE_JWKS_URL = 'https://petzy.example/.well-known/jwks.json';
    jest.mocked(jwtVerify).mockResolvedValue({ payload: { sub: 'person-1' } } as never);
    supabase.getClient.mockReturnValue({ auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'person-1', email_confirmed_at: '2026-10-19T10:00:00Z' } }, error: null }) } });
    guard = new SupabaseAuthGuard(
      new Reflector(),
      prisma as unknown as PrismaService,
      supabase as unknown as SupabaseService,
    );
  });

  afterAll(() => {
    if (previousJwksUrl === undefined) delete process.env.SUPABASE_JWKS_URL;
    else process.env.SUPABASE_JWKS_URL = previousJwksUrl;
  });

  it('allows the two profile setup routes when User is missing', async () => {
    await expect(guard.canActivate(context('me', 'valid-token'))).resolves.toBe(true);
    await expect(guard.canActivate(context('completeProfile', 'valid-token'))).resolves.toBe(true);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('blocks private content for an identity without a profile', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(guard.canActivate(context('findOne', 'valid-token'))).rejects.toThrow(
      ForbiddenException,
    );
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'person-1' },
      select: { isActive: true },
    });
  });

  it('blocks private content for an inactive profile', async () => {
    prisma.user.findUnique.mockResolvedValue({ isActive: false });

    await expect(guard.canActivate(context('findOne', 'valid-token'))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('blocks private content until the email is confirmed', async () => {
    supabase.getClient.mockReturnValue({ auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'person-1', email_confirmed_at: null } }, error: null }) } });
    prisma.user.findUnique.mockResolvedValue({ isActive: true });

    await expect(guard.canActivate(context('findOne', 'valid-token'))).rejects.toThrow(ForbiddenException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('allows private content for an active profile', async () => {
    prisma.user.findUnique.mockResolvedValue({ isActive: true });

    await expect(guard.canActivate(context('findOne', 'valid-token'))).resolves.toBe(true);
  });

  it('keeps sign-in public without consulting a profile', async () => {
    await expect(guard.canActivate(context('signIn'))).resolves.toBe(true);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(createRemoteJWKSet).toHaveBeenCalled();
  });
});
