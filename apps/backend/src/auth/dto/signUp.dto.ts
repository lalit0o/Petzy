import { IsEmail, IsEnum, IsString, Matches, MaxLength, MinLength } from "class-validator";
import { MexicoState } from "src/generated/prisma/enums";


export class SignUpDto {
    @IsEmail({},{message:"El correo electrónico no es válido"})
    email!:string

    @IsString()
    @MinLength(3,{message:"El nombre de usuario debe tener al menos 3 carácteres"})
    @MaxLength(30,{message:"El nombre de usuario debe tener como máximo 30 caracteres"})
    @Matches(/\S/,{message:"El nombre de usuario debe contener texto"})
    username!:string

    @IsString()
    @MinLength(8,{message:"La contraseña debe tener al menos 8 carácteres"})
    password!:string

    @IsEnum(MexicoState,{message:"El estado seleccionado no es válido"})
    locatedAt!:MexicoState
}
