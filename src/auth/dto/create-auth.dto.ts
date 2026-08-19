import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from "class-validator";
import { MexicoState } from "src/generated/prisma/enums";


export class CreateAuthDto {
    @IsEmail({},{message:"El correo electrónico no es válido"})
    email!:string

    @IsString()
    @MinLength(3,{message:"El nombre de usuario debe tener al menos 3 carácteres"})
    username!:string

    @MinLength(8,{message:"La contraseña debe tener al menos 8 carácteres"})
    password!:string

    @IsString()
    @IsOptional()
    avatar?:string

    @IsString()
    @IsOptional()
    bio?:string

    @IsEnum(MexicoState,{message:"El estado seleccionado no es válido"})
    locatedAt!:MexicoState
}
