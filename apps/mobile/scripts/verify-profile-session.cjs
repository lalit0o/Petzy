// Lógica real de useAuth con hooks, SecureStore y transporte controlados.
// No equivale a render nativo, token real de Supabase ni prueba en iPhone.
/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const compiled = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../hooks/useAuth.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const tick = async () => { for (let i = 0; i < 6; i++) await new Promise(setImmediate); };
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const response = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
const session = (id = 'owner', inactive = false) => ({ access_token: `access-${id}`, refresh_token: `refresh-${id}`, profileStatus: inactive ? 'inactive' : 'complete', user: { id, isActive: !inactive, username: id } });

function harness() {
  let position = 0; const slots = [], effects = [], dependencies = [], storage = new Map(), writes = [], requests = [];
  let fetchHandler = async () => response(session()); let deactivateHandler = async () => ({ isActive: false });
  const react = {
    useState(initial) { const i = position++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(initial) { const i = position++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
    useCallback(fn, deps) { const i = position++; if (!dependencies[i] || deps.some((d, j) => d !== dependencies[i][j])) { dependencies[i] = deps; slots[i] = fn; } return slots[i]; },
    useEffect(fn, deps) { const i = position++; if (!dependencies[i] || deps.some((d, j) => d !== dependencies[i][j])) { dependencies[i] = deps; effects.push(fn); } },
  };
  const module = { exports: {} };
  vm.runInNewContext(compiled, { module, exports: module.exports, Promise, Date, AbortController, setTimeout, clearTimeout, queueMicrotask,
    process: { env: { EXPO_PUBLIC_API_URL: 'http://test.invalid' } },
    fetch: async (url, init) => { requests.push({ url, ...init }); return fetchHandler(url, init); },
    require(name) {
      if (name === 'react') return react;
      if (name === 'react-native') return { AppState: { addEventListener: () => ({ remove() {} }) } };
      if (name === 'expo-secure-store') return {
        getItemAsync: async key => storage.get(key),
        setItemAsync: async (key, value) => { writes.push({ key, value }); storage.set(key, value); },
        deleteItemAsync: async key => { storage.delete(key); },
      };
      if (name.includes('profiles-api')) return { deactivateOwnProfile: token => deactivateHandler(token) };
      throw new Error(name);
    },
  });
  return {
    render() { position = 0; return module.exports.useAuth(); },
    async start() { this.render(); for (const fn of effects.splice(0)) fn(); await tick(); },
    fetch(fn) { fetchHandler = fn; }, deactivate(fn) { deactivateHandler = fn; }, storage, writes, requests,
  };
}

(async () => {
  const h = harness(); await h.start(); assert.equal(h.render().status, 'signedOut');
  h.fetch(async () => response(session('owner', true)));
  assert.equal(await h.render().logIn('owner@example.test', 'secret-password'), 'success');
  assert.equal(h.render().status, 'inactive'); assert.equal(h.render().canReactivate, true);
  assert.ok(h.writes.every(item => !item.value.includes('secret-password') && !item.value.includes('@')));
  h.fetch(async () => { throw new Error('offline'); });
  assert.equal(await h.render().confirmReactivation(), false); assert.equal(h.render().canReactivate, true, 'la falla transitoria permite reintentar');
  h.fetch(async () => response({ message: 'Credenciales incorrectas' }, 401));
  assert.equal(await h.render().confirmReactivation(), false); assert.equal(h.render().canReactivate, false);
  h.fetch(async () => response(session('owner', true))); await h.render().logIn('owner@example.test', 'secret-password');
  h.fetch(async () => response(session())); assert.equal(await h.render().confirmReactivation(), true); assert.equal(h.render().status, 'ready'); assert.equal(h.render().canReactivate, false);

  const refresh = deferred(); h.fetch(() => refresh.promise);
  const checking = h.render().checkSession(); await tick(); assert.equal(h.render().status, 'ready', 'renovar no desmonta el formulario');
  h.deactivate(async () => { throw new Error('Primero nombra otro administrador'); });
  await assert.rejects(h.render().deactivateAccount(), /administrador/); assert.equal(h.render().status, 'ready'); assert.ok(h.storage.get('token'));
  const deactivate = deferred(); h.deactivate(() => deactivate.promise);
  const deactivating = h.render().deactivateAccount(); await tick(); assert.equal(h.render().status, 'ready', 'no salir antes de la confirmación del servidor');
  deactivate.resolve({ isActive: false }); assert.equal(await deactivating, true); assert.equal(h.render().status, 'signedOut');
  refresh.resolve(response(session())); await checking; assert.equal(h.render().status, 'signedOut'); assert.equal(h.storage.size, 0, 'un refresh tardío no resucita la sesión');

  h.fetch(async () => response(session())); await h.render().logIn('owner@example.test', 'secret-password');
  const old = deferred(); h.deactivate(() => old.promise); const oldRequest = h.render().deactivateAccount();
  h.fetch(async () => response(session('another'))); await h.render().logIn('another@example.test', 'another-password');
  old.resolve({ isActive: false }); assert.equal(await oldRequest, false); assert.equal(h.render().user.id, 'another'); assert.equal(h.storage.get('token'), 'access-another');

  const r = harness(); await r.start(); r.fetch(async () => response(session('owner', true))); await r.render().logIn('owner@example.test', 'secret-password');
  const activation = deferred(), lateRefresh = deferred();
  r.fetch(url => url.endsWith('/auth/reactivate') ? activation.promise : lateRefresh.promise);
  const activating = r.render().confirmReactivation(); const stale = r.render().checkSession(); await tick();
  activation.resolve(response(session())); assert.equal(await activating, true);
  lateRefresh.resolve(response(session('owner', true))); await stale;
  assert.equal(r.render().status, 'ready'); assert.equal(r.storage.get('token'), 'access-owner');
  await r.render().logOut(); assert.equal(r.render().canReactivate, false); assert.equal(r.storage.size, 0);
  console.log('OK: sesión real: reactivación, credenciales solo en memoria, fallo/reintento, confirmación de desactivación, bloqueo comunitario, refresh atrasado y cambio de cuenta. Hooks/transporte simulados; sin render nativo.');
})().catch(error => { console.error(error); process.exitCode = 1; });
