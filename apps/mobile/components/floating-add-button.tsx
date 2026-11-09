import type { ComponentProps } from 'react';
import { StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedPressable } from '@/components/animated-pressable';
import { NAV_HEIGHT } from '@/components/nav';
import { fabShadow, petzyColors } from '@/constants/petzy-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Props = {
  onPress: () => void;
  accessibilityLabel: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
};

// Botón de agregar único para las pantallas de lista (publicaciones, mascotas,
// comunidades): flotante y fijo, para que no se pierda al bajar en el scroll
// como pasaba con el botón que vivía arriba en el encabezado. Flota por
// encima de la barra de navegación inferior, con la misma referencia
// (insets.bottom + NAV_HEIGHT) que usa esa barra para su propio margen.
export function FloatingAddButton({ onPress, accessibilityLabel, icon = 'add' }: Props) {
  const dark = useColorScheme() === 'dark';
  const colors = petzyColors[dark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  return <AnimatedPressable
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    onPress={onPress}
    style={[styles.fab, fabShadow(dark), { backgroundColor: colors.accent, bottom: insets.bottom + NAV_HEIGHT + 18 }]}
  >
    <Ionicons name={icon} size={28} color={colors.onAccent} />
  </AnimatedPressable>;
}

const styles = StyleSheet.create({
  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
