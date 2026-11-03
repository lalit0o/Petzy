import type { PressableProps } from 'react-native';
import { Pressable } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

type Props = PressableProps & { scaleTo?: number };

// Feedback táctil al presionar (apple-design §1: responder en pointer-down,
// no al soltar). Con movimiento reducido, cambia a una ligera opacidad en
// vez de escalar, para seguir dando respuesta sin animación vestibular.
export function AnimatedPressable({ scaleTo = 0.97, onPressIn, onPressOut, style, ...props }: Props) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }], opacity: opacity.get() }));

  return <AnimatedPressableBase
    {...props}
    onPressIn={event => {
      if (reducedMotion) opacity.set(withTiming(0.85, { duration: 90, reduceMotion: ReduceMotion.Never }));
      else scale.set(withSpring(scaleTo, { duration: 150, dampingRatio: 1, overshootClamping: true, reduceMotion: ReduceMotion.Never }));
      onPressIn?.(event);
    }}
    onPressOut={event => {
      if (reducedMotion) opacity.set(withTiming(1, { duration: 120, reduceMotion: ReduceMotion.Never }));
      else scale.set(withSpring(1, { duration: 150, dampingRatio: 1, overshootClamping: true, reduceMotion: ReduceMotion.Never }));
      onPressOut?.(event);
    }}
    style={[style as object, animatedStyle]}
  />;
}
