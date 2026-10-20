import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { SupabaseService } from 'src/supabase/supabase.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('AuthService', () => {
  const previousRedirectUrl = process.env.PETZY_AUTH_REDIRECT_URL;
  let service: AuthService;
  const supabase = { getClient: jest.fn() };
  const prisma = { user: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn() } };
  const registration = {
    email: 'ana@example.com',
    username: 'ana',
    password: 'secret-password',
    locatedAt: 'BAJA_CALIFORNIA',
  } as Parameters<AuthService['singUp']>[0];

  beforeEach(async () => {
    jest.resetAllMocks();
    process.env.PETZY_AUTH_REDIRECT_URL = 'mobile://auth/callback';
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: SupabaseService, useValue: supabase },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterAll(() => {
    if (previousRedirectUrl === undefined) delete process.env.PETZY_AUTH_REDIRECT_URL;
    else process.env.PETZY_AUTH_REDIRECT_URL = previousRedirectUrl;
  });

  it('keeps two sign-in operations on separate Auth clients', async () => {
    const firstClient = {
      auth: {
        signInWithPassword: jest.fn().mockResolvedValue({
          data: { user: { id: 'person-1', email_confirmed_at: '2026-10-19T10:00:00Z' }, session: { access_token: 'token-1', refresh_token: 'refresh-1', expires_at: 1800000000 } },
          error: null,
        }),
      },
    };
    const secondClient = {
      auth: {
        signInWithPassword: jest.fn().mockResolvedValue({
          data: { user: { id: 'person-2', email_confirmed_at: '2026-10-19T10:00:00Z' }, session: { access_token: 'token-2', refresh_token: 'refresh-2', expires_at: 1800000000 } },
          error: null,
        }),
      },
    };
    supabase.getClient.mockReturnValueOnce(firstClient).mockReturnValueOnce(secondClient);
    prisma.user.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve({ id: where.id, isActive: true }),
    );

    const [first, second] = await Promise.all([
      service.signIn({ email: 'ana@example.com', password: 'one' }),
      service.signIn({ email: 'luis@example.com', password: 'two' }),
    ]);

    expect(supabase.getClient).toHaveBeenCalledTimes(2);
    expect(firstClient.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'ana@example.com',
      password: 'one',
    });
    expect(secondClient.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'luis@example.com',
      password: 'two',
    });
    expect(first).toMatchObject({ user: { id: 'person-1' }, access_token: 'token-1' });
    expect(second).toMatchObject({ user: { id: 'person-2' }, access_token: 'token-2' });
    expect(first).toMatchObject({ refresh_token: 'refresh-1', expires_at: 1800000000, profileStatus: 'complete' });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'person-1' },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        bio: true,
        createdAt: true,
        isActive: true,
        locatedAt: true,
      },
    });
  });

  it('rejects sign-in until the email is confirmed', async () => {
    supabase.getClient.mockReturnValue({
      auth: {
        signInWithPassword: jest.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: { code: 'email_not_confirmed' },
        }),
      },
    });

    await expect(service.signIn({ email: 'ana@example.com', password: 'secret' }))
      .rejects.toThrow('Confirma tu correo');
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('does not describe a temporary Auth outage as a wrong password', async () => {
    supabase.getClient.mockReturnValue({ auth: {
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: { status: 503, code: 'unexpected_failure' },
      }),
    } });

    await expect(service.signIn({ email: 'ana@example.com', password: 'secret' }))
      .rejects.toThrow('No se pudo comprobar la cuenta ahora');
  });

  it('renews a session and returns the rotated tokens with an incomplete profile state', async () => {
    const refreshSession = jest.fn().mockResolvedValue({
      data: {
        user: { id: 'person-1', email_confirmed_at: '2026-10-19T10:00:00Z' },
        session: { access_token: 'new-access', refresh_token: 'new-refresh', expires_at: 1800000000 },
      },
      error: null,
    });
    supabase.getClient.mockReturnValue({ auth: { refreshSession } });
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.refresh('old-refresh')).resolves.toMatchObject({
      access_token: 'new-access',
      refresh_token: 'new-refresh',
      expires_at: 1800000000,
      profileStatus: 'incomplete',
      user: null,
    });
    expect(refreshSession).toHaveBeenCalledWith({ refresh_token: 'old-refresh' });
  });

  it('rejects an expired refresh token without reading a profile', async () => {
    supabase.getClient.mockReturnValue({
      auth: {
        refreshSession: jest.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: { code: 'refresh_token_not_found', status: 400 },
        }),
      },
    });

    await expect(service.refresh('expired')).rejects.toThrow('Inicia sesión de nuevo');
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('keeps the session recoverable when Supabase cannot refresh it temporarily', async () => {
    supabase.getClient.mockReturnValue({ auth: {
      refreshSession: jest.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: { status: 503, code: 'unexpected_failure' },
      }),
    } });

    await expect(service.refresh('stored-refresh'))
      .rejects.toThrow('No se pudo comprobar la sesión ahora');
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('does not return an inactive profile during session renewal', async () => {
    supabase.getClient.mockReturnValue({
      auth: {
        refreshSession: jest.fn().mockResolvedValue({
          data: {
            user: { id: 'person-1', email_confirmed_at: '2026-10-19T10:00:00Z' },
            session: { access_token: 'new-access', refresh_token: 'new-refresh' },
          },
          error: null,
        }),
      },
    });
    prisma.user.findUnique.mockResolvedValue({ id: 'person-1', isActive: false });

    await expect(service.refresh('old-refresh')).resolves.toMatchObject({
      profileStatus: 'inactive',
      user: null,
    });
  });

  it('keeps simultaneous renewals on separate Auth clients', async () => {
    const first = jest.fn().mockResolvedValue({
      data: { user: { id: 'person-1', email_confirmed_at: '2026-10-19T10:00:00Z' }, session: { access_token: 'access-1', refresh_token: 'rotated-1' } },
      error: null,
    });
    const second = jest.fn().mockResolvedValue({
      data: { user: { id: 'person-2', email_confirmed_at: '2026-10-19T10:00:00Z' }, session: { access_token: 'access-2', refresh_token: 'rotated-2' } },
      error: null,
    });
    supabase.getClient
      .mockReturnValueOnce({ auth: { refreshSession: first } })
      .mockReturnValueOnce({ auth: { refreshSession: second } });
    prisma.user.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve({ id: where.id, isActive: true }),
    );

    const results = await Promise.all([service.refresh('old-1'), service.refresh('old-2')]);

    expect(first).toHaveBeenCalledWith({ refresh_token: 'old-1' });
    expect(second).toHaveBeenCalledWith({ refresh_token: 'old-2' });
    expect(results[0]).toMatchObject({ user: { id: 'person-1' }, refresh_token: 'rotated-1' });
    expect(results[1]).toMatchObject({ user: { id: 'person-2' }, refresh_token: 'rotated-2' });
  });

  it('rejects a duplicate registered email before asking Auth to create an identity', async () => {
    prisma.user.findFirst.mockResolvedValue({ email: registration.email, username: 'another-name' });

    await expect(service.singUp(registration)).rejects.toThrow('Este correo ya tiene una cuenta');
    expect(supabase.getClient).not.toHaveBeenCalled();
  });

  it('does not expose a Supabase error message when sign-up fails', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    supabase.getClient.mockReturnValue({
      auth: {
        signUp: jest.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'internal provider details', status: 400 },
        }),
      },
    });

    await expect(
      service.singUp(registration),
    ).rejects.toThrow('No se pudo completar el registro');
  });

  it('reports a temporary registration outage without exposing provider details', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    supabase.getClient.mockReturnValue({ auth: {
      signUp: jest.fn().mockResolvedValue({
        data: { user: null },
        error: { status: 503, message: 'internal provider details' },
      }),
    } });

    await expect(service.singUp(registration))
      .rejects.toThrow('No se pudo conectar con el servicio de cuentas');
  });

  it('asks for email confirmation after creating an identity and profile', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'person-1' });
    supabase.getClient.mockReturnValue({
      auth: {
        signUp: jest.fn().mockResolvedValue({
          data: { user: { id: 'person-1', identities: [{ id: 'identity-1' }] }, session: null },
          error: null,
        }),
      },
    });

    await expect(service.singUp(registration)).resolves.toMatchObject({
      confirmation_required: true,
    });
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        id: 'person-1',
        email: registration.email,
        username: registration.username,
        locatedAt: registration.locatedAt,
      },
    });
  });

  it('does not create a second identity when the username already exists', async () => {
    prisma.user.findFirst.mockResolvedValue({
      email: 'another@example.com',
      username: registration.username,
    });

    await expect(service.singUp(registration)).rejects.toThrow('nombre de usuario ya está en uso');
    expect(supabase.getClient).not.toHaveBeenCalled();
  });

  it('keeps the identity and explains recovery when profile creation fails', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockRejectedValue(new Error('database unavailable'));
    const signUp = jest.fn().mockResolvedValue({
      data: { user: { id: 'person-1', identities: [{ id: 'identity-1' }] }, session: null },
      error: null,
    });
    supabase.getClient.mockReturnValue({ auth: { signUp } });

    const result = await service.singUp(registration);

    expect(signUp).toHaveBeenCalledTimes(1);
    expect(result.confirmation_required).toBe(true);
    expect(result.message).toContain('completarlos con esa misma cuenta');
  });

  it('reports a username conflict if another registration claims the name first', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockRejectedValue({ code: 'P2002', meta: { target: ['username'] } });
    supabase.getClient.mockReturnValue({ auth: { signUp: jest.fn().mockResolvedValue({ data: { user: { id: 'person-1', identities: [{}] } }, error: null }) } });

    await expect(service.singUp(registration)).rejects.toThrow('nombre de usuario ya está en uso');
  });

  it('does not save a profile from an obfuscated existing user', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    supabase.getClient.mockReturnValue({
      auth: {
        signUp: jest.fn().mockResolvedValue({
          data: { user: { id: 'obfuscated-id', identities: [] }, session: null },
          error: null,
        }),
      },
    });

    await expect(service.singUp(registration)).resolves.toMatchObject({
      confirmation_required: true,
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('handles an existing identity without exposing the Supabase response', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    supabase.getClient.mockReturnValue({
      auth: {
        signUp: jest.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: { code: 'user_already_exists', message: 'User already registered' },
        }),
      },
    });

    await expect(service.singUp(registration)).resolves.toMatchObject({
      confirmation_required: true,
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('reports an incomplete profile to its confirmed owner', async () => {
    supabase.getClient.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: {
            user: {
              id: 'person-1',
              email: 'ana@example.com',
              email_confirmed_at: '2026-10-19T10:00:00Z',
            },
          },
          error: null,
        }),
      },
    });
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.getAccountState('person-1', 'access-token')).resolves.toEqual({
      id: 'person-1',
      email: 'ana@example.com',
      emailConfirmed: true,
      profileStatus: 'incomplete',
      user: null,
    });
  });

  it('completes only the profile belonging to the token', async () => {
    const getUser = jest.fn().mockResolvedValue({
      data: {
        user: {
          id: 'person-1',
          email: 'ana@example.com',
          email_confirmed_at: '2026-10-19T10:00:00Z',
        },
      },
      error: null,
    });
    supabase.getClient.mockReturnValue({ auth: { getUser } });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'person-1', username: 'ana', isActive: true });

    await expect(
      service.completeProfile('person-1', 'access-token', {
        username: 'ana',
        locatedAt: 'BAJA_CALIFORNIA',
      } as Parameters<AuthService['completeProfile']>[2]),
    ).resolves.toMatchObject({ profileStatus: 'complete' });
    expect(getUser).toHaveBeenCalledWith('access-token');
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          id: 'person-1',
          email: 'ana@example.com',
          username: 'ana',
          locatedAt: 'BAJA_CALIFORNIA',
        },
      }),
    );
  });

  it('rejects completion when the email is unconfirmed', async () => {
    supabase.getClient.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'person-1', email: 'ana@example.com', email_confirmed_at: null } },
          error: null,
        }),
      },
    });

    await expect(
      service.completeProfile('person-1', 'access-token', {
        username: 'ana',
        locatedAt: 'BAJA_CALIFORNIA',
      } as Parameters<AuthService['completeProfile']>[2]),
    ).rejects.toThrow('Confirma tu correo');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('rejects a token for a different identity', async () => {
    supabase.getClient.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'person-2', email: 'luis@example.com' } },
          error: null,
        }),
      },
    });

    await expect(service.getAccountState('person-1', 'access-token')).rejects.toThrow(
      'La sesión ya no es válida',
    );
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('returns a username conflict without creating a second profile', async () => {
    supabase.getClient.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: {
            user: {
              id: 'person-1',
              email: 'ana@example.com',
              email_confirmed_at: '2026-10-19T10:00:00Z',
            },
          },
          error: null,
        }),
      },
    });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.completeProfile('person-1', 'access-token', {
        username: 'already-taken',
        locatedAt: 'BAJA_CALIFORNIA',
      } as Parameters<AuthService['completeProfile']>[2]),
    ).rejects.toThrow('nombre de usuario ya está en uso');
  });

  it('returns the same resend message whether Auth sends mail or finds no pending confirmation', async () => {
    const resend = jest.fn()
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { code: 'email_not_found' } });
    supabase.getClient.mockReturnValue({ auth: { resend } });

    const first = await service.resendConfirmation('ana@example.com');
    const second = await service.resendConfirmation('absent@example.com');

    expect(first).toEqual(second);
    expect(resend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'ana@example.com',
      options: { emailRedirectTo: 'mobile://auth/callback' },
    });
  });

  it('returns the same reset message for an existing or absent email', async () => {
    const resetPasswordForEmail = jest.fn()
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { code: 'email_not_found' } });
    supabase.getClient.mockReturnValue({ auth: { resetPasswordForEmail } });

    const first = await service.requestPasswordReset('ana@example.com');
    const second = await service.requestPasswordReset('absent@example.com');

    expect(first).toEqual(second);
    expect(resetPasswordForEmail).toHaveBeenCalledWith('ana@example.com', {
      redirectTo: 'mobile://auth/callback',
    });
  });

  it('does not claim a confirmation email was sent when the provider rejects delivery', async () => {
    supabase.getClient.mockReturnValue({ auth: {
      resend: jest.fn().mockResolvedValue({ error: { code: 'email_address_not_authorized' } }),
    } });

    await expect(service.resendConfirmation('ana@example.com'))
      .rejects.toThrow('No se pudo solicitar el correo ahora');
  });

  it('does not claim a recovery email was sent when the provider rejects delivery', async () => {
    supabase.getClient.mockReturnValue({ auth: {
      resetPasswordForEmail: jest.fn().mockResolvedValue({ error: { code: 'over_email_send_rate_limit' } }),
    } });

    await expect(service.requestPasswordReset('ana@example.com'))
      .rejects.toThrow('No se pudo solicitar el enlace ahora');
  });

  it('updates a password only after Supabase accepts the link session', async () => {
    const setSession = jest.fn().mockResolvedValue({ data: { user: { id: 'person-1' }, session: { access_token: 'valid' } }, error: null });
    const updateUser = jest.fn().mockResolvedValue({ data: { user: { id: 'person-1' } }, error: null });
    supabase.getClient.mockReturnValue({ auth: { setSession, updateUser } });

    await expect(service.updatePassword({ access_token: 'link-access', refresh_token: 'link-refresh', password: 'new-secret-123' }))
      .resolves.toMatchObject({ message: expect.stringContaining('actualizada') });
    expect(setSession).toHaveBeenCalledWith({ access_token: 'link-access', refresh_token: 'link-refresh' });
    expect(updateUser).toHaveBeenCalledWith({ password: 'new-secret-123' });
  });

  it('rejects an expired link without changing the password', async () => {
    const updateUser = jest.fn();
    supabase.getClient.mockReturnValue({ auth: {
      setSession: jest.fn().mockResolvedValue({ data: { user: null, session: null }, error: { code: 'refresh_token_not_found' } }),
      updateUser,
    } });

    await expect(service.updatePassword({ access_token: 'expired', refresh_token: 'expired', password: 'new-secret-123' }))
      .rejects.toThrow('enlace ya no es válido');
    expect(updateUser).not.toHaveBeenCalled();
  });
});
