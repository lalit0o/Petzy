import { BadRequestException } from '@nestjs/common';
import { petAge, validateBirth } from './pet-age';

describe('petAge and validateBirth use UTC without storing age', () => {
  const now = new Date('2026-10-20T00:30:00Z');

  it('changes exact age on the birthday, not the day before', () => {
    const birth = { birthYear: 2020, birthMonth: 10, birthDay: 20 };
    expect(petAge(birth, new Date('2026-10-19T23:59:59Z'))).toEqual({ age: 5, isAgeApproximate: false });
    expect(petAge(birth, now)).toEqual({ age: 6, isAgeApproximate: false });
  });

  it('uses the month boundary for approximate births without inventing a day', () => {
    const birth = { birthYear: 2023, birthMonth: 10, birthDay: null };
    expect(petAge(birth, new Date('2026-09-30T23:59:59Z'))).toEqual({ age: 2, isAgeApproximate: true });
    expect(petAge(birth, new Date('2026-10-01T00:00:00Z'))).toEqual({ age: 3, isAgeApproximate: true });
  });

  it('rejects births more than 40 years ago (D-158)', () => {
    expect(validateBirth({ year: 1986, month: 1 }, now).birthYear).toBe(1986);
    expect(() => validateBirth({ year: 1985, month: 12 }, now)).toThrow('El nacimiento no puede ser de hace más de 40 años.');
    expect(() => validateBirth({ year: 1800, month: 1 }, now)).toThrow(BadRequestException);
  });

  it('accepts a leap day only in leap years', () => {
    expect(validateBirth({ year: 2024, month: 2, day: 29 }, now)).toEqual({ birthYear: 2024, birthMonth: 2, birthDay: 29 });
    expect(() => validateBirth({ year: 2023, month: 2, day: 29 }, now)).toThrow(BadRequestException);
    expect(() => validateBirth({ year: 1900, month: 2, day: 29 }, now)).toThrow(BadRequestException);
    expect(validateBirth({ year: 2000, month: 2, day: 29 }, now).birthDay).toBe(29);
  });

  it.each([
    { year: 2026, month: 11 }, { year: 2026, month: 10, day: 21 },
    { year: 2027, month: 1 }, { year: 2020, month: 13 },
    { year: 2020, month: 0 }, { year: 2020, month: 4, day: 31 },
    { year: 2020, month: 10, day: 0 },
  ])('rejects invalid or future birth %#', birth => {
    expect(() => validateBirth(birth, now)).toThrow(BadRequestException);
  });

  it('handles year changes and precise UTC day boundaries', () => {
    const birth = validateBirth({ year: 2025, month: 12, day: 31 }, new Date('2026-01-01T00:00:00Z'));
    expect(petAge(birth, new Date('2026-12-30T23:59:59Z')).age).toBe(0);
    expect(petAge(birth, new Date('2026-12-31T00:00:00Z')).age).toBe(1);
  });
});
