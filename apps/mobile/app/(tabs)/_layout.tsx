import { Stack } from 'expo-router';

export default function TabLayout() {
  return (
    <Stack>
      <Stack.Screen name="inicio" options={{ headerShown: false }} />
      <Stack.Screen name="comunidades" options={{ headerShown: false }} />
      <Stack.Screen name="perfil" options={{ headerShown: false }} />
    </Stack>
  );
}
