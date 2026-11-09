import { ArrayMaxSize, ArrayUnique, IsArray, IsInt, IsOptional, Min } from 'class-validator';

export class AcknowledgeNoticesDto {
  // Sin `ids` se confirman todos los pendientes; la app envía los que mostró para
  // no confirmar un aviso que llegó mientras la persona leía.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  ids?: number[];
}
