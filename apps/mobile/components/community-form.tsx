import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, Text, TextInput, View, type TextInputInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FormScrollView } from '@/components/form-scroll-view';
import { CommunityButton, CommunityMessage, ui, useCommunityColors } from '@/components/community-ui';
import { useAuthContext } from '@/context/AuthContext';
import { communityPhotoSource, createCommunity, removeCommunityPhoto, updateCommunity, uploadCommunityPhoto, type Community, type CommunityPhoto } from '@/lib/communities-api';
import { localPhotoSize } from '@/lib/photo-upload';
import { bumpPhotoVersion } from '@/lib/photo-cache';
import { goBackOrReplace } from '@/lib/navigation';

export function CommunityForm({ community }: { community?: Community }) {
  const { token } = useAuthContext(); const router = useRouter(); const c = useCommunityColors();
  const [name, setName] = useState(community?.name ?? ''); const [topic, setTopic] = useState(community?.topic ?? ''); const [description, setDescription] = useState(community?.description ?? '');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const sending = useRef(false);
  const [photo, setPhoto] = useState<CommunityPhoto | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [picking, setPicking] = useState(false);
  const viewActive = useRef(false);
  const topicRef = useRef<TextInputInstance>(null); const descriptionRef = useRef<TextInputInstance>(null);
  useFocusEffect(useCallback(() => { viewActive.current = true; return () => { viewActive.current = false; }; }, []));
  const hasPhoto = Boolean(photo) || Boolean(!removePhoto && community?.photoPath);

  const choosePhoto = async () => {
    if (sending.current || picking) return;
    setPicking(true); setError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: false, quality: 1 });
      if (!viewActive.current || result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      let uri = asset.uri;
      let mimeType = asset.mimeType ?? '';
      let fileName = asset.fileName ?? 'comunidad.jpg';
      let size = asset.fileSize;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
        const image = await ImageManipulator.manipulate(uri).renderAsync();
        const converted = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
        uri = converted.uri; mimeType = 'image/jpeg'; fileName = 'comunidad.jpg'; size = undefined;
      }
      size ??= await localPhotoSize(uri);
      if (!viewActive.current) return;
      if (size > 5 * 1024 * 1024) { setError('La foto supera 5 MB. Elige otra imagen.'); return; }
      setPhoto({ uri, name: fileName, mimeType, size }); setRemovePhoto(false); setPhotoFailed(false);
    } catch { if (viewActive.current) setError('No pudimos preparar la foto. Elige otra imagen.'); }
    finally { if (viewActive.current) setPicking(false); }
  };

  const save = async () => {
    if (!token || sending.current || picking) return;
    const draft = { name: name.trim(), topic: topic.trim(), description: description.trim() };
    if (draft.name.length < 3 || draft.name.length > 60) { setError('El nombre debe tener de 3 a 60 caracteres.'); return; }
    if (draft.topic.length < 2 || draft.topic.length > 50) { setError('El tema debe tener de 2 a 50 caracteres.'); return; }
    if (draft.description.length < 10 || draft.description.length > 500) { setError('La descripción debe tener de 10 a 500 caracteres.'); return; }
    sending.current = true; setBusy(true); setError(''); Keyboard.dismiss();
    try {
      let saved: Community;
      if (community) {
        saved = await updateCommunity(token, community.id, draft);
        try {
          if (photo) { saved = await uploadCommunityPhoto(token, community.id, photo); bumpPhotoVersion(`/communities/${community.id}/photo`); }
          else if (removePhoto && community.photoPath) saved = await removeCommunityPhoto(token, community.id);
        } catch (cause) {
          setError(`La comunidad se guardó, pero no se pudo actualizar la foto. ${cause instanceof Error ? cause.message : 'Intenta de nuevo.'}`);
          return;
        }
      } else {
        saved = await createCommunity(token, draft, photo);
      }
      // Al editar, regresar con goBackOrReplace (no router.replace): la
      // pantalla de detalle ya está debajo en la pila y un "back" real
      // garantiza que se refresque con los datos nuevos. Al crear, sí hay
      // que avanzar hacia la ficha nueva, que no existía antes.
      if (community) goBackOrReplace(router, (`/communities/${saved.id}`) as Href);
      else router.replace((`/communities/${saved.id}`) as Href);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar la comunidad.'); }
    finally { sending.current = false; setBusy(false); }
  };
  const inputStyle = [ui.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }];
  const disabled = busy || picking;
  return <SafeAreaView style={[ui.screen, { backgroundColor: c.bg }]} edges={['top', 'bottom']}>
    <Pressable accessibilityRole="button" accessibilityLabel="Volver" style={ui.back} onPress={() => goBackOrReplace(router, '/comunidades')}><Ionicons name="arrow-back" size={24} color={c.heading} /><Text style={[ui.label, { color: c.heading }]}>Volver</Text></Pressable>
    <FormScrollView contentContainerStyle={ui.content}>
      <Text style={[ui.title, { color: c.heading }]}>{community ? 'Editar comunidad' : 'Crear comunidad'}</Text>
      <Text style={[ui.body, { color: c.text }]}>Un espacio para compartir experiencias y cuidar a los animales.</Text>
      <Text style={[ui.label, { color: c.text }]}>Nombre</Text>
      <TextInput accessibilityLabel="Nombre de la comunidad" editable={!disabled} value={name} onChangeText={setName} maxLength={61} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => topicRef.current?.focus()} style={inputStyle} />
      <Text style={[ui.label, { color: c.text }]}>Tema</Text>
      <TextInput ref={topicRef} accessibilityLabel="Tema de la comunidad" editable={!disabled} value={topic} onChangeText={setTopic} maxLength={51} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => descriptionRef.current?.focus()} placeholder="Por ejemplo, paseos con perros" placeholderTextColor={c.muted} style={inputStyle} />
      <Text style={[ui.label, { color: c.text }]}>Descripción</Text>
      <TextInput ref={descriptionRef} accessibilityLabel="Descripción de la comunidad" editable={!disabled} value={description} onChangeText={setDescription} maxLength={501} multiline textAlignVertical="top" style={[inputStyle, { minHeight: 140, paddingTop: 12 }]} />
      <Text style={[ui.muted, { color: c.muted, textAlign: 'right' }]}>{description.length}/500</Text>
      <Text style={[ui.label, { color: c.text }]}>Foto (opcional)</Text>
      {hasPhoto && !photoFailed
        ? (photo ? <Image source={{ uri: photo.uri }} style={styles.preview} contentFit="cover" onError={() => setPhotoFailed(true)} /> : community?.photoPath && token ? <Image source={communityPhotoSource(community.photoPath, token)} style={styles.preview} contentFit="cover" cachePolicy="memory" onError={() => setPhotoFailed(true)} /> : null)
        : !hasPhoto
          ? <Pressable accessibilityRole="button" accessibilityLabel="Agregar foto de la comunidad" disabled={disabled} onPress={() => void choosePhoto()} style={[styles.photoPlaceholder, { backgroundColor: c.card, borderColor: c.border }]}>
              <Ionicons name="camera-outline" size={34} color={c.heading} /><Text style={[ui.label, { color: c.heading }]}>Agregar foto</Text>
            </Pressable>
          : <View style={[styles.photoPlaceholder, { backgroundColor: c.card, borderColor: c.border }]}><Ionicons name="image-outline" size={34} color={c.error} /></View>}
      {photoFailed ? <CommunityMessage text="No se pudo mostrar la foto. Puedes elegir otra." error /> : null}
      {hasPhoto ? <View style={ui.row}>
        <Pressable accessibilityRole="button" disabled={disabled} onPress={() => void choosePhoto()} style={[styles.photoAction, { borderColor: c.border }]}><Text style={[ui.label, { color: c.heading }]}>Cambiar foto</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={disabled} onPress={() => { setPhoto(null); setRemovePhoto(true); setPhotoFailed(false); }} style={[styles.photoAction, { borderColor: c.border }]}><Text style={[ui.label, { color: c.error }]}>Quitar foto</Text></Pressable>
      </View> : null}
      {picking ? <View style={ui.row}><ActivityIndicator color={c.heading} /><Text style={[ui.body, { color: c.text }]}>Preparando foto…</Text></View> : null}
      <CommunityMessage text={error} error />
      <CommunityButton label={community ? 'Guardar cambios' : 'Crear comunidad'} busy={busy} disabled={picking} onPress={() => void save()} />
    </FormScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  preview: { width: '100%', height: 210, borderRadius: 16 },
  photoPlaceholder: { height: 130, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 6 },
  photoAction: { minHeight: 46, borderWidth: 1, borderRadius: 14, paddingHorizontal: 15, justifyContent: 'center' },
});
