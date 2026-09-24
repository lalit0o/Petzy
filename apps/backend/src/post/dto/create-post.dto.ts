import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { PostType } from "src/generated/prisma/enums";

export class CreatePostDto {

    @IsInt()
    @IsOptional()
    communityId?: number

    @IsEnum(PostType, { message: 'El tipo de publicación no es válido' })
    @IsOptional()
    type?: PostType

    @IsString()
    @IsNotEmpty({ message: 'El título es requerido' })
    title!: string

    @IsString()
    @IsNotEmpty({ message: 'La descripción es requerida' })
    description!: string

    @IsString()
    @IsOptional()
    photoUrl?: string
}
