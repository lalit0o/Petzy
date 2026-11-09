import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { jwtVerify, type createRemoteJWKSet } from 'jose';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';

// Comprobaciones de sesión compartidas por el guard HTTP y el WebSocket de Chat,
// para que ambas entradas acepten exactamente las mismas cuentas.

type Jwks = ReturnType<typeof createRemoteJWKSet>;

export async function tokenSubject(jwks: Jwks, token: string): Promise<string> {
  try {
    const { payload } = await jwtVerify(token, jwks);
    if (!payload.sub) throw new Error('Token sin sub');
    return payload.sub;
  } catch {
    throw new UnauthorizedException('Token inválido o expirado');
  }
}

// Sesión vigente en Supabase, correo confirmado, perfil de Petzy y cuenta activa.
export async function assertUsableAccount(prisma: PrismaService, supabase: SupabaseService, token: string, userId: string, allowInactive = false): Promise<void> {
  const { data, error } = await supabase.getClient().auth.getUser(token);
  if (error || !data.user || data.user.id !== userId) {
    throw new UnauthorizedException('La sesión ya no es válida. Inicia sesión de nuevo.');
  }
  if (!data.user.email_confirmed_at) {
    throw new ForbiddenException({ code: 'EMAIL_NOT_CONFIRMED', message: 'Confirma tu correo para entrar.' });
  }
  const profile = await prisma.user.findUnique({ where: { id: userId }, select: { isActive: true } });
  if (!profile) {
    throw new ForbiddenException({ code: 'PROFILE_INCOMPLETE', message: 'Completa tu perfil para continuar.' });
  }
  if (!profile.isActive && !allowInactive) {
    throw new ForbiddenException({ code: 'ACCOUNT_INACTIVE', message: 'Esta cuenta está desactivada.' });
  }
}
