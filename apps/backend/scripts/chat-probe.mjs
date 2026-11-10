// Segunda cuenta de prueba para Chat desde la computadora (solo desarrollo).
// Permite probar con un solo teléfono: «En línea», mensajes en vivo, el aviso
// de mensaje nuevo, «Leído», bloqueo desde el otro lado y varias páginas.
//
// Uso (en tu propia terminal, con el backend encendido):
//   cd apps/backend
//   node scripts/chat-probe.mjs
//
// Pide correo y contraseña de la cuenta B en la terminal; no los guarda ni los
// muestra. La dirección de la API se toma de apps/mobile/.env
// (EXPO_PUBLIC_API_URL) o del primer argumento: node scripts/chat-probe.mjs http://localhost:3000
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline';
import { io } from 'socket.io-client';

function apiUrl() {
  if (process.argv[2]) return process.argv[2].replace(/\/$/, '');
  try {
    const env = readFileSync(new URL('../../mobile/.env', import.meta.url), 'utf8');
    const line = env.split(/\r?\n/).find(l => l.startsWith('EXPO_PUBLIC_API_URL='));
    if (line) return line.slice('EXPO_PUBLIC_API_URL='.length).trim().replace(/^["']|["']$/g, '').replace(/\/$/, '');
  } catch { /* sin archivo: se pide como argumento */ }
  console.error('No encontré EXPO_PUBLIC_API_URL. Pásala como argumento: node scripts/chat-probe.mjs http://IP:PUERTO');
  process.exit(1);
}

const API = apiUrl();
// En Git Bash (mintty) la entrada no es una terminal real: se lee línea por línea.
const tty = Boolean(process.stdin.isTTY);
const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: tty });
const ask = q => new Promise(resolve => rl.question(q, resolve));
// Oculta lo que se teclea solo si la terminal lo permite; si no, avisa que se verá.
function askHidden(q) {
  if (!tty) return ask('Contraseña (en esta terminal sí se verá al escribirla): ');
  return new Promise(resolve => {
    const original = rl._writeToOutput;
    rl._writeToOutput = text => { if (text.startsWith(q)) original.call(rl, text); };
    rl.question(q, answer => { rl._writeToOutput = original; process.stdout.write('\n'); resolve(answer); });
  });
}

