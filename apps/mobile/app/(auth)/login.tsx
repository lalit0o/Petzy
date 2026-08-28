import { useState } from "react";
import { View, Text,StyleSheet, TextInput, Pressable } from "react-native";

export default function Login(){
    const [email,setEmail] = useState<string>('');
    const [password,setPassword] = useState<string>('');
    return(
        <View style={styles.container}>
            <Text style={{color:'white'}}>Login</Text>
            <TextInput value={email} onChangeText={setEmail} placeholder="Ingresa tu email" style={styles.input}></TextInput>
            <TextInput value={password} onChangeText={setPassword} placeholder="Ingresa tu contraseña" style={styles.input}></TextInput>
            <Pressable style={styles.boton}><Text>Iniciar sesión</Text></Pressable>
        </View>
    )
}


const styles = StyleSheet.create({
    container:{
        flex:1,
        justifyContent:'center',
        alignItems:'center',
        gap:12,
    },
    input:{
        padding:12,
        backgroundColor:'red',
        borderRadius:15,
    },
    boton:{
        backgroundColor:'red',
        
    }
})