import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Pressable,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    interpolateColor,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

// Critically damped by default (§4) — snappy, no distracting overshoot
const SPRING_DEFAULT = { damping: 26, stiffness: 260, mass: 1 };
// A touch of bounce only for the momentum-carrying press gesture (§4)
const SPRING_PRESS = { damping: 14, stiffness: 300, mass: 0.9 };

function FloatingField({
    label,
    value,
    onChangeText,
    secure,
    icon,
    error,
}: {
    label: string;
    value: string;
    onChangeText: (t: string) => void;
    secure?: boolean;
    icon: keyof typeof Ionicons.glyphMap;
    error?: string;
}) {
    const [focused, setFocused] = useState(false);
    const [hidden, setHidden] = useState(!!secure);
    const focus = useSharedValue(0);


    const borderStyle = useAnimatedStyle(() => ({
        borderColor: interpolateColor(
            focus.value,
            [0, 1],
            ["rgba(255,255,255,0.14)", "rgba(255,183,121,0.9)"]
        ),
        transform: [{ scale: withSpring(1 + focus.value * 0.012, SPRING_DEFAULT) }],
    }));


    return (
        <>

            <Animated.View style={[styles.fieldWrap, borderStyle]}>
                <Ionicons
                    name={icon}
                    size={18}
                    color={focused ? "#FFB779" : "rgba(255,255,255,0.45)"}
                    style={{ marginRight: 10 }}
                />
                <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, focused && { color: "#FFB779" }]}>
                        {label}
                    </Text>
                    <TextInput
                        value={value}
                        onChangeText={onChangeText}
                        onFocus={() => {
                            setFocused(true);
                            focus.value = withTiming(1, { duration: 180 });
                        }}
                        onBlur={() => {
                            setFocused(false);
                            focus.value = withTiming(0, { duration: 180 });
                        }}
                        secureTextEntry={hidden}
                        placeholder=""
                        autoCapitalize="none"
                        style={styles.fieldInput}
                        cursorColor="#FFB779"
                        selectionColor="#FFB779"
                    />
                </View>

                {secure && (
                    <Pressable hitSlop={12} onPress={() => setHidden((h) => !h)}>
                        <Ionicons
                            name={hidden ? "eye-outline" : "eye-off-outline"}
                            size={18}
                            color="rgba(255,255,255,0.45)"
                        />
                    </Pressable>
                )}

            </Animated.View>
            {error && (<Text style={styles.errorMessage}>{error}</Text>)}
        </>
    );
}

function PrimaryButton({ label, onPress }: { label: string; onPress?: () => void }) {
    const scale = useSharedValue(1);
    const scaleStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View style={scaleStyle}>
            <Pressable
                onPressIn={() => {
                    // Feedback on press-DOWN, not release (§1)
                    scale.value = withSpring(0.96, SPRING_PRESS);
                }}
                onPressOut={() => {
                    scale.value = withSpring(1, SPRING_PRESS);
                }}
                onPress={onPress}
                style={styles.buttonPressable}
            >
                <LinearGradient
                    colors={["#FF9A56", "#FF7847"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.button}
                >
                    <Text style={styles.buttonText}>{label}</Text>
                </LinearGradient>
            </Pressable>
        </Animated.View>
    );
}

