import { useState } from "react";
import { useAuthContext } from "@/context/AuthContext";
import { MEXICO_STATES, type MexicoState } from "@/types/mexicoState";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Pressable,
    KeyboardAvoidingView,
    Platform,
    Modal,
    FlatList,
    ScrollView,
    useWindowDimensions,
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassModal } from "@/components/glass-modal";

// Por debajo de esta altura (iPhone SE, Androids chicos) se recorta el
// espaciado vertical para que el formulario de registro entre sin scroll.
const COMPACT_HEIGHT = 700;
// Evita que la tarjeta se estire de lado a lado en tablets
// (app.json declara ios.supportsTablet: true).
const CARD_MAX_WIDTH = 440;

// Critically damped by default (§4) — snappy, no distracting overshoot
const SPRING_DEFAULT = { damping: 26, stiffness: 260, mass: 1 };
// A touch of bounce only for the momentum-carrying press gesture (§4)
const SPRING_PRESS = { damping: 14, stiffness: 300, mass: 0.9 };

function formatStateLabel(state: MexicoState) {
    return state
        .toLowerCase()
        .split("_")
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join(" ");
}

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
                    <Text
                        style={[styles.fieldLabel, focused && { color: "#FFB779" }]}
                        maxFontSizeMultiplier={1.4}
                    >
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
                        maxFontSizeMultiplier={1.4}
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
            {error ? <Text style={styles.errorMessage}>{error}</Text> : null}
        </>
    );
}

function StateField({
    value,
    onChange,
    error,
}: {
    value: MexicoState | null;
    onChange: (state: MexicoState) => void;
    error?: string;
}) {
    const [open, setOpen] = useState(false);
    // El Modal se monta fuera del SafeAreaView, asi que la hoja inferior
    // necesita sus propios insets para no quedar bajo la barra de gestos.
    const insets = useSafeAreaInsets();
    const { height } = useWindowDimensions();

    return (
        <>
            <Pressable style={styles.fieldWrap} onPress={() => setOpen(true)}>
                <Ionicons
                    name="location-outline"
                    size={18}
                    color="rgba(255,255,255,0.45)"
                    style={{ marginRight: 10 }}
                />
                <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel} maxFontSizeMultiplier={1.4}>
                        Estado
                    </Text>
                    <Text
                        style={[styles.fieldInput, !value && { color: "rgba(255,255,255,0.35)" }]}
                        maxFontSizeMultiplier={1.4}
                        numberOfLines={1}
                    >
                        {value ? formatStateLabel(value) : "Selecciona tu estado"}
                    </Text>
                </View>
                <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.45)" />
            </Pressable>
            {error ? <Text style={styles.errorMessage}>{error}</Text> : null}

            <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setOpen(false)}>
                    <Pressable
                        style={[
                            styles.modalSheet,
                            { paddingBottom: Math.max(insets.bottom, 16) + 16 },
                        ]}
                        // Absorbe el tap para que tocar la hoja no cierre el modal.
                        onPress={() => { }}
                    >
                        <Text style={styles.modalTitle}>Selecciona tu estado</Text>
                        <FlatList
                            data={MEXICO_STATES}
                            keyExtractor={(item) => item}
                            style={{ maxHeight: height * 0.5 }}
                            renderItem={({ item }) => (
                                <Pressable
                                    style={styles.modalItem}
                                    onPress={() => {
                                        onChange(item);
                                        setOpen(false);
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.modalItemText,
                                            item === value && { color: "#FFB779", fontWeight: "700" },
                                        ]}
                                    >
                                        {formatStateLabel(item)}
                                    </Text>
                                    {item === value && (
                                        <Ionicons name="checkmark" size={18} color="#FFB779" />
                                    )}
                                </Pressable>
                            )}
                        />
                    </Pressable>
                </Pressable>
            </Modal>
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
                    <Text style={styles.buttonText} maxFontSizeMultiplier={1.3}>
                        {label}
                    </Text>
                </LinearGradient>
            </Pressable>
        </Animated.View>
    );
}

