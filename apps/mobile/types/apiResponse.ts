import type { MexicoState } from "./mexicoState";

export type ApiResponse = {
    message?: string | string[];
    statusCode?: number;
    user?: User | null;
    access_token?: string;
    refresh_token?: string;
    expires_at?: number | null;
    profileStatus?: 'complete' | 'incomplete' | 'inactive';
    emailConfirmed?: boolean;
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
