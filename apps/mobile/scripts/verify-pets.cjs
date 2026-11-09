// Componentes reales con hooks, archivos y transporte controlados; sin render nativo.
/* global __dirname */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict'), ts = require('typescript');
const tick = async () => { for (let i = 0; i < 4; i++) await new Promise(setImmediate); };
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
class PetApiError extends Error { constructor(message, status) { super(message); this.status = status; } }
const pet = { id: 1, ownerId: 'owner', name: 'Luna', species: 'Perro', breed: 'Mestiza', birth: { year: 2023, month: 5, day: null }, age: 3, isAgeApproximate: true, bio: null, photoUrl: null };
function harness(file, props = {}, exportName = 'default') {
  let position = 0, focused = true, routeId = '1', prevent, tree;
  const slots = [], dependencies = [], effects = [], cleanups = [], routes = [], alerts = [], focuses = [], calls = [];
  const auth = { token: 'token', user: { id: 'owner' } };
  const transport = {
    listPets: async () => ({ items: [], nextCursor: null }), getPet: async () => ({ ...pet }),
    createPet: async (_token, draft) => ({ ...pet, ...draft, id: 7 }), updatePet: async (_token, id, draft) => ({ ...pet, ...draft, id }),
    removePet: async () => ({}), uploadPetPhoto: async () => ({ ...pet }), removePetPhoto: async () => ({ ...pet }),
    picker: async () => ({ canceled: true }),
  };
  const api = { PetApiError, petPhotoSource: () => ({}) };
  for (const key of ['listPets', 'getPet', 'createPet', 'updatePet', 'removePet', 'uploadPetPhoto', 'removePetPhoto']) api[key] = (...args) => { calls.push({ key, args }); return transport[key](...args); };
  const react = {
    useId: () => 'pet-date-accessory',
    useState(initial) { const i = position++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(initial) { const i = position++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
    useCallback(fn, deps) { const i = position++; if (!dependencies[i] || deps.some((d, j) => d !== dependencies[i][j])) { dependencies[i] = deps; slots[i] = fn; } return slots[i]; },
    useEffect(fn, deps) { const i = position++; if (!dependencies[i] || deps.some((d, j) => d !== dependencies[i][j])) { dependencies[i] = deps; effects.push(() => { cleanups[i]?.(); cleanups[i] = fn(); }); } },
  };
  const navigate = action => { if (prevent?.enabled) prevent.fn({ data: { action } }); else routes.push(action); };
  const router = { push: value => navigate({ type: 'push', value }), replace: value => navigate({ type: 'replace', value }), back: () => navigate({ type: 'back' }), canGoBack: () => true };
  const jsx = (type, values, key) => {
    if (typeof type === 'function' && type.name === 'Field') return type(values);
    if (values?.ref) values.ref.current = { focus: () => focuses.push(values.accessibilityLabel), measureInWindow: fn => fn(12, 150, 280, 52) };
    return { type, props: values, key };
  };
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, Date, Error, Promise, queueMicrotask, require(name) {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
    if (name === 'react-native') return { InputAccessoryView: 'InputAccessoryView', Platform: { OS: 'ios' }, ActivityIndicator: 'ActivityIndicator', Pressable: 'Pressable', Text: 'Text', View: 'View', TextInput: 'TextInput', ScrollView: 'ScrollView', FlatList: 'FlatList', Keyboard: { dismiss() {} }, Alert: { alert: (title, message, buttons) => alerts.push({ title, message, buttons }) }, StyleSheet: { create: value => value } };
    if (name === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
    if (name === 'expo-image') return { Image: 'Image' };
    if (name === 'expo-image-picker') return { launchImageLibraryAsync: () => { calls.push({ key: 'picker' }); return transport.picker(); } };
    if (name === 'expo-image-manipulator') return {};
    if (name === 'expo-router/react-navigation') return { usePreventRemove: (enabled, fn) => { prevent = { enabled, fn }; } };
    if (name === 'expo-router') return { useRouter: () => router, useNavigation: () => ({ dispatch: navigate }), useLocalSearchParams: () => ({ id: routeId }), useFocusEffect: fn => react.useEffect(() => focused ? fn() : undefined, [fn, focused]) };
    if (name.includes('Ionicons')) return { __esModule: true, default: 'Icon' };
    if (name.includes('AuthContext')) return { useAuthContext: () => auth };
    if (name.includes('use-color-scheme')) return { useColorScheme: () => 'light' };
    if (name.includes('pets-api')) return api;
    if (name.includes('form-scroll-view')) return { FormScrollView: 'FormScrollView' };
    if (name.includes('anchored-menu')) return { AnchoredMenu: 'AnchoredMenu', AnchoredMenuItem: 'AnchoredMenuItem' };
    if (name.includes('pet-card')) return { PetCard: 'PetCard' };
    if (name.includes('pet-form')) return { PetForm: 'PetForm' };
    if (name.includes('components/nav')) return { NAV_HEIGHT: 92 };
    if (name.includes('photo-upload')) return { localPhotoSize: async () => 100 };
    if (name.includes('navigation')) return { goBackOrReplace: () => router.back() };
    if (name.includes('datetimepicker')) return { __esModule: true, default: 'DateTimePicker' };
    if (name.includes('petzy-theme')) { const theme = { exports: {} }; vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../constants/petzy-theme.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { module: theme, exports: theme.exports }); return theme.exports; }
    if (name.includes('moderation-notices-row')) return { ModerationNoticesRow: 'ModerationNoticesRow' };
    if (name.includes('photo-cache')) return { bumpPhotoVersion() {}, versionedPhotoPath: path => path };
    if (name.includes('animated-pressable')) return { AnimatedPressable: 'Pressable' };
    if (name.includes('components/skeleton')) return new Proxy({}, { get: (_, key) => (key === '__esModule' ? false : String(key)) });
    if (name.includes('floating-add-button')) return { FloatingAddButton: 'FloatingAddButton' };
    if (name === 'expo-blur') return { BlurView: 'BlurView' };
    throw new Error(name);
  } });
  function render() { position = 0; tree = module.exports[exportName](props); for (const fn of effects.splice(0)) fn(); return tree; }
  const children = node => node?.type === 'FlatList' ? [node.props.ListHeaderComponent, node.props.data.length ? node.props.ListFooterComponent : node.props.ListEmptyComponent] : [node?.props?.children];
  const nodes = n => !n || typeof n !== 'object' ? [] : [n, ...children(n).flat(Infinity).flatMap(nodes)];
  const text = n => typeof n === 'string' ? n : !n || typeof n !== 'object' ? '' : children(n).flat(Infinity).map(text).join('');
  const find = (type, label) => nodes(render()).find(n => n.type === type && (!label || n.props.accessibilityLabel === label || text(n) === label));
  return {
    render, routes, alerts, focuses, calls, transport, auth, router,
    async settle() { for (let i = 0; i < 4; i++) { render(); await tick(); } render(); },
    has(value) { return text(render()).includes(value); }, find,
    press(label, twice = false) { const n = find('Pressable', label); assert.ok(n, label); assert.ok(!n.props.disabled, label); n.props.onPress(); if (twice) n.props.onPress(); },
    input(label) { const n = find('TextInput', label); assert.ok(n, label); return n.props; },
    select(label) {
      for (const menu of nodes(render()).filter(n => n.type === 'AnchoredMenu')) {
        const n = nodes(menu).find(n => n.type === 'AnchoredMenuItem' && n.props.label === label);
        if (n) { menu.props.onClose(); n.props.onPress?.(); render(); return; }
      }
      assert.fail(`AnchoredMenuItem no encontrado: ${label}`);
    },
    choose(label) { const n = alerts.at(-1).buttons.find(b => b.text === label); assert.ok(n, label); n.onPress?.(); },
    blur() { focused = false; render(); }, focus() { focused = true; render(); }, id(value) { routeId = value; render(); },
    list() { return find('FlatList').props; }, count(key) { return calls.filter(call => call.key === key).length; },
  };
}
async function listCases() {
  const h = harness('../app/(tabs)/mascotas.tsx'); await h.settle(); assert.ok(h.has('Todavía no hay mascotas'));
  h.transport.listPets = async () => ({ items: [pet], nextCursor: 10 }); h.blur(); h.focus(); await h.settle(); assert.equal(h.list().data.length, 1);
  const page = deferred(); h.transport.listPets = () => page.promise; h.press('Cargar más', true); assert.equal(h.count('listPets'), 3);
  page.resolve({ items: [pet, { ...pet, id: 2 }], nextCursor: null }); await h.settle(); assert.equal(h.list().data.length, 2);
  h.transport.listPets = async () => { throw new Error('API apagada'); }; h.blur(); h.focus(); await h.settle();
  assert.ok(h.has('API apagada')); assert.ok(h.find('Pressable', 'Reintentar'), 'error con mascotas y sin cursor ofrece reintento');
  h.transport.listPets = async () => ({ items: [{ ...pet, id: 3 }], nextCursor: null }); h.press('Reintentar'); await h.settle(); assert.equal(h.list().data[0].id, 3);
  const old = deferred(); h.transport.listPets = () => old.promise; h.blur(); h.focus(); await tick(); h.blur();
  h.transport.listPets = async () => ({ items: [{ ...pet, id: 4 }], nextCursor: null }); h.focus(); await h.settle();
  old.resolve({ items: [pet], nextCursor: null }); await h.settle(); assert.equal(h.list().data[0].id, 4);
}
async function formCases() {
  const h = harness('../components/pet-form.tsx', {}, 'PetForm'); await h.settle(); h.press('Agregar mascota'); assert.ok(h.has('Escribe un nombre'));
  h.input('Nombre').onChangeText('Luna'); h.input('Nombre').onSubmitEditing(); h.select('Otra'); assert.equal(h.focuses.at(-1), '¿Cuál especie?');
  h.input('¿Cuál especie?').onChangeText('Iguana'); h.press('Usar raza Raza desconocida');
  assert.ok(h.find('DateTimePicker'), 'fecha exacta muestra el calendario nativo por defecto');
  h.find('DateTimePicker').props.onChange({}, new Date(2023, 1, 28));
  h.press('Mes y año aproximados'); assert.equal(h.find('DateTimePicker'), undefined, 'mes y año oculta el calendario');
  h.press('Elegir año de nacimiento'); h.select('2023');
  assert.ok(h.find('Pressable', 'Elegir mes de nacimiento').props.accessibilityState.expanded, 'elegir año abre el mes automáticamente');
  h.select('Febrero');
  h.press('Volver'); assert.equal(h.alerts.at(-1).title, '¿Salir sin guardar?'); h.choose('Seguir editando'); assert.equal(h.routes.length, 0);
  const picker = deferred(); h.transport.picker = () => picker.promise; h.press('Agregar foto de la mascota', true); assert.equal(h.count('picker'), 1);
  picker.resolve({ canceled: false, assets: [{ uri: 'photo.jpg', mimeType: 'image/jpeg', fileName: 'photo.jpg', fileSize: 100 }] }); await h.settle();
  h.transport.uploadPetPhoto = async () => { throw new Error('Storage falló'); };
  h.press('Agregar mascota', true); await h.settle(); assert.equal(h.count('createPet'), 1); assert.equal(h.routes.length, 0);
  assert.ok(h.has('La ficha se guardó')); assert.equal(h.input('Nombre').value, 'Luna');
  const approxDraft = h.calls.find(c => c.key === 'createPet').args[1];
  assert.equal(approxDraft.birth.day, null); assert.equal(approxDraft.birth.year, 2023); assert.equal(approxDraft.birth.month, 2);
  h.transport.uploadPetPhoto = async () => pet; h.press('Guardar cambios'); await h.settle(); assert.equal(h.count('createPet'), 1); assert.equal(h.count('updatePet'), 1); assert.equal(h.routes.at(-1).value, '/pets/7');

  const exact = harness('../components/pet-form.tsx', {}, 'PetForm'); await exact.settle();
  exact.input('Nombre').onChangeText('Rex'); exact.input('Nombre').onSubmitEditing(); exact.select('Perro');
  exact.input('Raza').onChangeText('Mestizo');
  exact.find('DateTimePicker').props.onChange({}, new Date(2020, 5, 14));
  exact.press('Agregar mascota'); await exact.settle();
  const exactDraft = exact.calls.find(c => c.key === 'createPet').args[1];
  assert.equal(exactDraft.birth.year, 2020); assert.equal(exactDraft.birth.month, 6); assert.equal(exactDraft.birth.day, 14, 'fecha exacta envía día real elegido en el calendario');
  const edit = harness('../components/pet-form.tsx', { pet: { ...pet, photoUrl: '/photo' } }, 'PetForm'); await edit.settle(); edit.press('Quitar foto'); edit.press('Guardar cambios'); await edit.settle(); assert.equal(edit.count('removePetPhoto'), 1);
  const pending = harness('../components/pet-form.tsx', { pet }, 'PetForm'); await pending.settle(); const saving = deferred(); pending.transport.updatePet = () => saving.promise;
  pending.press('Guardar cambios', true); assert.equal(pending.count('updatePet'), 1); assert.equal(pending.input('Nombre').editable, false);
  pending.blur(); saving.resolve(pet); await pending.settle(); assert.equal(pending.routes.length, 0, 'no navega tras salir');
}
async function detailCases() {
  const h = harness('../app/pets/[id]/index.tsx'); await h.settle(); assert.ok(h.has('Nacimiento aproximado')); assert.ok(h.find('Pressable', 'Retirar ficha'));
  h.press('Retirar ficha'); h.choose('Cancelar'); assert.equal(h.count('removePet'), 0);
  h.press('Retirar ficha'); const removing = deferred(); h.transport.removePet = () => removing.promise; h.choose('Retirar'); h.choose('Retirar'); assert.equal(h.count('removePet'), 1);
  h.blur(); removing.resolve({}); await h.settle(); assert.equal(h.routes.length, 0);
  const failing = harness('../app/pets/[id]/index.tsx'); await failing.settle(); failing.transport.removePet = async () => { throw new Error('API apagada'); };
  failing.press('Retirar ficha'); failing.choose('Retirar'); await failing.settle(); assert.ok(failing.has('Luna')); assert.equal(failing.routes.length, 0); assert.equal(failing.alerts.at(-1).title, 'No se pudo retirar la ficha');
  failing.transport.removePet = async () => ({}); failing.choose('Reintentar'); await failing.settle(); assert.equal(failing.routes.at(-1).type, 'back', 'regresa a la pantalla anterior tras retirar');
  const foreign = harness('../app/pets/[id]/index.tsx'); foreign.transport.getPet = async () => ({ ...pet, ownerId: 'another' }); await foreign.settle(); assert.equal(foreign.find('Pressable', 'Retirar ficha'), undefined);
  const stale = harness('../app/pets/[id]/index.tsx'), old = deferred(); stale.transport.getPet = () => old.promise; stale.render(); await tick();
  stale.transport.getPet = async () => ({ ...pet, id: 2, name: 'Ficha nueva' }); stale.id('2'); await stale.settle(); old.resolve({ ...pet, name: 'Ficha vieja' }); await stale.settle();
  assert.ok(stale.has('Ficha nueva')); assert.equal(stale.has('Ficha vieja'), false);
  const card = harness('../components/pet-card.tsx', { pet: { ...pet, photoUrl: '/photo' }, token: 'token' }, 'PetCard'); await card.settle(); card.find('Image').props.onError(); let stopped = false;
  card.find('Pressable', 'Reintentar foto de Luna').props.onPress({ stopPropagation() { stopped = true; } }); assert.ok(stopped); assert.ok(card.find('Image')); assert.equal(card.routes.length, 0);
  const editor = harness('../app/pets/[id]/edit.tsx'); await editor.settle(); assert.ok(editor.find('PetForm'));
  const before = editor.count('getPet'); editor.auth.token = 'refreshed'; editor.auth.user = { id: 'owner' }; await editor.settle(); assert.equal(editor.count('getPet'), before, 'refresh no recarga ni borra formulario');
}
(async () => { await listCases(); await formCases(); await detailCases(); console.log('OK Mascotas: lista vacía/carga/paginación única/error/reintento/respuesta atrasada; formulario/fechas/Otra/raza/teclado/salida/foto parcial/reintento sin duplicados; detalle/propiedad/confirmación/refresh. Sin render nativo.'); })().catch(error => { console.error(error); process.exitCode = 1; });
