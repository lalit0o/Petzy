// Reglas puras de Chat, separadas para probarlas sin base de datos.

export const MESSAGE_MAX = 250; // D-79
export const REPORT_NOTE_MAX = 500; // D-146
export const CLIENT_KEY = /^[A-Za-z0-9_-]{8,64}$/;

// Un solo chat por pareja: el par se guarda ordenado por bytes, igual que la
// restricción CHECK ("userAId" COLLATE "C" < "userBId" COLLATE "C") de la base.
export function orderedPair(a: string, b: string): { userAId: string; userBId: string } {
  if (a === b) throw new Error('Una conversación necesita dos cuentas distintas.');
  return a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a };
}

export function otherParticipant(conversation: { userAId: string; userBId: string }, me: string): string {
  return conversation.userAId === me ? conversation.userBId : conversation.userAId;
}

// Primer mensaje que la persona todavía ve: «Borrar chat para mí» oculta todo
// lo anterior a su corte para siempre (D-82).
export function visibleAfter(clearedThroughMessageId: number | null): number {
  return clearedThroughMessageId ?? 0;
}

// Los mensajes sin leer son los de la otra persona posteriores a la última
// lectura y al corte de «Borrar chat para mí».
export function unreadFloor(lastReadMessageId: number | null, clearedThroughMessageId: number | null): number {
  return Math.max(lastReadMessageId ?? 0, clearedThroughMessageId ?? 0);
}

// D-76: cualquier bloqueo detiene los envíos en ambos sentidos. Quien bloqueó
// ve «Desbloquear»; la otra persona solo sabe que no puede enviar (D-81).
export function blockState(blocks: { blockerId: string }[], me: string) {
  return { blockedByMe: blocks.some(b => b.blockerId === me), canSend: blocks.length === 0 };
}
