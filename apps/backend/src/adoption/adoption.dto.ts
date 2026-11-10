import { Transform, Type } from 'class-transformer';
import { Equals, IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { AdoptionReportReason, AdoptionStatus } from '../generated/prisma/enums';
import { DESCRIPTION_MAX, EXPLANATION_MAX, TITLE_MAX } from './adoption-rules';

// Los formularios llegan como multipart: todos los campos son texto.
const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;
const optionalText = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const text = value.trim();
  return text ? text : undefined;
};
// «Sin ficha»: cadena vacía o «none» quitan el vínculo; un número lo pone.
const petIdValue = ({ value }: { value: unknown }) => {
  if (value === '' || value === 'none' || value === null) return null;
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  return value;
};
// Lista de ids de foto a conservar, en orden: «3,5» o «» para no conservar ninguna.
const idList = ({ value }: { value: unknown }) => {
  if (Array.isArray(value)) return value.map(Number);
  if (typeof value !== 'string') return value;
  return value.trim() ? value.split(',').map(part => Number(part.trim())) : [];
};

export class CreateAdoptionDto {
  @Transform(trim) @IsString() @MinLength(1, { message: 'Escribe un título.' }) @MaxLength(TITLE_MAX, { message: `El título admite hasta ${TITLE_MAX} caracteres.` })
  title!: string;

  @Transform(trim) @IsString() @MinLength(1, { message: 'Escribe una descripción.' }) @MaxLength(DESCRIPTION_MAX, { message: 'La descripción admite hasta 3 000 caracteres.' })
  description!: string;

  @IsOptional() @Transform(petIdValue) @IsInt({ message: 'Elige una de tus mascotas o ninguna.' }) @Min(1, { message: 'Elige una de tus mascotas o ninguna.' })
  petId?: number | null;

  // D-95: la persona confirma «Solo adopciones, no ventas».
  @Equals('true', { message: 'Confirma que el anuncio es solo para adopción, sin venta.' })
  acceptNoSale!: string;
}

export class UpdateAdoptionDto {
  @IsOptional() @Transform(trim) @IsString() @MinLength(1, { message: 'Escribe un título.' }) @MaxLength(TITLE_MAX, { message: `El título admite hasta ${TITLE_MAX} caracteres.` })
  title?: string;

  @IsOptional() @Transform(trim) @IsString() @MinLength(1, { message: 'Escribe una descripción.' }) @MaxLength(DESCRIPTION_MAX, { message: 'La descripción admite hasta 3 000 caracteres.' })
  description?: string;

  @IsOptional() @Transform(petIdValue) @IsInt({ message: 'Elige una de tus mascotas o ninguna.' }) @Min(1, { message: 'Elige una de tus mascotas o ninguna.' })
  petId?: number | null;

  @IsOptional() @IsEnum(AdoptionStatus, { message: 'Elige «Busca hogar» o «Encontró hogar».' })
  status?: AdoptionStatus;

  // Si llega, define las fotos que se quedan (en orden); las nuevas van después.
  @IsOptional() @Transform(idList) @IsInt({ each: true, message: 'Una de las fotos no es válida.' }) @Min(1, { each: true, message: 'Una de las fotos no es válida.' })
  keepPhotoIds?: number[];
}

export class ListAdoptionsDto {
  @IsOptional() @IsEnum(AdoptionStatus, { message: 'El filtro de estado no es válido.' })
  status?: AdoptionStatus;

  @IsOptional() @IsString() @Matches(/^[SF]-\d{1,10}$/, { message: 'La página de adopciones ya no está disponible. Vuelve a cargar la lista.' })
  cursor?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(30)
  limit?: number;
}

export class ListWithdrawnDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  cursor?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(30)
  limit?: number;
}

export class ReportAdoptionDto {
  @IsEnum(AdoptionReportReason, { message: 'Elige un motivo para el reporte.' })
  reason!: AdoptionReportReason;

  @IsOptional() @Transform(optionalText) @IsString() @MaxLength(EXPLANATION_MAX, { message: `La explicación admite hasta ${EXPLANATION_MAX} caracteres.` })
  explanation?: string;
}
