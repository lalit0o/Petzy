import { IsEnum, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';
import { MexicoState } from '../../generated/prisma/enums';

export class UpdateProfileDto {
  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/\S/, { message: 'El nombre de usuario debe contener texto.' })
  username?: string;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(300)
  bio?: string | null;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(MexicoState)
  locatedAt?: MexicoState;
}
