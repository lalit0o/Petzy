import { ComponentProps } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { Href, usePathname, useRouter } from "expo-router"
import { BlurView } from "expo-blur"
import { LinearGradient } from "expo-linear-gradient"
import * as Haptics from "expo-haptics"
import Ionicons from "@expo/vector-icons/Ionicons"
import Animated, {
    SharedValue,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { useColorScheme } from "@/hooks/use-color-scheme"

type IconName = ComponentProps<typeof Ionicons>["name"]

type Tab = {
    name: string
    url: Href
    icon: IconName
    iconActive: IconName
}

// Pestañas de app/(tabs). Los grupos entre paréntesis no forman parte de la URL.
export const TABS: Tab[] = [
    { name: "Inicio", url: "/", icon: "home-outline", iconActive: "home" },
    { name: "Comunidades", url: "/comunidades", icon: "people-outline", iconActive: "people" },
    {name: "Mis mascotas" ,url:"/mascotas", icon:"person-circle-outline",iconActive:"person-circle"},
    { name: "Mi perfil", url: "/perfil", icon: "person-circle-outline", iconActive: "person-circle" },
    
]

const ITEM = 64
const CIRCLE = 52
const PADDING = 6
const BAR_HEIGHT = ITEM + PADDING * 2
const PRESSED_SCALE = 1.12

// Espacio que ocupa la barra flotante; las pantallas lo usan como paddingBottom
// para que el ultimo contenido no quede debajo del vidrio.
export const NAV_HEIGHT = BAR_HEIGHT + 16

// §4: criticamente amortiguado (dampingRatio 1). Un tap no trae momento, asi
// que ni el circulo ni la escala llevan rebote.
const SPRING_SLIDE = { duration: 380, dampingRatio: 1 } as const
const SPRING_PRESS = { duration: 220, dampingRatio: 1 } as const

const PALETTE = {
    dark: {
        tint: "systemUltraThinMaterialDark",
        fill: "rgba(36,22,51,0.35)",
        border: "rgba(255,255,255,0.16)",
        sheen: "rgba(255,255,255,0.16)",
        circle: "rgba(255,255,255,0.14)",
        circleBorder: "rgba(255,255,255,0.28)",
        icon: "rgba(255,255,255,0.62)",
        iconActive: "#FFB779",
    },
    light: {
        tint: "systemUltraThinMaterialLight",
        fill: "rgba(255,255,255,0.45)",
        border: "rgba(255,255,255,0.7)",
        sheen: "rgba(255,255,255,0.6)",
        circle: "rgba(255,255,255,0.75)",
        circleBorder: "rgba(255,255,255,0.95)",
        icon: "rgba(22,16,31,0.55)",
        iconActive: "#E8662F",
    },
} as const

export default function Nav() {
    const router = useRouter()
    const pathname = usePathname()
    const insets = useSafeAreaInsets()
    const palette = PALETTE[useColorScheme() === "dark" ? "dark" : "light"]

    // Indice de la opcion que el dedo esta tocando; -1 cuando no hay ninguna.
    const pressed = useSharedValue(-1)

    const active = Math.max(0, TABS.findIndex((tab) => tab.url === pathname))

    const circleStyle = useAnimatedStyle(() => ({
        transform: [
            // §7: el circulo viaja de una opcion a otra en lugar de aparecer,
            // asi se entiende de donde viene y a donde va.
            { translateX: withSpring(active * ITEM, SPRING_SLIDE) },
            { scale: withSpring(pressed.get() === active ? PRESSED_SCALE : 1, SPRING_PRESS) },
        ],
    }))

    return (
        <View
            pointerEvents="box-none"
            style={[styles.root, { bottom: Math.max(insets.bottom, 12) + 4 }]}
        >
            <View style={styles.shadow}>
                {/* §12: material translucido; el contenido pasa por debajo. En
                    Android sin blurTarget se queda en el relleno semitransparente. */}
                <BlurView
                    intensity={60}
                    tint={palette.tint}
                    style={[styles.bar, { backgroundColor: palette.fill, borderColor: palette.border }]}
                >
                    {/* §12: borde superior brillante, la luz que engancha el material. */}
                    <LinearGradient
                        pointerEvents="none"
                        colors={[palette.sheen, "transparent"]}
                        style={styles.sheen}
                    />

                    <Animated.View
                        pointerEvents="none"
                        style={[
                            styles.circle,
                            { backgroundColor: palette.circle, borderColor: palette.circleBorder },
                            circleStyle,
                        ]}
                    />

                    {TABS.map((tab, index) => (
                        <NavItem
                            key={tab.name}
                            tab={tab}
                            index={index}
                            focused={index === active}
                            pressed={pressed}
                            color={index === active ? palette.iconActive : palette.icon}
                            onPress={() => router.navigate(tab.url)}
                        />
                    ))}
                </BlurView>
            </View>
        </View>
    )
}

type NavItemProps = {
    tab: Tab
    index: number
    focused: boolean
    pressed: SharedValue<number>
    color: string
    onPress: () => void
}

function NavItem({ tab, index, focused, pressed, color, onPress }: NavItemProps) {
    const iconStyle = useAnimatedStyle(() => ({
        transform: [{ scale: withSpring(pressed.get() === index ? PRESSED_SCALE : 1, SPRING_PRESS) }],
    }))

    return (
        <Pressable
            accessibilityRole="tab"
            accessibilityLabel={tab.name}
            accessibilityState={{ selected: focused }}
            hitSlop={4}
            style={styles.item}
            // §1: la respuesta ocurre al tocar, no al soltar.
            onPressIn={() => {
                pressed.set(index)
                if (!focused) {
                    // §13: haptica solo cuando de verdad cambia de seccion.
                    Haptics.selectionAsync().catch(() => { })
                }
            }}
            onPressOut={() => {
                pressed.set(-1)
            }}
            onPress={onPress}
        >
            <Animated.View style={iconStyle}>
                <Ionicons name={focused ? tab.iconActive : tab.icon} size={24} color={color} />
            </Animated.View>
        </Pressable>
    )
}

const styles = StyleSheet.create({
    root: {
        position: "absolute",
        left: 0,
        right: 0,
        alignItems: "center",
    },
    shadow: {
        borderRadius: BAR_HEIGHT / 2,
        // §12: sombra suave para que la capa flote sobre el contenido.
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
        elevation: 12,
    },
    bar: {
        flexDirection: "row",
        padding: PADDING,
        borderRadius: BAR_HEIGHT / 2,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: "hidden",
    },
    sheen: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: BAR_HEIGHT / 2,
    },
    circle: {
        position: "absolute",
        top: PADDING + (ITEM - CIRCLE) / 2,
        left: PADDING + (ITEM - CIRCLE) / 2,
        width: CIRCLE,
        height: CIRCLE,
        borderRadius: CIRCLE / 2,
        borderWidth: StyleSheet.hairlineWidth,
    },
    item: {
        width: ITEM,
        height: ITEM,
        alignItems: "center",
        justifyContent: "center",
    },
})
