import { ScrollView, View,Text,StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Comunidades(){
    return <SafeAreaView style={style.container}><Text>Comunidades</Text></SafeAreaView>
}



const style = StyleSheet.create({
    container:{
        flex:1,
        backgroundColor:'#39224d',
    }
    
})