import { Tabs } from 'expo-router';
import React from 'react';

import Nav from '@/components/nav';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={() => <Nav />}
      screenOptions={{
        headerShown: false,
      }}>
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="buscar" options={{ title: 'Buscar' }} />
      <Tabs.Screen name="comunidades" options={{ title: 'Comunidades' }} />
      <Tabs.Screen name="adopcion" options={{ title: 'Adopción' }} />
      <Tabs.Screen name="mensajes" options={{ title: 'Mensajes' }} />
      {/* Sin pestaña propia (D-150): se abre desde «Mis mascotas» en Mi perfil. */}
      <Tabs.Screen name="mascotas" options={{ title: 'Mis mascotas' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Mi perfil' }} />
    </Tabs>
  );
}
