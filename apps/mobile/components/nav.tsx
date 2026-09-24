import { ComponentProps } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { Href, usePathname, useRouter } from "expo-router"
import * as Haptics from "expo-haptics"
import Ionicons from "@expo/vector-icons/Ionicons"
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

// Pestañas de app/(tabs). Los grupos entre paréntesis no forman parte de la URL.
export const TABS: Tab[] = [
    { name: "Inicio", url: "/", icon: "home-outline", iconActive: "home" },
    { name: "Comunidades", url: "/comunidades", icon: "people-outline", iconActive: "people" },
    { name: "Mis mascotas", url: "/mascotas", icon: "person-circle-outline", iconActive: "person-circle" },
    { name: "Mi perfil", url: "/perfil", icon: "person-circle-outline", iconActive: "person-circle" },
]

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
        iconActive: "#FFB779",
    },
    light: {
        border: "rgba(22,16,31,0.12)",
        circle: "rgba(22,16,31,0.08)",
        icon: "rgba(22,16,31,0.55)",
        iconActive: "#E8662F",
    },
} as const

export default function Nav() {
    const router = useRouter()
    const pathname = usePathname()
    const insets = useSafeAreaInsets()
    const palette = PALETTE[useColorScheme() === "dark" ? "dark" : "light"]

    const active = Math.max(0, TABS.findIndex((tab) => tab.url === pathname))

    const circleStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: withTiming(active * ITEM, { duration: 200 }) }],
    }))
    

    return (
        <View
            pointerEvents="box-none"
            style={[styles.root, { bottom: Math.max(insets.bottom, 12) + 4 }]}
        >
            <View style={[styles.bar, { borderColor: palette.border }]}>
                <Animated.View
                    pointerEvents="none"
                    style={[styles.circle, { backgroundColor: palette.circle }, circleStyle]}
                />

                {TABS.map((tab, index) => {
                    const focused = index === active
                    return (
                        <Pressable
                            key={tab.name}
                            accessibilityRole="tab"
                            accessibilityLabel={tab.name}
                            accessibilityState={{ selected: focused }}
                            style={styles.item}
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
            </View>
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
        backgroundColor: "rgba(255,255,255,0.16)",
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
