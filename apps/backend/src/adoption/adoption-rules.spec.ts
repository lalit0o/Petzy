import { BadRequestException } from '@nestjs/common';
import { AdoptionStatus } from '../generated/prisma/enums';
import { cursorWhere, encodeCursor, photoPlan } from './adoption-rules';

describe('reglas de Adopción', () => {
  it('el cursor recorre primero «Busca hogar» y después «Encontró hogar»', () => {
    expect(encodeCursor(AdoptionStatus.SEEKING_HOME, 12)).toBe('S-12');
    expect(cursorWhere('S-12')).toEqual({ OR: [{ status: AdoptionStatus.SEEKING_HOME, id: { lt: 12 } }, { status: AdoptionStatus.FOUND_HOME }] });
    expect(cursorWhere('F-3')).toEqual({ status: AdoptionStatus.FOUND_HOME, id: { lt: 3 } });
    expect(cursorWhere(undefined)).toEqual({});
    expect(() => cursorWhere('X-1')).toThrow(BadRequestException);
  });

  it('al editar fotos siempre quedan de una a tres y solo del mismo anuncio', () => {
    expect(photoPlan([1, 2, 3], [3, 1], 0)).toEqual({ removed: [2] });
    expect(photoPlan([1], [], 2)).toEqual({ removed: [1] });
    expect(() => photoPlan([1, 2], [], 0)).toThrow('al menos una foto');
    expect(() => photoPlan([1, 2], [1, 2], 2)).toThrow('hasta tres fotos');
    expect(() => photoPlan([1, 2], [9], 0)).toThrow('ya no es parte');
    expect(() => photoPlan([1, 2], [1, 1], 0)).toThrow('repetida');
  });
});
