import { useState, type ReactNode, type Ref } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function useAuthFlowColors() {
  const dark = useColorScheme() === 'dark';
  return {
    background: dark ? '#182213' : '#DBDFD0',
    surface: dark ? '#20311C' : '#FFFFFF',
    text: dark ? '#DBDFD0' : '#111212',
    heading: dark ? '#82A87E' : '#48741C',
    border: dark ? '#82A87E' : '#665524',
    action: dark ? '#82A87E' : '#4C793C',
    actionText: dark ? '#182213' : '#FFFFFF',
    disabled: dark ? '#404F4D' : '#B5AF8B',
    error: dark ? '#F0A59A' : '#8C3F37',
  };
}

export function AuthFlowScreen({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  const colors = useAuthFlowColors();
  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
    <View style={styles.backgroundArt} pointerEvents="none" accessible={false}>
      <View style={[styles.circleTop, { borderColor: colors.heading }]} />
      <View style={[styles.circleBottom, { backgroundColor: colors.heading }]} />
      <View style={[styles.circleSmall, { backgroundColor: colors.border }]} />
    </View>
    <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.headingBlock}>
            <Text style={[styles.brand, { color: colors.heading }]}>Petzy</Text>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.heading }]}>{title}</Text>
            <View style={[styles.headingRule, { backgroundColor: colors.heading }]} accessible={false} />
            <Text style={[styles.description, { color: colors.text }]}>{description}</Text>
          </View>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

export function AuthFlowField({ label, value, onChangeText, secure = false, email = false, passwordAutoComplete = 'new-password', inputRef, returnKeyType = 'done', onSubmitEditing, error }: {
  label: string; value: string; onChangeText: (value: string) => void; secure?: boolean; email?: boolean; passwordAutoComplete?: 'current-password' | 'new-password'; inputRef?: Ref<TextInput>; returnKeyType?: 'next' | 'done'; onSubmitEditing?: () => void; error?: string;
}) {
  const colors = useAuthFlowColors();
  const [revealed, setRevealed] = useState(false);
  const [focused, setFocused] = useState(false);
  return <View style={styles.field}>
    <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: error ? colors.error : focused ? colors.heading : colors.border, borderWidth: focused ? 2 : 1 }]}>
      <TextInput
        ref={inputRef}
        style={[styles.input, { color: colors.text }]}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secure && !revealed}
        autoCapitalize="none"
        autoComplete={email ? 'email' : secure ? passwordAutoComplete : 'off'}
        keyboardType={email ? 'email-address' : 'default'}
        returnKeyType={returnKeyType}
        submitBehavior={returnKeyType === 'next' ? 'submit' : 'blurAndSubmit'}
        onSubmitEditing={onSubmitEditing}
        accessibilityLabel={label}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {secure && <Pressable onPress={() => setRevealed(current => !current)} accessibilityRole="button" accessibilityLabel={revealed ? 'Ocultar contraseña' : 'Mostrar contraseña'} style={styles.reveal}>
        <Text style={[styles.revealText, { color: colors.heading }]}>{revealed ? 'Ocultar' : 'Mostrar'}</Text>
      </Pressable>}
    </View>
    {!!error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
  </View>;
}

export function AuthFlowButton({ label, onPress, loading = false, loadingLabel = 'Enviando…', disabled = false, secondary = false }: {
  label: string; onPress: () => void; loading?: boolean; loadingLabel?: string; disabled?: boolean; secondary?: boolean;
}) {
  const colors = useAuthFlowColors();
  return <Pressable
    style={[styles.button, { backgroundColor: secondary ? 'transparent' : disabled ? colors.disabled : colors.action }]}
    onPress={onPress}
    disabled={disabled || loading}
    accessibilityRole="button"
    accessibilityState={{ disabled: disabled || loading, busy: loading }}
  >
    {loading ? <View style={styles.loadingContent}><ActivityIndicator color={colors.actionText} /><Text style={[styles.buttonText, { color: colors.actionText }]}>{loadingLabel}</Text></View>
      : <Text style={[styles.buttonText, { color: secondary ? colors.heading : disabled ? colors.text : colors.actionText }]}>{label}</Text>}
  </Pressable>;
}

export function AuthFlowMessage({ text, error = false }: { text: string; error?: boolean }) {
  const colors = useAuthFlowColors();
  return <Text style={[styles.message, { color: error ? colors.error : colors.heading }]} accessibilityRole="alert">{text}</Text>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  backgroundArt: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden' },
  circleTop: { position: 'absolute', width: 260, height: 260, borderRadius: 130, borderWidth: 28, top: -94, right: -112, opacity: 0.16 },
  circleBottom: { position: 'absolute', width: 164, height: 164, borderRadius: 82, bottom: -68, left: -72, opacity: 0.14 },
  circleSmall: { position: 'absolute', width: 38, height: 38, borderRadius: 19, right: 26, bottom: 44, opacity: 0.16 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 16 },
  card: { width: '100%', maxWidth: 440, alignSelf: 'center', borderWidth: 1, borderRadius: 20, padding: 24, gap: 16 },
  headingBlock: { gap: 8, marginBottom: 8 },
  brand: { fontFamily: 'Nunito_700Bold', fontSize: 19, lineHeight: 26 },
  title: { fontFamily: 'Nunito_700Bold', fontSize: 34, lineHeight: 41 },
  headingRule: { width: 52, height: 4, borderRadius: 2, marginTop: 2 },
  description: { fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 24 },
  field: { gap: 6 },
  label: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
  inputRow: { minHeight: 52, borderWidth: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  input: { minHeight: 50, flex: 1, paddingHorizontal: 14, fontFamily: 'Nunito_400Regular', fontSize: 16 },
  reveal: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 12 },
  revealText: { fontFamily: 'Nunito_700Bold', fontSize: 14 },
  error: { fontFamily: 'Nunito_600SemiBold', fontSize: 14 },
  button: { minHeight: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  buttonText: { fontFamily: 'Nunito_700Bold', fontSize: 16, textAlign: 'center' },
  loadingContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  message: { fontFamily: 'Nunito_600SemiBold', fontSize: 15, lineHeight: 22 },
});
