import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AnimatedPressable } from '@/components/animated-pressable';
import { cardShadow, petzyColors, radius, spacing } from '@/constants/petzy-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { adoptionPhotoSource, STATUS_LABEL, type Adoption, type AdoptionStatus } from '@/lib/adoptions-api';
import { formatRelativeTime } from '@/lib/format';

// Etiqueta de estado: «Busca hogar» destaca en verde; «Encontró hogar» queda
// en tono neutro con su propio icono, para no depender solo del color.
export function AdoptionStatusChip({ status }: { status: AdoptionStatus }) {
  const dark = useColorScheme() === 'dark'; const c = petzyColors[dark ? 'dark' : 'light'];
  const seeking = status === 'SEEKING_HOME';
  return <View style={[styles.chip, { backgroundColor: seeking ? c.accent : c.surfaceAlt }]}>
    <Ionicons name={seeking ? 'heart' : 'home'} size={14} color={seeking ? c.onAccent : c.textPrimary} />
    <Text style={[styles.chipText, { color: seeking ? c.onAccent : c.textPrimary }]}>{STATUS_LABEL[status]}</Text>
  </View>;
}

// Tarjeta de un anuncio (AD-T12): la foto del animal es lo primero que se ve.
export function AdoptionCard({ item, token, onPress, footer }: { item: Adoption; token: string; onPress: () => void; footer?: ReactNode }) {
  const dark = useColorScheme() === 'dark'; const c = petzyColors[dark ? 'dark' : 'light'];
  const [failed, setFailed] = useState(false);
  const photo = item.photos[0];
  return <View style={[styles.card, cardShadow(dark), { backgroundColor: c.surface, borderColor: c.border }]}>
    <AnimatedPressable accessibilityRole="button" accessibilityLabel={`${item.title}. ${STATUS_LABEL[item.status]}. Publicado por ${item.author.username}`} onPress={onPress}>
      <View style={[styles.photo, { backgroundColor: c.surfaceAlt }]}>
        {photo && !failed ? <Image source={adoptionPhotoSource(photo.url, token)} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory" onError={() => setFailed(true)} />
          : <Ionicons name="paw-outline" size={40} color={c.muted} />}
        {item.photos.length > 1 ? <View style={styles.count}><Ionicons name="images-outline" size={13} color="#FFFFFF" /><Text style={styles.countText}>{item.photos.length}</Text></View> : null}
      </View>
      <View style={styles.body}>
        <AdoptionStatusChip status={item.status} />
        <Text numberOfLines={2} style={[styles.title, { color: c.accent }]}>{item.title}</Text>
        <Text numberOfLines={1} style={[styles.meta, { color: c.muted }]}>{item.mine ? 'Tu anuncio' : item.author.username} · {formatRelativeTime(item.createdAt)}</Text>
      </View>
    </AnimatedPressable>
    {footer}
  </View>;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.xl, overflow: 'hidden', marginBottom: spacing.md },
  // 4:3 como la foto de las publicaciones (22-11-2026); antes 200 px fijos que recortaban más.
  photo: { width: '100%', aspectRatio: 4 / 3, alignItems: 'center', justifyContent: 'center' },
  count: { position: 'absolute', right: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  countText: { color: '#FFFFFF', fontFamily: 'Nunito_700Bold', fontSize: 12 },
  body: { padding: spacing.lg, gap: spacing.xs, alignItems: 'flex-start' },
  title: { fontFamily: 'Nunito_700Bold', fontSize: 18, lineHeight: 24, marginTop: 2 },
  meta: { fontFamily: 'Nunito_400Regular', fontSize: 14 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontFamily: 'Nunito_700Bold', fontSize: 13 },
});
