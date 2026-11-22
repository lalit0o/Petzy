import { Appearance } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Tema elegido por la persona (D-126, DA-T03). «Automático» sigue al teléfono.
// Se guarda en el teléfono con una clave distinta de la sesión: no es un dato
// sensible, pero así no se mezcla con los tokens de Supabase.
export type ThemePreference = 'auto' | 'light' | 'dark';

export const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'auto', label: 'Automático' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
];

const KEY = 'petzy_theme_preference';
let current: ThemePreference = 'auto';

// Aplica el tema a toda la app: todas las pantallas leen `useColorScheme`,
// que respeta este ajuste. «Automático» vuelve a seguir los cambios del teléfono.
function apply(preference: ThemePreference) {
  current = preference;
  Appearance.setColorScheme(preference === 'auto' ? 'unspecified' : preference);
}

export function currentThemePreference() {
  return current;
}

// Se llama al arrancar, antes de ocultar la pantalla de inicio, para no mostrar
// primero el tema equivocado. Si la lectura falla, se queda en «Automático».
export async function loadThemePreference(): Promise<ThemePreference> {
  try {
    const saved = await SecureStore.getItemAsync(KEY);
    apply(saved === 'light' || saved === 'dark' ? saved : 'auto');
  } catch {
    apply('auto');
  }
  return current;
}

// Cambia el tema al momento y lo guarda. Si no se pudo guardar, el tema ya
// cambió en esta sesión y la función avisa para que la pantalla lo explique.
export async function setThemePreference(preference: ThemePreference): Promise<boolean> {
  apply(preference);
  try {
    if (preference === 'auto') await SecureStore.deleteItemAsync(KEY);
    else await SecureStore.setItemAsync(KEY, preference);
    return true;
  } catch {
    return false;
  }
}
