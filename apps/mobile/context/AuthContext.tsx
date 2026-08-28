import { createContext,useContext } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ReactNode } from "react";


const AuthContext = createContext<ReturnType<typeof useAuth>| null>(null);

export function AuthProvider({children}:{children:React.ReactNode}){
    const auth = useAuth();
    return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>

}

export function useAuthContext(){
    const context = useContext(AuthContext);
    if(context===null){
        throw new Error ("useAuthContext debe usarse dentro de un AuthProvider");
    }

    return context;
}