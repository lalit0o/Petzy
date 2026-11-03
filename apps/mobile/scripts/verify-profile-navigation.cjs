// Componentes reales con transporte y navegación controlados; sin render nativo.
/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const jsx = (type, props) => ({ type, props });
function load(file, mocks) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, queueMicrotask, require(name) {
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name in mocks) return mocks[name];
    throw new Error(name);
  } });
  return module.exports;
}
const nodes = n => !n || typeof n !== 'object' ? [] : [n, ...[n.props?.children, n.props?.ListHeaderComponent].flat(Infinity).flatMap(nodes)];
const native = { Pressable: 'Pressable', View: 'View', Text: 'Text', TextInput: 'TextInput', FlatList: 'FlatList', ActivityIndicator: 'ActivityIndicator', Platform: { OS: 'ios' }, Keyboard: { dismiss() {} }, StyleSheet: { create: s => s } };
const icon = { __esModule: true, default: 'Icon' };
const tick = async () => { for (let i = 0; i < 4; i++) await new Promise(setImmediate); };
(async () => {
  let pathname = '/buscar', width = 320;
  const routes = [];
  const nav = load('../components/nav.tsx', {
    react: {}, 'react-native': { ...native, useWindowDimensions: () => ({ width }) },
    'expo-router': { usePathname: () => pathname, useRouter: () => ({ navigate: route => routes.push(route) }) },
    'expo-haptics': { selectionAsync: async () => {} }, '@expo/vector-icons/Ionicons': icon,
    'react-native-reanimated': { __esModule: true, default: { View: 'AnimatedView' }, useAnimatedStyle: fn => fn(), withTiming: value => value },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 0 }) },
    '@/hooks/use-color-scheme': { useColorScheme: () => 'light' },
  });
  for (const size of [320, 375, 768]) {
    width = size;
    const tabs = nodes(nav.default()).filter(n => n.props?.accessibilityRole === 'tab');
    assert.equal(tabs.length, 5); assert.equal(tabs.find(t => t.props.accessibilityState.selected).props.accessibilityLabel, 'Buscar');
    assert.ok(tabs.reduce((sum, t) => sum + t.props.style[1].width, 12) <= size - 32);
    tabs.find(t => t.props.accessibilityLabel === 'Mi perfil').props.onPress(); assert.equal(routes.at(-1), '/perfil');
  }
  pathname = '/perfil'; assert.equal(nodes(nav.default()).find(n => n.props?.accessibilityState?.selected).props.accessibilityLabel, 'Mi perfil');
  let position = 0; const slots = [];
  let response = async () => ({ items: [{ id: 'person', username: 'Persona', locatedAt: 'SONORA' }], nextCursor: 'next' });
  const search = load('../components/search-profiles-screen.tsx', {
    react: { useState(initial) { const i = position++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; }, useRef(initial) { const i = position++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; }, useCallback: fn => fn },
    'react-native': native, 'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'expo-image': { Image: 'Image' }, '@expo/vector-icons/Ionicons': icon,
    'expo-router': { useFocusEffect() {}, useRouter: () => ({ push: route => routes.push(route) }) },
    '@/context/AuthContext': { useAuthContext: () => ({ token: 'token' }) },
    '@/hooks/use-color-scheme': { useColorScheme: () => 'light' }, '@/lib/navigation': { goBackOrReplace() {} },
    '@/lib/profiles-api': { searchProfiles: (...args) => response(...args), profilePhotoSource() {} }, '@/components/nav': { NAV_HEIGHT: 92 },
  });
  const render = (inTab = true) => { position = 0; return search.default({ inTab }); };
  const find = label => nodes(render()).find(n => n.props?.accessibilityLabel === label);
  assert.equal(find('Volver'), undefined); assert.ok(nodes(render(false)).some(n => n.props?.accessibilityLabel === 'Volver'));
  const list = () => nodes(render()).find(n => n.type === 'FlatList');
  assert.equal(list().props.contentContainerStyle[1].paddingBottom, 120);
  find('Nombre de usuario para buscar').props.onChangeText('Pe');
  response = async () => { throw new Error('API no disponible'); };
  find('Buscar').props.onPress(); await tick(); assert.equal(list().props.data.length, 0);
  assert.equal(find('Nombre de usuario para buscar').props.value, 'Pe');
  response = async () => ({ items: [{ id: 'person', username: 'Persona', locatedAt: 'SONORA' }], nextCursor: 'next' });
  find('Buscar').props.onPress(); await tick(); assert.equal(list().props.data.length, 1);
  list().props.renderItem({ item: list().props.data[0] }).props.onPress(); assert.equal(routes.at(-1), '/profiles/person');
  response = async (_token, query, cursor) => { assert.equal(query, 'Pe'); assert.equal(cursor, 'next'); return { items: [{ id: 'person' }, { id: 'second' }], nextCursor: null }; };
  list().props.ListFooterComponent.props.onPress(); await tick(); assert.equal(list().props.data.length, 2);
  find('Borrar búsqueda').props.onPress();
  assert.equal(find('Nombre de usuario para buscar').props.value, ''); assert.equal(list().props.data.length, 0);
  assert.equal(list().props.ListFooterComponent, undefined); assert.equal(find('Borrar búsqueda'), undefined);
  find('Nombre de usuario para buscar').props.onChangeText('Pendiente');
  let resolveSearch;
  response = () => new Promise(resolve => { resolveSearch = resolve; });
  find('Buscar').props.onPress(); find('Borrar búsqueda').props.onPress();
  resolveSearch({ items: [{ id: 'stale' }], nextCursor: 'stale' }); await tick();
  assert.equal(find('Nombre de usuario para buscar').props.value, ''); assert.equal(list().props.data.length, 0);
  assert.equal(list().props.ListFooterComponent, undefined, 'borrar invalida la búsqueda pendiente');
  console.log('OK: Buscar independiente, selección de pestaña, barra en 320/375/768, búsqueda y paginación sin duplicados, error/reintento y apertura de perfil; borrar texto/resultados y descartar respuesta pendiente. Servicios simulados; sin render nativo.');
})().catch(error => { console.error(error); process.exitCode = 1; });
