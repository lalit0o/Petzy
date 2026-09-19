import {Text,View,StyleSheet} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function Feed(){
    return (<SafeAreaView style={styles.container}>
        <Text style={styles.texto}>Feed</Text>
        </SafeAreaView>)
}



const styles = StyleSheet.create({
    container:{
        flex:1,
        backgroundColor:'white',
    },
    texto:{
        fontSize:30,
        color:'purple',
    }

})
