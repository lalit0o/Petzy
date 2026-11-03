import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router/react-navigation";
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_700Bold_Italic, useFonts } from '@expo-google-fonts/nunito';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthProvider, useAuthContext } from '@/context/AuthContext';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

// La splash se queda visible hasta que la fuente termine de cargar.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_700Bold_Italic,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  // expo-router ya monta un SafeAreaProvider internamente; este lo deja
  // explicito para que los insets de las pantallas no dependan de eso.
  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
        <StatusBar style="auto" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { status, sessionError, checkSession, logOut } = useAuthContext();
  const dark = useColorScheme() === 'dark';

  // Mientras no haya un estado con pantallas propias, no se monta el Stack:
  // con cero rutas protegidas activas, el navegador nativo cae en su
  // pantalla "Unmatched Route", y un overlay en RN no la cubre de forma
  // confiable porque esa pantalla vive en una superficie nativa aparte.
  if (status === 'checking') {
    return <View style={[styles.sessionState, dark && styles.sessionStateDark]}>
      <ActivityIndicator color={dark ? '#82A87E' : '#4C793C'} />
      <Text style={[styles.sessionText, dark && styles.sessionTextDark]}>Comprobando tu sesión…</Text>
    </View>;
  }
  if (status === 'retry') {
    return <View style={[styles.sessionState, dark && styles.sessionStateDark]}>
      <Text style={[styles.sessionTitle, dark && styles.sessionTitleDark]}>No pudimos comprobar tu sesión</Text>
      <Text style={[styles.sessionText, dark && styles.sessionTextDark]}>{sessionError}</Text>
      <Pressable style={styles.sessionButton} onPress={() => void checkSession()}><Text style={styles.sessionButtonText}>Reintentar</Text></Pressable>
      <Pressable onPress={() => void logOut()}><Text style={styles.sessionLink}>Iniciar sesión de nuevo</Text></Pressable>
    </View>;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={status === 'ready'}>
        <Stack.Screen name='(tabs)' options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={status !== 'ready'}>
        <Stack.Screen name='(auth)' options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Screen name='auth/callback' options={{ headerShown: false }} />
      <Stack.Screen name='auth/process-link' options={{ headerShown: false }} />
      <Stack.Screen name='auth/confirmed' options={{ headerShown: false }} />
      <Stack.Screen name='auth/link-error' options={{ headerShown: false }} />
      <Stack.Screen name='auth/reset-request' options={{ headerShown: false }} />
      <Stack.Screen name='auth/reset-password' options={{ headerShown: false }} />
    </Stack>
  )
}

const styles = StyleSheet.create({
  sessionState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#DBDFD0', gap: 16 },
  sessionStateDark: { backgroundColor: '#182213' },
  sessionTitle: { fontSize: 21, fontFamily: 'Nunito_700Bold', color: '#365625', textAlign: 'center' },
  sessionTitleDark: { color: '#82A87E' },
  sessionText: { fontSize: 16, fontFamily: 'Nunito_400Regular', color: '#111212', textAlign: 'center' },
  sessionTextDark: { color: '#DBDFD0' },
  sessionButton: { backgroundColor: '#4C793C', paddingVertical: 13, paddingHorizontal: 24, borderRadius: 12 },
  sessionButtonText: { color: '#FFFFFF', fontFamily: 'Nunito_700Bold', fontSize: 16 },
  sessionLink: { color: '#365625', fontFamily: 'Nunito_700Bold', fontSize: 16 },
});
