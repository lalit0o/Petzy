import {IsEmail, IsEnum, IsOptional, IsString, MinLength} from 'class-validator'

export class CreateUserDto {
    @IsEmail({},{message:'El correo electronico no es valido'})
    email!:string;
    
    @IsString()
    @MinLength(3,{message:'El nombre de usuario debe tener al menos 5 carácteres'})
    username!:string

    @MinLength(8,{message:'La contraseña debe tener al menos 8 carácteres'})
    password!:string

    @IsString()
    @IsOptional()
    avatar?:string

    @IsString()
    @IsOptional()
    bio?:string
}


