import { BadRequestException, ConflictException, ForbiddenException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { SignUpDto } from './dto/signUp.dto';

import { SupabaseService } from 'src/supabase/supabase.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { SignInDto } from './dto/signIn.dto';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { PasswordUpdateDto } from './dto/password-update.dto';

const ownProfileSelect = {
  id: true,
  email: true,
  username: true,
  avatar: true,
  bio: true,
  createdAt: true,
  isActive: true,
  locatedAt: true,
} as const;

const authRedirectUrl = () => process.env.PETZY_AUTH_REDIRECT_URL || 'mobile://auth/callback';
const isTemporaryAuthError = (error: { status?: number; code?: string }) =>
  !error.status || error.status >= 500 || error.status === 429 || error.code === 'conflict';

@Injectable()
export class AuthService {
  constructor(private readonly supa: SupabaseService, private readonly prisma: PrismaService) { }
  async singUp(createAuthDto: SignUpDto) {



    const { password, email, username, locatedAt } = createAuthDto;

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
      select: { email: true, username: true },
    });

    if (existingUser?.email === email) {
      throw new ConflictException('Este correo ya tiene una cuenta. Inicia sesión para continuar.');
    }
    if (existingUser?.username === username) {
      throw new ConflictException('El nombre de usuario ya está en uso. Elige otro.');
    }


    const confirmationResponse = {
      message:
        'Revisa tu correo para confirmar tu cuenta. Si ya tenías una cuenta, inicia sesión. Si al entrar faltan datos de Petzy, podrás completarlos con esa misma cuenta.',
      statusCode: 201,
      confirmation_required: true,
    };
    const supabase = this.supa.getClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: authRedirectUrl() },
    });
    if (error) {
      if (error.code === 'user_already_exists' || error.code === 'email_exists') {
        return confirmationResponse;
      }
      if (isTemporaryAuthError(error)) {
        throw new ServiceUnavailableException('No se pudo conectar con el servicio de cuentas. Intenta de nuevo.');
      }
      throw new BadRequestException('No se pudo completar el registro. Revisa los datos e inténtalo de nuevo.');
    }
    if (!data.user) {
      throw new BadRequestException('No se pudo completar el registro. Inténtalo de nuevo.');
    }
    // Supabase may return an obfuscated user for an existing confirmed account.
    if (data.user.identities?.length === 0) {
      return confirmationResponse;
    }

    try {
      await this.prisma.user.create({
        data: { id: data.user.id, email, username, locatedAt },
      });
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        const target = 'meta' in error && typeof error.meta === 'object' && error.meta !== null && 'target' in error.meta
          ? error.meta.target : undefined;
        if (Array.isArray(target) && target.includes('username')) {
          throw new ConflictException('El nombre de usuario ya está en uso. Confirma tu correo y entra con esta misma cuenta para elegir otro.');
        }
      }
      // Auth already created the identity. The confirmed owner completes User later.
      return confirmationResponse;
    }

    return confirmationResponse;





  }

  async signIn(signInDto: SignInDto) {
    const supabase = this.supa.getClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: signInDto.email,
      password: signInDto.password,
    });

    if (error) {
      if (error.code === 'email_not_confirmed') {
        throw new ForbiddenException({
          code: 'EMAIL_NOT_CONFIRMED',
          message: 'Confirma tu correo para entrar. Si no recibiste el mensaje, puedes solicitar otro.',
        });
      }
      if (isTemporaryAuthError(error)) {
        throw new ServiceUnavailableException('No se pudo comprobar la cuenta ahora. Intenta de nuevo.');
      }
      throw new UnauthorizedException('El email o la contraseña son incorrectos');
    }

    if (!data.user || !data.session) {
      throw new UnauthorizedException('No se pudo iniciar sesión');
    }
    if (!data.user.email_confirmed_at) {
      throw new ForbiddenException({
        code: 'EMAIL_NOT_CONFIRMED',
        message: 'Confirma tu correo para entrar. Si no recibiste el mensaje, puedes solicitar otro.',
      });
    }
    return this.sessionResponse(data.user.id, data.session);
  }

  async refresh(refreshToken: string) {
    let result: Awaited<ReturnType<ReturnType<SupabaseService['getClient']>['auth']['refreshSession']>>;
    try {
      result = await this.supa.getClient().auth.refreshSession({
        refresh_token: refreshToken,
      });
    } catch {
      throw new ServiceUnavailableException('No se pudo comprobar la sesión ahora. Intenta de nuevo.');
    }
    const { data, error } = result;
    if (error && isTemporaryAuthError(error)) {
      throw new ServiceUnavailableException('No se pudo comprobar la sesión ahora. Intenta de nuevo.');
    }
    if (error || !data.user || !data.session) {
      throw new UnauthorizedException('La sesión terminó. Inicia sesión de nuevo.');
    }
    if (!data.user.email_confirmed_at) {
      throw new ForbiddenException({
        code: 'EMAIL_NOT_CONFIRMED',
        message: 'Confirma tu correo para entrar.',
      });
    }
    return this.sessionResponse(data.user.id, data.session);
  }

  async resendConfirmation(email: string) {
    const { error } = await this.supa.getClient().auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: authRedirectUrl() },
    });
    if (error && !['email_not_found', 'user_not_found'].includes(error.code ?? '')) {
      throw new ServiceUnavailableException('No se pudo solicitar el correo ahora. Intenta de nuevo más tarde.');
    }
    return { message: 'Si ese correo tiene una confirmación pendiente, recibirás un enlace. Revisa también la carpeta de correo no deseado.' };
  }

  async requestPasswordReset(email: string) {
    const { error } = await this.supa.getClient().auth.resetPasswordForEmail(email, {
      redirectTo: authRedirectUrl(),
    });
    if (error && !['email_not_found', 'user_not_found'].includes(error.code ?? '')) {
      throw new ServiceUnavailableException('No se pudo solicitar el enlace ahora. Intenta de nuevo más tarde.');
    }
    return { message: 'Si existe una cuenta con ese correo, recibirás un enlace para cambiar la contraseña.' };
  }

  async updatePassword(dto: PasswordUpdateDto) {
    const client = this.supa.getClient();
    const { data, error } = await client.auth.setSession({
      access_token: dto.access_token,
      refresh_token: dto.refresh_token,
    });
    if (error || !data.user || !data.session) {
      throw new UnauthorizedException('El enlace ya no es válido. Solicita otro para cambiar tu contraseña.');
    }
    const result = await client.auth.updateUser({ password: dto.password });
    if (result.error) {
      throw new BadRequestException('No se pudo cambiar la contraseña. Intenta de nuevo o solicita otro enlace.');
    }
    return { message: 'Contraseña actualizada. Inicia sesión con la nueva contraseña.' };
  }

  private async sessionResponse(userId: string, session: {
    access_token: string;
    refresh_token: string;
    expires_at?: number;
  }) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: ownProfileSelect,
    });
    return {
      message: 'Sesión lista',
      user: user?.isActive ? user : null,
      profileStatus: !user ? 'incomplete' : user.isActive ? 'complete' : 'inactive',
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at ?? null,
    };
  }

  private async verifiedIdentity(userId: string, accessToken: string) {
    const { data, error } = await this.supa.getClient().auth.getUser(accessToken);
    if (error) {
      if (error.status === 401 || error.status === 403) {
        throw new UnauthorizedException('La sesión ya no es válida. Inicia sesión de nuevo.');
      }
      throw new ServiceUnavailableException('No se pudo comprobar la cuenta. Intenta de nuevo.');
    }
    if (!data.user || data.user.id !== userId || !data.user.email) {
      throw new UnauthorizedException('La sesión ya no es válida. Inicia sesión de nuevo.');
    }
    return data.user;
  }

  async getAccountState(userId: string, accessToken: string) {
    const identity = await this.verifiedIdentity(userId, accessToken);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: ownProfileSelect,
    });
    const profileStatus = !user ? 'incomplete' : user.isActive ? 'complete' : 'inactive';
    return {
      id: identity.id,
      email: identity.email,
      emailConfirmed: !!identity.email_confirmed_at,
      profileStatus,
      user: profileStatus === 'complete' ? user : null,
    };
  }

  async completeProfile(userId: string, accessToken: string, dto: CompleteProfileDto) {
    const identity = await this.verifiedIdentity(userId, accessToken);
    if (!identity.email_confirmed_at) {
      throw new ForbiddenException('Confirma tu correo antes de completar el registro.');
    }

    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: ownProfileSelect,
    });
    if (existing) {
      if (!existing.isActive) {
        throw new ForbiddenException({
          code: 'ACCOUNT_INACTIVE',
          message: 'Esta cuenta está desactivada.',
        });
      }
      return { profileStatus: 'complete', user: existing };
    }

    try {
      const user = await this.prisma.user.create({
        data: {
          id: userId,
          email: identity.email!,
          username: dto.username,
          locatedAt: dto.locatedAt,
        },
        select: ownProfileSelect,
      });
      return { profileStatus: 'complete', user };
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        const raced = await this.prisma.user.findUnique({
          where: { id: userId },
          select: ownProfileSelect,
        });
        if (raced) {
          if (!raced.isActive) {
            throw new ForbiddenException({
              code: 'ACCOUNT_INACTIVE',
              message: 'Esta cuenta está desactivada.',
            });
          }
          return { profileStatus: 'complete', user: raced };
        }
        throw new ConflictException('El nombre de usuario ya está en uso. Elige otro.');
      }
      throw new ServiceUnavailableException('No se pudo guardar tu perfil. Intenta de nuevo.');
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} auth`;
  }

  // update(id: number, updateAuthDto: UpdateAuthDto) {
  //   return `This action updates a #${id} auth`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} auth`;
  // }
}
