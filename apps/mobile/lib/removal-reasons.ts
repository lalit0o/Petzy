// Motivos de retirada de contenido comunitario (D-140). Misma lista, mismos
// límites y mismos textos que el servidor (`RemoveContentDto`).
export type RemovalReason = 'SPAM' | 'OFFENSIVE' | 'HARASSMENT' | 'OFF_TOPIC' | 'FALSE_INFO' | 'OTHER';
export type RemovalPayload = { reason: RemovalReason; note?: string };

export const REMOVAL_NOTE_MAX = 200;

export const REMOVAL_REASONS: { value: RemovalReason; label: string; hint: string }[] = [
  { value: 'SPAM', label: 'Spam o publicidad', hint: 'Promociona algo o repite enlaces.' },
  { value: 'OFFENSIVE', label: 'Lenguaje ofensivo', hint: 'Insultos o palabras que faltan al respeto.' },
  { value: 'HARASSMENT', label: 'Acoso', hint: 'Hostiga o molesta a otra persona.' },
  { value: 'OFF_TOPIC', label: 'Fuera del tema', hint: 'No corresponde a lo que se comparte aquí.' },
  { value: 'FALSE_INFO', label: 'Información falsa', hint: 'Engaña o puede perjudicar a una mascota.' },
  { value: 'OTHER', label: 'Otro', hint: 'Explícalo en la nota.' },
];

export function removalReasonLabel(reason: RemovalReason | null | undefined) {
  return REMOVAL_REASONS.find(item => item.value === reason)?.label ?? null;
}

// Explicación corta del motivo, para que la persona entienda qué significa sin interpretarlo.
export function removalReasonHint(reason: RemovalReason | null | undefined) {
  return REMOVAL_REASONS.find(item => item.value === reason)?.hint ?? null;
}

// Valida con las mismas reglas que el servidor. Devuelve un mensaje para
// mostrar junto a la acción, o una cadena vacía si todo está bien.
export function validateRemoval(reason: RemovalReason | null, note: string): string {
  if (!reason) return 'Elige un motivo de la lista.';
  const trimmed = note.trim();
  if (reason === 'OTHER' && !trimmed) return 'Cuéntanos el motivo en la nota.';
  if (trimmed.length > REMOVAL_NOTE_MAX) return `La nota admite hasta ${REMOVAL_NOTE_MAX} caracteres.`;
  return '';
}

export function removalPayload(reason: RemovalReason, note: string): RemovalPayload {
  const trimmed = note.trim();
  return trimmed ? { reason, note: trimmed } : { reason };
}
