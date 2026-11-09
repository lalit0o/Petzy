import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, type Href } from 'expo-router';

import { petPhotoSource } from '@/lib/pets-api';
import { photoSource } from '@/lib/posts-api';
import { profilePhotoSource } from '@/lib/profiles-api';
import { formatRelativeTime } from '@/lib/format';
import { cardShadow, petzyColors } from '@/constants/petzy-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { POST_CATEGORIES, type PostSummary } from '@/types/post';

// Tarjeta de publicación compartida entre el Feed general y la pestaña
// "Publicaciones" de una comunidad — antes eran dos implementaciones
// distintas (la de comunidad ni mostraba foto de perfil ni mascota
// enlazada); ahora es una sola fuente de verdad para que no se vuelvan a
// desalinear.
export function PostCard({ post, token }: { post: PostSummary; token: string | null }) {
  const router = useRouter();
  const dark = useColorScheme() === 'dark';
  const c = petzyColors[dark ? 'dark' : 'light'];
  const [photoFailed, setPhotoFailed] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const avatarUrl = post.user.hasAvatar ? `/users/${post.user.id}/avatar` : null;

  return <Pressable accessibilityRole="button" accessibilityLabel={`Abrir publicación ${post.title}`} style={[styles.card, cardShadow(dark), { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.push(('/posts/' + post.id) as Href)}>
    <View style={styles.authorRow}>
      <View style={[styles.avatar, { backgroundColor: c.surfaceAlt }]}>
        {avatarUrl && token && !avatarFailed
          ? <Image source={profilePhotoSource(avatarUrl, token)} style={styles.avatar} contentFit="cover" cachePolicy="memory" onError={() => setAvatarFailed(true)} accessibilityLabel={`Foto de ${post.user.username}`} />
          : <Ionicons name="person-outline" size={20} color={c.accent} />}
      </View>
      <View style={styles.authorInfo}>
        <Text style={[styles.author, { color: c.textPrimary }]}>{post.user.username}</Text>
        <Text style={[styles.meta, { color: c.muted }]}>{POST_CATEGORIES.find(entry => entry.value === post.type)?.label ?? post.type} · {formatRelativeTime(post.createdAt)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={c.muted} />
    </View>
    <Text style={[styles.title, { color: c.accent }]}>{post.title}</Text>
    <Text style={[styles.description, { color: c.textPrimary }]} numberOfLines={4}>{post.description}</Text>
    {post.pet ? <Pressable accessibilityRole="button" accessibilityLabel={`Ver ficha de ${post.pet.name}`} style={[styles.pet, { borderColor: c.border }]} onPress={event => { event.stopPropagation(); router.push((`/pets/${post.pet!.id}`) as Href); }}>
      {post.pet.photoUrl && token ? <Image source={petPhotoSource(post.pet.photoUrl, token)} style={styles.petPhoto} contentFit="cover" cachePolicy="memory" /> : <Ionicons name="paw-outline" size={22} color={c.accent} />}
      <View><Text style={[styles.petText, { color: c.accent }]}>{post.pet.name}</Text><Text style={[styles.petAge, { color: c.textPrimary }]}>{post.pet.species} · {post.pet.isAgeApproximate ? 'aprox. ' : ''}{post.pet.age} {post.pet.age === 1 ? 'año' : 'años'}</Text></View>
      <Ionicons name="chevron-forward" size={17} color={c.accent} />
    </Pressable> : null}
    {post.photoPath && token && !photoFailed ? <Image source={photoSource(post.photoPath, token)} style={styles.photo} contentFit="cover" cachePolicy="memory" accessibilityLabel={'Foto de ' + post.title} onError={() => setPhotoFailed(true)} /> : null}
    {photoFailed ? <View style={styles.photoFailure}><Text style={[styles.photoError, { color: c.error }]}>No se pudo mostrar la foto.</Text><Pressable accessibilityRole="button" accessibilityLabel={'Reintentar foto de ' + post.title} onPress={event => { event.stopPropagation(); setPhotoFailed(false); }}><Text style={[styles.retry, { color: c.accent }]}>Reintentar foto</Text></Pressable></View> : null}
  </Pressable>;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 23, padding: 16, marginBottom: 12 },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 13 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 10, overflow: 'hidden' },
  authorInfo: { flex: 1 }, author: { fontFamily: 'Nunito_700Bold', fontSize: 14 }, meta: { fontFamily: 'Nunito_600SemiBold', fontSize: 12, marginTop: 1 },
  title: { fontFamily: 'Nunito_700Bold', fontSize: 19, lineHeight: 25, marginBottom: 5 },
  description: { fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 23 },
  pet: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 12, borderWidth: 1, borderRadius: 13, padding: 8 },
  petPhoto: { width: 38, height: 38, borderRadius: 9 }, petText: { fontFamily: 'Nunito_700Bold', fontSize: 14 }, petAge: { fontFamily: 'Nunito_400Regular', fontSize: 13 },
  photo: { marginTop: 14, width: '100%', height: 220, borderRadius: 16 },
  photoFailure: { marginTop: 12, gap: 6 }, photoError: { fontFamily: 'Nunito_600SemiBold', fontSize: 14 }, retry: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
});
