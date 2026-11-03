import { useState } from 'react';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { AnimatedPressable } from '@/components/animated-pressable';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { cardShadow, iconSize, petzyColors, radius, spacing } from '@/constants/petzy-theme';
import { petPhotoSource, type Pet } from '@/lib/pets-api';

type Props = { pet: Pet; token: string };

export function PetCard({ pet, token }: Props) {
  const router = useRouter();
  const dark = useColorScheme() === 'dark';
  const colors = petzyColors[dark ? 'dark' : 'light'];
  const [photoFailed, setPhotoFailed] = useState(false);
  return <AnimatedPressable accessibilityRole="button" accessibilityLabel={`Ver ficha de ${pet.name}`} onPress={() => router.push((`/pets/${pet.id}`) as Href)} style={[styles.card, cardShadow(dark), { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <View style={[styles.image, { backgroundColor: colors.surfaceAlt }]}>
      {pet.photoUrl && !photoFailed
        ? <Image source={petPhotoSource(pet.photoUrl, token)} style={styles.image} contentFit="cover" cachePolicy="none" onError={() => setPhotoFailed(true)} accessibilityLabel={`Foto de ${pet.name}`} />
        : <Ionicons name="paw-outline" size={iconSize.md} color={colors.accent} />}
    </View>
    <View style={styles.info}>
      <Text style={[styles.name, { color: colors.accent }]}>{pet.name}</Text>
      <Text style={[styles.details, { color: colors.textPrimary }]}>{pet.species} · {pet.breed}</Text>
      <Text style={[styles.details, { color: colors.textPrimary }]}>{pet.isAgeApproximate ? 'Edad aproximada' : 'Edad'}: {pet.age} {pet.age === 1 ? 'año' : 'años'}</Text>
      {photoFailed ? <Pressable accessibilityRole="button" accessibilityLabel={`Reintentar foto de ${pet.name}`} style={styles.retry} onPress={event => { event.stopPropagation(); setPhotoFailed(false); }}><Text style={[styles.photoError, { color: colors.accent }]}>Reintentar foto</Text></Pressable> : null}
    </View>
    <Ionicons name="chevron-forward" size={iconSize.xs} color={colors.accent} />
  </AnimatedPressable>;
}

const styles = StyleSheet.create({
  card: { minHeight: 128, borderWidth: 1, borderRadius: radius.xl, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  image: { width: 96, height: 96, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  info: { flex: 1 }, name: { fontFamily: 'Nunito_700Bold', fontSize: 20 },
  details: { fontFamily: 'Nunito_400Regular', fontSize: 15, lineHeight: 21 },
  retry: { minHeight: 44, justifyContent: 'center' }, photoError: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, marginTop: 2 },
});
