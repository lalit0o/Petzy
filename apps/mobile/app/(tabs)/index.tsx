import { useEffect } from 'react';
import {Text,View,StyleSheet} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function Feed(){
    useEffect(()=>{
        
    })
    return (<SafeAreaView style={styles.container}>
        <Text style={styles.texto}>Feed</Text>
        </SafeAreaView>)
}



const styles = StyleSheet.create({
    container:{
        flex:1,
        backgroundColor:'#39224d',
    },
    texto:{
        fontSize:30,
        color:'purple',
    }

})