export default function Login() {
    const [mode, setMode] = useState<"login" | "register">("login");
    // Dice si la cuenta se acaba de crear; es lo unico que presenta el modal.
    const [accountCreated, setAccountCreated] = useState(false);

    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
    const { logIn, signUp, authError } = useAuthContext();

    const [regUsername, setRegUsername] = useState("");
    const [regEmail, setRegEmail] = useState("");
    const [regPassword, setRegPassword] = useState("");
    const [regLocatedAt, setRegLocatedAt] = useState<MexicoState | null>(null);
    const [regErrors, setRegErrors] = useState<{
        username?: string;
        email?: string;
        password?: string;
        locatedAt?: string;
    }>({});

    function switchMode(next: "login" | "register") {
        setAccountCreated(false);
        setMode(next);
    }

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

    function validateRegister() {
        const next: typeof regErrors = {};
        if (!regUsername || regUsername.length < 3) {
            next.username = 'El nombre de usuario debe tener al menos 3 carácteres';
        }
        if (!regEmail) {
            next.email = 'El email es requerido para registrarte';
        }
        if (!regPassword || regPassword.length < 8) {
            next.password = 'La contraseña debe tener al menos 8 carácteres';
        }
        if (!regLocatedAt) {
            next.locatedAt = 'Selecciona el estado donde te ubicas';
        }

        setRegErrors(next);
        return Object.keys(next).length === 0;
    }

    async function handleRegister() {
        if (!validateRegister()) return;
        const ok = await signUp({
            username: regUsername,
            email: regEmail,
            password: regPassword,
            locatedAt: regLocatedAt!,
        });
        if (ok) {
            setEmail(regEmail);
            setRegUsername("");
            setRegEmail("");
            setRegPassword("");
            setRegLocatedAt(null);
            setRegErrors({});
            setAccountCreated(true);
            setMode("login");
        }
    }

    const isLogin = mode === "login";
    // Se leen en cada render: cubren rotacion, split view en tablet y plegables.
    const { width, height } = useWindowDimensions();
    const isCompact = height < COMPACT_HEIGHT;
    const glowSize = width * 1.1;

    return (
        <View style={styles.root}>
            <LinearGradient
                colors={["#1B1024", "#2B1533", "#160D1E"]}
                style={StyleSheet.absoluteFill}
            />
            {/* soft glow blobs for depth, per material/hierarchy guidance */}
            <View
                pointerEvents="none"
                style={[
                    styles.glow,
                    styles.glowTop,
                    {
                        width: glowSize,
                        height: glowSize,
                        borderRadius: glowSize / 2,
                        top: -width * 0.7,
                        left: -width * 0.2,
                    },
                ]}
            />
            <View
                pointerEvents="none"
                style={[
                    styles.glow,
                    styles.glowBottom,
                    {
                        width: glowSize,
                        height: glowSize,
                        borderRadius: glowSize / 2,
                        bottom: -width * 0.6,
                        right: -width * 0.3,
                    },
                ]}
            />

            <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    style={styles.flex}
                >
                    <ScrollView
                        style={styles.flex}
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                        showsVerticalScrollIndicator={false}
                        bounces={false}
                    >
                        <View style={[styles.header, isCompact && styles.headerCompact]}>
                            <View style={[styles.logoBadge, isCompact && styles.logoBadgeCompact]}>
                                <Ionicons name="paw" size={isCompact ? 24 : 28} color="#FFB779" />
                            </View>
                            <Text
                                style={[styles.appName, isCompact && styles.appNameCompact]}
                                maxFontSizeMultiplier={1.4}
                            >
                                Petzy
                            </Text>
                            <Text style={styles.tagline} maxFontSizeMultiplier={1.4}>
                                El hogar digital de tu mejor amigo
                            </Text>
                        </View>

                        <BlurView intensity={40} tint="dark" style={styles.card}>
                            {isLogin ? (
                                <>
                                    <Text style={styles.cardTitle}>Bienvenido de vuelta</Text>
                                    <Text style={styles.cardSubtitle}>
                                        Inicia sesión para seguir cuidando a tu mascota
                                    </Text>

                                    {/* Las key son necesarias: sin ellas React reconcilia por
                                        posicion al cambiar de modo y un campo hereda el estado
                                        interno (hidden, focused) del que ocupaba ese indice. */}
                                    <View style={{ gap: 14, marginTop: 22 }}>
                                        <FloatingField
                                            key="login-email"
                                            label="Correo"
                                            value={email}
                                            onChangeText={setEmail}
                                            icon="mail-outline"
                                            error={errors.email}
                                        />
                                        <FloatingField
                                            key="login-password"
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

                                    {authError ? <Text style={styles.errorMessage}>{authError}</Text> : null}

                                    <View style={{ marginTop: 20 }}>
                                        <PrimaryButton label="Iniciar sesión" onPress={handleLogin} />
                                    </View>
                                </>
                            ) : (
                                <>
                                    <Text style={styles.cardTitle}>Crea tu cuenta</Text>
                                    <Text style={styles.cardSubtitle}>
                                        Únete para empezar a cuidar a tu mascota
                                    </Text>

                                    <View style={{ gap: 14, marginTop: 22 }}>
                                        <FloatingField
                                            key="register-username"
                                            label="Nombre de usuario"
                                            value={regUsername}
                                            onChangeText={setRegUsername}
                                            icon="person-outline"
                                            error={regErrors.username}
                                        />
                                        <FloatingField
                                            key="register-email"
                                            label="Correo"
                                            value={regEmail}
                                            onChangeText={setRegEmail}
                                            icon="mail-outline"
                                            error={regErrors.email}
                                        />
                                        <FloatingField
                                            key="register-password"
                                            label="Contraseña"
                                            value={regPassword}
                                            onChangeText={setRegPassword}
                                            secure
                                            icon="lock-closed-outline"
                                            error={regErrors.password}
                                        />
                                        <StateField
                                            key="register-state"
                                            value={regLocatedAt}
                                            onChange={setRegLocatedAt}
                                            error={regErrors.locatedAt}
                                        />
                                    </View>

                                    {authError ? <Text style={styles.errorMessage}>{authError}</Text> : null}

                                    <View style={{ marginTop: 20 }}>
                                        <PrimaryButton label="Registrarme" onPress={handleRegister} />
                                    </View>
                                </>
                            )}
                        </BlurView>

                        <View style={[styles.footer, isCompact && styles.footerCompact]}>
                            {isLogin ? (
                                <>
                                    <Text style={styles.footerText}>¿No tienes cuenta? </Text>
                                    <Pressable hitSlop={8} onPress={() => switchMode("register")}>
                                        <Text style={styles.footerLink}>Regístrate</Text>
                                    </Pressable>
                                </>
                            ) : (
                                <>
                                    <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>
                                    <Pressable hitSlop={8} onPress={() => switchMode("login")}>
                                        <Text style={styles.footerLink}>Inicia sesión</Text>
                                    </Pressable>
                                </>
                            )}
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>

            <GlassModal
                visible={accountCreated}
                title="Cuenta creada"
                message="Tu cuenta quedó lista. Inicia sesión para empezar a cuidar a tu mascota."
                accent="#7CE0B0"
                onClose={() => setAccountCreated(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: "#160D1E",
    },
    flex: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    scrollContent: {
        // flexGrow + center: centrado vertical en pantallas altas,
        // scroll real en pantallas cortas o con el teclado abierto.
        flexGrow: 1,
        justifyContent: "center",
        paddingHorizontal: 22,
    },
    glow: {
        position: "absolute",
        opacity: 0.35,
    },
    glowTop: {
        backgroundColor: "#FF7847",
        opacity: 0.25,
    },
    glowBottom: {
        backgroundColor: "#7C3AED",
        opacity: 0.2,
    },
    header: {
        alignItems: "center",
        paddingTop: 28,
        paddingBottom: 20,
    },
    headerCompact: {
        paddingTop: 12,
        paddingBottom: 12,
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
    logoBadgeCompact: {
        width: 48,
        height: 48,
        borderRadius: 16,
        marginBottom: 10,
    },
    appName: {
        fontSize: 34,
        fontWeight: "700",
        color: "#fff",
        letterSpacing: -0.6, // negative tracking on large display text (§15)
        lineHeight: 38,
    },
    appNameCompact: {
        fontSize: 28,
        lineHeight: 32,
    },
    tagline: {
        marginTop: 6,
        fontSize: 14,
        color: "rgba(255,255,255,0.55)",
        letterSpacing: 0.1,
        textAlign: "center",
    },
    card: {
        width: "100%",
        maxWidth: CARD_MAX_WIDTH,
        alignSelf: "center",
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
        borderColor: "rgba(255,255,255,0.14)",
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
        // minHeight en vez de height: el texto crece con el tamano de fuente
        // del sistema sin recortarse.
        minHeight: 22,
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
        flexWrap: "wrap",
        paddingVertical: 24,
    },
    footerCompact: {
        paddingVertical: 14,
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
        marginTop: 10,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.55)",
        justifyContent: "flex-end",
    },
    modalSheet: {
        backgroundColor: "#241633",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 18,
        paddingHorizontal: 20,
    },
    modalTitle: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 12,
    },
    modalItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 13,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "rgba(255,255,255,0.1)",
    },
    modalItemText: {
        color: "rgba(255,255,255,0.85)",
        fontSize: 14.5,
    },
});