let token = '';
async function call(path, init = {}) {
  let response;
  try {
    response = await fetch(`${API}${path}`, { ...init, signal: AbortSignal.timeout(15000), headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...init.headers } });
  } catch (error) {
    throw new Error(error?.name === 'TimeoutError'
      ? `La API no respondió en 15 s (${API}${path}). ¿Está encendido el backend y es correcta la dirección?`
      : `No se pudo conectar con ${API} (${error?.cause?.code ?? error.message}). ¿Está encendido el backend?`);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${response.status} ${Array.isArray(data.message) ? data.message.join('. ') : data.message ?? 'Error'}`);
  return data;
}
const key = () => `p-${randomBytes(8).toString('hex')}`;
const say = text => { process.stdout.write(`\r${text}\n`); rl.prompt(true); };

console.log(`API: ${API}`);
process.stdout.write('Comprobando que la API responde… ');
await call('/auth/sign-in', { method: 'POST', body: '{}' }).catch(error => {
  // Un 400 por datos vacíos significa que la API sí contestó.
  if (!/^4\d\d /.test(error.message)) { console.error(`\n${error.message}`); process.exit(1); }
});
console.log('sí.');
console.log('Inicia sesión con la cuenta B (la que NO está en tu teléfono).');
const email = (await ask('Correo de la cuenta B: ')).trim();
const password = await askHidden('Contraseña (no se muestra): ');
console.log('Iniciando sesión…');
try {
  const session = await call('/auth/sign-in', { method: 'POST', body: JSON.stringify({ email, password }) });
  if (!session.access_token || session.profileStatus !== 'complete') throw new Error('La cuenta no tiene un perfil activo y completo.');
  token = session.access_token;
  console.log(`Sesión lista como ${session.user.username}.`);
} catch (error) {
  console.error(`No se pudo iniciar sesión: ${error.message}`); process.exit(1);
}

const wanted = (await ask('Nombre de usuario de la cuenta A (la de tu teléfono): ')).trim();
console.log('Buscando la cuenta y abriendo el chat…');
const found = await call(`/users?q=${encodeURIComponent(wanted)}&limit=20`).catch(error => { console.error(error.message); process.exit(1); });
const target = found.items.find(p => p.username.toLowerCase() === wanted.toLowerCase()) ?? (found.items.length === 1 ? found.items[0] : null);
if (!target) { console.error(`No encontré exactamente a «${wanted}». Coincidencias: ${found.items.map(p => p.username).join(', ') || 'ninguna'}`); process.exit(1); }
const conversation = await call('/conversations', { method: 'POST', body: JSON.stringify({ userId: target.id }) }).catch(error => { console.error(error.message); process.exit(1); });
const chatId = conversation.id;
let newestFromA = conversation.lastMessage && !conversation.lastMessage.mine ? conversation.lastMessage.id : 0;
console.log(`Chat ${chatId} con ${target.username}. Bloqueado por mí: ${conversation.blockedByMe ? 'sí' : 'no'}; puedo enviar: ${conversation.canSend ? 'sí' : 'no'}.`);

console.log('Conectando en vivo…');
const socket = io(`${API}/chat`, { auth: { token }, transports: ['websocket'], timeout: 10000 });
socket.on('connect_error', error => say(`✖ No se pudo conectar en vivo: ${error.message}. Los mensajes se siguen enviando por la API.`));
socket.on('ready', () => say('● Conectado: en tu teléfono, B debería verse «En línea».'));
socket.on('auth_error', payload => say(`✖ La conexión rechazó la sesión: ${payload?.message ?? ''}`));
socket.on('disconnect', () => say('○ Desconectado.'));
socket.on('message', ({ conversationId, message }) => {
  if (conversationId !== chatId || message.mine) return;
  newestFromA = Math.max(newestFromA, message.id);
  say(`← ${target.username}: ${message.body}   (escribe /leer para marcarlo como leído)`);
});
socket.on('read', ({ conversationId, lastReadMessageId }) => { if (conversationId === chatId) say(`✓ ${target.username} leyó hasta el mensaje ${lastReadMessageId}.`); });
socket.on('presence', ({ conversationId, online }) => { if (conversationId === chatId) say(`${online ? '●' : '○'} ${target.username} ${online ? 'está en línea' : 'ya no está en línea'}.`); });
socket.on('block', ({ conversationId }) => { if (conversationId === chatId) say('! Cambió un bloqueo en este chat.'); });

console.log(`
Escribe un texto y Enter para mandarlo a ${target.username}. Comandos:
  /seed N        manda N mensajes numerados (máx. 60) para probar varias páginas
  /leer          marca como leído el último mensaje que te mandó ${target.username}
  /bloquear      B bloquea a A          /desbloquear   B quita su bloqueo
  /salir         desconecta (A deja de verte «En línea») y termina
`);
rl.setPrompt('B> '); rl.prompt();

rl.on('line', async raw => {
  const line = raw.trim();
  try {
    if (!line) { /* nada */ }
    else if (line === '/salir') { socket.disconnect(); rl.close(); process.exit(0); }
    else if (line === '/leer') {
      if (!newestFromA) say('No hay mensajes de A por marcar.');
      else { await call(`/conversations/${chatId}/read`, { method: 'POST', body: JSON.stringify({ messageId: newestFromA }) }); say('Marcado como leído.'); }
    }
    else if (line === '/bloquear') { const s = await call(`/conversations/${chatId}/block`, { method: 'POST' }); say(`Bloqueaste a ${target.username}. Puedo enviar: ${s.canSend ? 'sí' : 'no'}.`); }
    else if (line === '/desbloquear') { const s = await call(`/conversations/${chatId}/block`, { method: 'DELETE' }); say(`Quitaste tu bloqueo. Puedo enviar: ${s.canSend ? 'sí' : 'no'}.`); }
    else if (line.startsWith('/seed')) {
      const n = Math.min(60, Math.max(1, Number(line.split(/\s+/)[1]) || 35));
      for (let i = 1; i <= n; i++) await call(`/conversations/${chatId}/messages`, { method: 'POST', body: JSON.stringify({ body: `Mensaje de prueba ${i} de ${n}`, clientKey: key() }) });
      say(`Mandé ${n} mensajes.`);
    }
    else if (line.startsWith('/')) say('Comando desconocido. Usa /seed, /leer, /bloquear, /desbloquear o /salir.');
    else { await call(`/conversations/${chatId}/messages`, { method: 'POST', body: JSON.stringify({ body: line, clientKey: key() }) }); say('→ enviado'); }
  } catch (error) { say(`✖ ${error.message}`); }
  rl.prompt();
});
