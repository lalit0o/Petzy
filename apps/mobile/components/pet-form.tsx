import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { ActivityIndicator, Alert, Keyboard, Pressable, StyleSheet, Text, TextInput, View, type TextInputInstance, type TextInputProps, type ViewInstance } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRouter, type Href } from 'expo-router';

import { usePreventRemove } from 'expo-router/react-navigation';
import { AnchoredMenu, AnchoredMenuItem } from '@/components/anchored-menu';
import { useAuthContext } from '@/context/AuthContext';
import { FormScrollView } from '@/components/form-scroll-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { goBackOrReplace } from '@/lib/navigation';
import { localPhotoSize } from '@/lib/photo-upload';
import { bumpPhotoVersion } from '@/lib/photo-cache';
import { createPet, petPhotoSource, removePetPhoto, updatePet, uploadPetPhoto, type Pet, type PetDraft, type PetPhoto } from '@/lib/pets-api';
import { petzyColors } from '@/constants/petzy-theme';

const speciesOptions = ['Perro', 'Gato', 'Ave', 'Conejo', 'Otra'] as const;
const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const now = new Date();
const YEAR_OPTIONS = Array.from({ length: 41 }, (_, index) => now.getFullYear() - index);
function oneYearAgo() { const date = new Date(); date.setFullYear(date.getFullYear() - 1); return date; }
type FormColors = { bg: string; card: string; text: string; heading: string; muted: string; border: string; actionText: string; error: string };

// Campo con su error debajo y contador opcional (mobile-forms, 22-11-2026).
function Field({ label, value, onChangeText, colors, inputRef, error, counter, ...props }: TextInputProps & {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  colors: FormColors;
  inputRef?: RefObject<TextInputInstance | null>;
  error?: string;
  counter?: number;
}) {
  return <View style={styles.field}>
    <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    <TextInput {...props} ref={inputRef} accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholderTextColor={colors.muted} style={[styles.input, { backgroundColor: colors.card, borderColor: error ? colors.error : colors.border, color: colors.text }, props.multiline && styles.multiline]} />
    {error || counter ? <View style={styles.underField}>
      {error ? <Text accessibilityRole="alert" style={[styles.fieldError, { color: colors.error }]}>{error}</Text> : <View />}
      {counter ? <Text style={[styles.counter, { color: colors.muted }]}>{value.length}/{counter}</Text> : null}
    </View> : null}
  </View>;
}

type FieldKey = 'name' | 'species' | 'breed' | 'bio';

