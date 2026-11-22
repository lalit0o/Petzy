import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { cardShadow, petzyColors, radius, spacing } from '@/constants/petzy-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type BlockProps = { width?: DimensionValue; height: number; radius?: number; style?: StyleProp<ViewStyle> };

// Placeholder de carga (ui-ux-pro-max: progressive-loading — skeleton en vez
// de un spinner bloqueante en cargas de lista/detalle). Con movimiento
// reducido, el pulso es más lento y suave en vez de desactivarse, para
// seguir dando una señal de espera sin resultar vestibular.
export function SkeletonBlock({ width = '100%', height, radius: cornerRadius = radius.sm, style }: BlockProps) {
  const dark = useColorScheme() === 'dark';
  const colors = petzyColors[dark ? 'dark' : 'light'];
  const reducedMotion = useReducedMotion();
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.set(withRepeat(withTiming(reducedMotion ? 0.75 : 0.5, { duration: reducedMotion ? 1400 : 900, easing: Easing.inOut(Easing.ease) }), -1, true));
    return () => cancelAnimation(pulse);
  }, [reducedMotion, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: pulse.get() }));
  return <Animated.View style={[{ width, height, borderRadius: cornerRadius, backgroundColor: colors.surfaceAlt }, animatedStyle, style]} />;
}

