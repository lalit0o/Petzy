import { ScrollView, View,Text,StyleSheet, Pressable } from "react-native";
import { useAuthContext } from "@/context/AuthContext";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Perfil(){
    const {logOut,user} = useAuthContext();
    return <SafeAreaView style={style.container}>
        <Text>Mi perfil</Text>
        <Text>{user?.username}</Text>
        <Text>{user?.avatar}</Text>
        <Text>{user?.email}</Text>
        <Pressable onPress={logOut} style={style.buton}><Text>Cerrar sesion</Text></Pressable>
        </SafeAreaView>
}



const style = StyleSheet.create({
    container:{
        flex:1,
        justifyContent:'center',
        alignItems:'center',
        backgroundColor:'blue',
    },
    buton:{
        backgroundColor:'red',
        padding:10,
        borderRadius:15,

    }
    
})