export function PetForm({ pet }: { pet?: Pet }) {
  const { token, user } = useAuthContext();
  const router = useRouter();
  const navigation = useNavigation();
  const isDark = useColorScheme() === 'dark';
  const palette = petzyColors[isDark ? 'dark' : 'light'];
  const colors = { bg: palette.background, card: palette.surface, text: palette.textPrimary, heading: palette.accent, muted: palette.muted, border: palette.border, actionText: palette.onAccent, error: palette.error };
  const otherSpeciesRef = useRef<TextInputInstance>(null);
  const breedRef = useRef<TextInputInstance>(null);
  const bioRef = useRef<TextInputInstance>(null);
  const submitting = useRef(false);
  const viewActive = useRef(false);
  const operationId = useRef(0);
  const savedId = useRef<number | null>(pet?.id ?? null);
  const speciesButton = useRef<ViewInstance>(null);
  const yearButton = useRef<ViewInstance>(null);
  const monthButton = useRef<ViewInstance>(null);
  const pendingFocus = useRef(false);
  const pendingMonthMenu = useRef(false);
  const [speciesAnchor, setSpeciesAnchor] = useState({ x: 0, y: 0, bottom: 0 });
  const [yearAnchor, setYearAnchor] = useState({ x: 0, y: 0, bottom: 0 });
  const [monthAnchor, setMonthAnchor] = useState({ x: 0, y: 0, bottom: 0 });
  const [focusVersion, setFocusVersion] = useState(0);
  const [name, setName] = useState(pet?.name ?? '');
  const [species, setSpecies] = useState<string>(speciesOptions.includes(pet?.species as typeof speciesOptions[number]) ? pet!.species : pet ? 'Otra' : '');
  const [otherSpecies, setOtherSpecies] = useState(pet && !speciesOptions.includes(pet.species as typeof speciesOptions[number]) ? pet.species : '');
  const [breed, setBreed] = useState(pet?.breed ?? '');
  const [approximate, setApproximate] = useState(pet?.birth.day === null);
  const [birthDate, setBirthDate] = useState(() => pet && pet.birth.day !== null ? new Date(pet.birth.year, pet.birth.month - 1, pet.birth.day) : oneYearAgo());
  const [approxYear, setApproxYear] = useState(pet?.birth.day === null ? pet.birth.year : now.getFullYear() - 1);
  const [approxMonth, setApproxMonth] = useState(pet?.birth.day === null ? pet.birth.month : now.getMonth() + 1);
  const [yearOpen, setYearOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);
  const [bio, setBio] = useState(pet?.bio ?? '');
  const [photo, setPhoto] = useState<PetPhoto | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [speciesOpen, setSpeciesOpen] = useState(false);
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState<{ field: FieldKey; message: string } | null>(null);
  const errorFor = (field: FieldKey) => fieldError?.field === field ? fieldError.message : undefined;
  const clearFieldError = (field: FieldKey) => { if (fieldError?.field === field) setFieldError(null); };
  const [picking, setPicking] = useState(false);
  const [stage, setStage] = useState('Guardando ficha…');
  const ownerId = user?.id;
  const pendingNavigation = useRef<(() => void) | null>(null);
  const [allowLeave, setAllowLeave] = useState(false);
  const hasPhoto = Boolean(photo) || Boolean(!removePhoto && pet?.photoUrl);
  const formSnapshot = JSON.stringify({ name, species, otherSpecies, breed, approximate, birthDate: birthDate.toISOString(), approxYear, approxMonth, bio, photo, removePhoto });
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
  const openSpecies = () => {
    if (submitting.current) return;
    Keyboard.dismiss();
    speciesButton.current?.measureInWindow((x, y, width, height) => {
      if (!viewActive.current) return;
      setSpeciesAnchor({ x: x + width / 2, y: y + height / 2, bottom: y + height });
      setSpeciesOpen(true);
    });
  };

  const openYear = () => {
    if (submitting.current) return;
    Keyboard.dismiss();
    yearButton.current?.measureInWindow((x, y, width, height) => {
      if (!viewActive.current) return;
      setYearAnchor({ x: x + width / 2, y: y + height / 2, bottom: y + height });
      setYearOpen(true);
    });
  };

  const openMonth = () => {
    if (submitting.current) return;
    Keyboard.dismiss();
    monthButton.current?.measureInWindow((x, y, width, height) => {
      if (!viewActive.current) return;
      setMonthAnchor({ x: x + width / 2, y: y + height / 2, bottom: y + height });
      setMonthOpen(true);
    });
  };

  const monthOptions = approxYear === now.getFullYear() ? MONTH_NAMES.slice(0, now.getMonth() + 1) : MONTH_NAMES;

  useEffect(() => {
    if (!speciesOpen && pendingFocus.current) {
      pendingFocus.current = false;
      (species === 'Otra' ? otherSpeciesRef : breedRef).current?.focus();
    }
  }, [species, speciesOpen, focusVersion]);
  useEffect(() => {
    if (!yearOpen && pendingMonthMenu.current) {
      pendingMonthMenu.current = false;
      openMonth();
    }
  }, [yearOpen, focusVersion]);

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
    const invalid = (field: FieldKey, message: string) => { setError(''); setFieldError({ field, message }); };
    if (cleanName.length < 2 || cleanName.length > 50) { invalid('name', 'Escribe un nombre de 2 a 50 caracteres.'); return; }
    if (!species || cleanSpecies.length < 2 || cleanSpecies.length > 50) { invalid('species', 'Elige una especie; si seleccionas «Otra», escribe cuál.'); return; }
    if (cleanBreed.length < 2 || cleanBreed.length > 50) { invalid('breed', 'Escribe una raza de 2 a 50 caracteres. Puedes poner «Mestiza» o «Raza desconocida».'); return; }
    if (bio.length > 300) { invalid('bio', 'La descripción admite hasta 300 caracteres.'); return; }
    setFieldError(null);
    // El calendario nativo y las listas de mes/año solo permiten valores reales y no futuros.
    const birth = approximate
      ? { year: approxYear, month: approxMonth, day: null }
      : { year: birthDate.getFullYear(), month: birthDate.getMonth() + 1, day: birthDate.getDate() };
    const draft: PetDraft = { name: cleanName, species: cleanSpecies, breed: cleanBreed, bio: bio.trim() || null, birth };
    submitting.current = true; setBusy(true); setStage('Guardando ficha…'); setError(''); Keyboard.dismiss();
    const current = operationId.current;
    let detailsSaved = false;
    try {
      const saved = savedId.current ? await updatePet(token, savedId.current, draft) : await createPet(token, draft);
      savedId.current = saved.id;
      if (!viewActive.current || current !== operationId.current) return;
      if (!pet) setCreatedId(saved.id);
      detailsSaved = true;
      if (photo) { setStage('Guardando foto…'); await uploadPetPhoto(token, saved.id, photo); bumpPhotoVersion(`/pets/${saved.id}/photo`); }
      else if (removePhoto && (pet?.photoUrl || createdId)) { setStage('Quitando foto…'); await removePetPhoto(token, saved.id); }
      if (viewActive.current && current === operationId.current) {
        // Al editar, regresar con goBackOrReplace: la ficha ya está debajo en
        // la pila y un "back" real garantiza que se refresque con los datos
        // nuevos. Al crear, sí hay que avanzar hacia la ficha nueva.
        pendingNavigation.current = pet
          ? () => goBackOrReplace(router, (`/pets/${saved.id}`) as Href)
          : () => router.replace((`/pets/${saved.id}`) as Href);
        setAllowLeave(true);
      }
    } catch (cause) {
      if (!viewActive.current || current !== operationId.current) return;
      const message = cause instanceof Error ? cause.message : 'Intenta de nuevo.';
      setError(detailsSaved ? `La ficha se guardó, pero no se pudo actualizar la foto. ${message} Puedes reintentar sin duplicar la mascota.` : message);
    } finally { submitting.current = false; setBusy(false); }
  };

  return <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
    {/* «Volver» fijo fuera del contenido desplazable (22-11-2026). */}
    <View style={[styles.header, { borderColor: colors.border }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Volver" disabled={busy || picking} onPress={() => goBackOrReplace(router, pet ? { pathname: '/pets/[id]', params: { id: String(pet.id) } } : '/mascotas')} style={styles.back}><Ionicons name="arrow-back" size={24} color={colors.heading} /><Text style={[styles.link, { color: colors.heading }]}>Volver</Text></Pressable>
    </View>
    <FormScrollView contentContainerStyle={styles.content}>
    <Text style={[styles.title, { color: colors.heading }]}>{pet ? 'Editar mascota' : 'Agregar mascota'}</Text>
    <Text style={[styles.intro, { color: colors.muted }]}>La foto y la descripción son opcionales. La edad se calculará con su nacimiento.</Text>
    <Field label="Nombre" value={name} onChangeText={text => { setName(text); clearFieldError('name'); }} error={errorFor('name')} colors={colors} editable={!busy && !picking} maxLength={50} returnKeyType="next" submitBehavior="submit" onSubmitEditing={openSpecies} />
    <View style={styles.field}><Text style={[styles.label, { color: colors.text }]}>Especie</Text><View ref={speciesButton} collapsable={false}><Pressable accessibilityRole="button" accessibilityLabel={`Elegir especie${species ? `, actual: ${species}` : ''}`} accessibilityState={{ expanded: speciesOpen, disabled: busy || picking }} disabled={busy || picking} style={[styles.select, { backgroundColor: colors.card, borderColor: errorFor('species') ? colors.error : colors.border }]} onPress={openSpecies}><Text style={[styles.value, { color: species ? colors.text : colors.muted }]}>{species || 'Elige una especie'}</Text><Ionicons name="chevron-down" size={20} color={colors.heading} /></Pressable></View>
      {errorFor('species') && species !== 'Otra' ? <Text accessibilityRole="alert" style={[styles.fieldError, { color: colors.error }]}>{errorFor('species')}</Text> : null}</View>
    {species === 'Otra' ? <Field label="¿Cuál especie?" value={otherSpecies} onChangeText={text => { setOtherSpecies(text); clearFieldError('species'); }} error={errorFor('species')} colors={colors} editable={!busy && !picking} inputRef={otherSpeciesRef} maxLength={50} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => breedRef.current?.focus()} /> : null}
    <Field label="Raza" value={breed} onChangeText={text => { setBreed(text); clearFieldError('breed'); }} error={errorFor('breed')} colors={colors} editable={!busy && !picking} inputRef={breedRef} maxLength={50} placeholder="Mestiza o Raza desconocida, si no la sabes" returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => { Keyboard.dismiss(); if (approximate) openYear(); }} />
    <View style={styles.breedChoices}>{['Mestiza', 'Raza desconocida'].map(option => <Pressable key={option} accessibilityRole="button" accessibilityLabel={`Usar raza ${option}`} accessibilityState={{ selected: breed === option }} disabled={busy || picking} onPress={() => { setBreed(option); clearFieldError('breed'); Keyboard.dismiss(); if (approximate) openYear(); }} style={[styles.breedChoice, { borderColor: colors.border, backgroundColor: breed === option ? colors.heading : colors.card }]}><Text style={[styles.modeText, { color: breed === option ? colors.actionText : colors.text }]}>{option}</Text></Pressable>)}</View>
    <Text style={[styles.label, { color: colors.text }]}>Nacimiento</Text>
    {/* Dos opciones del mismo ancho, la elegida rellena y la otra con borde (como «Iré» / «No iré»). */}
    <View accessibilityRole="radiogroup" style={styles.modeRow}>
      {[{ value: false, label: 'Fecha exacta' }, { value: true, label: 'Mes y año aproximados' }].map(option => {
        const selected = approximate === option.value;
        return <Pressable key={option.label} accessibilityRole="radio" disabled={busy || picking} accessibilityState={{ checked: selected }} onPress={() => setApproximate(option.value)}
          style={({ pressed }) => [styles.mode, { borderColor: colors.heading, backgroundColor: selected ? colors.heading : 'transparent', opacity: pressed ? 0.8 : 1 }]}>
          <Text style={[styles.modeText, { color: selected ? colors.actionText : colors.heading }]}>{option.label}</Text>
        </Pressable>;
      })}
    </View>
    {approximate ? <View style={styles.dateRow}>
      <View style={styles.dateField}><Text style={[styles.label, { color: colors.text }]}>Año</Text><View ref={yearButton} collapsable={false}><Pressable accessibilityRole="button" accessibilityLabel="Elegir año de nacimiento" accessibilityState={{ expanded: yearOpen, disabled: busy || picking }} disabled={busy || picking} style={[styles.select, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={openYear}><Text style={[styles.value, { color: colors.text }]}>{approxYear}</Text><Ionicons name="chevron-down" size={20} color={colors.heading} /></Pressable></View></View>
      <View style={styles.dateField}><Text style={[styles.label, { color: colors.text }]}>Mes</Text><View ref={monthButton} collapsable={false}><Pressable accessibilityRole="button" accessibilityLabel="Elegir mes de nacimiento" accessibilityState={{ expanded: monthOpen, disabled: busy || picking }} disabled={busy || picking} style={[styles.select, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={openMonth}><Text style={[styles.value, { color: colors.text }]}>{MONTH_NAMES[approxMonth - 1]}</Text><Ionicons name="chevron-down" size={20} color={colors.heading} /></Pressable></View></View>
    </View> : <DateTimePicker value={birthDate} mode="date" display="spinner" maximumDate={now} themeVariant={isDark ? 'dark' : 'light'} onChange={(_event, date) => { if (date) setBirthDate(date); }} style={styles.spinner} />}
    <Field label="Descripción (opcional)" value={bio} onChangeText={text => { setBio(text); clearFieldError('bio'); }} error={errorFor('bio')} counter={300} colors={colors} editable={!busy && !picking} inputRef={bioRef} multiline maxLength={300} textAlignVertical="top" />
    <Text style={[styles.label, { color: colors.text }]}>Foto (opcional)</Text>
    {hasPhoto && !photoFailed
      ? (photo ? <Image source={{ uri: photo.uri }} style={styles.preview} contentFit="cover" onError={() => setPhotoFailed(true)} /> : pet?.photoUrl && token ? <Image source={petPhotoSource(pet.photoUrl, token)} style={styles.preview} contentFit="cover" cachePolicy="memory" onError={() => setPhotoFailed(true)} /> : null)
      : !hasPhoto
        ? <Pressable accessibilityRole="button" accessibilityLabel="Agregar foto de la mascota" disabled={busy || picking} onPress={() => void choosePhoto()} style={[styles.photoPlaceholder, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="camera-outline" size={34} color={colors.heading} /><Text style={[styles.value, { color: colors.heading }]}>Agregar foto</Text>
            <Text style={[styles.hint, { color: colors.muted }]}>JPEG, PNG o WebP de hasta 5 MB</Text>
          </Pressable>
        : <View style={[styles.photoPlaceholder, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="image-outline" size={34} color={colors.error} /></View>}
    {photoFailed ? <Text style={[styles.error, { color: colors.error }]}>No se pudo mostrar la foto. Puedes elegir otra.</Text> : null}
    {hasPhoto ? <View style={styles.photoActions}>
      <Pressable accessibilityRole="button" disabled={busy || picking} onPress={() => void choosePhoto()} style={[styles.photoAction, { borderColor: colors.border }]}><Text style={[styles.link, { color: colors.heading }]}>Cambiar foto</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={busy || picking} onPress={() => { setPhoto(null); setRemovePhoto(true); setPhotoFailed(false); }} style={[styles.photoAction, { borderColor: colors.border }]}><Text style={[styles.link, { color: colors.error }]}>Quitar foto</Text></Pressable>
    </View> : null}
    {picking ? <View style={styles.progress}><ActivityIndicator color={colors.heading} /><Text style={[styles.value, { color: colors.text }]}>Preparando foto…</Text></View> : null}
    {error ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
    <Pressable accessibilityRole="button" disabled={busy || picking} accessibilityState={{ busy }} onPress={() => void save()} style={[styles.save, { backgroundColor: colors.heading }]}>{busy ? <View style={styles.progress}><ActivityIndicator color={colors.actionText} /><Text style={[styles.saveText, { color: colors.actionText }]}>{stage}</Text></View> : <Text style={[styles.saveText, { color: colors.actionText }]}>{pet || createdId ? 'Guardar cambios' : 'Agregar mascota'}</Text>}</Pressable>
    {createdId && !busy && error ? <Text style={[styles.intro, { color: colors.text }]}>La ficha ya se guardó. Si falló la foto, vuelve a pulsar «Guardar cambios»; no se duplicará la mascota.</Text> : null}
  </FormScrollView>
  <AnchoredMenu visible={speciesOpen} anchor={speciesAnchor} onClose={() => setSpeciesOpen(false)} title="Elige la especie" width={280} estimatedHeight={360}>
    {speciesOptions.map(option => <AnchoredMenuItem key={option} label={option} selected={species === option} onPress={() => { if (!viewActive.current) return; setSpecies(option); pendingFocus.current = true; setFocusVersion(value => value + 1); }} />)}
    <AnchoredMenuItem label="Cancelar" separator={false} />
  </AnchoredMenu>
  <AnchoredMenu visible={yearOpen} anchor={yearAnchor} onClose={() => setYearOpen(false)} title="Elige el año" width={240} estimatedHeight={420}>
    {YEAR_OPTIONS.map(option => <AnchoredMenuItem key={option} label={String(option)} selected={approxYear === option} onPress={() => {
      if (!viewActive.current) return;
      setApproxYear(option);
      if (option === now.getFullYear() && approxMonth > now.getMonth() + 1) setApproxMonth(now.getMonth() + 1);
      pendingMonthMenu.current = true; setFocusVersion(value => value + 1);
    }} />)}
    <AnchoredMenuItem label="Cancelar" separator={false} />
  </AnchoredMenu>
  <AnchoredMenu visible={monthOpen} anchor={monthAnchor} onClose={() => setMonthOpen(false)} title="Elige el mes" width={240} estimatedHeight={420}>
    {monthOptions.map((option, index) => <AnchoredMenuItem key={option} label={option} selected={approxMonth === index + 1} onPress={() => { if (!viewActive.current) return; setApproxMonth(index + 1); }} />)}
    <AnchoredMenuItem label="Cancelar" separator={false} />
  </AnchoredMenu>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  spinner: { alignSelf: 'stretch', marginBottom: 16, height: 180 },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 8 }, breedChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }, breedChoice: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, minHeight: 44, justifyContent: 'center' },
  screen: { flex: 1 }, content: { padding: 16, paddingBottom: 48 },
  header: { paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  back: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8, minHeight: 44 },
  title: { fontFamily: 'Nunito_700Bold', fontSize: 28, lineHeight: 34, letterSpacing: -0.3 },
  underField: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginTop: 4 },
  fieldError: { flex: 1, fontFamily: 'Nunito_600SemiBold', fontSize: 14, lineHeight: 20, marginTop: 4 },
  counter: { fontFamily: 'Nunito_400Regular', fontSize: 13 }, hint: { fontFamily: 'Nunito_400Regular', fontSize: 13 }, intro: { fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 23, marginTop: 5, marginBottom: 18 },
  field: { marginBottom: 16 }, label: { fontFamily: 'Nunito_700Bold', fontSize: 16, marginBottom: 7 }, input: { borderWidth: 1, borderRadius: 14, minHeight: 50, paddingHorizontal: 14, fontFamily: 'Nunito_400Regular', fontSize: 16 }, multiline: { minHeight: 100, paddingTop: 12 },
  select: { minHeight: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, value: { fontFamily: 'Nunito_600SemiBold', fontSize: 16 },
  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 14 }, mode: { flex: 1, minHeight: 48, borderWidth: 1, paddingHorizontal: 10, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, modeText: { fontFamily: 'Nunito_700Bold', fontSize: 15, textAlign: 'center' },
  dateRow: { flexDirection: 'row', gap: 10 }, dateField: { flex: 1 }, preview: { width: '100%', aspectRatio: 4 / 3, borderRadius: 16 }, photoPlaceholder: { height: 130, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 6 },
  photoActions: { flexDirection: 'row', gap: 10, marginTop: 10, marginBottom: 22 }, photoAction: { minHeight: 46, borderWidth: 1, borderRadius: 14, paddingHorizontal: 15, justifyContent: 'center' }, link: { fontFamily: 'Nunito_700Bold', fontSize: 16 }, error: { fontFamily: 'Nunito_600SemiBold', fontSize: 15, lineHeight: 21, marginBottom: 16 },
  save: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, saveText: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
});
