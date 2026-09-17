import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
    ReduceMotion,
    runOnJS,
    useAnimatedProps,
    useAnimatedStyle,
    useReducedMotion,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const ACCENT_DEFAULT = "#FFB779";
// §4: crIticamente amortiguado (dampingRatio 1) con response ~0.35s. Ningun
// gesto trajo momento hacia esta transicion, asi que no lleva rebote.
const SPRING_SURFACE = { duration: 350, dampingRatio: 1 } as const;
// §14: el cross-fade es feedback no vestibular, se conserva incluso con
// "reducir movimiento" activado; lo que se elimina es la escala.
const FADE = { duration: 220, reduceMotion: ReduceMotion.Never } as const;
const BLUR_INTENSITY = 44;

export type GlassModalProps = {
    /** Controla la presentacion; el Modal nativo sigue montado durante la salida. */
    visible: boolean;
    title: string;
    message: string;
    /**
     * Color de acento del boton. Se espera un tono claro: el boton es una capa
     * solida (§12) con tinta oscura encima.
     */
    accent?: string;
    onClose: () => void;
};

export function GlassModal({
    visible,
    title,
    message,
    accent = ACCENT_DEFAULT,
    onClose,
}: GlassModalProps) {
    const insets = useSafeAreaInsets();
    const reducedMotion = useReducedMotion();
    const [mounted, setMounted] = useState(visible);
    const [wasVisible, setWasVisible] = useState(visible);

    // Ajuste de estado derivado durante el render: al abrirse hay que montar el
    // Modal nativo de inmediato, mientras que al cerrarse se desmonta hasta que
    // la animacion de salida termina.
    if (wasVisible !== visible) {
        setWasVisible(visible);
        if (visible) {
            setMounted(true);
        }
    }

    useEffect(() => {
        if (!visible) return;
        // §13 utilidad: haptica solo en momentos con significado, y en el mismo
        // evento causal que dispara la animacion.
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => { });
    }, [visible]);

    const scrimStyle = useAnimatedStyle(() => ({
        opacity: withTiming(visible ? 1 : 0, FADE),
    }));

    const cardStyle = useAnimatedStyle(() => {
        const opacity = withTiming(visible ? 1 : 0, FADE, (finished) => {
            // §7: la salida recorre el mismo camino que la entrada, invertido.
            // Se desmonta solo cuando termina, no al cambiar la prop.
            if (finished && !visible) {
                runOnJS(setMounted)(false);
            }
        });

        if (reducedMotion) {
            return { opacity, transform: [{ scale: 1 }] };
        }

        return {
            opacity,
            transform: [{ scale: withSpring(visible ? 1 : 0.92, SPRING_SURFACE) }],
        };
    });

    // §12 "materialize, don't just fade": el desenfoque crece junto con la
    // escala, para que la superficie llegue como material y no como opacidad.
    const blurProps = useAnimatedProps(() => ({
        intensity: withSpring(visible ? BLUR_INTENSITY : 0, SPRING_SURFACE),
    }));

    return (
        <Modal
            visible={mounted}
            transparent
            statusBarTranslucent
            animationType="none"
            onRequestClose={onClose}
        >
            <View style={styles.root}>
                {/* §12 "dim to focus": una tarea modal empareja la superficie
                    con un velo que empuja el fondo hacia atras. */}
                <AnimatedPressable
                    style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]}
                    onPress={onClose}
                    accessibilityRole="button"
                    accessibilityLabel="Cerrar"
                />

                <Animated.View
                    style={[
                        styles.cardWrap,
                        cardStyle,
                        {
                            marginLeft: insets.left + 24,
                            marginRight: insets.right + 24,
                        },
                    ]}
                    accessibilityViewIsModal
                    accessibilityRole="alert"
                >
                    <AnimatedBlurView
                        // Valor inicial; a partir del primer frame lo gobierna
                        // animatedProps. Sin esto expo-blur arranca en 50.
                        intensity={0}
                        tint="dark"
                        style={styles.card}
                        animatedProps={blurProps}
                    >
                        {/* §12: borde superior brillante, la luz que engancha el material. */}
                        <LinearGradient
                            pointerEvents="none"
                            colors={["rgba(255,255,255,0.16)", "rgba(255,255,255,0)"]}
                            style={styles.sheen}
                        />

                        <View style={[styles.accentRule, { backgroundColor: accent }]} />

                        <Text style={styles.title} maxFontSizeMultiplier={1.4}>
                            {title}
                        </Text>
                        <Text style={styles.message} maxFontSizeMultiplier={1.5}>
                            {message}
                        </Text>

                        {/* §1: el feedback ocurre al presionar, no al soltar. */}
                        <Pressable
                            onPress={onClose}
                            accessibilityRole="button"
                            style={({ pressed }) => [
                                styles.action,
                                { backgroundColor: accent },
                                pressed && styles.actionPressed,
                            ]}
                        >
                            <Text style={styles.actionLabel} maxFontSizeMultiplier={1.3}>
                                Entendido
                            </Text>
                        </Pressable>
                    </AnimatedBlurView>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    scrim: {
        backgroundColor: "rgba(8,4,12,0.55)",
    },
    cardWrap: {
        width: "100%",
        maxWidth: 360,
        borderRadius: 28,
        // §12: una superficie grande debe leerse mas gruesa que un chip.
        shadowColor: "#000",
        shadowOpacity: 0.45,
        shadowRadius: 30,
        shadowOffset: { width: 0, height: 18 },
        elevation: 24,
    },
    card: {
        borderRadius: 28,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.14)",
        paddingHorizontal: 24,
        paddingTop: 22,
        paddingBottom: 20,
        backgroundColor: "rgba(36,22,51,0.35)",
    },
    sheen: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 96,
    },
    accentRule: {
        width: 28,
        height: 3,
        borderRadius: 2,
        marginBottom: 16,
    },
    title: {
        color: "#fff",
        fontSize: 19,
        fontWeight: "700",
        // §15: tracking negativo conforme el texto crece.
        letterSpacing: -0.3,
        lineHeight: 24,
    },
    message: {
        marginTop: 8,
        // §12 vibrancy: sobre material translucido no va gris plano, sino un
        // tono mas contrastado y un poco mas pesado.
        color: "rgba(255,255,255,0.72)",
        fontWeight: "500",
        fontSize: 14.5,
        lineHeight: 20.5,
    },
    action: {
        marginTop: 22,
        borderRadius: 14,
        paddingVertical: 13,
        alignItems: "center",
        justifyContent: "center",
    },
    actionPressed: {
        transform: [{ scale: 0.97 }],
        opacity: 0.9,
    },
    actionLabel: {
        color: "#16101F",
        fontSize: 15,
        fontWeight: "700",
        letterSpacing: 0.1,
    },
});
