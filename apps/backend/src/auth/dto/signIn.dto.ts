import { IsEmail,IsString,MinLength } from "class-validator";

export class SignInDto {
    @IsEmail({}, { message: "El correo electrónico no es válido" })

    email!: string
    @IsString()
    password!:string

}