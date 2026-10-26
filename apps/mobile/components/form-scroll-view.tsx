import { Platform, ScrollView, StyleSheet, type ScrollViewProps } from 'react-native';

// iOS ajusta el espacio y desplaza el campo activo; Android usa adjustResize.
// No envolver en otro KeyboardAvoidingView: duplicaría el espacio del teclado.
export function FormScrollView({ style, ...props }: ScrollViewProps) {
  return <ScrollView
    {...props}
    style={[styles.scroll, style]}
    automaticallyAdjustKeyboardInsets
    keyboardShouldPersistTaps="handled"
    keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
  />;
}

const styles = StyleSheet.create({ scroll: { flex: 1 } });
