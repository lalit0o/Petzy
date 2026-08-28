import type { ApiResponse } from "@/types/apiResponse";
import { useEffect, useState } from "react";
import * as SecureStore from 'expo-secure-store'

const TOKEN_KEY = 'token';


export function useAuth(){

    const [user,setUser] = useState(null);
    const [token,setToken] = useState<string | null>(null);
    const [isLoading,setIsLoading] = useState(true);

    useEffect(() => {
        SecureStore.getItemAsync(TOKEN_KEY)
            .then((storedToken) => setToken(storedToken))
            .finally(() => setIsLoading(false));
    }, []);

    async function logIn(email:string,password:string){
        const response = await fetch('http://localhost:3000/auth/sign-in',{
            method:"POST",
            headers:{"content-type":"application/json"},
            body:JSON.stringify({email,password})
        });
        const data : ApiResponse = await response.json();

        
        if(!response.ok){
            throw new Error(data.message||'Error al iniciar sesión. Intenta de nuevo más tarde.');
        }

        setUser(data.user);
        setToken(data.access_token);
        await SecureStore.setItemAsync(TOKEN_KEY, data.access_token);
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
        logIn,
        logOut,
    }

}