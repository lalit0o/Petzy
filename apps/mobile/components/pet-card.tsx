import { useState } from 'react';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { petPhotoSource, type Pet } from '@/lib/pets-api';

type Props = { pet: Pet; token: string };

export function PetCard({ pet, token }: Props) {
  const router = useRouter();
  const dark = useColorScheme() === 'dark';
  const colors = dark
    ? { card: '#20311C', text: '#DBDFD0', heading: '#82A87E', border: '#525D48', placeholder: '#404F4D' }
    : { card: '#F8F7F0', text: '#111212', heading: '#365625', border: '#B5AF8B', placeholder: '#DED0A5' };
  const [photoFailed, setPhotoFailed] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={`Ver ficha de ${pet.name}`} onPress={() => router.push((`/pets/${pet.id}`) as Href)} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
    <View style={[styles.image, { backgroundColor: colors.placeholder }]}>
      {pet.photoUrl && !photoFailed
        ? <Image source={petPhotoSource(pet.photoUrl, token)} style={styles.image} contentFit="cover" cachePolicy="none" onError={() => setPhotoFailed(true)} accessibilityLabel={`Foto de ${pet.name}`} />
        : <Ionicons name="paw-outline" size={30} color={colors.heading} />}
    </View>
    <View style={styles.info}>
      <Text style={[styles.name, { color: colors.heading }]}>{pet.name}</Text>
      <Text style={[styles.details, { color: colors.text }]}>{pet.species} · {pet.breed}</Text>
      <Text style={[styles.details, { color: colors.text }]}>{pet.isAgeApproximate ? 'Edad aproximada' : 'Edad'}: {pet.age} {pet.age === 1 ? 'año' : 'años'}</Text>
      {photoFailed ? <Pressable accessibilityRole="button" accessibilityLabel={`Reintentar foto de ${pet.name}`} style={styles.retry} onPress={event => { event.stopPropagation(); setPhotoFailed(false); }}><Text style={[styles.photoError, { color: colors.heading }]}>Reintentar foto</Text></Pressable> : null}
    </View>
    <Ionicons name="chevron-forward" size={18} color={colors.heading} />
  </Pressable>;
}

const styles = StyleSheet.create({
  card: { minHeight: 104, borderWidth: 1, borderRadius: 20, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  image: { width: 78, height: 78, borderRadius: 13, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  info: { flex: 1 }, name: { fontFamily: 'Nunito_700Bold', fontSize: 20 },
  details: { fontFamily: 'Nunito_400Regular', fontSize: 15, lineHeight: 21 },
  retry: { minHeight: 44, justifyContent: 'center' }, photoError: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, marginTop: 2 },
});
