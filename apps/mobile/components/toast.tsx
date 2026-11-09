import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cardShadow, petzyColors } from '@/constants/petzy-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ToastContextValue = { show: (message: string) => void };
const ToastContext = createContext<ToastContextValue | null>(null);

// Confirmación breve y no intrusiva (ui-ux-pro-max: toast-dismiss — se
// cierra solo en unos segundos; toast-accessibility — no roba el foco,
// se anuncia con accessibilityLiveRegion). Vive una sola vez en la raíz
// de la app para que cualquier pantalla pueda llamar a useToast().show(...)
// sin preocuparse de a dónde navegó después.
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider.');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const dark = useColorScheme() === 'dark';
  const colors = petzyColors[dark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [message, setMessage] = useState<string | null>(null);
  const progress = useSharedValue(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((next: string) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (unmountTimer.current) clearTimeout(unmountTimer.current);
    setMessage(next);
    progress.set(reducedMotion
      ? withTiming(1, { duration: 150, reduceMotion: ReduceMotion.Never })
      : withSpring(1, { duration: 320, dampingRatio: 1, overshootClamping: true, reduceMotion: ReduceMotion.System }));
    hideTimer.current = setTimeout(() => {
      progress.set(reducedMotion
        ? withTiming(0, { duration: 150, reduceMotion: ReduceMotion.Never })
        : withSpring(0, { duration: 260, dampingRatio: 1, overshootClamping: true, reduceMotion: ReduceMotion.System }));
      unmountTimer.current = setTimeout(() => setMessage(null), 300);
    }, 3200);
  }, [progress, reducedMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ translateY: (1 - progress.get()) * -16 }],
  }));

  return <ToastContext.Provider value={{ show }}>
    {children}
    {message ? <Animated.View pointerEvents="none" accessible accessibilityLiveRegion="polite" style={[styles.toast, cardShadow(dark), { top: insets.top + 12, backgroundColor: colors.accent }, style]}>
      <Ionicons name="checkmark-circle" size={20} color={colors.onAccent} />
      <Text style={[styles.text, { color: colors.onAccent }]}>{message}</Text>
    </Animated.View> : null}
  </ToastContext.Provider>;
}

const styles = StyleSheet.create({
  toast: { position: 'absolute', left: 16, right: 16, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 1000 },
  text: { fontFamily: 'Nunito_700Bold', fontSize: 15, flex: 1 },
});
