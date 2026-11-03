import { createContext, useCallback, useContext, useEffect, useRef, type ComponentProps, type ReactNode } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { ReduceMotion, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { petzyColors } from '@/constants/petzy-theme';

export type MenuAnchor = { x: number; y: number; bottom: number };
type CloseMenu = (afterClose?: () => void) => void;
const MenuCloseContext = createContext<CloseMenu | null>(null);
type Props = {
  visible: boolean;
  anchor: MenuAnchor;
  onClose: () => void;
  title?: string;
  width?: number;
  estimatedHeight?: number;
  children: ReactNode;
};

// Tonos propios de este menú que no forman parte de la paleta compartida:
// el fondo "presionado" y el velo detrás del menú.
const extras = { light: { pressed: '#DBDFD0', scrim: 'rgba(0,0,0,0.32)' }, dark: { pressed: '#404F4D', scrim: 'rgba(0,0,0,0.55)' } };
function useMenuColors() {
  const theme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const palette = petzyColors[theme];
  return { surface: palette.surface, text: palette.textPrimary, heading: palette.accent, border: palette.border, danger: palette.error, ...extras[theme] };
}

export function AnchoredMenu({ visible, anchor, onClose, title, width: preferredWidth = 240, estimatedHeight = 180, children }: Props) {
  const isDark = useColorScheme() === 'dark';
  const colors = useMenuColors();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const menuWidth = Math.min(preferredWidth, width - insets.left - insets.right - 32);
  const left = Math.max(insets.left + 16, Math.min(anchor.x - menuWidth / 2, width - insets.right - 16 - menuWidth));
  const top = Math.max(insets.top + 8, Math.min(anchor.bottom + 4, height - insets.bottom - estimatedHeight));
  const progress = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  const closing = useRef(false);
  const exitCompleted = useRef(false);
  const pendingAction = useRef<(() => void) | null>(null);

  const finishAction = useCallback(() => {
    if (!exitCompleted.current) return;
    exitCompleted.current = false;
    const action = pendingAction.current;
    pendingAction.current = null;
    action?.();
  }, []);

  useEffect(() => {
    if (visible) return;
    progress.set(0);
    // Un cierre externo (por ejemplo, perder acceso al post) cancela la acción.
    if (!exitCompleted.current) pendingAction.current = null;
    if (Platform.OS !== 'ios') finishAction();
  }, [visible, progress, finishAction]);

  const finishClose = useCallback(() => {
    exitCompleted.current = true;
    onClose();
  }, [onClose]);

  const close: CloseMenu = useCallback((afterClose) => {
    if (closing.current) return;
    closing.current = true;
    pendingAction.current = afterClose ?? null;
    const onFinished = (finished?: boolean) => {
      'worklet';
      if (finished) runOnJS(finishClose)();
    };
    progress.set(reducedMotion
      ? withTiming(0, { duration: 120, reduceMotion: ReduceMotion.Never }, onFinished)
      : withSpring(0, { duration: 220, dampingRatio: 1, overshootClamping: true, reduceMotion: ReduceMotion.System }, onFinished));
  }, [progress, reducedMotion, finishClose]);

  const show = () => {
    closing.current = false;
    exitCompleted.current = false;
    pendingAction.current = null;
    progress.set(reducedMotion
      ? withTiming(1, { duration: 120, reduceMotion: ReduceMotion.Never })
      : withSpring(1, { duration: 280, dampingRatio: 1, overshootClamping: true, reduceMotion: ReduceMotion.System }));
  };
  const surfaceStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ scale: reducedMotion ? 1 : 0.08 + progress.get() * 0.92 }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));

  return <Modal transparent visible={visible} animationType="none" statusBarTranslucent onShow={show} onDismiss={finishAction} onRequestClose={() => close()}>
    <MenuCloseContext.Provider value={close}><View style={styles.overlay}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }, backdropStyle]} />
      <Pressable accessibilityRole="button" accessibilityLabel="Cerrar opciones" style={StyleSheet.absoluteFill} onPress={() => close()} />
      <Animated.View accessibilityViewIsModal style={[styles.surface, {
        top, left, width: menuWidth, maxHeight: Math.max(48, height - top - insets.bottom - 8),
        backgroundColor: colors.surface, borderColor: colors.border, shadowOpacity: isDark ? 0.5 : 0.24,
        transformOrigin: [anchor.x - left, anchor.y - top, 0],
      }, surfaceStyle]}>
        <ScrollView bounces={false}>
          {title ? <Text style={[styles.title, { color: colors.heading }]}>{title}</Text> : null}
          {children}
        </ScrollView>
      </Animated.View>
    </View></MenuCloseContext.Provider>
  </Modal>;
}

export function AnchoredMenuItem({ label, icon, destructive = false, selected, separator = true, onPress }: {
  label: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  destructive?: boolean;
  selected?: boolean;
  separator?: boolean;
  onPress?: () => void;
}) {
  const close = useContext(MenuCloseContext);
  const colors = useMenuColors();
  if (!close) throw new Error('AnchoredMenuItem debe estar dentro de AnchoredMenu.');
  const foreground = destructive ? colors.danger : colors.heading;
  return <Pressable accessibilityRole={selected === undefined ? 'button' : 'radio'} accessibilityState={selected === undefined ? undefined : { checked: selected }} onPress={() => close(onPress)} style={({ pressed }) => [
    styles.item,
    separator && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    (pressed || selected) && { backgroundColor: colors.pressed },
  ]}>
    {icon ? <Ionicons name={icon} size={22} color={foreground} /> : null}
    <Text style={[styles.label, { color: destructive ? foreground : colors.text }]}>{label}</Text>
    {selected ? <Ionicons name="checkmark" size={20} color={colors.heading} /> : null}
  </Pressable>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  surface: { position: 'absolute', borderRadius: 18, padding: 8, borderWidth: 1, shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowRadius: 20, elevation: 16 },
  title: { fontFamily: 'Nunito_700Bold', fontSize: 18, padding: 12 },
  item: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10 },
  label: { flex: 1, fontFamily: 'Nunito_700Bold', fontSize: 16 },
});
