import { Transform } from 'class-transformer';
import { IsString, MinLength, ValidateBy } from 'class-validator';

export class CreateCommentDto {
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @IsString()
    @MinLength(1)
    // Misma medida que TextInput y el contador móvil: unidades UTF-16, no bytes.
    @ValidateBy({ name: 'commentMaxLength', validator: {
      validate: value => typeof value === 'string' && value.length <= 500,
      defaultMessage: () => 'El comentario admite hasta 500 caracteres.',
    } })
    body!:string;
}
