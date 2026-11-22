import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, Platform, Pressable, StyleSheet, Text, TextInput, View, type TextInputInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import MapView, { Marker, type MapPressEvent } from 'react-native-maps';
import { useFocusEffect, useNavigation, useRouter, type Href } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FormScrollView } from '@/components/form-scroll-view';
import { CommunityButton, CommunityMessage, ui, useCommunityColors } from '@/components/community-ui';
import { useToast } from '@/components/toast';
import { useAuthContext } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createEvent, eventCoverSource, newRequestKey, removeEventCover, updateEvent, uploadEventCover, type CommunityEvent, type EventCover, type EventDraft } from '@/lib/events-api';
import { deviceTimeZone, eventMoment } from '@/lib/event-format';
import { localPhotoSize } from '@/lib/photo-upload';
import { bumpPhotoVersion } from '@/lib/photo-cache';
import { goBackOrReplace } from '@/lib/navigation';

type Point = { latitude: number; longitude: number };
// Vista inicial de México cuando todavía no hay punto elegido.
const MEXICO = { latitude: 23.6345, longitude: -102.5528, latitudeDelta: 18, longitudeDelta: 18 };

function defaultStart() {
  const date = new Date(Date.now() + 24 * 3600_000);
  date.setMinutes(0, 0, 0);
  return date;
}

