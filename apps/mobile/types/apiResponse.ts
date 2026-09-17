import type { MexicoState } from "./mexicoState";

export type ApiResponse = {
    message:string
    statusCode:number
    user?:User
    access_token?:string
}

export type User = {
    id:string;
    email:string;
    username:string;
    avatar:string | null;
    bio:string | null;
    createdAt:string;
    isActive:boolean;
    locatedAt:MexicoState;
}


export type ApiResponseError = {
    message:string;
    statusCode:number;
    error?:string;
}