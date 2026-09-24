import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { jwtVerify,createRemoteJWKSet } from "jose";
import {Reflector} from '@nestjs/core'
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

@Injectable()
export class SupabaseAuthGuard implements CanActivate{
    private readonly jwks;

    constructor(private reflector: Reflector){
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

        return true;        
    }
}