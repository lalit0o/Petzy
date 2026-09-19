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
      <Tabs.Screen name="comunidades" options={{ title: 'Comunidades' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Mi perfil' }} />
    </Tabs>
  );
}
