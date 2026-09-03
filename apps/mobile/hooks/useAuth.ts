import type { ApiResponse, User } from "@/types/apiResponse";
import { useEffect, useState } from "react";
import * as SecureStore from 'expo-secure-store'

const TOKEN_KEY = 'token';


export function useAuth(){

    const [user,setUser] = useState<User | null>(null);
    const [token,setToken] = useState<string | null>(null);
    const [isLoading,setIsLoading] = useState(true);
    const [authError,setAuthError] = useState<string>('');

    useEffect(() => {
        SecureStore.getItemAsync(TOKEN_KEY)
            .then((storedToken) => setToken(storedToken))
            .finally(() => setIsLoading(false));
    }, []);

    async function logIn(email:string,password:string){
        setAuthError('');

        let response: Response;
        try {
            response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/sign-in`,{
                method:"POST",
                headers:{"content-type":"application/json"},
                body:JSON.stringify({email,password})
            });
        } catch {
            setAuthError('No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.');
            return false;
        }

        const data : ApiResponse = await response.json();

        if(!response.ok){
            setAuthError(data.message || 'Error al iniciar sesión. Intenta de nuevo más tarde.');
            return false;
        }

        setUser(data.user ?? null);
        setToken(data.access_token ?? null);
        if(data.access_token){
            await SecureStore.setItemAsync(TOKEN_KEY, data.access_token);
        }
        return true;
    }

    async function logOut(){
        setUser(null);
        setToken(null);
        await SecureStore.deleteItemAsync(TOKEN_KEY);
    }

    return {
        user,
        token,
        isLoading,
        authError,
        logIn,
        logOut,
    }

}