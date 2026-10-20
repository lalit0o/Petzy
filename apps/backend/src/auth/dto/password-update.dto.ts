import { IsString, MinLength } from 'class-validator';

export class PasswordUpdateDto {
  @IsString()
  @MinLength(1)
  access_token!: string;

  @IsString()
  @MinLength(1)
  refresh_token!: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password!: string;
}