function PetCardSkeleton() {
  const dark = useColorScheme() === 'dark';
  const colors = petzyColors[dark ? 'dark' : 'light'];
  return <View style={[styles.card, cardShadow(dark), { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <SkeletonBlock width={96} height={96} radius={radius.lg} />
    <View style={styles.info}>
      <SkeletonBlock width="60%" height={20} />
      <SkeletonBlock width="80%" height={15} style={styles.line} />
      <SkeletonBlock width="45%" height={15} style={styles.line} />
    </View>
  </View>;
}

// Lista de mascotas cargando: anuncia una sola vez "Cargando mascotas" y
// oculta los bloques decorativos del lector de pantalla.
export function PetListSkeleton({ count = 3 }: { count?: number }) {
  return <View accessible accessibilityLabel="Cargando mascotas" accessibilityLiveRegion="polite">
    <View importantForAccessibility="no-hide-descendants">
      {Array.from({ length: count }, (_, index) => <PetCardSkeleton key={index} />)}
    </View>
  </View>;
}

// Ficha de mascota cargando: reproduce la forma de la tarjeta de detalle.
export function PetDetailSkeleton() {
  const dark = useColorScheme() === 'dark';
  const colors = petzyColors[dark ? 'dark' : 'light'];
  return <View accessible accessibilityLabel="Cargando ficha" accessibilityLiveRegion="polite">
    <View importantForAccessibility="no-hide-descendants" style={[styles.detailCard, cardShadow(dark), { backgroundColor: colors.surface }]}>
      <SkeletonBlock width="100%" height={250} radius={radius.lg} />
      <SkeletonBlock width="55%" height={29} style={styles.detailLine} />
      <SkeletonBlock width="40%" height={16} style={styles.line} />
      <SkeletonBlock width="50%" height={16} style={styles.line} />
      <SkeletonBlock width="70%" height={16} style={styles.line} />
    </View>
  </View>;
}

// Perfil (propio o público) cargando: avatar circular + nombre, y una
// tarjeta de información con líneas de distinto ancho para no verse repetitivas.
export function ProfileSkeleton() {
  const dark = useColorScheme() === 'dark';
  const colors = petzyColors[dark ? 'dark' : 'light'];
  return <View accessible accessibilityLabel="Cargando perfil" accessibilityLiveRegion="polite">
    <View importantForAccessibility="no-hide-descendants">
      <View style={[styles.profileCard, cardShadow(dark), { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.profileIdentity}>
          <SkeletonBlock width={84} height={84} radius={42} />
          <View style={styles.info}>
            <SkeletonBlock width="70%" height={22} />
            <SkeletonBlock width="50%" height={15} style={styles.line} />
          </View>
        </View>
      </View>
      <View style={[styles.profileCard, cardShadow(dark), { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <SkeletonBlock width="40%" height={21} />
        <SkeletonBlock width="30%" height={16} style={styles.detailLine} />
        <SkeletonBlock width="85%" height={16} style={styles.line} />
        <SkeletonBlock width="35%" height={16} style={[styles.detailLine, styles.line]} />
        <SkeletonBlock width="60%" height={16} style={styles.line} />
      </View>
    </View>
  </View>;
}

// Perfil público cargando: avatar centrado + nombre, como lo presenta
// app/profiles/[id].tsx (distinto del layout en fila de "Mi perfil").
export function PublicProfileSkeleton() {
  const dark = useColorScheme() === 'dark';
  const colors = petzyColors[dark ? 'dark' : 'light'];
  return <View accessible accessibilityLabel="Cargando perfil" accessibilityLiveRegion="polite">
    <View importantForAccessibility="no-hide-descendants" style={[styles.publicCard, cardShadow(dark), { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <SkeletonBlock width={112} height={112} radius={56} />
      <SkeletonBlock width={150} height={27} style={styles.detailLine} />
      <SkeletonBlock width={110} height={16} style={styles.line} />
    </View>
  </View>;
}

// Misma forma que PostCard (12-11-2026): autor, foto 4:3 a todo el ancho y
// texto debajo, para que no haya salto al terminar de cargar.
function PostCardSkeleton() {
  const dark = useColorScheme() === 'dark';
  const colors = petzyColors[dark ? 'dark' : 'light'];
  // Foto 4:3 del ancho de la tarjeta (la lista deja 16 px a cada lado).
  const photoHeight = Math.round((useWindowDimensions().width - spacing.lg * 2) * 3 / 4);
  return <View style={[styles.postCard, cardShadow(dark), { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <View style={styles.postAuthorRow}>
      <SkeletonBlock width={40} height={40} radius={20} />
      <View style={styles.info}>
        <SkeletonBlock width="45%" height={14} />
        <SkeletonBlock width="25%" height={12} style={styles.line} />
      </View>
      <SkeletonBlock width={68} height={24} radius={radius.pill} />
    </View>
    <SkeletonBlock width="100%" height={photoHeight} radius={0} />
    <View style={styles.postBody}>
      <SkeletonBlock width="70%" height={19} />
      <SkeletonBlock width="100%" height={15} style={styles.line} />
      <SkeletonBlock width="85%" height={15} style={styles.line} />
      <SkeletonBlock width={44} height={16} style={styles.detailLine} />
    </View>
  </View>;
}

function ConversationRowSkeleton() {
  const dark = useColorScheme() === 'dark';
  const colors = petzyColors[dark ? 'dark' : 'light'];
  return <View style={[styles.conversationRow, { borderBottomColor: colors.border }]}>
    <SkeletonBlock width={52} height={52} radius={26} />
    <View style={styles.info}>
      <SkeletonBlock width="45%" height={17} />
      <SkeletonBlock width="75%" height={14} style={styles.line} />
    </View>
  </View>;
}

// Bandeja de Chat cargando (app/messages/index.tsx): foto, nombre y vista previa.
export function ConversationListSkeleton({ count = 5 }: { count?: number }) {
  return <View accessible accessibilityLabel="Cargando conversaciones" accessibilityLiveRegion="polite">
    <View importantForAccessibility="no-hide-descendants">
      {Array.from({ length: count }, (_, index) => <ConversationRowSkeleton key={index} />)}
    </View>
  </View>;
}

// Conversación cargando (app/messages/[id].tsx): burbujas alternadas a cada lado,
// con anchos distintos para que se lean como mensajes y no como una lista.
export function ChatThreadSkeleton() {
  const bubbles: { mine: boolean; width: `${number}%`; height: number }[] = [
    { mine: false, width: '62%', height: 40 }, { mine: true, width: '48%', height: 40 },
    { mine: false, width: '70%', height: 58 }, { mine: true, width: '56%', height: 40 },
    { mine: false, width: '40%', height: 40 }, { mine: true, width: '66%', height: 58 },
  ];
  return <View accessible accessibilityLabel="Cargando mensajes" accessibilityLiveRegion="polite" style={styles.thread}>
    <View importantForAccessibility="no-hide-descendants" style={styles.thread}>
      {bubbles.map((bubble, index) => <SkeletonBlock key={index} width={bubble.width} height={bubble.height} radius={18} style={{ alignSelf: bubble.mine ? 'flex-end' : 'flex-start' }} />)}
    </View>
  </View>;
}

function PersonRowSkeleton() {
  const dark = useColorScheme() === 'dark';
  const colors = petzyColors[dark ? 'dark' : 'light'];
  return <View style={[styles.personRow, cardShadow(dark), { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <SkeletonBlock width={48} height={48} radius={24} />
    <View style={styles.info}>
      <SkeletonBlock width="55%" height={17} />
      <SkeletonBlock width="35%" height={14} style={styles.line} />
    </View>
  </View>;
}

// Resultados de búsqueda de perfiles cargando.
export function PersonListSkeleton({ count = 3 }: { count?: number }) {
  return <View accessible accessibilityLabel="Buscando perfiles" accessibilityLiveRegion="polite">
    <View importantForAccessibility="no-hide-descendants">
      {Array.from({ length: count }, (_, index) => <PersonRowSkeleton key={index} />)}
    </View>
  </View>;
}

// Feed de publicaciones cargando.
export function PostListSkeleton({ count = 3 }: { count?: number }) {
  return <View accessible accessibilityLabel="Cargando publicaciones" accessibilityLiveRegion="polite">
    <View importantForAccessibility="no-hide-descendants">
      {Array.from({ length: count }, (_, index) => <PostCardSkeleton key={index} />)}
    </View>
  </View>;
}

// Detalle de una publicación cargando (app/posts/[id]/index.tsx): incluye
// la fila de avatar + nombre + fecha relativa del autor, igual que el
// contenido real, para que no haya un salto de forma al terminar de cargar.
export function PostDetailSkeleton() {
  const dark = useColorScheme() === 'dark';
  const colors = petzyColors[dark ? 'dark' : 'light'];
  return <View accessible accessibilityLabel="Cargando publicación" accessibilityLiveRegion="polite">
    <View importantForAccessibility="no-hide-descendants" style={[styles.postDetailCard, { backgroundColor: colors.surface }]}>
      <SkeletonBlock width="30%" height={14} />
      <SkeletonBlock width="80%" height={25} style={styles.detailLine} />
      <View style={styles.postDetailAuthorRow}>
        <SkeletonBlock width={28} height={28} radius={14} />
        <SkeletonBlock width={130} height={14} />
      </View>
      <SkeletonBlock width="100%" height={16} style={styles.detailLine} />
      <SkeletonBlock width="95%" height={16} style={styles.line} />
      <SkeletonBlock width="70%" height={16} style={styles.line} />
    </View>
  </View>;
}

function EventCardSkeleton() {
  const dark = useColorScheme() === 'dark';
  const colors = petzyColors[dark ? 'dark' : 'light'];
  return <View style={[styles.eventCard, cardShadow(dark), { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <SkeletonBlock width={104} height={112} radius={0} />
    <View style={styles.eventBody}>
      <SkeletonBlock width="70%" height={18} />
      <SkeletonBlock width="55%" height={14} style={styles.line} />
      <SkeletonBlock width="65%" height={14} style={styles.line} />
    </View>
  </View>;
}

// Sección «Eventos» de una comunidad cargando (En curso/Próximos/Anteriores).
export function EventListSkeleton({ count = 2, label = 'Cargando eventos' }: { count?: number; label?: string }) {
  return <View accessible accessibilityLabel={label} accessibilityLiveRegion="polite">
    <View importantForAccessibility="no-hide-descendants">
      {Array.from({ length: count }, (_, index) => <EventCardSkeleton key={index} />)}
    </View>
  </View>;
}

function CommunityCardSkeleton() {
  const dark = useColorScheme() === 'dark';
  const colors = petzyColors[dark ? 'dark' : 'light'];
  return <View style={[styles.communityCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <SkeletonBlock width={30} height={30} radius={radius.sm} />
    <SkeletonBlock width="55%" height={20} style={styles.detailLine} />
    <SkeletonBlock width="100%" height={15} style={styles.line} />
    <SkeletonBlock width="80%" height={15} style={styles.line} />
    <SkeletonBlock width="35%" height={14} style={styles.detailLine} />
  </View>;
}

// Explorador de comunidades cargando.
export function CommunityListSkeleton({ count = 3 }: { count?: number }) {
  return <View accessible accessibilityLabel="Cargando comunidades" accessibilityLiveRegion="polite">
    <View importantForAccessibility="no-hide-descendants">
      {Array.from({ length: count }, (_, index) => <CommunityCardSkeleton key={index} />)}
    </View>
  </View>;
}

function CommentCardSkeleton() {
  const dark = useColorScheme() === 'dark';
  const colors = petzyColors[dark ? 'dark' : 'light'];
  return <View style={[styles.commentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <View style={styles.commentHeaderSkeleton}>
      <SkeletonBlock width={36} height={36} radius={18} />
      <View style={styles.info}>
        <SkeletonBlock width="35%" height={15} />
        <SkeletonBlock width="20%" height={12} style={styles.line} />
      </View>
    </View>
    <SkeletonBlock width="90%" height={15} style={styles.line} />
    <SkeletonBlock width="60%" height={15} style={styles.line} />
  </View>;
}

// Comentarios de una publicación cargando (post-interactions.tsx).
export function CommentListSkeleton({ count = 3 }: { count?: number }) {
  return <View accessible accessibilityLabel="Cargando comentarios" accessibilityLiveRegion="polite">
    <View importantForAccessibility="no-hide-descendants">
      {Array.from({ length: count }, (_, index) => <CommentCardSkeleton key={index} />)}
    </View>
  </View>;
}

// Detalle de una comunidad cargando (app/communities/[id]/index.tsx):
// portada ancha, nombre, descripción, conteo de integrantes y la fila de
// pestañas — reproduce la cabecera tipo portada actual para que el
// esqueleto no "salte" de forma cuando llega el contenido real.
export function CommunityDetailSkeleton() {
  return <View accessible accessibilityLabel="Cargando comunidad" accessibilityLiveRegion="polite">
    <View importantForAccessibility="no-hide-descendants" style={styles.communityDetail}>
      <SkeletonBlock width="100%" height={200} radius={18} />
      <SkeletonBlock width="60%" height={28} style={styles.detailLine} />
      <SkeletonBlock width="100%" height={16} style={styles.line} />
      <SkeletonBlock width="85%" height={16} style={styles.line} />
      <SkeletonBlock width="45%" height={14} style={styles.detailLine} />
      <View style={styles.communityTabsRow}>
        <SkeletonBlock width={128} height={38} radius={999} />
        <SkeletonBlock width={104} height={38} radius={999} />
      </View>
    </View>
  </View>;
}

// Adopción (AD-T12): tarjeta con la foto del animal como protagonista, igual
// que la tarjeta real, para que no haya salto de forma al terminar de cargar.
function AdoptionCardSkeleton() {
  const dark = useColorScheme() === 'dark';
  const colors = petzyColors[dark ? 'dark' : 'light'];
  return <View style={[styles.adoptionCard, cardShadow(dark), { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <SkeletonBlock width="100%" height={200} radius={0} />
    <View style={styles.adoptionBody}>
      <SkeletonBlock width={100} height={24} radius={12} />
      <SkeletonBlock width="75%" height={20} style={styles.line} />
      <SkeletonBlock width="40%" height={14} style={styles.line} />
    </View>
  </View>;
}

export function AdoptionListSkeleton({ count = 2, label = 'Cargando adopciones' }: { count?: number; label?: string }) {
  return <View accessible accessibilityLabel={label} accessibilityLiveRegion="polite">
    <View importantForAccessibility="no-hide-descendants">
      {Array.from({ length: count }, (_, index) => <AdoptionCardSkeleton key={index} />)}
    </View>
  </View>;
}

export function AdoptionDetailSkeleton() {
  return <View accessible accessibilityLabel="Cargando anuncio" accessibilityLiveRegion="polite">
    <View importantForAccessibility="no-hide-descendants">
      <SkeletonBlock width="100%" height={300} radius={radius.xl} />
      <SkeletonBlock width={110} height={26} radius={13} style={styles.detailLine} />
      <SkeletonBlock width="80%" height={26} style={styles.line} />
      <View style={styles.postDetailAuthorRow}>
        <SkeletonBlock width={36} height={36} radius={18} />
        <SkeletonBlock width={140} height={14} />
      </View>
      <SkeletonBlock width="100%" height={16} style={styles.detailLine} />
      <SkeletonBlock width="95%" height={16} style={styles.line} />
      <SkeletonBlock width="60%" height={16} style={styles.line} />
      <SkeletonBlock width="100%" height={52} radius={18} style={styles.detailLine} />
    </View>
  </View>;
}

const styles = StyleSheet.create({
  card: { minHeight: 128, borderWidth: 1, borderRadius: radius.xl, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  info: { flex: 1, gap: spacing.xs }, line: { marginTop: spacing.xs },
  detailCard: { padding: spacing.lg, borderRadius: radius.xl, marginTop: spacing.sm },
  detailLine: { marginTop: spacing.lg },
  profileCard: { borderWidth: 1, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md },
  profileIdentity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  publicCard: { marginTop: spacing.lg, padding: spacing.xxl, borderRadius: radius.xl, borderWidth: 1, alignItems: 'center' },
  conversationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  thread: { gap: spacing.md, paddingVertical: spacing.md },
  personRow: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  postCard: { borderWidth: 1, borderRadius: 23, overflow: 'hidden', marginBottom: spacing.lg },
  postBody: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 14 },
  postAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: 14, paddingBottom: spacing.md },
  postDetailCard: { borderRadius: 24, padding: spacing.xl },
  postDetailAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  communityCard: { borderWidth: 1, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.sm, marginBottom: spacing.md },
  eventCard: { flexDirection: 'row', borderWidth: 1, borderRadius: 18, overflow: 'hidden', minHeight: 112, marginBottom: spacing.md },
  eventBody: { flex: 1, padding: spacing.md, gap: spacing.xs, justifyContent: 'center' },
  communityDetail: { alignItems: 'flex-start', paddingTop: spacing.sm },
  communityTabsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  commentCard: { borderWidth: 1, borderRadius: 16, padding: 13, marginTop: 12 },
  adoptionCard: { borderWidth: 1, borderRadius: radius.xl, overflow: 'hidden', marginBottom: spacing.md },
  adoptionBody: { padding: spacing.lg, gap: spacing.xs },
  commentHeaderSkeleton: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
});
