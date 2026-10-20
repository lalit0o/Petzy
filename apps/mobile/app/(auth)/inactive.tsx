import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthContext } from '@/context/AuthContext';

export default function InactiveAccount() {
  const { logOut } = useAuthContext();
  return <SafeAreaView style={styles.safe}>
    <View style={styles.content}>
      <Text style={styles.title}>Tu cuenta está desactivada</Text>
      <Text style={styles.body}>Tus datos siguen guardados, pero no puedes abrir el contenido de Petzy mientras la cuenta siga desactivada.</Text>
      <Pressable style={styles.button} onPress={() => void logOut()}><Text style={styles.buttonText}>Salir de esta cuenta</Text></Pressable>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F4EA' },
  content: { flex: 1, justifyContent: 'center', padding: 24, gap: 20 },
  title: { color: '#365625', fontSize: 24, fontFamily: 'Nunito_700Bold' },
  body: { color: '#111212', fontSize: 16, lineHeight: 23, fontFamily: 'Nunito_400Regular' },
  button: { minHeight: 52, borderRadius: 12, backgroundColor: '#4C793C', justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Nunito_700Bold' },
});
