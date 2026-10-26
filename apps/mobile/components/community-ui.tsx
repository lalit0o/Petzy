import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useCommunityColors() {
  return useColorScheme() === 'dark'
    ? { bg: '#182213', card: '#20311C', text: '#DBDFD0', heading: '#82A87E', border: '#525D48', muted: '#B5AF8B', error: '#F0A59A', actionText: '#182213' }
    : { bg: '#DBDFD0', card: '#F8F7F0', text: '#111212', heading: '#365625', border: '#B5AF8B', muted: '#525D48', error: '#8C3F37', actionText: '#FFFFFF' };
}
export const roleLabel = { ADMIN: 'Administrador', MODERATOR: 'Moderador', MEMBER: 'Miembro' };
export function CommunityButton({ label, onPress, busy = false, secondary = false, destructive = false, disabled = false }: { label: string; onPress: () => void; busy?: boolean; secondary?: boolean; destructive?: boolean; disabled?: boolean }) {
  const c = useCommunityColors();
  const color = destructive ? c.error : c.heading;
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy} onPress={onPress} style={({ pressed }) => [ui.button, { backgroundColor: secondary ? 'transparent' : color, borderColor: color, opacity: pressed || disabled ? 0.6 : 1 }]}>
    {busy ? <ActivityIndicator color={secondary ? color : c.actionText} /> : <Text style={[ui.buttonText, { color: secondary ? color : c.actionText }]}>{label}</Text>}
  </Pressable>;
}
export function CommunityCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useCommunityColors();
  return <View style={[ui.card, { backgroundColor: c.card, borderColor: c.border }, style]}>{children}</View>;
}
export function CommunityMessage({ text, error = false }: { text: string; error?: boolean }) {
  const c = useCommunityColors();
  return text ? <Text accessibilityLiveRegion="polite" style={[ui.body, { color: error ? c.error : c.heading }]}>{text}</Text> : null;
}
export const ui = StyleSheet.create({
  screen: { flex: 1 }, content: { padding: 16, paddingBottom: 40, gap: 14 },
  title: { fontFamily: 'Nunito_700Bold', fontSize: 28, lineHeight: 36 }, heading: { fontFamily: 'Nunito_700Bold', fontSize: 21, lineHeight: 28 },
  body: { fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 24 }, muted: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, lineHeight: 21 },
  card: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 10 }, row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  button: { minHeight: 46, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, justifyContent: 'center', alignItems: 'center' }, buttonText: { fontFamily: 'Nunito_700Bold', fontSize: 15, textAlign: 'center' },
  input: { borderWidth: 1, borderRadius: 14, minHeight: 52, paddingHorizontal: 12, fontFamily: 'Nunito_400Regular', fontSize: 16 },
  label: { fontFamily: 'Nunito_700Bold', fontSize: 16 }, back: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
});
