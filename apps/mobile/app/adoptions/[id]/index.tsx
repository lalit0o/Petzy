import { useCallback, useRef, useState, type ComponentProps } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { AdoptionStatusChip } from '@/components/adoption-card';
import { ChatAvatar } from '@/components/chat-avatar';
import { AdoptionDetailSkeleton } from '@/components/skeleton';
import { useToast } from '@/components/toast';
import { petzyColors, radius, spacing } from '@/constants/petzy-theme';
import { useAuthContext } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { adoptionPhotoSource, AdoptionApiError, contactAdoption, getAdoption, restoreAdoption, setAdoptionStatus, withdrawAdoption, type Adoption } from '@/lib/adoptions-api';
import { formatRelativeTime } from '@/lib/format';
import { goBackOrReplace } from '@/lib/navigation';
import { profilePhotoSource } from '@/lib/profiles-api';

type Action = 'status' | 'withdraw' | 'restore' | 'contact';
const RETRY: Record<Action, string> = { status: 'Reintentar cambio de estado', withdraw: 'Reintentar retiro', restore: 'Reintentar restauración', contact: 'Reintentar contacto' };

const ageText = (age: number, approximate: boolean) => `${approximate ? 'Aprox. ' : ''}${age < 1 ? 'menos de 1 año' : `${age} ${age === 1 ? 'año' : 'años'}`}`;

