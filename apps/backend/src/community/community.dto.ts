import { INT32_MAX } from '../common/parse-id.pipe';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CommunityRol } from '../generated/prisma/client';

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;

export class CreateCommunityDto {
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(60)
  name!: string;
  @Transform(trim) @IsString() @MinLength(10) @MaxLength(500)
  description!: string;
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(50)
  topic!: string;
}
export class UpdateCommunityDto extends PartialType(CreateCommunityDto, { skipNullProperties: false }) {}
export class CommunityQuery {
  @IsOptional() @Transform(trim) @IsString() @MinLength(2) @MaxLength(50)
  q?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(INT32_MAX)
  cursor?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(30)
  limit?: number;
  @IsOptional() @Transform(({ value }: { value: unknown }) => value === 'true' ? true : value === 'false' ? false : value) @IsBoolean()
  mine?: boolean;
}
export class MemberQuery {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(128)
  cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(30)
  limit?: number;
}
export class CommunityRoleDto {
  @IsEnum(CommunityRol) role!: CommunityRol;
}
export class ExpelMemberDto {
  @IsString() @MinLength(1) @MaxLength(128) userId!: string;
}
