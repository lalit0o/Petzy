import { INT32_MAX } from '../../common/parse-id.pipe';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PostType } from 'src/generated/prisma/enums';

export class ListPostsDto {
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

  @IsOptional()
  @IsEnum(PostType)
  type?: PostType;
}