// Detalle de un anuncio de Adopción (AD-T12, AD-T14, AD-T16). Las acciones que
// se muestran dependen de quién mira, pero el servidor vuelve a comprobarlas.
export default function AdoptionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const adoptionId = Number(id);
  const { token } = useAuthContext(); const router = useRouter(); const toast = useToast();
  const c = petzyColors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const { width } = useWindowDimensions(); const photoWidth = width - spacing.lg * 2;
  const [item, setItem] = useState<Adoption | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [gone, setGone] = useState(false);
  const [page, setPage] = useState(0); const [failedPhotos, setFailedPhotos] = useState<number[]>([]);
  const [acting, setActing] = useState<Action | null>(null); const [actionError, setActionError] = useState<{ action: Action; message: string } | null>(null);
  const requestId = useRef(0); const loadedId = useRef<number | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!token) return; const current = ++requestId.current;
    if (!silent) { setLoading(true); setItem(null); }
    setError('');
    try {
      const found = await getAdoption(token, adoptionId);
      if (current !== requestId.current) return;
      setItem(found); setGone(false); setFailedPhotos([]);
    } catch (cause) {
      if (current !== requestId.current) return;
      if (cause instanceof AdoptionApiError && cause.status === 404) { setItem(null); setGone(true); }
      setError(cause instanceof Error ? cause.message : 'No se pudo abrir el anuncio.');
    } finally { if (current === requestId.current) setLoading(false); }
  }, [token, adoptionId]);

  // Al volver (por ejemplo, de editar o reportar) se refresca sin esqueleto.
  useFocusEffect(useCallback(() => {
    const silent = loadedId.current === adoptionId; loadedId.current = adoptionId;
    queueMicrotask(() => void load(silent));
    return () => { requestId.current++; };
  }, [load, adoptionId]));

  const run = async (action: Action) => {
    if (!token || !item || acting) return;
    setActing(action); setActionError(null);
    try {
      if (action === 'contact') {
        const conversation = await contactAdoption(token, item.id);
        router.push((`/messages/${conversation.id}`) as Href);
      } else if (action === 'status') {
        const next = item.status === 'SEEKING_HOME' ? 'FOUND_HOME' : 'SEEKING_HOME';
        setItem(await setAdoptionStatus(token, item.id, next));
        toast.show(next === 'FOUND_HOME' ? '¡Qué bien! Marcaste que encontró hogar' : 'El anuncio vuelve a buscar hogar');
      } else if (action === 'withdraw') {
        setItem(await withdrawAdoption(token, item.id));
        toast.show('Retiraste el anuncio');
      } else {
        setItem(await restoreAdoption(token, item.id));
        toast.show('El anuncio volvió a publicarse');
      }
    } catch (cause) {
      // Si el anuncio cambió mientras se veía (retirado, ya con hogar), se recarga para mostrar su estado real.
      if (cause instanceof AdoptionApiError && (cause.status === 404 || cause.status === 409)) void load(true);
      setActionError({ action, message: cause instanceof Error ? cause.message : 'No se pudo completar la acción.' });
    } finally { setActing(null); }
  };

  const confirmWithdraw = () => Alert.alert('Retirar anuncio', 'Dejará de verse en Adopción. Lo podrás restaurar desde «Mis anuncios retirados» con el mismo estado.', [
    { text: 'Conservar anuncio', style: 'cancel' },
    { text: 'Retirar anuncio', style: 'destructive', onPress: () => void run('withdraw') },
  ]);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => setPage(Math.round(event.nativeEvent.contentOffset.x / photoWidth));
  const back = () => goBackOrReplace(router, '/adopcion' as Href);
  const errorFor = (action: Action) => actionError?.action === action ? <View accessibilityRole="alert" style={styles.actionError}>
    <Text style={[styles.errorText, { color: c.error }]}>{actionError.message}</Text>
    <Pressable accessibilityRole="button" disabled={acting !== null} onPress={() => void run(action)} style={styles.inlineAction}><Text style={[styles.link, { color: c.accent }]}>{RETRY[action]}</Text></Pressable>
  </View> : null;

  const primary = (label: string, action: Action, icon: ComponentProps<typeof Ionicons>['name'], onPress = () => void run(action)) =>
    <Pressable accessibilityRole="button" accessibilityLabel={acting === action ? 'Guardando' : label} accessibilityState={{ busy: acting === action, disabled: acting !== null }} disabled={acting !== null} onPress={onPress}
      style={({ pressed }) => [styles.primary, { backgroundColor: c.accent, opacity: pressed ? 0.85 : acting !== null && acting !== action ? 0.6 : 1 }]}>
      {acting === action ? <ActivityIndicator color={c.onAccent} /> : <><Ionicons name={icon} size={20} color={c.onAccent} /><Text style={[styles.primaryText, { color: c.onAccent }]}>{label}</Text></>}
    </Pressable>;

  return <SafeAreaView style={[styles.screen, { backgroundColor: c.background }]} edges={['top', 'bottom']}>
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={back} style={styles.back}><Ionicons name="arrow-back" size={24} color={c.accent} /><Text style={[styles.link, { color: c.accent }]}>Volver</Text></Pressable>
      {loading ? <AdoptionDetailSkeleton /> : null}
      {!loading && !item ? <View style={styles.state}>
        <Ionicons name="paw-outline" size={40} color={c.muted} />
        <Text style={[styles.stateText, { color: gone ? c.textPrimary : c.error }]}>{gone ? 'Este anuncio ya no está disponible.' : error}</Text>
        <Pressable accessibilityRole="button" onPress={() => gone ? back() : void load()} style={styles.inlineAction}><Text style={[styles.link, { color: c.accent }]}>{gone ? 'Volver a Adopción' : 'Reintentar'}</Text></Pressable>
      </View> : null}
      {item && token ? <>
        {!item.isActive ? <View style={[styles.banner, { backgroundColor: c.surfaceAlt }]}>
          <Ionicons name="archive-outline" size={20} color={c.textPrimary} />
          <Text style={[styles.bannerText, { color: c.textPrimary }]}>Retiraste este anuncio. Solo tú lo ves hasta que lo restaures.</Text>
        </View> : null}
        <View>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScroll} style={[styles.pager, { width: photoWidth }]} accessibilityLabel={`Fotos del animal, ${item.photos.length}`}>
            {item.photos.map(photo => <View key={photo.id} style={[styles.photo, { width: photoWidth, backgroundColor: c.surfaceAlt }]}>
              {failedPhotos.includes(photo.id) ? <Pressable accessibilityRole="button" onPress={() => setFailedPhotos(old => old.filter(p => p !== photo.id))} style={styles.photoError}>
                <Ionicons name="image-outline" size={32} color={c.muted} /><Text style={[styles.errorText, { color: c.error }]}>No se pudo mostrar la foto. Reintentar.</Text>
              </Pressable> : <Image source={adoptionPhotoSource(photo.url, token)} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory" onError={() => setFailedPhotos(old => [...old, photo.id])} />}
            </View>)}
          </ScrollView>
          {item.photos.length > 1 ? <View style={styles.dots} importantForAccessibility="no-hide-descendants">
            {item.photos.map((photo, index) => <View key={photo.id} style={[styles.dot, { backgroundColor: index === page ? c.accent : c.border }]} />)}
          </View> : null}
        </View>

        <View style={styles.section}>
          <AdoptionStatusChip status={item.status} />
          <Text accessibilityRole="header" style={[styles.title, { color: c.textPrimary }]}>{item.title}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`Ver perfil de ${item.author.username}`} onPress={() => router.push((`/profiles/${item.author.id}`) as Href)} style={styles.author}>
            <ChatAvatar avatarUrl={item.author.avatarUrl} token={token} size={36} />
            <Text style={[styles.authorText, { color: c.textPrimary }]}>{item.mine ? 'Tú' : item.author.username}<Text style={{ color: c.muted, fontFamily: 'Nunito_400Regular' }}> · {formatRelativeTime(item.createdAt)}</Text></Text>
          </Pressable>
          <Text style={[styles.body, { color: c.textPrimary }]}>{item.description}</Text>
        </View>

        {item.pet ? <Pressable accessibilityRole="button" accessibilityLabel={`Ver ficha de ${item.pet.name}`} onPress={() => router.push((`/pets/${item.pet!.id}`) as Href)} style={[styles.petCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={[styles.petPhoto, { backgroundColor: c.surfaceAlt }]}>
            {item.pet.photoUrl ? <Image source={profilePhotoSource(item.pet.photoUrl, token)} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory" /> : <Ionicons name="paw-outline" size={24} color={c.accent} />}
          </View>
          <View style={styles.petText}>
            <Text style={[styles.petLabel, { color: c.muted }]}>Ficha de la mascota</Text>
            <Text style={[styles.petName, { color: c.textPrimary }]}>{item.pet.name}</Text>
            <Text style={[styles.petMeta, { color: c.muted }]}>{item.pet.species} · {ageText(item.pet.age, item.pet.isAgeApproximate)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={c.accent} />
        </Pressable> : null}

        <View style={styles.actions}>
          {item.mine && item.isActive ? <>
            {primary(item.status === 'SEEKING_HOME' ? 'Marcar que encontró hogar' : 'Volver a «Busca hogar»', 'status', item.status === 'SEEKING_HOME' ? 'home-outline' : 'heart-outline')}
            {errorFor('status')}
            <Pressable accessibilityRole="button" disabled={acting !== null} onPress={() => router.push((`/adoptions/${item.id}/edit`) as Href)} style={[styles.secondary, { borderColor: c.border }]}>
              <Ionicons name="create-outline" size={20} color={c.accent} /><Text style={[styles.link, { color: c.accent }]}>Editar anuncio</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={acting === 'withdraw' ? 'Retirando anuncio' : 'Retirar anuncio'} disabled={acting !== null} onPress={confirmWithdraw} style={styles.inlineAction}>
              {acting === 'withdraw' ? <ActivityIndicator color={c.error} /> : <Text style={[styles.link, { color: c.error }]}>Retirar anuncio</Text>}
            </Pressable>
            {errorFor('withdraw')}
          </> : null}
          {item.mine && !item.isActive ? <>{primary('Restaurar anuncio', 'restore', 'refresh-outline')}{errorFor('restore')}</> : null}
          {!item.mine ? <>
            {item.status === 'SEEKING_HOME' ? <>{primary(`Contactar a ${item.author.username}`, 'contact', 'chatbubble-outline')}{errorFor('contact')}</>
              : <Text style={[styles.note, { color: c.muted }]}>Este animal ya encontró hogar, así que no recibe mensajes por este anuncio.</Text>}
            {item.reportedByMe ? <View style={styles.reported}><Ionicons name="flag" size={16} color={c.muted} /><Text style={[styles.note, { color: c.muted }]}>Ya lo reportaste.</Text></View>
              : <Pressable accessibilityRole="button" onPress={() => router.push((`/adoptions/${item.id}/report`) as Href)} style={styles.inlineAction}>
                  <Text style={[styles.link, { color: c.muted }]}>Reportar anuncio</Text>
                </Pressable>}
          </> : null}
        </View>
      </> : null}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { padding: spacing.lg, paddingBottom: 48 },
  back: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm },
  link: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  bannerText: { flex: 1, fontFamily: 'Nunito_600SemiBold', fontSize: 15, lineHeight: 21 },
  pager: { borderRadius: radius.xl, overflow: 'hidden' },
  photo: { height: 300, alignItems: 'center', justifyContent: 'center' },
  photoError: { alignItems: 'center', gap: spacing.xs, padding: spacing.lg },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  section: { marginTop: spacing.lg, alignItems: 'flex-start', gap: spacing.sm },
  title: { fontFamily: 'Nunito_700Bold', fontSize: 26, lineHeight: 32 },
  author: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
  authorText: { fontFamily: 'Nunito_700Bold', fontSize: 15 },
  body: { fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 24, alignSelf: 'stretch' },
  petCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.lg },
  petPhoto: { width: 56, height: 56, borderRadius: 28, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  petText: { flex: 1 },
  petLabel: { fontFamily: 'Nunito_600SemiBold', fontSize: 12 },
  petName: { fontFamily: 'Nunito_700Bold', fontSize: 17 },
  petMeta: { fontFamily: 'Nunito_400Regular', fontSize: 14 },
  actions: { marginTop: spacing.xl, gap: spacing.sm },
  primary: { minHeight: 52, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  primaryText: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
  secondary: { minHeight: 50, borderWidth: 1, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  inlineAction: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  actionError: { gap: 2, alignItems: 'center' },
  errorText: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  note: { fontFamily: 'Nunito_400Regular', fontSize: 15, lineHeight: 21, textAlign: 'center' },
  reported: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44 },
  state: { alignItems: 'center', gap: spacing.sm, marginTop: 70, paddingHorizontal: spacing.xl },
  stateText: { fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 23, textAlign: 'center' },
});