export default function Login() {
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
    const { logIn, authError } = useAuth();

    function validate() {
        const next: typeof errors = {};
        if (!email) {
            next.email = 'El email es requerido para iniciar sesión';
        }
        if (!password) {
            next.password = 'La contraseña es requerida para iniciar sesión';
        }

        setErrors(next);
        return Object.keys(next).length === 0
    }

    async function handleLogin() {
        if (!validate()) return;
        await logIn(email, password);
    }

    return (
        <View style={styles.root}>
            <LinearGradient
                colors={["#1B1024", "#2B1533", "#160D1E"]}
                style={StyleSheet.absoluteFill}
            />
            {/* soft glow blobs for depth, per material/hierarchy guidance */}
            <View style={[styles.glow, styles.glowTop]} />
            <View style={[styles.glow, styles.glowBottom]} />

            <SafeAreaView style={{ flex: 1 }}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    style={{ flex: 1 }}
                >
                    <View style={styles.header}>
                        <View style={styles.logoBadge}>
                            <Ionicons name="paw" size={28} color="#FFB779" />
                        </View>
                        <Text style={styles.appName}>Petzy</Text>
                        <Text style={styles.tagline}>El hogar digital de tu mejor amigo</Text>
                    </View>

                    <BlurView intensity={40} tint="dark" style={styles.card}>
                        <Text style={styles.cardTitle}>Bienvenido de vuelta</Text>
                        <Text style={styles.cardSubtitle}>
                            Inicia sesión para seguir cuidando a tu mascota
                        </Text>

                        <View style={{ gap: 14, marginTop: 22 }}>
                            <FloatingField
                                label="Correo"
                                value={email}
                                onChangeText={setEmail}
                                icon="mail-outline"
                                error={errors.email}
                            />
                            <FloatingField
                                label="Contraseña"
                                value={password}
                                onChangeText={setPassword}
                                secure
                                icon="lock-closed-outline"
                                error={errors.password}
                            />
                        </View>

                        <Pressable hitSlop={8} style={{ alignSelf: "flex-end", marginTop: 10 }}>
                            <Text style={styles.forgot}>¿Olvidaste tu contraseña?</Text>
                        </Pressable>

                        {authError && <Text style={styles.errorMessage}>{authError}</Text>}

                        <View style={{ marginTop: 20 }}>
                            <PrimaryButton label="Iniciar sesión" onPress={handleLogin} />
                        </View>

                        
                    </BlurView>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>¿No tienes cuenta? </Text>
                        <Pressable hitSlop={8}>
                            <Text style={styles.footerLink}>Regístrate</Text>
                        </Pressable>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: "#160D1E",
    },
    glow: {
        position: "absolute",
        width: width * 1.1,
        height: width * 1.1,
        borderRadius: width,
        opacity: 0.35,
    },
    glowTop: {
        backgroundColor: "#FF7847",
        top: -width * 0.7,
        left: -width * 0.2,
        opacity: 0.25,
    },
    glowBottom: {
        backgroundColor: "#7C3AED",
        bottom: -width * 0.6,
        right: -width * 0.3,
        opacity: 0.2,
    },
    header: {
        alignItems: "center",
        paddingTop: 28,
        paddingBottom: 20,
    },
    logoBadge: {
        width: 56,
        height: 56,
        borderRadius: 18,
        backgroundColor: "rgba(255,183,121,0.14)",
        borderWidth: 1,
        borderColor: "rgba(255,183,121,0.3)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 14,
    },
    appName: {
        fontSize: 34,
        fontWeight: "700",
        color: "#fff",
        letterSpacing: -0.6, // negative tracking on large display text (§15)
        lineHeight: 38,
    },
    tagline: {
        marginTop: 6,
        fontSize: 14,
        color: "rgba(255,255,255,0.55)",
        letterSpacing: 0.1,
    },
    card: {
        marginHorizontal: 22,
        borderRadius: 28,
        padding: 24,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#fff",
        letterSpacing: -0.2,
    },
    cardSubtitle: {
        marginTop: 4,
        fontSize: 13,
        color: "rgba(255,255,255,0.5)",
        lineHeight: 18,
    },
    fieldWrap: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1.5,
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: "rgba(255,255,255,0.05)",
    },
    fieldLabel: {
        fontSize: 11,
        color: "rgba(255,255,255,0.45)",
        letterSpacing: 0.2,
        marginBottom: 1,
    },
    fieldInput: {
        fontSize: 15,
        color: "#fff",
        padding: 0,
        height: 22,
    },
    forgot: {
        fontSize: 12.5,
        color: "#FFB779",
        fontWeight: "600",
    },
    buttonPressable: {
        borderRadius: 16,
        overflow: "hidden",
    },
    button: {
        paddingVertical: 15,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 16,
    },
    buttonText: {
        color: "#1B1024",
        fontSize: 15.5,
        fontWeight: "700",
        letterSpacing: 0.1,
    },
    dividerRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 22,
        gap: 10,
    },
    dividerLine: {
        flex: 1,
        height: StyleSheet.hairlineWidth,
        backgroundColor: "rgba(255,255,255,0.18)",
    },
    dividerText: {
        fontSize: 11.5,
        color: "rgba(255,255,255,0.4)",
    },
    socialRow: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 14,
        marginTop: 18,
    },
    socialButton: {
        width: 52,
        height: 48,
        borderRadius: 14,
        backgroundColor: "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
        alignItems: "center",
        justifyContent: "center",
    },
    footer: {
        flexDirection: "row",
        justifyContent: "center",
        paddingVertical: 24,
    },
    footerText: {
        color: "rgba(255,255,255,0.55)",
        fontSize: 13.5,
    },
    footerLink: {
        color: "#FFB779",
        fontSize: 13.5,
        fontWeight: "700",
    },
    errorMessage: {
        color: 'red',
        fontWeight: 'bold',
        marginLeft: 10,
        marginTop:10,
    }
});
