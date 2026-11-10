import { ComponentProps } from "react"
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native"
import { Href, usePathname, useRouter } from "expo-router"
import * as Haptics from "expo-haptics"
import Ionicons from "@expo/vector-icons/Ionicons"
import { BlurView } from "expo-blur"
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { useColorScheme } from "@/hooks/use-color-scheme"

type IconName = ComponentProps<typeof Ionicons>["name"]

type Tab = {
    name: string
    url: Href
    icon: IconName
    iconActive: IconName
}

// Pestañas de app/(tabs) (D-150; D-155 agrega «Adopción» como sexta pestaña). Los grupos entre paréntesis no forman parte de la URL.
export const TABS: Tab[] = [
    { name: "Inicio", url: "/", icon: "home-outline", iconActive: "home" },
    { name: "Buscar", url: "/buscar", icon: "search-outline", iconActive: "search" },
    { name: "Comunidades", url: "/comunidades", icon: "people-outline", iconActive: "people" },
    { name: "Adopción", url: "/adopcion" as Href, icon: "paw-outline", iconActive: "paw" },
    { name: "Mensajes", url: "/mensajes", icon: "chatbubbles-outline", iconActive: "chatbubbles" },
    { name: "Mi perfil", url: "/perfil", icon: "person-circle-outline", iconActive: "person-circle" },
]

// Pantallas de pestaña sin icono propio y la pestaña que las contiene.
const PARENT_TAB: Record<string, string> = { "/mascotas": "/perfil" }

const ITEM = 64
const CIRCLE = 65
const PADDING = 6
const BAR_HEIGHT = ITEM + PADDING * 2

// Espacio que ocupa la barra flotante; las pantallas lo usan como paddingBottom
// para que el ultimo contenido no quede debajo.
export const NAV_HEIGHT = BAR_HEIGHT + 16

const PALETTE = {
    dark: {
        border: "rgba(255,255,255,0.16)",
        circle: "rgba(255,255,255,0.14)",
        icon: "rgba(255,255,255,0.62)",
        // Beige de la foto de perfil vacía (D-151).
        iconActive: "#DED0A5",
        // Tinte de marca sobre el desenfoque (claro/oscuro de Petzy), no un
        // blanco/negro genérico: mantiene la identidad y da suficiente
        // contraste cuando hay mucho texto detrás, sin perder el vidrio.
        tint: "rgba(24,34,19,0.55)",
        blurTint: "dark" as const,
    },
    light: {
        border: "rgba(22,16,31,0.12)",
        circle: "rgba(22,16,31,0.08)",
        icon: "rgba(22,16,31,0.55)",
        iconActive: "#DED0A5",
        tint: "rgba(248,247,240,0.6)",
        blurTint: "light" as const,
    },
} as const

export default function Nav() {
    const router = useRouter()
    const pathname = usePathname()
    const insets = useSafeAreaInsets()
    const itemWidth = Math.min(ITEM, (useWindowDimensions().width - 32 - PADDING * 2) / TABS.length)
    const palette = PALETTE[useColorScheme() === "dark" ? "dark" : "light"]

    const current = PARENT_TAB[pathname] ?? pathname
    const active = Math.max(0, TABS.findIndex((tab) => tab.url === current))

    const circleStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: withTiming(active * itemWidth, { duration: 200 }) }],
    }))
    

    return (
        <View
            pointerEvents="box-none"
            style={[styles.root, { bottom: Math.max(insets.bottom, 12) + 4 }]}
        >
            <BlurView intensity={50} tint={palette.blurTint} style={[styles.bar, { borderColor: palette.border }]}>
                <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: palette.tint, borderRadius: BAR_HEIGHT / 2 }]} />
                <Animated.View
                    pointerEvents="none"
                    style={[styles.circle, { backgroundColor: palette.circle, width: itemWidth, left: PADDING }, circleStyle]}
                />

                {TABS.map((tab, index) => {
                    const focused = index === active
                    return (
                        <Pressable
                            key={tab.name}
                            accessibilityRole="tab"
                            accessibilityLabel={tab.name}
                            accessibilityState={{ selected: focused }}
                            style={[styles.item, { width: itemWidth }]}
                            onPressIn={() => {
                                // Vibracion solo cuando de verdad cambia de seccion.
                                if (!focused) Haptics.selectionAsync().catch(() => { })
                            }}
                            onPress={() => router.navigate(tab.url)}
                        >
                            <Ionicons
                                name={focused ? tab.iconActive : tab.icon}
                                size={24}
                                color={focused ? palette.iconActive : palette.icon}
                            />
                        </Pressable>
                    )
                })}
            </BlurView>
        </View>
    )
}

const styles = StyleSheet.create({
    root: {
        position: "absolute",
        left: 0,
        right: 0,
        alignItems: "center",
    },
    bar: {
        flexDirection: "row",
        padding: PADDING,
        borderRadius: BAR_HEIGHT / 2,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: "hidden",
    },
    circle: {
        position: "absolute",
        top: PADDING + (ITEM - CIRCLE) / 2,
        left: PADDING + (ITEM - CIRCLE) / 2,
        width: CIRCLE,
        height: CIRCLE,
        borderRadius: CIRCLE / 2,
    },
    item: {
        width: ITEM,
        height: ITEM,
        alignItems: "center",
        justifyContent: "center",
    },
})
