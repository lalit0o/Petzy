import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PostForm } from '@/components/post-form';
import { useAuthContext } from '@/context/AuthContext';
import { goBackOrReplace } from '@/lib/navigation';
import { getPost } from '@/lib/posts-api';
import type { PostSummary } from '@/types/post';

export default function EditPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token, user } = useAuthContext();
  const [post, setPost] = useState<PostSummary | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!token || !id) return;
    let active = true;
    queueMicrotask(async () => {
      if (active) setPost(null);
      try {
        const found = await getPost(token, Number(id));
        if (active) setPost(found);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'No se pudo abrir la publicación.');
      }
    });
    return () => { active = false; };
  }, [id, token, attempt]);
  if (!error && post && post.userId === user?.id) return <PostForm post={post} />;
  return <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
    <Pressable accessibilityRole="button" accessibilityLabel="Volver" style={styles.back} onPress={() => goBackOrReplace(router)}>
      <Ionicons name="arrow-back" size={24} color="#365625" /><Text style={styles.link}>Volver</Text>
    </Pressable>
    <View style={styles.state}>
      {error ? <><Text style={styles.text}>{error}</Text><Pressable accessibilityRole="button" onPress={() => { setError(''); setAttempt((current) => current + 1); }}><Text style={styles.link}>Reintentar</Text></Pressable></>
        : !post ? <><ActivityIndicator color="#365625" /><Text style={styles.text}>Cargando publicación…</Text></>
          : <Text style={styles.text}>Solo el autor puede editar esta publicación.</Text>}
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: '#DBDFD0' }, back: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 16 }, state: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }, text: { fontFamily: 'Nunito_400Regular', fontSize: 16, color: '#111212', textAlign: 'center' }, link: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: '#365625' } });
