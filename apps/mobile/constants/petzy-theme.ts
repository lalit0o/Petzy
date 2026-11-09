// Tokens formales de la dirección de diseño aprobada de Petzy (D-120–D-133,
// docs/06-DISENO-DE-INTERFACES.md). No introduce colores nuevos: reúne en un
// solo lugar los HEX ya usados en Mascotas/Perfiles para evitar que cada
// pantalla repita su propia copia de la paleta.
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;

export const radius = { sm: 12, md: 14, lg: 18, xl: 22, pill: 999 } as const;

export const iconSize = { xs: 18, sm: 20, md: 32, lg: 42, xl: 72 } as const;

export const petzyColors = {
  light: {
    background: '#F8F7F0',
    surface: '#FFFFFF',
    surfaceAlt: '#DED0A5',
    textPrimary: '#111212',
    accent: '#365625',
    border: '#B5AF8B',
    muted: '#525D48',
    onAccent: '#FFFFFF',
    error: '#8C3F37',
  },
  dark: {
    background: '#182213',
    surface: '#2C4024',
    surfaceAlt: '#404F4D',
    textPrimary: '#DBDFD0',
    accent: '#82A87E',
    border: '#525D48',
    muted: '#B5AF8B',
    onAccent: '#182213',
    error: '#F0A59A',
  },
} as const;

export type PetzyColors = typeof petzyColors.light;

// Profundidad de tarjetas. En claro, sombra cálida tonal (no negro genérico).
// En oscuro, una sombra oscura no se nota sobre un fondo ya casi negro — en
// su lugar se usa un resplandor claro con el verde de acento, el equivalente
// a "aclarar la superficie elevada" que usan Material/Apple en temas oscuros.
export function cardShadow(dark: boolean) {
  return dark
    ? {
        shadowColor: '#9CC28F',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
      } as const
    : {
        shadowColor: '#2E3B22',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.13,
        shadowRadius: 8,
        elevation: 3,
      } as const;
}

// Elevación del botón flotante de agregar: más fuerte que la de una tarjeta
// porque debe leerse por encima de todo el contenido, no solo separarse de
// la superficie debajo. Mismo criterio claro/oscuro que cardShadow.
export function fabShadow(dark: boolean) {
  return dark
    ? { shadowColor: '#9CC28F', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 10 } as const
    : { shadowColor: '#1D2A14', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 8 } as const;
}
