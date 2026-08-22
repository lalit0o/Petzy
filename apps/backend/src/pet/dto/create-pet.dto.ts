import { IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreatePetDto {
    
    @IsInt()
    @IsNotEmpty({message:'El ownerId es requerido'})
    ownerId!:string

    @IsString()
    name!:string

    @IsInt()
    age!:number

    @IsOptional()
    photo?:string

    @IsString()
    bio!:string
}
