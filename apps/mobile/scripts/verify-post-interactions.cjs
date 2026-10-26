// Ejecuta la lógica real del componente con hooks y transporte controlados.
// No sustituye la interacción nativa en un iPhone.
/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const source = fs.readFileSync(path.resolve(__dirname, '../components/post-interactions.tsx'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
const tick = async () => { for (let i = 0; i < 6; i++) await new Promise(setImmediate); };
const deferred = () => { let resolve; const promise = new Promise(r => resolve = r); return { promise, resolve }; };
const comment = (id, userId = 'other', body = `Comentario ${id}`) => ({ id, userId, postId: 9, body, createdAt: '2026-10-25', editedAt: null, user: { id: userId, username: userId, avatarUrl: null } });

function harness({ communityId = null, postUser = 'owner', communityRole = null } = {}) {
  let position = 0, tree, effects = [], data = [], hidden = [], nextId = 1;
  const slots = [], effectDeps = [];
  const post = { id: 9, userId: postUser, communityId, likeCount: 0, likedByMe: false };
  let readOverride, createGate, createFails = false, pageError, initialGate;
  let creates = 0, unavailable = 0, reads = [];
  class InteractionApiError extends Error { constructor(message, status) { super(message); this.status = status; } }
  const api = {
    InteractionApiError,
    listComments: async (_token, _post, cursor) => {
      reads.push(cursor);
      if (initialGate) { const gate = initialGate; initialGate = undefined; return gate.promise; }
      if (cursor && pageError) { const status = pageError; pageError = undefined; throw new InteractionApiError('Cursor o publicación no disponible', status); }
      return readOverride ? readOverride(cursor) : { items: [...data], total: data.length, nextCursor: null };
    },
    createComment: async (_token, _post, body) => {
      creates++;
      if (createGate) await createGate.promise;
      if (createFails) throw new Error('API caída');
      const item = comment(nextId++, 'owner', body); data.unshift(item); return item;
    },
    editComment: async (_t, _p, id, body) => { const item = data.find(c => c.id === id); Object.assign(item, { body, editedAt: '2026-10-25' }); return item; },
    removeOwnComment: async (_t, _p, id) => { data = data.filter(c => c.id !== id); },
    hideGeneralComment: async (_t, _p, id) => { const item = data.find(c => c.id === id); data = data.filter(c => c.id !== id); hidden.unshift({ id: id + 100, comment: item }); },
    listGeneralHidden: async () => ({ items: [...hidden], nextCursor: null }),
    restoreGeneralComment: async (_t, _p, id) => { data.unshift(hidden.find(c => c.comment.id === id).comment); hidden = hidden.filter(c => c.comment.id !== id); },
    setLike: async (_t, _p, liked) => ({ likedByMe: liked, likeCount: liked ? 1 : 0 }),
  };
  const react = {
    useState(initial) { const i = position++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(initial) { const i = position++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
    useEffect(fn, deps) { const i = position++; if (!effectDeps[i] || deps.some((d, j) => d !== effectDeps[i][j])) { effectDeps[i] = deps; effects.push(fn); } },
  };
  api.hideCommunityComment = async (_token, _community, postId, commentId) => api.hideGeneralComment(_token, postId, commentId);
  const jsx = (type, props, key) => ({ type, props, key });
  const module = { exports: {} };
  vm.runInNewContext(compiled, { module, exports: module.exports, queueMicrotask, Date, Promise, require(name) {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
    if (name === 'react-native') return { Text: 'Text', TextInput: 'TextInput', Pressable: 'Pressable', View: 'View', ActivityIndicator: 'ActivityIndicator', StyleSheet: { create: value => value } };
    if (name === 'expo-image') return { Image: 'Image' };
    if (name.includes('Ionicons')) return { __esModule: true, default: 'Ionicons' };
    if (name.includes('AuthContext')) return { useAuthContext: () => ({ token: 'test', user: { id: 'owner' } }) };
    if (name.includes('use-color-scheme')) return { useColorScheme: () => 'light' };
    if (name.includes('profiles-api')) return { profilePhotoSource: () => ({}) };
    if (name.includes('interactions-api')) return api;
    throw new Error(name);
  } });
  const unavailableHandler = () => unavailable++;
  function render() { position = 0; tree = module.exports.PostInteractions({ post, communityRole, onPostUnavailable: unavailableHandler }); for (const fn of effects.splice(0)) fn(); return tree; }
  const nodes = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children, node.props?.content].flat(Infinity).flatMap(nodes)];
  const text = node => typeof node === 'string' || typeof node === 'number' ? String(node) : !node || typeof node !== 'object' ? '' : [node.props?.children].flat(Infinity).map(text).join('');
  const input = label => { const result = nodes(render()).find(n => n.type === 'TextInput' && n.props.accessibilityLabel === label); assert.ok(result, label); return result; };
  const press = (label, twice = false) => { const result = nodes(render()).find(n => n.type === 'Pressable' && text(n) === label); assert.ok(result, `Botón ${label}`); result.props.onPress(); if (twice) result.props.onPress(); };
  const title = () => nodes(render()).filter(n => n.type === 'Text').map(text).find(t => t.startsWith('Comentarios'));
  const hasButton = label => nodes(render()).some(n => n.type === 'Pressable' && text(n) === label);
  return { render, press, input, title, hasButton, api,
    seed(items) { data = items; nextId = Math.max(0, ...items.map(c => c.id)) + 1; },
    initial(gate) { initialGate = gate; }, createWait(gate) { createGate = gate; }, failCreate() { createFails = true; },
    page(status) { readOverride = () => ({ items: [...data], total: data.length + 20, nextCursor: 20 }); pageError = status; },
    get creates() { return creates; }, get unavailable() { return unavailable; }, get reads() { return reads; }, get data() { return data; },
  };
}

(async () => {
  const h = harness(), initial = deferred(); h.initial(initial); h.render(); await tick();
  h.input('Escribir comentario').props.onChangeText('Nuevo'); h.press('Comentar', true); await tick();
  assert.equal(h.creates, 1); assert.equal(h.title(), 'Comentarios (1)');
  initial.resolve({ items: [], total: 0, nextCursor: null }); await tick();
  assert.equal(h.title(), 'Comentarios (1)', 'una respuesta vieja no borra el comentario ni su conteo');
  h.press('Editar'); h.input('Editar comentario').props.onChangeText('Corregido'); h.press('Guardar'); await tick(); assert.equal(h.data[0].body, 'Corregido');
  h.press('Me gusta · 0'); await tick(); h.press('Te gusta · 1'); await tick();
  h.press('Retirar'); await tick(); assert.equal(h.title(), 'Comentarios (0)');
  const other = harness(); other.seed([comment(50)]); other.render(); await tick();
  other.press('Ocultar'); await tick(); assert.equal(other.title(), 'Comentarios (0)');
  other.press('Comentarios ocultados'); await tick(); other.press('Restaurar'); await tick(); assert.equal(other.title(), 'Comentarios (1)');
  const failed = harness(); failed.failCreate(); failed.render(); await tick(); failed.input('Escribir comentario').props.onChangeText('Conservar'); failed.press('Comentar'); await tick(); assert.equal(failed.input('Escribir comentario').props.value, 'Conservar');
  const writing = harness(), gate = deferred(); writing.createWait(gate); writing.render(); await tick(); writing.input('Escribir comentario').props.onChangeText('Primero'); writing.press('Comentar'); writing.input('Escribir comentario').props.onChangeText('Siguiente borrador'); gate.resolve(); await tick(); assert.equal(writing.input('Escribir comentario').props.value, 'Siguiente borrador');
  const pagination = harness(); pagination.seed([comment(20)]); pagination.page(400); pagination.render(); await tick(); pagination.press('Cargar más comentarios'); await tick(); assert.deepEqual(pagination.reads, [undefined, 20, undefined]);
  const inaccessible = harness(); inaccessible.seed([comment(20)]); inaccessible.page(404); inaccessible.render(); await tick(); inaccessible.press('Cargar más comentarios'); await tick(); assert.equal(inaccessible.unavailable, 1);
  for (const role of ['MEMBER', 'MODERATOR', 'ADMIN']) {
    const permissions = harness({ communityId: 7, postUser: 'someone-else', communityRole: role }); permissions.seed([comment(8)]); permissions.render(); await tick();
    assert.equal(permissions.hasButton('Ocultar'), role !== 'MEMBER', `permiso visual de ${role}`);
    assert.equal(permissions.hasButton('Comentarios ocultados'), false, 'la restauración comunitaria pertenece a la administración');
    if (role !== 'MEMBER') { permissions.press('Ocultar'); await tick(); assert.equal(permissions.title(), 'Comentarios (0)'); }
  }
  const author = harness({ communityId: 7, communityRole: 'MEMBER' }); author.seed([comment(8)]); author.render(); await tick(); assert.equal(author.hasButton('Ocultar'), true, 'el autor conserva permiso en su post comunitario');
  console.log('OK: componente real: crear, doble toque, respuesta atrasada, editar, likes, retirar, ocultar/restaurar, conservar borradores, cursor caducado y pérdida de acceso. Hooks/transporte simulados; sin render nativo.');
})().catch(error => { console.error(error); process.exitCode = 1; });
