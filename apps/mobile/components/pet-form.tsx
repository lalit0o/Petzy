import { useCallback, useEffect, useId, useRef, useState, type RefObject } from 'react';
import { ActivityIndicator, Alert, InputAccessoryView, Keyboard, Platform, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRouter, type Href } from 'expo-router';

import { usePreventRemove } from 'expo-router/react-navigation';
import { AnchoredMenu, AnchoredMenuItem } from '@/components/anchored-menu';
import { useAuthContext } from '@/context/AuthContext';
import { FormScrollView } from '@/components/form-scroll-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { goBackOrReplace } from '@/lib/navigation';
import { localPhotoSize } from '@/lib/photo-upload';
import { createPet, petPhotoSource, removePetPhoto, updatePet, uploadPetPhoto, type Pet, type PetDraft, type PetPhoto } from '@/lib/pets-api';

const speciesOptions = ['Perro', 'Gato', 'Ave', 'Conejo', 'Otra'] as const;
const light = { bg: '#DBDFD0', card: '#F8F7F0', text: '#111212', heading: '#365625', muted: '#525D48', border: '#B5AF8B', actionText: '#FFFFFF', error: '#8C3F37' };
const dark = { bg: '#182213', card: '#20311C', text: '#DBDFD0', heading: '#82A87E', muted: '#B5AF8B', border: '#525D48', actionText: '#182213', error: '#F0A59A' };

function Field({ label, value, onChangeText, colors, inputRef, ...props }: TextInputProps & {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  colors: typeof light;
  inputRef?: RefObject<TextInput | null>;
}) {
  return <View style={styles.field}>
    <Text style={[styles.label, { color: colors.heading }]}>{label}</Text>
    <TextInput {...props} ref={inputRef} accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholderTextColor={colors.muted} style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }, props.multiline && styles.multiline]} />
  </View>;
}

