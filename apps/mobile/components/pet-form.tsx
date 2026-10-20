import { useRef, useState, type RefObject } from 'react';
import { ActivityIndicator, Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';

import { useAuthContext } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
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
  const { token } = useAuthContext();
  const router = useRouter();
  const colors = useColorScheme() === 'dark' ? dark : light;
  const otherSpeciesRef = useRef<TextInput>(null);
  const breedRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);
  const monthRef = useRef<TextInput>(null);
  const dayRef = useRef<TextInput>(null);
  const bioRef = useRef<TextInput>(null);
  const submitting = useRef(false);
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

  const choosePhoto = async () => {
    setError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: false, quality: 1 });
      if (result.canceled || !result.assets[0]) return;
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
      size ??= (await (await fetch(uri)).blob()).size;
      if (size > 5 * 1024 * 1024) { setError('La foto supera 5 MB. Elige otra imagen.'); return; }
      setPhoto({ uri, name: fileName, mimeType, size }); setRemovePhoto(false); setPhotoFailed(false);
    } catch { setError('No pudimos preparar la foto. Elige otra imagen.'); }
  };

  const save = async () => {
    if (submitting.current || !token) return;
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
    submitting.current = true; setBusy(true); setError(''); Keyboard.dismiss();
    try {
      const saved = pet || createdId ? await updatePet(token, pet?.id ?? createdId!, draft) : await createPet(token, draft);
      if (!pet && !createdId) setCreatedId(saved.id);
      if (photo) await uploadPetPhoto(token, saved.id, photo);
      else if (removePhoto && pet?.photoUrl) await removePetPhoto(token, saved.id);
      router.replace((`/pets/${saved.id}`) as Href);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar la ficha. Intenta de nuevo.');
    } finally { submitting.current = false; setBusy(false); }
  };

  return <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={24} color={colors.heading} /><Text style={[styles.link, { color: colors.heading }]}>Volver</Text></Pressable>
    <Text style={[styles.title, { color: colors.heading }]}>{pet ? 'Editar mascota' : 'Agregar mascota'}</Text>
    <Text style={[styles.intro, { color: colors.text }]}>La foto y la descripción son opcionales. La edad se calculará con su nacimiento.</Text>
    <Field label="Nombre" value={name} onChangeText={setName} colors={colors} maxLength={50} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => { Keyboard.dismiss(); setSpeciesOpen(true); }} />
    <View style={styles.field}><Text style={[styles.label, { color: colors.heading }]}>Especie</Text><Pressable accessibilityRole="button" accessibilityLabel="Elegir especie" style={[styles.select, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => { Keyboard.dismiss(); setSpeciesOpen(true); }}><Text style={[styles.value, { color: colors.text }]}>{species || 'Elige una especie'}</Text><Ionicons name="chevron-down" size={20} color={colors.heading} /></Pressable></View>
    {species === 'Otra' ? <Field label="¿Cuál especie?" value={otherSpecies} onChangeText={setOtherSpecies} colors={colors} inputRef={otherSpeciesRef} maxLength={50} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => breedRef.current?.focus()} /> : null}
    <Field label="Raza" value={breed} onChangeText={setBreed} colors={colors} inputRef={breedRef} maxLength={50} placeholder="Mestiza o Raza desconocida, si no la sabes" returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => yearRef.current?.focus()} />
    <Text style={[styles.label, { color: colors.heading }]}>Nacimiento</Text>
    <View style={styles.modeRow}><Pressable accessibilityRole="radio" accessibilityState={{ checked: !approximate }} style={[styles.mode, { backgroundColor: !approximate ? colors.heading : colors.card }]} onPress={() => setApproximate(false)}><Text style={[styles.modeText, { color: !approximate ? colors.actionText : colors.text }]}>Fecha exacta</Text></Pressable><Pressable accessibilityRole="radio" accessibilityState={{ checked: approximate }} style={[styles.mode, { backgroundColor: approximate ? colors.heading : colors.card }]} onPress={() => setApproximate(true)}><Text style={[styles.modeText, { color: approximate ? colors.actionText : colors.text }]}>Mes y año</Text></Pressable></View>
    <View style={styles.dateRow}>
      <View style={styles.dateField}><Field label="Año" value={year} onChangeText={setYear} colors={colors} inputRef={yearRef} keyboardType="number-pad" maxLength={4} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => monthRef.current?.focus()} /></View>
      <View style={styles.dateField}><Field label="Mes" value={month} onChangeText={setMonth} colors={colors} inputRef={monthRef} keyboardType="number-pad" maxLength={2} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => approximate ? bioRef.current?.focus() : dayRef.current?.focus()} /></View>
      {!approximate ? <View style={styles.dateField}><Field label="Día" value={day} onChangeText={setDay} colors={colors} inputRef={dayRef} keyboardType="number-pad" maxLength={2} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => bioRef.current?.focus()} /></View> : null}
    </View>
    <Field label="Descripción (opcional)" value={bio} onChangeText={setBio} colors={colors} inputRef={bioRef} multiline maxLength={300} textAlignVertical="top" />
    <Text style={[styles.label, { color: colors.heading }]}>Foto (opcional)</Text>
    {photo && !photoFailed ? <Image source={{ uri: photo.uri }} style={styles.preview} contentFit="cover" onError={() => setPhotoFailed(true)} /> : !removePhoto && pet?.photoUrl && token && !photoFailed ? <Image source={petPhotoSource(pet.photoUrl, token)} style={styles.preview} contentFit="cover" cachePolicy="none" onError={() => setPhotoFailed(true)} /> : <View style={[styles.photoPlaceholder, { backgroundColor: colors.card }]}><Ionicons name="paw-outline" size={34} color={colors.heading} /><Text style={[styles.value, { color: colors.muted }]}>Sin foto</Text></View>}
    {photoFailed ? <Text style={[styles.error, { color: colors.error }]}>No se pudo mostrar la foto. Puedes elegir otra.</Text> : null}
    <View style={styles.photoActions}><Pressable accessibilityRole="button" onPress={() => void choosePhoto()} style={styles.photoAction}><Text style={[styles.link, { color: colors.heading }]}>{photo || pet?.photoUrl ? 'Cambiar foto' : 'Elegir foto'}</Text></Pressable>{photo || pet?.photoUrl && !removePhoto ? <Pressable accessibilityRole="button" onPress={() => { setPhoto(null); setRemovePhoto(true); setPhotoFailed(false); }} style={styles.photoAction}><Text style={[styles.link, { color: colors.error }]}>Quitar foto</Text></Pressable> : null}</View>
    {error ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
    <Pressable accessibilityRole="button" disabled={busy} onPress={() => void save()} style={[styles.save, { backgroundColor: colors.heading }]}>{busy ? <ActivityIndicator color={colors.actionText} /> : <Text style={[styles.saveText, { color: colors.actionText }]}>{pet || createdId ? 'Guardar cambios' : 'Agregar mascota'}</Text>}</Pressable>
    {createdId ? <Text style={[styles.intro, { color: colors.text }]}>La ficha ya se guardó. Si falló la foto, vuelve a pulsar «Guardar cambios»; no se duplicará la mascota.</Text> : null}
  </ScrollView>
  <Modal visible={speciesOpen} transparent animationType="fade" onRequestClose={() => setSpeciesOpen(false)}><Pressable style={styles.overlay} onPress={() => setSpeciesOpen(false)}><View style={[styles.menu, { backgroundColor: colors.card }]}><Text style={[styles.menuTitle, { color: colors.heading }]}>Elige la especie</Text>{speciesOptions.map(option => <Pressable key={option} accessibilityRole="radio" accessibilityState={{ checked: species === option }} style={styles.option} onPress={() => { setSpecies(option); setSpeciesOpen(false); setTimeout(() => option === 'Otra' ? otherSpeciesRef.current?.focus() : breedRef.current?.focus(), 100); }}><Text style={[styles.value, { color: colors.text }]}>{option}</Text>{species === option ? <Ionicons name="checkmark" size={20} color={colors.heading} /> : null}</Pressable>)}</View></Pressable></Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { padding: 16, paddingBottom: 48 }, back: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, marginBottom: 12 },
  title: { fontFamily: 'Nunito_700Bold', fontSize: 29, lineHeight: 36 }, intro: { fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 23, marginTop: 5, marginBottom: 18 },
  field: { marginBottom: 16 }, label: { fontFamily: 'Nunito_700Bold', fontSize: 16, marginBottom: 7 }, input: { borderWidth: 1, borderRadius: 14, minHeight: 50, paddingHorizontal: 14, fontFamily: 'Nunito_400Regular', fontSize: 16 }, multiline: { minHeight: 100, paddingTop: 12 },
  select: { minHeight: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, value: { fontFamily: 'Nunito_600SemiBold', fontSize: 16 },
  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 14 }, mode: { minHeight: 44, paddingHorizontal: 15, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, modeText: { fontFamily: 'Nunito_700Bold', fontSize: 15 },
  dateRow: { flexDirection: 'row', gap: 10 }, dateField: { flex: 1 }, preview: { width: '100%', height: 210, borderRadius: 16 }, photoPlaceholder: { height: 130, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 6 },
  photoActions: { flexDirection: 'row', gap: 24, marginTop: 10, marginBottom: 22 }, photoAction: { minHeight: 44, justifyContent: 'center' }, link: { fontFamily: 'Nunito_700Bold', fontSize: 16 }, error: { fontFamily: 'Nunito_600SemiBold', fontSize: 15, lineHeight: 21, marginBottom: 16 },
  save: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, saveText: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 28 }, menu: { borderRadius: 22, padding: 18 }, menuTitle: { fontFamily: 'Nunito_700Bold', fontSize: 20, marginBottom: 8 }, option: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
