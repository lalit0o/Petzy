import { View,Text,StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";


interface opciones{
    nombre:string;
    url:string;
}

export default function Nav(){
    const router = useRouter();
    const options:opciones[]=[{nombre:"Inicio",url:"/(tabs)/inicio"},{nombre:"Comunidades",url:"/(tabs)/comunidades"},{nombre:"Mi perfil",url:"/(tabs)/perfil"}]
    return(<View style={styles.nav}>
        {options.map((op)=>(
            <Pressable key={op.url} onPress={()=>router.push(op.url)}>
                <Text>{op.nombre}</Text>
            </Pressable>
            
        ))}
    </View>)
}


const styles = StyleSheet.create({
    nav:{
        flex:1,
        flexDirection:'column',
        backgroundColor:'pink',
        borderRadius:20,

    }

})