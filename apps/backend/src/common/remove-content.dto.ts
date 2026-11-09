import { Transform } from 'class-transformer';
import { IsEnum, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { RemovalReason } from '../generated/prisma/enums';

// D-140: motivo de lista cerrada y nota de hasta 200 caracteres; la nota es
// obligatoria con «Otro». Se mide en unidades UTF-16, igual que el contador móvil.
export class RemoveContentDto {
  @IsEnum(RemovalReason, { message: 'Elige un motivo de la lista.' })
  reason!: RemovalReason;

  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  })
  @ValidateIf((dto: RemoveContentDto) => dto.reason === RemovalReason.OTHER || dto.note !== undefined)
  @IsString({ message: 'Cuéntanos el motivo en la nota.' })
  @MinLength(1, { message: 'Cuéntanos el motivo en la nota.' })
  @MaxLength(200, { message: 'La nota admite hasta 200 caracteres.' })
  note?: string;
}
