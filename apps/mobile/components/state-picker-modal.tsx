import { FlatList, Keyboard, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useReducedMotion } from 'react-native-reanimated';

import { MEXICO_STATES, type MexicoState } from '@/types/mexicoState';

type Props = {
  visible: boolean;
  value: MexicoState | null;
  colors: { background: string; text: string; heading: string; border: string };
  onClose: () => void;
  onSelect: (state: MexicoState) => void;
};

function stateLabel(state: MexicoState) {
  return state.toLowerCase().split('_').map(part => part[0].toUpperCase() + part.slice(1)).join(' ');
}

export function StatePickerModal({ visible, value, colors, onClose, onSelect }: Props) {
  const reducedMotion = useReducedMotion();
  return <Modal visible={visible} presentationStyle="fullScreen" animationType={reducedMotion ? 'fade' : 'slide'} onShow={Keyboard.dismiss} onRequestClose={onClose}>
    {/* El modal es una ventana nativa distinta: medir sus áreas seguras aquí. */}
    <SafeAreaProvider style={[styles.screen, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={styles.screen}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.heading }]}>Elige tu estado</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Cerrar selección de estado" style={styles.close} onPress={onClose}>
            <Text style={[styles.closeText, { color: colors.heading }]}>Cerrar</Text>
          </Pressable>
        </View>
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          contentInsetAdjustmentBehavior="never"
          data={MEXICO_STATES}
          keyExtractor={item => item}
          extraData={value}
          renderItem={({ item }) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: value === item }} style={[styles.row, { borderColor: colors.border }]} onPress={() => onSelect(item)}>
            <Text style={[styles.label, { color: colors.text }]}>{stateLabel(item)}</Text>
            {value === item ? <Ionicons name="checkmark" size={20} color={colors.heading} /> : null}
          </Pressable>}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  </Modal>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1, fontFamily: 'Nunito_700Bold', fontSize: 22 },
  close: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  closeText: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
  list: { flex: 1 },
  listContent: { paddingBottom: 12 },
  row: { minHeight: 52, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { flex: 1, fontFamily: 'Nunito_400Regular', fontSize: 16 },
});
