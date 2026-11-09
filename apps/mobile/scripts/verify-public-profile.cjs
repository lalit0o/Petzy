// Pantalla real, servicios y hooks controlados. No renderiza controles nativos.
/* global __dirname */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict'), ts = require('typescript');
const compiled = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../app/profiles/[id].tsx'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
const tick = async () => { for (let i = 0; i < 4; i++) await new Promise(setImmediate); };
const nodes = n => !n || typeof n !== 'object' ? [] : [n, ...[n.props?.children].flat(Infinity).flatMap(nodes)];
const text = n => typeof n === 'string' ? n : !n || typeof n !== 'object' ? '' : [n.props?.children].flat(Infinity).map(text).join('');
function harness() {
  let position = 0, id = 'ana', tree;
  const slots = [], dependencies = [], effects = [], cleanup = [], routes = [];
  let read = async (_token, key) => ({ id: key, username: key, locatedAt: 'SONORA', bio: 'Con mascotas', avatarUrl: '/avatar', email: 'privado@example.test' });
  let pets = async () => ({ items: [], nextCursor: null });
  const react = {
    useState(initial) { const i = position++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(initial) { const i = position++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
    useCallback(fn, deps) { const i = position++; if (!dependencies[i] || deps.some((d, j) => d !== dependencies[i][j])) { dependencies[i] = deps; slots[i] = fn; } return slots[i]; },
  };
  const jsx = (type, props) => ({ type, props }), module = { exports: {} };
  vm.runInNewContext(compiled, { module, exports: module.exports, queueMicrotask, Error, require(name) {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
    if (name === 'react-native') return { ActivityIndicator: 'ActivityIndicator', Pressable: 'Pressable', Text: 'Text', View: 'View', ScrollView: 'ScrollView', StyleSheet: { create: v => v } };
    if (name === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
    if (name === 'expo-image') return { Image: 'Image' };
    if (name.includes('Ionicons')) return { __esModule: true, default: 'Icon' };
    if (name === 'expo-router') return { useLocalSearchParams: () => ({ id }), useRouter: () => ({}), useFocusEffect(fn) { const i = position++; if (slots[i] !== fn) { slots[i] = fn; effects.push(() => { cleanup[i]?.(); cleanup[i] = fn(); }); } } };
    if (name.includes('AuthContext')) return { useAuthContext: () => ({ token: 'token' }) };
    if (name.includes('use-color-scheme')) return { useColorScheme: () => 'light' };
    if (name.includes('profiles-api')) return { getPublicProfile: (...args) => read(...args), profilePhotoSource: () => ({}) };
    if (name.includes('pets-api')) return { listPets: (...args) => pets(...args) };
    if (name.includes('pet-card')) return { PetCard: 'PetCard' };
    if (name.includes('navigation')) return { goBackOrReplace: (_router, fallback) => routes.push(fallback) };
    if (name.includes('petzy-theme')) { const theme = { exports: {} }; vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../constants/petzy-theme.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { module: theme, exports: theme.exports }); return theme.exports; }
    if (name.includes('moderation-notices-row')) return { ModerationNoticesRow: 'ModerationNoticesRow' };
    if (name.includes('components/skeleton')) return new Proxy({}, { get: (_, key) => (key === '__esModule' ? false : String(key)) });
    if (name.includes('floating-add-button')) return { FloatingAddButton: 'FloatingAddButton' };
    if (name === 'expo-blur') return { BlurView: 'BlurView' };
    throw new Error(name);
  } });
  function render() { position = 0; tree = module.exports.default(); for (const fn of effects.splice(0)) fn(); return tree; }
  return {
    render, routes, read(fn) { read = fn; }, pets(fn) { pets = fn; }, id(value) { id = value; render(); },
    async settle() { for (let i = 0; i < 4; i++) { render(); await tick(); } render(); },
    has(value) { return text(render()).includes(value); },
    press(value) { const node = nodes(render()).find(n => n.type === 'Pressable' && text(n) === value); assert.ok(node, value); node.props.onPress(); },
    image() { return nodes(render()).find(n => n.type === 'Image'); }, cards() { return nodes(render()).filter(n => n.type === 'PetCard'); },
  };
}
(async () => {
  const h = harness(); assert.ok(nodes(h.render()).some(n => n.type === 'PublicProfileSkeleton')); await h.settle();
  assert.ok(h.has('ana')); assert.ok(h.has('Con mascotas')); assert.equal(h.has('privado@example.test'), false); assert.ok(h.has('Todavía no tiene mascotas'));
  h.image().props.onError(); assert.equal(h.image(), undefined); h.press('No se pudo mostrar la foto. Reintentar.'); assert.ok(h.image());
  h.press('Volver'); assert.equal(h.routes.at(-1), '/buscar');
  h.pets(async () => { throw new Error('API de mascotas no disponible'); }); h.id('luis'); await h.settle();
  assert.ok(h.has('luis')); assert.ok(h.has('API de mascotas no disponible'));
  h.pets(async (_token, key, cursor) => { assert.equal(key, 'luis'); return cursor ? { items: [{ id: 1 }, { id: 2 }], nextCursor: null } : { items: [{ id: 1 }], nextCursor: 10 }; });
  h.press('Reintentar'); await h.settle(); assert.equal(h.cards().length, 1);
  h.press('Cargar más mascotas'); await h.settle(); assert.equal(h.cards().length, 2);
  h.pets(async () => ({ items: [], nextCursor: null }));
  h.read(async () => { throw new Error('Este perfil no está disponible.'); }); h.id('missing'); await h.settle();
  assert.ok(h.has('Este perfil no está disponible.')); assert.equal(h.cards().length, 0); assert.equal(h.has('luis'), false); h.press('Volver');
  h.read(async (_token, key) => ({ id: key, username: 'Recuperado', locatedAt: 'SONORA', bio: null, avatarUrl: null }));
  h.press('Reintentar'); await h.settle(); assert.ok(h.has('Recuperado')); assert.equal(h.image(), undefined);
  let resolveOld; h.read(() => new Promise(resolve => { resolveOld = resolve; })); h.id('old'); await tick();
  h.read(async (_token, key) => ({ id: key, username: 'Nuevo perfil', locatedAt: 'SONORA' })); h.id('new'); await h.settle();
  resolveOld({ id: 'old', username: 'Respuesta atrasada', locatedAt: 'SONORA' }); await h.settle();
  assert.ok(h.has('Nuevo perfil')); assert.equal(h.has('Respuesta atrasada'), false);
  console.log('OK: perfil público real: carga, sin mascotas/foto/biografía, privacidad, foto fallida y reintento, mascotas fallidas/paginación sin duplicados, perfil inaccesible/reintento/regreso y respuesta atrasada. Sin render nativo.');
})().catch(error => { console.error(error); process.exitCode = 1; });
