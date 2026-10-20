import { IsEnum, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { MexicoState } from 'src/generated/prisma/enums';

export class CompleteProfileDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/\S/, { message: 'El nombre de usuario debe contener texto' })
  username!: string;

  @IsEnum(MexicoState)
  locatedAt!: MexicoState;
}
