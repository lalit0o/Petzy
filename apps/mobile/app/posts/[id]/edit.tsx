import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { PostForm } from '@/components/post-form';
import { useAuthContext } from '@/context/AuthContext';
import { getPost } from '@/lib/posts-api';
import type { PostSummary } from '@/types/post';

export default function EditPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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
  if (error) return <View style={styles.state}><Text style={styles.text}>{error}</Text><Pressable accessibilityRole="button" onPress={() => { setError(''); setAttempt((current) => current + 1); }}><Text style={styles.link}>Reintentar</Text></Pressable></View>;
  if (!post) return <View style={styles.state}><ActivityIndicator color="#365625" /><Text style={styles.text}>Cargando publicación…</Text></View>;
  if (post.userId !== user?.id) return <View style={styles.state}><Text style={styles.text}>Solo el autor puede editar esta publicación.</Text></View>;
  return <PostForm post={post} />;
}

const styles = StyleSheet.create({ state: { flex: 1, backgroundColor: '#DBDFD0', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }, text: { fontFamily: 'Nunito_400Regular', fontSize: 16, color: '#111212', textAlign: 'center' }, link: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: '#365625' } });
