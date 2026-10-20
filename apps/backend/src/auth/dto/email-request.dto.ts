import { IsEmail } from 'class-validator';

export class EmailRequestDto {
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  email!: string;
}
