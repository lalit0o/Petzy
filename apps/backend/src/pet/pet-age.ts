import { BadRequestException } from '@nestjs/common';

export type PetBirth = { year: number; month: number; day?: number | null };

function daysInMonth(year: number, month: number) {
  if ([4, 6, 9, 11].includes(month)) return 30;
  if (month !== 2) return 31;
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28;
}

export function validateBirth(birth: PetBirth, now = new Date()) {
  const today = { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1, day: now.getUTCDate() };
  const { year, month } = birth;
  const day = birth.day ?? null;
  if (!Number.isInteger(year) || year < 1 || year > today.year || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new BadRequestException('Indica un año y mes de nacimiento válidos.');
  }
  if (day !== null && (!Number.isInteger(day) || day < 1 || day > daysInMonth(year, month))) {
    throw new BadRequestException('El día de nacimiento no existe en ese mes.');
  }
  if (year === today.year && (month > today.month || (month === today.month && day !== null && day > today.day))) {
    throw new BadRequestException('El nacimiento no puede ser futuro.');
  }
  return { birthYear: year, birthMonth: month, birthDay: day };
}

export function petAge(birth: { birthYear: number; birthMonth: number; birthDay: number | null }, now = new Date()) {
  const month = now.getUTCMonth() + 1;
  const day = now.getUTCDate();
  const passed = month > birth.birthMonth || (month === birth.birthMonth && (birth.birthDay === null || day >= birth.birthDay));
  return {
    age: now.getUTCFullYear() - birth.birthYear - (passed ? 0 : 1),
    isAgeApproximate: birth.birthDay === null,
  };
}