export function PetForm({ pet }: { pet?: Pet }) {
  const { token, user } = useAuthContext();
  const router = useRouter();
  const navigation = useNavigation();
  const colors = useColorScheme() === 'dark' ? dark : light;
  const otherSpeciesRef = useRef<TextInput>(null);
  const breedRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);
  const monthRef = useRef<TextInput>(null);
  const dayRef = useRef<TextInput>(null);
  const bioRef = useRef<TextInput>(null);
  const submitting = useRef(false);
  const viewActive = useRef(false);
  const operationId = useRef(0);
  const savedId = useRef<number | null>(pet?.id ?? null);
  const speciesButton = useRef<View>(null);
  const pendingFocus = useRef(false);
  const [speciesAnchor, setSpeciesAnchor] = useState({ x: 0, y: 0, bottom: 0 });
  const [focusVersion, setFocusVersion] = useState(0);
  const [name, setName] = useState(pet?.name ?? '');
  const [species, setSpecies] = useState<string>(speciesOptions.includes(pet?.species as typeof speciesOptions[number]) ? pet!.species : pet ? 'Otra' : '');
  const [otherSpecies, setOtherSpecies] = useState(pet && !speciesOptions.includes(pet.species as typeof speciesOptions[number]) ? pet.species : '');
  const [breed, setBreed] = useState(pet?.breed ?? '');
  const [year, setYear] = useState(pet ? String(pet.birth.year) : '');
  const [month, setMonth] = useState(pet ? String(pet.birth.month) : '');
  const [day, setDay] = useState(pet?.birth.day === null || !pet ? '' : String(pet.birth.day));
  const [approximate, setApproximate] = useState(pet?.birth.day === null);
  const [bio, setBio] = useState(pet?.bio ?? '');
  const [photo, setPhoto] = useState<PetPhoto | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [speciesOpen, setSpeciesOpen] = useState(false);
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [picking, setPicking] = useState(false);
  const [stage, setStage] = useState('Guardando ficha…');
  const ownerId = user?.id;
  const dateAccessoryId = useId();
  const [dateFocus, setDateFocus] = useState<'year' | 'month' | 'day'>('year');
  const pendingNavigation = useRef<(() => void) | null>(null);
  const [allowLeave, setAllowLeave] = useState(false);
  const formSnapshot = JSON.stringify({ name, species, otherSpecies, breed, year, month, day, approximate, bio, photo, removePhoto });
  const [initialSnapshot] = useState(formSnapshot);
  const dirty = initialSnapshot !== formSnapshot;
  usePreventRemove(Boolean(token && ownerId && !allowLeave && (dirty || busy || picking)), ({ data }) => {
    if (submitting.current) return;
    Alert.alert('¿Salir sin guardar?', createdId ? 'La ficha ya existe. Los cambios pendientes no se guardarán; los datos que ya se guardaron permanecerán.' : 'Los cambios de este formulario no se guardarán.', [
      { text: 'Seguir editando', style: 'cancel' },
      { text: 'Salir sin guardar', style: 'destructive', onPress: () => {
        if (!viewActive.current) return;
        pendingNavigation.current = () => navigation.dispatch(data.action);
        setAllowLeave(true);
      } },
    ]);
  });
  useEffect(() => {
    if (!allowLeave || !viewActive.current) return;
    const action = pendingNavigation.current; pendingNavigation.current = null;
    action?.();
  }, [allowLeave]);

  useFocusEffect(useCallback(() => {
    viewActive.current = Boolean(ownerId);
    return () => { viewActive.current = false; operationId.current++; pendingFocus.current = false; };
  }, [ownerId]));
  useEffect(() => {
    if (!speciesOpen && pendingFocus.current) {
      pendingFocus.current = false;
      (species === 'Otra' ? otherSpeciesRef : breedRef).current?.focus();
    }
  }, [species, speciesOpen, focusVersion]);

  const openSpecies = () => {
    if (submitting.current) return;
    Keyboard.dismiss();
    speciesButton.current?.measureInWindow((x, y, width, height) => {
      if (!viewActive.current) return;
      setSpeciesAnchor({ x: x + width / 2, y: y + height / 2, bottom: y + height });
      setSpeciesOpen(true);
    });
  };

  const choosePhoto = async () => {
    if (submitting.current) return;
    submitting.current = true; setPicking(true); setError('');
    const current = operationId.current;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: false, quality: 1 });
      if (!viewActive.current || current !== operationId.current || result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      let uri = asset.uri;
      let mimeType = asset.mimeType ?? '';
      let fileName = asset.fileName ?? 'mascota.jpg';
      let size = asset.fileSize;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
        const image = await ImageManipulator.manipulate(uri).renderAsync();
        const converted = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
        uri = converted.uri; mimeType = 'image/jpeg'; fileName = 'mascota.jpg'; size = undefined;
      }
      size ??= await localPhotoSize(uri);
      if (!viewActive.current || current !== operationId.current) return;
      if (size > 5 * 1024 * 1024) { setError('La foto supera 5 MB. Elige otra imagen.'); return; }
      setPhoto({ uri, name: fileName, mimeType, size }); setRemovePhoto(false); setPhotoFailed(false);
    } catch { if (viewActive.current && current === operationId.current) setError('No pudimos preparar la foto. Elige otra imagen.'); }
    finally { submitting.current = false; setPicking(false); }
  };

  const save = async () => {
    if (submitting.current || !token || !viewActive.current) return;
    const cleanName = name.trim();
    const cleanSpecies = species === 'Otra' ? otherSpecies.trim() : species;
    const cleanBreed = breed.trim();
    if (cleanName.length < 2 || cleanName.length > 50) { setError('Escribe un nombre de 2 a 50 caracteres.'); return; }
    if (!species || cleanSpecies.length < 2 || cleanSpecies.length > 50) { setError('Elige una especie; si seleccionas «Otra», escribe cuál.'); return; }
    if (cleanBreed.length < 2 || cleanBreed.length > 50) { setError('Escribe una raza de 2 a 50 caracteres. Puedes poner «Mestiza» o «Raza desconocida».'); return; }
    if (bio.length > 300) { setError('La descripción admite hasta 300 caracteres.'); return; }
    const birthYear = Number(year), birthMonth = Number(month), birthDay = approximate ? null : Number(day);
    const now = new Date();
    if (!/^\d{1,4}$/.test(year) || !/^\d{1,2}$/.test(month) || (!approximate && !/^\d{1,2}$/.test(day)) || birthYear < 1 || birthMonth < 1 || birthMonth > 12 || (!approximate && (birthDay === null || birthDay < 1))) {
      setError('Indica un año, mes y, si conoces la fecha exacta, un día válidos.'); return;
    }
    const lastDay = new Date(Date.UTC(birthYear, birthMonth, 0)).getUTCDate();
    if (!approximate && birthDay !== null && birthDay > lastDay) { setError('Ese día no existe en el mes indicado.'); return; }
    if (birthYear > now.getUTCFullYear() || (birthYear === now.getUTCFullYear() && (birthMonth > now.getUTCMonth() + 1 || (!approximate && birthMonth === now.getUTCMonth() + 1 && birthDay !== null && birthDay > now.getUTCDate())))) {
      setError('El nacimiento no puede ser futuro.'); return;
    }
    const draft: PetDraft = { name: cleanName, species: cleanSpecies, breed: cleanBreed, bio: bio.trim() || null, birth: { year: birthYear, month: birthMonth, day: birthDay } };
    submitting.current = true; setBusy(true); setStage('Guardando ficha…'); setError(''); Keyboard.dismiss();
    const current = operationId.current;
    let detailsSaved = false;
    try {
      const saved = savedId.current ? await updatePet(token, savedId.current, draft) : await createPet(token, draft);
      savedId.current = saved.id;
      if (!viewActive.current || current !== operationId.current) return;
      if (!pet) setCreatedId(saved.id);
      detailsSaved = true;
      if (photo) { setStage('Guardando foto…'); await uploadPetPhoto(token, saved.id, photo); }
      else if (removePhoto && (pet?.photoUrl || createdId)) { setStage('Quitando foto…'); await removePetPhoto(token, saved.id); }
      if (viewActive.current && current === operationId.current) {
        pendingNavigation.current = () => router.replace((`/pets/${saved.id}`) as Href);
        setAllowLeave(true);
      }
    } catch (cause) {
      if (!viewActive.current || current !== operationId.current) return;
      const message = cause instanceof Error ? cause.message : 'Intenta de nuevo.';
      setError(detailsSaved ? `La ficha se guardó, pero no se pudo actualizar la foto. ${message} Puedes reintentar sin duplicar la mascota.` : message);
    } finally { submitting.current = false; setBusy(false); }
  };

  return <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}><FormScrollView contentContainerStyle={styles.content}>
    <Pressable accessibilityRole="button" disabled={busy || picking} onPress={() => goBackOrReplace(router, pet ? { pathname: '/pets/[id]', params: { id: String(pet.id) } } : '/mascotas')} style={styles.back}><Ionicons name="arrow-back" size={24} color={colors.heading} /><Text style={[styles.link, { color: colors.heading }]}>Volver</Text></Pressable>
    <Text style={[styles.title, { color: colors.heading }]}>{pet ? 'Editar mascota' : 'Agregar mascota'}</Text>
    <Text style={[styles.intro, { color: colors.text }]}>La foto y la descripción son opcionales. La edad se calculará con su nacimiento.</Text>
    <Field label="Nombre" value={name} onChangeText={setName} colors={colors} editable={!busy && !picking} maxLength={50} returnKeyType="next" submitBehavior="submit" onSubmitEditing={openSpecies} />
    <View style={styles.field}><Text style={[styles.label, { color: colors.heading }]}>Especie</Text><View ref={speciesButton} collapsable={false}><Pressable accessibilityRole="button" accessibilityLabel="Elegir especie" accessibilityState={{ expanded: speciesOpen, disabled: busy || picking }} disabled={busy || picking} style={[styles.select, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={openSpecies}><Text style={[styles.value, { color: colors.text }]}>{species || 'Elige una especie'}</Text><Ionicons name="chevron-down" size={20} color={colors.heading} /></Pressable></View></View>
    {species === 'Otra' ? <Field label="¿Cuál especie?" value={otherSpecies} onChangeText={setOtherSpecies} colors={colors} editable={!busy && !picking} inputRef={otherSpeciesRef} maxLength={50} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => breedRef.current?.focus()} /> : null}
    <Field label="Raza" value={breed} onChangeText={setBreed} colors={colors} editable={!busy && !picking} inputRef={breedRef} maxLength={50} placeholder="Mestiza o Raza desconocida, si no la sabes" returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => yearRef.current?.focus()} />
    <View style={styles.breedChoices}>{['Mestiza', 'Raza desconocida'].map(option => <Pressable key={option} accessibilityRole="button" accessibilityLabel={`Usar raza ${option}`} accessibilityState={{ selected: breed === option }} disabled={busy || picking} onPress={() => { setBreed(option); yearRef.current?.focus(); }} style={[styles.breedChoice, { borderColor: colors.border, backgroundColor: breed === option ? colors.heading : colors.card }]}><Text style={[styles.modeText, { color: breed === option ? colors.actionText : colors.text }]}>{option}</Text></Pressable>)}</View>
    <Text style={[styles.label, { color: colors.heading }]}>Nacimiento</Text>
    <View style={styles.modeRow}><Pressable accessibilityRole="radio" disabled={busy || picking} accessibilityState={{ checked: !approximate }} style={[styles.mode, { backgroundColor: !approximate ? colors.heading : colors.card }]} onPress={() => setApproximate(false)}><Text style={[styles.modeText, { color: !approximate ? colors.actionText : colors.text }]}>Fecha exacta</Text></Pressable><Pressable accessibilityRole="radio" disabled={busy || picking} accessibilityState={{ checked: approximate }} style={[styles.mode, { backgroundColor: approximate ? colors.heading : colors.card }]} onPress={() => setApproximate(true)}><Text style={[styles.modeText, { color: approximate ? colors.actionText : colors.text }]}>Mes y año aproximados</Text></Pressable></View>
    <View style={styles.dateRow}>
      <View style={styles.dateField}><Field label="Año" value={year} onChangeText={setYear} colors={colors} editable={!busy && !picking} inputRef={yearRef} inputAccessoryViewID={dateAccessoryId} onFocus={() => setDateFocus('year')} keyboardType="number-pad" maxLength={4} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => monthRef.current?.focus()} /></View>
      <View style={styles.dateField}><Field label="Mes" value={month} onChangeText={setMonth} colors={colors} editable={!busy && !picking} inputRef={monthRef} inputAccessoryViewID={dateAccessoryId} onFocus={() => setDateFocus('month')} keyboardType="number-pad" maxLength={2} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => approximate ? bioRef.current?.focus() : dayRef.current?.focus()} /></View>
      {!approximate ? <View style={styles.dateField}><Field label="Día" value={day} onChangeText={setDay} colors={colors} editable={!busy && !picking} inputRef={dayRef} inputAccessoryViewID={dateAccessoryId} onFocus={() => setDateFocus('day')} keyboardType="number-pad" maxLength={2} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => bioRef.current?.focus()} /></View> : null}
    </View>
    <Field label="Descripción (opcional)" value={bio} onChangeText={setBio} colors={colors} editable={!busy && !picking} inputRef={bioRef} multiline maxLength={300} textAlignVertical="top" />
    <Text style={[styles.label, { color: colors.heading }]}>Foto (opcional)</Text>
    {photo && !photoFailed ? <Image source={{ uri: photo.uri }} style={styles.preview} contentFit="cover" onError={() => setPhotoFailed(true)} /> : !removePhoto && pet?.photoUrl && token && !photoFailed ? <Image source={petPhotoSource(pet.photoUrl, token)} style={styles.preview} contentFit="cover" cachePolicy="none" onError={() => setPhotoFailed(true)} /> : <View style={[styles.photoPlaceholder, { backgroundColor: colors.card }]}><Ionicons name="paw-outline" size={34} color={colors.heading} /><Text style={[styles.value, { color: colors.muted }]}>Sin foto</Text></View>}
    {photoFailed ? <Text style={[styles.error, { color: colors.error }]}>No se pudo mostrar la foto. Puedes elegir otra.</Text> : null}
    <View style={styles.photoActions}><Pressable accessibilityRole="button" disabled={busy || picking} onPress={() => void choosePhoto()} style={styles.photoAction}><Text style={[styles.link, { color: colors.heading }]}>{photo || !removePhoto && pet?.photoUrl ? 'Cambiar foto' : 'Elegir foto'}</Text></Pressable>{photo || pet?.photoUrl && !removePhoto ? <Pressable accessibilityRole="button" disabled={busy || picking} onPress={() => { setPhoto(null); setRemovePhoto(true); setPhotoFailed(false); }} style={styles.photoAction}><Text style={[styles.link, { color: colors.error }]}>Quitar foto</Text></Pressable> : null}</View>
    {picking ? <View style={styles.progress}><ActivityIndicator color={colors.heading} /><Text style={[styles.value, { color: colors.text }]}>Preparando foto…</Text></View> : null}
    {error ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
    <Pressable accessibilityRole="button" disabled={busy || picking} accessibilityState={{ busy }} onPress={() => void save()} style={[styles.save, { backgroundColor: colors.heading }]}>{busy ? <View style={styles.progress}><ActivityIndicator color={colors.actionText} /><Text style={[styles.saveText, { color: colors.actionText }]}>{stage}</Text></View> : <Text style={[styles.saveText, { color: colors.actionText }]}>{pet || createdId ? 'Guardar cambios' : 'Agregar mascota'}</Text>}</Pressable>
    {createdId && !busy && error ? <Text style={[styles.intro, { color: colors.text }]}>La ficha ya se guardó. Si falló la foto, vuelve a pulsar «Guardar cambios»; no se duplicará la mascota.</Text> : null}
  </FormScrollView>
  {Platform.OS === 'ios' ? <InputAccessoryView nativeID={dateAccessoryId}><View style={[styles.keyboardBar, { backgroundColor: colors.card, borderColor: colors.border }]}><Pressable accessibilityRole="button" disabled={busy || picking} style={styles.photoAction} onPress={() => { if (dateFocus === 'year') monthRef.current?.focus(); else if (dateFocus === 'month' && !approximate) dayRef.current?.focus(); else bioRef.current?.focus(); }}><Text style={[styles.link, { color: colors.heading }]}>Siguiente</Text></Pressable></View></InputAccessoryView> : null}
  <AnchoredMenu visible={speciesOpen} anchor={speciesAnchor} onClose={() => setSpeciesOpen(false)} title="Elige la especie" width={280} estimatedHeight={360}>
    {speciesOptions.map(option => <AnchoredMenuItem key={option} label={option} selected={species === option} onPress={() => { if (!viewActive.current) return; setSpecies(option); pendingFocus.current = true; setFocusVersion(value => value + 1); }} />)}
    <AnchoredMenuItem label="Cancelar" separator={false} />
  </AnchoredMenu>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  keyboardBar: { borderTopWidth: 1, paddingHorizontal: 18, alignItems: 'flex-end' },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 8 }, breedChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }, breedChoice: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, minHeight: 44, justifyContent: 'center' },
  screen: { flex: 1 }, content: { padding: 16, paddingBottom: 48 }, back: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, marginBottom: 12 },
  title: { fontFamily: 'Nunito_700Bold', fontSize: 29, lineHeight: 36 }, intro: { fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 23, marginTop: 5, marginBottom: 18 },
  field: { marginBottom: 16 }, label: { fontFamily: 'Nunito_700Bold', fontSize: 16, marginBottom: 7 }, input: { borderWidth: 1, borderRadius: 14, minHeight: 50, paddingHorizontal: 14, fontFamily: 'Nunito_400Regular', fontSize: 16 }, multiline: { minHeight: 100, paddingTop: 12 },
  select: { minHeight: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, value: { fontFamily: 'Nunito_600SemiBold', fontSize: 16 },
  modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 }, mode: { minHeight: 44, paddingHorizontal: 15, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, modeText: { fontFamily: 'Nunito_700Bold', fontSize: 15 },
  dateRow: { flexDirection: 'row', gap: 10 }, dateField: { flex: 1 }, preview: { width: '100%', height: 210, borderRadius: 16 }, photoPlaceholder: { height: 130, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 6 },
  photoActions: { flexDirection: 'row', gap: 24, marginTop: 10, marginBottom: 22 }, photoAction: { minHeight: 44, justifyContent: 'center' }, link: { fontFamily: 'Nunito_700Bold', fontSize: 16 }, error: { fontFamily: 'Nunito_600SemiBold', fontSize: 15, lineHeight: 21, marginBottom: 16 },
  save: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, saveText: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 28 }, menu: { borderRadius: 22, padding: 18 }, menuTitle: { fontFamily: 'Nunito_700Bold', fontSize: 20, marginBottom: 8 }, option: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
