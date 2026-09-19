import Nav from '@/components/nav';
import {Text,View,StyleSheet} from 'react-native';

export default function Inicio(){
    return (<View style={styles.container}><Text style={styles.texto} >Mi perfil</Text><Nav/></View>)
}



const styles = StyleSheet.create({
    container:{
        flex:1,
    },
    texto:{
        fontSize:30,
        color:'purple',
    }

})

