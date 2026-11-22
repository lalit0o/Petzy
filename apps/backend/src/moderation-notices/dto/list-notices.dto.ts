import { INT32_MAX } from '../../common/parse-id.pipe';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListNoticesDto {
  // `pending=true` devuelve solo avisos que la persona aún no confirmó y que siguen vigentes.
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' ? true : value === false || value === 'false' ? false : value)
  @IsBoolean()
  pending?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1) @Max(INT32_MAX)
  cursor?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  limit?: number;
}
