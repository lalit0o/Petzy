import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { jwtVerify,createRemoteJWKSet } from "jose";
import {Reflector} from '@nestjs/core'
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { ALLOW_PROFILE_SETUP_KEY } from '../decorators/allow-profile-setup.decorator';
import { ALLOW_INACTIVE_PROFILE_KEY } from '../decorators/allow-inactive-profile.decorator';
import { PrismaService } from 'src/prisma/prisma.service';
import { SupabaseService } from 'src/supabase/supabase.service';

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


        try {
            const {payload} = await jwtVerify(token,this.jwks);
            if(!payload.sub) throw new Error('Token sin sub');
            request.user = {id:payload.sub};
        }catch{
            throw new UnauthorizedException('Token inválido o expirado');
        }

        const allowProfileSetup = this.reflector.getAllAndOverride<boolean>(
            ALLOW_PROFILE_SETUP_KEY,
            [context.getHandler(), context.getClass()],
        );
        if (allowProfileSetup) return true;

        const { data, error } = await this.supabase.getClient().auth.getUser(token);
        if (error || !data.user || data.user.id !== request.user.id) {
            throw new UnauthorizedException('La sesión ya no es válida. Inicia sesión de nuevo.');
        }
        if (!data.user.email_confirmed_at) {
            throw new ForbiddenException({
                code: 'EMAIL_NOT_CONFIRMED',
                message: 'Confirma tu correo para entrar.',
            });
        }

        const profile = await this.prisma.user.findUnique({
            where: { id: request.user.id },
            select: { isActive: true },
        });
        if (!profile) {
            throw new ForbiddenException({
                code: 'PROFILE_INCOMPLETE',
                message: 'Completa tu perfil para continuar.',
            });
        }
        const allowInactive = this.reflector.getAllAndOverride<boolean>(ALLOW_INACTIVE_PROFILE_KEY, [context.getHandler(), context.getClass()]);
        if (!profile.isActive && !allowInactive) {
            throw new ForbiddenException({
                code: 'ACCOUNT_INACTIVE',
                message: 'Esta cuenta está desactivada.',
            });
        }

        return true;
    }
}
