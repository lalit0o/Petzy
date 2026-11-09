import { blockState, CLIENT_KEY, orderedPair, otherParticipant, unreadFloor, visibleAfter } from './chat-rules';

describe('reglas de Chat', () => {
  it('guarda la pareja siempre en el mismo orden, sin importar quién abre (CH-01)', () => {
    expect(orderedPair('luis', 'ana')).toEqual({ userAId: 'ana', userBId: 'luis' });
    expect(orderedPair('ana', 'luis')).toEqual({ userAId: 'ana', userBId: 'luis' });
  });

  it('ordena por bytes, igual que la restricción COLLATE "C" de la base', () => {
    // En una intercalación con reglas de idioma, «B» y «a» podrían invertirse.
    expect(orderedPair('a-1', 'B-2')).toEqual({ userAId: 'B-2', userBId: 'a-1' });
  });

  it('no permite un chat con la misma cuenta (CH-05)', () => {
    expect(() => orderedPair('ana', 'ana')).toThrow();
  });

  it('identifica a la otra persona', () => {
    expect(otherParticipant({ userAId: 'ana', userBId: 'luis' }, 'ana')).toBe('luis');
    expect(otherParticipant({ userAId: 'ana', userBId: 'luis' }, 'luis')).toBe('ana');
  });

  it('oculta para siempre lo anterior a «Borrar chat para mí» (D-82)', () => {
    expect(visibleAfter(null)).toBe(0);
    expect(visibleAfter(40)).toBe(40);
  });

  it('cuenta como sin leer solo lo posterior a la lectura y al borrado propio', () => {
    expect(unreadFloor(null, null)).toBe(0);
    expect(unreadFloor(10, null)).toBe(10);
    expect(unreadFloor(10, 25)).toBe(25);
    expect(unreadFloor(30, 25)).toBe(30);
  });

  it('cualquier bloqueo impide enviar en ambos sentidos; solo quien bloqueó lo sabe (D-76, D-81)', () => {
    expect(blockState([], 'ana')).toEqual({ blockedByMe: false, canSend: true });
    expect(blockState([{ blockerId: 'ana' }], 'ana')).toEqual({ blockedByMe: true, canSend: false });
    expect(blockState([{ blockerId: 'luis' }], 'ana')).toEqual({ blockedByMe: false, canSend: false });
    expect(blockState([{ blockerId: 'ana' }, { blockerId: 'luis' }], 'ana')).toEqual({ blockedByMe: true, canSend: false });
  });

  it('acepta solo claves de reintento seguras', () => {
    expect(CLIENT_KEY.test('m-1a2b3c4d')).toBe(true);
    expect(CLIENT_KEY.test('corta')).toBe(false);
    expect(CLIENT_KEY.test('con espacio 123')).toBe(false);
  });
});
