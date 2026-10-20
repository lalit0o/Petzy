import { IsEmpty, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { PostType } from 'src/generated/prisma/enums';

export class CreatePostDto {
  @IsEnum(PostType, { message: 'Elige una categoría válida' })
  type!: PostType;

  @IsString()
  @IsNotEmpty({ message: 'Escribe un título' })
  @MinLength(1)
  @MaxLength(120, { message: 'El título admite hasta 120 caracteres' })
  title!: string;

  @IsString()
  @IsNotEmpty({ message: 'Escribe una descripción' })
  @MinLength(1)
  @MaxLength(3000, { message: 'La descripción admite hasta 3 000 caracteres' })
  description!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  petId?: number;

  @IsEmpty({ message: 'La comunidad se determina por la pantalla desde donde publicas' })
  communityId?: never;

  @IsEmpty({ message: 'El autor se obtiene de la sesión' })
  userId?: never;

  @IsEmpty({ message: 'La foto se envía como archivo, no como URL' })
  photoUrl?: never;
}
