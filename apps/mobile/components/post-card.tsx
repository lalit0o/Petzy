import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, type Href } from 'expo-router';

import { petPhotoSource } from '@/lib/pets-api';
import { photoSource } from '@/lib/posts-api';
import { profilePhotoSource } from '@/lib/profiles-api';
import { formatRelativeTime } from '@/lib/format';
import { cardShadow, petzyColors, radius, spacing } from '@/constants/petzy-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { POST_CATEGORIES, type PostSummary } from '@/types/post';

// Tarjeta de publicación compartida entre el Feed general y la pestaña
// "Publicaciones" de una comunidad — antes eran dos implementaciones
// distintas (la de comunidad ni mostraba foto de perfil ni mascota
// enlazada); ahora es una sola fuente de verdad para que no se vuelvan a
// desalinear.
//
// Jerarquía (12-11-2026, pulido del feed): autor, foto a todo el ancho como
// protagonista, título y texto breve, mascota en una línea y «Me gusta».
// Toda la tarjeta abre la publicación, por eso ya no lleva flecha.
// Segunda vuelta (22-11-2026): la categoría pasa a una cápsula junto al autor
// y la línea gris queda solo con la fecha.
export function PostCard({ post, token }: { post: PostSummary; token: string | null }) {
  const router = useRouter();
  const dark = useColorScheme() === 'dark';
  const c = petzyColors[dark ? 'dark' : 'light'];
  const [photoFailed, setPhotoFailed] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const avatarUrl = post.user.hasAvatar ? `/users/${post.user.id}/avatar` : null;
  const category = POST_CATEGORIES.find(entry => entry.value === post.type)?.label ?? post.type;
  const showPhoto = Boolean(post.photoPath && token);
  const likes = `${post.likeCount} Me gusta`;

  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={`Abrir publicación ${post.title}, de ${post.user.username}. ${category}. ${likes}`}
    style={({ pressed }) => [styles.card, cardShadow(dark), { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.94 : 1 }]}
    onPress={() => router.push(('/posts/' + post.id) as Href)}>
    <View style={styles.authorRow}>
      <View style={[styles.avatar, { backgroundColor: c.surfaceAlt }]}>
        {avatarUrl && token && !avatarFailed
          ? <Image source={profilePhotoSource(avatarUrl, token)} style={styles.avatar} contentFit="cover" cachePolicy="memory" onError={() => setAvatarFailed(true)} accessibilityLabel={`Foto de ${post.user.username}`} />
          : <Ionicons name="person-outline" size={20} color={c.accent} />}
      </View>
      <View style={styles.authorInfo}>
        <Text numberOfLines={1} style={[styles.author, { color: c.textPrimary }]}>{post.user.username}</Text>
        <Text numberOfLines={1} style={[styles.meta, { color: c.muted }]}>{formatRelativeTime(post.createdAt)}</Text>
      </View>
      {/* Cápsula de categoría junto al autor, como en la imagen de referencia del feed. */}
      <View style={[styles.category, { backgroundColor: c.surfaceAlt }]}>
        <Text numberOfLines={1} style={[styles.categoryText, { color: c.textPrimary }]}>{category}</Text>
      </View>
    </View>

    {/* La foto ocupa todo el ancho con proporción fija: no recorta de más ni mueve el contenido al cargar. */}
    {showPhoto ? <View style={[styles.photoFrame, { backgroundColor: c.surfaceAlt }]}>
      {!photoFailed ? <Image source={photoSource(post.photoPath!, token!)} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory" transition={150} accessibilityLabel={'Foto de ' + post.title} onError={() => setPhotoFailed(true)} />
        : <View style={styles.photoFailure}>
            <Ionicons name="image-outline" size={28} color={c.muted} />
            <Text style={[styles.photoError, { color: c.error }]}>No se pudo mostrar la foto.</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={'Reintentar foto de ' + post.title} hitSlop={8} onPress={event => { event.stopPropagation(); setPhotoFailed(false); }}>
              <Text style={[styles.retry, { color: c.accent }]}>Reintentar foto</Text>
            </Pressable>
          </View>}
    </View> : null}

    <View style={styles.body}>
      <Text numberOfLines={2} style={[styles.title, { color: c.accent }]}>{post.title}</Text>
      <Text numberOfLines={3} style={[styles.description, { color: c.textPrimary }]}>{post.description}</Text>

      {post.pet ? <Pressable accessibilityRole="button" accessibilityLabel={`Ver ficha de ${post.pet.name}`} hitSlop={6} style={styles.pet}
        onPress={event => { event.stopPropagation(); router.push((`/pets/${post.pet!.id}`) as Href); }}>
        <View style={[styles.petPhoto, { backgroundColor: c.surfaceAlt }]}>
          {post.pet.photoUrl && token ? <Image source={petPhotoSource(post.pet.photoUrl, token)} style={styles.petPhoto} contentFit="cover" cachePolicy="memory" /> : <Ionicons name="paw" size={14} color={c.accent} />}
        </View>
        <Text numberOfLines={1} style={[styles.petText, { color: c.muted }]}>
          con <Text style={[styles.petName, { color: c.accent }]}>{post.pet.name}</Text> · {post.pet.species}, {post.pet.isAgeApproximate ? 'aprox. ' : ''}{post.pet.age} {post.pet.age === 1 ? 'año' : 'años'}
        </Text>
      </Pressable> : null}

      <View style={styles.footer} importantForAccessibility="no-hide-descendants">
        <Ionicons name={post.likedByMe ? 'heart' : 'heart-outline'} size={18} color={post.likedByMe ? c.accent : c.muted} />
        <Text style={[styles.likes, { color: post.likedByMe ? c.accent : c.muted }]}>{post.likeCount}</Text>
      </View>
    </View>
  </Pressable>;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 23, marginBottom: spacing.lg, overflow: 'hidden' },
  authorRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: 14, paddingBottom: spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 10, overflow: 'hidden' },
  authorInfo: { flex: 1, marginRight: spacing.sm },
  category: { flexShrink: 0, maxWidth: '45%', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  categoryText: { fontFamily: 'Nunito_700Bold', fontSize: 12, lineHeight: 16 },
  author: { fontFamily: 'Nunito_700Bold', fontSize: 15 },
  meta: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, marginTop: 1 },
  photoFrame: { width: '100%', aspectRatio: 4 / 3, alignItems: 'center', justifyContent: 'center' },
  photoFailure: { alignItems: 'center', gap: 6, padding: spacing.lg },
  photoError: { fontFamily: 'Nunito_600SemiBold', fontSize: 14 },
  retry: { fontFamily: 'Nunito_700Bold', fontSize: 16, paddingVertical: 6 },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 14 },
  title: { fontFamily: 'Nunito_700Bold', fontSize: 18, lineHeight: 24 },
  description: { fontFamily: 'Nunito_400Regular', fontSize: 15, lineHeight: 22, marginTop: 4 },
  pet: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, minHeight: 32, alignSelf: 'flex-start', maxWidth: '100%' },
  petPhoto: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  petText: { flexShrink: 1, fontFamily: 'Nunito_600SemiBold', fontSize: 14 },
  petName: { fontFamily: 'Nunito_700Bold' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.md },
  likes: { fontFamily: 'Nunito_700Bold', fontSize: 14 },
});

