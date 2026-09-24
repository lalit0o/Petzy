import {Text,View,StyleSheet} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Nunito } from '@/constants/theme';


export default function Mascotas(){
    return (<SafeAreaView style={styles.container}>
        <Text style={styles.texto}>Mascotas</Text>
        </SafeAreaView>)
}



const styles = StyleSheet.create({
    container:{
        flex:1,
        backgroundColor:'#39224d',
        alignItems:'center'
    },
    texto:{
        fontSize:30,
        color:'white',
        fontFamily:Nunito.bold
    }

})
