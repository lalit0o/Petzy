import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, Pressable, StyleSheet, Text, TextInput, View, type TextInputInstance } from 'react-native';
import { FormScrollView } from '@/components/form-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useFocusEffect, useRouter, type Href } from 'expo-router';

import { useAuthContext } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getOwnProfile, ProfileApiError, profilePhotoSource, removeProfilePhoto, updateOwnProfile, uploadProfilePhoto } from '@/lib/profiles-api';
import { type MexicoState } from '@/types/mexicoState';
import type { User } from '@/types/apiResponse';
import { NAV_HEIGHT } from '@/components/nav';
import { ProfileSkeleton } from '@/components/skeleton';
import { StatePickerModal } from '@/components/state-picker-modal';
import { ModerationNoticesRow } from '@/components/moderation-notices-row';
import { localPhotoSize } from '@/lib/photo-upload';
import { petzyColors } from '@/constants/petzy-theme';

function stateLabel(state: MexicoState) {
  return state.toLowerCase().split('_').map(part => part[0].toUpperCase() + part.slice(1)).join(' ');
}

export default function ProfileScreen() {
  const { token, user, updateLocalProfile, logOut, deactivateAccount } = useAuthContext();
  const router = useRouter();
  const palette = petzyColors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const colors = { background: palette.background, card: palette.surface, text: palette.textPrimary, heading: palette.accent, border: palette.border, muted: palette.muted, error: palette.error, actionText: palette.onAccent, avatar: palette.surfaceAlt };
  const bioRef = useRef<TextInputInstance>(null);
  const submitting = useRef(false);
  const tokenRef = useRef(token);
  const requestId = useRef(0);
  const viewActive = useRef(false);
  const loadedOnce = useRef(false);
  const editingRef = useRef(false);
  const ownerId = user?.id;
  useEffect(() => { tokenRef.current = token; }, [token]);
  const [editing, setEditingState] = useState(false);
  const setEditing = useCallback((next: boolean) => { editingRef.current = next; setEditingState(next); }, []);
  const [profile, setProfile] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [locatedAt, setLocatedAt] = useState<MexicoState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [photoPreviewError, setPhotoPreviewError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [statePickerOpen, setStatePickerOpen] = useState(false);
  const [photoVersion, setPhotoVersion] = useState(0);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivationError, setDeactivationError] = useState('');
  const [blockedCommunities, setBlockedCommunities] = useState<{ id: number; name: string }[]>([]);

  const applyProfile = useCallback((next: User, options?: { resetDraft?: boolean; bumpPhotoVersion?: boolean }) => {
    const { resetDraft = false, bumpPhotoVersion = false } = options ?? {};
    setProfile(next);
    updateLocalProfile(next);
    setPhotoPreviewError(false);
    // Solo se cambia la versión (y por lo tanto la URL con caché) cuando la
    // foto sí cambió: subir o quitarla. Hacerlo en cada carga normal
    // invalidaría la caché en memoria de la foto sin motivo.
    if (bumpPhotoVersion) setPhotoVersion(Date.now());
    if (resetDraft) {
      setUsername(next.username);
      setBio(next.bio ?? '');
      setLocatedAt(next.locatedAt);
    }
  }, [updateLocalProfile]);

  // `silent` evita el parpadeo del esqueleto completo al volver a esta
  // pestaña; si la persona está editando, no se pisa su borrador sin
  // guardar ni se cierra el modo edición por una actualización de fondo.
  const load = useCallback(async (silent = false) => {
    const access = tokenRef.current;
    if (!access || !ownerId) return;
    const current = ++requestId.current;
    if (!silent) setLoading(true);
    setLoadError('');
    try {
      const next = await getOwnProfile(access);
      if (!viewActive.current || current !== requestId.current || next.id !== ownerId) return;
      const resetDraft = !editingRef.current;
      applyProfile(next, { resetDraft });
      if (resetDraft) { setEditing(false); setStatePickerOpen(false); setFormError(''); setPhotoError(''); setSavedMessage(''); }
    } catch (error) {
      if (viewActive.current && current === requestId.current) setLoadError(error instanceof Error ? error.message : 'No se pudo cargar tu perfil.');
    } finally { if (viewActive.current && current === requestId.current) setLoading(false); }
  }, [ownerId, applyProfile, setEditing]);

  useFocusEffect(useCallback(() => {
    let active = true; viewActive.current = true;
    const silent = loadedOnce.current; loadedOnce.current = true;
    queueMicrotask(() => { if (active) void load(silent); });
    return () => { active = false; viewActive.current = false; requestId.current++; };
  }, [load]));

  const save = async () => {
    if (!token || !editing || submitting.current) return;
    const cleanName = username.trim();
    if (cleanName.length < 3 || cleanName.length > 30) { setFormError('El nombre debe tener de 3 a 30 caracteres.'); return; }
    if (bio.length > 300) { setFormError('La biografía admite hasta 300 caracteres.'); return; }
    if (!locatedAt) { setFormError('Elige tu estado de México.'); return; }
    submitting.current = true; setSaving(true); setFormError(''); setSavedMessage(''); Keyboard.dismiss();
    const current = requestId.current;
    try {
      const next = await updateOwnProfile(token, { username: cleanName, bio: bio.trim() || null, locatedAt });
      if (!viewActive.current || current !== requestId.current) return;
      applyProfile(next, { resetDraft: true });
      setEditing(false); setStatePickerOpen(false);
      Alert.alert('Perfil actualizado', 'Tus cambios se guardaron correctamente');
    } catch (error) {
      if (viewActive.current && current === requestId.current) setFormError(error instanceof Error ? error.message : 'No se pudieron guardar los cambios.');
    } finally { submitting.current = false; setSaving(false); }
  };

  const choosePhoto = async () => {
    if (!token || !editing || submitting.current) return;
    submitting.current = true; setPhotoBusy(true);
    const current = requestId.current;
    setPhotoError(''); setSavedMessage('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: false, quality: 1 });
      if (!viewActive.current || current !== requestId.current) return;
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      let uri = asset.uri;
      let mimeType = asset.mimeType ?? '';
      let name = asset.fileName ?? 'perfil.jpg';
      let size = asset.fileSize;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
        const image = await ImageManipulator.manipulate(uri).renderAsync();
        const converted = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
        uri = converted.uri; mimeType = 'image/jpeg'; name = 'perfil.jpg'; size = undefined;
      }
      size ??= await localPhotoSize(uri);
      if (!viewActive.current || current !== requestId.current) return;
      if (size > 5 * 1024 * 1024) { setPhotoError('La foto supera 5 MB. Elige otra imagen.'); return; }
      setPhotoBusy(true);
      const next = await uploadProfilePhoto(token, { uri, mimeType, name });
      if (!viewActive.current || current !== requestId.current) return;
      applyProfile(next, { bumpPhotoVersion: true });
      setSavedMessage('Foto actualizada.');
    } catch (error) {
      if (viewActive.current && current === requestId.current) setPhotoError(error instanceof Error ? error.message : 'No pudimos guardar la foto. Inténtalo de nuevo.');
    } finally { submitting.current = false; setPhotoBusy(false); }
  };

  const removePhoto = async () => {
    if (!token || !editing || submitting.current) return;
    submitting.current = true;
    const current = requestId.current;
    setPhotoBusy(true); setPhotoError(''); setSavedMessage('');
    try {
      const next = await removeProfilePhoto(token);
      if (!viewActive.current || current !== requestId.current) return;
      applyProfile(next, { bumpPhotoVersion: true });
      setSavedMessage('Foto quitada.');
    } catch (error) {
      if (viewActive.current && current === requestId.current) setPhotoError(error instanceof Error ? error.message : 'No se pudo quitar la foto.');
    } finally { submitting.current = false; setPhotoBusy(false); }
  };

  const deactivate = async () => {
    if (submitting.current) return;
    submitting.current = true; setDeactivating(true); setDeactivationError(''); setBlockedCommunities([]);
    try { await deactivateAccount(); }
    catch (cause) {
      if (!viewActive.current) return;
      setDeactivationError(cause instanceof Error ? cause.message : 'No se pudo desactivar tu cuenta. Intenta de nuevo.');
      if (cause instanceof ProfileApiError && cause.code === 'LAST_ACTIVE_COMMUNITY_ADMIN') setBlockedCommunities(cause.communities);
    } finally { submitting.current = false; setDeactivating(false); }
  };

  const avatarUrl = profile?.avatarUrl && photoVersion ? `${profile.avatarUrl}?v=${photoVersion}` : profile?.avatarUrl;
  const busy = saving || photoBusy || deactivating;
  const cancelEdit = () => {
    if (!profile || submitting.current) return;
    Keyboard.dismiss();
    setUsername(profile.username); setBio(profile.bio ?? ''); setLocatedAt(profile.locatedAt);
    setFormError(''); setPhotoError(''); setStatePickerOpen(false); setEditing(false);
  };
  return <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
    <FormScrollView contentContainerStyle={styles.content}>
      <View pointerEvents="none" style={[styles.decoration, { backgroundColor: colors.avatar }]} />
      <Text style={[styles.heading, { color: colors.heading }]}>Mi perfil</Text>
      <Text style={[styles.subtitle, { color: colors.muted }]}>Estos datos ayudan a que otras personas te conozcan en Petzy.</Text>

      {loading ? <ProfileSkeleton /> : null}
      {loadError ? <View style={styles.feedback}><Text style={[styles.error, { color: colors.error }]}>{loadError}</Text><Pressable accessibilityRole="button" onPress={() => void load()}><Text style={[styles.link, { color: colors.heading }]}>Reintentar</Text></Pressable></View> : null}

      {!loading && profile ? <>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.identity}>
            <View style={[styles.avatar, { backgroundColor: colors.avatar }]}>
              {avatarUrl && token && !photoPreviewError ? <Image source={profilePhotoSource(avatarUrl, token)} style={styles.avatarImage} contentFit="cover" cachePolicy="memory" onError={() => setPhotoPreviewError(true)} /> : <Ionicons name="person-outline" size={38} color={colors.heading} />}
            </View>
            <View style={styles.identityText}><Text style={[styles.name, { color: colors.text }]}>{profile.username}</Text><Text style={[styles.email, { color: colors.muted }]}>{profile.email}</Text></View>
          </View>
          {photoBusy ? <View style={styles.inline}><ActivityIndicator color={colors.heading} /><Text style={[styles.feedbackText, { color: colors.text }]}>Actualizando foto…</Text></View> : null}
          {photoPreviewError ? <Pressable accessibilityRole="button" onPress={() => setPhotoPreviewError(false)}><Text style={[styles.error, { color: colors.error }]}>No se pudo mostrar la foto. Reintentar.</Text></Pressable> : null}
          {photoError ? <Text style={[styles.error, { color: colors.error }]}>{photoError}</Text> : null}
          {editing ? <Text style={[styles.hint, { color: colors.muted }]}>Los cambios de foto se guardan al momento. Cancelar solo descarta los cambios de nombre, biografía y estado.</Text> : null}
          {editing ? <View style={styles.photoActions}>
            <Pressable accessibilityRole="button" disabled={photoBusy || saving || deactivating} onPress={() => void choosePhoto()} style={[styles.outlineButton, { borderColor: colors.border }]}><Text style={[styles.link, { color: colors.heading }]}>{profile.avatarUrl ? 'Cambiar foto' : 'Agregar foto'}</Text></Pressable>
            {profile.avatarUrl ? <Pressable accessibilityRole="button" disabled={photoBusy || saving || deactivating} onPress={() => void removePhoto()} style={[styles.outlineButton, { borderColor: colors.border }]}><Text style={[styles.link, { color: colors.heading }]}>Quitar foto</Text></Pressable> : null}
          </View> : null}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.heading }]}>Tu información</Text>
          {editing ? <>
          <Text style={[styles.label, { color: colors.text }]}>Nombre de usuario</Text>
          <TextInput accessibilityLabel="Nombre de usuario" editable={!saving && !deactivating} value={username} onChangeText={setUsername} maxLength={31} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => bioRef.current?.focus()} autoCapitalize="none" style={[styles.input, { color: colors.text, borderColor: colors.border }]} />
          <Text style={[styles.counter, { color: colors.muted }]}>{username.length}/30</Text>
          <Text style={[styles.label, { color: colors.text }]}>Biografía (opcional)</Text>
          <TextInput ref={bioRef} accessibilityLabel="Biografía" editable={!saving && !deactivating} value={bio} onChangeText={setBio} maxLength={301} multiline textAlignVertical="top" placeholder="Cuéntanos sobre ti y tus mascotas" placeholderTextColor={colors.muted} style={[styles.input, styles.bio, { color: colors.text, borderColor: colors.border }]} />
          <Text style={[styles.counter, { color: colors.muted }]}>{bio.length}/300</Text>
          <Text style={[styles.label, { color: colors.text }]}>Estado de México</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Elegir estado de México" disabled={busy} accessibilityState={{ expanded: statePickerOpen }} onPress={() => { Keyboard.dismiss(); setStatePickerOpen(true); }} style={[styles.selector, { borderColor: colors.border }]}><Text style={[styles.inputText, { color: colors.text }]}>{locatedAt ? stateLabel(locatedAt) : 'Elige tu estado'}</Text><Ionicons name="chevron-down" size={20} color={colors.heading} /></Pressable>
          <Text style={[styles.hint, { color: colors.muted }]}>El correo se muestra solo aquí y no puede cambiarse por ahora.</Text>
          {formError ? <Text style={[styles.error, { color: colors.error }]}>{formError}</Text> : null}
          <Pressable accessibilityRole="button" disabled={saving || photoBusy || deactivating} onPress={() => void save()} style={[styles.save, { backgroundColor: saving || photoBusy || deactivating ? colors.border : colors.heading }]}>{saving ? <View style={styles.inline}><ActivityIndicator color={colors.actionText} /><Text style={[styles.saveText, { color: colors.actionText }]}>Guardando…</Text></View> : <Text style={[styles.saveText, { color: colors.actionText }]}>Guardar cambios</Text>}</Pressable>
          <Pressable accessibilityRole="button" disabled={busy} onPress={cancelEdit} style={styles.logout}><Text style={[styles.link, { color: colors.heading }]}>Cancelar</Text></Pressable>
          </> : <>
            <Text style={[styles.label, { color: colors.text }]}>Nombre de usuario</Text>
            <Text style={[styles.readValue, { color: colors.text }]}>{profile.username}</Text>
            <Text style={[styles.label, { color: colors.text }]}>Biografía</Text>
            <Text style={[styles.readValue, { color: profile.bio ? colors.text : colors.muted }]}>{profile.bio || 'Aún no has agregado una biografía.'}</Text>
            <Text style={[styles.label, { color: colors.text }]}>Estado de México</Text>
            <Text style={[styles.readValue, { color: colors.text }]}>{stateLabel(profile.locatedAt)}</Text>
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setUsername(profile.username); setBio(profile.bio ?? ''); setLocatedAt(profile.locatedAt); setSavedMessage(''); setEditing(true); }} style={[styles.save, { backgroundColor: colors.heading }]}><Text style={[styles.saveText, { color: colors.actionText }]}>Modificar perfil</Text></Pressable>
          </>}
        </View>

        {savedMessage ? <Text accessibilityLiveRegion="polite" style={[styles.success, { color: colors.heading }]}>{savedMessage}</Text> : null}
        <Pressable accessibilityRole="button" onPress={() => router.push('/mascotas')} style={[styles.outlineButton, styles.searchLink, { borderColor: colors.border }]}><Ionicons name="paw-outline" size={20} color={colors.heading} /><Text style={[styles.link, { color: colors.heading }]}>Mis mascotas</Text></Pressable>
        <ModerationNoticesRow disabled={saving || photoBusy || deactivating} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.heading }]}>Tu cuenta</Text>
          <Text style={[styles.hint, { color: colors.text }]}>Al desactivarla, tu perfil y contenido dejarán de mostrarse. Puedes reactivar tu cuenta. Las comunidades donde seas el único integrante y administrador se eliminarán definitivamente junto con sus publicaciones, comentarios y fotos.</Text>
          {deactivationError ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>{deactivationError}</Text> : null}
          {blockedCommunities.map(community => <Pressable key={community.id} accessibilityRole="button" style={styles.logout} onPress={() => router.push((`/communities/${community.id}`) as Href)}><Text style={[styles.link, { color: colors.heading }]}>Administrar {community.name}</Text></Pressable>)}
          <Pressable accessibilityRole="button" accessibilityState={{ busy: deactivating, disabled: saving || photoBusy || deactivating }} disabled={saving || photoBusy || deactivating} style={[styles.outlineButton, { borderColor: colors.error, marginTop: 16 }]} onPress={() => Alert.alert('Desactivar cuenta', 'Tu perfil, mascotas, publicaciones y comentarios dejarán de mostrarse. Las comunidades donde seas el único integrante y administrador, junto con sus publicaciones, comentarios y fotos, se eliminarán definitivamente y no se recuperarán al reactivar la cuenta. Las cuentas desactivadas también cuentan como integrantes. El resto de tus datos se conserva.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Desactivar cuenta', style: 'destructive', onPress: () => void deactivate() }])}>
            {deactivating ? <View style={styles.inline}><ActivityIndicator color={colors.error} /><Text style={[styles.link, { color: colors.error }]}>Desactivando…</Text></View> : <Text style={[styles.link, { color: colors.error }]}>Desactivar cuenta</Text>}
          </Pressable>
        </View>
        <Pressable accessibilityRole="button" disabled={saving || photoBusy || deactivating} onPress={() => void logOut()} style={styles.logout}><Text style={[styles.link, { color: colors.heading }]}>Cerrar sesión</Text></Pressable>
      </> : null}
      {!loading && !profile && !loadError && user ? <Text style={[styles.feedbackText, { color: colors.text }]}>No pudimos mostrar tu perfil.</Text> : null}
    </FormScrollView>

    <StatePickerModal visible={editing && statePickerOpen} value={locatedAt} colors={colors} onClose={() => setStatePickerOpen(false)} onSelect={item => { if (submitting.current) return; setLocatedAt(item); setStatePickerOpen(false); setFormError(''); }} />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  readValue: { fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 23 },
  screen: { flex: 1 }, content: { padding: 16, paddingBottom: NAV_HEIGHT + 28 }, decoration: { position: 'absolute', top: -80, right: -90, width: 245, height: 245, borderRadius: 125, opacity: 0.26 },
  heading: { fontFamily: 'Nunito_700Bold', fontSize: 30, marginTop: 12 }, subtitle: { fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 22, marginTop: 4, marginBottom: 18, maxWidth: 310 },
  card: { borderWidth: 1, borderRadius: 22, padding: 16, marginBottom: 14 }, identity: { flexDirection: 'row', alignItems: 'center', gap: 14 }, identityText: { flex: 1 },
  avatar: { width: 84, height: 84, borderRadius: 42, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }, avatarImage: { width: 84, height: 84 },
  name: { fontFamily: 'Nunito_700Bold', fontSize: 22 }, email: { fontFamily: 'Nunito_400Regular', fontSize: 15, marginTop: 2 }, photoActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 16 },
  outlineButton: { borderWidth: 1, borderRadius: 14, minHeight: 46, paddingHorizontal: 15, justifyContent: 'center' }, sectionTitle: { fontFamily: 'Nunito_700Bold', fontSize: 21, marginBottom: 6 },
  label: { fontFamily: 'Nunito_700Bold', fontSize: 16, marginTop: 15, marginBottom: 7 }, input: { borderWidth: 1, borderRadius: 14, minHeight: 52, paddingHorizontal: 14, fontFamily: 'Nunito_400Regular', fontSize: 16 }, bio: { minHeight: 112, paddingTop: 12 },
  counter: { fontFamily: 'Nunito_400Regular', fontSize: 13, textAlign: 'right', marginTop: 4 }, selector: { borderWidth: 1, borderRadius: 14, minHeight: 52, paddingHorizontal: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, inputText: { fontFamily: 'Nunito_600SemiBold', fontSize: 16 },
  hint: { fontFamily: 'Nunito_400Regular', fontSize: 14, lineHeight: 19, marginTop: 13 }, save: { borderRadius: 16, minHeight: 52, justifyContent: 'center', alignItems: 'center', marginTop: 20 }, saveText: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }, feedback: { alignItems: 'center', padding: 24, gap: 12 }, feedbackText: { fontFamily: 'Nunito_400Regular', fontSize: 16 }, error: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, marginTop: 12 }, link: { fontFamily: 'Nunito_700Bold', fontSize: 15 }, success: { fontFamily: 'Nunito_700Bold', fontSize: 15, textAlign: 'center', marginTop: 4 }, logout: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  searchLink: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
});
