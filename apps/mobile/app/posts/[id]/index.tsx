import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthContext } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getPost, photoSource, removePost } from '@/lib/posts-api';
import { petPhotoSource } from '@/lib/pets-api';
import { POST_CATEGORIES, type PostSummary } from '@/types/post';
import { PostInteractions } from '@/components/post-interactions';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user } = useAuthContext();
  const router = useRouter();
  const dark = useColorScheme() === 'dark';
  const colors = dark ? { bg: '#182213', card: '#20311C', title: '#82A87E', text: '#DBDFD0', error: '#F0A59A' } : { bg: '#DBDFD0', card: '#F8F7F0', title: '#365625', text: '#111212', error: '#8C3F37' };
  const [post, setPost] = useState<PostSummary | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const unavailable = useCallback(() => { setPost(null); setError('La publicación ya no está disponible.'); }, []);

  const load = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true); setPost(null); setError(''); setPhotoError(false);
    try { setPost(await getPost(token, Number(id))); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo abrir la publicación.'); }
    finally { setLoading(false); }
  }, [token, id]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const confirmRemove = () => Alert.alert('Retirar publicación', 'Dejará de mostrarse, pero sus datos se conservarán.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Retirar', style: 'destructive', onPress: () => {
      if (!token || !post || removing) return;
      setRemoving(true); setError('');
      void removePost(token, post.id).then(() => router.replace('/')).catch((cause) => setError(cause instanceof Error ? cause.message : 'No se pudo retirar la publicación.')).finally(() => setRemoving(false));
    } },
  ]);

  return <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}><ScrollView contentContainerStyle={styles.content}>
    <Pressable accessibilityRole="button" accessibilityLabel="Volver" style={styles.back} onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={colors.title} /><Text style={[styles.backText, { color: colors.title }]}>Volver</Text></Pressable>
    {loading ? <View style={styles.state}><ActivityIndicator color={colors.title} /><Text style={[styles.body, { color: colors.text }]}>Cargando publicación…</Text></View> : error && !post ? <View style={styles.state}><Text style={[styles.body, { color: colors.error }]}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void load()}><Text style={[styles.link, { color: colors.title }]}>Reintentar</Text></Pressable></View> : post ? <View style={[styles.card, { backgroundColor: colors.card }]}>
      <Text style={[styles.category, { color: colors.title }]}>{POST_CATEGORIES.find((item) => item.value === post.type)?.label ?? post.type}</Text>
      <Text style={[styles.title, { color: colors.title }]}>{post.title}</Text>
      <Text style={[styles.author, { color: colors.text }]}>Por {post.user.username}</Text>
      <Text style={[styles.body, { color: colors.text }]}>{post.description}</Text>
      {post.pet ? <Pressable accessibilityRole="button" accessibilityLabel={`Ver ficha de ${post.pet.name}`} style={styles.pet} onPress={() => router.push((`/pets/${post.pet!.id}`) as Href)}>
        {post.pet.photoUrl && token ? <Image source={petPhotoSource(post.pet.photoUrl, token)} style={styles.petPhoto} contentFit="cover" cachePolicy="none" /> : <Ionicons name="paw-outline" size={24} color={colors.title} />}
        <View><Text style={[styles.petName, { color: colors.title }]}>{post.pet.name}</Text><Text style={[styles.petAge, { color: colors.text }]}>{post.pet.species} · {post.pet.isAgeApproximate ? 'aprox. ' : ''}{post.pet.age} {post.pet.age === 1 ? 'año' : 'años'}</Text></View>
        <Ionicons name="chevron-forward" size={18} color={colors.title} />
      </Pressable> : null}
      {post.photoPath && token && !photoError ? <Image source={photoSource(post.photoPath, token)} style={styles.photo} contentFit="cover" cachePolicy="none" accessibilityLabel={'Foto de ' + post.title} onError={() => setPhotoError(true)} /> : null}
      {photoError ? <View><Text style={[styles.body, { color: colors.error }]}>No se pudo mostrar la foto.</Text><Pressable accessibilityRole="button" onPress={() => setPhotoError(false)} style={styles.action}><Text style={[styles.link, { color: colors.title }]}>Reintentar foto</Text></Pressable></View> : null}
      {post.userId === user?.id ? <View style={styles.actions}>
        <Pressable accessibilityRole="button" style={styles.action} onPress={() => router.push({ pathname: '/posts/[id]/edit', params: { id: String(post.id) } })}><Text style={[styles.link, { color: colors.title }]}>Editar</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={removing} style={styles.action} onPress={confirmRemove}><Text style={[styles.link, { color: colors.error }]}>{removing ? 'Retirando…' : 'Retirar'}</Text></Pressable>
      </View> : null}
      {error ? <Text style={[styles.body, { color: colors.error }]}>{error}</Text> : null}
      <PostInteractions post={post} onPostUnavailable={unavailable} />
    </View> : null}
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ screen: { flex: 1 }, content: { padding: 16, paddingBottom: 40 }, back: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }, backText: { fontFamily: 'Nunito_700Bold', fontSize: 16 }, state: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 }, card: { borderRadius: 24, padding: 18 }, category: { fontFamily: 'Nunito_700Bold', fontSize: 14 }, title: { fontFamily: 'Nunito_700Bold', fontSize: 25, lineHeight: 32, marginTop: 7 }, author: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, marginTop: 8 }, body: { fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 24, marginTop: 14 }, pet: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, minHeight: 50 }, petPhoto: { width: 46, height: 46, borderRadius: 10 }, petName: { fontFamily: 'Nunito_700Bold', fontSize: 16 }, petAge: { fontFamily: 'Nunito_400Regular', fontSize: 14 }, photo: { width: '100%', height: 250, borderRadius: 16, marginTop: 16 }, actions: { flexDirection: 'row', gap: 20, marginTop: 16 }, action: { minHeight: 46, justifyContent: 'center' }, link: { fontFamily: 'Nunito_700Bold', fontSize: 16 } });
