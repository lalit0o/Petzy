import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { createRemoteJWKSet } from "jose";
import {Reflector} from '@nestjs/core'
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { ALLOW_PROFILE_SETUP_KEY } from '../decorators/allow-profile-setup.decorator';
import { ALLOW_INACTIVE_PROFILE_KEY } from '../decorators/allow-inactive-profile.decorator';
import { PrismaService } from 'src/prisma/prisma.service';
import { SupabaseService } from 'src/supabase/supabase.service';
import { assertUsableAccount, tokenSubject } from '../session-checks';

@Injectable()
export class SupabaseAuthGuard implements CanActivate{
    private readonly jwks;

    constructor(private reflector: Reflector, private prisma: PrismaService, private supabase: SupabaseService){
        this.jwks = createRemoteJWKSet(new URL(process.env.SUPABASE_JWKS_URL!));
    }

    async canActivate(context:ExecutionContext) : Promise<boolean>{
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY,[
            context.getHandler(),
            context.getClass(),
        ]);
        if(isPublic) return true;

        const request = context.switchToHttp().getRequest();


        const [type,token] = request.headers.authorization?.split(' ') ?? [];
        if(type!=='Bearer'|| !token){
            throw new UnauthorizedException('Token requerido');
        }

        request.user = { id: await tokenSubject(this.jwks, token) };

        const allowProfileSetup = this.reflector.getAllAndOverride<boolean>(
            ALLOW_PROFILE_SETUP_KEY,
            [context.getHandler(), context.getClass()],
        );
        if (allowProfileSetup) return true;

        const allowInactive = this.reflector.getAllAndOverride<boolean>(ALLOW_INACTIVE_PROFILE_KEY, [context.getHandler(), context.getClass()]);
        await assertUsableAccount(this.prisma, this.supabase, token, request.user.id, allowInactive);

        return true;
    }
}
