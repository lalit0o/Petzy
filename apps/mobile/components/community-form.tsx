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
  // Error de validación junto a su campo (mobile-forms, 22-11-2026); `error` queda para el servidor y la foto.
  type CommunityField = 'name' | 'topic' | 'description';
  const [fieldError, setFieldError] = useState<{ field: CommunityField; message: string } | null>(null);
  const errorFor = (field: CommunityField) => fieldError?.field === field ? fieldError.message : '';
  const clearField = (field: CommunityField) => { if (fieldError?.field === field) setFieldError(null); };
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
    const invalid = (field: CommunityField, message: string) => { setError(''); setFieldError({ field, message }); };
    if (draft.name.length < 3 || draft.name.length > 60) { invalid('name', 'El nombre debe tener de 3 a 60 caracteres.'); return; }
    if (draft.topic.length < 2 || draft.topic.length > 50) { invalid('topic', 'El tema debe tener de 2 a 50 caracteres.'); return; }
    if (draft.description.length < 10 || draft.description.length > 500) { invalid('description', 'La descripción debe tener de 10 a 500 caracteres.'); return; }
    sending.current = true; setBusy(true); setError(''); setFieldError(null); Keyboard.dismiss();
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
  const bordered = (field: CommunityField) => [ui.input, { backgroundColor: c.card, borderColor: errorFor(field) ? c.error : c.border, color: c.text }];
  const under = (field: CommunityField, length: number, max: number) => <View style={styles.underField}>
    {errorFor(field) ? <Text accessibilityRole="alert" style={[styles.fieldError, { color: c.error }]}>{errorFor(field)}</Text> : <View />}
    <Text style={[ui.muted, { color: c.muted }]}>{length}/{max}</Text>
  </View>;
  const disabled = busy || picking;
  return <SafeAreaView style={[ui.screen, { backgroundColor: c.bg }]} edges={['top', 'bottom']}>
    {/* «Volver» fijo con línea fina, como en los demás formularios (22-11-2026). */}
    <View style={[styles.header, { borderColor: c.border }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Volver" style={styles.back} onPress={() => goBackOrReplace(router, '/comunidades')}><Ionicons name="arrow-back" size={24} color={c.heading} /><Text style={[ui.label, { color: c.heading }]}>Volver</Text></Pressable>
    </View>
    <FormScrollView contentContainerStyle={ui.content}>
      <Text style={[ui.title, styles.title, { color: c.heading }]}>{community ? 'Editar comunidad' : 'Crear comunidad'}</Text>
      <Text style={[ui.body, { color: c.muted }]}>Un espacio para compartir experiencias y cuidar a los animales.</Text>
      <Text style={[ui.label, { color: c.text }]}>Nombre</Text>
      <TextInput accessibilityLabel="Nombre de la comunidad" editable={!disabled} value={name} onChangeText={text => { setName(text); clearField('name'); }} maxLength={61} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => topicRef.current?.focus()} style={bordered('name')} />
      {under('name', name.length, 60)}
      <Text style={[ui.label, { color: c.text }]}>Tema</Text>
      <TextInput ref={topicRef} accessibilityLabel="Tema de la comunidad" editable={!disabled} value={topic} onChangeText={text => { setTopic(text); clearField('topic'); }} maxLength={51} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => descriptionRef.current?.focus()} placeholder="Por ejemplo, paseos con perros" placeholderTextColor={c.muted} style={bordered('topic')} />
      {under('topic', topic.length, 50)}
      <Text style={[ui.label, { color: c.text }]}>Descripción</Text>
      <TextInput ref={descriptionRef} accessibilityLabel="Descripción de la comunidad" editable={!disabled} value={description} onChangeText={text => { setDescription(text); clearField('description'); }} maxLength={501} multiline textAlignVertical="top" style={[bordered('description'), { minHeight: 140, paddingTop: 12 }]} />
      {under('description', description.length, 500)}
      <Text style={[ui.label, { color: c.text }]}>Foto (opcional)</Text>
      {hasPhoto && !photoFailed
        ? (photo ? <Image source={{ uri: photo.uri }} style={styles.preview} contentFit="cover" onError={() => setPhotoFailed(true)} /> : community?.photoPath && token ? <Image source={communityPhotoSource(community.photoPath, token)} style={styles.preview} contentFit="cover" cachePolicy="memory" onError={() => setPhotoFailed(true)} /> : null)
        : !hasPhoto
          ? <Pressable accessibilityRole="button" accessibilityLabel="Agregar foto de la comunidad" disabled={disabled} onPress={() => void choosePhoto()} style={[styles.photoPlaceholder, { backgroundColor: c.card, borderColor: c.border }]}>
              <Ionicons name="camera-outline" size={34} color={c.heading} /><Text style={[ui.label, { color: c.heading }]}>Agregar foto</Text>
              <Text style={[ui.muted, { color: c.muted }]}>JPEG, PNG o WebP de hasta 5 MB</Text>
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
  // Misma altura que la portada de la comunidad (CommunityBanner, 200 px).
  preview: { width: '100%', height: 200, borderRadius: 16 },
  header: { paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  back: { minHeight: 44, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8 },
  title: { letterSpacing: -0.3 },
  underField: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginTop: -6 },
  fieldError: { flex: 1, fontFamily: 'Nunito_600SemiBold', fontSize: 14, lineHeight: 20 },
  photoPlaceholder: { height: 130, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 6 },
  photoAction: { minHeight: 46, borderWidth: 1, borderRadius: 14, paddingHorizontal: 15, justifyContent: 'center' },
});
