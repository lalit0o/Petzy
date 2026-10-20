import { Transform, Type } from 'class-transformer';
import { IsDefined, IsInt, IsOptional, IsString, Matches, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

export class PetBirthDto {
  @IsInt()
  @Min(1)
  year!: number;

  @IsInt()
  @Min(1)
  month!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  day?: number | null;
}

export class CreatePetDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name!: string;

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^(?!otra$).+/i, { message: 'Escribe la especie cuando eliges «Otra».' })
  species!: string;

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  breed!: string;

  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MaxLength(300)
  bio?: string | null;

  @IsDefined()
  @ValidateNested()
  @Type(() => PetBirthDto)
  birth!: PetBirthDto;
}
