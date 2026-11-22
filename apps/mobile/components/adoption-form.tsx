import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputInstance } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useRouter, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormScrollView } from '@/components/form-scroll-view';
import { useToast } from '@/components/toast';
import { petzyColors, radius, spacing } from '@/constants/petzy-theme';
import { useAuthContext } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { adoptionPhotoSource, createAdoption, DESCRIPTION_MAX, PHOTOS_MAX, TITLE_MAX, updateAdoption, type Adoption, type NewPhoto } from '@/lib/adoptions-api';
import { goBackOrReplace } from '@/lib/navigation';
import { localPhotoSize } from '@/lib/photo-upload';
import { listOwnPets } from '@/lib/posts-api';
import type { OwnPet } from '@/types/post';

// Una foto en el formulario: ya guardada en el anuncio o recién elegida.
type FormPhoto = { kind: 'saved'; id: number; url: string } | { kind: 'new'; key: string; photo: NewPhoto };

// Publicar o editar un anuncio de Adopción (AD-T13; D-89, D-92, D-95, D-96).
// Lo escrito y las fotos elegidas se conservan si el servidor rechaza el envío.
export function AdoptionForm({ adoption }: { adoption?: Adoption }) {
  const { token } = useAuthContext(); const router = useRouter(); const toast = useToast();
  const c = petzyColors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const descriptionRef = useRef<TextInputInstance>(null);
  const submitting = useRef(false);
  const [title, setTitle] = useState(adoption?.title ?? '');
  const [description, setDescription] = useState(adoption?.description ?? '');
  const [photos, setPhotos] = useState<FormPhoto[]>(adoption?.photos.map(p => ({ kind: 'saved' as const, id: p.id, url: p.url })) ?? []);
  const [petId, setPetId] = useState<number | null>(adoption?.pet?.id ?? null);
  const [pets, setPets] = useState<OwnPet[]>([]);
  const [petCursor, setPetCursor] = useState<number | null>(null);
  const [petBusy, setPetBusy] = useState(false); const [petError, setPetError] = useState('');
  const [petPicker, setPetPicker] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [photoError, setPhotoError] = useState(''); const [error, setError] = useState('');
  // Error de validación junto a su campo (mobile-forms, 22-11-2026); `error` queda para el servidor.
  type AdoptionField = 'title' | 'description' | 'photos' | 'accepted';
  const [fieldError, setFieldError] = useState<{ field: AdoptionField; message: string } | null>(null);
  const errorFor = (field: AdoptionField) => fieldError?.field === field ? fieldError.message : '';
  const clearField = (field: AdoptionField) => { if (fieldError?.field === field) setFieldError(null); };
  const [busy, setBusy] = useState(false);

  const loadPets = async (cursor?: number) => {
    if (!token) return;
    setPetBusy(true); setPetError('');
    try {
      const page = await listOwnPets(token, cursor);
      setPets(old => cursor ? [...old, ...page.items] : page.items); setPetCursor(page.nextCursor);
    } catch (cause) {
      setPetError(cause instanceof Error ? cause.message : 'No se pudieron cargar tus mascotas.');
    } finally { setPetBusy(false); }
  };
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void loadPets(); });
    return () => { active = false; };
    // Solo al abrir el formulario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const choosePhotos = async () => {
    setPhotoError('');
    const room = PHOTOS_MAX - photos.length;
    if (room <= 0) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: room, quality: 1 });
      if (result.canceled) return;
      const picked: FormPhoto[] = [];
      for (const asset of result.assets.slice(0, room)) {
        let uri = asset.uri; let mimeType = asset.mimeType ?? ''; let name = asset.fileName ?? 'adopcion.jpg'; let size = asset.fileSize;
        // HEIC y otros formatos se convierten a JPEG antes de subir.
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
          const image = await ImageManipulator.manipulate(uri).renderAsync();
          const converted = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
          uri = converted.uri; mimeType = 'image/jpeg'; name = 'adopcion.jpg'; size = undefined;
        }
        size ??= await localPhotoSize(uri);
        if (size > 5 * 1024 * 1024) { setPhotoError('Una de las fotos supera 5 MB y no se agregó. Elige otra.'); continue; }
        picked.push({ kind: 'new', key: `${uri}-${Date.now()}-${picked.length}`, photo: { uri, mimeType, name, size } });
      }
      setPhotos(old => [...old, ...picked].slice(0, PHOTOS_MAX));
      if (picked.length) { setError(''); clearField('photos'); }
    } catch {
      setPhotoError('No pudimos preparar las fotos. Elige otras.');
    }
  };

  const validate = (): { field: AdoptionField; message: string } | null => {
    if (!title.trim()) return { field: 'title', message: 'Escribe un título.' };
    if (title.trim().length > TITLE_MAX) return { field: 'title', message: `El título admite hasta ${TITLE_MAX} caracteres.` };
    if (!description.trim()) return { field: 'description', message: 'Escribe una descripción.' };
    if (description.trim().length > DESCRIPTION_MAX) return { field: 'description', message: 'La descripción admite hasta 3 000 caracteres.' };
    if (!photos.length) return { field: 'photos', message: 'Agrega al menos una foto del animal.' };
    if (!adoption && !accepted) return { field: 'accepted', message: 'Confirma que el anuncio es solo para adopción, sin venta.' };
    return null;
  };

  const save = async () => {
    if (submitting.current || !token) return;
    const problem = validate();
    if (problem) { setError(''); setFieldError(problem); return; }
    submitting.current = true; setBusy(true); setError(''); setFieldError(null); Keyboard.dismiss();
    const draft = { title: title.trim(), description: description.trim(), petId };
    const added = photos.flatMap(p => p.kind === 'new' ? [p.photo] : []);
    try {
      if (adoption) {
        const keep = photos.flatMap(p => p.kind === 'saved' ? [p.id] : []);
        await updateAdoption(token, adoption.id, draft, keep, added);
        toast.show('Guardaste los cambios');
        goBackOrReplace(router, (`/adoptions/${adoption.id}`) as Href);
      } else {
        const created = await createAdoption(token, draft, added);
        toast.show('¡Anuncio publicado!');
        router.replace((`/adoptions/${created.id}`) as Href);
      }
    } catch (cause) {
      setError(`${cause instanceof Error ? cause.message : 'No se pudo guardar el anuncio.'} Lo que escribiste y las fotos siguen aquí.`);
    } finally { submitting.current = false; setBusy(false); }
  };

  const selectedPet = pets.find(p => p.id === petId)?.name ?? (petId !== null && petId === adoption?.pet?.id ? adoption.pet.name : undefined);
  const back = () => goBackOrReplace(router, (adoption ? `/adoptions/${adoption.id}` : '/adopcion') as Href);
  const message = (field: AdoptionField) => errorFor(field) ? <Text accessibilityRole="alert" style={[styles.fieldError, { color: c.error }]}>{errorFor(field)}</Text> : null;
  return <SafeAreaView style={[styles.screen, { backgroundColor: c.background }]} edges={['top', 'bottom']}>
    {/* «Volver» fijo fuera del contenido desplazable (22-11-2026). */}
    <View style={[styles.header, { borderColor: c.border }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={back} style={styles.back}><Ionicons name="arrow-back" size={24} color={c.accent} /><Text style={[styles.link, { color: c.accent }]}>Volver</Text></Pressable>
    </View>
    <FormScrollView contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={[styles.heading, { color: c.accent }]}>{adoption ? 'Editar anuncio' : 'Publicar en adopción'}</Text>
      <Text style={[styles.label, { color: c.textPrimary }]}>Título</Text>
      <TextInput accessibilityLabel="Título" value={title} onChangeText={text => { setTitle(text); clearField('title'); }} maxLength={TITLE_MAX + 1} editable={!busy} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => descriptionRef.current?.focus()} placeholder="Ej.: Michi de 2 años busca hogar" placeholderTextColor={c.muted} style={[styles.input, { backgroundColor: c.surface, color: c.textPrimary, borderColor: errorFor('title') ? c.error : c.border }]} />
      <View style={styles.underField}>{message('title') ?? <View />}<Text style={[styles.counter, { color: title.length > TITLE_MAX ? c.error : c.muted }]}>{title.length}/{TITLE_MAX}</Text></View>

      <Text style={[styles.label, { color: c.textPrimary }]}>Descripción</Text>
      <TextInput ref={descriptionRef} accessibilityLabel="Descripción" value={description} onChangeText={text => { setDescription(text); clearField('description'); }} maxLength={DESCRIPTION_MAX + 1} editable={!busy} multiline textAlignVertical="top" placeholder="Edad, carácter, cuidados, vacunas, en qué zona está…" placeholderTextColor={c.muted} style={[styles.input, styles.description, { backgroundColor: c.surface, color: c.textPrimary, borderColor: errorFor('description') ? c.error : c.border }]} />
      <View style={styles.underField}>{message('description') ?? <View />}<Text style={[styles.counter, { color: description.length > DESCRIPTION_MAX ? c.error : c.muted }]}>{description.length}/3 000</Text></View>

      <Text style={[styles.label, { color: c.textPrimary }]}>Ficha de «Mis mascotas» (opcional)</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Ficha enlazada: ${selectedPet ?? 'ninguna'}`} disabled={busy} onPress={() => { Keyboard.dismiss(); setPetPicker(true); }} style={[styles.select, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[styles.selectText, { color: selectedPet ? c.textPrimary : c.muted }]}>{selectedPet ?? 'Sin ficha'}</Text><Ionicons name="chevron-down" size={20} color={c.accent} />
      </Pressable>
      {petError ? <View style={styles.inline}><Text style={[styles.error, { color: c.error }]}>{petError}</Text><Pressable accessibilityRole="button" accessibilityLabel="Reintentar cargar tus mascotas" onPress={() => void loadPets()} style={styles.retry}><Text style={[styles.link, { color: c.accent }]}>Reintentar</Text></Pressable></View> : null}

      <Text style={[styles.label, { color: c.textPrimary }]}>Fotos del animal ({photos.length}/{PHOTOS_MAX})</Text>
      <Text style={[styles.hint, { color: c.muted }]}>De una a tres fotos del mismo animal. La primera es la que se ve en la lista.</Text>
      <View style={styles.photoRow}>
        {photos.map((item, index) => <View key={item.kind === 'saved' ? `s${item.id}` : item.key} style={[styles.thumb, { backgroundColor: c.surfaceAlt }]}>
          <Image source={item.kind === 'saved' && token ? adoptionPhotoSource(item.url, token) : { uri: item.kind === 'new' ? item.photo.uri : undefined }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory" />
          {index === 0 ? <View style={[styles.cover, { backgroundColor: c.accent }]}><Text style={[styles.coverText, { color: c.onAccent }]}>Principal</Text></View> : null}
          <Pressable accessibilityRole="button" accessibilityLabel={`Quitar foto ${index + 1}`} disabled={busy} onPress={() => setPhotos(old => old.filter(p => p !== item))} style={styles.remove} hitSlop={6}>
            <Ionicons name="close-circle" size={26} color="#FFFFFF" />
          </Pressable>
        </View>)}
        {photos.length < PHOTOS_MAX ? <Pressable accessibilityRole="button" accessibilityLabel="Agregar fotos" disabled={busy} onPress={() => void choosePhotos()} style={[styles.thumb, styles.add, { borderColor: errorFor('photos') ? c.error : c.accent }]}>
          <Ionicons name="camera-outline" size={26} color={c.accent} /><Text style={[styles.addText, { color: c.accent }]}>Agregar</Text>
        </Pressable> : null}
      </View>
      {message('photos')}
      {photoError ? <Text accessibilityRole="alert" style={[styles.error, { color: c.error }]}>{photoError}</Text> : null}
      <Text style={[styles.hint, styles.formats, { color: c.muted }]}>JPEG, PNG o WebP de hasta 5 MB cada una.</Text>

      <View style={[styles.rule, { backgroundColor: c.surfaceAlt }]}>
        <Ionicons name="heart-outline" size={20} color={c.textPrimary} />
        <Text style={[styles.ruleText, { color: c.textPrimary }]}><Text style={styles.ruleStrong}>Solo adopciones, no ventas.</Text> Un anuncio es para un solo animal y no puede pedir dinero a cambio.</Text>
      </View>

      {!adoption ? <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: accepted, disabled: busy }} disabled={busy} onPress={() => { setAccepted(v => !v); setError(''); clearField('accepted'); }} style={styles.accept}>
        <Ionicons name={accepted ? 'checkbox' : 'square-outline'} size={26} color={accepted ? c.accent : errorFor('accepted') ? c.error : c.muted} />
        <Text style={[styles.acceptText, { color: c.textPrimary }]}>Confirmo que este anuncio es solo para adopción y que no pediré dinero por el animal.</Text>
      </Pressable> : null}
      {message('accepted')}

      {error ? <Text accessibilityRole="alert" style={[styles.error, { color: c.error }]}>{error}</Text> : null}
      <Pressable accessibilityRole="button" accessibilityLabel={busy ? 'Guardando anuncio' : adoption ? 'Guardar cambios' : 'Publicar anuncio'} accessibilityState={{ busy, disabled: busy }} disabled={busy} onPress={() => void save()} style={[styles.save, { backgroundColor: busy ? c.border : c.accent }]}>
        {busy ? <><ActivityIndicator color={c.onAccent} /><Text style={[styles.saveText, { color: c.onAccent }]}>{photos.some(p => p.kind === 'new') ? 'Subiendo fotos…' : 'Guardando…'}</Text></>
          : <Text style={[styles.saveText, { color: c.onAccent }]}>{adoption ? 'Guardar cambios' : 'Publicar anuncio'}</Text>}
      </Pressable>
    </FormScrollView>

    <Modal transparent visible={petPicker} animationType="fade" onRequestClose={() => setPetPicker(false)}>
      <Pressable style={styles.overlay} onPress={() => setPetPicker(false)}>
        <View style={[styles.menu, { backgroundColor: c.surface }]}>
          <Text style={[styles.menuTitle, { color: c.accent }]}>Enlazar ficha</Text>
          <ScrollView style={styles.options}>
            <Pressable accessibilityRole="button" accessibilityState={{ selected: petId === null }} style={styles.option} onPress={() => { setPetId(null); setPetPicker(false); }}><Text style={[styles.selectText, { color: c.textPrimary }]}>Sin ficha</Text>{petId === null ? <Ionicons name="checkmark" size={20} color={c.accent} /> : null}</Pressable>
            {petBusy && !pets.length ? <Text style={[styles.selectText, { color: c.muted }]}>Cargando tus mascotas…</Text> : null}
            {petError ? <Pressable accessibilityRole="button" style={styles.option} onPress={() => void loadPets()}><Text style={[styles.selectText, { color: c.error }]}>No se cargaron. Reintentar</Text></Pressable> : null}
            {!petBusy && !petError && !pets.length ? <Text style={[styles.hint, { color: c.muted }]}>No tienes fichas en «Mis mascotas». Puedes publicar sin ficha.</Text> : null}
            {pets.map(pet => <Pressable key={pet.id} accessibilityRole="button" accessibilityState={{ selected: petId === pet.id }} style={styles.option} onPress={() => { setPetId(pet.id); setPetPicker(false); }}><Text style={[styles.selectText, { color: c.textPrimary }]}>{pet.name}</Text>{petId === pet.id ? <Ionicons name="checkmark" size={20} color={c.accent} /> : null}</Pressable>)}
            {petCursor !== null ? <Pressable accessibilityRole="button" style={styles.option} onPress={() => void loadPets(petCursor)}><Text style={[styles.selectText, { color: c.accent }]}>{petBusy ? 'Cargando…' : 'Cargar más mascotas'}</Text></Pressable> : null}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { padding: spacing.lg, paddingBottom: 48 },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  back: { minHeight: 44, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8 },
  underField: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginTop: 4 },
  fieldError: { flex: 1, fontFamily: 'Nunito_600SemiBold', fontSize: 14, lineHeight: 20, marginTop: 4 },
  formats: { marginTop: spacing.sm, marginBottom: 0 }, retry: { minHeight: 44, justifyContent: 'center' },
  link: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
  heading: { fontFamily: 'Nunito_700Bold', fontSize: 28, lineHeight: 34, letterSpacing: -0.3, marginTop: spacing.xs, marginBottom: spacing.sm },
  rule: { flexDirection: 'row', gap: spacing.sm, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.xl },
  ruleText: { flex: 1, fontFamily: 'Nunito_400Regular', fontSize: 15, lineHeight: 21 },
  ruleStrong: { fontFamily: 'Nunito_700Bold' },
  label: { fontFamily: 'Nunito_700Bold', fontSize: 16, marginTop: spacing.lg, marginBottom: 6 },
  hint: { fontFamily: 'Nunito_400Regular', fontSize: 14, lineHeight: 20, marginBottom: spacing.sm },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  thumb: { width: 100, height: 100, borderRadius: radius.md, overflow: 'hidden' },
  add: { borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 2 },
  addText: { fontFamily: 'Nunito_700Bold', fontSize: 13 },
  cover: { position: 'absolute', left: 6, bottom: 6, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  coverText: { fontFamily: 'Nunito_700Bold', fontSize: 11 },
  remove: { position: 'absolute', top: 2, right: 2, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  input: { borderWidth: 1, borderRadius: 15, minHeight: 52, paddingHorizontal: 14, fontFamily: 'Nunito_400Regular', fontSize: 16 },
  description: { height: 170, paddingTop: 12 },
  counter: { fontFamily: 'Nunito_400Regular', fontSize: 13, textAlign: 'right' },
  select: { minHeight: 52, borderWidth: 1, borderRadius: 15, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectText: { fontFamily: 'Nunito_600SemiBold', fontSize: 16 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  accept: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.md, minHeight: 44 },
  acceptText: { flex: 1, fontFamily: 'Nunito_600SemiBold', fontSize: 15, lineHeight: 22 },
  error: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, lineHeight: 20, marginTop: spacing.md },
  save: { minHeight: 52, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.xl },
  saveText: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 28 },
  menu: { borderRadius: 20, padding: 18, maxHeight: '70%' },
  menuTitle: { fontFamily: 'Nunito_700Bold', fontSize: 20, marginBottom: 10 },
  options: { flexGrow: 0 },
  option: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
