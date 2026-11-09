import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputInstance } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useRouter, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthContext } from '@/context/AuthContext';
import { FormScrollView } from '@/components/form-scroll-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { goBackOrReplace } from '@/lib/navigation';
import { localPhotoSize } from '@/lib/photo-upload';
import { bumpPhotoVersion } from '@/lib/photo-cache';
import { createPost, listOwnPets, photoSource, type PostDraft, type PostPhoto, updatePost } from '@/lib/posts-api';
import { POST_CATEGORIES, type OwnPet, type PostCategory, type PostSummary } from '@/types/post';
import { petzyColors } from '@/constants/petzy-theme';
import { useToast } from '@/components/toast';

type Props = { post?: PostSummary; communityId?: number };

export function PostForm({ post, communityId }: Props) {
  const { token } = useAuthContext();
  const router = useRouter();
  const toast = useToast();
  const palette = petzyColors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const color = { background: palette.background, card: palette.surface, text: palette.textPrimary, heading: palette.accent, border: palette.border, muted: palette.muted, error: palette.error, buttonText: palette.onAccent };
  const descriptionRef = useRef<TextInputInstance>(null);
  const submitting = useRef(false);
  const [title, setTitle] = useState(post?.title ?? '');
  const [description, setDescription] = useState(post?.description ?? '');
  const [type, setType] = useState<PostCategory | null>(post?.type ?? null);
  const [petId, setPetId] = useState<number | null>(post?.pet?.id ?? null);
  const [pets, setPets] = useState<OwnPet[]>([]);
  const [petCursor, setPetCursor] = useState<number | null>(null);
  const [petBusy, setPetBusy] = useState(false);
  const [petError, setPetError] = useState('');
  const [selector, setSelector] = useState<'category' | 'pet' | null>(null);
  const [photo, setPhoto] = useState<PostPhoto | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [photoPreviewError, setPhotoPreviewError] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    let active = true;
    queueMicrotask(async () => {
      if (active) { setPetBusy(true); setPetError(''); }
      try {
        const page = await listOwnPets(token);
        if (active) { setPets(page.items); setPetCursor(page.nextCursor); }
      } catch (cause) {
        if (active) setPetError(cause instanceof Error ? cause.message : 'No se pudieron cargar tus mascotas.');
      } finally {
        if (active) setPetBusy(false);
      }
    });
    return () => { active = false; };
  }, [token]);

  const retryPets = async () => {
    if (!token || petBusy) return;
    setPetBusy(true); setPetError('');
    try {
      const page = await listOwnPets(token);
      setPets(page.items); setPetCursor(page.nextCursor);
    } catch (cause) {
      setPetError(cause instanceof Error ? cause.message : 'No se pudieron cargar tus mascotas.');
    } finally { setPetBusy(false); }
  };

  const loadMorePets = async () => {
    if (!token || petCursor === null || petBusy) return;
    setPetBusy(true); setPetError('');
    try {
      const page = await listOwnPets(token, petCursor);
      setPets((current) => [...current, ...page.items]);
      setPetCursor(page.nextCursor);
    } catch (cause) {
      setPetError(cause instanceof Error ? cause.message : 'No se pudieron cargar más mascotas.');
    } finally { setPetBusy(false); }
  };

  const choosePhoto = async () => {
    setError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: false, quality: 1 });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      let uri = asset.uri;
      let mimeType = asset.mimeType ?? '';
      let name = asset.fileName ?? 'publicacion.jpg';
      let size = asset.fileSize;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
        const context = ImageManipulator.manipulate(uri);
        const image = await context.renderAsync();
        const converted = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
        uri = converted.uri; mimeType = 'image/jpeg'; name = 'publicacion.jpg';
        size = undefined;
      }
      size ??= await localPhotoSize(uri);
      if (size > 5 * 1024 * 1024) { setError('La foto supera 5 MB. Elige otra imagen.'); return; }
      setPhoto({ uri, mimeType, name, size });
      setRemovePhoto(false);
      setPhotoPreviewError(false);
    } catch {
      setError('No pudimos preparar la foto. Elige otra imagen.');
    }
  };

  const save = async () => {
    if (submitting.current || !token) return;
    if (!title.trim()) { setError('Escribe un título.'); return; }
    if (title.trim().length > 120) { setError('El título admite hasta 120 caracteres.'); return; }
    if (!description.trim()) { setError('Escribe una descripción.'); return; }
    if (description.trim().length > 3000) { setError('La descripción admite hasta 3 000 caracteres.'); return; }
    if (!type) { setError('Elige una categoría para la publicación.'); return; }
    submitting.current = true; setBusy(true); setError(''); Keyboard.dismiss();
    const draft: PostDraft = { title: title.trim(), description: description.trim(), type, petId, photo, removePhoto };
    try {
      const saved = post ? await updatePost(token, post.id, draft) : await createPost(token, draft, communityId);
      if (post && (photo || removePhoto) && saved.photoPath) bumpPhotoVersion(saved.photoPath);
      if (!post) { toast.show('¡Publicación creada!'); router.replace(('/posts/' + saved.id) as Href); }
      // Al editar, regresar con goBackOrReplace: el detalle ya está debajo en
      // la pila y un "back" real garantiza que se refresque con los datos
      // nuevos, en vez de un router.replace que puede dejarla con lo viejo.
      else goBackOrReplace(router, ('/posts/' + saved.id) as Href);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar la publicación.');
    } finally { submitting.current = false; setBusy(false); }
  };

  const existingPhoto = Boolean(post?.photoPath && !removePhoto && !photo);
  const selectedPet = pets.find((item) => item.id === petId)?.name ?? (petId === post?.pet?.id ? post?.pet?.name : undefined);
  return <SafeAreaView style={[styles.screen, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
    <FormScrollView contentContainerStyle={styles.content}>
      <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => goBackOrReplace(router, post ? { pathname: '/posts/[id]', params: { id: String(post.id) } } : communityId ? (`/communities/${communityId}`) as Href : '/')} style={styles.back}><Ionicons name="arrow-back" size={24} color={color.heading} /><Text style={[styles.backText, { color: color.heading }]}>Volver</Text></Pressable>
      <Text style={[styles.heading, { color: color.heading }]}>{post ? 'Editar publicación' : 'Crear publicación'}</Text>
      <Text style={[styles.label, { color: color.text }]}>Título</Text>
      <TextInput accessibilityLabel="Título" value={title} onChangeText={setTitle} maxLength={121} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => descriptionRef.current?.focus()} placeholder="¿De qué trata?" placeholderTextColor={color.muted} style={[styles.input, { backgroundColor: color.card, color: color.text, borderColor: color.border }]} />
      <Text style={[styles.counter, { color: color.muted }]}>{title.length}/120</Text>
      <Text style={[styles.label, { color: color.text }]}>Descripción</Text>
      <TextInput ref={descriptionRef} accessibilityLabel="Descripción" value={description} onChangeText={setDescription} maxLength={3001} multiline textAlignVertical="top" placeholder="Cuéntanos más" placeholderTextColor={color.muted} style={[styles.input, styles.description, { backgroundColor: color.card, color: color.text, borderColor: color.border }]} />
      <Text style={[styles.counter, { color: color.muted }]}>{description.length}/3 000</Text>
      <Text style={[styles.label, { color: color.text }]}>Categoría</Text>
      <Pressable accessibilityRole="button" onPress={() => { Keyboard.dismiss(); setSelector('category'); }} style={[styles.select, { backgroundColor: color.card, borderColor: color.border }]}><Text style={[styles.selectText, { color: color.text }]}>{POST_CATEGORIES.find((item) => item.value === type)?.label ?? 'Elige una categoría'}</Text><Ionicons name="chevron-down" size={20} color={color.heading} /></Pressable>
      <Text style={[styles.label, { color: color.text }]}>Mascota (opcional)</Text>
      <Pressable accessibilityRole="button" onPress={() => { Keyboard.dismiss(); setSelector('pet'); }} style={[styles.select, { backgroundColor: color.card, borderColor: color.border }]}><Text style={[styles.selectText, { color: color.text }]}>{selectedPet ?? 'Ninguna mascota'}</Text><Ionicons name="chevron-down" size={20} color={color.heading} /></Pressable>
      {petError ? <View><Text style={[styles.error, { color: color.error }]}>{petError}</Text><Pressable accessibilityRole="button" onPress={() => void retryPets()}><Text style={[styles.secondaryText, { color: color.heading }]}>Reintentar mascotas</Text></Pressable></View> : null}
      <Text style={[styles.label, { color: color.text }]}>Foto (opcional)</Text>
      {photo && !photoPreviewError ? <Image source={{ uri: photo.uri }} style={styles.preview} contentFit="cover" onError={() => setPhotoPreviewError(true)} /> : existingPhoto && token && post?.photoPath && !photoPreviewError ? <Image source={photoSource(post.photoPath, token)} style={styles.preview} contentFit="cover" cachePolicy="memory" onError={() => setPhotoPreviewError(true)} /> : null}
      {photoPreviewError ? <Pressable accessibilityRole="button" onPress={() => setPhotoPreviewError(false)}><Text style={[styles.error, { color: color.error }]}>No se pudo mostrar la foto. Reintentar.</Text></Pressable> : null}
      <View style={styles.photoActions}><Pressable accessibilityRole="button" onPress={() => void choosePhoto()} style={[styles.secondary, { borderColor: color.border }]}><Text style={[styles.secondaryText, { color: color.heading }]}>{photo || existingPhoto ? 'Cambiar foto' : 'Elegir foto'}</Text></Pressable>{photo || existingPhoto ? <Pressable accessibilityRole="button" onPress={() => { setPhoto(null); setRemovePhoto(true); }} style={[styles.secondary, { borderColor: color.border }]}><Text style={[styles.secondaryText, { color: color.heading }]}>Quitar foto</Text></Pressable> : null}</View>
      {error ? <Text style={[styles.error, { color: color.error }]}>{error}</Text> : null}
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => void save()} style={[styles.save, { backgroundColor: busy ? color.border : color.heading }]}>{busy ? <ActivityIndicator color={color.buttonText} /> : <Text style={[styles.saveText, { color: color.buttonText }]}>{post ? 'Guardar cambios' : 'Publicar'}</Text>}</Pressable>
    </FormScrollView>
    <Modal transparent visible={selector !== null} animationType="fade" onRequestClose={() => setSelector(null)}><Pressable style={styles.overlay} onPress={() => setSelector(null)}><View style={[styles.menu, { backgroundColor: color.card }]}><Text style={[styles.menuTitle, { color: color.heading }]}>{selector === 'category' ? 'Elige una categoría' : 'Enlazar mascota'}</Text><ScrollView style={styles.options}>
      {selector === 'category' ? POST_CATEGORIES.map((item) => <Pressable key={item.value} accessibilityRole="button" style={styles.option} onPress={() => { setType(item.value); setError(''); setSelector(null); }}><Text style={[styles.selectText, { color: color.text }]}>{item.label}</Text>{type === item.value ? <Ionicons name="checkmark" size={20} color={color.heading} /> : null}</Pressable>) : <><Pressable accessibilityRole="button" style={styles.option} onPress={() => { setPetId(null); setSelector(null); }}><Text style={[styles.selectText, { color: color.text }]}>Ninguna mascota</Text></Pressable>{petBusy && !pets.length ? <Text style={[styles.selectText, { color: color.muted }]}>Cargando mascotas…</Text> : null}{petError ? <Pressable accessibilityRole="button" style={styles.option} onPress={() => void retryPets()}><Text style={[styles.selectText, { color: color.error }]}>No se cargaron. Reintentar</Text></Pressable> : null}{pets.map((pet) => <Pressable key={pet.id} accessibilityRole="button" style={styles.option} onPress={() => { setPetId(pet.id); setSelector(null); }}><Text style={[styles.selectText, { color: color.text }]}>{pet.name}</Text></Pressable>)}{petCursor !== null ? <Pressable accessibilityRole="button" style={styles.option} onPress={() => void loadMorePets()}><Text style={[styles.selectText, { color: color.heading }]}>{petBusy ? 'Cargando…' : 'Cargar más mascotas'}</Text></Pressable> : null}</>}
    </ScrollView></View></Pressable></Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { padding: 16, paddingBottom: 40 }, back: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 }, backText: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
  heading: { fontFamily: 'Nunito_700Bold', fontSize: 28, marginTop: 8, marginBottom: 18 }, label: { fontFamily: 'Nunito_700Bold', fontSize: 16, marginTop: 14, marginBottom: 7 },
  input: { borderWidth: 1, borderRadius: 15, minHeight: 52, paddingHorizontal: 14, fontFamily: 'Nunito_400Regular', fontSize: 16 }, description: { height: 160, paddingTop: 12 }, counter: { fontFamily: 'Nunito_400Regular', fontSize: 13, textAlign: 'right', marginTop: 4 },
  select: { minHeight: 52, borderWidth: 1, borderRadius: 15, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, selectText: { fontFamily: 'Nunito_600SemiBold', fontSize: 16 },
  preview: { width: '100%', height: 220, borderRadius: 16 }, photoActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }, secondary: { minHeight: 46, borderWidth: 1, borderRadius: 16, paddingHorizontal: 15, justifyContent: 'center' }, secondaryText: { fontFamily: 'Nunito_700Bold', fontSize: 15 },
  error: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, marginTop: 12 }, save: { minHeight: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 24 }, saveText: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 28 }, menu: { borderRadius: 20, padding: 18, maxHeight: '70%' }, menuTitle: { fontFamily: 'Nunito_700Bold', fontSize: 20, marginBottom: 10 }, options: { flexGrow: 0 }, option: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
