// Componente real de Mi perfil: hooks y servicios simulados, sin render nativo.
/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const compiled = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../app/(tabs)/perfil.tsx'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
}).outputText;
const tick = async () => { for (let i = 0; i < 6; i++) await new Promise(setImmediate); };
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
class ProfileApiError extends Error { constructor(message, status, code, communities = []) { super(message); Object.assign(this, { status, code, communities }); } }
function harness() {
  let position = 0, tree, alertButtons, picks = 0, deactivations = 0, uploads = 0;
  const slots = [], dependencies = [], effects = [], cleanups = [], routes = [], alerts = [];
  const profile = { id: 'owner', username: 'Mi nombre', email: 'owner@example.test', bio: 'Mi biografía', locatedAt: 'SONORA', avatarUrl: null };
  let read = async () => ({ ...profile }), save = async (_t, fields) => ({ ...profile, ...fields }), picker = async () => ({ canceled: true }), deactivate = async () => true;
  const react = {
    useState(initial) { const i = position++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(initial) { const i = position++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
    useCallback(fn, deps) { const i = position++; if (!dependencies[i] || deps.some((d, j) => d !== dependencies[i][j])) { dependencies[i] = deps; slots[i] = fn; } return slots[i]; },
    useEffect(fn, deps) { const i = position++; if (!dependencies[i] || deps.some((d, j) => d !== dependencies[i][j])) { dependencies[i] = deps; effects.push(() => { cleanups[i]?.(); cleanups[i] = fn(); }); } },
  };
  const auth = { token: 'token', user: profile, updateLocalProfile() {}, logOut: async () => {}, deactivateAccount: async () => { deactivations++; return deactivate(); } };
  const api = { ProfileApiError, getOwnProfile: (...args) => read(...args), updateOwnProfile: (...args) => save(...args), profilePhotoSource: () => ({}),
    uploadProfilePhoto: async () => { uploads++; throw new Error('Falló la foto'); }, removeProfilePhoto: async () => profile };
  const jsx = (type, props, key) => ({ type, props, key }), module = { exports: {} };
  vm.runInNewContext(compiled, { module, exports: module.exports, Promise, Date, Error, queueMicrotask, require(name) {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
    if (name === 'react-native') return { ActivityIndicator: 'ActivityIndicator', TextInput: 'TextInput', Text: 'Text', View: 'View', Pressable: 'Pressable', Keyboard: { dismiss() {} }, Alert: { alert: (_t, _m, buttons) => { alertButtons = buttons ?? []; alerts.push({ title: _t, message: _m }); } }, StyleSheet: { create: value => value } };
    if (name === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
    if (name === 'expo-image') return { Image: 'Image' };
    if (name === 'expo-image-picker') return { launchImageLibraryAsync: async () => { picks++; return picker(); } };
    if (name === 'expo-image-manipulator') return {};
    if (name === 'expo-router') return { useRouter: () => ({ push: value => routes.push(value) }), useFocusEffect: fn => react.useEffect(fn, [fn]) };
    if (name.includes('Ionicons')) return { __esModule: true, default: 'Ionicons' };
    if (name.includes('AuthContext')) return { useAuthContext: () => auth };
    if (name.includes('use-color-scheme')) return { useColorScheme: () => 'light' };
    if (name.includes('profiles-api')) return api;
    if (name.includes('form-scroll-view')) return { FormScrollView: 'FormScrollView' };
    if (name.includes('state-picker-modal')) return { StatePickerModal: 'StatePickerModal' };
    if (name.includes('components/nav')) return { NAV_HEIGHT: 68 };
    if (name.includes('photo-upload')) return { localPhotoSize: async () => 100 };
    throw new Error(name);
  } });
  function render() { position = 0; tree = module.exports.default(); for (const fn of effects.splice(0)) fn(); return tree; }
  const nodes = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)];
  const text = node => typeof node === 'string' || typeof node === 'number' ? String(node) : !node || typeof node !== 'object' ? '' : [node.props?.children].flat(Infinity).map(text).join('');
  return { render, api, auth, routes, alerts,
    hasInput() { return nodes(render()).some(n => n.type === 'TextInput'); },
    state(value) { const node = nodes(render()).find(n => n.type === 'StatePickerModal'); assert.ok(node.props.visible); node.props.onSelect(value); },
    press(label, twice = false) { const node = nodes(render()).find(n => n.type === 'Pressable' && (text(n) === label || n.props.accessibilityLabel === label)); assert.ok(node, label); assert.ok(!node.props.disabled, `Acción deshabilitada: ${label}`); node.props.onPress(); if (twice) node.props.onPress(); },
    input(label) { const node = nodes(render()).find(n => n.type === 'TextInput' && n.props.accessibilityLabel === label); assert.ok(node, label); return node.props; },
    has(message) { return text(render()).includes(message); },
    choose(button) { const choice = alertButtons.find(b => b.text === button); assert.ok(choice, button); choice.onPress?.(); },
    read(fn) { read = fn; }, save(fn) { save = fn; }, picker(fn) { picker = fn; }, deactivate(fn) { deactivate = fn; },
    unmount() { for (const cleanup of cleanups) cleanup?.(); },
    get picks() { return picks; }, get deactivations() { return deactivations; }, get uploads() { return uploads; },
  };
}
(async () => {
  const h = harness(); h.render(); await tick();
  assert.equal(h.hasInput(), false, 'perfil inicial de lectura');
  assert.ok(h.has('Mi nombre')); assert.ok(h.has('owner@example.test')); assert.ok(h.has('Sonora'));
  assert.equal(h.has('Agregar foto'), false); assert.equal(h.has('Buscar perfiles'), false);
  h.press('Modificar perfil'); assert.equal(h.input('Nombre de usuario').value, 'Mi nombre');
  h.input('Nombre de usuario').onChangeText('Otro nombre'); h.input('Biografía').onChangeText('Descartar');
  h.press('Elegir estado de México'); h.state('JALISCO');
  h.press('Cancelar'); assert.equal(h.hasInput(), false); assert.ok(h.has('Mi nombre')); assert.ok(h.has('Sonora')); assert.equal(h.alerts.length, 0);
  h.press('Modificar perfil'); assert.equal(h.input('Biografía').value, 'Mi biografía');
  h.input('Nombre de usuario').onChangeText('ab'); h.press('Guardar cambios');
  assert.ok(h.has('El nombre debe tener')); assert.equal(h.alerts.length, 0);
  h.input('Nombre de usuario').onChangeText('Nombre ocupado'); h.input('Biografía').onChangeText('Conservar borrador');
  h.save(async () => { throw new ProfileApiError('Nombre ocupado', 409); });
  h.press('Guardar cambios'); await tick(); assert.ok(h.has('Nombre ocupado')); assert.equal(h.input('Biografía').value, 'Conservar borrador'); assert.equal(h.alerts.length, 0);
  const saving = deferred(); let saves = 0; h.save(() => { saves++; return saving.promise; }); h.press('Guardar cambios', true);
  assert.equal(saves, 1); assert.equal(h.input('Nombre de usuario').editable, false); assert.equal(h.input('Biografía').editable, false);
  assert.equal(h.alerts.length, 0, 'no confirma antes de la API');
  saving.resolve({ ...h.auth.user, username: 'Nombre ocupado', bio: 'Conservar borrador' }); await tick();
  assert.equal(h.hasInput(), false); assert.ok(h.has('Conservar borrador'));
  assert.equal(h.alerts.at(-1).title, 'Perfil actualizado'); assert.equal(h.alerts.at(-1).message, 'Tus cambios se guardaron correctamente');
  h.press('Modificar perfil');
  const picking = deferred(); h.picker(() => picking.promise); h.press('Agregar foto', true); assert.equal(h.picks, 1, 'doble toque abre un solo selector');
  picking.resolve({ canceled: false, assets: [{ uri: 'test.jpg', mimeType: 'image/jpeg', fileName: 'test.jpg', fileSize: 100 }] }); await tick();
  assert.equal(h.uploads, 1); assert.ok(h.has('Falló la foto')); assert.equal(h.input('Biografía').value, 'Conservar borrador');
  h.api.uploadProfilePhoto = async () => ({ ...h.auth.user, username: 'Nombre ocupado', bio: 'Conservar borrador', avatarUrl: '/avatar' });
  h.picker(async () => ({ canceled: false, assets: [{ uri: 'test.jpg', mimeType: 'image/jpeg', fileName: 'test.jpg', fileSize: 100 }] }));
  h.input('Biografía').onChangeText('Borrador independiente'); h.press('Agregar foto'); await tick();
  assert.equal(h.input('Biografía').value, 'Borrador independiente'); assert.ok(h.has('Foto actualizada.'));
  h.press('Cancelar'); h.press('Modificar perfil'); assert.ok(h.has('Cambiar foto')); assert.equal(h.input('Biografía').value, 'Conservar borrador');
  h.api.removeProfilePhoto = async () => ({ ...h.auth.user, username: 'Nombre ocupado', bio: 'Conservar borrador' });
  h.press('Quitar foto'); await tick(); h.press('Cancelar'); h.press('Modificar perfil'); assert.ok(h.has('Agregar foto')); h.press('Cancelar');
  h.press('Desactivar cuenta'); assert.ok(h.alerts.at(-1).message.includes('se eliminarán definitivamente')); assert.ok(h.alerts.at(-1).message.includes('Las cuentas desactivadas también cuentan')); assert.equal(h.deactivations, 0); h.choose('Cancelar'); assert.equal(h.deactivations, 0);
  h.deactivate(async () => { throw new ProfileApiError('Primero nombra otra persona administradora.', 409, 'LAST_ACTIVE_COMMUNITY_ADMIN', [{ id: 42, name: 'Mascotas' }]); });
  h.press('Desactivar cuenta'); h.choose('Desactivar cuenta'); await tick(); assert.equal(h.deactivations, 1); assert.ok(h.has('Primero nombra'));
  h.press('Administrar Mascotas'); assert.equal(h.routes[0], '/communities/42');
  const closing = deferred(); h.deactivate(() => closing.promise); h.press('Desactivar cuenta'); h.choose('Desactivar cuenta'); h.choose('Desactivar cuenta');
  assert.equal(h.deactivations, 2, 'no duplica la operación confirmada'); assert.ok(h.has('Desactivando…')); closing.resolve(true); await tick();
  const failedLoad = harness(); failedLoad.read(async () => { throw new Error('API no disponible'); }); failedLoad.render(); await tick(); assert.ok(failedLoad.has('API no disponible'));
  failedLoad.read(async () => failedLoad.auth.user); failedLoad.press('Reintentar'); await tick(); assert.ok(failedLoad.has('Modificar perfil'));
  const stale = harness(), read = deferred(); stale.read(() => read.promise); stale.render(); await tick(); stale.unmount();
  read.resolve({ ...stale.auth.user, username: 'Respuesta atrasada' }); await tick(); assert.equal(stale.has('Respuesta atrasada'), false);
  console.log('OK: Mi perfil D-137: lectura/edición/cancelación, validación/error/reintento, alerta tras éxito, foto inmediata, desactivación y respuesta atrasada. Hooks/transporte simulados; sin render nativo.');
})().catch(error => { console.error(error); process.exitCode = 1; });
