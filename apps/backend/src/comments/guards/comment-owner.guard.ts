import { BadRequestException, CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";


@Injectable()

export class CommentOwnerGuard implements CanActivate{
    constructor(private readonly prisma:PrismaService){}


    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const authenticatedUserId = request.user?.id;
        const commentId = Number(request.params.commentId);

        const postId = Number(request.params.postId);
        if(!Number.isInteger(commentId)||commentId<=0||!Number.isInteger(postId)||postId<=0){
            throw new BadRequestException("El comentario buscado no existe");
        }

        const comment = await this.prisma.comment.findFirst({where:{id:commentId,postId,isActive:true},select:{userId:true}});

        if(!comment){
            throw new NotFoundException("El comentario no existe");
        }

        if(comment?.userId!==authenticatedUserId){
            throw new ForbiddenException("No tienes permiso para editar este comentario");
        }

        return true;


        
    }

}
