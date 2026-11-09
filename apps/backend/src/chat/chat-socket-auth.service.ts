import { Injectable } from '@nestjs/common';
import { createRemoteJWKSet } from 'jose';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { assertUsableAccount, tokenSubject } from '../auth/session-checks';

// La conexión en vivo acepta exactamente las mismas cuentas que la API:
// token válido, sesión vigente, correo confirmado, perfil y cuenta activa.
@Injectable()
export class ChatSocketAuthService {
  private readonly jwks = createRemoteJWKSet(new URL(process.env.SUPABASE_JWKS_URL!));

  constructor(private readonly prisma: PrismaService, private readonly supabase: SupabaseService) {}

  async verify(token: string): Promise<string> {
    const userId = await tokenSubject(this.jwks, token);
    await assertUsableAccount(this.prisma, this.supabase, token, userId);
    return userId;
  }
}
