import { BadRequestException, CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";


@Injectable()

export class CommentOwnerGuard implements CanActivate{
    constructor(private readonly prisma:PrismaService){}


    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const authenticatedUserId = request.user?.id;
        const commentId = Number(request.params.commentId);

        if(!Number.isInteger(request.params.id)||commentId<=0){
            throw new BadRequestException("El comentario buscado no existe");
        }

        const comment = await this.prisma.comment.findUnique({where:{id:commentId},select:{userId:true,isActive:true}});

        if(!comment?.isActive || !comment){
            throw new NotFoundException("La publicación no existe");
        }

        if(comment?.userId!==authenticatedUserId){
            throw new ForbiddenException("No tienes permiso para editar este comentario");
        }

        return true;


        
    }

}