// iOS muestra fecha y hora juntas; Android abre primero la fecha y luego la hora.
function DateTimeField({ label, value, onChange, minimumDate, disabled }: { label: string; value: Date; onChange: (date: Date) => void; minimumDate?: Date; disabled?: boolean }) {
  const c = useCommunityColors(); const dark = useColorScheme() === 'dark';
  const openAndroid = () => DateTimePickerAndroid.open({
    value, mode: 'date', minimumDate,
    onChange: (event, day) => {
      if (event.type !== 'set' || !day) return;
      DateTimePickerAndroid.open({
        value: day, mode: 'time',
        onChange: (timeEvent, time) => {
          if (timeEvent.type !== 'set' || !time) return;
          const next = new Date(day); next.setHours(time.getHours(), time.getMinutes(), 0, 0); onChange(next);
        },
      });
    },
  });
  return <View style={styles.field}>
    <Text style={[ui.label, { color: c.text }]}>{label}</Text>
    {Platform.OS === 'ios'
      ? <View style={styles.iosPicker}><DateTimePicker value={value} mode="datetime" display="compact" minimumDate={minimumDate} disabled={disabled} locale="es-MX" themeVariant={dark ? 'dark' : 'light'} accessibilityLabel={label} onChange={(_event, date) => { if (date) onChange(date); }} /></View>
      : <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${eventMoment(value.toISOString(), deviceTimeZone())}`} disabled={disabled} onPress={openAndroid} style={[ui.input, styles.dateButton, { borderColor: c.border, backgroundColor: c.card, opacity: disabled ? 0.6 : 1 }]}>
          <Ionicons name="calendar-outline" size={20} color={c.heading} />
          <Text style={[ui.body, { color: c.text }]}>{eventMoment(value.toISOString(), deviceTimeZone())}</Text>
        </Pressable>}
  </View>;
}

// Crear o editar un evento (DI-EV-03): datos, horario, lugar con punto en el
// mapa y portada opcional. La persona nunca escribe coordenadas (D-99).
export function EventForm({ communityId, event }: { communityId: number; event?: CommunityEvent }) {
  const { token } = useAuthContext(); const router = useRouter(); const navigation = useNavigation(); const c = useCommunityColors(); const toast = useToast();
  const [title, setTitle] = useState(event?.title ?? ''); const [description, setDescription] = useState(event?.description ?? ''); const [placeLabel, setPlaceLabel] = useState(event?.placeLabel ?? '');
  const [point, setPoint] = useState<Point | null>(event ? { latitude: event.latitude, longitude: event.longitude } : null);
  const [startsAt, setStartsAt] = useState(() => event ? new Date(event.startsAt) : defaultStart());
  const [endsAt, setEndsAt] = useState(() => event ? new Date(event.endsAt) : new Date(defaultStart().getTime() + 2 * 3600_000));
  const [cover, setCover] = useState<EventCover | null>(null); const [removeCover, setRemoveCover] = useState(false); const [coverFailed, setCoverFailed] = useState(false);
  const [picking, setPicking] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  // Error de validación junto a su campo (mobile-forms, 22-11-2026); `error` queda para el servidor y la portada.
  type EventField = 'title' | 'description' | 'place' | 'point' | 'time';
  const [fieldError, setFieldError] = useState<{ field: EventField; message: string } | null>(null);
  const errorFor = (field: EventField) => fieldError?.field === field ? fieldError.message : '';
  const clearField = (field: EventField) => { if (fieldError?.field === field) setFieldError(null); };
  const sending = useRef(false); const viewActive = useRef(false); const requestKey = useRef<string | null>(null);
  const descriptionRef = useRef<TextInputInstance>(null); const placeRef = useRef<TextInputInstance>(null);
  const startLocked = Boolean(event && !event.canEditStart);
  useFocusEffect(useCallback(() => { viewActive.current = true; return () => { viewActive.current = false; }; }, []));

  // Aviso al salir con cambios sin guardar, como en los demás formularios.
  const snapshot = JSON.stringify({ title, description, placeLabel, point, startsAt: startsAt.getTime(), endsAt: endsAt.getTime(), cover: cover?.uri, removeCover });
  const [initial] = useState(snapshot);
  const [allowLeave, setAllowLeave] = useState(false); const pending = useRef<(() => void) | null>(null);
  usePreventRemove(!allowLeave && (initial !== snapshot || busy), ({ data }) => {
    if (sending.current) return;
    Alert.alert('¿Salir sin guardar?', 'Los cambios de este formulario no se guardarán.', [
      { text: 'Seguir editando', style: 'cancel' },
      { text: 'Salir sin guardar', style: 'destructive', onPress: () => { pending.current = () => navigation.dispatch(data.action); setAllowLeave(true); } },
    ]);
  });
  useEffect(() => { if (!allowLeave) return; const action = pending.current; pending.current = null; action?.(); }, [allowLeave]);

  const changeStart = (date: Date) => {
    setStartsAt(date);
    // Si el fin queda antes del inicio, se mueve dos horas después para no dejarlo inválido.
    if (endsAt <= date) setEndsAt(new Date(date.getTime() + 2 * 3600_000));
  };

  const chooseCover = async () => {
    if (sending.current || picking) return;
    setPicking(true); setError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: false, quality: 1 });
      if (!viewActive.current || result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      let uri = asset.uri; let mimeType = asset.mimeType ?? ''; let name = asset.fileName ?? 'portada.jpg'; let size = asset.fileSize;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
        const image = await ImageManipulator.manipulate(uri).renderAsync();
        const converted = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
        uri = converted.uri; mimeType = 'image/jpeg'; name = 'portada.jpg'; size = undefined;
      }
      size ??= await localPhotoSize(uri);
      if (!viewActive.current) return;
      if (size > 5 * 1024 * 1024) { setError('La portada supera 5 MB. Elige otra imagen.'); return; }
      setCover({ uri, name, mimeType, size }); setRemoveCover(false); setCoverFailed(false);
    } catch { if (viewActive.current) setError('No pudimos preparar la portada. Elige otra imagen.'); }
    finally { if (viewActive.current) setPicking(false); }
  };

  const validate = (): { field: EventField; message: string } | null => {
    if (!title.trim() || title.trim().length > 120) return { field: 'title', message: 'Escribe un título de hasta 120 caracteres.' };
    if (!description.trim() || description.trim().length > 3000) return { field: 'description', message: 'Escribe una descripción de hasta 3 000 caracteres.' };
    const now = new Date();
    if (!startLocked && startsAt <= now) return { field: 'time', message: 'El inicio debe ser una fecha y hora futuras.' };
    if (endsAt <= startsAt) return { field: 'time', message: 'El fin aproximado debe ser posterior al inicio.' };
    if (event && endsAt.getTime() !== new Date(event.endsAt).getTime() && endsAt <= now) return { field: 'time', message: 'El fin aproximado debe ser posterior a este momento.' };
    if (!placeLabel.trim() || placeLabel.trim().length > 200) return { field: 'place', message: 'Escribe el nombre o la dirección del lugar (hasta 200 caracteres).' };
    if (!point) return { field: 'point', message: 'Toca el mapa para marcar el punto de reunión.' };
    return null;
  };

  const save = async () => {
    if (!token || sending.current || picking) return;
    const problem = validate();
    if (problem) { setError(''); setFieldError(problem); return; }
    sending.current = true; setBusy(true); setError(''); setFieldError(null); Keyboard.dismiss();
    const draft: EventDraft = { title: title.trim(), description: description.trim(), placeLabel: placeLabel.trim(), latitude: point!.latitude, longitude: point!.longitude, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), timeZone: event?.timeZone ?? deviceTimeZone() };
    try {
      if (!event) {
        const created = await createEvent(token, communityId, draft, cover);
        setAllowLeave(true); toast.show('Evento creado');
        router.replace((`/events/${created.id}`) as Href);
        return;
      }
      // Se conserva la clave al reintentar para no repetir avisos.
      requestKey.current ??= newRequestKey();
      const changes: Partial<EventDraft> = { title: draft.title, description: draft.description, placeLabel: draft.placeLabel, latitude: draft.latitude, longitude: draft.longitude, endsAt: draft.endsAt };
      if (startsAt.getTime() !== new Date(event.startsAt).getTime()) changes.startsAt = draft.startsAt;
      await updateEvent(token, event.id, changes, requestKey.current);
      requestKey.current = null;
      try {
        if (cover) { await uploadEventCover(token, event.id, cover); bumpPhotoVersion(`/events/${event.id}/cover`); }
        else if (removeCover && event.coverPath) await removeEventCover(token, event.id);
      } catch (cause) {
        setError(`El evento se guardó, pero no se pudo actualizar la portada. ${cause instanceof Error ? cause.message : 'Intenta de nuevo.'}`);
        return;
      }
      setAllowLeave(true); toast.show('Cambios guardados');
      goBackOrReplace(router, (`/events/${event.id}`) as Href);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar el evento.'); }
    finally { sending.current = false; setBusy(false); }
  };

  const disabled = busy || picking;
  const hasCover = Boolean(cover) || Boolean(!removeCover && event?.coverPath);
  const onMapPress = (e: MapPressEvent) => { if (!disabled) { setPoint(e.nativeEvent.coordinate); clearField('point'); } };
  const message = (field: EventField) => errorFor(field) ? <Text accessibilityRole="alert" style={[styles.fieldError, { color: c.error }]}>{errorFor(field)}</Text> : null;
  const bordered = (field: EventField) => [ui.input, { backgroundColor: c.card, borderColor: errorFor(field) ? c.error : c.border, color: c.text }];

  return <SafeAreaView style={[ui.screen, { backgroundColor: c.bg }]} edges={['top', 'bottom']}>
    {/* «Volver» fijo con línea fina, como en los demás formularios (22-11-2026). */}
    <View style={[styles.header, { borderColor: c.border }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Volver" style={styles.back} onPress={() => goBackOrReplace(router, (event ? `/events/${event.id}` : `/communities/${communityId}`) as Href)}><Ionicons name="arrow-back" size={24} color={c.heading} /><Text style={[ui.label, { color: c.heading }]}>Volver</Text></Pressable>
    </View>
    <FormScrollView contentContainerStyle={ui.content}>
      <Text accessibilityRole="header" style={[ui.title, styles.title, { color: c.heading }]}>{event ? 'Editar evento' : 'Crear evento'}</Text>

      <Text style={[ui.heading, { color: c.heading }]}>Datos</Text>
      <Text style={[ui.label, { color: c.text }]}>Título</Text>
      <TextInput accessibilityLabel="Título del evento" editable={!disabled} value={title} onChangeText={text => { setTitle(text); clearField('title'); }} maxLength={121} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => descriptionRef.current?.focus()} placeholder="Por ejemplo, paseo en la playa" placeholderTextColor={c.muted} style={bordered('title')} />
      <View style={styles.underField}>{message('title') ?? <View />}<Text style={[ui.muted, { color: c.muted }]}>{title.length}/120</Text></View>
      <Text style={[ui.label, { color: c.text }]}>Descripción</Text>
      <TextInput ref={descriptionRef} accessibilityLabel="Descripción del evento" editable={!disabled} value={description} onChangeText={text => { setDescription(text); clearField('description'); }} maxLength={3001} multiline textAlignVertical="top" style={[bordered('description'), styles.multiline]} />
      <View style={styles.underField}>{message('description') ?? <View />}<Text style={[ui.muted, { color: c.muted }]}>{description.length}/3 000</Text></View>

      <Text style={[ui.heading, { color: c.heading }]}>Horario</Text>
      {startLocked
        ? <View style={styles.field}><Text style={[ui.label, { color: c.text }]}>Inicio</Text><Text style={[ui.body, { color: c.text }]}>{eventMoment(event!.startsAt, event!.timeZone)}</Text><Text style={[ui.muted, { color: c.muted }]}>El evento ya comenzó: el inicio no se puede cambiar.</Text></View>
        : <DateTimeField label="Inicio" value={startsAt} onChange={date => { changeStart(date); clearField('time'); }} minimumDate={new Date()} disabled={disabled} />}
      <DateTimeField label="Fin aproximado" value={endsAt} onChange={date => { setEndsAt(date); clearField('time'); }} minimumDate={startLocked ? new Date() : startsAt} disabled={disabled} />
      <Text style={[ui.muted, { color: c.muted }]}>La hora de fin es aproximada y puede ser otro día. Horario de {event?.timeZone ?? deviceTimeZone()}.</Text>
      {message('time')}

      <Text style={[ui.heading, { color: c.heading }]}>Lugar</Text>
      <Text style={[ui.label, { color: c.text }]}>Nombre o dirección</Text>
      <TextInput ref={placeRef} accessibilityLabel="Nombre o dirección del lugar" editable={!disabled} value={placeLabel} onChangeText={text => { setPlaceLabel(text); clearField('place'); }} maxLength={201} returnKeyType="done" submitBehavior="blurAndSubmit" placeholder="Por ejemplo, Parque Morelos, entrada principal" placeholderTextColor={c.muted} style={bordered('place')} />
      {message('place')}
      <Text accessibilityRole={errorFor('point') ? 'alert' : undefined} style={[ui.body, { color: errorFor('point') ? c.error : c.text }]}>{point ? 'Punto elegido. Toca otro lugar del mapa o arrastra el marcador para ajustarlo.' : 'Toca el mapa para marcar el punto de reunión.'}</Text>
      <View style={[styles.map, { borderColor: errorFor('point') ? c.error : point ? c.heading : c.border }]}>
        <MapView style={StyleSheet.absoluteFill} initialRegion={point ? { ...point, latitudeDelta: 0.01, longitudeDelta: 0.01 } : MEXICO} onPress={onMapPress} accessibilityLabel="Mapa para elegir el punto de reunión">
          {point ? <Marker coordinate={point} draggable onDragEnd={e => { setPoint(e.nativeEvent.coordinate); clearField('point'); }} /> : null}
        </MapView>
      </View>

      <Text style={[ui.heading, { color: c.heading }]}>Portada (opcional)</Text>
      {hasCover && !coverFailed
        ? (cover ? <Image source={{ uri: cover.uri }} style={styles.preview} contentFit="cover" onError={() => setCoverFailed(true)} /> : event?.coverPath && token ? <Image source={eventCoverSource(event.coverPath, token)} style={styles.preview} contentFit="cover" cachePolicy="memory" onError={() => setCoverFailed(true)} /> : null)
        : !hasCover
          ? <Pressable accessibilityRole="button" accessibilityLabel="Agregar portada del evento" disabled={disabled} onPress={() => void chooseCover()} style={[styles.placeholder, { backgroundColor: c.card, borderColor: c.border }]}>
              <Ionicons name="camera-outline" size={34} color={c.heading} /><Text style={[ui.label, { color: c.heading }]}>Agregar portada</Text>
              <Text style={[ui.muted, { color: c.muted }]}>JPEG, PNG o WebP de hasta 5 MB</Text>
            </Pressable>
          : <View style={[styles.placeholder, { backgroundColor: c.card, borderColor: c.border }]}><Ionicons name="image-outline" size={34} color={c.error} /></View>}
      {coverFailed ? <CommunityMessage text="No se pudo mostrar la portada. Puedes elegir otra." error /> : null}
      {hasCover ? <View style={ui.row}>
        <Pressable accessibilityRole="button" disabled={disabled} onPress={() => void chooseCover()} style={[styles.photoAction, { borderColor: c.border }]}><Text style={[ui.label, { color: c.heading }]}>Cambiar portada</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={disabled} onPress={() => { setCover(null); setRemoveCover(true); setCoverFailed(false); }} style={[styles.photoAction, { borderColor: c.border }]}><Text style={[ui.label, { color: c.error }]}>Quitar portada</Text></Pressable>
      </View> : null}
      {picking ? <View style={ui.row}><ActivityIndicator color={c.heading} /><Text style={[ui.body, { color: c.text }]}>Preparando portada…</Text></View> : null}

      {event ? <Text style={[ui.muted, { color: c.muted }]}>Si cambias el horario o el lugar, avisaremos a quienes confirmaron «Iré».</Text> : null}
      <CommunityMessage text={error} error />
      <CommunityButton label={event ? 'Guardar cambios' : 'Crear evento'} busy={busy} disabled={picking} onPress={() => void save()} />
    </FormScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  iosPicker: { alignItems: 'flex-start' },
  dateButton: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  multiline: { minHeight: 140, paddingTop: 12 },
  header: { paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  back: { minHeight: 44, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8 },
  title: { letterSpacing: -0.3 },
  underField: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginTop: -6 },
  fieldError: { flex: 1, fontFamily: 'Nunito_600SemiBold', fontSize: 14, lineHeight: 20 },
  map: { height: 260, borderRadius: 18, overflow: 'hidden', borderWidth: 1 },
  preview: { width: '100%', height: 200, borderRadius: 16 },
  placeholder: { height: 130, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 6 },
  photoAction: { minHeight: 46, borderWidth: 1, borderRadius: 14, paddingHorizontal: 15, justifyContent: 'center' },
});
