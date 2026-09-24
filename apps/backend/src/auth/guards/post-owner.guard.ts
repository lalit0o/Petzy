import { BadRequestException, CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotFoundError, Observable } from 'rxjs';
import { PrismaService } from 'src/prisma/prisma.service';


@Injectable()
export class PostOwnerGuard implements CanActivate{
    constructor(private readonly prisma: PrismaService){}

    async canActivate(context: ExecutionContext):Promise<boolean>{
        const request = context.switchToHttp().getRequest();
        const authenticatedUserId = request.user?.id;
        const postId = Number(request.params.id);

        if(!Number.isInteger(postId)||postId<=0){
            throw new BadRequestException('El ID de la publicación no es válido');
        }

        const post = await this.prisma.post.findUnique({where:{id:postId},select:{userId:true,isActive:true}});


        if(!post || !post.isActive){
            throw new NotFoundException('La publicación no existe');

        }

        if(post.userId !== authenticatedUserId){
            throw new ForbiddenException('No tienes permiso para editar esta publicación');
        }
        return true;
    }
}


