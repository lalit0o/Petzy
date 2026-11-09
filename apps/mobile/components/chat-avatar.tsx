import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { petzyColors } from '@/constants/petzy-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { profilePhotoSource } from '@/lib/profiles-api';

// Foto de la otra persona en Chat, con un punto verde cuando está «En línea»
// (D-81), con el verde de éxito de la paleta (D-128). El punto se acompaña
// siempre de texto en la pantalla que lo usa.
export function ChatAvatar({ avatarUrl, token, size, online = false }: { avatarUrl: string | null; token: string; size: number; online?: boolean }) {
  const dark = useColorScheme() === 'dark';
  const colors = petzyColors[dark ? 'dark' : 'light'];
  const [failed, setFailed] = useState(false);
  const dot = Math.max(12, Math.round(size * 0.26));
  return <View style={{ width: size, height: size }}>
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceAlt }]}>
      {avatarUrl && !failed
        ? <Image source={profilePhotoSource(avatarUrl, token)} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory" onError={() => setFailed(true)} />
        : <Ionicons name="person-outline" size={Math.round(size * 0.48)} color={colors.accent} />}
    </View>
    {online ? <View style={[styles.dot, { width: dot, height: dot, borderRadius: dot / 2, backgroundColor: colors.accent, borderColor: colors.background }]} /> : null}
  </View>;
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  dot: { position: 'absolute', right: 0, bottom: 0, borderWidth: 2 },
});
